// AVISOS DA GESTÃO NO CELULAR (01/11/2026, decisão do dono): pendência, aprovação, atraso e ato irreversível por WhatsApp e
// e-mail para os gestores e a Diretoria. Gestor no expediente (fora dele, abertura do próximo dia útil); Diretoria a qualquer
// hora; pendência agrupada em 30 minutos; atraso e irreversível na hora; sem teto e sem piloto para a gestão; ponto fora.
// Código real do SGO+ num contexto isolado (tests/_matriz_ambiente.cjs), relógio controlado, nada sai de verdade. Dados fictícios.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, atividade } = require('./_matriz_ambiente.cjs');

const SEG = (hhmm) => '2026-10-19T' + hhmm + ':00-03:00';   // segunda-feira, dia útil
const filaG = (amb, filtro) => (amb.tabelas.NTF_GESTAO || []).filter((l) => Object.keys(filtro || {}).every((k) => l[k] === filtro[k]));
const emailsPara = (amb, quem) => amb.emails.filter((m) => String(m.to).indexOf(quem + '@') === 0);
const whatsPara = (amb, fone) => amb.whats.filter((w) => w.corpo.to === fone);
const FONE = { dora: '5562999990010', gil: '5562999990011', ana: '5562999990012', tiago: '5562999990013' };
const apoio = (amb, uids, ref, extra) => amb.ctx.SGO_notificar_(Object.assign({ usuarios: uids, canais: ['sgo', 'email'], evento: 'S23', origem: 'COMERCIAL', refId: ref,
  titulo: 'Pedido de apoio: ' + ref, texto: 'O vendedor pediu apoio na oportunidade ' + ref + '.' }, extra || {}));
const aprovado = (amb) => { amb.ctx.SGO_waModeloSituacao_ = (n) => (n === 'sgo_gestao_acao' ? 'APPROVED' : ''); };

// ------------------------------------------------------------------ horário (decisão 1)
test('gestor fora do expediente: fica na fila e sai às 08:00 do próximo dia útil (fim de semana e feriado de Finados pulados)', () => {
  const amb = ambiente({ agora: Date.parse('2026-10-30T20:00:00-03:00') }); // sexta, 20:00
  aprovado(amb);
  const c = amb.ctx;
  const r = apoio(amb, ['u_gt'], 'OPO-1');
  assert.equal(r.ok, 1, 'quem chamou vê o aviso como aceito');
  const l = filaG(amb, { USUARIO_ID: 'u_gt' });
  assert.equal(l.length, 1);
  assert.equal(l[0].TIPO, 'PENDENCIA');
  assert.equal(l[0].SITUACAO, 'NA_FILA');
  assert.equal(l[0].LIBERAR_EM, '2026-11-03T08:00:00', 'sábado, domingo e segunda 02/11 (Finados) não têm expediente');
  assert.equal(emailsPara(amb, 'gil').length, 0, 'nada sai à noite para o gestor');
  assert.ok(amb.tabelas.NTF_ENVIOS.some((x) => x.USUARIO_ID === 'u_gt' && x.SITUACAO === 'NA_FILA_GESTAO' && /03\/11\/2026 08:00/.test(x.MOTIVO)));
  amb.mudar('2026-11-02T10:00:00-03:00'); // feriado
  c.SGO_avisosGestaoRodada_(new c.Date());
  assert.equal(emailsPara(amb, 'gil').length, 0);
  amb.mudar('2026-11-03T08:00:00-03:00');
  c.SGO_avisosGestaoRodada_(new c.Date());
  assert.equal(emailsPara(amb, 'gil').length, 1, 'sai na primeira rodada do expediente');
  assert.equal(whatsPara(amb, FONE.gil).length, 1);
  assert.equal(filaG(amb, { USUARIO_ID: 'u_gt' })[0].SITUACAO, 'ENVIADO');
});

