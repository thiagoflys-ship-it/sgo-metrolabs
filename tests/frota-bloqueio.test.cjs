// Frota, bloqueio e liberação da partida (21/10/2026): a regra do estudo aprovado (docs/BLOQUEIO_PARTIDA_ESTUDO_20261021.md)
// e as decisões do dono, no código real do SGO+ (SGO_Frota_Bloqueio.js, SGO_Frota_Rastreador.js, SGO_Frota_Main.js) num contexto
// isolado, com a API da iTracker SIMULADA (nenhum comando real) e dados fictícios. No fim, os cenários do simulador do estudo
// rodam com a função de decisão real do SGO+ (invariantes: zero corte em trânsito, ninguém bloqueia o carro de quem está com
// ele, ninguém tira o carro de quem está com ele).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n');

const BASE = { lat: -10.5, lon: -40.5 };      // coordenadas fictícias
const LONGE = { lat: -10.6, lon: -40.6 };      // ~15 km da base
const GESTOR = { userId: 'uG', usuario: 'gestora', nome: 'GESTORA TESTE', perfil: 'GESTOR' };
const DIRETORIA = { userId: 'uD', usuario: 'dir', nome: 'DIRETORIA TESTE', perfil: 'DIRETORIA' };
const RH = { userId: 'uR', usuario: 'rh', nome: 'RH TESTE', perfil: 'RH' };
const TEC_A = { userId: 'uA', usuario: 'tecA', nome: 'CONDUTOR A', perfil: 'TECNICO' };
const TEC_B = { userId: 'uB', usuario: 'tecB', nome: 'CONDUTOR B', perfil: 'TECNICO' };

function frota() {
  return {
    CAD_VEICULOS: [
      { ID: 'v1', PLACA: 'TST1A11', MODELO: 'Onix', MARCA: 'Chevrolet', COR: 'Branca', KM_ATUAL: 1000, STATUS: 'ATIVO', APELIDO: 'Onça', BASE: 'Goiânia', RASTREADOR_DEVICE_ID: '1039' },
      { ID: 'v2', PLACA: 'TST2B22', MODELO: 'Montana', MARCA: 'Chevrolet', COR: 'Prata', KM_ATUAL: 5000, STATUS: 'ATIVO', APELIDO: 'Tucano', BASE: 'Goiânia', RASTREADOR_DEVICE_ID: '872' }
    ],
    CAD_CONDUTORES: [
      { ID: 'cA', NOME: 'CONDUTOR A', USUARIO_ID: 'uA', STATUS: 'ATIVO', CNH_VALIDADE: '31/12/2099' },
      { ID: 'cB', NOME: 'CONDUTOR B', USUARIO_ID: 'uB', STATUS: 'ATIVO', CNH_VALIDADE: '31/12/2099' },
      { ID: 'cV', NOME: 'CONDUTOR VENCIDO', USUARIO_ID: 'uV', STATUS: 'ATIVO', CNH_VALIDADE: '01/01/2020' }
    ],
    CAD_USUARIOS: [{ ID: 'uG', PERFIL: 'GESTOR', STATUS: 'ATIVO' }, { ID: 'uD', PERFIL: 'DIRETORIA', STATUS: 'ATIVO' }],
    REG_FROTA_MOVIMENTACAO: []
  };
}

function ambiente(o) {
  o = o || {};
  const tabelas = Object.assign({ REG_FROTA_AUDITORIA: [] }, frota(), o.tabelas || {});
  const props = Object.assign({ RASTREADOR_LIGADO: '1', RASTREADOR_TOKEN_COMANDOS: 'tk-teste', RASTREADOR_BLOQUEIO_LIGADO: '1',
    FROTA_BASES_AREA: JSON.stringify({ 'Goiânia': { lat: BASE.lat, lon: BASE.lon, raioM: 300 } }) }, o.props || {});
  Object.keys(props).forEach((k) => { if (props[k] === null) delete props[k]; });
  const cache = {};
  // status: situação de cada aparelho no GET /devices (padrão: online, último contato agora)
  const api = { posicoes: {}, status: {}, respostaComando: 200, pedidos: [], respostaHodometro: 204 };
  const notificacoes = [];
  const sessao = { atual: o.sessao || GESTOR };
  let seq = 0;
  const cabecalhos = Object.assign({}, o.cabecalhos || {});
  const resposta =(code, corpo) => ({ getResponseCode: () => code, getContentText: () => (corpo === undefined ? '' : JSON.stringify(corpo)), getAllHeaders: () => ({}) });
  const ctx = vm.createContext({
    console,
    Utilities: criarUtilities({ DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (alg, txt) => Array.from(crypto.createHash('sha256').update(String(txt), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)) }),
    Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k === 'RASTR_ULTIMAS_POSICOES_MS' || k === 'RASTR_ULTIMA_CHAMADA_MS' || k === 'FBLQ_CONEXOES_V1' ? null : (k in cache ? cache[k] : null)), put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, hasLock: () => false, tryLock: () => true }) },
    SpreadsheetApp: { flush() {} },
    UrlFetchApp: {
      fetch(url, op) {
        const metodo = String(op.method || 'get').toUpperCase();
        const u = new URL(url);
        const corpo = op.payload ? JSON.parse(op.payload) : null;
        api.pedidos.push({ metodo, caminho: u.pathname.replace(/^\/v1/, ''), corpo, auth: op.headers.Authorization });
        if (u.pathname.endsWith('/devices')) {
          if (api.respostaDevices) return resposta(api.respostaDevices);
          // nome na iTracker de propósito diferente da placa do SGO+ (o casamento é só pelo ID do aparelho)
          return resposta(200, Object.keys(api.posicoes).map((d) => { const st = Object.assign({ status: 'online', min: 0 }, api.status[d]); return { id: Number(d), name: 'Placa diferente ' + d, status: st.status, lastUpdate: new Date(Date.now() - st.min * 60000).toISOString() }; }));
        }
        if (u.pathname.endsWith('/positions')) {
          const dev = u.searchParams.get('deviceId');
          return resposta(200, Object.values(api.posicoes).filter((p) => !dev || String(p.deviceId) === dev));
        }
        if (u.pathname.endsWith('/commands')) return resposta(api.respostaComando, { ok: true });
        if (u.pathname.endsWith('/accumulators')) return resposta(api.respostaHodometro);
        if (u.pathname.endsWith('/reports/events')) return resposta(200, []);
        return resposta(404);
      }
    },
    // Como a planilha real: garantirTabela_ só cria aba nova (não acrescenta coluna a aba existente) e a gravação de
    // coluna que não está no cabeçalho é descartada em silêncio (achado em produção, 22/10/2026).
    CertCal_garantirTabela_: (t, cols) => { if (!tabelas[t]) { tabelas[t] = []; cabecalhos[t] = (cols || []).slice(); } },
    CertCal_garantirColuna_: (t, c) => { if (cabecalhos[t] && cabecalhos[t].indexOf(c) < 0) cabecalhos[t].push(c); }, CertCal_forcarColunaTexto_() {},
    SGO_DATA: {
      getDB: () => ({ getSheetByName: (n) => (tabelas[n] ? {} : null) }),
      getAll: (t) => (tabelas[t] || []).map((r) => Object.assign({}, r)),
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) return false; Object.keys(d).forEach((k) => { if (!cabecalhos[t] || cabecalhos[t].indexOf(k) >= 0) r[k] = d[k]; }); return true; },
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq) }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
      remove: () => { throw new Error('apagar é proibido'); },
      gerarRegistroBase: (x) => Object.assign({ ID: 'g' + (++seq), CRIADO_EM: new Date().toISOString() }, x),
      normalizarObjetoParaSheet: (t, x) => x,
      log() {}
    },
    SGO_CFG: { SHEETS: { CAD_VEICULOS: 'CAD_VEICULOS', CAD_CONDUTORES: 'CAD_CONDUTORES', CAD_USUARIOS: 'CAD_USUARIOS', REG_FROTA_MOVIMENTACAO: 'REG_FROTA_MOVIMENTACAO' } },
    exigirSessao: () => sessao.atual,
    isAdminSession: () => ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(sessao.atual.perfil),
    SGO_ehGestaoRotina_: (p) => ['RH', 'FINANCEIRO'].includes(String(p).toUpperCase()),
    SGO_notificar_: (x) => { notificacoes.push(x); return { ok: 1, erro: 0, pulado: 0 }; }
  });
  for (const f of ['SGO_Utilis.js', 'SGO_Frota_Config.js', 'SGO_Frota_Main.js', 'SGO_Frota_Identificacao.js', 'SGO_Frota_Rastreador.js', 'SGO_Frota_Bloqueio.js']) vm.runInContext(ler(f), ctx);
  const posicao = (dev, x) => {
    delete cache.RASTR_POSICOES_V2; // posição nova = leitura nova (a guardada vale 60 s no sistema)
    x = Object.assign({ min: 0, kmh: 0, ign: false, blocked: false, onde: BASE, odometroKm: null }, x);
    api.posicoes[dev] = { deviceId: Number(dev), fixTime: new Date(Date.now() - x.min * 60000).toISOString(), speed: x.kmh / 1.852, latitude: x.onde.lat, longitude: x.onde.lon,
      attributes: Object.assign({ ignition: x.ign, motion: x.kmh > 0, blocked: x.blocked }, x.odometroKm !== null ? { odometer: x.odometroKm * 1000 } : {}) };
    return ctx.Rastreador_posicao_(api.posicoes[dev]);
  };
  const comandos = () => api.pedidos.filter((p) => p.metodo !== 'GET');
  const estado = (vid) => (tabelas.REG_FROTA_BLOQUEIO_ESTADO || []).find((e) => e.VEICULO_ID === vid);
  const eventos = () => tabelas.REG_FROTA_BLOQUEIO_EVENTOS || [];
  const cfg = () => ctx.FrotaBlq_cfg_();
  const veic = (id) => tabelas.CAD_VEICULOS.find((v) => v.ID === id);
  const abrir = (vid, cond) => { const m = { ID: 'm' + (++seq), VEICULO_ID: vid, CONDUTOR_ID: cond, STATUS: 'EM_ANDAMENTO', DATA_SAIDA: '21/10/2026', HORA_SAIDA: '08:00', KM_SAIDA: 1000, CRIADO_EM: new Date(Date.now() - 3600000).toISOString() }; tabelas.REG_FROTA_MOVIMENTACAO.push(m); return m; };
  const fechar = (m, km) => { Object.assign(m, { STATUS: 'FINALIZADO', FINALIZADO_EM: new Date().toISOString(), KM_CHEGADA: km || 1050 }); return m; };
  const rodada = () => ctx.FrotaBlq_rodada_(cfg(), Object.fromEntries(Object.keys(api.posicoes).map((d) => [d, ctx.Rastreador_posicao_(api.posicoes[d])])), tabelas.CAD_VEICULOS, tabelas.REG_FROTA_MOVIMENTACAO, Date.now());
  return { ctx, tabelas, props, api, notificacoes, sessao, posicao, comandos, estado, eventos, cfg, veic, abrir, fechar, rodada };
}

