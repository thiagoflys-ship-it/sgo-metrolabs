/****************************************************
 * PGT E POP — ENGENHARIA CLÍNICA — módulo nativo do Portal SGO+ CNPJ/DB
 * (2026-08-13, v3)
 *
 * Backend principal: roteador único (PgtPop_apiDispatch, mesmo padrão
 * de PlanCME_apiDispatch/CronExec_apiDispatch) + bootstrap + persistência
 * própria (planilha separada, não a base central do Portal).
 *
 * v2 acrescentou: controle de revisão (cada geração pro mesmo hospital+
 * código de documento vira uma nova revisão, nunca perde o histórico),
 * campo de aprovador do hospital, e imagens com interpretação técnica
 * por IA (multimodal).
 *
 * v3 acrescenta: consulta de documentos JÁ gerados por CNPJ (pra não
 * precisar gerar tudo de novo toda vez — planilha agora guarda
 * CNPJ+HOSPITAL_JSON completo em ambas as abas, não só o nome), e nome
 * editável de "Elaborado por".
 *
 * v6 (2026-08-13) corrige bug real: cargo/registro do "Elaborado por"
 * eram sempre fixos (config), mesmo com o nome editável — um documento
 * assinado por outra pessoa saía com o registro profissional (REA-GO)
 * de alguém diferente. Agora cargo/registro também são editáveis e
 * seguem o nome, gravados como colunas próprias.
 ****************************************************/

function PgtPop_apiDispatch(req) {
  req = req || {};
  var sessaoPgtPop = exigirSessao(String(req.sessionId || '')); // SEGURANCA: exige sessao valida do portal (SGO_Auth)
  if (typeof SGO_bloquearRH_ === 'function') SGO_bloquearRH_(sessaoPgtPop, 'o módulo PGT e POP'); // perfil RH: sem documentos técnicos (SGO_Auth.js)
  // (2026-10-16) Módulo interno da equipe: o perfil CLIENTE só tinha o menu
  // escondido no navegador, mas chamando a API listava documentos de qualquer
  // CNPJ (de outros clientes) e podia gerar documentos.
  if (String((sessaoPgtPop && sessaoPgtPop.perfil) || '').trim().toUpperCase() === 'CLIENTE') {
    throw new Error('O módulo PGT e POP é de uso da equipe Metrolabs e não está disponível para o perfil Cliente. Para receber um documento, solicite à Metrolabs.');
  }
  var fn = String(req.fn || '').trim();
  var payload = req.payload || {};

  var allow = {
    apiConsultarCnpj: PgtPop_apiConsultarCnpj,
    apiGerarDocumento: PgtPop_apiGerarDocumento,
    apiListarDocumentos: PgtPop_apiListarDocumentos,
    apiObterDocumentoPorId: PgtPop_apiObterDocumentoPorId,
    apiMontarDocumentoFinal: PgtPop_apiMontarDocumentoFinal,
    apiSalvarDocumento: PgtPop_apiSalvarDocumento, // HTML A4 + PDF na pasta do CNPJ; não duplica o que a geração já gravou
    apiListarArquivosPdf: PgtPop_apiListarArquivosPdf
  };

  if (!fn) throw new Error('Função não informada.');
  if (!allow[fn] || typeof allow[fn] !== 'function') throw new Error('Função não permitida ou não encontrada: ' + fn);

  // apiGerarDocumento é a única função deste módulo que precisa saber
  // quem está logado (pra vincular a Tarefa criada no Auvo ao técnico real).
  if (fn === 'apiGerarDocumento') return PgtPop_apiGerarDocumento(payload, req.sessionId);

  return allow[fn](payload);
}

function PgtPop_getAppBootstrap() {
  var props = PropertiesService.getScriptProperties();
  return {
    appNome: props.getProperty("PGTPOP_APP_NOME") || PGTPOP_CFG.APP.NOME,
    versao: props.getProperty("PGTPOP_APP_VERSAO") || PGTPOP_CFG.APP.VERSAO,
    whatsappMsg: props.getProperty("PGTPOP_WHATSAPP_MSG") || PGTPOP_CFG.WHATSAPP.MENSAGEM_PADRAO,
    empresaNome: props.getProperty("PGTPOP_EMPRESA_NOME") || PGTPOP_CFG.EMPRESA.NOME,
    catalogoPops: PGTPOP_CFG.CATALOGO_POPS,
    baseNormativa: PGTPOP_CFG.BASE_NORMATIVA,
    elaboradoPorNomePadrao: PGTPOP_CFG.ENGENHEIRO_ELABORADO.nome,
    elaboradoPorCargoPadrao: PGTPOP_CFG.ENGENHEIRO_ELABORADO.cargo,
    elaboradoPorRegistroPadrao: PGTPOP_CFG.ENGENHEIRO_ELABORADO.registro,
    geracaoNovaDesde: typeof PGTPOP_GERACAO_NOVA_DESDE === 'string' ? PGTPOP_GERACAO_NOVA_DESDE : '',
    fichas: typeof PgtPop_fichasTela_ === 'function' ? PgtPop_fichasTela_() : null
  };
}

/* ============================================================
 * DADOS DO ESTABELECIMENTO PELAS FICHAS TÉCNICAS (14/11/2026)
 * As perguntas vêm de SGO_PgtPop_Fichas.js (gerado dos JSON do especialista). As respostas viajam em
 * payload.hospital.respostas ({ id: valor }), ficam no registro (HOSPITAL_JSON) e no painel de revisões (payload), e
 * voltam ao "Abrir para corrigir" e ao "Usar como base". Dado obrigatório faltando bloqueia o documento antes da IA, com a
 * mensagem do quê, por quê e o que fazer; dado opcional faltando vira pendência nos pontos para conferir.
 * ============================================================ */
var PGTPOP_RESPOSTA_MAX = 2000;

/** O que a tela precisa das fichas: perguntas, onde cada uma aparece, perguntas por documento, condições e nomes. */
function PgtPop_fichasTela_() {
  if (typeof PGTPOP_FICHAS === 'undefined' || !PGTPOP_FICHAS || !PGTPOP_FICHAS.docs) return null;
  var F = PGTPOP_FICHAS;
  var docs = {};
  Object.keys(F.docs).forEach(function (c) {
    var d = F.docs[c];
    docs[c] = { nome: d.nome, nomeAnterior: d.nomeAnterior || '', explicacao: d.explicacao || '', perguntas: d.perguntas, condicao: d.condicao || null };
  });
  return {
    versao: F.versao,
    subgrupos: F.subgrupos,
    perguntas: F.perguntas.map(function (p) {
      return { id: p.id, grupo: p.grupo, sub: p.sub || '', rotulo: p.rotulo, tipo: p.tipo, opcoes: p.opcoes || null, porQue: p.porQue || '', dica: p.dica || '',
        exemplo: p.exemplo || '', referencia: p.referencia || '', onde: p.onde, ondeTexto: p.ondeTexto, exigeSe: p.exigeSe || null };
    }),
    comuns: F.comuns,
    docs: docs
  };
}

