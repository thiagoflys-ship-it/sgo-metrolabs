/****************************************************
 * ASSISTÊNCIA TÉCNICA — RONDA DE ENGENHARIA CLÍNICA (03/11/2026)
 *
 * Pedido do dono ("pode seguir com os padrões"): a ronda é uma O.S. do tipo RONDA_EC (grupo RONDA), sem chamado, agendada
 * pela gestão (avulsa) ou gerada sozinha por um contrato de ronda recorrente do cliente e da unidade (semanal, quinzenal,
 * mensal), com responsável e janela. Nada de sistema paralelo: a ronda usa a mesma O.S., a mesma fila do SGO+ Campo
 * (evento RONDA no Ast_appSincronizar), as mesmas fotos (ATEC_FOTOS, PERGUNTA_ID "ronda:<chave>"), as mesmas duas
 * assinaturas, o mesmo encerramento (AstO_tentarEncerrar_), o mesmo envio ao cliente e o mesmo Arquivo de documentos.
 *
 * Escopo: setores da unidade (campo SETOR dos equipamentos + ATEC_SETORES) e os equipamentos ativos de cada setor; o escopo
 * fica congelado no "Cheguei" (RONDA_ESCOPO_JSON). Em campo, cada equipamento recebe uma situação (AST_RONDA_SITUACOES);
 * observação e defeito exigem descrição e foto; "não verificado" exige o motivo; autoclave, lavadora, câmara fria e seladora
 * têm perguntas fixas (modelos MOD_RONDA_*). Equipamento fora do cadastro é cadastrado ali (Ast_appCadastrar) e entra como
 * item "n:<idLocal>".
 *
 * Depois de encerrada (AstRd_posConclusao_, idempotente por RONDA_POS_EM e pelo ORIGEM_REF do chamado):
 *  - equipamento "Fora de uso ou com defeito" abre um chamado (canal RONDA), um por equipamento, P2 se parado e P3 se funciona
 *    com defeito ou limitação (configurável, AstRd_cfg_); se o equipamento já tem
 *    chamado aberto, o achado vai para o histórico dele (nada em dobro);
 *  - calibração ou qualificação vencida (cadastro de documentos) ou etiqueta inválida vira UMA sugestão de oportunidade no
 *    Comercial (COM_IA_SUGESTOES, TIPO RONDA_OPORTUNIDADE) que o Comercial ou a Diretoria aceita (cria a oportunidade) ou descarta;
 *  - aviso à gestão da área Técnica; setor novo vira cadastro da unidade.
 * Relatório A4 com capa em duas versões: a do cliente (RELATORIO_*, portal, e-mail, Arquivo de documentos) e a interna
 * (RONDA_INTERNO_*, nunca abre para login de cliente). Sem preço por ronda: a ronda está incluída no contrato do cliente (decisão do dono).
 ****************************************************/

var AST_RONDA_TIPO = 'RONDA_EC';
var AST_RONDA_SITUACOES = { FUNCIONANDO: 'Em funcionamento', OBSERVACAO: 'Com observação', FORA_USO: 'Fora de uso ou com defeito', NAO_LOCALIZADO: 'Não localizado', NAO_VERIFICADO: 'Não verificado' };
var AST_RONDA_PROBLEMAS = ['OBSERVACAO', 'FORA_USO'];
var AST_RONDA_PERIODOS = { SEMANAL: { nome: 'Semanal', dias: 7 }, QUINZENAL: { nome: 'Quinzenal', dias: 14 }, MENSAL: { nome: 'Mensal', meses: 1 } };
var AST_RONDA_CATEGORIAS = {
  AUTOCLAVE: { nome: 'Autoclave', modelo: 'MOD_RONDA_AUTOCLAVE', rx: /AUTOCLAV|ESTERILIZADOR A VAPOR/ },
  LAVADORA: { nome: 'Lavadora ultrassônica ou termodesinfectora', modelo: 'MOD_RONDA_LAVADORA', rx: /LAVADORA|ULTRASS|TERMODESINF|TERMO DESINF/ },
  FRIO: { nome: 'Câmara fria ou refrigerador', modelo: 'MOD_RONDA_FRIO', rx: /CAMARA FRIA|CAMARA DE CONSERV|CAMARA REFRIGER|CAMARA DE VACIN|CAMARA FRIGORIF|REFRIGERADOR|GELADEIRA|FREEZER|CONSERVADORA/ },
  SELADORA: { nome: 'Seladora', modelo: 'MOD_RONDA_SELADORA', rx: /SELADORA/ }
};
var AST_RONDA_SEM_SETOR = 'Sem setor informado';
var AST_RONDA_DESC_MIN = 10, AST_RONDA_MOTIVO_MIN = 5;
var AST_RONDA_HORIZONTE_DIAS = 35;
var AST_RONDA_JANELA_PADRAO = 2;
var AST_RONDA_PAUSA_PREFIXO = 'Recorrência pausada';
/** Revisão de 03/11/2026: a ronda cancelada pela mudança de data, hora ou periodicidade do contrato também volta a nascer (com a data nova). */
var AST_RONDA_ALTERADO_PREFIXO = 'Contrato de ronda alterado';
function AstRd_canceladaParaGerar_(o) { var m = Ast_s_(o.CANCELADA_MOTIVO); return m.indexOf(AST_RONDA_PAUSA_PREFIXO) === 0 || m.indexOf(AST_RONDA_ALTERADO_PREFIXO) === 0; }
/** Decisão do dono a confirmar: foto da ronda entra liberada no relatório do cliente (achado documentado); a gestão recolhe na ficha. */
var AST_RONDA_FOTO_LIBERADA_PADRAO = true;
/** Decisão do dono (03/11/2026): não há preço por ronda; a ronda está incluída no contrato do cliente (nada de cobrança aqui). */
var AST_RONDA_INCLUIDA = 'Ronda incluída no contrato';
/** Decisão do dono (03/11/2026): equipamento fora de uso vira chamado P2 quando está parado e P3 quando funciona com defeito ou limitação (configurável na tela Rondas). */
var AST_RONDA_PARADAS = { TOTAL: 'Parado: não pode ser usado', PARCIAL: 'Funciona com defeito ou limitação' };
var AST_RONDA_CFG_PADRAO = { prioridadeParado: 'P2', prioridadeLimitado: 'P3' };
function AstRd_cfg_() { var c = Ast_cfgChave_('RONDA_CFG', null) || {}, r = Ast_copia_(AST_RONDA_CFG_PADRAO); if (AST_PRIORIDADES[Ast_up_(c.prioridadeParado)]) r.prioridadeParado = Ast_up_(c.prioridadeParado); if (AST_PRIORIDADES[Ast_up_(c.prioridadeLimitado)]) r.prioridadeLimitado = Ast_up_(c.prioridadeLimitado); return r; }
/** Gestão: prioridade do chamado automático da ronda. d: { prioridadeParado, prioridadeLimitado, motivo } */
function AstRd_salvarCfg_(eu, d) {
  Ast_exigir_(eu, 'GESTAO', 'mudar a prioridade do chamado da ronda');
  d = d || {};
  var pp = Ast_up_(d.prioridadeParado), pl = Ast_up_(d.prioridadeLimitado), motivo = Ast_texto_(d.motivo, 300);
  if (!AST_PRIORIDADES[pp] || !AST_PRIORIDADES[pl]) throw new Error('Não foi possível salvar: escolha a prioridade das duas situações (P1 a P4)');
  if (motivo.length < 10) throw new Error('Não foi possível salvar: escreva o motivo da mudança (pelo menos 10 letras). Ele fica no histórico da configuração');
  Ast_comTrava_(function () { Ast_cfgGravar_('RONDA_CFG', { prioridadeParado: pp, prioridadeLimitado: pl }, eu, motivo); Ast_memoTirar_(AST_ABAS.CONFIG); });
  return { cfg: AstRd_cfg_(), message: 'Prioridade do chamado da ronda salva: parado ' + pp + ', funciona com limitação ' + pl + '. Vale para as rondas encerradas daqui em diante.' };
}

function AstRd_letras_(t) { return Ast_s_(t).replace(/[^A-Za-zÀ-ÿ]/g, '').length; }
function AstRd_ehTipo_(tipo) { return !!(tipo && tipo.ronda); }
function AstRd_ehRonda_(os) { return !!os && AstRd_ehTipo_(Ast_tipo_(os.TIPO_CODIGO)); }
function AstRd_chaveSetor_(nome) { return Ast_semAcento_(nome).replace(/[^A-Z0-9]+/g, ' ').trim() || 'SEM SETOR'; }
function AstRd_categoria_(tipo, modelo) {
  var t = Ast_semAcento_(Ast_s_(tipo) + ' ' + Ast_s_(modelo));
  var ks = Object.keys(AST_RONDA_CATEGORIAS);
  for (var i = 0; i < ks.length; i++) if (AST_RONDA_CATEGORIAS[ks[i]].rx.test(t)) return ks[i];
  return '';
}
/** Perguntas fixas por categoria: o modelo MOD_RONDA_* gravado (a Qualidade edita); sem ele, o padrão. */
function AstRd_perguntas_() {
  if (AST_MEMO.__rondaPerg) return AST_MEMO.__rondaPerg;
  var r = {};
  Object.keys(AST_RONDA_CATEGORIAS).forEach(function (k) {
    var cod = AST_RONDA_CATEGORIAS[k].modelo, m = null;
    try { m = Ast_modelo_(cod); } catch (e) { m = null; }
    if (m && m.ativo && m.perguntas.length) { r[k] = m.perguntas; return; }
    var p = AST_MODELOS_PADRAO.filter(function (x) { return x.codigo === cod; })[0];
    r[k] = p ? Ast_normPerguntas_(p.perguntas) : [];
  });
  AST_MEMO.__rondaPerg = r;
  return r;
}
function AstRd_registro_(os) {
  var r = Ast_json_(os && os.RONDA_JSON, null);
  r = r && typeof r === 'object' ? r : {};
  return { versao: 1, filtroSetores: Array.isArray(r.filtroSetores) ? r.filtroSetores : [], itens: r.itens && typeof r.itens === 'object' ? r.itens : {},
    setores: r.setores && typeof r.setores === 'object' ? r.setores : {}, orientacoes: Ast_s_(r.orientacoes), pedidosCliente: Ast_s_(r.pedidosCliente) };
}
function AstRd_pos_(os) { var p = Ast_json_(os && os.RONDA_POS_JSON, null); return p && typeof p === 'object' ? p : { chamados: {}, sugestaoId: '', setores: [] }; }

// ------------------------------------------------------------
// SETORES E ESCOPO
// ------------------------------------------------------------
function AstRd_setoresCadastrados_(unidadeId) {
  return Ast_ler_(AST_ABAS.SETORES).filter(function (s) { return Ast_s_(s.UNIDADE_ID) === Ast_s_(unidadeId) && Ast_up_(s.ATIVO || 'SIM') !== 'NAO'; })
    .sort(function (a, b) { return (Number(a.ORDEM) || 99) - (Number(b.ORDEM) || 99) || Ast_s_(a.NOME).localeCompare(Ast_s_(b.NOME), 'pt-BR'); });
}
/** Setores da unidade: os cadastrados (na ordem) e os que aparecem no campo SETOR dos equipamentos ativos. */
function AstRd_setoresUnidade_(unidadeId) {
  var mapa = {}, l = [];
  var add = function (nome, cad) { var k = AstRd_chaveSetor_(nome); if (!mapa[k]) { mapa[k] = { nome: Ast_s_(nome), chave: k, cadastrado: !!cad, equipamentos: 0 }; l.push(mapa[k]); } else if (cad) mapa[k].cadastrado = true; return mapa[k]; };
  AstRd_setoresCadastrados_(unidadeId).forEach(function (s) { add(s.NOME, true); });
  Ast_ler_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).forEach(function (e) {
    if (Ast_s_(e.UNIDADE_ID) !== Ast_s_(unidadeId) || Ast_up_(e.STATUS || 'ATIVO') === 'INATIVO') return;
    add(Ast_vazioCad_(e.SETOR) ? AST_RONDA_SEM_SETOR : Ast_s_(e.SETOR), false).equipamentos++;
  });
  return l;
}
/** Data AAAA-MM-DD de um valor de documento (ISO, dd/mm/aaaa). */
function AstRd_dia_(v) { var ms = Ast_ms_(v); return ms === null ? '' : Ast_agora_(ms).slice(0, 10); }
/**
 * Validade de calibração e qualificação por equipamento (Arquivo de documentos e certificados de calibração). Revisão de 03/11/2026:
 * só os equipamentos da unidade e guardada na memória do pedido (o escopo é montado várias vezes na mesma chamada).
 */
function AstRd_validades_(clienteId, unidadeId) {
  var chaveMemo = '__rdVal_' + Ast_s_(clienteId) + '|' + Ast_s_(unidadeId);
  if (AST_MEMO[chaveMemo]) return AST_MEMO[chaveMemo];
  var daUnidade = {};
  Ast_ler_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).forEach(function (e) { if (Ast_s_(e.UNIDADE_ID) === Ast_s_(unidadeId) && Ast_s_(e.CLIENTE_ID) === Ast_s_(clienteId)) daUnidade[Ast_s_(e.ID)] = true; });
  var r = {}, hoje = Ast_hoje_();
  var por = function (eq, cat, ate, origem) {
    if (!eq || !ate || !daUnidade[eq]) return;
    r[eq] = r[eq] || {};
    if (!r[eq][cat] || ate > r[eq][cat].ate) r[eq][cat] = { ate: ate, vencida: ate < hoje, origem: origem };
  };
  try {
    Ast_ler_(SGO_CFG.SHEETS.DOC_DOCUMENTOS || 'DOC_DOCUMENTOS').forEach(function (d) {
      if (Ast_s_(clienteId) && Ast_s_(d.CLIENTE_ID) !== Ast_s_(clienteId)) return;
      if (Ast_up_(d.STATUS || 'ATIVO') !== 'ATIVO') return;
      var t = Ast_semAcento_(d.TIPO_DOCUMENTO), cat = /CALIBRA/.test(t) ? 'cal' : /QUALIFICA/.test(t) ? 'qual' : '';
      if (cat) por(Ast_s_(d.EQUIPAMENTO_ID), cat, AstRd_dia_(d.DATA_VENCIMENTO), Ast_s_(d.NOME_ARQUIVO));
    });
  } catch (e) {}
  try {
    if (SGO_CFG.SHEETS.CERT_CALIBRACAO && typeof Pend_proximaCalibracao_ === 'function') {
      Ast_ler_(SGO_CFG.SHEETS.CERT_CALIBRACAO).forEach(function (c) {
        if (Ast_s_(c.STATUS) && Ast_up_(c.STATUS) !== 'ATIVO') return;
        por(Ast_s_(c.EQUIPAMENTO_ID), 'cal', AstRd_dia_(Pend_proximaCalibracao_(c)), 'certificado de calibração');
      });
    }
  } catch (e2) {}
  AST_MEMO[chaveMemo] = r;
  return r;
}
function AstRd_equipPublico_(e, val) {
  var v = (val || {})[Ast_s_(e.ID)] || {};
  return { chave: 'e:' + Ast_s_(e.ID), id: Ast_s_(e.ID), tipo: Ast_s_(e.TIPO), modelo: Ast_s_(e.MODELO), serie: Ast_vazioCad_(e.SERIE) ? '' : Ast_s_(e.SERIE), tag: Ast_vazioCad_(e.TAG) ? '' : Ast_s_(e.TAG),
    patrimonio: Ast_vazioCad_(e.PATRIMONIO) ? '' : Ast_s_(e.PATRIMONIO), categoria: AstRd_categoria_(e.TIPO, e.MODELO), validade: { cal: v.cal || null, qual: v.qual || null } };
}
/** Escopo vivo (cadastro de agora): setores da unidade, filtrados pelo contrato, com os equipamentos ativos de cada um. */
function AstRd_escopoVivo_(os) {
  var reg = AstRd_registro_(os), filtro = reg.filtroSetores.map(AstRd_chaveSetor_);
  var val = AstRd_validades_(os.CLIENTE_ID, os.UNIDADE_ID), mapa = {}, setores = [];
  var setor = function (nome) { var k = AstRd_chaveSetor_(nome); if (!mapa[k]) { mapa[k] = { nome: Ast_s_(nome), chave: k, equipamentos: [] }; setores.push(mapa[k]); } return mapa[k]; };
  AstRd_setoresCadastrados_(os.UNIDADE_ID).forEach(function (s) { setor(s.NOME); });
  Ast_ler_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).filter(function (e) { return Ast_s_(e.UNIDADE_ID) === Ast_s_(os.UNIDADE_ID) && Ast_up_(e.STATUS || 'ATIVO') !== 'INATIVO'; })
    .sort(function (a, b) { return (Ast_s_(a.TIPO) + Ast_s_(a.TAG)).localeCompare(Ast_s_(b.TIPO) + Ast_s_(b.TAG), 'pt-BR'); })
    .forEach(function (e) { setor(Ast_vazioCad_(e.SETOR) ? AST_RONDA_SEM_SETOR : Ast_s_(e.SETOR)).equipamentos.push(AstRd_equipPublico_(e, val)); });
  var l = filtro.length ? setores.filter(function (s) { return filtro.indexOf(s.chave) >= 0; }) : setores;
  return { geradoEm: Ast_agora_(), setores: l.filter(function (s) { return s.equipamentos.length || filtro.indexOf(s.chave) >= 0 || !filtro.length; }) };
}
/** Escopo da ronda (congelado no Cheguei ou vivo) com o que o técnico acrescentou: setor novo e equipamento cadastrado em campo. */
function AstRd_escopo_(os) {
  var esc = Ast_json_(os.RONDA_ESCOPO_JSON, null);
  if (!esc || !Array.isArray(esc.setores)) esc = AstRd_escopoVivo_(os);
  esc = Ast_copia_(esc);
  var reg = AstRd_registro_(os), mapa = {}, vistos = {};
  esc.setores.forEach(function (s) { mapa[s.chave] = s; s.equipamentos.forEach(function (e) { vistos[e.chave] = true; }); });
  var setor = function (nome) { var k = AstRd_chaveSetor_(nome); if (!mapa[k]) { mapa[k] = { nome: Ast_s_(nome) || AST_RONDA_SEM_SETOR, chave: k, equipamentos: [], extra: true }; esc.setores.push(mapa[k]); } return mapa[k]; };
  Object.keys(reg.setores).forEach(function (k) { var s = reg.setores[k]; if (s && s.extra) setor(s.nome); });
  Object.keys(reg.itens).forEach(function (k) {
    if (vistos[k]) return;
    var it = reg.itens[k], id = it.ident || {};
    setor(it.setor || AST_RONDA_SEM_SETOR).equipamentos.push({ chave: k, id: Ast_s_(it.equipamentoId), tipo: Ast_s_(id.tipo), modelo: Ast_s_(id.modelo), serie: Ast_s_(id.serie), tag: Ast_s_(id.tag),
      patrimonio: Ast_s_(id.patrimonio), categoria: AstRd_categoria_(id.tipo, id.modelo), validade: { cal: null, qual: null }, novo: /^n:/.test(k) });
    vistos[k] = true;
  });
  return esc;
}
/** A chave está no escopo base da ronda (congelado no Cheguei; antes dele, o cadastro de agora)? */
function AstRd_noEscopoBase_(os, chave) {
  var esc = Ast_json_(os.RONDA_ESCOPO_JSON, null);
  if (!esc || !Array.isArray(esc.setores)) esc = AstRd_escopoVivo_(os);
  return esc.setores.some(function (s) { return (s.equipamentos || []).some(function (e) { return e.chave === chave; }); });
}
function AstRd_eqTexto_(e) { return [e.tipo, e.modelo, e.tag ? 'TAG ' + e.tag : '', e.serie ? 'série ' + e.serie : ''].filter(Boolean).join(' · ') || 'Equipamento sem identificação'; }

