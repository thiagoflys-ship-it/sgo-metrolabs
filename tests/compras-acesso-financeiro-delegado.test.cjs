'use strict';
// Delegação do Financeiro em Compras a quem não é do Financeiro.
//
// 17/11/2026 (falhas antigas): a versão de 04/11/2026 deste teste conferia a lista "financeiros" das Regras de compras
// (commit 7f0128a1 do Codex). Essa lista NUNCA foi publicada (não existe na produção) e foi substituída por duas decisões
// publicadas depois:
//   - Acessos por caixas, lote 3 (15/11/2026, AGENTS.md): o Financeiro em Compras é liberado pessoa a pessoa pelas caixas
//     FIN_CONFERIR_COMPRAS, FIN_CARTOES_EDITAR... em Administração > Acessos (SGO_Compras_Config.js, Cmp_cx_ e Cmp_exigirFinCx_);
//   - SIGILO do Financeiro (16/11/2026, AGENTS.md e PUBLICADO_FINANCEIRO_SIGILO_20261116.txt): acima das caixas, a conta precisa
//     estar na LISTA DE SIGILO (OMIE_SIGILO_CONTAS), que só o responsável pelo sistema altera (Painel financeiro > Sigilo e acessos).
// As mesmas sete garantias de antes passam a ser conferidas sobre esse mecanismo, com o código real e as 23 contas reais
// (tests/_poderes_ambiente.cjs). Delegado: matheusgodoi (GESTOR, Qualidade). Só dados de teste nos cartões.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente } = require('./_poderes_ambiente.cjs');

const EXTRAS = ['SGO_Omie.js', 'SGO_Compras_Cotacoes.js', 'SGO_Compras_Financeiro.js', 'SGO_Compras_Fornecedores.js', 'SGO_Compras_Painel.js', 'SGO_Compras_Pedido.js',
  'SGO_Compras_Requisicoes.js', 'SGO_Compras_Informar.js', 'SGO_Compras_Relatorios.js'];
const plain = (x) => JSON.parse(JSON.stringify(x === undefined ? null : x));
const DELEGADO = 'matheusgodoi', OUTRO_GESTOR = 'ricardo';

function amb() {
  const a = ambiente({ extras: EXTRAS });
  a.eu = (login) => a.ctx.Cmp_eu_('s_' + login);
  a.compras = (login, acao, d) => plain(a.ctx.Compras_api('s_' + login, acao, plain(d || {})));
  a.lista = () => plain(a.ctx.OmieSig_lista_());
  // o responsável pelo sistema grava a lista de sigilo pelo Painel financeiro (Omie_apiSigiloSalvar), como na produção
  a.sigilo = (login, ids, motivo) => { const r = plain(a.ctx.Omie_apiSigiloSalvar('s_' + login, { ids, motivo: motivo || 'Delegação de teste em Compras' })); a.limparMemo(); return r; };
  a.caixas = (login, mudancas) => { const r = a.api('admin', 'salvar', { usuarioId: a.idDe(login), motivo: 'Delegação de teste em Compras', mudancas }); a.limparMemo(); return r; };
  a.delegar = (login) => {
    const s = a.sigilo('admin', a.lista().concat([a.idDe(login)]));
    assert.equal(s.ok, true, s.mensagem);
    const c = a.caixas(login, [{ codigo: 'FIN_CONFERIR_COMPRAS', valor: 'SIM' }, { codigo: 'FIN_CARTOES_EDITAR', valor: 'SIM' }]);
    assert.ok(c && c.ok, 'gravar as caixas: ' + JSON.stringify(c));
  };
  return a;
}
const temFin = (a, login) => a.ctx.Cmp_cx_(a.eu(login), 'FIN_CONFERIR_COMPRAS', !!a.eu(login).financeiro);

test('delegação financeira de Compras mantém perfil, área e alçadas existentes', () => {
  const a = amb(), usuarios = JSON.stringify(a.tabelas.CAD_USUARIOS), regras = JSON.stringify(a.tabelas.CMP_CONFIG);
  assert.equal(temFin(a, DELEGADO), false, 'antes da delegação o gestor não confere compras');
  a.delegar(DELEGADO);
  const eu = a.eu(DELEGADO);
  assert.equal(eu.perfil, 'GESTOR'); assert.equal(eu.area, 'QUALIDADE');
  assert.equal(eu.financeiro, false, 'eu.financeiro (perfil/área) não é sobrescrito: a delegação vem das caixas');
  assert.equal(temFin(a, DELEGADO), true);
  assert.equal(a.ctx.CmpCart_podeEditar_(eu), true);
  assert.equal(JSON.stringify(a.tabelas.CAD_USUARIOS), usuarios, 'cadastro do usuário intacto');
  assert.equal(JSON.stringify(a.tabelas.CMP_CONFIG), regras, 'regras e alçadas de Compras intactas');
  assert.equal(temFin(a, OUTRO_GESTOR), false, 'outro gestor continua sem o Financeiro');
});

