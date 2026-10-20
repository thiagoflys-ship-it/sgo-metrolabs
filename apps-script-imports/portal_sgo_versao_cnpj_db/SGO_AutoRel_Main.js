/****************************************************
 * METROLABS - CONVERSOR UNIVERSAL DATALOGGER - V4.5
 * ARQUIVO: Main.gs
 * FUNÇÃO:
 * Backend principal do WebApp. Responsável por:
 * - carregar a interface (Index.html)
 * - incluir arquivos HTML auxiliares
 * - rotear chamadas da interface com segurança
 * - sincronizar parâmetros básicos com o frontend
 * - receber uploads de arquivos
 * - executar o fluxo principal de conversão/análise
 * - gerar link de exportação PDF
 *
 * CORREÇÃO V4.5:
 * - integração com Parser V4.5
 * - envio de matrix + displayMatrix para normalização
 * - blindagem do fluxo de leitura temporal
 ****************************************************/

/** Chamadas que geram documento do ensaio: exigem o vínculo com o cadastro (SGO_QEQ_aplicarVinculoPayload_). */
var AUTOREL_FN_COM_VINCULO = ['apiConverter', 'apiGerarRascunhoCertificado', 'apiMontarCertificadoFinal', 'apiGerarMemoriaF0', 'apiEnviarParaAprovacao'];

/**
 * Roteador seguro de funções chamadas pelo frontend.
 */
function AutoRel_apiDispatch(req) {
  req = req || {};
  var sessaoDispatchRH = exigirSessao(String(req.sessionId || '')); // SEGURANCA: exige sessao valida do portal (SGO_Auth)
  if (typeof SGO_bloquearRH_ === 'function') SGO_bloquearRH_(sessaoDispatchRH, 'o módulo Autoclaves'); // perfil RH: sem documentos técnicos (SGO_Auth.js)

  const fn = String(req.fn || '').trim();
  let payload = req.payload || {};
  // 20/10/2026 (fluxo cliente → unidade → equipamento): documento do ensaio só com o equipamento escolhido no cadastro;
  // cliente, CNPJ, endereço, TAG e nº de série passam a vir do cadastro (equipamento de outro cliente é recusado).
  // Relatório interno (dados reconstituídos) fica de fora. SGO_QualifEquipamento.js.
  if (AUTOREL_FN_COM_VINCULO.indexOf(fn) >= 0 && !payload.modoRelatorioSimulado && typeof SGO_QEQ_aplicarVinculoPayload_ === 'function') {
    payload = SGO_QEQ_aplicarVinculoPayload_(String(req.sessionId || ''), payload);
  }

  const allow = {
    apiPing: AutoRel_apiPing,
    apiPreviewEntrada: AutoRel_apiPreviewEntrada,
    apiConverter: AutoRel_apiConverter,
    apiUploadArquivo: AutoRel_apiUploadArquivo,
    apiConsultarCnpj: AutoRel_apiConsultarCnpj,
    apiValidarSenhaSimuladorAdmin: AutoRel_apiValidarSenhaSimuladorAdmin,
    apiGerarRascunhoCertificado: AutoRel_apiGerarRascunhoCertificado,
    apiMontarCertificadoFinal: AutoRel_apiMontarCertificadoFinal,
    apiGerarMemoriaF0: AutoRel_apiGerarMemoriaF0,
    // Aprovação do responsável técnico (20/10/2026, SGO_QualifEmissao.js)
    apiEnviarParaAprovacao: AutoRel_apiEnviarParaAprovacao,
    apiListarAprovacoes: AutoRel_apiListarAprovacoes,
    apiPreverAprovacao: AutoRel_apiPreverAprovacao,
    apiAprovarEmitir: AutoRel_apiAprovarEmitir,
    apiDevolverAprovacao: AutoRel_apiDevolverAprovacao
  };

  if (!fn) {
    throw new Error('Função não informada.');
  }

  if (!allow[fn] || typeof allow[fn] !== 'function') {
    throw new Error('Função não permitida ou não encontrada: ' + fn);
  }

  return allow[fn](payload, sessaoDispatchRH);
}

// ------------------------------------------------------------
// SINCRONIZAÇÃO COM A INTERFACE
// ------------------------------------------------------------

