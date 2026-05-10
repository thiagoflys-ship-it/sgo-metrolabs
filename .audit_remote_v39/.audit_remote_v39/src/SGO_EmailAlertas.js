/* ============================================================
   METROLABS SGO+ — ALERTAS POR E-MAIL
   Arquivo: SGO_EmailAlertas.js

   Envia um e-mail diário consolidado com todos os registros
   técnicos (REG_TECNICO) e documentos (DOC_DOCUMENTOS) que
   estão vencidos ou próximos do vencimento (≤ DIAS_ANTECEDENCIA).

   Configuração via Script Properties:
     EMAIL_ALERTAS_DESTINATARIOS  → e-mails separados por vírgula
     EMAIL_ALERTAS_ATIVO          → "true" | "false"
     EMAIL_ALERTAS_HORA           → hora 0-23 para o trigger diário
   ============================================================ */

const SGO_EMAIL_ALERTAS = (() => {
  const PROP_DEST  = "EMAIL_ALERTAS_DESTINATARIOS";
  const PROP_ATIVO = "EMAIL_ALERTAS_ATIVO";
  const PROP_HORA  = "EMAIL_ALERTAS_HORA";
  const TRIGGER_FN = "enviarAlertasEmailDiario";
  const LOGO_URL   = "https://drive.google.com/thumbnail?id=1WuoymOh5_0S2X3jC2otSq89HMltdDEoP&sz=w900";

  const LABEL_SERVICO = {
    CALIBRACAO: "Calibração", QUALIFICACAO: "Qualificação",
    ENSAIO_ELETRICO: "Ensaio Elétrico", MANUTENCAO_PREVENTIVA: "Manutenção Preventiva",
    MANUTENCAO_CORRETIVA: "Manutenção Corretiva", INSPECAO_SEGURANCA: "Inspeção de Segurança"
  };

  // ── LEITURA / ESCRITA DE CONFIG ───────────────────────────────────────────

  function lerConfig() {
    const props = PropertiesService.getScriptProperties();
    return {
      destinatarios: String(props.getProperty(PROP_DEST)  || "").trim(),
      ativo:         String(props.getProperty(PROP_ATIVO) || "false").trim() === "true",
      hora:          parseInt(props.getProperty(PROP_HORA) || "7", 10) || 7
    };
  }

  function salvarConfig(cfg) {
    const props = PropertiesService.getScriptProperties();
    props.setProperty(PROP_DEST,  String(cfg.destinatarios || "").trim());
    props.setProperty(PROP_ATIVO, cfg.ativo ? "true" : "false");
    props.setProperty(PROP_HORA,  String(parseInt(cfg.hora || 7, 10)));
  }

  // ── TRIGGER ───────────────────────────────────────────────────────────────

  function _removerTriggers() {
    ScriptApp.getProjectTriggers().forEach(function(t) {
      if (t.getHandlerFunction() === TRIGGER_FN) ScriptApp.deleteTrigger(t);
    });
  }

  function configurarTrigger(hora) {
    _removerTriggers();
    const h = parseInt(hora || 7, 10);
    ScriptApp.newTrigger(TRIGGER_FN)
      .timeBased()
      .everyDays(1)
      .atHour(h)
      .create();
    return { success: true, hora: h };
  }

  function removerTrigger() {
    _removerTriggers();
    return { success: true };
  }

  function statusTrigger() {
    const triggers = ScriptApp.getProjectTriggers().filter(function(t) {
      return t.getHandlerFunction() === TRIGGER_FN;
    });
    const cfg = lerConfig();
    return {
      success: true,
      ativo: triggers.length > 0,
      quantidadeTriggers: triggers.length,
      config: cfg
    };
  }

  // ── COLETA DE ALERTAS ─────────────────────────────────────────────────────

  function _parseDate(v) {
    if (!v) return null;
    const s = String(v).trim().substring(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const d = new Date(s + "T00:00:00");
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  function _coletarAlertas(diasAviso) {
    if (typeof SGO_ALERTAS !== "undefined" && SGO_ALERTAS.coletarAlertasSistema) {
      return SGO_ALERTAS.coletarAlertasSistema(diasAviso).map(function(a) {
        return {
          categoria:   SGO_UTILS.safe(a.categoria),
          tipo:        SGO_UTILS.safe(a.categoria),
          tag:         SGO_UTILS.safe(a.tag) || "—",
          descricao:   SGO_UTILS.safe(a.descricao) || SGO_UTILS.safe(a.mensagem),
          cliente:     SGO_UTILS.safe(a.cliente) || "—",
          certificado: SGO_UTILS.safe(a.referenciaId) || "—",
          validade:    SGO_UTILS.safe(a.validade),
          dias:        Number(a.dias || 0),
          status:      SGO_UTILS.safeUpper(a.status) === "ATRASADO" || SGO_UTILS.safeUpper(a.tipo) === "CRITICO" ? "VENCIDO" : "VENCENDO"
        };
      });
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const alertas = [];

    // Mapa de clientes e equipamentos para enriquecimento
    let mapaClientes = {}, mapaEqp = {};
    try {
      SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES).forEach(function(c) {
        mapaClientes[SGO_UTILS.safe(c.ID)] = c;
      });
    } catch(e) {}
    try {
      SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).forEach(function(e) {
        mapaEqp[SGO_UTILS.safe(e.ID)] = e;
      });
    } catch(e) {}

    // REG_TECNICO
    try {
      SGO_DATA.getAll(SGO_CFG.SHEETS.REG_TECNICO)
        .filter(function(r) { return SGO_UTILS.safeUpper(r.STATUS) === SGO_CFG.STATUS.ATIVO && r.DATA_VALIDADE; })
        .forEach(function(r) {
          const dataV = _parseDate(r.DATA_VALIDADE);
          if (!dataV) return;
          const dias = Math.ceil((dataV - hoje) / 86400000);
          if (dias > diasAviso) return;
          const eqp = mapaEqp[SGO_UTILS.safe(r.EQUIPAMENTO_ID)] || {};
          const cli = mapaClientes[SGO_UTILS.safe(r.CLIENTE_ID)] || {};
          alertas.push({
            categoria:   "REG_TECNICO",
            tipo:        LABEL_SERVICO[SGO_UTILS.safeUpper(r.TIPO_SERVICO)] || r.TIPO_SERVICO,
            tag:         SGO_UTILS.safe(eqp.TAG) || "—",
            descricao:   SGO_UTILS.safe(eqp.TIPO) || "—",
            cliente:     SGO_UTILS.safe(cli.NOME_FANTASIA || cli.RAZAO_SOCIAL) || "—",
            certificado: SGO_UTILS.safe(r.NUMERO_CERTIFICADO) || "—",
            validade:    SGO_UTILS.safe(r.DATA_VALIDADE),
            dias:        dias,
            status:      dias < 0 ? "VENCIDO" : "VENCENDO"
          });
        });
    } catch(e) {}

    // DOC_DOCUMENTOS
    try {
      SGO_DATA.getAll(SGO_CFG.SHEETS.DOC_DOCUMENTOS)
        .filter(function(r) { return SGO_UTILS.safeUpper(r.STATUS) === SGO_CFG.STATUS.ATIVO && r.DATA_VENCIMENTO; })
        .forEach(function(r) {
          const dataV = _parseDate(r.DATA_VENCIMENTO);
          if (!dataV) return;
          const dias = Math.ceil((dataV - hoje) / 86400000);
          if (dias > diasAviso) return;
          const eqp = mapaEqp[SGO_UTILS.safe(r.EQUIPAMENTO_ID)] || {};
          const cli = mapaClientes[SGO_UTILS.safe(r.CLIENTE_ID)] || {};
          alertas.push({
            categoria:   "DOCUMENTO",
            tipo:        SGO_UTILS.safe(r.TIPO_DOCUMENTO) || "Documento",
            tag:         SGO_UTILS.safe(eqp.TAG) || "—",
            descricao:   SGO_UTILS.safe(r.DESCRICAO || eqp.TIPO) || "—",
            cliente:     SGO_UTILS.safe(cli.NOME_FANTASIA || cli.RAZAO_SOCIAL) || "—",
            certificado: SGO_UTILS.safe(r.NUMERO_DOCUMENTO || r.NUMERO_CERTIFICADO) || "—",
            validade:    SGO_UTILS.safe(r.DATA_VENCIMENTO),
            dias:        dias,
            status:      dias < 0 ? "VENCIDO" : "VENCENDO"
          });
        });
    } catch(e) {}

    alertas.sort(function(a, b) { return a.dias - b.dias; });
    return alertas;
  }

  // ── HTML DO E-MAIL ────────────────────────────────────────────────────────

  function _buildEmailHtml(alertas, geradoEm) {
    const vencidos  = alertas.filter(function(a) { return a.status === "VENCIDO"; });
    const vencendo  = alertas.filter(function(a) { return a.status === "VENCENDO"; });

    function fmtDt(iso) {
      if (!iso) return "—";
      const p = String(iso).substring(0,10).split("-");
      return p.length === 3 ? p[2]+"/"+p[1]+"/"+p[0] : iso;
    }
    function diasStr(d) {
      if (d < 0) return Math.abs(d) + " dias atrás";
      if (d === 0) return "hoje";
      return "em " + d + " dia" + (d !== 1 ? "s" : "");
    }
    function rowColor(a) {
      return a.status === "VENCIDO" ? "#fff5f5" : "#fffbeb";
    }
    function statusBadge(a) {
      if (a.status === "VENCIDO") return '<span style="background:#dc2626;color:#fff;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;">VENCIDO</span>';
      return '<span style="background:#d97706;color:#fff;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;">VENCENDO</span>';
    }

    const rows = alertas.map(function(a) {
      return '<tr style="background:'+rowColor(a)+';">'
        + '<td style="padding:8px 10px;border:1px solid #e5e7eb;font-weight:700;">'+a.tag+'</td>'
        + '<td style="padding:8px 10px;border:1px solid #e5e7eb;font-size:12px;">'+a.cliente+'</td>'
        + '<td style="padding:8px 10px;border:1px solid #e5e7eb;font-size:12px;">'+a.tipo+'</td>'
        + '<td style="padding:8px 10px;border:1px solid #e5e7eb;font-size:12px;">'+a.descricao+'</td>'
        + '<td style="padding:8px 10px;border:1px solid #e5e7eb;font-size:11px;font-family:monospace;">'+a.certificado+'</td>'
        + '<td style="padding:8px 10px;border:1px solid #e5e7eb;font-weight:600;white-space:nowrap;">'+fmtDt(a.validade)+'</td>'
        + '<td style="padding:8px 10px;border:1px solid #e5e7eb;font-size:11px;color:#667085;white-space:nowrap;">'+diasStr(a.dias)+'</td>'
        + '<td style="padding:8px 10px;border:1px solid #e5e7eb;">'+statusBadge(a)+'</td>'
        + '</tr>';
    }).join("");

    return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f4f7fb;">'
      + '<div style="max-width:800px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">'
      // HEADER
      + '<div style="background:#0b3b78;padding:20px 28px;display:flex;align-items:center;gap:20px;">'
      + '<img src="'+LOGO_URL+'" alt="Metrolabs" style="max-width:180px;height:auto;" onerror="this.style.display=\'none\'">'
      + '<div><div style="color:#fff;font-size:18px;font-weight:900;letter-spacing:-.01em;">Alerta de Vencimentos</div>'
      + '<div style="color:rgba(255,255,255,.75);font-size:13px;margin-top:3px;">METROLABS SGO+ — Engenharia Clínica</div></div>'
      + '</div>'
      // SUMMARY CARDS
      + '<div style="display:flex;gap:0;border-bottom:1px solid #e5e7eb;">'
      + '<div style="flex:1;padding:16px 20px;border-right:1px solid #e5e7eb;text-align:center;">'
      + '<div style="font-size:28px;font-weight:900;color:'+(vencidos.length?'#dc2626':'#16a34a')+'">'+(alertas.length)+'</div>'
      + '<div style="font-size:11px;color:#667085;text-transform:uppercase;font-weight:700;margin-top:2px;">Total de alertas</div>'
      + '</div>'
      + '<div style="flex:1;padding:16px 20px;border-right:1px solid #e5e7eb;text-align:center;">'
      + '<div style="font-size:28px;font-weight:900;color:'+(vencidos.length?'#dc2626':'#94a3b8')+'">'+vencidos.length+'</div>'
      + '<div style="font-size:11px;color:#667085;text-transform:uppercase;font-weight:700;margin-top:2px;">Vencidos</div>'
      + '</div>'
      + '<div style="flex:1;padding:16px 20px;text-align:center;">'
      + '<div style="font-size:28px;font-weight:900;color:'+(vencendo.length?'#d97706':'#94a3b8')+'">'+vencendo.length+'</div>'
      + '<div style="font-size:11px;color:#667085;text-transform:uppercase;font-weight:700;margin-top:2px;">Vencendo em breve</div>'
      + '</div>'
      + '</div>'
      // TABLE
      + '<div style="padding:20px 24px;">'
      + (alertas.length === 0
        ? '<div style="text-align:center;padding:30px;color:#16a34a;font-size:15px;font-weight:700;">✓ Nenhum vencimento pendente. Tudo em dia!</div>'
        : '<table style="width:100%;border-collapse:collapse;font-size:13px;">'
          + '<thead><tr style="background:#f0f4fa;">'
          + '<th style="padding:9px 10px;border:1px solid #e5e7eb;text-align:left;font-size:10px;text-transform:uppercase;color:#344054;">TAG</th>'
          + '<th style="padding:9px 10px;border:1px solid #e5e7eb;text-align:left;font-size:10px;text-transform:uppercase;color:#344054;">Cliente</th>'
          + '<th style="padding:9px 10px;border:1px solid #e5e7eb;text-align:left;font-size:10px;text-transform:uppercase;color:#344054;">Tipo</th>'
          + '<th style="padding:9px 10px;border:1px solid #e5e7eb;text-align:left;font-size:10px;text-transform:uppercase;color:#344054;">Descrição</th>'
          + '<th style="padding:9px 10px;border:1px solid #e5e7eb;text-align:left;font-size:10px;text-transform:uppercase;color:#344054;">Certificado</th>'
          + '<th style="padding:9px 10px;border:1px solid #e5e7eb;text-align:left;font-size:10px;text-transform:uppercase;color:#344054;">Validade</th>'
          + '<th style="padding:9px 10px;border:1px solid #e5e7eb;text-align:left;font-size:10px;text-transform:uppercase;color:#344054;">Prazo</th>'
          + '<th style="padding:9px 10px;border:1px solid #e5e7eb;text-align:left;font-size:10px;text-transform:uppercase;color:#344054;">Status</th>'
          + '</tr></thead><tbody>'+rows+'</tbody></table>'
      )
      + '</div>'
      // FOOTER
      + '<div style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:14px 24px;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between;">'
      + '<span>Gerado automaticamente pelo <strong style="color:#0b3b78;">METROLABS SGO+</strong></span>'
      + '<span>'+geradoEm+'</span>'
      + '</div>'
      + '</div></body></html>';
  }

  // ── ENVIO ─────────────────────────────────────────────────────────────────

  function enviar(forcar) {
    const cfg = lerConfig();
    if (!forcar && !cfg.ativo) return { success: false, message: "Alertas por e-mail desativados." };

    const destinatarios = cfg.destinatarios.split(",")
      .map(function(e) { return e.trim(); })
      .filter(function(e) { return e.length > 0; });

    if (!destinatarios.length) return { success: false, message: "Nenhum destinatário configurado." };

    const diasAviso = (SGO_CFG.ALERTAS && SGO_CFG.ALERTAS.DIAS_ANTECEDENCIA_PADRAO) || 30;
    const alertas = _coletarAlertas(diasAviso);
    const geradoEm = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
    const html = _buildEmailHtml(alertas, geradoEm);

    const vencidos = alertas.filter(function(a) { return a.status === "VENCIDO"; }).length;
    const assunto = alertas.length === 0
      ? "[METROLABS SGO+] ✓ Nenhum vencimento pendente — " + geradoEm
      : "[METROLABS SGO+] ⚠ " + alertas.length + " alerta(s) de vencimento — " + vencidos + " vencido(s) — " + geradoEm;

    destinatarios.forEach(function(email) {
      try {
        MailApp.sendEmail({ to: email, subject: assunto, htmlBody: html });
      } catch(e) {
        SGO_DATA.log("EMAIL_ALERTA_ERRO", "SISTEMA", "Erro ao enviar para " + email + ": " + e.message, "EMAIL");
      }
    });

    SGO_DATA.log("EMAIL_ALERTA_ENVIADO", "SISTEMA",
      "Alertas enviados. Total=" + alertas.length + " Destinatários=" + destinatarios.length, "EMAIL");

    return {
      success: true,
      totalAlertas: alertas.length,
      destinatarios: destinatarios.length,
      message: "E-mail enviado com sucesso para " + destinatarios.length + " destinatário(s)."
    };
  }

  function configurar(sessionId, cfg) {
    const sessao = exigirSessao(sessionId);
    if (!isAdminSession(sessionId)) return { success: false, message: "Acesso negado. Apenas administradores podem configurar alertas." };

    const novaConfig = {
      destinatarios: String(cfg.destinatarios || "").trim(),
      ativo:         !!cfg.ativo,
      hora:          parseInt(cfg.hora || 7, 10)
    };
    salvarConfig(novaConfig);

    if (novaConfig.ativo) {
      configurarTrigger(novaConfig.hora);
    } else {
      _removerTriggers();
    }

    SGO_DATA.log("EMAIL_ALERTA_CONFIG", sessao.usuario,
      "Alertas configurados. Ativo=" + novaConfig.ativo + " Dest=" + novaConfig.destinatarios, "EMAIL");

    return { success: true, message: "Configuração salva com sucesso.", config: novaConfig };
  }

  function testar(sessionId) {
    if (!isAdminSession(sessionId)) return { success: false, message: "Acesso negado." };
    return enviar(true);
  }

  return { configurar, testar, statusTrigger, removerTrigger, enviar };
})();

/* =========================
   WRAPPERS PÚBLICOS
========================= */
function enviarAlertasEmailDiario() {
  try { SGO_EMAIL_ALERTAS.enviar(false); } catch(e) {
    try { SGO_DATA.log("EMAIL_ALERTA_ERRO", "TRIGGER", e.message, "EMAIL"); } catch(ex) {}
  }
}
function emailAlertasConfigurar(sessionId, cfg) {
  try { return JSON.parse(JSON.stringify(SGO_EMAIL_ALERTAS.configurar(sessionId, cfg))); }
  catch(e) { return { success: false, message: e.message }; }
}
function emailAlertasStatus(sessionId) {
  try {
    exigirSessao(sessionId);
    return JSON.parse(JSON.stringify(SGO_EMAIL_ALERTAS.statusTrigger()));
  } catch(e) { return { success: false, message: e.message }; }
}
function emailAlertasTestar(sessionId) {
  try { return JSON.parse(JSON.stringify(SGO_EMAIL_ALERTAS.testar(sessionId))); }
  catch(e) { return { success: false, message: e.message }; }
}
function emailAlertasRemoverTrigger(sessionId) {
  try {
    if (!isAdminSession(sessionId)) return { success: false, message: "Acesso negado." };
    return JSON.parse(JSON.stringify(SGO_EMAIL_ALERTAS.removerTrigger()));
  } catch(e) { return { success: false, message: e.message }; }
}
