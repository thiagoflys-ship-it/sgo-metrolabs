/****************************************************
 * VERIFICADOR DO TEXTO DA IA NOS RELATÓRIOS DE QUALIFICAÇÃO (21/10/2026)
 * Componente comum, criado para a qualificação de esterilizadores a baixa
 * temperatura e pronto para a Autoclave, a Lavadora e os demais módulos
 * adotarem (basta chamar QualIA_verificar_ com o texto e as regras).
 *
 * O texto redigido pela IA só é aceito se:
 *  1. todo número citado existir nos resultados enviados a ela (mesma grafia pt-BR);
 *  2. toda norma citada estiver na lista de normas permitidas do documento;
 *  3. o veredito não contradisser o do motor (e não houver veredito intermediário);
 *  4. não citar fabricante, marca ou modelo da lista de nomes proibidos;
 *  5. não se referir a si mesmo como IA ou modelo.
 * Se falhar, o módulo descarta o texto e usa o texto padrão (determinístico).
 *
 *  QualIA_verificar_(texto, regras) → { ok, problemas:[...] }
 *    regras = { contexto: objeto ou texto com os resultados (fonte dos números),
 *               numerosExtras: [...], normas: ['ISO 22441:2022', ...],
 *               veredito: 'CONFORME' | 'NAO_CONFORME', exigirVeredito: bool,
 *               nomesProibidos: ['...'], vereditoGlobal: false nas análises por etapa (lá um ciclo
 *               conforme dentro de ensaio não conforme é fato legítimo) }
 *  QualIA_numerosForaDoContexto_(texto, contexto) → números do texto que não estão no contexto
 *  QualIA_normasForaDaLista_(texto, normas)       → normas citadas que não estão na lista
 *  QualIA_vereditoDivergente_(texto, veredito)     → frase que contradiz o veredito ('' se nenhuma)
 ****************************************************/

/** Todos os textos de um objeto (recursivo), juntos. */
function QualIA_textoDe_(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(QualIA_textoDe_).join(' \n ');
  if (typeof v === 'object') return Object.keys(v).map(function (k) { return QualIA_textoDe_(v[k]); }).join(' \n ');
  return '';
}

/** Forma canônica de um número escrito: sem separador de milhar, sem zero à esquerda no inteiro. */
function QualIA_canonico_(tok) {
  var s = String(tok);
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '');
  var partes = s.split(',');
  var inteiro = partes[0].replace(/^0+(?=\d)/, '');
  return partes.length > 1 ? inteiro + ',' + partes[1] : inteiro;
}

/** Números escritos no texto: "1.234,56", "45,00", "3", "2026". Ponto decimal ("45.5") volta marcado. */
function QualIA_numerosDoTexto_(texto) {
  var s = String(texto || ''), saida = [], m;
  var re = /\d+(?:[.,]\d+)*/g;
  while ((m = re.exec(s)) !== null) {
    var tok = m[0];
    if (/^\d+\.\d+$/.test(tok) && !/^\d{1,3}(\.\d{3})+$/.test(tok)) { saida.push({ bruto: tok, canon: null, pontoDecimal: true }); continue; }
    if (/^\d+(\.\d+){2,}$/.test(tok) && !/^\d{1,3}(\.\d{3})+$/.test(tok)) {
      // "11138.5.1" e afins: trata cada bloco
      tok.split('.').forEach(function (b) { saida.push({ bruto: b, canon: QualIA_canonico_(b), pontoDecimal: false }); });
      continue;
    }
    saida.push({ bruto: tok, canon: QualIA_canonico_(tok), pontoDecimal: false });
  }
  return saida;
}

function QualIA_numerosForaDoContexto_(texto, contexto, extras) {
  var aceitos = {};
  QualIA_numerosDoTexto_(QualIA_textoDe_(contexto) + ' ' + QualIA_textoDe_(extras || [])).forEach(function (n) {
    if (n.canon !== null) aceitos[n.canon] = true;
    else n.bruto.split('.').forEach(function (b) { aceitos[QualIA_canonico_(b)] = true; });
  });
  var fora = [];
  QualIA_numerosDoTexto_(texto).forEach(function (n) {
    if (n.pontoDecimal) fora.push(n.bruto + ' (use vírgula decimal)');
    else if (!aceitos[n.canon]) fora.push(n.bruto);
  });
  return fora.filter(function (x, i) { return fora.indexOf(x) === i; });
}

/** Chave de comparação de norma: "RDC ANVISA nº 15/2012" → "RDC15/2012"; "ISO 22441:2022" → "ISO22441:2022". */
function QualIA_chaveNorma_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
    .replace(/\bANVISA\b/g, '').replace(/\bN\s*[º°.]\s*/g, '').replace(/\s+/g, '').replace(/[.,;)]+$/, '');
}

