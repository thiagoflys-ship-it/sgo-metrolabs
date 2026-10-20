/**
 * SGO_QualifEmissao.js — emissão de documentos de qualificação com aprovação do responsável
 * técnico e controle de revisão (20/10/2026). Comum: Autoclave a vapor (SGO_AutoRel_*) e
 * reaproveitável por outros módulos de qualificação (baixa temperatura, Lavadora...).
 *
 * Tabela QUALIF_EMISSOES (criada na primeira gravação, no mesmo banco do SGO+), uma linha por
 * envio para aprovação ou emissão. Nada é apagado: reemitir o mesmo número cria nova revisão e
 * marca a anterior como SUBSTITUIDO (o arquivo antigo continua na pasta do cliente).
 *
 *  SGO_QE_ehAprovador_(sessao, perfis)            perfil da sessão está entre os aprovadores?
 *  SGO_QE_registrar_(dados)                        grava uma linha e devolve o ID
 *  SGO_QE_listar_(modulo, status)                  linhas do módulo (status opcional)
 *  SGO_QE_obter_(id)                               uma linha (ou null)
 *  SGO_QE_atualizar_(id, campos)                   altera campos de uma linha
 *  SGO_QE_proximaRevisao_(modulo, numero, minima)  próxima revisão do número (0 na primeira emissão)
 *  SGO_QE_marcarSubstituidas_(modulo, numero, idAtual)
 */

var SGO_QE_ABA = 'QUALIF_EMISSOES';
var SGO_QE_CAMPOS = ['ID', 'MODULO', 'STATUS', 'NUMERO', 'REVISAO', 'CLIENTE', 'CNPJ', 'TAG', 'RESULTADO', 'HASH_CONTEXTO',
  'ENVIADO_POR', 'ENVIADO_EM', 'APROVADO_POR', 'APROVADO_LOGIN', 'APROVADO_PERFIL', 'APROVADO_EM', 'DEVOLVIDO_MOTIVO',
  'PDF_ID', 'HTML_ID', 'JUSTIFICATIVA_ESCOPO', 'PAYLOAD_JSON', 'ATUALIZADO_EM'];
var SGO_QE_MEMORIA_ = null; // só nos testes (sem banco)

function SGO_QE_agora_() {
  try { return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss'); } catch (e) { return new Date().toISOString(); }
}

function SGO_QE_ehAprovador_(sessao, perfis) {
  var p = String((sessao && sessao.perfil) || '').trim().toUpperCase();
  return !!p && (perfis || []).map(function (x) { return String(x).toUpperCase(); }).indexOf(p) >= 0;
}

function SGO_QE_nomeSessao_(sessao) {
  return String((sessao && (sessao.nome || sessao.usuario || sessao.login)) || '').trim();
}

function SGO_QE_aba_() {
  if (typeof SGO_DATA === 'undefined' || !SGO_DATA.getDB) return null;
  var ss = SGO_DATA.getDB();
  var aba = ss.getSheetByName(SGO_QE_ABA);
  if (!aba) {
    aba = ss.insertSheet(SGO_QE_ABA);
    aba.getRange(1, 1, 1, SGO_QE_CAMPOS.length).setValues([SGO_QE_CAMPOS]);
  }
  return aba;
}

function SGO_QE_lerTudo_() {
  var aba = SGO_QE_aba_();
  if (!aba) { SGO_QE_MEMORIA_ = SGO_QE_MEMORIA_ || []; return SGO_QE_MEMORIA_.map(function (r, i) { return Object.assign({ _linha: i }, r); }); }
  var ult = aba.getLastRow();
  if (ult < 2) return [];
  var cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String);
  return aba.getRange(2, 1, ult - 1, cab.length).getValues().map(function (l, i) {
    var o = { _linha: i + 2 };
    cab.forEach(function (c, k) { o[c] = l[k] === null || l[k] === undefined ? '' : String(l[k]); });
    return o;
  });
}

function SGO_QE_registrar_(dados) {
  var reg = {};
  SGO_QE_CAMPOS.forEach(function (c) { reg[c] = dados[c] === undefined || dados[c] === null ? '' : String(dados[c]); });
  reg.ID = reg.ID || ('QE-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  reg.ATUALIZADO_EM = SGO_QE_agora_();
  var lock = null;
  try { lock = LockService.getScriptLock(); lock.waitLock(20000); } catch (e) { lock = null; }
  try {
    var aba = SGO_QE_aba_();
    if (!aba) { SGO_QE_MEMORIA_ = SGO_QE_MEMORIA_ || []; SGO_QE_MEMORIA_.push(reg); return reg.ID; }
    var cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String);
    aba.appendRow(cab.map(function (c) { return reg[c] === undefined ? '' : reg[c]; }));
    return reg.ID;
  } finally { if (lock) { try { lock.releaseLock(); } catch (e2) {} } }
}

function SGO_QE_listar_(modulo, status) {
  return SGO_QE_lerTudo_().filter(function (r) { return r.MODULO === modulo && (!status || r.STATUS === status); });
}

function SGO_QE_obter_(id) {
  return SGO_QE_lerTudo_().filter(function (r) { return r.ID === String(id || ''); })[0] || null;
}

function SGO_QE_atualizar_(id, campos) {
  var atual = SGO_QE_obter_(id);
  if (!atual) throw new Error('Registro de emissão não encontrado: ' + id + '. Atualize a lista e tente de novo.');
  campos = Object.assign({}, campos, { ATUALIZADO_EM: SGO_QE_agora_() });
  var aba = SGO_QE_aba_();
  if (!aba) { var r = SGO_QE_MEMORIA_[atual._linha]; Object.keys(campos).forEach(function (k) { r[k] = String(campos[k]); }); return; }
  var cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String);
  Object.keys(campos).forEach(function (k) {
    var col = cab.indexOf(k);
    if (col >= 0) aba.getRange(atual._linha, col + 1).setValue(String(campos[k]));
  });
}

/** Próxima revisão do número: 0 na primeira emissão; depois, maior revisão emitida + 1 (nunca menor que a informada). */
function SGO_QE_proximaRevisao_(modulo, numero, minima) {
  var n = String(numero || '').trim();
  var min = Math.max(0, parseInt(minima, 10) || 0);
  if (!n) return min;
  var emitidas = SGO_QE_listar_(modulo).filter(function (r) { return r.NUMERO === n && (r.STATUS === 'EMITIDO' || r.STATUS === 'SUBSTITUIDO'); });
  if (!emitidas.length) return min;
  var maior = Math.max.apply(null, emitidas.map(function (r) { return parseInt(r.REVISAO, 10) || 0; }));
  return Math.max(min, maior + 1);
}

function SGO_QE_marcarSubstituidas_(modulo, numero, idAtual) {
  var n = String(numero || '').trim();
  if (!n) return;
  SGO_QE_listar_(modulo, 'EMITIDO').forEach(function (r) {
    if (r.NUMERO === n && r.ID !== idAtual) SGO_QE_atualizar_(r.ID, { STATUS: 'SUBSTITUIDO' });
  });
}
