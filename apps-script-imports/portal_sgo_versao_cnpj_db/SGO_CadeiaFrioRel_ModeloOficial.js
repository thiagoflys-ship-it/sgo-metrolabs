/****************************************************
 * Cadeia de frio — RELATÓRIO DE QUALIFICAÇÃO (modelo oficial novo, 21/10/2026).
 *
 * Mesmo molde do relatório de qualificação da Autoclave a vapor (SGO_AutoRel_ModeloOficialNovo.js),
 * com as regras da cadeia de frio. É o documento de qualificação do equipamento, consolidado a partir
 * dos relatórios de ensaio já emitidos e aprovados (módulo CADEIA_FRIO):
 *  - cliente, unidade e equipamento vêm do cadastro (SGO_QualifEquipamento.js); equipamento de outro
 *    cliente é recusado;
 *  - os resultados de cada estudo vêm do motor (guardados na emissão do relatório de ensaio, ou
 *    recalculados com a conferência da assinatura dos dados); o resultado da qualificação é decidido
 *    aqui, por regra: uma não conformidade reprova;
 *  - qualificação de operação (QO): distribuição em vazio, abertura de porta, queda de energia e
 *    autonomia; qualificação de desempenho (QD): distribuição com carga; qualificação de instalação (QI):
 *    lista de verificação da instalação;
 *  - a IA só redige a conclusão, conferida pelo verificador comum; sem IA, vale o texto padrão;
 *  - emissão só com aprovação registrada do responsável técnico (QUALIF_EMISSOES, módulo
 *    CADEIA_FRIO_OFICIAL); nova revisão substitui a anterior, que continua guardada;
 *  - HTML A4 + PDF na pasta do equipamento e registro no Arquivo de documentos com o vencimento da
 *    requalificação (ficha do equipamento, QR code, central de pendências, Caixa de decisões e Cronograma).
 * A cadeia de frio não tinha relatório oficial antes: nada anterior a preservar aqui.
 * Documento: SGO_CadeiaFrioRel_ModeloOficialDoc.js. Tela: seção 8 do módulo (SGO_CadeiaFrioRel_ConteudoModulo.js).
 ****************************************************/

var CFOFICIAL_CFG = {
  MODULO: 'CADEIA_FRIO_OFICIAL',
  MODULO_ENSAIO: 'CADEIA_FRIO',
  PROP_SEQ: 'CFOFICIAL_SEQ_',
  SIGLA: 'RQF',
  PERIODICIDADE_PADRAO_MESES: 12,
  PERIODICIDADE_MIN_MESES: 1,
  PERIODICIDADE_MAX_MESES: 24,
  MOTIVOS: ['Qualificação inicial', 'Requalificação periódica', 'Requalificação após manutenção', 'Requalificação após mudança de local', 'Requalificação após mudança de carga ou de arranjo interno'],
  // Lista de verificação da qualificação de instalação (critério da empresa executante; revisável pelo responsável técnico).
  QI_ITENS: [
    { id: 'documentacao', texto: 'Documentação técnica do equipamento disponível no serviço (manual de operação e orientações de manutenção)' },
    { id: 'identificacao', texto: 'Identificação do equipamento legível (placa com número de série) e coerente com o cadastro' },
    { id: 'local', texto: 'Local de instalação ventilado, sem sol direto nem fonte de calor próxima, com afastamento das paredes para a circulação do ar' },
    { id: 'eletrica', texto: 'Alimentação elétrica compatível com a especificada, em tomada própria e com proteção' },
    { id: 'porta', texto: 'Equipamento nivelado, porta fechando sem esforço e vedação da porta íntegra' },
    { id: 'controle', texto: 'Controle e indicação de temperatura do equipamento em funcionamento' },
    { id: 'alarme', texto: 'Alarme de temperatura fora da faixa em funcionamento, quando o equipamento o possui' },
    { id: 'contingencia', texto: 'Providência do serviço para falta de energia definida (por exemplo, gerador ou fonte de energia de reserva), quando aplicável' },
    { id: 'instrumentos', texto: 'Instrumentos de controle do equipamento com calibração em dia, quando aplicável' },
    { id: 'uso', texto: 'Equipamento de uso exclusivo para os produtos a conservar' }
  ],
  SITUACOES_QI: { C: 'Conforme', NC: 'Não conforme', NA: 'Não aplicável' }
};

function CadeiaFrioOficial_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function CadeiaFrioOficial_up_(v) { return CadeiaFrioOficial_s_(v).toUpperCase(); }
function CadeiaFrioOficial_msg_(e) { return String(e && e.message ? e.message : e).replace(/[.\s]+$/, ''); }
function CadeiaFrioOficial_ehAprovador_(sessao) { return CadeiaFrioRel_ehAprovador_(sessao); }
function CadeiaFrioOficial_exigirAprovador_(sessao) {
  if (!CadeiaFrioOficial_ehAprovador_(sessao)) throw new Error('Somente o responsável técnico (perfis ' + CADEIAFRIO_QCFG.EMISSAO.perfisAprovadores.join(', ') + ') confere e aprova o relatório de qualificação.');
}
function CadeiaFrioOficial_tz_() { return (typeof CadeiaFrioRel_CFCFG !== 'undefined' && CadeiaFrioRel_CFCFG.TZ) || 'America/Sao_Paulo'; }
function CadeiaFrioOficial_hojeBr_() { try { return Utilities.formatDate(new Date(), CadeiaFrioOficial_tz_(), 'dd/MM/yyyy'); } catch (e) { return ''; } }
function CadeiaFrioOficial_urlArquivo_(id) { if (!CadeiaFrioOficial_s_(id)) return ''; try { return DriveApp.getFileById(id).getUrl(); } catch (e) { return ''; } }

/** Número do relatório: RQF-aaaa-00001 (sequência anual, com trava; nunca repete número usado). */
function CadeiaFrioOficial_proximoNumero_() {
  var ano = '';
  try { ano = Utilities.formatDate(new Date(), CadeiaFrioOficial_tz_(), 'yyyy'); } catch (e) { ano = String(new Date().getFullYear()); }
  var lock = null;
  try { lock = LockService.getScriptLock(); lock.waitLock(20000); } catch (e) { lock = null; }
  try {
    var props = PropertiesService.getScriptProperties();
    var chave = CFOFICIAL_CFG.PROP_SEQ + ano;
    var n = (parseInt(props.getProperty(chave), 10) || 0) + 1;
    var usados = SGO_QE_listar_(CFOFICIAL_CFG.MODULO).map(function (r) { return r.NUMERO; });
    var numero;
    do { numero = CFOFICIAL_CFG.SIGLA + '-' + ano + '-' + ('0000' + n).slice(-5); n++; } while (usados.indexOf(numero) >= 0);
    props.setProperty(chave, String(n - 1));
    return numero;
  } finally { if (lock) { try { lock.releaseLock(); } catch (e2) {} } }
}

/** Etapas da qualificação cobertas por um relatório de ensaio (pelos estudos que ele contém). */
function CadeiaFrioOficial_etapasDoEnsaio_(resumo) {
  var e = {};
  (resumo.estudos || []).forEach(function (x) { if (x.tipoEstudo === 'DISTRIBUICAO_CARGA') e.QD = true; else e.QO = true; });
  return Object.keys(e).sort();
}

