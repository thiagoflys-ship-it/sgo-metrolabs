/****************************************************
 * METROLABS - CONVERSOR UNIVERSAL DATALOGGER - CADEIA DE FRIO
 * ARQUIVO: Main.gs
 * FUNÇÃO:
 * Backend principal do WebApp, no mesmo papel do Main.js do
 * motor de Autoclave:
 * - carregar a interface (Index.html)
 * - rotear chamadas da interface com segurança
 * - sincronizar parâmetros básicos com o frontend
 * - receber upload do arquivo do datalogger
 * - consultar CNPJ (BrasilAPI)
 * - executar o fluxo principal de conversão/análise
 * - gerar link de exportação PDF
 ****************************************************/

function CadeiaFrioRel_cfObterPastaPersistente_(propKey, nomePasta) {
  const props = PropertiesService.getScriptProperties();
  const idSalvo = props.getProperty(propKey);

  if (idSalvo) {
    try {
      return DriveApp.getFolderById(idSalvo);
    } catch (e) {
      // pasta salva não existe mais (ex.: apagada manualmente) — recria abaixo
    }
  }

  const folder = DriveApp.getRootFolder().createFolder(nomePasta);
  props.setProperty(propKey, folder.getId());
  return folder;
}





/** Chamadas que geram documento do ensaio: exigem o vínculo com o cadastro (CadeiaFrioRel_aplicarVinculo_). */
var CADEIAFRIO_FN_COM_VINCULO = ['apiConverter', 'apiGerarPlanilhaDados', 'apiGerarRascunhoCertificado', 'apiMontarCertificadoFinal', 'apiEnviarParaAprovacao', 'apiPreviaRelatorio'];

/**
 * Roteador seguro de funções chamadas pelo frontend.
 * 21/10/2026: a sessão vai para as funções (aprovação do responsável técnico) e o documento do ensaio
 * só sai com o equipamento escolhido no cadastro (relatório interno fica de fora). O relatório de ensaio
 * e a planilha de dados seguem o modelo novo; os anteriores voltam só pelas propriedades do módulo.
 */
function CadeiaFrioRel_apiDispatch(req) {
  req = req || {};
  const sessionId = String(req.sessionId || '');
  var sessaoDispatchRH = exigirSessao(sessionId); // SEGURANCA: exige sessao valida do portal (SGO_Auth)
  if (typeof SGO_bloquearRH_ === 'function') SGO_bloquearRH_(sessaoDispatchRH, 'o módulo Cadeia de frio'); // perfil RH: sem documentos técnicos (SGO_Auth.js)

  const fn = String(req.fn || '').trim();
  let payload = req.payload || {};
  if (CADEIAFRIO_FN_COM_VINCULO.indexOf(fn) >= 0 && !payload.modoRelatorioSimulado) {
    payload = CadeiaFrioRel_aplicarVinculo_(sessionId, payload);
  }
  const relatorioNovo = CadeiaFrioRel_relatorioModelo_() === 'NOVO';

  const allow = {
    apiPing: CadeiaFrioRel_apiPing,
    apiPreviewEntrada: CadeiaFrioRel_apiPreviewEntrada,
    apiConferirDados: CadeiaFrioRel_apiConferirDados,
    apiSugerirRampaEstabilizacao: CadeiaFrioRel_apiSugerirRampaEstabilizacao,
    apiConverter: CadeiaFrioRel_apiConverter,
    apiUploadArquivo: CadeiaFrioRel_apiUploadArquivo,
    apiConsultarCnpj: CadeiaFrioRel_apiConsultarCnpj,
    apiValidarSenhaSimuladorAdmin: CadeiaFrioRel_apiValidarSenhaSimuladorAdmin,
    // Relatório de ensaio: modelo novo (com aprovação) ou o certificado anterior (preservado).
    apiGerarRascunhoCertificado: relatorioNovo ? CadeiaFrioRel_apiRascunhoRelatorio : CadeiaFrioRel_apiGerarRascunhoCertificado,
    apiMontarCertificadoFinal: relatorioNovo ? CadeiaFrioRel_apiEmitirRelatorio : CadeiaFrioRel_apiMontarCertificadoFinal,
    apiPreviaRelatorio: CadeiaFrioRel_apiPreviaRelatorio,
    apiGerarPlanilhaDados: CadeiaFrioRel_apiGerarPlanilhaDados,
    // Aprovação do responsável técnico (SGO_QualifEmissao.js)
    apiEnviarParaAprovacao: CadeiaFrioRel_apiEnviarParaAprovacao,
    apiListarAprovacoes: CadeiaFrioRel_apiListarAprovacoes,
    apiPreverAprovacao: CadeiaFrioRel_apiPreverAprovacao,
    apiAprovarEmitir: CadeiaFrioRel_apiAprovarEmitir,
    apiDevolverAprovacao: CadeiaFrioRel_apiDevolverAprovacao,
    apiDefinirModelos: CadeiaFrioRel_apiDefinirModelos,
    // Cliente → unidade → equipamento (componente comum de escolha, JS_QualifVinculo.html)
    apiPesquisarClientes: CadeiaFrioRel_apiPesquisarClientes,
    apiListarUnidades: CadeiaFrioRel_apiListarUnidades,
    apiListarEquipamentos: CadeiaFrioRel_apiListarEquipamentos,
    apiIdentificacao: CadeiaFrioRel_apiIdentificacao,
    // 21/10/2026: completar no cadastro do equipamento o que falta (só campo vazio) e trazer dados de ensaios antigos.
    apiPreencherCadastro: function (p, s, id) { return SGO_QEQ_apiPreencherCadastro(p, s, id); },
    apiSugestoesCadastro: function (p, s, id) { return SGO_QEQ_apiSugestoesCadastro(p, s, id); }
  };

  if (!fn) {
    throw new Error('Função não informada.');
  }

  if (!allow[fn] || typeof allow[fn] !== 'function') {
    throw new Error('Função não permitida ou não encontrada: ' + fn);
  }

  const r = allow[fn](payload, sessaoDispatchRH, sessionId);
  if (/^api(EnviarParaAprovacao|AprovarEmitir|DevolverAprovacao|GerarPlanilhaDados|MontarCertificadoFinal)$/.test(fn) && typeof SGO_Pendencias_invalidar_ === 'function') { try { SGO_Pendencias_invalidar_(); } catch (eP) {} }
  return r;
}

// ------------------------------------------------------------
// SINCRONIZAÇÃO COM A INTERFACE
// ------------------------------------------------------------

