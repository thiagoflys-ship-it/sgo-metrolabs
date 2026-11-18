// Pacote 4 de 18/11/2026, item 13 (Matheus, 17/11 22:50): recarga semanal da Recarga Caju com a programação da semana declarada
// (dias, cidades, clientes, O.S.), puxada da agenda (O.S. do SGO+ e Auvo) quando houver; valor calculado (previsto − saldo no cartão),
// nunca digitado; aprovação só do dono e da Diretoria; prestação e devolução como na Recarga Caju; previsto × realizado da semana.
// Código real do SGO+ (SGO_RecargaCaju*.js, SGO_Caju*.js, SGO_Viagem*.js); Caju simulado; nada sai de verdade.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { ambienteCaju } = require('./_caju_ambiente.cjs');

const recusa = (r, re) => { assert.equal(r.ok, false, 'esperava recusa, veio ok: ' + JSON.stringify(r).slice(0, 300)); if (re) assert.match(r.message, re); return r; };
let nArq = 0;
const foto = () => ({ nome: 'comprovante-' + (++nArq) + '.jpg', tipo: 'image/jpeg', base64: Buffer.from('foto do comprovante ' + nArq + ' ' + Math.random()).toString('base64') });
function base(o) {
  o = o || {};
  const a = ambienteCaju(Object.assign({}, o, { props: Object.assign({ APROVACAO_SO_DIRETORIA: 'SIM' }, o.props || {}) }));
  a.r = (login, acao, dados) => {
    vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_(); VIA_POLITICA_MEMO = null; RCJ_MEMO = {};', a.ctx);
    return JSON.parse(JSON.stringify(a.ctx.RecargaCaju_api('s_' + login, acao, dados || {})));
  };
  a.vincularEquipe();
  a.ok(a.r('wanessa', 'habilitar', { usuarioId: 'u_tec', habilitar: true, motivo: 'técnico de campo da rotina de Goiânia' }));
  a.ok(a.r('tiago', 'aceitarTermo', { aceito: true }));
  // agenda: duas O.S. do SGO+ para o Tiago na semana de 26/10 a 01/11 (uma cancelada) e uma de outra pessoa
  a.tabelas.ATEC_OS = [
    { ID: 'os1', NUMERO: 'OS-2026-0101', TECNICO_ID: 'u_tec', AGENDADO_PARA: '2026-10-27T08:00:00', CLIENTE_NOME: 'Hospital Teste Alfa', TIPO_NOME: 'Manutenção preventiva', ENDERECO: 'Rua A, Anápolis/GO', SITUACAO: 'AGENDADA' },
    { ID: 'os2', NUMERO: 'OS-2026-0102', TECNICO_ID: 'u_tec', AGENDADO_PARA: '2026-10-29T13:00:00', CLIENTE_NOME: 'Clínica Teste Beta', TIPO_NOME: 'Calibração', ENDERECO: 'Rua B, Itumbiara/GO', SITUACAO: 'AGENDADA' },
    { ID: 'os3', NUMERO: 'OS-2026-0103', TECNICO_ID: 'u_tec', AGENDADO_PARA: '2026-10-28T08:00:00', CLIENTE_NOME: 'Cancelado', TIPO_NOME: 'Visita', SITUACAO: 'CANCELADA' },
    { ID: 'os4', NUMERO: 'OS-2026-0104', TECNICO_ID: 'u_tec2', AGENDADO_PARA: '2026-10-27T08:00:00', CLIENTE_NOME: 'Outro', TIPO_NOME: 'Visita', SITUACAO: 'AGENDADA' }];
  return a;
}
const PROG = [
  { dia: '2026-10-27', cidade: 'Anápolis', uf: 'GO', cliente: 'Hospital Teste Alfa', ref: 'O.S. OS-2026-0101', atividade: 'Manutenção preventiva', finalidade: 'COMBUSTIVEL', valor: '120,00', origem: 'AGENDA' },
  { dia: '2026-10-27', cidade: 'Anápolis', uf: 'GO', cliente: 'Hospital Teste Alfa', ref: '', atividade: 'Almoço no atendimento', finalidade: 'REFEICAO', valor: '45,00' },
  { dia: '2026-10-29', cidade: 'Itumbiara', uf: 'GO', cliente: 'Clínica Teste Beta', ref: 'O.S. OS-2026-0102', atividade: 'Calibração', finalidade: 'PEDAGIO', valor: '35,00', origem: 'AGENDA' }];

