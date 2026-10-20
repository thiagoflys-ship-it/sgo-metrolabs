// Frota, revisão de 19/10/2026: conferência do KM pelo rastreador por VARIAÇÃO (o hodômetro do aparelho conta
// desde a instalação e nunca é igual ao painel) e limiar de "parado" (ignição desligada com velocidade baixa é
// oscilação do GPS). Código real do SGO+ (SGO_Frota_Main.js e SGO_Frota_Rastreador.js) num contexto isolado.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

function ambiente(tabelasIniciais) {
  const tabelas = Object.assign({ CAD_VEICULOS: [], CAD_CONDUTORES: [], REG_FROTA_MOVIMENTACAO: [], REG_FROTA_AUDITORIA: [] }, tabelasIniciais || {});
  let seq = 0;
  const auditoria = [];
  const ctx = vm.createContext({
    console, Utilities: criarUtilities(), Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, hasLock: () => false, tryLock: () => true }) },
    CertCal_garantirTabela_: (t) => { tabelas[t] = tabelas[t] || []; }, CertCal_garantirColuna_() {}, CertCal_forcarColunaTexto_() {},
    SGO_DATA: {
      getDB: () => ({ getSheetByName: (n) => (tabelas[n] ? {} : null) }),
      getAll: (t) => (tabelas[t] || []).map((r) => Object.assign({}, r)),
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) return false; Object.assign(r, d); return true; },
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq) }, d); (tabelas[t] = tabelas[t] || []).push(r); if (t === 'REG_FROTA_AUDITORIA') auditoria.push(r); return r; },
      gerarRegistroBase: (o) => Object.assign({ ID: 'g' + (++seq), CRIADO_EM: new Date().toISOString() }, o),
      normalizarObjetoParaSheet: (t, o) => o,
      log() {}
    },
    SGO_CFG: { SHEETS: { CAD_VEICULOS: 'CAD_VEICULOS', CAD_CONDUTORES: 'CAD_CONDUTORES', REG_FROTA_MOVIMENTACAO: 'REG_FROTA_MOVIMENTACAO', CAD_USUARIOS: 'CAD_USUARIOS' } },
    exigirSessao: () => ({ userId: 'u1', perfil: 'GESTOR' }),
    isAdminSession: () => true
  });
  for (const f of ['SGO_Utilis.js', 'SGO_Frota_Config.js', 'SGO_Frota_Main.js', 'SGO_Frota_Rastreador.js']) {
    vm.runInContext(fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n'), ctx);
  }
  return { ctx, tabelas, auditoria };
}

const mov = (o) => Object.assign({ ID: 'm1', VEICULO_ID: 'v1', CONDUTOR_ID: 'c1', STATUS: 'FINALIZADO', DATA_SAIDA: '18/10/2026', HORA_SAIDA: '08:00',
  DATA_CHEGADA: '18/10/2026', HORA_CHEGADA: '12:00', CRIADO_EM: '2026-10-18T11:00:00.000Z' }, o);

test('KM pelo rastreador: o hodômetro do aparelho (26.238) longe do painel (189.561) não gera alerta; vale o KM rodado', () => {
  const { ctx } = ambiente();
  // Caso da captura do dono: hodômetro do aparelho 26.238 e KM registrado 189.561; rodou 120 km pelo painel e 118 pelo aparelho.
  const r = ctx.Rastreador_kmRodadoConferencia_(mov({ KM_SAIDA: 189561, KM_CHEGADA: 189681, KM_RASTREADOR_SAIDA: 26238, KM_RASTREADOR_CHEGADA: 26356 }));
  assert.equal(r.fonte, 'HODOMETRO');
  assert.equal(r.rodadoInformado, 120);
  assert.equal(r.rodadoRastreador, 118);
  assert.equal(r.divergente, false);
  // Diferença real no KM rodado (informou 40 km, o aparelho mediu 118): conferir.
  const r2 = ctx.Rastreador_kmRodadoConferencia_(mov({ KM_SAIDA: 189561, KM_CHEGADA: 189601, KM_RASTREADOR_SAIDA: 26238, KM_RASTREADOR_CHEGADA: 26356 }));
  assert.equal(r2.divergente, true);
  assert.equal(r2.dif, -78);
  assert.match(ctx.Rastreador_textoConferencia_(mov({ KM_SAIDA: 189561, KM_CHEGADA: 189601 }), r2), /KM rodado informado 40 km .* rastreador 118 km .*de 26\.238 a 26\.356.*diferença de -78 km/);
});

