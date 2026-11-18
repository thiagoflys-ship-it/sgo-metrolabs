// Pacote 2 de 18/11/2026, item 7 (Matheus, 17/11/2026 23:40): contato duplicado do cliente. (a) O cadastro recusa o contato novo com o
// mesmo nome (sem acento, maiúsculas e espaços), e-mail ou celular de outro contato ativo do MESMO cliente e oferece usar o existente
// (completa só os campos em branco); (b) "Unificar contatos duplicados" (gestão comercial): grupos, prévia, principal escolhido, merge
// (nada preenchido é apagado), referências repassadas (propostas, oportunidades, contatos registrados), histórico com motivo; nada é
// unificado sozinho. Código real (legado) num contexto isolado; só dados simulados.
// Uso: DEST=<legado> node --require <fontes.cjs> tests/pedidos-20261118-p2-contatos.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente } = require('./_comercial_ambiente.cjs');

const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const falha = (r, re) => { assert.equal(r.ok, false, 'devia falhar'); if (re) assert.match(r.message, re); return r; };
const ct = (id, cli, nome, extra) => Object.assign({ ID: id, CLIENTE_ID: cli, UNIDADE_ID: '', NOME: nome, CARGO: '', PAPEL: '', EMAIL: '', CELULAR: '', TELEFONE: '', PRINCIPAL: '', ORIGEM: 'MANUAL', OBS: '', STATUS: 'ATIVO', CRIADO_EM: '2026-10-01T10:00' }, extra || {});

/** Os casos que a leitura da produção mostrou (18/11/2026): migração do cliente e da unidade, nome digitado com erro, apelido. */
function base() {
  return ambiente({ tabelas: {
    CAD_CONTATOS: [
      ct('k1', 'c1', 'DOUGLAS TAVARES', { EMAIL: 'douglas@alfa.exemplo.test', CELULAR: '21981150000', ORIGEM: 'MIGRADO_CLIENTE', PRINCIPAL: 'SIM' }),
      ct('k2', 'c1', 'Douglas Tavares', { CELULAR: '21981150000', CARGO: 'Engenheiro clínico', ORIGEM: 'MIGRADO_UNIDADE', UNIDADE_ID: 'un1' }),
      ct('k3', 'c1', 'Dôuglas  Távares', { EMAIL: 'douglas.t@alfa.exemplo.test', CELULAR: '11953010000' }),
      ct('k4', 'c1', 'HERNRIQUE SANTOS', { CELULAR: '21967790000' }),
      ct('k5', 'c1', 'HENRIQUE SANTOS', { CELULAR: '21967790000', EMAIL: 'henrique@alfa.exemplo.test' }),
      ct('k6', 'c1', 'Contato do cadastro do cliente', { TELEFONE: '6233330000', ORIGEM: 'MIGRADO_CLIENTE' }),
      ct('k7', 'c1', 'Responsável da unidade', { TELEFONE: '6233330000', ORIGEM: 'MIGRADO_UNIDADE' }),
      ct('k8', 'c2', 'Douglas Tavares', { EMAIL: 'douglas@beta.exemplo.test' }),
      ct('k9', 'c1', 'Carla Compras Teste', { EMAIL: 'compras@alfa.exemplo.test', STATUS: 'INATIVO' })
    ],
    COM_OPORTUNIDADES: [{ ID: 'o1', CODIGO: 'OPO-2026-0001', CLIENTE_ID: 'c1', CONTATO_ID: 'k2', CONTATO_NOME: 'Douglas Tavares', SITUACAO: 'ABERTA', RESPONSAVEL_ID: 'u_ven' }],
    COM_PROPOSTAS: [{ ID: 'p1', NUMERO: 'PROP-2026-0001', REVISAO: 0, CLIENTE_ID: 'c1', CONTATO_ID: 'k3', CONTATO_NOME: 'Dôuglas Távares', SITUACAO: 'ENVIADA', RESPONSAVEL_ID: 'u_ven', ITENS_JSON: '[]' },
      { ID: 'p2', NUMERO: 'PROP-2026-0002', REVISAO: 0, CLIENTE_ID: 'c1', CONTATO_ID: 'k2', CONTATO_NOME: 'Douglas Tavares', SITUACAO: 'RASCUNHO', RESPONSAVEL_ID: 'u_ven', ITENS_JSON: '[]' }],
    COM_CONTATOS_REGISTRO: [{ ID: 'r1', OPORTUNIDADE_ID: 'o1', CLIENTE_ID: 'c1', TIPO: 'LIGACAO', CONTATO_ID: 'k3', CONTATO_NOME: 'Dôuglas Távares', DATA: '2026-10-10T10:00' }]
  } });
}

