// Assistência técnica, etapa 4 do estudo de 22/10/2026: o cliente aprova, recusa ou pede ajuste no orçamento do chamado por um
// link (sem login) ou pelo portal "Meus chamados". Código real num contexto isolado (tests/_assistencia_ambiente.cjs); só dados
// de teste; relógio fixo; trava não reentrante. A rota pública do servidor (sgo_servidor) tem os próprios testes.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { ambiente, ok, abrirChamado, ASSINATURA } = require('./_assistencia_ambiente.cjs');

const ITENS = [{ tipo: 'SERVICO', descricao: 'Mão de obra de troca', quantidade: 1, valorUnitario: 350 }, { tipo: 'PECA', descricao: 'Placa de controle', codigo: 'PC-1', quantidade: 1, valorUnitario: 900 }];
const SERVICO = [{ tipo: 'SERVICO', descricao: 'Ajuste e regulagem', quantidade: 2, valorUnitario: 180.5 }];
const CTX = { ip: '203.0.113.7', navegador: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) teste' };
const APROVA = { decisao: 'APROVADO', nome: 'Rui Responsável Teste', cargo: 'Gerente de enfermagem', documento: '529.982.247-25', email: 'rui@alfa.exemplo.test', concordo: true, assinatura: ASSINATURA };
const sha = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
const plano = (x) => JSON.parse(JSON.stringify(x));

function amb0(o) {
  const amb = ambiente(o);
  amb.ctx.ScriptApp.getService = () => ({ getUrl: () => 'https://sgo.teste/' });
  return amb;
}
/** Chamado triado para orçamento, preenchido e emitido pelo Comercial. */
function orcEmitido(amb, itens, equipamentoId) {
  const c = abrirChamado(amb, equipamentoId ? { equipamentoId } : undefined);
  ok(amb.api('s_gil', 'triagem', { id: c.id, checklist: { sintomas_confirmados: 'Confirmado', risco_operar: 'Médio', diagnostico_preliminar: 'Placa de controle queimada' }, acao: 'AGUARDANDO_ORCAMENTO', orcamentoDescricao: 'Troca da placa de controle (fora do contrato)' }));
  const orc = amb.tabelas.ATEC_ORCAMENTOS.filter((o) => o.CHAMADO_ID === c.id).pop();
  ok(amb.api('s_gaspar', 'salvarOrcamento', { id: orc.ID, itens: itens || ITENS, condicoes: 'Pagamento em 28 dias. Garantia de 90 dias.' }));
  ok(amb.api('s_gaspar', 'emitirOrcamento', { id: orc.ID }));
  return { c, orc: amb.tabelas.ATEC_ORCAMENTOS.find((o) => o.ID === orc.ID) };
}
/** Envia com link pelo Enviar documento e devolve o token lido do e-mail (o único lugar onde ele existe). */
function enviar(amb, id, pedidoId) {
  const antes = amb.emails.length;
  const r = ok(amb.api('s_gaspar', 'enviarOrcamento', { id, para: [{ nome: 'Rui', email: 'rui@alfa.exemplo.test' }], pedidoId: pedidoId || 'orc-teste-' + Math.random().toString(36).slice(2, 10) }));
  const em = amb.emails[amb.emails.length - 1];
  assert.equal(amb.emails.length, antes + 1, 'um e-mail por envio');
  const m = /https:\/\/sgo\.teste\/orcamento\/#([a-f0-9]{64})/.exec(em.body + ' ' + em.htmlBody);
  assert.ok(m, 'o e-mail leva o link');
  return { r, token: m[1], email: em };
}
const ver = (amb, t) => plano(amb.ctx.Assistencia_orcLinkVer_(t, CTX));
const responder = (amb, t, d) => plano(amb.ctx.Assistencia_orcLinkResponder_(t, d, CTX));