// ------------------------------------------------------------
// O QUE FALTA (a mesma regra do aplicativo: regras.js faltasDoItemRonda)
// ------------------------------------------------------------
function AstRd_faltasItem_(it, perguntas, nFotos) {
  var f = [];
  if (!it || !AST_RONDA_SITUACOES[Ast_up_(it.situacao)]) return ['escolher a situação'];
  var s = Ast_up_(it.situacao);
  if (AST_RONDA_PROBLEMAS.indexOf(s) >= 0) {
    if (AstRd_letras_(it.descricao) < AST_RONDA_DESC_MIN) f.push('descrever o que foi encontrado');
    if (!(nFotos > 0)) f.push('a foto do problema');
  }
  if (s === 'FORA_USO' && !AST_RONDA_PARADAS[Ast_up_(it.parada)]) f.push('dizer se o equipamento está parado ou funciona com defeito ou limitação');
  if (s === 'NAO_VERIFICADO' && AstRd_letras_(it.motivo) < AST_RONDA_MOTIVO_MIN) f.push('o motivo de não ter verificado');
  if (['FUNCIONANDO', 'OBSERVACAO', 'FORA_USO'].indexOf(s) >= 0 && perguntas && perguntas.length) {
    var r = it.respostas || {}, sem = perguntas.filter(function (p) { return p.obrigatoria && (r[p.id] === undefined || r[p.id] === null || Ast_s_(r[p.id]) === ''); });
    if (sem.length) f.push('responder ' + Ast_plural_(sem.length, 'pergunta fixa', 'perguntas fixas'));
    if (s === 'FUNCIONANDO' && perguntas.some(function (p) { return p.tipo === 'SIM_NAO' && Ast_up_(r[p.id]) === 'NAO'; })) f.push('uma verificação ficou "Não": marque "Com observação" ou "Fora de uso" e descreva');
  }
  return f;
}
/** Linhas da ronda: cada equipamento do escopo com o item registrado, as fotos, as perguntas e o que falta. */
function AstRd_linhas_(os, fotos) {
  fotos = fotos || AstO_fotos_(os.ID);
  var esc = AstRd_escopo_(os), reg = AstRd_registro_(os), perg = AstRd_perguntas_(), saida = [];
  esc.setores.forEach(function (s) {
    s.equipamentos.forEach(function (e) {
      var it = reg.itens[e.chave] || null, fs = fotos.filter(function (f) { return Ast_s_(f.PERGUNTA_ID) === 'ronda:' + e.chave; });
      var p = e.categoria ? perg[e.categoria] || [] : [];
      saida.push({ setor: s.nome, setorChave: s.chave, eq: e, item: it, fotos: fs, perguntas: p, faltas: AstRd_faltasItem_(it, p, fs.length) });
    });
  });
  return { escopo: esc, registro: reg, linhas: saida };
}
function AstRd_faltas_(os, fotos, regras, tipo) {
  regras = regras || Ast_regras_();
  fotos = fotos || AstO_fotos_(os.ID);
  var f = [];
  if (!Ast_s_(os.CHEGOU_EM)) f.push('registrar a chegada (Cheguei)');
  var L = AstRd_linhas_(os, fotos);
  if (!L.linhas.length) f.push('pelo menos um equipamento na ronda (a unidade não tem equipamento no cadastro: cadastre pelo SGO+ Campo, em "Equipamento fora do cadastro")');
  var porSetor = {};
  L.linhas.forEach(function (l) { if (l.faltas.length) { var p = porSetor[l.setor] = porSetor[l.setor] || { n: 0, sem: 0 }; p.n++; if (l.faltas[0] === 'escolher a situação') p.sem++; } });
  Object.keys(porSetor).forEach(function (s) {
    var p = porSetor[s];
    f.push('completar o setor "' + s + '": ' + (p.sem ? Ast_plural_(p.sem, 'equipamento sem situação', 'equipamentos sem situação') : '') + (p.sem && p.n > p.sem ? ' e ' : '') +
      (p.n > p.sem ? Ast_plural_(p.n - p.sem, 'equipamento com descrição, foto, motivo ou pergunta faltando', 'equipamentos com descrição, foto, motivo ou pergunta faltando') : ''));
  });
  var precisaAss = regras.assinatura && regras.assinatura.obrigatoria !== false;
  if (precisaAss && !Ast_s_(os.ASSINATURA_ARQUIVO_ID)) {
    var semOk = AST_MOTIVOS_SEM_ASSINATURA[Ast_up_(os.SEM_ASSINATURA_MOTIVO)] && Ast_s_(os.SEM_ASSINATURA_RECEBIDO_POR).length >= 3 && Ast_s_(os.SEM_ASSINATURA_JUSTIFICATIVA).length >= 10;
    if (!semOk) f.push('a assinatura do cliente (responsável da unidade; ou "responsável ausente" com o nome de quem acompanhou e a justificativa)');
  }
  if (AstO_exigeAssColab_(os, tipo) && !Ast_s_(os.COLAB_ASSINATURA_ARQUIVO_ID) && Ast_s_(os.COLAB_DISPENSA_JUSTIFICATIVA).length < 10) f.push('a assinatura do técnico que atendeu');
  return f;
}
/** Resumo automático em números (tela, aplicativo e relatório). */
function AstRd_resumo_(os, fotos) {
  var L = AstRd_linhas_(os, fotos), r = { setores: L.escopo.setores.length, equipamentos: L.linhas.length, verificados: 0, porSituacao: {}, problemas: 0, semSituacao: 0, novos: 0, fotos: 0, vencidos: 0, comFalta: 0 };
  Object.keys(AST_RONDA_SITUACOES).forEach(function (k) { r.porSituacao[k] = 0; });
  L.linhas.forEach(function (l) {
    var s = l.item ? Ast_up_(l.item.situacao) : '';
    if (AST_RONDA_SITUACOES[s]) { r.porSituacao[s]++; if (s !== 'NAO_VERIFICADO' && s !== 'NAO_LOCALIZADO') r.verificados++; } else r.semSituacao++;
    if (AST_RONDA_PROBLEMAS.indexOf(s) >= 0) r.problemas++;
    if (l.eq.novo) r.novos++;
    if (l.faltas.length) r.comFalta++;
    if (AstRd_vencimentos_(l).length) r.vencidos++;
    r.fotos += l.fotos.length;
  });
  r.setoresFotos = AstO_fotos_(os.ID).filter(function (f) { return /^ronda:setor:/.test(Ast_s_(f.PERGUNTA_ID)); }).length;
  return r;
}
/** Calibração ou qualificação vencida encontrada na ronda: pelo cadastro de documentos ou pela etiqueta respondida "Não". */
function AstRd_vencimentos_(l) {
  var v = [], val = l.eq.validade || {}, r = (l.item && l.item.respostas) || {};
  if (val.cal && val.cal.vencida) v.push({ servico: 'Calibração', motivo: 'calibração vencida em ' + Ast_brDia_(val.cal.ate + 'T00:00:00') });
  if (val.qual && val.qual.vencida) v.push({ servico: 'Qualificação', motivo: 'qualificação vencida em ' + Ast_brDia_(val.qual.ate + 'T00:00:00') });
  if (Ast_up_(r.etiqueta) === 'NAO' && !v.length) v.push({ servico: l.eq.categoria === 'AUTOCLAVE' || l.eq.categoria === 'LAVADORA' ? 'Calibração ou qualificação' : 'Calibração', motivo: 'etiqueta de calibração ou qualificação inválida no local' });
  return v;
}

// ------------------------------------------------------------
// EVENTO RONDA (aplicativo e tela; chamado por AstO_aplicarEvento_, dentro da trava)
// ------------------------------------------------------------
/**
 * d.parte: ITEM { chave, equipamentoId, setor, situacao, descricao, motivo, respostas{}, ident{} } | SETOR { setor, achados, novo }
 * | ORIENTACOES { orientacoes, pedidosCliente }. Só os campos que vieram mudam (merge); nada do que já foi registrado se perde.
 * x: { gravar, hora, extraEv, exigeLocal, iniciarExecucao }
 */
function AstRd_aplicarEvento_(eu, os, d, x) {
  if (!eu.gestao && !eu.tecnico) return { ok: false, definitivo: true, motivo: 'a ronda de engenharia clínica é registrada por técnico ou engenheiro (perfil Técnico ou área Técnica) ou pela gestão da área Técnica', corrigir: 'Fale com a gestão da área Técnica.' };
  if (!AstRd_ehRonda_(os)) return { ok: false, definitivo: true, motivo: 'a O.S. ' + os.NUMERO + ' não é uma ronda', corrigir: 'Atualize o Meu dia.' };
  if (!x.exigeLocal()) return { ok: false, definitivo: false, motivo: 'a chegada ainda não foi registrada', corrigir: 'Toque em "Cheguei" antes de registrar a ronda e sincronize de novo.' };
  d = d || {};
  var reg = AstRd_registro_(os), parte = Ast_up_(d.parte), texto = '';
  if (parte === 'ITEM') {
    var chave = Ast_s_(d.chave);
    if (!/^[en]:[A-Za-z0-9_.:-]{1,90}$/.test(chave)) return { ok: false, definitivo: true, motivo: 'o item da ronda veio sem identificação válida (' + chave + ')', corrigir: 'Atualize o aplicativo.' };
    var sit = d.situacao === undefined ? undefined : Ast_up_(d.situacao);
    if (sit && !AST_RONDA_SITUACOES[sit]) return { ok: false, definitivo: true, motivo: 'situação desconhecida (' + sit + ')', corrigir: 'Atualize o aplicativo: as situações são ' + Object.keys(AST_RONDA_SITUACOES).join(', ') + '.' };
    var ant = reg.itens[chave] || { chave: chave, criadoEm: x.hora }, novo = Ast_copia_(ant);
    if (sit !== undefined) novo.situacao = sit;
    if (d.descricao !== undefined) novo.descricao = Ast_texto_(d.descricao, 1500);
    if (d.motivo !== undefined) novo.motivo = Ast_texto_(d.motivo, 500);
    if (d.setor !== undefined) novo.setor = Ast_texto_(d.setor, 120);
    if (d.parada !== undefined) novo.parada = AST_RONDA_PARADAS[Ast_up_(d.parada)] ? Ast_up_(d.parada) : '';
    var eqId = '';
    if (/^e:/.test(chave)) {
      eqId = chave.slice(2);
      var eqE = Ast_mapa_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS)[eqId];
      if (!eqE || Ast_s_(eqE.CLIENTE_ID) !== Ast_s_(os.CLIENTE_ID) || Ast_s_(eqE.UNIDADE_ID) !== Ast_s_(os.UNIDADE_ID))
        return { ok: false, definitivo: true, motivo: 'o equipamento ' + (eqE ? Ast_equipTexto_(eqE) : eqId) + ' não é da unidade ' + Ast_s_(os.UNIDADE_NOME) + ' do cliente ' + Ast_s_(os.CLIENTE_NOME), corrigir: 'Confira o equipamento; se ele está mesmo neste setor, cadastre em "Equipamento fora do cadastro" (a gestão confere o vínculo depois).' };
      if (!reg.itens[chave] && !AstRd_noEscopoBase_(os, chave))
        return { ok: false, definitivo: true, motivo: 'o equipamento ' + Ast_equipTexto_(eqE) + ' não faz parte do escopo desta ronda (setores e equipamentos fixados no Cheguei)', corrigir: 'Se ele está neste setor, registre em "Equipamento fora do cadastro" ou peça à gestão para incluir o setor na próxima ronda.' };
    } else {
      eqId = typeof AstApp_idReal_ === 'function' ? AstApp_idReal_('EQUIPAMENTO', Ast_s_(d.equipamentoId) || chave.slice(2)) : Ast_s_(d.equipamentoId);
      var eqN = Ast_mapa_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS)[eqId];
      if (!eqN) eqId = '';
      else if (Ast_s_(eqN.CLIENTE_ID) !== Ast_s_(os.CLIENTE_ID) || Ast_s_(eqN.UNIDADE_ID) !== Ast_s_(os.UNIDADE_ID))
        return { ok: false, definitivo: true, motivo: 'o equipamento cadastrado em campo já existe no cadastro em outra unidade ou cliente (' + Ast_equipTexto_(eqN) + ')', corrigir: 'Fale com a gestão: ela confere o vínculo em Cadastros > Vínculos; o equipamento não entra nesta ronda.' };
      if (d.ident && typeof d.ident === 'object') {
        var id0 = novo.ident || {};
        ['tipo', 'modelo', 'serie', 'tag', 'patrimonio'].forEach(function (k) { if (d.ident[k] !== undefined) id0[k] = Ast_texto_(d.ident[k], 80); });
        novo.ident = id0;
      }
    }
    if (eqId) novo.equipamentoId = eqId;
    var eqCad = Ast_mapa_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS)[eqId] || null;
    var cat = eqCad ? AstRd_categoria_(eqCad.TIPO, eqCad.MODELO) : AstRd_categoria_((novo.ident || {}).tipo, (novo.ident || {}).modelo);
    if (d.respostas && typeof d.respostas === 'object') {
      var perg = cat ? AstRd_perguntas_()[cat] || [] : [], resp = novo.respostas || {}, erros = [];
      Object.keys(d.respostas).forEach(function (k) {
        var p = perg.filter(function (q) { return q.id === k; })[0], v = d.respostas[k];
        if (!p) return;
        if (v === null || v === '' || v === undefined) { delete resp[k]; return; }
        var val = AstO_valorResposta_(p, v);
        if (val.erro) erros.push('"' + p.texto + '": ' + val.erro); else resp[k] = val.v;
      });
      if (erros.length) return { ok: false, definitivo: false, motivo: erros.join('; '), corrigir: 'Corrija a resposta no aplicativo e sincronize de novo.' };
      novo.respostas = resp;
    }
    novo.em = x.hora; novo.por = eu.nome;
    reg.itens[chave] = novo;
    var nomeEq = eqCad ? Ast_equipTexto_(eqCad) : AstRd_eqTexto_(novo.ident || {});
    texto = 'Ronda: ' + nomeEq + (novo.setor ? ' (' + novo.setor + ')' : '') + ': ' + (AST_RONDA_SITUACOES[novo.situacao] || 'sem situação') + (novo.descricao ? ' · ' + novo.descricao.slice(0, 160) : '') + (novo.motivo ? ' · motivo: ' + novo.motivo.slice(0, 120) : '');
  } else if (parte === 'SETOR') {
    var nome = Ast_texto_(d.setor, 120);
    if (nome.length < 2) return { ok: false, definitivo: true, motivo: 'o setor veio sem nome', corrigir: 'Escreva o nome do setor e guarde de novo.' };
    var ks = AstRd_chaveSetor_(nome), s0 = reg.setores[ks] || { nome: nome };
    if (d.novo === true) s0.extra = true;
    if (d.achados !== undefined) s0.achados = Ast_texto_(d.achados, 3000);
    s0.em = x.hora; s0.por = eu.nome;
    reg.setores[ks] = s0;
    texto = 'Ronda, setor ' + nome + (d.novo === true ? ' (acrescentado em campo)' : '') + (s0.achados ? ': achados ' + s0.achados.slice(0, 200) : '');
  } else if (parte === 'ORIENTACOES') {
    if (d.orientacoes !== undefined) reg.orientacoes = Ast_texto_(d.orientacoes, 4000);
    if (d.pedidosCliente !== undefined) reg.pedidosCliente = Ast_texto_(d.pedidosCliente, 4000);
    texto = 'Ronda: orientações e pedidos do cliente registrados';
  } else return { ok: false, definitivo: true, motivo: 'parte da ronda desconhecida (' + parte + ')', corrigir: 'Atualize o aplicativo.' };
  x.iniciarExecucao();
  x.gravar({ RONDA_JSON: JSON.stringify(reg) });
  Ast_evento_('OS', os.ID, 'RONDA', eu, texto, x.extraEv);
  return { ok: true };
}

