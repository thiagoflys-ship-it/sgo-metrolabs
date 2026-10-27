// Segurança e automação predial (SGO_Automacao_Predial.js + SGO_Automacao_Tuya.js) num contexto isolado, com a nuvem
// Tuya SIMULADA (nenhum comando real) e dados fictícios (22/10/2026). Confere: quem é diretor (perfil, vínculo ou
// responsável pelo sistema), porta da Diretoria do responsável pelo sistema, permissões no servidor, confirmação sem
// digitar (token de uso único da janela), fase de implantação, idempotência, limites, solicitado -> aceito -> confirmado,
// simulação e registro encadeado.
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

// DONO = responsável pelo sistema (SGO_DONOS = admin), perfil ADMIN: é diretor. ADM2 = Administrador que não é diretor.
const DONO = { userId: 'uA', usuario: 'admin', nome: 'DONO TESTE', perfil: 'ADMIN' };
const ADM2 = { userId: 'uA2', usuario: 'adm2', nome: 'ADMINISTRADOR DOIS', perfil: 'ADMIN' };
const DIR = { userId: 'uD', usuario: 'charles', nome: 'DIRETOR TESTE', perfil: 'DIRETORIA' };
const DIRV = { userId: 'uV', usuario: 'dirvinc', nome: 'DIRETOR POR VINCULO', perfil: 'GESTOR' };
const GESTOR = { userId: 'uG', usuario: 'gestor', nome: 'GESTOR TESTE', perfil: 'GESTOR' };
const TEC = { userId: 'uT', usuario: 'tec', nome: 'TECNICO TESTE', perfil: 'TECNICO' };
const CLIENTE = { userId: 'uC', usuario: 'cli', nome: 'CLIENTE', perfil: 'CLIENTE', clienteId: 'c1' };

function ambiente(o) {
  o = o || {};
  const props = Object.assign({ TUYA_ACCESS_ID: 'id-de-teste-0001', TUYA_ACCESS_SECRET: 'segredo-de-teste-0001', TUYA_REGIAO: 'us', TUYA_LIGADO: '1', TUYA_ENDPOINT: 'http://localhost:8199',
    // 27/10/2026: consulta econômica liberada o dia todo nos testes (a janela real é conferida no teste da cota)
    AUT_SAUDE_CFG: JSON.stringify({ consultaInicio: '00:00', consultaFim: '23:59', consultaDias: [0, 1, 2, 3, 4, 5, 6] }) }, o.props || {});
  Object.keys(props).forEach((k) => { if (props[k] === null) delete props[k]; });
  const cache = {};
  const tabelas = { CAD_USUARIOS: [
    { ID: 'uA', USUARIO: 'admin', NOME: 'DONO TESTE', PERFIL: 'ADMIN', STATUS: 'ATIVO', VINCULO_TRABALHO: 'DIRETORIA' },
    { ID: 'uA2', USUARIO: 'adm2', NOME: 'ADMINISTRADOR DOIS', PERFIL: 'ADMIN', STATUS: 'ATIVO', VINCULO_TRABALHO: 'CLT' },
    { ID: 'uD', USUARIO: 'charles', NOME: 'DIRETOR TESTE', PERFIL: 'DIRETORIA', STATUS: 'ATIVO', VINCULO_TRABALHO: 'DIRETORIA' },
    { ID: 'uV', USUARIO: 'dirvinc', NOME: 'DIRETOR POR VINCULO', PERFIL: 'GESTOR', STATUS: 'ATIVO', VINCULO_TRABALHO: 'DIRETORIA' },
    { ID: 'uG', USUARIO: 'gestor', NOME: 'GESTOR TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', VINCULO_TRABALHO: 'CLT' },
    { ID: 'uT', USUARIO: 'tec', NOME: 'TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', VINCULO_TRABALHO: 'CLT' },
    { ID: 'uX', USUARIO: 'inativo', NOME: 'INATIVO', PERFIL: 'TECNICO', STATUS: 'INATIVO' }],
    CAD_UNIDADES: [{ ID: 'un1', CLIENTE_ID: 'c1', NOME_UNIDADE: 'MATRIZ GOIÂNIA', CIDADE: 'Goiânia', STATUS: 'ATIVO' }], CAD_CLIENTES: [{ ID: 'c1', NOME_FANTASIA: 'METROLABS', STATUS: 'ATIVO' }] };
  const cabecalhos = {};
  const api = { pedidos: [], portaoAberto: false, fechaduraAbre: true, recusaComando: null, falhaRede: false, remoto: true, registrosFechadura: 1 };
  const notificacoes = [];
  const sessao = { atual: o.sessao || DONO };
  let seq = 0;
  const resposta = (code, corpo) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(corpo), getAllHeaders: () => ({}) });
  // garagem real (22/10/2026): switch_1, door_control_1 (open/close) e o sensor de posição doorcontact_state
  const estadoGaragem = () => (api.garagem ? [{ code: 'switch_1', value: false }, { code: 'door_control_1', value: api.dc1 || 'close' }, { code: 'doorcontact_state', value: !!api.portaoAberto }] : [{ code: 'switch_1', value: false }]);
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
          { id: 'dev-portao-1', name: 'Portão principal', category: 'ckmkzq', product_name: 'Abridor', online: true, status: estadoGaragem() },
          { id: 'dev-portao-2', name: 'Portão secundário', category: 'ckmkzq', product_name: 'Abridor', online: true, status: [{ code: 'switch_1', value: false }] },
          { id: 'dev-fech-1', name: 'Porta da Diretoria', category: 'jtmspro', product_name: 'Fechadura', online: true, status: [{ code: 'residual_electricity', value: 80 }, { code: 'lock_motor_state', value: false }] }
        ] } });
        // 22/10/2026: fechadura real em modo pedido (campainha) e garagem com door_control_1 (open/close), como lidos em produção
        if (api.pedido && /dev-fech-1\/functions$/.test(u.pathname)) return resposta(200, { success: true, result: { category: 'ms', functions: [{ code: 'reply_unlock_request', type: 'Boolean', values: '{}' }] } });
        if (api.pedido && /door-lock\/remote-unlocks$/.test(u.pathname)) return resposta(200, { success: true, result: [] });
        if (/shadow\/properties$/.test(u.pathname)) { api.leiturasSombra = (api.leiturasSombra || 0) + 1; return resposta(200, { success: true, result: { properties: [{ code: 'unlock_request', value: api.pedidoValor || 0, time: api.pedidoEm || Date.now() }, { code: 'doorbell', value: true, time: api.campainhaEm || 0 }, { code: 'closed_opened', value: api.fechAberta ? 'open' : 'closed', time: Date.now() }] } }); }
        if (api.pedido && /dev-fech-1\/commands$/.test(u.pathname)) { const v = JSON.parse(op.payload).commands[0]; (api.respostasPedido = api.respostasPedido || []).push(v); if (!(api.pedidoValor > 0)) return resposta(200, { success: false, code: 2008, msg: 'not in request window' }); if (v.value === true) api.fechAberta = true; api.pedidoValor = 0; return resposta(200, { success: true, result: true, tid: 'tid-r' }); }
        if (api.garagem && /dev-portao-1\/functions$/.test(u.pathname)) return resposta(200, { success: true, result: { category: 'ckmkzq', functions: [{ code: 'switch_1', type: 'Boolean', values: '{}' }, { code: 'door_control_1', type: 'Enum', values: '{"range":["open","close"]}' }] } });
        if (api.garagem && /dev-portao-1\/commands$/.test(u.pathname)) { const v = JSON.parse(op.payload).commands[0]; (api.cmdGaragem = api.cmdGaragem || []).push(v); if (v.code === 'door_control_1') api.dc1 = v.value; else if (v.code === 'switch_1' && typeof v.value === 'boolean' && !api.sensorLento) api.portaoAberto = v.value; return resposta(200, { success: true, result: true, tid: 'tid-g' }); }
        if (api.garagem && u.pathname === '/v1.0/devices/dev-portao-1') { api.leiturasGaragem = (api.leiturasGaragem || 0) + 1; return resposta(200, { success: true, result: { id: 'dev-portao-1', online: true, status: estadoGaragem() } }); }
        if (/\/functions$/.test(u.pathname)) return u.pathname.includes('fech') ? resposta(200, { success: true, result: { category: 'jtmspro', functions: api.remoto ? [{ code: 'remote_no_dp_key', type: 'Raw' }] : [{ code: 'unlock_temporary', type: 'Integer' }] } })
          : resposta(200, { success: true, result: { category: 'ckmkzq', functions: [{ code: 'switch_1', type: 'Boolean' }] } });
        if (/door-lock\/remote-unlocks$/.test(u.pathname)) return resposta(200, { success: true, result: api.remoto ? [{ remote_unlock_type: 'remoteUnlockWithoutPwd', open: true }] : [] });
        if (/door-lock\/password-ticket$/.test(u.pathname)) return resposta(200, { success: true, result: { ticket_id: 'tk-abc', ticket_key: 'xx' } });
        if (/password-free\/open-door$/.test(u.pathname)) { if (api.fechaduraAbre) api.fechAberta = true; return resposta(200, { success: true, result: true, tid: 'tid-f' }); }
        if (/door-lock\/open-logs$/.test(u.pathname)) return resposta(200, { success: true, result: { records: Array.from({ length: api.fechAberta ? api.registrosFechadura : 0 }, () => (api.pedido ? { status: { code: 'unlock_app', value: '0' }, unlock_name: '' } : { unlock_name: 'remote' })) } });
        if (/\/commands$/.test(u.pathname)) { if (api.recusaComando) return resposta(200, api.recusaComando); api.portaoAberto = true; return resposta(200, { success: true, result: true, tid: 'tid-p' }); }
        if (/\/status$/.test(u.pathname)) return resposta(200, { success: true, result: [{ code: 'switch_1', value: api.portaoAberto }] });
        if (u.pathname === '/v1.0/devices/dev-fech-1') return resposta(200, { success: true, result: { id: 'dev-fech-1', online: true, status: [{ code: 'residual_electricity', value: 80 }, { code: 'lock_motor_state', value: !!api.fechAberta }] } });
        if (/^\/v1\.0\/devices\/dev-portao/.test(u.pathname)) return resposta(200, { success: true, result: { id: u.pathname.split('/')[3], online: true, status: [{ code: 'switch_1', value: api.portaoAberto }] } });
        return resposta(200, { success: false, code: 2010, msg: 'device not exist' });
      }
    },
    CertCal_garantirColuna_: (t, c) => { if (cabecalhos[t] && cabecalhos[t].indexOf(c) < 0) cabecalhos[t].push(c); },
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
    // como SGO_Chaves.js: SGO_DONOS = ['admin']
    Chaves_ehDonoUsuario_: (u) => String(u || '').trim().toLowerCase() === 'admin',
    exigirSessao: () => Object.assign({}, sessao.atual),
    SGO_notificar_: (x) => { notificacoes.push(x); return { ok: 1, erro: 0, pulado: 0 }; },
    Pend_item_: (tipo, o) => Object.assign({ tipo }, o)
  });
  for (const f of ['SGO_Automacao_Tuya.js', 'SGO_Automacao_Predial.js', 'SGO_Automacao_Saude.js']) vm.runInContext(ler(f), ctx);
  const como = (s) => { sessao.atual = s; };
  const api_ = (acao, dados) => JSON.parse(JSON.stringify(ctx.AutPred_api('sess', acao, dados || {})));
  /** O que a tela faz: toque no botão (preparar -> token) e "Sim, abrir agora" (comando com o token). */
  const abrir = (dispositivoId, operacaoId) => {
    const p = api_('preparar', { dispositivoId, operacaoId });
    if (!p.ok) return p;
    return api_('comando', { dispositivoId, operacaoId, confirmacaoToken: p.confirmacaoToken });
  };
  const disp = (nome) => (tabelas.AUT_DISPOSITIVOS || []).find((d) => d.NOME === nome);
  const comandosApi = () => api.pedidos.filter((p) => p.metodo === 'POST');
  const homologar = (nome) => { const anterior = sessao.atual; como(DIR); const r = api_('homologar', { id: disp(nome).ID, homologado: true, motivo: 'teste presencial acompanhado' }); assert.equal(r.ok, true, r.message); como(anterior); };
  const envelhecer = () => { (tabelas.AUT_COMANDOS || []).forEach((c) => { c.QUANDO_EM = new Date(Date.now() - 120000).toISOString(); }); (tabelas.AUT_DISPOSITIVOS || []).forEach((d) => { if (d.ULT_CMD_EM) d.ULT_CMD_EM = new Date(Date.now() - 120000).toISOString(); }); };
  return { ctx, props, tabelas, api, notificacoes, como, api_, abrir, disp, comandosApi, cache, homologar, envelhecer };
}

function sincronizar(amb) { amb.como(DONO); const r = amb.api_('sincronizar'); assert.equal(r.ok, true, r.message); return r; }
const nomes = (p) => p.unidades.flatMap((u) => u.dispositivos.map((d) => d.nome));

