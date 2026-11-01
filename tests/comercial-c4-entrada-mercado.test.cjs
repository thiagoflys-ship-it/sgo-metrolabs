// Comercial C4 (01/11/2026): entrada "O que você quer fazer agora?", Quadro (Kanban) e Gantt como modos de ver dentro de
// Oportunidades, "Completar quem ganhou" na oportunidade perdida (merge: nunca troca o que já estava) e o relatório "preço proposto ×
// ganho ou perdido, por serviço". Código real num contexto isolado (tests/_comercial_ambiente.cjs), só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { ambiente, oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');

const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8');
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const aceite = { nome: 'aceite.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF aceite').toString('base64') };

function amb0() {
  const amb = ambiente({ tabelas: { qual_distancia_referencia: [{ ID: 'd1', DESTINO: 'Anápolis/GO', KM_TRECHO: 55 }] } });
  amb.ctx.CONDUTA_SHEETS = { DISTANCIA_REFERENCIA: 'qual_distancia_referencia' };
  amb.ctx.Conduta_obterParametros_ = () => ({ VALOR_INCENTIVO_MISSAO: 300, MISSAO_KM_MINIMO: 200 });
  const pv = ok(amb.api('s_dora', 'importarC1Previa'));
  ok(amb.api('s_dora', 'importarC1', { marca: pv.marca, escolhas: {} }));
  return amb;
}
const prod = (amb, tab) => amb.tabelas.COM_PRODUTOS.find((p) => p.TABELA_CODIGO === 'C1:' + tab);
function propostaEnviada(amb, sid, preco) {
  const ac = prod(amb, 'QT_AUTOCLAVE_GRANDE');
  const { oportunidade } = oportunidadeDeTeste(amb, sid);
  const id = ok(amb.api(sid, 'novaProposta', { oportunidadeId: oportunidade.id })).proposta.id;
  ok(amb.api(sid, 'salvarProposta', { id, deslocamento: SEM_VIAGEM, itens: [{ produtoId: ac.ID, descricao: ac.NOME, quantidade: 1, precoUnitario: preco }], condicoes: { pagamento: 'Boleto em 28 dias', garantia: '90 dias' } }));
  ok(amb.api(sid, 'concluirProposta', { id }));
  ok(amb.api(sid, 'gerarDocumento', { id }));
  ok(amb.api(sid, 'marcarEnviada', { id, como: 'Entregue em mãos na reunião com a CME' }));
  return { id, oportunidade };
}

test('entrada: números dos quatro caminhos só do que a pessoa vê, sem valor nenhum; o que vence em ordem (atrasado antes); técnico fora', () => {
  const amb = amb0();
  const a = propostaEnviada(amb, 's_vera', '3.020,00');
  oportunidadeDeTeste(amb, 's_vera'); // sem proposta: o retorno combinado é amanhã às 10:00
  oportunidadeDeTeste(amb, 's_vito');
  // segunda-feira 10:00: o retorno da Vera é amanhã; nada vence
  let e = ok(amb.api('s_vera', 'entrada'));
  assert.equal(e.abertas, 2, 'a vendedora só conta as dela'); assert.equal(e.aguardando, 1); assert.equal(e.atrasados, 0);
  assert.doesNotMatch(JSON.stringify(e), /R\$/, 'a entrada não leva valores');
  const g = ok(amb.api('s_gaspar', 'entrada'));
  assert.equal(g.abertas, 3, 'a gestão vê a equipe'); assert.equal(g.gestao, true);
  // terça 15:00: retorno atrasado; a proposta (validade de 15 dias) ainda não vence na semana
  amb.mudar('2026-10-20T15:00:00-03:00');
  e = ok(amb.api('s_vera', 'entrada'));
  assert.equal(e.atrasados, 1); assert.equal(e.vence[0].quando, 'ATRASADO'); assert.equal(e.vence[0].tipo, 'oportunidade'); assert.match(e.vence[0].titulo, /Retorno atrasado: Ligar para entender o escopo/);
  // a validade chega: vence nos próximos 7 dias e, passado o dia, vira "vencida sem resposta"
  const va = amb.tabelas.COM_PROPOSTAS.find((p) => p.ID === a.id).VALIDA_ATE.slice(0, 10);
  amb.mudar(va + 'T09:00:00-03:00');
  e = ok(amb.api('s_vera', 'entrada'));
  assert.ok(e.vence.some((x) => x.tipo === 'proposta' && x.quando === 'HOJE' && /vence hoje/.test(x.titulo)));
  const dia = new Date(Date.parse(va + 'T12:00:00Z') + 3 * 864e5).toISOString().slice(0, 10);
  amb.mudar(dia + 'T09:00:00-03:00');
  e = ok(amb.api('s_vera', 'entrada'));
  const venc = e.vence.find((x) => x.tipo === 'proposta');
  assert.equal(venc.quando, 'VENCEU'); assert.equal(e.vencidas, 1);
  assert.ok(e.vence.findIndex((x) => x.quando === 'ATRASADO') < e.vence.findIndex((x) => x.quando === 'VENCEU'), 'atrasado vem antes');
  assert.equal(amb.api('s_tiago', 'entrada').ok, false, 'técnico não abre o Comercial');
});

