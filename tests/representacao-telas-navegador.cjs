// Telas da Representação em Chromium real (11/11/2026), como o servidor entrega: a página completa (Index.html com todos os
// includes e o google.script.run do servidor), o /api/run executando o legado real do pacote em memória (tests/_assistencia_ambiente.cjs,
// só dados fictícios), a rota real do vídeo (dist/servicos/midiaRepresentacao.js) e /arquivos com faixa de bytes (Range).
// Uso: DEST=<pasta legado do pacote> node --require <fontes.cjs> tests/representacao-telas-navegador.cjs <pasta das capturas>
// Não é um *.test.cjs (precisa do Chromium e do Fastify do sgo_servidor): roda à parte e grava capturas + resultado.json.
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const SGOS = path.join(__dirname, '..', '..', 'sgo_servidor', 'node_modules');
const { chromium } = require(path.join(SGOS, 'playwright'));
const Fastify = require(path.join(SGOS, 'fastify'));
const { ambiente, ok } = require('./_assistencia_ambiente.cjs');

const LEGADO = path.resolve(process.env.DEST);
const DIST = path.join(LEGADO, '..', 'dist');
const SAIDA = path.resolve(process.argv[2] || '.');
fs.mkdirSync(SAIDA, { recursive: true });
// 11/11/2026: o servidor carrega todos os arquivos do legado; a régua de prazos da representada (SGO_Representacao_Regua.js) entra como em produção
const EXTRAS = ['SGO_CadastroQualidade.js', 'SGO_Clientes.js', 'SGO_Representacao_Config.js', 'SGO_Representacao.js', 'SGO_Representacao_Avisos.js', 'SGO_Representacao_Alertas.js', 'SGO_Representacao_Modelos.js', 'SGO_Representacao_Painel.js',
  'SGO_Gantt_Layout.js', 'SGO_Representacao_Documentos.js', 'SGO_Representacao_Midia.js', 'SGO_Ajuda_Representacao.js', 'SGO_Representacao_Regua.js'];
const resultados = [];
const reg = (nome, passou, det) => { resultados.push({ nome, ok: !!passou, det: det || '' }); console.log((passou ? 'PASS ' : 'FAIL ') + nome + (det ? ' — ' + det : '')); };

/** Página como o servidor monta: includes do Index resolvidos e o google.script.run do servidor no <head>. */
function pagina() {
  let html = fs.readFileSync(path.join(LEGADO, 'Index.html'), 'utf8');
  html = html.replace(/<\?!=\s*include\('([^']+)'\);?\s*\?>/g, (_m, f) => fs.readFileSync(path.join(LEGADO, f + '.html'), 'utf8'));
  if (/<\?/.test(html)) throw new Error('scriptlet não resolvido no Index.html');
  const cab = '<meta charset="utf-8"><script src="/_sgo/google-script.js"></script>';
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + cab) : '<!DOCTYPE html><html><head>' + cab + '</head><body>' + html + '</body></html>';
}

