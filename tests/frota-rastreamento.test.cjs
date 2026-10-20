// Frota, rastreamento (20/10/2026): nós -> km/h, rotas guardadas e retenção, quem vê localização e a trilha de
// consultas, consumo médio e desvio, abastecimento x posição, pedido de comprovante, copiloto (IA sem inventar
// número), ponte do COMMAND e relatório A4. Código real do SGO+ num contexto isolado, só com dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

const HORA = 3600000, DIA = 86400000;
const SESSOES = {
  sGestor: { userId: 'uG', usuario: 'gestor.teste', nome: 'GESTOR TESTE', perfil: 'GESTOR' },
  sTec: { userId: 'uT', usuario: 'tecnico.teste', nome: 'TECNICO TESTE', perfil: 'TECNICO' },
  sOutro: { userId: 'uO', usuario: 'outro.teste', nome: 'OUTRO TESTE', perfil: 'TECNICO' }
};

/** Armazém de rotas em memória, com a mesma interface da tabela do servidor (SGO_ROTAS). */
function armazemMemoria() {
  const pts = [];
  return {
    pts,
    gravar(lista) { let n = 0; lista.forEach((p) => { if (!pts.some((x) => x.deviceId === p.deviceId && x.em === p.em)) { pts.push(Object.assign({}, p)); n++; } }); return { inseridos: n }; },
    ler(f) { const de = new Date(f.de || 0).getTime(), ate = new Date(f.ate || Date.now()).getTime(); return pts.filter((p) => (f.veiculoId ? p.veiculoId === f.veiculoId : p.deviceId === f.deviceId) && new Date(p.em).getTime() >= de && new Date(p.em).getTime() <= ate).sort((a, b) => a.em.localeCompare(b.em)); },
    ultimo(f) { const l = this.ler({ deviceId: f.deviceId, veiculoId: f.veiculoId, de: 0, ate: new Date(Date.now() + DIA).toISOString() }); return l[l.length - 1] || null; },
    apagarAntes(iso) { const t = new Date(iso).getTime(); let n = 0; for (let i = pts.length - 1; i >= 0; i--) if (new Date(pts[i].em).getTime() < t) { pts.splice(i, 1); n++; } return { apagados: n }; },
    resumo() { return { total: pts.length, maisAntigo: null, maisRecente: null }; }
  };
}

