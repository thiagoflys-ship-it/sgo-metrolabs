/**
 * Divide um texto em parágrafos HTML (<p>...</p>) por linha em branco —
 * mesmo padrão de PlanCMEDoc_paragrafosHtml_.
 */
function CronExecDoc_paragrafosHtml_(texto) {
  const partes = String(texto || "").split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  if (!partes.length) return "<p>-</p>";
  return partes.map(p => "<p>" + CronExec_escaparHtml_(p) + "</p>").join("\n");
}

/**
 * CSS do documento — mesmo padrão visual "folha A4" já usado em todo o
 * Portal SGO+ CNPJ/DB (ver PlanCME_getCss_), replicado aqui verbatim
 * porque este é um projeto Apps Script separado, sem escopo global
 * compartilhado com o Portal.
 */
function CronExec_getCss_() {
  const css = [];
  css.push('@page { size: A4; margin: 18mm 16mm; }');
  css.push('* { box-sizing: border-box; }');
  css.push('body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 13px; line-height: 1.55; margin: 0; background: #f3f4f6; }');
  css.push('.folha { max-width: 900px; margin: 24px auto; background: #ffffff; padding: 28px 34px 40px; box-shadow: 0 2px 10px rgba(0,0,0,.12); }');
  css.push('.topo { display:flex; align-items:center; justify-content:space-between; border-bottom: 3px solid #0b4ea2; padding-bottom: 14px; margin-bottom: 20px; }');
  css.push('.logo-topo { height: 46px; }');
  css.push('.titulo-doc { text-align:right; }');
  css.push('.titulo-doc h1 { font-size: 18px; margin: 0; color:#0b4ea2; }');
  css.push('.titulo-doc small { color:#6b7280; }');
  css.push('table.dados { width:100%; border-collapse: collapse; margin-bottom: 18px; }');
  css.push('table.dados td { border: 1px solid #d1d5db; padding: 6px 10px; font-size: 12.5px; }');
  css.push('table.dados td.rotulo { background:#f3f4f6; font-weight:700; width: 190px; color:#374151; }');
  css.push('.secao { margin-top: 26px; }');
  css.push('.secao-grupos { page-break-inside: auto; }');
  css.push('.subsecao { page-break-inside: avoid; margin-bottom: 14px; }');
  css.push('.secao h2 { font-size: 13px; color:#ffffff; background:#0b4ea2; padding: 8px 12px; margin: 0 0 12px; border-left: 6px solid #059669; page-break-after: avoid; page-break-inside: avoid; }');
  css.push('.secao h3 { font-size: 12.5px; color:#0b4ea2; margin: 14px 0 6px; page-break-after: avoid; page-break-inside: avoid; }');
  css.push('p, li { text-align: justify; margin: 8px 0; orphans: 3; widows: 3; }');
  css.push('table.tabela-itens { width:100%; border-collapse: collapse; margin: 10px 0 4px; }');
  css.push('table.tabela-itens th, table.tabela-itens td { border: 1px solid #d1d5db; padding: 6px 10px; font-size: 12.5px; }');
  css.push('table.tabela-itens th { background:#f3f4f6; text-align:left; }');
  css.push('.destaque { background:#f3f4f6; border-left: 4px solid #0b4ea2; padding: 14px 16px; margin-top: 14px; page-break-inside: avoid; }');
  css.push('.destaque.alerta { border-left-color: #d97706; background:#fffbeb; }');
  css.push('.rodape-final { page-break-inside: avoid; margin-top: 26px; }');
  css.push('.assinaturas { display:flex; justify-content:space-around; }');
  css.push('.assinatura-item { text-align:center; width: 45%; }');
  css.push('.assinatura-item img, .assinatura-item svg { height: 60px; }');
  css.push('.assinatura-linha { border-top: 1px solid #1f2937; margin-top: 4px; padding-top: 4px; font-size: 11.5px; }');
  css.push('.rodape-aviso { margin-top: 18px; padding-top: 8px; border-top: 1px solid #d1d5db; font-size: 10.5px; color:#6b7280; }');
  css.push('.barra-imprimir { max-width: 900px; margin: 0 auto 12px; text-align: right; }');
  css.push('.barra-imprimir button { background:#0b4ea2; color:#fff; border:none; padding:10px 18px; border-radius:4px; font-weight:700; cursor:pointer; font-size:13px; }');
  css.push('@media print { body { background:#ffffff; } .folha { box-shadow:none; margin:0; padding:0; max-width:none; } .no-print { display:none !important; } }');
  return css.join('\n');
}

