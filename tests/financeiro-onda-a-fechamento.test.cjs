// Onda A do Financeiro (18/11/2026), item A3: fechamento mensal com checklist. Lista padrão da especificação, versões com motivo (só o
// dono e a Diretoria), abertura pela rotina no primeiro dia útil, atividades sigilosas do Financeiro, quem fez e quando, dispensa só da
// Diretoria e mês fechado só com tudo resolvido. Especificação: ESPEC_ONDA2_FINANCEIRO.md, seção 5 (A3). Nada sai para a rede.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { montarA } = require('./_financeiro_onda_a.cjs');

const atividades = (a) => (a.tabelas.ATV_ATIVIDADES || []).filter((x) => x.MODULO === 'financeiro' && /^Fechamento de /.test(x.TITULO));

test('A3-1: lista padrão recomendada (6 itens da especificação), versão 0, até o dono ou a Diretoria aprovar', () => {
  const a = montarA();
  const r = a.F('OmieFech_apiTela', 'wanessa');
  assert.equal(r.ok, true, r.mensagem);
  assert.equal(r.lista.padrao, true); assert.equal(r.lista.versao, 0);
  assert.deepEqual(r.lista.itens.map((i) => i.codigo), ['CONCILIACAO', 'NOTAS', 'CAJU', 'PROVISOES', 'VENCIDOS', 'RELATORIO']);
  assert.match(r.lista.itens.find((i) => i.codigo === 'CAJU').titulo, /Recarga Caju da rotina/);
  assert.equal(r.atual, null); assert.deepEqual(r.abriveis.map((x) => x.competencia), ['2026-11', '2026-10', '2026-09', '2026-08']);
  assert.equal(r.podeDecidir, false); assert.equal(a.F('OmieFech_apiTela', 'dora').podeDecidir, true); assert.equal(a.F('OmieFech_apiTela', 'admin').podeDecidir, true);
});

test('A3-2: a rotina não cria checklist atrasado na publicação; abre o mês anterior no primeiro dia útil, com atividades sigilosas do Financeiro', () => {
  const a = montarA({ agora: '2026-11-18T09:00:00-03:00' });
  let r = a.j(a.ctx.FinFech_rodada_(new a.ctx.Date()));
  assert.equal(r.inicio, '2026-11'); assert.match(r.fora, /novembro de 2026/);
  assert.equal(a.props.FIN_FECH_INICIO, '2026-11');
  assert.equal((a.tabelas.FIN_FECHAMENTO || []).length, 0, 'outubro não é aberto sozinho');
  r = a.j(a.ctx.FinFech_rodada_(new a.ctx.Date()));
  assert.match(r.fora, /primeiro checklist automático é o de novembro/);
  // 01/12/2026 é terça-feira (dia útil); a rotina está em Ges_rodada_ dentro do expediente
  assert.match(vm.runInContext('Ges_rodada_.toString()', a.ctx), /if \(!ex\.dentro\)[\s\S]*FinFech_rodada_\(quando\)/);
  a.em('2026-12-01T08:30:00-03:00');
  r = a.j(a.ctx.FinFech_rodada_(new a.ctx.Date()));
  assert.deepEqual([r.aberto, r.itens, r.atividades, r.versao], ['2026-11', 6, 6, 0]);
  assert.match(a.j(a.ctx.FinFech_rodada_(new a.ctx.Date())).fora, /já aberto/);
  const atv = atividades(a);
  assert.equal(atv.length, 6);
  for (const x of atv) {
    assert.equal(x.RESTRITA, 'SIM'); assert.equal(x.MODULO, 'financeiro');
    assert.ok(['u_fin', 'u_fin2'].includes(x.RESPONSAVEL_ID), 'responsável do Financeiro da lista de sigilo');
    assert.equal(x.CRIADO_POR_ID, 'GESTAO_ROTINA');
  }
  // prazo: 5º dia útil de dezembro (01, 02, 03, 04, 07) e 7º para o relatório (08, 09)
  const itens = a.tabelas.FIN_FECHAMENTO_ITENS;
  assert.equal(itens.find((i) => i.CODIGO === 'CONCILIACAO').PRAZO, '2026-12-07');
  assert.equal(itens.find((i) => i.CODIGO === 'RELATORIO').PRAZO, '2026-12-09');
  assert.equal(atv.find((x) => /Relatório do mês/.test(x.TITULO)).PRAZO, '2026-12-09T18:00');
  // as atividades sigilosas não aparecem para quem está fora da lista
  const rita = a.j(a.ctx.Atividades_apiListarModulo('s_gil', { modulo: 'financeiro' }));
  assert.ok(!(rita.itens || []).length, 'gestor fora da lista não vê as atividades do Financeiro');
});

