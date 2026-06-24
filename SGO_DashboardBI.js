const SGO_DASHBOARD_BI = (() => {
  function safeAll_(sheet, dbKey) {
    try {
      return SGO_DATA.getAll(sheet, dbKey);
    } catch (e) {
      return [];
    }
  }

  function parseDate_(v) {
    if (!v) return null;
    const s = String(v).substring(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const d = new Date(s + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  function somar_(lista, campo) {
    return (lista || []).reduce(function(total, item) {
      return total + SGO_UTILS.toNumber(item[campo], 0);
    }, 0);
  }

  function contarPor_(lista, campo) {
    const mapa = {};
    (lista || []).forEach(function(item) {
      const chave = SGO_UTILS.safe(item[campo]) || "NAO_INFORMADO";
      mapa[chave] = (mapa[chave] || 0) + 1;
    });
    return Object.keys(mapa).map(function(k) {
      return { label: k, total: mapa[k] };
    }).sort(function(a, b) { return b.total - a.total; });
  }

  function gerar(sessionId) {
    const sessao = exigirSessao(sessionId);
    const perfil = SGO_UTILS.safeUpper(sessao.perfil);
    if (["CLIENTE", "TECNICO"].indexOf(perfil) >= 0) {
      return { success: false, message: "Acesso negado ao Dashboard BI." };
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const clientes = safeAll_(sgoGetCfgSafe_().SHEETS.CAD_CLIENTES);
    const equipamentos = safeAll_(sgoGetCfgSafe_().SHEETS.CAD_EQUIPAMENTOS);
    const pecas = safeAll_(sgoGetCfgSafe_().SHEETS.CAD_PECAS);
    const contratos = safeAll_(sgoGetCfgSafe_().SHEETS.CAD_CONTRATOS);
    const os = safeAll_(sgoGetCfgSafe_().SHEETS.OS_ORDENS, "OS");
    const missoes = safeAll_(sgoGetCfgSafe_().SHEETS.AGD_MISSOES, "OS");
    const apontamentos = safeAll_(sgoGetCfgSafe_().SHEETS.AGD_APONTAMENTOS, "OS");
    const materiais = safeAll_(sgoGetCfgSafe_().SHEETS.OS_MATERIAIS, "OS");
    const veiculos = safeAll_(sgoGetCfgSafe_().SHEETS.FRT_VEICULOS, "FROTA");
    const abastecimentos = safeAll_(sgoGetCfgSafe_().SHEETS.FRT_ABASTECIMENTOS, "FROTA");
    const manutencoes = safeAll_(sgoGetCfgSafe_().SHEETS.FRT_MANUTENCAO, "FROTA");

    const osFinalizadas = os.filter(function(o) {
      const st = SGO_UTILS.safeUpper(o.STATUS);
      return ["CONCLUIDA", "APROVADA", "FATURADA"].indexOf(st) >= 0;
    });
    const osAbertas = os.filter(function(o) {
      const st = SGO_UTILS.safeUpper(o.STATUS);
      return ["CONCLUIDA", "APROVADA", "FATURADA", "CANCELADA"].indexOf(st) < 0;
    });
    const osAtrasadas = osAbertas.filter(function(o) {
      const p = parseDate_(o.SLA_PRAZO);
      return p && p < hoje;
    });

    const custoPecas = somar_(os, "CUSTO_PECAS") + somar_(materiais, "CUSTO_TOTAL");
    const custoHoras = somar_(os, "CUSTO_HORA");
    const custoDeslocamento = somar_(os, "CUSTO_DESLOCAMENTO");
    const custoOS = somar_(os, "CUSTO_TOTAL") || (custoPecas + custoHoras + custoDeslocamento);
    const custoFrota = somar_(abastecimentos, "VALOR_TOTAL") + somar_(manutencoes, "CUSTO");

    const horasPorTecnico = {};
    apontamentos.forEach(function(a) {
      const tec = SGO_UTILS.safe(a.TECNICO_ID) || "NAO_INFORMADO";
      horasPorTecnico[tec] = (horasPorTecnico[tec] || 0) + SGO_UTILS.toNumber(a.HORAS_TOTAL, 0);
    });

    const produtividadeTecnicos = Object.keys(horasPorTecnico).map(function(k) {
      return { tecnico: k, horas: Math.round(horasPorTecnico[k] * 100) / 100 };
    }).sort(function(a, b) { return b.horas - a.horas; }).slice(0, 10);

    const contratosVencendo = contratos.filter(function(c) {
      const d = parseDate_(c.DATA_FIM);
      if (!d) return false;
      const dias = Math.ceil((d - hoje) / 86400000);
      return dias >= 0 && dias <= ((sgoGetCfgSafe_().ALERTAS_V2 && sgoGetCfgSafe_().ALERTAS_V2.DIAS_CONTRATO) || 60);
    }).length;

    const pecasVencidas = pecas.filter(function(p) {
      if (SGO_UTILS.safeUpper(p.APLICA_CALIBRACAO) !== "S") return false;
      const d = parseDate_(p.DATA_PROXIMA_CAL);
      return d && d < hoje;
    }).length;

    const veiculosBloqueados = veiculos.filter(function(v) {
      return SGO_UTILS.safeUpper(v.BLOQUEADO) === "S" || SGO_UTILS.safeUpper(v.STATUS) === "BLOQUEADO";
    }).length;

    const totalOs = os.length;
    const slaOk = totalOs > 0 ? Math.max(0, Math.round(((totalOs - osAtrasadas.length) / totalOs) * 100)) : 100;

    return {
      success: true,
      geradoEm: SGO_UTILS.nowIso(),
      kpis: {
        clientes: clientes.length,
        equipamentos: equipamentos.length,
        pecas: pecas.length,
        contratos: contratos.length,
        osTotal: totalOs,
        osAbertas: osAbertas.length,
        osFinalizadas: osFinalizadas.length,
        osAtrasadas: osAtrasadas.length,
        slaOkPct: slaOk,
        missoes: missoes.length,
        horasApontadas: Math.round(somar_(apontamentos, "HORAS_TOTAL") * 100) / 100,
        custoOS: custoOS,
        custoFrota: custoFrota,
        contratosVencendo: contratosVencendo,
        pecasVencidas: pecasVencidas,
        veiculos: veiculos.length,
        veiculosBloqueados: veiculosBloqueados
      },
      series: {
        osPorStatus: contarPor_(os, "STATUS"),
        osPorTipo: contarPor_(os, "TIPO_OS"),
        frotaPorStatus: contarPor_(veiculos, "STATUS"),
        produtividadeTecnicos: produtividadeTecnicos
      }
    };
  }

  return { gerar };
})();

function dashboardBIGerar(sessionId) {
  try {
    return JSON.parse(JSON.stringify(SGO_DASHBOARD_BI.gerar(sessionId)));
  } catch (e) {
    return { success: false, message: "Erro: " + e.message };
  }
}
