// SGO+ Licitações, revisão independente da etapa 3 (02/11/2026): cada defeito achado vira um teste que falhava com o código
// de e428b20 e passa agora (os cenários são os scripts de reprodução da revisão: loop, backlog, backlogB, desc e retif2).
// Código real do notificador, da matriz, do piloto e dos avisos da gestão; e-mail e WhatsApp simulados (nada sai).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, OP: OP_BASE, IMBEL, USUARIOS } = require('./_licitacoes_alertas_ambiente.cjs');
// 03/11/2026: a sequência completa dos alertas (antecedências, lembrete, escalonamento, ciência) vale para a oportunidade em análise;
// a candidata do Radar vai no resumo diário (tests/licitacoes_alertas_radar.test.cjs). Aqui as oportunidades estão em análise.
const OP = (id, extra) => OP_BASE(id, Object.assign({ SITUACAO: 'ANALISE' }, extra || {}));

test('GRAVE 1, laço sem fim: Meta devolvendo "failed" e sem e-mail de reserva não gera escalonamento de escalonamento; tetos por alerta e por dia', () => {
  const us = USUARIOS.map((u) => Object.assign({}, u)); us[0].EMAIL = '';
  const a = ambiente({ ops: [IMBEL()], tabelas: { CAD_USUARIOS: us } });
  a.rodada();
  let t = Date.parse('2026-11-06T08:00:30-03:00');
  const falhar = () => a.al({ USUARIO_ID: 'u_cha' }).filter((x) => x.WA_ID && x.WA_SITUACAO === 'ACEITO').forEach((x) => a.ctx.SGO_whatsappRetornoMeta_([{ tipo: 'STATUS', id: x.WA_ID, status: 'failed', quando: '', motivo: 'Message undeliverable (131026)' }]));
  for (let i = 0; i < 24; i++) { a.rodada(new Date(t).toISOString()); falhar(); t += 5 * 60000; }   // 2 horas
  const paraThi = a.zap().filter((w) => w.corpo.to === '5562999990022').length, paraCha = a.zap().filter((w) => w.corpo.to === '5562999990021').length;
  assert.ok(paraThi <= 1, 'Thiago recebe no máximo o escalonamento (antes: 23 em 2 h); recebeu ' + paraThi);
  assert.ok(paraCha <= 3, 'Charles: o original e o reenvio (antes: 24 em 2 h); recebeu ' + paraCha);
  assert.ok(a.tabelas.LIC_ALERTAS.length <= 12, 'antes eram 54 linhas; agora ' + a.tabelas.LIC_ALERTAS.length);
  assert.equal(a.al({ PAPEL: 'ESCALONAMENTO' }).filter((x) => String(x.ORIGEM_ALERTA_ID) && a.al({ ID: x.ORIGEM_ALERTA_ID })[0].PAPEL !== 'TITULAR').length, 0, 'só o alerta do titular escalona');
  assert.ok(a.al({ PAPEL: (p) => p === 'ESCALONAMENTO' || p === 'REENVIO' }).every((x) => !x.ESCALONAR_EM), 'escalonamento e reenvio nunca ficam com escalonamento pendente');
  // teto por alerta e pessoa: forçar mais reenvios do mesmo alerta não passa de 3 mensagens
  const b = ambiente({ ops: [IMBEL()] });
  b.rodada(); b.rodada('2026-11-06T08:00:30-03:00');
  const orig = b.al({ ANTECEDENCIA: '7 dias', PAPEL: 'TITULAR' })[0];
  for (let i = 0; i < 4; i++) { b.tabelas.LIC_ALERTAS.push(Object.assign({}, orig, { ID: 'extra' + i, AVISO_ID: 'LA00000000a' + i, CHAVE: 'U|teste|' + i, PAPEL: 'REENVIO', CANAIS: 'whatsapp', SITUACAO: 'PROGRAMADO', WA_EM: '', EMAIL_EM: '', ENVIADO_EM: '', LIBERAR_EM: '2026-11-06T11:01:00.000Z' })); }
  b.rodada('2026-11-06T08:02:00-03:00');
  const doGrupo = b.al({ GRUPO: orig.GRUPO, USUARIO_ID: 'u_cha' });
  assert.equal(doGrupo.filter((x) => x.WA_EM || x.EMAIL_EM).length, 3, 'no máximo 3 mensagens por pessoa no mesmo alerta');
  assert.ok(doGrupo.some((x) => x.SITUACAO === 'PULADO' && /Teto de 3 mensagens/.test(x.CANCELADO_MOTIVO)));
  assert.ok(b.hist('ALERTA_TETO').length >= 1, 'o teto que segurou fica no histórico');
  // teto do dia por pessoa (regra ajustável)
  assert.equal(b.api('s_cha', 'alertasCfgSalvar', { campos: { tetoDia: 1 }, motivo: 'teste do teto diário' }).ok, true);
  b.tabelas.LIC_ALERTAS.push(Object.assign({}, orig, { ID: 'dia1', AVISO_ID: 'LA00000000b1', GRUPO: 'outro', CHAVE: 'U|dia|1', PAPEL: 'REENVIO', SITUACAO: 'PROGRAMADO', WA_EM: '', EMAIL_EM: '', ENVIADO_EM: '', LIBERAR_EM: '2026-11-06T11:03:00.000Z' }));
  b.rodada('2026-11-06T08:04:00-03:00');
  assert.match(b.al({ ID: 'dia1' })[0].CANCELADO_MOTIVO, /Teto de 1 mensagens de licitação para esta pessoa hoje/);
});