// ------------------------------------------------------------
// AGENDA: RONDA AVULSA, REAGENDAR, CANCELAR
// ------------------------------------------------------------
function AstRd_tipo_() { var t = Ast_tipo_(AST_RONDA_TIPO); if (!t || !t.ativo || !t.ronda) throw new Error('Não foi possível: o tipo "Ronda de engenharia clínica" (RONDA_EC) está desativado ou fora do grupo Ronda em Regras da assistência > Tipos de serviço. Reative e tente de novo'); return t; }
function AstRd_unidade_(clienteId, unidadeId, acao) {
  var cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(clienteId)];
  if (!cli || Ast_up_(cli.STATUS || 'ATIVO') === 'INATIVO') throw new Error('Não foi possível ' + acao + ': escolha o cliente (ativo) na lista');
  var un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[Ast_s_(unidadeId)];
  if (!un || Ast_s_(un.CLIENTE_ID) !== Ast_s_(cli.ID)) throw new Error('Não foi possível ' + acao + ': escolha a unidade do cliente ' + Ast_clienteNome_(cli) + ' (a ronda é feita setor a setor numa unidade)');
  return { cli: cli, un: un };
}
function AstRd_tecnico_(tecnicoId, acao) {
  var us = Ast_usuarios_(), t = us[Ast_s_(tecnicoId)];
  if (!t || Ast_tecnicos_(us).map(function (x) { return x.id; }).indexOf(t.id) < 0) throw new Error('Não foi possível ' + acao + ': escolha o responsável na lista (técnico ou engenheiro: usuário ativo com perfil Técnico ou da área Técnica)');
  return t;
}
function AstRd_setoresFiltro_(lista) { return (Array.isArray(lista) ? lista : []).map(function (s) { return Ast_texto_(s, 120); }).filter(Boolean).filter(function (s, i, l) { return l.map(AstRd_chaveSetor_).indexOf(AstRd_chaveSetor_(s)) === i; }); }
/** Cria a O.S. da ronda (dentro da trava). d: { cli, un, tec, quando, dur, orientacao, setores, planoId, chave, prevista, janelaAte, origem } */
function AstRd_criarOs_(eu, d) {
  var tipo = AstRd_tipo_(), agora = Ast_agora_();
  var os = Ast_inserir_(AST_ABAS.OS, {
    NUMERO: Ast_proximoNumero_('OS', AST_ABAS.OS), CHAMADO_ID: '', CHAMADO_NUMERO: '', SITUACAO: 'AGENDADA', TIPO_CODIGO: tipo.codigo, TIPO_NOME: tipo.nome, MODELO_CODIGO: '', MODELO_VERSAO: '', PERGUNTAS_JSON: '[]',
    CLIENTE_ID: d.cli.ID, CLIENTE_NOME: Ast_clienteNome_(d.cli), UNIDADE_ID: d.un.ID, UNIDADE_NOME: Ast_s_(d.un.NOME_UNIDADE), EQUIPAMENTO_ID: '', EQUIPAMENTO_TEXTO: 'Ronda de engenharia clínica · ' + Ast_s_(d.un.NOME_UNIDADE),
    ENDERECO: Ast_endereco_(d.un, d.cli), TECNICO_ID: d.tec.id, TECNICO_NOME: d.tec.nome, AGENDADO_PARA: d.quando, DURACAO_MIN: d.dur, PREPARO_JSON: JSON.stringify({ ronda: true }), ORIENTACAO: Ast_texto_(d.orientacao, 1500),
    RESPOSTAS_JSON: '{}', QTD_FOTOS: 0, QTD_PECAS: 0, RELATORIO_VERSAO: 0, RONDA_JSON: JSON.stringify({ versao: 1, filtroSetores: d.setores || [], itens: {}, setores: {} }),
    RONDA_PLANO_ID: Ast_s_(d.planoId), RONDA_CHAVE: Ast_s_(d.chave), RONDA_PREVISTA: Ast_s_(d.prevista) || d.quando.slice(0, 10), RONDA_JANELA_ATE: Ast_s_(d.janelaAte) || d.quando.slice(0, 10),
    ULTIMA_SINC_EM: '', ATUALIZADO_EM: agora
  });
  Ast_evento_('OS', os.ID, 'AGENDADA', eu, 'Ronda de engenharia clínica agendada (' + (d.origem || 'avulsa') + ') para ' + Ast_br_(d.quando) + ' com ' + d.tec.nome + (d.setores && d.setores.length ? '. Setores: ' + d.setores.join(', ') : '. Todos os setores da unidade'), { numero: os.NUMERO, para: Ast_br_(d.quando) + ' · ' + d.tec.nome });
  Ast_avisar_(d.tec.id, 'OS_AGENDADA', 'Ronda agendada para você: ' + os.NUMERO, Ast_clienteNome_(d.cli) + ' · ' + Ast_s_(d.un.NOME_UNIDADE) + ' · ' + Ast_br_(d.quando) + ' (' + Ast_duracaoTxt_(d.dur) + ')\nRonda de engenharia clínica: setor a setor, no SGO+ Campo (Meu dia).', os.ID, { autorId: eu.id, evento: 'AT03' });
  var osId = os.ID, fim = Ast_agora_(Ast_ms_(d.quando) + d.dur * 60000).slice(0, 16);
  Ast_criarAtividade_({ osId: osId, responsavelId: d.tec.id, titulo: 'Ronda ' + os.NUMERO + ' · ' + Ast_clienteNome_(d.cli) + ' · ' + Ast_s_(d.un.NOME_UNIDADE), prazo: fim, prioridade: 'Alta',
    descricao: 'Ronda de engenharia clínica (' + (d.origem || 'avulsa') + ').\nEndereço: ' + (Ast_endereco_(d.un, d.cli) || 'ver no cadastro') + '\n\nA atividade é concluída sozinha quando a ronda fecha com a documentação completa.',
    clienteId: d.cli.ID, unidadeId: d.un.ID, porQue: 'Ronda de engenharia clínica' + (d.planoId ? ' do contrato de ronda' : '') + '.', onde: Ast_endereco_(d.un, d.cli), como: 'Pelo SGO+ Campo (Meu dia).' },
    function (idAtv) { Ast_atualizar_(AST_ABAS.OS, osId, { ATIVIDADE_ID: idAtv }); });
  return os;
}
/** Ronda avulsa. d: { clienteId, unidadeId, tecnicoId, inicio, duracaoMin, setores[], orientacao, avisarCliente, confirmarConflito, motivoConflito } */
function AstRd_agendar_(eu, d) {
  Ast_exigir_(eu, 'GESTAO', 'agendar a ronda');
  d = d || {};
  var acao = 'agendar a ronda', v = AstRd_unidade_(d.clienteId, d.unidadeId, acao), tec = AstRd_tecnico_(d.tecnicoId, acao);
  AstRd_tipo_();
  var iniMs = Ast_ms_(d.inicio);
  if (iniMs === null) throw new Error('Não foi possível ' + acao + ': informe a data e a hora');
  if (iniMs < Date.now() - 10 * 60000) throw new Error('Não foi possível ' + acao + ': o horário ' + Ast_br_(Ast_agora_(iniMs)) + ' já passou. Escolha um horário futuro');
  var dur = Math.round(Ast_num_(d.duracaoMin) || 120);
  if (!(dur >= 30 && dur <= 12 * 60)) throw new Error('Não foi possível ' + acao + ': a duração estimada vai de 30 minutos a 12 horas');
  var conf = AstA_conflitos_(tec.id, iniMs, iniMs + dur * 60000, '');
  if (conf.length && !Ast_sim_(d.confirmarConflito)) return { conflito: true, conflitos: conf, message: tec.nome + ' já tem compromisso nesse horário: ' + conf.map(function (x) { return x.texto; }).join('; ') + '. Escolha outro horário ou marque "Agendar mesmo assim" com o motivo.' };
  if (conf.length && Ast_texto_(d.motivoConflito, 500).length < 5) throw new Error('Não foi possível ' + acao + ' com conflito: escreva o motivo (pelo menos 5 letras)');
  var setores = AstRd_setoresFiltro_(d.setores), quando = Ast_agora_(iniMs);
  var os = Ast_comTrava_(function () { return AstRd_criarOs_(eu, { cli: v.cli, un: v.un, tec: tec, quando: quando, dur: dur, orientacao: d.orientacao, setores: setores, origem: 'avulsa' }); });
  if (conf.length) Ast_evento_('OS', os.ID, 'CONFLITO', eu, 'Conflito de agenda confirmado: ' + Ast_texto_(d.motivoConflito, 500), { numero: os.NUMERO });
  if (d.avisarCliente !== false) Ast_avisarCliente_({ ID: os.ID, CLIENTE_ID: v.cli.ID, UNIDADE_ID: v.un.ID }, 'Ronda de engenharia clínica agendada: ' + Ast_s_(v.un.NOME_UNIDADE) + ' em ' + Ast_brDia_(quando),
    'Prezados,\n\nA ronda de engenharia clínica da unidade ' + Ast_s_(v.un.NOME_UNIDADE) + ' foi agendada para ' + Ast_br_(quando) + ', com ' + tec.nome + '.\nNa ronda, os equipamentos são verificados setor a setor e o relatório fica disponível no portal do cliente do SGO+.\n\nMetrolabs — Engenharia clínica', 'AT08');
  return { os: AstO_publico_(Ast_porId_(AST_ABAS.OS, os.ID), eu), message: 'Ronda ' + os.NUMERO + ' agendada para ' + Ast_br_(quando) + ' com ' + tec.nome + '.' };
}
function AstRd_obterAberta_(eu, osId, acao) {
  var os = Ast_porId_(AST_ABAS.OS, osId);
  if (!os || !AstRd_ehRonda_(os)) throw new Error('Não foi possível ' + acao + ': ronda não encontrada. Atualize a lista');
  var s = Ast_up_(os.SITUACAO);
  if (s === 'ENCERRADA' || s === 'CANCELADA') throw new Error('Não foi possível ' + acao + ': a ronda ' + os.NUMERO + ' já está ' + (s === 'ENCERRADA' ? 'encerrada' : 'cancelada'));
  return os;
}
/** d: { osId, inicio, tecnicoId, duracaoMin, motivo } — só ronda que ainda não começou. */
function AstRd_reagendar_(eu, d) {
  Ast_exigir_(eu, 'GESTAO', 'reagendar a ronda');
  d = d || {};
  var acao = 'reagendar a ronda', os = AstRd_obterAberta_(eu, d.osId, acao);
  if (Ast_s_(os.CHEGOU_EM)) throw new Error('Não foi possível ' + acao + ': a ronda ' + os.NUMERO + ' já começou no cliente (Cheguei registrado). Termine pelo SGO+ Campo');
  var motivo = Ast_texto_(d.motivo, 500);
  if (motivo.length < 5) throw new Error('Não foi possível ' + acao + ': escreva o motivo (pelo menos 5 letras). O técnico recebe o horário novo');
  var tec = AstRd_tecnico_(d.tecnicoId || os.TECNICO_ID, acao), iniMs = Ast_ms_(d.inicio);
  if (iniMs === null || iniMs < Date.now() - 10 * 60000) throw new Error('Não foi possível ' + acao + ': informe a data e a hora (futuras)');
  var dur = Math.round(Ast_num_(d.duracaoMin) || Number(os.DURACAO_MIN) || 120), quando = Ast_agora_(iniMs), antTec = Ast_s_(os.TECNICO_ID);
  Ast_comTrava_(function () {
    Ast_atualizar_(AST_ABAS.OS, os.ID, { AGENDADO_PARA: quando, DURACAO_MIN: dur, TECNICO_ID: tec.id, TECNICO_NOME: tec.nome, SITUACAO: 'AGENDADA', ATUALIZADO_EM: Ast_agora_() });
    Ast_evento_('OS', os.ID, 'REAGENDADO', eu, motivo, { numero: os.NUMERO, de: Ast_br_(os.AGENDADO_PARA) + ' · ' + Ast_s_(os.TECNICO_NOME), para: Ast_br_(quando) + ' · ' + tec.nome });
  });
  Ast_avisar_(tec.id, 'OS_REAGENDADA', 'Ronda reagendada: ' + os.NUMERO, Ast_s_(os.CLIENTE_NOME) + ' · ' + Ast_br_(quando) + '\nMotivo: ' + motivo, os.ID, { autorId: eu.id, evento: 'AT04' });
  if (antTec && antTec !== tec.id) Ast_avisar_(antTec, 'OS_PASSADA', 'Ronda ' + os.NUMERO + ' passou para ' + tec.nome, 'Motivo: ' + motivo, os.ID, { autorId: eu.id, evento: 'AT04' });
  if (os.ATIVIDADE_ID) Ast_editarAtividade_(os.ATIVIDADE_ID, { prazo: Ast_agora_(iniMs + dur * 60000).slice(0, 16), responsavelId: tec.id, motivo: motivo });
  return { os: AstO_publico_(Ast_porId_(AST_ABAS.OS, os.ID), eu), message: 'Ronda ' + os.NUMERO + ' reagendada para ' + Ast_br_(quando) + ' com ' + tec.nome + '.' };
}
function AstRd_cancelarOs_(eu, os, motivo) {
  Ast_atualizar_(AST_ABAS.OS, os.ID, { SITUACAO: 'CANCELADA', CANCELADA_EM: Ast_agora_(), CANCELADA_MOTIVO: Ast_texto_(motivo, 500), ATUALIZADO_EM: Ast_agora_() });
  Ast_evento_('OS', os.ID, 'CANCELADA', eu, 'Ronda cancelada: ' + Ast_texto_(motivo, 500), { numero: os.NUMERO });
  Ast_mudarAtividade_(os.ATIVIDADE_ID, 'Cancelada', 'Ronda ' + os.NUMERO + ' cancelada: ' + Ast_texto_(motivo, 300));
  Ast_avisar_(os.TECNICO_ID, 'OS_CANCELADA', 'Ronda cancelada: ' + os.NUMERO, Ast_s_(os.CLIENTE_NOME) + ' · ' + Ast_br_(os.AGENDADO_PARA) + '\nMotivo: ' + Ast_texto_(motivo, 300), os.ID, { autorId: eu.id, evento: 'AT05' });
}
function AstRd_cancelar_(eu, d) {
  Ast_exigir_(eu, 'GESTAO', 'cancelar a ronda');
  var os = AstRd_obterAberta_(eu, d && d.osId, 'cancelar a ronda'), motivo = Ast_texto_(d && d.motivo, 500);
  if (Ast_s_(os.CHEGOU_EM)) throw new Error('Não foi possível cancelar: a ronda ' + os.NUMERO + ' já começou no cliente. Termine pelo SGO+ Campo (equipamento não verificado leva o motivo)');
  if (motivo.length < 10) throw new Error('Não foi possível cancelar: escreva o motivo (pelo menos 10 letras). Ele fica no histórico');
  Ast_comTrava_(function () { AstRd_cancelarOs_(eu, os, motivo); });
  return { message: 'Ronda ' + os.NUMERO + ' cancelada. O técnico foi avisado.' };
}

// ------------------------------------------------------------
// CONTRATO DE RONDA RECORRENTE (semanal, quinzenal, mensal), sem duplicar
// ------------------------------------------------------------
function AstRd_planoPublico_(p) {
  return { id: Ast_s_(p.ID), codigo: Ast_s_(p.CODIGO), situacao: Ast_up_(p.SITUACAO), situacaoNome: { ATIVA: 'Ativa', PAUSADA: 'Pausada', ENCERRADA: 'Encerrada' }[Ast_up_(p.SITUACAO)] || Ast_s_(p.SITUACAO),
    clienteId: Ast_s_(p.CLIENTE_ID), clienteNome: Ast_s_(p.CLIENTE_NOME), unidadeId: Ast_s_(p.UNIDADE_ID), unidadeNome: Ast_s_(p.UNIDADE_NOME), periodicidade: Ast_up_(p.PERIODICIDADE),
    periodicidadeNome: (AST_RONDA_PERIODOS[Ast_up_(p.PERIODICIDADE)] || {}).nome || '', inicio: Ast_s_(p.INICIO).slice(0, 10), hora: Ast_s_(p.HORA).slice(0, 5), duracaoMin: Number(p.DURACAO_MIN) || 120,
    janelaDias: Number(p.JANELA_DIAS) || 0, tecnicoId: Ast_s_(p.TECNICO_ID), tecnicoNome: Ast_s_(p.TECNICO_NOME), setores: Ast_json_(p.SETORES_JSON, []), orientacao: Ast_s_(p.ORIENTACAO),
    cobranca: AST_RONDA_INCLUIDA, contratoRef: Ast_s_(p.CONTRATO_REF), geradoAte: Ast_s_(p.GERADO_ATE), motivo: Ast_s_(p.MOTIVO), por: Ast_s_(p.POR_NOME) };
}
/** Próximas datas previstas do contrato a partir de "de" até "ate" (AAAA-MM-DD), pela periodicidade a partir do início. */
function AstRd_datasPrevistas_(p, de, ate) {
  var ini = Ast_s_(p.INICIO).slice(0, 10), per = AST_RONDA_PERIODOS[Ast_up_(p.PERIODICIDADE)], l = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ini) || !per) return l;
  for (var i = 0; i < 400; i++) {
    var dia;
    if (per.meses) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ini), y = +m[1], mes = +m[2] - 1 + i * per.meses, alvo = +m[3];
      var yy = y + Math.floor(mes / 12), mm = mes % 12, ult = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
      dia = yy + '-' + Ast_2_(mm + 1) + '-' + Ast_2_(Math.min(alvo, ult));
    } else dia = Ast_somarDias_(ini, i * per.dias);
    if (dia > ate) break;
    if (dia >= de) l.push(dia);
  }
  return l;
}
/** Dia útil a partir de "dia" (o próprio ou o seguinte, até 7 dias). */
function AstRd_diaUtil_(dia) { var cfg = Ast_expediente_(); for (var i = 0; i < 8; i++) { var d = Ast_somarDias_(dia, i); if (Ast_diaUtil_(d, cfg)) return d; } return dia; }
/**
 * Gera as rondas do contrato até o horizonte, sem duplicar: a chave é plano|data prevista (RONDA_CHAVE). Uma O.S. com a chave
 * já existe (qualquer situação, também excluída) = não gera de novo; só a cancelada pela pausa da recorrência volta a nascer
 * quando o contrato é retomado. Chamar dentro da trava.
 */
