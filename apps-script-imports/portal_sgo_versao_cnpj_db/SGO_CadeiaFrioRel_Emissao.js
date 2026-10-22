/****************************************************
 * METROLABS — CADEIA DE FRIO — EMISSÃO DO RELATÓRIO DE ENSAIO (21/10/2026)
 *
 * Mesmo fluxo da Autoclave a vapor (SGO_AutoRel_CertificadoRelatorio.js):
 * 1. Rascunho (CadeiaFrioRel_apiRascunhoRelatorio): análise determinística e travas. Dado
 *    com problema devolve a lista do que corrigir e nada é redigido. Sem travas, a IA redige
 *    (se pedido); o texto é conferido e, se reprovar, vale o texto padrão determinístico.
 * 2. Emissão só com aprovação registrada do responsável técnico (SGO_QualifEmissao.js,
 *    módulo CADEIA_FRIO): o aprovador emite direto (com a confirmação); os demais enviam para
 *    aprovação, e o aprovador confere a prévia (minuta) e emite ou devolve com o motivo.
 *    Reemitir o mesmo número gera nova revisão; as anteriores ficam na pasta.
 * 3. HTML A4 + PDF na pasta do equipamento: Cadeia de Frio - Laudos/<CNPJ>/<TAG - tipo>/Qualificação.
 *
 * Fluxo cliente → unidade → equipamento: o documento só sai com o equipamento escolhido no
 * cadastro (SGO_QualifEquipamento.js); a identificação vem do cadastro e equipamento de outro
 * cliente é recusado. Relatório interno (dados reconstituídos) fica fora do vínculo e da aprovação.
 *
 * Modelo anterior (certificado com introdução e objetivo redigidos pela IA, sem aprovação):
 * preservado em SGO_CadeiaFrioRel_CertificadoRelatorio.js e desligado; volta só com
 * CADEIAFRIO_RELATORIO_MODELO = ANTERIOR em Chaves e senhas.
 ****************************************************/

function CadeiaFrioRel_propriedade_(chave) {
  try { return String(PropertiesService.getScriptProperties().getProperty(chave) || '').trim().toUpperCase(); } catch (e) { return ''; }
}

/** Planilha de dados: 'NOVO' (padrão, A4 paisagem) ou 'ANTERIOR' (Google Planilhas, preservada). */
function CadeiaFrioRel_planilhaModelo_() { return CadeiaFrioRel_propriedade_(CADEIAFRIO_QCFG.PROP_PLANILHA_MODELO) === 'ANTERIOR' ? 'ANTERIOR' : 'NOVO'; }

/** Relatório de ensaio: 'NOVO' (padrão, com aprovação) ou 'ANTERIOR' (certificado antigo, preservado). */
function CadeiaFrioRel_relatorioModelo_() { return CadeiaFrioRel_propriedade_(CADEIAFRIO_QCFG.PROP_RELATORIO_MODELO) === 'ANTERIOR' ? 'ANTERIOR' : 'NOVO'; }

function CadeiaFrioRel_ehAprovador_(sessao) { return SGO_QE_ehAprovador_(sessao, CADEIAFRIO_QCFG.EMISSAO.perfisAprovadores); }

function CadeiaFrioRel_exigirAprovador_(sessao) {
  if (!CadeiaFrioRel_ehAprovador_(sessao)) throw new Error('Somente o responsável técnico (perfis ' + CADEIAFRIO_QCFG.EMISSAO.perfisAprovadores.join(', ') + ') confere e aprova documentos.');
}

/* ============================================================
 * Pastas próprias do módulo
 * ============================================================ */

/**
 * Pasta do módulo. Chave própria; na primeira vez, adota a pasta antiga só se ela for mesmo da Cadeia de Frio
 * (a chave genérica antiga podia apontar para a pasta de outro módulo). Nada é movido nem apagado.
 */
