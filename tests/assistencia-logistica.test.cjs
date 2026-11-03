// Assistência técnica, 03/11/2026 (logística): entrega, retirada (recebimento) e envio de equipamento têm formulário próprio, o
// TERMO (itens com quantidade, identificação e estado; de quem/para quem; motivo e destino da retirada), no lugar do relato de
// manutenção. Condição encontrada, teste funcional e QR/série não travam a logística. O relatório A4 vira o "Termo de entrega" ou
// o "Termo de retirada (recebimento)", com a assinatura de quem entrega e de quem recebe. O.S. de logística antiga (só com o
// relato escrito) continua encerrando e saindo no documento. Código real num contexto isolado; só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, ok, FOTO, ASSINATURA, chamadoAgendado } = require('./_assistencia_ambiente.cjs');

const ev = (tipo, osId, n, dados, em) => ({ tipo, osId, idLocal: 'aplog-' + osId + '-' + String(n).padStart(4, '0'), em: em || '2026-10-20T09:10:00', dados: dados || {} });
const sync = (amb, eventos, sid) => amb.app('Ast_appSincronizar', sid || 's_tiago', { pedidoId: 'p-' + Math.random().toString(36).slice(2), eventos });
const linhaOs = (amb, id) => amb.tabelas.ATEC_OS.find((x) => x.ID === id);
const htmlDe = (amb, rx) => { const a = Object.values(amb.arquivos).filter((x) => rx.test(x.nome) && /\.html$/.test(x.nome)).pop(); return a ? Buffer.from(a.bytes).toString('utf8') : ''; };
const TERMO_ENTREGA = { itens: [{ descricao: 'Autoclave M1', quantidade: 1, identificacao: 'Série S-100 · TAG AC-01', estado: 'BOM', acessorios: 'Cabo de força e manual' },
  { descricao: 'Bandeja inox', quantidade: 2, identificacao: '', estado: 'AVARIA', avaria: 'Amassado na borda direita' }],
  contraparte: { nome: 'Rui Responsável Teste', documento: 'Matrícula 778', setor: 'CME' }, local: 'CME, sala 2', embalagem: 'ORIGINAL', lacre: 'L-5531', observacoes: 'Entregue após a manutenção.' };

/** Chegada, conferência, foto e termo de uma O.S. de logística; assinaturas e Concluí à parte. */
function registrarLogistica(amb, osId, termo) {
  let s = ok(sync(amb, [ev('CHEGUEI', osId, 1, {}, '2026-10-20T09:05:00'), ev('RESPOSTA', osId, 2, { perguntaId: 'conferido', valor: 'SIM' }), ev('RESPOSTA', osId, 3, { perguntaId: 'estado', valor: 'Com avaria' })]));
  assert.equal(s.recusados.length, 0, JSON.stringify(s.recusados));
  ok(amb.app('Ast_appEnviarFoto', 's_tiago', { osId, idLocal: 'fotolog-' + osId, nome: 'itens.jpg', base64: FOTO, perguntaId: 'foto', em: '2026-10-20T09:15:00' }));
  if (termo) { s = ok(sync(amb, [ev('RELATO', osId, 4, { logistica: termo })])); assert.equal(s.recusados.length, 0, JSON.stringify(s.recusados)); }
}

test('Meu dia e tipos de campo: logística vem com o bloco do termo (sentido, colaborador), sem campo de manutenção exigido nem QR/série; técnico continua igual', () => {
  const amb = ambiente();
  const a = chamadoAgendado(amb, { tipoCodigo: 'ENTREGA' });
  const md = ok(amb.app('Ast_appMeuDia', 's_tiago', { dia: '2026-10-20' }));
  const o = md.os.find((x) => x.id === a.os.id);
  assert.equal(o.tipo.grupo, 'LOGISTICA');
  assert.deepEqual(JSON.parse(JSON.stringify(o.tipo.logistica)), { sentido: 'ENTREGA', termo: true, colaborador: true, titulo: 'Termo de entrega' });
  assert.deepEqual(Array.from(o.tipo.exige.relatoCampos), [], 'sem condição encontrada nem serviço realizado');
  assert.equal(o.tipo.exige.qrOuSerie, false);
  const t = (cod) => md.tipos.find((x) => x.codigo === cod);
  assert.equal(t('RETIRADA_ANALISE').logistica.sentido, 'RETIRADA');
  assert.equal(t('ENTRADA_CALIBRACAO').logistica.sentido, 'RETIRADA');
  assert.equal(t('ENTREGA_DOCUMENTACAO').logistica.sentido, 'ENTREGA');
  assert.equal(t('MANUTENCAO_CORRETIVA').logistica, null);
  assert.deepEqual(Array.from(t('MANUTENCAO_CORRETIVA').exige.relatoCampos), ['servicoRealizado', 'condicaoEncontrada', 'testeFuncional']);
  // envio (sem visita) não pede a assinatura do colaborador nem aparece no Novo atendimento
  assert.equal(amb.ctx.Ast_tipo_('ENVIO_EQUIPAMENTOS').logistica.sentido, 'ENVIO');
  assert.equal(amb.ctx.Ast_tipo_('ENVIO_EQUIPAMENTOS').logistica.colaborador, false);
});