/**
 * Um relatório de ensaio emitido → { ok, ensaio } ou { ok:false, trava }. Usa o resumo guardado na emissão; sem
 * ele, recalcula pelos dados guardados e confere a assinatura (o mesmo cálculo que foi aprovado).
 */
function CadeiaFrioOficial_ensaioDaEmissao_(id, ident) {
  var reg = SGO_QE_obter_(id);
  var rotulo = reg ? 'relatório de ensaio ' + reg.NUMERO + (reg.REVISAO && reg.REVISAO !== '0' ? ' rev ' + reg.REVISAO : '') : 'relatório de ensaio escolhido';
  function trava(codigo, texto, fazer) { return { ok: false, trava: { codigo: codigo, texto: texto, comoCorrigir: fazer } }; }
  if (!reg || reg.MODULO !== CFOFICIAL_CFG.MODULO_ENSAIO) return trava('ENSAIO_NAO_ENCONTRADO', 'O ' + rotulo + ' não foi encontrado.', 'Atualize a lista de relatórios de ensaio do equipamento e escolha de novo.');
  if (reg.STATUS === 'SUBSTITUIDO') return trava('ENSAIO_SUBSTITUIDO', 'O ' + rotulo + ' foi substituído por uma revisão mais nova.', 'Desmarque esta revisão e marque a revisão vigente do mesmo relatório.');
  if (reg.STATUS !== 'EMITIDO') return trava('ENSAIO_NAO_EMITIDO', 'O ' + rotulo + ' ainda não foi emitido (situação: ' + reg.STATUS + ').', 'Emita o relatório de ensaio na seção 6 (com a aprovação do responsável técnico) e volte aqui.');
  if (CadeiaFrioOficial_s_(reg.EQUIPAMENTO_ID) !== ident.equipamentoId) return trava('ENSAIO_OUTRO_EQUIPAMENTO', 'O ' + rotulo + ' é de outro equipamento.', 'Desmarque este relatório: só entram relatórios de ensaio do equipamento escolhido.');
  var resumo = null;
  if (reg.RESUMO_JSON) { try { resumo = JSON.parse(reg.RESUMO_JSON); } catch (e) { resumo = null; } }
  if (!resumo) {
    if (!reg.PAYLOAD_JSON) return trava('ENSAIO_SEM_DADOS', 'O ' + rotulo + ' foi emitido sem o registro dos dados usados no cálculo.', 'Emita de novo o relatório deste ensaio na seção 6 (sai uma nova revisão) e marque a revisão nova.');
    try {
      var ctx = CadeiaFrioRel_qContexto_(JSON.parse(reg.PAYLOAD_JSON));
      if (CadeiaFrioRel_assinaturaCtx_(ctx) !== reg.HASH_CONTEXTO) return trava('ENSAIO_DADOS_MUDARAM', 'Os dados do ' + rotulo + ' mudaram desde a aprovação (por exemplo, o cadastro do registrador).', 'Emita uma nova revisão do relatório de ensaio e marque a revisão nova.');
      resumo = CadeiaFrioRel_qResumoEnsaio_(ctx);
      try { SGO_QE_atualizar_(reg.ID, { RESUMO_JSON: JSON.stringify(resumo) }); } catch (eG) { /* fica só nesta consulta */ }
    } catch (e) {
      return trava('ENSAIO_RECALCULO', 'Não foi possível recalcular os resultados do ' + rotulo + ' (' + CadeiaFrioOficial_msg_(e) + ').', 'Emita uma nova revisão do relatório de ensaio e marque a revisão nova.');
    }
  }
  return { ok: true, ensaio: { emissaoId: reg.ID, numero: reg.NUMERO, revisao: CadeiaFrioOficial_s_(reg.REVISAO) || '0', aprovadoPor: reg.APROVADO_POR, aprovadoEm: reg.APROVADO_EM,
    hash: CadeiaFrioOficial_s_(reg.HASH_CONTEXTO), resultado: resumo.statusConsolidado, etapas: CadeiaFrioOficial_etapasDoEnsaio_(resumo), resumo: resumo } };
}

/** Relatórios de ensaio do equipamento para a tela (vigentes primeiro). */
function CadeiaFrioOficial_ensaiosDoEquipamento_(equipamentoId) {
  return SGO_QE_listar_(CFOFICIAL_CFG.MODULO_ENSAIO).filter(function (r) {
    return CadeiaFrioOficial_s_(r.EQUIPAMENTO_ID) === CadeiaFrioOficial_s_(equipamentoId) && (r.STATUS === 'EMITIDO' || r.STATUS === 'SUBSTITUIDO');
  }).map(function (r) {
    var info = { data: '', estudos: '' };
    if (r.RESUMO_JSON) { try { var rs = JSON.parse(r.RESUMO_JSON); info = { data: rs.identificacao.dataDoEnsaio, estudos: (rs.estudos || []).map(function (e) { return e.label; }).join('; ') }; } catch (e) {} }
    return { id: r.ID, numero: r.NUMERO, revisao: CadeiaFrioOficial_s_(r.REVISAO) || '0', status: r.STATUS, resultado: r.RESULTADO, emitidoEm: CadeiaFrioOficial_s_(r.APROVADO_EM).slice(0, 10), aprovadoPor: r.APROVADO_POR, data: info.data, estudos: info.estudos };
  }).sort(function (a, b) { return (a.status === 'SUBSTITUIDO') - (b.status === 'SUBSTITUIDO') || String(b.emitidoEm).localeCompare(String(a.emitidoEm)); });
}

/* ============================================================
 * Contexto do relatório consolidado (decisão por regra)
 * ============================================================ */

