// AVISOS DA GESTÃO NO CELULAR, revisão independente do commit 155eede (01/11/2026): lista separada da gestão no piloto
// (WA_PILOTO.telefonesGestao), público só da gestão de verdade, chave com o marco, irreversível para quem não é gestão, sem
// envio em dobro, aviso fora da trava dos módulos, sigilo do Conduta e link só para o destinatário e a gestão.
// Código real do SGO+ num contexto isolado (tests/_matriz_ambiente.cjs), relógio controlado, nada sai de verdade. Dados fictícios.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente, pastaLegado } = require('./_matriz_ambiente.cjs');

const SEG = (hhmm) => '2026-10-19T' + hhmm + ':00-03:00';
const filaG = (amb, filtro) => (amb.tabelas.NTF_GESTAO || []).filter((l) => Object.keys(filtro || {}).every((k) => l[k] === filtro[k]));
const emailsPara = (amb, quem) => amb.emails.filter((m) => String(m.to).indexOf(quem + '@') === 0);
const whatsPara = (amb, fone) => amb.whats.filter((w) => w.corpo.to === fone);
const aprovado = (amb) => { amb.ctx.SGO_waModeloSituacao_ = (n) => (n === 'sgo_gestao_acao' ? 'APPROVED' : ''); };
const apoio = (amb, uids, ref, extra) => amb.ctx.SGO_notificar_(Object.assign({ usuarios: uids, canais: ['sgo', 'email'], evento: 'S23', origem: 'COMERCIAL', refId: ref,
  titulo: 'Pedido de apoio: ' + ref, texto: 'O vendedor pediu apoio.' }, extra || {}));
const rotina = (amb) => { amb.ctx.SGO_ehGestaoRotina_ = (p) => ['ADMIN', 'DIRETORIA', 'GESTOR', 'RH', 'FINANCEIRO'].includes(String(p).toUpperCase()); };
const fonte = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n');

// ------------------------------------------------------------------ 1. lista separada do piloto
test('1. piloto: celular da gestão vai só em WA_PILOTO.telefonesGestao (55+DDD+8 dígitos); libera só sgo_gestao_acao dos avisos da gestão; nunca contato externo', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')), extras: ['SGO_WhatsappPiloto.js'] });
  const c = amb.ctx;
  c.SGO_waPilotoSincronizar_(true);
  const prop = JSON.parse(amb.props.WA_PILOTO);
  assert.deepEqual(prop.telefones, [], 'a lista comum do piloto não ganhou ninguém da gestão');
  assert.deepEqual(prop.telefonesGestao.slice().sort(), ['556299990010', '556299990011', '556299990012', '556299990016', '556299990017'], 'Dora, Gil, Ana, Gael e Adão (Tiago e Paulo não são da gestão)');
  assert.ok(prop.telefonesGestao.every((t) => /^55\d{10}$/.test(t)), 'mesmo formato de "telefones": 55 + DDD + 8 últimos dígitos, sem o 9');
  const cfg = c.SGO_waPilotoCfg_();
  const gil = c.Notificar_contatos_(['u_gt']).u_gt;
  assert.equal(c.SGO_waPilotoMotivo_(gil, cfg, { origem: 'AVISOS_GESTAO', modelo: 'sgo_gestao_acao' }), '', 'aviso da gestão: liberado');
  assert.match(c.SGO_waPilotoMotivo_(gil, cfg, { origem: 'AVISOS_GESTAO', modelo: 'sgo_aviso_geral' }), /Retida pelo piloto/, 'outro modelo: retido');
  assert.match(c.SGO_waPilotoMotivo_(gil, cfg, { origem: 'COMERCIAL', modelo: 'sgo_gestao_acao' }), /Retida pelo piloto/, 'outra origem: retido');
  assert.match(c.SGO_waPilotoMotivo_({ externo: true, telefone: gil.telefone }, cfg, { origem: 'AVISOS_GESTAO', modelo: 'sgo_gestao_acao' }), /cliente e contato externo/, 'externo nunca usa a lista da gestão');
  assert.equal(c.SGO_waPilotoTelefoneLiberado_(gil.telefone), false, 'o teste de envio de Chaves e senhas (lista comum) não libera o gestor');
});

