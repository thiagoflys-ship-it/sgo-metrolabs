// Frota, leva 2 (30/10/2026, pedido do dono: "o motorista não pode esquecer de inserir o abastecimento [...] autorizado faça
// essas mudanças com o especialista"): "Abasteci" do condutor, despesas com comprovante, conferência de gastos, extrato do
// pedágio, KM sugerido pelo rastreador, checklist da retirada, agendar parada a partir do plano, relatório mensal e leitura
// da nota por IA (sem a chave, nada quebra). Código real do SGO+ num contexto isolado, só com dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n');

const DIA = 86400000;
const br = (ms) => { const d = new Date(ms - 3 * 3600000); return ('0' + d.getUTCDate()).slice(-2) + '/' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '/' + d.getUTCFullYear(); };
const hora = (ms) => { const d = new Date(ms - 3 * 3600000); return ('0' + d.getUTCHours()).slice(-2) + ':' + ('0' + d.getUTCMinutes()).slice(-2); };
const hoje = () => br(Date.now());
const SESSOES = {
  sG: { userId: 'uG', usuario: 'gestora', nome: 'GESTORA TESTE', perfil: 'GESTOR' },
  sA: { userId: 'uA', usuario: 'ana', nome: 'CONDUTORA ANA', perfil: 'TECNICO' },
  sB: { userId: 'uB', usuario: 'bruno', nome: 'CONDUTOR BRUNO', perfil: 'TECNICO' }
};

function ambiente(o) {
  o = o || {};
  const tabelas = Object.assign({
    CAD_VEICULOS: [{ ID: 'v1', PLACA: 'TST1A11', MODELO: 'Hatch teste', KM_ATUAL: 197000, STATUS: 'ATIVO', CAPACIDADE_TANQUE_L: 54 },
      { ID: 'v2', PLACA: 'TST2B22', MODELO: 'Picape teste', KM_ATUAL: 189000, STATUS: 'ATIVO', CAPACIDADE_TANQUE_L: 50 }],
    CAD_CONDUTORES: [{ ID: 'cA', NOME: 'CONDUTORA ANA', USUARIO_ID: 'uA', STATUS: 'ATIVO' }, { ID: 'cB', NOME: 'CONDUTOR BRUNO', USUARIO_ID: 'uB', STATUS: 'ATIVO' },
      { ID: 'cG', NOME: 'GESTORA TESTE', USUARIO_ID: 'uG', STATUS: 'ATIVO' }],
    CAD_USUARIOS: [{ ID: 'uG', NOME: 'GESTORA TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO' }, { ID: 'uA', NOME: 'CONDUTORA ANA', PERFIL: 'TECNICO', STATUS: 'ATIVO' }, { ID: 'uB', NOME: 'CONDUTOR BRUNO', PERFIL: 'TECNICO', STATUS: 'ATIVO' }],
    REG_FROTA_MOVIMENTACAO: [], REG_FROTA_AUDITORIA: [], REG_FROTA_ABASTECIMENTO: [], REG_FROTA_MANUTENCAO: [], REG_FROTA_DESPESA: [], REG_FROTA_PARADA: [],
    REG_FROTA_DOCUMENTO: [], REG_FROTA_MULTA: [], REG_FROTA_PEDIDO_COMPROVANTE: [], REG_FROTA_PLANO_MANUTENCAO: [], REG_FROTA_RESERVA: [], REG_FROTA_RESERVA_EVENTO: [], REG_FROTA_RESERVA_AVISO: []
  }, o.tabelas || {});
  let seq = 0;
  const props = Object.assign({}, o.props || {});
  const atividades = [], notificacoes = [], uploads = [], fetches = [];
  const ctx = vm.createContext({
    console, Utilities: criarUtilities(), Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, getProperties: () => props, deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, hasLock: () => false, tryLock: () => true }) },
    SpreadsheetApp: { flush() {} },
    UrlFetchApp: { fetch: (url, op) => { fetches.push({ url, op }); if (o.fetch) return o.fetch(url, op); throw new Error('rede proibida no teste'); } },
    CertCal_garantirTabela_: (t) => { tabelas[t] = tabelas[t] || []; }, CertCal_garantirColuna_() {}, CertCal_forcarColunaTexto_() {},
    SGO_DATA: {
      getDB: () => ({ getSheetByName: (n) => (tabelas[n] ? {} : null) }),
      getAll: (t) => (tabelas[t] || []).map((r) => Object.assign({}, r)),
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) return false; Object.assign(r, d); return true; },
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq), CRIADO_EM: new Date().toISOString() }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
      insertMany: (t, l) => l.forEach((d) => ctx.SGO_DATA.insert(t, d)),
      deleteById: () => { throw new Error('apagar é proibido'); },
      gerarRegistroBase: (x) => Object.assign({ ID: 'g' + (++seq), CRIADO_EM: new Date().toISOString() }, x),
      normalizarObjetoParaSheet: (t, x) => x,
      log() {}
    },
    SGO_CFG: { SHEETS: { CAD_VEICULOS: 'CAD_VEICULOS', CAD_CONDUTORES: 'CAD_CONDUTORES', CAD_USUARIOS: 'CAD_USUARIOS', REG_FROTA_MOVIMENTACAO: 'REG_FROTA_MOVIMENTACAO',
      REG_FROTA_ABASTECIMENTO: 'REG_FROTA_ABASTECIMENTO', REG_FROTA_MANUTENCAO: 'REG_FROTA_MANUTENCAO', REG_FROTA_DESPESA: 'REG_FROTA_DESPESA', REG_FROTA_PARADA: 'REG_FROTA_PARADA',
      REG_FROTA_DOCUMENTO: 'REG_FROTA_DOCUMENTO', REG_FROTA_MULTA: 'REG_FROTA_MULTA' } },
    exigirSessao: (sid) => { const s = SESSOES[sid]; if (!s) throw new Error('sessão inválida'); return s; },
    isAdminSession: (sid) => ['ADMIN', 'GESTOR', 'DIRETORIA'].indexOf((SESSOES[sid] || {}).perfil) >= 0,
    SGO_notificar_: (x) => { notificacoes.push(x); return { ok: 1, erro: 0, pulado: 0 }; },
    Atividades_apiCriar: (sid, p) => { const a = Object.assign({ ID: 'atv' + (++seq), SITUACAO: 'A fazer', criadaPor: sid }, p); atividades.push(a); return { ok: true, item: a }; },
    Atividades_apiMudarSituacao: (sid, p) => { const a = atividades.find((x) => x.ID === p.id); if (a) a.SITUACAO = p.situacao; return { ok: true }; }
  });
  for (const f of ['SGO_Utilis.js', 'SGO_Frota_Config.js', 'SGO_Frota_Main.js', 'SGO_Frota_Rastreador.js', 'SGO_Frota_Rastreamento.js', 'SGO_Expediente.js', 'SGO_Alertas_Central.js',
    'SGO_Frota_Reservas.js', 'SGO_Frota_Abastecimento.js', 'SGO_Frota_PlanoManutencao.js', 'SGO_Frota_Gastos.js', 'SGO_Frota_Checklist.js', 'SGO_Frota_Paradas.js',
    'SGO_DocA4.js', 'SGO_Documentos_RelatorioA4.js', 'SGO_Frota_Relatorio.js', 'SGO_Frota_RelatorioMensal.js']) {
    vm.runInContext(ler(f), ctx);
  }
  ctx.Frota_uploadFoto_ = (placa, b64, mime, nome) => { uploads.push({ placa, mime, nome }); return '/arquivos/' + nome + '-' + uploads.length; };
  return { ctx, tabelas, props, atividades, notificacoes, uploads, fetches };
}

