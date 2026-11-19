// Acervo do Auvo — etapa 0 da Assistência técnica (21/10/2026).
// 18/11/2026: Auvo descontinuado pelo dono (SGO_Auvo_Retirada.js). A cópia do acervo terminou de vez: contar, copiar, pausar,
// continuar, repetir falhas e conferir dependiam da API do Auvo e saíram. Os testes da cópia (contagem, lotes, idempotência,
// falhas, 403, conferência, paginação, pausa, trava, download pendurado, arquivo grande, 25 mil linhas e retomada) foram
// retirados com essa justificativa; a versão anterior está em output/auvo-retirada-20261118/tests-antes/auvo-acervo.test.cjs.
// Ficam aqui: a recusa de toda ação que falaria com o Auvo, o gatilho antigo que só se remove, o acesso (só Administrador e
// Diretoria) e a consulta do que foi copiado (situação, falhas e tarefa com os arquivos), que continua funcionando.
// Código real do SGO+ (SGO_Auvo_Config.js, SGO_Auvo_Main.js, SGO_AuvoAcervo.js) num contexto isolado, com
// planilha, Drive e API do Auvo simulados (respostas inventadas, nada sai daqui). Só dados de teste.
// Cobre: paginação e retomada em lotes, contagem, cópia com idempotência por sha256, versão nova sem
// sobrescrever, falha de download registrada e repetível, conferência, pausa, acesso só da gestão e
// nenhuma escrita no Auvo nem nas abas atuais do SGO+.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { formatDate } = require('./_simulacros_gas.cjs');
const base = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

const IMG = 'https://imagens.exemplo.test/fotos/';

/* ---------------- tarefas simuladas ---------------- */
function tarefaFalsa(id, data, extra) {
  return Object.assign({
    taskID: id, customerId: 9000 + (id % 7), customerDescription: 'CLINICA TESTE ' + (id % 7), idUserTo: 501, userToName: 'TECNICO TESTE',
    taskType: id % 3, taskTypeDescription: ['Manutenção preventiva', 'Manutenção corretiva', 'Calibração'][id % 3], taskDate: data,
    finished: id % 2 === 0, taskUrl: 'https://app.auvo.com.br/tarefa/' + id, questionnaires: [], attachments: []
  }, extra || {});
}

function questionario(id, fotos, assinatura) {
  const answers = [{ questionId: 1, questionDescription: 'Relato do serviço', reply: 'Troca de peça e teste funcional.' }];
  fotos.forEach((u) => answers.push({ questionId: 2, questionDescription: 'Foto do equipamento', reply: u }));
  if (assinatura) answers.push({ questionId: 3, questionDescription: 'Assinatura do responsável', reply: assinatura });
  return { questionnaireId: id, questionnaireDescription: 'Checklist ' + id, answers };
}

function cenarioPadrao() {
  const tarefas = [];
  // jan/2024: 3 tarefas; fev/2024: 230 (3 páginas); mar/2024: nenhuma; abr/2024: 2
  tarefas.push(tarefaFalsa(1001, '2024-01-05T08:00:00', { questionnaires: [questionario(11, [IMG + '1001a.jpg', IMG + '1001b.jpg'], IMG + '1001s.png')], signatureUrl: IMG + '1001t.png' }));
  tarefas.push(tarefaFalsa(1002, '2024-01-31T17:00:00', { questionnaires: [questionario(11, [IMG + 'falha404.jpg'])] }));
  tarefas.push(tarefaFalsa(1003, '2024-01-10T09:00:00', { attachments: [{ url: IMG + 'manual.pdf', name: 'manual.pdf' }], extraLink: 'https://site.exemplo.test/pagina' }));
  for (let i = 0; i < 230; i++) {
    const id = 2000 + i;
    const dia = String(1 + (i % 28)).padStart(2, '0');
    const fotos = i % 10 === 0 ? [IMG + id + '.jpg'] : [];
    tarefas.push(tarefaFalsa(id, '2024-02-' + dia + 'T10:00:00', { questionnaires: fotos.length ? [questionario(12, fotos)] : [] }));
  }
  // tarefa grande: JSON acima de 40.000 caracteres (vários trechos na aba)
  tarefas[5].report = 'x'.repeat(95000);
  tarefas.push(tarefaFalsa(4001, '2024-04-02T08:00:00', { questionnaires: [questionario(13, [IMG + 'instavel.jpg', IMG + 'pagina.jpg'])] }));
  tarefas.push(tarefaFalsa(4002, '2024-04-03T08:00:00', { signatureUrl: 'https://arquivos.auvo.com.br/assinaturas/4002.png' }));
  return tarefas;
}