// ------------------------------------------------------------------ regra pura
test('Regra: o bloqueio só sai com o aparelho conectado agora, parado e desligado; nunca andando, ligado, sem ignição, offline ou desconhecido', () => {
  const { ctx } = ambiente();
  const agora = Date.now();
  const pos = (x) => Object.assign({ quandoMs: agora - 30000, quandoTexto: 'agora', kmh: 0, ignicao: false, movimento: false }, x);
  const base = { agora, modo: 'ATIVO', triagem: 'BLOQUEIO_ATIVO', aberta: false, emergencia: false, pedido: { situacao: 'AGUARDANDO' }, naBase: true, rele: 'LIBERADO', ultimo: null,
    conexao: { online: true, ultimoMs: agora - 40000 } };
  assert.equal(ctx.FrotaBlq_decidir_(Object.assign({}, base, { pos: pos() })).acao, 'BLOQUEAR');
  for (const [x, motivo] of [[{ kmh: 30, ignicao: true, movimento: true }, /andando/], [{ kmh: 8, ignicao: false }, /andando/], [{ ignicao: true }, /ignição está ligada/], [{ ignicao: null }, /não informa a ignição/],
    [{ kmh: null }, /velocidade/]]) {
    const d = ctx.FrotaBlq_decidir_(Object.assign({}, base, { pos: pos(x) }));
    assert.equal(d.acao, '', JSON.stringify(x));
    assert.match(d.espera, motivo);
  }
  assert.equal(ctx.FrotaBlq_decidir_(Object.assign({}, base, { pos: null })).acao, '');
  // conexão (GET /devices): offline, sem contato há mais de 2 min ou desconhecida = espera
  for (const [conexao, motivo] of [[{ online: false, ultimoMs: agora - 30000 }, /offline/], [{ online: true, ultimoMs: agora - 3 * 60000 }, /há mais de 2 minutos/], [null, /desconhecida/]]) {
    const d = ctx.FrotaBlq_decidir_(Object.assign({}, base, { pos: pos(), conexao }));
    assert.equal(d.acao, '', JSON.stringify(conexao));
    assert.match(d.espera, motivo);
  }
  // economia do rastreador: carro desligado há 5 h (última posição antiga) e aparelho online = bloqueia
  assert.equal(ctx.FrotaBlq_decidir_(Object.assign({}, base, { pos: pos({ quandoMs: agora - 5 * 3600000 }) })).acao, 'BLOQUEAR');
  assert.equal(ctx.FrotaBlq_decidir_(Object.assign({}, base, { pos: pos({ quandoMs: agora - 5 * 3600000, ignicao: true }) })).acao, '', 'última posição com a ignição ligada: não');
  // retirada aberta: libera, nunca bloqueia (mesmo com pedido antigo e carro parado)
  assert.equal(ctx.FrotaBlq_decidir_(Object.assign({}, base, { aberta: true, rele: 'BLOQUEADO', pos: pos() })).acao, 'LIBERAR');
  assert.equal(ctx.FrotaBlq_decidir_(Object.assign({}, base, { aberta: true, rele: 'LIBERADO', pos: pos() })).acao, '');
  // emergência: idem
  assert.equal(ctx.FrotaBlq_decidir_(Object.assign({}, base, { emergencia: true, rele: 'BLOQUEADO', pos: pos() })).acao, 'LIBERAR');
  // fora da base: decisão da gestão; autorizado: bloqueia nas mesmas condições
  const fora = ctx.FrotaBlq_decidir_(Object.assign({}, base, { naBase: false, pos: pos() }));
  assert.equal(fora.acao, ''); assert.equal(fora.decisaoGestao, true);
  assert.equal(ctx.FrotaBlq_decidir_(Object.assign({}, base, { naBase: false, pedido: { situacao: 'AUTORIZADO' }, pos: pos() })).acao, 'BLOQUEAR');
  assert.equal(ctx.FrotaBlq_decidir_(Object.assign({}, base, { naBase: false, pedido: { situacao: 'AUTORIZADO' }, pos: pos({ kmh: 40, ignicao: true }) })).acao, '', 'autorizado, mas andando: espera');
  assert.equal(ctx.FrotaBlq_decidir_(Object.assign({}, base, { pedido: { situacao: 'NAO_BLOQUEAR' }, pos: pos() })).acao, '');
  // "Só avisa": nunca envia bloqueio
  const so = ctx.FrotaBlq_decidir_(Object.assign({}, base, { triagem: 'SO_AVISA', pos: pos() }));
  assert.equal(so.acao, ''); assert.equal(so.soAvisa, true);
  // não repete o mesmo comando em sequência sem resultado
  assert.equal(ctx.FrotaBlq_decidir_(Object.assign({}, base, { pos: pos(), ultimo: { acao: 'BLOQUEAR', emMs: agora - 60000, resultado: 'ENTREGUE' } })).acao, '');
  assert.equal(ctx.FrotaBlq_decidir_(Object.assign({}, base, { pos: pos(), ultimo: { acao: 'BLOQUEAR', emMs: agora - 5 * 60000, resultado: 'SEM_CONFIRMACAO' } })).acao, 'BLOQUEAR', 'sem confirmação depois de 4 min: pode reenviar nas condições seguras');
  // conferência: carro sem retirada e liberado, na base, parado e desligado = bloqueio; relé desconhecido = nada
  assert.equal(ctx.FrotaBlq_decidir_(Object.assign({}, base, { pedido: null, pos: pos() })).conferencia, true);
  assert.equal(ctx.FrotaBlq_decidir_(Object.assign({}, base, { pedido: null, rele: '', pos: pos() })).acao, '');
  assert.equal(ctx.FrotaBlq_decidir_(Object.assign({}, base, { pedido: null, naBase: false, pos: pos() })).acao, '', 'conferência fora da base não bloqueia');
  assert.equal(ctx.FrotaBlq_decidir_(Object.assign({}, base, { modo: 'DESLIGADO', pos: pos() })).acao, '');
  // aparelho que não informa o relé: comando entregue não se repete em sequência
  assert.equal(ctx.FrotaBlq_decidir_(Object.assign({}, base, { aberta: true, rele: '', pos: pos(), ultimo: { acao: 'LIBERAR', emMs: agora - 20 * 60000, resultado: 'SEM_CONFIRMACAO' } })).acao, '');
  assert.equal(ctx.FrotaBlq_decidir_(Object.assign({}, base, { rele: '', pedido: { situacao: 'AGUARDANDO', desdeMs: agora - 30 * 60000 }, pos: pos(), ultimo: { acao: 'BLOQUEAR', emMs: agora - 20 * 60000, resultado: 'ENTREGUE' } })).acao, '');
});

