// Revisão da etapa C2 do Comercial (01/11/2026): um teste para cada defeito corrigido. Código real num contexto isolado
// (tests/_comercial_ambiente.cjs). Só dados de teste (nomes de serviço genéricos, sem dados de produção).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente, oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const reg = (amb, id) => amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === id);
const prod = (amb, cod) => amb.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === cod);
const textoDe = (html) => html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const itemCat = (p, q, extra) => Object.assign({ produtoId: p.ID, descricao: p.NOME, quantidade: q || 1, precoUnitario: String(p.PRECO).replace('.', ',') }, extra || {});

function amb0() {
  const amb = ambiente({ tabelas: { qual_distancia_referencia: [] } });
  amb.ctx.CONDUTA_SHEETS = { DISTANCIA_REFERENCIA: 'qual_distancia_referencia' };
  amb.ctx.Conduta_obterParametros_ = () => ({ VALOR_INCENTIVO_MISSAO: 300, MISSAO_KM_MINIMO: 200 });
  return amb;
}

test('importação C1: nome com outra palavra de ligação ("em" x "de", "e" x "com") casa com o item que já existe, em vez de criar item repetido; com dois iguais, o que tem preço', () => {
  const amb = amb0();
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'CASA-SEL', nome: 'Manutenção preventiva em seladora', tipo: 'SERVICO', preco: '300,00' }));
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'CASA-AN0', nome: 'Calibração e teste de segurança elétrica de aparelho de anestesia', tipo: 'SERVICO', preco: '0' }));
  // repetido que veio do CRM antigo (a tela de cadastro não deixa criar outro com o mesmo nome)
  amb.tabelas.COM_PRODUTOS.push({ ID: 'casa_an1', CODIGO: 'CASA-AN1', NOME: 'Calibração e teste de segurança elétrica de aparelho de anestesia', TIPO: 'SERVICO', PRECO: 320, ATIVO: 'SIM', ATUALIZADO_EM: '2026-10-26T12:00' });
  // nome parecido, mas é outro serviço: não casa
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'CASA-FRZ', nome: 'Termômetro digital de freezer', tipo: 'PRODUTO', preco: '85,00' }));
  const pv = ok(amb.api('s_dora', 'importarC1Previa'));
  const sel = pv.linhas.find((l) => l.codigo === 'MP_SELADORA'), an = pv.linhas.find((l) => l.codigo === 'CAL_ANESTESIA');
  assert.equal(sel.situacao, 'EXISTE'); assert.equal(sel.existente.codigo, 'CASA-SEL');
  assert.equal(an.situacao, 'EXISTE'); assert.equal(an.existente.codigo, 'CASA-AN1', 'entre os iguais, o que tem preço');
  assert.match(an.outrosIguais, /Há mais 1 item ativo com o mesmo nome/);
  assert.equal(pv.linhas.find((l) => l.codigo === 'QT_FREEZER').situacao, 'NOVO');
  assert.deepEqual(JSON.parse(JSON.stringify(pv.resumo)), { NOVO: 40, JA_IMPORTADO: 0, EXISTE: 2 });
  ok(amb.api('s_dora', 'importarC1', { marca: pv.marca, escolhas: {} }));
  assert.equal(prod(amb, 'CASA-SEL').PRECO, 300, 'o preço de venda gravado não muda');
  assert.equal(prod(amb, 'CASA-SEL').TABELA_CODIGO, 'C1:MP_SELADORA');
  assert.equal(amb.tabelas.COM_PRODUTOS.filter((p) => /manuten.*seladora/i.test(p.NOME)).length, 1, 'não criou outra manutenção de seladora');
  const pv2 = ok(amb.api('s_dora', 'importarC1Previa'));
  assert.deepEqual(JSON.parse(JSON.stringify(pv2.resumo)), { NOVO: 0, JA_IMPORTADO: 42, EXISTE: 0 }, 'idempotente');
});

