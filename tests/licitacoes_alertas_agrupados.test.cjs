// SGO+ Licitações, envio agrupado dos alertas (03/11/2026, pedido do dono: "muitos repetidos" na caixa de e-mail). Na produção de
// 02/11 saíram 20 e-mails em 24 h: um por prazo e por pessoa, mais um "Lembrete (sem ciência)" de cada 15 min depois. Agora os
// alertas da mesma licitação para a mesma pessoa na mesma rodada saem numa mensagem só, com um link de ciência para todos.
// Código real do notificador, da matriz, do piloto e dos avisos da gestão; e-mail e WhatsApp simulados (nada sai). Todas as datas
// pelo relógio do ambiente (nunca o relógio real).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, OP, ler } = require('./_licitacoes_alertas_ambiente.cjs');

// LIC-2026-0114: impugnação e esclarecimento com o mesmo limite interno (ter 03/11 17:00); a sessão é na seg 09/11 09:00.
// LIC-2026-0131: os mesmos dois e o fim das propostas na seg 09/11 17:00: o aviso de 7 dias do fim das propostas vence junto
// com o de 1 dia da impugnação e do esclarecimento (seg 02/11 17:00). Sem responsável: os dois integrantes recebem.
const CASO = () => [
  OP('op_0114', { ORGAO_NOME: 'CONSORCIO INTERMUNICIPAL CONVALES', ENCERRAMENTO_PROPOSTAS: '2026-11-09T09:00:00', ENCERRAMENTO_ISO: '2026-11-09T12:00:00.000Z' }),
  OP('op_0131', { ORGAO_NOME: 'HOSPITAL ESTADUAL DE TESTE', ENCERRAMENTO_PROPOSTAS: '2026-11-09T17:00:00', ENCERRAMENTO_ISO: '2026-11-09T20:00:00.000Z' })
];
// antes das 17:00: o aviso de 7 dias do fim das propostas da LIC-2026-0114 sai sozinho às 09:00 e o lembrete dele às 10:00
const preparar = (a) => { a.rodada(); a.rodada('2026-11-02T09:00:30-03:00'); a.rodada('2026-11-02T10:00:30-03:00'); return { e0: a.emails.length, z0: a.zap().length }; };
const daRodada = (x) => String(x.CRIADO_EM) >= '2026-11-02T11:00:00.000Z' && x.EVENTO_TIPO !== 'LIMITE_PROPOSTA' || x.OPORTUNIDADE_ID === 'op_0131';
const doCaso = (a, para, codigo, e0) => a.emails.slice(e0 || 0).filter((m) => m.to === para && m.subject.includes('Licitação ' + codigo));
const tokenDo = (m) => (/licciente=(c1e\.L[AG][0-9a-f]{10}\.[0-9a-f]{24})/.exec(m.body) || [])[1];

