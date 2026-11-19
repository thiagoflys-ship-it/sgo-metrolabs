// Desempenho da gestão em painel, Caixa de decisões agrupada e saneamento do acúmulo do Auvo (11/11/2026, pedido do dono:
// "desempenho da gestão, isso está horrível" e "Caixa de decisões, fazer o mesmo"). Código real do SGO+ num contexto isolado
// com volume realista de dados fictícios (tests/_gestao_desempenho_ambiente.cjs). Nada sai de verdade.
// 18/11/2026: Auvo descontinuado pelo dono (SGO_Auvo_Retirada.js). As O.S. do Auvo não entram mais na central nem na Caixa; o que já
// estava aberto sai como RETIRADA (fora da nota, dos resolvidos e do painel). Os testes que mediam o acúmulo do Auvo e o saneamento
// dele foram reescritos para essa regra (comentário datado em cada um); a classificação e a regra da nota continuam como estavam.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, ambienteVolume, osAuvo, atividade } = require('./_gestao_desempenho_ambiente.cjs');

/** 18/11/2026: itens do Auvo que estavam abertos na Caixa antes da retirada (como na produção), escalados em novembro para o Matheus. */
function sobrasDoAuvo(a, n) {
  for (let k = 0; k < n; k++) a.tabelas.GES_DECISOES.push({ ID: 'sobra' + k, ITEM_ID: 'AUVO:OS:' + (70000000 + k), TIPO: k % 4 ? 'AUVO_OS_ABERTA' : 'AUVO_SEM_VINCULO', MODULO: 'auvo',
    TITULO: 'O.S. nº ' + (70000000 + k) + ' aberta no Auvo há 40 dias', AREA: 'TECNICA', RESPONSAVEIS_IDS: 'u_mat', RESPONSAVEIS_NOMES: 'MATHEUS GESTOR TECNICO TESTE',
    ENTROU_EM: '2026-11-03T10:00', PRAZO_DECISAO: '2026-11-06', ESCALADO_EM: '2026-11-10T10:00', SITUACAO: 'ABERTA', PROVIDENCIAS: 0 });
}

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };

test('classificação: O.S. que já chegou antiga é saneamento; a que envelheceu na caixa é decisão; sem vínculo é cadastro', () => {
  const a = ambiente();
  const c = a.ctx;
  assert.equal(c.GesP_classe_('AUVO_OS_ABERTA', '2026-01-10', '2026-10-20', 30), 'SANEAMENTO');
  assert.equal(c.GesP_classe_('auvo_os_aberta', '2026-10-10', '2026-10-20', 30), 'DECISAO', 'entrou com 10 dias: o atraso depois é da gestão');
  assert.equal(c.GesP_classe_('AUVO_SEM_VINCULO', '', '2026-10-20', 30), 'CADASTRO');
  assert.equal(c.GesP_classe_('ATIVIDADE_ATRASADA', '', '2026-10-20', 30), 'DECISAO');
  assert.equal(c.GesP_diasDoTitulo_('O.S. nº 52304053 aberta no Auvo há 1.333 dias'), 1333);
  assert.equal(c.GesP_origemDia_('O.S. nº 1 aberta no Auvo há 30 dias', '2026-11-11'), '2026-10-12');
  assert.equal(c.GesP_chaveDup_('Sugestão de ocorrência: Avaria na devolução do veículo PQB4394 (27/10/2026)'), c.GesP_chaveDup_('Avaria na devolução do veículo  PQB4394 (27/10/2026)'));
});

// 18/11/2026: reescrito. Antes: o acúmulo antigo do Auvo e as O.S. sem vínculo não pesavam na nota. Agora nenhum item do Auvo pesa.
test('avaliação: itens do Auvo que estavam abertos saem como RETIRADA e não pesam na nota; o resto continua igual', () => {
  const a = ambienteVolume();
  assert.equal(a.tabelas.GES_DECISOES.filter((r) => /^AUVO/.test(r.TIPO)).length, 0, 'a central não manda mais O.S. do Auvo para a Caixa');
  sobrasDoAuvo(a, 160);
  a.mudar('2026-11-12T10:00:00-03:00'); a.sincronizar();
  const rows = a.tabelas.GES_DECISOES;
  assert.equal(rows.filter((r) => /^sobra/.test(r.ID) && r.SITUACAO === 'RETIRADA').length, 160);
  const escNov = rows.filter((r) => String(r.ESCALADO_EM).slice(0, 7) === '2026-11' && /u_mat/.test(r.RESPONSAVEIS_IDS));
  const av = ok(a.ctx.Gestao_apiAvaliacao('s_dora', {}));
  const mat = av.gestores.find((g) => g.id === 'u_mat');
  assert.equal(mat.indicadores.escalonamentos, escNov.filter((r) => !/^AUVO/.test(r.TIPO)).length, 'só as decisões de verdade contam');
  assert.ok(mat.indicadores.escalonamentos < 20);
  assert.ok(mat.detalhes.escalados.every((e) => e.tipo && !/^AUVO/.test(String(e.tipo).toUpperCase())), 'detalhe sem item do Auvo');
  const gil = av.gestores.find((g) => g.id === 'u_gil');
  assert.equal(gil.indicadores.escalonamentos, rows.filter((r) => String(r.ESCALADO_EM).slice(0, 7) === '2026-11' && /u_gil/.test(r.RESPONSAVEIS_IDS)).length);
});