test('Diretoria à noite e no fim de semana: atraso e irreversível saem na hora; pendência sai em 30 minutos, sem esperar o expediente', () => {
  const amb = ambiente({ agora: Date.parse('2026-10-31T22:00:00-03:00') }); // sábado, 22:00
  aprovado(amb);
  const c = amb.ctx;
  c.SGO_avisoGestaoIrreversivel_({ evento: 'GI04', modulo: 'assistencia', quem: { id: 'u_tec', nome: 'TIAGO TECNICO TESTE' }, oque: 'Chamado cancelado', item: 'CH-2026-0001 (Clínica Exemplo)',
    motivo: 'Cliente desistiu do conserto.', tela: { tipo: 'assistencia', mod: 'assistencia', id: 'ch1' }, refId: 'AST-CANC-ch1' });
  assert.equal(emailsPara(amb, 'dora').length, 1, 'Diretoria: na hora, mesmo no sábado à noite');
  assert.equal(whatsPara(amb, FONE.dora).length, 1);
  assert.equal(emailsPara(amb, 'gil').length, 0, 'gestor da área: espera o expediente');
  assert.equal(filaG(amb, { USUARIO_ID: 'u_gt' })[0].LIBERAR_EM, '2026-11-03T08:00:00');
  // pendência para a Diretoria à noite: agrupa 30 minutos e sai (sem esperar segunda)
  apoio(amb, ['u_dir'], 'OPO-9');
  c.SGO_avisosGestaoRodada_(new c.Date());
  assert.equal(emailsPara(amb, 'dora').length, 1, 'pendência ainda agrupando');
  amb.mudar('2026-10-31T22:31:00-03:00');
  aprovado(amb);
  c.SGO_avisosGestaoRodada_(new c.Date());
  assert.equal(emailsPara(amb, 'dora').length, 2, 'pendência da Diretoria sai à noite depois de 30 minutos');
});

// ------------------------------------------------------------------ agrupamento (decisão 2)
test('agrupamento de 30 minutos: vários itens numa mensagem só por pessoa, um link por item; lista longa não perde nada', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')) });
  aprovado(amb);
  const c = amb.ctx;
  apoio(amb, ['u_gt'], 'OPO-1');
  amb.mudar(SEG('10:10')); aprovado(amb); apoio(amb, ['u_gt'], 'OPO-2');
  amb.mudar(SEG('10:20')); aprovado(amb); apoio(amb, ['u_gt'], 'OPO-3');
  amb.mudar(SEG('10:15')); aprovado(amb);
  c.SGO_avisosGestaoRodada_(new c.Date());
  assert.equal(emailsPara(amb, 'gil').length, 0, 'a mais antiga ainda não completou 30 minutos');
  amb.mudar(SEG('10:30')); aprovado(amb);
  c.SGO_avisosGestaoRodada_(new c.Date());
  const em = emailsPara(amb, 'gil');
  assert.equal(em.length, 1, 'uma mensagem só');
  assert.match(em[0].subject, /3 avisos da gestão/);
  assert.equal((em[0].body.match(/\?aviso=/g) || []).length, 3, 'um link por item');
  const wa = whatsPara(amb, FONE.gil);
  assert.equal(wa.length, 1);
  assert.equal(wa[0].corpo.template.name, 'sgo_gestao_acao');
  const ps = wa[0].corpo.template.components[0].parameters.map((p) => p.text);
  assert.equal(ps[0], 'Gil');
  assert.equal(ps[1], '3 avisos da gestão');
  assert.match(ps[2], /^1\) .*\?aviso=.* \| 2\) .* \| 3\) /);
  const linhas = filaG(amb, { USUARIO_ID: 'u_gt' });
  assert.ok(linhas.every((l) => l.SITUACAO === 'ENVIADO' && l.MENSAGEM_ID === linhas[0].MENSAGEM_ID && l.EMAIL_SITUACAO === 'ENVIADO' && l.WA_SITUACAO === 'ENVIADO'));
  assert.ok(linhas.every((l) => /final 0011/.test(l.WA_MOTIVO) && !/62999990011/.test(JSON.stringify(l))), 'celular sempre mascarado');
  // lista longa: o WhatsApp termina em "e mais N"; o e-mail leva todos os links
  for (let i = 0; i < 20; i++) apoio(amb, ['u_gt'], 'LONGA-' + i);
  amb.mudar(SEG('11:05')); aprovado(amb);
  c.SGO_avisosGestaoRodada_(new c.Date());
  const em2 = emailsPara(amb, 'gil')[1];
  assert.equal((em2.body.match(/\?aviso=/g) || []).length, 20);
  const ps2 = whatsPara(amb, FONE.gil)[1].corpo.template.components[0].parameters.map((p) => p.text);
  assert.match(ps2[2], /e mais \d+: abra a Caixa de decisões$/);
  assert.ok(ps2[2].length <= 560);
  assert.match(ps2[3], /tela=gestao_decisoes/);
});