test('propostas: filtro "Aguardando resposta do cliente" traz enviadas (e vencidas), não rascunhos', () => {
  const amb = amb0();
  const a = propostaEnviada(amb, 's_vera', '3.020,00');
  const { oportunidade } = oportunidadeDeTeste(amb, 's_vera');
  const rasc = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id })).proposta.id;
  const l = ok(amb.api('s_vera', 'propostas', { situacao: 'AGUARDANDO_RESPOSTA' })).propostas.map((p) => p.id);
  assert.deepEqual(l, [a.id]); assert.ok(!l.includes(rasc));
  assert.match(ler('JS_Comercial.html'), /\{ v: "AGUARDANDO_RESPOSTA", t: "Aguardando resposta do cliente \(enviadas e vencidas\)" \}/);
});

test('perda: "Completar quem ganhou" preenche só o que estava vazio, na oportunidade e no banco (sem mudar data nem valor); reabrir limpa e guarda no histórico', () => {
  const amb = amb0();
  const a = propostaEnviada(amb, 's_vera', '3.300,00');
  ok(amb.api('s_vera', 'perder', { id: a.oportunidade.id, motivo: 'Preço ou condição de pagamento', aprendizado: 'O cliente fechou pelo menor preço da cotação' }));
  const linha = () => amb.tabelas.COM_PRECOS.find((r) => r.REF_ID === a.id && r.SITUACAO !== 'SUBSTITUIDO');
  const antes = Object.assign({}, linha());
  assert.equal(antes.RESULTADO, 'PERDIDO'); assert.ok(!antes.CONCORRENTE);
  // ficha mostra que falta
  let f = ok(amb.api('s_vera', 'oportunidade', { id: a.oportunidade.id })).oportunidade;
  assert.equal(f.concorrenteVencedor, ''); assert.equal(f.temValorVencedor, false);
  // vazio não vale; aberta não vale; outro vendedor não vê
  assert.match(amb.api('s_vera', 'completarPerda', { id: a.oportunidade.id }).message, /escreva o concorrente/);
  assert.equal(amb.api('s_vito', 'completarPerda', { id: a.oportunidade.id, concorrente: 'X' }).ok, false);
  const aberta = oportunidadeDeTeste(amb, 's_vera').oportunidade;
  assert.match(amb.api('s_vera', 'completarPerda', { id: aberta.id, concorrente: 'EMPRESA TESTE' }).message, /não está perdida/);
  assert.match(amb.api('s_vera', 'completarPerda', { id: a.oportunidade.id, valorVencedor: 'muito' }).message, /valor em reais/);
  // só o concorrente agora; o valor depois
  let r = ok(amb.api('s_vera', 'completarPerda', { id: a.oportunidade.id, concorrente: 'CONCORRENTE TESTE LTDA' }));
  assert.match(r.message, /banco de preços foi completado em 1 item/);
  assert.equal(linha().CONCORRENTE, 'CONCORRENTE TESTE LTDA'); assert.ok(!linha().VALOR_VENCEDOR);
  r = ok(amb.api('s_vera', 'completarPerda', { id: a.oportunidade.id, concorrente: 'OUTRO NOME TESTE', valorVencedor: '2.900,00' }));
  assert.match(r.message, /o concorrente \(CONCORRENTE TESTE LTDA\) já estava registrado e ficou como estava/);
  const o = amb.tabelas.COM_OPORTUNIDADES.find((x) => x.ID === a.oportunidade.id);
  assert.equal(o.CONCORRENTE_VENCEDOR, 'CONCORRENTE TESTE LTDA', 'merge: o nome não foi trocado'); assert.equal(o.VALOR_VENCEDOR, 2900);
  assert.equal(linha().VALOR_VENCEDOR, 2900); assert.equal(linha().CONCORRENTE, 'CONCORRENTE TESTE LTDA');
  for (const k of ['DATA', 'VALOR_UNITARIO', 'RESULTADO', 'CLIENTE_NOME', 'REGISTRADO_POR_ID']) assert.equal(linha()[k], antes[k], k + ' não muda');
  // tudo preenchido: não troca e diz o que fazer
  assert.match(amb.api('s_vera', 'completarPerda', { id: a.oportunidade.id, concorrente: 'NOVO TESTE', valorVencedor: '100' }).message, /já estão registrados e não é trocado.*gestão comercial/);
  f = ok(amb.api('s_vera', 'oportunidade', { id: a.oportunidade.id })).oportunidade;
  assert.equal(f.concorrenteVencedor, 'CONCORRENTE TESTE LTDA'); assert.equal(f.valorVencedorTxt, 'R$ 2.900,00');
  assert.ok(amb.tabelas.COM_HISTORICO.some((h) => h.TIPO === 'PERDA_COMPLETADA' && /CONCORRENTE TESTE LTDA, por R\$ 2\.900,00/.test(h.TEXTO)));
  // reabrir: limpa quem ganhou junto com o motivo; o histórico guarda
  ok(amb.api('s_gaspar', 'reabrir', { id: a.oportunidade.id, motivo: 'O cliente pediu nova cotação', proxima: { acao: 'Ligar para o cliente', data: '2026-10-21', hora: '10:00', tipo: 'LIGACAO' } }));
  const o2 = amb.tabelas.COM_OPORTUNIDADES.find((x) => x.ID === a.oportunidade.id);
  assert.equal(o2.CONCORRENTE_VENCEDOR, ''); assert.equal(o2.VALOR_VENCEDOR, '');
  assert.ok(amb.tabelas.COM_HISTORICO.some((h) => h.TIPO === 'REABERTA' && /quem ganhou: CONCORRENTE TESTE LTDA, por R\$ 2\.900,00/.test(h.TEXTO)));
  assert.equal(linha().CONCORRENTE, 'CONCORRENTE TESTE LTDA', 'o banco de preços continua com a perda');
});