function AstRd_gerarPlano_(eu, p, hojeIso) {
  if (Ast_up_(p.SITUACAO) !== 'ATIVA') return 0;
  Ast_memoLimpar_();   // revisão de 03/11/2026: dentro da trava, sempre a leitura de agora (outra geração pode ter acabado de gravar)
  p = Ast_porId_(AST_ABAS.RONDA_PLANOS, p.ID) || p;
  var hoje = hojeIso || Ast_hoje_(), ate = Ast_somarDias_(hoje, Number(p.HORIZONTE_DIAS) || AST_RONDA_HORIZONTE_DIAS);
  var de = Ast_s_(p.INICIO).slice(0, 10) > hoje ? Ast_s_(p.INICIO).slice(0, 10) : hoje;
  var existe = {};
  Ast_lerTudo_(AST_ABAS.OS).forEach(function (o) {
    var k = Ast_s_(o.RONDA_CHAVE); if (!k) return;
    var pausa = Ast_up_(o.SITUACAO) === 'CANCELADA' && AstRd_canceladaParaGerar_(o);
    if (!pausa) existe[k] = true;
  });
  var v = { cli: Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(p.CLIENTE_ID)], un: Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[Ast_s_(p.UNIDADE_ID)] };
  var tec = Ast_usuarios_()[Ast_s_(p.TECNICO_ID)];
  if (!v.cli || !v.un || !tec) return 0;
  var n = 0;
  AstRd_datasPrevistas_(p, de, ate).forEach(function (dia) {
    var chave = Ast_s_(p.ID) + '|' + dia;
    if (existe[chave]) return;
    var util = AstRd_diaUtil_(dia), quando = util + 'T' + (/^\d{2}:\d{2}/.test(Ast_s_(p.HORA)) ? Ast_s_(p.HORA).slice(0, 5) : '08:00') + ':00';
    if (Ast_ms_(quando) < Date.now()) return;
    AstRd_criarOs_(eu, { cli: v.cli, un: v.un, tec: tec, quando: quando, dur: Number(p.DURACAO_MIN) || 120, orientacao: p.ORIENTACAO, setores: Ast_json_(p.SETORES_JSON, []), planoId: p.ID, chave: chave, prevista: dia,
      janelaAte: Ast_somarDias_(util, Number(p.JANELA_DIAS) || 0), origem: 'contrato ' + Ast_s_(p.CODIGO) + ', ' + ((AST_RONDA_PERIODOS[Ast_up_(p.PERIODICIDADE)] || {}).nome || '').toLowerCase() });
    existe[chave] = true; n++;
  });
  Ast_atualizar_(AST_ABAS.RONDA_PLANOS, p.ID, { GERADO_ATE: ate, ATUALIZADO_EM: Ast_agora_() });
  return n;
}
/** d: { id?, clienteId, unidadeId, periodicidade, inicio, hora, duracaoMin, janelaDias, tecnicoId, setores[], orientacao, contratoRef, motivo } */
function AstRd_salvarPlano_(eu, d) {
  Ast_exigir_(eu, 'GESTAO', 'salvar o contrato de ronda');
  d = d || {};
  var acao = 'salvar o contrato de ronda', v = AstRd_unidade_(d.clienteId, d.unidadeId, acao), tec = AstRd_tecnico_(d.tecnicoId, acao);
  AstRd_tipo_();
  var per = Ast_up_(d.periodicidade);
  if (!AST_RONDA_PERIODOS[per]) throw new Error('Não foi possível ' + acao + ': escolha a periodicidade (semanal, quinzenal ou mensal)');
  var ini = Ast_s_(d.inicio).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ini)) throw new Error('Não foi possível ' + acao + ': informe a data da primeira ronda');
  var hora = /^\d{2}:\d{2}$/.test(Ast_s_(d.hora)) ? Ast_s_(d.hora) : '';
  if (!hora) throw new Error('Não foi possível ' + acao + ': informe a hora de início (ex.: 08:00)');
  var dur = Math.round(Ast_num_(d.duracaoMin) || 120), jan = Math.round(Ast_num_(d.janelaDias));
  if (!(dur >= 30 && dur <= 720)) throw new Error('Não foi possível ' + acao + ': a duração estimada vai de 30 minutos a 12 horas');
  if (!(jan >= 0 && jan <= 10)) jan = AST_RONDA_JANELA_PADRAO;
  var campos = { CLIENTE_ID: v.cli.ID, CLIENTE_NOME: Ast_clienteNome_(v.cli), UNIDADE_ID: v.un.ID, UNIDADE_NOME: Ast_s_(v.un.NOME_UNIDADE), PERIODICIDADE: per, INICIO: ini, HORA: hora, DURACAO_MIN: dur, JANELA_DIAS: jan,
    TECNICO_ID: tec.id, TECNICO_NOME: tec.nome, SETORES_JSON: JSON.stringify(AstRd_setoresFiltro_(d.setores)), ORIENTACAO: Ast_texto_(d.orientacao, 1500), CONTRATO_REF: Ast_texto_(d.contratoRef, 120),
    HORIZONTE_DIAS: AST_RONDA_HORIZONTE_DIAS, POR_ID: eu.id, POR_NOME: eu.nome, ATUALIZADO_EM: Ast_agora_() };
  var r = Ast_comTrava_(function () {
    var p;
    if (Ast_s_(d.id)) {
      p = Ast_porId_(AST_ABAS.RONDA_PLANOS, d.id);
      if (!p) throw new Error('Não foi possível ' + acao + ': o contrato não foi encontrado. Atualize a tela');
      if (Ast_up_(p.SITUACAO) === 'ENCERRADA') throw new Error('Não foi possível ' + acao + ': o contrato ' + p.CODIGO + ' está encerrado. Crie um contrato novo');
      var mudouAgenda = Ast_s_(p.INICIO).slice(0, 10) !== ini || Ast_up_(p.PERIODICIDADE) !== per || Ast_s_(p.HORA).slice(0, 5) !== hora;
      Ast_atualizar_(AST_ABAS.RONDA_PLANOS, p.ID, campos);
      if (mudouAgenda && Ast_up_(p.SITUACAO) === 'ATIVA') {
        var nc = AstRd_cancelarFuturas_(eu, p, AST_RONDA_ALTERADO_PREFIXO + ' (data, hora ou periodicidade): ' + (Ast_texto_(d.motivo, 200) || 'nova programação'));
        if (nc) Ast_evento_('RONDA_PLANO', p.ID, 'REPROGRAMADO', eu, Ast_plural_(nc, 'ronda futura cancelada', 'rondas futuras canceladas') + ' e geradas de novo com a programação nova', { numero: p.CODIGO });
      }
      Ast_evento_('RONDA_PLANO', p.ID, 'EDICAO', eu, 'Contrato de ronda alterado' + (Ast_texto_(d.motivo, 300) ? ': ' + Ast_texto_(d.motivo, 300) : '') + '. As rondas já agendadas continuam como estão (reagende uma a uma, se precisar)', { numero: p.CODIGO });
    } else {
      var seq = Ast_lerTudo_(AST_ABAS.RONDA_PLANOS).length + 1;
      p = Ast_inserir_(AST_ABAS.RONDA_PLANOS, Object.assign({ CODIGO: 'CR-' + Ast_hoje_().slice(0, 4) + '-' + ('000' + seq).slice(-4), SITUACAO: 'ATIVA', GERADO_ATE: '' }, campos));
      Ast_evento_('RONDA_PLANO', p.ID, 'CRIACAO', eu, 'Contrato de ronda criado: ' + AST_RONDA_PERIODOS[per].nome.toLowerCase() + ' a partir de ' + Ast_brDia_(ini + 'T00:00:00') + ' às ' + hora + ', responsável ' + tec.nome, { numero: p.CODIGO });
    }
    p = Ast_porId_(AST_ABAS.RONDA_PLANOS, p.ID);
    return { p: p, n: AstRd_gerarPlano_(eu, p) };
  });
  return { plano: AstRd_planoPublico_(Ast_porId_(AST_ABAS.RONDA_PLANOS, r.p.ID)), geradas: r.n,
    message: 'Contrato ' + r.p.CODIGO + ' salvo. ' + (r.n ? Ast_plural_(r.n, 'ronda gerada', 'rondas geradas') + ' na agenda dos próximos ' + AST_RONDA_HORIZONTE_DIAS + ' dias.' : 'Nenhuma ronda nova a gerar agora (as próximas nascem sozinhas na rotina).') };
}
function AstRd_cancelarFuturas_(eu, p, motivo) {
  var n = 0;
  Ast_ler_(AST_ABAS.OS).forEach(function (o) {
    if (Ast_s_(o.RONDA_PLANO_ID) !== Ast_s_(p.ID) || Ast_up_(o.SITUACAO) !== 'AGENDADA' || Ast_s_(o.SAIU_EM) || Ast_s_(o.CHEGOU_EM)) return;
    AstRd_cancelarOs_(eu, o, motivo); n++;
  });
  return n;
}
/** acao: PAUSAR | RETOMAR | ENCERRAR. d: { id, motivo } */
function AstRd_mudarPlano_(eu, acaoPlano, d) {
  var nomes = { PAUSAR: 'pausar a recorrência', RETOMAR: 'retomar a recorrência', ENCERRAR: 'encerrar a recorrência' }, acao = nomes[acaoPlano];
  Ast_exigir_(eu, 'GESTAO', acao);
  var p = Ast_porId_(AST_ABAS.RONDA_PLANOS, d && d.id);
  if (!p) throw new Error('Não foi possível ' + acao + ': o contrato não foi encontrado. Atualize a tela');
  var motivo = Ast_texto_(d && d.motivo, 500), s = Ast_up_(p.SITUACAO);
  if (motivo.length < 10) throw new Error('Não foi possível ' + acao + ': escreva o motivo (pelo menos 10 letras). Ele fica no histórico do contrato');
  if (s === 'ENCERRADA') throw new Error('Não foi possível ' + acao + ': o contrato ' + p.CODIGO + ' já está encerrado');
  if (acaoPlano === 'PAUSAR' && s !== 'ATIVA') throw new Error('Não foi possível pausar: o contrato ' + p.CODIGO + ' já está pausado');
  if (acaoPlano === 'RETOMAR' && s !== 'PAUSADA') throw new Error('Não foi possível retomar: o contrato ' + p.CODIGO + ' não está pausado');
  var r = Ast_comTrava_(function () {
    var n = 0, g = 0;
    if (acaoPlano === 'PAUSAR') { Ast_atualizar_(AST_ABAS.RONDA_PLANOS, p.ID, { SITUACAO: 'PAUSADA', PAUSADO_EM: Ast_agora_(), MOTIVO: motivo, ATUALIZADO_EM: Ast_agora_() }); n = AstRd_cancelarFuturas_(eu, p, AST_RONDA_PAUSA_PREFIXO + ': ' + motivo); }
    else if (acaoPlano === 'ENCERRAR') { Ast_atualizar_(AST_ABAS.RONDA_PLANOS, p.ID, { SITUACAO: 'ENCERRADA', ENCERRADO_EM: Ast_agora_(), MOTIVO: motivo, ATUALIZADO_EM: Ast_agora_() }); n = AstRd_cancelarFuturas_(eu, p, 'Contrato de ronda encerrado: ' + motivo); }
    else { Ast_atualizar_(AST_ABAS.RONDA_PLANOS, p.ID, { SITUACAO: 'ATIVA', PAUSADO_EM: '', MOTIVO: motivo, ATUALIZADO_EM: Ast_agora_() }); g = AstRd_gerarPlano_(eu, Ast_porId_(AST_ABAS.RONDA_PLANOS, p.ID)); }
    Ast_evento_('RONDA_PLANO', p.ID, acaoPlano, eu, (acaoPlano === 'PAUSAR' ? 'Recorrência pausada' : acaoPlano === 'ENCERRAR' ? 'Contrato encerrado' : 'Recorrência retomada') + ': ' + motivo, { numero: p.CODIGO });
    return { n: n, g: g };
  });
  return { plano: AstRd_planoPublico_(Ast_porId_(AST_ABAS.RONDA_PLANOS, p.ID)),
    message: acaoPlano === 'RETOMAR' ? 'Recorrência do contrato ' + p.CODIGO + ' retomada: ' + Ast_plural_(r.g, 'ronda gerada', 'rondas geradas') + '.' :
      (acaoPlano === 'PAUSAR' ? 'Recorrência do contrato ' + p.CODIGO + ' pausada' : 'Contrato ' + p.CODIGO + ' encerrado') + ': ' + Ast_plural_(r.n, 'ronda futura cancelada', 'rondas futuras canceladas') + ' (as já começadas continuam).' };
}
/** Rotina: gera as próximas rondas de todos os contratos ativos (sem duplicar). */
function AstRd_gerarTodos_() {
  var sis = Ast_sistema_('Rotina das rondas'), n = 0;
  Ast_ler_(AST_ABAS.RONDA_PLANOS).filter(function (p) { return Ast_up_(p.SITUACAO) === 'ATIVA'; }).forEach(function (p) {
    try { n += Ast_comTrava_(function () { return AstRd_gerarPlano_(sis, Ast_porId_(AST_ABAS.RONDA_PLANOS, p.ID)); }); } catch (e) { console.error('Ronda, contrato ' + p.CODIGO + ': ' + ((e && e.message) || e)); }
  });
  return { geradas: n };
}

// ------------------------------------------------------------
// SETORES (cadastro da unidade)
// ------------------------------------------------------------
function AstRd_salvarSetor_(eu, d) {
  Ast_exigir_(eu, 'GESTAO', 'cadastrar o setor');
  d = d || {};
  var v = AstRd_unidade_(d.clienteId, d.unidadeId, 'cadastrar o setor'), nome = Ast_texto_(d.nome, 120);
  if (nome.length < 2) throw new Error('Não foi possível cadastrar o setor: escreva o nome (ex.: CME, UTI adulto, Laboratório)');
  var k = AstRd_chaveSetor_(nome), ja = Ast_ler_(AST_ABAS.SETORES).filter(function (s) { return Ast_s_(s.UNIDADE_ID) === Ast_s_(v.un.ID) && AstRd_chaveSetor_(s.NOME) === k; })[0];
  if (ja) {
    Ast_atualizar_(AST_ABAS.SETORES, ja.ID, { NOME: nome, ATIVO: d.ativo === false ? 'NAO' : 'SIM', ORDEM: Ast_num_(d.ordem) || ja.ORDEM || '', POR_NOME: eu.nome, ATUALIZADO_EM: Ast_agora_() });
  } else Ast_inserir_(AST_ABAS.SETORES, { CLIENTE_ID: v.cli.ID, UNIDADE_ID: v.un.ID, NOME: nome, ORDEM: Ast_num_(d.ordem) || '', ATIVO: 'SIM', ORIGEM: 'TELA', POR_NOME: eu.nome, ATUALIZADO_EM: Ast_agora_() });
  return { setores: AstRd_setoresUnidade_(v.un.ID), message: 'Setor "' + nome + '" ' + (ja ? (d.ativo === false ? 'desativado' : 'atualizado') : 'cadastrado') + ' na unidade ' + Ast_s_(v.un.NOME_UNIDADE) + '.' };
}

// ------------------------------------------------------------
// DEPOIS DE ENCERRADA: CHAMADO AUTOMÁTICO, SUGESTÃO AO COMERCIAL, AVISOS, SETORES NOVOS (idempotente)
// ------------------------------------------------------------
/**
 * Revisão de 03/11/2026: tudo dentro da trava da Assistência, com a memória limpa e a O.S. lida de novo (duas execuções seguidas, ou a
 * rotina junto do encerramento, nunca abrem chamado em dobro); a marca "em andamento" vai antes dos chamados.
 */