test('MÉDIO 2, implantação: com a agenda em mais de uma rodada (85 oportunidades) nada vencido sai; salvar as regras antes da 1ª rodada não dispara atrasados', () => {
  const ops = []; for (let i = 0; i < 85; i++) ops.push(OP('op_' + String(1000 + i), { ENCERRAMENTO_PROPOSTAS: '2026-10-28T10:00:00', ENCERRAMENTO_ISO: '2026-10-28T13:00:00.000Z' }));
  const a = ambiente({ ops });
  const r1 = a.rodada('2026-10-26T10:00:00-03:00');
  assert.equal(r1.agenda.restam, 5); assert.equal(a.props.LIC_ALERTAS_IMPLANTADO_EM, undefined, 'agenda incompleta: ainda não é a implantação');
  const r2 = a.rodada('2026-10-26T10:05:00-03:00');
  assert.equal(r2.agenda.restam, 0); assert.equal(a.props.LIC_ALERTAS_IMPLANTADO_EM, '2026-10-26T13:05:00.000Z');
  assert.equal(a.zap().length, 0, 'antes: 10 WhatsApp das antecedências já vencidas');
  assert.equal(a.emails.length, 0);
  assert.ok(a.al({ SITUACAO: 'PROGRAMADO' }).length > 0, 'as antecedências futuras continuam programadas');
  // regras salvas antes da primeira rodada
  const b = ambiente({ ops: [0, 1, 2].map((i) => OP('op_' + String(1000 + i), { ENCERRAMENTO_PROPOSTAS: '2026-10-28T10:00:00', ENCERRAMENTO_ISO: '2026-10-28T13:00:00.000Z' })), agora: '2026-10-26T09:00:00-03:00' });
  assert.equal(b.api('s_cha', 'alertasCfgSalvar', { campos: { escalonarMin: { NORMAL: 50 } }, motivo: 'ajuste inicial' }).ok, true);
  assert.equal(b.props.LIC_ALERTAS_IMPLANTADO_EM, undefined, 'salvar as regras não marca a implantação');
  const f = b.api('s_cha', 'ficha', { id: 'op_1000' }); assert.equal(f.ok, true, f.message);
  b.rodada('2026-10-26T09:05:00-03:00');
  assert.equal(b.zap().length, 0, 'antes: 6 WhatsApp atrasados');
  // oportunidade que chega da fonte depois da implantação: o aviso mais recente já vencido sai (regra da etapa 3)
  b.tabelas.LIC_OPORTUNIDADES.push(OP('op_nova', { PRIMEIRA_COLETA_EM: '2026-10-27T12:00:00.000Z', ENCERRAMENTO_PROPOSTAS: '2026-10-29T10:00:00', ENCERRAMENTO_ISO: '2026-10-29T13:00:00.000Z' }));
  b.rodada('2026-10-27T09:05:00-03:00');
  assert.ok(b.al({ OPORTUNIDADE_ID: 'op_nova', SITUACAO: 'ENVIADO' }).length >= 1);
  // candidata que já existia antes da implantação, com a agenda refeita depois (retificação), não manda aviso vencido
  assert.equal(b.al({ OPORTUNIDADE_ID: 'op_1000', SITUACAO: 'ENVIADO' }).length, 0);
  Object.assign(b.tabelas.LIC_OPORTUNIDADES.find((l) => l.ID === 'op_1001'), { ENCERRAMENTO_PROPOSTAS: '2026-10-28T11:00:00', ENCERRAMENTO_ISO: '2026-10-28T14:00:00.000Z', VERSAO_FONTE: 2, RETIFICADA_EM: '2026-10-27T12:00:00Z' });
  b.rodada('2026-10-27T09:10:00-03:00');
  assert.equal(b.al({ OPORTUNIDADE_ID: 'op_1001', TIPO: 'PRAZO', SITUACAO: 'ENVIADO' }).length, 0);
});