function CadeiaFrioOficial_montarContexto_(sessionId, p) {
  p = p || {};
  var ident = SGO_QEQ_identificacao_(sessionId, p.clienteId, p.unidadeId, p.equipamentoId);
  var travas = [];
  function trava(codigo, texto, fazer) { travas.push({ codigo: codigo, texto: texto, comoCorrigir: fazer }); }
  if (!CADEIAFRIO_QCFG.TIPO_EQUIPAMENTO_RE.test(SGO_QEQ_semAcento_(ident.tipo))) {
    trava('TIPO_EQUIPAMENTO', 'O equipamento escolhido está cadastrado como "' + ident.tipo + '", e este relatório é de equipamento da cadeia de frio.', 'Escolha o equipamento certo na lista ou corrija o tipo em Cadastros › Equipamentos.');
  }
  var etapas = { QI: !!(p.etapas || {}).QI, QO: !!(p.etapas || {}).QO, QD: !!(p.etapas || {}).QD };
  if (!etapas.QI && !etapas.QO && !etapas.QD) trava('SEM_ETAPA', 'Nenhuma etapa da qualificação foi marcada.', 'Em "Qualificação", marque as etapas executadas (instalação, operação e/ou desempenho).');
  var motivo = CadeiaFrioOficial_s_(p.motivo);
  if (CFOFICIAL_CFG.MOTIVOS.indexOf(motivo) < 0) trava('SEM_MOTIVO', 'O motivo da qualificação não foi escolhido.', 'Em "Qualificação", escolha o motivo (qualificação inicial ou o tipo de requalificação).');
  var meses = parseInt(p.periodicidadeMeses, 10);
  if (!(meses >= CFOFICIAL_CFG.PERIODICIDADE_MIN_MESES && meses <= CFOFICIAL_CFG.PERIODICIDADE_MAX_MESES)) {
    trava('PERIODICIDADE', 'A periodicidade da requalificação deve ficar entre ' + CFOFICIAL_CFG.PERIODICIDADE_MIN_MESES + ' e ' + CFOFICIAL_CFG.PERIODICIDADE_MAX_MESES + ' meses.', 'Corrija a periodicidade em "Qualificação" (o padrão é ' + CFOFICIAL_CFG.PERIODICIDADE_PADRAO_MESES + ' meses).');
    meses = CFOFICIAL_CFG.PERIODICIDADE_PADRAO_MESES;
  }

  var vistos = {};
  var ids = (Array.isArray(p.ensaios) ? p.ensaios : []).map(CadeiaFrioOficial_s_).filter(function (x) { if (!x || vistos[x]) return false; vistos[x] = true; return true; });
  var ensaios = [];
  ids.forEach(function (id) { var r = CadeiaFrioOficial_ensaioDaEmissao_(id, ident); if (r.ok) ensaios.push(r.ensaio); else travas.push(r.trava); });
  ensaios.sort(function (a, b) { return (SGO_QEQ_iso_(a.resumo.identificacao.dataDoEnsaio) || '').localeCompare(SGO_QEQ_iso_(b.resumo.identificacao.dataDoEnsaio) || '') || String(a.numero).localeCompare(String(b.numero)); });
  if ((etapas.QO || etapas.QD) && !ids.length) trava('SEM_ENSAIO', 'Nenhum relatório de ensaio foi escolhido.', 'Em "Relatórios de ensaio do equipamento", marque os relatórios que fundamentam esta qualificação.');
  ensaios.forEach(function (c) { if (c.resultado !== 'APROVADO' && c.resultado !== 'REPROVADO') trava('ENSAIO_INFORMATIVO', 'O relatório de ensaio ' + c.numero + ' é só de caracterização (sem critério de aprovação) e não fundamenta a qualificação.', 'Desmarque este relatório, ou emita uma nova revisão dele com o tempo-alvo (ou a autonomia mínima) de cada estudo.'); });
  if (etapas.QO && ids.length && !ensaios.some(function (c) { return c.etapas.indexOf('QO') >= 0; })) trava('SEM_ENSAIO_QO', 'A qualificação de operação foi marcada, mas nenhum relatório escolhido tem estudo em vazio, de abertura de porta, de queda de energia ou de autonomia.', 'Marque o relatório desses estudos ou desmarque a qualificação de operação.');
  if (etapas.QD && ids.length && !ensaios.some(function (c) { return c.etapas.indexOf('QD') >= 0; })) trava('SEM_ENSAIO_QD', 'A qualificação de desempenho foi marcada, mas nenhum relatório escolhido tem estudo de distribuição com carga.', 'Marque o relatório do estudo com carga ou desmarque a qualificação de desempenho.');
  if (!etapas.QO && !etapas.QD && ids.length) trava('ENSAIO_SEM_ETAPA', 'Há relatórios de ensaio marcados, mas só a qualificação de instalação foi escolhida.', 'Marque a etapa correspondente (operação ou desempenho) ou desmarque os relatórios.');

  var qi = [];
  if (etapas.QI) {
    var resp = p.qi || {};
    CFOFICIAL_CFG.QI_ITENS.forEach(function (it) {
      var r = resp[it.id] || {};
      var sit = CadeiaFrioOficial_up_(r.situacao);
      qi.push({ id: it.id, texto: it.texto, situacao: CFOFICIAL_CFG.SITUACOES_QI[sit] ? sit : '', observacao: CadeiaFrioOficial_s_(r.observacao).slice(0, 400) });
    });
    var semResp = qi.filter(function (x) { return !x.situacao; });
    if (semResp.length) trava('QI_INCOMPLETA', 'A lista da qualificação de instalação tem ' + semResp.length + ' item(ns) sem resposta.', 'Em "Qualificação de instalação", marque Conforme, Não conforme ou Não aplicável em todos os itens.');
    qi.filter(function (x) { return x.situacao === 'NC' && x.observacao.length < 10; }).forEach(function (x) { trava('QI_NC_SEM_OBS', 'Item não conforme sem descrição: ' + x.texto + '.', 'Descreva o que foi encontrado na observação do item (ao menos 10 caracteres).'); });
  }

  var ncs = [];
  ensaios.forEach(function (c) {
    if (c.resultado !== 'REPROVADO') return;
    var falhas = [];
    (c.resumo.estudos || []).forEach(function (e) { (e.criterios || []).filter(function (k) { return k.decide && k.conforme === false; }).forEach(function (k) { falhas.push(e.label + ' — ' + k.criterio.toLowerCase() + ': obtido ' + k.obtido + ' (requisito ' + k.requisito.charAt(0).toLowerCase() + k.requisito.slice(1) + ')'); }); });
    ncs.push({ origem: 'Relatório de ensaio ' + c.numero + (c.revisao !== '0' ? ' rev ' + c.revisao : ''), texto: falhas.length ? falhas.join('; ') : (c.resumo.resumoResultado || 'ensaio reprovado') });
  });
  qi.filter(function (x) { return x.situacao === 'NC'; }).forEach(function (x) { ncs.push({ origem: 'Qualificação de instalação', texto: x.texto + ': ' + x.observacao }); });
  var status = ncs.length ? 'REPROVADO' : 'APROVADO';

  var observacoes = [];
  ensaios.forEach(function (c) {
    var pre = 'Relatório de ensaio ' + c.numero + ': ';
    if ((c.resumo.sensoresDesconsiderados || []).length) observacoes.push(pre + 'sensores desconsiderados na análise: ' + c.resumo.sensoresDesconsiderados.join(', ') + '.');
    (c.resumo.estudos || []).forEach(function (e) {
      (e.desviosMetodo || []).forEach(function (d) { observacoes.push(pre + e.label.toLowerCase() + ', desvio do método — ' + String(d).replace(/[.\s]+$/, '') + '.'); });
      (e.criterios || []).filter(function (k) { return k.naoAvaliado; }).forEach(function (k) { observacoes.push(pre + e.label.toLowerCase() + ', ' + k.criterio.toLowerCase() + ' não avaliado (caracterização).'); });
    });
  });
  var obsLivre = CadeiaFrioOficial_s_(p.observacoes).slice(0, 2000);

  var datas = ensaios.map(function (c) { return SGO_QEQ_iso_(c.resumo.identificacao.dataDoEnsaio); }).filter(Boolean);
  var dataQi = SGO_QEQ_iso_(p.dataQi);
  if (etapas.QI && dataQi) datas.push(dataQi);
  datas.sort();
  if (etapas.QI && !dataQi) trava('QI_SEM_DATA', 'A data da verificação da instalação não foi informada.', 'Informe a data em "Qualificação de instalação" (dd/mm/aaaa).');
  var inicioIso = datas[0] || '', fimIso = datas[datas.length - 1] || '';
  var validadeIso = status === 'APROVADO' && fimIso ? SGO_QEQ_somarMeses_(fimIso, meses) : '';

  var instrumentos = [], vistosInst = {};
  ensaios.forEach(function (c) {
    ((c.resumo.registradores || {}).itens || []).forEach(function (it) {
      var k = SGO_QEQ_normTag_(it.tag) + '|' + CadeiaFrioOficial_s_(it.certificado);
      if (vistosInst[k]) { vistosInst[k].ensaios.push(c.numero); return; }
      var o = { tag: it.tag, certificado: it.certificado, validade: it.validade, situacao: it.situacao, conforme: it.conforme, incertezaU95: it.incertezaU95, ensaios: [c.numero] };
      vistosInst[k] = o; instrumentos.push(o);
    });
  });
  var criterios = [], vistosCrit = {};
  ensaios.forEach(function (c) {
    (c.resumo.estudos || []).forEach(function (e) {
      (e.criterios || []).forEach(function (k) {
        var chave = e.tipoEstudo + '|' + k.chave + '|' + k.requisito;
        if (vistosCrit[chave]) return;
        vistosCrit[chave] = true;
        criterios.push({ estudo: e.label, criterio: k.criterio, requisito: k.requisito, referencia: k.referencia, metodo: !!k.metodo });
      });
    });
  });
  var perfis = [];
  ensaios.forEach(function (c) { if (c.resumo.equipamentoLabel && perfis.indexOf(c.resumo.equipamentoLabel) < 0) perfis.push(c.resumo.equipamentoLabel); });
  var faixa = ensaios.length ? ensaios[0].resumo.faixa : null;
  var tecnicos = [];
  ensaios.forEach(function (c) { var t = CadeiaFrioOficial_s_(c.resumo.identificacao.tecnicoExecutor); if (t && tecnicos.indexOf(t) < 0) tecnicos.push(t); });
  var normas = [CADEIAFRIO_QCFG.NORMAS.NBR16328, CADEIAFRIO_QCFG.NORMAS.RDC430];
  if (ensaios.some(function (c) { return c.resumo.perfil === 'CAMARA_VACINA_2_8'; })) normas.push(CADEIAFRIO_QCFG.NORMAS.PNI);

  var ctx = {
    versao: 1,
    identificacao: {
      clienteId: ident.clienteId, unidadeId: ident.unidadeId, equipamentoId: ident.equipamentoId,
      cliente: ident.cliente, cnpj: ident.cnpj, endereco: ident.endereco, cidadeUf: ident.cidadeUf, unidade: ident.unidade, setor: ident.setor,
      tag: ident.tag, tipo: ident.tipo, numeroSerie: ident.numeroSerie, perfis: perfis,
      empresaExecutante: CadeiaFrioRel_CFCFG.EMPRESA_EXECUTANTE || {}, tecnicos: tecnicos, responsavelCliente: CadeiaFrioOficial_s_(p.responsavelCliente).slice(0, 120)
    },
    etapas: etapas, motivo: motivo, periodicidadeMeses: meses, faixa: faixa,
    inicio: SGO_QEQ_br_(inicioIso), fim: SGO_QEQ_br_(fimIso), validadeAte: SGO_QEQ_br_(validadeIso), validadeIso: validadeIso, dataQi: SGO_QEQ_br_(dataQi),
    ensaios: ensaios.map(function (c) { return { emissaoId: c.emissaoId, numero: c.numero, revisao: c.revisao, aprovadoPor: c.aprovadoPor, aprovadoEm: c.aprovadoEm, hash: c.hash, resultado: c.resultado, etapas: c.etapas, resumo: c.resumo }; }),
    qi: qi, criterios: criterios, instrumentos: instrumentos, normas: normas,
    statusConsolidado: status, naoConformidades: ncs, observacoes: observacoes, observacaoLivre: obsLivre,
    regraDecisao: CADEIAFRIO_QCFG.EMISSAO.regraDecisao,
    travas: travas, emissaoBloqueada: travas.length > 0,
    _nomesProibidos: ident._nomesProibidos
  };
  // 21/10/2026: patrimônio, capacidade, câmaras e ano do cadastro entram só quando preenchidos (a assinatura dos envios antigos não muda).
  ['patrimonio', 'capacidade', 'numCamaras', 'anoFabricacao'].forEach(function (k) { if (CadeiaFrioOficial_s_(ident[k])) ctx.identificacao[k] = CadeiaFrioOficial_s_(ident[k]); });
  // 22/10/2026 (pedido do dono): fabricante (marca) e modelo do cadastro saem no documento. Ficam fora da
  // identificação assinada, para os envios que aguardam aprovação continuarem válidos.
  ctx.equipamentoCadastro = { fabricante: CadeiaFrioOficial_s_(ident.fabricante), modelo: CadeiaFrioOficial_s_(ident.modelo) };
  ctx.assinatura = SGO_DocSalvar_assinatura_({ i: ctx.identificacao, e: ctx.etapas, m: ctx.motivo, p: ctx.periodicidadeMeses, q: ctx.qi, d: ctx.dataQi,
    c: ctx.ensaios.map(function (c) { return [c.emissaoId, c.revisao, c.hash, c.resultado]; }), o: ctx.observacaoLivre, s: ctx.statusConsolidado });
  return ctx;
}

