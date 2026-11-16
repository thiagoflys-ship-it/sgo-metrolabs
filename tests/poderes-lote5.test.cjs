// Acessos por caixas — LOTE 5 (11/11/2026): Compras. Cmp_eu_ aplica as alterações gravadas das caixas de Compras
// (Cmp_aplicarCaixas_ em SGO_Compras_Config.js); Cmp_exigir_, o relatório mensal, a ciência da gestão e CmpC_podeAprovar_
// (faixa -> caixa) perguntam a caixa. A regra padrão continua a de hoje (listas de compradores e substitutos, área de Compras,
// gestores por área, Diretoria) e os valores das faixas (R$) continuam em Regras de compras.
//  1) equivalência: sem exceções, as 23 contas reais recebem, em cada ação do lote, o mesmo resultado e a mesma mensagem
//     do legado de antes da mudança (output/poderes-20261110/lote5-antes-legado);
//  2) exceção NÃO tira o poder, mesmo de quem está na lista de compradores;
//  3) exceção SIM dá o poder a quem não está na lista;
//  4) a alçada em R$ continua valendo (a caixa diz SE aprova; a faixa diz até quanto); quem pediu não aprova (fixo);
//  5) tela: os sinais (acesso/iniciar/acoes) seguem a caixa; caixas ligadas; ajuda atualizada.
// Rodar: cd C:\Users\venda\projetos\google-script-dev && FASE=candidato node --require ./output/poderes-20261110/fontes-locais.cjs tests/poderes-lote5.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente } = require('./_poderes_ambiente.cjs');

const pastaPoderes = path.join(__dirname, '../output/poderes-20261110');
const pastaAntes = path.join(pastaPoderes, 'lote5-antes-legado');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const lerLegado = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8');
const lerAntes = (f) => fs.readFileSync(path.join(pastaAntes, f), 'utf8');
const EXTRAS = ['SGO_Compras_Cotacoes.js', 'SGO_Compras_Financeiro.js', 'SGO_Compras_Fornecedores.js', 'SGO_Compras_Painel.js', 'SGO_Compras_Pedido.js',
  'SGO_Compras_Requisicoes.js', 'SGO_Compras_Informar.js', 'SGO_Compras_Relatorios.js'];
const LOTE5 = ['COMPRAS_PEDIR', 'COMPRAS_VER_FILA', 'COMPRAS_VER_VALORES', 'COMPRAS_COMPRAR', 'COMPRAS_APROVAR_ATE_LIMITE', 'COMPRAS_APROVAR_DA_AREA',
  'COMPRAS_APROVAR_SEM_LIMITE', 'COMPRAS_GESTAO', 'COMPRAS_REGRAS_EDITAR', 'COMPRAS_CIENCIA_GESTAO'];
const j = (x) => JSON.parse(JSON.stringify(x === undefined ? null : x));

function amb(pasta) { return ambiente(Object.assign({ extras: EXTRAS }, pasta ? { pasta } : {})); }
const salvarExc = (a, login, mudancas, motivo) => {
  const r = a.api('admin', 'salvar', { usuarioId: a.idDe(login), motivo: motivo || 'Teste do lote 5 (exceção)', mudancas });
  assert.ok(r && r.ok, 'gravar exceção: ' + JSON.stringify(r));
  a.limparMemo();
};
const msgDe = (fn) => { try { fn(); return ''; } catch (e) { return String(e.message); } };
const eu = (a, login) => a.ctx.Cmp_eu_('s_' + login);
const FLAGS = ['nivel', 'gestao', 'comprador', 'compradorLista', 'gestor', 'financeiro', 'veValores', 'veFila', 'regras', 'diretoria', 'admin'];
const flags = (e) => { const o = {}; FLAGS.forEach((k) => { o[k] = e[k]; }); return o; };
const NIVEIS = [['COMPRADOR', 'lançar o orçamento'], ['VALORES', 'ver os fornecedores'], ['FILA', 'ver a fila de compras'], ['FINANCEIRO', 'conferir'],
  ['REGRAS', 'salvar as regras de compras'], ['GESTAO', 'gerar o relatório mensal'], ['INTERNO', 'enviar o pedido de compra']];
