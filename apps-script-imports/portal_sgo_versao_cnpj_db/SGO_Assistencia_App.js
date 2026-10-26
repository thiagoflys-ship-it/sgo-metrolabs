/****************************************************
 * ASSISTÊNCIA TÉCNICA — API DO APLICATIVO DO TÉCNICO (21/10/2026)
 *
 * Contrato combinado com a equipe do aplicativo (instalável, trabalha sem internet): docs/API_APP_TECNICO.md.
 * Funções globais (o servidor próprio chama por POST /api/run; no Google, google.script.run):
 *   Ast_appMeuDia(sessionId, { dia, dias, tecnicoId })
 *   Ast_appSincronizar(sessionId, { pedidoId, aparelho, eventos: [{ tipo, osId, em, dados, idLocal }] })
 *   Ast_appEnviarFoto(sessionId, { osId, idLocal, nome, base64, perguntaId, legenda, em })
 *   Ast_appOS(sessionId, { osId })
 * Versão 2 (22/10/2026, etapa 1 do estudo): o técnico localiza ou cadastra cliente, unidade e equipamento e abre a O.S. em campo:
 *   Ast_appBuscarCadastro(sessionId, { termo, clienteId, unidadeId })      busca com limite (nunca a base inteira)
 *   Ast_appConsultarCnpj(sessionId, { cnpj })                              consulta pública do CNPJ (precisa de internet no servidor)
 *   Ast_appCadastrar(sessionId, { idLocal, tipo, dados, em })              cria marcado "criado em campo"; nunca duplica (devolve o existente)
 *   Ast_appAbrirOS(sessionId, { idLocal, clienteId, unidadeId, equipamentoId, tipoCodigo, sintoma, ... })  chamado + triagem em campo + O.S.
 * Ids provisórios do aparelho (o idLocal do cadastro ou da O.S. criados sem internet) são aceitos no lugar do id real:
 * ATEC_SYNC guarda, em REF_ID, o registro que cada idLocal criou.
 * Trava por sessão e por técnico responsável. Idempotente por idLocal (ATEC_SYNC guarda cada evento aceito).
 * Nunca lança: devolve { ok:false, codigo, message } (SESSAO, SEM_ACESSO, DESLIGADA, ENTRADA, ERRO).
 ****************************************************/

var AST_APP_VERSAO = 2;
var AST_APP_LIMITE_BUSCA = 20;
var AST_APP_MAX_EVENTOS = 200;
var AST_RX_ID_LOCAL = /^[A-Za-z0-9_.:-]{8,80}$/;

function AstApp_resposta_(sessionId, fn, opcoes) {
  var o = opcoes || {};
  Ast_memoLimpar_();
  var eu;
  try { eu = Ast_eu_(sessionId); } catch (e) { return { ok: false, codigo: 'SESSAO', message: 'Sua sessão terminou. Entre de novo com usuário e senha; o que está guardado no aparelho não se perde e sobe depois do login.' }; }
  if (eu.cliente || eu.nivel === 'NENHUM') return { ok: false, codigo: 'SEM_ACESSO', message: 'O aplicativo do técnico é da equipe interna da Metrolabs. Clientes acompanham os chamados pelo portal do cliente.' };
  if (!o.mesmoDesligada && !Ast_ligada_()) return { ok: false, codigo: 'DESLIGADA', message: 'A Assistência técnica do SGO+ está desligada pela gestão. Guarde o que está no aparelho e fale com a gestão da área Técnica.' };
  try {
    Ast_garantirAbas_();
    Ast_garantirSemente_();
    var r = fn(eu);
    return JSON.parse(JSON.stringify(Object.assign({ ok: true }, r || {})));
  } catch (e2) {
    var m = String((e2 && e2.message) || e2).replace(/[.\s]+$/, '');
    var entrada = /^Não foi possível/.test(m);
    if (!entrada) console.error('Aplicativo do técnico: ' + m);
    return { ok: false, codigo: entrada ? 'ENTRADA' : 'ERRO', message: (entrada ? m : 'Não foi possível concluir no servidor: ' + m + '. Nada foi gravado pela metade; tente de novo em alguns minutos') + '.' };
  }
}

/** Uma O.S. no formato do contrato (item de os em Ast_appMeuDia). */
function AstApp_os_(os, eu, opcoes) {
  var o = opcoes || {};
  var cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(os.CLIENTE_ID)] || {}, un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[Ast_s_(os.UNIDADE_ID)] || {};
  var eq = Ast_mapa_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS)[Ast_s_(os.EQUIPAMENTO_ID)] || null, c = Ast_porId_(AST_ABAS.CHAMADOS, os.CHAMADO_ID) || {};
  var tipo = Ast_tipo_(os.TIPO_CODIGO) || { codigo: Ast_up_(os.TIPO_CODIGO), nome: Ast_s_(os.TIPO_NOME), exige: { relato: true, assinatura: true, fotosMin: 0, qrOuSerie: false, checklist: false }, grupo: '', semVisita: false };
  var fotos = AstO_fotos_(os.ID), pecas = AstO_pecas_(os.ID), resp = AstO_respostas_(os), s = Ast_up_(os.SITUACAO);
  var respostas = {};
  Object.keys(resp).forEach(function (k) { respostas[k] = resp[k] && resp[k].v; });
  var sla = c.ID ? Ast_slaEstado_(c, Date.now()) : { estado: 'SEM_PRAZO', ate: '' };
  var hist = [];
  if (o.historico !== false && Ast_s_(os.EQUIPAMENTO_ID) && typeof SGO_Atendimentos_doEquipamento_ === 'function') {
    try {
      hist = SGO_Atendimentos_doEquipamento_(os.EQUIPAMENTO_ID, { limite: 6, sessao: eu }).filter(function (h) { return h.numero !== Ast_s_(os.NUMERO); }).slice(0, 5)
        .map(function (h) { return { data: h.data, origem: h.origem, numero: h.numero, tipo: h.tipo, tecnico: h.tecnico, resumo: Ast_s_(h.relato).slice(0, 300) }; });
    } catch (e) { hist = []; }
  }
  return {
    id: Ast_s_(os.ID), numero: Ast_s_(os.NUMERO), chamadoId: Ast_s_(os.CHAMADO_ID), chamadoNumero: Ast_s_(os.CHAMADO_NUMERO), situacao: s, situacaoNome: AST_OS_SITUACOES[s] || s,
    ordem: Number(os.ORDEM_DIA) || 0, agendadoPara: Ast_iso_(os.AGENDADO_PARA), duracaoMin: Number(os.DURACAO_MIN) || 0,
    prioridade: Ast_up_(c.PRIORIDADE), prioridadeNome: AST_PRIORIDADES[Ast_up_(c.PRIORIDADE)] || '', prazoAtendimento: { ate: sla.ate || '', estado: sla.estado },
    tipo: { codigo: tipo.codigo, nome: tipo.nome, exige: AstApp_exige_(tipo) },
    abertaEmCampo: Ast_sim_(os.ABERTA_EM_CAMPO),
    sintoma: Ast_s_(c.SINTOMA), orientacao: Ast_s_(os.ORIENTACAO),
    cliente: { id: Ast_s_(os.CLIENTE_ID), nome: Ast_s_(os.CLIENTE_NOME) || Ast_clienteNome_(cli), cnpj: Ast_s_(cli.CNPJ), telefone: Ast_s_(cli.TELEFONE) },
    unidade: { id: Ast_s_(os.UNIDADE_ID), nome: Ast_s_(os.UNIDADE_NOME) || Ast_s_(un.NOME_UNIDADE), endereco: Ast_s_(un.ENDERECO) || Ast_s_(cli.ENDERECO), cidade: Ast_s_(un.CIDADE), uf: Ast_s_(un.UF),
      responsavel: Ast_s_(un.RESPONSAVEL), telefone: Ast_s_(un.TELEFONE) },
    enderecoMapa: Ast_linkMapa_(os.ENDERECO), contato: { nome: Ast_s_(c.SOLICITANTE), telefone: Ast_s_(c.CONTATO) },
    equipamento: eq ? { id: Ast_s_(eq.ID), tipo: Ast_s_(eq.TIPO), modelo: Ast_s_(eq.MODELO), serie: Ast_s_(eq.SERIE), tag: Ast_s_(eq.TAG), setor: Ast_s_(eq.SETOR), patrimonio: Ast_s_(eq.PATRIMONIO) } :
      { id: '', tipo: '', modelo: '', serie: '', tag: '', setor: '', patrimonio: '', descricao: Ast_s_(os.EQUIPAMENTO_TEXTO) },
    checklist: { modeloId: Ast_up_(os.MODELO_CODIGO), versao: Number(os.MODELO_VERSAO) || 0, nome: (Ast_modelo_(os.MODELO_CODIGO) || {}).nome || '', perguntas: AstO_perguntas_(os) },
    registrado: { saiuEm: Ast_iso_(os.SAIU_EM), chegouEm: Ast_iso_(os.CHEGOU_EM), concluiuEm: Ast_iso_(os.CONCLUIU_EM), respostas: respostas,
      fotos: fotos.map(function (f) { return { idLocal: Ast_s_(f.ID_LOCAL), perguntaId: Ast_s_(f.PERGUNTA_ID), nome: Ast_s_(f.NOME) }; }),
      pecas: pecas.map(function (p) { return { idLocal: Ast_s_(p.ID_LOCAL), descricao: Ast_s_(p.DESCRICAO), codigo: Ast_s_(p.CODIGO), quantidade: Number(p.QUANTIDADE) || 0, unidade: Ast_s_(p.UNIDADE), situacao: Ast_up_(p.SITUACAO) }; }),
      relato: { relato: Ast_s_(os.RELATO), condicaoEncontrada: Ast_s_(os.CONDICAO_ENCONTRADA), causa: Ast_s_(os.CAUSA), servicoRealizado: Ast_s_(os.SERVICO_REALIZADO), testeFuncional: Ast_s_(os.TESTE_FUNCIONAL),
        recomendacoes: Ast_s_(os.RECOMENDACOES), serieConfirmada: Ast_s_(os.SERIE_CONFIRMADA), identificadoPor: Ast_up_(os.IDENTIFICADO_POR) },
      assinatura: Ast_s_(os.ASSINATURA_ARQUIVO_ID) ? { nome: Ast_s_(os.ASSINATURA_NOME), em: Ast_iso_(os.ASSINATURA_EM) } : (Ast_s_(os.SEM_ASSINATURA_MOTIVO) ? { semAssinatura: true, recebidoPor: Ast_s_(os.SEM_ASSINATURA_RECEBIDO_POR) } : null) },
    historicoEquipamento: hist,
    pendencias: AST_OS_ABERTAS.indexOf(s) >= 0 ? AstO_faltas_(os, fotos).map(function (x) { return 'falta ' + x; }) : [],
    relatorioUrl: Ast_s_(os.RELATORIO_PDF_URL),
    // 22/10/2026 (etapa 2): estado do documento e do envio ao cliente (só acrescentado; o aplicativo antigo continua valendo)
    envio: AstApp_envio_(os, eu)
  };
}

