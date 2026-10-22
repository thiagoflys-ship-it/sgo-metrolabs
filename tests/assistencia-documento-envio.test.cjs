// Assistência técnica, etapa 2 (22/10/2026): a O.S. como documento chega ao cliente. PDF gerado uma vez só no encerramento (toque
// repetido reabre o mesmo); envio ao cliente gravado na O.S. (quando, por quem, canal, para quem) pelo gancho do Enviar documento;
// técnico envia pelo aplicativo (evento ENVIAR_CLIENTE); pendência de 1 dia útil cobra a gestão; rotina sem sessão registra no
// Arquivo de documentos; correção só pela gestão com motivo (Rev. 01 pelo SGO_DocRevisao); interruptor nas telas internas;
// WhatsApp só oferecido com canal ativo; "enviado em" do orçamento. Código real num contexto isolado; só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, ok, FOTO, ASSINATURA, abrirChamado, chamadoAgendado } = require('./_assistencia_ambiente.cjs');

const ev = (tipo, osId, n, dados, em) => ({ tipo, osId, idLocal: 'apar2-' + String(n).padStart(4, '0'), em: em || '2026-10-20T09:10:00', dados: dados || {} });
const sync = (amb, sid, eventos, pedido) => amb.app('Ast_appSincronizar', sid || 's_tiago', { pedidoId: pedido || 'p-' + Math.random().toString(36).slice(2), eventos });
/** O.S. agendada, documentada e encerrada pelo aplicativo (relatório gerado no encerramento). Devolve { os, chamado }. */
function osEncerrada(amb, extra) {
  const a = chamadoAgendado(amb, extra);
  const os = a.os;
  ok(sync(amb, 's_tiago', [ev('CHEGUEI', os.id, 1, {}, '2026-10-20T09:05:00'),
    ev('RESPOSTA', os.id, 2, { perguntaId: 'identificado', valor: 'SIM' }), ev('RESPOSTA', os.id, 3, { perguntaId: 'defeito', valor: 'Resistência aberta' }),
    ev('RESPOSTA', os.id, 4, { perguntaId: 'teste_ok', valor: 'SIM' }), ev('RESPOSTA', os.id, 5, { perguntaId: 'liberado', valor: 'SIM' }),
    ev('RELATO', os.id, 6, { condicaoEncontrada: 'Parada com erro de aquecimento', causa: 'Resistência queimada', servicoRealizado: 'Troca da resistência da câmara', testeFuncional: 'Três ciclos completos sem erro', serieConfirmada: 'S-100', identificadoPor: 'QR' })]));
  ['foto_defeito', 'foto_servico'].forEach((p, i) => ok(amb.app('Ast_appEnviarFoto', 's_tiago', { osId: os.id, idLocal: 'foto2-' + i + '-' + os.id, nome: p + '.jpg', base64: FOTO, perguntaId: p, em: '2026-10-20T09:30:00' })));
  const r = ok(sync(amb, 's_tiago', [ev('ASSINATURA', os.id, 7, { nome: 'Rui Responsável Teste', documento: 'CPF 000', imagem: ASSINATURA }), ev('CONCLUI', os.id, 8, {}, '2026-10-20T10:30:00')]));
  assert.equal(r.os[0].situacao, 'ENCERRADA', JSON.stringify(r.os[0]));
  return { os: amb.tabelas.ATEC_OS.find((x) => x.ID === os.id), chamado: a.chamado };
}
const linhaOs = (amb, id) => amb.tabelas.ATEC_OS.find((x) => x.ID === id);

