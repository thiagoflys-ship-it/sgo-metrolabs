// SGO+ Licitações, etapa 3 (02/11/2026): agenda de prazos (natureza CONFIRMADO/CALCULADO/PREVISTO, feriados, retificação,
// suspensão) e alertas da Diretoria de Licitações (antecedências, fora do expediente só para Licitações, ciência, escalonamento,
// falha e canal alternativo, retorno de status da Meta, permissões), com o código REAL do notificador, da matriz de avisos, do
// piloto do WhatsApp e dos avisos da gestão (e-mail e WhatsApp simulados: nada sai). Dados públicos do PNCP já usados nos docs
// 02 e 03 (Unioeste/Cascavel e IMBEL); pessoas fictícias.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { ambiente: ambMatriz, pastaLegado } = require('./_matriz_ambiente.cjs');
const ler = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n');

const USUARIOS = [
  { ID: 'u_cha', USUARIO: 'charles', NOME: 'CHARLES DIRETOR TESTE', PERFIL: 'DIRETORIA', STATUS: 'ATIVO', EMAIL: 'charles@exemplo.test', CELULAR: '62999990021', VINCULO_TRABALHO: 'DIRETORIA', AREA: 'DIRETORIA' },
  { ID: 'u_thi', USUARIO: 'admin', NOME: 'THIAGO DONO TESTE', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: 'thiago@exemplo.test', CELULAR: '62999990022', VINCULO_TRABALHO: 'DIRETORIA', AREA: 'DIRETORIA' },
  { ID: 'u_gil', USUARIO: 'gil', NOME: 'GIL GESTOR TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'gil@exemplo.test', CELULAR: '62999990023', VINCULO_TRABALHO: 'CLT', AREA: 'TECNICA' },
  { ID: 'u_vera', USUARIO: 'vera', NOME: 'VERA COMERCIAL TESTE', PERFIL: 'COMERCIAL', STATUS: 'ATIVO', EMAIL: 'vera@exemplo.test', CELULAR: '62999990024', VINCULO_TRABALHO: 'CLT', AREA: 'COMERCIAL' }
];
const ARQ_LIC = ['SGO_Licitacoes_Config.js', 'SGO_Licitacoes.js', 'SGO_Licitacoes_Analise.js', 'SGO_Licitacoes_Agenda.js', 'SGO_Licitacoes_Alertas.js', 'SGO_WhatsappPiloto.js', 'SGO_Ajuda.js', 'SGO_Ajuda_Licitacoes.js'];
const APROVADO = JSON.stringify({ em: '2026-10-20T10:00:00', modelos: { sgo_licitacao_prazo: 'APPROVED', sgo_gestao_acao: 'APPROVED' } });

const OP = (id, extra) => Object.assign({ ID: id, CODIGO: 'LIC-2026-' + id.slice(-4), CHAVE_FONTE: 'PNCP:' + id, SITUACAO: 'RADAR', TRIAGEM: 'CANDIDATA', LEI: '14133', MODALIDADE: 'Pregão - Eletrônico',
  PORTAL_SESSAO: 'PUB-002', PORTAL_ORIGEM: 'PNCP', UF: 'PR', MUNICIPIO: 'Cascavel', ORGAO_NOME: 'UNIVERSIDADE ESTADUAL DO OESTE DO PARANA', NUMERO_CONTROLE_PNCP: '78680337000770-1-000430/2026',
  OBJETO: 'Manutenção preventiva e corretiva com certificado de calibração de equipamentos de laboratório', VALOR_ESTIMADO: 98765.43, ABERTURA_PROPOSTAS: '2026-10-20T08:00:00',
  ENCERRAMENTO_PROPOSTAS: '2026-11-04T08:30:00', ENCERRAMENTO_ISO: '2026-11-04T11:30:00.000Z', FUSO_PRESUMIDO: 'SIM', VERSAO_FONTE: 1, VERSAO_HASH: 'h1', SITUACAO_FONTE: 'Divulgada no PNCP', AMPARO_LEGAL: 'Lei 14.133/2021, Art. 28, I' }, extra || {});
const IMBEL = () => OP('op_imbe', { SITUACAO: 'ANALISE', RESPONSAVEL_ID: 'u_cha', RESPONSAVEL_NOME: 'CHARLES DIRETOR TESTE', LEI: '13303', AMPARO_LEGAL: 'Lei 13.303/2016, Art. 32, IV', PORTAL_SESSAO: 'PUB-004', PORTAL_SESSAO_NOME: 'BLL Compras',
  UF: 'RJ', MUNICIPIO: 'Magé', ORGAO_NOME: 'INDUSTRIA DE MATERIAL BELICO DO BRASIL IMBEL', NUMERO_CONTROLE_PNCP: '00444232000139-1-001311/2026', ENCERRAMENTO_PROPOSTAS: '2026-11-13T08:00:00', ENCERRAMENTO_ISO: '2026-11-13T11:00:00.000Z' });

function ambiente(o) {
  o = o || {};
  const a = ambMatriz({ agora: Date.parse(o.agora || '2026-10-26T10:00:00-03:00'), extras: ARQ_LIC, tabelas: Object.assign({ CAD_USUARIOS: USUARIOS.map((u) => Object.assign({}, u)), NTF_GESTAO: [] }, o.tabelas || {}),
    props: Object.assign({ NTF_MODELOS_SITUACAO: o.semModelo ? JSON.stringify({ modelos: { sgo_gestao_acao: 'APPROVED' } }) : APROVADO }, o.props || {}) });
  a.ctx.Utilities.computeDigest = (alg, texto) => Array.from(crypto.createHash('sha256').update(String(texto), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b));
  a.ctx.Utilities.DigestAlgorithm = { SHA_256: 'SHA_256' }; a.ctx.Utilities.Charset = { UTF_8: 'UTF-8' };
  const gatilho = { timeBased: () => gatilho, everyMinutes: () => gatilho, everyHours: () => gatilho, everyDays: () => gatilho, atHour: () => gatilho, nearMinute: () => gatilho, create() {} };
  a.ctx.ScriptApp.newTrigger = () => gatilho;
  a.ctx.HtmlService = { createHtmlOutput: (h) => { const x = { html: h, setTitle: () => x, addMetaTag: () => x }; return x; } };
  Object.assign(a.sessoes, { s_cha: { userId: 'u_cha', usuario: 'charles', nome: 'CHARLES DIRETOR TESTE', perfil: 'DIRETORIA' }, s_thi: { userId: 'u_thi', usuario: 'admin', nome: 'THIAGO DONO TESTE', perfil: 'ADMIN' },
    s_gil: { userId: 'u_gil', usuario: 'gil', nome: 'GIL GESTOR TESTE', perfil: 'GESTOR' }, s_vera: { userId: 'u_vera', usuario: 'vera', nome: 'VERA COMERCIAL TESTE', perfil: 'COMERCIAL' } });
  a.ctx.Lic_garantirAbas_();
  (o.ops || []).forEach((l) => a.tabelas.LIC_OPORTUNIDADES.push(l));
  a.api = (sid, acao, d) => a.ctx.Licitacoes_api(sid, acao, d || {});
  a.rodada = (iso) => { if (iso) a.mudar(iso); return a.ctx.Lic_alertasRodada_(); };
  a.ev = (opId, tipo, todas) => a.tabelas.LIC_EVENTOS.filter((e) => e.OPORTUNIDADE_ID === opId && (!tipo || e.TIPO === tipo) && (todas || e.SITUACAO !== 'RETIFICADO'));
  a.al = (f) => (a.tabelas.LIC_ALERTAS || []).filter((x) => Object.keys(f || {}).every((k) => (typeof f[k] === 'function' ? f[k](x[k]) : x[k] === f[k])));
  a.hist = (tipo) => (a.tabelas.LIC_HISTORICO || []).filter((h) => !tipo || h.TIPO === tipo);
  a.zap = (modelo) => a.whats.filter((w) => w.corpo.template && w.corpo.template.name === (modelo || 'sgo_licitacao_prazo'));
  return a;
}
const J = (x) => JSON.parse(JSON.stringify(x));
const brt = (iso) => new Date(iso).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 16);

