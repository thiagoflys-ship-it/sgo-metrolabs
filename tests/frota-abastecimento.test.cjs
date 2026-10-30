// Frota, abastecimento obrigatório e plano de manutenção (30/10/2026, pedido do dono: "o motorista não pode esquecer de
// inserir o abastecimento"): leitura dos litros ("35.591" = 35,591 L), conferência na gravação, resumo antes de gravar,
// correção campo a campo com trilha, pergunta obrigatória na devolução, detector de abastecimento não lançado que trava a
// próxima retirada, "Não abasteci", liberação e conferência pela gestão, aviso de 1 dia útil, copiloto sem intervalo
// impossível e plano de manutenção (incompleto, a vencer, vencido, trava de óleo/freio, liberação).
// Código real do SGO+ num contexto isolado, só com dados de teste.
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
      { ID: 'v2', PLACA: 'TST2B22', MODELO: 'Picape teste', KM_ATUAL: 189000, STATUS: 'ATIVO', CAPACIDADE_TANQUE_L: '' }],
    CAD_CONDUTORES: [{ ID: 'cA', NOME: 'CONDUTORA ANA', USUARIO_ID: 'uA', STATUS: 'ATIVO' }, { ID: 'cB', NOME: 'CONDUTOR BRUNO', USUARIO_ID: 'uB', STATUS: 'ATIVO' },
      { ID: 'cG', NOME: 'GESTORA TESTE', USUARIO_ID: 'uG', STATUS: 'ATIVO' }],
    CAD_USUARIOS: [{ ID: 'uG', NOME: 'GESTORA TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO' }, { ID: 'uA', NOME: 'CONDUTORA ANA', PERFIL: 'TECNICO', STATUS: 'ATIVO' }],
    REG_FROTA_MOVIMENTACAO: [], REG_FROTA_AUDITORIA: [], REG_FROTA_ABASTECIMENTO: [], REG_FROTA_MANUTENCAO: [], REG_FROTA_DESPESA: [], REG_FROTA_PARADA: [],
    REG_FROTA_DOCUMENTO: [], REG_FROTA_MULTA: [], REG_FROTA_PEDIDO_COMPROVANTE: [], REG_FROTA_PLANO_MANUTENCAO: []
  }, o.tabelas || {});
  let seq = 0;
  const props = Object.assign({}, o.props || {});
  const atividades = [], notificacoes = [];
  const ctx = vm.createContext({
    console, Utilities: criarUtilities(), Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, getProperties: () => props }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, hasLock: () => false, tryLock: () => true }) },
    SpreadsheetApp: { flush() {} },
    UrlFetchApp: { fetch: () => { throw new Error('rede proibida no teste'); } },
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
    Atividades_apiMudarSituacao: (sid, p) => { const a = atividades.find((x) => x.ID === p.id); if (a) a.SITUACAO = p.situacao; return { ok: true }; },
    Frota_uploadFoto_: () => '/arquivos/comprovante-teste'
  });
  for (const f of ['SGO_Utilis.js', 'SGO_Frota_Config.js', 'SGO_Frota_Main.js', 'SGO_Frota_Rastreador.js', 'SGO_Frota_Rastreamento.js', 'SGO_Expediente.js', 'SGO_Alertas_Central.js',
    'SGO_Frota_Abastecimento.js', 'SGO_Frota_PlanoManutencao.js', 'SGO_Frota_Gastos.js', 'SGO_Frota_Checklist.js']) {
    vm.runInContext(ler(f), ctx);
  }
  ctx.Frota_uploadFoto_ = () => '/arquivos/comprovante-teste';
  return { ctx, tabelas, props, atividades, notificacoes };
}

const ck = () => [{ grupo: 'Frente', item: 'Faróis', ok: true, observacao: '' }];
const fotos = { fotosSalvas: [{ link: '/arquivos/foto', legenda: 'frente' }], fotosPainelSalvas: [{ link: '/arquivos/painel', legenda: 'Painel' }] };
const retirar = (ctx, sid, vid, km) => ctx.Frota_apiIniciarViagem(sid, Object.assign({ veiculoId: vid, kmSaida: String(km), checklist: ck() }, fotos));
const devolver = (ctx, sid, movId, km, extra) => ctx.Frota_apiFinalizarViagem(sid, Object.assign({ movimentacaoId: movId, kmChegada: String(km), checklist: ck() }, fotos, extra || {}));
const gestaoLanca = (ctx, extra) => ctx.Frota_apiRegistrarAbastecimento('sG', Object.assign({ veiculoId: 'v1', data: hoje(), km: '197000', tipoCombustivel: 'Etanol', litros: '35.591', valor: '125,99', posto: 'POSTO TESTE', base64: 'eA==', mimeType: 'image/jpeg' }, extra || {}));

