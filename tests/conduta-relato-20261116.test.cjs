// 16/11/2026 (dono: "nem eu, nem o Charles, nem o Matheus conseguimos acessar o relato da ocorrência; depois não lembramos o
// que foi relatado"). O texto "O que aconteceu" só aparecia nas janelas Homologar e Julgar; ocorrência homologada (e toda a
// registrada pela Diretoria ou pelo dono, que nasce homologada) ficava sem como ser lida. Agora "Ver relato" na lista
// (computador e celular) abre a ficha completa pela apiObterRelatoOcorrencia, com a regra de sigilo da foto.
// Só dados de teste (nomes fictícios).
// Uso: DEST=<legado> node --require <fontes.cjs> --test tests/conduta-relato-20261116.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const base = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(base, f), 'utf8');

const USUARIOS = () => [
  { ID: 'u_dir', USUARIO: 'dora', NOME: 'DORA DIRETORA', PERFIL: 'DIRETORIA', AREA: 'DIRETORIA', STATUS: 'ATIVO' },
  { ID: 'u_dono', USUARIO: 'admin', NOME: 'DONO DO SISTEMA', PERFIL: 'ADMIN', AREA: 'DIRETORIA', STATUS: 'ATIVO' },
  { ID: 'u_qual', USUARIO: 'quintino', NOME: 'QUINTINO QUALIDADE', PERFIL: 'GESTOR', AREA: 'QUALIDADE', STATUS: 'ATIVO' },
  { ID: 'u_met', USUARIO: 'bia', NOME: 'BIA GESTORA METROLOGIA', PERFIL: 'GESTOR', AREA: 'METROLOGIA', STATUS: 'ATIVO' },
  { ID: 'u_rh', USUARIO: 'rosa', NOME: 'ROSA RH', PERFIL: 'RH', AREA: 'RH', STATUS: 'ATIVO' },
  { ID: 'u_fin', USUARIO: 'fabi', NOME: 'FABI FINANCEIRO', PERFIL: 'FINANCEIRO', AREA: 'FINANCEIRO', STATUS: 'ATIVO' },
  { ID: 'u_tec', USUARIO: 'teo', NOME: 'TEO TECNICO', PERFIL: 'TECNICO', AREA: 'TECNICA', STATUS: 'ATIVO' }
];
const S = (id) => { const u = USUARIOS().find((x) => x.ID === id); return { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: u.PERFIL }; };

function ambiente(sessaoInicial, ocorrencias) {
  const sessao = { atual: sessaoInicial };
  const tabelas = {
    CAD_USUARIOS: USUARIOS(), CAD_AREAS: [],
    qual_ocorrencia: ocorrencias || [],
    qual_ocorrencia_tipo: [{ CODIGO: 'VEI-08', DESCRICAO: 'Dano ao veículo por imprudência', GRUPO: 'Veículos', NIVEL: 'GG', REINCIDIVEL: 'FALSE' },
      { CODIGO: 'COZ-01', DESCRICAO: 'Louça deixada na pia', GRUPO: 'Cozinha', NIVEL: 'L', REINCIDIVEL: 'TRUE' }],
    qual_missao: [], qual_fechamento: [], qual_ciencia: [], qual_evento_positivo: [], qual_evento_positivo_tipo: [], qual_ausencia: []
  };
  let seq = 0;
  const ctx = vm.createContext({
    console, JSON, Object, Array, String, Number, RegExp, Error, Date, Math,
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS' } },
    SGO_DATA: {
      getAll: (t) => tabelas[t] || [],
      getById: (t, id) => (tabelas[t] || []).find((x) => String(x.ID) === String(id)) || null,
      update: (t, id, campos) => Object.assign((tabelas[t] || []).find((x) => String(x.ID) === String(id)), campos),
      insert: (t, d) => { const reg = Object.assign({ ID: 'novo' + (++seq) }, d); (tabelas[t] = tabelas[t] || []).push(reg); return reg; },
      log: () => {}
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty: () => {} }) },
    Utilities: { base64Encode: (b) => Buffer.from(b).toString('base64') },
    DriveApp: { getFileById: () => { throw new Error('sem arquivo'); } },
    exigirSessao: () => sessao.atual,
    isAdminSession: () => ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(sessao.atual.perfil)
  });
  for (const f of ['SGO_Utilis.js', 'SGO_Chaves.js', 'SGO_Conduta_Calculo.js', 'SGO_Conduta_Setup.js', 'SGO_Conduta_Ocorrencias.js', 'SGO_Conduta_Ciencia.js']) {
    vm.runInContext(ler(f), ctx, { filename: f });
  }
  ctx.Conduta_hojeISO_ = () => '2026-11-16';
  ctx.Conduta_exigirEquipe_ = () => sessao.atual;
  return { ctx, tabelas, sessao };
}