function ambiente(o) {
  o = o || {};
  const tabelas = Object.assign({ CAD_VEICULOS: [], CAD_CONDUTORES: [], CAD_USUARIOS: [], REG_FROTA_MOVIMENTACAO: [], REG_FROTA_AUDITORIA: [], REG_FROTA_ABASTECIMENTO: [],
    REG_FROTA_MANUTENCAO: [], REG_FROTA_DESPESA: [], REG_FROTA_PARADA: [], REG_FROTA_DOCUMENTO: [], REG_FROTA_MULTA: [] }, o.tabelas || {});
  let seq = 0;
  const props = Object.assign({}, o.props || {});
  const cache = {};
  const atividades = [];
  const ctx = vm.createContext({
    console, Utilities: criarUtilities(), Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, getProperties: () => props }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, hasLock: () => false, tryLock: () => true }) },
    UrlFetchApp: { fetch: () => { throw new Error('rede proibida no teste'); } },
    CertCal_garantirTabela_: (t) => { tabelas[t] = tabelas[t] || []; }, CertCal_garantirColuna_() {}, CertCal_forcarColunaTexto_() {},
    SGO_DATA: {
      getDB: () => ({ getSheetByName: (n) => (tabelas[n] ? {} : null) }),
      getAll: (t) => (tabelas[t] || []).map((r) => Object.assign({}, r)),
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) return false; Object.assign(r, d); return true; },
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq), CRIADO_EM: new Date().toISOString() }, d); (tabelas[t] = tabelas[t] || []).push(r); return r; },
      insertMany: (t, l) => l.forEach((d) => ctx.SGO_DATA.insert(t, d)),
      remove: (t, id) => { tabelas[t] = (tabelas[t] || []).filter((x) => String(x.ID) !== String(id)); },
      gerarRegistroBase: (x) => Object.assign({ ID: 'g' + (++seq), CRIADO_EM: new Date().toISOString() }, x),
      normalizarObjetoParaSheet: (t, x) => x,
      log() {}
    },
    SGO_CFG: { SHEETS: { CAD_VEICULOS: 'CAD_VEICULOS', CAD_CONDUTORES: 'CAD_CONDUTORES', CAD_USUARIOS: 'CAD_USUARIOS', REG_FROTA_MOVIMENTACAO: 'REG_FROTA_MOVIMENTACAO',
      REG_FROTA_ABASTECIMENTO: 'REG_FROTA_ABASTECIMENTO', REG_FROTA_MANUTENCAO: 'REG_FROTA_MANUTENCAO', REG_FROTA_DESPESA: 'REG_FROTA_DESPESA', REG_FROTA_PARADA: 'REG_FROTA_PARADA',
      REG_FROTA_DOCUMENTO: 'REG_FROTA_DOCUMENTO', REG_FROTA_MULTA: 'REG_FROTA_MULTA' } },
    exigirSessao: (sid) => { const s = SESSOES[sid]; if (!s) throw new Error('sessão inválida'); return s; },
    isAdminSession: (sid) => ['ADMIN', 'GESTOR', 'DIRETORIA'].indexOf((SESSOES[sid] || {}).perfil) >= 0,
    Atividades_apiCriar: (sid, p) => { const a = Object.assign({ ID: 'atv' + (++seq), SITUACAO: 'A fazer', criadaPor: sid }, p); atividades.push(a); return { ok: true, item: a, message: 'Atividade lançada.' }; },
    Atividades_apiMudarSituacao: (sid, p) => { const a = atividades.find((x) => x.ID === p.id); if (!a) return { ok: false }; if (sid !== 'sGestor' && a.responsavelId !== SESSOES[sid].userId) return { ok: false, message: 'não é o responsável' }; a.SITUACAO = p.situacao; return { ok: true }; },
    Frota_uploadFoto_: () => '/arquivos/comprovante-teste'
  });
  if (o.armazem) ctx.SGO_ROTAS = o.armazem;
  for (const f of ['SGO_Utilis.js', 'SGO_Frota_Config.js', 'SGO_Frota_Main.js', 'SGO_Frota_Rastreador.js', 'SGO_Frota_Gestao.js', 'SGO_Frota_Rastreamento.js', 'SGO_Frota_RastreamentoGestao.js']) {
    vm.runInContext(fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n'), ctx);
  }
  ctx.Frota_uploadFoto_ = () => '/arquivos/comprovante-teste';
  return { ctx, tabelas, props, cache, atividades };
}

/** Rota de teste: sai parado, anda, para 10 min, passa de 130 km/h, para no fim. Pontos a cada minuto. */
function rotaTeste(inicioMs, veiculoId, deviceId) {
  const pts = [];
  let lat = -16.70, lon = -49.30;
  const add = (min, kmh, ign, dLat) => { lat += dLat || 0; pts.push({ deviceId: deviceId || 'D1', veiculoId: veiculoId || 'v1', em: new Date(inicioMs + min * 60000).toISOString(), lat, lon, kmh, ignicao: ign, endereco: 'Rua de teste ' + min }); };
  add(0, 0, false);
  for (let m = 1; m <= 10; m++) add(m, 60, true, 0.009);            // ~1 km por minuto
  for (let m = 11; m <= 21; m++) add(m, 0, false);                   // parada de 10 min
  for (let m = 22; m <= 24; m++) add(m, 130, true, 0.0195);          // acima do limite
  for (let m = 25; m <= 30; m++) add(m, 50, true, 0.008);
  add(31, 0, false);
  return pts;
}

test('velocidade: a API manda nós; o SGO+ mostra km/h (1 nó = 1,852 km/h)', () => {
  const { ctx } = ambiente();
  assert.equal(ctx.FrotaR_kmh_(10), 18.5);
  assert.equal(ctx.FrotaR_kmh_(54), 100);
  assert.equal(ctx.FrotaR_kmh_(null), null);
  const p = ctx.Rastreador_posicao_({ deviceId: 7, speed: 54, latitude: -16.7, longitude: -49.3, fixTime: new Date().toISOString(), attributes: { ignition: true, odometer: 1234500 } });
  assert.equal(p.kmh, 100);
  assert.equal(p.odometroKm, 1235);
});