test('garagem: preparar fechar relê a posição real quando a posição guardada está velha', () => {
  const amb=ambiente();amb.api.garagem=true;sincronizar(amb);amb.homologar('Portão principal');
  const g=amb.disp('Portão principal');
  assert.equal(JSON.parse(g.ESTADO_JSON).find(x=>x.code==='doorcontact_state').value,false);
  amb.api.portaoAberto=true; // abriu por controle físico/Smart Life, sem reler a tela
  const p=amb.api_('preparar',{dispositivoId:g.ID,operacaoId:'op-sensor-velho-001',acao:'FECHAR'});
  assert.equal(p.ok,true,p.message);assert.equal(p.acao,'FECHAR');assert.equal(amb.comandosApi().length,0);
});

test('garagem: botão alternado resolve abrir e fechar no servidor, usa true para abrir e false para fechar e não muda o pedestre', () => {
  const amb=ambiente();amb.api.garagem=true;sincronizar(amb);amb.homologar('Portão principal');
  const g=amb.disp('Portão principal');
  let p=amb.api_('preparar',{dispositivoId:g.ID,operacaoId:'op-alternar-abrir-001',acao:'ALTERNAR'});
  assert.equal(p.ok,true,p.message);assert.equal(p.acao,'ABRIR');
  let r=amb.api_('comando',{dispositivoId:g.ID,operacaoId:'op-alternar-abrir-001',acao:p.acao,confirmacaoToken:p.confirmacaoToken});
  assert.equal(r.ok,true,r.message);amb.envelhecer();
  p=amb.api_('preparar',{dispositivoId:g.ID,operacaoId:'op-alternar-fechar-001',acao:'ALTERNAR'});
  assert.equal(p.ok,true,p.message);assert.equal(p.acao,'FECHAR');
  r=amb.api_('comando',{dispositivoId:g.ID,operacaoId:'op-alternar-fechar-001',acao:p.acao,confirmacaoToken:p.confirmacaoToken});
  assert.equal(r.ok,true,r.message);assert.deepEqual(amb.api.cmdGaragem,[{code:'switch_1',value:true},{code:'switch_1',value:false}]);
  const ped=amb.disp('Portão secundário');
  assert.equal(amb.api_('preparar',{dispositivoId:ped.ID,operacaoId:'op-pedestre-alternar-001',acao:'ALTERNAR'}).ok,false);
});

test('garagem: leitura falha ou posição muda durante confirmação não envia pulso contrário', () => {
  const amb=ambiente();amb.api.garagem=true;sincronizar(amb);amb.homologar('Portão principal');
  const g=amb.disp('Portão principal');
  amb.api.portaoAberto=true;
  const p=amb.api_('preparar',{dispositivoId:g.ID,operacaoId:'op-mudou-sensor-001',acao:'ALTERNAR'});
  assert.equal(p.ok,true,p.message);assert.equal(p.acao,'FECHAR');
  amb.api.portaoAberto=false;
  const r=amb.api_('comando',{dispositivoId:g.ID,operacaoId:'op-mudou-sensor-001',acao:p.acao,confirmacaoToken:p.confirmacaoToken});
  assert.equal(r.ok,false);assert.match(r.message,/já está fechado/);assert.equal(amb.api.cmdGaragem,undefined);
  amb.api.falhaRede=true;
  const erro=amb.api_('preparar',{dispositivoId:g.ID,operacaoId:'op-rede-falha-001',acao:'ALTERNAR'});
  assert.equal(erro.ok,false);assert.match(erro.message,/posição atual/);assert.equal(amb.api.cmdGaragem,undefined);
  amb.api.falhaRede=false;amb.api.portaoAberto=true;
  const p2=amb.api_('preparar',{dispositivoId:g.ID,operacaoId:'op-rede-cai-confirmacao-001',acao:'ALTERNAR'});
  assert.equal(p2.ok,true,p2.message);amb.api.falhaRede=true;
  const r2=amb.api_('comando',{dispositivoId:g.ID,operacaoId:'op-rede-cai-confirmacao-001',acao:p2.acao,confirmacaoToken:p2.confirmacaoToken});
  assert.equal(r2.ok,false);assert.match(r2.message,/posição atual/);assert.equal(amb.api.cmdGaragem,undefined);
});

test('quem é diretor: perfil Diretoria, vínculo Diretoria ou responsável pelo sistema; Administrador comum e Gestor não', () => {
  const amb = ambiente();
  const e = (s) => amb.ctx.AutPred_ehDiretor_(Object.assign({}, s));
  assert.equal(e(DONO), true, 'dono (perfil ADMIN) é diretor');
  assert.equal(e(DIR), true, 'perfil Diretoria');
  assert.equal(e(DIRV), true, 'vínculo de trabalho Diretoria no cadastro');
  assert.equal(e(ADM2), false);
  assert.equal(e(GESTOR), false);
  assert.equal(e(TEC), false);
  assert.equal(amb.ctx.AutPred_usuarioEhDiretor_({ USUARIO: 'admin', PERFIL: 'ADMIN' }), true);
  // uma regra só no módulo: nenhuma comparação solta com 'DIRETORIA' fora dos helpers
  const fonte = ler('SGO_Automacao_Predial.js');
  const soltas = fonte.split('\n').filter((l) => /=== 'DIRETORIA'/.test(l) && !/function AutPred_(ehDiretor_|usuarioEhDiretor_)|AutPred_perfil_\(s\) === 'DIRETORIA'|u\.PERFIL|u\.VINCULO_TRABALHO/.test(l));
  assert.deepEqual(soltas, []);
});

test('sincronização: lê os 3 dispositivos, portão com switch_1, fechadura restrita à Diretoria; nenhum comando sai', () => {
  const amb = ambiente();
  const r = sincronizar(amb);
  assert.match(r.mensagem, /3 dispositivo/);
  assert.equal(amb.tabelas.AUT_DISPOSITIVOS.length, 3);
  const p = amb.disp('Portão principal'), f = amb.disp('Porta da Diretoria');
  assert.equal(p.TIPO, 'PORTAO'); assert.equal(p.COMPAT_OK, 'SIM'); assert.equal(p.RESTRITO_DIRETORIA, 'NAO'); assert.equal(p.HOMOLOGADO, 'NAO');
  assert.equal(f.TIPO, 'FECHADURA'); assert.equal(f.RESTRITO_DIRETORIA, 'SIM'); assert.equal(f.REMOTO_FECHADURA, 'BILHETE');
  assert.equal(amb.comandosApi().length, 0, 'sincronizar só lê');
  sincronizar(amb);
  assert.equal(amb.tabelas.AUT_DISPOSITIVOS.length, 3, 'não duplica');
});

test('porta da Diretoria: invisível para quem não é diretor (Gestor, Técnico, Administrador comum); diretores a veem', () => {
  const amb = ambiente();
  sincronizar(amb);
  amb.homologar('Portão principal'); // em uso: toda a equipe entra
  const f = amb.disp('Porta da Diretoria');
  amb.como(GESTOR);
  let p = amb.api_('painel');
  assert.equal(p.ok, true, p.message);
  assert.deepEqual(nomes(p).sort(), ['Portão principal', 'Portão secundário'], 'portões de toda a equipe; a porta não');
  assert.ok(!JSON.stringify(p).includes('Porta da Diretoria') && !JSON.stringify(p).includes('dev-fech-1'));
  assert.equal(p.restritosOcultos, 0, 'nem a contagem');
  for (const a of ['historico', 'estado', 'preparar']) assert.equal(amb.api_(a, { dispositivoId: f.ID, operacaoId: 'op-gestor-fech-1' }).ok, false, a);
  amb.como(ADM2);
  p = amb.api_('painel');
  assert.ok(!nomes(p).includes('Porta da Diretoria'));
  assert.equal(p.restritosOcultos, 1, 'Administrador comum só vê a contagem');
  assert.ok(!JSON.stringify(p).includes('dev-fech-1'));
  assert.equal(amb.api_('dispositivoSalvar', { id: f.ID, nome: 'x' }).ok, false);
  assert.ok(!amb.api_('permissoes').dispositivos.some((d) => d.restrito));
  assert.ok(!amb.api_('auditoria').itens.some((a) => a.dispositivo === 'Porta da Diretoria'));
  for (const s of [DONO, DIR, DIRV]) {
    amb.como(s);
    p = amb.api_('painel');
    assert.ok(nomes(p).includes('Porta da Diretoria'), s.usuario + ' vê a porta');
    assert.equal(p.restritosOcultos, 0);
  }
  amb.como(CLIENTE);
  assert.equal(amb.api_('painel').ok, false);
});

test('porta da Diretoria: o responsável pelo sistema destrava por padrão; outro diretor só com a permissão que ele concede; bilhete + abertura e confirmação', () => {
  const amb = ambiente();
  sincronizar(amb);
  const f = amb.disp('Porta da Diretoria');
  amb.homologar('Porta da Diretoria');
  // Charles (perfil Diretoria) vê e não destrava; não concede a porta a si nem a outros
  amb.como(DIR);
  let r = amb.abrir(f.ID, 'op-charles-00001');
  assert.equal(r.ok, false); assert.match(r.message, /responsável pelo sistema/);
  assert.equal(amb.api_('permissaoConceder', { usuarioId: 'uD', dispositivoId: f.ID, permissao: 'ACIONAR', motivo: 'quero abrir' }).ok, false, 'só o dono concede a porta');
  // dono: padrão, sem permissão gravada
  amb.como(DONO);
  r = amb.abrir(f.ID, 'op-dono-porta-0001');
  assert.equal(r.ok, true, r.message);
  assert.equal(r.comando.modo, 'REAL');
  assert.equal(r.comando.situacao, 'CONFIRMADO', r.texto);
  assert.match(amb.tabelas.AUT_COMANDOS.find((c) => c.OPERACAO_ID === 'op-dono-porta-0001').AUTORIZACAO_MOTIVO, /padrão/);
  assert.equal(amb.api_('permissaoConceder', { usuarioId: 'uA', dispositivoId: f.ID, permissao: 'ACIONAR', motivo: 'eu mesmo' }).ok, false, 'dono já tem por padrão');
  assert.equal(amb.api_('permissaoConceder', { usuarioId: 'uG', dispositivoId: f.ID, permissao: 'ACIONAR', motivo: 'gestor' }).ok, false, 'só para diretor');
  // dono concede ao Charles, com vigência e auditoria
  r = amb.api_('permissaoConceder', { usuarioId: 'uD', dispositivoId: f.ID, permissao: 'ACIONAR', motivo: 'diretor de operações', vigenciaFim: '2099-12-31' });
  assert.equal(r.ok, true, r.message);
  assert.ok(amb.tabelas.AUT_AUDITORIA.some((a) => a.EVENTO === 'PERMISSAO_CONCEDIDA' && a.RESTRITO === 'SIM'));
  amb.envelhecer();
  amb.como(DIR);
  r = amb.abrir(f.ID, 'op-charles-00002');
  assert.equal(r.ok, true, r.message);
  const posts = amb.comandosApi().map((p) => p.caminho);
  assert.ok(posts.some((c) => /password-ticket$/.test(c)) && posts.some((c) => /password-free\/open-door$/.test(c)));
  assert.ok(!posts.some((c) => /\/commands$/.test(c)), 'fechadura não vai por /commands');
  assert.ok(!JSON.stringify(amb.tabelas).includes('tk-abc'), 'bilhete nunca gravado');
  const eventos = amb.tabelas.AUT_AUDITORIA.filter((a) => a.OPERACAO_ID === 'op-dono-porta-0001').map((a) => a.EVENTO);
  assert.deepEqual(eventos, ['COMANDO_SOLICITADO', 'COMANDO_ACEITO', 'EXECUCAO_CONFIRMADA']);
  // revogar a porta: só o dono
  const perm = amb.tabelas.AUT_PERMISSOES.find((p) => p.USUARIO_ID === 'uD' && p.STATUS === 'ATIVA');
  assert.equal(amb.api_('permissaoRevogar', { id: perm.ID, motivo: 'tentativa do próprio' }).ok, false);
  amb.como(DONO);
  assert.equal(amb.api_('permissaoRevogar', { id: perm.ID, motivo: 'fim do projeto' }).ok, true);
});

