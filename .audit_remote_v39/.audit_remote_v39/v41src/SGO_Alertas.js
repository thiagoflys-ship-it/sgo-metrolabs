const SGO_ALERTAS = (() => {
  const STATUS_ATIVO = SGO_CFG.STATUS.ATIVO;

  const LABEL_SERVICO = {
    CALIBRACAO: "Calibracao",
    QUALIFICACAO: "Qualificacao",
    ENSAIO_ELETRICO: "Ensaio Eletrico",
    MANUTENCAO_PREVENTIVA: "Manutencao Preventiva",
    MANUTENCAO_CORRETIVA: "Manutencao Corretiva",
    INSPECAO_SEGURANCA: "Inspecao de Seguranca"
  };

  function parseDate_(v) {
    if (!v) return null;
    let s = String(v).trim();
    if (s.indexOf("T") >= 0) s = s.split("T")[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const p = s.split("-");
    const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    d.setHours(0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  function diasEntre_(data, hoje) {
    return Math.ceil((data - hoje) / 86400000);
  }

  function getDiasAviso_() {
    return (SGO_CFG.ALERTAS && SGO_CFG.ALERTAS.DIAS_ANTECEDENCIA_PADRAO) || 30;
  }

  function safeAll_(sheet, dbKey) {
    try {
      return SGO_DATA.getAll(sheet, dbKey);
    } catch (e) {
      return [];
    }
  }

  function mapaPorId_(lista) {
    const mapa = {};
    (lista || []).forEach(function(item) {
      mapa[SGO_UTILS.safe(item.ID)] = item;
    });
    return mapa;
  }

  function pushVencimento_(alertas, cfg) {
    const data = parseDate_(cfg.data);
    if (!data) return;
    const dias = diasEntre_(data, cfg.hoje);
    if (dias > cfg.diasAviso) return;
    alertas.push({
      tipo: dias < 0 ? "CRITICO" : "ATENCAO",
      status: dias < 0 ? "VENCIDO" : "VENCENDO",
      categoria: cfg.categoria,
      referenciaId: cfg.referenciaId || "",
      tag: cfg.tag || "",
      cliente: cfg.cliente || "",
      descricao: cfg.descricao || "",
      validade: SGO_UTILS.safe(cfg.data),
      dias: dias,
      mensagem: cfg.mensagem(dias)
    });
  }

  function coletarAlertasSistema(diasAviso, opts) {
    opts = opts || {};
    diasAviso = Number(diasAviso || getDiasAviso_());

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const alertas = [];
    const clientes = mapaPorId_(safeAll_(SGO_CFG.SHEETS.CAD_CLIENTES));
    const equipamentos = mapaPorId_(safeAll_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS));
    const clienteIdFiltro = SGO_UTILS.safe(opts.clienteId);

    function nomeCliente_(id) {
      const c = clientes[SGO_UTILS.safe(id)] || {};
      return SGO_UTILS.safe(c.NOME_FANTASIA || c.RAZAO_SOCIAL) || "Cliente nao identificado";
    }

    function tagEquipamento_(id) {
      const e = equipamentos[SGO_UTILS.safe(id)] || {};
      return SGO_UTILS.safe(e.TAG || e.TIPO) || "Equipamento nao identificado";
    }

    safeAll_(SGO_CFG.SHEETS.DOC_DOCUMENTOS).forEach(function(doc) {
      if (SGO_UTILS.safeUpper(doc.STATUS) !== STATUS_ATIVO) return;
      if (clienteIdFiltro && SGO_UTILS.safe(doc.CLIENTE_ID) !== clienteIdFiltro) return;
      pushVencimento_(alertas, {
        hoje: hoje,
        diasAviso: diasAviso,
        categoria: "DOCUMENTO",
        referenciaId: doc.ID,
        data: doc.DATA_VENCIMENTO,
        tag: tagEquipamento_(doc.EQUIPAMENTO_ID),
        cliente: nomeCliente_(doc.CLIENTE_ID),
        descricao: SGO_UTILS.safe(doc.NOME_ARQUIVO || doc.TIPO_DOCUMENTO),
        mensagem: function(dias) {
          const nome = SGO_UTILS.safe(doc.NOME_ARQUIVO || doc.TIPO_DOCUMENTO);
          return dias < 0
            ? "Documento '" + nome + "' vencido ha " + Math.abs(dias) + " dia(s)."
            : "Documento '" + nome + "' vence em " + dias + " dia(s).";
        }
      });
    });

    safeAll_(SGO_CFG.SHEETS.REG_TECNICO).forEach(function(reg) {
      if (SGO_UTILS.safeUpper(reg.STATUS) !== STATUS_ATIVO) return;
      if (clienteIdFiltro && SGO_UTILS.safe(reg.CLIENTE_ID) !== clienteIdFiltro) return;
      const tipo = LABEL_SERVICO[SGO_UTILS.safeUpper(reg.TIPO_SERVICO)] || SGO_UTILS.safe(reg.TIPO_SERVICO || "Registro tecnico");
      pushVencimento_(alertas, {
        hoje: hoje,
        diasAviso: diasAviso,
        categoria: "REG_TECNICO",
        referenciaId: reg.ID,
        data: reg.DATA_VALIDADE,
        tag: tagEquipamento_(reg.EQUIPAMENTO_ID),
        cliente: nomeCliente_(reg.CLIENTE_ID),
        descricao: tipo,
        mensagem: function(dias) {
          const tag = tagEquipamento_(reg.EQUIPAMENTO_ID);
          return dias < 0
            ? tipo + " do equipamento " + tag + " vencido ha " + Math.abs(dias) + " dia(s)."
            : tipo + " do equipamento " + tag + " vence em " + dias + " dia(s).";
        }
      });
    });

    safeAll_(SGO_CFG.SHEETS.CAD_CONTRATOS).forEach(function(c) {
      if (clienteIdFiltro && SGO_UTILS.safe(c.CLIENTE_ID) !== clienteIdFiltro) return;
      pushVencimento_(alertas, {
        hoje: hoje,
        diasAviso: (SGO_CFG.ALERTAS_V2 && SGO_CFG.ALERTAS_V2.DIAS_CONTRATO) || 60,
        categoria: "CONTRATO",
        referenciaId: c.ID,
        data: c.DATA_FIM,
        cliente: nomeCliente_(c.CLIENTE_ID),
        descricao: SGO_UTILS.safe(c.NUMERO_CONTRATO || c.TIPO_CONTRATO),
        mensagem: function(dias) {
          const num = SGO_UTILS.safe(c.NUMERO_CONTRATO || "s/n");
          return dias < 0
            ? "Contrato " + num + " vencido ha " + Math.abs(dias) + " dia(s)."
            : "Contrato " + num + " vence em " + dias + " dia(s).";
        }
      });
    });

    safeAll_(SGO_CFG.SHEETS.CAD_PECAS).forEach(function(p) {
      if (clienteIdFiltro && SGO_UTILS.safe(p.CLIENTE_ID) !== clienteIdFiltro) return;
      if (SGO_UTILS.safeUpper(p.APLICA_CALIBRACAO) !== "S") return;
      pushVencimento_(alertas, {
        hoje: hoje,
        diasAviso: diasAviso,
        categoria: "PECA",
        referenciaId: p.ID,
        data: p.DATA_PROXIMA_CAL,
        tag: tagEquipamento_(p.EQUIPAMENTO_ID),
        cliente: nomeCliente_(p.CLIENTE_ID),
        descricao: SGO_UTILS.safe(p.NOME || p.REFERENCIA),
        mensagem: function(dias) {
          const nome = SGO_UTILS.safe(p.NOME || p.REFERENCIA || "Peca");
          return dias < 0
            ? "Peca critica '" + nome + "' vencida ha " + Math.abs(dias) + " dia(s)."
            : "Peca critica '" + nome + "' vence em " + dias + " dia(s).";
        }
      });
    });

    safeAll_(SGO_CFG.SHEETS.FORN_DOCUMENTOS, "ESTOQUE").forEach(function(doc) {
      pushVencimento_(alertas, {
        hoje: hoje,
        diasAviso: diasAviso,
        categoria: "FORNECEDOR_DOCUMENTO",
        referenciaId: doc.ID,
        descricao: SGO_UTILS.safe(doc.TIPO_DOCUMENTO),
        data: doc.DATA_VENCIMENTO,
        mensagem: function(dias) {
          return dias < 0
            ? "Documento de fornecedor '" + SGO_UTILS.safe(doc.TIPO_DOCUMENTO) + "' vencido ha " + Math.abs(dias) + " dia(s)."
            : "Documento de fornecedor '" + SGO_UTILS.safe(doc.TIPO_DOCUMENTO) + "' vence em " + dias + " dia(s).";
        }
      });
    });

    safeAll_(SGO_CFG.SHEETS.EST_LOTES, "ESTOQUE").forEach(function(lote) {
      pushVencimento_(alertas, {
        hoje: hoje,
        diasAviso: diasAviso,
        categoria: "ESTOQUE_LOTE_VALIDADE",
        referenciaId: lote.ID,
        descricao: SGO_UTILS.safe(lote.NUMERO_LOTE || lote.NUMERO_SERIE),
        data: lote.DATA_VALIDADE,
        mensagem: function(dias) {
          const loteLabel = SGO_UTILS.safe(lote.NUMERO_LOTE || lote.NUMERO_SERIE || lote.ID);
          return dias < 0
            ? "Lote " + loteLabel + " vencido ha " + Math.abs(dias) + " dia(s)."
            : "Lote " + loteLabel + " vence em " + dias + " dia(s).";
        }
      });
    });

    safeAll_(SGO_CFG.SHEETS.EST_ITENS, "ESTOQUE").forEach(function(item) {
      const lotes = safeAll_(SGO_CFG.SHEETS.EST_LOTES, "ESTOQUE").filter(function(lote) {
        return SGO_UTILS.safe(lote.ITEM_ID) === SGO_UTILS.safe(item.ID)
          && SGO_UTILS.safeUpper(lote.BLOQUEADO) !== "S"
          && SGO_UTILS.safeUpper(lote.STATUS) !== "VENCIDO";
      });
      const saldo = lotes.reduce(function(acc, lote) {
        return acc + SGO_UTILS.toNumber(lote.QUANTIDADE_ATUAL, 0);
      }, 0);
      const minimo = SGO_UTILS.toNumber(item.ESTOQUE_MINIMO, 0);
      if (minimo > 0 && saldo <= minimo) {
        alertas.push({
          tipo: saldo <= 0 ? "CRITICO" : "ATENCAO",
          status: "ESTOQUE_BAIXO",
          categoria: "ESTOQUE_BAIXO",
          referenciaId: item.ID,
          descricao: SGO_UTILS.safe(item.DESCRICAO || item.CODIGO_INTERNO),
          validade: String(minimo),
          dias: 0,
          mensagem: "Item " + SGO_UTILS.safe(item.DESCRICAO || item.CODIGO_INTERNO) + " com saldo " + saldo + " abaixo do minimo " + minimo + "."
        });
      }
    });

    safeAll_(SGO_CFG.SHEETS.OS_ORDENS, "OS").forEach(function(os) {
      if (clienteIdFiltro && SGO_UTILS.safe(os.CLIENTE_ID) !== clienteIdFiltro) return;
      const status = SGO_UTILS.safeUpper(os.STATUS);
      const statusFinal = [
        SGO_CFG.OS.STATUS.CONCLUIDA,
        SGO_CFG.OS.STATUS.APROVADA,
        SGO_CFG.OS.STATUS.FATURADA,
        SGO_CFG.OS.STATUS.CANCELADA
      ].indexOf(status) >= 0;
      const prazo = parseDate_(os.SLA_PRAZO);
      if (prazo && !statusFinal && prazo < hoje) {
        const dias = diasEntre_(prazo, hoje);
        alertas.push({
          tipo: "CRITICO",
          status: "ATRASADO",
          categoria: "OS",
          referenciaId: os.ID,
          cliente: nomeCliente_(os.CLIENTE_ID),
          tag: tagEquipamento_(os.EQUIPAMENTO_ID),
          descricao: SGO_UTILS.safe(os.NUMERO_OS || os.TIPO_OS),
          validade: SGO_UTILS.safe(os.SLA_PRAZO),
          dias: dias,
          mensagem: "OS " + SGO_UTILS.safe(os.NUMERO_OS) + " esta atrasada ha " + Math.abs(dias) + " dia(s)."
        });
      }
      const abertaSemTecnicoHoras = (SGO_CFG.ALERTAS_V2 && SGO_CFG.ALERTAS_V2.OS_SEM_TECNICO_HORAS) || 24;
      if (status === SGO_CFG.OS.STATUS.ABERTA && !SGO_UTILS.safe(os.TECNICO_ID) && os.DATA_ABERTURA) {
        const abertaEm = new Date(os.DATA_ABERTURA);
        const horas = (new Date().getTime() - abertaEm.getTime()) / 3600000;
        if (!isNaN(horas) && horas >= abertaSemTecnicoHoras) {
          alertas.push({
            tipo: "ATENCAO",
            status: "PENDENTE",
            categoria: "OS_SEM_TECNICO",
            referenciaId: os.ID,
            cliente: nomeCliente_(os.CLIENTE_ID),
            tag: tagEquipamento_(os.EQUIPAMENTO_ID),
            descricao: SGO_UTILS.safe(os.NUMERO_OS || os.TIPO_OS),
            validade: SGO_UTILS.safe(os.DATA_ABERTURA),
            dias: 0,
            mensagem: "OS " + SGO_UTILS.safe(os.NUMERO_OS) + " esta aberta sem tecnico ha mais de " + abertaSemTecnicoHoras + "h."
          });
        }
      }
    });

    safeAll_(SGO_CFG.SHEETS.FRT_VEICULOS, "FROTA").forEach(function(v) {
      [
        ["FROTA_SEGURO", "seguro", v.DATA_VENCIMENTO_SEGURO, (SGO_CFG.ALERTAS_V2 && SGO_CFG.ALERTAS_V2.DIAS_FROTA_DOCUMENTO) || 30],
        ["FROTA_IPVA", "IPVA", v.DATA_VENCIMENTO_IPVA, (SGO_CFG.ALERTAS_V2 && SGO_CFG.ALERTAS_V2.DIAS_FROTA_DOCUMENTO) || 30],
        ["FROTA_LICENCIAMENTO", "licenciamento", v.DATA_VENCIMENTO_LICENCIAMENTO, (SGO_CFG.ALERTAS_V2 && SGO_CFG.ALERTAS_V2.DIAS_FROTA_DOCUMENTO) || 30],
        ["FROTA_MANUTENCAO", "manutencao", v.DATA_PROXIMA_MANUT, (SGO_CFG.ALERTAS_V2 && SGO_CFG.ALERTAS_V2.DIAS_FROTA_MANUTENCAO) || 15]
      ].forEach(function(cfg) {
        pushVencimento_(alertas, {
          hoje: hoje,
          diasAviso: cfg[3],
          categoria: cfg[0],
          referenciaId: v.ID,
          data: cfg[2],
          tag: SGO_UTILS.safe(v.PLACA),
          descricao: SGO_UTILS.safe(v.MODELO || v.MARCA),
          mensagem: function(dias) {
            return dias < 0
              ? "Veiculo " + SGO_UTILS.safe(v.PLACA) + " com " + cfg[1] + " vencido ha " + Math.abs(dias) + " dia(s)."
              : "Veiculo " + SGO_UTILS.safe(v.PLACA) + " com " + cfg[1] + " vencendo em " + dias + " dia(s).";
          }
        });
      });

      const kmProx = SGO_UTILS.toNumber(v.KM_PROXIMA_MANUT, 0);
      const kmAtual = SGO_UTILS.toNumber(v.KM_ATUAL, 0);
      const limiteKm = (SGO_CFG.ALERTAS_V2 && SGO_CFG.ALERTAS_V2.KM_FROTA_MANUTENCAO) || 500;
      if (kmProx > 0 && kmAtual > 0 && (kmProx - kmAtual) <= limiteKm) {
        alertas.push({
          tipo: kmAtual >= kmProx ? "CRITICO" : "ATENCAO",
          status: kmAtual >= kmProx ? "VENCIDO" : "VENCENDO",
          categoria: "FROTA_MANUTENCAO_KM",
          referenciaId: v.ID,
          tag: SGO_UTILS.safe(v.PLACA),
          descricao: "Manutencao por KM",
          validade: String(kmProx),
          dias: kmProx - kmAtual,
          mensagem: "Veiculo " + SGO_UTILS.safe(v.PLACA) + " esta a " + (kmProx - kmAtual) + " km da manutencao."
        });
      }
    });

    const veiculos = mapaPorId_(safeAll_(SGO_CFG.SHEETS.FRT_VEICULOS, "FROTA"));
    safeAll_(SGO_CFG.SHEETS.FRT_AGENDAMENTOS, "FROTA").forEach(function(a) {
      const v = veiculos[SGO_UTILS.safe(a.VEICULO_ID)] || {};
      if (SGO_UTILS.safeUpper(v.BLOQUEADO) === "S" || SGO_UTILS.safeUpper(v.STATUS) === "BLOQUEADO") {
        alertas.push({
          tipo: "CRITICO",
          status: "BLOQUEADO",
          categoria: "FROTA_BLOQUEADA_COM_MISSAO",
          referenciaId: a.ID,
          tag: SGO_UTILS.safe(v.PLACA),
          descricao: "Veiculo bloqueado com agenda",
          validade: SGO_UTILS.safe(a.DATA_INICIO),
          dias: 0,
          mensagem: "Veiculo " + SGO_UTILS.safe(v.PLACA) + " esta bloqueado e possui agendamento."
        });
      }
    });

    alertas.sort(function(a, b) { return a.dias - b.dias; });
    return alertas;
  }

  function obterAlertasDashboard(sessionId) {
    const sessao = exigirSessao(sessionId);
    const isCliente = SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE";
    const alertas = coletarAlertasSistema(getDiasAviso_(), {
      clienteId: isCliente ? sessao.clienteId : ""
    });

    SGO_DATA.log("ALERTAS_CONSULTA", sessao.usuario, "Alertas carregados: " + alertas.length, "ALERTAS");
    return { success: true, items: alertas };
  }

  return { obterAlertasDashboard, coletarAlertasSistema };
})();

function alertasObterDashboard(sessionId) {
  try {
    return JSON.parse(JSON.stringify(SGO_ALERTAS.obterAlertasDashboard(sessionId)));
  } catch (e) {
    return { success: false, message: "Erro servidor: " + e.message };
  }
}

function alertasColetarSistema(diasAviso) {
  try {
    return JSON.parse(JSON.stringify(SGO_ALERTAS.coletarAlertasSistema(diasAviso)));
  } catch (e) {
    return [];
  }
}
