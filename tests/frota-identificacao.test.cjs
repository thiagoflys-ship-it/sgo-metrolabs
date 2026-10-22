// Frota, identificação fácil dos veículos (21/10/2026, pedido do dono): apelido único entre os ativos (sem diferenciar
// maiúscula/acento), sugestão de apelido sem repetir os usados, base da lista configurável, rótulo "Apelido · placa"
// em toda resposta da Frota e da ponte do COMMAND, filtro por base nas telas e rótulo nos relatórios. Código real do
// SGO+ num contexto isolado, com tabelas em memória. Placas e nomes fictícios (TST...).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n');

function ambiente(tabelasIniciais, sessao) {
  const tabelas = Object.assign({ CAD_VEICULOS: [], CAD_CONDUTORES: [], CAD_USUARIOS: [], REG_FROTA_MOVIMENTACAO: [], REG_FROTA_AUDITORIA: [] }, tabelasIniciais || {});
  let seq = 0;
  const props = {};
  const logs = [];
  const ctx = vm.createContext({
    console, Utilities: criarUtilities(), Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, hasLock: () => false, tryLock: () => true }) },
    SpreadsheetApp: { flush() {} },
    CertCal_garantirTabela_: (t) => { tabelas[t] = tabelas[t] || []; }, CertCal_garantirColuna_() {}, CertCal_forcarColunaTexto_() {},
    SGO_DATA: {
      getDB: () => ({ getSheetByName: (n) => (tabelas[n] ? {} : null) }),
      getAll: (t) => (tabelas[t] || []).map((r) => Object.assign({}, r)),
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) return false; Object.assign(r, d); return true; },
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq) }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
      deleteById: () => { throw new Error('apagar é proibido'); },
      gerarRegistroBase: (o) => Object.assign({ ID: 'g' + (++seq), CRIADO_EM: new Date().toISOString() }, o),
      normalizarObjetoParaSheet: (t, o) => o,
      log: (...a) => logs.push(a)
    },
    SGO_CFG: { SHEETS: { CAD_VEICULOS: 'CAD_VEICULOS', CAD_CONDUTORES: 'CAD_CONDUTORES', CAD_USUARIOS: 'CAD_USUARIOS', REG_FROTA_MOVIMENTACAO: 'REG_FROTA_MOVIMENTACAO',
      REG_FROTA_MANUTENCAO: 'REG_FROTA_MANUTENCAO', REG_FROTA_DESPESA: 'REG_FROTA_DESPESA', REG_FROTA_PARADA: 'REG_FROTA_PARADA', REG_FROTA_DOCUMENTO: 'REG_FROTA_DOCUMENTO',
      REG_FROTA_MULTA: 'REG_FROTA_MULTA', REG_FROTA_ABASTECIMENTO: 'REG_FROTA_ABASTECIMENTO' } },
    exigirSessao: () => sessao.atual,
    isAdminSession: () => ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(sessao.atual.perfil),
    SGO_ehGestaoRotina_: (p) => ['ADMIN', 'GESTOR', 'DIRETORIA', 'RH', 'FINANCEIRO'].includes(String(p).toUpperCase())
  });
  // o despacho cita funções de outros arquivos da Frota: aqui viram vazias (o teste usa só as do cadastro e da identificação)
  for (const m of ler('SGO_Frota_Main.js').matchAll(/: (Frota_api\w+)[,\n]/g)) ctx[m[1]] = () => ({ ok: true });
  for (const f of ['SGO_Utilis.js', 'SGO_Frota_Config.js', 'SGO_Frota_Main.js', 'SGO_Frota_Identificacao.js']) vm.runInContext(ler(f), ctx);
  return { ctx, tabelas, props, logs };
}

const GESTORA = { userId: 'uG', usuario: 'gestora', nome: 'GESTORA TESTE', perfil: 'GESTOR' };
const RH = { userId: 'uR', usuario: 'rh', nome: 'RH TESTE', perfil: 'RH' };
const TECNICO = { userId: 'uT', usuario: 'tec', nome: 'TECNICO TESTE', perfil: 'TECNICO' };
const frota = () => ({
  CAD_VEICULOS: [
    { ID: 'v1', PLACA: 'TST1A11', MODELO: 'Onix', COR: 'Branco', KM_ATUAL: 1000, STATUS: 'ATIVO', APELIDO: 'Onça', BASE: 'Goiânia' },
    { ID: 'v2', PLACA: 'TST2B22', MODELO: 'Onix', COR: 'Branco', KM_ATUAL: 5000, STATUS: 'ATIVO', APELIDO: '', BASE: 'Rio de Janeiro' },
    { ID: 'v3', PLACA: 'TST3C33', MODELO: 'Strada', COR: 'Prata', KM_ATUAL: 9000, STATUS: 'INATIVO', APELIDO: 'Tucano', BASE: '' }
  ]
});

