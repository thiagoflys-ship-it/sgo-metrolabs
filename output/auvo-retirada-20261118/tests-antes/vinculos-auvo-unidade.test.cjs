// Vínculos (21/10/2026): unidade ligada ao Auvo pelo próprio SGO+ (envio SGO+ -> Auvo) não tem a linha CLIENTE
// do mesmo cliente Auvo em AUVO_SYNC. A trava antiga ("incompleto ou repetido") impedia desvincular, transferir
// e excluir essa unidade. Código real (SGO_Vinculos.js) com snapshot de teste; só dados fictícios.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

function carregar() {
  const ctx = { console, SGO_UTILS: { cnpjArmazenado: (v) => String(v == null ? '' : v).replace(/\D/g, '') } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(pasta, 'SGO_Vinculos.js'), 'utf8') + '\nthis.SGO_VINCULOS = SGO_VINCULOS;', ctx);
  return ctx.SGO_VINCULOS;
}
const H = {
  CAD_CLIENTES: ['ID', 'RAZAO_SOCIAL', 'NOME_FANTASIA', 'CNPJ', 'ENDERECO', 'STATUS'],
  CAD_UNIDADES: ['ID', 'CLIENTE_ID', 'NOME_UNIDADE', 'CNPJ_UNIDADE', 'ENDERECO', 'STATUS'],
  CAD_EQUIPAMENTOS: ['ID', 'CLIENTE_ID', 'UNIDADE_ID', 'TAG', 'SERIE', 'STATUS'],
  AUVO_SYNC: ['ID', 'CHAVE', 'ENTIDADE_TIPO', 'ENTIDADE_ID', 'AUVO_ID', 'STATUS', 'ULTIMA_SINCRONIZACAO', 'ULTIMO_ERRO', 'CRIADO_EM'],
  DOC_DOCUMENTOS: ['ID', 'CLIENTE_ID', 'UNIDADE_ID', 'EQUIPAMENTO_ID', 'NOME_ARQUIVO', 'TIPO_DOCUMENTO', 'STATUS'],
  CAD_CONTATOS: ['ID', 'CLIENTE_ID', 'UNIDADE_ID', 'STATUS'],
  AUVO_TAREFAS: ['ID', 'AUVO_TASK_ID', 'CLIENTE_AUVO_ID', 'CLIENTE_ID_SGO', 'FINALIZADA', 'EQUIPAMENTOS_ID_SGO']
};
function snap(extra) {
  const t = Object.assign({
    CAD_CLIENTES: [
      { ID: 'cA', RAZAO_SOCIAL: 'HOSPITAL TESTE ALFA', CNPJ: '11222333000181', STATUS: 'ATIVO' },
      { ID: 'cB', RAZAO_SOCIAL: 'EMPRESA TESTE BETA', CNPJ: '44555666000181', STATUS: 'ATIVO' }
    ],
    CAD_UNIDADES: [
      { ID: 'uA', CLIENTE_ID: 'cA', NOME_UNIDADE: 'HOSPITAL TESTE ALFA', CNPJ_UNIDADE: '11222333000181', STATUS: 'ATIVO' },
      { ID: 'uX', CLIENTE_ID: 'cA', NOME_UNIDADE: 'EMPRESA TESTE BETA', CNPJ_UNIDADE: '44555666000181', ENDERECO: 'RUA FICTICIA, 1', STATUS: 'ATIVO' }
    ],
    CAD_EQUIPAMENTOS: [],
    // Ligação feita pelo envio SGO+ -> Auvo: só a linha UNIDADE, sem CLIENTE com o mesmo AUVO_ID.
    AUVO_SYNC: [
      { ID: 's1', CHAVE: 'UNIDADE:uX', ENTIDADE_TIPO: 'UNIDADE', ENTIDADE_ID: 'uX', AUVO_ID: 9000001, STATUS: 'OK' },
      { ID: 's2', CHAVE: 'CLIENTE:cA', ENTIDADE_TIPO: 'CLIENTE', ENTIDADE_ID: 'cA', AUVO_ID: 9000002, STATUS: 'OK' },
      { ID: 's3', CHAVE: 'CLIENTE:cB', ENTIDADE_TIPO: 'CLIENTE', ENTIDADE_ID: 'cB', AUVO_ID: '', STATUS: 'ERRO' }
    ],
    DOC_DOCUMENTOS: [],
    CAD_CONTATOS: [{ ID: 'k1', CLIENTE_ID: 'cA', UNIDADE_ID: 'uX', STATUS: 'ATIVO' }],
    AUVO_TAREFAS: []
  }, extra || {});
  const tables = {}, schema = {};
  Object.keys(t).forEach((n, i) => { schema[n] = { sheetId: i + 1, headers: H[n] }; tables[n] = t[n].map((r, j) => Object.assign({ _row: j + 2 }, r)); });
  return { tables, schema };
}
const V = carregar();
const plano = (s, acao, extra) => JSON.parse(JSON.stringify(V._build(s, Object.assign({ tipo: 'UNIDADE', acao, origem: 'uX', motivo: 'Unidade cadastrada no cliente errado' }, extra || {}))));
const mud = (p, tabela, campo) => p.changes.filter((c) => c.table === tabela && (!campo || c.field === campo));