const RELATO = 'Na volta da O.S. em Anápolis, o veículo bateu a lateral direita no portão do estacionamento ao manobrar em velocidade.';
const OC = (extra) => Object.assign({
  ID: 'oc1', TIPO_CODIGO: 'VEI-08', COLABORADOR_ID: 'u_fin', FISCAL_ID: 'u_tec', DATA_FATO: '2026-11-12', COMPETENCIA: '2026-11',
  STATUS: 'HOMOLOGADA', NIVEL_APLICADO: 'GG', PESO_APLICADO: 0, PRAZO_CONTESTACAO: '2026-11-17', HOMOLOGADA_EM: '2026-11-12', HOMOLOGADA_POR: 'u_dir',
  FOTO_URL: 'https://sgo.exemplo.test/arquivos/FOTO123456789', FOTO_LEGENDA: 'Lateral direita amassada', DESCRICAO: RELATO,
  CRIADO_EM: '2026-11-12T13:05:00.000Z',
  HISTORICO_JSON: JSON.stringify([{ em: '2026-11-12T13:05:01.000Z', porId: 'u_dir', por: 'DORA DIRETORA', perfil: 'DIRETORIA', acao: 'HOMOLOGACAO', decisao: 'APROVAR', texto: 'Fato confirmado pela foto.', marca: '' }])
}, extra || {});

/** Nenhum Date cru em lugar nenhum da resposta (google.script.run quebra com Date). */
function semDate(v, onde) {
  if (v && typeof v === 'object') {
    assert.notEqual(Object.prototype.toString.call(v), '[object Date]', 'Date cru em ' + onde);
    for (const k of Object.keys(v)) semDate(v[k], onde + '.' + k);
  }
}

test('dono, Diretoria e Gestor de Qualidade (quem tem a caixa «Ver quem é o envolvido») leem o relato completo', () => {
  const amb = ambiente(S('u_dono'), [OC()]);
  for (const quem of ['u_dono', 'u_dir', 'u_qual']) {
    amb.sessao.atual = S(quem);
    const r = amb.ctx.Conduta_apiObterRelatoOcorrencia('s', { id: 'oc1' });
    assert.equal(r.success, true, quem);
    assert.equal(r.relato, RELATO, quem + ' lê o relato');
    assert.equal(r.temRelato, true);
    assert.equal(r.avisoSemRelato, '');
    assert.equal(r.codigo, 'VEI-08');
    assert.equal(r.regra, 'Dano ao veículo por imprudência');
    assert.equal(r.grupo, 'Veículos');
    assert.equal(r.nivelAplicado, 'GG');
    assert.equal(r.pesoAplicado, '0');
    assert.equal(r.envolvido, 'FABI FINANCEIRO');
    assert.equal(r.registradoPor, 'TEO TECNICO', quem + ' vê quem registrou');
    assert.equal(r.registradoEm, '12/11/2026 10:05', 'hora de Brasília');
    assert.equal(r.dataFato, '12/11/2026');
    assert.equal(r.competencia, '11/2026');
    assert.equal(r.situacaoRotulo, 'Homologada');
    assert.equal(r.prazoContestacao, '17/11/2026');
    assert.equal(r.temFoto, true);
    assert.equal(r.fotoLegenda, 'Lateral direita amassada');
    assert.equal(JSON.stringify(r).includes('FOTO123456789'), false, 'o endereço da foto não vai à tela');
    assert.deepEqual(JSON.parse(JSON.stringify(r.historico.map((p) => p.etapa))), ['Registro da ocorrência', 'Homologação']);
    assert.equal(r.historico[1].decisao, 'Aprovada');
    assert.equal(r.historico[1].por, 'DORA DIRETORA');
    assert.equal(r.historico[1].texto, 'Fato confirmado pela foto.');
    semDate(r, 'relato');
  }
  // A regra de quem passa é a mesma da caixa CONDUTA_VER_NOMES (padrão: gestão com sigilo = Diretoria, dono e Gestor de Qualidade).
  const ve = (id) => amb.ctx.Conduta_veIdentidadeUsuario_(USUARIOS().find((u) => u.ID === id));
  assert.equal(ve('u_qual'), true);
  assert.equal(ve('u_met'), false);
});

