/****************************************************
 * METROLABS — LAVADORAS — RELATÓRIO DE ENSAIO DE CICLO (revisado em 21/10/2026)
 *
 * Documento HTML A4 de UM ciclo (termodesinfectora ou lavadora ultrassônica), no padrão
 * comum SGO_DocA4 (capa, sumário, cabeçalho e rodapé em todas as páginas, gráficos em SVG),
 * salvo em HTML + PDF na pasta do equipamento, dentro da pasta do cliente. Os números vêm de
 * LavRel_lvExecutarAnaliseCompleta_ (Main.js): este arquivo nunca recalcula resultado.
 *
 * Fluxo (molde da autoclave, SGO_AutoRel_CertificadoRelatorio.js):
 * 1. LavRel_apiGerarRascunhoCertificado — análise determinística. Dado com problema (travas)
 *    devolve a lista do que corrigir e não redige nada. Sem travas: a IA redige; o texto é
 *    conferido (SGO_QualifIA_Verificador.js) e, se reprovar, entra o texto padrão.
 * 2. Emissão só com aprovação registrada do responsável técnico (SGO_QualifEmissao.js, módulo
 *    LAVADORA): o aprovador emite direto (com a confirmação); os demais enviam para aprovação e o
 *    aprovador confere a prévia (minuta) e emite, ou devolve com o motivo.
 * Reemissão do mesmo número gera nova revisão; as anteriores ficam na pasta.
 ****************************************************/

var LAVREL_MODULO_EMISSAO = 'LAVADORA';
var LAVREL_MODULO_EMISSAO_DADOS = 'LAVADORA_DADOS';

/** Normas citáveis (lista fechada da configuração, por tipo de equipamento). */
function LavRel_lvListarNormasAplicaveis_(tipoCiclo) {
  const n = (LavRel_UCFG && LavRel_UCFG.NORMAS_CITAVEIS) || {};
  return ((tipoCiclo === 'ULTRASSOM' ? n.ULTRASSOM : n.TERMO) || []).slice();
}

function LavRel_lvLabelCiclo_(motor) {
  return motor === 'ULTRASSOM' ? 'Ciclo de lavagem ultrassônica' : 'Ciclo de lavagem e desinfecção térmica';
}

function LavRel_lvTipoEquipamento_(motor) {
  return motor === 'ULTRASSOM' ? 'Lavadora ultrassônica' : 'Lavadora termodesinfectora';
}

function LavRel_lvTextoClasseArtigo_(classe) {
  return classe === 'CRITICO' ? 'Crítico' : 'Semicrítico ou não crítico';
}

/** Conformidade por sensor (A0 + temperaturas na fase) — só termodesinfecção. */
function LavRel_lvMontarConformidadePorSensor_(analise, sensoresAtivos, limite) {
  const lista = [];
  const a0 = analise.a0PorSensor || [];
  const st = (analise.stats && analise.stats.sensores) || [];
  for (let s = 0; s < st.length; s++) {
    if (!sensoresAtivos[s]) continue;
    const x = st[s] || {};
    const v = a0[s];
    lista.push({
      sensor: 'S' + (s + 1),
      a0: v === undefined ? null : v,
      statusSensor: v === null || v === undefined ? 'INFORMATIVO' : (v >= limite ? 'CONFORME' : 'NAO_CONFORME'),
      minTemp: x.minExposicao !== undefined ? x.minExposicao : null,
      maxTemp: x.maxExposicao !== undefined ? x.maxExposicao : null,
      mediaTemp: x.mediaExposicao !== undefined ? x.mediaExposicao : null
    });
  }
  return lista;
}

/** Status único do documento: APROVADO, REPROVADO ou INFORMATIVO. */
function LavRel_lvNormalizarStatus_(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'REPROVADO') return 'REPROVADO';
  if (s.indexOf('APROVADO') === 0) return 'APROVADO';
  return 'INFORMATIVO';
}

function LavRel_lvSituacaoCriterio_(situacao) {
  if (situacao === 'CONFORME') return true;
  if (situacao === 'NAO_CONFORME') return false;
  return null;
}

/** Travas do registrador (rastreabilidade): sem identificação, fora do cadastro ou vencido, não emite. */
function LavRel_lvTravasRegistrador_(registradores, simulado) {
  const cfgQ = (LavRel_UCFG && LavRel_UCFG.QUALIDADE_DADOS) || {};
  if (simulado || cfgQ.exigirRegistradorValido === false) return [];
  const travas = [];
  const itens = (registradores && registradores.itens) || [];
  if (!itens.length) {
    travas.push({ codigo: 'REGISTRADOR_NAO_INFORMADO', oQue: 'O registrador de dados (datalogger) usado no ensaio não foi informado.',
      porQue: 'Sem ele não há como demonstrar a rastreabilidade metrológica das temperaturas.',
      comoCorrigir: 'Preencha o campo "Identificação do registrador" na seção do relatório com a identificação cadastrada em Padrões de referência (ex.: DTL-01).' });
  }
  itens.forEach(function(it) {
    if (!it.encontrado) {
      travas.push({ codigo: 'REGISTRADOR_NAO_CADASTRADO', oQue: 'O registrador "' + it.tag + '" não está no cadastro de padrões.',
        porQue: 'Sem o cadastro não é possível conferir o certificado de calibração e a validade.',
        comoCorrigir: 'Cadastre o registrador em Cadastros › Padrões de referência (com o certificado e a validade) ou corrija a identificação digitada.' });
    } else if (it.conforme === false) {
      travas.push({ codigo: 'REGISTRADOR_VENCIDO', oQue: 'O certificado de calibração do registrador ' + it.tag + ' (' + (it.certificado || 'sem número') + ') estava vencido na data do ensaio (validade ' + it.validade + ').',
        porQue: 'Medição feita com instrumento fora da validade de calibração não tem rastreabilidade.',
        comoCorrigir: 'Se o certificado foi renovado antes do ensaio, atualize a validade em Padrões de referência; se não, o ensaio precisa ser repetido com registrador calibrado.' });
    } else if (it.conforme === null) {
      travas.push({ codigo: 'REGISTRADOR_SEM_VALIDADE', oQue: 'O registrador ' + it.tag + ' está cadastrado sem a validade do certificado de calibração.',
        porQue: 'Sem a validade não dá para confirmar que a calibração cobria a data do ensaio.',
        comoCorrigir: 'Informe a validade do certificado em Cadastros › Padrões de referência.' });
    }
  });
  return travas;
}

/** Incerteza do A0 do pior sensor pela incerteza do registrador (maior U95 entre os registradores cadastrados). */
function LavRel_lvIncertezaA0_(registradores, minA0, z) {
  const us = ((registradores && registradores.itens) || []).map(function(i) { return i.incertezaU95; })
    .filter(function(u) { return typeof u === 'number' && isFinite(u) && u > 0 && u < 5; });
  if (!us.length || !isFinite(minA0) || minA0 <= 0) return null;
  const uT = Math.max.apply(null, us);
  const u = SGO_QT_incertezaLetalidade_(minA0, uT, z);
  return u === null ? null : { uTemperatura: uT, uA0: LavRel_roundAnalise_(u, 2), relativo: LavRel_roundAnalise_(u / minA0 * 100, 1) };
}

