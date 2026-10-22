/**
 * Planejamento técnico de qualificação e quantitativo de insumos (CME) — documento A4.
 * Padrão de 18/10/2026 (docs/DOCUMENTOS_PADRAO_A4_20261018.md): moldura SGO_RelTecA4
 * (cabeçalho e rodapé corridos, "Página X de Y"), tipografia e tabelas da SGO_DocA4,
 * seções numeradas, "Tabela N —" acima das tabelas, "Figura N —" abaixo do gráfico,
 * texto justificado e assinaturas presas ao parágrafo de responsabilidade.
 * Sem a IA o documento sai completo: a fundamentação vira a Tabela "Base técnica das
 * quantidades", escrita a partir das regras de cálculo. Com a IA, a fundamentação em
 * prosa entra no lugar dessa tabela (nunca as duas).
 */

/** Texto corrido (parágrafos separados por linha em branco) → <p>. */
function PlanCMEDoc_paragrafosHtml_(texto) {
  const partes = String(texto || "").replace(/\r\n/g, "\n").split(/\n\s*\n/)
    .map(p => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
  if (!partes.length) return "";
  return partes.map(p => "<p>" + PlanCME_escaparHtml_(p) + "</p>").join("\n");
}

/** Texto da IA: tira as frases que remetem a "tabela abaixo/acima" (o documento cita pelo número). */
function PlanCMEDoc_textoIA_(texto) {
  return String(texto || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\s*\((?:ver|veja|conforme) (?:a )?tabela (?:abaixo|acima|a seguir)\)/gi, "")
    .trim();
}

/** CSS: padrão SGO_DocA4 + ajustes deste documento + moldura SGO_RelTecA4 (por último). */
function PlanCME_getCss_(opcoes) {
  const o = opcoes || {};
  const docA4 = (typeof SGO_DocA4_estilos_ === "function")
    ? SGO_DocA4_estilos_({ tituloCurto: o.titulo, numero: o.numero, revisao: o.revisao })
    : SGO_DocA4_css_();
  const proprio = [
    ".abertura{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:.6pt solid #9aa5b1;padding-bottom:2.2mm;margin:0 0 6mm}",
    ".abertura img{height:13mm;width:auto;display:block}",
    ".abertura .meta{text-align:right;font-size:7.8pt;line-height:1.35;color:#3e4c59}",
    "ul.lista li{text-align:left}",
    ".campo-eru{border:.6pt solid #9aa5b1;margin:2mm 0 4mm;padding:2.4mm 3mm 3mm;break-inside:avoid;page-break-inside:avoid}",
    ".campo-eru p{margin:0 0 1mm;font-weight:700;font-size:9pt;text-align:left}",
    ".campo-eru .ln{border-bottom:.5pt solid #bcc5cf;height:7.5mm}",
    ".reltec-fecho .assinaturas{margin-top:7mm}",
    "td.base{color:#3e4c59}",
    "table.t td.nat{white-space:nowrap}"
  ].join("");
  const molde = RelTecA4_css_({ titulo: o.titulo, numero: o.numero, revisao: o.revisao });
  return docA4 + proprio + molde;
}

function PlanCMEDoc_empresa_() {
  try {
    const e = (typeof CadeiaFrioRel_CFCFG !== "undefined") ? CadeiaFrioRel_CFCFG.EMPRESA_EXECUTANTE : null;
    if (e && e.nome) return { nome: String(e.nome), cnpj: String(e.cnpj || "") };
  } catch (err) { /* usa o nome do módulo */ }
  return { nome: PLANCME_CFG.EMPRESA.NOME, cnpj: "" };
}

/** Logo leve (JPEG de 28 KB da SGO_DocA4) para a abertura; o PNG antigo fica de reserva. */
function PlanCMEDoc_logo_() {
  try { if (typeof SGO_DocA4_logoDataUri_ === "function") return SGO_DocA4_logoDataUri_(); } catch (e) { /* reserva */ }
  return PlanCME_getLogoDataUri_();
}

/** Lista "A, B e C". */
function PlanCMEDoc_juntar_(itens) {
  const l = (itens || []).filter(Boolean);
  if (l.length <= 1) return l.join("");
  return l.slice(0, -1).join(", ") + " e " + l[l.length - 1];
}

/**
 * Explicação do cálculo sem repetir o mesmo texto por receita: frases que só mudam no
 * nome da receita viram uma frase só, com as receitas juntas.
 */
function PlanCMEDoc_consolidarDetalhes_(detalhes) {
  const grupos = [];
  const porChave = {};
  (detalhes || []).forEach(function (t) {
    const s = String(t || "").trim();
    if (!s) return;
    const m = /da receita "([^"]+)"/.exec(s);
    const chave = m ? s.replace(m[0], "da receita \u0000") : s;
    if (!(chave in porChave)) { porChave[chave] = grupos.length; grupos.push({ chave: chave, receitas: [] }); }
    if (m) grupos[porChave[chave]].receitas.push(m[1]);
  });
  return grupos.map(function (g) {
    if (!g.receitas.length) return g.chave;
    if (g.receitas.length === 1) return g.chave.replace("\u0000", '"' + g.receitas[0] + '"');
    const nomes = PlanCMEDoc_juntar_(g.receitas.map(function (r) { return '"' + r + '"'; }));
    return g.chave.replace("da receita \u0000", "das receitas " + nomes)
      .replace(/calculada com (\d+) repetições/, "calculada com $1 repetições por receita");
  });
}