test('entrega com o termo encerra sem condição encontrada nem teste funcional; o A4 é o "Termo de entrega" com itens, avaria, quem entregou e quem recebeu, sem as seções de manutenção', () => {
  const amb = ambiente();
  const a = chamadoAgendado(amb, { tipoCodigo: 'ENTREGA' });
  const osId = a.os.id;
  registrarLogistica(amb, osId, TERMO_ENTREGA);
  const lg = JSON.parse(linhaOs(amb, osId).LOGISTICA_JSON);
  assert.equal(lg.sentido, 'ENTREGA'); assert.equal(lg.itens.length, 2); assert.equal(lg.itens[1].estado, 'AVARIA'); assert.equal(lg.embalagem, 'ORIGINAL');
  // falta só a assinatura (nunca "condição encontrada", "teste funcional" ou "relato do serviço")
  let faltas = amb.ctx.AstO_faltas_(linhaOs(amb, osId));
  assert.equal(faltas.length, 1, faltas.join(' | '));
  assert.match(faltas[0], /assinatura de quem recebe/);
  const r = ok(sync(amb, [ev('ASSINATURA', osId, 5, { papel: 'COLABORADOR', nome: 'TIAGO TECNICO TESTE', documento: 'Matrícula 12', imagem: ASSINATURA }),
    ev('ASSINATURA', osId, 6, { nome: 'Rui Responsável Teste', documento: 'Matrícula 778', imagem: ASSINATURA }), ev('CONCLUI', osId, 7, {}, '2026-10-20T09:40:00')]));
  assert.equal(r.recusados.length, 0, JSON.stringify(r.recusados));
  assert.equal(r.os[0].situacao, 'ENCERRADA', JSON.stringify(r.os[0].pendencias));
  const os = linhaOs(amb, osId);
  assert.ok(os.COLAB_ASSINATURA_ARQUIVO_ID, 'assinatura do colaborador gravada à parte');
  assert.equal(os.COLAB_ASSINATURA_NOME, 'TIAGO TECNICO TESTE');
  assert.equal(os.ASSINATURA_NOME, 'Rui Responsável Teste', 'a do cliente não foi trocada pela do colaborador');
  assert.ok(amb.tabelas.ATEC_EVENTOS.some((e) => e.TIPO === 'ASSINATURA_COLABORADOR'));
  const h = htmlDe(amb, /^Termo de entrega da OS/);
  assert.ok(h, 'arquivo do termo com nome próprio');
  assert.match(h, /Termo de entrega/);
  assert.match(h, /Itens entregues/); assert.match(h, /Autoclave M1/); assert.match(h, /Bandeja inox/); assert.match(h, /Série S-100/);
  assert.match(h, /Avarias encontradas/); assert.match(h, /Amassado na borda direita/);
  assert.match(h, /Entregue por \(Metrolabs\)/); assert.match(h, /Recebido por/); assert.match(h, /Declaro que recebi os itens/);
  assert.match(h, /L-5531/); assert.match(h, /Embalagem original/); assert.match(h, /CME, sala 2/);
  for (const rx of [/Condição encontrada/, /Teste funcional/, /Serviço realizado/, /Peças/, /Relatório de atendimento técnico/]) assert.doesNotMatch(h, rx);
  // e-mail ao cliente fala do termo
  const txt = amb.ctx.AstR_textoEnvio_(os, { nome: 'Gil' });
  assert.match(txt.assunto, /^Termo de entrega OS-/);
  assert.match(txt.texto, /termo de entrega/); assert.doesNotMatch(txt.texto, /teste funcional/);
  // ficha da gestão traz o termo e a assinatura do colaborador
  const ficha = ok(amb.api('s_gil', 'os', { id: osId })).os;
  assert.equal(ficha.logistica.sentido, 'ENTREGA'); assert.equal(ficha.logistica.termo.itens.length, 2); assert.equal(ficha.assinaturaColaborador.nome, 'TIAGO TECNICO TESTE');
  assert.ok(!amb.trava.aninhamentos, 'sem trava aninhada');
});

