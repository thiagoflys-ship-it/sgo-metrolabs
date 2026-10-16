/**
 * Converte o corpo gerado pela IA (texto com marcadores "## Título ##"
 * livres) em blocos HTML .secao/h2/p, um por seção.
 */
function PgtPopDoc_corpoParaHtml_(corpo) {
  const linhas = String(corpo || '').split('\n');
  const secoes = [];
  let atual = null;
  let paragrafoAtual = [];

  function flushParagrafo() {
    const texto = paragrafoAtual.join(' ').trim();
    if (texto) {
      if (!atual) { atual = { titulo: '', paragrafos: [] }; secoes.push(atual); }
      atual.paragrafos.push(texto);
    }
    paragrafoAtual = [];
  }

  linhas.forEach(function (linhaRaw) {
    const linha = linhaRaw.trim();
    const m = linha.match(/^##\s*(.+?)\s*##$/);
    if (m) {
      flushParagrafo();
      atual = { titulo: m[1], paragrafos: [] };
      secoes.push(atual);
    } else if (!linha) {
      flushParagrafo();
    } else {
      paragrafoAtual.push(linha);
    }
  });
  flushParagrafo();

  return secoes.map(function (s) {
    const tituloHtml = s.titulo ? ('<h2>' + PgtPop_escaparHtml_(s.titulo) + '</h2>') : '';
    const corpoHtml = s.paragrafos.map(function (p) { return '<p>' + PgtPop_escaparHtml_(p) + '</p>'; }).join('\n');
    return '<div class="secao">' + tituloHtml + corpoHtml + '</div>';
  }).join('\n');
}

/**
 * CSS do documento — "folha A4" padrão do Portal + o bloco de controle
 * de documento (código/revisão/histórico/assinaturas em branco) do
 * padrão real de POP/PGT da Metrolabs, que não existe nos outros
 * módulos do Portal.
 */
function PgtPop_getCss_() {
  const css = [];
  css.push('@page { size: A4; margin: 18mm 16mm; }');
  css.push('* { box-sizing: border-box; }');
  css.push('body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 13px; line-height: 1.55; margin: 0; background: #f3f4f6; }');
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
  css.push('table.dados td { border: 1px solid #d1d5db; padding: 6px 10px; font-size: 12.5px; }');
  css.push('table.dados td.rotulo { background:#f3f4f6; font-weight:700; width: 190px; color:#374151; }');
  css.push('.secao { margin-top: 22px; }');
  css.push('.secao h2 { font-size: 13px; color:#ffffff; background:#0b4ea2; padding: 8px 12px; margin: 0 0 12px; border-left: 6px solid #059669; page-break-after: avoid; page-break-inside: avoid; }');
  css.push('p, li { text-align: justify; margin: 8px 0; orphans: 3; widows: 3; }');
  css.push('table.historico { width:100%; border-collapse: collapse; margin: 10px 0 4px; font-size: 12px; }');
  css.push('table.historico th, table.historico td { border: 1px solid #d1d5db; padding: 6px 10px; text-align:left; }');
  css.push('table.historico th { background:#f3f4f6; }');
  css.push('.assinaturas-pop { margin-top: 18px; display:flex; flex-direction: column; gap: 22px; page-break-inside: avoid; }');
  css.push('.assinatura-pop-item { max-width: 420px; }');
  css.push('.assinatura-pop-svg { height: 52px; display: block; }');
  css.push('.assinatura-pop-svg svg { height: 52px; width: auto; }');
  css.push('.assinatura-pop-linha { border-top: 1px solid #1f2937; margin-top: 26px; padding-top: 4px; font-size: 12px; }');
  css.push('.assinatura-pop-item.com-assinatura .assinatura-pop-linha { margin-top: 4px; }');
  css.push('.assinatura-pop-linha .papel { font-size: 10.5px; color:#6b7280; text-transform: uppercase; letter-spacing: .4px; }');
  css.push('.figura-item { margin: 14px 0; page-break-inside: avoid; text-align: center; }');
  css.push('.figura-item img { max-width: 100%; max-height: 320px; border: 1px solid #d1d5db; border-radius: 4px; }');
  css.push('.figura-legenda { font-size: 11.5px; color:#374151; font-weight:700; margin-top: 6px; }');
  css.push('.figura-interpretacao { font-size: 12px; color:#4b5563; margin-top: 4px; text-align: left; }');
  css.push('.destaque { background:#f3f4f6; border-left: 4px solid #0b4ea2; padding: 14px 16px; margin-top: 14px; page-break-inside: avoid; }');
  css.push('.barra-imprimir { max-width: 900px; margin: 0 auto 12px; text-align: right; }');
  css.push('.barra-imprimir button { background:#0b4ea2; color:#fff; border:none; padding:10px 18px; border-radius:4px; font-weight:700; cursor:pointer; font-size:13px; }');
  css.push('@media print { body { background:#ffffff; } .folha { box-shadow:none; margin:0; padding:0; max-width:none; } .no-print { display:none !important; } }');  css.push(SGO_DocA4_css_());
  return css.join('\n');
}

/**
 * Monta o documento (PGT ou POP) no padrão real de controle de
 * documento da Metrolabs (código, revisão, histórico, 4 assinaturas —
 * Elaborado por [variável, sem rubrica], Revisado por [Charles, fixo,
 * com rubrica], Aprovado por Metrolabs [Douglas, fixo, com rubrica] e
 * Aprovado por/RT do Hospital [variável, sem rubrica]) + o corpo
 * gerado pela IA + seção de figuras (se houver imagens anexadas).
 * @param {object} dados { tipo, titulo, textoGerado, hospital, roteiro,
 *   pop, codigoDocumento, versaoAtual, historico, imagens }
 */
function PgtPop_montarDocumentoHtml_(dados) {
  const logo = PgtPop_getLogoDataUri_();
  const hospital = dados.hospital || {};
  const tipo = dados.tipo === 'POP' ? 'POP' : 'PGT';
  const dataAtual = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  const historico = dados.historico || [];
  const imagens = dados.imagens || [];
  // Nome/cargo/registro de "Elaborado por" são editáveis no wizard
  // (2026-08-13) — cargo/registro NÃO podem mais cair no padrão fixo de
  // PGTPOP_CFG quando o nome muda: um registro profissional (REA-GO) é
  // específico de uma pessoa, aplicá-lo a outro nome é um erro real que
  // já saiu em documento (reportado pelo usuário). Só usa o fallback do
  // config quando o próprio campo do wizard também está vazio.
  const elaborado = {
    nome: dados.elaboradoPorNome || PGTPOP_CFG.ENGENHEIRO_ELABORADO.nome,
    cargo: dados.elaboradoPorCargo || PGTPOP_CFG.ENGENHEIRO_ELABORADO.cargo,
    registro: dados.elaboradoPorRegistro || PGTPOP_CFG.ENGENHEIRO_ELABORADO.registro
  };
  const revisado = PGTPOP_CFG.ENGENHEIRO_REVISADO;
  const aprovadorMetrolabs = PGTPOP_CFG.APROVADOR_METROLABS;

  const html = [];
  html.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">');
  html.push('<title>' + PgtPop_escaparHtml_(dados.codigoDocumento || tipo) + ' — ' + PgtPop_escaparHtml_(dados.titulo || tipo) + '</title>');
  html.push('<style>' + PgtPop_getCss_() + '</style></head><body>');

  html.push('<div class="barra-imprimir no-print"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>');
  html.push('<div class="folha">');

  html.push('<div class="topo">');
  if (logo) {
    html.push('<img class="logo-topo" src="' + logo + '" alt="Metrolabs">');
  } else {
    html.push('<div></div>');
  }
  html.push('<div class="marca-doc">ENGENHARIA CLÍNICA</div>');
  html.push('</div>');

  html.push('<div class="controle-doc">');
  html.push('<div class="controle-doc-linha">');
  html.push('<span><b>Código:</b> ' + PgtPop_escaparHtml_(dados.codigoDocumento || '—') + '</span>');
  html.push('<span><b>Data desta Revisão:</b> ' + PgtPop_escaparHtml_(dataAtual) + '</span>');
  html.push('<span><b>Revisão:</b> ' + PgtPop_escaparHtml_(String(dados.versaoAtual || 1)) + '.0</span>');
  html.push('</div>');
  html.push('<div class="controle-doc-linha" style="margin-top:6px;"><span><b>Título:</b> ' + PgtPop_escaparHtml_(dados.titulo || '') + '</span></div>');
  html.push('</div>');

  html.push('<div class="titulo-central"><h1>' + PgtPop_escaparHtml_(dados.titulo || '') + '</h1><div class="norma">' + PgtPop_escaparHtml_(PGTPOP_CFG.BASE_NORMATIVA) + '</div></div>');

  html.push('<table class="dados">');
  html.push('<tr><td class="rotulo">Hospital/Instituição</td><td>' + PgtPop_escaparHtml_(hospital.razaoSocial || '') + '</td></tr>');
  html.push('<tr><td class="rotulo">CNPJ</td><td>' + PgtPop_escaparHtml_(hospital.cnpj || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Endereço</td><td>' + PgtPop_escaparHtml_(PgtPop_montarEnderecoDoc_(hospital) || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Tipo de Documento</td><td>' + (tipo === 'PGT' ? 'Plano de Gerenciamento de Tecnologias em Saúde (PGTS)' : 'Procedimento Operacional Padrão (POP)') + '</td></tr>');
  html.push('</table>');

  html.push('<div class="secao"><h2>Histórico de Revisões</h2>');
  html.push('<table class="historico"><thead><tr><th>Versão</th><th>Descrição</th><th>Data</th></tr></thead><tbody>');
  historico.forEach(function (h) {
    html.push('<tr><td>' + PgtPop_escaparHtml_(String(h.versao || '')) + '</td><td>' + PgtPop_escaparHtml_(h.descricao || '') + '</td><td>' + PgtPop_escaparHtml_(h.data || '') + '</td></tr>');
  });
  html.push('</tbody></table></div>');

  html.push(PgtPopDoc_corpoParaHtml_(dados.textoGerado));

  if (imagens.length) {
    html.push('<div class="secao"><h2>Registros Fotográficos</h2>');
    imagens.forEach(function (img, i) {
      html.push('<div class="figura-item">');
      html.push('<img src="data:' + (img.mimeType || 'image/jpeg') + ';base64,' + img.base64 + '" alt="Figura ' + (i + 1) + '">');
      html.push('<div class="figura-legenda">Figura ' + (i + 1) + (img.legenda ? (': ' + PgtPop_escaparHtml_(img.legenda)) : '') + '</div>');
      if (img.interpretacao) {
        html.push('<div class="figura-interpretacao">' + PgtPop_escaparHtml_(img.interpretacao) + '</div>');
      }
      html.push('</div>');
    });
    html.push('</div>');
  }

  html.push('<div class="assinaturas-pop">');
  html.push(PgtPop_montarBlocoAssinatura_('Elaborado por', elaborado));
  html.push(PgtPop_montarBlocoAssinatura_('Revisado por', revisado));
  html.push(PgtPop_montarBlocoAssinatura_('Aprovado por (Metrolabs)', aprovadorMetrolabs));
  html.push('<div class="assinatura-pop-item"><div class="assinatura-pop-linha"><div class="papel">Aprovado por (Responsável Técnico do Hospital)</div>' + PgtPop_escaparHtml_(hospital.aprovadorNome || '—') + (hospital.aprovadorCargo ? (' — ' + PgtPop_escaparHtml_(hospital.aprovadorCargo)) : '') + '</div></div>');
  html.push('</div>');

  html.push('</div>');
  html.push('</body></html>');
  return html.join('\n');
}

function PgtPop_apiMontarDocumentoFinal(dados) {
  try {
    const html = PgtPop_montarDocumentoHtml_(dados || {});
    return { ok: true, html: html };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao montar o documento: " + e.message };
  }
}

/**
 * Converte o HTML já gerado em PDF, salva na pasta do CNPJ dentro da
 * pasta de PDFs do Drive (criada sob demanda), e registra o documento
 * na planilha. Usado tanto pelo botão manual "Salvar no Drive" quanto
 * pelo auto-save em PgtPop_salvarPdfAutomatico_ (mesma lógica).
 */
function PgtPop_apiSalvarDocumento(payload) {
  try {
    payload = payload || {};
    const html = String(payload.html || "");
    if (!html) throw new Error("Nenhum conteúdo de documento recebido para salvar.");

    const pasta = PgtPop_obterPastaPorCnpj_(payload.cnpj || "", payload.hospital || "HOSPITAL");
    const blob = Utilities.newBlob(html, MimeType.HTML).getAs(MimeType.PDF);

    const tipo = String(payload.tipo || 'DOCUMENTO').toUpperCase();
    const codigo = PgtPop_sanitizarNomeArquivo_(payload.codigoDocumento || tipo);
    const nomeArquivo = codigo + "_v" + (payload.versaoAtual || 1) + ".pdf";
    blob.setName(nomeArquivo);

    const arquivo = pasta.createFile(blob);
    arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    PgtPop_registrarDocumento_({
      hospital: payload.hospital || "",
      cnpj: payload.cnpj || "",
      registroId: payload.registroId || ""
    }, arquivo, tipo);

    return { ok: true, url: arquivo.getUrl(), fileName: arquivo.getName(), pastaUrl: pasta.getUrl() };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao salvar o documento no Drive: " + e.message };
  }
}

/**
 * Pasta do Drive PARA ESTE HOSPITAL, chaveada pelo CNPJ (dígitos, sem
 * máscara) — não pelo nome digitado, que pode variar entre gerações
 * (maiúsculas, espaços, pequenas diferenças de digitação). Nome do
 * hospital vira só a descrição da pasta, pra navegação manual no
 * Drive ficar legível. (v14, 2026-08-14 — pedido do usuário: pasta por
 * CNPJ com todos os PDFs juntos, pra "consultar documentos já gerados"
 * virar simplesmente listar os arquivos da pasta, sem reconstruir nada
 * via servidor toda vez que abrir um documento antigo.)
 */
function PgtPop_obterPastaPorCnpj_(cnpj, nomeHospital) {
  const props = PropertiesService.getScriptProperties();
  let pastaPdfId = props.getProperty("PGTPOP_PASTA_PDF_ID");
  if (!pastaPdfId) {
    PgtPop_setupModulo();
    pastaPdfId = props.getProperty("PGTPOP_PASTA_PDF_ID");
  }
  const pastaPdf = DriveApp.getFolderById(pastaPdfId);
  const cnpjLimpo = PgtPop_normalizarCnpj_(cnpj) || PgtPop_sanitizarNomeArquivo_(nomeHospital || "SEM_CNPJ");
  const existentes = pastaPdf.getFoldersByName(cnpjLimpo);
  if (existentes.hasNext()) return existentes.next();
  const nova = pastaPdf.createFolder(cnpjLimpo);
  if (nomeHospital) {
    try { nova.setDescription(String(nomeHospital).substring(0, 500)); } catch (e) {}
  }
  return nova;
}

/** Mesma pasta de PgtPop_obterPastaPorCnpj_, mas NUNCA cria — usada só pra consulta (retorna null se não existir ainda). */
function PgtPop_obterPastaPorCnpjSeExistir_(cnpjNormalizado) {
  const props = PropertiesService.getScriptProperties();
  const pastaPdfId = props.getProperty("PGTPOP_PASTA_PDF_ID");
  if (!pastaPdfId) return null;
  const pastaPdf = DriveApp.getFolderById(pastaPdfId);
  const it = pastaPdf.getFoldersByName(cnpjNormalizado);
  return it.hasNext() ? it.next() : null;
}

function PgtPop_registrarDocumento_(dados, arquivo, tipoDocumento) {
  const db = PgtPop_getDB_();
  const aba = db.getSheetByName(PGTPOP_CFG.PLANILHA.ABAS.DOCUMENTOS);
  const agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

  aba.appendRow([
    PgtPop_gerarId_(),
    agora,
    dados.hospital || "",
    dados.cnpj || "",
    tipoDocumento || "DOCUMENTO",
    arquivo.getName(),
    arquivo.getUrl(),
    dados.registroId || ""
  ]);
}

/**
 * Gera o PDF automaticamente e salva na pasta do CNPJ assim que um
 * documento é gerado com sucesso — antes disso, o PDF só existia se o
 * usuário abrisse o documento manualmente e clicasse "Salvar no
 * Drive". Chamado de dentro de PgtPop_apiGerarDocumento (SGO_PgtPop_Main.js).
 * Nunca lança exceção pra fora — se o auto-save falhar, o documento já
 * foi gerado e salvo na planilha normalmente, o PDF é um bônus, não
 * pode derrubar a geração por causa disso.
 */
function PgtPop_salvarPdfAutomatico_(registro) {
  try {
    const html = PgtPop_montarDocumentoHtml_(registro);
    const pasta = PgtPop_obterPastaPorCnpj_((registro.hospital && registro.hospital.cnpj) || '', (registro.hospital && registro.hospital.razaoSocial) || '');
    const blob = Utilities.newBlob(html, MimeType.HTML).getAs(MimeType.PDF);
    const nomeArquivo = PgtPop_sanitizarNomeArquivo_(registro.codigoDocumento || registro.tipo) + "_v" + (registro.versaoAtual || 1) + ".pdf";
    blob.setName(nomeArquivo);
    const arquivo = pasta.createFile(blob);
    arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    PgtPop_registrarDocumento_({
      hospital: (registro.hospital && registro.hospital.razaoSocial) || '',
      cnpj: (registro.hospital && registro.hospital.cnpj) || '',
      registroId: registro.registroId || ''
    }, arquivo, registro.tipo);
    return { url: arquivo.getUrl(), fileName: arquivo.getName() };
  } catch (e) {
    return { url: '', fileName: '', erro: e.message };
  }
}

/**
 * Lista os PDFs já salvos na pasta de um CNPJ — usado por "Consultar
 * documentos já gerados" no lugar de reconstruir cada documento via
 * apiObterDocumentoPorId/apiMontarDocumentoFinal (fluxo antigo, trocado
 * a pedido do usuário em 2026-08-14 por ser frágil demais). Resposta
 * sempre com campos simples (strings) — nada de objeto Date cru ou
 * estrutura aninhada, pra não repetir o bug de payload que quebrava o
 * canal do google.script.run.
 */
function PgtPop_apiListarArquivosPdf(payload) {
  payload = payload || {};
  const cnpjBusca = PgtPop_normalizarCnpj_(payload.cnpj);
  if (!cnpjBusca) {
    return { ok: false, mensagem: "Informe um CNPJ pra consultar." };
  }
  try {
    const pasta = PgtPop_obterPastaPorCnpjSeExistir_(cnpjBusca);
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
    arquivos.sort(function (a, b) { return a.nome < b.nome ? -1 : (a.nome > b.nome ? 1 : 0); });
    return { ok: true, arquivos: arquivos, pastaUrl: pasta.getUrl() };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao listar arquivos: " + e.message };
  }
}

function PgtPop_getLogoDataUri_() {
  try {
    const logoId = PropertiesService.getScriptProperties().getProperty("PGTPOP_LOGO_ID") || PGTPOP_CFG.LOGO_ID;
    const blob = DriveApp.getFileById(logoId).getBlob();
    const contentType = blob.getContentType();
    const bytes = blob.getBytes();
    const base64 = Utilities.base64Encode(bytes);
    return "data:" + contentType + ";base64," + base64;
  } catch (e) {
    return "";
  }
}

function PgtPop_sanitizarNomeArquivo_(texto) {
  return String(texto || "ARQUIVO")
    .replace(/[\\\/:*?\"<>|]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 60);
}

function PgtPop_montarEnderecoDoc_(hospital) {
  const partes = [];
  if (hospital && hospital.logradouro) partes.push(hospital.logradouro);
  if (hospital && hospital.bairro) partes.push(hospital.bairro);

  let cidadeUf = "";
  if (hospital && hospital.cidade) cidadeUf += hospital.cidade;
  if (hospital && hospital.uf) cidadeUf += (cidadeUf ? "/" : "") + hospital.uf;
  if (cidadeUf) partes.push(cidadeUf);

  return partes.join(" - ");
}

/** "Nome — Cargo (Registro)", omitindo cargo/registro quando vazios (nunca imprime "()"). */
function PgtPop_formatarAssinatura_(pessoa) {
  var partes = [PgtPop_escaparHtml_(pessoa.nome || '—')];
  if (pessoa.cargo) partes.push('— ' + PgtPop_escaparHtml_(pessoa.cargo));
  if (pessoa.registro) partes.push('(' + PgtPop_escaparHtml_(pessoa.registro) + ')');
  return partes.join(' ');
}

/** Bloco de assinatura completo (rubrica SVG, quando a pessoa tiver uma cadastrada, + nome/cargo/registro). */
function PgtPop_montarBlocoAssinatura_(papel, pessoa) {
  var classe = 'assinatura-pop-item' + (pessoa && pessoa.imagemSvg ? ' com-assinatura' : '');
  var svg = (pessoa && pessoa.imagemSvg) ? ('<div class="assinatura-pop-svg">' + pessoa.imagemSvg + '</div>') : '';
  return '<div class="' + classe + '">' + svg + '<div class="assinatura-pop-linha"><div class="papel">' + PgtPop_escaparHtml_(papel) + '</div>' + PgtPop_formatarAssinatura_(pessoa || {}) + '</div></div>';
}

function PgtPop_escaparHtml_(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
