// Representação (03/11/2026, pedido do dono): (1) a representada cadastra os próprios modelos (na abertura do pedido e no
// catálogo dela), com código único por representada, exclusão que vira inativação quando o modelo já está em equipamento,
// garantia que não muda o que já foi cadastrado, histórico com o lado e o nome e isolamento entre duas representadas;
// (2) aviso na tela (pop-up e som) para quem trata a fila de pedidos: pedido novo, complemento respondido e 75% do prazo de
// aceite, sem repetir o que a pessoa dispensou; (3) aviso com ciência na central de Avisos e WhatsApp e e-mail pela fila dos
// avisos da gestão para quem responde pela representação: só no expediente, sem duplicar, com teto diário, segundo aviso a
// 75% e nada depois de aceito, recusado ou cancelado.
// Código real do SGO+ no ambiente da Assistência (tests/_assistencia_ambiente.cjs). Só dados fictícios.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, ok, FOTO } = require('./_assistencia_ambiente.cjs');

const LEGADO = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const EXTRAS = ['SGO_CadastroQualidade.js', 'SGO_Clientes.js', 'SGO_Avisos.js', 'SGO_Avisos_Gestao.js', 'SGO_Representacao_Config.js', 'SGO_Representacao.js', 'SGO_Representacao_Avisos.js',
  'SGO_Representacao_Alertas.js', 'SGO_Representacao_Modelos.js', 'SGO_Representacao_Painel.js', 'SGO_Gantt_Layout.js'];
const CNPJ_B = '04.252.011/0001-10';
const foto = (nome) => ({ nome: nome || 'foto.jpg', tipo: 'image/jpeg', base64: FOTO });
const SEG = (hhmm) => '2026-10-19T' + hhmm + ':00-03:00'; // segunda-feira, dia útil
const FONE = { tales: '5562999990021', gil: '5562999990022', dora: '5562999990023' };

