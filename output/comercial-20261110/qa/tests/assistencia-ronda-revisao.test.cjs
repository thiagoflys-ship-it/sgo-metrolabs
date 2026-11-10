// Assistência técnica, 03/11/2026: revisão da ronda de engenharia clínica. (1) equipamento de outra unidade ou cliente, ou fora do
// escopo congelado, é recusado em definitivo; o achado nunca vai para chamado de outro cliente nem para o relatório; (2) o
// pós-encerramento roda dentro da trava, com a O.S. e os chamados lidos de novo (duas execuções seguidas não abrem chamado em
// dobro); (3) mudar data, hora ou periodicidade do contrato ativo cancela as futuras não iniciadas e gera de novo, sem duplicar;
// (4) a geração lê de novo dentro da trava; (5) o login de cliente nunca abre versão interna nem prévia, também as antigas;
// (6) validades só da unidade, guardadas na memória do pedido. Código real num contexto isolado; só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, ok, FOTO, ASSINATURA } = require('./_assistencia_ambiente.cjs');

let n = 0;
const ev = (tipo, osId, dados, em) => ({ tipo, osId, idLocal: 'rrev-' + osId + '-' + String(++n).padStart(5, '0'), em: em || '2026-10-20T09:10:00', dados: dados || {} });
const sync = (amb, eventos, sid) => amb.app('Ast_appSincronizar', sid || 's_tiago', { pedidoId: 'p-' + Math.random().toString(36).slice(2), eventos });
const linhaOs = (amb, id) => amb.tabelas.ATEC_OS.find((x) => x.ID === id);
const jeq = (a, b, m) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, m);
const htmlDe = (amb, rx) => Object.values(amb.arquivos).filter((x) => rx.test(x.nome) && /\.html$/.test(x.nome)).map((x) => Buffer.from(x.bytes).toString('utf8'));
const LAV = { registro: 'SIM', vazamento: 'NAO', limpeza: 'SIM', etiqueta: 'SIM', alarme: 'SIM' };

test('sugestão da ronda usa o ID do responsável comercial e aparece nas pendências sem erro de concat', () => {
  const amb = ambRonda(), os = agendar(amb);
  const comercial = amb.ctx.AstR_comercialPara_();
  assert.ok(comercial && comercial.id);
  const destinatarios = [];
  amb.ctx.Ast_avisar_ = (ids) => destinatarios.push(Array.from(ids));
  const id = amb.ctx.AstRd_criarSugestao_(linhaOs(amb, os.id), [{ servico: 'Calibração', texto: 'Monitor de teste', motivo: 'Vencida', chave: 'e:eq5' }]);
  assert.ok(id);
  assert.ok(destinatarios[0].includes(comercial.id));
  assert.ok(destinatarios[0].every((x) => typeof x === 'string'));
  const pendencias = [];
  assert.doesNotThrow(() => amb.ctx.Assistencia_fontePendencias_((item) => pendencias.push(item), { cliente: false }));
  assert.ok(pendencias.some((p) => p.id === 'AST:RONDASUG:' + id));
});

