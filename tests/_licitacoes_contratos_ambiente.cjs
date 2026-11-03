// Ambiente dos testes dos contratos de Licitações (02/11/2026): o ambiente da proposta (Comercial real, catálogo oficial, tabela de preços,
// leitura, habilitação, proposta e relatórios) mais a Central de disputas, o Kanban, os contratos e o cadastro único de clientes
// (SGO_Clientes.js, SGO_Unidades.js, SGO_Vinculos.js, SGO_CadastroQualidade.js). Uma licitação com a disputa concluída (item 1 ganho e
// homologado, item 2 perdido) fica pronta para virar contrato. Só dados de teste (nomes e CNPJs fictícios).
'use strict';
const vm = require('node:vm');
const { ambienteProposta } = require('./_licitacoes_proposta_ambiente.cjs');

const ITENS = [{ numero: '1', descricao: 'Calibração de termômetro digital com certificado', codigo: 'CAL-001', quantidade: 100, precoEdital: '200,00', precoProposta: '199,00', origem: 'PNCP' },
  { numero: '2', descricao: 'Calibração de termômetro tipo espeto', codigo: 'CAL-002', quantidade: 10, precoEdital: '400,00', precoProposta: '390,00', origem: 'PNCP' }];
const ok = (r) => { if (!r || !r.ok) throw new Error((r && r.message) || 'sem resposta'); return r; };

/** o.concluir: false = disputa aberta sem resultado; o.homologacao: '' = item ganho sem homologação. */
function ambienteContratos(o) {
  o = o || {};
  const a = ambienteProposta();
  a.ctx.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true, hasLock: () => false }) };
  a.ctx.SpreadsheetApp = { flush() {} };
  a.ctx.SGO_DATA.gerarRegistroBase = (extra) => Object.assign({ ID: 'cli' + Math.random().toString(36).slice(2, 8), CRIADO_EM: new Date().toISOString() }, extra || {});
  a.ctx.SGO_DATA.normalizarObjetoParaSheet = (nome, obj) => obj;
  a.ctx.Utilities.base64Encode = (b) => Buffer.from(Array.from(b, (x) => x & 255)).toString('base64');
  for (const f of ['SGO_Clientes.js', 'SGO_Unidades.js', 'SGO_Vinculos.js', 'SGO_CadastroQualidade.js', 'SGO_Licitacoes_Disputa.js', 'SGO_Licitacoes_Painel.js', 'SGO_Licitacoes_Contratos.js']) vm.runInContext(a.ler(f), a.ctx, { filename: f });
  const op1 = a.tabelas.LIC_OPORTUNIDADES[0];
  op1.LEI = '14133'; op1.ORGAO_CNPJ = o.cnpj === undefined ? '11444777000161' : o.cnpj;
  a.simular('op1', ITENS, 'Simulação para a disputa');
  ok(a.prop('s_dora', 'montar', { id: 'op1', usarIA: false }));
  const pid = ok(a.prop('s_dora', 'tela', { id: 'op1' })).proposta.atual.id;
  ok(a.prop('s_dora', 'aprovar', { id: 'op1', propostaId: pid, motivo: 'Preços e escopo conferidos' }));
  ok(a.prop('s_dora', 'emitir', { id: 'op1', propostaId: pid }));
  a.dsp = (sid, op, d) => a.ctx.Licitacoes_api(sid, 'disputa', Object.assign({ op }, d || {}));
  ok(a.dsp('s_dora', 'abrir', { id: 'op1', motivo: 'Proposta emitida e piso conferido pela Diretoria' }));
  if (o.concluir !== false) {
    ok(a.dsp('s_dora', 'resultado', { id: 'op1', item: '1', situacao: 'GANHO', valorFinal: '185,00', adjudicacao: '2026-11-21', homologacao: o.homologacao === undefined ? '2026-11-24' : o.homologacao, fonte: 'termo de homologação no PNCP' }));
    ok(a.dsp('s_dora', 'resultado', { id: 'op1', item: '2', situacao: 'PERDIDO', vencedor: 'Empresa Concorrente Teste', fonte: 'ata da sessão' }));
    ok(a.dsp('s_dora', 'concluir', { id: 'op1', motivo: 'Ata da sessão publicada e homologação' }));
  }
  a.ct = (sid, op, d) => a.ctx.Licitacoes_api(sid, 'contratos', Object.assign({ op }, d || {}));
  a.c = (op, d) => a.ct('s_dora', op, Object.assign({ id: 'op1' }, d || {}));
  a.op = (id) => a.tabelas.LIC_OPORTUNIDADES.find((x) => x.ID === (id || 'op1'));
  a.hist = (tipo) => (a.tabelas.LIC_HISTORICO || []).filter((h) => !tipo || h.TIPO === tipo);
  a.evs = (todas) => (a.tabelas.LIC_EVENTOS || []).filter((e) => /\|CTR\|/.test(e.CHAVE) && (todas || e.SITUACAO !== 'RETIFICADO'));
  a.CAMPOS = () => ({ numeroContrato: '012/2026', tipo: 'CONTRATO', assinatura: '2026-11-28', inicio: '2026-12-01', fim: '2027-11-30', reajusteIndice: 'IPCA', reajusteDataBase: '2026-11-20', reajusteFonte: 'cláusula 8 do contrato',
    garantiaTipo: 'SEGURO', garantiaValor: '925,00', garantiaValidade: '2028-02-28', garantiaFonte: 'cláusula 10, 5% do valor', renovacaoPrevista: true,
    entregas: [{ descricao: 'Primeiro lote de 50 calibrações', prazo: '2027-01-15', valor: '9.250,00' }, { descricao: 'Segundo lote de 50 calibrações', prazo: '2027-06-15', valor: '9.250,00' }],
    obrigacoes: [{ descricao: 'Apresentar a equipe técnica ao fiscal', prazo: '2026-12-05' }, { descricao: 'Manter a regularidade fiscal' }] });
  a.criar = (extra) => ok(a.c('criar', Object.assign({ origem: 'RESULTADO', motivo: 'Contrato assinado recebido do órgão', campos: a.CAMPOS() }, extra || {})));
  a.tela = () => ok(a.c('tela'));
  return a;
}
const PDF = (txt) => ({ nome: 'contrato-assinado.pdf', base64: Buffer.from('%PDF-1.4\n' + (txt || 'contrato de teste') + '\n%%EOF').toString('base64') });
module.exports = { ambienteContratos, PDF, ok };