test('litros: ponto ou vírgula é sempre a casa decimal; KM e valor em R$ continuam com o ponto de milhar', () => {
  const { ctx } = ambiente();
  assert.equal(ctx.Frota_numLitros_('35.591', NaN), 35.591);
  assert.equal(ctx.Frota_numLitros_('35,591', NaN), 35.591);
  assert.equal(ctx.Frota_numLitros_('42,35', NaN), 42.35);
  assert.equal(ctx.Frota_numLitros_('1.234,5', NaN), 1234.5);
  assert.equal(ctx.Frota_numLitros_('35591', NaN), 35591);
  assert.equal(ctx.Frota_numLitros_(' 50.465 L', NaN), 50.465);
  assert.equal(ctx.Frota_numLitros_(53.099, NaN), 53.099);
  assert.ok(Number.isNaN(ctx.Frota_numLitros_('abc', NaN)));
  assert.ok(Number.isNaN(ctx.Frota_numLitros_('1.2.3', NaN)));
  // KM e R$: sem mudança (Frota_num_)
  assert.equal(ctx.Frota_num_('196.960', NaN), 196960);
  assert.equal(ctx.Frota_num_('1.500', NaN), 1500);
  assert.equal(ctx.Frota_num_('125,99', NaN), 125.99);
  assert.equal(ctx.Frota_num_('R$ 1.234,56', NaN), 1234.56);
});

test('litros: a cópia do celular (fsLitros_, JS_Core) lê igual à do servidor', () => {
  const { ctx } = ambiente();
  const html = ler('JS_Core.html');
  const fonte = html.match(/function fsLitros_\(v\) \{[\s\S]*?\n  \}/)[0];
  const fsLitros_ = new Function(fonte + '; return fsLitros_;')();
  for (const v of ['35.591', '35,591', '1.234,5', '42,35', '35591', '50.465 L', 'abc', '', '0,5', '12.']) {
    const a = ctx.Frota_numLitros_(v, NaN), b = fsLitros_(v);
    assert.ok(Object.is(a, b) || (Number.isNaN(a) && Number.isNaN(b)), v + ': servidor ' + a + ' x celular ' + b);
  }
});

test('gestão: "35.591" grava 35,591 L; litros acima do tanque, preço impossível e lançamento repetido são recusados com o motivo', () => {
  const { ctx, tabelas } = ambiente();
  const r = gestaoLanca(ctx);
  assert.equal(r.ok, true);
  assert.equal(tabelas.REG_FROTA_ABASTECIMENTO[0].LITROS, 35.591);
  assert.equal(tabelas.REG_FROTA_ABASTECIMENTO[0].SITUACAO_CONFERENCIA, 'PENDENTE');
  assert.match(r.mensagem, /35,591 L de Etanol × R\$ 3,54 por litro = R\$ 125,99/);
  // repetido
  assert.throws(() => gestaoLanca(ctx), /já está lançado/);
  // sem separador: 35591 L passa do tanque de 54 L
  assert.throws(() => gestaoLanca(ctx, { litros: '35591', valor: '200' }), /passam da capacidade do tanque do veículo TST1A11 \(54 L\)[\s\S]*vírgula/);
  // veículo sem a capacidade: limite de 150 L
  assert.throws(() => gestaoLanca(ctx, { veiculoId: 'v2', km: '189000', litros: '35591' }), /passam de 150 L/);
  // preço impossível (R$ 35/L)
  assert.throws(() => gestaoLanca(ctx, { litros: '3,5', valor: '125,99' }), /fora do possível/);
  assert.equal(tabelas.REG_FROTA_ABASTECIMENTO.length, 1, 'nada a mais gravado');
});