test('conferência 1: teto do dia não corta crítico; normal e importante barrados vão num resumo por e-mail e ficam pendentes de ciência', () => {
  const ops = []; for (let i = 0; i < 32; i++) ops.push(OP('op_' + (2000 + i), { RESPONSAVEL_ID: 'u_cha', RESPONSAVEL_NOME: 'CHARLES', ENCERRAMENTO_PROPOSTAS: '2026-11-04T11:05:00', ENCERRAMENTO_ISO: '2026-11-04T14:05:00.000Z', PRIMEIRA_COLETA_EM: '2026-10-20T10:00:00.000Z' }));
  const b = ambiente({ ops, agora: '2026-11-03T10:00:00-03:00' });
  b.rodada('2026-11-03T10:00:00-03:00');
  const r = b.rodada('2026-11-04T10:05:30-03:00');
  assert.equal(r.enviar.enviados, 32, 'os 32 críticos de 1 h saem (antes 2 ficavam "Não enviado" pelo teto de 30)');
  assert.equal(b.al({ NIVEL: 'CRITICO', SITUACAO: 'PULADO', CANCELADO_MOTIVO: (m) => /Teto/.test(m || '') }).length, 0);
  // normal/importante além do teto: resumo único por e-mail, pendente na faixa e na Central
  const c = ambiente({ ops: [IMBEL()] });
  c.rodada();
  assert.equal(c.api('s_cha', 'alertasCfgSalvar', { campos: { tetoDia: 1 }, motivo: 'teste do teto diário' }).ok, true);
  c.rodada('2026-11-06T08:00:30-03:00');   // 7 dias (normal): 1ª mensagem do dia
  const base = c.al({ ANTECEDENCIA: '7 dias' })[0];
  for (let i = 0; i < 2; i++) c.tabelas.LIC_ALERTAS.push(Object.assign({}, base, { ID: 'imp' + i, AVISO_ID: 'LA00000000d' + i, GRUPO: 'g' + i, CHAVE: 'M|imp|' + i, TIPO: 'MUDANCA', EVENTO_ID: '', ALVO_ISO: '', TITULO: 'Prazo alterado na fonte', NIVEL: 'IMPORTANTE', PAPEL: 'TITULAR', SITUACAO: 'PROGRAMADO', WA_EM: '', EMAIL_EM: '', ENVIADO_EM: '', WA_ID: '', CIENTE_EM: '', LIBERAR_EM: '2026-11-06T11:01:00.000Z' }));
  const e0 = c.emails.length, z0 = c.zap().length;
  c.rodada('2026-11-06T08:02:00-03:00');
  const barr = c.al({ SITUACAO: 'NO_RESUMO' });
  assert.equal(barr.length, 2); assert.ok(barr.every((x) => x.EMAIL_SITUACAO === 'ENVIADO' && x.INTERNO_EM));
  assert.equal(c.emails.length, e0 + 1, 'um e-mail só com os dois'); assert.equal(c.zap().length, z0, 'sem WhatsApp');
  assert.match(c.emails[c.emails.length - 1].subject, /2 alertas no resumo \(teto do dia atingido\)/);
  assert.ok(c.ctx.Lic_alertasSemCiencia_(null).some((x) => x.SITUACAO === 'NO_RESUMO'), 'aparece na faixa "sem ciência"');
  assert.ok(c.api('s_cha', 'alertas', { filtro: 'semCiencia' }).lista.some((x) => x.situacao === 'NO_RESUMO' && x.podeCiente));
  assert.equal(c.api('s_cha', 'alertaCiente', { id: barr[0].ID }).ok, true);
});