function CadeiaFrioRel_pastaModulo_(propNova, propAntiga, nomePasta, idConfigurado) {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty(propNova) && !(String(idConfigurado || '').trim().length > 10)) {
    var antiga = props.getProperty(propAntiga);
    if (antiga) {
      try { var p = DriveApp.getFolderById(antiga); if (p.getName() === nomePasta) { props.setProperty(propNova, antiga); return p; } } catch (e) { /* segue */ }
    }
  }
  return SGO_DocSalvar_pastaPersistente_(propNova, nomePasta, idConfigurado);
}

function CadeiaFrioRel_pastaLaudos_() {
  return CadeiaFrioRel_pastaModulo_(CADEIAFRIO_QCFG.PROP_PASTA_LAUDOS, 'LAUDOS_FOLDER_ID', CADEIAFRIO_QCFG.NOME_PASTA_LAUDOS, CadeiaFrioRel_CFCFG.LAUDOS_FOLDER_ID);
}

function CadeiaFrioRel_pastaUploads_() {
  return CadeiaFrioRel_pastaModulo_(CADEIAFRIO_QCFG.PROP_PASTA_UPLOADS, 'UPLOAD_FOLDER_ID', CADEIAFRIO_QCFG.NOME_PASTA_UPLOADS, CadeiaFrioRel_CFCFG.UPLOAD_FOLDER_ID);
}

/* ============================================================
 * Vínculo com o cadastro (cliente → unidade → equipamento)
 * ============================================================ */

/** Exige o vínculo e troca a identificação digitada pela do cadastro (nomes de campo da cadeia de frio). */
function CadeiaFrioRel_aplicarVinculo_(sessionId, payload) {
  if (typeof SGO_QEQ_aplicarVinculoPayload_ !== 'function') return payload;
  var p = SGO_QEQ_aplicarVinculoPayload_(sessionId, payload);
  if (!p.equipamentoId) return p;
  return Object.assign({}, p, { tagEquipamento: p.tag, localizacao: p.setor, numeroSerie: p.numSerie });
}

function CadeiaFrioRel_apiPesquisarClientes(p, sessao) { return { ok: true, items: SGO_QEQ_pesquisarClientes_(sessao, p.termo) }; }
function CadeiaFrioRel_apiListarUnidades(p, sessao) { return { ok: true, items: SGO_QEQ_listarUnidades_(sessao, p.clienteId) }; }
function CadeiaFrioRel_apiListarEquipamentos(p, sessao) { return { ok: true, items: SGO_QEQ_listarEquipamentos_(sessao, p.clienteId, p.unidadeId, CADEIAFRIO_QCFG.TIPO_EQUIPAMENTO_RE) }; }
function CadeiaFrioRel_apiIdentificacao(p, sessao, sessionId) {
  var ident = SGO_QEQ_identificacao_(sessionId, p.clienteId, p.unidadeId, p.equipamentoId);
  var limpo = {};
  Object.keys(ident).forEach(function (k) { if (k.charAt(0) !== '_') limpo[k] = ident[k]; });
  return { ok: true, identificacao: limpo, tipoCompativel: CADEIAFRIO_QCFG.TIPO_EQUIPAMENTO_RE.test(SGO_QEQ_semAcento_(ident.tipo)) };
}

/* ============================================================
 * Travas, validação e montagem do documento
 * ============================================================ */

/** Trava de emissão: lança com a lista do que corrigir (o que aconteceu, por que, como corrigir). */
function CadeiaFrioRel_exigirSemTravas_(travas) {
  if (!travas || !travas.length) return;
  throw new Error('O documento não foi emitido porque os dados têm ' + travas.length + ' problema(s) a corrigir: ' +
    travas.map(function (t, i) { return (i + 1) + ') ' + t.oQue + ' Por quê: ' + t.porQue + ' Como corrigir: ' + t.comoCorrigir; }).join(' '));
}

/**
 * 21/10/2026: conferência antecipada (a tela chama enquanto o técnico preenche): roda a mesma análise e as
 * mesmas travas da emissão, sem gerar nada, e devolve cada problema com o campo da tela (campo) ou o estudo
 * (estudo), para aparecer ao lado do campo antes de "Gerar". Erro de leitura volta em "erro", sem lançar.
 */
