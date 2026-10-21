// Assistente do ponto nativo do SGO+ (21/10/2026): horários (inclusive sexta e volta do almoço), um lembrete por marcação,
// nada fora do horário, só CLT, só a lista do piloto, Auvo e ausência não recebem, link de um toque (uso único, vence no
// dia, sem dado pessoal), pedido ao RH, 3º esquecimento vira sugestão no Conduta, resumo nunca pelo WhatsApp, e-mail de
// reserva, conjunto "só entrada e saída" e o expediente comum como fonte. Relógio sempre simulado. Só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, em, SEG } = require('./_ponto_ambiente.cjs');

const ok = (r) => { assert.equal(r.ok, true, r.message || r.mensagem); return r; };
const D = (dia, hhmm) => em(dia + 'T' + hhmm + ':00-03:00');
const nomes = (l) => l.map((w) => w.corpo.template.name);
/** Roda a cada 5 minutos de ini a fim (inclusive) no dia. */
function diaInteiro(a, dia, ini, fim) {
  for (let t = D(dia, ini || '00:00'); t <= D(dia, fim || '23:55'); t += 5 * 60000) a.rodar(t);
}

// ------------------------------------------------------------------ horários
test('horários: 07:55 entrada, 11:00 almoço, volta = saída confirmada + 1 h, 17:55 saída; sexta 17:25', () => {
  const a = ambiente();
  a.rodar(SEG('07:50'));
  assert.equal(a.msgs('u_ana').length, 0, 'antes de 07:55 nada');
  a.rodar(SEG('07:55'));
  let m = a.msgs('u_ana');
  assert.deepEqual(nomes(m), ['sgo_ponto_entrada']);
  assert.equal(m[0].corpo.template.components[0].parameters[0].text, 'Ana');
  assert.equal(m[0].corpo.template.components[0].parameters[1].text, '08:00');
  assert.equal(m[0].corpo.template.components[1].type, 'button');
  // almoço na hora
  a.rodar(SEG('10:55'));
  assert.equal(a.msgs('u_ana').length, 1);
  a.rodar(SEG('11:00'));
  m = a.msgs('u_ana');
  assert.equal(m[1].corpo.template.name, 'sgo_ponto_almoco');
  // Ana confirma a saída para o almoço às 11:10 pela página: a volta é 12:10
  a.mudar(SEG('11:10'));
  ok(a.ctx.Ponto_paginaResponderExec_(a.tokenDe(m[1]), 'CONFIRMAR', {}, new a.DataFalsa()));
  a.rodar(SEG('12:00'));
  assert.equal(a.msgs('u_ana').filter((w) => w.corpo.template.name === 'sgo_ponto_retorno').length, 0, 'Ana não recebe às 12:00');
  const beto12 = a.msgs('u_beto').filter((w) => w.corpo.template.name === 'sgo_ponto_retorno');
  assert.equal(beto12.length, 1, 'Beto não confirmou o almoço: volta conta das 11:00 (12:00)');
  assert.equal(beto12[0].corpo.template.components[0].parameters[1].text, '12:00');
  a.rodar(SEG('12:10'));
  const r = a.msgs('u_ana').filter((w) => w.corpo.template.name === 'sgo_ponto_retorno');
  assert.equal(r.length, 1);
  assert.equal(r[0].corpo.template.components[0].parameters[1].text, '12:10');
  a.rodar(SEG('17:50'));
  assert.equal(a.msgs('u_ana').filter((w) => w.corpo.template.name === 'sgo_ponto_saida').length, 0);
  a.rodar(SEG('17:55'));
  const s = a.msgs('u_ana').filter((w) => w.corpo.template.name === 'sgo_ponto_saida');
  assert.equal(s.length, 1);
  assert.equal(s[0].corpo.template.components[0].parameters[1].text, '18:00');
  // sexta-feira: saída 17:30, lembrete 17:25; às 17:55 nada mais
  const b = ambiente();
  b.rodar(D('2026-10-23', '17:25'));
  const sx = b.msgs('u_ana');
  assert.deepEqual(nomes(sx), ['sgo_ponto_saida']);
  assert.equal(sx[0].corpo.template.components[0].parameters[1].text, '17:30');
  b.rodar(D('2026-10-23', '17:55'));
  assert.equal(b.msgs('u_ana').length, 1);
});