test('importação C1: "Criar um item novo" deixa o existente como está e não repete o código; escolha inválida não grava nada', () => {
  const amb = amb0();
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'MP-SELADORA', nome: 'Seladora: manutenção da casa', tipo: 'SERVICO', preco: '280,00', descricao: 'Da casa' }));
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'CASA-CEN', nome: 'Calibração de centrífuga', tipo: 'SERVICO', preco: '350,00' }));
  const pv = ok(amb.api('s_dora', 'importarC1Previa'));
  assert.ok(pv.escolhas.CRIAR, 'a escolha nova aparece na prévia');
  const antes = amb.tabelas.COM_PRODUTOS.length;
  const ruim = amb.api('s_dora', 'importarC1', { marca: pv.marca, escolhas: { MP_SELADORA: 'CRIAR', CAL_CENTRIFUGA: 'APAGAR' } });
  assert.equal(ruim.ok, false); assert.match(ruim.message, /a escolha "APAGAR" para .* não existe.*Nada foi gravado/);
  assert.equal(amb.tabelas.COM_PRODUTOS.length, antes, 'nenhum item criado antes do erro');
  const r = ok(amb.api('s_dora', 'importarC1', { marca: pv.marca, escolhas: { MP_SELADORA: 'CRIAR', CAL_CENTRIFUGA: 'CRIAR' } }));
  assert.equal(r.criados, 42);
  const casa = prod(amb, 'MP-SELADORA');
  assert.equal(casa.NOME, 'Seladora: manutenção da casa'); assert.equal(casa.PRECO, 280); assert.equal(casa.TABELA_CODIGO || '', '');
  assert.equal(prod(amb, 'MP-SELADORA-C1').TABELA_CODIGO, 'C1:MP_SELADORA', 'casou pelo código: o novo leva -C1');
  assert.equal(prod(amb, 'CAL-CENTRIFUGA').TABELA_CODIGO, 'C1:CAL_CENTRIFUGA');
  assert.equal(prod(amb, 'CASA-CEN').PRECO, 350);
  assert.deepEqual(JSON.parse(JSON.stringify(ok(amb.api('s_dora', 'importarC1Previa')).resumo)), { NOVO: 0, JA_IMPORTADO: 42, EXISTE: 0 });
});

test('importação C1 em item que já tinha custo: a proposta continua usando o custo cadastrado até a gestão salvar a ficha', () => {
  const amb = amb0();
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'CASA-OXI', nome: 'Calibração de oxímetro de pulso', tipo: 'SERVICO', preco: '240,00', custo: '120,00' }));
  const pv = ok(amb.api('s_dora', 'importarC1Previa'));
  const l = pv.linhas.find((x) => x.codigo === 'CAL_OXIMETRO');
  assert.equal(l.situacao, 'EXISTE'); assert.match(l.custoFica, /O custo cadastrado \(R\$ 120,00\) continua valendo/);
  ok(amb.api('s_dora', 'importarC1', { marca: pv.marca, escolhas: {} }));
  const p = prod(amb, 'CASA-OXI');
  assert.equal(p.CUSTO, 120); assert.ok(Number(p.HORAS_TECNICO) > 0, 'a ficha da C1 fica visível'); assert.equal(p.FICHA_EM || '', '');
  assert.equal(amb.ctx.ComF_custoProduto_(p, amb.ctx.ComPr_politica_()), 120);
  // catálogo (gestão): mostra a conta da C1, mas o custo é o cadastrado
  const cat = ok(amb.api('s_dora', 'catalogo', { busca: 'CASA-OXI' })).produtos[0];
  assert.equal(cat.custo, 120); assert.equal(cat.ficha.vale, false); assert.equal(cat.ficha.custoCadastradoTxt, 'R$ 120,00');
  // proposta nova: custo do item = o cadastrado
  const { oportunidade } = oportunidadeDeTeste(amb);
  const np = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  ok(amb.api('s_vera', 'salvarProposta', { id: np.proposta.id, deslocamento: SEM_VIAGEM, itens: [itemCat(p)] }));
  assert.equal(JSON.parse(reg(amb, np.proposta.id).ITENS_JSON)[0].custoUnitario, 120);
  // a gestão salva a ficha: passa a valer
  ok(amb.api('s_dora', 'salvarFicha', { id: p.ID, horasTecnico: p.HORAS_TECNICO, horasEngenheiro: p.HORAS_ENGENHEIRO, padroes: p.PADROES_CUSTO, consumiveis: p.CONSUMIVEIS_CUSTO }));
  const p2 = prod(amb, 'CASA-OXI');
  assert.notEqual(amb.ctx.ComF_custoProduto_(p2, amb.ctx.ComPr_politica_()), 120);
  assert.equal(ok(amb.api('s_dora', 'catalogo', { busca: 'CASA-OXI' })).produtos[0].ficha.vale, true);
});