async function servidor(a) {
  const { rotasMidiaRepresentacao, faixaPedida } = await import(pathToFileURL(path.join(DIST, 'servicos', 'midiaRepresentacao.js')).href);
  const app = Fastify({ logger: false, bodyLimit: 72 * 1024 * 1024 });
  await app.register(require(path.join(SGOS, '@fastify', 'cookie')));
  const html = pagina(), shim = fs.readFileSync(path.join(DIST, 'publico', 'google-script.js'), 'utf8');
  app.get('/', async (_q, r) => r.type('text/html; charset=utf-8').send(html));
  app.get('/_sgo/google-script.js', async (_q, r) => r.type('application/javascript; charset=utf-8').send(shim));
  const chamadas = [];
  app.post('/api/run', async (q, r) => {
    const { fn, args } = q.body || {};
    chamadas.push(fn);
    if (fn === 'getSessaoAtual') {
      const s = a.sessoes[args[0]];
      if (!s) return { ok: true, valor: { success: false } };
      return { ok: true, valor: { success: true, session: Object.assign({ sessionId: args[0], nome: s.nome, perfil: s.perfil, userId: s.userId, usuario: s.usuario }, s.perfil === 'REPRESENTADA' ? { representadaId: s.representadaId } : {}) } };
    }
    if (typeof a.ctx[fn] !== 'function') return { ok: true, valor: null };
    try { return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn].apply(null, args || []) ?? null)) }; } catch (e) { return { ok: false, erro: String(e && e.message || e) }; }
  });
  app.get('/arquivos/:id', async (q, r) => {
    const x = a.arquivos[q.params.id];
    if (!x) return r.code(404).send('não encontrado');
    r.type(x.mime).header('Accept-Ranges', 'bytes');
    const f = faixaPedida(q.headers.range, x.bytes.length);
    if (f === 'fora') return r.code(416).send();
    if (f) return r.code(206).header('Content-Range', `bytes ${f.ini}-${f.fim}/${x.bytes.length}`).send(x.bytes.subarray(f.ini, f.fim + 1));
    return r.send(x.bytes);
  });
  rotasMidiaRepresentacao(app, {
    sessao: async (q) => { const sid = q.cookies && q.cookies.sgo_sessao; return a.sessoes[sid] ? { id: sid } : null; },
    executar: async (fn, args) => { try { return { ok: true, valor: JSON.parse(JSON.stringify(a.ctx[fn].apply(null, args))) }; } catch (e) { return { ok: false, erro: String(e.message || e) }; } },
    gravar: async (d) => { const f = a.ctx.DriveApp.getFolderById(d.pasta_id).createFile(a.ctx.Utilities.newBlob(Buffer.from(d.base64, 'base64'), d.tipo, d.nome)); return { id: f.getId() }; },
    descartar: async () => true,
    log: () => {}
  });
  await app.listen({ port: 0, host: '127.0.0.1' });
  return { app, url: 'http://127.0.0.1:' + app.server.address().port, chamadas };
}