// ------------------------------------------------------------------ configuração inicial e modos
test('Configuração inicial: aparelho do piloto em Ativo, os outros em Simulação; Ativo só envia com a chave e o bloqueio ligados', () => {
  const a = ambiente({ props: { RASTREADOR_BLOQUEIO_LIGADO: null } });
  const e1 = a.ctx.FrotaBlq_estadoDe_(a.veic('v1')), e2 = a.ctx.FrotaBlq_estadoDe_(a.veic('v2'));
  assert.equal(e1.MODO, 'ATIVO'); assert.equal(e2.MODO, 'SIMULACAO');
  const me = a.ctx.FrotaBlq_modoEfetivo_('ATIVO', a.cfg());
  assert.equal(me.modo, 'SIMULACAO');
  assert.match(me.motivo, /Bloqueio da partida pelo SGO\+.*Desligado/);
  // sem a chave dos comandos: também simulação, e nada além de GET sai do servidor
  const b = ambiente({ props: { RASTREADOR_TOKEN_COMANDOS: null, RASTREADOR_TOKEN: 'leitura' } });
  assert.equal(b.ctx.FrotaBlq_modoEfetivo_('ATIVO', b.cfg()).modo, 'SIMULACAO');
  assert.throws(() => b.ctx.Rastreador_chamar_(b.ctx.Rastreador_cfg_(), 'post', '/commands', [], { id: 35, deviceId: 1039 }, { comando: true }), /somente leitura/);
  // com tudo ligado: Ativo de verdade; a chave dos comandos também lê quando a de leitura falta
  const c = ambiente();
  assert.equal(c.ctx.FrotaBlq_modoEfetivo_('ATIVO', c.cfg()).modo, 'ATIVO');
  assert.equal(c.ctx.Rastreador_cfg_().token, 'tk-teste');
});

// ------------------------------------------------------------------ retirada
test('Retirada libera (POST /commands id 36); 202 = liberação aguardando sinal, avisa condutor e gestão, nunca conta como feita', () => {
  const a = ambiente();
  const m = a.abrir('v1', 'cA');
  const pos = a.posicao('1039', { blocked: true });
  const r = a.ctx.FrotaBlq_aoRetirar_(a.cfg(), TEC_A, a.veic('v1'), m, pos);
  const cmd = a.comandos();
  assert.equal(cmd.length, 1);
  assert.deepEqual(cmd[0].corpo, { id: 36, deviceId: 1039 });
  assert.equal(cmd[0].caminho, '/commands');
  assert.equal(cmd[0].auth, 'Bearer tk-teste');
  assert.equal(r.liberado, true);
  assert.equal(a.estado('v1').ULT_CMD_RESULTADO, 'ENTREGUE');
  // confirmação pelo relé na posição seguinte
  a.posicao('1039', { blocked: false });
  a.rodada();
  assert.equal(a.estado('v1').ULT_CMD_RESULTADO, 'CONFIRMADO');
  assert.equal(a.estado('v1').RELE_REAL, 'LIBERADO');

  const b = ambiente();
  b.api.respostaComando = 202;
  const m2 = b.abrir('v1', 'cA');
  const pos2 = b.posicao('1039', { blocked: true, min: 20 });
  b.api.status['1039'] = { status: 'offline', min: 20 };
  const r2 = b.ctx.FrotaBlq_aoRetirar_(b.cfg(), TEC_A, b.veic('v1'), m2, pos2);
  assert.equal(r2.situacao, 'NA_FILA');
  assert.match(r2.aviso, /aguardando sinal/);
  assert.equal(b.estado('v1').ULT_CMD_RESULTADO, 'NA_FILA');
  assert.ok(b.notificacoes.some((n) => n.evento === 'S36'), 'gestão avisada');
  assert.ok(b.notificacoes.some((n) => n.evento === 'S59' && n.usuarios.includes('uA')), 'condutor avisado');
  // a rotina não reenvia na fila enquanto o carro está sem sinal
  b.rodada();
  assert.equal(b.comandos().length, 1);
});

// ------------------------------------------------------------------ devolução
test('Devolução na base: bloqueio sai só com o carro conectado, parado e desligado; andando espera a conferência; nova retirada cancela', () => {
  const a = ambiente();
  const m = a.fechar(a.abrir('v1', 'cA'));
  // carro ainda andando (alguém seguiu com ele): nada sai
  let pos = a.posicao('1039', { kmh: 35, ign: true, onde: BASE });
  let r = a.ctx.FrotaBlq_aoDevolver_(a.cfg(), TEC_A, a.veic('v1'), m, pos, false);
  assert.equal(a.comandos().length, 0);
  assert.match(r.texto, /pedido/);
  assert.equal(a.estado('v1').PEDIDO_SITUACAO, 'AGUARDANDO');
  assert.match(a.estado('v1').PEDIDO_MOTIVO, /andando/);
  // parado e ligado: espera
  a.posicao('1039', { kmh: 0, ign: true });
  a.rodada();
  assert.equal(a.comandos().length, 0);
  // parado e desligado na base: bloqueia
  a.posicao('1039', { kmh: 0, ign: false });
  a.rodada();
  assert.equal(a.comandos().length, 1);
  assert.deepEqual(a.comandos()[0].corpo, { id: 35, deviceId: 1039 });
  const env = a.eventos().filter((e) => e.TIPO === 'ENVIO');
  assert.match(env[env.length - 1].CONDICAO, /aparelho conectado .* parado e com a ignição desligada \(última posição .*\); na base Goiânia/);
  // relé confirma: pedido encerrado
  a.posicao('1039', { blocked: true });
  a.rodada();
  assert.equal(a.estado('v1').PEDIDO_ACAO, '');
  assert.equal(a.estado('v1').RELE_REAL, 'BLOQUEADO');
  // nova devolução pedida e, antes de sair, nova retirada: pedido cancelado
  const b = ambiente();
  const posB = b.posicao('1039', { min: 10 });
  b.api.status['1039'] = { status: 'offline', min: 10 };
  b.ctx.FrotaBlq_aoDevolver_(b.cfg(), TEC_A, b.veic('v1'), b.fechar(b.abrir('v1', 'cA')), posB, false);
  assert.equal(b.estado('v1').PEDIDO_SITUACAO, 'AGUARDANDO');
  b.ctx.FrotaBlq_aoRetirar_(b.cfg(), TEC_B, b.veic('v1'), b.abrir('v1', 'cB'), null);
  assert.equal(b.estado('v1').PEDIDO_ACAO, '');
  assert.ok(b.eventos().some((e) => e.TIPO === 'CANCELADO' && /nova retirada/.test(e.DETALHE)));
  assert.deepEqual(b.comandos().map((c) => c.corpo.id), [36], 'só a liberação saiu');
});

