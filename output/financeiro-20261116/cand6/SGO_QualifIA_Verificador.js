/**
 * SGO_QualifIA_Verificador.js — conferência automática dos textos redigidos pela IA (20/10/2026).
 *
 * Comum aos documentos de qualificação (Autoclave a vapor; reaproveitável pela qualificação
 * de baixa temperatura, Lavadora, Cadeia de Frio e Estufa). A IA só redige: o resultado vem
 * do motor determinístico. O texto é recusado quando:
 *  - cita número que não existe nos resultados (com tolerância do arredondamento mostrado);
 *  - cita norma fora da lista configurada ou número de cláusula/item de norma;
 *  - afirma veredito diferente do motor (ou a conclusão não declara o veredito do motor);
 *  - contém frase proibida (forma intermediária de veredito, referência a IA, emoji, termo
 *    vetado pelo cenário — por exemplo, pressão num ensaio que considerou só temperatura).
 * Quem chama troca o texto recusado pelo texto padrão determinístico.
 *
 * SGO_QIAV_numerosDe_(valor)             todos os números (Number) de um objeto/texto, em qualquer profundidade.
 * SGO_QIAV_verificar_(texto, regras)     → { ok, problemas:[...] }
 *   regras: { numeros:[Number], normas:[texto], veredito:'APROVADO'|'REPROVADO'|'INFORMATIVO',
 *             exigirVeredito:bool, termosProibidos:[RegExp|texto], inteirosLivresAte:Number,
 *             verificarNumeros:bool (padrão true) }
 */

var SGO_QIAV_FRASES_PROIBIDAS = [
  /aprovad[oa]s?\s+com\s+(alerta|ressalva)/i,
  /parcialmente\s+aprovad/i,
  /aprovad[oa]s?\s+condicionalmente/i,
  /aprova[cç][aã]o\s+condicional/i,
  /intelig[eê]ncia\s+artificial/i,
  /modelo\s+de\s+linguagem/i,
  /\bcomo\s+(uma\s+)?ia\b/i,
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
];

function SGO_QIAV_numerosDe_(valor, saida) {
  saida = saida || [];
  if (valor === null || valor === undefined) return saida;
  if (typeof valor === 'number') { if (isFinite(valor)) saida.push(valor); return saida; }
  if (typeof valor === 'string') {
    var re = /-?\d{1,3}(?:\.\d{3})+(?:,\d+)?|-?\d+(?:[.,]\d+)?/g, m;
    while ((m = re.exec(valor)) !== null) {
      var tok = m[0];
      var n = /\.\d{3}(,|$)/.test(tok) && /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(tok) ? Number(tok.replace(/\./g, '').replace(',', '.')) : Number(tok.replace(',', '.'));
      if (isFinite(n)) saida.push(n);
    }
    return saida;
  }
  if (Array.isArray(valor)) { valor.forEach(function (v) { SGO_QIAV_numerosDe_(v, saida); }); return saida; }
  if (typeof valor === 'object') { Object.keys(valor).forEach(function (k) { SGO_QIAV_numerosDe_(valor[k], saida); }); }
  return saida;
}

/** Remove do texto o que não é resultado numérico: datas, horários, normas, identificação de sensores e documentos. */
function SGO_QIAV_limparParaNumeros_(texto) {
  return String(texto || '')
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, ' ')
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?(:\d{1,3})?\b/g, ' ')
    .replace(/\b(ABNT\s+)?NBR(\s+ISO)?(\/TS)?\s*[\d\-:.]+/gi, ' ')
    .replace(/\bISO(\/TS)?\s*[\d\-:.]+/gi, ' ')
    .replace(/\bEN\s*\d+(:\d{4})?/g, ' ')
    .replace(/\bRDC\b[^.;,]{0,25}?\d+(\/\d{4})?/gi, ' ')
    .replace(/\b(S|ST|T|TP|CH|sensor(es)?|posi[cç][aã]o|ciclo|lote|n[ºo°]|n[uú]mero)[\s\-_]?\d+\b/gi, ' ')
    .replace(/\b[A-Z]{2,}[\-_][A-Z0-9\-_]+\b/g, ' ');
}

function SGO_QIAV_numeroDeTexto_(tok) {
  var casas = 0;
  var n;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(tok)) { n = Number(tok.replace(/\./g, '').replace(',', '.')); casas = (tok.split(',')[1] || '').length; }
  else { n = Number(tok.replace(',', '.')); casas = ((tok.split(/[.,]/)[1]) || '').length; }
  return { n: n, casas: casas };
}