test('jornada por pessoa e expediente comum como fonte: entrada vazia = início do expediente comum; feriado extra do expediente não recebe', () => {
  const a = ambiente({ props: { SGO_EXPEDIENTE: JSON.stringify({ ini: '07:30', fim: '17:30', dias: [1, 2, 3, 4, 5], feriados: '20/10/2026' }) }, cfg: { jornada: { entrada: '', almoco: '11:00', retorno_min: 60, saida: '18:00', saida_sexta: '17:30' } } });
  a.rodar(SEG('07:25'));
  assert.deepEqual(nomes(a.msgs('u_ana')), ['sgo_ponto_entrada']);
  assert.equal(a.msgs('u_ana')[0].corpo.template.components[0].parameters[1].text, '07:30');
  // jornada própria do Beto: entrada 09:00, saída 17:00
  ok(a.api('s_rita', 'salvarPessoa', { usuarioId: 'u_beto', participa: true, entrada: '09:00', saida: '17:00', almoco: '', retorno_min: '', saida_sexta: '' }));
  a.rodar(SEG('08:55'));
  assert.deepEqual(nomes(a.msgs('u_beto')), ['sgo_ponto_entrada']);
  a.rodar(SEG('16:55'));
  assert.equal(a.msgs('u_beto').filter((w) => w.corpo.template.name === 'sgo_ponto_saida')[0].corpo.template.components[0].parameters[1].text, '17:00');
  // 20/10 é feriado extra no expediente comum: nada
  const antes = a.whats.length;
  diaInteiro(a, '2026-10-20');
  assert.equal(a.whats.length, antes, 'feriado do expediente comum: nenhum lembrete');
  // jornada inválida é recusada com o caminho de volta
  const ruim = a.api('s_rita', 'salvarPessoa', { usuarioId: 'u_beto', entrada: '12:00', saida: '11:00' });
  assert.equal(ruim.ok, false);
  assert.match(ruim.message, /entrada precisa ser antes da saída/);
  assert.match(a.api('s_dora', 'salvarConfig', { jornada: { entrada: '04:00', almoco: '11:00', retorno_min: 60, saida: '18:00' } }).message, /entre 05:00 e 22:00/);
});

// ------------------------------------------------------------------ sem insistência e nada fora do horário
test('um lembrete por marcação (no máximo 4 por dia), nunca um segundo, nada antes da entrada menos 5 min ou depois da saída', () => {
  const a = ambiente();
  diaInteiro(a, '2026-10-19');
  for (const uid of ['u_ana', 'u_beto', 'u_gt', 'u_rh', 'u_dir', 'u_fabio']) {
    const m = a.msgs(uid);
    assert.deepEqual(nomes(m), ['sgo_ponto_entrada', 'sgo_ponto_almoco', 'sgo_ponto_retorno', 'sgo_ponto_saida'], uid + ': as 4 marcações, uma vez cada');
    m.forEach((w) => {
      assert.ok(w.quando >= SEG('07:55') && w.quando <= SEG('18:00'), uid + ': mensagem às ' + new Date(w.quando).toISOString() + ' fora do horário');
      assert.ok(/^sgo_ponto_/.test(w.corpo.template.name), 'só modelos do ponto');
    });
  }
  // fim de semana: nada
  const antes = a.whats.length;
  diaInteiro(a, '2026-10-24'); diaInteiro(a, '2026-10-25');
  assert.equal(a.whats.length, antes, 'sábado e domingo: nenhum lembrete');
  // feriado nacional (02/11): nada
  diaInteiro(a, '2026-11-02');
  assert.equal(a.whats.length, antes, 'feriado: nenhum lembrete');
  // nenhuma linha "segundo lembrete" existe
  const chaves = a.tabelas.PONTO_MARCACOES.map((r) => r.USUARIO_ID + '|' + r.DIA + '|' + r.MARCACAO);
  assert.equal(new Set(chaves).size, chaves.length, 'uma linha por pessoa, dia e marcação');
});

test('servidor parado: lembrete atrasado não sai (janela de 20 min); a volta do almoço depois da saída da pessoa não sai', () => {
  const a = ambiente();
  a.rodar(SEG('08:20'));
  assert.equal(a.msgs('u_ana').length, 0, '25 min depois do lembrete da entrada: não sai atrasado');
  // pessoa que sai às 12:30: a volta (12:00 + 60 = 13:00 com almoço às 12:00) cairia depois da saída
  ok(a.api('s_rita', 'salvarPessoa', { usuarioId: 'u_beto', entrada: '08:00', almoco: '', saida: '12:30', saida_sexta: '12:30', sem_almoco: true }));
  diaInteiro(a, '2026-10-19', '08:25');
  assert.deepEqual(nomes(a.msgs('u_beto')), ['sgo_ponto_saida'], 'sem intervalo registrado: só a saída (a entrada passou)');
});

test('conjunto "só entrada e saída" (opção do piloto): 2 lembretes por dia', () => {
  const a = ambiente({ cfg: { conjunto: 'ENTRADA_SAIDA' } });
  diaInteiro(a, '2026-10-19');
  assert.deepEqual(nomes(a.msgs('u_ana')), ['sgo_ponto_entrada', 'sgo_ponto_saida']);
});