test('atraso e irreversível furam a fila: saem na hora; a pendência da mesma pessoa continua agrupando', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')) });
  aprovado(amb);
  const c = amb.ctx;
  apoio(amb, ['u_gt'], 'OPO-1');
  amb.mudar(SEG('10:05')); aprovado(amb);
  c.SGO_notificar_({ usuarios: ['u_gt'], canais: ['sgo', 'email'], evento: 'S72', origem: 'SEDNA', refId: 'SEDNA-2-a1', titulo: 'Atividade da equipe atrasada', texto: 'Escalada a você como gestor da área.', resolvePor: 'ATV:a1' });
  const em = emailsPara(amb, 'gil');
  assert.equal(em.length, 1, 'atraso sai na hora');
  assert.equal(em[0].subject, 'SGO+ | Atividade da equipe atrasada', 'um item: o título do próprio aviso');
  assert.equal(filaG(amb, { EVENTO: 'S23' })[0].SITUACAO, 'NA_FILA', 'a pendência não foi junto');
  c.SGO_avisoGestaoIrreversivel_({ evento: 'GI04', modulo: 'assistencia', quem: { id: 'u_tec', nome: 'TIAGO TECNICO TESTE' }, oque: 'Chamado excluído (teste ou simulação)', item: 'CH-9', motivo: 'chamado de treinamento', refId: 'AST-EXC-9' });
  assert.equal(emailsPara(amb, 'gil').length, 2, 'irreversível na hora');
  amb.mudar(SEG('10:30')); aprovado(amb);
  c.SGO_avisosGestaoRodada_(new c.Date());
  assert.equal(emailsPara(amb, 'gil').length, 3, 'a pendência sai quando completa 30 minutos');
});

// ------------------------------------------------------------------ irreversível (decisão 4)
test('irreversível vai ao gestor da área e à Diretoria, com quem fez, o quê, o item e o motivo; quem fez não recebe; fica resolvido', () => {
  const amb = ambiente({ agora: Date.parse(SEG('11:00')) });
  const c = amb.ctx;
  const r = c.SGO_avisoGestaoIrreversivel_({ evento: 'GI04', modulo: 'assistencia', quem: { id: 'u_tec', nome: 'TIAGO TECNICO TESTE' }, oque: 'Chamado cancelado', item: 'CH-2026-0007 (Hospital Exemplo)',
    motivo: 'O cliente resolveu com outro fornecedor.', tela: { tipo: 'assistencia', mod: 'assistencia', id: 'ch7' }, refId: 'AST-CANC-ch7' });
  assert.equal(r.avisados, 2, JSON.stringify(r));
  ['gil', 'dora'].forEach((p) => {
    const m = emailsPara(amb, p);
    assert.equal(m.length, 1, p);
    assert.match(m[0].body, /Quem fez: TIAGO TECNICO TESTE\.\nO quê: Chamado cancelado\.\nItem: CH-2026-0007 \(Hospital Exemplo\)\.\nMotivo: O cliente resolveu com outro fornecedor\./);
    assert.match(m[0].body, /Ato irreversível/);
  });
  assert.ok(filaG(amb, { EVENTO: 'GI04' }).every((l) => l.SITUACAO === 'RESOLVIDO' && l.RESOLVIDO_EM && l.TIPO === 'IRREVERSIVEL'));
  // o gestor que fez não recebe; vai só à Diretoria
  c.SGO_avisoGestaoIrreversivel_({ evento: 'GI04', modulo: 'assistencia', quem: { id: 'u_gt', nome: 'GIL GESTOR TESTE' }, oque: 'Chamado cancelado', item: 'CH-8', motivo: 'duplicado', refId: 'AST-CANC-ch8' });
  assert.deepEqual(filaG(amb, { REF_ID: 'AST-CANC-ch8' }).map((l) => l.USUARIO_ID), ['u_dir']);
  // Programa de conduta: só a Diretoria e sem detalhe (sigilo)
  c.SGO_avisoGestaoIrreversivel_({ evento: 'GI05', modulo: 'conduta', soDiretoria: true, sensivel: true, quem: { id: 'u_gt', nome: 'GIL GESTOR TESTE' }, oque: 'Ocorrência mantida no julgamento', item: 'ocorrência do Programa de conduta', refId: 'CND-1' });
  const cnd = filaG(amb, { REF_ID: 'CND-1' });
  assert.deepEqual(cnd.map((l) => l.USUARIO_ID), ['u_dir']);
  assert.match(cnd[0].TEXTO, /detalhe e o motivo ficam só no sistema/);
});

