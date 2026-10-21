// Acervo do Auvo — etapa 0 da Assistência técnica (21/10/2026).
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
  ['SGO_Auvo_Config.js', 'SGO_Auvo_Main.js', 'SGO_AuvoAcervo.js', 'SGO_AuvoAcervo_Tela.js'].forEach((f) =>
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

/* ---------------- testes ---------------- */
test('contagem: percorre todos os meses e páginas, conta e estima o espaço sem baixar nada', () => {
  const e = ambiente();
  const st = e.api('s_dir', 'apiIniciarContagem', { inicio: '2023-11' });
  assert.equal(st.estado.situacao, 'RODANDO');
  assert.equal(e.gatilhos.length, 1, 'agenda o primeiro lote');
  const fim = e.rodarAteParar(75000);
  assert.ok(fim.lotes > 1, 'precisou de mais de um lote (retomada pelo marcador)');
  assert.equal(fim.r.situacao, 'CONCLUIDO');
  const c = JSON.parse(e.props.AUVO_ACERVO_CONTAGEM);
  assert.equal(c.tarefas, 235);
  assert.deepEqual(c.porAno, { 2024: 235 });
  assert.equal(c.porTipo['Calibração'] + c.porTipo['Manutenção corretiva'] + c.porTipo['Manutenção preventiva'], 235);
  assert.equal(c.qtdQuestionarios, 3);
  assert.equal(c.respostasComImagem, 2 + 1 + 23 + 2); // 1001 (2 respostas com foto), 1002, 23 de fev, 4001 (instavel e pagina)
  assert.equal(c.assinaturasQuestionario, 1);
  assert.equal(c.assinaturasTarefa, 2);
  assert.equal(c.anexos, 1);
  assert.equal(c.links, 1, 'página comum fica como link; taskUrl não entra');
  assert.equal(c.arquivos, 4 + 1 + 1 + 23 + 2 + 1); // 1001, 1002, 1003 (anexo), fev, 4001, 4002
  assert.ok(c.amostra.imagensMedidas > 0 && c.estimativaBytes > 0, 'estima pelo tamanho da amostra');
  assert.equal(c.listasDeApoio.equipes, 'não disponível na API');
  assert.equal(c.listasDeApoio.clientes, 130);
  const fev = c.porMes.find((m) => m.mes === '2024-02');
  assert.deepEqual([fev.auvo, fev.lidas], [230, 230]);
  // nada baixado: só HEAD nas imagens; nenhuma aba de acervo criada; só o relatório da contagem em arquivo
  assert.equal(e.pedidos.filter((p) => p.url.startsWith(IMG) && p.metodo === 'get').length, 0);
  assert.ok(!e.abas.AUVO_ACERVO_TAREFAS);
  assert.deepEqual(Object.values(e.arquivos).map((a) => e.caminhoDe(a.pasta)), ['Acervo Auvo/_relatorios']);
  conferirSoLeituraNoAuvo(e);
  assert.equal(JSON.stringify(e.atual._linhas), e.fotoAtual, 'AUVO_TAREFAS do SGO+ intacta');
  assert.equal(e.gatilhos.length, 0, 'terminou e removeu o gatilho');
});

test('cópia completa em lotes: registro sem cortes, arquivos com sha256, falhas com motivo e relatório', () => {
  const e = ambiente();
  e.ctx.AUVO_ACERVO_CFG.GRAVAR_JSON_NA_ABA = true; // trechos do JSON na aba (desligado por padrão)
  e.api('s_adm', 'apiIniciarCopia', { inicio: '2023-12' });
  const fim = e.rodarAteParar(130000);
  assert.ok(fim.lotes > 3, 'retomou em vários lotes');
  assert.equal(fim.r.situacao, 'CONCLUIDO');
  const tarefas = e.tabela('AUVO_ACERVO_TAREFAS');
  assert.equal(tarefas.length, 235, 'cada tarefa uma vez, mesmo com segunda passada');
  // JSON completo: os trechos remontam exatamente a tarefa do Auvo, inclusive a grande
  const grande = e.auvo.tarefas[5];
  const partes = e.tabela('AUVO_ACERVO_JSON').filter((p) => p.AUVO_TASK_ID === String(grande.taskID)).sort((a, b) => a.PARTE - b.PARTE);
  assert.equal(partes.length, 3);
  assert.equal(partes.map((p) => p.TRECHO).join(''), JSON.stringify(grande));
  const linhaGrande = tarefas.find((t) => t.AUVO_TASK_ID === String(grande.taskID));
  assert.equal(linhaGrande.JSON_SHA256, e.sha(Buffer.from(JSON.stringify(grande))));
  assert.equal(e.arquivos[linhaGrande.JSON_ARQUIVO_ID].bytes.toString('utf8'), JSON.stringify(grande));
  // arquivos na pasta Acervo Auvo/<ano>/<id>, com o sha256 do conteúdo e privados
  const arqs = e.tabela('AUVO_ACERVO_ARQUIVOS');
  const copiados = arqs.filter((a) => a.SITUACAO === 'COPIADO');
  assert.equal(copiados.length, 30, 'tudo menos 404 e página');
  copiados.forEach((a) => {
    const f = e.arquivos[a.ARQUIVO_ID];
    assert.equal(e.caminhoDe(f.pasta), 'Acervo Auvo/2024/' + a.AUVO_TASK_ID);
    assert.equal(a.SHA256, e.sha(f.bytes));
    assert.equal(f.compartilhamento, 'PRIVATE:NONE');
    assert.ok(f.nome.startsWith(a.AUVO_TASK_ID + '_'), 'número da tarefa no nome: ' + f.nome);
  });
  const f1001 = copiados.filter((a) => a.AUVO_TASK_ID === '1001').map((a) => e.arquivos[a.ARQUIVO_ID].nome).sort();
  assert.deepEqual(f1001, ['1001_assinatura_questionario_q1_r4.png', '1001_assinatura_tarefa.png', '1001_foto_q1_r2.jpg', '1001_foto_q1_r3.jpg']);
  assert.equal(copiados.find((a) => a.URL_ORIGINAL.endsWith('manual.pdf')).CONTENT_TYPE, 'application/pdf');
  // instável: 500 na 1ª tentativa, copiada na repetição automática
  const instavel = arqs.find((a) => a.URL_ORIGINAL.endsWith('instavel.jpg'));
  assert.equal(instavel.SITUACAO, 'COPIADO');
  assert.equal(Number(instavel.TENTATIVAS), 2);
  const f404 = arqs.find((a) => a.URL_ORIGINAL.endsWith('falha404.jpg'));
  assert.equal(f404.SITUACAO, 'FALHA');
  assert.match(f404.MOTIVO, /HTTP 404/);
  assert.equal(f404.RETENTAVEL, 'NAO');
  const pag = arqs.find((a) => a.URL_ORIGINAL.endsWith('pagina.jpg'));
  assert.equal(pag.SITUACAO, 'FALHA');
  assert.match(pag.MOTIVO, /página da internet/);
  assert.equal(arqs.find((a) => a.URL_ORIGINAL === 'https://site.exemplo.test/pagina').SITUACAO, 'LINK');
  assert.ok(!arqs.some((a) => a.URL_ORIGINAL.includes('app.auvo.com.br/tarefa')), 'taskUrl não é arquivo');
  // relatório de conferência
  const rel = JSON.parse(e.props.AUVO_ACERVO_RELATORIO);
  assert.equal(rel.conclusao, 'COM_FALTAS');
  assert.deepEqual([rel.tarefas.auvo, rel.tarefas.noAcervo, rel.tarefas.faltando], [235, 235, 0]);
  assert.deepEqual([rel.arquivos.esperados, rel.arquivos.copiados, rel.arquivos.falhas, rel.arquivos.pendentes], [32, 30, 2, 0]);
  assert.equal(rel.arquivos.conferencia.ok, 30);
  assert.equal(rel.tarefas.conferenciaJson.ok, 235);
  assert.equal(rel.arquivos.falhasPorMotivo['HTTP 404 (o Auvo não tem mais este arquivo)'], 1);
  assert.equal(rel.listasDeApoio.find((l) => l.nome === 'clientes').itens, 130);
  assert.equal(rel.listasDeApoio.find((l) => l.nome === 'equipes').situacao, 'NAO_DISPONIVEL');
  assert.ok(Object.values(e.arquivos).some((a) => e.caminhoDe(a.pasta) === 'Acervo Auvo/_listas_de_apoio' && a.nome.startsWith('clientes_')));
  // token do Auvo só para o endereço do Auvo
  assert.ok(e.pedidos.find((p) => p.url.startsWith('https://arquivos.auvo.com.br/') && p.metodo === 'get').auth);
  conferirSoLeituraNoAuvo(e);
  assert.equal(JSON.stringify(e.atual._linhas), e.fotoAtual, 'AUVO_TAREFAS do SGO+ intacta');
  assert.deepEqual(Object.keys(e.abas).sort(), ['AUVO_ACERVO_ARQUIVOS', 'AUVO_ACERVO_JSON', 'AUVO_ACERVO_TAREFAS', 'AUVO_TAREFAS']);
});

test('idempotência: rodar de novo não baixa nem duplica; tarefa alterada ganha versão nova sem apagar a anterior', () => {
  const e = ambiente();
  e.ctx.AUVO_ACERVO_CFG.GRAVAR_JSON_NA_ABA = true;
  e.api('s_adm', 'apiIniciarCopia', { inicio: '2024-01' });
  e.rodarAteParar(240000);
  const getsAntes = e.pedidos.filter((p) => p.url.startsWith(IMG) && p.metodo === 'get').length;
  const arquivosAntes = Object.keys(e.arquivos).length;
  const partesAntes = e.tabela('AUVO_ACERVO_JSON').length;
  e.api('s_adm', 'apiIniciarCopia', { inicio: '2024-01' });
  e.rodarAteParar(240000);
  const novosGets = e.pedidos.filter((p) => p.url.startsWith(IMG) && p.metodo === 'get').slice(getsAntes).map((p) => p.url.split('/').pop());
  assert.deepEqual(novosGets, [], 'nenhuma imagem é baixada de novo (falhas definitivas só voltam com "Tentar de novo")');
  assert.equal(e.tabela('AUVO_ACERVO_TAREFAS').length, 235);
  assert.equal(e.tabela('AUVO_ACERVO_JSON').length, partesAntes, 'sem trechos repetidos');
  const novos = Object.values(e.arquivos).slice(arquivosAntes).map((a) => e.caminhoDe(a.pasta));
  assert.ok(novos.every((c) => c === 'Acervo Auvo/_relatorios' || c === 'Acervo Auvo/_listas_de_apoio'), 'só relatório e listas novas: ' + novos);

  // a tarefa 1001 mudou no Auvo (foto trocada e relato novo)
  const t = e.auvo.tarefas.find((x) => x.taskID === 1001);
  const jsonV1 = JSON.stringify(t);
  t.questionnaires[0].answers[1].reply = IMG + '1001a-nova.jpg';
  t.report = 'Relato revisado';
  e.api('s_adm', 'apiIniciarCopia', { inicio: '2024-01' });
  e.rodarAteParar(240000);
  const linha = e.tabela('AUVO_ACERVO_TAREFAS').find((x) => x.AUVO_TASK_ID === '1001');
  assert.equal(Number(linha.JSON_VERSAO), 2);
  const pasta = Object.values(e.arquivos).filter((a) => e.caminhoDe(a.pasta) === 'Acervo Auvo/2024/1001').map((a) => a.nome).sort();
  assert.ok(pasta.includes('tarefa_1001.json') && pasta.includes('tarefa_1001_versao2.json'), pasta.join(', '));
  assert.ok(pasta.includes('1001_foto_q1_r2.jpg') && pasta.includes('1001_foto_q1_r2_versao2.jpg'), 'foto antiga fica, a nova ganha outro nome: ' + pasta);
  const v1 = Object.values(e.arquivos).find((a) => a.nome === 'tarefa_1001.json');
  assert.equal(v1.bytes.toString('utf8'), jsonV1, 'versão anterior intacta');
  const versoes = new Set(e.tabela('AUVO_ACERVO_JSON').filter((p) => p.AUVO_TASK_ID === '1001').map((p) => Number(p.VERSAO)));
  assert.deepEqual([...versoes].sort(), [1, 2]);
  conferirSoLeituraNoAuvo(e);
});

test('arquivo com o mesmo nome já gravado (lote interrompido) é reaproveitado se o sha256 bate', () => {
  const e = ambiente({ tarefas: [tarefaFalsa(7001, '2024-01-02T08:00:00', { signatureUrl: IMG + '7001t.png' })] });
  e.api('s_adm', 'apiIniciarCopia', { inicio: '2024-01' });
  e.rodarAteParar(240000);
  const linha = e.tabela('AUVO_ACERVO_ARQUIVOS')[0];
  assert.equal(linha.SITUACAO, 'COPIADO');
  // simula a queda depois de gravar o arquivo e antes de marcar a linha: volta a linha para PENDENTE
  const aba = e.abas.AUVO_ACERVO_ARQUIVOS._linhas; const cab = aba[0];
  aba[1][cab.indexOf('SITUACAO')] = 'PENDENTE'; aba[1][cab.indexOf('ARQUIVO_ID')] = '';
  const antes = e.estat.criados;
  e.api('s_adm', 'apiIniciarCopia', { inicio: '2024-01' });
  e.rodarAteParar(240000);
  const depois = e.tabela('AUVO_ACERVO_ARQUIVOS')[0];
  assert.equal(depois.SITUACAO, 'COPIADO');
  assert.equal(depois.ARQUIVO_ID, linha.ARQUIVO_ID, 'reaproveitou o arquivo já gravado');
  assert.equal(Object.values(e.arquivos).filter((a) => a.nome === '7001_assinatura_tarefa.png').length, 1);
  assert.equal(Object.values(e.arquivos).filter((a) => e.caminhoDe(a.pasta) === 'Acervo Auvo/2024/7001').length, 2, 'só o JSON e a assinatura na pasta da tarefa');
  assert.equal(e.estat.criados - antes, 1, 'só o relatório novo (listas de apoio iguais no mesmo dia são reaproveitadas)');
});

test('falha de download fica registrada e "Tentar de novo as falhas" copia quando o arquivo volta', () => {
  const e = ambiente();
  e.api('s_adm', 'apiIniciarCopia', { inicio: '2024-01' });
  e.rodarAteParar(240000);
  const falhas = e.api('s_dir', 'apiListarFalhas', {});
  assert.equal(falhas.total, 2);
  const f = falhas.itens.find((x) => x.tarefa === '1002');
  assert.match(f.motivo, /404/);
  assert.equal(f.repeteSozinho, false);
  assert.equal(f.endereco, IMG + 'falha404.jpg');
  e.auvo.voltou404 = true;
  const st = e.api('s_adm', 'apiTentarDeNovo', {});
  assert.equal(st.devolvidos, 2);
  assert.equal(st.estado.fase, 'ARQUIVOS');
  e.rodarAteParar(240000);
  const arq = e.tabela('AUVO_ACERVO_ARQUIVOS').find((a) => a.URL_ORIGINAL.endsWith('falha404.jpg'));
  assert.equal(arq.SITUACAO, 'COPIADO');
  const rel = JSON.parse(e.props.AUVO_ACERVO_RELATORIO);
  assert.equal(rel.arquivos.falhas, 1, 'só a página continua como falha');
  assert.equal(rel.arquivos.copiados, 31);
});

test('endereço vencido (403): falha registrada; ao tentar de novo, relê a tarefa no Auvo (GET) e usa o endereço novo', () => {
  const e = ambiente({ tarefas: [tarefaFalsa(8001, '2024-01-02T08:00:00', { signatureUrl: IMG + 'vencido.png' })] });
  const fetchOriginal = e.ctx.UrlFetchApp.fetchAll;
  e.ctx.UrlFetchApp.fetchAll = (lista) => lista.map((r) => (r.url.endsWith('vencido.png')
    ? { getResponseCode: () => 403, getContentText: () => '', getAllHeaders: () => ({}), getHeaders: () => ({}), getBlob: () => null }
    : fetchOriginal([r])[0]));
  e.api('s_adm', 'apiIniciarCopia', { inicio: '2024-01' });
  e.rodarAteParar(240000);
  let a = e.tabela('AUVO_ACERVO_ARQUIVOS')[0];
  assert.equal(a.SITUACAO, 'FALHA');
  assert.equal(Number(a.TENTATIVAS), 3, 'repetiu sozinha até o limite');
  assert.match(a.MOTIVO, /HTTP 403/);
  // o Auvo passa a entregar outro endereço para a mesma assinatura
  e.auvo.tarefas[0].signatureUrl = IMG + 'renovado.png';
  e.api('s_adm', 'apiTentarDeNovo', {});
  e.rodarAteParar(240000);
  a = e.tabela('AUVO_ACERVO_ARQUIVOS')[0];
  assert.equal(a.SITUACAO, 'COPIADO');
  assert.equal(a.URL_ORIGINAL, IMG + 'renovado.png');
  assert.equal(a.URL_ANTERIOR, IMG + 'vencido.png');
  assert.ok(e.pedidos.some((p) => p.url === 'https://api.auvo.com.br/v2/tasks/8001' && p.metodo === 'get'));
  conferirSoLeituraNoAuvo(e);
});

test('conferência acusa arquivo alterado no servidor (sha256 diferente) e arquivo sumido', () => {
  const e = ambiente();
  e.api('s_adm', 'apiIniciarCopia', { inicio: '2024-01' });
  e.rodarAteParar(240000);
  const arqs = e.tabela('AUVO_ACERVO_ARQUIVOS').filter((a) => a.SITUACAO === 'COPIADO');
  e.arquivos[arqs[0].ARQUIVO_ID].bytes = Buffer.from('conteúdo trocado');
  delete e.arquivos[arqs[1].ARQUIVO_ID];
  e.api('s_dir', 'apiConferir', {});
  e.rodarAteParar(130000);
  const depois = e.tabela('AUVO_ACERVO_ARQUIVOS');
  assert.equal(depois.find((a) => a.ID === arqs[0].ID).CONFERENCIA, 'DIVERGENTE');
  assert.equal(depois.find((a) => a.ID === arqs[1].ID).CONFERENCIA, 'ARQUIVO_NAO_ENCONTRADO');
  const rel = JSON.parse(e.props.AUVO_ACERVO_RELATORIO);
  assert.equal(rel.arquivos.conferencia.divergentes, 1);
  assert.equal(rel.arquivos.conferencia.naoEncontrados, 1);
  assert.equal(rel.conclusao, 'COM_FALTAS');
});

test('paginação: 404 em mês vazio conta como zero; 429 respeita Retry-After; Auvo fora do ar para em ERRO e continua de onde parou', () => {
  const e = ambiente();
  e.auvo.vazio404 = true;
  e.auvo.limite429 = true;
  e.api('s_adm', 'apiIniciarContagem', { inicio: '2024-01' });
  e.auvo.falharTarefas = 1000;
  for (let i = 0; i < 5; i++) { e.avancar(30000); e.ctx.AuvoAcervo_rodarLote_(); }
  let st = e.api('s_adm', 'apiStatus', {});
  assert.equal(st.estado.situacao, 'ERRO');
  assert.match(st.estado.ultimoErro, /não respondeu depois de 6 tentativas/);
  assert.equal(e.gatilhos.length, 0, 'parado por erro não agenda mais lotes');
  const cursor = st.estado.cursor;
  e.auvo.falharTarefas = 0;
  st = e.api('s_adm', 'apiContinuar', {});
  assert.equal(st.estado.situacao, 'RODANDO');
  assert.deepEqual(st.estado.cursor, cursor, 'continua do mesmo ponto');
  e.rodarAteParar(240000);
  const c = JSON.parse(e.props.AUVO_ACERVO_CONTAGEM);
  assert.equal(c.tarefas, 235);
  assert.ok(c.mesesSemResposta >= 1, 'mês sem tarefa respondido com 404');
  assert.equal(c.porMes.find((m) => m.mes === '2024-03').auvo, 0);
  assert.ok(e.sonos.includes(7000), 'esperou o Retry-After de 7 s');
});

test('pausa: com lote parado vale na hora; com lote rodando, o lote termina o passo e para', () => {
  const e = ambiente();
  e.api('s_adm', 'apiIniciarCopia', { inicio: '2024-01' });
  let st = e.api('s_dir', 'apiPausar', {});
  assert.equal(st.estado.situacao, 'PAUSADO');
  assert.equal(e.gatilhos.length, 0);
  const r = e.ctx.AuvoAcervo_rodarLote_();
  assert.equal(r.parado, true);
  // retoma; durante um lote chega o pedido de pausa
  e.api('s_adm', 'apiIniciarCopia', { inicio: '2024-01' });
  e.props.AUVO_ACERVO_EXECUTANDO = JSON.stringify({ dono: 'outro', em: Date.parse('2024-05-10T12:00:00Z') + 10 ** 9 });
  st = e.api('s_adm', 'apiPausar', {});
  assert.equal(st.estado.situacao, 'RODANDO');
  assert.equal(e.props.AUVO_ACERVO_PEDIDO, 'PAUSAR');
  delete e.props.AUVO_ACERVO_EXECUTANDO;
  const r2 = e.ctx.AuvoAcervo_rodarLote_();
  assert.equal(r2.situacao, 'PAUSADO');
  assert.ok(!e.props.AUVO_ACERVO_PEDIDO);
  st = e.api('s_adm', 'apiContinuar', {});
  assert.equal(st.estado.situacao, 'RODANDO');
  assert.equal(e.rodarAteParar(240000).r.situacao, 'CONCLUIDO');
});

test('dois lotes ao mesmo tempo: o segundo não roda (trava)', () => {
  const e = ambiente();
  e.api('s_adm', 'apiIniciarCopia', { inicio: '2024-01' });
  e.props.AUVO_ACERVO_EXECUTANDO = JSON.stringify({ dono: 'outro', em: Date.parse('2024-05-10T12:00:00Z') });
  const r = e.ctx.AuvoAcervo_rodarLote_();
  assert.equal(r.ocupado, true);
  assert.ok(!e.abas.AUVO_ACERVO_TAREFAS._linhas[1], 'nada gravado');
});

test('acesso: só Administrador e Diretoria; gestor não vê nem opera', () => {
  const e = ambiente();
  assert.equal(e.api('s_ges', 'apiPodeVer').pode, false);
  assert.equal(e.api('s_dir', 'apiPodeVer').pode, true);
  assert.throws(() => e.api('s_ges', 'apiStatus'), /Administrador e da Diretoria/);
  assert.throws(() => e.api('s_ges', 'apiIniciarCopia', {}), /Administrador e da Diretoria/);
  assert.throws(() => e.api('sessao-falsa', 'apiStatus'), /Sessão inválida/);
  assert.equal(e.ctx.AuvoAcervo_obterConteudo('s_ges'), '');
  assert.match(e.ctx.AuvoAcervo_obterConteudo('s_adm'), /acvCard/);
  assert.throws(() => e.api('s_adm', 'apiIniciarCopia', { inicio: '2030-01' }), /futuro/);
  assert.throws(() => e.api('s_adm', 'apiIniciarCopia', { inicio: 'jan' }), /inválido/);
  assert.equal(e.pedidos.length, 0, 'nenhuma chamada ao Auvo');
});

test('sem as chaves do Auvo a cópia não começa e explica o que fazer', () => {
  const e = ambiente({ props: { AUVO_API_KEY: '', AUVO_API_TOKEN: '' } });
  assert.throws(() => e.api('s_adm', 'apiIniciarCopia', {}), /Chaves e senhas/);
  assert.equal(e.api('s_adm', 'apiStatus').estado.situacao, 'PARADO');
});

test('tela: conteúdo sem barra invertida nem crase, script válido; ajuda "auvo/acervo" no contrato', () => {
  const src = fs.readFileSync(path.join(base, 'SGO_AuvoAcervo_Tela.js'), 'utf8');
  const corpo = src.slice(src.indexOf('`') + 1, src.lastIndexOf('`'));
  assert.ok(!corpo.includes('\\') && !corpo.includes('`') && !corpo.includes('${'));
  const script = /<script>([\s\S]*?)<\/script>/.exec(corpo)[1];
  assert.doesNotThrow(() => new Function(script));
  for (const fn of ['acv_contar', 'acv_copiar', 'acv_repetir', 'acv_consultar', 'acv_falhas', 'acv_ajuda']) assert.ok(script.includes('function ' + fn + '('), fn);
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(base, 'SGO_Ajuda_Auvo.js'), 'utf8'), ctx);
  const a = ctx.SGO_ajudaTelas_Auvo_()['auvo/acervo'];
  assert.ok(a && a.titulo && a.passos.length >= 5);
  const texto = JSON.stringify(a);
  for (const botao of ['Contar o acervo', 'Iniciar cópia', 'Pausar', 'Continuar', 'Tentar de novo as falhas', 'Conferir arquivos', 'Consultar']) {
    assert.ok(texto.includes('\\"' + botao + '\\"'), 'ajuda cita o botão ' + botao);
    assert.ok(corpo.includes('>' + botao + '</button>') || corpo.includes('>' + botao + '<'), 'botão existe na tela: ' + botao);
  }
  assert.ok(!/<[a-z]/i.test(texto), 'texto puro');
  const js = fs.readFileSync(path.join(base, 'JS_Auvo.html'), 'utf8');
  assert.match(js, /AuvoAcervo_obterConteudo\(/);
  assert.equal((js.match(/tplAuvo_montarAcervo_\(\);/g) || []).length, 2);
});