// ------------------------------------------------------------------ agenda
test('agenda: prazos nascem da fonte com a natureza certa (14.133 no Compras.gov, 13.303 em portal privado, dispensa, regime pendente, data incoerente)', () => {
  const a = ambiente({ ops: [OP('op_casc'), IMBEL(), OP('op_disp', { MODALIDADE: 'Dispensa', ENCERRAMENTO_PROPOSTAS: '2026-11-09T08:00:00', ENCERRAMENTO_ISO: '2026-11-09T11:00:00.000Z' }),
    OP('op_regi', { LEI: '', AMPARO_LEGAL: '' }), OP('op_inco', { ABERTURA_PROPOSTAS: '2026-11-13T07:59:00', ENCERRAMENTO_PROPOSTAS: '2026-11-13T08:00:00', ENCERRAMENTO_ISO: '2026-11-13T11:00:00.000Z' })] });
  const r = a.ctx.Lic_agendaAtualizar_({});
  assert.equal(r.atualizadas, 5);
  // Unioeste (Cascavel/PR), Lei 14.133, sessão no Compras.gov.br
  const lim = a.ev('op_casc', 'LIMITE_PROPOSTA')[0];
  assert.equal(lim.NATUREZA, 'CONFIRMADO'); assert.equal(lim.NOME, 'Fim do envio das propostas e abertura da sessão'); assert.equal(lim.QUANDO_ISO, '2026-11-04T11:30:00.000Z');
  assert.match(lim.FONTE_REF, /PNCP.*dataEncerramentoProposta.*78680337000770-1-000430\/2026.*versão 1 da fonte/);
  assert.match(lim.REGRA, /IN SEGES\/ME 73\/2022, art\. 18/);
  assert.equal(a.ev('op_casc', 'ABERTURA_PROPOSTAS')[0].NATUREZA, 'CONFIRMADO');
  assert.equal(a.ev('op_casc', 'SESSAO_PUBLICA').length, 0, 'no Compras.gov.br a sessão é o fim das propostas (um prazo só)');
  const imp = a.ev('op_casc', 'PRAZO_IMPUGNACAO')[0];
  assert.equal(imp.NATUREZA, 'CALCULADO'); assert.equal(imp.DIA_TODO, 'SIM');
  assert.equal(brt(imp.QUANDO_ISO), '2026-10-29 23:59', 'doc 03, A3.2: 03/11 (1), 02/11 Finados não conta, 30/10 (2), 29/10 (3)');
  assert.equal(brt(imp.LIMITE_INTERNO_ISO), '2026-10-28 17:00', 'limite interno: 1 dia útil de folga, às 17:00');
  assert.match(imp.REGRA, /Lei 14\.133\/2021, art\. 164/); assert.match(imp.REGRA, /02\/11 \(feriado nacional \(Finados\)\)/); assert.match(imp.REGRA, /feriado estadual ou municipal do órgão não chega por API/);
  assert.equal(a.ev('op_casc', 'PRAZO_ESCLARECIMENTO')[0].NATUREZA, 'CALCULADO');
  // IMBEL (Magé/RJ), Lei 13.303, sessão na BLL
  const impI = a.ev('op_imbe', 'PRAZO_IMPUGNACAO')[0];
  assert.equal(impI.NATUREZA, 'CALCULADO'); assert.equal(brt(impI.QUANDO_ISO), '2026-11-06 23:59', 'doc 03: 5 dias úteis antes de 13/11 = 06/11'); assert.match(impI.REGRA, /Lei 13\.303\/2016, art\. 87, § 1º/);
  const escI = a.ev('op_imbe', 'PRAZO_ESCLARECIMENTO')[0];
  assert.equal(escI.NATUREZA, 'PREVISTO'); assert.equal(escI.QUANDO_ISO, '', 'regulamento da estatal: sem data calculada');
  const ses = a.ev('op_imbe', 'SESSAO_PUBLICA')[0];
  assert.equal(ses.NATUREZA, 'PREVISTO'); assert.match(ses.OBS, /confirme no edital \(publicado por BLL Compras\)/);
  // dispensa: sem impugnação; regime pendente: nada calculado; data incoerente: pendente, sem alerta
  assert.deepEqual(a.ev('op_disp').map((e) => e.TIPO).sort(), ['ABERTURA_PROPOSTAS', 'LIMITE_PROPOSTA']);
  assert.deepEqual(a.ev('op_regi', 'PRAZO_IMPUGNACAO').map((e) => [e.NATUREZA, e.QUANDO_ISO]), [['PREVISTO', '']]);
  assert.match(a.ev('op_regi', 'PRAZO_IMPUGNACAO')[0].REGRA, /Regime jurídico pendente/);
  assert.equal(a.ev('op_inco', 'LIMITE_PROPOSTA')[0].NATUREZA, 'PREVISTO');
  assert.match(a.ev('op_inco', 'LIMITE_PROPOSTA')[0].OBS, /Data da fonte incoerente/);
  // histórico com a agenda montada; idempotente
  assert.ok(a.hist('AGENDA_MONTADA').length === 5);
  const antes = a.tabelas.LIC_EVENTOS.length;
  assert.equal(a.ctx.Lic_agendaAtualizar_({}).atualizadas, 0, 'base igual: nada é refeito');
  assert.equal(a.tabelas.LIC_EVENTOS.length, antes);
});

test('feriados: para trás conservador (Finados, Carnaval, feriado cadastrado), para frente só os nacionais fixos (art. 183)', () => {
  const a = ambiente({ props: { SGO_EXPEDIENTE: JSON.stringify({ ini: '08:00', fim: '17:30', dias: [1, 2, 3, 4, 5], feriados: '24/10/2026' }) } });
  const c = a.ctx;
  assert.equal(c.Lic_diasUteisAntes_('2026-11-04', 3).dia, '2026-10-29');
  assert.equal(c.Lic_diasUteisAntes_('2027-02-10', 3).dia, '2027-02-03', 'Carnaval 2027 (08 e 09/02) não conta para trás');
  assert.equal(c.Lic_diasUteisDepois_('2027-02-05', 3).dia, '2027-02-10', 'para frente o Carnaval (ponto facultativo) conta: o limite nunca passa do real');
  assert.equal(c.Lic_diasUteisDepois_('2026-11-18', 3).dia, '2026-11-24', '20/11 (Consciência Negra) não conta');
  assert.equal(c.Lic_diasUteisAntes_('2026-10-27', 1).dia, '2026-10-26');
  assert.match(c.Lic_motivoNaoUtil_('2026-10-23', 'TRAS') + '|' + c.Lic_motivoNaoUtil_('2026-11-02', 'FRENTE'), /^\|feriado nacional \(Finados\)$/);
  assert.deepEqual(J(c.Lic_feriadosEntre_('2026-11-01', '2026-11-21').map((f) => f.dia)), ['2026-11-02', '2026-11-20'], 'a agenda mostra os feriados em dia de semana');
});