test('1. piloto: o envio dos avisos da gestão sincroniza telefonesGestao na hora (sem esperar a sincronização comum) e o WhatsApp sai', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')), extras: ['SGO_WhatsappPiloto.js'],
    props: { WA_PILOTO: JSON.stringify({ v: 1, ligado: true, usuarios: [], areas: [], telefones: [], telefonesGestao: [], grupos: {}, atualizadoEm: '', atualizadoPor: 'teste' }) } });
  aprovado(amb);
  const c = amb.ctx;
  apoio(amb, ['u_gt'], 'OPO-1');
  amb.mudar(SEG('10:30')); aprovado(amb);
  amb.cache.WAP_SYNC_V1 = '1'; // a sincronização comum já rodou há pouco (cache de 30 min)
  c.SGO_avisosGestaoRodada_(new c.Date());
  assert.ok(JSON.parse(amb.props.WA_PILOTO).telefonesGestao.includes('556299990011'), 'gravada no caminho AVISOS_GESTAO');
  assert.deepEqual(JSON.parse(amb.props.WA_PILOTO).telefones, []);
  assert.equal(whatsPara(amb, '5562999990011').length, 1);
  // mensagem comum para o mesmo gestor continua retida pelo piloto
  c.SGO_notificar_({ usuarios: ['u_gt'], canais: ['whatsapp'], evento: 'S70', origem: 'AVISOS_URGENTE', refId: 'URG-1', titulo: 'Aviso urgente', texto: 'x' });
  assert.ok(amb.tabelas.NTF_ENVIOS.some((l) => l.USUARIO_ID === 'u_gt' && l.REF_ID === 'URG-1' && l.SITUACAO === 'RETIDO'));
});

// ------------------------------------------------------------------ 2. público
test('2. público: RH e Financeiro só quando são responsáveis de área; o auxiliar fica de fora e segue o teto', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')) });
  rotina(amb);
  const c = amb.ctx;
  const us = c.Mtz_usuarios_();
  assert.equal(c.AvG_ehGestao_(us.u_rh), false, 'RH sem área em Regras e responsáveis');
  assert.equal(c.AvG_ehGestao_(us.u_gt), true);
  assert.equal(c.AvG_ehGestao_(us.u_dir), true);
  c.SGO_notificar_({ usuarios: ['u_rh'], canais: ['sgo', 'email'], evento: 'S72', origem: 'SEDNA', refId: 'R-1', titulo: 'Atrasada', texto: 'x' });
  assert.equal(filaG(amb, { USUARIO_ID: 'u_rh' }).length, 0);
  assert.equal(emailsPara(amb, 'rita').length, 1, 'recebe pela regra comum');
  assert.equal(c.SGO_MeusAvisos_api('s_rh', 'carregar', {}).gestao.ehGestao, false);
  // responsável pela área RH: passa a ser da gestão
  amb.props.GESTAO_DECISOES_CFG = JSON.stringify({ gestoresPorArea: { TECNICA: ['u_gt'], ADMINISTRATIVO: ['u_ga'], RH: ['u_rh'] } });
  amb.mudar(SEG('10:05')); rotina(amb);
  assert.equal(c.AvG_ehGestao_(c.Mtz_usuarios_().u_rh), true);
  c.SGO_notificar_({ usuarios: ['u_rh'], canais: ['sgo', 'email'], evento: 'S72', origem: 'SEDNA', refId: 'R-2', titulo: 'Atrasada 2', texto: 'x' });
  assert.equal(filaG(amb, { USUARIO_ID: 'u_rh' }).length, 1);
});