test('análise da rota: distância, paradas, excesso de velocidade e uso fora do expediente', () => {
  const { ctx } = ambiente();
  // terça-feira, 21:00 em Brasília (fora do expediente padrão 07:00-19:00)
  const noite = Date.UTC(2026, 9, 21, 0, 0); // 21:00 de 20/10 em Brasília
  const a = ctx.FrotaR_analisarRota_(rotaTeste(noite), ctx.FrotaR_cfg_());
  assert.ok(a.distanciaKm > 15 && a.distanciaKm < 25, 'distância ' + a.distanciaKm);
  assert.equal(a.paradas.length >= 1, true);
  assert.equal(a.paradas[0].duracaoMin >= 10, true);
  assert.equal(a.excessos.length, 1);
  assert.equal(a.excessos[0].velMaxKmh, 130);
  assert.equal(a.velMaxKmh, 130);
  assert.ok(a.foraExpediente.km > 15, 'fora do expediente ' + a.foraExpediente.km);
  // de dia útil, às 10:00: nada fora do expediente
  const dia = Date.UTC(2026, 9, 20, 13, 0);
  const b = ctx.FrotaR_analisarRota_(rotaTeste(dia), ctx.FrotaR_cfg_());
  assert.equal(b.foraExpediente.km, 0);
  // GPS oscilando com a ignição desligada (11 km/h) é parado, não excesso nem movimento
  const c = ctx.FrotaR_analisarRota_([{ em: new Date(dia).toISOString(), lat: -16.7, lon: -49.3, kmh: 11, ignicao: false }, { em: new Date(dia + 600000).toISOString(), lat: -16.7, lon: -49.3, kmh: 0, ignicao: false }], ctx.FrotaR_cfg_());
  assert.equal(c.movimentoMin, 0);
  assert.equal(c.distanciaKm, 0);
});

test('retenção: apaga só os pontos de rota mais velhos que o prazo (padrão 90 dias, configurável)', () => {
  const arm = armazemMemoria();
  const agora = Date.now();
  arm.gravar([100, 91, 89, 1].map((d) => ({ deviceId: 'D1', veiculoId: 'v1', em: new Date(agora - d * DIA).toISOString(), lat: -16.7, lon: -49.3 })));
  const { ctx } = ambiente({ armazem: arm });
  const r = ctx.Rastreador_limparRetencao_(true);
  assert.equal(r.rotas, 2);
  assert.equal(arm.pts.length, 2);
  // prazo de 30 dias: só o de 1 dia fica
  const e2 = ambiente({ armazem: arm, props: { RASTREADOR_RETENCAO_DIAS: '30' } });
  e2.ctx.Rastreador_limparRetencao_(true);
  assert.deepEqual(arm.pts.map((p) => Math.round((agora - new Date(p.em).getTime()) / DIA)), [1]);
});

test('rodada: cada leitura vira ponto da rota, só de aparelho ligado a veículo, sem repetir', () => {
  const arm = armazemMemoria();
  const { ctx } = ambiente({ armazem: arm, tabelas: { CAD_VEICULOS: [{ ID: 'v1', PLACA: 'TST1A23', STATUS: 'ATIVO', RASTREADOR_DEVICE_ID: 'D1' }] } });
  const pos = { D1: ctx.Rastreador_posicao_({ deviceId: 'D1', speed: 20, latitude: -16.7, longitude: -49.3, fixTime: new Date().toISOString(), attributes: {} }),
    D9: ctx.Rastreador_posicao_({ deviceId: 'D9', speed: 0, latitude: -16.7, longitude: -49.3, fixTime: new Date().toISOString(), attributes: {} }) };
  assert.equal(ctx.FrotaR_gravarPosicoes_(pos, ctx.FrotaR_veiculosPorDevice_(), 'posicao'), 1);
  assert.equal(ctx.FrotaR_gravarPosicoes_(pos, ctx.FrotaR_veiculosPorDevice_(), 'posicao'), 0);
  assert.equal(arm.pts[0].veiculoId, 'v1');
  assert.equal(arm.pts[0].kmh, 37);
});