test('PDF uma vez só: o encerramento gera o relatório e registra no Arquivo de documentos; "Relatório A4" na O.S. encerrada reabre o mesmo (sem versão nova); a emissão entra no registro de revisões como Rev. 00', () => {
  const amb = ambiente();
  const { os } = osEncerrada(amb);
  assert.equal(os.RELATORIO_VERSAO, 1);
  assert.equal(amb.tabelas.ATEC_RELATORIOS.length, 1);
  assert.ok(os.RELATORIO_PDF_ID, 'PDF gravado');
  // registrado no Arquivo de documentos (tipo ORDEM DE SERVIÇO), ligado ao cliente, à unidade e ao equipamento
  const doc = amb.tabelas.DOC_DOCUMENTOS.find((d) => d.TIPO_DOCUMENTO === 'ORDEM DE SERVIÇO');
  assert.ok(doc, 'relatório no Arquivo de documentos');
  assert.equal(doc.CLIENTE_ID, 'c1'); assert.equal(doc.UNIDADE_ID, 'un1'); assert.equal(doc.EQUIPAMENTO_ID, 'eq1');
  // toque repetido: reabre o mesmo PDF, nada novo é gerado
  const r1 = ok(amb.api('s_gil', 'relatorio', { osId: os.ID }));
  const r2 = ok(amb.api('s_tiago', 'relatorio', { osId: os.ID }));
  assert.equal(r1.reaproveitado, true); assert.equal(r2.reaproveitado, true);
  assert.equal(r1.pdfId, os.RELATORIO_PDF_ID); assert.equal(r2.versao, 1);
  assert.match(r1.message, /Nenhuma versão nova foi gerada/);
  assert.equal(amb.tabelas.ATEC_RELATORIOS.length, 1);
  assert.equal(linhaOs(amb, os.ID).RELATORIO_VERSAO, 1);
  assert.equal(Object.values(amb.arquivos).filter((a) => /Relatorio da OS/.test(a.nome) && /\.pdf$/.test(a.nome)).length, 1);
  // o cabeçalho do PDF diz Revisão 00 (não "versão menos um")
  const html = Object.values(amb.arquivos).find((a) => /Relatorio da OS/.test(a.nome) && /\.html$/.test(a.nome));
  assert.match(Buffer.from(html.bytes).toString('utf8'), /00/);
  // registro de revisões (núcleo comum): emissão inicial, Rev. 00, vigente
  const revs = amb.ctx.SGO_DOCREV_MEMORIA_.filter((r) => r.MODULO === 'ORDEM_SERVICO');
  assert.equal(revs.length, 1); assert.equal(revs[0].NUMERO, os.NUMERO); assert.equal(revs[0].REVISAO, '0'); assert.equal(revs[0].STATUS, 'EMITIDO');
  // o cliente recebeu o e-mail curto "atendimento concluído" (AT08), sem o PDF
  const aviso = amb.emails.find((m) => /Atendimento concluído/.test(m.subject));
  assert.ok(aviso, 'e-mail de atendimento concluído'); assert.equal(aviso.to, 'rui@alfa.exemplo.test'); assert.ok(!aviso.attachments, 'sem anexo');
  assert.ok(!amb.trava.aninhamentos, 'sem trava aninhada');
});

