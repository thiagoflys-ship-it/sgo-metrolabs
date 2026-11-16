/** Faturamento real. Referências: api.omie.com.br/docs/apis/{produtos/pedidovendafat,servicos/osp,produtos/nfe}.
 * XML NF-e saída: ajuda.omie.com.br/pt-BR/articles/6851997. Não usa este endpoint para compras/NFS-e.
 * Marcadores persistentes impedem reenvio inclusive quando há timeout. Conciliação manual no Omie é necessária nesse caso.
 */
function OmieFat_erro_(texto) {
  var e = new Error(texto);
  e.omieFatSeguro = true;
  throw e;
}
function OmieFat_resposta_(fn) {
  try {
    return fn();
  } catch (e) {
    var m = e.omieFatSeguro
      ? e.message
      : "Não foi possível concluir a operação. Confira a conexão e a situação no Omie antes de tentar novamente.";
    return { ok: false, mensagem: m, message: m };
  }
}
function OmieFat_hash_(s, md5) {
  return Utilities.computeDigest(
    md5 ? Utilities.DigestAlgorithm.MD5 : Utilities.DigestAlgorithm.SHA_256,
    String(s),
    Utilities.Charset.UTF_8,
  )
    .map(function (b) {
      return ("0" + ((b + 256) % 256).toString(16)).slice(-2);
    })
    .join("");
}
function OmieFat_config_(tipo) {
  if (tipo === "produtos")
    return {
      path: "produtos/pedidovendafat/",
      listar: "ObterPedidosVenda",
      validar: "ValidarPedidoVenda",
      faturar: "FaturarPedidoVenda",
      lista: "listaPedidosVenda",
      id: "nCodPed",
    };
  if (tipo === "servicos")
    return {
      path: "servicos/osp/",
      listar: "ObterOS",
      validar: "ValidarOS",
      faturar: "FaturarOS",
      lista: "listaOS",
      id: "nCodOS",
    };
  OmieFat_erro_("Escolha produtos ou serviços.");
}
function OmieFat_id_(v) {
  var n = Number(v);
  if (!Number.isSafeInteger(n) || n < 1)
    OmieFat_erro_("Informe um código Omie válido.");
  return n;
}
function OmieFat_status_(r) {
  if (!r || String(r.cCodStatus) !== "0")
    OmieFat_erro_(
      "O Omie não confirmou a validação/operação. Confira as pendências diretamente no Omie.",
    );
}
function OmieFat_apiListar(sessionId, payload) {
  return OmieFat_resposta_(function () {
    Omie_exigirAcesso_(sessionId);
    var p = payload || {},
      c = OmieFat_config_(p.tipo),
      etapa = String(p.etapa || "50");
    if (!/^(00|10|20|50|60|70)$/.test(etapa)) OmieFat_erro_("Etapa inválida.");
    var r = Omie_requisitar_(c.path, c.listar, { cEtapa: etapa });
    var lista = r[c.lista];
    if (!Array.isArray(lista))
      OmieFat_erro_("O Omie não retornou uma lista válida.");
    return {
      ok: true,
      itens: lista.map(function (i) {
        return {
          id: Number(i.nIdPed || i.nCodOS || i.nIdOS),
          numero: String(i.cNumPedido || i.cNumOS || ""),
          etapa: etapa,
        };
      }),
    };
  });
}
function OmieFat_detalhe_(tipo, id) {
  var s = tipo === "servicos",
    r = Omie_requisitar_(
      s ? "servicos/os/" : "produtos/pedido/",
      s ? "ConsultarOS" : "ConsultarPedido",
      s ? { nCodOS: id } : { codigo_pedido: id },
    );
  var d = s ? r : r.pedido_venda_produto || r;
  if (Array.isArray(d)) d = d[0];
  if (!d || typeof d !== "object")
    OmieFat_erro_("Não foi possível conferir os dados do documento.");
  return d;
}
function OmieFat_resumo_(tipo, id, d) {
  var h = d.Cabecalho || d.cabecalho || {},
    t = d.total_pedido || {},
    s = tipo === "servicos";
  var itens = s ? d.ServicosPrestados || [] : d.det || [];
  return {
    tipo: tipo,
    id: id,
    numero: String(h.cNumOS || h.numero_pedido || id),
    cliente: String(h.nCodCli || h.codigo_cliente || ""),
    valor: Number(s ? h.nValorTotal : t.valor_total_pedido) || 0,
    quantidadeItens: itens.length,
    etapa: String(h.cEtapa || h.etapa || ""),
  };
}
function OmieFat_token_(sessionId, dados) {
  var token = Utilities.getUuid(),
    texto = JSON.stringify({
      conta: OmieFat_hash_(
        String(
          PropertiesService.getScriptProperties().getProperty("OMIE_APP_KEY") ||
            "",
        ),
      ),
      sessao: OmieFat_hash_(sessionId),
      expira: Date.now() + 600000,
      dados: dados,
    });
  if (Utilities.newBlob(texto).getBytes().length > 90000)
    OmieFat_erro_(
      "Arquivo muito grande para a prévia. Use o importador do Omie.",
    );
  CacheService.getScriptCache().put("OMIEFAT_PRE_" + token, texto, 600);
  return token;
}
function OmieFat_apiPrevia(sessionId, payload) {
  return OmieFat_resposta_(function () {
    Omie_exigirAcesso_(sessionId, 'FIN_OMIE_FATURAR', 'preparar o faturamento');
    var p = payload || {},
      c = OmieFat_config_(p.tipo),
      id = OmieFat_id_(p.id),
      param = {};
    param[c.id] = id;
    var d = typeof Omie_semCache_ === "function" ? Omie_semCache_(function () { return OmieFat_detalhe_(p.tipo, id); }) : OmieFat_detalhe_(p.tipo, id);
    var consultaEm = Date.now(); // 15/11/2026: a confirmação só relê o documento 1 minuto depois (regra do Omie)
    OmieFat_status_(Omie_requisitar_(c.path, c.validar, param));
    var resumo = OmieFat_resumo_(p.tipo, id, d);
    return {
      ok: true,
      resumo: resumo,
      token: OmieFat_token_(sessionId, {
        tipo: p.tipo,
        id: id,
        hash: OmieFat_hash_(JSON.stringify(d)),
        resumo: resumo,
        consultaEm: consultaEm,
      }),
    };
  });
}
function OmieFat_xml_(xml) {
  if (typeof xml !== "string" || xml.length > 40000 || !xml.trim())
    OmieFat_erro_(
      "Envie um XML de até 40 KB. Para arquivos maiores, use o Omie.",
    );
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    OmieFat_erro_("XML com DTD ou entidades externas não é permitido.");
  var root;
  try {
    root = XmlService.parse(xml).getRootElement();
  } catch (e) {
    OmieFat_erro_("XML inválido.");
  }
  function filhos(n, nome) {
    return n.getChildren().filter(function (x) {
      return x.getName() === nome;
    });
  }
  function filho(n, nome) {
    return n && filhos(n, nome)[0];
  }
  function texto(n, nome) {
    var f = filho(n, nome);
    return f ? f.getText() : "";
  }
  var nfe = root.getName() === "nfeProc" ? filho(root, "NFe") : root;
  if (!nfe || nfe.getName() !== "NFe")
    OmieFat_erro_(
      "Este importador aceita NF-e. NFS-e e notas de compra devem ser importadas no Omie; não há envio automático implementado para esses layouts.",
    );
  var inf = filho(nfe, "infNFe"),
    a = inf && inf.getAttribute("Id"),
    chave = a ? String(a.getValue()).replace(/^NFe/, "") : "";
  if (!/^\d{44}$/.test(chave))
    OmieFat_erro_("A chave de acesso da NF-e é inválida.");
  var ide = filho(inf, "ide"),
    emit = filho(inf, "emit"),
    dest = filho(inf, "dest"),
    tot = filho(filho(inf, "total"), "ICMSTot");
  if (texto(ide, "mod") !== "55" || texto(ide, "tpNF") !== "1")
    OmieFat_erro_("Apenas NF-e modelo 55 de saída pode usar este importador.");
  var prot = filho(filho(root, "protNFe"), "infProt");
  if (!prot || texto(prot, "cStat") !== "100" || texto(prot, "chNFe") !== chave)
    OmieFat_erro_(
      "Envie o XML processado com protocolo de autorização (status 100).",
    );
  var cnpj = texto(emit, "CNPJ"),
    empresa = String(
      PropertiesService.getScriptProperties().getProperty(
        "OMIE_EMPRESA_CNPJ",
      ) || "",
    ).replace(/\D/g, "");
  if (!/^\d{14}$/.test(empresa))
    OmieFat_erro_(
      "Configure o CNPJ da empresa Omie antes de importar notas de saída.",
    );
  if (cnpj !== empresa)
    OmieFat_erro_(
      "O emitente do XML não corresponde ao CNPJ configurado para a integração.",
    );
  var valor = Number(texto(tot, "vNF"));
  if (!isFinite(valor) || valor < 0) OmieFat_erro_("Total da NF-e inválido.");
  return {
    tipo: "xml",
    chave: chave,
    numero: texto(ide, "nNF"),
    emitente: texto(emit, "xNome"),
    cnpj: cnpj,
    destinatario: texto(dest, "xNome"),
    valor: valor,
    quantidadeItens: filhos(inf, "det").length,
  };
}
function OmieFat_apiPreviaXml(sessionId, payload) {
  return OmieFat_resposta_(function () {
    Omie_exigirAcesso_(sessionId, 'FIN_OMIE_FATURAR', 'conferir o XML da nota');
    var p = payload || {},
      resumo = OmieFat_xml_(p.xml);
    var token = OmieFat_token_(sessionId, {
      tipo: "xml",
      xml: p.xml,
      resumo: resumo,
    });
    return { ok: true, resumo: resumo, token: token };
  });
}
function OmieFat_xmlConverter_(xml) {
  return xml
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\\/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/\|/g, "&#124;");
}
// Recepção documental local: não substitui importação fiscal/escrituração no Omie.
// 16/11/2026 (B7, B8): XML até 1 MB (o original vai para um arquivo, a tabela guarda o ID do arquivo, o SHA-256 e os campos
// lidos); NF-e de compra e NFS-e lidas pelos leitores de SGO_Omie_Notas.js (destinatário/tomador = OMIE_EMPRESA_CNPJ, uma nota
// por arquivo, líquido da NFS-e calculado e nunca o bruto quando há retenção, chave da NFS-e = prestador + município + número).
var OMIEFAT_XML_MAX = 1000000;
function OmieFat_documento_(xml, tipo) {
  if (["compra", "nfse"].indexOf(tipo) < 0)
    OmieFat_erro_("Tipo documental inválido.");
  if (
    typeof xml !== "string" ||
    !xml.trim() ||
    xml.length > OMIEFAT_XML_MAX ||
    /<!DOCTYPE|<!ENTITY/i.test(xml)
  )
    OmieFat_erro_("Use XML válido de até 1 MB, sem DTD/entidades externas.");
  if (typeof OmieNota_lerNfe_ !== "function" || typeof OmieNota_lerNfse_ !== "function")
    OmieFat_erro_("O leitor de notas recebidas não está disponível. Avise o responsável pelo sistema.");
  var l;
  try { l = tipo === "compra" ? OmieNota_lerNfe_(xml) : OmieNota_lerNfse_(xml); }
  catch (e) { OmieFat_erro_(e && e.omieOpsPublica ? e.message : "XML inválido."); }
  if (tipo === "nfse" && l.faltando.length)
    OmieFat_erro_("Alguns dados desta NFS-e não foram lidos do XML (" + l.faltando.join(", ") + "). Use \"Lançar nota recebida no Omie\", que permite conferir e digitar o que faltou.");
  var valor = tipo === "compra" ? l.vNF : l.liquido;
  if (!isFinite(valor) || valor < 0)
    OmieFat_erro_("Valor documental inválido.");
  return {
    tipo: tipo,
    numero: String(l.numero),
    valor: valor,
    chave: l.chave,
    emitente: l.emitente.nome,
    cnpj: l.emitente.cnpj,
    destinatario: tipo === "compra" ? "Empresa (destinatário conferido)" : "Empresa (tomador conferido)",
    quantidadeItens: tipo === "compra" ? l.itens : 0,
    observacao:
      "Recepção documental; autenticidade fiscal e lançamento no Omie pendentes." + (l.alertas && l.alertas.length ? " " + l.alertas.join(" ") : ""),
  };
}
function OmieFat_notasTabela_() {
  var db = SGO_DATA.getDB(),
    sh = db.getSheetByName("FIN_OMIE_NOTAS"),
    cab = [
      "ID",
      "DATA",
      "CONTA_HASH",
      "TIPO",
      "NUMERO",
      "CHAVE",
      "VALOR",
      "STATUS",
      "USUARIO",
      "DOCUMENTO_JSON",
    ];
  if (!sh) {
    sh = db.insertSheet("FIN_OMIE_NOTAS");
    sh.appendRow(cab);
    sh.setFrozenRows(1);
  }
  if (
    sh.getRange(1, 1, 1, cab.length).getValues()[0].join("|") !== cab.join("|")
  )
    OmieFat_erro_("Histórico de notas com estrutura incompatível.");
  if (sh.getLastRow() > 10001)
    OmieFat_erro_("Arquive o histórico de notas antes de continuar.");
  return sh;
}
function OmieFat_apiPreviaDocumento(sessionId, payload) {
  return OmieFat_resposta_(function () {
    Omie_exigirAcesso_(sessionId, 'FIN_OMIE_FATURAR', 'conferir o documento recebido');
    var p = payload || {},
      r = OmieFat_documento_(p.xml, p.tipo);
    // B7: o token guarda os campos lidos e o resumo SHA-256 do XML, não o XML (o XML volta na confirmação e é conferido).
    return {
      ok: true,
      resumo: r,
      token: OmieFat_token_(sessionId, { tipo: p.tipo, sha: OmieFat_hash_(p.xml), resumo: r }),
    };
  });
}
/** B7: guarda o XML original num arquivo da pasta do Financeiro. Sem a pasta, devolve '' (o SHA-256 continua registrado). */
function OmieFat_salvarXml_(xml, nome) {
  try {
    if (typeof SGO_DocSalvar_pastaPersistente_ !== "function" || typeof DriveApp === "undefined") return "";
    var pasta = SGO_DocSalvar_pastaPersistente_("FIN_PASTA_NOTAS_ID", "SGO+ Financeiro - notas recebidas", "");
    var f = pasta.createFile(Utilities.newBlob(String(xml), "application/xml", String(nome || "nota").replace(/[^\w.\- ]/g, "_").slice(0, 120) + ".xml"));
    return String(f.getId());
  } catch (e) { return ""; }
}
function OmieFat_apiGuardarDocumento(sessionId, payload) {
  return OmieFat_resposta_(function () {
    var eu = Omie_exigirAcesso_(sessionId, 'FIN_OMIE_FATURAR', 'registrar o documento recebido'),
      p = payload || {},
      cache = CacheService.getScriptCache(),
      key = "OMIEFAT_PRE_" + String(p.token || ""),
      raw = cache.get(key);
    if (!raw || p.confirmacao !== "CONFIRMAR")
      OmieFat_erro_("Gere uma prévia e confirme o recebimento.");
    var pre = JSON.parse(raw),
      d = pre.dados;
    if (
      pre.sessao !== OmieFat_hash_(sessionId) ||
      pre.expira < Date.now() ||
      pre.conta !==
        OmieFat_hash_(
          String(
            PropertiesService.getScriptProperties().getProperty(
              "OMIE_APP_KEY",
            ) || "",
          ),
        )
    )
      OmieFat_erro_("Prévia inválida.");
    if (typeof p.xml !== "string" || !d.sha || OmieFat_hash_(p.xml) !== d.sha)
      OmieFat_erro_("O arquivo enviado não é o mesmo da prévia. Escolha o XML de novo e gere outra prévia.");
    var r = OmieFat_documento_(p.xml, d.tipo),
      conta = OmieFat_hash_(
        String(
          PropertiesService.getScriptProperties().getProperty("OMIE_APP_KEY") ||
            "",
        ),
      ),
      id = OmieFat_hash_(conta + ":" + d.tipo + ":" + r.chave),
      lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) OmieFat_erro_("Aguarde outra operação.");
    try {
      var sh = OmieFat_notasTabela_(),
        n = sh.getLastRow();
      if (
        n > 1 &&
        sh
          .getRange(2, 1, n - 1, 1)
          .getValues()
          .some(function (x) {
            return x[0] === id;
          })
      )
        return {
          ok: true,
          mensagem:
            "Documento já recebido. Lançamento no Omie permanece pendente.",
        };
      var arquivoId = OmieFat_salvarXml_(p.xml, d.tipo + "-" + r.numero + "-" + String(r.cnpj || ""));
      sh.appendRow([
        id,
        new Date().toISOString(),
        conta,
        d.tipo,
        "'" + String(r.numero),
        r.chave,
        r.valor,
        "AGUARDANDO_LANCAMENTO_OMIE",
        "'" + String(eu.usuario || eu.id || ""),
        JSON.stringify({ arquivoId: arquivoId, xmlSha256: d.sha, resumo: r }),
      ]);
      cache.remove(key);
      return {
        ok: true,
        mensagem:
          "Documento recebido no histórico local" + (arquivoId ? " (XML original guardado na pasta do Financeiro)" : " (o XML original não pôde ser guardado em arquivo; o resumo e o SHA-256 ficaram registrados)") + ". Ainda é necessário lançar/importar no Omie; não houve escrituração, estoque ou título financeiro.",
      };
    } finally {
      lock.releaseLock();
    }
  });
}
function OmieFat_apiHistoricoNotas(sessionId, payload) {
  return OmieFat_resposta_(function () {
    Omie_exigirAcesso_(sessionId);
    var sh = OmieFat_notasTabela_(),
      n = sh.getLastRow(),
      conta = OmieFat_hash_(
        String(
          PropertiesService.getScriptProperties().getProperty("OMIE_APP_KEY") ||
            "",
        ),
      ),
      rows = n > 1 ? sh.getRange(2, 1, n - 1, 10).getValues() : [];
    return {
      ok: true,
      itens: rows
        .filter(function (r) {
          return r[2] === conta;
        })
        .reverse()
        .slice(0, 100)
        .map(function (r) {
          return {
            data: String(r[1]),
            tipo: String(r[3]),
            numero: String(r[4]),
            valor: Number(r[6]),
            status: String(r[7]),
          };
        }),
    };
  });
}
function OmieFat_apiConfirmar(sessionId, payload) {
  return OmieFat_resposta_(function () {
    var eu = Omie_exigirAcesso_(sessionId, 'FIN_OMIE_FATURAR', 'confirmar no Omie');
    var p = payload || {};
    if (p.confirmacao !== "CONFIRMAR")
      OmieFat_erro_("Confirme a operação após conferir a prévia.");
    Omie_exigirGravacao_(); // 14/11/2026: gravação no Omie desligada até a primeira operação acompanhada
    var cache = CacheService.getScriptCache(),
      key = "OMIEFAT_PRE_" + String(p.token || ""),
      raw = cache.get(key);
    if (!raw) OmieFat_erro_("A prévia expirou. Gere uma nova conferência.");
    var pre = JSON.parse(raw);
    if (
      pre.sessao !== OmieFat_hash_(sessionId) ||
      pre.expira < Date.now() ||
      pre.conta !==
        OmieFat_hash_(
          String(
            PropertiesService.getScriptProperties().getProperty(
              "OMIE_APP_KEY",
            ) || "",
          ),
        )
    )
      OmieFat_erro_("Prévia inválida ou expirada.");
    var d = pre.dados,
      props = PropertiesService.getScriptProperties();
    var conta = OmieFat_hash_(String(props.getProperty("OMIE_APP_KEY") || "")),
      op =
        "OMIEFAT_OP_" +
        OmieFat_hash_(
          conta +
            ":" +
            d.tipo +
            ":" +
            (d.tipo === "xml" ? d.resumo.chave : d.id),
        );
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000))
      OmieFat_erro_("Outra operação está em andamento. Aguarde.");
    try {
      var antigo = props.getProperty(op);
      if (antigo) {
        var ant = JSON.parse(antigo);
        if (ant.estado === "concluido")
          return {
            ok: true,
            jaProcessado: true,
            mensagem: "Operação já confirmada anteriormente.",
          };
        OmieFat_erro_(
          "Envio anterior sem confirmação definitiva. Confira o documento no Omie antes de qualquer reenvio. Depois de conferir, registre o resultado em Lançamentos e baixas > Envios a conferir.",
        );
      }
      var c,
        param = {},
        r;
      if (d.tipo !== "xml") {
        c = OmieFat_config_(d.tipo);
        if (typeof Omie_faltaReconsulta_ === "function" && Omie_faltaReconsulta_(d.consultaEm) > 0)
          OmieFat_erro_(Omie_msgReconsulta_(Omie_faltaReconsulta_(d.consultaEm)));
        if (
          OmieFat_hash_(JSON.stringify(Omie_semCache_(function () { return OmieFat_detalhe_(d.tipo, d.id); }))) !==
          d.hash
        )
          OmieFat_erro_("O documento mudou após a prévia. Confira novamente.");
        param[c.id] = d.id;
        OmieFat_status_(Omie_requisitar_(c.path, c.validar, param));
      } else {
        OmieFat_xml_(d.xml);
        var convertido = OmieFat_xmlConverter_(d.xml);
        param = {
          cAppNome: "SGO",
          cAppVersao: "1",
          cAppId: "SGO-FINANCEIRO",
          cChaveNFe: d.resumo.chave,
          cXmlNFe: convertido,
          cMd5NFe: OmieFat_hash_(convertido, true),
          cOrigem: "API",
          lNaoMovEstoque: true,
          lNaoGerarTitulo: true,
          lNaoIncluirCliente: true,
          lNaoIncluirProduto: true,
        };
      }
      // 16/11/2026 (B5): o marcador diz o que foi enviado (sem valor), para a conferência em "Envios a conferir"
      props.setProperty(
        op,
        JSON.stringify({ estado: "enviado", data: new Date().toISOString(),
          descricao: d.tipo === "xml" ? "Importação da NF-e " + String((d.resumo && d.resumo.numero) || "") + " (chave " + String((d.resumo && d.resumo.chave) || "").slice(-8) + ")" : (d.tipo === "servicos" ? "Faturamento da O.S. " : "Faturamento do pedido ") + String((d.resumo && d.resumo.numero) || d.id),
          quem: String((eu && (eu.usuario || eu.userId)) || "") }),
      );
      cache.remove(key);
      try {
        r = Omie_requisitar_(
          d.tipo === "xml" ? "produtos/nfe/" : c.path,
          d.tipo === "xml" ? "ImportarNFe" : c.faturar,
          param,
        );
      } catch (eEnvio) {
        // 14/11/2026: recusa sem execução (método ocupado ou limite do Omie): retira o marcador; o operador gera a conferência de novo.
        if (eEnvio && eEnvio.omieNaoExecutado) { props.deleteProperty(op); OmieFat_erro_(eEnvio.message + " Gere a conferência de novo para enviar."); }
        // 16/11/2026 (B5): recusa com motivo do Omie (validação) = nada foi feito. Retira o marcador para corrigir e enviar de novo.
        if (eEnvio && eEnvio.omieRecusado) { props.deleteProperty(op); OmieFat_erro_(eEnvio.message + ". Nada foi feito no Omie. Corrija o que o Omie apontou e gere a conferência de novo."); }
        throw eEnvio;
      }
      OmieFat_status_(r);
      props.setProperty(
        op,
        JSON.stringify({ estado: "concluido", data: new Date().toISOString() }),
      );
      return {
        ok: true,
        mensagem:
          d.tipo === "xml"
            ? "NF-e importada sem movimentar estoque nem gerar títulos."
            : "Faturamento enviado e confirmado pelo Omie. A autorização fiscal pode precisar de acompanhamento no Omie.",
      };
    } finally {
      lock.releaseLock();
    }
  });
}