test('LGPD: só a gestão vê rota e mapa; cada consulta fica na trilha (mapa uma vez a cada 30 min)', () => {
  const arm = armazemMemoria();
  const agora = Date.now();
  arm.gravar(rotaTeste(agora - 2 * HORA));
  const { ctx, tabelas } = ambiente({ armazem: arm, tabelas: { CAD_VEICULOS: [{ ID: 'v1', PLACA: 'TST1A23', STATUS: 'ATIVO', RASTREADOR_DEVICE_ID: 'D1' }] } });
  const hoje = ctx.FrotaR_hojeBr_();
  assert.throws(() => ctx.Frota_apiRastrRota('sTec', { veiculoId: 'v1', de: hoje, ate: hoje }), /só da gestão/);
  assert.throws(() => ctx.Frota_apiRastrMapa('sTec'), /só da gestão/);
  const r = ctx.Frota_apiRastrRota('sGestor', { veiculoId: 'v1', de: ctx.FrotaR_diasAtrasBr_(1), ate: hoje });
  assert.equal(r.ok, true);
  assert.ok(r.analise.pontos > 10);
  const trilha = tabelas.REG_FROTA_RASTREADOR_CONSULTAS;
  assert.equal(trilha.length, 1);
  assert.equal(trilha[0].ACAO, 'ROTA_VEICULO');
  assert.equal(trilha[0].USUARIO_ID, 'uG');
  assert.equal(trilha[0].PLACA, 'TST1A23');
  // mapa sem rastreador configurado: diz o caminho para configurar e não registra consulta de localização
  const m = ctx.Frota_apiRastrMapa('sGestor');
  assert.equal(m.pronto, false);
  assert.match(m.mensagem, /Chaves e senhas > Rastreador da frota/);
  // com o rastreador ligado e posições guardadas: duas aberturas seguidas = uma linha na trilha
  const e2 = ambiente({ armazem: arm, props: { RASTREADOR_TOKEN: 'chave-de-teste', RASTREADOR_LIGADO: '1' }, tabelas: { CAD_VEICULOS: [{ ID: 'v1', PLACA: 'TST1A23', STATUS: 'ATIVO', RASTREADOR_DEVICE_ID: 'D1' }] } });
  const posD1 = e2.ctx.Rastreador_posicao_({ deviceId: 'D1', speed: 30, latitude: -16.7, longitude: -49.3, fixTime: new Date().toISOString(), attributes: { ignition: true } });
  e2.ctx.Rastreador_guardarPosicoes_(e2.ctx.Rastreador_cfg_(), { D1: posD1 }, false);
  const m1 = e2.ctx.Frota_apiRastrMapa('sGestor');
  e2.ctx.Frota_apiRastrMapa('sGestor');
  assert.equal(m1.pronto, true);
  assert.equal(m1.veiculos[0].situacao, 'USO_SEM_REGISTRO');
  assert.equal(m1.veiculos[0].kmh, 55.6);
  assert.equal(e2.tabelas.REG_FROTA_RASTREADOR_CONSULTAS.filter((x) => x.ACAO === 'MAPA').length, 1);
});

test('consumo: média do próprio veículo (mediana) e desvio; litros acima do tanque', () => {
  const abast = [
    { ID: 'a1', VEICULO_ID: 'v1', DATA: '01/08/2026', KM: 10000, LITROS: 40 },
    { ID: 'a2', VEICULO_ID: 'v1', DATA: '10/08/2026', KM: 10400, LITROS: 40 },   // 10 km/L
    { ID: 'a3', VEICULO_ID: 'v1', DATA: '20/08/2026', KM: 10800, LITROS: 40 },   // 10
    { ID: 'a4', VEICULO_ID: 'v1', DATA: '01/09/2026', KM: 11200, LITROS: 40 },   // 10
    { ID: 'a5', VEICULO_ID: 'v1', DATA: '05/10/2026', KM: 11520, LITROS: 40 },   // 8 km/L
    { ID: 'a6', VEICULO_ID: 'v1', DATA: '15/10/2026', KM: 11840, LITROS: 70, COMPROVANTE_LINK: '/arquivos/x' } // 4,57 km/L e acima do tanque
  ];
  const { ctx } = ambiente({ tabelas: { REG_FROTA_ABASTECIMENTO: abast, CAD_VEICULOS: [{ ID: 'v1', PLACA: 'TST1A23', STATUS: 'ATIVO', CAPACIDADE_TANQUE_L: 55 }] } });
  const h = ctx.FrotaR_intervalosConsumo_(abast);
  assert.equal(h.intervalos.length, 5);
  assert.equal(h.mediana, 10);
  const per = ctx.FrotaR_periodo_('01/10/2026', '31/10/2026');
  const c = ctx.FrotaR_consumoVeiculo_(abast, per, ctx.FrotaR_cfg_());
  assert.equal(c.kmLPeriodo, 5.82); // 640 km / 110 L
  assert.equal(c.kmLReferencia, 10);
  assert.ok(c.desvioPct > 15 && c.alerta === true);
  assert.equal(c.estranhos.length, 1);
  const conf = ctx.FrotaR_conferirAbastecimentos_([{ ID: 'v1', PLACA: 'TST1A23', CAPACIDADE_TANQUE_L: 55 }], per, ctx.FrotaR_cfg_(), false);
  const a6 = conf.find((x) => x.id === 'a6');
  assert.ok(a6.apontamentos.some((p) => p.tipo === 'TANQUE' && /70,00 L/.test(p.texto)));
  assert.ok(conf.find((x) => x.id === 'a5').apontamentos.some((p) => p.tipo === 'COMPROVANTE'));
});