/** Pedido aguardando aprovação na faixa dada (COMPRADOR, GESTOR_AREA, DIRETORIA), pedido por outra pessoa da área dada. */
const pedido = (nivel, area, sol) => ({ ID: 'rq-' + nivel + '-' + area, NUMERO: 'CP-T', SITUACAO: 'AGUARDANDO_APROVACAO', APROVADOR_NIVEL: nivel, SOLICITANTE_ID: sol || 'quem-pediu',
  SOLICITANTE_NOME: 'QUEM PEDIU', SOLICITANTE_AREA: area, VALOR_ESCOLHIDO: nivel === 'COMPRADOR' ? 500 : nivel === 'GESTOR_AREA' ? 5000 : 50000 });
const AREAS_PEDIDO = ['LOGISTICA', 'RH', 'COMERCIAL', 'TECNICA', 'FINANCEIRO', 'METROLOGIA', 'QUALIDADE'];
const aprova = (a, login, r) => j(a.ctx.CmpC_podeAprovar_(eu(a, login), r));
const API = [['acesso', {}], ['fila', {}], ['painel', {}], ['painelGeral', {}], ['gerarRelatorio', {}], ['regras', {}], ['regras', { salvar: {}, motivo: 'x' }],
  ['fornecedores', {}], ['fornecedor', { id: 'f-nao-existe' }], ['salvarFornecedor', {}], ['arquivarFornecedor', {}], ['consultarCnpj', {}], ['importarFornecedores', {}],
  ['relatorioMes', {}], ['ciente', {}], ['salvarRequisicao', {}], ['devolverEspec', {}], ['iniciarCotacao', {}], ['salvarCotacao', {}], ['retirarCotacao', {}],
  ['escolher', {}], ['decidir', { aprovar: true }], ['emitirPedido', {}], ['marcarEnviado', {}], ['previsao', {}], ['receber', {}], ['resolverDivergencia', {}],
  ['entregar', {}], ['pagamento', {}], ['semPedido', {}], ['informar', {}], ['chamados', {}], ['clientes', {}], ['cliente', {}], ['requisicao', { id: 'x' }]];
const chamarApi = (a, login, acao, d) => { try { const r = a.ctx.Compras_api('s_' + login, acao, j(d)); return acao === 'acesso' ? r : { ok: r.ok, message: r.message || '' }; } catch (e) { return { lancou: String(e.message) }; } };

function acoes() {
  const l = [];
  l.push(['Cmp_eu_ (nível e sinais)', (a, u) => flags(eu(a, u))]);
  NIVEIS.forEach(([n, ac]) => l.push(['Cmp_exigir_ ' + n, (a, u) => ({ m: msgDe(() => a.ctx.Cmp_exigir_(eu(a, u), n, ac)) })]));
  ['COMPRADOR', 'GESTOR_AREA', 'DIRETORIA'].forEach((n) => AREAS_PEDIDO.forEach((ar) => l.push(['aprovar ' + n + ' ' + ar, (a, u) => aprova(a, u, pedido(n, ar))])));
  l.push(['aprovar (quem pediu)', (a, u) => aprova(a, u, pedido('COMPRADOR', 'LOGISTICA', a.idDe(u)))]);
  l.push(['nível por ID (custo no chamado e na proposta)', (a, u) => flags(a.ctx.CmpRel_nivelPorId_(a.idDe(u)))]);
  l.push(['ciência (CmpFin_ciente_)', (a, u) => ({ m: msgDe(() => a.ctx.CmpFin_ciente_(eu(a, u), {})) })]);
  l.push(['ações da ficha', (a, u) => { const o = {}; a.ctx.CmpC_acoes_(eu(a, u), pedido('COMPRADOR', 'RH'), o); a.ctx.CmpC_acoes_(eu(a, u), Object.assign(pedido('COMPRADOR', 'RH'), { SITUACAO: 'EM_COTACAO' }), o); return j(o); }]);
  API.forEach(([ac, d]) => l.push(['Compras_api ' + ac + (d.salvar ? ' (salvar)' : ''), (a, u) => chamarApi(a, u, ac, d)]));
  return l;
}

