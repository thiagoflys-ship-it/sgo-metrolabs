// Comercial (29/10/2026, pedido do dono): "dar permissão para a Mônica cadastrar produto, preços e serviços [...] não temos
// gestor comercial e a equipe é pequena" e "ela gerou uma proposta, mas errou; não conseguiu excluir e permanece no funil.
// Temos que ter opção de editar, excluir".
// (1) O vendedor mantém o catálogo com limites: cadastra item novo; altera descrição, unidade, categoria e preço; nunca abaixo
//     do custo; redução acima da alçada (acumulada) vira pedido para a gestão (Caixa de decisões); aumento grava direto; não
//     vê nem altera o custo; só arquiva; todo preço fica no histórico (quem, quando, de, para).
// (2) Proposta que nunca foi ao cliente pode ser excluída (responsável ou gestão, com motivo): some das listas, do quadro e do
//     painel; o registro fica no histórico; o número não volta. Já enviada: só cancelar, e a cancelada sai do funil.
// Código real num contexto isolado (tests/_comercial_ambiente.cjs). Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const falha = (r, re) => { assert.equal(r.ok, false, 'devia recusar'); assert.match(r.message, re); return r; };
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const prod = (amb, id) => amb.tabelas.COM_PRODUTOS.find((p) => p.ID === id);
const hist = (amb, id) => amb.tabelas.COM_HISTORICO.filter((h) => h.ENTIDADE_ID === id);

function itemDaGestao(amb, extra) {
  return ok(amb.api('s_gaspar', 'salvarProduto', Object.assign({ codigo: 'QT-AC', nome: 'Qualificação térmica de autoclave', tipo: 'SERVICO', unidade: 'un.', preco: '5.000,00', custo: '2.000,00' }, extra || {}))).produto;
}
const editar = (amb, sid, p, extra) => amb.api(sid, 'salvarProduto', Object.assign({ id: p.id, codigo: p.codigo, nome: p.nome, tipo: p.tipo, unidade: p.unidade, descricao: p.descricao || '', categoria: p.categoria || '', preco: p.preco }, extra || {}));

// ------------------------------------------------------------------ catálogo pela equipe comercial
test('vendedora cadastra item novo e altera descrição, unidade, categoria e preço; não informa nem vê o custo; código, nome e tipo do item existente ficam com a gestão', () => {
  const amb = ambiente();
  const ac = ok(amb.api('s_vera', 'acesso'));
  assert.equal(ac.catalogoVenda, true); assert.equal(ac.catalogo, false, 'acesso completo continua só com gestão e Financeiro');
  falha(amb.api('s_vera', 'salvarProduto', { codigo: 'CAL-TERMO', nome: 'Calibração de termômetro', preco: '180,00', custo: '50,00' }), /custo do item é cadastrado pela gestão comercial ou pelo Financeiro/);
  assert.equal((amb.tabelas.COM_PRODUTOS || []).length, 0, 'nada gravado');
  const novo = ok(amb.api('s_vera', 'salvarProduto', { codigo: 'CAL-TERMO', nome: 'Calibração de termômetro', tipo: 'SERVICO', preco: '180,00', categoria: 'Calibração' }));
  assert.equal(novo.produto.custo, undefined, 'vendedora não vê custo');
  assert.equal(prod(amb, novo.produto.id).PRECO, 180);
  assert.match(hist(amb, novo.produto.id)[0].TEXTO, /cadastrado com preço de venda de R\$ 180,00 pela equipe comercial/);
  // a gestão põe o custo; a vendedora edita o resto sem apagar o custo
  const g = itemDaGestao(amb);
  ok(editar(amb, 's_vera', g, { descricao: 'Com relatório A4 e certificado', unidade: 'equip.', categoria: 'Qualificação' }));
  const r = prod(amb, g.id);
  assert.equal(r.DESCRICAO, 'Com relatório A4 e certificado'); assert.equal(r.UNIDADE_MEDIDA, 'equip.'); assert.equal(r.CATEGORIA, 'Qualificação');
  assert.equal(r.CUSTO, 2000, 'custo preservado');
  falha(editar(amb, 's_vera', g, { nome: 'Qualificação térmica de autoclave hospitalar', codigo: 'QT-AC2' }), /o código e o nome de um item já cadastrado são alterados pela gestão comercial ou pelo Financeiro.*arquive-o e cadastre o certo/);
  falha(editar(amb, 's_vera', g, { tipo: 'PRODUTO' }), /o tipo de um item já cadastrado é alterado pela gestão/);
  // aumento de preço grava direto, com histórico de quanto para quanto
  ok(editar(amb, 's_vera', g, { preco: '5.500,00' }));
  assert.equal(prod(amb, g.id).PRECO, 5500);
  const hp = hist(amb, g.id).filter((h) => h.TIPO === 'PRECO').pop();
  assert.equal(hp.DE, 'R$ 5.000,00'); assert.equal(hp.PARA, 'R$ 5.500,00'); assert.equal(hp.USUARIO_ID, 'u_ven'); assert.ok(hp.DATA);
  // histórico de preço na tela
  const hh = ok(amb.api('s_vera', 'historicoProduto', { id: g.id })).historico;
  assert.ok(hh.some((h) => h.tipo === 'PRECO' && h.de === 'R$ 5.000,00' && h.para === 'R$ 5.500,00' && /VERA/.test(h.por)));
  // técnico continua sem acesso
  falha(amb.api('s_tiago', 'salvarProduto', { codigo: 'X-1', nome: 'Item do técnico', preco: 1 }), /Comercial é da equipe comercial/);
});

