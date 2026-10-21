/****************************************************
 * ASSISTÊNCIA TÉCNICA — API DO APLICATIVO DO TÉCNICO (21/10/2026)
 *
 * Contrato combinado com a equipe do aplicativo (instalável, trabalha sem internet): docs/API_APP_TECNICO.md.
 * Funções globais (o servidor próprio chama por POST /api/run; no Google, google.script.run):
 *   Ast_appMeuDia(sessionId, { dia, dias, tecnicoId })
 *   Ast_appSincronizar(sessionId, { pedidoId, aparelho, eventos: [{ tipo, osId, em, dados, idLocal }] })
 *   Ast_appEnviarFoto(sessionId, { osId, idLocal, nome, base64, perguntaId, legenda, em })
 *   Ast_appOS(sessionId, { osId })
 * Trava por sessão e por técnico responsável. Idempotente por idLocal (ATEC_SYNC guarda cada evento aceito).
 * Nunca lança: devolve { ok:false, codigo, message } (SESSAO, SEM_ACESSO, DESLIGADA, ENTRADA, ERRO).
 ****************************************************/

var AST_APP_VERSAO = 1;
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
  var tipo = Ast_tipo_(os.TIPO_CODIGO) || { codigo: Ast_up_(os.TIPO_CODIGO), nome: Ast_s_(os.TIPO_NOME), exige: { relato: true, assinatura: true, fotosMin: 0, qrOuSerie: false, checklist: false } };
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
    tipo: { codigo: tipo.codigo, nome: tipo.nome, exige: { relato: !!tipo.exige.relato, assinatura: !!tipo.exige.assinatura, fotosMin: Number(tipo.exige.fotosMin) || 0, qrOuSerie: !!tipo.exige.qrOuSerie, checklist: !!tipo.exige.checklist } },
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
    relatorioUrl: Ast_s_(os.RELATORIO_PDF_URL)
  };
}

function AstApp_resumoOs_(os) {
  var s = Ast_up_(os.SITUACAO);
  return { id: Ast_s_(os.ID), numero: Ast_s_(os.NUMERO), situacao: s, situacaoNome: AST_OS_SITUACOES[s] || s, encerrada: s === 'ENCERRADA',
    pendencias: AST_OS_ABERTAS.indexOf(s) >= 0 ? AstO_faltas_(os).map(function (x) { return 'falta ' + x; }) : [], relatorioUrl: Ast_s_(os.RELATORIO_PDF_URL) };
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
    var ordem = 0;
    return { versaoContrato: AST_APP_VERSAO, geradoEm: Ast_agora_(), dia: dia, ate: ate, tecnico: { id: tec.id, nome: tec.nome }, assistenciaLigada: Ast_ligada_(),
      regras: { fotoMaxBytes: Number(Ast_regras_().fotos.maxBytes) || 2000000, fotoRecomendadaBytes: 300000, localizacaoSo: ['CHEGUEI', 'CONCLUI'],
        motivosSemAssinatura: Object.keys(AST_MOTIVOS_SEM_ASSINATURA).map(function (k) { return { codigo: k, nome: AST_MOTIVOS_SEM_ASSINATURA[k] }; }) },
      os: lista.map(function (o) { var x = AstApp_os_(o, eu); x.ordem = ++ordem; return x; }) };
  });
}

function Ast_appOS(sessionId, payload) {
  return AstApp_resposta_(sessionId, function (eu) {
    var os = AstO_obter_(eu, payload && payload.osId, 'abrir a O.S.');
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
    var aceitos = [], recusados = [], tocadas = {}, linhas = [];
    var ordenados = eventos.map(function (e, i) { return { e: e || {}, i: i, ms: Ast_ms_((e || {}).em) }; })
      .sort(function (a, b) { return ((a.ms === null ? Infinity : a.ms) - (b.ms === null ? Infinity : b.ms)) || (a.i - b.i); });
    Ast_comTrava_(function () {
      var vistos = {};
      Ast_ler_(AST_ABAS.SYNC).forEach(function (r) { if (Ast_up_(r.RESULTADO) === 'ACEITO') vistos[Ast_s_(r.ID_LOCAL)] = true; });
      var ctx = {};
      ordenados.forEach(function (x) {
        var ev = x.e, idLocal = Ast_s_(ev.idLocal), tipo = Ast_up_(ev.tipo), osId = Ast_s_(ev.osId);
        if (!AST_RX_ID_LOCAL.test(idLocal)) { recusados.push({ idLocal: idLocal, tipo: tipo, osId: osId, definitivo: true, motivo: 'idLocal inválido (8 a 80 letras, números ou _.:-)', corrigir: 'Atualize o aplicativo.' }); return; }
        if (vistos[idLocal]) { aceitos.push({ idLocal: idLocal, tipo: tipo, osId: osId, duplicado: true }); return; }
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
    return { pedidoId: pedidoId, recebidoEm: recebidoEm, aceitos: aceitos, recusados: recusados,
      os: Object.keys(tocadas).map(function (id) { return Ast_porId_(AST_ABAS.OS, id); }).filter(Boolean).filter(function (o) { return eu.gestao || Ast_s_(o.TECNICO_ID) === eu.id; }).map(AstApp_resumoOs_) };
  });
}

/** Uma foto por chamada (reduzida no aparelho). Idempotente por idLocal. */
function Ast_appEnviarFoto(sessionId, payload) {
  return AstApp_resposta_(sessionId, function (eu) {
    var p = payload || {};
    var r = AstO_salvarFoto_(eu, p);
    var os = Ast_porId_(AST_ABAS.OS, r.os && r.os.ID) || r.os;
    return { idLocal: Ast_s_(p.idLocal), duplicado: !!r.duplicado, foto: r.foto, os: AstApp_resumoOs_(os) };
  });
}