// 16/11/2026 (sigilo do Financeiro): a única diferença aceita é o texto da recusa do Financeiro, que passou a explicar o sigilo.
const MSG_FIN_ANTES = 'a conferência das compras é do Financeiro (perfil ou área Financeiro), da Diretoria e do Administrador';
const MSG_FIN_AGORA = 'esta parte é do Financeiro, que é sigiloso: só a Diretoria e o Financeiro autorizado a acessam. Para enviar uma informação ao Financeiro, registre o pagamento e o comprovante na ficha da compra';
const normFin = (x) => JSON.stringify(x).split(MSG_FIN_ANTES).join(MSG_FIN_AGORA);
test('1) equivalência: 23 contas reais × ações do lote 5, sem exceções = legado de antes (resultado e mensagem)', () => {
  assert.ok(fs.existsSync(path.join(pastaAntes, 'SGO_Compras_Config.js')), 'cópia de antes: ' + pastaAntes);
  assert.ok(!/Cmp_aplicarCaixas_/.test(lerAntes('SGO_Compras_Config.js')), 'a cópia de antes precisa ser anterior ao lote 5');
  const contas = amb().contas.map((u) => u.login);
  assert.equal(contas.length, 23);
  const lista = acoes(), divergencias = [];
  let comparacoes = 0, recusadas = 0;
  for (const u of contas) {
    const antes = amb(pastaAntes), depois = amb();
    for (const [rotulo, fn] of lista) {
      const ra = j(fn(antes, u)), rd = j(fn(depois, u));
      comparacoes++;
      if (ra && (ra.lancou || ra.ok === false || ra.pode === false || (ra.m && ra.m.length))) recusadas++;
      if (normFin(ra) !== JSON.stringify(rd)) divergencias.push(u + ' · ' + rotulo + '\n   antes:  ' + JSON.stringify(ra).slice(0, 300) + '\n   depois: ' + JSON.stringify(rd).slice(0, 300));
    }
  }
  fs.writeFileSync(path.join(pastaPoderes, 'lote5-equivalencia.txt'),
    'Lote 5 — equivalência (sem exceções) em ' + new Date().toISOString() + '\ncontas=' + contas.length + ' ações=' + lista.length + ' comparações=' + comparacoes +
    ' recusadas(antes)=' + recusadas + ' divergências=' + divergencias.length + '\nações: ' + lista.map((x) => x[0]).join(' | ') + '\n' + divergencias.join('\n') + '\n');
  assert.equal(divergencias.length, 0, divergencias.slice(0, 5).join('\n'));
  assert.ok(recusadas > 300 && recusadas < comparacoes - 200, 'a sequência precisa ter recusas e liberações: ' + recusadas + '/' + comparacoes);
});

