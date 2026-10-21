/****************************************************
 * Lavadoras — RELATÓRIO DE QUALIFICAÇÃO NO MODELO OFICIAL NOVO (21/10/2026), no molde da autoclave
 * (SGO_AutoRel_ModeloOficialNovo.js).
 *
 * Substitui o "Preencher modelo" antigo (SGO_TemplateLavadora.js: documento-modelo com campos digitados
 * e resultado escolhido pelo técnico). O relatório novo é o documento de qualificação do equipamento
 * (termodesinfectora ou lavadora ultrassônica), consolidado a partir dos relatórios de ensaio de ciclo
 * já emitidos e aprovados (aba "Gerar relatório"):
 *  - cliente, unidade e equipamento vêm do cadastro (SGO_QualifEquipamento.js); equipamento de outro
 *    cliente é recusado;
 *  - os resultados de cada ciclo vêm do motor (guardados na emissão do ciclo ou recalculados com a
 *    conferência da assinatura dos dados); o resultado da qualificação é decidido aqui, por regra;
 *  - a IA só redige a conclusão e o texto passa pelo verificador (SGO_QualifIA_Verificador.js);
 *  - emissão só com aprovação registrada do responsável técnico (QUALIF_EMISSOES, módulo
 *    LAVADORA_OFICIAL); nova revisão substitui a anterior, que continua guardada;
 *  - HTML A4 + PDF na pasta do equipamento dentro da pasta do cliente e registro no Arquivo de
 *    documentos com o vencimento da requalificação (ficha do equipamento, QR, central, Cronograma).
 *
 * Modelo anterior: preservado e desativado. LAVADORA_MODELO_OFICIAL = ANTERIOR (só o Administrador
 * grava, pela própria tela) volta a mostrar o formulário antigo; documentos antigos continuam abrindo.
 * Documento: SGO_LavRel_ModeloOficialDoc.js. Tela: JS_TemplateLavadora.html.
 ****************************************************/

var LAVOFICIAL_CFG = {
  MODULO: 'LAVADORA_OFICIAL',
  MODULO_CICLO: 'LAVADORA',
  PROP_MODELO: 'LAVADORA_MODELO_OFICIAL',
  PROP_SEQ: 'LAVOFICIAL_SEQ_',
  SIGLA: 'RQL',
  PERIODICIDADE_PADRAO_MESES: 12,
  PERIODICIDADE_MIN_MESES: 1,
  PERIODICIDADE_MAX_MESES: 24,
  TIPO_EQUIPAMENTO_RE: /LAVADORA|TERMODESINF|TERMO DESINF|TERMO-DESINF|ULTRASS|DESINFETADORA/,
  MOTIVOS: ['Qualificação inicial', 'Requalificação periódica', 'Requalificação após manutenção', 'Requalificação após mudança de local', 'Requalificação após mudança de programa ou de carga'],
  // Lista de verificação da qualificação de instalação. tipo: item só da termodesinfectora (TERMO) ou da ultrassônica (ULTRASSOM).
  QI_ITENS: [
    { id: 'documentacao', texto: 'Documentação técnica do equipamento disponível no serviço (manual de operação e orientações de manutenção)' },
    { id: 'identificacao', texto: 'Identificação do equipamento legível (placa com número de série) e coerente com o cadastro' },
    { id: 'local', texto: 'Local de instalação com espaço para operação e manutenção, nivelamento e exaustão de vapores adequados' },
    { id: 'eletrica', texto: 'Alimentação elétrica compatível com a especificada e com proteção própria' },
    { id: 'agua', texto: 'Água de abastecimento em qualidade, pressão e vazão compatíveis com as especificadas, inclusive a do enxágue final' },
    { id: 'drenagem', texto: 'Drenagem automática completa, sem retorno nem vazamento, com filtro do dreno limpo' },
    { id: 'dosagem', texto: 'Sistema dosador com os produtos indicados pelo serviço, mangueiras íntegras e indicação de nível do produto' },
    { id: 'porta', texto: 'Vedação da porta ou da tampa íntegra e bloqueio ou cancelamento do ciclo com a porta ou a tampa aberta' },
    { id: 'aspersao', texto: 'Braços aspersores girando livremente e bicos desobstruídos', tipo: 'TERMO' },
    { id: 'cesto', texto: 'Cestos e acessórios de carga íntegros, com a carga sem contato com o fundo da cuba', tipo: 'ULTRASSOM' },
    { id: 'registro', texto: 'Indicação e registro dos parâmetros do ciclo (temperatura selecionada e atual, término do ciclo) em funcionamento' },
    { id: 'instrumentos', texto: 'Instrumentos de controle do equipamento com calibração em dia, quando aplicável' },
    { id: 'programas', texto: 'Programas disponíveis no equipamento correspondem aos utilizados na rotina do serviço' }
  ],
  INDICADORES: ['Ensaio de eficácia de limpeza (sujidade de teste)', 'Teste de proteína residual', 'Análise da água do enxágue final', 'Teste de cavitação'],
  SITUACOES_QI: { C: 'Conforme', NC: 'Não conforme', NA: 'Não aplicável' }
};

/* ============================================================
 * Utilitários
 * ============================================================ */

function LavOficial_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function LavOficial_up_(v) { return LavOficial_s_(v).toUpperCase(); }

function LavOficial_modelo_() {
  try { return LavOficial_up_(PropertiesService.getScriptProperties().getProperty(LAVOFICIAL_CFG.PROP_MODELO)) === 'ANTERIOR' ? 'ANTERIOR' : 'NOVO'; } catch (e) { return 'NOVO'; }
}

function LavOficial_ehAprovador_(sessao) {
  var perfis = (typeof LavRel_UCFG !== 'undefined' && LavRel_UCFG.EMISSAO && LavRel_UCFG.EMISSAO.perfisAprovadores) || ['ADMIN'];
  return SGO_QE_ehAprovador_(sessao, perfis);
}

function LavOficial_exigirAprovador_(sessao) {
  if (!LavOficial_ehAprovador_(sessao)) {
    throw new Error('Somente o responsável técnico (perfis ' + ((LavRel_UCFG.EMISSAO || {}).perfisAprovadores || ['ADMIN']).join(', ') + ') confere e aprova o relatório de qualificação.');
  }
}

function LavOficial_tz_() { return (typeof LavRel_UCFG !== 'undefined' && LavRel_UCFG.TZ) || 'America/Sao_Paulo'; }

function LavOficial_hojeBr_() {
  try { return Utilities.formatDate(new Date(), LavOficial_tz_(), 'dd/MM/yyyy'); } catch (e) { return ''; }
}

function LavOficial_assinatura_(valor) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(valor), Utilities.Charset.UTF_8);
  return digest.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}

function LavOficial_urlArquivo_(id) {
  if (!LavOficial_s_(id)) return '';
  try { return DriveApp.getFileById(id).getUrl(); } catch (e) { return ''; }
}

function LavOficial_msg_(e) { return String(e && e.message ? e.message : e).replace(/[.\s]+$/, ''); }

/** Número do relatório: RQA-aaaa-00001 (sequência anual, com trava). */
function LavOficial_proximoNumero_() {
  var ano = '';
  try { ano = Utilities.formatDate(new Date(), LavOficial_tz_(), 'yyyy'); } catch (e) { ano = String(new Date().getFullYear()); }
  var lock = null;
  try { lock = LockService.getScriptLock(); lock.waitLock(20000); } catch (e) { lock = null; }
  try {
    var props = PropertiesService.getScriptProperties();
    var chave = LAVOFICIAL_CFG.PROP_SEQ + ano;
    var n = (parseInt(props.getProperty(chave), 10) || 0) + 1;
    // Nunca repete número já usado (por exemplo, se a propriedade for apagada).
    var usados = SGO_QE_listar_(LAVOFICIAL_CFG.MODULO).map(function (r) { return r.NUMERO; });
    var numero;
    do { numero = LAVOFICIAL_CFG.SIGLA + '-' + ano + '-' + ('0000' + n).slice(-5); n++; } while (usados.indexOf(numero) >= 0);
    props.setProperty(chave, String(n - 1));
    return numero;
  } finally { if (lock) { try { lock.releaseLock(); } catch (e2) {} } }
}

/* ============================================================
 * Resumo de um relatório de ensaio de ciclo (o que o relatório consolidado usa)
 * ============================================================ */

