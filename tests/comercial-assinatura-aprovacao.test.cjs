// Comercial, etapa 1 da assinatura (10/11/2026): assinatura do cliente pelo link aprova a proposta e ganha a oportunidade
// (núcleo comum ComP_aplicarAprovacao_), confirmação imediata por e-mail, e-mail diferente do convidado, janela do link
// (LINK_EMAIL/LINK_ENVIADO_EM, cancelamento do anterior só depois do e-mail aceito), ordem de compra, proteções da proposta
// assinada, registro posterior de assinatura antiga e GANHA_EM com hora/GANHA_VIA. Código real (tests/_comercial_ambiente.cjs).
// Só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente: ambienteBase, oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');
// 10/11/2026 (brechas de preço): item sem custo leva a proposta para a Diretoria; estes testes não tratam de custo e dão aos itens sem
// custo 30% do preço antes de concluir (opção custoAvulso do ambiente). As regras de custo estão em comercial-precos-brechas.test.cjs.
const ambiente = (o) => ambienteBase(Object.assign({ custoAvulso: 0.3 }, o || {}));

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const PNG = 'data:image/png;base64,iVBORw0KGgo' + 'A'.repeat(1200);
const ARQ = (nome) => ({ nome: nome || 'aceite.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF aceite').toString('base64') });