test('gestão: preço fora da faixa normal e KM fora da retirada gravam como "a conferir", com o apontamento', () => {
  const { ctx, tabelas } = ambiente({ tabelas: { REG_FROTA_MOVIMENTACAO: [{ ID: 'm1', VEICULO_ID: 'v1', CONDUTOR_ID: 'cA', DATA_SAIDA: hoje(), HORA_SAIDA: '08:00', KM_SAIDA: 196028, DATA_CHEGADA: hoje(), HORA_CHEGADA: '23:00', KM_CHEGADA: 196107, STATUS: 'FINALIZADO' }] } });
  const r = gestaoLanca(ctx, { km: '196960', litros: '50,465', valor: '307,33', tipoCombustivel: 'Gasolina' });
  const a = tabelas.REG_FROTA_ABASTECIMENTO[0];
  assert.equal(a.SITUACAO_CONFERENCIA, 'A_CONFERIR');
  assert.match(a.APONTAMENTOS, /KM_RETIRADA/);
  assert.match(r.mensagem, /não bate com as retiradas/);
  const r2 = gestaoLanca(ctx, { km: '196100', litros: '10', valor: '140', tipoCombustivel: 'Gasolina', data: hoje() });
  assert.equal(tabelas.REG_FROTA_ABASTECIMENTO[1].SITUACAO_CONFERENCIA, 'A_CONFERIR');
  assert.match(r2.mensagem, /fora da faixa normal/);
});

test('resumo antes de gravar (prévia): calcula o preço por litro e o KM desde o anterior, sem gravar nada', () => {
  const { ctx, tabelas } = ambiente({ tabelas: { REG_FROTA_ABASTECIMENTO: [{ ID: 'a0', VEICULO_ID: 'v1', DATA: br(Date.now() - 2 * DIA), KM: 196960, LITROS: 40, VALOR: 240, TIPO_COMBUSTIVEL: 'Gasolina' }] } });
  const p = ctx.Frota_apiAbastPrevia('sA', { veiculoId: 'v1', data: hoje(), km: '197277', tipoCombustivel: 'Etanol', litros: '35,591', valor: '125,99', tanqueCheio: 'SIM' });
  assert.equal(p.erros.length, 0);
  assert.match(p.resumo, /rodou 317 km desde o abastecimento anterior/);
  assert.match(p.resumo, /tanque completado/);
  const p2 = ctx.Frota_apiAbastPrevia('sA', { veiculoId: 'v1', data: hoje(), km: '197277', litros: '35591', valor: '125,99' });
  assert.equal(p2.erros.length, 1);
  assert.equal(tabelas.REG_FROTA_ABASTECIMENTO.length, 1);
});

test('correção campo a campo: só a gestão, com justificativa; grava só o que mudou, mantém o comprovante e deixa antes/depois na trilha', () => {
  const { ctx, tabelas } = ambiente({ tabelas: { REG_FROTA_ABASTECIMENTO: [{ ID: 'a1', VEICULO_ID: 'v1', DATA: hoje(), KM: 197277, LITROS: 35591, VALOR: 125.99, TIPO_COMBUSTIVEL: 'Etanol', POSTO: 'BOM SUCESSO', COMPROVANTE_LINK: '/arquivos/nota', ORIGEM: 'GESTAO', CRIADO_EM: '2026-10-26T13:41:09.644Z' }] } });
  assert.throws(() => ctx.Frota_apiAbastCorrigir('sA', { id: 'a1', campos: { litros: '35,591' }, justificativa: 'conferido com o comprovante' }), /gestão/);
  assert.throws(() => ctx.Frota_apiAbastCorrigir('sG', { id: 'a1', campos: { litros: '35,591' }, justificativa: 'curta' }), /Justificativa obrigatória/);
  assert.throws(() => ctx.Frota_apiAbastCorrigir('sG', { id: 'a1', campos: { litros: '35591', posto: 'BOM SUCESSO' }, justificativa: 'conferido com o comprovante da nota' }), /Nenhum campo mudou/);
  const r = ctx.Frota_apiAbastCorrigir('sG', { id: 'a1', campos: { litros: '35.591', valor: '125,99', posto: 'BOM SUCESSO' }, justificativa: 'conferido com o comprovante: a nota mostra 35,591 L' });
  assert.equal(r.ok, true);
  const a = tabelas.REG_FROTA_ABASTECIMENTO[0];
  assert.equal(a.LITROS, 35.591);
  assert.equal(a.COMPROVANTE_LINK, '/arquivos/nota');
  assert.equal(a.ORIGEM, 'GESTAO');
  assert.equal(a.CRIADO_EM, '2026-10-26T13:41:09.644Z');
  assert.equal(a.SITUACAO_CONFERENCIA, 'CORRIGIDO');
  assert.equal(a.CORRIGIDO_POR, 'GESTORA TESTE');
  const t = tabelas.REG_FROTA_AUDITORIA.filter((x) => x.ACAO === 'ABASTECIMENTO_CORRIGIDO');
  assert.equal(t.length, 1, 'só o campo que mudou');
  assert.equal(t[0].CAMPO, 'LITROS'); assert.equal(t[0].VALOR_ANTES, '35591'); assert.equal(t[0].VALOR_DEPOIS, '35.591');
  assert.match(t[0].JUSTIFICATIVA, /35,591/);
});