test('cenário real: 1 e-mail por licitação e por pessoa (4, não 10), com a lista dos prazos, o mais urgente no começo e um link de ciência', () => {
  const a = ambiente({ ops: CASO(), agora: '2026-11-02T08:00:00-03:00' });
  a.rodada();
  assert.equal(a.emails.length, 0, 'a implantação não manda nada atrasado');
  const { e0, z0 } = preparar(a);
  const r = a.rodada('2026-11-02T17:00:30-03:00');
  const enviados = a.al({ SITUACAO: 'ENVIADO', ENVIO_GRUPO: (g) => !!g });
  assert.equal(enviados.length, 10, 'continuam 10 alertas, cada um com a sua linha (2 + 3 por pessoa)');
  assert.equal(a.emails.length - e0, 4, 'antes: 10 e-mails quase iguais');
  assert.equal(a.zap().length - z0, 4, 'e 4 WhatsApp, não 10');
  assert.equal(r.enviar.mensagens, 4); assert.equal(r.enviar.agrupados, 4);
  for (const para of ['charles@exemplo.test', 'thiago@exemplo.test']) {
    assert.equal(doCaso(a, para, 'LIC-2026-0114', e0).length, 1);
    assert.equal(doCaso(a, para, 'LIC-2026-0131', e0).length, 1);
  }
  const m = doCaso(a, 'charles@exemplo.test', 'LIC-2026-0131')[0];
  assert.match(m.subject, /Licitação LIC-2026-0131: 3 prazos nos próximos 7 dias · HOSPITAL ESTADUAL DE TESTE/);
  assert.match(m.body, /3 prazos desta licitação nesta mensagem\. O mais urgente: Limite para (impugnar o edital|pedir esclarecimento)/);
  assert.match(m.body, /ALERTAS DE LICITAÇÃO \(importante\)/, 'o grupo sai no nível do mais grave');
  for (const nome of ['Limite para impugnar o edital', 'Limite para pedir esclarecimento', 'Fim do envio das propostas']) assert.ok(m.body.includes(nome), nome);
  assert.equal((m.body.match(/Natureza: /g) || []).length, 3, 'cada prazo com natureza e fonte');
  assert.ok((m.body.match(/limite interno /g) || []).length >= 2, 'o limite interno de cada prazo que tem');
  assert.equal((m.body.match(/   Ação: /g) || []).length, 3, 'a ação de cada prazo');
  assert.equal((m.body.match(/licciente=/g) || []).length, 1, 'um link de ciência só');
  assert.match(tokenDo(m), /^c1e\.LG/);
  const m14 = doCaso(a, 'thiago@exemplo.test', 'LIC-2026-0114', e0)[0];
  assert.match(m14.subject, /Licitação LIC-2026-0114: 2 prazos nas próximas 24 h · CONSORCIO INTERMUNICIPAL CONVALES/);
  // WhatsApp: mesmo modelo, 9 variáveis; {{5}} o resumo, {{6}} e {{7}} o mais próximo
  const z = a.zap().find((w) => w.corpo.to === '5562999990021' && JSON.stringify(w.corpo).includes('fim das propostas'));
  const p = z.corpo.template.components[0].parameters.map((q) => q.text);
  assert.equal(p.length, 9);
  assert.match(p[4], /^3 prazos: /); for (const n of ['impugnação', 'esclarecimento', 'fim das propostas']) assert.ok(p[4].includes(n), n);
  assert.match(p[5], /04\/11/); assert.match(p[6], /limite interno/); assert.match(p[7], /e mais 2 itens no e-mail e no SGO\+/);
  assert.ok(p.every((t) => !/[\n\t]/.test(t)), 'variável do modelo sem quebra de linha');
  // registro: cada linha com o código do envio e o histórico próprio
  const g31 = a.al({ OPORTUNIDADE_ID: 'op_0131', USUARIO_ID: 'u_cha', PAPEL: 'TODOS', ENVIO_GRUPO: (x) => !!x });
  assert.equal(new Set(g31.map((x) => x.ENVIO_GRUPO)).size, 1); assert.match(g31[0].ENVIO_GRUPO, /^LG[0-9a-f]{10}$/);
  assert.ok(g31.every((x) => x.EMAIL_SITUACAO === 'ENVIADO' && x.WA_SITUACAO === 'ACEITO' && x.WA_ID === g31[0].WA_ID));
  assert.equal(a.hist('ALERTA_ENVIADO').filter((h) => /numa mensagem só com/.test(h.TEXTO)).length, 10);
  // o escalonamento do grupo é um só
  assert.equal(new Set(g31.map((x) => x.ESCALONAR_EM)).size, 1);
});