/** Referências normativas no mesmo formato curto usado no texto do documento. */
function PlanCMEDoc_referencias_(normas) {
  const vistos = {};
  return (normas || []).map(function (n) {
    let s = String(n || "").trim();
    s = s.replace(/^Resolução da Diretoria Colegiada número 15 de 2012 da Agência Nacional de Vigilância Sanitária/i, "Anvisa — RDC nº 15/2012, boas práticas para o processamento de produtos para saúde");
    s = s.replace(/^ABNT NBR 16328$/i, "ABNT NBR 16328:2024");
    s = s.replace(/^ISO 17665$/i, "ISO 17665 — Esterilização de produtos para saúde: calor úmido");
    s = s.replace(/ISO 15883 - Washer-Disinfectors/i, "ISO 15883 — Lavadoras desinfetadoras");
    s = s.replace(/^Protocolos? (?:técnicos? )?do fabricante.*$/i, "Instruções de uso e protocolos técnicos do fabricante do equipamento");
    s = s.replace(/\s+-\s+/g, " — ");
    return s;
  }).filter(function (s) {
    if (!s || vistos[s]) return false;
    vistos[s] = true;
    return true;
  });
}

/**
 * Base técnica de cada quantidade (caminho sem a IA): fonte e natureza de cada número,
 * tiradas das mesmas regras do cálculo (SGO_PlanCME_Calculo.js).
 */
function PlanCMEDoc_basesTecnicas_(tp, dados, resultado) {
  const ultra = tp.indexOf("Ultrassônica") >= 0;
  const termo = tp.indexOf("Termodesinfectora") >= 0;
  const peroxido = tp.indexOf("Peróxido") >= 0, formaldeido = tp.indexOf("Formaldeído") >= 0, eto = tp.indexOf("Etileno") >= 0;
  const vapor = !ultra && !termo && !peroxido && !formaldeido && !eto;
  const s = dados.servicos || {};
  const sensores = Number(resultado.sensores || 0);
  const volume = PlanCME_formatarNumeroBr_(dados.equipamento && dados.equipamento.volume);
  const limite = Number((PLANCME_CFG.CALCULO && PLANCME_CFG.CALCULO.LIMITE_VOLUME_SENSOR_AUTOCLAVE) || 54);
  const temPrion = (dados.ciclos || []).some(function (c) { return /pr[ií]on/i.test(String(c)); });
  const linhas = [];
  if (ultra) {
    linhas.push(["Pontos de verificação", "Quantidade definida pelo protocolo técnico do fabricante do equipamento (" + sensores + " pontos para " + volume + " L). O Anexo J da ABNT NBR 16328:2024, que trata de lavadoras ultrassônicas, é informativo e não fixa quantidade.", "Protocolo do fabricante"]);
    linhas.push(["Teste de cavitação e indicador de limpeza", "Aplicados conforme o protocolo técnico do fabricante do equipamento: " + PlanCME_formatarNumeroBr_((PLANCME_CFG.CALCULO && PLANCME_CFG.CALCULO.LAVA_ULTR_PONTOS) || 9) + " pontos de cavitação por repetição e indicador de limpeza por ponto nas repetições com carga.", "Protocolo do fabricante"]);
    return linhas;
  }
  if (termo) {
    linhas.push(["Sensores de temperatura", "ABNT NBR 16328:2024, Anexo D: mínimo de 12 sensores, sem exceção por volume da câmara. Este planejamento prevê " + sensores + ".", "Normativa"]);
    linhas.push(["Indicador de limpeza", "A ABNT NBR ISO 15883-1 comprova a termodesinfecção pelo valor A0 (letalidade térmica), sem indicador biológico. O indicador de limpeza (resíduo orgânico), um por sensor em cada repetição, verifica de forma quantitativa a eficácia da lavagem.", "Critério técnico da executante"]);
    return linhas;
  }
  linhas.push(["Sensores de temperatura", "ABNT NBR 16328:2024: câmara de até " + limite + " L exige no mínimo 3 sensores; acima de " + limite + " L, no mínimo 12. Câmara de " + volume + " L: " + sensores + " sensores.", "Normativa"]);
  if (s.qd) {
    linhas.push(["Indicadores biológicos e integradores químicos", "ABNT NBR 16328:2024, Anexo C, item C.5: nas repetições com carga, 1 integrador químico e 1 indicador biológico por sensor, juntos, na mesma posição. O integrador verifica as condições físicas de exposição; o indicador biológico comprova a eficácia microbiológica." + (temPrion ? " Na receita de príons, o integrador convencional é substituído pelo específico para príons." : ""), "Normativa"]);
    if (s.qo) linhas.push(["Ciclo em vazio (QO)", "No ciclo em vazio a norma não exige indicador biológico nem químico, apenas o mapeamento de temperatura pelos sensores.", "Normativa"]);
  } else if (s.qo) {
    linhas.push(["Indicadores na QO sem QD", "Sem Qualificação de Desempenho no escopo, cada repetição em vazio recebe 3 indicadores biológicos e 3 integradores químicos fixos (início, meio e fim da câmara), juntos em cada posição, para que a qualificação não seja emitida sem desafio microbiológico documentado. A quantidade não depende do número de sensores." + (temPrion ? " Na receita de príons, o integrador convencional é substituído pelo específico para príons." : ""), "Critério técnico da executante"]);
  }
  if (s.bowieDick && vapor) {
    linhas.push(["Teste Bowie-Dick", "RDC nº 15/2012 (Anvisa), Art. 93: teste de rotina para esterilização a vapor, independente das etapas contratadas.", "Normativa"]);
  }
  return linhas;
}