test('conferência 2 a 5: erro de uma oportunidade não derruba a agenda; candidata depois da implantação recebe o aviso; segredo no início da rodada; ENVIANDO em curso não é reenviado', () => {
  const a = ambiente({ ops: [OP('op_ok01'), OP('op_ruim'), OP('op_desc', { SITUACAO: 'DESCARTADA', TRIAGEM: 'DESCARTADA', DESCARTE_ORIGEM: 'REGRA', PRIMEIRA_COLETA_EM: '2026-10-01T10:00:00.000Z', ENCERRAMENTO_PROPOSTAS: '2026-10-28T10:00:00', ENCERRAMENTO_ISO: '2026-10-28T13:00:00.000Z' })] });
  const orig = a.ctx.Lic_eventosSincronizar_;
  a.ctx.Lic_eventosSincronizar_ = function (l) { if (l.ID === 'op_ruim') throw new Error('linha com data corrompida'); return orig.apply(this, arguments); };
  const r = a.rodada();
  assert.equal(r.agenda.atualizadas, 2); assert.equal(r.agenda.erros.length, 1); assert.equal(r.agenda.erros[0].codigo, 'LIC-2026-ruim');
  assert.ok(a.ev('op_ok01').length > 0, 'as outras seguiram');
  assert.ok(a.props.LIC_ALERTAS_IMPLANTADO_EM, 'a implantação é marcada mesmo com o erro isolado');
  assert.match(a.api('s_cha', 'alertas', {}).rotina.texto, /Agenda com erro em 1 oportunidade\(s\): LIC-2026-ruim \(linha com data corrompida\)/);
  assert.ok(a.props.LIC_CIENCIA_SEGREDO, 'o segredo dos links nasce no início da rodada');
  // coletada antes da implantação (descartada pela regra) e que passou a poder ter alerta depois: recebe o aviso vencido mais recente
  // (03/11/2026: candidata do Radar vai no resumo diário; a sequência completa vale em análise)
  Object.assign(a.tabelas.LIC_OPORTUNIDADES.find((l) => l.ID === 'op_desc'), { SITUACAO: 'ANALISE', TRIAGEM: 'CANDIDATA', DESCARTE_ORIGEM: '' });
  a.rodada('2026-10-26T10:10:00-03:00');
  assert.ok(a.al({ OPORTUNIDADE_ID: 'op_desc', SITUACAO: 'ENVIADO' }).length >= 1);
  assert.ok(a.tabelas.LIC_OPORTUNIDADES.find((l) => l.ID === 'op_desc').ALERTAVEL_DESDE > a.props.LIC_ALERTAS_IMPLANTADO_EM);
  // implantação aguardando aparece na situação da rotina
  const b = ambiente({ ops: [OP('op_x001')] });
  b.ctx.Lic_agendaAtualizar_ = () => { throw new Error('base fora do ar'); };
  b.rodada();
  assert.equal(b.props.LIC_ALERTAS_IMPLANTADO_EM, undefined);
  assert.match(b.api('s_cha', 'alertas', {}).rotina.texto, /Implantação dos alertas aguardando a agenda inteira \(a montagem da agenda falhou: base fora do ar\)/);
  // ENVIANDO há mais de 10 min com outro envio em curso (lote longo): não é pego como abandonado
  const c = ambiente({ ops: [IMBEL()] });
  c.rodada();
  const x = c.al({ SITUACAO: 'PROGRAMADO' })[0];
  Object.assign(x, { SITUACAO: 'ENVIANDO', ENVIANDO_EM: '2026-10-26T12:30:00.000Z', TENTATIVAS: 1 });
  c.props.LIC_ENVIO_EM_CURSO = '2026-10-26T12:59:00.000Z';
  c.ctx.Lic_alertasEnviar_();
  assert.equal(c.al({ ID: x.ID })[0].SITUACAO, 'ENVIANDO', 'envio em curso: a linha é dele');
  delete c.props.LIC_ENVIO_EM_CURSO;
  c.ctx.Lic_alertasEnviar_();
  assert.equal(c.al({ ID: x.ID })[0].SITUACAO, 'ENVIADO', 'sem envio em curso, a abandonada sai');
  assert.ok(!c.props.LIC_ENVIO_EM_CURSO, 'a marca do envio em curso é limpa no fim');
});