test('2) exceção NÃO tira o poder, mesmo de quem está na lista de compradores', () => {
  const a = amb();
  const regras = a.ctx.Cmp_regras_();
  const lista = (regras.compradores || []).concat(regras.substitutos || []);
  const login = a.contas.find((c) => lista.includes(c.id) && !a.ctx.Cmp_ehDono_(c.login) && c.perfil !== 'DIRETORIA' && c.perfil !== 'ADMIN');
  assert.ok(login, 'há um comprador da lista que não é Diretoria/Administrador: ' + JSON.stringify(lista));
  const L = login.login;
  assert.equal(eu(a, L).comprador, true, 'padrão: comprador da lista');
  assert.equal(aprova(a, L, pedido('COMPRADOR', 'RH')).pode, true, 'padrão: aprova a faixa do comprador');
  salvarExc(a, L, [{ codigo: 'COMPRAS_COMPRAR', valor: 'NAO' }, { codigo: 'COMPRAS_APROVAR_ATE_LIMITE', valor: 'NAO' }, { codigo: 'COMPRAS_VER_VALORES', valor: 'NAO' }],
    'Comprador afastado das compras');
  const e = eu(a, L);
  assert.equal(e.comprador, false); assert.equal(e.veValores, false);
  assert.equal(e.compradorLista, true, 'a lista de compradores continua igual (a caixa é que tirou)');
  const m = msgDe(() => a.ctx.Cmp_exigir_(e, 'COMPRADOR', 'lançar o orçamento'));
  assert.match(m, /«Cotar e comprar» para lançar o orçamento/, m); assert.match(m, /Administração > Acessos/);
  assert.match(msgDe(() => a.ctx.Cmp_exigir_(e, 'VALORES', 'ver os fornecedores')), /«Ver valores de compras e fornecedores»/);
  ['salvarCotacao', 'emitirPedido', 'receber', 'salvarFornecedor'].forEach((ac) => assert.match(chamarApi(a, L, ac, {}).message, /«Cotar e comprar»/, ac));
  const ap = aprova(a, L, pedido('COMPRADOR', 'RH'));
  assert.equal(ap.pode, false); assert.match(ap.motivo, /«Aprovar compra até o limite do comprador»/, ap.motivo);
  const ac = chamarApi(a, L, 'acesso', {});
  assert.equal(ac.comprador, false); assert.equal(ac.veValores, false);
  assert.equal(a.ctx.CmpRel_nivelPorId_(a.idDe(L)).veValores, false, 'custo no chamado e na proposta também segue a caixa');
  // Gestão e Diretoria: NÃO em ver a fila, regras, gestão, ciência e "sem limite"
  salvarExc(a, 'charles', [{ codigo: 'COMPRAS_APROVAR_SEM_LIMITE', valor: 'NAO' }, { codigo: 'COMPRAS_GESTAO', valor: 'NAO' }, { codigo: 'COMPRAS_CIENCIA_GESTAO', valor: 'NAO' },
    { codigo: 'COMPRAS_REGRAS_EDITAR', valor: 'NAO' }, { codigo: 'COMPRAS_VER_FILA', valor: 'NAO' }], 'Teste: Diretoria sem as caixas de gestão de Compras');
  assert.equal(aprova(a, 'charles', pedido('DIRETORIA', 'RH')).pode, false);
  assert.match(aprova(a, 'charles', pedido('DIRETORIA', 'RH')).motivo, /«Aprovar compra acima de todas as faixas»/);
  assert.match(chamarApi(a, 'charles', 'relatorioMes', {}).message, /«Gestão de Compras»/);
  assert.match(chamarApi(a, 'charles', 'ciente', {}).message, /«Dar ciência de compra fora do fluxo»/);
  assert.match(chamarApi(a, 'charles', 'regras', { salvar: {}, motivo: 'x' }).message, /«Alterar as regras de compras»/);
  assert.match(chamarApi(a, 'charles', 'fila', {}).message, /«Ver a fila e o painel de compras»/);
  assert.equal(chamarApi(a, 'charles', 'acesso', {}).veFila, false);
  // pedir: NÃO recusa abrir pedido; o próprio pedido (dono do pedido) continua fora das caixas
  salvarExc(a, 'joaopedro', [{ codigo: 'COMPRAS_PEDIR', valor: 'NAO' }], 'Teste: técnico sem abrir pedido');
  assert.match(chamarApi(a, 'joaopedro', 'salvarRequisicao', {}).message, /«Pedir compra e informar compra feita»/);
  assert.equal(a.ctx.CmpR_podeVer_(eu(a, 'joaopedro'), { SOLICITANTE_ID: a.idDe('joaopedro') }), true, 'quem pediu continua vendo o próprio pedido');
  // o dono do sistema não perde caixa
  LOTE5.forEach((c) => assert.equal(a.ctx.SGO_pode_('s_admin', c), true, c));
});