test('Apelido único entre os ativos, sem diferenciar maiúscula, acento ou hífen; inativo não conta, mas não volta repetido', () => {
  const sessao = { atual: GESTORA };
  const { ctx, tabelas } = ambiente(frota(), sessao);
  assert.throws(() => ctx.Frota_apiAtualizarVeiculo('s', { id: 'v2', apelido: 'onca' }), /O apelido "Onca" já é do veículo TST1A11/);
  assert.throws(() => ctx.Frota_apiCriarVeiculo('s', { placa: 'TST4D44', apelido: '  ONÇA ' }), /já é do veículo TST1A11/);
  // o inativo (Tucano) não segura o nome: outro ativo pode usar
  assert.equal(ctx.Frota_apiAtualizarVeiculo('s', { id: 'v2', apelido: 'tucano', base: 'rio de janeiro' }).ok, true);
  const v2 = tabelas.CAD_VEICULOS.find((v) => v.ID === 'v2');
  assert.equal(v2.APELIDO, 'Tucano');
  assert.equal(v2.BASE, 'Rio de Janeiro', 'a base fica com a grafia da lista');
  // reativar o inativo com o mesmo apelido de um ativo: recusado com o caminho
  assert.throws(() => ctx.Frota_apiReativarVeiculo('s', { id: 'v3' }), /já é do veículo TST2B22/);
  assert.equal(tabelas.CAD_VEICULOS.find((v) => v.ID === 'v3').STATUS, 'INATIVO');
  // hífen e espaço valem o mesmo
  ctx.Frota_apiAtualizarVeiculo('s', { id: 'v1', apelido: 'Lobo-guará' });
  assert.throws(() => ctx.Frota_apiAtualizarVeiculo('s', { id: 'v2', apelido: 'lobo guara' }), /já é do veículo TST1A11/);
  // o próprio veículo pode regravar o mesmo apelido
  assert.equal(ctx.Frota_apiAtualizarVeiculo('s', { id: 'v1', apelido: 'LOBO-GUARÁ' }).ok, true);
});

test('Edição só acrescenta: campo vazio mantém apelido e base gravados; base fora da lista é recusada; criar grava os dois', () => {
  const sessao = { atual: GESTORA };
  const { ctx, tabelas } = ambiente(frota(), sessao);
  ctx.Frota_apiAtualizarVeiculo('s', { id: 'v1', modelo: 'Onix Plus' });
  const v1 = tabelas.CAD_VEICULOS.find((v) => v.ID === 'v1');
  assert.equal(v1.APELIDO, 'Onça');
  assert.equal(v1.BASE, 'Goiânia');
  assert.throws(() => ctx.Frota_apiAtualizarVeiculo('s', { id: 'v1', base: 'Brasília' }), /não está na lista de bases da Frota \(Goiânia, Rio de Janeiro\)/);
  const r = ctx.Frota_apiCriarVeiculo('s', { placa: 'tst5e55', modelo: 'Saveiro', cor: 'Branco', apelido: 'capivara', base: 'GOIANIA' });
  assert.equal(r.item.APELIDO, 'Capivara');
  assert.equal(r.item.BASE, 'Goiânia');
  // sem apelido não trava o cadastro
  assert.equal(ctx.Frota_apiCriarVeiculo('s', { placa: 'TST6F66' }).ok, true);
  assert.throws(() => ctx.Frota_apiCriarVeiculo('s', { placa: 'TST7G77', apelido: '<b>x</b>' }), /não pode ter os sinais/);
});

test('Quem pode editar veículo: gestão (Gestor, RH, Financeiro...) sim; técnico não', () => {
  const sessao = { atual: RH };
  const { ctx } = ambiente(frota(), sessao);
  assert.equal(ctx.Frota_apiAtualizarVeiculo('s', { id: 'v2', apelido: 'Arara' }).ok, true);
  sessao.atual = TECNICO;
  assert.throws(() => ctx.Frota_apiAtualizarVeiculo('s', { id: 'v2', apelido: 'Tatu' }), /é da gestão/);
  assert.throws(() => ctx.Frota_apiListarSugestoesApelido('s', {}), /é da gestão/);
  assert.throws(() => ctx.Frota_apiSalvarBasesFrota('s', { bases: ['Goiânia'] }), /é da gestão/);
});