test('A3-3: marcar como feito registra quem e quando e conclui a atividade; desfazer pede motivo; o Financeiro não dispensa', () => {
  const a = montarA();
  assert.equal(a.F('OmieFech_apiAbrir', 'wanessa', { competencia: '2026-10' }).ok, true);
  const itens = a.tabelas.FIN_FECHAMENTO_ITENS;
  let r = a.F('OmieFech_apiMarcar', 'wanessa', { itemId: itens[0].ID, acao: 'FEITO', obs: 'conciliadas as 3 contas; tarifa lançada' });
  assert.equal(r.ok, true, r.mensagem);
  const i0 = a.tabelas.FIN_FECHAMENTO_ITENS[0];
  assert.deepEqual([i0.SITUACAO, i0.FEITO_POR_ID, i0.FEITO_POR_NOME, i0.FEITO_EM, i0.OBS], ['FEITO', 'u_fin', 'WANESSA FINANCEIRO TESTE', '2026-11-16T13:00:00.000Z', 'conciliadas as 3 contas; tarifa lançada']);
  const atv = a.tabelas.ATV_ATIVIDADES.find((x) => x.ID === i0.ATIVIDADE_ID);
  assert.equal(atv.SITUACAO, 'Concluída'); assert.match(atv.OBS_CONCLUSAO, /Marcado como feito no Fechamento do mês por WANESSA/);
  const tela = a.F('OmieFech_apiTela', 'wanessa', { competencia: '2026-10' });
  assert.equal(tela.atual.itens[0].feitoEm, '16/11/2026 10:00', 'data e hora do servidor, em texto');
  r = a.F('OmieFech_apiMarcar', 'fabio', { itemId: itens[0].ID, acao: 'DESFAZER', motivo: 'faltou a conta poupança' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /Só quem marcou o item \(WANESSA FINANCEIRO TESTE\) ou a Diretoria desfaz/);
  r = a.F('OmieFech_apiMarcar', 'wanessa', { itemId: itens[0].ID, acao: 'DESFAZER', motivo: 'curto' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /pelo menos 10 letras/);
  r = a.F('OmieFech_apiMarcar', 'wanessa', { itemId: itens[0].ID, acao: 'DESFAZER', motivo: 'faltou conciliar a conta poupança' });
  assert.equal(r.ok, true, r.mensagem);
  assert.equal(a.tabelas.FIN_FECHAMENTO_ITENS[0].SITUACAO, 'PENDENTE');
  assert.equal(a.tabelas.ATV_ATIVIDADES.find((x) => x.ID === i0.ATIVIDADE_ID).SITUACAO, 'A fazer', 'a atividade volta a fazer');
  r = a.F('OmieFech_apiDispensar', 'wanessa', { itemId: itens[1].ID, motivo: 'não houve nota recebida no mês' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /só o dono do sistema e a Diretoria[\s\S]*Nada foi alterado[\s\S]*Peça ao dono ou à Diretoria/);
  assert.ok(a.acessos().some((x) => x.RESULTADO === 'NEGADO' && x.CONSULTA === 'OmieFech_apiDispensar'));
});

test('A3-4: o mês só fecha com todos os itens feitos ou dispensados pela Diretoria (com motivo); reabrir é da Diretoria', () => {
  const a = montarA();
  a.F('OmieFech_apiAbrir', 'wanessa', { competencia: '2026-10' });
  const itens = a.tabelas.FIN_FECHAMENTO_ITENS;
  for (const i of itens.slice(0, 5)) assert.equal(a.F('OmieFech_apiMarcar', 'wanessa', { itemId: i.ID, acao: 'FEITO' }).ok, true);
  assert.equal(a.tabelas.FIN_FECHAMENTO[0].SITUACAO, 'ABERTO', 'com um item pendente, o mês continua aberto');
  let r = a.F('OmieFech_apiDispensar', 'dora', { itemId: itens[5].ID, motivo: 'curto demais' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /pelo menos 15 letras/);
  r = a.F('OmieFech_apiDispensar', 'dora', { itemId: itens[5].ID, motivo: 'relatório apresentado na reunião presencial da Diretoria' });
  assert.equal(r.ok, true, r.mensagem); assert.match(r.mensagem, /mês de outubro de 2026 está fechado/);
  const m = a.tabelas.FIN_FECHAMENTO[0];
  assert.equal(m.SITUACAO, 'FECHADO'); assert.ok(m.FECHADO_EM);
  assert.equal(a.tabelas.ATV_ATIVIDADES.find((x) => x.ID === itens[5].ATIVIDADE_ID).SITUACAO, 'Cancelada');
  r = a.F('OmieFech_apiMarcar', 'wanessa', { itemId: itens[0].ID, acao: 'DESFAZER', motivo: 'faltou conciliar a poupança' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /O mês já está fechado[\s\S]*Reabrir o mês/);
  assert.equal(a.F('OmieFech_apiReabrir', 'wanessa', { competencia: '2026-10', motivo: 'nota de outubro chegou depois do fechamento' }).ok, false);
  r = a.F('OmieFech_apiReabrir', 'admin', { competencia: '2026-10', motivo: 'nota de outubro chegou depois do fechamento' });
  assert.equal(r.ok, true, r.mensagem);
  assert.equal(a.tabelas.FIN_FECHAMENTO[0].SITUACAO, 'ABERTO'); assert.equal(a.tabelas.FIN_FECHAMENTO[0].REABERTO_POR, 'DONO DO SISTEMA TESTE');
  assert.equal(a.F('OmieFech_apiMarcar', 'wanessa', { itemId: itens[1].ID, acao: 'DESFAZER', motivo: 'lançar a nota que chegou atrasada' }).ok, true);
  assert.equal(a.F('OmieFech_apiMarcar', 'wanessa', { itemId: itens[1].ID, acao: 'FEITO', obs: 'nota lançada' }).ok, true);
  assert.equal(a.tabelas.FIN_FECHAMENTO[0].SITUACAO, 'FECHADO', 'fecha de novo com tudo resolvido');
  assert.equal(a.escritas().length, 0, 'nada vai ao Omie');
});

test('A3-5: aprovar ou alterar a lista: só o dono e a Diretoria, com motivo e versão; vale para os meses abertos depois', () => {
  const a = montarA();
  a.F('OmieFech_apiAbrir', 'wanessa', { competencia: '2026-10' });
  const atual = a.F('OmieFech_apiTela', 'dora').lista.itens;
  const nova = atual.concat([{ titulo: 'Guias de impostos do mês conferidas', descricao: 'DAS, ISS e retenções pagas ou lançadas.', papel: 'FINANCEIRO', prazoUteis: 10 }]);
  let r = a.F('OmieFech_apiSalvarLista', 'wanessa', { itens: nova, motivo: 'acrescentar os impostos do mês' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /só o dono do sistema e a Diretoria/);
  r = a.F('OmieFech_apiSalvarLista', 'dora', { itens: nova, motivo: 'curto' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /pelo menos 15 letras/);
  for (const [it, re] of [[[{ titulo: 'abc', papel: 'FINANCEIRO', prazoUteis: 5 }], /pelo menos 5 letras/], [[{ titulo: 'Conferir algo', papel: 'X', prazoUteis: 5 }], /quem faz/], [[{ titulo: 'Conferir algo', papel: 'FINANCEIRO', prazoUteis: 20 }], /1 a 15 dias úteis/], [[], /pelo menos um item/]]) {
    const x = a.F('OmieFech_apiSalvarLista', 'dora', { itens: it, motivo: 'teste de validação da lista' }); assert.equal(x.ok, false); assert.match(x.mensagem, re);
  }
  r = a.F('OmieFech_apiSalvarLista', 'dora', { itens: nova, motivo: 'item de impostos combinado com o contador' });
  assert.equal(r.ok, true, r.mensagem); assert.match(r.mensagem, /versão 1, 7 itens/);
  const v = a.tabelas.FIN_FECHAMENTO_LISTA[0];
  assert.deepEqual([v.VERSAO, v.POR_ID, v.MOTIVO], [1, 'u_dir', 'item de impostos combinado com o contador']);
  assert.equal(JSON.parse(v.ITENS_JSON)[6].codigo, 'GUIAS_DE_IMPOSTOS_DO_MES_CONFE');
  // outubro (já aberto) continua com 6 itens; setembro, aberto depois, tem 7
  assert.equal(a.tabelas.FIN_FECHAMENTO_ITENS.filter((i) => i.COMPETENCIA === '2026-10').length, 6);
  a.F('OmieFech_apiAbrir', 'wanessa', { competencia: '2026-09' });
  assert.equal(a.tabelas.FIN_FECHAMENTO_ITENS.filter((i) => i.COMPETENCIA === '2026-09').length, 7);
  const t = a.F('OmieFech_apiTela', 'wanessa', { competencia: '2026-09' });
  assert.equal(t.atual.versaoLista, 1); assert.equal(t.lista.padrao, false); assert.equal(t.versoes[0].itens, 7);
  // aprovar sem mudança também grava uma versão (o dono aprova a lista)
  r = a.F('OmieFech_apiSalvarLista', 'admin', { itens: nova, motivo: 'lista aprovada pelo dono sem mudanças' });
  assert.equal(r.ok, true); assert.match(r.mensagem, /versão 2/);
});

test('A3-6: sigilo — fora da lista não vê nem marca; abrir mês fora do intervalo é recusado; sem valor financeiro nas tabelas', () => {
  const a = montarA();
  for (const fora of ['rita', 'gil', 'tiago', 'matheusgodoi']) {
    for (const fn of ['OmieFech_apiTela', 'OmieFech_apiAbrir', 'OmieFech_apiMarcar', 'OmieFech_apiDispensar', 'OmieFech_apiSalvarLista']) {
      const r = a.F(fn, fora, { competencia: '2026-10' }); assert.equal(r.ok, false); assert.match(r.mensagem, /O Financeiro é sigiloso/);
    }
  }
  let r = a.F('OmieFech_apiAbrir', 'wanessa', { competencia: '2026-12' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /Escolha um mês entre agosto de 2026 e novembro de 2026/);
  assert.equal(a.F('OmieFech_apiAbrir', 'wanessa', { competencia: '2026-11' }).ok, true);
  r = a.F('OmieFech_apiAbrir', 'wanessa', { competencia: '2026-11' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /já está aberto/);
  assert.equal(a.ctx.OMIE_SIGILO_NOMES.OmieFech_apiTela, 'Fechamento do mês');
  assert.ok(!JSON.stringify(a.tabelas.FIN_FECHAMENTO_ITENS).match(/R\$/));
});
