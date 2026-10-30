// Documentos A4 da Representação (29/10/2026): relatório do atendimento e do período em três versões (representada,
// cliente, Metrolabs), filtradas pelo público; gravação em HTML + PDF, registro com o público que pode abrir, liberação das
// fotos e a trava da rota /arquivos para a representada. Código real do SGO+ (tests/_assistencia_ambiente.cjs). Só dados fictícios.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, ok, em } = require('./_assistencia_ambiente.cjs');

const EXTRAS = ['SGO_CadastroQualidade.js', 'SGO_Clientes.js', 'SGO_Representacao_Config.js', 'SGO_Representacao.js', 'SGO_Representacao_Avisos.js', 'SGO_Representacao_Painel.js',
  'SGO_Gantt_Layout.js', 'SGO_Representacao_Documentos.js'];
const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');

function amb() {
  const a = ambiente({ extras: EXTRAS });
  a.tabelas.REP_REPRESENTADAS = [
    { ID: 'repA', NOME: 'REPRESENTADA ALFA TESTE', SITUACAO: 'ATIVA', PRAZOS_JSON: '' },
    { ID: 'repB', NOME: 'REPRESENTADA BETA TESTE', SITUACAO: 'ATIVA', PRAZOS_JSON: '' }
  ];
  const us = [
    { ID: 'ra_adm', USUARIO: 'ana.alfa', NOME: 'ANA ALFA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'ana@alfa.exemplo.test', REPRESENTADA_ID: 'repA', REPRESENTACAO_PAPEL: 'ADMIN' },
    { ID: 'rb_at', USUARIO: 'beto.beta', NOME: 'BETO BETA TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'beto@beta.exemplo.test', REPRESENTADA_ID: 'repB', REPRESENTACAO_PAPEL: 'ATENDENTE' }
  ];
  us.forEach((u) => { a.tabelas.CAD_USUARIOS.push(u); a.sessoes['s_' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: 'REPRESENTADA', representadaId: u.REPRESENTADA_ID }; });
  a.rep = (sid, acao, d) => a.ctx.Representacao_api(sid, acao, d || {});
  a.html = (id) => a.arquivos[id].bytes.toString('utf8');
  return a;
}
function arquivoImagem(a, nome) { return a.ctx.DriveApp.getRootFolder().createFile(a.ctx.Utilities.newBlob(Array.from(PNG), 'image/png', nome)).getId(); }

/**
 * Chamado da representada B para o Hospital Teste Alfa (c1, o cliente do portal "cliente.alfa"), encerrado com O.S., três fotos
 * (uma liberada ao cliente, uma só à representada, uma não liberada), nota interna, mensagem pública e eventos dos três públicos.
 */
function encerrado(a) {
  ok(a.rep('s_beto.beta', 'buscarCliente', { documento: '11.222.333/0001-81' }));
  ok(a.rep('s_beto.beta', 'buscarEquipamento', { clienteId: 'c1', serie: 'S-100' }));
  const p = ok(a.rep('s_beto.beta', 'abrir', { clienteId: 'c1', unidadeId: 'un1', equipamentoId: 'eq1', protocolo: 'BM-777', setor: 'CME', contatoNome: 'Rui Responsável Teste', contatoTelefone: '62988887777',
    contatoEmail: 'rui@alfa.exemplo.test', sintoma: 'A autoclave interrompe o ciclo com alarme de baixa pressão de vapor.', inicio: 'ontem', codigoErro: 'E12', parada: 'TOTAL', risco: 'Sem esterilização', tentado: 'Religamos', enquadramento: 'GARANTIA',
    fotos: [{ nome: 'abertura.png', tipo: 'image/png', base64: PNG.toString('base64') }], fotosEtiqueta: [{ nome: 'etiqueta.png', tipo: 'image/png', base64: PNG.toString('base64') }] })).solicitacao;
  a.mudar('2026-10-19T11:00:00-03:00');
  const c = ok(a.rep('s_gil', 'aceitar', { solicitacaoId: p.id, prioridade: 'P2' })).chamado;
  ok(a.rep('s_gil', 'enviarMensagem', { refTipo: 'CHAMADO', refId: c.id, texto: 'NOTA INTERNA SIGILOSA: conferir o contrato antes de trocar a válvula.', interna: true }));
  ok(a.rep('s_gil', 'enviarMensagem', { refTipo: 'CHAMADO', refId: c.id, texto: 'MENSAGEM PUBLICA: visita confirmada para amanhã cedo.' }));
  const os = a.ctx.SGO_DATA.insert('ATEC_OS', { NUMERO: 'OS-2026-0900', CHAMADO_ID: c.id, CHAMADO_NUMERO: c.numero, SITUACAO: 'ENCERRADA', TIPO_NOME: 'Manutenção corretiva', CLIENTE_ID: 'c1', CLIENTE_NOME: 'HOSPITAL TESTE ALFA LTDA',
    UNIDADE_ID: 'un1', EQUIPAMENTO_ID: 'eq1', TECNICO_ID: 'u_tec', TECNICO_NOME: 'TIAGO TECNICO TESTE', AGENDADO_PARA: '2026-10-20T09:00:00', SAIU_EM: '2026-10-20T08:20:00', CHEGOU_EM: '2026-10-20T09:05:00',
    CONCLUIU_EM: '2026-10-20T11:00:00', ENCERRADA_EM: '2026-10-20T11:30:00', CONDICAO_ENCONTRADA: 'Válvula de vapor com vazamento.', CAUSA: 'Vedação ressecada.', SERVICO_REALIZADO: 'Troca da vedação e teste de três ciclos.',
    TESTE_FUNCIONAL: 'Três ciclos completos sem alarme.', RECOMENDACOES: 'Inspecionar a vedação a cada seis meses.', RELATO: 'RELATO INTERNO DO TECNICO: cliente pediu desconto.', ASSINATURA_NOME: 'Rui Responsável Teste', ASSINATURA_EM: '2026-10-20T11:05:00' });
  a.ctx.SGO_DATA.update('ATEC_CHAMADOS', c.id, { SITUACAO: 'ENCERRADO', OS_ID: os.ID, OS_NUMERO: os.NUMERO, TECNICO_ID: 'u_tec', TECNICO_NOME: 'TIAGO TECNICO TESTE', AGENDADO_PARA: '2026-10-20T09:00:00',
    ATENDIDO_EM: '2026-10-20T11:00:00', ENCERRADO_EM: '2026-10-20T11:30:00' });
  const foto = (legenda, publico) => a.ctx.SGO_DATA.insert('ATEC_FOTOS', { OS_ID: os.ID, LEGENDA: legenda, NOME: legenda + '.png', ARQUIVO_ID: arquivoImagem(a, legenda + '.png'), TIRADA_EM: '2026-10-20T10:00:00', POR_NOME: 'TIAGO TECNICO TESTE', ATIVA: 'SIM', PUBLICO: publico });
  const fCli = foto('FOTO LIBERADA AO CLIENTE', 'SIM'), fRep = foto('FOTO SO DA REPRESENTADA', 'REPRESENTADA'), fNao = foto('FOTO NAO LIBERADA', '');
  const ev = (texto, publico) => a.ctx.SGO_DATA.insert('ATEC_EVENTOS', { ENTIDADE: 'CHAMADO', ENTIDADE_ID: c.id, NUMERO: c.numero, TIPO: 'OBSERVACAO', TEXTO: texto, PUBLICO: publico, USUARIO_ID: 'u_gt', USUARIO_NOME: 'GIL GESTOR TECNICO TESTE', EM: '2026-10-20T08:00:00' });
  ev('EVENTO PUBLICO DO CLIENTE: visita confirmada', 'SIM'); ev('EVENTO DA REPRESENTADA: garantia conferida', 'REPRESENTADA'); ev('EVENTO INTERNO SIGILOSO: técnico remanejado', '');
  a.mudar('2026-10-21T10:00:00-03:00');
  a.ctx.Ast_memoLimpar_(); a.ctx.Rep_memoLimpar_();
  return { p, c, os, fCli, fRep, fNao };
}
const NUNCA_EXTERNO = ['NOTA INTERNA SIGILOSA', 'EVENTO INTERNO SIGILOSO', 'FOTO NAO LIBERADA', 'RELATO INTERNO DO TECNICO', 'Prazos e SLA', 'Notas internas', 'Histórico do equipamento', 'REPRESENTADA ALFA TESTE'];

test('relatório do atendimento: cada versão só traz o que o público pode ler (nota interna e foto não liberada nunca saem para fora)', () => {
  const a = amb(), k = encerrado(a);
  // representada
  const r = ok(a.rep('s_beto.beta', 'relatorioAtendimento', { id: k.c.id }));
  assert.equal(r.documento.publico, 'REPRESENTADA'); assert.equal(r.documento.versao, 1); assert.match(r.documento.htmlUrl, /^\/arquivos\//); assert.match(r.documento.pdfUrl, /^\/arquivos\//);
  const hr = a.html(r.documento.htmlUrl.split('/').pop());
  for (const s of NUNCA_EXTERNO) assert.ok(!hr.includes(s), 'representada viu: ' + s);
  for (const s of ['FOTO LIBERADA AO CLIENTE', 'FOTO SO DA REPRESENTADA', 'MENSAGEM PUBLICA', 'EVENTO PUBLICO DO CLIENTE', 'EVENTO DA REPRESENTADA', 'BM-777', 'Marcos: previsto e realizado', 'Linha do tempo', 'Sumário', 'Troca da vedação', 'class="capa"'])
    assert.ok(hr.includes(s), 'faltou na versão da representada: ' + s);
  // cliente do portal (Assistencia_api)
  const cl = ok(a.api('s_cliente.alfa', 'relatorioAtendimento', { id: k.c.id }));
  assert.equal(cl.documento.publico, 'CLIENTE');
  const hc = a.html(cl.documento.htmlUrl.split('/').pop());
  for (const s of NUNCA_EXTERNO.concat(['REPRESENTADA BETA TESTE', 'BETO BETA', 'MENSAGEM PUBLICA', 'FOTO SO DA REPRESENTADA', 'EVENTO DA REPRESENTADA', 'BM-777', 'Conversa do chamado', 'Marcos: previsto', 'GIL GESTOR', '<th>Garantia</th>', 'Enquadramento pretendido']))
    assert.ok(!hc.includes(s), 'cliente viu: ' + s);
  for (const s of ['FOTO LIBERADA AO CLIENTE', 'EVENTO PUBLICO DO CLIENTE', 'Etapas do atendimento', 'Inspecionar a vedação', 'TIAGO TECNICO TESTE']) assert.ok(hc.includes(s), 'faltou na versão do cliente: ' + s);
  // Metrolabs: tudo
  const mi = ok(a.rep('s_gil', 'relatorioAtendimento', { id: k.c.id }));
  assert.equal(mi.documento.publico, 'INTERNO');
  const hm = a.html(mi.documento.htmlUrl.split('/').pop());
  for (const s of ['NOTA INTERNA SIGILOSA', 'EVENTO INTERNO SIGILOSO', 'FOTO NAO LIBERADA', 'RELATO INTERNO DO TECNICO', 'Prazos e SLA', 'Primeiro contato', 'Deslocamento', 'Histórico do equipamento', 'MENSAGEM PUBLICA', 'Uso interno'])
    assert.ok(hm.includes(s), 'faltou na versão interna: ' + s);
  // segunda emissão: versão nova, revisão 01 no cabeçalho, nada sobrescrito
  const r2 = ok(a.rep('s_beto.beta', 'relatorioAtendimento', { id: k.c.id }));
  assert.equal(r2.documento.versao, 2); assert.notEqual(r2.documento.htmlUrl, r.documento.htmlUrl);
  assert.ok(a.html(r2.documento.htmlUrl.split('/').pop()).includes('Revisão 01'));
  // evento do chamado registra a emissão
  assert.ok(a.tabelas.ATEC_EVENTOS.some((e) => e.TIPO === 'RELATORIO_ATENDIMENTO' && e.ENTIDADE_ID === k.c.id));
});

test('documento salvo e registrado com o público certo; representada e cliente só listam e abrem os deles', () => {
  const a = amb(), k = encerrado(a);
  const dr = ok(a.rep('s_beto.beta', 'relatorioAtendimento', { id: k.c.id })).documento;
  const dc = ok(a.api('s_cliente.alfa', 'relatorioAtendimento', { id: k.c.id })).documento;
  const dm = ok(a.rep('s_gil', 'relatorioAtendimento', { id: k.c.id, publico: 'INTERNO' })).documento;
  const reg = a.tabelas.REP_DOCUMENTOS;
  assert.equal(reg.length, 3);
  assert.deepEqual(reg.map((r) => r.PUBLICO).sort(), ['CLIENTE', 'INTERNO', 'REPRESENTADA']);
  for (const r of reg) { assert.equal(r.REPRESENTADA_ID, 'repB'); assert.equal(r.CLIENTE_ID, 'c1'); assert.equal(r.CHAMADO_ID, k.c.id); assert.ok(r.HTML_ID && r.PDF_ID); }
  assert.equal(reg.find((r) => r.PUBLICO === 'REPRESENTADA').GERADO_POR_LADO, 'REPRESENTADA');
  assert.equal(reg.find((r) => r.PUBLICO === 'CLIENTE').GERADO_POR_LADO, 'CLIENTE');
  // só a versão do cliente entra no Arquivo de documentos (o portal do cliente lista DOC_DOCUMENTOS pelo CLIENTE_ID)
  assert.equal(a.tabelas.DOC_DOCUMENTOS.length, 1);
  assert.equal(a.tabelas.DOC_DOCUMENTOS[0].TIPO_DOCUMENTO, 'RELATÓRIO DE ATENDIMENTO'); assert.equal(a.tabelas.DOC_DOCUMENTOS[0].CLIENTE_ID, 'c1');
  // arquivos privados (sem link público)
  for (const r of reg) assert.notEqual(a.arquivos[r.HTML_ID].compartilhado, 'ANYONE_WITH_LINK');
  // listas
  assert.deepEqual(ok(a.rep('s_beto.beta', 'documentos', {})).documentos.map((d) => d.id), [dr.id]);
  assert.deepEqual(ok(a.rep('s_ana.alfa', 'documentos', {})).documentos, []);
  assert.equal(a.rep('s_ana.alfa', 'documentos', { chamadoId: k.c.id }).ok, false);
  assert.deepEqual(ok(a.api('s_cliente.alfa', 'documentosGerados', {})).documentos.map((d) => d.id), [dc.id]);
  assert.deepEqual(ok(a.api('s_cliente.beta', 'documentosGerados', {})).documentos, []);
  assert.equal(ok(a.rep('s_gil', 'documentos', { chamadoId: k.c.id })).documentos.length, 3);
  // técnico que não acompanha o chamado não lista os documentos dele
  assert.equal(ok(a.api('s_tales', 'documentosGerados', { chamadoId: k.c.id })).documentos.length, 0);
  // rota /arquivos: a representada abre só a versão dela, da representada dela
  const idDe = (d) => d.htmlUrl.split('/').pop();
  assert.equal(a.ctx.Representacao_arquivoPermitido_('s_beto.beta', idDe(dr)), true);
  assert.equal(a.ctx.Representacao_arquivoPermitido_('s_beto.beta', dr.pdfUrl.split('/').pop()), true);
  assert.equal(a.ctx.Representacao_arquivoPermitido_('s_beto.beta', idDe(dm)), false);
  assert.equal(a.ctx.Representacao_arquivoPermitido_('s_beto.beta', idDe(dc)), false);
  assert.equal(a.ctx.Representacao_arquivoPermitido_('s_ana.alfa', idDe(dr)), false);
  // quem não é dono não gera
  assert.equal(a.rep('s_ana.alfa', 'relatorioAtendimento', { id: k.c.id }).ok, false);
  assert.equal(a.api('s_cliente.beta', 'relatorioAtendimento', { id: k.c.id }).ok, false);
  assert.equal(a.rep('s_beto.beta', 'relatorioAtendimento', { tipo: 'SOLICITACAO', id: k.p.id }).ok, false);
});

test('liberação da foto: só a gestão (ou responsável pela representação); cópia reduzida usada no A4; recolher tira das versões externas', () => {
  const a = amb(), k = encerrado(a);
  const f = ok(a.rep('s_gil', 'fotosChamado', { id: k.c.id }));
  assert.equal(f.fotos.length, 3); assert.equal(f.podeLiberar, true); assert.equal(f.temRepresentada, true);
  const naoLib = f.fotos.find((x) => x.id === k.fNao.ID); assert.equal(naoLib.publico, '');
  assert.equal(a.api('s_tiago', 'liberarFoto', { fotoId: k.fNao.ID, publico: 'SIM' }).ok, false);
  assert.equal(a.api('s_cliente.alfa', 'liberarFoto', { fotoId: k.fNao.ID, publico: 'SIM' }).ok, false);
  assert.equal(a.api('s_gil', 'liberarFoto', { fotoId: k.fNao.ID, publico: 'QUALQUER' }).ok, false);
  ok(a.api('s_gil', 'liberarFoto', { fotoId: k.fNao.ID, publico: 'SIM', reduzida: { base64: PNG.toString('base64'), tipo: 'image/jpeg' } }));
  const lib = a.tabelas.ATEC_FOTOS.find((x) => x.ID === k.fNao.ID);
  assert.equal(lib.PUBLICO, 'SIM'); assert.ok(lib.RELATORIO_ARQUIVO_ID); assert.equal(lib.LIBERADA_POR_NOME, 'GIL GESTOR TECNICO TESTE');
  ok(a.api('s_gil', 'liberarFoto', { fotoId: k.fCli.ID, publico: '' })); // recolhida
  a.ctx.Ast_memoLimpar_();
  const hc = a.html(ok(a.api('s_cliente.alfa', 'relatorioAtendimento', { id: k.c.id })).documento.htmlUrl.split('/').pop());
  assert.ok(hc.includes('FOTO NAO LIBERADA')); assert.ok(!hc.includes('FOTO LIBERADA AO CLIENTE'));
  // foto grande sem cópia reduzida fica de fora com o aviso (A4 leve)
  a.arquivos[a.tabelas.ATEC_FOTOS.find((x) => x.ID === k.fRep.ID).ARQUIVO_ID].bytes = Buffer.alloc(600 * 1024, 1);
  const hr = a.html(ok(a.rep('s_beto.beta', 'relatorioAtendimento', { id: k.c.id })).documento.htmlUrl.split('/').pop());
  assert.ok(!hr.includes('FOTO SO DA REPRESENTADA — ')); assert.match(hr, /grande\(s\) demais para o A4/);
});

test('relatório do período nas três versões: índices do painel, gráficos, Gantt impresso; cada um só com a carteira dele', () => {
  const a = amb(), k = encerrado(a);
  // um pedido da outra representada (isolamento)
  a.ctx.SGO_DATA.insert('ATEC_SOLICITACOES', { NUMERO: 'SOL-2026-0999', ORIGEM: 'REPRESENTACAO', CLIENTE_ID: 'c2', CLIENTE_NOME: 'CLINICA TESTE BETA', UNIDADE_ID: 'un2', EQUIPAMENTO_ID: 'eq3', DESCRICAO: 'PEDIDO DA OUTRA', SITUACAO: 'NOVA',
    REPRESENTADA_ID: 'repA', REPRESENTADA_NOME: 'REPRESENTADA ALFA TESTE', CRIADO_EM: '2026-10-21T09:00:00', PAUSA_MIN: 0 });
  a.ctx.Ast_memoLimpar_();
  const r = ok(a.rep('s_beto.beta', 'relatorioPeriodo', { dias: 30 })).documento;
  assert.equal(r.tipo, 'PERIODO'); assert.equal(r.publico, 'REPRESENTADA');
  const hr = a.html(r.htmlUrl.split('/').pop());
  for (const s of ['Gantt da carteira', 'Prazo cumprido no período', 'Tempos médios', 'Reincidência por modelo', 'Garantia pelo cadastro', k.c.numero, 'Sumário', 'pg-paisagem']) assert.ok(hr.includes(s), 'faltou: ' + s);
  for (const s of ['SOL-2026-0999', 'CLINICA TESTE BETA', 'REPRESENTADA ALFA TESTE', 'Carga por técnico', 'Primeiro contato', 'Fila de pedidos']) assert.ok(!hr.includes(s), 'representada viu: ' + s);
  const m = ok(a.rep('s_gil', 'relatorioPeriodo', { dias: 90 })).documento;
  const hm = a.html(m.htmlUrl.split('/').pop());
  for (const s of ['Carga por técnico', 'Primeiro contato', 'Fila de pedidos', 'SOL-2026-0999', 'REPRESENTADA ALFA TESTE', 'Prazo de atendimento por prioridade']) assert.ok(hm.includes(s), 'faltou na interna: ' + s);
  // versão da representada gerada pela Metrolabs pede a representada
  assert.equal(a.rep('s_gil', 'relatorioPeriodo', { publico: 'REPRESENTADA' }).ok, false);
  assert.equal(ok(a.rep('s_gil', 'relatorioPeriodo', { publico: 'REPRESENTADA', representadaId: 'repB' })).documento.publico, 'REPRESENTADA');
  const c = ok(a.api('s_cliente.alfa', 'relatorioPeriodoCliente', { dias: 90 })).documento;
  assert.equal(c.publico, 'CLIENTE');
  const hc = a.html(c.htmlUrl.split('/').pop());
  for (const s of ['REPRESENTADA BETA TESTE', 'REPRESENTADA ALFA TESTE', 'CLINICA TESTE BETA', 'Primeiro contato', 'Carga por técnico', 'Prazo cumprido']) assert.ok(!hc.includes(s), 'cliente viu: ' + s);
  for (const s of ['Gantt da carteira', 'Chamados por etapa', k.c.numero, 'Assistência técnica']) assert.ok(hc.includes(s), 'faltou na do cliente: ' + s);
  // período desconhecido cai no padrão (90 dias)
  assert.equal(a.tabelas.REP_DOCUMENTOS.find((x) => x.ID === c.id).PERIODO_DIAS, 90);
  // cada um lista os seus
  assert.deepEqual(ok(a.rep('s_ana.alfa', 'documentos', {})).documentos, []);
  assert.equal(ok(a.api('s_cliente.alfa', 'documentosGerados', {})).documentos.length, 1);
});

test('Gantt impresso: rótulos de mês nunca se sobrepõem e o rótulo da barra não encosta no losango da visita', () => {
  const a = amb(); encerrado(a);
  const ctx = a.ctx, agora = em('2026-10-21T10:00:00-03:00');
  // janela começando em 29/09: o "set/2026" (2 dias) não cabe antes do "out/2026" e some
  const reg = ctx.RepD_regua_(em('2026-09-29T00:00:00-03:00'), em('2026-11-04T00:00:00-03:00'), 190, 798, 12, 27, 100, {});
  const meses = [...reg.svg.matchAll(/<text x="([\d.]+)"[^>]*font-weight="700"[^>]*>([a-z]{3}\/\d{4})</g)].map((m) => ({ x: Number(m[1]), t: m[2] }));
  assert.deepEqual(meses.map((m) => m.t), ['out/2026', 'nov/2026']);
  for (let i = 1; i < meses.length; i++) assert.ok(meses[i].x - meses[i - 1].x > ctx.RepD_largTexto_(meses[i - 1].t, 9.5, true) + 6);
  // barra curta com a visita no fim: o texto vai para depois do losango
  const svg = ctx.RepD_ganttSvg_([{ numero: 'CH-1', sub: '', enviadoMs: agora - 2 * 864e5, fimMs: agora - 864e5, aberto: false, visitaPrevMs: agora - 864e5, visitaMs: null, rotulo: 'CH-1 · Cliente Teste', cor: '#1f5fa8' }],
    agora - 10 * 864e5, agora + 5 * 864e5, agora, false);
  const xl = Number(/<path d="M([\d.]+) /.exec(svg)[1]);
  const xt = Number(/<text x="([\d.]+)"[^>]*>CH-1 · Cliente Teste</.exec(svg)[1]);
  assert.ok(xt >= xl + 10, 'rótulo em ' + xt + ' encosta no losango em ' + xl);
});

test('capa com quadro-resumo, próximo passo, linha do tempo vertical, glossário: cada parte nova respeita o público (30/10/2026)', () => {
  const a = amb(), k = encerrado(a);
  const hr = a.html(ok(a.rep('s_beto.beta', 'relatorioAtendimento', { id: k.c.id })).documento.htmlUrl.split('/').pop());
  const hc = a.html(ok(a.api('s_cliente.alfa', 'relatorioAtendimento', { id: k.c.id })).documento.htmlUrl.split('/').pop());
  const hm = a.html(ok(a.rep('s_gil', 'relatorioAtendimento', { id: k.c.id })).documento.htmlUrl.split('/').pop());
  // o essencial fica dentro da capa (primeira folha)
  for (const h of [hr, hc, hm]) {
    const capa = h.slice(h.indexOf('<section class="capa">'), h.indexOf('</section>', h.indexOf('<section class="capa">')));
    for (const s of ['Situação em', 'Próximo passo', 'Nenhuma ação pendente']) assert.ok(capa.includes(s), 'capa sem: ' + s);
    for (const s of ['class="rd-tl"', 'Sobre este documento', 'Assinaturas e aceite']) assert.ok(h.includes(s), 'faltou: ' + s);
    assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(h), 'emoji no documento');
  }
  for (const s of ['Prazo de atendimento', 'Aceite do pedido', 'Etapas que a representada acompanha', 'Marcos cumpridos no previsto', 'Diferença']) assert.ok(hr.includes(s), 'faltou na representada: ' + s);
  // cliente: sem prazo interno, sem aceite do pedido, sem "com quem está" e sem o glossário da representada
  for (const s of ['Prazo de atendimento', 'Aceite do pedido', 'Com quem está', 'Etapas que a representada acompanha', 'Abertura do pedido', 'Marcos cumpridos', 'complemento da representada'])
    assert.ok(!hc.includes(s), 'cliente viu: ' + s);
  assert.ok(hc.includes('Etapas de &quot;Meus chamados&quot;') || hc.includes('Etapas de "Meus chamados"'));
  // a marca "interno" da linha do tempo só na versão da Metrolabs
  assert.ok(hm.includes('>interno</span>')); assert.ok(!hr.includes('>interno</span>')); assert.ok(!hc.includes('>interno</span>'));
  // período: pontos de atenção e definições por público
  const pr = a.html(ok(a.rep('s_beto.beta', 'relatorioPeriodo', { dias: 30 })).documento.htmlUrl.split('/').pop());
  const pc = a.html(ok(a.api('s_cliente.alfa', 'relatorioPeriodoCliente', { dias: 90 })).documento.htmlUrl.split('/').pop());
  const pm = a.html(ok(a.rep('s_gil', 'relatorioPeriodo', { dias: 90 })).documento.htmlUrl.split('/').pop());
  for (const s of ['Pontos de atenção', 'Como ler este relatório', 'Aceite no prazo']) assert.ok(pr.includes(s), 'faltou no período da representada: ' + s);
  for (const s of ['Do aceite ao primeiro contato', 'Primeiro contato:']) { assert.ok(!pr.includes(s), 'representada viu: ' + s); assert.ok(pm.includes(s), 'faltou na interna: ' + s); }
  for (const s of ['Pontos de atenção', 'Prazo vencido', 'Aceite no prazo', 'Relatório do período · Representação', 'complemento da representada']) assert.ok(!pc.includes(s), 'cliente viu: ' + s);
  assert.ok(pc.includes('Relatório do período · Assistência técnica'));
});