test('Sugestão de apelido: nunca repete um nome já usado (ativo ou inativo) nem os que a pessoa já viu', () => {
  const sessao = { atual: GESTORA };
  const { ctx, tabelas } = ambiente(frota(), sessao);
  const chave = (s) => ctx.FrotaId_chave_(s);
  for (let i = 0; i < 30; i++) {
    const r = ctx.Frota_apiListarSugestoesApelido('s', { excluir: ['Arara'] });
    assert.ok(r.sugestoes.length > 0);
    r.sugestoes.forEach((s) => assert.ok(!['ONCA', 'TUCANO', 'ARARA'].includes(chave(s)), s));
    assert.equal(new Set(r.sugestoes.map(chave)).size, r.sugestoes.length, 'sem repetição na mesma lista');
  }
  // usando todos os nomes da lista, a sugestão avisa que acabou
  tabelas.CAD_VEICULOS = ctx.FROTA_ID_ANIMAIS.map((a, i) => ({ ID: 'x' + i, PLACA: 'TST' + String(i).padStart(4, '0'), APELIDO: a, STATUS: 'ATIVO' }));
  const fim = ctx.Frota_apiListarSugestoesApelido('s', {});
  assert.equal(fim.sugestoes.length, 0);
  assert.equal(fim.esgotou, true);
  // a lista tem nomes distintos (sem acento)
  assert.equal(new Set(Array.from(ctx.FROTA_ID_ANIMAIS).map(chave)).size, ctx.FROTA_ID_ANIMAIS.length);
});

test('Bases: padrão Goiânia e Rio de Janeiro; lista configurável; base em uso por veículo ativo não sai', () => {
  const sessao = { atual: GESTORA };
  const { ctx, props } = ambiente(frota(), sessao);
  const info = ctx.Frota_apiListarIdentificacao('s');
  assert.deepEqual(Array.from(info.bases), ['Goiânia', 'Rio de Janeiro']);
  assert.equal(info.semApelido, 1, 'só o ativo sem apelido conta (o inativo não)');
  assert.equal(info.podeEditar, true);
  assert.throws(() => ctx.Frota_apiSalvarBasesFrota('s', { bases: ['Goiânia'] }), /"Rio de Janeiro" \(veículos TST2B22\) ainda está em uso/);
  const r = ctx.Frota_apiSalvarBasesFrota('s', { bases: 'Goiânia\nRio de Janeiro\nbrasília\nGOIÂNIA' });
  assert.deepEqual(Array.from(r.bases), ['Goiânia', 'Rio de Janeiro', 'brasília']);
  assert.equal(JSON.parse(props.FROTA_BASES).length, 3);
  assert.equal(ctx.Frota_apiAtualizarVeiculo('s', { id: 'v2', base: 'Brasilia' }).ok, true);
  sessao.atual = TECNICO;
  const t = ctx.Frota_apiListarIdentificacao('s');
  assert.equal(t.podeEditar, false);
  assert.equal(t.sugestoes.length, 0);
});

test('Rótulo (21/10 à noite): apelido e base na frente, "Apelido · base · placa"; completo com modelo sem a marca e a cor como cadastrada', () => {
  const { ctx } = ambiente(frota(), { atual: GESTORA });
  const v = frota().CAD_VEICULOS[0];
  assert.equal(ctx.Frota_rotuloVeiculo_(v, true), 'Onça · Goiânia · TST1A11 · Onix · Branco');
  assert.equal(ctx.Frota_rotuloVeiculo_(v), 'Onça · Goiânia · TST1A11');
  assert.equal(ctx.Frota_rotuloVeiculo_(frota().CAD_VEICULOS[1]), 'Rio de Janeiro · TST2B22');
  assert.equal(ctx.FrotaId_rotuloPorPlaca_('tst1a11'), 'Onça · Goiânia · TST1A11');
  // a cor vai como cadastrada (o dono reclamou de "branca"/"preta" em minúsculo) e o modelo sem repetir a marca
  assert.equal(ctx.Frota_rotuloVeiculo_({ APELIDO: 'Tucano', BASE: 'Goiânia', PLACA: 'TST9Z99', MODELO: 'CHEVROLET/ONIX 1.0 MT LS', MARCA: 'CHEVROLET', COR: 'PRETA' }, true), 'Tucano · Goiânia · TST9Z99 · ONIX 1.0 MT LS · PRETA');
  assert.equal(ctx.FrotaId_modeloLimpo_('FIAT MOBI LIKE FIAT', 'FIAT'), 'MOBI LIKE');
  assert.equal(ctx.FrotaId_modeloLimpo_('Onix', 'Chevrolet'), 'Onix');
  assert.equal(ctx.FrotaId_rotuloPorPlaca_('XYZ9999'), 'XYZ9999');
});