test('envio ao cliente: a ficha mostra "ainda não enviado" com os contatos; o técnico envia pelo aplicativo (ENVIAR_CLIENTE) uma vez só; a O.S. grava quando, por quem, canal e para quem; a pendência some', () => {
  const amb = ambiente();
  const { os, chamado } = osEncerrada(amb);
  const ficha = ok(amb.api('s_tiago', 'os', { id: os.ID })).os;
  assert.equal(ficha.envio.situacao, 'PDF_GERADO');
  assert.match(ficha.envio.texto, /Ainda não enviado ao cliente/);
  assert.equal(ficha.envio.podeEnviar, true);
  assert.ok(ficha.envio.contatos.some((k) => k.email === 'rui@alfa.exemplo.test' && k.sugerido && /unidade/i.test(k.origem)), JSON.stringify(ficha.envio.contatos));
  assert.ok(ficha.envio.contatos.some((k) => k.email === 'compras@alfa.exemplo.test'), 'cadastro do cliente');
  // pendência para o técnico (menos de 1 dia útil): "enviar ao cliente", com o caminho
  const p0 = amb.pend('s_tiago').filter((i) => i.tipo === 'ast_enviar_cliente');
  assert.equal(p0.length, 1); assert.match(p0[0].oQueFazer, /Enviar ao cliente por e-mail/); assert.match(p0[0].oQueFazer, /Documento e envio/);
  // o Meu dia e a sincronização do aplicativo trazem o estado do envio
  const md = ok(amb.app('Ast_appMeuDia', 's_tiago', { dia: '2026-10-20' }));
  assert.equal(md.os[0].envio.situacao, 'PDF_GERADO'); assert.ok(md.os[0].envio.contatos.length >= 2);
  // outro técnico não envia; e-mail incompleto é recusado com o que fazer
  const r0 = ok(sync(amb, 's_tales', [ev('ENVIAR_CLIENTE', os.ID, 50, { para: [{ email: 'rui@alfa.exemplo.test' }] })]));
  assert.equal(r0.recusados[0].definitivo, true);
  const r1 = ok(sync(amb, 's_tiago', [ev('ENVIAR_CLIENTE', os.ID, 51, { para: ['rui-sem-arroba'] })]));
  assert.match(r1.recusados[0].motivo, /não está completo/); assert.match(r1.recusados[0].corrigir, /Corrija o e-mail/);
  const antes = amb.emails.length;
  const r2 = ok(sync(amb, 's_tiago', [ev('ENVIAR_CLIENTE', os.ID, 52, { para: [{ nome: 'Rui Responsável Teste', email: 'rui@alfa.exemplo.test' }] })], 'p-envio-1'));
  assert.equal(r2.aceitos.length, 1, JSON.stringify(r2.recusados));
  assert.equal(r2.os[0].envio.situacao, 'ENVIADO');
  assert.equal(r2.os[0].envio.enviadoPara, 'rui@alfa.exemplo.test');
  // e-mail com o PDF em anexo, chamado no assunto, texto profissional assinado pela Metrolabs
  const m = amb.emails.slice(antes).find((x) => /Relatório de atendimento técnico/.test(x.subject));
  assert.ok(m, 'e-mail do relatório');
  assert.match(m.subject, new RegExp(os.NUMERO)); assert.match(m.subject, new RegExp(chamado.numero));
  assert.equal(m.to, 'rui@alfa.exemplo.test');
  assert.ok(m.attachments && m.attachments.length === 1 && /\.pdf$/.test(m.attachments[0].getName()), 'PDF anexado');
  assert.match(m.body, /Atenciosamente,\nTIAGO TECNICO TESTE\nMetrolabs/);
  assert.doesNotMatch(m.body, /[\u{1F300}-\u{1FAFF}]/u);
  // gravado na O.S.: quando, por quem, canal, para quem; histórico da O.S. e do chamado (público)
  const o = linhaOs(amb, os.ID);
  assert.ok(o.ENVIADO_CLIENTE_EM, 'enviado em'); assert.equal(o.ENVIADO_CLIENTE_POR_NOME, 'TIAGO TECNICO TESTE'); assert.equal(o.ENVIADO_CLIENTE_CANAL, 'EMAIL'); assert.equal(o.ENVIADO_CLIENTE_PARA, 'rui@alfa.exemplo.test');
  assert.ok(amb.tabelas.ATEC_EVENTOS.some((e) => e.ENTIDADE === 'OS' && e.TIPO === 'ENVIADO_CLIENTE'));
  assert.ok(amb.tabelas.ATEC_EVENTOS.some((e) => e.ENTIDADE === 'CHAMADO' && e.TIPO === 'ENVIADO_CLIENTE' && e.PUBLICO === 'SIM'));
  assert.equal(amb.tabelas.DOC_ENVIOS.filter((x) => x.SITUACAO === 'ENVIADO').length, 1);
  assert.match(ok(amb.api('s_gil', 'os', { id: os.ID })).os.envio.texto, /Enviado ao cliente em .* por TIAGO TECNICO TESTE \(e-mail\) para rui@alfa\.exemplo\.test/);
  assert.equal(amb.pend('s_tiago').filter((i) => i.tipo === 'ast_enviar_cliente' || i.tipo === 'ast_sem_envio').length, 0, 'pendência some');
  // repetição do mesmo idLocal: nada é enviado de novo; novo pedido sem "reenviar" também não repete
  const depois = amb.emails.length;
  assert.equal(ok(sync(amb, 's_tiago', [ev('ENVIAR_CLIENTE', os.ID, 52, { para: ['rui@alfa.exemplo.test'] })], 'p-envio-2')).aceitos[0].duplicado, true);
  const r3 = ok(sync(amb, 's_tiago', [ev('ENVIAR_CLIENTE', os.ID, 53, { para: ['rui@alfa.exemplo.test'] })]));
  assert.match(r3.aceitos[0].nota, /já tinha sido enviado/);
  assert.equal(amb.emails.length, depois);
  // a gestão pode enviar de novo pela ficha (ação da tela), para outro contato
  const g = ok(amb.api('s_gil', 'enviarRelatorio', { osId: os.ID, pedidoId: 'ficha-gil-000001', para: [{ nome: 'Compras', email: 'compras@alfa.exemplo.test' }] }));
  assert.equal(g.enviado, true); assert.equal(linhaOs(amb, os.ID).ENVIADO_CLIENTE_PARA, 'compras@alfa.exemplo.test');
  assert.ok(!amb.trava.aninhamentos, 'sem trava aninhada');
});