// ------------------------------------------------------------------ token
test('link: token de 32 bytes no e-mail, só o resumo SHA-256 gravado, validade de 30 dias (configurável), PDF anexado e link clicável', () => {
  const amb = amb0();
  const { orc } = orcEmitido(amb);
  const { token, email, r } = enviar(amb, orc.ID, 'orc-teste-0001');
  assert.equal(token.length, 64);
  const l = amb.tabelas.ATEC_ORC_LINKS;
  assert.equal(l.length, 1);
  assert.equal(l[0].TOKEN_SHA256, sha('ATEC-ORC-LINK|' + token));
  assert.equal(l[0].SITUACAO, 'ATIVO');
  assert.equal(l[0].VALIDO_ATE.slice(0, 10), '2026-11-18', '30 dias corridos');
  // o token não aparece em nenhuma tabela
  const tudo = JSON.stringify(amb.tabelas);
  assert.ok(!tudo.includes(token), 'token gravado em alguma tabela');
  assert.match(email.htmlBody, /<a href="https:\/\/sgo\.teste\/orcamento\/#[a-f0-9]{64}"/, 'link clicável no e-mail');
  assert.ok((email.attachments || []).length >= 1, 'PDF do orçamento anexado');
  assert.match(email.body, /Ver e responder o orçamento/);
  assert.ok(amb.tabelas.ATEC_ORCAMENTOS.find((o) => o.ID === orc.ID).ENVIADO_EM, '"enviado em" gravado pelo Enviar documento');
  assert.match(r.message, /link de aceite/);
  // o mesmo pedido não gera outro link nem outro e-mail
  const n = amb.emails.length;
  const rep = ok(amb.api('s_gaspar', 'enviarOrcamento', { id: orc.ID, para: ['rui@alfa.exemplo.test'], pedidoId: 'orc-teste-0001' }));
  assert.equal(rep.repetido, true); assert.equal(amb.emails.length, n); assert.equal(amb.tabelas.ATEC_ORC_LINKS.length, 1);
  // validade configurável nas Regras da assistência
  const amb2 = amb0();
  amb2.tabelas.ATEC_CONFIG = [{ ID: 'cfg1', CHAVE: 'REGRAS', VERSAO: 2, VALOR_JSON: JSON.stringify({ orcamentoLink: { dias: 10 } }), ATUALIZADO_EM: '2026-10-19T09:00:00' }];
  const o2 = orcEmitido(amb2).orc;
  enviar(amb2, o2.ID);
  assert.equal(amb2.tabelas.ATEC_ORC_LINKS[0].VALIDO_ATE.slice(0, 10), '2026-10-29');
  assert.throws(() => amb2.ctx.Ast_validarRegras_(Object.assign(amb2.ctx.Ast_copia_(amb2.ctx.Ast_regras_()), { orcamentoLink: { dias: 0 } })), /1 a 90 dias/);
});

