// Comercial: gestora automática (11/11/2026, pedido do dono). Sem gestor comercial na equipe, a gestora cria em Minhas atividades do
// vendedor uma atividade para cada orçamento que pede ação, conclui sozinha quando o item se resolve e tem o seletor ligada/desligada.
// Código real do SGO+ (tests/_comercial_ambiente.cjs + SGO_Comercial_GestoraAuto.js), relógio controlado, IA simulada. Dados fictícios.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente, oportunidadeDeTeste } = require('./_comercial_ambiente.cjs');

const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };

function montar(opcoes) {
  const a = ambiente(opcoes || {});
  vm.runInContext(fs.readFileSync(path.join(PASTA, 'SGO_Comercial_GestoraAuto.js'), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: 'SGO_Comercial_GestoraAuto.js' });
  const { oportunidade } = oportunidadeDeTeste(a); // próxima ação em 20/10 10:00 (futura): a oportunidade em si não pede ação
  a.op = oportunidade;
  a.tabelas.COM_PROPOSTAS = a.tabelas.COM_PROPOSTAS || [];
  return a;
}
let nProp = 0;
function proposta(a, extra) {
  nProp++;
  const n = String(nProp).padStart(4, '0');
  const p = Object.assign({ ID: 'pg' + nProp, NUMERO: 'PROP-2026-' + n, REVISAO: 0, OPORTUNIDADE_ID: a.op.id, CLIENTE_ID: 'c1', CLIENTE_NOME: 'Hospital Teste Alfa', UNIDADE_ID: 'un1',
    RESPONSAVEL_ID: 'u_ven', RESPONSAVEL_NOME: 'VERA VENDEDORA TESTE', SITUACAO: 'PRONTA', TOTAL: 4500, VALIDA_ATE: '2026-11-30', CONTATO_NOME: 'Ana Enfermeira Teste', CRIADO_EM: '2026-10-10T12:00:00.000Z' }, extra || {});
  a.tabelas.COM_PROPOSTAS.push(p);
  return p;
}
const rodada = (a, op) => a.ctx.ComGA_rodada_(new a.ctx.Date(), op || { semIA: true });
const daGestora = (a) => a.tabelas.ATV_ATIVIDADES.filter((x) => x.CRIADO_POR_ID === 'COMERCIAL');
const registro = (a) => a.tabelas.COM_GESTORA_AUTOMATICA || [];

test('G1 cria atividade para a proposta pronta não enviada e para a enviada sem resposta, com porquê, estratégia, mensagem e prazo', () => {
  const a = montar();
  const pronta = proposta(a);
  const semResp = proposta(a, { SITUACAO: 'ENVIADA', ENVIADA_EM: '2026-10-14T09:00' }); // 3 dias úteis sem resposta
  const r = rodada(a);
  assert.equal(r.criadas, 2, JSON.stringify(r));
  const l = daGestora(a);
  assert.equal(l.length, 2);
  assert.ok(l.every((x) => x.RESPONSAVEL_ID === 'u_ven' && x.SITUACAO === 'A fazer' && x.RESTRITA === 'SIM'));
  const tPronta = l.find((x) => /^Enviar a proposta pronta: PROP-2026-\d{4} rev\.\S+ · Hospital Teste Alfa$/.test(x.TITULO));
  const tSem = l.find((x) => /^Combinar a decisão da proposta sem resposta: /.test(x.TITULO));
  assert.ok(tPronta && tSem, l.map((x) => x.TITULO).join(' | '));
  assert.match(tSem.DESCRICAO, /Por quê: /);
  assert.match(tSem.DESCRICAO, /O que fazer: Ligue para o cliente/);
  assert.match(tSem.DESCRICAO, /Estratégia da metodologia: /);
  assert.match(tSem.DESCRICAO, /Mensagem sugerida \(revise antes de enviar; o sistema não envia nada ao cliente\)/);
  assert.match(tSem.DESCRICAO, /Onde fazer: Comercial > Propostas > PROP-/);
  assert.match(tPronta.DESCRICAO, /concluída sozinha quando o item se resolver/);
  assert.doesNotMatch(tPronta.DESCRICAO + tSem.DESCRICAO + tPronta.TITULO, /R\$/, 'atividade não leva valor');
  // prioridade "Hoje" criada às 10:00 de segunda: fim do expediente do dia
  assert.equal(tPronta.PRAZO, '2026-10-19T17:30');
  assert.equal(tPronta.PRIORIDADE, 'Normal');
  // registro e histórico; nada muda na proposta
  assert.deepEqual(registro(a).map((x) => x.SITUACAO).sort(), ['ABERTA', 'ABERTA']);
  assert.ok(registro(a).every((x) => x.ORIGEM_TEXTO === 'REGRAS' && x.ATIVIDADE_ID && x.DIA === '2026-10-19'));
  assert.ok(registro(a).some((x) => x.REGRA === 'PROPOSTA_SEM_RESPOSTA' && x.ESTRATEGIA));
  assert.equal(a.tabelas.COM_HISTORICO.filter((h) => h.TIPO === 'GESTORA_AUTOMATICA').length, 2);
  assert.equal(a.tabelas.COM_PROPOSTAS.find((x) => x.ID === pronta.ID).SITUACAO, 'PRONTA');
  assert.equal(a.tabelas.COM_PROPOSTAS.find((x) => x.ID === semResp.ID).SITUACAO, 'ENVIADA');
  assert.equal(a.emails.filter((m) => /alfa\.exemplo/.test(String(m.to))).length, 0, 'nada vai ao cliente');
});

