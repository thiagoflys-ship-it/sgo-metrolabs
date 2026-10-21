// Campos de identificação do equipamento no cadastro (21/10/2026): TAG, número de série, setor, patrimônio,
// ano de fabricação, capacidade, câmaras e responsável no cliente. Antes eram digitados na tela do ensaio;
// com a identificação travada no cadastro, o que faltava no cadastro não tinha de onde vir.
// Confere: colunas no cadastro, aviso "Falta no cadastro" com o preenchimento ali mesmo (só campo vazio, com
// trilha), sugestões de ensaios antigos, documentos com TAG/série/setor e migração que nunca sobrescreve.
// Só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const M = require('./_modelo_oficial_ambiente.cjs');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = n => fs.readFileSync(path.join(BASE, n), 'utf8').replace(/\r\n/g, '\n');

// SGO_DATA.update do banco em memória (grava só os campos enviados, como o real).
const UPDATE = 'SGO_DATA.update = function (n, id, o) { var l = (__ABAS[n] || []).filter(function (x) { return String(x.ID) === String(id); })[0]; if (!l) return false; Object.keys(o).forEach(function (k) { l[k] = o[k]; }); return true; };';

function ambiente() {
  const env = M.criarAmbiente();
  env.run(UPDATE);
  // Equipamento do mesmo cliente com TAG, série e setor vazios (cadastro antigo, só com o tipo).
  env.run('SGO_DATA.insert("CAD_EQUIPAMENTOS", { ID: "eq3", CLIENTE_ID: "cli1", UNIDADE_ID: "uni1", TIPO: "AUTOCLAVE", TAG: "", SERIE: "", SETOR: "", STATUS: "ATIVO" });');
  return env;
}
const V3 = { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq3' };
const eq = (env, id) => env.fn('SGO_DATA').getById('CAD_EQUIPAMENTOS', id);

test('cadastro do equipamento tem os campos que os documentos usam (planilha, servidor e tela)', () => {
  const setup = ler('SGO_Setup.js');
  const bloco = setup.slice(setup.indexOf('setupTabela(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS'), setup.indexOf('DOC_DOCUMENTOS', setup.indexOf('setupTabela(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS')));
  for (const c of ['TAG', 'SERIE', 'SETOR', 'TIPO', 'FABRICANTE', 'MODELO', 'PATRIMONIO', 'ANO_FABRICACAO', 'CAPACIDADE', 'NUM_CAMARAS', 'RESPONSAVEL_CLIENTE']) {
    assert.match(bloco, new RegExp('"' + c + '"'), 'coluna ' + c + ' no cabeçalho de CAD_EQUIPAMENTOS');
  }
  const srv = ler('SGO_Equipamentos.js');
  assert.match(srv, /SGO_EQP_CAMPOS_NOVOS = \["PATRIMONIO", "ANO_FABRICACAO", "CAPACIDADE", "NUM_CAMARAS", "RESPONSAVEL_CLIENTE"\]/);
  assert.match(srv, /CertCal_garantirColuna_\(SGO_CFG\.SHEETS\.CAD_EQUIPAMENTOS, c\)/, 'colunas só acrescentadas (garantirColuna)');
  const tela = ler('JS_Equipamentos.html');
  for (const id of ['eqp_tag', 'eqp_serie', 'eqp_setor', 'eqp_patrimonio', 'eqp_ano', 'eqp_capacidade', 'eqp_camaras', 'eqp_responsavel', 'eqp_fabricante', 'eqp_modelo', 'eqp_tipo']) {
    assert.match(tela, new RegExp('id: "' + id + '"'), 'campo ' + id + ' no formulário');
  }
  assert.match(tela, /PATRIMONIO: getValue_\("eqp_patrimonio"\)/);
  assert.match(tela, /\["Patrimônio", e\.PATRIMONIO\]/, 'ficha do equipamento mostra o patrimônio');
  // Cadastro incompleto passa a contar o setor.
  assert.match(ler('SGO_CadastrosPainel.js'), /\['TAG', 'SERIE', 'SETOR', 'FABRICANTE', 'MODELO'\]/);
});

test('criar e editar no cadastro: campos novos gravados, edição parcial não apaga, série repetida avisa', () => {
  const abas = { CAD_EQUIPAMENTOS: [], CAD_CLIENTES: [{ ID: 'c1', STATUS: 'ATIVO' }], CAD_UNIDADES: [{ ID: 'u1', CLIENTE_ID: 'c1', STATUS: 'ATIVO' }] };
  const colunas = [];
  const ctx = vm.createContext({
    console,
    SGO_CFG: { SHEETS: { CAD_EQUIPAMENTOS: 'CAD_EQUIPAMENTOS' } },
    exigirSessao: () => ({ perfil: 'TECNICO', usuario: 'tec' }),
    SGO_Pendencias_aposGravar_: r => r,
    CertCal_garantirColuna_: (aba, c) => colunas.push(aba + '.' + c),
    SGO_UTILS: { safe: v => (v == null ? '' : String(v).trim()), safeUpper: v => (v == null ? '' : String(v).trim().toUpperCase()), uuid: () => 'tok' },
    SGO_DATA: {
      getAll: n => (abas[n] || []).map(x => Object.assign({}, x)),
      getById: (n, id) => { const l = (abas[n] || []).find(x => x.ID === id); return l ? Object.assign({}, l) : null; },
      gerarRegistroBase: o => Object.assign({ ID: 'eqN' + (abas.CAD_EQUIPAMENTOS.length + 1) }, o),
      normalizarObjetoParaSheet: (n, o) => o,
      insert: (n, o) => abas[n].push(Object.assign({}, o)),
      update: (n, id, o) => { const l = abas[n].find(x => x.ID === id); Object.assign(l, o); return true; },
      log: () => {},
      mesclarCampos_: null
    }
  });
  // mesclarCampos_ real (SGO_Data.js).
  const dataSrc = ler('SGO_Data.js');
  const ini = dataSrc.indexOf('SGO_DATA.mesclarCampos_ = function');
  vm.runInContext(dataSrc.slice(ini, dataSrc.indexOf('\n};', ini) + 3), ctx);
  vm.runInContext(ler('SGO_Equipamentos.js'), ctx);
  const criar = vm.runInContext('equipamentosCriar', ctx), atualizar = vm.runInContext('equipamentosAtualizar', ctx);
  const r = criar('s', { CLIENTE_ID: 'c1', UNIDADE_ID: 'u1', TIPO: 'Autoclave', TAG: 'aut-9', SERIE: 'sn-1', SETOR: 'cme', PATRIMONIO: 'pat 77', ANO_FABRICACAO: '2019', CAPACIDADE: '150 L', NUM_CAMARAS: '1', RESPONSAVEL_CLIENTE: 'Enfermeira responsável (teste)' });
  assert.equal(r.success, true, r.message);
  const g = abas.CAD_EQUIPAMENTOS[0];
  assert.deepEqual([g.TAG, g.SERIE, g.SETOR, g.PATRIMONIO, g.ANO_FABRICACAO, g.CAPACIDADE, g.NUM_CAMARAS, g.RESPONSAVEL_CLIENTE], ['AUT-9', 'SN-1', 'CME', 'PAT 77', '2019', '150 L', '1', 'Enfermeira responsável (teste)']);
  assert.ok(colunas.includes('CAD_EQUIPAMENTOS.PATRIMONIO') && colunas.includes('CAD_EQUIPAMENTOS.RESPONSAVEL_CLIENTE'));
  // Edição parcial (outra tela, sem os campos novos) não apaga nada.
  const u = atualizar('s', g.ID, { CLIENTE_ID: 'c1', UNIDADE_ID: 'u1', TIPO: 'AUTOCLAVE', TAG: 'AUT-9' });
  assert.equal(u.success, true, u.message);
  assert.equal(abas.CAD_EQUIPAMENTOS[0].PATRIMONIO, 'PAT 77');
  assert.equal(abas.CAD_EQUIPAMENTOS[0].SERIE, 'SN-1');
  assert.equal(abas.CAD_EQUIPAMENTOS[0].CAPACIDADE, '150 L');
  // Segundo equipamento com a mesma série no mesmo cliente: grava, mas avisa.
  const r2 = criar('s', { CLIENTE_ID: 'c1', UNIDADE_ID: 'u1', TIPO: 'Autoclave', TAG: 'AUT-10', SERIE: 'SN-1' });
  assert.equal(r2.success, true);
  assert.match(r2.message, /mesmo número de série \(SN-1\)/);
});

test('falta no cadastro: identificação diz o que falta; preencher ali mesmo grava só o vazio, com trilha', () => {
  const env = ambiente();
  const id0 = env.oficial('tec', 'apiIdentificacao', V3);
  assert.equal(id0.ok, true, id0.erro);
  assert.deepEqual(id0.identificacao.faltam.map(f => f.rotulo), ['TAG', 'Nº de série', 'Setor']);
  // Equipamento completo: nada falta.
  assert.deepEqual(env.oficial('tec', 'apiIdentificacao', { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1' }).identificacao.faltam, []);
  // TAG de outro equipamento do mesmo cliente: recusada, sem gravar nada.
  const rep = env.oficial('tec', 'apiPreencherCadastro', Object.assign({ campos: { TAG: 'aut-teste-01', SERIE: 'SN-NOVA' } }, V3));
  assert.equal(rep.ok, false);
  assert.match(rep.erro, /já é de outro equipamento deste cliente/);
  assert.equal(eq(env, 'eq3').SERIE, '');
  // Preenche TAG, série e setor (e patrimônio), em maiúsculas como o cadastro.
  const r = env.oficial('tec', 'apiPreencherCadastro', Object.assign({ campos: { TAG: 'aut-teste-03', SERIE: 'sn-teste-0003', SETOR: 'cme', PATRIMONIO: 'pt-1', CAMPO_INVENTADO: 'x' } }, V3));
  assert.equal(r.ok, true, r.erro);
  assert.equal(r.gravados, 4);
  const e3 = eq(env, 'eq3');
  assert.deepEqual([e3.TAG, e3.SERIE, e3.SETOR, e3.PATRIMONIO, e3.CAMPO_INVENTADO], ['AUT-TESTE-03', 'SN-TESTE-0003', 'CME', 'PT-1', undefined]);
  assert.deepEqual(r.identificacao.faltam, []);
  assert.equal(r.identificacao.tag, 'AUT-TESTE-03');
  assert.equal(r.identificacao._nomesProibidos, undefined);
  const trilha = env.fn('LOGS_TESTE').filter(l => l.acao === 'EQUIPAMENTOS_PREENCHER_VAZIO');
  assert.equal(trilha.length, 1);
  assert.match(trilha[0].detalhe, /eq3.*só campos vazios.*TAG = AUT-TESTE-03/);
  assert.equal(trilha[0].usuario, 'tec');
  // Valor já gravado nunca é trocado por aqui.
  const r2 = env.oficial('tec', 'apiPreencherCadastro', Object.assign({ campos: { TAG: 'OUTRA', SETOR: 'UTI' } }, V3));
  assert.equal(r2.ok, true);
  assert.equal(r2.gravados, 0);
  assert.match(r2.mensagem, /já estão preenchidos.*Cadastros › Equipamentos › Editar/);
  assert.equal(eq(env, 'eq3').TAG, 'AUT-TESTE-03');
  assert.equal(eq(env, 'eq3').SETOR, 'CME');
  // Ano inválido é recusado com o que fazer; cliente e comercial não gravam.
  assert.match(env.oficial('tec', 'apiPreencherCadastro', Object.assign({ campos: { ANO_FABRICACAO: '19' } }, V3)).erro, /4 dígitos/);
  assert.match(env.oficial('cli', 'apiPreencherCadastro', Object.assign({ campos: { CAPACIDADE: '100 L' } }, V3)).erro, /equipe técnica/);
  assert.equal(eq(env, 'eq3').CAPACIDADE, undefined);
  // Equipamento de outro cliente: recusado pela conferência do vínculo.
  assert.match(env.oficial('tec', 'apiPreencherCadastro', { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq2', campos: { SETOR: 'X' } }).erro, /outro cliente/);
});

test('ensaios antigos com TAG/série/setor digitados: sugestões só para o que está vazio, e só depois de gravar', () => {
  const env = ambiente();
  env.run('SGO_DATA.update("CAD_EQUIPAMENTOS", "eq3", { TAG: "AUT-ANTIGA-7" });');
  // Emissão antiga, sem vínculo, do mesmo CNPJ e da mesma TAG, com a série e o local digitados na época.
  env.fn('SGO_QE_registrar_')({ MODULO: 'AUTOCLAVE', STATUS: 'EMITIDO', NUMERO: 'AUT-ANT-1', REVISAO: '0', CLIENTE: 'HOSPITAL MODELO TESTE LTDA', CNPJ: '11.222.333/0001-81', TAG: 'AUT-ANTIGA-7',
    APROVADO_EM: '2026-03-10T12:00:00Z', PAYLOAD_JSON: JSON.stringify({ tag: 'AUT-ANTIGA-7', numSerie: 'sn-antiga-7', local: 'Expurgo', marca: 'MARCAFICTICIA' }) });
  // Outra TAG do mesmo cliente não entra.
  env.fn('SGO_QE_registrar_')({ MODULO: 'AUTOCLAVE', STATUS: 'EMITIDO', NUMERO: 'AUT-ANT-2', CNPJ: '11.222.333/0001-81', TAG: 'AUT-OUTRA-9', PAYLOAD_JSON: JSON.stringify({ numSerie: 'NAO-ENTRA' }) });
  const s = env.oficial('tec', 'apiSugestoesCadastro', V3);
  assert.equal(s.ok, true, s.erro);
  assert.deepEqual(s.sugestoes.SERIE.map(x => x.valor), ['SN-ANTIGA-7']);
  assert.match(s.sugestoes.SERIE[0].origem, /AUT-ANT-1/);
  assert.deepEqual(s.sugestoes.SETOR.map(x => x.valor), ['EXPURGO']);
  assert.equal(s.sugestoes.TAG, undefined, 'TAG já preenchida no cadastro não é sugerida');
  assert.equal(JSON.stringify(s).includes('MARCAFICTICIA'), false, 'marca não vem como sugestão');
  assert.equal(eq(env, 'eq3').SERIE, '', 'sugestão não grava sozinha');
  const g = env.oficial('tec', 'apiPreencherCadastro', Object.assign({ campos: { SERIE: s.sugestoes.SERIE[0].valor, SETOR: s.sugestoes.SETOR[0].valor }, origem: 'teste' }, V3));
  assert.equal(g.gravados, 2);
  assert.equal(eq(env, 'eq3').SERIE, 'SN-ANTIGA-7');
});

test('documentos puxam TAG, série e setor do cadastro (relatório de qualificação, ensaio de ciclo e planilha)', () => {
  const env = ambiente();
  env.run('SGO_DATA.update("CAD_EQUIPAMENTOS", "eq1", { PATRIMONIO: "PAT-TESTE-55", CAPACIDADE: "150 L" });');
  // Payload do ensaio: TAG, série, setor e localização vêm do cadastro, mesmo que a tela mande outra coisa.
  const p = env.fn('SGO_QEQ_aplicarVinculoPayload_')('tec', { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1', tag: 'DIGITADA', numSerie: 'X', local: 'digitado', marca: 'MARCAFICTICIA' });
  assert.equal(p.tag, 'AUT-TESTE-01');
  assert.equal(p.numSerie, 'SN-TESTE-0001');
  assert.equal(p.setor, 'CME CENTRAL TESTE — CME');
  assert.equal(p.local, 'CME CENTRAL TESTE — CME', 'planilha de dados usa "local"');
  assert.equal(p.localizacao, 'CME CENTRAL TESTE — CME');
  assert.equal(p.patrimonio, 'PAT-TESTE-55');
  assert.equal(p.marca, '');
  // Relatório de qualificação: TAG, série, setor e patrimônio; sem fabricante nem modelo.
  const c1 = M.emitirCiclo(env, { ensaio: 'QO (Vazio)', certNumero: 'AUT-T-0101' });
  const base = { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1', etapas: { QO: true }, motivo: 'Requalificação periódica', periodicidadeMeses: 12, ciclos: [c1] };
  const prev = env.oficial('tec', 'apiPrevia', base);
  assert.equal(prev.ok, true, prev.erro);
  assert.match(prev.html, /AUT-TESTE-01/);
  assert.match(prev.html, /SN-TESTE-0001/);
  assert.match(prev.html, /Setor ou local<\/th><td>CME</);
  assert.match(prev.html, /Patrimônio<\/th><td>PAT-TESTE-55/);
  assert.match(prev.html, /Capacidade ou volume<\/th><td>150 L/);
  assert.doesNotMatch(prev.html, /MARCAFICTICIA|MODELOXYZ/);
  // Componente comum das telas de ensaio: aviso e botão; roteadores dos quatro módulos aceitam o preenchimento.
  const comp = ler('JS_QualifVinculo.html');
  assert.match(comp, /Falta no cadastro do equipamento: /);
  assert.match(comp, /chamar\("apiPreencherCadastro"/);
  assert.match(comp, /Buscar nos ensaios anteriores/);
  for (const f of ['SGO_AutoRel_ModeloOficialNovo.js', 'SGO_LavRel_ModeloOficialNovo.js', 'SGO_EstufaBanhoRel_ModeloOficialNovo.js', 'SGO_CadeiaFrioRel_Main.js']) {
    assert.match(ler(f), /apiPreencherCadastro: function \(p, s, id\) \{ return SGO_QEQ_apiPreencherCadastro\(p, s, id\); \}/, f);
  }
});