/**
 * Pacote de fatos único: alimenta a IA, a verificação dos textos e as partes fixas do documento.
 * interno (opcional): recebe { resultado } (gráficos, anexo do A0) — fica fora do contexto assinado.
 */
function LavRel_lvMontarContextoCertificado_(payload, interno) {
  const resultado = LavRel_lvExecutarAnaliseCompleta_(payload);
  if (interno) interno.resultado = resultado;
  payload = resultado.payload;
  const a = resultado.analise;
  const motor = resultado.motor;
  const termo = motor === 'TERMO';
  const cfgC = a.configuracaoCiclo || {};
  const limite = (a.limitesAprovacao || {}).limiteAprovacaoFinal;
  const comPressao = LavRel_analisaPressao_(payload);
  const statusConsolidado = LavRel_lvNormalizarStatus_(a.statusAprovacao);
  const equipamentoLabel = LavRel_lvLabelCiclo_(motor);
  const assinaturaLeituras = LavRel_lvAssinatura_({ dados: resultado.dadosNormalizados || [], sensoresAtivos: resultado.sensoresAtivos || [] });
  let travas = ((a.qualidadeDados || {}).travas || []).slice();

  const fases = ((a.fasesProcesso && a.fasesProcesso.segmentos) || []).map(function(s) {
    return { codigo: s.codigo, nome: s.nome, inicio: LavRel_lvSoHora_(s.inicio), fim: LavRel_lvSoHora_(s.fim), duracaoMin: s.duracaoMin, tMin: s.tMin, tMax: s.tMax, tMedia: s.tMedia, estimada: s.estimada };
  });
  const fatos = {
    tipoCiclo: motor,
    temperaturaProgramada: cfgC.tProgramada,
    tempoInicioExposicao: a.tempoInicioExposicao || '',
    tempoFimExposicao: a.tempoFimExposicao || '',
    tempoExposicaoMinutos: a.tempoExposicaoMinutos,
    tempoTotalMinutos: a.tempoTotalMinutos,
    quantidadeSensoresInstalados: a.quantidadeSensoresInstalados,
    quantidadeSensoresUtilizados: a.quantidadeSensoresUtilizados,
    sensoresDesabilitados: a.sensoresDesabilitados || [],
    patamar: a.patamar ? { duracaoMin: a.patamar.duracaoMin, leituras: a.patamar.leituras, inicio: LavRel_lvSoHora_(a.patamar.inicio), fim: LavRel_lvSoHora_(a.patamar.fim) } : null,
    fases: fases,
    piorSensorTemperatura: a.piorSensorTemperatura || null,
    intervaloLeiturasSegundos: isFinite(a.deltaMinutosEstimado) ? Math.round(a.deltaMinutosEstimado * 60 * 10) / 10 : null,
    limiteAprovacaoFinal: limite
  };
  if (termo) {
    fatos.classeArtigo = cfgC.classeArtigo;
    fatos.tBase = cfgC.tBase;
    fatos.z = cfgC.z;
    fatos.tLimiteA0 = cfgC.tLimiteA0;
    fatos.minA0 = a.minA0;
    fatos.mediaA0 = a.mediaA0;
    fatos.maxA0 = a.maxA0;
    fatos.piorSensorA0 = a.piorSensorA0 || null;
    fatos.janelaA0 = a.janelaA0 ? { inicio: LavRel_lvSoHora_(a.janelaA0.inicio), fim: LavRel_lvSoHora_(a.janelaA0.fim) } : null;
    fatos.conformidadePorSensor = LavRel_lvMontarConformidadePorSensor_(a, resultado.sensoresAtivos, limite);
  } else {
    fatos.tempoCavitacao = a.tempoCavitacao;
    fatos.conformidadePorSensor = LavRel_lvMontarConformidadePorSensor_(a, resultado.sensoresAtivos, 0).map(function(c) { return Object.assign(c, { a0: null, statusSensor: 'INFORMATIVO' }); });
  }
  if (comPressao) fatos.pressaoRegistrada = (a.stats && a.stats.globalPres) || {};

  const criterios = (a.criterios || []).map(function(c) {
    return {
      chave: c.chave, criterio: c.criterio, requisito: c.requisito, referencia: c.referencia,
      obtido: c.situacao === 'NAO_AVALIADO' ? c.motivo : c.obtido,
      conforme: LavRel_lvSituacaoCriterio_(c.situacao), naoAvaliado: c.situacao === 'NAO_AVALIADO', informativo: c.situacao === 'INFORMATIVO', decisivo: !!c.decisivo
    };
  });

  const ncsDecisivas = criterios.filter(function(c) { return c.conforme === false && c.decisivo; });
  let resumo;
  if (statusConsolidado === 'REPROVADO') {
    resumo = ncsDecisivas.length ? 'Não atendido: ' + ncsDecisivas.map(function(c) { return c.criterio.toLowerCase(); }).join('; ') + '.' : 'O ciclo não atende aos critérios de aceitação.';
  } else if (termo) {
    resumo = 'Todos os critérios decisivos foram atendidos. A0 mínimo de ' + SGO_DocA4_val_(a.minA0, 2, 's') + (a.piorSensorA0 ? ' no sensor ' + a.piorSensorA0.sensor : '') + ' para o mínimo de ' + SGO_DocA4_val_(limite, 0, 's') + '.';
  } else {
    resumo = 'Todos os critérios decisivos foram atendidos. Banho mantido por ' + SGO_DocA4_val_(a.tempoCavitacao, 2, 'min') + ' na temperatura programada, para o mínimo de ' + SGO_DocA4_val_(limite, 0, 'min') + '.';
  }

  const estudo = {
    tipoEstudo: motor,
    label: equipamentoLabel,
    tituloSecao: equipamentoLabel,
    statusAprovacao: statusConsolidado,
    fatos: fatos,
    motivosReprovacao: a.motivosReprovacao || [],
    alertasAnalise: a.alertasAnalise || [],
    observacoesAnalise: a.observacoesAnalise || []
  };

  const dataDoEnsaio = LavRel_lvExtrairDataDoTexto_(a.tempoInicioExposicao || a.tempoInicioCiclo || '');
  const dtl = String(payload.certDataLogger || '').trim();
  const registradores = SGO_DocA4_registradores_(dtl, dataDoEnsaio);
  travas = travas.concat(LavRel_lvTravasRegistrador_(registradores, !!payload.modoRelatorioSimulado));
  if (termo) fatos.incertezaA0 = LavRel_lvIncertezaA0_(registradores, a.minA0, cfgC.z);

  const desloc = LavRel_parseFloatSeguro_(payload.offsetTemp, 0);
  const parametros = [
    ['Temperatura programada (receita)', SGO_DocA4_val_(cfgC.tProgramada, 1, '°C')],
    termo ? ['Classificação do artigo', LavRel_lvTextoClasseArtigo_(cfgC.classeArtigo)] : ['Tolerância da temperatura do banho', '± ' + SGO_DocA4_val_(((LavRel_UCFG.CICLOS.ULTRASSOM || {}).criterios || {}).toleranciaBanhoK, 0, '°C')],
    ['Intervalo entre leituras', fatos.intervaloLeiturasSegundos ? SGO_DocA4_val_(fatos.intervaloLeiturasSegundos, 0, 's') : '—'],
    ['Sensores utilizados', (a.quantidadeSensoresUtilizados || 0) + ' de ' + (a.quantidadeSensoresInstalados || 0) + ' instalados' + ((a.sensoresDesabilitados || []).length ? ' (desconsiderados: ' + a.sensoresDesabilitados.join(', ') + ')' : '')],
    ['Correção de temperatura aplicada', desloc ? SGO_DocA4_val_(desloc, 2, '°C') : 'Nenhuma'],
    ['Origem dos dados', String(payload.modoEntrada || '').toUpperCase() === 'ARQUIVO_POR_SENSOR' ? 'Um arquivo por sensor (registradores individuais), alinhados pelo horário' : (payload.modoRelatorioSimulado ? 'Dados reconstituídos (uso interno)' : 'Arquivo único do registrador')]
  ];

  const escopo = [
    'Este relatório refere-se exclusivamente ao ciclo aqui identificado, com os dados do registrador informado; numa campanha de qualificação, cada ciclo tem o seu relatório.',
    termo
      ? 'A avaliação térmica e o A0 não demonstram, isoladamente, a eficácia da limpeza nem a qualidade da água do enxágue final, que dependem de ensaios específicos (por exemplo, ensaio de sujidade e análise da água).'
      : 'O registrador mede a temperatura do banho: a atividade ultrassônica (cavitação) não é medida neste ensaio e é verificada por ensaio específico de cavitação, conforme o protocolo do fabricante do equipamento.',
    'As fases anteriores e posteriores à ' + (termo ? 'desinfecção' : 'fase do banho') + ' são identificadas pelo perfil de temperatura e têm horários estimados; só a fase ' + (termo ? 'de desinfecção' : 'do banho') + ' decide o resultado.',
    comPressao
      ? 'A pressão registrada é apresentada para informação, sem critério de aceitação; a dosagem de produtos químicos e a qualidade da água não foram medidas nesta análise.'
      : 'Este ensaio considerou somente a temperatura; pressão de aspersão, dosagem de produtos químicos e qualidade da água não foram medidas nesta análise.',
    'Critérios configurados pela empresa executante e revisáveis pelo responsável técnico; ' + String(((LavRel_UCFG.EMISSAO || {}).regraDecisao) || '').replace(/^A/, 'a')
  ];

  return {
    tipoCiclo: motor,
    tipoRelatorio: 'CICLO',
    assinaturaLeituras: assinaturaLeituras,
    simulado: !!payload.modoRelatorioSimulado,
    origemDados: payload.modoRelatorioSimulado ? 'SIMULADO — USO INTERNO; NÃO REPRESENTA ENSAIO REAL' : 'DADOS INFORMADOS PARA O ENSAIO',
    normas: LavRel_lvListarNormasAplicaveis_(motor),
    statusConsolidado: statusConsolidado,
    resumoResultado: resumo,
    criterios: criterios,
    parametros: parametros,
    registradores: registradores,
    travas: travas,
    emissaoBloqueada: travas.length > 0 && !payload.modoRelatorioSimulado,
    analisarPressao: comPressao,
    escopo: escopo,
    mesclagem: payload._mesclagem || null,
    equipamentoLabel: equipamentoLabel,
    tag: String(payload.tag || '').trim(),
    cliente: String(payload.cliente || '').trim(),
    setor: String(payload.setor || payload.local || '').trim(),
    identificacao: {
      cliente: String(payload.cliente || '').trim(),
      cnpj: String(payload.cnpj || '').trim(),
      endereco: String(payload.endereco || '').trim(),
      setor: String(payload.setor || payload.local || '').trim(),
      equipamento: equipamentoLabel,
      equipamentoTipo: LavRel_lvTipoEquipamento_(motor),
      tag: String(payload.tag || '').trim(),
      dtl: dtl,
      certificadoNumero: String(payload.certNumero || '').trim(),
      revisao: String(payload.certRevisao || '0').trim() || '0',
      dataDoEnsaio: dataDoEnsaio,
      tecnicoExecutor: String(payload.respTecnico || payload.responsavelTecnico || payload.operador || '').trim(),
      marca: String(payload.marca || '').trim(),
      modelo: String(payload.modelo || '').trim(),
      numeroSerie: String(payload.numSerie || '').trim(),
      programa: String(payload.programa || '').trim(),
      tipoEnsaio: String(payload.ensaio || '').trim(),
      cicloNumero: String(payload.cicloNum || '').trim(),
      lote: String(payload.lote || '').trim(),
      responsavelAceite: String(payload.certResponsavelAceite || '').trim(),
      tarefaOrigem: String(payload.certTarefaOrigem || '').trim(),
      empresaExecutante: LavRel_UCFG.EMPRESA_EXECUTANTE
    },
    estudos: [estudo]
  };
}