/** Composição da base calculada por etapa e receita (Tabela 2). */
function PlanCMEDoc_tabelaComposicao_(tp, dados, resultado) {
  const ciclos = resultado.ciclosDetalhados || [];
  const ultra = tp.indexOf("Ultrassônica") >= 0;
  const termo = tp.indexOf("Termodesinfectora") >= 0;
  const etapaNome = { QO: "Qualificação de Operação", QD: "Qualificação de Desempenho" };
  let colunas, campos;
  if (ultra) { colunas = ["Testes de cavitação", "Indicadores de limpeza"]; campos = ["baseCavitacao", "baseLimpeza"]; }
  else if (termo) { colunas = ["Indicadores de limpeza"]; campos = ["baseLimpeza"]; }
  else {
    colunas = ["Indicadores biológicos", "Integradores químicos"]; campos = ["baseBI", "baseIQ"];
    if (Number(resultado.baseIQPrion || 0) > 0) { colunas.push("Integradores p/ príons"); campos.push("baseIQPrion"); }
  }
  const soma = campos.map(function () { return 0; });
  const linhas = [];
  if (dados.servicos && dados.servicos.qi) {
    linhas.push(["Qualificação de Instalação", "—", { t: "—", cls: "num" }].concat(campos.map(function () { return { t: "0", cls: "num" }; })));
  }
  ciclos.forEach(function (c) {
    const vals = campos.map(function (k, i) { const v = Number(c[k] || 0); soma[i] += v; return { t: SGO_DocA4_num_(v, 0), cls: "num" }; });
    linhas.push([etapaNome[c.etapa] || c.etapa, c.nome || "—", { t: SGO_DocA4_num_(Number(c.repeticoes || 0), 0), cls: "num" }].concat(vals));
  });
  if (!linhas.length) return "";
  const cab = [{ t: "Etapa" }, { t: "Receita" }, { t: "Repetições", cls: "num" }].concat(colunas.map(function (c) { return { t: c, cls: "num" }; }));
  const rodape = [{ t: "Base calculada" }, { t: "" }, { t: "" }].concat(soma.map(function (v) { return { t: SGO_DocA4_num_(v, 0), cls: "num" }; }));
  return SGO_DocA4_tabela_(cab, linhas, { rodape: rodape, classe: "compacta" });
}

/** Frase com um exemplo da conta (quantidade por repetição × repetições) da Tabela 2. */
function PlanCMEDoc_exemploCalculo_(tp, resultado) {
  const sensores = Number(resultado.sensores || 0);
  const ultra = tp.indexOf("Ultrassônica") >= 0, termo = tp.indexOf("Termodesinfectora") >= 0;
  const etapa = { QO: "Qualificação de Operação", QD: "Qualificação de Desempenho" };
  const c = (resultado.ciclosDetalhados || []).filter(function (x) { return Number(x.baseBI || x.baseLimpeza || x.baseCavitacao || 0) > 0; })[0];
  let frase = "";
  if (c) {
    const r = Number(c.repeticoes || 0);
    if (ultra && c.baseCavitacao) {
      frase = "Cada valor é a quantidade por repetição multiplicada pelo número de repetições: na " + etapa[c.etapa] + " da receita “" + c.nome + "”, " +
        SGO_DocA4_num_(c.baseCavitacao / r, 0) + " pontos de cavitação × " + r + " repetições = " + SGO_DocA4_num_(c.baseCavitacao, 0) + " testes.";
    } else if ((ultra || termo) && c.baseLimpeza) {
      frase = "Cada valor é a quantidade por repetição multiplicada pelo número de repetições: na " + etapa[c.etapa] + " da receita “" + c.nome + "”, " +
        SGO_DocA4_num_(c.baseLimpeza / r, 0) + " indicadores de limpeza (1 por sensor) × " + r + " repetições = " + SGO_DocA4_num_(c.baseLimpeza, 0) + ".";
    } else if (c.baseBI) {
      const porRep = c.baseBI / r;
      frase = "Cada valor é a quantidade por repetição multiplicada pelo número de repetições: na " + etapa[c.etapa] + " da receita “" + c.nome + "”, " +
        (porRep === sensores && c.etapa === "QD" ? sensores + " sensores (1 indicador por sensor)" : SGO_DocA4_num_(porRep, 0) + " indicadores por repetição") +
        " × " + r + " repetições = " + SGO_DocA4_num_(c.baseBI, 0) + " indicadores biológicos.";
    }
  }
  if (Number(resultado.baseBD || 0) > 0) frase += (frase ? " " : "") + "O teste Bowie-Dick não depende das receitas e aparece só na Tabela 1.";
  return frase;
}