test('quem não tem o direito não lê: a mensagem diz o quê, por quê e o que fazer', () => {
  const amb = ambiente(S('u_met'), [OC()]);
  for (const quem of ['u_met', 'u_rh']) {
    amb.sessao.atual = S(quem);
    assert.throws(() => amb.ctx.Conduta_apiObterRelatoOcorrencia('s', { id: 'oc1' }), (e) => {
      assert.match(e.message, /^Não foi possível abrir o relato desta ocorrência/, 'o quê');
      assert.match(e.message, /por sigilo do colaborador/, 'por quê');
      assert.match(e.message, /peça à Diretoria ou ao Gestor de Qualidade/, 'o que fazer');
      assert.equal(e.message.includes(RELATO), false);
      return true;
    }, quem);
  }
  amb.sessao.atual = S('u_dir');
  assert.throws(() => amb.ctx.Conduta_apiObterRelatoOcorrencia('s', { id: 'naoexiste' }), /não foi encontrada\. Recarregue a lista/);
  assert.throws(() => amb.ctx.Conduta_apiObterRelatoOcorrencia('s', {}), /não foi informada/);
});

test('o envolvido lê o relato da própria ocorrência (para contestar), sem o nome de quem registrou; quem registrou também lê', () => {
  const amb = ambiente(S('u_fin'), [OC({ HISTORICO_JSON: JSON.stringify([{ em: '2026-11-12T13:05:01.000Z', porId: 'u_tec', por: 'TEO TECNICO', acao: 'HOMOLOGACAO_NO_REGISTRO', decisao: 'APROVAR', texto: 'Homologada no registro: lançada pela Administração (TEO TECNICO, 12/11/2026 10:05).', marca: '' }]) })]);
  const r = amb.ctx.Conduta_apiObterRelatoOcorrencia('s', { id: 'oc1' });
  assert.equal(r.relato, RELATO);
  assert.equal(r.souEnvolvido, true);
  assert.equal(r.registradoPor, 'Quem registrou (nome preservado)');
  assert.equal(JSON.stringify(r).includes('TEO TECNICO'), false, 'o nome de quem registrou não aparece em lugar nenhum');
  assert.equal(r.historico[1].etapa, 'Homologada no registro');
  amb.sessao.atual = S('u_tec');
  const f = amb.ctx.Conduta_apiObterRelatoOcorrencia('s', { id: 'oc1' });
  assert.equal(f.relato, RELATO);
  assert.equal(f.registradoPor, 'TEO TECNICO');
  assert.equal(f.souFiscal, true);
});

test('ocorrência antiga sem relato nem histórico: aviso claro no lugar do vazio e histórico reconstruído dos campos', () => {
  const antiga = OC({ ID: 'old', DESCRICAO: '', HISTORICO_JSON: '', CRIADO_EM: '', STATUS: 'FIRME', TIPO_CODIGO: 'COZ-01', DATA_FATO: '2026-09-24',
    COMPETENCIA: new Date(2026, 8, 1), HOMOLOGADA_EM: '2026-09-25T00:00:00', FIRME_EM: '2026-09-30', PRAZO_RECURSO: '2026-10-02', FOTO_URL: '', FOTO_LEGENDA: '' });
  const amb = ambiente(S('u_dono'), [antiga]);
  const r = amb.ctx.Conduta_apiObterRelatoOcorrencia('s', { id: 'old' });
  assert.equal(r.temRelato, false);
  assert.equal(r.relato, '');
  assert.match(r.avisoSemRelato, /^Relato não registrado: esta ocorrência foi gravada sem o texto "O que aconteceu"/);
  assert.match(r.avisoSemRelato, /pergunte a quem registrou \(TEO TECNICO\)/);
  assert.equal(r.competencia, '09/2026', 'competência que virou Date no Sheets sai como texto');
  assert.equal(r.temFoto, false);
  assert.deepEqual(JSON.parse(JSON.stringify(r.historico.map((p) => [p.quando, p.etapa, p.reconstruido]))), [
    ['24/09/2026', 'Registro da ocorrência', false],
    ['25/09/2026', 'Homologação', true],
    ['30/09/2026', 'Ficou firme', true]
  ]);
  assert.equal(r.historico[1].por, 'DORA DIRETORA');
  semDate(r, 'antiga');
  // o envolvido, na mesma situação, é orientado a perguntar à Diretoria ou à Qualidade (não a quem registrou)
  amb.sessao.atual = S('u_fin');
  const e = amb.ctx.Conduta_apiObterRelatoOcorrencia('s', { id: 'old' });
  assert.match(e.avisoSemRelato, /peça à Diretoria ou ao Gestor de Qualidade/);
  assert.equal(JSON.stringify(e).includes('TEO TECNICO'), false);
});