/** Só as perguntas conhecidas, como texto aparado (até PGTPOP_RESPOSTA_MAX caracteres). */
function PgtPop_respostasLimpas_(respostas) {
  var out = {};
  if (typeof PGTPOP_FICHAS === 'undefined' || !PGTPOP_FICHAS || !respostas || typeof respostas !== 'object') return out;
  PGTPOP_FICHAS.perguntas.forEach(function (p) {
    var v = respostas[p.id];
    if (v == null) return;
    v = String(v).trim().slice(0, PGTPOP_RESPOSTA_MAX);
    if (!v) return;
    if (p.tipo === 'simnao' && v !== 'sim' && v !== 'nao') return;
    if (p.tipo === 'opcoes' && !(p.opcoes || []).some(function (o) { return o[0] === v; })) return;
    out[p.id] = v;
  });
  return out;
}

/**
 * Confere os dados do estabelecimento para um documento. Devolve { faltam: [pergunta], pendencias: [pergunta], naoSeAplica: '' }.
 * codigo: 'PGTS', 'POP001'... ou o do avulso (só as perguntas comuns valem para ele).
 */
function PgtPop_conferirDados_(codigo, hospital) {
  var r = { faltam: [], pendencias: [], naoSeAplica: '' };
  if (typeof PGTPOP_FICHAS === 'undefined' || !PGTPOP_FICHAS) return r;
  var ficha = PGTPOP_FICHAS.docs[codigo] || null;
  var cond = ficha && ficha.condicao;
  if (cond && PgtPopIA_resposta_(hospital, cond.pergunta) === 'nao') {
    r.naoSeAplica = cond.recurso;
    return r;
  }
  PgtPopIA_perguntasDoDoc_(codigo).forEach(function (x) {
    var p = PgtPopIA_pergunta_(x.id);
    if (!p || !PgtPopIA_perguntaAtiva_(p, hospital) || PgtPopIA_resposta_(hospital, x.id)) return;
    // exigeSe ativo: a pergunta passa a ser obrigatória (ex.: empresa contratada quando a engenharia clínica é contratada)
    if (x.obrigatorio || p.exigeSe) r.faltam.push(p); else r.pendencias.push(p);
  });
  return r;
}

/** Mensagem do documento bloqueado (o quê, por quê, o que fazer). '' quando pode gerar. */
function PgtPop_msgDados_(tipo, codigo, nome, conf) {
  var rot = tipo === 'PGT' ? 'O PGT' : (/^AV-/.test(codigo) || !codigo ? 'O POP avulso' : 'O ' + codigo);
  var titulo = nome ? ' (' + nome + ')' : '';
  if (conf.naoSeAplica) {
    var ficha = PGTPOP_FICHAS.docs[codigo] || {};
    return rot + titulo + ' não foi gerado: o estabelecimento informou que não tem ' + conf.naoSeAplica + ' (etapa 1, caixa 1.6). Por quê: este POP só existe para quem tem esse recurso.' +
      (ficha.condicao && ficha.condicao.senao ? ' ' + ficha.condicao.senao : '') + ' O que fazer: se a resposta estiver errada, corrija na etapa 1 e gere de novo; se estiver certa, desmarque este POP. Nada foi gravado.';
  }
  if (!conf.faltam.length) return '';
  var lista = conf.faltam.map(function (p) { return p.rotulo.charAt(0).toLowerCase() + p.rotulo.slice(1) + ' (' + p.ondeTexto + ')'; });
  return rot + titulo + ' não foi gerado: faltam dados obrigatórios do estabelecimento. Faltam: ' + lista.join('; ') + '. Por quê: o texto descreve a realidade deste ' +
    'estabelecimento e não pode presumir esses dados. O que fazer: preencha esses campos e toque de novo em "Gerar tudo". Nada foi gravado.';
}

/** Pontos para conferir das pendências (dado opcional não informado). */
function PgtPop_pontosPendencias_(conf) {
  return (conf.pendencias || []).map(function (p) {
    return { tipo: 'PENDENCIA', texto: 'Pendência: o estabelecimento não informou "' + p.rotulo + '" (' + p.ondeTexto + '). O texto deve trazer "a definir pelo estabelecimento" nesse ponto; quando o dado chegar, preencha e gere a revisão.' };
  });
}

/* ============================================================
 * DOCUMENTOS SUSPENSOS (14/11/2026, decisão do dono)
 * "Isso tudo iremos refazer, não vou querer que ninguém use esses documentos existentes." Todo PGT/POP emitido antes
 * de PGTPOP_GERACAO_NOVA_DESDE fica suspenso: aparece marcado na busca, não é enviado pelo sistema (SGO_EnviarDoc.js)
 * e não entra como documento existente no PGT novo (SGO_PgtPop_IA.js). Nenhum dado é alterado.
 * Vazio = a geração revisada pelos especialistas ainda não foi publicada: tudo o que existe (inclusive o que for gerado
 * até lá) fica suspenso. Ao publicar a geração revisada, gravar aqui o instante da publicação ("yyyy-MM-ddTHH:mm:ss").
 * ============================================================ */
var PGTPOP_GERACAO_NOVA_DESDE = '2026-11-14T10:48:00'; // geração revisada pelas fichas técnicas publicada em 14/11/2026
var PGTPOP_TEXTO_SUSPENSO = 'Os PGTs e POPs emitidos antes da revisão técnica completa do módulo estão suspensos e serão refeitos ' +
  '(decisão da Diretoria em 14/11/2026, depois da auditoria que encontrou erros no texto desses documentos).';

/** Data do registro (Date, "dd/MM/yyyy HH:mm[:ss]" ou "yyyy-MM-ddTHH:mm:ss") como "yyyyMMddHHmmss"; '' se não reconhecer. */
function PgtPop_dataOrdem_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    try { return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyyMMddHHmmss'); } catch (e) { return ''; }
  }
  var s = String(v || '').trim(), m;
  if ((m = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(s))) return m[3] + m[2] + m[1] + (m[4] || '00') + (m[5] || '00') + (m[6] || '00');
  if ((m = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(s))) return m[1] + m[2] + m[3] + (m[4] || '00') + (m[5] || '00') + (m[6] || '00');
  return '';
}

/** true quando o documento foi emitido antes da geração revisada (ou a data não é reconhecida). */
function PgtPop_documentoSuspenso_(data) {
  var corte = String(PGTPOP_GERACAO_NOVA_DESDE || '').replace(/\D/g, '').slice(0, 14);
  if (!corte) return true;
  var o = PgtPop_dataOrdem_(data);
  return !o || o < corte;
}

var PGTPOP_CODIGO_PGT = 'PGTS';

