// Bloco B da onda 3 do Financeiro (18/11/2026): E6 régua de cobrança e E7 agenda financeira e previsão de caixa de 90 dias.
// Especificação: output/financeiro-20261116/especialistas/ESPEC_ONDA2_FINANCEIRO.md, seções 1.5 a 1.8 (testes 1.8-4, 1.8-5, 1.8-6 e
// 1.8-8). Código REAL do SGO+ com o OMIE SIMULADO (tests/_financeiro_bloco_b.cjs). Nada sai para a rede. Confere:
//  - todas as transições da régua (tabela 1.5), inclusive a promessa quebrada que passa por feriado e fim de semana;
//  - o quadro, as ações, o histórico, a decisão só da Diretoria, o merge em FIN_COBRANCA, o texto sem dado bancário e o I16;
//  - as pendências só para a lista de sigilo, sem nome de cliente nem valor, com id "OMIE:COB:";
//  - a previsão otimista e realista com números calculados à mão, o cruzamento do mínimo e o mínimo "a definir";
//  - o Gantt (losangos, barras de promessa, janela 30/60/90) e o G2 da aba Indicadores;
//  - o sigilo (recusa e registro) e a página completa a 1366, 390 e 320 px (capturas em output/financeiro-20261118-bloco-b/capturas).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const B = require('./_financeiro_bloco_b.cjs');
const { montarB, NOMES, abrirPagina, semRolagem } = B;
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const saida = process.env.CAPTURAS_BLOCO_B || path.join(__dirname, '../output/financeiro-20261118-bloco-b/capturas');

const PADRAO = { aVencer: 5, contato: 7, tolerancia: 2, recebido: 7 };
const pronto = (o) => { const a = montarB(o); const r = a.foto(); assert.equal(r.concluida, 'COMPLETA', JSON.stringify(r)); a.em((o && o.depois) || '2026-11-16T10:00:00-03:00'); return a; };
const quadro = (a, login) => a.j(a.ctx.FinCob_apiQuadro('s_' + (login || 'wanessa')));
const acao = (a, login, d) => a.j(a.ctx.FinCob_apiAcao('s_' + login, d));
const cartao = (q, id) => (q.cartoes || []).find((c) => c.id === id);

// ================================================================= 1.8-4 transições (função pura)
test('Régua: todas as transições da tabela 1.5, com a promessa quebrada passando por feriado (20/11) e fim de semana', () => {
  const a = montarB();
  const E = (t, acoes, hoje, cfg) => a.j(a.ctx.FinCob_etapa_(t, acoes || [], hoje, cfg || PADRAO));
  const vencido = { venc: '2026-11-01', aberto: 4000, pago: 0 };
  const ac = (acao, dia, extra) => Object.assign({ acao, dia, em: dia + 'T13:00:00.000Z' }, extra || {});
  // a vencer em 5 dias; fora do quadro com 10 dias; ação antes de vencer leva a "Em contato"
  assert.equal(E({ venc: '2026-11-19', aberto: 800 }, [], '2026-11-16').etapa, 'A_VENCER');
  assert.equal(E({ venc: '2026-11-21', aberto: 800 }, [], '2026-11-16').etapa, 'A_VENCER', 'no limite de 5 dias');
  assert.equal(E({ venc: '2026-11-26', aberto: 800 }, [], '2026-11-16').etapa, '', 'a 10 dias não entra');
  assert.equal(E({ venc: '2026-11-19', aberto: 800 }, [ac('LEMBRETE', '2026-11-16')], '2026-11-16').etapa, 'EM_CONTATO');
  // vencido sem contato; contato e lembrete; 7 dias sem nova ação volta em destaque
  const sem = E(vencido, [], '2026-11-16'); assert.equal(sem.etapa, 'VENCIDO_SEM_CONTATO'); assert.match(sem.motivo, /nenhuma ação/);
  assert.equal(E(vencido, [ac('CONTATO', '2026-11-16')], '2026-11-16').etapa, 'EM_CONTATO');
  assert.equal(E(vencido, [ac('CONTATO', '2026-11-16')], '2026-11-23').etapa, 'EM_CONTATO', '7 dias ainda em contato');
  const volta = E(vencido, [ac('CONTATO', '2026-11-16')], '2026-11-24');
  assert.equal(volta.etapa, 'VENCIDO_SEM_CONTATO'); assert.equal(volta.destaque, true); assert.match(volta.motivo, /sem nova ação há 8 dias/);
  // promessa: data prometida quinta 19/11; 20/11 é feriado nacional, 21 e 22 fim de semana: os 2 dias úteis são 23 e 24
  const prom = [ac('PROMESSA', '2026-11-16', { dataPrometida: '2026-11-19', valorPrometido: 2000 })];
  assert.equal(E(vencido, prom, '2026-11-19').etapa, 'PROMESSA');
  assert.equal(E(vencido, prom, '2026-11-24').etapa, 'PROMESSA', 'ainda dentro dos 2 dias úteis (o feriado e o fim de semana não contam)');
  const queb = E(vencido, prom, '2026-11-25');
  assert.equal(queb.etapa, 'PROMESSA_QUEBRADA'); assert.equal(queb.destaque, true); assert.match(queb.motivo, /prometido para 19\/11\/2026; sem baixa no Omie até 24\/11\/2026/);
  assert.equal(E(vencido, prom, '2026-11-20', Object.assign({}, PADRAO, { tolerancia: 0 })).etapa, 'PROMESSA_QUEBRADA', 'sem tolerância, quebra no dia seguinte');
  // promessa paga: sai sozinha para "Recebido (7 dias)" e some depois de 7 dias
  assert.equal(E({ venc: '2026-11-01', aberto: 0, pago: 4000, pagoEm: '2026-11-18' }, prom, '2026-11-20').etapa, 'RECEBIDO');
  assert.equal(E({ venc: '2026-11-01', aberto: 0, pago: 4000, pagoEm: '2026-11-18' }, prom, '2026-11-26').etapa, '', 'some depois de 7 dias');
  // quebrada com nova ação sai da coluna
  assert.equal(E(vencido, prom.concat([ac('CONTATO', '2026-11-25')]), '2026-11-25').etapa, 'EM_CONTATO');
  // acordo
  assert.equal(E(vencido, [ac('ACORDO', '2026-11-16', { dataPrometida: '2026-12-10' })], '2026-11-30').etapa, 'ACORDO');
  // Diretoria: fica até a decisão, mesmo com outra ação no meio; a decisão devolve para a cobrança
  const dir = [ac('DIRETORIA', '2026-11-16'), ac('PROMESSA', '2026-11-17', { dataPrometida: '2026-11-18' })];
  assert.equal(E(vencido, dir, '2026-11-30').etapa, 'DIRETORIA');
  const dec = E(vencido, dir.concat([ac('DECISAO', '2026-11-30', { decisao: 'PERDA' })]), '2026-11-30');
  assert.equal(dec.etapa, 'EM_CONTATO');
  // dia útil: feriado nacional e fim de semana
  assert.equal(a.ctx.FinCob_diaUtil_('2026-11-20'), false); assert.equal(a.ctx.FinCob_diaUtil_('2026-11-21'), false); assert.equal(a.ctx.FinCob_diaUtil_('2026-11-23'), true);
  assert.equal(a.ctx.FinCob_somarUteis_('2026-11-19', 2), '2026-11-24');
});