function AstRd_posConclusao_(eu, osId) { return Ast_comTrava_(function () { Ast_memoLimpar_(); return AstRd_posConclusaoNaTrava_(eu, osId); }); }
function AstRd_posConclusaoNaTrava_(eu, osId) {
  var os = Ast_porId_(AST_ABAS.OS, osId);
  if (!os || !AstRd_ehRonda_(os) || Ast_up_(os.SITUACAO) !== 'ENCERRADA') return { feito: false };
  if (Ast_s_(os.RONDA_POS_EM)) return { feito: true, repetido: true, pos: AstRd_pos_(os) };
  var sis = Ast_sistema_('Ronda ' + os.NUMERO), pos = AstRd_pos_(os), L = AstRd_linhas_(os), avisos = [];
  pos.chamados = pos.chamados || {};
  pos.andamentoEm = pos.andamentoEm || Ast_agora_();
  Ast_atualizar_(AST_ABAS.OS, os.ID, { RONDA_POS_JSON: JSON.stringify(pos), ATUALIZADO_EM: Ast_agora_() });
  // 1) equipamento fora de uso ou com defeito: um chamado por equipamento, ligado à ronda (ORIGEM_REF RONDA:<os>:<chave>)
  var todos = Ast_lerTudo_(AST_ABAS.CHAMADOS);
  L.linhas.forEach(function (l) {
    if (!l.item || Ast_up_(l.item.situacao) !== 'FORA_USO' || pos.chamados[l.eq.chave]) return;
    var ref = 'RONDA:' + os.ID + ':' + l.eq.chave;
    var ja = todos.filter(function (c) { return Ast_s_(c.ORIGEM_REF) === ref; })[0];
    if (ja) { pos.chamados[l.eq.chave] = { id: ja.ID, numero: ja.NUMERO, novo: true }; return; }
    var eqId = Ast_s_(l.item.equipamentoId) || Ast_s_(l.eq.id), eq = eqId ? Ast_mapa_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS)[eqId] : null;
    if (eq && (Ast_s_(eq.CLIENTE_ID) !== Ast_s_(os.CLIENTE_ID) || Ast_s_(eq.UNIDADE_ID) !== Ast_s_(os.UNIDADE_ID))) { eq = null; eqId = ''; }
    var fotosTxt = l.fotos.length ? ' Fotos na ronda ' + os.NUMERO + ': ' + l.fotos.length + '.' : '';
    var limitado = Ast_up_(l.item.parada) === 'PARCIAL', cfg = AstRd_cfg_();
    var sintoma = 'Encontrado na ronda de engenharia clínica ' + os.NUMERO + ' (' + Ast_brDia_(os.CHEGOU_EM) + ', setor ' + l.setor + '), ' + (limitado ? 'funciona com defeito ou limitação' : 'parado, não pode ser usado') + ': ' + Ast_s_(l.item.descricao) + '.' + fotosTxt;
    var aberto = eq ? todos.filter(function (c) { return Ast_s_(c.EQUIPAMENTO_ID) === eqId && Ast_s_(c.CLIENTE_ID) === Ast_s_(os.CLIENTE_ID) && AST_TERMINAIS.indexOf(Ast_up_(c.SITUACAO)) < 0 && !Ast_excluido_(c); })[0] : null;
    if (aberto) {
      Ast_evento_('CHAMADO', aberto.ID, 'RONDA', sis, 'Achado da ronda ' + os.NUMERO + ': ' + sintoma, { numero: aberto.NUMERO });
      pos.chamados[l.eq.chave] = { id: aberto.ID, numero: aberto.NUMERO, novo: false };
      return;
    }
    try {
      var r = AstC_abrir_(sis, { clienteId: os.CLIENTE_ID, unidadeId: os.UNIDADE_ID, equipamentoId: eq ? eqId : '', equipNaoIdentificado: !eq, equipamentoDescricao: eq ? '' : AstRd_eqTexto_(l.eq) + ' · setor ' + l.setor,
        sintoma: sintoma, solicitante: Ast_s_(os.ASSINATURA_NOME) || Ast_s_(os.SEM_ASSINATURA_RECEBIDO_POR) || 'Ronda de engenharia clínica', contato: '', prioridade: limitado ? cfg.prioridadeLimitado : cfg.prioridadeParado, parada: limitado ? 'PARCIAL' : 'TOTAL', canal: 'RONDA', origemRef: ref, confirmarDuplicado: true },
        { sistema: true, porNome: 'Ronda ' + os.NUMERO });
      var c = r.chamado;
      if (l.fotos.length) Ast_evento_('CHAMADO', c.id, 'FOTOS_RONDA', sis, 'Fotos do achado (ronda ' + os.NUMERO + '): ' + l.fotos.map(function (f) { return Ast_s_(f.URL); }).join(' '), { numero: c.numero });
      pos.chamados[l.eq.chave] = { id: c.id, numero: c.numero, novo: true };
      todos.push({ ID: c.id, NUMERO: c.numero, ORIGEM_REF: ref, EQUIPAMENTO_ID: eqId, SITUACAO: 'ABERTO' });
    } catch (e) { avisos.push('chamado de ' + AstRd_eqTexto_(l.eq) + ' não aberto: ' + String((e && e.message) || e)); }
  });
  // 2) calibração ou qualificação vencida: uma sugestão ao Comercial por ronda (nunca orçamento)
  if (!Ast_s_(pos.sugestaoId)) {
    var itens = [];
    L.linhas.forEach(function (l) { AstRd_vencimentos_(l).forEach(function (v) { itens.push({ chave: l.eq.chave, equipamentoId: Ast_s_(l.item && l.item.equipamentoId) || l.eq.id, texto: AstRd_eqTexto_(l.eq), setor: l.setor, servico: v.servico, motivo: v.motivo }); }); });
    if (itens.length) { try { pos.sugestaoId = AstRd_criarSugestao_(os, itens); } catch (eS) { avisos.push('sugestão ao Comercial não registrada: ' + String((eS && eS.message) || eS)); } }
  }
  // 3) setor acrescentado em campo vira cadastro da unidade
  var reg = AstRd_registro_(os), cad = AstRd_setoresCadastrados_(os.UNIDADE_ID).map(function (s) { return AstRd_chaveSetor_(s.NOME); });
  pos.setores = pos.setores || [];
  Object.keys(reg.setores).forEach(function (k) { var s = reg.setores[k]; if (s && s.extra && cad.indexOf(k) < 0 && pos.setores.indexOf(k) < 0) { Ast_inserir_(AST_ABAS.SETORES, { CLIENTE_ID: os.CLIENTE_ID, UNIDADE_ID: os.UNIDADE_ID, NOME: s.nome, ATIVO: 'SIM', ORIGEM: 'RONDA ' + os.NUMERO, POR_NOME: Ast_s_(s.por), ATUALIZADO_EM: Ast_agora_() }); pos.setores.push(k); } });
  pos.avisos = avisos;
  Ast_atualizar_(AST_ABAS.OS, os.ID, { RONDA_POS_EM: Ast_agora_(), RONDA_POS_JSON: JSON.stringify(pos), ATUALIZADO_EM: Ast_agora_() });
  var res = AstRd_resumo_(Ast_porId_(AST_ABAS.OS, os.ID)), nCh = Object.keys(pos.chamados).length;
  Ast_evento_('OS', os.ID, 'RONDA_POS', sis, 'Ronda encerrada: ' + res.equipamentos + ' equipamento(s), ' + res.problemas + ' com problema, ' + Ast_plural_(nCh, 'chamado ligado', 'chamados ligados') + (pos.sugestaoId ? ', sugestão ao Comercial registrada' : '') + (avisos.length ? '. Atenção: ' + avisos.join('; ') : ''), { numero: os.NUMERO });
  // 4) aviso à gestão da área Técnica
  Ast_avisar_(Ast_gestoresTecnica_(), 'RONDA_CONCLUIDA', 'Ronda concluída: ' + os.NUMERO + ' · ' + Ast_s_(os.CLIENTE_NOME), Ast_s_(os.UNIDADE_NOME) + ': ' + res.equipamentos + ' equipamento(s); ' + res.porSituacao.FORA_USO + ' fora de uso, ' + res.porSituacao.OBSERVACAO + ' com observação, ' +
    res.porSituacao.NAO_LOCALIZADO + ' não localizado(s), ' + res.porSituacao.NAO_VERIFICADO + ' não verificado(s). ' + (nCh ? Ast_plural_(nCh, 'chamado', 'chamados') + ' a partir da ronda: ' + Object.keys(pos.chamados).map(function (k) { return pos.chamados[k].numero; }).join(', ') + '. ' : '') +
    'Veja em Assistência técnica > Rondas.', os.ID, { evento: 'AT20' });
  return { feito: true, pos: pos };
}
/** Sugestão de oportunidade (Comercial, COM_IA_SUGESTOES TIPO RONDA_OPORTUNIDADE). Idempotente pela ronda. */
function AstRd_criarSugestao_(os, itens) {
  if (typeof COM_ABAS === 'undefined' || !COM_ABAS.SUGESTOES) throw new Error('o Comercial não está disponível neste servidor');
  try { if (typeof CertCal_garantirTabela_ === 'function' && typeof COM_COLUNAS !== 'undefined') CertCal_garantirTabela_(COM_ABAS.SUGESTOES, COM_COLUNAS.COM_IA_SUGESTOES); } catch (e) {}
  var ja = Ast_lerCru_(COM_ABAS.SUGESTOES).filter(function (s) { return Ast_up_(s.TIPO) === 'RONDA_OPORTUNIDADE' && Ast_s_(s.PROPOSTA_ID) === 'RONDA:' + os.ID; })[0];
  if (ja) return Ast_s_(ja.ID);
  var servicos = itens.map(function (i) { return i.servico; }).filter(function (s, i, l) { return l.indexOf(s) === i; });
  var r = SGO_DATA.insert(COM_ABAS.SUGESTOES, { TIPO: 'RONDA_OPORTUNIDADE', REGRA: 'RONDA', USUARIO_ID: '', OPORTUNIDADE_ID: '', PROPOSTA_ID: 'RONDA:' + os.ID, ORIGEM: 'RONDA',
    TITULO: servicos.join(' e ') + ' vencida na ronda: ' + Ast_s_(os.CLIENTE_NOME) + ' (' + Ast_s_(os.UNIDADE_NOME) + ')',
    CONTEUDO_JSON: JSON.stringify({ osId: os.ID, osNumero: os.NUMERO, clienteId: os.CLIENTE_ID, clienteNome: os.CLIENTE_NOME, unidadeId: os.UNIDADE_ID, unidadeNome: os.UNIDADE_NOME, em: Ast_agora_(), itens: itens }),
    VERIFICACAO: '', DECISAO: '', DECISAO_EM: '', DECISAO_MOTIVO: '', DIA: Ast_hoje_(), CRIADO_EM: Ast_agora_() });
  var para = (typeof AstR_comercialPara_ === 'function' ? AstR_comercialPara_() : []).concat(Ast_diretoria_());
  Ast_avisar_(para, 'RONDA_SUGESTAO', 'Sugestão da ronda ' + os.NUMERO + ': ' + servicos.join(' e ').toLowerCase() + ' vencida', Ast_s_(os.CLIENTE_NOME) + ' · ' + Ast_s_(os.UNIDADE_NOME) + ': ' + itens.length + ' equipamento(s) (' +
    itens.slice(0, 4).map(function (i) { return i.texto + ', ' + i.motivo; }).join('; ') + (itens.length > 4 ? '; ...' : '') + '). Aceite para criar a oportunidade ou descarte com o motivo em Assistência técnica > Rondas > Sugestões ao Comercial. Nenhum orçamento é criado sozinho.', r.ID, { evento: 'AT21' });
  return Ast_s_(r.ID);
}
function AstRd_podeSugestao_(eu) { return !!(eu && (eu.comercial || eu.diretoria || eu.admin)); }
function AstRd_sugestaoPublica_(s) {
  var c = Ast_json_(s.CONTEUDO_JSON, {}) || {};
  return { id: Ast_s_(s.ID), titulo: Ast_s_(s.TITULO), osId: Ast_s_(c.osId), osNumero: Ast_s_(c.osNumero), clienteId: Ast_s_(c.clienteId), clienteNome: Ast_s_(c.clienteNome), unidadeId: Ast_s_(c.unidadeId), unidadeNome: Ast_s_(c.unidadeNome),
    itens: c.itens || [], decisao: Ast_up_(s.DECISAO), decisaoNome: { '': 'Aguardando o Comercial', ACEITA: 'Aceita (oportunidade criada)', DESCARTADA: 'Descartada' }[Ast_up_(s.DECISAO)] || Ast_s_(s.DECISAO),
    decisaoMotivo: Ast_s_(s.DECISAO_MOTIVO), decisaoEm: Ast_br_(s.DECISAO_EM), oportunidadeId: Ast_s_(s.OPORTUNIDADE_ID), em: Ast_br_(s.CRIADO_EM),
    contatos: Ast_ler_('CAD_CONTATOS').filter(function (k) { return Ast_s_(k.CLIENTE_ID) === Ast_s_(c.clienteId) && Ast_up_(k.STATUS || 'ATIVO') === 'ATIVO'; }).map(function (k) { return { id: Ast_s_(k.ID), nome: Ast_s_(k.NOME) + (Ast_s_(k.CARGO) ? ' (' + Ast_s_(k.CARGO) + ')' : '') }; }) };
}
function AstRd_sugestoes_(eu, f) {
  if (!AstRd_podeSugestao_(eu) && !eu.gestao) throw new Error('Não foi possível abrir: as sugestões da ronda ao Comercial são do Comercial, da Diretoria, do Administrador e da gestão da área Técnica');
  if (typeof COM_ABAS === 'undefined') return { sugestoes: [], podeDecidir: false };
  var l = Ast_lerCru_(COM_ABAS.SUGESTOES).filter(function (s) { return Ast_up_(s.TIPO) === 'RONDA_OPORTUNIDADE' && (!(f && f.pendentes) || !Ast_s_(s.DECISAO)); })
    .sort(function (a, b) { return String(b.CRIADO_EM).localeCompare(String(a.CRIADO_EM)); }).slice(0, 100);
  return { sugestoes: l.map(AstRd_sugestaoPublica_), podeDecidir: AstRd_podeSugestao_(eu) };
}
/** d: { id, decisao: ACEITAR|DESCARTAR, motivo, contatoId, valor, titulo, proximaAcao, proximaData } */
function AstRd_decidirSugestao_(eu, d) {
  if (!AstRd_podeSugestao_(eu)) throw new Error('Não foi possível decidir: a sugestão da ronda é aceita ou descartada pelo Comercial ou pela Diretoria');
  d = d || {};
  var s = typeof COM_ABAS !== 'undefined' ? SGO_DATA.getById(COM_ABAS.SUGESTOES, Ast_s_(d.id)) : null;
  if (!s || Ast_up_(s.TIPO) !== 'RONDA_OPORTUNIDADE') throw new Error('Não foi possível decidir: a sugestão não foi encontrada. Atualize a lista');
  if (Ast_s_(s.DECISAO)) throw new Error('Não foi possível decidir: esta sugestão já foi ' + (Ast_up_(s.DECISAO) === 'ACEITA' ? 'aceita' : 'descartada') + ' em ' + Ast_br_(s.DECISAO_EM));
  var p = AstRd_sugestaoPublica_(s), dec = Ast_up_(d.decisao), agora = Ast_agora_();
  if (dec === 'DESCARTAR') {
    var mot = Ast_texto_(d.motivo, 500);
    if (AstRd_letras_(mot) < 10) throw new Error('Não foi possível descartar: escreva o motivo (pelo menos 10 letras), por exemplo "o cliente calibra com outro fornecedor, contrato até 2027"');
    SGO_DATA.update(COM_ABAS.SUGESTOES, s.ID, { DECISAO: 'DESCARTADA', DECISAO_EM: agora, DECISAO_MOTIVO: mot + ' (' + eu.nome + ')' });
    Ast_evento_('OS', p.osId, 'RONDA_SUGESTAO', eu, 'Sugestão ao Comercial descartada: ' + mot, { numero: p.osNumero });
    return { message: 'Sugestão descartada. O motivo fica registrado.' };
  }
  if (dec !== 'ACEITAR') throw new Error('Não foi possível decidir: escolha aceitar ou descartar');
  if (typeof ComOpo_salvar_ !== 'function' || typeof Com_eu_ !== 'function') throw new Error('Não foi possível aceitar: o Comercial não está disponível neste servidor. Atualize a página (F5) e tente de novo');
  var euC = Com_eu_(eu.sessionId);
  var r = ComOpo_salvar_(euC, eu.sessionId, { titulo: Ast_texto_(d.titulo, 200) || p.titulo, clienteId: p.clienteId, unidadeId: p.unidadeId, contatoId: d.contatoId,
    equipamentos: p.itens.map(function (i) { return i.equipamentoId; }).filter(Boolean).filter(function (x, i, l) { return l.indexOf(x) === i; }), funil: 'ENGENHARIA', origem: 'Vencimento de calibração ou qualificação',
    valor: d.valor, chance: 'MEDIA', origemRef: 'RONDA:' + p.osNumero, observacoes: 'Sugestão da ronda de engenharia clínica ' + p.osNumero + ':\n' + p.itens.map(function (i) { return '- ' + i.texto + ' (' + i.setor + '): ' + i.motivo; }).join('\n'),
    proxima: { acao: Ast_texto_(d.proximaAcao, 300) || 'Falar com o cliente sobre ' + p.itens.length + ' equipamento(s) com calibração ou qualificação vencida (ronda ' + p.osNumero + ')', data: d.proximaData, hora: '10:00', tipo: 'LIGACAO' } });
  var op = r && r.oportunidade ? r.oportunidade : {};
  SGO_DATA.update(COM_ABAS.SUGESTOES, s.ID, { DECISAO: 'ACEITA', DECISAO_EM: agora, DECISAO_MOTIVO: 'Oportunidade ' + Ast_s_(op.codigo || op.CODIGO) + ' criada por ' + eu.nome, OPORTUNIDADE_ID: Ast_s_(op.id || op.ID) });
  Ast_evento_('OS', p.osId, 'RONDA_SUGESTAO', eu, 'Sugestão ao Comercial aceita: oportunidade ' + Ast_s_(op.codigo || op.CODIGO), { numero: p.osNumero });
  return { message: (r && r.message) || 'Oportunidade criada.' };
}