const ck = (extra) => [{ grupo: 'Frente', item: 'Faróis', ok: true, observacao: '' }].concat(extra || []);
const fotos = { fotosSalvas: [{ link: '/arquivos/foto', legenda: 'frente' }], fotosPainelSalvas: [{ link: '/arquivos/painel', legenda: 'Painel' }] };
const retirar = (ctx, sid, vid, km, extra) => ctx.Frota_apiIniciarViagem(sid, Object.assign({ veiculoId: vid, kmSaida: String(km), checklist: ck() }, fotos, extra || {}));
const devolver = (ctx, sid, movId, km, extra) => ctx.Frota_apiFinalizarViagem(sid, Object.assign({ movimentacaoId: movId, kmChegada: String(km), checklist: ck() }, fotos, extra || {}));
const nota = { base64: 'eA==', mimeType: 'image/jpeg', nomeArquivo: 'nota.jpg' };

test('"Abasteci": sem retirada aberta o condutor recebe o que fazer; com retirada, "35.591" grava 35,591 L ligado à retirada', () => {
  const { ctx, tabelas } = ambiente();
  assert.throws(() => ctx.Frota_apiAbasteci('sA', Object.assign({ km: '197050', litros: '35.591', valor: '125,99', tipoCombustivel: 'Etanol' }, nota)), /não está com nenhum veículo retirado[\s\S]*gestão[\s\S]*Nada foi gravado/);
  const ctxA = ctx.Frota_apiGastoContexto('sA');
  assert.match(ctxA.semRetirada, /avise a gestão/);
  const m = retirar(ctx, 'sA', 'v1', 197000);
  // sem a foto da nota: recusa
  assert.throws(() => ctx.Frota_apiAbasteci('sA', { km: '197050', litros: '35,591', valor: '125,99', tipoCombustivel: 'Etanol' }), /foto da nota[\s\S]*Nada foi gravado/);
  // litros sem a vírgula: passa do tanque e recusa (mesma conferência da leva 1)
  assert.throws(() => ctx.Frota_apiAbasteci('sA', Object.assign({ km: '197050', litros: '35591', valor: '125,99', tipoCombustivel: 'Etanol' }, nota)), /capacidade do tanque[\s\S]*Nada foi gravado/);
  // prévia: resumo, nada gravado
  const pr = ctx.Frota_apiAbasteciPrevia('sA', Object.assign({ km: '197050', litros: '35.591', valor: '125,99', tipoCombustivel: 'Etanol' }, nota));
  assert.equal(pr.erros.length, 0);
  assert.match(pr.resumo, /35,591 L de Etanol × R\$ 3,54 por litro = R\$ 125,99/);
  assert.equal(tabelas.REG_FROTA_ABASTECIMENTO.length, 0);
  const r = ctx.Frota_apiAbasteci('sA', Object.assign({ km: '197050', litros: '35.591', valor: '125,99', tipoCombustivel: 'Etanol', posto: 'POSTO TESTE', tanqueCheio: 'SIM' }, nota));
  assert.equal(r.ok, true);
  const a = tabelas.REG_FROTA_ABASTECIMENTO[0];
  assert.equal(a.LITROS, 35.591); assert.equal(a.ORIGEM, 'CONDUTOR_APP'); assert.equal(a.MOVIMENTACAO_ID, m.movimentacaoId); assert.equal(a.CONDUTOR_ID, 'cA');
  assert.equal(a.DATA, hoje()); assert.match(a.COMPROVANTE_LINK, /^\/arquivos\//); assert.equal(a.TANQUE_CHEIO, 'SIM');
  assert.ok(tabelas.REG_FROTA_AUDITORIA.some((x) => x.ACAO === 'ABASTECIMENTO_PELO_CONDUTOR'));
  // repetido: recusa
  assert.throws(() => ctx.Frota_apiAbasteci('sA', Object.assign({ km: '197050', litros: '35.591', valor: '125,99', tipoCombustivel: 'Etanol' }, nota)), /já está lançado/);
  // outro condutor não lança na retirada da Ana
  assert.throws(() => ctx.Frota_apiAbasteci('sB', Object.assign({ movimentacaoId: m.movimentacaoId, km: '197060', litros: '10', valor: '60', tipoCombustivel: 'Gasolina' }, nota)), /não está com nenhum veículo retirado/);
  // devolução: "Já lancei pelo Abasteci" vale (e o início mostra o lançamento na retirada)
  const ini = ctx.Frota_apiInicioFrota('sA');
  assert.equal(ini.emAndamento[0].abastNaRetirada.length, 1);
  const dv = devolver(ctx, 'sA', m.movimentacaoId, 197080, { abasteceu: 'JA_LANCADO' });
  assert.equal(dv.ok, true);
  assert.equal(tabelas.REG_FROTA_MOVIMENTACAO[0].ABASTECEU_NO_USO, 'JA_LANCADO');
  assert.equal(tabelas.REG_FROTA_ABASTECIMENTO.length, 1, 'nada lançado em dobro');
});

test('"Já lancei pelo Abasteci" sem lançamento na retirada é recusado (nada é gravado)', () => {
  const { ctx, tabelas } = ambiente();
  const m = retirar(ctx, 'sA', 'v1', 197000);
  assert.throws(() => devolver(ctx, 'sA', m.movimentacaoId, 197050, { abasteceu: 'JA_LANCADO' }), /Não há abastecimento lançado[\s\S]*Nada foi gravado/);
  assert.equal(tabelas.REG_FROTA_MOVIMENTACAO[0].STATUS, 'EM_ANDAMENTO');
});

test('KM sugerido pelo rastreador: variação do aparelho desde a saída; KM digitado longe dele vai "a conferir"', () => {
  const { ctx, tabelas } = ambiente({ props: { RASTREADOR_LIGADO: '1' } });
  tabelas.CAD_VEICULOS[0].RASTREADOR_DEVICE_ID = 'd1';
  const m = retirar(ctx, 'sA', 'v1', 197000);
  tabelas.REG_FROTA_MOVIMENTACAO[0].KM_RASTREADOR_SAIDA = 26000;
  ctx.Rastreador_posicoesGuardadas_ = () => ({ d1: { odometroKm: 26120, quandoMs: Date.now() - 60000, quandoTexto: hoje() + ' ' + hora(Date.now()) } });
  const s = ctx.FrotaGas_kmSugerido_(tabelas.CAD_VEICULOS[0], tabelas.REG_FROTA_MOVIMENTACAO[0]);
  assert.equal(s.km, 197120); assert.equal(s.rodado, 120);
  assert.match(s.texto, /cerca de 197\.120 km[\s\S]*vale o número do painel/);
  const ini = ctx.Frota_apiInicioFrota('sA');
  assert.equal(ini.emAndamento[0].kmSugerido.km, 197120);
  // perto do sugerido: sem apontamento
  ctx.Frota_apiAbasteci('sA', Object.assign({ km: '197115', litros: '20', valor: '120', tipoCombustivel: 'Gasolina' }, nota));
  assert.equal(tabelas.REG_FROTA_ABASTECIMENTO[0].SITUACAO_CONFERENCIA, 'PENDENTE');
  // longe: a conferir com o motivo
  const r = ctx.Frota_apiAbasteci('sA', Object.assign({ km: '197400', litros: '10', valor: '61', tipoCombustivel: 'Gasolina' }, nota));
  assert.equal(r.aConferir, true);
  assert.equal(tabelas.REG_FROTA_ABASTECIMENTO[1].SITUACAO_CONFERENCIA, 'A_CONFERIR');
  assert.match(tabelas.REG_FROTA_ABASTECIMENTO[1].APONTAMENTOS, /KM_RASTREADOR[\s\S]*rastreador indicava cerca de 197\.120/);
  // leitura velha (mais de 30 min) não sugere nada
  ctx.Rastreador_posicoesGuardadas_ = () => ({ d1: { odometroKm: 26120, quandoMs: Date.now() - 40 * 60000, quandoTexto: '' } });
  assert.equal(ctx.FrotaGas_kmSugerido_(tabelas.CAD_VEICULOS[0], tabelas.REG_FROTA_MOVIMENTACAO[0]), null);
  assert.equal(m.ok, true);
});

test('despesa com comprovante: condutor lança na retirada; valor alto e fora da retirada vão "a conferir"; repetida e sem descrição são recusadas', () => {
  const { ctx, tabelas } = ambiente();
  const m = retirar(ctx, 'sA', 'v1', 197000);
  assert.throws(() => ctx.Frota_apiDespesaLancar('sA', Object.assign({ tipo: 'PEDAGIO', valor: '12,50' }, {})), /foto da nota ou do recibo[\s\S]*Nada foi gravado/);
  assert.throws(() => ctx.Frota_apiDespesaLancar('sA', Object.assign({ tipo: 'COMBUSTIVEL', valor: '12,50' }, nota)), /Escolha o tipo da despesa[\s\S]*Abasteci/);
  const r = ctx.Frota_apiDespesaLancar('sA', Object.assign({ tipo: 'PEDAGIO', valor: '12,50', local: 'Praça Teste km 10', hora: hora(Date.now()) }, nota));
  assert.equal(r.ok, true);
  const d = tabelas.REG_FROTA_DESPESA[0];
  assert.equal(d.TIPO, 'Pedágio'); assert.equal(d.VALOR, 12.5); assert.equal(d.MOVIMENTACAO_ID, m.movimentacaoId); assert.equal(d.CONDUTOR_ID, 'cA'); assert.equal(d.ORIGEM, 'CONDUTOR');
  assert.equal(d.SITUACAO_CONFERENCIA, 'PENDENTE');
  assert.throws(() => ctx.Frota_apiDespesaLancar('sA', Object.assign({ tipo: 'PEDAGIO', valor: '12,50' }, nota)), /já está lançada/);
  assert.throws(() => ctx.Frota_apiDespesaLancar('sA', Object.assign({ tipo: 'PECAS_SERVICOS', valor: '80' }, nota)), /O que foi pago|mínimo de 5 caracteres/);
  ctx.Frota_apiDespesaLancar('sA', Object.assign({ tipo: 'ESTACIONAMENTO', valor: '180' }, nota));
  assert.equal(tabelas.REG_FROTA_DESPESA[1].SITUACAO_CONFERENCIA, 'A_CONFERIR');
  assert.match(tabelas.REG_FROTA_DESPESA[1].APONTAMENTOS, /acima do comum/);
  // valor impossível: recusa
  assert.throws(() => ctx.Frota_apiDespesaLancar('sA', Object.assign({ tipo: 'LAVAGEM', valor: '45000' }, nota)), /limite de uma despesa avulsa/);
  // gestão: pedágio sem retirada no dia vai a conferir
  ctx.Frota_apiDespesaLancar('sG', Object.assign({ veiculoId: 'v2', tipo: 'PEDAGIO', valor: '9,80', data: br(Date.now() - 2 * DIA) }, nota));
  const g = tabelas.REG_FROTA_DESPESA[2];
  assert.equal(g.ORIGEM, 'GESTAO'); assert.equal(g.SITUACAO_CONFERENCIA, 'A_CONFERIR'); assert.match(g.APONTAMENTOS, /SEM_RETIRADA/);
  // data futura: recusa
  assert.throws(() => ctx.Frota_apiDespesaLancar('sG', Object.assign({ veiculoId: 'v2', tipo: 'LAVAGEM', valor: '40', data: br(Date.now() + 3 * DIA) }, nota)), /no futuro/);
  // hora de hoje que ainda não chegou: recusa (só testável longe da meia-noite)
  if (br(Date.now() + 2 * 3600000) === hoje()) assert.throws(() => ctx.Frota_apiDespesaLancar('sA', Object.assign({ tipo: 'LAVAGEM', valor: '41', hora: hora(Date.now() + 2 * 3600000) }, nota)), /ainda não chegou/);
});

test('conferência de gastos: abastecimento, despesa e manutenção numa lista; totais por veículo e tipo, custo por km; divergente pede motivo, fica na trilha e sai do total; lote pula o que tem apontamento', () => {
  const ontem = br(Date.now() - DIA);
  const { ctx, tabelas } = ambiente({ tabelas: {
    REG_FROTA_MOVIMENTACAO: [{ ID: 'm1', VEICULO_ID: 'v1', CONDUTOR_ID: 'cA', DATA_SAIDA: ontem, HORA_SAIDA: '08:00', KM_SAIDA: 196800, DATA_CHEGADA: ontem, HORA_CHEGADA: '18:00', KM_CHEGADA: 197000, STATUS: 'FINALIZADO' }],
    REG_FROTA_ABASTECIMENTO: [{ ID: 'a1', VEICULO_ID: 'v1', CONDUTOR_ID: 'cA', DATA: ontem, KM: 196900, LITROS: 20, VALOR: 120, TIPO_COMBUSTIVEL: 'Gasolina', COMPROVANTE_LINK: '/arquivos/n1', SITUACAO_CONFERENCIA: 'PENDENTE' },
      { ID: 'a2', VEICULO_ID: 'v1', CONDUTOR_ID: 'cA', DATA: ontem, KM: 196950, LITROS: 5, VALOR: 40, TIPO_COMBUSTIVEL: 'Gasolina', COMPROVANTE_LINK: '/arquivos/n2', SITUACAO_CONFERENCIA: 'A_CONFERIR', APONTAMENTOS: JSON.stringify([{ tipo: 'PRECO', texto: 'Preço alto.' }]) }],
    REG_FROTA_DESPESA: [{ ID: 'd1', VEICULO_ID: 'v1', TIPO: 'Pedágio', DATA: ontem, VALOR: 10, COMPROVANTE_LINK: '/arquivos/e1', SITUACAO_CONFERENCIA: 'PENDENTE' },
      { ID: 'd0', VEICULO_ID: 'v1', TIPO: 'Estacionamento', DATA: ontem, VALOR: 5 /* registro antigo, sem comprovante nem situação */ }],
    REG_FROTA_MANUTENCAO: [{ ID: 'mt1', VEICULO_ID: 'v1', TIPO: 'OLEO', DATA: ontem, KM: 196990, CUSTO: 30, OFICINA: 'Oficina teste' }, { ID: 'mtx', VEICULO_ID: 'v1', TIPO: 'OLEO', DATA: ontem, CUSTO: 3500, EXCLUIDO_EM: '2026-10-30T10:00:00Z' }]
  } });
  assert.throws(() => ctx.Frota_apiGastosListar('sA', { dataInicio: ontem, dataFim: hoje() }), /gestão/);
  const l = ctx.Frota_apiGastosListar('sG', { dataInicio: ontem, dataFim: hoje() });
  assert.equal(l.linhas.length, 5, 'manutenção excluída fica de fora');
  assert.deepEqual(Array.from(new Set(l.linhas.map((x) => x.origem))).sort(), ['ABASTECIMENTO', 'DESPESA', 'MANUTENCAO']);
  assert.equal(l.totais.geral, 205);
  assert.equal(l.totais.km, 200);
  assert.ok(Math.abs(l.totais.custoKm - 1.025) < 0.006, 'custo por km 205/200');
  const v1 = l.totais.porVeiculo[0];
  assert.equal(v1.categorias.COMBUSTIVEL, 160); assert.equal(v1.categorias.OFICINA, 30); assert.equal(v1.categorias.PEDAGIO, 10); assert.equal(v1.kmL, 8);
  assert.equal(l.linhas.find((x) => x.id === 'd0').situacao, 'PENDENTE');
  assert.doesNotThrow(() => JSON.stringify(l));
  assert.ok(l.linhas.every((x) => typeof x.data === 'string' && !(x.ms instanceof Date)), 'sem Date cru no retorno');
  // filtro por tipo
  assert.equal(ctx.Frota_apiGastosListar('sG', { dataInicio: ontem, dataFim: hoje(), categoria: 'COMBUSTIVEL' }).linhas.length, 2);
  // divergente: motivo obrigatório
  assert.throws(() => ctx.Frota_apiGastosConferir('sG', { itens: [{ origem: 'DESPESA', id: 'd1' }], situacao: 'DIVERGENTE', motivo: 'curto' }), /mínimo de 15/);
  ctx.Frota_apiGastosConferir('sG', { itens: [{ origem: 'DESPESA', id: 'd1' }], situacao: 'DIVERGENTE', motivo: 'passagem não é desta retirada' });
  const d1 = tabelas.REG_FROTA_DESPESA.find((x) => x.ID === 'd1');
  assert.equal(d1.SITUACAO_CONFERENCIA, 'DIVERGENTE'); assert.equal(d1.CONFERIDO_POR, 'GESTORA TESTE'); assert.match(d1.CONFERENCIA_MOTIVO, /não é desta retirada/);
  const t = tabelas.REG_FROTA_AUDITORIA.find((x) => x.ACAO === 'GASTO_DIVERGENTE');
  assert.equal(t.VALOR_ANTES, 'PENDENTE'); assert.equal(t.VALOR_DEPOIS, 'DIVERGENTE');
  assert.equal(ctx.Frota_apiGastosListar('sG', { dataInicio: ontem, dataFim: hoje() }).totais.geral, 195, 'divergente sai do total');
  // lote: só pendente, sem apontamento e com comprovante (a1 e mt1 sem nota: só a1)
  const lote = ctx.Frota_apiGastosConferir('sG', { itens: [{ origem: 'ABASTECIMENTO', id: 'a1' }, { origem: 'ABASTECIMENTO', id: 'a2' }, { origem: 'MANUTENCAO', id: 'mt1' }, { origem: 'DESPESA', id: 'd0' }], situacao: 'CONFERIDO', lote: true });
  assert.equal(lote.marcados, 1); assert.equal(lote.pulados, 3);
  assert.equal(tabelas.REG_FROTA_ABASTECIMENTO[0].SITUACAO_CONFERENCIA, 'CONFERIDO');
  assert.equal(tabelas.REG_FROTA_ABASTECIMENTO[1].SITUACAO_CONFERENCIA, 'A_CONFERIR');
  // voltar a conferir pede motivo; a conferência antiga (leva 1) continua igual
  assert.throws(() => ctx.Frota_apiGastosConferir('sG', { itens: [{ origem: 'ABASTECIMENTO', id: 'a1' }], situacao: 'A_CONFERIR', motivo: '' }), /voltar o lançamento/);
  const r1 = ctx.Frota_apiAbastConferir('sG', { id: 'a2', situacao: 'CONFERIDO' });
  assert.match(r1.mensagem, /1 lançamento marcado como conferido/);
  assert.ok(tabelas.REG_FROTA_AUDITORIA.some((x) => x.ACAO === 'ABASTECIMENTO_CONFERIDO'));
  assert.throws(() => ctx.Frota_apiAbastConferir('sG', { id: 'a2', situacao: 'DIVERGENTE', motivo: 'x' }), /mínimo de 15/);
});

test('extrato do pedágio (CSV do portal): casa placa e hora com a retirada, sem retirada vai "a conferir", estorno e placa de fora não entram, reimportar não duplica', () => {
  const ontem = br(Date.now() - DIA);
  const { ctx, tabelas, uploads } = ambiente({ tabelas: {
    REG_FROTA_MOVIMENTACAO: [{ ID: 'm1', VEICULO_ID: 'v1', CONDUTOR_ID: 'cB', DATA_SAIDA: ontem, HORA_SAIDA: '08:00', KM_SAIDA: 196800, DATA_CHEGADA: ontem, HORA_CHEGADA: '12:00', KM_CHEGADA: 197000, STATUS: 'FINALIZADO' }] } });
  const csv = 'Extrato de passagens\nPlaca;Data/Hora;Praça;Categoria;Valor (R$)\n' +
    'TST-1A11;' + ontem + ' 09:15:00;Praça Teste Norte;Pedágio;R$ 8,90\n' +
    'tst1a11;' + ontem + ' 15:40;Praça Teste Sul;Pedágio;12,30\n' +
    'TST1A11;' + ontem + ' 10:05;Estacionamento Shopping Teste;Estacionamento;15,00\n' +
    'TST1A11;' + ontem + ' 10:30;Praça Teste Norte;Estorno;-8,90\n' +
    'XYZ9Z99;' + ontem + ' 10:30;Praça Teste Norte;Pedágio;8,90\n' +
    ';;;Total;37,20\n';
  assert.throws(() => ctx.Frota_apiExtratoTagImportar('sA', { texto: csv }), /gestão/);
  const p = ctx.Frota_apiExtratoTagImportar('sG', { texto: csv, nomeArquivo: 'extrato.csv' });
  assert.equal(p.previa, true);
  assert.equal(p.contagem.NOVA, 2); assert.equal(p.contagem.SEM_RETIRADA, 1); assert.equal(p.contagem.SEM_VEICULO, 1);
  assert.ok(p.ignoradas.some((x) => /estorno/.test(x.motivo)));
  assert.equal(tabelas.REG_FROTA_DESPESA.length, 0, 'prévia não grava');
  assert.throws(() => ctx.Frota_apiExtratoTagImportar('sG', { texto: csv, nomeArquivo: 'extrato.csv', confirmar: true }), /Envie o arquivo do extrato/);
  const g = ctx.Frota_apiExtratoTagImportar('sG', { texto: csv, nomeArquivo: 'extrato.csv', base64: 'eA==', mimeType: 'text/csv', confirmar: true });
  assert.equal(g.gravadas, 3);
  assert.equal(uploads.length, 1, 'o arquivo é guardado uma vez, como comprovante de todas as linhas');
  const d = tabelas.REG_FROTA_DESPESA;
  const norte = d.find((x) => x.LOCAL === 'Praça Teste Norte');
  assert.equal(norte.TIPO, 'Pedágio'); assert.equal(norte.VALOR, 8.9); assert.equal(norte.HORA, '09:15'); assert.equal(norte.CONDUTOR_ID, 'cB'); assert.equal(norte.MOVIMENTACAO_ID, 'm1'); assert.equal(norte.ORIGEM, 'EXTRATO_TAG');
  assert.equal(d.find((x) => /Shopping/.test(x.LOCAL)).TIPO, 'Estacionamento');
  const sul = d.find((x) => x.LOCAL === 'Praça Teste Sul');
  assert.equal(sul.SITUACAO_CONFERENCIA, 'A_CONFERIR'); assert.match(sul.APONTAMENTOS, /sem retirada registrada/);
  const de2 = ctx.Frota_apiExtratoTagImportar('sG', { texto: csv, nomeArquivo: 'extrato.csv', base64: 'eA==', confirmar: true });
  assert.equal(de2.gravadas, 0); assert.equal(tabelas.REG_FROTA_DESPESA.length, 3);
  assert.match(de2.mensagem, /3 já importadas antes/);
  // aparece na conferência como pedágio
  assert.equal(ctx.Frota_apiGastosListar('sG', { dataInicio: ontem, dataFim: hoje(), categoria: 'PEDAGIO' }).linhas.length, 2);
  // arquivo sem as colunas: o que fazer
  assert.throws(() => ctx.Frota_apiExtratoTagImportar('sG', { texto: 'a;b;c\n1;2;3' }), /cabeçalho com as colunas da placa, da data e do valor/);
});

test('leitor do extrato: data e hora separadas, aaaa-mm-dd e número de série do Excel; CSV com vírgula e aspas', () => {
  const { ctx } = ambiente();
  const m = ctx.FrotaGas_lerCsv_('"Placa","Data","Hora","Local","Valor"\n"TST1A11","2026-10-29","07:05","Praça ""A""","8.90"\n');
  const r = ctx.FrotaGas_lerExtrato_(m);
  assert.equal(r.linhas[0].data, '29/10/2026'); assert.equal(r.linhas[0].hora, '07:05'); assert.equal(r.linhas[0].local, 'Praça "A"'); assert.equal(r.linhas[0].valor, 8.9);
  const serial = ctx.FrotaGas_dataHoraCelula_(46324.5);
  assert.equal(serial.data, '29/10/2026'); assert.equal(serial.hora, '12:00');
});

test('agendar parada a partir do plano: veículo bloqueado no período, atividade na agenda, concluir registra a manutenção com nota e zera o item', () => {
  const { ctx, tabelas, atividades } = ambiente({ tabelas: { REG_FROTA_MANUTENCAO: [{ ID: 'mo', VEICULO_ID: 'v1', TIPO: 'OLEO', DATA: br(Date.now() - 30 * DIA), KM: 191800, CUSTO: 285 }] } });
  let it = ctx.FrotaPlano_doVeiculo_(tabelas.CAD_VEICULOS[0]).find((i) => i.codigo === 'OLEO');
  assert.equal(it.situacao, 'VENCIDO');
  const amanha = br(Date.now() + DIA);
  assert.throws(() => ctx.Frota_apiParadaAgendar('sA', { veiculoId: 'v1', itens: ['OLEO'], dataInicio: amanha, oficina: 'Oficina teste' }), /gestão/);
  assert.throws(() => ctx.Frota_apiParadaAgendar('sG', { veiculoId: 'v1', itens: [], dataInicio: amanha, oficina: 'Oficina teste' }), /pelo menos um item/);
  assert.throws(() => ctx.Frota_apiParadaAgendar('sG', { veiculoId: 'v1', itens: ['OLEO'], dataInicio: amanha, oficina: '' }), /oficina/);
  const r = ctx.Frota_apiParadaAgendar('sG', { veiculoId: 'v1', itens: ['OLEO', 'FILTRO_AR'], dataInicio: amanha, horaInicio: '08:00', horaFim: '17:00', oficina: 'Oficina Centro Teste', responsavelId: 'uB' });
  assert.equal(r.ok, true, r.message);
  const res = tabelas.REG_FROTA_RESERVA[0];
  assert.equal(res.TIPO, 'MANUTENCAO'); assert.equal(res.SITUACAO, 'RESERVADA'); assert.equal(res.DATA_INICIO, amanha);
  assert.equal(atividades.length, 1); assert.equal(atividades[0].responsavelId, 'uB'); assert.match(atividades[0].inicioPrevisto, /^\d{4}-\d{2}-\d{2}T08:00$/);
  const lista = ctx.Frota_apiParadasListar('sG', {});
  assert.equal(lista.agendadas.length, 1); assert.deepEqual(Array.from(lista.agendadas[0].itens), ['OLEO', 'FILTRO_AR']);
  // retirada que passa do início da parada: recusada, com o que fazer
  const ret = retirar(ctx, 'sA', 'v1', 197000, { devolucaoPrevistaData: amanha, devolucaoPrevistaHora: '12:00' });
  assert.equal(ret.ok, false); assert.equal(ret.bloqueadoPorReserva, true); assert.match(ret.message, /manutenção programada[\s\S]*O que fazer/);
  // concluir: custo sem nota recusa
  const p = lista.agendadas[0];
  assert.throws(() => ctx.Frota_apiParadaConcluir('sG', { id: p.id, dataRealizada: hoje(), km: '197010', custo: '385,90' }), /anexe a nota fiscal/);
  assert.throws(() => ctx.Frota_apiParadaConcluir('sG', { id: p.id, dataRealizada: br(Date.now() + 2 * DIA), km: '197010' }), /no futuro/);
  const c = ctx.Frota_apiParadaConcluir('sG', Object.assign({ id: p.id, dataRealizada: hoje(), km: '197010', custo: '385,90', itensFeitos: ['OLEO', 'FILTRO_AR'] }, nota));
  assert.equal(c.ok, true);
  const novas = tabelas.REG_FROTA_MANUTENCAO.filter((x) => x.PARADA_ID === p.id);
  assert.equal(novas.length, 2); assert.equal(novas[0].TIPO, 'OLEO'); assert.equal(novas[0].CUSTO, 385.9); assert.equal(novas[1].CUSTO, 0); assert.match(novas[0].NOTA_LINK, /^\/arquivos\//);
  it = ctx.FrotaPlano_doVeiculo_(tabelas.CAD_VEICULOS[0]).find((i) => i.codigo === 'OLEO');
  assert.equal(it.situacao, 'OK'); assert.equal(it.proximaKm, 202010); assert.equal(it.ultimaOrigem, 'manutenção registrada');
  assert.equal(tabelas.REG_FROTA_RESERVA[0].SITUACAO, 'CONCLUIDA', 'o veículo volta a ficar livre');
  assert.equal(atividades[0].SITUACAO, 'Concluída');
  assert.match(c.mensagem, /próxima em 202\.010 km/);
  // entra na conferência como oficina e manutenção
  const l = ctx.Frota_apiGastosListar('sG', { dataInicio: hoje(), dataFim: hoje(), categoria: 'OFICINA' });
  assert.equal(l.linhas.length, 2); assert.equal(l.totais.geral, 385.9);
  assert.equal(retirar(ctx, 'sA', 'v1', 197010, { devolucaoPrevistaData: amanha, devolucaoPrevistaHora: '12:00' }).ok, true);
});

test('cancelar a parada: motivo obrigatório; manutenção programada e atividade canceladas; conflito de período é recusado com o que fazer', () => {
  const { ctx, tabelas, atividades } = ambiente();
  const amanha = br(Date.now() + DIA);
  ctx.Frota_apiParadaAgendar('sG', { veiculoId: 'v2', itens: ['FREIOS'], dataInicio: amanha, oficina: 'Oficina teste' });
  const dup = ctx.Frota_apiParadaAgendar('sG', { veiculoId: 'v2', itens: ['OLEO'], dataInicio: amanha, oficina: 'Outra oficina' });
  assert.equal(dup.ok, false); assert.match(dup.message, /não está livre[\s\S]*não foi agendada/);
  const p = ctx.Frota_apiParadasListar('sG', {}).agendadas[0];
  assert.throws(() => ctx.Frota_apiParadaCancelar('sG', { id: p.id, motivo: 'curto' }), /Justificativa obrigatória/);
  ctx.Frota_apiParadaCancelar('sG', { id: p.id, motivo: 'oficina remarcou para a semana que vem' });
  assert.equal(tabelas.REG_FROTA_RESERVA[0].SITUACAO, 'CANCELADA');
  assert.equal(atividades[0].SITUACAO, 'Cancelada');
  assert.equal(ctx.Frota_apiParadasListar('sG', {}).agendadas.length, 0);
});

test('checklist da retirada: grupo "Funcionamento" só na retirada; item com problema vira pendência da gestão, soma na reincidência e aparece na próxima retirada até resolver', () => {
  const { ctx, tabelas } = ambiente();
  const ini = ctx.Frota_apiInicioFrota('sA');
  assert.equal(ini.gruposChecklistRetirada[0].grupo, 'Funcionamento');
  assert.ok(ini.gruposChecklistRetirada[0].itens.includes('Nível do óleo do motor'));
  const prob = [{ grupo: 'Funcionamento', item: 'Nível do óleo do motor', ok: false, observacao: 'abaixo do mínimo na vareta' }];
  const m = retirar(ctx, 'sA', 'v1', 197000, { checklist: ck(prob) });
  assert.equal(m.ok, true);
  assert.match(m.avisoChecklist, /nível do óleo do motor[\s\S]*gestão foi avisada[\s\S]*não siga viagem/);
  const pend = tabelas.REG_FROTA_CHECKLIST_PENDENCIA;
  assert.equal(pend.length, 1); assert.equal(pend[0].SITUACAO, 'ABERTA'); assert.equal(pend[0].CONDUTOR_NOME, 'CONDUTORA ANA');
  const itens = [];
  ctx.FrotaChk_pendencias_((x) => itens.push(x));
  assert.equal(itens.length, 1); assert.equal(itens[0].tipo, 'frota_checklist'); assert.equal(itens[0].gravidade, 'CRITICO'); assert.match(itens[0].oQueFazer, /Resolver/);
  devolver(ctx, 'sA', m.movimentacaoId, 197050, { abasteceu: 'NAO' });
  // próxima retirada: o aviso aparece no início; a reincidência soma (merge do texto, nunca substitui)
  assert.equal(ctx.Frota_apiInicioFrota('sB').veiculos.find((v) => v.id === 'v1').pendChecklist[0].item, 'Nível do óleo do motor');
  retirar(ctx, 'sB', 'v1', 197050, { checklist: ck([{ grupo: 'Funcionamento', item: 'Nível do óleo do motor', ok: false, observacao: 'luz do óleo piscando' }]) });
  assert.equal(pend.length, 1); assert.equal(pend[0].OCORRENCIAS, 2);
  assert.match(pend[0].OBSERVACAO, /abaixo do mínimo na vareta \| [\s\S]*luz do óleo piscando/);
  assert.throws(() => ctx.Frota_apiChecklistResolver('sA', { id: pend[0].ID, resolucao: 'completado o óleo na oficina' }), /gestão/);
  assert.throws(() => ctx.Frota_apiChecklistResolver('sG', { id: pend[0].ID, resolucao: 'ok' }), /Justificativa obrigatória/);
  ctx.Frota_apiChecklistResolver('sG', { id: pend[0].ID, resolucao: 'completado o óleo na oficina; nível conferido' });
  assert.equal(pend[0].SITUACAO, 'RESOLVIDA');
  assert.ok(tabelas.REG_FROTA_AUDITORIA.some((x) => x.ACAO === 'CHECKLIST_RESOLVIDO'));
  assert.equal(ctx.Frota_apiChecklistPendencias('sG', {}).itens.length, 0);
});

test('relatório mensal A4: gastos por veículo e tipo, consumo, manutenções feitas e vencendo, lançamentos a conferir; sem a pasta, abre com o aviso', () => {
  const ontem = br(Date.now() - DIA);
  const { ctx } = ambiente({ tabelas: {
    REG_FROTA_MOVIMENTACAO: [{ ID: 'm1', VEICULO_ID: 'v1', CONDUTOR_ID: 'cA', DATA_SAIDA: ontem, HORA_SAIDA: '08:00', KM_SAIDA: 196800, DATA_CHEGADA: ontem, HORA_CHEGADA: '18:00', KM_CHEGADA: 197000, STATUS: 'FINALIZADO' }],
    REG_FROTA_ABASTECIMENTO: [{ ID: 'a1', VEICULO_ID: 'v1', DATA: ontem, KM: 196900, LITROS: 20, VALOR: 120, TIPO_COMBUSTIVEL: 'Gasolina', COMPROVANTE_LINK: '/arquivos/n1' },
      { ID: 'a2', VEICULO_ID: 'v1', DATA: ontem, KM: 196950, LITROS: 5, VALOR: 90, TIPO_COMBUSTIVEL: 'Gasolina', COMPROVANTE_LINK: '/arquivos/n2', SITUACAO_CONFERENCIA: 'A_CONFERIR', APONTAMENTOS: JSON.stringify([{ tipo: 'PRECO', texto: 'Preço por litro fora da faixa.' }]) }],
    REG_FROTA_MANUTENCAO: [{ ID: 'mt1', VEICULO_ID: 'v1', TIPO: 'OLEO', DATA: ontem, KM: 196990, CUSTO: 285, OFICINA: 'Oficina teste', NOTA_LINK: '/arquivos/nf' }]
  } });
  const l = new Date(Date.now() - DIA - 3 * 3600000);
  const comp = l.getUTCFullYear() + '-' + ('0' + (l.getUTCMonth() + 1)).slice(-2);
  const d = ctx.FrotaMes_dados_(comp);
  assert.equal(d.totais.geral, 495);
  assert.equal(d.conferir.length, 1);
  assert.equal(d.manutencoes.length, 1); assert.equal(d.manutencoes[0].nota, true);
  assert.ok(d.plano.some((i) => i.situacao === 'SEM_HISTORICO'), 'veículo 2 sem a última vez informada');
  const html = ctx.FrotaMes_html_(d, 'GESTORA TESTE');
  for (const s of ['Relatório mensal da frota', 'Resumo do mês', 'Gastos por tipo', 'Gastos e consumo por veículo', 'Feitas no mês', 'Plano de manutenção na emissão', 'Lançamentos a conferir', 'Preço por litro fora da faixa']) assert.ok(html.includes(s), s);
  const texto = html.replace(/data:[^"')]+/g, '').replace(/<[^>]+>/g, ' ').replace(/\u00a0|\u202f|&nbsp;/g, ' ');
  assert.match(texto, /R\$\s?495,00/);
  assert.doesNotMatch(texto, /undefined|NaN/);
  const r = ctx.Frota_apiRelatorioMensal('sG', { mes: comp });
  assert.equal(r.ok, true); assert.ok(r.html.length > 1000);
  assert.throws(() => ctx.Frota_apiRelatorioMensal('sA', { mes: comp }), /gestão/);
  assert.throws(() => ctx.Frota_apiRelatorioMensal('sG', { mes: 'outubro' }), /Escolha o mês/);
});

test('leitura da nota por IA: sem a chave nada quebra (mensagem clara); com a chave sugere os campos e a divergência confirmada vai "a conferir"', () => {
  const sem = ambiente();
  const r0 = sem.ctx.Frota_apiComprovanteLer('sA', { base64: 'eA==', mimeType: 'image/jpeg' });
  assert.equal(r0.ok, true); assert.equal(r0.disponivel, false); assert.match(r0.mensagem, /chave da IA não está configurada[\s\S]*funciona igual/);
  assert.equal(sem.fetches.length, 0);
  const resposta = { litros: 35.591, valor: 125.99, combustivel: 'ETANOL COMUM', posto: 'POSTO TESTE', data: hoje(), hora: '10:12', cnpj: '00.000.000/0001-00', legivel: true };
  const com = ambiente({ props: { GEMINI_API_KEY: 'chave-teste' }, fetch: () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(resposta) }] } }] }) }) });
  const r1 = com.ctx.Frota_apiComprovanteLer('sA', { base64: 'eA==', mimeType: 'image/jpeg' });
  assert.equal(r1.leitura.litros, 35.591); assert.equal(r1.leitura.combustivel, 'Etanol'); assert.match(r1.mensagem, /confira cada campo/);
  retirar(com.ctx, 'sA', 'v1', 197000);
  com.ctx.Frota_apiAbasteci('sA', Object.assign({ km: '197050', litros: '36', valor: '125,99', tipoCombustivel: 'Etanol', leituraIa: r1.leitura }, nota));
  const a = com.tabelas.REG_FROTA_ABASTECIMENTO[0];
  assert.equal(a.SITUACAO_CONFERENCIA, 'A_CONFERIR'); assert.match(a.APONTAMENTOS, /LEITURA_NOTA[\s\S]*35,591 L/);
  // falha do serviço: segue sem a sugestão
  const falha = ambiente({ props: { GEMINI_API_KEY: 'chave-teste' }, fetch: () => ({ getResponseCode: () => 500, getContentText: () => '' }) });
  const r2 = falha.ctx.Frota_apiComprovanteLer('sA', { base64: 'eA==', mimeType: 'image/jpeg' });
  assert.equal(r2.falhou, true); assert.match(r2.mensagem, /funciona igual/);
});