test('reenviar gera link novo e invalida o anterior; token inexistente, malformado, invalidado e vencido recebem a mesma resposta', () => {
  const amb = amb0();
  const { orc } = orcEmitido(amb);
  const t1 = enviar(amb, orc.ID).token;
  assert.equal(ver(amb, t1).ok, true);
  const t2 = enviar(amb, orc.ID).token;
  assert.notEqual(t1, t2);
  const ls = amb.tabelas.ATEC_ORC_LINKS;
  assert.deepEqual(ls.map((l) => l.SITUACAO), ['INVALIDADO', 'ATIVO']);
  assert.match(ls[0].FIM_MOTIVO, /novo envio/);
  const base = ver(amb, 'f'.repeat(64));
  assert.equal(base.ok, false); assert.equal(base.codigo, 'INDISPONIVEL');
  assert.match(base.message, /não está disponível/); assert.ok(base.contato && base.contato.nome === 'Metrolabs');
  assert.deepEqual(ver(amb, t1), base, 'invalidado = inexistente');
  assert.deepEqual(ver(amb, 'abc'), base, 'malformado = inexistente');
  assert.deepEqual(ver(amb, ''), base);
  assert.deepEqual(responder(amb, t1, APROVA), base, 'responder pelo link antigo também');
  assert.deepEqual(plano(amb.ctx.Assistencia_orcLinkPdf_(t1)), base);
  // o link ativo abre e conta a visita; o PDF baixa
  const v = ver(amb, t2);
  assert.equal(v.orcamento.estado, 'ABERTO');
  assert.equal(v.orcamento.totalTxt, 'R$ 1.250,00');
  assert.equal(v.orcamento.itens[1].unitarioTxt, 'R$ 900,00');
  assert.ok(!JSON.stringify(v).includes('GASPAR'), 'sem nomes da equipe');
  assert.equal(amb.tabelas.ATEC_ORC_LINKS[1].VISTAS, 1);
  assert.ok(amb.tabelas.ATEC_ORC_LINKS[1].VISTO_EM);
  const pdf = plano(amb.ctx.Assistencia_orcLinkPdf_(t2));
  assert.equal(pdf.ok, true); assert.match(Buffer.from(pdf.base64, 'base64').toString('utf8'), /%PDF/);
  // gerar e copiar link também troca o link
  const cp = ok(amb.api('s_gaspar', 'orcLinkCopiar', { id: orc.ID }));
  assert.match(cp.url, /^https:\/\/sgo\.teste\/orcamento\/#[a-f0-9]{64}$/);
  assert.deepEqual(ver(amb, t2), base);
  // vencido (link de 30 dias): igual ao inexistente
  const t3 = cp.url.split('#')[1];
  amb.mudar('2026-11-20T10:00:00-03:00');
  assert.deepEqual(ver(amb, t3), base);
  // invalidar exige motivo; sem link ativo, diz que nada mudou
  assert.match(amb.api('s_gaspar', 'orcLinkInvalidar', { id: orc.ID, motivo: 'x' }).message, /motivo/);
});

test('invalidar pela gestão e revisão do orçamento revogam o link; quem não vê valores não envia', () => {
  const amb = amb0();
  const { orc } = orcEmitido(amb);
  const t = enviar(amb, orc.ID).token;
  assert.match(amb.api('s_tiago', 'enviarOrcamento', { id: orc.ID, para: ['rui@alfa.exemplo.test'] }).message, /valores de orçamento/);
  ok(amb.api('s_gaspar', 'orcLinkInvalidar', { id: orc.ID, motivo: 'Enviado ao contato errado' }));
  assert.equal(ver(amb, t).codigo, 'INDISPONIVEL');
  assert.match(amb.api('s_gaspar', 'orcLinkInvalidar', { id: orc.ID, motivo: 'De novo sem link' }).message, /não tem link ativo/);
  const t2 = enviar(amb, orc.ID).token;
  ok(amb.api('s_gaspar', 'revisarOrcamento', { id: orc.ID }));
  assert.equal(amb.tabelas.ATEC_ORC_LINKS.pop().SITUACAO, 'SUBSTITUIDO');
  assert.equal(ver(amb, t2).codigo, 'INDISPONIVEL');
});

// ------------------------------------------------------------------ aprovação
test('aprovação pelo link: mesmo estado da aprovação manual, pedido de compra da peça, trilha com resumos, assinatura, comprovante e confirmação ao cliente', () => {
  // referência: aprovação manual com o aceite anexado
  const m = amb0();
  const rm = orcEmitido(m);
  ok(m.api('s_gaspar', 'decidirOrcamento', { id: rm.orc.ID, decisao: 'APROVADO', aceitePor: 'Rui Responsável Teste', aceite: { nome: 'aceite.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF aceite').toString('base64') } }));
  const cm = m.tabelas.ATEC_CHAMADOS[0], om = m.tabelas.ATEC_ORCAMENTOS[0];

  const amb = amb0();
  const { c, orc } = orcEmitido(amb);
  const { token } = enviar(amb, orc.ID);
  const emailsAntes = amb.emails.length;
  const r = responder(amb, token, APROVA);
  assert.equal(r.ok, true, r.message);
  assert.match(r.message, /Recebemos a sua aprovação/); assert.match(r.message, /rui@alfa\.exemplo\.test/);
  assert.equal(r.orcamento.estado, 'RESPONDIDO'); assert.equal(r.orcamento.resposta.por, 'Rui Responsável Teste');
  const o = amb.tabelas.ATEC_ORCAMENTOS.find((x) => x.ID === orc.ID), ch = amb.tabelas.ATEC_CHAMADOS.find((x) => x.ID === c.id);
  // mesmo estado da aprovação manual
  assert.equal(o.SITUACAO, om.SITUACAO);
  assert.equal(ch.SITUACAO, cm.SITUACAO); assert.equal(ch.SITUACAO, 'AGUARDANDO_PECA');
  assert.equal(ch.PECA_DESCRICAO, cm.PECA_DESCRICAO);
  assert.equal(o.ACEITE_CANAL, 'LINK'); assert.equal(om.ACEITE_CANAL, 'MANUAL');
  assert.equal(o.ACEITE_POR, 'Rui Responsável Teste (Gerente de enfermagem)');
  // pedido em Compras pelo caminho de sempre, em nome de quem enviou o orçamento
  const reqs = amb.tabelas.CMP_REQUISICOES || [];
  assert.equal(reqs.length, (m.tabelas.CMP_REQUISICOES || []).length);
  assert.equal(reqs.length, 1, 'um pedido por peça');
  assert.equal(reqs[0].SOLICITANTE_ID, 'u_gc');
  assert.match(reqs[0].FINALIDADE, /Peça para o chamado/);
  assert.ok(amb.tabelas.ATEC_CHAMADOS.find((x) => x.ID === c.id).REQUISICAO_NUMERO);
  // trilha: uma linha, com os resumos
  const a = amb.tabelas.ATEC_ORC_ACEITES;
  assert.equal(a.length, 1);
  assert.equal(a[0].CANAL, 'LINK'); assert.equal(a[0].DECISAO, 'APROVADO'); assert.equal(a[0].IP, '203.0.113.7'); assert.match(a[0].NAVEGADOR, /iPhone/);
  assert.equal(a[0].DOCUMENTO, '52998224725'); assert.equal(a[0].EMAIL, 'rui@alfa.exemplo.test'); assert.equal(a[0].EM, '2026-10-19T10:00:00');
  assert.equal(a[0].CONTEUDO_SHA256, amb.ctx.AstL_conteudo_(o).sha);
  assert.equal(a[0].CONTEUDO_SHA256, amb.tabelas.ATEC_ORC_LINKS[0].CONTEUDO_SHA256, 'o conteúdo aceito é o mesmo do envio');
  assert.match(a[0].PDF_SHA256, /^[a-f0-9]{64}$/);
  assert.match(a[0].ASSINATURA_SHA256, /^[a-f0-9]{64}$/);
  assert.equal(a[0].REGISTRO_SHA256, amb.ctx.AstL_hashRegistro_(a[0]));
  assert.equal(a[0].ANTERIOR_SHA256, '');
  const assin = amb.arquivos[a[0].ASSINATURA_ARQUIVO_ID];
  assert.ok(assin && /Assinatura do aceite/.test(assin.nome) && assin.mime === 'image/png');
  assert.equal(amb.tabelas.ATEC_ORC_LINKS[0].SITUACAO, 'RESPONDIDO');
  // comprovante ligado ao orçamento como o aceite e na pasta do cliente
  const comp = amb.arquivos[o.ACEITE_ARQUIVO_ID];
  assert.ok(comp && /^Comprovante de aprovacao - /.test(comp.nome), 'comprovante gerado');
  assert.ok(Object.values(amb.arquivos).some((f) => /^Comprovante de aprovacao - .*\.html$/.test(f.nome) && /Conferência de integridade/.test(f.bytes.toString('utf8')) && f.bytes.toString('utf8').includes(a[0].REGISTRO_SHA256)), 'HTML do comprovante com os resumos');
  // confirmação ao cliente com o comprovante; nada de WhatsApp ao cliente
  const conf = amb.emails.slice(emailsAntes).find((e) => /Aprovação registrada/.test(e.subject));
  assert.ok(conf, 'confirmação ao cliente');
  assert.equal(conf.to, 'rui@alfa.exemplo.test');
  assert.equal((conf.attachments || []).length, 1);
  assert.equal(amb.whats.filter((w) => JSON.stringify(w).includes('alfa')).length, 0);
  // avisos AT16 à gestão técnica e ao Comercial
  const avisos = amb.tabelas.ATEC_AVISOS.filter((v) => v.TIPO === 'ORCAMENTO_APROVADO');
  assert.ok(avisos.some((v) => v.DESTINATARIO_ID === 'u_gt') && avisos.some((v) => v.DESTINATARIO_ID === 'u_gc'));
  assert.ok(avisos.every((v) => /pelo link do orçamento/.test(v.TITULO)));
  // resposta única: o link responde "já respondido", sem registrar nada
  const r2 = responder(amb, token, Object.assign({}, APROVA, { decisao: 'RECUSADO', texto: 'Mudamos de ideia' }));
  assert.equal(r2.ok, false); assert.equal(r2.codigo, 'RESPONDIDO'); assert.match(r2.message, /já foi respondido em 19\/10\/2026 10:00 por Rui Responsável Teste/);
  assert.equal(amb.tabelas.ATEC_ORC_ACEITES.length, 1);
  const v = ver(amb, token);
  assert.equal(v.orcamento.estado, 'RESPONDIDO'); assert.equal(v.orcamento.resposta.decisaoNome, 'Aprovado');
  // registro manual depois também é recusado
  assert.match(amb.api('s_gaspar', 'decidirOrcamento', { id: orc.ID, decisao: 'RECUSADO', aceitePor: 'Fulano', texto: 'Teste de recusa' }).message, /só orçamento emitido/);
  // tela interna: bloco do aceite
  const det = ok(amb.api('s_gil', 'chamado', { id: c.id }));
  const ac = det.orcamentos.find((x) => x.id === orc.ID).aceite;
  assert.equal(ac.link.situacao, 'RESPONDIDO'); assert.equal(ac.resposta.nome, 'Rui Responsável Teste'); assert.equal(ac.resposta.integro, true); assert.equal(ac.resposta.conteudoConfere, true);
  assert.equal(ac.resposta.documento, '***.982.247-**'); assert.ok(ac.comprovanteUrl);
  assert.equal(det.orcamentos.find((x) => x.id === orc.ID).aceiteUrl, ac.comprovanteUrl);
  assert.equal(ok(amb.api('s_mara', 'chamado', { id: c.id })).orcamentos[0].aceite, undefined, 'sem valores, sem o bloco do aceite');
});