function LavRel_lvSoHora_(tempoStr) {
  const s = String(tempoStr || '').trim();
  const m = s.match(/(\d{1,2}:\d{2}(:\d{2})?)\s*$/);
  return m ? m[1] : (s || '—');
}

function LavRel_lvTextoTipoEnsaio_(v) {
  const mapa = {
    'QD (Carga)': 'Qualificação de desempenho (com carga)',
    'QO (Vazio)': 'Qualificação operacional (câmara vazia)',
    'Validação Limpeza': 'Validação de limpeza',
    'Teste Cavitacao': 'Teste de cavitação',
    'Monitoramento de Rotina': 'Monitoramento de rotina'
  };
  const s = String(v || '').trim();
  return mapa[s] || s || '—';
}

function LavRel_lvExtrairDataDoTexto_(texto) {
  const s = String(texto || '').trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[1].padStart(2, '0') + '/' + m[2].padStart(2, '0') + '/' + m[3];
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[3] + '/' + m[2] + '/' + m[1];
  return '';
}

function LavRel_lvLabelStatus_(status) {
  return LavRel_lvNormalizarStatus_(status);
}

// ------------------------------------------------------------
// CONFERÊNCIA DOS TEXTOS (IA ou técnico) — SGO_QualifIA_Verificador.js
// ------------------------------------------------------------
var LAVREL_TERMOS_PRESSAO = [/press[aã]o|press[oõ]es|\bkpa\b|\bm?bar\b/i];

function LavRel_lvRegrasTexto_(ctx, exigirVeredito, verificarNumeros) {
  return {
    numeros: SGO_QIAV_numerosDe_([ctx.criterios, ctx.parametros, ctx.estudos.map(function(e) { return [e.fatos, e.motivosReprovacao, e.alertasAnalise, e.observacoesAnalise]; }), ctx.registradores, ctx.normas, ctx.escopo]),
    normas: ctx.normas,
    veredito: ctx.statusConsolidado,
    exigirVeredito: !!exigirVeredito,
    verificarNumeros: verificarNumeros !== false,
    termosProibidos: ctx.analisarPressao ? [] : LAVREL_TERMOS_PRESSAO
  };
}