// ------------------------------------------------------------
// Índices de coluna (0-based) — MOV_PGT e MOV_POPS
// (mantidos aqui como constantes pra não espalhar números mágicos
// pelo arquivo; se mudar o layout no Setup.js, atualizar aqui também)
// ------------------------------------------------------------
var PGTPOP_COL_PGT = Object.freeze({
  ID: 0, DATA: 1, HOSPITAL: 2, CNPJ: 3, CODIGO: 4, VERSAO: 5,
  ROTEIRO: 6, ELABORADO_POR: 7, TEXTO_JSON: 8, HISTORICO_JSON: 9,
  HOSPITAL_JSON: 10, OBS: 11, ELABORADO_POR_CARGO: 12, ELABORADO_POR_REGISTRO: 13
});
var PGTPOP_COL_POP = Object.freeze({
  ID: 0, DATA: 1, HOSPITAL: 2, CNPJ: 3, PGT_ID: 4, CODIGO: 5, NOME_POP: 6,
  VERSAO: 7, ROTEIRO: 8, ELABORADO_POR: 9, TEXTO_JSON: 10, HISTORICO_JSON: 11,
  HOSPITAL_JSON: 12, ELABORADO_POR_CARGO: 13, ELABORADO_POR_REGISTRO: 14
});

/**
 * Gera UM documento (PGT ou POP). POP: uma chamada de IA. PGT (v15,
 * 2026-08-14): 6 chamadas em blocos, ver PgtPop_gerarTextoPGT_. Já
 * persiste o resultado na planilha assim que termina (como uma NOVA
 * REVISÃO se já existir um documento com o mesmo código pra esse
 * hospital — nunca perde o histórico anterior).
 *
 * payload:
 *   tipo: 'PGT' | 'POP'
 *   hospital: { razaoSocial, cnpj, logradouro, bairro, cidade, uf, porte,
 *               leitos, aprovadorNome, aprovadorCargo }
 *   roteiro: string (opcional)
 *   pop: { codigo, nome } — só quando tipo === 'POP' (codigo vazio = avulso)
 *   pgtId: string (opcional) — id do PGT já gerado deste hospital, se houver
 *   imagens: [{ base64, mimeType, legenda }] (opcional, até 4+)
 *   popsRelacionados: [{ codigo, nome }] (opcional) — só usado quando
 *     tipo === 'PGT'; POPs selecionados pra este hospital nesta
 *     geração, injetados no bloco de fechamento do PGT (seção
 *     "Documentos e Procedimentos Relacionados").
 *   descricaoRevisao: string (opcional) — só relevante quando já existe
 *     um documento anterior com o mesmo código; descreve o que mudou.
 *   elaboradoPorNome: string (opcional) — nome de quem elaborou este
 *     documento específico; se vazio, usa o padrão de PGTPOP_CFG.
 */