test('aprovação só de serviço vai a Planejado; validação dos campos; conteúdo mudado e orçamento vencido não aprovam', () => {
  const amb = amb0();
  const { c, orc } = orcEmitido(amb, SERVICO);
  const { token } = enviar(amb, orc.ID);
  const e = (d, campo) => { const r = responder(amb, token, Object.assign({}, APROVA, d)); assert.equal(r.codigo, 'ENTRADA', JSON.stringify(r)); assert.equal(r.campo, campo); return r; };
  e({ assinatura: '' }, 'assinatura');
  e({ concordo: false }, 'concordo');
  e({ documento: '123.456.789-00' }, 'documento');
  e({ nome: 'Rui' }, 'nome');
  e({ email: 'rui@' }, 'email');
  e({ cargo: '' }, 'cargo');
  e({ decisao: 'TALVEZ' }, 'decisao');
  e({ decisao: 'RECUSADO', texto: '' }, 'texto');
  assert.equal(amb.tabelas.ATEC_ORC_ACEITES.length, 0, 'nada registrado nas recusas de entrada');
  // conteúdo mudado depois do envio: recusa, nada registrado
  const linha = amb.tabelas.ATEC_ORCAMENTOS.find((x) => x.ID === orc.ID), itens0 = linha.ITENS_JSON;
  linha.ITENS_JSON = JSON.stringify([{ tipo: 'SERVICO', descricao: 'Ajuste e regulagem', quantidade: 2, valorUnitario: 1.5 }]);
  const rc = responder(amb, token, APROVA);
  assert.equal(rc.codigo, 'CONTEUDO'); assert.equal(amb.tabelas.ATEC_ORC_ACEITES.length, 0);
  linha.ITENS_JSON = itens0;
  // documento é opcional
  const r = responder(amb, token, Object.assign({}, APROVA, { documento: '' }));
  assert.equal(r.ok, true, r.message);
  assert.equal(amb.tabelas.ATEC_CHAMADOS.find((x) => x.ID === c.id).SITUACAO, 'PLANEJADO');
  assert.equal((amb.tabelas.CMP_REQUISICOES || []).length, 0);
  // vencido: a página mostra o orçamento com "vencido", sem aprovar
  const amb2 = amb0();
  const o2 = orcEmitido(amb2).orc;
  const t2 = enviar(amb2, o2.ID).token;
  amb2.mudar('2026-11-05T10:00:00-03:00');
  const v2 = ver(amb2, t2);
  assert.equal(v2.ok, true); assert.equal(v2.orcamento.estado, 'VENCIDO'); assert.equal(v2.orcamento.vencido, true);
  assert.equal(responder(amb2, t2, APROVA).codigo, 'VENCIDO');
  assert.match(amb2.api('s_gaspar', 'enviarOrcamento', { id: o2.ID, para: ['rui@alfa.exemplo.test'] }).message, /venceu em/);
});