test('preço nunca abaixo do custo; redução dentro da alçada grava; acima (acumulada) vira pedido para a gestão, com motivo, Caixa de decisões e aviso; o preço atual vale até a decisão', () => {
  const amb = ambiente();
  const g = itemDaGestao(amb);
  falha(editar(amb, 's_vera', g, { preco: '1.900,00' }), /abaixo do custo cadastrado deste item.*Nada foi gravado/);
  assert.doesNotMatch(editar(amb, 's_vera', g, { preco: '1.900,00' }).message, /2\.000/, 'a mensagem não revela o custo');
  assert.equal(prod(amb, g.id).PRECO, 5000);
  // 10% (alçada padrão de desconto: 15%): grava direto e guarda de onde a redução partiu
  ok(editar(amb, 's_vera', g, { preco: '4.500,00' }));
  assert.equal(prod(amb, g.id).PRECO, 4500); assert.equal(prod(amb, g.id).PRECO_REFERENCIA, 5000);
  // mais 8,9% sobre 4.500 = 18% sobre 5.000: passa da alçada (não dá para reduzir em degraus)
  falha(editar(amb, 's_vera', g, { preco: '4.100,00' }), /redução de 18,0% no preço \(de R\$ 5\.000,00 para R\$ 4\.100,00\) passa da sua alçada de 15%.*Escreva o motivo/);
  assert.equal(prod(amb, g.id).PRECO, 4500);
  const r = ok(editar(amb, 's_vera', g, { preco: '4.100,00', motivoPreco: 'Concorrente cotou mais barato no hospital Alfa', descricao: 'Texto novo' }));
  assert.equal(r.pendente, true);
  assert.match(r.message, /aguardando aprovação da Diretoria ou da gestão comercial \(Caixa de decisões\).*propostas usam o preço atual de R\$ 4\.500,00/);
  const p = prod(amb, g.id);
  assert.equal(p.PRECO, 4500, 'preço não muda antes da decisão'); assert.equal(p.PRECO_PEDIDO, 4100); assert.equal(p.PRECO_PEDIDO_SITUACAO, 'PENDENTE'); assert.equal(p.DESCRICAO, 'Texto novo', 'o restante grava');
  assert.equal(ok(amb.api('s_vera', 'catalogo')).produtos.find((x) => x.id === g.id).precoPedido.precoTxt, 'R$ 4.100,00');
  // Caixa de decisões e aviso, sem R$
  const pend = amb.ctx.SGO_Pendencias_listar('s_gaspar', { semCache: true }).itens.filter((i) => i.tipo === 'comercial_preco');
  assert.equal(pend.length, 1);
  assert.match(pend[0].titulo, /Preço do item QT-AC .*aguardando aprovação/);
  assert.doesNotMatch(pend[0].titulo + pend[0].detalhe, /R\$\s?\d/);
  const av = amb.tabelas.COM_AVISOS.filter((v) => v.TIPO === 'PRECO_PEDIDO');
  assert.ok(av.some((v) => v.DESTINATARIO_ID === 'u_gc'));
  av.forEach((v) => assert.doesNotMatch(v.TITULO + v.TEXTO, /R\$\s?\d/));
  assert.equal(ok(amb.api('s_gaspar', 'catalogo', { situacao: 'PRECO_PENDENTE', incluirArquivados: true })).produtos.length, 1);
  // a vendedora não decide; outro vendedor não sobrepõe o pedido
  falha(amb.api('s_vera', 'decidirPreco', { id: g.id, aprovar: true, texto: 'Aprovo o meu pedido' }), /ação é da gestão comercial/);
  falha(editar(amb, 's_vito', Object.assign({}, g, { descricao: 'Texto novo' }), { preco: '3.000,00', motivoPreco: 'Outro motivo qualquer aqui' }), /já aguarda a decisão sobre o pedido de VERA/);
  // gestão aprova: preço novo, referência limpa, aviso e histórico
  falha(amb.api('s_gaspar', 'decidirPreco', { id: g.id, aprovar: true, texto: 'ok' }), /fundamentação/);
  ok(amb.api('s_gaspar', 'decidirPreco', { id: g.id, aprovar: true, texto: 'Contrato anual com o hospital; mantém margem' }));
  const d = prod(amb, g.id);
  assert.equal(d.PRECO, 4100); assert.equal(d.PRECO_REFERENCIA, ''); assert.equal(d.PRECO_PEDIDO_SITUACAO, 'APROVADO');
  assert.ok(amb.tabelas.COM_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_ven' && v.TIPO === 'PRECO_APROVADO'));
  const ha = hist(amb, g.id).find((h) => h.TIPO === 'PRECO_APROVADO');
  assert.equal(ha.DE, 'R$ 4.500,00'); assert.equal(ha.PARA, 'R$ 4.100,00'); assert.equal(ha.USUARIO_ID, 'u_gc');
  assert.equal(amb.ctx.SGO_Pendencias_listar('s_gaspar', { semCache: true }).itens.filter((i) => i.tipo === 'comercial_preco').length, 0);
  // negar: o preço fica
  ok(editar(amb, 's_vera', prod2(amb, g.id), { preco: '3.000,00', motivoPreco: 'Pedido do cliente para fechar o pacote' }));
  ok(amb.api('s_dora', 'decidirPreco', { id: g.id, aprovar: false, texto: 'Abaixo do que a política permite' }));
  assert.equal(prod(amb, g.id).PRECO, 4100);
  assert.ok(amb.tabelas.COM_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_ven' && v.TIPO === 'PRECO_NEGADO'));
  // a gestão continua sem limite
  ok(editar(amb, 's_gaspar', prod2(amb, g.id), { preco: '2.500,00', custo: '2.000,00' }));
  assert.equal(prod(amb, g.id).PRECO, 2500);
});
function prod2(amb, id) { const p = prod(amb, id); return { id: p.ID, codigo: p.CODIGO, nome: p.NOME, tipo: p.TIPO, unidade: p.UNIDADE_MEDIDA, descricao: p.DESCRICAO, categoria: p.CATEGORIA, preco: p.PRECO }; }

test('alçada da vendedora vem da metodologia (por vendedor); vendedora arquiva mas não reativa; item arquivado sai da escolha das propostas', () => {
  const amb = ambiente();
  const met = amb.ctx.Com_metodologia_();
  met.politica.descontoPorVendedor = { u_ven: 5 };
  amb.ctx.Com_gravarMetodologia_(met, { id: 'u_gc', nome: 'GASPAR' }, 'teste da alçada por vendedor');
  const g = itemDaGestao(amb);
  falha(editar(amb, 's_vera', g, { preco: '4.600,00' }), /redução de 8,0%.*alçada de 5%/);
  ok(editar(amb, 's_vito', g, { preco: '4.600,00' }), 'o outro vendedor tem a alçada geral de 15%');
  const a = ok(amb.api('s_vera', 'arquivarProduto', { id: g.id }));
  assert.match(a.message, /Para reativar, peça à gestão comercial ou ao Financeiro/);
  assert.equal(prod(amb, g.id).ATIVO, 'NAO');
  assert.equal(ok(amb.api('s_vera', 'catalogo', { situacao: 'ATIVOS' })).produtos.length, 0, 'some da escolha das propostas');
  falha(amb.api('s_vera', 'arquivarProduto', { id: g.id, reativar: true }), /reativar um item arquivado é da gestão comercial ou do Financeiro/);
  ok(amb.api('s_fabio', 'arquivarProduto', { id: g.id, reativar: true }));
  assert.equal(prod(amb, g.id).ATIVO, 'SIM');
});

// ------------------------------------------------------------------ proposta: editar e excluir
function propostaDe(amb, sid, extra) {
  const { oportunidade } = oportunidadeDeTeste(amb, sid);
  const np = ok(amb.api(sid || 's_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  ok(amb.api(sid || 's_vera', 'salvarProposta', Object.assign({ deslocamento: SEM_VIAGEM, id: np.proposta.id, escopo: 'Qualificação térmica conforme norma',
    itens: [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '4.500,00', equipamentoId: 'eq1' }], condicoes: { pagamento: 'Boleto em 28 dias', prazoExecucao: 'A combinar', garantia: '90 dias' } }, extra || {})));
  return { oportunidade, id: np.proposta.id, numero: np.proposta.numero };
}
const naLista = (amb, sid, id, situacao) => ok(amb.api(sid, 'propostas', situacao ? { situacao } : {})).propostas.some((p) => p.id === id);
const cartao = (amb, opoId) => ok(amb.api('s_gaspar', 'quadro', { funil: 'ENGENHARIA' })).colunas.flatMap((c) => c.cartoes).find((c) => c.id === opoId);