/** Estado do envio ao cliente no formato do contrato (docs/API_APP_TECNICO.md, "envio"). */
function AstApp_envio_(os, eu) {
  var e = typeof AstO_envio_ === 'function' ? AstO_envio_(os, eu) : { situacao: 'SEM_PDF', contatos: [] };
  return { situacao: e.situacao, pdfGerado: !!e.pdfGerado, relatorioUrl: e.pdfUrl || '', geradoEm: Ast_iso_(os.RELATORIO_EM), revisao: e.revisao || 0,
    enviadoEm: Ast_iso_(os.ENVIADO_CLIENTE_EM), enviadoPor: e.enviadoPor || '', enviadoCanal: e.enviadoCanal || '', enviadoPara: e.enviadoPara || '', podeEnviar: !!e.podeEnviar,
    contatos: (e.contatos || []).map(function (k) { return { nome: k.nome, email: k.email, origem: k.origem, sugerido: !!k.sugerido }; }), texto: e.texto || '' };
}

/**
 * Evento ENVIAR_CLIENTE da fila do aparelho (22/10/2026, etapa 2): o técnico, no fim do atendimento, manda o PDF do
 * relatório ao cliente por e-mail. Roda FORA da trava da Assistência (o Enviar documento tem a sua própria trava).
 * Idempotente pelo idLocal (vira o pedidoId do Enviar documento). Devolve { ok, nota } ou { ok:false, motivo, corrigir, definitivo }.
 */
function AstApp_enviarCliente_(eu, ev) {
  var d = ev.dados || {}, os = Ast_porId_(AST_ABAS.OS, ev.osId);
  if (!os) return { ok: false, definitivo: true, motivo: 'a O.S. não existe mais no servidor', corrigir: 'Atualize o Meu dia; se a O.S. sumiu, fale com a gestão da área Técnica.' };
  if (!eu.gestao && Ast_s_(os.TECNICO_ID) !== eu.id) return { ok: false, definitivo: true, motivo: 'a O.S. ' + os.NUMERO + ' é de ' + (Ast_s_(os.TECNICO_NOME) || 'outro técnico'), corrigir: 'Só o técnico responsável (ou a gestão) envia o relatório.' };
  var s = Ast_up_(os.SITUACAO);
  if (s === 'CANCELADA') return { ok: false, definitivo: true, motivo: 'a O.S. ' + os.NUMERO + ' foi cancelada', corrigir: 'Nada a enviar.' };
  if (s !== 'ENCERRADA') return { ok: false, definitivo: false, motivo: 'a O.S. ' + os.NUMERO + ' ainda não está encerrada (' + (AST_OS_SITUACOES[s] || s) + ')', corrigir: 'Complete a documentação e toque em Concluí; o relatório é gerado no encerramento. Depois toque em "Tentar de novo" em Envios.' };
  if (!Ast_s_(os.RELATORIO_PDF_ID)) return { ok: false, definitivo: false, motivo: 'o relatório da O.S. ' + os.NUMERO + ' ainda está sendo gerado', corrigir: 'Tente sincronizar de novo em alguns minutos.' };
  if (Ast_s_(os.ENVIADO_CLIENTE_EM) && !Ast_sim_(d.reenviar)) return { ok: true, nota: 'o relatório já tinha sido enviado ao cliente em ' + Ast_br_(os.ENVIADO_CLIENTE_EM) + ' para ' + Ast_s_(os.ENVIADO_CLIENTE_PARA) };
  try {
    var r = AstR_enviarRelatorioCliente_(eu, { osId: os.ID, pedidoId: ev.idLocal, para: d.para || d.emails || [], mensagem: d.mensagem });
    return { ok: true, nota: r.message };
  } catch (e) {
    var m = String((e && e.message) || e).replace(/^Não foi possível [^:]+:\s*/, '').replace(/[.\s]+$/, '');
    var corrigivel = /não está completo|escolha ou digite/.test(m);
    return { ok: false, definitivo: false, motivo: m, corrigir: corrigivel ? 'Corrija o e-mail do contato na O.S. e envie de novo.' : 'Tente de novo quando houver sinal; se continuar, a gestão envia pela ficha da O.S. no SGO+.' };
  }
}

/** Exigências de um tipo no formato do contrato (relatoCampos = campos do RELATO que AstO_faltas_ exige para encerrar, 21/10/2026). */
function AstApp_exige_(tipo) {
  var ex = tipo.exige || {};
  return { relato: !!ex.relato, assinatura: !!ex.assinatura, fotosMin: Number(ex.fotosMin) || 0, qrOuSerie: !!ex.qrOuSerie, checklist: !!ex.checklist,
    relatoCampos: ex.relato ? ['servicoRealizado'].concat(tipo.semVisita ? [] : ['condicaoEncontrada']).concat(tipo.grupo === 'TECNICO' ? ['testeFuncional'] : []) : [] };
}
/** Tipos de serviço que o técnico pode escolher ao abrir a O.S. em campo (ativos, com visita), com o checklist para o aparelho montar a O.S. sem internet. */
function AstApp_tipos_() {
  return Ast_tipos_(false).filter(function (t) { return !t.semVisita; }).map(function (t) {
    var m = t.modeloCodigo ? Ast_modelo_(t.modeloCodigo) : null;
    return { codigo: t.codigo, nome: t.nome, grupo: t.grupo, descricao: t.descricao, exige: AstApp_exige_(t),
      checklist: { modeloId: m ? m.codigo : '', versao: m ? m.versao : 0, nome: m ? m.nome : '', perguntas: m ? m.perguntas : [] } };
  });
}

function AstApp_resumoOs_(os, eu) {
  var s = Ast_up_(os.SITUACAO);
  return { id: Ast_s_(os.ID), numero: Ast_s_(os.NUMERO), situacao: s, situacaoNome: AST_OS_SITUACOES[s] || s, encerrada: s === 'ENCERRADA',
    pendencias: AST_OS_ABERTAS.indexOf(s) >= 0 ? AstO_faltas_(os).map(function (x) { return 'falta ' + x; }) : [], relatorioUrl: Ast_s_(os.RELATORIO_PDF_URL), envio: AstApp_envio_(os, eu) };
}

/** Meu dia: O.S. do técnico no período e as que ficaram abertas de dias anteriores. */
function Ast_appMeuDia(sessionId, payload) {
  return AstApp_resposta_(sessionId, function (eu) {
    var p = payload || {};
    var tecId = eu.gestao && Ast_s_(p.tecnicoId) ? Ast_s_(p.tecnicoId) : eu.id;
    var dia = /^\d{4}-\d{2}-\d{2}$/.test(Ast_s_(p.dia)) ? Ast_s_(p.dia) : Ast_hoje_();
    var dias = Math.max(1, Math.min(7, Number(p.dias) || 1)), ate = Ast_somarDias_(dia, dias - 1);
    var us = Ast_usuarios_(), tec = us[tecId];
    if (!tec) throw new Error('Não foi possível montar o Meu dia: o técnico escolhido não está no cadastro de usuários');
    var lista = Ast_ler_(AST_ABAS.OS).filter(function (o) {
      if (Ast_s_(o.TECNICO_ID) !== tecId) return false;
      var s = Ast_up_(o.SITUACAO), d = Ast_dia_(o.AGENDADO_PARA);
      if (s === 'CANCELADA') return false;
      if (d >= dia && d <= ate) return s !== 'ENCERRADA' || d === dia;
      return d < dia && AST_OS_ABERTAS.indexOf(s) >= 0;
    }).sort(function (a, b) { return Ast_dia_(a.AGENDADO_PARA).localeCompare(Ast_dia_(b.AGENDADO_PARA)) || ((Number(a.ORDEM_DIA) || 99) - (Number(b.ORDEM_DIA) || 99)) || String(a.AGENDADO_PARA).localeCompare(String(b.AGENDADO_PARA)); });
    var ordem = 0, regras = Ast_regras_();
    return { versaoContrato: AST_APP_VERSAO, geradoEm: Ast_agora_(), dia: dia, ate: ate, tecnico: { id: tec.id, nome: tec.nome }, assistenciaLigada: Ast_ligada_(),
      regras: { fotoMaxBytes: Number(regras.fotos.maxBytes) || 2000000, fotoRecomendadaBytes: 300000, localizacaoSo: ['CHEGUEI', 'CONCLUI'],
        motivosSemAssinatura: Object.keys(AST_MOTIVOS_SEM_ASSINATURA).map(function (k) { return { codigo: k, nome: AST_MOTIVOS_SEM_ASSINATURA[k] }; }) },
      // versão 2: o que o aparelho precisa para abrir uma O.S. em campo sem internet (tipos com checklist, prioridades, parada)
      campo: { podeAbrir: !!(eu.tecnico || eu.gestao), duracaoPadraoMin: Number(regras.agenda.duracaoPadraoMin) || 90, limiteBusca: AST_APP_LIMITE_BUSCA,
        prioridades: Object.keys(AST_PRIORIDADES).map(function (k) { return { codigo: k, nome: AST_PRIORIDADES[k] }; }),
        paradas: Object.keys(AST_PARADA).map(function (k) { return { codigo: k, nome: AST_PARADA[k] }; }) },
      tipos: AstApp_tipos_(),
      // 26/10/2026 (agenda única, etapa 3): atividades internas do técnico (SGO_Assistencia_AppAtividades.js)
      atividades: tecId === eu.id && typeof AstApp_atividades_ === 'function' ? AstApp_atividades_(eu) : [],
      motivosAtraso: typeof AstApp_motivosAtraso_ === 'function' ? AstApp_motivosAtraso_() : [],
      os: lista.map(function (o) { var x = AstApp_os_(o, eu); x.ordem = ++ordem; return x; }) };
  });
}