/* ============================================================
 * Textos (padrão determinístico e redação por IA com conferência)
 * ============================================================ */

function CadeiaFrioOficial_etapasTexto_(etapas) {
  var l = [];
  if (etapas.QI) l.push('de instalação');
  if (etapas.QO) l.push('de operação');
  if (etapas.QD) l.push('de desempenho');
  if (!l.length) return 'qualificação';
  return 'qualificação ' + (l.length === 1 ? l[0] : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]);
}

function CadeiaFrioOficial_textosPadrao_(ctx) {
  var id = ctx.identificacao;
  var partes = ['O equipamento ' + (id.tag ? id.tag + ' ' : '') + 'foi submetido à ' + CadeiaFrioOficial_etapasTexto_(ctx.etapas) + (ctx.inicio ? (ctx.inicio === ctx.fim ? ' em ' + ctx.inicio : ' de ' + ctx.inicio + ' a ' + ctx.fim) : '') + '.'];
  var estudos = [];
  ctx.ensaios.forEach(function (c) { (c.resumo.estudos || []).forEach(function (e) { estudos.push(e.label.toLowerCase()); }); });
  if (ctx.statusConsolidado === 'APROVADO') {
    var p2 = [];
    if (estudos.length) p2.push('os estudos de ' + estudos.join('; ') + ', documentados nos relatórios de ensaio listados no Anexo A, atenderam aos critérios de aceitação aplicáveis');
    if (ctx.etapas.QI) p2.push('todos os itens aplicáveis da verificação da instalação foram considerados conformes');
    if (p2.length) partes.push(p2.join('; ').replace(/^./, function (c) { return c.toUpperCase(); }) + '.');
    partes.push('Com base nesses resultados, o equipamento está APROVADO na qualificação, para o uso e a configuração de carga avaliados' + (ctx.validadeAte ? ', com requalificação prevista até ' + ctx.validadeAte : '') + '.');
  } else {
    partes.push('Foram registradas as seguintes não conformidades: ' + ctx.naoConformidades.map(function (n) { return n.origem.toLowerCase().replace(/^relatório/, 'no relatório') + ', ' + (n.texto.charAt(0).toLowerCase() + n.texto.slice(1)).replace(/[.\s]+$/, ''); }).join('; ') + '.');
    partes.push('O equipamento está REPROVADO na qualificação e não deve ser usado para conservar os produtos até que as causas sejam investigadas e corrigidas e uma nova qualificação tenha resultado aprovado.');
  }
  var simples = ctx.statusConsolidado === 'APROVADO'
    ? 'Nos estudos realizados, o equipamento manteve a temperatura dentro da faixa exigida para conservar os produtos com segurança. Ele está aprovado para esse uso' + (ctx.validadeAte ? ' e deve ser qualificado novamente até ' + ctx.validadeAte : '') + ', ou antes, se passar por manutenção importante, mudar de local ou de arranjo interno.'
    : 'Nos estudos realizados, o equipamento não manteve a temperatura dentro da faixa exigida em todas as condições avaliadas. Ele está reprovado e não deve ser usado para conservar os produtos até a correção do problema e um novo ensaio com resultado aprovado.';
  return { conclusao: partes.join(' '), conclusaoSimples: simples };
}