test('abastecimento x posição: parado no horário = compatível; andando o tempo todo = conferir; sem pontos = sem dado', () => {
  const { ctx } = ambiente();
  const t = ctx.FrotaR_msDe_('20/10/2026', '14:30');
  const parado = [];
  for (let m = -20; m <= 20; m += 2) parado.push({ em: new Date(t + m * 60000).toISOString(), lat: -16.7, lon: -49.3, kmh: m >= -6 && m <= 6 ? 0 : 50, ignicao: !(m >= -6 && m <= 6), endereco: 'Posto de teste' });
  const ab = { DATA: '20/10/2026', HORA: '14:30' };
  assert.equal(ctx.FrotaR_abastecimentoPosicao_(ab, parado).situacao, 'COMPATIVEL');
  const andando = parado.map((p) => Object.assign({}, p, { kmh: 60, ignicao: true }));
  assert.equal(ctx.FrotaR_abastecimentoPosicao_(ab, andando).situacao, 'CONFERIR');
  assert.equal(ctx.FrotaR_abastecimentoPosicao_(ab, []).situacao, 'SEM_DADO');
  assert.equal(ctx.FrotaR_abastecimentoPosicao_({ DATA: '20/10/2026' }, parado).situacao, 'SEM_HORA');
});

test('comprovante: a gestão pede, o condutor recebe atividade, envia e o pedido e a atividade fecham', () => {
  const env = ambiente({ tabelas: { CAD_VEICULOS: [{ ID: 'v1', PLACA: 'TST1A23', STATUS: 'ATIVO' }], CAD_CONDUTORES: [{ ID: 'c1', NOME: 'TECNICO TESTE', USUARIO_ID: 'uT', STATUS: 'ATIVO' }, { ID: 'c2', NOME: 'SEM LOGIN TESTE', STATUS: 'ATIVO' }] } });
  const { ctx, tabelas, atividades } = env;
  assert.throws(() => ctx.Frota_apiRastrPedirComprovante('sTec', { veiculoId: 'v1', condutorId: 'c1', motivo: 'Nota do abastecimento de teste' }), /só da gestão/);
  assert.throws(() => ctx.Frota_apiRastrPedirComprovante('sGestor', { veiculoId: 'v1', condutorId: 'c2', motivo: 'Nota do abastecimento de teste' }), /não tem login do SGO\+ ligado/);
  const r = ctx.Frota_apiRastrPedirComprovante('sGestor', { veiculoId: 'v1', condutorId: 'c1', dataRef: '18/10/2026', motivo: 'Nota do abastecimento de 18/10 no cartão' });
  assert.equal(r.ok, true);
  assert.equal(atividades.length, 1);
  assert.equal(atividades[0].responsavelId, 'uT');
  assert.equal(atividades[0].modulo, 'frota');
  const de2 = ctx.Frota_apiRastrPedirComprovante('sGestor', { veiculoId: 'v1', condutorId: 'c1', dataRef: '18/10/2026', motivo: 'Nota do abastecimento de 18/10 no cartão' });
  assert.equal(de2.jaExistia, true);
  const meus = ctx.Frota_apiRastrMeusPedidos('sTec');
  assert.equal(meus.itens.length, 1);
  assert.equal(ctx.Frota_apiRastrMeusPedidos('sOutro').itens.length, 0);
  assert.throws(() => ctx.Frota_apiRastrEnviarComprovante('sOutro', { pedidoId: meus.itens[0].id }), /Só ele/);
  assert.throws(() => ctx.Frota_apiRastrEnviarComprovante('sTec', { pedidoId: meus.itens[0].id, data: '18/10/2026', litros: '40', km: '12000' }), /Anexe a foto/);
  const env2 = ctx.Frota_apiRastrEnviarComprovante('sTec', { pedidoId: meus.itens[0].id, data: '18/10/2026', hora: '14:30', litros: '40,5', km: '12.000', valor: '250,00', base64: 'AAAA', mimeType: 'image/jpeg' });
  assert.equal(env2.ok, true);
  const ab = tabelas.REG_FROTA_ABASTECIMENTO[0];
  assert.equal(ab.ORIGEM, 'CONDUTOR');
  assert.equal(ab.LITROS, 40.5);
  assert.equal(ab.KM, 12000);
  assert.equal(ab.HORA, '14:30');
  assert.equal(tabelas.REG_FROTA_PEDIDO_COMPROVANTE[0].SITUACAO, 'ENVIADO');
  assert.equal(atividades[0].SITUACAO, 'Concluída');
  assert.equal(ctx.Frota_apiRastrMeusPedidos('sTec').itens.length, 0);
  // reenviar não grava em dobro
  assert.equal(ctx.Frota_apiRastrEnviarComprovante('sTec', { pedidoId: meus.itens[0].id }).jaEnviado, true);
  assert.equal(tabelas.REG_FROTA_ABASTECIMENTO.length, 1);
});