/** Do contexto do relatório de ensaio (LavRel_lvMontarContextoCertificado_) ao resumo guardado. */
function LavOficial_resumoCiclo_(ctx) {
  var e = (ctx.estudos || [])[0] || {};
  var f = e.fatos || {};
  var id = ctx.identificacao || {};
  var fatos = {};
  ['tipoCiclo', 'temperaturaProgramada', 'classeArtigo', 'minA0', 'mediaA0', 'maxA0', 'limiteAprovacaoFinal', 'tempoCavitacao', 'tempoInicioExposicao', 'tempoFimExposicao',
    'tempoExposicaoMinutos', 'tempoTotalMinutos', 'quantidadeSensoresInstalados', 'quantidadeSensoresUtilizados', 'sensoresDesabilitados', 'intervaloLeiturasSegundos'
  ].forEach(function (k) { if (f[k] !== undefined) fatos[k] = f[k]; });
  if (f.piorSensorA0) fatos.piorSensorA0 = { sensor: f.piorSensorA0.sensor, valor: f.piorSensorA0.valor };
  if (f.piorSensorTemperatura) fatos.piorSensorTemperatura = { sensor: f.piorSensorTemperatura.sensor, valor: f.piorSensorTemperatura.valor };
  if (f.patamar) fatos.patamar = { duracaoMin: f.patamar.duracaoMin, inicio: f.patamar.inicio, fim: f.patamar.fim };
  if (f.incertezaA0) fatos.incertezaA0 = { uA0: f.incertezaA0.uA0 };
  return {
    v: 1,
    tipoRelatorio: 'CICLO', tipoCiclo: ctx.tipoCiclo, tipoEstudo: e.tipoEstudo, statusConsolidado: ctx.statusConsolidado, resumoResultado: ctx.resumoResultado,
    equipamentoLabel: ctx.equipamentoLabel, analisarPressao: !!ctx.analisarPressao,
    identificacao: {
      certificadoNumero: id.certificadoNumero, revisao: id.revisao, dataDoEnsaio: id.dataDoEnsaio, programa: id.programa, tipoEnsaio: id.tipoEnsaio,
      cicloNumero: id.cicloNumero, lote: id.lote, tecnicoExecutor: id.tecnicoExecutor, dtl: id.dtl, tag: id.tag, cnpj: id.cnpj
    },
    criterios: (ctx.criterios || []).map(function (c) { return { chave: c.chave, criterio: c.criterio, requisito: c.requisito, referencia: c.referencia, obtido: c.obtido, conforme: c.conforme === undefined ? null : c.conforme, naoAvaliado: !!c.naoAvaliado, informativo: !!c.informativo, decisivo: !!c.decisivo }; }),
    parametros: ctx.parametros || [],
    registradores: ctx.registradores || { itens: [], observacoes: [] },
    fatos: fatos,
    motivosReprovacao: e.motivosReprovacao || [], alertasAnalise: e.alertasAnalise || [], observacoesAnalise: e.observacoesAnalise || []
  };
}

/** Tipo de ensaio do ciclo → etapa da qualificação (QO, QD) ou ''. */
function LavOficial_etapaDoCiclo_(resumo) {
  var t = LavOficial_s_(resumo.identificacao && resumo.identificacao.tipoEnsaio);
  if (/^QD/i.test(t) || /limpeza/i.test(t)) return 'QD';
  if (/^QO/i.test(t) || /cavita/i.test(t)) return 'QO';
  return '';
}

/**
 * Um relatório de ensaio emitido → { ok, ciclo } ou { ok:false, trava }.
 * Usa o resumo guardado na emissão; sem ele, recalcula pelos dados guardados no envio para aprovação e
 * confere a assinatura dos dados (o mesmo cálculo que foi aprovado). O resumo recalculado é guardado
 * (só preenche o campo vazio), para a próxima consulta.
 */
function LavOficial_cicloDaEmissao_(id, ident) {
  var reg = SGO_QE_obter_(id);
  var rotulo = reg ? 'relatório de ensaio ' + reg.NUMERO + (reg.REVISAO && reg.REVISAO !== '0' ? ' rev ' + reg.REVISAO : '') : 'relatório de ensaio escolhido';
  function trava(codigo, texto, fazer) { return { ok: false, trava: { codigo: codigo, texto: texto, comoCorrigir: fazer } }; }
  if (!reg || reg.MODULO !== LAVOFICIAL_CFG.MODULO_CICLO) return trava('CICLO_NAO_ENCONTRADO', 'O ' + rotulo + ' não foi encontrado.', 'Atualize a lista de relatórios de ensaio do equipamento e escolha de novo.');
  if (reg.STATUS === 'SUBSTITUIDO') return trava('CICLO_SUBSTITUIDO', 'O ' + rotulo + ' foi substituído por uma revisão mais nova.', 'Desmarque esta revisão e marque a revisão vigente do mesmo relatório.');
  if (reg.STATUS !== 'EMITIDO') return trava('CICLO_NAO_EMITIDO', 'O ' + rotulo + ' ainda não foi emitido (situação: ' + reg.STATUS + ').', 'Emita o relatório do ciclo na aba "Gerar relatório" (com a aprovação do responsável técnico) e volte aqui.');
  var eq = LavOficial_s_(reg.EQUIPAMENTO_ID);
  if (!eq) return trava('CICLO_SEM_VINCULO', 'O ' + rotulo + ' foi emitido antes do vínculo com o cadastro e não está ligado a este equipamento.', 'Em "Relatórios de ensaio sem vínculo", confira e clique em "Vincular a este equipamento".');
  if (eq !== ident.equipamentoId) return trava('CICLO_OUTRO_EQUIPAMENTO', 'O ' + rotulo + ' é de outro equipamento.', 'Desmarque este relatório: só entram relatórios de ensaio do equipamento escolhido.');
  var resumo = null;
  if (reg.RESUMO_JSON) { try { resumo = JSON.parse(reg.RESUMO_JSON); } catch (e) { resumo = null; } }
  if (!resumo) {
    if (!reg.PAYLOAD_JSON) return trava('CICLO_SEM_DADOS', 'O ' + rotulo + ' foi emitido sem o registro dos dados usados no cálculo (emissão direta, antes de 20/10/2026).', 'Emita de novo o relatório deste ciclo na aba "Gerar relatório" (sai uma nova revisão, com os dados registrados) e marque a revisão nova.');
    try {
      var payload = JSON.parse(reg.PAYLOAD_JSON);
      var ctx = LavRel_lvMontarContextoCertificado_(payload);
      if (LavRel_lvAssinatura_(ctx) !== reg.HASH_CONTEXTO) {
        return trava('CICLO_DADOS_MUDARAM', 'Os dados do ' + rotulo + ' mudaram desde a aprovação (por exemplo, o cadastro do registrador foi alterado).', 'Emita uma nova revisão do relatório do ciclo na aba "Gerar relatório" e marque a revisão nova.');
      }
      resumo = LavOficial_resumoCiclo_(ctx);
      try { SGO_QE_atualizar_(reg.ID, { RESUMO_JSON: JSON.stringify(resumo) }); } catch (eGrava) { /* fica só nesta consulta */ }
    } catch (e) {
      return trava('CICLO_RECALCULO', 'Não foi possível recalcular os resultados do ' + rotulo + ' (' + LavOficial_msg_(e) + ').', 'Emita uma nova revisão do relatório do ciclo na aba "Gerar relatório" e marque a revisão nova.');
    }
  }
  return {
    ok: true,
    ciclo: {
      emissaoId: reg.ID, numero: reg.NUMERO, revisao: LavOficial_s_(reg.REVISAO) || '0', aprovadoPor: reg.APROVADO_POR, aprovadoEm: reg.APROVADO_EM,
      hash: LavOficial_s_(reg.HASH_CONTEXTO), resultado: resumo.statusConsolidado, etapa: LavOficial_etapaDoCiclo_(resumo), resumo: resumo
    }
  };
}

/** Relatórios de ensaio do equipamento para a tela (vigentes e, à parte, os substituídos). */
function LavOficial_ciclosDoEquipamento_(equipamentoId) {
  return SGO_QE_listar_(LAVOFICIAL_CFG.MODULO_CICLO).filter(function (r) {
    return LavOficial_s_(r.EQUIPAMENTO_ID) === LavOficial_s_(equipamentoId) && (r.STATUS === 'EMITIDO' || r.STATUS === 'SUBSTITUIDO');
  }).map(function (r) {
    var info = {};
    if (r.RESUMO_JSON) { try { var rs = JSON.parse(r.RESUMO_JSON); info = { data: rs.identificacao.dataDoEnsaio, tipoEnsaio: rs.identificacao.tipoEnsaio, programa: rs.identificacao.programa, tipoCiclo: rs.tipoCiclo }; } catch (e) {} }
    if (!info.tipoEnsaio && r.PAYLOAD_JSON) {
      try { var p = JSON.parse(r.PAYLOAD_JSON); info = { data: '', tipoEnsaio: LavOficial_s_(p.ensaio), programa: LavOficial_s_(p.programa), tipoCiclo: LavOficial_up_(p.motor) }; } catch (e2) {}
    }
    return { id: r.ID, numero: r.NUMERO, revisao: LavOficial_s_(r.REVISAO) || '0', status: r.STATUS, resultado: r.RESULTADO, emitidoEm: LavOficial_s_(r.APROVADO_EM).slice(0, 10),
      aprovadoPor: r.APROVADO_POR, data: info.data || '', tipoEnsaio: info.tipoEnsaio ? (typeof LavRel_lvTextoTipoEnsaio_ === 'function' ? LavRel_lvTextoTipoEnsaio_(info.tipoEnsaio) : info.tipoEnsaio) : '—', programa: info.programa || '', equipamento: info.tipoCiclo === 'ULTRASSOM' ? 'Lavadora ultrassônica' : (info.tipoCiclo ? 'Termodesinfectora' : '') };
  }).sort(function (a, b) { return (a.status === 'SUBSTITUIDO') - (b.status === 'SUBSTITUIDO') || String(b.emitidoEm).localeCompare(String(a.emitidoEm)); });
}