function CadeiaFrioRel_apiConferirDados(payload) {
  payload = payload || {};
  var interno = {};
  try {
    var ctx = CadeiaFrioRel_qContexto_(payload, interno);
    var dados = (interno.resultado && interno.resultado.dadosCompletos) || [];
    return {
      ok: true,
      travas: (ctx.travas || []).map(function (t) { return { codigo: t.codigo, campo: t.campo || '', estudo: t.estudo || '', oQue: t.oQue, porQue: t.porQue, comoCorrigir: t.comoCorrigir }; }),
      periodo: CadeiaFrioRel_cfPeriodoImportadoTexto_(dados),
      abas: (dados._abas || []).map(function (a) { return { nome: a.nome, inicio: a.inicio, fim: a.fim, leituras: a.leituras }; })
    };
  } catch (e) {
    return { ok: true, travas: [], erro: String((e && e.message) || e) };
  }
}

function CadeiaFrioRel_assinaturaCtx_(ctx) { return SGO_DocSalvar_assinatura_(ctx); }

/** Rascunho: análise, travas e textos (IA conferida ou padrão). */
function CadeiaFrioRel_apiRascunhoRelatorio(payload, sessao) {
  payload = payload || {};
  var ctx = CadeiaFrioRel_qContexto_(payload);
  var base = { ok: true, contexto: ctx, assinaturaContexto: CadeiaFrioRel_assinaturaCtx_(ctx), podeAprovar: CadeiaFrioRel_ehAprovador_(sessao), travas: ctx.emissaoBloqueada ? ctx.travas : [], modeloRelatorio: 'NOVO' };
  if (ctx.emissaoBloqueada) {
    return Object.assign(base, { bloqueado: true, textos: { analisePorEstudo: {}, conclusaoGeral: '', conclusaoLeigo: '' },
      avisoIA: 'O documento não pode ser emitido enquanto os problemas dos dados listados abaixo não forem corrigidos. Nada foi redigido.' });
  }
  var textos = CadeiaFrioRel_qTextosPadrao_(ctx), origem = 'PADRAO', aviso = '';
  if (payload.redigirComIA !== false) {
    try {
      var t = CadeiaFrioRel_qRedigirIA_(ctx);
      var conf = CadeiaFrioRel_qConferirTextos_(ctx, t, true);
      if (conf.ok) { textos = t; origem = 'IA'; }
      else aviso = 'O texto redigido automaticamente não passou na conferência (' + conf.problemas.slice(0, 4).join('; ') + '). Foi usado o texto padrão, montado só com os resultados calculados; revise e complete se quiser.';
    } catch (e) {
      aviso = 'A redação automática não está disponível (' + String(e && e.message ? e.message : e).replace(/[.\s]+$/, '') + '). Foi usado o texto padrão, montado só com os resultados calculados; revise e complete se quiser.';
    }
  }
  return Object.assign(base, { bloqueado: false, textos: textos, origemTexto: origem, avisoIA: aviso });
}

/** Validações comuns antes de emitir, prever ou enviar. Devolve { contexto, textos, interno }. */
function CadeiaFrioRel_reValidar_(payload) {
  var interno = {};
  var ctx = CadeiaFrioRel_qContexto_(payload, interno);
  if (!payload.assinaturaContextoCertificado || payload.assinaturaContextoCertificado !== CadeiaFrioRel_assinaturaCtx_(ctx)) {
    throw new Error('Os dados ou os critérios mudaram desde o rascunho, ou o rascunho não foi gerado. Clique em "Gerar rascunho" de novo, revise os textos e emita.');
  }
  if (ctx.emissaoBloqueada) CadeiaFrioRel_exigirSemTravas_(ctx.travas);
  if (!ctx.identificacao.certificadoNumero) throw new Error('Informe o número do relatório na seção 6 antes de emitir.');
  var t = payload.textosCertificado || {};
  var textos = { conclusaoGeral: String(t.conclusaoGeral || '').trim(), conclusaoLeigo: String(t.conclusaoLeigo || '').trim(), analisePorEstudo: t.analisePorEstudo || {} };
  if (!textos.conclusaoGeral || !textos.conclusaoLeigo || ctx.estudos.some(function (e) { return !String(textos.analisePorEstudo[e.tipoEstudo] || '').trim(); })) {
    throw new Error('A interpretação está incompleta. Preencha a análise de cada estudo e as duas conclusões (ou gere o rascunho de novo para receber o texto padrão).');
  }
  var conf = CadeiaFrioRel_qConferirTextos_(ctx, textos, false);
  if (!conf.ok) throw new Error('Os textos revisados não podem ser emitidos: ' + conf.problemas.join('; ') + '. Corrija o texto (o resultado é o calculado pelo sistema) e emita de novo.');
  return { contexto: ctx, textos: textos, interno: interno };
}

