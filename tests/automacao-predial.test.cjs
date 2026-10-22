// Segurança e automação predial (SGO_Automacao_Predial.js + SGO_Automacao_Tuya.js) num contexto isolado, com a nuvem da
// Tuya SIMULADA (nenhum comando real) e dados fictícios (22/10/2026). Confere: visibilidade da porta da Diretoria,
// permissões no servidor, idempotência, limites, solicitado -> aceito -> confirmado, simulação, registro encadeado.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n');
const comSinal = (buf) => Array.from(buf).map((b) => (b > 127 ? b - 256 : b));

const ADMIN = { userId: 'uA', usuario: 'admin', nome: 'ADMINISTRADOR TESTE', perfil: 'ADMIN' };
const DIR = { userId: 'uD', usuario: 'dir', nome: 'DIRETORA TESTE', perfil: 'DIRETORIA' };
const DIR2 = { userId: 'uD2', usuario: 'dir2', nome: 'DIRETOR DOIS', perfil: 'DIRETORIA' };
const GESTOR = { userId: 'uG', usuario: 'gestor', nome: 'GESTOR TESTE', perfil: 'GESTOR' };
const TEC = { userId: 'uT', usuario: 'tec', nome: 'TECNICO TESTE', perfil: 'TECNICO' };
const CLIENTE = { userId: 'uC', usuario: 'cli', nome: 'CLIENTE', perfil: 'CLIENTE', clienteId: 'c1' };