test('Toda resposta da Frota (dispatch) ganha apelido, base e rótulo sem trocar a placa', () => {
  const sessao = { atual: TECNICO };
  const { ctx } = ambiente(Object.assign(frota(), {
    CAD_CONDUTORES: [{ ID: 'c1', NOME: 'TECNICO TESTE', USUARIO_ID: 'uT', STATUS: 'ATIVO' }],
    REG_FROTA_MOVIMENTACAO: [{ ID: 'm1', VEICULO_ID: 'v1', CONDUTOR_ID: 'c1', DATA_SAIDA: '21/10/2026', HORA_SAIDA: '08:00', KM_SAIDA: 1000, STATUS: 'EM_ANDAMENTO' }]
  }), sessao);
  const r = ctx.Frota_apiDispatch({ sessionId: 's', fn: 'apiInicioFrota' });
  const onca = r.veiculos.find((v) => v.id === 'v1') || null;
  const rio = r.veiculos.find((v) => v.id === 'v2');
  assert.equal(rio.placa, 'TST2B22');
  assert.equal(rio.rotuloVeiculo, 'Rio de Janeiro · TST2B22');
  assert.equal(rio.baseFrota, 'Rio de Janeiro');
  assert.equal(rio.identVeiculo, 'Rio de Janeiro · TST2B22 · Onix · Branco');
  assert.equal(onca.rotuloVeiculo, 'Onça · Goiânia · TST1A11');
  assert.equal(onca.apelido, 'Onça');
  const mov = r.emAndamento[0];
  assert.equal(mov.veiculoPlaca, 'TST1A11');
  assert.equal(mov.veiculoRotulo, 'Onça · Goiânia · TST1A11');
  assert.equal(mov.veiculoBase, 'Goiânia');
  const lista = ctx.Frota_apiDispatch({ sessionId: 's', fn: 'apiListarVeiculosTodos' });
  const l1 = lista.items.find((v) => v.ID === 'v1');
  assert.equal(l1.PLACA, 'TST1A11');
  assert.equal(l1.ROTULO_VEICULO, 'Onça · Goiânia · TST1A11');
  assert.equal(l1.IDENT_VEICULO, 'Onça · Goiânia · TST1A11 · Onix · Branco');
  // a mesma regra serve à ponte do COMMAND
  const ponte = ctx.FrotaId_enfeitarResposta_({ ok: true, veiculos: [{ id: 'v1', placa: 'TST1A11', cor: '#1f5fa8' }], reservas: [{ codigo: 'RV-1', placa: 'TST1A11' }] });
  assert.equal(ponte.veiculos[0].rotuloVeiculo, 'Onça · Goiânia · TST1A11');
  assert.equal(ponte.veiculos[0].identVeiculo, 'Onça · Goiânia · TST1A11 · Onix · Branco', 'cor da situação (#...) não entra no rótulo');
  assert.equal(ponte.reservas[0].apelido, 'Onça');
});

// ---------- telas (código do navegador) ----------
function scriptDoModulo() {
  const src = ler('SGO_Frota_ConteudoModulo.js');
  const html = new Function(src + ';return FROTA_CONTEUDO_MODULO;')();
  assert.equal(typeof new Function(src + ';return Frota_obterConteudoModulo;')(), 'function', 'o getter do módulo continua lá');
  return { html, js: html.match(/<script>([\s\S]*?)<\/script>/)[1] };
}