// ------------------------------------------------------------------ falhas e modelo
test('WhatsApp falhando (erro da Meta, sem celular): o e-mail sai e o motivo fica registrado; modelo não aprovado vai para o e-mail com a marca', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')) });
  const c = amb.ctx;
  // 1) modelo não aprovado (situação desconhecida ou em análise): só e-mail, marcado
  apoio(amb, ['u_gt'], 'OPO-1');
  amb.mudar(SEG('10:31'));
  c.SGO_avisosGestaoRodada_(new c.Date());
  let l = filaG(amb, { REF_ID: 'OPO-1' })[0];
  assert.equal(l.EMAIL_SITUACAO, 'ENVIADO');
  assert.equal(l.WA_SITUACAO, 'AGUARDANDO_MODELO');
  assert.match(l.WA_MOTIVO, /WhatsApp aguardando modelo: o modelo sgo_gestao_acao ainda não está aprovado/);
  assert.equal(amb.whats.length, 0, 'nunca troca pelo sgo_aviso_geral (Marketing)');
  c.SGO_waModeloSituacao_ = () => 'PENDING';
  apoio(amb, ['u_gt'], 'OPO-2');
  amb.mudar(SEG('11:05')); c.SGO_waModeloSituacao_ = () => 'PENDING';
  c.SGO_avisosGestaoRodada_(new c.Date());
  assert.match(filaG(amb, { REF_ID: 'OPO-2' })[0].WA_MOTIVO, /situação: PENDING/);
  assert.equal(c.SGO_avisosGestaoConferir_(new c.Date()).totais.aguardandoModelo, 2);
  // 2) erro da Meta: cai para o e-mail com o motivo
  aprovado(amb);
  c.UrlFetchApp.fetch = () => ({ getResponseCode: () => 400, getContentText: () => JSON.stringify({ error: { code: 131026, message: 'Message undeliverable' } }) });
  apoio(amb, ['u_gt'], 'OPO-3');
  amb.mudar(SEG('11:40')); aprovado(amb);
  c.SGO_avisosGestaoRodada_(new c.Date());
  l = filaG(amb, { REF_ID: 'OPO-3' })[0];
  assert.equal(l.SITUACAO, 'ENVIADO');
  assert.equal(l.EMAIL_SITUACAO, 'ENVIADO');
  assert.equal(l.WA_SITUACAO, 'FALHOU');
  assert.match(l.WA_MOTIVO, /Meta recusou.*O aviso foi por e-mail/);
  // 3) sem celular no cadastro
  amb.tabelas.CAD_USUARIOS.find((u) => u.ID === 'u_ga').CELULAR = '';
  apoio(amb, ['u_ga'], 'OPO-4');
  amb.mudar(SEG('12:15')); aprovado(amb);
  c.SGO_avisosGestaoRodada_(new c.Date());
  l = filaG(amb, { REF_ID: 'OPO-4' })[0];
  assert.equal(l.WA_SITUACAO, 'SEM_NUMERO');
  assert.equal(l.EMAIL_SITUACAO, 'ENVIADO');
  assert.equal(emailsPara(amb, 'ana').length, 1, 'PJ da gestão recebe (decisão 5)');
});

test('PJ da gestão recebe o WhatsApp da gestão (sem piloto, sem regra de vínculo); o modelo novo é de Utilidade e passa nas regras da Meta', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')) });
  aprovado(amb);
  const c = amb.ctx;
  apoio(amb, ['u_ga'], 'OPO-PJ');
  amb.mudar(SEG('10:30')); aprovado(amb);
  c.SGO_avisosGestaoRodada_(new c.Date());
  assert.equal(whatsPara(amb, FONE.ana).length, 1, 'Ana é PJ e gestora');
  const def = c.NTF_MODELOS_META.sgo_gestao_acao;
  assert.deepEqual(Array.from(c.Notificar_validarModeloMeta_('sgo_gestao_acao', def)), []);
  const corpo = c.Notificar_corpoCadastroMeta_('sgo_gestao_acao');
  assert.equal(corpo.category, 'UTILITY');
  assert.equal(corpo.language, 'pt_BR');
  assert.ok(!/aprovar|recusar/i.test(def.texto.replace('decidir', '')), 'sem botão nem texto de aprovar ou recusar pelo WhatsApp');
});

