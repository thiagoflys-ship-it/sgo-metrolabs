// SEDNA do SGO+ (26/10/2026, fase 5 do plano de avisos): escalonamento das atividades atrasadas por prioridade e resumo do
// dia da gestão. Código real num contexto isolado (_matriz_ambiente.cjs); só dados de teste (nomes e contatos fictícios).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, atividade, pastaLegado } = require('./_matriz_ambiente.cjs');

const escalas = (amb) => amb.tabelas[amb.ctx.GES_ABA_ENVIOS].filter((e) => e.TIPO === 'SEDNA_ESCALA');
const histEsc = (amb) => amb.tabelas.ATV_HISTORICO.filter((h) => h.TIPO === 'ESCALONAMENTO');
const emailsPara = (amb, email) => amb.emails.filter((m) => String(m.to).indexOf(email) >= 0);

test('escalonamento: prazos por prioridade, cada nível uma vez por previsão, o mais alto quando passou de vários, nova previsão recomeça', () => {
  const amb = ambiente(); // segunda 19/10/2026, 10:00
  const c = amb.ctx;
  atividade(amb, 'urg', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-19T09:30', { PRIORIDADE: 'Urgente', CRIADO_POR_ID: 'u_tec' });   // 30 min: nível 1
  atividade(amb, 'alta', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-19T05:00', { PRIORIDADE: 'Alta', CRIADO_POR_ID: 'u_tec' });    // 5 h: nível 2
  atividade(amb, 'norm', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-16T09:00', { PRIORIDADE: 'Normal', CRIADO_POR_ID: 'u_tec' });  // 73 h: nível 3
  atividade(amb, 'baixa', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-19T08:00', { PRIORIDADE: 'Baixa', CRIADO_POR_ID: 'u_tec' });  // 2 h: nada
  atividade(amb, 'met', 'u_met', 'MARA METROLOGIA TESTE', '2026-10-19T05:00', { PRIORIDADE: 'Alta', CRIADO_POR_ID: 'u_met' });  // área sem gestor: Diretoria
  const r = c.Sedna_escalonar_();
  assert.equal(r.atividades, 4, JSON.stringify(r));
  const por = Object.fromEntries(escalas(amb).map((e) => [e.REFERENCIA.split('|')[0], e]));
  assert.deepEqual(Object.keys(por).sort(), ['alta', 'met', 'norm', 'urg']);
  assert.match(por.urg.REFERENCIA, /\|1$/); assert.equal(por.urg.ITENS, 'TIAGO TECNICO TESTE');
  assert.match(por.alta.REFERENCIA, /\|2$/); assert.equal(por.alta.ITENS, 'GIL GESTOR TESTE');
  assert.match(por.norm.REFERENCIA, /\|3$/); assert.equal(por.norm.ITENS, 'DORA DIRETORA TESTE');
  assert.match(por.met.REFERENCIA, /\|2$/); assert.equal(por.met.ITENS, 'DORA DIRETORA TESTE', 'área sem gestor: Diretoria');
  assert.equal(histEsc(amb).length, 4);
  assert.match(histEsc(amb).find((h) => h.ATIVIDADE_ID === 'alta').TEXTO, /Atrasada há 5 horas \(prioridade Alta\): escalada ao gestor da área \(GIL GESTOR TESTE\)/);
  // uma mensagem por pessoa: Tiago (nível 1), Gil (nível 2), Dora (nível 2 da Metrologia e nível 3 da normal = duas)
  const tiago = emailsPara(amb, 'tiago@');
  assert.equal(tiago.length, 1);
  assert.match(tiago[0].body || tiago[0].htmlBody || '', /vai ao gestor da área em 30 min/);
  assert.equal(emailsPara(amb, 'gil@').length, 1);
  assert.equal(emailsPara(amb, 'dora@').length, 2);
  assert.equal(amb.whats.length, 0, 'padrão aprovado: sem WhatsApp até a gestão marcar "na hora"');
  // segunda rodada: nada de novo
  assert.equal(c.Sedna_escalonar_().atividades, 0);
  // 14:30: a urgente passou de 4 h -> vai direto à Diretoria (sem repetir o nível 2 que ficou para trás)
  amb.mudar('2026-10-19T14:30:00-03:00');
  c.Sedna_escalonar_();
  const urg = escalas(amb).filter((e) => e.REFERENCIA.indexOf('urg|') === 0).map((e) => e.REFERENCIA.split('|')[2]);
  assert.deepEqual(urg, ['1', '3']);
  // nova previsão (justificativa) recomeça a contagem
  amb.tabelas.ATV_ATIVIDADES.find((a) => a.ID === 'urg').PREVISAO_ATUAL = '2026-10-19T14:00';
  c.Sedna_escalonar_();
  assert.ok(escalas(amb).some((e) => e.REFERENCIA === 'urg|2026-10-19T14:00|1'));
  // concluída não escala
  amb.tabelas.ATV_ATIVIDADES.find((a) => a.ID === 'baixa').SITUACAO = 'Concluída';
  amb.mudar('2026-10-20T10:00:00-03:00');
  c.Sedna_escalonar_();
  assert.ok(!escalas(amb).some((e) => e.REFERENCIA.indexOf('baixa|') === 0));
});

test('escalonamento: quem lançou (da gestão) também recebe o nível 2; ninguém recebe como gestor a própria atividade; desligado não faz nada', () => {
  const amb = ambiente();
  const c = amb.ctx;
  atividade(amb, 'a1', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-19T05:00', { PRIORIDADE: 'Alta', CRIADO_POR_ID: 'u_ga' });
  atividade(amb, 'a2', 'u_gt', 'GIL GESTOR TESTE', '2026-10-19T05:00', { PRIORIDADE: 'Alta', CRIADO_POR_ID: 'u_gt' });
  c.Sedna_escalonar_();
  const por = Object.fromEntries(escalas(amb).map((e) => [e.REFERENCIA.split('|')[0], e.ITENS]));
  assert.equal(por.a1, 'GIL GESTOR TESTE, ANA GESTORA TESTE');
  assert.equal(por.a2, 'DORA DIRETORA TESTE', 'a do próprio gestor vai à Diretoria');
  const amb2 = ambiente({ props: { SEDNA_CFG: JSON.stringify({ escalonamento: { ligado: false } }) } });
  atividade(amb2, 'a1', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-19T05:00', { PRIORIDADE: 'Alta' });
  assert.match(amb2.ctx.Sedna_escalonar_().fora, /desligado/);
});

test('escalonamento entra na rodada da gestão só no expediente; eventos S71-S73 na matriz, e-mail na hora e WhatsApp quando marcado', () => {
  const amb = ambiente();
  const c = amb.ctx;
  atividade(amb, 'urg', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-19T09:30', { PRIORIDADE: 'Urgente', CRIADO_POR_ID: 'u_tec' });
  amb.mudar('2026-10-18T10:00:00-03:00'); // domingo
  assert.ok(!c.Ges_rodada_(new c.Date()).sedna);
  amb.mudar('2026-10-19T10:00:00-03:00');
  const r = c.Ges_rodada_(new c.Date());
  assert.equal(r.sedna.escalonamento.atividades, 1, JSON.stringify(r.sedna));
  const m = c.SGO_AvisosMatriz_api('s_dir', 'carregar', {});
  const por = Object.fromEntries(m.regras.map((x) => [x.cod, x]));
  ['S71', 'S72', 'S73'].forEach((cod) => { assert.equal(por[cod].email, 'HORA'); assert.equal(por[cod].whatsapp, 'NAO'); });
  const linha = amb.tabelas.NTF_ENVIOS.find((l) => l.EVENTO === 'S71');
  assert.ok(linha, 'envio registrado com o evento da matriz');
});

test('política: só Administrador e Diretoria gravam; horas crescentes e hora do resumo no expediente, com mensagem que diz o que fazer', () => {
  const amb = ambiente();
  const c = amb.ctx;
  const base = () => ({ gestoresPorArea: { TECNICA: ['u_gt'] }, escada: { whatsDiasUteis: 2, diretoriaDiasUteis: 5, horaEmail: '08:00', horaSemanal: '08:00' },
    sedna: { escalonamento: { ligado: true, horas: { Urgente: [0.5, 2, 6], Alta: [1, 4, 24], Normal: [4, 24, 72], Baixa: [24, 72, 168] } }, briefing: { ligado: true, hora: '09:00', ia: false } } });
  const lido = c.Gestao_apiConfig('s_gt', {});
  assert.equal(lido.ok, true, lido.message);
  assert.deepEqual(Array.from(lido.sedna.escalonamento.horas.Urgente), [0.25, 1, 4], 'padrão aprovado');
  assert.match(c.Gestao_apiConfig('s_gt', { salvar: base() }).message, /definidos pelo Administrador ou pela Diretoria/);
  const ruim = base(); ruim.sedna.escalonamento.horas.Alta = [4, 1, 24];
  assert.match(c.Gestao_apiConfig('s_dir', { salvar: ruim }).message, /prioridade Alta precisam ser três números crescentes/);
  assert.equal(amb.props.SEDNA_CFG, undefined, 'nada gravado com erro');
  const tarde = base(); tarde.sedna.briefing.hora = '19:00';
  assert.match(c.Gestao_apiConfig('s_dir', { salvar: tarde }).message, /resumo do dia \(19:00\) precisa ficar dentro do horário de trabalho/);
  const ok = c.Gestao_apiConfig('s_dir', { salvar: base() });
  assert.equal(ok.ok, true, ok.message);
  assert.deepEqual(Array.from(ok.sedna.escalonamento.horas.Urgente), [0.5, 2, 6]);
  assert.equal(ok.sedna.briefing.hora, '09:00');
  assert.equal(ok.sedna.briefing.ia, false);
});

test('resumo do dia: depois da hora, um por pessoa da gestão, pelas regras; só a gestão vê no Início', () => {
  const amb = ambiente();
  const c = amb.ctx;
  atividade(amb, 'urg', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-19T09:30', { PRIORIDADE: 'Urgente', TITULO: 'Trocar sensor da autoclave' });
  atividade(amb, 'hj', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-19T16:00', { PRIORIDADE: 'Normal' });
  atividade(amb, 'adm', 'u_pj', 'PAULO PJ TESTE', '2026-10-19T08:00', { PRIORIDADE: 'Alta', MODULO: 'compras', CRIADO_POR_ID: 'u_ga' });
  assert.match(c.Sedna_briefingRodada_({ hora: '08:00' }).fora, /antes das 08:30/);
  const r = c.Sedna_briefingRodada_({ hora: '09:00' });
  assert.ok(r.gerados >= 4, JSON.stringify(r));
  const gil = JSON.parse(amb.props.SEDNA_BRIEF_u_gt);
  assert.equal(gil.origem, 'REGRAS');
  assert.match(gil.texto, /^Bom dia, Gil\. Resumo de 19\/10\/2026\./);
  assert.match(gil.texto, /Equipe: 2 atividades atrasadas \(prioridade: 1 urgente, 1 alta\) e 1 vence hoje\./);
  assert.match(gil.texto, /Comece por: Trocar sensor da autoclave \(urgente, com Tiago, atrasada há 30 min\)/);
  const ana = JSON.parse(amb.props.SEDNA_BRIEF_u_ga);
  assert.match(ana.texto, /Equipe: 1 atividade atrasada \(prioridade: 1 alta\)/, 'Ana: só a que ela lançou');
  assert.ok(!amb.props.SEDNA_BRIEF_u_tec, 'técnico não recebe resumo de gestão');
  assert.match(c.Sedna_briefingDaSessao_('s_gt').texto, /Bom dia, Gil/);
  assert.equal(c.Sedna_briefingDaSessao_('s_tec'), null);
  // de novo no mesmo dia: nada
  assert.equal(c.Sedna_briefingRodada_({ hora: '10:00' }).gerados, 0);
  // no dia seguinte o de ontem não aparece
  amb.mudar('2026-10-20T07:00:00-03:00');
  assert.equal(c.Sedna_briefingDaSessao_('s_gt'), null);
});

test('resumo do dia com IA: vale só o que passa no verificador (número ou nome fora dos dados volta para as regras); no máximo 3 por rodada', () => {
  const amb = ambiente({ props: { GEMINI_API_KEY: 'chave-teste' } });
  const c = amb.ctx;
  atividade(amb, 'urg', 'u_tec', 'TIAGO TECNICO TESTE', '2026-10-19T09:30', { PRIORIDADE: 'Urgente' });
  const respostas = [];
  c.SGO_DocA4_chamarGemini_ = (prompt) => {
    respostas.push(prompt);
    if (/"nome":"Gil"/.test(prompt)) return '{"texto":"Bom dia, Gil. Comece pela atividade urgente com Tiago, atrasada há 30 min."}';
    if (/"nome":"Dora"/.test(prompt)) return '{"texto":"Bom dia, Dora. Há 99 atividades atrasadas."}';
    if (/"nome":"Ana"/.test(prompt)) return '{"texto":"Bom dia, Ana. Cobre o Paulo hoje."}';
    return '{"texto":"Bom dia. Nada atrasado na equipe."}';
  };
  const r1 = c.Sedna_briefingRodada_({ hora: '09:00' });
  assert.equal(respostas.length, 3, 'no máximo 3 chamadas à IA por rodada');
  const r2 = c.Sedna_briefingRodada_({ hora: '09:15' });
  assert.ok(respostas.length > 3 && r1.gerados >= 3 && r2.gerados >= 1, JSON.stringify([r1, r2]));
  const b = (id) => JSON.parse(amb.props['SEDNA_BRIEF_' + id]);
  assert.equal(b('u_gt').origem, 'IA');
  assert.match(b('u_gt').texto, /Comece pela atividade urgente com Tiago/);
  assert.equal(b('u_dir').origem, 'REGRAS');
  assert.match(b('u_dir').aviso, /número fora dos dados: 99/);
  assert.equal(b('u_ga').origem, 'REGRAS');
  assert.match(b('u_ga').aviso, /nome fora dos dados: Paulo/);
  assert.doesNotMatch(respostas[0], /tiago@|62999/, 'nenhum e-mail ou telefone vai para a IA');
});

test('tela: Início mostra o resumo, regras com a política, histórico com o rótulo e manual atualizado', () => {
  const ler = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8');
  assert.match(ler('SGO_Inicio.js'), /briefing: typeof Sedna_briefingDaSessao_ === 'function'/);
  assert.match(ler('JS_Inicio.html'), /inicio-briefing/);
  assert.match(ler('JS_Gestao.html'), /Gestao_htmlSedna_\(r\.sedna/);
  assert.match(ler('JS_Gestao.html'), /sedna: Gestao_lerSedna_\(\)/);
  assert.match(ler('JS_Atividades.html'), /ESCALONAMENTO: "Cobrança escalada pela prioridade"/);
  assert.match(ler('SGO_Gestao_Escada.js'), /passo\('sedna'/);
  assert.match(ler('SGO_Ajuda_Gestao.js'), /escalonamento por prioridade/i);
  assert.match(ler('SGO_Ajuda_Principal.js'), /RESUMO DO DIA/);
});
