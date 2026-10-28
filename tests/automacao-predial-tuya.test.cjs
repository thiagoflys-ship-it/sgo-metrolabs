// Segurança e automação predial — cliente da API da Tuya (SGO_Automacao_Tuya.js) com a nuvem SIMULADA (22/10/2026).
// Nenhuma chamada real: UrlFetchApp é um simulacro. A assinatura é conferida bit a bit contra o exemplo oficial da
// documentação "Sign requests" da Tuya (client_id, secret, t, nonce e sign publicados lá).
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

function ambiente(o) {
  o = o || {};
  const props = Object.assign({ TUYA_ACCESS_ID: 'id-de-teste-0001', TUYA_ACCESS_SECRET: 'segredo-de-teste-0001', TUYA_REGIAO: 'us', TUYA_LIGADO: '1', TUYA_ENDPOINT: 'http://localhost:8199' }, o.props || {});
  Object.keys(props).forEach((k) => { if (props[k] === null) delete props[k]; });
  const cache = {};
  const api = { pedidos: [], tokenSeq: 0, tokenVencido: false, respostas: {}, falhaRede: false };
  const resposta = (code, corpo) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(corpo), getAllHeaders: () => ({}) });
  const ctx = vm.createContext({
    console,
    Utilities: criarUtilities({
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (alg, txt) => comSinal(crypto.createHash('sha256').update(String(txt), 'utf8').digest()),
      computeHmacSha256Signature: (txt, chave) => comSinal(crypto.createHmac('sha256', String(chave)).update(String(txt), 'utf8').digest())
    }),
    Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k === 'TUYA_ULTIMA_CHAMADA_MS' ? null : (k in cache ? cache[k] : null)), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    UrlFetchApp: {
      fetch(url, op) {
        const u = new URL(url);
        const p = { metodo: String(op.method).toUpperCase(), caminho: u.pathname, consulta: u.search, headers: op.headers, corpo: op.payload ? JSON.parse(op.payload) : null };
        api.pedidos.push(p);
        if (api.falhaRede) throw new Error('ECONNRESET endereço ' + url);
        if (api.respostas[u.pathname]) return resposta(200, api.respostas[u.pathname](p));
        if (u.pathname === '/v1.0/token') { api.tokenSeq++; return resposta(200, { success: true, t: Date.now(), result: { access_token: 'tok-' + api.tokenSeq, refresh_token: 'ref-' + api.tokenSeq, expire_time: 7200, uid: 'uid-app-001' } }); }
        if (u.pathname.startsWith('/v1.0/token/')) { api.tokenSeq++; return resposta(200, { success: true, result: { access_token: 'tok-' + api.tokenSeq, refresh_token: 'ref-' + api.tokenSeq, expire_time: 7200, uid: 'uid-app-001' } }); }
        if (api.tokenVencido && op.headers.access_token === 'tok-1') return resposta(200, { success: false, code: 1010, msg: 'token is expired' });
        if (u.pathname === '/v1.0/iot-01/associated-users/devices') return resposta(200, { success: true, result: { has_more: false, devices: [
          { id: 'dev-portao-1', name: 'Portão principal', category: 'ckmkzq', product_id: 'p1', product_name: 'Abridor', online: true, status: [{ code: 'switch_1', value: false }, { code: 'doorcontact_state', value: false }] },
          { id: 'dev-fech-1', name: 'Porta da Diretoria', category: 'ms', product_id: 'p2', product_name: 'Fechadura', online: true, status: [{ code: 'residual_electricity', value: 80 }] }
        ] } });
        if (u.pathname === '/v1.0/devices/dev-portao-1/functions') return resposta(200, { success: true, result: { category: 'ckmkzq', functions: [{ code: 'switch_1', type: 'Boolean', values: '{}', name: 'Switch' }] } });
        if (u.pathname === '/v1.0/devices/dev-fech-1/functions') return resposta(200, { success: true, result: { category: 'ms', functions: [{ code: 'unlock_temporary', type: 'Integer' }] } });
        if (u.pathname === '/v1.0/devices/dev-fech-1/door-lock/remote-unlocks') return resposta(200, { success: false, code: 1106, msg: 'permission deny' });
        if (u.pathname === '/v1.0/devices/dev-portao-1/status') return resposta(200, { success: true, result: [{ code: 'switch_1', value: api.portaoAberto === true }] });
        if (u.pathname === '/v1.0/devices/dev-portao-1/commands') { api.portaoAberto = true; return resposta(200, { success: true, t: 1, tid: 'tid-1', result: true }); }
        if (u.pathname === '/v1.0/devices/dev-portao-1') return resposta(200, { success: true, result: { id: 'dev-portao-1', name: 'Portão principal', category: 'ckmkzq', online: true, status: [{ code: 'switch_1', value: api.portaoAberto === true }] } });
        return resposta(200, { success: false, code: 2010, msg: 'device not exist' });
      }
    }
  });
  vm.runInContext(ler('SGO_Automacao_Tuya.js'), ctx);
  return { ctx, props, cache, api };
}