test('retificação na fonte: versão nova do prazo, a anterior guardada, alertas antigos cancelados com o motivo e alerta de mudança', () => {
  const a = ambiente({ ops: [OP('op_casc')] });
  a.rodada();
  const v1 = a.ev('op_casc', 'LIMITE_PROPOSTA')[0];
  const progV1 = a.al({ EVENTO_ID: v1.ID, SITUACAO: 'PROGRAMADO' });
  assert.equal(progV1.length, 10, '5 antecedências × 2 integrantes (sem titular, os dois)');
  const l = a.tabelas.LIC_OPORTUNIDADES[0];
  Object.assign(l, { ENCERRAMENTO_PROPOSTAS: '2026-11-06T09:00:00', ENCERRAMENTO_ISO: '2026-11-06T12:00:00.000Z', VERSAO_FONTE: 2, VERSAO_HASH: 'h2', RETIFICADA_EM: '2026-10-26T14:00:00.000Z' });
  a.rodada('2026-10-26T11:00:00-03:00');
  const todas = a.ev('op_casc', 'LIMITE_PROPOSTA', true);
  assert.equal(todas.length, 2);
  const velho = todas.find((e) => e.VERSAO === 1), novo = todas.find((e) => e.VERSAO === 2);
  assert.equal(velho.SITUACAO, 'RETIFICADO'); assert.equal(velho.SUBSTITUIDO_POR_ID, novo.ID); assert.equal(novo.SUBSTITUI_ID, velho.ID); assert.equal(velho.QUANDO_ISO, '2026-11-04T11:30:00.000Z', 'a linha antiga nunca é alterada na data');
  assert.match(novo.MOTIVO_MUDANCA, /Retificação na fonte \(versão 2\).*qua 04\/11\/2026 08:30.*sex 06\/11\/2026 09:00/);
  assert.equal(brt(a.ev('op_casc', 'PRAZO_IMPUGNACAO')[0].QUANDO_ISO), '2026-11-03 23:59', 'impugnação recalculada pela data nova');
  const canc = a.al({ EVENTO_ID: v1.ID });
  assert.ok(canc.every((x) => x.SITUACAO === 'CANCELADO' && /Retificação na fonte/.test(x.CANCELADO_MOTIVO)), 'pendentes do prazo antigo cancelados com o motivo');
  assert.equal(a.al({ EVENTO_ID: novo.ID, SITUACAO: 'PROGRAMADO' }).length, 10, 'os do prazo novo são programados');
  const mud = a.al({ TIPO: 'MUDANCA' });
  assert.ok(mud.length >= 2 && mud.every((x) => x.NIVEL === 'IMPORTANTE' && ['u_cha', 'u_thi'].includes(x.USUARIO_ID)));
  assert.ok(mud.filter((x) => x.ANTECEDENCIA === 'RETIFICACAO').every((x) => x.SITUACAO === 'ENVIADO'), 'o alerta de mudança sai na hora');
  assert.ok(a.hist('AGENDA_RETIFICADA').length >= 2);
  assert.ok(a.emails.some((m) => /Prazo alterado na fonte/.test(m.subject)));
});

test('suspensão, revogação e reabertura: alerta crítico para os dois, alertas pendentes cancelados com o motivo; já suspensa na montagem não alerta', () => {
  const a = ambiente({ ops: [OP('op_casc'), OP('op_ja01', { SITUACAO_FONTE: 'Suspensa' })] });
  a.rodada();
  assert.ok(a.ev('op_ja01').every((e) => e.SITUACAO === 'SUSPENSO'), 'montada já suspensa: prazos suspensos');
  assert.equal(a.al({ OPORTUNIDADE_ID: 'op_ja01' }).length, 0, 'sem alerta de mudança falso e sem programação');
  a.tabelas.LIC_OPORTUNIDADES[0].SITUACAO_FONTE = 'Suspensa';
  a.rodada('2026-10-26T12:00:00-03:00');
  assert.ok(a.ev('op_casc').every((e) => e.SITUACAO === 'SUSPENSO'));
  const prazo = a.al({ OPORTUNIDADE_ID: 'op_casc', TIPO: 'PRAZO' });
  assert.ok(prazo.length && prazo.every((x) => x.SITUACAO === 'CANCELADO' && /suspensa na fonte/.test(x.CANCELADO_MOTIVO)));
  const sus = a.al({ TIPO: 'MUDANCA', ANTECEDENCIA: 'SUSPENSAO' });
  assert.deepEqual(sus.map((x) => [x.USUARIO_ID, x.NIVEL, x.SITUACAO]).sort(), [['u_cha', 'CRITICO', 'ENVIADO'], ['u_thi', 'CRITICO', 'ENVIADO']]);
  assert.equal(a.hist('AGENDA_SUSPENSA').filter((h) => h.ENTIDADE_ID === 'op_casc').length, 1);
  // reabertura: prazos voltam a valer e os alertas são programados de novo (a chave do cancelado não prende)
  a.tabelas.LIC_OPORTUNIDADES[0].SITUACAO_FONTE = 'Divulgada no PNCP';
  a.rodada('2026-10-26T13:00:00-03:00');
  assert.ok(a.ev('op_casc').every((e) => e.SITUACAO === 'ATIVO'));
  assert.equal(a.al({ TIPO: 'MUDANCA', ANTECEDENCIA: 'REABERTURA' }).length, 2);
  assert.ok(a.al({ OPORTUNIDADE_ID: 'op_casc', TIPO: 'PRAZO', SITUACAO: 'PROGRAMADO' }).length >= 10);
  // revogação: prazos cancelados
  a.tabelas.LIC_OPORTUNIDADES[0].SITUACAO_FONTE = 'Revogada';
  a.rodada('2026-10-26T14:00:00-03:00');
  assert.ok(a.ev('op_casc').every((e) => e.SITUACAO === 'CANCELADO' && /revogada na fonte/.test(e.MOTIVO_MUDANCA)));
  assert.equal(a.al({ TIPO: 'MUDANCA', ANTECEDENCIA: 'REVOGACAO', NIVEL: 'CRITICO' }).length, 2);
  assert.equal(a.al({ OPORTUNIDADE_ID: 'op_casc', TIPO: 'PRAZO', SITUACAO: 'PROGRAMADO' }).length, 0);
});

