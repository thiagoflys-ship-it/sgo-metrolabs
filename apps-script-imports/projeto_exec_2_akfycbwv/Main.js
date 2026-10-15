/****************************************************
 * METROLABS — GERADOR DE RELATÓRIOS
 * ARQUIVO: Main.gs
 ****************************************************/

function doGet() {
  const tpl = HtmlService.createTemplateFromFile('Index');
  tpl.publicConfigJson = JSON.stringify(getPublicConfig_());

  return tpl
    .evaluate()
    .setTitle(CONFIG.APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function gerarRelatorio(payload) {
  try {
    const resultado = gerarDocumento_(payload);

    return {
      ok: true,
      tipo: resultado.tipo,
      nomeArquivo: resultado.nomeArquivo,
      docUrl: resultado.docUrl,
      pdfUrl: resultado.pdfUrl,
      folderUrl: resultado.folderUrl
    };
  } catch (e) {
    return {
      ok: false,
      erro: e && e.message ? e.message : String(e)
    };
  }
}

function obterConfigPublica() {
  return getPublicConfig_();
}

/****************************************************
 * PILOTO — Proxy JSON para integração nativa no Portal
 * SGO+ CNPJ/DB (sem iframe). Roteador simples: apenas
 * repassa para as funções já existentes acima, sem
 * alterar Docs.js, Config.js, Utils.js ou Index.html.
 ****************************************************/
function doPost(e) {
  let resultado;

  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = body.action;

    if (action === 'gerarRelatorio') {
      resultado = gerarRelatorio(body.payload);
    } else if (action === 'obterPlaceholdersTemplate') {
      resultado = obterPlaceholdersTemplate(body.tipo);
    } else if (action === 'obterConfigPublica') {
      resultado = obterConfigPublica();
    } else {
      resultado = { ok: false, erro: 'Ação desconhecida: ' + action };
    }
  } catch (err) {
    resultado = {
      ok: false,
      erro: err && err.message ? err.message : String(err)
    };
  }

  return ContentService.createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);
}

function obterPlaceholdersTemplate(tipo) {
  try {
    return {
      ok: true,
      tipo: upperSeguro_(tipo),
      placeholders: listarPlaceholdersTemplate(tipo)
    };
  } catch (e) {
    return {
      ok: false,
      tipo: upperSeguro_(tipo),
      erro: e && e.message ? e.message : String(e),
      placeholders: []
    };
  }
}

function autorizarConsultaCnpj() {
  return buscarCnpjBackend('32487278000121');
}

function buscarCnpjBackend(cnpj) {
  try {
    const cnpjLimpo = String(cnpj || '').replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) return { ok: false, mensagem: 'CNPJ inválido. Informe os 14 dígitos.' };
    // Várias bases públicas com reserva + cache (SGO_CnpjConsulta.js);
    // a base antiga (consultarSpeedioCnpj_) fica como última reserva.
    const brasil = consultarBrasilApiCnpj_(cnpjLimpo);
    if (brasil.ok || brasil.invalido) return brasil;
    const speedio = consultarSpeedioCnpj_(cnpjLimpo);
    if (speedio.ok) return speedio;
    return { ok: false, mensagem: brasil.mensagem || 'Nenhuma base pública conseguiu localizar este CNPJ automaticamente.' };
  } catch (e) {
    return { ok: false, mensagem: 'Erro ao consultar CNPJ: ' + (e && e.message ? e.message : e) };
  }
}

// Nome mantido por compatibilidade; agora usa a consulta com reserva entre
// várias bases públicas (SGO_CNPJ_consultarDados_, formato BrasilAPI).
function consultarBrasilApiCnpj_(cnpjLimpo) {
  try {
    try { SGO_CNPJ_validar_(cnpjLimpo); } catch (eValida) { return { ok: false, invalido: true, mensagem: SGO_CNPJ_mensagemErro_(eValida) }; }
    const json = SGO_CNPJ_consultarDados_(cnpjLimpo);
    return { ok: true, fonte: 'consulta pública', cnpj: cnpjLimpo, razaoSocial: formatarRazaoSocialLav_(json.razao_social), nome: formatarRazaoSocialLav_(json.razao_social), nomeFantasia: formatarTextoLav_(json.nome_fantasia || ''), logradouro: [formatarTextoLav_(json.descricao_tipo_de_logradouro || ''), formatarTextoLav_(json.logradouro || '')].filter(Boolean).join(' '), numero: textoSeguro_(json.numero || ''), bairro: formatarTextoLav_(json.bairro || ''), cidade: formatarTextoLav_(json.municipio || ''), uf: textoSeguro_(json.uf || '').toUpperCase(), cep: textoSeguro_(json.cep || ''), email: textoSeguro_(json.email || ''), telefone: textoSeguro_(json.ddd_telefone_1 || json.ddd_telefone_2 || '') };
  } catch (e) {
    return { ok: false, mensagem: SGO_CNPJ_mensagemErro_(e) };
  }
}

function consultarSpeedioCnpj_(cnpjLimpo) {
  try {
    const resp = UrlFetchApp.fetch('https://api-publica.speedio.com.br/buscarcnpj?cnpj=' + encodeURIComponent(cnpjLimpo), { method: 'get', muteHttpExceptions: true, followRedirects: true, headers: { Accept: 'application/json' } });
    if (resp.getResponseCode() < 200 || resp.getResponseCode() >= 300) return { ok: false, mensagem: 'Speedio indisponível.' };
    const json = JSON.parse(resp.getContentText() || '{}');
    if (!json || !json.RAZAO_SOCIAL) return { ok: false, mensagem: 'Speedio sem dados válidos.' };
    return { ok: true, fonte: 'Speedio', cnpj: cnpjLimpo, razaoSocial: formatarRazaoSocialLav_(json.RAZAO_SOCIAL), nome: formatarRazaoSocialLav_(json.RAZAO_SOCIAL), nomeFantasia: formatarTextoLav_(json.NOME_FANTASIA || ''), logradouro: formatarTextoLav_(json.LOGRADOURO || ''), numero: textoSeguro_(json.NUMERO || ''), bairro: formatarTextoLav_(json.BAIRRO || ''), cidade: formatarTextoLav_(json.MUNICIPIO || ''), uf: textoSeguro_(json.UF || '').toUpperCase(), cep: textoSeguro_(json.CEP || ''), email: textoSeguro_(json.EMAIL || ''), telefone: textoSeguro_(json.TELEFONE || '') };
  } catch (e) {
    return { ok: false, mensagem: 'Falha Speedio: ' + (e && e.message ? e.message : e) };
  }
}

function formatarRazaoSocialLav_(valor) {
  return textoSeguro_(valor).toUpperCase();
}

function formatarTextoLav_(valor) {
  const texto = textoSeguro_(valor).toLowerCase();
  if (!texto) return '';
  return texto.split(/\s+/).map(function(p) { return p ? p.charAt(0).toUpperCase() + p.slice(1) : ''; }).join(' ');
}
