/* ================================================================
   METROLABS SGO+ — IMPORTAÇÃO INTELIGENTE DE DADOS
   Arquivo: SGO_Importacao.js

   Suporta importação de Clientes, Unidades e Equipamentos a partir
   de arquivos CSV / XLSX (parse feito no frontend com SheetJS).

   - Mapeamento automático de colunas com correspondência fuzzy
   - Detecção de duplicatas por CNPJ (clientes) e TAG (equipamentos)
   - Aliases pré-configurados para sistemas comuns (genérico + BR)
   - Quando receber colunas do Arkmeds/AUVO, adicionar em ALIASES
   ================================================================ */

const SGO_IMPORTACAO = (() => {

  /* ================================================================
     ALIASES — correspondência fuzzy de colunas
     Adicione aliases do Arkmeds/AUVO aqui quando tiver as colunas
     ================================================================ */
  const ALIASES = {

    // ── CLIENTES ────────────────────────────────────────────────────
    // Colunas sugeridas para o arquivo: use exatamente estes nomes
    //   razao social | nome fantasia | cnpj | e-mail | telefone |
    //   endereço | numero | complemento | bairro | cidade | uf | cep | contato
    CLIENTES: {
      RAZAO_SOCIAL: [
        "razao social","razão social",
        "nome empresa","nome do cliente","nome cliente",
        "empresa","nome","company","razaosocial","nome completo"
      ],
      NOME_FANTASIA: [
        "nome fantasia",
        "fantasia","nome comercial","apelido","nomefantasia",
        "nome de exibicao","nome de exibição"
      ],
      CNPJ: [
        "cnpj",
        "cnpj/cpf","cpf/cnpj","documento","doc",
        "identificacao","identificação","cnpj cpf"
      ],
      EMAIL: [
        "e-mail","email",
        "email contato","contato email","mail","endereco email"
      ],
      TELEFONE: [
        "telefone",
        "fone","celular","tel","phone","whatsapp",
        "fone celular","tel celular","telefone principal",
        "telefone1","telefone 1","fone1","fone 1"
      ],
      ENDERECO: [
        "endereço","endereco",
        "logradouro","address","end","endereço completo",
        "logradouro completo","rua"
      ],
      NUMERO: [
        "numero","número","nro","nr","num","num end"
      ],
      COMPLEMENTO: [
        "complemento","comp","apto","apartamento"
      ],
      BAIRRO: [
        "bairro","district"
      ],
      CIDADE: [
        "cidade","city","municipio","município","localidade"
      ],
      UF: [
        "uf","state","estado","sigla estado"
      ],
      CEP: [
        "cep","postal","zip"
      ],
      RESPONSAVEL: [
        "contato",
        "responsavel","responsável","nome responsavel",
        "responsavel tecnico","nome contato","pessoa de contato"
      ]
    },

    // ── UNIDADES ────────────────────────────────────────────────────
    // Colunas sugeridas para o arquivo: use exatamente estes nomes
    //   cliente | nome da unidade | endereço | cidade | uf | cep |
    //   numero | complemento | bairro | responsável | telefone
    UNIDADES: {
      CLIENTE_NOME: [
        "cliente","nome do cliente","nome cliente",
        "empresa","razao social","razão social"
      ],
      NOME_UNIDADE: [
        "nome da unidade","unidade",
        "local","localidade","filial","site","nome local",
        "posto","branch","local de trabalho","instalacao","planta",
        "nome","nome fantasia"
      ],
      ENDERECO: [
        "endereço","endereco",
        "logradouro","address","rua"
      ],
      CIDADE: [
        "cidade","city","municipio","município"
      ],
      UF: [
        "uf","state","estado"
      ],
      CEP: [
        "cep","postal"
      ],
      NUMERO: [
        "numero","número","nro","nr"
      ],
      COMPLEMENTO: [
        "complemento","comp"
      ],
      BAIRRO: [
        "bairro","district"
      ],
      RESPONSAVEL: [
        "responsável","responsavel",
        "responsável da unidade","contato"
      ],
      TELEFONE: [
        "telefone","fone","tel",
        "telefone1","telefone 1","fone1"
      ]
    },

    // ── EQUIPAMENTOS ────────────────────────────────────────────────
    // Colunas sugeridas para o arquivo: use exatamente estes nomes
    //   cliente | unidade | tipo do equipamento | tag | fabricante |
    //   modelo | número de série | setor / localização |
    //   tipo de posse | proprietário / fornecedor
    EQUIPAMENTOS: {
      CLIENTE_NOME: [
        "cliente",
        "nome cliente","razao social","empresa","razão social",
        "cliente razao social","nome do cliente","contratante"
      ],
      UNIDADE_NOME: [
        "unidade",
        "local","filial","localidade","site","unidade cliente",
        "local equipamento","instalacao","instalação"
      ],
      TIPO: [
        "tipo do equipamento","tipo de equipamento","tipo",
        "categoria","equipment type","classificacao","classificação",
        "grupo","grupo equipamento","descricao tipo","tipo ativo"
      ],
      TAG: [
        "tag","tag identificador",
        "patrimônio","patrimonio","codigo","código",
        "codigo patrimonio","número patrimônio","tombamento",
        "registro","asset","etiqueta","nro patrimonio","nº patrimônio",
        "id equipamento","cod equipamento","id ativo",
        "identificacao","identificação","qr_code","qr code"
      ],
      FABRICANTE: [
        "fabricante","marca",
        "manufacturer","brand","fabricante marca",
        "marca fabricante","nome fabricante"
      ],
      MODELO: [
        "modelo",
        "model","descricao","descrição","nome equipamento",
        "equipment","descricao equipamento","denominacao","denominação",
        "descricao modelo","nome do equipamento",
        "equipamento"
      ],
      SERIE: [
        "número de série","numero de serie","serie","série",
        "ns","serial","serial number","num serie","nro serie",
        "nº serie","num de serie","numero serial","n serie",
        "numero_serie","núm série"
      ],
      SETOR: [
        "setor localizacao","setor / localizacao","setor","localização",
        "departamento","area","área","location","localizacao",
        "setor departamento","local instalacao","setor cme","setor de origem",
        "quadro de trabalho","quadro trabalho","quadro"
      ],
      TIPO_POSSE: [
        "tipo de posse","tipo posse","posse",
        "propriedade","modalidade"
      ],
      PROPRIETARIO: [
        "proprietário / fornecedor","proprietario fornecedor",
        "proprietario","proprietário","dono","owner",
        "empresa proprietaria","contratante"
      ]
    }
  };

  /* ================================================================
     UTILITÁRIOS
     ================================================================ */
  function norm_(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function calcScore_(header, aliases) {
    const h = norm_(header);
    if (!h) return 0;
    for (const a of aliases) {
      const n = norm_(a);
      if (h === n) return 100;
      if (h.startsWith(n) || n.startsWith(h)) return 85;
      if (h.includes(n) || n.includes(h)) return 70;
    }
    return 0;
  }

  /* ================================================================
     SUGESTÃO AUTOMÁTICA DE MAPEAMENTO
     Retorna para cada campo do SGO+ qual coluna do arquivo melhor encaixa
     ================================================================ */
  function sugerirMapeamento(sessionId, cabecalhos, tipo) {
    exigirSessao(sessionId);
    const grupo = ALIASES[tipo];
    if (!grupo) return { success: false, message: "Tipo inválido: " + tipo };

    const resultado = {};
    const usados    = new Set();

    for (const [campo, aliasList] of Object.entries(grupo)) {
      let melhorScore = 0, melhorIdx = -1;
      cabecalhos.forEach((h, idx) => {
        if (usados.has(idx)) return;
        const s = calcScore_(h, aliasList);
        if (s > melhorScore) { melhorScore = s; melhorIdx = idx; }
      });
      const mapeado = melhorScore >= 60;
      resultado[campo] = {
        indice:    mapeado ? melhorIdx : -1,
        header:    mapeado ? (cabecalhos[melhorIdx] || "") : "",
        confianca: melhorScore,
        obrigatorio: ["RAZAO_SOCIAL","TAG"].includes(campo)
      };
      if (mapeado) usados.add(melhorIdx);
    }

    return { success: true, mapeamento: resultado, campos: Object.keys(grupo) };
  }

  /* ================================================================
     IMPORTAR CLIENTES
     ================================================================ */
  function importarClientes(sessionId, registros, opcoes) {
    const sessao = exigirSessao(sessionId);
    const opts   = opcoes || {};

    const existentes = SGO_DATA.getAll(sgoGetCfgSafe_().SHEETS.CAD_CLIENTES);
    const mapCnpj    = {};
    const mapNome    = {};
    existentes.forEach(c => {
      const cnpj = String(c.CNPJ || "").replace(/[^0-9]/g, "");
      if (cnpj) mapCnpj[cnpj] = c;
      const nome = norm_(c.RAZAO_SOCIAL || c.NOME_FANTASIA);
      if (nome) mapNome[nome] = c;
    });

    let importados = 0, atualizados = 0, ignorados = 0;
    const erros = [];

    registros.forEach((reg, idx) => {
      try {
        const cnpjLimpo = String(reg.CNPJ || "").replace(/[^0-9]/g, "");
        const nomeRaw   = SGO_UTILS.safe(reg.RAZAO_SOCIAL || reg.NOME_FANTASIA || "");
        if (!nomeRaw) { ignorados++; return; }

        const existente = (cnpjLimpo && mapCnpj[cnpjLimpo]) || mapNome[norm_(nomeRaw)];
        if (existente && !opts.atualizarExistentes) { ignorados++; return; }

        const endParts = [reg.ENDERECO, reg.NUMERO, reg.COMPLEMENTO, reg.BAIRRO].filter(Boolean);
        const dados = {
          RAZAO_SOCIAL:  nomeRaw,
          NOME_FANTASIA: SGO_UTILS.safe(reg.NOME_FANTASIA || nomeRaw),
          CNPJ:          cnpjLimpo,
          EMAIL:         SGO_UTILS.safe(reg.EMAIL),
          TELEFONE:      SGO_UTILS.safe(reg.TELEFONE),
          ENDERECO:      endParts.join(", "),
          CIDADE:        SGO_UTILS.safe(reg.CIDADE),
          UF:            String(reg.UF || "").toUpperCase().substring(0, 2),
          CEP:           SGO_UTILS.safe(reg.CEP),
          RESPONSAVEL:   SGO_UTILS.safe(reg.RESPONSAVEL),
          STATUS:        sgoGetCfgSafe_().STATUS.ATIVO
        };

        if (existente && opts.atualizarExistentes) {
          SGO_DATA.update(sgoGetCfgSafe_().SHEETS.CAD_CLIENTES, existente.ID, dados);
          atualizados++;
        } else {
          SGO_DATA.insert(sgoGetCfgSafe_().SHEETS.CAD_CLIENTES, dados);
          importados++;
        }
      } catch(e) { erros.push({ linha: idx + 2, msg: e.message }); ignorados++; }
    });

    SGO_DATA.log("IMPORTACAO_CLIENTES", sessao.usuario,
      "Importados=" + importados + " Atualizados=" + atualizados + " Ignorados=" + ignorados,
      "IMPORTACAO");
    return { success: true, importados, atualizados, ignorados, erros };
  }

  /* ================================================================
     IMPORTAR UNIDADES
     ================================================================ */
  function importarUnidades(sessionId, registros, opcoes) {
    const sessao         = exigirSessao(sessionId);
    const opts           = opcoes || {};
    const clienteIdFixo  = SGO_UTILS.safe(opts.clienteId || "");

    // Carrega clientes para auto-resolução quando o arquivo tem coluna "cliente"
    const todosClientes  = SGO_DATA.getAll(sgoGetCfgSafe_().SHEETS.CAD_CLIENTES);
    const todasUnidades  = SGO_DATA.getAll(sgoGetCfgSafe_().SHEETS.CAD_UNIDADES);

    const temClienteNoArq = registros.some(r => SGO_UTILS.safe(r.CLIENTE_NOME));
    if (!clienteIdFixo && !temClienteNoArq) {
      return { success: false, message: "Selecione um cliente ou inclua a coluna 'cliente' no arquivo." };
    }

    function resolverClienteId_(nomeCli) {
      if (clienteIdFixo) return clienteIdFixo;
      if (!nomeCli) return "";
      const n = norm_(nomeCli);
      const c = todosClientes.find(x => norm_(x.RAZAO_SOCIAL) === n || norm_(x.NOME_FANTASIA) === n);
      return c ? SGO_UTILS.safe(c.ID) : "";
    }

    // Índice de unidades existentes por clienteId+nomeNorm para detecção de duplicatas
    const mapNome = {};
    todasUnidades.forEach(u => {
      const k = SGO_UTILS.safe(u.CLIENTE_ID) + "|" + norm_(u.NOME_UNIDADE);
      mapNome[k] = u;
    });

    let importados = 0, atualizados = 0, ignorados = 0;
    const erros = [];

    registros.forEach((reg, idx) => {
      try {
        const nomeRaw = SGO_UTILS.safe(reg.NOME_UNIDADE || "");
        if (!nomeRaw) { ignorados++; return; }

        const cliId = resolverClienteId_(reg.CLIENTE_NOME);
        if (!cliId) { erros.push({ linha: idx + 2, msg: "Cliente não encontrado: " + (reg.CLIENTE_NOME || "?") }); ignorados++; return; }

        const chave    = cliId + "|" + norm_(nomeRaw);
        const existente = mapNome[chave];
        if (existente && !opts.atualizarExistentes) { ignorados++; return; }

        const endParts = [reg.ENDERECO, reg.NUMERO, reg.COMPLEMENTO, reg.BAIRRO].filter(Boolean);
        const dados = {
          CLIENTE_ID:   cliId,
          NOME_UNIDADE: nomeRaw,
          CIDADE:       SGO_UTILS.safe(reg.CIDADE),
          UF:           String(reg.UF || "").toUpperCase().substring(0, 2),
          CEP:          SGO_UTILS.safe(reg.CEP),
          ENDERECO:     endParts.join(", "),
          RESPONSAVEL:  SGO_UTILS.safe(reg.RESPONSAVEL),
          TELEFONE:     SGO_UTILS.safe(reg.TELEFONE),
          STATUS:       sgoGetCfgSafe_().STATUS.ATIVO
        };

        if (existente && opts.atualizarExistentes) {
          SGO_DATA.update(sgoGetCfgSafe_().SHEETS.CAD_UNIDADES, existente.ID, dados);
          atualizados++;
        } else {
          SGO_DATA.insert(sgoGetCfgSafe_().SHEETS.CAD_UNIDADES, dados);
          importados++;
        }
      } catch(e) { erros.push({ linha: idx + 2, msg: e.message }); ignorados++; }
    });

    SGO_DATA.log("IMPORTACAO_UNIDADES", sessao.usuario,
      "Importados=" + importados + " Atualizados=" + atualizados + " Ignorados=" + ignorados,
      "IMPORTACAO");
    return { success: true, importados, atualizados, ignorados, erros };
  }

  /* ================================================================
     IMPORTAR EQUIPAMENTOS
     ================================================================ */
  function importarEquipamentos(sessionId, registros, opcoes) {
    const sessao    = exigirSessao(sessionId);
    const opts      = opcoes || {};
    const clienteId = SGO_UTILS.safe(opts.clienteId || "");
    const unidadeId = SGO_UTILS.safe(opts.unidadeId || "");

    const todosClientes = SGO_DATA.getAll(sgoGetCfgSafe_().SHEETS.CAD_CLIENTES);
    const todasUnidades = SGO_DATA.getAll(sgoGetCfgSafe_().SHEETS.CAD_UNIDADES);

    const existentes = SGO_DATA.getAll(sgoGetCfgSafe_().SHEETS.CAD_EQUIPAMENTOS);
    const mapTag     = {};
    existentes.forEach(e => { const t = norm_(e.TAG); if (t) mapTag[t] = e; });

    function resolverClienteId_(nomeCli) {
      if (clienteId) return clienteId;
      if (!nomeCli) return "";
      const n = norm_(nomeCli);
      const c = todosClientes.find(x => norm_(x.RAZAO_SOCIAL) === n || norm_(x.NOME_FANTASIA) === n);
      return c ? SGO_UTILS.safe(c.ID) : "";
    }

    function resolverUnidadeId_(nomeUni, cliId) {
      if (unidadeId) return unidadeId;
      if (!nomeUni || !cliId) return "";
      const n = norm_(nomeUni);
      const u = todasUnidades.find(x => SGO_UTILS.safe(x.CLIENTE_ID) === cliId && norm_(x.NOME_UNIDADE) === n);
      return u ? SGO_UTILS.safe(u.ID) : "";
    }

    let importados = 0, atualizados = 0, ignorados = 0;
    const erros = [];

    registros.forEach((reg, idx) => {
      try {
        const tagRaw = SGO_UTILS.safe(reg.TAG || "");
        if (!tagRaw) { ignorados++; return; }

        const existente = mapTag[norm_(tagRaw)];
        if (existente && !opts.atualizarExistentes) { ignorados++; return; }

        // Arkmeds: "proprietario" é absorvido por PROPRIETARIO; usa como fallback para linkar cliente
        const cliId = resolverClienteId_(reg.CLIENTE_NOME || reg.PROPRIETARIO);
        const uniId = resolverUnidadeId_(reg.UNIDADE_NOME, cliId);

        const posseRaw = SGO_UTILS.safeUpper(reg.TIPO_POSSE || "PROPRIO");
        const posseValida = ["PROPRIO","LOCADO","COMODATO","TERCEIRO"].includes(posseRaw) ? posseRaw : "PROPRIO";

        // Se TIPO vier genérico do Arkmeds ("Equipamento","Padrão"), extrai categoria do MODELO
        let tipoFinal = SGO_UTILS.safe(reg.TIPO);
        const tipoUp = tipoFinal.toUpperCase().replace(/[^A-Z]/g, "");
        if (!tipoFinal || tipoUp === "EQUIPAMENTO" || tipoUp === "PADRAO") {
          const modelo = SGO_UTILS.safe(reg.MODELO);
          if (modelo) {
            const palavras = modelo.trim().split(/\s+/);
            tipoFinal = palavras.slice(0, Math.min(2, palavras.length)).join(" ");
          }
        }

        const dados = {
          TAG:          tagRaw,
          TIPO:         tipoFinal,
          FABRICANTE:   SGO_UTILS.safe(reg.FABRICANTE),
          MODELO:       SGO_UTILS.safe(reg.MODELO),
          SERIE:        SGO_UTILS.safe(reg.SERIE),
          SETOR:        SGO_UTILS.safe(reg.SETOR),
          TIPO_POSSE:   posseValida,
          PROPRIETARIO: SGO_UTILS.safe(reg.PROPRIETARIO),
          CLIENTE_ID:   cliId,
          UNIDADE_ID:   uniId,
          STATUS:       sgoGetCfgSafe_().STATUS.ATIVO
        };

        if (existente && opts.atualizarExistentes) {
          SGO_DATA.update(sgoGetCfgSafe_().SHEETS.CAD_EQUIPAMENTOS, existente.ID, dados);
          atualizados++;
        } else {
          SGO_DATA.insert(sgoGetCfgSafe_().SHEETS.CAD_EQUIPAMENTOS, dados);
          importados++;
        }
      } catch(e) { erros.push({ linha: idx + 2, msg: e.message }); ignorados++; }
    });

    SGO_DATA.log("IMPORTACAO_EQUIPAMENTOS", sessao.usuario,
      "Importados=" + importados + " Atualizados=" + atualizados + " Ignorados=" + ignorados,
      "IMPORTACAO");
    return { success: true, importados, atualizados, ignorados, erros };
  }

  /* ================================================================
     HELPERS DE LISTAGEM (para selects no wizard)
     ================================================================ */
  function listarClientes(sessionId) {
    exigirSessao(sessionId);
    return {
      success: true,
      items: SGO_DATA.getAll(sgoGetCfgSafe_().SHEETS.CAD_CLIENTES)
        .filter(c => SGO_UTILS.safeUpper(c.STATUS) === sgoGetCfgSafe_().STATUS.ATIVO)
        .map(c => ({ ID: SGO_UTILS.safe(c.ID), NOME: SGO_UTILS.safe(c.NOME_FANTASIA || c.RAZAO_SOCIAL) }))
        .sort((a, b) => a.NOME.localeCompare(b.NOME))
    };
  }

  function listarUnidades(sessionId, clienteId) {
    exigirSessao(sessionId);
    return {
      success: true,
      items: SGO_DATA.getAll(sgoGetCfgSafe_().SHEETS.CAD_UNIDADES)
        .filter(u => SGO_UTILS.safeUpper(u.STATUS) === sgoGetCfgSafe_().STATUS.ATIVO &&
                     SGO_UTILS.safe(u.CLIENTE_ID) === SGO_UTILS.safe(clienteId))
        .map(u => ({ ID: SGO_UTILS.safe(u.ID), NOME: SGO_UTILS.safe(u.NOME_UNIDADE) }))
        .sort((a, b) => a.NOME.localeCompare(b.NOME))
    };
  }

  /* ================================================================
     LIMPEZA — apaga todos os registros de uma aba (mantém cabeçalho)
     ================================================================ */
  function limparAba(sessionId, tipo) {
    const sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) !== "ADMIN") {
      return { success: false, message: "Apenas ADMIN pode executar limpeza." };
    }
    const MAPA = {
      EQUIPAMENTOS: sgoGetCfgSafe_().SHEETS.CAD_EQUIPAMENTOS,
      CLIENTES:     sgoGetCfgSafe_().SHEETS.CAD_CLIENTES,
      UNIDADES:     sgoGetCfgSafe_().SHEETS.CAD_UNIDADES
    };
    const nomePlanilha = MAPA[SGO_UTILS.safeUpper(tipo)];
    if (!nomePlanilha) return { success: false, message: "Tipo inválido: " + tipo };

    const sheet = SGO_DATA.getSheet(nomePlanilha);
    const total = sheet.getLastRow();
    if (total < 2) return { success: true, removidos: 0 };

    // Apaga todas as linhas de dados de uma vez (da última para a 2ª para não deslocar índices)
    sheet.deleteRows(2, total - 1);

    SGO_DATA.log("LIMPEZA_" + tipo, sessao.usuario,
      "Removidas " + (total - 1) + " linhas de " + nomePlanilha, "ADMIN");
    return { success: true, removidos: total - 1 };
  }

  return {
    sugerirMapeamento,
    importarClientes,
    importarUnidades,
    importarEquipamentos,
    listarClientes,
    listarUnidades,
    limparAba
  };
})();