test('lembrete: no máximo um por grupo e por pessoa; a ciência pelo link do grupo encerra todos, para os dois', () => {
  const a = ambiente({ ops: CASO(), agora: '2026-11-02T08:00:00-03:00' });
  preparar(a); a.rodada('2026-11-02T17:00:30-03:00');
  // Charles confirma a LIC-2026-0131 pelo link do e-mail (sem login): os 3 alertas dele e os 3 do Thiago ficam com ciência
  const tok = tokenDo(doCaso(a, 'charles@exemplo.test', 'LIC-2026-0131').slice(-1)[0]);
  const ver = a.ctx.Licitacoes_cienciaLink(tok, 'ver');
  assert.equal(ver.ok, true); assert.equal(ver.ciente, false); assert.match(ver.prazo, /^3 prazos: .*um clique confirma todos/); assert.equal(ver.grupo, 3);
  const conf = a.ctx.Licitacoes_cienciaLink(tok, 'confirmar');
  assert.equal(conf.ciente, true, conf.message); assert.equal(conf.cientePor, 'CHARLES DIRETOR TESTE');
  const op31 = a.al({ OPORTUNIDADE_ID: 'op_0131', ENVIO_GRUPO: (g) => !!g });
  assert.equal(op31.length, 6); assert.ok(op31.every((x) => x.SITUACAO === 'CIENTE'));
  assert.equal(op31.filter((x) => x.CIENTE_CANAL === 'EMAIL_LINK').length, 3); assert.equal(op31.filter((x) => x.CIENTE_CANAL === 'EMAIL_LINK_OUTRO').length, 3);
  assert.equal(a.ctx.Licitacoes_cienciaLink(tok, 'confirmar').ciente, true, 'repetir não duplica');
  assert.equal(a.hist('ALERTA_CIENCIA').length, 3);
  // 15 min depois (importante): lembrete só da LIC-2026-0114, UM por pessoa (antes: um por prazo e por pessoa)
  const z0 = a.zap().length, e0 = a.emails.length;
  a.rodada('2026-11-02T17:16:00-03:00');
  const novosZ = a.zap().slice(z0), novosE = a.emails.slice(e0);
  assert.equal(novosZ.length + novosE.length, 2, 'um lembrete para cada um, e nada da LIC-2026-0131');
  assert.equal(novosZ.filter((w) => w.corpo.to === '5562999990021').length + novosE.filter((m) => m.to === 'charles@exemplo.test').length, 1);
  const lemb = a.al({ PAPEL: 'REENVIO' }).filter(daRodada);
  assert.equal(lemb.length, 4, 'as 4 linhas de lembrete continuam no registro (2 prazos x 2 pessoas)');
  assert.ok(lemb.every((x) => x.OPORTUNIDADE_ID === 'op_0114' && x.SITUACAO === 'ENVIADO' && x.ENVIO_GRUPO));
  assert.equal(new Set(lemb.filter((x) => x.USUARIO_ID === 'u_thi').map((x) => x.ENVIO_GRUPO)).size, 1);
  // mais rodadas: nenhum lembrete do lembrete
  const t0 = a.zap().length + a.emails.length;
  a.rodada('2026-11-02T17:40:00-03:00'); a.rodada('2026-11-02T19:00:00-03:00');
  assert.equal(a.zap().length + a.emails.length, t0);
  // a resposta "Ciente" de uma pessoa à mensagem do grupo encerra os dois prazos, para os dois
  const w = a.al({ OPORTUNIDADE_ID: 'op_0114', USUARIO_ID: 'u_thi', PAPEL: 'TODOS', EVENTO_TIPO: 'PRAZO_IMPUGNACAO' })[0];
  assert.equal(a.ctx.SGO_whatsappRetornoMeta_([{ tipo: 'RESPOSTA', contexto: w.WA_ID, de: '5562999990022', texto: 'Ciente', quando: '' }]).ciencias, 1);
  assert.ok(a.al({ OPORTUNIDADE_ID: 'op_0114', ENVIO_GRUPO: (g) => !!g }).filter(daRodada).every((x) => x.CIENTE_EM), 'os 8 alertas de impugnação e esclarecimento da LIC-2026-0114 com ciência');
});

test('lembrete do titular: o outro integrante recebe UM escalonamento agrupado e o titular UM lembrete', () => {
  const ops = CASO().map((l) => Object.assign(l, { RESPONSAVEL_ID: 'u_cha', RESPONSAVEL_NOME: 'CHARLES DIRETOR TESTE' }));
  const a = ambiente({ ops, agora: '2026-11-02T08:00:00-03:00' });
  const { e0: p0 } = preparar(a); a.rodada('2026-11-02T17:00:30-03:00');
  assert.equal(a.emails.length - p0, 2, 'só o titular: um e-mail por licitação');
  const z0 = a.zap().length, e0 = a.emails.length;
  a.rodada('2026-11-02T17:16:00-03:00');
  const zs = a.zap().slice(z0), es = a.emails.slice(e0);
  assert.equal(es.filter((m) => m.to === 'thiago@exemplo.test').length, 2, 'Thiago: um e-mail de escalonamento por licitação (antes: 5)');
  assert.ok(es.filter((m) => m.to === 'thiago@exemplo.test').every((m) => /^SGO\+ \| Sem ciência · Licitação LIC-2026-01(14|31): [23] prazos/.test(m.subject)));
  assert.equal(zs.filter((w) => w.corpo.to === '5562999990022').length, 2);
  assert.equal(zs.filter((w) => w.corpo.to === '5562999990021').length, 2, 'Charles: um lembrete por licitação, pelo WhatsApp');
  assert.equal(a.al({ PAPEL: 'ESCALONAMENTO' }).filter(daRodada).length, 5); assert.equal(a.al({ PAPEL: 'REENVIO' }).filter(daRodada).length, 5);
});

