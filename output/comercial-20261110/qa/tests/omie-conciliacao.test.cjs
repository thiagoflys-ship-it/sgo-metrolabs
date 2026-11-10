const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const source = fs.readFileSync('apps-script-imports/portal_sgo_versao_cnpj_db/SGO_Omie_Conciliacao.js', 'utf8');
function setup() {
  const cache = new Map(), sheets = new Map();
  function sheet() {
    const rows = [];
    return { rows, appendRow(r) { rows.push(r); }, setFrozenRows() {}, getLastRow() { return rows.length; }, getRange(r, c, nr, nc) { return { getValues() { return Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => rows[r - 1 + i]?.[c - 1 + j] ?? '')); }, setValues(values) { values.forEach((v, i) => { rows[r - 1 + i] = v; }); } }; } };
  }
  const ctx = {
    Utilities: { DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }, computeDigest(algo, value) { return [...crypto.createHash(algo).update(value).digest()]; }, getUuid: () => crypto.randomUUID(), newBlob: value => ({ getBytes: () => Buffer.from(value, 'utf8') }) },
    CacheService: { getScriptCache: () => ({ put: (k, v) => cache.set(k, v), get: k => cache.get(k) || null }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SGO_DATA: { getDB: () => ({ getSheetByName: n => sheets.get(n), insertSheet(n) { const s = sheet(); sheets.set(n, s); return s; } }) },
    Omie_exigirAcesso_(session) { if (!['financeiro', 'outra'].includes(session)) throw new Error('Acesso negado'); return { usuario: 'vanessa' }; },
    empresa: 'app-empresa-a',
    Omie_credenciais_() { return { key: ctx.empresa, secret: 'servidor' }; },
    movimentos: [{ nCodLancamento: 42, cOrigem: 'BAXP', cNatureza: 'P', dDataLancamento: '06/11/2026', nValorDocumento: 125.5, cDesCliente: 'Fornecedor' }],
    Omie_requisitar_(path, call, p) { if (call === 'ListarExtrato') return { listaMovimentos: ctx.movimentos }; if (call === 'ListarContasCorrentes') return { ListarContasCorrentes: [{ nCodCC: 123, descricao: 'Conta principal' }], total_de_paginas: 1 }; throw new Error('Não deve executar alterações Omie'); }
  };
  vm.createContext(ctx); vm.runInContext(source, ctx);
  ctx.payload = () => ({ contaId: '123', inicio: '2026-11-01', fim: '2026-11-30', formato: 'CSV', texto: 'Data;Valor;Descricao;Identificador\n06/11/2026;-125,50;Fornecedor;tx1' });
  ctx.sheets = sheets; ctx.cache = cache;
  return ctx;
}
test('CSV brasileiro preserva sinal, aspas, vírgulas e descrição com quebra de linha', () => {
  const c = setup(), rows = c.OmieConc_parse_('CSV', 'Data;Valor;Descricao;Tipo\r\n06/11/2026;"1.250,05";"Compra; item\nsegunda linha";D');
  assert.equal(rows[0].centavos, -125005); assert.equal(rows[0].data, '2026-11-06'); assert.match(rows[0].descricao, /segunda linha/);
  assert.equal(c.OmieConc_parse_('CSV', 'Data,Valor,Descricao\n2026-11-06,12.50,"Venda, item"')[0].centavos, 1250);
});
test('OFX SGML e XML preservam FITID e sinal; entidades externas são recusadas', () => {
  const c = setup(), ofx = '<OFX><BANKTRANLIST><STMTTRN><DTPOSTED>20261106120000[-3:BRT]\n<TRNAMT>-125.50\n<FITID>ABC\n<MEMO>Pagamento\n</STMTTRN></BANKTRANLIST></OFX>';
  const r = c.OmieConc_parse_('OFX', ofx)[0]; assert.equal(r.identificador, 'ABC'); assert.equal(r.centavos, -12550);
  assert.throws(() => c.OmieConc_parse_('OFX', '<!DOCTYPE x>' + ofx), /externa/);
  assert.throws(() => c.OmieConc_parse_('OFX', ofx.replace('</OFX>', '<STMTTRN><TRNAMT>1</OFX>')), /incompleto/);
  assert.throws(() => c.OmieConc_parse_('OFX', ofx.replace('<BANKTRANLIST>', '<ACCTID>1<ACCTID>2<BANKTRANLIST>')), /única conta/);
  assert.throws(() => c.OmieConc_parse_('OFX', '<OFX><STMTTRN><DTPOSTED>20260230<TRNAMT>1</STMTTRN></OFX>'), /inexistente/);
});
test('limites de tamanho, linhas, data, decimal e período impedem importações incorretas', () => {
  const c = setup();
  assert.throws(() => c.OmieConc_parse_('CSV', 'x'.repeat(500001)), /500 KB/);
  assert.throws(() => c.OmieConc_parse_('CSV', 'Data;Valor;Descricao\n' + '06/11/2026;1;A\n'.repeat(101)), /100 movimentos/);
  for (const value of ['31/02/2026', '2026-13-01']) assert.throws(() => c.OmieConc_data_(value));
  for (const value of ['1.234', '1e3', 'NaN', '1,234', '']) assert.throws(() => c.OmieConc_valor_(value));
  assert.throws(() => c.OmieConc_param_({ contaId: '123', inicio: '2026-01-01', fim: '2026-11-01' }), /94 dias/);
  assert.equal(c.Omie_apiConciliarPrevia('financeiro', { ...c.payload(), inicio: '2026-11-10' }).ok, false);
});
test('duplicatas, ambiguidades e sinais opostos nunca viram correspondência elegível', () => {
  const c = setup(), b = c.OmieConc_parse_('CSV', c.payload().texto), o = c.OmieConc_extrato_(c.OmieConc_param_(c.payload()));
  assert.equal(c.OmieConc_parear_(b, o, [], '123')[0].elegivel, true);
  assert.equal(c.OmieConc_parear_([b[0], b[0]], o, [], '123')[0].elegivel, false);
  assert.match(c.OmieConc_parear_(b, [o[0], { ...o[0], id: '43' }], [], '123')[0].status, /Ambíguo/);
  assert.equal(c.OmieConc_parear_(b, [{ ...o[0], centavos: 12550 }], [], '123')[0].candidatos, 0);
  const disputados = c.OmieConc_parear_([b[0], { ...b[0], identificador: 'outro' }], o, [], '123');
  assert.equal(disputados.some(x => x.elegivel), false);
});
test('confirmação exige revisão e sessão original, grava uma vez e mantém histórico local', () => {
  const c = setup(), p = c.Omie_apiConciliarPrevia('financeiro', c.payload()); assert.equal(p.ok, true);
  assert.equal(c.Omie_apiConciliarConfirmar('outra', { token: p.token, linhas: [0] }).ok, false);
  assert.equal(c.Omie_apiConciliarConfirmar('financeiro', { token: p.token, linhas: [] }).ok, false);
  assert.equal(c.Omie_apiConciliarConfirmar('financeiro', { token: p.token, linhas: [0, 0] }).ok, false);
  const result = c.Omie_apiConciliarConfirmar('financeiro', { token: p.token, linhas: [0] }); assert.equal(result.registrados, 1);
  const repeat = c.Omie_apiConciliarConfirmar('financeiro', { token: p.token, linhas: [0] }); assert.equal(repeat.registrados, 0); assert.equal(repeat.repetidos, 1);
  const h = c.Omie_apiConciliacaoHistorico('financeiro', { contaId: '123' }); assert.equal(h.total, 1); assert.equal(h.itens[0].tipo, 'CONFERENCIA_LOCAL'); assert.equal(h.itens[0].usuario, 'vanessa');
  const next = c.Omie_apiConciliarPrevia('financeiro', c.payload()); assert.equal(next.linhas[0].elegivel, false); assert.match(next.linhas[0].status, /Já conferido/);
});
test('alteração no Omie entre prévia e confirmação cancela gravação inteira', () => {
  const c = setup(), p = c.Omie_apiConciliarPrevia('financeiro', c.payload());
  c.movimentos[0].nValorDocumento = 200;
  const result = c.Omie_apiConciliarConfirmar('financeiro', { token: p.token, linhas: [0] }); assert.equal(result.ok, false); assert.match(result.mensagem, /extrato mudou/);
  assert.equal(c.sheets.get('OMIE_CONCILIACOES').rows.length, 1);
});
test('troca de aplicativo Omie invalida prévia e separa históricos de contas com mesmo ID', () => {
  const c = setup(), p = c.Omie_apiConciliarPrevia('financeiro', c.payload());
  assert.equal(c.Omie_apiConciliarConfirmar('financeiro', { token: p.token, linhas: [0] }).registrados, 1);
  c.empresa = 'app-empresa-b';
  assert.match(c.Omie_apiConciliarConfirmar('financeiro', { token: p.token, linhas: [0] }).mensagem, /integração Omie mudou/);
  assert.equal(c.Omie_apiConciliacaoHistorico('financeiro', { contaId: '123' }).total, 0);
  assert.equal(c.Omie_apiConciliarPrevia('financeiro', c.payload()).linhas[0].elegivel, true);
});
test('todas APIs verificam permissão e token expirado é recusado', () => {
  const c = setup();
  for (const [name, args] of [['Omie_apiConciliacaoContas', 1], ['Omie_apiConciliacaoHistorico', { contaId: '123' }], ['Omie_apiConciliarPrevia', c.payload()], ['Omie_apiConciliarConfirmar', {}]]) assert.equal(c[name]('sem-acesso', args).ok, false);
  const p = c.Omie_apiConciliarPrevia('financeiro', c.payload()); c.cache.clear();
  assert.match(c.Omie_apiConciliarConfirmar('financeiro', { token: p.token, linhas: [0] }).mensagem, /expirada/);
});
test('HTML contém JavaScript válido e resultados usam escape ou textContent', () => {
  const html = fs.readFileSync('apps-script-imports/portal_sgo_versao_cnpj_db/JS_Omie_Conciliacao.html', 'utf8');
  new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  assert.match(html, /CadUI_esc_/); assert.match(html, /textContent = texto/);
});