// ------------------------------------------------------------------ alertas
test('antecedências: horário certo, implantação sem rajada, só a mais recente quando já passou, nada para descartada, sem termo, travada ou pendente', () => {
  const a = ambiente({ ops: [OP('op_casc'), IMBEL(), OP('op_desc', { SITUACAO: 'DESCARTADA', TRIAGEM: 'DESCARTADA', DESCARTE_ORIGEM: 'REGRA' }), OP('op_trav', { TRIAGEM: 'TRAVADA' }),
    OP('op_semt', { TRIAGEM: '' }), OP('op_inco', { ABERTURA_PROPOSTAS: '2026-11-13T07:59:00', ENCERRAMENTO_PROPOSTAS: '2026-11-13T08:00:00', ENCERRAMENTO_ISO: '2026-11-13T11:00:00.000Z' })] });
  a.rodada();
  const lim = a.ev('op_casc', 'LIMITE_PROPOSTA')[0];
  const ch = a.al({ EVENTO_ID: lim.ID, USUARIO_ID: 'u_cha' }).map((x) => [x.ANTECEDENCIA, x.NIVEL, brt(x.LIBERAR_EM)]);
  assert.deepEqual(ch, [['7 dias', 'NORMAL', '2026-10-28 08:30'], ['3 dias', 'IMPORTANTE', '2026-11-01 08:30'], ['1 dia', 'IMPORTANTE', '2026-11-03 08:30'], ['4 h', 'CRITICO', '2026-11-04 04:30'], ['1 h', 'CRITICO', '2026-11-04 07:30']]);
  const imp = a.ev('op_casc', 'PRAZO_IMPUGNACAO')[0];
  assert.deepEqual(a.al({ EVENTO_ID: imp.ID, USUARIO_ID: 'u_thi' }).map((x) => brt(x.LIBERAR_EM)), ['2026-10-26 17:00', '2026-10-27 17:00', '2026-10-28 13:00'], 'impugnação conta do limite interno');
  assert.ok(a.al({ OPORTUNIDADE_ID: 'op_imbe' }).every((x) => x.USUARIO_ID === 'u_cha' && x.PAPEL === 'TITULAR'), 'com responsável, só ele recebe primeiro');
  for (const id of ['op_desc', 'op_trav', 'op_semt', 'op_inco']) assert.equal(a.al({ OPORTUNIDADE_ID: id }).length, 0, id);
  assert.ok(!a.al({}).some((x) => ['u_gil', 'u_vera'].includes(x.USUARIO_ID)), 'gestor e comercial nunca recebem');
  // oportunidade nova depois da implantação, com 2 dias de prazo: sai só o aviso de 3 dias (o mais recente já vencido); o de 7 não
  a.tabelas.LIC_OPORTUNIDADES.push(OP('op_novo', { ENCERRAMENTO_PROPOSTAS: '2026-11-03T09:00:00', ENCERRAMENTO_ISO: '2026-11-03T12:00:00.000Z', NUMERO_CONTROLE_PNCP: '11111111000111-1-000001/2026' }));
  a.rodada('2026-11-01T09:00:00-03:00');
  const lnovo = a.ev('op_novo', 'LIMITE_PROPOSTA')[0], novos = a.al({ EVENTO_ID: lnovo.ID });
  assert.deepEqual([...new Set(novos.map((x) => x.ANTECEDENCIA))].sort(), ['1 dia', '1 h', '3 dias', '4 h']);
  assert.ok(novos.filter((x) => x.ANTECEDENCIA === '3 dias').every((x) => x.SITUACAO === 'ENVIADO'));
  // rotina parada: de um mesmo prazo e pessoa, vencidos juntos, sai só o mais recente
  const pul = a.al({ EVENTO_ID: lim.ID, SITUACAO: 'PULADO' });
  assert.ok(pul.length >= 2 && pul.every((x) => /saiu só o mais recente/.test(x.CANCELADO_MOTIVO)));
  // mudar as antecedências: o que sai da regra é cancelado com o motivo, o novo é programado
  const r = a.api('s_cha', 'alertasCfgSalvar', { campos: { antecedencias: { LIMITE_PROPOSTA: [{ min: 120, nivel: 'CRITICO' }] } }, motivo: 'Teste: só 2 horas antes' });
  assert.equal(r.ok, true, r.message);
  const lim2 = a.al({ EVENTO_ID: lim.ID, USUARIO_ID: 'u_cha' });
  assert.ok(lim2.filter((x) => x.ANTECEDENCIA === '1 h').every((x) => x.SITUACAO === 'CANCELADO' && /Fora das regras dos alertas \(versão 1\)/.test(x.CANCELADO_MOTIVO)));
  assert.equal(lim2.filter((x) => x.ANTECEDENCIA === '2 h' && x.SITUACAO === 'PROGRAMADO').length, 1);
});

test('fora do expediente: alerta de licitação sai num domingo de madrugada só para a Diretoria de Licitações; os demais avisos seguem a matriz', () => {
  const a = ambiente({ ops: [IMBEL()] });
  a.rodada();
  const lim = a.ev('op_imbe', 'LIMITE_PROPOSTA')[0];
  // 7 dias antes de sex 13/11 08:00 = sex 06/11 08:00; força um aviso num domingo às 03:00 para o teste
  const x = a.al({ EVENTO_ID: lim.ID, ANTECEDENCIA: '7 dias' })[0];
  x.LIBERAR_EM = '2026-11-08T06:00:00.000Z';
  a.mudar('2026-11-08T03:00:30-03:00');
  assert.equal(a.ctx.SGO_dentroDoExpediente_(new a.ctx.Date()).dentro, false, 'domingo 03:00 está fora do expediente');
  a.ctx.Lic_alertasEnviar_();
  const y = a.al({ ID: x.ID })[0];
  assert.equal(y.SITUACAO, 'ENVIADO'); assert.equal(y.EMAIL_SITUACAO, 'ENVIADO'); assert.equal(y.WA_SITUACAO, 'ACEITO');
  assert.equal(a.zap().length, 1); assert.equal(a.zap()[0].corpo.to, '5562999990021');
  assert.equal(a.ctx.Mtz_foraDaMatriz_({ origem: 'LICITACOES' }), true);
  const cont = { id: 'u_gil', vinculo: 'CLT' };
  assert.equal(a.ctx.SGO_avisoMotivoWhatsapp_(cont, { origem: 'LICITACOES' }), '', 'Licitações tem regra própria');
  assert.match(a.ctx.SGO_avisoMotivoWhatsapp_(cont, { origem: 'COMERCIAL', evento: 'S32' }), /WhatsApp|expediente/, 'o resto continua na matriz');
  // o piloto só libera o modelo de licitação para a lista da Diretoria de Licitações
  const cfg = a.ctx.SGO_waPilotoCfg_();
  assert.ok(cfg.telefonesLicitacoes.length === 2);
  assert.equal(a.ctx.SGO_waPilotoMotivo_({ id: 'u_cha', telefone: '5562999990021' }, cfg, { origem: 'LICITACOES', modelo: 'sgo_licitacao_prazo' }), '');
  assert.match(a.ctx.SGO_waPilotoMotivo_({ id: 'u_gil', telefone: '5562999990023' }, cfg, { origem: 'LICITACOES', modelo: 'sgo_licitacao_prazo' }), /Retida pelo piloto/);
  assert.match(a.ctx.SGO_waPilotoMotivo_({ id: 'u_cha', telefone: '5562999990021' }, Object.assign({}, cfg, { usuarios: [] }), { origem: 'LICITACOES', modelo: 'sgo_aviso_geral' }), /Retida pelo piloto/, 'outro modelo não passa pela lista');
});