test('assinatura: exemplo oficial da documentação (token e pedido de negócio) bate bit a bit', () => {
  const { ctx } = ambiente();
  const comum = { clientId: '1KAD46OrT9HafiKdsXeg', secret: '4OHBOnWOqaEC1mWXOpVL3yV50s0qGSRC', t: '1588925778000', nonce: '5138cc3a9033d69856923fd07b491173',
    cabecalhosAssinados: [['area_id', '29a33e8796834b1efa6'], ['call_id', '8afdb70ab2ed11eb85290242ac130003']] };
  const tk = ctx.Tuya_assinar_(Object.assign({}, comum, { accessToken: '', metodo: 'GET', corpo: '', caminho: '/v1.0/token', query: { grant_type: 1 } }));
  assert.equal(tk.sign, '9E48A3E93B302EEECC803C7241985D0A34EB944F40FB573C7B5C2A82158AF13E');
  assert.equal(tk.stringToSign, 'GET\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\narea_id:29a33e8796834b1efa6\ncall_id:8afdb70ab2ed11eb85290242ac130003\n\n/v1.0/token?grant_type=1');
  const neg = ctx.Tuya_assinar_(Object.assign({}, comum, { accessToken: '3f4eda2bdec17232f67c0b188af3eec1', metodo: 'GET', corpo: '', caminho: '/v2.0/apps/schema/users', query: { page_size: 50, page_no: 1 } }));
  assert.equal(neg.sign, 'AE4481C692AA80B25F3A7E12C3A5FD9BBF6251539DD78E565A1A72A508A88784');
  assert.equal(neg.caminhoCompleto, '/v2.0/apps/schema/users?page_no=1&page_size=50', 'consulta ordenada por chave');
  // corpo JSON entra como SHA-256 do texto
  const sts = ctx.Tuya_stringToSign_('POST', '{"commands":[{"code":"switch_1","value":true}]}', [], '/v1.0/devices/x/commands', {});
  assert.equal(sts.split('\n')[1], crypto.createHash('sha256').update('{"commands":[{"code":"switch_1","value":true}]}').digest('hex'));
});

test('token: pedido assinado sem access_token, guardado em cache de memória e reaproveitado; nunca vai para propriedades', () => {
  const { ctx, api, props, cache } = ambiente();
  const c = ctx.Tuya_cfg_();
  assert.equal(c.url, 'http://localhost:8199', 'endereço local só para ensaio');
  const tk = ctx.Tuya_token_(c);
  assert.equal(tk.access_token, 'tok-1');
  assert.equal(api.pedidos.length, 1);
  assert.equal(api.pedidos[0].caminho, '/v1.0/token');
  assert.equal(api.pedidos[0].consulta, '?grant_type=1');
  assert.equal(api.pedidos[0].headers.sign_method, 'HMAC-SHA256');
  assert.equal(api.pedidos[0].headers.access_token, undefined);
  assert.equal(api.pedidos[0].headers.client_id, 'id-de-teste-0001');
  ctx.Tuya_token_(c);
  assert.equal(api.pedidos.length, 1, 'segundo pedido usa o cache');
  assert.ok(cache.TUYA_TOKEN_V1.includes('tok-1'));
  assert.ok(!Object.values(props).some((v) => String(v).includes('tok-1')), 'token nunca em propriedades');
});