function amb(extra) {
  const o = extra || {};
  const a = ambiente(Object.assign({ extras: EXTRAS, props: { META_WA_TOKEN: 'tok-teste', META_WA_PHONE_ID: '123456' } }, o));
  a.tabelas.REP_REPRESENTADAS = [
    { ID: 'repA', NOME: 'REPRESENTADA ALFA TESTE', SITUACAO: 'ATIVA', PRAZOS_JSON: '' },
    { ID: 'repB', NOME: 'REPRESENTADA BETA TESTE', SITUACAO: 'ATIVA', PRAZOS_JSON: '' }
  ];
  a.tabelas.REP_MODELOS = [
    { ID: 'mA', REPRESENTADA_ID: 'repA', CODIGO: 'AC21', NOME: 'AUTOCLAVE ALFA 21', TIPO_EQUIPAMENTO: 'Autoclave', GARANTIA_MESES: 12, ATIVO: 'SIM' },
    { ID: 'mB', REPRESENTADA_ID: 'repB', CODIGO: 'LV10', NOME: 'LAVADORA BETA 10', TIPO_EQUIPAMENTO: 'Lavadora ultrassônica', GARANTIA_MESES: 24, ATIVO: 'SIM' }
  ];
  const us = [
    { ID: 'ra_adm', USUARIO: 'ana.alfa', NOME: 'ANA ALFA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'ana@alfa.exemplo.test', REPRESENTADA_ID: 'repA', REPRESENTACAO_PAPEL: 'ADMIN' },
    { ID: 'rb_at', USUARIO: 'beto.beta', NOME: 'BETO BETA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'beto@beta.exemplo.test', REPRESENTADA_ID: 'repB', REPRESENTACAO_PAPEL: 'ATENDENTE' },
    { ID: 'rb_le', USUARIO: 'lia.beta', NOME: 'LIA BETA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'lia@beta.exemplo.test', REPRESENTADA_ID: 'repB', REPRESENTACAO_PAPEL: 'LEITURA' }
  ];
  us.forEach((u) => { a.tabelas.CAD_USUARIOS.push(u); a.sessoes['s_' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: 'REPRESENTADA', representadaId: u.REPRESENTADA_ID }; });
  // celular para o WhatsApp (só dados fictícios)
  const cel = { u_tec2: '62999990021', u_gt: '62999990022', u_dir: '62999990023' };
  a.tabelas.CAD_USUARIOS.forEach((u) => { if (cel[u.ID]) u.CELULAR = cel[u.ID]; });
  a.rep = (sid, acao, d) => a.ctx.Representacao_api(sid, acao, d || {});
  a.aprovar = () => { a.ctx.SGO_waModeloSituacao_ = (n) => (n === 'sgo_gestao_acao' ? 'APPROVED' : ''); };
  a.responsaveis = (ids) => {
    const regras = JSON.parse(JSON.stringify(a.ctx.AST_REGRAS_PADRAO)); regras.representacao = { responsaveis: ids };
    a.tabelas.ATEC_CONFIG = [{ ID: 'cfg1', CHAVE: 'REGRAS', VERSAO: 2, VALOR_JSON: JSON.stringify(regras), ATUALIZADO_EM: '2026-10-19T09:00:00' }];
    a.ctx.Ast_regrasInvalidar_();
  };
  a.mudarHora = (iso) => { a.mudar(iso); a.aprovar(); };
  a.aprovar();
  return a;
}
const CLIENTE_B = { RAZAO_SOCIAL: 'HOSPITAL BETA TESTE LTDA', CNPJ: CNPJ_B, CEP: '74000-000', LOGRADOURO: 'Rua Beta', NUMERO: '10', BAIRRO: 'Centro', CIDADE: 'Goiânia', UF: 'GO',
  CONTATO: 'Carla Contato Teste', EMAIL: 'carla@hospbeta.exemplo.test', TELEFONE: '(62) 99999-0000', CIENTE: true };
const RELATO = { setor: 'CME', contatoNome: 'Carla Contato Teste', contatoTelefone: '62999990000', contatoEmail: 'carla@hospbeta.exemplo.test', sintoma: 'A lavadora não aquece a água e para no meio do ciclo com alarme sonoro.',
  inicio: 'ontem à tarde', codigoErro: 'E07', parada: 'PARCIAL', risco: 'Sem lavagem do instrumental', tentado: 'Religamos o equipamento', enquadramento: 'GARANTIA' };
function clienteB(a) { return ok(a.rep('s_beto.beta', 'cadastrarCliente', { dados: CLIENTE_B })).cliente; }
function equipB(a, cli, codigo, serie, extra) {
  return a.rep('s_beto.beta', 'cadastrarEquipamento', Object.assign({ clienteId: cli.id, unidadeId: cli.unidades[0].id, modeloCodigo: codigo, serie, dataInstalacao: '2026-03-10', ciente: true, fotoEtiqueta: foto('etq.jpg') }, extra || {}));
}
function pedidoB(a, cli, eq, extra) {
  return ok(a.rep('s_beto.beta', 'abrir', Object.assign({ clienteId: cli.id, unidadeId: cli.unidades[0].id, equipamentoId: eq.id, fotos: [foto()], fotosEtiqueta: [foto('etq2.jpg')] }, RELATO, extra || {}))).solicitacao;
}
const NOVO_MODELO = { codigo: 'bm 500', nome: 'AUTOCLAVE BETA 500', tipo: 'Autoclave', familia: 'Linha hospitalar', garantiaMeses: '12', padraoSerie: 'BM[0-9]{4}' };

// ============================================================ 1. MODELOS PELA REPRESENTADA
test('modelos: a representada cadastra o modelo que falta, ele já serve para o equipamento e o histórico guarda o lado e o nome', () => {
  const a = amb();
  const cli = clienteB(a);
  // antes: o modelo não existe e o equipamento não é cadastrado (a trava diz onde cadastrar)
  const r0 = equipB(a, cli, 'BM500', 'BM1234');
  assert.equal(r0.ok, false); assert.match(r0.message, /Cadastrar modelo novo/);
  const ini = ok(a.rep('s_beto.beta', 'inicio'));
  assert.equal(ini.podeCadastrarModelo, true);
  const r = ok(a.rep('s_beto.beta', 'salvarModelo', NOVO_MODELO));
  assert.equal(r.modelo.codigo, 'BM500', 'código sem espaço e em maiúsculas');
  assert.ok(r.modelos.some((m) => m.codigo === 'BM500'), 'devolve a lista de escolha já com o modelo novo');
  assert.match(r.modelo.criadoPor, /BETO BETA TESTE \(REPRESENTADA BETA TESTE\)/);
  assert.equal(r.modelo.criadoLado, 'REPRESENTADA');
  const eq = ok(equipB(a, cli, 'BM500', 'BM1234')).equipamento;
  assert.equal(eq.modeloCodigo, 'BM500');
  assert.equal(equipB(a, cli, 'BM500', 'XX99').ok, false, 'o padrão da série cadastrado pela representada vale');
  const h = a.tabelas.REP_MODELOS_HIST.filter((x) => x.CODIGO === 'BM500');
  assert.equal(h.length, 1); assert.equal(h[0].ACAO, 'CRIAR'); assert.equal(h[0].LADO, 'REPRESENTADA'); assert.equal(h[0].POR_ID, 'rb_at');
  // a Metrolabs vê "cadastrado por Fulano (Empresa)"
  const interno = ok(a.rep('s_gil', 'modelos', { representadaId: 'repB' })).modelos.find((m) => m.codigo === 'BM500');
  assert.equal(interno.criadoPor, 'BETO BETA TESTE (REPRESENTADA BETA TESTE)');
  assert.equal(interno.usos, 1);
  assert.ok(a.tabelas.REP_ACESSOS.some((x) => x.ACAO === 'MODELO_CADASTRO' && x.REPRESENTADA_ID === 'repB'));
});

test('modelos: só o papel que abre pedido cadastra; a leitura vê o catálogo com o motivo; campos conferidos no servidor', () => {
  const a = amb();
  const r = a.rep('s_lia.beta', 'salvarModelo', NOVO_MODELO);
  assert.equal(r.ok, false); assert.equal(r.codigo, 'PAPEL'); assert.match(r.message, /papel \(Leitura\)/);
  const cat = ok(a.rep('s_lia.beta', 'catalogo'));
  assert.equal(cat.podeEditar, false); assert.match(cat.message, /não cadastra modelos/);
  assert.equal(a.rep('s_lia.beta', 'excluirModelo', { id: 'mB' }).codigo, 'PAPEL');
  const ruim = a.rep('s_beto.beta', 'salvarModelo', { codigo: 'X', nome: '', tipo: 'A', garantiaMeses: '1,5', padraoSerie: '([' });
  assert.equal(ruim.ok, false);
  assert.deepEqual(JSON.parse(JSON.stringify(ruim.faltam.map((f) => f.campo).sort())), ['codigo', 'garantiaMeses', 'nome', 'padraoSerie', 'tipo']);
  assert.match(ruim.message, /Nada foi gravado/);
  assert.equal(a.tabelas.REP_MODELOS.length, 2);
});

test('modelos: código único por representada (ativo ou inativo); a outra representada pode usar o mesmo código', () => {
  const a = amb();
  const dup = a.rep('s_beto.beta', 'salvarModelo', { codigo: 'lv10', nome: 'OUTRA', tipo: 'Lavadora', garantiaMeses: 6 });
  assert.equal(dup.ok, false); assert.equal(dup.codigo, 'DUPLICADO'); assert.match(dup.message, /LAVADORA BETA 10/);
  ok(a.rep('s_beto.beta', 'excluirModelo', { id: 'mB' })); // sem uso: sai do catálogo
  ok(a.rep('s_beto.beta', 'salvarModelo', { codigo: 'LV10', nome: 'LAVADORA BETA 10 NOVA', tipo: 'Lavadora', garantiaMeses: 6 }));
  // inativo também bloqueia o código, com a orientação de reativar
  const cli = clienteB(a);
  const novo = a.tabelas.REP_MODELOS.find((m) => m.CODIGO === 'LV10' && m.REPRESENTADA_ID === 'repB');
  ok(equipB(a, cli, 'LV10', 'SERIE-LV-1'));
  ok(a.rep('s_beto.beta', 'excluirModelo', { id: novo.ID })); // com uso: inativa
  const dup2 = a.rep('s_beto.beta', 'salvarModelo', { codigo: 'LV10', nome: 'DE NOVO', tipo: 'Lavadora', garantiaMeses: 6 });
  assert.equal(dup2.codigo, 'DUPLICADO'); assert.match(dup2.message, /inativo\)\. Reative/);
  // a representada A usa o mesmo código sem conflito
  ok(a.rep('s_ana.alfa', 'salvarModelo', { codigo: 'LV10', nome: 'LAVADORA ALFA', tipo: 'Lavadora', garantiaMeses: 12 }));
});

test('modelos: excluir sem uso tira do catálogo; com uso vira INATIVO (some da escolha, mantém histórico e garantia) e pode ser reativado', () => {
  const a = amb();
  const cli = clienteB(a);
  const sem = ok(a.rep('s_beto.beta', 'salvarModelo', NOVO_MODELO)).modelo;
  const ex = ok(a.rep('s_beto.beta', 'excluirModelo', { id: sem.id }));
  assert.equal(ex.excluido, true); assert.match(ex.message, /nenhum equipamento usava/);
  assert.equal(a.tabelas.REP_MODELOS.some((m) => m.ID === sem.id), false);
  assert.ok(a.tabelas.REP_MODELOS_HIST.some((h) => h.MODELO_ID === sem.id && h.ACAO === 'EXCLUIR' && /AUTOCLAVE BETA 500/.test(h.ANTES_JSON)), 'a exclusão fica no histórico');
  // com uso
  const eq = ok(equipB(a, cli, 'LV10', 'SERIE-LV-2')).equipamento;
  const garantiaAntes = a.tabelas.CAD_EQUIPAMENTOS.find((e) => e.ID === eq.id).GARANTIA_ATE;
  const inat = ok(a.rep('s_beto.beta', 'excluirModelo', { id: 'mB' }));
  assert.equal(inat.inativado, true); assert.match(inat.message, /INATIVO/); assert.match(inat.message, /1 equipamento já usa/);
  assert.equal(a.tabelas.REP_MODELOS.find((m) => m.ID === 'mB').ATIVO, 'NAO');
  assert.equal(ok(a.rep('s_beto.beta', 'inicio')).modelos.some((m) => m.codigo === 'LV10'), false, 'some da lista de escolha');
  const cat = ok(a.rep('s_beto.beta', 'catalogo')).modelos.find((m) => m.codigo === 'LV10');
  assert.equal(cat.ativo, false); assert.equal(cat.usos, 1); assert.equal(cat.historico[0].acao, 'INATIVAR');
  assert.equal(a.tabelas.CAD_EQUIPAMENTOS.find((e) => e.ID === eq.id).GARANTIA_ATE, garantiaAntes, 'o equipamento mantém a garantia');
  assert.equal(equipB(a, cli, 'LV10', 'SERIE-LV-3').ok, false, 'modelo inativo não é escolhido');
  ok(a.rep('s_beto.beta', 'reativarModelo', { id: 'mB' }));
  assert.equal(ok(a.rep('s_beto.beta', 'inicio')).modelos.some((m) => m.codigo === 'LV10'), true);
  assert.equal(a.tabelas.REP_MODELOS_HIST.filter((h) => h.MODELO_ID === 'mB').map((h) => h.ACAO).join(','), 'INATIVAR,REATIVAR');
});

test('modelos: mudar a garantia vale para os equipamentos novos; os já cadastrados mantêm a garantia gravada; o código usado não muda', () => {
  const a = amb();
  const cli = clienteB(a);
  const e1 = ok(equipB(a, cli, 'LV10', 'SERIE-G-1', { dataInstalacao: '2026-03-10' })).equipamento;
  assert.equal(a.tabelas.CAD_EQUIPAMENTOS.find((e) => e.ID === e1.id).GARANTIA_ATE, '2028-03-10'); // 24 meses
  const alt = ok(a.rep('s_beto.beta', 'salvarModelo', { id: 'mB', codigo: 'LV10', nome: 'LAVADORA BETA 10', tipo: 'Lavadora ultrassônica', garantiaMeses: 6 }));
  assert.match(alt.message, /equipamentos cadastrados daqui em diante/); assert.match(alt.message, /1 equipamento com a garantia de antes/);
  assert.equal(a.tabelas.CAD_EQUIPAMENTOS.find((e) => e.ID === e1.id).GARANTIA_ATE, '2028-03-10', 'nada é recalculado');
  assert.equal(ok(a.rep('s_beto.beta', 'equipamentos')).equipamentos.find((e) => e.id === e1.id).garantia.ate, '2028-03-10', 'a leitura usa o que está no equipamento');
  const e2 = ok(equipB(a, cli, 'LV10', 'SERIE-G-2', { dataInstalacao: '2026-03-10' })).equipamento;
  assert.equal(a.tabelas.CAD_EQUIPAMENTOS.find((e) => e.ID === e2.id).GARANTIA_ATE, '2026-09-10'); // 6 meses
  const h = ok(a.rep('s_beto.beta', 'catalogo')).modelos.find((m) => m.codigo === 'LV10').historico[0];
  assert.equal(h.acao, 'ALTERAR'); assert.deepEqual(JSON.parse(JSON.stringify(h.mudancas)), [{ campo: 'Garantia (meses)', de: '24 meses', para: '6 meses' }]);
  const cod = a.rep('s_beto.beta', 'salvarModelo', { id: 'mB', codigo: 'LV11', nome: 'LAVADORA BETA 10', tipo: 'Lavadora ultrassônica', garantiaMeses: 6 });
  assert.equal(cod.codigo, 'CODIGO_EM_USO'); assert.match(cod.message, /2 equipamentos/);
  const igual = ok(a.rep('s_beto.beta', 'salvarModelo', { id: 'mB', codigo: 'LV10', nome: 'LAVADORA BETA 10', tipo: 'Lavadora ultrassônica', garantiaMeses: 6 }));
  assert.match(igual.message, /Nada mudou/);
});

test('modelos: a Metrolabs altera pelo lado interno só com motivo; a representada vê quem alterou (Metrolabs) e o motivo', () => {
  const a = amb();
  const sem = a.rep('s_gil', 'salvarModelo', { representadaId: 'repB', codigo: 'LV10', nome: 'LAVADORA BETA 10', tipo: 'Lavadora ultrassônica', garantiaMeses: 18 });
  assert.equal(sem.ok, false); assert.ok(sem.faltam.some((f) => f.campo === 'motivo'));
  const r = ok(a.rep('s_gil', 'salvarModelo', { representadaId: 'repB', codigo: 'LV10', nome: 'LAVADORA BETA 10', tipo: 'Lavadora ultrassônica', garantiaMeses: 18, motivo: 'Garantia corrigida pelo contrato de 2026' }));
  assert.match(r.message, /histórico do modelo/);
  const h = ok(a.rep('s_beto.beta', 'catalogo')).modelos.find((m) => m.codigo === 'LV10').historico[0];
  assert.equal(h.lado, 'METROLABS'); assert.equal(h.por, 'GIL GESTOR TECNICO TESTE (Metrolabs)'); assert.equal(h.motivo, 'Garantia corrigida pelo contrato de 2026');
  // modelo novo pelo lado interno continua sem motivo
  ok(a.rep('s_gil', 'salvarModelo', { representadaId: 'repB', codigo: 'NV1', nome: 'NOVO INTERNO', tipo: 'Autoclave', garantiaMeses: 12 }));
  assert.equal(a.rep('s_tiago', 'salvarModelo', { representadaId: 'repB', codigo: 'NV2', nome: 'X', tipo: 'Autoclave', garantiaMeses: 12 }).codigo, 'PERFIL');
});

test('isolamento: a representada A não vê nem mexe nos modelos da B por nenhuma ação de modelo', () => {
  const a = amb();
  ok(a.rep('s_beto.beta', 'salvarModelo', Object.assign({}, NOVO_MODELO, { nome: 'MODELO SIGILOSO DA BETA' })));
  const idB = a.tabelas.REP_MODELOS.find((m) => m.NOME === 'MODELO SIGILOSO DA BETA').ID;
  const antes = JSON.stringify(a.tabelas.REP_MODELOS.filter((m) => m.REPRESENTADA_ID === 'repB'));
  const txtCat = JSON.stringify(ok(a.rep('s_ana.alfa', 'catalogo')));
  assert.ok(!/SIGILOSO|LAVADORA BETA|LV10/.test(txtCat), txtCat.slice(0, 200));
  assert.ok(!/SIGILOSO|LAVADORA BETA/.test(JSON.stringify(ok(a.rep('s_ana.alfa', 'inicio')))));
  for (const [acao, d] of [['salvarModelo', { id: idB, codigo: 'BM500', nome: 'TOMADO PELA ALFA', tipo: 'Autoclave', garantiaMeses: 1 }], ['salvarModelo', { id: 'mB', codigo: 'LV10', nome: 'X', tipo: 'Lavadora', garantiaMeses: 1 }],
    ['excluirModelo', { id: idB }], ['excluirModelo', { id: 'mB' }], ['reativarModelo', { id: 'mB' }]]) {
    const r = a.rep('s_ana.alfa', acao, d);
    assert.equal(r.ok, false, acao); assert.equal(r.codigo, 'NAO_ENCONTRADO', acao + ': ' + r.message);
    assert.ok(!/SIGILOSO|LAVADORA BETA/.test(JSON.stringify(r)));
  }
  assert.equal(JSON.stringify(a.tabelas.REP_MODELOS.filter((m) => m.REPRESENTADA_ID === 'repB')), antes, 'nada da B mudou');
  // o equipamento da A não aceita modelo da B
  const cliA = ok(a.rep('s_ana.alfa', 'buscarCliente', { documento: '11222333000181' })).cliente;
  const r = a.rep('s_ana.alfa', 'cadastrarEquipamento', { clienteId: cliA.id, unidadeId: cliA.unidades[0].id, modeloCodigo: 'LV10', serie: 'SERIE-A-X', ciente: true, fotoEtiqueta: foto() });
  assert.equal(r.ok, false); assert.ok(r.faltam.some((f) => f.campo === 'modeloCodigo'));
});

// ============================================================ 2. AVISO NA TELA
test('aviso na tela: gestão, triagem e responsável recebem; quem não trata a fila não; dispensado não volta para a mesma pessoa', () => {
  const a = amb();
  a.responsaveis(['u_tec2']);
  const cli = clienteB(a), eq = ok(equipB(a, cli, 'LV10', 'SERIE-P-1')).equipamento;
  assert.equal(ok(a.rep('s_gil', 'alertasPedidos')).itens.length, 0);
  const sol = pedidoB(a, cli, eq);
  const g = ok(a.rep('s_gil', 'alertasPedidos'));
  assert.equal(g.ligado, true); assert.equal(g.intervaloSeg, 45);
  assert.equal(g.itens.length, 1);
  const x = g.itens[0];
  assert.equal(x.numero, sol.numero); assert.equal(x.marco, 'NOVO'); assert.equal(x.representada, 'REPRESENTADA BETA TESTE');
  assert.match(x.cliente, /HOSPITAL BETA/); assert.match(x.equipamento, /LAVADORA BETA 10/);
  assert.match(x.resta, /^Faltam 4 h úteis para o prazo de aceite \(até 19\/10\/2026 14:00\)$/);
  assert.equal(ok(a.rep('s_tales', 'alertasPedidos')).itens.length, 1, 'responsável pela representação (técnico) também recebe');
  const t = ok(a.rep('s_tiago', 'alertasPedidos'));
  assert.equal(t.ligado, false); assert.match(t.motivo, /Representação > Pedidos/);
  assert.equal(a.rep('s_beto.beta', 'alertasPedidos').ok, false, 'a representada não usa esta ação');
  assert.equal(a.rep('s_tiago', 'dispensarAlertaPedido', { chave: x.chave }).ok, false);
  // dispensar: some só para quem dispensou
  ok(a.rep('s_gil', 'dispensarAlertaPedido', { chave: x.chave }));
  a.mudarHora(SEG('10:01'));
  assert.equal(ok(a.rep('s_gil', 'alertasPedidos')).itens.length, 0);
  assert.equal(ok(a.rep('s_tales', 'alertasPedidos')).itens.length, 1);
  assert.equal(a.rep('s_gil', 'dispensarAlertaPedido', { chave: 'lixo' }).ok, false);
  // 75% do prazo: aviso novo (marco RISCO), mesmo para quem dispensou o de pedido novo
  a.mudarHora(SEG('13:05'));
  const r = ok(a.rep('s_gil', 'alertasPedidos')).itens;
  assert.equal(r.length, 1); assert.equal(r[0].marco, 'RISCO'); assert.match(r[0].titulo, /em risco \(75%\)/); assert.match(r[0].resta, /^Faltam 55 min úteis/);
  ok(a.rep('s_tales', 'dispensarAlertaPedido', { chave: r[0].chave }));
  a.mudarHora(SEG('13:06'));
  assert.equal(ok(a.rep('s_tales', 'alertasPedidos')).itens.length, 0, 'dispensar o de 75% tira também o de pedido novo');
  // aceito: sai para todos
  ok(a.rep('s_gil', 'aceitar', { solicitacaoId: sol.id }));
  assert.equal(ok(a.rep('s_gil', 'alertasPedidos')).itens.length, 0);
});

test('aviso na tela: complemento respondido avisa de novo; recusado e cancelado saem da tela', () => {
  const a = amb();
  const cli = clienteB(a), eq = ok(equipB(a, cli, 'LV10', 'SERIE-P-2')).equipamento;
  const sol = pedidoB(a, cli, eq);
  const x = ok(a.rep('s_gil', 'alertasPedidos')).itens[0];
  ok(a.rep('s_gil', 'dispensarAlertaPedido', { chave: x.chave }));
  ok(a.rep('s_gil', 'complemento', { solicitacaoId: sol.id, pergunta: 'Envie a foto do visor com o código de erro' }));
  assert.equal(ok(a.rep('s_gil', 'alertasPedidos')).itens.length, 0, 'com o complemento pedido, o pedido espera a representada');
  a.mudarHora(SEG('10:30'));
  ok(a.rep('s_beto.beta', 'responderComplemento', { id: sol.id, resposta: 'Foto enviada, o visor mostra E07 piscando' }));
  const y = ok(a.rep('s_gil', 'alertasPedidos')).itens;
  assert.equal(y.length, 1); assert.equal(y[0].marco, 'RESPOSTA'); assert.match(y[0].titulo, /Complemento respondido/);
  ok(a.rep('s_gil', 'recusar', { solicitacaoId: sol.id, motivo: 'Equipamento fora da área de atendimento' }));
  assert.equal(ok(a.rep('s_gil', 'alertasPedidos')).itens.length, 0);
  const sol2 = pedidoB(a, cli, eq);
  assert.equal(ok(a.rep('s_gil', 'alertasPedidos')).itens.length, 1);
  ok(a.rep('s_beto.beta', 'cancelar', { tipo: 'SOLICITACAO', id: sol2.id, motivo: 'O cliente resolveu sozinho' }));
  assert.equal(ok(a.rep('s_gil', 'alertasPedidos')).itens.length, 0);
});

test('aviso na tela (tela): em qualquer tela, a cada 45 s, som pelo WebAudio com o bloqueio do navegador tratado, sem mexer no conteúdo aberto', () => {
  const js = fs.readFileSync(path.join(LEGADO, 'JS_Representacao.html'), 'utf8');
  const core = fs.readFileSync(path.join(LEGADO, 'JS_Core.html'), 'utf8');
  const inicio = fs.readFileSync(path.join(LEGADO, 'JS_Inicio.html'), 'utf8');
  assert.equal((core.match(/RepAlertas_iniciar_\(\)/g) || []).length, 2, 'as duas entradas do login ligam o aviso');
  assert.match(js, /REPAL_INTERVALO_MS = 45000/);
  assert.match(js, /"alertasPedidos"/); assert.match(js, /"dispensarAlertaPedido"/);
  assert.match(js, /window\.AudioContext \|\| window\.webkitAudioContext/);
  assert.match(js, /Clique para ativar o som/);
  assert.match(js, /try \{ return window\.localStorage\.getItem\(REPAL_CHAVE_SOM\)/);
  assert.match(js, /setItem\(REPAL_CHAVE_SOM[^)]*\); \} catch \(e\) \{\}/);
  const bloco = js.slice(js.indexOf('var REPAL ='), js.indexOf('function Representacao_irPara_'));
  assert.ok(!/conteudo|rpCorpo|innerHTML = ""/.test(bloco), 'o aviso não redesenha a tela aberta');
  assert.match(bloco, /document\.visibilityState === "visible"/);
  assert.match(inicio, /case "representacao":[\s\S]{0,200}Representacao_irPara_\(acao\)/);
  assert.match(js, /RP\.abrirPedido/);
});

// ============================================================ 3. AVISO COM CIÊNCIA, WHATSAPP E E-MAIL
const filaG = (a, f) => (a.tabelas.NTF_GESTAO || []).filter((l) => Object.keys(f || {}).every((k) => l[k] === f[k]));
const whatsPara = (a, fone) => a.whats.filter((w) => w.corpo && w.corpo.to === fone);

test('pedido novo: aviso com ciência em Avisos para quem responde pela representação, WhatsApp na hora pelo modelo aprovado e e-mail, sem duplicar', () => {
  const a = amb();
  a.responsaveis(['u_tec2']);
  const cli = clienteB(a), eq = ok(equipB(a, cli, 'LV10', 'SERIE-W-1')).equipamento;
  const sol = pedidoB(a, cli, eq);
  const av = a.tabelas.AVS_AVISOS.filter((x) => x.PUBLICADO_POR_ID === 'REP:' + sol.id + ':NOVO');
  assert.equal(av.length, 1);
  assert.equal(av[0].DESTINATARIOS_IDS, 'u_tec2'); assert.equal(av[0].SITUACAO, 'PUBLICADO'); assert.match(av[0].TITULO, new RegExp(sol.numero));
  assert.equal(a.tabelas.ATEC_SOLICITACOES.find((s) => s.ID === sol.id).AVISO_CIENCIA_ID, av[0].ID);
  // fica em Avisos até a ciência
  assert.equal(ok(a.ctx.Avisos_apiPendentes('s_tales', {})).avisos.length, 1);
  // WhatsApp pela fila dos avisos da gestão, na hora, mesmo sem ser da gestão; e-mail junto
  const l = filaG(a, { USUARIO_ID: 'u_tec2', EVENTO: 'RP01' });
  assert.equal(l.length, 1); assert.equal(l[0].SITUACAO, 'ENVIADO'); assert.equal(l[0].RESOLVE_POR, 'REPSOL:' + sol.id);
  assert.equal(JSON.parse(l[0].TELA_JSON).tipo, 'representacao'); assert.equal(JSON.parse(l[0].TELA_JSON).id, sol.id);
  const w = whatsPara(a, FONE.tales);
  assert.equal(w.length, 1); assert.equal(w[0].corpo.template.name, 'sgo_gestao_acao');
  assert.ok(a.emails.some((m) => m.to === 'tales@exemplo.test' && new RegExp(sol.numero).test(m.subject)));
  assert.ok(a.ctx.AvG_idsGestaoWhatsapp_().includes('u_tec2'), 'o celular do responsável entra na lista da gestão do piloto');
  // sem duplicar: o aviso com ciência é um por pedido e marco
  assert.equal(a.ctx.Rep_avisoCiencia_(a.tabelas.ATEC_SOLICITACOES.find((s) => s.ID === sol.id), 'NOVO', 'x', 'y'), '');
  assert.equal(a.tabelas.AVS_AVISOS.length, 1);
  // ciência: sai dos pendentes
  ok(a.ctx.Avisos_apiCiente('s_tales', { id: av[0].ID }));
  assert.equal(ok(a.ctx.Avisos_apiPendentes('s_tales', {})).avisos.length, 0);
});

test('a 75% do prazo: segundo aviso (Avisos e WhatsApp) uma vez; depois do aceite, nada mais e o aviso sem ciência é arquivado', () => {
  const a = amb();
  a.responsaveis(['u_tec2']);
  const cli = clienteB(a), eq = ok(equipB(a, cli, 'LV10', 'SERIE-W-2')).equipamento;
  const sol = pedidoB(a, cli, eq);
  a.mudarHora(SEG('13:05'));
  assert.equal(a.ctx.Representacao_rotina_(), 1);
  assert.equal(a.ctx.Representacao_rotina_(), 0);
  const risco = a.tabelas.AVS_AVISOS.filter((x) => x.PUBLICADO_POR_ID === 'REP:' + sol.id + ':RISCO');
  assert.equal(risco.length, 1); assert.equal(risco[0].IMPORTANCIA, 'Urgente');
  const l = filaG(a, { USUARIO_ID: 'u_tec2', EVENTO: 'RP07' });
  assert.equal(l.length, 1); assert.equal(l[0].SITUACAO, 'ENVIADO');
  assert.equal(whatsPara(a, FONE.tales).length, 2, 'pedido novo e 75%');
  ok(a.rep('s_gil', 'aceitar', { solicitacaoId: sol.id }));
  assert.ok(a.tabelas.AVS_AVISOS.every((x) => x.SITUACAO === 'ARQUIVADO'), 'pedido aceito: o aviso que ninguém leu não cobra mais');
  assert.match(a.tabelas.AVS_AVISOS[0].ARQUIVADO_POR_NOME, /aceito: chamado/);
  assert.equal(ok(a.ctx.Avisos_apiPendentes('s_tales', {})).avisos.length, 0);
  a.mudarHora(SEG('16:00'));
  a.ctx.Representacao_rotina_();
  a.ctx.SGO_avisosGestaoRodada_(new a.ctx.Date());
  assert.equal(whatsPara(a, FONE.tales).length, 2, 'nada depois do aceite');
});

test('fora do expediente: o WhatsApp espera a abertura do próximo dia útil (também para a Diretoria); tratado antes, não sai', () => {
  const a = amb({ agora: Date.parse('2026-10-19T19:00:00-03:00') });
  a.responsaveis(['u_tec2', 'u_dir']);
  const cli = clienteB(a), eq = ok(equipB(a, cli, 'LV10', 'SERIE-W-3')).equipamento;
  const sol = pedidoB(a, cli, eq);
  const lt = filaG(a, { USUARIO_ID: 'u_tec2' }), ld = filaG(a, { USUARIO_ID: 'u_dir' });
  assert.equal(lt.length, 1); assert.equal(ld.length, 1);
  assert.equal(lt[0].LIBERAR_EM, '2026-10-20T08:00:00'); assert.equal(ld[0].LIBERAR_EM, '2026-10-20T08:00:00', 'a Diretoria também só no expediente');
  assert.equal(a.whats.length, 0);
  assert.equal(a.tabelas.AVS_AVISOS.length, 1, 'o aviso com ciência fica em Avisos na hora');
  // outro pedido à noite, aceito antes do expediente: o WhatsApp dele não sai
  const sol2 = pedidoB(a, cli, eq);
  a.mudarHora('2026-10-20T07:30:00-03:00');
  ok(a.rep('s_gil', 'aceitar', { solicitacaoId: sol2.id }));
  a.mudarHora('2026-10-20T08:00:00-03:00');
  a.ctx.SGO_avisosGestaoRodada_(new a.ctx.Date());
  assert.equal(whatsPara(a, FONE.tales).length, 1, 'só o pedido que continua na fila');
  assert.equal(whatsPara(a, FONE.dora).length, 1);
  const resolvidas = (a.tabelas.NTF_GESTAO || []).filter((l) => l.RESOLVE_POR === 'REPSOL:' + sol2.id);
  assert.equal(resolvidas.length, 2); assert.ok(resolvidas.every((l) => l.SITUACAO === 'RESOLVIDO' && /aceito/.test(l.RESOLUCAO)));
  assert.ok((a.tabelas.NTF_GESTAO || []).some((l) => l.RESOLVE_POR === 'REPSOL:' + sol.id && l.SITUACAO === 'ENVIADO'));
});

test('teto diário: passou do limite, o WhatsApp do pedido não sai (fica o motivo) e o e-mail e o sistema continuam', () => {
  const a = amb();
  a.responsaveis(['u_tec2']);
  a.ctx.AVG_REP_TETO_DIA = 1;
  const cli = clienteB(a), eq = ok(equipB(a, cli, 'LV10', 'SERIE-W-4')).equipamento;
  pedidoB(a, cli, eq);
  a.mudarHora(SEG('10:05'));
  const sol2 = pedidoB(a, cli, eq);
  assert.equal(whatsPara(a, FONE.tales).length, 1);
  const l = filaG(a, { USUARIO_ID: 'u_tec2', REF_ID: sol2.id })[0];
  assert.equal(l.WA_SITUACAO, 'TETO'); assert.match(l.WA_MOTIVO, /limite de 1 por dia/); assert.equal(l.EMAIL_SITUACAO, 'ENVIADO');
  assert.equal(a.tabelas.AVS_AVISOS.length, 2);
  // no dia seguinte volta a sair
  a.mudarHora('2026-10-20T10:00:00-03:00');
  pedidoB(a, cli, eq);
  assert.equal(whatsPara(a, FONE.tales).length, 2);
});

test('linha do pedido que ficou na fila (envio na hora não saiu) não sai à noite nem para a Diretoria; sai na abertura do expediente', () => {
  const a = amb({ agora: Date.parse('2026-10-19T22:00:00-03:00') });
  a.ctx.AvG_garantirAba_();
  a.tabelas.NTF_GESTAO.push({ ID: 'lg1', AVISO_ID: 'AGteste01', CHAVE: 'RP01|solx|T1|u_dir', USUARIO_ID: 'u_dir', USUARIO_NOME: 'DORA DIRETORA TESTE', DIRETORIA: 'SIM', EVENTO: 'RP01', TIPO: 'PENDENCIA',
    MODULO: 'representacao', TITULO: 'Pedido da REPRESENTADA BETA TESTE: SOL-X', TEXTO: 'teste', LINHA: 'Representação: Pedido SOL-X', TELA_JSON: '{"tipo":"representacao","id":"solx"}', REF_ID: 'solx',
    RESOLVE_POR: '', QUANDO: '2026-10-19T17:10:00', LIBERAR_EM: '2026-10-19T17:10:00', SITUACAO: 'NA_FILA', TENTATIVAS: 0 });
  a.ctx.SGO_avisosGestaoRodada_(new a.ctx.Date());
  assert.equal(whatsPara(a, FONE.dora).length, 0, 'nada à noite');
  assert.equal(a.tabelas.NTF_GESTAO.find((l) => l.ID === 'lg1').SITUACAO, 'NA_FILA');
  a.mudarHora('2026-10-20T08:00:00-03:00');
  a.ctx.SGO_avisosGestaoRodada_(new a.ctx.Date());
  assert.equal(whatsPara(a, FONE.dora).length, 1);
  assert.equal(a.tabelas.NTF_GESTAO.find((l) => l.ID === 'lg1').SITUACAO, 'ENVIADO');
});

// ============================================================ REVISÃO (03/11/2026)
test('revisão: o código único é conferido e gravado dentro da trava; o "Excluiu" só entra no histórico depois de sair da tabela', () => {
  const a = amb();
  a.trava.presa = true; // outra gravação em andamento: sem a trava, o cadastro passaria por cima
  const r = a.rep('s_beto.beta', 'salvarModelo', NOVO_MODELO);
  const x = a.rep('s_beto.beta', 'excluirModelo', { id: 'mB' });
  a.trava.presa = false;
  assert.equal(r.ok, false); assert.equal(x.ok, false);
  assert.ok(a.trava.aninhamentos >= 2, 'cadastro e exclusão pedem a trava');
  assert.equal(a.tabelas.REP_MODELOS.length, 2);
  // a remoção falhou: nada no histórico e o modelo continua
  const remover = a.ctx.SGO_DATA.remove;
  a.ctx.SGO_DATA.remove = () => false;
  const f = a.rep('s_beto.beta', 'excluirModelo', { id: 'mB' });
  a.ctx.SGO_DATA.remove = remover;
  assert.equal(f.ok, false); assert.match(f.message, /Nada mudou no catálogo/);
  assert.equal((a.tabelas.REP_MODELOS_HIST || []).filter((h) => h.ACAO === 'EXCLUIR').length, 0);
  assert.ok(a.tabelas.REP_MODELOS.some((m) => m.ID === 'mB'));
  // excluído de verdade: aparece em "Excluídos do catálogo" dos dois lados, só para a própria representada
  ok(a.rep('s_beto.beta', 'excluirModelo', { id: 'mB' }));
  const cat = ok(a.rep('s_beto.beta', 'catalogo'));
  assert.equal(cat.excluidos.length, 1); assert.equal(cat.excluidos[0].codigo, 'LV10'); assert.match(cat.excluidos[0].por, /BETO BETA TESTE/);
  assert.equal(cat.excluidos[0].historico[0].acao, 'EXCLUIR');
  assert.equal(ok(a.rep('s_gil', 'modelos', { representadaId: 'repB' })).excluidos.length, 1);
  assert.equal(ok(a.rep('s_ana.alfa', 'catalogo')).excluidos.length, 0);
});

test('revisão: o envio dos avisos não limpa a memória da Assistência', () => {
  const a = amb();
  a.responsaveis(['u_tec2']);
  let n = 0; const orig = a.ctx.Ast_memoLimpar_;
  a.ctx.Ast_memoLimpar_ = function () { n++; return orig.apply(this, arguments); };
  assert.equal(JSON.stringify(a.ctx.Rep_responsaveisWhatsapp_()), '["u_tec2"]');
  a.ctx.Ast_memoLimpar_ = orig;
  assert.equal(n, 0);
});

test('revisão (tela): o aviso recua e volta sozinho (nunca para de vez) e tem caixa própria, separada da do Auvo, com limite no celular', () => {
  const js = fs.readFileSync(path.join(LEGADO, 'JS_Representacao.html'), 'utf8');
  const bloco = js.slice(js.indexOf('var REPAL ='), js.indexOf('function Representacao_irPara_'));
  assert.match(bloco, /REPAL_RECUO_MS = \[120000, 300000\]/); assert.match(bloco, /REPAL_SEM_ACESSO_MS = 300000/);
  const verificar = bloco.slice(bloco.indexOf('function RepAl_verificar_'), bloco.indexOf('function RepAl_celular_'));
  assert.ok(!/RepAlertas_parar_/.test(verificar), 'falha e "ligado: false" não param o aviso');
  assert.match(verificar, /r\.ligado === false\) \{[^}]*RepAl_agendar_\(REPAL_SEM_ACESSO_MS\)/);
  assert.match(bloco, /addEventListener\("visibilitychange", voltou\)/); assert.match(bloco, /addEventListener\("focus", voltou\)/);
  const caixa = bloco.slice(bloco.indexOf('function RepAl_caixa_'), bloco.indexOf('function RepAl_limitar_'));
  assert.ok(!/auvo-toast-container|auvoToastContainer/.test(caixa), 'não usa a caixa do Auvo');
  assert.match(caixa, /top:72px;right:16px/); assert.match(caixa, /width:min\(360px, calc\(100vw - 32px\)\)/); assert.match(caixa, /max-height:[^;]+;overflow-y:auto/);
  assert.match(bloco, /RepAl_celular_\(\) && !REPAL\.aberto \? 2/); assert.match(bloco, /"mais " \+ escondidos/);
  assert.match(js, /Excluídos do catálogo/);
});

test('03/11/2026: botão "mais N / recolher os avisos" só aparece no celular com mais de 2 avisos (a classe do botão passava por cima do hidden)', () => {
  const fs = require('node:fs'), path = require('node:path');
  const t = fs.readFileSync(path.join(__dirname, '..', 'apps-script-imports', 'portal_sgo_versao_cnpj_db', 'JS_Representacao.html'), 'utf8');
  assert.ok(/mais\.style\.display = "none"/.test(t), 'nasce escondido pelo estilo, não só pelo hidden');
  assert.ok(/mais\.style\.display = mostrar \? "" : "none"/.test(t), 'mostrado ou escondido pelo estilo a cada conferência');
});