// ------------------------------------------------------------------ recusa e ajuste
test('recusa e pedido de ajuste pelo link viram pendência da gestão (Caixa de decisões) e avisam pelo AT17; ajuste ganha revisão', () => {
  const amb = amb0();
  const a1 = orcEmitido(amb);
  const t1 = enviar(amb, a1.orc.ID).token;
  const r = responder(amb, t1, { decisao: 'RECUSADO', nome: 'Rui Responsável Teste', email: 'rui@alfa.exemplo.test', texto: 'Valor acima do previsto para este semestre' });
  assert.equal(r.ok, true, r.message);
  const o1 = amb.tabelas.ATEC_ORCAMENTOS.find((x) => x.ID === a1.orc.ID), c1 = amb.tabelas.ATEC_CHAMADOS.find((x) => x.ID === a1.c.id);
  assert.equal(o1.SITUACAO, 'RECUSADO'); assert.equal(o1.DECISAO_TEXTO, 'Valor acima do previsto para este semestre');
  assert.equal(c1.SITUACAO, 'AGUARDANDO_ORCAMENTO'); assert.match(c1.PROXIMA_ACAO, /negociar.*cobrar a visita.*encerrar/);
  assert.equal(amb.tabelas.ATEC_ORC_ACEITES[0].ASSINATURA_ARQUIVO_ID, '');
  assert.ok(!o1.ACEITE_ARQUIVO_ID, 'recusa não gera comprovante de aprovação');
  assert.ok(amb.emails.some((e) => /Recusa registrada/.test(e.subject)), 'confirmação da recusa ao cliente');
  let p = amb.pend('s_gil').filter((x) => x.tipo === 'ast_orc_recusado');
  assert.equal(p.length, 1); assert.match(p[0].detalhe, /Valor acima do previsto/); assert.match(p[0].oQueFazer, /cobrar a visita/);
  assert.ok(amb.tabelas.ATEC_AVISOS.some((v) => v.TIPO === 'ORCAMENTO_RECUSADO' && v.DESTINATARIO_ID === 'u_gc'));
  // ajuste em outro chamado
  const a2 = orcEmitido(amb, null, 'eq2');
  const t2 = enviar(amb, a2.orc.ID).token;
  assert.equal(responder(amb, t2, { decisao: 'AJUSTE', nome: 'Rui Responsável Teste', email: 'rui@alfa.exemplo.test', texto: 'Separar a peça em duas parcelas' }).ok, true);
  assert.equal(amb.tabelas.ATEC_ORCAMENTOS.find((x) => x.ID === a2.orc.ID).SITUACAO, 'AJUSTE');
  p = amb.pend('s_gil').filter((x) => x.tipo === 'ast_orc_ajuste');
  assert.equal(p.length, 1); assert.match(p[0].oQueFazer, /nova revisão/i);
  assert.ok(amb.tabelas.ATEC_ORC_ACEITES[1].ANTERIOR_SHA256 === amb.tabelas.ATEC_ORC_ACEITES[0].REGISTRO_SHA256, 'trilha encadeada');
  // a gestão revisa: a pendência sai e a revisão nova é enviada com link novo
  const rev = ok(amb.api('s_gaspar', 'revisarOrcamento', { id: a2.orc.ID }));
  assert.equal(amb.pend('s_gil').filter((x) => x.tipo === 'ast_orc_ajuste').length, 0);
  assert.equal(amb.tabelas.ATEC_CHAMADOS.find((x) => x.ID === a2.c.id).ORCAMENTO_ID, rev.orcamento.id);
  ok(amb.api('s_gaspar', 'salvarOrcamento', { id: rev.orcamento.id, itens: ITENS, condicoes: 'Peça em duas parcelas' }));
  ok(amb.api('s_gaspar', 'emitirOrcamento', { id: rev.orcamento.id }));
  const t3 = enviar(amb, rev.orcamento.id).token;
  assert.equal(ver(amb, t3).orcamento.revisao, 1);
  assert.equal(ver(amb, t2).codigo, 'INDISPONIVEL', 'o link da revisão anterior não abre mais');
});

