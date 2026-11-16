// 11/11/2026 (Missão 01, achado D-04): segredos e sessões cifrados em repouso na tabela `propriedades`.
// Roda o código COMPILADO do servidor (dist/) contra um PostgreSQL embutido (PGlite, em memória), sem rede:
// atendente do legado (prop.ler/gravar/todas/apagar), propSegredas (selar/abrir/migração/conferência),
// serviços que liam segredos direto (ponte, portões, webhook do COMMAND) e o script de migração.
// Onde fica o servidor: pasta acima de DEST (rodar.sh) ou output/lote-20261111q/cand. Dependências: node_modules do
// sgo_servidor (junção numa pasta temporária). Sem elas, ou sem propSegredas.js no dist (base antiga), os testes são pulados.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

process.env.SGO_DB = 'memoria';   // abrirDb sem pasta: banco em memória
const RAIZ = path.resolve(__dirname, '..');
const CAND = process.env.DEST ? path.dirname(path.resolve(process.env.DEST)) : path.join(RAIZ, 'output', 'lote-20261111q', 'cand');
const MODULOS = path.resolve(RAIZ, '..', 'sgo_servidor', 'node_modules');
const temDist = fs.existsSync(path.join(CAND, 'dist', 'servicos', 'propSegredas.js'));
const pular = !temDist ? 'dist sem propSegredas.js (base anterior à correção D-04)' : !fs.existsSync(MODULOS) ? 'node_modules do sgo_servidor ausente' : false;

let TMP = '';
const carregados = {};
async function mod(rel) {
  if (!TMP) {
    TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'd04-'));
    fs.cpSync(path.join(CAND, 'dist'), path.join(TMP, 'dist'), { recursive: true });
    fs.copyFileSync(path.join(CAND, 'package.json'), path.join(TMP, 'package.json'));
    if (process.platform === 'win32') execFileSync('cmd', ['/c', 'mklink', '/J', path.join(TMP, 'node_modules'), MODULOS], { stdio: 'ignore' });
    else fs.symlinkSync(MODULOS, path.join(TMP, 'node_modules'), 'dir');
  }
  return (carregados[rel] ??= await import(pathToFileURL(path.join(TMP, 'dist', rel)).href));
}
test.after(() => { if (TMP) { try { if (process.platform === 'win32') fs.rmdirSync(path.join(TMP, 'node_modules')); else fs.unlinkSync(path.join(TMP, 'node_modules')); } catch { /* */ } fs.rmSync(TMP, { recursive: true, force: true }); } });

const SEGREDOS = { GEMINI_API_KEY: 'AIza-segredo-gemini-123', OMIE_APP_KEY: 'omie-key-456', OMIE_APP_SECRET: 'omie-secret-789', SMTP_SENHA: 'senha-smtp-#1', META_WA_TOKEN: 'EAAG-token-meta', ZAPI_TOKEN: 'zapi-tok', TUYA_ACCESS_SECRET: 'tuya-sec', RASTREADOR_TOKEN: 'rastr-tok', CAJU_CLIENT_SECRET: 'caju-sec' };
const sid = () => 'SESS_' + crypto.randomUUID() + '_' + Date.now();
const sessaoPayload = (id, userId = 'u1') => JSON.stringify({ sessionId: id, userId, usuario: 'teste', expiresAt: new Date(Date.now() + 3600e3).toISOString() });
const sha = (t) => crypto.createHash('sha256').update(t, 'utf8').digest('hex');