function PgtPop_apiGerarDocumento(payload, sessionId) {
  payload = payload || {};
  // 21/10/2026: correção pela lista de documentos gerados (SGO_DocRevisao.js): o motivo obrigatório vira a descrição
  // da revisão no controle de revisões do próprio documento (o mesmo código no mesmo hospital já sai como revisão seguinte).
  var docRev;
  try { docRev = SGO_DocRev_montar_('PGT_POP', payload, sessionId, '', { permitirNumeroRepetido: true }); } catch (eRev) { return { ok: false, mensagem: String(eRev && eRev.message ? eRev.message : eRev).replace(/[.\s]+$/, '') + '.' }; }
  if (docRev.ehRevisao) payload.descricaoRevisao = docRev.motivo;
  var tipo = String(payload.tipo || '').toUpperCase();
  if (tipo !== 'PGT' && tipo !== 'POP') {
    return { ok: false, mensagem: "Tipo de documento inválido: " + tipo };
  }
  // 14/11/2026 (fichas técnicas): as respostas do estabelecimento são limpas aqui e gravadas junto com o hospital.
  var hospital = Object.assign({}, payload.hospital || {});
  hospital.respostas = PgtPop_respostasLimpas_(hospital.respostas);
  if (!String(hospital.razaoSocial || '').trim()) {
    return { ok: false, mensagem: "Informe os dados do hospital antes de gerar." };
  }
  if (tipo === 'POP' && !(payload.pop && String(payload.pop.nome || '').trim())) {
    return { ok: false, mensagem: "POP sem nome informado." };
  }
  // 14/11/2026 (auditoria M7): sem cargo padrão; cargo vazio é recusado (o cargo acompanha o nome na assinatura).
  var erroCargo = PgtPop_conferirCargos_(payload);
  if (erroCargo) return { ok: false, mensagem: erroCargo };
  // 14/11/2026 (auditoria M4/M5): na correção o CNPJ e o código são os do documento de origem; o avulso corrigido
  // continua o código dele (AV-...) e sai como revisão seguinte.
  var ident = PgtPop_identidadeCorrecao_(docRev, tipo, payload);
  if (ident.erro) return { ok: false, mensagem: ident.erro };

  var imagens = Array.isArray(payload.imagens) ? payload.imagens.filter(function (im) { return im && im.base64; }) : [];
  var elaboradoPorNome = String(payload.elaboradoPorNome || '').trim() || PGTPOP_CFG.ENGENHEIRO_ELABORADO.nome;
  // Cargo/registro seguem o nome (v6, 2026-08-13) — nunca mais herdam
  // um registro profissional fixo de outra pessoa quando o nome muda.
  var elaboradoPorCargo = String(payload.elaboradoPorCargo || '').trim() || PGTPOP_CFG.ENGENHEIRO_ELABORADO.cargo;
  var elaboradoPorRegistro = String(payload.elaboradoPorRegistro || '').trim() || PGTPOP_CFG.ENGENHEIRO_ELABORADO.registro;

  // 14/11/2026 (auditoria A1): o título do POP é o nome do catálogo (no avulso, o nome digitado); a IA não define o título.
  var popFinal = tipo === 'POP' ? PgtPop_popDoCatalogo_(payload.pop) : null;
  // 14/11/2026 (fichas técnicas): POP do recurso que o estabelecimento não tem e dado obrigatório faltando param aqui,
  // antes da IA e antes de reservar código de avulso. Nada é gravado.
  var confDados = PgtPop_conferirDados_(tipo === 'PGT' ? PGTPOP_CODIGO_PGT : (ident.codigo || popFinal.codigo || ''), hospital);
  var erroDados = PgtPop_msgDados_(tipo, tipo === 'PGT' ? PGTPOP_CODIGO_PGT : (ident.codigo || popFinal.codigo || ''), tipo === 'PGT' ? '' : popFinal.nome, confDados);
  if (erroDados) return { ok: false, mensagem: erroDados, faltamDados: confDados.faltam.map(function (p) { return p.id; }), naoSeAplica: !!confDados.naoSeAplica };
  var popsRelacionados = Array.isArray(payload.popsRelacionados) ? payload.popsRelacionados.filter(function (p) { return p && (p.codigo || p.nome); }).map(function (p) { return { codigo: String(p.codigo || ''), nome: String(p.nome || '') }; }) : [];
  var codigoDocumento = tipo === 'PGT' ? PGTPOP_CODIGO_PGT : (ident.codigo || popFinal.codigo || PgtPop_novoCodigoAvulso_());

  // 14/11/2026 (auditoria A3/M3): documento que já existe para o CNPJ sai como revisão e precisa do motivo da rodada.
  // Conferido antes da IA (para não gastar minutos de redação) e de novo na hora de gravar, sob trava.
  var motivoRevisao = String(payload.descricaoRevisao || '').trim();
  var previa = PgtPop_buscarRegistroMaisRecente_(tipo, hospital, codigoDocumento);
  if (previa && motivoRevisao.length < PGTPOP_MOTIVO_MIN) return { ok: false, mensagem: PgtPop_msgSemMotivo_(tipo, codigoDocumento, previa.versaoAtual, false) };

  var gerado;
  var avisoSemIA = '';
  try {
    // PGT (v15, 2026-08-14) gera em blocos — usuário pediu documento
    // muito mais robusto/longo; POP continua 1 chamada só, sem mudança.
    if (tipo === 'PGT') {
      gerado = PgtPop_gerarTextoPGT_(hospital, payload.roteiro || '', imagens, popsRelacionados, function (i, total, nomeBloco) {
        Logger.log('PGT bloco ' + i + '/' + total + ': ' + nomeBloco);
      });
    } else {
      gerado = PgtPop_gerarTextoIA_(tipo, hospital, payload.roteiro || '', popFinal, imagens, { popsRelacionados: popsRelacionados });
    }
  } catch (e) {
    // (2026-10-17) Sem a IA: o POP com roteiro escrito pelo técnico sai com o texto padrão
    // montado a partir do próprio roteiro (aviso na tela). O PGT e o POP sem roteiro dependem
    // da redação normativa da IA: nada é gravado e a revisão não muda.
    var motivoIA = String(e && e.message ? e.message : e).replace(/^A interpretação por IA não está disponível: /, '').replace(/[.\s]+$/, '');
    if (tipo === 'POP' && String(payload.roteiro || '').trim()) {
      // 14/11/2026 (auditoria M6): o texto padrão leva as imagens, com a legenda e sem a interpretação técnica.
      gerado = PgtPop_textoPadraoPop_(hospital, popFinal, payload.roteiro, imagens);
      avisoSemIA = 'O POP saiu com o texto padrão montado a partir do roteiro informado, sem a redação da IA (' + motivoIA + ').' +
        (imagens.length ? ' As imagens entraram com a legenda, sem a interpretação técnica.' : '') + ' Revise o documento antes de enviar ao cliente.';
    } else {
      return { ok: false, mensagem: 'O ' + (tipo === 'PGT' ? 'PGT' : 'POP') + ' não foi gerado e nada foi gravado (a revisão continua a mesma): ' + motivoIA + '. ' +
        (tipo === 'POP' ? 'Para gerar sem a IA, escreva o roteiro do POP na etapa 3 e gere de novo.' : 'O PGT é redigido pela IA a partir da ficha técnica do PGTS e dos dados do estabelecimento; gere de novo quando a IA estiver disponível.') };
    }
  }

  // 14/11/2026 (auditoria C2/M2/A2/M1): limpeza determinística depois da IA (ecos do pedido, bastidor da geração,
  // seções de controle escritas pela IA, campos "[Inserir ...]") e os pontos para conferir (normas fora da base, marcas).
  // 14/11/2026 (fichas técnicas): a conferência usa a ficha do documento e as respostas do estabelecimento (item mínimo,
  // normas da lista, números e setores não informados); depois entram as seções do sistema e as pendências.
  var revisado = typeof PgtPopIA_revisarTexto_ === 'function'
    ? PgtPopIA_revisarTexto_(gerado.textoGerado, { tipo: tipo, codigo: codigoDocumento, hospital: hospital, roteiro: payload.roteiro || '' })
    : { texto: gerado.textoGerado, conferir: [] };
  if (typeof PgtPopIA_comSecoesDoSistema_ === 'function') revisado.texto = PgtPopIA_comSecoesDoSistema_(tipo, codigoDocumento, revisado.texto, hospital, popsRelacionados);
  revisado.conferir = (revisado.conferir || []).concat(PgtPop_pontosPendencias_(confDados));
  var titulo = tipo === 'PGT' ? gerado.titulo : popFinal.nome;

  // 14/11/2026 (auditoria A4): a revisão é calculada no momento de gravar, sob a mesma trava do registro de revisões
  // (LockService, como em SGO_DocRevisao.js). Duas gerações simultâneas não repetem o número.
  var trava = PgtPop_travar_();
  if (trava.erro) return { ok: false, mensagem: trava.erro };
  var versaoNova, historico, registro, salvo;
  try {
    var anterior = PgtPop_buscarRegistroMaisRecente_(tipo, hospital, codigoDocumento);
    if (anterior && motivoRevisao.length < PGTPOP_MOTIVO_MIN) return { ok: false, mensagem: PgtPop_msgSemMotivo_(tipo, codigoDocumento, anterior.versaoAtual, true) };
    versaoNova = anterior ? (Number(anterior.versaoAtual) || 1) + 1 : 1;
    historico = anterior ? (anterior.historico || []).slice() : [];
    historico.push({
      versao: versaoNova,
      descricao: anterior ? motivoRevisao : 'Emissão Inicial',
      data: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy")
    });
    registro = {
      tipo: tipo,
      hospital: hospital,
      roteiro: payload.roteiro || '',
      pop: popFinal,
      codigoDocumento: codigoDocumento,
      versaoAtual: versaoNova,
      historico: historico,
      titulo: titulo,
      textoGerado: revisado.texto,
      imagens: gerado.imagensComInterpretacao || [],
      pgtId: payload.pgtId || '',
      elaboradoPorNome: elaboradoPorNome,
      elaboradoPorCargo: elaboradoPorCargo,
      elaboradoPorRegistro: elaboradoPorRegistro
    };
    salvo = tipo === 'PGT' ? PgtPop_salvarPgt_(registro) : PgtPop_salvarPop_(registro);
  } finally {
    trava.soltar();
  }
  registro.registroId = salvo.registroId;

  // Auto-save do PDF na pasta do CNPJ (v14, 2026-08-14) — antes só
  // acontecia se o usuário abrisse o documento manualmente e clicasse
  // "Salvar no Drive"; agora acontece sozinho a cada geração, pra
  // "Consultar documentos já gerados" poder simplesmente listar os
  // arquivos da pasta em vez de reconstruir cada documento sob demanda.
  // Nunca derruba a geração se falhar (documento já está salvo na
  // planilha de qualquer forma).
  var pdf = PgtPop_salvarPdfAutomatico_(registro);
  var docRevR = SGO_DocRev_registrar_('PGT_POP', docRev, {
    numero: PgtPop_numeroPainel_(codigoDocumento, hospital),
    revisao: versaoNova, payload: payload, titulo: (tipo === 'PGT' ? 'PGT' : 'POP') + ' — ' + (titulo || ''), cliente: hospital.razaoSocial || '', cnpj: hospital.cnpj || '',
    pdfId: (pdf && pdf.pdfId) || '', htmlId: (pdf && pdf.htmlId) || '', pdfUrl: (pdf && pdf.url) || '', htmlUrl: (pdf && pdf.htmlUrl) || ''
  }, SGO_DocRev_sessao_(sessionId));

  // A gravação acima já deixa o HTML A4 e o PDF (mesmo nome, sumário com páginas) na pasta do CNPJ.
  var htmlSalvo = { htmlId: (pdf && pdf.htmlId) || '', htmlUrl: (pdf && pdf.htmlUrl) || '' };
  if (pdf && pdf.erro) {
    htmlSalvo.avisoHtml = 'O documento foi gerado e gravado no histórico, mas não foi salvo na pasta do cliente (' + pdf.erro + '). Abra o documento e use "Salvar na pasta do cliente".';
  }

  // Integração Auvo: cria uma Tarefa concluída pra este atendimento. Só
  // dispara se o PDF realmente foi salvo e se o CNPJ digitado bate com um
  // cliente já cadastrado no Portal (este módulo, como o Registros
  // Operacionais, não usa CAD_CLIENTES como fonte — consulta direto de
  // uma API pública de CNPJ). Nunca derruba a geração se o Auvo estiver
  // fora do ar ou mal configurado.
  if (pdf && pdf.url) {
    try {
      var clienteAuvo = Auvo_resolverClientePorCnpj_(hospital.cnpj);
      if (clienteAuvo) {
        Auvo_criarTarefa_({
          documentoId: salvo.registroId,
          titulo: (tipo === 'PGT' ? 'PGT' : 'POP') + ' — ' + titulo,
          descricao: 'Documento de Engenharia Clínica "' + titulo + '" (v' + versaoNova + ') — ' + (hospital.razaoSocial || ''),
          clienteId: clienteAuvo.ID,
          usuarioId: exigirSessao(sessionId).userId,
          data: '',
          linkPdf: pdf.url
        });
      }
    } catch (e) {
      SGO_DATA.log('AUVO_TAREFA_FALHOU', '', 'PGTPOP ' + salvo.registroId + ': ' + e.message, 'AUVO');
    }
  }

  return {
    ok: true,
    tipo: tipo,
    registroId: salvo.registroId,
    codigoDocumento: codigoDocumento,
    versaoAtual: versaoNova,
    historico: historico,
    titulo: titulo,
    textoGerado: revisado.texto,
    imagens: registro.imagens,
    hospital: hospital,
    roteiro: payload.roteiro || '',
    pop: popFinal,
    elaboradoPorNome: elaboradoPorNome,
    elaboradoPorCargo: elaboradoPorCargo,
    elaboradoPorRegistro: elaboradoPorRegistro,
    pdfUrl: pdf.url || '',
    pdfFileName: pdf.fileName || '',
    htmlId: htmlSalvo.htmlId || '',
    htmlUrl: htmlSalvo.htmlUrl || '',
    // 14/11/2026 (DESENHO_V2, seção 5.1): pontos para conferir (não bloqueiam) e a linha do painel de revisões.
    conferir: revisado.conferir || [],
    docRevId: (docRevR && docRevR.ok && docRevR.id) || '',
    avisoHtml: [htmlSalvo.avisoHtml || '', avisoSemIA, docRevR.ok ? '' : docRevR.aviso].filter(Boolean).join(' ')
  };
}