test('Bloqueio com resposta 202 nunca vira "bloqueado": pedido continua aberto, gestão avisada, e a retirada seguinte manda a liberação', () => {
  const a = ambiente();
  a.api.respostaComando = 202;
  a.ctx.FrotaBlq_aoDevolver_(a.cfg(), TEC_A, a.veic('v1'), a.fechar(a.abrir('v1', 'cA')), a.posicao('1039'), false);
  assert.equal(a.comandos().length, 1);
  const e = a.estado('v1');
  assert.equal(e.ULT_CMD_RESULTADO, 'NA_FILA');
  assert.notEqual(e.RELE_REAL, 'BLOQUEADO');
  assert.equal(e.PEDIDO_ACAO, 'BLOQUEAR', 'pedido não é dado como feito');
  assert.ok(a.notificacoes.some((n) => n.evento === 'S63'));
  const pend = [];
  vm.runInContext('var Pend_abaExiste_ = function (t) { return true; }; var Pend_ler_ = function (t) { return SGO_DATA.getAll(t); }; var Pend_s_ = function (v) { return String(v === undefined || v === null ? "" : v); }; var Pend_item_ = function (tipo, o) { return Object.assign({ tipo: tipo }, o); };', a.ctx);
  a.ctx.FrotaBlq_pendencias_((x) => pend.push(x));
  assert.ok(pend.some((p) => p.tipo === 'frota_bloqueio_fila'));
  // nova retirada com o bloqueio na fila: liberação sai logo em seguida
  a.api.respostaComando = 202;
  a.ctx.FrotaBlq_aoRetirar_(a.cfg(), TEC_B, a.veic('v1'), a.abrir('v1', 'cB'), null);
  assert.deepEqual(a.comandos().map((c) => c.corpo.id), [35, 36]);
});

test('Devolução fora da base: não bloqueia sozinho; a gestão decide (Caixa de decisões) e o bloqueio autorizado segue as condições', () => {
  const a = ambiente();
  a.ctx.FrotaBlq_aoDevolver_(a.cfg(), TEC_A, a.veic('v1'), a.fechar(a.abrir('v1', 'cA')), a.posicao('1039', { onde: LONGE }), false);
  assert.equal(a.comandos().length, 0);
  assert.equal(a.estado('v1').PEDIDO_SITUACAO, 'AGUARDANDO_GESTAO');
  assert.ok(a.notificacoes.some((n) => n.evento === 'S60'));
  a.rodada();
  assert.equal(a.comandos().length, 0, 'a conferência não bloqueia fora da base');
  a.sessao.atual = TEC_A;
  assert.throws(() => a.ctx.Frota_apiBloqueioDecidirForaBase('s', { veiculoId: 'v1', decisao: 'BLOQUEAR', justificativa: 'carro ficou no cliente, chave com o porteiro' }), /gestão da Frota/);
  a.sessao.atual = GESTOR;
  a.posicao('1039', { onde: LONGE, kmh: 40, ign: true });
  const r = a.ctx.Frota_apiBloqueioDecidirForaBase('s', { veiculoId: 'v1', decisao: 'BLOQUEAR', justificativa: 'carro ficou no cliente, chave com o porteiro' });
  assert.match(r.texto, /autorizado.*andando/);
  assert.equal(a.comandos().length, 0, 'autorizado mas andando: espera');
  a.posicao('1039', { onde: LONGE });
  a.rodada();
  assert.deepEqual(a.comandos().map((c) => c.corpo.id), [35]);
  // "Não bloquear" vale até a próxima retirada
  const b = ambiente();
  b.ctx.FrotaBlq_aoDevolver_(b.cfg(), TEC_A, b.veic('v1'), b.fechar(b.abrir('v1', 'cA')), b.posicao('1039', { onde: LONGE }), false);
  b.ctx.Frota_apiBloqueioDecidirForaBase('s', { veiculoId: 'v1', decisao: 'NAO_BLOQUEAR', justificativa: 'equipe segue com o carro amanhã cedo' });
  b.rodada();
  assert.equal(b.comandos().length, 0);
});

test('Simulação: faz tudo e registra "teria bloqueado/liberado", mas nenhum comando sai para o carro', () => {
  const a = ambiente();
  a.ctx.FrotaBlq_aoRetirar_(a.cfg(), TEC_A, a.veic('v2'), a.abrir('v2', 'cA'), a.posicao('872', { blocked: true }));
  a.tabelas.REG_FROTA_MOVIMENTACAO.forEach((m) => a.fechar(m));
  a.ctx.FrotaBlq_aoDevolver_(a.cfg(), TEC_A, a.veic('v2'), a.tabelas.REG_FROTA_MOVIMENTACAO[0], a.posicao('872'), false);
  a.rodada(); a.rodada();
  assert.equal(a.comandos().length, 0);
  const sim = a.eventos().filter((e) => e.TIPO === 'SIMULACAO').map((e) => e.RESULTADO);
  assert.deepEqual(sim, ['TERIA_LIBERADO', 'TERIA_BLOQUEADO']);
  assert.equal(a.estado('v2').RELE_SIMULADO, 'BLOQUEADO');
  assert.equal(a.estado('v2').ULT_CMD_REAL, 'NAO');
  assert.equal(a.estado('v2').PEDIDO_ACAO, '', 'simulação: o pedido termina com o "teria bloqueado"');
  // relatório do dia mostra o que a simulação teria feito
  const rel = a.ctx.FrotaBlq_relatorioTexto_(a.eventos()[0].QUANDO.slice(0, 10));
  assert.equal(rel.simulados, 2); assert.equal(rel.reais, 0);
  assert.match(rel.texto, /O que a simulação teria feito \(nada foi enviado\): 2/);
});

test('Carro andando sem retirada: nunca recebe bloqueio andando; parado e desligado na base, a conferência bloqueia', () => {
  const a = ambiente();
  a.ctx.FrotaBlq_estadoDe_(a.veic('v1'));
  a.posicao('1039', { kmh: 60, ign: true, blocked: false });
  for (let i = 0; i < 5; i++) a.rodada();
  assert.equal(a.comandos().length, 0);
  a.posicao('1039', { kmh: 0, ign: false, blocked: false });
  a.rodada();
  assert.deepEqual(a.comandos().map((c) => c.corpo.id), [35]);
  assert.equal(a.estado('v1').PEDIDO_ORIGEM, 'CONFERENCIA');
});