/** Confere os três blocos. verificarNumeros=false para texto escrito pelo técnico (só veredito, normas e termos). */
function LavRel_lvConferirTextos_(ctx, textos, verificarNumeros) {
  const blocos = {
    'Conclusão técnica': { texto: textos.conclusaoGeral, regras: LavRel_lvRegrasTexto_(ctx, true, verificarNumeros) },
    'Conclusão em linguagem simples': { texto: textos.conclusaoLeigo, regras: LavRel_lvRegrasTexto_(ctx, false, verificarNumeros) }
  };
  ctx.estudos.forEach(function(e) {
    blocos['Análise técnica'] = { texto: (textos.analisePorEstudo || {})[e.tipoEstudo], regras: LavRel_lvRegrasTexto_(ctx, false, verificarNumeros) };
  });
  return SGO_QIAV_verificarBlocos_(blocos);
}

/** Texto padrão determinístico (sem IA), montado só com os resultados do motor. */
function LavRel_lvTextosPadrao_(ctx) {
  const e = ctx.estudos[0];
  const f = e.fatos || {};
  const termo = ctx.tipoCiclo === 'TERMO';
  const st = ctx.statusConsolidado;
  const crit = ctx.criterios || [];
  const decisivos = crit.filter(function(c) { return c.decisivo && c.conforme !== null; });
  const ncDec = crit.filter(function(c) { return c.decisivo && c.conforme === false; });
  const foraRef = crit.filter(function(c) { return !c.decisivo && c.conforme === false; });
  const naoAv = crit.filter(function(c) { return c.naoAvaliado; });
  const V = SGO_DocA4_val_;
  const p = [];
  if (f.tempoInicioExposicao) {
    p.push('A ' + (termo ? 'fase de desinfecção' : 'fase do banho') + ' foi identificada de ' + LavRel_lvSoHora_(f.tempoInicioExposicao) + ' a ' + LavRel_lvSoHora_(f.tempoFimExposicao) + ', com ' + V(f.tempoExposicaoMinutos, 2, 'min') +
      ' de duração, considerando ' + f.quantidadeSensoresUtilizados + ' sensores ativos e a temperatura programada de ' + V(f.temperaturaProgramada, 1, '°C') + '.' +
      (f.patamar ? ' O patamar com todos os sensores ' + (termo ? 'na temperatura programada' : 'dentro da tolerância') + ' durou ' + V(f.patamar.duracaoMin, 2, 'min') + '.' : ''));
  } else {
    p.push('A ' + (termo ? 'fase de desinfecção' : 'fase do banho') + ' não foi identificada nos dados: os sensores ativos não atingiram e mantiveram a temperatura programada de ' + V(f.temperaturaProgramada, 1, '°C') + '.');
  }
  if (termo && f.tempoInicioExposicao && f.conformidadePorSensor && f.conformidadePorSensor.length) {
    p.push('O A0 acumulado variou de ' + V(f.minA0, 2, 's') + ' a ' + V(f.maxA0, 2, 's') + ', com média de ' + V(f.mediaA0, 2, 's') + '. O menor valor ocorreu no sensor ' + (f.piorSensorA0 ? f.piorSensorA0.sensor : '—') +
      ', comparado ao mínimo de ' + V(f.limiteAprovacaoFinal, 0, 's') + ' para artigo ' + LavRel_lvTextoClasseArtigo_(f.classeArtigo).toLowerCase() + '.' +
      (f.incertezaA0 ? ' A incerteza expandida estimada desse valor, propagada da incerteza do registrador, é de ' + V(f.incertezaA0.uA0, 2, 's') + '.' : ''));
  }
  const fasesEst = (f.fases || []).filter(function(x) { return x.estimada && x.codigo !== 'PREPARO_INCOMPLETO'; });
  if (fasesEst.length) {
    p.push('Pelo perfil de temperatura, as demais etapas do ciclo foram estimadas assim: ' + fasesEst.map(function(x) { return x.nome.toLowerCase() + ' de ' + x.inicio + ' a ' + x.fim + ' (máxima de ' + V(x.tMax, 1, '°C') + ')'; }).join('; ') + '.');
  }
  if (ncDec.length) p.push('Não foram atendidos: ' + ncDec.map(function(c) { return c.criterio.toLowerCase() + ' (obtido ' + c.obtido + '; requisito ' + c.requisito + ')'; }).join('; ') + '.');
  else if (decisivos.length) p.push((decisivos.length === 1 ? 'O critério decisivo foi atendido' : 'Os ' + decisivos.length + ' critérios decisivos foram atendidos') + '; os valores obtidos estão na tabela de verificação dos critérios.');
  if (foraRef.length) p.push('Ficaram fora do valor de referência, sem efeito no resultado: ' + foraRef.map(function(c) { return c.criterio.toLowerCase() + ' (obtido ' + c.obtido + '; referência ' + c.requisito + ')'; }).join('; ') + '. Recomenda-se avaliar a causa.');
  naoAv.forEach(function(c) { p.push(c.criterio + ': ' + String(c.obtido || '').replace(/^Não avaliado:\s*/, 'não avaliado, porque ')); });
  const analise = p.join('\n\n');
  const conclusao = [
    (decisivos.length === 1 ? 'Foi avaliado 1 critério decisivo' : 'Foram avaliados ' + decisivos.length + ' critérios decisivos') + '. ' +
      (ncDec.length ? 'Não foram atendidos: ' + ncDec.map(function(c) { return c.criterio.toLowerCase(); }).join('; ') + '.' : (decisivos.length === 1 ? 'O critério foi atendido.' : 'Todos foram atendidos.')),
    st === 'APROVADO' ? 'O ensaio está APROVADO.' : (st === 'REPROVADO' ? 'O ensaio está REPROVADO.' : 'O ensaio tem caráter informativo, sem critério de aprovação aplicável.')
  ].join('\n\n');
  const leigo = termo
    ? (st === 'APROVADO'
      ? 'Neste ciclo, a água quente da lavadora atingiu e manteve a temperatura e o tempo necessários para desinfetar os materiais em todos os pontos medidos. O resultado deste ensaio é aprovado.'
      : 'Neste ciclo, a lavadora não atingiu ou não manteve a temperatura e o tempo necessários para desinfetar os materiais em algum ponto medido, conforme indicado nos critérios. O resultado deste ensaio é reprovado; o equipamento deve ser avaliado e o ensaio repetido antes da liberação para uso.')
    : (st === 'APROVADO'
      ? 'Neste ciclo, o banho da lavadora ultrassônica ficou na temperatura escolhida pelo tempo previsto em todos os pontos medidos. O resultado deste ensaio é aprovado.'
      : 'Neste ciclo, o banho da lavadora ultrassônica não ficou na temperatura escolhida pelo tempo previsto em algum ponto medido, conforme indicado nos critérios. O resultado deste ensaio é reprovado; o equipamento deve ser avaliado e o ensaio repetido antes da liberação para uso.');
  const out = { analisePorEstudo: {}, conclusaoGeral: conclusao, conclusaoLeigo: leigo };
  out.analisePorEstudo[e.tipoEstudo] = analise;
  return out;
}