test('confirmação sem digitar: só com o token da janela (uso único, 60 s, do mesmo usuário, dispositivo e operação); chamada direta é recusada', () => {
  const amb = ambiente();
  sincronizar(amb);
  const p1 = amb.disp('Portão principal');
  amb.como(DONO);
  // chamada direta sem passar pela janela
  let r = amb.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-direta-000001' });
  assert.equal(r.ok, false); assert.match(r.message, /confirmação na janela/);
  assert.equal(amb.tabelas.AUT_COMANDOS.find((c) => c.OPERACAO_ID === 'op-direta-000001').SITUACAO, 'NEGADO');
  assert.ok(amb.tabelas.AUT_AUDITORIA.some((a) => a.EVENTO === 'COMANDO_SEM_CONFIRMACAO'));
  // token de outra operação, de outro usuário e vencido
  let p = amb.api_('preparar', { dispositivoId: p1.ID, operacaoId: 'op-tok-000000001' });
  assert.equal(p.ok, true, p.message); assert.equal(p.validadeS, 60); assert.equal(p.dispositivo.nome, 'Portão principal');
  r = amb.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-tok-000000002', confirmacaoToken: p.confirmacaoToken });
  assert.equal(r.ok, false); assert.match(r.message, /não é deste usuário, deste dispositivo ou desta solicitação/);
  r = amb.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-tok-000000001', confirmacaoToken: p.confirmacaoToken });
  assert.equal(r.ok, false, 'uso único: o token já foi consumido pela tentativa anterior');
  p = amb.api_('preparar', { dispositivoId: p1.ID, operacaoId: 'op-tok-000000003' });
  amb.como(DIR);
  r = amb.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-tok-000000003', confirmacaoToken: p.confirmacaoToken });
  assert.equal(r.ok, false, 'token de outro usuário');
  amb.como(DONO);
  p = amb.api_('preparar', { dispositivoId: p1.ID, operacaoId: 'op-tok-000000004' });
  const k = Object.keys(amb.cache).find((x) => x.endsWith(p.confirmacaoToken));
  const j = JSON.parse(amb.cache[k]); j.ate = Date.now() - 1; amb.cache[k] = JSON.stringify(j);
  r = amb.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-tok-000000004', confirmacaoToken: p.confirmacaoToken });
  assert.equal(r.ok, false); assert.match(r.message, /venceu/);
  // caminho certo (simulação: não homologado)
  r = amb.abrir(p1.ID, 'op-tok-000000005');
  assert.equal(r.ok, true, r.message); assert.equal(r.comando.situacao, 'SIMULADO');
  assert.equal(amb.comandosApi().length, 0);
  // preparar recusa antes da janela: sem permissão, limite
  assert.match(amb.api_('preparar', { dispositivoId: p1.ID, operacaoId: 'op-tok-000000006' }).message, /intervalo mínimo de 10 s/);
  assert.equal(amb.api_('preparar', { dispositivoId: p1.ID, operacaoId: 'op-tok-000000005' }).ok, false, 'operação já processada');
  // nenhuma palavra digitada no código da tela
  const tela = ler('JS_AutomacaoPredial.html');
  assert.ok(!/Digite ABRIR|HOMOLOGAR|autConfirmacao|autHomConf/.test(tela), 'nada para digitar');
  assert.match(tela, /Sim, abrir agora/);
});

test('fase de implantação: desligado ou nada homologado = só Administrador e diretores (menu, atalho e servidor); depois, toda a equipe interna', () => {
  const amb = ambiente();
  sincronizar(amb);
  const p1 = amb.disp('Portão principal');
  amb.como(TEC);
  let i = amb.api_('iniciar');
  assert.equal(i.mostrarMenu, false); assert.equal(i.podeAcionar, false); assert.equal(i.emUso, false);
  assert.match(amb.api_('painel').message, /em implantação/);
  assert.equal(amb.abrir(p1.ID, 'op-tec-fase-00001').ok, false);
  for (const s of [DONO, DIR, ADM2]) { amb.como(s); i = amb.api_('iniciar'); assert.equal(i.mostrarMenu, true, s.usuario); assert.equal(i.podeAcionar, true, s.usuario); }
  amb.como(GESTOR);
  assert.equal(amb.api_('iniciar').mostrarMenu, false);
  amb.homologar('Portão principal');
  // 23/10/2026 (dono): "os colaboradores no celular não estão vendo Portões" — em uso, todos os perfis internos recebem o atalho
  for (const s of [TEC, GESTOR]) {
    amb.como(s);
    i = amb.api_('iniciar');
    assert.equal(i.mostrarMenu, true, s.usuario); assert.equal(i.podeAcionar, true, s.usuario); assert.equal(i.emUso, true);
    assert.deepEqual(amb.api_('rapido').itens.map((d) => d.nome), ['Portão principal', 'Portão secundário'], s.usuario + ': os dois portões, sem a porta');
  }
  amb.como(TEC);
  const r = amb.abrir(p1.ID, 'op-tec-fase-00002');
  assert.equal(r.ok, true, r.message); assert.equal(r.comando.situacao, 'CONFIRMADO');
  assert.match(amb.tabelas.AUT_COMANDOS.find((c) => c.OPERACAO_ID === 'op-tec-fase-00002').AUTORIZACAO_MOTIVO, /perfil TECNICO/);
  amb.como(CLIENTE);
  assert.equal(amb.api_('iniciar').ok, false, 'cliente fora');
  // desligar volta tudo à implantação
  amb.props.TUYA_LIGADO = '0';
  amb.como(TEC);
  assert.equal(amb.api_('iniciar').mostrarMenu, false);
  // rápidos: portões primeiro, porta só para quem pode destravar
  amb.props.TUYA_LIGADO = '1';
  amb.como(DONO);
  assert.deepEqual(amb.api_('rapido').itens.map((d) => d.tipo), ['PORTAO', 'PORTAO', 'FECHADURA']);
  amb.como(DIR);
  assert.ok(!amb.api_('rapido').itens.some((d) => d.tipo === 'FECHADURA'), 'Charles sem permissão: porta fora dos botões');
});

test('portões de toda a equipe (23/10/2026): colaborador abre e fecha sem permissão; permissão individual só na porta (vigência vale); no registro o colaborador vê só os próprios comandos', () => {
  const amb = ambiente();
  sincronizar(amb);
  amb.homologar('Portão secundário');
  const p1 = amb.disp('Portão principal'), p2 = amb.disp('Portão secundário'), f = amb.disp('Porta da Diretoria');
  amb.como(TEC);
  const painel = amb.api_('painel');
  assert.ok(painel.unidades[0].dispositivos.every((d) => d.podeAcionar), 'colaborador aciona os portões');
  assert.ok(!nomes(painel).includes('Porta da Diretoria'));
  let r = amb.abrir(p2.ID, 'op-tec-0000002');
  assert.equal(r.ok, true, r.message); assert.equal(r.comando.situacao, 'CONFIRMADO');
  amb.como(GESTOR);
  assert.equal(amb.abrir(p1.ID, 'op-ges-0000001').comando.situacao, 'SIMULADO', 'portão principal não homologado');
  // registro e histórico: o colaborador vê só os dele; Administrador e diretores veem todos
  amb.como(TEC);
  assert.deepEqual(amb.api_('registro', {}).itens.map((c) => c.operacaoId), ['op-tec-0000002']);
  assert.deepEqual(amb.api_('historico', { dispositivoId: p1.ID }).comandos.map((c) => c.operacaoId), []);
  assert.ok(amb.api_('painel').ultimosComandos.every((c) => c.solicitanteId === 'uT'));
  for (const s of [ADM2, DIR]) { amb.como(s); assert.deepEqual(amb.api_('registro', {}).itens.map((c) => c.operacaoId).sort(), ['op-ges-0000001', 'op-tec-0000002'], s.usuario); }
  // permissão individual em portão: não existe mais
  amb.como(DONO);
  r = amb.api_('permissaoConceder', { usuarioId: 'uT', dispositivoId: p1.ID, permissao: 'VER', motivo: 'recebe entregas' });
  assert.equal(r.ok, false); assert.match(r.message, /liberados para toda a equipe interna/);
  assert.deepEqual(amb.api_('permissoes').dispositivos.map((d) => d.nome), ['Porta da Diretoria'], 'só a porta na lista');
  amb.como(ADM2);
  assert.deepEqual(amb.api_('permissoes').dispositivos, [], 'Administrador comum: nada a conceder');
  // porta: vigência vencida não vale
  amb.homologar('Porta da Diretoria');
  amb.como(DONO);
  assert.equal(amb.api_('permissaoConceder', { usuarioId: 'uD', dispositivoId: f.ID, permissao: 'ACIONAR', motivo: 'diretor de operações' }).ok, true);
  assert.equal(amb.api_('permissaoConceder', { usuarioId: 'uD', dispositivoId: f.ID, permissao: 'ACIONAR', motivo: 'xxxxx', vigenciaFim: '2020-01-01' }).ok, false, 'já passou');
  amb.tabelas.AUT_PERMISSOES.filter((p) => p.STATUS === 'ATIVA').forEach((p) => { p.VIGENCIA_FIM = new Date(Date.now() - 1000).toISOString(); });
  amb.como(DIR);
  assert.equal(amb.abrir(f.ID, 'op-dir-venc-00001').ok, false, 'vigência vencida');
});

test('fechadura sem abertura remota pela API: "não disponível pela API" com o porquê; recusa antes da janela', () => {
  const amb = ambiente();
  amb.api.remoto = false;
  sincronizar(amb);
  const f = amb.disp('Porta da Diretoria');
  assert.equal(f.COMPAT_OK, 'NAO'); assert.match(f.COMPAT_MOTIVO, /Não disponível pela API/);
  amb.como(DONO);
  const d = amb.api_('painel').unidades[0].dispositivos.find((x) => x.nome === 'Porta da Diretoria');
  assert.equal(d.compatOk, false);
  assert.ok(!amb.api_('rapido').itens.some((x) => x.tipo === 'FECHADURA'));
  const r = amb.abrir(f.ID, 'op-dir-sem-api-01');
  assert.equal(r.ok, false); assert.match(r.message, /não disponível pela API/);
  assert.equal(amb.comandosApi().length, 0);
});

test('portão: solicitado -> aceito -> confirmado; estado relido antes; aceito sem confirmação avisa diretores e Administradores (S66) e "Conferir agora" confirma', () => {
  const amb = ambiente();
  sincronizar(amb);
  const p1 = amb.disp('Portão principal');
  amb.homologar('Portão principal');
  amb.como(DONO);
  let r = amb.abrir(p1.ID, 'op-adm-0000001');
  assert.equal(r.ok, true, r.message);
  assert.equal(r.comando.situacao, 'CONFIRMADO');
  assert.equal(r.comando.apiTid, 'tid-p');
  const cmdApi = amb.comandosApi().find((p) => /\/commands$/.test(p.caminho));
  assert.equal(JSON.stringify(cmdApi.corpo), JSON.stringify({ commands: [{ code: 'switch_1', value: true }] }));
  const reg = amb.tabelas.AUT_COMANDOS.find((c) => c.OPERACAO_ID === 'op-adm-0000001');
  assert.equal(reg.MODO, 'REAL'); assert.equal(reg.API_HTTP, '200'); assert.ok(reg.CONFIRMADO_EM);
  // pulso: o acionador voltou e o estado guardado ainda diz true; o próximo comando relê antes e confirma
  amb.api.portaoAberto = false; amb.envelhecer();
  r = amb.abrir(p1.ID, 'op-adm-0000002');
  assert.equal(r.comando.situacao, 'CONFIRMADO', r.texto);
  assert.equal(amb.notificacoes.length, 0);
  // aceito, estado não muda
  const amb2 = ambiente();
  sincronizar(amb2);
  const p2 = amb2.disp('Portão secundário');
  amb2.homologar('Portão secundário');
  const orig = amb2.ctx.UrlFetchApp.fetch;
  amb2.ctx.UrlFetchApp.fetch = function (url, op) { const x = orig(url, op); if (/\/commands$/.test(new URL(url).pathname)) amb2.api.portaoAberto = false; return x; };
  amb2.como(DIR);
  const r2 = amb2.abrir(p2.ID, 'op-dir-sec-000001');
  assert.equal(r2.ok, true, r2.message);
  assert.equal(r2.comando.situacao, 'ACEITO');
  assert.match(r2.texto, /não foi confirmada/);
  assert.equal(amb2.notificacoes.length, 1);
  assert.equal(amb2.notificacoes[0].evento, 'S66');
  assert.equal(Array.from(amb2.notificacoes[0].usuarios).sort().join(','), 'uA,uA2,uD,uV', 'diretores (perfil, vínculo, dono) e Administradores');
  amb2.api.portaoAberto = true;
  const c = amb2.api_('conferir', { comandoId: r2.comando.id });
  assert.equal(c.ok, true, c.message); assert.equal(c.comando.situacao, 'CONFIRMADO');
  const itens = [];
  amb2.tabelas.AUT_COMANDOS.push({ ID: 'cx', OPERACAO_ID: 'op-velho', QUANDO: '22/10/2026 10:00', QUANDO_EM: new Date(Date.now() - 600000).toISOString(), SITUACAO: 'ACEITO', TIPO: 'FECHADURA', DISPOSITIVO_NOME: 'Porta da Diretoria', SOLICITANTE: 'X', COMANDO: 'DESTRAVAR', AUTORIZACAO: 'AUTORIZADO' });
  amb2.ctx.AutPred_fontePendencias_((x) => itens.push(x), { cliente: false, gestao: true });
  assert.equal(itens.length, 1); assert.equal(itens[0].publico, 'DIRETORIA');
  assert.equal(Array.from(itens[0].paraUsuarios).sort().join(','), 'uA,uD,uV', 'porta: só diretores');
});

