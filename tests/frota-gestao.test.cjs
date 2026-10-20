// Frota, Gestão e melhoria (19/10/2026): Kanban dos casos (avaria, multa, manutenção), 5 Porquês, plano 5W2H com
// PDCA (ações em Minhas atividades, módulo "frota"), indicadores e editar condutor. Código real do SGO+ num contexto
// isolado, com tabelas em memória e datas relativas a hoje.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); };
const iso = (br) => br.split('/').reverse().join('-');

function ambiente(tabelasIniciais, sessao) {
  const tabelas = Object.assign({ CAD_VEICULOS: [], CAD_CONDUTORES: [], CAD_USUARIOS: [], REG_FROTA_MOVIMENTACAO: [], REG_FROTA_MULTA: [], REG_FROTA_MANUTENCAO: [],
    REG_FROTA_DESPESA: [], REG_FROTA_PARADA: [], REG_FROTA_ABASTECIMENTO: [], REG_FROTA_DOCUMENTO: [], REG_FROTA_AUDITORIA: [] }, tabelasIniciais || {});
  let seq = 0;
  const atividades = [];
  const ctx = vm.createContext({
    console, Utilities: criarUtilities(), Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, hasLock: () => false, tryLock: () => true }) },
    SpreadsheetApp: { flush() {} },
    CertCal_garantirTabela_: (t) => { tabelas[t] = tabelas[t] || []; }, CertCal_garantirColuna_() {}, CertCal_forcarColunaTexto_() {},
    SGO_DATA: {
      getDB: () => ({ getSheetByName: (n) => (tabelas[n] ? {} : null) }),
      getAll: (t) => (tabelas[t] || []).map((r) => Object.assign({}, r)),
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) return false; Object.assign(r, d); return true; },
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq), CRIADO_EM: new Date().toISOString() }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
      gerarRegistroBase: (o) => Object.assign({ ID: 'g' + (++seq), CRIADO_EM: new Date().toISOString() }, o),
      normalizarObjetoParaSheet: (t, o) => o,
      log() {}
    },
    SGO_CFG: { SHEETS: { CAD_VEICULOS: 'CAD_VEICULOS', CAD_CONDUTORES: 'CAD_CONDUTORES', CAD_USUARIOS: 'CAD_USUARIOS', REG_FROTA_MOVIMENTACAO: 'REG_FROTA_MOVIMENTACAO',
      REG_FROTA_MULTA: 'REG_FROTA_MULTA', REG_FROTA_MANUTENCAO: 'REG_FROTA_MANUTENCAO', REG_FROTA_DESPESA: 'REG_FROTA_DESPESA', REG_FROTA_PARADA: 'REG_FROTA_PARADA',
      REG_FROTA_ABASTECIMENTO: 'REG_FROTA_ABASTECIMENTO', REG_FROTA_DOCUMENTO: 'REG_FROTA_DOCUMENTO' } },
    exigirSessao: () => sessao.atual,
    isAdminSession: () => ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(sessao.atual.perfil),
    SGO_DocA4_num_: (v, c) => Number(v).toFixed(c).replace('.', ','), RELA4_CORES: {},
    Atividades_apiCriar: (sid, p) => { const item = { ID: 'atv' + (atividades.length + 1), TITULO: p.titulo, RESPONSAVEL_NOME: 'R', PRAZO: p.prazo, SITUACAO: 'A fazer', MODULO: p.modulo, POR_QUE: p.porQue }; atividades.push(item); return { ok: true, item }; },
    Atividades_todas_: () => atividades.map((a) => Object.assign({}, a))
  });
  for (const f of ['SGO_Utilis.js', 'SGO_Frota_Config.js', 'SGO_Frota_Main.js', 'SGO_Frota_Rastreador.js', 'SGO_Frota_Relatorio.js', 'SGO_Conduta_Qualidade.js', 'SGO_Frota_Gestao.js']) {
    vm.runInContext(fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n'), ctx);
  }
  return { ctx, tabelas, atividades };
}