/* ---------------- ambiente ---------------- */
function ambiente(op) {
  op = op || {};
  const relogio = { agora: Date.parse('2024-05-10T12:00:00Z') };
  class DataFalsa extends Date {
    constructor(...a) { if (a.length === 0) super(relogio.agora); else super(...a); }
    static now() { return relogio.agora; }
  }
  const avancar = (ms) => { relogio.agora += ms; };

  // planilha
  const abas = {};
  const criarAba = (nome) => {
    const linhas = [];
    const sh = {
      _linhas: linhas, getName: () => nome,
      getLastRow: () => linhas.length, getLastColumn: () => linhas.reduce((m, l) => Math.max(m, l.length), 0), getMaxRows: () => Math.max(1000, linhas.length),
      setFrozenRows() {},
      getRange(r, c, nr, nc) {
        nr = nr || 1; nc = nc || 1;
        return {
          getValues: () => { const out = []; for (let i = 0; i < nr; i++) { const l = linhas[r - 1 + i] || []; const row = []; for (let j = 0; j < nc; j++) row.push(l[c - 1 + j] === undefined ? '' : l[c - 1 + j]); out.push(row); } return out; },
          setValues: (vals) => { assert.equal(vals.length, nr, 'setValues com número de linhas errado'); vals.forEach((row, i) => { assert.equal(row.length, nc); const l = linhas[r - 1 + i] || (linhas[r - 1 + i] = []); row.forEach((v, j) => { l[c - 1 + j] = v; }); }); },
          setValue: (v) => { const l = linhas[r - 1] || (linhas[r - 1] = []); l[c - 1] = v; return this; },
          setNumberFormat() { return this; }
        };
      }
    };
    abas[nome] = sh; return sh;
  };
  const ss = { getSheetByName: (n) => abas[n] || null, insertSheet: (n) => criarAba(n) };
  // aba atual do SGO+ que não pode ser tocada
  const atual = criarAba('AUVO_TAREFAS');
  atual._linhas.push(['ID', 'AUVO_TASK_ID', 'RELATO_SERVICO'], ['t1', '1001', 'Relato que já estava no SGO+']);
  const fotoAtual = JSON.stringify(atual._linhas);

  // Drive
  let seq = 0;
  const pastas = {}, arquivos = {};
  const estat = { criados: 0 };
  const iter = (lista) => { let i = 0; return { hasNext: () => i < lista.length, next: () => lista[i++] }; };
  const blob = (bytes, tipo, nome) => {
    let b = Buffer.from(bytes), t = tipo || null, n = nome || null;
    return { _b: () => b, getBytes: () => Array.from(b, (x) => (x > 127 ? x - 256 : x)), getContentType: () => t, setContentType: (x) => { t = x; }, getName: () => n,
      setName(x) { n = x; return this; }, getDataAsString: () => b.toString('utf8') };
  };
  const fazerArquivo = (m) => ({
    getId: () => m.id, getName: () => m.nome, getUrl: () => 'https://sgo.teste/arquivos/' + m.id, isTrashed: () => false,
    getBlob: () => blob(m.bytes, m.tipo, m.nome), getSize: () => m.bytes.length,
    setSharing: (a, p) => { m.compartilhamento = a + ':' + p; }
  });
  const fazerPasta = (m) => ({
    getId: () => m.id, getName: () => m.nome,
    getFoldersByName: (n) => iter(Object.values(pastas).filter((p) => p.pai === m.id && p.nome === n).map(fazerPasta)),
    createFolder: (n) => { const p = { id: 'P' + (++seq), nome: n, pai: m.id }; pastas[p.id] = p; return fazerPasta(p); },
    getFilesByName: (n) => iter(Object.values(arquivos).filter((a) => a.pasta === m.id && a.nome === n).map(fazerArquivo)),
    createFile: (b) => { const a = { id: 'A' + (++seq), nome: b.getName(), tipo: b.getContentType(), bytes: b._b(), pasta: m.id, compartilhamento: null }; arquivos[a.id] = a; estat.criados++; return fazerArquivo(a); }
  });
  pastas.raiz = { id: 'raiz', nome: 'raiz', pai: null };
  const DriveApp = {
    getRootFolder: () => fazerPasta(pastas.raiz),
    getFolderById: (id) => { if (!pastas[id]) throw new Error('pasta não encontrada'); return fazerPasta(pastas[id]); },
    getFileById: (id) => { if (!arquivos[id]) throw new Error('arquivo não encontrado'); return fazerArquivo(arquivos[id]); },
    Access: { PRIVATE: 'PRIVATE', ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' }, Permission: { NONE: 'NONE', VIEW: 'VIEW' }
  };
  const caminhoDe = (pastaId) => { const p = []; let x = pastas[pastaId]; while (x && x.id !== 'raiz') { p.unshift(x.nome); x = pastas[x.pai]; } return p.join('/'); };

  // Auvo simulado
  const auvo = { tarefas: op.tarefas || cenarioPadrao(), falharTarefas: 0, imagens: {}, contagemImg: {} };
  const pedidos = [];
  const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
  const resposta = (cod, corpo, cab) => {
    const buf = Buffer.isBuffer(corpo) ? corpo : Buffer.from(typeof corpo === 'string' ? corpo : JSON.stringify(corpo));
    const headers = cab || { 'Content-Type': 'application/json' };
    return { getResponseCode: () => cod, getContentText: () => buf.toString('utf8'), getContent: () => Array.from(buf),
      getBlob: () => blob(buf, (headers['Content-Type'] || '').split(';')[0] || null, null), getAllHeaders: () => headers, getHeaders: () => headers };
  };
  const bytesImagem = (url) => Buffer.from('IMAGEM-FALSA:' + url + ':' + 'z'.repeat(500));
  function servidor(url, p) {
    p = p || {};
    const metodo = String(p.method || 'get').toLowerCase();
    pedidos.push({ url, metodo, auth: !!(p.headers && p.headers.Authorization) });
    avancar(1000);
    if (url === 'https://api.auvo.com.br/v2/login') return resposta(200, { result: { accessToken: 'tok-teste' } });
    if (url.startsWith('https://api.auvo.com.br/v2/tasks?')) {
      if (auvo.falharTarefas > 0) { auvo.falharTarefas--; return resposta(503, { message: 'indisponível' }); }
      if (auvo.limite429) { auvo.limite429 = false; return resposta(429, { message: 'limite' }, { 'Content-Type': 'application/json', 'Retry-After': '7' }); }
      const q = new URL(url).searchParams;
      const f = JSON.parse(q.get('paramFilter'));
      const pagina = Number(q.get('page')), tam = Number(q.get('pageSize'));
      const lista = auvo.tarefas.filter((t) => t.taskDate.slice(0, 10) >= f.startDate && t.taskDate.slice(0, 10) <= f.endDate);
      if (!lista.length && auvo.vazio404) return resposta(404, { message: 'nada' });
      return resposta(200, { result: { entityList: lista.slice((pagina - 1) * tam, pagina * tam), pagedSearchReturnData: { totalItems: lista.length } } });
    }
    const um = /^https:\/\/api\.auvo\.com\.br\/v2\/tasks\/(\d+)$/.exec(url);
    if (um) { const t = auvo.tarefas.find((x) => String(x.taskID) === um[1]); return t ? resposta(200, { result: t }) : resposta(404, {}); }
    const lista = /^https:\/\/api\.auvo\.com\.br\/v2\/(\w+)\?page=(\d+)&pageSize=(\d+)$/.exec(url);
    if (lista) {
      if (lista[1] === 'teams') return resposta(404, { message: 'não existe' });
      const itens = Array.from({ length: lista[1] === 'customers' ? 130 : 3 }, (_, i) => ({ id: i + 1, description: lista[1] + ' teste ' + (i + 1) }));
      const pg = Number(lista[2]), tam = Number(lista[3]);
      return resposta(200, { result: { entityList: itens.slice((pg - 1) * tam, pg * tam), pagedSearchReturnData: { totalItems: itens.length } } });
    }
    if (url.startsWith(IMG) || url.startsWith('https://arquivos.auvo.com.br/')) {
      auvo.contagemImg[url] = (auvo.contagemImg[url] || 0) + (metodo === 'get' ? 1 : 0);
      const nome = url.split('/').pop();
      if (nome === 'falha404.jpg' && !auvo.voltou404) return resposta(404, 'não encontrado', { 'Content-Type': 'text/plain' });
      if (nome === 'instavel.jpg' && auvo.contagemImg[url] < 2 && metodo === 'get') return resposta(500, 'erro', { 'Content-Type': 'text/plain' });
      if (auvo.pendurar && auvo.pendurar.has(nome) && metodo === 'get') { auvo.penduradas = (auvo.penduradas || 0) + 1; for (;;) { /* download que nunca responde */ } }
      if (nome === 'pagina.jpg') return resposta(200, '<html>entre</html>', { 'Content-Type': 'text/html; charset=utf-8' });
      const b = auvo.imagens[url] || bytesImagem(url);
      const tipo = nome.endsWith('.pdf') ? 'application/pdf' : nome.endsWith('.png') ? 'image/png' : 'image/jpeg';
      if (metodo === 'head') return resposta(200, Buffer.alloc(0), { 'Content-Type': tipo, 'Content-Length': String((auvo.tamanhos && auvo.tamanhos[nome]) || b.length) });
      return resposta(200, b, { 'Content-Type': tipo });
    }
    return resposta(404, 'inesperado no teste: ' + url, { 'Content-Type': 'text/plain' });
  }
  const grupos = [];
  const UrlFetchApp = {
    fetch: (url, p) => servidor(url, p),
    fetchAll: (lista) => { grupos.push(lista.map((r) => ({ url: r.url, metodo: String(r.method || 'get') }))); return lista.map((r) => servidor(r.url, r)); }
  };

  const props = Object.assign({ AUVO_API_KEY: 'chave-teste', AUVO_API_TOKEN: 'token-teste' }, op.props || {});
  const cache = {};
  const gatilhos = [];
  const sonos = [];
  const sessoes = {
    s_adm: { userId: 'u1', usuario: 'admin', nome: 'ADMIN TESTE', perfil: 'ADMIN' },
    s_dir: { userId: 'u2', usuario: 'dora', nome: 'DORA DIRETORA TESTE', perfil: 'DIRETORIA' },
    s_ges: { userId: 'u3', usuario: 'gil', nome: 'GIL GESTOR TESTE', perfil: 'GESTOR' }
  };
  const logs = [];
  const ctx = vm.createContext({
    console, Date: DataFalsa, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, isNaN, parseInt, encodeURIComponent, decodeURIComponent, Buffer,
    Utilities: {
      formatDate, sleep: (ms) => { sonos.push(ms); avancar(ms); }, getUuid: () => crypto.randomUUID(),
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'UTF-8' },
      computeDigest: (alg, v) => Array.from(crypto.createHash(alg).update(typeof v === 'string' ? Buffer.from(v, 'utf8') : Buffer.from(Array.from(v, (x) => x & 255))).digest(), (x) => (x > 127 ? x - 256 : x)),
      newBlob: (d, t, n) => blob(typeof d === 'string' ? Buffer.from(d, 'utf8') : Buffer.from(Array.from(d, (x) => x & 255)), t, n)
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    ScriptApp: {
      getProjectTriggers: () => gatilhos.map((g) => ({ getHandlerFunction: () => g.fn, _g: g })),
      deleteTrigger: (t) => { const i = gatilhos.indexOf(t._g); if (i >= 0) gatilhos.splice(i, 1); },
      newTrigger: (fn) => { const g = { fn }; const b = { timeBased: () => b, after: (ms) => { g.ms = ms; return b; }, create: () => { gatilhos.push(g); return g; } }; return b; }
    },
    UrlFetchApp, DriveApp,
    SGO_DATA: { getDB: () => ss, log: (a, u, d) => logs.push([a, u, d]) },
    exigirSessao: (id) => { if (!sessoes[id]) throw new Error('Sessão inválida ou expirada.'); return sessoes[id]; }
  });
  ['SGO_Auvo_Config.js', 'SGO_Auvo_Retirada.js', 'SGO_Auvo_Main.js', 'SGO_AuvoAcervo.js', 'SGO_AuvoAcervo_Tela.js'].forEach((f) =>
    vm.runInContext(fs.readFileSync(path.join(base, f), 'utf8'), ctx, { filename: f }));

  const api = (sessao, fn, payload) => ctx.AuvoAcervo_apiDispatch({ sessionId: sessao, fn, payload });
  // roda lotes como o agendador faria (30 s entre um e outro), com orçamento curto para forçar a retomada
  const rodarAteParar = (orcamentoMs, max) => {
    let lotes = 0;
    for (; lotes < (max || 2000); lotes++) {
      avancar(30000);
      const r = ctx.AuvoAcervo_rodarLote_({ orcamentoMs });
      if (r.situacao !== 'RODANDO') return { lotes: lotes + 1, r };
    }
    throw new Error('não terminou em ' + lotes + ' lotes');
  };
  const tabela = (nome) => {
    const l = abas[nome]._linhas; const cab = l[0];
    return l.slice(1).map((row) => Object.fromEntries(cab.map((h, i) => [h, row[i] === undefined ? '' : row[i]])));
  };
  return { grupos, ctx, api, rodarAteParar, tabela, abas, arquivos, pastas, caminhoDe, pedidos, auvo, props, gatilhos, sonos, estat, sha, avancar, fotoAtual, atual, logs, bytesImagem };
}

function conferirSoLeituraNoAuvo(e) {
  const escrita = e.pedidos.filter((p) => p.metodo !== 'get' && p.metodo !== 'head');
  assert.deepEqual(escrita.map((p) => p.url), escrita.map(() => 'https://api.auvo.com.br/v2/login'), 'só o login do token pode ser POST');
  assert.ok(e.pedidos.filter((p) => !p.url.includes('auvo.com.br')).every((p) => !p.auth), 'o token do Auvo não vai para outro servidor');
}

/* ---------------- testes (18/11/2026: Auvo descontinuado pelo dono) ---------------- */

test('retirada: contar, copiar, pausar, continuar, repetir falhas e conferir recusam sem chamar o Auvo e sem agendar nada', () => {
  const e = ambiente();
  for (const fn of ['apiIniciarContagem', 'apiIniciarCopia', 'apiPausar', 'apiContinuar', 'apiTentarDeNovo', 'apiConferir']) {
    assert.throws(() => e.api('s_adm', fn, { inicio: '2022-01' }), /O Auvo foi descontinuado em 18\/11\/2026/, fn);
  }
  assert.throws(() => e.ctx.AuvoAcervo_getAuvo_('/tasks?page=1'), /descontinuado/);
  e.ctx.AuvoAcervo_agendar_(5000);
  assert.equal(e.pedidos.length, 0, 'nenhuma chamada ao Auvo');
  assert.equal(e.gatilhos.length, 0, 'nenhum gatilho agendado');
  assert.equal(e.fotoAtual, JSON.stringify(e.atual._linhas), 'AUVO_TAREFAS intacta');
});

test('retirada: o gatilho antigo da cópia, se ainda estiver na agenda, só se remove (não lê o Auvo)', () => {
  const e = ambiente();
  e.gatilhos.push({ fn: 'AuvoAcervo_loteGatilho' }, { fn: 'AuvoAcervo_loteGatilho' }, { fn: 'Outra_rotina' });
  const r = e.ctx.AuvoAcervo_loteGatilho();
  assert.equal(r.removidos, 2);
  assert.deepEqual(e.gatilhos.map((g) => g.fn), ['Outra_rotina']);
  assert.equal(e.pedidos.length, 0);
});

test('acesso: só Administrador e Diretoria consultam o histórico; gestor não vê', () => {
  const e = ambiente();
  assert.equal(e.api('s_ges', 'apiPodeVer').pode, false);
  assert.equal(e.api('s_dir', 'apiPodeVer').pode, true);
  assert.throws(() => e.api('s_ges', 'apiStatus'), /Administrador e da Diretoria/);
  assert.throws(() => e.api('s_ges', 'apiConsultarTarefa', { taskId: '1' }), /Administrador e da Diretoria/);
  assert.throws(() => e.api('sessao-falsa', 'apiStatus'), /Sessão inválida/);
  assert.equal(e.ctx.AuvoAcervo_obterConteudo('s_ges'), '');
  assert.match(e.ctx.AuvoAcervo_obterConteudo('s_adm'), /acvCard/);
  assert.equal(e.pedidos.length, 0, 'nenhuma chamada ao Auvo');
});

test('consulta: situação, falhas e tarefa copiada (com fotos e registro completo) continuam abrindo, sem o Auvo', () => {
  const e = ambiente();
  const cfg = e.ctx.AUVO_ACERVO_CFG, cols = e.ctx.AUVO_ACERVO_COLS;
  const raiz = e.ctx.DriveApp.getRootFolder();
  const foto = raiz.createFile(e.ctx.Utilities.newBlob('FOTO', 'image/jpeg', 'foto_1001.jpg'));
  const json = raiz.createFile(e.ctx.Utilities.newBlob(JSON.stringify({ taskID: 1001, orientation: 'Troca de peça' }), 'application/json', 'tarefa_1001.json'));
  const tT = e.ctx.AuvoAcervo_tabela_(cfg.ABA_TAREFAS, cols.TAREFAS, 'AUVO_TASK_ID');
  e.ctx.AuvoAcervo_inserir_(tT, [{ AUVO_TASK_ID: '1001', DATA_TAREFA: '2024-01-05T08:00:00', TIPO_TAREFA: 'Manutenção preventiva', CLIENTE_NOME: 'CLINICA TESTE 0',
    TECNICO_NOME: 'TECNICO TESTE', FINALIZADA: 'SIM', JSON_VERSAO: 1, JSON_TAMANHO: 120, JSON_ARQUIVO_ID: json.getId(), CONFERENCIA: 'OK' }]);
  const tA = e.ctx.AuvoAcervo_tabela_(cfg.ABA_ARQUIVOS, cols.ARQUIVOS, 'CHAVE');
  e.ctx.AuvoAcervo_inserir_(tA, [
    { CHAVE: '1001|f1', AUVO_TASK_ID: '1001', TIPO: 'FOTO', PERGUNTA: 'Foto do equipamento', NOME_ARQUIVO: 'foto_1001.jpg', ARQUIVO_ID: foto.getId(), SITUACAO: 'COPIADO', TAMANHO: 4 },
    { CHAVE: '1001|f2', AUVO_TASK_ID: '1001', TIPO: 'FOTO', PERGUNTA: 'Foto 2', SITUACAO: 'FALHA', MOTIVO: 'HTTP 404', TENTATIVAS: 3, URL_ORIGINAL: IMG + 'x.jpg' }]);
  e.props[cfg.PROP_ESTADO] = JSON.stringify({ modo: 'COPIA', situacao: 'CONCLUIDO', fase: 'FIM', inicio: '2022-01', fim: '2026-10' });
  const st = e.api('s_dir', 'apiStatus');
  assert.equal(st.ok, true); assert.equal(st.estado.situacao, 'CONCLUIDO');
  const f = e.api('s_adm', 'apiListarFalhas', {});
  assert.equal(f.total, 1); assert.equal(f.itens[0].motivo, 'HTTP 404');
  const t = e.api('s_dir', 'apiConsultarTarefa', { taskId: '1001' });
  assert.equal(t.achou, true);
  assert.equal(t.tarefa.tipo, 'Manutenção preventiva');
  assert.match(t.jsonPrevia, /Troca de peça/);
  assert.ok(t.arquivos.some((a) => a.link && /foto_1001/.test(a.nome)));
  assert.equal(e.api('s_dir', 'apiConsultarTarefa', { taskId: '999' }).achou, false);
  assert.equal(e.pedidos.length, 0, 'nada sai para o Auvo');
});

test('tela: "Histórico do Auvo" somente consulta (sem botões que falem com o Auvo), script válido; ajuda "auvo_historico"', () => {
  const src = fs.readFileSync(path.join(base, 'SGO_AuvoAcervo_Tela.js'), 'utf8');
  const corpo = src.slice(src.indexOf('`') + 1, src.lastIndexOf('`'));
  assert.ok(!corpo.includes('\\') && !corpo.includes('`') && !corpo.includes('${'));
  const script = /<script>([\s\S]*?)<\/script>/.exec(corpo)[1];
  assert.doesNotThrow(() => new Function(script));
  for (const fn of ['acv_consultar', 'acv_falhas', 'acv_ajuda', 'acv_atualizar']) assert.ok(script.includes('function ' + fn + '('), fn);
  for (const fn of ['acv_contar', 'acv_copiar', 'acv_repetir', 'acv_acao']) assert.ok(!script.includes('function ' + fn + '('), 'saiu: ' + fn);
  for (const botao of ['Contar o acervo', 'Iniciar cópia', 'Pausar', 'Continuar', 'Tentar de novo as falhas', 'Conferir arquivos']) {
    assert.ok(!corpo.includes('>' + botao + '</button>'), 'botão saiu: ' + botao);
  }
  assert.match(script, /Histórico do Auvo \(sistema descontinuado em 18\/11\/2026\) — somente consulta/);
  assert.match(script, /Ajuda_abrir_\('auvo_historico'\)/);
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(base, 'SGO_Ajuda_Auvo.js'), 'utf8'), ctx);
  const a = ctx.SGO_ajudaTelas_Auvo_().auvo_historico;
  assert.ok(a && a.titulo && a.passos.length >= 2);
  const texto = JSON.stringify(a);
  for (const botao of ['Atualizar', 'Consultar']) assert.ok(texto.includes('\\"' + botao + '\\"'), 'ajuda cita o botão ' + botao);
  assert.ok(!/<[a-z]/i.test(texto), 'texto puro');
  const js = fs.readFileSync(path.join(base, 'JS_Auvo.html'), 'utf8');
  assert.match(js, /AuvoAcervo_obterConteudo\(/);
  assert.doesNotMatch(js, /Auvo_obterConteudoModulo/);
});
