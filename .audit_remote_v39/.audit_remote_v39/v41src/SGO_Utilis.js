const SGO_UTILS = {

  /* =========================
     GERADORES
  ========================== */
  uuid() {
    return Utilities.getUuid();
  },

  now() {
    return new Date();
  },

  nowIso() {
    return new Date().toISOString();
  },

  /* =========================
     TRATAMENTO DE DADOS
  ========================== */
  safe(v) {
    return (v === null || v === undefined) ? "" : String(v).trim();
  },

  safeUpper(v) {
    return SGO_UTILS.safe(v).toUpperCase();
  },

  safeLower(v) {
    return SGO_UTILS.safe(v).toLowerCase();
  },

  onlyDigits(v) {
    return SGO_UTILS.safe(v).replace(/\D/g, "");
  },

  /* =========================
     CONVERSÕES
  ========================== */
  toNumber(v, def = 0) {
    try {
      if (v === null || v === undefined || v === "") return def;
      // Trata formato de moeda brasileiro (ex: 1.000,50 -> 1000.50)
      const n = Number(String(v).replace(/\./g, "").replace(",", "."));
      return isNaN(n) ? def : n;
    } catch (e) {
      return def;
    }
  },

  toBoolean(v) {
    if (typeof v === "boolean") return v;
    const val = SGO_UTILS.safeLower(v);
    return val === "true" || val === "1" || val === "sim" || val === "on" || val === "s";
  },

  /* =========================
     VALIDAÇÕES
  ========================== */
  isEmpty(v) {
    return SGO_UTILS.safe(v) === "";
  },

  isNotEmpty(v) {
    return !SGO_UTILS.isEmpty(v);
  },

  isEmail(v) {
    const email = SGO_UTILS.safe(v);
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  isCnpj(v) {
    const cnpj = SGO_UTILS.onlyDigits(v);
    if (cnpj.length !== 14) return false;
    
    // Elimina CNPJs inválidos conhecidos (ex: 00000000000000)
    if (/^(\d)\1+$/.test(cnpj)) return false;

    // Validação matemática real dos dígitos verificadores do CNPJ
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(0)) return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(1)) return false;

    return true;
  },

  /* =========================
     NORMALIZAÇÃO E FORMATAÇÃO
  ========================== */
  normalizeCnpj(v) {
    return SGO_UTILS.onlyDigits(v);
  },

  formatCnpj(v) {
    const cnpj = SGO_UTILS.onlyDigits(v);
    if (cnpj.length !== 14) return SGO_UTILS.safe(v);

    return cnpj.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5"
    );
  },

  normalizePhone(v) {
    return SGO_UTILS.onlyDigits(v);
  },

  formatPhone(v) {
    let phone = SGO_UTILS.onlyDigits(v);
    if (phone.length === 11) {
      return phone.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
    } else if (phone.length === 10) {
      return phone.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
    }
    return SGO_UTILS.safe(v);
  },

  /* =========================
     TEXTO
  ========================== */
  truncate(texto, limite = 100) {
    const t = SGO_UTILS.safe(texto);
    if (t.length <= limite) return t;
    return t.substring(0, limite) + "...";
  },

  /* =========================
     DATA / FORMATAÇÃO
  ========================== */
  formatDateBR(date) {
    try {
      if (!date) return "";
      const d = new Date(date);
      // Busca o timezone configurado em SGO_CFG (se existir), senão usa o padrão do script
      const tz = (typeof SGO_CFG !== "undefined" && SGO_CFG.SISTEMA && SGO_CFG.SISTEMA.TIMEZONE) 
                 ? SGO_CFG.SISTEMA.TIMEZONE 
                 : Session.getScriptTimeZone();
      return Utilities.formatDate(d, tz, "dd/MM/yyyy HH:mm");
    } catch (e) {
      return "";
    }
  },

  /* =========================
     OBJETO / CLONE
  ========================== */
  clone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      return {};
    }
  },

  merge(base, extra) {
    return Object.assign({}, base || {}, extra || {});
  },

  /* =========================
     LOG AUXILIAR
  ========================== */
  log(label, data) {
    try {
      const msg = (typeof data === 'object') ? JSON.stringify(data) : data;
      Logger.log(`${label} => ${msg}`);
    } catch (e) {
      Logger.log(label);
    }
  }

};