test('13: política com a recarga semanal ligada e os valores VAZIOS (sem teto, sem referência por dia), descontando o saldo; versão e motivo', () => {
  const a = base();
  const pol = a.ok(a.r('wanessa', 'politica'));
  assert.equal(pol.politica.semanalLigado, true); assert.equal(pol.politica.semanalTeto, null); assert.equal(pol.politica.semanalValorDia, null); assert.equal(pol.politica.semanalDescontarSaldo, true);
  assert.equal(pol.textos.semanalTeto, 'vazio (sem teto)');
  assert.match(pol.dicas.semanalTeto, /é solicitado e devolvemos/);
  recusa(a.r('dora', 'salvarPolitica', { semanalTeto: '-1', motivo: 'teto semanal de teste' }), /maior que zero ou vazio/);
  a.ok(a.r('dora', 'salvarPolitica', { semanalLigado: false, motivo: 'semanal desligada para teste' }));
  recusa(a.r('tiago', 'pedir', { tipo: 'SEMANAL', semana: '2026-10-27', programacao: PROG }), /recarga semanal desligada[\s\S]*pedido avulso/);
});

test('13: agenda da semana (O.S. do SGO+ do próprio técnico, sem as canceladas); programação conferida item a item; valor calculado, não digitado', () => {
  const a = base();
  const ag = a.ok(a.r('tiago', 'agendaSemana', { semana: '2026-10-28' }));
  assert.equal(ag.semana.de, '2026-10-26'); assert.equal(ag.semana.ate, '2026-11-01');
  assert.deepEqual(ag.itens.map((x) => x.ref), ['O.S. OS-2026-0101', 'O.S. OS-2026-0102']);
  assert.match(ag.itens[0].diaTxt, /27\/10\/2026 \(terça\)/);
  recusa(a.r('paulo', 'agendaSemana', { semana: '2026-10-28' }), /habilitar o seu cartão Caju/);
  // faltas
  recusa(a.r('tiago', 'pedir', { tipo: 'SEMANAL', semana: '2026-10-27', programacao: [] }), /Declare a programação prevista da semana/);
  recusa(a.r('tiago', 'pedir', { tipo: 'SEMANAL', semana: '2026-10-27', programacao: [{ dia: '2026-11-05', cidade: 'Goiânia', cliente: 'Hospital', finalidade: 'XX', valor: 'abc' }] }),
    /Item 1: escolha um dia da semana de 26\/10\/2026 a 01\/11\/2026\. Item 1: escolha a finalidade[\s\S]*Item 1: informe o valor previsto/);
  recusa(a.r('tiago', 'pedir', { tipo: 'SEMANAL', semana: '2026-10-12', programacao: PROG }), /já passou/);
  // o valor que vem da tela é ignorado: sai da programação
  const ok = a.ok(a.r('tiago', 'pedir', { tipo: 'SEMANAL', semana: '2026-10-27', valor: '9.999,00', programacao: PROG, observacao: 'semana no interior' }));
  assert.match(ok.message, /Recarga semanal RC-2026-0001 enviada: semana de 26\/10\/2026 a 01\/11\/2026, previsto R\$ 200,00 = R\$ 200,00. Quem decide é o dono ou a Diretoria/);
  const r = a.tabelas.RCJ_SOLICITACOES[0];
  assert.equal(r.TIPO, 'SEMANAL'); assert.equal(r.VALOR_PEDIDO, 200); assert.equal(r.PREVISTO_TOTAL, 200); assert.equal(r.SEMANA_DE, '2026-10-26');
  assert.equal(r.ETAPA, 'DIRETORIA'); assert.match(r.MOTIVOS_DIRETORIA, /recarga semanal: só o dono e a Diretoria aprovam/);
  assert.equal(JSON.parse(r.PROGRAMACAO_JSON).length, 3);
  assert.match(r.JUSTIFICATIVA, /27\/10 Anápolis, Hospital Teste Alfa \(O\.S\. OS-2026-0101\)/);
  assert.deepEqual(r.FINALIDADES.split(','), ['COMBUSTIVEL', 'REFEICAO', 'PEDAGIO']);
  // um por semana
  a.ok(a.r('tiago', 'cancelarPedido', { id: r.ID, motivo: 'programação vai mudar ainda' }));
  a.ok(a.r('tiago', 'pedir', { tipo: 'SEMANAL', semana: '2026-10-26', programacao: PROG }));
  const r2 = a.tabelas.RCJ_SOLICITACOES[1];
  a.ok(a.r('dora', 'decidir', { id: r2.ID, decisao: 'NEGAR', fundamentacao: 'programação ainda incompleta para a semana' }));
  a.ok(a.r('tiago', 'pedir', { tipo: 'SEMANAL', semana: '2026-10-26', programacao: PROG }));
  a.ok(a.r('dora', 'decidir', { id: a.tabelas.RCJ_SOLICITACOES[2].ID, decisao: 'DEVOLVER', fundamentacao: 'confira o pedágio de Itumbiara' }));
  // reenvio do devolvido: o mesmo pedido
  a.ok(a.r('tiago', 'pedir', { id: a.tabelas.RCJ_SOLICITACOES[2].ID, tipo: 'SEMANAL', semana: '2026-10-26', programacao: PROG }));
  assert.equal(a.tabelas.RCJ_SOLICITACOES.length, 3);
});

