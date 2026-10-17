/**
 * Alertas globais de calibração.
 * Configuração persistida em ScriptProperties e protegida para ADMIN.
 */
const SGO_ALERTAS_PADROES_PROP = "SGO_ALERTAS_PADROES_CONFIG_V1";

function AlertasPadroes_configPadrao_() {
  return {
    ativo: true,
    perfis: ["GESTOR", "METROLOGIA"],
    horaInicio: "08:00",
    horaFim: "17:30",
    intervaloBalaoMin: 120,
    duracaoBalaoSeg: 20,
    alertaCriticoAtivo: true,
    intervaloCriticoMin: 240,
    antecedenciaDias: 30,
    mensagem: "Existem padrões vencidos que exigem ação imediata."
  };
}

function AlertasPadroes_config_() {
  var padrao = AlertasPadroes_configPadrao_();
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(SGO_ALERTAS_PADROES_PROP);
    if (!raw) return padrao;
    var salvo = JSON.parse(raw);
    Object.keys(padrao).forEach(function (k) {
      if (salvo[k] !== undefined && salvo[k] !== null) padrao[k] = salvo[k];
    });
  } catch (e) {}
  return padrao;
}

function AlertasPadroes_exigirAdmin_(sessionId) {
  var sessao = exigirSessao(sessionId);
  if (SGO_UTILS.safeUpper(sessao.perfil) !== "ADMIN") {
    throw new Error("Acesso negado: configuração exclusiva do administrador.");
  }
  return sessao;
}

function AlertasPadroes_normalizarConfig_(dados) {
  dados = dados || {};
  function inteiro(v, min, max, fallback) {
    var n = parseInt(v, 10);
    return isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }
  function hora(v, fallback) {
    v = String(v || "");
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : fallback;
  }
  var perfisValidos = ["GESTOR", "METROLOGIA"];
  var perfis = Array.isArray(dados.perfis) ? dados.perfis.map(SGO_UTILS.safeUpper).filter(function (p) {
    return perfisValidos.indexOf(p) !== -1;
  }) : perfisValidos;
  if (!perfis.length) perfis = perfisValidos;
  return {
    ativo: dados.ativo !== false,
    perfis: perfis.filter(function (p, i, a) { return a.indexOf(p) === i; }),
    horaInicio: hora(dados.horaInicio, "08:00"),
    horaFim: hora(dados.horaFim, "17:30"),
    intervaloBalaoMin: inteiro(dados.intervaloBalaoMin, 15, 720, 120),
    duracaoBalaoSeg: inteiro(dados.duracaoBalaoSeg, 5, 120, 20),
    alertaCriticoAtivo: dados.alertaCriticoAtivo !== false,
    intervaloCriticoMin: inteiro(dados.intervaloCriticoMin, 30, 1440, 240),
    antecedenciaDias: inteiro(dados.antecedenciaDias, 1, 365, 30),
    mensagem: String(dados.mensagem || "").trim().slice(0, 240) || "Existem padrões vencidos que exigem ação imediata."
  };
}

function alertasPadroesObterConfigAdmin(sessionId) {
  try {
    AlertasPadroes_exigirAdmin_(sessionId);
    return { success: true, config: AlertasPadroes_config_() };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function alertasPadroesSalvarConfigAdmin(sessionId, dados) {
  try {
    var sessao = AlertasPadroes_exigirAdmin_(sessionId);
    var config = AlertasPadroes_normalizarConfig_(dados);
    PropertiesService.getScriptProperties().setProperty(SGO_ALERTAS_PADROES_PROP, JSON.stringify(config));
    if (typeof SGO_Pendencias_invalidar_ === "function") SGO_Pendencias_invalidar_(); // antecedência mudou: recalcula para todos
    SGO_DATA.log("ALERTAS_PADROES_CONFIG", sessao.usuario, "Configuração de alertas de calibração atualizada.", "ALERTAS");
    return { success: true, config: config, message: "Configurações salvas com sucesso." };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function alertasPadroesObterEstado(sessionId, forcarTeste) {
  try {
    var sessao = exigirSessao(sessionId);
    var perfil = SGO_UTILS.safeUpper(sessao.perfil);
    var config = AlertasPadroes_config_();
    var permitido = config.perfis.indexOf(perfil) !== -1 || (!!forcarTeste && perfil === "ADMIN");
    if (!config.ativo || !permitido) return { success: true, exibir: false, config: config };

    var agora = new Date();
    var hhmm = Utilities.formatDate(agora, SGO_CFG.SISTEMA.TIMEZONE, "HH:mm");
    if (!forcarTeste && (hhmm < config.horaInicio || hhmm > config.horaFim)) {
      return { success: true, exibir: false, foraHorario: true, config: config };
    }

    // 17/10/2026: contagem da central de pendências (SGO_Alertas_Central.js), a mesma do Início e do
    // painel de alertas. "Vence hoje" conta como vencido (a emissão de certificado já bloqueia o padrão).
    var porTipo = SGO_Pendencias_listar(sessionId, {}).resumo.porTipo || {};
    var vencidos = porTipo.padrao_vencido || 0, invalidos = porTipo.padrao_sem_validade || 0, vencendo = porTipo.padrao_vencendo || 0;
    var total = vencidos + invalidos + vencendo;
    return {
      success: true,
      exibir: total > 0,
      resumo: { total: total, vencidos: vencidos, vencendo: vencendo, invalidos: invalidos },
      mensagem: config.mensagem,
      critico: config.alertaCriticoAtivo && (vencidos > 0 || invalidos > 0),
      config: config,
      atualizadoEm: agora.toISOString()
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