/** Banco em memória + cofre num arquivo temporário + registro capturado. */
async function ambiente(op = {}) {
  const { abrirDb } = await mod('db.js');
  const ps = await mod('servicos/propSegredas.js');
  const { criarAtendente, Travas, CacheMemoria } = await mod('servicos/atendente.js');
  const db = await abrirDb({ url: '', pasta: undefined });
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'd04cofre-'));
  const arquivo = op.arquivo ?? path.join(pasta, 'chave');
  const logs = [];
  const log = (n, t, o) => logs.push(`[${n}] ${o || ''} ${t}`);
  ps.configurarPropSegredas({ env: { SGO_COFRE_ARQUIVO: arquivo, ...(op.env || {}) }, pastaDados: pasta, log });
  const at = criarAtendente({ db, planilhas: {}, arquivos: {}, travas: new Travas(), cache: new CacheMemoria(), log }, 'teste');
  const atCmd = criarAtendente({ db, planilhas: {}, arquivos: {}, travas: new Travas(), cache: new CacheMemoria(), log }, 'teste-cmd', 'command');
  const linhas = async () => db.query('SELECT escopo, chave, valor FROM propriedades ORDER BY escopo, chave');
  return { db, ps, at, atCmd, logs, arquivo, pasta, linhas, fechar: () => db.fechar() };
}
const semVazamento = (texto, valores) => { for (const v of valores) assert.ok(!String(texto).includes(v), 'valor secreto apareceu: ' + v.slice(0, 4) + '…'); };

test('classificação: segredos por nome e padrão; IDs públicos, carimbos e configurações comuns ficam fora', { skip: pular }, async () => {
  const { ehChaveSegredo } = await mod('servicos/propSegredas.js');
  for (const k of [...Object.keys(SEGREDOS), 'AUVO_API_KEY', 'AUVO_API_TOKEN', 'AUVO_TOKEN_CACHE', 'ZAPI_INSTANCIA', 'ZAPI_CLIENT_TOKEN', 'SIMULADOR_ADMIN_SENHA', 'MODO_PERSONALIZADO_SENHA',
    'PONTE_COMMAND_SEGREDO', 'CMD_PONTE_SEGREDO', 'CMD_WEBHOOK_SEGREDO', 'WHATSAPP_VERIFY_TOKEN', 'META_APP_SECRET', 'PORTOES_LOCAL_SEGREDO', 'PONTO_SEGREDO', 'LIC_CIENCIA_SEGREDO', 'TUYA_ACCESS_ID', 'RASTREADOR_TOKEN_COMANDOS'])
    assert.equal(ehChaveSegredo(k), true, k);
  for (const k of ['DB_ID', 'META_WA_PHONE_ID', 'META_WA_WABA_ID', 'CHV_ALTERADO_SMTP_SENHA', 'CHV_TESTE_tuya', 'INTELBRAS_CONFIG_CIFRADA', 'WHATSAPP_PROVEDOR', 'WA_PILOTO', 'TUYA_LIGADO', 'RASTREADOR_URL', 'SEGA_APR_abc', 'ZAPI_ULTIMA_CONFERENCIA', 'SGO_SESSION_SESS_x', 'MODO_PERS_RESPONSAVEIS'])
    assert.equal(ehChaveSegredo(k), false, k);
});

test('grava e lê cifrado pelo legado (setProperty/getProperty/getProperties); não-segredo segue em claro', { skip: pular }, async () => {
  const a = await ambiente();
  try {
    await a.at('prop.gravar', { escopo: 'script', itens: { ...SEGREDOS, DB_ID: 'planilha-123' } });
    const ls = await a.linhas();
    for (const k of Object.keys(SEGREDOS)) {
      const l = ls.find((x) => x.chave === k);
      assert.ok(l.valor.startsWith('cofre:v1:'), k);
      semVazamento(l.valor, [SEGREDOS[k]]);
      assert.equal(await a.at('prop.ler', { escopo: 'script', chave: k }), SEGREDOS[k]);
    }
    assert.equal(ls.find((x) => x.chave === 'DB_ID').valor, 'planilha-123');
    const todas = await a.at('prop.todas', { escopo: 'script' });
    assert.deepEqual(todas, { ...SEGREDOS, DB_ID: 'planilha-123' });
    // dois gravações do mesmo valor não geram o mesmo texto cifrado (IV aleatório)
    await a.at('prop.gravar', { escopo: 'script', itens: { GEMINI_API_KEY: SEGREDOS.GEMINI_API_KEY } });
    const de2 = (await a.linhas()).find((x) => x.chave === 'GEMINI_API_KEY').valor;
    assert.notEqual(de2, ls.find((x) => x.chave === 'GEMINI_API_KEY').valor);
    // lerProp (serviços do servidor) também abre
    assert.equal(await a.ps.lerProp(a.db, 'script', 'OMIE_APP_SECRET'), SEGREDOS.OMIE_APP_SECRET);
    // apagar continua funcionando
    await a.at('prop.apagar', { escopo: 'script', chave: 'ZAPI_TOKEN' });
    assert.equal(await a.at('prop.ler', { escopo: 'script', chave: 'ZAPI_TOKEN' }), null);
    semVazamento(a.logs.join('\n'), Object.values(SEGREDOS));
  } finally { await a.fechar(); }
});