const ck = (problema) => JSON.stringify([{ grupo: 'Frente', item: 'Para-choque dianteiro', ok: !problema, observacao: problema || '' }, { grupo: 'Frente', item: 'Faróis', ok: true }]);
const mov = (id, o) => Object.assign({ ID: id, VEICULO_ID: 'v1', CONDUTOR_ID: 'c1', STATUS: 'FINALIZADO', DATA_SAIDA: dia(-5), HORA_SAIDA: '08:00', DATA_CHEGADA: dia(-5), HORA_CHEGADA: '12:00',
  KM_SAIDA: 1000, KM_CHEGADA: 1100, CHECKLIST_SAIDA_JSON: ck(''), CHECKLIST_CHEGADA_JSON: ck('') }, o);
const base = () => ({
  CAD_VEICULOS: [{ ID: 'v1', PLACA: 'TST1A11', MODELO: 'Carro de teste', KM_ATUAL: 20000, STATUS: 'ATIVO' }, { ID: 'v2', PLACA: 'TST2B22', MODELO: 'Outro', KM_ATUAL: 5000, STATUS: 'ATIVO' }],
  CAD_CONDUTORES: [{ ID: 'c1', NOME: 'CONDUTOR UM', USUARIO_ID: 'u_tec', CNH: '123', TELEFONE: '11999990000', CNH_VALIDADE: dia(10), STATUS: 'ATIVO' }],
  CAD_USUARIOS: [{ ID: 'u_ges', NOME: 'GESTORA TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO' }, { ID: 'u_tec', NOME: 'TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO' }, { ID: 'u_cli', NOME: 'CLIENTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO' }]
});
const GESTOR = { userId: 'u_ges', usuario: 'gestora', nome: 'GESTORA TESTE', perfil: 'GESTOR' };
const TECNICO = { userId: 'u_tec', usuario: 'tecnico', nome: 'TECNICO TESTE', perfil: 'TECNICO' };
const col = (r, id) => Array.from(r.colunas.find((c) => c.id === id).itens);

test('Kanban: "Aberta" mostra avaria na devolução, multa em aberto e manutenção vencida, sem gravar nada', () => {
  const t = base();
  t.REG_FROTA_MOVIMENTACAO = [mov('m1', { CHECKLIST_CHEGADA_JSON: ck('riscado na garagem') }), mov('m2')];
  t.REG_FROTA_MULTA = [{ ID: 'mu1', VEICULO_ID: 'v1', DATA_INFRACAO: dia(-3), CONDUTOR_ID: 'c1', VALOR: 130.16, STATUS: 'ABERTA' }, { ID: 'mu2', VEICULO_ID: 'v1', DATA_INFRACAO: dia(-30), STATUS: 'PAGA' }];
  t.REG_FROTA_MANUTENCAO = [{ ID: 'ma1', VEICULO_ID: 'v2', TIPO: 'OLEO', DATA: dia(-200), KM: 1000, PROXIMA_KM: 4000, PROXIMA_DATA: dia(-10) }];
  const { ctx, tabelas } = ambiente(t, { atual: GESTOR });
  const r = ctx.Frota_apiGestaoKanban('s', {});
  const abertas = col(r, 'ABERTA');
  assert.deepEqual(abertas.map((i) => i.chave).sort(), ['AVARIA|m1', 'MANUTENCAO|ma1', 'MULTA|mu1']);
  assert.match(abertas.find((i) => i.tipo === 'AVARIA').detalhe, /Para-choque dianteiro \(riscado na garagem\)/);
  assert.equal(tabelas.REG_FROTA_CASO.length, 0);
});