function Ast_appOS(sessionId, payload) {
  return AstApp_resposta_(sessionId, function (eu) {
    var os = AstO_obter_(eu, AstApp_idReal_('NOVA_OS', payload && payload.osId), 'abrir a O.S.');
    return { os: AstApp_os_(os, eu) };
  });
}

/** Sobe a fila do aparelho (idempotente por idLocal). */
function Ast_appSincronizar(sessionId, payload) {
  return AstApp_resposta_(sessionId, function (eu) {
    var p = payload || {};
    var pedidoId = Ast_texto_(p.pedidoId, 80);
    if (!pedidoId) throw new Error('Não foi possível sincronizar: falta o pedidoId (identificador único deste envio)');
    var eventos = Array.isArray(p.eventos) ? p.eventos : null;
    if (!eventos) throw new Error('Não foi possível sincronizar: "eventos" precisa ser uma lista');
    if (eventos.length > AST_APP_MAX_EVENTOS) throw new Error('Não foi possível sincronizar: no máximo ' + AST_APP_MAX_EVENTOS + ' eventos por envio (vieram ' + eventos.length + '). Divida a fila em partes');
    var aparelho = Ast_texto_(JSON.stringify(p.aparelho || {}), 300);
    var recebidoEm = Ast_agora_();
    var aceitos = [], recusados = [], tocadas = {}, linhas = [], enviosCliente = [], atvEventos = [];
    var ordenados = eventos.map(function (e, i) { return { e: e || {}, i: i, ms: Ast_ms_((e || {}).em) }; })
      .sort(function (a, b) { return ((a.ms === null ? Infinity : a.ms) - (b.ms === null ? Infinity : b.ms)) || (a.i - b.i); });
    Ast_comTrava_(function () {
      var vistos = {};
      Ast_ler_(AST_ABAS.SYNC).forEach(function (r) { if (Ast_up_(r.RESULTADO) === 'ACEITO') vistos[Ast_s_(r.ID_LOCAL)] = true; });
      var ctx = {};
      ordenados.forEach(function (x) {
        // osId pode ser o id provisório da O.S. aberta em campo sem internet (idLocal do NOVA_OS): vira o id real
        var ev = x.e, idLocal = Ast_s_(ev.idLocal), tipo = Ast_up_(ev.tipo), osId = AstApp_idReal_('NOVA_OS', ev.osId);
        if (!AST_RX_ID_LOCAL.test(idLocal)) { recusados.push({ idLocal: idLocal, tipo: tipo, osId: osId, definitivo: true, motivo: 'idLocal inválido (8 a 80 letras, números ou _.:-)', corrigir: 'Atualize o aplicativo.' }); return; }
        if (vistos[idLocal]) { aceitos.push({ idLocal: idLocal, tipo: tipo, osId: osId, duplicado: true }); return; }
        // 22/10/2026 (etapa 2): o envio do relatório ao cliente roda depois da trava (o Enviar documento tem a sua própria)
        if (tipo === 'ENVIAR_CLIENTE') { enviosCliente.push({ ev: ev, idLocal: idLocal, osId: osId }); return; }
        // 26/10/2026: atividade interna (Minhas atividades no aplicativo): roda depois da trava, pela API das atividades
        if (typeof AST_APP_ATV_TIPOS !== 'undefined' && AST_APP_ATV_TIPOS.indexOf(tipo) >= 0) { atvEventos.push({ ev: ev, idLocal: idLocal, tipo: tipo }); return; }
        var r;
        try { r = AstO_aplicarEvento_(eu, { tipo: tipo, osId: osId, em: ev.em, dados: ev.dados || {}, idLocal: idLocal }, ctx); }
        catch (e) { r = { ok: false, definitivo: false, motivo: String((e && e.message) || e).replace(/^Não foi possível [^:]+:\s*/, ''), corrigir: 'Tente sincronizar de novo; se continuar, fale com a gestão.' }; }
        if (r.ok) {
          vistos[idLocal] = true; tocadas[osId] = true;
          aceitos.push({ idLocal: idLocal, tipo: tipo, osId: osId, duplicado: false, nota: r.nota || '' });
          linhas.push({ ID_LOCAL: idLocal, PEDIDO_ID: pedidoId, OS_ID: osId, TIPO: tipo, TECNICO_ID: eu.id, RESULTADO: 'ACEITO', MOTIVO: Ast_texto_(r.nota, 300), EM_APARELHO: Ast_iso_(ev.em), RECEBIDO_EM: recebidoEm, APARELHO: aparelho });
        } else {
          if (osId) tocadas[osId] = true;
          recusados.push({ idLocal: idLocal, tipo: tipo, osId: osId, definitivo: !!r.definitivo, motivo: r.motivo, corrigir: r.corrigir || '' });
          linhas.push({ ID_LOCAL: idLocal, PEDIDO_ID: pedidoId, OS_ID: osId, TIPO: tipo, TECNICO_ID: eu.id, RESULTADO: 'RECUSADO', MOTIVO: Ast_texto_(r.motivo, 300), EM_APARELHO: Ast_iso_(ev.em), RECEBIDO_EM: recebidoEm, APARELHO: aparelho });
        }
      });
      if (linhas.length) { SGO_DATA.insertMany(AST_ABAS.SYNC, linhas.map(function (l) { return Object.assign({ CRIADO_EM: recebidoEm }, l); })); delete AST_MEMO[AST_ABAS.SYNC]; }
      Object.keys(tocadas).forEach(function (id) { var o = Ast_porId_(AST_ABAS.OS, id); if (o && Ast_up_(o.SITUACAO) === 'DOC_PENDENTE') AstO_tentarEncerrar_(eu, id); });
    });
    if (enviosCliente.length) {
      // fora da trava: o encerramento (e o relatório) do lote acima já foram gravados; cada envio é idempotente pelo idLocal
      var linhasEnvio = [];
      enviosCliente.forEach(function (x) {
        Ast_memoLimpar_();
        var r = AstApp_enviarCliente_(eu, { osId: x.osId, dados: x.ev.dados || {}, idLocal: x.idLocal });
        tocadas[x.osId] = true;
        var linha = { ID_LOCAL: x.idLocal, PEDIDO_ID: pedidoId, OS_ID: x.osId, TIPO: 'ENVIAR_CLIENTE', TECNICO_ID: eu.id, EM_APARELHO: Ast_iso_(x.ev.em), RECEBIDO_EM: recebidoEm, APARELHO: aparelho };
        if (r.ok) { aceitos.push({ idLocal: x.idLocal, tipo: 'ENVIAR_CLIENTE', osId: x.osId, duplicado: false, nota: r.nota || '' }); linhasEnvio.push(Object.assign(linha, { RESULTADO: 'ACEITO', MOTIVO: Ast_texto_(r.nota, 300) })); }
        else { recusados.push({ idLocal: x.idLocal, tipo: 'ENVIAR_CLIENTE', osId: x.osId, definitivo: !!r.definitivo, motivo: r.motivo, corrigir: r.corrigir || '' }); linhasEnvio.push(Object.assign(linha, { RESULTADO: 'RECUSADO', MOTIVO: Ast_texto_(r.motivo, 300) })); }
      });
      try { SGO_DATA.insertMany(AST_ABAS.SYNC, linhasEnvio.map(function (l) { return Object.assign({ CRIADO_EM: recebidoEm }, l); })); delete AST_MEMO[AST_ABAS.SYNC]; } catch (eS) { console.error('Aplicativo do técnico, registro do envio: ' + ((eS && eS.message) || eS)); }
      Ast_memoLimpar_();
    }
    if (atvEventos.length) {
      var linhasAtv = [];
      atvEventos.forEach(function (x) {
        var r;
        try { r = AstApp_aplicarAtividade_(sessionId, eu, x.tipo, x.ev.dados || {}); }
        catch (eA) { r = { ok: false, definitivo: false, motivo: String((eA && eA.message) || eA).slice(0, 300), corrigir: 'O app tenta de novo sozinho.' }; }
        var linhaA = { ID_LOCAL: x.idLocal, PEDIDO_ID: pedidoId, OS_ID: '', TIPO: x.tipo, TECNICO_ID: eu.id, EM_APARELHO: Ast_iso_(x.ev.em), RECEBIDO_EM: recebidoEm, APARELHO: aparelho };
        if (r.ok) { aceitos.push({ idLocal: x.idLocal, tipo: x.tipo, osId: '', duplicado: false, nota: r.nota || '' }); linhasAtv.push(Object.assign(linhaA, { RESULTADO: 'ACEITO', MOTIVO: Ast_texto_(r.nota, 300) })); }
        else {
          recusados.push({ idLocal: x.idLocal, tipo: x.tipo, osId: '', definitivo: !!r.definitivo, motivo: r.motivo, corrigir: r.corrigir || '' });
          if (r.definitivo) linhasAtv.push(Object.assign(linhaA, { RESULTADO: 'RECUSADO', MOTIVO: Ast_texto_(r.motivo, 300) }));
        }
      });
      try { if (linhasAtv.length) { SGO_DATA.insertMany(AST_ABAS.SYNC, linhasAtv.map(function (l) { return Object.assign({ CRIADO_EM: recebidoEm }, l); })); delete AST_MEMO[AST_ABAS.SYNC]; } } catch (eS2) { console.error('Aplicativo do técnico, registro das atividades: ' + ((eS2 && eS2.message) || eS2)); }
    }
    return { pedidoId: pedidoId, recebidoEm: recebidoEm, aceitos: aceitos, recusados: recusados,
      atividades: atvEventos.length && typeof AstApp_atividades_ === 'function' ? AstApp_atividades_(eu) : undefined,
      os: Object.keys(tocadas).map(function (id) { return Ast_porId_(AST_ABAS.OS, id); }).filter(Boolean).filter(function (o) { return eu.gestao || Ast_s_(o.TECNICO_ID) === eu.id; }).map(function (o) { return AstApp_resumoOs_(o, eu); }) };
  });
}