test('proposta errada que nunca foi ao cliente: a responsável exclui com motivo; some das listas, do quadro e do painel; registro no histórico; número não volta; outro vendedor não exclui', () => {
  const amb = ambiente();
  const p = propostaDe(amb);
  const det = ok(amb.api('s_vera', 'proposta', { id: p.id })).proposta;
  assert.equal(det.podeExcluir, true); assert.equal(det.editavel, true);
  assert.equal(cartao(amb, p.oportunidade.id).proposta.id, p.id, 'antes: no cartão do funil');
  falha(amb.api('s_vito', 'excluirProposta', { id: p.id, motivo: 'Tentando excluir a proposta da colega' }), /é de VERA VENDEDORA TESTE/);
  falha(amb.api('s_fabio', 'excluirProposta', { id: p.id, motivo: 'Financeiro tentando excluir' }), /Financeiro vê só os pedidos aprovados/);
  falha(amb.api('s_vera', 'excluirProposta', { id: p.id, motivo: 'errei' }), /escreva o motivo \(pelo menos 10 letras/);
  const r = ok(amb.api('s_vera', 'excluirProposta', { id: p.id, motivo: 'Montei a proposta com o escopo errado' }));
  assert.match(r.message, /excluída: saiu das listas, do quadro e do painel.*histórico da oportunidade/);
  const reg = amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === p.id);
  assert.equal(reg.SITUACAO, 'EXCLUIDA'); assert.equal(reg.EXCLUIDA_POR_ID, 'u_ven'); assert.equal(reg.EXCLUIDA_MOTIVO, 'Montei a proposta com o escopo errado'); assert.ok(reg.EXCLUIDA_EM);
  for (const sit of [null, 'TODAS', 'RASCUNHO']) assert.equal(naLista(amb, 's_vera', p.id, sit), false, 'fora da lista ' + sit);
  assert.equal(naLista(amb, 's_gaspar', p.id, 'TODAS'), false);
  assert.equal(cartao(amb, p.oportunidade.id).proposta, null, 'fora do cartão do funil');
  falha(amb.api('s_vera', 'proposta', { id: p.id }), /foi excluída em .* por VERA VENDEDORA TESTE \(motivo: Montei a proposta com o escopo errado\)/);
  const ficha = ok(amb.api('s_vera', 'oportunidade', { id: p.oportunidade.id }));
  assert.equal(ficha.propostas.length, 0, 'fora da ficha da oportunidade');
  assert.ok(ficha.historico.some((h) => h.tipo === 'PROPOSTA_EXCLUIDA'), 'no histórico da ficha');
  assert.ok(amb.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE === 'OPORTUNIDADE' && h.TIPO === 'PROPOSTA_EXCLUIDA' && /PROP-2026-0001 rev\.00 excluída por VERA.*Montei a proposta/.test(h.TEXTO)));
  // a oportunidade aceita proposta nova (a excluída não trava) e o número não é reaproveitado
  const np = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: p.oportunidade.id }));
  assert.equal(np.proposta.numero, 'PROP-2026-0002');
  // a gestão também exclui (proposta da vendedora, ainda em rascunho)
  ok(amb.api('s_gaspar', 'excluirProposta', { id: np.proposta.id, motivo: 'Duplicada por engano no teste' }));
  assert.equal(amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === np.proposta.id).EXCLUIDA_POR_ID, 'u_gc');
});