// ------------------------------------------------------------
// API — ETAPA 1: RASCUNHO
// ------------------------------------------------------------
function LavRel_apiGerarRascunhoCertificado(payload, sessao) {
  payload = payload || {};
  const contexto = LavRel_lvMontarContextoCertificado_(payload);
  const podeAprovar = LavRel_lvEhAprovador_(sessao);
  const base = { ok: true, contexto: contexto, assinaturaContexto: LavRel_lvAssinatura_(contexto), podeAprovar: podeAprovar, travas: contexto.emissaoBloqueada ? contexto.travas : [] };
  if (contexto.emissaoBloqueada) {
    return Object.assign(base, {
      bloqueado: true,
      textos: { conclusaoGeral: '', conclusaoLeigo: '', analisePorEstudo: {} },
      avisoIA: 'O documento não pode ser emitido enquanto os problemas dos dados listados abaixo não forem corrigidos. Nada foi redigido.'
    });
  }
  let textos, avisoIA = '', origemTexto = 'IA';
  try {
    textos = LavRel_lvIACriarTextosCertificado_(contexto);
    const conf = LavRel_lvConferirTextos_(contexto, textos, true);
    if (!conf.ok) {
      textos = LavRel_lvTextosPadrao_(contexto);
      origemTexto = 'PADRAO';
      avisoIA = 'O texto redigido automaticamente não passou na conferência (' + conf.problemas.slice(0, 4).join('; ') + '). Foi usado o texto padrão, montado só com os resultados calculados; revise e complete se quiser.';
    }
  } catch (e) {
    textos = LavRel_lvTextosPadrao_(contexto);
    origemTexto = 'PADRAO';
    avisoIA = 'A redação automática não está disponível (' + String(e && e.message ? e.message : e).replace(/[.\s]+$/, '') + '). Foi usado o texto padrão, montado só com os resultados calculados; revise e complete se quiser.';
  }
  return Object.assign(base, { bloqueado: false, textos: textos, avisoIA: avisoIA, origemTexto: origemTexto });
}

function LavRel_lvEhAprovador_(sessao) {
  return SGO_QE_ehAprovador_(sessao, ((LavRel_UCFG.EMISSAO || {}).perfisAprovadores) || ['ADMIN']);
}

/** Validações comuns antes de emitir ou enviar para aprovação. Devolve { contexto, textos, interno }. */
function LavRel_lvValidarParaEmissao_(payload) {
  const interno = {};
  const contexto = LavRel_lvMontarContextoCertificado_(payload, interno);
  if (!payload.assinaturaContextoCertificado || payload.assinaturaContextoCertificado !== LavRel_lvAssinatura_(contexto)) {
    throw new Error('Os dados ou critérios mudaram desde o rascunho, ou o rascunho não foi gerado. Clique em "Gerar rascunho da interpretação" de novo, revise os textos e emita.');
  }
  if (contexto.emissaoBloqueada) LavRel_exigirSemTravas_(contexto.travas);
  const t = payload.textosCertificado || {};
  const textos = { conclusaoGeral: String(t.conclusaoGeral || '').trim(), conclusaoLeigo: String(t.conclusaoLeigo || '').trim(), analisePorEstudo: t.analisePorEstudo || {} };
  if (!textos.conclusaoGeral || !textos.conclusaoLeigo || contexto.estudos.some(function(e) { return !String(textos.analisePorEstudo[e.tipoEstudo] || '').trim(); })) {
    throw new Error('A interpretação está incompleta. Preencha a análise e as duas conclusões antes de emitir (ou gere o rascunho de novo para receber o texto padrão).');
  }
  const conf = LavRel_lvConferirTextos_(contexto, textos, false);
  if (!conf.ok) {
    throw new Error('Os textos revisados não podem ser emitidos: ' + conf.problemas.join('; ') + '. Corrija o texto (o resultado é o calculado pelo sistema) e emita de novo.');
  }
  return { contexto: contexto, textos: textos, interno: interno };
}

/** Monta o HTML do documento (aprovacao: { nome, perfil, em } ou null para prévia). */
function LavRel_lvMontarHtml_(contexto, interno, textos, fotos, aprovacao, minuta) {
  const template = HtmlService.createTemplateFromFile('LavadoraCertificado');
  template.ctx = contexto;
  template.textos = { conclusaoGeral: textos.conclusaoGeral, conclusaoLeigo: textos.conclusaoLeigo, analisePorEstudo: textos.analisePorEstudo || {} };
  template.fotos = (fotos || []).filter(function(f) { return f && f.base64; }).slice(0, 4);
  template.geradoEm = Utilities.formatDate(new Date(), LavRel_UCFG.TZ, 'dd/MM/yyyy');
  template.graficos = LavRel_lvMontarGraficos_(contexto, interno.resultado || {});
  template.memoriaA0 = LavRel_lvMontarMemoriaA0_(contexto, interno.resultado || {});
  template.assinaturas = LavRel_lvListaAssinaturas_(contexto, aprovacao);
  template.aprovacao = aprovacao || null;
  template.minuta = !!minuta;
  return template.evaluate().getContent();
}

function LavRel_lvPastaLaudos_() {
  return SGO_DocSalvar_pastaPersistente_('LAVREL_LAUDOS_FOLDER_ID', 'Lavadora - Laudos', LavRel_UCFG.LAUDOS_FOLDER_ID);
}

/** Emite (aprovação registrada), salva HTML + PDF na pasta do equipamento e grava a revisão. */
function LavRel_lvEmitir_(payload, validado, sessao, idPendente) {
  const contexto = validado.contexto;
  const numero = contexto.identificacao.certificadoNumero;
  const simulado = !!payload.modoRelatorioSimulado;
  const revisao = simulado ? (parseInt(contexto.identificacao.revisao, 10) || 0) : SGO_QE_proximaRevisao_(LAVREL_MODULO_EMISSAO, numero, contexto.identificacao.revisao);
  contexto.identificacao.revisao = String(revisao);
  const aprovacao = { nome: SGO_QE_nomeSessao_(sessao), login: String((sessao && sessao.usuario) || ''), perfil: String((sessao && sessao.perfil) || ''), em: SGO_QE_agora_() };
  const html = LavRel_lvMontarHtml_(contexto, validado.interno, validado.textos, payload.fotosCertificado || [], aprovacao, false);
  const payloadSalvar = Object.assign({}, payload, { certRevisao: String(revisao) });
  const rotulo = contexto.tipoCiclo === 'ULTRASSOM' ? 'Relatório de ensaio Lavadora ultrassônica' : 'Relatório de ensaio Termodesinfectora';
  const r = SGO_DocSalvar_finalizarCertificado_(html, payloadSalvar, LavRel_lvPastaLaudos_, rotulo + (revisao ? ' rev ' + revisao : ''), LavRel_UCFG.TZ);
  if (!simulado) {
    const campos = {
      STATUS: 'EMITIDO', REVISAO: String(revisao), APROVADO_POR: aprovacao.nome, APROVADO_LOGIN: aprovacao.login, APROVADO_PERFIL: aprovacao.perfil,
      APROVADO_EM: aprovacao.em, PDF_ID: r.pdfId || '', HTML_ID: r.htmlId || '', RESULTADO: contexto.statusConsolidado
    };
    // Resumo dos resultados guardado na emissão, para o relatório de qualificação (SGO_LavRel_ModeloOficialNovo.js).
    if (typeof LavOficial_resumoCiclo_ === 'function') { try { campos.RESUMO_JSON = JSON.stringify(LavOficial_resumoCiclo_(contexto)); } catch (eResumo) { /* recalculado quando for consolidado */ } }
    let id = idPendente;
    if (id) SGO_QE_atualizar_(id, campos);
    else id = SGO_QE_registrar_(Object.assign(LavRel_lvCamposRegistro_(contexto, payload, sessao), campos));
    SGO_QE_marcarSubstituidas_(LAVREL_MODULO_EMISSAO, numero, id);
    r.emissaoId = id;
  }
  r.revisao = revisao;
  r.aprovadoPor = aprovacao.nome;
  return r;
}