test('crítico continua imediato e fora do teto do dia; o grupo com crítico e normal sai como crítico; o teto conta o grupo como uma mensagem', () => {
  const a = ambiente({ ops: CASO(), agora: '2026-11-02T08:00:00-03:00' });
  preparar(a);
  assert.equal(a.api('s_cha', 'alertasCfgSalvar', { campos: { tetoDia: 4 }, motivo: 'teste do teto contando o grupo' }).ok, true);
  a.rodada('2026-11-02T17:00:30-03:00');
  // antes das 17:00 cada um recebeu 2 mensagens (aviso e lembrete das 09:00 e 10:00); às 17:00 são 5 alertas em 2 envios: 4 no dia,
  // dentro do teto de 4 (contando linha, seriam 7 e 3 alertas iriam para o resumo)
  assert.equal(a.al({ SITUACAO: 'NO_RESUMO' }).length, 0, 'com o teto contando linha, 3 de cada pessoa iriam para o resumo');
  const agora = new a.ctx.Date().toISOString();
  const linha = (id, nivel, op) => ({ ID: id, AVISO_ID: 'LA' + ('0000000000' + id).slice(-10).replace(/[^0-9a-f]/g, '0'), CHAVE: 'M|' + id, GRUPO: 'M|' + id, OPORTUNIDADE_ID: op, CODIGO: 'LIC-2026-' + op.slice(-4), TIPO: 'MUDANCA', PAPEL: 'TITULAR',
    ANTECEDENCIA: 'RETIFICACAO', ANTECEDENCIA_MIN: 0, NIVEL: nivel, USUARIO_ID: 'u_cha', USUARIO_NOME: 'CHARLES DIRETOR TESTE', TITULO: nivel === 'CRITICO' ? 'Licitação suspensa na fonte' : 'Prazo alterado na fonte', TEXTO: 'mudou na fonte',
    ALVO_ISO: '', LIBERAR_EM: agora, SITUACAO: 'PROGRAMADO', TENTATIVAS: 0, CRIADO_EM: agora });
  // teto do dia atingido (4 envios hoje, contando cada grupo como um): crítico + importante da mesma licitação saem juntos, na hora, como crítico
  a.tabelas.LIC_ALERTAS.push(linha('c1', 'CRITICO', 'op_0114'), linha('i1', 'IMPORTANTE', 'op_0114'));
  const e0 = a.emails.length;
  a.ctx.Lic_alertasEnviar_();
  assert.equal(a.al({ ID: 'c1' })[0].SITUACAO, 'ENVIADO'); assert.equal(a.al({ ID: 'i1' })[0].SITUACAO, 'ENVIADO', 'vai junto com o crítico');
  assert.equal(a.al({ ID: 'c1' })[0].ENVIO_GRUPO, a.al({ ID: 'i1' })[0].ENVIO_GRUPO);
  assert.equal(a.emails.length, e0 + 1);
  assert.match(a.emails[a.emails.length - 1].body, /ALERTAS DE LICITAÇÃO \(crítico\)/);
  assert.match(a.emails[a.emails.length - 1].subject, /LIC-2026-0114: 2 alertas/);
  // só normais e importantes com o teto atingido: resumo (como antes)
  a.tabelas.LIC_ALERTAS.push(linha('i2', 'IMPORTANTE', 'op_0131'), linha('i3', 'NORMAL', 'op_0131'));
  a.ctx.Lic_alertasEnviar_();
  assert.equal(a.al({ ID: 'i2' })[0].SITUACAO, 'NO_RESUMO'); assert.equal(a.al({ ID: 'i3' })[0].SITUACAO, 'NO_RESUMO');
  // o teto por alerta continua por alerta: 3 mensagens por pessoa no mesmo alerta
  const orig = a.al({ OPORTUNIDADE_ID: 'op_0114', USUARIO_ID: 'u_cha', PAPEL: 'TODOS' })[0];
  for (let i = 0; i < 4; i++) a.tabelas.LIC_ALERTAS.push(Object.assign({}, orig, { ID: 'x' + i, AVISO_ID: 'LA00000000f' + i, CHAVE: 'U|x|' + i, PAPEL: 'REENVIO', CANAIS: 'whatsapp', NIVEL: 'CRITICO', SITUACAO: 'PROGRAMADO', WA_EM: '', EMAIL_EM: '', ENVIADO_EM: '', CIENTE_EM: '', ENVIO_GRUPO: '', LIBERAR_EM: agora }));
  a.ctx.Lic_alertasEnviar_();
  assert.equal(a.al({ GRUPO: orig.GRUPO, USUARIO_ID: 'u_cha' }).filter((x) => x.WA_EM || x.EMAIL_EM).length, 3);
});