test('KM pelo rastreador: aparelho trocado no meio (hodômetro voltou) usa a distância do período; sem dados não compara', () => {
  const { ctx } = ambiente();
  const r = ctx.Rastreador_kmRodadoConferencia_(mov({ KM_SAIDA: 1000, KM_CHEGADA: 1050, KM_RASTREADOR_SAIDA: 500, KM_RASTREADOR_CHEGADA: 10, KM_RASTREADOR_RODADO: 49 }));
  assert.equal(r.fonte, 'RESUMO');
  assert.equal(r.divergente, false);
  assert.equal(ctx.Rastreador_kmRodadoConferencia_(mov({ KM_SAIDA: 1000, KM_CHEGADA: 1050 })), null);
  assert.equal(ctx.Rastreador_kmRodadoConferencia_(mov({ STATUS: 'EM_ANDAMENTO', KM_SAIDA: 1000, KM_RASTREADOR_SAIDA: 26238 })), null);
});

test('KM a conferir: divergência antiga gravada pela regra absoluta não aparece; a do KM rodado aparece uma vez', () => {
  const { ctx } = ambiente({
    CAD_VEICULOS: [{ ID: 'v1', PLACA: 'TST1A23', KM_ATUAL: 189681, STATUS: 'ATIVO' }],
    CAD_CONDUTORES: [{ ID: 'c1', NOME: 'CONDUTOR TESTE', USUARIO_ID: 'u9' }],
    REG_FROTA_MOVIMENTACAO: [
      // regra antiga: divergência de saída "163.323 km" (absoluta) e de chegada, com o KM rodado coerente: nada a conferir
      mov({ ID: 'antiga', KM_SAIDA: 189561, KM_CHEGADA: 189681, KM_RASTREADOR_SAIDA: 26238, KM_RASTREADOR_CHEGADA: 26356, KM_RASTREADOR_DIVERGENCIA_SAIDA: 163323, KM_RASTREADOR_DIVERGENCIA_CHEGADA: 163325 }),
      mov({ ID: 'real', KM_SAIDA: 189681, KM_CHEGADA: 189700, KM_RASTREADOR_SAIDA: 26356, KM_RASTREADOR_CHEGADA: 26456 }),
      mov({ ID: 'conferida', KM_SAIDA: 189700, KM_CHEGADA: 189710, KM_RASTREADOR_SAIDA: 26456, KM_RASTREADOR_CHEGADA: 26556, KM_CONFERIDO_RASTREADOR_CHEGADA_EM: '2026-10-18T13:00:00Z' })
    ]
  });
  const lista = ctx.Frota_kmAConferir_();
  assert.deepEqual(Array.from(lista, (k) => k.movimentacaoId + ':' + k.etapa), ['real:RASTREADOR_CHEGADA']);
  assert.match(lista[0].motivo, /KM rodado informado 19 km .* 100 km/);
});

test('Devolução: o hodômetro da saída é só guardado; na chegada compara a variação e grava o KM rodado do aparelho', () => {
  const { ctx, tabelas, auditoria } = ambiente({ REG_FROTA_MOVIMENTACAO: [mov({ STATUS: 'EM_ANDAMENTO', KM_SAIDA: 189561 })] });
  const veiculo = { ID: 'v1', PLACA: 'TST1A23' };
  const m = Object.assign({}, tabelas.REG_FROTA_MOVIMENTACAO[0]);
  const s = ctx.Rastreador_conferirKm_(m, veiculo, 'SAIDA', { odometroKm: 26238 }, null);
  assert.equal(s.divergente, false);
  assert.equal(tabelas.REG_FROTA_MOVIMENTACAO[0].KM_RASTREADOR_SAIDA, 26238);
  assert.equal(tabelas.REG_FROTA_MOVIMENTACAO[0].KM_RASTREADOR_DIVERGENCIA_SAIDA, undefined);
  Object.assign(tabelas.REG_FROTA_MOVIMENTACAO[0], { STATUS: 'FINALIZADO', KM_CHEGADA: 189681 });
  const m2 = Object.assign({}, tabelas.REG_FROTA_MOVIMENTACAO[0]);
  const c = ctx.Rastreador_conferirKm_(m2, veiculo, 'CHEGADA', { odometroKm: 26358 }, null);
  assert.equal(c.divergente, false);
  assert.equal(tabelas.REG_FROTA_MOVIMENTACAO[0].KM_RASTREADOR_RODADO, 120);
  assert.equal(auditoria.length, 0);
  // Sem o hodômetro da saída: pede a conferência pela distância do período.
  const { ctx: ctx2, tabelas: t2 } = ambiente({ REG_FROTA_MOVIMENTACAO: [mov({ KM_SAIDA: 100, KM_CHEGADA: 150 })] });
  const r = ctx2.Rastreador_conferirKm_(Object.assign({}, t2.REG_FROTA_MOVIMENTACAO[0]), veiculo, 'CHEGADA', { odometroKm: 26358 }, null);
  assert.equal(r.precisaResumo, true);
  assert.equal(ctx2.Rastreador_kmChegadaFeito_(t2.REG_FROTA_MOVIMENTACAO[0]), false);
});

