// Excluir cliente ou unidade (26/10/2026, erro relatado pela equipe): o contato do próprio cadastro (CAD_CONTATOS)
// impedia a exclusão ("possui vínculos em CAD_CONTATOS") mesmo com o cliente inativo e sem nada mais ligado.
// Funções reais de SGO_Data.js sobre abas em memória; só dados fictícios.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n');

function ambiente(abas) {
  const aba = (nome) => ({
    getName: () => nome,
    getLastRow: () => abas[nome].length + 1,
    getLastColumn: () => Object.keys(abas[nome][0] || { ID: '' }).length,
    getRange: (r, c, nl, nc) => ({
      getValues: () => {
        const cab = Object.keys(abas[nome][0] || { ID: '' });
        if (r === 1) return [cab];
        return abas[nome].slice(r - 2, r - 2 + nl).map((l) => [l[cab[c - 1]]]);
      }
    })
  });
  const ctx = vm.createContext({
    console,
    SGO_UTILS: { safeUpper: (v) => String(v == null ? '' : v).trim().toUpperCase() },
    SGO_DATA: {
      getDB: () => ({ getSheets: () => Object.keys(abas).map(aba), getSheetByName: (n) => (abas[n] ? aba(n) : null) }),
      getAll: (n) => abas[n].map((l) => Object.assign({}, l)),
      update: (n, id, d) => Object.assign(abas[n].find((l) => l.ID === id), d)
    }
  });
  const src = ler('SGO_Data.js');
  ['SGO_DATA.exigirSemVinculos_ = function', 'SGO_DATA.inativarContatosDe_ = function'].forEach((ini) => {
    const i = src.indexOf(ini);
    assert.ok(i >= 0, ini);
    vm.runInContext(src.slice(i, src.indexOf('\n};', i) + 3), ctx);
  });
  return ctx.SGO_DATA;
}

test('cliente só com contatos: a trava ignora CAD_CONTATOS quando pedido; os contatos ativos ficam inativos (sem apagar)', () => {
  const abas = {
    CAD_CLIENTES: [{ ID: 'c1', STATUS: 'INATIVO' }, { ID: 'c2', STATUS: 'ATIVO' }],
    CAD_UNIDADES: [{ ID: 'u2', CLIENTE_ID: 'c2', STATUS: 'ATIVO' }],
    CAD_CONTATOS: [{ ID: 'k1', CLIENTE_ID: 'c1', UNIDADE_ID: '', STATUS: 'ATIVO' }, { ID: 'k2', CLIENTE_ID: 'c1', UNIDADE_ID: '', STATUS: 'INATIVO' }, { ID: 'k3', CLIENTE_ID: 'c2', UNIDADE_ID: 'u2', STATUS: 'ATIVO' }]
  };
  const D = ambiente(abas);
  assert.throws(() => D.exigirSemVinculos_('CAD_CLIENTES', 'c1'), /possui vínculos em CAD_CONTATOS/, 'sem a opção, continua como antes');
  assert.doesNotThrow(() => D.exigirSemVinculos_('CAD_CLIENTES', 'c1', ['CAD_CONTATOS']));
  assert.throws(() => D.exigirSemVinculos_('CAD_CLIENTES', 'c2', ['CAD_CONTATOS']), /possui vínculos em CAD_UNIDADES/, 'unidade continua impedindo');
  assert.equal(D.inativarContatosDe_('CLIENTE_ID', 'c1'), 1);
  assert.deepEqual(abas.CAD_CONTATOS.map((k) => k.ID + ':' + k.STATUS), ['k1:INATIVO', 'k2:INATIVO', 'k3:ATIVO'], 'nenhum contato apagado; o de outro cliente não muda');
  assert.equal(D.inativarContatosDe_('UNIDADE_ID', 'u2'), 1);
});

test('telas de Clientes e Unidades usam a regra nova e dizem quantos contatos ficaram inativos', () => {
  const c = ler('SGO_Clientes.js'), u = ler('SGO_Unidades.js'), d = ler('SGO_Data.js');
  assert.match(d, /remove\(nome, id, opcoes\)[\s\S]*exigirSemVinculos_\(nome, id, opcoes && opcoes\.ignorarVinculos\)/);
  assert.match(c, /contatos dele ficaram inativos/);
  assert.match(u, /contatos dela ficaram inativos/);
});