function LavRel_lvCamposRegistro_(contexto, payload, sessao) {
  return {
    MODULO: LAVREL_MODULO_EMISSAO, NUMERO: contexto.identificacao.certificadoNumero, REVISAO: contexto.identificacao.revisao,
    CLIENTE: contexto.identificacao.cliente, CNPJ: contexto.identificacao.cnpj, TAG: contexto.identificacao.tag, RESULTADO: contexto.statusConsolidado,
    HASH_CONTEXTO: LavRel_lvAssinatura_(contexto), ENVIADO_POR: SGO_QE_nomeSessao_(sessao), ENVIADO_EM: SGO_QE_agora_(),
    JUSTIFICATIVA_ESCOPO: contexto.analisarPressao ? 'pressão registrada como informação' : '',
    CLIENTE_ID: String((payload && payload.clienteId) || ''), UNIDADE_ID: String((payload && payload.unidadeId) || ''), EQUIPAMENTO_ID: String((payload && payload.equipamentoId) || '')
  };
}

// ------------------------------------------------------------
// API — ETAPA 2: EMISSÃO PELO APROVADOR
// ------------------------------------------------------------
function LavRel_apiMontarCertificadoFinal(payload, sessao) {
  payload = payload || {};
  if (!payload.modoRelatorioSimulado && !LavRel_lvEhAprovador_(sessao)) {
    throw new Error('A emissão precisa da aprovação do responsável técnico. Use "Enviar para aprovação": o responsável técnico confere a prévia e emite. Perfis que aprovam: ' + ((LavRel_UCFG.EMISSAO || {}).perfisAprovadores || []).join(', ') + '.');
  }
  if (!payload.modoRelatorioSimulado && payload.confirmacaoRevisao !== true) {
    throw new Error('Marque "Conferi os dados, os critérios e os textos e aprovo a emissão" antes de emitir.');
  }
  const validado = LavRel_lvValidarParaEmissao_(payload);
  return LavRel_lvEmitir_(payload, validado, sessao, '');
}

// ------------------------------------------------------------
// API — APROVAÇÃO EM DUAS PESSOAS
// ------------------------------------------------------------
function LavRel_apiEnviarParaAprovacao(payload, sessao) {
  payload = payload || {};
  if (payload.modoRelatorioSimulado) throw new Error('O relatório interno (dados reconstituídos) não passa por aprovação: ele não é entregue ao cliente.');
  const validado = LavRel_lvValidarParaEmissao_(payload);
  const fotos = (Array.isArray(payload.fotosCertificado) ? payload.fotosCertificado : []).slice(0, 4).map(function(f, i) {
    if (!f || !f.base64) return null;
    const blob = Utilities.newBlob(Utilities.base64Decode(f.base64), f.mimeType || 'image/jpeg', 'Foto ' + (i + 1) + ' - ' + (validado.contexto.identificacao.certificadoNumero || 'sem número') + '.jpg');
    const arq = LavRel_pastaUploads_('').createFile(blob);
    return { fileId: arq.getId(), mimeType: f.mimeType || 'image/jpeg', legenda: f.legenda || '' };
  }).filter(Boolean);
  const guardado = Object.assign({}, payload, { fotosCertificado: [], fotosArquivos: fotos });
  const id = SGO_QE_registrar_(Object.assign(LavRel_lvCamposRegistro_(validado.contexto, payload, sessao), {
    STATUS: 'AGUARDANDO_APROVACAO', PAYLOAD_JSON: JSON.stringify(guardado)
  }));
  return { ok: true, id: id, mensagem: 'Enviado para aprovação do responsável técnico (registro ' + id + '). Ele confere a prévia em "Aguardando aprovação" e emite, ou devolve com o motivo.' };
}

function LavRel_lvExigirAprovador_(sessao) {
  if (!LavRel_lvEhAprovador_(sessao)) throw new Error('Somente o responsável técnico (perfis ' + ((LavRel_UCFG.EMISSAO || {}).perfisAprovadores || []).join(', ') + ') confere e aprova documentos.');
}

function LavRel_apiListarAprovacoes(payload, sessao) {
  const aprovador = LavRel_lvEhAprovador_(sessao);
  const nome = SGO_QE_nomeSessao_(sessao);
  const lista = SGO_QE_listar_(LAVREL_MODULO_EMISSAO).concat(SGO_QE_listar_(LAVREL_MODULO_EMISSAO_DADOS)).filter(function(r) {
    return r.STATUS === 'AGUARDANDO_APROVACAO' || (r.STATUS === 'DEVOLVIDO' && r.ENVIADO_POR === nome);
  }).filter(function(r) { return aprovador || r.ENVIADO_POR === nome; });
  return { ok: true, podeAprovar: aprovador, itens: lista.map(function(r) {
    return { id: r.ID, documento: r.MODULO === LAVREL_MODULO_EMISSAO_DADOS ? 'Planilha de dados' : 'Relatório de ensaio', status: r.STATUS, numero: r.NUMERO, cliente: r.CLIENTE, tag: r.TAG, resultado: r.RESULTADO, enviadoPor: r.ENVIADO_POR, enviadoEm: r.ENVIADO_EM, motivoDevolucao: r.DEVOLVIDO_MOTIVO };
  }) };
}

function LavRel_lvCarregarPendente_(id) {
  const reg = SGO_QE_obter_(id);
  if (!reg || (reg.MODULO !== LAVREL_MODULO_EMISSAO && reg.MODULO !== LAVREL_MODULO_EMISSAO_DADOS)) throw new Error('Registro de aprovação não encontrado. Atualize a lista.');
  if (reg.STATUS !== 'AGUARDANDO_APROVACAO') throw new Error('Este registro não está aguardando aprovação (situação: ' + reg.STATUS + ').');
  const payload = JSON.parse(reg.PAYLOAD_JSON || '{}');
  payload.fotosCertificado = (payload.fotosArquivos || []).map(function(f) {
    try { return { base64: Utilities.base64Encode(DriveApp.getFileById(f.fileId).getBlob().getBytes()), mimeType: f.mimeType, legenda: f.legenda }; } catch (e) { return null; }
  }).filter(Boolean);
  return { reg: reg, payload: payload };
}

function LavRel_apiPreverAprovacao(payload, sessao) {
  LavRel_lvExigirAprovador_(sessao);
  const p = LavRel_lvCarregarPendente_(payload && payload.id);
  if (p.reg.MODULO === LAVREL_MODULO_EMISSAO_DADOS) return LavRel_pdPreverPendente_(p.reg, p.payload);
  const validado = LavRel_lvValidarParaEmissao_(p.payload);
  if (LavRel_lvAssinatura_(validado.contexto) !== p.reg.HASH_CONTEXTO) throw new Error('Os dados mudaram desde o envio para aprovação (por exemplo, o cadastro do registrador). Devolva ao técnico para gerar o rascunho de novo.');
  return { ok: true, html: LavRel_lvMontarHtml_(validado.contexto, validado.interno, validado.textos, p.payload.fotosCertificado, null, true) };
}