// ------------------------------------------------------------------ conferência
test('conferência: parado na fila há mais de 1 hora, enviado sem resolução depois do prazo e falha sem e-mail aparecem; a espera do expediente não', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')) });
  const c = amb.ctx;
  const us = c.Mtz_usuarios_();
  c.AvG_enfileirar_({ evento: 'S23', tipo: 'PENDENCIA', modulo: 'comercial', u: us.u_gt, titulo: 'Parado', texto: 'x', refId: 'PARADO-1' });
  c.AvG_enfileirar_({ evento: 'GS01', tipo: 'PENDENCIA', modulo: 'gestao', u: us.u_dir, titulo: 'Com prazo', texto: 'x', refId: 'CX-1', resolvePor: 'CAIXA:CX-1', prazo: '2026-10-19T12:00:00' });
  amb.tabelas.CAD_USUARIOS.find((u) => u.ID === 'u_ga').EMAIL = '';
  amb.tabelas.CAD_USUARIOS.find((u) => u.ID === 'u_ga').CELULAR = '';
  c.AvG_enfileirar_({ evento: 'S23', tipo: 'PENDENCIA', modulo: 'comercial', u: c.Mtz_usuarios_().u_ga, titulo: 'Sem contato', texto: 'x', refId: 'SEMC-1' });
  amb.mudar(SEG('10:40'));
  // só a Dora e a Ana entram na rodada (a do Gil fica "parada" de propósito, como se a rodada dele não tivesse rodado)
  c.AvG_enviarProntos_(new c.Date(), false, ['u_dir', 'u_ga']);
  amb.mudar(SEG('13:00'));
  const r = c.SGO_avisosGestaoConferir_(new c.Date());
  assert.equal(r.ok, true);
  assert.deepEqual(Array.from(r.paradosNaFila, (i) => i.titulo), ['Parado']);
  assert.deepEqual(Array.from(r.semResolucao, (i) => i.titulo), ['Com prazo']);
  assert.deepEqual(Array.from(r.falhasSemEmail, (i) => i.titulo), ['Sem contato']);
  assert.match(r.falhasSemEmail[0].motivo, /Sem e-mail no cadastro/);
  assert.match(r.texto, /Na fila há mais de 1 hora: 1\./);
  assert.match(r.geradoEm, /^19\/10\/2026 13:00$/);
  // a espera do expediente não é "parado": item do gestor criado no domingo, conferido na segunda 08:30
  const amb2 = ambiente({ agora: Date.parse('2026-10-18T20:00:00-03:00') });
  apoio(amb2, ['u_gt'], 'DOM-1');
  amb2.mudar('2026-10-19T08:30:00-03:00');
  assert.equal(amb2.ctx.SGO_avisosGestaoConferir_(new amb2.ctx.Date()).totais.paradosNaFila, 0);
});

// ------------------------------------------------------------------ ponto e teto antigo
test('ponto continua fora: mensagem do ponto e item da Caixa do ponto não viram aviso da gestão', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')), props: { AVG_IMPLANTADO_EM: '2026-10-19T09:00' }, tabelas: {
    GES_DECISOES: [{ ID: 'd1', ITEM_ID: 'PONTO:AJ:1', TIPO: 'PONTO_AJUSTE_PARADO', MODULO: 'ponto', TITULO: 'Ajuste de ponto parado', RESPONSAVEIS_IDS: 'u_gt', SITUACAO: 'ABERTA', ENTROU_EM: '2026-10-19T09:30', PRAZO_DECISAO: '2026-10-20' }] } });
  const c = amb.ctx;
  c.SGO_notificar_({ usuarios: ['u_gt'], canais: ['whatsapp'], categoria: 'PONTO', origem: 'PONTO', evento: 'S72', refId: 'PONTO-1', titulo: 'Lembrete do ponto', texto: 'x' });
  c.SGO_avisosGestaoRodada_(new c.Date());
  assert.equal(filaG(amb).length, 0);
});

test('teto antigo continua para quem não é gestão; o gestor do mesmo evento vai pela fila da gestão e não entra na conta', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')), props: { ATV_AVISOS_CFG: JSON.stringify({ whatsappResumo: true, horaResumo: '09:00', vinculosWhatsapp: ['CLT'], pjDecisao20261026: true }) } });
  const c = amb.ctx;
  assert.equal(c.SGO_AvisosMatriz_api('s_dir', 'salvarRegra', { cod: 'S72', email: 'HORA', whatsapp: 'HORA', decisao: 'AVISA', motivo: 'teste do teto para a equipe' }).ok, true);
  for (let i = 1; i <= 4; i++) c.SGO_notificar_({ usuarios: ['u_tec', 'u_gt'], canais: ['sgo', 'email'], evento: 'S72', origem: 'SEDNA', refId: 'T-' + i, titulo: 'Atrasada ' + i, texto: 'Texto ' + i });
  const sitTiago = amb.tabelas.NTF_ENVIOS.filter((l) => l.USUARIO_ID === 'u_tec' && l.CANAL === 'whatsapp').map((l) => l.SITUACAO);
  assert.deepEqual(sitTiago, ['OK', 'OK', 'OK', 'PULADO'], 'Tiago (técnico) segue o teto de 3 por dia');
  assert.match(amb.tabelas.NTF_ENVIOS.filter((l) => l.USUARIO_ID === 'u_tec' && l.SITUACAO === 'PULADO').pop().MOTIVO, /teto de 3/);
  assert.equal(filaG(amb, { USUARIO_ID: 'u_tec' }).length, 0, 'técnico não entra na fila da gestão');
  assert.equal(filaG(amb, { USUARIO_ID: 'u_gt' }).length, 4, 'gestor: 4 avisos da gestão, sem teto');
  assert.ok(!amb.tabelas.NTF_ENVIOS.some((l) => l.USUARIO_ID === 'u_gt' && l.CANAL === 'whatsapp' && l.ORIGEM === 'SEDNA'), 'o WhatsApp do gestor não passa pela regra comum');
});

