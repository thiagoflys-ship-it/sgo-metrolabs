// Painel financeiro (15/11/2026): aba "Pedidos aprovados" (SGO_Omie_Pedidos.js + JS_Omie_Pedidos.html) e formulário de
// "Novo lançamento" com valores iniciais (cliente com o nome, referência, documento, valor, observação).
// Uso: node patch-pedidos.cjs <pasta do legado>
const fs = require('fs');
const path = require('path');
const pasta = process.argv[2];
let arq = '', t = '';
function abrir(f) { arq = path.join(pasta, f); t = fs.readFileSync(arq, 'utf8'); }
function gravar() { fs.writeFileSync(arq, t); }
function trocar(de, para, rotulo) {
  const tentativas = [[de, para], [de.replace(/\r?\n/g, '\r\n'), para.replace(/\r?\n/g, '\r\n')]];
  for (const [a, b] of tentativas) {
    const n = t.split(a).length - 1;
    if (n === 1) { t = t.replace(a, () => b); return; }
    if (n > 1) throw new Error('trecho repetido: ' + rotulo);
  }
  throw new Error('trecho não encontrado: ' + rotulo + ' em ' + arq);
}

abrir('JS_Omie_Operacoes.html');
trocar(`function OmieOps_select_(tipo, nome, rotulo, valor) {
  return '<div><label class="cadx-campo">' + rotulo + '<select required class="cadx-input" name="' + nome + '" id="omieOps_' + tipo + '"><option value="">Selecione…</option>' + (valor ? '<option selected value="' + OmieOps_esc_(valor) + '">Cadastro atual · ' + OmieOps_esc_(valor) + '</option>' : '')`,
  `function OmieOps_select_(tipo, nome, rotulo, valor, rotuloValor) {
  return '<div><label class="cadx-campo">' + rotulo + '<select required class="cadx-input" name="' + nome + '" id="omieOps_' + tipo + '"><option value="">Selecione…</option>' + (valor ? '<option selected value="' + OmieOps_esc_(valor) + '">' + OmieOps_esc_(rotuloValor || ('Cadastro atual · ' + valor)) + '</option>' : '')`, 'select');
trocar(`function OmieOps_form_(acao, id) {`, `// 15/11/2026: previo = valores iniciais do novo lançamento (Pedidos aprovados, SGO_Omie_Pedidos.js)
function OmieOps_form_(acao, id, previo) {`, 'formAssin');
trocar(`  if (id) OmieOps_rpc_('OmieOps_apiConsultar', { tipo: OMIE_OPS_UI.tipo, id: id }, function (r) { desenhar(r.titulo); }); else desenhar({});`,
  `  if (id) OmieOps_rpc_('OmieOps_apiConsultar', { tipo: OMIE_OPS_UI.tipo, id: id }, function (r) { desenhar(r.titulo); }); else desenhar(previo || {});`, 'formPrevio');
trocar(`      campos = (acao === 'criar' ? OmieOps_campo_('referencia', 'Referência única do lançamento', 'text', '', true) : '') + OmieOps_campo_('documento', 'Documento', 'text', t.documento, true) +
        OmieOps_select_('pessoas', 'pessoaId', OMIE_OPS_UI.tipo === 'pagar' ? 'Fornecedor' : 'Cliente', t.pessoaId)`,
  `      campos = (acao === 'criar' ? OmieOps_campo_('referencia', 'Referência única do lançamento', 'text', t.referencia || '', true) : '') + OmieOps_campo_('documento', 'Documento', 'text', t.documento, true) +
        OmieOps_select_('pessoas', 'pessoaId', OMIE_OPS_UI.tipo === 'pagar' ? 'Fornecedor' : 'Cliente', t.pessoaId, t.pessoaNome)`, 'formCampos');
trocar(`  document.getElementById('omieOpsTipo').value = OMIE_OPS_UI.tipo; OmieOps_lista_();
}`, `  document.getElementById('omieOpsTipo').value = OMIE_OPS_UI.tipo;
  // 15/11/2026: vindo de Pedidos aprovados, o formulário abre logo; a lista fica para o Atualizar (senão a resposta dela seria descartada)
  if (OMIE_OPS_UI.semListaUmaVez) { OMIE_OPS_UI.semListaUmaVez = false; document.getElementById('omieOpsLista').innerHTML = '<p class="cadx-sub">Toque em Atualizar para ver os títulos.</p>'; }
  else OmieOps_lista_();
}`, 'renderSemLista');
gravar();

abrir('JS_Omie_Pedidos.html');
trocar(`      OMIE_OPS_UI.tipo = 'receber';
      OmieTela_abrir_('lancamentos');`, `      OMIE_OPS_UI.tipo = 'receber'; OMIE_OPS_UI.semListaUmaVez = true;
      OmieTela_abrir_('lancamentos');`, 'pedSemLista');
gravar();

abrir('JS_Omie_Gestao.html');
trocar(`['resumo','Visão geral'], ['contas','Contas a pagar e receber'], ['lancamentos','Lançamentos e baixas'],`, `['resumo','Visão geral'], ['contas','Contas a pagar e receber'], ['pedidos','Pedidos aprovados'], ['lancamentos','Lançamentos e baixas'],`, 'aba');
trocar(`    if (aba === 'contas') { OmieTela_contas_(); return; }`, `    if (aba === 'contas') { OmieTela_contas_(); return; }
    if (aba === 'pedidos' && typeof OmiePed_render_ === 'function') { OmiePed_render_(); return; } // 15/11/2026`, 'rota');
gravar();

abrir('Index.html');
trocar(`<?!= include('JS_Omie_Faturamento'); ?>
`, `<?!= include('JS_Omie_Faturamento'); ?>
<?!= include('JS_Omie_Pedidos'); ?>
`, 'include');
gravar();

abrir('SGO_Ajuda_Financeiro.js');
trocar(`        { titulo: 'Lançar ou alterar um título', itens: [`, `        { titulo: 'Conta a receber de um pedido aprovado', itens: ['Abra "Pedidos aprovados": aparecem as propostas aprovadas pelo cliente, das mais recentes para as mais antigas. Busque pelo número, cliente, título ou OC.', 'Toque em "Preparar conta a receber". O SGO+ acha o cliente no Omie pelo CNPJ e abre o novo lançamento preenchido: cliente, documento (número da proposta), valor, referência única (SGO-número da proposta) e observação com a OC e a condição de pagamento.', 'Acima do formulário aparecem os últimos títulos que o cliente já tem no Omie: confira para não lançar em dobro.', 'Ajuste o valor e o vencimento pela condição de pagamento (parcelas: um lançamento por parcela, com a referência terminada em -1, -2…), escolha a categoria e a conta corrente e siga a prévia como em qualquer lançamento.', 'Se o cliente está sem CNPJ no SGO+ ou sem cadastro no Omie, a tela diz o que corrigir.'] },
        { titulo: 'Lançar ou alterar um título', itens: [`, 'ajuda');
gravar();
console.log('ok');