function ambiente(o) {
  o = o || {};
  const props = Object.assign({ TUYA_ACCESS_ID: 'id-de-teste-0001', TUYA_ACCESS_SECRET: 'segredo-de-teste-0001', TUYA_REGIAO: 'us', TUYA_LIGADO: '1', TUYA_ENDPOINT: 'http://localhost:8199' }, o.props || {});
  Object.keys(props).forEach((k) => { if (props[k] === null) delete props[k]; });
  const cache = {};
  const tabelas = { CAD_USUARIOS: [
    { ID: 'uA', USUARIO: 'admin', NOME: 'ADMINISTRADOR TESTE', PERFIL: 'ADMIN', STATUS: 'ATIVO' }, { ID: 'uD', USUARIO: 'dir', NOME: 'DIRETORA TESTE', PERFIL: 'DIRETORIA', STATUS: 'ATIVO' },
    { ID: 'uD2', USUARIO: 'dir2', NOME: 'DIRETOR DOIS', PERFIL: 'DIRETORIA', STATUS: 'ATIVO' }, { ID: 'uG', USUARIO: 'gestor', NOME: 'GESTOR TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO' },
    { ID: 'uT', USUARIO: 'tec', NOME: 'TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO' }, { ID: 'uX', USUARIO: 'inativo', NOME: 'INATIVO', PERFIL: 'TECNICO', STATUS: 'INATIVO' }],
    CAD_UNIDADES: [{ ID: 'un1', CLIENTE_ID: 'c1', NOME_UNIDADE: 'MATRIZ GOIÂNIA', CIDADE: 'Goiânia', STATUS: 'ATIVO' }], CAD_CLIENTES: [{ ID: 'c1', NOME_FANTASIA: 'METROLABS', STATUS: 'ATIVO' }] };
  const cabecalhos = {};
  const api = { pedidos: [], portaoAberto: false, fechaduraAbre: true, recusaComando: null, falhaRede: false, remoto: true, registrosFechadura: 1 };
  const notificacoes = [];
  const sessao = { atual: o.sessao || ADMIN };
  let seq = 0;
  const resposta = (code, corpo) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(corpo), getAllHeaders: () => ({}) });
  const ctx = vm.createContext({
    console,
    Utilities: criarUtilities({ DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (alg, txt) => comSinal(crypto.createHash('sha256').update(String(txt), 'utf8').digest()),
      computeHmacSha256Signature: (txt, chave) => comSinal(crypto.createHmac('sha256', String(chave)).update(String(txt), 'utf8').digest()) }),
    Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k === 'TUYA_ULTIMA_CHAMADA_MS' ? null : (k in cache ? cache[k] : null)), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, hasLock: () => false, tryLock: () => true }) },
    UrlFetchApp: {
      fetch(url, op) {
        const u = new URL(url);
        api.pedidos.push({ metodo: String(op.method).toUpperCase(), caminho: u.pathname, corpo: op.payload ? JSON.parse(op.payload) : null });
        if (api.falhaRede) throw new Error('ECONNRESET');
        if (u.pathname === '/v1.0/token') return resposta(200, { success: true, result: { access_token: 'tok-1', refresh_token: 'ref-1', expire_time: 7200, uid: 'uid-app' } });
        if (u.pathname === '/v1.0/iot-01/associated-users/devices') return resposta(200, { success: true, result: { has_more: false, devices: [
          { id: 'dev-portao-1', name: 'Portão principal', category: 'ckmkzq', product_name: 'Abridor', online: true, status: [{ code: 'switch_1', value: false }] },
          { id: 'dev-portao-2', name: 'Portão secundário', category: 'ckmkzq', product_name: 'Abridor', online: true, status: [{ code: 'switch_1', value: false }] },
          { id: 'dev-fech-1', name: 'Porta da Diretoria', category: 'jtmspro', product_name: 'Fechadura', online: true, status: [{ code: 'residual_electricity', value: 80 }, { code: 'lock_motor_state', value: false }] }
        ] } });
        if (/\/functions$/.test(u.pathname)) return u.pathname.includes('fech') ? resposta(200, { success: true, result: { category: 'jtmspro', functions: api.remoto ? [{ code: 'remote_no_dp_key', type: 'Raw' }] : [{ code: 'unlock_temporary', type: 'Integer' }] } })
          : resposta(200, { success: true, result: { category: 'ckmkzq', functions: [{ code: 'switch_1', type: 'Boolean' }] } });
        if (/door-lock\/remote-unlocks$/.test(u.pathname)) return resposta(200, { success: true, result: api.remoto ? [{ remote_unlock_type: 'remoteUnlockWithoutPwd', open: true }] : [] });
        if (/door-lock\/password-ticket$/.test(u.pathname)) return resposta(200, { success: true, result: { ticket_id: 'tk-abc', ticket_key: 'xx' } });
        if (/password-free\/open-door$/.test(u.pathname)) { if (api.fechaduraAbre) api.fechAberta = true; return resposta(200, { success: true, result: true, tid: 'tid-f' }); }
        if (/door-lock\/open-logs$/.test(u.pathname)) return resposta(200, { success: true, result: { records: Array.from({ length: api.fechAberta ? api.registrosFechadura : 0 }, () => ({ unlock_name: 'remote' })) } });
        if (/\/commands$/.test(u.pathname)) { if (api.recusaComando) return resposta(200, api.recusaComando); api.portaoAberto = true; return resposta(200, { success: true, result: true, tid: 'tid-p' }); }
        if (/\/status$/.test(u.pathname)) return resposta(200, { success: true, result: [{ code: 'switch_1', value: api.portaoAberto }] });
        if (u.pathname === '/v1.0/devices/dev-fech-1') return resposta(200, { success: true, result: { id: 'dev-fech-1', online: true, status: [{ code: 'residual_electricity', value: 80 }, { code: 'lock_motor_state', value: !!api.fechAberta }] } });
        if (/^\/v1\.0\/devices\/dev-portao/.test(u.pathname)) return resposta(200, { success: true, result: { id: u.pathname.split('/')[3], online: true, status: [{ code: 'switch_1', value: api.portaoAberto }] } });
        return resposta(200, { success: false, code: 2010, msg: 'device not exist' });
      }
    },
    CertCal_garantirTabela_: (t, cols) => { if (!tabelas[t]) { tabelas[t] = []; cabecalhos[t] = (cols || []).slice(); } },
    SGO_DATA: {
      getDB: () => ({ getSheetByName: (n) => (tabelas[n] ? {} : null) }),
      getAll: (t) => (tabelas[t] || []).map((r) => Object.assign({}, r)),
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) return false; Object.keys(d).forEach((k) => { if (!cabecalhos[t] || cabecalhos[t].indexOf(k) >= 0) r[k] = d[k]; }); return true; },
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq) }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
      remove: () => { throw new Error('apagar é proibido'); },
      gerarRegistroBase: (x) => Object.assign({ ID: 'g' + (++seq), CRIADO_EM: new Date().toISOString() }, x),
      normalizarObjetoParaSheet: (t, x) => x, log() {}
    },
    SGO_UTILS: { nowIso: () => new Date().toISOString(), safe: (v) => (v === null || v === undefined ? '' : String(v).trim()), safeUpper: (v) => String(v || '').trim().toUpperCase() },
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', CAD_UNIDADES: 'CAD_UNIDADES', CAD_CLIENTES: 'CAD_CLIENTES' } },
    exigirSessao: () => sessao.atual,
    SGO_notificar_: (x) => { notificacoes.push(x); return { ok: 1, erro: 0, pulado: 0 }; },
    Pend_item_: (tipo, o) => Object.assign({ tipo }, o)
  });
  for (const f of ['SGO_Automacao_Tuya.js', 'SGO_Automacao_Predial.js']) vm.runInContext(ler(f), ctx);
  const como = (s) => { sessao.atual = s; };
  const api_ = (acao, dados) => JSON.parse(JSON.stringify(ctx.AutPred_api('sess', acao, dados || {})));
  const disp = (nome) => (tabelas.AUT_DISPOSITIVOS || []).find((d) => d.NOME === nome);
  const comandosApi = () => api.pedidos.filter((p) => p.metodo === 'POST');
  return { ctx, props, tabelas, api, notificacoes, como, api_, disp, comandosApi, cache };
}

