const SGO_OS_MATERIAIS = (() => {
  const DB_OS = "OS";
  const SHEET = SGO_CFG.SHEETS.OS_MATERIAIS;

  function listar(sessionId, osId) {
    exigirSessao(sessionId);
    const items = SGO_DATA.getManyByField(SHEET, "OS_ID", SGO_UTILS.safe(osId), DB_OS);
    return { success: true, items: items };
  }

  function salvar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    payload = payload || {};
    if (SGO_UTILS.safe(payload.LOTE_ID) && !payload.ID && typeof SGO_ESTOQUE !== "undefined") {
      return SGO_ESTOQUE.consumirItemEmOS(sessionId, payload);
    }
    const qtd = SGO_UTILS.toNumber(payload.QUANTIDADE, 0);
    const custoUnit = SGO_UTILS.toNumber(payload.CUSTO_UNITARIO, 0);
    const dados = {
      OS_ID: SGO_UTILS.safe(payload.OS_ID),
      EQUIPAMENTO_ID: SGO_UTILS.safe(payload.EQUIPAMENTO_ID),
      PECA_ID: SGO_UTILS.safe(payload.PECA_ID),
      ITEM_ID: SGO_UTILS.safe(payload.ITEM_ID),
      LOTE_ID: SGO_UTILS.safe(payload.LOTE_ID),
      FORNECEDOR_ID: SGO_UTILS.safe(payload.FORNECEDOR_ID),
      TECNICO_ID: SGO_UTILS.safe(payload.TECNICO_ID),
      PECA_INSTALADA_ID: SGO_UTILS.safe(payload.PECA_INSTALADA_ID),
      DESCRICAO: SGO_UTILS.safe(payload.DESCRICAO),
      REFERENCIA: SGO_UTILS.safeUpper(payload.REFERENCIA),
      NUMERO_SERIE: SGO_UTILS.safeUpper(payload.NUMERO_SERIE),
      LOTE: SGO_UTILS.safeUpper(payload.LOTE),
      QUANTIDADE: qtd,
      UNIDADE_MEDIDA: SGO_UTILS.safeUpper(payload.UNIDADE_MEDIDA || "UN"),
      CUSTO_UNITARIO: custoUnit,
      CUSTO_TOTAL: qtd * custoUnit,
      FORNECEDOR: SGO_UTILS.safe(payload.FORNECEDOR),
      NOTA_FISCAL: SGO_UTILS.safe(payload.NOTA_FISCAL),
      LINK_NF: SGO_UTILS.safe(payload.LINK_NF),
      DATA_USO: SGO_UTILS.safe(payload.DATA_USO || SGO_UTILS.nowIso()),
      STATUS: SGO_UTILS.safeUpper(payload.STATUS || "MANUAL"),
      CRIADO_POR: sessao.usuario
    };
    if (!dados.OS_ID || !dados.DESCRICAO) return { success: false, message: "Informe OS e descricao." };
    if (payload.ID) {
      SGO_DATA.update(SHEET, SGO_UTILS.safe(payload.ID), dados, DB_OS);
      atualizarCustoOS_(dados.OS_ID);
      SGO_DATA.log("OS_ADICIONAR_MATERIAL", sessao.usuario, "Material atualizado para OS=" + dados.OS_ID, "OS");
      return { success: true, message: "Material atualizado." };
    }
    SGO_DATA.insert(SHEET, SGO_DATA.gerarRegistroBase(dados), DB_OS);
    atualizarCustoOS_(dados.OS_ID);
    SGO_DATA.log("OS_ADICIONAR_MATERIAL", sessao.usuario, "Material registrado para OS=" + dados.OS_ID, "OS");
    return { success: true, message: "Material registrado." };
  }

  function remover(sessionId, id) {
    exigirSessao(sessionId);
    const atual = SGO_DATA.getById(SHEET, SGO_UTILS.safe(id), DB_OS);
    const ok = SGO_DATA.remove(SHEET, SGO_UTILS.safe(id), DB_OS);
    if (ok && atual && atual.OS_ID) atualizarCustoOS_(atual.OS_ID);
    return ok ? { success: true } : { success: false, message: "Material nao encontrado." };
  }

  function atualizarCustoOS_(osId) {
    try {
      const itens = SGO_DATA.getManyByField(SHEET, "OS_ID", SGO_UTILS.safe(osId), DB_OS);
      const custoPecas = itens.reduce(function(total, item) {
        return total + SGO_UTILS.toNumber(item.CUSTO_TOTAL, 0);
      }, 0);
      const os = SGO_DATA.getById(SGO_CFG.SHEETS.OS_ORDENS, SGO_UTILS.safe(osId), DB_OS) || {};
      const custoTotal = custoPecas + SGO_UTILS.toNumber(os.CUSTO_HORA, 0) + SGO_UTILS.toNumber(os.CUSTO_DESLOCAMENTO, 0);
      SGO_DATA.update(SGO_CFG.SHEETS.OS_ORDENS, SGO_UTILS.safe(osId), {
        CUSTO_PECAS: custoPecas,
        CUSTO_TOTAL: custoTotal,
        ATUALIZADO_EM: SGO_UTILS.nowIso()
      }, DB_OS);
    } catch (e) {
      SGO_DATA.log("OS_CUSTO_MATERIAL_FALHA", "", "Falha ao atualizar custo OS=" + osId + ": " + e.message, "OS");
    }
  }

  return { listar, salvar, remover };
})();

function osMateriaisListar(sessionId, osId) { try { return JSON.parse(JSON.stringify(SGO_OS_MATERIAIS.listar(sessionId, osId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osMateriaisSalvar(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_OS_MATERIAIS.salvar(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function osMateriaisRemover(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_OS_MATERIAIS.remover(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
