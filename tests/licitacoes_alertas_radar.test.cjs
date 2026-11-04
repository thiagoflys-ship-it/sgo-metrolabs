// SGO+ Licitações, candidatas do Radar no resumo diário (03/11/2026, decisão do dono). Caso real: a LIC-2026-0232 (Fundação Estatal
// de Saúde do Pantanal, objeto fora do ramo) estava no Radar como candidata e gerou, para cada um dos 2 diretores, o aviso de 1 dia,
// o de 4 h com lembrete e o de 1 h com lembrete (5 WhatsApp e e-mails por pessoa). Agora a candidata do Radar não gera alerta
// individual de prazo: vai num e-mail de resumo por dia útil (08:00), sem WhatsApp, sem lembrete e sem escalonamento. Em análise,
// a sequência completa continua. "Não vou participar" abre a ficha já no descarte; descartar cancela os alertas pendentes na hora.
// Código real do notificador, da matriz e do piloto; e-mail e WhatsApp simulados (nada sai). Datas pelo relógio do ambiente.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, OP, IMBEL, ler } = require('./_licitacoes_alertas_ambiente.cjs');
const fs = require('node:fs');
const path = require('node:path');

const C0232 = (extra) => OP('op_0232', Object.assign({ CODIGO: 'LIC-2026-0232', ORGAO_NOME: 'FUNDACAO ESTATAL DE SAUDE DO PANTANAL', UF: 'MS', MUNICIPIO: 'Campo Grande',
  OBJETO: 'Aquisição de material de escritório e de expediente para as unidades da fundação', NUMERO_CONTROLE_PNCP: '11111111000111-1-000232/2026',
  ENCERRAMENTO_PROPOSTAS: '2026-11-04T09:00:00', ENCERRAMENTO_ISO: '2026-11-04T12:00:00.000Z' }, extra || {}));
// candidata do Radar com o fim das propostas daqui a 10 dias: fora da janela de 72 h do resumo
const LONGE = () => OP('op_0300', { CODIGO: 'LIC-2026-0300', ORGAO_NOME: 'PREFEITURA MUNICIPAL DE TESTE', UF: 'GO', MUNICIPIO: 'Anápolis', NUMERO_CONTROLE_PNCP: '22222222000122-1-000300/2026',
  ENCERRAMENTO_PROPOSTAS: '2026-11-13T09:00:00', ENCERRAMENTO_ISO: '2026-11-13T12:00:00.000Z' });
const resumos = (a, de) => a.emails.slice(de || 0).filter((m) => /candidatas? do Radar com prazo/.test(m.subject));
const individuais = (a, codigo, de) => a.emails.slice(de || 0).filter((m) => m.subject.includes('Licitação ' + codigo));
const salvar = (a, campos, motivo) => a.api('s_thi', 'alertasCfgSalvar', { campos: campos, motivo: motivo || 'teste das candidatas do Radar' });