test('G2 não duplica em rodadas seguidas (mesma hora, hora seguinte e dia seguinte)', () => {
  const a = montar();
  proposta(a); proposta(a, { SITUACAO: 'ENVIADA', ENVIADA_EM: '2026-10-14T09:00' });
  rodada(a); rodada(a);
  a.mudar('2026-10-19T11:30:00-03:00'); rodada(a);
  a.mudar('2026-10-20T09:00:00-03:00'); rodada(a);
  assert.equal(daGestora(a).length, 2);
  assert.equal(registro(a).length, 2);
});

test('G3 fecha sozinha quando a proposta é enviada, com o motivo, e registra a resolução', () => {
  const a = montar();
  const p = proposta(a);
  rodada(a);
  const atv = daGestora(a)[0];
  a.mudar('2026-10-19T14:00:00-03:00');
  Object.assign(a.tabelas.COM_PROPOSTAS.find((x) => x.ID === p.ID), { SITUACAO: 'ENVIADA', ENVIADA_EM: '2026-10-19T13:50' });
  const r = rodada(a);
  assert.equal(r.resolvidas, 1);
  const depois = a.tabelas.ATV_ATIVIDADES.find((x) => x.ID === atv.ID);
  assert.equal(depois.SITUACAO, 'Concluída');
  assert.match(depois.OBS_CONCLUSAO, /Concluída sozinha pela gestora automática: a proposta agora está "Enviada ao cliente"/);
  const reg = registro(a)[0];
  assert.equal(reg.SITUACAO, 'RESOLVIDA');
  assert.ok(reg.ENCERRADA_EM && reg.MOTIVO_ENCERRAMENTO);
  assert.equal(daGestora(a).length, 1, 'nenhuma atividade nova (a enviada ainda não tem dias úteis sem resposta)');
});

test('G4 respeita o teto: 5 novas por vendedor por dia, as demais no dia seguinte', () => {
  const a = montar();
  for (let i = 0; i < 7; i++) proposta(a, { TOTAL: 1000 + i * 100 });
  const r = rodada(a);
  assert.equal(r.criadas, 5);
  assert.equal(r.aguardandoTeto, 2);
  rodada(a);
  assert.equal(daGestora(a).length, 5, 'mesmo dia: nada além do teto');
  // as maiores primeiro (prioridade igual, ordena pelo valor)
  const maiores = a.tabelas.COM_PROPOSTAS.slice().sort((x, y) => y.TOTAL - x.TOTAL).slice(0, 5).map((x) => x.ID).sort();
  assert.deepEqual(registro(a).map((x) => x.REF_ID).sort(), maiores);
  a.mudar('2026-10-20T09:00:00-03:00');
  assert.equal(rodada(a).criadas, 2);
  assert.equal(daGestora(a).length, 7);
});

