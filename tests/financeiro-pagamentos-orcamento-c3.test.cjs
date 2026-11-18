// Onda C do Financeiro (18/11/2026), item C3: orçamento anual e acompanhamento. Decisões do dono de 18/11/2026: o SGO+ é a fonte do
// orçamento (por categoria e mês, com versão e motivo; importação de planilha, cópia do ano anterior e realizado como ponto de partida);
// só o dono e o Charles aprovam a versão vigente; a Wanessa prepara. O Omie só tem ListarOrcamentos (leitura): nada é gravado no Omie.
// Acompanhamento orçado × realizado por categoria e mês, na aba Indicadores (I15, G7) e no relatório semanal (seção nova).
// Código REAL do SGO+ com o OMIE SIMULADO (tests/_financeiro_b1c3.cjs); nada sai para a rede, nenhum e-mail real.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { montarB1C3 } = require('./_financeiro_b1c3.cjs');

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const CSV = 'codigo;descricao;' + MESES.join(';') + '\n' +
  '2.03;Combustível;5.000,00;5.000,00;5.000,00;5.000,00;5.000,00;5.000,00;5.000,00;5.000,00;5.000,00;5.000,00;4.000,00;5.000,00\n' +
  '2.10;Terceiros;;;;;;;;;;;3.000,00;\n';
/** Rascunho criado, planilha importada, enviado pela Wanessa e aprovado pela Diretoria. Devolve o id da versão. */
function vigente(a, ano) {
  const n = a.F('OmieOrc_apiNovo', 'wanessa', { ano: ano || 2026, partida: 'VAZIO' }); assert.equal(n.ok, true, n.mensagem);
  assert.equal(a.F('OmieOrc_apiImportar', 'wanessa', { versaoId: n.id, texto: CSV }).ok, true);
  assert.equal(a.F('OmieOrc_apiEnviar', 'wanessa', { versaoId: n.id, motivo: 'orçamento inicial combinado com a Diretoria' }).ok, true);
  const d = a.F('OmieOrc_apiDecidir', 'dora', { versaoId: n.id, decisao: 'aprovar' }); assert.equal(d.ok, true, d.mensagem);
  return n.id;
}