var PGTPOP_MOTIVO_MIN = 10;

/** Número do documento no painel de revisões: "<código> · <CNPJ como digitado ou razão social>". */
function PgtPop_numeroPainel_(codigo, hospital) {
  hospital = hospital || {};
  return String(codigo || '') + ' · ' + (String(hospital.cnpj || '').trim() || String(hospital.razaoSocial || '').trim());
}

/** "POP013", "PGT" ou "POP avulso AV-..." para as mensagens. */
function PgtPop_rotuloDoc_(tipo, codigo) {
  if (tipo === 'PGT') return 'PGT';
  return /^AV-/.test(String(codigo || '')) ? 'POP avulso ' + codigo : String(codigo || 'POP');
}

/** Mensagem da revisão sem motivo (antes da IA ou, na corrida, na hora de gravar). */
function PgtPop_msgSemMotivo_(tipo, codigo, versaoAtual, naGravacao) {
  var rot = PgtPop_rotuloDoc_(tipo, codigo);
  var atual = (Number(versaoAtual) || 1) + '.0', prox = ((Number(versaoAtual) || 1) + 1) + '.0';
  if (naGravacao) {
    return 'O ' + rot + ' não foi gravado: enquanto ele era redigido, outra geração gravou a revisão ' + atual + ' do mesmo código para este CNPJ. ' +
      'Este texto sairia como revisão ' + prox + ' e precisa do motivo. Escreva o motivo desta revisão na caixa 4.2 "Revisões desta rodada" (ao menos ' + PGTPOP_MOTIVO_MIN + ' caracteres) e gere de novo.';
  }
  return 'O ' + rot + ' já tem a revisão ' + atual + ' para este CNPJ: esta geração sai como revisão ' + prox + ' e precisa do motivo. ' +
    'Escreva o motivo desta revisão na caixa 4.2 "Revisões desta rodada" (ao menos ' + PGTPOP_MOTIVO_MIN + ' caracteres) e gere de novo. Nada foi gravado';
}

/** Cargo é obrigatório sempre que o nome correspondente é informado (a tela sempre informa os dois nomes). '' quando está tudo certo. */
function PgtPop_conferirCargos_(payload) {
  payload = payload || {};
  var h = payload.hospital || {};
  var s = function (v) { return String(v == null ? '' : v).trim(); };
  var faltam = [];
  if (s(h.aprovadorNome) && !s(h.aprovadorCargo)) faltam.push('de quem aprova pelo cliente');
  if (s(payload.elaboradoPorNome) && !s(payload.elaboradoPorCargo)) faltam.push('de quem elaborou');
  if (!faltam.length) return '';
  return 'Informe o cargo ' + faltam.join(' e o cargo ') + ': ' + (faltam.length > 1 ? 'eles saem' : 'ele sai') + ' abaixo do nome, nas assinaturas. Preencha na etapa 1 e gere de novo. Nada foi gravado.';
}