// ================================================================= quadro, ações, Diretoria, merge e I16
test('Régua: quadro, ações com validação, promessa, encaminhamento, decisão só da Diretoria, merge em FIN_COBRANCA, I16 e nenhuma chamada ao Omie', () => {
  const a = pronto();
  const n0 = a.rico.length;
  const q = quadro(a);
  assert.equal(q.ok, true, q.mensagem);
  assert.deepEqual(q.colunas.map((c) => c.id), ['A_VENCER', 'VENCIDO_SEM_CONTATO', 'EM_CONTATO', 'PROMESSA', 'PROMESSA_QUEBRADA', 'ACORDO', 'DIRETORIA', 'RECEBIDO']);
  assert.deepEqual(q.colunas.map((c) => c.qtd), [1, 3, 0, 0, 0, 0, 0, 1]);
  assert.equal(q.colunas[1].totalTxt, 'R$ 9.000,00');
  const c2 = cartao(q, 2);
  assert.equal(c2.cliente, NOMES[10]); assert.equal(c2.documento, '1002'); assert.equal(c2.saldoTxt, 'R$ 4.000,00'); assert.equal(c2.atrasoTxt, '15 dias de atraso');
  assert.equal(c2.atrasoMedioTxt, '4 dias', 'atraso médio do cliente em 12 meses, ponderado pelo valor ((0×1000 + 4×8000) ÷ 9000 = 3,6)');
  assert.equal(cartao(q, 14).etapa, 'A_VENCER'); assert.equal(cartao(q, 15).etapa, 'RECEBIDO'); assert.match(cartao(q, 15).atrasoTxt, /pago com 4 dia/);
  assert.equal(cartao(q, 1), undefined, 'vence em 10 dias: fora do quadro');
  assert.equal(q.execucao.valor, 0); assert.match(q.execucao.detalhe, /0 de 3/);
  assert.equal(q.podeRegistrar, true); assert.equal(q.podeDecidir, false);
  assert.equal(quadro(a, 'dora').podeDecidir, true);
  // validações (o quê, por quê, o que fazer) e nada gravado
  const r1 = acao(a, 'wanessa', { titulo: 2, acao: 'CONTATO' }); assert.equal(r1.ok, false); assert.match(r1.mensagem, /Escolha o canal[\s\S]*Nada foi registrado/);
  const r2 = acao(a, 'wanessa', { titulo: 2, acao: 'PROMESSA', dataPrometida: '2026-11-19', valorPrometido: '5.000,00' }); assert.equal(r2.ok, false); assert.match(r2.mensagem, /maior que o saldo em aberto do título \(R\$ 4\.000,00\)/);
  const r3 = acao(a, 'wanessa', { titulo: 2, acao: 'PROMESSA', dataPrometida: '2026-11-10' }); assert.equal(r3.ok, false); assert.match(r3.mensagem, /data prometida: de hoje até 90 dias/);
  const r4 = acao(a, 'wanessa', { titulo: 999, acao: 'CONTATO', canal: 'TELEFONE' }); assert.equal(r4.ok, false); assert.match(r4.mensagem, /não está na fotografia[\s\S]*Atualize o quadro/);
  const r5 = acao(a, 'wanessa', { titulo: 15, acao: 'CONTATO', canal: 'TELEFONE' }); assert.equal(r5.ok, false); assert.match(r5.mensagem, /já mostra este título como pago/);
  assert.equal((a.tabelas.FIN_COBRANCA_ACOES || []).length, 0, 'nenhuma ação gravada nas recusas');
  // promessa: texto sem e-mail nem número longo
  const ok = acao(a, 'wanessa', { titulo: 2, acao: 'PROMESSA', canal: 'TELEFONE', contato: 'Ana, contas a pagar', dataPrometida: '2026-11-19', valorPrometido: '2.000,00', proxima: '2026-11-18', obs: 'pediu boleto em ana@hospital.test; conta 12345-6789012' });
  assert.equal(ok.ok, true, ok.mensagem); assert.equal(ok.etapa, 'PROMESSA'); assert.match(ok.mensagem, /E-mails e números longos foram retirados/);
  const linha = a.tabelas.FIN_COBRANCA_ACOES[0];
  assert.equal(linha.ACAO, 'PROMESSA'); assert.equal(linha.VALOR_PROMETIDO, 2000); assert.equal(linha.POR_ID, 'u_fin');
  assert.ok(!/@|12345-6789012/.test(linha.OBS), linha.OBS);
  const reg = a.tabelas.FIN_COBRANCA[0];
  assert.equal(reg.TITULO_OMIE, '2'); assert.equal(reg.CLIENTE_OMIE, 10); assert.equal(reg.DOCUMENTO, '1002'); assert.equal(reg.ETAPA, 'PROMESSA'); assert.equal(reg.PROXIMA_EM, '2026-11-18'); assert.equal(reg.PROMESSA_VALOR, 2000);
  assert.ok(!JSON.stringify(a.tabelas.FIN_COBRANCA).includes(NOMES[10]), 'sem nome de cliente na tabela');
  assert.ok(!/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|@/.test(JSON.stringify(a.tabelas.FIN_COBRANCA)), 'sem CNPJ nem e-mail');
  // merge: uma ação sem "próxima" não apaga a próxima marcada para o futuro
  assert.equal(acao(a, 'fabio', { titulo: 2, acao: 'LEMBRETE', canal: 'EMAIL' }).ok, true);
  assert.equal(a.tabelas.FIN_COBRANCA.length, 1); assert.equal(a.tabelas.FIN_COBRANCA[0].PROXIMA_EM, '2026-11-18', 'a próxima ação continua'); assert.equal(a.tabelas.FIN_COBRANCA[0].PROMESSA_VALOR, 2000, 'a promessa continua');
  assert.equal(a.tabelas.FIN_COBRANCA[0].ULTIMA_ACAO_POR, 'FABIO FINANCEIRO TESTE');
  // encaminhar à Diretoria: motivo obrigatório; decisão só da Diretoria
  const d1 = acao(a, 'wanessa', { titulo: 3, acao: 'DIRETORIA', motivoDiretoria: 'curto' }); assert.equal(d1.ok, false); assert.match(d1.mensagem, /pelo menos 15 letras/);
  assert.equal(acao(a, 'wanessa', { titulo: 3, acao: 'DIRETORIA', motivoDiretoria: '76 dias de atraso, cliente não responde aos contatos' }).etapa, 'DIRETORIA');
  const neg = acao(a, 'wanessa', { titulo: 3, acao: 'DECISAO', decisao: 'PROTESTAR', motivoDecisao: 'Wanessa tentando decidir sozinha o protesto' });
  assert.equal(neg.ok, false); assert.match(neg.mensagem, /Você não registra esta decisão[\s\S]*só pela Diretoria[\s\S]*Nada foi alterado[\s\S]*Encaminhar à Diretoria/);
  assert.ok(a.tabelas.FIN_OMIE_ACESSOS.some((x) => x.CONSULTA === 'FinCob_apiAcao' && x.RESULTADO === 'NEGADO' && x.USUARIO_ID === 'u_fin'));
  const curta = acao(a, 'dora', { titulo: 3, acao: 'DECISAO', decisao: 'PERDA', motivoDecisao: 'sem motivo' }); assert.equal(curta.ok, false); assert.match(curta.mensagem, /motivo da decisão/);
  const dec = acao(a, 'dora', { titulo: 3, acao: 'DECISAO', decisao: 'PERDA', motivoDecisao: 'Cliente encerrou as atividades; baixar como perda após conferência do contador' });
  assert.equal(dec.ok, true, dec.mensagem); assert.match(dec.mensagem, /Decisão registrada: Baixar como perda[\s\S]*Lançamentos e baixas/);
  assert.equal(acao(a, 'admin', { titulo: 3, acao: 'DECISAO', decisao: 'VOLTAR', motivoDecisao: 'decisão repetida por engano, não deve passar' }).ok, false, 'decisão só enquanto aguarda a Diretoria');
  const q2 = quadro(a);
  assert.equal(cartao(q2, 3).etapa, 'EM_CONTATO'); assert.equal(cartao(q2, 3).decisao.nome, 'Baixar como perda');
  assert.equal(cartao(q2, 2).etapa, 'EM_CONTATO', 'o lembrete depois da promessa');
  // histórico, do mais recente para o mais antigo
  const h = a.j(a.ctx.FinCob_apiHistorico('s_wanessa', { titulo: 3 }));
  assert.deepEqual(h.itens.map((x) => x.acao), ['Decisão da Diretoria', 'Encaminhado à Diretoria']);
  assert.match(h.itens[0].motivo, /encerrou as atividades/);
  // I16: 2 dos 3 vencidos com ação nos últimos 7 dias
  assert.equal(q2.execucao.valor, 66.7); assert.match(q2.execucao.detalhe, /2 de 3/);
  assert.equal(a.rico.length, n0, 'nenhuma chamada ao Omie no quadro, nas ações e no histórico');
  // a fotografia seguinte grava o I16
  a.em('2026-11-17T06:20:00-03:00'); a.limpar(); assert.equal(a.foto().concluida, 'COMPLETA');
  const i16 = JSON.parse(a.tabelas.FIN_FOTOS.find((f) => f.DIA === '2026-11-17').INDICADORES_JSON).I16;
  assert.equal(i16.valor, 66.7, JSON.stringify(i16));
});

