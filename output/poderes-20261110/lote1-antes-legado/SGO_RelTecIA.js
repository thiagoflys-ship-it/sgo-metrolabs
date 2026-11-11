/**
 * SGO_RelTecIA.js — redação por IA (Gemini) dos documentos técnicos, com retorno seguro.
 *
 * RelTecIA_gerarJson_(prompt, opcoes) → { ok, dados, aviso, modelo }
 *   Nunca lança. Sem chave, com limite de uso, resposta cortada ou JSON inválido:
 *   ok = false e `aviso` explica o motivo em português, para o documento sair com o
 *   texto padrão. Raciocínio do modelo (thinking) mantido no padrão dinâmico;
 *   temperatura baixa; margem de tokens generosa (resposta cortada = falha, nunca
 *   texto pela metade).
 *   opcoes: { temperatura (0,2), maxTokens (8192), campos: ['a','b'] obrigatórios }
 *
 * RelTecIA_numerosForaDaLista_(texto, permitidos) → números com casas decimais citados
 *   no texto que não estão na lista de valores reais do documento (a IA não pode
 *   inventar medidas). Números escritos com ponto decimal também são recusados.
 * RelTecIA_temVeredito_(texto) → true se o texto afirma aprovação/conformidade.
 * RelTecIA_temFabricante_(texto, nomes) → true se cita algum nome da lista.
 */

var RELTECIA_MODELO_PADRAO = 'gemini-2.5-flash';
var RELTECIA_FALLBACKS_PADRAO = ['gemini-2.5-flash-lite'];
var RELTECIA_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';

function RelTecIA_config_() {
  var props = PropertiesService.getScriptProperties();
  var modelo = String(props.getProperty('IA_MODEL') || '').trim() || RELTECIA_MODELO_PADRAO;
  var fb = String(props.getProperty('IA_MODEL_FALLBACKS') || '').trim();
  var lista = [modelo];
  (fb ? fb.split(',') : RELTECIA_FALLBACKS_PADRAO).forEach(function (m) {
    m = String(m).trim();
    if (m && lista.indexOf(m) === -1) lista.push(m);
  });
  return { chave: String(props.getProperty('GEMINI_API_KEY') || '').trim(), modelos: lista };
}

function RelTecIA_motivoSemChave_() {
  return (typeof SGO_DocSalvar_msgChaveIA_ === 'function')
    ? SGO_DocSalvar_msgChaveIA_()
    : 'a chave da IA (GEMINI_API_KEY) não está cadastrada; peça ao administrador para cadastrá-la em Chaves e senhas';
}

function RelTecIA_extrairJson_(texto) {
  var t = String(texto || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(t); } catch (e) { /* tenta o maior bloco entre chaves */ }
  var i = t.indexOf('{'), j = t.lastIndexOf('}');
  if (i >= 0 && j > i) { try { return JSON.parse(t.slice(i, j + 1)); } catch (e2) { /* inválido */ } }
  return null;
}