/** Figura: base calculada × total com margem, por insumo (barras horizontais pareadas). */
function PlanCMEDoc_graficoInsumos_(insumos, margem) {
  const itens = (insumos || []).filter(function (i) { return Number(i.total || 0) > 0 || Number(i.base || 0) > 0; });
  if (!itens.length) return "";
  const W = 680, mL = 190, mR = 60, mT = 10, alt = 11, gapPar = 3, gapItem = 14, mB = 40;
  const H = mT + mB + itens.length * (2 * alt + gapPar + gapItem) - gapItem;
  let vmax = 0;
  itens.forEach(function (i) { vmax = Math.max(vmax, Number(i.total || 0), Number(i.base || 0)); });
  const passo = (typeof SGO_DocA4_passo_ === "function") ? SGO_DocA4_passo_(vmax * 1.05 || 1, 5) : Math.max(1, Math.ceil(vmax / 5));
  const xmax = Math.ceil((vmax * 1.05 || 1) / passo) * passo;
  const pw = W - mL - mR;
  const X = function (v) { return mL + Math.max(0, v) / xmax * pw; };
  const f = function (n) { return (Math.round(n * 10) / 10).toString(); };
  const s = [];
  s.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" font-family="Arial, Helvetica, sans-serif" font-size="10" role="img">');
  for (let v = 0; v <= xmax + passo / 2; v += passo) {
    s.push('<line x1="' + f(X(v)) + '" y1="' + mT + '" x2="' + f(X(v)) + '" y2="' + (H - mB) + '" stroke="#e4e8ed" stroke-width="0.8"/>');
    s.push('<text x="' + f(X(v)) + '" y="' + (H - mB + 13) + '" text-anchor="middle" fill="#3e4c59">' + SGO_DocA4_num_(v, 0) + '</text>');
  }
  itens.forEach(function (it, k) {
    const y0 = mT + k * (2 * alt + gapPar + gapItem);
    const base = Number(it.base || 0), total = Number(it.total || 0);
    s.push('<text x="' + (mL - 8) + '" y="' + f(y0 + alt + gapPar / 2 + 3.5) + '" text-anchor="end" fill="#1f2933">' + PlanCME_escaparHtml_(it.nome) + '</text>');
    s.push('<rect x="' + mL + '" y="' + y0 + '" width="' + f(Math.max(1, X(base) - mL)) + '" height="' + alt + '" fill="#9fb3c8"/>');
    s.push('<text x="' + f(X(base) + 4) + '" y="' + f(y0 + alt - 2) + '" fill="#3e4c59">' + SGO_DocA4_num_(base, 0) + '</text>');
    s.push('<rect x="' + mL + '" y="' + (y0 + alt + gapPar) + '" width="' + f(Math.max(1, X(total) - mL)) + '" height="' + alt + '" fill="#1f5fa8"/>');
    s.push('<text x="' + f(X(total) + 4) + '" y="' + f(y0 + 2 * alt + gapPar - 2) + '" fill="#1f2933" font-weight="700">' + SGO_DocA4_num_(total, 0) + '</text>');
  });
  s.push('<line x1="' + mL + '" y1="' + mT + '" x2="' + mL + '" y2="' + (H - mB) + '" stroke="#9aa5b1"/>');
  const yl = H - 12;
  s.push('<rect x="' + mL + '" y="' + (yl - 8) + '" width="10" height="9" fill="#9fb3c8"/><text x="' + (mL + 14) + '" y="' + yl + '" fill="#1f2933">Base calculada</text>');
  s.push('<rect x="' + (mL + 120) + '" y="' + (yl - 8) + '" width="10" height="9" fill="#1f5fa8"/><text x="' + (mL + 134) + '" y="' + yl + '" fill="#1f2933">Total com margem de segurança (fator ' + PlanCME_formatarNumeroBr_(margem) + ')</text>');
  s.push('<text x="' + (W - 4) + '" y="' + (H - mB + 13) + '" text-anchor="end" fill="#3e4c59">unidades</text>');
  s.push('</svg>');
  return s.join("");
}

/**
 * Monta o documento único de Planejamento técnico, fundamentação e orientação de E.R.U.
 * dados: { cliente, equipamento, servicos, ciclos, observacoes, numeroDocumento, resultado }
 */