test('G5 desligada não cria atividade nova; as abertas continuam e fecham sozinhas quando o item se resolve', () => {
  const a = montar();
  const p1 = proposta(a);
  rodada(a);
  assert.equal(daGestora(a).length, 1);
  ok(a.api('s_dora', 'gestoraAutomaticaSalvar', { ligada: false, motivo: 'Gestor comercial contratado assume o acompanhamento' }));
  proposta(a);
  a.mudar('2026-10-19T11:30:00-03:00');
  let r = rodada(a);
  assert.equal(r.ligada, false);
  assert.equal(r.criadas, 0);
  assert.equal(daGestora(a).length, 1, 'nenhuma atividade nova desligada');
  Object.assign(a.tabelas.COM_PROPOSTAS.find((x) => x.ID === p1.ID), { SITUACAO: 'CANCELADA' });
  a.mudar('2026-10-19T12:40:00-03:00');
  r = rodada(a);
  assert.equal(r.resolvidas, 1, 'a aberta continua sendo concluída sozinha');
  assert.equal(daGestora(a)[0].SITUACAO, 'Concluída');
  // a lista do dia continua igual (a proposta nova segue no Hoje)
  const hoje = ok(a.api('s_vera', 'hoje', {}));
  assert.ok(hoje.itens.some((i) => i.regra === 'PROPOSTA_PRONTA'));
});

test('G6 fora do expediente (noite e sábado) não cria nada', () => {
  const a = montar();
  proposta(a);
  a.mudar('2026-10-19T19:00:00-03:00');
  assert.match(String(rodada(a).fora), /fora do expediente/);
  a.mudar('2026-10-24T10:00:00-03:00');
  assert.match(String(rodada(a).fora), /fora do expediente/);
  assert.equal(daGestora(a).length, 0);
  assert.equal(registro(a).length, 0);
  // a rotina do Comercial também só chama a gestora no expediente
  a.mudar('2026-10-19T19:00:00-03:00');
  const rot = a.ctx.Comercial_rotina_(new a.ctx.Date(), true);
  assert.equal(rot.gestoraAutomatica, undefined);
  a.mudar('2026-10-19T10:00:00-03:00');
  const rot2 = a.ctx.Comercial_rotina_(new a.ctx.Date(), true);
  assert.ok(rot2.gestoraAutomatica && !rot2.gestoraAutomatica.erro, JSON.stringify(rot2.gestoraAutomatica));
  assert.equal(daGestora(a).length, 1);
});

test('G7 só a gestão comercial muda o seletor; grava quem, quando e o motivo; padrão ligada', () => {
  const a = montar();
  const g = ok(a.api('s_dora', 'hoje', {}));
  assert.equal(g.papel, 'GESTAO');
  assert.equal(g.automatica.ligada, true, 'padrão: ligada');
  assert.equal(g.automatica.podeMudar, true);
  const v = ok(a.api('s_vera', 'hoje', {}));
  assert.equal(v.automatica, undefined, 'o vendedor não vê o quadro da gestão');
  const neg = a.api('s_vera', 'gestoraAutomaticaSalvar', { ligada: false, motivo: 'Quero desligar as cobranças' });
  assert.equal(neg.ok, false);
  assert.match(neg.message, /esta ação é da gestão comercial/);
  const curto = a.api('s_gaspar', 'gestoraAutomaticaSalvar', { ligada: false, motivo: 'curto' });
  assert.equal(curto.ok, false);
  assert.match(curto.message, /escreva o motivo/);
  const r = ok(a.api('s_gaspar', 'gestoraAutomaticaSalvar', { ligada: false, motivo: 'Assumo o acompanhamento da equipe a partir de hoje' }));
  assert.match(r.message, /desligada\. Nenhuma atividade nova/);
  assert.equal(r.painel.ligada, false);
  const cfg = a.tabelas.COM_CONFIG.filter((c) => c.CHAVE === 'GESTORA_AUTO');
  assert.equal(cfg.length, 1);
  assert.equal(cfg[0].ATUALIZADO_POR_NOME, 'GASPAR GESTOR COMERCIAL TESTE');
  assert.ok(cfg[0].ATUALIZADO_EM && cfg[0].MOTIVO.length >= 10);
  assert.ok(a.tabelas.COM_HISTORICO.some((h) => h.TIPO === 'GESTORA_AUTO' && h.DE === 'Ligada' && h.PARA === 'Desligada'));
  const mesmo = ok(a.api('s_dora', 'gestoraAutomaticaSalvar', { ligada: false, motivo: 'Conferindo que já estava desligada' }));
  assert.match(mesmo.message, /já estava desligada/);
  ok(a.api('s_dora', 'gestoraAutomaticaSalvar', { ligada: true, motivo: 'Gestor de férias: a gestora volta a cobrar' }));
  const g2 = ok(a.api('s_dora', 'gestoraAutomatica', {}));
  assert.equal(g2.automatica.ligada, true);
  assert.equal(g2.automatica.historico.length, 2);
  assert.equal(g2.automatica.historico[0].por, 'DORA DIRETORA TESTE');
});