function ambRonda() {
  const amb = ambiente({ extras: ['SGO_Comercial_Config.js'], assColabDesde: '2026-10-01T00:00:00' });
  const E = amb.tabelas.CAD_EQUIPAMENTOS;
  E.push({ ID: 'eq4', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', TIPO: 'Câmara fria', MODELO: 'CF1', SERIE: 'S-400', TAG: 'CF-04', SETOR: 'Farmácia', STATUS: 'ATIVO' });
  E.push({ ID: 'eq5', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', TIPO: 'Monitor multiparamétrico', MODELO: 'MM5', SERIE: 'S-500', TAG: 'MM-05', SETOR: 'UTI', STATUS: 'ATIVO' });
  amb.tabelas.DOC_DOCUMENTOS.push({ ID: 'doc1', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq5', TIPO_DOCUMENTO: 'CERTIFICADO DE CALIBRAÇÃO', NOME_ARQUIVO: 'CERT MM-05', DATA_VENCIMENTO: '2026-09-30', STATUS: 'ATIVO' });
  return amb;
}
const agendar = (amb) => ok(amb.api('s_gil', 'rondaAgendar', { clienteId: 'c1', unidadeId: 'un1', tecnicoId: 'u_tec', inicio: '2026-10-20T09:00', duracaoMin: 180, avisarCliente: false })).os;
const naoVerif = (amb, osId, chaves) => ok(sync(amb, chaves.map((k) => ev('RONDA', osId, { parte: 'ITEM', chave: k, situacao: 'NAO_VERIFICADO', motivo: 'Setor fechado na hora' }))));
const concluir = (amb, osId) => ok(sync(amb, [ev('ASSINATURA', osId, { nome: 'Rui Responsável Teste', imagem: ASSINATURA, versaoApp: 't' }), ev('ASSINATURA', osId, { papel: 'COLABORADOR', nome: 'Tiago Tecnico Teste', imagem: ASSINATURA, versaoApp: 't' }), ev('CONCLUI', osId, {})]));

test('(1) equipamento de outra unidade ou fora do escopo congelado: recusa definitiva; chamado aberto de outro cliente nunca recebe o achado nem entra no relatório', () => {
  const amb = ambRonda();
  const os = agendar(amb);
  ok(sync(amb, [ev('CHEGUEI', os.id, {})]));
  amb.tabelas.CAD_EQUIPAMENTOS.push({ ID: 'eq9', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', TIPO: 'Estufa', MODELO: 'E9', SERIE: 'S-900', TAG: 'ES-09', SETOR: 'CME', STATUS: 'ATIVO' });
  let s = ok(sync(amb, [ev('RONDA', os.id, { parte: 'ITEM', chave: 'e:eq3', situacao: 'FUNCIONANDO' })]));
  assert.equal(s.recusados.length, 1); assert.equal(s.recusados[0].definitivo, true); assert.match(s.recusados[0].motivo, /não é da unidade/);
  s = ok(sync(amb, [ev('RONDA', os.id, { parte: 'ITEM', chave: 'e:eq9', situacao: 'FUNCIONANDO' })]));
  assert.equal(s.recusados.length, 1); assert.equal(s.recusados[0].definitivo, true); assert.match(s.recusados[0].motivo, /escopo/);
  // equipamento cadastrado em campo que já existe em outra unidade: recusa definitiva (não entra nesta ronda)
  amb.tabelas.ATEC_SYNC.push({ ID: 'sx', ID_LOCAL: 'cad-outra-0001', TIPO: 'CADASTRO_EQUIPAMENTO', RESULTADO: 'ACEITO', REF_ID: 'eq3' });
  s = ok(sync(amb, [ev('RONDA', os.id, { parte: 'ITEM', chave: 'n:cad-outra-0001', equipamentoId: 'cad-outra-0001', situacao: 'FUNCIONANDO' })]));
  assert.equal(s.recusados.length, 1); assert.equal(s.recusados[0].definitivo, true); assert.match(s.recusados[0].motivo, /outra unidade/);
  // chamado aberto de OUTRO cliente com o mesmo equipamento (cadastro inconsistente): a ronda abre o próprio chamado
  amb.tabelas.ATEC_CHAMADOS.push({ ID: 'chx', NUMERO: 'CH-2026-9999', SITUACAO: 'ABERTO', CLIENTE_ID: 'c2', CLIENTE_NOME: 'Clínica Teste Beta', EQUIPAMENTO_ID: 'eq2', ABERTO_EM: '2026-10-19T09:00:00', ORIGEM_REF: '' });
  ok(sync(amb, [ev('RONDA', os.id, { parte: 'ITEM', chave: 'e:eq2', situacao: 'FORA_USO', parada: 'TOTAL', descricao: 'Vazamento de água pela porta durante o ciclo', respostas: LAV })]));
  ok(amb.app('Ast_appEnviarFoto', 's_tiago', { osId: os.id, idLocal: 'foto-rv-eq2', nome: 'a.jpg', base64: FOTO, perguntaId: 'ronda:e:eq2' }));
  naoVerif(amb, os.id, ['e:eq1', 'e:eq4', 'e:eq5']);
  s = concluir(amb, os.id);
  assert.equal(s.os[0].situacao, 'ENCERRADA', JSON.stringify(s.os[0].pendencias));
  const daRonda = amb.tabelas.ATEC_CHAMADOS.filter((c) => /^RONDA:/.test(c.ORIGEM_REF));
  assert.equal(daRonda.length, 1); assert.equal(daRonda[0].CLIENTE_ID, 'c1');
  assert.equal(amb.tabelas.ATEC_EVENTOS.some((e) => e.ENTIDADE_ID === 'chx'), false, 'o chamado do outro cliente não recebe o achado');
  // mesmo que um registro antigo aponte para o chamado do outro cliente, o relatório não lista
  const linha = linhaOs(amb, os.id), pos = JSON.parse(linha.RONDA_POS_JSON);
  pos.chamados['e:xx'] = { id: 'chx', numero: 'CH-2026-9999', novo: false }; linha.RONDA_POS_JSON = JSON.stringify(pos);
  amb.ctx.Ast_memoLimpar_();
  const h = amb.ctx.AstRd_html_(linhaOs(amb, os.id), 'CLIENTE', {});
  assert.doesNotMatch(h, /CH-2026-9999/); assert.match(h, new RegExp(daRonda[0].NUMERO));
});

test('(2) pós-encerramento dentro da trava, com a O.S. e os chamados lidos de novo: duas execuções seguidas com a memória velha não abrem chamado em dobro', () => {
  const amb = ambRonda();
  const os = agendar(amb);
  ok(sync(amb, [ev('CHEGUEI', os.id, {}), ev('RONDA', os.id, { parte: 'ITEM', chave: 'e:eq2', situacao: 'FORA_USO', parada: 'TOTAL', descricao: 'Vazamento de água pela porta durante o ciclo', respostas: LAV })]));
  ok(amb.app('Ast_appEnviarFoto', 's_tiago', { osId: os.id, idLocal: 'foto-rv2-eq2', nome: 'a.jpg', base64: FOTO, perguntaId: 'ronda:e:eq2' }));
  naoVerif(amb, os.id, ['e:eq1', 'e:eq4', 'e:eq5']);
  amb.ctx.Ast_memoLimpar_();
  const velhaOs = amb.ctx.Ast_ler_('ATEC_OS').map((o) => Object.assign({}, o)), velhosCh = amb.ctx.Ast_lerTudo_('ATEC_CHAMADOS').map((c) => Object.assign({}, c));
  concluir(amb, os.id);
  const chs = () => amb.tabelas.ATEC_CHAMADOS.filter((c) => /^RONDA:/.test(c.ORIGEM_REF));
  assert.equal(chs().length, 1);
  assert.ok(JSON.parse(linhaOs(amb, os.id).RONDA_POS_JSON).andamentoEm, 'marca "em andamento" gravada antes dos chamados');
  for (let i = 0; i < 2; i++) {
    // execução atrasada com a memória do pedido de antes do encerramento (O.S. sem o pós e nenhum chamado da ronda)
    const m = amb.ctx.AST_MEMO;
    m.ATEC_OS = velhaOs.map((o) => Object.assign({}, o)); m['__tudo_ATEC_OS'] = m.ATEC_OS; delete m['__mapa_ATEC_OS'];
    m.ATEC_CHAMADOS = velhosCh.slice(); m['__tudo_ATEC_CHAMADOS'] = velhosCh.slice();
    amb.ctx.AstRd_posConclusao_(amb.ctx.Ast_sistema_(), os.id);
  }
  assert.equal(chs().length, 1, 'sem chamado em dobro');
  assert.equal(amb.trava.presa, false);
});

test('(3) e (4) mudar data, hora ou periodicidade do contrato ativo cancela as futuras não iniciadas e gera de novo, sem duplicar; a geração lê de novo dentro da trava', () => {
  const amb = ambRonda();
  const r = ok(amb.api('s_gil', 'rondaPlanoSalvar', { clienteId: 'c1', unidadeId: 'un1', periodicidade: 'SEMANAL', inicio: '2026-10-20', hora: '08:00', tecnicoId: 'u_tec' }));
  const ativas = () => amb.tabelas.ATEC_OS.filter((o) => o.RONDA_PLANO_ID === r.plano.id && o.SITUACAO !== 'CANCELADA');
  assert.equal(ativas().length, 5);
  ok(amb.api('s_gil', 'rondaPlanoSalvar', { id: r.plano.id, clienteId: 'c1', unidadeId: 'un1', periodicidade: 'SEMANAL', inicio: '2026-10-20', hora: '13:00', tecnicoId: 'u_tec', motivo: 'Cliente pediu à tarde' }));
  assert.equal(ativas().length, 5);
  assert.ok(ativas().every((o) => /T13:00/.test(o.AGENDADO_PARA)), 'todas com a hora nova');
  assert.equal(new Set(ativas().map((o) => o.RONDA_CHAVE)).size, 5);
  ok(amb.api('s_gil', 'rondaPlanoSalvar', { id: r.plano.id, clienteId: 'c1', unidadeId: 'un1', periodicidade: 'QUINZENAL', inicio: '2026-10-21', hora: '13:00', tecnicoId: 'u_tec', motivo: 'Contrato passou a quinzenal' }));
  jeq(ativas().map((o) => o.RONDA_PREVISTA).sort(), ['2026-10-21', '2026-11-04', '2026-11-18']);
  const antes = ativas().map((o) => o.ID).join();
  ok(amb.api('s_gil', 'rondaPlanoSalvar', { id: r.plano.id, clienteId: 'c1', unidadeId: 'un1', periodicidade: 'QUINZENAL', inicio: '2026-10-21', hora: '13:00', tecnicoId: 'u_tec', orientacao: 'Levar termômetro', motivo: 'orientação nova' }));
  assert.equal(ativas().map((o) => o.ID).join(), antes, 'só a orientação: nada é cancelado');
  // ronda já começada não é cancelada pela mudança
  const comecou = ativas()[0]; comecou.SAIU_EM = '2026-10-21T12:00:00';
  amb.ctx.Ast_memoLimpar_();
  ok(amb.api('s_gil', 'rondaPlanoSalvar', { id: r.plano.id, clienteId: 'c1', unidadeId: 'un1', periodicidade: 'QUINZENAL', inicio: '2026-10-21', hora: '14:00', tecnicoId: 'u_tec', motivo: 'Uma hora depois' }));
  assert.equal(linhaOs(amb, comecou.ID).SITUACAO, 'AGENDADA');
  assert.equal(new Set(ativas().map((o) => o.RONDA_CHAVE)).size, ativas().length, 'uma ronda por data prevista');
  // geração com a memória velha (sem as rondas): lê de novo dentro da trava e não duplica
  const total = ativas().length;
  amb.ctx.AST_MEMO.ATEC_OS = []; amb.ctx.AST_MEMO['__tudo_ATEC_OS'] = [];
  assert.equal(amb.ctx.AstRd_gerarTodos_().geradas, 0);
  assert.equal(ativas().length, total);
});

test('(5) e (6) login de cliente nunca abre versão interna nem prévia (também a antiga, depois da revisão); validades só da unidade, na memória do pedido', () => {
  const amb = ambRonda();
  amb.tabelas.CAD_EQUIPAMENTOS.push({ ID: 'eqB', CLIENTE_ID: 'c1', UNIDADE_ID: 'unX', TIPO: 'Monitor', SERIE: 'S-B', TAG: 'MB', STATUS: 'ATIVO' });
  amb.tabelas.DOC_DOCUMENTOS.push({ ID: 'docB', CLIENTE_ID: 'c1', EQUIPAMENTO_ID: 'eqB', TIPO_DOCUMENTO: 'CERTIFICADO DE CALIBRAÇÃO', DATA_VENCIMENTO: '2026-01-01', STATUS: 'ATIVO' });
  const v1 = amb.ctx.AstRd_validades_('c1', 'un1');
  assert.ok(v1.eq5 && v1.eq5.cal.vencida); assert.equal(v1.eqB, undefined, 'equipamento de outra unidade fora');
  assert.equal(amb.ctx.AstRd_validades_('c1', 'un1'), v1, 'mesma chamada: memória do pedido');
  const os = agendar(amb);
  ok(sync(amb, [ev('CHEGUEI', os.id, {})]));
  naoVerif(amb, os.id, ['e:eq1', 'e:eq2', 'e:eq4', 'e:eq5']);
  const previa = ok(amb.api('s_gil', 'rondaRelatorio', { osId: os.id, publico: 'CLIENTE' }));
  const regPrev = amb.tabelas.ATEC_RELATORIOS.find((x) => x.RASCUNHO === 'SIM' && x.OS_ID === os.id);
  assert.ok(regPrev && previa.rascunho);
  concluir(amb, os.id);
  const interna1 = linhaOs(amb, os.id).RONDA_INTERNO_PDF_ID;
  ok(amb.api('s_gil', 'corrigirRelatorio', { osId: os.id, motivo: 'Correção das orientações a pedido do cliente', ronda: { orientacoes: 'Orientado manter a porta fechada' } }));
  const fim = linhaOs(amb, os.id), perm = amb.ctx.AstRd_arquivoClientePermitido_;
  assert.notEqual(fim.RONDA_INTERNO_PDF_ID, interna1);
  assert.equal(perm('s_cliente.alfa', interna1), false, 'versão interna antiga');
  assert.equal(perm('s_cliente.alfa', fim.RONDA_INTERNO_PDF_ID), false);
  assert.equal(perm('s_cliente.alfa', regPrev.PDF_ID), false, 'prévia (rascunho)');
  assert.equal(perm('s_cliente.alfa', fim.RELATORIO_PDF_ID), true);
  assert.equal(perm('s_cliente.beta', fim.RELATORIO_PDF_ID), false);
});