test('Kanban: técnico não acessa; caso aberto vai para Em análise e repetir não duplica; descartar tira de Aberta com o motivo', () => {
  const t = base();
  t.REG_FROTA_MOVIMENTACAO = [mov('m1', { CHECKLIST_CHEGADA_JSON: ck('amassado') })];
  t.REG_FROTA_MULTA = [{ ID: 'mu1', VEICULO_ID: 'v1', DATA_INFRACAO: dia(-3), CONDUTOR_ID: 'c1', VALOR: 88.38, STATUS: 'ABERTA' }];
  const sessao = { atual: TECNICO };
  const { ctx, tabelas } = ambiente(t, sessao);
  assert.throws(() => ctx.Frota_apiGestaoKanban('s', {}), /da gestão/);
  sessao.atual = GESTOR;
  const a = ctx.Frota_apiGestaoAbrirCaso('s', { chave: 'AVARIA|m1' });
  assert.match(a.codigo, /^FC-\d{4}-001$/);
  const b = ctx.Frota_apiGestaoAbrirCaso('s', { chave: 'AVARIA|m1' });
  assert.equal(b.jaExistia, true);
  assert.equal(tabelas.REG_FROTA_CASO.length, 1);
  assert.throws(() => ctx.Frota_apiGestaoDescartar('s', { chave: 'MULTA|mu1', motivo: 'curto' }), /pelo menos 10/);
  ctx.Frota_apiGestaoDescartar('s', { chave: 'MULTA|mu1', motivo: 'multa contestada pelo cliente, sem custo' });
  const r = ctx.Frota_apiGestaoKanban('s', {});
  assert.equal(col(r, 'ABERTA').length, 0);
  assert.equal(col(r, 'ANALISE').length, 1);
  assert.equal(r.descartados, 1);
  assert.equal(tabelas.REG_FROTA_CASO.find((c) => c.ORIGEM_CHAVE === 'MULTA|mu1').CANCELADO_MOTIVO, 'multa contestada pelo cliente, sem custo');
});

test('Caso recorrente (2 avarias com o mesmo condutor) só conclui depois dos 5 Porquês', () => {
  const t = base();
  t.REG_FROTA_MOVIMENTACAO = [mov('m1', { CHECKLIST_CHEGADA_JSON: ck('amassado') }), mov('m2', { DATA_SAIDA: dia(-40), DATA_CHEGADA: dia(-40), CHECKLIST_CHEGADA_JSON: ck('riscado') })];
  const { ctx } = ambiente(t, { atual: GESTOR });
  const r0 = ctx.Frota_apiGestaoKanban('s', {});
  assert.match(col(r0, 'ABERTA')[0].recorrente, /2 avarias .* CONDUTOR UM/);
  const { id } = ctx.Frota_apiGestaoAbrirCaso('s', { chave: 'AVARIA|m1' });
  assert.throws(() => ctx.Frota_apiGestaoConcluir('s', { id, resolucao: 'conserto feito na oficina' }), /recorrente.*5 Porquês/);
  assert.throws(() => ctx.Frota_apiGestaoSalvarAnalise('s', { id, porques: ['manobra apertada'], causaRaiz: 'vaga estreita na garagem' }), /pelo menos 3/);
  ctx.Frota_apiGestaoSalvarAnalise('s', { id, porques: ['bateu ao manobrar', 'vaga estreita', 'garagem sem sensor'], causaRaiz: 'vaga estreita sem sensor de ré' });
  const c = ctx.Frota_apiGestaoConcluir('s', { id, resolucao: 'conserto feito; vaga demarcada', padronizacao: 'item novo no checklist: conferir para-choque' });
  assert.match(c.mensagem, /concluído/);
});