test('contestação, julgamento e recurso aparecem na ficha e no histórico, na ordem', () => {
  const oc = OC({ FISCAL_ID: 'u_tec', HISTORICO_JSON: '' , STATUS: 'HOMOLOGADA', HOMOLOGADA_EM: '2026-11-12' });
  const amb = ambiente(S('u_fin'), [oc]);
  amb.ctx.Conduta_obterParametros_ = () => ({ PRAZO_CONTESTACAO_DIAS_UTEIS: 3, PRAZO_JULGAMENTO_DIAS_UTEIS: 5, PRAZO_RECURSO_DIAS_UTEIS: 2 });
  amb.ctx.Conduta_apiContestarOcorrencia('s', { id: 'oc1', texto: 'O portão estava com defeito, há registro na portaria.' });
  amb.sessao.atual = S('u_qual');
  amb.ctx.Conduta_apiJulgarOcorrencia('s', { id: 'oc1', decisao: 'MANTER', textoJulgamento: 'Câmera mostra a manobra em velocidade.' });
  const r = amb.ctx.Conduta_apiObterRelatoOcorrencia('s', { id: 'oc1' });
  assert.equal(r.textoContestacao, 'O portão estava com defeito, há registro na portaria.');
  assert.equal(r.textoJulgamento, 'Câmera mostra a manobra em velocidade.');
  assert.equal(r.situacaoRotulo, 'Firme');
  assert.deepEqual(JSON.parse(JSON.stringify(r.historico.map((p) => p.etapa))), ['Registro da ocorrência', 'Homologação', 'Contestação do envolvido', 'Julgamento da contestação']);
  assert.equal(r.historico[3].decisao, 'Mantida (firme)');
  assert.equal(r.historico[3].por, 'QUINTINO QUALIDADE');
  assert.equal(r.historico.filter((p) => p.etapa === 'Ficou firme').length, 0, 'sem passo duplicado');
  semDate(r, 'julgada');
});