function PlanCME_montarDocumentoHtml_(dados) {
  dados = dados || {};
  dados.cliente = dados.cliente || {};
  dados.equipamento = dados.equipamento || {};
  dados.servicos = dados.servicos || {};
  const resultado = dados.resultado || {};
  const textosIA = resultado.textosIA || {};
  const temIA = !!(textosIA.introducao || textosIA.fundamentacaoQI || textosIA.fundamentacaoQO || textosIA.fundamentacaoQD);
  const tipoProcesso = PlanCME_obterTipoProcesso_(dados);
  const normas = PlanCMEDoc_referencias_(PlanCME_obterNormasPorProcesso_(tipoProcesso));
  const tz = Session.getScriptTimeZone();
  const agora = new Date();
  const emissao = Utilities.formatDate(agora, tz, "dd/MM/yyyy HH:mm");
  const isUltrassonica = tipoProcesso.includes("Ultrassônica");
  const checklistQI = resultado.checklistQI || [];
  const assinaturas = PLANCME_CFG.ASSINATURAS_PADRAO || [];
  const numeroPlan = dados.numeroDocumento || ("PLC-" + Utilities.formatDate(agora, tz, "yyyyMMdd-HHmm"));
  const revPlan = RelTecA4_revisao_(dados.revisao);
  const tituloCurto = "Planejamento técnico do CME";
  const empresa = PlanCMEDoc_empresa_();
  const num = RelTecA4_numerador_();
  const esc = PlanCME_escaparHtml_;
  const s = dados.servicos;
  const margem = Number(resultado.margem || PLANCME_CFG.CALCULO.MARGEM_SEGURANCA || 1.2);
  const ciclos = (dados.ciclos || []).map(function (c) { return String(c || "").trim(); }).filter(Boolean);
  let n = 0;
  const h2 = function (titulo) { n++; return '<h2>' + n + '. ' + esc(titulo) + '</h2>'; };

  const escopo = [];
  if (s.qi) escopo.push("Qualificação de Instalação (QI)");
  if (s.qo) escopo.push("Qualificação de Operação (QO)");
  if (s.qd) escopo.push("Qualificação de Desempenho (QD)");
  if (s.bowieDick) escopo.push("Teste Bowie-Dick");

  const html = [];
  html.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">');
  // Identificador do arquivo salvo (lido por PlanCME_apiSalvarDocumento; não aparece na folha).
  html.push('<meta name="sgo-identificador" content="' + esc([dados.equipamento.tipo, dados.equipamento.serie || dados.equipamento.modelo].filter(Boolean).join(" ")) + '">');
  html.push('<title>Planejamento técnico ' + esc(numeroPlan) + ' — ' + esc(dados.cliente.razaoSocial || "Cliente") + '</title>');
  html.push('<style>' + PlanCME_getCss_({ titulo: tituloCurto, numero: numeroPlan, revisao: revPlan }) + '</style></head><body>');
  html.push('<div class="barra-tela"><button type="button" onclick="window.print()">Imprimir ou salvar em PDF</button></div>');
  html.push('<main class="folha">');

  html.push('<header class="abertura"><img src="' + PlanCMEDoc_logo_() + '" alt="Metrolabs"><div class="meta">' + esc(tituloCurto) + '<br>Nº ' + esc(numeroPlan) + ' · Revisão ' + esc(revPlan) + '</div></header>');
  html.push('<h1>Planejamento técnico de qualificação e quantitativo de insumos</h1>');
  html.push('<p class="subtitulo">' + esc(tipoProcesso) + (dados.cliente.razaoSocial ? ' — ' + esc(dados.cliente.razaoSocial) : '') + '</p>');
  html.push(SGO_DocA4_tabelaIdent_([["Emissão", emissao], ["Revisão", revPlan]], "ficha"));
  html.push('<!--sgo-sumario-->'); // sumário só se passar de 3 páginas (PlanCMEDoc_sumarioSeLongo_)

  // 1. Identificação (uma tabela só: cliente, equipamento e executante)
  html.push('<section>' + h2("Identificação"));
  html.push(SGO_DocA4_tabelaIdent_([
    ["Cliente", dados.cliente.razaoSocial || "—", { largo: true }],
    ["CNPJ", dados.cliente.cnpj || "—"], ["Equipamento", dados.equipamento.tipo || "—"],
    ["Endereço", PlanCME_montarEnderecoDoc_(dados.cliente) || "—", { largo: true }],
    ["Tipo de processo", tipoProcesso], ["Marca / modelo", (dados.equipamento.marca || "—") + " / " + (dados.equipamento.modelo || "—")],
    ["Número de série", dados.equipamento.serie || "—"], ["Volume da câmara", dados.equipamento.volume ? PlanCME_formatarNumeroBr_(dados.equipamento.volume) + " L" : "—"],
    ["Bomba de vácuo", dados.equipamento.bombaVacuo ? "Sim" : "Não"], ["Receitas", ciclos.length ? ciclos.join("; ") : "—"],
    ["Empresa executante", empresa.nome + (empresa.cnpj ? " — CNPJ " + empresa.cnpj : ""), { largo: true }],
    ["Responsável técnico", PLANCME_CFG.EMPRESA.RESPONSAVEL_TECNICO, { largo: true }]
  ]));
  html.push('</section>');

  // 2. Objetivo e escopo
  html.push('<section>' + h2("Objetivo e escopo"));
  if (textosIA.introducao) {
    html.push(PlanCMEDoc_paragrafosHtml_(PlanCMEDoc_textoIA_(textosIA.introducao)));
  } else {
    html.push('<p>Este documento dimensiona os insumos necessários à qualificação do equipamento identificado na seção 1 e registra a base técnica de cada quantidade. Não avalia se o equipamento está apto ao uso: o resultado da qualificação constará do relatório próprio, emitido após a execução dos ensaios.</p>');
  }
  html.push('<p>Escopo contratado: ' + esc(PlanCMEDoc_juntar_(escopo) || "não informado") + '.' +
    (ciclos.length ? ' Receitas a qualificar: ' + esc(PlanCMEDoc_juntar_(ciclos.map(function (c) { return "“" + c + "”"; }))) + '.' : '') + '</p>');
  html.push('</section>');

  // 3. Quantitativo de insumos
  const insumos = (resultado.insumos || []);
  const comConsumo = insumos.filter(function (i) { return Number(i.base || 0) > 0 || Number(i.total || 0) > 0; });
  const semConsumo = insumos.filter(function (i) { return !(Number(i.base || 0) > 0 || Number(i.total || 0) > 0); });
  const nTab1 = num.proximaTabela();
  const temGrafico = comConsumo.length > 0;
  html.push('<section>' + h2("Quantitativo de insumos"));
  html.push('<p>A Tabela ' + nTab1 + ' apresenta, para cada insumo, a base calculada e o total a providenciar, com margem de segurança de ' +
    esc(PlanCME_formatarNumeroBr_(Math.round((margem - 1) * 1000) / 10)) + ' % sobre a base (fator ' + esc(PlanCME_formatarNumeroBr_(margem)) + ', arredondado para cima)' +
    (temGrafico ? '; a Figura ' + num.proximaFigura() + ' compara os dois valores' : '') + '. A quantidade de sensores de temperatura prevista é de ' + esc(String(resultado.sensores || 0)) + '.' +
    (semConsumo.length ? ' Sem consumo neste escopo: ' + esc(PlanCMEDoc_juntar_(semConsumo.map(function (i) { return String(i.nome || "").toLowerCase(); }))) + '.' : '') + '</p>');
  html.push(num.tabela("Quantitativo de insumos"));
  html.push(SGO_DocA4_tabela_([{ t: "Insumo" }, { t: "Base calculada", cls: "num" }, { t: "Total com margem de segurança", cls: "num" }],
    (comConsumo.length ? comConsumo : insumos).map(function (i) { return [i.nome || "—", SGO_DocA4_num_(Number(i.base || 0), 0), { html: "<b>" + SGO_DocA4_num_(Number(i.total || 0), 0) + "</b>" }]; })));
  if (temGrafico) html.push(num.figura(PlanCMEDoc_graficoInsumos_(comConsumo, margem), "Base calculada e total com margem de segurança, por insumo"));

  const composicao = PlanCMEDoc_tabelaComposicao_(tipoProcesso, dados, resultado);
  // A composição por etapa e receita substitui a antiga lista "Explicação técnica do resultado",
  // que repetia o mesmo texto para cada receita e a base normativa da seção seguinte.
  if (composicao) {
    const nTab2 = num.proximaTabela();
    html.push('<h3>' + n + '.1 Composição do cálculo</h3>');
    html.push('<p>A Tabela ' + nTab2 + ' detalha a base calculada por etapa e receita; a soma de cada coluna corresponde à base da Tabela ' + nTab1 + '. ' +
      esc(PlanCMEDoc_exemploCalculo_(tipoProcesso, resultado)) + '</p>');
    html.push(num.tabela("Composição da base calculada por etapa e receita"));
    html.push(composicao);
  }
  html.push('</section>');

  // 4. Fundamentação técnica: prosa da IA ou, sem ela, a tabela de bases
  html.push('<section>' + h2("Fundamentação técnica"));
  if (temIA) {
    let k = 0;
    if (s.qi && textosIA.fundamentacaoQI) { k++; html.push('<h3>' + n + '.' + k + ' Qualificação de Instalação</h3>' + PlanCMEDoc_paragrafosHtml_(PlanCMEDoc_textoIA_(textosIA.fundamentacaoQI))); }
    if (s.qo && textosIA.fundamentacaoQO) { k++; html.push('<h3>' + n + '.' + k + ' Qualificação de Operação</h3>' + PlanCMEDoc_paragrafosHtml_(PlanCMEDoc_textoIA_(textosIA.fundamentacaoQO))); }
    if (s.qd && textosIA.fundamentacaoQD) { k++; html.push('<h3>' + n + '.' + k + ' Qualificação de Desempenho</h3>' + PlanCMEDoc_paragrafosHtml_(PlanCMEDoc_textoIA_(textosIA.fundamentacaoQD))); }
    if (textosIA.conclusao) { k++; html.push('<h3>' + n + '.' + k + ' Conclusão da fundamentação</h3>' + PlanCMEDoc_paragrafosHtml_(PlanCMEDoc_textoIA_(textosIA.conclusao))); }
  } else {
    const bases = PlanCMEDoc_basesTecnicas_(tipoProcesso, dados, resultado);
    if (bases.length) {
      const nTab = num.proximaTabela();
      html.push('<p>A Tabela ' + nTab + ' indica a fonte de cada quantidade deste planejamento e a natureza da exigência: normativa, protocolo do fabricante do equipamento ou critério técnico da empresa executante.</p>');
      html.push(num.tabela("Base técnica das quantidades"));
      html.push(SGO_DocA4_tabela_([{ t: "Item" }, { t: "Base" }, { t: "Natureza" }], bases.map(function (b) { return [b[0], b[1], { t: b[2], cls: "nat" }]; })));
    }
  }
  if (isUltrassonica && PLANCME_CFG.TEXTOS && PLANCME_CFG.TEXTOS.LAVA_ULTR_OBS) {
    html.push('<p class="nota"><b>Observação técnica do método:</b> ' + esc(PLANCME_CFG.TEXTOS.LAVA_ULTR_OBS) + '</p>');
  }
  html.push('</section>');

  if (checklistQI.length) {
    html.push('<section>' + h2("Checklist de inspeção da Qualificação de Instalação") + SGO_DocA4_lista_(checklistQI) + '</section>');
  }

  if (dados.observacoes) {
    html.push('<section>' + h2("Observações") + PlanCMEDoc_paragrafosHtml_(dados.observacoes) + '</section>');
  }

  html.push('<section>' + h2("Referências normativas") + SGO_DocA4_lista_(normas) + '</section>');

  // E.R.U.: um texto só (o da IA ou o padrão), sem repetir o mesmo pedido em outro parágrafo
  html.push('<section>' + h2("Especificação de Requisitos do Usuário (E.R.U.)"));
  html.push(textosIA.orientacaoERU ? PlanCMEDoc_paragrafosHtml_(PlanCMEDoc_textoIA_(textosIA.orientacaoERU)) : PlanCMEDoc_paragrafosHtml_(PLANCME_CFG.TEXTOS.ERU));
  html.push('<p>A E.R.U. deve conter, no mínimo:</p>');
  html.push(SGO_DocA4_lista_(["Modelo e número de série do equipamento.", "Receitas a serem qualificadas.", "Quantidade de ciclos, sensores e indicadores.", "Justificativa técnica para o ajuste pretendido.", "Assinatura e identificação do responsável."]));
  html.push('<div class="campo-eru"><p>Especificação de Requisitos do Usuário (preenchimento pela instituição):</p>' + new Array(7).join('<div class="ln"></div>') + '</div>');
  html.push('</section>');

  // Responsabilidade técnica: parágrafo e assinaturas juntos
  html.push('<section class="reltec-fecho">' + h2("Responsabilidade técnica"));
  html.push('<p>Este documento registra o planejamento técnico, a fundamentação do quantitativo de insumos e a orientação de E.R.U. para o escopo descrito na seção 2. Qualquer alteração de premissa segue o processo de E.R.U. da seção ' + (n - 1) + '.</p>');
  html.push(SGO_DocA4_assinaturas_(assinaturas));
  html.push('</section>');
  html.push('<!--SGO_DOCREV-->');

  html.push('</main></body></html>');
  return html.join("\n");
}