function CadeiaFrioRel_apiPing(payload, sessao) {
  const laudosId = (CadeiaFrioRel_CFCFG.LAUDOS_FOLDER_ID && String(CadeiaFrioRel_CFCFG.LAUDOS_FOLDER_ID).length > 10)
    ? String(CadeiaFrioRel_CFCFG.LAUDOS_FOLDER_ID).trim()
    : '';

  const uploadsId = (CadeiaFrioRel_CFCFG.UPLOAD_FOLDER_ID && String(CadeiaFrioRel_CFCFG.UPLOAD_FOLDER_ID).length > 10)
    ? String(CadeiaFrioRel_CFCFG.UPLOAD_FOLDER_ID).trim()
    : '';

  const perfis = {};
  Object.keys(CadeiaFrioRel_CFCFG.PERFIS || {}).forEach(function(chave) {
    const p = CadeiaFrioRel_CFCFG.PERFIS[chave];
    perfis[chave] = {
      label: p.label,
      tMin: p.tMin,
      tMax: p.tMax,
      faixaConfiguravel: !!p.faixaConfiguravel,
      toleranciaOperacional: p.toleranciaOperacional,
      estudosDisponiveis: p.estudosDisponiveis || []
    };
  });

  return {
    ok: true,
    versao: String(CadeiaFrioRel_CFCFG.VERSION || '1.0') + ' Oficial',
    appTitle: CadeiaFrioRel_CFCFG.APP_TITLE || 'METROLABS',
    tz: CadeiaFrioRel_CFCFG.TZ || Session.getScriptTimeZone(),
    ts: Utilities.formatDate(new Date(), CadeiaFrioRel_CFCFG.TZ || Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss'),
    idleTimeout: Number(CadeiaFrioRel_CFCFG.IDLE_TIMEOUT_MINUTES) || 7,
    defaultDateStyle: String(CadeiaFrioRel_CFCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase(),
    defaultNSensores: Number(CadeiaFrioRel_CFCFG.DEFAULT_N || 12),
    sensoresPorVolume: CadeiaFrioRel_CFCFG.SENSORES_POR_VOLUME || {},
    perfis: perfis,
    estudos: CadeiaFrioRel_CFCFG.ESTUDOS || {},
    // 21/10/2026: endereço real da pasta própria do módulo (a pasta fixa do Google Drive antigo não existe no servidor).
    laudosUrl: (function() { try { return CadeiaFrioRel_pastaLaudos_().getUrl(); } catch (e) { return laudosId ? ('https://drive.google.com/drive/folders/' + laudosId) : ''; } })(),
    uploadsUrl: (function() { try { return CadeiaFrioRel_pastaUploads_().getUrl(); } catch (e) { return uploadsId ? ('https://drive.google.com/drive/folders/' + uploadsId) : ''; } })(),
    planilhaModelo: CadeiaFrioRel_planilhaModelo_(),
    relatorioModelo: CadeiaFrioRel_relatorioModelo_(),
    podeAprovarEmissao: !!(sessao && CadeiaFrioRel_ehAprovador_(sessao)),
    perfilSessao: String((sessao && sessao.perfil) || '').toUpperCase(),
    aConfirmar: CADEIAFRIO_QCFG.A_CONFIRMAR.slice(),
    simuladorAdmin: {
      habilitado: !!(CadeiaFrioRel_CFCFG.SIMULADOR_ADMIN && CadeiaFrioRel_CFCFG.SIMULADOR_ADMIN.habilitado !== false),
      intervaloSegundosDefault: Number(CadeiaFrioRel_CFCFG.SIMULADOR_ADMIN && CadeiaFrioRel_CFCFG.SIMULADOR_ADMIN.intervaloSegundosDefault) || 300
    }
  };
}

function CadeiaFrioRel_apiValidarSenhaSimuladorAdmin(payload) {
  payload = payload || {};
  CadeiaFrioRel_cfValidarSenhaSimuladorAdmin_(payload.senha);
  return { ok: true };
}

// ------------------------------------------------------------
// CONSULTA PÚBLICA DE CNPJ (BrasilAPI — mesmo padrão da Autoclave)
// ------------------------------------------------------------

function CadeiaFrioRel_apiConsultarCnpj(payload) {
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
    data.cep ? ('- CEP ' + CadeiaFrioRel_cfFormatarCep_(data.cep)) : ''
  ].filter(function(v) { return String(v || '').trim(); }).join(' ');

  return {
    ok: true,
    fonte: 'consulta pública',
    cnpj: CadeiaFrioRel_cfFormatarCnpj_(cnpj),
    razaoSocial: data.razao_social || '',
    nomeFantasia: data.nome_fantasia || '',
    cliente: data.razao_social || data.nome_fantasia || '',
    endereco: enderecoPartes.replace(/\s+/g, ' ').trim(),
    municipio: data.municipio || '',
    uf: data.uf || '',
    cep: CadeiaFrioRel_cfFormatarCep_(data.cep || ''),
    telefone: data.ddd_telefone_1 || data.ddd_telefone_2 || '',
    email: data.email || '',
    situacaoCadastral: data.descricao_situacao_cadastral || ''
  };
}

function CadeiaFrioRel_cfFormatarCnpj_(cnpj) {
  const s = String(cnpj || '').replace(/\D/g, '');
  if (s.length !== 14) return String(cnpj || '');
  return s.substring(0, 2) + '.' + s.substring(2, 5) + '.' + s.substring(5, 8) + '/' + s.substring(8, 12) + '-' + s.substring(12);
}

function CadeiaFrioRel_cfFormatarCep_(cep) {
  const s = String(cep || '').replace(/\D/g, '');
  if (s.length !== 8) return String(cep || '');
  return s.substring(0, 5) + '-' + s.substring(5);
}

// ------------------------------------------------------------
// UPLOAD DO ARQUIVO DO DATALOGGER
// ------------------------------------------------------------

function CadeiaFrioRel_apiUploadArquivo(payload) {
  payload = payload || {};

  const fileNameOriginal = String(payload.fileName || 'arquivo_sem_nome.txt').trim();
  const fileName = CadeiaFrioRel_cfSanitizarNomeArquivo_(fileNameOriginal || 'arquivo_sem_nome.txt');
  const mimeType = String(payload.mimeType || MimeType.PLAIN_TEXT).trim();
  const base64 = String(payload.base64 || '').trim();

  if (!base64) {
    throw new Error('Conteúdo do arquivo não recebido para upload.');
  }

  const folderIdConfigurado = (CadeiaFrioRel_CFCFG.UPLOAD_FOLDER_ID && String(CadeiaFrioRel_CFCFG.UPLOAD_FOLDER_ID).length > 10)
    ? String(CadeiaFrioRel_CFCFG.UPLOAD_FOLDER_ID).trim()
    : '';

  try {
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, mimeType, fileName);
    // 21/10/2026: pasta própria de envios do módulo (a chave genérica antiga podia ser de outro módulo).
    const folder = CadeiaFrioRel_pastaUploads_();
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

function CadeiaFrioRel_cfSanitizarNomeArquivo_(nome) {
  return String(nome || 'arquivo_sem_nome.txt')
    .replace(/[\\\/:*?"<>|#%]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

// ------------------------------------------------------------
// PRÉ-VISUALIZAÇÃO DOS DADOS IMPORTADOS
// ------------------------------------------------------------

function CadeiaFrioRel_apiPreviewEntrada(payload) {
  payload = payload || {};

  if (String(payload.modoEntrada || '').toUpperCase().trim() === 'SIMULADO_ADMIN') {
    const chavePerfil = String(payload.perfil || '').trim();
    const perfilCfg = CadeiaFrioRel_CFCFG.PERFIS && CadeiaFrioRel_CFCFG.PERFIS[chavePerfil];
    if (!perfilCfg) {
      throw new Error('Perfil de equipamento inválido ou não configurado: ' + chavePerfil);
    }

    const faixa = {
      tMin: perfilCfg.faixaConfiguravel ? CadeiaFrioRel_cfParseNumeroMain_(payload.faixaTMin, perfilCfg.tMin) : perfilCfg.tMin,
      tMax: perfilCfg.faixaConfiguravel ? CadeiaFrioRel_cfParseNumeroMain_(payload.faixaTMax, perfilCfg.tMax) : perfilCfg.tMax
    };

    const estudosConfig = CadeiaFrioRel_cfMontarConfigEstudos_(payload, perfilCfg);
    if (!estudosConfig.length) {
      throw new Error('Selecione ao menos um estudo (Distribuição, Abertura de Porta, Queda de Energia ou Autonomia) para pré-visualizar os dados reconstituídos.');
    }

    const simularMultiArquivo = !!(payload.simulacao && payload.simulacao.multiArquivoPorSensor);
    const dadosSimulados = CadeiaFrioRel_cfGerarOuReaproveitarDadosSimulados_(payload, estudosConfig, faixa, simularMultiArquivo);
    const nSensoresPrev = Array.isArray(dadosSimulados[0] && dadosSimulados[0].temperaturas) ? dadosSimulados[0].temperaturas.length : 0;
    const header = ['Tempo'].concat(Array.from({ length: nSensoresPrev }, function(_, i) { return 'S' + (i + 1); }));
    const previewSim = [header].concat(dadosSimulados.slice(0, CadeiaFrioRel_CFCFG.PREVIEW_ROWS || 20).map(function(row) {
      return [row.tempoStr].concat(row.temperaturas || []);
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
        observacao: simularMultiArquivo
          ? 'Dados reconstituídos como dataloggers individuais por sensor e mesclados pela linha do tempo mais completa.'
          : 'Dados reconstituídos gerados para análise interna pelo laboratório de metrologia.'
      }
    };
  }

  if (String(payload.modoEntrada || '').toUpperCase().trim() === 'ARQUIVO_POR_SENSOR') {
    const nSensores = CadeiaFrioRel_cfClampIntMain_(payload.nSensores, 1, 60, CadeiaFrioRel_CFCFG.DEFAULT_N || 12);
    const sensoresAtivos = CadeiaFrioRel_cfNormalizarSensoresAtivosMain_(payload.sensoresAtivos, nSensores);
    const dateStylePrev = String(payload.dateStyle || CadeiaFrioRel_CFCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();

    const seriesPorSensor = CadeiaFrioRel_cfLerSeriesPorSensorArquivo_(payload, nSensores, sensoresAtivos, dateStylePrev);
    const mesclado = CadeiaFrioRel_cfMesclarSeriesPorSensor_(seriesPorSensor);

    const headerMulti = ['Tempo'].concat(Array.from({ length: nSensores }, function(_, i) { return 'S' + (i + 1); }));
    const previewMulti = [headerMulti].concat(mesclado.slice(0, CadeiaFrioRel_CFCFG.PREVIEW_ROWS || 20).map(function(row) {
      return [row.tempoStr].concat(row.temperaturas || []);
    }));

    const nulosPorSensor = Array.from({ length: nSensores }, function(_, s) {
      return mesclado.reduce(function(acc, row) { return acc + (row.temperaturas[s] === null ? 1 : 0); }, 0);
    });

    return {
      ok: true,
      rows: mesclado.length,
      cols: headerMulti.length,
      preview: previewMulti,
      diagnostico: {
        modoEntrada: 'ARQUIVO_POR_SENSOR',
        qtdTemperaturas: nSensores,
        observacao: 'Séries de ' + seriesPorSensor.filter(function(s) { return s; }).length +
          ' sensor(es) mescladas pela linha do tempo mais completa. Pontos sem correspondência por sensor (S1..S' + nSensores + '): ' +
          nulosPorSensor.join(', ') + '.'
      }
    };
  }

  const rich = CadeiaFrioRel_lerDadosEntradaRich_(Object.assign({}, payload, { permitirVariasAbas: true }));
  const nSensores = CadeiaFrioRel_cfClampIntMain_(payload.nSensores, 1, 60, CadeiaFrioRel_CFCFG.DEFAULT_N || 12);
  const dateStyle = String(payload.dateStyle || CadeiaFrioRel_CFCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();
  // 21/10/2026: arquivo com uma aba por estudo: a prévia mostra o período de cada aba.
  const normalized=(rich.abas&&rich.abas.length>1)?CadeiaFrioRel_cfJuntarAbas_(rich.abas,nSensores,dateStyle):CadeiaFrioRel_normalizarMatrizParaAnalise(rich.matrix,rich.displayMatrix,nSensores,dateStyle);
  if(normalized._abas)(rich.diagnostico=rich.diagnostico||{}).abas=normalized._abas.map(function(a){return {nome:a.nome,inicio:a.inicio,fim:a.fim,leituras:a.leituras};});
  const header=['Data/hora ('+CadeiaFrioRel_CFCFG.TZ+')'];
  for(let i=0;i<nSensores;i++)header.push('S'+(i+1)+' (°C)');
  const preview=[header].concat(normalized.slice(0,CadeiaFrioRel_CFCFG.PREVIEW_ROWS||20).map(function(row){return [row.tempoStr].concat(row.temperaturas);}));
  const diagnostico=rich.diagnostico||{};
  diagnostico.detectedDateStyle=dateStyle==='AUTO'?diagnostico.detectedDateStyle:dateStyle;
  diagnostico.inicioImportado=normalized[0].tempoStr;
  diagnostico.fimImportado=normalized[normalized.length-1].tempoStr;
  return {ok:true,rows:normalized.length,cols:header.length,preview:preview,diagnostico:diagnostico};
}

// ------------------------------------------------------------
// CÉREBRO PRINCIPAL DO CONVERSOR
// ------------------------------------------------------------

/**
 * Lê e normaliza o dataset completo (arquivo único, por sensor ou
 * simulado), independente do estudo — usado tanto pela análise final
 * quanto pela sugestão de rampa de estabilização (que precisa do
 * dataset antes de qualquer estudo estar 100% configurado).
 */
function CadeiaFrioRel_cfLerDadosCompletos_(payload, modoEntradaNormalizado, nSensores, sensoresAtivos, dateStyle, estudosConfig, faixa) {
  let dadosCompletos;

  if (modoEntradaNormalizado === 'SIMULADO_ADMIN') {
    const simularMultiArquivo = !!(payload.simulacao && payload.simulacao.multiArquivoPorSensor);
    dadosCompletos = CadeiaFrioRel_cfGerarOuReaproveitarDadosSimulados_(payload, estudosConfig, faixa, simularMultiArquivo);
  } else if (modoEntradaNormalizado === 'ARQUIVO_POR_SENSOR') {
    const seriesPorSensor = CadeiaFrioRel_cfLerSeriesPorSensorArquivo_(payload, nSensores, sensoresAtivos, dateStyle);
    dadosCompletos = CadeiaFrioRel_cfMesclarSeriesPorSensor_(seriesPorSensor);
  } else {
    const rich = CadeiaFrioRel_lerDadosEntradaRich_(Object.assign({}, payload, { permitirVariasAbas: true }));
    if (!rich || !rich.matrix || !rich.matrix.length) {
      throw new Error('Não foi possível ler os dados de entrada.');
    }
    dadosCompletos = (rich.abas && rich.abas.length > 1)
      ? CadeiaFrioRel_cfJuntarAbas_(rich.abas, nSensores, dateStyle)
      : CadeiaFrioRel_normalizarMatrizParaAnalise(rich.matrix, rich.displayMatrix, nSensores, dateStyle);
  }

  if (!dadosCompletos || !dadosCompletos.length) {
    throw new Error('Não foi possível normalizar os dados para análise.');
  }

  return dadosCompletos;
}

/**
 * 21/10/2026: arquivo único com uma aba por estudo (24 h, abertura de porta, queda de energia).
 * Cada aba é normalizada sozinha, as leituras ficam marcadas com o nome da aba e a lista sai em ordem
 * de horário, com o resumo das abas em dadosCompletos._abas. Abas com horários sobrepostos são recusadas
 * (o mesmo horário em duas abas misturaria leituras de estudos diferentes).
 */
function CadeiaFrioRel_cfJuntarAbas_(abas, nSensores, dateStyle) {
  const partes = abas.map(function(a) {
    let linhas;
    try {
      linhas = CadeiaFrioRel_normalizarMatrizParaAnalise(a.matrix, a.displayMatrix, nSensores, dateStyle);
    } catch (e) {
      throw new Error('Aba "' + a.nome + '" do arquivo do registrador: ' + (e.message || e));
    }
    linhas.forEach(function(l) { l.aba = a.nome; });
    const ms = function(l) { return CadeiaFrioRel_cfConverterTempoParaMs_(l.tempoDate || l.tempoStr); };
    return { nome: a.nome, linhas: linhas, inicioMs: ms(linhas[0]), fimMs: ms(linhas[linhas.length - 1]), inicio: linhas[0].tempoStr, fim: linhas[linhas.length - 1].tempoStr };
  }).sort(function(x, y) { return x.inicioMs - y.inicioMs; });
  for (let i = 1; i < partes.length; i++) {
    if (partes[i].inicioMs <= partes[i - 1].fimMs) {
      throw new Error('As abas "' + partes[i - 1].nome + '" (de ' + partes[i - 1].inicio + ' a ' + partes[i - 1].fim + ') e "' + partes[i].nome + '" (de ' + partes[i].inicio + ' a ' + partes[i].fim +
        ') do arquivo do registrador têm leituras no mesmo período. Deixe no arquivo uma aba por estudo, sem repetir horários, ou envie só a aba do estudo.');
    }
  }
  const todas = [];
  partes.forEach(function(p) { p.linhas.forEach(function(l) { todas.push(l); }); });
  todas._abas = partes.map(function(p) { return { nome: p.nome, inicio: p.inicio, fim: p.fim, inicioMs: p.inicioMs, fimMs: p.fimMs, leituras: p.linhas.length }; });
  return todas;
}

/** Aba de cada estudo: evento → a aba que contém o início do evento; distribuição e autonomia → a que mais cobre a janela. */
function CadeiaFrioRel_cfAbaDoEstudo_(abas, cfg) {
  if (!abas || abas.length < 2) return null;
  if (isFinite(cfg.inicioEventoMs)) {
    const folga = 60000;
    return abas.filter(function(a) { return cfg.inicioEventoMs >= a.inicioMs - folga && cfg.inicioEventoMs <= a.fimMs + folga; })[0] || null;
  }
  let melhor = null, maior = 0;
  abas.forEach(function(a) {
    const comum = Math.min(a.fimMs, cfg.janelaFimMs) - Math.max(a.inicioMs, cfg.janelaInicioMs);
    if (comum > maior) { maior = comum; melhor = a; }
  });
  return melhor;
}

/** Leituras do estudo: as da sua aba (arquivo com várias abas) dentro da janela do estudo. */
function CadeiaFrioRel_cfFatiaDoEstudo_(dadosCompletos, cfg) {
  const aba = CadeiaFrioRel_cfAbaDoEstudo_(dadosCompletos._abas, cfg);
  const base = aba ? dadosCompletos.filter(function(l) { return l.aba === aba.nome; }) : dadosCompletos;
  const fatia = CadeiaFrioRel_cfFatiarDadosPorJanela_(base, cfg.janelaInicioMs, cfg.janelaFimMs);
  if (aba) fatia.aba = aba.nome;
  return fatia;
}

/** Período importado, em texto: "de dd/mm/aaaa hh:mm:ss a dd/mm/aaaa hh:mm:ss" e, com várias abas, o período de cada aba. */
function CadeiaFrioRel_cfPeriodoImportadoTexto_(dadosCompletos) {
  if (!dadosCompletos || !dadosCompletos.length) return 'o arquivo não tem leituras';
  const abas = dadosCompletos._abas;
  if (abas && abas.length > 1) {
    return 'as leituras importadas estão em ' + abas.length + ' abas: ' + abas.map(function(a) { return '"' + a.nome + '" (de ' + a.inicio + ' a ' + a.fim + ')'; }).join('; ');
  }
  return 'as leituras importadas vão de ' + dadosCompletos[0].tempoStr + ' a ' + dadosCompletos[dadosCompletos.length - 1].tempoStr;
}

/**
 * Sugere (sem aplicar) o fim de uma rampa de estabilização inicial para
 * o estudo de Distribuição — chamada pela tela quando o técnico já
 * preencheu início/fim da Distribuição, antes de gerar o laudo. Nunca
 * decide sozinha: devolve a sugestão pra tela pré-preencher um campo
 * que o técnico confirma ou ajusta.
 */
function CadeiaFrioRel_apiSugerirRampaEstabilizacao(payload) {
  payload = payload || {};

  const chavePerfil = String(payload.perfil || '').trim();
  const perfilCfg = CadeiaFrioRel_CFCFG.PERFIS && CadeiaFrioRel_CFCFG.PERFIS[chavePerfil];
  if (!perfilCfg) throw new Error('Perfil de equipamento inválido ou não configurado: ' + chavePerfil);

  const volumeLitros = CadeiaFrioRel_cfParseNumeroMain_(payload.volumeLitros);
  const conjugado = !!payload.equipamentoConjugado;
  const sensoresMinimos = CadeiaFrioRel_cfCalcularSensoresMinimos_(volumeLitros, conjugado);
  const nSensores = CadeiaFrioRel_cfClampIntMain_(payload.nSensores, 1, 60, sensoresMinimos);
  const dateStyle = String(payload.dateStyle || CadeiaFrioRel_CFCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();

  const faixa = {
    tMin: perfilCfg.faixaConfiguravel ? CadeiaFrioRel_cfParseNumeroMain_(payload.faixaTMin, perfilCfg.tMin) : perfilCfg.tMin,
    tMax: perfilCfg.faixaConfiguravel ? CadeiaFrioRel_cfParseNumeroMain_(payload.faixaTMax, perfilCfg.tMax) : perfilCfg.tMax,
    tolerancia: CadeiaFrioRel_cfParseNumeroMain_(payload.tolerancia, perfilCfg.toleranciaOperacional)
  };

  const sensoresAtivos = CadeiaFrioRel_cfNormalizarSensoresAtivosMain_(payload.sensoresAtivos, nSensores);
  const estudosConfig = CadeiaFrioRel_cfMontarConfigEstudos_(payload, perfilCfg);
  const cfgDist = estudosConfig.filter(function(c) { return c.tipoEstudo === 'DISTRIBUICAO_VAZIO' || c.tipoEstudo === 'DISTRIBUICAO_CARGA'; })[0];
  if (!cfgDist) throw new Error('Preencha início e fim do estudo de Distribuição antes de pedir a sugestão de rampa.');

  const modoEntradaNormalizado = String(payload.modoEntrada || 'FILE_ID').toUpperCase().trim();
  const dadosCompletos = CadeiaFrioRel_medirEtapa_('Leitura e normalização',function(){return CadeiaFrioRel_cfLerDadosCompletos_(payload, modoEntradaNormalizado, nSensores, sensoresAtivos, dateStyle, estudosConfig, faixa);});

  const fatia = CadeiaFrioRel_cfFatiaDoEstudo_(dadosCompletos, cfgDist);
  if (!fatia.length) throw new Error('Nenhuma leitura do arquivo cai no período informado para o estudo de Distribuição (de ' + cfgDist.janelaInicio + ' a ' + cfgDist.janelaFim + '): ' + CadeiaFrioRel_cfPeriodoImportadoTexto_(dadosCompletos) + '.');

  const sugestao = CadeiaFrioRel_cfSugerirFimRampaEstabilizacao_(fatia, faixa, sensoresAtivos);
  return { ok: true, sugestao: sugestao };
}

/**
 * Executa o pipeline completo de leitura + normalização + análise
 * (Engine.js), compartilhado pelos dois tipos de relatório: o laudo em
 * Planilha (CadeiaFrioRel_apiConverter) e o Certificado em HTML (Certificado.js).
 * Mantém as duas saídas usando exatamente os mesmos números — nenhuma
 * das duas recalcula nada por conta própria.
 */
function CadeiaFrioRel_cfExecutarAnaliseCompleta_(payload) {
  payload = payload || {};

  const chavePerfil = String(payload.perfil || '').trim();
  const perfilCfg = CadeiaFrioRel_CFCFG.PERFIS && CadeiaFrioRel_CFCFG.PERFIS[chavePerfil];

  if (!perfilCfg) {
    throw new Error('Perfil de equipamento inválido ou não configurado: ' + chavePerfil);
  }

  const volumeLitros = CadeiaFrioRel_cfParseNumeroMain_(payload.volumeLitros);
  const conjugado = !!payload.equipamentoConjugado;
  const sensoresMinimos = CadeiaFrioRel_cfCalcularSensoresMinimos_(volumeLitros, conjugado);

  const nSensores = CadeiaFrioRel_cfClampIntMain_(payload.nSensores, 1, 60, sensoresMinimos);
  const dateStyle = String(payload.dateStyle || CadeiaFrioRel_CFCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();

  const faixa = {
    tMin: perfilCfg.faixaConfiguravel ? CadeiaFrioRel_cfParseNumeroMain_(payload.faixaTMin, perfilCfg.tMin) : perfilCfg.tMin,
    tMax: perfilCfg.faixaConfiguravel ? CadeiaFrioRel_cfParseNumeroMain_(payload.faixaTMax, perfilCfg.tMax) : perfilCfg.tMax,
    tolerancia: CadeiaFrioRel_cfParseNumeroMain_(payload.tolerancia, perfilCfg.toleranciaOperacional)
  };

  const sensoresAtivos = CadeiaFrioRel_cfNormalizarSensoresAtivosMain_(payload.sensoresAtivos, nSensores);

  const estudosConfig = CadeiaFrioRel_cfMontarConfigEstudos_(payload, perfilCfg);
  if (!estudosConfig.length) {
    throw new Error('Selecione ao menos um estudo (Distribuição, Abertura de Porta, Queda de Energia ou Autonomia) para gerar o laudo.');
  }

  const modoEntradaNormalizado = String(payload.modoEntrada || 'FILE_ID').toUpperCase().trim();
  const dadosCompletos = CadeiaFrioRel_cfLerDadosCompletos_(payload, modoEntradaNormalizado, nSensores, sensoresAtivos, dateStyle, estudosConfig, faixa);

  const analises = estudosConfig.map(function(cfg) {
    const fatia = CadeiaFrioRel_cfFatiaDoEstudo_(dadosCompletos, cfg);
    if (!fatia.length) {
      // 21/10/2026: a mensagem mostra o período importado, para conferir na hora o horário digitado.
      throw new Error('Nenhuma leitura do arquivo cai no período informado para o estudo "' + CadeiaFrioRel_cfLabelEstudo_(cfg.tipoEstudo) + '" (' +
        (cfg.inicioEvento ? 'início do evento ' + cfg.inicioEvento : 'de ' + cfg.janelaInicio + ' a ' + cfg.janelaFim) + '): ' + CadeiaFrioRel_cfPeriodoImportadoTexto_(dadosCompletos) +
        '. Na seção 3 (Estudos do ensaio), corrija a data e a hora (dd/mm/aaaa hh:mm:ss) ou, na seção 4, envie o arquivo do registrador que contém esse período.');
    }

    let analise;
    if (cfg.tipoEstudo === 'DISTRIBUICAO_VAZIO' || cfg.tipoEstudo === 'DISTRIBUICAO_CARGA') {
      analise = CadeiaFrioRel_cfAnalisarDistribuicao(fatia, faixa, sensoresAtivos, {
        tipoEstudo: cfg.tipoEstudo,
        fimRampaEstabilizacao: cfg.fimRampaEstabilizacao
      });
    } else if (cfg.tipoEstudo === 'ABERTURA_PORTA' || cfg.tipoEstudo === 'QUEDA_ENERGIA') {
      analise = CadeiaFrioRel_cfAnalisarEventoRuptura(fatia, faixa, sensoresAtivos, {
        inicioEvento: cfg.inicioEvento,
        fimEvento: cfg.fimEvento
      }, cfg.tipoEstudo, {
        tipoAbertura: cfg.tipoAbertura,
        tempoAlvoMinutos: cfg.tempoAlvoMinutos,
        // 21/10/2026: para a trava de início fora das leituras dizer o período importado e a leitura mais próxima.
        dadosArquivo: dadosCompletos
      });
    } else if (cfg.tipoEstudo === 'AUTONOMIA') {
      analise = CadeiaFrioRel_cfAnalisarAutonomia(fatia, faixa, sensoresAtivos, { tempoAlvoMinutos: cfg.tempoAlvoMinutos });
    } else {
      throw new Error('Tipo de estudo não implementado: ' + cfg.tipoEstudo);
    }

    CadeiaFrioRel_cfAplicarMarcadoresSimulacaoNaAnalise_(analise, payload);
    analise._dadosFatia = fatia;
    return analise;
  });

  return {
    perfilCfg: perfilCfg,
    faixa: faixa,
    nSensores: nSensores,
    sensoresAtivos: sensoresAtivos,
    dadosCompletos: dadosCompletos,
    analises: analises,
    // 21/10/2026: resumo do alinhamento dos registradores individuais (anexo dos documentos).
    mesclagem: dadosCompletos._mesclagem || null
  };
}

/**
 * Planilha de dados. 21/10/2026: o modelo novo (A4 paisagem, SGO_CadeiaFrioRel_PlanilhaDados.js) é o padrão;
 * o modelo anterior (Google Planilhas, SGO_CadeiaFrioRel_Planilha.js) fica preservado e volta só com
 * CADEIAFRIO_PLANILHA_MODELO = ANTERIOR em Chaves e senhas. Documentos antigos continuam na pasta do cliente.
 */
function CadeiaFrioRel_apiConverter(payload, sessao) {
  if (CadeiaFrioRel_planilhaModelo_() !== 'ANTERIOR') return CadeiaFrioRel_apiGerarPlanilhaDados(payload, sessao);
  return CadeiaFrioRel_apiConverterModeloAnterior_(payload);
}

/** Modelo anterior da planilha de dados (Google Planilhas → PDF em paisagem). */
function CadeiaFrioRel_apiConverterModeloAnterior_(payload) {
  payload = payload || {};

  const resultado = CadeiaFrioRel_cfExecutarAnaliseCompleta_(payload);
  const perfilCfg = resultado.perfilCfg;
  const analises = resultado.analises;
  const dadosCompletos = resultado.dadosCompletos;
  const nSensores = resultado.nSensores;

  const infoPlanilha = CadeiaFrioRel_medirEtapa_('Montagem da planilha',function(){return CadeiaFrioRel_cfGerarPlanilhaCadeiaFrio(dadosCompletos, analises, payload, perfilCfg);});
  if (!infoPlanilha || !infoPlanilha.spreadsheetId) {
    throw new Error('Falha ao gerar a planilha do relatório.');
  }

  const ss = SpreadsheetApp.openById(infoPlanilha.spreadsheetId);
  CadeiaFrioRel_medirEtapa_('Gráficos',function(){return CadeiaFrioRel_cfGerarGraficos(ss, analises, nSensores);});
  SpreadsheetApp.flush();

  const pdfUrl = CadeiaFrioRel_cfConstruirLinkPdfPaisagem(infoPlanilha.spreadsheetId);
  // Regra do dono: o PDF da planilha (relatório de dados) também fica na pasta do cliente. Nunca lança.
  const salvoPlanilha = SGO_DocSalvar_salvarPdfPlanilha_(pdfUrl, payload, CadeiaFrioRel_pastaLaudos_, 'Relatório de dados Cadeia de Frio', CadeiaFrioRel_CFCFG.TZ);
  const statusConsolidado = CadeiaFrioRel_cfConsolidarStatus_(analises);

  return {
    ok: true,
    statusAprovacao: statusConsolidado,
    spreadsheetId: infoPlanilha.spreadsheetId,
    spreadsheetUrl: infoPlanilha.spreadsheetUrl || ss.getUrl(),
    pdfUrl: pdfUrl,
    salvoNaPasta: salvoPlanilha.salvoNaPasta,
    pdfId: salvoPlanilha.pdfId,
    pdfSalvoUrl: salvoPlanilha.pdfSalvoUrl,
    pdfNome: salvoPlanilha.pdfNome,
    pastaUrl: salvoPlanilha.pastaUrl,
    avisoSalvar: salvoPlanilha.avisoSalvar,
    estudos: analises.map(function(a) {
      return {
        tipoEstudo: a.tipoEstudo,
        statusAprovacao: a.statusAprovacao || 'INFORMATIVO',
        motivosReprovacao: a.motivosReprovacao || [],
        alertasAnalise: a.alertasAnalise || []
      };
    })
  };
}

// ------------------------------------------------------------
// LEITURA DO MODO "UM ARQUIVO POR SENSOR" (datalogger individual)
// ------------------------------------------------------------

/**
 * Lê um arquivo por sensor ativo (payload.arquivosPorSensor, alinhado
 * por índice com a grade de sensores da tela) e normaliza cada um como
 * uma série de 1 sensor só, reaproveitando CadeiaFrioRel_lerDadosEntradaRich_ e
 * CadeiaFrioRel_normalizarMatrizParaAnalise sem mudança — o mesmo parser do modo de
 * arquivo único já lida com o formato Tempo+Temperatura (a coluna
 * "Numero"/índice do datalogger individual é simplesmente ignorada,
 * pois não bate com nenhum padrão de coluna reconhecido).
 * Sensores inativos ficam com série null (não exigem arquivo).
 */
function CadeiaFrioRel_cfLerSeriesPorSensorArquivo_(payload, nSensores, sensoresAtivos, dateStyle) {
  const arquivos = Array.isArray(payload.arquivosPorSensor) ? payload.arquivosPorSensor : [];
  const delimManual = String(payload.delimManual || 'AUTO').toUpperCase().trim();

  const series = [];
  for (let s = 0; s < nSensores; s++) {
    if (!sensoresAtivos[s]) {
      series.push(null);
      continue;
    }

    const fileId = String(arquivos[s] || '').trim();
    if (!fileId) {
      throw new Error('Sensor S' + (s + 1) + ' está marcado como ativo, mas nenhum arquivo foi informado para ele (modo "um arquivo por sensor").');
    }

    let rich;
    try {rich = CadeiaFrioRel_lerDadosEntradaRich_({ modoEntrada: 'FILE_ID', fileId: fileId, delimManual: delimManual });}
    catch(e){throw new Error('Sensor S'+(s+1)+': '+(e.message||e));}
    if (!rich || !rich.matrix || !rich.matrix.length) {
      throw new Error('Não foi possível ler o arquivo do sensor S' + (s + 1) + '.');
    }

    let serieSensor;
    try {
      serieSensor = CadeiaFrioRel_normalizarMatrizParaAnalise(rich.matrix, rich.displayMatrix, 1, dateStyle);
    } catch (e) {
      throw new Error('Falha ao normalizar o arquivo do sensor S' + (s + 1) + ': ' + e.message);
    }

    series.push(serieSensor);
  }

  return series;
}

// ------------------------------------------------------------
// MONTAGEM DA CONFIGURAÇÃO DOS ESTUDOS HABILITADOS
// (suporta múltiplos estudos no MESMO arquivo de datalogger —
// cada um recortado por janela de tempo própria)
// ------------------------------------------------------------

function CadeiaFrioRel_cfMontarConfigEstudos_(payload, perfilCfg) {
  const estudos = payload.estudos || {};
  const disponiveis = perfilCfg.estudosDisponiveis || [];
  const margemMin = Number(CadeiaFrioRel_CFCFG.MARGEM_CONTEXTO_EVENTO_MINUTOS) || 60;
  const out = [];

  const dist = estudos.distribuicao || {};
  const tipoDist = String(dist.tipo || '').toUpperCase().trim();
  if (tipoDist) {
    if (disponiveis.indexOf(tipoDist) === -1) {
      throw new Error('O perfil "' + perfilCfg.label + '" não tem o estudo "' + CadeiaFrioRel_cfLabelEstudo_(tipoDist) + '" disponível.');
    }
    const inicioMs = CadeiaFrioRel_cfConverterTempoParaMs_(dist.inicio);
    const fimMs = CadeiaFrioRel_cfConverterTempoParaMs_(dist.fim);
    if (!isFinite(inicioMs) || !isFinite(fimMs)) {
      throw new Error('Informe início e fim válidos para o estudo de Distribuição.');
    }
    if (inicioMs >= fimMs) {
      throw new Error('O início do estudo de Distribuição deve ser anterior ao fim.');
    }
    out.push({
      tipoEstudo: tipoDist,
      janelaInicioMs: inicioMs,
      janelaFimMs: fimMs,
      janelaInicio: CadeiaFrioRel_cfLimparHorario_(dist.inicio),
      janelaFim: CadeiaFrioRel_cfLimparHorario_(dist.fim),
      resultadoDesejado: dist.resultadoDesejado,
      fimRampaEstabilizacao: String(dist.fimRampaEstabilizacao || '').trim()
    });
  }

  const porta = estudos.aberturaPorta || {};
  if (porta.habilitado) {
    if (disponiveis.indexOf('ABERTURA_PORTA') === -1) {
      throw new Error('O perfil "' + perfilCfg.label + '" não tem o estudo de Abertura de Porta disponível.');
    }
    out.push(CadeiaFrioRel_cfMontarConfigEvento_('ABERTURA_PORTA', porta, margemMin));
  }

  const energia = estudos.quedaEnergia || {};
  if (energia.habilitado) {
    if (disponiveis.indexOf('QUEDA_ENERGIA') === -1) {
      throw new Error('O perfil "' + perfilCfg.label + '" não tem o estudo de Queda de Energia disponível.');
    }
    out.push(CadeiaFrioRel_cfMontarConfigEvento_('QUEDA_ENERGIA', energia, margemMin));
  }

  const autonomia = estudos.autonomia || {};
  if (autonomia.habilitado) {
    if (disponiveis.indexOf('AUTONOMIA') === -1) {
      throw new Error('O perfil "' + perfilCfg.label + '" não tem o estudo de Autonomia disponível.');
    }
    const inicioMs = CadeiaFrioRel_cfConverterTempoParaMs_(autonomia.inicio);
    const fimMs = CadeiaFrioRel_cfConverterTempoParaMs_(autonomia.fim);
    if (!isFinite(inicioMs) || !isFinite(fimMs)) {
      throw new Error('Informe início e fim válidos para o estudo de Autonomia.');
    }
    if (inicioMs >= fimMs) {
      throw new Error('O início do estudo de Autonomia deve ser anterior ao fim.');
    }
    out.push({
      tipoEstudo: 'AUTONOMIA',
      janelaInicioMs: inicioMs,
      janelaFimMs: fimMs,
      janelaInicio: CadeiaFrioRel_cfLimparHorario_(autonomia.inicio),
      janelaFim: CadeiaFrioRel_cfLimparHorario_(autonomia.fim),
      autonomiaEstimadaMinutos: CadeiaFrioRel_cfParseNumeroMain_(autonomia.autonomiaEstimadaMinutos, null),
      // 21/10/2026: autonomia mínima exigida (opcional): com ela o estudo aprova ou reprova.
      tempoAlvoMinutos: CadeiaFrioRel_cfParseNumeroMain_(autonomia.tempoAlvoMinutos, null)
    });
  }

  return out;
}

function CadeiaFrioRel_cfLimparHorario_(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }

function CadeiaFrioRel_cfMontarConfigEvento_(tipoEstudo, cfgEvento, margemMin) {
  const inicioEventoMs = CadeiaFrioRel_cfConverterTempoParaMs_(cfgEvento.inicioEvento);
  if (!isFinite(inicioEventoMs)) {
    throw new Error('Informe o início do evento para o estudo "' + CadeiaFrioRel_cfLabelEstudo_(tipoEstudo) + '".');
  }

  const fimEventoStr = String(cfgEvento.fimEvento || '').trim();
  const fimEventoMs = fimEventoStr ? CadeiaFrioRel_cfConverterTempoParaMs_(fimEventoStr) : null;
  if (fimEventoStr && !isFinite(fimEventoMs)) {
    throw new Error('Fim do evento inválido para o estudo "' + CadeiaFrioRel_cfLabelEstudo_(tipoEstudo) + '".');
  }
  if (fimEventoMs !== null && fimEventoMs <= inicioEventoMs) {
    throw new Error('O fim do evento deve ser posterior ao início, no estudo "' + CadeiaFrioRel_cfLabelEstudo_(tipoEstudo) + '".');
  }

  const margemMs = margemMin * 60000;

  return {
    tipoEstudo: tipoEstudo,
    janelaInicioMs: inicioEventoMs - margemMs,
    janelaFimMs: (fimEventoMs !== null ? fimEventoMs : inicioEventoMs) + margemMs,
    inicioEventoMs: inicioEventoMs,
    fimEventoMs: fimEventoMs,
    // 21/10/2026: horário colado da planilha (data e hora separadas por tabulação) sai com um espaço só nas mensagens e no documento.
    inicioEvento: CadeiaFrioRel_cfLimparHorario_(cfgEvento.inicioEvento),
    fimEvento: CadeiaFrioRel_cfLimparHorario_(cfgEvento.fimEvento),
    tipoAbertura: cfgEvento.tipoAbertura || null,
    tempoAlvoMinutos: cfgEvento.tempoAlvoMinutos,
    resultadoDesejado: cfgEvento.resultadoDesejado
  };
}

/**
 * Resultado do conjunto de estudos (21/10/2026): REPROVADO se algum estudo reprovou; APROVADO se ao menos um
 * estudo tem critério e foi aprovado; INFORMATIVO se nenhum estudo tem critério de aprovação. Estudo sem critério
 * (caracterização) não aprova nem reprova. Não existe mais "aprovado com alerta".
 */
function CadeiaFrioRel_cfConsolidarStatus_(analises) {
  if (!analises || !analises.length) return 'INFORMATIVO';
  const st = analises.map(function(a) { return CadeiaFrioRel_cfNormalizarStatus_(a.statusAprovacao); });
  if (st.indexOf('REPROVADO') >= 0) return 'REPROVADO';
  if (st.indexOf('APROVADO') >= 0) return 'APROVADO';
  return 'INFORMATIVO';
}

/** Status único: APROVADO, REPROVADO ou INFORMATIVO (caracterização e o antigo "com alerta" incluídos). */
function CadeiaFrioRel_cfNormalizarStatus_(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'REPROVADO') return 'REPROVADO';
  if (s.indexOf('APROVADO') === 0) return 'APROVADO';
  return 'INFORMATIVO';
}

function CadeiaFrioRel_cfAplicarMarcadoresSimulacaoNaAnalise_(analise, payload) {
  if (!analise || !payload || !payload.modoRelatorioSimulado) return;
  const meta = payload._simulacaoMeta || {};
  analise.origemDados = 'ANALISE_MANUAL_RECONSTITUIDA';
  analise.observacoesAnalise = Array.isArray(analise.observacoesAnalise) ? analise.observacoesAnalise : [];
  analise.alertasAnalise = Array.isArray(analise.alertasAnalise) ? analise.alertasAnalise : [];

  const avisoInterno = 'RELATÓRIO INTERNO - ANÁLISE MANUAL DO LABORATÓRIO DE METROLOGIA';
  if (analise.observacoesAnalise.indexOf(avisoInterno) === -1) {
    analise.observacoesAnalise.unshift(avisoInterno);
  }
  analise.observacoesAnalise.push(
    'Parâmetros da análise manual: estudo ' + (meta.inicioEstudo || '-') + ' a ' + (meta.fimEstudo || '-') +
    ' | alvo ' + (meta.temperaturaAlvo || '-') + ' °C | intervalo ' + (meta.intervaloSegundos || '-') +
    ' s | gerado em ' + (meta.geradoEm || '-') + ' | operador ' + (meta.operador || '-') +
    (meta.autonomiaEstimadaMinutos ? (' | autonomia estimada ' + meta.autonomiaEstimadaMinutos + ' min') : '')
  );
}

function CadeiaFrioRel_cfConstruirLinkPdfPaisagem(id) {
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

function CadeiaFrioRel_cfParseNumeroMain_(valor, fallback) {
  if (valor === null || valor === undefined || valor === '') return fallback === undefined ? null : fallback;
  const n = Number(String(valor).replace(',', '.').trim());
  return isFinite(n) ? n : (fallback === undefined ? null : fallback);
}

function CadeiaFrioRel_cfClampIntMain_(valor, min, max, fallback) {
  let n = Number(valor);
  if (!isFinite(n)) n = fallback;
  n = Math.round(n);
  if (n < min) n = min;
  if (n > max) n = max;
  return n;
}

function CadeiaFrioRel_cfNormalizarSensoresAtivosMain_(sensoresAtivos, nSensores) {
  if (!Array.isArray(sensoresAtivos) || !sensoresAtivos.length) {
    return Array.from({ length: nSensores }, function() { return true; });
  }

  const out = [];
  for (let i = 0; i < nSensores; i++) {
    out.push(typeof sensoresAtivos[i] === 'undefined' ? true : !!sensoresAtivos[i]);
  }
  return out;
}

/**
 * Carregamento sob demanda do módulo (CSS+HTML+JS do Cadeia de Frio):
 * em vez de embutir esse conteúdo grande no bundle inicial do Portal
 * (que somado aos outros módulos passou de um limite do carregamento
 * inicial via document.write e travava o resto da página), o conteúdo
 * só é buscado do servidor quando o usuário realmente abre o módulo.
 *
 * IMPORTANTE — descoberto na prática: HtmlService.createHtmlOutputFromFile()
 * (ler um arquivo .html) trunca/distorce silenciosamente conteúdo
 * grande (tratado como HTML e sujeito a algum tipo de sanitização) —
 * por isso o conteúdo NÃO fica num arquivo .html, e sim como uma
 * string JS comum em SGO_CadeiaFrioRel_ConteudoModulo.js — arquivos
 * .js não passam por esse processamento e já são usados com
 * dezenas de KB em outros módulos deste mesmo Portal sem problema.
 * A função CadeiaFrioRel_obterConteudoModulo() está nesse arquivo.
 */

function CadeiaFrioRel_medirEtapa_(etapa,fn){
  const inicio=Date.now();
  console.log("CadeiaFrio: início "+etapa);
  try{return fn();}catch(e){throw new Error(etapa+": "+(e&&e.message?e.message:e));}
  finally{console.log("CadeiaFrio: fim "+etapa+" "+(Date.now()-inicio)+" ms");}
}