// ------------------------------------------------------------
// RELATÓRIO A4 (versão do cliente e versão interna)
// ------------------------------------------------------------
function AstRd_rondaAnterior_(os) {
  var l = Ast_ler_(AST_ABAS.OS).filter(function (o) { return Ast_s_(o.ID) !== Ast_s_(os.ID) && Ast_s_(o.UNIDADE_ID) === Ast_s_(os.UNIDADE_ID) && Ast_up_(o.SITUACAO) === 'ENCERRADA' && AstRd_ehRonda_(o) && String(o.CHEGOU_EM || o.AGENDADO_PARA) < String(os.CHEGOU_EM || os.AGENDADO_PARA || '9'); })
    .sort(function (a, b) { return String(b.CHEGOU_EM || b.AGENDADO_PARA).localeCompare(String(a.CHEGOU_EM || a.AGENDADO_PARA)); });
  return l[0] || null;
}
/** Comparação com a ronda anterior da unidade, por equipamento: melhorou, continua pendente, achado novo. */
function AstRd_comparacao_(os, linhas) {
  var ant = AstRd_rondaAnterior_(os);
  if (!ant) return null;
  var antL = AstRd_linhas_(ant).linhas, porEq = {};
  antL.forEach(function (l) { porEq[Ast_s_(l.item && l.item.equipamentoId) || l.eq.id || l.eq.chave] = l; });
  var r = { numero: ant.NUMERO, em: Ast_brDia_(ant.CHEGOU_EM || ant.AGENDADO_PARA), melhorou: [], pendente: [], novo: [] };
  var prob = function (l) { return !!(l && l.item && AST_RONDA_PROBLEMAS.indexOf(Ast_up_(l.item.situacao)) >= 0); };
  linhas.forEach(function (l) {
    var a = porEq[Ast_s_(l.item && l.item.equipamentoId) || l.eq.id || l.eq.chave], pA = prob(a), pN = prob(l), x = { texto: AstRd_eqTexto_(l.eq), setor: l.setor, antes: a && a.item ? AST_RONDA_SITUACOES[Ast_up_(a.item.situacao)] || '—' : '—', agora: l.item ? AST_RONDA_SITUACOES[Ast_up_(l.item.situacao)] || '—' : '—' };
    if (pA && !pN && l.item && Ast_up_(l.item.situacao) === 'FUNCIONANDO') r.melhorou.push(x); else if (pA && pN) r.pendente.push(x); else if (!pA && pN) r.novo.push(x);
  });
  return r;
}
function AstRd_prioridade_(l) {
  var s = l.item ? Ast_up_(l.item.situacao) : '';
  if (s === 'FORA_USO') return { n: 1, nome: 'Alta', rec: 'Manter fora de uso até o atendimento técnico' };
  if (AstRd_vencimentos_(l).length) return { n: 1, nome: 'Alta', rec: 'Programar a ' + AstRd_vencimentos_(l).map(function (v) { return v.servico.toLowerCase(); }).join(' e ') + ' antes de seguir usando' };
  if (s === 'OBSERVACAO') return { n: 2, nome: 'Média', rec: 'Acompanhar e corrigir o apontado; reavaliar na próxima ronda' };
  if (s === 'NAO_LOCALIZADO') return { n: 2, nome: 'Média', rec: 'Confirmar onde está o equipamento ou a baixa do cadastro' };
  if (s === 'NAO_VERIFICADO') return { n: 3, nome: 'Baixa', rec: 'Verificar na próxima ronda' };
  return null;
}
function AstRd_fotoB64_(f, cliente) {
  try {
    var id = cliente && Ast_s_(f.RELATORIO_ARQUIVO_ID) ? f.RELATORIO_ARQUIVO_ID : f.ARQUIVO_ID;
    var b = DriveApp.getFileById(String(id)).getBlob(), bytes = b.getBytes();
    if (bytes.length > 900 * 1024) return null;
    return { base64: Utilities.base64Encode(bytes), mimeType: b.getContentType() || 'image/jpeg' };
  } catch (e) { return null; }
}
/** HTML A4 da ronda. publico: CLIENTE | INTERNO. meta: { marca, versao, revisao, rascunho } */
function AstRd_html_(os, publico, meta) {
  meta = meta || {};
  var cliente = publico === 'CLIENTE', fotos = AstO_fotos_(os.ID), L = AstRd_linhas_(os, fotos), res = AstRd_resumo_(os, fotos), reg = L.registro, pos = AstRd_pos_(os);
  var cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(os.CLIENTE_ID)] || {}, plano = Ast_s_(os.RONDA_PLANO_ID) ? Ast_porId_(AST_ABAS.RONDA_PLANOS, os.RONDA_PLANO_ID) : null;
  var visivel = function (f) { return !cliente || Ast_up_(f.PUBLICO) === 'SIM'; };
  var corpo = '', versaoTxt = cliente ? 'versão do cliente' : 'uso interno da Metrolabs';
  if (meta.rascunho) corpo += RelA4_caixa_('RASCUNHO: a ronda ainda não foi encerrada' + (Ast_s_(os.FALTAS) ? ' (falta: ' + Ast_s_(os.FALTAS) + ')' : '') + '. Este documento não vale como relatório final.', 'aviso');
  if (!cliente) corpo += RelA4_caixa_('Uso interno da Metrolabs: traz a linha do tempo, as sugestões ao Comercial e as fotos não liberadas. O cliente recebe a versão do cliente.', 'aviso');
  // 1. resumo em números
  var nCh = Object.keys(pos.chamados || {}).length;
  corpo += RelA4_secao_('Resumo em números', RelA4_kpis_([[String(res.setores), 'Setores percorridos'], [String(res.equipamentos), 'Equipamentos na ronda'], [String(res.porSituacao.FUNCIONANDO), 'Em funcionamento', 'ok'],
    [String(res.porSituacao.OBSERVACAO), 'Com observação', res.porSituacao.OBSERVACAO ? 'aviso' : ''], [String(res.porSituacao.FORA_USO), 'Fora de uso ou com defeito', res.porSituacao.FORA_USO ? 'critico' : ''],
    [String(res.porSituacao.NAO_LOCALIZADO), 'Não localizados', res.porSituacao.NAO_LOCALIZADO ? 'aviso' : ''], [String(res.porSituacao.NAO_VERIFICADO), 'Não verificados', ''], [String(nCh), 'Chamados a partir da ronda', nCh ? 'aviso' : '']]) +
    '<p>' + Ast_esc_('Ronda de engenharia clínica na unidade ' + Ast_s_(os.UNIDADE_NOME) + (Ast_s_(os.CHEGOU_EM) ? ', em ' + Ast_brDia_(os.CHEGOU_EM) : '') + ', com ' + Ast_s_(os.TECNICO_NOME) + '. ' + res.verificados + ' de ' + res.equipamentos + ' equipamentos verificados no local' +
      (res.vencidos ? '; ' + res.vencidos + ' com calibração ou qualificação vencida ou com etiqueta inválida' : '') + (res.novos ? '; ' + res.novos + ' cadastrado(s) durante a ronda' : '') + '.') + '</p>');
  // 2. identificação
  var linhaHora = function (srv, ap) { var t = Ast_br_(srv); var a = Ast_ms_(ap), b = Ast_ms_(srv); if (t && a !== null && b !== null && Math.abs(a - b) > 5 * 60000) t += ' (no aparelho: ' + Ast_br_(ap) + ')'; return t; };
  corpo += RelA4_secao_('Identificação', RelA4_identificacao_([['Cliente', Ast_s_(os.CLIENTE_NOME) || Ast_clienteNome_(cli), { largo: true }], ['CNPJ', Ast_s_(cli.CNPJ)], ['Unidade', Ast_s_(os.UNIDADE_NOME)],
    ['Endereço', Ast_s_(os.ENDERECO), { largo: true }], ['Responsável pela ronda', Ast_s_(os.TECNICO_NOME)], ['Agendada para', Ast_br_(os.AGENDADO_PARA)], ['Chegada', linhaHora(os.CHEGOU_EM, os.CHEGOU_EM_APARELHO) || '—'],
    ['Conclusão', linhaHora(os.CONCLUIU_EM, os.CONCLUIU_EM_APARELHO) || '—'], ['Programação', plano ? 'Contrato ' + Ast_s_(plano.CODIGO) + ' (' + ((AST_RONDA_PERIODOS[Ast_up_(plano.PERIODICIDADE)] || {}).nome || '').toLowerCase() + ') · ' + AST_RONDA_INCLUIDA : 'Ronda avulsa']]
    .filter(function (p) { return Ast_s_(p[1]); })));
  // 3. setor a setor
  var porSetor = {};
  L.linhas.forEach(function (l) { (porSetor[l.setorChave] = porSetor[l.setorChave] || []).push(l); });
  var sec = '', nFig = 0, naoLib = 0;
  L.escopo.setores.forEach(function (s) {
    var ls = porSetor[s.chave] || [], so = reg.setores[s.chave] || {};
    var tab = RelA4_tabela_([{ t: 'Equipamento' }, { t: 'TAG / série' }, { t: 'Situação' }, { t: 'Observações' }], ls.map(function (l) {
      var it = l.item || {}, nao = l.perguntas.filter(function (p) { return p.tipo === 'SIM_NAO' && Ast_up_((it.respostas || {})[p.id]) === 'NAO'; }).map(function (p) { return p.texto.replace(/\?$/, ''); });
      var obs = [Ast_up_(it.situacao) === 'FORA_USO' && AST_RONDA_PARADAS[Ast_up_(it.parada)] ? AST_RONDA_PARADAS[Ast_up_(it.parada)] : '', it.descricao, it.motivo ? 'Motivo: ' + it.motivo : '', nao.length ? 'Verificação com "Não": ' + nao.join('; ') : '', AstRd_vencimentos_(l).map(function (v) { return v.motivo; }).join('; '), l.eq.novo ? 'Cadastrado durante a ronda' : ''].map(function (t) { return Ast_s_(t).replace(/[.\s]+$/, ''); }).filter(Boolean).join('. ');
      return [[l.eq.tipo, l.eq.modelo].filter(Boolean).join(' · ') || 'Equipamento', [l.eq.tag ? 'TAG ' + l.eq.tag : '', l.eq.serie ? 'Série ' + l.eq.serie : '', l.eq.patrimonio ? 'Pat. ' + l.eq.patrimonio : ''].filter(Boolean).join(' · ') || '—',
        AST_RONDA_SITUACOES[Ast_up_(it.situacao)] || 'Sem registro', obs || '—'];
    }), { vazio: 'Nenhum equipamento neste setor.' });
    var fs = fotos.filter(function (f) { var p = Ast_s_(f.PERGUNTA_ID); return p === 'ronda:setor:' + s.chave || ls.some(function (l) { return p === 'ronda:' + l.eq.chave; }); });
    naoLib += fs.filter(function (f) { return !visivel(f); }).length;
    var lf = [];
    fs.filter(visivel).slice(0, 8).forEach(function (f) { var b = AstRd_fotoB64_(f, cliente); if (b) { nFig++; lf.push({ base64: b.base64, mimeType: b.mimeType, legenda: (Ast_s_(f.LEGENDA) || 'Foto da ronda') + ' · ' + Ast_br_(f.TIRADA_EM || f.RECEBIDA_EM) }); } });
    sec += RelA4_subsecao_('Setor: ' + s.nome, tab + (so.achados ? '<p><b>Achados gerais do setor.</b> ' + Ast_esc_(so.achados) + '</p>' : '') + (lf.length && typeof SGO_DocA4_fotos_ === 'function' ? SGO_DocA4_fotos_(lf) : ''));
  });
  corpo += RelA4_secao_('Setor a setor', sec + (naoLib && cliente ? '<p class="nota">' + naoLib + ' foto(s) desta ronda ficaram de fora desta versão (não liberadas pela Metrolabs).</p>' : ''));
  // 4. perguntas fixas por tipo de equipamento
  var resp = [];
  L.linhas.forEach(function (l) { if (!l.perguntas.length || !l.item) return; var r = l.item.respostas || {}; l.perguntas.forEach(function (p) { var v = r[p.id]; if (v === undefined) return; resp.push([AstRd_eqTexto_(l.eq), p.texto, p.tipo === 'SIM_NAO' ? ({ SIM: 'Sim', NAO: 'Não', NA: 'Não se aplica' }[Ast_up_(v)] || v) : (p.tipo === 'NUMERO' ? Ast_fmtNum_(Number(v), 1) : String(v))]); }); });
  if (resp.length) corpo += RelA4_secao_('Verificações por tipo de equipamento', RelA4_tabela_([{ t: 'Equipamento' }, { t: 'Verificação' }, { t: 'Resposta' }], resp, { legenda: 'Autoclave, lavadora, câmara fria ou refrigerador e seladora' }));
  // 5. achados e recomendações com prioridade
  var ach = L.linhas.map(function (l) { var p = AstRd_prioridade_(l); return p ? { p: p, l: l } : null; }).filter(Boolean).sort(function (a, b) { return a.p.n - b.p.n; });
  corpo += RelA4_secao_('Achados e recomendações', RelA4_tabela_([{ t: 'Prioridade' }, { t: 'Equipamento' }, { t: 'Setor' }, { t: 'Achado' }, { t: 'Recomendação' }], ach.map(function (a) {
    var ch = (pos.chamados || {})[a.l.eq.chave];
    return [a.p.nome, AstRd_eqTexto_(a.l.eq), a.l.setor, [AST_RONDA_SITUACOES[Ast_up_(a.l.item && a.l.item.situacao)] || '', Ast_s_(a.l.item && (a.l.item.descricao || a.l.item.motivo))].concat(AstRd_vencimentos_(a.l).map(function (v) { return v.motivo; })).filter(Boolean).join(': '),
      a.p.rec + (ch ? ' (chamado ' + ch.numero + ')' : '')];
  }), { vazio: 'Nenhum achado: todos os equipamentos verificados estavam em funcionamento.' }));
  // 6. chamados abertos a partir da ronda
  var chs = Object.keys(pos.chamados || {}).filter(function (k) { var c = Ast_porId_(AST_ABAS.CHAMADOS, pos.chamados[k].id); return !c || Ast_s_(c.CLIENTE_ID) === Ast_s_(os.CLIENTE_ID); }).map(function (k) { var x = pos.chamados[k], c = Ast_porId_(AST_ABAS.CHAMADOS, x.id) || {}; return [x.numero, Ast_s_(c.EQUIPAMENTO_TEXTO), x.novo ? 'Aberto pela ronda' : 'Achado registrado no chamado que já estava aberto', AST_SITUACOES[Ast_up_(c.SITUACAO)] || '—']; });
  corpo += RelA4_secao_('Chamados abertos a partir da ronda', RelA4_tabela_([{ t: 'Chamado' }, { t: 'Equipamento' }, { t: 'Origem' }, { t: 'Situação' }], chs, { vazio: meta.rascunho ? 'Os chamados são abertos quando a ronda é encerrada.' : 'Nenhum equipamento fora de uso ou com defeito.' }));
  // 7. comparação com a ronda anterior
  var cmp = AstRd_comparacao_(os, L.linhas);
  corpo += RelA4_secao_('Comparação com a ronda anterior', cmp ? '<p>' + Ast_esc_('Ronda anterior: ' + cmp.numero + ' (' + cmp.em + '). Melhorou: ' + cmp.melhorou.length + '; continua pendente: ' + cmp.pendente.length + '; achado novo: ' + cmp.novo.length + '.') + '</p>' +
    RelA4_tabela_([{ t: 'Resultado' }, { t: 'Equipamento' }, { t: 'Setor' }, { t: 'Antes' }, { t: 'Agora' }], [].concat(cmp.melhorou.map(function (x) { return ['Melhorou', x.texto, x.setor, x.antes, x.agora]; }), cmp.pendente.map(function (x) { return ['Continua pendente', x.texto, x.setor, x.antes, x.agora]; }),
      cmp.novo.map(function (x) { return ['Achado novo', x.texto, x.setor, x.antes, x.agora]; })), { vazio: 'Sem mudança entre as duas rondas.' }) : '<p class="nota">Primeira ronda registrada nesta unidade no SGO+.</p>');
  // 8. orientações e pedidos
  corpo += RelA4_secao_('Orientações dadas e pedidos do cliente', (reg.orientacoes ? RelA4_subsecao_('Orientações dadas à equipe', RelA4_paragrafos_(reg.orientacoes)) : '') + (reg.pedidosCliente ? RelA4_subsecao_('Pedidos do cliente', RelA4_paragrafos_(reg.pedidosCliente)) : '') +
    (!reg.orientacoes && !reg.pedidosCliente ? '<p class="nota">Nenhuma orientação ou pedido registrado.</p>' : ''));
  // 9. assinaturas
  var img = Ast_s_(os.ASSINATURA_ARQUIVO_ID) ? AstR_b64Arquivo_(os.ASSINATURA_ARQUIVO_ID) : null;
  var ass = [{ papel: 'Responsável do cliente', nome: Ast_s_(os.ASSINATURA_NOME) || Ast_s_(os.SEM_ASSINATURA_RECEBIDO_POR) || ' ', cargo: Ast_s_(os.ASSINATURA_DOCUMENTO) || (Ast_s_(os.SEM_ASSINATURA_MOTIVO) ? 'Sem assinatura: ' + (AST_MOTIVOS_SEM_ASSINATURA[Ast_up_(os.SEM_ASSINATURA_MOTIVO)] || '') : ''), imagemBase64: img ? { mimeType: 'image/png', data: img.data } : null }];
  var assTec = AstR_assinaturaColab_(os, 'Responsável técnico pela ronda (Metrolabs)');
  if (assTec) ass.push(assTec);
  corpo += RelA4_secao_('Assinaturas', (typeof SGO_DocA4_assinaturas_ === 'function' ? SGO_DocA4_assinaturas_(ass) : '') + (Ast_s_(os.SEM_ASSINATURA_JUSTIFICATIVA) ? '<p class="nota">Justificativa da falta de assinatura: ' + Ast_esc_(os.SEM_ASSINATURA_JUSTIFICATIVA) + '</p>' : '') + AstR_notaAssinaturas_(os));
  // 10. só interno
  if (!cliente) {
    var sug = '';
    if (pos.sugestaoId && typeof COM_ABAS !== 'undefined') { try { var sg = SGO_DATA.getById(COM_ABAS.SUGESTOES, pos.sugestaoId); if (sg) { var sp = AstRd_sugestaoPublica_(sg); sug = sp.titulo + ' · ' + sp.decisaoNome + (sp.decisaoMotivo ? ': ' + sp.decisaoMotivo : ''); } } catch (eS) {} }
    corpo += RelA4_secao_('Uso interno', RelA4_identificacao_([['Sugestão ao Comercial', sug || 'Nenhuma', { largo: true }], ['Fotos não liberadas ao cliente', String(fotos.filter(function (f) { return Ast_up_(f.PUBLICO) !== 'SIM'; }).length)]].concat((pos.avisos || []).length ? [['Avisos do pós-processamento', pos.avisos.join('; '), { largo: true }]] : [])));
    var evs = Ast_ler_(AST_ABAS.EVENTOS).filter(function (e) { return Ast_up_(e.ENTIDADE) === 'OS' && Ast_s_(e.ENTIDADE_ID) === Ast_s_(os.ID); }).sort(function (a, b) { return String(a.EM).localeCompare(String(b.EM)); });
    corpo += RelA4_secao_('Linha do tempo', RelA4_tabela_([{ t: 'Quando', nw: true }, { t: 'O que aconteceu' }, { t: 'Por' }], evs.slice(-60).map(function (e) { return [Ast_br_(e.EM), Ast_s_(e.TEXTO).slice(0, 300), Ast_s_(e.USUARIO_NOME)]; }), { vazio: 'Sem registros.' }));
  }
  corpo += RelA4_secao_('Sobre este documento', '<p>' + Ast_esc_('A ronda de engenharia clínica é uma inspeção periódica dos equipamentos da unidade, setor a setor, com registro da situação de cada equipamento, das fotos dos achados e das orientações dadas à equipe. ' +
    'O registro apoia o cumprimento da RDC 509/2021 da Anvisa (gerenciamento de tecnologias em saúde) e da ABNT NBR 15943 (programa de gerenciamento de equipamentos de infraestrutura e de saúde) no que diz respeito à inspeção periódica e ao registro; ' +
    'ele não substitui a manutenção preventiva, a calibração e a qualificação de cada equipamento, nem atesta, sozinho, a conformidade da unidade.') + '</p>' +
    '<p class="nota">Situações: Em funcionamento (sem achado no momento da ronda); Com observação (funciona, com ponto a acompanhar); Fora de uso ou com defeito (não deve ser usado até o atendimento); Não localizado (não encontrado no setor); Não verificado (com o motivo). ' +
    'Gerado pelo SGO+ em ' + Ast_esc_(Ast_br_(Ast_agora_())) + ' (' + versaoTxt + ', emissão ' + Ast_esc_(String(meta.versao || 1)) + '). Marca de conferência do conteúdo: ' + Ast_esc_(String(meta.marca || '').slice(0, 16)) + '.</p>');
  return RelA4_documento_({ titulo: 'Relatório de ronda de engenharia clínica' + (meta.rascunho ? ' (rascunho)' : ''), subtitulo: Ast_s_(os.CLIENTE_NOME) + ' · ' + Ast_s_(os.UNIDADE_NOME), tituloCurto: 'Ronda ' + Ast_s_(os.NUMERO) + ' · ' + versaoTxt,
    tituloArquivo: 'Relatorio de ronda', numero: Ast_s_(os.NUMERO), revisao: Number(meta.revisao) || 0, emitidoPor: Ast_s_(os.TECNICO_NOME), identificacao: Ast_s_(os.UNIDADE_NOME), rotuloIdentificacao: 'Unidade',
    ficha: [['Cliente', Ast_s_(os.CLIENTE_NOME)], ['Data da ronda', Ast_brDia_(os.CHEGOU_EM || os.AGENDADO_PARA)], ['Situação', meta.rascunho ? 'Rascunho' : 'Encerrada em ' + Ast_br_(os.ENCERRADA_EM)]],
    tipoCapa: 'Relatório de ronda de engenharia clínica · ' + versaoTxt, corpo: corpo, capa: true, sumario: true });
}
/**
 * Emite o relatório da ronda (chamado por AstR_emitirRelatorioOS_). Encerrada: as DUAS versões (cliente em RELATORIO_*, interna
 * em RONDA_INTERNO_*); a do cliente vai para o Arquivo de documentos, o portal e o e-mail. Toque repetido reabre a mesma; versão
 * nova só com revisão (motivo). Aberta: rascunho (a versão pedida, interna por padrão). Nunca lança.
 */