/* ================================================================
   WRAPPERS PÚBLICOS (chamados pelo frontend via google.script.run)
   ================================================================ */
function importacaoSugerirMapeamento(sessionId, cabecalhos, tipo) {
  try { return JSON.parse(JSON.stringify(SGO_IMPORTACAO.sugerirMapeamento(sessionId, cabecalhos, tipo))); }
  catch(e) { return { success: false, message: e.message }; }
}
function importacaoExecutarClientes(sessionId, registros, opcoes) {
  try { return JSON.parse(JSON.stringify(SGO_IMPORTACAO.importarClientes(sessionId, registros, opcoes))); }
  catch(e) { return { success: false, message: e.message }; }
}
function importacaoExecutarUnidades(sessionId, registros, opcoes) {
  try { return JSON.parse(JSON.stringify(SGO_IMPORTACAO.importarUnidades(sessionId, registros, opcoes))); }
  catch(e) { return { success: false, message: e.message }; }
}
function importacaoExecutarEquipamentos(sessionId, registros, opcoes) {
  try { return JSON.parse(JSON.stringify(SGO_IMPORTACAO.importarEquipamentos(sessionId, registros, opcoes))); }
  catch(e) { return { success: false, message: e.message }; }
}
function importacaoListarClientes(sessionId) {
  try { return JSON.parse(JSON.stringify(SGO_IMPORTACAO.listarClientes(sessionId))); }
  catch(e) { return { success: false, message: e.message }; }
}
function importacaoListarUnidades(sessionId, clienteId) {
  try { return JSON.parse(JSON.stringify(SGO_IMPORTACAO.listarUnidades(sessionId, clienteId))); }
  catch(e) { return { success: false, message: e.message }; }
}
function importacaoLimparAba(sessionId, tipo) {
  try { return JSON.parse(JSON.stringify(SGO_IMPORTACAO.limparAba(sessionId, tipo))); }
  catch(e) { return { success: false, message: e.message }; }
}