test('Só se devolve com o carro parado e desligado (rastreador); sem sinal a devolução passa', () => {
  const a = ambiente();
  a.posicao('1039', { kmh: 0, ign: true });
  assert.throws(() => a.ctx.FrotaBlq_conferirDevolucao_(a.veic('v1')), /ignição ligada.*DESLIGADO.*Passar o carro/);
  a.posicao('1039', { kmh: 50, ign: true });
  assert.throws(() => a.ctx.FrotaBlq_conferirDevolucao_(a.veic('v1')), /andando/);
  a.posicao('1039', { kmh: 0, ign: false });
  assert.equal(a.ctx.FrotaBlq_conferirDevolucao_(a.veic('v1')), null);
  a.posicao('1039', { kmh: 50, ign: true, min: 20 });
  assert.equal(a.ctx.FrotaBlq_conferirDevolucao_(a.veic('v1')), null, 'posição velha (sem sinal): não trava a devolução');
  const main = ler('SGO_Frota_Main.js');
  assert.ok(main.indexOf('FrotaBlq_conferirDevolucao_(veiculo)') < main.indexOf("lock.waitLock(10000);\n  try {\n    mov = SGO_DATA.getById"), 'conferido antes de gravar a devolução');
});

// ------------------------------------------------------------------ passar o carro
test('Passar o carro: só para quem pode dirigir; sem devolução e sem comando; aceita uma vez só (pedido guardado sem internet)', () => {
  const a = ambiente();
  const m = a.abrir('v1', 'cA');
  a.sessao.atual = TEC_A;
  assert.throws(() => a.ctx.Frota_apiPassagemPedir('s', { veiculoId: 'v1', paraCondutorId: 'cV', codigoLocal: 'P1' }), /CNH vencida/);
  const quando = new Date(Date.now() - 20 * 60000).toISOString();
  const r = a.ctx.Frota_apiPassagemPedir('s', { veiculoId: 'v1', paraCondutorId: 'cB', codigoLocal: 'P2', quandoLocal: quando, semInternet: true });
  assert.equal(r.situacao, 'AGUARDANDO_RECEBEDOR');
  assert.equal(a.ctx.Frota_apiPassagemPedir('s', { veiculoId: 'v1', paraCondutorId: 'cB', codigoLocal: 'P2' }).passagemId, r.passagemId, 'o mesmo pedido de novo não duplica');
  assert.equal(a.tabelas.REG_FROTA_PASSAGENS.length, 1);
  a.sessao.atual = TEC_B;
  assert.throws(() => a.ctx.Frota_apiPassagemConfirmar('s', { passagemId: r.passagemId }), /KM do painel/);
  const c = a.ctx.Frota_apiPassagemConfirmar('s', { passagemId: r.passagemId, km: '1080', quandoLocal: quando });
  assert.match(c.texto, /agora está com CONDUTOR B/);
  const ma = a.tabelas.REG_FROTA_MOVIMENTACAO.find((x) => x.ID === m.ID);
  const mb = a.tabelas.REG_FROTA_MOVIMENTACAO.find((x) => x.ID !== m.ID);
  assert.equal(ma.STATUS, 'FINALIZADO'); assert.equal(ma.ENCERRADA_POR_PASSAGEM, 'SIM'); assert.equal(ma.KM_CHEGADA, 1080);
  assert.equal(mb.STATUS, 'EM_ANDAMENTO'); assert.equal(mb.CONDUTOR_ID, 'cB'); assert.equal(mb.KM_SAIDA, 1080);
  assert.equal(a.comandos().length, 0, 'nenhum comando ao carro');
  assert.equal((a.tabelas.REG_FROTA_BLOQUEIO_ESTADO || []).filter((e) => e.PEDIDO_ACAO).length, 0, 'nenhum pedido de bloqueio');
  a.rodada();
  assert.equal(a.comandos().filter((x) => x.corpo.id === 35).length, 0);
  // "Assumir o carro" (quem vai seguir pede): quem está com o carro confirma, ou a gestão autoriza (com justificativa)
  a.sessao.atual = TEC_A;
  const p2 = a.ctx.Frota_apiPassagemPedir('s', { veiculoId: 'v1', km: '1100', codigoLocal: 'P3' });
  assert.equal(p2.situacao, 'AGUARDANDO_ATUAL');
  a.sessao.atual = GESTOR;
  assert.throws(() => a.ctx.Frota_apiPassagemDecidir('s', { passagemId: p2.passagemId, decisao: 'AUTORIZAR', justificativa: 'curta' }), /Justificativa/);
  a.ctx.Frota_apiPassagemDecidir('s', { passagemId: p2.passagemId, decisao: 'AUTORIZAR', justificativa: 'condutor sem sinal, confirmado por telefone' });
  assert.equal(a.tabelas.REG_FROTA_MOVIMENTACAO.filter((x) => x.STATUS === 'EM_ANDAMENTO')[0].CONDUTOR_ID, 'cA');
});

// ------------------------------------------------------------------ retirada esquecida
test('Retirada esquecida: 1 h parado na base pergunta ao condutor; sem resposta em mais 1 h vai à gestão; encerrar só com condições seguras', () => {
  const a = ambiente();
  const m = a.abrir('v1', 'cA');
  a.posicao('1039');
  a.rodada();
  const e = a.estado('v1');
  assert.ok(e.ESQ_PARADO_DESDE);
  e.ESQ_PARADO_DESDE = new Date(Date.now() - 61 * 60000).toISOString();
  a.rodada();
  assert.ok(a.estado('v1').ESQ_PERGUNTA_EM);
  assert.ok(a.notificacoes.some((n) => n.evento === 'S61' && n.usuarios.includes('uA')));
  a.sessao.atual = TEC_A;
  const ini = a.ctx.FrotaBlq_inicio_({ ID: 'cA' }, [{ id: m.ID, veiculoId: 'v1', veiculoPlaca: 'TST1A11', minha: true }]);
  assert.equal(ini.perguntas.length, 1, 'a pergunta aparece no celular do condutor');
  a.estado('v1').ESQ_PERGUNTA_EM = new Date(Date.now() - 61 * 60000).toISOString();
  a.rodada();
  assert.ok(a.estado('v1').ESQ_GESTAO_EM);
  assert.ok(a.notificacoes.some((n) => n.evento === 'S62'));
  assert.equal(a.comandos().length, 0, 'retirada aberta: nada de bloqueio');
  a.sessao.atual = GESTOR;
  a.posicao('1039', { ign: true });
  assert.throws(() => a.ctx.Frota_apiBloqueioEncerrarEsquecida('s', { movimentacaoId: m.ID, justificativa: 'condutor esqueceu de devolver, carro na base' }), /ignição está ligada.*Passar o carro/);
  a.posicao('1039', { onde: LONGE });
  assert.throws(() => a.ctx.Frota_apiBloqueioEncerrarEsquecida('s', { movimentacaoId: m.ID, justificativa: 'condutor esqueceu de devolver, carro na base' }), /fora das bases/);
  a.posicao('1039');
  const r = a.ctx.Frota_apiBloqueioEncerrarEsquecida('s', { movimentacaoId: m.ID, justificativa: 'condutor esqueceu de devolver, carro na base' });
  assert.match(r.texto, /Retirada encerrada/);
  assert.equal(a.tabelas.REG_FROTA_MOVIMENTACAO[0].STATUS, 'FINALIZADO');
  assert.match(a.tabelas.REG_FROTA_MOVIMENTACAO[0].KM_ALERTA_CHEGADA, /confira o painel/);
  assert.deepEqual(a.comandos().map((c) => c.corpo.id), [35]);
});