test('ciência: na tela, pelo link do botão do WhatsApp e pela resposta CIENTE; encerra a cobrança para os dois; quem e por onde no histórico', () => {
  const a = ambiente({ ops: [OP('op_casc')] });
  a.rodada();
  a.rodada('2026-10-26T17:00:30-03:00');
  const imp = a.ev('op_casc', 'PRAZO_IMPUGNACAO')[0];
  const [c1, t1] = ['u_cha', 'u_thi'].map((u) => a.al({ EVENTO_ID: imp.ID, ANTECEDENCIA: '2 dias', USUARIO_ID: u })[0]);
  assert.equal(c1.SITUACAO, 'ENVIADO'); assert.equal(c1.PAPEL, 'TODOS');
  assert.ok(a.ctx.Lic_alertasSemCiencia_(null).length >= 2);
  const r = a.api('s_cha', 'alertaCiente', { id: c1.ID });
  assert.equal(r.ok, true, r.message);
  const [c2, t2] = [c1, t1].map((x) => a.al({ ID: x.ID })[0]);
  assert.equal(c2.SITUACAO, 'CIENTE'); assert.equal(c2.CIENTE_POR_NOME, 'CHARLES DIRETOR TESTE'); assert.equal(c2.CIENTE_CANAL, 'SGO_TELA');
  assert.equal(t2.SITUACAO, 'CIENTE'); assert.equal(t2.CIENTE_CANAL, 'SGO_TELA_OUTRO', 'a ciência de um vale para o alerta do outro');
  assert.match(a.hist('ALERTA_CIENCIA')[0].TEXTO, /ciência de CHARLES DIRETOR TESTE pelo tela do SGO\+.*não conclui a tarefa/);
  assert.equal(a.hist('ALERTA_CIENCIA')[0].USUARIO_ID, 'u_cha');
  assert.match(a.api('s_cha', 'alertaCiente', { id: c1.ID }).texto, /já estava registrada/, 'repetir não duplica');
  // botão do WhatsApp (token assinado; sem login)
  const esc = a.ev('op_casc', 'PRAZO_ESCLARECIMENTO')[0], t3 = a.al({ EVENTO_ID: esc.ID, ANTECEDENCIA: '2 dias', USUARIO_ID: 'u_thi' })[0];
  const zap = a.zap().find((w) => w.corpo.to === '5562999990022' && JSON.stringify(w.corpo).includes('esclarecimento'));
  const botao = zap.corpo.template.components.find((c) => c.type === 'button');
  const token = botao.parameters[0].text;
  assert.match(token, /^c1w\.LA[0-9a-f]{10}\.[0-9a-f]{24}$/);
  assert.equal(a.ctx.Licitacoes_cienciaLink(token.slice(0, -1) + (token.slice(-1) === '0' ? '1' : '0'), 'confirmar').ok, false, 'token adulterado não vale');
  const ver = a.ctx.Licitacoes_cienciaLink(token, 'ver');
  assert.equal(ver.ok, true); assert.equal(ver.nome, 'THIAGO'); assert.equal(ver.ciente, false);
  assert.doesNotMatch(JSON.stringify(ver), /98765|98\.765/, 'a página sem login não mostra valor');
  const conf = a.ctx.Licitacoes_cienciaLink(token, 'confirmar');
  assert.equal(conf.ciente, true);
  assert.equal(a.al({ ID: t3.ID })[0].CIENTE_CANAL, 'WHATSAPP_BOTAO');
  assert.match(a.ctx.Lic_cientePagina_(token).html, /Confirmar ciência/);
  // resposta "Ciente" à mensagem (o número tem de ser o da pessoa)
  a.rodada('2026-10-27T17:00:30-03:00');
  const t4 = a.al({ EVENTO_ID: imp.ID, ANTECEDENCIA: '1 dia', USUARIO_ID: 'u_thi' })[0];
  assert.ok(t4.WA_ID);
  assert.equal(a.ctx.SGO_whatsappRetornoMeta_([{ tipo: 'RESPOSTA', contexto: t4.WA_ID, de: '5562999990021', texto: 'Ciente', quando: '' }]).ciencias, 0, 'outro número não dá ciência pelo outro');
  for (const t of ['ok', 'ciente, obrigado', 'não estou ciente', 'Ok, vou ver']) assert.equal(a.ctx.SGO_whatsappRetornoMeta_([{ tipo: 'RESPOSTA', contexto: t4.WA_ID, de: '556299990022', texto: t, quando: '' }]).ciencias, 0, 'não é ciência: ' + t);
  assert.equal(a.ctx.SGO_whatsappRetornoMeta_([{ tipo: 'RESPOSTA', contexto: t4.WA_ID, de: '556299990022', texto: ' Ciente. ', quando: '' }]).ciencias, 1, 'mesmo número sem o 9');
  assert.equal(a.al({ ID: t4.ID })[0].CIENTE_CANAL, 'WHATSAPP_RESPOSTA');
});

test('escalonamento: crítico sem ciência em 5 min vai para o outro integrante e é reenviado por outro canal; normal espera 60 min; ciência encerra', () => {
  const a = ambiente({ ops: [IMBEL()] });
  a.rodada();
  a.rodada('2026-11-13T04:00:30-03:00');   // venceram 7 dias, 3 dias, 24 h e 4 h: sai só o de 4 h (crítico)
  const lim = a.ev('op_imbe', 'LIMITE_PROPOSTA')[0];
  const x = a.al({ EVENTO_ID: lim.ID, ANTECEDENCIA: '4 h' })[0];
  assert.equal(x.SITUACAO, 'ENVIADO'); assert.equal(x.USUARIO_ID, 'u_cha'); assert.equal(brt(x.ESCALONAR_EM), '2026-11-13 04:05');
  a.rodada('2026-11-13T04:03:00-03:00');
  assert.equal(a.al({ ID: x.ID })[0].SITUACAO, 'ENVIADO', 'antes dos 5 minutos não escalona');
  a.rodada('2026-11-13T04:05:30-03:00');
  const x2 = a.al({ ID: x.ID })[0];
  assert.equal(x2.SITUACAO, 'ESCALONADO'); assert.equal(x2.ESCALONADO_PARA, 'THIAGO DONO TESTE');
  const esc = a.al({ ORIGEM_ALERTA_ID: x.ID, PAPEL: 'ESCALONAMENTO' })[0], ree = a.al({ ORIGEM_ALERTA_ID: x.ID, PAPEL: 'REENVIO' })[0];
  assert.equal(esc.USUARIO_ID, 'u_thi'); assert.equal(esc.SITUACAO, 'ENVIADO'); assert.equal(esc.CANAIS, 'email,whatsapp');
  assert.equal(ree.USUARIO_ID, 'u_cha'); assert.equal(ree.CANAIS, 'whatsapp', 'os dois canais chegaram: reenvio pelo WhatsApp');
  assert.match(esc.TITULO, /^Sem ciência · /);
  assert.match(a.hist('ALERTA_ESCALONADO')[0].TEXTO, /sem ciência em 5 min \(nível crítico\): escalonado para THIAGO DONO TESTE/);
  // ciência do outro encerra a cobrança do alerta original
  a.api('s_thi', 'alertaCiente', { id: esc.ID });
  assert.equal(a.al({ ID: x.ID })[0].SITUACAO, 'CIENTE'); assert.equal(a.al({ ID: x.ID })[0].CIENTE_POR_NOME, 'THIAGO DONO TESTE');
  a.rodada('2026-11-13T04:20:00-03:00');
  assert.equal(a.al({ ORIGEM_ALERTA_ID: esc.ID }).length, 0, 'escalonamento não escalona de novo');
  // normal: só depois de 60 minutos
  const b = ambiente({ ops: [IMBEL()] });
  b.rodada();
  const lb = b.ev('op_imbe', 'LIMITE_PROPOSTA')[0];
  b.rodada('2026-11-06T08:00:30-03:00');
  const n = b.al({ EVENTO_ID: lb.ID, ANTECEDENCIA: '7 dias' })[0];
  assert.equal(n.NIVEL, 'NORMAL'); assert.equal(n.SITUACAO, 'ENVIADO');
  b.rodada('2026-11-06T08:10:00-03:00');
  assert.equal(b.al({ ID: n.ID })[0].SITUACAO, 'ENVIADO');
  b.rodada('2026-11-06T09:01:00-03:00');
  assert.equal(b.al({ ID: n.ID })[0].SITUACAO, 'ESCALONADO');
});