test('sem envio em 1 dia útil: a pendência passa do técnico para a gestão (Caixa de decisões), com o caminho', () => {
  const amb = ambiente();
  const { os } = osEncerrada(amb);
  // o encerramento foi gravado com a hora do servidor (segunda 19/10, 10h): no mesmo dia útil cobra só o técnico
  amb.mudar('2026-10-19T16:00:00-03:00');
  assert.equal(amb.pend('s_gil').filter((i) => i.tipo === 'ast_sem_envio').length, 0, 'no mesmo dia útil ainda não cobra a gestão');
  assert.equal(amb.pend('s_tiago').filter((i) => i.tipo === 'ast_enviar_cliente').length, 1);
  amb.mudar('2026-10-20T10:00:00-03:00');
  const p = amb.pend('s_gil').filter((i) => i.tipo === 'ast_sem_envio');
  assert.equal(p.length, 1);
  assert.equal(p[0].gravidade, 'CRITICO');
  assert.match(p[0].titulo, /ainda não enviado ao cliente/); assert.match(p[0].oQueFazer, /Documento e envio/);
  assert.equal(amb.pend('s_tiago').filter((i) => i.tipo === 'ast_enviar_cliente').length, 0, 'não cobra em dobro');
  ok(amb.api('s_gil', 'enviarRelatorio', { osId: os.ID, pedidoId: 'ficha-gil-000002', para: ['rui@alfa.exemplo.test'] }));
  assert.equal(amb.pend('s_gil').filter((i) => i.tipo === 'ast_sem_envio').length, 0);
});

test('rotina sem sessão: o relatório da O.S. encerrada que ficou sem PDF é gerado pela identidade do sistema e entra no Arquivo de documentos', () => {
  const amb = ambiente();
  const { os } = osEncerrada(amb);
  const antesDocs = amb.tabelas.DOC_DOCUMENTOS.length;
  // simula a falha da geração no encerramento: a O.S. ficou encerrada sem o PDF
  Object.assign(linhaOs(amb, os.ID), { RELATORIO_PDF_ID: '', RELATORIO_PDF_URL: '', RELATORIO_HTML_ID: '', RELATORIO_VERSAO: 0 });
  amb.mudar('2026-10-20T12:00:00-03:00');
  const r = amb.ctx.Assistencia_rotina_(new Date(amb.relogio.agora), true);
  assert.equal(r.relatorios.gerados, 1);
  const o = linhaOs(amb, os.ID);
  assert.ok(o.RELATORIO_PDF_ID, 'PDF gerado pela rotina');
  assert.equal(amb.tabelas.DOC_DOCUMENTOS.length, antesDocs + 1, 'registrado no Arquivo de documentos sem sessão');
  const d = amb.tabelas.DOC_DOCUMENTOS[amb.tabelas.DOC_DOCUMENTOS.length - 1];
  assert.equal(d.TIPO_DOCUMENTO, 'ORDEM DE SERVIÇO'); assert.equal(d.LINK_ARQUIVO, o.RELATORIO_PDF_URL); assert.equal(d.STATUS, 'ATIVO');
  assert.ok(amb.tabelas.ATEC_RELATORIOS[amb.tabelas.ATEC_RELATORIOS.length - 1].DOC_REGISTRADO === 'SIM');
  assert.ok(!amb.trava.aninhamentos);
});