test('correção de retirada: data da planilha antiga vira texto, chegada antes da saída é recusada, trilha campo a campo', () => {
  const { ctx, tabelas } = ambiente({ tabelas: { REG_FROTA_MOVIMENTACAO: [{ ID: 'm58', VEICULO_ID: 'v1', CONDUTOR_ID: 'cA', DATA_SAIDA: new Date('2026-01-10T03:00:00.000Z'), HORA_SAIDA: '09:31', KM_SAIDA: 196120, DATA_CHEGADA: '01/10/2026', HORA_CHEGADA: '17:00', KM_CHEGADA: 196144, STATUS: 'FINALIZADO' }] } });
  // a data da planilha antiga chega como Date do próprio ambiente do servidor (dia e mês trocados: 10/01 em vez de 01/10)
  tabelas.REG_FROTA_MOVIMENTACAO[0].DATA_SAIDA = vm.runInContext("new Date('2026-01-10T03:00:00.000Z')", ctx);
  assert.throws(() => ctx.Frota_apiRetiradaCorrigir('sG', { id: 'm58', campos: { dataSaida: '02/10/2026' }, justificativa: 'data gravada com dia e mês trocados' }), /antes da saída/);
  const r = ctx.Frota_apiRetiradaCorrigir('sG', { id: 'm58', campos: { dataSaida: '01/10/2026' }, justificativa: 'data gravada com dia e mês trocados pela planilha antiga' });
  assert.equal(r.ok, true);
  assert.equal(tabelas.REG_FROTA_MOVIMENTACAO[0].DATA_SAIDA, '01/10/2026');
  assert.equal(tabelas.REG_FROTA_MOVIMENTACAO[0].KM_SAIDA, 196120, 'o resto fica como estava');
  const t = tabelas.REG_FROTA_AUDITORIA.filter((x) => x.ACAO === 'RETIRADA_CORRIGIDA');
  assert.equal(t.length, 1); assert.equal(t[0].VALOR_ANTES, '10/01/2026'); assert.equal(t[0].VALOR_DEPOIS, '01/10/2026');
});

test('devolução: "Abasteceu durante este uso?" é obrigatória (nada é gravado sem a resposta)', () => {
  const { ctx, tabelas } = ambiente();
  const m = retirar(ctx, 'sA', 'v1', 197000);
  assert.throws(() => devolver(ctx, 'sA', m.movimentacaoId, 197050), /Abasteceu durante este uso\?[\s\S]*Nada foi gravado/);
  assert.equal(tabelas.REG_FROTA_MOVIMENTACAO[0].STATUS, 'EM_ANDAMENTO');
  // "Não sei" é só da gestão no lugar do condutor
  assert.throws(() => devolver(ctx, 'sA', m.movimentacaoId, 197050, { abasteceu: 'NAO_SEI' }), /Abasteceu durante este uso/);
  const r = devolver(ctx, 'sA', m.movimentacaoId, 197050, { abasteceu: 'NAO' });
  assert.equal(r.ok, true);
  assert.equal(tabelas.REG_FROTA_MOVIMENTACAO[0].ABASTECEU_NO_USO, 'NAO');
});

test('devolução: lançar agora grava o abastecimento ligado à retirada, com a foto do painel; litros errados recusam antes de gravar a devolução', () => {
  const { ctx, tabelas } = ambiente();
  const m = retirar(ctx, 'sA', 'v1', 197000);
  const ab = { lancarAgora: true, litros: '35591', valor: '125,99', tipoCombustivel: 'Etanol', comprovanteLink: '/arquivos/nota-celular', tanqueCheio: 'SIM' };
  assert.throws(() => devolver(ctx, 'sA', m.movimentacaoId, 197080, { abasteceu: 'SIM', abastecimento: ab }), /Abastecimento: [\s\S]*capacidade do tanque[\s\S]*Nada foi gravado/);
  assert.equal(tabelas.REG_FROTA_MOVIMENTACAO[0].STATUS, 'EM_ANDAMENTO');
  assert.throws(() => devolver(ctx, 'sA', m.movimentacaoId, 197080, { abasteceu: 'SIM', abastecimento: Object.assign({}, ab, { litros: '35,591', comprovanteLink: '' }) }), /foto da nota/);
  const r = devolver(ctx, 'sA', m.movimentacaoId, 197080, { abasteceu: 'SIM', abastecimento: Object.assign({}, ab, { litros: '35,591' }) });
  assert.equal(r.abastecimento.lancado, true);
  const a = tabelas.REG_FROTA_ABASTECIMENTO[0];
  assert.equal(a.LITROS, 35.591); assert.equal(a.KM, 197080); assert.equal(a.ORIGEM, 'DEVOLUCAO'); assert.equal(a.MOVIMENTACAO_ID, m.movimentacaoId);
  assert.equal(a.CONDUTOR_ID, 'cA'); assert.equal(a.TANQUE_CHEIO, 'SIM'); assert.match(a.FOTOS_PAINEL_JSON, /painel/);
  assert.equal(tabelas.REG_FROTA_MOVIMENTACAO[0].ABASTECIMENTO_ID, a.ID);
});