// ------------------------------------------------------------------ portal
test('portal "Meus chamados": o cliente vê os seus orçamentos com valores e responde sem link; outro cliente não responde', () => {
  const amb = amb0();
  const { c, orc } = orcEmitido(amb, SERVICO);
  const po = ok(amb.api('s_cliente.alfa', 'portal', {}));
  assert.equal(po.orcamentos.length, 1); assert.equal(po.orcamentos[0].estado, 'ABERTO'); assert.equal(po.orcamentos[0].totalTxt, 'R$ 361,00');
  assert.equal(ok(amb.api('s_cliente.beta', 'portal', {})).orcamentos.length, 0);
  assert.match(amb.api('s_cliente.beta', 'responderOrcamento', Object.assign({ id: orc.ID }, APROVA)).message, /não foi encontrado entre os seus/);
  assert.match(amb.api('s_cliente.alfa', 'responderOrcamento', Object.assign({ id: orc.ID }, APROVA, { assinatura: '' })).message, /Assine no quadro/);
  const r = ok(amb.api('s_cliente.alfa', 'responderOrcamento', Object.assign({ id: orc.ID, navegador: 'Teste portal' }, APROVA)));
  assert.match(r.message, /Recebemos a sua aprovação/);
  const a = amb.tabelas.ATEC_ORC_ACEITES[0];
  assert.equal(a.CANAL, 'PORTAL'); assert.equal(a.USUARIO_ID, 'u_cli'); assert.equal(a.LINK_ID, '');
  assert.equal(amb.tabelas.ATEC_CHAMADOS.find((x) => x.ID === c.id).SITUACAO, 'PLANEJADO');
  assert.equal(amb.tabelas.ATEC_ORCAMENTOS[0].ACEITE_CANAL, 'PORTAL');
  assert.match(amb.api('s_cliente.alfa', 'responderOrcamento', Object.assign({ id: orc.ID }, APROVA)).message, /já foi respondido/);
  assert.match(amb.api('s_cliente.alfa', 'enviarOrcamento', { id: orc.ID }).message, /equipe interna/);
});