test('MÉDIO 3, descarte: escalonamento e reenvio pendentes param; envio e escalonamento reconferem a oportunidade e o prazo', () => {
  const a = ambiente({ ops: [IMBEL()] });
  a.rodada(); a.rodada('2026-11-06T08:00:30-03:00');
  const n0 = a.zap().length;
  assert.equal(a.api('s_cha', 'descartar', { id: 'op_imbe', motivo: 'Não vamos participar deste pregão' }).ok, true);
  a.rodada('2026-11-06T09:05:00-03:00'); a.rodada('2026-11-06T09:10:00-03:00');
  assert.equal(a.zap().length, n0, 'antes: mais 2 WhatsApp (escalonamento e reenvio) depois do descarte');
  const t = a.al({ PAPEL: 'TITULAR', SITUACAO: 'ENVIADO' })[0];
  assert.equal(t.ESCALONAR_EM, ''); assert.match(t.CANCELADO_MOTIVO, /Escalonamento cancelado: (Sem alerta: o|O)portunidade descartada pela Diretoria/);
  // reenvio já programado quando a oportunidade foi descartada: o envio reconfere e cancela
  const b = ambiente({ ops: [IMBEL()] });
  b.rodada(); b.rodada('2026-11-06T08:00:30-03:00');
  const o = b.al({ ANTECEDENCIA: '7 dias' })[0];
  b.tabelas.LIC_ALERTAS.push(Object.assign({}, o, { ID: 'r1', AVISO_ID: 'LA00000000c1', CHAVE: 'R|x', PAPEL: 'REENVIO', SITUACAO: 'PROGRAMADO', WA_EM: '', EMAIL_EM: '', LIBERAR_EM: '2026-11-06T11:01:00.000Z' }));
  b.tabelas.LIC_OPORTUNIDADES[0].SITUACAO = 'DESCARTADA'; b.tabelas.LIC_OPORTUNIDADES[0].DESCARTE_ORIGEM = 'PESSOA';
  b.ctx.Lic_alertasEnviar_();
  b.mudar('2026-11-06T08:02:00-03:00'); b.ctx.Lic_alertasEnviar_();
  assert.equal(b.al({ ID: 'r1' })[0].SITUACAO, 'CANCELADO');
});

test('MÉDIO 4, retificação: herda os avisos já enviados, um alerta de mudança só, nada para prazo pendente nem para recálculo sem mudança de data', () => {
  const a = ambiente({ ops: [IMBEL()] });
  a.rodada(); a.rodada('2026-11-06T08:00:30-03:00');
  a.ctx.Lic_alertaCiente_(a.al({ SITUACAO: 'ENVIADO' })[0].ID, { id: 'u_cha', nome: 'CHARLES' }, 'SGO_TELA');
  const n0 = a.zap().length;
  Object.assign(a.tabelas.LIC_OPORTUNIDADES[0], { ENCERRAMENTO_PROPOSTAS: '2026-11-13T07:00:00', ENCERRAMENTO_ISO: '2026-11-13T10:00:00.000Z', VERSAO_FONTE: 2, VERSAO_HASH: 'h2', RETIFICADA_EM: '2026-11-06T12:00:00Z' });
  a.rodada('2026-11-06T09:00:00-03:00');
  const novos = a.zap().slice(n0);
  assert.equal(novos.length, 1, 'antes: 3 (duas mudanças e o de 7 dias de novo)');
  const mud = a.al({ TIPO: 'MUDANCA' });
  assert.equal(mud.length, 1); assert.equal(mud[0].EVENTO_TIPO, 'LIMITE_PROPOSTA', 'a sessão pendente não gera alerta de mudança');
  const novoLim = a.ev('op_imbe', 'LIMITE_PROPOSTA')[0];
  assert.equal(novoLim.VERSAO, 2);
  assert.equal(a.al({ EVENTO_ID: novoLim.ID, ANTECEDENCIA: '7 dias' }).length, 0, 'o aviso de 7 dias da versão 1 já saiu (com ciência): não repete');
  assert.ok(a.al({ EVENTO_ID: novoLim.ID, ANTECEDENCIA: '3 dias', SITUACAO: 'PROGRAMADO' }).length === 1, 'os que faltam seguem a data nova');
  // feriado novo da empresa: recálculo em massa; só a impugnação muda de data -> um alerta consolidado, nunca um por prazo
  const ops = [OP('op_a001'), OP('op_a002', { ENCERRAMENTO_PROPOSTAS: '2026-11-05T08:30:00', ENCERRAMENTO_ISO: '2026-11-05T11:30:00.000Z' })];
  const b = ambiente({ ops });
  b.rodada();
  b.props.SGO_EXPEDIENTE = JSON.stringify({ ini: '08:00', fim: '17:30', dias: [1, 2, 3, 4, 5], feriados: '29/10/2026' });
  b.rodada('2026-10-26T11:00:00-03:00');
  const porOp = {}; b.al({ TIPO: 'MUDANCA' }).forEach((x) => { porOp[x.OPORTUNIDADE_ID + x.USUARIO_ID] = (porOp[x.OPORTUNIDADE_ID + x.USUARIO_ID] || 0) + 1; });
  assert.ok(Object.values(porOp).every((n) => n === 1), 'no máximo um alerta de mudança por oportunidade e pessoa');
  // nova versão das regras de cálculo que não muda nenhuma data: nenhum alerta de mudança
  const c = ambiente({ ops: [OP('op_c001')] });
  c.rodada();
  c.tabelas.LIC_OPORTUNIDADES[0].EVENTOS_BASE_HASH = 'regra-antiga';
  c.rodada('2026-10-26T11:00:00-03:00');
  assert.equal(c.al({ TIPO: 'MUDANCA' }).length, 0);
});

