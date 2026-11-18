// Ambiente de teste do Depósito de viagem (E1, 11/11/2026): o código real do SGO+ (ambiente do Comercial, que já traz expediente,
// notificador, Caixa de decisões, central de pendências, documentos A4 e Drive em memória) mais a matriz e os avisos da gestão,
// o motor de caixas (SGO_Poderes.js) e o módulo novo (SGO_Viagem.js, SGO_Viagem_Documento.js). Relógio controlado; e-mail e
// WhatsApp simulados (nada sai de verdade). Só pessoas e dados fictícios; os logins matheusgodoi e wanessa imitam os papéis reais.
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { ambiente: ambienteComercial, em } = require('./_comercial_ambiente.cjs');

const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const SEG_10H = em('2026-10-19T10:00:00-03:00'); // segunda-feira, dia útil, dentro do expediente

const USUARIOS = [
  { ID: 'u_dir', USUARIO: 'dora', NOME: 'DORA DIRETORA TESTE', PERFIL: 'DIRETORIA', STATUS: 'ATIVO', EMAIL: 'dora@exemplo.test', VINCULO_TRABALHO: 'DIRETORIA', AREA: 'DIRETORIA', CELULAR: '62999990010' },
  { ID: 'u_adm', USUARIO: 'admin', NOME: 'DONO DO SISTEMA TESTE', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: 'dono@exemplo.test', VINCULO_TRABALHO: 'DIRETORIA', AREA: '', CELULAR: '62999990099' },
  { ID: 'u_mat', USUARIO: 'matheusgodoi', NOME: 'MATHEUS GERENTE TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'matheus@exemplo.test', VINCULO_TRABALHO: 'PJ', AREA: 'QUALIDADE', CELULAR: '62999990030' },
  { ID: 'u_gt', USUARIO: 'gil', NOME: 'GIL GESTOR TECNICO TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'gil@exemplo.test', VINCULO_TRABALHO: 'CLT', AREA: 'TECNICA' },
  { ID: 'u_tec', USUARIO: 'tiago', NOME: 'TIAGO TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'tiago@exemplo.test', VINCULO_TRABALHO: 'CLT', AREA: 'TECNICA' },
  { ID: 'u_tec2', USUARIO: 'paulo', NOME: 'PAULO TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'paulo@exemplo.test', VINCULO_TRABALHO: 'PJ', AREA: 'TECNICA' },
  { ID: 'u_fin', USUARIO: 'wanessa', NOME: 'WANESSA FINANCEIRO TESTE', PERFIL: 'FINANCEIRO', STATUS: 'ATIVO', EMAIL: 'wanessa@exemplo.test', VINCULO_TRABALHO: 'CLT', AREA: 'FINANCEIRO' },
  { ID: 'u_fin2', USUARIO: 'fabio', NOME: 'FABIO FINANCEIRO TESTE', PERFIL: 'FINANCEIRO', STATUS: 'ATIVO', EMAIL: 'fabio@exemplo.test', VINCULO_TRABALHO: 'CLT', AREA: 'FINANCEIRO' },
  { ID: 'u_rh', USUARIO: 'rita', NOME: 'RITA RH TESTE', PERFIL: 'RH', STATUS: 'ATIVO', EMAIL: 'rita@exemplo.test', AREA: 'RH' },
  { ID: 'u_met', USUARIO: 'mara', NOME: 'MARA METROLOGIA TESTE', PERFIL: 'METROLOGIA', STATUS: 'ATIVO', EMAIL: 'mara@exemplo.test', AREA: 'METROLOGIA' },
  { ID: 'u_cli', USUARIO: 'hcli', NOME: 'HOSPITAL CLIENTE TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'cliente@exemplo.test', CLIENTE_ID: 'c1' }
];

function ambiente(opcoes) {
  const o = opcoes || {};
  const a = ambienteComercial({
    agora: o.agora || SEG_10H,
    // 16/11/2026 (onda 3, bloco A): regras de antes (NAO) nos testes antigos; SIM em tests/financeiro-onda3-a.test.cjs
    props: Object.assign({ META_WA_TOKEN: 'tok-teste', META_WA_PHONE_ID: '123456', GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: { TECNICA: ['u_gt'], FINANCEIRO: ['u_fin'] } }), APROVACAO_SO_DIRETORIA: 'NAO' }, o.props || {}),
    tabelas: Object.assign({ CAD_USUARIOS: USUARIOS.map((u) => Object.assign({}, u)),
      CAD_VEICULOS: [{ ID: 'v1', PLACA: 'ABC1D23', MODELO: 'Strada', APELIDO: 'Onça', STATUS: 'ATIVO' }] }, o.tabelas || {})
  });
  a.ctx.SGO_CFG.SHEETS.CAD_VEICULOS = 'CAD_VEICULOS';
  a.ctx.SGO_ehGestaoRotina_ = (p) => ['ADMIN', 'DIRETORIA', 'GESTOR', 'RH', 'FINANCEIRO'].includes(String(p || '').toUpperCase());
  a.ctx.SGO_DATA.remove = (t, id) => { const l = a.tabelas[t] || [], i = l.findIndex((x) => String(x.ID) === String(id)); if (i < 0) return false; l.splice(i, 1); return true; };
  a.ctx.Chaves_ehDonoUsuario_ = (login) => String(login || '').toLowerCase() === 'admin';
  // 18/11/2026 (Bloco C): SGO_Caju_Comprovante.js tem o miolo da leitura do comprovante pela IA (compartilhado com a Recarga Caju)
  const arquivos = ['SGO_Avisos.js', 'SGO_Avisos_Matriz.js', 'SGO_Avisos_Gestao.js', 'SGO_Poderes.js', 'SGO_Ajuda.js', 'SGO_Ajuda_DepositoViagem.js', 'SGO_Gantt_Layout.js', 'SGO_Caju_Comprovante.js', 'SGO_Viagem_Prestacao.js', 'SGO_Viagem_Fechamento.js', 'SGO_Viagem.js', 'SGO_Viagem_Documento.js', 'SGO_Viagem_Painel.js']
    .filter((f) => !(o.semArquivos || []).includes(f) && (f !== 'SGO_Caju_Comprovante.js' || fs.existsSync(path.join(PASTA, f))));
  for (const f of arquivos) {
    const p = path.join(PASTA, f);
    vm.runInContext(fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  }
  a.ctx.Chaves_ehDonoUsuario_ = (login) => String(login || '').toLowerCase() === 'admin';
  require('./_sigilo_fin.cjs').sigiloFin(a.ctx, a.props, () => a.tabelas.CAD_USUARIOS, PASTA); // 16/11/2026: sigilo do Financeiro
  a.ctx.SGO_waModeloSituacao_ = (n) => (n === 'sgo_gestao_acao' ? 'APPROVED' : '');
  a.v = (login, acao, dados) => {
    vm.runInContext('if (typeof Poderes_memoLimpar_ === "function") Poderes_memoLimpar_(); VIA_POLITICA_MEMO = null;', a.ctx);
    return JSON.parse(JSON.stringify(a.ctx.Viagem_api('s_' + login, acao, dados || {})));
  };
  a.ok = (r) => { if (!r || r.ok !== true) throw new Error('esperava ok, veio: ' + (r && r.message)); return r; };
  a.pdf = (nome) => ({ nome: nome || 'orcamento-hotel.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF-1.4 orcamento de teste ' + (nome || '') + Math.random()).toString('base64') });
  return a;
}

/** Solicitação válida (total R$ 2.660,00): 2 quartos × 3 noites × 250 + 2 pessoas × 4 dias × 100 + 600 km ÷ 10 km/L × R$ 6,00. */
function solicitacaoBase(a, extra) {
  const centro = a.v('gil', 'opcoes').centros.find((c) => c.codigo === 'GO-TECNICA');
  return Object.assign({
    centroCustoId: centro.id, vinculoTipo: 'CLIENTE', clienteId: 'c1', objetivo: 'Qualificação térmica das autoclaves do Hospital Teste Alfa',
    destinoCidade: 'Rio Verde', destinoUf: 'GO', saidaEm: '2026-10-26T07:00', chegadaEm: '2026-10-29T18:00',
    equipe: [{ id: 'u_tec', funcao: 'TECNICO' }, { id: 'u_tec2', funcao: 'TECNICO' }], responsavelId: 'u_tec',
    veiculoTipo: 'FROTA', veiculoId: 'v1', roteiro: 'Goiânia > Rio Verde (carro da Frota); Rio Verde > Goiânia (carro da Frota)',
    linhas: [
      { id: 'Lhotel', categoria: 'HOSPEDAGEM', q1: 2, q2: 3, unitario: '250,00', descricao: 'Hotel Centro, Rio Verde' },
      { id: 'Lalim', categoria: 'ALIMENTACAO', q1: 2, q2: 4, unitario: '100,00' },
      { id: 'Lcomb', categoria: 'COMBUSTIVEL', q1: 600, q2: 10, unitario: '6,00' }
    ],
    naoSeAplica: { PEDAGIO: 'carro da Frota com tag de pedágio', ESTACIONAMENTO: 'hotel com estacionamento incluído', PASSAGENS: 'viagem de carro', TRANSPORTE_LOCAL: 'equipe usa o carro da Frota' }
  }, extra || {});
}
/** Cria, anexa o orçamento do hotel e devolve a solicitação (rascunho completo). */
function criarCompleta(a, login, extra) {
  const r = a.ok(a.v(login || 'gil', 'salvar', solicitacaoBase(a, extra)));
  const comHotel = a.ok(a.v(login || 'gil', 'anexar', { id: r.solicitacao.id, linhaId: 'Lhotel', arquivo: a.pdf('hotel.pdf') }));
  return comHotel.solicitacao;
}

module.exports = { ambiente, solicitacaoBase, criarCompleta, SEG_10H, em, USUARIOS, PASTA };