test('C3-1: rascunho no SGO+, alteração célula a célula (merge), categoria conferida no Omie, planilha CSV com merge e recusa clara', () => {
  const a = montarB1C3();
  const t0 = a.F('OmieOrc_apiTela', 'wanessa', { ano: 2026 });
  assert.equal(t0.ok, true, t0.mensagem); assert.equal(t0.vigente, null); assert.equal(t0.preparo, null); assert.equal(t0.podeEditar, true); assert.equal(t0.podeDecidir, false);
  assert.equal(t0.omieGrava, false, 'o Omie não tem gravação de orçamento pela API');
  const n = a.F('OmieOrc_apiNovo', 'wanessa', { ano: 2026, partida: 'VAZIO' });
  assert.equal(n.ok, true, n.mensagem); assert.match(n.mensagem, /Rascunho da versão 1 de 2026 criado \(em branco\)\. Confira/);
  assert.match(a.F('OmieOrc_apiNovo', 'wanessa', { ano: 2026, partida: 'VAZIO' }).mensagem, /Já existe uma versão de 2026 em preparação/);
  // categoria: só as do Omie, ativas, de despesa ou receita
  let s = a.F('OmieOrc_apiSalvar', 'wanessa', { versaoId: n.id, adicionar: [{ codigo: '9.01' }] });
  assert.equal(s.ok, false); assert.match(s.mensagem, /não existe no Omie, está inativa, é grupo ou é de transferência[\s\S]*Nada foi gravado/);
  assert.match(a.F('OmieOrc_apiSalvar', 'wanessa', { versaoId: n.id, adicionar: [{ codigo: '2.09' }] }).mensagem, /Nada foi gravado/);
  s = a.F('OmieOrc_apiSalvar', 'wanessa', { versaoId: n.id, adicionar: [{ codigo: '2.03' }, { codigo: '1.01' }] });
  assert.equal(s.ok, true, s.mensagem);
  s = a.F('OmieOrc_apiSalvar', 'wanessa', { versaoId: n.id, alteracoes: [{ codigo: '2.03', mes: 1, valor: '1.250,50' }, { codigo: '1.01', mes: 2, valor: '10000' }] });
  assert.equal(s.ok, true, s.mensagem);
  assert.match(a.F('OmieOrc_apiSalvar', 'wanessa', { versaoId: n.id, alteracoes: [{ codigo: '2.03', mes: 3, valor: '12,3,4' }] }).mensagem, /Valor inválido em Combustível, mar[\s\S]*Nada foi gravado/);
  // a segunda gravação não apaga a primeira (só a célula mudada)
  assert.equal(a.F('OmieOrc_apiSalvar', 'wanessa', { versaoId: n.id, alteracoes: [{ codigo: '2.03', mes: 2, valor: '900' }] }).ok, true);
  let tela = a.F('OmieOrc_apiTela', 'wanessa', { ano: 2026 });
  const l = (cod) => tela.preparo.linhas.find((x) => x.codigo === cod);
  assert.deepEqual(l('2.03').meses.slice(0, 3), [1250.5, 900, null]); assert.equal(l('2.03').natureza, 'despesa');
  assert.deepEqual(l('1.01').meses.slice(0, 2), [null, 10000]); assert.equal(l('1.01').natureza, 'receita');
  // planilha: categoria inexistente recusa tudo
  let im = a.F('OmieOrc_apiImportar', 'wanessa', { versaoId: n.id, texto: '7.77;Inventada;1;2;3;4;5;6;7;8;9;10;11;12' });
  assert.equal(im.ok, false); assert.match(im.mensagem, /não existem no Omie[\s\S]*7\.77[\s\S]*Nada foi importado/);
  im = a.F('OmieOrc_apiImportar', 'wanessa', { versaoId: n.id, texto: CSV.replace('5.000,00;4.000,00', '5.000,00;abc') });
  assert.equal(im.ok, false); assert.match(im.mensagem, /Linha 2, nov: o valor "abc" não é válido[\s\S]*Nada foi importado/);
  im = a.F('OmieOrc_apiImportar', 'wanessa', { versaoId: n.id, texto: CSV });
  assert.equal(im.ok, true, im.mensagem); assert.match(im.mensagem, /2 categoria\(s\), 13 valor\(es\) gravado\(s\), 1 categoria\(s\) nova\(s\)/);
  tela = a.F('OmieOrc_apiTela', 'wanessa', { ano: 2026 });
  assert.deepEqual(l('2.10').meses, [null, null, null, null, null, null, null, null, null, null, 3000, null]);
  assert.equal(l('1.01').meses[1], 10000, 'célula fora da planilha fica como estava');
  assert.equal(tela.preparo.totalDespesa, 'R$ 62.000,00');
  // retirar uma categoria
  assert.equal(a.F('OmieOrc_apiSalvar', 'wanessa', { versaoId: n.id, remover: ['1.01'] }).ok, true);
  assert.equal(a.F('OmieOrc_apiTela', 'wanessa', { ano: 2026 }).preparo.linhas.length, 2);
  assert.equal(a.escritas().length, 0, 'nada é gravado no Omie');
});