test('idempotência e limites: o mesmo identificador não executa de novo; 10 s por dispositivo; 5 por pessoa por minuto; sem resultado não repete', () => {
  const amb = ambiente();
  sincronizar(amb);
  const p1 = amb.disp('Portão principal'), p2 = amb.disp('Portão secundário');
  amb.homologar('Portão principal');
  amb.como(DONO);
  const r1 = amb.abrir(p1.ID, 'op-rep-00000001');
  assert.equal(r1.ok, true);
  const n = amb.comandosApi().length;
  const r2 = amb.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-rep-00000001' });
  assert.equal(r2.ok, true); assert.equal(r2.repetido, true); assert.match(r2.texto, /já foi processada/);
  assert.equal(amb.comandosApi().length, n, 'nada reenviado');
  const r3 = amb.abrir(p1.ID, 'op-rep-00000002');
  assert.equal(r3.ok, false); assert.match(r3.message, /intervalo mínimo de 10 s/);
  assert.equal(amb.api_('preparar', { dispositivoId: p1.ID, operacaoId: 'curto' }).ok, false, 'identificador curto');
  for (let i = 0; i < 6; i++) amb.tabelas.AUT_COMANDOS.push({ ID: 'lim' + i, OPERACAO_ID: 'op-lim-' + i, QUANDO_EM: new Date(Date.now() - 1000 * (i + 1)).toISOString(), SOLICITANTE_ID: 'uA', DISPOSITIVO_ID: 'outro' + i, AUTORIZACAO: 'AUTORIZADO', SITUACAO: 'SIMULADO' });
  const r4 = amb.abrir(p2.ID, 'op-rep-00000003');
  assert.equal(r4.ok, false); assert.match(r4.message, /comandos no último minuto/);
  const amb2 = ambiente();
  sincronizar(amb2);
  // 23/10/2026: a espera pelo resultado ficou só na fechadura (no portão de pulso o resultado nunca vem); no portão, só os 10 s
  const q = amb2.disp('Porta da Diretoria'), qp = amb2.disp('Portão principal');
  amb2.tabelas.AUT_COMANDOS.push({ ID: 'acp', OPERACAO_ID: 'op-aceito-p', COMANDO: 'ABRIR', QUANDO: '22/10/2026 10:00', QUANDO_EM: new Date(Date.now() - 30000).toISOString(), SOLICITANTE_ID: 'uD', DISPOSITIVO_ID: qp.ID, AUTORIZACAO: 'AUTORIZADO', SITUACAO: 'ACEITO' });
  amb2.tabelas.AUT_COMANDOS.push({ ID: 'ac', OPERACAO_ID: 'op-aceito-1', COMANDO: 'DESTRAVAR', QUANDO: '22/10/2026 10:00', QUANDO_EM: new Date(Date.now() - 30000).toISOString(), SOLICITANTE_ID: 'uD', DISPOSITIVO_ID: q.ID, AUTORIZACAO: 'AUTORIZADO', SITUACAO: 'ACEITO' });
  amb2.como(DONO);
  const r5 = amb2.abrir(q.ID, 'op-rep-00000009');
  assert.equal(r5.ok, false); assert.match(r5.message, /ainda está sem resultado/);
  assert.equal(amb2.abrir(qp.ID, 'op-rep-00000010').ok, true, 'portão: sem a espera do resultado');
});

test('simulação e falhas: desligado não lê; API recusa (2008) e sem resposta ficam registrados sem lançar; segredo nunca em tabela', () => {
  const amb = ambiente({ props: { TUYA_LIGADO: '0' } });
  amb.como(DONO);
  assert.equal(amb.api_('sincronizar').ok, false, 'desligado não lê');
  const amb2 = ambiente();
  sincronizar(amb2);
  const p1 = amb2.disp('Portão principal');
  amb2.props.TUYA_LIGADO = '0';
  amb2.como(DONO);
  const antes = amb2.api.pedidos.length;
  let r = amb2.abrir(p1.ID, 'op-sim-00000001');
  assert.equal(r.ok, true); assert.equal(r.comando.situacao, 'SIMULADO'); assert.equal(r.comando.modo, 'SIMULACAO');
  assert.equal(amb2.api.pedidos.length, antes, 'nenhuma chamada');
  amb2.props.TUYA_LIGADO = '1';
  amb2.envelhecer();
  amb2.homologar('Portão principal');
  amb2.api.recusaComando = { success: false, code: 2008, msg: 'not supported' };
  amb2.como(DONO);
  r = amb2.abrir(p1.ID, 'op-rec-00000001');
  assert.equal(r.ok, true); assert.equal(r.comando.situacao, 'RECUSADO'); assert.match(r.comando.detalhe, /2008/);
  amb2.envelhecer();
  amb2.api.recusaComando = null;
  const p = amb2.api_('preparar', { dispositivoId: p1.ID, operacaoId: 'op-rede-0000001' });
  amb2.api.falhaRede = true;
  r = amb2.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-rede-0000001', confirmacaoToken: p.confirmacaoToken });
  assert.equal(r.ok, true); assert.equal(r.comando.situacao, 'INCERTO'); assert.equal(r.comando.podeConferir, true);
  assert.ok(!JSON.stringify(amb2.tabelas).includes('segredo-de-teste-0001'));
});

test('registro inviolável: corrente íntegra; linha alterada ou apagada é detectada', () => {
  const amb = ambiente();
  sincronizar(amb);
  amb.como(DONO);
  assert.equal(amb.api_('dispositivoSalvar', { id: amb.disp('Portão principal').ID, localizacao: 'teste do registro' }).ok, true);
  let r = amb.api_('integridade');
  assert.equal(r.ok, true); assert.equal(r.problemas.length, 0); assert.ok(r.total >= 4);
  const aud = amb.tabelas.AUT_AUDITORIA;
  for (let i = 1; i < aud.length; i++) assert.equal(aud[i].HASH_ANTERIOR, aud[i - 1].HASH);
  aud[1].DETALHE = 'alterado à mão';
  r = amb.api_('integridade');
  assert.match(r.texto, /alterada depois de registrada/);
  aud.splice(2, 1);
  r = amb.api_('integridade');
  assert.ok(r.problemas.some((p) => /fora da corrente/.test(p)));
});

test('administração e homologação: unidade do cadastro, comando conferido contra as funções, restrito e homologação só por diretor (sem palavra digitada)', () => {
  const amb = ambiente();
  sincronizar(amb);
  const p1 = amb.disp('Portão principal');
  amb.como(ADM2);
  assert.equal(amb.api_('dispositivoSalvar', { id: p1.ID, nome: 'Portão da frente', unidadeId: 'un1', localizacao: 'Entrada principal', ativo: true, comandoAbrir: '{"code":"switch_1","value":true}' }).ok, true);
  assert.equal(amb.disp('Portão da frente').UNIDADE_NOME, 'MATRIZ GOIÂNIA');
  assert.equal(amb.api_('dispositivoSalvar', { id: p1.ID, comandoAbrir: '{"code":"nao_existe","value":true}' }).ok, false);
  assert.equal(amb.api_('dispositivoSalvar', { id: p1.ID, restrito: true }).ok, false, 'Administrador comum não marca restrito');
  assert.equal(amb.api_('homologar', { id: p1.ID, homologado: true, motivo: 'teste presencial feito' }).ok, false, 'Administrador comum não homologa');
  amb.como(DIRV);
  assert.equal(amb.api_('homologar', { id: p1.ID, homologado: true, motivo: 'curto' }).ok, false, 'descrição do teste obrigatória');
  assert.equal(amb.api_('homologar', { id: p1.ID, homologado: true, motivo: 'teste presencial feito com o diretor' }).ok, true, 'diretor por vínculo homologa, sem digitar palavra');
  assert.equal(amb.api_('dispositivoSalvar', { id: p1.ID, restrito: true }).ok, true);
  amb.como(ADM2);
  assert.equal(amb.api_('painel').restritosOcultos, 2);
  assert.equal(amb.api_('unidades').unidades[0].cliente, 'METROLABS');
});

// ---------------------------------------------------------------- campainha (fechadura real: unlock_request + reply_unlock_request)
const limparPedido = (amb) => Object.keys(amb.cache).filter((k) => k.includes('AUT_PEDIDO_')).forEach((k) => { delete amb.cache[k]; });
const tocar = (amb, segundos) => { amb.api.pedidoValor = segundos; amb.api.pedidoEm = Date.now(); amb.api.campainhaEm = Date.now() - 1000; limparPedido(amb); };

test('campainha: modo pedido detectado; sem pedido não há botão nem janela; com pedido a resposta abre pelo reply_unlock_request e confirma pelo registro', () => {
  const amb = ambiente();
  amb.api.pedido = true;
  sincronizar(amb);
  const f = amb.disp('Porta da Diretoria');
  assert.equal(f.REMOTO_FECHADURA, 'PEDIDO'); assert.equal(f.COMPAT_OK, 'SIM'); assert.match(f.COMPAT_MOTIVO, /só quando tocam a campainha/);
  amb.homologar('Porta da Diretoria');
  amb.como(DONO);
  assert.ok(amb.api_('rapido').itens.some((d) => d.remotoFechadura === 'PEDIDO'), 'a porta aparece nos botões rápidos (o botão só durante o pedido)');
  let p = amb.api_('pedido');
  assert.equal(p.itens.length, 1); assert.equal(p.itens[0].ativo, false);
  let r = amb.api_('preparar', { dispositivoId: f.ID, operacaoId: 'op-camp-000001' });
  assert.equal(r.ok, false); assert.match(r.message, /não há pedido de abertura ativo.*campainha/);
  tocar(amb, 40);
  p = amb.api_('pedido');
  assert.equal(p.itens[0].ativo, true); assert.ok(p.itens[0].restanteS >= 39 && p.itens[0].restanteS <= 40); assert.match(p.itens[0].campainhaTexto, /^\d\d:\d\d:\d\d$/);
  // a leitura é compartilhada: várias telas dentro de 2,5 s = uma chamada à nuvem
  const n0 = amb.api.leiturasSombra; amb.api_('pedido'); amb.api_('pedido');
  assert.equal(amb.api.leiturasSombra, n0, 'cache de 2,5 s');
  r = amb.abrir(f.ID, 'op-camp-000002');
  assert.equal(r.ok, true, r.message);
  assert.equal(r.comando.situacao, 'CONFIRMADO', r.texto);
  assert.equal(JSON.stringify(amb.api.respostasPedido), JSON.stringify([{ code: 'reply_unlock_request', value: true }]));
  const reg = amb.tabelas.AUT_COMANDOS.find((c) => c.OPERACAO_ID === 'op-camp-000002');
  assert.equal(reg.COMANDO, 'DESTRAVAR'); assert.match(reg.CORRELACAO, /^P\d+/); assert.match(reg.CONFIRMACAO_DETALHE, /abertura remota|destravada|closed_opened/);
  assert.ok(!amb.comandosApi().some((x) => /password-ticket|open-door/.test(x.caminho)), 'não usa o bilhete');
  // o mesmo pedido não é respondido de novo
  amb.api.pedidoValor = 30; amb.api.pedidoEm = Date.now(); limparPedido(amb); amb.envelhecer();
  r = amb.abrir(f.ID, 'op-camp-000003');
  assert.equal(r.ok, false); assert.match(r.message, /já foi respondido/);
});

test('campainha: pedido que termina entre o toque e o "Sim" é recusado com a explicação; recusar responde false; token de abrir não serve para recusar; rotina avisa uma vez', () => {
  const amb = ambiente();
  amb.api.pedido = true;
  sincronizar(amb);
  const f = amb.disp('Porta da Diretoria');
  amb.homologar('Porta da Diretoria');
  amb.como(DONO);
  tocar(amb, 20);
  const p = amb.api_('preparar', { dispositivoId: f.ID, operacaoId: 'op-camp-exp-001' });
  assert.equal(p.ok, true, p.message);
  amb.api.pedidoValor = 0; limparPedido(amb);
  let r = amb.api_('comando', { dispositivoId: f.ID, operacaoId: 'op-camp-exp-001', confirmacaoToken: p.confirmacaoToken });
  assert.equal(r.ok, false); assert.match(r.message, /não há pedido de abertura ativo/);
  assert.ok(amb.tabelas.AUT_AUDITORIA.some((a) => a.EVENTO === 'PEDIDO_EXPIRADO'));
  assert.equal((amb.api.respostasPedido || []).length, 0, 'nada enviado');
  // recusar
  amb.envelhecer(); tocar(amb, 50); amb.api.campainhaEm = Date.now() - 500;
  const pa = amb.api_('preparar', { dispositivoId: f.ID, operacaoId: 'op-camp-rec-001' });
  r = amb.api_('comando', { dispositivoId: f.ID, operacaoId: 'op-camp-rec-001', confirmacaoToken: pa.confirmacaoToken, resposta: 'RECUSAR' });
  assert.equal(r.ok, false, 'token emitido para abrir não serve para recusar');
  const pr = amb.api_('preparar', { dispositivoId: f.ID, operacaoId: 'op-camp-rec-002', resposta: 'RECUSAR' });
  r = amb.api_('comando', { dispositivoId: f.ID, operacaoId: 'op-camp-rec-002', confirmacaoToken: pr.confirmacaoToken, resposta: 'RECUSAR' });
  assert.equal(r.ok, true, r.message);
  assert.equal(r.comando.comando, 'RECUSAR'); assert.equal(r.comando.situacao, 'CONFIRMADO', r.texto);
  assert.equal(JSON.stringify(amb.api.respostasPedido.slice(-1)), JSON.stringify([{ code: 'reply_unlock_request', value: false }]));
  assert.equal(amb.api.fechAberta, undefined, 'recusa não abre');
  // rotina de 1 minuto: avisa quem pode destravar, uma vez por toque
  amb.envelhecer(); tocar(amb, 60); amb.api.campainhaEm = Date.now() - 300;
  amb.ctx.AutPred_rotinaPedidos(); amb.ctx.AutPred_rotinaPedidos();
  const avisos = amb.notificacoes.filter((x) => x.evento === 'S67');
  assert.equal(avisos.length, 1);
  assert.equal(Array.from(avisos[0].usuarios).join(','), 'uA', 'só quem pode destravar (o responsável pelo sistema)');
  assert.match(avisos[0].texto, /campainha.*Abrir agora/);
  assert.ok(amb.tabelas.AUT_AUDITORIA.some((a) => a.EVENTO === 'PEDIDO_CAMPAINHA'));
});

