/****************************************************
 * METROLABS - CONVERSOR UNIVERSAL DATALOGGER - ESTUFA+BANHO-MARIA
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

function EstufaBanhoRel_ebObterPastaPersistente_(propKey, nomePasta) {
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

/**
 * Roteador seguro de funções chamadas pelo frontend.
 */
function EstufaBanhoRel_apiDispatch(req) {
  req = req || {};
  exigirSessao(String(req.sessionId || '')); // SEGURANCA: exige sessao valida do portal (SGO_Auth)
  const fn = String(req.fn || '').trim();
  const payload = req.payload || {};
  const allow = {
    apiPing: EstufaBanhoRel_apiPing,
    apiPreviewEntrada: EstufaBanhoRel_apiPreviewEntrada,
    apiSugerirRampaEstabilizacao: EstufaBanhoRel_apiSugerirRampaEstabilizacao,
    apiConverter: EstufaBanhoRel_apiConverter,
    apiUploadArquivo: EstufaBanhoRel_apiUploadArquivo,
    apiConsultarCnpj: EstufaBanhoRel_apiConsultarCnpj,
    apiValidarSenhaSimuladorAdmin: EstufaBanhoRel_apiValidarSenhaSimuladorAdmin,
    apiValidarSenhaModoPersonalizado: EstufaBanhoRel_apiValidarSenhaModoPersonalizado,
    apiGerarRascunhoCertificado: EstufaBanhoRel_apiGerarRascunhoCertificado,
    apiMontarCertificadoFinal: EstufaBanhoRel_apiMontarCertificadoFinal
  };
  if (!fn) {
    throw new Error('Função não informada.');
  }
  if (!allow[fn] || typeof allow[fn] !== 'function') {
    throw new Error('Função não permitida ou não encontrada: ' + fn);
  }
  return allow[fn](payload);
}

// ------------------------------------------------------------
// SINCRONIZAÇÃO COM A INTERFACE
// ------------------------------------------------------------

function EstufaBanhoRel_apiPing() {
  const laudosId = EstufaBanhoRel_EBCFG.LAUDOS_FOLDER_ID && String(EstufaBanhoRel_EBCFG.LAUDOS_FOLDER_ID).length > 10 ? String(EstufaBanhoRel_EBCFG.LAUDOS_FOLDER_ID).trim() : '';
  const uploadsId = EstufaBanhoRel_EBCFG.UPLOAD_FOLDER_ID && String(EstufaBanhoRel_EBCFG.UPLOAD_FOLDER_ID).length > 10 ? String(EstufaBanhoRel_EBCFG.UPLOAD_FOLDER_ID).trim() : '';
  const perfis = {};
  Object.keys(EstufaBanhoRel_EBCFG.PERFIS || {}).forEach(function (chave) {
    const p = EstufaBanhoRel_EBCFG.PERFIS[chave];
    perfis[chave] = {
      label: p.label,
      tMin: p.tMin,
      tMax: p.tMax,
      faixaConfiguravel: !!p.faixaConfiguravel,
      toleranciaOperacional: p.toleranciaOperacional,
      estudosDisponiveis: p.estudosDisponiveis || [],
      anexo: p.anexo || '',
      minSensores: p.minSensores || null,
      temLetalidade: !!p.temLetalidade
    };
  });
  return {
    ok: true,
    versao: String(EstufaBanhoRel_EBCFG.VERSION || '1.0') + ' Oficial',
    appTitle: EstufaBanhoRel_EBCFG.APP_TITLE || 'METROLABS',
    tz: EstufaBanhoRel_EBCFG.TZ || Session.getScriptTimeZone(),
    ts: Utilities.formatDate(new Date(), EstufaBanhoRel_EBCFG.TZ || Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss'),
    idleTimeout: Number(EstufaBanhoRel_EBCFG.IDLE_TIMEOUT_MINUTES) || 7,
    defaultDateStyle: String(EstufaBanhoRel_EBCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase(),
    defaultNSensores: Number(EstufaBanhoRel_EBCFG.DEFAULT_N || 12),
    sensoresPorVolume: EstufaBanhoRel_EBCFG.SENSORES_POR_VOLUME || {},
    perfis: perfis,
    estudos: EstufaBanhoRel_EBCFG.ESTUDOS || {},
    laudosUrl: laudosId ? 'https://drive.google.com/drive/folders/' + laudosId : '',
    uploadsUrl: uploadsId ? 'https://drive.google.com/drive/folders/' + uploadsId : '',
    simuladorAdmin: {
      habilitado: !!(EstufaBanhoRel_EBCFG.SIMULADOR_ADMIN && EstufaBanhoRel_EBCFG.SIMULADOR_ADMIN.habilitado !== false),
      intervaloSegundosDefault: Number(EstufaBanhoRel_EBCFG.SIMULADOR_ADMIN && EstufaBanhoRel_EBCFG.SIMULADOR_ADMIN.intervaloSegundosDefault) || 300
    }
  };
}
function EstufaBanhoRel_apiValidarSenhaSimuladorAdmin(payload) {
  payload = payload || {};
  EstufaBanhoRel_ebValidarSenhaSimuladorAdmin_(payload.senha);
  return {
    ok: true
  };
}

// ------------------------------------------------------------
// CONSULTA PÚBLICA DE CNPJ (BrasilAPI — mesmo padrão da Autoclave)
// ------------------------------------------------------------

function EstufaBanhoRel_apiConsultarCnpj(payload) {
  payload = payload || {};
  const cnpj = String(payload.cnpj || '').replace(/\D/g, '');
  if (!/^\d{14}$/.test(cnpj)) {
    throw new Error('Informe um CNPJ válido com 14 dígitos.');
  }
  const url = 'https://brasilapi.com.br/api/cnpj/v1/' + encodeURIComponent(cnpj);
  let res;
  try {
    res = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        Accept: 'application/json'
      }
    });
  } catch (err) {
    throw new Error('Falha ao consultar CNPJ na BrasilAPI: ' + err.message);
  }
  const code = res.getResponseCode();
  const body = res.getContentText() || '';
  if (code === 404) {
    throw new Error('CNPJ não encontrado na base pública.');
  }
  if (code < 200 || code >= 300) {
    throw new Error('BrasilAPI retornou HTTP ' + code + ' ao consultar CNPJ.');
  }
  let data;
  try {
    data = JSON.parse(body);
  } catch (errJson) {
    throw new Error('Resposta inválida da API de CNPJ.');
  }
  const enderecoPartes = [data.descricao_tipo_de_logradouro || '', data.logradouro || '', data.numero || '', data.complemento ? '- ' + data.complemento : '', data.bairro ? '- ' + data.bairro : '', data.municipio ? '- ' + data.municipio : '', data.uf ? '/' + data.uf : '', data.cep ? '- CEP ' + EstufaBanhoRel_ebFormatarCep_(data.cep) : ''].filter(function (v) {
    return String(v || '').trim();
  }).join(' ');
  return {
    ok: true,
    fonte: 'BrasilAPI',
    cnpj: EstufaBanhoRel_ebFormatarCnpj_(cnpj),
    razaoSocial: data.razao_social || '',
    nomeFantasia: data.nome_fantasia || '',
    cliente: data.razao_social || data.nome_fantasia || '',
    endereco: enderecoPartes.replace(/\s+/g, ' ').trim(),
    municipio: data.municipio || '',
    uf: data.uf || '',
    cep: EstufaBanhoRel_ebFormatarCep_(data.cep || ''),
    telefone: data.ddd_telefone_1 || data.ddd_telefone_2 || '',
    email: data.email || '',
    situacaoCadastral: data.descricao_situacao_cadastral || ''
  };
}
function EstufaBanhoRel_ebFormatarCnpj_(cnpj) {
  const s = String(cnpj || '').replace(/\D/g, '');
  if (s.length !== 14) return String(cnpj || '');
  return s.substring(0, 2) + '.' + s.substring(2, 5) + '.' + s.substring(5, 8) + '/' + s.substring(8, 12) + '-' + s.substring(12);
}
function EstufaBanhoRel_ebFormatarCep_(cep) {
  const s = String(cep || '').replace(/\D/g, '');
  if (s.length !== 8) return String(cep || '');
  return s.substring(0, 5) + '-' + s.substring(5);
}