function sincronizar(amb) { amb.como(ADMIN); const r = amb.api_('sincronizar'); assert.equal(r.ok, true, r.message); return r; }

test('sincronização: lê os 3 dispositivos, portão com switch_1, fechadura restrita à Diretoria; nenhum comando sai', () => {
  const amb = ambiente();
  const r = sincronizar(amb);
  assert.match(r.mensagem, /3 dispositivo/);
  assert.equal(amb.tabelas.AUT_DISPOSITIVOS.length, 3);
  const p = amb.disp('Portão principal'), f = amb.disp('Porta da Diretoria');
  assert.equal(p.TIPO, 'PORTAO'); assert.equal(p.COMPAT_OK, 'SIM'); assert.equal(p.RESTRITO_DIRETORIA, 'NAO'); assert.equal(p.HOMOLOGADO, 'NAO');
  assert.equal(f.TIPO, 'FECHADURA'); assert.equal(f.RESTRITO_DIRETORIA, 'SIM'); assert.equal(f.REMOTO_FECHADURA, 'BILHETE');
  assert.equal(amb.comandosApi().length, 0, 'sincronizar só lê');
  assert.ok(amb.tabelas.AUT_AUDITORIA.some((a) => a.EVENTO === 'SINCRONIZACAO'));
  // segunda sincronização não duplica
  sincronizar(amb);
  assert.equal(amb.tabelas.AUT_DISPOSITIVOS.length, 3);
});

test('porta da Diretoria invisível para quem não é DIRETORIA: Gestor, Técnico e Administrador não a recebem na lista nem por id', () => {
  const amb = ambiente();
  sincronizar(amb);
  const f = amb.disp('Porta da Diretoria');
  amb.como(GESTOR);
  let p = amb.api_('painel');
  assert.equal(p.ok, true);
  const nomes = (x) => x.unidades.flatMap((u) => u.dispositivos.map((d) => d.nome));
  assert.deepEqual(nomes(p), [], 'gestor sem permissão não vê nada');
  assert.equal(JSON.stringify(p).includes('Diretoria'), JSON.stringify(p).includes('Porta da Diretoria') ? false : JSON.stringify(p).includes('Diretoria'));
  assert.ok(!JSON.stringify(p).includes('Porta da Diretoria'));
  assert.ok(!JSON.stringify(p).includes('dev-fech-1'));
  let h = amb.api_('historico', { dispositivoId: f.ID });
  assert.equal(h.ok, false); assert.match(h.message, /não foi encontrado ou não está liberado/);
  let e = amb.api_('estado', { dispositivoId: f.ID });
  assert.equal(e.ok, false);
  amb.como(ADMIN);
  p = amb.api_('painel');
  assert.ok(!nomes(p).includes('Porta da Diretoria'));
  assert.equal(p.restritosOcultos, 1, 'administrador só vê a contagem');
  assert.ok(!JSON.stringify(p).includes('dev-fech-1'));
  assert.equal(amb.api_('comando', { dispositivoId: f.ID, operacaoId: 'op-admin-fech-0001', confirmacao: 'ABRIR' }).ok, false);
  assert.equal(amb.api_('dispositivoSalvar', { id: f.ID, nome: 'x' }).ok, false, 'administrador não administra o restrito');
  const perm = amb.api_('permissoes');
  assert.ok(!perm.dispositivos.some((d) => d.restrito), 'administrador não lista o restrito nas permissões');
  const aud = amb.api_('auditoria');
  assert.ok(!aud.itens.some((a) => a.dispositivo === 'Porta da Diretoria'), 'auditoria do restrito só para a Diretoria');
  amb.como(DIR);
  p = amb.api_('painel');
  assert.ok(nomes(p).includes('Porta da Diretoria'));
  assert.ok(nomes(p).includes('Portão principal'));
  amb.como(CLIENTE);
  assert.equal(amb.api_('painel').ok, false);
});

