// Assistência técnica, 03/11/2026 (ronda de engenharia clínica): contrato de ronda recorrente sem duplicar (pausar e retomar),
// ronda avulsa, registro em campo pelo SGO+ Campo (evento RONDA), foto obrigatória só no problema, perguntas fixas por tipo,
// equipamento cadastrado em campo, chamado automático idempotente, sugestão ao Comercial, relatório em duas versões, isolamento
// do cliente no portal e na rota de arquivos, permissão (técnico ou gestão) e indicadores. Código real; só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, ok, FOTO, ASSINATURA } = require('./_assistencia_ambiente.cjs');

let n = 0;
const ev = (tipo, osId, dados, em) => ({ tipo, osId, idLocal: 'ronda-' + osId + '-' + String(++n).padStart(5, '0'), em: em || '2026-10-20T09:10:00', dados: dados || {} });
const jeq = (a, b, m) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, m);
const sync = (amb, eventos, sid) => amb.app('Ast_appSincronizar', sid || 's_tiago', { pedidoId: 'p-' + Math.random().toString(36).slice(2), eventos });
const linhaOs = (amb, id) => amb.tabelas.ATEC_OS.find((x) => x.ID === id);
const htmlDe = (amb, rx) => Object.values(amb.arquivos).filter((x) => rx.test(x.nome) && /\.html$/.test(x.nome)).map((x) => Buffer.from(x.bytes).toString('utf8'));