/* ---------------- 22/10/2026: lote que derrubava o servidor (memória) e download pendurado ---------------- */
const v8 = require('node:v8');
v8.setFlagsFromString('--expose-gc');
const coletar = vm.runInNewContext('gc');

// roda um lote como o servidor: se passar do tempo, o lote é encerrado à força (sem finally, sem gravar nada)
function loteComLimite(e, ms) {
  e.ctx.__orc = 10 ** 9;
  try { vm.runInContext('AuvoAcervo_rodarLote_({ orcamentoMs: __orc })', e.ctx, { timeout: ms || 1500 }); return 'terminou'; }
  catch (err) { if (/timed out/i.test(String(err && err.message))) return 'encerrado'; throw err; }
}

test('download que nunca responde: o lote é encerrado, a próxima rodada separa o arquivo e na 2ª vez registra FALHA e segue', () => {
  const tarefas = [tarefaFalsa(5001, '2024-01-03T08:00:00', { questionnaires: [questionario(1, [IMG + 'ok1.jpg', IMG + 'pendurado.jpg', IMG + 'ok2.jpg'])] })];
  const e = ambiente({ tarefas });
  e.api('s_adm', 'apiIniciarCopia', { inicio: '2024-01' });
  // primeiro lote: lê as tarefas e chega aos arquivos; o grupo com o pendurado trava
  e.auvo.pendurar = new Set(['pendurado.jpg']);
  assert.equal(loteComLimite(e), 'encerrado');
  let arqs = e.tabela('AUVO_ACERVO_ARQUIVOS');
  assert.ok(arqs.every((a) => a.ANDAMENTO_EM), 'os três ficaram marcados como tentativa em andamento');
  assert.ok(e.props.AUVO_ACERVO_EXECUTANDO, 'a trava ficou (o lote morreu)');
  // a trava vence em 330 s; o vigia retoma
  e.avancar(6 * 60 * 1000);
  assert.equal(loteComLimite(e), 'encerrado', 'agora cada um vai sozinho: o primeiro passa, o pendurado trava de novo');
  arqs = e.tabela('AUVO_ACERVO_ARQUIVOS');
  assert.deepEqual(arqs.filter((a) => a.SITUACAO === 'COPIADO').map((a) => a.URL_ORIGINAL.split('/').pop()), ['ok1.jpg']);
  assert.ok(!arqs.find((a) => a.URL_ORIGINAL.endsWith('ok2.jpg')).ANDAMENTO_EM, 'o que não foi tentado não conta como interrompido');
  const p = arqs.find((a) => a.URL_ORIGINAL.endsWith('pendurado.jpg'));
  assert.ok(p.ANDAMENTO_EM && Number(p.INICIOS_SEM_FIM) === 1);
  e.avancar(6 * 60 * 1000);
  const fim = e.rodarAteParar(240000);
  assert.equal(fim.r.situacao, 'CONCLUIDO');
  const p2 = e.tabela('AUVO_ACERVO_ARQUIVOS').find((a) => a.URL_ORIGINAL.endsWith('pendurado.jpg'));
  assert.equal(p2.SITUACAO, 'FALHA');
  assert.match(p2.MOTIVO, /download não concluiu/);
  assert.equal(p2.RETENTAVEL, 'NAO');
  assert.equal(e.auvo.penduradas, 2, 'não tentou uma terceira vez');
  assert.equal(e.tabela('AUVO_ACERVO_ARQUIVOS').find((a) => a.URL_ORIGINAL.endsWith('ok2.jpg')).SITUACAO, 'COPIADO');
  assert.ok(!e.props.AUVO_ACERVO_EXECUTANDO, 'trava solta');
  // "Tentar de novo as falhas" devolve o arquivo à fila; com o servidor respondendo, copia
  e.auvo.pendurar = new Set();
  e.api('s_adm', 'apiTentarDeNovo', {});
  e.rodarAteParar(240000);
  assert.equal(e.tabela('AUVO_ACERVO_ARQUIVOS').find((a) => a.URL_ORIGINAL.endsWith('pendurado.jpg')).SITUACAO, 'COPIADO');
});