test('lê valor legado em texto claro (migração preguiçosa) e o COMMAND recebe o alias do SGO+ decifrado', { skip: pular }, async () => {
  const a = await ambiente();
  try {
    await a.db.query("INSERT INTO propriedades (escopo, chave, valor) VALUES ('script', 'SMTP_SENHA', 'claro-antigo'), ('script', 'AUVO_API_TOKEN', 'auvo-tok-claro')");
    assert.equal(await a.at('prop.ler', { escopo: 'script', chave: 'SMTP_SENHA' }), 'claro-antigo');
    assert.equal(await a.ps.lerProp(a.db, 'script', 'SMTP_SENHA'), 'claro-antigo');
    // SGO+ grava pela tela (cifrado); COMMAND, sem chave própria, lê pelo alias já decifrado
    await a.at('prop.gravar', { escopo: 'script', itens: { ZAPI_TOKEN: 'tok-sgo', ZAPI_INSTANCIA: 'inst-sgo', ZAPI_CLIENT_TOKEN: 'ct-sgo', GEMINI_API_KEY: 'gem-sgo' } });
    assert.equal(await a.atCmd('prop.ler', { escopo: 'script', chave: 'ZAPI_TOKEN' }), 'tok-sgo');
    assert.equal(await a.atCmd('prop.ler', { escopo: 'script', chave: 'GEMINI_API_KEY' }), 'gem-sgo');
    const todasCmd = await a.atCmd('prop.todas', { escopo: 'script' });
    assert.equal(todasCmd.ZAPI_INSTANCIA, 'inst-sgo');
    assert.equal(todasCmd.AUVO_API_TOKEN, 'auvo-tok-claro');
    // segredo próprio do COMMAND: gravado cifrado no escopo dele
    await a.atCmd('prop.gravar', { escopo: 'script', itens: { CMD_WEBHOOK_SEGREDO: 'wh-123' } });
    const l = (await a.linhas()).find((x) => x.escopo === 'script:command' && x.chave === 'CMD_WEBHOOK_SEGREDO');
    assert.ok(l.valor.startsWith('cofre:v1:'));
    assert.equal(await a.atCmd('prop.ler', { escopo: 'script', chave: 'CMD_WEBHOOK_SEGREDO' }), 'wh-123');
  } finally { await a.fechar(); }
});

test('valor cifrado copiado para outra chave não abre (AAD) e o registro só cita o nome', { skip: pular }, async () => {
  const a = await ambiente();
  try {
    await a.at('prop.gravar', { escopo: 'script', itens: { GEMINI_API_KEY: 'gem-xyz' } });
    const v = (await a.linhas()).find((x) => x.chave === 'GEMINI_API_KEY').valor;
    await a.db.query("INSERT INTO propriedades (escopo, chave, valor) VALUES ('script', 'OMIE_APP_KEY', $1)", [v]);
    assert.equal(await a.at('prop.ler', { escopo: 'script', chave: 'OMIE_APP_KEY' }), null);
    assert.equal((await a.at('prop.todas', { escopo: 'script' })).OMIE_APP_KEY, undefined);
    assert.match(a.logs.join('\n'), /OMIE_APP_KEY.*não abriu/);
    semVazamento(a.logs.join('\n'), ['gem-xyz', v]);
  } finally { await a.fechar(); }
});