test('MENOR 5 e 6: sem trava não envia; ENVIANDO abandonado que já saiu não sai de novo; e-mail de reserva não sai com ciência ou prazo vencido', () => {
  const a = ambiente({ ops: [IMBEL()] });
  a.rodada();
  const x = a.al({ SITUACAO: 'PROGRAMADO' })[0];
  x.LIBERAR_EM = '2026-10-26T13:00:00.000Z';
  const lockOrig = a.ctx.LockService.getScriptLock;
  a.ctx.LockService.getScriptLock = () => { throw new Error('serviço de trava fora'); };
  assert.match(a.ctx.Lic_alertasEnviar_().ocupado, /trava indisponível/);
  a.ctx.LockService.getScriptLock = lockOrig;
  assert.equal(a.zap().length, 0, 'sem a trava nada saiu');
  // a execução cai depois de enviar: a linha fica ENVIANDO, mas o registro do notificador mostra que saiu
  a.ctx.Lic_alertasEnviar_();
  const y = a.al({ ID: x.ID })[0];
  assert.equal(y.SITUACAO, 'ENVIADO');
  const n = a.zap().length;
  Object.assign(y, { SITUACAO: 'ENVIANDO', ENVIANDO_EM: '2026-10-26T12:00:00.000Z' });
  a.mudar('2026-10-26T10:30:00-03:00');
  a.ctx.Lic_alertasEnviar_();
  assert.equal(a.zap().length, n, 'não reenviou');
  assert.equal(a.al({ ID: x.ID })[0].SITUACAO, 'ENVIADO');
  // "Reenviar" duas vezes seguidas: a segunda é recusada com o motivo
  assert.equal(a.api('s_cha', 'alertaReenviar', { id: x.ID }).ok, true);
  const r2 = a.api('s_cha', 'alertaReenviar', { id: x.ID });
  assert.equal(r2.ok, false); assert.match(r2.message, /já foi reenviado.*Espere 10 minutos/);
  // failed da Meta com a ciência registrada: o e-mail de reserva não sai
  const b = ambiente({ ops: [IMBEL()] });
  b.rodada();
  b.api('s_cha', 'alertasCfgSalvar', { campos: { pessoas: { u_cha: { email: false } } }, motivo: 'Charles só pelo WhatsApp' });
  b.rodada('2026-11-06T08:00:30-03:00');
  const z = b.al({ ANTECEDENCIA: '7 dias', PAPEL: 'TITULAR' })[0];
  b.ctx.Lic_alertaCiente_(z.ID, { id: 'u_cha', nome: 'CHARLES' }, 'SGO_TELA');
  const e0 = b.emails.length;
  b.ctx.SGO_whatsappRetornoMeta_([{ tipo: 'STATUS', id: z.WA_ID, status: 'failed', quando: '', motivo: 'x' }]);
  assert.equal(b.emails.length, e0);
  assert.ok(b.hist('ALERTA_WHATSAPP_FALHOU').some((h) => /ciência já estava registrada: o e-mail de reserva não foi enviado/.test(h.TEXTO)));
});