/* ============================================================
 * Contexto do relatório consolidado (decisão por regra)
 * ============================================================ */

function LavOficial_dataIso_(br) { return SGO_QEQ_iso_(br); }

function LavOficial_montarContexto_(sessionId, p) {
  p = p || {};
  var ident = SGO_QEQ_identificacao_(sessionId, p.clienteId, p.unidadeId, p.equipamentoId);
  var travas = [];
  function trava(codigo, texto, fazer) { travas.push({ codigo: codigo, texto: texto, comoCorrigir: fazer }); }

  if (!LAVOFICIAL_CFG.TIPO_EQUIPAMENTO_RE.test(SGO_QEQ_semAcento_(ident.tipo))) {
    trava('TIPO_EQUIPAMENTO', 'O equipamento escolhido está cadastrado como "' + ident.tipo + '", e este relatório é de lavadora (termodesinfectora ou ultrassônica).', 'Escolha a lavadora na lista de equipamentos ou corrija o tipo em Cadastros › Equipamentos.');
  }
  var etapas = { QI: !!(p.etapas || {}).QI, QO: !!(p.etapas || {}).QO, QD: !!(p.etapas || {}).QD };
  if (!etapas.QI && !etapas.QO && !etapas.QD) trava('SEM_ETAPA', 'Nenhuma etapa da qualificação foi marcada.', 'Em "Qualificação", marque as etapas executadas (instalação, operação e/ou desempenho).');

  var motivo = LavOficial_s_(p.motivo);
  if (LAVOFICIAL_CFG.MOTIVOS.indexOf(motivo) < 0) trava('SEM_MOTIVO', 'O motivo da qualificação não foi escolhido.', 'Em "Qualificação", escolha o motivo (qualificação inicial ou o tipo de requalificação).');
  var meses = parseInt(p.periodicidadeMeses, 10);
  if (!(meses >= LAVOFICIAL_CFG.PERIODICIDADE_MIN_MESES && meses <= LAVOFICIAL_CFG.PERIODICIDADE_MAX_MESES)) {
    trava('PERIODICIDADE', 'A periodicidade da requalificação deve ficar entre ' + LAVOFICIAL_CFG.PERIODICIDADE_MIN_MESES + ' e ' + LAVOFICIAL_CFG.PERIODICIDADE_MAX_MESES + ' meses.', 'Corrija a periodicidade em "Qualificação" (o padrão é ' + LAVOFICIAL_CFG.PERIODICIDADE_PADRAO_MESES + ' meses).');
    meses = LAVOFICIAL_CFG.PERIODICIDADE_PADRAO_MESES;
  }

  // Ciclos (relatórios de ensaio emitidos).
  var vistos = {};
  var ids = (Array.isArray(p.ciclos) ? p.ciclos : []).map(LavOficial_s_).filter(function (x) { if (!x || vistos[x]) return false; vistos[x] = true; return true; });
  var ciclos = [];
  ids.forEach(function (id) {
    var r = LavOficial_cicloDaEmissao_(id, ident);
    if (r.ok) ciclos.push(r.ciclo); else travas.push(r.trava);
  });
  ciclos.sort(function (a, b) { return (LavOficial_dataIso_(a.resumo.identificacao.dataDoEnsaio) || '').localeCompare(LavOficial_dataIso_(b.resumo.identificacao.dataDoEnsaio) || '') || String(a.numero).localeCompare(String(b.numero)); });
  ciclos.forEach(function (c, i) { c.ordem = i + 1; });
  if ((etapas.QO || etapas.QD) && !ids.length) trava('SEM_CICLO', 'Nenhum relatório de ensaio foi escolhido.', 'Em "Relatórios de ensaio do equipamento", marque os relatórios dos ciclos que fundamentam esta qualificação.');
  ciclos.forEach(function (c) {
    if (c.resultado !== 'APROVADO' && c.resultado !== 'REPROVADO') trava('CICLO_INFORMATIVO', 'O relatório de ensaio ' + c.numero + ' é informativo (sem critério de aprovação) e não fundamenta a qualificação.', 'Desmarque este relatório.');
  });
  if (etapas.QO && ids.length && !ciclos.some(function (c) { return c.etapa === 'QO'; })) trava('SEM_CICLO_QO', 'A qualificação de operação foi marcada, mas nenhum relatório escolhido é de câmara vazia nem de teste de cavitação.', 'Marque o relatório do ciclo sem carga (tipo de ensaio "QO") ou desmarque a qualificação de operação.');
  if (etapas.QD && ids.length && !ciclos.some(function (c) { return c.etapa === 'QD'; })) trava('SEM_CICLO_QD', 'A qualificação de desempenho foi marcada, mas nenhum relatório escolhido é de ciclo com carga ou de validação de limpeza.', 'Marque o relatório do ciclo com carga (tipo de ensaio "QD") ou desmarque a qualificação de desempenho.');
  if (!etapas.QO && !etapas.QD && ids.length) trava('CICLO_SEM_ETAPA', 'Há relatórios de ensaio marcados, mas só a qualificação de instalação foi escolhida.', 'Marque a etapa correspondente (operação ou desempenho) ou desmarque os relatórios.');

  var comPressao = ciclos.some(function (c) { return c.resumo.analisarPressao; });
  var semPressao = [];
  // Tipo do equipamento pelos ciclos: termodesinfectora (A0) ou lavadora ultrassônica (banho). Não se misturam.
  var tipos = {};
  ciclos.forEach(function (c) { tipos[c.resumo.tipoCiclo === 'ULTRASSOM' ? 'ULTRASSOM' : 'TERMO'] = true; });
  if (Object.keys(tipos).length > 1) trava('CICLOS_TIPOS_DIFERENTES', 'Os relatórios escolhidos misturam termodesinfecção e lavagem ultrassônica.', 'Marque só os relatórios do tipo do equipamento escolhido.');
  var tipoCiclo = tipos.ULTRASSOM && !tipos.TERMO ? 'ULTRASSOM' : (tipos.TERMO ? 'TERMO' : (/ULTRASS/.test(SGO_QEQ_semAcento_(ident.tipo)) ? 'ULTRASSOM' : 'TERMO'));

  // Qualificação de instalação (lista de verificação).
  var qi = [];
  if (etapas.QI) {
    var resp = p.qi || {};
    LAVOFICIAL_CFG.QI_ITENS.forEach(function (it) {
      if (it.tipo && it.tipo !== tipoCiclo) return;
      var r = resp[it.id] || {};
      var sit = LavOficial_up_(r.situacao);
      qi.push({ id: it.id, texto: it.texto, situacao: LAVOFICIAL_CFG.SITUACOES_QI[sit] ? sit : '', observacao: LavOficial_s_(r.observacao).slice(0, 400) });
    });
    var semResposta = qi.filter(function (x) { return !x.situacao; });
    if (semResposta.length) trava('QI_INCOMPLETA', 'A lista da qualificação de instalação tem ' + semResposta.length + ' item(ns) sem resposta.', 'Em "Qualificação de instalação", marque Conforme, Não conforme ou Não aplicável em todos os itens.');
    qi.filter(function (x) { return x.situacao === 'NC' && x.observacao.length < 10; }).forEach(function (x) {
      trava('QI_NC_SEM_OBS', 'Item não conforme sem descrição: ' + x.texto + '.', 'Descreva o que foi encontrado na observação do item (ao menos 10 caracteres).');
    });
  }

  // Indicadores informados (controle complementar; leitura e guarda do resultado são do serviço).
  var indicadores = (Array.isArray(p.indicadores) ? p.indicadores : []).map(function (x) {
    return { tipo: LavOficial_s_(x.tipo), ciclo: LavOficial_s_(x.ciclo).slice(0, 60), resultado: LavOficial_up_(x.resultado), observacao: LavOficial_s_(x.observacao).slice(0, 300) };
  }).filter(function (x) { return x.tipo || x.resultado || x.ciclo; });
  indicadores.forEach(function (x, i) {
    if (LAVOFICIAL_CFG.INDICADORES.indexOf(x.tipo) < 0 || ['CONFORME', 'NAO_CONFORME'].indexOf(x.resultado) < 0) {
      trava('INDICADOR_INCOMPLETO', 'O indicador da linha ' + (i + 1) + ' está incompleto.', 'Em "Indicadores", escolha o tipo e o resultado da linha ou apague a linha.');
    }
  });

  // Resultado por regra.
  var ncs = [];
  ciclos.forEach(function (c) {
    if (c.resultado !== 'REPROVADO') return;
    var falhas = (c.resumo.criterios || []).filter(function (k) { return k.conforme === false && k.decisivo !== false; });
    ncs.push({ origem: 'Relatório de ensaio ' + c.numero + (c.revisao !== '0' ? ' rev ' + c.revisao : ''),
      texto: falhas.length ? falhas.map(function (k) { return k.criterio + ': obtido ' + k.obtido + ' (requisito ' + k.requisito + ')'; }).join('; ') : (c.resumo.resumoResultado || 'ciclo reprovado') });
  });
  qi.filter(function (x) { return x.situacao === 'NC'; }).forEach(function (x) { ncs.push({ origem: 'Qualificação de instalação', texto: x.texto + ': ' + x.observacao }); });
  indicadores.filter(function (x) { return x.resultado === 'NAO_CONFORME'; }).forEach(function (x) { ncs.push({ origem: x.tipo + (x.ciclo ? ' (' + x.ciclo + ')' : ''), texto: 'resultado informado não conforme' + (x.observacao ? ': ' + x.observacao : '') }); });
  var status = ncs.length ? 'REPROVADO' : 'APROVADO';

  // Observações (sem afetar o resultado).
  var observacoes = [];
  ciclos.forEach(function (c) {
    var r = c.resumo, f = r.fatos || {};
    var pre = 'Relatório de ensaio ' + c.numero + ': ';
    if ((f.sensoresDesabilitados || []).length) observacoes.push(pre + 'sensores desconsiderados na análise: ' + f.sensoresDesabilitados.join(', ') + '.');
    (r.criterios || []).filter(function (k) { return k.naoAvaliado; }).forEach(function (k) { observacoes.push(pre + LavRel_minusculaInicial_(k.criterio) + ' não avaliado (' + String(k.obtido || '').replace(/^Não avaliado:?\s*/i, '').replace(/[.\s]+$/, '') + ').'); });
    (r.criterios || []).filter(function (k) { return k.conforme === false && k.decisivo === false; }).forEach(function (k) { observacoes.push(pre + LavRel_minusculaInicial_(k.criterio) + ' fora do valor de referência (obtido ' + String(k.obtido || '').replace(/[.\s]+$/, '') + '; não decide o resultado).'); });
    (r.alertasAnalise || []).filter(function (a) { return !/não decide o resultado/.test(a); }).slice(0, 3).forEach(function (a) { observacoes.push(pre + String(a).replace(/[.\s]+$/, '') + '.'); });
  });
  var obsLivre = LavOficial_s_(p.observacoes).slice(0, 2000);

  // Datas: período dos ensaios e validade da qualificação.
  var datas = ciclos.map(function (c) { return LavOficial_dataIso_(c.resumo.identificacao.dataDoEnsaio); }).filter(Boolean).sort();
  var dataQi = LavOficial_dataIso_(p.dataQi);
  if (etapas.QI && dataQi) datas.push(dataQi);
  datas.sort();
  if (etapas.QI && !dataQi) trava('QI_SEM_DATA', 'A data da verificação da instalação não foi informada.', 'Informe a data em "Qualificação de instalação" (dd/mm/aaaa).');
  var inicioIso = datas[0] || '', fimIso = datas[datas.length - 1] || '';
  var validadeIso = status === 'APROVADO' && fimIso ? SGO_QEQ_somarMeses_(fimIso, meses) : '';

  // Instrumentos (sem repetir) e critérios (sem repetir) dos ciclos.
  var instrumentos = [], vistosInst = {};
  ciclos.forEach(function (c) {
    ((c.resumo.registradores || {}).itens || []).forEach(function (it) {
      var k = SGO_QEQ_normTag_(it.tag) + '|' + LavOficial_s_(it.certificado);
      if (vistosInst[k]) { vistosInst[k].ciclos.push(c.numero); return; }
      var o = { tag: it.tag, descricao: LavOficial_semNomes_(it.descricao, ident._nomesProibidos), certificado: it.certificado, validade: it.validade, situacao: it.situacao, conforme: it.conforme, incertezaU95: it.incertezaU95, fatorK: it.fatorK, ciclos: [c.numero] };
      vistosInst[k] = o; instrumentos.push(o);
    });
  });
  var criterios = [], vistosCrit = {};
  ciclos.forEach(function (c) {
    (c.resumo.criterios || []).filter(function (k) { return k.decisivo !== false; }).forEach(function (k) {
      var chave = k.chave + '|' + k.requisito;
      if (vistosCrit[chave]) { if (vistosCrit[chave].aplicacao.indexOf(c.resumo.equipamentoLabel) < 0) vistosCrit[chave].aplicacao.push(c.resumo.equipamentoLabel); return; }
      var o = { chave: k.chave, criterio: k.criterio, requisito: k.requisito, referencia: k.referencia, aplicacao: [c.resumo.equipamentoLabel] };
      vistosCrit[chave] = o; criterios.push(o);
    });
  });

  var normas = (((typeof LavRel_UCFG !== 'undefined' && LavRel_UCFG.NORMAS_CITAVEIS) || {})[tipoCiclo] || []).slice();

  var tecnicos = [];
  ciclos.forEach(function (c) { var t = LavOficial_s_(c.resumo.identificacao.tecnicoExecutor); if (t && tecnicos.indexOf(t) < 0) tecnicos.push(t); });
  var programas = [];
  ciclos.forEach(function (c) { var pr = LavOficial_s_(c.resumo.identificacao.programa) || c.resumo.equipamentoLabel; if (pr && programas.indexOf(pr) < 0) programas.push(pr); });

  var piorA0 = null;
  ciclos.forEach(function (c) {
    var f = c.resumo.fatos || {};
    if (c.resumo.tipoCiclo === 'ULTRASSOM' || !isFinite(f.minA0) || f.minA0 === null) return;
    if (!piorA0 || f.minA0 < piorA0.valor) piorA0 = { valor: f.minA0, sensor: f.piorSensorA0 ? f.piorSensorA0.sensor : '', numero: c.numero, minimo: f.limiteAprovacaoFinal };
  });

  var ctx = {
    versao: 1,
    identificacao: {
      clienteId: ident.clienteId, unidadeId: ident.unidadeId, equipamentoId: ident.equipamentoId,
      cliente: ident.cliente, cnpj: ident.cnpj, endereco: ident.endereco, cidadeUf: ident.cidadeUf, unidade: ident.unidade, setor: ident.setor,
      tag: ident.tag, tipo: ident.tipo, numeroSerie: ident.numeroSerie,
      empresaExecutante: (typeof LavRel_UCFG !== 'undefined' && LavRel_UCFG.EMPRESA_EXECUTANTE) || {},
      tecnicos: tecnicos, responsavelCliente: LavOficial_s_(p.responsavelCliente).slice(0, 120), programas: programas
    },
    etapas: etapas, motivo: motivo, periodicidadeMeses: meses,
    inicio: SGO_QEQ_br_(inicioIso), fim: SGO_QEQ_br_(fimIso), validadeAte: SGO_QEQ_br_(validadeIso), validadeIso: validadeIso,
    dataQi: SGO_QEQ_br_(dataQi),
    ciclos: ciclos.map(function (c) { return { ordem: c.ordem, emissaoId: c.emissaoId, numero: c.numero, revisao: c.revisao, aprovadoPor: c.aprovadoPor, aprovadoEm: c.aprovadoEm, hash: c.hash, resultado: c.resultado, etapa: c.etapa, resumo: c.resumo }; }),
    qi: qi, indicadores: indicadores, criterios: criterios, instrumentos: instrumentos, normas: normas,
    comPressao: comPressao, semPressao: semPressao, tipoCiclo: tipoCiclo,
    statusConsolidado: status, naoConformidades: ncs, observacoes: observacoes, observacaoLivre: obsLivre, piorA0: piorA0,
    regraDecisao: String(((typeof LavRel_UCFG !== 'undefined' && LavRel_UCFG.EMISSAO) || {}).regraDecisao || ''),
    travas: travas, emissaoBloqueada: travas.length > 0,
    _nomesProibidos: ident._nomesProibidos
  };
  ctx.assinatura = LavOficial_assinaturaContexto_(ctx);
  return ctx;
}