test('C3-2: só o dono e a Diretoria aprovam a versão vigente; quem preparou não aprova; recusa com motivo; nova versão substitui a anterior', () => {
  const a = montarB1C3();
  const n = a.F('OmieOrc_apiNovo', 'wanessa', { ano: 2026, partida: 'VAZIO' });
  assert.match(a.F('OmieOrc_apiEnviar', 'wanessa', { versaoId: n.id, motivo: 'orçamento de 2026 inicial' }).mensagem, /sem nenhum valor[\s\S]*Nada foi enviado/);
  a.F('OmieOrc_apiImportar', 'wanessa', { versaoId: n.id, texto: CSV });
  assert.match(a.F('OmieOrc_apiEnviar', 'wanessa', { versaoId: n.id, motivo: 'curto' }).mensagem, /pelo menos 15 letras/);
  const e = a.F('OmieOrc_apiEnviar', 'wanessa', { versaoId: n.id, motivo: 'orçamento inicial combinado com a Diretoria' });
  assert.equal(e.ok, true, e.mensagem); assert.match(e.mensagem, /Quem aprova: DORA DIRETORA TESTE ou DONO DO SISTEMA TESTE/);
  assert.equal(a.avisos.length, 1); assert.deepEqual(a.avisos[0].usuarios.slice().sort(), ['u_adm', 'u_dir']);
  assert.ok(!/R\$/.test(a.avisos[0].titulo + a.avisos[0].texto));
  // enviado: não muda mais
  assert.match(a.F('OmieOrc_apiSalvar', 'wanessa', { versaoId: n.id, alteracoes: [{ codigo: '2.03', mes: 1, valor: '1' }] }).mensagem, /não está em preparação/);
  // pendência para o dono e a Diretoria; o Financeiro não decide
  assert.equal(a.pend('dora').filter((x) => x.tipo === 'fin_orc_aprovar').length, 1);
  assert.equal(a.pend('wanessa').filter((x) => x.tipo === 'fin_orc_aprovar').length, 0);
  for (const login of ['wanessa', 'fabio']) {
    const d = a.F('OmieOrc_apiDecidir', login, { versaoId: n.id, decisao: 'aprovar' });
    assert.equal(d.ok, false); assert.match(d.mensagem, /Você não aprova o orçamento: por decisão do dono[\s\S]*Nada foi alterado/);
  }
  assert.match(a.F('OmieOrc_apiDecidir', 'dora', { versaoId: n.id, decisao: 'recusar', motivo: 'x' }).mensagem, /pelo menos 10 letras/);
  let d = a.F('OmieOrc_apiDecidir', 'dora', { versaoId: n.id, decisao: 'aprovar' });
  assert.equal(d.ok, true, d.mensagem); assert.match(d.mensagem, /é o orçamento vigente de 2026[\s\S]*O Omie não recebe orçamento pela API/);
  let tela = a.F('OmieOrc_apiTela', 'dora', { ano: 2026 });
  assert.equal(tela.vigente.versao, 1); assert.equal(tela.vigente.decididaPor, 'DORA DIRETORA TESTE');
  // revisão: a Diretoria prepara, ela mesma não aprova; o dono aprova; a versão 1 fica substituída
  const r = a.F('OmieOrc_apiNovo', 'dora', { ano: 2026, partida: 'COPIA_VIGENTE' });
  assert.equal(r.ok, true, r.mensagem); assert.match(r.mensagem, /versão 2 de 2026[\s\S]*A partir da versão 1 de 2026/);
  assert.equal(a.F('OmieOrc_apiSalvar', 'dora', { versaoId: r.id, alteracoes: [{ codigo: '2.03', mes: 12, valor: '6.000,00' }] }).ok, true);
  assert.equal(a.F('OmieOrc_apiEnviar', 'dora', { versaoId: r.id, motivo: 'reajuste do combustível em dezembro' }).ok, true);
  d = a.F('OmieOrc_apiDecidir', 'dora', { versaoId: r.id, decisao: 'aprovar' });
  assert.equal(d.ok, false); assert.match(d.mensagem, /Quem preparou a versão não aprova a própria versão/);
  d = a.F('OmieOrc_apiDecidir', 'admin', { versaoId: r.id, decisao: 'aprovar', motivo: 'de acordo' });
  assert.equal(d.ok, true, d.mensagem); assert.match(d.mensagem, /a versão 1 ficou como substituída/);
  tela = a.F('OmieOrc_apiTela', 'wanessa', { ano: 2026 });
  assert.equal(tela.vigente.versao, 2); assert.equal(tela.vigente.linhas.find((x) => x.codigo === '2.03').meses[11], 6000);
  assert.deepEqual(tela.versoes.map((v) => [v.versao, v.situacao]), [[2, 'VIGENTE'], [1, 'SUBSTITUIDA']]);
  // recusa: a vigente continua
  const v3 = a.F('OmieOrc_apiNovo', 'wanessa', { ano: 2026, partida: 'COPIA_VIGENTE' });
  a.F('OmieOrc_apiSalvar', 'wanessa', { versaoId: v3.id, alteracoes: [{ codigo: '2.10', mes: 12, valor: '99.000,00' }] });
  a.F('OmieOrc_apiEnviar', 'wanessa', { versaoId: v3.id, motivo: 'contratação de terceiros em dezembro' });
  d = a.F('OmieOrc_apiDecidir', 'dora', { versaoId: v3.id, decisao: 'recusar', motivo: 'valor alto demais para dezembro' });
  assert.equal(d.ok, true); assert.equal(a.F('OmieOrc_apiTela', 'wanessa', { ano: 2026 }).vigente.versao, 2);
  // cópia do ano anterior para 2027
  const c27 = a.F('OmieOrc_apiNovo', 'wanessa', { ano: 2027, partida: 'COPIA_ANO_ANTERIOR' });
  assert.equal(c27.ok, true, c27.mensagem); assert.match(c27.mensagem, /A partir da versão 2 de 2026/);
  assert.equal(a.escritas().length, 0, 'nada é gravado no Omie');
  assert.ok(a.acessos().some((x) => x.CONSULTA === 'OmieOrc_apiDecidir' && x.RESULTADO === 'NEGADO'));
});