test('margem mínima: o gestor comercial não muda a margem mandando só a política de desconto (sem página), nem com a precificação ainda não gravada', () => {
  const amb = amb0();
  assert.equal(amb.ctx.ComPr_politica_().margemMinPct, 10);
  const r = ok(amb.api('s_gaspar', 'metodologia'));
  const salvar = JSON.parse(JSON.stringify(r.metodologia));
  delete salvar.precificacao; salvar.politica.margemMinPct = 50;
  ok(amb.api('s_gaspar', 'metodologia', { salvar, motivo: 'Teste: gravação sem página' }));
  amb.ctx.COM_METODOLOGIA_MEMO = null;
  assert.equal(amb.ctx.ComPr_politica_().margemMinPct, 10, 'a margem continua a da precificação');
  assert.equal(amb.ctx.Com_metodologia_().politica.margemMinPct, 10);
  // pela página Preço e desconto, a política de desconto também não leva a margem
  ok(amb.api('s_gaspar', 'metodologia', { pagina: 'PRECO', salvar: { politica: { descontoMaxPct: 12, margemMinPct: 60 } }, motivo: 'Teste: desconto do vendedor 12%' }));
  amb.ctx.COM_METODOLOGIA_MEMO = null;
  assert.equal(amb.ctx.ComPr_politica_().margemMinPct, 10); assert.equal(amb.ctx.Com_metodologia_().politica.descontoMaxPct, 12);
  // a Diretoria muda (zero = não confere) e uma gravação sem página depois não volta para 10
  ok(amb.api('s_dora', 'metodologia', { pagina: 'PRECO', salvar: { precificacao: { margemMinPct: 0 } }, motivo: 'Teste: Diretoria tira a margem mínima' }));
  amb.ctx.COM_METODOLOGIA_MEMO = null;
  const s2 = JSON.parse(JSON.stringify(ok(amb.api('s_gaspar', 'metodologia')).metodologia)); delete s2.precificacao;
  ok(amb.api('s_gaspar', 'metodologia', { salvar: s2, motivo: 'Teste: outra gravação sem página' }));
  amb.ctx.COM_METODOLOGIA_MEMO = null;
  assert.equal(amb.ctx.ComPr_politica_().margemMinPct, 0);
});

test('documento e tela da proposta: o prazo da faixa é o da gravação; a Diretoria mudar a faixa depois não muda proposta já concluída', () => {
  const amb = amb0();
  const pv = ok(amb.api('s_dora', 'importarC1Previa')); ok(amb.api('s_dora', 'importarC1', { marca: pv.marca, escolhas: {} }));
  const ac = prod(amb, 'QT-AUTOCLAVE-GRANDE');
  const { oportunidade } = oportunidadeDeTeste(amb);
  const np = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  const id = np.proposta.id;
  ok(amb.api('s_vera', 'salvarProposta', { id, prazo: { faixa: 'NORMAL' }, deslocamento: { viagem: { ha: 'NAO', motivoSem: 'Cliente traz o equipamento' }, frete: { nsa: true, motivo: 'Cliente retira' } },
    itens: [itemCat(ac, 1, { faixa: 'URGENTE', precoUnitario: '6.350,00' })], condicoes: { pagamento: 'Boleto em 28 dias', garantia: '90 dias' } }));
  assert.equal(JSON.parse(reg(amb, id).PRAZO_JSON).politica.faixas.find((f) => f.codigo === 'URGENTE').diasUteis, 3);
  ok(amb.api('s_vera', 'concluirProposta', { id }));
  const met = ok(amb.api('s_dora', 'metodologia'));
  const faixas = met.metodologia.precificacao.prazo.faixas.map((f) => Object.assign({}, f, f.codigo === 'URGENTE' ? { diasUteis: 4 } : {}));
  ok(amb.api('s_dora', 'metodologia', { pagina: 'PRECO', salvar: { precificacao: { prazo: { faixas } } }, motivo: 'Teste: urgente passa a 4 dias úteis' }));
  amb.ctx.COM_METODOLOGIA_MEMO = null;
  const g = ok(amb.api('s_vera', 'gerarDocumento', { id }));
  const t = textoDe(amb.arquivos[g.htmlId].bytes.toString('utf8'));
  assert.match(t, /Prazo urgente: até 3 dias úteis até a entrega do relatório ou certificado/);
  assert.doesNotMatch(t, /até 4 dias úteis/);
  const tela = ok(amb.api('s_vera', 'proposta', { id })).proposta;
  assert.match(tela.prazoTexto, /em até 3 dias úteis/); assert.equal(tela.prazo.politica, undefined, 'o retrato fica no servidor');
  // proposta antiga (sem retrato): usa a política em vigor, sem quebrar
  const r = reg(amb, id), pz = JSON.parse(r.PRAZO_JSON); delete pz.politica; r.PRAZO_JSON = JSON.stringify(pz);
  assert.match(ok(amb.api('s_vera', 'proposta', { id })).proposta.prazoTexto, /em até 4 dias úteis/);
});