test('migração única: cifra o que está em claro, passa sessões para hash, é idempotente e não altera valores', { skip: pular }, async () => {
  const a = await ambiente();
  try {
    const s1 = sid(), s2 = sid();
    const ins = "INSERT INTO propriedades (escopo, chave, valor) VALUES ($1, $2, $3)";
    for (const [k, v] of Object.entries(SEGREDOS)) await a.db.query(ins, ['script', k, v]);
    await a.db.query(ins, ['script:command', 'CMD_WEBHOOK_SEGREDO', 'wh-claro']);
    await a.db.query(ins, ['script', 'DB_ID', 'planilha-1']);
    await a.db.query(ins, ['script', 'SGO_SESSION_' + s1, sessaoPayload(s1)]);
    await a.db.query(ins, ['script', 'SGO_SESSION_' + s2, sessaoPayload(s2, 'u2')]);
    const antes = await a.ps.contarPropSegredasEmClaro(a.db);
    assert.equal(antes.segredosEmClaro, Object.keys(SEGREDOS).length + 1);
    assert.equal(antes.sessoesNomeEmClaro, 2);
    const m1 = await a.ps.migrarPropSegredas(a.db);
    assert.deepEqual({ ok: m1.cofreDisponivel, c: m1.segredosCifrados, s: m1.sessoesMigradas, j: m1.jaCifrados, f: m1.falhas }, { ok: true, c: Object.keys(SEGREDOS).length + 1, s: 2, j: 0, f: 0 });
    semVazamento(JSON.stringify(m1), [...Object.values(SEGREDOS), s1, s2]);
    const depois = await a.ps.contarPropSegredasEmClaro(a.db);
    assert.deepEqual({ a: depois.segredosEmClaro, b: depois.sessoesNomeEmClaro, c: depois.sessoesConteudoEmClaro }, { a: 0, b: 0, c: 0 });
    // nenhum id de sessão nem segredo em claro no banco inteiro (o que vai para o dump)
    const tudo = JSON.stringify(await a.linhas());
    semVazamento(tudo, [...Object.values(SEGREDOS), 'wh-claro', s1, s2]);
    assert.ok(tudo.includes('SGO_SESSION_H_' + sha(s1)));
    // valores continuam os mesmos para quem lê
    for (const [k, v] of Object.entries(SEGREDOS)) assert.equal(await a.at('prop.ler', { escopo: 'script', chave: k }), v);
    assert.equal(await a.atCmd('prop.ler', { escopo: 'script', chave: 'CMD_WEBHOOK_SEGREDO' }), 'wh-claro');
    assert.equal(JSON.parse(await a.at('prop.ler', { escopo: 'script', chave: 'SGO_SESSION_' + s2 })).userId, 'u2');
    assert.equal(await a.at('prop.ler', { escopo: 'script', chave: 'DB_ID' }), 'planilha-1');
    // segunda rodada: nada muda
    const fotografia = JSON.stringify(await a.linhas());
    const m2 = await a.ps.migrarPropSegredas(a.db);
    assert.deepEqual({ c: m2.segredosCifrados, s: m2.sessoesMigradas, f: m2.falhas }, { c: 0, s: 0, f: 0 });
    assert.equal(m2.jaCifrados, Object.keys(SEGREDOS).length + 1 + 2);
    assert.equal(JSON.stringify(await a.linhas()), fotografia);
  } finally { await a.fechar(); }
});