test('C3-3: acompanhamento orçado × realizado: lê o mês no Omie (só leitura), guarda o realizado, desvio por categoria e acumulado só dos meses lidos', () => {
  const a = montarB1C3();
  vigente(a);
  let r = a.F('OmieOrc_apiAcompanhar', 'wanessa', { mes: '2026-11' });
  assert.equal(r.ok, true, r.mensagem); assert.equal(r.acompanhamento.lidoEm, ''); assert.equal(r.acompanhamento.linhas[0].realizado, null);
  r = a.F('OmieOrc_apiAcompanhar', 'wanessa', { mes: '2026-11', ler: true });
  assert.equal(r.ok, true, r.mensagem); assert.match(r.aviso, /Realizado de novembro de 2026 lido agora do Omie/);
  assert.ok(a.rico.concat(a.omie).some((c) => c.call === 'ListarOrcamentos'));
  const ac = r.acompanhamento, l = (cod) => ac.linhas.find((x) => x.codigo === cod);
  assert.deepEqual([l('2.03').orcado, l('2.03').realizado, l('2.03').desvio, l('2.03').desvioPct, l('2.03').desfavoravel], [4000, 5000, 1000, 25, true]);
  assert.deepEqual([l('2.10').orcado, l('2.10').realizado, l('2.10').desvio, l('2.10').desfavoravel], [3000, 0, -3000, false]);
  assert.equal(ac.linhas[0].codigo, '2.03', 'o desfavorável vem primeiro');
  assert.equal(l('2.03').acOrcado, 4000, 'acumulado: só novembro foi lido; o orçado dos outros meses não entra');
  assert.match(ac.naoLidos.join(','), /^jan,fev,mar,abr,mai,jun,jul,ago,set,out$/);
  assert.equal((a.tabelas.FIN_ORC_REALIZADO || []).filter((x) => x.MES === '2026-11').length, 2);
  // categoria com realizado e sem orçamento
  a.orcPorMes['2026-10'] = [{ cCodCateg: '2.03', cDesCateg: 'Combustível', nValorPrevisto: 0, nValorRealilzado: 4500 }, { cCodCateg: '2.99', cDesCateg: 'Despesa nova', nValorPrevisto: 0, nValorRealilzado: 700 }];
  r = a.F('OmieOrc_apiAcompanhar', 'wanessa', { mes: '2026-10', ler: true });
  assert.equal(r.ok, true);
  assert.deepEqual(r.acompanhamento.linhas.filter((x) => x.semOrcamento).map((x) => [x.codigo, x.realizado]), [['2.99', 700]]);
  r = a.F('OmieOrc_apiAcompanhar', 'wanessa', { mes: '2026-11' });
  assert.deepEqual([r.acompanhamento.linhas.find((x) => x.codigo === '2.03').acOrcado, r.acompanhamento.linhas.find((x) => x.codigo === '2.03').acRealizado], [9000, 9500]);
  // mês que não começou: não lê
  assert.match(a.F('OmieOrc_apiAcompanhar', 'wanessa', { mes: '2026-12', ler: true }).mensagem, /ainda não começou/);
  assert.equal(a.escritas().length, 0);
});

