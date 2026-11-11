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
        // 21/10/2026: campos novos do cadastro (aparecem no relatório quando preenchidos).
        PATRIMONIO: SGO_UTILS.safe(e.PATRIMONIO),
        ANO_FABRICACAO: SGO_UTILS.safe(e.ANO_FABRICACAO),
        CAPACIDADE: SGO_UTILS.safe(e.CAPACIDADE),
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
    // 18/10/2026: o relatório A4 passou a gravar na subpasta do CNPJ (padrão A4); as pastas antigas, pelo nome, continuam valendo.
    const ehCliente = SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE";
    const pastaPermitida = ehCliente ? INV_sanitizarNome_(INV_nomeClienteSessao_(sessao)) : null;
    const cnpjPermitido = ehCliente ? SGO_DocSalvar_cnpjDigitos_((SGO_DATA.getById(SHEET_CLI, SGO_UTILS.safe(sessao.clienteId)) || {}).CNPJ) : "";
    const termo = String(termoBusca || "").trim().toLowerCase();
    const raiz = INV_obterPastaDocumentos_();
    const resultado = [];

    // nome do cliente das subpastas por CNPJ (o nome da pasta é só o número)
    const nomePorCnpj = {};
    SGO_DATA.getAll(SHEET_CLI).forEach(c => { const d = SGO_DocSalvar_cnpjDigitos_(c.CNPJ); if (d) nomePorCnpj[d] = SGO_UTILS.safe(c.NOME_FANTASIA || c.RAZAO_SOCIAL); });
    const pastasClientes = raiz.getFolders();
    while (pastasClientes.hasNext() && resultado.length < 300) {
      const pastaCliente = pastasClientes.next();
      const nomePasta = pastaCliente.getName();
      if (pastaPermitida !== null && nomePasta !== pastaPermitida && !(cnpjPermitido && nomePasta === cnpjPermitido)) continue;
      let nomeCliente = nomePasta;
      if (/^d{14}$/.test(nomePasta)) nomeCliente = nomePorCnpj[nomePasta] || nomePasta;
      const bateNomeCliente = !termo || nomeCliente.toLowerCase().indexOf(termo) !== -1 || nomePasta.indexOf(termo.replace(/D/g, "") || "#") !== -1;

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

  // =========================
  // RELATÓRIO A4 COM ANÁLISE (17/10/2026) — montado no servidor na moldura
  // comum (SGO_Documentos_RelatorioA4.js), com a análise pela IA (texto padrão
  // sem chave), gravado em HTML + PDF na pasta do cliente (a mesma que a lista
  // "Documentos já gerados" consulta).
  // =========================
  function INV_rotuloDoc_(d) {
    const s = d && d.status;
    if (s === "OK") return RelA4_marca_("Em dia", "ok");
    if (s === "VENCENDO") return RelA4_marca_("Vence em breve", "aviso");
    if (s === "VENCIDO") return RelA4_marca_("Vencido", "critico");
    if (s === "SEM_VENCIMENTO") return RelA4_marca_("Sem vencimento", "neutra");
    return RelA4_marca_("Sem documento", "neutra");
  }
  function INV_celulaDoc_(d) {
    const m = INV_rotuloDoc_(d);
    const det = d && d.vencimento ? formatarDataBR_(d.vencimento) : "";
    return { html: '<span style="white-space:nowrap">' + m.html + (det ? ' <span class="nota">' + RelA4_esc_(det) + "</span>" : "") + '</span>' };
  }

  function INV_textoPadrao_(dados, nomeCliente, porTipo) {
    const i = dados.indicadores, p = [];
    p.push("O inventário de " + nomeCliente + " reúne " + RelA4_plural_(i.total, "equipamento", "equipamentos") +
      (porTipo.length ? ", distribuídos em " + RelA4_plural_(porTipo.length, "tipo", "tipos") + " (os mais numerosos: " + porTipo.slice(0, 3).map(t => t.tipo + " com " + t.qtd).join(", ") + ")" : "") + ". " +
      RelA4_num_(i.calibPct, 0) + "% dos equipamentos têm calibração em dia (" + i.calibOk + ") e " + RelA4_num_(i.qualPct, 0) + "% têm qualificação em dia (" + i.qualOk + ").");
    p.push(i.vencidos || i.vencendo
      ? "Na data de emissão há " + RelA4_plural_(i.vencidos, "equipamento com documento vencido", "equipamentos com documento vencido") + " e " + RelA4_plural_(i.vencendo, "equipamento com documento vencendo", "equipamentos com documento vencendo") + " nos próximos 30 dias. Recomenda-se programar primeiro a calibração ou a qualificação dos itens vencidos, listados na seção de itens que exigem ação."
      : "Na data de emissão não há documento de calibração ou qualificação vencido nem vencendo nos próximos 30 dias.");
    if (i.semDoc) p.push(RelA4_plural_(i.semDoc, "equipamento não tem", "equipamentos não têm") + " nenhum documento de calibração ou qualificação registrado no SGO+. Convém confirmar se o equipamento exige esses serviços e, se exigir, anexar o certificado no Arquivo de documentos.");
    return p.join("\n\n");
  }

  function gerarRelatorioA4(sessionId, filtros) {
    const sessao = exigirSessao(sessionId);
    const dados = gerarInventario(sessionId, filtros);
    const ci = dados.clienteInfo;
    const nomeCliente = ci ? SGO_UTILS.safe(ci.NOME_FANTASIA || ci.RAZAO_SOCIAL) : "Todos os clientes";
    const unidade = dados.unidadeInfo ? SGO_UTILS.safe(dados.unidadeInfo.NOME_UNIDADE) : "Todas as unidades";
    const i = dados.indicadores;
    const tipos = {};
    dados.itens.forEach(e => {
      const t = e.TIPO || "Sem tipo";
      const x = tipos[t] = tipos[t] || { tipo: t, qtd: 0, cal: 0, qual: 0, venc: 0, semDoc: 0 };
      x.qtd++;
      if (e.CALIBRACAO.status === "OK") x.cal++;
      if (e.QUALIFICACAO.status === "OK") x.qual++;
      if (e.CALIBRACAO.status === "VENCIDO" || e.QUALIFICACAO.status === "VENCIDO") x.venc++;
      if (e.CALIBRACAO.status === "SEM_DOC" && e.QUALIFICACAO.status === "SEM_DOC") x.semDoc++;
    });
    const porTipo = Object.keys(tipos).map(k => tipos[k]).sort((a, b) => b.qtd - a.qtd);
    const vencido = e => e.CALIBRACAO.status === "VENCIDO" || e.QUALIFICACAO.status === "VENCIDO";
    const acao = dados.itens.filter(e => ["VENCIDO", "VENCENDO"].indexOf(e.CALIBRACAO.status) >= 0 || ["VENCIDO", "VENCENDO"].indexOf(e.QUALIFICACAO.status) >= 0)
      .sort((a, b) => (vencido(a) ? 0 : 1) - (vencido(b) ? 0 : 1));

    const prompt = "Você é o engenheiro clínico da Metrolab's responsável pelo inventário de equipamentos de um cliente e escreve a seção \"Análise do inventário\" do relatório entregue a ele. " +
      "Com base SOMENTE nos dados abaixo, escreva de 2 a 4 parágrafos: a situação geral da calibração e da qualificação do parque, os tipos de equipamento que concentram vencimentos ou falta de documento, " +
      "e as prioridades práticas (o que programar primeiro). Não afirme que um equipamento está impróprio para uso: diga apenas a situação documental registrada.\n\n" +
      "CLIENTE: " + nomeCliente + " | UNIDADE: " + unidade + "\n" +
      "TOTAIS: " + i.total + " equipamentos; calibração em dia " + i.calibOk + " (" + i.calibPct + "%); qualificação em dia " + i.qualOk + " (" + i.qualPct + "%); com documento vencido " + i.vencidos + "; vencendo em 30 dias " + i.vencendo + "; sem nenhum documento " + i.semDoc + "\n" +
      "POR TIPO:\n" + porTipo.map(t => "- " + t.tipo + ": " + t.qtd + " equipamentos, calibração em dia " + t.cal + ", qualificação em dia " + t.qual + ", com vencido " + t.venc + ", sem documento " + t.semDoc).join("\n") + "\n" +
      "ITENS QUE EXIGEM AÇÃO (até 30):\n" + (acao.slice(0, 30).map(e => "- " + e.TAG + " (" + (e.TIPO || "sem tipo") + "): calibração " + e.CALIBRACAO.label + "; qualificação " + e.QUALIFICACAO.label).join("\n") || "nenhum");
    const analise = RelA4_analise_(prompt, INV_textoPadrao_(dados, nomeCliente, porTipo));

    const cnpj = ci && ci.CNPJ ? SGO_UTILS.safe(ci.CNPJ).replace(/\D/g, "") : "";
    const contar = (campo, st) => dados.itens.filter(e => e[campo].status === st).length;
    const situacoes = [["OK", "Em dia", RELA4_CORES.verde], ["VENCENDO", "Vence em breve", RELA4_CORES.ambar], ["VENCIDO", "Vencido", RELA4_CORES.vermelho], ["SEM_VENCIMENTO", "Sem vencimento", RELA4_CORES.azul], ["SEM_DOC", "Sem documento", RELA4_CORES.cinza]];
    const c = [];
    c.push(RelA4_secao_("Identificação", RelA4_identificacao_([
      ["Cliente", ci ? SGO_UTILS.safe(ci.RAZAO_SOCIAL || ci.NOME_FANTASIA) : "Todos os clientes"],
      ["CNPJ", cnpj.length === 14 ? cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : (cnpj || "—")],
      ["Unidade", unidade],
      ["Situação dos equipamentos", filtros && filtros.status ? (String(filtros.status).toUpperCase() === "ATIVO" ? "Somente ativos" : "Somente inativos") : "Ativos e inativos"]
    ])));
    c.push(RelA4_secao_("Indicadores", RelA4_kpis_([
      [RelA4_num_(i.total, 0), "Equipamentos"], [RelA4_num_(i.calibPct, 0) + "%", "Calibração em dia (" + i.calibOk + ")", i.calibPct >= 90 ? "ok" : "aviso"], [RelA4_num_(i.qualPct, 0) + "%", "Qualificação em dia (" + i.qualOk + ")", i.qualPct >= 90 ? "ok" : "aviso"],
      [RelA4_num_(i.vencidos, 0), "Com documento vencido", i.vencidos ? "critico" : "ok"], [RelA4_num_(i.vencendo, 0), "Vencendo em 30 dias", i.vencendo ? "aviso" : "ok"], [RelA4_num_(i.semDoc, 0), "Sem nenhum documento", i.semDoc ? "aviso" : "ok"]
    ]) + RelA4_barrasEmpilhadas_(["CALIBRACAO", "QUALIFICACAO"].map(campo => ({
      rotulo: campo === "CALIBRACAO" ? "Calibração" : "Qualificação",
      partes: situacoes.map(s => contar(campo, s[0])),
      rotuloValor: RelA4_plural_(i.total, "equipamento", "equipamentos")
    })), situacoes.map(s => ({ rotulo: s[1], cor: s[2] })), { titulo: "Situação documental do parque na data de emissão", vazio: "Nenhum equipamento com os filtros escolhidos." })));
    c.push(RelA4_secao_("Análise do inventário", RelA4_paragrafos_(analise.texto)));
    c.push(RelA4_secao_("Distribuição por tipo", RelA4_tabela_([{ t: "Tipo" }, { t: "Quantidade", num: true }, { t: "Calibração em dia", num: true }, { t: "Qualificação em dia", num: true }, { t: "Com vencido", num: true }, { t: "Sem documento", num: true }],
      porTipo.map(t => [t.tipo, RelA4_num_(t.qtd, 0), RelA4_num_(t.cal, 0), RelA4_num_(t.qual, 0), RelA4_num_(t.venc, 0), RelA4_num_(t.semDoc, 0)]),
      { vazio: "Nenhum equipamento com os filtros escolhidos.", legenda: "Equipamentos por tipo e situação documental", total: porTipo.length > 1 ? ["Total", RelA4_num_(i.total, 0), RelA4_num_(i.calibOk, 0), RelA4_num_(i.qualOk, 0), RelA4_num_(porTipo.reduce((s, t) => s + t.venc, 0), 0), RelA4_num_(porTipo.reduce((s, t) => s + t.semDoc, 0), 0)] : null })));
    c.push(RelA4_secao_("Itens que exigem ação", RelA4_tabela_([{ t: "TAG", nw: true }, { t: "Tipo" }, { t: "Unidade" }, { t: "Calibração" }, { t: "Qualificação" }],
      acao.map(e => [e.TAG || "—", e.TIPO || "—", e.UNIDADE_NOME || "—", INV_celulaDoc_(e.CALIBRACAO), INV_celulaDoc_(e.QUALIFICACAO)]),
      { vazio: "Nenhum documento vencido ou vencendo nos próximos 30 dias.", legenda: "Equipamentos com documento vencido (primeiro) ou vencendo em 30 dias", compacta: acao.length > 20 })));
    // 21/10/2026: patrimônio do cadastro em coluna própria só quando algum equipamento listado tem; ano e capacidade abaixo do tipo.
    const invTemPat = dados.itens.some(e => e.PATRIMONIO);
    c.push(RelA4_secao_("Inventário completo", RelA4_tabela_([{ t: "Nº", num: true }, { t: "TAG", nw: true }].concat(invTemPat ? [{ t: "Patrimônio", nw: true }] : []).concat([{ t: "Tipo" }, { t: "Fabricante e modelo" }, { t: "Série", nw: true }, { t: "Setor" }, { t: "Unidade" }, { t: "Calibração" }, { t: "Qualificação" }, { t: "Situação" }]),
      dados.itens.map(e => [String(e.IDX), e.TAG || "—"].concat(invTemPat ? [e.PATRIMONIO || "—"] : []).concat([[e.TIPO || "—", [e.CAPACIDADE, e.ANO_FABRICACAO ? "fabricação " + e.ANO_FABRICACAO : ""].filter(Boolean).join(" · ")].filter(Boolean).join(" — "), [e.FABRICANTE, e.MODELO].filter(Boolean).join(" / ") || "—", e.SERIE || "—", e.SETOR || "—", e.UNIDADE_NOME || "—",
        INV_celulaDoc_(e.CALIBRACAO), INV_celulaDoc_(e.QUALIFICACAO), String(e.STATUS).toUpperCase() === "INATIVO" ? "Inativo" : "Ativo"])),
      { vazio: "Nenhum equipamento com os filtros escolhidos.", legenda: "Equipamentos do inventário", compacta: dados.itens.length > 30 }) +
      '<p class="nota">Situação documental conforme os registros do SGO+ na data de emissão: considera o documento de calibração e o de qualificação de validade mais distante de cada equipamento; "vence em breve" significa nos próximos 30 dias. ' +
      "O inventário não substitui os certificados, que prevalecem em caso de divergência.</p>"));
    const html = RelA4_documento_({ titulo: "Inventário de equipamentos", subtitulo: nomeCliente + (dados.unidadeInfo ? " — " + unidade : ""), tituloArquivo: "Inventário de equipamentos",
      sigla: "INV", rotuloIdentificacao: "Posição em", identificacao: Utilities.formatDate(new Date(), RELA4_TZ, "dd/MM/yyyy"), tipoCapa: "Relatório de situação documental",
      corpo: c.join("\n"), paisagem: true, emitidoPor: SGO_UTILS.safe(sessao.nome || sessao.usuario) });

    // Pasta do cliente pelo CNPJ (padrão A4); sem cliente escolhido, a pasta "Todos os clientes".
    const ehCliente = SGO_UTILS.safeUpper(sessao.perfil) === "CLIENTE";
    const cliPasta = ehCliente ? (SGO_DATA.getById(SHEET_CLI, SGO_UTILS.safe(sessao.clienteId)) || {}) : (ci || null);
    const obterPasta = () => {
      if (cliPasta && (cliPasta.CNPJ || cliPasta.RAZAO_SOCIAL || cliPasta.NOME_FANTASIA)) {
        return SGO_DocSalvar_pastaClienteEm_(INV_obterPastaDocumentos_(), cliPasta.CNPJ, SGO_UTILS.safe(cliPasta.RAZAO_SOCIAL || cliPasta.NOME_FANTASIA));
      }
      return INV_obterPastaCliente_(ehCliente ? INV_nomeClienteSessao_(sessao) : nomeCliente);
    };
    const g = RelA4_salvar_(obterPasta, nomeCliente, html, { compartilhar: true });
    const nomeBase = g.nome;
    SGO_DATA.log("INVENTARIO_RELATORIO_A4", sessao.usuario, "Relatório A4 do inventário (" + nomeCliente + ", " + i.total + " equipamentos, análise: " + (analise.origem === "IA" ? "IA" : "texto padrão") + ")" + (g.salvo ? "" : " — cópia não gravada"), "INVENTARIO");
    return { success: true, html: RelA4_injetarAvisos_(g.html, RelA4_avisosPadrao_(g, [analise])), url: g.pdfUrl, htmlUrl: g.htmlUrl, pastaUrl: g.pastaUrl,
      fileName: nomeBase + ".pdf", salvo: g.salvo, aviso: [g.aviso, analise.aviso].filter(Boolean).join(" "), analise: analise.origem };
  }

  return {
    gerarInventario, listarClientesAtivos, listarUnidadesAtivasPorCliente,
    salvarDocumento, listarDocumentosSalvos, gerarRelatorioA4
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
function inventarioGerarRelatorio(sessionId, filtros) {
  try { return JSON.parse(JSON.stringify(SGO_INVENTARIO.gerarRelatorioA4(sessionId, filtros))); }
  catch (e) { return { success: false, message: "Não foi possível gerar o relatório do inventário: " + String((e && e.message) || e).replace(/[.\s]+$/, "") + ". Confira os filtros e tente de novo; se repetir, avise o administrador." }; }
}
function inventarioListarDocumentosSalvos(sessionId, termoBusca) {
  try { return JSON.parse(JSON.stringify(SGO_INVENTARIO.listarDocumentosSalvos(sessionId, termoBusca))); }
  catch (e) { return { success: false, message: e.message }; }
}