test('delegados cadastram cartão e consultam conferência sem alterar dados globais do usuário', () => {
  const a = amb();
  a.delegar(DELEGADO);
  const usuarios = JSON.stringify(a.tabelas.CAD_USUARIOS);
  const card = a.compras(DELEGADO, 'salvarCartao', { final: '6789', apelido: 'Cartão fictício QA', tipo: 'CREDITO', responsavelId: a.idDe('guilherme'), diaFechamento: 5, diaVencimento: 15 });
  assert.equal(card.ok, true, card.message);
  const list = a.compras(DELEGADO, 'cartoes', {});
  assert.equal(list.ok, true, list.message); assert.equal(list.podeEditar, true); assert.equal(list.cartoes.some((c) => c.final === '6789'), true);
  const conf = a.compras(DELEGADO, 'financeiro', {});
  assert.equal(conf.ok, true, conf.message);
  assert.equal(JSON.stringify(a.tabelas.CAD_USUARIOS), usuarios);
});

test('gestor sem autorização não amplia a própria permissão financeira', () => {
  const a = amb(), antes = a.lista(), props = a.props.OMIE_SIGILO_CONTAS;
  const s = a.sigilo(DELEGADO, antes.concat([a.idDe(DELEGADO)]), 'Tentativa QA de ampliar acesso financeiro');
  assert.equal(s.ok, false);
  assert.match(s.mensagem, /sigiloso|Só o responsável pelo sistema/);
  assert.deepEqual(a.lista(), antes); assert.equal(a.props.OMIE_SIGILO_CONTAS, props);
  // a caixa SIM gravada por quem pode não abre nada para quem está fora da lista (trava acima das caixas)
  const c = a.caixas(DELEGADO, [{ codigo: 'FIN_CONFERIR_COMPRAS', valor: 'SIM' }]);
  assert.equal(c.ok, false); assert.match(c.message, /sigilosa/);
  assert.equal(temFin(a, DELEGADO), false);
  assert.match(a.compras(DELEGADO, 'financeiro', {}).message, /sigiloso/);
});

test('tela antiga que manda "financeiros" nas Regras de compras não dá nem tira acessos', () => {
  const a = amb();
  a.delegar(DELEGADO);
  const r = plain(a.ctx.Cmp_regras_());
  r.financeiros = [a.idDe(OUTRO_GESTOR)]; // campo da versão não publicada de 04/11: ignorado
  const res = a.compras('admin', 'regras', { salvar: r, motivo: 'Atualização de regras por tela anterior QA' });
  assert.equal(res.ok, true, res.message);
  assert.equal(plain(a.ctx.Cmp_regras_()).financeiros, undefined, 'a lista antiga não é gravada');
  assert.equal(temFin(a, OUTRO_GESTOR), false);
  assert.equal(temFin(a, DELEGADO), true, 'a delegação pelas caixas continua');
});

test('delegação recusa usuário inativo e contas de fora da empresa', () => {
  for (const login of ['hst', 'energiza2209']) {
    const a = amb(), antes = a.lista();
    const s = a.sigilo('admin', antes.concat([a.idDe(login)]));
    assert.equal(s.ok, false, login); assert.match(s.mensagem, /fora da empresa/); assert.deepEqual(a.lista(), antes);
  }
  const a = amb(), antes = a.lista();
  a.tabelas.CAD_USUARIOS.find((u) => u.USUARIO === DELEGADO).STATUS = 'INATIVO';
  const s = a.sigilo('admin', antes.concat([a.idDe(DELEGADO)]));
  assert.equal(s.ok, false); assert.match(s.mensagem, /não está ativa/); assert.deepEqual(a.lista(), antes);
  const x = a.sigilo('admin', antes.concat(['conta-inexistente']));
  assert.equal(x.ok, false); assert.match(x.mensagem, /não existe mais/);
});

test('destinatários financeiros: só o Financeiro da lista de sigilo, respeitando a exclusão; delegado por caixa não entra', () => {
  // Os avisos do Financeiro de Compras (CmpFin_idsFinanceiro_) vão para quem é do Financeiro (perfil ou área) E está na lista
  // de sigilo. A delegação pelas caixas libera telas; não transforma o gestor em destinatário dos avisos do Financeiro.
  const a = amb();
  a.delegar(DELEGADO);
  const us = a.ctx.Cmp_usuarios_();
  assert.deepEqual(Array.from(a.ctx.CmpFin_idsFinanceiro_(us, [])).sort(), [a.idDe('wanessa')]);
  assert.deepEqual(Array.from(a.ctx.CmpFin_idsFinanceiro_(us, [a.idDe('wanessa')])), []);
});

test('retirada da delegação revoga edição e conferência imediatamente', () => {
  const a = amb();
  a.delegar(DELEGADO);
  assert.equal(temFin(a, DELEGADO), true);
  const s = a.sigilo('admin', a.lista().filter((id) => id !== a.idDe(DELEGADO)), 'Fim da delegação de teste');
  assert.equal(s.ok, true, s.mensagem);
  // a caixa SIM continua gravada em Acessos, mas fora da lista de sigilo ela não vale
  assert.equal(temFin(a, DELEGADO), false);
  assert.equal(a.ctx.CmpCart_podeEditar_(a.eu(DELEGADO)), false);
  assert.match(a.compras(DELEGADO, 'financeiro', {}).message, /sigiloso/);
  assert.match(a.compras(DELEGADO, 'salvarCartao', { final: '1111', apelido: 'QA', tipo: 'CREDITO', responsavelId: a.idDe('guilherme'), diaFechamento: 5, diaVencimento: 15 }).message, /sigiloso|Financeiro/);
});
