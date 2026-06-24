const SGO_DATA = {

  _headersCache: {},
  _headerMapCache: {},

  /* =========================
     BANCO
  ========================== */
  getDB(dbKey) {
    const chave = SGO_DATA.resolveDbKey_(dbKey);
    const dbId = SGO_DATA.getDbIdByKey_(chave);

    if (!dbId) {
      throw new Error("Banco nao configurado para a chave: " + chave + ". Execute setupSGOv2().");
    }

    return SpreadsheetApp.openById(dbId);
  },

  getSheet(nome, dbKey) {
    const nomeAba = SGO_UTILS.safe(nome);
    if (!nomeAba) {
      throw new Error("Nome da aba nao informado.");
    }

    const ss = SGO_DATA.getDB(dbKey);
    const sheet = ss.getSheetByName(nomeAba);

    if (!sheet) {
      throw new Error("Aba nao encontrada: " + nomeAba + " no banco " + SGO_DATA.resolveDbKey_(dbKey));
    }

    return sheet;
  },

  getHeaders(nome, dbKey) {
    const cacheKey = SGO_DATA.cacheKey_(nome, dbKey);
    if (SGO_DATA._headersCache[cacheKey]) {
      return SGO_DATA._headersCache[cacheKey];
    }

    const sheet = SGO_DATA.getSheet(nome, dbKey);
    const lastCol = sheet.getLastColumn();

    if (lastCol < 1) {
      throw new Error("Aba sem cabecalho: " + nome);
    }

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
      return SGO_UTILS.safe(h);
    });

    SGO_DATA._headersCache[cacheKey] = headers;
    return headers;
  },

  getHeaderMap(nome, dbKey) {
    const cacheKey = SGO_DATA.cacheKey_(nome, dbKey);
    if (SGO_DATA._headerMapCache[cacheKey]) {
      return SGO_DATA._headerMapCache[cacheKey];
    }

    const headers = SGO_DATA.getHeaders(nome, dbKey);
    const mapa = {};

    headers.forEach(function(h, idx) {
      mapa[SGO_DATA.normalizarChave_(h)] = {
        nomeOriginal: h,
        index: idx
      };
    });

    SGO_DATA._headerMapCache[cacheKey] = mapa;
    return mapa;
  },

  clearCache() {
    SGO_DATA._headersCache = {};
    SGO_DATA._headerMapCache = {};
  },

  /* =========================
     LEITURA
  ========================== */
  getAll(nome, dbKey) {
    const sheet = SGO_DATA.getSheet(nome, dbKey);
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow < 2 || lastCol < 1) return [];

    const dados = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    const headers = dados[0].map(function(h) {
      return SGO_UTILS.safe(h);
    });

    const result = [];

    for (let i = 1; i < dados.length; i++) {
      const row = {};
      let linhaVazia = true;

      for (let j = 0; j < headers.length; j++) {
        let valor = dados[i][j];

        if (valor instanceof Date) {
          valor = SGO_DATA.formatDateForOutput_(valor);
        }

        row[headers[j]] = valor;

        if (!SGO_DATA.isValorVazio_(valor)) {
          linhaVazia = false;
        }
      }

      if (!linhaVazia) {
        result.push(row);
      }
    }

    return result;
  },

  getAllRaw(nome, dbKey) {
    const sheet = SGO_DATA.getSheet(nome, dbKey);
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow < 2 || lastCol < 1) return [];

    const dados = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    const headers = dados[0].map(function(h) {
      return SGO_UTILS.safe(h);
    });

    const result = [];

    for (let i = 1; i < dados.length; i++) {
      const row = {};
      let linhaVazia = true;

      for (let j = 0; j < headers.length; j++) {
        const valor = dados[i][j];
        row[headers[j]] = valor;

        if (!SGO_DATA.isValorVazio_(valor)) {
          linhaVazia = false;
        }
      }

      if (!linhaVazia) {
        result.push(row);
      }
    }

    return result;
  },

  getById(nome, id, dbKey) {
    const lista = SGO_DATA.getAll(nome, dbKey);
    const alvo = SGO_UTILS.safe(id);

    return lista.find(function(r) {
      return SGO_UTILS.safe(r.ID) === alvo;
    }) || null;
  },

  getByField(nome, campo, valor, dbKey) {
    const lista = SGO_DATA.getAll(nome, dbKey);
    const campoReal = SGO_DATA.resolverNomeCampo_(nome, campo, dbKey);
    const alvo = String(valor).trim();

    return lista.find(function(r) {
      return String(r[campoReal]).trim() === alvo;
    }) || null;
  },

  getManyByField(nome, campo, valor, dbKey) {
    const lista = SGO_DATA.getAll(nome, dbKey);
    const campoReal = SGO_DATA.resolverNomeCampo_(nome, campo, dbKey);
    const alvo = String(valor).trim();

    return lista.filter(function(r) {
      return String(r[campoReal]).trim() === alvo;
    });
  },

  findOne(nome, filtros, dbKey) {
    const lista = SGO_DATA.getAll(nome, dbKey);
    return lista.find(function(item) {
      return SGO_DATA.matchFiltros_(nome, item, filtros, dbKey);
    }) || null;
  },

  findMany(nome, filtros, dbKey) {
    const lista = SGO_DATA.getAll(nome, dbKey);
    return lista.filter(function(item) {
      return SGO_DATA.matchFiltros_(nome, item, filtros, dbKey);
    });
  },

  findIndexById(nome, id, dbKey) {
    const sheet = SGO_DATA.getSheet(nome, dbKey);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return -1;

    const valores = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const alvo = SGO_UTILS.safe(id);

    for (let i = 0; i < valores.length; i++) {
      if (SGO_UTILS.safe(valores[i][0]) === alvo) {
        return i + 2;
      }
    }

    return -1;
  },

  findRowIndexByField(nome, campo, valor, dbKey) {
    const sheet = SGO_DATA.getSheet(nome, dbKey);
    const headers = SGO_DATA.getHeaders(nome, dbKey);
    const campoReal = SGO_DATA.resolverNomeCampo_(nome, campo, dbKey);
    const colIndex = headers.indexOf(campoReal);

    if (colIndex < 0) return -1;

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return -1;

    const valores = sheet.getRange(2, colIndex + 1, lastRow - 1, 1).getValues();
    const alvo = String(valor).trim();

    for (let i = 0; i < valores.length; i++) {
      if (String(valores[i][0]).trim() === alvo) {
        return i + 2;
      }
    }

    return -1;
  },

  /* =========================
     ESCRITA
  ========================== */
  insert(nome, obj, dbKey) {
    const sheet = SGO_DATA.getSheet(nome, dbKey);

    if (!obj.ID) obj.ID = SGO_UTILS.uuid();
    if (!obj.CRIADO_EM) obj.CRIADO_EM = SGO_UTILS.nowIso();

    const normalizado = SGO_DATA.normalizarObjetoParaSheet(nome, obj, dbKey);
    const headers = SGO_DATA.getHeaders(nome, dbKey);

    const row = headers.map(function(h) {
      return normalizado[h];
    });

    sheet.appendRow(row);
    return normalizado;
  },

  insertMany(nome, lista, dbKey) {
    if (!Array.isArray(lista) || lista.length === 0) {
      return [];
    }

    const sheet = SGO_DATA.getSheet(nome, dbKey);
    const headers = SGO_DATA.getHeaders(nome, dbKey);

    const rows = lista.map(function(obj) {
      if (!obj.ID) obj.ID = SGO_UTILS.uuid();
      if (!obj.CRIADO_EM) obj.CRIADO_EM = SGO_UTILS.nowIso();

      const normalizado = SGO_DATA.normalizarObjetoParaSheet(nome, obj, dbKey);
      return headers.map(function(h) {
        return normalizado[h];
      });
    });

    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
    return lista;
  },

  update(nome, id, novosDados, dbKey) {
    const rowIndex = SGO_DATA.findIndexById(nome, id, dbKey);
    if (rowIndex < 2) return false;

    return SGO_DATA.updateByRowIndex(nome, rowIndex, novosDados, dbKey);
  },

  updateByField(nome, campo, valor, novosDados, dbKey) {
    const rowIndex = SGO_DATA.findRowIndexByField(nome, campo, valor, dbKey);
    if (rowIndex < 2) return false;

    return SGO_DATA.updateByRowIndex(nome, rowIndex, novosDados, dbKey);
  },

  updateByRowIndex(nome, rowIndex, novosDados, dbKey) {
    const sheet = SGO_DATA.getSheet(nome, dbKey);
    const headers = SGO_DATA.getHeaders(nome, dbKey);

    if (!rowIndex || rowIndex < 2) return false;

    const linhaAtual = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
    const linhaNova = [];

    for (let j = 0; j < headers.length; j++) {
      const campo = headers[j];

      if (SGO_DATA.objTemCampo_(novosDados, campo)) {
        linhaNova.push(SGO_DATA.obterValorCampo_(novosDados, campo));
      } else {
        linhaNova.push(linhaAtual[j]);
      }
    }

    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([linhaNova]);
    return true;
  },

  upsertByField(nome, campo, valor, dados, dbKey) {
    const rowIndex = SGO_DATA.findRowIndexByField(nome, campo, valor, dbKey);

    if (rowIndex >= 2) {
      SGO_DATA.updateByRowIndex(nome, rowIndex, dados, dbKey);
      return {
        action: "update",
        success: true
      };
    }

    const obj = Object.assign({}, dados || {});
    const campoReal = SGO_DATA.resolverNomeCampo_(nome, campo, dbKey);
    if (!SGO_DATA.objTemCampo_(obj, campoReal)) {
      obj[campoReal] = valor;
    }

    SGO_DATA.insert(nome, obj, dbKey);

    return {
      action: "insert",
      success: true
    };
  },

  remove(nome, id, dbKey) {
    const sheet = SGO_DATA.getSheet(nome, dbKey);
    const rowIndex = SGO_DATA.findIndexById(nome, id, dbKey);

    if (rowIndex < 2) return false;

    sheet.deleteRow(rowIndex);
    return true;
  },

  removeByField(nome, campo, valor, dbKey) {
    const sheet = SGO_DATA.getSheet(nome, dbKey);
    const rowIndex = SGO_DATA.findRowIndexByField(nome, campo, valor, dbKey);

    if (rowIndex < 2) return false;

    sheet.deleteRow(rowIndex);
    return true;
  },

  /* =========================
     UTILIDADES DE DADOS
  ========================== */
  gerarRegistroBase(extra) {
    return Object.assign({
      ID: SGO_UTILS.uuid(),
      CRIADO_EM: SGO_UTILS.nowIso()
    }, extra || {});
  },

  normalizarObjetoParaSheet(nome, obj, dbKey) {
    const headers = SGO_DATA.getHeaders(nome, dbKey);
    const headerMap = SGO_DATA.getHeaderMap(nome, dbKey);
    const origem = obj || {};
    const saida = {};

    headers.forEach(function(h) {
      saida[h] = "";
    });

    Object.keys(origem).forEach(function(chaveOrigem) {
      const chaveNormalizada = SGO_DATA.normalizarChave_(chaveOrigem);

      if (headerMap[chaveNormalizada]) {
        const nomeHeader = headerMap[chaveNormalizada].nomeOriginal;
        saida[nomeHeader] = origem[chaveOrigem];
      }
    });

    return saida;
  },

  cloneRegistro(nome, id, extras, dbKey) {
    const original = SGO_DATA.getById(nome, id, dbKey);
    if (!original) return null;

    const novo = Object.assign({}, original, extras || {});
    novo.ID = SGO_UTILS.uuid();
    novo.CRIADO_EM = SGO_UTILS.nowIso();

    SGO_DATA.insert(nome, novo, dbKey);
    return novo;
  },

  /* =========================
     CONSULTAS DE APOIO
  ========================== */
  existe(nome, campo, valor, dbKey) {
    return !!SGO_DATA.getByField(nome, campo, valor, dbKey);
  },

  listarIds(nome, dbKey) {
    return SGO_DATA.getAll(nome, dbKey).map(function(item) {
      return SGO_UTILS.safe(item.ID);
    }).filter(function(v) {
      return !!v;
    });
  },

  contar(nome, filtros, dbKey) {
    if (!filtros) {
      return SGO_DATA.getAll(nome, dbKey).length;
    }
    return SGO_DATA.findMany(nome, filtros, dbKey).length;
  },

  /* =========================
     LOG
  ========================== */
  log(acao, usuario, detalhe, modulo = "SISTEMA") {
    try {
      const sheet = SGO_DATA.getSheet(sgoGetCfgSafe_().SHEETS.SYS_LOGS);
      sheet.appendRow([
        SGO_UTILS.uuid(),
        SGO_UTILS.nowIso(),
        SGO_UTILS.safe(usuario),
        SGO_UTILS.safe(acao),
        SGO_UTILS.safe(modulo),
        SGO_UTILS.safe(detalhe)
      ]);
    } catch (e) {
      // Nao derruba o sistema por falha de log.
    }
  },

  /* =========================
     MULTI-BANCO
  ========================== */
  resolveDbKey_(dbKey) {
    const raw = SGO_UTILS.safeUpper(dbKey || "PRINCIPAL");
    if (raw === "MAIN" || raw === "DB" || raw === "DEFAULT") return "PRINCIPAL";
    if (raw === "DB_OS") return "OS";
    if (raw === "DB_FROTA") return "FROTA";
    if (raw === "DB_ESTOQUE" || raw === "SUPRIMENTOS" || raw === "ALMOXARIFADO") return "ESTOQUE";
    if (raw === "DB_COMERCIAL" || raw === "ORC") return "COMERCIAL";
    return raw || "PRINCIPAL";
  },

  getDbIdByKey_(dbKey) {
    const chave = SGO_DATA.resolveDbKey_(dbKey);
    if (chave === "PRINCIPAL") return SGO_UTILS.safe(sgoGetCfgSafe_().DB_ID);
    if (chave === "OS") return SGO_UTILS.safe(sgoGetCfgSafe_().DB_OS_ID);
    if (chave === "FROTA") return SGO_UTILS.safe(sgoGetCfgSafe_().DB_FROTA_ID);
    if (chave === "ESTOQUE") return SGO_UTILS.safe(sgoGetCfgSafe_().DB_ESTOQUE_ID);
    if (chave === "COMERCIAL") return SGO_UTILS.safe(sgoGetCfgSafe_().DB_COMERCIAL_ID);
    throw new Error("Chave de banco desconhecida: " + chave);
  },

  cacheKey_(nome, dbKey) {
    return SGO_DATA.resolveDbKey_(dbKey) + "::" + SGO_UTILS.safe(nome);
  },

  /* =========================
     METODOS INTERNOS
  ========================== */
  matchFiltros_(nome, item, filtros, dbKey) {
    const objFiltros = filtros || {};
    const chaves = Object.keys(objFiltros);

    if (chaves.length === 0) return true;

    for (let i = 0; i < chaves.length; i++) {
      const chaveFiltro = chaves[i];
      const campoReal = SGO_DATA.resolverNomeCampo_(nome, chaveFiltro, dbKey);

      if (String(item[campoReal]).trim() !== String(objFiltros[chaveFiltro]).trim()) {
        return false;
      }
    }

    return true;
  },

  resolverNomeCampo_(nome, campo, dbKey) {
    const headers = SGO_DATA.getHeaders(nome, dbKey);
    const mapa = SGO_DATA.getHeaderMap(nome, dbKey);
    const chave = SGO_DATA.normalizarChave_(campo);

    if (mapa[chave]) {
      return mapa[chave].nomeOriginal;
    }

    const campoSeguro = SGO_UTILS.safe(campo);
    if (headers.indexOf(campoSeguro) >= 0) {
      return campoSeguro;
    }

    throw new Error("Campo nao encontrado na aba '" + nome + "': " + campo);
  },

  normalizarChave_(texto) {
    return SGO_UTILS.safe(texto)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^\w]/g, "")
      .toUpperCase();
  },

  objTemCampo_(obj, campo) {
    if (!obj) return false;

    if (Object.prototype.hasOwnProperty.call(obj, campo)) {
      return true;
    }

    const chaveAlvo = SGO_DATA.normalizarChave_(campo);

    return Object.keys(obj).some(function(k) {
      return SGO_DATA.normalizarChave_(k) === chaveAlvo;
    });
  },

  obterValorCampo_(obj, campo) {
    if (!obj) return undefined;

    if (Object.prototype.hasOwnProperty.call(obj, campo)) {
      return obj[campo];
    }

    const chaveAlvo = SGO_DATA.normalizarChave_(campo);
    const chaveReal = Object.keys(obj).find(function(k) {
      return SGO_DATA.normalizarChave_(k) === chaveAlvo;
    });

    return chaveReal ? obj[chaveReal] : undefined;
  },

  isValorVazio_(valor) {
    return valor === "" || valor === null || valor === undefined;
  },

  formatDateForOutput_(dateValue) {
    try {
      const tz = (typeof sgoGetCfgSafe_() !== "undefined" && sgoGetCfgSafe_().SISTEMA && sgoGetCfgSafe_().SISTEMA.TIMEZONE)
                 ? sgoGetCfgSafe_().SISTEMA.TIMEZONE
                 : Session.getScriptTimeZone();

      return Utilities.formatDate(
        dateValue,
        tz,
        "yyyy-MM-dd'T'HH:mm:ss"
      );
    } catch (e) {
      try {
        return new Date(dateValue).toISOString();
      } catch (err) {
        return String(dateValue || "");
      }
    }
  }

};
