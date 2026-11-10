// Autoclave e Lavadora: envio da planilha do datalogger quando a pasta fixa da configuração (Google Drive antigo)
// não existe no servidor (20/10/2026, erro real: "Não foi possível encontrar a pasta com o ID ...").
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

function ambiente() {
  const pastas = { existente: { id: 'existente', arquivos: [] } };
  let seq = 0;
  const props = {};
  const pasta = (p) => ({ getId: () => p.id, createFile: (blob) => { p.arquivos.push(blob); return { getId: () => 'f' + (++seq), getName: () => blob.nome, getUrl: () => 'u' }; } });
  const ctx = {
    console,
    DriveApp: {
      getFolderById: (id) => { if (!pastas[id]) throw new Error('Não foi possível encontrar a pasta com o ID ' + id); return pasta(pastas[id]); },
      getRootFolder: () => ({ createFolder: (nome) => { const id = 'nova' + (++seq); pastas[id] = { id, nome, arquivos: [] }; return pasta(pastas[id]); } })
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) }
  };
  vm.createContext(ctx);
  return { ctx, pastas, props };
}

for (const [arquivo, fn, prop] of [['SGO_AutoRel_Main.js', 'AutoRel_pastaUploads_', 'AUTOREL_UPLOAD_PASTA_ID'], ['SGO_LavRel_Main.js', 'LavRel_pastaUploads_', 'LAVREL_UPLOAD_PASTA_ID']]) {
  test(arquivo + ': pasta antiga inexistente usa a pasta própria, criada uma vez só', () => {
    const { ctx, pastas, props } = ambiente();
    const fonte = fs.readFileSync(path.join(base, arquivo), 'utf8').replace(/\r\n/g, '\n');
    vm.runInContext(fonte.match(new RegExp('function ' + fn + '[\\s\\S]*?\\n}\\n'))[0], ctx);
    const p1 = ctx[fn]('1eUsoUbVPEoN_pM-wJe0sp9bAd4aeFNNn');
    assert.ok(props[prop]);
    const p2 = ctx[fn]('1eUsoUbVPEoN_pM-wJe0sp9bAd4aeFNNn');
    assert.equal(p1.getId(), p2.getId());
    assert.equal(Object.keys(pastas).length, 2);
    assert.equal(ctx[fn]('existente').getId(), 'existente');
  });
}