test('falha e canal alternativo: WhatsApp falhou -> e-mail; nada saiu -> falha registrada e escalonamento na hora; sem modelo aprovado -> "aguardando aprovação"', () => {
  const a = ambiente({ ops: [IMBEL()] });
  a.rodada();
  assert.equal(a.api('s_cha', 'alertasCfgSalvar', { campos: { pessoas: { u_cha: { email: false } } }, motivo: 'Teste: Charles só pelo WhatsApp' }).ok, true);
  a.ctx.UrlFetchApp.fetch = () => ({ getResponseCode: () => 400, getContentText: () => JSON.stringify({ error: { message: 'Recipient phone number not in allowed list', code: 131030 } }) });
  a.rodada('2026-11-06T08:00:30-03:00');
  const lim = a.ev('op_imbe', 'LIMITE_PROPOSTA')[0];
  const x = a.al({ EVENTO_ID: lim.ID, ANTECEDENCIA: '7 dias' })[0];
  assert.equal(x.WA_SITUACAO, 'FALHOU'); assert.match(x.WA_MOTIVO, /Meta recusou \(HTTP 400, código 131030\)/);
  assert.equal(x.EMAIL_SITUACAO, 'ENVIADO'); assert.match(x.CANAL_ALTERNATIVO, /e-mail enviado como canal alternativo/);
  assert.equal(x.SITUACAO, 'ENVIADO');
  assert.ok(a.emails.some((m) => m.to === 'charles@exemplo.test'));
  // nada sai (sem e-mail no cadastro e WhatsApp falhando): falha registrada e escalonamento na hora
  a.tabelas.CAD_USUARIOS.find((u) => u.ID === 'u_cha').EMAIL = '';
  a.rodada('2026-11-10T08:00:30-03:00');
  const y = a.al({ EVENTO_ID: lim.ID, ANTECEDENCIA: '3 dias' })[0];
  assert.equal(y.SITUACAO, 'FALHOU'); assert.equal(y.EMAIL_SITUACAO, 'SEM_EMAIL'); assert.ok(y.INTERNO_EM, 'o interno vale sempre');
  assert.equal(y.ESCALONAR_EM, y.FALHOU_EM);
  assert.ok(a.hist('ALERTA_FALHOU').length >= 1);
  a.rodada('2026-11-10T08:05:00-03:00');
  assert.equal(a.al({ ID: y.ID })[0].SITUACAO, 'ESCALONADO');
  assert.equal(a.al({ ORIGEM_ALERTA_ID: y.ID, PAPEL: 'ESCALONAMENTO' })[0].USUARIO_ID, 'u_thi');
  // sem o modelo aprovado: interno + e-mail, com a marca; o WhatsApp não é tentado
  const b = ambiente({ ops: [IMBEL()], semModelo: true });
  b.rodada();
  b.rodada('2026-11-06T08:00:30-03:00');
  const z = b.al({ ANTECEDENCIA: '7 dias' })[0];
  assert.equal(z.WA_SITUACAO, 'AGUARDANDO_MODELO'); assert.match(z.WA_MOTIVO, /WhatsApp aguardando aprovação do modelo sgo_licitacao_prazo na Meta/);
  assert.equal(z.EMAIL_SITUACAO, 'ENVIADO'); assert.equal(b.zap().length, 0);
  assert.equal(b.api('s_cha', 'alertas', {}).modelo.aprovado, false);
});

test('retorno da Meta: aceito -> enviado -> entregue -> lido só pelo webhook, sem voltar; failed aciona o e-mail; avisos da gestão também recebem', () => {
  const a = ambiente({ ops: [IMBEL()] });
  a.rodada();
  a.api('s_cha', 'alertasCfgSalvar', { campos: { pessoas: { u_cha: { email: false } } }, motivo: 'Teste: Charles só pelo WhatsApp' });
  a.rodada('2026-11-06T08:00:30-03:00');
  const lim = a.ev('op_imbe', 'LIMITE_PROPOSTA')[0], x = a.al({ EVENTO_ID: lim.ID, ANTECEDENCIA: '7 dias' })[0];
  assert.equal(x.WA_SITUACAO, 'ACEITO'); assert.ok(x.WA_ID); assert.ok(!x.EMAIL_SITUACAO, 'e-mail desligado para Charles');
  let tela = a.ctx.Lic_alertaParaTela_(a.al({ ID: x.ID })[0]);
  assert.equal(tela.estados.find((s) => s.n === 3).feito, true); assert.equal(tela.estados.find((s) => s.n === 4).feito, false, 'entregue não é presumido');
  const st = (status, quando) => a.ctx.SGO_whatsappRetornoMeta_([{ tipo: 'STATUS', id: x.WA_ID, status, quando, motivo: '' }]);
  assert.equal(st('sent', '2026-11-06T11:00:40.000Z').licitacoes, 1);
  assert.equal(a.al({ ID: x.ID })[0].WA_SITUACAO, 'ENVIADO');
  st('delivered', '2026-11-06T11:00:45.000Z');
  st('read', '2026-11-06T11:02:00.000Z');
  st('delivered', '2026-11-06T11:03:00.000Z');
  const y = a.al({ ID: x.ID })[0];
  assert.equal(y.WA_SITUACAO, 'LIDO', 'lido não volta para entregue'); assert.equal(y.ENTREGUE_EM, '2026-11-06T11:00:45.000Z'); assert.equal(y.LIDO_EM, '2026-11-06T11:02:00.000Z');
  tela = a.ctx.Lic_alertaParaTela_(y);
  assert.deepEqual(J(tela.estados.filter((s) => s.feito).map((s) => s.n)), [1, 2, 3, 4, 5]);
  assert.ok(['ALERTA_WHATSAPP_ENVIADO', 'ALERTA_WHATSAPP_ENTREGUE', 'ALERTA_WHATSAPP_LIDO'].every((t) => a.hist(t).length === 1), 'cada status do provedor no histórico');
  assert.ok(JSON.parse(a.props.SGO_WA_RETORNO_ULTIMO).em, 'a tela mostra quando chegou o último retorno');
  assert.equal(a.api('s_cha', 'alertas', {}).retorno.recebido, true);
  // failed: WhatsApp falhou na entrega -> e-mail na hora como canal alternativo
  a.rodada('2026-11-10T08:00:30-03:00');
  const z = a.al({ EVENTO_ID: lim.ID, ANTECEDENCIA: '3 dias' })[0];
  const nEmails = a.emails.length;
  st('failed');
  a.ctx.SGO_whatsappRetornoMeta_([{ tipo: 'STATUS', id: z.WA_ID, status: 'failed', quando: '2026-11-10T11:01:00.000Z', motivo: 'Message undeliverable (131026)' }]);
  const z2 = a.al({ ID: z.ID })[0];
  assert.equal(z2.WA_SITUACAO, 'FALHOU'); assert.match(z2.WA_MOTIVO, /A Meta devolveu falha na entrega: Message undeliverable/);
  assert.equal(z2.EMAIL_SITUACAO, 'ENVIADO'); assert.match(z2.CANAL_ALTERNATIVO, /WhatsApp falhou no retorno da Meta: e-mail enviado/);
  assert.equal(a.emails.length, nEmails + 1);
  assert.equal(a.al({ ID: x.ID })[0].WA_SITUACAO, 'LIDO', 'failed depois de lido é ignorado');
  // avisos da gestão (NTF_GESTAO) continuam recebendo o retorno pela mesma entrada
  a.tabelas.NTF_GESTAO.push({ ID: 'g1', AVISO_ID: 'AG1', WA_ID: 'wamid.gestao', WA_SITUACAO: 'ENVIADO' });
  assert.equal(a.ctx.SGO_whatsappRetornoMeta_([{ tipo: 'STATUS', id: 'wamid.gestao', status: 'read', quando: '2026-11-10T12:00:00.000Z' }]).gestao, 1);
  assert.equal(a.tabelas.NTF_GESTAO[0].WA_SITUACAO, 'LIDO');
});

