// Desempenho da gestão em painel, Caixa de decisões agrupada e saneamento do acúmulo do Auvo (11/11/2026, pedido do dono:
// "desempenho da gestão, isso está horrível" e "Caixa de decisões, fazer o mesmo"). Código real do SGO+ num contexto isolado
// com volume realista de dados fictícios (tests/_gestao_desempenho_ambiente.cjs). Nada sai de verdade.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, ambienteVolume, osAuvo, atividade } = require('./_gestao_desempenho_ambiente.cjs');

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

test('avaliação: o acúmulo antigo do Auvo e as O.S. sem vínculo não pesam na nota; o resto continua igual', () => {
  const a = ambienteVolume();
  const rows = a.tabelas.GES_DECISOES;
  const escNov = rows.filter((r) => String(r.ESCALADO_EM).slice(0, 7) === '2026-11' && /u_mat/.test(r.RESPONSAVEIS_IDS));
  assert.ok(escNov.length > 150, 'o volume de teste escala o acúmulo em novembro (' + escNov.length + ')');
  const av = ok(a.ctx.Gestao_apiAvaliacao('s_dora', {}));
  const mat = av.gestores.find((g) => g.id === 'u_mat');
  const decisoes = escNov.filter((r) => a.ctx.GesP_classeLinha_(r, 30) === 'DECISAO').length;
  assert.equal(mat.indicadores.escalonamentos, decisoes, 'só as decisões de verdade contam');
  assert.ok(mat.indicadores.escalonamentos < 20);
  assert.ok(mat.detalhes.escalados.every((e) => e.tipo), 'detalhe traz o tipo para agrupar');
  // Bruna e Gil (sem Auvo) ficam iguais à regra antiga: conferido pela contagem direta
  const gil = av.gestores.find((g) => g.id === 'u_gil');
  assert.equal(gil.indicadores.escalonamentos, rows.filter((r) => String(r.ESCALADO_EM).slice(0, 7) === '2026-11' && /u_gil/.test(r.RESPONSAVEIS_IDS)).length);
});

