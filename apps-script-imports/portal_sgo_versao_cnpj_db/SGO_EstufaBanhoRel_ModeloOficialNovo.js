/****************************************************
 * ESTUFA, BANHO-MARIA E SECADORA — RELATÓRIO DE QUALIFICAÇÃO DO EQUIPAMENTO (MODELO OFICIAL NOVO, 21/10/2026)
 *
 * Mesmo molde do relatório oficial da autoclave (SGO_AutoRel_ModeloOficialNovo.js), com as regras destes
 * equipamentos. Consolida os relatórios de ensaio térmico já emitidos e aprovados do próprio equipamento
 * (QUALIF_EMISSOES, módulo ESTUFA):
 *  - cliente, unidade e equipamento vêm do cadastro (SGO_QualifEquipamento.js); outro cliente é recusado;
 *  - o resultado de cada ensaio vem do resumo guardado na emissão (motor determinístico); o resultado da
 *    qualificação é decidido aqui, por regra: uma não conformidade (ensaio reprovado ou item da instalação
 *    não conforme) reprova;
 *  - etapas: QI (lista de verificação da instalação), QO (estudos em vazio, abertura de porta e queda de
 *    energia) e QD (estudos com carga e penetração/letalidade);
 *  - IA só redige a conclusão, com o verificador comum; sem IA ou se o texto não passar, vale o texto padrão;
 *  - emissão só com aprovação registrada do responsável técnico (módulo ESTUFA_OFICIAL), nova revisão
 *    substitui a anterior (que continua guardada); HTML A4 + PDF na pasta do equipamento; registro no Arquivo
 *    de documentos com o vencimento da requalificação (ficha do equipamento, QR code, central de pendências,
 *    Caixa de decisões e Cronograma usam esse registro).
 * Modelo anterior do módulo: não havia relatório de qualificação consolidado (só o certificado por ensaio).
 ****************************************************/

var ESTUFAOFICIAL_CFG = {
  MODULO: 'ESTUFA_OFICIAL',
  SIGLA: 'RQE',
  PROP_SEQ: 'ESTUFAOFICIAL_SEQ_',
  // Periodicidade da requalificação: valor inicial da configuração (a confirmar pelo responsável técnico).
  PERIODICIDADE_PADRAO_MESES: 12, PERIODICIDADE_MIN_MESES: 1, PERIODICIDADE_MAX_MESES: 24,
  MOTIVOS: ['Qualificação inicial', 'Requalificação periódica', 'Requalificação após manutenção', 'Requalificação após mudança de local', 'Requalificação após mudança de processo ou de carga'],
  // Lista de verificação da instalação. perfis: só nesses perfis (vazio = todos).
  QI_ITENS: [
    { id: 'documentacao', texto: 'Documentação técnica do equipamento disponível no serviço (manual de operação e orientações de manutenção)' },
    { id: 'identificacao', texto: 'Identificação do equipamento legível (placa com número de série) e coerente com o cadastro' },
    { id: 'local', texto: 'Local de instalação com espaço para operação e manutenção, nivelado e afastado de fontes de calor, de frio e de correntes de ar' },
    { id: 'eletrica', texto: 'Alimentação elétrica compatível com a especificada e com proteção própria' },
    { id: 'vedacao', texto: 'Vedação da porta (ou da tampa) íntegra e fechamento correto' },
    { id: 'controle', texto: 'Controlador e indicação de temperatura em funcionamento' },
    { id: 'alarme', texto: 'Alarme de temperatura em funcionamento, quando existente' },
    { id: 'suportes', texto: 'Prateleiras, cestos ou suportes de carga íntegros e na configuração usada na rotina', perfis: ['ESTUFA_INCUBACAO', 'ESTUFA_ESTERILIZACAO_DESPIROGENIZACAO', 'SECADORA_TRAQUEIAS'] },
    { id: 'agua', texto: 'Nível e qualidade da água da cuba conforme as orientações do fabricante do equipamento', perfis: ['BANHO_MARIA'] },
    { id: 'exaustao', texto: 'Ventilação, exaustão e filtros em condição de uso, quando existentes', perfis: ['ESTUFA_ESTERILIZACAO_DESPIROGENIZACAO', 'SECADORA_TRAQUEIAS'] },
    { id: 'instrumentos', texto: 'Instrumentos de controle do equipamento com calibração em dia, quando aplicável' }
  ],
  SITUACOES_QI: { C: 'Conforme', NC: 'Não conforme', NA: 'Não aplicável' }
};

function EstufaOficial_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function EstufaOficial_up_(v) { return EstufaOficial_s_(v).toUpperCase(); }

function EstufaOficial_exigirAprovador_(sessao) {
  if (!EstufaQ_ehAprovador_(sessao)) throw new Error('Somente o responsável técnico (perfis ' + ESTUFAQ_CFG.PERFIS_APROVADORES.join(', ') + ') confere e aprova o relatório de qualificação.');
}

function EstufaOficial_hojeBr_() { try { return Utilities.formatDate(new Date(), EstufaQ_tz_(), 'dd/MM/yyyy'); } catch (e) { return ''; } }

