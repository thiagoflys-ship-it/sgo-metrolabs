// Vínculos (12/11/2026): transferir equipamento para outro cliente travava com "Há 1 chamado(s) da Assistência técnica
// em aberto" mesmo com o chamado cancelado ou excluído: a leitura das abas ATEC_CHAMADOS/ATEC_OS trazia só as colunas
// de ligação, sem SITUACAO, NUMERO e EXCLUIDO_EM. Código real (SGO_Vinculos.js), leitura por planilhas simuladas; dados fictícios.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

function folha(nome, linhas) {
  const headers = Object.keys(linhas[0] || {});
  const valores = [headers].concat(linhas.slice(1).map((r) => headers.map((h) => r[h] == null ? '' : r[h])));
  return {
    getName: () => nome, getLastColumn: () => headers.length, getLastRow: () => valores.length, getSheetId: () => nome.length,
    getRange: (l, c, nl, nc) => ({ getValues: () => valores.slice(l - 1, l - 1 + nl).map((v) => v.slice(c - 1, c - 1 + nc)) })
  };
}
// Primeira linha de cada lista = modelo de colunas (não é registro).
function banco(chamados, os) {
  return {
    getSheets: () => [
      folha('CAD_CLIENTES', [{ ID: '', RAZAO_SOCIAL: '', CNPJ: '', STATUS: '' },
        { ID: 'cA', RAZAO_SOCIAL: 'CLINICA TESTE ALFA', CNPJ: '11222333000181', STATUS: 'ATIVO' },
        { ID: 'cB', RAZAO_SOCIAL: 'EMPRESA TESTE BETA', CNPJ: '44555666000181', STATUS: 'ATIVO' }]),
      folha('CAD_UNIDADES', [{ ID: '', CLIENTE_ID: '', NOME_UNIDADE: '', CNPJ_UNIDADE: '', STATUS: '' },
        { ID: 'uA', CLIENTE_ID: 'cA', NOME_UNIDADE: 'CLINICA TESTE ALFA', CNPJ_UNIDADE: '11222333000181', STATUS: 'ATIVO' },
        { ID: 'uB', CLIENTE_ID: 'cB', NOME_UNIDADE: 'EMPRESA TESTE BETA', CNPJ_UNIDADE: '44555666000181', STATUS: 'ATIVO' }]),
      folha('CAD_EQUIPAMENTOS', [{ ID: '', CLIENTE_ID: '', UNIDADE_ID: '', TAG: '', SERIE: '', STATUS: '' },
        { ID: 'e1', CLIENTE_ID: 'cA', UNIDADE_ID: 'uA', TAG: 'TAG-TESTE-1', SERIE: 'S-1', STATUS: 'ATIVO' }]),
      folha('ATEC_CHAMADOS', [{ ID: '', NUMERO: '', SITUACAO: '', CLIENTE_ID: '', UNIDADE_ID: '', EQUIPAMENTO_ID: '', SINTOMA: '', EXCLUIDO_EM: '' }].concat(chamados)),
      folha('ATEC_OS', [{ ID: '', NUMERO: '', CHAMADO_ID: '', SITUACAO: '', CLIENTE_ID: '', UNIDADE_ID: '', EQUIPAMENTO_ID: '', EXCLUIDO_EM: '' }].concat(os))
    ]
  };
}
function carregar(db) {
  const ctx = { console, SGO_UTILS: { cnpjArmazenado: (v) => String(v == null ? '' : v).replace(/\D/g, '') }, SGO_DATA: { getDB: () => db } };
  vm.createContext(ctx);
  const src = fs.readFileSync(path.join(pasta, 'SGO_Vinculos.js'), 'utf8').replace('return {overview:overview,', 'return {_read:read,overview:overview,');
  assert.ok(/_read:read/.test(src), 'exportação de teste aplicada');
  vm.runInContext(src + '\nthis.SGO_VINCULOS = SGO_VINCULOS;', ctx);
  return ctx.SGO_VINCULOS;
}
const ch = (id, num, sit, extra) => Object.assign({ ID: id, NUMERO: num, SITUACAO: sit, CLIENTE_ID: 'cA', UNIDADE_ID: 'uA', EQUIPAMENTO_ID: 'e1', SINTOMA: 'teste' }, extra || {});
const os = (id, num, sit, extra) => Object.assign({ ID: id, NUMERO: num, CHAMADO_ID: 'x', SITUACAO: sit, CLIENTE_ID: 'cA', UNIDADE_ID: 'uA', EQUIPAMENTO_ID: 'e1' }, extra || {});
function transferir(chamados, oss) {
  const V = carregar(banco(chamados, oss));
  const s = V._read();
  return JSON.parse(JSON.stringify(V._build(s, { tipo: 'EQUIPAMENTO', acao: 'TRANSFERIR', origem: 'e1', destino: 'uB', motivo: 'Cliente pediu outro CNPJ' })));
}
const travasAssist = (p) => p.blocks.filter((b) => /Assistência técnica/.test(b));

test('chamado e O.S. cancelados ou encerrados não travam a transferência (antes travavam: SITUACAO não era lida)', () => {
  const p = transferir([ch('c1', 'CH-T-0001', 'CANCELADO'), ch('c2', 'CH-T-0002', 'ENCERRADO')], [os('o1', 'OS-T-0001', 'CANCELADA'), os('o2', 'OS-T-0002', 'ENCERRADA')]);
  assert.deepEqual(travasAssist(p), [], p.blocks.join(' | '));
  assert.ok(p.changes.some((c) => c.table === 'CAD_EQUIPAMENTOS' && c.field === 'CLIENTE_ID' && c.after === 'cB'), 'equipamento muda de cliente');
  assert.equal(p.historical.ATEC_CHAMADOS, 2, 'chamados ficam no histórico do cliente antigo');
});

test('chamado excluído pela gestão (EXCLUIDO_EM) não trava, mesmo com situação aberta', () => {
  const p = transferir([ch('c1', 'CH-T-0001', 'PLANEJADO', { EXCLUIDO_EM: '2026-11-12T13:54:33' })], [os('o1', 'OS-T-0001', 'AGENDADA', { EXCLUIDO_EM: '2026-11-12T13:54:33' })]);
  assert.deepEqual(travasAssist(p), [], p.blocks.join(' | '));
});

test('chamado e O.S. de fato em aberto continuam travando e a mensagem traz o número', () => {
  const p = transferir([ch('c1', 'CH-T-0009', 'AGENDADO'), ch('c2', 'CH-T-0010', 'CANCELADO')], [os('o1', 'OS-T-0009', 'AGENDADA')]);
  const t = travasAssist(p);
  assert.equal(t.length, 2, t.join(' | '));
  assert.ok(/1 chamado\(s\).*\(CH-T-0009\)/.test(t[0]), t[0]);
  assert.ok(/1 O\.S\..*\(OS-T-0009\)/.test(t[1]), t[1]);
});

test('situação gravada em minúsculas também é reconhecida como fechada', () => {
  const p = transferir([ch('c1', 'CH-T-0001', 'cancelado')], []);
  assert.deepEqual(travasAssist(p), []);
});