test('Parado: ignição desligada a 11 km/h é oscilação do GPS (parado, não é uso); 5 km/h é o limiar com ignição ligada', () => {
  const { ctx } = ambiente();
  const nos = (kmh) => ({ speed: kmh / 1.852, deviceId: 7, fixTime: new Date().toISOString(), attributes: {} });
  // velocidade da API vem em nós: 5,94 nós = 11 km/h
  const p = ctx.Rastreador_posicao_(Object.assign(nos(11), { attributes: { ignition: false } }));
  assert.equal(p.kmh, 11);
  const m = ctx.Rastreador_movimento_(p);
  assert.equal(m.estado, 'PARADO');
  assert.equal(m.deriva, true);
  assert.match(m.texto, /parado, ignição desligada .*oscilação/);
  assert.equal(ctx.Rastreador_movimento_(ctx.Rastreador_posicao_(Object.assign(nos(4), { attributes: { ignition: true } }))).estado, 'LIGADO');
  assert.equal(ctx.Rastreador_movimento_(ctx.Rastreador_posicao_(Object.assign(nos(6), { attributes: { ignition: true } }))).estado, 'ANDANDO');
  assert.equal(ctx.Rastreador_movimento_(ctx.Rastreador_posicao_(Object.assign(nos(4), { attributes: {} }))).estado, 'PARADO');
  assert.equal(ctx.Rastreador_movimento_(ctx.Rastreador_posicao_(Object.assign(nos(30), { attributes: { ignition: false } }))).estado, 'ANDANDO');
});

test('Bloqueio nunca com o veículo andando; com oscilação do GPS espera a velocidade marcar menos de 5 km/h', () => {
  const { ctx } = ambiente();
  const agora = new Date().toISOString();
  const pos = (kmh, ign, mov) => ctx.Rastreador_posicao_({ speed: kmh / 1.852, deviceId: 7, fixTime: agora, attributes: { ignition: ign, motion: mov } });
  assert.equal(ctx.Rastreador_avaliarParado_(pos(60, true)).pode, false);
  assert.equal(ctx.Rastreador_avaliarParado_(pos(3, true)).pode, false);
  const deriva = ctx.Rastreador_avaliarParado_(pos(11, false));
  assert.equal(deriva.pode, false);
  assert.match(deriva.motivo, /oscilação do sinal.*menos de 5 km\/h/);
  assert.equal(ctx.Rastreador_avaliarParado_(pos(2, false)).pode, true);
  assert.equal(ctx.Rastreador_avaliarParado_(pos(2, false, true)).pode, false);
  const velha = ctx.Rastreador_posicao_({ speed: 0, deviceId: 7, fixTime: new Date(Date.now() - 3600000).toISOString(), attributes: { ignition: false } });
  assert.equal(ctx.Rastreador_avaliarParado_(velha).pode, false);
});

test('Vínculo gravado de novo responde "Vínculo já estava gravado" e não grava nada', () => {
  const { ctx, tabelas } = ambiente({ CAD_VEICULOS: [{ ID: 'v1', PLACA: 'TST1A23', RASTREADOR_DEVICE_ID: '77', RASTREADOR_DEVICE_NOME: 'TST1A23 aparelho' }] });
  const r = ctx.Rastreador_vincular_({ userId: 'u1', nome: 'GESTOR' }, 'v1', '77');
  assert.equal(r.semMudanca, true);
  assert.match(r.mensagem, /^Vínculo já estava gravado/);
  assert.equal(tabelas.REG_FROTA_AUDITORIA.length, 0);
});

test('Texto de acesso somente leitura: uma frase com o que funciona e o que não funciona, sem nome de empresa', () => {
  const { ctx } = ambiente();
  const t = ctx.RASTR_TEXTO_SOMENTE_LEITURA;
  assert.match(t, /^Acesso somente leitura: funcionam .*; não funciona bloquear nem liberar a partida/);
  assert.equal((t.match(/\./g) || []).length, 1);
  assert.doesNotMatch(t, /iTracker/);
});