test('Régua: pendências só para a lista de sigilo, por contagem, sem nome de cliente nem valor; régua externa desligada por padrão', () => {
  const a = pronto();
  acao(a, 'wanessa', { titulo: 2, acao: 'PROMESSA', canal: 'TELEFONE', dataPrometida: '2026-11-17', proxima: '2026-11-16' });
  acao(a, 'fabio', { titulo: 3, acao: 'DIRETORIA', motivoDiretoria: 'muitos dias de atraso e nenhuma resposta do cliente' });
  // 19/11 (quinta): a promessa de 17/11 + 2 dias úteis (18 e 19) ainda vale; 20/11 é feriado; em 23/11 está quebrada
  a.em('2026-11-23T10:00:00-03:00');
  const ver = (ctx) => a.j(a.ctx.Pend_calcular_(ctx)).itens.filter((i) => /^OMIE:COB:/.test(i.id));
  const w = ver({ userId: 'u_fin', perfil: 'FINANCEIRO' });
  assert.deepEqual(w.map((i) => i.id).sort(), ['OMIE:COB:LEMBRETE:u_fin', 'OMIE:COB:QUEBRADAS']);
  const tudo = JSON.stringify(w);
  for (const nome of Object.values(NOMES)) assert.ok(!tudo.includes(nome), 'sem o nome ' + nome);
  assert.ok(!/R\$|1002|4\.000/.test(tudo), 'sem valor nem documento: ' + tudo);
  assert.ok(w.every((i) => i.extra && i.extra.sigiloFin), 'marca de sigilo');
  assert.deepEqual(ver({ userId: 'u_dir', perfil: 'DIRETORIA', diretoria: true, gestao: true }).map((i) => i.id).sort(), ['OMIE:COB:DIRETORIA', 'OMIE:COB:QUEBRADAS']);
  assert.deepEqual(ver({ userId: 'u_rh', perfil: 'RH', gestao: true }), [], 'RH fora da lista não vê');
  assert.deepEqual(ver({ userId: 'u_gt', perfil: 'GESTOR', gestao: true }), [], 'gestor fora da lista não vê');
  // o relatório diário da empresa (contexto interno) conta pelo prefixo OMIE (só a contagem)
  assert.ok(ver({ interno: true, diretoria: true }).some((i) => i.id === 'OMIE:COB:DIRETORIA'));
  // régua externa: padrão desligado; ligada só avisa que ainda não envia
  const q = quadro(a); assert.equal(q.cfg.externa, false); assert.equal(q.externaAviso, '');
  a.props.FIN_COBRANCA_EXTERNA = 'LIGADA';
  assert.match(quadro(a).externaAviso, /ainda não foi construído[\s\S]*Nada é enviado ao cliente/);
  assert.equal(a.emails.filter((e) => !/exemplo\.test$/.test(e.to)).length, 0, 'nenhum e-mail a cliente');
  // configuração em Chaves e senhas
  const item = (k) => a.ctx.CHV_ITENS.find((i) => i.chave === k), valida = (k, v) => a.ctx.Chaves_validarValor_(item(k), v);
  for (const k of ['FIN_COBRANCA_AVENCER_DIAS', 'FIN_COBRANCA_CONTATO_DIAS', 'FIN_COBRANCA_TOLERANCIA', 'FIN_COBRANCA_EXTERNA']) { assert.equal(item(k).grupo, 'Regras do Financeiro', k); assert.ok(item(k).ajuda.length > 80, k); }
  assert.equal(valida('FIN_COBRANCA_TOLERANCIA', '0'), '0'); assert.throws(() => valida('FIN_COBRANCA_TOLERANCIA', '11'), /de 0 a 10/);
  assert.throws(() => valida('FIN_COBRANCA_AVENCER_DIAS', '0'), /de 1 a 30/); assert.equal(valida('FIN_COBRANCA_EXTERNA', 'ligada'), 'LIGADA');
  a.props.FIN_COBRANCA_TOLERANCIA = '0'; a.em('2026-11-18T10:00:00-03:00');
  assert.equal(cartao(quadro(a), 2).etapa, 'PROMESSA_QUEBRADA', 'tolerância configurada');
});