test('abertura automática pela campainha (23/10/2026): só quem destrava liga; a rotina rápida abre uma vez por pedido, avisa (S68) e registra; desmarcada volta ao "Abrir agora"', () => {
  const amb = ambiente();
  amb.api.pedido = true;
  sincronizar(amb);
  const f = amb.disp('Porta da Diretoria');
  amb.homologar('Porta da Diretoria');
  // sem a opção, a rotina rápida não lê nada
  const n0 = amb.api.leiturasSombra || 0;
  tocar(amb, 40);
  assert.equal(amb.ctx.AutPred_rotinaRapida().texto, 'abertura automática desligada');
  assert.equal(amb.api.leiturasSombra || 0, n0, 'nada lido');
  // quem não destrava não liga: Charles (diretor sem "Acionar"), Gestor e Administrador comum
  for (const s of [DIR, GESTOR, ADM2]) { amb.como(s); assert.equal(amb.api_('autoAbrir', { id: f.ID, ligado: true }).ok, false, s.usuario); }
  amb.como(DONO);
  assert.equal(amb.api_('autoAbrir', { id: amb.disp('Portão principal').ID, ligado: true }).ok, false, 'só na fechadura da campainha');
  let r = amb.api_('autoAbrir', { id: f.ID, ligado: true });
  assert.equal(r.ok, true, r.message); assert.match(r.mensagem, /abre a porta sozinho/);
  assert.equal(amb.props.AUT_AUTO_ABRIR_LIGADO, '1', 'sinal para a rotina rápida do servidor');
  assert.equal(amb.disp('Porta da Diretoria').AUTO_ABRIR, 'SIM'); assert.equal(amb.disp('Porta da Diretoria').AUTO_ABRIR_POR, 'DONO TESTE');
  assert.ok(amb.tabelas.AUT_AUDITORIA.some((a) => a.EVENTO === 'AUTO_ABRIR_LIGADA'));
  const lock = amb.api_('rapido').itens.find((d) => d.tipo === 'FECHADURA');
  assert.equal(lock.autoAbrir, true); assert.equal(lock.podeAutoAbrir, true);
  // a campainha toca: a rotina rápida responde "abrir" sozinha, uma vez
  tocar(amb, 40);
  r = amb.ctx.AutPred_rotinaRapida();
  assert.equal(r.abertas, 1);
  assert.equal(JSON.stringify(amb.api.respostasPedido), JSON.stringify([{ code: 'reply_unlock_request', value: true }]));
  const cmd = amb.tabelas.AUT_COMANDOS.find((c) => c.ORIGEM === 'AUTOMATICO');
  assert.equal(cmd.SOLICITANTE, 'Abertura automática'); assert.equal(cmd.COMANDO, 'DESTRAVAR'); assert.equal(cmd.SITUACAO, 'CONFIRMADO', cmd.CONFIRMACAO_DETALHE);
  assert.match(cmd.AUTORIZACAO_MOTIVO, /ligada por DONO TESTE/);
  const aviso = amb.notificacoes.filter((x) => x.evento === 'S68' && /aberta automaticamente/.test(x.titulo));
  assert.equal(aviso.length, 1); assert.equal(Array.from(aviso[0].usuarios).join(','), 'uA'); assert.match(aviso[0].texto, /confirmou a abertura/);
  // mesmo pedido: nem a rotina rápida nem a de 1 minuto respondem de novo; a tela mostra "aberto automaticamente"
  amb.api.pedidoValor = 30; amb.api.pedidoEm = Date.now(); limparPedido(amb);
  assert.equal(amb.ctx.AutPred_rotinaRapida().abertas, 0);
  amb.ctx.AutPred_rotinaPedidos();
  assert.equal(amb.api.respostasPedido.length, 1, 'uma resposta por pedido');
  assert.ok(!amb.notificacoes.some((x) => x.evento === 'S67'), 'com a opção ligada, não pede "Abrir agora"');
  limparPedido(amb);
  assert.match(amb.api_('pedido').itens[0].respondido, /^aberto automaticamente às/);
  // registro legível
  const reg = amb.api_('registro', {}).itens.find((c) => c.origemTexto === 'Abertura automática (campainha)');
  assert.ok(reg); assert.match(reg.resultadoTexto, /^Destravado — confirmado pela fechadura/);
  // desmarcar: volta ao fluxo manual (a rotina não lê nada; a de 1 minuto avisa S67)
  r = amb.api_('autoAbrir', { id: f.ID, ligado: false });
  assert.equal(r.ok, true, r.message);
  assert.equal(amb.props.AUT_AUTO_ABRIR_LIGADO, undefined);
  amb.envelhecer(); tocar(amb, 50); amb.api.campainhaEm = Date.now() - 200;
  assert.equal(amb.ctx.AutPred_rotinaRapida().texto, 'abertura automática desligada');
  amb.ctx.AutPred_rotinaPedidos();
  assert.equal(amb.api.respostasPedido.length, 1, 'nada respondido sozinho');
  assert.equal(amb.notificacoes.filter((x) => x.evento === 'S67').length, 1);
  // falha na nuvem: avisa e tenta no máximo 2 vezes por pedido
  amb.api_('autoAbrir', { id: f.ID, ligado: true });
  amb.envelhecer(); tocar(amb, 60); amb.api.campainhaEm = Date.now() - 100;
  const orig = amb.ctx.UrlFetchApp.fetch;
  amb.ctx.UrlFetchApp.fetch = function (url, op) { if (/dev-fech-1\/commands$/.test(new URL(url).pathname)) return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ success: false, code: 2001, msg: 'device is offline' }), getAllHeaders: () => ({}) }; return orig(url, op); };
  for (let i = 0; i < 4; i++) { limparPedido(amb); amb.ctx.AutPred_rotinaRapida(); }
  assert.equal(amb.tabelas.AUT_COMANDOS.filter((c) => c.ORIGEM === 'AUTOMATICO' && c.SITUACAO === 'RECUSADO').length, 2);
  assert.ok(amb.notificacoes.some((x) => x.evento === 'S68' && /não abriu sozinha/.test(x.titulo) && /Abrir agora/.test(x.texto)));
  // Configuração concentrada em Chaves e senhas; não aparece na tela operacional.
  const tela = ler('JS_Chaves.html');
  assert.match(tela, /Ligar abertura automática/);
  assert.match(tela, /AutPred_chamar_\('autoAbrir'/);
  assert.doesNotMatch(ler('JS_AutomacaoPredial.html'), /id="autAuto_/);
});

test('payload público omite configuração técnica sem mudar capacidades, posição ou comandos', () => {
  const amb = ambiente(); amb.api.garagem = true; sincronizar(amb); amb.homologar('Portão principal');
  const g = amb.disp('Portão principal');
  const privados = ['deviceId', 'nomeProvedor', 'categoria', 'categoriaNome', 'produto', 'unidadeId', 'homologadoPor', 'homologadoEm', 'comandoAbrir', 'acionamentoSugerido', 'temFecharNaNuvem', 'percursoGravado', 'autoAbrirPor', 'autoAbrirEm', 'sincronizadoEm', 'modoMotivo'];
  const publicos = ['id', 'nome', 'tipo', 'online', 'ativo', 'compatOk', 'podeAcionar', 'podeFechar', 'podeParar', 'pulsoAlternado', 'estadoPortao', 'liberaEmS', 'percursoS', 'acionamento'];
  amb.como(DONO);
  const referencia = amb.api_('painel').unidades.flatMap(u => u.dispositivos).find(d => d.id === g.ID);
  for (const usuario of [DONO, ADM2, DIR, DIRV]) {
    amb.como(usuario);
    const p = amb.api_('painel');
    assert.equal(p.ok, true, p.message);
    assert.ok(Object.hasOwn(p.config, 'faltas'));
    assert.ok(Object.hasOwn(p.config, 'regiao'));
    const d = p.unidades.flatMap(u => u.dispositivos).find(d => d.id === g.ID);
    for (const k of privados) assert.ok(Object.hasOwn(d, k), `${usuario.usuario}: ${k}`);
  }
  for (const usuario of [TEC, GESTOR]) {
    amb.como(usuario);
    const p = amb.api_('painel');
    assert.equal(p.ok, true, p.message);
    assert.deepEqual(Object.keys(p.config).sort(), ['ligado', 'podeLer']);
    const dispositivos = [p.unidades.flatMap(u => u.dispositivos).find(d => d.id === g.ID), amb.api_('rapido').itens.find(d => d.id === g.ID), amb.api_('estado', { dispositivoId: g.ID }).dispositivo];
    for (const d of dispositivos) {
      for (const k of privados) assert.ok(!Object.hasOwn(d, k), `${usuario.usuario}: ${k} oculto`);
      for (const k of publicos) assert.deepEqual(d[k], referencia[k], `${usuario.usuario}: ${k} operacional preservado`);
    }
    const posicao = amb.api_('portoes');
    assert.equal(posicao.ok, true, posicao.message);
    assert.ok(posicao.itens.some(d => d.id === g.ID));
    assert.ok(!posicao.itens.some(d => d.id === amb.disp('Porta da Diretoria').ID));
  }
  amb.como(TEC);
  const r = amb.abrir(g.ID, 'op-payload-publico-001');
  assert.equal(r.ok, true, r.message);
  assert.equal(r.comando.situacao, 'CONFIRMADO');
  for (const k of privados) assert.ok(!Object.hasOwn(r.dispositivo, k));
  assert.equal(amb.comandosApi().at(-1).corpo.commands[0].value, true);
});