test('Plano 5W2H: ação vira atividade do módulo frota; concluir espera as ações; não resolveu volta para análise (ciclo 2)', () => {
  const t = base();
  t.REG_FROTA_MULTA = [{ ID: 'mu1', VEICULO_ID: 'v1', DATA_INFRACAO: dia(-3), CONDUTOR_ID: 'c1', VALOR: 195.23, STATUS: 'ABERTA' }];
  const { ctx, tabelas, atividades } = ambiente(t, { atual: GESTOR });
  const { id } = ctx.Frota_apiGestaoAbrirCaso('s', { chave: 'MULTA|mu1' });
  assert.throws(() => ctx.Frota_apiGestaoCriarPlano('s', { id, oQue: 'treinamento de direção', porQue: 'excesso de velocidade', como: 'curso de 2 horas com o condutor', quando: dia(-1), quemId: 'u_tec' }), /passado/);
  assert.throws(() => ctx.Frota_apiGestaoCriarPlano('s', { id, oQue: 'treinamento de direção', porQue: 'excesso de velocidade', como: 'curso de 2 horas com o condutor', quando: dia(5), quemId: 'u_cli' }), /responsável/);
  ctx.Frota_apiGestaoCriarPlano('s', { id, oQue: 'treinamento de direção', porQue: 'excesso de velocidade', como: 'curso de 2 horas com o condutor', quando: iso(dia(5)), quemId: 'u_tec' });
  assert.equal(atividades.length, 1);
  assert.equal(atividades[0].MODULO, 'frota');
  assert.match(atividades[0].TITULO, /^FC-\d{4}-001 \(TST1A11\): treinamento/);
  assert.equal(atividades[0].POR_QUE, 'excesso de velocidade');
  assert.equal(tabelas.REG_FROTA_CASO[0].ETAPA, 'EXECUCAO');
  assert.equal(tabelas.REG_FROTA_CASO[0].QUANDO, dia(5));
  assert.throws(() => ctx.Frota_apiGestaoConcluir('s', { id, verificacao: 'conferido em 30 dias, sem nova multa', eficaz: 'SIM' }), /ação em aberto/);
  atividades[0].SITUACAO = 'Concluída';
  assert.throws(() => ctx.Frota_apiGestaoConcluir('s', { id, verificacao: 'curto', eficaz: 'SIM' }), /pelo menos 15/);
  const nao = ctx.Frota_apiGestaoConcluir('s', { id, verificacao: 'nova multa no mesmo trecho depois do curso', eficaz: 'NAO' });
  assert.match(nao.mensagem, /ciclo 2/);
  assert.equal(tabelas.REG_FROTA_CASO[0].ETAPA, 'ANALISE');
  ctx.Frota_apiGestaoAdicionarAcao('s', { id, oQue: 'instalar alerta de velocidade', quando: dia(3), quemId: 'u_ges' });
  atividades[1].SITUACAO = 'Concluída';
  const sim = ctx.Frota_apiGestaoConcluir('s', { id, verificacao: '60 dias sem multa depois do alerta instalado', eficaz: 'SIM' });
  assert.match(sim.mensagem, /concluído/);
  const r = ctx.Frota_apiGestaoKanban('s', {});
  assert.equal(col(r, 'CONCLUIDA').length, 1);
});

test('Indicadores: custo por km, disponibilidade, preventiva no prazo, avarias e multas por condutor', () => {
  const t = base();
  t.REG_FROTA_MOVIMENTACAO = [mov('m1', { KM_SAIDA: 1000, KM_CHEGADA: 1400, CHECKLIST_CHEGADA_JSON: ck('riscado') }), mov('m2', { VEICULO_ID: 'v2', KM_SAIDA: 5000, KM_CHEGADA: 5100 })];
  t.REG_FROTA_ABASTECIMENTO = [{ ID: 'a1', VEICULO_ID: 'v1', DATA: dia(-4), KM: 1100, LITROS: 40, VALOR: 240 }];
  t.REG_FROTA_MANUTENCAO = [
    { ID: 'ma1', VEICULO_ID: 'v1', TIPO: 'OLEO', DATA: dia(-300), KM: 500, PROXIMA_DATA: dia(-20), PROXIMA_KM: 10500, CUSTO: 0 },
    { ID: 'ma2', VEICULO_ID: 'v1', TIPO: 'OLEO', DATA: dia(-10), KM: 1300, PROXIMA_DATA: dia(170), PROXIMA_KM: 11300, CUSTO: 160 }
  ];
  t.REG_FROTA_PARADA = [{ ID: 'p1', VEICULO_ID: 'v2', DATA_INICIO: dia(-29), DATA_FIM: dia(-20), MOTIVO: 'oficina' }];
  t.REG_FROTA_MULTA = [{ ID: 'mu1', VEICULO_ID: 'v1', DATA_INFRACAO: dia(-3), CONDUTOR_ID: 'c1', VALOR: 130.16, PONTOS: 4, STATUS: 'ABERTA' }];
  const { ctx } = ambiente(t, { atual: GESTOR });
  const r = ctx.Frota_apiGestaoIndicadores('s', { dias: 30 });
  const v1 = r.veiculos.find((v) => v.placa === 'TST1A11'), v2 = r.veiculos.find((v) => v.placa === 'TST2B22');
  assert.equal(v1.kmRodado, 400);
  assert.equal(Math.round(v1.custoPorKm * 100) / 100, 1); // (240 + 160) / 400
  assert.equal(v1.preventivasFeitas, 1);
  assert.equal(v1.preventivasNoPrazoPct, 0); // feita depois da data prevista
  assert.equal(v1.avarias, 1);
  assert.ok(v2.disponibilidadePct < 75 && v2.disponibilidadePct > 60, String(v2.disponibilidadePct));
  const c1 = Array.from(r.condutores).find((c) => c.nome === 'CONDUTOR UM');
  assert.equal(c1.multas, 1); assert.equal(c1.pontos, 4); assert.equal(c1.avarias, 1);
  assert.equal(r.frota.kmRodado, 500);
});