function RelTecIA_gerarJson_(prompt, opcoes) {
  var o = opcoes || {};
  var cfg;
  try { cfg = RelTecIA_config_(); } catch (eCfg) { return { ok: false, dados: null, aviso: 'a configuração da IA não pôde ser lida' }; }
  if (!cfg.chave) return { ok: false, dados: null, aviso: RelTecIA_motivoSemChave_() };
  var ultimo = 'o serviço de IA não respondeu';
  for (var mi = 0; mi < cfg.modelos.length; mi++) {
    var modelo = cfg.modelos[mi];
    for (var tent = 0; tent < 3; tent++) {
      if (tent > 0) Utilities.sleep(tent === 1 ? 1000 : 2500);
      try {
        var resp = UrlFetchApp.fetch(RELTECIA_ENDPOINT + modelo + ':generateContent?key=' + encodeURIComponent(cfg.chave), {
          method: 'post', contentType: 'application/json', muteHttpExceptions: true,
          payload: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: String(prompt) }] }],
            generationConfig: {
              temperature: o.temperatura === undefined ? 0.2 : o.temperatura,
              maxOutputTokens: o.maxTokens || 8192,
              responseMimeType: 'application/json'
            }
          })
        });
        var codigo = resp.getResponseCode();
        var corpo = {};
        try { corpo = JSON.parse(resp.getContentText()); } catch (eJ) { corpo = {}; }
        if (codigo === 401 || codigo === 403) {
          return { ok: false, dados: null, aviso: (typeof SGO_DocSalvar_msgChaveIA_ === 'function') ? SGO_DocSalvar_msgChaveIA_(codigo) : 'a chave da IA foi recusada (HTTP ' + codigo + ')' };
        }
        if (codigo === 404) { ultimo = 'o modelo de IA ' + modelo + ' não está disponível'; break; }
        if (codigo === 429 || codigo >= 500) { ultimo = codigo === 429 ? 'o limite de uso da IA foi atingido; tente de novo em alguns minutos' : 'o serviço de IA está indisponível no momento'; continue; }
        if (codigo !== 200) { ultimo = 'o serviço de IA recusou o pedido (HTTP ' + codigo + ')'; break; }
        var cand = corpo.candidates && corpo.candidates[0];
        if (cand && cand.finishReason === 'MAX_TOKENS') { ultimo = 'a resposta da IA veio incompleta'; break; }
        var partes = (cand && cand.content && cand.content.parts) || [];
        var texto = partes.filter(function (p) { return !p.thought; }).map(function (p) { return p.text || ''; }).join('');
        var dados = RelTecIA_extrairJson_(texto);
        if (!dados || typeof dados !== 'object') { ultimo = 'a resposta da IA não veio no formato esperado'; break; }
        var falta = (o.campos || []).filter(function (c) { return !String(dados[c] == null ? '' : dados[c]).trim(); });
        if (falta.length) { ultimo = 'a resposta da IA veio sem parte do texto (' + falta.join(', ') + ')'; break; }
        return { ok: true, dados: dados, aviso: '', modelo: modelo };
      } catch (e) {
        ultimo = 'falha de comunicação com o serviço de IA';
      }
    }
  }
  return { ok: false, dados: null, aviso: ultimo };
}

function RelTecIA_normalizarNumero_(s) {
  return String(s).replace(/^[+-]/, '').replace(/\./g, '');
}

function RelTecIA_numerosForaDaLista_(texto, permitidos) {
  var aceitos = {};
  (permitidos || []).forEach(function (v) {
    String(v == null ? '' : v).split(/[^\d.,+-]+/).forEach(function (t) {
      t = t.replace(/[.,]+$/, '');
      if (t) aceitos[RelTecIA_normalizarNumero_(t)] = true;
    });
  });
  var fora = [];
  var re = /[+-]?\d+(?:\.\d{3})*(?:,\d+)|\d+\.\d+/g;
  var m;
  var s = String(texto || '');
  while ((m = re.exec(s)) !== null) {
    var tok = m[0];
    if (/^\d+\.\d+$/.test(tok) && !/^\d{1,3}(\.\d{3})+$/.test(tok)) { fora.push(tok); continue; }
    if (!aceitos[RelTecIA_normalizarNumero_(tok)]) fora.push(tok);
  }
  return fora;
}

function RelTecIA_temVeredito_(texto) {
  var afirma = /(aprovad[oa]s?|reprovad[oa]s?|apt[oa]s? (para|ao) (o )?uso|est[aá] conforme|est[aã]o conformes|dentro da toler[aâ]ncia|fora da toler[aâ]ncia|em conformidade com)/i;
  // frase a frase: só conta como veredito quando a frase afirma (sem "não"/"sem")
  return String(texto || '').split(/(?<=[.;!?])\s+/).some(function (frase) {
    return afirma.test(frase) && !/\b(n[aã]o|sem|nenhum[a]?)\b/i.test(frase);
  });
}

function RelTecIA_temFabricante_(texto, nomes) {
  var t = String(texto || '').toLowerCase();
  return (nomes || []).some(function (n) {
    n = String(n || '').trim().toLowerCase();
    return n.length >= 3 && t.indexOf(n) >= 0;
  });
}