test('token vencido (1010): renova uma vez e repete o pedido com o token novo', () => {
  const { ctx, api } = ambiente();
  const c = ctx.Tuya_cfg_();
  ctx.Tuya_token_(c);
  api.tokenVencido = true;
  const lista = ctx.Tuya_listarDispositivos_(c);
  assert.equal(lista.length, 2);
  const negocio = api.pedidos.filter((p) => p.caminho === '/v1.0/iot-01/associated-users/devices');
  assert.equal(negocio.length, 2);
  assert.equal(negocio[0].headers.access_token, 'tok-1');
  assert.equal(negocio[1].headers.access_token, 'tok-2');
});

test('erros traduzidos: 1106 e 28841105 dizem o que fazer no portal; sem resposta = erro de rede; nada de segredo no texto', () => {
  const { ctx, api } = ambiente();
  const c = ctx.Tuya_cfg_();
  api.respostas['/v1.0/devices/dev-x/status'] = () => ({ success: false, code: 1106, msg: 'permission deny segredo-de-teste-0001' });
  let erro = null;
  try { ctx.Tuya_estado_(c, 'dev-x'); } catch (e) { erro = e; }
  assert.ok(erro && /código 1106/.test(erro.message) && /Link Tuya App Account/.test(erro.message), erro && erro.message);
  assert.ok(!erro.message.includes('segredo-de-teste-0001'), 'segredo removido do texto');
  assert.equal(erro.tuyaCodigo, 1106);
  api.respostas['/v1.0/devices/dev-y/status'] = () => ({ success: false, code: 28841105, msg: 'No permissions' });
  assert.throws(() => ctx.Tuya_estado_(c, 'dev-y'), /28841105.*Go to Authorize/);
  api.respostas['/v1.0/devices/dev-z/status'] = () => ({ success: false, code: 28841002, msg: 'expired' });
  assert.throws(() => ctx.Tuya_estado_(c, 'dev-z'), /trial.*venceu/);
  // 27/10/2026: plano vencido marca o bloqueio; a chamada seguinte (sem origem de pessoa) nem sai
  const n0 = api.pedidos.length;
  assert.throws(() => ctx.Tuya_estado_(c, 'dev-portao-1'), (e) => e.tuyaBloqueioLocal === true && e.tuyaCodigo === 28841002);
  assert.equal(api.pedidos.length, n0);
  ctx.Tuya_usoGravar_({});
  api.falhaRede = true;
  try { ctx.Tuya_estado_(c, 'dev-portao-1'); assert.fail('devia falhar'); } catch (e) { assert.ok(e.tuyaRede, 'erro de rede marcado'); assert.ok(/sem resposta da Tuya/.test(e.message)); }
});

test('limite de frequência: a 91ª chamada do minuto não sai (90 por minuto desde 23/10/2026: campainha, abertura automática e estado dos portões)', () => {
  const { ctx, api } = ambiente();
  const c = ctx.Tuya_cfg_();
  // a contagem é por minuto do relógio: começa longe da virada, senão as 90 chamadas caem em dois minutos (falha intermitente)
  while (Date.now() % 60000 > 55000) { /* espera até 5 s */ }
  for (let i = 0; i < 90; i++) ctx.Tuya_chamarBruto_(c, 'GET', '/v1.0/token', { grant_type: 1 }, undefined, { semToken: true });
  assert.equal(api.pedidos.length, 90);
  assert.equal(ctx.Tuya_chamadasNoMinuto_(), 90);
  assert.throws(() => ctx.Tuya_chamarBruto_(c, 'GET', '/v1.0/token', { grant_type: 1 }, undefined, { semToken: true }), /limite de chamadas/);
  assert.equal(api.pedidos.length, 90);
});