/**
 * Monta o documento e devolve o HTML (sem gravar). Com sumário, os números de página
 * já vêm preenchidos (duas passagens pelo PDF), para a tela mostrar o mesmo que será salvo.
 */
function PlanCME_apiMontarDocumentoFinal(dados, sessionId) {
  try {
    // 21/10/2026: revisão (SGO_DocRevisao.js) — mesmo número na correção, histórico no documento e dados guardados.
    dados = Object.assign({}, dados || {});
    const docRev = SGO_DocRev_montar_("PLANEJAMENTO_CME", dados, sessionId, "");
    if (docRev.modo === "BASE") delete dados.numeroDocumento; // cópia: número novo
    dados.numeroDocumento = docRev.numero || SGO_DocRev_numeroLivre_("PLANEJAMENTO_CME", dados.numeroDocumento || ("PLC-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmm")));
    dados.revisao = docRev.revisao;
    const montado = PlanCME_montarDocumentoHtml_(dados).replace("<!--SGO_DOCREV-->", SGO_DocRev_blocoHtml_(docRev));
    const html = SGO_DocRev_finalizarMontagem_("PLANEJAMENTO_CME", docRev, dados, PlanCMEDoc_sumarioSeLongo_(montado, "Planejamento técnico"), dados.numeroDocumento, { semHistorico: true });
    return { ok: true, html: html, revisao: docRev.rotulo };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao montar o documento: " + e.message };
  }
}