// ------------------------------------------------------------------ idempotência
test('nenhum aviso duplicado: mesmo evento + item + pessoa não se repete (módulo, irreversível e Caixa de decisões)', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')), props: { AVG_IMPLANTADO_EM: '2026-10-19T09:00' }, tabelas: {
    GES_DECISOES: [{ ID: 'd1', ITEM_ID: 'COM:DESC:p1', TIPO: 'COMERCIAL_DESCONTO', MODULO: 'comercial', TITULO: 'Desconto acima da alçada: PROP-1', RESPONSAVEIS_IDS: 'u_gt', SITUACAO: 'ABERTA', ENTROU_EM: '2026-10-19T09:30', PRAZO_DECISAO: '2026-10-20' }] } });
  const c = amb.ctx;
  apoio(amb, ['u_gt'], 'OPO-1'); apoio(amb, ['u_gt'], 'OPO-1');
  assert.equal(filaG(amb, { REF_ID: 'OPO-1' }).length, 1);
  const irr = { evento: 'GI04', modulo: 'assistencia', quem: { id: 'u_tec', nome: 'TIAGO' }, oque: 'Chamado cancelado', item: 'CH-1', motivo: 'teste', refId: 'AST-CANC-1' };
  c.SGO_avisoGestaoIrreversivel_(irr); c.SGO_avisoGestaoIrreversivel_(irr);
  assert.equal(filaG(amb, { REF_ID: 'AST-CANC-1' }).length, 2, 'uma linha por pessoa (Gil e Dora)');
  assert.equal(emailsPara(amb, 'gil').length, 1);
  c.SGO_avisosGestaoRodada_(new c.Date()); c.SGO_avisosGestaoRodada_(new c.Date());
  assert.equal(filaG(amb, { EVENTO: 'GS01' }).length, 1);
  assert.equal(new Set(filaG(amb).map((l) => l.CHAVE)).size, filaG(amb).length);
});