// ------------------------------------------------------------------ emergência e roubo
test('Emergência: "Liberar agora" só Administrador, Diretoria, Gestor e RH, com motivo; bloqueio de roubo só a Diretoria, com dupla confirmação', () => {
  const a = ambiente();
  a.sessao.atual = { userId: 'uF', nome: 'FIN', perfil: 'FINANCEIRO' };
  assert.throws(() => a.ctx.Frota_apiBloqueioLiberarAgora('s', { veiculoId: 'v1', motivo: 'condutor sem sinal no celular' }), /Administrador, da Diretoria, do Gestor e do RH/);
  a.sessao.atual = RH;
  const r = a.ctx.Frota_apiBloqueioLiberarAgora('s', { veiculoId: 'v1', motivo: 'condutor sem sinal no celular' });
  assert.match(r.texto, /liberada/);
  assert.deepEqual(a.comandos().map((c) => c.corpo.id), [36]);
  assert.ok(a.estado('v1').EMERGENCIA_ATE);
  a.posicao('1039', { blocked: false }); a.rodada();
  assert.equal(a.comandos().length, 1, 'emergência valendo: a conferência não bloqueia');
  // roubo
  a.sessao.atual = GESTOR;
  assert.throws(() => a.ctx.Frota_apiBloqueioRoubo('s', { veiculoId: 'v1', motivo: 'carro levado do estacionamento', confirmacao1: true, confirmacao2: 'BLOQUEAR TST1A11' }), /só da Diretoria/);
  a.sessao.atual = DIRETORIA;
  assert.throws(() => a.ctx.Frota_apiBloqueioRoubo('s', { veiculoId: 'v1', motivo: 'carro levado do estacionamento', confirmacao1: true, confirmacao2: 'BLOQUEAR' }), /dupla confirmação/);
  a.posicao('1039', { kmh: 80, ign: true });
  const r2 = a.ctx.Frota_apiBloqueioRoubo('s', { veiculoId: 'v1', motivo: 'carro levado do estacionamento', confirmacao1: true, confirmacao2: 'bloquear tst1a11' });
  assert.equal(r2.enviado, false); assert.equal(r2.precisaAceitarRisco, true);
  assert.equal(a.comandos().length, 1);
  const r3 = a.ctx.Frota_apiBloqueioRoubo('s', { veiculoId: 'v1', motivo: 'carro levado do estacionamento', confirmacao1: true, confirmacao2: 'BLOQUEAR TST1A11', aceitarRisco: true });
  assert.equal(r3.enviado, true);
  assert.deepEqual(a.comandos().map((c) => c.corpo.id), [36, 35]);
  assert.ok(a.eventos().some((e) => e.ORIGEM === 'ROUBO' && /RISCO ACEITO/.test(e.DETALHE)));
});

// ------------------------------------------------------------------ hodômetro
test('Odômetro: divergência na devolução vira aviso (nunca acerto automático); acerto só Gestor/Administrador, confirmado, parado; Simulação só registra', () => {
  const a = ambiente();
  const m = a.fechar(a.abrir('v1', 'cA'), 1200);
  a.ctx.FrotaBlq_aoDevolver_(a.cfg(), TEC_A, a.veic('v1'), m, a.posicao('1039', { odometroKm: 1150 }), false);
  assert.equal(a.estado('v1').ODO_DIVERGENCIA_MOV_ID || '', '', 'diferença de 50 km (até 50 km ou 2%): nada');
  const m2 = a.fechar(a.abrir('v1', 'cA'), 1400);
  a.ctx.FrotaBlq_aoDevolver_(a.cfg(), TEC_A, a.veic('v1'), m2, a.posicao('1039', { odometroKm: 1150 }), false);
  assert.equal(a.estado('v1').ODO_DIVERGENCIA_MOV_ID, m2.ID);
  assert.equal(a.comandos().filter((c) => c.metodo === 'PUT').length, 0, 'nunca acerta sozinho');
  a.sessao.atual = RH;
  assert.throws(() => a.ctx.Frota_apiBloqueioHodometro('s', { veiculoId: 'v1', km: 1400, confirmado: true }), /Gestor ou do Administrador/);
  a.sessao.atual = GESTOR;
  assert.throws(() => a.ctx.Frota_apiBloqueioHodometro('s', { veiculoId: 'v1', km: 1400 }), /Confirme/);
  a.posicao('1039', { odometroKm: 1150, kmh: 40, ign: true });
  assert.throws(() => a.ctx.Frota_apiBloqueioHodometro('s', { veiculoId: 'v1', km: 1400, confirmado: true }), /andando/);
  a.posicao('1039', { odometroKm: 1150 });
  const r = a.ctx.Frota_apiBloqueioHodometro('s', { veiculoId: 'v1', km: 1400, confirmado: true });
  assert.match(r.texto, /de 1\.150 km para 1\.400 km/);
  const put = a.comandos().filter((c) => c.metodo === 'PUT');
  assert.equal(put.length, 1);
  assert.equal(put[0].caminho, '/devices/1039/accumulators');
  assert.deepEqual(put[0].corpo, { deviceId: 1039, totalDistance: 1400000 });
  assert.equal(a.estado('v1').ODO_DIVERGENCIA_MOV_ID, '', 'aviso resolvido');
  assert.equal(a.estado('v1').ODO_ACERTO_POR, 'GESTORA TESTE');
  // menor que o atual: segunda confirmação com motivo
  a.posicao('1039', { odometroKm: 1400 });
  assert.throws(() => a.ctx.Frota_apiBloqueioHodometro('s', { veiculoId: 'v1', km: 1300, confirmado: true }), /MENOR/);
  a.ctx.Frota_apiBloqueioHodometro('s', { veiculoId: 'v1', km: 1300, confirmado: true, confirmacaoMenor: true, motivo: 'aparelho trocado, painel conferido na revisão' });
  // veículo em simulação: só registra o que mandaria
  a.posicao('872', { odometroKm: 4000 });
  const s = a.ctx.Frota_apiBloqueioHodometro('s', { veiculoId: 'v2', km: 5000, confirmado: true });
  assert.equal(s.simulado, true);
  assert.equal(a.comandos().filter((c) => c.metodo === 'PUT').length, 2);
  assert.equal(a.ctx.FrotaBlq_odometroDivergente_(1000, 1019).divergente, false);
  assert.equal(a.ctx.FrotaBlq_odometroDivergente_(10000, 9900).divergente, false, '100 km mas só 1%: tolerado');
  assert.equal(a.ctx.FrotaBlq_odometroDivergente_(10000, 9790).divergente, true);
});

// ------------------------------------------------------------------ registro inviolável
test('Registro inviolável: cada linha leva o resumo da anterior; linha alterada ou apagada aparece na conferência', () => {
  const a = ambiente();
  a.ctx.FrotaBlq_aoRetirar_(a.cfg(), TEC_A, a.veic('v1'), a.abrir('v1', 'cA'), null);
  a.ctx.FrotaBlq_aoRetirar_(a.cfg(), TEC_A, a.veic('v2'), a.abrir('v2', 'cB'), null);
  const ev = a.eventos();
  assert.ok(ev.length >= 4);
  assert.equal(ev[0].HASH_ANTERIOR, 'INICIO');
  for (let i = 1; i < ev.length; i++) assert.equal(ev[i].HASH_ANTERIOR, ev[i - 1].HASH);
  assert.equal(a.ctx.FrotaBlq_conferirIntegridade_().ok, true);
  ev[1].DETALHE = 'alterado depois';
  const c = a.ctx.FrotaBlq_conferirIntegridade_();
  assert.equal(c.ok, false);
  assert.match(c.texto, /não bate com o resumo/);
  ev[1].DETALHE = a.eventos()[1].DETALHE;
  const b = ambiente();
  b.ctx.FrotaBlq_aoRetirar_(b.cfg(), TEC_A, b.veic('v1'), b.abrir('v1', 'cA'), null);
  b.ctx.FrotaBlq_aoRetirar_(b.cfg(), TEC_A, b.veic('v2'), b.abrir('v2', 'cB'), null);
  b.tabelas.REG_FROTA_BLOQUEIO_EVENTOS.splice(1, 1);
  assert.equal(b.ctx.FrotaBlq_conferirIntegridade_().ok, false);
});