// 18/11/2026: ajustado. Sem o Auvo não há saneamento nem cadastro no painel; as sobras do Auvo retiradas não aparecem.
test('painel: Diretoria vê todos com taxas, áreas e grupos; gestor só o dele; técnico não abre', () => {
  const a = ambienteVolume();
  sobrasDoAuvo(a, 30);
  a.mudar('2026-11-12T10:00:00-03:00'); a.sincronizar();
  const p = ok(a.ctx.Gestao_apiPainelDesempenho('s_dora', {}));
  assert.deepEqual(p.gestores.map((g) => g.id).sort(), ['u_bru', 'u_gil', 'u_mat']);
  assert.equal(p.totais.saneamento, 0);
  assert.equal(p.totais.cadastro, 0);
  const mat = p.gestores.find((g) => g.id === 'u_mat');
  assert.ok(mat.carteira >= mat.resolvidos && mat.taxaResolucao !== null);
  assert.equal(mat.foraDaNota, 0);
  assert.ok(!p.grupos.some((g) => g.classe === 'SANEAMENTO' || g.classe === 'CADASTRO' || /^AUVO/.test(String(g.tipo).toUpperCase())));
  const sig = p.grupos.find((g) => g.modulo === 'conduta');
  assert.ok(sig && sig.sigilo && sig.itens.length === 0 && sig.qtd === 3, 'Programa de conduta só em contagem');
  assert.ok(JSON.stringify(p).length < 200000, 'resposta leve');
  // filtros
  const adm = ok(a.ctx.Gestao_apiPainelDesempenho('s_dora', { area: 'ADMINISTRATIVO' }));
  assert.equal(adm.totais.saneamento, 0);
  assert.ok(adm.grupos.every((g) => g.area === 'ADMINISTRATIVO'));
  const tipo = ok(a.ctx.Gestao_apiPainelDesempenho('s_dora', { tipo: 'ATIVIDADE_ATRASADA' }));
  assert.ok(tipo.grupos.every((g) => g.tipo === 'ATIVIDADE_ATRASADA'));
  const so = ok(a.ctx.Gestao_apiPainelDesempenho('s_dora', { gestorId: 'u_bru' }));
  assert.deepEqual(so.gestores.map((g) => g.id), ['u_bru']);
  // gestor: só ele, mesmo pedindo outro
  const m = ok(a.ctx.Gestao_apiPainelDesempenho('s_matheus', { gestorId: 'u_bru' }));
  assert.deepEqual(m.gestores.map((g) => g.id), ['u_mat']);
  assert.equal(m.diretoria, false);
  assert.ok(m.grupos.every((g) => g.itens.every((i) => /MATHEUS/.test(i.com))));
  assert.match(a.ctx.Gestao_apiPainelDesempenho('s_tiago', {}).message, /vista só pelo próprio gestor e pela Diretoria/);
});

// 18/11/2026: ajustado. O volume acima de 400 itens vinha das O.S. do Auvo; agora vem de atividades atrasadas da equipe.
test('caixa: todos os itens (sem corte em 400), classe, repetidos e números só das decisões; nada do Auvo', () => {
  const a = ambienteVolume();
  for (let k = 0; k < 120; k++) osAuvo(a, 90000000 + k, 250, '2026-11-11');
  for (let k = 0; k < 420; k++) atividade(a, 'vol' + k, ['u_a1', 'u_a2', 'u_c1', 'u_t1', 'u_t2', 'u_t3'][k % 6], '2026-11-0' + (1 + (k % 5)) + 'T18:00', 'Atividade de volume ' + (k + 1));
  a.sincronizar();
  const c = ok(a.ctx.Gestao_apiCaixa('s_dora', { filtro: 'todas' }));
  assert.ok(c.itens.length > 400, 'antes cortava em 400: ' + c.itens.length);
  assert.equal(c.cortado, false);
  assert.equal(c.resumoTodas.saneamento, 0);
  assert.equal(c.itens.some((i) => /^auvo/.test(i.tipo)), false, 'nenhuma O.S. do Auvo na caixa');
  assert.equal(c.resumoTodas.decisao, c.itens.filter((i) => i.classe === 'DECISAO').length);
  assert.equal(c.resumoTodas.noPrazo + c.resumoTodas.decVencidos >= c.resumoTodas.decisao - c.resumoTodas.decEscalados, true);
  const sug = c.itens.filter((i) => i.tipo === 'conduta_sugestao');
  assert.ok(sug.every((i) => i.repetidos === 3), 'mesmo assunto marcado como repetido');
});

