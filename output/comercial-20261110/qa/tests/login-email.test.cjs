// Entrada pelo e-mail, "Esqueci minha senha", link de redefinição (pessoa e gestão) e "Trocar minha senha"
// (31/10/2026, pedido do dono: "Redefinição de senha e esqueci senha, você tem que implantar, e acho que o usuário tem
// que ser o e-mail cadastrado [...] onde tem login ou apelido não precisa mais existir, remova").
// SGO_Auth.js + SGO_SegurancaAcesso.js + SGO_Usuarios.js num vm com planilha, cache, propriedades, e-mail e WhatsApp
// simulados. Só dados de teste. A parte do servidor (freio por e-mail e por conexão, contexto, rotas) está no
// sgo_servidor (testes/loginEmail.test.ts).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { criarUtilities } = require('./_simulacros_gas.cjs');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const COLS = ['ID', 'USUARIO', 'SENHA', 'NOME', 'PERFIL', 'STATUS', 'CRIADO_EM', 'CLIENTE_ID', 'EMAIL', 'CELULAR', 'REPRESENTADA_ID', 'REPRESENTACAO_PAPEL'];
const sinal = (buf) => Array.from(buf, (b) => (b > 127 ? b - 256 : b));
const semSinal = (arr) => Buffer.from(Array.from(arr, (b) => b & 255));