test('permissões: só Diretoria e Administrador usam agenda, alertas e regras; só eles recebem; recusa diz o quê, por quê e o que fazer', () => {
  const a = ambiente({ ops: [OP('op_casc')] });
  a.rodada();
  const al = a.al({})[0];
  for (const sid of ['s_gil', 's_vera']) {
    for (const acao of ['agenda', 'alertas', 'alertaCiente', 'alertaReenviar', 'alertasCfg', 'alertasCfgSalvar', 'eventoConfirmar', 'eventoAta']) {
      const r = a.api(sid, acao, { id: al.ID, campos: { ligado: false }, motivo: 'tentativa sem permissão', eventoId: 'x' });
      assert.equal(r.ok, false, sid + ' ' + acao); assert.equal(r.semAcesso, true); assert.match(r.message, /Diretoria e do Administrador/);
    }
  }
  assert.equal(a.api('s_thi', 'agenda', { periodo: '30' }).ok, true);
  const r1 = a.api('s_cha', 'alertasCfgSalvar', { campos: { pessoas: { u_gil: { recebe: true } } }, motivo: 'incluir o gestor' });
  assert.equal(r1.ok, false); assert.match(r1.message, /Só a Diretoria de Licitações.*Nada foi alterado/);
  const r2 = a.api('s_cha', 'alertasCfgSalvar', { campos: { pessoas: { u_cha: { recebe: false }, u_thi: { recebe: false } } }, motivo: 'ninguém recebe' });
  assert.equal(r2.ok, false); assert.match(r2.message, /pelo menos uma pessoa da Diretoria de Licitações precisa receber/);
  assert.equal(a.api('s_cha', 'alertasCfgSalvar', { campos: { ligado: false }, motivo: 'abc' }).ok, false, 'motivo curto');
  assert.equal((a.tabelas.LIC_CONFIG || []).filter((c) => c.CHAVE === 'ALERTAS').length, 0, 'nada gravado pelas recusas');
  // link ?aviso= de um alerta: só a Diretoria abre; abrir marca "em atendimento"
  a.rodada('2026-10-26T17:00:30-03:00');
  const env = a.al({ SITUACAO: 'ENVIADO', USUARIO_ID: 'u_cha' })[0];
  const g = a.ctx.SGO_AvisosGestao_api('s_gil', 'abrir', { aviso: env.AVISO_ID });
  assert.equal(g.ok, false); assert.equal(g.outraPessoa, true);
  const c = a.ctx.SGO_AvisosGestao_api('s_cha', 'abrir', { aviso: env.AVISO_ID });
  assert.equal(c.ok, true); assert.deepEqual([c.tela.tipo, c.tela.id, c.tela.aba], ['licitacao', 'op_casc', 'prazos']);
  assert.ok(a.al({ ID: env.ID })[0].ABERTO_EM);
});

test('regras dos alertas: merge com versão e motivo, histórico de cada mudança, padrão da missão quando nada foi salvo', () => {
  const a = ambiente({ ops: [OP('op_casc')] });
  let c = a.api('s_cha', 'alertasCfg').cfg;
  assert.deepEqual([c.versao, c.ligado, c.escalonarMin.NORMAL, c.escalonarMin.IMPORTANTE, c.escalonarMin.CRITICO, c.foraDoExpediente], [0, true, 60, 15, 5, true]);
  assert.deepEqual(c.pessoasLista.map((p) => p.nome), ['CHARLES DIRETOR TESTE', 'THIAGO DONO TESTE']);
  assert.ok(c.pessoasLista.every((p) => /^final \d{4}$/.test(p.celular)), 'celular só com o final');
  let r = a.api('s_cha', 'alertasCfgSalvar', { campos: { escalonarMin: { CRITICO: 10 }, titularId: 'u_cha' }, motivo: 'Charles é o titular' });
  assert.equal(r.ok, true); assert.equal(r.versao, 1);
  r = a.api('s_thi', 'alertasCfgSalvar', { campos: { canais: { whatsapp: false } }, motivo: 'Teste do WhatsApp desligado' });
  assert.equal(r.versao, 2);
  c = a.api('s_cha', 'alertasCfg').cfg;
  assert.deepEqual([c.escalonarMin.CRITICO, c.escalonarMin.IMPORTANTE, c.titularId, c.canais.whatsapp, c.canais.email], [10, 15, 'u_cha', false, true], 'a segunda gravação não apagou a primeira');
  const h = a.hist('REGRAS_DOS_ALERTAS');
  assert.equal(h.length, 3);
  assert.ok(h.some((x) => x.DE === '5' && x.PARA === '10' && /Charles é o titular/.test(x.TEXTO) && String(x.VERSAO) === '1'));
  assert.match(a.api('s_cha', 'alertasCfgSalvar', { campos: { escalonarMin: { CRITICO: 10 } }, motivo: 'repetido' }).texto, /Nada mudou/);
  assert.match(a.api('s_cha', 'alertasCfgSalvar', { campos: { antecedencias: { LIMITE_PROPOSTA: [{ min: 60, nivel: 'CRITICO' }, { min: 60, nivel: 'NORMAL' }] } }, motivo: 'repetida' }).message, /repetida/);
  // titular escolhido: sem responsável, só ele recebe primeiro
  a.rodada();
  assert.ok(a.al({ OPORTUNIDADE_ID: 'op_casc', TIPO: 'PRAZO' }).every((x) => x.USUARIO_ID === 'u_cha' && x.PAPEL === 'TITULAR'));
});

test('descartar cancela os alertas pendentes com o motivo; reabrir programa de novo; confirmar data cria versão e alertas da sessão', () => {
  const a = ambiente({ ops: [OP('op_casc'), IMBEL()] });
  a.rodada();
  assert.equal(a.api('s_cha', 'descartar', { id: 'op_casc', motivo: 'Escopo é peça de reposição, não serviço' }).ok, true);
  assert.ok(a.al({ OPORTUNIDADE_ID: 'op_casc', TIPO: 'PRAZO' }).every((x) => x.SITUACAO === 'CANCELADO' && /descartada pela Diretoria/.test(x.CANCELADO_MOTIVO)));
  assert.equal(a.api('s_cha', 'reabrir', { id: 'op_casc', motivo: 'O edital aceita calibração rastreável' }).ok, true);
  assert.equal(a.al({ OPORTUNIDADE_ID: 'op_casc', TIPO: 'PRAZO', SITUACAO: 'PROGRAMADO' }).length, 22);
  // sessão da IMBEL (BLL): pendente, sem alerta; confirmada pela Diretoria com o fuso e onde conferiu
  const ses = a.ev('op_imbe', 'SESSAO_PUBLICA')[0];
  assert.equal(a.al({ EVENTO_ID: ses.ID }).length, 0);
  const ruim = a.api('s_cha', 'eventoConfirmar', { eventoId: ses.ID, data: '2026-11-13', hora: '09:00', fuso: 'America/Sao_Paulo', onde: 'edital' });
  assert.equal(ruim.ok, false); assert.match(ruim.message, /onde você conferiu.*Nada foi alterado/);
  const ok = a.api('s_cha', 'eventoConfirmar', { eventoId: ses.ID, data: '2026-11-13', hora: '09:00', fuso: 'America/Sao_Paulo', onde: 'Edital, item 6.1, página 4' });
  assert.equal(ok.ok, true, ok.message); assert.equal(ok.versaoNova, true);
  const v2 = a.ev('op_imbe', 'SESSAO_PUBLICA')[0];
  assert.deepEqual([v2.NATUREZA, v2.FONTE, v2.CONFIRMADO_POR_NOME, v2.VERSAO, brt(v2.QUANDO_ISO)], ['CONFIRMADO', 'PESSOA', 'CHARLES DIRETOR TESTE', 2, '2026-11-13 09:00']);
  assert.equal(a.ev('op_imbe', 'SESSAO_PUBLICA', true).find((e) => e.VERSAO === 1).SITUACAO, 'RETIFICADO');
  assert.equal(a.al({ EVENTO_ID: v2.ID, SITUACAO: 'PROGRAMADO' }).length, 5, 'sessão confirmada ganha os alertas (24 h, 4 h, 1 h, 30 min, 10 min)');
  assert.ok(a.hist('AGENDA_CONFIRMADA').length === 1);
  // a fonte não muda: a data conferida continua valendo na rodada seguinte
  a.rodada('2026-10-27T10:00:00-03:00');
  assert.equal(a.ev('op_imbe', 'SESSAO_PUBLICA')[0].ID, v2.ID);
  // data da ata: recurso pela Lei 13.303 (5 dias úteis, só feriados fixos)
  const ata = a.api('s_cha', 'eventoAta', { id: 'op_imbe', data: '2026-11-18', onde: 'Ata da sessão na BLL Compras' });
  assert.equal(ata.ok, true, ata.message);
  assert.equal(brt(a.ev('op_imbe', 'PRAZO_RECURSO')[0].QUANDO_ISO), '2026-11-26 23:59', '19, (20 feriado), 23, 24, 25, 26');
});

