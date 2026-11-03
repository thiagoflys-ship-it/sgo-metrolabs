// Assistência técnica, 03/11/2026 (decisão do dono): toda O.S. com visita tem DUAS assinaturas, a do cliente (quem recebe ou
// acompanha) e a do técnico ou colaborador da Metrolabs que atendeu. Nas duas, nome completo (nome e sobrenome) obrigatório e
// documento sempre opcional (preenchido, o formato é conferido; CPF com dígitos conferentes). Pelo aplicativo a O.S. só fecha
// com as duas; a gestão, pela tela, encerra sem a do técnico com justificativa no histórico. O.S. já em execução antes da regra
// não exigem a do técnico e o relatório sai com "assinatura não registrada". Código real em contexto isolado; só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, em, ok, FOTO, ASSINATURA, chamadoAgendado } = require('./_assistencia_ambiente.cjs');

const DEPOIS = em('2026-11-05T10:00:00-03:00');   // quinta-feira, depois da regra
const ev = (tipo, osId, n, dados, quando) => ({ tipo, osId, idLocal: 'ap2a-' + osId + '-' + String(n).padStart(4, '0'), em: quando || '2026-11-05T10:05:00', dados: dados || {} });
const sync = (amb, eventos, sid) => amb.app('Ast_appSincronizar', sid || 's_tiago', { pedidoId: 'p-' + Math.random().toString(36).slice(2), eventos });
const linhaOs = (amb, id) => amb.tabelas.ATEC_OS.find((x) => x.ID === id);
const htmlDe = (amb, rx) => { const a = Object.values(amb.arquivos).filter((x) => rx.test(x.nome) && /\.html$/.test(x.nome)).pop(); return a ? Buffer.from(a.bytes).toString('utf8') : ''; };

/** Corretiva documentada pelo aplicativo, menos as assinaturas. */
function corretivaDocumentada(amb, quando) {
  const a = chamadoAgendado(amb, { inicio: quando || '2026-11-06T09:00' });
  const id = a.os.id;
  ok(sync(amb, [ev('CHEGUEI', id, 1), ev('RESPOSTA', id, 2, { perguntaId: 'identificado', valor: 'SIM' }), ev('RESPOSTA', id, 3, { perguntaId: 'defeito', valor: 'Resistência aberta' }),
    ev('RESPOSTA', id, 4, { perguntaId: 'teste_ok', valor: 'SIM' }), ev('RESPOSTA', id, 5, { perguntaId: 'liberado', valor: 'SIM' }),
    ev('RELATO', id, 6, { condicaoEncontrada: 'Parada sem aquecer', servicoRealizado: 'Troca da resistência da câmara', testeFuncional: 'Três ciclos sem erro', serieConfirmada: 'S-100', identificadoPor: 'SERIE' })]));
  ['foto_defeito', 'foto_servico'].forEach((p, i) => ok(amb.app('Ast_appEnviarFoto', 's_tiago', { osId: id, idLocal: 'f2a-' + i + '-' + id, nome: p + '.jpg', base64: FOTO, perguntaId: p, em: '2026-11-05T10:20:00' })));
  return id;
}

test('nome completo obrigatório nas duas assinaturas; documento opcional, conferido quando preenchido (CPF com dígitos)', () => {
  const amb = ambiente({ agora: DEPOIS });
  const id = corretivaDocumentada(amb);
  const r = ok(sync(amb, [ev('ASSINATURA', id, 10, { nome: 'Rui', imagem: ASSINATURA }), ev('ASSINATURA', id, 11, { papel: 'COLABORADOR', nome: 'Tiago', imagem: ASSINATURA }),
    ev('ASSINATURA', id, 12, { nome: 'Rui Responsável', documento: '123.456.789-00', imagem: ASSINATURA }), ev('ASSINATURA', id, 13, { nome: 'Rui Responsável', documento: 'x', imagem: ASSINATURA })]));
  assert.equal(r.recusados.length, 4, JSON.stringify(r.recusados));
  assert.match(r.recusados[0].motivo, /nome completo/); assert.match(r.recusados[1].motivo, /nome completo/);
  assert.match(r.recusados[2].motivo, /CPF informado não confere/); assert.match(r.recusados[3].motivo, /documento está incompleto/);
  assert.ok(r.recusados.every((x) => !x.definitivo), 'dá para corrigir e assinar de novo');
  // documento em branco é aceito, sem aviso; CPF válido e RG também
  const r2 = ok(sync(amb, [ev('ASSINATURA', id, 20, { nome: 'Rui Responsável', documento: '', imagem: ASSINATURA }), ev('ASSINATURA', id, 21, { papel: 'COLABORADOR', nome: 'Tiago Técnico', documento: '529.982.247-25', imagem: ASSINATURA })]));
  assert.equal(r2.recusados.length, 0, JSON.stringify(r2.recusados));
  assert.equal(amb.ctx.Ast_documentoErro_('RG 1234567'), '');
  assert.equal(amb.ctx.Ast_documentoErro_('Matrícula 12'), '');
});