test('editar: aguardando aprovação ou pronta (antes do envio) volta para rascunho pela responsável ou pela gestão; pronta com documento ainda não enviado pode ser excluída', () => {
  const amb = ambiente();
  const p = propostaDe(amb);
  ok(amb.api('s_vera', 'concluirProposta', { id: p.id }));
  assert.equal(ok(amb.api('s_vera', 'proposta', { id: p.id })).proposta.situacao, 'PRONTA');
  falha(amb.api('s_vito', 'voltarRascunho', { id: p.id }), /é de VERA/);
  ok(amb.api('s_gaspar', 'voltarRascunho', { id: p.id }));
  ok(amb.api('s_vera', 'salvarProposta', { id: p.id, deslocamento: SEM_VIAGEM, titulo: 'Título corrigido', itens: [{ descricao: 'Qualificação térmica de autoclave', quantidade: 2, precoUnitario: '4.500,00', equipamentoId: 'eq1' }] }));
  ok(amb.api('s_vera', 'concluirProposta', { id: p.id }));
  ok(amb.api('s_vera', 'gerarDocumento', { id: p.id }));
  const det = ok(amb.api('s_vera', 'proposta', { id: p.id })).proposta;
  assert.equal(det.titulo, 'Título corrigido');
  assert.equal(det.podeExcluir, true, 'documento gerado, mas não enviado');
  ok(amb.api('s_vera', 'excluirProposta', { id: p.id, motivo: 'Cliente pediu outro escopo antes do envio' }));
});