function SGO_QIAV_verificar_(texto, regras) {
  regras = regras || {};
  var problemas = [];
  var t = String(texto || '');
  if (!t.trim()) return { ok: false, problemas: ['texto vazio'] };

  // 1. Números: cada número citado precisa existir nos resultados (no arredondamento mostrado).
  if (regras.verificarNumeros !== false) {
    var permitidos = (regras.numeros || []).filter(function (v) { return typeof v === 'number' && isFinite(v); });
    var livres = isFinite(Number(regras.inteirosLivresAte)) ? Number(regras.inteirosLivresAte) : 10;
    var limpo = SGO_QIAV_limparParaNumeros_(t);
    var re = /-?\d{1,3}(?:\.\d{3})+(?:,\d+)?|-?\d+(?:,\d+)?/g, m, vistos = {};
    while ((m = re.exec(limpo)) !== null) {
      var tok = m[0].replace(/^-/, '');
      if (vistos[tok]) continue;
      vistos[tok] = true;
      var x = SGO_QIAV_numeroDeTexto_(tok);
      if (!isFinite(x.n)) continue;
      if (x.casas === 0 && x.n <= livres) continue;
      var tol = 0.5 * Math.pow(10, -x.casas) + 1e-9;
      var achou = permitidos.some(function (p) { return Math.abs(Math.abs(p) - x.n) <= tol; });
      if (!achou) problemas.push('número que não está nos resultados: ' + tok);
    }
  }

  // 2. Normas: só as da lista; nenhuma cláusula/item de norma.
  var normas = (regras.normas || []).map(function (s) { return String(s || '').toUpperCase().replace(/\s+/g, ' '); });
  var reNorma = /\b(?:ABNT\s+)?NBR(?:\s+ISO)?(?:\/TS)?\s*(\d{3,5})|\bISO(?:\/TS)?\s*(\d{3,5})|\bEN\s*(\d{3,5})|\bRDC\b[^.;]{0,25}?(\d{1,4})\/\d{4}|\bIEC\s*(\d{3,5})|\bAAMI\s*(ST\s*\d+)|\bHTM\s*(\d+)/gi;
  var mn;
  while ((mn = reNorma.exec(t)) !== null) {
    var codigo = (mn[1] || mn[2] || mn[3] || mn[4] || mn[5] || mn[6] || mn[7] || '').toUpperCase();
    var citada = mn[0].toUpperCase();
    var ok = normas.some(function (n) {
      if (/^RDC/.test(citada)) return /RDC/.test(n) && n.indexOf(codigo + '/') >= 0;
      if (/^EN/.test(citada)) return new RegExp('\\bEN ' + codigo + '\\b').test(n);
      return n.indexOf(codigo) >= 0 && (/ISO/.test(citada) ? /ISO/.test(n) : true);
    });
    if (!ok) problemas.push('norma fora da lista configurada: ' + mn[0].trim());
  }
  if (/\b(sub)?cl[aá]usula\s*\d/i.test(t) || /\b(item|se[cç][aã]o|subse[cç][aã]o)\s+\d+\.\d+/i.test(t) || /\banexo\s+[A-H]\b\s+d[ae]\s+(norma|ABNT|NBR|ISO|EN)/i.test(t)) {
    problemas.push('cita cláusula ou item de norma (proibido: o sistema não tem o texto integral das normas)');
  }

  // 3. Veredito.
  var v = String(regras.veredito || '').toUpperCase();
  var frases = t.split(/(?<=[.;!?])\s+/);
  var afirmaAprov = frases.some(function (f) { return /\baprovad[oa]s?\b|\bconforme(s)? (com|a|aos) (os )?crit[eé]rios/i.test(f) && !/\b(n[aã]o|reprovad)/i.test(f); });
  var afirmaReprov = frases.some(function (f) { return /\breprovad[oa]s?\b|\bn[aã]o atende|\bn[aã]o conforme/i.test(f) && !/\bn[aã]o (foi |está |esta |ficou )?reprovad/i.test(f); });
  if (v === 'APROVADO' && afirmaReprov) problemas.push('o texto afirma reprovação, mas o resultado calculado é APROVADO');
  if (v === 'REPROVADO' && afirmaAprov) problemas.push('o texto afirma aprovação, mas o resultado calculado é REPROVADO');
  if (v === 'INFORMATIVO' && (afirmaAprov || afirmaReprov)) problemas.push('o texto declara aprovação ou reprovação, mas o ensaio é informativo');
  if (regras.exigirVeredito && (v === 'APROVADO' || v === 'REPROVADO')) {
    var reV = v === 'APROVADO' ? /\baprovad[oa]\b/i : /\breprovad[oa]\b/i;
    if (!reV.test(t)) problemas.push('a conclusão não declara o resultado calculado (' + v + ')');
  }

  // 4. Frases proibidas e termos do cenário.
  SGO_QIAV_FRASES_PROIBIDAS.forEach(function (re) { if (re.test(t)) problemas.push('expressão proibida: ' + String(t.match(re)[0])); });
  (regras.termosProibidos || []).forEach(function (termo) {
    var re = Object.prototype.toString.call(termo) === "[object RegExp]" ? new RegExp(termo.source, termo.flags) : new RegExp(String(termo), "i");
    var mm = t.match(re);
    if (mm) problemas.push('termo fora do escopo deste ensaio: ' + mm[0]);
  });

  return { ok: problemas.length === 0, problemas: problemas };
}

/**
 * Confere vários blocos de uma vez. blocos: { nome: { texto, regras } }.
 * Devolve { ok, porBloco: { nome: {ok, problemas} }, problemas:[ 'nome: problema' ] }.
 */
function SGO_QIAV_verificarBlocos_(blocos) {
  var out = { ok: true, porBloco: {}, problemas: [] };
  Object.keys(blocos || {}).forEach(function (nome) {
    var r = SGO_QIAV_verificar_(blocos[nome].texto, blocos[nome].regras);
    out.porBloco[nome] = r;
    if (!r.ok) { out.ok = false; r.problemas.forEach(function (p) { out.problemas.push(nome + ': ' + p); }); }
  });
  return out;
}