test('tela: o "Voltar" do passo 4 volta ao passo 3 depois que o passo 4 salvou e redesenhou a proposta; trocar de página da Metodologia com algo digitado pergunta', () => {
  const html = fs.readFileSync(path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db/JS_Comercial.html'), 'utf8');
  const el = (atrs) => ({ atrs: atrs || {}, hidden: false, style: {}, textContent: '', classList: { toggle() {} }, getAttribute(k) { return this.atrs[k] === undefined ? null : this.atrs[k]; }, setAttribute() {}, removeAttribute() {}, onclick: null });
  const editor = () => { const paineis = [1, 2, 3, 4].map((n) => el({ 'data-painel': String(n) })); return { paineis, offsetTop: 0, getBoundingClientRect() { return {}; }, querySelectorAll(sel) { return sel === '[data-painel]' ? paineis : []; } }; };
  const ids = { cmEditor: editor(), cmPassoAnt: el(), cmPassoProx: el() };
  const pilha = [];
  const tela = vm.createContext({ console, setTimeout, USER_CONTEXT: { perfil: 'COMERCIAL' }, escapeHtml_: (v) => String(v),
    window: { SGO_NAV: { ligado: true, empilhar: (rot, fn) => { pilha.push(fn); } } },
    document: { getElementById: (id) => ids[id] || null, querySelectorAll: () => [], querySelector: () => null, addEventListener() {} }, google: { script: { run: {} } } });
  tela.SGO_NAV = tela.window.SGO_NAV;
  vm.runInContext(html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>')), tela);
  tela.SGO_voltarOu_ = (fn) => { const f = pilha.pop(); if (f) f(); else fn(); };
  const visivel = () => ids.cmEditor.paineis.filter((s) => !s.hidden).map((s) => s.atrs['data-painel']).join(',');
  // o passo 4 salva o rascunho e a proposta é desenhada de novo (editor novo no lugar do antigo)
  const salvar = () => { ids.cmEditor = editor(); tela.Comercial_ligarPassos_({ id: 'p1' }, salvar); };
  tela.Comercial_ligarPassos_({ id: 'p1' }, salvar);
  assert.equal(visivel(), '1');
  ids.cmPassoProx.onclick(); ids.cmPassoProx.onclick(); ids.cmPassoProx.onclick();
  assert.equal(visivel(), '4');
  ids.cmPassoAnt.onclick();
  assert.equal(visivel(), '3', 'antes, o voltar mexia no editor antigo e a tela continuava no passo 4');
  // Metodologia: a troca de página confere se há mudança não salva
  assert.match(html, /if \(CM\.metSujo && !window\.confirm\('Você mudou campos da página/);
  assert.match(html, /CM\.metSujo = false;/);
});

test('assistente: o manual de preços do Comercial (custo da hora, margens) chega só a quem vê custo no Comercial; gestor de outra área e vendedor leem só o título', () => {
  const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
  const ctx = vm.createContext({ console, Utilities: {}, SGO_UTILS: { safeUpper: (v) => String(v || '').trim().toUpperCase() } });
  for (const f of ['SGO_AssistenteNucleo.js', 'SGO_AssistenteManuais.js', 'SGO_Assistente.js']) vm.runInContext(fs.readFileSync(path.join(pasta, f), 'utf8'), ctx, { filename: f });
  const veCusto = { s_gc: true, s_gt: false, s_ven: false, s_dir: true };
  const perfis = { s_gc: 'GESTOR', s_gt: 'GESTOR', s_ven: 'COMERCIAL', s_dir: 'DIRETORIA' };
  ctx.exigirSessao = (sid) => ({ userId: sid, nome: sid, perfil: perfis[sid] });
  ctx.Com_eu_ = (sid) => ({ veCusto: veCusto[sid] });
  const m = ctx.SGO_ASSIST_MANUAIS.manuais.find((x) => x.arquivo === 'MANUAL_COMERCIAL_PRECOS_GESTAO.md');
  assert.ok(m, 'o manual está na base');
  const t = { tipo: 'manual', titulo: 'Valores iniciais', texto: 'custo da hora', modulo: m.tela, tela: m.tela, quemTela: m.tela, perfisManual: m.perfis, soCustoComercial: true };
  const base = { quem: {}, telasRH: [] };
  const sit = (sid) => ctx.SGO_Assist_situacao_(base, t, ctx.SGO_Assist_eu_(sid));
  assert.equal(sit('s_gc').restrito, false, 'gestão comercial lê');
  assert.equal(sit('s_dir').restrito, false, 'Diretoria lê');
  assert.equal(sit('s_gt').restrito, true, 'gestor de outra área: só o título');
  assert.equal(sit('s_ven').restrito, true, 'vendedor: só o título');
  assert.match(fs.readFileSync(path.join(pasta, 'SGO_Assistente.js'), 'utf8'), /soCustoComercial: m\.arquivo === 'MANUAL_COMERCIAL_PRECOS_GESTAO\.md'/);
});