function EstufaOficial_semNomes_(texto, nomes) {
  var t = EstufaOficial_s_(texto);
  (nomes || []).forEach(function (n) { if (EstufaOficial_s_(n).length >= 3) t = t.replace(new RegExp(String(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').replace(/\s{2,}/g, ' ').trim(); });
  return t;
}

function EstufaOficial_urlArquivo_(id) { if (!EstufaOficial_s_(id)) return ''; try { return DriveApp.getFileById(id).getUrl(); } catch (e) { return ''; } }

function EstufaOficial_proximoNumero_() {
  var ano = '';
  try { ano = Utilities.formatDate(new Date(), EstufaQ_tz_(), 'yyyy'); } catch (e) { ano = String(new Date().getFullYear()); }
  var lock = null;
  try { lock = LockService.getScriptLock(); lock.waitLock(20000); } catch (e) { lock = null; }
  try {
    var props = PropertiesService.getScriptProperties();
    var chave = ESTUFAOFICIAL_CFG.PROP_SEQ + ano;
    var n = (parseInt(props.getProperty(chave), 10) || 0) + 1;
    var usados = SGO_QE_listar_(ESTUFAOFICIAL_CFG.MODULO).map(function (r) { return r.NUMERO; });
    var numero;
    do { numero = ESTUFAOFICIAL_CFG.SIGLA + '-' + ano + '-' + ('0000' + n).slice(-5); n++; } while (usados.indexOf(numero) >= 0);
    props.setProperty(chave, String(n - 1));
    return numero;
  } finally { if (lock) { try { lock.releaseLock(); } catch (e2) {} } }
}

/** Um relatório de ensaio emitido → { ok, ensaio } ou { ok:false, trava }. */
function EstufaOficial_ensaioDaEmissao_(id, ident) {
  var reg = SGO_QE_obter_(id);
  var rotulo = reg ? 'relatório de ensaio ' + reg.NUMERO + (reg.REVISAO && reg.REVISAO !== '0' ? ' rev ' + reg.REVISAO : '') : 'relatório de ensaio escolhido';
  function trava(codigo, texto, fazer) { return { ok: false, trava: { codigo: codigo, texto: texto, comoCorrigir: fazer } }; }
  if (!reg || reg.MODULO !== ESTUFAQ_CFG.MODULO_ENSAIO) return trava('ENSAIO_NAO_ENCONTRADO', 'O ' + rotulo + ' não foi encontrado.', 'Atualize a lista de relatórios de ensaio do equipamento e escolha de novo.');
  if (reg.STATUS === 'SUBSTITUIDO') return trava('ENSAIO_SUBSTITUIDO', 'O ' + rotulo + ' foi substituído por uma revisão mais nova.', 'Desmarque esta revisão e marque a revisão vigente do mesmo relatório.');
  if (reg.STATUS !== 'EMITIDO') return trava('ENSAIO_NAO_EMITIDO', 'O ' + rotulo + ' ainda não foi emitido (situação: ' + reg.STATUS + ').', 'Emita o relatório de ensaio (seção 6 da tela, com a aprovação do responsável técnico) e volte aqui.');
  var eq = EstufaOficial_s_(reg.EQUIPAMENTO_ID);
  if (!eq) return trava('ENSAIO_SEM_VINCULO', 'O ' + rotulo + ' não está ligado a equipamento do cadastro.', 'Em "Relatórios sem vínculo", confira e clique em "Vincular a este equipamento".');
  if (eq !== ident.equipamentoId) return trava('ENSAIO_OUTRO_EQUIPAMENTO', 'O ' + rotulo + ' é de outro equipamento.', 'Desmarque este relatório: só entram relatórios de ensaio do equipamento escolhido.');
  var resumo = null;
  try { resumo = JSON.parse(reg.RESUMO_JSON || 'null'); } catch (e) { resumo = null; }
  if (!resumo) return trava('ENSAIO_SEM_RESUMO', 'O ' + rotulo + ' foi emitido sem o resumo dos resultados.', 'Emita uma nova revisão do relatório de ensaio e marque a revisão nova.');
  var etapas = {};
  (resumo.estudos || []).forEach(function (e) { etapas[e.etapa] = true; });
  return { ok: true, ensaio: { emissaoId: reg.ID, numero: reg.NUMERO, revisao: EstufaOficial_s_(reg.REVISAO) || '0', aprovadoPor: reg.APROVADO_POR, aprovadoEm: reg.APROVADO_EM, hash: EstufaOficial_s_(reg.HASH_CONTEXTO), resultado: resumo.statusConsolidado, etapas: Object.keys(etapas).sort(), resumo: resumo } };
}

function EstufaOficial_ensaiosDoEquipamento_(equipamentoId) {
  return SGO_QE_listar_(ESTUFAQ_CFG.MODULO_ENSAIO).filter(function (r) {
    return EstufaOficial_s_(r.EQUIPAMENTO_ID) === EstufaOficial_s_(equipamentoId) && (r.STATUS === 'EMITIDO' || r.STATUS === 'SUBSTITUIDO');
  }).map(function (r) {
    var rs = null;
    try { rs = JSON.parse(r.RESUMO_JSON || 'null'); } catch (e) { rs = null; }
    return { id: r.ID, numero: r.NUMERO, revisao: EstufaOficial_s_(r.REVISAO) || '0', status: r.STATUS, resultado: r.RESULTADO, emitidoEm: EstufaOficial_s_(r.APROVADO_EM).slice(0, 10), aprovadoPor: r.APROVADO_POR,
      data: rs ? rs.identificacao.dataDoEnsaio : '', estudos: rs ? rs.estudos.map(function (e) { return e.rotulo; }).join('; ') : '' };
  }).sort(function (a, b) { return (a.status === 'SUBSTITUIDO') - (b.status === 'SUBSTITUIDO') || String(b.emitidoEm).localeCompare(String(a.emitidoEm)); });
}

function EstufaOficial_qiItens_(perfil) {
  return ESTUFAOFICIAL_CFG.QI_ITENS.filter(function (it) { return !it.perfis || !perfil || it.perfis.indexOf(perfil) >= 0; });
}

/** Contexto do relatório de qualificação (decisão por regra). */
function EstufaOficial_montarContexto_(sessionId, p) {
  p = p || {};
  var ident = SGO_QEQ_identificacao_(sessionId, p.clienteId, p.unidadeId, p.equipamentoId);
  var travas = [];
  function trava(codigo, texto, fazer) { travas.push({ codigo: codigo, texto: texto, comoCorrigir: fazer }); }
  if (!ESTUFAQ_CFG.TIPO_EQUIPAMENTO_RE.test(SGO_QEQ_semAcento_(ident.tipo))) trava('TIPO_EQUIPAMENTO', 'O equipamento escolhido está cadastrado como "' + ident.tipo + '", e este relatório é de estufa, banho-maria ou secadora.', 'Escolha o equipamento certo ou corrija o tipo em Cadastros › Equipamentos.');
  var etapas = { QI: !!(p.etapas || {}).QI, QO: !!(p.etapas || {}).QO, QD: !!(p.etapas || {}).QD };
  if (!etapas.QI && !etapas.QO && !etapas.QD) trava('SEM_ETAPA', 'Nenhuma etapa da qualificação foi marcada.', 'Marque as etapas executadas (instalação, operação e/ou desempenho).');
  var motivo = EstufaOficial_s_(p.motivo);
  if (ESTUFAOFICIAL_CFG.MOTIVOS.indexOf(motivo) < 0) trava('SEM_MOTIVO', 'O motivo da qualificação não foi escolhido.', 'Escolha o motivo (qualificação inicial ou o tipo de requalificação).');
  var meses = parseInt(p.periodicidadeMeses, 10);
  if (!(meses >= ESTUFAOFICIAL_CFG.PERIODICIDADE_MIN_MESES && meses <= ESTUFAOFICIAL_CFG.PERIODICIDADE_MAX_MESES)) {
    trava('PERIODICIDADE', 'A periodicidade da requalificação deve ficar entre ' + ESTUFAOFICIAL_CFG.PERIODICIDADE_MIN_MESES + ' e ' + ESTUFAOFICIAL_CFG.PERIODICIDADE_MAX_MESES + ' meses.', 'Corrija a periodicidade (o padrão é ' + ESTUFAOFICIAL_CFG.PERIODICIDADE_PADRAO_MESES + ' meses).');
    meses = ESTUFAOFICIAL_CFG.PERIODICIDADE_PADRAO_MESES;
  }
  var vistos = {};
  var ids = (Array.isArray(p.ensaios) ? p.ensaios : []).map(EstufaOficial_s_).filter(function (x) { if (!x || vistos[x]) return false; vistos[x] = true; return true; });
  var ensaios = [];
  ids.forEach(function (id) { var r = EstufaOficial_ensaioDaEmissao_(id, ident); if (r.ok) ensaios.push(r.ensaio); else travas.push(r.trava); });
  ensaios.sort(function (a, b) { return (SGO_QEQ_iso_(a.resumo.identificacao.dataDoEnsaio) || '').localeCompare(SGO_QEQ_iso_(b.resumo.identificacao.dataDoEnsaio) || '') || String(a.numero).localeCompare(String(b.numero)); });
  if ((etapas.QO || etapas.QD) && !ids.length) trava('SEM_ENSAIO', 'Nenhum relatório de ensaio foi escolhido.', 'Em "Relatórios de ensaio do equipamento", marque os relatórios que fundamentam esta qualificação.');
  ensaios.forEach(function (c) { if (c.resultado !== 'APROVADO' && c.resultado !== 'REPROVADO') trava('ENSAIO_INFORMATIVO', 'O relatório de ensaio ' + c.numero + ' é informativo (nenhum critério avaliado) e não fundamenta a qualificação.', 'Desmarque este relatório.'); });
  if (etapas.QO && ids.length && !ensaios.some(function (c) { return c.etapas.indexOf('QO') >= 0; })) trava('SEM_ENSAIO_QO', 'A qualificação de operação foi marcada, mas nenhum relatório escolhido tem estudo em vazio, de abertura de porta ou de queda de energia.', 'Marque o relatório com esses estudos ou desmarque a qualificação de operação.');
  if (etapas.QD && ids.length && !ensaios.some(function (c) { return c.etapas.indexOf('QD') >= 0; })) trava('SEM_ENSAIO_QD', 'A qualificação de desempenho foi marcada, mas nenhum relatório escolhido tem estudo com carga.', 'Marque o relatório do estudo com carga ou desmarque a qualificação de desempenho.');
  if (!etapas.QO && !etapas.QD && ids.length) trava('ENSAIO_SEM_ETAPA', 'Há relatórios de ensaio marcados, mas só a qualificação de instalação foi escolhida.', 'Marque a etapa correspondente (operação ou desempenho) ou desmarque os relatórios.');
  var perfis = [];
  ensaios.forEach(function (c) { if (perfis.indexOf(c.resumo.perfil) < 0) perfis.push(c.resumo.perfil); });
  if (perfis.length > 1) trava('PERFIS_DIFERENTES', 'Os relatórios escolhidos são de perfis diferentes (' + perfis.join(', ') + ').', 'Marque só os relatórios do mesmo tipo de equipamento.');
  var perfil = perfis[0] || EstufaOficial_s_(p.perfil);

  var qi = [];
  if (etapas.QI) {
    var resp = p.qi || {};
    EstufaOficial_qiItens_(perfil).forEach(function (it) {
      var r = resp[it.id] || {};
      var sit = EstufaOficial_up_(r.situacao);
      qi.push({ id: it.id, texto: it.texto, situacao: ESTUFAOFICIAL_CFG.SITUACOES_QI[sit] ? sit : '', observacao: EstufaOficial_s_(r.observacao).slice(0, 400) });
    });
    var sem = qi.filter(function (x) { return !x.situacao; });
    if (sem.length) trava('QI_INCOMPLETA', 'A lista da qualificação de instalação tem ' + sem.length + ' item(ns) sem resposta.', 'Marque Conforme, Não conforme ou Não aplicável em todos os itens.');
    qi.filter(function (x) { return x.situacao === 'NC' && x.observacao.length < 10; }).forEach(function (x) { trava('QI_NC_SEM_OBS', 'Item não conforme sem descrição: ' + x.texto + '.', 'Descreva o que foi encontrado na observação do item (ao menos 10 caracteres).'); });
  }

  var ncs = [];
  ensaios.forEach(function (c) {
    if (c.resultado !== 'REPROVADO') return;
    var falhas = (c.resumo.criterios || []).filter(function (k) { return k.conforme === false; });
    ncs.push({ origem: 'Relatório de ensaio ' + c.numero + (c.revisao !== '0' ? ' rev ' + c.revisao : ''), texto: falhas.length ? falhas.map(function (k) { return k.estudo + ' — ' + k.criterio + ': obtido ' + k.obtido + ' (requisito ' + k.requisito + ')'; }).join('; ') : (c.resumo.resumoResultado || 'ensaio reprovado') });
  });
  qi.filter(function (x) { return x.situacao === 'NC'; }).forEach(function (x) { ncs.push({ origem: 'Qualificação de instalação', texto: x.texto + ': ' + x.observacao }); });
  var status = ncs.length ? 'REPROVADO' : 'APROVADO';

  var observacoes = [];
  ensaios.forEach(function (c) {
    (c.resumo.criterios || []).filter(function (k) { return k.naoAvaliado; }).forEach(function (k) { observacoes.push('Relatório de ensaio ' + c.numero + ': ' + k.estudo + ' — ' + k.criterio.charAt(0).toLowerCase() + k.criterio.slice(1) + ' não avaliado (' + String(k.obtido || '').replace(/^Não avaliado:?\s*/i, '').replace(/\s*\((informativo)[^)]*\)\s*$/i, '').replace(/[.\s]+$/, '') + '; sem limite no protocolo).'); });
    (c.resumo.escopo || []).forEach(function (e) { if (/Justificativa|abaixo do mínimo|não avaliada/i.test(e)) observacoes.push('Relatório de ensaio ' + c.numero + ': ' + String(e).replace(/[.\s]+$/, '') + '.'); });
  });

  var datas = ensaios.map(function (c) { return SGO_QEQ_iso_(c.resumo.identificacao.dataDoEnsaio); }).filter(Boolean);
  var dataQi = SGO_QEQ_iso_(p.dataQi);
  if (etapas.QI && dataQi) datas.push(dataQi);
  if (etapas.QI && !dataQi) trava('QI_SEM_DATA', 'A data da verificação da instalação não foi informada.', 'Informe a data da verificação da instalação (dd/mm/aaaa).');
  datas.sort();
  var inicioIso = datas[0] || '', fimIso = datas[datas.length - 1] || '';
  var validadeIso = status === 'APROVADO' && fimIso ? SGO_QEQ_somarMeses_(fimIso, meses) : '';

  var instrumentos = [], vistosI = {};
  ensaios.forEach(function (c) {
    ((c.resumo.registradores || {}).itens || []).forEach(function (it) {
      var k = SGO_QEQ_normTag_(it.tag) + '|' + EstufaOficial_s_(it.certificado);
      if (vistosI[k]) { vistosI[k].ensaios.push(c.numero); return; }
      var o = { tag: it.tag, descricao: EstufaOficial_semNomes_(it.descricao, ident._nomesProibidos), certificado: it.certificado, validade: it.validade, situacao: it.situacao, conforme: it.conforme, ensaios: [c.numero] };
      vistosI[k] = o; instrumentos.push(o);
    });
  });
  var criterios = [], vistosC = {};
  ensaios.forEach(function (c) {
    (c.resumo.criterios || []).forEach(function (k) {
      var ch = k.criterio + '|' + k.requisito;
      if (vistosC[ch]) return;
      vistosC[ch] = true;
      criterios.push({ criterio: k.criterio, requisito: k.requisito, referencia: k.referencia, etapa: k.etapa });
    });
  });
  var normas = [];
  ensaios.forEach(function (c) { (c.resumo.normas || []).forEach(function (n) { if (normas.indexOf(n) < 0) normas.push(n); }); });
  var tecnicos = [];
  ensaios.forEach(function (c) { var t = EstufaOficial_s_(c.resumo.identificacao.tecnicoExecutor); if (t && tecnicos.indexOf(t) < 0) tecnicos.push(t); });

  var ctx = {
    versao: 1, perfil: perfil, perfilLabel: perfil && EstufaBanhoRel_EBCFG.PERFIS[perfil] ? EstufaBanhoRel_EBCFG.PERFIS[perfil].label : ident.tipo,
    identificacao: { clienteId: ident.clienteId, unidadeId: ident.unidadeId, equipamentoId: ident.equipamentoId, cliente: ident.cliente, cnpj: ident.cnpj, endereco: ident.endereco, cidadeUf: ident.cidadeUf, unidade: ident.unidade, setor: ident.setor,
      tag: ident.tag, tipo: ident.tipo, numeroSerie: ident.numeroSerie, empresaExecutante: EstufaBanhoRel_EBCFG.EMPRESA_EXECUTANTE, tecnicos: tecnicos, responsavelCliente: EstufaOficial_s_(p.responsavelCliente).slice(0, 120) },
    etapas: etapas, motivo: motivo, periodicidadeMeses: meses, inicio: SGO_QEQ_br_(inicioIso), fim: SGO_QEQ_br_(fimIso), validadeAte: SGO_QEQ_br_(validadeIso), validadeIso: validadeIso, dataQi: SGO_QEQ_br_(dataQi),
    ensaios: ensaios, qi: qi, criterios: criterios, instrumentos: instrumentos, normas: normas, statusConsolidado: status, naoConformidades: ncs, observacoes: observacoes,
    observacaoLivre: EstufaOficial_s_(p.observacoes).slice(0, 2000), regraDecisao: ESTUFAQ_CFG.REGRA_DECISAO,
    travas: travas, emissaoBloqueada: travas.length > 0, _nomesProibidos: ident._nomesProibidos
  };
  // 21/10/2026: patrimônio, capacidade, câmaras e ano do cadastro entram só quando preenchidos (a assinatura dos envios antigos não muda).
  ['patrimonio', 'capacidade', 'numCamaras', 'anoFabricacao'].forEach(function (k) { if (EstufaOficial_s_(ident[k])) ctx.identificacao[k] = EstufaOficial_s_(ident[k]); });
  // 22/10/2026 (pedido do dono): fabricante (marca) e modelo do cadastro saem no documento. Ficam fora da
  // identificação assinada, para os envios que aguardam aprovação continuarem válidos.
  ctx.equipamentoCadastro = { fabricante: EstufaOficial_s_(ident.fabricante), modelo: EstufaOficial_s_(ident.modelo) };
  ctx.assinatura = SGO_DocSalvar_assinatura_({ i: ctx.identificacao, e: etapas, m: motivo, p: meses, q: qi, d: ctx.dataQi, c: ensaios.map(function (c) { return [c.emissaoId, c.revisao, c.hash, c.resultado]; }), o: ctx.observacaoLivre, s: status });
  return ctx;
}

/* ---------------- Textos ---------------- */

function EstufaOficial_etapasTexto_(etapas) {
  var l = [];
  if (etapas.QI) l.push('de instalação');
  if (etapas.QO) l.push('de operação');
  if (etapas.QD) l.push('de desempenho');
  if (!l.length) return 'qualificação';
  return 'qualificação ' + (l.length === 1 ? l[0] : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]);
}

function EstufaOficial_textosPadrao_(ctx) {
  var id = ctx.identificacao, partes = [];
  partes.push('O equipamento ' + (id.tag ? id.tag + ' ' : '') + '(' + String(ctx.perfilLabel || id.tipo).toLowerCase() + ') foi submetido à ' + EstufaOficial_etapasTexto_(ctx.etapas) + (ctx.inicio ? (ctx.inicio === ctx.fim ? ' em ' + ctx.inicio : ' de ' + ctx.inicio + ' a ' + ctx.fim) : '') + '.');
  if (ctx.statusConsolidado === 'APROVADO') {
    var p2 = [];
    if (ctx.ensaios.length) p2.push((ctx.ensaios.length === 1 ? 'o relatório de ensaio listado no Anexo A atendeu' : 'os ' + ctx.ensaios.length + ' relatórios de ensaio listados no Anexo A atenderam') + ' a todos os critérios de aceitação avaliados');
    if (ctx.etapas.QI) p2.push('todos os itens aplicáveis da verificação da instalação foram considerados conformes');
    if (p2.length) partes.push(p2.join('; ').replace(/^./, function (c) { return c.toUpperCase(); }) + '.');
    partes.push('Com base nesses resultados, o equipamento está APROVADO na qualificação, para as condições de uso e de carga ensaiadas' + (ctx.validadeAte ? ', com requalificação prevista até ' + ctx.validadeAte : '') + '.');
  } else {
    partes.push('Foram registradas as seguintes não conformidades: ' + ctx.naoConformidades.map(function (n) { return n.origem.charAt(0).toLowerCase() + n.origem.slice(1) + ', ' + (n.texto.charAt(0).toLowerCase() + n.texto.slice(1)).replace(/[.\s]+$/, ''); }).join('; ') + '.');
    partes.push('O equipamento está REPROVADO na qualificação e não deve ser liberado para uso nas condições avaliadas até que as causas sejam investigadas e corrigidas e uma nova qualificação tenha resultado aprovado.');
  }
  var simples = ctx.statusConsolidado === 'APROVADO'
    ? 'Nos ensaios realizados, o equipamento manteve a temperatura dentro dos limites definidos em todos os pontos medidos. Ele está aprovado para uso nessas condições' + (ctx.validadeAte ? ' e deve ser qualificado novamente até ' + ctx.validadeAte : '') + '.'
    : 'Nos ensaios realizados, o equipamento não atendeu a todas as condições definidas. Ele está reprovado e não deve ser usado nas condições avaliadas até a correção do problema e um novo ensaio com resultado aprovado.';
  return { conclusao: partes.join(' '), conclusaoSimples: simples };
}

function EstufaOficial_regrasTexto_(ctx, exigirVeredito, verificarNumeros) {
  var termos = ESTUFAQ_TERMOS_FORA.slice();
  (ctx._nomesProibidos || []).forEach(function (n) { termos.push(new RegExp('\\b' + String(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')); });
  return { numeros: SGO_QIAV_numerosDe_([ctx.ensaios.map(function (c) { return [c.resumo.criterios, c.resumo.estudos, c.numero]; }), ctx.periodicidadeMeses, ctx.inicio, ctx.fim, ctx.validadeAte, ctx.normas, ctx.instrumentos]),
    normas: ctx.normas, veredito: ctx.statusConsolidado, exigirVeredito: !!exigirVeredito, verificarNumeros: verificarNumeros !== false, termosProibidos: termos };
}

function EstufaOficial_conferirTextos_(ctx, textos, verificarNumeros) {
  return SGO_QIAV_verificarBlocos_({
    'Conclusão': { texto: textos.conclusao, regras: EstufaOficial_regrasTexto_(ctx, true, verificarNumeros) },
    'Conclusão em linguagem simples': { texto: textos.conclusaoSimples, regras: EstufaOficial_regrasTexto_(ctx, false, verificarNumeros) }
  });
}

function EstufaOficial_redigirIA_(ctx) {
  var fatos = { equipamento: ctx.perfilLabel, etapas: EstufaOficial_etapasTexto_(ctx.etapas), motivo: ctx.motivo, periodo: { inicio: ctx.inicio, fim: ctx.fim }, resultado: ctx.statusConsolidado, requalificacaoAte: ctx.validadeAte,
    ensaios: ctx.ensaios.map(function (c) { return { relatorio: c.numero, resultado: c.resultado, estudos: c.resumo.estudos.map(function (e) { return e.rotulo + ': ' + e.status; }), criteriosNaoAtendidos: (c.resumo.criterios || []).filter(function (k) { return k.conforme === false; }).map(function (k) { return k.criterio + ' (obtido ' + k.obtido + '; requisito ' + k.requisito + ')'; }) }; }),
    instalacao: ctx.etapas.QI ? { itens: ctx.qi.length, naoConformes: ctx.qi.filter(function (x) { return x.situacao === 'NC'; }).map(function (x) { return x.texto; }) } : undefined,
    naoConformidades: ctx.naoConformidades.map(function (n) { return n.origem + ': ' + n.texto; }), normasCitaveis: ctx.normas };
  var prompt = ['Você redige a conclusão de um relatório de qualificação térmica de ' + String(ctx.perfilLabel).toLowerCase() + ', como o engenheiro responsável técnico.', SGO_DocA4_regrasRedacaoIA_(),
    '- Não escreva sobre pressão nem vácuo. Não cite número de seção, item ou cláusula.',
    'Devolva somente um objeto JSON com duas chaves: "conclusao" (dois a quatro parágrafos técnicos, que terminam declarando o resultado: ' + ctx.statusConsolidado + ') e "conclusaoSimples" (um parágrafo curto, sem termos técnicos, com o mesmo resultado).',
    'FATOS (únicos permitidos):', JSON.stringify(fatos)].join('\n');
  var bruto = SGO_DocA4_chamarGemini_(prompt, { tokens: 16384, temperatura: 0.2 });
  var m = /\{[\s\S]*\}/.exec(String(bruto || ''));
  if (!m) throw new Error('a redação automática não devolveu o formato esperado');
  var o = JSON.parse(m[0]);
  return { conclusao: SGO_DocA4_limparTextoIA_(o.conclusao), conclusaoSimples: SGO_DocA4_limparTextoIA_(o.conclusaoSimples) };
}

function EstufaOficial_textosDoPayload_(ctx, p) {
  var t = p.textos || {};
  var textos = { conclusao: EstufaOficial_s_(t.conclusao), conclusaoSimples: EstufaOficial_s_(t.conclusaoSimples) };
  if (!textos.conclusao || !textos.conclusaoSimples) throw new Error('A conclusão está incompleta. Clique em "Gerar rascunho" para receber o texto padrão, revise e envie de novo.');
  var conf = EstufaOficial_conferirTextos_(ctx, textos, false);
  if (!conf.ok) throw new Error('A conclusão revisada não pode ser emitida: ' + conf.problemas.join('; ') + '. Corrija o texto (o resultado é o calculado pelo sistema) e tente de novo.');
  return textos;
}

/* ---------------- Documento (A4 retrato) ---------------- */

function EstufaOficial_assinaturas_(ctx, aprovacao, enviadoPor) {
  var l = [];
  if (enviadoPor) l.push({ papel: 'Elaborado por', nome: enviadoPor, cargo: 'Equipe técnica da empresa executante' });
  (EstufaBanhoRel_EBCFG.ASSINATURAS_PADRAO || []).forEach(function (a) { l.push(Object.assign({ papel: 'Responsável técnico' }, a)); });
  if (aprovacao && aprovacao.nome) l.push({ papel: 'Aprovado para emissão por', nome: aprovacao.nome, cargo: 'Aprovação registrada no sistema em ' + aprovacao.em });
  l.push({ papel: 'Ciência do contratante', nome: ctx.identificacao.responsavelCliente || ' ', cargo: 'Responsável pelo serviço — ' + (ctx.identificacao.cliente || 'contratante') });
  return l;
}

function EstufaOficial_historico_(numero, idAtual) {
  if (!numero) return [];
  return SGO_QE_listar_(ESTUFAOFICIAL_CFG.MODULO).filter(function (r) { return r.NUMERO === numero && r.ID !== idAtual && (r.STATUS === 'EMITIDO' || r.STATUS === 'SUBSTITUIDO'); })
    .map(function (r) { var mot = ''; try { mot = EstufaOficial_s_(JSON.parse(r.PAYLOAD_JSON || '{}').motivoRevisao); } catch (e) {} return { revisao: EstufaOficial_s_(r.REVISAO) || '0', em: EstufaOficial_s_(r.APROVADO_EM).slice(0, 10), por: r.APROVADO_POR, motivo: mot }; })
    .sort(function (a, b) { return (parseInt(a.revisao, 10) || 0) - (parseInt(b.revisao, 10) || 0); });
}

function EstufaOficial_html_(ctx, textos, o) {
  o = o || {};
  var id = ctx.identificacao, st = ctx.statusConsolidado, h = [];
  var numero = o.numero || '(atribuído no envio para aprovação)';
  h.push(SGO_DocA4_inicioDocumento_({
    titulo: 'Relatório de qualificação térmica — ' + ctx.perfilLabel, subtitulo: 'Qualificação do equipamento identificado, consolidada a partir dos relatórios de ensaio emitidos.',
    tituloCurto: 'Relatório de qualificação térmica', rotuloNumero: 'Relatório nº', numero: numero, revisao: o.revisao === undefined ? '0' : o.revisao, empresa: id.empresaExecutante,
    capa: { tipo: 'Qualificação térmica', linhas: [['Cliente', id.cliente], ['Unidade', id.unidade], ['Equipamento', id.tipo + (id.tag ? ' — TAG ' + id.tag : '') + (id.numeroSerie ? ' — nº de série ' + id.numeroSerie : '')], ['Etapas', EstufaOficial_etapasTexto_(ctx.etapas).replace(/^qualificação /, '')], ['Motivo', ctx.motivo]] },
    ficha: [['Período', ctx.inicio ? (ctx.inicio === ctx.fim ? ctx.inicio : ctx.inicio + ' a ' + ctx.fim) : '—'], ['Emissão', o.emitidoEm || EstufaOficial_hojeBr_()], ['Requalificação até', ctx.validadeAte || '—'], ['Periodicidade', ctx.periodicidadeMeses + (ctx.periodicidadeMeses === 1 ? ' mês' : ' meses')]],
    simulado: !!o.minuta, avisoSimulado: 'MINUTA PARA CONFERÊNCIA DO RESPONSÁVEL TÉCNICO — documento ainda não aprovado; não entregar ao cliente.',
    resultado: { status: st, rotulo: 'Resultado da qualificação', texto: st === 'APROVADO' ? 'Todos os critérios avaliados foram atendidos.' : ctx.naoConformidades.length + (ctx.naoConformidades.length === 1 ? ' não conformidade registrada.' : ' não conformidades registradas.') },
    sumario: true
  }));
  h.push('<h2>1. Objetivo</h2><p>Demonstrar, com evidência documentada, que o equipamento identificado ' + (ctx.etapas.QI ? 'está instalado conforme o especificado' + (ctx.etapas.QO || ctx.etapas.QD ? ' e ' : '') : '') + (ctx.etapas.QO || ctx.etapas.QD ? 'mantém a temperatura dentro dos limites definidos nas condições ensaiadas' : '') + ', na ' + EstufaOficial_etapasTexto_(ctx.etapas) + '.</p>');
  h.push('<h2>2. Escopo e limitações</h2>' + SGO_DocA4_lista_(['Motivo: ' + ctx.motivo + '.', 'O resultado vale para as condições de uso, de carga e de programação dos ensaios listados no Anexo A.', 'Os resultados de cada ensaio estão nos relatórios de ensaio e nas planilhas de dados correspondentes, que fazem parte desta qualificação.'].concat(ctx.observacaoLivre ? [ctx.observacaoLivre] : [])));
  h.push('<h2>3. Identificação</h2>' + SGO_DocA4_tabelaIdent_([['Cliente', id.cliente], ['CNPJ', id.cnpj], ['Endereço', [id.endereco, id.cidadeUf].filter(Boolean).join(' - '), { largo: true }], ['Unidade', id.unidade], ['Setor', id.setor], ['TAG', id.tag], ['Equipamento', id.tipo], ['Nº de série', id.numeroSerie]].concat(SGO_DocA4_linhasEquipamento_({ fabricante: (ctx.equipamentoCadastro || {}).fabricante, modelo: (ctx.equipamentoCadastro || {}).modelo, patrimonio: id.patrimonio, capacidade: id.capacidade, numCamaras: id.numCamaras, anoFabricacao: id.anoFabricacao }, { semTipo: true, semTag: true, semSerie: true })).concat([['Técnicos executores', id.tecnicos.join(', ') || '—'], ['Empresa executante', id.empresaExecutante.nome + ' — CNPJ ' + id.empresaExecutante.cnpj, { largo: true }]])));
  if (ctx.normas.length) h.push('<h2>4. Referências normativas</h2>' + SGO_DocA4_lista_(ctx.normas));
  else h.push('<h2>4. Referências</h2><p>Protocolo do ensaio acordado com o contratante.</p>');
  h.push('<h2>5. Definições</h2>' + SGO_DocA4_lista_(['Qualificação de instalação (QI): verificação documentada de que o equipamento está instalado conforme o especificado.', 'Qualificação de operação (QO): verificação de que o equipamento opera dentro dos limites definidos, sem carga (distribuição em vazio, abertura de porta, queda de energia).', 'Qualificação de desempenho (QD): verificação de que o equipamento mantém os limites definidos na condição de uso, com carga.', 'Uniformidade: maior diferença entre o sensor mais quente e o mais frio no mesmo instante.', 'Estabilidade: metade da variação de temperatura de um sensor no período avaliado.']));
  h.push('<h2>6. Responsabilidades</h2><p>A empresa executante planeja e executa os ensaios, calcula os resultados e emite este relatório com a aprovação do responsável técnico. O contratante disponibiliza o equipamento nas condições de uso, mantém a documentação e decide sobre a liberação para uso com base neste relatório.</p>');
  h.push('<h2>7. Metodologia</h2><p>Os ensaios foram realizados com registrador de dados calibrado e sensores distribuídos no volume útil. Para cada estudo, as leituras de todos os sensores ativos no período avaliado foram comparadas aos critérios de aceitação; o resultado de cada ensaio foi calculado pelo sistema e aprovado no relatório de ensaio correspondente. O resultado desta qualificação segue a regra: uma não conformidade em qualquer ensaio ou item da instalação reprova a qualificação.</p><p class="nota">' + SGO_DocA4_esc_(ctx.regraDecisao) + '</p>');
  h.push('<h2>8. Instrumentos</h2>' + (ctx.instrumentos.length ? SGO_DocA4_tabelaPadroes_(ctx.instrumentos, { unidade: '°C', colunaExtra: { t: 'Ensaios', valor: function (i) { return (i.ensaios || []).join(', '); } } }) : '<p class="nota">Sem ensaios com registrador nesta qualificação.</p>'));
  h.push('<h2>9. Critérios de aceitação</h2>' + (ctx.criterios.length ? SGO_DocA4_tabela_([{ t: 'Etapa', cls: 'cen' }, { t: 'Critério' }, { t: 'Requisito' }, { t: 'Referência' }], ctx.criterios.map(function (c) { return [{ t: c.etapa || '—', cls: 'cen' }, c.criterio, c.requisito, c.referencia]; })) : '<p class="nota">Só a qualificação de instalação.</p>'));
  h.push('<h2>10. Resultados</h2>');
  if (ctx.etapas.QI) h.push('<h3>10.1 Qualificação de instalação' + (ctx.dataQi ? ' (' + SGO_DocA4_esc_(ctx.dataQi) + ')' : '') + '</h3>' + SGO_DocA4_tabela_([{ t: 'Item verificado' }, { t: 'Situação' }, { t: 'Observação' }], ctx.qi.map(function (x) { return [x.texto, x.situacao === 'NC' ? { html: '<span class="nok-txt">Não conforme</span>' } : (x.situacao === 'C' ? { html: '<span class="ok-txt">Conforme</span>' } : 'Não aplicável'), x.observacao || '—']; })));
  if (ctx.ensaios.length) {
    h.push('<h3>10.' + (ctx.etapas.QI ? 2 : 1) + ' Ensaios térmicos</h3>');
    h.push(SGO_DocA4_tabela_([{ t: 'Relatório' }, { t: 'Data' }, { t: 'Estudo' }, { t: 'Etapa', cls: 'cen' }, { t: 'Mín. (°C)', cls: 'num' }, { t: 'Máx. (°C)', cls: 'num' }, { t: 'Uniformidade (°C)', cls: 'num' }, { t: 'Resultado' }],
      [].concat.apply([], ctx.ensaios.map(function (c) { return c.resumo.estudos.map(function (e) { return [c.numero + (c.revisao !== '0' ? ' rev ' + c.revisao : ''), c.resumo.identificacao.dataDoEnsaio || '—', e.rotulo, { t: e.etapa, cls: 'cen' }, SGO_DocA4_num_(e.min, 2), SGO_DocA4_num_(e.max, 2), SGO_DocA4_num_(e.uniformidade, 2), SGO_DocA4_celSituacao_(e.status === 'APROVADO' ? true : (e.status === 'REPROVADO' ? false : null), 'Aprovado', 'Reprovado')]; }); })), { classe: 'compacta' }));
  }
  h.push('<h2>11. Não conformidades e observações</h2>' + (ctx.naoConformidades.length ? SGO_DocA4_lista_(ctx.naoConformidades.map(function (n) { return n.origem + ': ' + n.texto; })) : '<p>Nenhuma não conformidade foi registrada nesta qualificação.</p>') + (ctx.observacoes.length ? SGO_DocA4_lista_(ctx.observacoes) : ''));
  h.push('<h2>12. Conclusão</h2><div class="prosa">' + SGO_DocA4_paragrafos_(textos.conclusao) + '</div><h3>12.1 Em linguagem simples</h3><div class="leigo">' + SGO_DocA4_paragrafos_(textos.conclusaoSimples) + '</div>');
  h.push(SGO_DocA4_linhaParecer_(st, 'Parecer da qualificação', 'Aprovado — o equipamento atende aos critérios de aceitação', 'Reprovado — o equipamento não atende aos critérios de aceitação'));
  h.push('<h2>13. Recomendações e requalificação</h2>' + SGO_DocA4_lista_([ctx.validadeAte ? 'Requalificação periódica até ' + ctx.validadeAte + ' (periodicidade de ' + ctx.periodicidadeMeses + (ctx.periodicidadeMeses === 1 ? ' mês' : ' meses') + ').' : 'Nova qualificação após a correção das não conformidades.', 'Requalificar antes do prazo após manutenção que afete o controle de temperatura, mudança de local, de processo ou de configuração de carga.']));
  h.push('<div class="manter"><h2>14. Aprovação e assinaturas</h2>');
  if (o.aprovacao) h.push('<p><b>Revisado e aprovado para emissão por</b> ' + SGO_DocA4_esc_(o.aprovacao.nome) + ', em ' + SGO_DocA4_esc_(o.aprovacao.em) + ', com registro no sistema.</p>');
  else if (o.minuta) h.push('<p><b>Aguardando a aprovação do responsável técnico.</b></p>');
  h.push(SGO_DocA4_assinaturas_(EstufaOficial_assinaturas_(ctx, o.aprovacao, o.enviadoPor)) + '</div>');
  if (ctx.ensaios.length) h.push('<h2 class="quebra">Anexo A — Relatórios de ensaio considerados</h2>' + SGO_DocA4_tabela_([{ t: 'Relatório' }, { t: 'Revisão', cls: 'cen' }, { t: 'Data do ensaio' }, { t: 'Aprovado por' }, { t: 'Aprovado em' }, { t: 'Resultado' }], ctx.ensaios.map(function (c) { return [c.numero, { t: SGO_DocA4_revisao_(c.revisao), cls: 'cen' }, c.resumo.identificacao.dataDoEnsaio || '—', c.aprovadoPor || '—', String(c.aprovadoEm || '').slice(0, 10), SGO_DocA4_rotuloStatus_(c.resultado)]; })));
  var hist = o.historico || [];
  if (hist.length || o.motivoRevisao) h.push('<h2>Anexo B — Registro de revisões</h2>' + SGO_DocA4_tabela_([{ t: 'Revisão', cls: 'cen' }, { t: 'Data' }, { t: 'Aprovado por' }, { t: 'Motivo' }], hist.map(function (r) { return [{ t: SGO_DocA4_revisao_(r.revisao), cls: 'cen' }, r.em, r.por || '—', r.motivo || 'Emissão inicial']; }).concat(o.motivoRevisao ? [[{ t: SGO_DocA4_revisao_(o.revisao), cls: 'cen' }, o.emitidoEm || EstufaOficial_hojeBr_(), o.aprovacao ? o.aprovacao.nome : '(em aprovação)', o.motivoRevisao]] : [])));
  h.push(SGO_DocA4_fimDocumento_());
  return h.join('\n');
}

/* ---------------- API (EstufaOficial_apiDispatch) ---------------- */

function EstufaOficial_apiSituacao(p, sessao) {
  return { ok: true, podeAprovar: EstufaQ_ehAprovador_(sessao), motivos: ESTUFAOFICIAL_CFG.MOTIVOS, qiItens: ESTUFAOFICIAL_CFG.QI_ITENS,
    periodicidadePadrao: ESTUFAOFICIAL_CFG.PERIODICIDADE_PADRAO_MESES, periodicidadeMin: ESTUFAOFICIAL_CFG.PERIODICIDADE_MIN_MESES, periodicidadeMax: ESTUFAOFICIAL_CFG.PERIODICIDADE_MAX_MESES };
}
function EstufaOficial_apiPesquisarClientes(p, sessao) { return { ok: true, items: SGO_QEQ_pesquisarClientes_(sessao, p.termo) }; }
function EstufaOficial_apiListarUnidades(p, sessao) { return { ok: true, items: SGO_QEQ_listarUnidades_(sessao, p.clienteId) }; }
function EstufaOficial_apiListarEquipamentos(p, sessao) { return { ok: true, items: SGO_QEQ_listarEquipamentos_(sessao, p.clienteId, p.unidadeId, ESTUFAQ_CFG.TIPO_EQUIPAMENTO_RE) }; }
function EstufaOficial_apiIdentificacao(p, sessao, sessionId) {
  var ident = SGO_QEQ_identificacao_(sessionId, p.clienteId, p.unidadeId, p.equipamentoId);
  var limpo = {};
  Object.keys(ident).forEach(function (k) { if (k.charAt(0) !== '_') limpo[k] = ident[k]; });
  return { ok: true, identificacao: limpo, tipoCompativel: ESTUFAQ_CFG.TIPO_EQUIPAMENTO_RE.test(SGO_QEQ_semAcento_(ident.tipo)) };
}

function EstufaOficial_apiEquipamento(p, sessao, sessionId) {
  var ident = SGO_QEQ_identificacao_(sessionId, p.clienteId, p.unidadeId, p.equipamentoId);
  var nome = SGO_QE_nomeSessao_(sessao), aprovador = EstufaQ_ehAprovador_(sessao);
  var oficiais = SGO_QE_listar_(ESTUFAOFICIAL_CFG.MODULO).filter(function (r) { return EstufaOficial_s_(r.EQUIPAMENTO_ID) === ident.equipamentoId; })
    .filter(function (r) { return r.STATUS === 'EMITIDO' || r.STATUS === 'SUBSTITUIDO' || aprovador || r.ENVIADO_POR === nome; })
    .map(function (r) { return { id: r.ID, numero: r.NUMERO, revisao: EstufaOficial_s_(r.REVISAO) || '0', status: r.STATUS, resultado: r.RESULTADO, validadeAte: r.VALIDADE_ATE, enviadoPor: r.ENVIADO_POR, enviadoEm: r.ENVIADO_EM, aprovadoPor: r.APROVADO_POR, motivoDevolucao: r.DEVOLVIDO_MOTIVO, pdfId: r.PDF_ID, pdfUrl: EstufaOficial_urlArquivo_(r.PDF_ID), htmlUrl: EstufaOficial_urlArquivo_(r.HTML_ID) }; })
    .sort(function (a, b) { return String(b.enviadoEm).localeCompare(String(a.enviadoEm)); });
  var itens = SGO_QEQ_todosItens_()[ident.equipamentoId] || [];
  return { ok: true, tipoCompativel: ESTUFAQ_CFG.TIPO_EQUIPAMENTO_RE.test(SGO_QEQ_semAcento_(ident.tipo)), ensaios: EstufaOficial_ensaiosDoEquipamento_(ident.equipamentoId),
    semVinculo: SGO_QEQ_emissoesSemVinculo_(ident, [ESTUFAQ_CFG.MODULO_ENSAIO]), oficiais: oficiais, situacao: SGO_QEQ_situacao_(itens.filter(function (i) { return i.situacao !== 'MINUTA'; })) };
}

function EstufaOficial_apiVincular(p, sessao, sessionId) { return SGO_QEQ_vincularEmissao_(sessionId, sessao, p); }

function EstufaOficial_resumoTela_(ctx) {
  return { statusConsolidado: ctx.statusConsolidado, inicio: ctx.inicio, fim: ctx.fim, validadeAte: ctx.validadeAte, naoConformidades: ctx.naoConformidades, observacoes: ctx.observacoes,
    ensaios: ctx.ensaios.map(function (c) { return { numero: c.numero, revisao: c.revisao, resultado: c.resultado, etapas: c.etapas, data: c.resumo.identificacao.dataDoEnsaio }; }),
    qiItens: EstufaOficial_qiItens_(ctx.perfil) };
}

function EstufaOficial_apiGerarRascunho(p, sessao, sessionId) {
  var ctx = EstufaOficial_montarContexto_(sessionId, p);
  var base = { ok: true, assinaturaContexto: ctx.assinatura, resumo: EstufaOficial_resumoTela_(ctx), travas: ctx.travas, bloqueado: ctx.emissaoBloqueada, podeAprovar: EstufaQ_ehAprovador_(sessao) };
  if (ctx.emissaoBloqueada) return Object.assign(base, { textos: { conclusao: '', conclusaoSimples: '' }, avisoIA: 'O relatório não pode ser enviado enquanto os itens abaixo não forem resolvidos. Nada foi redigido.' });
  var textos = EstufaOficial_textosPadrao_(ctx), origem = 'PADRAO', aviso = '';
  if (p.redigirComIA) {
    try {
      var t = EstufaOficial_redigirIA_(ctx);
      var conf = EstufaOficial_conferirTextos_(ctx, t, true);
      if (conf.ok) { textos = t; origem = 'IA'; }
      else aviso = 'O texto redigido automaticamente não passou na conferência (' + conf.problemas.slice(0, 4).join('; ') + '). Foi usado o texto padrão; revise se quiser.';
    } catch (e) { aviso = 'A redação automática não está disponível (' + EstufaQ_msg_(e) + '). Foi usado o texto padrão; revise se quiser.'; }
  }
  return Object.assign(base, { textos: textos, origemTexto: origem, avisoIA: aviso });
}

function EstufaOficial_apiPrevia(p, sessao, sessionId) {
  var ctx = EstufaOficial_montarContexto_(sessionId, p);
  var textos = (p.textos && p.textos.conclusao) ? { conclusao: EstufaOficial_s_(p.textos.conclusao), conclusaoSimples: EstufaOficial_s_(p.textos.conclusaoSimples) } : EstufaOficial_textosPadrao_(ctx);
  return { ok: true, html: SGO_DocA4_prepararSumario_(EstufaOficial_html_(ctx, textos, { numero: p.numero, minuta: true, enviadoPor: SGO_QE_nomeSessao_(sessao), historico: EstufaOficial_historico_(p.numero, '') })).html, travas: ctx.travas };
}

function EstufaOficial_validarEnvio_(sessionId, p) {
  var ctx = EstufaOficial_montarContexto_(sessionId, p);
  if (ctx.emissaoBloqueada) throw new Error('O relatório não pode seguir: ' + ctx.travas.map(function (t) { return t.texto + ' ' + t.comoCorrigir; }).join(' '));
  if (!p.assinaturaContexto || p.assinaturaContexto !== ctx.assinatura) throw new Error('Os dados mudaram desde o rascunho (ou o rascunho não foi gerado). Clique em "Gerar rascunho" de novo, revise a conclusão e envie.');
  return { ctx: ctx, textos: EstufaOficial_textosDoPayload_(ctx, p) };
}

function EstufaOficial_apiEnviarParaAprovacao(p, sessao, sessionId) {
  var v = EstufaOficial_validarEnvio_(sessionId, p);
  var numero = EstufaOficial_s_(p.numero);
  if (numero) {
    var emitidas = SGO_QE_listar_(ESTUFAOFICIAL_CFG.MODULO).filter(function (r) { return r.NUMERO === numero && (r.STATUS === 'EMITIDO' || r.STATUS === 'SUBSTITUIDO'); });
    if (!emitidas.length) throw new Error('O número ' + numero + ' não corresponde a um relatório emitido. Para um relatório novo, deixe o número em branco: ele é atribuído no envio.');
    if (emitidas.some(function (r) { return EstufaOficial_s_(r.EQUIPAMENTO_ID) !== v.ctx.identificacao.equipamentoId; })) throw new Error('O relatório ' + numero + ' é de outro equipamento; a nova revisão precisa ser do mesmo equipamento.');
    if (EstufaOficial_s_(p.motivoRevisao).length < 10) throw new Error('Descreva o motivo da nova revisão (ao menos 10 caracteres): ele aparece no registro de revisões do documento.');
  } else numero = EstufaOficial_proximoNumero_();
  var id = SGO_QE_registrar_({
    MODULO: ESTUFAOFICIAL_CFG.MODULO, STATUS: 'AGUARDANDO_APROVACAO', NUMERO: numero, REVISAO: String(SGO_QE_proximaRevisao_(ESTUFAOFICIAL_CFG.MODULO, numero, 0)),
    CLIENTE: v.ctx.identificacao.cliente, CNPJ: v.ctx.identificacao.cnpj, TAG: v.ctx.identificacao.tag, RESULTADO: v.ctx.statusConsolidado, HASH_CONTEXTO: v.ctx.assinatura,
    ENVIADO_POR: SGO_QE_nomeSessao_(sessao), ENVIADO_EM: SGO_QE_agora_(), PAYLOAD_JSON: JSON.stringify(Object.assign({}, p, { numero: numero, textos: v.textos })),
    CLIENTE_ID: v.ctx.identificacao.clienteId, UNIDADE_ID: v.ctx.identificacao.unidadeId, EQUIPAMENTO_ID: v.ctx.identificacao.equipamentoId, VALIDADE_ATE: v.ctx.validadeAte
  });
  SGO_QEQ_log_('ESTUFA_OFICIAL_ENVIADO', sessao, 'Relatório de qualificação ' + numero + ' enviado para aprovação (registro ' + id + ').');
  return { ok: true, id: id, numero: numero, mensagem: 'Relatório ' + numero + ' enviado para aprovação do responsável técnico. Ele confere a prévia em "Aguardando aprovação" e emite, ou devolve com o motivo.' };
}

function EstufaOficial_apiListarAprovacoes(p, sessao) {
  var aprovador = EstufaQ_ehAprovador_(sessao), nome = SGO_QE_nomeSessao_(sessao);
  return { ok: true, podeAprovar: aprovador, itens: SGO_QE_listar_(ESTUFAOFICIAL_CFG.MODULO).filter(function (r) { return r.STATUS === 'AGUARDANDO_APROVACAO' || (r.STATUS === 'DEVOLVIDO' && r.ENVIADO_POR === nome); })
    .filter(function (r) { return aprovador || r.ENVIADO_POR === nome; })
    .map(function (r) { return { id: r.ID, status: r.STATUS, numero: r.NUMERO, revisao: r.REVISAO, cliente: r.CLIENTE, tag: r.TAG, resultado: r.RESULTADO, enviadoPor: r.ENVIADO_POR, enviadoEm: r.ENVIADO_EM, motivoDevolucao: r.DEVOLVIDO_MOTIVO }; }) };
}

function EstufaOficial_carregar_(id, status) {
  var reg = SGO_QE_obter_(id);
  if (!reg || reg.MODULO !== ESTUFAOFICIAL_CFG.MODULO) throw new Error('Registro não encontrado. Atualize a lista.');
  if (status && reg.STATUS !== status) throw new Error('Este registro não está ' + (status === 'AGUARDANDO_APROVACAO' ? 'aguardando aprovação' : 'disponível para esta ação') + ' (situação: ' + reg.STATUS + '). Atualize a lista.');
  return { reg: reg, payload: JSON.parse(reg.PAYLOAD_JSON || '{}') };
}

function EstufaOficial_conferirPendente_(sessionId, c) {
  var ctx = EstufaOficial_montarContexto_(sessionId, c.payload);
  if (ctx.emissaoBloqueada) throw new Error('O relatório não pode ser emitido: ' + ctx.travas.map(function (t) { return t.texto; }).join(' ') + ' Devolva ao técnico com o motivo.');
  if (ctx.assinatura !== c.reg.HASH_CONTEXTO) throw new Error('Os dados mudaram desde o envio (por exemplo, um relatório de ensaio ganhou revisão nova ou o cadastro foi alterado). Devolva ao técnico para gerar o rascunho de novo.');
  return { ctx: ctx, textos: EstufaOficial_textosDoPayload_(ctx, c.payload) };
}

function EstufaOficial_apiPreverAprovacao(p, sessao, sessionId) {
  EstufaOficial_exigirAprovador_(sessao);
  var c = EstufaOficial_carregar_(p.id, 'AGUARDANDO_APROVACAO');
  var v = EstufaOficial_conferirPendente_(sessionId, c);
  return { ok: true, html: SGO_DocA4_prepararSumario_(EstufaOficial_html_(v.ctx, v.textos, { numero: c.reg.NUMERO, revisao: c.reg.REVISAO, minuta: true, enviadoPor: c.reg.ENVIADO_POR, motivoRevisao: c.payload.motivoRevisao, historico: EstufaOficial_historico_(c.reg.NUMERO, c.reg.ID) })).html };
}

function EstufaOficial_apiAprovarEmitir(p, sessao, sessionId) {
  EstufaOficial_exigirAprovador_(sessao);
  if (!p || p.confirmacaoRevisao !== true) throw new Error('Marque "Conferi os dados, os critérios e a conclusão e aprovo a emissão" antes de aprovar.');
  var c = EstufaOficial_carregar_(p.id, 'AGUARDANDO_APROVACAO');
  var v = EstufaOficial_conferirPendente_(sessionId, c);
  var ctx = v.ctx, ident = ctx.identificacao, numero = c.reg.NUMERO;
  var revisao = SGO_QE_proximaRevisao_(ESTUFAOFICIAL_CFG.MODULO, numero, 0);
  var aprovacao = { nome: SGO_QE_nomeSessao_(sessao), login: EstufaOficial_s_(sessao.usuario), perfil: EstufaOficial_s_(sessao.perfil), em: SGO_QE_agora_() };
  var html = EstufaOficial_html_(ctx, v.textos, { numero: numero, revisao: String(revisao), aprovacao: aprovacao, enviadoPor: c.reg.ENVIADO_POR, motivoRevisao: c.payload.motivoRevisao, historico: EstufaOficial_historico_(numero, c.reg.ID) });
  var pasta = SGO_QEQ_pastaEquipamento_(EstufaQ_pastaLaudos_(), ident);
  var nome = SGO_DocSalvar_sanitizarNome_('Relatório de qualificação Estufa - ' + numero + (revisao ? ' rev ' + revisao : '') + ' - ' + (ident.tag || 'sem TAG'));
  var s = SGO_DocSalvar_salvarHtmlEPdf_(pasta, nome, html, { compartilhar: true });
  SGO_QE_atualizar_(c.reg.ID, {
    STATUS: 'EMITIDO', REVISAO: String(revisao), APROVADO_POR: aprovacao.nome, APROVADO_LOGIN: aprovacao.login, APROVADO_PERFIL: aprovacao.perfil, APROVADO_EM: aprovacao.em,
    PDF_ID: s.pdfId || '', HTML_ID: s.htmlId || '', RESULTADO: ctx.statusConsolidado, VALIDADE_ATE: ctx.validadeAte,
    RESUMO_JSON: JSON.stringify({ v: 1, status: ctx.statusConsolidado, validadeAte: ctx.validadeAte, inicio: ctx.inicio, fim: ctx.fim, etapas: ctx.etapas, ensaios: ctx.ensaios.map(function (x) { return { id: x.emissaoId, numero: x.numero, revisao: x.revisao, resultado: x.resultado }; }) })
  });
  SGO_QE_marcarSubstituidas_(ESTUFAOFICIAL_CFG.MODULO, numero, c.reg.ID);
  var arq = SGO_QEQ_registrarDocumento_(sessionId, ident, { nomeArquivo: nome, link: s.pdfUrl, vencimentoIso: ctx.validadeIso });
  try { if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_(); } catch (e) {}
  SGO_QEQ_log_('ESTUFA_OFICIAL_EMITIDO', sessao, 'Relatório de qualificação ' + numero + ' rev ' + revisao + ' emitido (' + ctx.statusConsolidado + ') para o equipamento ' + ident.equipamentoId + '.');
  var pastaUrl = '';
  try { pastaUrl = pasta.getUrl(); } catch (e) {}
  return { ok: true, numero: numero, revisao: revisao, resultado: ctx.statusConsolidado, validadeAte: ctx.validadeAte, pdfId: s.pdfId, pdfUrl: s.pdfUrl, htmlId: s.htmlId, htmlUrl: s.htmlUrl, pastaUrl: pastaUrl, clienteId: ident.clienteId,
    avisoArquivo: arq.ok ? '' : 'O documento foi emitido e salvo na pasta do cliente, mas não entrou no Arquivo de documentos (' + arq.aviso + '). Cadastre o PDF em Documentos para ele aparecer no equipamento.',
    mensagem: 'Relatório ' + numero + ' (revisão ' + revisao + ') emitido e salvo na pasta do equipamento, dentro da pasta do cliente.' };
}

function EstufaOficial_apiDevolver(p, sessao) {
  EstufaOficial_exigirAprovador_(sessao);
  var motivo = EstufaOficial_s_(p && p.motivo);
  if (motivo.length < 10) throw new Error('Escreva o motivo da devolução (ao menos 10 caracteres) para o técnico saber o que corrigir.');
  var c = EstufaOficial_carregar_(p.id, 'AGUARDANDO_APROVACAO');
  SGO_QE_atualizar_(c.reg.ID, { STATUS: 'DEVOLVIDO', DEVOLVIDO_MOTIVO: motivo, APROVADO_POR: SGO_QE_nomeSessao_(sessao), APROVADO_EM: SGO_QE_agora_() });
  return { ok: true, mensagem: 'Devolvido ao técnico com o motivo registrado.' };
}

function EstufaOficial_apiAbrir(p, sessao) {
  var c = EstufaOficial_carregar_(p.id);
  var nome = SGO_QE_nomeSessao_(sessao);
  if (c.reg.STATUS === 'DEVOLVIDO') {
    if (c.reg.ENVIADO_POR !== nome && !EstufaQ_ehAprovador_(sessao)) throw new Error('Este envio é de outra pessoa.');
    var dados = Object.assign({}, c.payload);
    if (!SGO_QE_listar_(ESTUFAOFICIAL_CFG.MODULO).some(function (r) { return r.NUMERO === dados.numero && (r.STATUS === 'EMITIDO' || r.STATUS === 'SUBSTITUIDO'); })) dados.numero = '';
    return { ok: true, dados: dados, modo: 'CORRIGIR', mensagem: 'Envio devolvido carregado. Motivo: ' + c.reg.DEVOLVIDO_MOTIVO };
  }
  if (c.reg.STATUS === 'EMITIDO') return { ok: true, dados: Object.assign({}, c.payload, { numero: c.reg.NUMERO, motivoRevisao: '', assinaturaContexto: '' }), modo: 'REVISAR', mensagem: 'Relatório ' + c.reg.NUMERO + ' carregado para nova revisão. Ajuste o que for preciso, gere o rascunho e informe o motivo da revisão.' };
  throw new Error('Este registro não pode ser aberto para edição (situação: ' + c.reg.STATUS + ').');
}

function EstufaOficial_apiDispatch(req) {
  try {
    req = req || {};
    var sessionId = String(req.sessionId || '');
    var sessao = exigirSessao(sessionId);
    if (!SGO_QEQ_ehEquipe_(sessao)) throw new Error('O relatório de qualificação é feito pela equipe técnica (perfis ' + SGO_QEQ_PERFIS_EQUIPE.join(', ') + ').');
    var allow = {
      apiSituacao: EstufaOficial_apiSituacao, apiPesquisarClientes: EstufaOficial_apiPesquisarClientes, apiListarUnidades: EstufaOficial_apiListarUnidades,
      apiListarEquipamentos: EstufaOficial_apiListarEquipamentos, apiIdentificacao: EstufaOficial_apiIdentificacao, apiEquipamento: EstufaOficial_apiEquipamento, apiVincular: EstufaOficial_apiVincular,
      apiGerarRascunho: EstufaOficial_apiGerarRascunho, apiPrevia: EstufaOficial_apiPrevia, apiEnviarParaAprovacao: EstufaOficial_apiEnviarParaAprovacao,
      apiListarAprovacoes: EstufaOficial_apiListarAprovacoes, apiPreverAprovacao: EstufaOficial_apiPreverAprovacao, apiAprovarEmitir: EstufaOficial_apiAprovarEmitir,
      apiDevolver: EstufaOficial_apiDevolver, apiAbrir: EstufaOficial_apiAbrir,
      // 21/10/2026: completar no cadastro do equipamento o que falta (só campo vazio) e trazer dados de ensaios antigos.
      apiPreencherCadastro: function (p, s, id) { return SGO_QEQ_apiPreencherCadastro(p, s, id); }, apiSugestoesCadastro: function (p, s, id) { return SGO_QEQ_apiSugestoesCadastro(p, s, id); }
    };
    var fn = String(req.fn || '');
    if (!allow[fn]) throw new Error('Operação desconhecida: ' + fn + '. Atualize a página (F5).');
    var r = allow[fn](req.payload || {}, sessao, sessionId);
    if (/^api(Vincular|EnviarParaAprovacao|AprovarEmitir|Devolver)$/.test(fn) && typeof SGO_Pendencias_invalidar_ === 'function') { try { SGO_Pendencias_invalidar_(); } catch (eP) {} }
    return JSON.parse(JSON.stringify(r));
  } catch (e) {
    return { ok: false, erro: EstufaQ_msg_(e) + '.' };
  }
}
