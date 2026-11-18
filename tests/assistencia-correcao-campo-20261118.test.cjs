// Assistência técnica, 18/11/2026 (pedido do dono, técnicos em campo): corrigir depois de errar. O técnico desfaz a conclusão pelo
// aplicativo antes do encerramento (DESFAZ_CONCLUSAO, com motivo); depois do encerramento pede a correção (PEDIR_CORRECAO, aviso à
// gestão); o dono, a Diretoria ou a gestão da área reabre a O.S. pela ficha (osReabrirCorrecao, com motivo) e o aplicativo libera de
// novo; o novo encerramento gera a revisão seguinte do relatório, sem andar o chamado de novo. Nada é apagado. Código real em
// contexto isolado (tests/_assistencia_ambiente.cjs); só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, em, ok, FOTO, ASSINATURA, chamadoAgendado } = require('./_assistencia_ambiente.cjs');

const DEPOIS = em('2026-11-05T10:00:00-03:00');
const ev = (tipo, osId, n, dados, quando) => ({ tipo, osId, idLocal: 'corr-' + osId + '-' + String(n).padStart(4, '0'), em: quando || '2026-11-05T10:05:00', dados: dados || {} });
const sync = (amb, eventos, sid) => amb.app('Ast_appSincronizar', sid || 's_tiago', { pedidoId: 'p-' + Math.random().toString(36).slice(2), eventos });
const linhaOs = (amb, id) => amb.tabelas.ATEC_OS.find((x) => x.ID === id);
const eventosOs = (amb, id) => amb.tabelas.ATEC_EVENTOS.filter((e) => e.ENTIDADE === 'OS' && e.ENTIDADE_ID === id).map((e) => e.TIPO);
const NOVO = 'campo-teste-v2';

function corretivaDocumentada(amb) {
  const id = chamadoAgendado(amb, { inicio: '2026-11-06T09:00' }).os.id;
  ok(sync(amb, [ev('CHEGUEI', id, 1), ev('RESPOSTA', id, 2, { perguntaId: 'identificado', valor: 'SIM' }), ev('RESPOSTA', id, 3, { perguntaId: 'defeito', valor: 'Resistência aberta' }),
    ev('RESPOSTA', id, 4, { perguntaId: 'teste_ok', valor: 'SIM' }), ev('RESPOSTA', id, 5, { perguntaId: 'liberado', valor: 'SIM' }),
    ev('RELATO', id, 6, { condicaoEncontrada: 'Parada sem aquecer', servicoRealizado: 'Troca da resistência da câmara', testeFuncional: 'Três ciclos sem erro', serieConfirmada: 'S-100', identificadoPor: 'SERIE' })]));
  ['foto_defeito', 'foto_servico'].forEach((p, i) => ok(amb.app('Ast_appEnviarFoto', 's_tiago', { osId: id, idLocal: 'fcorr-' + i + '-' + id, nome: p + '.jpg', base64: FOTO, perguntaId: p, em: '2026-11-05T10:20:00' })));
  return id;
}

