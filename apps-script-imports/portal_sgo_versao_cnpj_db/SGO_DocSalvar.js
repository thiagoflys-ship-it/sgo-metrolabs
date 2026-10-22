/****************************************************
 * SGO_DocSalvar — helper compartilhado (2026-10-16)
 *
 * Regra do dono: todo documento gerado existe em HTML A4 (imprimível)
 * E em PDF, salvos na pasta do cliente para consulta posterior.
 *
 * Funções:
 *  - SGO_DocSalvar_sanitizarNome_(nome)
 *  - SGO_DocSalvar_salvarHtml_(pasta, nomeBase, html, opcoes)
 *  - SGO_DocSalvar_salvarHtmlEPdf_(pasta, nomeBase, html, opcoes)
 *  - SGO_DocSalvar_htmlAoLado_(pasta, nomePdf, html, opcoes)   (nunca lança)
 *  - SGO_DocSalvar_pastaClienteEm_(raiz, cnpj, nomeCliente)
 *  - SGO_DocSalvar_salvarCertificadoEquipamento_(raiz|fnRaiz, dados, html)
 *  - SGO_DocSalvar_injetarAvisoTela_(html, aviso, tipo)
 *  - SGO_DocSalvar_salvarPdfPlanilha_(urlExport, payload, raiz|fnRaiz, rotulo, tz) (nunca lança)
 *
 * Nenhuma função devolve objeto Date: só strings.
 ****************************************************/

/** Remove caracteres proibidos em nome de arquivo (/ \ : * ? " < > |) e controles. */
function SGO_DocSalvar_sanitizarNome_(nome) {
  var s = String(nome == null ? '' : nome)
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length > 180) s = s.substring(0, 180).trim();
  return s || 'Documento';
}

/** Garante <meta charset="utf-8"> para o .html abrir com acentuação certa. */
function SGO_DocSalvar_garantirCharset_(html) {
  var h = String(html || '');
  if (/<meta[^>]+charset/i.test(h)) return h;
  if (/<head[^>]*>/i.test(h)) return h.replace(/<head[^>]*>/i, function (m) { return m + '<meta charset="utf-8">'; });
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body>' + h + '</body></html>';
}

function SGO_DocSalvar_tirarExtensao_(nome) {
  return String(nome || '').replace(/\.(pdf|html?)$/i, '');
}