test('a API está liberada no roteador, sem "_" no fim, e nada da avaliação muda (só leitura)', () => {
  const src = ler('SGO_Conduta_Ocorrencias.js');
  assert.match(src, /apiObterRelatoOcorrencia: Conduta_apiObterRelatoOcorrencia,/);
  assert.match(src, /function Conduta_apiObterRelatoOcorrencia\(sessionId, payload\)/);
  const corpo = src.slice(src.indexOf('function Conduta_apiObterRelatoOcorrencia'), src.indexOf('\n}\n', src.indexOf('function Conduta_apiObterRelatoOcorrencia')));
  assert.equal(/SGO_DATA\.(update|insert|log)\(/.test(corpo), false, 'a API não grava nada');
  const oc = OC();
  const antes = JSON.stringify(oc);
  const amb = ambiente(S('u_dir'), [oc]);
  amb.ctx.Conduta_apiObterRelatoOcorrencia('s', { id: 'oc1' });
  assert.equal(JSON.stringify(oc), antes, 'a ocorrência fica igual');
});

test('tela do computador: "Ver relato" em toda linha da lista e nas janelas de contestar e recorrer', () => {
  const ctx = vm.createContext({});
  vm.runInContext(ler('SGO_Conduta_ConteudoModulo.js'), ctx);
  const html = ctx.Conduta_obterConteudoModulo();
  const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const tela = vm.createContext({ console, escapeHtml_: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    document: { getElementById: () => null }, window: {}, USER_CONTEXT: { perfil: 'ADMIN' } });
  vm.runInContext(js, tela);
  for (const st of ['REGISTRADA', 'HOMOLOGADA', 'CONTESTADA', 'FIRME', 'ANULADA', 'DESCARTADA', 'REJEITADA', 'EM_RECURSO']) {
    const acoes = tela.tplConduta_acoesOcorrencia_({ ID: 'oc1', STATUS: st });
    assert.match(acoes, /onclick="SGO_condutaVerRelato_\(this\.dataset\.ocorrencia\)">Ver relato<\/button>/, st);
  }
  assert.match(js, /tplConduta_abrirModal_\('Contestar ocorrência',[\s\S]{0,400}Ver o relato completo/);
  assert.match(js, /tplConduta_abrirModal_\('Recorrer de ocorrência firme',[\s\S]{0,400}Ver o relato completo/);
  const core = ler('JS_Core.html');
  assert.match(core, /function SGO_condutaVerRelato_\(ocorrenciaId\)/);
  assert.match(core, /fn: "apiObterRelatoOcorrencia"/);
  assert.match(core, />Ver relato<\/button>/, 'cartão do celular');
  assert.match(core, />Ver o relato completo<\/button>/, 'defesa no celular');
});

test('ajuda e manuais explicam o relato', () => {
  const ctx = vm.createContext({});
  vm.runInContext(ler('SGO_Ajuda_Conduta.js'), ctx);
  const a = ctx.SGO_ajudaTelas_Conduta_();
  assert.ok(a.conduta.passos.some((p) => p.titulo === 'Ler o relato de uma ocorrência'));
  assert.ok(a.conduta.problemas.some((p) => /Relato não registrado/.test(p.situacao)));
  assert.ok(a['conduta/ocorrencias'].passos.some((p) => /Reler o relato/.test(p.titulo)));
  const docs = path.join(__dirname, '../docs');
  assert.match(fs.readFileSync(path.join(docs, 'MANUAL_CONDUTA_FISCAL.md'), 'utf8'), /### Reler o relato de uma ocorrência \(16\/11\/2026\)/);
  assert.match(fs.readFileSync(path.join(docs, 'MANUAL_CONDUTA_COLABORADOR.md'), 'utf8'), /### Ler o relato de uma ocorrência \(16\/11\/2026\)/);
});

// Celular: a janela do relato em 390 e 320 px, sem rolagem lateral, texto justificado, aviso de relato ausente.
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
test('celular: janela do relato sem rolagem lateral, com texto justificado e aviso de relato ausente', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const INC = /<\?!=\s*include\('([^']+)'\);\s*\?>/g;
  const VER = /<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/;
  const html = ler('Index.html').replace(INC, (m, f) => ler(f + '.html')).replace(VER, '""');
  const saida = path.join(__dirname, '../output/conduta-20261116/capturas'); // fixo: o rodar-lista.sh aponta CAPTURAS para outra pasta
  fs.mkdirSync(saida, { recursive: true });
  const amb = ambiente(S('u_dono'), [OC(), OC({ ID: 'old', DESCRICAO: '', HISTORICO_JSON: '', CRIADO_EM: '', FOTO_URL: '' })]);
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [390, 320]) {
      const page = await browser.newPage({ viewport: { width: largura, height: 844 }, isMobile: true, hasTouch: true });
      const erros = [], dialogos = [];
      page.on('pageerror', (e) => erros.push(e.message));
      page.on('dialog', (d) => { dialogos.push(d.message()); d.accept().catch(() => {}); });
      await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : r.abort()));
      await page.exposeFunction('qaRun', (fn, args) => {
        if (fn === 'getSessaoAtual') return { ok: true, valor: { success: true, session: { sessionId: 's1', email: 'teste@exemplo.com', nome: 'Teste', perfil: 'ADMIN' } } };
        if (fn === 'Conduta_apiDispatch' && args[0] && args[0].fn === 'apiObterRelatoOcorrencia') {
          const id = args[0].payload.id;
          if (id === 'proibida') { return { ok: false, erro: 'Não foi possível abrir o relato desta ocorrência: por sigilo do colaborador, teste.' }; }
          return { ok: true, valor: JSON.parse(JSON.stringify(amb.ctx.Conduta_apiObterRelatoOcorrencia('s', { id }))) };
        }
        return { ok: true, valor: { success: true } };
      });
      await page.addInitScript(() => {
        try { sessionStorage.setItem('SGO_SESSION', 's1'); } catch (e) {}
        const corredor = (okf, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(okf, f) : k === 'withUserObject' ? () => corredor(okf, falha) :
          (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (okf) okf(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
        window.google = { script: { run: corredor(null, null) } };
      });
      await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof SGO_condutaVerRelato_ === 'function');
      await page.evaluate(() => SGO_condutaVerRelato_('oc1'));
      await page.locator('#sgoCondutaRelato').waitFor();
      const txt = await page.locator('#sgoCondutaRelato').innerText();
      assert.ok(txt.includes('Na volta da O.S. em Anápolis'), 'relato na tela');
      assert.ok(txt.includes('Registrada por: TEO TECNICO'));
      assert.ok(txt.includes('Histórico'));
      const just = await page.evaluate(() => Array.from(document.querySelectorAll('#sgoCondutaRelato div')).some((d) => d.textContent.startsWith('Na volta da O.S.') && getComputedStyle(d).textAlign === 'justify'));
      assert.ok(just, 'relato justificado');
      assert.ok((await page.locator('#sgoCondutaRelato [data-x="fechar"]').boundingBox()).height >= 44, 'Fechar com toque grande');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem lateral');
      await page.screenshot({ path: path.join(saida, largura + '-relato.png'), fullPage: false });
      await page.click('#sgoCondutaRelato [data-x="fechar"]');
      assert.equal(await page.locator('#sgoCondutaRelato').count(), 0);
      // ocorrência antiga: aviso no lugar do vazio
      await page.evaluate(() => SGO_condutaVerRelato_('old'));
      await page.locator('#sgoCondutaRelato [data-x="sem-relato"]').waitFor();
      assert.match(await page.locator('#sgoCondutaRelato [data-x="sem-relato"]').innerText(), /Relato não registrado/);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem lateral (antiga)');
      await page.screenshot({ path: path.join(saida, largura + '-relato-antigo.png'), fullPage: false });
      await page.click('#sgoCondutaRelato [data-x="fechar"]');
      // recusa: o motivo do servidor chega inteiro
      await page.evaluate(() => SGO_condutaVerRelato_('proibida'));
      for (let i = 0; i < 100 && !dialogos.length; i++) await page.waitForTimeout(30);
      assert.match(dialogos[0] || '', /^Não foi possível abrir o relato desta ocorrência: por sigilo do colaborador/);
      assert.deepEqual(erros, []);
      await page.close();
    }
  } finally { await browser.close(); }
});

test('16/11/2026 (decisão do dono): a lista não manda ao envolvido quem registrou nem o histórico; configurável em Chaves e senhas', () => {
  const hist = JSON.stringify([{ em: '2026-11-12T13:05:01.000Z', porId: 'u_tec', por: 'TEO TECNICO', acao: 'REGISTRO', decisao: '', texto: 'Registrada' }]);
  const amb = ambiente(S('u_fin'), [OC({ HISTORICO_JSON: hist })]);
  const props = {};
  amb.ctx.PropertiesService = { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); } }) };
  const lista = () => { const r = amb.ctx.Conduta_apiListarOcorrencias('s', {}); return JSON.stringify(r); };
  const l1 = lista();
  assert.ok(l1.includes('oc1'), 'a ocorrência aparece para o envolvido');
  assert.equal(l1.includes('TEO TECNICO'), false, 'nome de quem registrou fora dos dados da lista');
  assert.equal(l1.includes('u_tec'), false, 'nem o código de quem registrou');
  props.CONDUTA_ENVOLVIDO_VE_QUEM_REGISTROU = 'SIM';
  assert.ok(lista().includes('TEO TECNICO'), 'com a configuração SIM, o envolvido vê quem registrou');
  assert.equal(amb.ctx.Conduta_apiObterRelatoOcorrencia('s', { id: 'oc1' }).registradoPor, 'TEO TECNICO');
  // quem decide continua vendo
  delete props.CONDUTA_ENVOLVIDO_VE_QUEM_REGISTROU;
  amb.sessao.atual = S(USUARIOS().find((u) => u.PERFIL === 'DIRETORIA').ID);
  assert.ok(lista().includes('TEO TECNICO'), 'a Diretoria vê quem registrou');
});