test('técnico desfaz a conclusão antes do encerramento (com motivo): volta para Em execução, o Meu dia não traz a conclusão antiga e conclui de novo', () => {
  const amb = ambiente({ agora: DEPOIS });
  const id = corretivaDocumentada(amb);
  let r = ok(sync(amb, [ev('ASSINATURA', id, 10, { nome: 'Rui Responsável Teste', imagem: ASSINATURA, versaoApp: NOVO }), ev('CONCLUI', id, 11)]));
  assert.equal(r.os[0].situacao, 'DOC_PENDENTE', 'falta a assinatura do técnico');
  // motivo curto: recusado em definitivo (o app pede de novo)
  r = ok(sync(amb, [ev('DESFAZ_CONCLUSAO', id, 12, { motivo: 'erro' })]));
  assert.equal(r.recusados.length, 1); assert.match(r.recusados[0].motivo, /motivo/);
  amb.mudar('2026-11-05T10:40:00-03:00');
  r = ok(sync(amb, [ev('DESFAZ_CONCLUSAO', id, 13, { motivo: 'Assinatura do cliente saiu cortada' }, '2026-11-05T10:40:00')]));
  assert.equal(r.recusados.length, 0, JSON.stringify(r.recusados));
  const os = linhaOs(amb, id);
  assert.equal(os.SITUACAO, 'EM_EXECUCAO');
  assert.ok(os.CONCLUIU_EM, 'a conclusão antiga não é apagada');
  assert.equal(os.REABERTA_MOTIVO, 'Assinatura do cliente saiu cortada'); assert.equal(os.REABERTA_POR_NOME, 'TIAGO TECNICO TESTE');
  assert.ok(eventosOs(amb, id).includes('CONCLUSAO_DESFEITA'));
  const md = ok(amb.app('Ast_appMeuDia', 's_tiago', { dia: '2026-11-06' })).os.find((o) => o.id === id);
  assert.equal(md.registrado.concluiuEm, '', 'o aparelho não recebe a conclusão desfeita');
  assert.equal(md.registrado.reaberta.motivo, 'Assinatura do cliente saiu cortada');
  // corrige (assinatura de novo, a do técnico) e conclui: encerra
  amb.mudar('2026-11-05T10:50:00-03:00');
  r = ok(sync(amb, [ev('ASSINATURA', id, 14, { nome: 'Rui Responsável Teste', imagem: ASSINATURA, versaoApp: NOVO }, '2026-11-05T10:50:00'), ev('ASSINATURA', id, 15, { papel: 'COLABORADOR', nome: 'Tiago Técnico Teste', imagem: ASSINATURA, versaoApp: NOVO }, '2026-11-05T10:50:10'), ev('CONCLUI', id, 16, {}, '2026-11-05T10:50:20')]));
  assert.equal(r.os[0].situacao, 'ENCERRADA', JSON.stringify(r.os[0].pendencias));
  assert.equal(Number(linhaOs(amb, id).RELATORIO_REVISAO || 0), 0, 'primeiro encerramento: emissão inicial');
  const md2 = ok(amb.app('Ast_appMeuDia', 's_tiago', { dia: '2026-11-06' })).os.find((o) => o.id === id);
  assert.ok(md2.registrado.concluiuEm, 'a conclusão nova (depois da reabertura) vai ao aparelho');
});