test('painel: Diretoria vê todos com taxas, áreas e grupos; gestor só o dele; técnico não abre', () => {
  const a = ambienteVolume();
  const p = ok(a.ctx.Gestao_apiPainelDesempenho('s_dora', {}));
  assert.deepEqual(p.gestores.map((g) => g.id).sort(), ['u_bru', 'u_gil', 'u_mat']);
  assert.equal(p.totais.saneamento, 300);
  assert.equal(p.totais.cadastro, 60);
  const mat = p.gestores.find((g) => g.id === 'u_mat');
  assert.ok(mat.carteira >= mat.resolvidos && mat.taxaResolucao !== null);
  assert.equal(mat.foraDaNota, 360);
  assert.ok(p.grupos.some((g) => g.classe === 'SANEAMENTO' && g.qtd === 300 && g.origemMaisAntigaBr));
  assert.ok(p.grupos.some((g) => g.classe === 'CADASTRO' && g.qtd === 60));
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

test('caixa: todos os itens (sem corte em 400), classe, repetidos e números só das decisões', () => {
  const a = ambienteVolume();
  for (let k = 0; k < 120; k++) osAuvo(a, 90000000 + k, 250, '2026-11-11');
  a.sincronizar();
  const c = ok(a.ctx.Gestao_apiCaixa('s_dora', { filtro: 'todas' }));
  assert.ok(c.itens.length > 400, 'antes cortava em 400: ' + c.itens.length);
  assert.equal(c.cortado, false);
  assert.equal(c.resumoTodas.saneamento, 420);
  assert.equal(c.resumoTodas.decisao, c.itens.filter((i) => i.classe === 'DECISAO').length);
  assert.equal(c.resumoTodas.noPrazo + c.resumoTodas.decVencidos >= c.resumoTodas.decisao - c.resumoTodas.decEscalados, true);
  const san = c.itens.find((i) => i.classe === 'SANEAMENTO');
  assert.ok(san.origemBr && san.diasOrigem > 30 && !('detalhe' in san), 'saneamento vai enxuto');
  assert.ok(c.saneamentoDias === 30);
  // o balão e a escada continuam com a mesma regra (nada mudou em quem recebe)
  const sug = c.itens.filter((i) => i.tipo === 'conduta_sugestao');
  assert.ok(sug.every((i) => i.repetidos === 3), 'mesmo assunto marcado como repetido');
});

test('saneamento: valida, grava um a um sem apagar, tira da caixa e da avaliação, e o desfazer devolve', () => {
  const a = ambienteVolume();
  const s = ok(a.ctx.Gestao_apiSaneamento('s_dora', {}));
  assert.equal(s.os.total, 300);
  assert.equal(s.semVinculo.total, 60);
  assert.deepEqual(s.semVinculo.porTecnico.map((t) => t.nome), ['JOAO TERCEIRIZADO AUVO', 'CARLOS PARCEIRO AUVO']);
  assert.ok(s.os.itens.every((x) => /^https:\/\/app\.auvo\.exemplo\.test\/tarefa\//.test(x.url)), 'cada O.S. tem o link para conferir no Auvo');
  assert.equal(s.os.epocas.reduce((t, e) => t + e.qtd, 0), 300);
  const ids = s.os.itens.slice(0, 40).map((x) => x.id);
  // validações (operador nunca no limbo)
  assert.match(a.ctx.Gestao_apiSanear('s_dora', { acao: 'ENCERRADA_FORA', itemIds: ids, motivo: 'curto' }).message, /motivo \(pelo menos 15 letras\)/);
  assert.match(a.ctx.Gestao_apiSanear('s_dora', { acao: 'APAGAR', itemIds: ids, motivo: 'x'.repeat(20) }).message, /escolha o que fazer/);
  assert.match(a.ctx.Gestao_apiSanear('s_dora', { acao: 'ENCERRADA_FORA', itemIds: [], motivo: 'x'.repeat(20) }).message, /marque pelo menos uma O\.S\./);
  assert.match(a.ctx.Gestao_apiSanear('s_bruna', { acao: 'ENCERRADA_FORA', itemIds: ids.slice(0, 2), motivo: 'Atendimentos antigos já faturados' }).message, /é de MATHEUS/);
  assert.match(a.ctx.Gestao_apiSanear('s_tiago', { acao: 'ENCERRADA_FORA', itemIds: ids, motivo: 'Atendimentos antigos já faturados' }).message, /Caixa de decisões é da gestão/);
  const recente = a.ctx.Gestao_apiCaixa('s_dora', { filtro: 'todas' }).itens.find((i) => i.tipo === 'auvo_os_aberta' && i.classe === 'DECISAO');
  assert.match(a.ctx.Gestao_apiSanear('s_dora', { acao: 'ENCERRADA_FORA', itemIds: [recente.id], motivo: 'Atendimentos antigos já faturados' }).message, /é decisão do gestor, resolva no Auvo/);
  assert.match(a.ctx.Gestao_apiSanear('s_dora', { acao: 'VINCULO_DISPENSADO', itemIds: ids.slice(0, 1), motivo: 'Atendimentos antigos já faturados' }).message, /não é O\.S\. sem vínculo/);
  assert.equal((a.tabelas.GES_SANEAMENTO || []).length, 0, 'nada gravado nas recusas');
  // o responsável (Matheus) marca 40
  const antesAuvo = a.tabelas.AUVO_PENDENCIAS.length, antesDec = a.tabelas.GES_DECISOES.length;
  const r = ok(a.ctx.Gestao_apiSanear('s_matheus', { acao: 'ENCERRADA_FORA', itemIds: ids, motivo: 'Atendimentos de dezembro de 2025 já faturados' }));
  assert.equal(r.saneados, 40);
  assert.match(r.message, /40 O\.S\. marcadas como "encerrada fora do sgo\+"/);
  assert.equal(a.tabelas.GES_SANEAMENTO.length, 40);
  const reg = a.tabelas.GES_SANEAMENTO[0];
  assert.equal(reg.POR_NOME, 'MATHEUS GESTOR TECNICO TESTE'); assert.ok(reg.ORIGEM_DIA && reg.MOTIVO && reg.REGISTRO_DECISAO_ID && reg.OS);
  assert.equal(a.tabelas.AUVO_PENDENCIAS.length, antesAuvo, 'nada muda no Auvo');
  assert.equal(a.tabelas.GES_DECISOES.length, antesDec, 'nada apagado');
  assert.equal(a.tabelas.GES_DECISOES.filter((x) => x.SITUACAO === 'SANEADA').length, 40);
  // sai da caixa e não volta como resolvida nem como nova na sincronização seguinte
  a.mudar('2026-11-12T10:00:00-03:00'); a.sincronizar();
  const c2 = ok(a.ctx.Gestao_apiCaixa('s_dora', { filtro: 'todas' }));
  assert.equal(c2.resumoTodas.saneamento, 260);
  assert.ok(!c2.itens.some((i) => ids.includes(i.id)));
  assert.equal(a.tabelas.GES_DECISOES.filter((x) => ids.includes(x.ITEM_ID) && x.SITUACAO !== 'SANEADA').length, 0, 'não abriu linha nova nem marcou resolvida');
  // relatório diário da empresa também não traz as saneadas pela central
  const rd = a.ctx.RelDia_dados_();
  assert.ok(!rd.itens.some((i) => ids.includes(i.id)));
  // avaliação: saneada não conta como decisão tomada
  const mat = ok(a.ctx.Gestao_apiAvaliacao('s_dora', { competencia: '2026-11' })).gestores.find((g) => g.id === 'u_mat');
  const p = ok(a.ctx.Gestao_apiPainelDesempenho('s_dora', {}));
  assert.equal(p.totais.saneadas, 40);
  assert.ok(mat.indicadores.decididos === p.gestores.find((g) => g.id === 'u_mat').resolvidos);
  // desfazer: motivo obrigatório; só quem marcou, a Diretoria ou o Administrador
  const hist = ok(a.ctx.Gestao_apiSaneamento('s_dora', {})).historico;
  assert.equal(hist.length, 40);
  assert.match(a.ctx.Gestao_apiDesfazerSaneamento('s_dora', { registroId: hist[0].id, motivo: 'x' }).message, /pelo menos 10 letras/);
  assert.match(a.ctx.Gestao_apiDesfazerSaneamento('s_bruna', { registroId: hist[0].id, motivo: 'O.S. foi reaberta pelo cliente' }).message, /só quem marcou/);
  ok(a.ctx.Gestao_apiDesfazerSaneamento('s_dora', { registroId: hist[0].id, motivo: 'O.S. foi reaberta pelo cliente' }));
  const volta = a.tabelas.GES_SANEAMENTO.find((x) => x.ID === hist[0].id);
  assert.ok(volta.DESFEITO_EM && volta.DESFEITO_POR_NOME === 'DORA DIRETORA TESTE');
  a.sincronizar();
  const c3 = ok(a.ctx.Gestao_apiCaixa('s_dora', { filtro: 'todas' }));
  assert.equal(c3.resumoTodas.saneamento, 261, 'a O.S. desfeita volta para a caixa');
  const linha = a.tabelas.GES_DECISOES.filter((x) => x.ITEM_ID === volta.ITEM_ID);
  assert.equal(linha.length, 1, 'a mesma linha reabre (a idade não recomeça)');
  assert.equal(linha[0].SITUACAO, 'ABERTA');
  assert.match(a.ctx.Gestao_apiDesfazerSaneamento('s_dora', { registroId: hist[0].id, motivo: 'de novo por engano' }).message, /já foi desfeito/);
});

test('saneamento: dispensar o vínculo das O.S. de um técnico do Auvo sem cadastro', () => {
  const a = ambienteVolume();
  const s = ok(a.ctx.Gestao_apiSaneamento('s_dora', {}));
  const ids = s.semVinculo.itens.filter((x) => x.tecnico === 'CARLOS PARCEIRO AUVO').map((x) => x.id);
  assert.equal(ids.length, 20);
  const r = ok(a.ctx.Gestao_apiSanear('s_dora', { acao: 'VINCULO_DISPENSADO', itemIds: ids, motivo: 'Técnico parceiro que não terá acesso ao SGO+' }));
  assert.equal(r.saneados, 20);
  a.sincronizar();
  assert.equal(ok(a.ctx.Gestao_apiCaixa('s_dora', { filtro: 'todas' })).resumoTodas.cadastro, 40);
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