test('Tela da Frota: rótulo com apelido, filtro por base guardado no navegador e aviso dos veículos sem apelido', () => {
  const { js, html } = scriptDoModulo();
  const guardado = {};
  const elementos = {};
  const ctx = vm.createContext({ console, localStorage: { getItem: (k) => (k in guardado ? guardado[k] : null), setItem: (k, v) => { guardado[k] = String(v); } },
    document: { getElementById: (id) => elementos[id] || null }, USER_CONTEXT: { perfil: 'GESTOR' } });
  vm.runInContext(js, ctx);
  vm.runInContext("frotaState.veiculosTodos = " + JSON.stringify(frota().CAD_VEICULOS) + "; frotaState.ident = { bases: ['Goiânia', 'Rio de Janeiro'] };", ctx);
  assert.equal(ctx.tplFrota_rotuloVeic_({ ID: 'v1', PLACA: 'TST1A11' }, true), 'Onça · Goiânia · TST1A11 · Onix · Branco');
  assert.equal(ctx.tplFrota_rotuloPlaca_('TST1A11'), 'Onça · Goiânia · TST1A11', 'pela placa, com o cadastro carregado');
  assert.equal(ctx.tplFrota_rotuloPlaca_('TST2B22'), 'Rio de Janeiro · TST2B22', 'sem apelido, base e placa');
  assert.equal(ctx.tplFrota_modeloLimpo_('CHEVROLET/ONIX 1.0 MT LS', 'CHEVROLET'), 'ONIX 1.0 MT LS', 'coluna Modelo, marca e cor sem repetir a marca');
  assert.doesNotMatch(js, /String\(v\.COR\)\.toLowerCase\(\)/, 'cor como cadastrada');
  // filtro por base: escolha guardada; veículo sem base aparece em todas
  ctx.tplFrota_guardarBase_('Goiânia');
  assert.equal(guardado.sgo_frota_base, 'Goiânia');
  assert.equal(ctx.tplFrota_passaBase_({ placa: 'TST1A11' }), true);
  assert.equal(ctx.tplFrota_passaBase_({ placa: 'TST2B22' }), false);
  assert.equal(ctx.tplFrota_passaBase_({ placa: 'TST3C33' }), true, 'sem base: aparece');
  assert.equal(ctx.tplFrota_passaBase_({ placa: 'XYZ', baseFrota: 'Rio de Janeiro' }), false, 'base vinda do servidor');
  assert.match(ctx.tplFrota_seletorBaseHtml_('b'), /<option value="Goiânia" selected>Goiânia<\/option>/);
  // tabela de veículos: só a base escolhida, apelido em destaque e o aviso dos sem apelido (o ativo TST2B22)
  const tabela = { innerHTML: '' };
  elementos.tplFrota_veiculosTabela = tabela;
  ctx.tplFrota_guardarBase_('');
  ctx.tplFrota_renderVeiculosTabela_();
  assert.match(tabela.innerHTML, /<span class="frota-apelido">Onça<\/span><span class="frota-placa-mini">TST1A11<\/span>/);
  assert.match(tabela.innerHTML, /1 veículo ativo sem apelido/);
  ctx.tplFrota_guardarBase_('Rio de Janeiro');
  ctx.tplFrota_renderVeiculosTabela_();
  assert.doesNotMatch(tabela.innerHTML, /TST1A11/);
  assert.match(tabela.innerHTML, /TST2B22/);
  // formulários com apelido, "Sugerir apelido" e base; listas de escolha com o rótulo completo
  assert.match(html, /id="tplFrota_v_apelido"/);
  assert.match(html, /id="tplFrota_ve_apelido"/);
  assert.match(html, /data-alvo="tplFrota_v_apelido" onclick="tplFrota_sugerirApelido_\(this\)">Sugerir apelido/);
  assert.match(html, /id="tplFrota_ve_base"/);
  assert.doesNotMatch(js, /label: v\.PLACA \+ ' — '/, 'nenhuma lista de veículos só com a placa');
  assert.match(js, /tplFrota_esc\(a\.veiculoRotulo \|\| a\.veiculoPlaca\)/, 'multas, documentos e avisos com o rótulo');
});