test('falha do WhatsApp do grupo no retorno da Meta: um e-mail de reserva só, com a lista; reenvio manual de um alerta não leva o código do envio', () => {
  const a = ambiente({ ops: CASO(), agora: '2026-11-02T08:00:00-03:00' });
  preparar(a);
  assert.equal(a.api('s_cha', 'alertasCfgSalvar', { campos: { pessoas: { u_cha: { email: false } } }, motivo: 'Teste: Charles só pelo WhatsApp' }).ok, true);
  a.rodada('2026-11-02T17:00:30-03:00');
  const g = a.al({ OPORTUNIDADE_ID: 'op_0131', USUARIO_ID: 'u_cha', PAPEL: 'TODOS', ENVIO_GRUPO: (x) => !!x });
  assert.ok(g.every((x) => !x.EMAIL_SITUACAO && x.WA_SITUACAO === 'ACEITO'));
  const e0 = a.emails.length;
  a.ctx.SGO_whatsappRetornoMeta_([{ tipo: 'STATUS', id: g[0].WA_ID, status: 'failed', quando: '', motivo: 'Message undeliverable (131026)' }]);
  assert.equal(a.emails.length, e0 + 1, 'um e-mail de reserva para os 3 (antes seriam 3)');
  assert.match(a.emails[a.emails.length - 1].subject, /LIC-2026-0131: 3 prazos/);
  assert.ok(a.al({ OPORTUNIDADE_ID: 'op_0131', USUARIO_ID: 'u_cha', ENVIO_GRUPO: (x) => !!x }).every((x) => x.WA_SITUACAO === 'FALHOU' && x.EMAIL_SITUACAO === 'ENVIADO' && /canal alternativo/.test(x.CANAL_ALTERNATIVO)));
  const r = a.api('s_thi', 'alertaReenviar', { id: g[0].ID });
  assert.equal(r.ok, true, r.message);
  const novo = a.al({ ORIGEM_ALERTA_ID: g[0].ID, PAPEL: 'REENVIO' })[0];
  assert.notEqual(novo.ENVIO_GRUPO, g[0].ENVIO_GRUPO);
});

test('coluna nova ENVIO_GRUPO entra por merge (cache das abas V7); ajuda, manual e base do assistente explicam o envio agrupado', () => {
  const cfg = ler('SGO_Licitacoes_Config.js');
  assert.match(cfg, /'ENVIO_GRUPO'\]/); assert.match(cfg, /LIC_ABAS_OK_V([7-9]|\d\d)/, 'V7 ou depois (V8 em 03/11/2026: fila da análise)');
  assert.match(ler('SGO_Ajuda_Licitacoes.js'), /Vários prazos numa mensagem só/);
  assert.match(ler('SGO_AssistenteManuais.js'), /Envio agrupado \(03\/11\/2026/);
});

test('revisão MÉDIO 1: o link de ciência vale 30 dias a partir do ENVIO (no grupo, o mais recente), não da criação da linha', () => {
  // licitação publicada 45 dias antes: as linhas nascem em 03/11 e o aviso de 7 dias sai em 11/12
  const a = ambiente({ ops: [OP('op_e001', { RESPONSAVEL_ID: 'u_cha', RESPONSAVEL_NOME: 'CHARLES', ENCERRAMENTO_PROPOSTAS: '2026-12-18T10:00:00', ENCERRAMENTO_ISO: '2026-12-18T13:00:00.000Z' })], agora: '2026-11-03T10:00:00-03:00' });
  a.rodada('2026-11-03T10:00:00-03:00');
  a.rodada('2026-12-11T10:00:30-03:00');
  const x = a.al({ SITUACAO: 'ENVIADO' })[0];
  assert.ok(x && x.CRIADO_EM < '2026-11-04', 'a linha nasceu 38 dias antes do envio');
  const tok = a.ctx.Lic_cienciaToken_(x.ENVIO_GRUPO || x.AVISO_ID, 'w');
  a.mudar('2026-12-11T10:01:00-03:00');
  const ver = a.ctx.Licitacoes_cienciaLink(tok, 'ver');
  assert.equal(ver.ok, true, 'antes: "Este link de ciência venceu" na hora do envio; ' + ver.message);
  a.mudar('2027-01-11T10:01:00-03:00');
  assert.match(a.ctx.Licitacoes_cienciaLink(tok, 'ver').message, /venceu \(vale 30 dias a partir do envio\)/);
  // grupo: conta o envio mais recente das linhas
  const b = ambiente({ ops: CASO(), agora: '2026-11-02T08:00:00-03:00' });
  preparar(b); b.rodada('2026-11-02T17:00:30-03:00');
  const g = b.al({ OPORTUNIDADE_ID: 'op_0131', USUARIO_ID: 'u_cha', ENVIO_GRUPO: (v) => !!v });
  g.forEach((y) => { y.CRIADO_EM = '2026-09-01T10:00:00.000Z'; });
  assert.equal(b.ctx.Licitacoes_cienciaLink(b.ctx.Lic_cienciaToken_(g[0].ENVIO_GRUPO, 'e'), 'ver').ok, true);
});