test('cadastro: contato novo com o mesmo nome (acento, maiúsculas, espaços), e-mail ou celular é recusado com o existente; outro cliente não conta', () => {
  const a = base();
  const r = falha(a.api('s_vera', 'salvarContato', { clienteId: 'c1', nome: '  henrique   santos ', email: 'novo@alfa.exemplo.test' }), /já tem o contato HENRIQUE SANTOS/);
  assert.match(r.message, /o mesmo nome/); assert.match(r.message, /Por quê:/); assert.match(r.message, /O que fazer:.*Usar o contato existente/); assert.match(r.message, /Nada foi gravado/);
  assert.equal(r.dados.duplicados[0].id, 'k5', 'a recusa leva o existente para a tela');
  falha(a.api('s_vera', 'salvarContato', { clienteId: 'c1', nome: 'Pessoa Nova Teste', email: 'HENRIQUE@alfa.exemplo.test' }), /o mesmo e-mail/);
  falha(a.api('s_vera', 'salvarContato', { clienteId: 'c1', nome: 'Pessoa Nova Teste', celular: '(21) 96779-0000' }), /o mesmo celular/);
  // telefone fixo sozinho (central do hospital) não é repetido; nome genérico da migração também não
  ok(a.api('s_vera', 'salvarContato', { clienteId: 'c1', nome: 'Recepção da CME Teste', telefone: '(62) 3333-0000' }));
  // mesmo nome em outro cliente pode
  ok(a.api('s_vera', 'salvarContato', { clienteId: 'c2', nome: 'Henrique Santos', email: 'henrique@beta.exemplo.test' }));
  // contato inativo não conta
  ok(a.api('s_vera', 'salvarContato', { clienteId: 'c1', nome: 'Carla Compras Teste', email: 'compras@alfa.exemplo.test' }));
  assert.equal(a.tabelas.CAD_CONTATOS.filter((c) => /^HE.*SANTOS$/i.test(c.NOME) && c.CLIENTE_ID === 'c1').length, 2, 'nada foi gravado na recusa');
});

test('"Usar o contato existente": completa só os campos em branco (merge), registra e devolve o existente; edição só recusa a chave nova', () => {
  const a = base();
  const r = ok(a.api('s_vera', 'salvarContato', { clienteId: 'c1', nome: 'Hernrique Santos', cargo: 'Coordenador da CME', email: 'outro@alfa.exemplo.test', celular: '21967790000', usarExistente: true }));
  assert.equal(r.contato.id, 'k4'); assert.equal(r.contato.reaproveitado, true);
  assert.match(r.message, /Usado o contato que já existia/);
  const k4 = a.tabelas.CAD_CONTATOS.find((c) => c.ID === 'k4');
  assert.equal(k4.CARGO, 'Coordenador da CME'); assert.equal(k4.EMAIL, 'outro@alfa.exemplo.test'); assert.equal(k4.CELULAR, '21967790000');
  assert.ok(a.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === 'k4' && /completaram os campos em branco/.test(h.TEXTO)));
  const k5 = a.tabelas.CAD_CONTATOS.find((c) => c.ID === 'k5');
  ok(a.api('s_vera', 'salvarContato', { clienteId: 'c1', nome: 'HENRIQUE SANTOS', email: 'henrique@alfa.exemplo.test', celular: '21967790000', cargo: 'Engenheiro', usarExistente: true }));
  assert.equal(a.tabelas.CAD_CONTATOS.find((c) => c.ID === 'k5').EMAIL, k5.EMAIL, 'campo preenchido nunca é trocado');
  // edição: o contato que já era repetido continua editável; levar o e-mail de outro é recusado
  ok(a.api('s_vera', 'salvarContato', { id: 'k2', clienteId: 'c1', unidadeId: 'un1', nome: 'Douglas Tavares', cargo: 'Engenheiro clínico sênior', celular: '21981150000' }));
  falha(a.api('s_vera', 'salvarContato', { id: 'k2', clienteId: 'c1', nome: 'Douglas Tavares', email: 'henrique@alfa.exemplo.test', celular: '21981150000' }), /o mesmo e-mail/);
});

