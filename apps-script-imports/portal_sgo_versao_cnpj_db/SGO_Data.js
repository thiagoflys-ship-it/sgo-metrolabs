const SGO_DATA = {

  // Cache em memória para evitar leituras repetitivas dos cabeçalhos na mesma execução
  _headersCache: {},
  _headerMapCache: {},

  /* =========================
     BANCO
  ========================== */
  getDB() {
    const dbId = SGO_UTILS.safe(SGO_CFG.DB_ID);
    if (!dbId) {
      throw new Error("Banco não configurado. Execute o setupSGO().");
    }
    return SpreadsheetApp.openById(dbId);
  },

  getSheet(nome) {
    const nomeAba = SGO_UTILS.safe(nome);
    if (!nomeAba) {
      throw new Error("Nome da aba não informado.");
    }

    const ss = SGO_DATA.getDB();
    const sheet = ss.getSheetByName(nomeAba);

    if (!sheet) {
      throw new Error("Aba não encontrada: " + nomeAba);
    }

    return sheet;
  },

  getHeaders(nome) {
    if (SGO_DATA._headersCache[nome]) {
      return SGO_DATA._headersCache[nome];
    }

    const sheet = SGO_DATA.getSheet(nome);
    const lastCol = sheet.getLastColumn();

    if (lastCol < 1) {
      throw new Error("Aba sem cabeçalho: " + nome);
    }

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
      return SGO_UTILS.safe(h);
    });

    SGO_DATA._headersCache[nome] = headers;
    return headers;
  },

  getHeaderMap(nome) {
    if (SGO_DATA._headerMapCache[nome]) {
      return SGO_DATA._headerMapCache[nome];
    }

    const headers = SGO_DATA.getHeaders(nome);
    const mapa = {};

    headers.forEach(function(h, idx) {
      mapa[SGO_DATA.normalizarChave_(h)] = {
        nomeOriginal: h,
        index: idx
      };
    });

    SGO_DATA._headerMapCache[nome] = mapa;
    return mapa;
  },

  /* =========================
     LEITURA
  ========================== */
  getAll(nome) {
    const sheet = SGO_DATA.getSheet(nome);
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

        if (/^(CNPJ|CNPJ_UNIDADE|CLIENTE_CNPJ)$/.test(headers[j])) valor = SGO_UTILS.cnpjArmazenado(valor);
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

  getAllRaw(nome) {
    const sheet = SGO_DATA.getSheet(nome);
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

  getById(nome, id) {
    const lista = SGO_DATA.getAll(nome);
    const alvo = SGO_UTILS.safe(id);

    return lista.find(function(r) {
      return SGO_UTILS.safe(r.ID) === alvo;
    }) || null;
  },

  getByField(nome, campo, valor) {
    const lista = SGO_DATA.getAll(nome);
    const campoReal = SGO_DATA.resolverNomeCampo_(nome, campo);
    const alvo = String(valor).trim(); // Ajuste para não falhar com números zero

    return lista.find(function(r) {
      return String(r[campoReal]).trim() === alvo;
    }) || null;
  },

  getManyByField(nome, campo, valor) {
    const lista = SGO_DATA.getAll(nome);
    const campoReal = SGO_DATA.resolverNomeCampo_(nome, campo);
    const alvo = String(valor).trim();

    return lista.filter(function(r) {
      return String(r[campoReal]).trim() === alvo;
    });
  },

  findOne(nome, filtros) {
    const lista = SGO_DATA.getAll(nome);
    return lista.find(function(item) {
      return SGO_DATA.matchFiltros_(nome, item, filtros);
    }) || null;
  },

  findMany(nome, filtros) {
    const lista = SGO_DATA.getAll(nome);
    return lista.filter(function(item) {
      return SGO_DATA.matchFiltros_(nome, item, filtros);
    });
  },

  findIndexById(nome, id) {
    const sheet = SGO_DATA.getSheet(nome);
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

  findRowIndexByField(nome, campo, valor) {
    const sheet = SGO_DATA.getSheet(nome);
    const headers = SGO_DATA.getHeaders(nome);
    const campoReal = SGO_DATA.resolverNomeCampo_(nome, campo);
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
  insert(nome, obj) {
    const sheet = SGO_DATA.getSheet(nome);
    
    // Garante que todo novo registro tenha ID e Data se não vier preenchido
    if (!obj.ID) obj.ID = SGO_UTILS.uuid();
    if (!obj.CRIADO_EM) obj.CRIADO_EM = SGO_UTILS.nowIso();

    const normalizado = SGO_DATA.normalizarObjetoParaSheet(nome, obj);
    const headers = SGO_DATA.getHeaders(nome);
    
    const row = headers.map(function(h) {
      return normalizado[h];
    });

    SGO_DATA.prepararCnpjTexto_(sheet, headers, sheet.getLastRow() + 1, [row]);
    SGO_DATA.validarRelacaoCadastro_(nome, normalizado);
    SGO_DATA.validarCadastroUnico_(nome, normalizado, []);
    sheet.appendRow(row);
    return normalizado;
  },

  insertMany(nome, lista) {
    if (!Array.isArray(lista) || lista.length === 0) {
      return [];
    }

    const sheet = SGO_DATA.getSheet(nome);
    const headers = SGO_DATA.getHeaders(nome);
    
    const rows = lista.map(function(obj) {
      if (!obj.ID) obj.ID = SGO_UTILS.uuid();
      if (!obj.CRIADO_EM) obj.CRIADO_EM = SGO_UTILS.nowIso();

      const normalizado = SGO_DATA.normalizarObjetoParaSheet(nome, obj);
      return headers.map(function(h) {
        return normalizado[h];
      });
    });

    const pendentes = [];
    rows.forEach(function(row) {
      const obj = {}; headers.forEach(function(h,i) { obj[h] = row[i]; });
      SGO_DATA.validarRelacaoCadastro_(nome, obj);
      SGO_DATA.validarCadastroUnico_(nome, obj, pendentes);
      pendentes.push(obj);
    });
    SGO_DATA.prepararCnpjTexto_(sheet, headers, sheet.getLastRow() + 1, rows);
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
    return lista; // Retorna a lista original atualizada com IDs
  },

  update(nome, id, novosDados) {
    const rowIndex = SGO_DATA.findIndexById(nome, id);
    if (rowIndex < 2) return false;

    return SGO_DATA.updateByRowIndex(nome, rowIndex, novosDados);
  },

  updateByField(nome, campo, valor, novosDados) {
    const rowIndex = SGO_DATA.findRowIndexByField(nome, campo, valor);
    if (rowIndex < 2) return false;

    return SGO_DATA.updateByRowIndex(nome, rowIndex, novosDados);
  },

  updateByRowIndex(nome, rowIndex, novosDados) {
    const sheet = SGO_DATA.getSheet(nome);
    const headers = SGO_DATA.getHeaders(nome);

    if (!rowIndex || rowIndex < 2) return false;

    const linhaAtual = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
    const linhaNova = [];

    for (let j = 0; j < headers.length; j++) {
      const campo = headers[j];

      if (SGO_DATA.objTemCampo_(novosDados, campo)) {
        linhaNova.push(novosDados[campo]);
      } else {
        linhaNova.push(linhaAtual[j]);
      }
    }

    const candidato = {}; headers.forEach(function(h,i) { candidato[h] = linhaNova[i]; });
    const anterior = {}; headers.forEach(function(h,i) { anterior[h] = linhaAtual[i]; });
    if (['CAD_UNIDADES','CAD_EQUIPAMENTOS'].includes(nome) && ['CLIENTE_ID','UNIDADE_ID'].some(function(h) { return String(anterior[h] || '') !== String(candidato[h] || ''); })) throw new Error('Para alterar o vínculo, use o painel de vínculos do gestor e confira o impacto.');
    if (['CLIENTE_ID','UNIDADE_ID','EQUIPAMENTO_ID'].some(function(h) { return String(anterior[h] || '') !== String(candidato[h] || ''); })) SGO_DATA.validarRelacaoCadastro_(nome, candidato);
    SGO_DATA.validarCadastroUnico_(nome, candidato, [], candidato.ID);
    SGO_DATA.prepararCnpjTexto_(sheet, headers, rowIndex, [linhaNova]);
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([linhaNova]);
    return true;
  },

  upsertByField(nome, campo, valor, dados) {
    const rowIndex = SGO_DATA.findRowIndexByField(nome, campo, valor);

    if (rowIndex >= 2) {
      SGO_DATA.updateByRowIndex(nome, rowIndex, dados);
      return {
        action: "update",
        success: true
      };
    }

    const obj = Object.assign({}, dados || {});
    const campoReal = SGO_DATA.resolverNomeCampo_(nome, campo);
    if (!SGO_DATA.objTemCampo_(obj, campoReal)) {
      obj[campoReal] = valor;
    }

    SGO_DATA.insert(nome, obj);

    return {
      action: "insert",
      success: true
    };
  },

  remove(nome, id) {
    const sheet = SGO_DATA.getSheet(nome);
    const rowIndex = SGO_DATA.findIndexById(nome, id);

    if (rowIndex < 2) return false;

    SGO_DATA.exigirSemVinculos_(nome, id);
    sheet.deleteRow(rowIndex);
    return true;
  },

  removeByField(nome, campo, valor) {
    const sheet = SGO_DATA.getSheet(nome);
    const rowIndex = SGO_DATA.findRowIndexByField(nome, campo, valor);

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
      CRIADO_EM: SGO_UTILS.nowIso() // Atualizado para o padrão ISO que criamos
    }, extra || {});
  },

  normalizarObjetoParaSheet(nome, obj) {
    const headers = SGO_DATA.getHeaders(nome);
    const headerMap = SGO_DATA.getHeaderMap(nome);
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

  cloneRegistro(nome, id, extras) {
    const original = SGO_DATA.getById(nome, id);
    if (!original) return null;

    const novo = Object.assign({}, original, extras || {});
    novo.ID = SGO_UTILS.uuid();
    novo.CRIADO_EM = SGO_UTILS.nowIso(); // Atualizado para padrão ISO

    SGO_DATA.insert(nome, novo);
    return novo;
  },

  /* =========================
     CONSULTAS DE APOIO
  ========================== */
  existe(nome, campo, valor) {
    return !!SGO_DATA.getByField(nome, campo, valor);
  },

  listarIds(nome) {
    return SGO_DATA.getAll(nome).map(function(item) {
      return SGO_UTILS.safe(item.ID);
    }).filter(function(v) {
      return !!v;
    });
  },

  contar(nome, filtros) {
    if (!filtros) {
      return SGO_DATA.getAll(nome).length;
    }
    return SGO_DATA.findMany(nome, filtros).length;
  },

  /* =========================
     LOG (GENÉRICO)
  ========================== */
  log(acao, usuario, detalhe, modulo = "SISTEMA") {
    try {
      const sheet = SGO_DATA.getSheet(SGO_CFG.SHEETS.SYS_LOGS);

      // Correção Crítica: O log antigo inseria 5 colunas. O nosso banco exige 6 colunas.
      // Adicionado o parâmetro 'modulo' para não corromper a tabela SYS_LOGS.
      sheet.appendRow([
        SGO_UTILS.uuid(),
        SGO_UTILS.nowIso(), // Padrão de datas alinhado
        SGO_UTILS.safe(usuario),
        SGO_UTILS.safe(acao),
        SGO_UTILS.safe(modulo), // <- Módulo incluído!
        SGO_UTILS.safe(detalhe)
      ]);
      return true;
    } catch (e) {
      // não derruba o sistema
      return false;
    }
  },

  /* =========================
     MÉTODOS INTERNOS
  ========================== */
  matchFiltros_(nome, item, filtros) {
    const objFiltros = filtros || {};
    const chaves = Object.keys(objFiltros);

    if (chaves.length === 0) return true;

    for (let i = 0; i < chaves.length; i++) {
      const chaveFiltro = chaves[i];
      const campoReal = SGO_DATA.resolverNomeCampo_(nome, chaveFiltro);

      if (String(item[campoReal]).trim() !== String(objFiltros[chaveFiltro]).trim()) {
        return false;
      }
    }

    return true;
  },

  resolverNomeCampo_(nome, campo) {
    const headers = SGO_DATA.getHeaders(nome);
    const mapa = SGO_DATA.getHeaderMap(nome);
    const chave = SGO_DATA.normalizarChave_(campo);

    if (mapa[chave]) {
      return mapa[chave].nomeOriginal;
    }

    const campoSeguro = SGO_UTILS.safe(campo);
    if (headers.indexOf(campoSeguro) >= 0) {
      return campoSeguro;
    }

    throw new Error("Campo não encontrado na aba '" + nome + "': " + campo);
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

  isValorVazio_(valor) {
    return valor === "" || valor === null || valor === undefined;
  },

  formatDateForOutput_(dateValue) {
    try {
      const tz = (typeof SGO_CFG !== "undefined" && SGO_CFG.SISTEMA && SGO_CFG.SISTEMA.TIMEZONE) 
                 ? SGO_CFG.SISTEMA.TIMEZONE 
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
// Uma transação de cadastro inclui a conferência de identidade e a gravação.
['insert', 'insertMany', 'update', 'updateByField', 'updateByRowIndex', 'remove'].forEach(function(nome) {
  const original = SGO_DATA[nome];
  SGO_DATA[nome] = function() {
    const lock = LockService.getScriptLock();
    const dono = !lock.hasLock();
    if (dono) lock.waitLock(30000);
    try { return original.apply(SGO_DATA, arguments); }
    finally { if (dono) { try { SpreadsheetApp.flush(); } finally { lock.releaseLock(); } } }
  };
});

SGO_DATA.prepararCnpjTexto_ = function(sheet, headers, inicio, rows) {
  if (inicio + rows.length - 1 > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), inicio + rows.length - 1 - sheet.getMaxRows());
  headers.forEach(function(h, i) {
    if (!/^(CNPJ|CNPJ_UNIDADE|CLIENTE_CNPJ)$/.test(h)) return;
    rows.forEach(function(row) { row[i] = SGO_UTILS.cnpjArmazenado(row[i]); });
    sheet.getRange(inicio, i + 1, rows.length, 1).setNumberFormat('@');
  });
};

SGO_DATA.validarCadastroUnico_ = function(nome, candidato, pendentes, ignorarId) {
  if (!/^CAD_/.test(nome)) return;
  const lista = SGO_DATA.getAll(nome).concat(pendentes || []);
  const normal = function(v) { return SGO_UTILS.safeUpper(v); };
  const anterior = ignorarId && lista.find(function(r) { return String(r.ID) === String(ignorarId); });
  if (nome === 'CAD_EQUIPAMENTOS' && (!anterior || String(anterior.CLIENTE_ID) !== String(candidato.CLIENTE_ID) || String(anterior.UNIDADE_ID) !== String(candidato.UNIDADE_ID))) {
    const cliente = SGO_DATA.getById('CAD_CLIENTES', candidato.CLIENTE_ID);
    const unidade = SGO_DATA.getById('CAD_UNIDADES', candidato.UNIDADE_ID);
    if (!cliente || !unidade || String(unidade.CLIENTE_ID) !== String(cliente.ID)) throw new Error('Selecione uma unidade pertencente ao cliente do equipamento.');
  }
  function iguais(a,b) {
    if (nome === 'CAD_CLIENTES') return a.CNPJ && SGO_UTILS.cnpjArmazenado(a.CNPJ) === SGO_UTILS.cnpjArmazenado(b.CNPJ);
    if (nome === 'CAD_UNIDADES') return (a.CNPJ_UNIDADE && SGO_UTILS.cnpjArmazenado(a.CNPJ_UNIDADE) === SGO_UTILS.cnpjArmazenado(b.CNPJ_UNIDADE)) || (a.NOME_UNIDADE && normal(a.CLIENTE_ID) === normal(b.CLIENTE_ID) && normal(a.NOME_UNIDADE) === normal(b.NOME_UNIDADE));
    if (nome === 'CAD_EQUIPAMENTOS') return a.TAG && !/^(N\/P|N\/A|S\/N|SEM TAG|-)$/.test(normal(a.TAG)) && normal(a.CLIENTE_ID) === normal(b.CLIENTE_ID) && normal(a.TAG) === normal(b.TAG);
    if (nome === 'CAD_PADROES') return a.TAG && a.CERTIFICADO_NUMERO && ['TAG','DESCRICAO','CERTIFICADO_NUMERO','VALIDADE'].every(function(c) { return normal(a[c]) === normal(b[c]); });
    const campo = {CAD_USUARIOS:'USUARIO', CAD_VEICULOS:'PLACA', CAD_TECNICOS:'USUARIO_ID'}[nome];
    return campo && a[campo] && normal(a[campo]) === normal(b[campo]);
  }
  if (lista.some(function(r) { return String(r.ID) === String(candidato.ID) && !ignorarId; })) throw new Error('Já existe cadastro com este ID.');
  // Permite corrigir contato/status de um legado repetido sem criar nova colisão.
  if (anterior && iguais(candidato, anterior)) return;
  if (lista.some(function(r) { return String(r.ID) !== String(ignorarId || '') && iguais(candidato,r); })) throw new Error('Já existe cadastro com esta identificação em ' + nome + '. Localize e edite o registro existente.');
};

SGO_DATA.exigirSemVinculos_ = function(nome, id) {
  const campo = nome === 'CAD_CLIENTES' ? 'CLIENTE_ID' : nome === 'CAD_UNIDADES' ? 'UNIDADE_ID' : '';
  if (!campo) return;
  const alvo = String(id);
  const relacionados = [];
  SGO_DATA.getDB().getSheets().forEach(function(sheet) {
    const titulo = sheet.getName();
    if (titulo === nome || /^(SYS_LOGS|BK_)/.test(titulo) || sheet.getLastRow() < 2) return;
    const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    const indices = headers.map(function(h,i) { return h === campo || (campo === 'CLIENTE_ID' && h === 'CLIENTE_ID_SGO') || (titulo === 'AUVO_SYNC' && h === 'ENTIDADE_ID') ? i : -1; }).filter(function(i) { return i >= 0; });
    if (indices.some(function(i) { return sheet.getRange(2,i+1,sheet.getLastRow()-1,1).getValues().some(function(r) { return String(r[0]) === alvo; }); })) relacionados.push(titulo);
  });
  if (relacionados.length) throw new Error('Este cadastro possui vínculos em ' + relacionados.join(', ') + '. Transfira os vínculos antes de excluir, ou inative o cadastro.');
};

SGO_DATA.validarRelacaoCadastro_ = function(nome, dados) {
  if (!['CAD_UNIDADES','CAD_EQUIPAMENTOS','DOC_DOCUMENTOS','CERT_CALIBRACAO','NR13_LAUDOS'].includes(nome)) return;
  const c=SGO_DATA.getById('CAD_CLIENTES', dados.CLIENTE_ID);
  if (!c || SGO_UTILS.safeUpper(c.STATUS)!=='ATIVO') throw new Error('Cliente ausente ou inativo. Confira o vínculo antes de salvar.');
  if(nome==='CAD_UNIDADES')return;
  const e=dados.EQUIPAMENTO_ID ? SGO_DATA.getById('CAD_EQUIPAMENTOS',dados.EQUIPAMENTO_ID) : null;
  const unidadeId=dados.UNIDADE_ID || (e && e.UNIDADE_ID);
  const u=SGO_DATA.getById('CAD_UNIDADES',unidadeId);
  if(!u || SGO_UTILS.safeUpper(u.STATUS)!=='ATIVO' || String(u.CLIENTE_ID)!==String(c.ID))throw new Error('Unidade sem vínculo ativo com o cliente. Atualize a seleção ou consulte o painel de vínculos.');
  if(dados.EQUIPAMENTO_ID && (!e || SGO_UTILS.safeUpper(e.STATUS)!=='ATIVO' || String(e.CLIENTE_ID)!==String(c.ID) || String(e.UNIDADE_ID)!==String(u.ID)))throw new Error('Equipamento e unidade não correspondem ao cliente selecionado.');
};
