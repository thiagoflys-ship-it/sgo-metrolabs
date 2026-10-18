/**
 * Registro operacional — documento A4 (padrão de 18/10/2026,
 * docs/DOCUMENTOS_PADRAO_A4_20261018.md): moldura SGO_RelTecA4 (cabeçalho e rodapé corridos,
 * "Página X de Y"), tipografia e tabelas da SGO_DocA4, seções com numeração simples,
 * tabelas de campos com cabeçalho repetido em cada folha (registro com muitos campos),
 * campo de texto longo em linha inteira e assinaturas com nome, cargo e papel legíveis.
 */
function RegOp_getCss_(opcoes) {
  const o = opcoes || {};
  const docA4 = (typeof SGO_DocA4_estilos_ === 'function')
    ? SGO_DocA4_estilos_({ tituloCurto: o.titulo, numero: o.numero, revisao: o.revisao })
    : SGO_DocA4_css_();
  const proprio = [
    '.abertura{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:.6pt solid #9aa5b1;padding-bottom:2.2mm;margin:0 0 6mm}',
    '.abertura img{height:13mm;width:auto;display:block}',
    '.abertura .meta{text-align:right;font-size:7.8pt;line-height:1.35;color:#3e4c59}',
    'table.campos th.rot{width:38%}',
    'table.campos td.valor.sim{color:#1d6b3f;font-weight:700}',
    'table.campos td.valor.nao{color:#a61b1b;font-weight:700}',
    'table.campos td.valor.na{color:#3e4c59;font-weight:700}',
    'table.campos tr.longo{break-inside:auto;page-break-inside:auto}',
    'table.campos tr.longo td p{margin:0 0 1.6mm;text-align:justify;hyphens:auto}',
    'table.campos tr.longo td .rot-longo{display:block;font-weight:700;color:#243b53;margin:0 0 1mm}',
    '.reltec-fecho .assinaturas{margin-top:3mm}.reltec-fecho .assinatura{max-width:88mm}'
  ].join('');
  return docA4 + proprio + RelTecA4_css_({ titulo: o.titulo, numero: o.numero, revisao: o.revisao });
}

function RegOpDoc_logo_() {
  try { if (typeof SGO_DocA4_logoDataUri_ === 'function') return SGO_DocA4_logoDataUri_(); } catch (e) { /* reserva */ }
  return RegOp_getLogoDataUri_();
}

/** Texto digitado → parágrafos (linha em branco) com as quebras de linha mantidas. */
function RegOpDoc_paragrafos_(texto) {
  return String(texto || '').replace(/\r\n/g, '\n').split(/\n{2,}/).map(function (p) { return p.trim(); }).filter(Boolean)
    .map(function (p) { return '<p>' + RegOp_quebrasLinha_(RegOp_escaparHtml_(p)) + '</p>'; }).join('');
}

/**
 * Monta o HTML A4 do registro preenchido.
 * @param {object} dados { hospital, tipoDocumentoNome, data, registroId, registroOrigemInfo,
 *   respostas: [{rotulo, tipo, secao, valor}], assinaturas: [{papel, nome, cargo}],
 *   observacoesGerais, imagens: [{base64, mimeType, legenda}] }
 */