// ================================================================= 1.8-6 sigilo
test('Sigilo: fora da lista, recusa e registro em FinCob_apiQuadro, FinCob_apiAcao, FinCob_apiHistorico e FinAg_apiAgenda; sem a caixa, não registra ação', () => {
  const a = pronto();
  for (const [fn, d] of [['FinCob_apiQuadro', {}], ['FinCob_apiAcao', { titulo: 2, acao: 'CONTATO', canal: 'TELEFONE' }], ['FinCob_apiHistorico', { titulo: 2 }], ['FinAg_apiAgenda', { dias: 60 }]]) {
    for (const login of ['rita', 'gil', 'tiago']) {
      const r = a.j(a.ctx[fn]('s_' + login, d));
      assert.equal(r.ok, false, fn + ' ' + login); assert.match(r.mensagem, /O Financeiro é sigiloso/);
    }
    assert.ok(a.tabelas.FIN_OMIE_ACESSOS.some((x) => x.CONSULTA === fn && x.RESULTADO === 'NEGADO'), fn + ' registrado');
  }
  assert.equal((a.tabelas.FIN_COBRANCA_ACOES || []).length, 0);
  // na lista, mas sem a caixa FIN_COBRANCA_REGISTRAR: vê o quadro e não registra
  const uw = a.tabelas.CAD_USUARIOS.find((u) => u.ID === 'u_fin'); uw.PODERES_JSON = undefined;
  a.ctx.SGO_pode_ = ((orig) => (sid, cod) => (sid === 's_wanessa' && cod === 'FIN_COBRANCA_REGISTRAR' ? false : orig(sid, cod)))(a.ctx.SGO_pode_);
  assert.equal(quadro(a).podeRegistrar, false);
  const r = acao(a, 'wanessa', { titulo: 2, acao: 'CONTATO', canal: 'TELEFONE' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /Registrar ações da régua de cobrança|permiss/i);
  // a caixa nova está registrada, sob a trava de sigilo
  const cat = a.j(a.ctx.SGO_poderesCatalogo_());
  const cx = cat.lista.filter((p) => ['FIN_COBRANCA_REGISTRAR', 'FIN_RELATORIO_GERAR'].includes(p.codigo));
  assert.equal(cx.length, 2); assert.ok(cx.every((p) => p.modulo === 'Financeiro' && p.ligado));
});

// ================================================================= 1.8-5 previsão (números calculados à mão)
test('Previsão de 90 dias: curvas otimista e realista calculadas à mão, cruzamento do mínimo, mínimo "a definir" e sem histórico', () => {
  const a = montarB();
  const P = (o) => a.j(a.ctx.FinAg_previsao_(Object.assign({ hoje: '2026-11-16', saldo: 10000, dias: 90 }, o)));
  const c = (v) => Math.round(v * 100); // centavos
  const lista = [
    ['R', 1, 10, '2026-11-20', c(5000), 0, '', 'A', '1', '1.01', ''],     // a vencer: otimista 20/11; realista 80 % em 23/11 (atraso 3)
    ['R', 2, 10, '2026-11-01', c(2000), 0, '', 'B', '1', '1.01', ''],     // vencido há 15 dias: otimista hoje; realista 50 % em 19/11
    ['R', 3, 20, '2026-06-01', c(3000), 0, '', 'C', '1', '1.01', ''],     // vencido há mais de 90 dias: fora das duas
    ['R', 4, 20, '2026-12-01', c(1000), 0, '', 'D', '1', '1.01', '2026-12-10'], // previsão 10/12: otimista 10/12; realista 80 % em 13/12
    ['P', 5, 90, '2026-11-25', c(8000), 0, '', 'E', '1', '2.10', ''],     // a pagar
    ['P', 6, 90, '2026-11-10', c(1500), 0, '', 'F', '1', '2.03', '']      // a pagar vencido: hoje
  ];
  const prov = [{ tipo: 'R', valor: 1000, dia: '2026-12-01' }, { tipo: 'P', valor: 2000, dia: '2026-12-05' }];
  const p = P({ lista, taxas: { t15: 0.8, recuperacao: 0.5, atrasoMedio: 3 }, provisoes: prov, minimo: 6000 });
  const dia = (d) => p.dias.find((x) => x.dia === d);
  assert.deepEqual([dia('2026-11-16').otimista, dia('2026-11-16').realista], [10500, 8500], 'hoje: +2.000 vencido (otimista) e −1.500 a pagar vencido');
  assert.deepEqual([dia('2026-11-19').otimista, dia('2026-11-19').realista], [10500, 9500], '19/11: recuperação de 50 % do vencido na realista');
  assert.deepEqual([dia('2026-11-20').otimista, dia('2026-11-20').realista], [15500, 9500]);
  assert.deepEqual([dia('2026-11-23').otimista, dia('2026-11-23').realista], [15500, 13500], '23/11: 80 % de 5.000 três dias depois');
  assert.deepEqual([dia('2026-11-25').otimista, dia('2026-11-25').realista], [7500, 5500]);
  assert.deepEqual([dia('2026-12-01').otimista, dia('2026-12-01').realista], [8500, 6500], 'provisão a receber');
  assert.deepEqual([dia('2026-12-05').otimista, dia('2026-12-05').realista], [6500, 4500], 'provisão a pagar');
  assert.deepEqual([dia('2026-12-10').otimista, dia('2026-12-13').realista], [7500, 5300], 'previsão do título usada no lugar do vencimento');
  assert.equal(p.dias.length, 90); assert.equal(p.dias[89].realista, 5300);
  assert.equal(p.totais.antigos, 3000);
  assert.deepEqual(p.cruzaRealista, { dia: '2026-11-25', diaBr: '25/11/2026', saldo: 5500, saldoTxt: 'R$ 5.500,00' });
  assert.equal(p.cruzaOtimista, null);
  assert.match(p.alerta, /Atenção: pela curva realista, o saldo fica abaixo do mínimo de R\$ 6\.000,00 em 25\/11\/2026 \(R\$ 5\.500,00\)[\s\S]*otimista, não cai abaixo/);
  assert.equal(p.semanas.length, 13); assert.equal(p.semanas[1].abaixo, true); assert.equal(p.semanas[0].abaixo, false);
  assert.ok(p.premissas.some((x) => /80,0 %/.test(x)) && p.premissas.some((x) => /50,0 %/.test(x)) && p.premissas.some((x) => /3 dia/.test(x)));
  // sem mínimo: nada de mínimo inventado; avisa só o saldo negativo
  const sm = P({ lista, taxas: { t15: 0.8, recuperacao: 0.5, atrasoMedio: 3 }, provisoes: prov, minimo: null });
  assert.equal(sm.cruzaRealista, null); assert.equal(sm.minimoTxt, 'a definir'); assert.match(sm.alerta, /a definir[\s\S]*não fica negativo[\s\S]*menor saldo previsto: R\$ 4\.500,00 em 05\/12\/2026/);
  const neg = P({ saldo: 1000, lista, taxas: { t15: 0.8, recuperacao: 0.5, atrasoMedio: 3 }, minimo: null });
  assert.match(neg.alerta, /fica NEGATIVO em 16\/11\/2026/);
  // sem histórico: 100 % para o que vai vencer, zero para o vencido, e a tela diz isso
  const sh = P({ lista, taxas: { t15: null, recuperacao: null, atrasoMedio: null } });
  assert.equal(sh.dias.find((x) => x.dia === '2026-11-20').realista, 10000 - 1500 + 5000);
  assert.ok(sh.premissas.some((x) => /usa 100 %/.test(x)) && sh.premissas.some((x) => /entra com zero/.test(x)));
  assert.match(P({ saldo: null, lista }).erro, /saldo em contas/);
});

test('Agenda: Gantt com losangos (cheio vencido, vazado a vencer), barra de promessa, janela 30/60/90, previsão com o mínimo e o G2 em Indicadores', () => {
  const a = pronto();
  acao(a, 'wanessa', { titulo: 2, acao: 'PROMESSA', canal: 'TELEFONE', dataPrometida: '2026-11-27' });
  const n0 = a.rico.length;
  const r = a.j(a.ctx.FinAg_apiAgenda('s_wanessa', { dias: 30 }));
  assert.equal(r.ok, true, r.mensagem); assert.equal(r.gantt.modo, 'semana'); assert.equal(r.gantt.inicio, '09/11/2026'); assert.equal(r.gantt.fim, '16/12/2026');
  const h = r.gantt.html;
  assert.match(h, /A receber por cliente[\s\S]*Hospital Dez Fictício[\s\S]*A pagar por categoria[\s\S]*Serviços de terceiros/);
  assert.match(h, /<polygon[^>]*fill="#ffffff"/, 'losango vazado (a vencer)');
  assert.match(h, /data-ag="\d+" style="cursor:pointer"><title>1 item em 10\/11\/2026 · R\$ 1\.500,00 · vencido<\/title><polygon[^>]*fill="#a61b1b"/, 'losango cheio (a pagar vencido)');
  assert.match(h, /<rect data-ag="\d+"[^>]*fill="#c98a12"[^>]*><title>Promessa de pagamento · 1002\/001/, 'barra da promessa');
  const det = r.gantt.detalhes.map((d) => d.titulo + ' | ' + d.linhas.join(' / ')).join('\n');
  assert.match(det, /Hospital Dez Fictício · vencido antes de 09\/11\/2026 \| 1002\/001 · R\$ 4\.000,00 · vencido há 15 dia/);
  assert.match(det, /Cliente Sessenta · 19\/11\/2026 \| 1014\/001 · R\$ 800,00 · a vencer/);
  assert.equal(r.previsao.minimoTxt, 'a definir'); assert.match(r.previsao.alerta, /a definir/);
  assert.equal(r.previsao.semanas.length, 13);
  assert.equal(a.rico.length, n0, 'a agenda não chama o Omie');
  const r90 = a.j(a.ctx.FinAg_apiAgenda('s_wanessa', { dias: 90 })); assert.equal(r90.gantt.modo, 'mes'); assert.equal(r90.gantt.fim, '14/02/2027');
  assert.match(r90.gantt.html, /Viagens no cartão Caju|A pagar por categoria/);
  // com o saldo mínimo definido, a linha do mínimo aparece e a faixa diz se cruza
  a.props.FIN_SALDO_MINIMO = '29000.00';
  const rm = a.j(a.ctx.FinAg_apiAgenda('s_wanessa', { dias: 60 }));
  assert.equal(rm.previsao.minimoTxt, 'R$ 29.000,00'); assert.match(rm.previsao.svg, /stroke-dasharray="5 4"/); assert.equal(rm.previsao.abaixo, true); assert.match(rm.previsao.alerta, /abaixo do mínimo de R\$ 29\.000,00/);
  // G2 na aba Indicadores sai da agenda
  const ind = a.j(a.ctx.Fin_apiIndicadores('s_wanessa', {}));
  const g2 = ind.graficos.find((g) => g.id === 'G2'); assert.match(g2.svg, /<svg[\s\S]*polyline/); assert.match(g2.frase, /a laranja aplica/);
  // sem a lista na memória do servidor (servidor reiniciou): a tela diz o que fazer
  delete a.cache['FIN_FOTO_TIT_2026-11-16'];
  const sl = a.j(a.ctx.FinAg_apiAgenda('s_wanessa', { dias: 60 })); assert.match(sl.semLista, /não está mais na memória do servidor[\s\S]*Pedir nova fotografia/);
  assert.match(quadro(a).semLista, /não está mais na memória do servidor/);
  assert.match(a.j(a.ctx.Fin_apiIndicadores('s_wanessa', {})).graficos.find((g) => g.id === 'G2').svg, /não está mais lá/);
  // a rodada seguinte renova a memória enquanto a fotografia é a de hoje
  // 19/11/2026 (manutenção): sem a lista (reinício), a rodada não para mais em "já foi feita": refaz a fotografia sozinha
  // (até 2 vezes por dia; detalhes em tests/manutencao-geral-20261119.test.cjs)
  const b = pronto(); delete b.cache['FIN_FOTO_TIT_2026-11-16']; b.em('2026-11-16T10:15:00-03:00');
  assert.doesNotMatch(JSON.stringify(b.rodada()), /já foi feita/);
  const c = pronto(); const antes = c.cache['FIN_FOTO_TIT_2026-11-16']; c.em('2026-11-16T10:15:00-03:00'); c.rodada(); assert.equal(c.cache['FIN_FOTO_TIT_2026-11-16'], antes, 'renovada com o mesmo conteúdo');
});

// ================================================================= 1.8-8 página completa
test('Página completa: Régua de cobrança e Agenda financeira a 1366, 390 e 320 px, com guia, explicações, ação registrada pela tela e sem rolagem lateral', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const a = pronto();
  acao(a, 'wanessa', { titulo: 2, acao: 'PROMESSA', canal: 'TELEFONE', dataPrometida: '2026-11-19', proxima: '2026-11-16' });
  acao(a, 'wanessa', { titulo: 4, acao: 'DIRETORIA', motivoDiretoria: '168 dias de atraso e três promessas quebradas no ano' });
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [1366, 390, 320]) {
      const { page, erros } = await abrirPagina(browser, a, largura);
      await page.waitForFunction(() => { const b = document.getElementById('menu-btn-omie'); return b && b.style.display === ''; }, null, { timeout: 10000 });
      await page.evaluate(() => abrir('omie'));
      await page.locator('#omieCorpo').waitFor({ timeout: 10000 });
      // régua
      await page.evaluate(() => OmieTela_abrir_('regua'));
      await page.locator('.fin-cob-card').first().waitFor({ timeout: 10000 });
      await page.waitForTimeout(300);
      let t = await page.locator('#omieCorpo').innerText();
      assert.match(t, /Como fazer nesta aba/); assert.match(t, /Promessa de pagamento/); assert.match(t, /Com a Diretoria/); assert.match(t, /Hospital Dez Fictício/); assert.match(t, /Execução da cobrança/);
      assert.equal(await page.locator('.fin-cob-col').count(), 8);
      assert.match(await page.evaluate(() => (document.querySelector('.omie-dica-barra') || {}).textContent || ''), /Buscar no quadro/);
      assert.ok(await semRolagem(page), 'régua sem rolagem lateral em ' + largura);
      await page.screenshot({ path: path.join(saida, largura + '-regua-kanban.png'), fullPage: true });
      // painel do título: explicações embaixo dos campos e ação pela tela
      await page.locator('.fin-cob-card[data-tit="3"]').click();
      await page.locator('#regAcao').waitFor({ timeout: 10000 });
      await page.selectOption('#regAcao', 'CONTATO');
      await page.waitForTimeout(150);
      const dicas = await page.evaluate(() => Array.from(document.querySelectorAll('#finCobForm .omie-dica')).map((d) => d.textContent));
      assert.ok(dicas.some((d) => /^Ação: o que foi feito agora/.test(d)) && dicas.some((d) => /^Canal:/.test(d)) && dicas.some((d) => /^Próxima ação em:/.test(d)), JSON.stringify(dicas));
      assert.ok(await semRolagem(page), 'painel do título sem rolagem lateral em ' + largura);
      if (largura !== 320) await page.screenshot({ path: path.join(saida, largura + '-regua-painel.png'), fullPage: false });
      if (largura === 1366) {
        await page.selectOption('#regCanal', 'TELEFONE');
        await page.fill('#regContato', 'Bruno, tesouraria');
        await page.click('#finCobRegistrar');
        await page.waitForFunction(() => /Ação registrada/.test((document.getElementById('finCobAviso') || {}).textContent || ''), null, { timeout: 10000 });
        assert.ok(a.tabelas.FIN_COBRANCA_ACOES.some((x) => x.TITULO_OMIE === '3' && x.ACAO === 'CONTATO' && x.CONTATO === 'Bruno, tesouraria'));
      }
      await page.evaluate(() => FinCobTela_fechar_());
      // agenda
      await page.evaluate(() => OmieTela_abrir_('agenda'));
      await page.locator('.fin-ag-svg').waitFor({ timeout: 10000 });
      await page.locator('.fin-ag-graf svg').waitFor({ timeout: 10000 });
      await page.waitForTimeout(300);
      t = await page.locator('#omieCorpo').innerText();
      assert.match(t, /Como fazer nesta aba/); assert.match(t, /Previsão de caixa dos próximos 90 dias/); assert.match(t, /Saldo mínimo de segurança a definir/); assert.match(t, /Como a previsão é feita/);
      assert.match(await page.evaluate(() => (document.querySelector('.omie-dica-barra') || {}).textContent || ''), /^Período do quadro/);
      await page.locator('.fin-ag-trilho [data-ag]').first().dispatchEvent('click');
      await page.waitForFunction(() => /·/.test((document.getElementById('finAgDetalhe') || {}).textContent || ''), null, { timeout: 5000 });
      assert.ok(await semRolagem(page), 'agenda sem rolagem lateral em ' + largura);
      await page.screenshot({ path: path.join(saida, largura + '-agenda-gantt-previsao.png'), fullPage: true });
      assert.deepEqual(erros, [], 'erros de JavaScript em ' + largura);
      await page.close();
    }
  } finally { await browser.close(); }
});