// ------------------------------------------------------------------ triagem
test('Triagem pela CONEXÃO (padrão real do rastreador): pontos densos ligado e horas sem posição desligado, aparelho online = sem falta de sinal', () => {
  const a = ambiente();
  a.ctx.FrotaBlq_estadoDe_(a.veic('v1'));
  const est = a.estado('v1');
  const inicio = Date.now() - 30 * 3600000;
  est.CON_INICIO = new Date(inicio).toISOString();
  // 30 h, uma amostra a cada 2 min: dirige 1 h (posição a cada 12 s), estaciona e desliga; o rastreador para de mandar
  // posição (economia), mas o /devices mostra "online" com último contato de 0 a 3 min.
  let ultimaPos = null;
  for (let t = inicio; t < Date.now(); t += 120000) {
    const h = ((t - inicio) / 3600000) % 10;
    const dirigindo = h < 1;
    if (dirigindo || !ultimaPos || ultimaPos.ignicao) ultimaPos = { quandoMs: dirigindo ? t : t - 60000, kmh: dirigindo ? 45 : 0, ignicao: dirigindo, lat: BASE.lat, lon: BASE.lon, endereco: 'Pátio de teste' };
    a.ctx.FrotaBlq_registrarConexao_(a.veic('v1'), est, { online: true, ultimoMs: t - ((t / 120000) % 3) * 60000 }, ultimaPos, t, true);
  }
  const cl = a.ctx.FrotaBlq_triagemVeiculo_(a.veic('v1'), est, null);
  assert.equal(cl.triagem, 'BLOQUEIO_ATIVO', cl.motivo);
  assert.equal(cl.locais[0].pctSinal, 100);
  assert.ok(String(est.CON_RESUMO).length < 4000, 'resumo enxuto');
  // aparelho offline 90% do tempo onde o carro dorme = "Só avisa"
  const b = ambiente();
  b.ctx.FrotaBlq_estadoDe_(b.veic('v1'));
  const eb = b.estado('v1');
  eb.CON_INICIO = new Date(inicio).toISOString();
  let n = 0;
  for (let t = inicio; t < Date.now(); t += 120000) {
    const on = (n++ % 10) === 0;
    b.ctx.FrotaBlq_registrarConexao_(b.veic('v1'), eb, { online: on, ultimoMs: on ? t : t - 3600000 }, { quandoMs: inicio, kmh: 0, ignicao: false, lat: LONGE.lat, lon: LONGE.lon, endereco: 'Garagem de teste' }, t, true);
  }
  const ruim = b.ctx.FrotaBlq_triagemVeiculo_(b.veic('v1'), eb, null);
  assert.equal(ruim.triagem, 'SO_AVISA');
  assert.match(ruim.motivo, /perde a conexão.*Garagem de teste/);
  // menos de 24 h de histórico novo: sem dados (vale a regra normal)
  assert.equal(a.ctx.FrotaBlq_classificarConexao_({ dias: {} }, new Date(Date.now() - 5 * 3600000).toISOString(), Date.now()).triagem, 'SEM_DADOS');
  // falha ao ler a lista de aparelhos não vira amostra (não é falta de sinal do carro)
  const antes = eb.CON_RESUMO;
  b.ctx.FrotaBlq_registrarConexao_(b.veic('v1'), eb, null, null, Date.now(), false);
  assert.equal(eb.CON_RESUMO, antes);
  // carro em "Só avisa": a devolução não manda bloqueio
  b.estado('v1').TRIAGEM_MANUAL = 'SO_AVISA';
  const r = b.ctx.FrotaBlq_aoDevolver_(b.cfg(), TEC_A, b.veic('v1'), b.fechar(b.abrir('v1', 'cA')), b.posicao('1039'), false);
  assert.match(r.texto, /Só avisa/);
  b.rodada();
  assert.equal(b.comandos().length, 0);
});

test('Aba de estado criada antes da medição pela conexão (produção, 22/10): as colunas CON_* são acrescentadas e a conexão fica gravada', () => {
  const antigas = ['ID', 'VEICULO_ID', 'PLACA', 'DEVICE_ID', 'MODO', 'MODO_EM', 'MODO_POR', 'MODO_MOTIVO', 'TRIAGEM', 'TRIAGEM_EM', 'TRIAGEM_RESUMO',
    'TRIAGEM_MANUAL', 'RELE_REAL', 'RELE_REAL_EM', 'RELE_SIMULADO', 'PEDIDO_ACAO', 'PEDIDO_SITUACAO', 'ULT_CMD_ACAO', 'ULT_CMD_EM', 'ATUALIZADO_EM', 'CRIADO_EM'];
  const a = ambiente({ tabelas: { REG_FROTA_BLOQUEIO_ESTADO: [] }, cabecalhos: { REG_FROTA_BLOQUEIO_ESTADO: antigas } });
  a.posicao('1039', { min: 300 });
  a.rodada();
  const est = a.estado('v1');
  assert.ok(est, 'estado criado');
  assert.equal(est.CON_ONLINE, 'SIM');
  assert.ok(est.CON_ULTIMO_EM && est.CON_INICIO && est.CON_RESUMO, 'conexão gravada');
});