function LavRel_apiAprovarEmitir(payload, sessao) {
  LavRel_lvExigirAprovador_(sessao);
  payload = payload || {};
  if (payload.confirmacaoRevisao !== true) throw new Error('Marque "Conferi os dados, os critérios e os textos e aprovo a emissão" antes de aprovar.');
  const p = LavRel_lvCarregarPendente_(payload.id);
  if (p.reg.MODULO === LAVREL_MODULO_EMISSAO_DADOS) return LavRel_pdAprovarPendente_(p.reg, p.payload, sessao);
  const validado = LavRel_lvValidarParaEmissao_(p.payload);
  if (LavRel_lvAssinatura_(validado.contexto) !== p.reg.HASH_CONTEXTO) throw new Error('Os dados mudaram desde o envio para aprovação. Devolva ao técnico para gerar o rascunho de novo.');
  return LavRel_lvEmitir_(p.payload, validado, sessao, p.reg.ID);
}

function LavRel_apiDevolverAprovacao(payload, sessao) {
  LavRel_lvExigirAprovador_(sessao);
  const motivo = String((payload && payload.motivo) || '').trim();
  if (motivo.length < 10) throw new Error('Escreva o motivo da devolução (ao menos 10 caracteres) para o técnico saber o que corrigir.');
  const reg = SGO_QE_obter_(payload.id);
  if (!reg || reg.STATUS !== 'AGUARDANDO_APROVACAO' || (reg.MODULO !== LAVREL_MODULO_EMISSAO && reg.MODULO !== LAVREL_MODULO_EMISSAO_DADOS)) throw new Error('Este registro não está aguardando aprovação.');
  SGO_QE_atualizar_(reg.ID, { STATUS: 'DEVOLVIDO', DEVOLVIDO_MOTIVO: motivo, APROVADO_POR: SGO_QE_nomeSessao_(sessao), APROVADO_EM: SGO_QE_agora_() });
  return { ok: true, mensagem: 'Devolvido ao técnico com o motivo registrado.' };
}

/** Técnico executor e responsáveis técnicos da configuração. */
function LavRel_lvListaAssinaturas_(ctx, aprovacao) {
  const lista = [];
  const tecnico = (ctx.identificacao || {}).tecnicoExecutor;
  if (tecnico) lista.push({ papel: 'Executado por', nome: tecnico, cargo: 'Técnico executor do ensaio', registro: '' });
  (LavRel_UCFG.ASSINATURAS_PADRAO || []).forEach(function(a) { lista.push(Object.assign({ papel: 'Responsável técnico' }, a)); });
  return lista;
}

var LAVREL_COR_FASE = {
  PRE_LAVAGEM: '#eaf3fb', LAVAGEM_AQUECIMENTO: '#e3effa', LAVAGEM_AQUECIMENTO_ULTRA: '#e3effa', ENXAGUE_INTERMEDIARIO: '#fbf6dc',
  AQUECIMENTO_DESINFECCAO: '#fdf0e3', AQUECIMENTO_BANHO: '#fdf0e3', DESINFECCAO_TERMICA: '#e6f4ea', CAVITACAO_ULTRASSOM: '#e6f4ea',
  SECAGEM_RESFRIAMENTO: '#f3eefa', DRENAGEM_FINAL: '#f3eefa'
};
var LAVREL_FASE_CURTA = {
  PRE_LAVAGEM: 'Pré', LAVAGEM_AQUECIMENTO: 'Lavagem', ENXAGUE_INTERMEDIARIO: 'Enxágue', AQUECIMENTO_DESINFECCAO: 'Aquec.', AQUECIMENTO_BANHO: 'Aquec.',
  DESINFECCAO_TERMICA: 'Desinfecção', CAVITACAO_ULTRASSOM: 'Banho', SECAGEM_RESFRIAMENTO: 'Secagem', DRENAGEM_FINAL: 'Final'
};

/**
 * Gráficos (SVG): temperatura por sensor com as fases, detalhe da fase principal com a faixa,
 * A0 acumulado por sensor e A0 final por sensor (termodesinfecção), pressão (quando analisada).
 */