/** Uma foto por chamada (reduzida no aparelho). Idempotente por idLocal. */
function Ast_appEnviarFoto(sessionId, payload) {
  return AstApp_resposta_(sessionId, function (eu) {
    var p = Object.assign({}, payload || {});
    p.osId = AstApp_idReal_('NOVA_OS', p.osId);
    var r = AstO_salvarFoto_(eu, p);
    var os = Ast_porId_(AST_ABAS.OS, r.os && r.os.ID) || r.os;
    return { idLocal: Ast_s_(p.idLocal), duplicado: !!r.duplicado, foto: r.foto, os: AstApp_resumoOs_(os, eu) };
  });
}

// ------------------------------------------------------------
// VERSÃO 2 (22/10/2026): LOCALIZAR OU CADASTRAR CLIENTE, UNIDADE E EQUIPAMENTO; O.S. ABERTA EM CAMPO
// ------------------------------------------------------------
var AST_APP_CAD = {
  CLIENTE: { aba: function () { return SGO_CFG.SHEETS.CAD_CLIENTES; }, nome: 'cliente' },
  UNIDADE: { aba: function () { return SGO_CFG.SHEETS.CAD_UNIDADES; }, nome: 'unidade' },
  EQUIPAMENTO: { aba: function () { return SGO_CFG.SHEETS.CAD_EQUIPAMENTOS; }, nome: 'equipamento' }
};
/** Colunas da marca "criado em campo" (nas três abas do cadastro; só acrescentadas, nunca mudam o que existe). */
var AST_APP_CAD_COLUNAS = ['ORIGEM_CADASTRO', 'CAMPO_CRIADO_POR_ID', 'CAMPO_CRIADO_POR_NOME', 'CAMPO_CRIADO_EM', 'CAMPO_CONFERIDO_EM', 'CAMPO_CONFERIDO_POR_NOME', 'CAMPO_CONFERIDO_TEXTO'];
var AST_APP_CAD_COLUNAS_OK = false;
function AstApp_garantirColunasCadastro_() {
  if (AST_APP_CAD_COLUNAS_OK || typeof CertCal_garantirColuna_ !== 'function') return;
  Object.keys(AST_APP_CAD).forEach(function (t) { AST_APP_CAD_COLUNAS.forEach(function (c) { CertCal_garantirColuna_(AST_APP_CAD[t].aba(), c); }); });
  CertCal_garantirColuna_(SGO_CFG.SHEETS.CAD_UNIDADES, 'LATITUDE'); CertCal_garantirColuna_(SGO_CFG.SHEETS.CAD_UNIDADES, 'LONGITUDE');
  AST_APP_CAD_COLUNAS_OK = true;
}
function AstApp_digitos_(v) { return Ast_s_(v).replace(/\D/g, ''); }
function AstApp_nomeChave_(v) { return Ast_semAcento_(v).replace(/[^A-Z0-9]+/g, ' ').trim(); }
function AstApp_cnpjValido_(d) { return d.length === 14 && (typeof SGO_UTILS === 'undefined' || typeof SGO_UTILS.isCnpj !== 'function' || SGO_UTILS.isCnpj(d)); }
function AstApp_serieVale_(s) { var x = AstO_normSerie_(s); return !!x && !/^(NP|NA|SN|SEMSERIE|SEMNUMERO|0+|X+)$/.test(x); }
function AstApp_ativo_(r) { return !!r && Ast_up_(r.STATUS || 'ATIVO') !== 'INATIVO'; }

/** Id real a partir de um id provisório do aparelho (idLocal que criou o registro) ou o próprio id. tipo: NOVA_OS, CLIENTE, UNIDADE, EQUIPAMENTO. */
function AstApp_idReal_(tipo, id) {
  id = Ast_s_(id);
  if (!id) return '';
  var aba = tipo === 'NOVA_OS' ? AST_ABAS.OS : AST_APP_CAD[tipo] ? AST_APP_CAD[tipo].aba() : '';
  if (aba && Ast_porId_(aba, id)) return id;
  var t = tipo === 'NOVA_OS' ? 'NOVA_OS' : 'CADASTRO_' + tipo;
  var l = Ast_ler_(AST_ABAS.SYNC);
  for (var i = l.length - 1; i >= 0; i--) if (Ast_up_(l[i].RESULTADO) === 'ACEITO' && Ast_up_(l[i].TIPO) === t && Ast_s_(l[i].ID_LOCAL) === id && Ast_s_(l[i].REF_ID)) return Ast_s_(l[i].REF_ID);
  return id;
}
/** Linha de ATEC_SYNC já aceita para este idLocal (idempotência dos cadastros e da O.S. aberta em campo). */
function AstApp_syncAceito_(tipo, idLocal) {
  return Ast_ler_(AST_ABAS.SYNC).filter(function (r) { return Ast_up_(r.RESULTADO) === 'ACEITO' && Ast_up_(r.TIPO) === tipo && Ast_s_(r.ID_LOCAL) === Ast_s_(idLocal); })[0] || null;
}
function AstApp_syncGravar_(eu, tipo, idLocal, refId, osId, nota, em, aparelho) {
  SGO_DATA.insert(AST_ABAS.SYNC, { ID_LOCAL: Ast_s_(idLocal), PEDIDO_ID: '', OS_ID: Ast_s_(osId), TIPO: tipo, TECNICO_ID: eu.id, RESULTADO: 'ACEITO', MOTIVO: Ast_texto_(nota, 300),
    EM_APARELHO: Ast_iso_(em), RECEBIDO_EM: Ast_agora_(), APARELHO: Ast_texto_(JSON.stringify(aparelho || {}), 300), REF_ID: Ast_s_(refId), CRIADO_EM: Ast_agora_() });
  delete AST_MEMO[AST_ABAS.SYNC];
}

function AstApp_clientePublico_(c) {
  return { id: Ast_s_(c.ID), nome: Ast_clienteNome_(c), razaoSocial: Ast_s_(c.RAZAO_SOCIAL), nomeFantasia: Ast_s_(c.NOME_FANTASIA), cnpj: Ast_s_(c.CNPJ), telefone: Ast_s_(c.TELEFONE), email: Ast_s_(c.EMAIL),
    endereco: Ast_s_(c.ENDERECO), ativo: AstApp_ativo_(c), criadoEmCampo: Ast_up_(c.ORIGEM_CADASTRO) === 'CAMPO' };
}
function AstApp_unidadePublica_(u) {
  return { id: Ast_s_(u.ID), clienteId: Ast_s_(u.CLIENTE_ID), nome: Ast_s_(u.NOME_UNIDADE), cnpj: Ast_s_(u.CNPJ_UNIDADE), endereco: Ast_s_(u.ENDERECO), cidade: Ast_s_(u.CIDADE), uf: Ast_s_(u.UF),
    responsavel: Ast_s_(u.RESPONSAVEL), telefone: Ast_s_(u.TELEFONE), enderecoTexto: Ast_endereco_(u, null), ativo: AstApp_ativo_(u), criadoEmCampo: Ast_up_(u.ORIGEM_CADASTRO) === 'CAMPO' };
}
function AstApp_equipPublico_(e, nomes) {
  nomes = nomes || {};
  return { id: Ast_s_(e.ID), clienteId: Ast_s_(e.CLIENTE_ID), unidadeId: Ast_s_(e.UNIDADE_ID), tipo: Ast_s_(e.TIPO), fabricante: Ast_s_(e.FABRICANTE), modelo: Ast_s_(e.MODELO), serie: Ast_s_(e.SERIE), tag: Ast_s_(e.TAG),
    setor: Ast_s_(e.SETOR), patrimonio: Ast_s_(e.PATRIMONIO), texto: Ast_equipTexto_(e), ativo: AstApp_ativo_(e), criadoEmCampo: Ast_up_(e.ORIGEM_CADASTRO) === 'CAMPO',
    clienteNome: Ast_s_(nomes.cliente), unidadeNome: Ast_s_(nomes.unidade) };
}

/**
 * Busca no cadastro único, sempre com limite (AST_APP_LIMITE_BUSCA): o aparelho nunca recebe a base inteira.
 *  - { termo }: clientes por nome, razão social ou CNPJ (4 dígitos ou mais) e equipamentos por TAG, série ou patrimônio;
 *  - { clienteId, termo? }: unidades do cliente (e equipamentos do cliente, quando não há unidadeId);
 *  - { clienteId, unidadeId, termo? }: equipamentos da unidade.
 */