test('permissões no servidor: técnico sem permissão é negado e registrado; VER não aciona; ACIONAR aciona; vigência vencida não vale; revogação', () => {
  const amb = ambiente();
  sincronizar(amb);
  const p1 = amb.disp('Portão principal');
  amb.como(TEC);
  let r = amb.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-tec-0000001' });
  assert.equal(r.ok, false); assert.match(r.message, /não foi encontrado ou não está liberado/);
  amb.como(ADMIN);
  assert.equal(amb.api_('permissaoConceder', { usuarioId: 'uT', dispositivoId: p1.ID, permissao: 'VER', motivo: 'recebe entregas' }).ok, true);
  amb.como(TEC);
  let painel = amb.api_('painel');
  assert.equal(painel.unidades[0].dispositivos[0].nome, 'Portão principal');
  assert.equal(painel.unidades[0].dispositivos[0].podeAcionar, false);
  r = amb.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-tec-0000002' });
  assert.equal(r.ok, false); assert.match(r.message, /permissão só para ver/);
  const negado = amb.tabelas.AUT_COMANDOS.find((c) => c.OPERACAO_ID === 'op-tec-0000002');
  assert.equal(negado.AUTORIZACAO, 'NEGADO'); assert.equal(negado.SITUACAO, 'NEGADO');
  assert.ok(amb.tabelas.AUT_AUDITORIA.some((a) => a.EVENTO === 'COMANDO_NAO_AUTORIZADO' && a.USUARIO_ID === 'uT'));
  amb.como(ADMIN);
  assert.equal(amb.api_('permissaoConceder', { usuarioId: 'uT', dispositivoId: p1.ID, permissao: 'ACIONAR', motivo: 'portaria da manhã', vigenciaFim: '2099-12-31' }).ok, true);
  assert.equal(amb.tabelas.AUT_PERMISSOES.filter((p) => p.STATUS === 'ATIVA' && p.USUARIO_ID === 'uT').length, 1, 'a nova substitui a anterior');
  amb.como(TEC);
  r = amb.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-tec-0000003' });
  assert.equal(r.ok, true, r.message);
  assert.equal(r.comando.situacao, 'SIMULADO', 'não homologado = simulação');
  assert.equal(amb.comandosApi().length, 0, 'nada saiu');
  // vigência vencida
  amb.tabelas.AUT_PERMISSOES.filter((p) => p.STATUS === 'ATIVA').forEach((p) => { p.VIGENCIA_FIM = new Date(Date.now() - 1000).toISOString(); });
  r = amb.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-tec-0000004' });
  assert.equal(r.ok, false);
  // conceder: só interno ativo, só ADMIN/DIRETORIA, data inválida
  amb.como(GESTOR);
  assert.equal(amb.api_('permissaoConceder', { usuarioId: 'uT', dispositivoId: p1.ID, permissao: 'VER', motivo: 'xxxxx' }).ok, false);
  amb.como(ADMIN);
  assert.equal(amb.api_('permissaoConceder', { usuarioId: 'uX', dispositivoId: p1.ID, permissao: 'VER', motivo: 'xxxxx' }).ok, false, 'inativo');
  assert.equal(amb.api_('permissaoConceder', { usuarioId: 'uT', dispositivoId: p1.ID, permissao: 'VER', motivo: 'xxxxx', vigenciaFim: '2020-01-01' }).ok, false, 'já passou');
  assert.equal(amb.api_('permissaoConceder', { usuarioId: 'uT', dispositivoId: p1.ID, permissao: 'VER', motivo: 'xxxxx' }).ok, true);
  const ativa = amb.tabelas.AUT_PERMISSOES.find((p) => p.STATUS === 'ATIVA' && p.USUARIO_ID === 'uT');
  assert.equal(amb.api_('permissaoRevogar', { id: ativa.ID, motivo: 'saiu da portaria' }).ok, true);
  amb.como(TEC);
  assert.equal(amb.api_('painel').unidades.length, 0);
});

