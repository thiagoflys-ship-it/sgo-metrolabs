// Ajuda "Como usar esta tela": recursos só do administrador não aparecem para os demais perfis (20/10/2026).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(base, 'SGO_Ajuda.js'), 'utf8'), ctx);

const entrada = {
  titulo: 'Tela de teste',
  cores: [{ nome: 'Selo laranja "Relatório interno"', significado: 'Só o administrador usa.' }, { nome: 'Verde', significado: 'Concluído.' }],
  quemPode: [{ perfil: 'TECNICO', pode: 'Gera o relatório.' }, { perfil: 'ADMIN', pode: 'Também usa o "Relatório interno" (com senha administrativa).' }],
  perguntas: [{ p: 'O que é o modo personalizado?', r: 'Recurso do administrador.' }, { p: 'Onde fica o PDF?', r: 'Na pasta do cliente.' }]
};

test('técnico não vê recurso do administrador; administrador vê tudo', () => {
  const t = ctx.SGO_Ajuda_normalizar_('teste', entrada, 'TECNICO');
  const txt = JSON.stringify(t);
  assert.ok(!/Relatório interno|modo personalizado|senha administrativa/i.test(txt), txt);
  assert.equal(t.cores.length, 1);
  assert.equal(t.perguntas.length, 1);
  assert.equal(t.quemPode.length, 1);
  const a = ctx.SGO_Ajuda_normalizar_('teste', entrada, 'ADMIN');
  assert.equal(a.cores.length, 2);
  assert.equal(a.quemPode.length, 2);
  assert.equal(a.perguntas.length, 2);
});
