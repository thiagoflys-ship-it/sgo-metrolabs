'use strict';
// 16/11/2026 — pente fino do sigilo do Financeiro (pedido do dono: "nada e ninguém pode ter acesso ao Financeiro, jamais;
// somente envio de informações para o setor"). Além do Painel financeiro (financeiro-omie-20261114.test.cjs), a lista de
// sigilo vale para: conferência das compras, faturas de cartão, A pagar, cadastro e limite dos cartões (Compras), Conciliação
// Caju, carga e conferência do depósito de viagem, e o relatório diário da empresa (só a contagem).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente: ambCompras } = require('./_compras_ambiente.cjs');
const { ambienteCaju } = require('./_caju_ambiente.cjs');

const SO_DONO = '["u_adm"]';
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const j = (x) => JSON.parse(JSON.stringify(x));

test('Compras: Financeiro e Diretoria fora da lista não conferem, não veem faturas nem A pagar; os demais só enviam o pagamento', () => {
  const a = ambCompras({ props: { OMIE_SIGILO_CONTAS: SO_DONO } });
  for (const sid of ['s_fabio', 's_dora']) {
    for (const acao of ['financeiro', 'aPagar', 'fatura', 'conferir', 'planilha']) {
      const r = j(a.api(sid, acao, {}));
      assert.equal(r.ok, false, sid + ' · ' + acao);
      assert.match(r.message, /Financeiro, que é sigiloso/, sid + ' · ' + acao);
    }
    const ac = j(a.api(sid, 'acesso', {}));
    assert.equal(ac.financeiro, false, sid + ': sem a Conferência do Financeiro no menu');
    assert.equal(ac.podeConciliar, false, sid + ': sem a conciliação das faturas');
    assert.equal(a.ctx.Cmp_eu_(sid).financeiro, false);
  }
  // o dono (na lista) continua
  assert.equal(j(a.api('s_admin', 'financeiro', {})).ok, true);
  assert.equal(j(a.api('s_admin', 'acesso', {})).financeiro, true);
  // quem recebe a pendência "compra para conferir": só a lista
  assert.deepEqual(a.ctx.CmpFin_idsFinanceiro_(a.ctx.Cmp_usuarios_(), []), [], 'Fabio (Financeiro, fora da lista) não é chamado');
});

test('Compras: cartões sem o limite para quem está fora da lista; cadastro do cartão só na lista', () => {
  const a = ambCompras();
  const lista = JSON.parse(a.props.OMIE_SIGILO_CONTAS);
  assert.ok(lista.includes('u_fin') && lista.includes('u_dir') && lista.includes('u_adm'), 'padrão do teste: Financeiro, Diretoria e ADMIN');
  const r = j(a.api('s_fabio', 'salvarCartao', { final: '4321', apelido: 'Cartão da empresa', tipo: 'CREDITO', responsavelId: 'u_cmp', diaFechamento: 5, diaVencimento: 15, limite: '20000,00' }));
  assert.equal(r.ok, true, JSON.stringify(r));
  const fin = j(a.api('s_fabio', 'cartoes', {}));
  assert.equal(fin.cartoes[0].limiteTxt.replace(/\s/g, ' '), 'R$ 20.000,00');
  const gestorCompras = j(a.api('s_lia', 'cartoes', {}));
  assert.equal(gestorCompras.ok, true, 'o gestor de Compras vê o cartão (final e responsável) para comprar');
  assert.equal(gestorCompras.cartoes[0].final, '4321');
  assert.equal(gestorCompras.cartoes[0].limite, '');
  assert.equal(gestorCompras.cartoes[0].limiteTxt, '', 'sem o limite');
  assert.equal(gestorCompras.podeEditar, false);
  a.props.OMIE_SIGILO_CONTAS = SO_DONO;
  assert.equal(j(a.api('s_fabio', 'cartoes', {})).ok, false, 'Financeiro fora da lista (e sem ser comprador) não vê os cartões');
  assert.equal(j(a.api('s_lia', 'cartoes', {})).cartoes[0].limiteTxt, '', 'o gestor de Compras continua sem o limite');
  assert.equal(j(a.api('s_fabio', 'salvarCartao', { id: fin.cartoes[0].id, apelido: 'Outro nome', motivo: 'teste do sigilo' })).ok, false);
});

