// Chaves e senhas: endereço da Z-API colado inteiro vira só a identificação da instância (ou o token) (20/10/2026).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const fonte = fs.readFileSync(path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db/SGO_Chaves.js'), 'utf8').replace(/\r\n/g, '\n');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fonte.match(/function Chaves_zapiParte_[\s\S]*?\n}\n/)[0], ctx);

test('endereço inteiro: guarda só a parte certa', () => {
  const url = 'https://api.z-api.io/instances/3ABCDEF0123456789ABCDEF012345678/token/F0A1B2C3D4E5F6A7B8C9D0E1/send-text';
  assert.equal(ctx.Chaves_zapiParte_(url, 'instances'), '3ABCDEF0123456789ABCDEF012345678');
  assert.equal(ctx.Chaves_zapiParte_(url, 'token'), 'F0A1B2C3D4E5F6A7B8C9D0E1');
});

test('valor simples volta igual (sem espaços nas pontas)', () => {
  assert.equal(ctx.Chaves_zapiParte_('  3ABCDEF0123456789ABCDEF012345678 ', 'instances'), '3ABCDEF0123456789ABCDEF012345678');
  assert.equal(ctx.Chaves_zapiParte_('F0A1B2C3D4E5F6A7B8C9D0E1', 'token'), 'F0A1B2C3D4E5F6A7B8C9D0E1');
});