function Ast_appBuscarCadastro(sessionId, payload) {
  return AstApp_resposta_(sessionId, function (eu) {
    var p = payload || {}, lim = AST_APP_LIMITE_BUSCA;
    var termo = AstApp_nomeChave_(p.termo), dig = AstApp_digitos_(p.termo), serieT = AstO_normSerie_(p.termo);
    var r = { limite: lim, termo: Ast_s_(p.termo), clientes: [], unidades: [], equipamentos: [], total: { clientes: 0, unidades: 0, equipamentos: 0 } };
    var clienteId = AstApp_idReal_('CLIENTE', p.clienteId), unidadeId = AstApp_idReal_('UNIDADE', p.unidadeId);
    var clientes = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES), unidades = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES);
    var bate = function (campos) { return !!termo && AstApp_nomeChave_(campos.join(' ')).indexOf(termo) >= 0; };
    if (clienteId) {
      var cli = clientes[clienteId];
      if (!cli) throw new Error('Não foi possível buscar: o cliente escolhido não está no cadastro. Busque de novo pelo nome ou pelo CNPJ');
      r.cliente = AstApp_clientePublico_(cli);
      var us = Ast_ler_(SGO_CFG.SHEETS.CAD_UNIDADES).filter(function (u) { return Ast_s_(u.CLIENTE_ID) === clienteId && AstApp_ativo_(u) && (!unidadeId ? (!termo || bate([u.NOME_UNIDADE, u.ENDERECO, u.CIDADE])) : Ast_s_(u.ID) === unidadeId); });
      r.total.unidades = us.length; r.unidades = us.slice(0, lim).map(AstApp_unidadePublica_);
      var es = Ast_ler_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).filter(function (e) {
        return Ast_s_(e.CLIENTE_ID) === clienteId && AstApp_ativo_(e) && (!unidadeId || Ast_s_(e.UNIDADE_ID) === unidadeId) && (!termo || bate([e.TIPO, e.MODELO, e.FABRICANTE, e.TAG, e.SERIE, e.SETOR, e.PATRIMONIO]));
      }).sort(function (a, b) { return Ast_equipTexto_(a).localeCompare(Ast_equipTexto_(b), 'pt-BR'); });
      r.total.equipamentos = es.length; r.equipamentos = es.slice(0, lim).map(function (e) { return AstApp_equipPublico_(e, { cliente: Ast_clienteNome_(cli), unidade: Ast_s_((unidades[Ast_s_(e.UNIDADE_ID)] || {}).NOME_UNIDADE) }); });
      return r;
    }
    if (termo.length < 2 && dig.length < 4) throw new Error('Não foi possível buscar: digite pelo menos 2 letras do nome (ou 4 números do CNPJ, da TAG ou da série)');
    var cs = Ast_ler_(SGO_CFG.SHEETS.CAD_CLIENTES).filter(function (c) {
      return AstApp_ativo_(c) && ((termo.length >= 2 && bate([c.NOME_FANTASIA, c.RAZAO_SOCIAL])) || (dig.length >= 4 && AstApp_digitos_(c.CNPJ).indexOf(dig) >= 0));
    }).sort(function (a, b) { return Ast_clienteNome_(a).localeCompare(Ast_clienteNome_(b), 'pt-BR'); });
    r.total.clientes = cs.length; r.clientes = cs.slice(0, lim).map(AstApp_clientePublico_);
    // unidade com o CNPJ procurado (filial cadastrada como unidade de outro cliente): aparece pelo cliente dela
    if (dig.length >= 4) {
      Ast_ler_(SGO_CFG.SHEETS.CAD_UNIDADES).forEach(function (u) {
        if (!AstApp_ativo_(u) || AstApp_digitos_(u.CNPJ_UNIDADE).indexOf(dig) < 0 || r.unidades.length >= lim) return;
        var c = clientes[Ast_s_(u.CLIENTE_ID)]; if (!c) return;
        var pu = AstApp_unidadePublica_(u); pu.clienteNome = Ast_clienteNome_(c); r.unidades.push(pu); r.total.unidades++;
      });
    }
    // equipamento pela TAG, série ou patrimônio (3 ou mais caracteres)
    if (serieT.length >= 3) {
      var es2 = Ast_ler_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).filter(function (e) {
        return AstApp_ativo_(e) && [e.TAG, e.SERIE, e.PATRIMONIO].some(function (v) { var n = AstO_normSerie_(v); return n && n.indexOf(serieT) >= 0; });
      });
      r.total.equipamentos = es2.length;
      r.equipamentos = es2.slice(0, lim).map(function (e) { return AstApp_equipPublico_(e, { cliente: Ast_clienteNome_(clientes[Ast_s_(e.CLIENTE_ID)]), unidade: Ast_s_((unidades[Ast_s_(e.UNIDADE_ID)] || {}).NOME_UNIDADE) }); });
    }
    return r;
  });
}

/** Consulta pública do CNPJ (mesma do cadastro de clientes); diz também se já está cadastrado como cliente ou unidade. */
function Ast_appConsultarCnpj(sessionId, payload) {
  return AstApp_resposta_(sessionId, function (eu) {
    var cnpj = AstApp_digitos_(payload && payload.cnpj);
    if (!AstApp_cnpjValido_(cnpj)) throw new Error('Não foi possível consultar: o CNPJ precisa ter 14 números válidos. Confira o número na nota ou no cartão CNPJ do cliente');
    var r = { cnpj: cnpj, consultado: false, jaCadastrado: AstApp_jaCadastrado_(cnpj) };
    if (typeof SGO_CNPJ_consultarDados_ !== 'function') { r.aviso = 'A consulta pública do CNPJ não está disponível neste servidor. Preencha o nome do cliente à mão.'; return r; }
    try {
      var d = SGO_CNPJ_consultarDados_(cnpj) || {};
      var end = [d.descricao_tipo_de_logradouro, d.logradouro, d.numero, d.complemento ? '- ' + d.complemento : '', d.bairro ? '- ' + d.bairro : ''].map(Ast_s_).filter(Boolean).join(' ').replace(/\s+/g, ' ');
      Object.assign(r, { consultado: true, razaoSocial: Ast_s_(d.razao_social), nomeFantasia: Ast_s_(d.nome_fantasia), endereco: end, cidade: Ast_s_(d.municipio), uf: Ast_s_(d.uf), cep: Ast_s_(d.cep),
        telefone: Ast_s_(d.ddd_telefone_1), email: Ast_s_(d.email).toLowerCase() });
    } catch (e) { r.aviso = String((e && e.message) || e).replace(/^Error:\s*/i, '').trim() || 'A consulta do CNPJ não respondeu. Preencha o nome do cliente à mão.'; }
    return r;
  });
}
/** CNPJ já no cadastro? Devolve { tipo: CLIENTE|UNIDADE, cliente, unidade } ou null. */
function AstApp_jaCadastrado_(cnpj) {
  if (!cnpj) return null;
  var c = Ast_ler_(SGO_CFG.SHEETS.CAD_CLIENTES).filter(function (x) { return AstApp_digitos_(x.CNPJ) === cnpj; }).sort(function (a, b) { return (AstApp_ativo_(b) ? 1 : 0) - (AstApp_ativo_(a) ? 1 : 0); })[0];
  if (c) return { tipo: 'CLIENTE', cliente: AstApp_clientePublico_(c), texto: 'cliente ' + Ast_clienteNome_(c) + (AstApp_ativo_(c) ? '' : ' (inativo)') };
  var u = Ast_ler_(SGO_CFG.SHEETS.CAD_UNIDADES).filter(function (x) { return AstApp_digitos_(x.CNPJ_UNIDADE) === cnpj; })[0];
  if (u) {
    var cu = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(u.CLIENTE_ID)];
    if (cu) return { tipo: 'UNIDADE', cliente: AstApp_clientePublico_(cu), unidade: AstApp_unidadePublica_(u), texto: 'unidade ' + Ast_s_(u.NOME_UNIDADE) + ' do cliente ' + Ast_clienteNome_(cu) };
  }
  return null;
}

/**
 * Cadastro feito em campo. p: { idLocal, tipo: CLIENTE|UNIDADE|EQUIPAMENTO, dados, em, aparelho }.
 * Nunca duplica: antes de criar confere CNPJ, nome, série e TAG; se já existe, devolve o existente com existente:true e avisa
 * ("já cadastrado como ..."). Cria pelas mesmas funções da tela Cadastros (SGO_CLIENTES, SGO_UNIDADES, SGO_EQUIPAMENTOS) e
 * marca "criado em campo por <técnico> em <data>" (a gestão confere depois; nada é bloqueado). Idempotente por idLocal.
 */