test('detector: rodou acima do limite sem abastecimento lançado -> pendência que trava a próxima retirada até "Não abasteci" (a gestão confere)', () => {
  const { ctx, tabelas, atividades } = ambiente();
  // v2 sem tanque cadastrado: limite padrão de 350 km
  const m1 = retirar(ctx, 'sA', 'v2', 189000);
  devolver(ctx, 'sA', m1.movimentacaoId, 189200, { abasteceu: 'NAO' }); // 200 km: dentro do limite
  assert.equal(tabelas.REG_FROTA_PEDIDO_COMPROVANTE.length, 0);
  const m2 = retirar(ctx, 'sA', 'v2', 189200);
  const r = devolver(ctx, 'sA', m2.movimentacaoId, 189400, { abasteceu: 'NAO' }); // 400 km desde o início
  assert.equal(r.abastecimento.travaProxima, true);
  const p = tabelas.REG_FROTA_PEDIDO_COMPROVANTE[0];
  assert.equal(p.TIPO_PEDIDO, 'DETECTOR'); assert.equal(p.CONDUTOR_ID, 'cA'); assert.equal(p.KM_RODADO, 400); assert.equal(p.LIMITE_KM, 350);
  assert.match(p.MOTIVO, /a resposta foi "não abasteci"/);
  assert.equal(atividades.length, 1); assert.equal(atividades[0].responsavelId, 'uA');
  // próxima retirada travada, com o que fazer
  assert.throws(() => retirar(ctx, 'sA', 'v1', 197000), /Retirada travada[\s\S]*Por quê[\s\S]*O que fazer[\s\S]*Não abasteci/);
  // outro condutor não é travado
  assert.equal(retirar(ctx, 'sB', 'v1', 197000).ok, true);
  // "Não abasteci" sem motivo: recusa; com motivo: libera e vai para a gestão conferir
  assert.throws(() => ctx.Frota_apiAbastJustificar('sA', { pedidoId: p.ID, justificativa: 'não' }), /Justificativa obrigatória/);
  assert.throws(() => ctx.Frota_apiAbastJustificar('sB', { pedidoId: p.ID, justificativa: 'o tanque estava cheio na saída' }), /Só ele/);
  const j = ctx.Frota_apiAbastJustificar('sA', { pedidoId: p.ID, justificativa: 'saiu com o tanque cheio e voltou com meio tanque' });
  assert.match(j.mensagem, /próxima retirada está livre/);
  assert.equal(atividades[0].SITUACAO, 'Concluída');
  const painel = ctx.Frota_apiAbastPainel('sG', {});
  assert.equal(painel.justificativas.length, 1);
  // a gestão não aceita: volta a travar, com o motivo para o condutor
  assert.throws(() => ctx.Frota_apiAbastDecidirJustificativa('sG', { pedidoId: p.ID, decisao: 'NAO_ACEITA', motivo: 'curto' }), /mínimo de 15/);
  ctx.Frota_apiAbastDecidirJustificativa('sG', { pedidoId: p.ID, decisao: 'NAO_ACEITA', motivo: 'o painel da devolução mostra o tanque na reserva' });
  assert.equal(tabelas.REG_FROTA_PEDIDO_COMPROVANTE[0].SITUACAO, 'PENDENTE');
  assert.throws(() => retirar(ctx, 'sA', 'v2', 189400), /Retirada travada/);
  // a gestão libera com o motivo
  assert.throws(() => ctx.Frota_apiAbastLiberar('sA', { pedidoId: p.ID, motivo: 'comprovante entregue em papel' }), /gestão/);
  ctx.Frota_apiAbastLiberar('sG', { pedidoId: p.ID, motivo: 'comprovante entregue em papel ao financeiro' });
  assert.equal(retirar(ctx, 'sA', 'v2', 189400).ok, true);
  assert.ok(tabelas.REG_FROTA_AUDITORIA.some((x) => x.ACAO === 'ABASTECIMENTO_LIBERADO'));
});