// 18/11/2026: os dois testes do saneamento (marcar "encerrada fora do SGO+", desfazer e "dispensar o vínculo") saíram: o saneamento
// existia só para as O.S. do Auvo, que não entram mais na Caixa. O que fica: a tela não lista nada, marcar recusa sem gravar e o
// histórico do que já foi saneado continua guardado.
test('saneamento (18/11/2026): sem O.S. do Auvo na caixa não há o que sanear; marcar recusa sem gravar; o histórico fica', () => {
  const a = ambienteVolume();
  sobrasDoAuvo(a, 10);
  a.tabelas.GES_SANEAMENTO = [{ ID: 'h1', ITEM_ID: 'AUVO:OS:1', OS: '1', ACAO: 'ENCERRADA_FORA', MOTIVO: 'Atendimentos de 2025 já faturados', POR_NOME: 'DORA DIRETORA TESTE', CRIADO_EM: '2026-11-11T10:00' }];
  a.mudar('2026-11-12T10:00:00-03:00'); a.sincronizar();
  const s = ok(a.ctx.Gestao_apiSaneamento('s_dora', {}));
  assert.equal(s.os.total, 0);
  assert.equal(s.semVinculo.total, 0);
  const r = a.ctx.Gestao_apiSanear('s_dora', { acao: 'ENCERRADA_FORA', itemIds: ['AUVO:OS:70000001'], motivo: 'Atendimentos antigos já faturados' });
  assert.equal(r.ok, false);
  assert.equal(a.tabelas.GES_SANEAMENTO.length, 1, 'nada gravado; o histórico continua');
  assert.equal(a.tabelas.GES_DECISOES.filter((x) => /^sobra/.test(x.ID) && x.SITUACAO !== 'RETIRADA').length, 0);
});

test('regra da nota: dias do saneamento ajustáveis só pela Diretoria, com limite', () => {
  const a = ambienteVolume();
  const base = { pesos: { prazo: 30, tempo: 15, vencidos: 15, escalonamentos: 15, acesso: 10, revertidas: 5, equipe: 5, planos: 5 }, farol: { verde: 85, amarelo: 70 }, sugestaoConduta: true };
  assert.match(a.ctx.Gestao_apiConfigAvaliacao('s_matheus', { salvar: Object.assign({ saneamentoDias: 60 }, base) }).message, /definidos pela Diretoria/);
  assert.match(a.ctx.Gestao_apiConfigAvaliacao('s_dora', { salvar: Object.assign({ saneamentoDias: 3 }, base) }).message, /de 7 a 365/);
  const r = ok(a.ctx.Gestao_apiConfigAvaliacao('s_dora', { salvar: Object.assign({ saneamentoDias: 365 }, base) }));
  assert.equal(r.saneamentoDias, 365);
  const p = ok(a.ctx.Gestao_apiPainelDesempenho('s_dora', {}));
  assert.equal(p.regras.saneamentoDias, 365);
  assert.equal(p.totais.saneamento, 0, 'com 365 dias nenhuma O.S. do teste fica fora');
});

test('mês fechado: o JSON congelado fica válido mesmo com centenas de itens escalados', () => {
  const a = ambiente();
  const g = { id: 'u_x', nome: 'X', nota: 10, farol: 'VERMELHO', indicadores: { escalonamentos: 900 }, componentes: {},
    detalhes: { escalados: Array.from({ length: 900 }, (_, k) => ({ titulo: 'O.S. nº ' + (50000000 + k) + ' aberta no Auvo há 333 dias', entrou: '20/10/2026 10:00', escalado: '27/10/2026 10:00', situacao: 'Aberta' })), vencidos: [], semAcesso: [], revertidas: [], planosAtrasados: [] } };
  const t = a.ctx.Ges_jsonCongelado_(g);
  assert.ok(t.length <= 45000);
  const v = JSON.parse(t);
  assert.equal(v.nota, 10); assert.equal(v.indicadores.escalonamentos, 900);
});