test('caso LIC-2026-0232: candidata do Radar não gera aviso individual (nem 1 dia, nem 4 h, nem 1 h, nem lembrete); vai no resumo das 08:00, uma vez por pessoa', () => {
  const a = ambiente({ ops: [C0232(), LONGE()], agora: '2026-11-02T20:00:00-03:00' });
  a.rodada();
  a.rodada('2026-11-03T07:00:00-03:00');
  assert.equal(resumos(a).length, 0, 'antes das 08:00 o resumo não sai');
  const r = a.rodada('2026-11-03T08:00:30-03:00');
  assert.equal(r.resumoRadar.enviados, 2, JSON.stringify(r.resumoRadar)); assert.equal(r.resumoRadar.candidatas, 1);
  const rs = resumos(a);
  assert.deepEqual(rs.map((m) => m.to).sort(), ['charles@exemplo.test', 'thiago@exemplo.test'], 'para os destinatários dos alertas');
  const m = rs[0];
  assert.match(m.subject, /^(SGO\+ \| )?Licitações: 1 candidata do Radar com prazo nas próximas 72 h \(resumo de /);
  assert.match(m.body, /LIC-2026-0232 · FUNDACAO ESTATAL DE SAUDE DO PANTANAL \(Campo Grande\/MS\)/, 'órgão e UF');
  assert.match(m.body, /Objeto: Aquisição de material de escritório/);
  assert.match(m.body, /Fim das propostas: .*04\/11\/2026.*faltam 1 dia/);
  assert.match(m.body, /Nota: sem nota/);
  assert.match(m.body, /Abrir a ficha: https:\/\/sgo\.exemplo\.test\?aviso=LIC-2026-0232\b(?!-)/);
  assert.match(m.body, /Não vou participar \(abre a ficha já no descarte, com o motivo obrigatório\): https:\/\/sgo\.exemplo\.test\?aviso=LIC-2026-0232-NAO/);
  assert.ok(!m.body.includes('LIC-2026-0300'), 'prazo daqui a 10 dias fica fora das 72 h');
  assert.equal(a.zap().length, 0, 'resumo sem WhatsApp');
  // mesmo dia: nada mais; o dia seguinte tem o seu resumo
  a.rodada('2026-11-03T08:05:00-03:00'); a.rodada('2026-11-03T12:00:00-03:00'); a.rodada('2026-11-03T17:00:00-03:00');
  assert.equal(resumos(a).length, 2, 'o resumo do dia sai uma vez por pessoa');
  // dia do fim: a 4 h e a 1 h do fim nenhum alerta individual, nenhum lembrete
  a.rodada('2026-11-04T05:00:30-03:00'); a.rodada('2026-11-04T05:20:00-03:00');
  a.rodada('2026-11-04T08:00:30-03:00'); a.rodada('2026-11-04T08:20:00-03:00');
  assert.equal(resumos(a).length, 4, 'o resumo do dia 04 (a candidata ainda tem prazo)');
  assert.equal(a.al({ OPORTUNIDADE_ID: 'op_0232', TIPO: 'PRAZO' }).length, 0, 'nenhum alerta individual de prazo programado');
  assert.equal(individuais(a, 'LIC-2026-0232').length, 0, 'antes: 5 e-mails por pessoa');
  assert.equal(a.zap().length, 0, 'antes: 5 WhatsApp por pessoa');
  assert.equal(a.hist('RESUMO_RADAR_ENVIADO').length, 4);
  assert.ok(a.hist('RESUMO_RADAR').some((h) => h.ENTIDADE_ID === 'op_0232' && /resumo diário das candidatas do Radar/.test(h.TEXTO)), 'na ficha: foi no resumo');
  // depois do fim das propostas, ela sai do resumo (lista vazia: nenhum e-mail)
  const r5 = a.rodada('2026-11-05T08:00:30-03:00');
  assert.equal(resumos(a).length, 4); assert.equal(r5.resumoRadar.vazio, true);
});

test('resumo: vazio não sai; fim de semana fica para o próximo dia útil; a hora das regras vale', () => {
  const a = ambiente({ ops: [LONGE()], agora: '2026-10-26T07:00:00-03:00' });
  a.rodada();
  const r = a.rodada('2026-10-26T08:00:30-03:00');
  assert.equal(r.resumoRadar.vazio, true); assert.equal(resumos(a).length, 0, 'lista vazia não manda e-mail');
  assert.equal(a.hist('RESUMO_RADAR_VAZIO').length, 1);
  a.rodada('2026-10-26T09:00:00-03:00');
  assert.equal(a.hist('RESUMO_RADAR_VAZIO').length, 1, 'o dia fica conferido uma vez');
  // sábado e domingo: nada; segunda às 08:00: sai
  const b = ambiente({ ops: [C0232({ ENCERRAMENTO_PROPOSTAS: '2026-10-27T12:00:00', ENCERRAMENTO_ISO: '2026-10-27T15:00:00.000Z' })], agora: '2026-10-23T20:00:00-03:00' });
  b.rodada();
  const sab = b.rodada('2026-10-24T08:00:30-03:00'); b.rodada('2026-10-25T08:00:30-03:00');
  assert.equal(resumos(b).length, 0); assert.match(sab.resumoRadar.motivo, /não é dia útil.*próximo dia útil, às 08:00/);
  b.rodada('2026-10-26T08:00:30-03:00');
  assert.equal(resumos(b).length, 2, 'segunda-feira, às 08:00');
  // hora configurada: 07:30
  const c = ambiente({ ops: [C0232()], agora: '2026-11-02T20:00:00-03:00' });
  assert.equal(salvar(c, { radar: { resumoHora: '7:30' } }).ok, true);
  c.rodada();
  c.rodada('2026-11-03T07:20:00-03:00'); assert.equal(resumos(c).length, 0);
  c.rodada('2026-11-03T07:30:30-03:00'); assert.equal(resumos(c).length, 2);
  // e-mail desligado para uma pessoa: o resumo dela não sai (só e-mail, nunca WhatsApp)
  const d = ambiente({ ops: [C0232()], agora: '2026-11-02T20:00:00-03:00' });
  assert.equal(salvar(d, { pessoas: { u_thi: { email: false } } }).ok, true);
  d.rodada(); d.rodada('2026-11-03T08:00:30-03:00');
  assert.deepEqual(resumos(d).map((m) => m.to), ['charles@exemplo.test']); assert.equal(d.zap().length, 0);
});

test('alertas já programados de candidata do Radar são cancelados na rodada com o motivo; ao ir para análise, a programação normal volta sem repetir o que saiu', () => {
  // estado da produção antes da mudança: alertas individuais da candidata programados e um já enviado (com o lembrete pendente)
  const a = ambiente({ ops: [C0232()], agora: '2026-10-30T10:00:00-03:00' });
  assert.equal(salvar(a, { radar: { individuais: true } }, 'como era antes de 03/11/2026').ok, true);
  a.rodada();
  a.rodada('2026-11-01T09:00:30-03:00');
  const enviados = a.al({ OPORTUNIDADE_ID: 'op_0232', TIPO: 'PRAZO', SITUACAO: 'ENVIADO' });
  assert.ok(enviados.length >= 2, 'o aviso de 3 dias saiu para os dois');
  assert.ok(enviados.every((x) => x.ESCALONAR_EM), 'com o lembrete pendente');
  const prog0 = a.al({ OPORTUNIDADE_ID: 'op_0232', TIPO: 'PRAZO', SITUACAO: 'PROGRAMADO' }).length;
  assert.ok(prog0 > 0);
  // a regra nova entra (padrão: desligado) sem passar pela tela: a próxima rodada cancela
  const cfg = a.tabelas.LIC_CONFIG.find((c) => c.CHAVE === 'ALERTAS'), v = JSON.parse(cfg.VALOR_JSON); v.radar.individuais = false; cfg.VALOR_JSON = JSON.stringify(v);
  const e0 = a.emails.length, z0 = a.zap().length;
  a.rodada('2026-11-01T09:05:00-03:00');
  const canc = a.al({ OPORTUNIDADE_ID: 'op_0232', TIPO: 'PRAZO', SITUACAO: 'CANCELADO' });
  assert.equal(canc.length, prog0, 'todos os programados');
  assert.ok(canc.every((x) => /^Candidata no Radar: vai no resumo diário/.test(x.CANCELADO_MOTIVO) && /#C\d+$/.test(x.CHAVE)), 'com o motivo e a chave livre');
  assert.ok(a.al({ OPORTUNIDADE_ID: 'op_0232', TIPO: 'PRAZO', SITUACAO: 'ENVIADO' }).every((x) => !x.ESCALONAR_EM && /Escalonamento cancelado: Candidata no Radar/.test(x.CANCELADO_MOTIVO)), 'sem lembrete nem escalonamento');
  a.rodada('2026-11-01T10:30:00-03:00'); a.rodada('2026-11-01T11:00:00-03:00');
  assert.equal(a.emails.length, e0, 'nada sai (e domingo não tem resumo)'); assert.equal(a.zap().length, z0);
  assert.equal(a.al({ PAPEL: (p) => p === 'ESCALONAMENTO' || p === 'REENVIO' }).length, 0);
  // enviada para análise: a sequência completa volta (só para o responsável); o aviso de 3 dias que já saiu não se repete
  a.mudar('2026-11-01T11:10:00-03:00');
  assert.equal(a.api('s_cha', 'enviarAnalise', { id: 'op_0232' }).ok, true);
  const novos = a.al({ OPORTUNIDADE_ID: 'op_0232', TIPO: 'PRAZO', SITUACAO: 'PROGRAMADO' });
  assert.ok(novos.length > 0, 'programação normal criada');
  assert.ok(novos.every((x) => x.USUARIO_ID === 'u_cha'), 'quem enviou para análise é o responsável');
  const lim = a.ev('op_0232', 'LIMITE_PROPOSTA')[0];
  assert.deepEqual(novos.filter((x) => x.EVENTO_ID === lim.ID).map((x) => x.ANTECEDENCIA), ['1 dia', '4 h', '1 h']);
  for (const x of enviados.filter((y) => y.USUARIO_ID === 'u_cha')) assert.equal(novos.filter((n) => n.EVENTO_ID === x.EVENTO_ID && n.ANTECEDENCIA_MIN === x.ANTECEDENCIA_MIN).length, 0, 'o que já saiu não volta');
  a.rodada('2026-11-03T09:00:30-03:00');
  assert.ok(individuais(a, 'LIC-2026-0232', e0).some((m) => m.to === 'charles@exemplo.test'), 'em análise, o aviso de 1 dia sai');
  assert.equal(resumos(a).length, 0, 'em análise não entra no resumo do Radar');
});

test('descartar cancela na hora todos os alertas pendentes; "Não vou participar" no e-mail e no link abre a ficha já no descarte (só a Diretoria)', () => {
  const a = ambiente({ ops: [IMBEL(), C0232({ SITUACAO: 'ANALISE', RESPONSAVEL_ID: 'u_thi', RESPONSAVEL_NOME: 'THIAGO DONO TESTE', ENCERRAMENTO_PROPOSTAS: '2026-11-13T09:00:00', ENCERRAMENTO_ISO: '2026-11-13T12:00:00.000Z' })] });
  a.rodada(); a.rodada('2026-11-06T08:00:30-03:00');
  const m = a.emails.find((x) => x.to === 'charles@exemplo.test' && x.subject.includes('LIC-2026-imbe'));
  const nao = (/aviso=(LA[0-9a-f]{10}-NAO)/.exec(m.body) || [])[1];
  assert.ok(nao, 'o e-mail do alerta traz o link "Não vou participar"');
  assert.match(m.body, /Não vou participar \(abre a ficha no SGO\+, com login, já no descarte com o motivo obrigatório/);
  // página do link de ciência (sem login): o botão "Não vou participar" leva ao endereço com login
  const tok = (/licciente=(c1e\.L[AG][0-9a-f]{10}\.[0-9a-f]{24})/.exec(m.body) || [])[1];
  assert.match(a.ctx.Licitacoes_cienciaLink(tok, 'ver').naoParticipar, /\?aviso=LA[0-9a-f]{10}-NAO$/);
  assert.match(a.ctx.Lic_cientePagina_(tok).html, /Não vou participar/);
  // abrir o link depois do login: a ficha já na janela do descarte; gestor não abre
  const g = a.ctx.SGO_AvisosGestao_api('s_gil', 'abrir', { aviso: nao });
  assert.equal(g.ok, false); assert.equal(g.outraPessoa, true);
  const ab = a.ctx.SGO_AvisosGestao_api('s_cha', 'abrir', { aviso: nao });
  assert.equal(ab.ok, true, ab.message); assert.deepEqual([ab.tela.tipo, ab.tela.id, ab.tela.aba, ab.tela.acao], ['licitacao', 'op_imbe', 'resumo', 'descartar']);
  // descartar: tudo o que estava pendente é cancelado na hora (sem esperar a rodada), com o motivo
  const ids0 = a.al({ OPORTUNIDADE_ID: 'op_imbe', SITUACAO: 'PROGRAMADO' }).map((x) => x.ID), pend0 = ids0.length;
  assert.ok(pend0 > 0);
  const d = a.api('s_cha', 'descartar', { id: 'op_imbe', motivo: 'Não vamos participar: objeto fora do ramo' });
  assert.equal(d.ok, true, d.message); assert.equal(d.alertasCancelados, pend0);
  assert.equal(a.al({ OPORTUNIDADE_ID: 'op_imbe', SITUACAO: 'PROGRAMADO' }).length, 0);
  assert.ok(a.al({ ID: (i) => ids0.includes(i) }).every((x) => x.SITUACAO === 'CANCELADO' && /descartada pela Diretoria \(CHARLES DIRETOR TESTE\): Não vamos participar/.test(x.CANCELADO_MOTIVO)));
  assert.ok(a.al({ OPORTUNIDADE_ID: 'op_imbe' }).every((x) => !x.ESCALONAR_EM), 'lembrete e escalonamento param');
  const z0 = a.zap().length, e0 = a.emails.length;
  a.rodada('2026-11-06T09:30:00-03:00');
  assert.equal(a.zap().slice(z0).filter((w) => JSON.stringify(w.corpo).includes('IMBEL')).length, 0, 'nada sai da descartada'); assert.equal(individuais(a, 'LIC-2026-imbe', e0).length, 0);
  // o mesmo link depois do descarte: abre a ficha e diz que já foi descartada (nada a fazer)
  const de = a.ctx.SGO_AvisosGestao_api('s_cha', 'abrir', { aviso: nao });
  assert.equal(de.ok, true); assert.equal(de.tela.acao, undefined); assert.match(de.message, /já foi descartada por CHARLES DIRETOR TESTE.*nada mais a fazer/);
  // pelo código da oportunidade (link do resumo do Radar)
  const p = a.ctx.SGO_AvisosGestao_api('s_cha', 'abrir', { aviso: 'LIC-2026-0232-NAO' });
  assert.deepEqual([p.tela.id, p.tela.acao], ['op_0232', 'descartar']);
  assert.equal(a.ctx.SGO_AvisosGestao_api('s_cha', 'abrir', { aviso: 'LIC-2026-0232' }).tela.acao, undefined, '"Abrir a ficha" não abre o descarte');
  const x = a.ctx.SGO_AvisosGestao_api('s_cha', 'abrir', { aviso: 'LIC-2026-9999-NAO' });
  assert.equal(x.ok, false); assert.match(x.message, /Não encontramos esta oportunidade/); assert.equal(x.tela.mod, 'licitacoes_oportunidades');
  // fora do Radar, da análise e da decisão: abre a ficha e diz por quê (nada é alterado)
  a.tabelas.LIC_OPORTUNIDADES.find((l) => l.ID === 'op_0232').SITUACAO = 'PROPOSTA';
  const pr = a.ctx.SGO_AvisosGestao_api('s_cha', 'abrir', { aviso: 'LIC-2026-0232-NAO' });
  assert.equal(pr.tela.acao, undefined); assert.match(pr.message, /o descarte vale só no Radar, em análise ou em decisão, e nada foi alterado/);
});

test('regras dos alertas: "alertas individuais para candidatas do Radar" (padrão desligado) e a hora do resumo (padrão 08:00), com versão, motivo e histórico', () => {
  const a = ambiente({ ops: [C0232()], agora: '2026-11-02T20:00:00-03:00' });
  let c = a.api('s_cha', 'alertasCfg').cfg;
  assert.deepEqual([c.radar.individuais, c.radar.resumoHora], [false, '08:00']);
  assert.match(c.radar.situacao, /ainda não rodou neste ambiente.*08:00/);
  for (const h of ['25:00', '05:30', '8h', '']) {
    const r = salvar(a, { radar: { resumoHora: h } });
    assert.equal(r.ok, false, h); assert.match(r.message, /Hora do resumo diário.*Nada foi alterado/);
  }
  assert.equal((a.tabelas.LIC_CONFIG || []).filter((x) => x.CHAVE === 'ALERTAS').length, 0, 'nada gravado pelas recusas');
  let r = salvar(a, { radar: { resumoHora: '09:15' } }, 'diretoria chega às 09:00');
  assert.equal(r.ok, true, r.message); assert.equal(r.versao, 1);
  const h1 = a.hist('REGRAS_DOS_ALERTAS').find((h) => /Hora do resumo diário/.test(h.TEXTO));
  assert.deepEqual([h1.DE, h1.PARA, h1.VERSAO], ['08:00', '09:15', '1']); assert.match(h1.TEXTO, /Motivo: diretoria chega às 09:00/);
  // ligado: a candidata volta a ter a sequência completa e o resumo diário não sai
  r = salvar(a, { radar: { individuais: true } }, 'piloto com alertas das candidatas');
  assert.equal(r.versao, 2);
  assert.ok(a.hist('REGRAS_DOS_ALERTAS').some((h) => /Alertas individuais para candidatas do Radar/.test(h.TEXTO) && h.DE === 'false' && h.PARA === 'true'));
  c = a.api('s_cha', 'alertasCfg').cfg;
  assert.deepEqual([c.radar.individuais, c.radar.resumoHora], [true, '09:15'], 'merge: a hora salva antes continua');
  a.rodada();
  assert.ok(a.al({ OPORTUNIDADE_ID: 'op_0232', TIPO: 'PRAZO', SITUACAO: 'PROGRAMADO' }).length > 0);
  const rr = a.rodada('2026-11-03T09:20:00-03:00');
  assert.equal(resumos(a).length, 0); assert.match(rr.resumoRadar.motivo, /ligados nas regras: sem resumo diário/);
  // desligado de novo: os programados da candidata são cancelados na hora da gravação, com o motivo
  r = salvar(a, { radar: { individuais: false } }, 'voltar ao padrão do dono');
  assert.equal(r.ok, true);
  assert.equal(a.al({ OPORTUNIDADE_ID: 'op_0232', TIPO: 'PRAZO', SITUACAO: 'PROGRAMADO' }).length, 0);
  assert.ok(a.al({ OPORTUNIDADE_ID: 'op_0232', TIPO: 'PRAZO', SITUACAO: 'CANCELADO' }).some((x) => /versão 3/.test(x.CANCELADO_MOTIVO)));
  assert.equal(salvar(a, { radar: { individuais: false } }).semMudanca, true, 'sem mudança, sem versão nova');
  // tela, ajuda, manual e base do assistente
  const tela = ler('JS_Licitacoes.html');
  for (const t of ['licARadInd', 'licARadHora', 'Alertas individuais para candidatas do Radar', 'Não vou participar']) assert.ok(tela.includes(t), t);
  const docs = [ler('SGO_Ajuda_Licitacoes.js'), fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_LICITACOES.md'), 'utf8'), ler('SGO_AssistenteManuais.js')];
  for (const d of docs) { assert.match(d, /resumo diário/); assert.match(d, /Não vou participar/); }
});