test('detector: limite pela autonomia (tanque x consumo, 75%) e o abastecimento lançado zera a contagem', () => {
  const { ctx, tabelas } = ambiente();
  // v1: 54 L x 9 km/L padrão x 75% = 365 km
  const s0 = ctx.FrotaAb_situacaoVeiculo_(tabelas.CAD_VEICULOS[0], 197000, true);
  assert.equal(s0.limite, 365);
  const m = retirar(ctx, 'sA', 'v1', 197000);
  devolver(ctx, 'sA', m.movimentacaoId, 197300, { abasteceu: 'SIM', abastecimento: { lancarAgora: true, litros: '30', valor: '180', tipoCombustivel: 'Gasolina', comprovanteLink: '/arquivos/n', km: '197250' } });
  const m2 = retirar(ctx, 'sA', 'v1', 197300);
  devolver(ctx, 'sA', m2.movimentacaoId, 197600, { abasteceu: 'NAO' }); // 350 km desde o abastecimento (197250): dentro
  assert.equal(tabelas.REG_FROTA_PEDIDO_COMPROVANTE.length, 0);
});

test('devolução "lançar depois": pedido com prazo de 1 dia útil; só trava depois do prazo; aviso ao condutor e à gestão uma vez só', () => {
  const { ctx, tabelas, notificacoes } = ambiente();
  const m = retirar(ctx, 'sA', 'v1', 197000);
  const r = devolver(ctx, 'sA', m.movimentacaoId, 197050, { abasteceu: 'SIM', abastecimento: { lancarAgora: false } });
  assert.equal(r.abastecimento.pedido, true);
  const p = tabelas.REG_FROTA_PEDIDO_COMPROVANTE[0];
  assert.equal(p.TIPO_PEDIDO, 'DEVOLUCAO');
  assert.ok(new Date(p.PRAZO_EM).getTime() - Date.now() >= DIA - 60000, 'pelo menos 24 h');
  assert.equal(retirar(ctx, 'sA', 'v2', 189000).ok, true, 'dentro do prazo não trava');
  devolver(ctx, 'sA', tabelas.REG_FROTA_MOVIMENTACAO[1].ID, 189010, { abasteceu: 'NAO' });
  p.PRAZO_EM = new Date(Date.now() - 60000).toISOString();
  assert.throws(() => retirar(ctx, 'sA', 'v2', 189010), /abastecimento da devolução não lançado no prazo/);
  ctx.FrotaAb_rodada_(true);
  ctx.FrotaAb_rodada_(true);
  assert.equal(notificacoes.filter((n) => n.evento === 'S75').length, 1);
  assert.equal(notificacoes.filter((n) => n.evento === 'S76').length, 1);
  assert.deepEqual(Array.from(notificacoes.find((n) => n.evento === 'S75').usuarios), ['uA']);
  // o condutor envia o comprovante pelo pedido: libera
  const e = ctx.Frota_apiRastrEnviarComprovante('sA', { pedidoId: p.ID, data: hoje(), km: '197040', litros: '20,5', valor: '120', tipoCombustivel: 'Gasolina', base64: 'eA==' });
  assert.match(e.mensagem, /próxima retirada está livre/);
  assert.equal(retirar(ctx, 'sA', 'v2', 189010).ok, true);
});

test('pendências da central: abastecimento a lançar (condutor e gestão), "Não abasteci" a conferir e lançamentos a conferir', () => {
  const { ctx, tabelas } = ambiente();
  const m = retirar(ctx, 'sA', 'v1', 197000);
  devolver(ctx, 'sA', m.movimentacaoId, 197050, { abasteceu: 'SIM', abastecimento: { lancarAgora: false } });
  tabelas.REG_FROTA_ABASTECIMENTO.push({ ID: 'ax', VEICULO_ID: 'v1', DATA: hoje(), KM: 1, LITROS: 1, VALOR: 1, SITUACAO_CONFERENCIA: 'A_CONFERIR' });
  const itens = [];
  ctx.FrotaAb_pendencias_((x) => itens.push(x));
  assert.ok(itens.some((x) => x.tipo === 'frota_abast_pendente' && x.paraUsuarios.includes('uA')));
  assert.ok(itens.some((x) => x.tipo === 'frota_abast_conferir'));
  // o pedido antigo (frota_comprovante) não duplica o automático
  const antigos = [];
  ctx.FrotaR_pendencias_((x) => antigos.push(x));
  tabelas.REG_FROTA_PEDIDO_COMPROVANTE[0].PRAZO_EM = new Date(Date.now() - 1000).toISOString();
  tabelas.REG_FROTA_PEDIDO_COMPROVANTE[0].PRAZO = br(Date.now() - 2 * DIA);
  ctx.FrotaR_pendencias_((x) => antigos.push(x));
  assert.equal(antigos.length, 0);
});