test('proposta já enviada ao cliente: não exclui (só cancela); envio pelo "Enviar documento" ainda não conferido também conta; a cancelada sai do funil e fica no filtro "Cancelada"', () => {
  const amb = ambiente();
  const p = propostaDe(amb);
  ok(amb.api('s_vera', 'concluirProposta', { id: p.id }));
  const g = ok(amb.api('s_vera', 'gerarDocumento', { id: p.id }));
  // envio registrado pela janela Enviar documento, sem ninguém abrir a proposta depois
  amb.tabelas.DOC_ENVIOS.push({ ID: 'e1', ARQUIVO_ID: g.pdfId, SITUACAO: 'ENVIADO', CANAL: 'EMAIL', DESTINO: 'ana@alfa.exemplo.test', USUARIO_ID: 'u_ven', USUARIO_NOME: 'VERA', QUANDO: '2026-10-19T10:30:00' });
  falha(amb.api('s_vera', 'excluirProposta', { id: p.id, motivo: 'Quero apagar a proposta enviada' }), /já foi ao cliente .*não é excluído. Use "Cancelar proposta"/);
  falha(amb.api('s_gaspar', 'excluirProposta', { id: p.id, motivo: 'Gestão tentando apagar a enviada' }), /já foi ao cliente/);
  const det = ok(amb.api('s_vera', 'proposta', { id: p.id })).proposta;
  assert.equal(det.situacao, 'ENVIADA'); assert.equal(det.podeExcluir, false); assert.match(det.motivoSemExcluir, /Use "Cancelar proposta"/);
  assert.equal(amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === p.id).SITUACAO, 'ENVIADA', 'não excluiu');
  assert.ok(cartao(amb, p.oportunidade.id).propostasEnviadas.length === 1);
  const c = ok(amb.api('s_vera', 'cancelarProposta', { id: p.id, motivo: 'Proposta com escopo errado; refazer' }));
  assert.match(c.message, /saiu do funil/);
  assert.equal(naLista(amb, 's_vera', p.id), false, 'fora de "Em andamento"');
  assert.equal(naLista(amb, 's_vera', p.id, 'CANCELADA'), true, 'no filtro "Cancelada"');
  const k = cartao(amb, p.oportunidade.id);
  assert.equal(k.proposta, null); assert.equal(k.propostasEnviadas.length, 0);
  assert.equal(ok(amb.api('s_vera', 'proposta', { id: p.id })).proposta.podeExcluir, false, 'cancelada depois de enviada continua sem exclusão');
});

