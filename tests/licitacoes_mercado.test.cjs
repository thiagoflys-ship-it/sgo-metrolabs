// SGO+ Licitações, fornecedores, concorrentes e inteligência de mercado (03/11/2026): CNPJ validado e normalizado (numérico e
// alfanumérico), cadastro sem duplicar por CNPJ, mescla que só preenche campo vazio (valor diferente vira variante, com histórico),
// mudança da Diretoria com motivo (de → para), espelho dos resultados do PNCP pelo cursor (idempotente, versão nova da fonte com
// histórico, pessoa física sem identificação), vencedores e concorrentes das disputas (nome sem CNPJ ligado só pela Diretoria), as
// contas (participações, vitórias, desconto, quem ganha no órgão, mediana e quartis, amostra pequena, sem dados, unidade, período,
// cancelados), a aba Mercado da ficha (comparação com a simulação, pedido ao coletor), o preço por área no pedido de parecer, as
// permissões, os registros manuais (fonte obrigatória, anulação sem apagar), a tela vazia que diz o porquê e as ligações (menu, ficha,
// ajuda, manual, assistente, CRLF). Código real do SGO+ num contexto isolado com relógio controlado; CNPJs, órgãos e pessoas fictícios.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { ambiente, OP, USUARIOS, J, ler } = require('./_licitacoes_alertas_ambiente.cjs');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const raiz = path.join(__dirname, '..');
const lerCru = (f) => fs.readFileSync(path.join(pasta, f), 'utf8');

const EXTRA = [
  { ID: 'u_fab', USUARIO: 'fabio', NOME: 'FABIO FINANCEIRO TESTE', PERFIL: 'FINANCEIRO', STATUS: 'ATIVO', EMAIL: 'fabio@exemplo.test', CELULAR: '62999990025', VINCULO_TRABALHO: 'CLT', AREA: 'FINANCEIRO' }
];
// CNPJs fictícios com os dígitos conferidos
const C1 = '11222333000181', C2 = '11444777000161', C3 = '12ABC34501DE35';
const ORGAO = '78680337000770';

/** Resultado como o servidor devolve (servicos/licitacoes/mercado.ts, listar). */
function RES(id, o) {
  o = o || {};
  const nc = o.nc || '78680337000770-1-000100/2026', item = o.item || 1;
  return { id: String(id), chave: 'PNCP:' + nc, numeroItem: item, sequencial: o.seq || 1, hash: o.hash || ('h' + id), coletadoEm: '2026-11-01T12:00:00.000Z',
    fornecedor: o.pf ? { cnpj: '', cnpjInformado: '', tipoPessoa: 'PF', nome: 'Pessoa física', porte: '' } : { cnpj: o.cnpj === undefined ? C1 : o.cnpj, cnpjInformado: o.cnpj === undefined ? C1 : o.cnpj, tipoPessoa: 'PJ', nome: o.nome || 'CALIBRA TESTE LTDA', porte: o.porte === undefined ? 'ME' : o.porte },
    valorUnitarioHomologado: o.valor === undefined ? 150 : o.valor, valorTotalHomologado: (o.valor === undefined ? 150 : o.valor) * 10, quantidadeHomologada: 10, percentualDesconto: 25,
    situacao: o.situacao || 'Informado', dataResultado: o.data || '2026-10-28', ordemClassificacao: o.ordem === undefined ? null : o.ordem,
    contratacao: { chave: 'PNCP:' + nc, numeroControlePncp: nc, orgaoCnpj: o.orgaoCnpj === undefined ? ORGAO : o.orgaoCnpj, orgaoNome: o.orgao || 'UNIVERSIDADE ESTADUAL DO OESTE DO PARANA', uf: o.uf || 'PR', municipio: 'Cascavel',
      modalidadeNome: 'Pregão - Eletrônico', objeto: o.objeto || 'Serviços técnicos', encerramentoEm: '2026-10-20T12:00:00.000Z', linkPncp: 'https://pncp.gov.br/app/editais/' + nc.slice(0, 14) + '/2026/100' },
    item: { numeroItem: item, descricao: o.descricao || 'Calibração de termômetro digital com certificado', materialServico: 'S', quantidade: 10, unidade: o.unidade || 'Unidade', valorUnitarioEstimado: o.estimado === undefined ? 200 : o.estimado },
    fonte: { portal: 'PNCP', url: 'https://pncp.gov.br/api/pncp/v1/orgaos/' + nc.slice(0, 14) + '/compras/2026/100/itens/' + item + '/resultados' } };
}

