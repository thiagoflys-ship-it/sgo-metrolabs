/**
 * CSS do documento — "folha A4" padrão do Portal, com blocos de campos
 * agrupados por seção e 1+ blocos de assinatura (não há Elaborado/
 * Revisado/Aprovado aqui — quem preenche é o colaborador de campo).
 */
function RegOp_getCss_() {
  const css = [];
  css.push('@page { size: A4; margin: 18mm 16mm; }');
  css.push('* { box-sizing: border-box; }');
  css.push('body { font-family: "Segoe UI", Arial, sans-serif; color: #1f2937; font-size: 13px; line-height: 1.55; margin: 0; background: #f3f4f6; }');
  css.push('.folha { max-width: 900px; margin: 24px auto; background: #ffffff; padding: 28px 34px 40px; box-shadow: 0 2px 10px rgba(0,0,0,.12); }');
  css.push('.topo { display:flex; align-items:center; justify-content:space-between; border-bottom: 3px solid #0b4ea2; padding-bottom: 14px; margin-bottom: 14px; }');
  css.push('.logo-topo { height: 40px; }');
  css.push('.marca-doc { text-align:right; font-size: 11px; color:#6b7280; font-weight:700; letter-spacing: .5px; }');
  css.push('.controle-doc { border: 1px solid #d1d5db; border-radius: 4px; padding: 10px 14px; margin-bottom: 18px; background: #f9fafb; }');
  css.push('.controle-doc-linha { display:flex; justify-content:space-between; flex-wrap:wrap; gap: 10px; font-size: 11.5px; color:#374151; }');
  css.push('.controle-doc-linha b { color:#0b4ea2; }');
  css.push('.titulo-central { text-align:center; margin: 16px 0 4px; }');
  css.push('.titulo-central h1 { font-size: 16px; margin: 0; color:#0b4ea2; text-transform: uppercase; letter-spacing: .3px; }');
  css.push('.titulo-central .norma { font-size: 11px; color:#6b7280; margin-top: 4px; }');
  css.push('table.dados { width:100%; border-collapse: collapse; margin: 18px 0; }');
  css.push('table.dados tr { page-break-inside: avoid; }');
  css.push('table.dados td { border: 1px solid #d1d5db; padding: 6px 10px; font-size: 12.5px; }');
  css.push('table.dados td.rotulo { background:#f3f4f6; font-weight:700; width: 190px; color:#374151; }');
  // .secao NÃO usa page-break-inside:avoid — seções com muitos campos
  // (ex.: um treinamento com 5 participantes) não cabem inteiras numa
  // página, e "avoid" fazia o navegador jogar a seção INTEIRA pra
  // próxima página, deixando um vão enorme em branco na página
  // anterior (bug real reportado em 2026-08-15). Cada LINHA da tabela
  // continua protegida (não quebra no meio de 1 campo), só a seção
  // como um todo pode fluir por várias páginas.
  css.push('.secao { margin-top: 22px; }');
  css.push('.secao h2 { font-size: 13px; color:#ffffff; background:#0b4ea2; padding: 8px 12px; margin: 0 0 12px; border-left: 6px solid #059669; page-break-after: avoid; page-break-inside: avoid; }');
  css.push('p, li { text-align: justify; margin: 8px 0; orphans: 3; widows: 3; }');
  css.push('table.checklist { width:100%; border-collapse: collapse; margin: 6px 0; font-size: 12px; }');
  css.push('table.checklist tr { page-break-inside: avoid; }');
  css.push('table.checklist th, table.checklist td { border: 1px solid #d1d5db; padding: 7px 10px; text-align:left; vertical-align: top; }');
  css.push('table.checklist th { background:#f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: .3px; color:#374151; }');
  css.push('table.checklist td.resposta { width: 90px; text-align:center; font-weight:700; }');
  css.push('table.checklist td.resposta.sim { color:#059669; }');
  css.push('table.checklist td.resposta.nao { color:#dc2626; }');
  css.push('table.checklist td.resposta.na { color:#6b7280; }');
  css.push('table.campos { width:100%; border-collapse: collapse; margin: 6px 0; }');
  css.push('table.campos tr { page-break-inside: avoid; }');
  css.push('table.campos td { border: 1px solid #d1d5db; padding: 7px 10px; font-size: 12.5px; vertical-align: top; }');
  css.push('table.campos td.rotulo { background:#f3f4f6; font-weight:700; width: 260px; color:#374151; }');
  css.push('table.campos td.valor.sim { color:#059669; font-weight:700; }');
  css.push('table.campos td.valor.nao { color:#dc2626; font-weight:700; }');
  css.push('table.campos td.valor.na { color:#6b7280; font-weight:700; }');
  css.push('.figura-item { margin: 14px 0; page-break-inside: avoid; text-align: center; }');
  css.push('.figura-item img { max-width: 100%; max-height: 320px; border: 1px solid #d1d5db; border-radius: 4px; }');
  css.push('.figura-legenda { font-size: 11.5px; color:#374151; font-weight:700; margin-top: 6px; }');
  css.push('.assinaturas-wrap { display:flex; flex-wrap:wrap; gap: 34px; margin-top: 26px; }');
  css.push('.assinatura-item { max-width: 420px; flex: 1 1 260px; page-break-inside: avoid; }');
  css.push('.assinatura-linha { border-top: 1px solid #1f2937; margin-top: 26px; padding-top: 4px; font-size: 12px; }');
  css.push('.assinatura-linha .papel { font-size: 10.5px; color:#6b7280; text-transform: uppercase; letter-spacing: .4px; }');
  css.push('.barra-imprimir { max-width: 900px; margin: 0 auto 12px; text-align: right; }');
  css.push('.barra-imprimir button { background:#0b4ea2; color:#fff; border:none; padding:10px 18px; border-radius:4px; font-weight:700; cursor:pointer; font-size:13px; }');
  css.push('@media print { body { background:#ffffff; } .folha { box-shadow:none; margin:0; padding:0; max-width:none; } .no-print { display:none !important; } }');
  return css.join('\n');
}