function iaQue(porque, acao) {
  return (prompt) => {
    const chaves = Array.from(prompt.matchAll(/"chave":"([^"]+)"/g)).map((m) => m[1]);
    return JSON.stringify({ resumo: 'Lista do dia.', itens: chaves.map((c) => ({ chave: c, porque, acao })) });
  };
}

test('G8 texto da IA recusado pelo verificador: a atividade usa o texto das regras e registra a recusa', () => {
  const a = montar({ ia: iaQue('Garantimos 10% de desconto para fechar ainda hoje.', 'Ofereça um desconto especial ao cliente.') });
  proposta(a);
  const r = rodada(a, {});
  assert.equal(r.criadas, 1);
  const atv = daGestora(a)[0];
  assert.doesNotMatch(atv.DESCRICAO, /Garantimos|desconto especial/);
  assert.match(atv.DESCRICAO, /O que fazer: (Toque em "Enviar ao cliente"|Gere o documento e envie ao cliente)/);
  assert.match(atv.DESCRICAO, /pelas regras da metodologia comercial/);
  const reg = registro(a)[0];
  assert.equal(reg.ORIGEM_TEXTO, 'REGRAS');
  assert.match(reg.VERIFICACAO, /recusado pelo verificador/);
  assert.ok(a.iaPrompts.length >= 1, 'a IA foi consultada');
});

test('G9 texto da IA aceito entra na atividade; IA fora do ar cai para as regras', () => {
  const a = montar({ ia: iaQue('A proposta passou na revisão e está parada sem ir ao cliente.', 'Envie hoje pelo Enviar documento e combine com o contato a data da decisão.') });
  proposta(a);
  rodada(a, {});
  const atv = daGestora(a)[0];
  assert.match(atv.DESCRICAO, /Por quê: A proposta passou na revisão e está parada sem ir ao cliente\./);
  assert.match(atv.DESCRICAO, /da gestora conferida contra os dados do sistema/);
  assert.equal(registro(a)[0].ORIGEM_TEXTO, 'IA');
  const b = montar({ ia: () => { throw new Error('serviço indisponível'); } });
  proposta(b);
  assert.equal(rodada(b, {}).criadas, 1);
  assert.equal(registro(b)[0].ORIGEM_TEXTO, 'REGRAS');
});

test('G10 item com atividade do próprio fluxo aberta: estratégia vira comentário, sem atividade duplicada; pedido sem passagem tem prazo de 4 horas', () => {
  const a = montar();
  const retorno = a.ctx.Com_criarAtividade_({ responsavelId: 'u_ven', titulo: 'Retorno sobre a proposta de teste', descricao: 'Retorno.', prazo: '2026-10-22T10:00', restrita: true });
  proposta(a, { SITUACAO: 'ENVIADA', ENVIADA_EM: '2026-10-14T09:00', RETORNO_ATIVIDADE_ID: retorno });
  proposta(a, { SITUACAO: 'APROVADA', RESPOSTA_EM: '2026-10-16T15:00', PEDIDO_SITUACAO: 'SEM_PASSAGEM' });
  const r = rodada(a);
  assert.equal(r.complementos, 1);
  assert.equal(r.criadas, 1);
  const coment = a.tabelas.ATV_HISTORICO.filter((h) => h.ATIVIDADE_ID === retorno && h.TIPO === 'COMENTARIO');
  assert.equal(coment.length, 1);
  assert.match(coment[0].TEXTO, /^Gestora automática \(Hoje\): Por quê: /);
  const pedido = daGestora(a).find((x) => /^Passar o pedido aprovado aos setores/.test(x.TITULO));
  assert.ok(pedido, daGestora(a).map((x) => x.TITULO).join(' | '));
  assert.equal(pedido.PRAZO, '2026-10-19T14:00');
  assert.equal(pedido.PRIORIDADE, 'Alta');
  rodada(a);
  assert.equal(a.tabelas.ATV_HISTORICO.filter((h) => h.ATIVIDADE_ID === retorno && h.TIPO === 'COMENTARIO').length, 1, 'comentário não se repete');
});