function amb(o) {
  o = o || {};
  const a = ambiente({ agora: o.agora || '2026-11-03T10:00:00-03:00', tabelas: { CAD_USUARIOS: USUARIOS.concat(EXTRA).map((u) => Object.assign({}, u)) },
    ops: [OP('op1', { SITUACAO: 'ANALISE', ORGAO_CNPJ: ORGAO, CHAVE_FONTE: 'PNCP:78680337000770-1-000430/2026', OBJETO: 'Calibração de termômetros e manutenção preventiva de autoclaves', LINK_PNCP: 'https://pncp.gov.br/app/editais/78680337000770/2026/430' }),
      OP('op2', { CODIGO: 'LIC-2026-0002', CHAVE_FONTE: 'CGOV:123', ORGAO_NOME: 'HOSPITAL ESTADUAL TESTE', UF: 'GO' })] });
  for (const f of ['SGO_Licitacoes_Painel.js', 'SGO_Licitacoes_Pareceres.js', 'SGO_Licitacoes_Disputa.js', 'SGO_Licitacoes_Mercado.js', 'SGO_Ajuda_LicitacoesMercado.js']) vm.runInContext(ler(f), a.ctx, { filename: f });
  Object.assign(a.sessoes, { s_fab: { userId: 'u_fab', usuario: 'fabio', nome: 'FABIO FINANCEIRO TESTE', perfil: 'FINANCEIRO' } });
  // o coletor do servidor (SGO_LICITACOES) simulado: a fila de resultados por cursor do id e os pedidos
  a.srv = { res: [], pedidos: [], situacao: { fila: 3, lidas: 2, completas: 1, resultados: 0, comErro: 0, ultimaLeituraEm: '2026-11-03T12:00:00.000Z' } };
  if (o.coletor !== false) a.ctx.SGO_LICITACOES = {
    listar: () => ({ itens: [], ate: '', mais: false }),
    mercadoListar: (f) => { const d = Number(f.desde) || 0, l = a.srv.res.filter((x) => Number(x.id) > d), lim = f.limite || 200; return { itens: l.slice(0, lim), ate: l.length ? l.slice(0, lim).slice(-1)[0].id : String(d), mais: l.length > lim }; },
    mercadoPedir: (f) => { a.srv.pedidos.push(f); return /^PNCP:/.test(f.chave) ? { ok: true } : { ok: false, motivo: 'chave desconhecida' }; },
    mercadoSituacao: (f) => (f && f.chave ? { naFila: false } : a.srv.situacao)
  };
  a.m = (sid, op, d) => J(a.ctx.Licitacoes_api(sid, 'mercado', Object.assign({ op }, d || {})));
  a.ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
  a.forn = (c) => (a.tabelas.LIC_FORNECEDORES || []).filter((f) => !c || f.CNPJ === c);
  a.hist = (tipo) => (a.tabelas.LIC_HISTORICO || []).filter((h) => !tipo || h.TIPO === tipo);
  a.sinc = () => a.ok(a.m('s_cha', 'sincronizar')).sincronia;
  /** resultado da disputa (com o hash certo da Disputa) e a disputa com o item na base */
  a.disputa = (did, oid, itens) => { a.tabelas.LIC_DISPUTAS = a.tabelas.LIC_DISPUTAS || []; a.tabelas.LIC_DISPUTAS.push({ ID: did, OPORTUNIDADE_ID: oid, CODIGO: 'LIC-' + oid, BASE_JSON: JSON.stringify({ itens: itens.map((i) => ({ item: i.item, descricao: i.descricao, precoEdital: i.edital })) }) }); };
  a.resultado = (x) => { a.tabelas.LIC_RESULTADOS = a.tabelas.LIC_RESULTADOS || []; const r = Object.assign({ ID: 'r' + Math.random().toString(36).slice(2, 7), VERSAO: 1, CODIGO: 'LIC-2026-op1', FONTE: 'ata da sessão', EM: '2026-10-29T12:00:00.000Z', POR_ID: 'u_cha' }, x); r.HASH = a.ctx.LicD_hashResultado_(r); a.tabelas.LIC_RESULTADOS.push(r); return r; };
  a.lance = (x) => { a.tabelas.LIC_DISPUTA_LANCES = a.tabelas.LIC_DISPUTA_LANCES || []; a.tabelas.LIC_DISPUTA_LANCES.push(Object.assign({ ID: 'l' + Math.random().toString(36).slice(2, 7), TIPO: 'LANCE', AUTOR: 'CONCORRENTE', QUANDO: '2026-10-29T13:00:00.000Z', CODIGO: 'LIC-x' }, x)); };
  return a;
}

// ------------------------------------------------------------------ CNPJ e cadastro
test('CNPJ: numérico, alfanumérico e com zeros perdidos conferidos pelos dígitos; inválido recusado com o que fazer; cadastro não duplica por CNPJ', () => {
  const a = amb();
  const c = a.ctx.LicM_cnpj_;
  assert.equal(c('11.222.333/0001-81'), C1);
  assert.equal(c('12.abc.345/01de-35'), C3, 'alfanumérico, minúscula vira maiúscula');
  assert.equal(c('192'), '', 'curto que não fecha nos dígitos');
  assert.equal(c('644704000105'), '00644704000105', 'zeros perdidos (planilha) recuperados quando o preenchimento confere');
  assert.equal(c('644704000106'), '', 'preenchido que não confere não vira CNPJ');
  assert.equal(c('11.222.333/0001-82'), ''); assert.equal(c('00000000000000'), ''); assert.equal(c('11111111111111'), '');
  const r = a.m('s_cha', 'fornecedorSalvar', { cnpj: '11.222.333/0001-82', campos: { RAZAO_SOCIAL: 'CALIBRA TESTE LTDA' }, motivo: 'Cadastro a partir da ata' });
  assert.equal(r.ok, false); assert.match(r.message, /não confere nos dígitos verificadores.*Nada foi gravado/);
  assert.match(a.m('s_cha', 'fornecedorSalvar', { cnpj: C1, campos: { RAZAO_SOCIAL: 'CALIBRA TESTE LTDA' }, motivo: 'curto' }).message, /motivo.*pelo menos 10 letras/);
  assert.match(a.m('s_cha', 'fornecedorSalvar', { cnpj: C1, campos: { RAZAO_SOCIAL: 'CALIBRA', UF: 'XX' }, motivo: 'Cadastro a partir da ata' }).message, /a UF "XX" não existe/);
  assert.match(a.m('s_cha', 'fornecedorSalvar', { cnpj: C1, campos: {}, motivo: 'Cadastro a partir da ata' }).message, /Escreva a razão social/);
  const n = a.ok(a.m('s_cha', 'fornecedorSalvar', { cnpj: '11.222.333/0001-81', campos: { RAZAO_SOCIAL: 'CALIBRA TESTE LTDA', UF: 'go', PORTE: 'EPP' }, motivo: 'Cadastro a partir da ata' }));
  assert.equal(n.novo, true); assert.equal(n.fornecedor.cnpjTxt, '11.222.333/0001-81'); assert.equal(n.fornecedor.uf, 'GO'); assert.equal(n.fornecedor.porte, 'EPP');
  // o mesmo CNPJ escrito de outro jeito muda o cadastro existente (não cria outro)
  const m = a.ok(a.m('s_cha', 'fornecedorSalvar', { cnpj: '11222333000181', campos: { MUNICIPIO: 'Goiânia', RAZAO_SOCIAL: '' }, motivo: 'Município conferido no cartão CNPJ' }));
  assert.equal(a.forn().length, 1);
  assert.equal(m.fornecedor.razaoSocial, 'CALIBRA TESTE LTDA', 'campo em branco não apaga');
  assert.equal(m.fornecedor.municipio, 'Goiânia'); assert.equal(m.fornecedor.versao, 2);
  assert.ok(a.hist('FORNECEDOR_CAMPO').some((h) => h.DE === '' && h.PARA === 'Goiânia' && /Motivo: Município conferido/.test(h.TEXTO) && h.USUARIO_NOME === 'CHARLES DIRETOR TESTE'));
  assert.equal(a.ok(a.m('s_cha', 'fornecedorSalvar', { cnpj: C1, campos: { MUNICIPIO: 'Goiânia' }, motivo: 'Nada muda aqui de novo' })).semMudanca, true);
});

