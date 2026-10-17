/**
 * Inventário de Equipamentos — porte adaptado de SGO_Inventario.js (portal
 * principal, raiz do repo). v1 enxuta: só cruza CAD_CLIENTES/CAD_UNIDADES/
 * CAD_EQUIPAMENTOS/DOC_DOCUMENTOS, que já existem aqui com os mesmos nomes
 * de campo (conferido campo a campo antes de escrever este arquivo).
 *
 * Fora do escopo desta v1 (dependências que não existem no Portal CNPJ):
 * REG_TECNICO, CAD_PECAS, OS_ORDENS/OS_MATERIAIS (Custo Acumulado/OS Ativa),
 * SGO_VALIDACAO (QR + link público de autenticidade), TIPO_POSSE/PROPRIETARIO/
 * RISCO/CLASSE_ANVISA (não existem em CAD_EQUIPAMENTOS aqui).
 */
const SGO_INVENTARIO = (() => {
  const SHEET_EQP = SGO_CFG.SHEETS.CAD_EQUIPAMENTOS;
  const SHEET_CLI = SGO_CFG.SHEETS.CAD_CLIENTES;
  const SHEET_UNI = SGO_CFG.SHEETS.CAD_UNIDADES;
  const SHEET_DOC = SGO_CFG.SHEETS.DOC_DOCUMENTOS;
  const STATUS_ATIVO = SGO_CFG.STATUS.ATIVO;

  function parseData_(venc) {
    if (!venc) return null;
    const s = String(venc).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const d = new Date(s.substring(0, 10) + "T00:00:00");
      return isNaN(d.getTime()) ? null : d;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const p = s.split("/");
      const d = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatarDataBR_(venc) {
    const d = parseData_(venc);
    if (!d) return "";
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const ano = d.getFullYear();
    return dia + "/" + mes + "/" + ano;
  }

  function calcStatusDoc_(doc) {
    if (!doc) return { status: "SEM_DOC", label: "Sem documento", vencimento: null, diasRestantes: null };

    const link = SGO_UTILS.safe(doc.LINK_ARQUIVO);
    const nome = SGO_UTILS.safe(doc.NOME_ARQUIVO);
    const venc = doc.DATA_VENCIMENTO;

    if (!venc) return { status: "SEM_VENCIMENTO", label: "Sem data de vencimento", vencimento: null, diasRestantes: null, link, nome };

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataVenc = parseData_(venc);
    if (!dataVenc) return { status: "SEM_VENCIMENTO", label: "Data inválida", vencimento: null, diasRestantes: null, link, nome };

    const diasRestantes = Math.ceil((dataVenc - hoje) / 86400000);
    const dtBR = formatarDataBR_(venc);

    let status, label;
    if (diasRestantes < 0) { status = "VENCIDO"; label = "Vencido em " + dtBR; }
    else if (diasRestantes === 0) { status = "VENCIDO"; label = "Vence hoje"; }
    else if (diasRestantes <= 30) { status = "VENCENDO"; label = "Vence em " + diasRestantes + "d (" + dtBR + ")"; }
    else { status = "OK"; label = "OK até " + dtBR; }

    return { status, label, vencimento: venc, diasRestantes, link, nome };
  }

  function melhorDoc_(docs) {
    if (!docs || !docs.length) return null;
    return docs.sort((a, b) => {
      const da = parseData_(a.DATA_VENCIMENTO);
      const db = parseData_(b.DATA_VENCIMENTO);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db - da;
    })[0];
  }

  function gerarInventario(sessionId, filtros) {
    const sessao = exigirSessao(sessionId);
    filtros = Object.assign({}, filtros || {});
    // Perfil Cliente: o filtro de cliente é sempre o da própria sessão (antes,
    // pedir outro clienteId devolvia o contato/e-mail/telefone de outra empresa).
    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") filtros.clienteId = SGO_UTILS.safe(sessao.clienteId);

    let equipamentos = SGO_DATA.getAll(SHEET_EQP);
    const clientes = SGO_DATA.getAll(SHEET_CLI);
    const unidades = SGO_DATA.getAll(SHEET_UNI);
    const documentos = SGO_DATA.getAll(SHEET_DOC).filter(d => SGO_UTILS.safeUpper(sessao.perfil) !== "CLIENTE" || SGO_UTILS.safe(d.CLIENTE_ID) === SGO_UTILS.safe(sessao.clienteId));

    if (SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE") {
      const cId = SGO_UTILS.safe(sessao.clienteId);
      equipamentos = equipamentos.filter(e => SGO_UTILS.safe(e.CLIENTE_ID) === cId);
    }

    if (filtros.clienteId) {
      const f = SGO_UTILS.safe(filtros.clienteId);
      equipamentos = equipamentos.filter(e => SGO_UTILS.safe(e.CLIENTE_ID) === f);
    }
    if (filtros.unidadeId) {
      const f = SGO_UTILS.safe(filtros.unidadeId);
      equipamentos = equipamentos.filter(e => SGO_UTILS.safe(e.UNIDADE_ID) === f);
    }
    if (filtros.status) {
      const f = SGO_UTILS.safeUpper(filtros.status);
      equipamentos = equipamentos.filter(e => SGO_UTILS.safeUpper(e.STATUS) === f);
    }

    const mapaClientes = {};
    clientes.forEach(c => { mapaClientes[SGO_UTILS.safe(c.ID)] = c; });
    const mapaUnidades = {};
    unidades.forEach(u => { mapaUnidades[SGO_UTILS.safe(u.ID)] = u; });

    const mapaDocsEquip = {};
    documentos.forEach(d => {
      if (SGO_UTILS.safeUpper(d.STATUS) !== STATUS_ATIVO) return;
      const eId = SGO_UTILS.safe(d.EQUIPAMENTO_ID);
      if (!eId) return;
      if (!mapaDocsEquip[eId]) mapaDocsEquip[eId] = [];
      mapaDocsEquip[eId].push(d);
    });

    const itens = equipamentos.map((e) => {
      const cliente = mapaClientes[SGO_UTILS.safe(e.CLIENTE_ID)] || {};
      const unidade = mapaUnidades[SGO_UTILS.safe(e.UNIDADE_ID)] || {};
      const docsEquip = mapaDocsEquip[SGO_UTILS.safe(e.ID)] || [];

      const docsCal = docsEquip.filter(d => SGO_UTILS.safeLower(d.TIPO_DOCUMENTO || "").includes("calibra"));
      const docsQual = docsEquip.filter(d => SGO_UTILS.safeLower(d.TIPO_DOCUMENTO || "").includes("qualifica"));

      return {
        ID: SGO_UTILS.safe(e.ID),
        TAG: SGO_UTILS.safe(e.TAG),
        TIPO: SGO_UTILS.safe(e.TIPO),
        FABRICANTE: SGO_UTILS.safe(e.FABRICANTE),
        MODELO: SGO_UTILS.safe(e.MODELO),
        SERIE: SGO_UTILS.safe(e.SERIE),
        SETOR: SGO_UTILS.safe(e.SETOR),
        STATUS: SGO_UTILS.safe(e.STATUS),
        CLIENTE_ID: SGO_UTILS.safe(e.CLIENTE_ID),
        CLIENTE_NOME: SGO_UTILS.safe(cliente.NOME_FANTASIA || cliente.RAZAO_SOCIAL || ""),
        UNIDADE_ID: SGO_UTILS.safe(e.UNIDADE_ID),
        UNIDADE_NOME: SGO_UTILS.safe(unidade.NOME_UNIDADE || ""),
        UNIDADE_CIDADE: SGO_UTILS.safe(unidade.CIDADE || ""),
        UNIDADE_UF: SGO_UTILS.safe(unidade.UF || ""),
        CALIBRACAO: calcStatusDoc_(melhorDoc_(docsCal)),
        QUALIFICACAO: calcStatusDoc_(melhorDoc_(docsQual)),
        TOTAL_DOCS: docsEquip.length
      };
    });

    itens.sort((a, b) => a.TAG.localeCompare(b.TAG));
    itens.forEach((item, idx) => { item.IDX = idx + 1; });

    const total = itens.length;
    const calibOk = itens.filter(i => i.CALIBRACAO.status === "OK").length;
    const qualOk = itens.filter(i => i.QUALIFICACAO.status === "OK").length;
    const vencendo = itens.filter(i => i.CALIBRACAO.status === "VENCENDO" || i.QUALIFICACAO.status === "VENCENDO").length;
    const vencidos = itens.filter(i => i.CALIBRACAO.status === "VENCIDO" || i.QUALIFICACAO.status === "VENCIDO").length;
    const semDoc = itens.filter(i => i.CALIBRACAO.status === "SEM_DOC" && i.QUALIFICACAO.status === "SEM_DOC").length;

    const clienteRaw = filtros.clienteId ? (mapaClientes[SGO_UTILS.safe(filtros.clienteId)] || null) : null;
    const clienteInfo = clienteRaw ? {
      ID: SGO_UTILS.safe(clienteRaw.ID),
      RAZAO_SOCIAL: SGO_UTILS.safe(clienteRaw.RAZAO_SOCIAL),
      NOME_FANTASIA: SGO_UTILS.safe(clienteRaw.NOME_FANTASIA),
      CNPJ: SGO_UTILS.safe(clienteRaw.CNPJ),
      ENDERECO: SGO_UTILS.safe(clienteRaw.ENDERECO),
      EMAIL: SGO_UTILS.safe(clienteRaw.EMAIL),
      TELEFONE: SGO_UTILS.safe(clienteRaw.TELEFONE),
      CONTATO: SGO_UTILS.safe(clienteRaw.CONTATO)
    } : null;
    const unidadeInfo = filtros.unidadeId ? (mapaUnidades[SGO_UTILS.safe(filtros.unidadeId)] || null) : null;

    SGO_DATA.log("INVENTARIO_GERAR", sessao.usuario, "Inventário gerado. Total=" + total, "INVENTARIO");

    return {
      success: true,
      geradoEm: SGO_UTILS.nowIso(),
      geradoPor: SGO_UTILS.safe(sessao.nome || sessao.usuario),
      clienteInfo,
      unidadeInfo,
      indicadores: {
        total,
        calibOk, calibPct: total > 0 ? Math.round((calibOk / total) * 100) : 0,
        qualOk, qualPct: total > 0 ? Math.round((qualOk / total) * 100) : 0,
        vencendo,
        vencidos,
        semDoc
      },
      itens,
      filtros
    };
  }

  function listarClientesAtivos(sessionId) {
    const sessao = exigirSessao(sessionId);
    const ehCliente = SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE";
    const itens = SGO_DATA.getAll(SHEET_CLI)
      .filter(c => SGO_UTILS.safeUpper(c.STATUS) === STATUS_ATIVO && (!ehCliente || SGO_UTILS.safe(c.ID) === SGO_UTILS.safe(sessao.clienteId)))
      .map(c => ({ ID: SGO_UTILS.safe(c.ID), NOME: SGO_UTILS.safe(c.NOME_FANTASIA || c.RAZAO_SOCIAL), CNPJ: SGO_UTILS.safe(c.CNPJ) }))
      .sort((a, b) => a.NOME.localeCompare(b.NOME));
    return { success: true, items: itens };
  }

  function listarUnidadesAtivasPorCliente(sessionId, clienteId) {
    return SGO_VINCULOS.units(sessionId, clienteId);
}

  // =========================
  // PERSISTÊNCIA NO DRIVE — mesmo padrão do Relatório de Calibração
  // (SGO_RelCal_Main.js): HTML -> Blob -> getAs(PDF), pasta por cliente.
  // =========================
  const INV_DOCS_FOLDER_PROP = "INVENTARIO_DOCUMENTOS_FOLDER_ID";

  function INV_obterPastaDocumentos_() {
    const props = PropertiesService.getScriptProperties();
    const idSalvo = props.getProperty(INV_DOCS_FOLDER_PROP);
    if (idSalvo) {
      try { return DriveApp.getFolderById(idSalvo); } catch (e) { /* pasta salva não existe mais — recria abaixo */ }
    }
    const folder = DriveApp.getRootFolder().createFolder("Inventario de Equipamentos - Documentos Gerados");
    props.setProperty(INV_DOCS_FOLDER_PROP, folder.getId());
    return folder;
  }

  function INV_sanitizarNome_(nome) {
    const limpo = String(nome || "")
      .replace(/[\\/:*?"<>|#%]+/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    return limpo || "sem-nome";
  }

  function INV_obterPastaCliente_(nomeCliente) {
    const raiz = INV_obterPastaDocumentos_();
    const nome = INV_sanitizarNome_(nomeCliente || "Todos os clientes");
    const existentes = raiz.getFoldersByName(nome);
    if (existentes.hasNext()) return existentes.next();
    return raiz.createFolder(nome);
  }

  function salvarDocumento(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    const html = String(payload.html || "");
    if (!html) return { success: false, message: "Nenhum conteúdo de documento recebido para salvar." };

    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "America/Sao_Paulo", "yyyyMMdd_HHmmss");
    // Perfil Cliente grava sempre na pasta da própria empresa.
    const nomeCliente = SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE" ? INV_nomeClienteSessao_(sessao) : payload.cliente;
    const nomeArquivo = INV_sanitizarNome_("Inventario - " + (nomeCliente || "Todos os clientes") + " - " + timestamp) + ".pdf";

    const folder = INV_obterPastaCliente_(nomeCliente);
    const blobHtml = Utilities.newBlob(html, "text/html", nomeArquivo.replace(/\.pdf$/i, ".html"));

    let pdfBlob;
    try {
      pdfBlob = blobHtml.getAs(MimeType.PDF).setName(nomeArquivo);
    } catch (err) {
      return { success: false, message: "Falha ao converter o documento em PDF: " + err.message };
    }
    const file = folder.createFile(pdfBlob);

    SGO_DATA.log("INVENTARIO_SALVAR_DOCUMENTO", sessao.usuario, "Inventário salvo no Drive: " + file.getName(), "INVENTARIO");

    // Regra do dono: além do PDF, a cópia HTML A4 fica na mesma pasta do cliente.
    const htmlSalvo = SGO_DocSalvar_htmlAoLado_(folder, nomeArquivo, html);
    const resposta = { success: true, fileId: file.getId(), fileName: file.getName(), url: file.getUrl(), htmlId: htmlSalvo.htmlId, htmlUrl: htmlSalvo.htmlUrl };
    if (htmlSalvo.avisoHtml) resposta.avisoHtml = htmlSalvo.avisoHtml;
    return resposta;
  }

  /** Nome da pasta da empresa do usuário Cliente (o mesmo que a tela usa: fantasia ou razão social). */
  function INV_nomeClienteSessao_(sessao) {
    const c = SGO_DATA.getById(SHEET_CLI, SGO_UTILS.safe(sessao.clienteId));
    if (!c) throw new Error("Não foi possível localizar a empresa do seu usuário. Peça ao gestor para conferir o vínculo do seu usuário com o cliente.");
    return SGO_UTILS.safe(c.NOME_FANTASIA || c.RAZAO_SOCIAL);
  }

  function listarDocumentosSalvos(sessionId, termoBusca) {
    const sessao = exigirSessao(sessionId);
    // Perfil Cliente só vê os inventários da pasta da própria empresa.
    const pastaPermitida = SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE" ? INV_sanitizarNome_(INV_nomeClienteSessao_(sessao)) : null;
    const termo = String(termoBusca || "").trim().toLowerCase();
    const raiz = INV_obterPastaDocumentos_();
    const resultado = [];

    const pastasClientes = raiz.getFolders();
    while (pastasClientes.hasNext() && resultado.length < 300) {
      const pastaCliente = pastasClientes.next();
      const nomeCliente = pastaCliente.getName();
      if (pastaPermitida !== null && nomeCliente !== pastaPermitida) continue;
      const bateNomeCliente = !termo || nomeCliente.toLowerCase().indexOf(termo) !== -1;

      const arquivos = pastaCliente.getFilesByType(MimeType.PDF);
      while (arquivos.hasNext() && resultado.length < 300) {
        const arquivo = arquivos.next();
        const nomeArquivo = arquivo.getName();
        const bate = bateNomeCliente || nomeArquivo.toLowerCase().indexOf(termo) !== -1;
        if (bate) {
          resultado.push({
            fileId: arquivo.getId(),
            fileName: nomeArquivo,
            cliente: nomeCliente,
            url: arquivo.getUrl(),
            dataCriacao: arquivo.getDateCreated().getTime()
          });
        }
      }
    }

    resultado.sort(function (a, b) { return b.dataCriacao - a.dataCriacao; });
    return { success: true, documentos: resultado.slice(0, 50) };
  }

  return {
    gerarInventario, listarClientesAtivos, listarUnidadesAtivasPorCliente,
    salvarDocumento, listarDocumentosSalvos
  };
})();

/* =========================
   WRAPPERS BLINDADOS
========================= */
function inventarioGerar(sessionId, filtros) {
  try { return JSON.parse(JSON.stringify(SGO_INVENTARIO.gerarInventario(sessionId, filtros))); }
  catch (e) { return { success: false, message: "Erro ao gerar inventário: " + e.message }; }
}
function inventarioListarClientesAtivos(sessionId) {
  try { return JSON.parse(JSON.stringify(SGO_INVENTARIO.listarClientesAtivos(sessionId))); }
  catch (e) { return { success: false, message: e.message }; }
}
function inventarioListarUnidadesAtivasPorCliente(sessionId, clienteId) {
  try { return JSON.parse(JSON.stringify(SGO_INVENTARIO.listarUnidadesAtivasPorCliente(sessionId, clienteId))); }
  catch (e) { return { success: false, message: e.message }; }
}
function inventarioSalvarDocumento(sessionId, payload) {
  try { return JSON.parse(JSON.stringify(SGO_INVENTARIO.salvarDocumento(sessionId, payload))); }
  catch (e) { return { success: false, message: "Erro ao salvar no Drive: " + e.message }; }
}
function inventarioListarDocumentosSalvos(sessionId, termoBusca) {
  try { return JSON.parse(JSON.stringify(SGO_INVENTARIO.listarDocumentosSalvos(sessionId, termoBusca))); }
  catch (e) { return { success: false, message: e.message }; }
}
