/**
 * Cronograma de execução — documento A4 (padrão de 18/10/2026,
 * docs/DOCUMENTOS_PADRAO_A4_20261018.md): moldura SGO_RelTecA4, tipografia e tabelas da
 * SGO_DocA4, seções numeradas, Tabela N acima, Figura N (gráfico de Gantt em SVG estático,
 * grupos × dias) abaixo, considerações finais e assinaturas na mesma folha.
 */

/** Texto corrido (parágrafos separados por linha em branco) → <p>. */
function CronExecDoc_paragrafosHtml_(texto) {
  const partes = String(texto || "").replace(/\r\n/g, "\n").split(/\n\s*\n/)
    .map(p => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
  if (!partes.length) return "";
  return partes.map(p => "<p>" + CronExec_escaparHtml_(p) + "</p>").join("\n");
}

/**
 * Texto gravado (IA ou padrão antigo): "a tabela abaixo/a seguir" vira a referência pelo
 * número; a frase antiga que só anunciava a tabela sai (o documento escreve a própria).
 */
function CronExecDoc_texto_(texto, nTabelaGrupos) {
  return String(texto || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\s*As datas de cada grupo estão na tabela a seguir\./gi, "")
    .replace(/A tabela abaixo apresenta, para cada grupo, o período de execução e os equipamentos atendidos\./gi, "")
    .replace(/\b([Aa]|[Nn]a|[Dd]a)\s+tabela\s+(?:abaixo|acima|a seguir|seguinte)/g, function (m, art) { return art + " Tabela " + nTabelaGrupos; })
    .trim();
}

/** CSS: padrão SGO_DocA4 + ajustes do cronograma + moldura SGO_RelTecA4 (por último). */
function CronExec_getCss_(opcoes) {
  const o = opcoes || {};
  const docA4 = (typeof SGO_DocA4_estilos_ === "function")
    ? SGO_DocA4_estilos_({ tituloCurto: o.titulo, numero: o.numero, revisao: o.revisao })
    : SGO_DocA4_css_();
  const proprio = [
    ".abertura{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:.6pt solid #9aa5b1;padding-bottom:2.2mm;margin:0 0 6mm}",
    ".abertura img{height:13mm;width:auto;display:block}",
    ".abertura .meta{text-align:right;font-size:7.8pt;line-height:1.35;color:#3e4c59}",
    "ul.lista li{text-align:left}",
    "table.t td .eq{display:block}",
    ".reltec-fecho .assinaturas{margin-top:7mm}"
  ].join("");
  return docA4 + proprio + RelTecA4_css_({ titulo: o.titulo, numero: o.numero, revisao: o.revisao, orientacao: "retrato" });
}

function CronExecDoc_logo_() {
  try { if (typeof SGO_DocA4_logoDataUri_ === "function") return SGO_DocA4_logoDataUri_(); } catch (e) { /* reserva */ }
  return CronExec_getLogoDataUri_();
}

function CronExecDoc_empresa_() {
  try {
    const e = (typeof CadeiaFrioRel_CFCFG !== "undefined") ? CadeiaFrioRel_CFCFG.EMPRESA_EXECUTANTE : null;
    if (e && e.nome) return String(e.nome) + (e.cnpj ? " — CNPJ " + e.cnpj : "");
  } catch (err) { /* nome do módulo */ }
  return CRONEXEC_CFG.EMPRESA.NOME;
}

/** Dias úteis (sem sábado, domingo e feriado nacional) entre duas datas ISO, inclusive. */
function CronExecDoc_diasUteis_(ini, fim) {
  const a = CronExec_parseDataISO_(ini), b = CronExec_parseDataISO_(fim);
  if (!a || !b || isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  let n = 0;
  const d = new Date(a.getTime());
  while (d.getTime() <= b.getTime()) { if (CronExec_ehDiaUtil_(d)) n++; d.setDate(d.getDate() + 1); }
  return n;
}

/** "Autoclave Fabricante B AV-100" (tipo, marca e modelo do cadastro do equipamento). */
function CronExecDoc_nomeItem_(item) {
  return [item.tipo, item.marca, item.modelo].filter(function (x) { return String(x || "").trim(); }).join(" ");
}

/**
 * Gráfico de Gantt em SVG estático: uma linha por grupo, uma coluna por dia corrido do
 * período; dias úteis de execução em azul, fim de semana e feriado nacional sombreados.
 */
function CronExecDoc_gantt_(grupos, largura) {
  const gs = (grupos || []).filter(function (g) { return g && g.dataInicio && g.dataFim; });
  if (!gs.length) return "";
  let ini = null, fim = null;
  gs.forEach(function (g) {
    const a = CronExec_parseDataISO_(g.dataInicio), b = CronExec_parseDataISO_(g.dataFim);
    if (!ini || a < ini) ini = a;
    if (!fim || b > fim) fim = b;
  });
  const dias = [];
  for (const d = new Date(ini.getTime()); d.getTime() <= fim.getTime(); d.setDate(d.getDate() + 1)) dias.push(new Date(d.getTime()));
  if (dias.length > 400) return "";
  const W = largura || 680, mL = 92, mR = 8, mT = 34, alt = 18, gap = 8, mB = 34;
  const H = mT + gs.length * (alt + gap) - gap + mB;
  const dw = (W - mL - mR) / dias.length;
  const X = function (i) { return mL + i * dw; };
  const f = function (n) { return (Math.round(n * 10) / 10).toString(); };
  const iso = function (d) { return CronExec_formatarDataISO_(d); };
  const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const s = [];
  s.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" font-family="Arial, Helvetica, sans-serif" font-size="9" role="img">');
  // fundo: dias não úteis sombreados
  dias.forEach(function (d, i) {
    if (!CronExec_ehDiaUtil_(d)) s.push('<rect x="' + f(X(i)) + '" y="' + (mT - 4) + '" width="' + f(dw) + '" height="' + (H - mT - mB + 8) + '" fill="#eef2f6"/>');
  });
  // meses (linha de cima)
  let mesAtual = -1, iniMes = 0;
  const fecharMes = function (fimIdx) {
    if (mesAtual < 0) return;
    const larg = X(fimIdx) - X(iniMes);
    const rot = meses[mesAtual] + " de " + dias[iniMes].getFullYear();
    if (larg > rot.length * 4.6) s.push('<text x="' + f(X(iniMes) + 2) + '" y="11" fill="#243b53" font-weight="700">' + rot + '</text>');
    s.push('<line x1="' + f(X(iniMes)) + '" y1="2" x2="' + f(X(iniMes)) + '" y2="' + (H - mB + 4) + '" stroke="#9aa5b1" stroke-width="0.8"/>');
  };
  dias.forEach(function (d, i) {
    if (d.getMonth() !== mesAtual) { fecharMes(i); mesAtual = d.getMonth(); iniMes = i; }
  });
  fecharMes(dias.length);
  // números dos dias (todos, se couber; senão só as segundas-feiras)
  const todos = dw >= 11;
  dias.forEach(function (d, i) {
    if (todos || d.getDay() === 1) {
      s.push('<text x="' + f(X(i) + dw / 2) + '" y="' + (mT - 9) + '" text-anchor="middle" fill="' + (CronExec_ehDiaUtil_(d) ? '#1f2933' : '#7b8794') + '" font-size="' + (todos ? 8 : 8.5) + '">' + d.getDate() + '</text>');
    }
  });
  // grupos
  gs.forEach(function (g, k) {
    const y = mT + k * (alt + gap);
    const un = (g.itens || []).reduce(function (t, it) { return t + (Number(it.quantidade) || 0); }, 0);
    s.push('<text x="' + (mL - 8) + '" y="' + f(y + alt / 2 - 1) + '" text-anchor="end" fill="#1f2933" font-size="9.5" font-weight="700">Grupo ' + g.ordinal + '</text>');
    s.push('<text x="' + (mL - 8) + '" y="' + f(y + alt / 2 + 9) + '" text-anchor="end" fill="#52606d" font-size="8">' + un + (un === 1 ? ' unidade' : ' unidades') + '</text>');
    s.push('<line x1="' + mL + '" y1="' + f(y + alt / 2) + '" x2="' + (W - mR) + '" y2="' + f(y + alt / 2) + '" stroke="#e4e8ed" stroke-width="0.6"/>');
    const a = iso(CronExec_parseDataISO_(g.dataInicio)), b = iso(CronExec_parseDataISO_(g.dataFim));
    dias.forEach(function (d, i) {
      const di = iso(d);
      if (di < a || di > b) return;
      if (CronExec_ehDiaUtil_(d)) s.push('<rect x="' + f(X(i) + 0.6) + '" y="' + y + '" width="' + f(Math.max(1, dw - 1.2)) + '" height="' + alt + '" fill="#1f5fa8"/>');
      else s.push('<rect x="' + f(X(i) + 0.6) + '" y="' + f(y + alt / 2 - 1) + '" width="' + f(Math.max(1, dw - 1.2)) + '" height="2" fill="#1f5fa8" fill-opacity="0.45"/>');
    });
  });
  // legenda
  const yl = H - 10;
  s.push('<rect x="' + mL + '" y="' + (yl - 8) + '" width="12" height="9" fill="#1f5fa8"/><text x="' + (mL + 16) + '" y="' + yl + '" fill="#1f2933">Dia útil de execução</text>');
  s.push('<rect x="' + (mL + 130) + '" y="' + (yl - 8) + '" width="12" height="9" fill="#eef2f6" stroke="#bcc5cf" stroke-width="0.5"/><text x="' + (mL + 146) + '" y="' + yl + '" fill="#1f2933">Sábado, domingo ou feriado nacional (não contado)</text>');
  s.push('</svg>');
  return s.join("");
}

/**
 * Monta o documento do Cronograma de execução.
 * dados: { cliente, equipamentos, agrupamento:{ grupos, fundamentacao }, textosIA, numeroDocumento }
 */
function CronExec_montarDocumentoHtml_(dados) {
  dados = dados || {};
  const cliente = dados.cliente || {};
  const equipamentos = dados.equipamentos || [];
  const agrupamento = dados.agrupamento || {};
  const grupos = agrupamento.grupos || [];
  const textosIA = dados.textosIA || {};
  const tz = Session.getScriptTimeZone();
  const agora = new Date();
  const emissao = Utilities.formatDate(agora, tz, "dd/MM/yyyy HH:mm");
  const assinaturas = CRONEXEC_CFG.ASSINATURAS_PADRAO || [];
  const numeroCron = dados.numeroDocumento || ("CRN-" + Utilities.formatDate(agora, tz, "yyyyMMdd-HHmm"));
  const revCron = RelTecA4_revisao_(dados.revisao);
  const tituloCurto = "Cronograma de execução";
  const esc = CronExec_escaparHtml_;
  const num = RelTecA4_numerador_();
  let n = 0;
  const h2 = function (t) { n++; return '<h2>' + n + '. ' + esc(t) + '</h2>'; };

  const totalUn = equipamentos.reduce(function (t, e) { return t + (Number(e.quantidade) || 0); }, 0);
  const primeiro = grupos[0], ultimo = grupos[grupos.length - 1];
  const periodo = (primeiro && ultimo) ? CronExec_formatarDataBr_(primeiro.dataInicio) + " a " + CronExec_formatarDataBr_(ultimo.dataFim) : "—";
  const nTabEq = 1, nTabGr = 2;
  const txt = function (t) { return CronExecDoc_texto_(t, nTabGr); };

  const html = [];
  html.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">');
  html.push('<meta name="sgo-identificador" content="' + esc(numeroCron) + '">');
  html.push('<title>Cronograma de execução ' + esc(numeroCron) + ' — ' + esc(cliente.razaoSocial || "Cliente") + '</title>');
  html.push('<style>' + CronExec_getCss_({ titulo: tituloCurto, numero: numeroCron, revisao: revCron }) + '</style></head><body>');
  html.push('<div class="barra-tela"><button type="button" onclick="window.print()">Imprimir ou salvar em PDF</button></div>');
  html.push('<main class="folha">');
  html.push('<header class="abertura"><img src="' + CronExecDoc_logo_() + '" alt="Metrolabs"><div class="meta">' + esc(tituloCurto) + '<br>Nº ' + esc(numeroCron) + ' · Revisão ' + esc(revCron) + '</div></header>');
  html.push('<h1>Cronograma de execução</h1>');
  html.push('<p class="subtitulo">Calibração e qualificação de equipamentos' + (cliente.razaoSocial ? ' — ' + esc(cliente.razaoSocial) : '') + '</p>');
  html.push(SGO_DocA4_tabelaIdent_([["Emissão", emissao], ["Revisão", revCron], ["Período previsto", periodo],
    ["Grupos e unidades", grupos.length + (grupos.length === 1 ? " grupo" : " grupos") + ", " + totalUn + (totalUn === 1 ? " unidade" : " unidades")]], "ficha"));
  html.push('<!--sgo-sumario-->'); // sumário só se passar de 3 páginas (CronExecDoc_sumarioSeLongo_)

  // 1. Identificação
  html.push('<section>' + h2("Identificação"));
  html.push(SGO_DocA4_tabelaIdent_([
    ["Cliente", cliente.razaoSocial || "—", { largo: true }],
    ["CNPJ", cliente.cnpj || "—"], ["Localização", [cliente.cidade, cliente.uf].filter(Boolean).join("/") || "—"],
    ["Endereço", CronExec_montarEnderecoDoc_(cliente) || "—", { largo: true }],
    ["Empresa executante", CronExecDoc_empresa_(), { largo: true }],
    ["Responsável técnico", CRONEXEC_CFG.EMPRESA.RESPONSAVEL_TECNICO, { largo: true }]
  ]));
  html.push('</section>');

  if (textosIA.objetivo) html.push('<section>' + h2("Objetivo") + CronExecDoc_paragrafosHtml_(txt(textosIA.objetivo)) + '</section>');

  // Equipamentos (Tabela 1)
  html.push('<section>' + h2("Equipamentos"));
  const dividido = CronExec_temEquipamentoDividido_(equipamentos, grupos);
  html.push('<p>A Tabela ' + nTabEq + ' lista os equipamentos deste cronograma e o grupo de execução de cada unidade.' +
    (dividido ? ' Equipamentos com mais de uma unidade são distribuídos em grupos diferentes, para que nenhum tipo fique totalmente indisponível ao mesmo tempo.' : '') + '</p>');
  html.push(num.tabela("Equipamentos e distribuição nos grupos"));
  html.push(SGO_DocA4_tabela_([{ t: "Tipo de equipamento" }, { t: "Marca" }, { t: "Modelo" }, { t: "Quantidade", cls: "num" }, { t: "Distribuição nos grupos" }],
    equipamentos.map(function (e) { return [e.tipo || "—", e.marca || "—", e.modelo || "—", SGO_DocA4_num_(Number(e.quantidade) || 0, 0), CronExec_distribuicaoPorEquipamento_(e.id, grupos)]; }),
    { rodape: [{ t: "Total" }, { t: "" }, { t: "" }, SGO_DocA4_num_(totalUn, 0), grupos.length + (grupos.length === 1 ? " grupo" : " grupos")] }));
  html.push('</section>');

  if (textosIA.metodologia) html.push('<section>' + h2("Metodologia de execução") + CronExecDoc_paragrafosHtml_(txt(textosIA.metodologia)) + '</section>');

  // Grupos de execução (Tabela 2 + Figura 1)
  const gantt = CronExecDoc_gantt_(grupos);
  const nFig = num.proximaFigura();
  html.push('<section>' + h2("Grupos de execução"));
  if (textosIA.gruposIntro) html.push(CronExecDoc_paragrafosHtml_(txt(textosIA.gruposIntro)));
  html.push('<p>A Tabela ' + nTabGr + ' apresenta o período e os equipamentos de cada grupo' + (gantt ? ', e a Figura ' + nFig + ' mostra os grupos no calendário' : '') +
    '. Os prazos contam dias úteis: sábados, domingos e feriados nacionais não entram na contagem.</p>');
  html.push(num.tabela("Grupos de execução"));
  html.push(SGO_DocA4_tabela_([{ t: "Grupo" }, { t: "Início" }, { t: "Término" }, { t: "Dias úteis", cls: "num" }, { t: "Equipamentos" }],
    grupos.map(function (g) {
      return ["Grupo " + g.ordinal, CronExec_formatarDataBrComDia_(g.dataInicio), CronExec_formatarDataBrComDia_(g.dataFim),
        SGO_DocA4_num_(CronExecDoc_diasUteis_(g.dataInicio, g.dataFim), 0),
        { html: (g.itens || []).map(function (it) { return '<span class="eq">' + esc(CronExecDoc_nomeItem_(it)) + ': ' + esc(String(it.quantidade)) + ' un.</span>'; }).join("") }];
    })));
  if (gantt) html.push(num.figura(gantt, "Calendário de execução por grupo (" + periodo + ")"));
  html.push('</section>');

  html.push('<section>' + h2("Orientações ao cliente"));
  html.push('<p>Para o bom andamento dos serviços, solicita-se à instituição:</p>');
  html.push(SGO_DocA4_lista_(CRONEXEC_CFG.TEXTOS.ORIENTACOES_CLIENTE || []));
  html.push('</section>');

  // Considerações finais + assinaturas na mesma folha
  html.push('<section class="reltec-fecho">' + h2("Considerações finais e responsabilidade técnica"));
  html.push(CronExecDoc_paragrafosHtml_(txt(textosIA.consideracoesFinais || "As datas são previsões e podem ser ajustadas em comum acordo com o cliente, conforme a disponibilidade dos equipamentos e da equipe. Alterações devem ser registradas em nova revisão deste cronograma.")));
  html.push(SGO_DocA4_assinaturas_(assinaturas));
  html.push('</section>');
  html.push('<!--SGO_DOCREV-->');

  html.push('</main></body></html>');
  return html.join("\n");
}

/**
 * Monta o documento e retorna só o HTML (sem gravar) — o frontend abre o HTML numa nova
 * aba e só salva quando o usuário clica em "Salvar na pasta do cliente".
 */
function CronExec_apiMontarDocumentoFinal(dados, sessionId) {
  try {
    // 21/10/2026: revisão (SGO_DocRevisao.js) — histórico no documento e dados guardados para corrigir depois.
    dados = Object.assign({}, dados || {});
    delete dados.htmlDocumento;
    const docRev = SGO_DocRev_montar_("CRONOGRAMA_EXECUCAO", dados, sessionId, "");
    if (docRev.numero) dados.numeroDocumento = docRev.numero;
    dados.revisao = docRev.revisao;
    const montado = CronExec_montarDocumentoHtml_(dados).replace("<!--SGO_DOCREV-->", SGO_DocRev_blocoHtml_(docRev));
    const html = SGO_DocRev_finalizarMontagem_("CRONOGRAMA_EXECUCAO", docRev, dados, CronExecDoc_sumarioSeLongo_(montado, "Cronograma de execução"), dados.numeroDocumento, { semHistorico: true });
    return { ok: true, html: html, revisao: docRev.rotulo };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao montar o documento: " + e.message };
  }
}

/**
 * Grava HTML + PDF na pasta do cliente (subpasta = CNPJ com 14 dígitos; sem CNPJ, nome)
 * e registra na planilha. Nome: "Cronograma de execucao - <número> - <cliente> - <aaaa-MM-dd HHmm>".
 */
function CronExec_apiSalvarDocumento(payload, sessionId) {
  try {
    payload = payload || {};
    if (!payload.html) throw new Error("Nenhum conteúdo de documento recebido para salvar.");
    const docRevS = SGO_DocRev_abrirSalvamento_(String(payload.html || ""));
    const html = docRevS.html;

    const props = PropertiesService.getScriptProperties();
    let pastaId = props.getProperty("CRONEXEC_PASTA_PDF_ID");
    if (!pastaId) {
      CronExec_setupModulo();
      pastaId = props.getProperty("CRONEXEC_PASTA_PDF_ID");
    }

    const raiz = DriveApp.getFolderById(pastaId);
    const pasta = (payload.cnpj || payload.cliente) ? SGO_DocSalvar_pastaClienteEm_(raiz, payload.cnpj, payload.cliente) : raiz;
    const tz = Session.getScriptTimeZone();
    const numero = (/<meta name="sgo-identificador" content="([^"]*)">/.exec(html) || [])[1] || ("CRN-" + Utilities.formatDate(new Date(), tz, "yyyyMMdd-HHmm"));
    const ident = String(payload.cliente || "Cliente").trim().substring(0, 60);
    const nomeBase = "Cronograma de execucao - " + SGO_DocRev_numeroComRevisao_(numero, docRevS.rev) + " - " + ident + " - " + Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HHmm");

    const salvo = SGO_DocSalvar_salvarHtmlEPdf_(pasta, nomeBase, html, { compartilhar: true });
    const arquivo = DriveApp.getFileById(salvo.pdfId);

    CronExec_registrarDocumento_({
      cliente: { razaoSocial: payload.cliente || "" },
      cronogramaId: payload.cronogramaId || ""
    }, arquivo, "CRONOGRAMA_EXECUCAO");
    const docRevR = SGO_DocRev_registrarPendente_("CRONOGRAMA_EXECUCAO", docRevS.id, { numero: numero, titulo: "Cronograma de execução", cliente: String(payload.cliente || ""), cnpj: String(payload.cnpj || ""), pdfId: salvo.pdfId, htmlId: salvo.htmlId, pdfUrl: salvo.pdfUrl, htmlUrl: salvo.htmlUrl }, SGO_DocRev_sessao_(sessionId));

    return { ok: true, url: salvo.pdfUrl, fileName: salvo.pdfNome, htmlId: salvo.htmlId, htmlUrl: salvo.htmlUrl, pastaUrl: pasta.getUrl(), revisao: docRevR.rotulo, avisoHtml: docRevR.ok ? "" : docRevR.aviso };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao salvar o documento na pasta do cliente: " + e.message };
  }
}


/**
 * Sumário só quando o documento passa de 3 páginas (padrão A4, item 3): converte uma vez
 * para contar as folhas; se passar, põe o sumário no lugar do marcador e pagina (duas
 * passagens). Sem conversor de PDF (ou se falhar), sai sem sumário. Nunca lança.
 */
function CronExecDoc_sumarioSeLongo_(html, nome) {
  const marca = '<!--sgo-sumario-->';
  const h = String(html || '');
  if (h.indexOf(marca) < 0) return h;
  try {
    if (typeof SGO_DocA4_pdfDeHtml_ === 'function' && typeof SGO_DocA4_paginasDoPdf_ === 'function') {
      const total = (SGO_DocA4_paginasDoPdf_(SGO_DocA4_pdfDeHtml_(h.replace(marca, ''), nome)) || {})._total || 0;
      if (total > 3) {
        const pag = RelTecA4_paginar_(h.replace(marca, SGO_DocA4_marcadorSumario_()), nome);
        if (pag && pag.html) return pag.html;
      }
    }
  } catch (e) { /* segue sem sumário */ }
  return h.replace(marca, '');
}

function CronExec_registrarDocumento_(dados, arquivo, tipoDocumento) {
  const db = CronExec_getDB_();
  const aba = db.getSheetByName(CRONEXEC_CFG.PLANILHA.ABAS.DOCUMENTOS);
  const agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

  aba.appendRow([
    CronExec_gerarId_(),
    agora,
    dados.cliente.razaoSocial || "",
    tipoDocumento || "CRONOGRAMA_EXECUCAO",
    arquivo.getName(),
    arquivo.getUrl(),
    dados.cronogramaId || ""
  ]);
}

function CronExec_getLogoDataUri_() {
  // Fase 2 (16/10): no servidor próprio não há Drive do Google; usa a mesma logo embutida do
  // Certificado de calibração (CadeiaFrioRel_CFCFG.LOGO_BASE64). O ID do Drive fica como reserva.
  try {
    const cfgLogo = typeof CadeiaFrioRel_CFCFG !== "undefined" ? CadeiaFrioRel_CFCFG.LOGO_BASE64 : null;
    if (cfgLogo && cfgLogo.data) return "data:" + (cfgLogo.mimeType || "image/png") + ";base64," + cfgLogo.data;
  } catch (e) { /* segue para o Drive */ }
  try {
    const logoId = PropertiesService.getScriptProperties().getProperty("CRONEXEC_LOGO_ID") || CRONEXEC_CFG.LOGO_ID;
    const blob = DriveApp.getFileById(logoId).getBlob();
    const contentType = blob.getContentType();
    const bytes = blob.getBytes();
    const base64 = Utilities.base64Encode(bytes);
    return "data:" + contentType + ";base64," + base64;
  } catch (e) {
    return "";
  }
}

function CronExec_sanitizarNomeArquivo_(texto) {
  return String(texto || "ARQUIVO")
    .replace(/[\\\/:*?\"<>|]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 60);
}

function CronExec_montarEnderecoDoc_(cliente) {
  const partes = [];
  if (cliente && cliente.logradouro) partes.push(cliente.logradouro);
  if (cliente && cliente.bairro) partes.push(cliente.bairro);

  let cidadeUf = "";
  if (cliente && cliente.cidade) cidadeUf += cliente.cidade;
  if (cliente && cliente.uf) cidadeUf += (cidadeUf ? "/" : "") + cliente.uf;
  if (cidadeUf) partes.push(cidadeUf);

  return partes.join(" - ");
}

/** Converte "yyyy-mm-dd" (formato interno) em "dd/mm/aaaa" (formato de exibição do documento). */
function CronExec_formatarDataBr_(dataIso) {
  const partes = String(dataIso || "").split("-");
  if (partes.length !== 3) return dataIso || "";
  // Com o ano: cronograma que atravessa a virada do ano (ex.: dezembro a
  // janeiro) ficava ambíguo só com dia/mês.
  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

/**
 * Mesmo formato de CronExec_formatarDataBr_, com o dia da semana abreviado entre
 * parênteses (ex.: "19/08/2026 (qua)") — sem isso, o salto de datas causado por "dias
 * úteis" pulando fim de semana parece incoerente (achado real 2026-08-11).
 */
function CronExec_formatarDataBrComDia_(dataIso) {
  const base = CronExec_formatarDataBr_(dataIso);
  if (!base) return base;
  const d = CronExec_parseDataISO_(dataIso);
  const dias = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  return base + " (" + dias[d.getDay()] + ")";
}

/**
 * Em qual(is) grupo(s) as unidades de um equipamento caem — ex.: "Grupo 1 (1 un.)" ou
 * "Grupo 1 (1 un.) + Grupo 3 (1 un.)" quando a mesma linha de equipamento (quantidade > 1)
 * é dividida entre grupos de propósito (ver CronExec_sugerirGrupos_).
 */
function CronExec_distribuicaoPorEquipamento_(equipamentoId, grupos) {
  const partes = [];
  (grupos || []).forEach(function (g) {
    (g.itens || []).forEach(function (item) {
      if (item.equipamentoId === equipamentoId) {
        partes.push("Grupo " + g.ordinal + " (" + item.quantidade + " un.)");
      }
    });
  });
  return partes.length ? partes.join(" + ") : "—";
}

/** true se algum equipamento desta lista aparecer em mais de 1 grupo (decide se mostra a frase explicativa). */
function CronExec_temEquipamentoDividido_(equipamentos, grupos) {
  return (equipamentos || []).some(function (e) {
    let contagem = 0;
    (grupos || []).forEach(function (g) {
      if ((g.itens || []).some(function (item) { return item.equipamentoId === e.id; })) contagem++;
    });
    return contagem > 1;
  });
}

function CronExec_escaparHtml_(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