test('13: só o dono e a Diretoria aprovam (mesmo com a regra do Financeiro em NAO); a Wanessa carrega; teto semanal, quando existe, pede justificativa', () => {
  const a = base({ props: { APROVACAO_SO_DIRETORIA: 'NAO' } });
  a.ok(a.r('tiago', 'pedir', { tipo: 'SEMANAL', semana: '2026-10-27', programacao: PROG }));
  const r = a.tabelas.RCJ_SOLICITACOES[0];
  assert.equal(r.ETAPA, 'DIRETORIA');
  recusa(a.r('wanessa', 'decidir', { id: r.ID, decisao: 'APROVAR', fundamentacao: '' }), /o dono ou a Diretoria decide/);
  const g = a.ok(a.r('dora', 'gestao', {}));
  const p = g.pedidos.find((x) => x.id === r.ID);
  assert.equal(p.tipo, 'SEMANAL'); assert.equal(p.semanal.programacao.length, 3); assert.equal(p.semanal.previstoTxt, 'R$ 200,00');
  assert.match(p.semanal.programacao[0].diaTxt, /27\/10\/2026 \(terça\)/);
  a.ok(a.r('dora', 'decidir', { id: r.ID, decisao: 'APROVAR', valor: '180,00', fundamentacao: 'pedágio de Itumbiara pela tag da empresa' }));
  a.ok(a.r('wanessa', 'registrarCarga', { id: r.ID, data: '2026-10-19', valor: '180,00', arquivo: a.pdf('carga.pdf') }));
  assert.equal(a.tabelas.RCJ_SOLICITACOES[0].SITUACAO, 'CARREGADA');
  // teto da política
  const b = base();
  b.ok(b.r('dora', 'salvarPolitica', { semanalTeto: '150,00', motivo: 'teto semanal decidido em teste' }));
  recusa(b.r('tiago', 'pedir', { tipo: 'SEMANAL', semana: '2026-10-27', programacao: PROG }), /passa do teto semanal da política \(R\$ 150,00\)/);
  b.ok(b.r('tiago', 'pedir', { tipo: 'SEMANAL', semana: '2026-10-27', programacao: PROG, observacao: 'três clientes no interior nesta semana' }));
  assert.match(b.tabelas.RCJ_SOLICITACOES[0].MOTIVOS_DIRETORIA, /acima do teto semanal/);
});