test('revisão nova excluída antes do envio: a anterior volta a valer (enviada); rascunho cancelado sem envio também pode ser excluído', () => {
  const amb = ambiente();
  const p = propostaDe(amb);
  ok(amb.api('s_vera', 'concluirProposta', { id: p.id }));
  ok(amb.api('s_vera', 'gerarDocumento', { id: p.id }));
  ok(amb.api('s_vera', 'marcarEnviada', { id: p.id, como: 'Entregue em mãos na reunião com a CME' }));
  const rev = ok(amb.api('s_vera', 'novaRevisao', { id: p.id })).proposta;
  assert.equal(amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === p.id).SITUACAO, 'SUBSTITUIDA');
  falha(amb.api('s_vera', 'excluirProposta', { id: p.id, motivo: 'Tentando excluir a substituída' }), /já foi ao cliente/);
  const r = ok(amb.api('s_vera', 'excluirProposta', { id: rev.id, motivo: 'Revisão aberta por engano' }));
  assert.match(r.message, /PROP-2026-0001 rev\.00 voltou a ser a proposta em vigor \(enviada ao cliente\)/);
  const ant = amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === p.id);
  assert.equal(ant.SITUACAO, 'ENVIADA'); assert.equal(ant.SUBSTITUIDA_POR, '');
  // a próxima revisão não reaproveita o número da revisão excluída
  assert.equal(ok(amb.api('s_vera', 'novaRevisao', { id: p.id })).proposta.revisao, '02');
  // rascunho cancelado (nunca enviado) também sai de vez
  const amb2 = ambiente();
  const q = propostaDe(amb2);
  ok(amb2.api('s_vera', 'cancelarProposta', { id: q.id, motivo: 'Cancelada antes de qualquer envio' }));
  ok(amb2.api('s_vera', 'excluirProposta', { id: q.id, motivo: 'Não precisa ficar nem como cancelada' }));
  assert.equal(naLista(amb2, 's_vera', q.id, 'CANCELADA'), false);
});

test('tela, ajuda e manual: botões e textos novos do catálogo e da proposta', () => {
  const tela = fs.readFileSync(path.join(pasta, 'JS_Comercial.html'), 'utf8');
  assert.match(tela, /Com_chamar_\("excluirProposta"/);
  assert.match(tela, /Excluir proposta/);
  assert.match(tela, /Editar \(volta para rascunho\)/);
  assert.match(tela, /Com_chamar_\("decidirPreco"/);
  assert.match(tela, /Motivo da mudança de preço/);
  assert.match(tela, /PRECO_PENDENTE/);
  const ajuda = fs.readFileSync(path.join(pasta, 'SGO_Ajuda_Comercial.js'), 'utf8');
  assert.match(ajuda, /Excluir proposta/); assert.match(ajuda, /alçada/);
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_COMERCIAL.md'), 'utf8');
  assert.match(manual, /Excluir proposta/); assert.match(manual, /Preço aguardando aprovação/);
});