// ------------------------------------------------------------
// UPLOAD DO ARQUIVO DO DATALOGGER
// ------------------------------------------------------------

function EstufaBanhoRel_apiUploadArquivo(payload) {
  payload = payload || {};
  const fileNameOriginal = String(payload.fileName || 'arquivo_sem_nome.txt').trim();
  const fileName = EstufaBanhoRel_ebSanitizarNomeArquivo_(fileNameOriginal || 'arquivo_sem_nome.txt');
  const mimeType = String(payload.mimeType || MimeType.PLAIN_TEXT).trim();
  const base64 = String(payload.base64 || '').trim();
  if (!base64) {
    throw new Error('Conteúdo do arquivo não recebido para upload.');
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) throw new Error('Conteúdo do upload inválido. Selecione o arquivo novamente.');
  if (base64.length > 20 * 1024 * 1024) throw new Error('Arquivo muito grande para upload (máximo aproximado de 15 MB). Divida o arquivo por período.');
  const folderIdConfigurado = EstufaBanhoRel_EBCFG.UPLOAD_FOLDER_ID && String(EstufaBanhoRel_EBCFG.UPLOAD_FOLDER_ID).length > 10 ? String(EstufaBanhoRel_EBCFG.UPLOAD_FOLDER_ID).trim() : '';
  try {
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, mimeType, fileName);
    const folder = folderIdConfigurado ? DriveApp.getFolderById(folderIdConfigurado) : EstufaBanhoRel_ebObterPastaPersistente_('UPLOAD_FOLDER_ID', 'Estufa+Banho-maria - Uploads');
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
function EstufaBanhoRel_ebSanitizarNomeArquivo_(nome) {
  return String(nome || 'arquivo_sem_nome.txt').replace(/[\\\/:*?"<>|#%]+/g, '_').replace(/\s+/g, ' ').trim();
}

// ------------------------------------------------------------
// PRÉ-VISUALIZAÇÃO DOS DADOS IMPORTADOS
// ------------------------------------------------------------

function EstufaBanhoRel_apiPreviewEntrada(payload) {
  payload = payload || {};
  if (String(payload.modoEntrada || '').toUpperCase().trim() === 'SIMULADO_ADMIN') {
    const chavePerfil = String(payload.perfil || '').trim();
    const perfilCfg = EstufaBanhoRel_EBCFG.PERFIS && EstufaBanhoRel_EBCFG.PERFIS[chavePerfil];
    if (!perfilCfg) {
      throw new Error('Perfil de equipamento inválido ou não configurado: ' + chavePerfil);
    }
    const faixa = {
      tMin: perfilCfg.faixaConfiguravel ? EstufaBanhoRel_ebParseNumeroMain_(payload.faixaTMin, perfilCfg.tMin) : perfilCfg.tMin,
      tMax: perfilCfg.faixaConfiguravel ? EstufaBanhoRel_ebParseNumeroMain_(payload.faixaTMax, perfilCfg.tMax) : perfilCfg.tMax
    };
    const estudosConfig = EstufaBanhoRel_ebMontarConfigEstudos_(payload, perfilCfg);
    if (!estudosConfig.length) {
      throw new Error('Selecione ao menos um estudo (Distribuição, Abertura de Porta, Queda de Energia ou Autonomia) para pré-visualizar os dados reconstituídos.');
    }
    const simularMultiArquivo = !!(payload.simulacao && payload.simulacao.multiArquivoPorSensor);
    const dadosSimulados = EstufaBanhoRel_ebGerarOuReaproveitarDadosSimulados_(payload, estudosConfig, faixa, simularMultiArquivo);
    const nSensoresPrev = Array.isArray(dadosSimulados[0] && dadosSimulados[0].temperaturas) ? dadosSimulados[0].temperaturas.length : 0;
    const header = ['Tempo'].concat(Array.from({
      length: nSensoresPrev
    }, function (_, i) {
      return 'S' + (i + 1);
    }));
    const previewSim = [header].concat(dadosSimulados.slice(0, EstufaBanhoRel_EBCFG.PREVIEW_ROWS || 20).map(function (row) {
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
        observacao: simularMultiArquivo ? 'Dados reconstituídos como dataloggers individuais por sensor e mesclados pela linha do tempo mais completa.' : 'Dados reconstituídos gerados para análise interna pelo laboratório de metrologia.'
      }
    };
  }
  if (String(payload.modoEntrada || '').toUpperCase().trim() === 'ARQUIVO_POR_SENSOR') {
    const nSensores = EstufaBanhoRel_ebClampIntMain_(payload.nSensores, 1, 60, EstufaBanhoRel_EBCFG.DEFAULT_N || 12);
    const sensoresAtivos = EstufaBanhoRel_ebNormalizarSensoresAtivosMain_(payload.sensoresAtivos, nSensores);
    const dateStylePrev = String(payload.dateStyle || EstufaBanhoRel_EBCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();
    const seriesPorSensor = EstufaBanhoRel_ebLerSeriesPorSensorArquivo_(payload, nSensores, sensoresAtivos, dateStylePrev);
    const mesclado = EstufaBanhoRel_ebMesclarSeriesPorSensor_(seriesPorSensor);
    const headerMulti = ['Tempo'].concat(Array.from({
      length: nSensores
    }, function (_, i) {
      return 'S' + (i + 1);
    }));
    const previewMulti = [headerMulti].concat(mesclado.slice(0, EstufaBanhoRel_EBCFG.PREVIEW_ROWS || 20).map(function (row) {
      return [row.tempoStr].concat(row.temperaturas || []);
    }));
    const nulosPorSensor = Array.from({
      length: nSensores
    }, function (_, s) {
      return mesclado.reduce(function (acc, row) {
        return acc + (row.temperaturas[s] === null ? 1 : 0);
      }, 0);
    });
    return {
      ok: true,
      rows: mesclado.length,
      cols: headerMulti.length,
      preview: previewMulti,
      diagnostico: {
        modoEntrada: 'ARQUIVO_POR_SENSOR',
        qtdTemperaturas: nSensores,
        observacao: 'Séries de ' + seriesPorSensor.filter(function (s) {
          return s;
        }).length + ' sensor(es) mescladas pela linha do tempo mais completa. Pontos sem correspondência por sensor (S1..S' + nSensores + '): ' + nulosPorSensor.join(', ') + '.'
      }
    };
  }
  const rich = EstufaBanhoRel_lerDadosEntradaRich_(payload);
  const nSensores = EstufaBanhoRel_ebClampIntMain_(payload.nSensores, 1, 60, EstufaBanhoRel_EBCFG.DEFAULT_N || 12);
  const dateStyle = String(payload.dateStyle || EstufaBanhoRel_EBCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();
  const normalized=EstufaBanhoRel_normalizarMatrizParaAnalise(rich.matrix,rich.displayMatrix,nSensores,dateStyle);
  const header=['Data/hora ('+EstufaBanhoRel_EBCFG.TZ+')'];
  for(let i=0;i<nSensores;i++)header.push('S'+(i+1)+' (°C)');
  const preview=[header].concat(normalized.slice(0,EstufaBanhoRel_EBCFG.PREVIEW_ROWS||20).map(function(row){return [row.tempoStr].concat(row.temperaturas);}));
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
function EstufaBanhoRel_ebLerDadosCompletos_(payload, modoEntradaNormalizado, nSensores, sensoresAtivos, dateStyle, estudosConfig, faixa) {
  let dadosCompletos;
  if (modoEntradaNormalizado === 'SIMULADO_ADMIN') {
    const simularMultiArquivo = !!(payload.simulacao && payload.simulacao.multiArquivoPorSensor);
    dadosCompletos = EstufaBanhoRel_ebGerarOuReaproveitarDadosSimulados_(payload, estudosConfig, faixa, simularMultiArquivo);
  } else if (modoEntradaNormalizado === 'ARQUIVO_POR_SENSOR') {
    const seriesPorSensor = EstufaBanhoRel_ebLerSeriesPorSensorArquivo_(payload, nSensores, sensoresAtivos, dateStyle);
    dadosCompletos = EstufaBanhoRel_ebMesclarSeriesPorSensor_(seriesPorSensor);
  } else {
    const rich = EstufaBanhoRel_lerDadosEntradaRich_(payload);
    if (!rich || !rich.matrix || !rich.matrix.length) {
      throw new Error('Não foi possível ler os dados de entrada.');
    }
    dadosCompletos = EstufaBanhoRel_normalizarMatrizParaAnalise(rich.matrix, rich.displayMatrix, nSensores, dateStyle, sensoresAtivos);
  }
  if (!dadosCompletos || !dadosCompletos.length) {
    throw new Error('Não foi possível normalizar os dados para análise.');
  }
  return dadosCompletos;
}

/**
 * Sugere (sem aplicar) o fim de uma rampa de estabilização inicial para
 * o estudo de Distribuição — chamada pela tela quando o técnico já
 * preencheu início/fim da Distribuição, antes de gerar o laudo. Nunca
 * decide sozinha: devolve a sugestão pra tela pré-preencher um campo
 * que o técnico confirma ou ajusta.
 */
function EstufaBanhoRel_apiSugerirRampaEstabilizacao(payload) {
  payload = payload || {};
  const chavePerfil = String(payload.perfil || '').trim();
  const perfilCfg = EstufaBanhoRel_EBCFG.PERFIS && EstufaBanhoRel_EBCFG.PERFIS[chavePerfil];
  if (!perfilCfg) throw new Error('Perfil de equipamento inválido ou não configurado: ' + chavePerfil);
  const sensoresMinimos = EstufaBanhoRel_ebObterSensoresMinimosPerfil_(perfilCfg, payload);
  const nSensores = EstufaBanhoRel_ebClampIntMain_(payload.nSensores, 1, 60, sensoresMinimos);
  EstufaBanhoRel_ebValidarMinimoSensores_(perfilCfg, nSensores, payload);
  const dateStyle = String(payload.dateStyle || EstufaBanhoRel_EBCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();
  const faixa = {
    tMin: perfilCfg.faixaConfiguravel ? EstufaBanhoRel_ebParseNumeroMain_(payload.faixaTMin, perfilCfg.tMin) : perfilCfg.tMin,
    tMax: perfilCfg.faixaConfiguravel ? EstufaBanhoRel_ebParseNumeroMain_(payload.faixaTMax, perfilCfg.tMax) : perfilCfg.tMax,
    tolerancia: EstufaBanhoRel_ebParseNumeroMain_(payload.tolerancia, perfilCfg.toleranciaOperacional)
  };
  const sensoresAtivos = EstufaBanhoRel_ebNormalizarSensoresAtivosMain_(payload.sensoresAtivos, nSensores);
  const estudosConfig = EstufaBanhoRel_ebMontarConfigEstudos_(payload, perfilCfg);
  const cfgDist = estudosConfig.filter(function (c) {
    return c.tipoEstudo === 'DISTRIBUICAO_VAZIO' || c.tipoEstudo === 'DISTRIBUICAO_CARGA';
  })[0];
  if (!cfgDist) throw new Error('Preencha início e fim do estudo de Distribuição antes de pedir a sugestão de rampa.');
  const modoEntradaNormalizado = String(payload.modoEntrada || 'FILE_ID').toUpperCase().trim();
  const dadosCompletos = EstufaBanhoRel_ebLerDadosCompletos_(payload, modoEntradaNormalizado, nSensores, sensoresAtivos, dateStyle, estudosConfig, faixa);
  const fatia = EstufaBanhoRel_ebFatiarDadosPorJanela_(dadosCompletos, cfgDist.janelaInicioMs, cfgDist.janelaFimMs);
  if (!fatia.length) throw new Error(EstufaBanhoRel_ebMensagemJanela_(dadosCompletos,cfgDist));
  const sugestao = EstufaBanhoRel_ebSugerirFimRampaEstabilizacao_(fatia, faixa, sensoresAtivos);
  return {
    ok: true,
    sugestao: sugestao
  };
}

/**
 * Executa o pipeline completo de leitura + normalização + análise
 * (Engine.js), compartilhado pelos dois tipos de relatório: o laudo em
 * Planilha (apiConverter) e o Certificado em HTML (Certificado.js).
 * Mantém as duas saídas usando exatamente os mesmos números — nenhuma
 * das duas recalcula nada por conta própria.
 */
/**
 * Modo Personalizado (com senha) hoje já não bloqueia ensaio com duração
 * abaixo das 24h recomendadas pela norma (Engine.js só adiciona um alerta
 * informativo, nunca reprova por isso) — mas o alerta aparecia destacado
 * no laudo como se fosse uma não-conformidade, mesmo quando o técnico
 * está seguindo deliberadamente a metodologia própria do setor de
 * qualidade do cliente (que define seu próprio critério de tempo/
 * temperatura). Pedido explícito do usuário (2026-08-03): quando o Modo
 * Personalizado está ativo, esse aviso específico vira uma OBSERVAÇÃO
 * (neutra, mesma informação, sem estar entre os "alertas") em vez de
 * ficar destacado como alerta — não some do laudo, só muda de seção.
 */
function EstufaBanhoRel_ebReclassificarAlertaDuracaoModoPersonalizado_(analise, payload) {
  if (!analise || !payload || !payload.modoPersonalizado) return;
  if (!Array.isArray(analise.alertasAnalise) || !analise.alertasAnalise.length) return;

  const restantes = [];
  analise.alertasAnalise.forEach(function(msg) {
    if (String(msg || '').indexOf('abaixo das 24h contínuas recomendadas') !== -1) {
      analise.observacoesAnalise = Array.isArray(analise.observacoesAnalise) ? analise.observacoesAnalise : [];
      analise.observacoesAnalise.push(msg + ' (avaliado sob metodologia própria do cliente — Modo Personalizado.)');
    } else {
      restantes.push(msg);
    }
  });
  analise.alertasAnalise = restantes;
}

function EstufaBanhoRel_ebExecutarAnaliseCompleta_(payload) {
  payload = payload || {};
  const chavePerfil = String(payload.perfil || '').trim();
  const perfilCfg = EstufaBanhoRel_EBCFG.PERFIS && EstufaBanhoRel_EBCFG.PERFIS[chavePerfil];
  if (!perfilCfg) {
    throw new Error('Perfil de equipamento inválido ou não configurado: ' + chavePerfil);
  }
  const sensoresMinimos = EstufaBanhoRel_ebObterSensoresMinimosPerfil_(perfilCfg, payload);
  const nSensores = EstufaBanhoRel_ebClampIntMain_(payload.nSensores, 1, 60, sensoresMinimos);
  EstufaBanhoRel_ebValidarMinimoSensores_(perfilCfg, nSensores, payload);
  const dateStyle = String(payload.dateStyle || EstufaBanhoRel_EBCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();
  const faixa = {
    tMin: perfilCfg.faixaConfiguravel ? EstufaBanhoRel_ebParseNumeroMain_(payload.faixaTMin, perfilCfg.tMin) : perfilCfg.tMin,
    tMax: perfilCfg.faixaConfiguravel ? EstufaBanhoRel_ebParseNumeroMain_(payload.faixaTMax, perfilCfg.tMax) : perfilCfg.tMax,
    tolerancia: EstufaBanhoRel_ebParseNumeroMain_(payload.tolerancia, perfilCfg.toleranciaOperacional)
  };
  EstufaBanhoRel_ebValidarFaixaMain_(faixa);
  const sensoresAtivos = EstufaBanhoRel_ebNormalizarSensoresAtivosMain_(payload.sensoresAtivos, nSensores);
  const estudosConfig = EstufaBanhoRel_ebMontarConfigEstudos_(payload, perfilCfg);
  if (!estudosConfig.length) {
    throw new Error('Selecione ao menos um estudo (Distribuição, Abertura de Porta, Queda de Energia ou Autonomia) para gerar o laudo.');
  }
  const modoEntradaNormalizado = String(payload.modoEntrada || 'FILE_ID').toUpperCase().trim();
  const dadosCompletos = EstufaBanhoRel_ebLerDadosCompletos_(payload, modoEntradaNormalizado, nSensores, sensoresAtivos, dateStyle, estudosConfig, faixa);
  const analises = estudosConfig.map(function (cfg) {
    const fatia = EstufaBanhoRel_ebFatiarDadosPorJanela_(dadosCompletos, cfg.janelaInicioMs, cfg.janelaFimMs);
    if (!fatia.length) {
      throw new Error(EstufaBanhoRel_ebMensagemJanela_(dadosCompletos,cfg));
    }
    if(!cfg.repeticoesJanelas){EstufaBanhoRel_ebValidarDadosSelecionados_(fatia,sensoresAtivos,EstufaBanhoRel_ebLabelEstudo_(cfg.tipoEstudo));if(EstufaBanhoRel_ebEhDistribuicao_(cfg.tipoEstudo)||cfg.tipoEstudo==='AUTONOMIA')EstufaBanhoRel_ebValidarCoberturaJanela_(fatia,cfg,EstufaBanhoRel_ebLabelEstudo_(cfg.tipoEstudo));}
    let analise;
    let dadosAvaliados = fatia;
    if (EstufaBanhoRel_ebEhDistribuicao_(cfg.tipoEstudo)) {
      analise = EstufaBanhoRel_ebAnalisarDistribuicao(fatia, faixa, sensoresAtivos, {
        tipoEstudo: cfg.tipoEstudo,
        fimRampaEstabilizacao: cfg.fimRampaEstabilizacao,
        duracaoLivre: chavePerfil==='SECADORA_TRAQUEIAS'||chavePerfil==='BANHO_MARIA'
      });
    } else if (cfg.tipoEstudo === 'ABERTURA_PORTA' || cfg.tipoEstudo === 'QUEDA_ENERGIA') {
      analise = EstufaBanhoRel_ebAnalisarEventoRuptura(fatia, faixa, sensoresAtivos, {
        inicioEvento: cfg.inicioEvento,
        fimEvento: cfg.fimEvento
      }, cfg.tipoEstudo, {
        tipoAbertura: cfg.tipoAbertura,
        tempoAlvoMinutos: cfg.tempoAlvoMinutos
      });
    } else if (cfg.tipoEstudo === 'AUTONOMIA') {
      analise = EstufaBanhoRel_ebAnalisarAutonomia(fatia, faixa, sensoresAtivos, {});
    } else if (cfg.tipoEstudo === 'DISTRIBUICAO_VAZIO_E') {
      // Anexo E exige 3 repetições independentes — cada uma tem sua
      // própria janela, recortada direto de dadosCompletos (a "fatia"
      // acima é só o envelope das 3, não usada aqui).
      const repeticoesDados = cfg.repeticoesJanelas.map(function (j, idx) {
        const f = EstufaBanhoRel_ebFatiarDadosPorJanela_(dadosCompletos, j.janelaInicioMs, j.janelaFimMs);
        if (!f.length) {
          throw new Error(EstufaBanhoRel_ebMensagemJanela_(dadosCompletos,j,'Repetição '+(idx+1)+' de '+EstufaBanhoRel_ebLabelEstudo_(cfg.tipoEstudo)));
        }
        EstufaBanhoRel_ebValidarDadosSelecionados_(f,sensoresAtivos,'Repetição '+(idx+1));
        EstufaBanhoRel_ebValidarCoberturaJanela_(f,j,'Repetição '+(idx+1));
        return f;
      });
      dadosAvaliados = [].concat.apply([], repeticoesDados);
      analise = EstufaBanhoRel_ebAnalisarDistribuicaoVazioE_(repeticoesDados, faixa, sensoresAtivos, {});
    } else if (cfg.tipoEstudo === 'PENETRACAO_CARGA_E') {
      const repeticoesDados = cfg.repeticoesJanelas.map(function (j, idx) {
        const f = EstufaBanhoRel_ebFatiarDadosPorJanela_(dadosCompletos, j.janelaInicioMs, j.janelaFimMs);
        if (!f.length) {
          throw new Error(EstufaBanhoRel_ebMensagemJanela_(dadosCompletos,j,'Repetição '+(idx+1)+' de '+EstufaBanhoRel_ebLabelEstudo_(cfg.tipoEstudo)));
        }
        EstufaBanhoRel_ebValidarDadosSelecionados_(f,sensoresAtivos,'Repetição '+(idx+1));
        EstufaBanhoRel_ebValidarCoberturaJanela_(f,j,'Repetição '+(idx+1));
        return f;
      });
      dadosAvaliados = [].concat.apply([], repeticoesDados);
      const cfgLetalidade = EstufaBanhoRel_EBCFG.LETALIDADE[cfg.tipoLetalidade];
      analise = EstufaBanhoRel_ebAnalisarPenetracaoELetalidade_(repeticoesDados, faixa, sensoresAtivos, cfgLetalidade, {
        valorMinimoExigido: cfg.valorMinimoExigido,
        indicadorPorRepeticao: cfg.repeticoesJanelas.map(function (j) {
          return j.indicador;
        }),
        registroCicloPorRepeticao: cfg.repeticoesJanelas.map(function (j) {
          return j.registroCicloFileId;
        })
      });
    } else {
      throw new Error('Tipo de estudo não implementado: ' + cfg.tipoEstudo);
    }
    EstufaBanhoRel_ebAplicarMarcadoresSimulacaoNaAnalise_(analise, payload);
    EstufaBanhoRel_ebReclassificarAlertaDuracaoModoPersonalizado_(analise, payload);
    analise.sensoresAtivos = sensoresAtivos.slice();
    analise.sensoresUtilizados = sensoresAtivos.reduce(function(a,v,i){if(v)a.push("S"+(i+1));return a;},[]);
    analise._dadosFatia = dadosAvaliados;
    return analise;
  });
  return {
    perfilCfg: perfilCfg,
    faixa: faixa,
    nSensores: nSensores,
    sensoresAtivos: sensoresAtivos,
    dadosCompletos: dadosCompletos,
    analises: analises
  };
}
function EstufaBanhoRel_apiConverter(payload) {
  payload = payload || {};
  const resultado = EstufaBanhoRel_ebExecutarAnaliseCompleta_(payload);
  const perfilCfg = resultado.perfilCfg;
  const analises = resultado.analises;
  const dadosCompletos = resultado.dadosCompletos;
  const nSensores = resultado.nSensores;
  const infoPlanilha = EstufaBanhoRel_ebGerarPlanilhaEstufaBanhomaria(dadosCompletos, analises, payload, perfilCfg);
  if (!infoPlanilha || !infoPlanilha.spreadsheetId) {
    throw new Error('Falha ao gerar a planilha do relatório.');
  }
  const ss = SpreadsheetApp.openById(infoPlanilha.spreadsheetId);
  EstufaBanhoRel_ebGerarGraficos(ss, analises, nSensores);
  SpreadsheetApp.flush();
  const pdfUrl = EstufaBanhoRel_ebConstruirLinkPdfPaisagem(infoPlanilha.spreadsheetId);
  const statusConsolidado = EstufaBanhoRel_ebConsolidarStatus_(analises);
  return {
    ok: true,
    statusAprovacao: statusConsolidado,
    spreadsheetId: infoPlanilha.spreadsheetId,
    spreadsheetUrl: infoPlanilha.spreadsheetUrl || ss.getUrl(),
    pdfUrl: pdfUrl,
    estudos: analises.map(function (a) {
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
 * uma série de 1 sensor só, reaproveitando lerDadosEntradaRich_ e
 * normalizarMatrizParaAnalise sem mudança — o mesmo parser do modo de
 * arquivo único já lida com o formato Tempo+Temperatura (a coluna
 * "Numero"/índice do datalogger individual é simplesmente ignorada,
 * pois não bate com nenhum padrão de coluna reconhecido).
 * Sensores inativos ficam com série null (não exigem arquivo).
 */
function EstufaBanhoRel_ebLerSeriesPorSensorArquivo_(payload, nSensores, sensoresAtivos, dateStyle) {
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
    const rich = EstufaBanhoRel_lerDadosEntradaRich_({
      modoEntrada: 'FILE_ID',
      fileId: fileId,
      delimManual: delimManual,
      dateStyle: dateStyle,
      sheetName: payload.sheetName,
      sheetIndex: payload.sheetIndex,
      gid: payload.gid
    });
    if (!rich || !rich.matrix || !rich.matrix.length) {
      throw new Error('Não foi possível ler o arquivo do sensor S' + (s + 1) + '.');
    }
    let serieSensor;
    try {
      serieSensor = EstufaBanhoRel_normalizarMatrizParaAnalise(rich.matrix, rich.displayMatrix, 1, dateStyle);
    } catch (e) {
      throw new Error('Falha ao normalizar o arquivo do sensor S' + (s + 1) + ': ' + e.message);
    }
    series.push(serieSensor);
  }
  return series;
}

// ------------------------------------------------------------
// SENSORES MÍNIMOS — CADA ANEXO (F/I/E) TEM MÍNIMO FIXO, NÃO
// CONDICIONADO A VOLUME (ao contrário do Cadeia de Frio, onde o
// mínimo de sensores segue o volume declarado do equipamento —
// ver seção 2 do plano). ebCalcularSensoresMinimos_ (Config.js)
// continua existindo por compatibilidade, mas só é usado aqui como
// último fallback se um perfil futuro não definir minSensores.
// ------------------------------------------------------------

function EstufaBanhoRel_ebObterSensoresMinimosPerfil_(perfilCfg, payload) {
  if (perfilCfg && perfilCfg.minSensores) return Number(perfilCfg.minSensores);
  const volumeLitros = EstufaBanhoRel_ebParseNumeroMain_(payload.volumeLitros);
  return EstufaBanhoRel_ebCalcularSensoresMinimos_(volumeLitros, false);
}

/**
 * Valida a senha do Modo Personalizado — separada da senha do Simulador
 * Admin de propósito (essa afeta laudos REAIS, não relatório interno).
 * Nunca confia numa flag do cliente sozinha: sempre revalida a senha
 * aqui no servidor toda vez que um laudo é gerado com o modo marcado
 * como ativo.
 */
function EstufaBanhoRel_ebValidarSenhaModoPersonalizado_(senhaInformada) {
  const cfg = EstufaBanhoRel_EBCFG.MODO_PERSONALIZADO || {};
  if (cfg.habilitado === false) {
    throw new Error('Modo Personalizado desabilitado na configuração.');
  }
  const senha = String(senhaInformada || '').trim();
  if (!senha) {
    throw new Error('Senha administrativa obrigatória para o Modo Personalizado.');
  }
  let senhaEsperada = '';
  try {
    senhaEsperada = String(PropertiesService.getScriptProperties().getProperty('MODO_PERSONALIZADO_SENHA') || '').trim();
  } catch (e) {}
  if (!senhaEsperada) {
    senhaEsperada = String(cfg.senhaFallback || '').trim();
  }
  if (!senhaEsperada || senha !== senhaEsperada) {
    throw new Error('Senha administrativa inválida para o Modo Personalizado.');
  }
}
function EstufaBanhoRel_apiValidarSenhaModoPersonalizado(payload) {
  payload = payload || {};
  EstufaBanhoRel_ebValidarSenhaModoPersonalizado_(payload.senha);
  return {
    ok: true
  };
}

/**
 * Bloqueia a geração do laudo se o técnico informar menos sensores do
 * que o Anexo exige — antes disso, o mínimo era só um valor de
 * exibição/sugestão, sem nenhuma validação real impedindo um laudo com
 * menos sensores do que a norma pede para aquele anexo.
 *
 * Modo Personalizado: se payload.modoPersonalizado vier marcado, a
 * senha é revalidada aqui (nunca só confiando na flag do cliente) —
 * só libera abaixo do mínimo se a senha realmente bater.
 */
function EstufaBanhoRel_ebValidarMinimoSensores_(perfilCfg,nSensores,payload) {
  EstufaBanhoRel_ebValidarSelecao_(payload,nSensores);
}

function EstufaBanhoRel_ebMontarConfigEstudos_(payload, perfilCfg) {
  if(payload.perfil==='SECADORA_TRAQUEIAS')return EstufaBanhoRel_ebConfigSecadora_(payload);
  const estudos = payload.estudos || {};
  const disponiveis = perfilCfg.estudosDisponiveis || [];
  const margemMin = Number(EstufaBanhoRel_EBCFG.MARGEM_CONTEXTO_EVENTO_MINUTOS) || 60;
  const out = [];
  const dist = estudos.distribuicao || {};
  const tipoDist = String(dist.tipo || '').toUpperCase().trim();
  if (tipoDist) {
    if (disponiveis.indexOf(tipoDist) === -1) {
      throw new Error('O perfil "' + perfilCfg.label + '" não tem o estudo "' + EstufaBanhoRel_ebLabelEstudo_(tipoDist) + '" disponível.');
    }
    const inicioMs = EstufaBanhoRel_ebConverterTempoParaMs_(dist.inicio);
    const fimMs = EstufaBanhoRel_ebConverterTempoParaMs_(dist.fim);
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
      janelaInicio: dist.inicio,
      janelaFim: dist.fim,
      resultadoDesejado: dist.resultadoDesejado,
      fimRampaEstabilizacao: String(dist.fimRampaEstabilizacao || '').trim()
    });
  }
  const porta = estudos.aberturaPorta || {};
  if (porta.habilitado) {
    if (disponiveis.indexOf('ABERTURA_PORTA') === -1) {
      throw new Error('O perfil "' + perfilCfg.label + '" não tem o estudo de Abertura de Porta disponível.');
    }
    out.push(EstufaBanhoRel_ebMontarConfigEvento_('ABERTURA_PORTA', porta, margemMin));
  }
  const energia = estudos.quedaEnergia || {};
  if (energia.habilitado) {
    if (disponiveis.indexOf('QUEDA_ENERGIA') === -1) {
      throw new Error('O perfil "' + perfilCfg.label + '" não tem o estudo de Queda de Energia disponível.');
    }
    out.push(EstufaBanhoRel_ebMontarConfigEvento_('QUEDA_ENERGIA', energia, margemMin));
  }
  const autonomia = estudos.autonomia || {};
  if (autonomia.habilitado) {
    if (disponiveis.indexOf('AUTONOMIA') === -1) {
      throw new Error('O perfil "' + perfilCfg.label + '" não tem o estudo de Autonomia disponível.');
    }
    const inicioMs = EstufaBanhoRel_ebConverterTempoParaMs_(autonomia.inicio);
    const fimMs = EstufaBanhoRel_ebConverterTempoParaMs_(autonomia.fim);
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
      janelaInicio: autonomia.inicio,
      janelaFim: autonomia.fim,
      autonomiaEstimadaMinutos: EstufaBanhoRel_ebParseNumeroMain_(autonomia.autonomiaEstimadaMinutos, null)
    });
  }

  // Anexo E: os dois estudos abaixo exigem exatamente 3 repetições
  // (distribuição em vazio) ou 3 repetições + cálculo de letalidade
  // (penetração com carga) — ver Engine.js (ebAnalisarDistribuicaoVazioE_
  // / ebAnalisarPenetracaoELetalidade_) para a lógica de consolidação.
  const distE = estudos.distribuicaoE || {};
  if (distE.habilitado) {
    if (disponiveis.indexOf('DISTRIBUICAO_VAZIO_E') === -1) {
      throw new Error('O perfil "' + perfilCfg.label + '" não tem o estudo de Distribuição em Vazio (Anexo E) disponível.');
    }
    out.push(EstufaBanhoRel_ebMontarConfigRepeticoesE_('DISTRIBUICAO_VAZIO_E', distE.repeticoes, {}));
  }
  const penE = estudos.penetracaoE || {};
  if (penE.habilitado) {
    if (disponiveis.indexOf('PENETRACAO_CARGA_E') === -1) {
      throw new Error('O perfil "' + perfilCfg.label + '" não tem o estudo de Penetração com Carga (Anexo E) disponível.');
    }
    const tipoLetalidade = String(penE.tipoLetalidade || '').toUpperCase().trim();
    if (!EstufaBanhoRel_EBCFG.LETALIDADE[tipoLetalidade]) {
      throw new Error('Informe o tipo de letalidade (Esterilização ou Despirogenização) para a Penetração com Carga.');
    }
    const cfgPenE = EstufaBanhoRel_ebMontarConfigRepeticoesE_('PENETRACAO_CARGA_E', penE.repeticoes, {
      comIndicador: true
    });
    cfgPenE.tipoLetalidade = tipoLetalidade;
    cfgPenE.valorMinimoExigido = EstufaBanhoRel_ebParseNumeroMain_(penE.valorMinimoExigido, null);
    out.push(cfgPenE);
  }
  return out;
}

/**
 * Monta a config comum aos dois estudos do Anexo E: valida que vieram
 * exatamente 3 repetições, converte cada janela pra ms, e (quando
 * comIndicador) carrega o resultado de laboratório terceirizado de
 * cada repetição. janelaInicioMs/janelaFimMs no retorno são só o
 * envelope (mín/máx entre as 3) — a leitura de dado de cada repetição
 * usa repeticoesJanelas individualmente (ver ebExecutarAnaliseCompleta_).
 */
function EstufaBanhoRel_ebMontarConfigRepeticoesE_(tipoEstudo, repeticoesBrutas, opcoes) {
  opcoes = opcoes || {};
  const reps = Array.isArray(repeticoesBrutas) ? repeticoesBrutas : [];
  if (reps.length !== 3) {
    throw new Error('O estudo "' + EstufaBanhoRel_ebLabelEstudo_(tipoEstudo) + '" do Anexo E exige exatamente 3 repetições (recebido: ' + reps.length + ').');
  }
  const janelas = reps.map(function (r, idx) {
    r = r || {};
    const inicioMs = EstufaBanhoRel_ebConverterTempoParaMs_(r.inicio);
    const fimMs = EstufaBanhoRel_ebConverterTempoParaMs_(r.fim);
    if (!isFinite(inicioMs) || !isFinite(fimMs)) {
      throw new Error('Informe início e fim válidos para a repetição ' + (idx + 1) + ' de "' + EstufaBanhoRel_ebLabelEstudo_(tipoEstudo) + '".');
    }
    if (inicioMs >= fimMs) {
      throw new Error('O início da repetição ' + (idx + 1) + ' de "' + EstufaBanhoRel_ebLabelEstudo_(tipoEstudo) + '" deve ser anterior ao fim.');
    }
    const janela = {
      janelaInicioMs: inicioMs,
      janelaFimMs: fimMs,
      janelaInicio: r.inicio,
      janelaFim: r.fim
    };
    if (opcoes.comIndicador) {
      janela.indicador = r.indicador ? {
        tipo: String(r.indicador.tipo || '').toUpperCase().trim(),
        aprovado: r.indicador.aprovado === false ? false : r.indicador.aprovado === true ? true : null,
        lote: String(r.indicador.lote || '').trim(),
        validade: String(r.indicador.validade || '').trim(),
        laboratorio: String(r.indicador.laboratorio || '').trim(),
        laudoFileId: String(r.indicador.laudoFileId || '').trim()
      } : null;
      // Anexo B.3.f da norma: registro impresso do ciclo do equipamento é
      // obrigatório (não condicional a ter impressora) para estufas de
      // despirogenização — ver docs/REFERENCIA_NBR16328_2024_ANEXOS_EFI.md
      // seção 1. Guardado aqui, não bloqueia geração (upload é opcional na
      // tela), mas fica registrado no laudo se foi anexado ou não.
      janela.registroCicloFileId = String(r.registroCicloFileId || '').trim();
    }
    return janela;
  });
  const ordenadas=janelas.slice().sort(function(a,b){return a.janelaInicioMs-b.janelaInicioMs;});
  for(let i=1;i<ordenadas.length;i++)if(ordenadas[i].janelaInicioMs<=ordenadas[i-1].janelaFimMs)throw new Error('As três repetições de '+EstufaBanhoRel_ebLabelEstudo_(tipoEstudo)+' devem ter períodos independentes, sem sobreposição nem leitura compartilhada.');
  return {
    tipoEstudo: tipoEstudo,
    repeticoesJanelas: janelas,
    janelaInicioMs: Math.min.apply(null, janelas.map(function (j) {
      return j.janelaInicioMs;
    })),
    janelaFimMs: Math.max.apply(null, janelas.map(function (j) {
      return j.janelaFimMs;
    }))
  };
}
function EstufaBanhoRel_ebMontarConfigEvento_(tipoEstudo, cfgEvento, margemMin) {
  const inicioEventoMs = EstufaBanhoRel_ebConverterTempoParaMs_(cfgEvento.inicioEvento);
  if (!isFinite(inicioEventoMs)) {
    throw new Error('Informe o início do evento para o estudo "' + EstufaBanhoRel_ebLabelEstudo_(tipoEstudo) + '".');
  }
  const fimEventoStr = String(cfgEvento.fimEvento || '').trim();
  const fimEventoMs = fimEventoStr ? EstufaBanhoRel_ebConverterTempoParaMs_(fimEventoStr) : null;
  if (fimEventoStr && !isFinite(fimEventoMs)) {
    throw new Error('Fim do evento inválido para o estudo "' + EstufaBanhoRel_ebLabelEstudo_(tipoEstudo) + '".');
  }
  if (fimEventoMs !== null && fimEventoMs <= inicioEventoMs) {
    throw new Error('O fim do evento deve ser posterior ao início, no estudo "' + EstufaBanhoRel_ebLabelEstudo_(tipoEstudo) + '".');
  }
  const margemMs = margemMin * 60000;
  return {
    tipoEstudo: tipoEstudo,
    janelaInicioMs: inicioEventoMs - margemMs,
    janelaFimMs: (fimEventoMs !== null ? fimEventoMs : inicioEventoMs) + margemMs,
    inicioEventoMs: inicioEventoMs,
    fimEventoMs: fimEventoMs,
    inicioEvento: cfgEvento.inicioEvento,
    fimEvento: cfgEvento.fimEvento || '',
    tipoAbertura: cfgEvento.tipoAbertura || null,
    tempoAlvoMinutos: cfgEvento.tempoAlvoMinutos,
    resultadoDesejado: cfgEvento.resultadoDesejado
  };
}
function EstufaBanhoRel_ebConsolidarStatus_(analises) {
  if (!analises || !analises.length) return 'INFORMATIVO';
  if (analises.some(function (a) {
    return a.statusAprovacao === 'REPROVADO';
  })) return 'REPROVADO';
  if (analises.some(function (a) {
    return a.statusAprovacao === 'APROVADO_COM_ALERTA';
  })) return 'APROVADO_COM_ALERTA';
  if (analises.every(function (a) {
    return a.statusAprovacao === 'APROVADO';
  })) return 'APROVADO';
  if (analises.some(function (a) {
    return a.statusAprovacao === 'INFORMATIVO';
  })) return 'INFORMATIVO';
  if (analises.every(function (a) {
    return a.statusAprovacao === 'CARACTERIZACAO';
  })) return 'CARACTERIZACAO';
  return 'INFORMATIVO';
}
function EstufaBanhoRel_ebAplicarMarcadoresSimulacaoNaAnalise_(analise, payload) {
  if (!analise || !payload || !payload.modoRelatorioSimulado) return;
  const meta = payload._simulacaoMeta || {};
  analise.origemDados = 'ANALISE_MANUAL_RECONSTITUIDA';
  analise.observacoesAnalise = Array.isArray(analise.observacoesAnalise) ? analise.observacoesAnalise : [];
  analise.alertasAnalise = Array.isArray(analise.alertasAnalise) ? analise.alertasAnalise : [];
  const avisoInterno = 'RELATÓRIO INTERNO - ANÁLISE MANUAL DO LABORATÓRIO DE METROLOGIA';
  if (analise.observacoesAnalise.indexOf(avisoInterno) === -1) {
    analise.observacoesAnalise.unshift(avisoInterno);
  }
  analise.observacoesAnalise.push('Parâmetros da análise manual: estudo ' + (meta.inicioEstudo || '-') + ' a ' + (meta.fimEstudo || '-') + ' | alvo ' + (meta.temperaturaAlvo || '-') + ' °C | intervalo ' + (meta.intervaloSegundos || '-') + ' s | gerado em ' + (meta.geradoEm || '-') + ' | operador ' + (meta.operador || '-') + (meta.autonomiaEstimadaMinutos ? ' | autonomia estimada ' + meta.autonomiaEstimadaMinutos + ' min' : ''));
}
function EstufaBanhoRel_ebConstruirLinkPdfPaisagem(id) {
  id = String(id || '').trim();
  if (!id) {
    throw new Error('ID da planilha não informado para geração do PDF.');
  }
  const urlBase = 'https://docs.google.com/spreadsheets/d/' + id + '/export?';
  const parametros = ['exportFormat=pdf', 'format=pdf', 'size=A4', 'portrait=false', 'fitw=true', 'sheetnames=false', 'printtitle=false', 'pagenum=CENTER', 'gridlines=false', 'fzr=false', 'top_margin=0.30', 'bottom_margin=0.30', 'left_margin=0.25', 'right_margin=0.25'].join('&');
  return urlBase + parametros;
}

// ------------------------------------------------------------
// HELPERS LOCAIS DE SEGURANÇA
// ------------------------------------------------------------

function EstufaBanhoRel_ebParseNumeroMain_(valor, fallback) {
  if (valor === null || valor === undefined || String(valor).trim() === '') return fallback === undefined ? null : fallback;
  const s=String(valor).replace(',', '.').trim();
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(s)||!isFinite(Number(s)))throw new Error('Valor numérico inválido: '+String(valor)+'. Informe um número sem unidade ou texto.');
  return Number(s);
}
function EstufaBanhoRel_ebClampIntMain_(valor, min, max, fallback) {
  const n=(valor===undefined||valor===null||String(valor).trim()==='')?Number(fallback):Number(valor);
  if(!Number.isInteger(n)||n<min||n>max)throw new Error('Quantidade de canais inválida. Informe um inteiro entre '+min+' e '+max+'.');
  return n;
}
function EstufaBanhoRel_ebNormalizarSensoresAtivosMain_(sensoresAtivos, nSensores) {
  if (!Array.isArray(sensoresAtivos) || !sensoresAtivos.length) {
    return Array.from({
      length: nSensores
    }, function () {
      return true;
    });
  }
  const out = [];
  for (let i = 0; i < nSensores; i++) {
    if(typeof sensoresAtivos[i]!=='boolean')throw new Error('Lista de sensores inválida. Confira os canais selecionados.');
    out.push(sensoresAtivos[i]);
  }
  return out;
}

function EstufaBanhoRel_ebValidarFaixaMain_(faixa){
  if(!isFinite(faixa.tMin)||!isFinite(faixa.tMax)||!isFinite(faixa.tolerancia)||faixa.tMin>faixa.tMax||faixa.tolerancia<0)throw new Error('Faixa de temperatura inválida: mínima deve ser menor ou igual à máxima, e tolerância deve ser zero ou positiva.');
}
function EstufaBanhoRel_ebMensagemJanela_(dados,cfg,titulo){
  const f=function(ms){return isFinite(ms)?Utilities.formatDate(new Date(ms),EstufaBanhoRel_EBCFG.TZ,'dd/MM/yyyy HH:mm:ss'):'inválido';};
  return 'Nenhum dado encontrado na janela de '+(titulo||EstufaBanhoRel_ebLabelEstudo_(cfg.tipoEstudo))+'. Janela solicitada: '+f(cfg.janelaInicioMs)+' a '+f(cfg.janelaFimMs)+'. Período importado: '+(dados[0]&&dados[0].tempoStr||'sem dados')+' a '+(dados[dados.length-1]&&dados[dados.length-1].tempoStr||'sem dados')+'. Confira data, hora, formato BR/US e a aba do arquivo. As datas não são ajustadas automaticamente.';
}
function EstufaBanhoRel_ebValidarCoberturaJanela_(dados,cfg,titulo){
  const intervalos=[];for(let i=1;i<dados.length;i++){const d=dados[i].tempoDate.getTime()-dados[i-1].tempoDate.getTime();if(d>0)intervalos.push(d);}
  intervalos.sort(function(a,b){return a-b;});const folga=intervalos.length?intervalos[Math.floor(intervalos.length/2)]+1000:1000;
  if(dados[0].tempoDate.getTime()-cfg.janelaInicioMs>folga||cfg.janelaFimMs-dados[dados.length-1].tempoDate.getTime()>folga)throw new Error(titulo+': os dados não cobrem o período solicitado. '+EstufaBanhoRel_ebMensagemJanela_(dados,cfg,titulo));
}