/** Assinatura dos fatos (sem textos editáveis, número e revisão). */
function LavOficial_assinaturaContexto_(ctx) {
  return LavOficial_assinatura_({
    i: ctx.identificacao, e: ctx.etapas, m: ctx.motivo, p: ctx.periodicidadeMeses, q: ctx.qi, ind: ctx.indicadores, d: ctx.dataQi,
    c: ctx.ciclos.map(function (c) { return [c.emissaoId, c.revisao, c.hash, c.resultado]; }), o: ctx.observacaoLivre, s: ctx.statusConsolidado
  });
}

/** Tira do texto os nomes de fabricante e modelo do equipamento (cadastro). */
function LavOficial_semNomes_(texto, nomes) {
  var t = LavOficial_s_(texto);
  (nomes || []).forEach(function (n) {
    if (LavOficial_s_(n).length < 3) return;
    t = t.replace(new RegExp(String(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').replace(/\s{2,}/g, ' ').replace(/\s+([,.;)])/g, '$1').trim();
  });
  return t;
}

/* ============================================================
 * Textos (padrão determinístico e redação por IA com conferência)
 * ============================================================ */

function LavOficial_etapasTexto_(etapas) {
  var l = [];
  if (etapas.QI) l.push('de instalação');
  if (etapas.QO) l.push('de operação');
  if (etapas.QD) l.push('de desempenho');
  if (!l.length) return 'qualificação';
  return 'qualificação ' + (l.length === 1 ? l[0] : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]);
}

function LavOficial_textosPadrao_(ctx) {
  var id = ctx.identificacao;
  var termo = ctx.tipoCiclo !== 'ULTRASSOM';
  var nome = termo ? 'A lavadora termodesinfectora' : 'A lavadora ultrassônica';
  var nCiclos = ctx.ciclos.length;
  var partes = [];
  partes.push(nome + ' ' + (id.tag ? id.tag + ' ' : '') + 'foi submetida à ' + LavOficial_etapasTexto_(ctx.etapas) + (ctx.inicio ? (ctx.inicio === ctx.fim ? ' em ' + ctx.inicio : ' de ' + ctx.inicio + ' a ' + ctx.fim) : '') + '.');
  if (ctx.statusConsolidado === 'APROVADO') {
    var p2 = [];
    if (nCiclos) p2.push(LavOficialDoc_qtd_(nCiclos, 'ciclo instrumentado', 'ciclos instrumentados') + ', documentados nos relatórios de ensaio listados no Anexo A, atenderam a todos os critérios decisivos de aceitação');
    if (ctx.etapas.QI) p2.push('todos os itens aplicáveis da verificação da instalação foram considerados conformes');
    if (ctx.indicadores.length) p2.push('os ensaios complementares informados tiveram resultado conforme');
    if (p2.length) partes.push(p2.join('; ').replace(/^./, function (c) { return c.toUpperCase(); }) + '.');
    if (ctx.piorA0) partes.push('O menor A0 entre os ciclos foi de ' + SGO_DocA4_val_(ctx.piorA0.valor, 2, 's') + (ctx.piorA0.sensor ? ', no sensor ' + ctx.piorA0.sensor : '') + ' do relatório ' + ctx.piorA0.numero + ', para o mínimo de ' + SGO_DocA4_val_(ctx.piorA0.minimo, 0, 's') + '.');
    partes.push('Com base nesses resultados, o equipamento está APROVADO na qualificação, para os programas e as configurações de carga ensaiados' + (ctx.validadeAte ? ', com requalificação prevista até ' + ctx.validadeAte : '') + '.');
  } else {
    partes.push('Foram registradas as seguintes não conformidades: ' + ctx.naoConformidades.map(function (n) { return n.origem.toLowerCase().replace(/^relatório/, 'no relatório') + ', ' + (n.texto.charAt(0).toLowerCase() + n.texto.slice(1)).replace(/[.\s]+$/, ''); }).join('; ') + '.');
    partes.push('O equipamento está REPROVADO na qualificação e não deve ser liberado para uso nos programas avaliados até que as causas sejam investigadas e corrigidas e uma nova qualificação tenha resultado aprovado.');
  }
  var simples = ctx.statusConsolidado === 'APROVADO'
    ? (termo ? 'Nos ensaios realizados, a lavadora atingiu e manteve a temperatura e o tempo necessários para desinfetar os materiais nos programas avaliados.' : 'Nos ensaios realizados, o banho da lavadora ultrassônica ficou na temperatura escolhida pelo tempo previsto nos programas avaliados.') +
      ' Ela está aprovada para uso nesses programas' + (ctx.validadeAte ? ' e deve ser qualificada novamente até ' + ctx.validadeAte : '') + ', ou antes, se passar por manutenção importante, mudar de local ou de programa.'
    : 'Nos ensaios realizados, a lavadora não atendeu a todas as condições exigidas. Ela está reprovada e não deve ser usada nos programas avaliados até a correção do problema e um novo ensaio com resultado aprovado.';
  return { conclusao: partes.join(' '), conclusaoSimples: simples };
}

function LavOficial_regrasTexto_(ctx, exigirVeredito, verificarNumeros) {
  var termos = (!ctx.comPressao && typeof LAVREL_TERMOS_PRESSAO !== 'undefined') ? LAVREL_TERMOS_PRESSAO.slice() : [];
  (ctx._nomesProibidos || []).forEach(function (n) { termos.push(new RegExp('\\b' + String(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')); });
  return {
    numeros: SGO_QIAV_numerosDe_([ctx.ciclos.map(function (c) { return [c.resumo.criterios, c.resumo.fatos, c.numero]; }), ctx.piorA0, ctx.periodicidadeMeses, ctx.inicio, ctx.fim, ctx.validadeAte, ctx.normas, ctx.instrumentos]),
    normas: ctx.normas, veredito: ctx.statusConsolidado, exigirVeredito: !!exigirVeredito, verificarNumeros: verificarNumeros !== false, termosProibidos: termos
  };
}

function LavOficial_conferirTextos_(ctx, textos, verificarNumeros) {
  return SGO_QIAV_verificarBlocos_({
    'Conclusão': { texto: textos.conclusao, regras: LavOficial_regrasTexto_(ctx, true, verificarNumeros) },
    'Conclusão em linguagem simples': { texto: textos.conclusaoSimples, regras: LavOficial_regrasTexto_(ctx, false, verificarNumeros) }
  });
}

function LavOficial_promptIA_(ctx) {
  var termo = ctx.tipoCiclo !== 'ULTRASSOM';
  var fatos = {
    equipamento: { tipo: termo ? 'lavadora termodesinfectora' : 'lavadora ultrassônica', tag: ctx.identificacao.tag, unidade: ctx.identificacao.unidade },
    etapas: LavOficial_etapasTexto_(ctx.etapas), motivo: ctx.motivo, periodo: { inicio: ctx.inicio, fim: ctx.fim },
    resultado: ctx.statusConsolidado, requalificacaoAte: ctx.validadeAte, periodicidadeMeses: ctx.periodicidadeMeses,
    ciclos: ctx.ciclos.map(function (c) {
      var f = c.resumo.fatos || {};
      return { relatorio: c.numero, etapa: c.etapa, ensaio: c.resumo.equipamentoLabel, resultado: c.resultado,
        a0Minimo: termo && isFinite(f.minA0) ? SGO_DocA4_val_(f.minA0, 2, 's') : undefined, a0Exigido: termo ? SGO_DocA4_val_(f.limiteAprovacaoFinal, 0, 's') : undefined,
        tempoNoPatamar: !termo && f.tempoCavitacao !== undefined ? SGO_DocA4_val_(f.tempoCavitacao, 2, 'min') : undefined,
        criteriosNaoAtendidos: (c.resumo.criterios || []).filter(function (k) { return k.conforme === false && k.decisivo !== false; }).map(function (k) { return k.criterio + ' (obtido ' + k.obtido + '; requisito ' + k.requisito + ')'; }) };
    }),
    instalacao: ctx.etapas.QI ? { itens: ctx.qi.length, naoConformes: ctx.qi.filter(function (x) { return x.situacao === 'NC'; }).map(function (x) { return x.texto; }) } : undefined,
    ensaiosComplementares: ctx.indicadores.map(function (x) { return x.tipo + ': ' + (x.resultado === 'CONFORME' ? 'conforme' : 'não conforme'); }),
    naoConformidades: ctx.naoConformidades.map(function (n) { return n.origem + ': ' + n.texto; }),
    normasCitaveis: ctx.normas
  };
  return [
    'Você redige a conclusão de um relatório de qualificação de ' + fatos.equipamento.tipo + ', como o engenheiro responsável técnico.',
    SGO_DocA4_regrasRedacaoIA_(),
    ctx.comPressao ? '' : '- Os ensaios consideraram somente a temperatura: não escreva sobre pressão.',
    termo ? '' : '- O registrador mede temperatura: não afirme nada sobre a intensidade da cavitação.',
    '- Não cite número de seção ou de item deste relatório nem de norma.',
    'Devolva somente um objeto JSON com duas chaves: "conclusao" (dois a quatro parágrafos técnicos, que terminam declarando o resultado: ' + ctx.statusConsolidado + ') e "conclusaoSimples" (um parágrafo curto, sem termos técnicos, para o gestor do serviço de saúde, com o mesmo resultado).',
    'FATOS (únicos permitidos):',
    JSON.stringify(fatos)
  ].filter(Boolean).join('\n');
}

function LavOficial_redigirIA_(ctx) {
  var bruto = SGO_DocA4_chamarGemini_(LavOficial_promptIA_(ctx), { tokens: 16384, temperatura: 0.2 });
  var m = /\{[\s\S]*\}/.exec(String(bruto || ''));
  if (!m) throw new Error('a redação automática não devolveu o formato esperado');
  var o = JSON.parse(m[0]);
  return { conclusao: SGO_DocA4_limparTextoIA_(o.conclusao), conclusaoSimples: SGO_DocA4_limparTextoIA_(o.conclusaoSimples) };
}

/** Textos do envio: os revisados na tela (conferidos sem a checagem de números) ou o padrão. */
function LavOficial_textosDoPayload_(ctx, p) {
  var t = p.textos || {};
  var textos = { conclusao: LavOficial_s_(t.conclusao), conclusaoSimples: LavOficial_s_(t.conclusaoSimples) };
  if (!textos.conclusao || !textos.conclusaoSimples) throw new Error('A conclusão está incompleta. Clique em "Gerar rascunho" para receber o texto padrão, revise e envie de novo.');
  var conf = LavOficial_conferirTextos_(ctx, textos, false);
  if (!conf.ok) throw new Error('A conclusão revisada não pode ser emitida: ' + conf.problemas.join('; ') + '. Corrija o texto (o resultado é o calculado pelo sistema) e tente de novo.');
  return textos;
}

/* ============================================================
 * HTML do documento
 * ============================================================ */

function LavOficial_assinaturas_(ctx, aprovacao, enviadoPor) {
  var lista = [];
  if (enviadoPor) lista.push({ papel: 'Elaborado por', nome: enviadoPor, cargo: 'Equipe técnica da empresa executante' });
  var padrao = (typeof LavRel_UCFG !== 'undefined' && LavRel_UCFG.ASSINATURAS_PADRAO) || [];
  padrao.forEach(function (a) { lista.push(Object.assign({ papel: 'Responsável técnico' }, a)); });
  if (aprovacao && aprovacao.nome) lista.push({ papel: 'Aprovado para emissão por', nome: aprovacao.nome, cargo: 'Aprovação registrada no sistema em ' + aprovacao.em });
  lista.push({ papel: 'Ciência do contratante', nome: ctx.identificacao.responsavelCliente || ' ', cargo: 'Responsável pelo serviço — ' + (ctx.identificacao.cliente || 'contratante') });
  return lista;
}

function LavOficial_historico_(numero, idAtual) {
  if (!numero) return [];
  return SGO_QE_listar_(LAVOFICIAL_CFG.MODULO).filter(function (r) { return r.NUMERO === numero && r.ID !== idAtual && (r.STATUS === 'EMITIDO' || r.STATUS === 'SUBSTITUIDO'); })
    .map(function (r) { var mot = ''; try { mot = LavOficial_s_(JSON.parse(r.PAYLOAD_JSON || '{}').motivoRevisao); } catch (e) {} return { revisao: LavOficial_s_(r.REVISAO) || '0', em: LavOficial_s_(r.APROVADO_EM).slice(0, 10), por: r.APROVADO_POR, motivo: mot }; })
    .sort(function (a, b) { return (parseInt(a.revisao, 10) || 0) - (parseInt(b.revisao, 10) || 0); });
}

function LavOficial_html_(ctx, textos, o) {
  o = o || {};
  return LavOficialDoc_montar_({
    ctx: ctx, textos: textos, numero: o.numero || '(atribuído no envio para aprovação)', revisao: o.revisao === undefined ? '0' : o.revisao,
    aprovacao: o.aprovacao || null, minuta: !!o.minuta, enviadoPor: o.enviadoPor || '', motivoRevisao: o.motivoRevisao || '',
    historico: o.historico || [], assinaturas: LavOficial_assinaturas_(ctx, o.aprovacao, o.enviadoPor), emitidoEm: o.emitidoEm || LavOficial_hojeBr_()
  });
}

/* ============================================================
 * API (LavOficial_apiDispatch)
 * ============================================================ */

function LavOficial_apiSituacao(p, sessao) {
  return {
    ok: true, modelo: LavOficial_modelo_(), podeAlterarModelo: LavOficial_up_(sessao.perfil) === 'ADMIN', podeAprovar: LavOficial_ehAprovador_(sessao),
    motivos: LAVOFICIAL_CFG.MOTIVOS, qiItens: LAVOFICIAL_CFG.QI_ITENS, indicadores: LAVOFICIAL_CFG.INDICADORES,
    periodicidadePadrao: LAVOFICIAL_CFG.PERIODICIDADE_PADRAO_MESES, periodicidadeMin: LAVOFICIAL_CFG.PERIODICIDADE_MIN_MESES, periodicidadeMax: LAVOFICIAL_CFG.PERIODICIDADE_MAX_MESES
  };
}

/** Só o Administrador escolhe o modelo. ANTERIOR reativa o formulário antigo (documento-modelo). */
function LavOficial_apiDefinirModelo(p, sessao) {
  if (LavOficial_up_(sessao.perfil) !== 'ADMIN') throw new Error('Somente o Administrador do sistema escolhe o modelo do relatório oficial.');
  var modelo = LavOficial_up_(p.modelo) === 'ANTERIOR' ? 'ANTERIOR' : 'NOVO';
  PropertiesService.getScriptProperties().setProperty(LAVOFICIAL_CFG.PROP_MODELO, modelo);
  SGO_QEQ_log_('LAVADORA_MODELO_OFICIAL', sessao, 'Modelo do relatório oficial da lavadora: ' + modelo + '.');
  return { ok: true, modelo: modelo, mensagem: modelo === 'NOVO' ? 'Modelo novo ativado (padrão).' : 'Modelo anterior reativado: a aba volta a mostrar o formulário antigo. Para voltar ao modelo novo, escolha "Modelo novo".' };
}

function LavOficial_apiPesquisarClientes(p, sessao) { return { ok: true, items: SGO_QEQ_pesquisarClientes_(sessao, p.termo) }; }
function LavOficial_apiListarUnidades(p, sessao) { return { ok: true, items: SGO_QEQ_listarUnidades_(sessao, p.clienteId) }; }
function LavOficial_apiListarEquipamentos(p, sessao) { return { ok: true, items: SGO_QEQ_listarEquipamentos_(sessao, p.clienteId, p.unidadeId, LAVOFICIAL_CFG.TIPO_EQUIPAMENTO_RE) }; }

/** Identificação do cadastro com o vínculo conferido (componente de escolha das telas de ensaio). */
function LavOficial_apiIdentificacao(p, sessao, sessionId) {
  var ident = SGO_QEQ_identificacao_(sessionId, p.clienteId, p.unidadeId, p.equipamentoId);
  var limpo = {};
  Object.keys(ident).forEach(function (k) { if (k.charAt(0) !== '_') limpo[k] = ident[k]; });
  return { ok: true, identificacao: limpo, tipoCompativel: LAVOFICIAL_CFG.TIPO_EQUIPAMENTO_RE.test(SGO_QEQ_semAcento_(ident.tipo)) };
}

/** Tudo o que a tela mostra do equipamento escolhido. */
function LavOficial_apiEquipamento(p, sessao, sessionId) {
  var ident = SGO_QEQ_identificacao_(sessionId, p.clienteId, p.unidadeId, p.equipamentoId);
  var nome = SGO_QE_nomeSessao_(sessao), aprovador = LavOficial_ehAprovador_(sessao);
  var oficiais = SGO_QE_listar_(LAVOFICIAL_CFG.MODULO).filter(function (r) { return LavOficial_s_(r.EQUIPAMENTO_ID) === ident.equipamentoId; })
    .filter(function (r) { return r.STATUS === 'EMITIDO' || r.STATUS === 'SUBSTITUIDO' || aprovador || r.ENVIADO_POR === nome; })
    .map(function (r) {
      return { id: r.ID, numero: r.NUMERO, revisao: LavOficial_s_(r.REVISAO) || '0', status: r.STATUS, resultado: r.RESULTADO, validadeAte: r.VALIDADE_ATE,
        enviadoPor: r.ENVIADO_POR, enviadoEm: r.ENVIADO_EM, aprovadoPor: r.APROVADO_POR, aprovadoEm: r.APROVADO_EM, motivoDevolucao: r.DEVOLVIDO_MOTIVO, pdfId: r.PDF_ID, htmlId: r.HTML_ID,
        pdfUrl: LavOficial_urlArquivo_(r.PDF_ID), htmlUrl: LavOficial_urlArquivo_(r.HTML_ID) };
    }).sort(function (a, b) { return String(b.enviadoEm).localeCompare(String(a.enviadoEm)); });
  var itens = SGO_QEQ_todosItens_()[ident.equipamentoId] || [];
  return {
    ok: true,
    identificacao: { clienteId: ident.clienteId, unidadeId: ident.unidadeId, equipamentoId: ident.equipamentoId, cliente: ident.cliente, cnpj: ident.cnpj, endereco: ident.endereco, cidadeUf: ident.cidadeUf, unidade: ident.unidade, setor: ident.setor, tag: ident.tag, tipo: ident.tipo, numeroSerie: ident.numeroSerie },
    tipoCompativel: LAVOFICIAL_CFG.TIPO_EQUIPAMENTO_RE.test(SGO_QEQ_semAcento_(ident.tipo)),
    ciclos: LavOficial_ciclosDoEquipamento_(ident.equipamentoId), semVinculo: SGO_QEQ_emissoesSemVinculo_(ident, [LAVOFICIAL_CFG.MODULO_CICLO]),
    oficiais: oficiais, situacao: SGO_QEQ_situacao_(itens.filter(function (i) { return i.situacao !== 'MINUTA'; }))
  };
}

function LavOficial_apiVincular(p, sessao, sessionId) { return SGO_QEQ_vincularEmissao_(sessionId, sessao, p); }

function LavOficial_resumoTela_(ctx) {
  return {
    statusConsolidado: ctx.statusConsolidado, inicio: ctx.inicio, fim: ctx.fim, validadeAte: ctx.validadeAte, periodicidadeMeses: ctx.periodicidadeMeses,
    ciclos: ctx.ciclos.map(function (c) { return { numero: c.numero, revisao: c.revisao, resultado: c.resultado, etapa: c.etapa, data: c.resumo.identificacao.dataDoEnsaio, ensaio: c.resumo.equipamentoLabel }; }),
    naoConformidades: ctx.naoConformidades, observacoes: ctx.observacoes, comPressao: ctx.comPressao
  };
}

function LavOficial_apiGerarRascunho(p, sessao, sessionId) {
  var ctx = LavOficial_montarContexto_(sessionId, p);
  var base = { ok: true, assinaturaContexto: ctx.assinatura, resumo: LavOficial_resumoTela_(ctx), travas: ctx.travas, bloqueado: ctx.emissaoBloqueada, podeAprovar: LavOficial_ehAprovador_(sessao) };
  if (ctx.emissaoBloqueada) return Object.assign(base, { textos: { conclusao: '', conclusaoSimples: '' }, avisoIA: 'O relatório não pode ser enviado enquanto os itens abaixo não forem resolvidos. Nada foi redigido.' });
  var textos = LavOficial_textosPadrao_(ctx), origem = 'PADRAO', aviso = '';
  if (p.redigirComIA) {
    try {
      var t = LavOficial_redigirIA_(ctx);
      var conf = LavOficial_conferirTextos_(ctx, t, true);
      if (conf.ok) { textos = t; origem = 'IA'; }
      else aviso = 'O texto redigido automaticamente não passou na conferência (' + conf.problemas.slice(0, 4).join('; ') + '). Foi usado o texto padrão, montado só com os resultados; revise se quiser.';
    } catch (e) {
      aviso = 'A redação automática não está disponível (' + LavOficial_msg_(e) + '). Foi usado o texto padrão, montado só com os resultados; revise se quiser.';
    }
  }
  return Object.assign(base, { textos: textos, origemTexto: origem, avisoIA: aviso });
}

function LavOficial_validarEnvio_(sessionId, p) {
  var ctx = LavOficial_montarContexto_(sessionId, p);
  if (ctx.emissaoBloqueada) throw new Error('O relatório não pode seguir: ' + ctx.travas.map(function (t) { return t.texto + ' ' + t.comoCorrigir; }).join(' '));
  if (!p.assinaturaContexto || p.assinaturaContexto !== ctx.assinatura) throw new Error('Os dados mudaram desde o rascunho (ou o rascunho não foi gerado). Clique em "Gerar rascunho" de novo, revise a conclusão e envie.');
  return { ctx: ctx, textos: LavOficial_textosDoPayload_(ctx, p) };
}

function LavOficial_apiPrevia(p, sessao, sessionId) {
  var ctx = LavOficial_montarContexto_(sessionId, p);
  var textos = (p.textos && p.textos.conclusao) ? { conclusao: LavOficial_s_(p.textos.conclusao), conclusaoSimples: LavOficial_s_(p.textos.conclusaoSimples) } : LavOficial_textosPadrao_(ctx);
  var html = LavOficial_html_(ctx, textos, { numero: p.numero, minuta: true, enviadoPor: SGO_QE_nomeSessao_(sessao), historico: LavOficial_historico_(p.numero, '') });
  return { ok: true, html: SGO_DocA4_prepararSumario_(html).html, travas: ctx.travas };
}

function LavOficial_apiEnviarParaAprovacao(p, sessao, sessionId) {
  p = p || {};
  var v = LavOficial_validarEnvio_(sessionId, p);
  var numero = LavOficial_s_(p.numero);
  if (numero) {
    var emitidas = SGO_QE_listar_(LAVOFICIAL_CFG.MODULO).filter(function (r) { return r.NUMERO === numero && (r.STATUS === 'EMITIDO' || r.STATUS === 'SUBSTITUIDO'); });
    if (!emitidas.length) throw new Error('O número ' + numero + ' não corresponde a um relatório emitido. Para um relatório novo, deixe o número em branco: ele é atribuído no envio.');
    if (emitidas.some(function (r) { return LavOficial_s_(r.EQUIPAMENTO_ID) !== v.ctx.identificacao.equipamentoId; })) throw new Error('O relatório ' + numero + ' é de outro equipamento; a nova revisão precisa ser do mesmo equipamento.');
    if (LavOficial_s_(p.motivoRevisao).length < 10) throw new Error('Descreva o motivo da nova revisão (ao menos 10 caracteres): ele aparece no registro de revisões do documento.');
  } else {
    numero = LavOficial_proximoNumero_();
  }
  var guardado = Object.assign({}, p, { numero: numero, textos: v.textos });
  var id = SGO_QE_registrar_({
    MODULO: LAVOFICIAL_CFG.MODULO, STATUS: 'AGUARDANDO_APROVACAO', NUMERO: numero, REVISAO: String(SGO_QE_proximaRevisao_(LAVOFICIAL_CFG.MODULO, numero, 0)),
    CLIENTE: v.ctx.identificacao.cliente, CNPJ: v.ctx.identificacao.cnpj, TAG: v.ctx.identificacao.tag, RESULTADO: v.ctx.statusConsolidado,
    HASH_CONTEXTO: v.ctx.assinatura, ENVIADO_POR: SGO_QE_nomeSessao_(sessao), ENVIADO_EM: SGO_QE_agora_(),
    JUSTIFICATIVA_ESCOPO: '',
    PAYLOAD_JSON: JSON.stringify(guardado), CLIENTE_ID: v.ctx.identificacao.clienteId, UNIDADE_ID: v.ctx.identificacao.unidadeId,
    EQUIPAMENTO_ID: v.ctx.identificacao.equipamentoId, VALIDADE_ATE: v.ctx.validadeAte
  });
  SGO_QEQ_log_('LAVADORA_OFICIAL_ENVIADO', sessao, 'Relatório de qualificação ' + numero + ' enviado para aprovação (registro ' + id + ').');
  return { ok: true, id: id, numero: numero, mensagem: 'Relatório ' + numero + ' enviado para aprovação do responsável técnico. Ele confere a prévia em "Aguardando aprovação" e emite, ou devolve com o motivo.' };
}

function LavOficial_apiListarAprovacoes(p, sessao) {
  var aprovador = LavOficial_ehAprovador_(sessao), nome = SGO_QE_nomeSessao_(sessao);
  var itens = SGO_QE_listar_(LAVOFICIAL_CFG.MODULO).filter(function (r) {
    return r.STATUS === 'AGUARDANDO_APROVACAO' || (r.STATUS === 'DEVOLVIDO' && r.ENVIADO_POR === nome);
  }).filter(function (r) { return aprovador || r.ENVIADO_POR === nome; }).map(function (r) {
    return { id: r.ID, status: r.STATUS, numero: r.NUMERO, revisao: r.REVISAO, cliente: r.CLIENTE, tag: r.TAG, resultado: r.RESULTADO, enviadoPor: r.ENVIADO_POR, enviadoEm: r.ENVIADO_EM, motivoDevolucao: r.DEVOLVIDO_MOTIVO };
  });
  return { ok: true, podeAprovar: aprovador, itens: itens };
}

function LavOficial_carregar_(id, status) {
  var reg = SGO_QE_obter_(id);
  if (!reg || reg.MODULO !== LAVOFICIAL_CFG.MODULO) throw new Error('Registro não encontrado. Atualize a lista.');
  if (status && reg.STATUS !== status) throw new Error('Este registro não está ' + (status === 'AGUARDANDO_APROVACAO' ? 'aguardando aprovação' : 'disponível para esta ação') + ' (situação: ' + reg.STATUS + '). Atualize a lista.');
  return { reg: reg, payload: JSON.parse(reg.PAYLOAD_JSON || '{}') };
}

function LavOficial_conferirPendente_(sessionId, c) {
  var ctx = LavOficial_montarContexto_(sessionId, c.payload);
  if (ctx.emissaoBloqueada) throw new Error('O relatório não pode ser emitido: ' + ctx.travas.map(function (t) { return t.texto; }).join(' ') + ' Devolva ao técnico com o motivo.');
  if (ctx.assinatura !== c.reg.HASH_CONTEXTO) throw new Error('Os dados mudaram desde o envio (por exemplo, um relatório de ensaio ganhou revisão nova ou o cadastro foi alterado). Devolva ao técnico para gerar o rascunho de novo.');
  return { ctx: ctx, textos: LavOficial_textosDoPayload_(ctx, c.payload) };
}

function LavOficial_apiPreverAprovacao(p, sessao, sessionId) {
  LavOficial_exigirAprovador_(sessao);
  var c = LavOficial_carregar_(p.id, 'AGUARDANDO_APROVACAO');
  var v = LavOficial_conferirPendente_(sessionId, c);
  var html = LavOficial_html_(v.ctx, v.textos, { numero: c.reg.NUMERO, revisao: c.reg.REVISAO, minuta: true, enviadoPor: c.reg.ENVIADO_POR, motivoRevisao: c.payload.motivoRevisao, historico: LavOficial_historico_(c.reg.NUMERO, c.reg.ID) });
  return { ok: true, html: SGO_DocA4_prepararSumario_(html).html };
}

function LavOficial_apiAprovarEmitir(p, sessao, sessionId) {
  LavOficial_exigirAprovador_(sessao);
  if (!p || p.confirmacaoRevisao !== true) throw new Error('Marque "Conferi os dados, os critérios e a conclusão e aprovo a emissão" antes de aprovar.');
  var c = LavOficial_carregar_(p.id, 'AGUARDANDO_APROVACAO');
  var v = LavOficial_conferirPendente_(sessionId, c);
  var ctx = v.ctx, ident = ctx.identificacao;
  var numero = c.reg.NUMERO;
  var revisao = SGO_QE_proximaRevisao_(LAVOFICIAL_CFG.MODULO, numero, 0);
  var aprovacao = { nome: SGO_QE_nomeSessao_(sessao), login: LavOficial_s_(sessao.usuario), perfil: LavOficial_s_(sessao.perfil), em: SGO_QE_agora_() };
  var html = LavOficial_html_(ctx, v.textos, { numero: numero, revisao: String(revisao), aprovacao: aprovacao, enviadoPor: c.reg.ENVIADO_POR, motivoRevisao: c.payload.motivoRevisao, historico: LavOficial_historico_(numero, c.reg.ID) });
  var pasta = SGO_QEQ_pastaEquipamento_(LavRel_lvPastaLaudos_(), ident);
  var nome = SGO_DocSalvar_sanitizarNome_('Relatório de qualificação Lavadora - ' + numero + (revisao ? ' rev ' + revisao : '') + ' - ' + (ident.tag || 'sem TAG'));
  var s = SGO_DocSalvar_salvarHtmlEPdf_(pasta, nome, html, { compartilhar: true });
  SGO_QE_atualizar_(c.reg.ID, {
    STATUS: 'EMITIDO', REVISAO: String(revisao), APROVADO_POR: aprovacao.nome, APROVADO_LOGIN: aprovacao.login, APROVADO_PERFIL: aprovacao.perfil, APROVADO_EM: aprovacao.em,
    PDF_ID: s.pdfId || '', HTML_ID: s.htmlId || '', RESULTADO: ctx.statusConsolidado, VALIDADE_ATE: ctx.validadeAte,
    RESUMO_JSON: JSON.stringify({ v: 1, status: ctx.statusConsolidado, validadeAte: ctx.validadeAte, inicio: ctx.inicio, fim: ctx.fim, etapas: ctx.etapas, ciclos: ctx.ciclos.map(function (x) { return { id: x.emissaoId, numero: x.numero, revisao: x.revisao, resultado: x.resultado }; }) })
  });
  SGO_QE_marcarSubstituidas_(LAVOFICIAL_CFG.MODULO, numero, c.reg.ID);
  var arq = SGO_QEQ_registrarDocumento_(sessionId, ident, { nomeArquivo: nome, link: s.pdfUrl, vencimentoIso: ctx.validadeIso });
  try { if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_(); } catch (e) {}
  SGO_QEQ_log_('LAVADORA_OFICIAL_EMITIDO', sessao, 'Relatório de qualificação ' + numero + ' rev ' + revisao + ' emitido (' + ctx.statusConsolidado + ') para o equipamento ' + ident.equipamentoId + '.');
  var pastaUrl = '';
  try { pastaUrl = pasta.getUrl(); } catch (e) {}
  return {
    ok: true, numero: numero, revisao: revisao, resultado: ctx.statusConsolidado, validadeAte: ctx.validadeAte,
    pdfId: s.pdfId, pdfUrl: s.pdfUrl, htmlId: s.htmlId, htmlUrl: s.htmlUrl, pastaUrl: pastaUrl, clienteId: ident.clienteId,
    avisoArquivo: arq.ok ? '' : 'O documento foi emitido e salvo na pasta do cliente, mas não entrou no Arquivo de documentos (' + arq.aviso + '). Cadastre o PDF em Documentos para ele aparecer no equipamento.',
    mensagem: 'Relatório ' + numero + ' (revisão ' + revisao + ') emitido e salvo na pasta do equipamento, dentro da pasta do cliente.'
  };
}

function LavOficial_apiDevolver(p, sessao) {
  LavOficial_exigirAprovador_(sessao);
  var motivo = LavOficial_s_(p && p.motivo);
  if (motivo.length < 10) throw new Error('Escreva o motivo da devolução (ao menos 10 caracteres) para o técnico saber o que corrigir.');
  var c = LavOficial_carregar_(p.id, 'AGUARDANDO_APROVACAO');
  SGO_QE_atualizar_(c.reg.ID, { STATUS: 'DEVOLVIDO', DEVOLVIDO_MOTIVO: motivo, APROVADO_POR: SGO_QE_nomeSessao_(sessao), APROVADO_EM: SGO_QE_agora_() });
  return { ok: true, mensagem: 'Devolvido ao técnico com o motivo registrado.' };
}

/** Devolve os dados de um envio (devolvido, para corrigir) ou de um relatório emitido (para nova revisão). */
function LavOficial_apiAbrir(p, sessao) {
  var c = LavOficial_carregar_(p.id);
  var nome = SGO_QE_nomeSessao_(sessao);
  if (c.reg.STATUS === 'DEVOLVIDO') {
    if (c.reg.ENVIADO_POR !== nome && !LavOficial_ehAprovador_(sessao)) throw new Error('Este envio é de outra pessoa.');
    var dados = Object.assign({}, c.payload);
    // Envio de relatório novo devolvido: o número reservado não foi emitido; o novo envio recebe outro número.
    if (!SGO_QE_listar_(LAVOFICIAL_CFG.MODULO).some(function (r) { return r.NUMERO === dados.numero && (r.STATUS === 'EMITIDO' || r.STATUS === 'SUBSTITUIDO'); })) dados.numero = '';
    return { ok: true, dados: dados, modo: 'CORRIGIR', mensagem: 'Envio devolvido carregado. Motivo: ' + c.reg.DEVOLVIDO_MOTIVO };
  }
  if (c.reg.STATUS === 'EMITIDO') {
    var d2 = Object.assign({}, c.payload, { numero: c.reg.NUMERO, motivoRevisao: '', assinaturaContexto: '' });
    return { ok: true, dados: d2, modo: 'REVISAR', mensagem: 'Relatório ' + c.reg.NUMERO + ' carregado para nova revisão. Ajuste o que for preciso, gere o rascunho e informe o motivo da revisão.' };
  }
  throw new Error('Este registro não pode ser aberto para edição (situação: ' + c.reg.STATUS + ').');
}

function LavOficial_apiDispatch(req) {
  try {
    req = req || {};
    var sessionId = String(req.sessionId || '');
    var sessao = exigirSessao(sessionId);
    if (!SGO_QEQ_ehEquipe_(sessao)) throw new Error('O relatório de qualificação é feito pela equipe técnica (perfis ' + SGO_QEQ_PERFIS_EQUIPE.join(', ') + ').');
    var allow = {
      apiSituacao: LavOficial_apiSituacao, apiDefinirModelo: LavOficial_apiDefinirModelo,
      apiPesquisarClientes: LavOficial_apiPesquisarClientes, apiListarUnidades: LavOficial_apiListarUnidades, apiListarEquipamentos: LavOficial_apiListarEquipamentos,
      apiIdentificacao: LavOficial_apiIdentificacao, apiEquipamento: LavOficial_apiEquipamento, apiVincular: LavOficial_apiVincular,
      apiGerarRascunho: LavOficial_apiGerarRascunho, apiPrevia: LavOficial_apiPrevia, apiEnviarParaAprovacao: LavOficial_apiEnviarParaAprovacao,
      apiListarAprovacoes: LavOficial_apiListarAprovacoes, apiPreverAprovacao: LavOficial_apiPreverAprovacao, apiAprovarEmitir: LavOficial_apiAprovarEmitir,
      apiDevolver: LavOficial_apiDevolver, apiAbrir: LavOficial_apiAbrir,
      // 21/10/2026: completar no cadastro do equipamento o que falta (só campo vazio) e trazer dados de ensaios antigos.
      apiPreencherCadastro: function (p, s, id) { return SGO_QEQ_apiPreencherCadastro(p, s, id); }, apiSugestoesCadastro: function (p, s, id) { return SGO_QEQ_apiSugestoesCadastro(p, s, id); }
    };
    var fn = String(req.fn || '');
    if (!allow[fn]) throw new Error('Operação desconhecida: ' + fn + '. Atualize a página (F5).');
    var r = allow[fn](req.payload || {}, sessao, sessionId);
    if (fn !== 'apiSituacao' && /^api(Vincular|EnviarParaAprovacao|AprovarEmitir|Devolver|DefinirModelo)$/.test(fn) && typeof SGO_Pendencias_invalidar_ === 'function') { try { SGO_Pendencias_invalidar_(); } catch (eP) {} }
    return JSON.parse(JSON.stringify(r));
  } catch (e) {
    return { ok: false, erro: LavOficial_msg_(e) + '.' };
  }
}