/**
 * Grava HTML + PDF do documento já aberto na pasta do cliente (subpasta = CNPJ com
 * 14 dígitos; sem CNPJ, nome do cliente) dentro da pasta do módulo e registra na planilha.
 * Nome: "Planejamento tecnico CME - <número> - <equipamento> - <aaaa-MM-dd HHmm>".
 */
function PlanCME_apiSalvarDocumento(payload, sessionId) {
  try {
    payload = payload || {};
    if (!payload.html) throw new Error("Nenhum conteúdo de documento recebido para salvar.");
    const docRevS = SGO_DocRev_abrirSalvamento_(String(payload.html || ""));
    const html = docRevS.html;

    const props = PropertiesService.getScriptProperties();
    let pastaId = props.getProperty("PLANCME_PASTA_PDF_ID");
    if (!pastaId) {
      // Auto-provisiona (mesmo padrão de PlanCME_getDB_): não depende da ordem de chamada.
      PlanCME_setupModulo();
      pastaId = props.getProperty("PLANCME_PASTA_PDF_ID");
    }

    const raiz = DriveApp.getFolderById(pastaId);
    const pasta = (payload.cnpj || payload.cliente) ? SGO_DocSalvar_pastaClienteEm_(raiz, payload.cnpj, payload.cliente) : raiz;
    const tz = Session.getScriptTimeZone();
    const numero = (/Nº\s*(PLC-[0-9-]+)/.exec(html) || [])[1] || payload.numeroDocumento || ("PLC-" + Utilities.formatDate(new Date(), tz, "yyyyMMdd-HHmm"));
    const meta = /<meta name="sgo-identificador" content="([^"]*)">/.exec(html);
    const ident = String((meta && meta[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")) || payload.cliente || "Equipamento").trim();
    const nomeBase = "Planejamento tecnico CME - " + SGO_DocRev_numeroComRevisao_(numero, docRevS.rev) + " - " + ident.substring(0, 60) + " - " + Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HHmm");

    const salvo = SGO_DocSalvar_salvarHtmlEPdf_(pasta, nomeBase, html, { compartilhar: true });
    const arquivo = DriveApp.getFileById(salvo.pdfId);

    PlanCME_registrarDocumento_({
      cliente: { razaoSocial: payload.cliente || "" },
      planejamentoId: payload.planejamentoId || ""
    }, arquivo, "PLANEJAMENTO_TECNICO");
    const docRevR = SGO_DocRev_registrarPendente_("PLANEJAMENTO_CME", docRevS.id, { numero: numero, titulo: ident, cliente: String(payload.cliente || ""), cnpj: String(payload.cnpj || ""), pdfId: salvo.pdfId, htmlId: salvo.htmlId, pdfUrl: salvo.pdfUrl, htmlUrl: salvo.htmlUrl }, SGO_DocRev_sessao_(sessionId));

    return { ok: true, url: salvo.pdfUrl, fileName: salvo.pdfNome, htmlId: salvo.htmlId, htmlUrl: salvo.htmlUrl, pastaUrl: pasta.getUrl(), revisao: docRevR.rotulo, avisoRevisao: docRevR.ok ? "" : docRevR.aviso };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao salvar o documento na pasta do cliente: " + e.message };
  }
}

function PlanCME_registrarDocumento_(dados, arquivo, tipoDocumento) {
  const db = PlanCME_getDB_();
  const aba = db.getSheetByName(PLANCME_CFG.PLANILHA.ABAS.DOCUMENTOS);
  const agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

  aba.appendRow([
    PlanCME_gerarId_(),
    agora,
    dados.cliente.razaoSocial || "",
    tipoDocumento || "PLANEJAMENTO_TECNICO",
    arquivo.getName(),
    arquivo.getUrl(),
    dados.planejamentoId || ""
  ]);
}


/**
 * Sumário só quando o documento passa de 3 páginas (padrão A4, item 3): converte uma vez
 * para contar as folhas; se passar, põe o sumário no lugar do marcador e pagina (duas
 * passagens). Sem conversor de PDF (ou se falhar), sai sem sumário. Nunca lança.
 */
function PlanCMEDoc_sumarioSeLongo_(html, nome) {
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

/** Valores antigos com marca ("Lavadora Ultrassônica (…)") viram o nome genérico. */
function PlanCME_tipoProcessoGenerico_(tp) {
  return String(tp || '').replace(/^Lavadora Ultrass[oô]nica\s*\([^)]*\)\s*$/i, 'Lavadora Ultrassônica');
}

function PlanCME_obterTipoProcesso_(dados) {
  return (dados && dados.equipamento && dados.equipamento.tipoProcesso)
    ? PlanCME_tipoProcessoGenerico_(dados.equipamento.tipoProcesso)
    : PLANCME_CFG.TIPOS_EQUIPAMENTO.AUTOCLAVE_VAPOR;
}

function PlanCME_obterNormasPorProcesso_(tipoProcesso) {
  const tp = String(tipoProcesso || "");
  if (tp.includes("Peróxido")) return PLANCME_CFG.NORMAS.PEROXIDO;
  if (tp.includes("Formaldeído")) return PLANCME_CFG.NORMAS.FORMALDEIDO;
  if (tp.includes("Etileno")) return PLANCME_CFG.NORMAS.ETO;
  if (tp.includes("Ultrassônica") || tp.includes("Termodesinfectora")) return PLANCME_CFG.NORMAS.LAVADORAS;
  return PLANCME_CFG.NORMAS.VAPOR;
}

function PlanCME_getLogoDataUri_() {
  // Fase 2 (16/10): no servidor próprio não há Drive do Google; usa a mesma logo embutida do
  // Certificado de calibração (CadeiaFrioRel_CFCFG.LOGO_BASE64). O ID do Drive fica como reserva.
  try {
    const cfgLogo = typeof CadeiaFrioRel_CFCFG !== "undefined" ? CadeiaFrioRel_CFCFG.LOGO_BASE64 : null;
    if (cfgLogo && cfgLogo.data) return "data:" + (cfgLogo.mimeType || "image/png") + ";base64," + cfgLogo.data;
  } catch (e) { /* segue para o Drive */ }
  try {
    const logoId = PropertiesService.getScriptProperties().getProperty("PLANCME_LOGO_ID") || PLANCME_CFG.LOGO_ID;
    const blob = DriveApp.getFileById(logoId).getBlob();
    const contentType = blob.getContentType();
    const bytes = blob.getBytes();
    const base64 = Utilities.base64Encode(bytes);
    return "data:" + contentType + ";base64," + base64;
  } catch (e) {
    return "";
  }
}

function PlanCME_sanitizarNomeArquivo_(texto) {
  return String(texto || "ARQUIVO")
    .replace(/[\\\/:*?\"<>|]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 60);
}

function PlanCME_montarEnderecoDoc_(cliente) {
  const partes = [];
  if (cliente && cliente.logradouro) partes.push(cliente.logradouro);
  if (cliente && cliente.bairro) partes.push(cliente.bairro);

  let cidadeUf = "";
  if (cliente && cliente.cidade) cidadeUf += cliente.cidade;
  if (cliente && cliente.uf) cidadeUf += (cidadeUf ? "/" : "") + cliente.uf;
  if (cidadeUf) partes.push(cidadeUf);

  return partes.join(" - ");
}

/**
 * Número para exibição no documento em pt-BR (vírgula decimal, ponto de
 * milhar), sem casas decimais inúteis. Aceita number ou string crua do
 * formulário ("54.5" do input type=number, ou "54,5"). (2026-10-16: o volume
 * e a margem saíam com ponto decimal, ex. "1.2".)
 */
function PlanCME_formatarNumeroBr_(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  const n = typeof valor === 'number' ? valor : Number(String(valor).trim().replace(/\s/g, '').replace(',', '.'));
  if (!isFinite(n)) return String(valor);
  const partes = (Math.round(n * 1000) / 1000).toString().split('.');
  const inteiro = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return partes[1] ? inteiro + ',' + partes[1] : inteiro;
}

/** "1,2 (acréscimo de 20% sobre a base calculada)". */
function PlanCME_descreverMargem_(margem) {
  const m = Number(margem);
  if (!isFinite(m) || m <= 0) return PlanCME_formatarNumeroBr_(margem);
  const pct = Math.round((m - 1) * 1000) / 10;
  return PlanCME_formatarNumeroBr_(m) + ' (acréscimo de ' + PlanCME_formatarNumeroBr_(pct) + '% sobre a base calculada)';
}

function PlanCME_escaparHtml_(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