function ambiente(opcoes) {
  opcoes = opcoes || {};
  const abas = new Map();
  const novaAba = (nome, cab) => { abas.set(nome, { cab: cab.slice(), linhas: [] }); return abas.get(nome); };
  const usuarios = novaAba('CAD_USUARIOS', COLS);
  novaAba('SYS_LOGS', ['ID', 'DATA', 'USUARIO', 'ACAO', 'MODULO', 'DETALHE']);
  novaAba('REP_REPRESENTADAS', ['ID', 'NOME', 'SITUACAO']).linhas.push(['rep1', 'REPRESENTADA TESTE', 'ATIVA']);
  novaAba('CAD_CLIENTES', ['ID', 'NOME_FANTASIA', 'STATUS']).linhas.push(['c1', 'HOSPITAL TESTE', 'ATIVO']);
  function folha(nome) {
    const a = abas.get(nome);
    if (!a) return null;
    const celula = (r, c) => (r === 1 ? a.cab[c - 1] : (a.linhas[r - 2] || [])[c - 1]);
    const intervalo = (r, c, nr, nc) => ({
      getValues: () => Array.from({ length: nr || 1 }, (_, i) => Array.from({ length: nc || 1 }, (_, j) => { const v = celula(r + i, c + j); return v === undefined ? '' : v; })),
      setValue: (v) => { if (r === 1) a.cab[c - 1] = v; else { const l = a.linhas[r - 2]; while (l.length < c) l.push(''); l[c - 1] = v; } },
      setValues: (vals) => vals.forEach((linha, i) => linha.forEach((v, j) => { const rr = r + i; const l = a.linhas[rr - 2]; while (l.length < c + j) l.push(''); l[c + j - 1] = v; }))
    });
    return {
      getName: () => nome, getDataRange: () => intervalo(1, 1, a.linhas.length + 1, a.cab.length), getRange: (r, c, nr, nc) => intervalo(r, c, nr, nc),
      getLastRow: () => a.linhas.length + 1, getLastColumn: () => a.cab.length, appendRow: (l) => { a.linhas.push(l.slice()); }
    };
  }
  const props = new Map(), cache = new Map(), emails = [], fetches = [];
  const paraObj = (a, l) => { const o = {}; a.cab.forEach((h, i) => { o[h] = l[i] === undefined ? '' : l[i]; }); return o; };
  const ctx = {
    console, JSON,
    SGO_CFG: { DB_ID: 'db', SESSION_TTL: 21600, STATUS: { ATIVO: 'ATIVO' }, SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', SYS_LOGS: 'SYS_LOGS', CAD_CLIENTES: 'CAD_CLIENTES' },
      PROFILES: ['ADMIN', 'DIRETORIA', 'GESTOR', 'TECNICO', 'METROLOGIA', 'COMERCIAL', 'FINANCEIRO', 'RH', 'CLIENTE', 'REPRESENTADA'] },
    SGO_UTILS: {
      safe: (x) => String(x === null || x === undefined ? '' : x).trim(), safeUpper: (x) => String(x === null || x === undefined ? '' : x).trim().toUpperCase(),
      safeLower: (x) => String(x === null || x === undefined ? '' : x).trim().toLowerCase(), uuid: () => crypto.randomUUID(), nowIso: () => new Date().toISOString()
    },
    SpreadsheetApp: { openById: () => ({ getSheetByName: folha }) },
    SGO_DATA: {
      _headersCache: {}, _headerMapCache: {},
      getSheet: (n) => folha(n),
      getAll: (n) => { const a = abas.get(n); return a ? a.linhas.map((l) => paraObj(a, l)) : []; },
      getById: (n, id) => { const a = abas.get(n); const l = a && a.linhas.find((x) => String(x[0]) === String(id)); return l ? paraObj(a, l) : null; },
      update: (n, id, obj) => { const a = abas.get(n); const l = a && a.linhas.find((x) => String(x[0]) === String(id)); if (!l) return false; Object.keys(obj).forEach((k) => { let i = a.cab.indexOf(k); if (i < 0) { a.cab.push(k); i = a.cab.length - 1; } while (l.length <= i) l.push(''); l[i] = obj[k]; }); return true; },
      insert: (n, obj) => { const a = abas.get(n); Object.keys(obj).forEach((k) => { if (a.cab.indexOf(k) < 0) a.cab.push(k); }); a.linhas.push(a.cab.map((h) => (obj[h] === undefined ? '' : obj[h]))); return obj; },
      remove: (n, id) => { const a = abas.get(n); const i = a.linhas.findIndex((x) => String(x[0]) === String(id)); if (i < 0) return false; a.linhas.splice(i, 1); return true; },
      normalizarObjetoParaSheet: (_n, o) => o,
      gerarRegistroBase: (o) => Object.assign({ ID: 'u-' + crypto.randomUUID().slice(0, 8), CRIADO_EM: new Date().toISOString() }, o),
      mesclarCampos_: (atual, normal, pedido, campos) => { const s = {}; campos.forEach((c) => { s[c] = Object.prototype.hasOwnProperty.call(pedido || {}, c) ? normal[c] : (atual && atual[c] !== undefined && atual[c] !== null ? atual[c] : ''); }); return s; },
      log: () => true
    },
    SGO_textoFalhaOperador_: (acao, e) => 'Não foi possível ' + acao + ': ' + String((e && e.message) || e),
    CertCal_garantirColuna_: (n, c) => { const a = abas.get(n); if (a && a.cab.indexOf(c) < 0) a.cab.push(c); },
    CertCal_garantirTabela_: (n, cols) => { if (!abas.has(n)) novaAba(n, cols); },
    CertCal_forcarColunaTexto_: () => {},
    CacheService: { getScriptCache: () => ({ get: (k) => (cache.has(k) ? cache.get(k) : null), put: (k, v) => cache.set(k, String(v)), remove: (k) => cache.delete(k) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (props.has(k) ? props.get(k) : null), setProperty: (k, v) => props.set(k, String(v)), deleteProperty: (k) => props.delete(k), getProperties: () => Object.fromEntries(props) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ScriptApp: { getService: () => ({ getUrl: () => opcoes.url === undefined ? 'https://sgo.metrolabs.com.br' : opcoes.url }) },
    Utilities: criarUtilities({
      computeDigest: (_alg, t) => sinal(crypto.createHash('sha256').update(String(t), 'utf8').digest()),
      computeHmacSha256Signature: (v, k) => sinal(crypto.createHmac('sha256', semSinal(k)).update(semSinal(v)).digest()),
      newBlob: (t) => ({ getBytes: () => sinal(Buffer.from(String(t), 'utf8')) }),
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }
    }),
    MailApp: { sendEmail: (o) => { emails.push(o); } },
    UrlFetchApp: { fetch: (url, op) => { fetches.push({ url, corpo: JSON.parse(op.payload || 'null') }); return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ messages: [{ id: 'wamid.1' }] }) }; } },
    Chaves_ehDonoUsuario_: (u) => String(u || '').toLowerCase() === 'admin',
    SGO_CRIPTO: {
      pbkdf2Hex: (s, sal, it) => crypto.pbkdf2Sync(String(s), Buffer.from(sal, 'hex'), Math.min(it, 1000), 32, 'sha256').toString('hex'),
      aleatorioHex: (n) => crypto.randomBytes(n).toString('hex'),
      sha256Hex: (t) => crypto.createHash('sha256').update(String(t), 'utf8').digest('hex'),
      igual: (a, b) => String(a) === String(b)
    }
  };
  vm.createContext(ctx);
  for (const f of ['SGO_Auth.js', 'SGO_SegurancaAcesso.js', 'SGO_Usuarios.js']) vm.runInContext(fs.readFileSync(path.join(BASE, f), 'utf8'), ctx, { filename: f });
  const add = (o) => { usuarios.linhas.push(COLS.map((c) => (o[c] === undefined ? '' : o[c]))); return o; };
  const cad = (id) => ctx.SGO_DATA.getById('CAD_USUARIOS', id);
  const registro = () => (abas.get('SYS_SEGURANCA_ACESSO') || { linhas: [] }).linhas;
  const sessoes = () => [...props.keys()].filter((k) => k.startsWith('SGO_SESSION_'));
  const linkDe = (e) => { const m = /#redefinir=([0-9a-f]{64})/.exec(e.body); return m && m[1]; };
  const ultimoLink = () => { const e = emails.filter((x) => /senha nova/i.test(x.subject)).pop(); return e ? linkDe(e) : null; };
  const config = (modo, perfis) => {
    props.set('SEGA_CONFIG', JSON.stringify({ modo, perfis: perfis || [] }));
    props.set('META_WA_TOKEN', 'texto-ficticio-do-teste'); props.set('META_WA_PHONE_ID', '100000000000000');
  };
  const codigoMeta = () => fetches[fetches.length - 1].corpo.template.components[0].parameters[0].text;
  return { ctx, abas, props, cache, emails, fetches, add, cad, registro, sessoes, linkDe, ultimoLink, config, codigoMeta };
}