// ------------------------------------------------------------------ Caixa de decisões, link e resolução
test('Caixa de decisões: decisão nova (GS01), prazo vencido (GS02, na hora), escalada à Diretoria (GS03); link abre o item exato; resolvido sai do ciclo', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')), props: { AVG_IMPLANTADO_EM: '2026-10-19T09:00' }, tabelas: {
    GES_DECISOES: [
      { ID: 'd1', ITEM_ID: 'COM:DESC:p1', TIPO: 'COMERCIAL_DESCONTO', MODULO: 'comercial', TITULO: 'Desconto acima da alçada: PROP-1', DETALHE: 'Desconto de 18% pedido por Sara.', RESPONSAVEIS_IDS: 'u_gt', RESPONSAVEIS_NOMES: 'GIL GESTOR TESTE',
        SITUACAO: 'ABERTA', ENTROU_EM: '2026-10-19T09:30', PRAZO_DECISAO: '2026-10-20', TELA_JSON: JSON.stringify({ tipo: 'comercial', aba: 'propostas', id: 'p1' }) },
      { ID: 'd0', ITEM_ID: 'VELHO:1', TIPO: 'PADRAO_VENCIDO', MODULO: 'padroes', TITULO: 'Item antigo', RESPONSAVEIS_IDS: 'u_gt', SITUACAO: 'ABERTA', ENTROU_EM: '2026-10-10T09:30', PRAZO_DECISAO: '2026-10-11' },
      { ID: 'd2', ITEM_ID: 'ACOMP:1', TIPO: 'DOCUMENTO_VENCIDO', MODULO: 'documentos', TITULO: 'Acompanhamento', RESPONSAVEIS_IDS: 'u_gt', SITUACAO: 'ABERTA', ACOMPANHAMENTO: 'SIM', ENTROU_EM: '2026-10-19T09:40', PRAZO_DECISAO: '2026-10-25' }
    ] } });
  aprovado(amb);
  const c = amb.ctx;
  const r1 = c.SGO_avisosGestaoRodada_(new c.Date());
  assert.ok(r1.matriz >= 10, 'decisão do dono gravada na trilha: ' + JSON.stringify(r1));
  const trilha = amb.tabelas.NTF_REGRAS;
  assert.ok(trilha.every((t) => /^decisão do dono 01\/11\/2026/.test(t.MOTIVO) && JSON.parse(t.DEPOIS_JSON).gestaoLigada === true));
  assert.ok(trilha.some((t) => t.CODIGO === 'S72' && JSON.parse(t.DEPOIS_JSON).email === 'HORA'), 'merge: o canal em vigor foi preservado');
  const gs = filaG(amb, { EVENTO: 'GS01' });
  assert.equal(gs.length, 1, 'só o item novo (nem o antigo, nem o de acompanhamento)');
  assert.match(gs[0].TITULO, /^Aprovação · .*Desconto acima da alçada: PROP-1/);
  assert.equal(gs[0].RESOLVE_POR, 'CAIXA:COM:DESC:p1');
  amb.mudar(SEG('10:30')); aprovado(amb);
  c.SGO_avisosGestaoRodada_(new c.Date());
  const em = emailsPara(amb, 'gil')[0];
  assert.match(em.body, /Prazo de decisão: 20\/10\/2026/);
  const link = /\?aviso=([A-Za-z0-9-]+)/.exec(em.body)[1];
  // link: abre a ação exata (a mesma do Início) e grava que a pessoa abriu
  const ab = c.SGO_AvisosGestao_api('s_gt', 'abrir', { aviso: link });
  assert.equal(ab.ok, true, ab.message);
  assert.deepEqual(JSON.parse(JSON.stringify(ab.tela)), { tipo: 'comercial', aba: 'propostas', id: 'p1' });
  assert.ok(filaG(amb, { EVENTO: 'GS01' })[0].ABERTO_EM);
  assert.equal(c.SGO_AvisosGestao_api('s_gt', 'abrir', { aviso: 'AGinexistente1' }).tela.mod, 'gestao_decisoes', 'link desconhecido: abre a Caixa, com o motivo');
  // prazo vencido sem ação: GS02, na hora
  amb.mudar('2026-10-21T10:00:00-03:00'); aprovado(amb);
  c.SGO_avisosGestaoRodada_(new c.Date());
  const gs2 = filaG(amb, { EVENTO: 'GS02' });
  assert.equal(gs2.length, 1);
  assert.equal(gs2[0].SITUACAO, 'ENVIADO', 'atraso sai na mesma rodada');
  // escalada à Diretoria: GS03
  amb.tabelas.GES_DECISOES[0].ESCALADO_EM = '2026-10-21T10:05'; amb.tabelas.GES_DECISOES[0].ESCALADO_PARA = 'u_dir';
  amb.mudar('2026-10-21T10:15:00-03:00'); aprovado(amb);
  c.SGO_avisosGestaoRodada_(new c.Date());
  const gs3 = filaG(amb, { EVENTO: 'GS03' });
  assert.deepEqual(gs3.map((l) => l.USUARIO_ID), ['u_dir']);
  assert.match(gs3[0].TEXTO, /com GIL GESTOR TESTE/);
  // decidido: sai da Caixa e o aviso fica resolvido
  amb.tabelas.GES_DECISOES[0].SITUACAO = 'RESOLVIDA';
  amb.mudar('2026-10-21T10:30:00-03:00');
  c.SGO_avisosGestaoRodada_(new c.Date());
  assert.ok(filaG(amb, { REF_ID: 'COM:DESC:p1' }).every((l) => l.SITUACAO === 'RESOLVIDO' && l.RESOLVIDO_EM));
  // retorno da Meta (entregue / lido), pronto para o servidor chamar
  const wamid = filaG(amb, { EVENTO: 'GS01' })[0].WA_ID;
  assert.ok(wamid);
  assert.equal(c.SGO_avisosGestaoRetornoMeta_(wamid, 'read', '2026-10-21T10:40:00-03:00'), 1);
  assert.equal(filaG(amb, { EVENTO: 'GS01' })[0].WA_SITUACAO, 'LIDO');
});