test('detecção: grupos por cliente (nome, e-mail, celular, transitivo); principal sugerido pelas referências; a vendedora vê, só a gestão unifica', () => {
  const a = base();
  const r = ok(a.api('s_gaspar', 'contatosDuplicados', {}));
  assert.equal(r.total, 2);
  const dg = r.grupos.find((g) => g.contatos.some((c) => c.id === 'k1'));
  assert.deepEqual(dg.contatos.map((c) => c.id).sort(), ['k1', 'k2', 'k3'], 'nome igual sem acento + celular igual');
  assert.deepEqual(dg.motivos.sort(), ['o mesmo celular', 'o mesmo nome']);
  assert.ok(!r.grupos.some((g) => g.contatos.some((c) => c.id === 'k8')), 'outro cliente fora');
  assert.ok(!r.grupos.some((g) => g.contatos.some((c) => c.id === 'k6')), 'nomes genéricos da migração e fixo igual não juntam');
  assert.equal(dg.principalSugeridoId, 'k2', 'mais referências (1 oportunidade e 1 proposta)');
  assert.equal(r.podeUnificar, true);
  const v = ok(a.api('s_vera', 'contatosDuplicados', { clienteId: 'c1' }));
  assert.equal(v.podeUnificar, false);
  falha(a.api('s_vera', 'contatosUnificar', { ids: ['k4', 'k5'], principalId: 'k5', motivo: 'mesma pessoa, nome digitado errado' }), /gestão comercial/);
  falha(a.api('s_tiago', 'contatosDuplicados', {}), /Comercial é da equipe comercial/);
});

test('prévia (nada gravado) e unificação: merge, valores diferentes nas observações, referências repassadas, inativos com JUNTADO_COM_ID, histórico com motivo', () => {
  const a = base();
  const foto = () => JSON.stringify(['CAD_CONTATOS', 'COM_PROPOSTAS', 'COM_OPORTUNIDADES', 'COM_CONTATOS_REGISTRO', 'COM_HISTORICO'].map((t) => a.tabelas[t] || []));
  const antes = foto();
  const pv = ok(a.api('s_gaspar', 'contatosPrevia', { ids: ['k1', 'k2', 'k3'], principalId: 'k2' })).previa;
  assert.equal(foto(), antes, 'a prévia não grava');
  assert.equal(pv.final.email, 'douglas@alfa.exemplo.test', 'e-mail em branco do principal vem do outro');
  assert.equal(pv.final.cargo, 'Engenheiro clínico', 'o do principal fica');
  assert.equal(pv.final.principal, true, 'o principal do cliente passa para o que fica');
  assert.ok(pv.observacoes.some((o) => /douglas\.t@alfa/.test(o)) && pv.observacoes.some((o) => /11953010000/.test(o)), 'o que não cabe vai para as observações');
  assert.deepEqual(pv.mover, { propostas: 1, oportunidades: 0, registros: 1 });
  falha(a.api('s_gaspar', 'contatosUnificar', { ids: ['k1', 'k2', 'k3'], principalId: 'k2', motivo: 'curto' }), /motivo/);
  falha(a.api('s_gaspar', 'contatosUnificar', { ids: ['k2', 'k8'], principalId: 'k2', motivo: 'clientes diferentes não podem' }), /clientes diferentes/);
  falha(a.api('s_gaspar', 'contatosUnificar', { ids: ['k2', 'k4'], principalId: 'k2', motivo: 'não são repetidos entre si' }), /não tem o mesmo nome, e-mail ou celular/);
  falha(a.api('s_gaspar', 'contatosUnificar', { ids: ['k1', 'k2'], principalId: 'k5', motivo: 'principal fora do grupo escolhido' }), /qual contato fica/);
  const u = ok(a.api('s_gaspar', 'contatosUnificar', { ids: ['k1', 'k2', 'k3'], principalId: 'k2', motivo: 'Mesma pessoa: cadastro do cliente, da unidade e do CRM' }));
  assert.match(u.message, /1 propostas, 0 oportunidades, 1 contatos registrados/);
  const C = (id) => a.tabelas.CAD_CONTATOS.find((c) => c.ID === id);
  assert.equal(C('k2').EMAIL, 'douglas@alfa.exemplo.test'); assert.equal(C('k2').CARGO, 'Engenheiro clínico'); assert.equal(C('k2').PRINCIPAL, 'SIM'); assert.equal(C('k2').STATUS, 'ATIVO');
  assert.match(C('k2').OBS, /douglas\.t@alfa\.exemplo\.test/); assert.match(C('k2').OBS, /Motivo: Mesma pessoa/);
  for (const id of ['k1', 'k3']) { assert.equal(C(id).STATUS, 'INATIVO'); assert.equal(C(id).JUNTADO_COM_ID, 'k2'); assert.equal(C(id).PRINCIPAL, ''); assert.equal(C(id).EMAIL !== undefined, true, 'nada é apagado'); }
  assert.equal(a.tabelas.COM_PROPOSTAS.find((p) => p.ID === 'p1').CONTATO_ID, 'k2');
  assert.equal(a.tabelas.COM_CONTATOS_REGISTRO.find((x) => x.ID === 'r1').CONTATO_ID, 'k2');
  assert.equal(a.tabelas.COM_OPORTUNIDADES.find((x) => x.ID === 'o1').CONTATO_ID, 'k2');
  assert.ok(a.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === 'k2' && h.TIPO === 'UNIFICACAO' && /Motivo: Mesma pessoa/.test(h.TEXTO)));
  assert.ok(a.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === 'k1' && h.TIPO === 'UNIFICADO'));
  // depois: o grupo some; o que saiu não pode ser unificado de novo; cadastrar o e-mail do unificado cai no principal
  assert.equal(ok(a.api('s_gaspar', 'contatosDuplicados', {})).total, 1);
  falha(a.api('s_gaspar', 'contatosUnificar', { ids: ['k1', 'k2'], principalId: 'k2', motivo: 'de novo, não deve passar' }), /inativo ou já foi unificado/);
  // o contato que saiu continua identificando o cliente no e-mail integrado (o índice aceita o unificado)
  assert.match(fs.readFileSync(path.join(PASTA, 'SGO_Email.js'), 'utf8'), /JUNTADO_COM_ID\)\) \|\| !valido\(e\)/);
});