// ------------------------------------------------------------------ espelho dos resultados do PNCP
test('sincronização: espelho pelo cursor, idempotente; pessoa física sem identificação; versão nova da fonte com histórico; mescla preenche o vazio e guarda a variante', () => {
  const a = amb();
  a.srv.res = [RES(1, { porte: '' }), RES(2, { item: 2, pf: true }), RES(3, { item: 3, cnpj: C3, nome: 'OUTRA CALIBRA TESTE SA', porte: 'Demais' })];
  let s = a.sinc();
  assert.equal(s.novos, 3); assert.equal(s.fornecedoresNovos, 2); assert.equal(s.semCnpj, 1);
  assert.equal(a.tabelas.LIC_MERCADO_RESULTADOS.length, 3);
  const pf = a.tabelas.LIC_MERCADO_RESULTADOS.find((r) => r.ITEM === '2');
  assert.equal(pf.FORNECEDOR_CNPJ, ''); assert.equal(pf.FORNECEDOR_NOME, 'Pessoa física');
  assert.equal(a.tabelas.LIC_MERCADO_RESULTADOS[0].OPORTUNIDADE_ID, '', 'contratação que não está nas oportunidades');
  assert.equal(a.forn(C1)[0].ORIGEM, 'COLETOR'); assert.ok(!a.forn(C1)[0].PORTE, 'a fonte não trouxe o porte');
  // de novo: nada muda (cursor e hash)
  const h0 = a.hist().length, f0 = JSON.stringify(a.tabelas.LIC_FORNECEDORES);
  s = a.sinc();
  assert.equal(s.novos + s.mudaram, 0); assert.equal(a.hist().length, h0); assert.equal(JSON.stringify(a.tabelas.LIC_FORNECEDORES), f0);
  // versão nova da fonte (valor corrigido) + a mesma empresa com outra razão social e com o porte (que estava vazio)
  a.srv.res.push(RES(4, { hash: 'h1b', valor: 140, nome: 'CALIBRA TESTE LTDA EPP NOVA', porte: 'EPP' }));
  s = a.sinc();
  assert.equal(s.mudaram, 1); assert.equal(s.novos, 0);
  const r1 = a.tabelas.LIC_MERCADO_RESULTADOS.find((r) => r.ITEM === '1');
  assert.equal(r1.VERSAO, 2); assert.equal(r1.VALOR_UNIT_HOMOLOGADO, 140);
  assert.ok(a.hist('MERCADO_RESULTADO_MUDOU').some((h) => /Valor unitário homologado: "150" → "140"/.test(h.TEXTO)));
  const f = a.forn(C1)[0];
  assert.equal(f.RAZAO_SOCIAL, 'CALIBRA TESTE LTDA', 'valor diferente não sobrescreve');
  assert.equal(f.PORTE, 'EPP', 'campo vazio é preenchido');
  assert.deepEqual(JSON.parse(f.VARIANTES_JSON).map((v) => [v.campo, v.valor, v.origem]), [['RAZAO_SOCIAL', 'CALIBRA TESTE LTDA EPP NOVA', 'COLETOR']]);
  assert.ok(a.hist('FORNECEDOR_VARIANTE').some((h) => h.DE === 'CALIBRA TESTE LTDA' && h.PARA === 'CALIBRA TESTE LTDA EPP NOVA' && /não muda sozinho/.test(h.TEXTO)));
  // a Diretoria escolhe a variante, com o motivo: de → para no histórico e a variante sai da lista
  const fx = a.ok(a.m('s_cha', 'fornecedor', { cnpj: C1 })).fornecedor;
  assert.equal(fx.variantes.length, 1);
  a.ok(a.m('s_cha', 'fornecedorSalvar', { cnpj: C1, campos: { RAZAO_SOCIAL: fx.variantes[0].valor }, motivo: 'Cartão CNPJ confirma o nome novo' }));
  const fy = a.ok(a.m('s_cha', 'fornecedor', { cnpj: C1 }));
  assert.equal(fy.fornecedor.razaoSocial, 'CALIBRA TESTE LTDA EPP NOVA'); assert.equal(fy.fornecedor.variantes.length, 0);
  assert.equal(fy.fornecedor.campos.find((c) => c.campo === 'RAZAO_SOCIAL').origem, 'MANUAL');
  assert.ok(fy.historico.some((h) => h.de === 'CALIBRA TESTE LTDA' && h.para === 'CALIBRA TESTE LTDA EPP NOVA' && /Cartão CNPJ confirma/.test(h.texto)));
  assert.equal(a.tabelas.LIC_FORNECEDORES.length, 2, 'nunca duplica');
});

// ------------------------------------------------------------------ disputas da Metrolabs
test('disputas: vencedor com CNPJ entra no cadastro (origem Disputa); ganho é a Metrolabs (fora dos concorrentes); nome dos lances sem CNPJ só conta para o CNPJ quando a Diretoria liga', () => {
  const a = amb();
  a.disputa('d1', 'op1', [{ item: '1', descricao: 'Calibração de termômetro digital', edital: 200 }, { item: '2', descricao: 'Calibração de termômetro tipo espeto', edital: 400 }]);
  a.resultado({ DISPUTA_ID: 'd1', OPORTUNIDADE_ID: 'op1', ITEM: '1', SITUACAO: 'GANHO', VENCEDOR: 'Metrolabs (nós)', VALOR_FINAL: 185 });
  a.resultado({ DISPUTA_ID: 'd1', OPORTUNIDADE_ID: 'op1', ITEM: '2', SITUACAO: 'PERDIDO', VENCEDOR: 'Termo Rival Teste', VENCEDOR_CNPJ: '11.444.777/0001-61', VALOR_FINAL: 300 });
  // versão 2 do item 2 com o hash errado (alterada fora do SGO+) não vale: fica a versão 1
  const ruim = a.resultado({ DISPUTA_ID: 'd1', OPORTUNIDADE_ID: 'op1', ITEM: '2', VERSAO: 2, SITUACAO: 'PERDIDO', VENCEDOR: 'Outro', VALOR_FINAL: 1 }); ruim.HASH = 'x';
  a.lance({ DISPUTA_ID: 'd1', OPORTUNIDADE_ID: 'op1', ITEM: '1', CONCORRENTE: 'Calibra Sul', VALOR: 190 });
  a.lance({ DISPUTA_ID: 'd1', OPORTUNIDADE_ID: 'op1', ITEM: '1', CONCORRENTE: 'CALIBRA SUL ', VALOR: 188 });   // o mesmo nome (sem acento/caixa) conta uma vez
  const s = a.sinc();
  assert.equal(s.coletor, undefined);
  const f = a.forn(C2)[0];
  assert.equal(f.RAZAO_SOCIAL, 'Termo Rival Teste'); assert.equal(f.ORIGEM, 'DISPUTA'); assert.deepEqual(JSON.parse(f.APELIDOS_JSON), ['termo rival teste']);
  a.sinc(); assert.equal(a.forn().length, 1, 'a mesma disputa lida de novo não duplica nem muda');
  const conc = a.ok(a.m('s_cha', 'concorrentes')).lista;
  assert.ok(!conc.some((c) => /Metrolabs/.test(c.nome)), 'a Metrolabs não é concorrente');
  const rival = conc.find((c) => c.cnpj === C2);
  assert.equal(rival.vitorias, 1); assert.equal(rival.participacoes, 1); assert.equal(rival.desconto.media, 25, '1 − 300/400');
  const sul = conc.find((c) => c.semCnpj);
  assert.equal(sul.nome, 'Calibra Sul'); assert.equal(sul.participacoes, 1); assert.equal(sul.vitorias, 0);
  const tela = a.ok(a.m('s_cha', 'tela'));
  assert.deepEqual(tela.semCnpj.map((x) => x.nome), ['Calibra Sul']);
  // o órgão: a Metrolabs aparece como "nós" no ranking do órgão
  const org = a.ok(a.m('s_cha', 'orgaos')).lista[0];
  assert.equal(org.contratacoes, 1); assert.ok(org.vencedores.some((v) => v.proprio && v.nome === 'Metrolabs (nós)'));
  // ligar o nome ao CNPJ (ação da Diretoria, com motivo): cadastra e junta as participações; o mesmo nome não liga a outro CNPJ
  assert.match(a.m('s_cha', 'vincular', { nome: 'Calibra Sul', cnpj: C1, motivo: 'curto' }).message, /pelo menos 10 letras/);
  a.ok(a.m('s_cha', 'vincular', { nome: 'Calibra Sul', cnpj: C1, razaoSocial: 'CALIBRA SUL TESTE LTDA', motivo: 'CNPJ conferido na ata da sessão' }));
  assert.equal(a.forn(C1)[0].RAZAO_SOCIAL, 'CALIBRA SUL TESTE LTDA');
  const c2 = a.ok(a.m('s_cha', 'concorrentes')).lista;
  assert.equal(c2.filter((c) => c.semCnpj).length, 0); assert.equal(c2.find((c) => c.cnpj === C1).participacoes, 1);
  const r = a.m('s_cha', 'vincular', { nome: 'calibra sul', cnpj: C2, motivo: 'Tentativa de ligar a outro CNPJ' });
  assert.equal(r.ok, false); assert.match(r.message, /já está ligado ao CNPJ 11\.222\.333\/0001-81.*Nada foi gravado/);
});