function Ast_appCadastrar(sessionId, payload) {
  return AstApp_resposta_(sessionId, function (eu) {
    var p = payload || {}, tipo = Ast_up_(p.tipo), def = AST_APP_CAD[tipo], idLocal = Ast_s_(p.idLocal), d = p.dados || {};
    if (!eu.tecnico && !eu.gestao) throw new Error('Não foi possível cadastrar: o cadastro em campo é do técnico (perfil Técnico ou área Técnica). Cadastre em Cadastros > Clientes no computador');
    if (!def) throw new Error('Não foi possível cadastrar: tipo desconhecido (' + tipo + '). Use CLIENTE, UNIDADE ou EQUIPAMENTO');
    if (!AST_RX_ID_LOCAL.test(idLocal)) throw new Error('Não foi possível cadastrar: o idLocal precisa ter de 8 a 80 letras, números ou _.:-');
    AstApp_garantirColunasCadastro_();
    return Ast_comTrava_(function () {
      var ja = AstApp_syncAceito_('CADASTRO_' + tipo, idLocal);
      if (ja) { var rj = AstApp_cadastroResposta_(tipo, Ast_s_(ja.REF_ID)); rj.duplicado = true; rj.existente = /existente/.test(Ast_s_(ja.MOTIVO)); rj.message = 'Este cadastro já tinha sido recebido.'; return rj; }
      var r = tipo === 'CLIENTE' ? AstApp_cadCliente_(eu, d) : tipo === 'UNIDADE' ? AstApp_cadUnidade_(eu, d) : AstApp_cadEquipamento_(eu, d);
      if (!r.existente) {
        Ast_atualizar_(def.aba(), r.id, { ORIGEM_CADASTRO: 'CAMPO', CAMPO_CRIADO_POR_ID: eu.id, CAMPO_CRIADO_POR_NOME: eu.nome, CAMPO_CRIADO_EM: Ast_agora_() });
        Ast_evento_('CADASTRO', r.id, 'CRIADO_EM_CAMPO', eu, def.nome.charAt(0).toUpperCase() + def.nome.slice(1) + ' criado em campo: ' + r.texto, { numero: r.texto.slice(0, 80), emAparelho: p.em, idLocal: idLocal });
        Ast_avisar_(Ast_gestoresTecnica_(), 'CADASTRO_CAMPO', 'Cadastro criado em campo: ' + r.texto, def.nome.charAt(0).toUpperCase() + def.nome.slice(1) + ' criado pelo técnico ' + eu.nome + ' no aplicativo. Confira em Assistência técnica > Chamados > "Cadastros criados em campo" (e em Cadastros > Vínculos se houver repetição).', r.id, { autorId: eu.id, evento: 'AT13' });
      }
      AstApp_syncGravar_(eu, 'CADASTRO_' + tipo, idLocal, r.id, '', r.existente ? 'existente: ' + r.texto : 'criado: ' + r.texto, p.em, p.aparelho);
      Ast_memoLimpar_();
      var resp = AstApp_cadastroResposta_(tipo, r.id);
      resp.duplicado = false; resp.existente = !!r.existente;
      resp.message = r.existente ? 'Já cadastrado como ' + r.texto + '. O aplicativo usa o cadastro existente; nada foi criado em dobro.' + (r.aviso ? ' ' + r.aviso : '')
        : def.nome.charAt(0).toUpperCase() + def.nome.slice(1) + ' cadastrado: ' + r.texto + '. Fica marcado "criado em campo" para a gestão conferir.' + (r.aviso ? ' ' + r.aviso : '');
      return resp;
    });
  });
}
function AstApp_cadastroResposta_(tipo, id) {
  var aba = AST_APP_CAD[tipo].aba(), reg = Ast_porId_(aba, id);
  if (!reg) throw new Error('Não foi possível concluir: o ' + AST_APP_CAD[tipo].nome + ' criado não foi encontrado no cadastro. Tente de novo');
  var r = { tipo: tipo, id: Ast_s_(reg.ID) };
  if (tipo === 'CLIENTE') {
    r.cliente = AstApp_clientePublico_(reg);
    r.unidades = Ast_ler_(SGO_CFG.SHEETS.CAD_UNIDADES).filter(function (u) { return Ast_s_(u.CLIENTE_ID) === r.id && AstApp_ativo_(u); }).slice(0, AST_APP_LIMITE_BUSCA).map(AstApp_unidadePublica_);
  } else if (tipo === 'UNIDADE') {
    r.unidade = AstApp_unidadePublica_(reg); r.clienteId = r.unidade.clienteId;
    var cu = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[r.clienteId]; if (cu) r.cliente = AstApp_clientePublico_(cu);
  } else {
    var cl = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(reg.CLIENTE_ID)], un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[Ast_s_(reg.UNIDADE_ID)];
    r.equipamento = AstApp_equipPublico_(reg, { cliente: Ast_clienteNome_(cl), unidade: Ast_s_(un && un.NOME_UNIDADE) }); r.clienteId = r.equipamento.clienteId; r.unidadeId = r.equipamento.unidadeId;
    if (cl) r.cliente = AstApp_clientePublico_(cl);
    if (un) r.unidade = AstApp_unidadePublica_(un);
  }
  return r;
}
/** Chama a função de criar da tela Cadastros quando existe (mesmas regras); sem ela, grava direto com os mesmos campos. */
function AstApp_criarPelaTela_(eu, modulo, aba, campos) {
  var m = null;
  try { m = modulo(); } catch (e) { m = null; }
  if (m && typeof m.criar === 'function') {
    var r = m.criar(eu.sessionId, campos);
    if (!r || !r.success) throw new Error('Não foi possível cadastrar: ' + Ast_s_(r && r.message).replace(/\.$/, '') + '. Corrija no aplicativo e tente de novo');
    var id = r.item && r.item.ID ? Ast_s_(r.item.ID) : '';
    delete AST_MEMO[aba]; delete AST_MEMO['__mapa_' + aba];
    if (!id) { // SGO_UNIDADES.criar não devolve o item: pega o mais novo com os mesmos dados
      var l = Ast_ler_(aba).filter(function (x) { return Object.keys(campos).every(function (k) { return k === 'CNPJ_UNIDADE' || k === 'TELEFONE' || Ast_up_(x[k]) === Ast_up_(campos[k]) || !Ast_s_(campos[k]); }); });
      id = l.length ? Ast_s_(l[l.length - 1].ID) : '';
    }
    if (!id) throw new Error('Não foi possível cadastrar: o registro foi gravado, mas não foi localizado em seguida. Busque de novo no aplicativo');
    return { id: id, aviso: /Atenção:/.test(Ast_s_(r.message)) ? Ast_s_(r.message).replace(/^.*Atenção:/, 'Atenção:') : '' };
  }
  var up = {}; Object.keys(campos).forEach(function (k) { up[k] = /^(EMAIL)$/.test(k) ? Ast_s_(campos[k]).toLowerCase() : /^(TELEFONE|CNPJ|CNPJ_UNIDADE)$/.test(k) ? AstApp_digitos_(campos[k]) : /_ID$/.test(k) ? Ast_s_(campos[k]) : Ast_up_(campos[k]); });
  up.STATUS = 'ATIVO';
  if (aba === SGO_CFG.SHEETS.CAD_EQUIPAMENTOS) up.QR_TOKEN = Utilities.getUuid();
  var novo = Ast_inserir_(aba, up);
  delete AST_MEMO['__mapa_' + aba];
  return { id: Ast_s_(novo.ID), aviso: '' };
}
function AstApp_cadCliente_(eu, d) {
  var nome = Ast_texto_(d.nome || d.nomeFantasia, 160), razao = Ast_texto_(d.razaoSocial, 200) || nome, cnpj = AstApp_digitos_(d.cnpj);
  if (nome.length < 3) throw new Error('Não foi possível cadastrar o cliente: escreva o nome do cliente (pelo menos 3 letras), como aparece na fachada ou no CNPJ');
  if (cnpj && !AstApp_cnpjValido_(cnpj)) throw new Error('Não foi possível cadastrar o cliente: o CNPJ ' + Ast_s_(d.cnpj) + ' não é válido (14 números com dígitos conferentes). Corrija ou deixe em branco para a gestão completar');
  var ja = AstApp_jaCadastrado_(cnpj);
  if (ja) return { existente: true, id: ja.cliente.id, texto: ja.texto, aviso: ja.tipo === 'UNIDADE' ? 'O CNPJ é da unidade ' + ja.unidade.nome + ': escolha essa unidade no próximo passo.' : (ja.cliente.ativo ? '' : 'O cliente está inativo no cadastro: peça à gestão para reativar em Cadastros > Clientes.') };
  var chave = AstApp_nomeChave_(nome), chaveR = AstApp_nomeChave_(razao);
  var porNome = Ast_ler_(SGO_CFG.SHEETS.CAD_CLIENTES).filter(function (c) { var a = AstApp_nomeChave_(c.NOME_FANTASIA), b = AstApp_nomeChave_(c.RAZAO_SOCIAL); return (a && (a === chave || a === chaveR)) || (b && (b === chave || b === chaveR)); })
    .sort(function (a, b) { return (AstApp_ativo_(b) ? 1 : 0) - (AstApp_ativo_(a) ? 1 : 0); })[0];
  if (porNome) return { existente: true, id: Ast_s_(porNome.ID), texto: 'cliente ' + Ast_clienteNome_(porNome) + (Ast_s_(porNome.CNPJ) ? ' (CNPJ ' + Ast_s_(porNome.CNPJ) + ')' : ''), aviso: AstApp_ativo_(porNome) ? '' : 'O cliente está inativo no cadastro: peça à gestão para reativar.' };
  var r = AstApp_criarPelaTela_(eu, function () { return SGO_CLIENTES; }, SGO_CFG.SHEETS.CAD_CLIENTES, { RAZAO_SOCIAL: razao, NOME_FANTASIA: nome, CNPJ: cnpj, ENDERECO: Ast_texto_(d.endereco, 300), CONTATO: Ast_texto_(d.contato, 120), EMAIL: Ast_texto_(d.email, 120), TELEFONE: AstApp_digitos_(d.telefone) });
  return { existente: false, id: r.id, texto: 'cliente ' + nome + (cnpj ? ' (CNPJ ' + cnpj + ')' : ''), aviso: r.aviso };
}
function AstApp_cadUnidade_(eu, d) {
  var clienteId = AstApp_idReal_('CLIENTE', d.clienteId), cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[clienteId];
  if (!cli) throw new Error('Não foi possível cadastrar a unidade: o cliente dela não foi encontrado. Volte ao passo 1 e escolha ou cadastre o cliente de novo');
  var nome = Ast_texto_(d.nome, 160), cnpj = AstApp_digitos_(d.cnpj);
  if (nome.length < 3) throw new Error('Não foi possível cadastrar a unidade: escreva o nome da unidade (pelo menos 3 letras), por exemplo "Unidade Centro" ou "Hospital Dia"');
  if (cnpj && !AstApp_cnpjValido_(cnpj)) throw new Error('Não foi possível cadastrar a unidade: o CNPJ ' + Ast_s_(d.cnpj) + ' não é válido. Corrija ou deixe em branco');
  if (cnpj) {
    var jaU = Ast_ler_(SGO_CFG.SHEETS.CAD_UNIDADES).filter(function (u) { return AstApp_digitos_(u.CNPJ_UNIDADE) === cnpj; })[0];
    if (jaU) { var cj = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(jaU.CLIENTE_ID)]; return { existente: true, id: Ast_s_(jaU.ID), texto: 'unidade ' + Ast_s_(jaU.NOME_UNIDADE) + ' do cliente ' + Ast_clienteNome_(cj), aviso: Ast_s_(jaU.CLIENTE_ID) !== clienteId ? 'Essa unidade pertence a outro cliente no cadastro; a O.S. fica com o cliente dela (regra "vale o original").' : '' }; }
  }
  var chave = AstApp_nomeChave_(nome);
  var jaN = Ast_ler_(SGO_CFG.SHEETS.CAD_UNIDADES).filter(function (u) { return Ast_s_(u.CLIENTE_ID) === clienteId && AstApp_nomeChave_(u.NOME_UNIDADE) === chave; }).sort(function (a, b) { return (AstApp_ativo_(b) ? 1 : 0) - (AstApp_ativo_(a) ? 1 : 0); })[0];
  if (jaN) return { existente: true, id: Ast_s_(jaN.ID), texto: 'unidade ' + Ast_s_(jaN.NOME_UNIDADE) + ' do cliente ' + Ast_clienteNome_(cli), aviso: AstApp_ativo_(jaN) ? '' : 'A unidade está inativa no cadastro: peça à gestão para reativar.' };
  var uf = Ast_up_(d.uf).slice(0, 2);
  var r = AstApp_criarPelaTela_(eu, function () { return SGO_UNIDADES; }, SGO_CFG.SHEETS.CAD_UNIDADES, { CLIENTE_ID: clienteId, NOME_UNIDADE: nome, CNPJ_UNIDADE: cnpj, ENDERECO: Ast_texto_(d.endereco, 300), CIDADE: Ast_texto_(d.cidade, 80), UF: uf.length === 2 ? uf : '', RESPONSAVEL: Ast_texto_(d.responsavel, 120), TELEFONE: AstApp_digitos_(d.telefone) });
  var co = AstO_coord_(d);
  if (co) Ast_atualizar_(SGO_CFG.SHEETS.CAD_UNIDADES, r.id, { LATITUDE: co.lat, LONGITUDE: co.lng });
  return { existente: false, id: r.id, texto: 'unidade ' + nome + ' do cliente ' + Ast_clienteNome_(cli), aviso: r.aviso };
}
function AstApp_cadEquipamento_(eu, d) {
  var clienteId = AstApp_idReal_('CLIENTE', d.clienteId), unidadeId = AstApp_idReal_('UNIDADE', d.unidadeId);
  var cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[clienteId], un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[unidadeId];
  if (!cli) throw new Error('Não foi possível cadastrar o equipamento: o cliente não foi encontrado. Volte ao passo 1 e escolha ou cadastre o cliente de novo');
  if (!un || Ast_s_(un.CLIENTE_ID) !== clienteId) throw new Error('Não foi possível cadastrar o equipamento: a unidade não é do cliente ' + Ast_clienteNome_(cli) + '. Volte ao passo 2 e escolha ou cadastre a unidade');
  var tipo = Ast_texto_(d.tipo, 80), serie = Ast_texto_(d.serie, 80), tag = Ast_texto_(d.tag, 60);
  if (tipo.length < 3) throw new Error('Não foi possível cadastrar o equipamento: escreva o tipo (pelo menos 3 letras), por exemplo "Autoclave" ou "Lavadora"');
  var todos = Ast_ler_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).filter(function (e) { return Ast_s_(e.CLIENTE_ID) === clienteId; });
  var ja = null;
  if (AstApp_serieVale_(serie)) ja = todos.filter(function (e) { return AstO_normSerie_(e.SERIE) === AstO_normSerie_(serie); }).sort(function (a, b) { return (AstApp_ativo_(b) ? 1 : 0) - (AstApp_ativo_(a) ? 1 : 0); })[0];
  if (!ja && AstO_normSerie_(tag)) ja = todos.filter(function (e) { return AstO_normSerie_(e.TAG) === AstO_normSerie_(tag); }).sort(function (a, b) { return (AstApp_ativo_(b) ? 1 : 0) - (AstApp_ativo_(a) ? 1 : 0); })[0];
  if (ja) {
    var unJa = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[Ast_s_(ja.UNIDADE_ID)];
    return { existente: true, id: Ast_s_(ja.ID), texto: 'equipamento ' + Ast_equipTexto_(ja) + ' (' + Ast_clienteNome_(cli) + (unJa ? ', ' + Ast_s_(unJa.NOME_UNIDADE) : '') + ')',
      aviso: (Ast_s_(ja.UNIDADE_ID) !== unidadeId ? 'No cadastro ele está em outra unidade; a O.S. fica com a unidade do cadastro (a gestão transfere em Cadastros > Vínculos se mudou de lugar). ' : '') + (AstApp_ativo_(ja) ? '' : 'O equipamento está inativo no cadastro: peça à gestão para reativar.') };
  }
  var r = AstApp_criarPelaTela_(eu, function () { return SGO_EQUIPAMENTOS; }, SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, { CLIENTE_ID: clienteId, UNIDADE_ID: unidadeId, TIPO: tipo, FABRICANTE: Ast_texto_(d.fabricante, 80), MODELO: Ast_texto_(d.modelo, 80), SERIE: serie, TAG: tag, SETOR: Ast_texto_(d.setor, 80), PATRIMONIO: Ast_texto_(d.patrimonio, 60) });
  var novo = Ast_porId_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, r.id);
  return { existente: false, id: r.id, texto: 'equipamento ' + Ast_equipTexto_(novo || { TIPO: tipo, SERIE: serie, TAG: tag }) + ' (' + Ast_clienteNome_(cli) + ', ' + Ast_s_(un.NOME_UNIDADE) + ')', aviso: r.aviso };
}