/** Dados fictícios: representadas, um pedido com chamado aceito (3 dias úteis), outro pedido na fila, imagens. */
function dados(a, imgPng) {
  a.tabelas.REP_REPRESENTADAS = [
    { ID: 'repA', NOME: 'REPRESENTADA ALFA TESTE', SITUACAO: 'ATIVA', PRAZOS_JSON: '' },
    { ID: 'repB', NOME: 'BRASMEDICAL TESTE', SITUACAO: 'ATIVA', PRAZOS_JSON: JSON.stringify({ aceiteMin: 1710 }) }
  ];
  const u = { ID: 'rb_q', USUARIO: 'qualidade', NOME: 'QUALIDADE BRASMEDICAL TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'qualidade@brasmedical.exemplo.test', REPRESENTADA_ID: 'repB', REPRESENTACAO_PAPEL: 'ADMIN' };
  a.tabelas.CAD_USUARIOS.push(u);
  a.sessoes.s_qualidade = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: 'REPRESENTADA', representadaId: 'repB' };
  const rep = (sid, acao, d) => a.ctx.Representacao_api(sid, acao, d || {});
  const foto = { nome: 'abertura.png', tipo: 'image/png', base64: imgPng };
  const abrir = (eq, serie, sintoma) => {
    ok(rep('s_qualidade', 'buscarCliente', { documento: '11.222.333/0001-81' }));
    ok(rep('s_qualidade', 'buscarEquipamento', { clienteId: 'c1', serie }));
    return ok(rep('s_qualidade', 'abrir', { clienteId: 'c1', unidadeId: 'un1', equipamentoId: eq, protocolo: 'BM-' + serie, setor: 'CME', contatoNome: 'Rui Responsável Teste', contatoTelefone: '62988887777',
      contatoEmail: 'rui@alfa.exemplo.test', sintoma, inicio: 'ontem', codigoErro: 'E12', parada: 'TOTAL', risco: 'Sem esterilização', tentado: 'Religamos', enquadramento: 'GARANTIA', fotos: [foto], fotosEtiqueta: [Object.assign({}, foto, { nome: 'etiqueta.png' })] })).solicitacao;
  };
  const p1 = abrir('eq1', 'S-100', 'A autoclave interrompe o ciclo com alarme de baixa pressão de vapor.');
  a.mudar('2026-10-19T11:00:00-03:00');
  const c1 = ok(rep('s_gil', 'aceitar', { solicitacaoId: p1.id, prioridade: 'P1' })).chamado;
  ok(rep('s_gil', 'enviarImagens', { refTipo: 'CHAMADO', refId: c1.id, imagens: [{ nome: 'valvula.png', tipo: 'image/png', base64: imgPng, legenda: 'Válvula de vapor com vazamento' }] }));
  ok(rep('s_gil', 'enviarMensagem', { refTipo: 'CHAMADO', refId: c1.id, texto: 'Recebemos. Vamos estudar o caso e agendar a visita.' }));
  a.mudar('2026-10-19T14:00:00-03:00');
  const p2 = abrir('eq2', 'S-200', 'A lavadora não aquece a água e para no meio do ciclo com alarme.');
  // 11/11/2026 (régua de prazos): o chamado foi agendado, atendido e ficou aguardando peça; a Metrolabs pediu mais prazo para o relatório
  a.api('s_dora', 'iniciar', {});
  a.mudar('2026-10-19T15:00:00-03:00');
  ok(a.api('s_gil', 'triagem', { id: c1.id, checklist: { sintomas_confirmados: 'Confirmado', risco_operar: 'Alto', diagnostico_preliminar: 'Válvula de vapor' }, acao: 'PLANEJADO', tipoCodigo: 'MANUTENCAO_CORRETIVA' }));
  ok(a.api('s_gil', 'agendar', { id: c1.id, tecnicoId: 'u_tec', inicio: '2026-10-20T08:00', duracaoMin: 60, tipoCodigo: 'MANUTENCAO_CORRETIVA',
    preparo: { ferramentas: true, instrumentos: true, acesso: true, documentacao: true, pecas: false, pecasJustificativa: 'visita de diagnóstico', risco: 'baixo' } }));
  const mudar = (para, campos) => { const eu = a.ctx.Ast_eu_('s_gil'); a.ctx.Ast_memoLimpar_(); a.ctx.Ast_comTrava_(() => a.ctx.AstC_mudar_(eu, a.ctx.Ast_porId_('ATEC_CHAMADOS', c1.id), para, campos || {}, para, 'Para ' + para)); };
  a.mudar('2026-10-20T08:05:00-03:00'); mudar('NO_LOCAL'); mudar('EM_EXECUCAO');
  a.mudar('2026-10-20T09:00:00-03:00'); mudar('AGUARDANDO_PECA', { PECA_DESCRICAO: 'Válvula solenoide de vapor 1/2' });
  ok(rep('s_gil', 'pedirProrrogacao', { id: c1.id, etapa: 'RELATORIO:1', novaData: '2026-10-26', motivo: 'Aguardando o laudo do fabricante da válvula' }));
  a.mudar('2026-10-20T09:30:00-03:00');
  return { p1, c1, p2 };
}