function ambRonda(extra) {
  const amb = ambiente(Object.assign({ extras: ['SGO_Comercial_Config.js'], assColabDesde: '2026-10-01T00:00:00' }, extra || {}));
  const E = amb.tabelas.CAD_EQUIPAMENTOS;
  E.push({ ID: 'eq4', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', TIPO: 'Câmara fria', MODELO: 'CF1', SERIE: 'S-400', TAG: 'CF-04', SETOR: 'Farmácia', STATUS: 'ATIVO' });
  E.push({ ID: 'eq5', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', TIPO: 'Monitor multiparamétrico', MODELO: 'MM5', SERIE: 'S-500', TAG: 'MM-05', SETOR: 'UTI', STATUS: 'ATIVO' });
  amb.tabelas.DOC_DOCUMENTOS.push({ ID: 'doc1', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq5', TIPO_DOCUMENTO: 'CERTIFICADO DE CALIBRAÇÃO', NOME_ARQUIVO: 'CERT MM-05', DATA_VENCIMENTO: '2026-09-30', STATUS: 'ATIVO' });
  return amb;
}
function agendarAvulsa(amb, extra) {
  return ok(amb.api('s_gil', 'rondaAgendar', Object.assign({ clienteId: 'c1', unidadeId: 'un1', tecnicoId: 'u_tec', inicio: '2026-10-20T09:00', duracaoMin: 180, avisarCliente: false }, extra || {}))).os;
}
const SIM5 = { porta: 'SIM', registro: 'SIM', testes: 'SIM', etiqueta: 'SIM', alarme: 'SIM' };

test('contrato de ronda semanal gera as próximas rondas sozinho, sem duplicar; pausar cancela as futuras; retomar gera de novo; só a gestão salva', () => {
  const amb = ambRonda();
  assert.match(amb.api('s_tiago', 'rondaPlanoSalvar', { clienteId: 'c1', unidadeId: 'un1', periodicidade: 'SEMANAL', inicio: '2026-10-20', hora: '08:00', tecnicoId: 'u_tec' }).message, /gestão da área Técnica/);
  const r = ok(amb.api('s_gil', 'rondaPlanoSalvar', { clienteId: 'c1', unidadeId: 'un1', periodicidade: 'SEMANAL', inicio: '2026-10-20', hora: '08:00', duracaoMin: 180, janelaDias: 2, tecnicoId: 'u_tec', setores: ['CME', 'UTI'], precoRonda: '1.200,00' }));
  const daPlano = () => amb.tabelas.ATEC_OS.filter((o) => o.RONDA_PLANO_ID === r.plano.id);
  const ativas = () => daPlano().filter((o) => o.SITUACAO !== 'CANCELADA');
  assert.equal(r.geradas, 5, r.message);
  jeq(ativas().map((o) => o.RONDA_PREVISTA).sort(), ['2026-10-20', '2026-10-27', '2026-11-03', '2026-11-10', '2026-11-17']);
  assert.equal(new Set(daPlano().map((o) => o.RONDA_CHAVE)).size, 5);
  assert.equal(linhaOs(amb, daPlano()[0].ID).RONDA_PRECO, 1200);
  // de novo (rotina e gerar todos): nada em dobro
  assert.equal(amb.ctx.AstRd_gerarTodos_().geradas, 0);
  amb.ctx.Assistencia_rotina_(new Date(), true);
  assert.equal(ativas().length, 5);
  // filtro de setores do contrato vai para a ronda (Farmácia fora)
  const md = ok(amb.app('Ast_appMeuDia', 's_tiago', { dia: '2026-10-20' }));
  const o = md.os.find((x) => x.tipo.codigo === 'RONDA_EC');
  jeq(o.ronda.setores.map((s) => s.nome), ['CME', 'UTI']);
  // pausar: motivo obrigatório; as futuras (não começadas) são canceladas
  assert.match(amb.api('s_gil', 'rondaPlanoPausar', { id: r.plano.id, motivo: 'curto' }).message, /motivo/);
  ok(amb.api('s_gil', 'rondaPlanoPausar', { id: r.plano.id, motivo: 'Cliente pediu pausa durante a reforma da CME' }));
  assert.equal(ativas().length, 0);
  assert.equal(amb.ctx.AstRd_gerarTodos_().geradas, 0, 'pausado não gera');
  ok(amb.api('s_gil', 'rondaPlanoRetomar', { id: r.plano.id, motivo: 'Reforma concluída, retomar as rondas' }));
  assert.equal(ativas().length, 5);
  assert.equal(amb.ctx.AstRd_gerarTodos_().geradas, 0);
  // a ronda cancelada pela gestão (não pela pausa) não volta a nascer
  const uma = ativas()[0];
  ok(amb.api('s_gil', 'rondaCancelar', { osId: uma.ID, motivo: 'Feriado municipal na unidade' }));
  assert.equal(amb.ctx.AstRd_gerarTodos_().geradas, 0);
  assert.equal(ativas().length, 4);
  ok(amb.api('s_gil', 'rondaPlanoEncerrar', { id: r.plano.id, motivo: 'Contrato terminou em outubro' }));
  assert.equal(ativas().length, 0);
});

test('ronda em campo: chegada antes; situação por equipamento; foto e descrição só no problema; perguntas fixas; cadastro em campo; duas assinaturas; chamado automático e sugestão sem duplicar', () => {
  const amb = ambRonda();
  const os = agendarAvulsa(amb);
  const md = ok(amb.app('Ast_appMeuDia', 's_tiago', { dia: '2026-10-20' }));
  const o = md.os.find((x) => x.id === os.id);
  assert.equal(o.tipo.ronda, true);
  jeq(o.ronda.setores.map((s) => s.nome).sort(), ['CME', 'Farmácia', 'UTI']);
  const eq5 = o.ronda.setores.find((s) => s.nome === 'UTI').equipamentos[0];
  assert.equal(eq5.validade.cal.vencida, true);
  assert.equal(o.ronda.setores.find((s) => s.nome === 'CME').equipamentos.find((e) => e.id === 'eq1').categoria, 'AUTOCLAVE');
  assert.ok(o.ronda.perguntas.FRIO.some((p) => p.tipo === 'NUMERO'));
  assert.equal(md.tipos.some((t) => t.codigo === 'RONDA_EC'), false, 'ronda não se abre em campo');
  // sem chegada: recusado (não definitivo, volta à fila depois do Cheguei)
  let s = ok(sync(amb, [ev('RONDA', os.id, { parte: 'ITEM', chave: 'e:eq1', situacao: 'FUNCIONANDO' })]));
  assert.equal(s.recusados.length, 1); assert.equal(s.recusados[0].definitivo, false);
  s = ok(sync(amb, [ev('CHEGUEI', os.id, {}, '2026-10-20T09:05:00'),
    ev('RONDA', os.id, { parte: 'ITEM', chave: 'e:eq1', setor: 'CME', situacao: 'FUNCIONANDO', respostas: SIM5 }),
    ev('RONDA', os.id, { parte: 'ITEM', chave: 'e:eq2', setor: 'CME', situacao: 'FORA_USO', descricao: 'Vazamento de água pela porta, equipamento parado', respostas: { registro: 'SIM', vazamento: 'NAO', limpeza: 'SIM', etiqueta: 'SIM', alarme: 'SIM' } }),
    ev('RONDA', os.id, { parte: 'ITEM', chave: 'e:eq4', setor: 'Farmácia', situacao: 'FUNCIONANDO', respostas: { temperatura: '5,5', faixa: 'SIM', registro: 'SIM', porta: 'NAO', alarme: 'SIM', etiqueta: 'SIM' } }),
    ev('RONDA', os.id, { parte: 'ITEM', chave: 'e:eq5', setor: 'UTI', situacao: 'NAO_VERIFICADO', motivo: 'Em uso com paciente no leito' })]));
  assert.equal(s.recusados.length, 0, JSON.stringify(s.recusados));
  assert.ok(linhaOs(amb, os.id).RONDA_ESCOPO_JSON, 'escopo congelado no Cheguei');
  let L = amb.ctx.AstRd_linhas_(linhaOs(amb, os.id)).linhas, por = (k) => L.find((l) => l.eq.chave === k);
  jeq(por('e:eq1').faltas, []);
  jeq(por('e:eq2').faltas, ['a foto do problema'], 'defeito exige foto');
  assert.match(por('e:eq4').faltas.join(' '), /ficou "Não"/, 'Não numa verificação não fica "Em funcionamento"');
  jeq(por('e:eq5').faltas, []);
  assert.equal(amb.ctx.AstO_respostas_ ? JSON.parse(linhaOs(amb, os.id).RONDA_JSON).itens['e:eq4'].respostas.temperatura : 0, 5.5);
  // número inválido: recusado com o motivo
  s = ok(sync(amb, [ev('RONDA', os.id, { parte: 'ITEM', chave: 'e:eq4', respostas: { temperatura: 'muito frio' } })]));
  assert.equal(s.recusados.length, 1); assert.match(s.recusados[0].motivo, /número/);
  // correção: com observação + descrição + foto; merge mantém as respostas
  ok(amb.app('Ast_appEnviarFoto', 's_tiago', { osId: os.id, idLocal: 'foto-ronda-eq2', nome: 'eq2.jpg', base64: FOTO, perguntaId: 'ronda:e:eq2', legenda: 'Vazamento', em: '2026-10-20T09:20:00' }));
  ok(amb.app('Ast_appEnviarFoto', 's_tiago', { osId: os.id, idLocal: 'foto-ronda-eq4', nome: 'eq4.jpg', base64: FOTO, perguntaId: 'ronda:e:eq4', legenda: 'Guarnição', em: '2026-10-20T09:21:00' }));
  s = ok(sync(amb, [ev('RONDA', os.id, { parte: 'ITEM', chave: 'e:eq4', situacao: 'OBSERVACAO', descricao: 'Guarnição da porta ressecada, fecha com folga' })]));
  assert.equal(s.recusados.length, 0);
  assert.equal(amb.tabelas.ATEC_FOTOS.find((f) => f.ID_LOCAL === 'foto-ronda-eq2').PERGUNTA_ID, 'ronda:e:eq2');
  assert.equal(JSON.parse(linhaOs(amb, os.id).RONDA_JSON).itens['e:eq4'].respostas.porta, 'NAO');
  // equipamento fora do cadastro, cadastrado em campo (id provisório resolvido pelo servidor)
  const cad = ok(amb.app('Ast_appCadastrar', 's_tiago', { idLocal: 'cad-ronda-0001', tipo: 'EQUIPAMENTO', dados: { clienteId: 'c1', unidadeId: 'un1', tipo: 'Seladora', modelo: 'SL9', serie: 'S-900', setor: 'CME' } }));
  s = ok(sync(amb, [ev('RONDA', os.id, { parte: 'ITEM', chave: 'n:cad-ronda-0001', equipamentoId: 'cad-ronda-0001', setor: 'CME', situacao: 'FUNCIONANDO', ident: { tipo: 'Seladora', modelo: 'SL9', serie: 'S-900' }, respostas: { temperatura: 'SIM', teste: 'SIM', barra: 'SIM', etiqueta: 'NAO' } }),
    ev('RONDA', os.id, { parte: 'SETOR', setor: 'Expurgo', novo: true, achados: 'Pia sem sabonete' }), ev('RONDA', os.id, { parte: 'ORIENTACOES', orientacoes: 'Orientado registrar o ciclo da autoclave a cada carga', pedidosCliente: 'Cliente pediu revisão da câmara fria' })]));
  assert.equal(s.recusados.length, 0, JSON.stringify(s.recusados));
  const itNovo = JSON.parse(linhaOs(amb, os.id).RONDA_JSON).itens['n:cad-ronda-0001'];
  assert.equal(itNovo.equipamentoId, cad.id);
  L = amb.ctx.AstRd_linhas_(linhaOs(amb, os.id)).linhas;
  assert.match(L.find((l) => l.eq.chave === 'n:cad-ronda-0001').faltas.join(' '), /ficou "Não"/, 'etiqueta "Não" com Em funcionamento');
  ok(sync(amb, [ev('RONDA', os.id, { parte: 'ITEM', chave: 'n:cad-ronda-0001', situacao: 'OBSERVACAO', descricao: 'Etiqueta de calibração vencida desde agosto' })]));
  ok(amb.app('Ast_appEnviarFoto', 's_tiago', { osId: os.id, idLocal: 'foto-ronda-novo', nome: 'sl.jpg', base64: FOTO, perguntaId: 'ronda:n:cad-ronda-0001', em: '2026-10-20T09:30:00' }));
  // faltam só as assinaturas
  let faltas = amb.ctx.AstO_faltas_(linhaOs(amb, os.id));
  jeq(faltas.map((f) => f.replace(/ \(.*$/, '')), ['a assinatura do cliente', 'a assinatura do técnico que atendeu'], faltas.join(' | '));
  const conc = [ev('ASSINATURA', os.id, { nome: 'Rui Responsável Teste', imagem: ASSINATURA, versaoApp: 't' }), ev('ASSINATURA', os.id, { papel: 'COLABORADOR', nome: 'Tiago Tecnico Teste', imagem: ASSINATURA, versaoApp: 't' }), ev('CONCLUI', os.id, {}, '2026-10-20T11:00:00')];
  s = ok(sync(amb, conc));
  assert.equal(s.os[0].situacao, 'ENCERRADA', JSON.stringify(s.os[0].pendencias));
  const fim = linhaOs(amb, os.id);
  assert.ok(fim.RONDA_POS_EM);
  // chamado automático: um por equipamento fora de uso, canal RONDA, ligado à ronda
  const chs = () => amb.tabelas.ATEC_CHAMADOS.filter((c) => /^RONDA:/.test(c.ORIGEM_REF));
  assert.equal(chs().length, 1);
  assert.equal(chs()[0].EQUIPAMENTO_ID, 'eq2'); assert.equal(chs()[0].CANAL, 'RONDA'); assert.match(chs()[0].SINTOMA, /Vazamento/);
  // reenvio (mesmos idLocal) e pós-processamento de novo: nada em dobro
  s = ok(sync(amb, conc));
  assert.ok(s.aceitos.every((a) => a.duplicado));
  amb.ctx.AstRd_posConclusao_(amb.ctx.Ast_sistema_(), os.id);
  amb.tabelas.ATEC_OS.find((x) => x.ID === os.id).RONDA_POS_EM = '';
  amb.ctx.Ast_memoLimpar_();
  amb.ctx.AstRd_posConclusao_(amb.ctx.Ast_sistema_(), os.id);
  assert.equal(chs().length, 1, 'idempotente pelo ORIGEM_REF');
  // sugestão ao Comercial: uma por ronda, sem orçamento
  const sug = amb.tabelas.COM_IA_SUGESTOES.filter((x) => x.TIPO === 'RONDA_OPORTUNIDADE');
  assert.equal(sug.length, 1);
  const cont = JSON.parse(sug[0].CONTEUDO_JSON);
  jeq(cont.itens.map((i) => i.chave).sort(), ['e:eq5', 'n:cad-ronda-0001']);
  assert.equal((amb.tabelas.ATEC_ORCAMENTOS || []).length, 0);
  assert.ok(amb.tabelas.ATEC_AVISOS.some((a) => a.TIPO === 'RONDA_CONCLUIDA' && a.DESTINATARIO_ID === 'u_gt'));
  assert.ok(amb.tabelas.ATEC_SETORES.some((x) => x.NOME === 'Expurgo'), 'setor acrescentado em campo vira cadastro');
  // relatório em duas versões
  assert.ok(fim.RELATORIO_PDF_ID && fim.RONDA_INTERNO_PDF_ID && fim.RELATORIO_PDF_ID !== fim.RONDA_INTERNO_PDF_ID);
  const hs = htmlDe(amb, /Relatorio de ronda/);
  const cli = hs.find((h) => /versão do cliente/.test(h)), int = hs.find((h) => /uso interno da Metrolabs/.test(h));
  assert.ok(cli && int);
  for (const h of [cli, int]) { assert.match(h, /Setor: CME/); assert.match(h, /Achados e recomendações/); assert.match(h, /RDC 509\/2021/); assert.match(h, new RegExp(chs()[0].NUMERO)); }
  assert.doesNotMatch(cli, /Sugestão ao Comercial|Linha do tempo|1\.200/);
  assert.match(int, /Sugestão ao Comercial/);
  // descartar: Comercial com motivo; técnico não decide
  assert.match(amb.api('s_tiago', 'rondaSugestaoDecidir', { id: sug[0].ID, decisao: 'DESCARTAR', motivo: 'motivo qualquer longo' }).message, /Comercial ou pela Diretoria/);
  ok(amb.api('s_vera', 'rondaSugestaoDecidir', { id: sug[0].ID, decisao: 'DESCARTAR', motivo: 'Cliente calibra com outro laboratório até 2027' }));
  assert.equal(amb.tabelas.COM_IA_SUGESTOES.find((x) => x.ID === sug[0].ID).DECISAO, 'DESCARTADA');
  // comparação com a ronda anterior na segunda ronda
  const os2 = agendarAvulsa(amb, { inicio: '2026-10-27T09:00' });
  amb.mudar('2026-10-27T09:00:00-03:00');
  ok(sync(amb, [ev('CHEGUEI', os2.id, {}, '2026-10-27T09:01:00'), ev('RONDA', os2.id, { parte: 'ITEM', chave: 'e:eq2', situacao: 'FUNCIONANDO', respostas: { registro: 'SIM', vazamento: 'SIM', limpeza: 'SIM', etiqueta: 'SIM', alarme: 'SIM' } }, '2026-10-27T09:05:00')]));
  const cmp = amb.ctx.AstRd_comparacao_(linhaOs(amb, os2.id), amb.ctx.AstRd_linhas_(linhaOs(amb, os2.id)).linhas);
  assert.equal(cmp.numero, os.numero);
  assert.ok(cmp.melhorou.some((x) => /LV-02/.test(x.texto)));
  // indicadores
  const ind = ok(amb.api('s_gil', 'rondaIndicadores', { dias: 90 })).indicadores;
  const pc = ind.porCliente.find((x) => x.cliente === 'Hospital Teste Alfa');
  assert.equal(pc.programadas, 2); assert.equal(pc.realizadas, 1);
  assert.ok(ind.problemasPorSetor.some((x) => x.setor === 'CME' && x.foraUso === 1));
  assert.equal(ind.achadoSolucao.pendentes, 1);
});

test('permissão: só o técnico responsável (técnico ou engenheiro) ou a gestão registra a ronda; colaborador de outra área não; ronda não nasce de chamado', () => {
  const amb = ambRonda();
  const os = agendarAvulsa(amb);
  assert.match(amb.api('s_vera', 'rondaAgendar', { clienteId: 'c1', unidadeId: 'un1', tecnicoId: 'u_tec', inicio: '2026-10-20T09:00' }).message, /gestão da área Técnica/);
  assert.match(amb.api('s_gil', 'rondaAgendar', { clienteId: 'c1', unidadeId: 'un1', tecnicoId: 'u_ven', inicio: '2026-10-20T09:00' }).message, /técnico ou engenheiro/);
  let s = ok(sync(amb, [ev('CHEGUEI', os.id, {})], 's_tales'));
  assert.equal(s.recusados[0].definitivo, true);
  // mesmo se a O.S. fosse passada a quem não é técnico, o evento RONDA é recusado
  const linha = linhaOs(amb, os.id); linha.TECNICO_ID = 'u_ven'; linha.TECNICO_NOME = 'VERA'; linha.SITUACAO = 'NO_LOCAL'; linha.CHEGOU_EM = '2026-10-20T09:00:00';
  s = ok(sync(amb, [ev('RONDA', os.id, { parte: 'ITEM', chave: 'e:eq1', situacao: 'FUNCIONANDO' })], 's_vera'));
  assert.equal(s.recusados.length, 1); assert.match(s.recusados[0].motivo, /técnico ou engenheiro/);
  assert.equal(s.recusados[0].definitivo, true);
  // a gestão registra em nome do técnico
  linha.TECNICO_ID = 'u_tec';
  s = ok(sync(amb, [ev('RONDA', os.id, { parte: 'ITEM', chave: 'e:eq1', situacao: 'FUNCIONANDO', respostas: SIM5 })], 's_gil'));
  assert.equal(s.recusados.length, 0, JSON.stringify(s.recusados));
  // o tipo da ronda não aparece no chamado e o agendamento do chamado recusa
  const ini = ok(amb.api('s_gil', 'iniciar', {}));
  assert.equal(ini.tipos.some((t) => t.codigo === 'RONDA_EC'), false);
});

test('isolamento do cliente: portal mostra só as rondas dele e só a versão do cliente; a versão interna nunca abre para login de cliente', () => {
  const amb = ambRonda({ extras: ['SGO_Comercial_Config.js', 'SGO_Representacao_Config.js', 'SGO_Representacao.js', 'SGO_Representacao_Documentos.js'].filter((f) => require('node:fs').existsSync(require('node:path').join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db', f))) });
  const os = agendarAvulsa(amb);
  ok(sync(amb, [ev('CHEGUEI', os.id, {}), ev('RONDA', os.id, { parte: 'ITEM', chave: 'e:eq1', situacao: 'FUNCIONANDO', respostas: SIM5 }), ev('RONDA', os.id, { parte: 'ITEM', chave: 'e:eq2', situacao: 'NAO_LOCALIZADO' }),
    ev('RONDA', os.id, { parte: 'ITEM', chave: 'e:eq4', situacao: 'NAO_VERIFICADO', motivo: 'Setor fechado' }), ev('RONDA', os.id, { parte: 'ITEM', chave: 'e:eq5', situacao: 'NAO_VERIFICADO', motivo: 'Em uso' }),
    ev('ASSINATURA', os.id, { nome: 'Rui Responsável Teste', imagem: ASSINATURA, versaoApp: 't' }), ev('ASSINATURA', os.id, { papel: 'COLABORADOR', nome: 'Tiago Tecnico Teste', imagem: ASSINATURA, versaoApp: 't' }), ev('CONCLUI', os.id, {}, '2026-10-20T10:00:00')]));
  const fim = linhaOs(amb, os.id);
  assert.equal(fim.SITUACAO, 'ENCERRADA');
  const p = ok(amb.api('s_cliente.alfa', 'portal', {}));
  assert.equal(p.rondas.length, 1); assert.equal(p.rondas[0].url, fim.RELATORIO_PDF_URL);
  assert.ok(!JSON.stringify(p).includes(fim.RONDA_INTERNO_PDF_ID), 'versão interna nunca vai ao portal');
  assert.equal(p.relatorios.some((r) => r.numero === os.numero), false);
  assert.equal(ok(amb.api('s_cliente.beta', 'portal', {})).rondas.length, 0);
  const perm = amb.ctx.AstRd_arquivoClientePermitido_;
  assert.equal(perm('s_cliente.alfa', fim.RONDA_INTERNO_PDF_ID), false);
  assert.equal(perm('s_cliente.alfa', fim.RELATORIO_PDF_ID), true);
  assert.equal(perm('s_cliente.beta', fim.RELATORIO_PDF_ID), false);
  assert.equal(perm('s_cliente.alfa', 'outro-arquivo'), null);
  if (typeof amb.ctx.Representacao_arquivoClientePermitido_ === 'function') assert.equal(amb.ctx.Representacao_arquivoClientePermitido_('s_cliente.alfa', fim.RONDA_INTERNO_HTML_ID), false);
  // ação interna da ronda: cliente fora
  assert.match(amb.api('s_cliente.alfa', 'rondaTela', {}).message, /equipe interna/);
});

test('cobrança preparada: o item RONDA-EC entra no catálogo uma vez só, inativo até a Diretoria definir o preço', () => {
  const amb = ambRonda();
  amb.tabelas.COM_PRODUTOS = [];
  ok(amb.api('s_gil', 'rondaPlanoSalvar', { clienteId: 'c1', unidadeId: 'un1', periodicidade: 'MENSAL', inicio: '2026-10-31', hora: '08:00', tecnicoId: 'u_tec' }));
  ok(amb.api('s_gil', 'rondaPlanoSalvar', { clienteId: 'c2', unidadeId: 'un2', periodicidade: 'QUINZENAL', inicio: '2026-10-21', hora: '13:30', tecnicoId: 'u_tec2' }));
  const it = amb.tabelas.COM_PRODUTOS.filter((p) => p.CODIGO === 'RONDA-EC');
  assert.equal(it.length, 1); assert.equal(it[0].ATIVO, 'NAO'); assert.equal(it[0].REGRA_PRECO, 'FIXO');
  // mensal no dia 31: novembro cai no dia 30
  assert.ok(amb.ctx.AstRd_datasPrevistas_({ INICIO: '2026-10-31', PERIODICIDADE: 'MENSAL' }, '2026-10-01', '2026-12-31').includes('2026-11-30'));
});

test('sugestão aceita pelo Comercial cria a oportunidade (origem "Vencimento de calibração ou qualificação") e não decide duas vezes', () => {
  const amb = ambRonda();
  const os = agendarAvulsa(amb);
  ok(sync(amb, [ev('CHEGUEI', os.id, {}), ev('RONDA', os.id, { parte: 'ITEM', chave: 'e:eq5', situacao: 'NAO_VERIFICADO', motivo: 'Em uso com paciente' })]));
  const linha = linhaOs(amb, os.id); linha.SITUACAO = 'ENCERRADA';
  amb.ctx.Ast_memoLimpar_();
  amb.ctx.AstRd_posConclusao_(amb.ctx.Ast_sistema_(), os.id);
  const sg = amb.tabelas.COM_IA_SUGESTOES.find((x) => x.TIPO === 'RONDA_OPORTUNIDADE');
  let recebido = null;
  amb.ctx.Com_eu_ = (sid) => ({ id: 'u_ven', nome: 'VERA', vendedor: true });
  amb.ctx.ComOpo_salvar_ = (eu, sid, d) => { recebido = d; return { oportunidade: { id: 'op1', codigo: 'OPO-2026-0001' }, message: 'Oportunidade OPO-2026-0001 criada.' }; };
  const r = ok(amb.api('s_vera', 'rondaSugestaoDecidir', { id: sg.ID, decisao: 'ACEITAR', contatoId: 'k1', valor: '900,00', proximaData: '2026-10-21' }));
  assert.match(r.message, /OPO-2026-0001/);
  assert.equal(recebido.origem, 'Vencimento de calibração ou qualificação'); assert.equal(recebido.funil, 'ENGENHARIA');
  assert.deepEqual(Array.from(recebido.equipamentos), ['eq5']);
  assert.equal(amb.tabelas.COM_IA_SUGESTOES.find((x) => x.ID === sg.ID).DECISAO, 'ACEITA');
  assert.match(amb.api('s_vera', 'rondaSugestaoDecidir', { id: sg.ID, decisao: 'DESCARTAR', motivo: 'mudou de ideia agora mesmo' }).message, /já foi aceita/);
});