function LavRel_lvMontarGraficos_(ctx, resultado) {
  const figuras = [];
  try {
    const dados = resultado.dadosNormalizados || [];
    if (!dados.length) return figuras;
    const a = resultado.analise || {};
    const f = ctx.estudos[0].fatos || {};
    const termo = ctx.tipoCiclo === 'TERMO';
    const tz = LavRel_UCFG.TZ || 'America/Sao_Paulo';
    const ini = isFinite(a.indiceInicioCiclo) && a.indiceInicioCiclo >= 0 ? a.indiceInicioCiclo : 0;
    const fim = isFinite(a.indiceFimCiclo) && a.indiceFimCiclo >= ini ? a.indiceFimCiclo : dados.length - 1;
    const fatia = dados.slice(ini, fim + 1);
    const desloc = LavRel_parseFloatSeguro_((resultado.payload || {}).offsetTemp, 0);
    const series = SGO_DocA4_seriesTemperatura_(fatia, { sensoresAtivos: resultado.sensoresAtivos, deslocamento: desloc, tz: tz, dtMin: a.deltaMinutosEstimado });
    const faixas = ((a.fasesProcesso && a.fasesProcesso.segmentos) || []).map(function(sg) {
      return { x0: series.xDe(dados[sg.inicioIndice], sg.inicioIndice - ini), x1: series.xDe(dados[sg.fimIndice], sg.fimIndice - ini), rotulo: LAVREL_FASE_CURTA[sg.codigo] || '', cor: LAVREL_COR_FASE[sg.codigo] || '#f2f4f7' };
    });
    const refs = [{ y: f.temperaturaProgramada, rotulo: 'Programada ' + SGO_DocA4_val_(f.temperaturaProgramada, 1, '°C'), cor: '#1f5fa8' }];
    if (termo && isFinite(f.tLimiteA0)) refs.push({ y: f.tLimiteA0, rotulo: 'Início da soma do A0 (' + SGO_DocA4_val_(f.tLimiteA0, 0, '°C') + ')', cor: '#a61b1b', lado: 'esq' });
    const opt = { series: series.series, formatarX: series.formatarX, rotuloX: 'Horário', rotuloY: 'Temperatura (°C)', faixasX: faixas, referencias: refs };
    const svg = SGO_DocA4_graficoLinhas_(opt);
    if (svg) figuras.push({ svg: svg, legenda: 'Temperatura registrada por sensor ativo ao longo do ciclo, com as fases identificadas pelo perfil de temperatura (a fase ' + (termo ? 'de desinfecção' : 'do banho') + ' decide o resultado; as demais são estimadas).' + SGO_DocA4_notaCorte_(opt, '°C') });

    // Detalhe da fase principal com a faixa de referência.
    if (a.faseInicioExp >= 0 && a.faseFimExp >= a.faseInicioExp) {
      const tProg = f.temperaturaProgramada;
      const crit = ((LavRel_UCFG.CICLOS[ctx.tipoCiclo] || {}).criterios) || {};
      const y0 = termo ? tProg : tProg - Number(crit.toleranciaBanhoK || 0);
      const y1 = termo ? (isFinite(Number(crit.faixaAcimaK)) && crit.faixaAcimaK !== null ? tProg + Number(crit.faixaAcimaK) : null) : tProg + Number(crit.toleranciaBanhoK || 0);
      const i0 = Math.max(0, (a.janelaA0 ? a.janelaA0.inicioIdx : a.faseInicioExp) - 3), i1 = Math.min(dados.length - 1, a.faseFimExp + 3);
      const fp = dados.slice(i0, i1 + 1);
      const sp = SGO_DocA4_seriesTemperatura_(fp, { sensoresAtivos: resultado.sensoresAtivos, deslocamento: desloc, tz: tz, dtMin: a.deltaMinutosEstimado });
      const refsP = [{ y: y0, rotulo: (termo ? 'Programada ' : 'Mínima ') + SGO_DocA4_val_(y0, 1, '°C') }];
      if (y1 !== null && isFinite(y1)) refsP.push({ y: y1, rotulo: (termo ? 'Referência superior ' : 'Máxima ') + SGO_DocA4_val_(y1, 1, '°C') });
      const svgP = SGO_DocA4_graficoLinhas_({
        series: sp.series, formatarX: function(x) { try { return Utilities.formatDate(new Date(sp.t0Ms + x * 60000), tz, 'HH:mm:ss'); } catch (e) { return SGO_DocA4_num_(x, 1); } },
        rotuloX: 'Horário', rotuloY: 'Temperatura (°C)', faixaY: (y1 !== null && isFinite(y1)) ? { y0: y0, y1: y1 } : null, referencias: refsP, altura: 260
      });
      if (svgP) figuras.push({ svg: svgP, legenda: 'Detalhe da fase ' + (termo ? 'de desinfecção (com o aquecimento a partir de ' + SGO_DocA4_val_(f.tLimiteA0, 0, '°C') + ')' : 'do banho') + ' por sensor' + (y1 !== null && isFinite(y1) ? ', com a faixa de referência (área verde, de ' + SGO_DocA4_val_(y0, 1, '°C') + ' a ' + SGO_DocA4_val_(y1, 1, '°C') + ').' : '.') });
    }

    if (termo && Array.isArray(a.memoriaA0PorSensor) && a.janelaA0) {
      const t0 = LavRel_converterTempoLinhaParaMsAnalise_(dados[a.janelaA0.inicioIdx] || dados[0]);
      const seriesA0 = [];
      a.memoriaA0PorSensor.forEach(function(mem, s) {
        if (!mem || !mem.length) return;
        seriesA0.push({ nome: 'S' + (s + 1), cor: SGO_DocA4_corSerie_(s), pontos: mem.map(function(m) { return [(m.ms - t0) / 60000, m.acumulado]; }) });
      });
      if (seriesA0.length) {
        const svgA = SGO_DocA4_graficoLinhas_({
          series: seriesA0, formatarX: function(x) { return SGO_DocA4_num_(x, 1) + ' min'; }, rotuloX: 'Tempo desde o início da soma do A0', rotuloY: 'A0 acumulado (s)', casasY: 0, yMin: 0,
          referencias: [{ y: f.limiteAprovacaoFinal, rotulo: 'A0 mínimo ' + SGO_DocA4_val_(f.limiteAprovacaoFinal, 0, 's') }], altura: 250
        });
        if (svgA) figuras.push({ svg: svgA, legenda: 'A0 acumulado por sensor (regra dos trapézios com o intervalo real entre leituras, só com temperatura a partir de ' + SGO_DocA4_val_(f.tLimiteA0, 0, '°C') + '), com o mínimo exigido (linha tracejada).' });
      }
    }

    if (ctx.analisarPressao) {
      const ptsP = [];
      fatia.forEach(function(r, i) { const p = Number(r.pressao); if (r.pressao !== null && r.pressao !== '' && isFinite(p)) ptsP.push([series.xDe(r, i), p]); });
      if (ptsP.length >= 10) {
        const svgPr = SGO_DocA4_graficoLinhas_({ series: [{ nome: 'Pressão registrada', cor: '#0f8b8d', pontos: ptsP, largura: 1.4 }], formatarX: series.formatarX, rotuloX: 'Horário', rotuloY: 'Pressão (unidade do registrador)', faixasX: faixas, altura: 220 });
        if (svgPr) figuras.push({ svg: svgPr, legenda: 'Pressão registrada ao longo do ciclo, apresentada para informação (sem critério de aceitação), na unidade do registrador.' });
      }
    }

    if (termo && f.conformidadePorSensor && f.conformidadePorSensor.length && f.tempoInicioExposicao) {
      const pior = f.piorSensorA0 ? f.piorSensorA0.sensor : '';
      const svgB = SGO_DocA4_graficoBarras_({
        itens: f.conformidadePorSensor.map(function(c) { return { rotulo: c.sensor, valor: Number(c.a0), destaque: c.sensor === pior }; }),
        limite: { valor: f.limiteAprovacaoFinal, rotulo: 'A0 mínimo ' + SGO_DocA4_val_(f.limiteAprovacaoFinal, 0, 's') },
        unidade: 'A0 (s)', casas: 0
      });
      if (svgB) figuras.push({ svg: svgB, legenda: 'A0 final por sensor, comparado ao mínimo exigido para a classificação do artigo (linha tracejada); o pior sensor está destacado.' });
    }
  } catch (e) {
    figuras.push({ erro: 'Os gráficos não puderam ser montados (' + (e && e.message ? e.message : e) + '). Os resultados numéricos do documento não são afetados.' });
  }
  return figuras;
}

/**
 * Memória de cálculo do A0 (anexo): resumo por sensor e leitura a leitura do pior sensor.
 * Usa analise.memoriaA0PorSensor, preenchida no mesmo cálculo que dá o A0 oficial.
 */
function LavRel_lvMontarMemoriaA0_(ctx, resultado) {
  const a = resultado.analise || {};
  const mem = a.memoriaA0PorSensor;
  if (ctx.tipoCiclo !== 'TERMO' || !mem || !a.janelaA0) return null;
  const f = ctx.estudos[0].fatos || {};
  const resumo = (f.conformidadePorSensor || []).map(function(c) {
    const idx = Number(String(c.sensor).replace(/\D/g, '')) - 1;
    const l = mem[idx] || [];
    const contam = l.filter(function(r) { return r.fator > 0; });
    const tempoSeg = l.length > 1 ? (l[l.length - 1].ms - l[0].ms) / 1000 : 0;
    return { sensor: c.sensor, leituras: l.length, leiturasAcima: contam.length, tempoSeg: tempoSeg, a0: c.a0 };
  });
  const pior = f.piorSensorA0 ? f.piorSensorA0.sensor : '';
  const idxPior = pior ? Number(pior.replace(/\D/g, '')) - 1 : -1;
  return { resumo: resumo, pior: pior, leiturasPior: idxPior >= 0 ? (mem[idxPior] || []) : [] };
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function LavRel_lvEscaparHtml_(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function LavRel_lvParagrafosHtml_(texto) {
  return SGO_DocA4_paragrafos_(texto);
}

function LavRel_lvFmtValor_(v, sufixo) {
  return SGO_DocA4_val_(v, 2, String(sufixo || '').replace(/^\s+/, ''));
}

/** Assina fatos e leituras, sem textos editáveis nem fotografias. */
function LavRel_lvAssinatura_(valor) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(valor), Utilities.Charset.UTF_8);
  return digest.map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}