(async () => {
  const a = ambiente({ extras: EXTRAS });
  const nav = await chromium.launch();
  // imagem e vídeo de verdade, feitos no próprio Chromium (PNG de uma tela colorida; WEBM de um canvas animado)
  const g = await nav.newPage();
  await g.setContent('<div style="width:640px;height:480px;background:linear-gradient(135deg,#0b3d6e,#1f7a4d);color:#fff;font:bold 48px sans-serif;display:flex;align-items:center;justify-content:center">E12</div>');
  const png = (await g.locator('div').screenshot()).toString('base64');
  const webm = await g.evaluate(() => new Promise((ok) => {
    const cv = document.createElement('canvas'); cv.width = 320; cv.height = 240; const x = cv.getContext('2d'); let t = 0;
    const rec = new MediaRecorder(cv.captureStream(15), { mimeType: 'video/webm' }), partes = [];
    rec.ondataavailable = (e) => partes.push(e.data);
    rec.onstop = () => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1]); fr.readAsDataURL(new Blob(partes, { type: 'video/webm' })); };
    const quadro = () => { x.fillStyle = 'hsl(' + (t * 12) + ',60%,40%)'; x.fillRect(0, 0, 320, 240); x.fillStyle = '#fff'; x.font = '40px sans-serif'; x.fillText('Alarme ' + t, 60, 130); t++; if (t < 30) setTimeout(quadro, 66); else rec.stop(); };
    rec.start(); quadro();
  }));
  await g.close();
  const vidPath = path.join(SAIDA, 'video-teste.webm');
  fs.writeFileSync(vidPath, Buffer.from(webm, 'base64'));
  const imgPath = path.join(SAIDA, 'imagem-teste.png');
  fs.writeFileSync(imgPath, Buffer.from(png, 'base64'));
  const k = dados(a, png);
  const srv = await servidor(a);

  async function abrirComo(sid, largura) {
    const ctxN = await nav.newContext({ viewport: { width: largura, height: largura < 500 ? 844 : 900 }, isMobile: largura < 500, hasTouch: largura < 500 });
    await ctxN.addCookies([{ name: 'sgo_sessao', value: sid, url: srv.url }]);
    await ctxN.addInitScript((s) => { try { sessionStorage.setItem('SGO_SESSION', s); } catch (e) {} window.confirm = () => { window.__confirmou = (window.__confirmou || 0) + 1; return true; }; window.prompt = () => { window.__prompt = (window.__prompt || 0) + 1; return null; }; }, sid);
    const pg = await ctxN.newPage();
    const erros = [];
    pg.on('pageerror', (e) => erros.push(e.message));
    pg.on('dialog', (d) => d.dismiss());
    await pg.goto(srv.url + '/');
    return { pg, ctxN, erros };
  }
  const semRolagem = async (pg, larg) => (await pg.evaluate(() => document.documentElement.scrollWidth)) <= larg;
  const foto = (pg, nome) => pg.screenshot({ path: path.join(SAIDA, nome), fullPage: false });

  for (const larg of [390, 1366]) {
    // ---------- REPRESENTADA (login "qualidade") ----------
    const r = await abrirComo('s_qualidade', larg);
    const pg = r.pg;
    await pg.waitForSelector('#rpPnCorpo .atv-kanban, #rpPnCorpo [class*="kanban"]', { timeout: 15000 }).catch(() => {});
    const sub = await pg.locator('.atv-sub').first().innerText().catch(() => '');
    reg(larg + ' representada: painel abre direto, com os prazos combinados em dias úteis', /3 dias úteis/.test(sub) && /aceite do pedido em 3 dias úteis/.test(sub), sub.slice(0, 200));
    const kanbanTxt = await pg.locator('#rpPnCorpo').innerText();
    reg(larg + ' representada: Kanban com os pedidos e chamados dela (sem outra representada)', kanbanTxt.includes(k.c1.numero) && !/REPRESENTADA ALFA/.test(kanbanTxt));
    reg(larg + ' representada: sem rolagem lateral no Painel', await semRolagem(pg, larg));
    await foto(pg, `rep-${larg}-painel-kanban.png`);
    await pg.click('#rpPnAbas [data-a="gantt"], #rpPnAbas button:has-text("Gantt")');
    await pg.waitForTimeout(400);
    const gTxt = await pg.locator('#rpPnCorpo').innerText();
    reg(larg + ' representada: Gantt desenhado', /SOL-|CH-/.test(gTxt) || (await pg.locator('#rpPnCorpo svg, #rpPnCorpo .pna-gantt, #rpPnCorpo [class*="gantt"]').count()) > 0);
    reg(larg + ' representada: sem rolagem lateral no Gantt', await semRolagem(pg, larg));
    await foto(pg, `rep-${larg}-painel-gantt.png`);
    // ficha do chamado com a galeria
    await pg.click('#rpAbas [data-a="chamados"]');
    await pg.waitForSelector('[data-t="CHAMADO"]');
    await pg.click('[data-t="CHAMADO"]');
    await pg.waitForSelector('#rpGalFicha .rp-gal-item', { timeout: 15000 });
    const nIni = await pg.locator('#rpGalFicha .rp-gal-item').count();
    reg(larg + ' representada: galeria do chamado com as imagens do pedido e a da Metrolabs (miniaturas)', nIni >= 3, 'itens=' + nIni);
    // 11/11/2026: a caixa da régua de prazos fica acima da galeria; as miniaturas (carregamento sob demanda) só baixam quando a galeria aparece na tela
    await pg.locator('#rpGalFicha').scrollIntoViewIfNeeded();
    const imgOk = await pg.waitForFunction(() => { const l = document.querySelectorAll('#rpGalFicha .rp-gal-item img'); return l.length && Array.prototype.every.call(l, (i) => i.complete && i.naturalWidth > 0); }, null, { timeout: 8000 }).then(() => true, () => false);
    reg(larg + ' representada: todas as miniaturas carregadas de /arquivos', imgOk);
    // anexar imagem + vídeo pela tela (o vídeo sobe pela rota própria)
    const pfx = await pg.locator('#rpGalFicha input[type=file][accept*="image"]').getAttribute('id');
    await pg.setInputFiles('#' + pfx, imgPath);
    await pg.setInputFiles('#' + pfx.replace(/Img$/, 'Vid'), vidPath);
    await pg.fill('#' + pfx.replace(/Img$/, 'Leg'), 'Visor com o erro E12 (' + larg + ' px)');
    await pg.click('#' + pfx.replace(/^rp_/, '').replace(/Img$/, 'Enviar'));
    await pg.waitForFunction((n) => document.querySelectorAll('#rpGalFicha .rp-gal-item').length >= n + 2, nIni, { timeout: 20000 }).catch(() => {});
    const nFim = await pg.locator('#rpGalFicha .rp-gal-item').count();
    const msgGal = await pg.locator('#rpGalFicha .at-faixa').first().innerText().catch(() => '');
    reg(larg + ' representada: anexou imagem e vídeo pela tela (vídeo pela rota própria, sem janelinha)', nFim === nIni + 2 && /Vídeo anexado/.test(msgGal) && !(await pg.evaluate(() => window.__prompt || window.__confirmou)), 'itens ' + nIni + '→' + nFim + '; ' + msgGal.slice(0, 160));
    reg(larg + ' representada: sem rolagem lateral na ficha com a galeria', await semRolagem(pg, larg));
    await pg.locator('#rpGalFicha').scrollIntoViewIfNeeded();
    await foto(pg, `rep-${larg}-ficha-galeria.png`);
    // player do vídeo
    await pg.locator('#rpGalFicha .rp-gal-item:has(video)').last().click();
    await pg.waitForSelector('#rpGalVer video');
    const tocou = await pg.evaluate(() => new Promise((ok) => { const v = document.querySelector('#rpGalVer video'); if (v.readyState >= 1) return ok(v.duration > 0); v.addEventListener('loadedmetadata', () => ok(v.duration > 0)); v.addEventListener('error', () => ok(false)); setTimeout(() => ok(false), 8000); }));
    reg(larg + ' representada: player abre o vídeo (metadados lidos pelo /arquivos com Range)', tocou);
    await foto(pg, `rep-${larg}-player-video.png`);
    await pg.click('#rpGalVer [data-x="fechar"]');
    // relatório A4 do atendimento pela representada
    await pg.click('#rpGerarRel');
    await pg.waitForSelector('#rpRelLista a[href*="/arquivos/"]', { timeout: 15000 }).catch(() => {});
    const links = await pg.locator('#rpRelLista a[href*="/arquivos/"]').count();
    reg(larg + ' representada: gerou o relatório A4 do atendimento (links HTML e PDF para baixar)', links >= 2, 'links=' + links);
    // o relatório abre no visor de documentos: volta para a ficha
    if (await pg.locator('.sgo-visor [data-sgo-fechar]').count()) { await pg.click('.sgo-visor [data-sgo-fechar]'); await pg.waitForTimeout(300); }
    // régua de prazos na ficha: 390 informa a previsão da peça e recusa o pedido de mais prazo; 1366 aceita o novo pedido
    await pg.waitForSelector('#rpRegua h3', { timeout: 15000 });
    const rgTxt = await pg.locator('#rpRegua').innerText();
    reg(larg + ' representada: régua de prazos na ficha (etapas, com quem, prazo vigente)', /Régua de prazos/.test(rgTxt) && /Estudar o caso e agendar/.test(rgTxt) && /Relatório do atendimento/.test(rgTxt), rgTxt.replace(/\s+/g, ' ').slice(0, 220));
    if (larg === 390) {
      reg(larg + ' representada: pendência "Informe a previsão da peça" com o formulário', /Informe a previsão da peça/.test(rgTxt) && (await pg.locator('#rpRegua input[type=date]').count()) >= 1);
      await pg.locator('#rpRegua input[type=date]').first().scrollIntoViewIfNeeded();
      await foto(pg, `rep-${larg}-regua-pendencias.png`);
      await pg.fill('#rpRegua [id^="rp_pcPrevisao"]', '2026-11-20');
      await pg.fill('#rpRegua [id^="rp_pcObs"]', 'Envio pela transportadora');
      await pg.click('#rpRegua [id^="rpRgPrevOk"]');
      await pg.waitForFunction(() => /Previsão de chegada da peça gravada/.test((document.querySelector('#rpRegua') || {}).innerText || ''), null, { timeout: 15000 }).catch(() => {});
      const t2 = await pg.locator('#rpRegua').innerText();
      reg(larg + ' representada: informou a previsão da peça pela tela (sem janelinha)', /Previsão de chegada da peça gravada: 20\/11\/2026/.test(t2) && !(await pg.evaluate(() => window.__prompt || window.__confirmou)), t2.replace(/\s+/g, ' ').slice(0, 200));
      await pg.click('#rpRegua [id^="rpRgRecusar"]');
      await pg.waitForTimeout(500);
      const semMotivo = await pg.locator('#rpRegua').innerText();
      reg(larg + ' representada: recusar sem motivo é barrado com a explicação', /motivo da recusa/.test(semMotivo));
      await pg.fill('#rpRegua [id^="rp_prMotivo"]', 'O cliente precisa do relatório para a auditoria');
      await pg.click('#rpRegua [id^="rpRgRecusar"]');
      await pg.waitForFunction(() => /Pedido de mais prazo recusado/.test((document.querySelector('#rpRegua') || {}).innerText || ''), null, { timeout: 15000 }).catch(() => {});
      const t3 = await pg.locator('#rpRegua').innerText();
      reg(larg + ' representada: recusou o pedido de mais prazo com o motivo (histórico na régua)', /Pedido de mais prazo recusado/.test(t3) && /Recusada pela representada/.test(t3), t3.replace(/\s+/g, ' ').slice(0, 200));
    } else {
      reg(larg + ' representada: novo pedido de mais prazo aguardando a resposta dela', /A Metrolabs pediu mais prazo/.test(rgTxt));
      await pg.locator('#rpRegua [id^="rpRgAceitar"]').scrollIntoViewIfNeeded();
      await foto(pg, `rep-${larg}-regua-pendencias.png`);
      await pg.click('#rpRegua [id^="rpRgAceitar"]');
      await pg.waitForFunction(() => /Pedido de mais prazo aceito/.test((document.querySelector('#rpRegua') || {}).innerText || ''), null, { timeout: 15000 }).catch(() => {});
      const t4 = await pg.locator('#rpRegua').innerText();
      reg(larg + ' representada: aceitou o pedido de mais prazo (vale a nova data; "prorrogado" na etapa)', /Pedido de mais prazo aceito/.test(t4) && /prorrogado/.test(t4), t4.replace(/\s+/g, ' ').slice(0, 200));
    }
    reg(larg + ' representada: sem rolagem lateral na régua', await semRolagem(pg, larg));
    await pg.locator('#rpRegua').scrollIntoViewIfNeeded();
    await foto(pg, `rep-${larg}-regua.png`);
    reg(larg + ' representada: nenhum erro de script na página', r.erros.length === 0, r.erros.slice(0, 3).join(' | '));
    await r.ctxN.close();

    // ---------- METROLABS (gestor técnico) ----------
    const m = await abrirComo('s_gil', larg);
    const pm = m.pg;
    await pm.waitForFunction(() => typeof abrir === 'function' && typeof Representacao_render_ === 'function', null, { timeout: 15000 });
    await pm.evaluate(() => abrir('representacao'));
    await pm.waitForSelector('#rpPnCorpo', { timeout: 15000 });
    await pm.waitForTimeout(500);
    await pm.selectOption('#rpPnRep', 'repB');
    await pm.waitForTimeout(600);
    const kTxt = await pm.locator('#rpPnCorpo').innerText();
    reg(larg + ' Metrolabs: Kanban de todas as representadas com filtro (Brasmedical)', kTxt.includes(k.c1.numero));
    reg(larg + ' Metrolabs: sem rolagem lateral no Painel', await semRolagem(pm, larg));
    await foto(pm, `met-${larg}-painel-kanban.png`);
    await pm.click('#rpPnAbas button:has-text("Gantt")');
    await pm.waitForTimeout(400);
    await foto(pm, `met-${larg}-painel-gantt.png`);
    // pedido na fila com a galeria
    await pm.click('#rpAbas [data-a="pedidos"]');
    await pm.waitForSelector('#rpCorpo [data-i]');
    await pm.click('#rpCorpo [data-i]');
    await pm.waitForSelector('#rpGalPedido .rp-gal-item', { timeout: 15000 });
    reg(larg + ' Metrolabs: pedido mostra a galeria com "Só para a Metrolabs"', (await pm.locator('#rpGalPedido input[type=checkbox]').count()) === 1);
    await pm.locator('#rpGalPedido').scrollIntoViewIfNeeded();
    await foto(pm, `met-${larg}-pedido-galeria.png`);
    // representadas: prazo de atendimento do chamado com a conversão
    await pm.click('#rpAbas [data-a="representadas"]');
    await pm.waitForSelector('#rpCorpo [data-i]');
    const card = await pm.locator('#rpCorpo [data-i]').filter({ hasText: 'BRASMEDICAL' }).innerText();
    reg(larg + ' Metrolabs: cartão da representada com os prazos em dias úteis', /Aceite em 3 dias úteis/.test(card) && /atendimento do chamado em 3 dias úteis/.test(card), card.replace(/\s+/g, ' ').slice(0, 160));
    await pm.locator('#rpCorpo [data-i]').filter({ hasText: 'BRASMEDICAL' }).click();
    await pm.waitForSelector('#rp_atendimentoMin');
    const conv = await pm.locator('#rpPz_atendimentoMin').innerText();
    await pm.fill('#rp_atendimentoMin', '1140');
    const conv2 = await pm.locator('#rpPz_atendimentoMin').innerText();
    reg(larg + ' Metrolabs: campo do prazo de atendimento mostra a conversão ao digitar', conv === '= 3 dias úteis' && conv2 === '= 2 dias úteis', conv + ' / ' + conv2);
    await pm.locator('#rp_atendimentoMin').scrollIntoViewIfNeeded();
    reg(larg + ' Metrolabs: sem rolagem lateral no formulário de prazos', await semRolagem(pm, larg));
    await foto(pm, `met-${larg}-prazos.png`);
    // ficha do chamado na Assistência: galeria na parte "Representação"
    await pm.evaluate((id) => Assistencia_irPara_({ mod: 'assistencia', id }), k.c1.id);
    await pm.waitForSelector('#atRepGal .rp-gal-item', { timeout: 20000 }).catch(() => {});
    const nAst = await pm.locator('#atRepGal .rp-gal-item').count();
    const prazoAst = await pm.locator('#atGavetaCorpo').innerText().catch(() => '');
    reg(larg + ' Metrolabs: ficha do chamado na Assistência com a galeria e "Prazo da representada (3 dias úteis)"', nAst >= 3 && /Prazo da representada BRASMEDICAL TESTE \(3 dias úteis\)/.test(prazoAst), 'itens=' + nAst);
    if (nAst) { await pm.locator('#atRepGal').scrollIntoViewIfNeeded(); await foto(pm, `met-${larg}-assistencia-galeria.png`); }
    // régua de prazos na ficha do chamado: 390 pede mais prazo; 1366 registra a chegada da peça
    await pm.waitForSelector('#atRepRegua h3', { timeout: 15000 }).catch(() => {});
    const mrg = await pm.locator('#atRepRegua').innerText().catch(() => '');
    reg(larg + ' Metrolabs: régua de prazos na ficha da Assistência (etapa atual, com quem, prazo vigente)', /Régua de prazos/.test(mrg) && /Agora: /.test(mrg) && /Com a representada|Com a Metrolabs/.test(mrg), mrg.replace(/\s+/g, ' ').slice(0, 220));
    if (larg === 390) {
      await pm.click('#rpRgProrrogar');
      await pm.waitForSelector('#rp_prData');
      await pm.fill('#rp_prData', '2026-11-20');
      await pm.fill('#rp_prMotivo', 'Laudo do fabricante chega na próxima semana');
      await pm.locator('#rpRgProrrogarOk').scrollIntoViewIfNeeded();
      await foto(pm, `met-${larg}-regua-pedir-prazo.png`);
      await pm.click('#rpRgProrrogarOk');
      await pm.waitForFunction(() => /Pedido de mais prazo enviado/.test((document.querySelector('#atRepRegua') || {}).innerText || ''), null, { timeout: 15000 }).catch(() => {});
      const t5 = await pm.locator('#atRepRegua').innerText();
      reg(larg + ' Metrolabs: pediu mais prazo pela tela (motivo e nova data), aguardando a representada', /Pedido de mais prazo enviado/.test(t5) && /aguardando/i.test(t5) && !(await pm.evaluate(() => window.__prompt || window.__confirmou)), t5.replace(/\s+/g, ' ').slice(0, 200));
    } else {
      await pm.click('#rpRgChegada');
      await pm.waitForSelector('#rp_pcQuando');
      await pm.fill('#rp_pcQuando', '2026-10-20T09:30');
      await pm.fill('#rp_pcObsC', 'Conferida no almoxarifado');
      await pm.locator('#rpRgChegadaOk').scrollIntoViewIfNeeded();
      await foto(pm, `met-${larg}-regua-chegada.png`);
      await pm.click('#rpRgChegadaOk');
      await pm.waitForFunction(() => /Chegada da peça registrada/.test((document.querySelector('#atRepRegua') || {}).innerText || ''), null, { timeout: 15000 }).catch(() => {});
      const t6 = await pm.locator('#atRepRegua').innerText();
      const m6 = await pm.locator('#rpRgMsgC').innerText().catch(() => '');
      if (m6) console.log('MSG chegada: ' + m6);
      reg(larg + ' Metrolabs: registrou a chegada da peça (chamado volta a "Planejado"; começa a avaliação)', /Chegada da peça registrada/.test(t6) && /Planejado/.test(t6) && /Avaliação depois da chegada da peça/.test(t6), t6.replace(/\s+/g, ' ').replace(/^.*?Agora: /, 'Agora: ').slice(0, 400));
    }
    reg(larg + ' Metrolabs: sem rolagem lateral na régua', await semRolagem(pm, larg));
    await pm.locator('#atRepRegua').scrollIntoViewIfNeeded().catch(() => {});
    await foto(pm, `met-${larg}-regua.png`);
    reg(larg + ' Metrolabs: nenhum erro de script na página', m.erros.length === 0, m.erros.slice(0, 3).join(' | '));
    await m.ctxN.close();
  }
  fs.writeFileSync(path.join(SAIDA, 'resultado-navegador.json'), JSON.stringify({ em: new Date().toISOString(), resultados }, null, 2));
  await srv.app.close();
  await nav.close();
  const falhas = resultados.filter((x) => !x.ok).length;
  console.log(`\n${resultados.length - falhas} PASS, ${falhas} FAIL`);
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