test('Conciliação Caju, carga e conferência de viagem: Financeiro fora da lista não abre; o relatório individual da própria viagem continua', () => {
  const a = ambienteCaju({ props: { OMIE_SIGILO_CONTAS: SO_DONO } });
  const ini = a.c('wanessa', 'iniciar');
  assert.equal(ini.ok, true);
  assert.equal(ini.ver, false, 'sem o módulo no menu');
  assert.ok(Object.keys(ini.poderes).every((k) => ini.poderes[k] === false), 'nenhuma caixa: ' + JSON.stringify(ini.poderes));
  const p = a.c('wanessa', 'painel');
  assert.equal(p.ok, false);
  for (const c of ['VIAGEM_DEPOSITAR', 'VIAGEM_CONFERIR', 'CAJU_VER', 'CAJU_CARGA', 'CAJU_CONCILIAR']) assert.equal(a.ctx.SGO_pode_('s_wanessa', c), false, c);
  // na lista, a Wanessa volta a ter tudo
  a.props.OMIE_SIGILO_CONTAS = '["u_adm","u_fin"]';
  const ini2 = a.c('wanessa', 'iniciar');
  assert.equal(ini2.ver, true);
  assert.equal(a.ctx.SGO_pode_('s_wanessa', 'VIAGEM_DEPOSITAR'), true);
  // a Diretoria fora da lista também não vê (Dora)
  assert.equal(a.c('dora', 'iniciar').ver, false);
});

test('Acessos: caixa do Financeiro fora da lista aparece como sigilosa e não se libera por exceção', () => {
  const a = ambienteCaju({ props: { OMIE_SIGILO_CONTAS: SO_DONO } });
  const p = a.ctx.Poderes_poder_('CAJU_VER');
  assert.equal(typeof p.restrito, 'function');
  const av = a.ctx.Poderes_avaliar_(a.ctx.Poderes_eu_({ userId: 'u_fin', usuario: 'wanessa', nome: 'W', perfil: 'FINANCEIRO' }), p);
  assert.equal(av.origem, 'sigilo');
  const r = j(a.ctx.Poderes_api('s_admin', 'salvar', { usuarioId: 'u_mat', motivo: 'teste do sigilo do Financeiro', mudancas: [{ codigo: 'VIAGEM_DEPOSITAR', valor: 'SIM' }] }));
  assert.equal(r.ok, false);
  assert.match(r.message, /sigilosa/);
  // ver cartões (Compras) não é sigilosa: o comprador precisa do final
  assert.ok(!a.ctx.PODERES_SIGILO_FIN.test('FIN_CARTOES_VER'));
  ['FIN_A_PAGAR', 'FIN_OMIE_LANCAR', 'CAJU_FECHAR', 'VIAGEM_CONFERIR'].forEach((c) => assert.ok(a.ctx.PODERES_SIGILO_FIN.test(c), c));
  assert.ok(!a.ctx.PODERES_SIGILO_FIN.test('VIAGEM_APROVAR') && !a.ctx.PODERES_SIGILO_FIN.test('VIAGEM_SOLICITAR'), 'pedir e aprovar viagem seguem com a gerência');
});

test('Relatório diário da empresa: itens do Financeiro só na contagem, sem títulos', () => {
  const fonte = fs.readFileSync(path.join(pastaLegado, 'SGO_Gestao_RelatorioDiario.js'), 'utf8');
  const rx = new Function(fonte.match(/var RELDIA_FIN_IDS = (\/.*\/);/)[0].replace('var RELDIA_FIN_IDS = ', 'return ').replace(/;$/, ''))();
  ['CMP:CONFERIR:p1', 'CJU:PED:x:PAGO', 'CJU:DIV:k', 'VIA:CARGA:r1:0', 'VIA:CONF:r1:2026', 'VIA:ACERTO:r1:2026'].forEach((id) => assert.ok(rx.test(id), id));
  ['CMP:ESPEC:r1', 'VIA:PREST:r1:x', 'VIA:DEV:r1:0', 'CMP:FINDIV:p1'].forEach((id) => assert.ok(!rx.test(id), id + ' fica no setor de origem'));
  assert.match(fonte, /if \(doFin\(i\)\) \{ financeiro\.abertos\+\+/);
  assert.match(fonte, /if \(doFin\(p\)\) \{ financeiro\.abertos\+\+/);
  assert.match(fonte, /'Financeiro \(só números\)'/);
});