test('correção só pela gestão, com motivo: "Abrir para corrigir" vira Rev. 01 do mesmo número, a anterior fica substituída, o histórico entra no documento e o envio precisa ser refeito', () => {
  const amb = ambiente();
  const { os } = osEncerrada(amb);
  ok(amb.api('s_tiago', 'enviarRelatorio', { osId: os.ID, pedidoId: 'ficha-tiago-000001', para: ['rui@alfa.exemplo.test'] }));
  assert.match(amb.api('s_tiago', 'corrigirRelatorio', { osId: os.ID, motivo: 'Texto do serviço realizado incompleto' }).message, /gestão da área Técnica/);
  assert.match(amb.api('s_gil', 'corrigirRelatorio', { osId: os.ID, motivo: 'curto' }).message, /motivo da revisão/);
  const r = ok(amb.api('s_gil', 'corrigirRelatorio', { osId: os.ID, motivo: 'Faltou citar o teste de estanqueidade no serviço realizado', relato: { servicoRealizado: 'Troca da resistência da câmara e teste de estanqueidade' } }));
  assert.equal(r.revisao, 1); assert.equal(r.versao, 2);
  assert.match(r.message, /Rev\. 01/);
  const o = linhaOs(amb, os.ID);
  assert.equal(o.RELATORIO_REVISAO, 1); assert.equal(o.RELATORIO_VERSAO, 2); assert.equal(o.SERVICO_REALIZADO, 'Troca da resistência da câmara e teste de estanqueidade');
  assert.equal(o.ENVIADO_CLIENTE_EM, '', 'a revisão ainda não foi ao cliente');
  assert.ok(amb.tabelas.ATEC_EVENTOS.some((e) => e.TIPO === 'ENVIO_SUPERADO'));
  assert.equal(amb.tabelas.ATEC_RELATORIOS.length, 2);
  const rel = amb.tabelas.ATEC_RELATORIOS[1];
  assert.equal(rel.REVISAO, 1); assert.match(rel.MOTIVO, /estanqueidade/);
  // registro de revisões: Rev. 00 substituída, Rev. 01 vigente; o arquivo antigo não foi apagado
  const revs = amb.ctx.SGO_DOCREV_MEMORIA_.filter((x) => x.MODULO === 'ORDEM_SERVICO');
  assert.deepEqual(JSON.parse(JSON.stringify(revs.map((x) => x.REVISAO + ':' + x.STATUS))), ['0:SUBSTITUIDO', '1:EMITIDO']);
  assert.equal(Object.values(amb.arquivos).filter((a) => /Relatorio da OS/.test(a.nome) && /\.pdf$/.test(a.nome)).length, 2);
  const html = Object.values(amb.arquivos).find((a) => /Relatorio da OS - .* Rev 01/.test(a.nome) && /\.html$/.test(a.nome));
  assert.ok(html, 'HTML da revisão');
  const t = Buffer.from(html.bytes).toString('utf8');
  assert.match(t, /Histórico de revisões/); assert.match(t, /estanqueidade/);
  // "Relatório A4" de novo reabre a Rev. 01 (sem gerar outra); a ficha mostra PDF gerado e não enviado; a pendência de envio voltou
  const r2 = ok(amb.api('s_gil', 'relatorio', { osId: os.ID }));
  assert.equal(r2.reaproveitado, true); assert.equal(r2.revisao, 1); assert.equal(amb.tabelas.ATEC_RELATORIOS.length, 2);
  const ficha = ok(amb.api('s_gil', 'os', { id: os.ID })).os;
  assert.equal(ficha.envio.situacao, 'PDF_GERADO'); assert.equal(ficha.envio.revisao, 1);
  assert.equal(amb.pend('s_tiago').filter((i) => i.tipo === 'ast_enviar_cliente').length, 1);
  // o e-mail da revisão diz que ela substitui a anterior
  ok(amb.api('s_gil', 'enviarRelatorio', { osId: os.ID, pedidoId: 'ficha-gil-000003', para: ['rui@alfa.exemplo.test'] }));
  const m = amb.emails[amb.emails.length - 1];
  assert.match(m.subject, /Rev\. 01/); assert.match(m.body, /substitui a anterior/);
});