test('sessões: nome com hash, conteúdo cifrado; validação, enumeração (derrubar sessões), logout e sessão antiga', { skip: pular }, async () => {
  const a = await ambiente();
  try {
    const s1 = sid(), s2 = sid();
    await a.at('prop.gravar', { escopo: 'script', itens: { ['SGO_SESSION_' + s1]: sessaoPayload(s1, 'u1') } });
    let ls = await a.linhas();
    assert.equal(ls.length, 1);
    assert.equal(ls[0].chave, 'SGO_SESSION_H_' + sha(s1));
    assert.ok(ls[0].valor.startsWith('cofre:v1:'));
    semVazamento(JSON.stringify(ls), [s1]);
    assert.equal(JSON.parse(await a.at('prop.ler', { escopo: 'script', chave: 'SGO_SESSION_' + s1 })).userId, 'u1');
    assert.equal(await a.at('prop.ler', { escopo: 'script', chave: 'SGO_SESSION_' + sid() }), null, 'sessão inexistente');
    // regravar (renovação) mantém uma linha só
    await a.at('prop.gravar', { escopo: 'script', itens: { ['SGO_SESSION_' + s1]: sessaoPayload(s1, 'u1') } });
    assert.equal((await a.linhas()).length, 1);
    // sessão antiga em claro (antes da correção) continua válida e é migrada ao ser lida
    await a.db.query("INSERT INTO propriedades (escopo, chave, valor) VALUES ('script', $1, $2)", ['SGO_SESSION_' + s2, sessaoPayload(s2, 'u2')]);
    // getProperties (SegAcesso_derrubarSessoes_) enxerga as duas com o nome de sempre
    const todas = await a.at('prop.todas', { escopo: 'script' });
    assert.deepEqual(Object.keys(todas).sort(), ['SGO_SESSION_' + s1, 'SGO_SESSION_' + s2].sort());
    assert.equal(JSON.parse(await a.at('prop.ler', { escopo: 'script', chave: 'SGO_SESSION_' + s2 })).userId, 'u2');
    ls = await a.linhas();
    assert.deepEqual(ls.map((x) => x.chave).sort(), ['SGO_SESSION_H_' + sha(s1), 'SGO_SESSION_H_' + sha(s2)].sort());
    semVazamento(JSON.stringify(ls), [s1, s2]);
    // logout (deleteProperty) apaga
    await a.at('prop.apagar', { escopo: 'script', chave: 'SGO_SESSION_' + s1 });
    assert.equal(await a.at('prop.ler', { escopo: 'script', chave: 'SGO_SESSION_' + s1 }), null);
    // logout de sessão antiga ainda não lida (nome em claro) também apaga
    const s3 = sid();
    await a.db.query("INSERT INTO propriedades (escopo, chave, valor) VALUES ('script', $1, $2)", ['SGO_SESSION_' + s3, sessaoPayload(s3)]);
    await a.at('prop.apagar', { escopo: 'script', chave: 'SGO_SESSION_' + s3 });
    assert.equal((await a.linhas()).some((x) => x.chave.endsWith(s3)), false);
    // conteúdo de outra sessão colado sob um hash não é aceito (AAD amarra ao nome) e some da enumeração
    const v2 = (await a.linhas()).find((x) => x.chave === 'SGO_SESSION_H_' + sha(s2)).valor;
    const falsa = sid();
    await a.db.query("INSERT INTO propriedades (escopo, chave, valor) VALUES ('script', $1, $2)", ['SGO_SESSION_H_' + sha(falsa), v2]);
    assert.equal(await a.at('prop.ler', { escopo: 'script', chave: 'SGO_SESSION_' + falsa }), null);
    assert.deepEqual(Object.keys(await a.at('prop.todas', { escopo: 'script' })), ['SGO_SESSION_' + s2]);
    semVazamento(a.logs.join('\n'), [s1, s2, s3, falsa]);
  } finally { await a.fechar(); }
});

test('chave do cofre ausente com dados cifrados: não gera chave nova, não quebra, grava em claro COM registro; migração recusa', { skip: pular }, async () => {
  const a = await ambiente();
  try {
    await a.at('prop.gravar', { escopo: 'script', itens: { GEMINI_API_KEY: 'gem-1', DB_ID: 'p1' } });
    // a chave some (montagem /cofre perdida)
    fs.rmSync(a.arquivo);
    a.ps.configurarPropSegredas({ env: { SGO_COFRE_ARQUIVO: a.arquivo }, pastaDados: a.pasta });
    const logs = [];
    a.ps.configurarPropSegredas({ log: (n, t) => logs.push(`[${n}] ${t}`) });
    assert.equal(await a.at('prop.ler', { escopo: 'script', chave: 'GEMINI_API_KEY' }), null, 'cifrado sem chave: vazio, nunca o texto cifrado');
    assert.equal(fs.existsSync(a.arquivo), false, 'não gerou chave nova em silêncio');
    assert.equal(await a.at('prop.ler', { escopo: 'script', chave: 'DB_ID' }), 'p1', 'o resto continua funcionando');
    await a.at('prop.gravar', { escopo: 'script', itens: { SMTP_SENHA: 'smtp-sem-cofre' } });
    assert.equal(await a.at('prop.ler', { escopo: 'script', chave: 'SMTP_SENHA' }), 'smtp-sem-cofre');
    const txt = logs.join('\n');
    assert.match(txt, /INDISPONÍVEL/);
    assert.match(txt, /SMTP_SENHA gravada SEM cifra/);
    semVazamento(txt, ['smtp-sem-cofre', 'gem-1']);
    const m = await a.ps.migrarPropSegredas(a.db);
    assert.equal(m.cofreDisponivel, false);
    assert.equal((await a.ps.contarPropSegredasEmClaro(a.db)).segredosEmClaro, 1);
  } finally { await a.fechar(); }
});