function SGO_DocSalvar_compartilhar_(arquivo, opcoes) {
  if (!opcoes || !opcoes.compartilhar) return;
  try { arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
}

/** Grava só o .html (UTF-8). Lança erro em caso de falha. */
function SGO_DocSalvar_salvarHtml_(pasta, nomeBase, html, opcoes) {
  if (!pasta) throw new Error('Pasta de destino não informada.');
  var base = SGO_DocSalvar_sanitizarNome_(SGO_DocSalvar_tirarExtensao_(nomeBase));
  var blob = Utilities.newBlob('', MimeType.HTML, base + '.html');
  blob.setDataFromString(SGO_DocSalvar_garantirCharset_(html), 'UTF-8');
  blob.setContentType(MimeType.HTML);
  var arquivo = pasta.createFile(blob);
  SGO_DocSalvar_compartilhar_(arquivo, opcoes);
  return { htmlId: arquivo.getId(), htmlUrl: arquivo.getUrl(), htmlNome: arquivo.getName() };
}

/**
 * Grava nomeBase.html e nomeBase.pdf na pasta.
 * opcoes: { compartilhar: bool, pdfBlob: Blob (reaproveita PDF já gerado) }
 * Se o HTML tiver o sumário automático da SGO_DocA4 (data-sgo-sumario) e não
 * vier pdfBlob, a paginação é feita aqui (duas passagens) e o HTML gravado já
 * traz os números de página; ele volta em .html para a tela mostrar o mesmo.
 * Devolve { htmlId, htmlUrl, pdfId, pdfUrl, pdfNome, htmlNome, html }. Lança erro.
 */
function SGO_DocSalvar_salvarHtmlEPdf_(pasta, nomeBase, html, opcoes) {
  opcoes = opcoes || {};
  if (!pasta) throw new Error('Pasta de destino não informada.');
  var base = SGO_DocSalvar_sanitizarNome_(SGO_DocSalvar_tirarExtensao_(nomeBase));
  var conteudo = SGO_DocSalvar_garantirCharset_(html);
  var pdfBlob = opcoes.pdfBlob;
  // Documento com sumário automático (padrão A4 de 18/10/2026): números de página lidos do PDF.
  if (!pdfBlob && /data-sgo-sumario/.test(conteudo) && typeof SGO_DocA4_paginar_ === 'function') {
    var pag = SGO_DocA4_paginar_(conteudo, { nome: base });
    conteudo = SGO_DocSalvar_garantirCharset_(pag.html);
    pdfBlob = pag.pdfBlob;
  }
  if (!pdfBlob) {
    var origem = Utilities.newBlob('', MimeType.HTML, base + '.html');
    origem.setDataFromString(conteudo, 'UTF-8');
    origem.setContentType(MimeType.HTML);
    try {
      pdfBlob = origem.getAs(MimeType.PDF);
    } catch (err) {
      throw new Error('Falha ao converter o documento em PDF: ' + (err && err.message ? err.message : err));
    }
  }
  pdfBlob.setName(base + '.pdf');
  var pdf = pasta.createFile(pdfBlob);
  SGO_DocSalvar_compartilhar_(pdf, opcoes);
  var h = SGO_DocSalvar_salvarHtml_(pasta, base, conteudo, opcoes);
  return {
    htmlId: h.htmlId, htmlUrl: h.htmlUrl, htmlNome: h.htmlNome,
    pdfId: pdf.getId(), pdfUrl: pdf.getUrl(), pdfNome: pdf.getName(),
    html: conteudo
  };
}

/**
 * Acrescenta o .html ao lado de um PDF que o módulo já salvou. NUNCA lança:
 * o PDF já está salvo e o fluxo atual não pode quebrar por causa do .html.
 * Devolve { htmlId, htmlUrl } ou { htmlId:'', htmlUrl:'', avisoHtml }.
 */
function SGO_DocSalvar_htmlAoLado_(pasta, nomePdf, html, opcoes) {
  try {
    if (!html) throw new Error('conteúdo HTML vazio');
    var h = SGO_DocSalvar_salvarHtml_(pasta, nomePdf, html, opcoes);
    return { htmlId: h.htmlId, htmlUrl: h.htmlUrl };
  } catch (e) {
    return {
      htmlId: '', htmlUrl: '',
      avisoHtml: 'O PDF foi salvo, mas a cópia em HTML (A4) não foi gravada na pasta: ' + (e && e.message ? e.message : e) + '. O PDF continua válido.'
    };
  }
}

/** ID do arquivo do Drive a partir da URL (…/d/<id>/… ou ?id=<id>). */
function SGO_DocSalvar_idDaUrl_(url) {
  var u = String(url || '');
  // Formatos aceitos: Google (…/d/<id>/…, ?id=<id>) e servidor próprio (…/arquivos/<id>, absoluto ou relativo).
  var m = /\/d\/([A-Za-z0-9_-]{10,})/.exec(u) || /[?&]id=([A-Za-z0-9_-]{10,})/.exec(u) ||
    /(?:^|\/)arquivos\/([A-Za-z0-9_-]{10,})/.exec(u);
  return m ? m[1] : '';
}

/**
 * Envolve um apiSalvarDocumento(payload) que já grava o PDF a partir de
 * payload.html e devolve { ok, url, fileName }: depois do PDF salvo, grava
 * a cópia .html na MESMA pasta do PDF e acrescenta htmlId/htmlUrl (e
 * avisoHtml se falhar). Não muda o PDF nem os campos existentes.
 */
function SGO_DocSalvar_comCopiaHtml_(fnOriginal) {
  return function (payload) {
    var r = fnOriginal.apply(this, arguments);
    try {
      var html = payload && payload.html ? String(payload.html) : '';
      if (!r || !r.ok || !r.url || !html) return r;
      var id = SGO_DocSalvar_idDaUrl_(r.url);
      if (!id) throw new Error('não foi possível localizar a pasta do PDF');
      var pais = DriveApp.getFileById(id).getParents();
      if (!pais.hasNext()) throw new Error('o PDF salvo não está em nenhuma pasta');
      var h = SGO_DocSalvar_htmlAoLado_(pais.next(), r.fileName || 'Documento', html, { compartilhar: true });
      r.htmlId = h.htmlId;
      r.htmlUrl = h.htmlUrl;
      if (h.avisoHtml) r.avisoHtml = h.avisoHtml;
    } catch (e) {
      if (r && typeof r === 'object') {
        r.htmlId = ''; r.htmlUrl = '';
        r.avisoHtml = 'O PDF foi salvo, mas a cópia em HTML (A4) não foi gravada na pasta: ' + (e && e.message ? e.message : e) + '. O PDF continua válido.';
      }
    }
    return r;
  };
}

/** Dígitos do CNPJ (14) ou '' se não for um CNPJ completo. */
function SGO_DocSalvar_cnpjDigitos_(cnpj) {
  var d = String(cnpj || '').replace(/\D/g, '');
  return d.length === 14 ? d : '';
}

/**
 * Subpasta do cliente dentro de `raiz`. Prefere o CNPJ (14 dígitos, mesmo
 * padrão de PgtPop/RegOp); sem CNPJ, usa o nome do cliente. Cria se não existir.
 */
function SGO_DocSalvar_pastaClienteEm_(raiz, cnpj, nomeCliente) {
  if (!raiz) throw new Error('Pasta de laudos do módulo não encontrada.');
  var digitos = SGO_DocSalvar_cnpjDigitos_(cnpj);
  var nome = String(nomeCliente || '').trim();
  if (!digitos && !nome) throw new Error('cliente e CNPJ não informados no formulário');
  var nomePasta = digitos || SGO_DocSalvar_sanitizarNome_(nome);
  var it = raiz.getFoldersByName(nomePasta);
  if (it.hasNext()) return it.next();
  var nova = raiz.createFolder(nomePasta);
  if (digitos && nome) { try { nova.setDescription(nome.substring(0, 500)); } catch (e) {} }
  return nova;
}

/**
 * Salva HTML + PDF de um certificado de equipamento na pasta do cliente.
 * NUNCA lança: devolve { salvo, htmlId, htmlUrl, pdfId, pdfUrl, pastaUrl, avisoSalvar }.
 * obterRaiz: função que devolve a pasta de laudos do módulo (ou a própria pasta).
 * dados: { cnpj, cliente, nomeBase }
 */
function SGO_DocSalvar_salvarCertificadoEquipamento_(obterRaiz, dados, html) {
  dados = dados || {};
  try {
    var raiz = typeof obterRaiz === 'function' ? obterRaiz() : obterRaiz;
    // 20/10/2026: ensaio ligado ao cadastro → pasta do equipamento dentro da pasta do cliente
    // (<CNPJ>/<TAG - tipo>/Qualificação, SGO_QualifEquipamento.js); sem vínculo, a pasta do cliente como antes.
    var pasta = (dados.equipamento && typeof SGO_QEQ_pastaEquipamento_ === 'function')
      ? SGO_QEQ_pastaEquipamento_(raiz, dados.equipamento)
      : SGO_DocSalvar_pastaClienteEm_(raiz, dados.cnpj, dados.cliente);
    var r = SGO_DocSalvar_salvarHtmlEPdf_(pasta, dados.nomeBase || 'Certificado', html, dados.pdfBlob ? { pdfBlob: dados.pdfBlob } : {});
    return {
      salvo: true,
      htmlId: r.htmlId, htmlUrl: r.htmlUrl, pdfId: r.pdfId, pdfUrl: r.pdfUrl,
      pastaUrl: pasta.getUrl(), avisoSalvar: '', html: r.html
    };
  } catch (e) {
    return {
      salvo: false, htmlId: '', htmlUrl: '', pdfId: '', pdfUrl: '', pastaUrl: '',
      avisoSalvar: 'O documento foi gerado, mas não foi possível salvá-lo na pasta do cliente: ' +
        String(e && e.message ? e.message : e).replace(/[.\s]+$/, '') + '. Use Imprimir > Salvar como PDF.'
    };
  }
}

/**
 * Fecha a resposta de *_apiMontarCertificadoFinal (Autoclave, Lavadora, Cadeia
 * de Frio, Estufa/Banho): salva HTML + PDF na subpasta do cliente (CNPJ, ou nome)
 * dentro da pasta de laudos do módulo e devolve { ok, html, ...campos novos }.
 * O html devolvido ganha uma faixa só de tela (some ao imprimir) dizendo se
 * salvou e onde; o arquivo salvo fica sem a faixa. Nunca lança.
 */
function SGO_DocSalvar_finalizarCertificado_(html, payload, obterRaiz, rotulo, tz) {
  payload = payload || {};
  var resultado;
  // 21/10/2026: relatório de ensaio ou planilha de dados que é revisão: histórico de revisões no documento (SGO_DocRevisao.js).
  if (typeof SGO_DocRev_ensaioAntes_ === 'function') html = SGO_DocRev_ensaioAntes_(html, rotulo, payload);
  // Sumário com os números de página (padrão A4 de 18/10/2026). O mesmo HTML vai
  // para a tela e para a pasta; o PDF da 2ª passagem é o que fica gravado.
  var pdfPaginado = null;
  if (/data-sgo-sumario/.test(String(html || '')) && typeof SGO_DocA4_paginar_ === 'function') {
    var pag = SGO_DocA4_paginar_(html, { nome: rotulo || 'Documento' });
    html = pag.html;
    pdfPaginado = pag.pdfBlob;
  }
  if (payload.modoRelatorioSimulado) {
    resultado = {
      salvo: false, htmlId: '', htmlUrl: '', pdfId: '', pdfUrl: '', pastaUrl: '',
      avisoSalvar: 'Relatório SIMULADO (uso interno): não foi salvo na pasta do cliente. Se precisar do arquivo, use Imprimir > Salvar como PDF.'
    };
  } else {
    var carimbo = '';
    try { carimbo = Utilities.formatDate(new Date(), tz || Session.getScriptTimeZone() || 'America/Sao_Paulo', 'yyyy-MM-dd HHmm'); } catch (e) {}
    var tag = String(payload.tag || payload.tagEquipamento || '').trim() || 'sem-tag';
    var numero = String(payload.certNumero || '').trim();
    var nomeBase = [rotulo || 'Certificado', numero, tag, carimbo].filter(function (p) { return !!p; }).join(' - ');
    resultado = SGO_DocSalvar_salvarCertificadoEquipamento_(obterRaiz, {
      cnpj: payload.cnpj, cliente: payload.cliente, nomeBase: nomeBase, pdfBlob: pdfPaginado,
      equipamento: payload.equipamentoId ? { cnpj: payload.cnpj, cliente: payload.cliente, tag: tag === 'sem-tag' ? '' : tag, tipo: payload.tipoEquipamento || 'Equipamento' } : null
    }, html);
  }
  return {
    ok: true,
    html: SGO_DocSalvar_injetarAvisoTela_(html, resultado),
    salvoNaPasta: !!resultado.salvo,
    htmlId: resultado.htmlId, htmlUrl: resultado.htmlUrl,
    pdfId: resultado.pdfId, pdfUrl: resultado.pdfUrl,
    pastaUrl: resultado.pastaUrl,
    avisoSalvar: resultado.avisoSalvar
  };
}

/**
 * Relatório de dados (planilha de auditoria em PDF A4 paisagem) da Autoclave,
 * Lavadora, Cadeia de Frio e Estufa/Banho: grava o PDF exportado da planilha
 * na subpasta do cliente (CNPJ, ou nome) dentro da pasta de laudos do módulo,
 * com o nome padrão "<rótulo> - <número> - <TAG> - <aaaa-MM-dd HHmm>.pdf".
 * A planilha não tem versão HTML: só o PDF é gravado. O PDF vem do link de
 * exportação (no Google, com o token do script; no servidor próprio, o mesmo
 * link é desenhado localmente). Relatório simulado (uso interno) não é gravado.
 * NUNCA lança: devolve { salvoNaPasta, pdfId, pdfSalvoUrl, pdfNome, pastaUrl, avisoSalvar }.
 */
function SGO_DocSalvar_salvarPdfPlanilha_(urlExportPdf, payload, obterRaiz, rotulo, tz) {
  payload = payload || {};
  var vazio = { salvoNaPasta: false, pdfId: '', pdfSalvoUrl: '', pdfNome: '', pastaUrl: '', avisoSalvar: '' };
  if (payload.modoRelatorioSimulado) {
    vazio.avisoSalvar = 'Relatório SIMULADO (uso interno): o PDF da planilha não foi salvo na pasta do cliente.';
    return vazio;
  }
  try {
    if (!urlExportPdf) throw new Error('link de exportação da planilha não informado');
    var blob = null, codigo = 0;
    for (var tentativa = 0; tentativa < 2 && !blob; tentativa++) {
      if (tentativa) { try { Utilities.sleep(1500); } catch (e0) {} }
      var resp = UrlFetchApp.fetch(String(urlExportPdf), {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });
      codigo = resp.getResponseCode();
      var b = resp.getBlob();
      if (codigo === 200 && /pdf/i.test(String(b.getContentType() || ''))) blob = b;
    }
    if (!blob) throw new Error('a exportação da planilha em PDF respondeu com o código ' + codigo);
    var raiz = typeof obterRaiz === 'function' ? obterRaiz() : obterRaiz;
    var pasta = SGO_DocSalvar_pastaClienteEm_(raiz, payload.cnpj, payload.cliente);
    var carimbo = '';
    try { carimbo = Utilities.formatDate(new Date(), tz || Session.getScriptTimeZone() || 'America/Sao_Paulo', 'yyyy-MM-dd HHmm'); } catch (e1) {}
    var tag = String(payload.tag || payload.tagEquipamento || '').trim() || 'sem-tag';
    var numero = String(payload.certNumero || '').trim();
    var base = SGO_DocSalvar_sanitizarNome_([rotulo || 'Relatório de dados', numero, tag, carimbo].filter(function (p) { return !!p; }).join(' - '));
    blob.setName(base + '.pdf');
    var pdf = pasta.createFile(blob);
    return {
      salvoNaPasta: true, pdfId: pdf.getId(), pdfSalvoUrl: pdf.getUrl(), pdfNome: pdf.getName(),
      pastaUrl: pasta.getUrl(), avisoSalvar: ''
    };
  } catch (e) {
    vazio.avisoSalvar = 'A planilha foi gerada, mas o PDF não foi salvo na pasta do cliente: ' +
      String(e && e.message ? e.message : e).replace(/[.\s]+$/, '') + '. Baixe o PDF pelo botão desta tela e guarde o arquivo.';
    return vazio;
  }
}

/** Pasta raiz persistente (ID em Script Property), criada no Drive se faltar. */
function SGO_DocSalvar_pastaPersistente_(propKey, nomePasta, idConfigurado) {
  var id = String(idConfigurado || '').trim();
  // 20/10/2026: a pasta fixa da configuração pode ser do Google Drive antigo e não existir
  // no servidor; nesse caso usa a pasta própria do módulo (antes o documento não era salvo).
  if (id.length > 10) { try { return DriveApp.getFolderById(id); } catch (e0) { /* segue para a pasta própria */ } }
  var props = PropertiesService.getScriptProperties();
  var salvo = props.getProperty(propKey);
  if (salvo) { try { return DriveApp.getFolderById(salvo); } catch (e) {} }
  var pasta = DriveApp.getRootFolder().createFolder(nomePasta);
  props.setProperty(propKey, pasta.getId());
  return pasta;
}

function SGO_DocSalvar_esc_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * "Enviar ao cliente" na faixa de tela (20/10/2026, SGO_EnviarDoc.js): o documento costuma abrir em outra aba;
 * o link pede à aba do SGO+ que abriu esta para mostrar a janela "Enviar documento" e, sem ela, abre o SGO+
 * com ?enviarDoc=<id>. Nunca lança (sem endereço do sistema, a faixa fica como era).
 */
function SGO_DocSalvar_linkEnviar_(pdfId) {
  var id = String(pdfId || '').trim();
  if (!/^[A-Za-z0-9_-]{6,}$/.test(id)) return '';
  var base = '';
  try { base = String(ScriptApp.getService().getUrl() || ''); } catch (e) { base = ''; }
  base = base.replace(/[?#].*$/, '');
  if (/^https?:\/\/[^\/]+$/i.test(base)) base += '/';
  var href = (base || '/') + '?enviarDoc=' + encodeURIComponent(id);
  var js = "try{var o=window.opener;if(o&&o.SGO_EnviarDoc_abrirDeOutraAba&&o.SGO_EnviarDoc_abrirDeOutraAba('" + id + "')){try{o.focus()}catch(x){}alert('A janela Enviar documento abriu na aba do SGO+ de onde este documento veio. Volte para aquela aba para escolher os destinatários.');return false}}catch(e){}return true";
  return ' · <a href="' + SGO_DocSalvar_esc_(href) + '" target="_blank" rel="opener" onclick="' + SGO_DocSalvar_esc_(js) + '">Enviar ao cliente (e-mail ou WhatsApp)</a>';
}

/**
 * Faixa SÓ DE TELA (some na impressão) no topo do HTML devolvido ao navegador,
 * para o operador saber se o documento foi salvo e onde. Não altera o arquivo salvo.
 */
function SGO_DocSalvar_injetarAvisoTela_(html, resultado) {
  var h = String(html || '');
  resultado = resultado || {};
  var faixa;
  if (resultado.salvo) {
    faixa = '<div class="sgo-docsalvar-aviso" data-sgo-sem-enviar="1" style="font:13px Arial,sans-serif;background:#e8f5e9;color:#1b5e20;border:1px solid #a5d6a7;padding:8px 12px;margin:0 0 8px">' +
      'Documento salvo na pasta do cliente (PDF e HTML A4). ' +
      (resultado.pdfUrl ? '<a href="' + SGO_DocSalvar_esc_(resultado.pdfUrl) + '" target="_blank" rel="noopener">Abrir PDF</a> · ' : '') +
      (resultado.pastaUrl ? '<a href="' + SGO_DocSalvar_esc_(resultado.pastaUrl) + '" target="_blank" rel="noopener">Abrir pasta do cliente</a>' : '') +
      SGO_DocSalvar_linkEnviar_(resultado.pdfId) +
      '</div>';
  } else {
    faixa = '<div class="sgo-docsalvar-aviso" style="font:13px Arial,sans-serif;background:#fff3e0;color:#8a4b00;border:1px solid #ffb74d;padding:8px 12px;margin:0 0 8px">' +
      SGO_DocSalvar_esc_(resultado.avisoSalvar || 'O documento foi gerado, mas não foi salvo na pasta do cliente. Use Imprimir > Salvar como PDF.') +
      '</div>';
  }
  var css = '<style>@media print{.sgo-docsalvar-aviso{display:none!important}}</style>';
  if (/<body[^>]*>/i.test(h)) return h.replace(/<body[^>]*>/i, function (m) { return m + css + faixa; });
  return css + faixa + h;
}

/**
 * Rascunho dos certificados de equipamento (Autoclave, Lavadora, Cadeia de
 * Frio, Estufa/Banho): roda a redação por IA; se a IA não estiver disponível
 * (chave não cadastrada, limite de uso, serviço fora), devolve os textos
 * vazios e um aviso, para o técnico escrever à mão e emitir normalmente.
 * Os cálculos e o veredito não dependem da IA. Nunca lança.
 */
function SGO_DocSalvar_textosIaOuManual_(fnIA, contexto) {
  try {
    return { textos: fnIA(contexto) || {}, avisoIA: '' };
  } catch (e) {
    var motivo = String(e && e.message ? e.message : e).replace(/[.\s]+$/, '');
    return {
      textos: { introducao: '', objetivo: '', conclusaoGeral: '', conclusaoLeigo: '', analisePorEstudo: {} },
      avisoIA: 'O rascunho foi preparado sem a redação automática (' + motivo + '). Os resultados e o veredito abaixo já estão calculados; ' +
        'escreva a análise e as conclusões nos campos e emita normalmente.'
    };
  }
}

/** Impressão digital (SHA-256 hex) dos fatos do certificado: o texto revisado só é emitido sobre os mesmos dados do rascunho. */
function SGO_DocSalvar_assinatura_(valor) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(valor), Utilities.Charset.UTF_8);
  return digest.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}

/**
 * Validação comum da emissão final: rascunho gerado sobre os mesmos dados e
 * textos obrigatórios preenchidos. campos: nomes dos textos exigidos.
 */
function SGO_DocSalvar_validarEmissao_(payload, contexto, campos) {
  if (!payload.assinaturaContextoCertificado || payload.assinaturaContextoCertificado !== SGO_DocSalvar_assinatura_(contexto)) {
    throw new Error('Os dados ou critérios mudaram desde o rascunho, ou o rascunho não foi gerado. Clique em Gerar Rascunho de novo, revise os textos e emita.');
  }
  var textos = payload.textosCertificado || {};
  var faltaCampo = (campos || []).some(function (c) { return !String(textos[c] || '').trim(); });
  var faltaEstudo = (contexto.estudos || []).some(function (e) { return !String((textos.analisePorEstudo || {})[e.tipoEstudo] || '').trim(); });
  if (faltaCampo || faltaEstudo) {
    throw new Error('A interpretação está incompleta. Preencha a análise de cada estudo e as conclusões antes de emitir.');
  }
}

/** Texto de duração legível (s ou min, pt-BR). */
function SGO_DocSalvar_duracao_(min) {
  var n = Number(min);
  if (!isFinite(n)) return String(min);
  return n < 1 ? SGO_DocSalvar_num_(n * 60, n * 60 < 10 ? 1 : 0) + ' s' : SGO_DocSalvar_num_(n, n < 10 ? 1 : 0) + ' min';
}

/** Mensagem dos parsers quando o intervalo típico entre leituras sai da faixa aceita. */
function SGO_DocSalvar_msgIntervalo_(medianoMin, minMin, maxMin) {
  return 'O intervalo típico entre leituras do arquivo é de ' + SGO_DocSalvar_duracao_(medianoMin) +
    ', fora da faixa aceita pelo sistema (de ' + SGO_DocSalvar_duracao_(minMin) + ' a ' + SGO_DocSalvar_duracao_(maxMin) + '). ' +
    'Confira se o arquivo é o do datalogger certo e se a coluna de hora foi lida corretamente (veja a prévia); se o datalogger foi programado com outro intervalo, ' +
    'exporte os dados com intervalo dentro da faixa ou peça ao administrador para ajustar a configuração do módulo.';
}

/** Mensagem única para a chave da IA ausente/recusada (aponta para a tela Chaves e senhas). */
function SGO_DocSalvar_msgChaveIA_(codigo) {
  if (codigo) return 'a chave da IA foi recusada pelo serviço (HTTP ' + codigo + '); peça ao administrador para conferi-la em Chaves e senhas';
  return 'a chave da IA (GEMINI_API_KEY) não está cadastrada; peça ao administrador para cadastrá-la em Chaves e senhas';
}

/** Formatação numérica pt-BR (fallback local se SGO_DocA4_num_ não existir). */
function SGO_DocSalvar_num_(valor, casas) {
  var n;
  if (typeof valor === 'number') {
    n = valor;
  } else {
    var s = String(valor == null ? '' : valor).trim().replace(/\s/g, '');
    if (!s) return String(valor == null ? '' : valor);
    // Com vírgula: formato pt-BR (ponto = milhar). Sem vírgula: ponto = decimal.
    n = s.indexOf(',') >= 0 ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s);
  }
  if (!isFinite(n)) return String(valor);
  var c = (casas === undefined || casas === null) ? 2 : casas;
  if (typeof SGO_DocA4_num_ === 'function') {
    try { var viaA4 = SGO_DocA4_num_(n, c); if (viaA4 !== undefined && viaA4 !== null && viaA4 !== '') return String(viaA4); } catch (e) {}
  }
  var neg = n < 0;
  var partes = Math.abs(n).toFixed(c).split('.');
  var inteiro = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  var r = inteiro + (partes[1] ? ',' + partes[1] : '');
  if (neg && /[1-9]/.test(r)) r = '-' + r;
  return r;
}