/** POP do catálogo: código e nome do catálogo. Avulso (sem código ou fora do catálogo): o nome digitado. */
function PgtPop_popDoCatalogo_(pop) {
  pop = pop || {};
  var cod = String(pop.codigo || '').trim();
  if (cod) {
    var doCat = (PGTPOP_CFG.CATALOGO_POPS || []).filter(function (p) { return p.codigo === cod; })[0];
    if (doCat) return { codigo: cod, nome: doCat.nome };
  }
  return { codigo: cod, nome: String(pop.nome || '').trim() };
}

/** Código estável do POP avulso (auditoria M4): "AV-" + 8 caracteres. A correção do avulso continua este código. */
function PgtPop_novoCodigoAvulso_() {
  return 'AV-' + String(Utilities.getUuid()).replace(/[^0-9a-z]/gi, '').slice(0, 8).toUpperCase();
}

/**
 * Correção ("Abrir para corrigir"): o CNPJ e o código do pedido têm de ser os do documento de origem (auditoria M5).
 * Devolve {} (segue), { codigo } (avulso corrigido: o código da origem) ou { erro }.
 */
function PgtPop_identidadeCorrecao_(docRev, tipo, payload) {
  if (!docRev || docRev.modo !== 'CORRIGIR' || typeof SGO_DocRev_obter_ !== 'function') return {};
  var origem = SGO_DocRev_obter_(docRev.origemId);
  if (!origem) return {};
  var codOrigem = String(origem.NUMERO || '').split(' · ')[0].trim();
  if (/^POP avulso /i.test(codOrigem)) {
    return { erro: 'Este POP avulso foi emitido sem código próprio e não pode sair como revisão dele mesmo. Cancele a correção no quadro amarelo e adicione o POP avulso de novo na etapa 3: sai um documento novo, revisão 1.0. Nada foi gravado.' };
  }
  var hosp = (payload && payload.hospital) || {};
  var dig = function (v) { return String(v || '').replace(/\D/g, ''); };
  var nome = function (v) { return String(v || '').trim().toLowerCase(); };
  var cnpjOrigem = dig(origem.CNPJ);
  var mesmoCliente = cnpjOrigem ? cnpjOrigem === dig(hosp.cnpj) : (!dig(hosp.cnpj) && nome(origem.CLIENTE) === nome(hosp.razaoSocial));
  var codPedido = tipo === 'PGT' ? PGTPOP_CODIGO_PGT : String(((payload && payload.pop) || {}).codigo || '').trim();
  var avulsoOrigem = /^AV-/.test(codOrigem);
  var mesmoCodigo = avulsoOrigem ? (tipo === 'POP' && (!codPedido || codPedido === codOrigem)) : codPedido === codOrigem;
  if (!mesmoCliente || !mesmoCodigo) {
    return { erro: 'O CNPJ ou o código foram trocados durante a correção do ' + PgtPop_rotuloDoc_(codOrigem === PGTPOP_CODIGO_PGT ? 'PGT' : 'POP', codOrigem) + '. A revisão pertence ao CNPJ e ao código do documento aberto. Cancele a correção no quadro amarelo e abra o documento de novo. Nada foi gravado.' };
  }
  return avulsoOrigem ? { codigo: codOrigem } : {};
}

/** Trava da gravação (LockService, o mesmo mecanismo de SGO_DocRevisao.js). { soltar } ou { erro }. */
function PgtPop_travar_() {
  if (typeof LockService === 'undefined' || !LockService || typeof LockService.getScriptLock !== 'function') return { soltar: function () {} };
  var lock;
  try {
    lock = LockService.getScriptLock();
    lock.waitLock(30000);
  } catch (e) {
    return { erro: 'O texto foi redigido, mas não foi gravado: outra gravação estava em andamento e a espera passou de 30 segundos. Nada foi gravado e a revisão continua a mesma. Gere este documento de novo.' };
  }
  return { soltar: function () { try { lock.releaseLock(); } catch (e2) { /* já liberada */ } } };
}

/** Procura, na planilha, o registro mais recente (maior VERSAO_ATUAL) do mesmo hospital (por CNPJ, com fallback pro nome)+código — usado pra decidir se a geração atual é uma nova revisão. */
function PgtPop_buscarRegistroMaisRecente_(tipo, hospital, codigoDocumento) {
  var db = PgtPop_getDB_();
  var col = tipo === 'PGT' ? PGTPOP_COL_PGT : PGTPOP_COL_POP;
  var aba = db.getSheetByName(tipo === 'PGT' ? PGTPOP_CFG.PLANILHA.ABAS.PGT : PGTPOP_CFG.PLANILHA.ABAS.POPS);
  var dados = aba.getDataRange().getValues();
  if (dados.length < 2) return null;

  var cnpjBusca = PgtPop_normalizarCnpj_(hospital.cnpj);
  var nomeBusca = String(hospital.razaoSocial || '').trim().toLowerCase();

  var melhor = null;
  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    var bate = cnpjBusca
      ? PgtPop_normalizarCnpj_(linha[col.CNPJ]) === cnpjBusca
      : String(linha[col.HOSPITAL] || '').trim().toLowerCase() === nomeBusca;
    if (!bate) continue;
    if (String(linha[col.CODIGO] || '').trim() !== codigoDocumento) continue;
    var versao = Number(linha[col.VERSAO]) || 1;
    if (!melhor || versao > melhor.versaoAtual) {
      var historico = [];
      try { historico = JSON.parse(linha[col.HISTORICO_JSON] || '[]'); } catch (e) {}
      melhor = { versaoAtual: versao, historico: historico };
    }
  }
  return melhor;
}

function PgtPop_normalizarCnpj_(cnpj) {
  return String(cnpj || '').replace(/\D/g, '');
}

function PgtPop_salvarPgt_(registro) {
  var db = PgtPop_getDB_();
  var aba = db.getSheetByName(PGTPOP_CFG.PLANILHA.ABAS.PGT);
  var id = PgtPop_gerarId_();
  var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

  aba.appendRow([
    id, agora, registro.hospital.razaoSocial || '', registro.hospital.cnpj || '',
    registro.codigoDocumento, registro.versaoAtual, registro.roteiro || '', registro.elaboradoPorNome || '',
    JSON.stringify({ titulo: registro.titulo, textoGerado: registro.textoGerado, imagens: registro.imagens }),
    JSON.stringify(registro.historico), JSON.stringify(registro.hospital || {}), '',
    registro.elaboradoPorCargo || '', registro.elaboradoPorRegistro || ''
  ]);

  return { registroId: id };
}