// ------------------------------------------------------------------ 3. chave com o marco
test('3. chave com o marco: novo marco do mesmo item avisa de novo; chave repetida segue no e-mail comum', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')), props: { AVG_IMPLANTADO_EM: '2026-10-19T09:00' }, tabelas: {
    GES_DECISOES: [{ ID: 'd1', ITEM_ID: 'ATV:PEDIDO:a1', TIPO: 'ATIVIDADE_JUSTIFICATIVA', MODULO: 'atividades', TITULO: 'Pedido de nova data: Relatório', RESPONSAVEIS_IDS: 'u_gt', SITUACAO: 'ABERTA', ENTROU_EM: '2026-10-19T09:30', PRAZO_DECISAO: '2026-10-21' }] } });
  const c = amb.ctx;
  // RP07: "em risco" e depois "vencido" no mesmo pedido (mesmo refId, títulos diferentes) -> dois avisos
  c.SGO_notificar_({ usuarios: ['u_gt'], canais: ['sgo', 'email'], evento: 'S72', origem: 'REPRESENTACAO', refId: 'REP-ACEITE-p1', titulo: 'Prazo de aceite em risco: SOL-1', texto: 'x' });
  c.SGO_notificar_({ usuarios: ['u_gt'], canais: ['sgo', 'email'], evento: 'S72', origem: 'REPRESENTACAO', refId: 'REP-ACEITE-p1', titulo: 'Prazo de aceite VENCIDO: SOL-1', texto: 'x' });
  assert.equal(filaG(amb, { REF_ID: 'REP-ACEITE-p1' }).length, 2);
  // segundo pedido de nova data na mesma atividade (mesmo item da Caixa, nova entrada) -> novo GS01
  c.SGO_avisosGestaoRodada_(new c.Date());
  amb.tabelas.GES_DECISOES[0].SITUACAO = 'RESOLVIDA';
  amb.tabelas.GES_DECISOES.push({ ID: 'd2', ITEM_ID: 'ATV:PEDIDO:a1', TIPO: 'ATIVIDADE_JUSTIFICATIVA', MODULO: 'atividades', TITULO: 'Pedido de nova data: Relatório', RESPONSAVEIS_IDS: 'u_gt', SITUACAO: 'ABERTA', ENTROU_EM: '2026-10-19T11:00', PRAZO_DECISAO: '2026-10-22' });
  amb.mudar(SEG('11:15'));
  c.SGO_avisosGestaoRodada_(new c.Date());
  assert.equal(filaG(amb, { EVENTO: 'GS01', REF_ID: 'ATV:PEDIDO:a1' }).length, 2, 'o segundo pedido avisa de novo');
  // chave repetida: o gestor fica no e-mail comum do notificador (não some)
  apoio(amb, ['u_gt'], 'OPO-7'); apoio(amb, ['u_gt'], 'OPO-7');
  const linhas = amb.tabelas.NTF_ENVIOS.filter((l) => l.USUARIO_ID === 'u_gt' && l.REF_ID === 'OPO-7' && l.CANAL === 'email').map((l) => l.SITUACAO);
  assert.deepEqual(linhas, ['NA_FILA_GESTAO', 'OK']);
});