test('desvincular unidade ligada ao Auvo pelo SGO+ (sem linha CLIENTE do mesmo cliente Auvo) não trava e não mexe no Auvo', () => {
  const p = plano(snap(), 'DESVINCULAR');
  assert.deepEqual(p.blocks, [], p.blocks.join(' | '));
  assert.equal(mud(p, 'CAD_UNIDADES', 'CLIENTE_ID')[0].after, '');
  assert.equal(mud(p, 'AUVO_SYNC').length, 0, 'ligação do Auvo fica como está');
  assert.ok(p.warnings.some((w) => /9000001/.test(w) && /Transferir/.test(w)), p.warnings.join(' | '));
  assert.equal(mud(p, 'CAD_CONTATOS').length, 0, 'contato fica no cadastro original');
  assert.equal(p.historical.CAD_CONTATOS, 1);
});

test('desvincular nunca apaga a ligação CLIENTE do Auvo (antes ia para vazio) nem mexe em linhas com AUVO_ID vazio', () => {
  const s = snap();
  s.tables.AUVO_SYNC.push({ _row: 5, ID: 's4', CHAVE: 'CLIENTE:AUVOID:9000001', ENTIDADE_TIPO: 'CLIENTE', ENTIDADE_ID: 'cA', AUVO_ID: '9000001', STATUS: 'OK' });
  s.tables.AUVO_SYNC.push({ _row: 6, ID: 's5', CHAVE: 'UNIDADE:uA', ENTIDADE_TIPO: 'UNIDADE', ENTIDADE_ID: 'uX', AUVO_ID: '', STATUS: 'ERRO' });
  const p = plano(s, 'DESVINCULAR');
  assert.deepEqual(p.blocks, []);
  assert.equal(mud(p, 'AUVO_SYNC').length, 0);
});

test('transferir: ligação CLIENTE do Auvo acompanha a unidade (inclusive repetida); sem ela, transfere sem travar; contato acompanha', () => {
  const p1 = plano(snap(), 'TRANSFERIR', { destino: 'cB' });
  assert.deepEqual(p1.blocks, [], p1.blocks.join(' | '));
  assert.equal(mud(p1, 'AUVO_SYNC').length, 0);
  assert.deepEqual(mud(p1, 'CAD_CONTATOS').map((c) => [c.id, c.field, c.after]), [['k1', 'CLIENTE_ID', 'cB']]);
  assert.equal(p1.historical.CAD_CONTATOS, undefined);
  const s = snap();
  s.tables.AUVO_SYNC.push({ _row: 5, ID: 's4', CHAVE: 'CLIENTE:AUVOID:9000001', ENTIDADE_TIPO: 'CLIENTE', ENTIDADE_ID: 'cA', AUVO_ID: '9000001', STATUS: 'OK' });
  s.tables.AUVO_SYNC.push({ _row: 6, ID: 's5', CHAVE: 'CLIENTE:x', ENTIDADE_TIPO: 'CLIENTE', ENTIDADE_ID: 'cA', AUVO_ID: '9000001', STATUS: 'OK' });
  const p2 = plano(s, 'TRANSFERIR', { destino: 'cB' });
  assert.deepEqual(p2.blocks, []);
  assert.deepEqual(mud(p2, 'AUVO_SYNC', 'ENTIDADE_ID').map((c) => c.id + '>' + c.after).sort(), ['s4>cB', 's5>cB']);
});

test('excluir unidade com ligação ao Auvo criada pelo SGO+: permitido, ligação guardada como cadastro excluído, contato inativado (sem apagar)', () => {
  const p = plano(snap(), 'EXCLUIR');
  assert.deepEqual(p.blocks, [], p.blocks.join(' | '));
  assert.ok(p.changes.some((c) => c.table === 'CAD_UNIDADES' && c.id === 'uX' && c.field === '__DELETE__'));
  assert.deepEqual(mud(p, 'AUVO_SYNC').map((c) => [c.id, c.field, c.after]), [['s1', 'STATUS', 'CADASTRO_EXCLUIDO']]);
  assert.deepEqual(mud(p, 'CAD_CONTATOS').map((c) => [c.id, c.field, c.after]), [['k1', 'STATUS', 'INATIVO']]);
  assert.ok(p.warnings.some((w) => /9000001/.test(w)));
  assert.equal(p.changes.filter((c) => c.field === '__DELETE__').length, 1, 'só a unidade sai da lista');
});

test('excluir: vale o original — unidade que é o cadastro original de um cliente Auvo, ou com tarefa do Auvo nesse cliente, não é excluída (caminho na mensagem)', () => {
  const s = snap();
  s.tables.AUVO_SYNC[0].CHAVE = 'UNIDADE:AUVOID:9000001';
  const p = plano(s, 'EXCLUIR');
  assert.equal(p.blocks.length, 1, p.blocks.join(' | '));
  assert.match(p.blocks[0], /9000001/);
  assert.match(p.blocks[0], /Inativar/);
  assert.match(p.blocks[0], /Consolidar/);
  const s2 = snap({ AUVO_TAREFAS: [{ ID: 't1', AUVO_TASK_ID: '777', CLIENTE_AUVO_ID: 9000001, CLIENTE_ID_SGO: 'cA', FINALIZADA: 'SIM' }] });
  const p2 = plano(s2, 'EXCLUIR');
  assert.ok(p2.blocks.some((b) => /9000001/.test(b) && /Inativar/.test(b)), p2.blocks.join(' | '));
});