test('porta da Diretoria: só diretor com ACIONAR, concedida por diretor a diretor, com confirmação ABRIR; fluxo bilhete + abertura e confirmação pelo registro', () => {
  const amb = ambiente();
  sincronizar(amb);
  const f = amb.disp('Porta da Diretoria');
  amb.como(DIR);
  let r = amb.api_('comando', { dispositivoId: f.ID, operacaoId: 'op-dir-0000001', confirmacao: 'ABRIR' });
  assert.equal(r.ok, false); assert.match(r.message, /expressamente autorizado/);
  assert.equal(amb.api_('permissaoConceder', { usuarioId: 'uG', dispositivoId: f.ID, permissao: 'ACIONAR', motivo: 'teste' }).ok, false, 'só perfil Diretoria');
  assert.equal(amb.api_('permissaoConceder', { usuarioId: 'uD2', dispositivoId: f.ID, permissao: 'ACIONAR', motivo: 'diretor financeiro' }).ok, true);
  amb.como(DIR2);
  r = amb.api_('comando', { dispositivoId: f.ID, operacaoId: 'op-dir2-000001' });
  assert.equal(r.ok, false); assert.match(r.message, /digite ABRIR/);
  // homologar (só Diretoria, com HOMOLOGAR e motivo) e ligar
  assert.equal(amb.api_('homologar', { id: f.ID, homologado: true, motivo: 'teste presencial em 22/10 com o diretor', confirmacao: 'HOMOLOGAR' }).ok, true);
  amb.como(ADMIN);
  assert.equal(amb.api_('homologar', { id: f.ID, homologado: true, motivo: 'xxxxxxxxx', confirmacao: 'HOMOLOGAR' }).ok, false, 'administrador não homologa');
  amb.como(DIR2);
  r = amb.api_('comando', { dispositivoId: f.ID, operacaoId: 'op-dir2-000002', confirmacao: 'abrir' });
  assert.equal(r.ok, true, r.message);
  assert.equal(r.comando.modo, 'REAL');
  assert.equal(r.comando.situacao, 'CONFIRMADO', r.texto);
  const posts = amb.comandosApi().map((p) => p.caminho);
  assert.ok(posts.some((c) => /password-ticket$/.test(c)) && posts.some((c) => /password-free\/open-door$/.test(c)));
  assert.ok(!posts.some((c) => /\/commands$/.test(c)), 'fechadura não vai por /commands');
  assert.ok(!JSON.stringify(amb.tabelas).includes('tk-abc'), 'bilhete nunca gravado');
  const eventos = amb.tabelas.AUT_AUDITORIA.filter((a) => a.OPERACAO_ID === 'op-dir2-000002').map((a) => a.EVENTO);
  assert.deepEqual(eventos, ['COMANDO_SOLICITADO', 'COMANDO_ACEITO', 'EXECUCAO_CONFIRMADA']);
  assert.ok(amb.tabelas.AUT_AUDITORIA.filter((a) => a.OPERACAO_ID === 'op-dir2-000002').every((a) => a.RESTRITO === 'SIM'));
});

test('fechadura sem abertura remota pela API: "não disponível pela API" com o porquê; a solicitação é negada e registrada', () => {
  const amb = ambiente();
  amb.api.remoto = false;
  sincronizar(amb);
  const f = amb.disp('Porta da Diretoria');
  assert.equal(f.COMPAT_OK, 'NAO'); assert.match(f.COMPAT_MOTIVO, /Não disponível pela API/);
  amb.como(DIR);
  amb.api_('permissaoConceder', { usuarioId: 'uD', dispositivoId: f.ID, permissao: 'ACIONAR', motivo: 'própria diretora' });
  const painel = amb.api_('painel');
  const d = painel.unidades[0].dispositivos.find((x) => x.nome === 'Porta da Diretoria');
  assert.equal(d.compatOk, false);
  const r = amb.api_('comando', { dispositivoId: f.ID, operacaoId: 'op-dir-sem-api-01', confirmacao: 'ABRIR' });
  assert.equal(r.ok, false); assert.match(r.message, /não disponível pela API/);
  assert.equal(amb.comandosApi().length, 0);
});