test('pedido da vendedora: avisa a gestão comercial (sistema e e-mail); nada é unificado sozinho', () => {
  const a = base();
  const r = ok(a.api('s_vera', 'contatosPedirUnificacao', { ids: ['k4', 'k5'], motivo: 'Mesmo celular; o nome está digitado errado em um.' }));
  assert.match(r.message, /Pedido enviado à gestão comercial/);
  assert.ok(a.tabelas.COM_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_gc' && v.TIPO === 'CONTATO_REPETIDO' && /Unificar contatos duplicados/.test(v.TEXTO)));
  assert.equal(a.tabelas.CAD_CONTATOS.find((c) => c.ID === 'k4').STATUS, 'ATIVO', 'nada é unificado sem a gestão');
});

test('"Preencher agora" com o contato que já existe no cliente usa o existente (não cria repetido)', () => {
  const vm = require('node:vm');
  const a = base();
  a.ctx.SGO_DATA.mesclarCampos_ = (atual, norm, pedido, campos) => { const s = {}; campos.forEach((c) => { s[c] = Object.prototype.hasOwnProperty.call(pedido || {}, c) ? norm[c] : (atual && atual[c] != null ? atual[c] : ''); }); return s; };
  a.ctx.SGO_DATA.validarCadastroUnico_ = () => {};
  a.tabelas.HIST_CADASTROS = [];
  for (const f of ['SGO_Clientes.js', 'SGO_Unidades.js', 'SGO_CadastroQualidade.js', 'SGO_Comercial_Rotas.js', 'SGO_Comercial_DadosEmissao.js']) vm.runInContext(fs.readFileSync(path.join(PASTA, f), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  const { oportunidadeDeTeste } = require('./_comercial_ambiente.cjs');
  const { oportunidade } = oportunidadeDeTeste(a);
  const id = ok(a.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id })).proposta.id;
  Object.assign(a.tabelas.COM_PROPOSTAS.find((p) => p.ID === id), { CONTATO_ID: '', CONTATO_NOME: '' });
  const antes = a.tabelas.CAD_CONTATOS.length;
  ok(a.api('s_vera', 'dadosPreencher', { id, ciente: true, valores: { 'CT.NOME': 'Henrique Santos', 'CT.CARGO': 'Engenheiro clínico', 'CT.EMAIL': 'henrique@alfa.exemplo.test', 'CT.TELEFONE': '21967790000' } }));
  assert.equal(a.tabelas.CAD_CONTATOS.length, antes, 'nenhum contato novo');
  assert.equal(a.tabelas.COM_PROPOSTAS.find((p) => p.ID === id).CONTATO_ID, 'k5');
});