function AutoRel_apiValidarSenhaSimuladorAdmin(payload) {
  payload = payload || {};
  AutoRel_validarSenhaSimuladorAdmin_(payload.senha);
  return { ok: true };
}
function AutoRel_apiPing(payload, sessao) {
  const laudosId = (AutoRel_UCFG.LAUDOS_FOLDER_ID && String(AutoRel_UCFG.LAUDOS_FOLDER_ID).length > 10)
    ? String(AutoRel_UCFG.LAUDOS_FOLDER_ID).trim()
    : '';

  const uploadsId = (AutoRel_UCFG.UPLOAD_FOLDER_ID && String(AutoRel_UCFG.UPLOAD_FOLDER_ID).length > 10)
    ? String(AutoRel_UCFG.UPLOAD_FOLDER_ID).trim()
    : '';

  const idleTimeout = Number(AutoRel_UCFG.IDLE_TIMEOUT_MINUTES);
  const logoFileId = String(AutoRel_UCFG.LOGO_FILE_ID || '').trim();
  const analiseCfg = AutoRel_UCFG.ANALISE || {};
  const validacaoTempoCfg = AutoRel_UCFG.VALIDACAO_TEMPO || {};

  return {
    ok: true,
    versao: String(AutoRel_UCFG.VERSION || 'V4.5') + ' Oficial',
    appTitle: AutoRel_UCFG.APP_TITLE || 'METROLABS',
    tz: AutoRel_UCFG.TZ || Session.getScriptTimeZone(),
    ts: Utilities.formatDate(new Date(), AutoRel_UCFG.TZ || Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss'),
    idleTimeout: isFinite(idleTimeout) && idleTimeout > 0 ? idleTimeout : 5,
    defaultDateStyle: String(AutoRel_UCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase(),
    defaultNSensores: Number(AutoRel_UCFG.DEFAULT_N || 12),
    motoresDisponiveis: Object.keys(AutoRel_UCFG.CICLOS || {}),
    // 20/10/2026: modelo da planilha de dados e se a sessão aprova a emissão (responsável técnico).
    planilhaModelo: AutoRel_planilhaModelo_(),
    podeAprovarEmissao: !!(sessao && AutoRel_acEhAprovador_(sessao)),
    // 20/10/2026: endereço real da pasta (a pasta fixa do Google Drive antigo não existe no servidor).
    laudosUrl: AutoRel_urlPastaExistente_(laudosId, 'AUTOREL_LAUDOS_FOLDER_ID'),
    uploadsUrl: AutoRel_urlPastaExistente_(uploadsId, 'AUTOREL_UPLOAD_PASTA_ID'),
    logoFileId: logoFileId,
    analise: {
      histereseTemperatura: AutoRel_parseFloatSeguro_(analiseCfg.histereseTemperatura, 0.5),
      consecutivasInicio: AutoRel_clampIntSeguro_(analiseCfg.consecutivasInicio, 1, 20, 2),
      consecutivasFim: AutoRel_clampIntSeguro_(analiseCfg.consecutivasFim, 1, 20, 3),
      toleranciaEntrada: AutoRel_parseFloatSeguro_(analiseCfg.toleranciaEntrada, 0),
      toleranciaSaida: AutoRel_parseFloatSeguro_(analiseCfg.toleranciaSaida, 0.5),
      modoReconhecimentoExposicao: String(analiseCfg.modoReconhecimentoExposicao || 'PIOR_SENSOR').toUpperCase(),
      percentualMinimoSensores: AutoRel_limitarNumeroSeguro_(analiseCfg.percentualMinimoSensores, 0.01, 1, 1),
      permitirOverrideManual: !!analiseCfg.permitirOverrideManual,
      permitirOverrideCiclo: !!analiseCfg.permitirOverrideCiclo,
      permitirOverrideExposicao: !!analiseCfg.permitirOverrideExposicao
    },
    simuladorAdmin: {
      habilitado: !!(AutoRel_UCFG.SIMULADOR_ADMIN && AutoRel_UCFG.SIMULADOR_ADMIN.habilitado !== false),
      intervaloSegundosDefault: Number(AutoRel_UCFG.SIMULADOR_ADMIN && AutoRel_UCFG.SIMULADOR_ADMIN.intervaloSegundosDefault) || 30
    },
    validacaoTempo: {
      permitirReconstrucaoTempo: !!validacaoTempoCfg.permitirReconstrucaoTempo,
      maxTimestampsIguaisSequenciais: AutoRel_clampIntSeguro_(validacaoTempoCfg.maxTimestampsIguaisSequenciais, 1, 100, 3),
      maxSaltosMinutos: AutoRel_clampIntSeguro_(validacaoTempoCfg.maxSaltosMinutos, 1, 10000, 120),
      intervaloEsperadoMin: AutoRel_parseFloatSeguro_(validacaoTempoCfg.intervaloEsperadoMin, 0.1),
      intervaloEsperadoMax: AutoRel_parseFloatSeguro_(validacaoTempoCfg.intervaloEsperadoMax, 10)
    }
  };
}

// ------------------------------------------------------------
// CONSULTA PUBLICA DE CNPJ
// ------------------------------------------------------------

function AutoRel_apiConsultarCnpj(payload) {
  payload = payload || {};
  const cnpj = String(payload.cnpj || '').replace(/\D/g, '');

  if (!/^\d{14}$/.test(cnpj)) {
    throw new Error('Informe um CNPJ válido com 14 dígitos.');
  }

  // Consulta com reserva entre várias bases públicas + cache (SGO_CnpjConsulta.js).
  const data = SGO_CNPJ_consultarDados_(cnpj);

  const enderecoPartes = [
    data.descricao_tipo_de_logradouro || '',
    data.logradouro || '',
    data.numero || '',
    data.complemento ? ('- ' + data.complemento) : '',
    data.bairro ? ('- ' + data.bairro) : '',
    data.municipio ? ('- ' + data.municipio) : '',
    data.uf ? ('/' + data.uf) : '',
    data.cep ? ('- CEP ' + AutoRel_formatarCepConsultaCnpj_(data.cep)) : ''
  ].filter(function(v) { return String(v || '').trim(); }).join(' ');

  return {
    ok: true,
    fonte: 'consulta pública',
    cnpj: AutoRel_formatarCnpjConsultaCnpj_(cnpj),
    razaoSocial: data.razao_social || '',
    nomeFantasia: data.nome_fantasia || '',
    cliente: data.razao_social || data.nome_fantasia || '',
    endereco: enderecoPartes.replace(/\s+/g, ' ').trim(),
    municipio: data.municipio || '',
    uf: data.uf || '',
    cep: AutoRel_formatarCepConsultaCnpj_(data.cep || ''),
    telefone: data.ddd_telefone_1 || data.ddd_telefone_2 || '',
    email: data.email || '',
    cnaeFiscal: data.cnae_fiscal_descricao || '',
    situacaoCadastral: data.descricao_situacao_cadastral || '',
    abertura: data.data_inicio_atividade || ''
  };
}

function AutoRel_formatarCnpjConsultaCnpj_(cnpj) {
  const s = String(cnpj || '').replace(/\D/g, '');
  if (s.length !== 14) return String(cnpj || '');
  return s.substring(0, 2) + '.' + s.substring(2, 5) + '.' + s.substring(5, 8) + '/' + s.substring(8, 12) + '-' + s.substring(12);
}

function AutoRel_formatarCepConsultaCnpj_(cep) {
  const s = String(cep || '').replace(/\D/g, '');
  if (s.length !== 8) return String(cep || '');
  return s.substring(0, 5) + '-' + s.substring(5);
}

// ------------------------------------------------------------
// UPLOAD DE ARQUIVO PARA PASTA DE UPLOADS
// ------------------------------------------------------------

function AutoRel_apiUploadArquivo(payload) {
  payload = payload || {};

  const fileNameOriginal = String(payload.fileName || 'arquivo_sem_nome.txt').trim();
  const fileName = AutoRel_sanitizarNomeArquivo_(fileNameOriginal || 'arquivo_sem_nome.txt');
  const mimeType = String(payload.mimeType || MimeType.PLAIN_TEXT).trim();
  const base64 = String(payload.base64 || '').trim();

  if (!base64) {
    throw new Error('Conteúdo do arquivo não recebido para upload.');
  }

  const folderId = (AutoRel_UCFG.UPLOAD_FOLDER_ID && String(AutoRel_UCFG.UPLOAD_FOLDER_ID).length > 10)
    ? String(AutoRel_UCFG.UPLOAD_FOLDER_ID).trim()
    : '';

  try {
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, mimeType, fileName);
    const folder = AutoRel_pastaUploads_(folderId);
    const file = folder.createFile(blob);

    return {
      ok: true,
      fileId: file.getId(),
      fileName: file.getName(),
      fileUrl: file.getUrl()
    };
  } catch (err) {
    throw new Error('Falha ao enviar arquivo para a pasta de uploads: ' + err.message);
  }
}

// ------------------------------------------------------------
// PRÉ-VISUALIZAÇÃO
// ------------------------------------------------------------

function AutoRel_apiPreviewEntrada(payload) {
  payload = payload || {};

  if (String(payload.modoEntrada || '').toUpperCase().trim() === 'SIMULADO_ADMIN') {
    const dadosSimulados = AutoRel_gerarDadosSimuladosAdmin_(payload, { preview: true });
    const nSensoresPrev = Array.isArray(dadosSimulados[0] && dadosSimulados[0].temperaturas) ? dadosSimulados[0].temperaturas.length : 0;
    const header = ['Tempo'].concat(Array.from({ length: nSensoresPrev }, function(_, i) { return 'S' + (i + 1); })).concat(['Pressão']);
    const previewSim = [header].concat(dadosSimulados.slice(0, AutoRel_UCFG.PREVIEW_ROWS || 20).map(function(row) {
      return [row.tempoStr].concat(row.temperaturas || []).concat([row.pressao]);
    }));

    return {
      ok: true,
      rows: dadosSimulados.length,
      cols: header.length,
      preview: previewSim,
      diagnostico: {
        modoEntrada: 'SIMULADO_ADMIN',
        detectedDateStyle: 'BR',
        qtdTemperaturas: nSensoresPrev,
        hasPressao: true,
        observacao: 'Dados reconstituídos gerados para análise interna pelo laboratório de metrologia.'
      }
    };
  }

  if (String(payload.modoEntrada || '').toUpperCase().trim() === 'ARQUIVO_POR_SENSOR') {
    const nS = AutoRel_clampIntSeguro_(payload.nSensores, 1, 60, AutoRel_UCFG.DEFAULT_N || 12);
    const ativosPrev = AutoRel_normalizarSensoresAtivosMain_(payload.sensoresAtivos, nS);
    const estiloPrev = String(payload.dateStyle || AutoRel_UCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();
    const mesc = AutoRel_lerEMesclarPorSensor_(payload, nS, ativosPrev, estiloPrev);
    const comPressao = AutoRel_analisaPressao_(payload) && !!mesc.resumo.pressao;
    const cab = ['Tempo'].concat(Array.from({ length: nS }, function(_, i) { return 'S' + (i + 1); })).concat(comPressao ? ['Pressão (bar abs)'] : []);
    const prev = [cab].concat(mesc.linhas.slice(0, AutoRel_UCFG.PREVIEW_ROWS || 20).map(function(r) {
      return [r.tempoStr].concat(r.temperaturas.map(function(t) { return t === null ? '' : t; })).concat(comPressao ? [r.pressao === null ? '' : r.pressao] : []);
    }));
    return {
      ok: true, rows: mesc.linhas.length, cols: cab.length, preview: prev,
      diagnostico: {
        modoEntrada: 'ARQUIVO_POR_SENSOR', qtdTemperaturas: mesc.resumo.sensores.length, hasPressao: comPressao,
        observacao: 'Arquivos de ' + mesc.resumo.sensores.length + ' sensor(es) alinhados pela linha do tempo do ' + mesc.resumo.referencia +
          ' (tolerância de ' + SGO_DocA4_num_(mesc.resumo.toleranciaSeg, 1) + ' s). Leituras sem correspondência: ' +
          mesc.resumo.sensores.map(function(r) { return r.sensor + ' ' + r.semCorrespondencia; }).join(', ') + '. Maior defasagem de relógio: ' +
          mesc.resumo.sensores.map(function(r) { return r.sensor + ' ' + SGO_DocA4_num_(r.maiorDefasagemSeg, 0) + ' s'; }).join(', ') + '.'
      }
    };
  }

  const rich = AutoRel_lerDadosEntradaRich_(payload);
  const bruto = rich.displayMatrix || rich.matrix || [];

  if (!bruto || !bruto.length) {
    throw new Error('A planilha retornou vazia. Verifique os dados fornecidos.');
  }

  const previewRows = bruto.slice(0, AutoRel_UCFG.PREVIEW_ROWS || 20);
  const maxCols = previewRows.reduce(function(m, r) {
    return Math.max(m, Array.isArray(r) ? r.length : 0);
  }, 0);

  const preview = previewRows.map(function(row) {
    const arr = Array.isArray(row) ? row : [row];
    const out = [];
    for (let i = 0; i < maxCols; i++) {
      out.push(typeof arr[i] === 'undefined' ? '' : arr[i]);
    }
    return out;
  });

  let diagnostico = {};
  try {
    diagnostico = rich.diagnostico || AutoRel_diagnosticarEstruturaEntrada_(rich.matrix || bruto, rich.displayMatrix || bruto) || {};
  } catch (e) {
    diagnostico = {
      erroDiagnostico: e.message
    };
  }

  return {
    ok: true,
    rows: bruto.length,
    cols: maxCols,
    preview: preview,
    diagnostico: diagnostico
  };
}

// ------------------------------------------------------------
// CÉREBRO PRINCIPAL DO CONVERSOR
// ------------------------------------------------------------

/**
 * Pipeline reaproveitável: leitura + normalização + análise do ciclo
 * térmico. Compartilhado pelo laudo em Planilha (AutoRel_apiConverter) e
 * pela Interpretação Técnica do Ensaio (AutoRel_CertificadoRelatorio.js)
 * — nenhum dos dois recalcula nada por conta própria.
 */
function AutoRel_acExecutarAnaliseCompleta_(payload) {
  payload = payload || {};
  payload = AutoRel_normalizarCicloNormativoPayload_(payload);

  const nSensores = AutoRel_clampIntSeguro_(payload.nSensores, 1, 60, AutoRel_UCFG.DEFAULT_N || 12);
  const motor = String(payload.motor || '134').trim();
  const offsetTemp = AutoRel_parseFloatSeguro_(payload.offsetTemp, 0.0);
  const offsetF0 = AutoRel_parseFloatSeguro_(payload.offsetF0, 0.0);
  const dateStyle = String(payload.dateStyle || AutoRel_UCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();

  if (!AutoRel_UCFG.CICLOS || !AutoRel_UCFG.CICLOS[motor]) {
    throw new Error('Motor/ciclo inválido ou não configurado: ' + motor);
  }

  const sensoresAtivos = AutoRel_normalizarSensoresAtivosMain_(payload.sensoresAtivos, nSensores);
  let opcoesAnalise = null;

  let dadosNormalizados = null;
  const modoEntradaNormalizado = String(payload.modoEntrada || 'FILE_ID').toUpperCase().trim();

  if (modoEntradaNormalizado === 'SIMULADO_ADMIN') {
    dadosNormalizados = AutoRel_gerarDadosSimuladosAdmin_(payload, { converter: true });
    AutoRel_aplicarOverrideSimulacaoNoPayload_(payload);
  } else if (modoEntradaNormalizado === 'ARQUIVO_POR_SENSOR') {
    const mesc = AutoRel_lerEMesclarPorSensor_(payload, nSensores, sensoresAtivos, dateStyle);
    dadosNormalizados = mesc.linhas;
    payload._mesclagem = mesc.resumo;
  } else {
    const rich = AutoRel_lerDadosEntradaRich_(payload);
    if (!rich || !rich.matrix || !rich.matrix.length) {
      throw new Error('Não foi possível ler os dados de entrada.');
    }

    dadosNormalizados = AutoRel_normalizarMatrizParaAnalise(
      rich.matrix,
      rich.displayMatrix,
      nSensores,
      dateStyle
    );
  }

  opcoesAnalise = AutoRel_normalizarOpcoesAnaliseMain_(payload);

  // Ensaio só de temperatura (autoclave de pequeno porte/cassete sem ponto para o
  // transmissor de pressão): a pressão sai dos dados antes da análise; fases e
  // critérios são avaliados só pela temperatura (20/10/2026).
  if (!AutoRel_analisaPressao_(payload)) {
    dadosNormalizados = dadosNormalizados.map(function(r) { return Object.assign({}, r, { pressao: null }); });
    opcoesAnalise.semPressao = true;
  }

  if (!dadosNormalizados || !dadosNormalizados.length) {
    throw new Error('Não foi possível normalizar os dados para análise.');
  }

  const analise = AutoRel_analisarCiclo(
    dadosNormalizados,
    motor,
    offsetTemp,
    offsetF0,
    sensoresAtivos,
    opcoesAnalise
  );

  if (!analise) {
    throw new Error('A rotina de análise não retornou resultado.');
  }

  AutoRel_aplicarMarcadoresSimulacaoNaAnalise_(analise, payload);

  return {
    payload: payload,
    motor: motor,
    cicloCfg: AutoRel_UCFG.CICLOS[motor],
    nSensores: nSensores,
    sensoresAtivos: sensoresAtivos,
    dadosNormalizados: dadosNormalizados,
    analise: analise,
    opcoesAnalise: opcoesAnalise
  };
}

/**
 * Botão "Gerar planilha de dados" (20/10/2026). Modelo NOVO (padrão): documento A4 em
 * paisagem em HTML + PDF com aprovação do responsável técnico (SGO_AutoRel_PlanilhaDados.js).
 * Modelo ANTERIOR (planilha do Google Planilhas, SGO_AutoRel_Planilha.js): preservado sem
 * mudança e usado só se o responsável pelo sistema gravar AUTOREL_PLANILHA_MODELO = ANTERIOR
 * em Chaves e senhas.
 */
function AutoRel_apiConverter(payload, sessao) {
  if (AutoRel_planilhaModelo_() === 'ANTERIOR') return AutoRel_apiConverterModeloAnterior_(payload);
  return AutoRel_apiGerarPlanilhaDados(payload, sessao);
}

/** Modelo anterior da planilha de dados (Google Planilhas → PDF em paisagem), sem alteração. */
function AutoRel_apiConverterModeloAnterior_(payload) {
  payload = payload || {};

  if (String(payload.tipoRelatorio || '').toUpperCase().trim() === 'LEAK_TEST') {
    return AutoRel_apiConverterLeakTest_(payload);
  }

  const pipeline = AutoRel_acExecutarAnaliseCompleta_(payload);
  payload = pipeline.payload;
  const nSensores = pipeline.nSensores;
  const dadosNormalizados = pipeline.dadosNormalizados;
  const analise = pipeline.analise;
  // Dado com problema não vira documento (20/10/2026).
  if (!payload.modoRelatorioSimulado) AutoRel_exigirSemTravas_((analise.qualidadeDados || {}).travas);

  const infoPlanilha = AutoRel_gerarPlanilhaAuditoria(dadosNormalizados, analise, payload);
  if (!infoPlanilha || !infoPlanilha.spreadsheetId) {
    throw new Error('Falha ao gerar a planilha de auditoria.');
  }

  const ss = SpreadsheetApp.openById(infoPlanilha.spreadsheetId);

  AutoRel_gerarGraficosAuditoria(ss, analise, nSensores);

  SpreadsheetApp.flush();

  const pdfUrl = AutoRel_construirLinkPdfPaisagem(infoPlanilha.spreadsheetId);
  // Regra do dono: o PDF da planilha (relatório de dados) também fica na pasta do cliente. Nunca lança.
  const salvoPlanilha = SGO_DocSalvar_salvarPdfPlanilha_(pdfUrl, payload, function() {
    return SGO_DocSalvar_pastaPersistente_('AUTOREL_LAUDOS_FOLDER_ID', 'Autoclave - Laudos', AutoRel_UCFG.LAUDOS_FOLDER_ID);
  }, 'Relatório de dados Autoclave', AutoRel_UCFG.TZ);

  return {
    ok: true,
    aprovado: !!analise.aprovado,
    statusAprovacao: analise.statusAprovacao || (analise.aprovado ? 'APROVADO' : 'REPROVADO'),
    spreadsheetId: infoPlanilha.spreadsheetId,
    spreadsheetUrl: infoPlanilha.spreadsheetUrl || ss.getUrl(),
    pdfUrl: pdfUrl,
    salvoNaPasta: salvoPlanilha.salvoNaPasta,
    pdfId: salvoPlanilha.pdfId,
    pdfSalvoUrl: salvoPlanilha.pdfSalvoUrl,
    pdfNome: salvoPlanilha.pdfNome,
    pastaUrl: salvoPlanilha.pastaUrl,
    avisoSalvar: salvoPlanilha.avisoSalvar,
    analiseResumo: {
      minF0: analise.minF0,
      mediaF0: analise.mediaF0,
      maxF0: analise.maxF0,
      tempoExposicaoMinutos: analise.tempoExposicaoMinutos,
      tempoTotalMinutos: analise.tempoTotalMinutos,
      tempoInicioExposicao: analise.tempoInicioExposicao || '',
      tempoFimExposicao: analise.tempoFimExposicao || '',
      tempoInicioCiclo: analise.tempoInicioCiclo || '',
      tempoFimCiclo: analise.tempoFimCiclo || '',
      quantidadeSensoresInstalados: analise.quantidadeSensoresInstalados,
      quantidadeSensoresUtilizados: analise.quantidadeSensoresUtilizados,
      sensoresUtilizados: analise.sensoresUtilizados || [],
      sensoresDesabilitados: analise.sensoresDesabilitados || [],
      piorSensorF0: analise.piorSensorF0 || null,
      piorSensorTemperatura: analise.piorSensorTemperatura || null,
      origemJanelaCiclo: analise.origemJanelaCiclo || 'AUTO',
      origemJanelaExposicao: analise.origemJanelaExposicao || 'AUTO',
      configuracaoDeteccaoExposicao: analise.configuracaoDeteccaoExposicao || {},
      limitesAprovacao: analise.limitesAprovacao || {},
      observacoesAnalise: analise.observacoesAnalise || [],
      alertasAnalise: analise.alertasAnalise || [],
      motivosReprovacao: analise.motivosReprovacao || [],
      deltaMinutosEstimado: analise.deltaMinutosEstimado || 0,
      faseInicioRampa: typeof analise.faseInicioRampa === 'number' ? analise.faseInicioRampa : -1,
      faseInicioExp: typeof analise.faseInicioExp === 'number' ? analise.faseInicioExp : -1,
      faseFimExp: typeof analise.faseFimExp === 'number' ? analise.faseFimExp : -1
    }
  };
}

function AutoRel_aplicarOverrideSimulacaoNoPayload_(payload) {
  payload = payload || {};
  const sim = payload.simulacao || {};
  payload.modoAnaliseJanela = 'MANUAL';
  payload.overrideJanela = {
    habilitado: true,
    inicioCiclo: sim.inicioCiclo || '',
    fimCiclo: sim.fimCiclo || '',
    inicioExposicao: sim.inicioEsterilizacao || sim.inicioExposicao || '',
    fimExposicao: sim.fimEsterilizacao || sim.fimExposicao || ''
  };
}

function AutoRel_aplicarMarcadoresSimulacaoNaAnalise_(analise, payload) {
  if (!analise || !payload || !payload.modoRelatorioSimulado) return;
  const meta = payload._simulacaoMeta || {};
  analise.origemDados = 'ANALISE_MANUAL_RECONSTITUIDA';
  analise.observacoesAnalise = Array.isArray(analise.observacoesAnalise) ? analise.observacoesAnalise : [];
  analise.alertasAnalise = Array.isArray(analise.alertasAnalise) ? analise.alertasAnalise : [];
  const avisoInterno = 'RELATÓRIO INTERNO - ANÁLISE MANUAL DO LABORATÓRIO DE METROLOGIA';
  if (analise.observacoesAnalise.indexOf(avisoInterno) === -1) {
    analise.observacoesAnalise.unshift(avisoInterno);
  }
  analise.observacoesAnalise.push('Parâmetros da análise manual: ciclo ' + (meta.inicioCiclo || '-') + ' a ' + (meta.fimCiclo || '-') + ' | esterilização ' + (meta.inicioEsterilizacao || '-') + ' a ' + (meta.fimEsterilizacao || '-') + ' | alvo ' + (meta.temperaturaAlvo || '-') + ' °C | intervalo ' + (meta.intervaloSegundos || '-') + ' s | operador ' + (meta.operador || '-'));
}

// ------------------------------------------------------------
// LINK DE EXPORTAÇÃO PDF
// ------------------------------------------------------------

function AutoRel_construirLinkPdfPaisagem(id) {
  id = String(id || '').trim();

  if (!id) {
    throw new Error('ID da planilha não informado para geração do PDF.');
  }

  const urlBase = 'https://docs.google.com/spreadsheets/d/' + id + '/export?';
  const parametros = [
    'exportFormat=pdf',
    'format=pdf',
    'size=A4',
    'portrait=false',
    'fitw=true',
    'sheetnames=false',
    'printtitle=false',
    'pagenum=CENTER',
    'gridlines=false',
    'fzr=false',
    'top_margin=0.30',
    'bottom_margin=0.30',
    'left_margin=0.25',
    'right_margin=0.25'
  ].join('&');

  return urlBase + parametros;
}

// ------------------------------------------------------------
// HELPERS LOCAIS DE SEGURANÇA
// ------------------------------------------------------------

function AutoRel_parseFloatSeguro_(valor, fallback) {
  if (valor === null || valor === undefined || valor === '') return fallback;
  const n = Number(String(valor).replace(',', '.').trim());
  return isFinite(n) ? n : fallback;
}

function AutoRel_clampIntSeguro_(valor, min, max, fallback) {
  let n = Number(valor);
  if (!isFinite(n)) n = fallback;

  n = Math.round(n);

  if (n < min) n = min;
  if (n > max) n = max;

  return n;
}

function AutoRel_limitarNumeroSeguro_(valor, min, max, fallback) {
  let n = Number(valor);
  if (!isFinite(n)) n = fallback;
  if (n < min) n = min;
  if (n > max) n = max;
  return n;
}

function AutoRel_normalizarCicloNormativoPayload_(payload) {
  payload = payload || {};
  const ciclos = (AutoRel_UCFG && AutoRel_UCFG.CICLOS) ? AutoRel_UCFG.CICLOS : {};
  const modoEntrada = String(payload.modoEntrada || '').toUpperCase().trim();
  const sim = payload.simulacao || {};
  const alvoPreferencial = modoEntrada === 'SIMULADO_ADMIN'
    ? AutoRel_parseFloatSeguro_(sim.temperaturaAlvo || payload.setpoint, NaN)
    : AutoRel_parseFloatSeguro_(payload.setpoint, NaN);

  const cicloAlvo = isFinite(alvoPreferencial) ? String(Math.round(alvoPreferencial)) : '';
  if (cicloAlvo && ciclos[cicloAlvo]) {
    payload.motor = cicloAlvo;
    payload.setpoint = cicloAlvo;
    if (modoEntrada === 'SIMULADO_ADMIN') {
      payload.simulacao = sim;
      payload.simulacao.temperaturaAlvo = String(alvoPreferencial);
    }
  }

  return payload;
}
function AutoRel_normalizarSensoresAtivosMain_(sensoresAtivos, nSensores) {
  if (!Array.isArray(sensoresAtivos) || !sensoresAtivos.length) {
    return Array.from({ length: nSensores }, function() {
      return true;
    });
  }

  const out = [];
  for (let i = 0; i < nSensores; i++) {
    if (typeof sensoresAtivos[i] === 'undefined') {
      out.push(true);
    } else {
      out.push(!!sensoresAtivos[i]);
    }
  }

  return out;
}

function AutoRel_sanitizarNomeArquivo_(nome) {
  return String(nome || 'arquivo_sem_nome.txt')
    .replace(/[\\\/:*?"<>|#%]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

// ------------------------------------------------------------
// NORMALIZAÇÃO DAS OPÇÕES NOVAS DE ANÁLISE
// ------------------------------------------------------------

function AutoRel_normalizarOpcoesAnaliseMain_(payload) {
  payload = payload || {};

  const cfgAnalise = AutoRel_UCFG.ANALISE || {};
  const permitirOverrideManual = !!cfgAnalise.permitirOverrideManual;
  const permitirOverrideCiclo = !!cfgAnalise.permitirOverrideCiclo;
  const permitirOverrideExposicao = !!cfgAnalise.permitirOverrideExposicao;

  const robustezIn = payload.robustez || {};
  const overrideIn = payload.overrideJanela || {};

  const robustez = {
    histereseTemperatura: AutoRel_parseFloatOpcionalSeguro_(robustezIn.histereseTemperatura),
    consecutivasInicio: AutoRel_clampIntOpcionalSeguro_(robustezIn.consecutivasInicio, 1, 20),
    consecutivasFim: AutoRel_clampIntOpcionalSeguro_(robustezIn.consecutivasFim, 1, 20),
    toleranciaEntrada: AutoRel_parseFloatOpcionalSeguro_(robustezIn.toleranciaEntrada),
    toleranciaSaida: AutoRel_parseFloatOpcionalSeguro_(robustezIn.toleranciaSaida),
    modoReconhecimentoExposicao: AutoRel_normalizarTextoOpcional_(robustezIn.modoReconhecimentoExposicao).toUpperCase(),
    percentualMinimoSensores: AutoRel_limitarNumeroOpcionalSeguro_(robustezIn.percentualMinimoSensores, 0.01, 1)
  };

  if (!robustez.modoReconhecimentoExposicao) {
    delete robustez.modoReconhecimentoExposicao;
  }

  const overrideJanela = {
    habilitado: permitirOverrideManual && !!overrideIn.habilitado,

    inicioCiclo: permitirOverrideCiclo ? AutoRel_normalizarTextoOpcional_(overrideIn.inicioCiclo) : '',
    fimCiclo: permitirOverrideCiclo ? AutoRel_normalizarTextoOpcional_(overrideIn.fimCiclo) : '',

    inicioExposicao: permitirOverrideExposicao ? AutoRel_normalizarTextoOpcional_(overrideIn.inicioExposicao) : '',
    fimExposicao: permitirOverrideExposicao ? AutoRel_normalizarTextoOpcional_(overrideIn.fimExposicao) : ''
  };

  return {
    robustez: robustez,
    overrideJanela: overrideJanela,
    equipamento: AutoRel_normalizarEquipamentoMain_(payload.equipamento),
    // Sensor no ponto de referência da câmara (dreno), 1 a N; vazio = não informado (20/10/2026).
    sensorReferencia: AutoRel_clampIntOpcionalSeguro_(payload.sensorReferencia, 1, 60)
  };
}

// Parâmetros observacionais das fases. Não alteram F0, exposição ou aprovação térmica.
function AutoRel_normalizarEquipamentoMain_(entrada) {
  const equipamento = entrada || {};
  const modo = String(equipamento.modoRemocaoAr || 'AUTO').trim().toUpperCase();
  if (['AUTO', 'PRE_VACUO', 'GRAVITACIONAL', 'SFPP'].indexOf(modo) === -1) {
    throw new Error('Tipo de remoção de ar do ciclo inválido.');
  }
  // O ciclo legado recebe pressão em bar absoluto; conversões de fases são opcionais.
  const unidade = String(equipamento.unidadePressao || 'BAR_ABS').trim().toUpperCase();
  if (['BAR_ABS', 'BAR_REL', 'MBAR_ABS', 'KPA_ABS'].indexOf(unidade) === -1) {
    throw new Error('Unidade de pressão inválida para a identificação das fases.');
  }
  if (unidade !== 'BAR_ABS') {
    throw new Error('O relatório de ciclo utiliza pressão em bar absoluto. Converta a fonte para bar absoluto antes de emitir; outras unidades permanecem disponíveis no Leak Test.');
  }
  const resultado = { modoRemocaoAr: modo, unidadePressao: unidade };
  const limites = {
    referenciaAtmosfericaBar: [0.5, 1.2],
    minimoDuracaoEvacuacaoSeg: [0, 120],
    minimoAmplitudeEvacuacaoBar: [0.01, 0.5],
    histeresePressaoBar: [0.001, 0.1]
  };
  Object.keys(limites).forEach(function(chave) {
    const valor = equipamento[chave];
    if (valor === undefined || valor === null || String(valor).trim() === '') return;
    const numero = Number(String(valor).trim().replace(',', '.'));
    const faixa = limites[chave];
    if (!isFinite(numero) || numero < faixa[0] || numero > faixa[1]) {
      throw new Error('Parâmetro observacional de pressão inválido: ' + chave + '.');
    }
    resultado[chave] = numero;
  });
  return resultado;
}

function AutoRel_clampIntOpcionalSeguro_(valor, min, max) {
  if (valor === null || valor === undefined || valor === '') return undefined;

  let n = Number(valor);
  if (!isFinite(n)) return undefined;

  n = Math.round(n);
  if (n < min) n = min;
  if (n > max) n = max;

  return n;
}

function AutoRel_parseFloatOpcionalSeguro_(valor) {
  if (valor === null || valor === undefined || valor === '') return undefined;
  const n = Number(String(valor).replace(',', '.').trim());
  return isFinite(n) ? n : undefined;
}

function AutoRel_limitarNumeroOpcionalSeguro_(valor, min, max) {
  if (valor === null || valor === undefined || valor === '') return undefined;
  let n = Number(valor);
  if (!isFinite(n)) return undefined;
  if (n < min) n = min;
  if (n > max) n = max;
  return n;
}

function AutoRel_normalizarTextoOpcional_(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).trim();
}


/**
 * Pasta das planilhas enviadas para leitura (20/10/2026). A pasta fixa da configuração era do Google Drive antigo e não
 * existe no servidor novo: o envio falhava com "Não foi possível encontrar a pasta". Usa a pasta configurada quando ela
 * existe; senão, a pasta própria "Autoclave - Planilhas enviadas" (criada uma vez, endereço guardado em AUTOREL_UPLOAD_PASTA_ID).
 */
function AutoRel_pastaUploads_(folderIdConfigurado) {
  if (folderIdConfigurado) {
    try { return DriveApp.getFolderById(folderIdConfigurado); } catch (e) { /* pasta antiga não existe aqui: segue para a própria */ }
  }
  const props = PropertiesService.getScriptProperties();
  const idSalvo = props.getProperty('AUTOREL_UPLOAD_PASTA_ID');
  if (idSalvo) {
    try { return DriveApp.getFolderById(idSalvo); } catch (e) { /* apagada: cria de novo */ }
  }
  const pasta = DriveApp.getRootFolder().createFolder('Autoclave - Planilhas enviadas');
  props.setProperty('AUTOREL_UPLOAD_PASTA_ID', pasta.getId());
  return pasta;
}


// ------------------------------------------------------------
// 20/10/2026 — pastas, ensaio sem pressão, um arquivo por sensor, travas
// ------------------------------------------------------------

/** Endereço da pasta que existe de fato (configurada ou a própria do módulo); '' se nenhuma existe ainda. Não cria pasta. */
function AutoRel_urlPastaExistente_(idConfigurado, propKey) {
  const ids = [String(idConfigurado || '').trim()];
  try { ids.push(String(PropertiesService.getScriptProperties().getProperty(propKey) || '').trim()); } catch (e) {}
  for (let i = 0; i < ids.length; i++) {
    if (!ids[i]) continue;
    try { return DriveApp.getFolderById(ids[i]).getUrl(); } catch (e) { /* pasta do Google Drive antigo: não existe aqui */ }
  }
  return '';
}

/**
 * Seletor "Analisar pressão" (ligado por padrão). Desligado: autoclave de pequeno porte
 * (cassete) sem ponto para o transmissor de pressão; exige justificativa curta.
 */
function AutoRel_analisaPressao_(payload) {
  payload = payload || {};
  if (payload.analisarPressao === false || String(payload.analisarPressao).toLowerCase() === 'false') {
    const just = String(payload.justificativaSemPressao || '').trim();
    if (just.length < 10) {
      throw new Error('Com "Analisar pressão" desligado, escreva a justificativa (ao menos 10 caracteres), por exemplo: "equipamento sem ponto para instalar o transmissor de pressão". Ela fica registrada no ensaio e no documento.');
    }
    return false;
  }
  return true;
}

/** Lê a série de pressão de um arquivo próprio do registrador de pressão (Data/Hora + coluna de pressão). */
function AutoRel_lerSeriePressaoArquivo_(fileId, delimManual, dateStyle) {
  const rich = AutoRel_lerDadosEntradaRich_({ modoEntrada: 'FILE_ID', fileId: fileId, delimManual: delimManual });
  const disp = rich.displayMatrix || rich.matrix;
  const hlow = (disp[0] || []).map(function(h) { return AutoRel_normalizarTextoComparacaoParser_(h); });
  const idxPressao = AutoRel_findPressaoIndexParser_(hlow);
  if (idxPressao === -1) throw new Error('O arquivo de pressão não tem coluna de pressão reconhecida no cabeçalho (ex.: "Pressão (bar abs)"). Confira o arquivo e envie de novo.');
  const ctxTempo = {
    idxTempo: AutoRel_findAnyIndexParser_(hlow, ['tempo', 'timestamp', 'datetime', 'date time', 'datahora', 'data/hora']),
    idxData: AutoRel_findAnyIndexParser_(hlow, ['data', 'date']),
    idxHora: AutoRel_findAnyIndexParser_(hlow, ['hora', 'time'])
  };
  let estilo = String(dateStyle || 'AUTO').toUpperCase();
  if (estilo === 'AUTO') estilo = AutoRel_detectarPadraoDataNaMatriz_(disp, 1, ctxTempo.idxTempo !== -1 ? ctxTempo.idxTempo : (ctxTempo.idxData !== -1 ? ctxTempo.idxData : 0));
  const out = [];
  for (let r = 1; r < rich.matrix.length; r++) {
    const info = AutoRel_extrairTempoDaLinhaParser_(rich.matrix[r], Object.assign({ rowDisplay: disp[r], dateStyle: estilo }, ctxTempo));
    const p = AutoRel_parseNumeroRobusto_(rich.matrix[r][idxPressao]);
    if (!info.tempoDate || isNaN(info.tempoDate.getTime()) || p === null || !isFinite(p)) continue;
    out.push({ tempoDate: info.tempoDate, tempoStr: Utilities.formatDate(info.tempoDate, AutoRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss'), valor: p });
  }
  out.sort(function(a, b) { return a.tempoDate.getTime() - b.tempoDate.getTime(); });
  if (out.length < 3) throw new Error('O arquivo de pressão não tem leituras válidas de data, hora e pressão.');
  return out;
}

/**
 * Modo "um arquivo por sensor" (registradores individuais): cada sensor ativo tem o seu
 * arquivo (payload.arquivosPorSensor[s]); a pressão vem de payload.arquivoPressao ou, se
 * não houver, do primeiro arquivo de sensor que tenha coluna de pressão. Mescla pela linha
 * do tempo mais completa (SGO_QT_mesclarSeries_); leitura sem correspondência fica vazia e
 * vira trava se cair dentro da exposição.
 */
function AutoRel_lerEMesclarPorSensor_(payload, nSensores, sensoresAtivos, dateStyle) {
  const arquivos = Array.isArray(payload.arquivosPorSensor) ? payload.arquivosPorSensor : [];
  const delim = String(payload.delimManual || 'AUTO').toUpperCase().trim();
  const series = [];
  let pressaoDeSensor = null;
  for (let s = 0; s < nSensores; s++) {
    if (!sensoresAtivos[s]) { series.push(null); continue; }
    const id = String(arquivos[s] || '').trim();
    if (!id) throw new Error('O sensor S' + (s + 1) + ' está marcado como ativo, mas não tem arquivo. Envie o arquivo do registrador desse sensor no campo dele ou desmarque o sensor.');
    let linhas;
    try {
      const rich = AutoRel_lerDadosEntradaRich_({ modoEntrada: 'FILE_ID', fileId: id, delimManual: delim });
      linhas = AutoRel_normalizarMatrizParaAnalise(rich.matrix, rich.displayMatrix, 1, dateStyle);
    } catch (e) {
      throw new Error('Arquivo do sensor S' + (s + 1) + ': ' + e.message);
    }
    series.push(linhas.map(function(l) { return { tempoDate: l.tempoDate, tempoStr: l.tempoStr, valor: l.temperaturas[0] }; }));
    if (!pressaoDeSensor && linhas.some(function(l) { return l.pressao !== null && isFinite(l.pressao); })) {
      pressaoDeSensor = linhas.filter(function(l) { return l.pressao !== null && isFinite(l.pressao); }).map(function(l) { return { tempoDate: l.tempoDate, tempoStr: l.tempoStr, valor: l.pressao }; });
    }
  }
  let seriePressao = null;
  const idPressao = String(payload.arquivoPressao || '').trim();
  if (idPressao && AutoRel_analisaPressao_(payload)) seriePressao = AutoRel_lerSeriePressaoArquivo_(idPressao, delim, dateStyle);
  else seriePressao = pressaoDeSensor;

  const mesc = SGO_QT_mesclarSeries_(series.concat([seriePressao]));
  const linhas = mesc.linhas.map(function(l) {
    return { tempoStr: l.tempoStr, tempoDate: l.tempoDate, temperaturas: l.valores.slice(0, nSensores), pressao: l.valores[nSensores] };
  });
  const resumo = {
    referencia: mesc.referencia < nSensores ? 'S' + (mesc.referencia + 1) : 'arquivo de pressão',
    toleranciaSeg: Math.round(mesc.toleranciaMs / 100) / 10,
    sensores: mesc.resumo.slice(0, nSensores).map(function(r, s) { return r ? Object.assign({ sensor: 'S' + (s + 1) }, r) : null; }).filter(Boolean),
    pressao: seriePressao ? Object.assign({ origem: idPressao ? 'arquivo próprio de pressão' : 'arquivo de um dos sensores' }, mesc.resumo[nSensores]) : null
  };
  return { linhas: linhas, resumo: resumo };
}

/**
 * Trava de emissão: dado com problema não vira documento. Lança erro com a lista do que
 * corrigir (o que aconteceu, por que, como corrigir).
 */
function AutoRel_exigirSemTravas_(travas) {
  if (!travas || !travas.length) return;
  throw new Error('O documento não foi emitido porque os dados têm ' + travas.length + ' problema(s) a corrigir: ' +
    travas.map(function(t, i) { return (i + 1) + ') ' + t.oQue + ' Por quê: ' + t.porQue + ' Como corrigir: ' + t.comoCorrigir; }).join(' '));
}