test('comprovante vencido vira sugestão VEI-05 no Programa de conduta (nunca ocorrência direta)', () => {
  const { ctx, tabelas } = ambiente({ tabelas: { CAD_VEICULOS: [{ ID: 'v1', PLACA: 'TST1A23', STATUS: 'ATIVO' }], CAD_CONDUTORES: [{ ID: 'c1', NOME: 'TECNICO TESTE', USUARIO_ID: 'uT', STATUS: 'ATIVO' }] } });
  ctx.Frota_apiRastrPedirComprovante('sGestor', { veiculoId: 'v1', condutorId: 'c1', motivo: 'Nota do abastecimento de teste', prazoDias: 1 });
  const p = tabelas.REG_FROTA_PEDIDO_COMPROVANTE[0];
  p.PRAZO = ctx.FrotaR_diasAtrasBr_(5);
  const s = ctx.FrotaR_sugestoesConduta_(ctx.FrotaR_local_(Date.now() - 60 * DIA).iso, (cid) => (cid === 'c1' ? 'uT' : ''), []);
  assert.equal(s.length, 1);
  assert.equal(s[0].tipoCodigo, 'VEI-05');
  assert.equal(s[0].colaboradorId, 'uT');
  assert.equal(s[0].resolvivel, true);
});

test('copiloto: regras sugerem; a IA só reescreve com os números dos fatos (texto com número inventado é descartado)', () => {
  const abast = [['01/08/2026', 10000, 40], ['10/08/2026', 10400, 40], ['20/08/2026', 10800, 40], ['01/09/2026', 11200, 40]].map((x, i) => ({ ID: 'a' + i, VEICULO_ID: 'v1', DATA: x[0], KM: x[1], LITROS: x[2], COMPROVANTE_LINK: '/arquivos/x' }));
  const hoje = Date.now();
  abast.push({ ID: 'a9', VEICULO_ID: 'v1', DATA: new Date(hoje - 5 * DIA).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }), KM: 11520, LITROS: 40, COMPROVANTE_LINK: '/arquivos/x' });
  const { ctx, tabelas, atividades } = ambiente({ tabelas: { REG_FROTA_ABASTECIMENTO: abast, CAD_VEICULOS: [{ ID: 'v1', PLACA: 'TST1A23', STATUS: 'ATIVO', KM_ATUAL: 11520 }] } });
  const lista = ctx.FrotaR_sugestoes_(30);
  const cons = lista.find((s) => s.tipo === 'CONSUMO');
  assert.ok(cons, 'sugestão de consumo');
  assert.match(cons.titulo, /25,0% acima da média/);
  // IA de teste: uma resposta com número dos fatos, outra com número inventado
  ctx.RELA4_REGRAS_REDACAO = '';
  ctx.RelA4_limparTextoIa_ = (t) => t;
  ctx.RelA4_gemini_ = () => JSON.stringify([{ chave: cons.chave, prioridade: 1, texto: 'Revisar o TST1A23: rendeu 8 km/L contra 10 km/L de média.' }]);
  let ia = ctx.FrotaR_copilotoIa_([cons]);
  assert.equal(ia.aplicada, true);
  assert.match(cons.textoIa, /8 km\/L/);
  delete cons.textoIa;
  ctx.RelA4_gemini_ = () => JSON.stringify([{ chave: cons.chave, prioridade: 1, texto: 'O consumo piorou 37% por causa do filtro.' }]);
  ia = ctx.FrotaR_copilotoIa_([cons]);
  assert.equal(cons.textoIa, undefined);
  assert.match(ia.aviso, /números fora dos dados/);
  // aceitar como caso: vai para o Kanban (REG_FROTA_CASO) em "Em análise"; decidida não volta
  const r = ctx.Frota_apiRastrCopilotoDecidir('sGestor', { chave: cons.chave, decisao: 'ACEITAR', destino: 'CASO', dias: 30 });
  assert.equal(r.ok, true);
  assert.equal(tabelas.REG_FROTA_CASO[0].TIPO, 'CONSUMO');
  assert.equal(tabelas.REG_FROTA_CASO[0].ETAPA, 'ANALISE');
  assert.ok(!ctx.Frota_apiRastrCopiloto('sGestor', { dias: 30 }).sugestoes.some((s) => s.chave === cons.chave));
  assert.throws(() => ctx.Frota_apiRastrCopilotoDecidir('sGestor', { chave: 'CONSUMO|xx|2026-10', decisao: 'DESCARTAR', motivo: 'curto' }), /não aparece mais/);
  assert.equal(atividades.length, 0);
});