test('O.S. encerrada: desfazer é recusado com o caminho; o técnico pede correção (aviso à gestão); só a gestão reabre, com motivo; o novo encerramento sai como revisão', () => {
  const amb = ambiente({ agora: DEPOIS });
  const id = corretivaDocumentada(amb);
  let r = ok(sync(amb, [ev('ASSINATURA', id, 10, { nome: 'Rui Responsável Teste', imagem: ASSINATURA, versaoApp: NOVO }), ev('ASSINATURA', id, 11, { papel: 'COLABORADOR', nome: 'Tiago Técnico Teste', imagem: ASSINATURA, versaoApp: NOVO }), ev('CONCLUI', id, 12)]));
  assert.equal(r.os[0].situacao, 'ENCERRADA', JSON.stringify(r.os[0].pendencias));
  const chamadoEventos = amb.tabelas.ATEC_EVENTOS.filter((e) => e.ENTIDADE !== 'OS').length;
  r = ok(sync(amb, [ev('DESFAZ_CONCLUSAO', id, 13, { motivo: 'Faltou a foto da plaqueta' }), ev('FOTO', id, 14, { fotoIdLocal: 'x', remover: true })]));
  assert.equal(r.recusados.length, 2);
  assert.ok(r.recusados.every((x) => x.definitivo && /Pedir correção/.test(x.corrigir)), JSON.stringify(r.recusados));
  // pedido de correção vale com a O.S. encerrada
  amb.mudar('2026-11-05T11:00:00-03:00');
  r = ok(sync(amb, [ev('PEDIR_CORRECAO', id, 15, { motivo: 'Mandei a foto errada do equipamento' }, '2026-11-05T11:00:00')]));
  assert.equal(r.recusados.length, 0, JSON.stringify(r.recusados));
  assert.equal(linhaOs(amb, id).SITUACAO, 'ENCERRADA', 'pedir não reabre');
  assert.ok(eventosOs(amb, id).includes('CORRECAO_PEDIDA'));
  const aviso = amb.tabelas.ATEC_AVISOS.find((a) => a.TIPO === 'CORRECAO_PEDIDA');
  assert.equal(aviso.DESTINATARIO_ID, 'u_gt'); assert.match(aviso.TEXTO, /Mandei a foto errada/); assert.match(aviso.TEXTO, /Reabrir para correção/);
  let fic = ok(amb.api('s_gil', 'os', { id })).os;
  assert.equal(fic.correcaoPedida.motivo, 'Mandei a foto errada do equipamento');
  assert.equal(fic.podeReabrir, true);
  // técnico não reabre; gestão sem motivo também não
  const tec = amb.api('s_tiago', 'osReabrirCorrecao', { osId: id, motivo: 'Quero corrigir a foto errada' });
  assert.notEqual(tec.ok, true); assert.match(String(tec.message || tec.erro || JSON.stringify(tec)), /dono, da Diretoria e da gestão/);
  assert.equal(ok(amb.api('s_tiago', 'os', { id })).os.podeReabrir, false);
  const semMotivo = amb.api('s_gil', 'osReabrirCorrecao', { osId: id, motivo: 'foto' });
  assert.notEqual(semMotivo.ok, true);
  amb.mudar('2026-11-05T11:10:00-03:00');
  const re = ok(amb.api('s_gil', 'osReabrirCorrecao', { osId: id, motivo: 'Trocar a foto do equipamento' }));
  assert.match(re.message, /reaberta para correção/);
  const os = linhaOs(amb, id);
  assert.equal(os.SITUACAO, 'EM_EXECUCAO'); assert.equal(os.REABERTA_POR_NOME, 'GIL GESTOR TECNICO TESTE');
  assert.ok(eventosOs(amb, id).includes('REABERTA_CORRECAO'));
  assert.ok(amb.tabelas.ATEC_AVISOS.some((a) => a.TIPO === 'OS_REABERTA' && a.DESTINATARIO_ID === 'u_tec'), 'o técnico é avisado');
  fic = ok(amb.api('s_gil', 'os', { id })).os;
  assert.equal(fic.correcaoPedida, null, 'o pedido atendido sai do bloco');
  assert.equal(fic.reaberta.motivo, 'Trocar a foto do equipamento');
  assert.equal(fic.podeCampo, true, 'a gestão anexa foto e corrige pela ficha');
  const md = ok(amb.app('Ast_appMeuDia', 's_tiago', { dia: '2026-11-06' })).os.find((o) => o.id === id);
  assert.equal(md.situacao, 'EM_EXECUCAO'); assert.equal(md.registrado.concluiuEm, ''); assert.equal(md.registrado.reaberta.por, 'GIL GESTOR TECNICO TESTE');
  // a gestão anexa a foto pela ficha; o técnico tira a errada e conclui pelo aplicativo
  ok(amb.api('s_gil', 'osFoto', { osId: id, idLocal: 'fweb-1-' + id, nome: 'nova.jpg', base64: FOTO, perguntaId: 'foto_servico' }));
  amb.mudar('2026-11-05T11:20:00-03:00');
  r = ok(sync(amb, [ev('FOTO', id, 16, { fotoIdLocal: 'fcorr-1-' + id, remover: true }, '2026-11-05T11:20:00'), ev('CONCLUI', id, 17, {}, '2026-11-05T11:20:10')]));
  assert.equal(r.recusados.length, 0, JSON.stringify(r.recusados));
  assert.equal(r.os[0].situacao, 'ENCERRADA', JSON.stringify(r.os[0].pendencias));
  const fim = linhaOs(amb, id);
  assert.equal(Number(fim.RELATORIO_REVISAO), 1, 'relatório sai como Rev. 01');
  assert.ok(eventosOs(amb, id).includes('REENCERRADA'));
  assert.equal(amb.tabelas.ATEC_EVENTOS.filter((e) => e.ENTIDADE !== 'OS').length, chamadoEventos, 'o chamado não anda de novo');
  assert.ok(amb.tabelas.ATEC_FOTOS.some((f) => f.ID_LOCAL === 'fcorr-1-' + id && f.ATIVA === 'NAO'), 'foto errada fica registrada, fora do relatório');
});

test('tela da O.S. (SGO+ web), ajuda e manual: bloco Correção com o botão de reabrir e o pedido do técnico', () => {
  const dest = process.env.DEST ? path.resolve(__dirname, '..', process.env.DEST) : path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
  const js = fs.readFileSync(path.join(dest, 'JS_Assistencia.html'), 'utf8');
  assert.match(js, /id="atOsReabrir">Reabrir para correção \(com motivo\)/);
  assert.match(js, /At_chamar_\("osReabrirCorrecao", \{ osId: o\.id, motivo: t \}/);
  assert.match(js, /O técnico pediu correção/);
  const aj = fs.readFileSync(path.join(dest, 'SGO_Ajuda_Assistencia.js'), 'utf8');
  assert.match(aj, /Reabrir para correção/); assert.match(aj, /Desfazer conclusão para corrigir/); assert.match(aj, /Pedir correção/);
});
