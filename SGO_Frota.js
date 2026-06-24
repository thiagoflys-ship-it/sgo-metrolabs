/*
 * SGO_FROTA_NOVA
 * Versao interna: 2026-05-08.1
 *
 * A estrutura antiga de Frota permanece apenas como legado de dados.
 * Este modulo novo usa exclusivamente abas FROTA_*.
 */

const SGO_FROTA_NOVA = (() => {
  const DB = "FROTA";
  const SHEETS = sgoGetCfgSafe_().SHEETS;

  const FROTA_ABAS = {
    VEICULOS: SHEETS.FROTA_VEICULOS,
    RESERVAS: SHEETS.FROTA_RESERVAS,
    MOVIMENTOS: SHEETS.FROTA_MOVIMENTOS,
    VISTORIAS: SHEETS.FROTA_VISTORIAS,
    ABASTECIMENTOS: SHEETS.FROTA_ABASTECIMENTOS,
    MANUTENCOES: SHEETS.FROTA_MANUTENCOES,
    LAVAGENS: SHEETS.FROTA_LAVAGENS,
    MULTAS: SHEETS.FROTA_MULTAS,
    ALERTAS: SHEETS.FROTA_ALERTAS,
    DOCUMENTOS: SHEETS.FROTA_DOCUMENTOS,
    UPLOADS: SHEETS.FROTA_UPLOADS,
    LOGS: SHEETS.FROTA_LOGS
  };

  const FROTA_STATUS_VEICULO = {
    DISPONIVEL: "DISPONIVEL",
    RESERVADO: "RESERVADO",
    EM_USO: "EM_USO",
    EM_MANUTENCAO: "EM_MANUTENCAO",
    BLOQUEADO: "BLOQUEADO",
    DOCUMENTACAO_VENCIDA: "DOCUMENTACAO_VENCIDA",
    PREVENTIVA_VENCIDA: "PREVENTIVA_VENCIDA",
    SINISTRO_AVARIA: "SINISTRO_AVARIA",
    INATIVO: "INATIVO"
  };

  const FROTA_STATUS_RESERVA = {
    RESERVADO: "RESERVADO",
    EM_USO: "EM_USO",
    CONCLUIDO: "CONCLUIDO",
    CANCELADO: "CANCELADO",
    EXPIRADO: "EXPIRADO"
  };

  const FROTA_STATUS_MOVIMENTO = {
    ABERTO: "ABERTO",
    EM_USO: "EM_USO",
    CONCLUIDO: "CONCLUIDO",
    CANCELADO: "CANCELADO",
    BLOQUEADO: "BLOQUEADO"
  };

  const FROTA_NIVEIS_ALERTA = {
    INFO: "INFO",
    AMARELO: "AMARELO",
    LARANJA: "LARANJA",
    VERMELHO: "VERMELHO",
    BLOQUEIO: "BLOQUEIO"
  };

  const FROTA_CHECKLIST_CHECKIN = [
    "Painel sem alerta", "Pneus ok", "Oleo ok", "Agua/arrefecimento ok",
    "Limpeza ok", "Documentos ok", "Luzes ok"
  ];

  const FROTA_CHECKLIST_CHECKOUT = [
    "Painel sem alerta", "Pneus ok", "Limpeza ok", "Combustivel conferido",
    "Objetos/ferramentas conferidos", "Avarias verificadas"
  ];

  const FROTA_CHECKLIST_VISTORIA = [
    "Lataria dianteira", "Lataria traseira", "Lateral direita", "Lateral esquerda",
    "Para-brisa", "Vidros laterais", "Retrovisores", "Farois", "Lanternas",
    "Setas", "Luz de freio", "Luz de re", "Buzina", "Limpador de para-brisa",
    "Pneus", "Estepe", "Macaco", "Chave de roda", "Triangulo",
    "Cinto de seguranca", "Painel sem alerta", "Nivel de oleo",
    "Agua/arrefecimento", "Fluido de freio", "Combustivel", "Interior limpo",
    "Porta-malas limpo", "Ar-condicionado", "Freios", "Direcao",
    "Documentos do veiculo", "Chave", "Odor interno / asseio"
  ];

  const FROTA_CHECKLIST_PREVENTIVA = [
    "Troca de oleo", "Filtro de oleo", "Filtro de ar", "Filtro de combustivel",
    "Filtro de cabine", "Alinhamento", "Balanceamento", "Rodizio de pneus",
    "Freios", "Pastilhas", "Discos/tambores", "Fluido de freio",
    "Agua/arrefecimento", "Bateria", "Correias", "Suspensao", "Amortecedores",
    "Luzes", "Limpadores", "Pneus", "Estepe", "Higienizacao/limpeza", "Documentacao"
  ];

  const FROTA_FRASES_ZELO = [
    "Cuide do veiculo como uma ferramenta de trabalho: zelo hoje evita atraso amanha.",
    "O veiculo da empresa e patrimonio coletivo. Use com responsabilidade.",
    "A conservacao do carro comeca na forma como ele e conduzido.",
    "Quem cuida do veiculo, cuida da operacao e respeita a equipe.",
    "Atrasos, pneus danificados e avarias evitaveis prejudicam toda a missao.",
    "Zelar pelo veiculo e respeitar o colega que vai utiliza-lo depois.",
    "Uma vistoria bem feita evita prejuizo, atraso e desgaste com o cliente."
  ];

  function frotaSheet_(nome) {
    try {
      return SGO_DATA.getSheet(nome, DB);
    } catch (e) {
      throw new Error("Estrutura nova da Frota ainda nao foi criada. Execute setupFrotaNovaDev. Detalhe: " + e.message);
    }
  }

  function frotaAll_(nome) {
    frotaSheet_(nome);
    return SGO_DATA.getAll(nome, DB) || [];
  }

  function frotaAppend_(nome, objeto) {
    frotaSheet_(nome);
    return SGO_DATA.insert(nome, objeto || {}, DB);
  }

  function frotaUpdate_(nome, id, patch) {
    frotaSheet_(nome);
    const ok = SGO_DATA.update(nome, SGO_UTILS.safe(id), patch || {}, DB);
    if (!ok) throw new Error("Registro nao encontrado para atualizacao: " + id);
    return SGO_DATA.getById(nome, SGO_UTILS.safe(id), DB);
  }

  function frotaFindById_(nome, id) {
    if (!id) return null;
    frotaSheet_(nome);
    return SGO_DATA.getById(nome, SGO_UTILS.safe(id), DB);
  }

  function frotaUUID_() {
    return SGO_UTILS.uuid();
  }

  function frotaNow_() {
    return SGO_UTILS.nowIso();
  }

  function frotaUser_(session) {
    return {
      id: SGO_UTILS.safe(session && (session.userId || session.id || session.usuarioId)),
      nome: SGO_UTILS.safe(session && (session.nome || session.usuario || session.email)),
      perfil: SGO_UTILS.safeUpper(session && session.perfil)
    };
  }

  function frotaLog_(acao, dados) {
    try {
      const payload = dados || {};
      const session = payload.session || {};
      const user = frotaUser_(session);
      frotaAppend_(FROTA_ABAS.LOGS, {
        ID: frotaUUID_(),
        ACAO: acao,
        MODULO: payload.modulo || "FROTA",
        REFERENCIA_ID: payload.referenciaId || "",
        VEICULO_ID: payload.veiculoId || "",
        PLACA: payload.placa || "",
        USUARIO_ID: user.id,
        USUARIO_NOME: user.nome,
        DATA_HORA: frotaNow_(),
        ANTES_JSON: payload.antes ? JSON.stringify(payload.antes) : "",
        DEPOIS_JSON: payload.depois ? JSON.stringify(payload.depois) : "",
        OBSERVACOES: payload.observacoes || ""
      });
    } catch (e) {
      Logger.log("FROTA_LOG_ERRO: " + e.message);
    }
  }

  function frotaErro_(mensagem) {
    return { ok: false, success: false, message: mensagem, mensagem: mensagem };
  }

  function frotaOk_(dados) {
    const base = Object.assign({}, dados || {});
    if (base.ok !== false) base.ok = true;
    if (base.success !== false) base.success = base.ok !== false;
    if (!base.message && base.mensagem) base.message = base.mensagem;
    if (!base.mensagem && base.message) base.mensagem = base.message;
    return base;
  }

  function frotaParseNumero_(valor) {
    if (valor === null || valor === undefined || valor === "") return 0;
    if (typeof valor === "number") return isNaN(valor) ? 0 : valor;
    const n = Number(String(valor).trim().replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function frotaParseData_(valor) {
    if (!valor) return null;
    if (Object.prototype.toString.call(valor) === "[object Date]") {
      return isNaN(valor.getTime()) ? null : valor;
    }
    const s = String(valor).trim();
    const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
    if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]), Number(br[4] || 0), Number(br[5] || 0));
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function frotaNormalizarTexto_(valor) {
    return SGO_UTILS.safeUpper(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function frotaNormalizarPlaca_(placa) {
    return SGO_UTILS.safeUpper(placa).replace(/[^A-Z0-9]/g, "");
  }

  function frotaNormalizarStatusVeiculo_(status) {
    const raw = frotaNormalizarTexto_(status || FROTA_STATUS_VEICULO.DISPONIVEL);
    const mapa = {
      DISPONIVEL: FROTA_STATUS_VEICULO.DISPONIVEL,
      DISPONIVEL_: FROTA_STATUS_VEICULO.DISPONIVEL,
      RESERVADO: FROTA_STATUS_VEICULO.RESERVADO,
      EM_USO: FROTA_STATUS_VEICULO.EM_USO,
      MANUTENCAO: FROTA_STATUS_VEICULO.EM_MANUTENCAO,
      EM_MANUTENCAO: FROTA_STATUS_VEICULO.EM_MANUTENCAO,
      BLOQUEADO: FROTA_STATUS_VEICULO.BLOQUEADO,
      DOCUMENTACAO_VENCIDA: FROTA_STATUS_VEICULO.DOCUMENTACAO_VENCIDA,
      PREVENTIVA_VENCIDA: FROTA_STATUS_VEICULO.PREVENTIVA_VENCIDA,
      SINISTRO_AVARIA: FROTA_STATUS_VEICULO.SINISTRO_AVARIA,
      INATIVO: FROTA_STATUS_VEICULO.INATIVO
    };
    return mapa[raw] || FROTA_STATUS_VEICULO.DISPONIVEL;
  }

  function frotaBuscarVeiculo_(idOuPlaca) {
    const alvo = SGO_UTILS.safe(idOuPlaca);
    const placa = frotaNormalizarPlaca_(idOuPlaca);
    if (!alvo && !placa) return null;
    const veiculos = frotaAll_(FROTA_ABAS.VEICULOS);
    return veiculos.find(function(v) {
      return SGO_UTILS.safe(v.ID) === alvo ||
        SGO_UTILS.safe(v.VEICULO_ID) === alvo ||
        frotaNormalizarPlaca_(v.PLACA) === placa;
    }) || null;
  }

  function frotaBool_(valor) {
    const s = frotaNormalizarTexto_(valor);
    return s === "SIM" || s === "TRUE" || s === "1" || s === "BLOQUEADO";
  }

  function frotaReservaConflitante_(veiculo, inicio, fim, condutor) {
    const ini = frotaParseData_(inicio) || new Date();
    const end = frotaParseData_(fim) || ini;
    const condutorId = SGO_UTILS.safe(condutor);
    const reservas = frotaAll_(FROTA_ABAS.RESERVAS);
    const statusAtivos = [FROTA_STATUS_RESERVA.RESERVADO, FROTA_STATUS_RESERVA.EM_USO];
    const conflito = reservas.find(function(r) {
      const mesmoVeiculo = SGO_UTILS.safe(r.VEICULO_ID) === SGO_UTILS.safe(veiculo.ID) ||
        frotaNormalizarPlaca_(r.PLACA) === frotaNormalizarPlaca_(veiculo.PLACA);
      if (!mesmoVeiculo) return false;
      if (statusAtivos.indexOf(frotaNormalizarTexto_(r.STATUS)) < 0) return false;
      if (condutorId && SGO_UTILS.safe(r.RESPONSAVEL_ID) === condutorId) return false;
      const rIni = frotaParseData_(r.DATA_HORA_INICIO);
      const rFim = frotaParseData_(r.DATA_HORA_FIM);
      if (!rIni || !rFim) return false;
      return rIni <= end && rFim >= ini;
    });

    if (!conflito) return { conflito: false, reserva: null, mensagem: "" };
    return {
      conflito: true,
      reserva: conflito,
      mensagem: "Este veiculo esta reservado para " + (conflito.RESPONSAVEL_NOME || "outro responsavel") +
        " no periodo de " + (conflito.DATA_HORA_INICIO || "") + " ate " + (conflito.DATA_HORA_FIM || "") +
        ", motivo: " + (conflito.MOTIVO || "") + ". Verifique outro veiculo disponivel."
    };
  }

  function frotaMovimentoAberto_(veiculo) {
    const movimentos = frotaAll_(FROTA_ABAS.MOVIMENTOS);
    const aberto = movimentos.find(function(m) {
      const mesmoVeiculo = SGO_UTILS.safe(m.VEICULO_ID) === SGO_UTILS.safe(veiculo.ID) ||
        frotaNormalizarPlaca_(m.PLACA) === frotaNormalizarPlaca_(veiculo.PLACA);
      if (!mesmoVeiculo) return false;
      const status = frotaNormalizarTexto_(m.STATUS);
      return [FROTA_STATUS_MOVIMENTO.ABERTO, FROTA_STATUS_MOVIMENTO.EM_USO].indexOf(status) >= 0 &&
        !SGO_UTILS.safe(m.DATA_HORA_CHECKOUT);
    });
    return {
      aberto: !!aberto,
      movimento: aberto || null,
      mensagem: aberto ? "Veiculo possui check-out pendente." : ""
    };
  }

  function frotaDocumentacaoVencida_(veiculo) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const campos = ["DOCUMENTACAO_VENCE", "SEGURO_VENCE", "IPVA_VENCE", "LICENCIAMENTO_VENCE"];
    for (let i = 0; i < campos.length; i++) {
      const d = frotaParseData_(veiculo[campos[i]]);
      if (d && d < hoje) {
        return { vencida: true, motivo: campos[i] + " vencido em " + veiculo[campos[i]] };
      }
    }
    return { vencida: false, motivo: "" };
  }

  function frotaPreventivaStatus_(veiculo) {
    const kmAtual = frotaParseNumero_(veiculo.KM_ATUAL);
    const kmLimite = frotaParseNumero_(veiculo.PROXIMA_PREVENTIVA_KM);
    if (!kmLimite) {
      return { vencida: false, alerta: false, nivel: "OK", kmAtual: kmAtual, kmLimite: 0, kmRestante: 0, mensagem: "" };
    }
    const restante = kmLimite - kmAtual;
    if (restante < 0) return { vencida: true, alerta: true, nivel: "BLOQUEIO", kmAtual: kmAtual, kmLimite: kmLimite, kmRestante: restante, mensagem: "Preventiva vencida por KM." };
    if (restante === 0) return { vencida: true, alerta: true, nivel: "VERMELHO", kmAtual: kmAtual, kmLimite: kmLimite, kmRestante: restante, mensagem: "Preventiva no limite de KM." };
    if (restante <= 500) return { vencida: false, alerta: true, nivel: "LARANJA", kmAtual: kmAtual, kmLimite: kmLimite, kmRestante: restante, mensagem: "Preventiva a menos de 500 km." };
    if (restante <= 1000) return { vencida: false, alerta: true, nivel: "AMARELO", kmAtual: kmAtual, kmLimite: kmLimite, kmRestante: restante, mensagem: "Preventiva a menos de 1000 km." };
    return { vencida: false, alerta: false, nivel: "OK", kmAtual: kmAtual, kmLimite: kmLimite, kmRestante: restante, mensagem: "" };
  }

  function frotaManutencaoBloqueante_(veiculo) {
    const manutencoes = frotaAll_(FROTA_ABAS.MANUTENCOES);
    const item = manutencoes.find(function(m) {
      const mesmoVeiculo = SGO_UTILS.safe(m.VEICULO_ID) === SGO_UTILS.safe(veiculo.ID) ||
        frotaNormalizarPlaca_(m.PLACA) === frotaNormalizarPlaca_(veiculo.PLACA);
      if (!mesmoVeiculo) return false;
      const status = frotaNormalizarTexto_(m.STATUS);
      return ["ABERTA", "EM_OFICINA", "BLOQUEADA"].indexOf(status) >= 0 || frotaBool_(m.BLOQUEANTE);
    });
    return {
      bloqueante: !!item,
      manutencao: item || null,
      mensagem: item ? "Veiculo possui manutencao bloqueante." : ""
    };
  }

  function frotaRegistrarAlerta_(dados) {
    try {
      const payload = dados || {};
      const alerta = frotaAppend_(FROTA_ABAS.ALERTAS, {
        ID: payload.ID || frotaUUID_(),
        VEICULO_ID: payload.VEICULO_ID || "",
        PLACA: payload.PLACA || "",
        TIPO_ALERTA: payload.TIPO_ALERTA || "MOVIMENTO",
        NIVEL: payload.NIVEL || FROTA_NIVEIS_ALERTA.INFO,
        MENSAGEM: payload.MENSAGEM || "",
        STATUS: payload.STATUS || "ABERTO",
        DATA_ALERTA: payload.DATA_ALERTA || frotaNow_(),
        DATA_LIMITE: payload.DATA_LIMITE || "",
        BLOQUEANTE: payload.BLOQUEANTE || "NAO",
        ORIGEM: payload.ORIGEM || "FROTA",
        REFERENCIA_ID: payload.REFERENCIA_ID || "",
        CRIADO_EM: payload.CRIADO_EM || frotaNow_(),
        CRIADO_POR: payload.CRIADO_POR || ""
      });
      return alerta;
    } catch (e) {
      Logger.log("FROTA_ALERTA_ERRO: " + e.message);
      return null;
    }
  }

  function frotaFraseZelo_() {
    return FROTA_FRASES_ZELO[Math.floor(Math.random() * FROTA_FRASES_ZELO.length)];
  }

  function frotaCalcularConsumo_(veiculo, abastecimento) {
    const litros = frotaParseNumero_(abastecimento.LITROS);
    const valorTotal = frotaParseNumero_(abastecimento.VALOR_TOTAL);
    const km = frotaParseNumero_(abastecimento.KM);
    const valorLitro = litros > 0 ? valorTotal / litros : 0;
    const abastecimentos = frotaAll_(FROTA_ABAS.ABASTECIMENTOS)
      .filter(function(a) {
        return SGO_UTILS.safe(a.VEICULO_ID) === SGO_UTILS.safe(veiculo.ID) &&
          SGO_UTILS.safe(a.ID) !== SGO_UTILS.safe(abastecimento.ID);
      })
      .sort(function(a, b) {
        return frotaParseNumero_(b.KM) - frotaParseNumero_(a.KM);
      });
    const anterior = abastecimentos.find(function(a) { return frotaParseNumero_(a.KM) < km; });
    const kmRodado = anterior ? Math.max(0, km - frotaParseNumero_(anterior.KM)) : 0;
    return {
      VALOR_LITRO: valorLitro,
      KM_RODADO_CALCULADO: kmRodado,
      CONSUMO_KM_L: litros > 0 && kmRodado > 0 ? kmRodado / litros : 0,
      CUSTO_KM: kmRodado > 0 ? valorTotal / kmRodado : 0,
      CALCULO_CONSOLIDADO: frotaNormalizarTexto_(abastecimento.TANQUE_CHEIO) === "SIM" ? "SIM" : "ESTIMADO"
    };
  }

  function frotaFiltrarPeriodo_(items, campo, inicio, fim) {
    const ini = frotaParseData_(inicio);
    const end = frotaParseData_(fim);
    if (end) end.setHours(23, 59, 59, 999);
    return (items || []).filter(function(item) {
      const d = frotaParseData_(item[campo]);
      if (!d) return true;
      if (ini && d < ini) return false;
      if (end && d > end) return false;
      return true;
    });
  }

  function frotaAgruparPor_(items, campo) {
    return (items || []).reduce(function(acc, item) {
      const key = SGO_UTILS.safe(item[campo]) || "NAO_INFORMADO";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }

  function frotaSoma_(items, campo) {
    return (items || []).reduce(function(total, item) {
      return total + frotaParseNumero_(item[campo]);
    }, 0);
  }

  function frotaRanking_(items, idCampo, valorCampo, limite) {
    const grupos = frotaAgruparPor_(items, idCampo);
    return Object.keys(grupos).map(function(key) {
      const lista = grupos[key];
      return { chave: key, valor: frotaSoma_(lista, valorCampo), total: lista.length };
    }).sort(function(a, b) {
      return b.valor - a.valor;
    }).slice(0, limite || 10);
  }

  function frotaStatsCombustivel_(abastecimentos) {
    const grupos = frotaAgruparPor_(abastecimentos || [], "TIPO_COMBUSTIVEL");
    const out = {};
    Object.keys(grupos).forEach(function(tipo) {
      const lista = grupos[tipo];
      const litros = frotaSoma_(lista, "LITROS");
      const gasto = frotaSoma_(lista, "VALOR_TOTAL");
      const km = frotaSoma_(lista, "KM_RODADO_CALCULADO");
      out[tipo] = {
        litros: litros,
        gasto: gasto,
        km: km,
        mediaKmL: litros > 0 && km > 0 ? km / litros : 0,
        custoKm: km > 0 ? gasto / km : 0
      };
    });
    return out;
  }

  function frotaSalvarUploadDrive_(session, payload) {
    const dados = payload || {};
    const base64 = SGO_UTILS.safe(dados.base64 || dados.BASE64 || dados.ARQUIVO_BASE64 || dados.BASE64_DATA);
    if (!base64) throw new Error("Arquivo nao informado para upload.");
    const mimeType = SGO_UTILS.safe(dados.mimeType || dados.MIME_TYPE || "image/jpeg");
    const nomeArquivo = SGO_UTILS.safe(dados.nomeArquivo || dados.NOME_ARQUIVO || ("frota_" + frotaUUID_() + ".jpg"));
    const conteudo = base64.indexOf(",") >= 0 ? base64.split(",").pop() : base64;
    const blob = Utilities.newBlob(Utilities.base64Decode(conteudo), mimeType, nomeArquivo);
    const folderId = sgoGetCfgSafe_().DRIVE.FOLDER_FROTA || sgoGetCfgSafe_().DRIVE.FOLDER_DOCUMENTOS || sgoGetCfgSafe_().DRIVE.FOLDER_BASE;
    const file = folderId ? DriveApp.getFolderById(folderId).createFile(blob) : DriveApp.createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    const user = frotaUser_(session);
    const row = frotaAppend_(FROTA_ABAS.UPLOADS, {
      ID: frotaUUID_(),
      VEICULO_ID: dados.veiculoId || dados.VEICULO_ID || "",
      PLACA: frotaNormalizarPlaca_(dados.placa || dados.PLACA || ""),
      MOVIMENTO_ID: dados.movimentoId || dados.MOVIMENTO_ID || "",
      MODULO_ORIGEM: dados.moduloOrigem || dados.MODULO_ORIGEM || "FROTA",
      REFERENCIA_ID: dados.referenciaId || dados.REFERENCIA_ID || "",
      TIPO_ARQUIVO: dados.tipoArquivo || dados.TIPO_ARQUIVO || "EVIDENCIA",
      NOME_ARQUIVO: nomeArquivo,
      MIME_TYPE: mimeType,
      DRIVE_FILE_ID: file.getId(),
      LINK_VISUALIZACAO: file.getUrl(),
      LINK_DOWNLOAD: "https://drive.google.com/uc?export=download&id=" + file.getId(),
      CRIADO_EM: frotaNow_(),
      CRIADO_POR: user.nome || user.id
    });
    return row;
  }

  function frotaExigirPerfilDocumento_(session) {
    const perfil = frotaUser_(session).perfil;
    if (["ADMIN", "GESTOR", "DIRETORIA"].indexOf(perfil) < 0) {
      throw new Error("Perfil sem permissao para gerar documentos da Frota: " + (perfil || "NAO_INFORMADO"));
    }
  }

  function frotaDataArquivo_() {
    return Utilities.formatDate(new Date(), sgoGetCfgSafe_().SISTEMA.TIMEZONE || Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
  }

  function frotaSanitizarNomeArquivo_(valor) {
    return SGO_UTILS.safe(valor || "FROTA_DOCUMENTO")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .substring(0, 150);
  }

  function frotaDocEsc_(valor) {
    return String(valor == null ? "" : valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function frotaDocMoney_(valor) {
    const n = frotaParseNumero_(valor);
    return "R$ " + n.toFixed(2).replace(".", ",");
  }

  function frotaDocNumero_(valor) {
    const n = frotaParseNumero_(valor);
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",");
  }

  function frotaDataBR_(valor) {
    const raw = SGO_UTILS.safe(valor);
    if (!raw) return "";
    try {
      const data = new Date(raw);
      if (!isNaN(data.getTime()) && data.getFullYear() >= 2000) {
        return Utilities.formatDate(data, sgoGetCfgSafe_().SISTEMA.TIMEZONE || Session.getScriptTimeZone(), "dd/MM/yyyy");
      }
    } catch (e) {}
    return raw;
  }

  function frotaPeriodoLabel_(inicio, fim) {
    const ini = frotaDataBR_(inicio);
    const ate = frotaDataBR_(fim);
    if (ini && ate) return "de " + ini + " ate " + ate;
    if (ini) return "a partir de " + ini;
    if (ate) return "ate " + ate;
    return "Periodo nao informado";
  }

  function frotaDocValor_(valor) {
    if (valor === null || valor === undefined || valor === "") return "--";
    if (typeof valor === "number") return frotaDocNumero_(valor);
    return SGO_UTILS.safe(valor) || "--";
  }

  function frotaDocMeta_(label, valor) {
    return "<div class=\"df-meta frota-pdf-metric\"><div class=\"df-meta-k\">" + frotaDocEsc_(label) +
      "</div><div class=\"df-meta-v\">" + frotaDocEsc_(frotaDocValor_(valor)) + "</div></div>";
  }

  function frotaDocTabela_(titulo, items, campos) {
    const linhas = (items || []).slice(0, 80).map(function(item) {
      return "<tr>" + campos.map(function(c) {
        return "<td>" + frotaDocEsc_(frotaDocValor_(item[c])) + "</td>";
      }).join("") + "</tr>";
    }).join("");
    return "<div class=\"df-section frota-pdf-section\"><div class=\"df-section-title\">" + frotaDocEsc_(titulo) + "</div>" +
      "<table class=\"df-table\"><thead><tr>" + campos.map(function(c) {
        return "<th>" + frotaDocEsc_(c.replace(/_/g, " ")) + "</th>";
      }).join("") + "</tr></thead><tbody>" +
      (linhas || "<tr><td colspan=\"" + campos.length + "\">Não foram encontrados registros desta categoria no período analisado. Recomenda-se manter a rotina de lançamento operacional para garantir rastreabilidade completa.</td></tr>") +
      "</tbody></table></div>";
  }

  function frotaDocNota_(titulo, texto) {
    return "<div class=\"df-section frota-pdf-section\"><div class=\"df-section-title\">" + frotaDocEsc_(titulo) +
      "</div><div class=\"df-note\">" + frotaDocEsc_(texto || "--") + "</div></div>";
  }

  function frotaDocTabelaPremium_(titulo, items, campos) {
    const linhas = (items || []).slice(0, 80).map(function(item) {
      return "<tr>" + campos.map(function(c) {
        return "<td>" + frotaDocEsc_(frotaDocValor_(item[c])) + "</td>";
      }).join("") + "</tr>";
    }).join("");
    return "<div class=\"frota-panel\"><div class=\"frota-panel-head\">" + frotaDocEsc_(titulo) + "</div>" +
      "<table class=\"frota-table\"><thead><tr>" + campos.map(function(c) {
        return "<th>" + frotaDocEsc_(c.replace(/_/g, " ")) + "</th>";
      }).join("") + "</tr></thead><tbody>" +
      (linhas || "<tr><td colspan=\"" + campos.length + "\" class=\"frota-empty\">Nao ha registros desta categoria no periodo analisado. Recomenda-se manter a rotina de lancamento operacional para assegurar rastreabilidade historica e consistencia gerencial.</td></tr>") +
      "</tbody></table></div>";
  }

  function frotaDocNotaPremium_(titulo, texto) {
    return "<div class=\"frota-panel\"><div class=\"frota-panel-head\">" + frotaDocEsc_(titulo) +
      "</div><div class=\"frota-note\">" + frotaDocEsc_(texto || "--") + "</div></div>";
  }

  function frotaPdfCard_(label, valor, tom) {
    return "<div class=\"frota-card " + (tom || "") + "\"><div class=\"frota-card-label\">" + frotaDocEsc_(label) +
      "</div><div class=\"frota-card-value\">" + frotaDocEsc_(frotaDocValor_(valor)) + "</div></div>";
  }

  function frotaPdfSection_(titulo, corpo, classe) {
    return "<section class=\"frota-section " + (classe || "") + "\"><div class=\"frota-section-title\">" +
      frotaDocEsc_(titulo) + "</div>" + corpo + "</section>";
  }

  function frotaPdfInsight_(titulo, texto, tom) {
    return "<div class=\"frota-insight " + (tom || "") + "\"><div class=\"frota-insight-title\">" +
      frotaDocEsc_(titulo) + "</div><div>" + frotaDocEsc_(texto || "--") + "</div></div>";
  }

  function frotaTipoDocumentoNome_(tipo) {
    const mapa = {
      FROTA_RELATORIO_VEICULO: "Relatório Individual de Veículo",
      FROTA_RELATORIO_GERAL: "Relatório Geral da Frota",
      FROTA_TERMO_MULTA: "Termo de Ciência e Responsabilidade por Infração de Trânsito"
    };
    return mapa[frotaNormalizarTexto_(tipo)] || tipo || "Documento da Frota";
  }

  function frotaPdfPremiumCss_() {
    return "<style>" +
      ".frota-pdf{font-family:Arial,Helvetica,sans-serif;color:#102033;background:#fff;font-size:10px;line-height:1.45}" +
      ".frota-pdf-hero{border-bottom:5px solid #0b7a3e;padding-bottom:14px;margin-bottom:14px;display:grid;grid-template-columns:1fr 124px;gap:18px;align-items:start}" +
      ".frota-pdf-logo{height:92px;display:flex;align-items:center;margin-bottom:6px}.frota-pdf-logo img{max-width:330px;max-height:92px;display:block}.frota-pdf-logo-fallback{font-size:34px;font-weight:900;color:#0b3b78;letter-spacing:.04em}" +
      ".frota-pdf-sub{font-size:8px;color:#667085;text-transform:uppercase;font-weight:900;letter-spacing:.1em}" +
      ".frota-pdf-title{font-size:25px;font-weight:900;color:#0b3b78;text-transform:uppercase;margin:10px 0 4px;line-height:1.08}.frota-pdf-lead{font-size:10px;color:#475467;font-weight:700}" +
      ".frota-pdf-qr{border:1px solid #dfe6ee;border-radius:8px;padding:8px;text-align:center;background:#fff}.frota-pdf-qr img{width:94px;height:94px;display:block;margin:0 auto}.frota-pdf-token{font-family:Consolas,Monaco,monospace;font-size:7px;color:#0b3b78;word-break:break-all;margin-top:5px;font-weight:900}" +
      ".frota-pdf-band{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:11px 0 13px}.frota-pdf-metric{border-left:4px solid #0b7a3e;background:#f8fafc}" +
      ".frota-pdf-section .df-section-title{font-size:8px;font-weight:900;color:#0b3b78;text-transform:uppercase;letter-spacing:.08em;border-left:4px solid #0b7a3e;padding-left:7px;margin:0 0 7px;background:transparent}" +
      ".frota-pdf .df-note{border:1px solid #dfe6ee;border-radius:6px;padding:9px;background:#fff;white-space:pre-line}.frota-pdf .df-table th{background:#0b3b78}.frota-pdf .df-table td{font-size:8.5px}" +
      ".frota-section{margin:13px 0;page-break-inside:avoid}.frota-section-title{background:#0b3b78;color:#fff;border-left:5px solid #0b7a3e;border-radius:5px 5px 0 0;padding:7px 9px;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}" +
      ".frota-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}.frota-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.frota-grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}" +
      ".frota-card{border:1px solid #d8e2ee;border-radius:7px;background:#fbfdff;padding:8px;min-height:43px}.frota-card-label{font-size:7px;color:#667085;font-weight:900;text-transform:uppercase;letter-spacing:.06em}.frota-card-value{font-size:13px;color:#102033;font-weight:900;margin-top:3px;word-break:break-word}.frota-card.ok{border-left:4px solid #0b7a3e}.frota-card.warn{border-left:4px solid #d97706}.frota-card.bad{border-left:4px solid #b42318}.frota-card.money{border-left:4px solid #0b3b78}" +
      ".frota-panel{border:1px solid #d8e2ee;border-radius:7px;background:#fff;margin:8px 0;overflow:hidden;page-break-inside:avoid}.frota-panel-head{background:#f1f5f9;color:#0b3b78;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.07em;padding:7px 9px;border-bottom:1px solid #d8e2ee}.frota-note{padding:9px;white-space:pre-line;font-size:9.6px;color:#334155}.frota-insight{border:1px solid #d8e2ee;border-radius:7px;padding:9px;background:#f8fafc;color:#334155;min-height:48px}.frota-insight-title{font-size:8px;color:#0b3b78;font-weight:900;text-transform:uppercase;margin-bottom:4px}.frota-insight.critical{border-color:#fecaca;background:#fff5f5}.frota-insight.good{border-color:#bbf7d0;background:#f0fdf4}.frota-insight.warn{border-color:#fed7aa;background:#fff7ed}" +
      ".frota-table{width:100%;border-collapse:collapse;font-size:8.2px}.frota-table th{background:#0b3b78;color:#fff;text-align:left;padding:6px 5px;font-size:7px;text-transform:uppercase;letter-spacing:.03em}.frota-table td{border-bottom:1px solid #e5e7eb;padding:5px;vertical-align:top}.frota-table tbody tr:nth-child(even) td{background:#f8fafc}.frota-empty{color:#64748b;font-weight:700;line-height:1.45;background:#fbfdff!important}" +
      ".frota-pdf-conclusion{border:2px solid #0b7a3e;background:#f0fdf4;border-radius:8px;padding:11px;margin-top:14px;font-weight:800;color:#14532d}" +
      ".frota-pdf-footer{margin-top:15px;border-top:1px solid #dfe6ee;padding-top:8px;color:#667085;font-size:8px;display:grid;grid-template-columns:1fr;gap:3px}" +
      "</style>";
  }

  function frotaPdfHero_(titulo, subtitulo) {
    return frotaPdfPremiumCss_() +
      "<div class=\"frota-pdf-hero\"><div><div class=\"frota-pdf-logo\">{{LOGO_METROLABS_HTML}}</div><div class=\"frota-pdf-sub\">SGO+ Frota Operacional</div>" +
      "<div class=\"frota-pdf-title\">" + frotaDocEsc_(titulo) + "</div><div class=\"frota-pdf-lead\">" + frotaDocEsc_(subtitulo || "") + "</div></div>" +
      "<div class=\"frota-pdf-qr\"><img src=\"{{QRCODE_DATA_URL}}\"><div class=\"frota-pdf-token\">{{TOKEN_VALIDACAO}}</div></div></div>";
  }

  function frotaPdfFooter_() {
    return "<div class=\"frota-pdf-footer\"><div><strong>Validação:</strong> {{URL_VALIDACAO}}</div><div><strong>Token:</strong> {{TOKEN_VALIDACAO}}</div><div><strong>Hash SHA256:</strong> {{HASH_SHA256}}</div></div>";
  }

  function frotaMesmoVeiculo_(item, veiculo) {
    return SGO_UTILS.safe(item.VEICULO_ID) === SGO_UTILS.safe(veiculo.ID) ||
      frotaNormalizarPlaca_(item.PLACA) === frotaNormalizarPlaca_(veiculo.PLACA);
  }

  function frotaFiltrarVeiculoPeriodo_(items, veiculo, campoData, inicio, fim) {
    const porVeiculo = (items || []).filter(function(item) { return frotaMesmoVeiculo_(item, veiculo); });
    return frotaFiltrarPeriodo_(porVeiculo, campoData, inicio, fim);
  }

  function frotaConsolidarRelatorioVeiculo_(veiculo, inicio, fim) {
    const movimentos = frotaFiltrarVeiculoPeriodo_(frotaAll_(FROTA_ABAS.MOVIMENTOS), veiculo, "DATA_HORA_CHECKIN", inicio, fim);
    const abastecimentos = frotaFiltrarVeiculoPeriodo_(frotaAll_(FROTA_ABAS.ABASTECIMENTOS), veiculo, "DATA_HORA", inicio, fim);
    const manutencoes = frotaFiltrarVeiculoPeriodo_(frotaAll_(FROTA_ABAS.MANUTENCOES), veiculo, "DATA_ENTRADA", inicio, fim);
    const lavagens = frotaFiltrarVeiculoPeriodo_(frotaAll_(FROTA_ABAS.LAVAGENS), veiculo, "DATA_HORA", inicio, fim);
    const multas = frotaFiltrarVeiculoPeriodo_(frotaAll_(FROTA_ABAS.MULTAS), veiculo, "DATA_HORA_INFRACAO", inicio, fim);
    const reservas = frotaFiltrarVeiculoPeriodo_(frotaAll_(FROTA_ABAS.RESERVAS), veiculo, "DATA_HORA_INICIO", inicio, fim);
    const vistorias = frotaFiltrarVeiculoPeriodo_(frotaAll_(FROTA_ABAS.VISTORIAS), veiculo, "DATA_HORA", inicio, fim);
    const alertas = frotaFiltrarVeiculoPeriodo_(frotaAll_(FROTA_ABAS.ALERTAS), veiculo, "DATA_ALERTA", inicio, fim);
    const uploads = frotaFiltrarVeiculoPeriodo_(frotaAll_(FROTA_ABAS.UPLOADS), veiculo, "CRIADO_EM", inicio, fim);
    const kmRodado = frotaSoma_(movimentos, "KM_RODADO");
    const gastoCombustivel = frotaSoma_(abastecimentos, "VALOR_TOTAL");
    const gastoManutencao = frotaSoma_(manutencoes, "CUSTO_TOTAL");
    const gastoLavagem = frotaSoma_(lavagens, "VALOR");
    const gastoMultas = frotaSoma_(multas, "VALOR");
    const custoTotal = gastoCombustivel + gastoManutencao + gastoLavagem + gastoMultas;
    const doc = frotaDocumentacaoVencida_(veiculo);
    const preventiva = frotaPreventivaStatus_(veiculo);
    return {
      veiculo: veiculo,
      periodo: {
        inicio: inicio || "",
        fim: fim || "",
        PERIODO_INICIAL: inicio || "",
        PERIODO_FINAL: fim || "",
        PERIODO_LABEL: frotaPeriodoLabel_(inicio, fim)
      },
      reservas: reservas,
      movimentos: movimentos,
      vistorias: vistorias,
      abastecimentos: abastecimentos,
      manutencoes: manutencoes,
      lavagens: lavagens,
      multas: multas,
      alertas: alertas,
      uploads: uploads,
      combustivel: frotaStatsCombustivel_(abastecimentos),
      resumo: {
        kmRodado: kmRodado,
        gastoCombustivel: gastoCombustivel,
        gastoManutencao: gastoManutencao,
        gastoLavagem: gastoLavagem,
        gastoMultas: gastoMultas,
        custoTotal: custoTotal,
        custoPorKm: kmRodado > 0 ? custoTotal / kmRodado : 0,
        documentacao: doc.vencida ? doc.motivo : "Regular",
        preventiva: preventiva.mensagem || "Sem alerta"
      }
    };
  }

  function frotaAnaliseVeiculo_(dados) {
    const r = dados.resumo;
    const pontos = [];
    pontos.push("O veiculo " + (dados.veiculo.PLACA || "--") + " registrou " + frotaDocNumero_(r.kmRodado) + " km no periodo analisado.");
    pontos.push("O custo total consolidado foi de " + frotaDocMoney_(r.custoTotal) + ", com custo medio de " + frotaDocMoney_(r.custoPorKm) + " por km.");
    if (dados.alertas.length) pontos.push("Existem " + dados.alertas.length + " alerta(s) operacional(is) vinculados ao veiculo.");
    if (dados.multas.length) pontos.push("Foram registradas " + dados.multas.length + " multa(s) no periodo.");
    if (r.documentacao !== "Regular") pontos.push("Atencao documental: " + r.documentacao + ".");
    return pontos.join("\n");
  }

  function frotaRecomendacoesVeiculo_(dados) {
    const rec = [];
    if (dados.resumo.custoPorKm > 0) rec.push("Acompanhar custo por km e comparar com a media esperada do veiculo.");
    if (dados.resumo.preventiva !== "Sem alerta") rec.push("Priorizar a preventiva indicada para reduzir risco de parada operacional.");
    if (dados.multas.length) rec.push("Reforcar ciencia do condutor e politica interna de uso responsavel.");
    if (!rec.length) rec.push("Manter rotina atual de vistorias, abastecimentos e registros fotograficos.");
    return rec.join("\n");
  }

  function frotaHtmlRelatorioVeiculo_(dados, meta) {
    const v = dados.veiculo;
    const r = dados.resumo;
    const titulo = frotaTipoDocumentoNome_("FROTA_RELATORIO_VEICULO");
    const periodo = dados.periodo.PERIODO_LABEL || frotaPeriodoLabel_(meta.inicio, meta.fim);
    const combustivel = Object.keys(dados.combustivel || {}).map(function(tipo) {
      const c = dados.combustivel[tipo];
      return { TIPO_COMBUSTIVEL: tipo, LITROS: c.litros, GASTO: frotaDocMoney_(c.gasto), MEDIA_KM_L: c.mediaKmL, CUSTO_KM: frotaDocMoney_(c.custoKm) };
    });
    return "<div class=\"df-doc frota-pdf\">" +
      frotaPdfHero_(titulo, "Frota Operacional | Período analisado: " + periodo) +
      "<div class=\"frota-pdf-band\">" +
      frotaDocMeta_("Placa", v.PLACA) + frotaDocMeta_("Status atual", v.STATUS) + frotaDocMeta_("KM atual", v.KM_ATUAL) + frotaDocMeta_("Documentacao", r.documentacao) +
      frotaDocMeta_("KM rodado", r.kmRodado) + frotaDocMeta_("Combustivel", frotaDocMoney_(r.gastoCombustivel)) + frotaDocMeta_("Custo total", frotaDocMoney_(r.custoTotal)) + frotaDocMeta_("Custo/km", frotaDocMoney_(r.custoPorKm)) +
      "</div>" +
      frotaDocNota_("Resumo gerencial", "Documento executivo de acompanhamento do veículo " + (v.PLACA || "--") + ", consolidando uso, custos, consumo, manutenção, lavagens, multas, alertas e evidências operacionais do período analisado.") +
      frotaDocNota_("Identificacao do veiculo", [
        "Marca/modelo: " + [v.MARCA, v.MODELO].filter(Boolean).join(" "),
        "Ano/cor: " + [v.ANO, v.COR].filter(Boolean).join(" / "),
        "Combustivel padrao: " + (v.COMBUSTIVEL_PADRAO || "--"),
        "Renavam/chassi: " + [v.RENAVAM, v.CHASSI].filter(Boolean).join(" / "),
        "Preventiva: " + r.preventiva
      ].join("\n")) +
      frotaPdfSection_("Custos consolidados", "<div class=\"frota-grid-4\">" +
        frotaPdfCard_("Combustivel", frotaDocMoney_(r.gastoCombustivel), "money") +
        frotaPdfCard_("Manutencao", frotaDocMoney_(r.gastoManutencao), "money") +
        frotaPdfCard_("Lavagens", frotaDocMoney_(r.gastoLavagem), "money") +
        frotaPdfCard_("Multas", frotaDocMoney_(r.gastoMultas), dados.multas.length ? "warn" : "ok") +
      "</div>") +
      frotaPdfSection_("Consumo por combustivel", frotaDocTabelaPremium_("Consolidado de abastecimento", combustivel, ["TIPO_COMBUSTIVEL", "LITROS", "GASTO", "MEDIA_KM_L", "CUSTO_KM"])) +
      frotaPdfSection_("Historico de uso", frotaDocTabelaPremium_("Reservas", dados.reservas, ["PLACA", "RESPONSAVEL_NOME", "DATA_HORA_INICIO", "DATA_HORA_FIM", "MOTIVO", "DESTINO", "STATUS"]) + frotaDocTabelaPremium_("Check-ins e check-outs", dados.movimentos, ["PLACA", "CONDUTOR_NOME", "STATUS", "DATA_HORA_CHECKIN", "DATA_HORA_CHECKOUT", "KM_SAIDA", "KM_CHEGADA", "KM_RODADO"])) +
      frotaPdfSection_("Manutencoes e lavagens", frotaDocTabelaPremium_("Manutencoes", dados.manutencoes, ["CATEGORIA", "TIPO_MANUTENCAO", "STATUS", "DATA_ENTRADA", "KM", "CUSTO_TOTAL", "PROXIMA_PREVENTIVA_KM"]) + frotaDocTabelaPremium_("Lavagens", dados.lavagens, ["DATA_HORA", "KM", "LOCAL", "TIPO_LAVAGEM", "VALOR"])) +
      frotaPdfSection_("Multas e alertas", frotaDocTabelaPremium_("Multas", dados.multas, ["CONDUTOR_NOME", "DATA_HORA_INFRACAO", "LOCAL_INFRACAO", "NUMERO_AUTO", "VALOR", "PONTUACAO", "STATUS"]) + frotaDocTabelaPremium_("Alertas", dados.alertas, ["NIVEL", "TIPO_ALERTA", "MENSAGEM", "STATUS", "DATA_ALERTA"])) +
      frotaPdfSection_("Evidencias", frotaDocTabelaPremium_("Uploads vinculados", dados.uploads, ["TIPO_ARQUIVO", "NOME_ARQUIVO", "LINK_VISUALIZACAO", "CRIADO_EM"])) +
      frotaPdfSection_("Ranking e criticidade", "<div class=\"frota-grid-3\">" +
        frotaPdfInsight_("Uso do veiculo", frotaAnaliseVeiculo_(dados), r.kmRodado > 0 ? "good" : "warn") +
        frotaPdfInsight_("Risco operacional", (dados.alertas.length ? "Ha alertas ativos ou historicos que exigem acompanhamento gerencial." : "Nao ha alertas relevantes no periodo analisado."), dados.alertas.length ? "critical" : "good") +
        frotaPdfInsight_("Custo e manutencao", "Custo por km de " + frotaDocMoney_(r.custoPorKm) + ". " + r.preventiva, r.preventiva === "Sem alerta" ? "" : "warn") +
      "</div>") +
      frotaPdfSection_("Recomendacoes gerenciais", frotaDocNotaPremium_("Plano sugerido", frotaRecomendacoesVeiculo_(dados))) +
      "<div class=\"frota-pdf-conclusion\">Conclusão executiva: o documento consolida a rastreabilidade operacional do veículo e permite auditoria por token, hash SHA256 e QR Code de validação pública. Recomenda-se revisar os pontos de custo, alertas e manutenção antes da próxima programação operacional.</div>" +
      frotaPdfFooter_() +
      "</div>";
  }

  function frotaConsolidarRelatorioGeral_(inicio, fim) {
    const veiculos = frotaAll_(FROTA_ABAS.VEICULOS);
    const movimentos = frotaFiltrarPeriodo_(frotaAll_(FROTA_ABAS.MOVIMENTOS), "DATA_HORA_CHECKIN", inicio, fim);
    const abastecimentos = frotaFiltrarPeriodo_(frotaAll_(FROTA_ABAS.ABASTECIMENTOS), "DATA_HORA", inicio, fim);
    const manutencoes = frotaFiltrarPeriodo_(frotaAll_(FROTA_ABAS.MANUTENCOES), "DATA_ENTRADA", inicio, fim);
    const lavagens = frotaFiltrarPeriodo_(frotaAll_(FROTA_ABAS.LAVAGENS), "DATA_HORA", inicio, fim);
    const multas = frotaFiltrarPeriodo_(frotaAll_(FROTA_ABAS.MULTAS), "DATA_HORA_INFRACAO", inicio, fim);
    const alertas = frotaFiltrarPeriodo_(frotaAll_(FROTA_ABAS.ALERTAS), "DATA_ALERTA", inicio, fim);
    const porStatus = {};
    veiculos.forEach(function(v) {
      const st = frotaNormalizarStatusVeiculo_(v.STATUS);
      porStatus[st] = (porStatus[st] || 0) + 1;
    });
    const kmRodado = frotaSoma_(movimentos, "KM_RODADO");
    const gastoCombustivel = frotaSoma_(abastecimentos, "VALOR_TOTAL");
    const gastoManutencao = frotaSoma_(manutencoes, "CUSTO_TOTAL");
    const gastoLavagem = frotaSoma_(lavagens, "VALOR");
    const gastoMultas = frotaSoma_(multas, "VALOR");
    const rankingUso = frotaRanking_(movimentos, "PLACA", "KM_RODADO", 10);
    const custos = [].concat(
      abastecimentos.map(function(a) { return { PLACA: a.PLACA, CUSTO: frotaParseNumero_(a.VALOR_TOTAL) }; }),
      manutencoes.map(function(m) { return { PLACA: m.PLACA, CUSTO: frotaParseNumero_(m.CUSTO_TOTAL) }; }),
      lavagens.map(function(l) { return { PLACA: l.PLACA, CUSTO: frotaParseNumero_(l.VALOR) }; }),
      multas.map(function(m) { return { PLACA: m.PLACA, CUSTO: frotaParseNumero_(m.VALOR) }; })
    );
    const rankingCusto = frotaRanking_(custos, "PLACA", "CUSTO", 10);
    const preventivasProximas = veiculos.filter(function(v) { const p = frotaPreventivaStatus_(v); return p.alerta && !p.vencida; });
    const preventivasVencidas = veiculos.filter(function(v) { return frotaPreventivaStatus_(v).vencida; });
    return {
      periodo: {
        inicio: inicio || "",
        fim: fim || "",
        PERIODO_INICIAL: inicio || "",
        PERIODO_FINAL: fim || "",
        PERIODO_LABEL: frotaPeriodoLabel_(inicio, fim)
      },
      veiculos: veiculos,
      movimentos: movimentos,
      abastecimentos: abastecimentos,
      manutencoes: manutencoes,
      lavagens: lavagens,
      multas: multas,
      alertas: alertas,
      rankingUso: rankingUso,
      rankingCusto: rankingCusto,
      preventivasProximas: preventivasProximas,
      resumo: {
        totalVeiculos: veiculos.length,
        disponiveis: porStatus.DISPONIVEL || 0,
        reservados: porStatus.RESERVADO || 0,
        emUso: porStatus.EM_USO || 0,
        emManutencao: porStatus.EM_MANUTENCAO || 0,
        bloqueados: (porStatus.BLOQUEADO || 0) + veiculos.filter(function(v) { return frotaBool_(v.BLOQUEADO); }).length,
        documentacaoVencida: veiculos.filter(function(v) { return frotaDocumentacaoVencida_(v).vencida; }).length,
        preventivaProxima: preventivasProximas.length,
        preventivaVencida: preventivasVencidas.length,
        kmRodado: kmRodado,
        gastoCombustivel: gastoCombustivel,
        gastoManutencao: gastoManutencao,
        gastoLavagem: gastoLavagem,
        gastoMultas: gastoMultas,
        custoMedioKm: kmRodado > 0 ? (gastoCombustivel + gastoManutencao + gastoLavagem + gastoMultas) / kmRodado : 0,
        veiculoMaisUtilizado: rankingUso[0] ? rankingUso[0].chave : "",
        veiculoMaisCaro: rankingCusto[0] ? rankingCusto[0].chave : "",
        veiculoMaisParado: "",
        alertasCriticos: alertas.filter(function(a) { return ["VERMELHO", "BLOQUEIO"].indexOf(frotaNormalizarTexto_(a.NIVEL)) >= 0; }).length
      }
    };
  }

  function frotaHtmlRelatorioGeral_(dados, meta) {
    const r = dados.resumo;
    const titulo = frotaTipoDocumentoNome_("FROTA_RELATORIO_GERAL");
    const periodo = dados.periodo.PERIODO_LABEL || frotaPeriodoLabel_(meta.inicio, meta.fim);
    return "<div class=\"df-doc frota-pdf\">" +
      frotaPdfHero_(titulo, "Painel executivo da Frota Operacional | Período analisado: " + periodo) +
      "<div class=\"frota-pdf-band\">" +
      frotaDocMeta_("Total veiculos", r.totalVeiculos) + frotaDocMeta_("Disponiveis", r.disponiveis) + frotaDocMeta_("Reservados", r.reservados) + frotaDocMeta_("Em uso", r.emUso) +
      frotaDocMeta_("Em manutencao", r.emManutencao) + frotaDocMeta_("Bloqueados", r.bloqueados) + frotaDocMeta_("Doc. vencida", r.documentacaoVencida) + frotaDocMeta_("Preventiva proxima", r.preventivaProxima) +
      frotaDocMeta_("Preventiva vencida", r.preventivaVencida) + frotaDocMeta_("KM total", r.kmRodado) + frotaDocMeta_("Combustivel", frotaDocMoney_(r.gastoCombustivel)) + frotaDocMeta_("Custo/km", frotaDocMoney_(r.custoMedioKm)) +
      "</div>" +
      frotaDocNota_("Resumo executivo", "A frota possui " + r.totalVeiculos + " veiculo(s), " + r.disponiveis + " disponivel(is), " + r.emUso + " em uso e " + r.bloqueados + " bloqueado(s). O custo consolidado no periodo foi de " + frotaDocMoney_(r.gastoCombustivel + r.gastoManutencao + r.gastoLavagem + r.gastoMultas) + ".") +
      frotaPdfSection_("Indicadores-chave", "<div class=\"frota-grid-4\">" +
        frotaPdfCard_("KM total", r.kmRodado, "ok") +
        frotaPdfCard_("Combustivel", frotaDocMoney_(r.gastoCombustivel), "money") +
        frotaPdfCard_("Manutencao", frotaDocMoney_(r.gastoManutencao), "money") +
        frotaPdfCard_("Custo medio/km", frotaDocMoney_(r.custoMedioKm), "money") +
      "</div>") +
      frotaPdfSection_("Ranking e criticidade", frotaDocTabelaPremium_("Ranking de uso", dados.rankingUso, ["chave", "total", "valor"]) + frotaDocTabelaPremium_("Ranking de custo", dados.rankingCusto, ["chave", "total", "valor"])) +
      frotaPdfSection_("Preventivas e continuidade", frotaDocTabelaPremium_("Preventivas proximas", dados.preventivasProximas, ["PLACA", "KM_ATUAL", "PROXIMA_PREVENTIVA_KM", "PROXIMA_PREVENTIVA_DATA", "STATUS"])) +
      frotaPdfSection_("Multas e alertas", frotaDocTabelaPremium_("Multas pendentes", dados.multas.filter(function(m) { return ["RECEBIDA", "AGUARDANDO_CONDUTOR", "CONDUTOR_IDENTIFICADO", "EM_DEFESA"].indexOf(frotaNormalizarTexto_(m.STATUS)) >= 0; }), ["PLACA", "CONDUTOR_NOME", "VALOR", "PONTUACAO", "STATUS", "PRAZO_INDICACAO"]) + frotaDocTabelaPremium_("Alertas criticos", dados.alertas.filter(function(a) { return ["VERMELHO", "BLOQUEIO"].indexOf(frotaNormalizarTexto_(a.NIVEL)) >= 0; }), ["NIVEL", "TIPO_ALERTA", "PLACA", "MENSAGEM", "STATUS"])) +
      frotaPdfSection_("Analise executiva", "<div class=\"frota-grid-3\">" +
        frotaPdfInsight_("Uso", "Veiculo mais utilizado: " + (r.veiculoMaisUtilizado || "--") + ".", r.veiculoMaisUtilizado ? "good" : "warn") +
        frotaPdfInsight_("Custo", "Veiculo de maior custo: " + (r.veiculoMaisCaro || "--") + ".", r.veiculoMaisCaro ? "warn" : "") +
        frotaPdfInsight_("Criticidade", "Alertas criticos no periodo: " + r.alertasCriticos + ".", r.alertasCriticos ? "critical" : "good") +
      "</div>") +
      frotaPdfSection_("Recomendacoes gerenciais", frotaDocNotaPremium_("Plano sugerido", "Priorizar preventivas proximas ou vencidas, acompanhar custo por km dos veiculos de maior gasto e reforcar politica de conduta para multas pendentes.")) +
      "<div class=\"frota-pdf-conclusion\">Conclusão executiva: este relatório gerencial apresenta a condição da frota, seus custos e alertas críticos para tomada de decisão. O documento é rastreável por token, hash SHA256 e QR Code de validação pública.</div>" +
      frotaPdfFooter_() +
      "</div>";
  }

  function frotaHtmlTermoMulta_(multa, veiculo) {
    const titulo = frotaTipoDocumentoNome_("FROTA_TERMO_MULTA");
    return "<div class=\"df-doc frota-pdf\">" +
      frotaPdfHero_(titulo, "Documento controlado de identificação do condutor responsável") +
      "<div class=\"frota-pdf-band\">" +
      frotaDocMeta_("Empresa", "METROLABS") + frotaDocMeta_("Placa", multa.PLACA || veiculo.PLACA) + frotaDocMeta_("Condutor", multa.CONDUTOR_NOME) + frotaDocMeta_("CPF/CNH", multa.CPF_CNH) +
      frotaDocMeta_("Data/hora", multa.DATA_HORA_INFRACAO) + frotaDocMeta_("Auto", multa.NUMERO_AUTO) + frotaDocMeta_("Orgao", multa.ORGAO_AUTUADOR) + frotaDocMeta_("Valor", frotaDocMoney_(multa.VALOR)) +
      "</div>" +
      frotaDocNota_("Dados do veiculo", [
        "Placa: " + (multa.PLACA || veiculo.PLACA || "--"),
        "Marca/modelo: " + [veiculo.MARCA, veiculo.MODELO].filter(Boolean).join(" "),
        "Ano/cor: " + [veiculo.ANO, veiculo.COR].filter(Boolean).join(" / "),
        "Renavam/chassi: " + [veiculo.RENAVAM, veiculo.CHASSI].filter(Boolean).join(" / ")
      ].join("\n")) +
      frotaDocNota_("Dados da infracao", [
        "Local: " + (multa.LOCAL_INFRACAO || "--"),
        "Descricao: " + (multa.DESCRICAO_INFRACAO || "--"),
        "Pontuacao: " + (multa.PONTUACAO || "--"),
        "Prazo de indicacao: " + (multa.PRAZO_INDICACAO || "--")
      ].join("\n")) +
      frotaDocNota_("Declaracao de ciencia e responsabilidade", "Declaro ciencia da infracao de transito descrita neste termo e assumo a responsabilidade pelas informacoes prestadas para identificacao do condutor responsavel, inclusive quanto aos efeitos administrativos internos e legais aplicaveis.") +
      frotaDocNota_("Base legal resumida", "Registro utilizado para identificacao do condutor responsavel, conforme regras do Codigo de Transito Brasileiro, art. 257. Para veiculos vinculados a pessoa juridica, a nao identificacao do condutor pode gerar penalidade administrativa adicional, conforme regras aplicaveis.") +
      frotaDocNota_("Assinatura do condutor", (multa.ASSINATURA_CONDUTOR || "Assinatura nao registrada.") + "\n\nData: ____/____/________") +
      "<div class=\"frota-pdf-conclusion\">Este termo foi emitido pelo SGO+ para controle documental da infração e ciência do condutor, com validação pública por token, hash SHA256 e QR Code.</div>" +
      frotaPdfFooter_() +
      "</div>";
  }

  function frotaRegistrarDocumentoGerado_(session, dados) {
    try {
      const user = frotaUser_(session);
      const doc = dados.documentFactory || {};
      const registro = frotaAppend_(FROTA_ABAS.DOCUMENTOS, {
        ID: frotaUUID_(),
        VEICULO_ID: dados.veiculoId || "",
        PLACA: dados.placa || "",
        TIPO_DOCUMENTO: dados.tipoDocumento || "",
        DOCUMENTO_ID: doc.documentoId || "",
        TOKEN_VALIDACAO: doc.tokenValidacao || "",
        HASH: doc.hash || "",
        LINK_PDF: doc.pdfUrl || "",
        LINK_DOWNLOAD: doc.downloadUrl || "",
        STATUS: "VALIDO",
        PERIODO_INICIAL: dados.periodoInicial || "",
        PERIODO_FINAL: dados.periodoFinal || "",
        PERIODO_LABEL: dados.periodoLabel || "",
        EMITIDO_EM: frotaNow_(),
        EMITIDO_POR: user.nome || user.id,
        OBSERVACOES: dados.observacoes || ""
      });
      return { item: registro, aviso: "" };
    } catch (e) {
      Logger.log("FROTA_DOCUMENTO_REGISTRO_ERRO: " + e.message);
      return { item: null, aviso: "Documento central gerado, mas o resumo em FROTA_DOCUMENTOS falhou: " + e.message };
    }
  }

  function frotaChamarDocumentFactory_(sessionId, payloadDocumentFactory) {
    if (typeof documentFactoryGerar !== "function") {
      throw new Error("DocumentFactory central indisponivel.");
    }
    const doc = documentFactoryGerar(sessionId, payloadDocumentFactory);
    if (!doc || doc.success === false || doc.ok === false) {
      throw new Error((doc && (doc.message || doc.mensagem)) || "Falha ao gerar documento pelo DocumentFactory.");
    }
    return doc;
  }

  function frotaRetornoDocumento_(doc, registro, aviso, dados) {
    dados = dados || {};
    return {
      ok: true,
      success: true,
      documentoId: registro && registro.item ? registro.item.ID : "",
      docDocumentosId: doc.documentoId || "",
      linkPdf: doc.pdfUrl || "",
      pdfUrl: doc.pdfUrl || "",
      linkDownload: doc.downloadUrl || "",
      downloadUrl: doc.downloadUrl || "",
      tokenValidacao: doc.tokenValidacao || "",
      hash: doc.hash || "",
      validacaoUrl: doc.validacaoUrl || "",
      qrCodeUrl: doc.qrCodeUrl || "",
      mensagemWhatsApp: doc.whatsappTexto || "",
      whatsappTexto: doc.whatsappTexto || "",
      periodoInicial: dados.PERIODO_INICIAL || "",
      periodoFinal: dados.PERIODO_FINAL || "",
      periodoLabel: dados.PERIODO_LABEL || "",
      aviso: aviso || ""
    };
  }

  function aplicarFiltros_(items, filtros) {
    const f = filtros || {};
    return items.filter(function(item) {
      if (f.veiculoId && SGO_UTILS.safe(item.VEICULO_ID) !== SGO_UTILS.safe(f.veiculoId)) return false;
      if (f.placa && frotaNormalizarPlaca_(item.PLACA) !== frotaNormalizarPlaca_(f.placa)) return false;
      if (f.status && frotaNormalizarTexto_(item.STATUS) !== frotaNormalizarTexto_(f.status)) return false;
      return true;
    });
  }

  function serializarJson_(valor) {
    if (!valor) return "";
    if (typeof valor === "string") return valor;
    return JSON.stringify(valor);
  }

  function exigirCampo_(payload, campo, label) {
    if (!SGO_UTILS.safe(payload && payload[campo])) throw new Error((label || campo) + " e obrigatorio.");
  }

  function listarVeiculos_(filtro) {
    const q = SGO_UTILS.safeUpper(filtro || "");
    return frotaAll_(FROTA_ABAS.VEICULOS)
      .filter(function(v) {
        if (SGO_UTILS.safeUpper(v.ATIVO || "SIM") === "NAO") return false;
        if (!q) return true;
        return [v.PLACA, v.MARCA, v.MODELO, v.STATUS, v.CODIGO].join(" ").toUpperCase().indexOf(q) >= 0;
      })
      .sort(function(a, b) {
        return SGO_UTILS.safe(a.PLACA).localeCompare(SGO_UTILS.safe(b.PLACA));
      });
  }

  function salvarVeiculo_(session, payload) {
    const user = frotaUser_(session);
    const atual = payload.ID ? frotaFindById_(FROTA_ABAS.VEICULOS, payload.ID) : null;
    const placa = frotaNormalizarPlaca_(payload.PLACA);
    if (!placa) throw new Error("Placa e obrigatoria.");
    const dados = {
      ID: atual ? atual.ID : frotaUUID_(),
      CODIGO: SGO_UTILS.safe(payload.CODIGO || (atual && atual.CODIGO)),
      PLACA: placa,
      STATUS: frotaNormalizarStatusVeiculo_(payload.STATUS),
      MARCA: SGO_UTILS.safe(payload.MARCA),
      MODELO: SGO_UTILS.safe(payload.MODELO),
      ANO: SGO_UTILS.safe(payload.ANO),
      COR: SGO_UTILS.safe(payload.COR),
      COMBUSTIVEL_PADRAO: frotaNormalizarTexto_(payload.COMBUSTIVEL_PADRAO || payload.TIPO_COMBUSTIVEL),
      KM_ATUAL: frotaParseNumero_(payload.KM_ATUAL),
      MEDIA_ESPERADA_KM_L: frotaParseNumero_(payload.MEDIA_ESPERADA_KM_L),
      DOCUMENTACAO_VENCE: SGO_UTILS.safe(payload.DOCUMENTACAO_VENCE),
      SEGURO_VENCE: SGO_UTILS.safe(payload.SEGURO_VENCE),
      IPVA_VENCE: SGO_UTILS.safe(payload.IPVA_VENCE),
      LICENCIAMENTO_VENCE: SGO_UTILS.safe(payload.LICENCIAMENTO_VENCE),
      RENAVAM: SGO_UTILS.safe(payload.RENAVAM),
      CHASSI: SGO_UTILS.safe(payload.CHASSI),
      PROPRIETARIO: SGO_UTILS.safe(payload.PROPRIETARIO),
      OBSERVACOES: SGO_UTILS.safe(payload.OBSERVACOES),
      BLOQUEADO: payload.BLOQUEADO ? "SIM" : "NAO",
      MOTIVO_BLOQUEIO: SGO_UTILS.safe(payload.MOTIVO_BLOQUEIO),
      PROXIMA_PREVENTIVA_KM: frotaParseNumero_(payload.PROXIMA_PREVENTIVA_KM),
      PROXIMA_PREVENTIVA_DATA: SGO_UTILS.safe(payload.PROXIMA_PREVENTIVA_DATA),
      ATUALIZADO_EM: frotaNow_(),
      ATUALIZADO_POR: user.nome || user.id,
      ATIVO: SGO_UTILS.safe(payload.ATIVO || "SIM")
    };

    let salvo;
    if (atual) {
      salvo = frotaUpdate_(FROTA_ABAS.VEICULOS, atual.ID, dados);
    } else {
      dados.CRIADO_EM = frotaNow_();
      dados.CRIADO_POR = user.nome || user.id;
      salvo = frotaAppend_(FROTA_ABAS.VEICULOS, dados);
    }
    frotaLog_("SALVAR_VEICULO", { session: session, referenciaId: salvo.ID, veiculoId: salvo.ID, placa: salvo.PLACA, antes: atual, depois: salvo });
    return salvo;
  }

  function verificarDisponibilidade_(session, payload) {
    const p = payload || {};
    const veiculo = frotaBuscarVeiculo_(p.veiculoId || p.VEICULO_ID || p.placa || p.PLACA);
    if (!veiculo) {
      return { ok: false, status: "NAO_ENCONTRADO", bloqueios: ["Veiculo nao encontrado."], alertas: [], veiculo: null };
    }

    const bloqueios = [];
    const alertas = [];
    let statusFinal = FROTA_STATUS_VEICULO.DISPONIVEL;
    const status = frotaNormalizarStatusVeiculo_(veiculo.STATUS);

    if (status === FROTA_STATUS_VEICULO.INATIVO) bloqueios.push("Veiculo inativo.");
    if (status === FROTA_STATUS_VEICULO.BLOQUEADO || frotaBool_(veiculo.BLOQUEADO)) bloqueios.push(veiculo.MOTIVO_BLOQUEIO || "Veiculo bloqueado.");
    if (status === FROTA_STATUS_VEICULO.EM_MANUTENCAO) bloqueios.push("Veiculo em manutencao.");
    if (status === FROTA_STATUS_VEICULO.EM_USO) bloqueios.push("Veiculo em uso.");

    const doc = frotaDocumentacaoVencida_(veiculo);
    if (doc.vencida) bloqueios.push(doc.motivo);

    const preventiva = frotaPreventivaStatus_(veiculo);
    if (preventiva.vencida) bloqueios.push(preventiva.mensagem);
    else if (preventiva.alerta) alertas.push(preventiva.mensagem);

    const reserva = frotaReservaConflitante_(veiculo, p.inicio || p.DATA_HORA_INICIO, p.fim || p.DATA_HORA_FIM, p.condutorId || p.CONDUTOR_ID);
    if (reserva.conflito) bloqueios.push(reserva.mensagem);

    const movimento = frotaMovimentoAberto_(veiculo);
    if (movimento.aberto) bloqueios.push(movimento.mensagem);

    const manut = frotaManutencaoBloqueante_(veiculo);
    if (manut.bloqueante) bloqueios.push(manut.mensagem);

    if (bloqueios.length) {
      if (doc.vencida) statusFinal = FROTA_STATUS_VEICULO.DOCUMENTACAO_VENCIDA;
      else if (preventiva.vencida) statusFinal = FROTA_STATUS_VEICULO.PREVENTIVA_VENCIDA;
      else if (movimento.aberto) statusFinal = FROTA_STATUS_VEICULO.EM_USO;
      else if (manut.bloqueante) statusFinal = FROTA_STATUS_VEICULO.EM_MANUTENCAO;
      else if (reserva.conflito) statusFinal = FROTA_STATUS_VEICULO.RESERVADO;
      else statusFinal = FROTA_STATUS_VEICULO.BLOQUEADO;
    }

    return {
      ok: bloqueios.length === 0,
      status: statusFinal,
      bloqueios: bloqueios,
      alertas: alertas,
      veiculo: veiculo,
      preventiva: preventiva
    };
  }

  function realizarCheckin_(session, payload) {
    const p = payload || {};
    const user = frotaUser_(session);
    const veiculo = frotaBuscarVeiculo_(p.veiculoId || p.VEICULO_ID || p.placa || p.PLACA);
    if (!veiculo) throw new Error("Veiculo nao encontrado.");
    const disp = verificarDisponibilidade_(session, {
      veiculoId: veiculo.ID,
      placa: veiculo.PLACA,
      inicio: p.inicio || p.DATA_HORA_CHECKIN || frotaNow_(),
      fim: p.fim || p.DATA_HORA_CHECKOUT || frotaNow_(),
      condutorId: p.condutorId || p.CONDUTOR_ID
    });
    if (!disp.ok) throw new Error("Check-in bloqueado: " + disp.bloqueios.join(" "));

    const kmSaida = frotaParseNumero_(p.kmSaida || p.KM_SAIDA);
    if (!kmSaida) throw new Error("KM de saida e obrigatorio.");
    if (kmSaida < frotaParseNumero_(veiculo.KM_ATUAL)) throw new Error("KM de saida nao pode ser menor que o KM atual do veiculo.");
    exigirCampo_(p, p.combustivelSaida !== undefined ? "combustivelSaida" : "COMBUSTIVEL_SAIDA", "Combustivel de saida");
    exigirCampo_(p, p.destino !== undefined ? "destino" : "DESTINO", "Destino");
    exigirCampo_(p, p.motivoUso !== undefined ? "motivoUso" : "MOTIVO_USO", "Motivo de uso");
    if (!p.checklistJson && !p.CHECKLIST_CHECKIN_JSON) throw new Error("Checklist de check-in e obrigatorio.");
    if (!p.fotosJson && !p.FOTOS_CHECKIN_JSON) throw new Error("Fotos/evidencias de check-in sao obrigatorias.");

    const id = frotaUUID_();
    const movimento = frotaAppend_(FROTA_ABAS.MOVIMENTOS, {
      ID: id,
      VEICULO_ID: veiculo.ID,
      PLACA: veiculo.PLACA,
      CONDUTOR_ID: p.condutorId || p.CONDUTOR_ID || user.id,
      CONDUTOR_NOME: p.condutorNome || p.CONDUTOR_NOME || user.nome,
      TIPO: "CHECKIN",
      STATUS: FROTA_STATUS_MOVIMENTO.EM_USO,
      DATA_HORA_CHECKIN: frotaNow_(),
      DATA_HORA_CHECKOUT: "",
      KM_SAIDA: kmSaida,
      KM_CHEGADA: "",
      KM_RODADO: "",
      COMBUSTIVEL_SAIDA: p.combustivelSaida || p.COMBUSTIVEL_SAIDA,
      COMBUSTIVEL_CHEGADA: "",
      DESTINO: p.destino || p.DESTINO,
      MOTIVO_USO: p.motivoUso || p.MOTIVO_USO,
      OS_ID: p.osId || p.OS_ID || "",
      MISSAO_ID: p.missaoId || p.MISSAO_ID || "",
      LOCALIZACAO_SAIDA: p.localizacaoSaida || p.LOCALIZACAO_SAIDA || "",
      LOCALIZACAO_CHEGADA: "",
      CHECKLIST_CHECKIN_JSON: serializarJson_(p.checklistJson || p.CHECKLIST_CHECKIN_JSON),
      CHECKLIST_CHECKOUT_JSON: "",
      FOTOS_CHECKIN_JSON: serializarJson_(p.fotosJson || p.FOTOS_CHECKIN_JSON),
      FOTOS_CHECKOUT_JSON: "",
      ASSINATURA_CHECKIN: p.assinaturaCheckin || p.ASSINATURA_CHECKIN || "",
      ASSINATURA_CHECKOUT: "",
      VEICULO_LIMPO_RETORNO: "",
      AVARIAS: "",
      DESCRICAO_AVARIAS: "",
      BLOQUEANTE: "NAO",
      OBSERVACOES: p.observacoes || p.OBSERVACOES || "",
      CRIADO_EM: frotaNow_(),
      CRIADO_POR: user.nome || user.id,
      ATUALIZADO_EM: frotaNow_(),
      ATUALIZADO_POR: user.nome || user.id
    });

    const veiculoAtualizado = frotaUpdate_(FROTA_ABAS.VEICULOS, veiculo.ID, {
      STATUS: FROTA_STATUS_VEICULO.EM_USO,
      KM_ATUAL: kmSaida,
      ULTIMO_MOVIMENTO_ID: id,
      ATUALIZADO_EM: frotaNow_(),
      ATUALIZADO_POR: user.nome || user.id
    });
    frotaLog_("CHECKIN", { session: session, referenciaId: id, veiculoId: veiculo.ID, placa: veiculo.PLACA, antes: veiculo, depois: movimento });
    return { mensagem: "Check-in realizado com sucesso.", movimentoId: id, movimento: movimento, veiculo: veiculoAtualizado, frase: frotaFraseZelo_() };
  }

  function realizarCheckout_(session, payload) {
    const p = payload || {};
    const user = frotaUser_(session);
    let movimento = p.movimentoId || p.MOVIMENTO_ID ? frotaFindById_(FROTA_ABAS.MOVIMENTOS, p.movimentoId || p.MOVIMENTO_ID) : null;
    let veiculo = null;
    if (movimento) veiculo = frotaBuscarVeiculo_(movimento.VEICULO_ID || movimento.PLACA);
    if (!movimento) {
      veiculo = frotaBuscarVeiculo_(p.veiculoId || p.VEICULO_ID || p.placa || p.PLACA);
      if (!veiculo) throw new Error("Veiculo nao encontrado.");
      const aberto = frotaMovimentoAberto_(veiculo);
      movimento = aberto.movimento;
    }
    if (!movimento || SGO_UTILS.safe(movimento.DATA_HORA_CHECKOUT)) throw new Error("Movimento aberto nao encontrado para check-out.");
    if (!veiculo) veiculo = frotaBuscarVeiculo_(movimento.VEICULO_ID || movimento.PLACA);

    const kmChegada = frotaParseNumero_(p.kmChegada || p.KM_CHEGADA);
    const kmSaida = frotaParseNumero_(movimento.KM_SAIDA);
    if (!kmChegada) throw new Error("KM de chegada e obrigatorio.");
    if (kmChegada < kmSaida) throw new Error("KM de chegada nao pode ser menor que o KM de saida.");
    exigirCampo_(p, p.combustivelChegada !== undefined ? "combustivelChegada" : "COMBUSTIVEL_CHEGADA", "Combustivel de chegada");
    if (!p.checklistJson && !p.CHECKLIST_CHECKOUT_JSON) throw new Error("Checklist de check-out e obrigatorio.");
    if (!p.fotosJson && !p.FOTOS_CHECKOUT_JSON) throw new Error("Fotos/evidencias de check-out sao obrigatorias.");

    const avarias = frotaNormalizarTexto_(p.avarias || p.AVARIAS);
    const descAvarias = SGO_UTILS.safe(p.descricaoAvarias || p.DESCRICAO_AVARIAS || p.observacoes || p.OBSERVACOES);
    if ((avarias === "SIM" || avarias === "GRAVE") && !descAvarias) throw new Error("Descreva a avaria identificada.");

    const alertas = [];
    if (frotaNormalizarTexto_(p.veiculoLimpo || p.VEICULO_LIMPO_RETORNO) === "NAO") {
      alertas.push(frotaRegistrarAlerta_({
        VEICULO_ID: veiculo.ID,
        PLACA: veiculo.PLACA,
        TIPO_ALERTA: "LAVAGEM",
        NIVEL: FROTA_NIVEIS_ALERTA.AMARELO,
        MENSAGEM: "Veiculo devolvido sem limpeza.",
        REFERENCIA_ID: movimento.ID
      }));
    }
    if (avarias === "SIM" || avarias === "GRAVE") {
      alertas.push(frotaRegistrarAlerta_({
        VEICULO_ID: veiculo.ID,
        PLACA: veiculo.PLACA,
        TIPO_ALERTA: "AVARIA",
        NIVEL: avarias === "GRAVE" ? FROTA_NIVEIS_ALERTA.BLOQUEIO : FROTA_NIVEIS_ALERTA.LARANJA,
        MENSAGEM: "Avaria informada no check-out: " + descAvarias,
        BLOQUEANTE: avarias === "GRAVE" ? "SIM" : "NAO",
        REFERENCIA_ID: movimento.ID
      }));
    }

    const combustivelSaida = frotaParseNumero_(movimento.COMBUSTIVEL_SAIDA);
    const combustivelChegada = frotaParseNumero_(p.combustivelChegada || p.COMBUSTIVEL_CHEGADA);
    if (combustivelChegada < combustivelSaida) {
      alertas.push(frotaRegistrarAlerta_({
        VEICULO_ID: veiculo.ID,
        PLACA: veiculo.PLACA,
        TIPO_ALERTA: "COMBUSTIVEL",
        NIVEL: FROTA_NIVEIS_ALERTA.AMARELO,
        MENSAGEM: "Combustivel devolvido abaixo do registrado na saida.",
        REFERENCIA_ID: movimento.ID
      }));
    }

    const kmRodado = kmChegada - kmSaida;
    const movimentoAtualizado = frotaUpdate_(FROTA_ABAS.MOVIMENTOS, movimento.ID, {
      STATUS: FROTA_STATUS_MOVIMENTO.CONCLUIDO,
      DATA_HORA_CHECKOUT: frotaNow_(),
      KM_CHEGADA: kmChegada,
      KM_RODADO: kmRodado,
      COMBUSTIVEL_CHEGADA: combustivelChegada,
      LOCALIZACAO_CHEGADA: p.localizacaoChegada || p.LOCALIZACAO_CHEGADA || "",
      CHECKLIST_CHECKOUT_JSON: serializarJson_(p.checklistJson || p.CHECKLIST_CHECKOUT_JSON),
      FOTOS_CHECKOUT_JSON: serializarJson_(p.fotosJson || p.FOTOS_CHECKOUT_JSON),
      ASSINATURA_CHECKOUT: p.assinaturaCheckout || p.ASSINATURA_CHECKOUT || "",
      VEICULO_LIMPO_RETORNO: p.veiculoLimpo || p.VEICULO_LIMPO_RETORNO || "",
      AVARIAS: p.avarias || p.AVARIAS || "NAO",
      DESCRICAO_AVARIAS: descAvarias,
      OBSERVACOES: p.observacoes || p.OBSERVACOES || movimento.OBSERVACOES || "",
      ATUALIZADO_EM: frotaNow_(),
      ATUALIZADO_POR: user.nome || user.id
    });

    const statusVeiculo = (avarias === "GRAVE") ? FROTA_STATUS_VEICULO.SINISTRO_AVARIA : FROTA_STATUS_VEICULO.DISPONIVEL;
    const veiculoAtualizado = frotaUpdate_(FROTA_ABAS.VEICULOS, veiculo.ID, {
      STATUS: statusVeiculo,
      KM_ATUAL: kmChegada,
      ULTIMO_MOVIMENTO_ID: movimento.ID,
      ATUALIZADO_EM: frotaNow_(),
      ATUALIZADO_POR: user.nome || user.id
    });
    frotaLog_("CHECKOUT", { session: session, referenciaId: movimento.ID, veiculoId: veiculo.ID, placa: veiculo.PLACA, antes: movimento, depois: movimentoAtualizado });
    return { mensagem: "Check-out realizado com sucesso.", movimentoId: movimento.ID, kmRodado: kmRodado, alertas: alertas.filter(Boolean), veiculo: veiculoAtualizado, frase: frotaFraseZelo_() };
  }

  function wrap_(fn) {
    try {
      return frotaOk_(fn());
    } catch (e) {
      return frotaErro_(e.message || String(e));
    }
  }

  return {
    constantes: function() {
      return {
        abas: FROTA_ABAS,
        statusVeiculo: FROTA_STATUS_VEICULO,
        statusReserva: FROTA_STATUS_RESERVA,
        statusMovimento: FROTA_STATUS_MOVIMENTO,
        checklistCheckin: FROTA_CHECKLIST_CHECKIN,
        checklistCheckout: FROTA_CHECKLIST_CHECKOUT,
        checklistVistoria: FROTA_CHECKLIST_VISTORIA,
        checklistPreventiva: FROTA_CHECKLIST_PREVENTIVA
      };
    },

    listarVeiculos: function(sessionId, filtro) {
      return wrap_(function() {
        exigirSessao(sessionId);
        return { items: listarVeiculos_(filtro), message: "Veiculos carregados." };
      });
    },

    salvarVeiculo: function(sessionId, payload) {
      return wrap_(function() {
        const session = exigirSessao(sessionId);
        const veiculo = salvarVeiculo_(session, payload || {});
        return { item: veiculo, message: "Veiculo salvo com sucesso." };
      });
    },

    obterVeiculo: function(sessionId, payload) {
      return wrap_(function() {
        exigirSessao(sessionId);
        const p = payload || {};
        const veiculo = frotaBuscarVeiculo_(p.id || p.ID || p.veiculoId || p.VEICULO_ID || p.placa || p.PLACA);
        if (!veiculo) throw new Error("Veiculo nao encontrado.");
        return { item: veiculo };
      });
    },

    listarReservas: function(sessionId, filtros) {
      return wrap_(function() {
        exigirSessao(sessionId);
        return { items: aplicarFiltros_(frotaAll_(FROTA_ABAS.RESERVAS), filtros) };
      });
    },

    salvarReserva: function(sessionId, payload) {
      return wrap_(function() {
        const session = exigirSessao(sessionId);
        const user = frotaUser_(session);
        const p = payload || {};
        const veiculo = frotaBuscarVeiculo_(p.VEICULO_ID || p.veiculoId || p.PLACA || p.placa);
        if (!veiculo) throw new Error("Veiculo nao encontrado.");
        exigirCampo_(p, p.DATA_HORA_INICIO ? "DATA_HORA_INICIO" : "inicio", "Inicio da reserva");
        exigirCampo_(p, p.DATA_HORA_FIM ? "DATA_HORA_FIM" : "fim", "Fim da reserva");
        const id = SGO_UTILS.safe(p.ID);
        const atual = id ? frotaFindById_(FROTA_ABAS.RESERVAS, id) : null;
        const dados = {
          ID: atual ? atual.ID : frotaUUID_(),
          VEICULO_ID: veiculo.ID,
          PLACA: veiculo.PLACA,
          RESPONSAVEL_ID: p.RESPONSAVEL_ID || p.responsavelId || user.id,
          RESPONSAVEL_NOME: p.RESPONSAVEL_NOME || p.responsavelNome || user.nome,
          DATA_HORA_INICIO: p.DATA_HORA_INICIO || p.inicio,
          DATA_HORA_FIM: p.DATA_HORA_FIM || p.fim,
          MOTIVO: p.MOTIVO || p.motivo || "",
          DESTINO: p.DESTINO || p.destino || "",
          OS_ID: p.OS_ID || p.osId || "",
          MISSAO_ID: p.MISSAO_ID || p.missaoId || "",
          OBSERVACOES: p.OBSERVACOES || p.observacoes || "",
          STATUS: frotaNormalizarTexto_(p.STATUS || p.status || "RESERVADO"),
          BLOQUEANTE: p.BLOQUEANTE || "SIM",
          ATUALIZADO_EM: frotaNow_(),
          ATUALIZADO_POR: user.nome || user.id
        };
        let salvo;
        if (atual) salvo = frotaUpdate_(FROTA_ABAS.RESERVAS, atual.ID, dados);
        else {
          dados.CRIADO_EM = frotaNow_();
          dados.CRIADO_POR = user.nome || user.id;
          salvo = frotaAppend_(FROTA_ABAS.RESERVAS, dados);
        }
        frotaLog_("SALVAR_RESERVA", { session: session, referenciaId: salvo.ID, veiculoId: veiculo.ID, placa: veiculo.PLACA, antes: atual, depois: salvo });
        return { item: salvo, message: "Reserva salva com sucesso." };
      });
    },

    verificarDisponibilidade: function(sessionId, payload) {
      return wrap_(function() {
        const session = exigirSessao(sessionId);
        return verificarDisponibilidade_(session, payload || {});
      });
    },

    realizarCheckin: function(sessionId, payload) {
      return wrap_(function() {
        const session = exigirSessao(sessionId);
        return realizarCheckin_(session, payload || {});
      });
    },

    realizarCheckout: function(sessionId, payload) {
      return wrap_(function() {
        const session = exigirSessao(sessionId);
        return realizarCheckout_(session, payload || {});
      });
    },

    listarMovimentos: function(sessionId, filtros) {
      return wrap_(function() {
        exigirSessao(sessionId);
        return { items: aplicarFiltros_(frotaAll_(FROTA_ABAS.MOVIMENTOS), filtros) };
      });
    },

    listarVistorias: function(sessionId, filtros) {
      return wrap_(function() {
        exigirSessao(sessionId);
        return { items: aplicarFiltros_(frotaAll_(FROTA_ABAS.VISTORIAS), filtros) };
      });
    },

    listarAbastecimentos: function(sessionId, filtros) {
      return wrap_(function() {
        exigirSessao(sessionId);
        return { items: aplicarFiltros_(frotaAll_(FROTA_ABAS.ABASTECIMENTOS), filtros) };
      });
    },

    salvarVistoria: function(sessionId, payload) {
      return wrap_(function() {
        const session = exigirSessao(sessionId);
        const user = frotaUser_(session);
        const p = payload || {};
        const veiculo = frotaBuscarVeiculo_(p.VEICULO_ID || p.veiculoId || p.PLACA || p.placa);
        if (!veiculo) throw new Error("Veiculo nao encontrado.");
        if (!p.FOTOS_JSON && !p.fotosJson) throw new Error("Fotos da vistoria sao obrigatorias.");
        const dados = {
          ID: p.ID || frotaUUID_(),
          VEICULO_ID: veiculo.ID,
          PLACA: veiculo.PLACA,
          MOVIMENTO_ID: p.MOVIMENTO_ID || p.movimentoId || "",
          TIPO_VISTORIA: p.TIPO_VISTORIA || p.tipoVistoria || "AVULSA",
          CONDUTOR_ID: p.CONDUTOR_ID || p.condutorId || user.id,
          CONDUTOR_NOME: p.CONDUTOR_NOME || p.condutorNome || user.nome,
          DATA_HORA: p.DATA_HORA || frotaNow_(),
          KM: frotaParseNumero_(p.KM || p.km),
          COMBUSTIVEL_PERCENTUAL: p.COMBUSTIVEL_PERCENTUAL || p.combustivelPercentual || "",
          CHECKLIST_JSON: serializarJson_(p.CHECKLIST_JSON || p.checklistJson),
          FOTOS_JSON: serializarJson_(p.FOTOS_JSON || p.fotosJson),
          AVARIAS: p.AVARIAS || p.avarias || "NAO",
          OBSERVACOES: p.OBSERVACOES || p.observacoes || "",
          ASSINATURA: p.ASSINATURA || p.assinatura || "",
          FINALIZADA: p.FINALIZADA || "SIM",
          BLOQUEANTE: p.BLOQUEANTE || "NAO",
          CRIADO_EM: frotaNow_(),
          CRIADO_POR: user.nome || user.id
        };
        const salvo = p.ID ? frotaUpdate_(FROTA_ABAS.VISTORIAS, p.ID, dados) : frotaAppend_(FROTA_ABAS.VISTORIAS, dados);
        frotaUpdate_(FROTA_ABAS.VEICULOS, veiculo.ID, { ULTIMA_VISTORIA_ID: salvo.ID, ATUALIZADO_EM: frotaNow_(), ATUALIZADO_POR: user.nome || user.id });
        frotaLog_("SALVAR_VISTORIA", { session: session, referenciaId: salvo.ID, veiculoId: veiculo.ID, placa: veiculo.PLACA, depois: salvo });
        return { item: salvo, message: "Vistoria salva com sucesso." };
      });
    },

    salvarAbastecimento: function(sessionId, payload) {
      return wrap_(function() {
        const session = exigirSessao(sessionId);
        const user = frotaUser_(session);
        const p = payload || {};
        const veiculo = frotaBuscarVeiculo_(p.VEICULO_ID || p.veiculoId || p.PLACA || p.placa);
        if (!veiculo) throw new Error("Veiculo nao encontrado.");
        if (!frotaParseNumero_(p.KM || p.km)) throw new Error("KM do abastecimento e obrigatorio.");
        if (!frotaParseNumero_(p.LITROS || p.litros)) throw new Error("Litros do abastecimento e obrigatorio.");
        if (!frotaParseNumero_(p.VALOR_TOTAL || p.valorTotal)) throw new Error("Valor total do abastecimento e obrigatorio.");
        if (!SGO_UTILS.safe(p.TIPO_COMBUSTIVEL || p.tipoCombustivel)) throw new Error("Tipo de combustivel e obrigatorio.");
        if (!p.COMPROVANTE_JSON && !p.comprovanteJson) throw new Error("Comprovante do abastecimento e obrigatorio.");
        if (!p.FOTO_PAINEL_JSON && !p.fotoPainelJson) throw new Error("Foto do painel/KM e obrigatoria.");
        const base = {
          ID: p.ID || frotaUUID_(),
          VEICULO_ID: veiculo.ID,
          PLACA: veiculo.PLACA,
          CONDUTOR_ID: p.CONDUTOR_ID || p.condutorId || user.id,
          CONDUTOR_NOME: p.CONDUTOR_NOME || p.condutorNome || user.nome,
          DATA_HORA: p.DATA_HORA || p.dataHora || frotaNow_(),
          KM: frotaParseNumero_(p.KM || p.km),
          LITROS: frotaParseNumero_(p.LITROS || p.litros),
          VALOR_TOTAL: frotaParseNumero_(p.VALOR_TOTAL || p.valorTotal),
          TIPO_COMBUSTIVEL: frotaNormalizarTexto_(p.TIPO_COMBUSTIVEL || p.tipoCombustivel),
          TANQUE_CHEIO: frotaNormalizarTexto_(p.TANQUE_CHEIO || p.tanqueCheio || "NAO"),
          POSTO: p.POSTO || p.posto || "",
          LOCALIZACAO_POSTO: p.LOCALIZACAO_POSTO || p.localizacaoPosto || "",
          COMPROVANTE_JSON: serializarJson_(p.COMPROVANTE_JSON || p.comprovanteJson),
          FOTO_PAINEL_JSON: serializarJson_(p.FOTO_PAINEL_JSON || p.fotoPainelJson),
          OBSERVACOES: p.OBSERVACOES || p.observacoes || "",
          CRIADO_EM: frotaNow_(),
          CRIADO_POR: user.nome || user.id
        };
        const calc = frotaCalcularConsumo_(veiculo, base);
        const salvo = p.ID ? frotaUpdate_(FROTA_ABAS.ABASTECIMENTOS, p.ID, Object.assign(base, calc)) : frotaAppend_(FROTA_ABAS.ABASTECIMENTOS, Object.assign(base, calc));
        frotaUpdate_(FROTA_ABAS.VEICULOS, veiculo.ID, { KM_ATUAL: Math.max(frotaParseNumero_(veiculo.KM_ATUAL), base.KM), ULTIMO_ABASTECIMENTO_ID: salvo.ID, ATUALIZADO_EM: frotaNow_(), ATUALIZADO_POR: user.nome || user.id });
        frotaLog_("SALVAR_ABASTECIMENTO", { session: session, referenciaId: salvo.ID, veiculoId: veiculo.ID, placa: veiculo.PLACA, depois: salvo });
        return { item: salvo, message: "Abastecimento salvo com sucesso." };
      });
    },

    salvarManutencao: function(sessionId, payload) {
      return wrap_(function() {
        const session = exigirSessao(sessionId);
        const user = frotaUser_(session);
        const p = payload || {};
        const veiculo = frotaBuscarVeiculo_(p.VEICULO_ID || p.veiculoId || p.PLACA || p.placa);
        if (!veiculo) throw new Error("Veiculo nao encontrado.");
        const categoria = frotaNormalizarTexto_(p.CATEGORIA || p.categoria || "PREVENTIVA");
        const status = frotaNormalizarTexto_(p.STATUS || p.status || "CONCLUIDA");
        const bloqueante = frotaBool_(p.BLOQUEANTE) ||
          status === "BLOQUEADA" ||
          (categoria === "CORRETIVA" && ["ABERTA", "EM_OFICINA", "AGUARDANDO_PECA"].indexOf(status) >= 0);
        const dados = {
          ID: p.ID || frotaUUID_(),
          VEICULO_ID: veiculo.ID,
          PLACA: veiculo.PLACA,
          CATEGORIA: categoria,
          TIPO_MANUTENCAO: p.TIPO_MANUTENCAO || p.tipoManutencao || "",
          STATUS: status,
          DATA_ENTRADA: p.DATA_ENTRADA || p.dataEntrada || frotaNow_(),
          DATA_SAIDA: p.DATA_SAIDA || p.dataSaida || "",
          KM: frotaParseNumero_(p.KM || p.km),
          OFICINA_LOCAL: p.OFICINA_LOCAL || p.oficinaLocal || "",
          LOCALIZACAO_OFICINA: p.LOCALIZACAO_OFICINA || p.localizacaoOficina || "",
          DESCRICAO_PROBLEMA: p.DESCRICAO_PROBLEMA || p.descricaoProblema || "",
          SERVICO_REALIZADO: p.SERVICO_REALIZADO || p.servicoRealizado || "",
          PECAS_SUBSTITUIDAS: p.PECAS_SUBSTITUIDAS || p.pecasSubstituidas || "",
          CUSTO_PECAS: frotaParseNumero_(p.CUSTO_PECAS || p.custoPecas),
          CUSTO_MAO_OBRA: frotaParseNumero_(p.CUSTO_MAO_OBRA || p.custoMaoObra),
          CUSTO_TOTAL: frotaParseNumero_(p.CUSTO_TOTAL || p.custoTotal),
          DIAS_PARADO: frotaParseNumero_(p.DIAS_PARADO || p.diasParado),
          PROXIMA_PREVENTIVA_KM: frotaParseNumero_(p.PROXIMA_PREVENTIVA_KM || p.proximaPreventivaKm),
          PROXIMA_PREVENTIVA_DATA: p.PROXIMA_PREVENTIVA_DATA || p.proximaPreventivaData || "",
          CHECKLIST_JSON: serializarJson_(p.CHECKLIST_JSON || p.checklistJson),
          FOTOS_JSON: serializarJson_(p.FOTOS_JSON || p.fotosJson),
          COMPROVANTES_JSON: serializarJson_(p.COMPROVANTES_JSON || p.comprovantesJson),
          BLOQUEANTE: bloqueante ? "SIM" : "NAO",
          OBSERVACOES: p.OBSERVACOES || p.observacoes || "",
          CRIADO_EM: frotaNow_(),
          CRIADO_POR: user.nome || user.id,
          ATUALIZADO_EM: frotaNow_(),
          ATUALIZADO_POR: user.nome || user.id
        };
        const salvo = p.ID ? frotaUpdate_(FROTA_ABAS.MANUTENCOES, p.ID, dados) : frotaAppend_(FROTA_ABAS.MANUTENCOES, dados);
        const patchVeiculo = { ULTIMA_MANUTENCAO_ID: salvo.ID, ATUALIZADO_EM: frotaNow_(), ATUALIZADO_POR: user.nome || user.id };
        if (dados.CATEGORIA === "PREVENTIVA") {
          patchVeiculo.PROXIMA_PREVENTIVA_KM = dados.PROXIMA_PREVENTIVA_KM;
          patchVeiculo.PROXIMA_PREVENTIVA_DATA = dados.PROXIMA_PREVENTIVA_DATA;
        }
        if (bloqueante) patchVeiculo.STATUS = FROTA_STATUS_VEICULO.EM_MANUTENCAO;
        frotaUpdate_(FROTA_ABAS.VEICULOS, veiculo.ID, patchVeiculo);
        frotaLog_("SALVAR_MANUTENCAO", { session: session, referenciaId: salvo.ID, veiculoId: veiculo.ID, placa: veiculo.PLACA, depois: salvo });
        return { item: salvo, message: "Manutencao salva com sucesso." };
      });
    },

    listarManutencoes: function(sessionId, filtros) {
      return wrap_(function() {
        exigirSessao(sessionId);
        return { items: aplicarFiltros_(frotaAll_(FROTA_ABAS.MANUTENCOES), filtros) };
      });
    },

    salvarLavagem: function(sessionId, payload) {
      return wrap_(function() {
        const session = exigirSessao(sessionId);
        const user = frotaUser_(session);
        const p = payload || {};
        const veiculo = frotaBuscarVeiculo_(p.VEICULO_ID || p.veiculoId || p.PLACA || p.placa);
        if (!veiculo) throw new Error("Veiculo nao encontrado.");
        const salvo = frotaAppend_(FROTA_ABAS.LAVAGENS, {
          ID: p.ID || frotaUUID_(),
          VEICULO_ID: veiculo.ID,
          PLACA: veiculo.PLACA,
          DATA_HORA: p.DATA_HORA || p.dataHora || frotaNow_(),
          KM: frotaParseNumero_(p.KM || p.km),
          LOCAL: p.LOCAL || p.local || "",
          TIPO_LAVAGEM: frotaNormalizarTexto_(p.TIPO_LAVAGEM || p.tipoLavagem),
          VALOR: frotaParseNumero_(p.VALOR || p.valor),
          RESPONSAVEL_ID: p.RESPONSAVEL_ID || p.responsavelId || user.id,
          RESPONSAVEL_NOME: p.RESPONSAVEL_NOME || p.responsavelNome || user.nome,
          FOTO_ANTES_JSON: serializarJson_(p.FOTO_ANTES_JSON || p.fotoAntesJson),
          FOTO_DEPOIS_JSON: serializarJson_(p.FOTO_DEPOIS_JSON || p.fotoDepoisJson),
          COMPROVANTE_JSON: serializarJson_(p.COMPROVANTE_JSON || p.comprovanteJson),
          OBSERVACOES: p.OBSERVACOES || p.observacoes || "",
          CRIADO_EM: frotaNow_(),
          CRIADO_POR: user.nome || user.id
        });
        return { item: salvo, message: "Lavagem salva com sucesso." };
      });
    },

    listarLavagens: function(sessionId, filtros) {
      return wrap_(function() {
        exigirSessao(sessionId);
        return { items: aplicarFiltros_(frotaAll_(FROTA_ABAS.LAVAGENS), filtros) };
      });
    },

    salvarMulta: function(sessionId, payload) {
      return wrap_(function() {
        const session = exigirSessao(sessionId);
        const user = frotaUser_(session);
        const p = payload || {};
        const veiculo = frotaBuscarVeiculo_(p.VEICULO_ID || p.veiculoId || p.PLACA || p.placa);
        if (!veiculo) throw new Error("Veiculo nao encontrado.");
        const salvo = frotaAppend_(FROTA_ABAS.MULTAS, {
          ID: p.ID || frotaUUID_(),
          VEICULO_ID: veiculo.ID,
          PLACA: veiculo.PLACA,
          CONDUTOR_ID: p.CONDUTOR_ID || p.condutorId || "",
          CONDUTOR_NOME: p.CONDUTOR_NOME || p.condutorNome || "",
          CPF_CNH: p.CPF_CNH || p.cpfCnh || "",
          DATA_HORA_INFRACAO: p.DATA_HORA_INFRACAO || p.dataHoraInfracao || "",
          LOCAL_INFRACAO: p.LOCAL_INFRACAO || p.localInfracao || "",
          NUMERO_AUTO: p.NUMERO_AUTO || p.numeroAuto || "",
          ORGAO_AUTUADOR: p.ORGAO_AUTUADOR || p.orgaoAutuador || "",
          DESCRICAO_INFRACAO: p.DESCRICAO_INFRACAO || p.descricaoInfracao || "",
          VALOR: frotaParseNumero_(p.VALOR || p.valor),
          PONTUACAO: frotaParseNumero_(p.PONTUACAO || p.pontuacao),
          PRAZO_INDICACAO: p.PRAZO_INDICACAO || p.prazoIndicacao || "",
          STATUS: frotaNormalizarTexto_(p.STATUS || p.status || "RECEBIDA"),
          ANEXO_NOTIFICACAO_JSON: serializarJson_(p.ANEXO_NOTIFICACAO_JSON || p.anexoNotificacaoJson),
          ASSINATURA_CONDUTOR: p.ASSINATURA_CONDUTOR || p.assinaturaCondutor || p.assinatura || "",
          DOCUMENTO_ID: p.DOCUMENTO_ID || "",
          TOKEN_VALIDACAO: p.TOKEN_VALIDACAO || "",
          HASH: p.HASH || "",
          LINK_PDF: p.LINK_PDF || "",
          OBSERVACOES: p.OBSERVACOES || p.observacoes || "",
          CRIADO_EM: frotaNow_(),
          CRIADO_POR: user.nome || user.id,
          ATUALIZADO_EM: frotaNow_(),
          ATUALIZADO_POR: user.nome || user.id
        });
        return { item: salvo, message: "Multa registrada com sucesso." };
      });
    },

    listarMultas: function(sessionId, filtros) {
      return wrap_(function() {
        exigirSessao(sessionId);
        return { items: aplicarFiltros_(frotaAll_(FROTA_ABAS.MULTAS), filtros) };
      });
    },

    listarAlertas: function(sessionId, filtros) {
      return wrap_(function() {
        exigirSessao(sessionId);
        return { items: aplicarFiltros_(frotaAll_(FROTA_ABAS.ALERTAS), filtros) };
      });
    },

    resolverAlerta: function(sessionId, payload) {
      return wrap_(function() {
        const session = exigirSessao(sessionId);
        const user = frotaUser_(session);
        const p = payload || {};
        const salvo = frotaUpdate_(FROTA_ABAS.ALERTAS, p.ID || p.id, {
          STATUS: "RESOLVIDO",
          RESOLVIDO_EM: frotaNow_(),
          RESOLVIDO_POR: user.nome || user.id
        });
        return { item: salvo, message: "Alerta resolvido." };
      });
    },

    dashboard: function(sessionId) {
      return wrap_(function() {
        exigirSessao(sessionId);
        const veiculos = frotaAll_(FROTA_ABAS.VEICULOS);
        const movimentos = frotaAll_(FROTA_ABAS.MOVIMENTOS);
        const abastecimentos = frotaAll_(FROTA_ABAS.ABASTECIMENTOS);
        const manutencoes = frotaAll_(FROTA_ABAS.MANUTENCOES);
        const lavagens = frotaAll_(FROTA_ABAS.LAVAGENS);
        const multas = frotaAll_(FROTA_ABAS.MULTAS);
        const alertas = frotaAll_(FROTA_ABAS.ALERTAS).filter(function(a) { return frotaNormalizarTexto_(a.STATUS || "ABERTO") !== "RESOLVIDO"; });
        const soma = function(lista, campo) { return lista.reduce(function(total, item) { return total + frotaParseNumero_(item[campo]); }, 0); };
        const porStatus = {};
        veiculos.forEach(function(v) {
          const st = frotaNormalizarStatusVeiculo_(v.STATUS);
          porStatus[st] = (porStatus[st] || 0) + 1;
        });
        const reservas = frotaAll_(FROTA_ABAS.RESERVAS);
        const movimentosAbertos = movimentos.filter(function(m) {
          return ["ABERTO", "EM_USO"].indexOf(frotaNormalizarTexto_(m.STATUS)) >= 0 && !SGO_UTILS.safe(m.DATA_HORA_CHECKOUT);
        });
        const preventivasProximas = veiculos.filter(function(v) {
          const p = frotaPreventivaStatus_(v);
          return p.alerta;
        });
        const rankingUso = frotaRanking_(movimentos, "PLACA", "KM_RODADO", 10);
        const custos = [].concat(
          abastecimentos.map(function(a) { return { PLACA: a.PLACA, CUSTO: frotaParseNumero_(a.VALOR_TOTAL) }; }),
          manutencoes.map(function(m) { return { PLACA: m.PLACA, CUSTO: frotaParseNumero_(m.CUSTO_TOTAL) }; }),
          lavagens.map(function(l) { return { PLACA: l.PLACA, CUSTO: frotaParseNumero_(l.VALOR) }; }),
          multas.map(function(m) { return { PLACA: m.PLACA, CUSTO: frotaParseNumero_(m.VALOR) }; })
        );
        const rankingCusto = frotaRanking_(custos, "PLACA", "CUSTO", 10);
        return {
          resumo: {
            totalVeiculos: veiculos.length,
            disponiveis: porStatus.DISPONIVEL || 0,
            reservados: porStatus.RESERVADO || 0,
            emUso: porStatus.EM_USO || 0,
            emManutencao: porStatus.EM_MANUTENCAO || 0,
            bloqueados: (porStatus.BLOQUEADO || 0) + veiculos.filter(function(v) { return frotaBool_(v.BLOQUEADO); }).length,
            documentacaoVencida: veiculos.filter(function(v) { return frotaDocumentacaoVencida_(v).vencida; }).length,
            preventivaProxima: veiculos.filter(function(v) { const p = frotaPreventivaStatus_(v); return p.alerta && !p.vencida; }).length,
            preventivaVencida: veiculos.filter(function(v) { return frotaPreventivaStatus_(v).vencida; }).length,
            gastoCombustivel: soma(abastecimentos, "VALOR_TOTAL"),
            gastoManutencao: soma(manutencoes, "CUSTO_TOTAL"),
            gastoLavagem: soma(lavagens, "VALOR"),
            gastoMultas: soma(multas, "VALOR"),
            kmRodado: soma(movimentos, "KM_RODADO"),
            custoMedioKm: soma(movimentos, "KM_RODADO") > 0 ? (soma(abastecimentos, "VALOR_TOTAL") + soma(manutencoes, "CUSTO_TOTAL")) / soma(movimentos, "KM_RODADO") : 0,
            alertasCriticos: alertas.filter(function(a) { return ["VERMELHO", "BLOQUEIO"].indexOf(frotaNormalizarTexto_(a.NIVEL)) >= 0; }).length,
            veiculoMaisUtilizado: rankingUso[0] ? rankingUso[0].chave : "",
            veiculoMaisCaro: rankingCusto[0] ? rankingCusto[0].chave : "",
            veiculoMaisParado: "",
            veiculoMaisConcorrido: ""
          },
          combustivel: frotaStatsCombustivel_(abastecimentos),
          alertas: alertas.slice(0, 20),
          reservasProximas: reservas.slice(0, 20),
          movimentosAbertos: movimentosAbertos.slice(0, 20),
          preventivasProximas: preventivasProximas.slice(0, 20),
          multasPendentes: multas.filter(function(m) {
            return ["RECEBIDA", "AGUARDANDO_CONDUTOR", "CONDUTOR_IDENTIFICADO", "EM_DEFESA"].indexOf(frotaNormalizarTexto_(m.STATUS)) >= 0;
          }).slice(0, 20),
          rankingUso: rankingUso,
          rankingCusto: rankingCusto
        };
      });
    },

    gerarRelatorioVeiculo: function(sessionId, payload) {
      return wrap_(function() {
        const session = exigirSessao(sessionId);
        frotaExigirPerfilDocumento_(session);
        const p = payload || {};
        const veiculo = frotaBuscarVeiculo_(p.veiculoId || p.VEICULO_ID || p.placa || p.PLACA);
        if (!veiculo) throw new Error("Veiculo nao encontrado para relatorio.");
        const inicio = p.inicio || p.INICIO || "";
        const fim = p.fim || p.FIM || "";
        const dados = frotaConsolidarRelatorioVeiculo_(veiculo, inicio, fim);
        dados.PERIODO_INICIAL = dados.periodo.PERIODO_INICIAL;
        dados.PERIODO_FINAL = dados.periodo.PERIODO_FINAL;
        dados.PERIODO_LABEL = dados.periodo.PERIODO_LABEL;
        const html = frotaHtmlRelatorioVeiculo_(dados, { inicio: inicio, fim: fim });
        const doc = frotaChamarDocumentFactory_(sessionId, {
          TIPO_DOCUMENTO: "FROTA_RELATORIO_VEICULO",
          TITULO: "Relatorio Individual de Veiculo",
          MODULO_ORIGEM: "FROTA",
          ENTIDADE_ID: veiculo.ID,
          VEICULO_ID: veiculo.ID,
          PERIODO_INICIAL: dados.PERIODO_INICIAL,
          PERIODO_FINAL: dados.PERIODO_FINAL,
          PERIODO_LABEL: dados.PERIODO_LABEL,
          DADOS: dados,
          HTML_CUSTOM: html,
          NOME_ARQUIVO: frotaSanitizarNomeArquivo_("FROTA_RELATORIO_VEICULO_" + (veiculo.PLACA || veiculo.ID) + "_" + frotaDataArquivo_()) + ".pdf",
          VISIBILIDADE: "PUBLICO_VALIDACAO"
        });
        const registro = frotaRegistrarDocumentoGerado_(session, {
          veiculoId: veiculo.ID,
          placa: veiculo.PLACA,
          tipoDocumento: "FROTA_RELATORIO_VEICULO",
          periodoInicial: dados.PERIODO_INICIAL,
          periodoFinal: dados.PERIODO_FINAL,
          periodoLabel: dados.PERIODO_LABEL,
          documentFactory: doc,
          observacoes: "Relatorio individual de veiculo gerado via DocumentFactory central."
        });
        frotaLog_("DOCUMENTO_FROTA_RELATORIO_VEICULO", { session: session, referenciaId: doc.documentoId, veiculoId: veiculo.ID, placa: veiculo.PLACA, depois: doc });
        return frotaRetornoDocumento_(doc, registro, registro.aviso, dados);
      });
    },

    gerarRelatorioGeral: function(sessionId, payload) {
      return wrap_(function() {
        const session = exigirSessao(sessionId);
        frotaExigirPerfilDocumento_(session);
        const p = payload || {};
        const inicio = p.inicio || p.INICIO || "";
        const fim = p.fim || p.FIM || "";
        const dados = frotaConsolidarRelatorioGeral_(inicio, fim);
        dados.PERIODO_INICIAL = dados.periodo.PERIODO_INICIAL;
        dados.PERIODO_FINAL = dados.periodo.PERIODO_FINAL;
        dados.PERIODO_LABEL = dados.periodo.PERIODO_LABEL;
        const html = frotaHtmlRelatorioGeral_(dados, { inicio: inicio, fim: fim });
        const doc = frotaChamarDocumentFactory_(sessionId, {
          TIPO_DOCUMENTO: "FROTA_RELATORIO_GERAL",
          TITULO: "Relatorio Geral da Frota",
          MODULO_ORIGEM: "FROTA",
          ENTIDADE_ID: "FROTA_GERAL",
          PERIODO_INICIAL: dados.PERIODO_INICIAL,
          PERIODO_FINAL: dados.PERIODO_FINAL,
          PERIODO_LABEL: dados.PERIODO_LABEL,
          DADOS: dados,
          HTML_CUSTOM: html,
          NOME_ARQUIVO: frotaSanitizarNomeArquivo_("FROTA_RELATORIO_GERAL_" + frotaDataArquivo_()) + ".pdf",
          VISIBILIDADE: "PUBLICO_VALIDACAO"
        });
        const registro = frotaRegistrarDocumentoGerado_(session, {
          veiculoId: "",
          placa: "FROTA_GERAL",
          tipoDocumento: "FROTA_RELATORIO_GERAL",
          periodoInicial: dados.PERIODO_INICIAL,
          periodoFinal: dados.PERIODO_FINAL,
          periodoLabel: dados.PERIODO_LABEL,
          documentFactory: doc,
          observacoes: "Relatorio geral de Frota gerado via DocumentFactory central."
        });
        frotaLog_("DOCUMENTO_FROTA_RELATORIO_GERAL", { session: session, referenciaId: doc.documentoId, depois: doc });
        return frotaRetornoDocumento_(doc, registro, registro.aviso, dados);
      });
    },

    gerarTermoMulta: function(sessionId, payload) {
      return wrap_(function() {
        const session = exigirSessao(sessionId);
        frotaExigirPerfilDocumento_(session);
        const p = payload || {};
        const multaId = p.multaId || p.MULTA_ID || p.ID || p.id;
        const multa = frotaFindById_(FROTA_ABAS.MULTAS, multaId);
        if (!multa) throw new Error("Multa nao encontrada para gerar termo.");
        const veiculo = frotaBuscarVeiculo_(multa.VEICULO_ID || multa.PLACA);
        if (!veiculo) throw new Error("Veiculo da multa nao encontrado.");
        const html = frotaHtmlTermoMulta_(multa, veiculo);
        const doc = frotaChamarDocumentFactory_(sessionId, {
          TIPO_DOCUMENTO: "FROTA_TERMO_MULTA",
          TITULO: "Termo de Ciencia e Responsabilidade por Infracao de Transito",
          MODULO_ORIGEM: "FROTA",
          ENTIDADE_ID: multa.ID,
          VEICULO_ID: multa.VEICULO_ID,
          DADOS: { multa: multa, veiculo: veiculo },
          HTML_CUSTOM: html,
          NOME_ARQUIVO: frotaSanitizarNomeArquivo_("FROTA_TERMO_MULTA_" + (multa.PLACA || veiculo.PLACA || "VEICULO") + "_" + (multa.NUMERO_AUTO || multa.ID)) + ".pdf",
          VISIBILIDADE: "PUBLICO_VALIDACAO"
        });
        const multaAtualizada = frotaUpdate_(FROTA_ABAS.MULTAS, multa.ID, {
          DOCUMENTO_ID: doc.documentoId || "",
          TOKEN_VALIDACAO: doc.tokenValidacao || "",
          HASH: doc.hash || "",
          LINK_PDF: doc.pdfUrl || "",
          ATUALIZADO_EM: frotaNow_(),
          ATUALIZADO_POR: frotaUser_(session).nome || frotaUser_(session).id
        });
        const registro = frotaRegistrarDocumentoGerado_(session, {
          veiculoId: veiculo.ID,
          placa: multa.PLACA || veiculo.PLACA,
          tipoDocumento: "FROTA_TERMO_MULTA",
          documentFactory: doc,
          observacoes: "Termo de multa gerado via DocumentFactory central."
        });
        frotaLog_("DOCUMENTO_FROTA_TERMO_MULTA", { session: session, referenciaId: multa.ID, veiculoId: veiculo.ID, placa: veiculo.PLACA, antes: multa, depois: multaAtualizada });
        return frotaRetornoDocumento_(doc, registro, registro.aviso);
      });
    },

    uploadArquivo: function(sessionId, payload) {
      return wrap_(function() {
        const session = exigirSessao(sessionId);
        const upload = frotaSalvarUploadDrive_(session, payload || {});
        return { item: upload, message: "Arquivo enviado com sucesso." };
      });
    }
  };
})();

function frotaListarVeiculos(sessionId, filtro) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.listarVeiculos(sessionId, filtro))); }
function frotaPesquisarVeiculos(sessionId, filtro) { return frotaListarVeiculos(sessionId, filtro); }
function frotaSalvarVeiculo(sessionId, payload) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.salvarVeiculo(sessionId, payload))); }
function frotaObterVeiculo(sessionId, payload) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.obterVeiculo(sessionId, payload))); }
function frotaListarReservas(sessionId, filtros) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.listarReservas(sessionId, filtros))); }
function frotaSalvarReserva(sessionId, payload) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.salvarReserva(sessionId, payload))); }
function frotaVerificarDisponibilidade(sessionId, payload) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.verificarDisponibilidade(sessionId, payload))); }
function frotaRealizarCheckin(sessionId, payload) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.realizarCheckin(sessionId, payload))); }
function frotaRealizarCheckout(sessionId, payload) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.realizarCheckout(sessionId, payload))); }
function frotaListarMovimentos(sessionId, filtros) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.listarMovimentos(sessionId, filtros))); }
function frotaListarVistorias(sessionId, filtros) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.listarVistorias(sessionId, filtros))); }
function frotaSalvarVistoria(sessionId, payload) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.salvarVistoria(sessionId, payload))); }
function frotaListarAbastecimentos(sessionId, filtros) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.listarAbastecimentos(sessionId, filtros))); }
function frotaSalvarAbastecimento(sessionId, payload) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.salvarAbastecimento(sessionId, payload))); }
function frotaListarManutencoes(sessionId, filtros) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.listarManutencoes(sessionId, filtros))); }
function frotaSalvarManutencao(sessionId, payload) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.salvarManutencao(sessionId, payload))); }
function frotaListarLavagens(sessionId, filtros) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.listarLavagens(sessionId, filtros))); }
function frotaSalvarLavagem(sessionId, payload) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.salvarLavagem(sessionId, payload))); }
function frotaListarMultas(sessionId, filtros) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.listarMultas(sessionId, filtros))); }
function frotaSalvarMulta(sessionId, payload) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.salvarMulta(sessionId, payload))); }
function frotaListarAlertas(sessionId, filtros) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.listarAlertas(sessionId, filtros))); }
function frotaResolverAlerta(sessionId, payload) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.resolverAlerta(sessionId, payload))); }
function frotaDashboard(sessionId, filtros) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.dashboard(sessionId, filtros))); }
function frotaGerarRelatorioVeiculo(sessionId, payload) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.gerarRelatorioVeiculo(sessionId, payload))); }
function frotaGerarRelatorioGeral(sessionId, payload) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.gerarRelatorioGeral(sessionId, payload))); }
function frotaGerarTermoMulta(sessionId, payload) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.gerarTermoMulta(sessionId, payload))); }
function frotaUploadArquivo(sessionId, payload) { pilotoGuardBloqueado_("FROTA"); return JSON.parse(JSON.stringify(SGO_FROTA_NOVA.uploadArquivo(sessionId, payload))); }