// ------------------------------------------------------------------ 4. irreversível para quem não é gestão
test('4. irreversível: responsável de área que não é da gestão recebe pela regra comum; quem saiu da gestão não fica resolvido sem envio', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')), props: { GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: { TECNICA: ['u_tec'], ADMINISTRATIVO: ['u_ga'] } }) } });
  const c = amb.ctx;
  const r = c.SGO_avisoGestaoIrreversivel_({ evento: 'GI04', modulo: 'assistencia', quem: { id: 'u_pj', nome: 'PAULO PJ TESTE' }, oque: 'Chamado cancelado', item: 'CH-1', motivo: 'cliente desistiu', refId: 'AST-CANC-1' });
  assert.equal(r.comuns, 1, JSON.stringify(r));
  assert.equal(filaG(amb, { USUARIO_ID: 'u_tec' }).length, 0);
  assert.equal(emailsPara(amb, 'tiago').length, 1, 'técnico responsável pela área: e-mail comum');
  assert.match(emailsPara(amb, 'tiago')[0].body, /Quem fez: PAULO PJ TESTE/);
  assert.equal(emailsPara(amb, 'dora').length, 1, 'Diretoria pela fila da gestão');
  // na fila como gestor, deixa de ser gestor antes de sair: vai pela regra comum, com o motivo
  const amb2 = ambiente({ agora: Date.parse(SEG('10:00')) });
  apoio(amb2, ['u_gt'], 'OPO-X');
  amb2.tabelas.CAD_USUARIOS.find((u) => u.ID === 'u_gt').PERFIL = 'TECNICO';
  amb2.mudar(SEG('10:31'));
  amb2.ctx.SGO_avisosGestaoRodada_(new amb2.ctx.Date());
  const l = filaG(amb2, { REF_ID: 'OPO-X' })[0];
  assert.equal(l.SITUACAO, 'ENVIADO');
  assert.equal(l.WA_SITUACAO, 'FORA_DA_GESTAO');
  assert.equal(emailsPara(amb2, 'gil').length, 1);
});

// ------------------------------------------------------------------ 5. sem envio em dobro
test('5. sem envio em dobro: trava ocupada não envia; linha ENVIANDO recente não sai de novo; ENVIANDO abandonado (10 min) sai', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')) });
  const c = amb.ctx;
  apoio(amb, ['u_gt'], 'OPO-1');
  amb.mudar(SEG('10:31'));
  const lockOriginal = c.LockService;
  c.LockService = { getScriptLock: () => ({ tryLock: () => false, waitLock() {}, releaseLock() {} }) };
  assert.match(c.AvG_enviarProntos_(new c.Date(), false).ocupado, /outro envio/);
  assert.equal(emailsPara(amb, 'gil').length, 0);
  c.LockService = lockOriginal;
  const l = amb.tabelas.NTF_GESTAO[0];
  Object.assign(l, { SITUACAO: 'ENVIANDO', ENVIANDO_EM: '2026-10-19T10:29:00' }); // outra execução pegou a linha agora há pouco
  c.AvG_enviarProntos_(new c.Date(), false);
  assert.equal(emailsPara(amb, 'gil').length, 0, 'a mesma linha não sai duas vezes');
  amb.mudar(SEG('10:45'));
  c.AvG_enviarProntos_(new c.Date(), false);
  assert.equal(emailsPara(amb, 'gil').length, 1, 'a execução anterior caiu: sai depois de 10 minutos');
  assert.equal(amb.tabelas.NTF_GESTAO[0].SITUACAO, 'ENVIADO');
  assert.ok(amb.tabelas.NTF_GESTAO[0].ENVIANDO_EM);
});