test('3) exceção SIM dá o poder a quem não está na lista', () => {
  const a = amb();
  const L = 'joaopedro';
  const antes = eu(a, L);
  assert.equal(antes.comprador, false); assert.equal(antes.veFila, false);
  assert.match(chamarApi(a, L, 'salvarCotacao', {}).message, /esta ação é do comprador/, 'padrão: mensagem de antes');
  assert.equal(aprova(a, L, pedido('COMPRADOR', 'RH')).pode, false);
  salvarExc(a, L, [{ codigo: 'COMPRAS_COMPRAR', valor: 'SIM' }, { codigo: 'COMPRAS_VER_FILA', valor: 'SIM' }, { codigo: 'COMPRAS_VER_VALORES', valor: 'SIM' },
    { codigo: 'COMPRAS_APROVAR_ATE_LIMITE', valor: 'SIM' }], 'Técnico cobre as compras nas férias do comprador');
  const e = eu(a, L);
  assert.equal(e.comprador, true); assert.equal(e.veFila, true); assert.equal(e.veValores, true);
  assert.equal(e.compradorLista, false, 'não entrou na lista: o poder veio da caixa');
  assert.equal(msgDe(() => a.ctx.Cmp_exigir_(e, 'COMPRADOR', 'lançar o orçamento')), '');
  assert.doesNotMatch(chamarApi(a, L, 'salvarCotacao', {}).message || '', /comprador \(lista|«Cotar e comprar»/);
  assert.equal(chamarApi(a, L, 'fila', {}).ok, true);
  assert.equal(aprova(a, L, pedido('COMPRADOR', 'RH')).pode, true);
  const o = {}; a.ctx.CmpC_acoes_(e, pedido('COMPRADOR', 'RH'), o);
  assert.equal(o.decidir, true, 'a ficha mostra o botão de decidir');
  // SIM da área vale só para a área da pessoa (escopo AREA); a Diretoria vale em todas
  salvarExc(a, 'wanessa', [{ codigo: 'COMPRAS_APROVAR_DA_AREA', valor: 'SIM' }], 'Financeiro aprova as compras do Financeiro');
  const w = a.contas.find((c) => c.login === 'wanessa');
  assert.equal(aprova(a, 'wanessa', pedido('GESTOR_AREA', w.area)).pode, true, 'área dela: ' + w.area);
  assert.equal(aprova(a, 'wanessa', pedido('GESTOR_AREA', w.area === 'RH' ? 'TECNICA' : 'RH')).pode, false, 'outra área: não');
  // gestão, ciência e regras por SIM
  salvarExc(a, L, [{ codigo: 'COMPRAS_GESTAO', valor: 'SIM' }, { codigo: 'COMPRAS_CIENCIA_GESTAO', valor: 'SIM' }, { codigo: 'COMPRAS_REGRAS_EDITAR', valor: 'SIM' }], 'Teste de SIM');
  assert.doesNotMatch(chamarApi(a, L, 'relatorioMes', {}).message || '', /gestão de Compras|«Gestão/);
  assert.doesNotMatch(chamarApi(a, L, 'ciente', {}).message || '', /é da gestão|«Dar ciência/);
  assert.equal(chamarApi(a, L, 'acesso', {}).podeRegras, true);
  // conta de fora nunca ganha
  const fora = a.contas.find((c) => ['CLIENTE', 'REPRESENTADA'].includes(c.perfil));
  if (fora) assert.equal(chamarApi(a, fora.login, 'acesso', {}).ok, false);
});

test('4) a alçada em R$ continua valendo: SIM na faixa do comprador não aprova acima dela; quem pediu nunca aprova', () => {
  const a = amb();
  const L = 'joaopedro';
  salvarExc(a, L, [{ codigo: 'COMPRAS_APROVAR_ATE_LIMITE', valor: 'SIM' }, { codigo: 'COMPRAS_VER_FILA', valor: 'SIM' }], 'Faixa do comprador por caixa');
  assert.equal(aprova(a, L, pedido('COMPRADOR', 'RH')).pode, true);
  assert.equal(aprova(a, L, pedido('GESTOR_AREA', 'RH')).pode, false, 'faixa do gestor (até R$ 10.000) não');
  assert.equal(aprova(a, L, pedido('DIRETORIA', 'RH')).pode, false, 'faixa da Diretoria não');
  assert.match(aprova(a, L, pedido('COMPRADOR', 'RH', a.idDe(L))).motivo, /Quem pediu não aprova a própria compra/);
  // o nível vem do valor e das faixas da configuração (R$ 1.000 / R$ 10.000), que não mudaram
  const regras = a.ctx.Cmp_regras_();
  assert.equal(a.ctx.Cmp_faixaDe_(800, regras).aprovador, 'COMPRADOR');
  assert.equal(a.ctx.Cmp_faixaDe_(5000, regras).aprovador, 'GESTOR_AREA');
  assert.equal(a.ctx.Cmp_faixaDe_(50000, regras).aprovador, 'DIRETORIA');
  assert.equal(lerLegado('SGO_Compras_Config.js').match(/var CMP_REGRAS_PADRAO[\s\S]*?\n\}/)[0], lerAntes('SGO_Compras_Config.js').match(/var CMP_REGRAS_PADRAO[\s\S]*?\n\}/)[0], 'faixas padrão intactas');
  // quem cotou, acima da faixa do comprador, não aprova (fixo) mesmo com SIM da área
  salvarExc(a, 'elisa', [{ codigo: 'COMPRAS_APROVAR_DA_AREA', valor: 'SIM' }], 'Teste: quem cotou não aprova');
  const r = Object.assign(pedido('GESTOR_AREA', 'RH'), { ESCOLHA_POR_ID: a.idDe('elisa') });
  const rota = a.ctx.CmpC_rota_(r);
  if (rota.naoPode.includes(a.idDe('elisa'))) assert.equal(a.ctx.CmpC_podeAprovar_(eu(a, 'elisa'), r, rota).pode, false);
});