test('desligado (padrão): nada sai e nada é lido', () => {
  const a = ambiente({ ligado: false });
  assert.equal(a.ctx.Ponto_cfg_().ligado, false, 'nasce desligado');
  diaInteiro(a, '2026-10-19', '07:00', '19:00');
  assert.equal(a.whats.length, 0);
  assert.equal((a.tabelas.PONTO_MARCACOES || []).length, 0);
  // o colaborador não vê o menu com o assistente desligado; o RH vê
  assert.equal(ok(a.api('s_ana', 'acesso')).verMenu, false);
  assert.equal(ok(a.api('s_rita', 'acesso')).verMenu, true);
  // só Administrador e Diretoria ligam
  assert.match(a.api('s_rita', 'salvarConfig', { ligado: true }).message, /Administrador e da Diretoria/);
  const r = ok(a.api('s_dora', 'salvarConfig', { ligado: true }));
  assert.equal(r.config.ligado, true);
  assert.ok(a.gatilhos.includes('Ponto_rotina'), 'rotina de 5 min instalada ao ligar');
});

// ------------------------------------------------------------------ quem recebe
test('PJ, vínculo vazio e fora do piloto não recebem nada; Auvo em atendimento e ausência não são lembrados', () => {
  const a = ambiente();
  a.tabelas.AUVO_TAREFAS.push({ ID: 't1', AUVO_TASK_ID: '9001', TECNICO_ID_SGO: 'u_beto', CHECKIN_EM: '2026-10-19T17:20:00-03:00', CHECKOUT_EM: '', FINALIZADA: 'NAO', CLIENTE_NOME_AUVO: 'Cliente de teste' });
  a.tabelas.conduta_ausencia.push({ ID: 'au1', COLABORADOR_ID: 'u_fabio', DATA_INICIO: '2026-10-19', DATA_FIM: '2026-10-23', TIPO: 'FERIAS' });
  ok(a.api('s_rita', 'salvarDispensa', { usuarioId: 'u_gt', de: '2026-10-19', ate: '2026-10-19', motivo: 'CONSULTA' }));
  diaInteiro(a, '2026-10-19');
  assert.equal(a.msgs('u_caio').length, 0, 'PJ não recebe');
  assert.equal(a.msgs('u_duda').length, 0, 'vínculo vazio não recebe');
  assert.equal(a.msgs('u_eva').length, 0, 'fora da lista do piloto não recebe');
  assert.equal(a.emails.filter((e) => /caio|duda|eva/.test(e.to)).length, 0, 'nem por e-mail');
  assert.ok(!a.tabelas.PONTO_MARCACOES.some((r) => ['u_caio', 'u_duda', 'u_eva'].includes(r.USUARIO_ID)));
  // Beto em atendimento às 17:55 (check-in sem check-out): a saída não é lembrada
  assert.deepEqual(nomes(a.msgs('u_beto')), ['sgo_ponto_entrada', 'sgo_ponto_almoco', 'sgo_ponto_retorno']);
  assert.equal(a.marc('u_beto', '2026-10-19', 'SAIDA').SITUACAO, 'DISPENSADO');
  assert.match(a.marc('u_beto', '2026-10-19', 'SAIDA').OBS, /em atendimento no Auvo/);
  assert.equal(a.msgs('u_fabio').length, 0, 'férias do Programa de conduta');
  assert.equal(a.msgs('u_gt').length, 0, 'consulta lançada pelo RH');
  // a tela do RH explica por que cada um não recebe
  const p = ok(a.api('s_rita', 'pessoas'));
  const por = (id) => p.pessoas.find((x) => x.id === id);
  assert.match(por('u_caio').foraTexto, /PJ/);
  assert.match(por('u_duda').foraTexto, /vínculo de trabalho não informado/);
  assert.match(por('u_eva').foraTexto, /piloto do WhatsApp/);
  // o notificador também barra o PJ, mesmo se alguém tentar mandar mensagem do ponto direto
  const n = a.ctx.SGO_notificar_({ usuarios: ['u_caio'], canais: ['whatsapp', 'email'], categoria: 'PONTO', titulo: 'x', texto: 'y' });
  assert.equal(n.ok, 0);
});