test('arquivo grande não é baixado (FALHA com o tamanho); grupo em paralelo respeita o teto de bytes; limite sobe pela propriedade', () => {
  const fotos = ['g1.jpg', 'g2.jpg', 'g3.jpg', 'g4.jpg', 'g5.jpg', 'g6.jpg'].map((n) => IMG + n);
  const e = ambiente({ tarefas: [tarefaFalsa(6001, '2024-01-03T08:00:00', { questionnaires: [questionario(1, fotos)], attachments: [{ url: IMG + 'video.mp4' }] })] });
  e.auvo.tamanhos = { 'video.mp4': 90 * 1024 * 1024 };
  fotos.forEach((u) => { e.auvo.tamanhos[u.split('/').pop()] = 10 * 1024 * 1024; });
  e.api('s_adm', 'apiIniciarCopia', { inicio: '2024-01' });
  e.rodarAteParar(240000);
  const arqs = e.tabela('AUVO_ACERVO_ARQUIVOS');
  const video = arqs.find((a) => a.URL_ORIGINAL.endsWith('video.mp4'));
  assert.equal(video.SITUACAO, 'FALHA');
  assert.match(video.MOTIVO, /arquivo grande \(90 MB\), acima do limite de 40 MB/);
  assert.ok(!e.pedidos.some((p) => p.url.endsWith('video.mp4') && p.metodo === 'get'), 'o vídeo não foi baixado');
  assert.equal(arqs.filter((a) => a.SITUACAO === 'COPIADO').length, 6);
  // teto de 24 MB por grupo: no máximo 2 fotos de 10 MB juntas
  const gets = e.grupos.filter((g) => g.every((x) => x.metodo === 'get') && g.some((x) => /\/g\d\.jpg$/.test(x.url)));
  assert.ok(gets.length >= 3 && gets.every((g) => g.length <= 2), JSON.stringify(gets.map((g) => g.length)));
  e.props.AUVO_ACERVO_MAX_MB = '200';
  e.api('s_adm', 'apiTentarDeNovo', {});
  e.rodarAteParar(240000);
  assert.equal(e.tabela('AUVO_ACERVO_ARQUIVOS').find((a) => a.URL_ORIGINAL.endsWith('video.mp4')).SITUACAO, 'COPIADO');
});