test('excluir com outro registro ligado continua impedido, com nome de tela da tabela', () => {
  const p = plano(snap({ DOC_DOCUMENTOS: [{ ID: 'd1', CLIENTE_ID: 'cA', UNIDADE_ID: 'uX', NOME_ARQUIVO: 'x.pdf', STATUS: 'ATIVO' }] }), 'EXCLUIR');
  assert.ok(p.blocks.some((b) => /Arquivo de documentos/.test(b) && /Inativar/.test(b)), p.blocks.join(' | '));
});

test('excluir cliente que só tem contatos (26/10/2026, erro relatado pela equipe): permitido, contatos do cliente inativados (sem apagar)', () => {
  const s = snap({ CAD_CONTATOS: [{ ID: 'k1', CLIENTE_ID: 'cA', UNIDADE_ID: 'uX', STATUS: 'ATIVO' }, { ID: 'k2', CLIENTE_ID: 'cB', UNIDADE_ID: '', STATUS: 'ATIVO' }, { ID: 'k3', CLIENTE_ID: 'cB', UNIDADE_ID: '', STATUS: 'INATIVO' }] });
  s.tables.AUVO_SYNC = s.tables.AUVO_SYNC.filter((m) => m.ENTIDADE_ID !== 'cB');
  const p = plano(s, 'EXCLUIR', { tipo: 'CLIENTE', origem: 'cB', motivo: 'Cliente duplicado, o correto já existe' });
  assert.deepEqual(p.blocks, [], p.blocks.join(' | '));
  assert.ok(p.changes.some((c) => c.table === 'CAD_CLIENTES' && c.id === 'cB' && c.field === '__DELETE__'));
  assert.deepEqual(mud(p, 'CAD_CONTATOS').map((c) => [c.id, c.field, c.after]), [['k2', 'STATUS', 'INATIVO']]);
  assert.ok(p.warnings.some((w) => /contato\(s\) deste cliente ficam inativos/.test(w)), p.warnings.join(' | '));
  // cliente com unidade continua impedido
  const p2 = plano(snap(), 'EXCLUIR', { tipo: 'CLIENTE', origem: 'cA', motivo: 'Teste de cliente com unidade' });
  assert.ok(p2.blocks.some((b) => /Unidades/.test(b)), p2.blocks.join(' | '));
});

test('consolidar unidades com o mesmo CNPJ: contato vai para a unidade de destino', () => {
  const s = snap();
  s.tables.CAD_UNIDADES.push({ _row: 4, ID: 'uY', CLIENTE_ID: 'cB', NOME_UNIDADE: 'BETA SEDE', CNPJ_UNIDADE: '44555666000181', STATUS: 'ATIVO' });
  const p = plano(s, 'CONSOLIDAR', { destino: 'uY' });
  assert.deepEqual(p.blocks, [], p.blocks.join(' | '));
  const k = mud(p, 'CAD_CONTATOS');
  assert.deepEqual(k.map((c) => c.field + '=' + c.after).sort(), ['CLIENTE_ID=cB', 'UNIDADE_ID=uY']);
});

test('excluir de vez fica com Administrador, Diretoria e Gestor (prévia e confirmação); Cadastros > Unidades aponta o caminho', () => {
  const v = fs.readFileSync(path.join(pasta, 'SGO_Vinculos.js'), 'utf8');
  assert.match(v, /const user=staff\(sessionId,true\);exigirExcluir\(sessionId,input&&input\.acao\);/);
  assert.match(v, /exigirExcluir\(sessionId,permit\.spec&&permit\.spec\.acao\)/);
  assert.match(v, /text\(acao\)==='EXCLUIR'&&!isAdminSession\(sessionId\)/);
  assert.match(fs.readFileSync(path.join(pasta, 'SGO_Unidades.js'), 'utf8'), /exclua por Cadastros > Vínculos/);
  // 26/10/2026: Cadastros > Clientes e Unidades: contato do próprio cadastro não impede; fica inativo depois
  assert.match(fs.readFileSync(path.join(pasta, 'SGO_Clientes.js'), 'utf8'), /SGO_DATA\.remove\(SHEET_NAME, clienteId, \{ ignorarVinculos: \['CAD_CONTATOS'\] \}\)[\s\S]*inativarContatosDe_\('CLIENTE_ID', clienteId\)/);
  assert.match(fs.readFileSync(path.join(pasta, 'SGO_Unidades.js'), 'utf8'), /SGO_DATA\.remove\(SHEET_NAME, unidadeId, \{ ignorarVinculos: \['CAD_CONTATOS'\] \}\)[\s\S]*inativarContatosDe_\('UNIDADE_ID', unidadeId\)/);
});