/**
 * O.S. aberta em campo, fora da agenda. p: { idLocal, clienteId, unidadeId, equipamentoId, tipoCodigo, sintoma, solicitante, contato, prioridade,
 *   parada, diagnostico, em, aparelho }. Ids podem ser provisórios (idLocal dos cadastros feitos sem internet).
 * Cria o chamado (canal PRESENCIAL) com a triagem "feita em campo" pelo próprio técnico e a O.S. já no nome dele, numa trava só;
 * a gestão é avisada (AT01). Idempotente por idLocal. Equipamento que já tem O.S. aberta com este técnico: devolve essa O.S.
 */
function Ast_appAbrirOS(sessionId, payload) {
  return AstApp_resposta_(sessionId, function (eu) {
    var p = payload || {}, idLocal = Ast_s_(p.idLocal);
    if (!eu.tecnico && !eu.gestao) throw new Error('Não foi possível abrir a O.S.: abrir atendimento em campo é do técnico (perfil Técnico ou área Técnica). No computador, abra o chamado em Assistência técnica > Abrir chamado');
    if (!AST_RX_ID_LOCAL.test(idLocal)) throw new Error('Não foi possível abrir a O.S.: o idLocal precisa ter de 8 a 80 letras, números ou _.:-');
    var tipo = Ast_tipo_(p.tipoCodigo);
    if (!tipo || !tipo.ativo) throw new Error('Não foi possível abrir a O.S.: escolha o tipo de serviço (define o checklist, as fotos e o que o relatório exige). Atualize o Meu dia se a lista estiver vazia');
    if (tipo.semVisita) throw new Error('Não foi possível abrir a O.S.: o tipo "' + tipo.nome + '" não tem visita; em campo, escolha um tipo de atendimento no cliente');
    return Ast_comTrava_(function () {
      var ja = AstApp_syncAceito_('NOVA_OS', idLocal);
      if (ja) { var osJa = Ast_porId_(AST_ABAS.OS, ja.REF_ID); if (osJa) return { duplicado: true, existente: /existente/.test(Ast_s_(ja.MOTIVO)), os: AstApp_os_(osJa, eu), chamado: { id: Ast_s_(osJa.CHAMADO_ID), numero: Ast_s_(osJa.CHAMADO_NUMERO) }, message: 'Esta O.S. já tinha sido recebida: ' + osJa.NUMERO + '.' }; }
      var clienteId = AstApp_idReal_('CLIENTE', p.clienteId), unidadeId = AstApp_idReal_('UNIDADE', p.unidadeId), equipamentoId = AstApp_idReal_('EQUIPAMENTO', p.equipamentoId);
      var eq = Ast_mapa_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS)[equipamentoId];
      if (!eq) throw new Error('Não foi possível abrir a O.S.: o equipamento não foi encontrado no cadastro. Volte ao passo 3 e escolha ou cadastre o equipamento');
      if (!clienteId || Ast_s_(eq.CLIENTE_ID) !== clienteId) clienteId = Ast_s_(eq.CLIENTE_ID);   // vale o cadastro do equipamento (regra "vale o original")
      if (!unidadeId || !Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[unidadeId] || Ast_s_(Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[unidadeId].CLIENTE_ID) !== clienteId) unidadeId = Ast_s_(eq.UNIDADE_ID);
      // mesmo equipamento com O.S. aberta no nome deste técnico: continua nela (nada em dobro)
      var aberta = Ast_ler_(AST_ABAS.OS).filter(function (o) { return Ast_s_(o.EQUIPAMENTO_ID) === equipamentoId && Ast_s_(o.TECNICO_ID) === eu.id && AST_OS_ABERTAS.indexOf(Ast_up_(o.SITUACAO)) >= 0; })[0];
      if (aberta) {
        AstApp_syncGravar_(eu, 'NOVA_OS', idLocal, aberta.ID, aberta.ID, 'existente: ' + aberta.NUMERO, p.em, p.aparelho);
        return { duplicado: false, existente: true, os: AstApp_os_(aberta, eu), chamado: { id: Ast_s_(aberta.CHAMADO_ID), numero: Ast_s_(aberta.CHAMADO_NUMERO) },
          message: 'Este equipamento já tem a O.S. ' + aberta.NUMERO + ' aberta com você (' + (AST_OS_SITUACOES[Ast_up_(aberta.SITUACAO)] || aberta.SITUACAO) + '). Continue nela; nada foi aberto em dobro.' };
      }
      var regras = Ast_regras_(), agora = Ast_agora_(), hora = AstO_horaCampo_(p.em);
      var r = AstC_abrir_(eu, { clienteId: clienteId, unidadeId: unidadeId, equipamentoId: equipamentoId, sintoma: p.sintoma, solicitante: p.solicitante, contato: p.contato, prioridade: Ast_up_(p.prioridade) || 'P3',
        parada: p.parada, canal: 'PRESENCIAL', tipoCodigo: tipo.codigo, confirmarDuplicado: true, origemRef: 'APP:' + idLocal }, { campo: true });
      var c = Ast_porId_(AST_ABAS.CHAMADOS, r.chamado.id);
      // triagem feita em campo pelo próprio técnico (sintomas confirmados no local), decisão "visita" e O.S. no nome dele
      var ck = { sintomas_confirmados: 'Confirmados no local pelo técnico ' + eu.nome + '.', risco_operar: Ast_up_(p.parada) === 'TOTAL' ? 'Equipamento parado.' : Ast_up_(p.parada) === 'PARCIAL' ? 'Equipamento com parada parcial.' : 'Equipamento em uso.',
        diagnostico_preliminar: Ast_texto_(p.diagnostico, 1000) || 'A confirmar no atendimento (aberto em campo).' };
      c = AstC_mudar_(eu, c, 'EM_TRIAGEM', { TRIAGEM_RESPONSAVEL_ID: eu.id, TRIAGEM_RESPONSAVEL_NOME: eu.nome, TRIAGEM_INICIO_EM: agora, TRIAGEM_JSON: JSON.stringify(ck) }, 'TRIAGEM_INICIADA', 'Triagem feita em campo por ' + eu.nome);
      c = AstC_mudar_(eu, c, 'PLANEJADO', { TRIAGEM_FIM_EM: agora, ACAO_DECIDIDA: 'PLANEJADO', TIPO_CODIGO: tipo.codigo }, 'DECISAO', 'Atendimento no local (aberto em campo, fora da agenda)');
      var cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[clienteId] || {}, un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[unidadeId] || null;
      var modelo = tipo.modeloCodigo ? Ast_modelo_(tipo.modeloCodigo) : null, dur = Number(regras.agenda.duracaoPadraoMin) || 90;
      var os = Ast_inserir_(AST_ABAS.OS, {
        NUMERO: Ast_proximoNumero_('OS', AST_ABAS.OS), CHAMADO_ID: c.ID, CHAMADO_NUMERO: c.NUMERO, SITUACAO: 'AGENDADA', TIPO_CODIGO: tipo.codigo, TIPO_NOME: tipo.nome,
        MODELO_CODIGO: modelo ? modelo.codigo : '', MODELO_VERSAO: modelo ? modelo.versao : '', PERGUNTAS_JSON: JSON.stringify(modelo ? modelo.perguntas : []),
        CLIENTE_ID: c.CLIENTE_ID, CLIENTE_NOME: c.CLIENTE_NOME, UNIDADE_ID: c.UNIDADE_ID, UNIDADE_NOME: c.UNIDADE_NOME, EQUIPAMENTO_ID: c.EQUIPAMENTO_ID, EQUIPAMENTO_TEXTO: c.EQUIPAMENTO_TEXTO,
        ENDERECO: Ast_endereco_(un, cli), SERIE_CADASTRO: Ast_s_(eq.SERIE), RESPOSTAS_JSON: '{}', QTD_FOTOS: 0, QTD_PECAS: 0, RELATORIO_VERSAO: 0,
        TECNICO_ID: eu.id, TECNICO_NOME: eu.nome, AGENDADO_PARA: hora, DURACAO_MIN: dur, PREPARO_JSON: JSON.stringify({ campo: true, observacoes: 'Aberta em campo pelo técnico, fora da agenda.' }), ORIENTACAO: '',
        ABERTA_EM_CAMPO: 'SIM', ULTIMA_SINC_EM: agora, ATUALIZADO_EM: agora
      });
      Ast_evento_('OS', os.ID, 'AGENDADA', eu, 'O.S. aberta em campo por ' + eu.nome + ' (fora da agenda) para o chamado ' + c.NUMERO, { numero: os.NUMERO, para: Ast_br_(hora) + ' · ' + eu.nome, emAparelho: p.em, idLocal: idLocal });
      c = AstC_mudar_(eu, c, 'AGENDADO', { TECNICO_ID: eu.id, TECNICO_NOME: eu.nome, AGENDADO_PARA: hora, DURACAO_MIN: dur, TIPO_CODIGO: tipo.codigo, OS_ID: os.ID, OS_NUMERO: os.NUMERO,
        PROXIMA_ACAO: 'Atendimento em campo com ' + eu.nome + ' (O.S. ' + os.NUMERO + ', aberta em campo)' }, 'AGENDADO', eu.nome + ' · ' + Ast_br_(hora) + ' · aberta em campo');
      var osId = os.ID;
      Ast_criarAtividade_({ osId: osId, responsavelId: eu.id, titulo: 'Atender ' + os.NUMERO + ' · ' + Ast_s_(c.CLIENTE_NOME), prazo: Ast_agora_(Ast_ms_(hora) + dur * 60000).slice(0, 16), prioridade: Ast_up_(c.PRIORIDADE) === 'P1' ? 'Urgente' : 'Alta',
        descricao: tipo.nome + ' · ' + Ast_s_(c.EQUIPAMENTO_TEXTO) + '\nProblema: ' + Ast_s_(c.SINTOMA).slice(0, 500) + '\nAberta em campo pelo técnico, fora da agenda.\n\nA atividade é concluída sozinha quando a O.S. fecha com a documentação completa.',
        clienteId: c.CLIENTE_ID, unidadeId: c.UNIDADE_ID, porQue: 'Chamado ' + c.NUMERO + ' (' + AST_PRIORIDADES[Ast_up_(c.PRIORIDADE)] + '), aberto em campo.', onde: Ast_endereco_(un, cli), como: 'Pelo aplicativo do técnico (Meu dia).' },
        function (idAtv) { Ast_atualizar_(AST_ABAS.OS, osId, { ATIVIDADE_ID: idAtv }); });
      AstApp_syncGravar_(eu, 'NOVA_OS', idLocal, os.ID, os.ID, 'criada: ' + os.NUMERO, p.em, p.aparelho);
      Ast_memoLimpar_();
      var osFinal = Ast_porId_(AST_ABAS.OS, os.ID);
      return { duplicado: false, existente: false, os: AstApp_os_(osFinal, eu), chamado: { id: c.ID, numero: c.NUMERO },
        message: 'O.S. ' + os.NUMERO + ' aberta em campo (chamado ' + c.NUMERO + '). A gestão foi avisada; siga com Cheguei, checklist, fotos, relato e assinatura.' };
    });
  });
}