test('SEDNA: atividade escalada ao gestor vira aviso da gestão (atraso) e sai do ciclo quando a atividade é concluída', () => {
  const amb = ambiente();
  const c = amb.ctx;
  atividade(amb, 'alta', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-19T05:00', { PRIORIDADE: 'Alta', CRIADO_POR_ID: 'u_tec' });
  c.Sedna_escalonar_();
  const l = filaG(amb, { EVENTO: 'S72', USUARIO_ID: 'u_gt' });
  assert.equal(l.length, 1);
  assert.equal(l[0].TIPO, 'ATRASO');
  assert.equal(l[0].RESOLVE_POR, 'ATV:alta');
  assert.equal(emailsPara(amb, 'gil').length, 1);
  amb.tabelas.ATV_ATIVIDADES.find((a) => a.ID === 'alta').SITUACAO = 'Concluída';
  amb.mudar('2026-10-19T10:30:00-03:00');
  c.SGO_avisosGestaoRodada_(new c.Date());
  assert.equal(filaG(amb, { EVENTO: 'S72', USUARIO_ID: 'u_gt' })[0].SITUACAO, 'RESOLVIDO');
});

// ------------------------------------------------------------------ telas
test('telas: a matriz mostra e ajusta o aviso da gestão (com trilha e merge); painel do dia; Meus avisos mostra o obrigatório da gestão', () => {
  const amb = ambiente({ agora: Date.parse(SEG('10:00')) });
  const c = amb.ctx;
  const m = c.SGO_AvisosMatriz_api('s_dir', 'carregar', {});
  const por = Object.fromEntries(m.regras.map((x) => [x.cod, x]));
  assert.equal(por.S23.gestao, 'PENDENCIA'); assert.equal(por.S23.gestaoLigada, true); assert.equal(por.S23.gestaoTipo, 'Pendência / Aprovação');
  assert.equal(por.GI01.gestao, 'IRREVERSIVEL'); assert.equal(por.S72.gestao, 'ATRASO');
  assert.equal(por.S01.gestao, '', 'informativo e evento da equipe não mudam');
  // desligar o aviso da gestão do S23: o gestor volta à regra comum (e-mail na hora)
  const s = c.SGO_AvisosMatriz_api('s_dir', 'salvarRegra', { cod: 'S23', email: 'HORA', whatsapp: 'NAO', decisao: 'AVISA', gestaoLigada: 'NAO', motivo: 'teste de desligar a gestão' });
  assert.equal(s.ok, true, s.message);
  assert.equal(c.SGO_avisoRegra_('S23').gestaoLigada, false);
  const t = c.SGO_AvisosMatriz_api('s_dir', 'trilha', {}).trilha[0];
  assert.equal(t.antes.gestaoLigada, true); assert.equal(t.depois.gestaoLigada, false);
  apoio(amb, ['u_gt'], 'OPO-DESL');
  assert.equal(filaG(amb).length, 0);
  assert.equal(emailsPara(amb, 'gil').length, 1, 'regra comum: e-mail na hora');
  // salvar sem o campo mantém o que está (merge)
  c.SGO_AvisosMatriz_api('s_dir', 'salvarRegra', { cod: 'S23', email: 'HORA', whatsapp: 'NAO', decisao: 'AVISA', motivo: 'outro ajuste qualquer' });
  assert.equal(c.SGO_avisoRegra_('S23').gestaoLigada, false);
  // painel do dia
  c.SGO_avisoGestaoIrreversivel_({ evento: 'GI04', modulo: 'assistencia', quem: { id: 'u_tec', nome: 'TIAGO' }, oque: 'Chamado cancelado', item: 'CH-1', motivo: 'teste', refId: 'AST-CANC-1' });
  const g = c.SGO_AvisosMatriz_api('s_dir', 'gestaoHoje', {});
  assert.equal(g.ok, true, g.message);
  assert.equal(g.gestao.totais.enviados, 2);
  assert.equal(g.gestao.modelo.situacao, 'NAO_CADASTRADO');
  assert.ok(g.gestao.linhas.every((x) => x.whatsappNome === 'WhatsApp aguardando modelo' && x.motivo));
  assert.match(c.SGO_AvisosMatriz_api('s_gt', 'gestaoHoje', {}).message, /Administrador e da Diretoria/);
  // Meus avisos
  const mg = c.SGO_MeusAvisos_api('s_gt', 'carregar', {});
  assert.equal(mg.gestao.ehGestao, true);
  assert.match(mg.gestao.texto, /obrigatórios para quem responde pela gestão: decisão do dono em 01\/11\/2026/);
  assert.match(mg.gestao.texto, /Gestor: só no expediente/);
  assert.match(c.SGO_MeusAvisos_api('s_dir', 'carregar', {}).gestao.texto, /Diretoria: a qualquer hora/);
  assert.equal(c.SGO_MeusAvisos_api('s_tec', 'carregar', {}).gestao.ehGestao, false);
});