test('13: o saldo da rotina que já está no cartão é descontado (economia); se cobre a semana, não há recarga; previsto × realizado no fim da semana', () => {
  const a = base();
  // semana 1 (19 a 25/10): 300 carregados, 100 gastos -> saldo 200 no cartão
  a.ok(a.r('tiago', 'pedir', { valor: '300,00', justificativa: 'peças e oficina das lavadoras desta semana', finalidades: ['PECAS_INSUMOS'] }));
  const r1 = a.tabelas.RCJ_SOLICITACOES[0];
  a.ok(a.r('dora', 'decidir', { id: r1.ID, decisao: 'APROVAR', fundamentacao: '' }));
  a.ok(a.r('wanessa', 'registrarCarga', { id: r1.ID, data: '2026-10-19', valor: '300,00', arquivo: a.pdf('carga.pdf') }));
  a.ok(a.r('tiago', 'lancarGasto', { data: '2026-10-19', valor: '100,00', estabelecimento: 'Auto Peças Silva', finalidade: 'PECAS_INSUMOS', descricao: 'correia da lavadora do Hospital Teste Alfa', vinculoTipo: 'CLIENTE', vinculoRef: 'Hospital Teste Alfa', pagoCom: 'CAJU', arquivo: foto() }));
  const m = a.ok(a.r('tiago', 'minha')).semanal;
  assert.equal(m.ligado, true); assert.equal(m.saldo.valor, 200); assert.equal(m.proxima.de, '2026-10-26');
  // previsto 200 = saldo 200: não precisa de recarga
  recusa(a.r('tiago', 'pedir', { tipo: 'SEMANAL', semana: '2026-10-27', programacao: PROG }), /Não é preciso recarga nesta semana: o saldo da rotina no seu cartão \(R\$ 200,00/);
  const prog2 = PROG.concat([{ dia: '2026-10-30', cidade: 'Goiânia', uf: 'GO', cliente: 'Hospital Teste Gama', atividade: 'Peças da autoclave', finalidade: 'PECAS_INSUMOS', valor: '150,00' }]);
  const ok = a.ok(a.r('tiago', 'pedir', { tipo: 'SEMANAL', semana: '2026-10-27', programacao: prog2 }));
  assert.match(ok.message, /previsto R\$ 350,00 menos R\$ 200,00 de saldo no cartão = R\$ 150,00/);
  const r = a.tabelas.RCJ_SOLICITACOES[1];
  assert.equal(r.VALOR_PEDIDO, 150); assert.equal(r.SALDO_DESCONTADO, 200);
  a.ok(a.r('dora', 'decidir', { id: r.ID, decisao: 'APROVAR', fundamentacao: '' }));
  a.ok(a.r('wanessa', 'registrarCarga', { id: r.ID, data: '2026-10-19', valor: '150,00', arquivo: a.pdf('carga2.pdf') }));
  // a semana acontece: gastos ligados à O.S. 0101 e ao pedágio
  a.mudar('2026-11-03T10:00:00-03:00');
  const g = (x) => a.ok(a.r('tiago', 'lancarGasto', Object.assign({ estabelecimento: 'Posto Teste', descricao: 'abastecimento no atendimento do Hospital Teste Alfa', vinculoTipo: 'OS', pagoCom: 'CAJU', arquivo: foto() }, x)));
  g({ data: '2026-10-27', valor: '110,00', finalidade: 'COMBUSTIVEL', vinculoRef: 'OS-2026-0101' });
  g({ data: '2026-10-29', valor: '38,50', finalidade: 'PEDAGIO', vinculoRef: 'OS-2026-0102', estabelecimento: 'Pedágio Teste', descricao: 'pedágio na ida para a Clínica Teste Beta' });
  const p = a.ok(a.r('tiago', 'minha')).pedidos.find((x) => x.id === r.ID);
  const k = p.semanal.comparativo;
  assert.equal(k.terminou, true);
  assert.equal(k.previstoTxt, 'R$ 350,00'); assert.equal(k.realizadoTxt, 'R$ 148,50');
  assert.equal(k.sobra, true); assert.equal(k.diferencaTxt, 'R$ 201,50');
  assert.match(k.texto, /^Semana encerrada: previsto R\$ 350,00, realizado R\$ 148,50 em 2 gastos lançados\. Sobra prevista: R\$ 201,50/);
  assert.deepEqual(k.porDia.map((x) => [x.dia, x.previstoTxt, x.realizadoTxt]), [['2026-10-27', 'R$ 165,00', 'R$ 110,00'], ['2026-10-29', 'R$ 35,00', 'R$ 38,50'], ['2026-10-30', 'R$ 150,00', 'R$ 0,00']]);
  assert.equal(k.porFinalidade.find((x) => x.finalidade === 'PEDAGIO').realizadoTxt, 'R$ 38,50');
  assert.deepEqual(k.itens.map((x) => x.comGasto), [true, false, true, false]);
  // a gestão vê o mesmo comparativo; o portador fora da lista de sigilo não vê a gestão
  assert.equal(a.ok(a.r('wanessa', 'gestao', {})).pedidos.find((x) => x.id === r.ID).semanal.comparativo.realizadoTxt, 'R$ 148,50');
  recusa(a.r('tiago', 'gestao', {}), /sigilosa/);
});