function PgtPop_salvarPop_(registro) {
  var db = PgtPop_getDB_();
  var aba = db.getSheetByName(PGTPOP_CFG.PLANILHA.ABAS.POPS);
  var id = PgtPop_gerarId_();
  var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

  aba.appendRow([
    id, agora, registro.hospital.razaoSocial || '', registro.hospital.cnpj || '', registro.pgtId || '',
    registro.codigoDocumento, (registro.pop && registro.pop.nome) || '', registro.versaoAtual,
    registro.roteiro || '', registro.elaboradoPorNome || '',
    JSON.stringify({ titulo: registro.titulo, textoGerado: registro.textoGerado, imagens: registro.imagens }),
    JSON.stringify(registro.historico), JSON.stringify(registro.hospital || {}),
    registro.elaboradoPorCargo || '', registro.elaboradoPorRegistro || ''
  ]);

  return { registroId: id };
}

/**
 * Consulta os documentos JÁ GERADOS pra um CNPJ — pra não precisar
 * gerar tudo de novo toda vez que alguém precisar ver/reimprimir um
 * documento existente. Devolve o registro mais recente por código
 * (PGT + cada POP), já com todo o conteúdo (texto/imagens/histórico/
 * dados do hospital) pronto pra abrir direto (mesmo formato que
 * PgtPop_apiGerarDocumento devolve, então o frontend reaproveita o
 * mesmo fluxo de "Abrir"/"Salvar no Drive").
 */
function PgtPop_apiListarDocumentos(payload) {
  payload = payload || {};
  var cnpjBusca = PgtPop_normalizarCnpj_(payload.cnpj);
  if (!cnpjBusca) {
    return { ok: false, mensagem: "Informe um CNPJ pra consultar." };
  }

  try {
    var db = PgtPop_getDB_();
    var resultado = [];

    var abaPgt = db.getSheetByName(PGTPOP_CFG.PLANILHA.ABAS.PGT);
    var dadosPgt = abaPgt.getDataRange().getValues();
    var melhorPgt = null;
    for (var i = 1; i < dadosPgt.length; i++) {
      var l = dadosPgt[i];
      if (PgtPop_normalizarCnpj_(l[PGTPOP_COL_PGT.CNPJ]) !== cnpjBusca) continue;
      var versaoPgt = Number(l[PGTPOP_COL_PGT.VERSAO]) || 1;
      if (!melhorPgt || versaoPgt > melhorPgt.versaoAtual) {
        melhorPgt = PgtPop_linhaParaDocumento_(l, PGTPOP_COL_PGT, 'PGT', true);
      }
    }
    if (melhorPgt) resultado.push(melhorPgt);

    var abaPops = db.getSheetByName(PGTPOP_CFG.PLANILHA.ABAS.POPS);
    var dadosPops = abaPops.getDataRange().getValues();
    var melhorPorCodigo = {};
    for (var j = 1; j < dadosPops.length; j++) {
      var lp = dadosPops[j];
      if (PgtPop_normalizarCnpj_(lp[PGTPOP_COL_POP.CNPJ]) !== cnpjBusca) continue;
      var cod = lp[PGTPOP_COL_POP.CODIGO] || ('avulso_' + j);
      var versaoPop = Number(lp[PGTPOP_COL_POP.VERSAO]) || 1;
      if (!melhorPorCodigo[cod] || versaoPop > melhorPorCodigo[cod].versaoAtual) {
        melhorPorCodigo[cod] = PgtPop_linhaParaDocumento_(lp, PGTPOP_COL_POP, 'POP', true);
      }
    }
    Object.keys(melhorPorCodigo).forEach(function (cod) { resultado.push(melhorPorCodigo[cod]); });

    // 2026-08-14: usuário reportou (consistente, 100% das vezes, testado
    // sozinho — não é rede nem concorrência) que essa consulta específica
    // sempre voltava `null` pro cliente mesmo com resposta pequena (~19KB)
    // e rápida (~1.2s) confirmadas em teste direto no servidor. A única
    // diferença estrutural real pras outras chamadas do módulo (que
    // funcionam) é que esta devolve uma LISTA de objetos aninhados (cada
    // um com sub-objetos hospital/historico e um campo Date) — variação
    // de payload complexo com grafo aninhado é um problema conhecido do
    // canal do google.script.run, independente do tamanho em bytes.
    // Serializando pra string aqui (documentosJson) em vez de devolver o
    // array de objetos direto evita esse tipo de falha silenciosa —
    // string é o tipo mais simples possível de transmitir.
    return { ok: true, documentosJson: JSON.stringify(resultado) };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao consultar documentos: " + e.message };
  }
}

/**
 * Busca UM documento completo (texto+imagens) por registroId — usado
 * quando o usuário clica "Abrir" num item vindo da consulta por CNPJ
 * (2026-08-14, bugfix: `apiListarDocumentos` devolvia TUDO hidratado —
 * texto completo + imagens de cada documento já gerado pro CNPJ de
 * uma vez só, o que passou de 2,4 MB numa conta com bastante histórico
 * de testes e estourou o limite de payload do google.script.run — o
 * cliente recebia `null` em vez do resultado, "Cannot read properties
 * of null (reading 'ok')"). Agora `apiListarDocumentos` só devolve
 * resumo leve (sem textoGerado/imagens) e este endpoint busca o
 * conteúdo completo de UM documento por vez, sob demanda.
 */
function PgtPop_apiObterDocumentoPorId(payload) {
  payload = payload || {};
  var tipo = String(payload.tipo || '').toUpperCase();
  var registroId = String(payload.registroId || '');
  if (tipo !== 'PGT' && tipo !== 'POP') {
    return { ok: false, mensagem: "Tipo de documento inválido: " + tipo };
  }
  if (!registroId) {
    return { ok: false, mensagem: "ID do documento não informado." };
  }
  try {
    var db = PgtPop_getDB_();
    var col = tipo === 'PGT' ? PGTPOP_COL_PGT : PGTPOP_COL_POP;
    var aba = db.getSheetByName(tipo === 'PGT' ? PGTPOP_CFG.PLANILHA.ABAS.PGT : PGTPOP_CFG.PLANILHA.ABAS.POPS);
    var dados = aba.getDataRange().getValues();
    for (var i = 1; i < dados.length; i++) {
      if (String(dados[i][col.ID]) === registroId) {
        // Documento completo (texto+imagens) devolvido como STRING
        // (documentoJson), mesma defesa aplicada em apiListarDocumentos —
        // ver comentário em PgtPop_linhaParaDocumento_ sobre o Date que
        // quebrava esse canal antes.
        return { ok: true, documentoJson: JSON.stringify(PgtPop_linhaParaDocumento_(dados[i], col, tipo, false)) };
      }
    }
    return { ok: false, mensagem: "Documento não encontrado (pode ter sido removido da planilha)." };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao obter o documento: " + e.message };
  }
}