test('revisão MENOR 2: o sufixo "(e mais N itens ...)" nunca some da ação no WhatsApp; com 4 ou mais tipos o resumo fica curto', () => {
  const a = ambiente({ ops: CASO(), agora: '2026-11-02T08:00:00-03:00' });
  preparar(a);
  a.ctx.Lic_acaoAlerta_ = () => 'x'.repeat(400);
  a.rodada('2026-11-02T17:00:30-03:00');
  const z = a.zap().find((w) => JSON.stringify(w.corpo).includes('fim das propostas'));
  const p8 = z.corpo.template.components[0].parameters[7].text;
  assert.ok(p8.length <= 200, 'até 200 caracteres: ' + p8.length); assert.match(p8, /\(e mais 2 itens no e-mail e no SGO\+\)$/);
  const tipos = ['PRAZO_IMPUGNACAO', 'PRAZO_ESCLARECIMENTO', 'LIMITE_PROPOSTA', 'SESSAO_PUBLICA', 'CONTRATO_FIM'];
  const linhas = tipos.map((t, i) => ({ ID: 'r' + i, TIPO: 'PRAZO', EVENTO_TIPO: t, EVENTO_ID: '', NIVEL: 'NORMAL', ALVO_ISO: '2026-11-1' + i + 'T12:00:00.000Z' }));
  assert.equal(a.ctx.Lic_resumoGrupo_(linhas, true, {}).texto, '5 prazos: impugnação, esclarecimento, fim das propostas e outros 2');
  assert.equal(a.ctx.Lic_resumoGrupo_(linhas.slice(0, 3), true, {}).texto, '3 prazos: impugnação, esclarecimento e fim das propostas');
});

test('revisão MENOR 3: linha cancelada durante o envio agrupado não volta a "Enviado"; as outras do grupo seguem', () => {
  const a = ambiente({ ops: CASO(), agora: '2026-11-02T08:00:00-03:00' });
  preparar(a);
  const orig = a.ctx.Lic_alertaEmail_;
  let alvo = null;
  a.ctx.Lic_alertaEmail_ = function (x, ct) {
    if (!alvo && ct.refId) { alvo = a.al({ ENVIO_GRUPO: ct.refId, EVENTO_TIPO: 'LIMITE_PROPOSTA' })[0] || a.al({ ENVIO_GRUPO: ct.refId })[0]; a.ctx.SGO_DATA.update('LIC_ALERTAS', alvo.ID, { SITUACAO: 'CANCELADO', CANCELADO_MOTIVO: 'O prazo mudou durante o envio.' }); }
    return orig.apply(this, arguments);
  };
  a.rodada('2026-11-02T17:00:30-03:00');
  assert.ok(alvo, 'houve envio agrupado');
  const y = a.al({ ID: alvo.ID })[0];
  assert.equal(y.SITUACAO, 'CANCELADO', 'antes: voltava a ENVIADO'); assert.equal(y.CANCELADO_MOTIVO, 'O prazo mudou durante o envio.'); assert.ok(!y.ESCALONAR_EM);
  assert.ok(a.al({ ENVIO_GRUPO: alvo.ENVIO_GRUPO }).filter((x) => x.ID !== alvo.ID).every((x) => x.SITUACAO === 'ENVIADO'));
});