/**
 * Monta o HTML A4 do registro preenchido.
 * @param {object} dados { hospital, tipoDocumentoNome, data,
 *   respostas: [{rotulo, tipo, secao, valor}], assinaturas: [{papel, nome, cargo}],
 *   observacoesGerais, imagens: [{base64, mimeType, legenda}] }
 */
function RegOp_montarDocumentoHtml_(dados) {
  const logo = RegOp_getLogoDataUri_();
  const hospital = dados.hospital || {};
  const respostas = dados.respostas || [];
  const assinaturas = dados.assinaturas || [];
  const imagens = dados.imagens || [];

  // agrupa respostas por seção, preservando a ordem de chegada; campos
  // sem seção caem no grupo '' (renderizado primeiro, sem título de h2)
  const grupos = [];
  const indicePorSecao = {};
  respostas.forEach(function (r) {
    const secao = String(r.secao || '').trim();
    if (!(secao in indicePorSecao)) {
      indicePorSecao[secao] = grupos.length;
      grupos.push({ secao: secao, itens: [] });
    }
    grupos[indicePorSecao[secao]].itens.push(r);
  });
  grupos.sort(function (a, b) { return (a.secao === '' ? -1 : 0) - (b.secao === '' ? -1 : 0); });

  const html = [];
  html.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">');
  html.push('<title>' + RegOp_escaparHtml_(dados.tipoDocumentoNome || 'Registro') + ' — ' + RegOp_escaparHtml_(hospital.razaoSocial || '') + '</title>');
  html.push('<style>' + RegOp_getCss_() + '</style></head><body>');

  html.push('<div class="barra-imprimir no-print"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>');
  html.push('<div class="folha">');

  html.push('<div class="topo">');
  if (logo) {
    html.push('<img class="logo-topo" src="' + logo + '" alt="Metrolabs">');
  } else {
    html.push('<div></div>');
  }
  html.push('<div class="marca-doc">ENGENHARIA CLÍNICA — REGISTRO OPERACIONAL</div>');
  html.push('</div>');

  html.push('<div class="controle-doc">');
  html.push('<div class="controle-doc-linha">');
  html.push('<span><b>Tipo de Documento:</b> ' + RegOp_escaparHtml_(dados.tipoDocumentoNome || '—') + '</span>');
  html.push('<span><b>Data do Registro:</b> ' + RegOp_escaparHtml_(dados.data || '') + '</span>');
  html.push('</div>');
  if (dados.registroOrigemInfo) {
    html.push('<div class="controle-doc-linha"><span><b>Referente ao registro de:</b> ' +
      RegOp_escaparHtml_(dados.registroOrigemInfo.data || '') + ' — ' +
      RegOp_escaparHtml_(dados.registroOrigemInfo.tipoDocumentoNome || '') + '</span></div>');
  }
  html.push('</div>');

  html.push('<div class="titulo-central"><h1>' + RegOp_escaparHtml_(dados.tipoDocumentoNome || '') + '</h1><div class="norma">' + RegOp_escaparHtml_(REGOP_CFG.BASE_NORMATIVA) + '</div></div>');

  html.push('<table class="dados">');
  html.push('<tr><td class="rotulo">Hospital/Instituição</td><td>' + RegOp_escaparHtml_(hospital.razaoSocial || '') + '</td></tr>');
  html.push('<tr><td class="rotulo">CNPJ</td><td>' + RegOp_escaparHtml_(hospital.cnpj || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Localização</td><td>' + RegOp_escaparHtml_([hospital.cidade, hospital.uf].filter(Boolean).join('/') || '—') + '</td></tr>');
  html.push('</table>');

  grupos.forEach(function (grupo) {
    html.push('<div class="secao">');
    if (grupo.secao) html.push('<h2>' + RegOp_escaparHtml_(grupo.secao) + '</h2>');
    html.push('<table class="campos">');
    grupo.itens.forEach(function (item) {
      const valorBruto = String(item.valor === undefined || item.valor === null ? '' : item.valor);
      let classeValor = '';
      if (item.tipo === 'sim_nao_na') {
        classeValor = valorBruto === 'Sim' ? 'sim' : (valorBruto === 'Não' ? 'nao' : (valorBruto === 'N/A' ? 'na' : ''));
      }
      html.push('<tr><td class="rotulo">' + RegOp_escaparHtml_(item.rotulo || '') + '</td><td class="valor ' + classeValor + '">' + RegOp_escaparHtml_(valorBruto || '—') + '</td></tr>');
    });
    html.push('</table></div>');
  });

  if (dados.observacoesGerais) {
    html.push('<div class="secao"><h2>Observações Gerais</h2><p>' + RegOp_escaparHtml_(dados.observacoesGerais) + '</p></div>');
  }

  if (imagens.length) {
    html.push('<div class="secao"><h2>Registros Fotográficos</h2>');
    imagens.forEach(function (img, i) {
      html.push('<div class="figura-item">');
      html.push('<img src="data:' + (img.mimeType || 'image/jpeg') + ';base64,' + img.base64 + '" alt="Figura ' + (i + 1) + '">');
      html.push('<div class="figura-legenda">Figura ' + (i + 1) + (img.legenda ? (': ' + RegOp_escaparHtml_(img.legenda)) : '') + '</div>');
      html.push('</div>');
    });
    html.push('</div>');
  }

  html.push('<div class="assinaturas-wrap">');
  assinaturas.forEach(function (assin) {
    html.push('<div class="assinatura-item"><div class="assinatura-linha"><div class="papel">' + RegOp_escaparHtml_(assin.papel || 'Responsável') + '</div>' +
      RegOp_escaparHtml_(assin.nome || '—') + (assin.cargo ? (' — ' + RegOp_escaparHtml_(assin.cargo)) : '') + '</div></div>');
  });
  html.push('</div>');

  html.push('</div>');
  html.push('</body></html>');
  return html.join('\n');
}

/**
 * Pasta do Drive por CNPJ (mesmo padrão de PgtPop_obterPastaPorCnpj_,
 * SGO_PgtPop_Documento.js) — pasta raiz própria deste módulo, mas
 * chaveada da mesma forma: CNPJ (dígitos), descrição = nome do hospital.
 */
function RegOp_obterPastaPorCnpj_(cnpj, nomeHospital) {
  const props = PropertiesService.getScriptProperties();
  let pastaPdfId = props.getProperty("REGOP_PASTA_PDF_ID");
  if (!pastaPdfId) {
    RegOp_setupModulo();
    pastaPdfId = props.getProperty("REGOP_PASTA_PDF_ID");
  }
  const pastaPdf = DriveApp.getFolderById(pastaPdfId);
  const cnpjLimpo = RegOp_normalizarCnpj_(cnpj) || RegOp_sanitizarNomeArquivo_(nomeHospital || "SEM_CNPJ");
  const existentes = pastaPdf.getFoldersByName(cnpjLimpo);
  if (existentes.hasNext()) return existentes.next();
  const nova = pastaPdf.createFolder(cnpjLimpo);
  if (nomeHospital) {
    try { nova.setDescription(String(nomeHospital).substring(0, 500)); } catch (e) {}
  }
  return nova;
}

function RegOp_obterPastaPorCnpjSeExistir_(cnpjNormalizado) {
  const props = PropertiesService.getScriptProperties();
  const pastaPdfId = props.getProperty("REGOP_PASTA_PDF_ID");
  if (!pastaPdfId) return null;
  const pastaPdf = DriveApp.getFolderById(pastaPdfId);
  const it = pastaPdf.getFoldersByName(cnpjNormalizado);
  return it.hasNext() ? it.next() : null;
}

function RegOp_normalizarCnpj_(cnpj) {
  return String(cnpj || '').replace(/\D/g, '');
}

/**
 * Lista os PDFs já salvos na pasta de um CNPJ — mesmo padrão de
 * PgtPop_apiListarArquivosPdf (campos sempre simples/strings, nunca
 * objeto Date cru — lição real de 2026-08-14, ver
 * [[feedback_date_cru_quebra_google_script_run]]).
 */
function RegOp_apiListarArquivosPdf(payload) {
  payload = payload || {};
  const cnpjBusca = RegOp_normalizarCnpj_(payload.cnpj);
  if (!cnpjBusca) {
    return { ok: false, mensagem: "Informe um CNPJ pra consultar." };
  }
  try {
    const pasta = RegOp_obterPastaPorCnpjSeExistir_(cnpjBusca);
    if (!pasta) {
      return { ok: true, arquivos: [] };
    }
    const arquivos = [];
    const it = pasta.getFilesByType(MimeType.PDF);
    while (it.hasNext()) {
      const f = it.next();
      arquivos.push({
        nome: f.getName(),
        url: f.getUrl(),
        data: Utilities.formatDate(f.getDateCreated(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm")
      });
    }
    arquivos.sort(function (a, b) { return a.nome < b.nome ? 1 : (a.nome > b.nome ? -1 : 0); });
    return { ok: true, arquivos: arquivos, pastaUrl: pasta.getUrl() };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao listar arquivos: " + e.message };
  }
}

function RegOp_registrarDocumento_(dados, arquivo) {
  const db = RegOp_getDB_();
  const aba = db.getSheetByName(REGOP_CFG.PLANILHA.ABAS.DOCUMENTOS);
  const agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

  aba.appendRow([
    RegOp_gerarId_(),
    agora,
    dados.hospital || "",
    dados.cnpj || "",
    arquivo.getName(),
    arquivo.getUrl(),
    dados.registroId || ""
  ]);
}

function RegOp_getLogoDataUri_() {
  try {
    const logoId = PropertiesService.getScriptProperties().getProperty("REGOP_LOGO_ID") || REGOP_CFG.LOGO_ID;
    const blob = DriveApp.getFileById(logoId).getBlob();
    const contentType = blob.getContentType();
    const bytes = blob.getBytes();
    const base64 = Utilities.base64Encode(bytes);
    return "data:" + contentType + ";base64," + base64;
  } catch (e) {
    return "";
  }
}

function RegOp_sanitizarNomeArquivo_(texto) {
  return String(texto || "ARQUIVO")
    .replace(/[\\\/:*?\"<>|]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 60);
}

function RegOp_escaparHtml_(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