test('portão: solicitado -> aceito -> confirmado com comando real; aceito sem confirmação avisa a gestão (S66) e "Conferir agora" confirma depois', () => {
  const amb = ambiente();
  sincronizar(amb);
  const p1 = amb.disp('Portão principal');
  amb.como(DIR);
  amb.api_('homologar', { id: p1.ID, homologado: true, motivo: 'teste presencial do portão', confirmacao: 'HOMOLOGAR' });
  amb.como(GESTOR);
  assert.equal(amb.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-gestor-0000001' }).ok, false, 'gestor sem permissão');
  amb.como(ADMIN);
  let r = amb.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-adm-0000001' });
  assert.equal(r.ok, true, r.message);
  assert.equal(r.comando.situacao, 'CONFIRMADO');
  assert.equal(r.comando.apiTid, 'tid-p');
  const cmdApi = amb.comandosApi().find((p) => /\/commands$/.test(p.caminho));
  assert.equal(JSON.stringify(cmdApi.corpo), JSON.stringify({ commands: [{ code: 'switch_1', value: true }] }));
  const reg = amb.tabelas.AUT_COMANDOS.find((c) => c.OPERACAO_ID === 'op-adm-0000001');
  assert.equal(reg.MODO, 'REAL'); assert.equal(reg.API_HTTP, '200'); assert.ok(reg.CONFIRMADO_EM);
  assert.equal(amb.notificacoes.length, 0);
  // o acionador voltou ao repouso (pulso) e o estado guardado no dispositivo ainda diz switch_1 = true: o comando seguinte
  // relê o estado antes de enviar e por isso ainda consegue confirmar a mudança
  assert.equal(JSON.parse(amb.disp('Portão principal').ESTADO_JSON)[0].value, true, 'estado guardado velho');
  amb.api.portaoAberto = false;
  amb.tabelas.AUT_COMANDOS.forEach((c) => { c.QUANDO_EM = new Date(Date.now() - 120000).toISOString(); });
  const rr = amb.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-adm-0000002' });
  assert.equal(rr.comando.situacao, 'CONFIRMADO', rr.texto);
  assert.equal(JSON.parse(amb.tabelas.AUT_COMANDOS.find((c) => c.OPERACAO_ID === 'op-adm-0000002').ESTADO_ANTES_JSON)[0].value, false, 'antes lido na hora');
  // aceito mas o estado não muda: ACEITO + aviso; depois o dispositivo muda e "Conferir agora" confirma
  const amb2 = ambiente();
  sincronizar(amb2);
  const p2 = amb2.disp('Portão secundário');
  amb2.como(DIR);
  amb2.api_('homologar', { id: p2.ID, homologado: true, motivo: 'teste presencial do portão 2', confirmacao: 'HOMOLOGAR' });
  amb2.api.recusaComando = null;
  // o simulador marca portaoAberto=true no POST; forçamos o estado a não mudar
  const origFetch = amb2.ctx.UrlFetchApp.fetch;
  amb2.ctx.UrlFetchApp.fetch = function (url, op) { const r0 = origFetch(url, op); if (/\/commands$/.test(new URL(url).pathname)) amb2.api.portaoAberto = false; return r0; };
  let r2 = amb2.api_('comando', { dispositivoId: p2.ID, operacaoId: 'op-dir-sec-000001' });
  assert.equal(r2.ok, true, r2.message);
  assert.equal(r2.comando.situacao, 'ACEITO');
  assert.match(r2.texto, /não foi confirmada/);
  assert.equal(amb2.notificacoes.length, 1);
  assert.equal(amb2.notificacoes[0].evento, 'S66');
  assert.equal(Array.from(amb2.notificacoes[0].usuarios).sort().join(','), 'uA,uD,uD2');
  assert.equal(r2.comando.podeConferir, true);
  amb2.api.portaoAberto = true;
  const c = amb2.api_('conferir', { comandoId: r2.comando.id });
  assert.equal(c.ok, true, c.message);
  assert.equal(c.comando.situacao, 'CONFIRMADO');
  // pendência: só aparece enquanto ACEITO há mais de 2 min
  const itens = [];
  amb2.tabelas.AUT_COMANDOS.push({ ID: 'cx', OPERACAO_ID: 'op-velho', QUANDO: '22/10/2026 10:00', QUANDO_EM: new Date(Date.now() - 600000).toISOString(), SITUACAO: 'ACEITO', TIPO: 'PORTAO', DISPOSITIVO_NOME: 'Portão principal', SOLICITANTE: 'X', COMANDO: 'ABRIR', AUTORIZACAO: 'AUTORIZADO' });
  amb2.ctx.AutPred_fontePendencias_((x) => itens.push(x), { cliente: false, gestao: true });
  assert.equal(itens.length, 1); assert.equal(itens[0].publico, 'GESTAO');
});

test('idempotência, limites e repetição: o mesmo identificador não executa de novo; 10 s por dispositivo; 5 por pessoa por minuto; sem resultado não repete', () => {
  const amb = ambiente();
  sincronizar(amb);
  const p1 = amb.disp('Portão principal'), p2 = amb.disp('Portão secundário');
  amb.como(DIR);
  amb.api_('homologar', { id: p1.ID, homologado: true, motivo: 'teste presencial', confirmacao: 'HOMOLOGAR' });
  amb.como(ADMIN);
  const r1 = amb.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-rep-00000001' });
  assert.equal(r1.ok, true);
  const n = amb.comandosApi().length;
  const r2 = amb.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-rep-00000001' });
  assert.equal(r2.ok, true); assert.equal(r2.repetido, true); assert.match(r2.texto, /já foi processada/);
  assert.equal(amb.comandosApi().length, n, 'nada reenviado');
  assert.equal(amb.tabelas.AUT_COMANDOS.filter((c) => c.OPERACAO_ID === 'op-rep-00000001').length, 1);
  const r3 = amb.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-rep-00000002' });
  assert.equal(r3.ok, false); assert.match(r3.message, /intervalo mínimo de 10 s/);
  assert.equal(amb.api_('comando', { dispositivoId: p1.ID, operacaoId: 'curto' }).ok, false, 'identificador curto');
  // limite por pessoa: 5 autorizados no minuto (em outro dispositivo, simulação)
  for (let i = 0; i < 6; i++) amb.tabelas.AUT_COMANDOS.push({ ID: 'lim' + i, OPERACAO_ID: 'op-lim-' + i, QUANDO_EM: new Date(Date.now() - 1000 * (i + 1)).toISOString(), SOLICITANTE_ID: 'uA', DISPOSITIVO_ID: 'outro' + i, AUTORIZACAO: 'AUTORIZADO', SITUACAO: 'SIMULADO' });
  const r4 = amb.api_('comando', { dispositivoId: p2.ID, operacaoId: 'op-rep-00000003' });
  assert.equal(r4.ok, false); assert.match(r4.message, /comandos no último minuto/);
  assert.equal(amb.tabelas.AUT_COMANDOS.find((c) => c.OPERACAO_ID === 'op-rep-00000003').SITUACAO, 'NEGADO');
  // sem resultado (ACEITO há 30 s) não repete, mesmo passados os 10 s
  const amb2 = ambiente();
  sincronizar(amb2);
  const q = amb2.disp('Portão principal');
  amb2.tabelas.AUT_COMANDOS.push({ ID: 'ac', OPERACAO_ID: 'op-aceito-1', QUANDO: '22/10/2026 10:00', QUANDO_EM: new Date(Date.now() - 30000).toISOString(), SOLICITANTE_ID: 'uD', DISPOSITIVO_ID: q.ID, AUTORIZACAO: 'AUTORIZADO', SITUACAO: 'ACEITO' });
  amb2.como(ADMIN);
  const r5 = amb2.api_('comando', { dispositivoId: q.ID, operacaoId: 'op-rep-00000009' });
  assert.equal(r5.ok, false); assert.match(r5.message, /ainda está sem resultado/);
});

test('simulação: automação desligada ou dispositivo não homologado = nada sai; API recusa (2008) e sem resposta ficam registrados sem lançar', () => {
  const amb = ambiente({ props: { TUYA_LIGADO: '0' } });
  amb.como(ADMIN);
  assert.equal(amb.api_('sincronizar').ok, false, 'desligado não lê');
  const amb2 = ambiente();
  sincronizar(amb2);
  const p1 = amb2.disp('Portão principal');
  amb2.props.TUYA_LIGADO = '0';
  amb2.como(ADMIN);
  const antes = amb2.api.pedidos.length;
  let r = amb2.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-sim-00000001' });
  assert.equal(r.ok, true); assert.equal(r.comando.situacao, 'SIMULADO'); assert.equal(r.comando.modo, 'SIMULACAO');
  assert.equal(amb2.api.pedidos.length, antes, 'nenhuma chamada');
  assert.ok(amb2.api_('painel').config.faltas.length >= 1);
  amb2.props.TUYA_LIGADO = '1';
  amb2.tabelas.AUT_COMANDOS.forEach((c) => { c.QUANDO_EM = new Date(Date.now() - 120000).toISOString(); });
  amb2.como(DIR);
  amb2.api_('homologar', { id: p1.ID, homologado: true, motivo: 'teste presencial', confirmacao: 'HOMOLOGAR' });
  amb2.api.recusaComando = { success: false, code: 2008, msg: 'not supported' };
  amb2.como(ADMIN);
  r = amb2.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-rec-00000001' });
  assert.equal(r.ok, true); assert.equal(r.comando.situacao, 'RECUSADO'); assert.match(r.comando.detalhe, /2008/);
  amb2.tabelas.AUT_COMANDOS.forEach((c) => { c.QUANDO_EM = new Date(Date.now() - 120000).toISOString(); });
  amb2.api.recusaComando = null; amb2.api.falhaRede = true;
  r = amb2.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-rede-0000001' });
  assert.equal(r.ok, true); assert.equal(r.comando.situacao, 'INCERTO'); assert.equal(r.comando.podeConferir, true);
  assert.ok(!JSON.stringify(amb2.tabelas).includes('segredo-de-teste-0001'), 'segredo nunca em tabela');
});

test('registro inviolável: corrente íntegra; linha alterada ou apagada é detectada', () => {
  const amb = ambiente();
  sincronizar(amb);
  amb.como(ADMIN);
  assert.equal(amb.api_('permissaoConceder', { usuarioId: 'uT', dispositivoId: amb.disp('Portão principal').ID, permissao: 'VER', motivo: 'teste do registro' }).ok, true);
  let r = amb.api_('integridade');
  assert.equal(r.ok, true); assert.equal(r.problemas.length, 0); assert.ok(r.total >= 4);
  const aud = amb.tabelas.AUT_AUDITORIA;
  for (let i = 1; i < aud.length; i++) assert.equal(aud[i].HASH_ANTERIOR, aud[i - 1].HASH);
  aud[1].DETALHE = 'alterado à mão';
  r = amb.api_('integridade');
  assert.equal(r.problemas.length >= 1, true); assert.match(r.texto, /alterada depois de registrada/);
  aud[1].DETALHE = aud[1].DETALHE; // segue alterada
  aud.splice(2, 1);
  r = amb.api_('integridade');
  assert.ok(r.problemas.some((p) => /fora da corrente/.test(p)));
});

test('administração do dispositivo: unidade do cadastro, localização, comando de abertura conferido contra as funções; nome nunca some', () => {
  const amb = ambiente();
  sincronizar(amb);
  const p1 = amb.disp('Portão principal');
  amb.como(ADMIN);
  let r = amb.api_('dispositivoSalvar', { id: p1.ID, nome: 'Portão da frente', unidadeId: 'un1', localizacao: 'Entrada principal', ativo: true, comandoAbrir: '{"code":"switch_1","value":true}' });
  assert.equal(r.ok, true, r.message);
  assert.equal(amb.disp('Portão da frente').UNIDADE_NOME, 'MATRIZ GOIÂNIA');
  assert.equal(amb.api_('dispositivoSalvar', { id: p1.ID, comandoAbrir: '{"code":"nao_existe","value":true}' }).ok, false);
  assert.equal(amb.api_('dispositivoSalvar', { id: p1.ID, restrito: true }).ok, false, 'administrador não marca restrito');
  assert.equal(amb.api_('dispositivoSalvar', { id: p1.ID, unidadeId: '', unidadeNome: 'METROLABS — MATRIZ GOIÂNIA' }).ok, true);
  const painel = amb.api_('painel');
  assert.equal(painel.unidades[0].nome, 'METROLABS — MATRIZ GOIÂNIA');
  assert.equal(amb.api_('unidades').unidades[0].cliente, 'METROLABS');
  amb.como(DIR);
  assert.equal(amb.api_('dispositivoSalvar', { id: p1.ID, restrito: true }).ok, true);
  amb.como(ADMIN);
  assert.equal(amb.api_('painel').restritosOcultos, 2);
  amb.como(GESTOR);
  assert.equal(amb.api_('iniciar').mostrarMenu, false);
  amb.como(DIR);
  assert.equal(amb.api_('iniciar').mostrarMenu, true);
});