function AstRd_emitirRelatorio_(eu, osId, o) {
  o = o || {};
  try {
    var os = Ast_porId_(AST_ABAS.OS, osId);
    if (!os) return { salvo: false, aviso: 'O.S. não encontrada' };
    var rascunho = Ast_up_(os.SITUACAO) !== 'ENCERRADA', publico = Ast_up_(o.publico) === 'CLIENTE' ? 'CLIENTE' : 'INTERNO';
    if (!rascunho && Ast_s_(os.RELATORIO_PDF_ID) && Ast_s_(os.RONDA_INTERNO_PDF_ID) && !o.revisao) {
      return { salvo: true, reaproveitado: true, pdfUrl: o.publico === 'INTERNO' ? Ast_s_(os.RONDA_INTERNO_PDF_URL) : Ast_s_(os.RELATORIO_PDF_URL), pdfId: Ast_s_(os.RELATORIO_PDF_ID), htmlId: Ast_s_(os.RELATORIO_HTML_ID),
        internoUrl: Ast_s_(os.RONDA_INTERNO_PDF_URL), versao: Number(os.RELATORIO_VERSAO) || 1, revisao: Number(os.RELATORIO_REVISAO) || 0, rascunho: false, registrado: true, emitidoEm: Ast_br_(os.RELATORIO_EM) };
    }
    var versao = (Number(os.RELATORIO_VERSAO) || 0) + 1, revisao = rascunho ? 0 : (o.revisao ? Math.max(1, (Number(os.RELATORIO_REVISAO) || 0) + 1) : 0);
    var marca = Ast_marca_(JSON.stringify([os.NUMERO, versao, os.RONDA_JSON, os.RONDA_POS_JSON, os.ASSINATURA_ARQUIVO_ID, os.COLAB_ASSINATURA_ARQUIVO_ID, os.QTD_FOTOS, os.ENCERRADA_EM]));
    var meta = { marca: marca, versao: versao, revisao: revisao, rascunho: rascunho };
    var dataNome = Utilities.formatDate(new Date(), AST_FUSO, 'yyyy-MM-dd HHmm'), base = 'Relatorio de ronda - ' + Ast_s_(os.NUMERO) + (revisao > 0 ? ' Rev ' + (revisao < 10 ? '0' : '') + revisao : '') + ' v' + versao;
    var salvar = function (pub, pasta, compartilhar) {
      var nome = base + ' ' + (pub === 'CLIENTE' ? 'cliente' : 'interno') + (rascunho ? ' RASCUNHO' : '') + ' - ' + Ast_s_(os.CLIENTE_NOME).slice(0, 60) + ' - ' + dataNome;
      var html = AstRd_html_(os, pub, meta);
      var fin = typeof RelA4_finalizar_ === 'function' ? RelA4_finalizar_(html, nome) : { html: html, pdfBlob: null };
      var g = SGO_DocSalvar_salvarHtmlEPdf_(pasta, nome, fin.html, fin.pdfBlob ? { compartilhar: compartilhar, pdfBlob: fin.pdfBlob } : { compartilhar: compartilhar });
      g.nome = nome; g.html = g.html || fin.html;
      return g;
    };
    var agora = Ast_agora_();
    if (rascunho) {
      var gr = salvar(publico, Ast_pastaPrivadaOS_(os.NUMERO), false);
      Ast_inserir_(AST_ABAS.RELATORIOS, { OS_ID: os.ID, OS_NUMERO: os.NUMERO, VERSAO: versao, REVISAO: 0, MOTIVO: 'prévia (' + (publico === 'CLIENTE' ? 'versão do cliente' : 'versão interna') + ')', RASCUNHO: 'SIM', PDF_ID: gr.pdfId, PDF_URL: gr.pdfUrl, HTML_ID: gr.htmlId, MARCA: marca, EMITIDO_EM: agora, EMITIDO_POR_NOME: Ast_s_(eu && eu.nome), DOC_REGISTRADO: '' });
      Ast_atualizar_(AST_ABAS.OS, os.ID, { RELATORIO_VERSAO: versao, ATUALIZADO_EM: agora });
      return { salvo: true, rascunho: true, html: gr.html, pdfUrl: gr.pdfUrl, pdfId: gr.pdfId, versao: versao, revisao: 0, emitidoEm: Ast_br_(agora) };
    }
    var gc = salvar('CLIENTE', Ast_pastaRelatorio_(os), true), gi = salvar('INTERNO', Ast_pastaPrivadaOS_(os.NUMERO), false);
    var reg = AstR_registrarNoArquivo_(eu, os, gc.pdfNome || gc.nome, gc.pdfUrl, 'RELATÓRIO DE RONDA');
    Ast_inserir_(AST_ABAS.RELATORIOS, { OS_ID: os.ID, OS_NUMERO: os.NUMERO, VERSAO: versao, REVISAO: revisao, MOTIVO: (revisao > 0 ? Ast_texto_(o.motivo, 400) + ' · ' : '') + 'versão do cliente', RASCUNHO: '', PDF_ID: gc.pdfId, PDF_URL: gc.pdfUrl, HTML_ID: gc.htmlId, MARCA: marca, EMITIDO_EM: agora, EMITIDO_POR_NOME: Ast_s_(eu && eu.nome), DOC_REGISTRADO: reg ? 'SIM' : '' });
    Ast_inserir_(AST_ABAS.RELATORIOS, { OS_ID: os.ID, OS_NUMERO: os.NUMERO, VERSAO: versao, REVISAO: revisao, MOTIVO: 'versão interna', RASCUNHO: '', PDF_ID: gi.pdfId, PDF_URL: gi.pdfUrl, HTML_ID: gi.htmlId, MARCA: marca, EMITIDO_EM: agora, EMITIDO_POR_NOME: Ast_s_(eu && eu.nome), DOC_REGISTRADO: '' });
    var campos = { RELATORIO_VERSAO: versao, RELATORIO_REVISAO: revisao, RELATORIO_PDF_ID: gc.pdfId, RELATORIO_PDF_URL: gc.pdfUrl, RELATORIO_HTML_ID: gc.htmlId, RELATORIO_EM: agora,
      RONDA_INTERNO_PDF_ID: gi.pdfId, RONDA_INTERNO_PDF_URL: gi.pdfUrl, RONDA_INTERNO_HTML_ID: gi.htmlId, ATUALIZADO_EM: agora };
    if (revisao > 0 && Ast_s_(os.ENVIADO_CLIENTE_EM)) {
      Ast_evento_('OS', os.ID, 'ENVIO_SUPERADO', eu, 'O envio de ' + Ast_br_(os.ENVIADO_CLIENTE_EM) + ' era da revisão anterior; a revisão nova precisa ser enviada de novo ao cliente.', { numero: os.NUMERO });
      Object.assign(campos, { ENVIADO_CLIENTE_EM: '', ENVIADO_CLIENTE_POR_NOME: '', ENVIADO_CLIENTE_CANAL: '', ENVIADO_CLIENTE_PARA: '' });
    }
    Ast_atualizar_(AST_ABAS.OS, os.ID, campos);
    Ast_evento_('OS', os.ID, revisao > 0 ? 'RELATORIO_REVISADO' : 'RELATORIO', eu, 'Relatório de ronda v' + versao + (revisao > 0 ? ' (revisão ' + revisao + ': ' + Ast_texto_(o.motivo, 300) + ')' : '') + ' emitido em duas versões (cliente e interna)' + (reg ? '; a do cliente foi registrada no Arquivo de documentos' : ''), { numero: os.NUMERO });
    if (o.aoEncerrar) Ast_avisarCliente_({ ID: os.ID, CLIENTE_ID: os.CLIENTE_ID, UNIDADE_ID: os.UNIDADE_ID }, 'Ronda de engenharia clínica concluída: ' + Ast_s_(os.UNIDADE_NOME) + ' (' + Ast_s_(os.NUMERO) + ')',
      'Prezados,\n\nA ronda de engenharia clínica ' + Ast_s_(os.NUMERO) + ' da unidade ' + Ast_s_(os.UNIDADE_NOME) + ' foi concluída em ' + Ast_br_(os.ENCERRADA_EM) + '.\nO relatório, com a situação de cada equipamento por setor, os achados e as recomendações, segue por e-mail em seguida e fica disponível no portal do cliente do SGO+.\n\nMetrolabs — Engenharia clínica', 'AT08');
    return { salvo: true, pdfUrl: gc.pdfUrl, pdfId: gc.pdfId, htmlId: gc.htmlId, internoUrl: gi.pdfUrl, html: o.publico === 'CLIENTE' ? gc.html : gi.html, versao: versao, revisao: revisao, rascunho: false, registrado: reg, emitidoEm: Ast_br_(agora) };
  } catch (e) {
    console.error('Assistência, relatório da ronda: ' + ((e && e.message) || e));
    return { salvo: false, aviso: 'O relatório da ronda não foi salvo: ' + String((e && e.message) || e).replace(/[.\s]+$/, '') + '. A rotina tenta de novo; se continuar, avise o administrador.' };
  }
}
/** Revisão do relatório da ronda pela gestão (orientações e pedidos corrigidos, com motivo). */
function AstRd_corrigir_(eu, os, d) {
  var motivo = Ast_texto_(d && d.motivo, 500);
  if (motivo.length < 10) throw new Error('Não foi possível corrigir: escreva o motivo da revisão (pelo menos 10 letras)');
  if (!Ast_s_(os.RELATORIO_PDF_ID)) throw new Error('Não foi possível corrigir: a ronda ' + os.NUMERO + ' ainda não tem o relatório emitido');
  var g = Ast_comTrava_(function () {
    var x = (d && d.ronda) || {}, reg = AstRd_registro_(os), mudou = false;
    if (x.orientacoes !== undefined && Ast_texto_(x.orientacoes, 4000) !== reg.orientacoes) { reg.orientacoes = Ast_texto_(x.orientacoes, 4000); mudou = true; }
    if (x.pedidosCliente !== undefined && Ast_texto_(x.pedidosCliente, 4000) !== reg.pedidosCliente) { reg.pedidosCliente = Ast_texto_(x.pedidosCliente, 4000); mudou = true; }
    if (mudou) { Ast_atualizar_(AST_ABAS.OS, os.ID, { RONDA_JSON: JSON.stringify(reg), ATUALIZADO_EM: Ast_agora_() }); Ast_evento_('OS', os.ID, 'CORRECAO', eu, 'Orientações e pedidos da ronda corrigidos pela gestão. Motivo: ' + motivo, { numero: os.NUMERO }); }
    return AstRd_emitirRelatorio_(eu, os.ID, { revisao: true, motivo: motivo });
  });
  if (!g.salvo) throw new Error('Não foi possível emitir a revisão: ' + String(g.aviso || '').replace(/[.\s]+$/, ''));
  return { os: AstO_publico_(Ast_porId_(AST_ABAS.OS, os.ID), eu), pdfUrl: g.pdfUrl, versao: g.versao, revisao: g.revisao, message: 'Relatório da ronda ' + os.NUMERO + ' emitido como revisão ' + g.revisao + ' (cliente e interna). Envie a revisão ao cliente.' };
}
/** Liberar ou recolher a foto da ronda para a versão do cliente (gestão). d: { fotoId, publico: 'SIM' | '' } */
function AstRd_liberarFoto_(eu, d) {
  Ast_exigir_(eu, 'GESTAO', 'liberar a foto da ronda');
  var f = Ast_porId_(AST_ABAS.FOTOS, d && d.fotoId), os = f ? Ast_porId_(AST_ABAS.OS, f.OS_ID) : null;
  if (!f || !AstRd_ehRonda_(os)) throw new Error('Não foi possível: foto da ronda não encontrada. Atualize a ficha');
  var pub = Ast_up_(d.publico) === 'SIM' ? 'SIM' : '';
  Ast_atualizar_(AST_ABAS.FOTOS, f.ID, { PUBLICO: pub, LIBERADA_POR_NOME: eu.nome, LIBERADA_EM: Ast_agora_() });
  Ast_evento_('OS', os.ID, 'FOTO_LIBERACAO', eu, 'Foto "' + (Ast_s_(f.LEGENDA) || Ast_s_(f.NOME)) + '": ' + (pub ? 'liberada ao cliente' : 'só a Metrolabs vê'), { numero: os.NUMERO });
  return { os: AstO_publico_(Ast_porId_(AST_ABAS.OS, os.ID), eu), message: pub ? 'Foto liberada para a versão do cliente.' : 'Foto recolhida: sai da versão do cliente na próxima emissão (revisão).' + (Ast_up_(os.SITUACAO) === 'ENCERRADA' ? ' Para o cliente receber sem ela, emita a revisão do relatório.' : '') };
}