test('Editar condutor: grava a validade nova, campo vazio mantém; equipe não recebe telefone nem CNH dos colegas', () => {
  const sessao = { atual: GESTOR };
  const { ctx, tabelas } = ambiente(base(), sessao);
  assert.throws(() => ctx.Frota_apiAtualizarCondutor('s', { id: 'c1', cnhValidade: '31/02/2031' }), /inválida/);
  const r = ctx.Frota_apiAtualizarCondutor('s', { id: 'c1', cnhValidade: '15/03/2031', telefone: '', cnh: '' });
  assert.match(r.mensagem, /atualizado/);
  assert.equal(tabelas.CAD_CONDUTORES[0].CNH_VALIDADE, '15/03/2031');
  assert.equal(tabelas.CAD_CONDUTORES[0].TELEFONE, '11999990000');
  assert.equal(ctx.Frota_apiAtualizarCondutor('s', { id: 'c1', cnhValidade: '15/03/2031' }).semMudanca, true);
  assert.ok(tabelas.REG_FROTA_AUDITORIA.some((a) => a.ACAO === 'CONDUTOR_ATUALIZADO'));
  sessao.atual = TECNICO;
  const lista = ctx.Frota_apiListarCondutoresTodos('s').items;
  assert.equal(lista[0].TELEFONE, undefined); assert.equal(lista[0].CNH, undefined); assert.equal(lista[0].NOME, 'CONDUTOR UM');
  assert.throws(() => ctx.Frota_apiAtualizarCondutor('s', { id: 'c1', cnhValidade: '15/03/2032' }), /Gestor/);
});

test('Central de avisos: avaria sem caso e multa perto do vencimento viram pendência da gestão; com caso aberto a avaria some', () => {
  const t = base();
  t.REG_FROTA_MOVIMENTACAO = [mov('m1', { CHECKLIST_CHEGADA_JSON: ck('amassado') })];
  t.REG_FROTA_MULTA = [{ ID: 'mu1', VEICULO_ID: 'v1', DATA_INFRACAO: dia(-3), VENCIMENTO: dia(5), CONDUTOR_ID: 'c1', VALOR: 88.38, STATUS: 'ABERTA' }];
  const { ctx } = ambiente(t, { atual: GESTOR });
  ctx.Pend_item_ = (tipo, o) => Object.assign({ tipo }, o);
  const itens = []; ctx.Frota_gestaoPendencias_((i) => itens.push(i));
  assert.deepEqual(itens.map((i) => i.tipo).sort(), ['frota_avaria', 'multa_vencendo']);
  ctx.Frota_apiGestaoAbrirCaso('s', { chave: 'AVARIA|m1' });
  const itens2 = []; ctx.Frota_gestaoPendencias_((i) => itens2.push(i));
  assert.deepEqual(itens2.map((i) => i.tipo), ['multa_vencendo']);
});