test('descoberta: lista, comandos e matriz de compatibilidade (portão = switch_1; fechadura sem abertura remota = não disponível pela API)', () => {
  const { ctx } = ambiente();
  const c = ctx.Tuya_cfg_();
  const lista = ctx.Tuya_listarDispositivos_(c);
  assert.equal(lista.map((d) => d.deviceId).join(','), 'dev-portao-1,dev-fech-1');
  const f = ctx.Tuya_funcoes_(c, 'dev-portao-1');
  const comp = ctx.Tuya_compatibilidade_(f.categoria, f.funcoes, []);
  assert.equal(comp.tipo, 'PORTAO');
  assert.equal(JSON.stringify(comp.comandoAbrir), JSON.stringify({ code: 'switch_1', value: true }));
  assert.ok(comp.ok);
  const mr = ctx.Tuya_fechaduraMetodosRemotos_(c, 'dev-fech-1');
  assert.equal(mr.ok, false);
  const compF = ctx.Tuya_compatibilidade_('ms', ctx.Tuya_funcoes_(c, 'dev-fech-1').funcoes, mr.metodos);
  assert.equal(compF.tipo, 'FECHADURA');
  assert.equal(compF.ok, false);
  assert.equal(compF.remotoFechadura, 'NAO');
  assert.match(compF.motivo, /Não disponível pela API/);
  // fechadura com abertura remota: bilhete
  const compF2 = ctx.Tuya_compatibilidade_('jtmspro', [{ code: 'remote_no_dp_key' }], []);
  assert.equal(compF2.ok, true);
  assert.equal(compF2.remotoFechadura, 'BILHETE');
  // motor com control open/close/stop
  assert.equal(JSON.stringify(ctx.Tuya_compatibilidade_('cl', [{ code: 'control' }, { code: 'percent_control' }], []).comandoAbrir), JSON.stringify({ code: 'control', value: 'open' }));
  // categoria desconhecida: só consulta
  assert.equal(ctx.Tuya_compatibilidade_('wk', [{ code: 'temp_set' }], []).ok, false);
});

test('comando: POST assinado com o corpo e resposta aceita; recusa 2008 vira texto sem lançar', () => {
  const { ctx, api } = ambiente();
  const c = ctx.Tuya_cfg_();
  const r = ctx.Tuya_enviarComando_(c, 'dev-portao-1', [{ code: 'switch_1', value: true }]);
  assert.equal(r.aceito, true);
  assert.equal(r.tid, 'tid-1');
  const p = api.pedidos[api.pedidos.length - 1];
  assert.equal(p.metodo, 'POST');
  assert.equal(JSON.stringify(p.corpo), JSON.stringify({ commands: [{ code: 'switch_1', value: true }] }));
  assert.ok(p.headers.sign && p.headers.access_token, 'assinado com token');
  api.respostas['/v1.0/devices/dev-portao-1/commands'] = () => ({ success: false, code: 2008, msg: 'not supported' });
  const r2 = ctx.Tuya_enviarComando_(c, 'dev-portao-1', [{ code: 'x', value: 1 }]);
  assert.equal(r2.aceito, false);
  assert.equal(r2.codigo, 2008);
  assert.match(r2.msg, /não aceita este comando/);
});

test('teste de conexão (Chaves e senhas): só token e lista, nenhum comando; sem credencial diz o que gravar', () => {
  const { ctx, api } = ambiente();
  const r = ctx.Tuya_testarConexao_();
  assert.equal(r.funcionou, true);
  assert.match(r.texto, /2 dispositivo/);
  assert.ok(!api.pedidos.some((p) => p.metodo !== 'GET'), 'nenhum POST');
  const semCred = ambiente({ props: { TUYA_ACCESS_SECRET: null } });
  const r2 = semCred.ctx.Tuya_testarConexao_();
  assert.equal(r2.funcionou, false);
  assert.match(r2.texto, /TUYA_ACCESS_SECRET/);
  assert.equal(semCred.api.pedidos.length, 0);
});

test('endereço: região desconhecida cai no padrão (América Oeste); endereço alternativo só https ou localhost', () => {
  const a = ambiente({ props: { TUYA_REGIAO: 'xx', TUYA_ENDPOINT: null } });
  assert.equal(a.ctx.Tuya_cfg_().url, 'https://openapi.tuyaus.com');
  const b = ambiente({ props: { TUYA_REGIAO: 'eu', TUYA_ENDPOINT: 'http://exemplo.test' } });
  assert.equal(b.ctx.Tuya_cfg_().url, 'https://openapi.tuyaeu.com', 'http fora do próprio computador é ignorado');
});