test('interruptor "Assistência ligada" vale nas telas internas: desligada, nada novo nasce e a mensagem diz o porquê e o caminho; consultar e religar continuam', () => {
  const amb = ambiente();
  const c = abrirChamado(amb);
  ok(amb.api('s_dora', 'ligar', { ligada: false, motivo: 'Pausa do piloto de teste' }));
  const r = amb.api('s_gil', 'abrir', { clienteId: 'c1', equipamentoId: 'eq2', sintoma: 'Lavadora não seca a carga no final', solicitante: 'Rui', prioridade: 'P3', canal: 'TELEFONE' });
  assert.equal(r.ok, false); assert.equal(r.desligada, true);
  assert.match(r.message, /desligada pela gestão/); assert.match(r.message, /Regras da assistência/); assert.match(r.message, /Ligar/);
  assert.equal(amb.api('s_gil', 'triagem', { id: c.id, acao: 'PLANEJADO' }).desligada, true);
  assert.equal(ok(amb.api('s_gil', 'lista', {})).chamados.length, 1, 'consulta continua');
  assert.equal(ok(amb.api('s_gil', 'chamado', { id: c.id })).chamado.id, c.id);
  assert.equal(ok(amb.api('s_gil', 'acesso', {})).ligada, false);
  ok(amb.api('s_dora', 'ligar', { ligada: true, motivo: 'Retomada do piloto de teste' }));
  assert.equal(amb.api('s_gil', 'abrir', { clienteId: 'c1', equipamentoId: 'eq2', sintoma: 'Lavadora não seca a carga no final', solicitante: 'Rui', prioridade: 'P3', canal: 'TELEFONE' }).ok, true);
});

test('WhatsApp na janela Enviar documento só quando há canal ativo: sem chaves ou com o piloto ligado, a opção vem desligada com o porquê e o caminho', () => {
  const amb = ambiente();
  const c1 = amb.ctx.EnviarDoc_canais_({ nome: 'Gil', email: 'gil@exemplo.test' });
  assert.equal(c1.email.ok, true);
  assert.equal(c1.whatsapp.ok, false); assert.equal(c1.whatsapp.motivo, 'SEM_CHAVES');
  amb.ctx.SGO_waZapiFora_ = () => true;
  const c2 = amb.ctx.EnviarDoc_canais_({ nome: 'Gil' });
  assert.equal(c2.whatsapp.ok, false); assert.equal(c2.whatsapp.motivo, 'PILOTO');
  assert.match(c2.whatsapp.texto, /piloto do WhatsApp oficial/); assert.match(c2.whatsapp.texto, /envie por e-mail/i);
});

test('orçamento do chamado: o envio pelo Enviar documento grava "enviado em" e "para" no orçamento e no histórico do chamado', () => {
  const amb = ambiente();
  const c = abrirChamado(amb);
  ok(amb.api('s_gil', 'triagem', { id: c.id, checklist: { sintomas_confirmados: 'Confirmado', risco_operar: 'Médio', diagnostico_preliminar: 'Placa de controle queimada' }, acao: 'AGUARDANDO_ORCAMENTO', orcamentoDescricao: 'Troca da placa de controle (fora do contrato)' }));
  const orc = amb.tabelas.ATEC_ORCAMENTOS[0];
  ok(amb.api('s_gaspar', 'salvarOrcamento', { id: orc.ID, itens: [{ tipo: 'SERVICO', descricao: 'Mão de obra', quantidade: 1, valorUnitario: 350 }], condicoes: 'Pagamento em 28 dias' }));
  ok(amb.api('s_gaspar', 'emitirOrcamento', { id: orc.ID }));
  const pdfId = amb.tabelas.ATEC_ORCAMENTOS[0].PDF_ID;
  assert.ok(pdfId);
  const r = amb.ctx.EnviarDoc_apiEnviar('s_gaspar', { pedidoId: 'orc-gaspar-000001', arquivoId: pdfId, destinatarios: [{ nome: 'Rui', email: 'rui@alfa.exemplo.test' }], canais: { email: true }, assunto: 'Orçamento OA', mensagemEmail: 'Segue o orçamento.' });
  assert.equal(r.ok, true); assert.equal(r.enviados, 1, JSON.stringify(r.itens));
  const o = amb.tabelas.ATEC_ORCAMENTOS[0];
  assert.ok(o.ENVIADO_EM, 'enviado em gravado'); assert.equal(o.ENVIADO_PARA, 'rui@alfa.exemplo.test');
  const det = ok(amb.api('s_gaspar', 'chamado', { id: c.id }));
  assert.ok(det.orcamentos[0].enviadoEm);
  assert.ok(det.eventos.some((e) => e.tipo === 'ORCAMENTO_ENVIADO'));
});