test('MENOR 8 e 10: um segredo só para os links; destinatários padrão = Diretoria/Administrador da área Diretoria; lista explícita manda', () => {
  const us = USUARIOS.map((u) => Object.assign({}, u)).concat([{ ID: 'u_tec', USUARIO: 'sistema', NOME: 'CONTA TECNICA', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: 'ti@exemplo.test', CELULAR: '62999990099', AREA: '' }]);
  const a = ambiente({ ops: [OP('op_casc')], tabelas: { CAD_USUARIOS: us } });
  const s1 = a.ctx.Lic_cienciaSegredo_(), s2 = a.ctx.Lic_cienciaSegredo_();
  assert.equal(s1, s2); assert.equal(a.props.LIC_CIENCIA_SEGREDO, s1);
  assert.deepEqual(JSON.parse(JSON.stringify(a.ctx.Lic_integrantes_().map((u) => u.id))), ['u_cha', 'u_thi'], 'a conta técnica de administrador (sem a área Diretoria) não recebe');
  a.rodada();
  assert.ok(!a.al({}).some((x) => x.USUARIO_ID === 'u_tec'));
  assert.ok(a.api('s_cha', 'alertasCfg').cfg.pessoasLista.some((p) => p.id === 'u_tec' && !p.integrante && !p.padrao));
  // lista explícita (com versão e motivo): só ela recebe
  const r = a.api('s_cha', 'alertasCfgSalvar', { campos: { destinatarios: ['u_thi'] }, motivo: 'Só o Thiago nesta semana' });
  assert.equal(r.ok, true, r.message);
  assert.deepEqual(JSON.parse(JSON.stringify(a.ctx.Lic_integrantes_().map((u) => u.id))), ['u_thi']);
  assert.ok(a.hist('REGRAS_DOS_ALERTAS').some((h) => /Lista de destinatários/.test(h.TEXTO) && /THIAGO/.test(h.PARA)));
  assert.match(a.api('s_cha', 'alertasCfgSalvar', { campos: { destinatarios: ['u_gil'] }, motivo: 'incluir o gestor' }).message, /Só a Diretoria de Licitações.*lista de destinatários/);
  // conta técnica pode entrar na lista explícita (é Administrador), se a Diretoria quiser
  assert.equal(a.api('s_cha', 'alertasCfgSalvar', { campos: { destinatarios: ['u_thi', 'u_tec'] }, motivo: 'teste da lista' }).ok, true);
  assert.equal(a.ctx.Lic_integrantes_().length, 2);
});

test('MENOR 11: a regra de guarda remove também os prazos e os alertas da oportunidade que sai, com o histórico', () => {
  const a = ambiente({ ops: [OP('op_ve01', { SITUACAO: 'RADAR', PUBLICACAO_EM: '2023-01-10T10:00:00.000Z', PRIMEIRA_COLETA_EM: '2023-01-10T10:00:00.000Z' }), OP('op_fica', { RESPONSAVEL_ID: 'u_cha' })] });
  // a guarda só remove candidata do Radar: com os alertas individuais das candidatas ligados (regra de 03/11/2026), ela tem alertas
  assert.equal(a.api('s_thi', 'alertasCfgSalvar', { campos: { radar: { individuais: true } }, motivo: 'teste da guarda com alertas de candidata' }).ok, true);
  a.rodada();
  assert.ok(a.ev('op_ve01').length > 0 && a.al({ OPORTUNIDADE_ID: 'op_ve01' }).length > 0);
  a.ctx.SGO_DATA.remove = (t, id) => { const i = (a.tabelas[t] || []).findIndex((x) => String(x.ID) === String(id)); if (i < 0) return false; a.tabelas[t].splice(i, 1); return true; };
  const fs = require('node:fs'), path = require('node:path');
  require('node:vm').runInContext(fs.readFileSync(path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db/SGO_Licitacoes_Guarda.js'), 'utf8'), a.ctx);
  const r = a.ctx.Lic_guarda_({ agora: '2026-10-26T13:00:00.000Z' });
  assert.ok(r.saiu.length >= 1, JSON.stringify(r).slice(0, 300));
  assert.equal(a.ev('op_ve01', null, true).length, 0, 'prazos saíram junto');
  assert.equal(a.al({ OPORTUNIDADE_ID: 'op_ve01' }).length, 0, 'alertas saíram junto');
  assert.ok(a.ev('op_fica').length > 0, 'a oportunidade que fica não perde nada');
  assert.ok(a.hist('SAIU_PELA_GUARDA_AGENDA').some((h) => /prazo\(s\) de LIC_EVENTOS/.test(h.TEXTO)));
});