/** Cadastros criados em campo ainda não conferidos pela gestão (para a tela e as pendências). */
function AstApp_cadastrosCampo_() {
  var saida = [], clientes = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES), unidades = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES);
  Object.keys(AST_APP_CAD).forEach(function (tipo) {
    var aba = AST_APP_CAD[tipo].aba();
    var l;
    try { l = Ast_ler_(aba); } catch (e) { l = []; }
    l.forEach(function (r) {
      if (Ast_up_(r.ORIGEM_CADASTRO) !== 'CAMPO' || Ast_s_(r.CAMPO_CONFERIDO_EM)) return;
      var texto = tipo === 'CLIENTE' ? Ast_clienteNome_(r) + (Ast_s_(r.CNPJ) ? ' · CNPJ ' + Ast_s_(r.CNPJ) : '')
        : tipo === 'UNIDADE' ? Ast_s_(r.NOME_UNIDADE) + ' · ' + Ast_clienteNome_(clientes[Ast_s_(r.CLIENTE_ID)])
        : Ast_equipTexto_(r) + ' · ' + Ast_clienteNome_(clientes[Ast_s_(r.CLIENTE_ID)]) + (unidades[Ast_s_(r.UNIDADE_ID)] ? ', ' + Ast_s_(unidades[Ast_s_(r.UNIDADE_ID)].NOME_UNIDADE) : '');
      saida.push({ tipo: tipo, tipoNome: AST_APP_CAD[tipo].nome, id: Ast_s_(r.ID), texto: texto, clienteId: tipo === 'CLIENTE' ? Ast_s_(r.ID) : Ast_s_(r.CLIENTE_ID),
        porNome: Ast_s_(r.CAMPO_CRIADO_POR_NOME), em: Ast_br_(r.CAMPO_CRIADO_EM), emIso: Ast_iso_(r.CAMPO_CRIADO_EM), ativo: AstApp_ativo_(r) });
    });
  });
  return saida.sort(function (a, b) { return String(a.emIso).localeCompare(String(b.emIso)); });
}
/** Gestão confere um cadastro criado em campo (a pendência sai). d: { tipo, id, texto } */
function AstApp_cadastroConferido_(eu, d) {
  Ast_exigir_(eu, 'GESTAO', 'marcar o cadastro como conferido');
  var def = AST_APP_CAD[Ast_up_(d && d.tipo)];
  if (!def) throw new Error('Não foi possível marcar: tipo de cadastro desconhecido. Atualize a tela');
  var r = Ast_porId_(def.aba(), d.id);
  if (!r) throw new Error('Não foi possível marcar: o ' + def.nome + ' não foi encontrado no cadastro. Atualize a tela');
  var t = Ast_texto_(d.texto, 500);
  if (t.length < 5) throw new Error('Não foi possível marcar: escreva o que foi conferido (pelo menos 5 letras), por exemplo "não é repetido; CNPJ conferido"');
  AstApp_garantirColunasCadastro_();
  Ast_atualizar_(def.aba(), r.ID, { CAMPO_CONFERIDO_EM: Ast_agora_(), CAMPO_CONFERIDO_POR_NOME: eu.nome, CAMPO_CONFERIDO_TEXTO: t });
  Ast_evento_('CADASTRO', r.ID, 'CONFERIDO', eu, t, { numero: def.nome });
  if (typeof SGO_Pendencias_invalidar_ === 'function') { try { SGO_Pendencias_invalidar_(); } catch (e) {} }
  return { cadastros: AstApp_cadastrosCampo_(), message: def.nome.charAt(0).toUpperCase() + def.nome.slice(1) + ' conferido. A pendência sai da Caixa de decisões.' };
}