var QUALIA_RE_NORMA = /\b(?:ABNT\s+)?(?:NBR\s+)?(?:ISO\/TS|ISO\/TR|ISO|IEC|EN|NBR|RDC|AAMI|ANSI|JCGM|NR)(?:\s+ANVISA)?\s*(?:n\s*[º°.]\s*)?-?\s*\d+(?:[\-:\/]\d+)*/gi;

function QualIA_normasForaDaLista_(texto, normas) {
  var chaves = (normas || []).map(QualIA_chaveNorma_);
  var fora = [];
  var m, s = String(texto || '');
  QUALIA_RE_NORMA.lastIndex = 0;
  while ((m = QUALIA_RE_NORMA.exec(s)) !== null) {
    var k = QualIA_chaveNorma_(m[0]);
    var ok = chaves.some(function (c) { return c === k || c.indexOf(k + ':') === 0 || c.indexOf(k + '/') === 0 || c.indexOf(k + '-') === 0; });
    if (!ok) fora.push(m[0].trim());
  }
  return fora.filter(function (x, i) { return fora.indexOf(x) === i; });
}

/** Frase que contradiz o veredito do motor ou traz veredito intermediário; '' se nenhuma. */
function QualIA_vereditoDivergente_(texto, veredito, soAfirmacaoNegativa) {
  var frases = String(texto || '').replace(/\s+/g, ' ').split(/(?<=[.;!?])\s+/);
  var intermediario = /aprovad[oa]s?\s+com\s+(alerta|ressalva)|conforme\s+com\s+ressalva|parcialmente\s+(aprovad|conforme|qualificad)|condicionalmente|aprova[çc][aã]o\s+condicional/i;
  var negativo = /reprovad|n[aã]o\s+(é|e|está|esta|estão|foi|foram|se mostrou|se mostraram)?\s*conformes?\b|n[aã]o\s+atend(e|eu|em|eram|ia)|insatisfat[óo]ri|n[aã]o\s+(está|esta|foi)\s+qualificad|desqualificad|inaprovad/i;
  var positivo = /\baprovad[oa]s?\b|\bqualificad[oa]\s+para\b|atend(e|eu|eram|em)\s+a\s+todos|(?:^|\s)(é|está|esta|foi|estão|foram)\s+conformes?\b|resultado\s+(final\s+)?(é\s+|foi\s+)?conforme\b|satisfat[óo]ri/i;
  for (var i = 0; i < frases.length; i++) {
    var f = frases[i];
    if (intermediario.test(f)) return f;
    if (veredito === 'CONFORME' && negativo.test(f) && !/\b(nenhum|nenhuma|sem)\b/i.test(f)) return f;
    if (veredito === 'NAO_CONFORME' && !soAfirmacaoNegativa && positivo.test(f.replace(/n[aã]o\s+(é|está|esta|foi|foram|estão)\s+conformes?/gi, '').replace(/n[aã]o\s+atend\w*/gi, '')) && !/\bn[aã]o\b/i.test(f)) return f;
  }
  return '';
}

function QualIA_temVeredito_(texto, veredito) {
  var t = String(texto || '');
  return veredito === 'CONFORME' ? /\bCONFORME\b/.test(t) && !/N[ÃA]O\s+CONFORME/.test(t) : /N[ÃA]O\s+CONFORME/.test(t);
}

function QualIA_verificar_(texto, regras) {
  regras = regras || {};
  var t = String(texto || '').trim(), problemas = [];
  if (!t) return { ok: false, problemas: ['texto vazio'] };
  var nums = QualIA_numerosForaDoContexto_(t, regras.contexto, regras.numerosExtras);
  if (nums.length) problemas.push('números que não constam dos resultados: ' + nums.slice(0, 8).join(', '));
  var normas = QualIA_normasForaDaLista_(t, regras.normas);
  if (normas.length) problemas.push('normas fora da lista do documento: ' + normas.slice(0, 5).join(', '));
  if (regras.veredito) {
    var div = QualIA_vereditoDivergente_(t, regras.veredito, regras.vereditoGlobal === false);
    if (div) problemas.push('frase com veredito diferente do resultado calculado: "' + div.slice(0, 160) + '"');
    if (regras.exigirVeredito && !QualIA_temVeredito_(t, regras.veredito)) problemas.push('a conclusão não declara o resultado calculado (' + (regras.veredito === 'CONFORME' ? 'CONFORME' : 'NÃO CONFORME') + ')');
  }
  var baixo = t.toLowerCase();
  (regras.nomesProibidos || []).forEach(function (n) {
    n = String(n || '').trim().toLowerCase();
    if (n.length >= 3 && baixo.indexOf(n) >= 0) problemas.push('cita nome de fabricante, marca ou modelo ("' + n + '")');
  });
  if (/intelig[êe]ncia artificial|como (um )?modelo de linguagem|n[ãa]o tenho acesso|como assistente/i.test(t)) problemas.push('o texto se refere a si mesmo como sistema ou IA');
  if (/\p{Extended_Pictographic}/u.test(t)) problemas.push('o texto contém emoji');
  return { ok: problemas.length === 0, problemas: problemas };
}