// ------------------------------------------------------------
// PARA A TELA, O APLICATIVO E O PORTAL
// ------------------------------------------------------------
function AstRd_situacoesLista_() { return Object.keys(AST_RONDA_SITUACOES).map(function (k) { return { codigo: k, nome: AST_RONDA_SITUACOES[k], problema: AST_RONDA_PROBLEMAS.indexOf(k) >= 0 }; }); }
/** Bloco "ronda" do item de O.S. do Meu dia (o aparelho monta setores, equipamentos e perguntas sem internet). */
function AstRd_paraApp_(os) {
  var esc = AstRd_escopo_(os), reg = AstRd_registro_(os), cats = {};
  Object.keys(AST_RONDA_CATEGORIAS).forEach(function (k) { cats[k] = AST_RONDA_CATEGORIAS[k].nome; });
  return { clienteId: Ast_s_(os.CLIENTE_ID), unidadeId: Ast_s_(os.UNIDADE_ID), unidadeNome: Ast_s_(os.UNIDADE_NOME), congelado: !!Ast_s_(os.RONDA_ESCOPO_JSON), setores: esc.setores,
    perguntas: AstRd_perguntas_(), categorias: cats, situacoes: AstRd_situacoesLista_(), paradas: Object.keys(AST_RONDA_PARADAS).map(function (k) { return { codigo: k, nome: AST_RONDA_PARADAS[k] }; }), regras: { descricaoMin: AST_RONDA_DESC_MIN, motivoMin: AST_RONDA_MOTIVO_MIN },
    registrado: { itens: reg.itens, setores: reg.setores, orientacoes: reg.orientacoes, pedidosCliente: reg.pedidosCliente } };
}
/** Bloco "ronda" da ficha da O.S. na tela da gestão. */
function AstRd_publico_(os, eu) {
  var fotos = AstO_fotos_(os.ID), L = AstRd_linhas_(os, fotos), pos = AstRd_pos_(os), interno = !!(eu && eu.interno);
  return { resumo: AstRd_resumo_(os, fotos), registro: { orientacoes: L.registro.orientacoes, pedidosCliente: L.registro.pedidosCliente },
    setores: L.escopo.setores.map(function (s) {
      var so = L.registro.setores[s.chave] || {};
      return { nome: s.nome, achados: Ast_s_(so.achados), extra: !!s.extra, itens: L.linhas.filter(function (l) { return l.setorChave === s.chave; }).map(function (l) {
        return { chave: l.eq.chave, texto: AstRd_eqTexto_(l.eq), novo: !!l.eq.novo, situacao: l.item ? Ast_up_(l.item.situacao) : '', situacaoNome: l.item ? AST_RONDA_SITUACOES[Ast_up_(l.item.situacao)] || '' : 'Sem registro',
          parada: Ast_up_(l.item && l.item.parada), paradaNome: AST_RONDA_PARADAS[Ast_up_(l.item && l.item.parada)] || '', descricao: Ast_s_(l.item && l.item.descricao), motivo: Ast_s_(l.item && l.item.motivo), faltas: l.faltas, vencimentos: AstRd_vencimentos_(l).map(function (v) { return v.motivo; }), chamado: (pos.chamados || {})[l.eq.chave] || null,
          fotos: l.fotos.map(function (f) { return { id: Ast_s_(f.ID), legenda: Ast_s_(f.LEGENDA), url: interno ? Ast_s_(f.URL) : '', publico: Ast_up_(f.PUBLICO) === 'SIM' }; }) };
      }), fotosSetor: fotos.filter(function (f) { return Ast_s_(f.PERGUNTA_ID) === 'ronda:setor:' + s.chave; }).map(function (f) { return { id: Ast_s_(f.ID), legenda: Ast_s_(f.LEGENDA), url: interno ? Ast_s_(f.URL) : '', publico: Ast_up_(f.PUBLICO) === 'SIM' }; }) };
    }), chamados: Object.keys(pos.chamados || {}).map(function (k) { return pos.chamados[k]; }), sugestaoId: Ast_s_(pos.sugestaoId), posEm: Ast_br_(os.RONDA_POS_EM),
    internoUrl: interno ? Ast_s_(os.RONDA_INTERNO_PDF_URL) : '', planoId: Ast_s_(os.RONDA_PLANO_ID), prevista: Ast_brDia_(Ast_s_(os.RONDA_PREVISTA) + 'T00:00:00'), janelaAte: Ast_brDia_(Ast_s_(os.RONDA_JANELA_ATE) + 'T00:00:00'),
    cobranca: Ast_s_(os.RONDA_PLANO_ID) ? AST_RONDA_INCLUIDA : '', podeLiberarFoto: !!(eu && eu.gestao) };
}
function AstRd_situacaoRonda_(o) {
  var s = Ast_up_(o.SITUACAO), hoje = Ast_hoje_();
  if (s === 'ENCERRADA') return { cod: 'REALIZADA', nome: 'Realizada' };
  if (s === 'CANCELADA') return { cod: 'CANCELADA', nome: 'Cancelada' };
  if (AST_OS_OCUPA_AGENDA.indexOf(s) >= 0 && !Ast_s_(o.CONCLUIU_EM) && Ast_s_(o.RONDA_JANELA_ATE) && Ast_s_(o.RONDA_JANELA_ATE) < hoje) return { cod: 'ATRASADA', nome: 'Fora da janela' };
  if (s === 'DOC_PENDENTE') return { cod: 'DOC', nome: 'Documentação pendente' };
  return { cod: s === 'AGENDADA' ? 'PROGRAMADA' : 'ANDAMENTO', nome: s === 'AGENDADA' ? 'Programada' : 'Em andamento' };
}
function AstRd_linhaLista_(o) {
  var st = AstRd_situacaoRonda_(o), r = null;
  try { r = Ast_up_(o.SITUACAO) === 'ENCERRADA' ? AstRd_resumo_(o) : null; } catch (e) { r = null; }
  return { id: Ast_s_(o.ID), numero: Ast_s_(o.NUMERO), clienteNome: Ast_s_(o.CLIENTE_NOME), unidadeNome: Ast_s_(o.UNIDADE_NOME), tecnicoNome: Ast_s_(o.TECNICO_NOME), agendadoPara: Ast_br_(o.AGENDADO_PARA), agendadoIso: Ast_iso_(o.AGENDADO_PARA),
    janelaAte: Ast_brDia_(Ast_s_(o.RONDA_JANELA_ATE) + 'T00:00:00'), situacao: st.cod, situacaoNome: st.nome, situacaoOs: Ast_up_(o.SITUACAO), plano: !!Ast_s_(o.RONDA_PLANO_ID), faltas: Ast_s_(o.FALTAS),
    problemas: r ? r.problemas : null, equipamentos: r ? r.equipamentos : null, relatorioUrl: Ast_s_(o.RELATORIO_PDF_URL), internoUrl: Ast_s_(o.RONDA_INTERNO_PDF_URL), comecou: !!Ast_s_(o.CHEGOU_EM) };
}
/** Tela "Rondas" (gestão; técnico vê só as dele). f: { filtro: PROXIMAS|REALIZADAS|TODAS, clienteId } */
function AstRd_tela_(eu, f) {
  Ast_exigir_(eu, 'INTERNO', 'ver as rondas');
  f = f || {};
  var filtro = Ast_up_(f.filtro) || 'PROXIMAS';
  var l = Ast_ler_(AST_ABAS.OS).filter(function (o) {
    if (!AstRd_ehRonda_(o)) return false;
    if (!eu.gestao && Ast_s_(o.TECNICO_ID) !== eu.id && !(eu.comercial || eu.diretoria)) return false;
    if (Ast_s_(f.clienteId) && Ast_s_(o.CLIENTE_ID) !== Ast_s_(f.clienteId)) return false;
    var s = Ast_up_(o.SITUACAO);
    if (filtro === 'PROXIMAS') return AST_OS_ABERTAS.indexOf(s) >= 0;
    if (filtro === 'REALIZADAS') return s === 'ENCERRADA';
    return true;
  }).sort(function (a, b) { return filtro === 'REALIZADAS' ? String(b.ENCERRADA_EM || b.AGENDADO_PARA).localeCompare(String(a.ENCERRADA_EM || a.AGENDADO_PARA)) : String(a.AGENDADO_PARA).localeCompare(String(b.AGENDADO_PARA)); });
  var r = { rondas: l.slice(0, 200).map(AstRd_linhaLista_), periodicidades: Object.keys(AST_RONDA_PERIODOS).map(function (k) { return { v: k, t: AST_RONDA_PERIODOS[k].nome }; }),
    situacoes: AstRd_situacoesLista_(), gestao: !!eu.gestao, podeSugestao: AstRd_podeSugestao_(eu) || !!eu.gestao, cfg: AstRd_cfg_(), prioridades: Object.keys(AST_PRIORIDADES).map(function (k) { return { v: k, t: AST_PRIORIDADES[k] }; }), paradas: AST_RONDA_PARADAS,
    tecnicos: Ast_tecnicos_().map(function (t) { return { id: t.id, nome: t.nome }; }) };
  if (eu.gestao) r.planos = Ast_ler_(AST_ABAS.RONDA_PLANOS).sort(function (a, b) { return Ast_s_(a.CLIENTE_NOME).localeCompare(Ast_s_(b.CLIENTE_NOME), 'pt-BR'); }).map(AstRd_planoPublico_);
  return r;
}
/** Setores e equipamentos de uma unidade (formulário do contrato e da ronda avulsa). */
function AstRd_escopoUnidade_(eu, d) {
  Ast_exigir_(eu, 'INTERNO', 'ver os setores da unidade');
  var v = AstRd_unidade_(d && d.clienteId, d && d.unidadeId, 'ver os setores');
  return { setores: AstRd_setoresUnidade_(v.un.ID), unidade: { id: v.un.ID, nome: Ast_s_(v.un.NOME_UNIDADE) } };
}
/** Portal do cliente: só as rondas do cliente da sessão, só a versão do cliente do relatório. */
function AstRd_portal_(eu) {
  if (!eu.clienteId) return [];
  return Ast_ler_(AST_ABAS.OS).filter(function (o) { return Ast_s_(o.CLIENTE_ID) === eu.clienteId && AstRd_ehRonda_(o) && Ast_up_(o.SITUACAO) !== 'CANCELADA'; })
    .sort(function (a, b) { return String(b.AGENDADO_PARA).localeCompare(String(a.AGENDADO_PARA)); }).slice(0, 60).map(function (o) {
      var enc = Ast_up_(o.SITUACAO) === 'ENCERRADA', r = enc ? AstRd_resumo_(o) : null;
      return { numero: Ast_s_(o.NUMERO), unidadeNome: Ast_s_(o.UNIDADE_NOME), data: Ast_brDia_(o.CHEGOU_EM || o.AGENDADO_PARA), situacao: enc ? 'Realizada' : Ast_s_(o.CHEGOU_EM) ? 'Em andamento' : 'Programada',
        resumo: r ? r.equipamentos + ' equipamento(s): ' + r.porSituacao.FUNCIONANDO + ' em funcionamento, ' + r.porSituacao.OBSERVACAO + ' com observação, ' + r.porSituacao.FORA_USO + ' fora de uso' : '',
        url: enc ? Ast_s_(o.RELATORIO_PDF_URL) : '' };
    });
}
/** Rota /arquivos: login de cliente nunca abre a versão interna; a versão do cliente só a do próprio cliente. null = não é documento de ronda. */
function AstRd_arquivoClientePermitido_(sessionId, arquivoId) {
  var id = Ast_s_(arquivoId);
  if (!id) return null;
  var oss = Ast_lerCru_(AST_ABAS.OS), porOs = {};
  oss.forEach(function (o) { porOs[Ast_s_(o.ID)] = o; });
  if (oss.some(function (o) { return Ast_s_(o.RONDA_INTERNO_PDF_ID) === id || Ast_s_(o.RONDA_INTERNO_HTML_ID) === id; })) return false;
  // revisão de 03/11/2026: toda emissão da ronda fica em ATEC_RELATORIOS; versão interna e prévia (rascunho) nunca abrem para cliente
  var rel = Ast_lerCru_(AST_ABAS.RELATORIOS).filter(function (r) { var o = porOs[Ast_s_(r.OS_ID)]; return o && AstRd_ehRonda_(o) && (Ast_s_(r.PDF_ID) === id || Ast_s_(r.HTML_ID) === id); });
  if (rel.some(function (r) { return /interna/i.test(Ast_s_(r.MOTIVO)) || Ast_sim_(r.RASCUNHO); })) return false;
  var os = rel.length ? porOs[Ast_s_(rel[0].OS_ID)] : oss.filter(function (o) { return (Ast_s_(o.RELATORIO_PDF_ID) === id || Ast_s_(o.RELATORIO_HTML_ID) === id) && AstRd_ehRonda_(o); })[0];
  if (!os) return null;
  try { var eu = Ast_eu_(sessionId); return !!eu.clienteId && eu.clienteId === Ast_s_(os.CLIENTE_ID); } catch (e) { return false; }
}

// ------------------------------------------------------------
// INDICADORES
// ------------------------------------------------------------
/** f: { dias } (padrão 90). Rondas realizadas x programadas por cliente, problemas por setor, recorrentes e tempo do achado à solução. */
function AstRd_indicadores_(eu, f) {
  Ast_exigir_(eu, 'INTERNO', 'ver os indicadores das rondas');
  var dias = Math.max(7, Math.min(366, Number(f && f.dias) || 90)), hoje = Ast_hoje_(), de = Ast_somarDias_(hoje, -dias);
  var rondas = Ast_ler_(AST_ABAS.OS).filter(function (o) { return AstRd_ehRonda_(o) && Ast_dia_(o.AGENDADO_PARA) >= de && Ast_dia_(o.AGENDADO_PARA) <= hoje; });
  var porCli = {}, porSetor = {}, porEq = {};
  rondas.forEach(function (o) {
    var s = Ast_up_(o.SITUACAO), pausa = s === 'CANCELADA' && Ast_s_(o.CANCELADA_MOTIVO).indexOf(AST_RONDA_PAUSA_PREFIXO) === 0;
    var c = porCli[Ast_s_(o.CLIENTE_ID)] = porCli[Ast_s_(o.CLIENTE_ID)] || { cliente: Ast_s_(o.CLIENTE_NOME), programadas: 0, realizadas: 0, foraJanela: 0 };
    if (!pausa) c.programadas++;
    if (s === 'ENCERRADA') {
      c.realizadas++;
      if (Ast_s_(o.RONDA_JANELA_ATE) && Ast_dia_(o.CONCLUIU_EM) > Ast_s_(o.RONDA_JANELA_ATE)) c.foraJanela++;
      AstRd_linhas_(o).linhas.forEach(function (l) {
        var sit = l.item ? Ast_up_(l.item.situacao) : '';
        if (['OBSERVACAO', 'FORA_USO', 'NAO_LOCALIZADO'].indexOf(sit) < 0) return;
        var ks = Ast_s_(o.UNIDADE_ID) + '|' + l.setorChave, x = porSetor[ks] = porSetor[ks] || { cliente: Ast_s_(o.CLIENTE_NOME), unidade: Ast_s_(o.UNIDADE_NOME), setor: l.setor, observacao: 0, foraUso: 0, naoLocalizado: 0, total: 0 };
        x[{ OBSERVACAO: 'observacao', FORA_USO: 'foraUso', NAO_LOCALIZADO: 'naoLocalizado' }[sit]]++; x.total++;
        if (sit === 'NAO_LOCALIZADO') return;
        var ke = Ast_s_(l.item.equipamentoId) || l.eq.id || l.eq.chave, e = porEq[ke] = porEq[ke] || { equipamento: AstRd_eqTexto_(l.eq), cliente: Ast_s_(o.CLIENTE_NOME), setor: l.setor, vezes: 0, rondas: [] };
        e.vezes++; e.rondas.push(Ast_s_(o.NUMERO));
      });
    }
  });
  // tempo do achado (conclusão da ronda) até a solução do chamado aberto a partir dela
  var tempos = [], pendentes = 0;
  Ast_ler_(AST_ABAS.CHAMADOS).filter(function (c) { return /^RONDA:/.test(Ast_s_(c.ORIGEM_REF)) && Ast_dia_(c.ABERTO_EM) >= de; }).forEach(function (c) {
    var os = Ast_porId_(AST_ABAS.OS, Ast_s_(c.ORIGEM_REF).split(':')[1]), ini = Ast_ms_(os ? os.CONCLUIU_EM || os.ENCERRADA_EM : c.ABERTO_EM), fim = Ast_ms_(c.ATENDIDO_EM || c.ENCERRADO_EM);
    if (Ast_up_(c.SITUACAO) === 'CANCELADO') return;
    if (fim === null || ini === null) { pendentes++; return; }
    tempos.push((fim - ini) / 864e5);
  });
  var cl = Object.keys(porCli).map(function (k) { var c = porCli[k]; c.pct = c.programadas ? Math.round(c.realizadas * 100 / c.programadas) : null; return c; }).sort(function (a, b) { return a.cliente.localeCompare(b.cliente, 'pt-BR'); });
  return { dias: dias, de: Ast_brDia_(de + 'T00:00:00'), ate: Ast_brDia_(hoje + 'T00:00:00'), programadas: cl.reduce(function (s, c) { return s + c.programadas; }, 0), realizadas: cl.reduce(function (s, c) { return s + c.realizadas; }, 0),
    porCliente: cl, problemasPorSetor: Object.keys(porSetor).map(function (k) { return porSetor[k]; }).sort(function (a, b) { return b.total - a.total; }).slice(0, 30),
    recorrentes: Object.keys(porEq).map(function (k) { return porEq[k]; }).filter(function (e) { return e.vezes >= 2; }).sort(function (a, b) { return b.vezes - a.vezes; }).slice(0, 30),
    achadoSolucao: { resolvidos: tempos.length, pendentes: pendentes, mediaDias: tempos.length ? Math.round(tempos.reduce(function (s, v) { return s + v; }, 0) / tempos.length * 10) / 10 : null } };
}