test('G11 concluída pela pessoa com o item pendente: volta a lembrar só depois de 2 dias úteis', () => {
  const a = montar();
  proposta(a);
  rodada(a);
  const atv = daGestora(a)[0];
  Object.assign(a.tabelas.ATV_ATIVIDADES.find((x) => x.ID === atv.ID), { SITUACAO: 'Concluída' });
  a.mudar('2026-10-19T15:00:00-03:00');
  rodada(a);
  assert.equal(registro(a)[0].SITUACAO, 'ENCERRADA_PELA_PESSOA');
  a.mudar('2026-10-20T10:00:00-03:00'); rodada(a);
  assert.equal(daGestora(a).length, 1, '1 dia útil: ainda espera');
  a.mudar('2026-10-21T10:00:00-03:00'); rodada(a);
  assert.equal(daGestora(a).length, 2, '2 dias úteis: lembra de novo');
});

test('G12 oportunidade sem orçamento não vira atividade (fica só na lista do dia); quebra de linha sem mistura', () => {
  const a = montar();
  Object.assign(a.tabelas.COM_OPORTUNIDADES.find((x) => x.ID === a.op.id), { ATIVIDADE_ID: '', PROXIMA_ACAO_EM: '', ULTIMO_CONTATO_EM: '2026-08-01T10:00' });
  rodada(a);
  assert.equal(daGestora(a).length, 0);
  proposta(a, { SITUACAO: 'RASCUNHO' });
  rodada(a);
  const l = daGestora(a);
  assert.equal(l.length, 1, l.map((x) => x.TITULO).join(' | '));
  assert.match(l[0].TITULO, /^(Marcar a próxima ação|Reaquecer a oportunidade parada): /);
  // cada arquivo mantém a quebra de linha original (CRLF em todas as linhas ou em nenhuma)
  for (const f of ['SGO_Comercial_GestoraAuto.js', 'SGO_Comercial_Painel.js', 'JS_Comercial.html', 'SGO_Ajuda_Comercial.js', 'SGO_Comercial_Config.js']) {
    const s = fs.readFileSync(path.join(PASTA, f), 'utf8'), crlf = (s.match(/\r\n/g) || []).length;
    assert.ok(crlf === 0 || crlf === (s.match(/\n/g) || []).length, f + ' com quebra de linha misturada');
  }
  const ajuda = fs.readFileSync(path.join(PASTA, 'SGO_Ajuda_Comercial.js'), 'utf8');
  assert.match(ajuda, /Gestora automática: ligada ou desligada/);
  assert.match(ajuda, /Recebi uma atividade criada pela gestora automática/);
});

test('G13 responsável inativado: a atividade não é concluída com motivo errado; troca de responsável passa o item à pessoa nova', () => {
  const a = montar();
  const p = proposta(a);
  rodada(a);
  a.tabelas.CAD_USUARIOS.find((u) => u.ID === 'u_ven').STATUS = 'INATIVO';
  a.mudar('2026-10-19T12:00:00-03:00');
  rodada(a);
  assert.equal(daGestora(a)[0].SITUACAO, 'A fazer');
  assert.equal(registro(a)[0].SITUACAO, 'ABERTA');
  assert.match(registro(a)[0].MOTIVO_ENCERRAMENTO, /Responsável inativo/);
  Object.assign(a.tabelas.COM_PROPOSTAS.find((x) => x.ID === p.ID), { RESPONSAVEL_ID: 'u_ven2', RESPONSAVEL_NOME: 'VITO VENDEDOR TESTE' });
  a.mudar('2026-10-19T13:00:00-03:00');
  rodada(a);
  assert.equal(daGestora(a)[0].SITUACAO, 'Concluída');
  assert.match(daGestora(a)[0].OBS_CONCLUSAO, /passou para outro responsável \(VITO VENDEDOR TESTE\)/);
  assert.equal(daGestora(a)[1].RESPONSAVEL_ID, 'u_ven2');
});