// ---------------------------------------------------------------- abrir e fechar (garagem) x pulso (pedestre)
test('portões: garagem usa switch_1 true para abrir e false para fechar como no Smart Life; confirmação pelo sensor; pedestre só abrir', () => {
  const amb = ambiente();
  amb.api.garagem = true;
  sincronizar(amb);
  const g = amb.disp('Portão principal'), ped = amb.disp('Portão secundário');
  amb.como(DONO);
  let d = amb.api_('painel').unidades[0].dispositivos.find((x) => x.nome === 'Portão principal');
  assert.equal(d.acionamento, 'ABRIR_FECHAR', 'pulso + sensor = abrir e fechar'); assert.equal(d.temSensor, true); assert.equal(d.podeFechar, true);
  assert.equal(d.estadoPortao.codigo, 'FECHADO');
  assert.equal(amb.api_('dispositivoSalvar', { id: ped.ID, acionamento: 'ABRIR_FECHAR' }).ok, false, 'pedestre sem fechar na nuvem');
  // fechado: "Fechar" é recusado antes da janela (um pulso abriria o portão)
  assert.match(amb.api_('preparar', { dispositivoId: g.ID, operacaoId: 'op-fech-0000001', acao: 'FECHAR' }).message, /já está fechado pelo sensor; um pulso agora o abriria/);
  amb.homologar('Portão principal');
  let r = amb.abrir(g.ID, 'op-fech-0000002');
  assert.equal(r.ok, true, r.message); assert.equal(r.comando.situacao, 'CONFIRMADO', r.texto);
  assert.equal(JSON.stringify(amb.api.cmdGaragem), JSON.stringify([{ code: 'switch_1', value: true }]), 'abrir = pulso, como o aplicativo');
  // no percurso (padrão 60 s; a garagem real leva ~55 s): nenhum pulso novo; aos 29 s (o caso real das 14:19) também não
  amb.tabelas.AUT_COMANDOS.forEach((c) => { c.QUANDO_EM = new Date(Date.now() - 29000).toISOString(); });
  amb.tabelas.AUT_DISPOSITIVOS.forEach((x) => { if (x.ULT_CMD_EM) x.ULT_CMD_EM = new Date(Date.now() - 29000).toISOString(); });
  assert.match(amb.api_('preparar', { dispositivoId: g.ID, operacaoId: 'op-fech-0000029', acao: 'FECHAR' }).message, /ainda está em movimento.*Aguarde 3[0-9] s/);
  amb.tabelas.AUT_COMANDOS.forEach((c) => { c.QUANDO_EM = new Date(Date.now() - 15000).toISOString(); });
  amb.tabelas.AUT_DISPOSITIVOS.forEach((x) => { if (x.ULT_CMD_EM) x.ULT_CMD_EM = new Date(Date.now() - 15000).toISOString(); });
  assert.match(amb.api_('preparar', { dispositivoId: g.ID, operacaoId: 'op-fech-0000003', acao: 'FECHAR' }).message, /ainda está em movimento.*Aguarde \d+ s/);
  // a tela recebe quanto falta para liberar o próximo pulso e conta no botão
  const lib = amb.api_('rapido').itens.find((x) => x.nome === 'Portão principal').liberaEmS;
  assert.ok(lib >= 46 && lib <= 48, 'liberaEmS ' + lib); // último comando há 15 s: 60 + 2 - 15
  assert.match(ler('JS_AutomacaoPredial.html'), /"Aguarde " \+ falta \+ " s"/);
  amb.envelhecer();
  assert.equal(amb.api_('rapido').itens.find((x) => x.nome === 'Portão principal').liberaEmS, 0);
  // aberto: "Abrir" é recusado (o pulso fecharia)
  assert.match(amb.api_('preparar', { dispositivoId: g.ID, operacaoId: 'op-fech-0000004' }).message, /já está aberto pelo sensor; um pulso agora o fecharia/);
  // token de abrir não serve para fechar
  const pa = amb.api_('preparar', { dispositivoId: g.ID, operacaoId: 'op-fech-0000005', acao: 'FECHAR' });
  assert.equal(amb.api_('comando', { dispositivoId: g.ID, operacaoId: 'op-fech-0000005', confirmacaoToken: pa.confirmacaoToken }).ok, false);
  amb.envelhecer();
  // colaborador fecha: pulso, confirmado pelo sensor
  amb.como(TEC);
  const pf = amb.api_('preparar', { dispositivoId: g.ID, operacaoId: 'op-fech-0000006', acao: 'FECHAR' });
  r = amb.api_('comando', { dispositivoId: g.ID, operacaoId: 'op-fech-0000006', confirmacaoToken: pf.confirmacaoToken, acao: 'FECHAR' });
  assert.equal(r.ok, true, r.message); assert.equal(r.comando.comando, 'FECHAR'); assert.equal(r.comando.modo, 'REAL'); assert.equal(r.comando.situacao, 'CONFIRMADO', r.texto);
  assert.equal(JSON.stringify(amb.api.cmdGaragem), JSON.stringify([{ code: 'switch_1', value: true }, { code: 'switch_1', value: false }]), 'door_control_1 nunca é enviado');
  assert.equal(amb.api.portaoAberto, false);
  // a posição "em movimento" depois de fechar segue o comando do SGO+, não o door_control_1 guardado na nuvem
  assert.equal(amb.disp('Portão principal').ULT_CMD_COMANDO, 'FECHAR');
  // sensor que acabou de mudar (o portão passando por ele): recusa e pede alguns segundos
  amb.envelhecer();
  const origS = amb.ctx.UrlFetchApp.fetch;
  amb.ctx.UrlFetchApp.fetch = function (url, op) { const u = new URL(url); if (/dev-portao-1\/shadow\/properties$/.test(u.pathname)) return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ success: true, result: { properties: [{ code: 'doorcontact_state', value: false, time: Date.now() - 1000 }] } }), getAllHeaders: () => ({}) }; return origS(url, op); };
  amb.como(DONO);
  r = amb.abrir(g.ID, 'op-fech-0000007');
  assert.equal(r.ok, false); assert.match(r.message, /sensor do portão acabou de mudar.*Aguarde \d s/);
  assert.equal(amb.api.cmdGaragem.length, 2, 'nenhum pulso saiu');
  amb.ctx.UrlFetchApp.fetch = origS;
  // tempo de percurso gravado em Administrar (5 a 180 s)
  amb.como(ADM2);
  assert.equal(amb.api_('dispositivoSalvar', { id: g.ID, percursoS: '2' }).ok, false);
  assert.equal(amb.api_('dispositivoSalvar', { id: g.ID, percursoS: '40' }).ok, true);
  assert.equal(amb.api_('rapido').itens.find((x) => x.nome === 'Portão principal').percursoS, 40);
  assert.match(ler('JS_AutomacaoPredial.html'), /Tempo de percurso do portão \(segundos\)/);
  // escolha gravada vence a sugestão: "Pulso" volta a só abrir, sem trava de posição
  assert.equal(amb.api_('dispositivoSalvar', { id: g.ID, acionamento: 'PULSO' }).ok, true);
  assert.equal(amb.api_('rapido').itens.find((x) => x.nome === 'Portão principal').podeFechar, false);
  assert.equal(amb.api_('dispositivoSalvar', { id: g.ID, acionamento: 'ABRIR_FECHAR' }).ok, true);
  // pedestre continua só abrir (switch_1 pulso), sem fechar; dois toques seguidos depois de 10 s não ficam presos ao resultado
  d = amb.api_('rapido').itens.find((x) => x.nome === 'Portão secundário');
  assert.equal(d.podeFechar, false); assert.equal(d.acionamento, 'PULSO');
  amb.homologar('Portão secundário');
  amb.como(DONO);
  const orig = amb.ctx.UrlFetchApp.fetch;
  amb.ctx.UrlFetchApp.fetch = function (url, op) { const x = orig(url, op); if (/dev-portao-2\/commands$/.test(new URL(url).pathname)) amb.api.portaoAberto = false; return x; };
  assert.equal(amb.abrir(ped.ID, 'op-ped-00000001').comando.situacao, 'ACEITO', 'pulso sem sensor: sem confirmação');
  amb.tabelas.AUT_COMANDOS.forEach((c) => { c.QUANDO_EM = new Date(Date.now() - 12000).toISOString(); });
  const r2 = amb.abrir(ped.ID, 'op-ped-00000002');
  assert.equal(r2.ok, true, r2.message);
  amb.ctx.UrlFetchApp.fetch = orig;
  assert.match(ler('JS_AutomacaoPredial.html'), /Pulso: fecha manualmente/);
  assert.ok(!/Homologar o fechar/.test(ler('JS_AutomacaoPredial.html')), 'sem homologação separada do fechar na tela');
  // 23/10/2026 (dono): pedestre real tem sensor e door_control_1 como a garagem, mas é só abrir; o nome decide sem escolha gravada
  const igualGaragem = { FUNCOES_JSON: amb.disp('Portão principal').FUNCOES_JSON, ESTADO_JSON: amb.disp('Portão principal').ESTADO_JSON };
  assert.equal(amb.ctx.AutPred_acionamento_(Object.assign({ NOME: 'PORTÃO PEDESTRE' }, igualGaragem)), 'PULSO');
  assert.equal(amb.ctx.AutPred_acionamento_(Object.assign({ NOME: 'PORTÃO GARAGEM' }, igualGaragem)), 'ABRIR_FECHAR');
  assert.equal(amb.ctx.AutPred_acionamento_(Object.assign({ NOME: 'PORTÃO PEDESTRE', ACIONAMENTO: 'ABRIR_FECHAR' }, igualGaragem)), 'ABRIR_FECHAR', 'a escolha gravada vence');
  // a situação antiga do último comando não fica na tela depois dos 15 minutos
  const g2 = amb.tabelas.AUT_DISPOSITIVOS.find((x) => x.NOME === 'Portão principal'); g2.ULT_CMD_EM = new Date(Date.now() - 3600000).toISOString();
  assert.equal(amb.api_('rapido').itens.find((x) => x.nome === 'Portão principal').ultComandoRecente, false);
  assert.match(ler('JS_AutomacaoPredial.html'), /d\.ultComandoCodigo && d\.ultComandoRecente/);
  // registro: recusa por posição em frase curta
  const neg = amb.tabelas.AUT_COMANDOS.filter((c) => c.SITUACAO === 'NEGADO');
  assert.ok(neg.every((c) => !/switch_1|door_control/.test(amb.ctx.AutPred_resultadoLegivel_(c).texto)));
});

test('garagem real (23/10/2026, 13:08): sensor lento; no percurso responde "abrindo/fechando" sem alarme; a confirmação vem depois pelo sensor (tela e rotina de 1 minuto)', () => {
  const amb = ambiente();
  amb.api.garagem = true;
  sincronizar(amb);
  amb.homologar('Portão principal');
  const g = amb.disp('Portão principal');
  amb.api.sensorLento = true; // a nuvem aceita, mas o sensor não muda dentro da espera do comando
  amb.como(DONO);
  let r = amb.abrir(g.ID, 'op-lento-00000001');
  assert.equal(r.ok, true, r.message); assert.equal(r.comando.situacao, 'ACEITO');
  assert.match(r.texto, /o portão está abrindo/); assert.ok(!/trate como não executado/.test(r.texto));
  assert.equal(amb.notificacoes.filter((x) => x.evento === 'S66').length, 0, 'portão no percurso não vira alarme para a gestão');
  assert.equal(amb.api_('rapido').itens.find((x) => x.nome === 'Portão principal').estadoPortao.codigo, 'ABRINDO');
  // o portão chega: a tela confirma pela leitura de posição
  amb.api.portaoAberto = true;
  Object.keys(amb.cache).filter((k) => k.startsWith('AUT_ESTADO_')).forEach((k) => { delete amb.cache[k]; });
  const t = amb.api_('portoes');
  assert.equal(t.itens.find((x) => x.id === g.ID).ultComandoCodigo, 'CONFIRMADO');
  const c1 = amb.tabelas.AUT_COMANDOS.find((c) => c.OPERACAO_ID === 'op-lento-00000001');
  assert.equal(c1.SITUACAO, 'CONFIRMADO'); assert.match(c1.CONFIRMACAO_DETALHE, /sensor do portão informa aberto.*Confirmado pelo sensor às/);
  // fechar depois do percurso: "fechando"; a rotina de 1 minuto confirma quando o sensor fechar, sem tela aberta
  amb.envelhecer();
  const p = amb.api_('preparar', { dispositivoId: g.ID, operacaoId: 'op-lento-00000002', acao: 'FECHAR' });
  assert.equal(p.ok, true, p.message);
  r = amb.api_('comando', { dispositivoId: g.ID, operacaoId: 'op-lento-00000002', confirmacaoToken: p.confirmacaoToken, acao: 'FECHAR' });
  assert.equal(r.ok, true, r.message); assert.equal(r.comando.situacao, 'ACEITO'); assert.match(r.texto, /o portão está fechando/);
  assert.equal(amb.api_('rapido').itens.find((x) => x.nome === 'Portão principal').estadoPortao.codigo, 'FECHANDO');
  amb.api.portaoAberto = false;
  amb.ctx.AutPred_rotinaPedidos();
  assert.equal(amb.tabelas.AUT_COMANDOS.find((c) => c.OPERACAO_ID === 'op-lento-00000002').SITUACAO, 'CONFIRMADO');
  assert.ok(amb.tabelas.AUT_AUDITORIA.filter((a) => a.EVENTO === 'EXECUCAO_CONFIRMADA').length >= 2);
  // regra pura: só o sensor confirma
  const d = { TIPO: 'PORTAO', ACIONAMENTO: 'ABRIR_FECHAR' };
  assert.equal(amb.ctx.AutPred_confirmarPeloSensor_(d, 'FECHAR', [{ code: 'door_control_1', value: 'close' }, { code: 'doorcontact_state', value: true }]).confirmado, false);
  assert.equal(amb.ctx.AutPred_confirmarPeloSensor_(d, 'FECHAR', [{ code: 'doorcontact_state', value: false }]).confirmado, true);
  assert.equal(amb.ctx.AutPred_confirmarPeloSensor_({ TIPO: 'PORTAO', ACIONAMENTO: 'PULSO' }, 'ABRIR', [{ code: 'doorcontact_state', value: false }]), null, 'pulso: regra antiga');
});