test('ponte do COMMAND: mapa só para a gestão do SGO+; pedidos da própria pessoa para todos', () => {
  const { ctx } = ambiente({ tabelas: { CAD_USUARIOS: [{ ID: 'uG', PERFIL: 'GESTOR', STATUS: 'ATIVO', NOME: 'GESTOR TESTE' }, { ID: 'uT', PERFIL: 'TECNICO', STATUS: 'ATIVO', NOME: 'TECNICO TESTE' }, { ID: 'uC', PERFIL: 'CLIENTE', STATUS: 'ATIVO' }] } });
  const t = ctx.FrotaR_ponte_('frota.painel', { sgoUsuarioId: 'uT' });
  assert.equal(t.ok, false);
  assert.match(t.erro, /só da gestão/);
  assert.equal(ctx.FrotaR_ponte_('frota.painel', { sgoUsuarioId: 'uC' }).ok, false);
  const g = ctx.FrotaR_ponte_('frota.painel', { sgoUsuarioId: 'uG' });
  assert.equal(g.ok, true);
  assert.equal(g.pronto, false);
  assert.equal(ctx.FrotaR_ponte_('frota.pedidos', { sgoUsuarioId: 'uT' }).ok, true);
});

test('relatório A4 da rota da retirada: documento com trajeto em SVG, números pt-BR e nota de privacidade', () => {
  const arm = armazemMemoria();
  const ontem = new Date(Date.now() - DIA);
  const ini = Date.UTC(ontem.getUTCFullYear(), ontem.getUTCMonth(), ontem.getUTCDate(), 13, 0); // 10:00 em Brasília, ontem
  const dataBr = new Date(ini).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  arm.gravar(rotaTeste(ini));
  const env = ambiente({ armazem: arm, tabelas: {
    CAD_VEICULOS: [{ ID: 'v1', PLACA: 'TST1A23', MODELO: 'Modelo teste', STATUS: 'ATIVO', RASTREADOR_DEVICE_ID: 'D1' }],
    CAD_CONDUTORES: [{ ID: 'c1', NOME: 'TECNICO TESTE', USUARIO_ID: 'uT', STATUS: 'ATIVO' }],
    REG_FROTA_MOVIMENTACAO: [{ ID: 'm1', VEICULO_ID: 'v1', CONDUTOR_ID: 'c1', STATUS: 'FINALIZADO', DATA_SAIDA: dataBr, HORA_SAIDA: '10:00', DATA_CHEGADA: dataBr, HORA_CHEGADA: '10:35',
      KM_SAIDA: 1000, KM_CHEGADA: 1021, CRIADO_EM: new Date(ini).toISOString(), FINALIZADO_EM: new Date(ini + 35 * 60000).toISOString(), FINALIDADE: 'Atendimento de teste' }]
  } });
  for (const f of ['SGO_DocA4.js', 'SGO_Documentos_RelatorioA4.js']) vm.runInContext(fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n'), env.ctx);
  const r = env.ctx.FrotaR_relRota_(SESSOES.sGestor, 'm1');
  assert.match(r.html, /Relatório de rota da retirada/);
  assert.match(r.html, /<svg[^>]*role="img"/);
  assert.match(r.html, /TST1A23/);
  assert.match(r.html, /130 km\/h/);
  assert.match(r.html, /registro é do veículo, não da pessoa/);
  assert.doesNotMatch(r.html, /\d+\.\d+ km(?!\/)/, 'número com ponto decimal no texto');
  assert.equal(r.analise.origem, 'PADRAO');
  assert.equal(env.tabelas.REG_FROTA_RASTREADOR_CONSULTAS.filter((x) => x.ACAO === 'RELATORIO').length, 1);
});

test('relatórios mensal, consumo e fora do expediente, Gantt, combustível e copiloto rodam com dados de teste', () => {
  const arm = armazemMemoria();
  const ontem = new Date(Date.now() - DIA);
  const noite = Date.UTC(ontem.getUTCFullYear(), ontem.getUTCMonth(), ontem.getUTCDate(), 23, 0); // 20:00 em Brasília
  arm.gravar(rotaTeste(noite));
  const dataBr = new Date(noite).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const comp = dataBr.slice(6) + '-' + dataBr.slice(3, 5);
  const env = ambiente({ armazem: arm, tabelas: {
    CAD_VEICULOS: [{ ID: 'v1', PLACA: 'TST1A23', MODELO: 'Modelo teste', STATUS: 'ATIVO', RASTREADOR_DEVICE_ID: 'D1', KM_ATUAL: 1021 }],
    CAD_CONDUTORES: [{ ID: 'c1', NOME: 'TECNICO TESTE', USUARIO_ID: 'uT', STATUS: 'ATIVO' }],
    REG_FROTA_MOVIMENTACAO: [{ ID: 'm1', VEICULO_ID: 'v1', CONDUTOR_ID: 'c1', STATUS: 'FINALIZADO', DATA_SAIDA: dataBr, HORA_SAIDA: '20:00', DATA_CHEGADA: dataBr, HORA_CHEGADA: '20:35',
      KM_SAIDA: 1000, KM_CHEGADA: 1021, CRIADO_EM: new Date(noite).toISOString(), FINALIZADO_EM: new Date(noite + 35 * 60000).toISOString() }],
    REG_FROTA_MANUTENCAO: [{ ID: 'mn1', VEICULO_ID: 'v1', TIPO: 'OLEO', DATA: dataBr, KM: 900, CUSTO: 300, PROXIMA_KM: 1500 }],
    REG_FROTA_ABASTECIMENTO: [{ ID: 'a1', VEICULO_ID: 'v1', DATA: dataBr, HORA: '20:12', KM: 1010, LITROS: 30, VALOR: 180 }]
  } });
  for (const f of ['SGO_DocA4.js', 'SGO_Documentos_RelatorioA4.js']) vm.runInContext(fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n'), env.ctx);
  const s = SESSOES.sGestor;
  const mes = env.ctx.FrotaR_relVeiculoMes_(s, 'v1', comp);
  assert.match(mes.html, /Relatório mensal do veículo/);
  assert.match(mes.html, /R\$\s480,00/); // a moldura A4 usa espaço que não quebra
  const cons = env.ctx.FrotaR_relConsumo_(s, env.ctx.FrotaR_diasAtrasBr_(30), env.ctx.FrotaR_hojeBr_());
  assert.match(cons.html, /Relatório de consumo da frota/);
  const fora = env.ctx.FrotaR_relForaExpediente_(s, env.ctx.FrotaR_diasAtrasBr_(7), env.ctx.FrotaR_hojeBr_());
  assert.match(fora.html, /Relatório de uso fora do expediente/);
  assert.match(fora.html, /TECNICO TESTE/);
  const g = env.ctx.Frota_apiRastrGantt('sGestor', {});
  assert.ok(g.linhas[0].itens.some((i) => i.tipo === 'RETIRADA'));
  assert.throws(() => env.ctx.Frota_apiRastrGantt('sTec', {}), /só da gestão/);
  const c = env.ctx.Frota_apiRastrCombustivel('sGestor', { comPosicao: true });
  const ab = c.abastecimentos.find((x) => x.id === 'a1');
  assert.equal(ab.posicao.situacao, 'COMPATIVEL');
  const cop = env.ctx.Frota_apiRastrCopiloto('sGestor', { dias: 30 });
  assert.equal(cop.ok, true);
  assert.ok(cop.sugestoes.some((x) => x.tipo === 'MANUTENCAO'), 'preventiva próxima pelo KM');
});