/** @param {boolean} apenasResumo quando true, omite textoGerado/imagens (payload leve pra listagem). */
function PgtPop_linhaParaDocumento_(linha, col, tipo, apenasResumo) {
  var textoJson = {};
  try { textoJson = JSON.parse(linha[col.TEXTO_JSON] || '{}'); } catch (e) {}
  var historico = [];
  try { historico = JSON.parse(linha[col.HISTORICO_JSON] || '[]'); } catch (e) {}
  var hospital = {};
  try { hospital = JSON.parse(linha[col.HOSPITAL_JSON] || '{}'); } catch (e) {}

  var doc = {
    ok: true,
    tipo: tipo,
    registroId: linha[col.ID],
    codigoDocumento: linha[col.CODIGO],
    versaoAtual: Number(linha[col.VERSAO]) || 1,
    historico: historico,
    titulo: textoJson.titulo || (tipo === 'PGT' ? 'PGTS' : linha[col.NOME_POP]),
    hospital: hospital,
    roteiro: linha[col.ROTEIRO] || '',
    pop: tipo === 'POP' ? { codigo: linha[col.CODIGO], nome: linha[col.NOME_POP] } : null,
    elaboradoPorNome: linha[col.ELABORADO_POR] || '',
    elaboradoPorCargo: linha[col.ELABORADO_POR_CARGO] || '',
    elaboradoPorRegistro: linha[col.ELABORADO_POR_REGISTRO] || '',
    // Raiz real do bug "resposta vazia/nula" em apiObterDocumentoPorId
    // (2026-08-14): a coluna DATA volta da planilha como objeto Date
    // (não string), e um Date "vivo" atravessando o canal do
    // google.script.run quebra a entrega silenciosamente — o cliente
    // recebe null. apiListarDocumentos escapou disso por acidente (já
    // devolve tudo serializado como JSON.stringify, que converte o Date
    // pra string antes de cruzar o canal); aqui a fonte é corrigida na
    // origem, pra nenhum outro campo Date nesta função voltar a quebrar
    // isso no futuro.
    data: (linha[col.DATA] instanceof Date)
      ? Utilities.formatDate(linha[col.DATA], Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss")
      : String(linha[col.DATA] || '')
  };
  if (!apenasResumo) {
    doc.textoGerado = textoJson.textoGerado || '';
    doc.imagens = textoJson.imagens || [];
  }
  return doc;
}

function PgtPop_getDB_() {
  var props = PropertiesService.getScriptProperties();
  var dbId = props.getProperty("PGTPOP_DB_ID");
  if (!dbId) {
    // Auto-provisiona na primeira vez (planilha + pastas do Drive), sem
    // exigir um passo manual de admin — mesmo padrão do Cronograma de
    // Execução/Planejamento CME.
    PgtPop_setupModulo();
    dbId = props.getProperty("PGTPOP_DB_ID");
  }
  return SpreadsheetApp.openById(dbId);
}

// ------------------------------------------------------------
// CONSULTA PÚBLICA DE CNPJ (mesmo padrão de CronExec_apiConsultarCnpj)
// ------------------------------------------------------------

function PgtPop_apiConsultarCnpj(payload) {
  payload = payload || {};
  const cnpj = String(payload.cnpj || '').replace(/\D/g, '');

  if (!/^\d{14}$/.test(cnpj)) {
    throw new Error('Informe um CNPJ válido com 14 dígitos.');
  }

  // Consulta com reserva entre várias bases públicas + cache (SGO_CnpjConsulta.js).
  const data = SGO_CNPJ_consultarDados_(cnpj);

  // Logradouro e bairro voltam SEPARADOS (bug real, 2026-08-14: antes só
  // existia um "endereco" combinado, e o wizard jogava tudo em Logradouro
  // deixando o campo Bairro sempre vazio — usuário tinha que digitar toda
  // vez).
  const logradouroPartes = [
    data.descricao_tipo_de_logradouro || '',
    data.logradouro || '',
    data.numero || '',
    data.complemento ? ('- ' + data.complemento) : ''
  ].filter(function (v) { return String(v || '').trim(); }).join(' ').replace(/\s+/g, ' ').trim();

  return {
    ok: true,
    fonte: 'consulta pública',
    cnpj: PgtPop_formatarCnpj_(cnpj),
    razaoSocial: data.razao_social || '',
    cliente: data.razao_social || data.nome_fantasia || '',
    logradouro: logradouroPartes,
    bairro: data.bairro || '',
    municipio: data.municipio || '',
    uf: data.uf || ''
  };
}

function PgtPop_formatarCnpj_(cnpj) {
  const s = String(cnpj || '').replace(/\D/g, '');
  if (s.length !== 14) return String(cnpj || '');
  return s.substring(0, 2) + '.' + s.substring(2, 5) + '.' + s.substring(5, 8) + '/' + s.substring(8, 12) + '-' + s.substring(12);
}


/** POP sem a IA: texto padrão montado a partir do roteiro escrito pelo técnico. As imagens entram com a legenda, sem interpretação (auditoria M6). */
function PgtPop_textoPadraoPop_(hospital, pop, roteiro, imagens) {
  var nome = (pop && pop.nome) || 'Procedimento';
  // 14/11/2026 (fichas técnicas): o texto padrão usa o objetivo, a abrangência, os papéis e os registros da ficha do POP
  // (conteúdo conferido, não inventado); sem ficha (avulso), o texto de sempre. O nome do cliente fica na identificação.
  var ficha = typeof PgtPopIA_ficha_ === 'function' ? PgtPopIA_ficha_(pop && pop.codigo) : null;
  var corpo = ficha ? [
    '## Objetivo ##', ficha.objetivo, '',
    '## Abrangência ##', ficha.escopo, '',
    '## Responsabilidades ##', ficha.responsabilidades.map(function (r) { return r.papel + ': ' + r.atribuicoes; }).join('\n\n'), '',
    '## Procedimento ##', String(roteiro || '').trim(), '',
    '## Materiais e registros ##', 'Registros deste procedimento: ' + ficha.registros.join('; ') + '. Os registros são arquivados conforme o procedimento de controle de documentos do estabelecimento.'
  ].join('\n') : [
    '## Objetivo ##',
    'Estabelecer a sistemática de ' + nome.toLowerCase() + ' no estabelecimento.',
    '',
    '## Responsabilidades ##',
    'A execução cabe à equipe de engenharia clínica responsável pelo serviço. A aprovação deste procedimento e a guarda dos registros cabem ao responsável técnico do estabelecimento.',
    '',
    '## Procedimento ##',
    String(roteiro || '').trim(),
    '',
    '## Materiais e registros ##',
    'Os registros gerados por este procedimento devem ser arquivados conforme o procedimento de controle de documentos do estabelecimento.'
  ].join('\n');
  var comImagens = (Array.isArray(imagens) ? imagens : []).filter(function (im) { return im && im.base64; }).map(function (im) {
    return { base64: im.base64, mimeType: im.mimeType || 'image/jpeg', legenda: im.legenda || '', interpretacao: '' };
  });
  return { titulo: nome, textoGerado: corpo, imagensComInterpretacao: comImagens };
}