test('copiloto: intervalo com rendimento impossível (litros "35.591" gravados como 35591) sai da média e vira lançamento a conferir', () => {
  const { ctx } = ambiente();
  const ab = [
    { ID: 'a1', VEICULO_ID: 'v1', DATA: '01/10/2026', KM: 196000, LITROS: 40 },
    { ID: 'a2', VEICULO_ID: 'v1', DATA: '05/10/2026', KM: 196400, LITROS: 40 },
    { ID: 'a3', VEICULO_ID: 'v1', DATA: '09/10/2026', KM: 196800, LITROS: 40 },
    { ID: 'a4', VEICULO_ID: 'v1', DATA: '13/10/2026', KM: 197200, LITROS: 40 },
    { ID: 'a5', VEICULO_ID: 'v1', DATA: '22/10/2026', KM: 197277, LITROS: 35591 }];
  const h = ctx.FrotaR_intervalosConsumo_(ab);
  assert.equal(h.intervalos.length, 3);
  assert.equal(h.mediana, 10);
  assert.equal(h.foraDaMedia.length, 1);
  assert.equal(h.foraDaMedia[0].abastecimentoId, 'a5');
  assert.match(h.foraDaMedia[0].motivo, /fora do possível/);
  // lançamento "a conferir" também fica fora
  ab[3].SITUACAO_CONFERENCIA = 'A_CONFERIR';
  assert.equal(ctx.FrotaR_intervalosConsumo_(ab).intervalos.length, 2);
});

test('plano de manutenção: sem a última troca vira pendência clara para a gestão preencher; informar calcula a próxima', () => {
  const { ctx, tabelas } = ambiente();
  const itens = [];
  ctx.FrotaPlano_pendencias_((x) => itens.push(x));
  const p2 = itens.find((x) => x.id === 'FROTA:PLANO:v2');
  assert.match(p2.titulo, /^Plano de manutenção incompleto: informe a última troca de óleo do TST2B22/);
  assert.match(p2.oQueFazer, /Plano de manutenção[\s\S]*Informar/);
  assert.equal(p2.gravidade, 'CRITICO');
  assert.throws(() => ctx.Frota_apiPlanoSalvarItem('sA', { veiculoId: 'v2', item: 'OLEO', ultimaData: '01/08/2026', ultimaKm: '185000' }), /gestão/);
  assert.throws(() => ctx.Frota_apiPlanoSalvarItem('sG', { veiculoId: 'v2', item: 'OLEO', ultimaData: '01/08/2026', ultimaKm: '195000' }), /maior que o KM atual/);
  const r = ctx.Frota_apiPlanoSalvarItem('sG', { veiculoId: 'v2', item: 'OLEO', ultimaData: '01/08/2026', ultimaKm: '185000' });
  assert.equal(r.item.proximaKm, 190000);
  assert.equal(r.item.proximaData, '01/02/2027');
  assert.equal(r.item.faltamKm, 1000); assert.equal(r.item.situacao, 'AVISO');
  assert.ok(tabelas.REG_FROTA_AUDITORIA.some((x) => x.ACAO === 'PLANO_MANUTENCAO' && x.CAMPO === 'OLEO.ULTIMA_KM'));
  // só o que veio muda (merge): mudar o intervalo não apaga a data e o KM
  ctx.Frota_apiPlanoSalvarItem('sG', { veiculoId: 'v2', item: 'OLEO', intervaloKm: '7000' });
  const linha = tabelas.REG_FROTA_PLANO_MANUTENCAO.find((x) => x.ITEM === 'OLEO');
  assert.equal(linha.ULTIMA_KM, 185000); assert.equal(linha.INTERVALO_KM, 7000);
});