function RegOp_montarDocumentoHtml_(dados) {
  dados = dados || {};
  const hospital = dados.hospital || {};
  const respostas = dados.respostas || [];
  const assinaturas = dados.assinaturas || [];
  const imagens = (dados.imagens || []).filter(function (im) { return im && im.base64; });
  const esc = RegOp_escaparHtml_;
  const numero = dados.registroId ? RegOp_numeroCurto_(dados.registroId) : '';
  const tituloCurto = 'Registro operacional';
  let n = 0;
  const h2 = function (t) { n++; return '<h2>' + n + '. ' + esc(t) + '</h2>'; };

  // agrupa respostas por seção, preservando a ordem de chegada; campos sem seção
  // vão primeiro, numa seção "Informações gerais"
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
  html.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">');
  html.push('<title>' + esc(dados.tipoDocumentoNome || 'Registro operacional') + (numero ? ' ' + esc(numero) : '') + ' — ' + esc(hospital.razaoSocial || '') + '</title>');
  html.push('<style>' + RegOp_getCss_({ titulo: tituloCurto, numero: numero, revisao: '00' }) + '</style></head><body>');
  html.push('<div class="barra-tela"><button type="button" onclick="window.print()">Imprimir ou salvar em PDF</button></div>');
  html.push('<main class="folha">');
  html.push('<header class="abertura"><img src="' + RegOpDoc_logo_() + '" alt="Metrolabs"><div class="meta">' + esc(tituloCurto) + (numero ? '<br>Nº ' + esc(numero) + ' · Revisão 00' : '') + '</div></header>');
  html.push('<h1>' + esc(dados.tipoDocumentoNome || 'Registro operacional') + '</h1>');
  html.push('<p class="subtitulo">Registro operacional de engenharia clínica, ' + esc(String(REGOP_CFG.BASE_NORMATIVA || '').replace(/^Conforme /, 'conforme ')) + '</p>');
  const ficha = [['Data do registro', dados.data || '—'], ['Registro nº', numero || '—']];
  if (dados.registroOrigemInfo) ficha.push(['Referente ao registro', [dados.registroOrigemInfo.data, dados.registroOrigemInfo.tipoDocumentoNome].filter(Boolean).join(' — '), { largo: true }]);
  html.push(SGO_DocA4_tabelaIdent_(ficha, 'ficha'));

  html.push('<section>' + h2('Identificação'));
  html.push(SGO_DocA4_tabelaIdent_([
    ['Cliente / instituição', hospital.razaoSocial || '—', { largo: true }],
    ['CNPJ', hospital.cnpj ? RegOp_formatarCnpj_(hospital.cnpj) : '—'], ['Localização', [hospital.cidade, hospital.uf].filter(Boolean).join('/') || '—']
  ]));
  html.push('</section>');

  grupos.forEach(function (grupo) {
    html.push('<section>' + h2(grupo.secao || 'Informações gerais'));
    html.push('<table class="t campos"><thead><tr><th>Item</th><th>Registro</th></tr></thead><tbody>');
    grupo.itens.forEach(function (item) {
      const valorBruto = String(item.valor === undefined || item.valor === null ? '' : item.valor);
      const valor = RegOp_formatarValorCampo_(item.tipo, valorBruto);
      // Texto longo (mais de ~3 linhas na coluna) vai em linha inteira, com o rótulo em cima.
      if (item.tipo === 'texto' && (valor.length > 180 || (valor.match(/\n/g) || []).length > 2)) {
        html.push('<tr class="longo"><td colspan="2"><span class="rot-longo">' + esc(item.rotulo || '') + '</span>' + RegOpDoc_paragrafos_(valor) + '</td></tr>');
        return;
      }
      let classeValor = '';
      if (item.tipo === 'sim_nao_na') {
        classeValor = valorBruto === 'Sim' ? 'sim' : (valorBruto === 'Não' ? 'nao' : (valorBruto === 'N/A' ? 'na' : ''));
      }
      html.push('<tr><th class="rot">' + esc(item.rotulo || '') + '</th><td class="valor ' + classeValor + '">' + RegOp_quebrasLinha_(esc(valor || '—')) + '</td></tr>');
    });
    html.push('</tbody></table></section>');
  });

  if (dados.observacoesGerais) {
    html.push('<section>' + h2('Observações gerais') + RegOpDoc_paragrafos_(dados.observacoesGerais) + '</section>');
  }

  if (imagens.length) {
    html.push('<section>' + h2('Registros fotográficos') + '<div class="fotos">');
    imagens.forEach(function (img, i) {
      const mime = /^image\/(png|jpe?g|gif|webp)$/i.test(String(img.mimeType || '')) ? img.mimeType : 'image/jpeg';
      html.push('<figure class="foto"><div class="q"><img src="data:' + mime + ';base64,' + String(img.base64).replace(/[^A-Za-z0-9+\/=]/g, '') + '" alt="Figura ' + (i + 1) + '"></div>' +
        '<figcaption class="leg"><b>Figura ' + (i + 1) + '</b>' + (img.legenda ? ' — ' + esc(img.legenda) : '') + '</figcaption></figure>');
    });
    html.push('</div></section>');
  }

  const assin = assinaturas.filter(function (a) { return a && (a.nome || a.papel); });
  if (assin.length) {
    html.push('<section class="reltec-fecho">' + h2(assin.length === 1 ? 'Assinatura' : 'Assinaturas'));
    html.push('<p>As informações deste registro foram conferidas por quem assina abaixo.</p>');
    html.push(SGO_DocA4_assinaturas_(assin.map(function (a) {
      return { nome: a.nome || '', cargo: a.cargo || '', registro: a.papel || 'Responsável' };
    })));
    html.push('</section>');
  }

  html.push('</main></body></html>');
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

/** Valor de campo como aparece no documento: número com vírgula decimal e data dd/mm/aaaa. */
function RegOp_formatarValorCampo_(tipo, valor) {
  const s = String(valor == null ? '' : valor).trim();
  if (!s) return '';
  if (tipo === 'numero' && /^-?\d+(\.\d+)?$/.test(s)) return s.replace('.', ',');
  if (tipo === 'data') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return m[3] + '/' + m[2] + '/' + m[1];
  }
  return s;
}

/** Quebra de linha digitada vira <br> (recebe texto já escapado). */
function RegOp_quebrasLinha_(htmlEscapado) {
  return String(htmlEscapado).replace(/\r?\n/g, '<br>');
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
        criadoEm: f.getDateCreated().getTime(),
        nome: f.getName(),
        url: f.getUrl(),
        data: Utilities.formatDate(f.getDateCreated(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm")
      });
    }
    // Mais recente primeiro pela data de criação (o nome tinha a data em
    // ddmmaaaa, que não ordena por tempo). criadoEm é número, não Date.
    arquivos.sort(function (a, b) { return b.criadoEm - a.criadoEm; });
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
  // Fase 2 (16/10): no servidor próprio não há Drive do Google; usa a mesma logo embutida do
  // Certificado de calibração (CadeiaFrioRel_CFCFG.LOGO_BASE64). O ID do Drive fica como reserva.
  try {
    const cfgLogo = typeof CadeiaFrioRel_CFCFG !== "undefined" ? CadeiaFrioRel_CFCFG.LOGO_BASE64 : null;
    if (cfgLogo && cfgLogo.data) return "data:" + (cfgLogo.mimeType || "image/png") + ";base64," + cfgLogo.data;
  } catch (e) { /* segue para o Drive */ }
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


/** Número curto do registro para o documento (o ID completo fica na base). */
function RegOp_numeroCurto_(id) {
  return 'REG-' + String(id || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();
}