/** Técnico executor, responsáveis técnicos da configuração e a aprovação registrada. */
function CadeiaFrioRel_reListaAssinaturas_(ctx, aprovacao) {
  var lista = [];
  var tecnico = (ctx.identificacao || {}).tecnicoExecutor;
  if (tecnico) lista.push({ papel: 'Executado por', nome: tecnico, cargo: 'Técnico executor do ensaio', registro: '' });
  (CadeiaFrioRel_CFCFG.ASSINATURAS_PADRAO || []).forEach(function (a) { lista.push(Object.assign({ papel: 'Responsável técnico' }, a)); });
  return lista;
}

function CadeiaFrioRel_reHtml_(ctx, interno, textos, fotos, aprovacao, minuta) {
  var tz = CadeiaFrioRel_CFCFG.TZ || 'America/Sao_Paulo';
  var geradoEm = '';
  try { geradoEm = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy'); } catch (e) {}
  return CadeiaFrioRel_reMontarHtml_({
    ctx: ctx, resultado: (interno && interno.resultado) || {}, textos: textos, fotos: (fotos || []).filter(function (f) { return f && f.base64; }).slice(0, 4),
    aprovacao: aprovacao || null, minuta: !!minuta, geradoEm: geradoEm, assinaturas: CadeiaFrioRel_reListaAssinaturas_(ctx, aprovacao)
  });
}

function CadeiaFrioRel_reCamposRegistro_(ctx, payload, sessao, modulo) {
  return {
    MODULO: modulo || CADEIAFRIO_QCFG.MODULO_ENSAIO, NUMERO: ctx.identificacao.certificadoNumero, REVISAO: ctx.identificacao.revisao,
    CLIENTE: ctx.identificacao.cliente, CNPJ: ctx.identificacao.cnpj, TAG: ctx.identificacao.tag, RESULTADO: ctx.statusConsolidado,
    HASH_CONTEXTO: CadeiaFrioRel_assinaturaCtx_(ctx), ENVIADO_POR: SGO_QE_nomeSessao_(sessao), ENVIADO_EM: SGO_QE_agora_(),
    JUSTIFICATIVA_ESCOPO: [ctx.grandezas.umidade.justificativa ? 'Umidade: ' + ctx.grandezas.umidade.justificativa : '', ctx.grandezas.aberturaPorta.justificativa && !ctx.grandezas.aberturaPorta.realizado ? 'Abertura de porta: ' + ctx.grandezas.aberturaPorta.justificativa : '',
      ctx.grandezas.quedaEnergia.justificativa && !ctx.grandezas.quedaEnergia.realizado ? 'Queda de energia: ' + ctx.grandezas.quedaEnergia.justificativa : '', ctx.justificativaSensores ? 'Sensores: ' + ctx.justificativaSensores : ''].filter(Boolean).join(' | '),
    CLIENTE_ID: String((payload && payload.clienteId) || ''), UNIDADE_ID: String((payload && payload.unidadeId) || ''), EQUIPAMENTO_ID: String((payload && payload.equipamentoId) || '')
  };
}

/** Emite (aprovação registrada), salva HTML + PDF na pasta do equipamento e grava a revisão. */
function CadeiaFrioRel_reEmitir_(payload, validado, sessao, idPendente) {
  var ctx = validado.contexto;
  var numero = ctx.identificacao.certificadoNumero;
  var simulado = !!payload.modoRelatorioSimulado;
  var modulo = CADEIAFRIO_QCFG.MODULO_ENSAIO;
  var revisao = simulado ? (parseInt(ctx.identificacao.revisao, 10) || 0) : SGO_QE_proximaRevisao_(modulo, numero, ctx.identificacao.revisao);
  ctx.identificacao.revisao = String(revisao);
  var aprovacao = simulado ? null : { nome: SGO_QE_nomeSessao_(sessao), login: String((sessao && sessao.usuario) || ''), perfil: String((sessao && sessao.perfil) || ''), em: SGO_QE_agora_() };
  var html = CadeiaFrioRel_reHtml_(ctx, validado.interno, validado.textos, payload.fotosCertificado || [], aprovacao, false);
  var payloadSalvar = Object.assign({}, payload, { certRevisao: String(revisao) });
  var r = SGO_DocSalvar_finalizarCertificado_(html, payloadSalvar, CadeiaFrioRel_pastaLaudos_, 'Relatório de ensaio Cadeia de Frio' + (revisao ? ' rev ' + revisao : ''), CadeiaFrioRel_CFCFG.TZ);
  if (!simulado) {
    var campos = {
      STATUS: 'EMITIDO', REVISAO: String(revisao), APROVADO_POR: aprovacao.nome, APROVADO_LOGIN: aprovacao.login, APROVADO_PERFIL: aprovacao.perfil,
      APROVADO_EM: aprovacao.em, PDF_ID: r.pdfId || '', HTML_ID: r.htmlId || '', RESULTADO: ctx.statusConsolidado
    };
    try { campos.RESUMO_JSON = JSON.stringify(CadeiaFrioRel_qResumoEnsaio_(ctx)); } catch (eR) { /* recalculado na consolidação */ }
    var id = idPendente;
    if (id) SGO_QE_atualizar_(id, campos);
    else id = SGO_QE_registrar_(Object.assign(CadeiaFrioRel_reCamposRegistro_(ctx, payload, sessao, modulo), campos));
    SGO_QE_marcarSubstituidas_(modulo, numero, id);
    r.emissaoId = id;
  }
  r.revisao = revisao;
  r.aprovadoPor = aprovacao ? aprovacao.nome : '';
  r.resultado = ctx.statusConsolidado;
  return r;
}

/** Emissão direta pelo responsável técnico (com a confirmação). Relatório interno: gera sem gravar nem aprovar. */
function CadeiaFrioRel_apiEmitirRelatorio(payload, sessao) {
  payload = payload || {};
  if (!payload.modoRelatorioSimulado && !CadeiaFrioRel_ehAprovador_(sessao)) {
    throw new Error('A emissão precisa da aprovação do responsável técnico. Use "Enviar para aprovação": o responsável técnico confere a prévia e emite. Perfis que aprovam: ' + CADEIAFRIO_QCFG.EMISSAO.perfisAprovadores.join(', ') + '.');
  }
  if (!payload.modoRelatorioSimulado && payload.confirmacaoRevisao !== true) {
    throw new Error('Marque "Conferi os dados, os critérios e os textos e aprovo a emissão" antes de emitir.');
  }
  return CadeiaFrioRel_reEmitir_(payload, CadeiaFrioRel_reValidar_(payload), sessao, '');
}

/** Prévia (minuta) do relatório, sem gravar: para o técnico conferir antes de enviar. */
function CadeiaFrioRel_apiPreviaRelatorio(payload, sessao) {
  payload = payload || {};
  var v = CadeiaFrioRel_reValidar_(payload);
  return { ok: true, html: SGO_DocA4_prepararSumario_(CadeiaFrioRel_reHtml_(v.contexto, v.interno, v.textos, payload.fotosCertificado || [], null, true)).html };
}

/** Fotos vão para arquivos próprios na pasta de envios (o registro guarda só o endereço). */
function CadeiaFrioRel_guardarFotos_(payload, numero) {
  return (Array.isArray(payload.fotosCertificado) ? payload.fotosCertificado : []).slice(0, 4).map(function (f, i) {
    if (!f || !f.base64) return null;
    var blob = Utilities.newBlob(Utilities.base64Decode(f.base64), f.mimeType || 'image/jpeg', 'Foto ' + (i + 1) + ' - ' + (numero || 'sem número') + '.jpg');
    var arq = CadeiaFrioRel_pastaUploads_().createFile(blob);
    return { fileId: arq.getId(), mimeType: f.mimeType || 'image/jpeg', legenda: f.legenda || '' };
  }).filter(Boolean);
}

function CadeiaFrioRel_apiEnviarParaAprovacao(payload, sessao) {
  payload = payload || {};
  if (payload.modoRelatorioSimulado) throw new Error('O relatório interno (dados reconstituídos) não passa por aprovação: ele não é entregue ao cliente.');
  var v = CadeiaFrioRel_reValidar_(payload);
  var guardado = Object.assign({}, payload, { fotosCertificado: [], fotosArquivos: CadeiaFrioRel_guardarFotos_(payload, v.contexto.identificacao.certificadoNumero) });
  var id = SGO_QE_registrar_(Object.assign(CadeiaFrioRel_reCamposRegistro_(v.contexto, payload, sessao), { STATUS: 'AGUARDANDO_APROVACAO', PAYLOAD_JSON: JSON.stringify(guardado) }));
  return { ok: true, id: id, html: SGO_DocA4_prepararSumario_(CadeiaFrioRel_reHtml_(v.contexto, v.interno, v.textos, payload.fotosCertificado || [], null, true)).html,
    mensagem: 'Enviado para aprovação do responsável técnico (registro ' + id + '). Ele confere a prévia em "7. Aguardando aprovação" e emite, ou devolve com o motivo.' };
}

function CadeiaFrioRel_apiListarAprovacoes(payload, sessao) {
  var aprovador = CadeiaFrioRel_ehAprovador_(sessao);
  var nome = SGO_QE_nomeSessao_(sessao);
  var lista = SGO_QE_listar_(CADEIAFRIO_QCFG.MODULO_ENSAIO).concat(SGO_QE_listar_(CADEIAFRIO_QCFG.MODULO_DADOS)).filter(function (r) {
    return r.STATUS === 'AGUARDANDO_APROVACAO' || (r.STATUS === 'DEVOLVIDO' && r.ENVIADO_POR === nome);
  }).filter(function (r) { return aprovador || r.ENVIADO_POR === nome; });
  return { ok: true, podeAprovar: aprovador, itens: lista.map(function (r) {
    return { id: r.ID, documento: r.MODULO === CADEIAFRIO_QCFG.MODULO_DADOS ? 'Planilha de dados' : 'Relatório de ensaio', status: r.STATUS, numero: r.NUMERO, cliente: r.CLIENTE, tag: r.TAG, resultado: r.RESULTADO, enviadoPor: r.ENVIADO_POR, enviadoEm: r.ENVIADO_EM, motivoDevolucao: r.DEVOLVIDO_MOTIVO };
  }) };
}

function CadeiaFrioRel_carregarPendente_(id) {
  var reg = SGO_QE_obter_(id);
  if (!reg || (reg.MODULO !== CADEIAFRIO_QCFG.MODULO_ENSAIO && reg.MODULO !== CADEIAFRIO_QCFG.MODULO_DADOS)) throw new Error('Registro de aprovação não encontrado. Atualize a lista.');
  if (reg.STATUS !== 'AGUARDANDO_APROVACAO') throw new Error('Este registro não está aguardando aprovação (situação: ' + reg.STATUS + '). Atualize a lista.');
  var payload = JSON.parse(reg.PAYLOAD_JSON || '{}');
  payload.fotosCertificado = (payload.fotosArquivos || []).map(function (f) {
    try { return { base64: Utilities.base64Encode(DriveApp.getFileById(f.fileId).getBlob().getBytes()), mimeType: f.mimeType, legenda: f.legenda }; } catch (e) { return null; }
  }).filter(Boolean);
  return { reg: reg, payload: payload };
}

function CadeiaFrioRel_apiPreverAprovacao(payload, sessao) {
  CadeiaFrioRel_exigirAprovador_(sessao);
  var p = CadeiaFrioRel_carregarPendente_(payload && payload.id);
  if (p.reg.MODULO === CADEIAFRIO_QCFG.MODULO_DADOS) return CadeiaFrioRel_pdPreverPendente_(p.reg, p.payload);
  var v = CadeiaFrioRel_reValidar_(p.payload);
  if (CadeiaFrioRel_assinaturaCtx_(v.contexto) !== p.reg.HASH_CONTEXTO) throw new Error('Os dados mudaram desde o envio para aprovação (por exemplo, o cadastro do registrador). Devolva ao técnico para gerar o rascunho de novo.');
  return { ok: true, html: SGO_DocA4_prepararSumario_(CadeiaFrioRel_reHtml_(v.contexto, v.interno, v.textos, p.payload.fotosCertificado, null, true)).html };
}

function CadeiaFrioRel_apiAprovarEmitir(payload, sessao) {
  CadeiaFrioRel_exigirAprovador_(sessao);
  payload = payload || {};
  if (payload.confirmacaoRevisao !== true) throw new Error('Marque "Conferi os dados, os critérios e os textos e aprovo a emissão" antes de aprovar.');
  var p = CadeiaFrioRel_carregarPendente_(payload.id);
  if (p.reg.MODULO === CADEIAFRIO_QCFG.MODULO_DADOS) return CadeiaFrioRel_pdAprovarPendente_(p.reg, p.payload, sessao);
  var v = CadeiaFrioRel_reValidar_(p.payload);
  if (CadeiaFrioRel_assinaturaCtx_(v.contexto) !== p.reg.HASH_CONTEXTO) throw new Error('Os dados mudaram desde o envio para aprovação. Devolva ao técnico para gerar o rascunho de novo.');
  return CadeiaFrioRel_reEmitir_(p.payload, v, sessao, p.reg.ID);
}

function CadeiaFrioRel_apiDevolverAprovacao(payload, sessao) {
  CadeiaFrioRel_exigirAprovador_(sessao);
  var motivo = String((payload && payload.motivo) || '').trim();
  if (motivo.length < 10) throw new Error('Escreva o motivo da devolução (ao menos 10 caracteres) para o técnico saber o que corrigir.');
  var reg = SGO_QE_obter_(payload.id);
  if (!reg || reg.STATUS !== 'AGUARDANDO_APROVACAO' || (reg.MODULO !== CADEIAFRIO_QCFG.MODULO_ENSAIO && reg.MODULO !== CADEIAFRIO_QCFG.MODULO_DADOS)) throw new Error('Este registro não está aguardando aprovação. Atualize a lista.');
  SGO_QE_atualizar_(reg.ID, { STATUS: 'DEVOLVIDO', DEVOLVIDO_MOTIVO: motivo, APROVADO_POR: SGO_QE_nomeSessao_(sessao), APROVADO_EM: SGO_QE_agora_() });
  return { ok: true, mensagem: 'Devolvido ao técnico com o motivo registrado.' };
}

/** Só o Administrador escolhe o modelo da planilha e do relatório (o anterior fica preservado e desligado). */
function CadeiaFrioRel_apiDefinirModelos(payload, sessao) {
  if (String((sessao && sessao.perfil) || '').toUpperCase() !== 'ADMIN') throw new Error('Somente o Administrador do sistema escolhe o modelo dos documentos.');
  var props = PropertiesService.getScriptProperties();
  if (payload && payload.planilha) props.setProperty(CADEIAFRIO_QCFG.PROP_PLANILHA_MODELO, String(payload.planilha).toUpperCase() === 'ANTERIOR' ? 'ANTERIOR' : 'NOVO');
  if (payload && payload.relatorio) props.setProperty(CADEIAFRIO_QCFG.PROP_RELATORIO_MODELO, String(payload.relatorio).toUpperCase() === 'ANTERIOR' ? 'ANTERIOR' : 'NOVO');
  return { ok: true, planilhaModelo: CadeiaFrioRel_planilhaModelo_(), relatorioModelo: CadeiaFrioRel_relatorioModelo_() };
}
