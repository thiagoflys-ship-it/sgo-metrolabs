// Assistência, 03/11/2026 (caso CH-2026-0008: entrega de cama elétrica "resolvida a distância" porque a triagem só tinha remoto,
// orçamento, peça e visita). Triagem com Entrega, Retirada, Envio por transportadora, "já realizado (registrar)" e "Outro (descreva)";
// logística vira O.S. de logística (termo + duas assinaturas no campo); o relatório do atendimento segue o caminho (logística vira
// termo; a distância só a orientação; etapas só as que aconteceram; "Solicitação" fora de conserto); um logo só; série e TAG só nos
// campos próprios; campo vazio ("N/S") some. Código real em contexto isolado; só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, ok, FOTO, ASSINATURA } = require('./_assistencia_ambiente.cjs');

const EXTRAS = ['SGO_CadastroQualidade.js', 'SGO_Clientes.js', 'SGO_Representacao_Config.js', 'SGO_Representacao.js', 'SGO_Representacao_Avisos.js', 'SGO_Representacao_Alertas.js', 'SGO_Representacao_Modelos.js',
  'SGO_Representacao_Painel.js', 'SGO_Gantt_Layout.js', 'SGO_Representacao_Documentos.js'];
const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex').toString('base64');
function amb() {
  const a = ambiente({ extras: EXTRAS });
  a.tabelas.CAD_EQUIPAMENTOS.push({ ID: 'eqCama', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', TIPO: 'CAMA ELETRICA', MODELO: 'FL28C', SERIE: 'R35594', TAG: 'N/S', SETOR: '', STATUS: 'ATIVO' });
  a.html = (r) => Buffer.from(a.arquivos[String(r.documento.htmlUrl).split('/').pop()].bytes).toString('utf8');
  return a;
}
const abrir = (a, extra) => ok(a.api('s_gil', 'abrir', Object.assign({ clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eqCama', sintoma: 'Entrega de Cama Elétrica', solicitante: 'Charles', contato: '62988887777', prioridade: 'P3', parada: 'NAO', canal: 'TELEFONE' }, extra || {}))).chamado;
const chamado = (a, id) => a.tabelas.ATEC_CHAMADOS.find((c) => c.ID === id);
const PREPARO = { ferramentas: true, instrumentos: true, acesso: true, documentacao: true, pecas: true, risco: 'Baixo' };

test('triagem: entrega, retirada e envio não pedem diagnóstico e planejam a O.S. de logística com o tipo do caminho (ou o de Logística escolhido)', () => {
  const a = amb();
  const c1 = abrir(a);
  const r = ok(a.api('s_gil', 'triagem', { id: c1.id, checklist: {}, acao: 'ENTREGA' }));
  assert.match(r.message, /entrega de equipamento ou material\. Agendar a entrega/);
  assert.equal(chamado(a, c1.id).SITUACAO, 'PLANEJADO'); assert.equal(chamado(a, c1.id).TIPO_CODIGO, 'ENTREGA');
  const ag = ok(a.api('s_gil', 'agendar', { id: c1.id, tecnicoId: 'u_tec', inicio: '2026-10-20T09:00', duracaoMin: 60, preparo: PREPARO }));
  const md = ok(a.app('Ast_appMeuDia', 's_tiago', { dia: '2026-10-20' }));
  assert.equal(md.os.find((o) => o.id === ag.os.id).tipo.logistica.sentido, 'ENTREGA', 'a O.S. nasce de logística (termo no campo)');
  // retirada com o tipo de Logística escolhido; tipo técnico escolhido é trocado pelo padrão do caminho
  const a2 = amb();
  const c2 = abrir(a2, { sintoma: 'Retirar para análise' });
  ok(a2.api('s_gil', 'triagem', { id: c2.id, checklist: {}, acao: 'RETIRADA', tipoCodigo: 'RETIRADA_ANALISE' }));
  assert.equal(chamado(a2, c2.id).TIPO_CODIGO, 'RETIRADA_ANALISE');
  const a3 = amb();
  const c3 = abrir(a3);
  ok(a3.api('s_gil', 'triagem', { id: c3.id, checklist: {}, acao: 'ENTREGA', tipoCodigo: 'MANUTENCAO_CORRETIVA' }));
  assert.equal(chamado(a3, c3.id).TIPO_CODIGO, 'ENTREGA');
  const a4 = amb();
  const c4 = abrir(a4);
  ok(a4.api('s_gil', 'triagem', { id: c4.id, checklist: {}, acao: 'ENVIO' }));
  assert.equal(chamado(a4, c4.id).TIPO_CODIGO, 'ENVIO_EQUIPAMENTOS');
  // agenda da logística: só acesso e documentação no preparo (instrumentos, peças e risco são de conserto)
  const a6 = amb(), c6 = abrir(a6);
  ok(a6.api('s_gil', 'triagem', { id: c6.id, checklist: {}, acao: 'ENTREGA' }));
  assert.match(a6.api('s_gil', 'agendar', { id: c6.id, tecnicoId: 'u_tec', inicio: '2026-10-20T09:00', duracaoMin: 60, preparo: { acesso: true } }).message, /documentação em mãos/);
  ok(a6.api('s_gil', 'agendar', { id: c6.id, tecnicoId: 'u_tec', inicio: '2026-10-20T09:00', duracaoMin: 60, preparo: { acesso: true, documentacao: true } }));
  // conserto continua pedindo o diagnóstico
  const a5 = amb();
  const c5 = abrir(a5, { sintoma: 'Cama não sobe' });
  assert.match(a5.api('s_gil', 'triagem', { id: c5.id, checklist: {}, acao: 'RESOLVIDO_REMOTO', orientacao: 'Religar o disjuntor do motor' }).message, /falta preencher/);
});

test('triagem "Outro (descreva)": pede a descrição (10 letras) e o tipo de serviço; planeja com a descrição como próximo passo', () => {
  const a = amb();
  const c = abrir(a, { sintoma: 'Demonstração do equipamento ao cliente' });
  assert.match(a.api('s_gil', 'triagem', { id: c.id, checklist: {}, acao: 'OUTRO', outroDescricao: 'curta' }).message, /pelo menos 10 letras/);
  assert.match(a.api('s_gil', 'triagem', { id: c.id, checklist: {}, acao: 'OUTRO', outroDescricao: 'Demonstração de uso da cama à equipe de enfermagem' }).message, /escolha o tipo de serviço/);
  ok(a.api('s_gil', 'triagem', { id: c.id, checklist: {}, acao: 'OUTRO', tipoCodigo: 'TREINAMENTO', outroDescricao: 'Demonstração de uso da cama à equipe de enfermagem' }));
  const x = chamado(a, c.id);
  assert.equal(x.SITUACAO, 'PLANEJADO'); assert.equal(x.ACAO_DECIDIDA, 'OUTRO'); assert.match(x.PROXIMA_ACAO, /^Agendar: Demonstração de uso/); assert.match(x.OUTRO_DESCRICAO, /enfermagem/);
});

test('"já realizado (registrar)": nome completo, data e hora (não futura) e o canhoto; encerra o chamado com o registro e o comprovante guardado', () => {
  const a = amb();
  const c = abrir(a);
  const base = { id: c.id, checklist: {}, acao: 'LOGISTICA_REALIZADA' };
  assert.match(a.api('s_gil', 'triagem', Object.assign({}, base, { realizada: { recebidoPor: 'Charles', em: '2026-10-19T10:02' } })).message, /nome completo/);
  assert.match(a.api('s_gil', 'triagem', Object.assign({}, base, { realizada: { recebidoPor: 'Charles Teste', em: '' } })).message, /data e a hora/);
  assert.match(a.api('s_gil', 'triagem', Object.assign({}, base, { realizada: { recebidoPor: 'Charles Teste', em: '2026-12-01T09:30' } })).message, /não podem ser no futuro/);
  assert.match(a.api('s_gil', 'triagem', Object.assign({}, base, { realizada: { recebidoPor: 'Charles Teste', documento: '123.456.789-00', em: '2026-10-19T10:02' } })).message, /CPF/);
  const r = ok(a.api('s_gil', 'triagem', Object.assign({}, base, { realizada: { sentido: 'ENTREGA', recebidoPor: 'Charles Recebedor Teste', em: '2026-10-19T10:02', observacao: 'No balcão', anexo: { nome: 'canhoto.png', tipo: 'image/png', base64: PNG } } })));
  assert.match(r.message, /encerrado com o registro/);
  const x = chamado(a, c.id), reg = JSON.parse(x.LOGISTICA_REGISTRO_JSON);
  assert.equal(x.SITUACAO, 'ENCERRADO'); assert.equal(x.ATENDIDO_EM, '2026-10-19T10:02:00'); assert.equal(x.TIPO_CODIGO, 'ENTREGA');
  assert.equal(reg.recebidoPor, 'Charles Recebedor Teste'); assert.ok(a.arquivos[reg.anexo.id], 'comprovante guardado');
  assert.ok(a.tabelas.ATEC_EVENTOS.some((e) => /Entrega já realizada em 19\/10\/2026 10:02, quem recebeu: Charles Recebedor Teste\. Comprovante anexado\./.test(e.TEXTO)));
});

test('relatório do atendimento do caso CH-2026-0008 (a distância): "Solicitação", só a orientação a distância, etapas só as que aconteceram, um logo, série e TAG nos campos próprios, "N/S" some', () => {
  const a = amb();
  const c = abrir(a, { tipoCodigo: 'ENTREGA' });
  a.mudar('2026-10-19T10:15:00-03:00');
  ok(a.api('s_gil', 'triagem', { id: c.id, checklist: { sintomas_confirmados: 'Entrega de equipamento!', risco_operar: 'Entrega de equipamento!', diagnostico_preliminar: 'Entrega de equipamento!' }, acao: 'RESOLVIDO_REMOTO', orientacao: 'Entrega de equipamento!' }));
  for (const publico of ['CLIENTE', 'INTERNO']) {
    const h = a.html(ok(a.api('s_gil', 'relatorioAtendimento', { id: c.id, publico })));
    assert.match(h, /<b>Solicitação\.<\/b> Entrega de Cama Elétrica/); assert.doesNotMatch(h, /Problema relatado/);
    assert.match(h, /Orientação a distância/);
    for (const rx of [/Visita e atendimento/, /Tempo do técnico no local/, /Peças<\//, /Assinaturas e aceite/, /Situação do equipamento/, /N\/S/, /Visita agendada/, /série R35594/]) assert.doesNotMatch(h, rx, publico + ': ' + rx);
    assert.match(h, /Nº de série[\s\S]{0,120}R35594/);
    assert.equal((h.match(/class="cab-tela"/g) || []).length, 0, 'com capa, sem a faixa do topo (um logo só)');
    assert.equal((h.match(/<section class="capa"><div class="logo">/g) || []).length, 1);
  }
  const hc = a.html(ok(a.api('s_gil', 'relatorioAtendimento', { id: c.id, publico: 'CLIENTE' })));
  assert.match(hc, /Resolvido a distância/); assert.doesNotMatch(hc, /Em atendimento/);
});

test('relatório: entrega pela triagem nova vira termo (itens, para quem, as duas assinaturas); entrega já realizada mostra o registro e o comprovante; conserto continua com serviço e peças', () => {
  const a = amb();
  const c = abrir(a);
  ok(a.api('s_gil', 'triagem', { id: c.id, checklist: {}, acao: 'ENTREGA' }));
  const os = ok(a.api('s_gil', 'agendar', { id: c.id, tecnicoId: 'u_tec', inicio: '2026-10-20T09:00', duracaoMin: 60, preparo: PREPARO })).os.id;
  const ev = (t, n, d, q) => ({ tipo: t, osId: os, idLocal: 'trl-' + String(n).padStart(6, '0'), em: q || '2026-10-20T09:10:00', dados: d || {} });
  const sync = (e) => ok(a.app('Ast_appSincronizar', 's_tiago', { pedidoId: 'p' + Math.random(), eventos: e }));
  sync([ev('CHEGUEI', 1, {}, '2026-10-20T09:05:00'), ev('RESPOSTA', 2, { perguntaId: 'conferido', valor: 'SIM' }), ev('RESPOSTA', 3, { perguntaId: 'estado', valor: 'Bom' }),
    ev('RELATO', 4, { logistica: { itens: [{ descricao: 'CAMA ELETRICA · FL28C', quantidade: 1, identificacao: 'Série R35594', estado: 'BOM' }], contraparte: { nome: 'Charles Recebedor Teste' } } })]);
  ok(a.app('Ast_appEnviarFoto', 's_tiago', { osId: os, idLocal: 'trl-foto-000001', nome: 'cama.jpg', base64: FOTO, perguntaId: 'foto', em: '2026-10-20T09:20:00' }));
  sync([ev('ASSINATURA', 5, { nome: 'Charles Recebedor Teste', imagem: ASSINATURA }), ev('ASSINATURA', 6, { papel: 'COLABORADOR', nome: 'Tiago Técnico Teste', imagem: ASSINATURA }), ev('CONCLUI', 7, {}, '2026-10-20T09:40:00')]);
  const h = a.html(ok(a.api('s_gil', 'relatorioAtendimento', { id: c.id, publico: 'CLIENTE' })));
  for (const s of ['Termo de entrega', 'Itens entregues', 'Para quem', 'Charles Recebedor Teste', 'Entregue por (Metrolabs)', 'Tiago Técnico Teste', 'Entrega agendada', 'Em entrega']) assert.ok(h.includes(s), 'faltou: ' + s);
  for (const rx of [/Serviço realizado e recomendações/, /Peças<\//, /Tempo do técnico no local/, /Problema relatado/]) assert.doesNotMatch(h, rx);
  // já realizada
  const b = amb();
  const c2 = abrir(b);
  ok(b.api('s_gil', 'triagem', { id: c2.id, checklist: {}, acao: 'LOGISTICA_REALIZADA', realizada: { sentido: 'ENTREGA', recebidoPor: 'Charles Recebedor Teste', em: '2026-10-19T10:02', anexo: { nome: 'canhoto.png', tipo: 'image/png', base64: PNG } } }));
  const hd = b.html(ok(b.api('s_gil', 'relatorioAtendimento', { id: c2.id, publico: 'CLIENTE' })));
  for (const s of ['Entrega já realizada', 'Recebido por', 'Comprovante anexado', 'Registrada na triagem, sem ordem de serviço']) assert.ok(hd.includes(s), 'faltou: ' + s);
  for (const rx of [/Visita e atendimento/, /Assinaturas e aceite/, /Peças<\//, /Visita agendada/]) assert.doesNotMatch(hd, rx);
  // conserto: as seções de manutenção continuam
  const k = amb();
  const c3 = abrir(k, { equipamentoId: 'eq1', sintoma: 'Autoclave com alarme de pressão', parada: 'TOTAL' });
  ok(k.api('s_gil', 'triagem', { id: c3.id, checklist: { sintomas_confirmados: 'Alarme confirmado', risco_operar: 'Não usar', diagnostico_preliminar: 'Válvula' }, tipoCodigo: 'MANUTENCAO_CORRETIVA', acao: 'PLANEJADO' }));
  const hk = k.html(ok(k.api('s_gil', 'relatorioAtendimento', { id: c3.id, publico: 'CLIENTE' })));
  for (const s of ['Problema relatado', 'Situação do equipamento', 'Visita e atendimento', 'Serviço realizado e recomendações', 'Peças']) assert.ok(hk.includes(s), 'conserto sem: ' + s);
});

test('revisão (03/11/2026): "já realizado" só pela gestão; data antes da abertura recusada; comprovante conferido pela assinatura do arquivo (JPG, PNG, WEBP, PDF, até 10 MB); tipo conferido antes de gravar; ficha com o link', () => {
  const a = amb();
  const c = abrir(a);
  const ch = () => chamado(a, c.id);
  const d = (extra) => ({ realizada: Object.assign({ sentido: 'ENTREGA', recebidoPor: 'Charles Recebedor Teste', em: '2026-10-19T10:02' }, extra || {}) });
  // quem não é da gestão não encerra pelo "já realizado"
  assert.throws(() => a.ctx.AstC_logisticaRealizada_({ id: 'u_tec', nome: 'TIAGO TECNICO TESTE', gestao: false, interno: true }, ch(), d(), {}), /Peça à gestão da área Técnica/);
  const base = { id: c.id, checklist: {}, acao: 'LOGISTICA_REALIZADA' };
  assert.match(a.api('s_gil', 'triagem', Object.assign({}, base, d({ em: '2026-10-18T09:00' }))).message, /anteriores à abertura do chamado/);
  const gif = Buffer.from('GIF89a' + 'x'.repeat(40)).toString('base64');
  assert.match(a.api('s_gil', 'triagem', Object.assign({}, base, d({ anexo: { nome: 'canhoto.jpg', tipo: 'image/jpeg', base64: gif } }))).message, /precisa ser foto \(JPG, PNG ou WEBP\) ou PDF/);
  const grande = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(10 * 1048576 + 10, 1)]).toString('base64');
  assert.match(a.api('s_gil', 'triagem', Object.assign({}, base, d({ anexo: { nome: 'termo.pdf', tipo: 'application/pdf', base64: grande } }))).message, /limite é 10 MB/);
  // o tipo de logística é conferido antes de gravar o arquivo: sem o tipo padrão, nada é gravado
  const antes = Object.keys(a.arquivos).length;
  const orig = a.ctx.AstC_tipoLogistica_;
  a.ctx.AstC_tipoLogistica_ = () => { throw new Error('Não foi possível concluir: o tipo de serviço "ENTREGA" não existe mais'); };
  assert.match(a.api('s_gil', 'triagem', Object.assign({}, base, d({ anexo: { nome: 'canhoto.png', tipo: 'image/png', base64: PNG } }))).message, /tipo de serviço "ENTREGA" não existe mais/);
  assert.equal(Object.keys(a.arquivos).length, antes, 'nenhum arquivo gravado');
  a.ctx.AstC_tipoLogistica_ = orig;
  // PDF de verdade: aceito, com o tipo e a extensão pela assinatura (o navegador disse "image/jpeg")
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n').toString('base64');
  ok(a.api('s_gil', 'triagem', Object.assign({}, base, d({ anexo: { nome: 'canhoto.jpg', tipo: 'image/jpeg', base64: pdf } }))));
  const reg = JSON.parse(ch().LOGISTICA_REGISTRO_JSON);
  assert.equal(reg.anexo.tipo, 'application/pdf'); assert.match(reg.anexo.nome, /^Comprovante CH-\d{4}-\d{4}\.pdf$/);
  const ficha = ok(a.api('s_gil', 'chamado', { id: c.id })).chamado;
  assert.equal(ficha.registroLogistica.anexoUrl, '/arquivos/' + reg.anexo.id);
  // relatório: a Metrolabs vê o nome do arquivo; o cliente só "Comprovante anexado"
  const hc = a.html(ok(a.api('s_gil', 'relatorioAtendimento', { id: c.id, publico: 'CLIENTE' }))), hm = a.html(ok(a.api('s_gil', 'relatorioAtendimento', { id: c.id, publico: 'INTERNO' })));
  assert.match(hc, /Comprovante anexado/); assert.doesNotMatch(hc, /Comprovante CH-/);
  assert.match(hm, /Comprovante CH-\d{4}-\d{4}\.pdf/);
  // glossário da logística
  assert.match(hc, /Conferência da solicitação e programação da entrega/);
});

test('revisão (03/11/2026): orientação remota sai para o cliente e a representada (sem o enquadramento); chamado resolvido antes da publicação não mostra', () => {
  const a = amb();
  a.tabelas.REP_REPRESENTADAS = [{ ID: 'repB', NOME: 'REPRESENTADA BETA TESTE', SITUACAO: 'ATIVA', PRAZOS_JSON: '' }];
  const c = abrir(a, { sintoma: 'Dúvida de uso da cama' });
  a.ctx.SGO_DATA.update('ATEC_CHAMADOS', c.id, { REPRESENTADA_ID: 'repB', REPRESENTADA_NOME: 'REPRESENTADA BETA TESTE' });
  ok(a.api('s_gil', 'triagem', { id: c.id, checklist: { sintomas_confirmados: 'Dúvida de uso', risco_operar: 'Nenhum', diagnostico_preliminar: 'Uso' }, acao: 'RESOLVIDO_REMOTO', orientacao: 'Usar o controle lateral para subir o encosto.\nEnquadramento pretendido: garantia' }));
  for (const publico of ['CLIENTE', 'REPRESENTADA']) {
    const h = a.html(ok(a.api('s_gil', 'relatorioAtendimento', { id: c.id, publico })));
    assert.match(h, /Usar o controle lateral para subir o encosto/, publico);
    assert.doesNotMatch(h, /Enquadramento pretendido: garantia/, publico);
  }
  // chamado resolvido antes da publicação (instante da regra depois da triagem): fora da Metrolabs só "Resolvido com orientação a distância"
  const b = amb();
  const c2 = abrir(b, { sintoma: 'Dúvida de uso da cama' });
  ok(b.api('s_gil', 'triagem', { id: c2.id, checklist: { sintomas_confirmados: 'Dúvida', risco_operar: 'Nenhum', diagnostico_preliminar: 'Uso' }, acao: 'RESOLVIDO_REMOTO', orientacao: 'TEXTO INTERNO ANTIGO da orientação' }));
  b.tabelas.ATEC_CONFIG.filter((x) => x.CHAVE === 'ORIENTACAO_PUBLICA_DESDE').forEach((x) => { x.VALOR_JSON = JSON.stringify('2026-12-01T00:00:00'); }); b.ctx.Ast_memoLimpar_();
  const hc = b.html(ok(b.api('s_gil', 'relatorioAtendimento', { id: c2.id, publico: 'CLIENTE' })));
  // a seção nova não traz o texto antigo (a linha do tempo já mostrava a decisão ao cliente antes desta mudança: evento público)
  const secao = hc.slice(hc.indexOf('Orientação a distância</h2>'), hc.indexOf('</section>', hc.indexOf('Orientação a distância</h2>')));
  assert.ok(secao.length > 30, 'seção da orientação'); assert.doesNotMatch(secao, /TEXTO INTERNO ANTIGO/); assert.match(secao, /Resolvido com orientação a distância/);
  assert.match(b.html(ok(b.api('s_gil', 'relatorioAtendimento', { id: c2.id, publico: 'INTERNO' }))), /TEXTO INTERNO ANTIGO/);
});