test('SGO_COFRE_CHAVE inválida: indisponível e registrado; banco sem cifrados e sem arquivo: chave criada (como o cofre do e-mail)', { skip: pular }, async () => {
  const a = await ambiente({ env: { SGO_COFRE_CHAVE: 'curta-demais' } });
  try {
    await a.at('prop.gravar', { escopo: 'script', itens: { OMIE_APP_KEY: 'k1' } });
    assert.equal((await a.linhas())[0].valor, 'k1');
    assert.match(a.logs.join('\n'), /INDISPONÍVEL.*32 bytes/);
    semVazamento(a.logs.join('\n'), ['k1']);
  } finally { await a.fechar(); }
  const b = await ambiente();
  try {
    assert.equal(fs.existsSync(b.arquivo), false);
    await b.at('prop.gravar', { escopo: 'script', itens: { OMIE_APP_KEY: 'k2' } });
    assert.equal(fs.existsSync(b.arquivo), true);
    assert.ok((await b.linhas())[0].valor.startsWith('cofre:v1:'));
    // e com a chave de volta, a migração cifra o que ficou em claro
    await b.db.query("INSERT INTO propriedades (escopo, chave, valor) VALUES ('script', 'SMTP_SENHA', 'ficou-em-claro')");
    const m = await b.ps.migrarPropSegredas(b.db);
    assert.equal(m.segredosCifrados, 1);
    assert.deepEqual(m.chaves, ['script/SMTP_SENHA']);
    assert.equal(await b.ps.lerProp(b.db, 'script', 'SMTP_SENHA'), 'ficou-em-claro');
  } finally { await b.fechar(); }
});

test('serviços do servidor: segredo da ponte, portões e webhook do COMMAND gravam cifrado e comparam decifrado', { skip: pular }, async () => {
  const a = await ambiente();
  try {
    const { garantirSegredoPonte } = await mod('servicos/segredoPonte.js');
    const { garantirSegredoPortoes } = await mod('servicos/portoesLocais.js');
    const { servicoWhatsappCota } = await mod('servicos/whatsappCota.js');
    assert.equal(await garantirSegredoPonte(a.db, 'command'), 'gerado');
    assert.equal(await garantirSegredoPonte(a.db, 'command'), 'ja_existia', 'cifras diferentes, mesmo segredo');
    const ponte = (await a.linhas()).filter((x) => /PONTE/.test(x.chave));
    assert.equal(ponte.length, 2);
    for (const l of ponte) assert.ok(l.valor.startsWith('cofre:v1:'));
    assert.equal(await a.ps.lerProp(a.db, 'script', 'PONTE_COMMAND_SEGREDO'), await a.ps.lerProp(a.db, 'script:command', 'CMD_PONTE_SEGREDO'));
    const p1 = await garantirSegredoPortoes(a.db);
    assert.equal(p1.novo, true);
    assert.deepEqual(await garantirSegredoPortoes(a.db), { valor: p1.valor, novo: false });
    semVazamento(JSON.stringify(await a.linhas()), [p1.valor]);
    const w = await servicoWhatsappCota(a.db, { urlWebhookCommand: 'https://x/wh' }).webhookCommand();
    assert.equal(w.gerado, true);
    const seg = new URL(w.url).searchParams.get('wh');
    assert.equal((await servicoWhatsappCota(a.db, { urlWebhookCommand: 'https://x/wh' }).webhookCommand()).url, w.url);
    semVazamento(JSON.stringify(await a.linhas()), [seg]);
  } finally { await a.fechar(); }
});