test('telas: conferência, paradas e checklist montam sem erro de sintaxe e vêm com a tela do rastreamento; o celular tem "Abasteci", despesa e "Já lancei"', () => {
  const c = vm.createContext({});
  vm.runInContext(ler('SGO_Frota_GastosTela.js'), c);
  const t = c.Frota_telaGastos_();
  assert.doesNotThrow(() => new Function(t.js));
  for (const fn of ['apiGastosListar', 'apiGastosConferir', 'apiDespesaLancar', 'apiExtratoTagImportar', 'apiParadaAgendar', 'apiParadaConcluir', 'apiChecklistResolver', 'apiRelatorioMensal']) assert.ok(t.js.includes(fn), fn);
  assert.match(ler('SGO_Frota_RastreamentoTela.js'), /Frota_telaGastos_\(\)/);
  assert.match(ler('SGO_Frota_AbastecimentoTela.js'), /data-frab-agp/);
  const core = ler('JS_Core.html');
  for (const s of ['apiAbasteci', 'apiDespesaLancar', 'apiComprovanteLer', 'JA_LANCADO', 'gruposChecklistRetirada', 'usarKmSug']) assert.ok(core.includes(s), s);
  const main = ler('SGO_Frota_Main.js');
  for (const s of ['apiAbasteci:', 'apiGastosListar:', 'apiExtratoTagImportar:', 'apiParadaAgendar:', 'apiRelatorioMensal:', 'apiChecklistResolver:']) assert.ok(main.includes(s), s);
});
