// Ambiente de teste de Ganhos dos vendedores (12/11/2026): ambiente do Comercial (código real do SGO+, tabelas em memória,
// relógio controlado, IA simulada ou desligada) + caixas de acesso (SGO_Poderes.js) + o módulo novo. Só pessoas e dados fictícios.
// Usado por tests/ganhos-vendedores.test.cjs e tests/ganhos-vendedores-navegador.cjs.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { ambiente: ambienteComercial, em } = require('./_comercial_ambiente.cjs');

const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const QUI_12NOV = em('2026-11-12T10:00:00-03:00');

const USUARIOS = [
  { ID: 'u_dir', USUARIO: 'dora', NOME: 'DORA DIRETORA TESTE', PERFIL: 'DIRETORIA', STATUS: 'ATIVO', EMAIL: 'dora@exemplo.test', AREA: 'DIRETORIA' },
  { ID: 'u_dir2', USUARIO: 'davi', NOME: 'DAVI DIRETOR TESTE', PERFIL: 'DIRETORIA', STATUS: 'ATIVO', EMAIL: 'davi@exemplo.test', AREA: 'DIRETORIA' },
  { ID: 'u_adm', USUARIO: 'admin', NOME: 'DONO DO SISTEMA TESTE', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: 'dono@exemplo.test', AREA: '' },
  { ID: 'u_fin', USUARIO: 'wanessa', NOME: 'WANESSA FINANCEIRO TESTE', PERFIL: 'FINANCEIRO', STATUS: 'ATIVO', EMAIL: 'wanessa@exemplo.test', AREA: 'FINANCEIRO' },
  { ID: 'u_fin2', USUARIO: 'fabio', NOME: 'FABIO FINANCEIRO TESTE', PERFIL: 'FINANCEIRO', STATUS: 'ATIVO', EMAIL: 'fabio@exemplo.test', AREA: 'FINANCEIRO' },
  { ID: 'u_ven', USUARIO: 'vera', NOME: 'VERA VENDEDORA TESTE', PERFIL: 'COMERCIAL', STATUS: 'ATIVO', EMAIL: 'vera@exemplo.test', AREA: 'COMERCIAL' },
  { ID: 'u_ven2', USUARIO: 'vito', NOME: 'VITO VENDEDOR TESTE', PERFIL: 'COMERCIAL', STATUS: 'ATIVO', EMAIL: 'vito@exemplo.test', AREA: 'COMERCIAL' },
  { ID: 'u_rh', USUARIO: 'rita', NOME: 'RITA RH TESTE', PERFIL: 'RH', STATUS: 'ATIVO', EMAIL: 'rita@exemplo.test', AREA: 'RH' },
  { ID: 'u_tec', USUARIO: 'tiago', NOME: 'TIAGO TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'tiago@exemplo.test', AREA: 'TECNICA' }
];
const FAIXAS_MONICA = [{ ate: '30.000,00', pct: '2' }, { ate: '60.000,00', pct: '3' }, { ate: '80.000,00', pct: '4' }, { ate: '', pct: '5' }];

function proposta(id, numero, resp, total, ganhaEm, extra) {
  return Object.assign({ ID: id, NUMERO: numero, REVISAO: 0, OPORTUNIDADE_ID: 'op_' + id, CLIENTE_ID: 'c1', CLIENTE_NOME: 'HOSPITAL TESTE ALFA LTDA', TITULO: 'Qualificação ' + numero,
    RESPONSAVEL_ID: resp, RESPONSAVEL_NOME: resp, TOTAL: total, SITUACAO: 'APROVADA', RESPOSTA_EM: ganhaEm, ATUALIZADO_EM: ganhaEm }, extra || {});
}
const PROPOSTAS = [
  proposta('p1', 'PROP-2026-0001', 'u_ven', 400000, '2026-01-10T10:00'),
  proposta('p2', 'PROP-2026-0002', 'u_ven', 90000, '2026-09-01T10:00', { CLIENTE_ID: 'c2', CLIENTE_NOME: 'CLINICA TESTE BETA' }),
  proposta('p3', 'PROP-2026-0003', 'u_ven2', 40000, '2026-09-15T10:00'),
  proposta('p4', 'PROP-2026-0004', '', 15000, '2026-09-20T10:00', { OPORTUNIDADE_ID: 'op_sem' }),
  proposta('p5', 'PROP-2026-0005', 'u_ven', 5000, '2026-10-01T10:00', { SITUACAO: 'ENVIADA', RESPOSTA_EM: '' }),
  proposta('p6', 'PROP-2026-0006', 'u_fin', 8000, '2026-10-02T10:00')
];

function ambiente(opcoes) {
  const o = opcoes || {};
  const a = ambienteComercial({
    agora: o.agora || QUI_12NOV, ia: o.ia || null,
    props: Object.assign({ GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: { FINANCEIRO: ['u_fin'] } }) }, o.props || {}),
    tabelas: Object.assign({ CAD_USUARIOS: USUARIOS.map((u) => Object.assign({}, u)), COM_PROPOSTAS: PROPOSTAS.map((p) => Object.assign({}, p)),
      COM_OPORTUNIDADES: [{ ID: 'op_sem', CODIGO: 'OPO-2026-0099', RESPONSAVEL_ID: '' }] }, o.tabelas || {})
  });
  a.ctx.SGO_ehGestaoRotina_ = (p) => ['ADMIN', 'DIRETORIA', 'GESTOR', 'RH', 'FINANCEIRO'].includes(String(p || '').toUpperCase());
  a.ctx.Chaves_ehDonoUsuario_ = (login) => String(login || '').toLowerCase() === 'admin';
  const arquivos = (o.semPoderes ? [] : ['SGO_Poderes.js']).concat(['SGO_Ajuda.js', 'SGO_Ajuda_GanhosVendedores.js', 'SGO_Ganhos_Vendedores.js']);
  for (const f of arquivos) vm.runInContext(fs.readFileSync(path.join(PASTA, f), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  a.ctx.Chaves_ehDonoUsuario_ = (login) => String(login || '').toLowerCase() === 'admin';
  a.g = (login, acao, dados) => JSON.parse(JSON.stringify(a.ctx.GanhosVendedores_api('s_' + login, acao, dados || {})));
  a.ok = (r) => { if (!r || r.ok !== true) throw new Error('esperava ok, veio: ' + (r && r.message)); return r; };
  a.recusa = (r, re) => { assert.equal(r.ok, false, 'esperava recusa, veio ok'); if (re) assert.match(r.message, re); return r; };
  a.contrato = (vend, vig, faixas, extra) => a.ok(a.g('wanessa', 'salvarContrato', Object.assign({ vendedorId: vend, vigencia: vig, faixas: faixas || FAIXAS_MONICA }, extra || {})));
  a.receber = (prop, data, valor, doc, extra) => a.ok(a.g('wanessa', 'lancarRecebimento', Object.assign({ propostaId: prop, data, valor, documento: doc || ('NF ' + data + ' ' + valor) }, extra || {})));
  a.painel = (login, vend, comp) => a.ok(a.g(login, 'painel', { vendedorId: vend, competencia: comp }));
  a.pend = (login) => {
    const u = USUARIOS.find((x) => x.USUARIO === login);
    const itens = [];
    a.ctx.Ganhos_fontePendencias_((it) => itens.push(it), { userId: u.ID, perfil: u.PERFIL, cliente: false, gestao: true, interno: false });
    return itens.filter((it) => (it.paraUsuarios || []).includes(u.ID) || it.publico === 'DIRETORIA');
  };
  return a;
}

module.exports = { ambiente, USUARIOS, PROPOSTAS, FAIXAS_MONICA, PASTA, QUI_12NOV };