test('retirada: o termo leva motivo e destino; o A4 é o "Termo de retirada (recebimento)" com "Entregue por" (cliente) antes de "Recebido por (Metrolabs)"', () => {
  const amb = ambiente();
  const a = chamadoAgendado(amb, { tipoCodigo: 'RETIRADA_ANALISE' });
  const osId = a.os.id;
  registrarLogistica(amb, osId, { itens: [{ descricao: 'Autoclave M1', quantidade: '1', identificacao: 'Série S-100', estado: 'BOM' }], contraparte: { nome: 'Rui Responsável Teste' },
    motivo: 'Falha intermitente no aquecimento, diagnóstico em bancada', destino: 'ANALISE', destinoInvalido: 'x' });
  const lg = JSON.parse(linhaOs(amb, osId).LOGISTICA_JSON);
  assert.equal(lg.sentido, 'RETIRADA'); assert.equal(lg.destino, 'ANALISE'); assert.equal(lg.itens[0].quantidade, 1);
  const r = ok(sync(amb, [ev('ASSINATURA', osId, 5, { nome: 'Rui Responsável Teste', imagem: ASSINATURA }), ev('CONCLUI', osId, 6, {}, '2026-10-20T09:40:00')]));
  assert.equal(r.os[0].situacao, 'ENCERRADA', 'a assinatura do colaborador é cobrada no aparelho, não trava o encerramento no servidor');
  const h = htmlDe(amb, /^Termo de retirada da OS/);
  assert.match(h, /Termo de retirada \(recebimento\)/);
  assert.match(h, /Motivo da retirada/); assert.match(h, /diagnóstico em bancada/); assert.match(h, /Análise técnica em bancada/);
  assert.ok(h.indexOf('Entregue por') < h.indexOf('Recebido por (Metrolabs)'), 'cliente entrega, Metrolabs recebe');
  assert.match(h, /Declaro que entreguei à Metrolabs/);
});

test('logística sem termo e sem relato: falta "o termo: o que foi retirado"; termo vazio não grava; termo em O.S. técnica é recusado em definitivo', () => {
  const amb = ambiente();
  const a = chamadoAgendado(amb, { tipoCodigo: 'RETIRADA' });
  registrarLogistica(amb, a.os.id, null);
  const faltas = amb.ctx.AstO_faltas_(linhaOs(amb, a.os.id));
  assert.ok(faltas.some((f) => /o termo: o que foi retirado/.test(f)), faltas.join(' | '));
  assert.ok(!faltas.some((f) => /condição encontrada|teste funcional|conferência do equipamento/.test(f)), faltas.join(' | '));
  // itens sem descrição nem identificação saem; o termo fica gravado sem itens e a falta continua
  ok(sync(amb, [ev('RELATO', a.os.id, 9, { logistica: { itens: [{ descricao: '', identificacao: '' }], contraparte: { nome: 'Rui' } } })]));
  assert.equal(JSON.parse(linhaOs(amb, a.os.id).LOGISTICA_JSON).itens.length, 0);
  assert.ok(amb.ctx.AstO_faltas_(linhaOs(amb, a.os.id)).some((f) => /o termo/.test(f)));
  // O.S. técnica: termo não se aplica
  const amb2 = ambiente();
  const b = chamadoAgendado(amb2, { tipoCodigo: 'MANUTENCAO_CORRETIVA' });
  ok(sync(amb2, [ev('CHEGUEI', b.os.id, 1, {}, '2026-10-20T09:05:00')]));
  const r = ok(sync(amb2, [ev('RELATO', b.os.id, 2, { logistica: TERMO_ENTREGA })]));
  assert.equal(r.recusados.length, 1); assert.equal(r.recusados[0].definitivo, true); assert.match(r.recusados[0].motivo, /só vale para O.S. de logística/);
  // e a técnica continua exigindo condição encontrada e teste funcional
  const ft = amb2.ctx.AstO_faltas_(linhaOs(amb2, b.os.id));
  assert.ok(ft.some((f) => /condição encontrada/.test(f)) && ft.some((f) => /teste funcional/.test(f)), ft.join(' | '));
});

test('dado antigo não quebra: logística registrada antes do termo (só o relato escrito) encerra e o termo A4 traz o equipamento da O.S. e o relato nas observações', () => {
  const amb = ambiente();
  const a = chamadoAgendado(amb, { tipoCodigo: 'ENTREGA' });
  const osId = a.os.id;
  registrarLogistica(amb, osId, null);
  const r = ok(sync(amb, [ev('RELATO', osId, 4, { condicaoEncontrada: 'Equipamento embalado', servicoRealizado: 'Entrega da autoclave ao setor de CME' }),
    ev('ASSINATURA', osId, 5, { nome: 'Rui Responsável Teste', imagem: ASSINATURA }), ev('CONCLUI', osId, 6, {}, '2026-10-20T09:40:00')]));
  assert.equal(r.os[0].situacao, 'ENCERRADA', JSON.stringify(r.os[0].pendencias));
  const h = htmlDe(amb, /^Termo de entrega da OS/);
  assert.match(h, /Autoclave/, 'o equipamento da O.S. vira o item');
  assert.match(h, /Entrega da autoclave ao setor de CME/); assert.match(h, /Observações/); assert.match(h, /registrado antes do termo próprio/);
});