test('posição do portão: Aberto/Fechado pelo sensor, Abrindo…/Fechando… no percurso do comando do SGO+; a tela relê com leitura compartilhada e cede a vez quando o minuto está cheio', () => {
  const amb = ambiente();
  amb.api.garagem = true;
  sincronizar(amb);
  const e = (estado, extra) => amb.ctx.AutPred_estadoPortao_(Object.assign({ ACIONAMENTO: 'ABRIR_FECHAR', ESTADO_JSON: JSON.stringify(estado) }, extra || {}), Date.now());
  const recente = (cmd) => ({ ULT_CMD_EM: new Date(Date.now() - 5000).toISOString(), ULT_CMD_SITUACAO: 'CONFIRMADO', ULT_CMD_COMANDO: cmd });
  const velho = (cmd) => ({ ULT_CMD_EM: new Date(Date.now() - 120000).toISOString(), ULT_CMD_SITUACAO: 'CONFIRMADO', ULT_CMD_COMANDO: cmd });
  assert.equal(e([{ code: 'doorcontact_state', value: true }]).codigo, 'ABERTO');
  assert.equal(e([{ code: 'doorcontact_state', value: false }]).codigo, 'FECHADO');
  assert.equal(e([{ code: 'doorcontact_state', value: true }], recente('ABRIR')).codigo, 'ABRINDO');
  assert.equal(e([{ code: 'doorcontact_state', value: true }], recente('FECHAR')).codigo, 'FECHANDO');
  assert.equal(e([{ code: 'doorcontact_state', value: true }, { code: 'door_control_1', value: 'open' }], recente('FECHAR')).codigo, 'FECHANDO', 'o door_control_1 da nuvem não manda');
  assert.equal(e([{ code: 'doorcontact_state', value: false }], recente('FECHAR')).codigo, 'FECHADO', 'fechou: o sensor manda');
  assert.equal(e([{ code: 'doorcontact_state', value: true }], velho('FECHAR')).codigo, 'ABERTO', 'passou o percurso: o sensor manda');
  assert.equal(e([{ code: 'doorcontact_state', value: true }], Object.assign({ PERCURSO_S: 2 }, recente('ABRIR'))).codigo, 'ABERTO', 'percurso gravado em Administrar');
  // 23/10/2026: o módulo informa door_time_1 = 20, mas a garagem leva ~40 s; sem tempo gravado vale o maior entre o módulo e 45 s
  assert.equal(amb.ctx.AutPred_percursoS_({ ESTADO_JSON: JSON.stringify([{ code: 'door_time_1', value: 20 }]) }), 60);
  assert.equal(amb.ctx.AutPred_percursoS_({ ESTADO_JSON: JSON.stringify([{ code: 'door_time_1', value: 60 }]) }), 60);
  assert.equal(amb.ctx.AutPred_percursoS_({ PERCURSO_S: 38, ESTADO_JSON: JSON.stringify([{ code: 'door_time_1', value: 20 }]) }), 38);
  assert.equal(e([{ code: 'switch_1', value: false }], Object.assign({ ACIONAMENTO: 'PULSO' }, recente('ABRIR'))).codigo, '', 'pedestre sem sensor');
  // consulta da tela: lê a garagem (sensor) e não o pedestre; várias telas em 4,5 s = uma leitura
  amb.homologar('Portão principal');
  amb.como(TEC);
  amb.api.portaoAberto = true;
  let r = amb.api_('portoes');
  assert.equal(r.ok, true, r.message);
  const gar = r.itens.find((x) => x.id === amb.disp('Portão principal').ID);
  assert.equal(gar.estadoPortao.codigo, 'ABERTO');
  assert.equal(amb.disp('Portão principal').ESTADO_JSON.includes('"doorcontact_state","value":true'), true, 'mudança gravada');
  const n0 = amb.api.leiturasGaragem;
  amb.api_('portoes'); amb.api_('portoes');
  assert.equal(amb.api.leiturasGaragem, n0, 'leitura compartilhada');
  assert.ok(!r.itens.some((x) => x.id === amb.disp('Porta da Diretoria').ID), 'sem a porta');
  // minuto cheio: a tela não lê (a folga fica para os comandos e a abertura automática)
  Object.keys(amb.cache).filter((k) => k.startsWith('AUT_ESTADO_')).forEach((k) => { delete amb.cache[k]; });
  amb.cache['TUYA_CHAMADAS_MIN_' + Math.floor(Date.now() / 60000)] = '75';
  amb.api_('portoes');
  assert.equal(amb.api.leiturasGaragem, n0, 'cedeu a vez');
  // a tela troca só os selos no lugar e avisa quando a posição muda
  const tela = ler('JS_AutomacaoPredial.html');
  assert.match(tela, /AutPred_chamar_\("portoes"/);
  assert.match(tela, /abriu" : " fechou"/);
});

// ---------------------------------------------------------------- registro de rastreabilidade legível
test('registro legível: frase curta por resultado, sem JSON nem códigos fora dos detalhes técnicos; filtros por dispositivo e pessoa; origem; auditoria em frase', () => {
  const amb = ambiente();
  sincronizar(amb);
  const p1 = amb.disp('Portão principal'), p2 = amb.disp('Portão secundário');
  amb.homologar('Portão principal');
  amb.como(DONO);
  const ab = (id, op, origem) => { const p = amb.api_('preparar', { dispositivoId: id, operacaoId: op }); return amb.api_('comando', { dispositivoId: id, operacaoId: op, confirmacaoToken: p.confirmacaoToken, origem }); };
  const p3 = amb.api_('preparar', { dispositivoId: p1.ID, operacaoId: 'op-reg-00000003' }); // janela aberta antes do primeiro comando
  assert.equal(ab(p1.ID, 'op-reg-00000001', 'CELULAR').comando.situacao, 'CONFIRMADO');
  assert.equal(ab(p2.ID, 'op-reg-00000002', 'COMPUTADOR').comando.situacao, 'SIMULADO');
  assert.equal(amb.api_('comando', { dispositivoId: p1.ID, operacaoId: 'op-reg-00000003', confirmacaoToken: p3.confirmacaoToken, origem: 'ATALHO_INICIO' }).ok, false, 'intervalo de 10 s');
  amb.como(DIR); amb.envelhecer();
  assert.equal(ab(p2.ID, 'op-reg-00000004', 'COMPUTADOR').comando.situacao, 'SIMULADO');
  amb.como(DONO);
  const r = amb.api_('registro', {});
  assert.equal(r.ok, true, r.message);
  const por = Object.fromEntries(r.itens.map((c) => [c.operacaoId, c]));
  assert.match(por['op-reg-00000001'].resultadoTexto, /^Aberto — confirmado pelo portão às \d\d:\d\d:\d\d$/);
  assert.equal(por['op-reg-00000001'].resultadoTom, 'ok');
  assert.equal(por['op-reg-00000001'].origemTexto, 'Celular');
  assert.equal(por['op-reg-00000001'].acaoTexto, 'Abrir');
  assert.match(por['op-reg-00000001'].quandoCompleto, /^\d\d\/\d\d\/\d{4} \d\d:\d\d:\d\d$/);
  assert.equal(por['op-reg-00000002'].resultadoTexto, 'Teste — nada enviado (portão ainda não homologado)');
  assert.equal(por['op-reg-00000003'].resultadoTexto, 'Recusado — aguarde 10 s entre comandos');
  assert.equal(por['op-reg-00000003'].origemTexto, 'Atalho no Início');
  // nada técnico nos campos que a tabela mostra
  const visiveis = r.itens.map((c) => [c.quandoCompleto, c.dispositivo, c.local, c.solicitante, c.acaoTexto, c.resultadoTexto, c.origemTexto].join(' ')).join(' ');
  assert.ok(!/switch_1|code|\{|dev-|op-reg|tid/.test(visiveis), visiveis);
  assert.match(por['op-reg-00000001'].tecnico.comando, /switch_1/, 'o técnico fica guardado');
  // filtros
  assert.deepEqual(amb.api_('registro', { dispositivoId: p2.ID }).itens.map((c) => c.operacaoId).sort(), ['op-reg-00000002', 'op-reg-00000004']);
  assert.deepEqual(amb.api_('registro', { pessoaId: 'uD' }).itens.map((c) => c.operacaoId), ['op-reg-00000004']);
  assert.ok(r.pessoas.some((x) => x.id === 'uD') && r.dispositivos.length === 3);
  assert.equal(amb.api_('registro', { de: '2020-01-01', ate: '2020-01-31' }).itens.length, 0);
  // quem não vê a porta não vê os comandos dela no registro; auditoria em frase
  const aud = amb.api_('auditoria');
  assert.ok(aud.itens.some((a) => a.frase === 'O dispositivo confirmou a execução'));
  assert.ok(aud.itens.some((a) => a.frase === 'Recusado: aguarde 10 s entre comandos'));
  assert.ok(aud.itens.every((a) => !/^[A-Z_]+$/.test(a.frase)), 'nenhum código de evento cru');
  // duplo toque: conferir e gravar sob a trava do script; a tela trava o preparo e a janela
  const fonte = ler('SGO_Automacao_Predial.js');
  assert.match(fonte, /function AutPred_executar_\(sessao, dados\) \{\s*var trava = null;\s*try \{ trava = LockService\.getScriptLock\(\); trava\.waitLock/);
  assert.match(ler('JS_AutomacaoPredial.html'), /if \(AUTP\.preparando \|\| document\.getElementById\("autJanela"\)\) return;/);
});

// ---------------------------------------------------------------- cota da Tuya, eventos e sentinela (27/10/2026)
// Caso real: desde as 07:45 de 27/10/2026 toda chamada voltava {"code":28841004,"msg":"No permissions. Your quota of Trial
// Edition is used up.","success":false} com HTTP 200; a abertura automática lia a fechadura a cada 3 s o dia todo.
const COTA_REAL = { code: 28841004, msg: 'No permissions. Your quota of Trial Edition is used up.', success: false, t: 1793000000000, tid: 'tid-cota' };
const cotaEsgotada = (amb) => {
  const orig = amb.ctx.UrlFetchApp.fetch;
  amb.ctx.UrlFetchApp.fetch = function (url, op) { amb.api.pedidos.push({ metodo: String(op.method).toUpperCase(), caminho: new URL(url).pathname, corpo: null }); if (new URL(url).pathname === '/v1.0/token') return orig(url, op); return { getResponseCode: () => 200, getContentText: () => JSON.stringify(COTA_REAL), getAllHeaders: () => ({}) }; };
  return () => { amb.ctx.UrlFetchApp.fetch = orig; };
};
const uso = (amb) => JSON.parse(amb.props.TUYA_USO_V1 || '{}');
const s74 = (amb) => amb.notificacoes.filter((x) => x.evento === 'S74');

test('cota esgotada (caso real 28841004): equipe vê "fora do ar" e usa o controle; gestão avisada uma vez (S74, WhatsApp); leituras automáticas param; sentinela vê a volta e avisa a normalização', () => {
  const amb = ambiente();
  amb.api.garagem = true;
  sincronizar(amb);
  amb.homologar('Portão secundário'); amb.homologar('Portão principal');
  const ped = amb.disp('Portão secundário');
  // contador por origem: sincronização, token e comandos contam
  assert.ok(uso(amb).diaPor.SINCRONIZAR >= 1 && uso(amb).diaPor.TOKEN >= 1, JSON.stringify(uso(amb).diaPor));
  const voltar = cotaEsgotada(amb);
  amb.como(TEC);
  let r = amb.abrir(ped.ID, 'op-cota-0000001');
  assert.equal(r.ok, true, r.message);
  assert.equal(r.texto, 'Portões pelo SGO+ fora do ar no momento: use o controle ou o aplicativo Smart Life. A gestão já foi avisada.');
  assert.equal(r.foraDoAr, true); assert.equal(r.comando.situacao, 'RECUSADO');
  assert.ok(!/28841004|Trial|quota/i.test(r.texto), 'nada técnico para o colaborador');
  let avisos = s74(amb);
  assert.equal(avisos.length, 1);
  assert.deepEqual(Array.from(avisos[0].usuarios).sort(), ['uA', 'uD', 'uV'], 'responsável pelo sistema e Diretoria');
  assert.deepEqual(Array.from(avisos[0].canais), ['sgo', 'email', 'whatsapp']);
  assert.match(avisos[0].texto, /^O quê: Cota da Tuya esgotada.*Por quê: .*28841004.*O que fazer: Renove em iot\.tuya\.com › Cloud › Cloud Services › IoT Core/);
  assert.equal(uso(amb).bloqueio.tipo, 'COTA'); assert.equal(uso(amb).ultimoErro.codigo, 28841004);
  assert.ok(amb.tabelas.AUT_INCIDENTES.some((x) => x.EVENTO === 'ABERTO' && x.CHAVE === 'tuya_nuvem'));
  // a gestão vê o detalhe técnico; a mesma falha não avisa de novo
  amb.envelhecer(); amb.como(DONO);
  r = amb.abrir(ped.ID, 'op-cota-0000002');
  assert.match(r.texto, /fora do ar.*Detalhe para a gestão: .*28841004/);
  assert.equal(s74(amb).length, 1, 'um aviso por incidente');
  // telas: faixa para a equipe; nenhuma leitura automática sai com a cota esgotada
  amb.como(TEC);
  const rap = amb.api_('rapido');
  assert.equal(rap.infra.portoesForaDoAr, true); assert.match(rap.infra.alarmeTexto, /alarme não depende/);
  Object.keys(amb.cache).filter((k) => k.startsWith('AUT_ESTADO_')).forEach((k) => { delete amb.cache[k]; });
  const n0 = amb.api.pedidos.length;
  const pt = amb.api_('portoes');
  assert.equal(pt.ok, true, pt.message);
  assert.equal(amb.api.pedidos.length, n0, 'tela não relê com a cota esgotada');
  // a cota volta: a sentinela confere (1 chamada por hora, na janela) e avisa a normalização
  voltar();
  const s = amb.ctx.AutPred_sentinela({ itens: [] });
  assert.ok(s.itens >= 4);
  assert.equal(uso(amb).bloqueio, null);
  const norm = s74(amb).filter((x) => /normalizado/.test(x.titulo));
  assert.equal(norm.length, 1); assert.match(norm[0].texto, /Antes: Cota da Tuya esgotada/);
  assert.ok(amb.tabelas.AUT_INCIDENTES.some((x) => x.EVENTO === 'NORMALIZADO' && x.CHAVE === 'tuya_nuvem'));
  // a conferência não se repete na mesma hora (sentinela não gasta chamada à toa)
  const n1 = amb.api.pedidos.length;
  amb.ctx.AutPred_sentinela({ itens: [] }); amb.ctx.AutPred_sentinela({ itens: [] });
  assert.equal(amb.api.pedidos.length, n1, 'sem chamada nas rodadas seguintes');
});

test('orçamento da cota: 70% avisa (sem WhatsApp); 90% liga o modo econômico (leituras automáticas param, comando de pessoa sai); Diretoria sai com motivo; virada do mês desliga', () => {
  const amb = ambiente();
  amb.api.garagem = true; amb.api.pedido = true;
  sincronizar(amb);
  amb.homologar('Portão principal'); amb.homologar('Porta da Diretoria');
  const mes = amb.ctx.Tuya_diaDe_().slice(0, 7);
  const fixarUso = (n) => { const u = uso(amb); u.mes = mes; u.mesTotal = n; amb.props.TUYA_USO_V1 = JSON.stringify(u); };
  fixarUso(18300); // 70,3% de 26.000
  amb.ctx.AutPred_sentinela({ itens: [] });
  let a = s74(amb);
  assert.equal(a.length, 1); assert.match(a[0].titulo, /Consumo da cota da Tuya em 70\.3%/); assert.deepEqual(Array.from(a[0].canais), ['sgo', 'email']);
  assert.equal(amb.props.AUT_ECONOMICO, undefined);
  fixarUso(23500); // 90,3%
  amb.ctx.AutPred_sentinela({ itens: [] });
  const eco = JSON.parse(amb.props.AUT_ECONOMICO);
  assert.equal(eco.mes, mes); assert.match(eco.motivo, /23\.500 de 26\.000/);
  assert.ok(amb.tabelas.AUT_INCIDENTES.some((x) => x.EVENTO === 'ACAO_AUTOMATICA' && /Modo econômico ligado automaticamente/.test(x.TEXTO)));
  // modo econômico: a tela não relê a garagem nem a campainha; a pessoa ainda pode verificar e comandar
  amb.como(DONO);
  Object.keys(amb.cache).forEach((k) => { if (/AUT_ESTADO_|AUT_PEDIDO_/.test(k)) delete amb.cache[k]; });
  const n0 = amb.api.pedidos.length;
  assert.equal(amb.api_('portoes').infra.economico, true);
  const pe = amb.api_('pedido');
  assert.equal(pe.itens[0].pausada, true); assert.match(pe.itens[0].aviso, /Verificar campainha agora/);
  assert.equal(amb.ctx.AutPred_rotinaPedidos().avisos, 0);
  assert.equal(amb.api.pedidos.length, n0, 'nenhuma leitura automática no modo econômico');
  tocar(amb, 40);
  const pa = amb.api_('pedidoAgora');
  assert.equal(pa.itens[0].ativo, true, 'verificação pedida pela pessoa sai');
  amb.envelhecer();
  const g = amb.disp('Portão principal');
  const p = amb.api_('preparar', { dispositivoId: g.ID, operacaoId: 'op-eco-00000001', acao: 'ALTERNAR' });
  assert.equal(p.ok, true, p.message);
  assert.equal(amb.api_('comando', { dispositivoId: g.ID, operacaoId: 'op-eco-00000001', confirmacaoToken: p.confirmacaoToken, acao: 'ALTERNAR' }).ok, true, 'comando de pessoa continua');
  // tela da saúde: Diretoria e Administrador; só diretor sai do modo econômico
  amb.como(GESTOR); assert.match(amb.api_('saude').message, /Diretoria e do Administrador/);
  amb.como(ADM2);
  let sd = amb.api_('saude');
  assert.equal(sd.ok, true, sd.message); assert.equal(sd.economico.ligado, true); assert.equal(sd.podeSairEconomico, false);
  assert.ok(sd.itens.some((i) => i.chave === 'tuya_economico' && i.tom === 'amarelo'));
  assert.equal(sd.uso.mes, uso(amb).mesTotal); assert.equal(sd.uso.orcamento, 26000);
  assert.match(amb.api_('saudeSairEconomico', { motivo: 'teste do administrador' }).message, /só um diretor/);
  amb.como(DIR);
  assert.match(amb.api_('saudeSairEconomico', { motivo: 'x' }).message, /motivo/);
  sd = amb.api_('saudeSairEconomico', { motivo: 'visita de cliente hoje' });
  assert.equal(sd.ok, true, sd.message); assert.equal(sd.economico.ligado, false);
  assert.equal(amb.props.AUT_ECONOMICO, undefined);
  amb.ctx.AutPred_sentinela({ itens: [] });
  assert.equal(amb.props.AUT_ECONOMICO, undefined, 'neste mês não religa sozinho');
  assert.ok(amb.tabelas.AUT_AUDITORIA.some((x) => x.EVENTO === 'MODO_ECONOMICO_DESLIGADO'));
  // virada do mês: modo econômico de um mês anterior não vale e é desligado com registro
  amb.props.AUT_ECONOMICO = JSON.stringify({ mes: '2026-09', desde: 1, motivo: 'automático', por: 'Sentinela' });
  assert.equal(amb.ctx.Tuya_economico_(), null);
  amb.ctx.AutPred_sentinela({ itens: [] });
  assert.equal(amb.props.AUT_ECONOMICO, undefined);
  assert.ok(amb.tabelas.AUT_INCIDENTES.some((x) => /virada do mês/.test(x.TEXTO)));
  // configuração (diretor): orçamento maior tira do modo econômico
  amb.props.AUT_ECONOMICO = JSON.stringify({ mes, desde: Date.now(), motivo: 'automático', por: 'Sentinela' });
  sd = amb.api_('saudeCfg', { orcamentoMes: '100.000', consultaInicio: '08:00', consultaFim: '18:00', consultaIntervaloS: 120, consultaDias: [1, 2, 3, 4, 5], motivo: 'plano pago assinado' });
  assert.equal(sd.ok, true, sd.message); assert.match(sd.mensagem, /modo econômico foi desligado/); assert.equal(sd.uso.orcamento, 100000);
  amb.como(ADM2); assert.match(amb.api_('saudeCfg', { orcamentoMes: '50000', motivo: 'teste adm' }).message, /só um diretor/);
});

test('eventos da Tuya: a campainha abre pela abertura automática sem ler a nuvem; portão pelo evento; sem eventos, consulta econômica compartilhada (nunca a cada 3 s) e só na janela', () => {
  const amb = ambiente();
  amb.api.pedido = true; amb.api.garagem = true;
  sincronizar(amb);
  amb.homologar('Porta da Diretoria'); amb.homologar('Portão principal');
  const f = amb.disp('Porta da Diretoria');
  amb.como(DONO);
  assert.equal(amb.api_('autoAbrir', { id: f.ID, ligado: true }).ok, true);
  // servidor conectado ao serviço de mensagens e evento da fechadura recebido
  amb.props.TUYA_MSG_ESTADO = JSON.stringify({ conectado: true, vivoEm: Date.now(), desde: Date.now() - 60000, mensagensDia: 3, mensagensMes: 40 });
  const evFech = (seg) => { amb.props['TUYA_EVT_dev-fech-1'] = JSON.stringify({ props: { unlock_request: { value: seg, time: Date.now() }, doorbell: { value: true, time: Date.now() - 500 } }, recebidoEm: Date.now(), primeiroEm: Date.now() }); };
  evFech(40); amb.api.pedidoValor = 40; amb.api.pedidoEm = Date.now();
  const sombra0 = amb.api.leiturasSombra || 0;
  const r = amb.ctx.AutPred_aoEventoTuya('dev-fech-1');
  assert.equal(r.tratado, true);
  assert.equal(JSON.stringify(amb.api.respostasPedido), JSON.stringify([{ code: 'reply_unlock_request', value: true }]));
  assert.equal(amb.api.leiturasSombra || 0, sombra0, 'o pedido veio do evento, sem ler a sombra');
  assert.equal(amb.ctx.AutPred_rotinaRapida().abertas, 0, 'uma resposta por pedido');
  assert.equal(amb.api.leiturasSombra || 0, sombra0, 'rotina rápida com eventos não lê a nuvem');
  assert.equal(amb.api_('pedido').fonte, 'eventos');
  // portão pelo evento: posição sem chamada
  amb.props['TUYA_EVT_dev-portao-1'] = JSON.stringify({ props: { doorcontact_state: { value: true, time: Date.now() } }, online: true, recebidoEm: Date.now() });
  const gar0 = amb.api.leiturasGaragem || 0;
  const pt = amb.api_('portoes');
  const gar = pt.itens.find((x) => x.id === amb.disp('Portão principal').ID);
  assert.equal(gar.estadoPortao.codigo, 'ABERTO'); assert.equal(gar.fonte, 'eventos'); assert.equal(pt.proximaS, 10);
  assert.equal(amb.api.leiturasGaragem || 0, gar0, 'posição pelo evento, sem chamada');
  // conexão parada há mais de 3 min: volta à consulta econômica, compartilhada por 120 s
  amb.props.TUYA_MSG_ESTADO = JSON.stringify({ conectado: true, vivoEm: Date.now() - 600000 });
  amb.envelhecer(); tocar(amb, 60); amb.api.campainhaEm = Date.now() - 200;
  amb.ctx.AutPred_rotinaRapida();
  const s1 = amb.api.leiturasSombra;
  for (let i = 0; i < 20; i++) amb.ctx.AutPred_rotinaRapida(); // um minuto de rotina rápida (3 s)
  amb.ctx.AutPred_rotinaPedidos(); amb.api_('pedido');
  assert.equal(amb.api.leiturasSombra, s1, 'a leitura vale por 120 s para todos');
  // janela da consulta econômica (padrão: dias úteis, 08:00 às 18:00, horário de Brasília)
  const cfg = JSON.parse(JSON.stringify(amb.ctx.AUT_SAUDE_PADRAO));
  assert.equal(amb.ctx.AutPred_naJanela_(cfg, Date.parse('2026-10-26T10:00:00-03:00')), true, 'segunda 10:00');
  assert.equal(amb.ctx.AutPred_naJanela_(cfg, Date.parse('2026-10-26T07:59:00-03:00')), false, 'segunda 07:59');
  assert.equal(amb.ctx.AutPred_naJanela_(cfg, Date.parse('2026-10-26T18:00:00-03:00')), false, 'segunda 18:00');
  assert.equal(amb.ctx.AutPred_naJanela_(cfg, Date.parse('2026-10-24T10:00:00-03:00')), false, 'sábado');
  // fora da janela, as rotinas não consultam
  amb.props.AUT_SAUDE_CFG = JSON.stringify({ consultaInicio: '00:00', consultaFim: '00:01', consultaDias: [] });
  limparPedido(amb);
  const s2 = amb.api.leiturasSombra;
  amb.ctx.AutPred_rotinaPedidos();
  const rr = amb.ctx.AutPred_rotinaRapida();
  assert.equal(amb.api.leiturasSombra, s2, 'fora da janela nada é lido');
  assert.match(rr.consulta, /^fora da janela/);
});

test('sentinela: item do servidor só vira incidente depois das rodadas pedidas; aviso uma vez; normalização avisada; ação automática registrada; chave desconhecida ignorada', () => {
  const amb = ambiente();
  sincronizar(amb);
  const alarmeFalha = { chave: 'alarme', situacao: 'falha', texto: 'Central de alarme sem resposta', porque: 'Duas tentativas sem resposta.', oQueFazer: 'Confira a energia e a internet da central.', confirmar: 2, critico: true };
  amb.ctx.AutPred_sentinela({ em: Date.now(), itens: [alarmeFalha, { chave: 'qualquer', situacao: 'falha', texto: 'x' }] });
  assert.equal(s74(amb).length, 0, 'primeira rodada: ainda não');
  amb.ctx.AutPred_sentinela({ em: Date.now(), itens: [alarmeFalha] });
  amb.ctx.AutPred_sentinela({ em: Date.now(), itens: [alarmeFalha] });
  let a = s74(amb);
  assert.equal(a.length, 1); assert.match(a[0].titulo, /Central de alarme sem resposta/); assert.deepEqual(Array.from(a[0].canais), ['sgo', 'email', 'whatsapp']);
  amb.ctx.AutPred_sentinela({ em: Date.now(), itens: [{ chave: 'rotina_minuto', situacao: 'ok', texto: 'Instalada', acoes: [{ texto: 'Rotina de 1 minuto da automação reinstalada.', ok: true }] }, { chave: 'alarme', situacao: 'ok', texto: 'Central respondeu: desarmada' }] });
  a = s74(amb);
  assert.equal(a.length, 2); assert.match(a[1].titulo, /normalizado: Central de alarme Intelbras/);
  assert.ok(amb.tabelas.AUT_INCIDENTES.some((x) => x.EVENTO === 'ACAO_AUTOMATICA' && /reinstalada/.test(x.TEXTO)));
  assert.ok(!amb.tabelas.AUT_INCIDENTES.some((x) => x.CHAVE === 'qualquer'));
  amb.como(DONO);
  const sd = amb.api_('saude');
  assert.ok(sd.itens.some((i) => i.chave === 'alarme' && i.tom === 'verde'));
  assert.ok(sd.incidentes.some((x) => x.evento === 'Incidente aberto' && x.item === 'Central de alarme Intelbras'));
  // nenhum segredo nos incidentes nem no consumo
  const tudo = JSON.stringify(amb.tabelas.AUT_INCIDENTES) + amb.props.TUYA_USO_V1 + (amb.props.AUT_SAUDE_ESTADO || '');
  assert.ok(!tudo.includes('segredo-de-teste-0001') && !tudo.includes('tok-1'));
  // tela: aba, ritmo dado pelo servidor e aba oculta
  const tela = ler('JS_AutomacaoPredial.html');
  assert.match(tela, /\["saude", "Saúde da infraestrutura"\]/);
  assert.match(tela, /document\.visibilityState === "hidden"/);
  assert.match(tela, /agendar\(r\.proximaS\)/);
  assert.doesNotMatch(tela, /setInterval\(tickPortoes|setInterval\(tick, 3000\)/, 'sem consulta fixa a cada 3 ou 5 s');
});