test('25 mil linhas de arquivos: cada lote para na quantidade e nos bytes, memória estável e estado pequeno', () => {
  const N = 25000;
  const e = ambiente({ tarefas: [] });
  e.api('s_adm', 'apiIniciarCopia', { inicio: '2024-01' });
  // acervo já lido (fase de arquivos), como em produção: 250 tarefas com pasta e 25 mil arquivos pendentes
  const C = e.ctx.AUVO_ACERVO_COLS;
  e.ctx.AuvoAcervo_aba_('AUVO_ACERVO_TAREFAS', C.TAREFAS);
  const shA = e.ctx.AuvoAcervo_aba_('AUVO_ACERVO_ARQUIVOS', C.ARQUIVOS);
  const raiz = e.ctx.AuvoAcervo_pastaRaiz_();
  const ano = raiz.createFolder('2024');
  const linT = e.abas.AUVO_ACERVO_TAREFAS._linhas;
  for (let t = 0; t < 250; t++) { const row = C.TAREFAS.map(() => ''); row[C.TAREFAS.indexOf('AUVO_TASK_ID')] = String(90000 + t); row[C.TAREFAS.indexOf('PASTA_ID')] = ano.createFolder(String(90000 + t)).getId(); linT.push(row); }
  const linA = shA._linhas, ix = (h) => C.ARQUIVOS.indexOf(h);
  for (let i = 0; i < N; i++) {
    const row = C.ARQUIVOS.map(() => '');
    const t = 90000 + (i % 250);
    row[ix('ID')] = 'a' + i; row[ix('CHAVE')] = t + '|q' + i; row[ix('AUVO_TASK_ID')] = String(t); row[ix('TIPO')] = 'FOTO';
    row[ix('ORIGEM')] = 'questionnaires[0].answers[' + i + '].reply'; row[ix('URL_ORIGINAL')] = IMG + 'm' + i + '.jpg?assinatura=' + 'x'.repeat(300);
    row[ix('SITUACAO')] = 'PENDENTE'; row[ix('TENTATIVAS')] = 0;
    linA.push(row);
  }
  const est = JSON.parse(e.props.AUVO_ACERVO_ESTADO);
  est.fase = 'ARQUIVOS';
  e.props.AUVO_ACERVO_ESTADO = JSON.stringify(est);
  const LIM = e.ctx.AUVO_ACERVO_CFG.LIMITE_ARQUIVOS_LOTE;
  const heap = [];
  let antes = 0;
  for (let lote = 0; lote < 8; lote++) {
    e.avancar(30000);
    const r = e.ctx.AuvoAcervo_rodarLote_({ orcamentoMs: 10 ** 9 });
    assert.equal(r.situacao, 'RODANDO');
    const gets = e.pedidos.filter((p) => p.metodo === 'get' && p.url.startsWith(IMG)).length;
    assert.ok(gets - antes <= LIM, 'lote baixou ' + (gets - antes) + ' arquivos (limite ' + LIM + ')');
    assert.ok(gets - antes >= LIM - e.ctx.AUVO_ACERVO_CFG.DOWNLOAD_PARALELO, 'lote parou cedo demais: ' + (gets - antes));
    antes = gets;
    // os bytes já gravados saem da conta (o servidor guarda em disco, não na memória do lote)
    Object.values(e.arquivos).forEach((a) => { a.bytes = Buffer.alloc(0); });
    e.pedidos.length = 0; antes = 0;
    coletar();
    heap.push(process.memoryUsage().heapUsed);
  }
  const st = e.api('s_adm', 'apiStatus', {});
  assert.equal(st.estado.arquivos.copiados, 8 * LIM);
  assert.equal(st.estado.arquivos.pendentes, N - 8 * LIM);
  assert.ok(e.props.AUVO_ACERVO_ESTADO.length < 6000, 'estado pequeno: ' + e.props.AUVO_ACERVO_ESTADO.length + ' caracteres');
  const cresc = (heap[7] - heap[1]) / 1048576;
  assert.ok(cresc < 40, 'memória cresceu ' + cresc.toFixed(1) + ' MB entre o 2º e o 8º lote: ' + heap.map((h) => Math.round(h / 1048576)).join(', '));
  // a aba de trechos do JSON não é criada nem lida por padrão
  assert.ok(!e.abas.AUVO_ACERVO_JSON);
  // teto de bytes do lote
  e.ctx.AUVO_ACERVO_CFG.LIMITE_BYTES_LOTE = 5000;
  e.avancar(30000);
  e.ctx.AuvoAcervo_rodarLote_({ orcamentoMs: 10 ** 9 });
  const n = e.pedidos.filter((p) => p.metodo === 'get' && p.url.startsWith(IMG)).length;
  assert.ok(n > 0 && n <= 2 * e.ctx.AUVO_ACERVO_CFG.DOWNLOAD_PARALELO, 'parou pelos bytes depois de ' + n + ' arquivos');
});

test('retomada segura depois do lote morto da versão anterior: trava velha vence sozinha; Pausar e Continuar voltam a agendar', () => {
  const e = ambiente();
  e.api('s_adm', 'apiIniciarCopia', { inicio: '2024-01' });
  // como em produção: estado RODANDO, trava de um lote que morreu, gatilho apagado à mão
  e.props.AUVO_ACERVO_EXECUTANDO = JSON.stringify({ dono: '3fa641c6-teste', em: Date.parse('2024-05-10T12:00:00Z') });
  e.gatilhos.length = 0;
  e.avancar(331 * 1000);
  let st = e.api('s_adm', 'apiPausar', {});
  assert.equal(st.estado.situacao, 'PAUSADO', 'trava vencida não segura a pausa');
  st = e.api('s_adm', 'apiContinuar', {});
  assert.equal(st.estado.situacao, 'RODANDO');
  assert.equal(e.gatilhos.length, 1);
  assert.equal(e.rodarAteParar(240000).r.situacao, 'CONCLUIDO');
});