test('script de migração (--conferir / --aplicar): exige banco explícito, só mostra nomes e contagens', { skip: pular }, async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'd04cli-'));
  const banco = path.join(pasta, 'pglite');
  const env = { ...process.env, SGO_COFRE_ARQUIVO: path.join(pasta, 'chave'), DATABASE_URL: '' };
  const cli = path.join(TMP || (await mod('servicos/propSegredas.js'), TMP), 'dist', 'migracao', 'cifrarPropriedades.js');
  const rodar = (args) => { try { return { codigo: 0, saida: execFileSync(process.execPath, [cli, ...args], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; } catch (e) { return { codigo: e.status, saida: String(e.stdout) + String(e.stderr) }; } };
  assert.equal(rodar(['--conferir']).codigo, 2, 'sem DATABASE_URL e sem --pglite: recusa');
  // prepara um banco com segredo e sessão em claro
  const { abrirDb } = await mod('db.js');
  let db = await abrirDb({ pasta: banco });
  const s = sid();
  await db.query("INSERT INTO propriedades (escopo, chave, valor) VALUES ('script', 'OMIE_APP_SECRET', 'omie-cli'), ('script', $1, $2)", ['SGO_SESSION_' + s, sessaoPayload(s)]);
  await db.fechar();
  const c = rodar(['--conferir', '--pglite', banco]);
  assert.equal(c.codigo, 0);
  assert.equal(JSON.parse(c.saida).antes.segredosEmClaro, 1);
  const r = rodar(['--aplicar', '--pglite', banco]);
  assert.equal(r.codigo, 0, r.saida);
  const j = JSON.parse(r.saida);
  assert.deepEqual([j.depois.segredosEmClaro, j.depois.sessoesNomeEmClaro, j.migracao.sessoesMigradas], [0, 0, 1]);
  semVazamento(r.saida, ['omie-cli', s]);
  assert.equal(rodar(['--aplicar', '--pglite', banco]).codigo, 0, 'segunda rodada também termina bem');
  db = await abrirDb({ pasta: banco });
  try { semVazamento(JSON.stringify(await db.query('SELECT chave, valor FROM propriedades')), ['omie-cli', s]); } finally { await db.fechar(); }
  fs.rmSync(pasta, { recursive: true, force: true });
});

test('reversão (--reverter, só para voltar de versão): decifra segredos e devolve sessões ao nome antigo; idempotente', { skip: pular }, async () => {
  const a = await ambiente();
  try {
    const s1 = sid();
    await a.at('prop.gravar', { escopo: 'script', itens: { OMIE_APP_KEY: 'omie-rev', ['SGO_SESSION_' + s1]: sessaoPayload(s1), DB_ID: 'p1' } });
    await a.db.query("INSERT INTO propriedades (escopo, chave, valor) VALUES ('script', 'INTELBRAS_CONFIG_CIFRADA', 'v1:aaa:bbb:ccc')");
    const r = await a.ps.reverterPropSegredas(a.db);
    assert.deepEqual(r, { cofreDisponivel: true, segredosDecifrados: 1, sessoesRevertidas: 1, falhas: 0 });
    const ls = await a.linhas();
    // exatamente o formato que a versão anterior lê direto do banco
    assert.equal(ls.find((x) => x.chave === 'OMIE_APP_KEY').valor, 'omie-rev');
    assert.equal(JSON.parse(ls.find((x) => x.chave === 'SGO_SESSION_' + s1).valor).sessionId, s1);
    assert.equal(ls.find((x) => x.chave === 'INTELBRAS_CONFIG_CIFRADA').valor, 'v1:aaa:bbb:ccc', 'cifra própria da Intelbras intocada');
    assert.equal(ls.length, 4);
    assert.deepEqual(await a.ps.reverterPropSegredas(a.db), { cofreDisponivel: true, segredosDecifrados: 0, sessoesRevertidas: 0, falhas: 0 });
    // e cifrar de novo volta ao estado protegido
    const m = await a.ps.migrarPropSegredas(a.db);
    assert.deepEqual([m.segredosCifrados, m.sessoesMigradas, m.falhas], [1, 1, 0]);
    assert.equal(JSON.parse(await a.at('prop.ler', { escopo: 'script', chave: 'SGO_SESSION_' + s1 })).sessionId, s1);
  } finally { await a.fechar(); }
});