test('Rastreamento, Gantt e Reservas: rótulo do veículo e filtro por base sobre os dados', () => {
  const rt = ler('SGO_Frota_RastreamentoTela.js'), rs = ler('SGO_Frota_ReservasTela.js');
  assert.match(rt, /m\.bindTooltip\(esc\(v\.apelido \|\| v\.placa\)/, 'marcador do mapa com o apelido');
  assert.match(rt, /desenharLista\(r\.veiculos\.filter\(passaBase\)\)/, 'lista do mapa filtrada pela base');
  assert.match(rt, /desenharMarcadores\(L, r\.veiculos\.filter\(passaBase\)\)/, 'marcadores filtrados pela base');
  assert.match(rt, /<div class="frg-nome">' \+ esc\(rotV\(l\)\)/, 'Gantt: nome da linha com o apelido');
  assert.match(rt, /linhas: \(r\.linhas \|\| \[\]\)\.filter\(function \(l\) \{ return !l\.veiculoId \|\| passaBase\(l\); \}\)/, 'Gantt filtrado pela base');
  assert.match(rs, /dB = Object\.assign\(\{\}, d, \{ veiculos: d\.veiculos\.filter\(passaBase\) \}\)/, 'agenda filtrada pela base');
  assert.match(rs, /<div class="veic">' \+ esc\(rotV\(v\)\)/, 'agenda: apelido na linha do veículo');
});

test('Retirar e devolver (computador e celular): apelido grande, base para escolher e rótulo no botão Devolver', () => {
  const core = ler('JS_Core.html');
  assert.match(core, /function fsTituloVeic_\(apelido, placa, detalhes, base\)/);
  assert.doesNotMatch(core, /String\(v\.cor \|\| ""\)\.toLowerCase\(\)/, 'cor como cadastrada no celular');
  assert.match(core, /const livresBase = livres\.filter\(function \(v\) \{ return !baseSel \|\| !v\.baseFrota \|\| v\.baseFrota === baseSel; \}\);/);
  assert.match(core, /if \(acao === "base"\) \{ fsGuardarBase_\(id\); fsDesenharInicio_\(\); return; \}/);
  assert.match(core, /<b>Devolver ' \+ fsEsc_\(m\.veiculoRotulo \|\| m\.veiculoPlaca\)/);
  assert.match(core, /const FS_BASE_CHAVE = "sgo_frota_base";/, 'mesma chave da tela completa');
  // a função do título roda: apelido grande e a placa embaixo; sem apelido, a placa grande
  const corpo = core.replace(/\r\n/g, '\n').match(/function fsTituloVeic_\(apelido, placa, detalhes, base\) \{[\s\S]*?\n  \}/)[0];
  const fsTituloVeic_ = new Function('fsEsc_', corpo + '; return fsTituloVeic_;')((x) => String(x));
  assert.equal(fsTituloVeic_('Onça', 'TST1A11', ['Onix · Branco'], 'Goiânia'), '<span class="fs-placa">Onça</span><span class="fs-modelo">Goiânia · TST1A11 · Onix · Branco</span>');
  assert.equal(fsTituloVeic_('', 'TST2B22', ['Onix · Branco']), '<span class="fs-placa">TST2B22</span><span class="fs-modelo">Onix · Branco</span>');
});

test('Relatório A4 e avisos: veículo com apelido; pasta do relatório continua pela placa', () => {
  const rel = ler('SGO_Frota_Relatorio.js');
  assert.match(rel, /rotulo: Frota_rotuloVeiculo_\(v\)/);
  assert.match(rel, /\['Apelido', v\.apelido \|\| '—'\], \['Placa', v\.placa\], \['Base', v\.base \|\| '—'\]/);
  assert.match(rel, /RelA4_esc_\(\(v\.rotulo \|\| v\.placa\)\)/, 'célula do veículo nas tabelas');
  assert.match(rel, /subpasta = v\.placa;/, 'pasta no Drive pela placa, como antes');
  const ctx = vm.createContext({ RelA4_esc_: (s) => String(s) });
  vm.runInContext(rel.match(/function FrotaRel_celVeiculo_\(v\) \{[\s\S]*?\n\}/)[0], ctx);
  assert.match(ctx.FrotaRel_celVeiculo_({ placa: 'TST1A11', rotulo: 'Onça · TST1A11', modelo: 'Onix' }).html, /Onça · TST1A11/);
  const central = ler('SGO_Alertas_Central.js');
  assert.match(central, /titulo: a\.tipoLabel \+ ' do veículo ' \+ placaRot/);
  assert.match(central, /textoEstavel: 'O veículo \\'' \+ placa \+ '\\' /, 'texto estável continua pela placa (não reabre aviso)');
  assert.match(ler('SGO_PonteCommand.js'), /FrotaId_enfeitarResposta_\(rFrota\)/, 'ponte do COMMAND com o rótulo');
});