/** Ambiente com as funções do link público (AstL_*, Ast_privado_) da Assistência, que a assinatura usa. */
function amb() {
  const a = ambiente();
  for (const f of ['SGO_Assistencia_Config.js', 'SGO_Assistencia_Aceite.js']) vm.runInContext(fs.readFileSync(path.join(PASTA, f), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  return a;
}
/** Proposta pronta com documento gerado (e, se pedido, assinada pela Metrolab). */
function pronta(a, assinarMetrolab) {
  const { oportunidade, contato } = oportunidadeDeTeste(a);
  const np = ok(a.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  ok(a.api('s_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id: np.proposta.id, escopo: 'Qualificação térmica da autoclave da CME.', contatoId: contato.id,
    itens: [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '4.500,00', equipamentoId: 'eq1' }], condicoes: { pagamento: 'Boleto em 28 dias' } }));
  ok(a.api('s_vera', 'concluirProposta', { id: np.proposta.id }));
  ok(a.api('s_vera', 'gerarDocumento', { id: np.proposta.id }));
  const p = ok(a.api('s_vera', 'proposta', { id: np.proposta.id })).proposta;
  if (assinarMetrolab !== false) ok(a.api('s_vera', 'assinarResponsavel', { id: p.id, pdfId: p.pdfId, marca: p.marcaConteudo, concordo: true, assinatura: PNG }));
  return { o: oportunidade, p, row: () => a.tabelas.COM_PROPOSTAS.find((x) => x.ID === p.id), opo: () => a.tabelas.COM_OPORTUNIDADES.find((x) => x.ID === oportunidade.id) };
}
const tokenDe = (r) => r.caminho.split('#')[1];
const assinar = (a, token, email, extra) => a.ctx.ComP_assinaturaResponder_(token, Object.assign({ decisao: 'APROVADO', nome: 'Ana Enfermeira Teste', cargo: 'Coordenadora da CME', email: email || 'ana@alfa.exemplo.test', concordo: true, assinatura: PNG }, extra || {}), { ip: '10.0.0.1', navegador: 'Navegador de teste' });
const hist = (a, id) => a.tabelas.COM_HISTORICO.filter((h) => h.ENTIDADE_ID === id);
const atv = (a, id) => a.tabelas.ATV_ATIVIDADES.find((x) => x.ID === id);
/** Link criado como a versão anterior fazia (só Properties, sem envio registrado): a proposta continua pronta. */
function linkAntigo(a, pid, email) {
  const tok = 'ab'.repeat(32), hash = a.ctx.Com_marca_(tok), reg = JSON.parse(a.props['COM_ASS_RESP_' + pid]);
  reg.clienteEmailEsperado = email; reg.linkHash = hash;
  a.props['COM_ASS_RESP_' + pid] = JSON.stringify(reg); a.props['COM_ASS_LINK_' + hash] = pid;
  return tok;
}
/** Assinatura feita antes desta versão: guardada em Properties, sem mudar a proposta (como era). */
function assinaturaAntiga(a, x, email) {
  const tok = linkAntigo(a, x.p.id, 'ana@alfa.exemplo.test');
  const apl = a.ctx.ComP_aplicarAssinatura_, conf = a.ctx.ComP_confirmarAssinatura_;
  a.ctx.ComP_aplicarAssinatura_ = () => ({}); a.ctx.ComP_confirmarAssinatura_ = () => ({});
  try { assert.equal(assinar(a, tok, email).ok, true); } finally { a.ctx.ComP_aplicarAssinatura_ = apl; a.ctx.ComP_confirmarAssinatura_ = conf; }
  return tok;
}

// ------------------------------------------------------------------ item 1: assinatura aprova e ganha
test('assinatura pelo link: proposta aprovada, oportunidade ganha com hora, etapa de 100%, aceite = PDF assinado, banco de preços, retorno e vencimento encerrados', () => {
  const a = amb(), x = pronta(a);
  a.mudar('2026-11-01T09:30:00-03:00');
  a.ctx.ComP_rotinaValidade_(); // proposta ainda pronta: sem aviso; depois do link vira enviada
  const l = ok(a.api('s_vera', 'linkAssinatura', { id: x.p.id, email: 'ana@alfa.exemplo.test' }));
  assert.equal(x.row().SITUACAO, 'ENVIADA');
  const retorno = x.row().RETORNO_ATIVIDADE_ID; assert(retorno);
  a.ctx.ComP_rotinaValidade_();
  const venc = x.row().VENCIMENTO_ATIVIDADE_ID; assert(venc, 'aviso de vencimento criado');
  a.mudar('2026-11-01T14:47:00-03:00');
  const r = assinar(a, tokenDe(l));
  assert.equal(r.ok, true); assert.equal(r.orcamento.estado, 'RESPONDIDO');
  const p = x.row(), o = x.opo();
  assert.equal(p.SITUACAO, 'APROVADA'); assert.equal(p.ACEITE_TIPO, 'ASSINATURA_ELETRONICA'); assert.equal(p.PEDIDO_SITUACAO, 'SEM_PASSAGEM');
  assert.match(p.RESPOSTA_EM, /^2026-11-01T14:47/); assert(p.ACEITE_ARQUIVO_ID); assert.equal(p.ACEITE_ARQUIVO_ID, p.ASSINATURA_PDF_ID);
  assert.equal(p.ASSINADA_POR_NOME, 'Ana Enfermeira Teste'); assert.equal(p.ASSINADA_POR_EMAIL, 'ana@alfa.exemplo.test');
  assert.equal(o.SITUACAO, 'GANHA'); assert.equal(o.GANHA_EM, '2026-11-01T14:47'); assert.equal(o.GANHA_VIA, 'ASSINATURA'); assert.equal(o.ETAPA, 'ENG_5');
  assert.equal(atv(a, retorno).SITUACAO, 'Concluída'); assert.equal(atv(a, venc).SITUACAO, 'Concluída');
  assert(!a.tabelas.ATV_ATIVIDADES.some((t) => /Retorno sobre a proposta/.test(t.TITULO) && !['Concluída', 'Cancelada'].includes(t.SITUACAO)), 'nenhum retorno aberto');
  assert((a.tabelas.COM_PRECOS || []).some((r2) => r2.REF_ID === x.p.id && r2.RESULTADO === 'GANHO'), 'banco de preços como ganho');
  assert(a.tabelas.COM_CONTATOS_REGISTRO.some((c) => c.OPORTUNIDADE_ID === x.o.id && c.RESPONDEU === 'SIM' && /assinou a proposta/.test(c.RESUMO)));
  assert(hist(a, x.p.id).some((h) => h.TIPO === 'ASSINATURA_CLIENTE')); assert(hist(a, x.p.id).some((h) => h.TIPO === 'APROVADA'));
  assert(hist(a, x.o.id).some((h) => h.TIPO === 'GANHA' && /14:47/.test(h.TEXTO))); assert(hist(a, x.o.id).some((h) => h.TIPO === 'ETAPA' && h.PARA === 'Aprovado e aguardando faturamento'));
  // avisos: gestão com e-mail no expediente; o vendedor no sistema (o e-mail dele já saiu na hora)
  const av = a.tabelas.COM_AVISOS.filter((v) => v.REF_ID === x.p.id && v.TIPO === 'RESPOSTA_APROVADA');
  assert(av.some((v) => v.DESTINATARIO_ID === 'u_gc' && v.EMAIL_SITUACAO === 'PENDENTE'));
  assert(av.some((v) => v.DESTINATARIO_ID === 'u_ven' && v.EMAIL_SITUACAO === ''));
  a.tabelas.COM_AVISOS.forEach((v) => assert.doesNotMatch(v.TITULO + v.TEXTO, /R\$\s?\d/));
  // ficha: data e hora do ganho e por onde
  const f = ok(a.api('s_vera', 'oportunidade', { id: x.o.id })).oportunidade;
  assert.equal(f.ganhaEm, '01/11/2026 14:47'); assert.equal(f.ganhaVia, 'ASSINATURA'); assert.match(f.ganhaViaNome, /Assinatura do cliente/);
});

// ------------------------------------------------------------------ item 2 e 3: confirmação e e-mail diferente
test('confirmação imediata: vendedor em "para", cliente (digitado e convidado) em cópia, nome e resposta do vendedor, PDF assinado e destaque do e-mail diferente', () => {
  const a = amb(), x = pronta(a);
  const l = ok(a.api('s_vera', 'linkAssinatura', { id: x.p.id, email: 'ana@alfa.exemplo.test' }));
  const n = a.emails.length;
  assert.equal(assinar(a, tokenDe(l), 'Diretor@Alfa.Exemplo.test').ok, true, 'e-mail diferente do convidado não bloqueia');
  assert.equal(a.emails.length, n + 1);
  const m = a.emails[a.emails.length - 1];
  assert.equal(m.to, 'vera@exemplo.test'); assert.equal(m.cc, 'diretor@alfa.exemplo.test,ana@alfa.exemplo.test');
  assert.equal(m.replyTo, 'vera@exemplo.test'); assert.equal(m.name, 'Vera Vendedora Teste — Metrolabs');
  assert.equal(m.subject, 'Proposta PROP-2026-0001 rev.00 assinada por Ana Enfermeira Teste (Hospital Teste Alfa)');
  assert.equal(m.attachments.length, 1); assert.match(m.attachments[0].getName(), /Proposta assinada/);
  assert.equal(m.attachments[0].getName().replace(/\.pdf$/, ''), a.arquivos[x.row().ASSINATURA_PDF_ID].nome.replace(/\.pdf$/, ''));
  for (const corpo of [m.body, m.htmlBody]) { assert.match(corpo, /R\$ 4\.500,00/); assert.match(corpo, /Coordenadora da CME/); assert.match(corpo, /diferente do convidado \(ana@alfa\.exemplo\.test\)/); assert.match(corpo, /Próximos passos/); }
  assert(hist(a, x.p.id).some((h) => /e-mail diferente do convidado \(ana@alfa\.exemplo\.test\)/.test(h.TEXTO)));
  assert(hist(a, x.p.id).some((h) => h.TIPO === 'CONFIRMACAO_ASSINATURA' && /com cópia para diretor@alfa\.exemplo\.test, ana@alfa\.exemplo\.test/.test(h.TEXTO)));
  const tela = ok(a.api('s_vera', 'proposta', { id: x.p.id })).proposta;
  assert.equal(tela.assinaturaCliente.emailDiferente, true); assert.equal(tela.assinaturaCliente.emailConvidado, 'ana@alfa.exemplo.test');
});

test('mesmo e-mail do convite: uma cópia só e sem destaque; formato do e-mail continua conferido', () => {
  const a = amb(), x = pronta(a);
  const tok = tokenDe(ok(a.api('s_vera', 'linkAssinatura', { id: x.p.id, email: 'ana@alfa.exemplo.test' })));
  const r0 = assinar(a, tok, 'ana@alfa');
  assert.equal(r0.ok, false); assert.equal(r0.codigo, 'ENTRADA'); assert.equal(r0.campo, 'email');
  assert.equal(x.row().SITUACAO, 'ENVIADA', 'entrada inválida não muda nada');
  assert.equal(assinar(a, tok).ok, true);
  const m = a.emails[a.emails.length - 1];
  assert.equal(m.cc, 'ana@alfa.exemplo.test'); assert.doesNotMatch(m.body, /diferente do convidado/);
});

test('idempotente: a segunda assinatura com o mesmo link só devolve a situação (nada se repete)', () => {
  const a = amb(), x = pronta(a);
  const tok = tokenDe(ok(a.api('s_vera', 'linkAssinatura', { id: x.p.id, email: 'ana@alfa.exemplo.test' })));
  assert.equal(assinar(a, tok).ok, true);
  const conta = () => [a.emails.length, a.tabelas.COM_HISTORICO.length, a.tabelas.COM_CONTATOS_REGISTRO.length, (a.tabelas.COM_PRECOS || []).length, a.tabelas.COM_AVISOS.length, Object.keys(a.arquivos).length].join(',');
  const antes = conta(), ganhaEm = x.opo().GANHA_EM;
  const r = assinar(a, tok, 'outra@alfa.exemplo.test');
  assert.equal(r.ok, true); assert.equal(r.orcamento.estado, 'RESPONDIDO'); assert.equal(r.orcamento.resposta.por, 'Ana Enfermeira Teste');
  assert.equal(conta(), antes); assert.equal(x.opo().GANHA_EM, ganhaEm);
});

test('link antigo em proposta pronta: a assinatura conta como envio, aprova e não deixa retorno aberto', () => {
  const a = amb(), x = pronta(a);
  const tok = linkAntigo(a, x.p.id, 'ana@alfa.exemplo.test');
  assert.equal(x.row().SITUACAO, 'PRONTA');
  assert.equal(assinar(a, tok).ok, true);
  assert.equal(x.row().SITUACAO, 'APROVADA'); assert(x.row().ENVIADA_EM); assert.match(x.row().ENVIO_COMO, /Link de assinatura enviado para ana@alfa/);
  assert.equal(x.opo().SITUACAO, 'GANHA');
  assert(!a.tabelas.ATV_ATIVIDADES.some((t) => /Retorno sobre a proposta/.test(t.TITULO)), 'nenhum retorno criado');
});

test('confirmação que não sai: a aprovação fica, o vendedor é avisado no sistema e o histórico diz que não saiu', () => {
  const a = amb(), x = pronta(a);
  const tok = tokenDe(ok(a.api('s_vera', 'linkAssinatura', { id: x.p.id, email: 'ana@alfa.exemplo.test' })));
  a.ctx.MailApp.sendEmail = () => { throw new Error('servidor de e-mail fora do ar'); };
  assert.equal(assinar(a, tok).ok, true);
  assert.equal(x.row().SITUACAO, 'APROVADA'); assert.equal(x.opo().SITUACAO, 'GANHA');
  assert(hist(a, x.p.id).some((h) => h.TIPO === 'CONFIRMACAO_ASSINATURA' && /não saiu por e-mail \(servidor de e-mail fora do ar\)/.test(h.TEXTO)));
  assert(a.tabelas.COM_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_ven' && v.TIPO === 'CONFIRMACAO_NAO_SAIU'));
});

// ------------------------------------------------------------------ item 4: envio do link
test('envio do link: e-mail do vendedor (nome, resposta, cópia oculta, HTML, PDF), LINK_EMAIL/LINK_ENVIADO_EM, histórico, contato e pronta vira enviada', () => {
  const a = amb(), x = pronta(a);
  const det = ok(a.api('s_vera', 'proposta', { id: x.p.id })).proposta;
  assert.equal(det.linkEmailSugerido, 'ana@alfa.exemplo.test'); assert(det.emailsDoCliente.includes('ana@alfa.exemplo.test')); assert.equal(det.assinadaMetrolab, true); assert(!det.linkAtivo);
  const r = ok(a.api('s_vera', 'linkAssinatura', { id: x.p.id, email: 'ANA@alfa.exemplo.test' }));
  assert.equal(r.foraDosContatos, false); assert.match(r.caminho, /^\/assinar-proposta\/#[a-f0-9]{64}$/);
  const m = a.emails[a.emails.length - 1];
  assert.equal(m.to, 'ana@alfa.exemplo.test'); assert.equal(m.bcc, 'vera@exemplo.test'); assert.equal(m.replyTo, 'vera@exemplo.test'); assert.equal(m.name, 'Vera Vendedora Teste — Metrolabs');
  assert.equal(m.attachments.length, 1); assert.match(m.attachments[0].getName(), /^Proposta PROP-2026-0001 rev\.00\.pdf$/);
  for (const corpo of [m.body, m.htmlBody]) { assert.match(corpo, /Prezado\(a\) Ana Enfermeira Teste/); assert.match(corpo, /R\$ 4\.500,00/); assert.match(corpo, /03\/11\/2026/); assert.match(corpo, /nome completo, o cargo e o e-mail/); assert.match(corpo, /vera@exemplo\.test/); assert(corpo.includes(r.caminho.split('#')[1])); }
  const p = x.row();
  assert.equal(p.LINK_EMAIL, 'ana@alfa.exemplo.test'); assert.equal(p.LINK_ENVIADO_EM, '2026-10-19T10:00'); assert.equal(p.SITUACAO, 'ENVIADA');
  assert(hist(a, x.p.id).some((h) => h.TIPO === 'LINK_ASSINATURA' && /Link de assinatura enviado para ana@alfa\.exemplo\.test/.test(h.TEXTO)));
  assert(a.tabelas.COM_CONTATOS_REGISTRO.some((c) => c.OPORTUNIDADE_ID === x.o.id && /Link de assinatura enviado para ana@alfa/.test(c.RESUMO)));
  const det2 = ok(a.api('s_vera', 'proposta', { id: x.p.id })).proposta;
  assert.equal(det2.linkAtivo, true); assert.equal(det2.linkEmail, 'ana@alfa.exemplo.test'); assert.equal(det2.linkEnviadoEm, '19/10/2026 10:00');
});

test('outro link: exige confirmar o cancelamento; o anterior só morre depois que o e-mail novo sai', () => {
  const a = amb(), x = pronta(a);
  const t1 = tokenDe(ok(a.api('s_vera', 'linkAssinatura', { id: x.p.id, email: 'ana@alfa.exemplo.test' })));
  const sem = a.api('s_vera', 'linkAssinatura', { id: x.p.id, email: 'compras@alfa.exemplo.test' });
  assert.equal(sem.ok, false); assert.match(sem.message, /link ativo enviado para ana@alfa\.exemplo\.test em 19\/10\/2026 10:00/);
  // o e-mail novo não sai: nada muda e o anterior continua valendo (D11)
  const envia = a.ctx.MailApp.sendEmail, chaves = Object.keys(a.props).filter((k) => /^COM_ASS_LINK_/.test(k)).length;
  a.ctx.MailApp.sendEmail = () => { throw new Error('caixa recusou'); };
  const falha = a.api('s_vera', 'linkAssinatura', { id: x.p.id, email: 'compras@alfa.exemplo.test', substituir: true });
  assert.equal(falha.ok, false); assert.match(falha.message, /o link anterior, enviado para ana@alfa\.exemplo\.test, continua valendo/);
  assert.equal(Object.keys(a.props).filter((k) => /^COM_ASS_LINK_/.test(k)).length, chaves);
  assert.equal(a.ctx.ComP_assinaturaVer_(t1).ok, true); assert.equal(x.row().LINK_EMAIL, 'ana@alfa.exemplo.test');
  a.ctx.MailApp.sendEmail = envia;
  const r2 = ok(a.api('s_vera', 'linkAssinatura', { id: x.p.id, email: 'compras@alfa.exemplo.test', substituir: true }));
  assert.equal(r2.anteriorCancelado, 'ana@alfa.exemplo.test');
  assert.equal(a.ctx.ComP_assinaturaVer_(t1).codigo, 'INDISPONIVEL'); assert.equal(a.ctx.ComP_assinaturaVer_(tokenDe(r2)).ok, true);
  assert.equal(x.row().LINK_EMAIL, 'compras@alfa.exemplo.test');
  assert(hist(a, x.p.id).some((h) => /O link anterior, enviado para ana@alfa\.exemplo\.test em 19\/10\/2026 10:00, foi cancelado/.test(h.TEXTO)));
});

test('envio do link recusado: outro vendedor, gestão, e-mail inválido, sem assinatura da Metrolab e proposta já assinada', () => {
  const a = amb(), x = pronta(a, false);
  assert.match(a.api('s_vera', 'linkAssinatura', { id: x.p.id, email: 'ana@alfa.exemplo.test' }).message, /assinado pelo responsável/);
  ok(a.api('s_vera', 'assinarResponsavel', { id: x.p.id, pdfId: x.p.pdfId, marca: x.p.marcaConteudo, concordo: true, assinatura: PNG }));
  assert.equal(a.api('s_vito', 'linkAssinatura', { id: x.p.id, email: 'ana@alfa.exemplo.test' }).ok, false);
  assert.match(a.api('s_gaspar', 'linkAssinatura', { id: x.p.id, email: 'ana@alfa.exemplo.test' }).message, /só o responsável/);
  assert.match(a.api('s_vera', 'linkAssinatura', { id: x.p.id, email: 'ana@' }).message, /e-mail completo/);
  assert.equal(a.emails.length, 0); assert.equal(x.row().SITUACAO, 'PRONTA');
  const fora = ok(a.api('s_vera', 'linkAssinatura', { id: x.p.id, email: 'terceiro@outra.exemplo.test' }));
  assert.equal(fora.foraDosContatos, true); assert(hist(a, x.p.id).some((h) => /não é de nenhum contato cadastrado/.test(h.TEXTO)));
  assert.equal(assinar(a, tokenDe(fora)).ok, true);
  assert.match(a.api('s_vera', 'linkAssinatura', { id: x.p.id, email: 'ana@alfa.exemplo.test', substituir: true }).message, /o cliente já assinou/);
});

// ------------------------------------------------------------------ item 5: ordem de compra e tipo do aceite
test('ordem de compra: número, data (não futura), arquivo e tipo válidos são obrigatórios', () => {
  const a = amb(), x = pronta(a, false);
  const base = { id: x.p.id, resposta: 'APROVADA', texto: 'OC recebida', aceiteTipo: 'ORDEM_COMPRA', ocNumero: 'OC-4512', ocData: '2026-10-18', arquivo: ARQ('oc.pdf') };
  assert.match(a.api('s_vera', 'respostaCliente', Object.assign({}, base, { ocNumero: '  ' })).message, /número da ordem de compra/);
  assert.match(a.api('s_vera', 'respostaCliente', Object.assign({}, base, { ocData: '' })).message, /data da ordem de compra/);
  assert.match(a.api('s_vera', 'respostaCliente', Object.assign({}, base, { ocData: '2026-10-25' })).message, /está no futuro/);
  assert.match(a.api('s_vera', 'respostaCliente', Object.assign({}, base, { arquivo: null })).message, /arquivo da ordem de compra/);
  assert.match(a.api('s_vera', 'respostaCliente', Object.assign({}, base, { aceiteTipo: 'WHATSAPP' })).message, /tipo do aceite/);
  assert.match(a.api('s_vera', 'respostaCliente', { id: x.p.id, resposta: 'RECUSADA', motivo: a.ctx.Com_metodologia_().motivosPerda[0], texto: 'Achou caro demais para agora' }).message, /só se registra a aprovação/);
  assert.equal(x.row().SITUACAO, 'PRONTA');
});

test('ordem de compra na proposta pronta: vira enviada e aprovada sem retorno aberto, GANHA_VIA OC e o número vai aos setores', () => {
  const a = amb(), x = pronta(a, false);
  const r = ok(a.api('s_vera', 'respostaCliente', { id: x.p.id, resposta: 'APROVADA', texto: 'Cliente mandou a OC por e-mail', aceiteTipo: 'ORDEM_COMPRA', ocNumero: 'OC-4512', ocData: '2026-10-18', arquivo: ARQ('oc.pdf') }));
  assert.match(r.message, /ordem de compra nº OC-4512 de 18\/10\/2026/);
  const p = x.row(), o = x.opo();
  assert.equal(p.SITUACAO, 'APROVADA'); assert.equal(p.ACEITE_TIPO, 'ORDEM_COMPRA'); assert.equal(p.OC_NUMERO, 'OC-4512'); assert.equal(p.OC_DATA, '2026-10-18');
  assert.match(p.ENVIO_COMO, /Aceite por ordem de compra \(nº OC-4512 de 18\/10\/2026\)/); assert.match(p.ACEITE_ARQUIVO_NOME, /Ordem de compra OC-4512/);
  assert.equal(o.SITUACAO, 'GANHA'); assert.equal(o.GANHA_VIA, 'OC'); assert.match(o.GANHA_EM, /T\d{2}:\d{2}$/);
  assert(!a.tabelas.ATV_ATIVIDADES.some((t) => /Retorno sobre a proposta/.test(t.TITULO)));
  assert(hist(a, x.p.id).some((h) => h.TIPO === 'APROVADA' && /Ordem de compra nº OC-4512 de 18\/10\/2026/.test(h.TEXTO)));
  ok(a.api('s_vera', 'passarSetores', { id: x.p.id }));
  const fin = a.tabelas.ATV_ATIVIDADES.find((t) => /Financeiro/.test(t.TITULO));
  assert.match(fin.DESCRICAO, /Ordem de compra do cliente: nº OC-4512 de 18\/10\/2026/); assert.doesNotMatch(fin.DESCRICAO, /R\$\s?\d/);
  assert(hist(a, x.p.id).some((h) => h.TIPO === 'PASSAGEM' && /Ordem de compra nº OC-4512/.test(h.TEXTO)));
  const tela = ok(a.api('s_vera', 'proposta', { id: x.p.id })).proposta;
  assert.equal(tela.ocNumero, 'OC-4512'); assert.equal(tela.ocData, '18/10/2026'); assert.equal(tela.aceiteTipoNome, 'Ordem de compra');
});

test('aprovação por e-mail na proposta enviada: GANHA_VIA ACEITE, tipo gravado e o aviso de vencimento encerrado (D9); pronta sem documento recusa', () => {
  const a = amb(), x = pronta(a, false);
  ok(a.api('s_vera', 'marcarEnviada', { id: x.p.id, como: 'Entregue em mãos na reunião com a CME' }));
  a.mudar('2026-11-01T09:00:00-03:00'); a.ctx.ComP_rotinaValidade_();
  const venc = x.row().VENCIMENTO_ATIVIDADE_ID; assert(venc);
  ok(a.api('s_vera', 'respostaCliente', { id: x.p.id, resposta: 'APROVADA', texto: 'Aprovado por e-mail', aceiteTipo: 'EMAIL_APROVACAO', arquivo: ARQ() }));
  assert.equal(x.row().ACEITE_TIPO, 'EMAIL_APROVACAO'); assert.equal(x.opo().GANHA_VIA, 'ACEITE'); assert.equal(atv(a, venc).SITUACAO, 'Concluída');
  // chamada antiga (sem o tipo) continua aceita
  const b = amb(), y = pronta(b, false);
  ok(b.api('s_vera', 'marcarEnviada', { id: y.p.id, como: 'Entregue em mãos na reunião com a CME' }));
  ok(b.api('s_vera', 'respostaCliente', { id: y.p.id, resposta: 'APROVADA', texto: 'ok', arquivo: ARQ() }));
  assert.equal(y.row().ACEITE_TIPO || '', ''); assert.equal(y.opo().GANHA_VIA, 'ACEITE');
  // pronta sem documento gerado
  const c = amb(), { oportunidade } = oportunidadeDeTeste(c);
  const np = ok(c.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  ok(c.api('s_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id: np.proposta.id, itens: [{ descricao: 'Serviço de teste', quantidade: 1, precoUnitario: '100,00' }] }));
  ok(c.api('s_vera', 'concluirProposta', { id: np.proposta.id }));
  assert.match(c.api('s_vera', 'respostaCliente', { id: np.proposta.id, resposta: 'APROVADA', texto: 'ok', aceiteTipo: 'EMAIL_APROVACAO', arquivo: ARQ() }).message, /gere o documento/);
});

test('ganhar pela oportunidade grava GANHA_VIA MANUAL e a hora; o quadro oferece a pronta com documento para o aceite', () => {
  const a = amb(), x = pronta(a, false);
  const q = ok(a.api('s_vera', 'quadro', { funil: 'ENGENHARIA' }));
  const cartao = [].concat(...q.colunas.map((c) => c.cartoes || c.itens || [])).find((c) => c.id === x.o.id);
  assert(cartao && cartao.propostasEnviadas.some((p) => p.id === x.p.id && p.situacao === 'PRONTA'));
  a.mudar('2026-10-19T16:05:00-03:00');
  ok(a.api('s_vera', 'ganhar', { id: x.o.id }));
  assert.equal(x.opo().GANHA_VIA, 'MANUAL'); assert.equal(x.opo().GANHA_EM, '2026-10-19T16:05');
  const f = ok(a.api('s_vera', 'oportunidade', { id: x.o.id })).oportunidade;
  assert.equal(f.ganhaEm, '19/10/2026 16:05'); assert.equal(f.ganhaViaNome, 'Marcada como ganha na oportunidade');
});

// ------------------------------------------------------------------ item 6: proteções (D2/D13)
test('proposta assinada pelo cliente: não cancela, não revisa, não exclui, não volta a rascunho, não recusa, não vence e a perda não a cancela', () => {
  const a = amb(), x = pronta(a);
  assinaturaAntiga(a, x, 'ana@alfa.exemplo.test');
  assert.equal(x.row().SITUACAO, 'PRONTA');
  for (const [acao, d, msg] of [['cancelarProposta', { motivo: 'Cliente desistiu do serviço' }, /cancelar: a proposta .* foi assinada pelo cliente/], ['novaRevisao', {}, /fazer nova revisão: a proposta .* foi assinada/],
    ['excluirProposta', { motivo: 'Proposta montada por engano' }, /foi assinada pelo cliente/], ['voltarRascunho', {}, /editar: a proposta .* foi assinada/]]) {
    const r = a.api('s_vera', acao, Object.assign({ id: x.p.id }, d));
    assert.equal(r.ok, false, acao); assert.match(r.message, msg); assert.match(r.message, /Registrar a assinatura do cliente/);
  }
  assert.equal(ok(a.api('s_vera', 'proposta', { id: x.p.id })).proposta.podeExcluir, false);
  assert.equal(x.row().SITUACAO, 'PRONTA');
  const perda = a.api('s_vera', 'perder', { id: x.o.id, motivo: a.ctx.Com_metodologia_().motivosPerda[0], aprendizado: 'Cliente desistiu depois de assinar a proposta' });
  assert.equal(perda.ok, false); assert.match(perda.message, /A perda não cancela proposta assinada/); assert.equal(x.opo().SITUACAO, 'ABERTA');
  // enviada e assinada (versão anterior): a rotina não vence e a recusa não é registrada
  x.row().SITUACAO = 'ENVIADA'; x.row().ENVIADA_EM = '2026-10-19T10:00';
  a.mudar('2026-11-20T10:00:00-03:00');
  a.ctx.ComP_rotinaValidade_();
  assert.equal(x.row().SITUACAO, 'ENVIADA'); assert(!x.row().VENCIMENTO_ATIVIDADE_ID);
  assert.match(a.api('s_vera', 'respostaCliente', { id: x.p.id, resposta: 'RECUSADA', motivo: a.ctx.Com_metodologia_().motivosPerda[0], texto: 'Cliente recusou por telefone' }).message, /registrar a recusa: a proposta .* foi assinada/);
});

test('depois de aprovada e vencida a validade, o link continua mostrando e baixando a proposta assinada (D13)', () => {
  const a = amb(), x = pronta(a);
  const tok = tokenDe(ok(a.api('s_vera', 'linkAssinatura', { id: x.p.id, email: 'ana@alfa.exemplo.test' })));
  assert.equal(assinar(a, tok).ok, true);
  a.mudar('2026-12-20T10:00:00-03:00');
  const v = a.ctx.ComP_assinaturaVer_(tok);
  assert.equal(v.ok, true); assert.equal(v.orcamento.estado, 'RESPONDIDO'); assert.equal(v.orcamento.contato.email, 'vera@exemplo.test');
  const pdf = a.ctx.ComP_assinaturaPdf_(tok);
  assert.equal(pdf.ok, true); assert.match(pdf.nome, /assinada\.pdf$/);
  assert.equal(Buffer.from(pdf.base64, 'base64').toString(), Buffer.from(a.arquivos[x.row().ASSINATURA_PDF_ID].bytes).toString());
  // proposta não assinada e vencida continua sem abrir
  const b = amb(), y = pronta(b);
  const t2 = tokenDe(ok(b.api('s_vera', 'linkAssinatura', { id: y.p.id, email: 'ana@alfa.exemplo.test' })));
  b.mudar('2026-12-20T10:00:00-03:00');
  assert.equal(b.ctx.ComP_assinaturaVer_(t2).codigo, 'INDISPONIVEL'); assert.equal(assinar(b, t2).codigo, 'INDISPONIVEL');
});

// ------------------------------------------------------------------ item 7: assinatura anterior a esta versão
test('assinatura antiga: aviso e botão para responsável e gestão; o registro aprova, ganha com a hora da assinatura e confirma só ao vendedor', () => {
  const a = amb(), x = pronta(a);
  a.mudar('2026-10-20T08:15:00-03:00');
  assinaturaAntiga(a, x, 'ana@alfa.exemplo.test');
  a.mudar('2026-10-22T11:00:00-03:00');
  assert.equal(ok(a.api('s_vera', 'proposta', { id: x.p.id })).proposta.podeRegistrarAssinatura, true);
  assert.equal(ok(a.api('s_gaspar', 'proposta', { id: x.p.id })).proposta.podeRegistrarAssinatura, true);
  assert.equal(a.api('s_vito', 'registrarAssinaturaCliente', { id: x.p.id }).ok, false);
  assert.equal(a.api('s_fabio', 'registrarAssinaturaCliente', { id: x.p.id }).ok, false);
  const n = a.emails.length;
  const r = ok(a.api('s_vera', 'registrarAssinaturaCliente', { id: x.p.id }));
  assert.match(r.message, /o cliente não recebe e-mail novo/);
  assert.equal(x.row().SITUACAO, 'APROVADA'); assert.equal(x.row().ASSINATURA_PDF_ID, x.row().ACEITE_ARQUIVO_ID);
  assert.equal(x.opo().SITUACAO, 'GANHA'); assert.equal(x.opo().GANHA_EM, '2026-10-20T08:15'); assert.equal(x.opo().GANHA_VIA, 'ASSINATURA');
  assert.equal(a.emails.length, n + 1);
  const m = a.emails[a.emails.length - 1];
  assert.equal(m.to, 'vera@exemplo.test'); assert.equal(m.cc, undefined); assert.match(m.body, /registro posterior/);
  assert(hist(a, x.p.id).some((h) => h.TIPO === 'ASSINATURA_CLIENTE' && /Registro posterior no SGO\+ feito por VERA VENDEDORA TESTE/.test(h.TEXTO)));
  const antes = a.tabelas.COM_HISTORICO.length;
  assert.match(a.api('s_vera', 'registrarAssinaturaCliente', { id: x.p.id }).message, /já está registrada/);
  assert.equal(a.tabelas.COM_HISTORICO.length, antes);
  // sem assinatura do cliente: recusa com orientação
  const b = amb(), y = pronta(b);
  assert.match(b.api('s_vera', 'registrarAssinaturaCliente', { id: y.p.id }).message, /ainda não assinou/);
});

// ------------------------------------------------------------------ tela, página pública e ajuda (itens 4, 8, 9 e 10)
test('tela, página pública e ajuda: janela do link, tipo do aceite, registro posterior, textos de proposta e manual atualizado', () => {
  const tela = fs.readFileSync(path.join(PASTA, 'JS_Comercial.html'), 'utf8');
  assert.doesNotMatch(tela, /window\.prompt\("E-mail do cliente/);
  for (const t of ['id="cmLkEmail"', 'será cancelado ao gerar outro', 'cmLkCancelar', 'registrarAssinaturaCliente', 'id="cmRTipo"', 'id="cmROcNum"', 'id="cmGTipo"', 'Ganha em', 'ganhaViaNome']) assert(tela.includes(t), t);
  const ajuda = fs.readFileSync(path.join(PASTA, 'SGO_Ajuda_Comercial.js'), 'utf8');
  for (const t of ['Enviar link de assinatura', 'Cliente assinou pelo link', 'Registrar a assinatura do cliente', 'número e a data da OC', 'diferente do convidado']) assert(ajuda.includes(t), t);
  const app = path.join(__dirname, '../output/comercial-20261110/' + (process.env.FASE === 'producao' ? 'producao' : 'base') + '/src/publico/orcamento/app.js');
  if (fs.existsSync(app)) {
    const js = fs.readFileSync(app, 'utf8');
    for (const t of ['/^\\/assinar-proposta\\//', 'Assinar a proposta', 'Baixar a proposta assinada em PDF', 'Validade ${DOC.de}', 'Este link de proposta não está disponível']) assert(js.includes(t), t);
  }
});

// ------------------------------------------------------------------ tela desenhada com o retorno real do servidor
/** DOM mínimo: elementos achados no innerHTML por id, classe ou atributo; cada um guardado para manter onclick e value. */
function telaComercial(a, sid) {
  const html = fs.readFileSync(path.join(PASTA, 'JS_Comercial.html'), 'utf8');
  const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  const vivos = new Set();
  const unesc = (v) => String(v).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  function elem(attrs) {
    const e = { attrs: attrs || {}, style: {}, _html: '', _els: {}, textContent: '', value: '', checked: false, disabled: false,
      set innerHTML(v) { Object.values(this._els).flat().forEach((x) => vivos.delete(x)); this._html = String(v); this._els = {}; },
      get innerHTML() { return this._html; },
      getAttribute(k) { return this.attrs[k]; }, remove() { vivos.delete(this); this.removido = true; }, appendChild() {}, select() {}, focus() {}, scrollIntoView() {},
      querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
      querySelectorAll(sel) {
        if (this._els[sel]) return this._els[sel];
        let l = [];
        const m = /^#([\w-]+)$/.exec(sel), at = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(sel), cl = /^\.([\w-]+)$/.exec(sel);
        if (m) { const t = new RegExp('<[^>]*\\bid="' + m[1] + '"[^>]*>').exec(this._html); if (t) { const v = /\bvalue="([^"]*)"/.exec(t[0]); l = [elem({ id: m[1] })]; l[0].value = v ? unesc(v[1]) : ''; } }
        else if (at) { const re = new RegExp('\\b' + at[1] + '="([^"]*)"', 'g'); let x; while ((x = re.exec(this._html))) if (at[2] === undefined || x[1] === at[2]) l.push(elem({ [at[1]]: x[1] })); }
        else if (cl) { if (new RegExp('class="[^"]*\\b' + cl[1] + '\\b').test(this._html)) l = [elem({})]; }
        else if (sel === 'h3') l = [elem({})];
        l.forEach((x) => vivos.add(x));
        return (this._els[sel] = l);
      } };
    return e;
  }
  const corpo = elem({ id: 'cmGavetaCorpo' }); vivos.add(corpo);
  const modais = [];
  const document = {
    getElementById: (id) => {
      if (id === 'cmGavetaCorpo') return corpo;
      const l = [...vivos].reverse().filter((r) => !r.removido);
      const proprio = l.find((r) => r.attrs.id === id);
      if (proprio) return proprio;
      const pai = l.find((r) => r._html.includes('id="' + id + '"'));
      return pai ? pai.querySelector('#' + id) : null;
    },
    createElement: () => { const e = elem({}); vivos.add(e); modais.push(e); return e; },
    body: { appendChild() {} }, querySelectorAll: () => [], querySelector: () => null, addEventListener() {}
  };
  const ctx = vm.createContext({ console, setTimeout, URL, location: { origin: 'https://sgo.exemplo.test' }, document, window: { confirm: () => true, prompt: () => null }, confirm: () => true, alert() {},
    USER_CONTEXT: { perfil: 'COMERCIAL' }, escapeHtml_: (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
    SGO_iniciarCarregamento_() {}, SGO_finalizarCarregamento_() {}, google: { script: { run: {} } } });
  vm.runInContext(script, ctx);
  const chamadas = [];
  ctx.Com_chamar_ = (acao, d, okf, erro) => { chamadas.push(acao); const r = a.api(sid, acao, d); if (r.ok) okf(r); else if (erro) erro(r.message); };
  vm.runInContext('Com_chamar_ = this.Com_chamar_; CM.ini = { eu: { id: "u_ven" }, gestao: false, financeiro: false, diretoria: false, motivosPerda: [] };', ctx);
  const g = elem({}); g._els.h3 = [elem({})];
  const abrir = (id) => { ctx.Com_chamar_('proposta', { id }, (r) => ctx.Comercial_desenharProposta_(g, r.proposta)); return corpo; };
  // a tela liga os botões pela lista [data-acao]; o clique é no elemento dessa lista
  const clicar = (raiz, sel) => { const m = /^\[([\w-]+)="([^"]*)"\]$/.exec(sel); const b = raiz.querySelectorAll('[' + m[1] + ']').find((x) => x.getAttribute(m[1]) === m[2]); assert(b, 'sem ' + sel); b.onclick(); };
  return { ctx, corpo, modais, abrir, clicar, chamadas, document };
}

test('tela: proposta com assinatura antiga mostra o aviso e o botão; o toque registra e a tela volta aprovada, sem cancelar nem revisar', () => {
  const a = amb(), x = pronta(a);
  assinaturaAntiga(a, x, 'diretor@alfa.exemplo.test');
  const t = telaComercial(a, 's_vera');
  const c = t.abrir(x.p.id);
  assert.match(c.innerHTML, /O cliente assinou esta proposta pelo link/); assert.match(c.innerHTML, /data-acao="registrarAssinatura"/);
  assert.match(c.innerHTML, /Assinado com e-mail diferente do convidado \(ana@alfa\.exemplo\.test\)/);
  for (const b of ['cancelar', 'revisao', 'voltar', 'excluir', 'resposta']) assert.doesNotMatch(c.innerHTML, new RegExp('data-acao="' + b + '"'), b);
  t.clicar(c, '[data-acao="registrarAssinatura"]');
  assert(t.chamadas.includes('registrarAssinaturaCliente'));
  assert.equal(x.row().SITUACAO, 'APROVADA');
  assert.match(c.innerHTML, /Assinatura do cliente registrada/); assert.match(c.innerHTML, /data-acao="passar"/); assert.match(c.innerHTML, /Tipo do aceite: Assinatura eletrônica pelo link/);
  assert.doesNotMatch(c.innerHTML, /data-acao="registrarAssinatura"/);
});

test('tela: janela do link com o e-mail do contato, aviso de e-mail de fora e confirmação obrigatória para cancelar o link anterior', () => {
  const a = amb(), x = pronta(a);
  const t = telaComercial(a, 's_vera');
  let c = t.abrir(x.p.id);
  assert.match(c.innerHTML, /data-acao="linkAssinatura"[^>]*>Enviar link de assinatura/); assert.doesNotMatch(c.innerHTML, /data-acao="assinarResponsavel"/);
  assert.match(c.innerHTML, /data-acao="resposta"[^>]*>Registrar aprovação \(aceite ou ordem de compra\)/);
  t.clicar(c, '[data-acao="linkAssinatura"]');
  let ov = t.modais[t.modais.length - 1];
  assert.equal(ov.querySelector('#cmLkEmail').value, 'ana@alfa.exemplo.test');
  assert.match(ov.innerHTML, /data-lkc="0"/); assert.doesNotMatch(ov.innerHTML, /cmLkCancelar/);
  ov.querySelector('#cmLkEmail').value = 'terceiro@outra.exemplo.test'; ov.querySelector('#cmLkEmail').oninput();
  assert.match(ov.querySelector('#cmLkFora').innerHTML, /não é de nenhum contato cadastrado de Hospital Teste Alfa/);
  ov.querySelector('[data-lkc]').onclick();
  assert.equal(ov.querySelector('#cmLkEmail').value, 'ana@alfa.exemplo.test'); assert.equal(ov.querySelector('#cmLkFora').innerHTML, '');
  ov.querySelector('[data-x="ok"]').onclick();
  assert.equal(x.row().LINK_EMAIL, 'ana@alfa.exemplo.test'); assert.equal(x.row().SITUACAO, 'ENVIADA');
  assert.match(t.modais[t.modais.length - 1].innerHTML, /Link enviado para ana@alfa\.exemplo\.test/);
  // segundo envio: a janela mostra o último link e exige marcar o cancelamento
  c = t.abrir(x.p.id);
  assert.match(c.innerHTML, /Link de assinatura<\/dt><dd>Enviado para ana@alfa\.exemplo\.test em 19\/10\/2026 10:00/);
  t.clicar(c, '[data-acao="linkAssinatura"]');
  ov = t.modais[t.modais.length - 1];
  assert.match(ov.innerHTML, /Último link: enviado para <b>ana@alfa\.exemplo\.test<\/b> em 19\/10\/2026 10:00 — será cancelado ao gerar outro/);
  const n = a.emails.length;
  ov.querySelector('[data-x="ok"]').onclick();
  assert.equal(a.emails.length, n, 'sem a marca, nada sai'); assert.match(ov.querySelector('#cmLkMsg').innerHTML, /será cancelado/);
  ov.querySelector('#cmLkCancelar').checked = true;
  ov.querySelector('[data-x="ok"]').onclick();
  assert.equal(a.emails.length, n + 1);
});

test('tela: resposta com tipo do aceite e ordem de compra na proposta pronta (sem a opção Recusou)', () => {
  const a = amb(), x = pronta(a, false);
  const t = telaComercial(a, 's_vera');
  const c = t.abrir(x.p.id);
  t.clicar(c, '[data-acao="resposta"]');
  const area = t.document.getElementById('cmPropAcao');
  assert.match(area.innerHTML, /id="cmRTipo"/); assert.match(area.innerHTML, /Ordem de compra/); assert.match(area.innerHTML, /id="cmROcNum"/); assert.doesNotMatch(area.innerHTML, /value="RECUSADA"/);
});