test('relatório preço × resultado: taxa, médias, quem ganhou, tabela e mercado por serviço; período; sem custo nem compra; vendedor sem o cliente dos outros', () => {
  const amb = amb0();
  const ac = prod(amb, 'QT_AUTOCLAVE_GRANDE');
  const g = propostaEnviada(amb, 's_vera', '3.020,00');
  ok(amb.api('s_vera', 'respostaCliente', { id: g.id, resposta: 'APROVADA', texto: 'Aprovado por e-mail', arquivo: aceite }));
  const p = propostaEnviada(amb, 's_vera', '3.300,00');
  ok(amb.api('s_vera', 'respostaCliente', { id: p.id, resposta: 'RECUSADA', motivo: 'Concorrente escolhido', texto: 'Fechou com outra empresa', concorrente: 'CONCORRENTE TESTE LTDA', valorVencedor: '2.400,00' }));
  // cotação de fornecedor (preço de compra) não pode entrar em lugar nenhum do relatório
  amb.tabelas.COM_PRECOS.push({ ID: 'cmp1', CHAVE: 'T:cmp1', TIPO: 'SERVICO', ITEM_CHAVE: 'C1:QT_AUTOCLAVE_GRANDE', DESCRICAO: 'Cotação teste', VALOR_UNITARIO: 900, DATA: '2026-10-10', ORIGEM: 'COTACAO_FORNECEDOR', RESULTADO: 'REFERENCIA', FORNECEDOR: 'FORNECEDOR SIGILOSO TESTE' });
  const r = ok(amb.api('s_gaspar', 'relatorioPrecoResultado', { meses: 12, origem: 'SGO' }));
  const x = r.itens.find((i) => i.itemChave === 'C1:QT_AUTOCLAVE_GRANDE');
  assert.equal(x.decididas, 2); assert.equal(x.ganhos, 1); assert.equal(x.taxaTxt, '50%');
  assert.equal(x.mediaGanhoTxt, 'R$ 3.020,00'); assert.equal(x.mediaPerdidoTxt, 'R$ 3.300,00');
  assert.equal(x.concorrente.mediaTxt, 'R$ 2.400,00'); assert.deepEqual(x.concorrente.nomes, ['CONCORRENTE TESTE LTDA']); assert.equal(x.concorrente.vsPerdidoTxt, '27% abaixo');
  assert.equal(x.tabela.valor, Number(ac.PRECO)); assert.match(x.tabela.fonte, /catálogo/);
  assert.match(x.mercado.fonte, /PNCP/); assert.equal(x.mercado.faixaTxt, 'R$ 1.800,00 a R$ 3.899,00');
  assert.equal(x.ganhoNoMercado, 'dentro');
  assert.ok(x.leitura.some((t) => /Quem ganhou de nós cobrou, em média, R\$ 2\.400,00 \(27% abaixo do nosso preço perdido\)/.test(t)));
  assert.equal(r.total.decididas, 2); assert.equal(r.total.taxaTxt, '50%');
  const json = JSON.stringify(r);
  assert.doesNotMatch(json, /FORNECEDOR SIGILOSO|"custo|CUSTO_UNITARIO|900,00/, 'sem custo e sem preço de compra');
  // período: linha antiga só aparece em "todo o histórico"
  const antiga = amb.tabelas.COM_PRECOS.find((l) => l.REF_ID === g.id); antiga.DATA = '2024-03-10';
  assert.equal(ok(amb.api('s_gaspar', 'relatorioPrecoResultado', { meses: 12, origem: 'SGO' })).itens.find((i) => i.itemChave === 'C1:QT_AUTOCLAVE_GRANDE').decididas, 1);
  assert.equal(ok(amb.api('s_gaspar', 'relatorioPrecoResultado', { meses: 0, origem: 'SGO' })).itens.find((i) => i.itemChave === 'C1:QT_AUTOCLAVE_GRANDE').decididas, 2);
  // vendedor de fora: números da empresa, sem o cliente nem a proposta da Vera; "só as minhas" fica vazio para ele
  const v = ok(amb.api('s_vito', 'relatorioPrecoResultado', { meses: 0, origem: 'SGO', itemChave: 'C1:QT_AUTOCLAVE_GRANDE' }));
  assert.equal(v.detalhe.decididas, 2);
  assert.ok(v.detalhe.linhas.every((l) => l.cliente === '' && l.ref === ''), 'cliente e proposta da Vera escondidos');
  assert.doesNotMatch(JSON.stringify(v), /HOSPITAL TESTE ALFA|Hospital Teste Alfa|PROP-/);
  assert.equal(ok(amb.api('s_vito', 'relatorioPrecoResultado', { meses: 0, origem: 'SGO', meus: true })).total.decididas, 0);
  // a dona da proposta vê o próprio cliente; a gestão filtra pelo vendedor
  assert.ok(ok(amb.api('s_vera', 'relatorioPrecoResultado', { meses: 0, origem: 'SGO', itemChave: 'C1:QT_AUTOCLAVE_GRANDE' })).detalhe.linhas.every((l) => /Hospital Teste Alfa|HOSPITAL TESTE ALFA/.test(l.cliente)));
  assert.equal(ok(amb.api('s_gaspar', 'relatorioPrecoResultado', { meses: 0, origem: 'SGO', vendedorId: 'u_ven2' })).total.decididas, 0);
  assert.equal(amb.api('s_tiago', 'relatorioPrecoResultado', {}).ok, false);
  assert.equal(amb.api('s_fabio', 'relatorioPrecoResultado', {}).ok, false, 'Financeiro fora');
});

test('relatório: sem decisões no período, o estado vazio diz o que fazer; faixa de mercado do banco quando há 3 preços ou mais', () => {
  const amb = amb0();
  const vazio = ok(amb.api('s_gaspar', 'relatorioPrecoResultado', { meses: 6, origem: 'SGO' }));
  assert.equal(vazio.itens.length, 0); assert.equal(vazio.total.taxaTxt, '—');
  const html = ler('JS_Comercial.html');
  assert.match(html, /Nenhuma proposta ganha ou perdida neste período e nestes filtros\. Elas aparecem aqui quando/);
  const x = amb.ctx.ComBP_faixaMercado_('C1:QT_AUTOCLAVE_GRANDE', [2000, 2500, 3000, 3500]);
  assert.match(x.fonte, /banco de preços/); assert.ok(x.de >= 2000 && x.ate <= 3500);
  assert.equal(amb.ctx.ComBP_difTxt_(12.4), '12% acima'); assert.equal(amb.ctx.ComBP_difTxt_(-8), '8% abaixo'); assert.equal(amb.ctx.ComBP_difTxt_(0.2), 'igual');
});

// ---------------------------------------------------------------- telas
function telas(o) {
  const html = ler('JS_Comercial.html');
  const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  const els = {}, pilha = [], desenhos = [];
  const el = (id) => (els[id] = els[id] || { id, style: {}, innerHTML: '', querySelectorAll: () => [], querySelector: () => null });
  el('conteudo');
  const ctx = vm.createContext({ console, setTimeout, USER_CONTEXT: { perfil: 'COMERCIAL' }, window: {},
    document: { getElementById: (id) => els[id] || null, querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, createElement: () => el('tmp' + Math.random()) },
    escapeHtml_: (v) => String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`), ehMobileModo_: () => !!o.celular, atualizarTituloMobile_() {}, abrir() {}, google: { script: { run: {} } } });
  vm.runInContext(script, ctx);
  ctx.window.SGO_NAV = ctx.SGO_NAV = { empilhar: (rot, fn) => { pilha.push({ rot, fn }); return 'x'; }, janelaVolta() {} };
  vm.runInContext('SGO_NAV = this.SGO_NAV; window.SGO_NAV = this.SGO_NAV;', ctx);
  ctx.Com_chamar_ = (acao, d, ok) => { if (acao === 'iniciar') ok({ nivel: o.nivel || 'VENDEDOR', gestao: o.nivel === 'GESTAO', avisos: [] }); };
  ctx.Comercial_renderKanban_ = (div) => desenhos.push('kanban');
  ctx.Comercial_renderGantt_ = (div) => desenhos.push('gantt');
  vm.runInContext('Com_chamar_ = this.Com_chamar_; Comercial_renderKanban_ = this.Comercial_renderKanban_; Comercial_renderGantt_ = this.Comercial_renderGantt_;', ctx);
  return { ctx, els, pilha, desenhos };
}

test('telas: endereços antigos do Quadro e do Gantt abrem Oportunidades no modo certo; trocar de modo é um passo do voltar', () => {
  const t = telas({ celular: true });
  t.ctx.Comercial_render_('comercial_kanban');
  assert.deepEqual(t.desenhos, ['kanban']); assert.equal(vm.runInContext('CM.visao', t.ctx), 'kanban'); assert.equal(vm.runInContext('CM.mod', t.ctx), 'comercial_oportunidades');
  assert.match(t.els.conteudo.innerHTML, /cm-nav-mob-btn ativo" aria-current="page" data-cm-nav="comercial_oportunidades"/, 'a barra marca Oportunidades');
  t.ctx.Comercial_render_('comercial_gantt');
  assert.deepEqual(t.desenhos, ['kanban', 'gantt']);
  // modos: três botões com os nomes do dono e a frase curta
  const m = t.ctx.Comercial_modosHtml_('kanban');
  assert.match(m, />&nbsp;Lista<\/button>/); assert.match(m, /aria-selected="true" data-cm-modo="kanban"><i class="fas fa-table-columns" aria-hidden="true"><\/i>&nbsp;Quadro \(Kanban\)<\/button>/); assert.match(m, />&nbsp;Gantt<\/button>/);
  assert.match(m, /<p class="cm-modo-dica">Uma coluna por etapa do funil\./);
  // trocar de modo empilha; o voltar devolve o modo anterior
  const botoes = [];
  const div = { isConnected: true, querySelector: () => ({}), querySelectorAll: (s) => (s === '[data-cm-modo]' ? botoes : []) };
  for (const cod of ['lista', 'kanban', 'gantt']) botoes.push({ getAttribute: () => cod, textContent: cod === 'kanban' ? ' Quadro (Kanban)' : cod, onclick: null });
  vm.runInContext('CM.visao = "kanban"; CM.mod = "comercial_oportunidades";', t.ctx);
  t.ctx.Comercial_ligarModos_(div);
  botoes[2].onclick();
  assert.equal(t.pilha.length, 1); assert.equal(t.pilha[0].rot, 'Oportunidades: gantt'); assert.equal(t.desenhos.at(-1), 'gantt');
  t.pilha[0].fn();
  assert.equal(vm.runInContext('CM.visao', t.ctx), 'kanban'); assert.equal(t.desenhos.at(-1), 'kanban');
  botoes[1].onclick(); assert.equal(t.pilha.length, 1, 'tocar no modo aberto não empilha');
});

test('telas: entrada com os quatro caminhos (vendedor e gestão), sem valores; Novo orçamento leva ao Orçamentista ou à oportunidade', () => {
  const t = telas({});
  vm.runInContext('CM.ini = { gestao: false, eu: { id: "u_ven" } };', t.ctx);
  let h = t.ctx.Comercial_entradaHtml_({ abertas: 3, minhas: 3, semProxima: 1, aguardando: 2, vencidas: 1, atrasados: 1, retornosHoje: 2, vencemSemana: 1, rascunhos: 1, vence: [] });
  assert.match(h, /<h3 id="cmEntradaTit">O que você quer fazer agora\?<\/h3>/);
  for (const r of ['Novo orçamento', 'Ver minhas oportunidades', 'Propostas aguardando resposta', 'Hoje e o que vence']) assert.match(h, new RegExp('<span class="t">' + r.replace('?', '\\?') + '</span>'));
  assert.match(h, /3 abertas · 1 sem próxima ação/); assert.match(h, /2 propostas enviadas sem resposta · 1 vencida/); assert.match(h, /1 retorno atrasado · 2 retornos hoje · 1 proposta vence em 7 dias/);
  assert.match(h, /data-caminho="vence"><span class="ic">/); assert.match(h, /cm-caminho alerta" data-caminho="vence"/);
  assert.doesNotMatch(h, /R\$/);
  vm.runInContext('CM.ini = { gestao: true, eu: { id: "u_gc" } };', t.ctx);
  h = t.ctx.Comercial_entradaHtml_({ abertas: 9, minhas: 2, semProxima: 0, aguardando: 0, vencidas: 0, atrasados: 0, retornosHoje: 0, vencemSemana: 0, rascunhos: 0, vence: [] });
  assert.match(h, /Ver as oportunidades/); assert.match(h, /9 abertas na equipe \(2 suas\)/); assert.match(h, /Nenhuma proposta esperando o cliente/); assert.match(h, /Nada vencendo agora/);
  assert.match(t.ctx.Comercial_entradaHtml_(null), /Carregando…/);
  const js = ler('JS_Comercial.html');
  assert.match(js, /if \(e === "orc"\) abrir\("comercial_orcamentista"\);/);
  assert.match(js, /CM\.filtroProp = \{ situacao: "AGUARDANDO_RESPOSTA"/);
  assert.match(js, /SGO_NAV\.janelaVolta\(g2, function \(\) \{ Comercial_janelaVence_\(CM\.entrada \|\| e\); \}\)/, 'o que abre da lista volta à lista');
});

test('menu, ajuda, manual e base do assistente: Quadro e Gantt dentro de Oportunidades; entrada, perda e relatório documentados', () => {
  const idx = ler('Index.html');
  // o dono pediu para manter Kanban e Gantt: os atalhos ficam no menu e abrem Oportunidades no modo certo
  assert.match(idx, /data-mod="comercial_kanban"[^>]*onclick="abrir\('comercial_kanban'\)"/);
  assert.match(idx, /data-mod="comercial_gantt"[^>]*onclick="abrir\('comercial_gantt'\)"/);
  assert.match(idx, /data-mod="comercial_oportunidades" data-busca="[^"]*kanban[^"]*gantt/);
  assert.match(ler('JS_Comercial.html'), /var CM_NAV = \[\[[^\]]*\]((?!comercial_kanban).)*\["comercial_metodologia", "Metodologia"\]\];/s);
  const ajuda = ler('SGO_Ajuda_Comercial.js');
  for (const r of [/O que você quer fazer agora\?/, /Quadro \(Kanban\)/, /Completar quem ganhou/, /Preço proposto × ganho ou perdido/]) assert.match(ajuda, r);
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_COMERCIAL.md'), 'utf8');
  for (const r of [/O que você quer fazer agora\?/, /Completar quem ganhou/, /Preço proposto × ganho ou perdido/]) assert.match(manual, r);
  const base = fs.readFileSync(path.join(pasta, 'SGO_AssistenteManuais.js'), 'utf8');
  assert.match(base, /Completar quem ganhou/);
  // CRLF preservado nos arquivos que já eram CRLF
  for (const f of ['JS_Comercial.html', 'Index.html', 'SGO_Comercial_Propostas.js']) { const s = ler(f); assert.equal((s.match(/\r\n/g) || []).length, (s.match(/\n/g) || []).length, f + ' com CRLF em todas as linhas'); }
});