// ------------------------------------------------------------------ link de um toque
test('link: sem dado pessoal no endereço, mostra só o primeiro nome, uso único, vence no dia, adulterado e pré-visualização', () => {
  const a = ambiente();
  a.rodar(SEG('07:55'));
  const tk = a.tokenDe(a.msgs('u_ana')[0]);
  assert.match(tk, /^v1\.20261019\.[0-9a-f]{20}\.[0-9a-f]{32}$/);
  assert.ok(!/u_ana|ana/i.test(tk.replace(/^v1\./, '')), 'o token não leva o id da pessoa');
  // botão do modelo aponta para o SGO+
  assert.equal(a.ctx.NTF_MODELOS_META.sgo_ponto_entrada.botao.url, 'https://sgo.metrolabs.com.br/?ponto={{1}}');
  a.mudar(SEG('08:02'));
  const ab = ok(a.ctx.Ponto_paginaAbrirExec_(tk, new a.DataFalsa()));
  assert.equal(ab.primeiroNome, 'Ana');
  const txt = JSON.stringify(ab);
  assert.ok(!/ANA TECNICA|62990000010|@exemplo|u_ana|TECNICA/.test(txt), 'a página não expõe nome completo, telefone, e-mail, id ou área: ' + txt);
  // confirma; o segundo toque não muda nada (uso único) e "Esqueci" depois também não
  const c1 = ok(a.ctx.Ponto_paginaResponderExec_(tk, 'CONFIRMAR', {}, new a.DataFalsa()));
  assert.equal(c1.gravado, true);
  const c2 = ok(a.ctx.Ponto_paginaResponderExec_(tk, 'CONFIRMAR', {}, new a.DataFalsa()));
  assert.equal(c2.gravado, false); assert.equal(c2.usado, true);
  const c3 = ok(a.ctx.Ponto_paginaResponderExec_(tk, 'ESQUECI', { horario: '08:00', justificativa: 'tocou errado' }, new a.DataFalsa()));
  assert.equal(c3.usado, true);
  assert.equal((a.tabelas.PONTO_AJUSTES || []).length, 0, 'link usado não abre pedido');
  assert.equal(a.marc('u_ana', '2026-10-19', 'ENTRADA').SITUACAO, 'CONFIRMADO');
  // vence no fim do dia
  a.mudar(D('2026-10-20', '08:00'));
  const v = a.ctx.Ponto_paginaAbrirExec_(tk, new a.DataFalsa());
  assert.equal(v.ok, false); assert.equal(v.motivo, 'VENCIDO');
  assert.match(v.mensagem, /Meus lembretes > Pedir ajuste ao RH/);
  // adulterado
  const adult = tk.slice(0, -1) + (tk.slice(-1) === '0' ? '1' : '0');
  assert.equal(a.ctx.Ponto_paginaAbrirExec_(adult, new a.DataFalsa()).motivo, 'INVALIDO');
  assert.equal(a.ctx.Ponto_paginaAbrirExec_('v1.20261020.' + tk.split('.')[2] + '.' + tk.split('.')[3], new a.DataFalsa()).motivo, 'INVALIDO', 'trocar o dia invalida a assinatura');
  // pré-visualização: abre e não grava
  const pv = ok(a.api('s_rita', 'previa', { marcacao: 'SAIDA' }));
  const tkp = pv.link.split('?ponto=')[1];
  const antes = JSON.stringify(a.tabelas.PONTO_MARCACOES);
  const rp = ok(a.ctx.Ponto_paginaResponderExec_(tkp, 'CONFIRMAR', {}, new a.DataFalsa()));
  assert.equal(rp.gravado, false); assert.equal(rp.previa, true);
  assert.equal(JSON.stringify(a.tabelas.PONTO_MARCACOES), antes);
  // a página do doGet
  a.ctx.doGet = undefined;
  const pg = a.ctx.Ponto_pagina_(tk + '<script>');
  assert.equal(pg._nome, 'PontoPagina');
  assert.ok(!/[<>]/.test(pg._token), 'token limpo antes de ir para a página');
  const html = fs.readFileSync(path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db/PontoPagina.html'), 'utf8');
  assert.match(html, /Ponto_paginaAbrir/); assert.match(html, /Ponto_paginaResponder/);
  assert.ok(!/fonts\.googleapis|<img/i.test(html), 'página leve, sem recurso externo');
});

// ------------------------------------------------------------------ pedido ao RH
test('"Esqueci de bater" vira pedido ao RH (atividade, pendência, aviso com e-mail no expediente); RH trata; quem pediu não trata', () => {
  const a = ambiente();
  a.rodar(SEG('07:55'));
  const tk = a.tokenDe(a.msgs('u_ana')[0]);
  a.tabelas.AUVO_TAREFAS.push({ ID: 't2', AUVO_TASK_ID: '9002', TECNICO_ID_SGO: 'u_ana', CHECKIN_EM: '2026-10-19T08:40:00-03:00', CHECKOUT_EM: '2026-10-19T10:05:00-03:00', FINALIZADA: 'SIM', CLIENTE_NOME_AUVO: 'Cliente de teste' });
  a.mudar(SEG('08:30'));
  assert.match(a.ctx.Ponto_paginaResponderExec_(tk, 'ESQUECI', { horario: '09:30', justificativa: 'relógio com fila' }, new a.DataFalsa()).mensagem, /ainda não chegou/);
  assert.match(a.ctx.Ponto_paginaResponderExec_(tk, 'ESQUECI', { horario: '08:05', justificativa: 'ok' }, new a.DataFalsa()).mensagem, /frase curta/);
  const r = ok(a.ctx.Ponto_paginaResponderExec_(tk, 'ESQUECI', { horario: '08:05', justificativa: 'O relógio estava com fila na entrada.' }, new a.DataFalsa()));
  assert.equal(r.gravado, true);
  const aj = a.tabelas.PONTO_AJUSTES[0];
  assert.equal(aj.SITUACAO, 'PENDENTE'); assert.equal(aj.HORARIO_INFORMADO, '08:05'); assert.equal(aj.DIA, '2026-10-19'); assert.equal(aj.MARCACAO, 'ENTRADA');
  assert.match(aj.EVIDENCIA, /check-in 08:40, check-out 10:05/);
  assert.ok(!/Cliente de teste/.test(aj.EVIDENCIA), 'evidência só com horários');
  assert.equal(a.marc('u_ana', '2026-10-19', 'ENTRADA').SITUACAO, 'ESQUECI');
  // atividade do RH, restrita e sem dado além do necessário
  const atv = a.tabelas.ATV_ATIVIDADES.find((x) => x.MODULO === 'ponto');
  assert.ok(atv, 'atividade do RH criada'); assert.equal(atv.RESPONSAVEL_ID, 'u_rh'); assert.equal(atv.RESTRITA, 'SIM');
  assert.ok(!/fila/.test(atv.DESCRICAO), 'a justificativa fica no pedido, não na atividade');
  // aviso ao RH no sistema com e-mail guardado; pendência no Início do RH; técnico não vê
  assert.ok(a.tabelas.PONTO_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_rh' && v.TIPO === 'AJUSTE_NOVO' && v.EMAIL_SITUACAO === 'PENDENTE'));
  const pendRh = a.ctx.SGO_Pendencias_listar('s_rita', { semCache: true }).itens.filter((i) => i.tipo === 'ponto_ajuste');
  assert.equal(pendRh.length, 1);
  // 21/10/2026 (auditoria de integração): o aviso do pedido novo não vira um segundo item no Início do RH
  assert.equal(a.ctx.SGO_Pendencias_listar('s_rita', { semCache: true }).itens.filter((i) => i.tipo === 'ponto_aviso' && /Pedido de ajuste/.test(i.titulo)).length, 0, 'um item por pedido');
  assert.equal(a.ctx.SGO_Pendencias_listar('s_beto', { semCache: true }).itens.filter((i) => i.tipo === 'ponto_ajuste').length, 0);
  // e-mail ao RH sai na rodada dentro do expediente, nunca pelo WhatsApp
  const whatsRh = a.msgs('u_rh').length;
  a.rodar(SEG('09:00'));
  assert.ok(a.emails.some((e) => e.to === 'rita@exemplo.test' && /Pedido de ajuste do ponto/.test(e.subject)));
  assert.equal(a.msgs('u_rh').filter((w) => !/^sgo_ponto_/.test(w.corpo.template.name)).length, 0, 'nada além dos lembretes do próprio RH');
  assert.equal(a.msgs('u_rh').length, whatsRh);
  // permissões: técnico não trata; gestor vê a equipe sem a justificativa
  assert.match(a.api('s_beto', 'tratar', { id: aj.ID, decisao: 'LANCADO' }).message, /é do RH/);
  const g = ok(a.api('s_gil', 'pedidos', { situacao: '' }));
  assert.equal(g.pedidos.length, 1); assert.equal(g.pedidos[0].justificativa, ''); assert.equal(g.podeTratar, false);
  assert.equal(ok(a.api('s_fabio', 'pedidos', { situacao: '' })).pedidos.length, 0, 'colaborador de outra área não vê');
  // não lançado exige motivo; lançado avisa a pessoa e conclui a atividade
  assert.match(a.api('s_rita', 'tratar', { id: aj.ID, decisao: 'RECUSADO', observacao: '' }).message, /escreva o motivo/);
  ok(a.api('s_rita', 'tratar', { id: aj.ID, decisao: 'LANCADO', observacao: 'Lançado 08:05' }));
  assert.equal(a.tabelas.PONTO_AJUSTES[0].SITUACAO, 'LANCADO');
  assert.ok(a.tabelas.PONTO_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_ana' && v.TIPO === 'AJUSTE_TRATADO'));
  assert.equal(a.tabelas.ATV_ATIVIDADES.find((x) => x.MODULO === 'ponto').SITUACAO, 'Concluída');
  assert.match(a.api('s_rita', 'tratar', { id: aj.ID, decisao: 'LANCADO' }).message, /já foi tratado/);
  // o próprio RH pede ajuste pela tela e não trata o próprio pedido
  a.mudar(SEG('12:00'));
  ok(a.api('s_rita', 'pedirAjuste', { dia: '2026-10-19', marcacao: 'ALMOCO', horario: '11:02', justificativa: 'Esqueci de bater na saída.' }));
  const meu = a.tabelas.PONTO_AJUSTES.find((x) => x.USUARIO_ID === 'u_rh');
  assert.match(a.api('s_rita', 'tratar', { id: meu.ID, decisao: 'LANCADO' }).message, /o pedido é seu/);
  ok(a.api('s_dora', 'tratar', { id: meu.ID, decisao: 'LANCADO' }));
  // pedido pela tela para dia que já passou (até 31 dias) e repetido é recusado
  a.mudar(D('2026-10-21', '09:00'));
  ok(a.api('s_beto', 'pedirAjuste', { dia: '2026-10-19', marcacao: 'SAIDA', horario: '18:01', justificativa: 'Saí correndo e esqueci.' }));
  assert.match(a.api('s_beto', 'pedirAjuste', { dia: '2026-10-19', marcacao: 'SAIDA', horario: '18:01', justificativa: 'Saí correndo e esqueci.' }).message, /Já existe um pedido pendente/);
  assert.match(a.api('s_beto', 'pedirAjuste', { dia: '2026-08-01', marcacao: 'SAIDA', horario: '18:01', justificativa: 'muito antigo mesmo' }).message, /31 dias/);
});

test('pedido parado há 2 dias úteis entra na Caixa de decisões (área RH; sem gestor da área, a Diretoria)', () => {
  const a = ambiente();
  a.mudar(SEG('09:00'));
  ok(a.api('s_ana', 'pedirAjuste', { dia: '2026-10-19', marcacao: 'ENTRADA', horario: '08:01', justificativa: 'Relógio desligado na entrada.' }));
  a.mudar(D('2026-10-21', '09:00'));
  const interno = a.ctx.Pend_calcular_(a.ctx.Pend_contextoInterno_()).itens.filter((i) => i.tipo === 'ponto_ajuste_parado');
  assert.equal(interno.length, 1);
  assert.equal(a.ctx.Ges_entra_(interno[0]), true, 'tipo conhecido pela Caixa de decisões');
  const rota = a.ctx.Ges_rotear_(interno[0], a.ctx.Ges_cfg_(), a.ctx.Ges_usuarios_());
  assert.equal(rota.area, 'RH'); assert.deepEqual(Array.from(rota.ids), ['u_dir']);
  assert.equal(a.ctx.SGO_Pendencias_listar('s_gil', { semCache: true }).itens.filter((i) => i.tipo === 'ponto_ajuste_parado').length, 0, 'gestor de outra área não vê o nome no Início');
});

// ------------------------------------------------------------------ 3º esquecimento
test('3º esquecimento no mês: resumo ao RH e à gestão (sistema e e-mail, nunca WhatsApp) e UMA sugestão no Programa de conduta', () => {
  const a = ambiente();
  // segunda: Ana não confirma nada; terça: pede ajuste da entrada
  diaInteiro(a, '2026-10-19');
  a.rodar(D('2026-10-20', '07:55'));
  const tk = a.tokenDe(a.msgs('u_ana').filter((w) => w.quando === D('2026-10-20', '07:55'))[0]);
  a.mudar(D('2026-10-20', '08:10'));
  ok(a.ctx.Ponto_paginaResponderExec_(tk, 'ESQUECI', { horario: '08:00', justificativa: 'Esqueci de bater ao chegar.' }, new a.DataFalsa()));
  const whatsAntes = a.whats.length;
  a.rodar(D('2026-10-20', '08:15'));
  // segunda virou "não confirmado" (4) + 1 esqueci = 5 no mês
  assert.equal(a.marc('u_ana', '2026-10-19', 'SAIDA').SITUACAO, 'NAO_CONFIRMADO');
  let res = a.tabelas.PONTO_RESUMOS.filter((r) => r.USUARIO_ID === 'u_ana');
  assert.equal(res.length, 1, 'no máximo um resumo por pessoa por dia (o 5º esquecimento de hoje fica para o resumo de amanhã)');
  assert.match(res[0].TEXTO, /^4 no mês: 4 não confirmados \(19\/10 entrada, 19\/10 almoço, 19\/10 volta do almoço, 19\/10 saída\)/);
  assert.ok(a.tabelas.PONTO_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_rh' && v.TIPO === 'RESUMO'), 'RH no sistema');
  assert.ok(a.tabelas.PONTO_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_gt' && v.TIPO === 'RESUMO'), 'gestor da área no sistema');
  assert.ok(!a.tabelas.PONTO_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_ana' && v.TIPO === 'RESUMO'), 'a própria pessoa não recebe o resumo');
  assert.equal(a.whats.slice(whatsAntes).filter((w) => !/^sgo_ponto_(entrada|almoco|retorno|saida)$/.test(w.corpo.template.name)).length, 0, 'resumo nunca pelo WhatsApp');
  assert.ok(a.emails.some((e) => e.to === 'rita@exemplo.test' && /esquecimentos/.test(e.subject + e.body)), 'e-mail ao RH no expediente');
  // sugestão informativa no Programa de conduta, uma por mês
  let sug = a.tabelas.qual_sugestao.filter((s) => s.COLABORADOR_ID === 'u_ana');
  assert.equal(sug.length, 1);
  assert.equal(sug[0].ORIGEM_MODULO, 'PONTO'); assert.equal(sug[0].INFORMATIVA, 'SIM'); assert.equal(sug[0].STATUS, 'PENDENTE'); assert.equal(sug[0].TIPO_CODIGO, '');
  assert.match(sug[0].DETALHE, /nenhuma medida é automática/);
  assert.ok(!(a.tabelas.conduta_ocorrencia || []).length, 'nunca ocorrência automática');
  // quarta de manhã: novo total (5) -> novo resumo, mas a sugestão do mês continua uma só
  a.rodar(D('2026-10-21', '07:00'));
  res = a.tabelas.PONTO_RESUMOS.filter((r) => r.USUARIO_ID === 'u_ana');
  assert.equal(res.length, 2);
  assert.match(res[1].TEXTO, /^5 no mês: 1 "Esqueci de bater" \(20\/10 entrada\) e 4 não confirmados/);
  assert.equal(a.whats.slice(whatsAntes).filter((w) => !/^sgo_ponto_(entrada|almoco|retorno|saida)$/.test(w.corpo.template.name)).length, 0);
  sug = a.tabelas.qual_sugestao.filter((s) => s.COLABORADOR_ID === 'u_ana');
  assert.equal(sug.length, 1, 'uma sugestão por pessoa por mês');
  // PJ não conta esquecimento
  assert.ok(!a.tabelas.PONTO_RESUMOS.some((r) => r.USUARIO_ID === 'u_caio'));
});

// ------------------------------------------------------------------ e-mail como reserva
test('sem o modelo aprovado: o lembrete não troca pelo aviso geral e vai por e-mail; sem e-mail de reserva, fica "não saiu" e não conta', () => {
  const a = ambiente({ props: { NTF_MODELOS_SITUACAO: JSON.stringify({ em: 'x', modelos: { sgo_ponto_entrada: 'PENDING', sgo_aviso_geral: 'APPROVED' } }) } });
  a.rodar(SEG('07:55'));
  assert.equal(a.msgs('u_ana').length, 0, 'não usa o sgo_aviso_geral no lugar');
  const e = a.emails.filter((x) => x.to === 'ana@exemplo.test');
  assert.equal(e.length, 1);
  assert.match(e[0].body, /Confirmar: https:\/\/sgo\.metrolabs\.com\.br\/\?ponto=v1\.20261019\./);
  assert.match(e[0].htmlBody, />Confirmar</);
  assert.equal(a.marc('u_ana', '2026-10-19', 'ENTRADA').CANAL, 'EMAIL');
  const b = ambiente({ cfg: { emailReserva: false }, props: { NTF_MODELOS_SITUACAO: JSON.stringify({ em: 'x', modelos: { sgo_ponto_entrada: 'PENDING' } }) } });
  b.rodar(SEG('07:55'));
  assert.equal(b.emails.length, 0);
  assert.equal(b.marc('u_ana', '2026-10-19', 'ENTRADA').SITUACAO, 'NAO_ENVIADO');
  b.rodar(D('2026-10-20', '07:00'));
  assert.equal(b.marc('u_ana', '2026-10-19', 'ENTRADA').SITUACAO, 'NAO_ENVIADO', 'não vira "não confirmado"');
});

// ------------------------------------------------------------------ modelos, telas, A4, ajuda
test('modelos sgo_ponto_*: regras da Meta, botão de link no cadastro e no envio, sem emoji; texto pronto para o dono', () => {
  const a = ambiente();
  for (const n of ['sgo_ponto_entrada', 'sgo_ponto_almoco', 'sgo_ponto_retorno', 'sgo_ponto_saida']) {
    const def = a.ctx.NTF_MODELOS_META[n];
    assert.deepEqual(Array.from(a.ctx.Notificar_validarModeloMeta_(n, def)), [], n);
    assert.match(def.texto, /O registro oficial é o do relógio ou do aplicativo de ponto/);
    assert.match(def.texto, /Metrolabs — SGO\+$/);
    const cad = a.ctx.Notificar_corpoCadastroMeta_(n);
    assert.equal(cad.components[1].type, 'BUTTONS'); assert.equal(cad.components[1].buttons[0].type, 'URL');
    assert.equal(cad.components[1].buttons[0].url, 'https://sgo.metrolabs.com.br/?ponto={{1}}');
  }
  // os modelos antigos seguem sem botão
  assert.equal(a.ctx.Notificar_corpoCadastroMeta_('sgo_aviso_geral').components.length, 1);
  assert.throws(() => a.ctx.Notificar_montarPedidoMeta_('1', '5562990000010', 'sgo_ponto_entrada', ['Ana', '08:00'], ''), /botão de link/);
  // a documentação dos modelos do servidor traz os mesmos textos
  const doc = path.join(__dirname, '../../sgo_servidor/docs/MODELOS_WHATSAPP_META.md');
  if (fs.existsSync(doc)) { const t = fs.readFileSync(doc, 'utf8'); ['sgo_ponto_entrada', 'sgo_ponto_almoco', 'sgo_ponto_retorno', 'sgo_ponto_saida'].forEach((n) => assert.ok(t.indexOf('Lembrete do ponto') > 0 && t.indexOf(n) > 0, n + ' no MODELOS_WHATSAPP_META.md')); }
});

test('telas: painel do dia e do mês por papel, colaborador vê só os próprios, resumo A4 sem justificativa nem contato, ajuda e menu', () => {
  const a = ambiente();
  diaInteiro(a, '2026-10-19', '07:00', '12:30');
  ok(a.api('s_ana', 'pedirAjuste', { dia: '2026-10-19', marcacao: 'ALMOCO', horario: '11:03', justificativa: 'Motivo sigiloso de teste.' }));
  const dRh = ok(a.api('s_rita', 'dia', { dia: '2026-10-19' }));
  assert.ok(dRh.painel.linhas.length >= 6);
  const dGt = ok(a.api('s_gil', 'dia', { dia: '2026-10-19' }));
  assert.ok(dGt.painel.linhas.every((l) => ['ANA TECNICA TESTE', 'BETO TECNICO TESTE', 'GIL GESTOR TECNICO TESTE', 'CAIO PJ TESTE', 'DUDA SEM VINCULO TESTE', 'EVA FORA DO PILOTO TESTE'].includes(l.pessoa)), 'gestor vê só a área dele');
  assert.match(a.api('s_ana', 'dia', {}).message, /Meus lembretes/);
  const meus = ok(a.api('s_ana', 'meus', {}));
  assert.ok(meus.marcacoes.every((x) => x.id) && meus.participa);
  assert.equal(meus.pedidos.length, 1);
  const mes = ok(a.api('s_rita', 'mes', { mes: '2026-10' }));
  assert.ok(mes.painel.pessoas.find((p) => p.pessoa === 'ANA TECNICA TESTE').esqueci === 1);
  const a4 = ok(a.api('s_rita', 'resumoA4', { mes: '2026-10' }));
  assert.match(a4.html, /Resumo mensal do assistente do ponto/);
  assert.ok(!/Motivo sigiloso|62990000|@exemplo/.test(a4.html), 'A4 sem justificativa, telefone ou e-mail');
  assert.match(a.api('s_gil', 'resumoA4', { mes: '2026-10' }).message, /RH/);
  // avisos: Ciente em todos marca só os da própria pessoa
  const antesAna = a.tabelas.PONTO_AVISOS.filter((v) => v.DESTINATARIO_ID === 'u_ana' && !v.LIDO_EM).length;
  assert.match(ok(a.api('s_rita', 'cienteTodos')).message, /ciente/);
  assert.equal(a.tabelas.PONTO_AVISOS.filter((v) => v.DESTINATARIO_ID === 'u_rh' && !v.LIDO_EM).length, 0);
  assert.equal(a.tabelas.PONTO_AVISOS.filter((v) => v.DESTINATARIO_ID === 'u_ana' && !v.LIDO_EM).length, antesAna);
  // ajuda da tela e regras de acesso
  const ajuda = a.ctx.SGO_Ajuda_todas_().telas.ponto;
  assert.ok(ajuda && ajuda.passos.length >= 5 && ajuda.quemPode.length >= 4);
  const tudo = JSON.stringify(ajuda) + fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_PONTO.md'), 'utf8');
  assert.ok(!/\p{Extended_Pictographic}/u.test(tudo), 'sem emoji');
  assert.ok(!/\bbur+o\b/i.test(tudo));
  const base = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
  const idx = fs.readFileSync(path.join(base, 'Index.html'), 'utf8'), core = fs.readFileSync(path.join(base, 'JS_Core.html'), 'utf8');
  assert.match(idx, /data-mod="ponto"[^>]*id="menu-btn-ponto"[^>]*style="display:none;"/);
  assert.match(idx, /include\('JS_Ponto'\)/);
  assert.equal((core.match(/Ponto_iniciar_\(\)/g) || []).length, 2, 'gancho nos dois caminhos do login');
  assert.match(core, /mod === "ponto" && typeof Ponto_render_ === "function"/);
  assert.match(core, /var SGO_TELAS_RH = \[[^\]]*"ponto"/);
  assert.match(fs.readFileSync(path.join(base, 'SGO_Main.js'), 'utf8'), /e\.parameter\.ponto/);
});

test('sem envio em dobro com o COMMAND: a configuração do SGO+ fica na propriedade que o COMMAND lê pelo alias PONTO_SGO_CONFIG', () => {
  const a = ambiente({ ligado: false });
  ok(a.api('s_dora', 'salvarConfig', { ligado: true }));
  const p = JSON.parse(a.props.PONTO_CONFIG);
  assert.equal(p.ligado, true);
  const sis = path.join(__dirname, '../../sgo_servidor/src/sistemas.ts');
  if (fs.existsSync(sis)) assert.match(fs.readFileSync(sis, 'utf8'), /PONTO_SGO_CONFIG: "PONTO_CONFIG"/);
  const cmd = path.join(__dirname, '../../metrolabs_command/Ponto.js');
  if (fs.existsSync(cmd)) { const t = fs.readFileSync(cmd, 'utf8'); assert.match(t, /PONTO_SGO_CONFIG/); assert.match(t, /CMD_PONTO_NO_SGO/); }
});