test('plano de manutenção: a vencer, vencido, trava de óleo vencido há mais de 1.000 km (a gestão libera) e alerta pelo plano', () => {
  const { ctx, tabelas } = ambiente({ tabelas: { REG_FROTA_MANUTENCAO: [
    { ID: 'mt', VEICULO_ID: 'v1', TIPO: 'OLEO', DATA: '21/08/2026', KM: 196500, CUSTO: 3500, DESCRICAO: 'Troca de óleo (Teste)', EXCLUIDO_EM: '2026-10-30T12:00:00Z' },
    { ID: 'mo', VEICULO_ID: 'v1', TIPO: 'OLEO', DATA: br(Date.now() - 30 * DIA), KM: 191000, CUSTO: 285 }] } });
  // 191000 + 5000 = 196000; KM 197000: vencido há 1.000 km (no limite, ainda não trava)
  let pl = ctx.FrotaPlano_doVeiculo_(tabelas.CAD_VEICULOS[0]).find((i) => i.codigo === 'OLEO');
  assert.equal(pl.ultimaKm, 191000, 'manutenção de teste excluída não conta');
  assert.equal(pl.situacao, 'VENCIDO'); assert.equal(pl.trava, false);
  assert.match(ctx.FrotaPlano_conferirRetirada_(tabelas.CAD_VEICULOS[0]), /vencid[\s\S]*A gestão já foi avisada/);
  tabelas.CAD_VEICULOS[0].KM_ATUAL = 197100;
  assert.throws(() => retirar(ctx, 'sA', 'v1', 197100), /Retirada travada: o veículo TST1A11 está com óleo[\s\S]*vencido há 1.100 km[\s\S]*Liberar uso/);
  const alertas = ctx.Frota_calcularAlertasManutencao_().filter((a) => a.veiculoId === 'v1' && a.tipo === 'OLEO');
  assert.equal(alertas.length, 1); assert.equal(alertas[0].status, 'VENCIDO'); assert.equal(alertas[0].origem, 'PLANO');
  assert.throws(() => ctx.Frota_apiPlanoLiberar('sG', { veiculoId: 'v1', item: 'FILTRO_AR', motivo: 'troca agendada para amanhã cedo' }), /Só óleo e freio/);
  ctx.Frota_apiPlanoLiberar('sG', { veiculoId: 'v1', item: 'OLEO', motivo: 'troca agendada para amanhã às 8h na oficina' });
  const r = retirar(ctx, 'sA', 'v1', 197100);
  assert.equal(r.ok, true);
  assert.match(r.avisoManutencao, /óleo do motor/);
  // registrar a troca atualiza o item sozinho
  tabelas.REG_FROTA_MANUTENCAO.push({ ID: 'mn', VEICULO_ID: 'v1', TIPO: 'OLEO', DATA: hoje(), KM: 197100 });
  pl = ctx.FrotaPlano_doVeiculo_(tabelas.CAD_VEICULOS[0]).find((i) => i.codigo === 'OLEO');
  assert.equal(pl.situacao, 'OK'); assert.equal(pl.proximaKm, 202100); assert.equal(pl.ultimaOrigem, 'manutenção registrada');
  // aviso antecipado: faltam 800 km
  tabelas.CAD_VEICULOS[0].KM_ATUAL = 201300;
  pl = ctx.FrotaPlano_doVeiculo_(tabelas.CAD_VEICULOS[0]).find((i) => i.codigo === 'OLEO');
  assert.equal(pl.situacao, 'AVISO');
  tabelas.CAD_VEICULOS[0].KM_ATUAL = 201700;
  assert.equal(ctx.FrotaPlano_doVeiculo_(tabelas.CAD_VEICULOS[0]).find((i) => i.codigo === 'OLEO').situacao, 'VENCENDO');
});

test('perfil GESTOR (como o do responsável que vai preencher o plano) usa o plano mesmo sem condutor ligado ao login', () => {
  const { ctx, tabelas } = ambiente();
  tabelas.CAD_CONDUTORES = tabelas.CAD_CONDUTORES.filter((c) => c.ID !== 'cG');
  const l = ctx.Frota_apiPlanoListar('sG');
  assert.equal(l.veiculos.length, 2);
  assert.ok(l.veiculos[0].itens.length >= 10);
  assert.equal(ctx.Frota_apiPlanoSalvarItem('sG', { veiculoId: 'v1', item: 'FREIOS', ultimaData: '10/09/2026', ultimaKm: '195000' }).ok, true);
});

test('telas: o código do navegador do abastecimento e do plano monta sem erro de sintaxe e vem junto com a tela do rastreamento', () => {
  const c = vm.createContext({});
  vm.runInContext(ler('SGO_Frota_AbastecimentoTela.js'), c);
  const t = c.Frota_telaAbastecimento_();
  assert.doesNotThrow(() => new Function(t.js));
  assert.match(ler('SGO_Frota_RastreamentoTela.js'), /Frota_telaAbastecimento_\(\)/);
  assert.match(t.js, /apiAbastCorrigir/); assert.match(t.js, /apiPlanoSalvarItem/);
});