test('C3-4: ponto de partida "realizado do ano anterior": usa o que foi lido do Omie e diz quais meses ficaram vazios', () => {
  const a = montarB1C3();
  let n = a.F('OmieOrc_apiNovo', 'wanessa', { ano: 2027, partida: 'REALIZADO_ANO_ANTERIOR' });
  assert.equal(n.ok, false); assert.match(n.mensagem, /ainda não leu do Omie nenhum mês de 2026[\s\S]*Ler o realizado deste mês no Omie/);
  assert.equal(a.F('OmieOrc_apiAcompanhar', 'wanessa', { mes: '2026-11', ler: true }).ok, true);
  n = a.F('OmieOrc_apiNovo', 'wanessa', { ano: 2027, partida: 'REALIZADO_ANO_ANTERIOR' });
  assert.equal(n.ok, true, n.mensagem); assert.match(n.mensagem, /Realizado de 2026 lido do Omie: nov\. Meses ainda não lidos \(ficaram vazios\): jan, fev/);
  const p = a.F('OmieOrc_apiTela', 'wanessa', { ano: 2027 }).preparo;
  assert.deepEqual(p.linhas.map((l) => [l.codigo, l.descricao, l.meses[10]]), [['2.03', 'Combustível', 5000]], 'categoria sem realizado não entra');
});

test('C3-5: Indicadores (I15 e G7) e relatório semanal usam o orçado do SGO+ com versão vigente; sem ela, ficam como antes', () => {
  const a = montarB1C3({ agora: '2026-11-16T06:00:00-03:00' });
  vigente(a);
  a.em('2026-11-16T06:15:00-03:00'); a.limpar();
  const f = a.foto(); assert.ok(f.concluida, JSON.stringify(f));
  const foto = a.j(a.ctx.FinFoto_lista_()[0]), ind = JSON.parse(foto.INDICADORES_JSON), extra = JSON.parse(foto.EXTRA_JSON);
  assert.equal(ind.I15.valor, 71.4, '5.000 realizado / 7.000 orçado no SGO+');
  assert.match(ind.I15.detalhe, /Previsto R\$ 7\.000,00, realizado R\$ 5\.000,00 \(2 categorias; orçado da versão 1 aprovada no SGO\+, realizado do Omie\)/);
  assert.deepEqual(extra.orc.map((o) => [o.categoria, o.previsto, o.realizado, o.fonte]), [['Combustível', 4000, 5000, 'SGO+'], ['Serviços de terceiros', 3000, 0, 'SGO+']]);
  // relatório semanal: seção nova, no índice e no corpo
  a.em('2026-11-16T10:00:00-03:00');
  const g = a.j(a.ctx.FinRel_apiGerar('s_wanessa')); assert.equal(g.ok, true, g.mensagem);
  const html = a.j(a.ctx.FinRel_apiAbrir('s_dora', { id: g.id })).html;
  assert.match(html, /<a href="#fr-orcamento">Orçamento: orçado × realizado<\/a>/);
  assert.match(html, /id="fr-orcamento"[\s\S]*Orçamento vigente: versão 1, aprovada por DORA DIRETORA TESTE[\s\S]*Maiores desvios de novembro de 2026/);
  assert.ok(html.indexOf('id="fr-resultado"') < html.indexOf('id="fr-orcamento"') && html.indexOf('id="fr-orcamento"') < html.indexOf('id="fr-caju"'));
});

test('C3-6: sem orçamento aprovado no SGO+, a fotografia guarda o realizado e os indicadores usam o Omie como antes', () => {
  const a = montarB1C3({ foto: true });
  const foto = a.j(a.ctx.FinFoto_lista_()[0]), ind = JSON.parse(foto.INDICADORES_JSON);
  assert.equal(ind.I15.valor, 50, 'previsto do Omie (10.000) e realizado (5.000), como antes');
  assert.ok(!/SGO\+/.test(ind.I15.detalhe));
  assert.equal((a.tabelas.FIN_ORC_REALIZADO || []).filter((x) => x.MES === '2026-11').length, 2, 'o realizado do mês fica guardado');
  assert.match(a.j(a.ctx.FinOrc_relatorioSemanalHtml_('2026-11-16')), /Não há orçamento aprovado no SGO\+ para 2026/);
});