const CTX = { ip: '200.1.2.3', agente: 'Mozilla/5.0 (Linux; Android 14) Chrome/130', aparelho: '' };
const ADMIN = { ID: 'u-admin', USUARIO: 'admin', SENHA: 'Velha2026x', NOME: 'ADMINISTRADOR TESTE', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: 'dono@exemplo.test', CELULAR: '5562999990001' };
const TEC = { ID: 'u-tec', USUARIO: 'joao', SENHA: 'Joao!2026', NOME: 'JOAO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'Joao.Teste@Exemplo.test', CELULAR: '' };
const GES = { ID: 'u-ges', USUARIO: 'gil', SENHA: 'Gestor2026', NOME: 'GIL GESTOR TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'gil@exemplo.test', CELULAR: '62988880002' };
const AUVO = { ID: 'u-auvo', USUARIO: 'auvo.sync', SENHA: 'IntegraAuvo2026', NOME: 'INTEGRACAO AUVO', PERFIL: 'AUVO_SYNC', STATUS: 'ATIVO', EMAIL: '' };

test('entrada pelo e-mail: sem diferença de maiúsculas nem espaços; senha errada e e-mail desconhecido têm a mesma resposta', () => {
  const a = ambiente();
  a.add(Object.assign({}, TEC));
  for (const e of ['joao.teste@exemplo.test', '  JOAO.TESTE@EXEMPLO.TEST ', 'joao. teste@exemplo .test']) {
    const r = a.ctx.login(e, 'Joao!2026', CTX);
    assert.equal(r.success, true, e);
    assert.equal(r.user.usuario, 'joao', 'por dentro a sessão continua com o login interno (histórico e registros)');
    assert.equal(r.user.email, 'joao.teste@exemplo.test');
    assert.equal(a.ctx.exigirSessao(r.sessionId).usuario, 'joao');
  }
  const errada = a.ctx.login('joao.teste@exemplo.test', 'errada', CTX);
  const desconhecido = a.ctx.login('ninguem@exemplo.test', 'Joao!2026', CTX);
  assert.equal(errada.success, false); assert.equal(desconhecido.success, false);
  assert.equal(errada.message, 'E-mail ou senha inválidos.');
  assert.equal(desconhecido.message, errada.message, 'não revela se o e-mail existe');
  assert.match(a.ctx.login('', 'x', CTX).message, /Informe o e-mail e a senha/);
  assert.ok(a.registro().some((l) => l[2] === 'LOGIN_FALHA' && l[3] === 'ninguem@exemplo.test'));
  assert.ok(!JSON.stringify(a.registro()).includes('Joao!2026'), 'senha nunca no registro');
});

test('nome de usuário não entra mais (só a conta técnica do Auvo); com a senha certa a pessoa é orientada a usar o e-mail', () => {
  const a = ambiente();
  a.add(Object.assign({}, TEC)); a.add(Object.assign({}, AUVO));
  const certa = a.ctx.login('joao', 'Joao!2026', CTX);
  assert.equal(certa.success, false);
  assert.match(certa.message, /entrada agora é pelo e-mail/);
  assert.match(certa.message, /j•••e@exemplo\.test/, 'mostra o e-mail mascarado só para quem acertou a senha');
  const errada = a.ctx.login('joao', 'errada', CTX);
  assert.equal(errada.success, false); assert.match(errada.message, /^E-mail ou senha inválidos\./); assert.doesNotMatch(errada.message, /•••/);
  // conta técnica do Auvo: continua entrando pelo nome, sem código e sem troca obrigatória
  a.config('WHATSAPP');
  const auvo = a.ctx.login('auvo.sync', 'IntegraAuvo2026', CTX);
  assert.equal(auvo.success, true, auvo.message); assert.equal(auvo.etapa, undefined); assert.equal(auvo.user.perfil, 'AUVO_SYNC');
  assert.equal(a.ctx.login('auvo.sync', 'errada', CTX).success, false);
});

test('conta sem e-mail: a entrada é recusada com a mensagem do que fazer (nunca no limbo)', () => {
  const a = ambiente();
  a.add({ ID: 'u-cli', USUARIO: 'hospital', SENHA: 'Cliente2026', NOME: 'HOSPITAL TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', CLIENTE_ID: 'c1', EMAIL: '' });
  const r = a.ctx.login('hospital', 'Cliente2026', CTX);
  assert.equal(r.success, false); assert.equal(r.semEmail, true);
  assert.equal(r.message, 'Seu acesso precisa de um e-mail cadastrado. Peça à gestão da Metrolabs para cadastrar.');
  assert.equal(a.ctx.login('hospital', 'errada', CTX).semEmail, undefined, 'sem a senha certa não revela nada');
  assert.ok(a.registro().some((l) => l[2] === 'LOGIN_NEGADO' && /sem e-mail/.test(l[8])));
});

test('o mesmo e-mail em duas contas ativas: nenhuma entra; com a senha certa a mensagem diz o porquê; conta inativa não conta', () => {
  const a = ambiente();
  a.add(Object.assign({}, TEC));
  a.add({ ID: 'u-dup', USUARIO: 'joao2', SENHA: 'Outra2026x', NOME: 'JOAO DUPLICADO', PERFIL: 'COMERCIAL', STATUS: 'ATIVO', EMAIL: 'JOAO.TESTE@exemplo.test ' });
  const r1 = a.ctx.login('joao.teste@exemplo.test', 'Joao!2026', CTX);
  const r2 = a.ctx.login('joao.teste@exemplo.test', 'Outra2026x', CTX);
  for (const r of [r1, r2]) { assert.equal(r.success, false); assert.equal(r.emailRepetido, true); assert.match(r.message, /mais de uma conta ativa/); assert.match(r.message, /gestão/); }
  const errada = a.ctx.login('joao.teste@exemplo.test', 'errada', CTX);
  assert.equal(errada.emailRepetido, undefined); assert.equal(errada.message, 'E-mail ou senha inválidos.');
  // inativando uma delas, a outra volta a entrar
  a.ctx.SGO_DATA.update('CAD_USUARIOS', 'u-dup', { STATUS: 'INATIVO' });
  assert.equal(a.ctx.login('joao.teste@exemplo.test', 'Joao!2026', CTX).success, true);
  const ina = a.ctx.login('joao.teste@exemplo.test', 'Outra2026x', CTX);
  assert.equal(ina.success, false); assert.equal(ina.message, 'E-mail ou senha inválidos.', 'a senha da conta inativa não entra pela ativa');
  // relatório para a gestão e para o script do servidor
  a.ctx.SGO_DATA.update('CAD_USUARIOS', 'u-dup', { STATUS: 'ATIVO' });
  a.add({ ID: 'u-sem', USUARIO: 'semmail', SENHA: 'x', NOME: 'SEM EMAIL', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: '' });
  a.add(Object.assign({}, AUVO));
  const rel = JSON.parse(JSON.stringify(a.ctx.SegAcesso_relatorioEmails_()));
  assert.deepEqual(rel.semEmail.map((x) => x.id), ['u-sem'], 'a conta técnica do Auvo fica fora');
  assert.equal(rel.repetidos.length, 1); assert.equal(rel.repetidos[0].email, 'joao.teste@exemplo.test');
  assert.deepEqual(rel.repetidos[0].contas.map((x) => x.id).sort(), ['u-dup', 'u-tec']);
});

test('código no celular, troca obrigatória e aparelho confiado continuam funcionando pela entrada com e-mail', () => {
  const a = ambiente();
  a.add(Object.assign({}, GES, { PRECISA_TROCAR_SENHA: 'SIM' }));
  a.ctx.SegAcesso_garantirEstrutura_();
  a.ctx.SGO_DATA.update('CAD_USUARIOS', 'u-ges', { PRECISA_TROCAR_SENHA: 'SIM' });
  a.config('WHATSAPP');
  const r = a.ctx.login('GIL@exemplo.test', 'Gestor2026', CTX);
  assert.equal(r.etapa, 'CODIGO'); assert.match(r.destino, /WhatsApp terminado em 02/);
  const ok = a.ctx.verificarCodigoAcesso(r.desafio, a.codigoMeta(), true, CTX);
  assert.equal(ok.etapa, 'TROCAR_SENHA');
  const t = a.ctx.trocarSenhaAcesso(ok.sessionId, { nova: 'Cerrado verde 77', confirmacao: 'Cerrado verde 77' }, CTX);
  assert.equal(t.success, true, t.message);
  const aviso = a.emails.filter((e) => /foi alterada/.test(e.subject)).pop();
  assert.ok(aviso, 'aviso de senha alterada por e-mail'); assert.equal(aviso.to, 'gil@exemplo.test'); assert.match(aviso.body, /Se NÃO foi você, avise a gestão/);
  const segunda = a.ctx.login('gil@exemplo.test', 'Cerrado verde 77', Object.assign({}, CTX, { aparelho: ok.aparelhoToken }));
  assert.equal(segunda.success, true); assert.equal(segunda.etapa, undefined, 'aparelho confiado: sem código');
});

test('esqueci minha senha: resposta sempre igual (com conta, sem conta, repetido, limite); link só por e-mail, token guardado só como resumo', () => {
  const a = ambiente();
  a.add(Object.assign({}, TEC));
  const r1 = a.ctx.pedirRedefinicaoSenha(' Joao.Teste@exemplo.test ', CTX);
  const r2 = a.ctx.pedirRedefinicaoSenha('ninguem@exemplo.test', CTX);
  assert.equal(r1.success, true); assert.deepEqual(JSON.parse(JSON.stringify(r2)), JSON.parse(JSON.stringify(r1)));
  assert.match(r1.message, /Se o e-mail estiver cadastrado, enviamos um link/);
  assert.equal(a.emails.length, 1, 'só a conta que existe recebe');
  const e = a.emails[0];
  assert.equal(e.to, 'joao.teste@exemplo.test'); assert.equal(e.subject, 'Criar sua senha nova do SGO+');
  assert.match(e.body, /https:\/\/sgo\.metrolabs\.com\.br\/#redefinir=[0-9a-f]{64}/); assert.match(e.htmlBody, /Criar minha senha nova/); assert.match(e.body, /30 minutos/);
  const token = a.linkDe(e);
  const tudo = JSON.stringify([...a.props.entries()]) + JSON.stringify([...a.cache.entries()]) + JSON.stringify(a.registro());
  assert.ok(!tudo.includes(token), 'o token não fica guardado em lugar nenhum (só o resumo SHA-256)');
  assert.ok(a.props.has('SEGA_RED_' + crypto.createHash('sha256').update(token).digest('hex')));
  // formato inválido recebe outra mensagem (não revela nada)
  assert.match(a.ctx.pedirRedefinicaoSenha('joao', CTX).message, /formato nome@empresa/);
  // limite: 3 pedidos por e-mail por hora; o 4º tem a mesma resposta e não envia
  a.ctx.pedirRedefinicaoSenha('joao.teste@exemplo.test', CTX); a.ctx.pedirRedefinicaoSenha('joao.teste@exemplo.test', CTX);
  assert.equal(a.emails.length, 3);
  const quarto = a.ctx.pedirRedefinicaoSenha('joao.teste@exemplo.test', CTX);
  assert.equal(quarto.message, r1.message); assert.equal(a.emails.length, 3, 'o 4º pedido na hora não envia');
  assert.ok(a.registro().some((l) => l[2] === 'REDEFINICAO_IGNORADA' && /Limite de 3 pedidos/.test(l[8])));
  // um link novo cancela o anterior
  const ultimo = a.ultimoLink();
  assert.equal(a.ctx.abrirRedefinicaoSenha(token, CTX).etapa, 'INVALIDO');
  assert.equal(a.ctx.abrirRedefinicaoSenha(ultimo, CTX).etapa, 'NOVA_SENHA');
  // e-mail repetido em duas contas ativas: nada sai
  const b = ambiente();
  b.add(Object.assign({}, TEC)); b.add({ ID: 'u-dup', USUARIO: 'j2', SENHA: 'x', NOME: 'DUP', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'joao.teste@exemplo.test' });
  assert.equal(b.ctx.pedirRedefinicaoSenha('joao.teste@exemplo.test', CTX).message, r1.message);
  assert.equal(b.emails.length, 0);
});

test('link de nova senha: senha nova com as regras; uso único; derruba todas as sessões e aparelhos; avisa por e-mail; registra', () => {
  const a = ambiente();
  a.add(Object.assign({}, TEC));
  a.config('EMAIL');
  // duas sessões abertas e um aparelho confiado
  const l1 = a.ctx.login('joao.teste@exemplo.test', 'Joao!2026', CTX);
  const s1 = a.ctx.verificarCodigoAcesso(l1.desafio, /é (\d{6})\./.exec(a.emails.pop().body)[1], true, CTX);
  const l2 = a.ctx.login('joao.teste@exemplo.test', 'Joao!2026', CTX);
  const s2 = a.ctx.verificarCodigoAcesso(l2.desafio, /é (\d{6})\./.exec(a.emails.pop().body)[1], false, CTX);
  assert.equal(a.sessoes().length, 2);
  assert.ok([...a.props.keys()].some((k) => k.startsWith('SEGA_APR_')));
  a.ctx.pedirRedefinicaoSenha('joao.teste@exemplo.test', CTX);
  const token = a.ultimoLink();
  const ab = a.ctx.abrirRedefinicaoSenha(token, CTX);
  assert.equal(ab.success, true); assert.equal(ab.etapa, 'NOVA_SENHA', 'modo só e-mail: o link já é o e-mail, sem código à parte');
  assert.equal(ab.nome, 'Joao'); assert.match(ab.email, /•••/); assert.match(ab.validoAte, /^\d{2}:\d{2}$/);
  assert.match(a.ctx.concluirRedefinicaoSenha(token, { nova: '12345678a', confirmacao: '12345678a' }, CTX).message, /fácil de adivinhar/);
  assert.match(a.ctx.concluirRedefinicaoSenha(token, { nova: 'joaoteste2026', confirmacao: 'joaoteste2026' }, CTX).message, /fácil de adivinhar/, 'o e-mail também é óbvio');
  assert.match(a.ctx.concluirRedefinicaoSenha(token, { nova: 'Casa2026verde', confirmacao: 'Casa2026verdi' }, CTX).message, /confirmação/);
  const fim = a.ctx.concluirRedefinicaoSenha(token, { nova: 'Ipe amarelo 2026', confirmacao: 'Ipe amarelo 2026' }, CTX);
  assert.equal(fim.success, true, fim.message); assert.equal(fim.etapa, 'FIM'); assert.equal(fim.limparAparelho, true);
  assert.match(fim.message, /entre com o seu e-mail e a senha nova/);
  assert.equal(a.sessoes().length, 0, 'todas as sessões caem na hora');
  assert.ok(![...a.props.keys()].some((k) => k.startsWith('SEGA_APR_')), 'aparelhos confiados apagados');
  assert.equal(a.ctx.validarSessao(s1.sessionId).valid, false); assert.equal(a.ctx.validarSessao(s2.sessionId).valid, false);
  assert.equal(a.cad('u-tec').SEGURANCA_VERSAO, '1'); assert.equal(a.cad('u-tec').PRECISA_TROCAR_SENHA, '');
  const aviso = a.emails.filter((e) => /foi alterada/.test(e.subject)).pop();
  assert.ok(aviso); assert.match(aviso.body, /Esqueci minha senha/);
  // uso único
  const de_novo = a.ctx.abrirRedefinicaoSenha(token, CTX);
  assert.equal(de_novo.etapa, 'INVALIDO'); assert.match(de_novo.message, /já foi usado/); assert.match(de_novo.message, /Esqueci minha senha/);
  assert.equal(a.ctx.concluirRedefinicaoSenha(token, { nova: 'Outra senha 99', confirmacao: 'Outra senha 99' }, CTX).success, false);
  // entra com a nova, não com a antiga
  assert.equal(a.ctx.login('joao.teste@exemplo.test', 'Joao!2026', CTX).success, false);
  assert.equal(a.ctx.login('joao.teste@exemplo.test', 'Ipe amarelo 2026', CTX).success, true);
  const ev = a.registro().map((l) => l[2]);
  for (const e of ['REDEFINICAO_PEDIDA', 'REDEFINICAO_LINK_ENVIADO', 'REDEFINICAO_CONCLUIDA']) assert.ok(ev.includes(e), e);
  const txt = JSON.stringify(a.registro());
  assert.ok(!txt.includes(token) && !txt.includes('Ipe amarelo 2026'), 'nada de token nem senha no registro');
  // nenhuma resposta leva Date (google.script.run)
  assert.doesNotThrow(() => JSON.stringify(fim));
});

test('link vencido (30 minutos) e link inválido: a mensagem diz o que fazer', () => {
  const a = ambiente();
  a.add(Object.assign({}, TEC));
  a.ctx.pedirRedefinicaoSenha('joao.teste@exemplo.test', CTX);
  const token = a.ultimoLink();
  const chave = 'SEGA_RED_' + crypto.createHash('sha256').update(token).digest('hex');
  const rec = JSON.parse(a.props.get(chave)); rec.exp = Date.now() - 1000; a.props.set(chave, JSON.stringify(rec));
  const v = a.ctx.abrirRedefinicaoSenha(token, CTX);
  assert.equal(v.success, false); assert.equal(v.etapa, 'INVALIDO'); assert.equal(v.vencido, true);
  assert.match(v.message, /venceu/); assert.match(v.message, /Esqueci minha senha/);
  assert.equal(a.props.has(chave), false, 'link vencido é apagado');
  for (const t of ['', 'abc', 'g'.repeat(64), 'a'.repeat(64)]) assert.equal(a.ctx.abrirRedefinicaoSenha(t, CTX).etapa, 'INVALIDO', t);
  assert.ok(a.registro().some((l) => l[2] === 'REDEFINICAO_LINK_INVALIDO'));
  // senha trocada por outro caminho depois do pedido: o link deixa de valer
  a.ctx.pedirRedefinicaoSenha('joao.teste@exemplo.test', CTX);
  const t2 = a.ultimoLink();
  a.ctx.SGO_DATA.update('CAD_USUARIOS', 'u-tec', { SEGURANCA_VERSAO: '5' });
  assert.equal(a.ctx.abrirRedefinicaoSenha(t2, CTX).etapa, 'INVALIDO');
  // sem endereço público configurado, nada sai (e a resposta é a mesma)
  const b = ambiente({ url: '' });
  b.add(Object.assign({}, TEC));
  assert.equal(b.ctx.pedirRedefinicaoSenha('joao.teste@exemplo.test', CTX).success, true);
  assert.equal(b.emails.length, 0);
  assert.ok(b.registro().some((l) => l[2] === 'REDEFINICAO_IGNORADA' && /endereço público/.test(l[8])));
});

test('link com o código no WhatsApp (perfil exige e há celular): invadir só o e-mail não basta; 5 códigos errados cancelam o link', () => {
  const a = ambiente();
  a.add(Object.assign({}, GES));
  a.config('WHATSAPP');
  a.ctx.pedirRedefinicaoSenha('gil@exemplo.test', CTX);
  const token = a.ultimoLink();
  const ab = a.ctx.abrirRedefinicaoSenha(token, CTX);
  assert.equal(ab.etapa, 'CODIGO'); assert.equal(ab.codigoEnviado, false); assert.match(ab.destino, /WhatsApp terminado em 02/);
  assert.equal(a.fetches.length, 0, 'abrir o link não envia nada (leitor de e-mail que abre links não dispara o código)');
  // sem o código não troca
  const sem = a.ctx.concluirRedefinicaoSenha(token, { nova: 'Cerrado verde 77', confirmacao: 'Cerrado verde 77' }, CTX);
  assert.equal(sem.success, false); assert.match(sem.message, /Enviar o código/);
  const env = a.ctx.codigoRedefinicaoSenha(token, {}, CTX);
  assert.equal(env.success, true, env.message); assert.equal(env.codigoEnviado, true); assert.match(env.message, /WhatsApp terminado em 02/);
  assert.equal(a.fetches[0].corpo.template.name, 'sgo_codigo_acesso');
  const espera = a.ctx.codigoRedefinicaoSenha(token, {}, CTX);
  assert.equal(espera.success, false); assert.match(espera.message, /Aguarde/);
  const certo = a.codigoMeta();
  for (let i = 1; i <= 4; i++) {
    const r = a.ctx.concluirRedefinicaoSenha(token, { codigo: '000000', nova: 'Cerrado verde 77', confirmacao: 'Cerrado verde 77' }, CTX);
    assert.equal(r.success, false); assert.match(r.message, new RegExp('Restam ' + (5 - i)));
  }
  const cancelado = a.ctx.concluirRedefinicaoSenha(token, { codigo: '000000', nova: 'Cerrado verde 77', confirmacao: 'Cerrado verde 77' }, CTX);
  assert.equal(cancelado.etapa, 'INVALIDO'); assert.match(cancelado.message, /5 vezes/);
  assert.equal(a.ctx.concluirRedefinicaoSenha(token, { codigo: certo, nova: 'Cerrado verde 77', confirmacao: 'Cerrado verde 77' }, CTX).success, false, 'link cancelado não aceita nem o código certo');
  assert.equal(a.ctx.login('gil@exemplo.test', 'Gestor2026', CTX).etapa, 'CODIGO', 'a senha atual continua valendo');
  // novo link: código certo com senha fora das regras guarda o código conferido; depois só a senha
  a.ctx.pedirRedefinicaoSenha('gil@exemplo.test', CTX);
  const t2 = a.ultimoLink();
  a.ctx.codigoRedefinicaoSenha(t2, {}, CTX);
  const parcial = a.ctx.concluirRedefinicaoSenha(t2, { codigo: a.codigoMeta(), nova: 'curta1', confirmacao: 'curta1' }, CTX);
  assert.equal(parcial.success, false); assert.equal(parcial.etapa, 'NOVA_SENHA'); assert.match(parcial.message, /8 caracteres/);
  const fim = a.ctx.concluirRedefinicaoSenha(t2, { nova: 'Cerrado verde 77', confirmacao: 'Cerrado verde 77' }, CTX);
  assert.equal(fim.success, true, fim.message);
  // perfil que exige o código mas sem celular: o código iria para o mesmo e-mail do link; não pede
  const b = ambiente();
  b.add(Object.assign({}, TEC)); b.config('WHATSAPP');
  b.ctx.pedirRedefinicaoSenha('joao.teste@exemplo.test', CTX);
  assert.equal(b.ctx.abrirRedefinicaoSenha(b.ultimoLink(), CTX).etapa, 'NOVA_SENHA');
});

test('gestão envia o link em Usuários (com motivo); senha provisória só para quem não tem e-mail; cadastro com e-mail obrigatório e único', () => {
  const a = ambiente();
  a.add(Object.assign({}, ADMIN)); a.add(Object.assign({}, TEC)); a.add(Object.assign({}, GES));
  a.add({ ID: 'u-cli', USUARIO: 'hospital', SENHA: 'Cliente2026', NOME: 'HOSPITAL TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', CLIENTE_ID: 'c1', EMAIL: '' });
  const sGes = a.ctx.login('gil@exemplo.test', 'Gestor2026', CTX).sessionId;
  assert.match(a.ctx.usuariosEnviarLinkRedefinicao(sGes, 'u-tec', '').message, /motivo/);
  const r = a.ctx.usuariosEnviarLinkRedefinicao(sGes, 'u-tec', 'esqueceu a senha (pediu por telefone)');
  assert.equal(r.success, true, r.message); assert.match(r.message, /30 minutos/);
  const e = a.emails.pop();
  assert.equal(e.to, 'joao.teste@exemplo.test'); assert.match(e.body, /A gestão da Metrolabs \(Gil\) enviou este link/);
  assert.ok(a.registro().some((l) => l[2] === 'REDEFINICAO_LINK_GESTAO' && /pediu por telefone/.test(l[8]) && /GIL GESTOR TESTE/.test(l[9])));
  assert.equal(a.ctx.abrirRedefinicaoSenha(a.linkDe(e), CTX).daGestao, true);
  // conta de Administrador: só outro Administrador
  assert.match(a.ctx.usuariosEnviarLinkRedefinicao(sGes, 'u-admin', 'teste de permissão').message, /Administrador/);
  // sem e-mail: o link não tem para onde ir; a senha provisória vale (e só ela)
  assert.match(a.ctx.usuariosEnviarLinkRedefinicao(sGes, 'u-cli', 'esqueceu a senha').message, /não tem e-mail/);
  const comEmail = a.ctx.usuariosAtualizar(sGes, 'u-tec', { SENHA: 'Prov2026x' });
  assert.equal(comEmail.success, false); assert.match(comEmail.message, /Enviar link de redefinição/);
  // cadastro: e-mail obrigatório, único (maiúsculas e espaços não enganam) e login interno gerado
  assert.match(a.ctx.usuariosCriar(sGes, { NOME: 'Nova Pessoa', PERFIL: 'TECNICO', SENHA: '123456' }).message, /E-mail é obrigatório/);
  const dup = a.ctx.usuariosCriar(sGes, { NOME: 'Copia', EMAIL: ' JOAO.teste@Exemplo.test', PERFIL: 'TECNICO', SENHA: '123456' });
  assert.equal(dup.success, false); assert.match(dup.message, /já é da conta de JOAO TESTE/);
  const novo = a.ctx.usuariosCriar(sGes, { NOME: 'Ana Nova', EMAIL: ' Ana.Nova@Exemplo.test ', PERFIL: 'TECNICO', SENHA: '123456' });
  assert.equal(novo.success, true, novo.message); assert.match(novo.message, /ana\.nova@exemplo\.test/);
  const ana = a.ctx.SGO_DATA.getAll('CAD_USUARIOS').find((x) => x.NOME === 'ANA NOVA');
  assert.equal(ana.EMAIL, 'ana.nova@exemplo.test'); assert.equal(ana.USUARIO, 'ana.nova'); assert.equal(ana.PRECISA_TROCAR_SENHA, 'SIM');
  const ana2 = a.ctx.usuariosCriar(sGes, { NOME: 'Ana Outra', EMAIL: 'ana.nova@outra.test', PERFIL: 'TECNICO', SENHA: '123456' });
  assert.equal(ana2.success, true);
  assert.equal(a.ctx.SGO_DATA.getAll('CAD_USUARIOS').find((x) => x.NOME === 'ANA OUTRA').USUARIO, 'ana.nova2', 'login interno sem repetir');
  // edição: o login interno nunca muda, mesmo se vier no pedido
  assert.equal(a.ctx.usuariosAtualizar(sGes, 'u-tec', { USUARIO: 'outro', EMAIL: 'joao.novo@exemplo.test' }).success, true);
  assert.equal(a.cad('u-tec').USUARIO, 'joao'); assert.equal(a.cad('u-tec').EMAIL, 'joao.novo@exemplo.test');
  assert.match(a.ctx.usuariosAtualizar(sGes, 'u-tec', { EMAIL: 'GIL@exemplo.test' }).message, /já é da conta de GIL GESTOR TESTE/);
  // reativar não deixa duas contas ativas com o mesmo e-mail
  a.add({ ID: 'u-velho', USUARIO: 'gil.antigo', SENHA: 'x', NOME: 'GIL ANTIGO', PERFIL: 'TECNICO', STATUS: 'INATIVO', EMAIL: 'gil@exemplo.test' });
  assert.match(a.ctx.usuariosReativar(sGes, 'u-velho').message, /já é da conta ativa de GIL GESTOR TESTE/);
  // a tela recebe os destaques e não recebe o login interno
  const p = a.ctx.usuariosPainel(sGes);
  assert.equal(p.success, true, p.message);
  assert.ok(p.items.every((u) => !('USUARIO' in u) && !('SENHA' in u)));
  assert.equal(p.items.find((u) => u.ID === 'u-cli').SEM_EMAIL, true);
  assert.equal(p.items.find((u) => u.ID === 'u-admin').IGNORAR_AREA, true);
});

test('trocar minha senha: pede a senha atual e derruba as OUTRAS sessões da pessoa na hora (esta continua)', () => {
  const a = ambiente();
  a.add(Object.assign({}, TEC));
  const s1 = a.ctx.login('joao.teste@exemplo.test', 'Joao!2026', CTX).sessionId;
  const s2 = a.ctx.login('joao.teste@exemplo.test', 'Joao!2026', CTX).sessionId;
  const errada = a.ctx.trocarSenhaAcesso(s1, { senhaAtual: 'errada', nova: 'Casa2026verde', confirmacao: 'Casa2026verde' }, CTX);
  assert.equal(errada.success, false); assert.equal(errada.campo, 'atual');
  const ok = a.ctx.trocarSenhaAcesso(s1, { senhaAtual: 'Joao!2026', nova: 'Casa2026verde', confirmacao: 'Casa2026verde' }, CTX);
  assert.equal(ok.success, true, ok.message);
  assert.equal(a.ctx.validarSessao(s1).valid, true, 'a sessão de quem trocou segue');
  assert.equal(a.props.has('SGO_SESSION_' + s2), false, 'a outra sessão caiu na hora');
  assert.equal(a.ctx.validarSessao(s2).valid, false);
  assert.ok(a.emails.some((e) => /foi alterada/.test(e.subject) && /Trocar minha senha/.test(e.body)));
  assert.ok(a.registro().some((l) => l[2] === 'SESSOES_DERRUBADAS'));
});

test('recuperação pelo servidor aceita o e-mail (e o login interno); registro de segurança mostra o nome da pessoa', () => {
  const a = ambiente();
  a.add(Object.assign({}, ADMIN));
  const r = a.ctx.SegAcesso_recuperarAcesso_('DONO@exemplo.test', { senhaProvisoria: true });
  assert.equal(r.ok, true); assert.equal(a.ctx.login('dono@exemplo.test', r.senhaProvisoria, CTX).etapa, 'TROCAR_SENHA');
  assert.equal(a.ctx.SegAcesso_recuperarAcesso_('admin', {}).ok, true);
  assert.throws(() => a.ctx.SegAcesso_recuperarAcesso_('ninguem@exemplo.test', {}), /não encontrado/);
  a.ctx.login('dono@exemplo.test', 'errada', CTX);
  const reg = JSON.parse(JSON.stringify(a.ctx.SegAcesso_lerRegistro_({ dias: 1 })));
  assert.ok(reg.length && reg.every((l) => !('usuario' in l)));
  assert.ok(reg.some((l) => l.pessoa === 'ADMINISTRADOR TESTE'));
  assert.ok(a.ctx.SegAcesso_lerRegistro_({ dias: 1, usuario: 'administrador' }).length >= 1, 'filtra pelo nome');
  assert.equal(a.ctx.SGO_nomeDoLogin_('admin'), 'ADMINISTRADOR TESTE');
  assert.equal(a.ctx.SGO_nomeDoLogin_('nao.existe'), 'nao.existe');
});

test('as telas não mostram mais o login: Index pede E-mail, tem "Esqueci minha senha" e "Trocar senha"; Usuários sem campo de login', () => {
  const ler = (f) => fs.readFileSync(path.join(BASE, f), 'utf8');
  const index = ler('Index.html');
  assert.match(index, /<label for="usuario">E-mail<\/label>/);
  assert.doesNotMatch(index, /Digite seu usuário|>Usuário</);
  assert.match(index, /Esqueci minha senha/); assert.match(index, /abrir\('trocar_senha'\)/);
  const admin = ler('JS_Admin.html');
  assert.doesNotMatch(admin, /usr_usuario|Login \(nome de usuário\)|\["Login"/);
  assert.match(admin, /Enviar link de redefinição/); assert.match(admin, /Sem e-mail: não entra/);
  const seg = ler('JS_SegurancaAcesso.html');
  for (const fn of ['pedirRedefinicaoSenha', 'abrirRedefinicaoSenha', 'codigoRedefinicaoSenha', 'concluirRedefinicaoSenha']) assert.match(seg, new RegExp('\\.' + fn + '\\('), fn);
  assert.match(seg, /history\.replaceState/, 'o token sai do endereço na hora');
  assert.doesNotMatch(ler('JS_Representacao.html'), /data-r="Login"/);
  assert.doesNotMatch(ler('JS_ModoPersonalizado.html'), /Apagar a senha \(esqueceu\)/);
  assert.doesNotMatch(ler('JS_AutomacaoPredial.html'), /u\.login|p\.login/);
});