test('telas: agenda por dia com feriado e pendentes, central de alertas, ficha com Prazos; celular de 390 px sem rolagem lateral; menu, ajuda, manual e assistente', () => {
  const a = ambiente({ ops: [OP('op_casc'), IMBEL()] });
  a.rodada();
  a.mudar('2026-10-30T10:00:00-03:00');
  const ag = a.api('s_cha', 'agenda', { periodo: '30' });
  assert.equal(ag.ok, true, ag.message);
  const dias = ag.dias.map((d) => d.dia);
  assert.ok(dias.includes('2026-11-02') && ag.dias.find((d) => d.dia === '2026-11-02').feriado.includes('Finados'));
  assert.ok(ag.dias.find((d) => d.dia === '2026-11-04').eventos.some((e) => e.tipo === 'LIMITE_PROPOSTA' && e.natureza === 'CONFIRMADO' && e.fusoPresumido && e.alertas.programados > 0));
  assert.ok(ag.pendentes.some((e) => e.tipo === 'PRAZO_ESCLARECIMENTO' && e.opId === 'op_imbe'));
  assert.equal(a.api('s_cha', 'agenda', { periodo: '30', natureza: 'PENDENTE' }).dias.every((d) => d.eventos.every((e) => e.natureza === 'PREVISTO')), true);
  const ce = a.api('s_cha', 'alertas', { filtro: 'programados' });
  assert.ok(ce.total > 0 && ce.lista.every((x) => x.situacao === 'PROGRAMADO'));
  assert.deepEqual(ce.integrantes, ['CHARLES DIRETOR TESTE', 'THIAGO DONO TESTE']);
  const f = a.api('s_cha', 'ficha', { id: 'op_imbe' });
  assert.equal(f.ok, true, f.message); assert.ok(f.prazos.eventos.length >= 5); assert.equal(f.prazos.podeAta, true);
  // front: rotas, abas, ações, sem atualização automática, celular
  const js = ler('JS_Licitacoes.html');
  for (const s of ['licitacoes_agenda', 'licitacoes_alertas', 'data-lic-fab="\' + a[0]', '"prazos"', 'Regras dos alertas', 'data-lic-ciente', 'data-lic-confirmar-ev', 'data-lic-ata', 'Licitacoes_irPara_']) assert.ok(js.includes(s), s);
  assert.doesNotMatch(js, /setInterval\(/, 'nenhuma atualização automática redesenha formulário');
  assert.match(js, /@media \(max-width: 900px\) \{[\s\S]*\.lic-ev \{ grid-template-columns: minmax\(0, 1fr\);/);
  assert.doesNotMatch(js.slice(js.indexOf('/* etapa 3: agenda'), js.indexOf('</style>')), /(?<!max-)width:\s*(39[1-9]|[4-9]\d\d|\d{4,})px/, 'nada mais largo que 390 px fixo');
  const idx = ler('Index.html');
  for (const m of ['licitacoes_agenda', 'licitacoes_alertas']) assert.match(idx, new RegExp('data-mod="' + m + '"'));
  assert.match(ler('JS_Inicio.html'), /case "licitacao":[\s\S]*Licitacoes_irPara_\(acao\)/);
  assert.match(ler('SGO_Main.js'), /e\.parameter\.licciente && typeof Lic_cientePagina_ === "function"/);
  const telas = a.ctx.SGO_ajudaTelas_Licitacoes_();
  for (const k of ['licitacoes_agenda', 'licitacoes_alertas']) {
    const t = telas[k];
    assert.ok(t && t.titulo && t.paraQueServe && t.passos.length && t.cores.length && t.problemas.length && t.quemPode.length && t.perguntas.length, k);
    assert.ok(a.ctx.SGO_AJUDA_NOMES[k], k);
  }
  assert.match(JSON.stringify(telas.licitacoes_portais), /Regras dos alertas/);
  assert.match(JSON.stringify(telas.licitacoes_oportunidades), /Prazos da licitação/);
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_LICITACOES.md'), 'utf8');
  for (const s of ['6.7 Agenda e prazos', 'CALCULADO', 'PREVISTO (pendente de confirmação)', 'Fora do expediente', 'sgo_licitacao_prazo', 'Escalonamento', 'canal alternativo', 'Entregue', 'X-Hub-Signature-256']) assert.ok(manual.includes(s), 'manual: ' + s);
  assert.match(ler('SGO_AssistenteManuais.js'), /Agenda e prazos/);
  const textos = ['SGO_Licitacoes_Agenda.js', 'SGO_Licitacoes_Alertas.js', 'SGO_Ajuda_Licitacoes.js', 'JS_Licitacoes.html'].map(ler).join('\n') + manual;
  assert.doesNotMatch(textos, /antiburro/i);
  assert.doesNotMatch(textos, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, 'sem emoji');
});

test('modelo sgo_licitacao_prazo: dentro das regras da Meta, botão de ciência, 9 variáveis, sem valor; cadastro no formato dos outros', () => {
  const a = ambiente();
  const def = a.ctx.NTF_MODELOS_META.sgo_licitacao_prazo;
  assert.deepEqual(J(a.ctx.Notificar_validarModeloMeta_('sgo_licitacao_prazo', def)), []);
  const corpo = a.ctx.Notificar_corpoCadastroMeta_('sgo_licitacao_prazo');
  assert.equal(corpo.category, 'UTILITY'); assert.equal(corpo.language, 'pt_BR');
  assert.deepEqual(J(corpo.components.map((c) => c.type)), ['BODY', 'BUTTONS']);
  assert.equal(corpo.components[1].buttons[0].url, 'https://sgo.metrolabs.com.br/?licciente={{1}}');
  assert.equal(def.limites.length, 9);
  assert.doesNotMatch(def.texto, /[Vv]alor/, 'o valor estimado não vai na mensagem');
  const ped = a.ctx.Notificar_montarPedidoMeta_('123', '5562999990021', 'sgo_licitacao_prazo', ['crítico', 'Órgão', 'Processo', 'Objeto', 'Prazo', 'Quando', '4 h', 'Ação', 'https://x'], 'c1w.LA0123456789.0123456789abcdef01234567');
  assert.equal(ped.corpo.template.components[1].parameters[0].text, 'c1w.LA0123456789.0123456789abcdef01234567');
});
