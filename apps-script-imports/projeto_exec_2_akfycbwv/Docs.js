/****************************************************
 * METROLABS — GERADOR DE RELATÓRIOS
 * ARQUIVO: Docs.gs
 ****************************************************/

function gerarDocumento_(payload) {
  const dados = normalizarPayload_(payload);
  const erros = validarPayload_(dados);

  if (erros.length) {
    throw new Error(erros.join(' '));
  }

  const modulo = getModuloConfig_(dados.tipo);
  const nomeArquivo = modulo.nomeArquivo(dados);

  const pastaSaida = DriveApp.getFolderById(modulo.outputFolderId);
  const arquivoTemplate = DriveApp.getFileById(modulo.templateId);

  const copiaTemplate = arquivoTemplate.makeCopy(nomeArquivo, pastaSaida);
  const docId = copiaTemplate.getId();

  const doc = DocumentApp.openById(docId);
  const body = doc.getBody();

  const mapa = montarMapaPlaceholders_(dados);
  replaceAllInBody_(body, mapa);

  doc.saveAndClose();

  const pdfBlob = blobToPdf_(copiaTemplate).setName(nomeArquivo + '.pdf');
  const pdfFile = pastaSaida.createFile(pdfBlob);

  return {
    ok: true,
    tipo: dados.tipo,
    nomeArquivo: nomeArquivo,
    docId: docId,
    pdfId: pdfFile.getId(),
    docUrl: copiaTemplate.getUrl(),
    pdfUrl: pdfFile.getUrl(),
    folderUrl: pastaSaida.getUrl()
  };
}

function listarPlaceholdersTemplate(tipo) {
  const modulo = getModuloConfig_(tipo);
  const arquivoTemplate = DriveApp.getFileById(modulo.templateId);
  const doc = DocumentApp.openById(arquivoTemplate.getId());
  const texto = doc.getBody().getText();

  const matches = texto.match(/\{\{[^}]+\}\}/g) || [];
  const unicos = {};

  matches.forEach(function(item) {
    unicos[item] = true;
  });

  return Object.keys(unicos).sort();
}