// ------------------------------------------------------------------ 6. fora da trava dos módulos
test('6. desempenho: o aviso irreversível roda depois de soltar a trava (Comercial, Compras, Assistência e Atividades)', () => {
  // Comercial: a fila "depois" roda só depois do releaseLock (mesmo padrão de Compras e Assistência)
  const passos = [];
  const ctx = vm.createContext({ console, LockService: { getScriptLock: () => ({ waitLock: () => passos.push('trava'), releaseLock: () => passos.push('solta') }) }, SpreadsheetApp: { flush() {} } });
  const cfg = fonte('SGO_Comercial_Config.js');
  vm.runInContext(cfg.slice(cfg.indexOf('var COM_TRAVA'), cfg.indexOf('\n}\n', cfg.indexOf('function Com_comTrava_')) + 3), ctx);
  vm.runInContext("var r = Com_comTrava_(function () { passos.push('grava'); Com_depois_(function () { passos.push('aviso'); }); return 1; });", Object.assign(ctx, { passos }));
  assert.deepEqual(passos, ['trava', 'grava', 'solta', 'aviso']);
  passos.length = 0;
  assert.throws(() => vm.runInContext("Com_comTrava_(function () { Com_depois_(function () { passos.push('aviso'); }); throw new Error('falhou'); });", ctx));
  assert.ok(!passos.includes('aviso'), 'ação que falhou não avisa');
  // nenhum aviso irreversível chamado direto dentro das travas
  [['SGO_Comercial_Oportunidades.js', 'Com_depois_', 2], ['SGO_Comercial_Propostas.js', 'Com_depois_', 3], ['SGO_Compras_Requisicoes.js', 'Cmp_depois_', 1], ['SGO_Assistencia_Chamados.js', 'Ast_depois_', 3]].forEach(([f, fila, n]) => {
    const s = fonte(f);
    assert.equal((s.match(/SGO_avisoGestaoIrreversivel_\(/g) || []).length, n, f);
    assert.equal((s.match(new RegExp(fila + "\\(function \\(\\) \\{ if \\(typeof SGO_avisoGestaoIrreversivel_", 'g')) || []).length, n, f + ': todos pela fila de depois');
  });
  const at = fonte('SGO_Atividades.js');
  const fn = at.slice(at.indexOf('function Atividades_apiDecidirPedido'), at.indexOf('\n}\n', at.indexOf('function Atividades_apiDecidirPedido')));
  assert.ok(fn.indexOf('SGO_avisoGestaoIrreversivel_(irrevG)') > fn.lastIndexOf('return Atividades_comTrava_') && /\n  if \(r\.ok && irrevG/.test(fn), 'Atividades: depois da trava');
});

// ------------------------------------------------------------------ 7. sigilo do Conduta
test('7. sigilo do Conduta: título fixo "Julgamento registrado no Programa de Conduta", com o link e sem o resultado', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')) });
  const c = amb.ctx;
  c.SGO_avisoGestaoIrreversivel_({ evento: 'GI05', modulo: 'conduta', soDiretoria: true, sensivel: true, quem: { id: 'u_gt', nome: 'GIL GESTOR TESTE' }, oque: 'Ocorrência mantida no julgamento', item: 'ocorrência 12', motivo: 'reincidência', tela: { tipo: 'modulo', mod: 'conduta' }, refId: 'CND-1' });
  const l = filaG(amb, { REF_ID: 'CND-1' })[0];
  assert.equal(l.TITULO, 'Julgamento registrado no Programa de Conduta');
  assert.ok(!/mantida|anulada|reincid|ocorrência 12/i.test(l.TITULO + l.TEXTO + l.LINHA));
  const m = emailsPara(amb, 'dora')[0];
  assert.equal(m.subject, 'SGO+ | Julgamento registrado no Programa de Conduta');
  assert.match(m.body, /\?aviso=/);
  assert.ok(!/mantida|anulada|reincid/i.test(m.body));
  const cd = fonte('SGO_Conduta_Ocorrencias.js');
  assert.match(cd, /oque: 'Julgamento registrado no Programa de Conduta', item: '', motivo: ''/);
});

// ------------------------------------------------------------------ 8. link
test('8. link ?aviso=: abre para o destinatário e para a gestão; os demais veem "Este aviso é de outra pessoa"', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')) });
  const c = amb.ctx;
  apoio(amb, ['u_gt'], 'OPO-1');
  const id = amb.tabelas.NTF_GESTAO[0].AVISO_ID;
  assert.equal(c.SGO_AvisosGestao_api('s_gt', 'abrir', { aviso: id }).ok, true);
  assert.equal(c.SGO_AvisosGestao_api('s_dir', 'abrir', { aviso: id }).ok, true, 'Diretoria (gestão) abre');
  const t = c.SGO_AvisosGestao_api('s_tec', 'abrir', { aviso: id });
  assert.equal(t.ok, false);
  assert.equal(t.outraPessoa, true);
  assert.equal(t.tela, null, 'não leva à tela do item');
  assert.match(t.message, /^Este aviso é de outra pessoa/);
  assert.equal(c.SGO_AvisosGestao_api('s_pj', 'abrir', { aviso: id }).outraPessoa, true);
});