function CadeiaFrioOficial_regrasTexto_(ctx, exigirVeredito, verificarNumeros) {
  var termos = [];
  (ctx._nomesProibidos || []).forEach(function (n) { termos.push(new RegExp('\\b' + String(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')); });
  return {
    numeros: SGO_QIAV_numerosDe_([ctx.ensaios.map(function (c) { return [c.numero, c.resumo.estudos]; }), ctx.periodicidadeMeses, ctx.inicio, ctx.fim, ctx.validadeAte, ctx.normas, ctx.instrumentos, ctx.faixa]),
    normas: ctx.normas, veredito: ctx.statusConsolidado, exigirVeredito: !!exigirVeredito, verificarNumeros: verificarNumeros !== false, termosProibidos: termos
  };
}

function CadeiaFrioOficial_conferirTextos_(ctx, textos, verificarNumeros) {
  return SGO_QIAV_verificarBlocos_({
    'Conclusão': { texto: textos.conclusao, regras: CadeiaFrioOficial_regrasTexto_(ctx, true, verificarNumeros) },
    'Conclusão em linguagem simples': { texto: textos.conclusaoSimples, regras: CadeiaFrioOficial_regrasTexto_(ctx, false, verificarNumeros) }
  });
}

function CadeiaFrioOficial_redigirIA_(ctx) {
  var fatos = {
    equipamento: { tag: ctx.identificacao.tag, tipo: ctx.identificacao.tipo, unidade: ctx.identificacao.unidade }, etapas: CadeiaFrioOficial_etapasTexto_(ctx.etapas), motivo: ctx.motivo,
    periodo: { inicio: ctx.inicio, fim: ctx.fim }, resultado: ctx.statusConsolidado, requalificacaoAte: ctx.validadeAte, periodicidadeMeses: ctx.periodicidadeMeses,
    ensaios: ctx.ensaios.map(function (c) { return { relatorio: c.numero, resultado: c.resultado, estudos: (c.resumo.estudos || []).map(function (e) { return { estudo: e.label, resultado: e.statusAprovacao, criteriosNaoAtendidos: (e.criterios || []).filter(function (k) { return k.decide && k.conforme === false; }).map(function (k) { return k.criterio + ' (obtido ' + k.obtido + '; requisito ' + k.requisito + ')'; }) }; }) }; }),
    instalacao: ctx.etapas.QI ? { itens: ctx.qi.length, naoConformes: ctx.qi.filter(function (x) { return x.situacao === 'NC'; }).map(function (x) { return x.texto; }) } : undefined,
    naoConformidades: ctx.naoConformidades.map(function (n) { return n.origem + ': ' + n.texto; }), normasCitaveis: ctx.normas
  };
  var prompt = ['Você redige a conclusão de um relatório de qualificação de equipamento da cadeia de frio, como o engenheiro responsável técnico.', SGO_DocA4_regrasRedacaoIA_(),
    '- Não cite número de seção ou de item deste relatório nem de norma.',
    'Devolva somente um objeto JSON com duas chaves: "conclusao" (dois a quatro parágrafos técnicos, que terminam declarando o resultado: ' + ctx.statusConsolidado + ') e "conclusaoSimples" (um parágrafo curto, sem termos técnicos, para o gestor do serviço de saúde, com o mesmo resultado).',
    'FATOS (únicos permitidos):', JSON.stringify(fatos)].join('\n');
  var bruto = SGO_DocA4_chamarGemini_(prompt, { tokens: 16384, temperatura: 0.2 });
  var m = /\{[\s\S]*\}/.exec(String(bruto || ''));
  if (!m) throw new Error('a redação automática não devolveu o formato esperado');
  var o = JSON.parse(m[0]);
  return { conclusao: SGO_DocA4_limparTextoIA_(o.conclusao), conclusaoSimples: SGO_DocA4_limparTextoIA_(o.conclusaoSimples) };
}

function CadeiaFrioOficial_textosDoPayload_(ctx, p) {
  var t = p.textos || {};
  var textos = { conclusao: CadeiaFrioOficial_s_(t.conclusao), conclusaoSimples: CadeiaFrioOficial_s_(t.conclusaoSimples) };
  if (!textos.conclusao || !textos.conclusaoSimples) throw new Error('A conclusão está incompleta. Clique em "Gerar rascunho" para receber o texto padrão, revise e envie de novo.');
  var conf = CadeiaFrioOficial_conferirTextos_(ctx, textos, false);
  if (!conf.ok) throw new Error('A conclusão revisada não pode ser emitida: ' + conf.problemas.join('; ') + '. Corrija o texto (o resultado é o calculado pelo sistema) e tente de novo.');
  return textos;
}

function CadeiaFrioOficial_assinaturas_(ctx, aprovacao, enviadoPor) {
  var lista = [];
  if (enviadoPor) lista.push({ papel: 'Elaborado por', nome: enviadoPor, cargo: 'Equipe técnica da empresa executante' });
  (CadeiaFrioRel_CFCFG.ASSINATURAS_PADRAO || []).forEach(function (a) { lista.push(Object.assign({ papel: 'Responsável técnico' }, a)); });
  if (aprovacao && aprovacao.nome) lista.push({ papel: 'Aprovado para emissão por', nome: aprovacao.nome, cargo: 'Aprovação registrada no sistema em ' + aprovacao.em });
  lista.push({ papel: 'Ciência do contratante', nome: ctx.identificacao.responsavelCliente || ' ', cargo: 'Responsável pelo serviço — ' + (ctx.identificacao.cliente || 'contratante') });
  return lista;
}

function CadeiaFrioOficial_historico_(numero, idAtual) {
  if (!numero) return [];
  return SGO_QE_listar_(CFOFICIAL_CFG.MODULO).filter(function (r) { return r.NUMERO === numero && r.ID !== idAtual && (r.STATUS === 'EMITIDO' || r.STATUS === 'SUBSTITUIDO'); })
    .map(function (r) { var mot = ''; try { mot = CadeiaFrioOficial_s_(JSON.parse(r.PAYLOAD_JSON || '{}').motivoRevisao); } catch (e) {} return { revisao: CadeiaFrioOficial_s_(r.REVISAO) || '0', em: CadeiaFrioOficial_s_(r.APROVADO_EM).slice(0, 10), por: r.APROVADO_POR, motivo: mot }; })
    .sort(function (a, b) { return (parseInt(a.revisao, 10) || 0) - (parseInt(b.revisao, 10) || 0); });
}

function CadeiaFrioOficial_html_(ctx, textos, o) {
  o = o || {};
  return CadeiaFrioOficialDoc_montar_({
    ctx: ctx, textos: textos, numero: o.numero || '(atribuído no envio para aprovação)', revisao: o.revisao === undefined ? '0' : o.revisao,
    aprovacao: o.aprovacao || null, minuta: !!o.minuta, enviadoPor: o.enviadoPor || '', motivoRevisao: o.motivoRevisao || '',
    historico: o.historico || [], assinaturas: CadeiaFrioOficial_assinaturas_(ctx, o.aprovacao, o.enviadoPor), emitidoEm: o.emitidoEm || CadeiaFrioOficial_hojeBr_()
  });
}

/* ============================================================
 * API (CadeiaFrioOficial_apiDispatch)
 * ============================================================ */

function CadeiaFrioOficial_apiSituacao(p, sessao) {
  return { ok: true, podeAprovar: CadeiaFrioOficial_ehAprovador_(sessao), motivos: CFOFICIAL_CFG.MOTIVOS, qiItens: CFOFICIAL_CFG.QI_ITENS,
    periodicidadePadrao: CFOFICIAL_CFG.PERIODICIDADE_PADRAO_MESES, periodicidadeMin: CFOFICIAL_CFG.PERIODICIDADE_MIN_MESES, periodicidadeMax: CFOFICIAL_CFG.PERIODICIDADE_MAX_MESES };
}

function CadeiaFrioOficial_apiEquipamento(p, sessao, sessionId) {
  var ident = SGO_QEQ_identificacao_(sessionId, p.clienteId, p.unidadeId, p.equipamentoId);
  var nome = SGO_QE_nomeSessao_(sessao), aprovador = CadeiaFrioOficial_ehAprovador_(sessao);
  var oficiais = SGO_QE_listar_(CFOFICIAL_CFG.MODULO).filter(function (r) { return CadeiaFrioOficial_s_(r.EQUIPAMENTO_ID) === ident.equipamentoId; })
    .filter(function (r) { return r.STATUS === 'EMITIDO' || r.STATUS === 'SUBSTITUIDO' || aprovador || r.ENVIADO_POR === nome; })
    .map(function (r) {
      return { id: r.ID, numero: r.NUMERO, revisao: CadeiaFrioOficial_s_(r.REVISAO) || '0', status: r.STATUS, resultado: r.RESULTADO, validadeAte: r.VALIDADE_ATE, enviadoPor: r.ENVIADO_POR, enviadoEm: r.ENVIADO_EM,
        aprovadoPor: r.APROVADO_POR, aprovadoEm: r.APROVADO_EM, motivoDevolucao: r.DEVOLVIDO_MOTIVO, pdfId: r.PDF_ID, htmlId: r.HTML_ID, pdfUrl: CadeiaFrioOficial_urlArquivo_(r.PDF_ID), htmlUrl: CadeiaFrioOficial_urlArquivo_(r.HTML_ID) };
    }).sort(function (a, b) { return String(b.enviadoEm).localeCompare(String(a.enviadoEm)); });
  var itens = SGO_QEQ_todosItens_()[ident.equipamentoId] || [];
  return { ok: true, identificacao: { clienteId: ident.clienteId, unidadeId: ident.unidadeId, equipamentoId: ident.equipamentoId, cliente: ident.cliente, cnpj: ident.cnpj, unidade: ident.unidade, setor: ident.setor, tag: ident.tag, tipo: ident.tipo, numeroSerie: ident.numeroSerie },
    tipoCompativel: CADEIAFRIO_QCFG.TIPO_EQUIPAMENTO_RE.test(SGO_QEQ_semAcento_(ident.tipo)), ensaios: CadeiaFrioOficial_ensaiosDoEquipamento_(ident.equipamentoId),
    oficiais: oficiais, situacao: SGO_QEQ_situacao_(itens.filter(function (i) { return i.situacao !== 'MINUTA'; })) };
}

function CadeiaFrioOficial_resumoTela_(ctx) {
  return { statusConsolidado: ctx.statusConsolidado, inicio: ctx.inicio, fim: ctx.fim, validadeAte: ctx.validadeAte, periodicidadeMeses: ctx.periodicidadeMeses,
    ensaios: ctx.ensaios.map(function (c) { return { numero: c.numero, revisao: c.revisao, resultado: c.resultado, etapas: c.etapas, data: c.resumo.identificacao.dataDoEnsaio, estudos: (c.resumo.estudos || []).map(function (e) { return e.label; }).join('; ') }; }),
    naoConformidades: ctx.naoConformidades, observacoes: ctx.observacoes };
}

function CadeiaFrioOficial_apiGerarRascunho(p, sessao, sessionId) {
  var ctx = CadeiaFrioOficial_montarContexto_(sessionId, p);
  var base = { ok: true, assinaturaContexto: ctx.assinatura, resumo: CadeiaFrioOficial_resumoTela_(ctx), travas: ctx.travas, bloqueado: ctx.emissaoBloqueada, podeAprovar: CadeiaFrioOficial_ehAprovador_(sessao) };
  if (ctx.emissaoBloqueada) return Object.assign(base, { textos: { conclusao: '', conclusaoSimples: '' }, avisoIA: 'O relatório não pode ser enviado enquanto os itens abaixo não forem resolvidos. Nada foi redigido.' });
  var textos = CadeiaFrioOficial_textosPadrao_(ctx), origem = 'PADRAO', aviso = '';
  if (p.redigirComIA) {
    try {
      var t = CadeiaFrioOficial_redigirIA_(ctx);
      var conf = CadeiaFrioOficial_conferirTextos_(ctx, t, true);
      if (conf.ok) { textos = t; origem = 'IA'; }
      else aviso = 'O texto redigido automaticamente não passou na conferência (' + conf.problemas.slice(0, 4).join('; ') + '). Foi usado o texto padrão, montado só com os resultados; revise se quiser.';
    } catch (e) { aviso = 'A redação automática não está disponível (' + CadeiaFrioOficial_msg_(e) + '). Foi usado o texto padrão, montado só com os resultados; revise se quiser.'; }
  }
  return Object.assign(base, { textos: textos, origemTexto: origem, avisoIA: aviso });
}

function CadeiaFrioOficial_validarEnvio_(sessionId, p) {
  var ctx = CadeiaFrioOficial_montarContexto_(sessionId, p);
  if (ctx.emissaoBloqueada) throw new Error('O relatório não pode seguir: ' + ctx.travas.map(function (t) { return t.texto + ' ' + t.comoCorrigir; }).join(' '));
  if (!p.assinaturaContexto || p.assinaturaContexto !== ctx.assinatura) throw new Error('Os dados mudaram desde o rascunho (ou o rascunho não foi gerado). Clique em "Gerar rascunho" de novo, revise a conclusão e envie.');
  return { ctx: ctx, textos: CadeiaFrioOficial_textosDoPayload_(ctx, p) };
}

function CadeiaFrioOficial_apiPrevia(p, sessao, sessionId) {
  var ctx = CadeiaFrioOficial_montarContexto_(sessionId, p);
  var textos = (p.textos && p.textos.conclusao) ? { conclusao: CadeiaFrioOficial_s_(p.textos.conclusao), conclusaoSimples: CadeiaFrioOficial_s_(p.textos.conclusaoSimples) } : CadeiaFrioOficial_textosPadrao_(ctx);
  var html = CadeiaFrioOficial_html_(ctx, textos, { numero: p.numero, minuta: true, enviadoPor: SGO_QE_nomeSessao_(sessao), historico: CadeiaFrioOficial_historico_(p.numero, '') });
  return { ok: true, html: SGO_DocA4_prepararSumario_(html).html, travas: ctx.travas };
}

function CadeiaFrioOficial_apiEnviarParaAprovacao(p, sessao, sessionId) {
  p = p || {};
  var v = CadeiaFrioOficial_validarEnvio_(sessionId, p);
  var numero = CadeiaFrioOficial_s_(p.numero);
  if (numero) {
    var emitidas = SGO_QE_listar_(CFOFICIAL_CFG.MODULO).filter(function (r) { return r.NUMERO === numero && (r.STATUS === 'EMITIDO' || r.STATUS === 'SUBSTITUIDO'); });
    if (!emitidas.length) throw new Error('O número ' + numero + ' não corresponde a um relatório emitido. Para um relatório novo, deixe o número em branco: ele é atribuído no envio.');
    if (emitidas.some(function (r) { return CadeiaFrioOficial_s_(r.EQUIPAMENTO_ID) !== v.ctx.identificacao.equipamentoId; })) throw new Error('O relatório ' + numero + ' é de outro equipamento; a nova revisão precisa ser do mesmo equipamento.');
    if (CadeiaFrioOficial_s_(p.motivoRevisao).length < 10) throw new Error('Descreva o motivo da nova revisão (ao menos 10 caracteres): ele aparece no registro de revisões do documento.');
  } else {
    numero = CadeiaFrioOficial_proximoNumero_();
  }
  var id = SGO_QE_registrar_({
    MODULO: CFOFICIAL_CFG.MODULO, STATUS: 'AGUARDANDO_APROVACAO', NUMERO: numero, REVISAO: String(SGO_QE_proximaRevisao_(CFOFICIAL_CFG.MODULO, numero, 0)),
    CLIENTE: v.ctx.identificacao.cliente, CNPJ: v.ctx.identificacao.cnpj, TAG: v.ctx.identificacao.tag, RESULTADO: v.ctx.statusConsolidado,
    HASH_CONTEXTO: v.ctx.assinatura, ENVIADO_POR: SGO_QE_nomeSessao_(sessao), ENVIADO_EM: SGO_QE_agora_(),
    PAYLOAD_JSON: JSON.stringify(Object.assign({}, p, { numero: numero, textos: v.textos })), CLIENTE_ID: v.ctx.identificacao.clienteId, UNIDADE_ID: v.ctx.identificacao.unidadeId,
    EQUIPAMENTO_ID: v.ctx.identificacao.equipamentoId, VALIDADE_ATE: v.ctx.validadeAte
  });
  SGO_QEQ_log_('CADEIA_FRIO_OFICIAL_ENVIADO', sessao, 'Relatório de qualificação ' + numero + ' enviado para aprovação (registro ' + id + ').');
  return { ok: true, id: id, numero: numero, mensagem: 'Relatório ' + numero + ' enviado para aprovação do responsável técnico. Ele confere a prévia em "Aguardando aprovação" e emite, ou devolve com o motivo.' };
}

function CadeiaFrioOficial_apiListarAprovacoes(p, sessao) {
  var aprovador = CadeiaFrioOficial_ehAprovador_(sessao), nome = SGO_QE_nomeSessao_(sessao);
  var itens = SGO_QE_listar_(CFOFICIAL_CFG.MODULO).filter(function (r) { return r.STATUS === 'AGUARDANDO_APROVACAO' || (r.STATUS === 'DEVOLVIDO' && r.ENVIADO_POR === nome); })
    .filter(function (r) { return aprovador || r.ENVIADO_POR === nome; })
    .map(function (r) { return { id: r.ID, status: r.STATUS, numero: r.NUMERO, revisao: r.REVISAO, cliente: r.CLIENTE, tag: r.TAG, resultado: r.RESULTADO, enviadoPor: r.ENVIADO_POR, enviadoEm: r.ENVIADO_EM, motivoDevolucao: r.DEVOLVIDO_MOTIVO }; });
  return { ok: true, podeAprovar: aprovador, itens: itens };
}

function CadeiaFrioOficial_carregar_(id, status) {
  var reg = SGO_QE_obter_(id);
  if (!reg || reg.MODULO !== CFOFICIAL_CFG.MODULO) throw new Error('Registro não encontrado. Atualize a lista.');
  if (status && reg.STATUS !== status) throw new Error('Este registro não está ' + (status === 'AGUARDANDO_APROVACAO' ? 'aguardando aprovação' : 'disponível para esta ação') + ' (situação: ' + reg.STATUS + '). Atualize a lista.');
  return { reg: reg, payload: JSON.parse(reg.PAYLOAD_JSON || '{}') };
}

function CadeiaFrioOficial_conferirPendente_(sessionId, c) {
  var ctx = CadeiaFrioOficial_montarContexto_(sessionId, c.payload);
  if (ctx.emissaoBloqueada) throw new Error('O relatório não pode ser emitido: ' + ctx.travas.map(function (t) { return t.texto; }).join(' ') + ' Devolva ao técnico com o motivo.');
  if (ctx.assinatura !== c.reg.HASH_CONTEXTO) throw new Error('Os dados mudaram desde o envio (por exemplo, um relatório de ensaio ganhou revisão nova ou o cadastro foi alterado). Devolva ao técnico para gerar o rascunho de novo.');
  return { ctx: ctx, textos: CadeiaFrioOficial_textosDoPayload_(ctx, c.payload) };
}

function CadeiaFrioOficial_apiPreverAprovacao(p, sessao, sessionId) {
  CadeiaFrioOficial_exigirAprovador_(sessao);
  var c = CadeiaFrioOficial_carregar_(p.id, 'AGUARDANDO_APROVACAO');
  var v = CadeiaFrioOficial_conferirPendente_(sessionId, c);
  var html = CadeiaFrioOficial_html_(v.ctx, v.textos, { numero: c.reg.NUMERO, revisao: c.reg.REVISAO, minuta: true, enviadoPor: c.reg.ENVIADO_POR, motivoRevisao: c.payload.motivoRevisao, historico: CadeiaFrioOficial_historico_(c.reg.NUMERO, c.reg.ID) });
  return { ok: true, html: SGO_DocA4_prepararSumario_(html).html };
}

function CadeiaFrioOficial_apiAprovarEmitir(p, sessao, sessionId) {
  CadeiaFrioOficial_exigirAprovador_(sessao);
  if (!p || p.confirmacaoRevisao !== true) throw new Error('Marque "Conferi os dados, os critérios e a conclusão e aprovo a emissão" antes de aprovar.');
  var c = CadeiaFrioOficial_carregar_(p.id, 'AGUARDANDO_APROVACAO');
  var v = CadeiaFrioOficial_conferirPendente_(sessionId, c);
  var ctx = v.ctx, ident = ctx.identificacao, numero = c.reg.NUMERO;
  var revisao = SGO_QE_proximaRevisao_(CFOFICIAL_CFG.MODULO, numero, 0);
  var aprovacao = { nome: SGO_QE_nomeSessao_(sessao), login: CadeiaFrioOficial_s_(sessao.usuario), perfil: CadeiaFrioOficial_s_(sessao.perfil), em: SGO_QE_agora_() };
  var html = CadeiaFrioOficial_html_(ctx, v.textos, { numero: numero, revisao: String(revisao), aprovacao: aprovacao, enviadoPor: c.reg.ENVIADO_POR, motivoRevisao: c.payload.motivoRevisao, historico: CadeiaFrioOficial_historico_(numero, c.reg.ID) });
  var pasta = SGO_QEQ_pastaEquipamento_(CadeiaFrioRel_pastaLaudos_(), ident);
  var nome = SGO_DocSalvar_sanitizarNome_('Relatório de qualificação Cadeia de Frio - ' + numero + (revisao ? ' rev ' + revisao : '') + ' - ' + (ident.tag || 'sem TAG'));
  var s = SGO_DocSalvar_salvarHtmlEPdf_(pasta, nome, html, { compartilhar: true });
  SGO_QE_atualizar_(c.reg.ID, {
    STATUS: 'EMITIDO', REVISAO: String(revisao), APROVADO_POR: aprovacao.nome, APROVADO_LOGIN: aprovacao.login, APROVADO_PERFIL: aprovacao.perfil, APROVADO_EM: aprovacao.em,
    PDF_ID: s.pdfId || '', HTML_ID: s.htmlId || '', RESULTADO: ctx.statusConsolidado, VALIDADE_ATE: ctx.validadeAte,
    RESUMO_JSON: JSON.stringify({ v: 1, status: ctx.statusConsolidado, validadeAte: ctx.validadeAte, inicio: ctx.inicio, fim: ctx.fim, etapas: ctx.etapas, ensaios: ctx.ensaios.map(function (x) { return { id: x.emissaoId, numero: x.numero, revisao: x.revisao, resultado: x.resultado }; }) })
  });
  SGO_QE_marcarSubstituidas_(CFOFICIAL_CFG.MODULO, numero, c.reg.ID);
  var arq = SGO_QEQ_registrarDocumento_(sessionId, ident, { nomeArquivo: nome, link: s.pdfUrl, vencimentoIso: ctx.validadeIso });
  try { if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_(); } catch (e) {}
  SGO_QEQ_log_('CADEIA_FRIO_OFICIAL_EMITIDO', sessao, 'Relatório de qualificação ' + numero + ' rev ' + revisao + ' emitido (' + ctx.statusConsolidado + ') para o equipamento ' + ident.equipamentoId + '.');
  var pastaUrl = '';
  try { pastaUrl = pasta.getUrl(); } catch (e) {}
  return { ok: true, numero: numero, revisao: revisao, resultado: ctx.statusConsolidado, validadeAte: ctx.validadeAte, pdfId: s.pdfId, pdfUrl: s.pdfUrl, htmlId: s.htmlId, htmlUrl: s.htmlUrl, pastaUrl: pastaUrl, clienteId: ident.clienteId,
    avisoArquivo: arq.ok ? '' : 'O documento foi emitido e salvo na pasta do cliente, mas não entrou no Arquivo de documentos (' + arq.aviso + '). Cadastre o PDF em Documentos para ele aparecer no equipamento.',
    mensagem: 'Relatório ' + numero + ' (revisão ' + revisao + ') emitido e salvo na pasta do equipamento, dentro da pasta do cliente.' };
}

function CadeiaFrioOficial_apiDevolver(p, sessao) {
  CadeiaFrioOficial_exigirAprovador_(sessao);
  var motivo = CadeiaFrioOficial_s_(p && p.motivo);
  if (motivo.length < 10) throw new Error('Escreva o motivo da devolução (ao menos 10 caracteres) para o técnico saber o que corrigir.');
  var c = CadeiaFrioOficial_carregar_(p.id, 'AGUARDANDO_APROVACAO');
  SGO_QE_atualizar_(c.reg.ID, { STATUS: 'DEVOLVIDO', DEVOLVIDO_MOTIVO: motivo, APROVADO_POR: SGO_QE_nomeSessao_(sessao), APROVADO_EM: SGO_QE_agora_() });
  return { ok: true, mensagem: 'Devolvido ao técnico com o motivo registrado.' };
}

/** Dados de um envio devolvido (para corrigir) ou de um relatório emitido (para nova revisão). */
function CadeiaFrioOficial_apiAbrir(p, sessao) {
  var c = CadeiaFrioOficial_carregar_(p.id);
  if (String((p && p.modo) || '').toUpperCase() === 'BASE') return SGO_DocRev_qeComoBase_(c); // 21/10/2026: "Usar como base"
  var nome = SGO_QE_nomeSessao_(sessao);
  if (c.reg.STATUS === 'DEVOLVIDO') {
    if (c.reg.ENVIADO_POR !== nome && !CadeiaFrioOficial_ehAprovador_(sessao)) throw new Error('Este envio é de outra pessoa.');
    var dados = Object.assign({}, c.payload);
    if (!SGO_QE_listar_(CFOFICIAL_CFG.MODULO).some(function (r) { return r.NUMERO === dados.numero && (r.STATUS === 'EMITIDO' || r.STATUS === 'SUBSTITUIDO'); })) dados.numero = '';
    return { ok: true, dados: dados, modo: 'CORRIGIR', mensagem: 'Envio devolvido carregado. Motivo: ' + c.reg.DEVOLVIDO_MOTIVO };
  }
  if (c.reg.STATUS === 'EMITIDO') return { ok: true, dados: Object.assign({}, c.payload, { numero: c.reg.NUMERO, motivoRevisao: '', assinaturaContexto: '' }), modo: 'REVISAR', mensagem: 'Relatório ' + c.reg.NUMERO + ' carregado para nova revisão. Ajuste o que for preciso, gere o rascunho e informe o motivo da revisão.' };
  throw new Error('Este registro não pode ser aberto para edição (situação: ' + c.reg.STATUS + ').');
}

function CadeiaFrioOficial_apiDispatch(req) {
  try {
    req = req || {};
    var sessionId = String(req.sessionId || '');
    var sessao = exigirSessao(sessionId);
    if (!SGO_QEQ_ehEquipe_(sessao)) throw new Error('O relatório de qualificação é feito pela equipe técnica (perfis ' + SGO_QEQ_PERFIS_EQUIPE.join(', ') + ').');
    var allow = {
      apiSituacao: CadeiaFrioOficial_apiSituacao, apiEquipamento: CadeiaFrioOficial_apiEquipamento,
      apiGerarRascunho: CadeiaFrioOficial_apiGerarRascunho, apiPrevia: CadeiaFrioOficial_apiPrevia, apiEnviarParaAprovacao: CadeiaFrioOficial_apiEnviarParaAprovacao,
      apiListarAprovacoes: CadeiaFrioOficial_apiListarAprovacoes, apiPreverAprovacao: CadeiaFrioOficial_apiPreverAprovacao, apiAprovarEmitir: CadeiaFrioOficial_apiAprovarEmitir,
      apiDevolver: CadeiaFrioOficial_apiDevolver, apiAbrir: CadeiaFrioOficial_apiAbrir
    };
    var fn = String(req.fn || '');
    if (!allow[fn]) throw new Error('Operação desconhecida: ' + fn + '. Atualize a página (F5).');
    var r = allow[fn](req.payload || {}, sessao, sessionId);
    if (/^api(EnviarParaAprovacao|AprovarEmitir|Devolver)$/.test(fn) && typeof SGO_Pendencias_invalidar_ === 'function') { try { SGO_Pendencias_invalidar_(); } catch (eP) {} }
    return JSON.parse(JSON.stringify(r));
  } catch (e) {
    return { ok: false, erro: CadeiaFrioOficial_msg_(e) + '.' };
  }
}