test('Padrão real (22/10): carro desligado há horas e aparelho online = bloqueio sai; aparelho offline ou posição de ignição ligada mais recente = não sai', () => {
  // devolvido há 5 h; última posição com a ignição desligada 5 h atrás (economia), /devices "online" com contato há 1 min
  const a = ambiente();
  const m = a.fechar(a.abrir('v1', 'cA'));
  const pos = a.posicao('1039', { min: 300 });
  a.api.status['1039'] = { status: 'offline', min: 40 };
  a.ctx.FrotaBlq_aoDevolver_(a.cfg(), TEC_A, a.veic('v1'), m, pos, false);
  assert.equal(a.comandos().length, 0, 'offline: não sai');
  assert.match(a.estado('v1').PEDIDO_MOTIVO, /offline/);
  a.api.status['1039'] = { status: 'online', min: 3 };
  a.rodada();
  assert.equal(a.comandos().length, 0, 'online, mas sem contato há 3 min: não sai');
  a.api.status['1039'] = { status: 'online', min: 1 };
  a.rodada();
  assert.deepEqual(a.comandos().map((c) => c.corpo.id), [35], 'conectado e desligado há horas: sai');
  const env = a.eventos().filter((e) => e.TIPO === 'ENVIO').pop();
  assert.match(env.CONDICAO, /aparelho conectado .*ignição desligada \(última posição/);
  assert.equal(a.estado('v1').CON_ONLINE, 'SIM');
  // posição mais recente com a ignição ligada (alguém ligou o carro): não sai, mesmo online
  const b = ambiente();
  b.ctx.FrotaBlq_aoDevolver_(b.cfg(), TEC_A, b.veic('v1'), b.fechar(b.abrir('v1', 'cA')), b.posicao('1039', { min: 300, ign: true }), false);
  b.posicao('1039', { min: 0, ign: true });
  b.rodada();
  assert.equal(b.comandos().length, 0);
  // lista de aparelhos indisponível (situação desconhecida): não sai
  const c = ambiente();
  const posC = c.posicao('1039', { min: 300 });
  c.api.respostaDevices = 503;
  c.ctx.FrotaBlq_aoDevolver_(c.cfg(), TEC_A, c.veic('v1'), c.fechar(c.abrir('v1', 'cA')), posC, false);
  c.rodada();
  assert.equal(c.comandos().length, 0, 'sem a lista de aparelhos: não sai');
  assert.match(c.estado('v1').PEDIDO_MOTIVO, /desconhecida/);
  assert.equal(c.ctx.FrotaBlq_seguro_(c.ctx.Rastreador_posicao_(c.api.posicoes['1039']), Date.now(), null).ok, false);
  // retirada esquecida também funciona com a economia: parado na base há horas e online = pergunta ao condutor
  const d = ambiente();
  const md = d.abrir('v1', 'cA');
  d.posicao('1039', { min: 200 });
  d.rodada();
  assert.equal(d.ctx.FrotaBlq_ms_(d.estado('v1').ESQ_PARADO_DESDE) <= Date.now() - 199 * 60000, true);
  d.rodada();
  assert.ok(d.estado('v1').ESQ_PERGUNTA_EM, 'pergunta enviada');
  assert.equal(md.STATUS, 'EM_ANDAMENTO');
});

test('Correção da triagem (22/10): "Só avisa" automático da medição antiga volta para "sem dados", com o porquê no registro; escolha manual mantida', () => {
  const a = ambiente();
  a.ctx.FrotaBlq_estadoDe_(a.veic('v1')); a.ctx.FrotaBlq_estadoDe_(a.veic('v2'));
  Object.assign(a.estado('v1'), { TRIAGEM: 'SO_AVISA', TRIAGEM_RESUMO: '{"motivo":"2% do tempo com sinal"}' });
  Object.assign(a.estado('v2'), { TRIAGEM: 'SO_AVISA', TRIAGEM_MANUAL: 'SO_AVISA' });
  a.posicao('1039'); a.posicao('872');
  a.rodada();
  assert.equal(a.estado('v1').TRIAGEM, 'SEM_DADOS');
  assert.equal(a.estado('v2').TRIAGEM, 'SEM_DADOS');
  assert.equal(a.estado('v2').TRIAGEM_MANUAL, 'SO_AVISA', 'escolha da gestão não muda');
  const ev = a.eventos().filter((e) => e.TIPO === 'TRIAGEM' && e.ACAO === 'CORRECAO');
  assert.equal(ev.length, 2);
  assert.match(ev[0].DETALHE, /SO_AVISA -> SEM_DADOS.*modo de economia do rastreador/);
  a.rodada();
  assert.equal(a.eventos().filter((e) => e.ACAO === 'CORRECAO').length, 2, 'só uma vez');
});

// ------------------------------------------------------------------ código antigo e limites
test('Código antigo: nada mais envia engineStop/engineResume; "Bloquear agora" antigo explica o caminho novo sem enviar; limite por minuto', () => {
  const rast = ler('SGO_Frota_Rastreador.js');
  assert.doesNotMatch(rast, /engineStop|engineResume|Rastreador_enviar_|Rastreador_tentar_|RASTREADOR_CMD_BLOQUEIO_URL'\)/);
  const a = ambiente();
  assert.throws(() => a.ctx.Frota_apiRastreadorBloquear('s', { veiculoId: 'v1', justificativa: 'qualquer justificativa longa' }), /bloqueio manual mudou/);
  assert.equal(a.comandos().length, 0);
  let n = 0;
  for (let i = 0; i < 40; i++) if (a.ctx.FrotaBlq_vez_()) n++;
  assert.equal(n, 25, 'no máximo 25 comandos por minuto (limite da iTracker: 30)');
  const chaves = ler('SGO_Chaves.js');
  assert.doesNotMatch(chaves, /chave: 'RASTREADOR_CMD_BLOQUEIO_URL'/, 'endereços de comando fora da tela');
  assert.match(chaves, /Deixe Desligado até a equipe ligar o piloto/);
  // painel da gestão
  a.sessao.atual = GESTOR;
  const p = a.ctx.Frota_apiBloqueioPainel('s', {});
  assert.equal(p.veiculos.length, 2);
  assert.equal(p.veiculos.find((v) => v.veiculoId === 'v1').modoEfetivo, 'ATIVO');
  assert.equal(p.veiculos.find((v) => v.veiculoId === 'v2').modoEfetivo, 'SIMULACAO');
  a.sessao.atual = TEC_A;
  assert.throws(() => a.ctx.Frota_apiBloqueioPainel('s', {}), /gestão da Frota/);
});

// ------------------------------------------------------------------ cenários do simulador do estudo
test('Simulador do estudo com a decisão real do SGO+: nas situações planejadas, zero corte em trânsito, ninguém bloqueia nem tira o carro de quem está com ele', () => {
  const sim = require('./fixtures/simulador_bloqueio/simulador.js');
  const { gerarTodos, FAMILIAS } = require('./fixtures/simulador_bloqueio/cenarios.js');
  const ctx = vm.createContext({ console, Rastreador_num_: (n) => String(Math.round(n)), Rastreador_agoraTexto_: () => '' });
  vm.runInContext(ler('SGO_Frota_Bloqueio.js'), ctx);
  sim.usarMotor(ctx.FrotaBlq_decidir_);
  const lista = gerarTodos(10, 0);
  assert.equal(new Set(lista.map((s) => s.familia)).size, Object.keys(FAMILIAS).length);
  for (const variante of ['SGO', 'SGO_SEM_AJUSTE']) {
    const quebras = {};
    let comandos = 0, naFila = 0;
    for (const sc of lista) {
      const o = sim.rodar(sc, variante);
      for (const k of ['I1', 'I3', 'I9']) if (o.v[k]) (quebras[k] = quebras[k] || []).push(sc.id + ': ' + o.v[k]);
    }
    assert.deepEqual(quebras, {}, variante + ': ' + JSON.stringify(quebras));
  }
  // reconciliação: o carro devolvido e preso na fila volta a ser conferido; retirada com o carro bloqueado recebe a liberação de novo
  const r = sim.rodar(lista.find((s) => s.familia === 'F17'), 'SGO');
  assert.ok(r.log.some((l) => /comando LIB/.test(l)));
});

test('Tela "Bloqueio da partida": entra na aba Rastreamento e o código do navegador compila', () => {
  const ctx = vm.createContext({});
  for (const f of ['SGO_Frota_RastreamentoTela.js', 'SGO_Frota_ReservasTela.js', 'SGO_Frota_BloqueioTela.js']) vm.runInContext(ler(f), ctx);
  const t = ctx.Frota_obterTelaRastreamento();
  assert.match(t.js, /tplFrotaBlq_montar_/);
  assert.match(t.css, /\.fbq-chip/);
  assert.doesNotThrow(() => new Function(t.js));
  const rt = ler('SGO_Frota_RastreamentoTela.js');
  assert.match(rt, /\['bloqueio', 'Bloqueio da partida'\]/);
  const tela = ler('SGO_Frota_BloqueioTela.js');
  for (const fn of ['apiBloqueioPainel', 'apiBloqueioModo', 'apiBloqueioTriagem', 'apiBloqueioLiberarAgora', 'apiBloqueioRoubo', 'apiBloqueioHodometro', 'apiBloqueioAreaBase', 'apiBloqueioDecidirForaBase', 'apiBloqueioEncerrarEsquecida', 'apiPassagemDecidir', 'apiBloqueioIntegridade', 'apiBloqueioRelatorio']) {
    assert.match(tela, new RegExp("'" + fn + "'"), fn + ' chamado pela tela');
    assert.match(ler('SGO_Frota_Main.js'), new RegExp(fn + ': Frota_' + fn), fn + ' no despacho');
  }
  const ajuda = ler('SGO_Ajuda_Frota.js');
  assert.match(ajuda, /"frota\/bloqueio_da_partida": \{/);
  assert.match(ler('JS_Core.html'), /data-acao="passar"/);
  assert.match(ler('JS_Core.html'), /Assumi o carro/);
});