// ------------------------------------------------------------------ contas
test('contas: mediana e quartis, amostra pequena, sem dados (nunca inventa), unidade não se mistura, período e cancelados fora; quem ganha no órgão e por quanto', () => {
  const a = amb();
  const v = [100, 120, 150, 180, 200];
  a.srv.res = v.map((x, i) => RES(i + 1, { nc: '78680337000770-1-00010' + i + '/2026', valor: x, estimado: 200, cnpj: i < 3 ? C1 : C2, nome: i < 3 ? 'CALIBRA TESTE LTDA' : 'TERMO RIVAL TESTE' }))
    .concat([RES(6, { nc: '11444777000161-1-000001/2026', descricao: 'Calibração de termômetro (lote único)', unidade: 'Lote', valor: 9000, orgaoCnpj: C2, orgao: 'HOSPITAL TESTE' }),
      RES(7, { nc: '11444777000161-1-000002/2026', descricao: 'Manutenção preventiva de autoclave', valor: 3000, orgaoCnpj: C2, orgao: 'HOSPITAL TESTE' }),
      RES(8, { nc: '11444777000161-1-000003/2026', valor: 999, situacao: 'Cancelado' }),
      RES(9, { nc: '11444777000161-1-000004/2026', valor: 50, data: '2023-01-10' })]);
  a.sinc();
  const ref = a.ok(a.m('s_cha', 'referencia')).lista;
  const termo = ref.find((g) => g.nome === 'Calibração de termômetro (por unidade)');
  assert.deepEqual([termo.estat.n, termo.estat.q1, termo.estat.mediana, termo.estat.q3, termo.estat.min, termo.estat.max], [5, 120, 150, 180, 100, 200], 'cancelado (999) e antigo (50, fora dos 24 meses) fora');
  assert.equal(termo.estat.pequena, false); assert.equal(termo.estat.aviso, '');
  assert.equal(termo.periodo.deTxt, '28/10/2026'); assert.equal(termo.fontes.length, 5); assert.match(termo.fontes[0].link, /^https:\/\/pncp\.gov\.br\/app\/editais\//);
  assert.equal(termo.desconto.media, 25, 'média de 50, 40, 25, 10 e 0'); assert.equal(termo.desconto.mediana, 25);
  const lote = ref.find((g) => /por lote ou global/.test(g.nome));
  assert.equal(lote.estat.n, 1, 'o preço por lote não entra na mediana por unidade'); assert.equal(lote.estat.pequena, true);
  assert.match(lote.estat.aviso, /^Amostra pequena \(n = 1\): use como indício/);
  assert.ok(ref.find((g) => g.nome === 'Manutenção preventiva ou corretiva de autoclave (por unidade)'));
  // 60 meses: o antigo entra
  assert.equal(a.ok(a.m('s_cha', 'referencia', { meses: 60 })).lista.find((g) => g.nome === 'Calibração de termômetro (por unidade)').estat.n, 6);
  // sem dados: estatística vazia, sem número inventado
  const vazio = a.ctx.LicM_estatistica_([]);
  assert.deepEqual([vazio.n, vazio.mediana, vazio.q1, vazio.semDados], [0, null, null, true]); assert.match(vazio.aviso, /^Sem dados/);
  // órgão: quem ganha e por quanto
  const org = a.ok(a.m('s_cha', 'orgaos', { busca: 'oeste' })).lista;
  assert.equal(org.length, 1);
  const d = a.ok(a.m('s_cha', 'orgao', { chave: org[0].chave })).orgao;
  assert.equal(d.contratacoes, 5);
  assert.deepEqual(d.vencedores.map((x) => [x.nome, x.vitorias, x.valor]), [['CALIBRA TESTE LTDA', 3, 3700], ['TERMO RIVAL TESTE', 2, 3800]]);
  // concorrente: faixa por serviço
  const ch = a.ok(a.m('s_cha', 'concorrentes', { busca: '11.222.333/0001-81' })).lista;
  assert.equal(ch.length, 1);
  const det = a.ok(a.m('s_cha', 'concorrente', { chave: ch[0].chave })).concorrente;
  assert.ok(det.faixas.some((f) => f.nome === 'Calibração de termômetro (por unidade)' && f.n === 3 && f.mediana === 120 && f.pequena));
  assert.match(a.m('s_cha', 'concorrente', { chave: 'CNPJ:00000000000000' }).message, /não tem registro no período/);
});

test('grupo do preço: o texto do item decide; item sem o serviço usa o objeto da contratação (o equipamento continua o do item)', () => {
  const a = amb();
  a.srv.res = [RES(1, { descricao: 'Termômetro digital', objeto: 'Calibração de instrumentos de medição do hospital' }),
    RES(2, { nc: '78680337000770-1-000900/2026', descricao: 'Manutenção preventiva de autoclave', objeto: 'Calibração e manutenção de equipamentos' })];
  a.sinc();
  const nomes = a.ok(a.m('s_cha', 'referencia')).lista.map((g) => g.nome).sort();
  assert.deepEqual(nomes, ['Calibração de termômetro (por unidade)', 'Manutenção preventiva ou corretiva de autoclave (por unidade)']);
  assert.deepEqual(J(a.ctx.LicM_classificar_('Serviço de qualificação térmica de autoclave')), { servico: 'QUALIFICACAO', servicoNome: 'Qualificação ou validação', equipamento: 'AUTOCLAVE', equipamentoNome: 'autoclave' });
  assert.equal(a.ctx.LicM_unidade_('UN'), 'unidade'); assert.equal(a.ctx.LicM_unidade_('Mês'), 'mês'); assert.equal(a.ctx.LicM_unidade_('Serviço'), 'serviço'); assert.equal(a.ctx.LicM_unidade_('LOTE'), 'lote ou global');
});

// ------------------------------------------------------------------ ficha e pareceres
test('ficha (aba Mercado): quem ganha neste órgão e neste tipo de objeto, preço da simulação comparado com o mercado, pedido ao coletor com histórico', () => {
  const a = amb();
  a.srv.res = [100, 120, 150, 180, 200].map((x, i) => RES(i + 1, { nc: '78680337000770-1-00020' + i + '/2026', valor: x }));
  a.sinc();
  const sem = a.ok(a.m('s_cha', 'ficha', { id: 'op1' }));
  assert.equal(sem.orgao.contratacoes, 5); assert.equal(sem.orgao.vencedores[0].nome, 'CALIBRA TESTE LTDA');
  assert.deepEqual(sem.tipos, { servicos: ['Calibração', 'Manutenção preventiva ou corretiva'], equipamentos: ['autoclave', 'termômetro'] }, 'o objeto cita dois serviços e dois equipamentos');
  assert.equal(sem.tipo.mesmaUf, 5);
  assert.equal(sem.temSimulacao, false); assert.equal(sem.precos[0].referencia.estat.mediana, 150);
  a.tabelas.LIC_SIMULACOES = [{ ID: 's1', OPORTUNIDADE_ID: 'op1', VERSAO: 1, RESULTADO_JSON: JSON.stringify({ itens: [
    { numero: '1', descricao: 'Calibração de termômetro digital', nome: 'Calibração de termômetro', precoProposta: 110, precoEdital: 200 },
    { numero: '2', descricao: 'Ensaio de seladora', nome: 'Seladora', precoProposta: 500 }] }) }];
  const r = a.ok(a.m('s_cha', 'ficha', { id: 'op1' }));
  assert.equal(r.temSimulacao, true);
  assert.equal(r.precos[0].proposta.posicao, 'ABAIXO'); assert.match(r.precos[0].proposta.texto, /abaixo do 1º quartil \(R\$ 120,00\), 26,7% abaixo da mediana \(R\$ 150,00\)/);
  assert.equal(r.precos[0].edital.posicao, 'ACIMA');
  assert.equal(r.precos[1].referencia, null); assert.match(r.precos[1].aviso, /^Sem dados: nenhum preço de "Outro serviço de seladora \(por unidade\)"/);
  // pedido ao coletor
  const p = a.ok(a.m('s_cha', 'pedirResultados', { id: 'op1' }));
  assert.match(p.texto, /próxima rodada/);
  assert.deepEqual(J(a.srv.pedidos), [{ chave: 'PNCP:78680337000770-1-000430/2026', quem: 'CHARLES DIRETOR TESTE' }]);
  assert.ok(a.hist('MERCADO_PEDIDO').length === 1);
  assert.match(a.m('s_cha', 'pedirResultados', { id: 'op2' }).message, /não veio do PNCP.*Registrar resultado/);
});

test('pareceres: o mercado na tela do pedido segue o preço da área (Técnica sem valor nenhum; Financeira com o preço praticado)', () => {
  const a = amb();
  a.srv.res = [100, 120, 150, 180, 200].map((x, i) => RES(i + 1, { nc: '78680337000770-1-00030' + i + '/2026', valor: x }));
  a.sinc();
  const par = (sid, op, d) => J(a.ctx.Licitacoes_api(sid, 'pareceres', Object.assign({ op }, d || {})));
  const pt = a.ok(par('s_cha', 'pedir', { id: 'op1', area: 'TECNICA', usuarioId: 'u_gil' })).pedido.id;
  const pf = a.ok(par('s_cha', 'pedir', { id: 'op1', area: 'FINANCEIRA', usuarioId: 'u_fab' })).pedido.id;
  const t = a.ok(par('s_gil', 'tela', { pedidoId: pt }));
  assert.equal(t.mercado.nivelPreco, 'NENHUM');
  assert.equal(t.mercado.orgao.vencedores[0].nome, 'CALIBRA TESTE LTDA');
  assert.equal(t.mercado.precos, undefined);
  const txt = JSON.stringify(t.mercado);
  assert.doesNotMatch(txt, /"valor"|"desconto"|"mediana"|\b150\b|\b1500\b/, 'Técnica não vê valor nenhum');
  const f = a.ok(par('s_fab', 'tela', { pedidoId: pf }));
  assert.equal(f.mercado.nivelPreco, 'COMPLETO'); assert.equal(f.mercado.precos[0].referencia.estat.mediana, 150);
  // quem tem pedido de parecer não usa a tela de mercado direto
  const x = a.m('s_gil', 'concorrentes');
  assert.equal(x.ok, false); assert.equal(x.semAcesso, true);
});

// ------------------------------------------------------------------ permissões, registros manuais e tela vazia
test('permissões: só Diretoria e Administrador; o resto é recusado sem gravar nada', () => {
  const a = amb();
  for (const sid of ['s_gil', 's_vera', 's_fab']) for (const op of ['tela', 'concorrentes', 'fornecedorSalvar', 'resultadoManual', 'sincronizar', 'pedirResultados']) {
    const r = a.m(sid, op, { cnpj: C1, campos: { RAZAO_SOCIAL: 'X LTDA' }, motivo: 'tentativa sem permissão', id: 'op1' });
    assert.equal(r.ok, false, sid + ' ' + op); assert.equal(r.semAcesso, true); assert.match(r.message, /Diretoria e do Administrador/);
  }
  assert.equal((a.tabelas.LIC_FORNECEDORES || []).length, 0); assert.equal(a.srv.pedidos.length, 0);
  assert.equal(a.ok(a.m('s_thi', 'tela')).regras, 'LIC-MERCADO-2026-11-03.1');
  assert.match(a.m('s_cha', 'naoExiste').message, /operação da inteligência de mercado desconhecida/);
});

test('registro manual: fonte e valor obrigatórios, data não futura; entra nas contas com a fonte; anular tira das contas sem apagar; resultado do PNCP não se anula', () => {
  const a = amb();
  const base = { papel: 'VENCEDOR', orgaoNome: 'HOSPITAL MUNICIPAL TESTE', uf: 'GO', cnpj: C2, nome: 'TERMO RIVAL TESTE', descricao: 'Calibração de termômetro digital', unidade: 'unidade', valor: '185,40', estimado: '200,00', data: '2026-10-10', fonte: 'ata da sessão de 10/10/2026, página 3', motivo: 'O PNCP não publicou este resultado' };
  assert.match(a.m('s_cha', 'resultadoManual', Object.assign({}, base, { fonte: 'ata' })).message, /Escreva a fonte/);
  assert.match(a.m('s_cha', 'resultadoManual', Object.assign({}, base, { valor: '' })).message, /valor unitário que venceu/);
  assert.match(a.m('s_cha', 'resultadoManual', Object.assign({}, base, { data: '2026-12-01' })).message, /não pode ser no futuro/);
  assert.match(a.m('s_cha', 'resultadoManual', Object.assign({}, base, { cnpj: '123' })).message, /14 posições/);
  assert.match(a.m('s_cha', 'resultadoManual', Object.assign({}, base, { cnpj: '11.444.777/0001-62' })).message, /não confere nos dígitos/);
  assert.match(a.m('s_cha', 'resultadoManual', Object.assign({}, base, { link: 'javascript:alert(1)' })).message, /http:\/\/ ou https:\/\//);
  assert.equal((a.tabelas.LIC_MERCADO_RESULTADOS || []).length, 0, 'nada gravado nas recusas');
  const r = a.ok(a.m('s_cha', 'resultadoManual', base));
  a.ok(a.m('s_cha', 'resultadoManual', Object.assign({}, base, { papel: 'PARTICIPANTE', valor: '', cnpj: C1, nome: 'CALIBRA TESTE LTDA' })));
  assert.equal(a.forn().length, 2);
  const g = a.ok(a.m('s_cha', 'referencia')).lista[0];
  assert.equal(g.estat.n, 1, 'a participação não tem preço'); assert.equal(g.estat.mediana, 185.4); assert.equal(g.fontes[0].fonte, 'ata da sessão de 10/10/2026, página 3');
  assert.equal(a.ok(a.m('s_cha', 'concorrentes')).lista.find((c) => c.cnpj === C1).participacoes, 1);
  a.ok(a.m('s_cha', 'resultadoAnular', { id: r.id, motivo: 'Valor digitado errado; registro novo' }));
  assert.equal(a.tabelas.LIC_MERCADO_RESULTADOS.length, 2, 'nada é apagado');
  assert.equal(a.ok(a.m('s_cha', 'referencia')).lista.length, 0);
  assert.match(a.m('s_cha', 'resultadoAnular', { id: r.id, motivo: 'De novo para testar a recusa' }).message, /já foi anulado/);
  a.srv.res = [RES(1)]; a.sinc();
  const doPncp = a.tabelas.LIC_MERCADO_RESULTADOS.find((x) => x.ORIGEM === 'COLETOR');
  assert.match(a.m('s_cha', 'resultadoAnular', { id: doPncp.ID, motivo: 'Tentativa de anular o do PNCP' }).message, /Só o registro digitado pela Diretoria/);
  // linha mexida fora do SGO+ sai das contas e é contada
  doPncp.VALOR_UNIT_HOMOLOGADO = 1;
  assert.equal(a.ok(a.m('s_cha', 'tela')).fora.alterados, 1);
});

test('tela vazia e sem o coletor: diz o quê e por quê; a sincronia segue com as disputas; o coletor chama a sincronia depois de cada rodada', () => {
  const a = amb({ coletor: false });
  const t = a.ok(a.m('s_cha', 'tela'));
  assert.equal(t.coleta.coletor, false); assert.match(t.coleta.semColetorTxt, /roda só no servidor próprio.*disputas da Metrolabs e os registros manuais continuam valendo/);
  assert.equal(t.contagens.observacoes, 0);
  const s = a.ok(a.m('s_cha', 'sincronizar'));
  assert.match(s.texto, /^Sem o coletor neste ambiente/);
  assert.match(a.m('s_cha', 'pedirResultados', { id: 'op1' }).message, /roda só no servidor próprio/);
  const f = a.ok(a.m('s_cha', 'ficha', { id: 'op1' }));
  assert.equal(f.orgao, null); assert.equal(f.coleta.coletor, false);
  // o coletor do servidor chama Lic_aposColeta_: a sincronia do mercado vai junto
  const b = amb();
  b.srv.res = [RES(1)];
  const r = b.ctx.Lic_aposColeta_({ novas: 0 });
  assert.equal(r.mercado.novos, 1);
  assert.equal(b.tabelas.LIC_MERCADO_RESULTADOS.length, 1);
});

// ------------------------------------------------------------------ revisão de 4baded0/642380b
test('revisão: registro de preços — vence só a ordem 1 (ou o único resultado não cancelado do item); os demais são cadastro de reserva (participação, fora do preço)', () => {
  const a = amb();
  a.srv.res = [RES(1, { seq: 1, ordem: 1, valor: 150 }), RES(2, { seq: 2, ordem: 2, cnpj: C2, nome: 'TERMO RIVAL TESTE', valor: 160 }),
    RES(3, { seq: 3, ordem: 3, cnpj: C3, nome: 'OUTRA CALIBRA TESTE SA', valor: 170, situacao: 'Cancelado' }),
    // item 2: o resultado da ordem 1 foi cancelado; sobra um só (ordem 2) e ele é o vencedor
    RES(4, { item: 2, seq: 1, ordem: 1, situacao: 'Cancelado', valor: 90 }), RES(5, { item: 2, seq: 2, ordem: 2, cnpj: C2, nome: 'TERMO RIVAL TESTE', valor: 95 })];
  a.sinc();
  assert.deepEqual(a.tabelas.LIC_MERCADO_RESULTADOS.map((r) => r.ORDEM_CLASSIFICACAO), [1, 2, 3, 1, 2], 'a ordem é espelhada');
  const conc = a.ok(a.m('s_cha', 'concorrentes')).lista;
  const c1 = conc.find((c) => c.cnpj === C1), c2 = conc.find((c) => c.cnpj === C2);
  assert.equal(c1.vitorias, 1); assert.equal(c1.itensGanhos, 1);
  assert.equal(c2.vitorias, 1, 'ganhou o item 2 (único não cancelado)'); assert.equal(c2.itensGanhos, 1); assert.equal(c2.participacoes, 1);
  const g = a.ok(a.m('s_cha', 'referencia')).lista.find((x) => x.nome === 'Calibração de termômetro (por unidade)');
  assert.deepEqual([g.estat.n, g.estat.min, g.estat.max], [2, 95, 150], 'a reserva (160) e o cancelado (170, 90) ficam fora do preço');
  const det = a.ok(a.m('s_cha', 'concorrente', { chave: 'CNPJ:' + C2 }));
  assert.ok(det.registros.some((r) => /^Cadastro de reserva \(registro de preços, ordem 2\)/.test(r.papelNome)));
});

test('revisão de 2904eb7: vence a MENOR ordem entre os não cancelados (1º cancelado, 2º convocado: vence o 2º); sem ordem em nenhum, todos vencem', () => {
  const a = amb();
  a.srv.res = [RES(1, { seq: 1, ordem: 1, situacao: 'Cancelado', valor: 100 }), RES(2, { seq: 2, ordem: 2, cnpj: C2, nome: 'TERMO RIVAL TESTE', valor: 130 }), RES(3, { seq: 3, ordem: 3, cnpj: C3, nome: 'OUTRA CALIBRA TESTE SA', valor: 140 }),
    // item 2 sem ordem nenhuma (dois resultados): os dois contam como vencedores, como antes
    RES(4, { item: 2, seq: 1, valor: 150 }), RES(5, { item: 2, seq: 2, cnpj: C3, nome: 'OUTRA CALIBRA TESTE SA', valor: 155 })];
  a.sinc();
  const conc = a.ok(a.m('s_cha', 'concorrentes')).lista, por = (c) => conc.find((x) => x.cnpj === c);
  assert.equal(por(C2).itensGanhos, 1, 'o 2º convocado vence o item 1');
  assert.equal(por(C3).itensGanhos, 1, 'o 3º fica de reserva no item 1 e vence no item 2 (sem ordem)');
  assert.equal(por(C1).itensGanhos, 1, 'item 2 sem ordem: vence');
  const g = a.ok(a.m('s_cha', 'referencia')).lista.find((x) => x.nome === 'Calibração de termômetro (por unidade)');
  assert.deepEqual([g.estat.n, g.estat.min, g.estat.max], [3, 130, 155], '130 (ordem 2), 150 e 155; fora: 100 cancelado e 140 reserva');
  assert.ok(a.ok(a.m('s_cha', 'concorrente', { chave: 'CNPJ:' + C3 })).registros.some((r) => /ordem 3/.test(r.papelNome)));
});

test('revisão: CPF sai do nome do fornecedor ao gravar e ao mostrar (também o que já estava gravado); CNPJ e outros números ficam', () => {
  const a = amb();
  assert.equal(a.ctx.LicM_semCpf_('FULANO DE TAL 123.456.789-09'), 'FULANO DE TAL');
  assert.equal(a.ctx.LicM_semCpf_('12345678909 - FULANO ME'), 'FULANO ME');
  assert.equal(a.ctx.LicM_semCpf_('CALIBRA LTDA 11.222.333/0001-81'), 'CALIBRA LTDA 11.222.333/0001-81');
  assert.equal(a.ctx.LicM_semCpf_('CALIBRA 11222333000181'), 'CALIBRA 11222333000181');
  // revisão de 2904eb7: colado por traço também sai; processo ".../2026" fica
  assert.equal(a.ctx.LicM_semCpf_('FULANO-12345678909'), 'FULANO');
  assert.equal(a.ctx.LicM_semCpf_('FULANO-123.456.789-09 ME'), 'FULANO ME');
  assert.equal(a.ctx.LicM_semCpf_('PROCESSO 23000-12345678909/2026'), 'PROCESSO 23000-12345678909/2026');
  a.srv.res = [RES(1, { nome: 'FULANO DE TAL 123.456.789-09' })];
  a.sinc();
  assert.equal(a.tabelas.LIC_MERCADO_RESULTADOS[0].FORNECEDOR_NOME, 'FULANO DE TAL');
  assert.equal(a.forn(C1)[0].RAZAO_SOCIAL, 'FULANO DE TAL');
  // gravado antes da correção (com o CPF): sai na leitura (lista, ficha do fornecedor, histórico)
  const r = a.tabelas.LIC_MERCADO_RESULTADOS[0]; r.FORNECEDOR_NOME = 'FULANO DE TAL 987.654.321-00'; r.HASH = a.ctx.LicM_hashResultado_(r);
  const f = a.forn(C1)[0]; f.RAZAO_SOCIAL = 'FULANO DE TAL 98765432100'; f.HASH = a.ctx.LicM_hashFornecedor_(f);
  a.tabelas.LIC_HISTORICO.push({ ID: 'hx', ENTIDADE: 'FORNECEDOR', ENTIDADE_ID: f.ID, TIPO: 'FORNECEDOR_NOVO', PARA: 'FULANO DE TAL 98765432100', TEXTO: 'Cadastrado: FULANO DE TAL 98765432100', DATA: '2026-11-01T12:00:00.000Z' });
  const txt = JSON.stringify([a.ok(a.m('s_cha', 'concorrentes')), a.ok(a.m('s_cha', 'fornecedor', { cnpj: C1 })), a.ok(a.m('s_cha', 'fornecedores')), a.ok(a.m('s_cha', 'orgaos')), a.ok(a.m('s_cha', 'referencia'))]);
  assert.doesNotMatch(txt, /987\.?654\.?321-?00|98765432100/);
  assert.match(txt, /FULANO DE TAL/);
});

test('revisão: CNPJ digitado exige as 14 posições (zeros à esquerda só ao ler da planilha); registro manual do item que o PNCP já trouxe não entra duas vezes no preço', () => {
  const a = amb();
  const r = a.m('s_cha', 'fornecedorSalvar', { cnpj: '644704000105', campos: { RAZAO_SOCIAL: 'EMPRESA COM ZEROS TESTE' }, motivo: 'Cadastro a partir da ata' });
  assert.equal(r.ok, false); assert.match(r.message, /14 posições.*tem 12.*Nada foi gravado/);
  assert.match(a.m('s_cha', 'vincular', { nome: 'X', cnpj: '644704000105', motivo: 'Ligar com zeros faltando' }).message, /14 posições/);
  assert.equal((a.tabelas.LIC_FORNECEDORES || []).length, 0);
  a.ok(a.m('s_cha', 'fornecedorSalvar', { cnpj: '00.644.704/0001-05', campos: { RAZAO_SOCIAL: 'EMPRESA COM ZEROS TESTE' }, motivo: 'Cadastro a partir da ata' }));
  // planilha que perdeu os zeros: a leitura recupera (o mesmo cadastro, sem duplicar)
  a.forn()[0].CNPJ = '644704000105';
  assert.ok(a.ctx.LicM_fornecedoresPorCnpj_()['00644704000105']);
  // o PNCP trouxe o item 1 da op1; o registro manual do mesmo item fica fora do preço (vale o PNCP)
  a.srv.res = [RES(1, { nc: '78680337000770-1-000430/2026', valor: 150 })];
  a.sinc();
  a.ok(a.m('s_cha', 'resultadoManual', { papel: 'VENCEDOR', oportunidadeId: 'op1', item: '1', cnpj: C2, nome: 'TERMO RIVAL TESTE', descricao: 'Calibração de termômetro digital', valor: '140,00', data: '2026-10-28', fonte: 'ata da sessão, página 2', motivo: 'Lido na ata antes do PNCP' }));
  a.ok(a.m('s_cha', 'resultadoManual', { papel: 'VENCEDOR', oportunidadeId: 'op1', item: '2', cnpj: C2, nome: 'TERMO RIVAL TESTE', descricao: 'Calibração de termômetro digital', valor: '145,00', data: '2026-10-28', fonte: 'ata da sessão, página 2', motivo: 'Item que o PNCP ainda não trouxe' }));
  const g = a.ok(a.m('s_cha', 'referencia')).lista.find((x) => x.nome === 'Calibração de termômetro (por unidade)');
  assert.deepEqual([g.estat.n, g.estat.min, g.estat.max], [2, 145, 150], 'o manual do item 1 não conta de novo; o do item 2 conta');
  assert.equal(a.ok(a.m('s_cha', 'tela')).fora.duplicados, 1);
});

// ------------------------------------------------------------------ ligações, ajuda, manual e assistente
test('ligações: menu, navegação, aba da ficha, quadro do parecer, ajuda da tela, manual e base do assistente; arquivos do legado em CRLF', () => {
  const idx = lerCru('Index.html'), js = lerCru('JS_Licitacoes.html'), mk = lerCru('JS_Licitacoes_Mercado.html'), pa = lerCru('JS_Licitacoes_Pareceres.html');
  assert.match(idx, /data-mod="licitacoes_mercado"[^>]*onclick="abrir\('licitacoes_mercado'\)"[^>]*>.*Inteligência de mercado<\/button>/);
  assert.match(idx, /<\?!= include\('JS_Licitacoes_Mercado'\); \?>/);
  assert.match(js, /\["licitacoes_mercado", "Mercado"\]/); assert.match(js, /licitacoes_mercado: "Inteligência de mercado"/);
  assert.match(js, /LIC\.mod === "licitacoes_mercado"\) \{ if \(typeof LicMk_renderTela_ === "function"\)/);
  assert.match(js, /\["mercado", "Mercado"\]/); assert.match(js, /LIC\.fichaAba === "mercado" && typeof LicMk_ligarAba_ === "function"/);
  assert.match(pa, /typeof LicMk_htmlParecer_ === "function"/);
  for (const f of ['LicMk_renderTela_', 'LicMk_htmlAba_', 'LicMk_ligarAba_', 'LicMk_htmlParecer_']) assert.match(mk, new RegExp('function ' + f + '\\('));
  assert.doesNotMatch(mk, /innerHTML\s*=\s*[^;]*\+\s*(?:r|x|m|f|g|v|o|s)\.(?:nome|razaoSocial|fonte|orgao|descricao)\s*\+/, 'texto do servidor sempre por Lic_esc_');
  const a = amb();
  const aj = a.ctx.SGO_ajudaTelas_LicitacoesMercado_().licitacoes_mercado;
  assert.equal(aj.titulo, 'Inteligência de mercado'); assert.ok(aj.passos.length >= 5); assert.ok(aj.problemas.some((p) => /vazia/.test(p.situacao)));
  assert.ok(a.ctx.SGO_AJUDA_NOMES.licitacoes_mercado); assert.ok(a.ctx.SGO_Ajuda_todas_().telas.licitacoes_mercado);
  assert.match(lerCru('SGO_Ajuda_Licitacoes.js'), /Mercado \(concorrentes e preço praticado\)/);
  const man = fs.readFileSync(path.join(raiz, 'docs/MANUAL_MODULO_LICITACOES.md'), 'utf8');
  assert.match(man, /## Fornecedores, concorrentes e inteligência de mercado/);
  assert.match(man, /amostra pequena/); assert.match(man, /LIC_FORNECEDORES/); assert.match(man, /lic_mercado_resultados/);
  assert.match(lerCru('SGO_AssistenteManuais.js'), /Fornecedores, concorrentes e inteligência de mercado/);
  // nenhum nome de fabricante nos textos novos (equipamentos com nome genérico)
  for (const f of ['SGO_Licitacoes_Mercado.js', 'JS_Licitacoes_Mercado.html', 'SGO_Ajuda_LicitacoesMercado.js']) assert.doesNotMatch(lerCru(f), /\b(Baumer|Cristófoli|Sercon|Philips|Mindray|Dräger|Fluke|Testo|Novus|Siemens|GE Healthcare)\b/i, f);
  for (const f of ['SGO_Licitacoes_Mercado.js', 'JS_Licitacoes_Mercado.html', 'SGO_Ajuda_LicitacoesMercado.js', 'SGO_Licitacoes.js', 'SGO_Licitacoes_Pareceres.js', 'JS_Licitacoes.html', 'JS_Licitacoes_Pareceres.html', 'Index.html', 'SGO_Ajuda.js', 'SGO_Ajuda_Licitacoes.js', 'SGO_AssistenteManuais.js']) {
    const t = lerCru(f); assert.ok(t.includes('\r\n') && !/[^\r]\n/.test(t), f + ' em CRLF');
  }
  const t = fs.readFileSync(path.join(raiz, 'docs/MANUAL_MODULO_LICITACOES.md'), 'utf8'); assert.ok(!/[^\r]\n/.test(t), 'manual em CRLF');
});