/**
 * Monta o documento de Cronograma de Execução — mesmo padrão visual
 * "folha A4" do Portal (ver CronExec_getCss_), com assinaturas reais.
 */
function CronExec_montarDocumentoHtml_(dados) {
  const logo = CronExec_getLogoDataUri_();
  const cliente = dados.cliente || {};
  const equipamentos = dados.equipamentos || [];
  const agrupamento = dados.agrupamento || {};
  const grupos = agrupamento.grupos || [];
  const textosIA = dados.textosIA || {};
  const dataAtual = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
  const assinaturas = CRONEXEC_CFG.ASSINATURAS_PADRAO || [];

  const html = [];
  html.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">');
  html.push('<title>Cronograma de Execução — ' + CronExec_escaparHtml_(cliente.razaoSocial || 'Cliente') + '</title>');
  html.push('<style>' + CronExec_getCss_() + SGO_DocA4_css_() + '</style></head><body>');

  html.push('<div class="barra-imprimir no-print"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>');
  html.push('<div class="folha">');

  html.push('<div class="topo">');
  if (logo) {
    html.push('<img class="logo-topo" src="' + logo + '" alt="Metrolabs">');
  } else {
    html.push('<div></div>');
  }
  html.push('<div class="titulo-doc"><h1>CRONOGRAMA DE EXECUÇÃO</h1><small>Documento gerado em ' + CronExec_escaparHtml_(dataAtual) + '</small></div>');
  html.push('</div>');

  html.push('<table class="dados">');
  html.push('<tr><td class="rotulo">Cliente</td><td>' + CronExec_escaparHtml_(cliente.razaoSocial || '') + '</td></tr>');
  html.push('<tr><td class="rotulo">CNPJ</td><td>' + CronExec_escaparHtml_(cliente.cnpj || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Endereço</td><td>' + CronExec_escaparHtml_(CronExec_montarEnderecoDoc_(cliente) || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Previsão de início</td><td>' + CronExec_escaparHtml_(CronExec_formatarDataBrComDia_((grupos[0] && grupos[0].dataInicio) || '')) + '</td></tr>');
  html.push('<tr><td class="rotulo">Empresa executante</td><td>' + CronExec_escaparHtml_(CRONEXEC_CFG.EMPRESA.NOME) + ' — ' + CronExec_escaparHtml_(CRONEXEC_CFG.EMPRESA.RESPONSAVEL_TECNICO) + '</td></tr>');
  html.push('</table>');

  if (textosIA.objetivo) {
    html.push('<div class="secao"><h2>Objetivo</h2>');
    html.push(CronExecDoc_paragrafosHtml_(textosIA.objetivo));
    html.push('</div>');
  }

  html.push('<div class="secao"><h2>Lista de Equipamentos</h2>');
  html.push('<table class="tabela-itens"><thead><tr><th>Tipo de Equipamento</th><th>Marca</th><th>Modelo</th><th>Quantidade</th><th>Distribuição nos grupos</th></tr></thead><tbody>');
  equipamentos.forEach(function (e) {
    html.push('<tr><td>' + CronExec_escaparHtml_(e.tipo || '') + '</td><td>' + CronExec_escaparHtml_(e.marca || '—') + '</td><td>' + CronExec_escaparHtml_(e.modelo || '—') + '</td><td>' + CronExec_escaparHtml_(String(e.quantidade || 0)) + '</td><td>' + CronExec_escaparHtml_(CronExec_distribuicaoPorEquipamento_(e.id, grupos)) + '</td></tr>');
  });
  html.push('</tbody></table>');
  if (CronExec_temEquipamentoDividido_(equipamentos, grupos)) {
    html.push('<div class="destaque">Equipamentos com mais de 1 unidade neste cronograma são propositalmente distribuídos em grupos diferentes, para que nenhum tipo de equipamento fique totalmente indisponível ao mesmo tempo (ver coluna "Distribuição nos grupos" acima).</div>');
  }
  html.push('</div>');

  if (textosIA.metodologia) {
    html.push('<div class="secao"><h2>Metodologia de Execução</h2>');
    html.push(CronExecDoc_paragrafosHtml_(textosIA.metodologia));
    html.push('</div>');
  }

  html.push('<div class="secao secao-grupos"><h2>Grupos de Execução</h2>');
  if (textosIA.gruposIntro) {
    html.push(CronExecDoc_paragrafosHtml_(textosIA.gruposIntro));
  }
  grupos.forEach(function (g) {
    html.push('<div class="subsecao">');
    html.push('<h3>Grupo ' + g.ordinal + ' — Previsão: ' + CronExec_escaparHtml_(CronExec_formatarDataBrComDia_(g.dataInicio)) + ' a ' + CronExec_escaparHtml_(CronExec_formatarDataBrComDia_(g.dataFim)) + '</h3>');
    html.push('<ul>');
    (g.itens || []).forEach(function (item) {
      html.push('<li>' + CronExec_escaparHtml_(String(item.quantidade) + 'x ' + item.tipo + (item.marca ? ' ' + item.marca : '') + (item.modelo ? ' ' + item.modelo : '')) + '</li>');
    });
    html.push('</ul>');
    html.push('</div>');
  });
  html.push('</div>');

  html.push('<div class="secao"><h2>Orientações ao Cliente</h2>');
  html.push('<p>Para garantir o bom andamento dos serviços, solicitamos ao cliente:</p>');
  html.push('<ul>');
  (CRONEXEC_CFG.TEXTOS.ORIENTACOES_CLIENTE || []).forEach(function (item) {
    html.push('<li>' + CronExec_escaparHtml_(item) + '</li>');
  });
  html.push('</ul>');
  html.push('</div>');

  if (textosIA.consideracoesFinais) {
    html.push('<div class="secao"><h2>Considerações Finais</h2>');
    html.push(CronExecDoc_paragrafosHtml_(textosIA.consideracoesFinais));
    html.push('</div>');
  }

  html.push('<div class="rodape-final">');
  html.push('<div class="assinaturas">');
  assinaturas.forEach(function (a) {
    html.push('<div class="assinatura-item">');
    if (a.imagemSvg) html.push(a.imagemSvg);
    html.push('<div class="assinatura-linha"><strong>' + CronExec_escaparHtml_(a.nome) + '</strong><br>' + CronExec_escaparHtml_(a.cargo) + '<br>' + CronExec_escaparHtml_(a.registro) + '</div>');
    html.push('</div>');
  });
  html.push('</div>');

  html.push('<div class="rodape-aviso">Este documento apresenta o cronograma estimado para execução dos serviços de calibração e qualificação técnica descritos acima. As datas são previsões e podem sofrer ajustes conforme o andamento prático dos trabalhos.</div>');
  html.push('</div>');

  html.push('</div>');
  html.push('</body></html>');
  return html.join('\n');
}

/**
 * Monta o documento e retorna só o HTML (sem tocar Drive) — mesmo padrão
 * de PlanCME_apiMontarDocumentoFinal: o frontend abre o HTML numa nova
 * aba e só salva no Drive quando o usuário clicar em "Salvar no Drive".
 */
function CronExec_apiMontarDocumentoFinal(dados) {
  try {
    const html = CronExec_montarDocumentoHtml_(dados);
    return { ok: true, html: html };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao montar o documento: " + e.message };
  }
}

/**
 * Converte o HTML já gerado em PDF e salva na pasta de PDFs do Drive,
 * registrando o documento na planilha. Só roda quando o usuário clica
 * em "Salvar no Drive".
 */
function CronExec_apiSalvarDocumento(payload) {
  try {
    payload = payload || {};
    const html = String(payload.html || "");
    if (!html) throw new Error("Nenhum conteúdo de documento recebido para salvar.");

    const props = PropertiesService.getScriptProperties();
    let pastaId = props.getProperty("CRONEXEC_PASTA_PDF_ID");
    if (!pastaId) {
      CronExec_setupModulo();
      pastaId = props.getProperty("CRONEXEC_PASTA_PDF_ID");
    }

    // pasta do cliente (CNPJ ou nome) dentro da pasta do módulo; data no nome para não sobrescrever emissões anteriores
    const raiz = DriveApp.getFolderById(pastaId);
    const pasta = (payload.cnpj || payload.cliente) ? SGO_DocSalvar_pastaClienteEm_(raiz, payload.cnpj, payload.cliente) : raiz;
    const blob = Utilities.newBlob(html, MimeType.HTML).getAs(MimeType.PDF);

    const nomeCliente = CronExec_sanitizarNomeArquivo_(payload.cliente || "CLIENTE");
    const nomeArquivo = "CRONOGRAMA_EXECUCAO_" + nomeCliente + "_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd_HHmm") + ".pdf";
    blob.setName(nomeArquivo);

    const arquivo = pasta.createFile(blob);
    arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    CronExec_registrarDocumento_({
      cliente: { razaoSocial: payload.cliente || "" },
      cronogramaId: payload.cronogramaId || ""
    }, arquivo, "CRONOGRAMA_EXECUCAO");

    // Cópia HTML A4 na mesma pasta do PDF (nunca lança).
    const htmlSalvo = SGO_DocSalvar_htmlAoLado_(pasta, nomeArquivo, html, { compartilhar: true });
    const resposta = { ok: true, url: arquivo.getUrl(), fileName: arquivo.getName(), htmlId: htmlSalvo.htmlId, htmlUrl: htmlSalvo.htmlUrl };
    if (htmlSalvo.avisoHtml) resposta.avisoHtml = htmlSalvo.avisoHtml;
    return resposta;
  } catch (e) {
    return { ok: false, mensagem: "Erro ao salvar o documento no Drive: " + e.message };
  }
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

/** Converte "yyyy-mm-dd" (formato interno) pra "dd/mm" (formato de exibição do documento, igual ao PDF de referência). */
function CronExec_formatarDataBr_(dataIso) {
  const partes = String(dataIso || "").split("-");
  if (partes.length !== 3) return dataIso || "";
  // Com o ano: cronograma que atravessa a virada do ano (ex.: dezembro a
  // janeiro) ficava ambíguo só com dia/mês.
  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

/**
 * Mesmo formato de CronExec_formatarDataBr_, mas com o dia da semana
 * abreviado entre parênteses (ex.: "19/08 (qua)") — sem isso, o salto
 * de datas causado por "dias úteis" pulando fim de semana parece
 * incoerente pra quem olha o documento sem contar no calendário
 * (achado real 2026-08-11, reportado pelo usuário).
 */
function CronExec_formatarDataBrComDia_(dataIso) {
  const base = CronExec_formatarDataBr_(dataIso);
  if (!base) return base;
  const d = CronExec_parseDataISO_(dataIso);
  const dias = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  return base + " (" + dias[d.getDay()] + ")";
}

/**
 * Descreve em qual(is) grupo(s) as unidades de um equipamento caem —
 * ex.: "Grupo 1 (1 un.)" ou "Grupo 1 (1 un.) + Grupo 3 (1 un.)" quando
 * a mesma linha de equipamento (quantidade > 1) é dividida entre
 * grupos diferentes de propósito (ver CronExec_sugerirGrupos_).
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

/** true se algum equipamento desta lista aparecer em mais de 1 grupo (usado pra decidir se mostra o aviso explicativo). */
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