test('5) tela: sinais do servidor seguem a caixa; 10 caixas ligadas; ajuda atualizada', () => {
  const a = amb();
  const cat = a.ctx.SGO_poderesCatalogo_().mapa;
  LOTE5.forEach((c) => assert.equal(cat[c].ligado, true, c));
  const tela = lerLegado('JS_Compras.html');
  ['veFila', 'podeRegras', 'comprador'].forEach((s) => assert.match(tela, new RegExp('\\b' + s + '\\b'), s));
  const paginas = fs.readdirSync(pastaLegado).filter((f) => /\.html$/.test(f)).map((f) => lerLegado(f)).join('\n');
  assert.match(paginas, /include\(['"]JS_Compras['"]\)/, 'a página completa inclui JS_Compras');
  // os sinais de acesso e de início batem com a recusa do servidor, com e sem exceção
  const casos = [['joaopedro', []], ['elisa', []], ['guilherme', []], ['joaopedro', [{ codigo: 'COMPRAS_VER_FILA', valor: 'SIM' }]],
    ['guilherme', [{ codigo: 'COMPRAS_VER_FILA', valor: 'NAO' }]], ['elisa', [{ codigo: 'COMPRAS_VER_FILA', valor: 'NAO' }]]];
  casos.forEach(([login, exc]) => {
    const b = amb();
    if (!b.idDe(login)) return;
    if (exc.length) salvarExc(b, login, exc);
    const ac = chamarApi(b, login, 'acesso', {});
    const servidor = chamarApi(b, login, 'fila', {}).ok === true;
    assert.equal(!!ac.veFila, servidor, login + ' ' + JSON.stringify(exc));
  });
  const ajudaAdm = lerLegado('SGO_Ajuda_Administracao.js');
  assert.match(ajudaAdm, /Lote 5/); assert.match(ajudaAdm, /«Cotar e comprar»/);
  const ajudaCmp = lerLegado('SGO_Ajuda_Compras.js');
  assert.match(ajudaCmp, /Administração > Acessos/);
});