test('serviço técnico: pelo aplicativo a O.S. só fecha com as duas assinaturas; o relatório mostra cliente e técnico com nome e documento só se informado', () => {
  const amb = ambiente({ agora: DEPOIS });
  const id = corretivaDocumentada(amb);
  let r = ok(sync(amb, [ev('ASSINATURA', id, 30, { nome: 'Rui Responsável Teste', imagem: ASSINATURA }), ev('CONCLUI', id, 31)]));
  assert.equal(r.os[0].situacao, 'DOC_PENDENTE');
  assert.ok(r.os[0].pendencias.some((p) => /assinatura do técnico que atendeu/.test(p)), JSON.stringify(r.os[0].pendencias));
  // o contrato do aplicativo diz que esta O.S. exige a assinatura do técnico
  const md = ok(amb.app('Ast_appMeuDia', 's_tiago', { dia: '2026-11-06' }));
  assert.equal(md.os.find((o) => o.id === id).tipo.exige.assinaturaColaborador, true);
  assert.equal(md.tipos.find((t) => t.codigo === 'MANUTENCAO_CORRETIVA').exige.assinaturaColaborador, true);
  r = ok(sync(amb, [ev('ASSINATURA', id, 32, { papel: 'COLABORADOR', nome: 'Tiago Técnico Teste', documento: 'Matrícula 12', imagem: ASSINATURA })]));
  assert.equal(r.os[0].situacao, 'ENCERRADA', JSON.stringify(r.os[0].pendencias));
  const h = htmlDe(amb, /^Relatorio da OS/);
  assert.match(h, /Técnico responsável/); assert.match(h, /Tiago Técnico Teste/); assert.match(h, /Matrícula 12 · Metrolabs/); assert.match(h, /Rui Responsável Teste/);
  assert.doesNotMatch(h, /assinatura não registrada/);
});

test('gestão encerra sem a assinatura do técnico só com justificativa (fica no histórico e no relatório); técnico não pode', () => {
  const amb = ambiente({ agora: DEPOIS });
  const id = corretivaDocumentada(amb);
  ok(sync(amb, [ev('ASSINATURA', id, 40, { nome: 'Rui Responsável Teste', imagem: ASSINATURA }), ev('CONCLUI', id, 41)]));
  const ficha = ok(amb.api('s_gil', 'os', { id })).os;
  assert.equal(ficha.podeDispensarColaborador, true);
  assert.equal(ok(amb.api('s_tiago', 'os', { id })).os.podeDispensarColaborador, false);
  assert.match(amb.api('s_tiago', 'osDispensarAssTecnico', { osId: id, justificativa: 'Técnico afastado, sem acesso ao aplicativo' }).message, /só a gestão/);
  assert.match(amb.api('s_gil', 'osDispensarAssTecnico', { osId: id, justificativa: 'curta' }).message, /pelo menos 10 letras/);
  const r = ok(amb.api('s_gil', 'osDispensarAssTecnico', { osId: id, justificativa: 'Técnico afastado, sem acesso ao aplicativo' }));
  assert.match(r.message, /encerrada sem a assinatura do técnico/);
  const os = linhaOs(amb, id);
  assert.equal(os.SITUACAO, 'ENCERRADA'); assert.equal(os.COLAB_DISPENSA_POR_NOME, 'GIL GESTOR TECNICO TESTE');
  assert.ok(amb.tabelas.ATEC_EVENTOS.some((e) => e.TIPO === 'ASSINATURA_TECNICO_DISPENSADA' && /Técnico afastado/.test(e.TEXTO)));
  const h = htmlDe(amb, /^Relatorio da OS/);
  assert.match(h, /assinatura não registrada \(dispensada pela gestão\)/); assert.match(h, /Encerrada sem a assinatura do técnico, por GIL GESTOR TECNICO TESTE/);
  assert.ok(!amb.trava.aninhamentos, 'sem trava aninhada');
});

test('dado antigo não quebra: O.S. com chegada antes da regra fecha sem a assinatura do técnico e o relatório diz "não registrada"', () => {
  const amb = ambiente();   // relógio de outubro de 2026, antes da regra
  const a = chamadoAgendado(amb);
  const id = a.os.id, e = (t, n, d, q) => ({ tipo: t, osId: id, idLocal: 'velha-0000' + n, em: q || '2026-10-20T09:10:00', dados: d || {} });
  ok(sync(amb, [e('CHEGUEI', 1, {}, '2026-10-20T09:05:00'), e('RESPOSTA', 2, { perguntaId: 'identificado', valor: 'SIM' }), e('RESPOSTA', 3, { perguntaId: 'defeito', valor: 'Resistência aberta' }),
    e('RESPOSTA', 4, { perguntaId: 'teste_ok', valor: 'SIM' }), e('RESPOSTA', 5, { perguntaId: 'liberado', valor: 'SIM' }),
    e('RELATO', 6, { condicaoEncontrada: 'Parada', servicoRealizado: 'Troca da resistência da câmara', testeFuncional: 'Ciclos ok', serieConfirmada: 'S-100' })]));
  ['foto_defeito', 'foto_servico'].forEach((p, i) => ok(amb.app('Ast_appEnviarFoto', 's_tiago', { osId: id, idLocal: 'foto-velha-' + i, nome: p + '.jpg', base64: FOTO, perguntaId: p, em: '2026-10-20T09:30:00' })));
  const r = ok(sync(amb, [e('ASSINATURA', 7, { nome: 'Rui Responsável Teste', imagem: ASSINATURA }), e('CONCLUI', 8, {}, '2026-10-20T10:30:00')]));
  assert.equal(r.os[0].situacao, 'ENCERRADA', JSON.stringify(r.os[0].pendencias));
  assert.match(htmlDe(amb, /^Relatorio da OS/), /TIAGO TECNICO TESTE[\s\S]*assinatura não registrada/);
});
