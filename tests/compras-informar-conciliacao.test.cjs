// COMPRAS — compra informada, cartões, parcelas, conciliação da fatura, A pagar, painel com Kanban e Gantt, relatórios A4 e
// integração (31/10/2026, pedido do dono: "várias pessoas compram com os cartões da empresa e colocam no grupo do WhatsApp").
// Código real do SGO+ num contexto isolado (tests/_compras_ambiente.cjs), relógio controlado, dados fictícios.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, FOTO, PDF, regrasDeTeste } = require('./_compras_ambiente.cjs');

const B64 = (t) => Buffer.from(t).toString('base64');
const comprovante = (n) => ({ nome: 'comprovante' + (n || '') + '.jpg', tipo: 'image/jpeg', base64: B64('comprovante de teste ' + (n || '')) });
function base(extra) {
  return Object.assign({ finalidade: 'Vedação da porta da autoclave do cliente, troca no atendimento', vinculo: { tipo: 'CLIENTE', clienteId: 'c1', unidadeId: 'un1' },
    itens: [{ descricao: 'Vedação de silicone da porta', quantidade: 1, unidade: 'un.' }], fornecedorNome: 'Loja de Peças Teste', valor: '300,00', formaPagamento: 'CARTAO_CREDITO',
    cartaoFinal: '4321', parcelas: 1, dataCompra: '2026-10-19', comprovante: comprovante(), nfNumero: '12345', recebido: true }, extra || {});
}
function informar(amb, sid, extra) { const r = amb.api(sid || 's_tiago', 'informar', base(extra)); assert.equal(r.ok, true, r.message); return r; }

test('fatura de cada parcela: regra do fechamento, vencimento no mês certo, centavos na 1ª parcela e fatura estimada sem cartão', () => {
  const { ctx } = ambiente();
  const k = { DIA_FECHAMENTO: 5, DIA_VENCIMENTO: 15 };
  assert.equal(ctx.CmpI_faturaDe_('2026-10-03', k).competencia, '2026-10');
  assert.equal(ctx.CmpI_faturaDe_('2026-10-05', k).competencia, '2026-11', 'no dia do fechamento vai para a fatura seguinte');
  const k2 = { DIA_FECHAMENTO: 28, DIA_VENCIMENTO: 5 };
  assert.equal(ctx.CmpI_faturaDe_('2026-10-10', k2).competencia, '2026-11');
  assert.equal(ctx.CmpI_faturaDe_('2026-10-10', k2).vencimento, '2026-11-05');
  assert.equal(ctx.CmpI_faturaDe_('2026-10-28', k2).competencia, '2026-12');
  assert.equal(ctx.CmpI_faturaDe_('2026-12-29', k2).competencia, '2027-02', 'virada de ano');
  const est = ctx.CmpI_faturaDe_('2026-10-19', null);
  assert.equal(est.estimada, true); assert.equal(est.competencia, '2026-11');
  assert.deepEqual(Array.from(ctx.CmpI_valoresParcelas_(100, 3)), [33.34, 33.33, 33.33]);
});

test('informar compra já feita: grava no mesmo cadastro, parcelas na fatura, comprovante obrigatório, vínculo obrigatório e só a própria compra', () => {
  const amb = ambiente();
  regrasDeTeste(amb);
  // comprovante e nota obrigatórios; sem vínculo, não grava
  assert.match(amb.api('s_tiago', 'informar', base({ comprovante: null })).message, /foto do comprovante/);
  assert.match(amb.api('s_tiago', 'informar', base({ nfNumero: '' })).message, /nota fiscal.*motivo/);
  assert.match(amb.api('s_tiago', 'informar', base({ vinculo: { tipo: '' } })).message, /^Não foi possível informar: diga a que a compra está ligada/);
  assert.match(amb.api('s_tiago', 'informar', base({ dataCompra: '2026-10-25' })).message, /futuro/);
  assert.match(amb.api('s_tiago', 'informar', base({ cartaoFinal: '12' })).message, /4 últimos números/);
  // técnico não informa por outra pessoa; o comprador pode
  assert.match(amb.api('s_tiago', 'informar', base({ compradoPorId: 'u_tec2' })).message, /cada pessoa informa as próprias compras/);
  const r = informar(amb, 's_tiago', { parcelas: 3, valor: '100,00' });
  assert.match(r.message, /REQ-2026-0001 informada/);
  assert.match(r.message, /cartão ainda não cadastrado/);
  const req = amb.tabelas.CMP_REQUISICOES.find((x) => x.NUMERO === 'REQ-2026-0001');
  assert.equal(req.ORIGEM, 'INFORMADA'); assert.equal(req.SITUACAO, 'ENTREGUE'); assert.equal(req.COMPRADO_POR_ID, 'u_tec'); assert.equal(req.SEM_PEDIDO, 'SIM');
  const ped = amb.tabelas.CMP_PEDIDOS.find((x) => x.REQUISICAO_ID === req.ID);
  assert.equal(ped.FIN_SITUACAO, 'AGUARDANDO'); assert.equal(ped.CARTAO_FINAL, '4321'); assert.equal(ped.DATA_COMPRA, '2026-10-19'); assert.ok(ped.COMPROVANTE_HASH);
  const parc = amb.tabelas.CMP_PARCELAS.filter((x) => x.PEDIDO_ID === ped.ID);
  assert.deepEqual(parc.map((x) => [x.PARCELA, x.VALOR, x.COMPETENCIA, x.ESTIMADA, x.SITUACAO]), [[1, 33.34, '2026-11', 'SIM', 'A_CONCILIAR'], [2, 33.33, '2026-12', 'SIM', 'A_CONCILIAR'], [3, 33.33, '2027-01', 'SIM', 'A_CONCILIAR']]);
  // Financeiro avisado (sem valor); minhas compras com valor para quem comprou; abaixo do limite não vai à ciência da gestão
  assert.ok(amb.tabelas.CMP_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_fin' && v.TIPO === 'PARA_CONFERIR' && !/R\$/.test(v.TEXTO)));
  const m = amb.api('s_tiago', 'minhasInformadas', {});
  assert.equal(m.compras.length, 1); assert.equal(m.compras[0].valorTxt, 'R$ 100,00'); assert.equal(m.compras[0].parcelas.length, 3);
  const pend = amb.ctx.Pend_resposta_(amb.ctx.Pend_contextoDaSessao_({ userId: 'u_dir', perfil: 'DIRETORIA', nome: 'DORA', usuario: 'dora' }), { semCache: true }).itens;
  assert.ok(!pend.some((i) => i.tipo === 'compras_sem_pedido'), 'abaixo do limite não pede ciência');
  // o comprador informa em nome do técnico
  const r2 = informar(amb, 's_carlos', { compradoPorId: 'u_tec2', valor: '55,00', dataCompra: '2026-10-16', cartaoFinal: '9999', comprovante: comprovante(2) });
  assert.equal(amb.tabelas.CMP_REQUISICOES.find((x) => x.NUMERO === r2.numero).COMPRADO_POR_NOME, 'TALES TECNICO TESTE');
  assert.ok(amb.tabelas.CMP_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_tec2' && v.TIPO === 'INFORMADA_POR_OUTRO'));
});

test('controles: duplicidade pede confirmação com motivo, atraso pede o motivo, acima do limite vai à ciência da gestão, compra muito antiga só o Financeiro', () => {
  const amb = ambiente();
  regrasDeTeste(amb);
  informar(amb, 's_tiago', { valor: '80,00' });
  // mesmo cartão, mesmo valor, data próxima: precisa confirmar (nada gravado)
  const d1 = amb.api('s_tiago', 'informar', base({ valor: '80,00', dataCompra: '2026-10-18', comprovante: comprovante('b') }));
  assert.equal(d1.ok, true); assert.equal(d1.gravada, false); assert.equal(d1.precisa, 'DUPLICIDADE'); assert.equal(d1.duplicadas[0].numero, 'REQ-2026-0001');
  assert.equal(amb.tabelas.CMP_REQUISICOES.length, 1);
  // mesmo arquivo de comprovante
  const d2 = amb.api('s_tiago', 'informar', base({ valor: '12,00', cartaoFinal: '1111' }));
  assert.equal(d2.precisa, 'DUPLICIDADE'); assert.match(d2.message, /mesmo arquivo de comprovante/);
  const ok = amb.api('s_tiago', 'informar', base({ valor: '80,00', dataCompra: '2026-10-18', comprovante: comprovante('b'), duplicidadeMotivo: 'Outra vedação, para a segunda autoclave' }));
  assert.equal(ok.gravada, true, ok.message); assert.match(ok.message, /duplicidade possível/);
  // atraso: compra de 4 dias úteis atrás
  const a1 = amb.api('s_tiago', 'informar', base({ dataCompra: '2026-10-13', valor: '20,00', comprovante: comprovante('c') }));
  assert.equal(a1.precisa, 'ATRASO'); assert.match(a1.message, /4 dias úteis/);
  const a2 = amb.api('s_tiago', 'informar', base({ dataCompra: '2026-10-13', valor: '20,00', comprovante: comprovante('c'), atrasoMotivo: 'Estava em campo sem sinal' }));
  assert.equal(a2.gravada, true, a2.message);
  const req = amb.tabelas.CMP_REQUISICOES.find((x) => x.NUMERO === a2.numero);
  assert.equal(req.INF_ATRASO_DIAS, 4); assert.match(req.INF_APONTAMENTOS, /ATRASO/);
  // acima do limite (R$ 1.000): ciência da gestão na Caixa de decisões
  const g = informar(amb, 's_tiago', { valor: '1.500,00', cartaoFinal: '2222', comprovante: comprovante('d') });
  assert.match(g.message, /gestão vai dar ciência/);
  const pend = amb.ctx.Pend_resposta_(amb.ctx.Pend_contextoDaSessao_({ userId: 'u_dir', perfil: 'DIRETORIA', nome: 'DORA', usuario: 'dora' }), { semCache: true }).itens;
  const it = pend.find((i) => i.tipo === 'compras_sem_pedido');
  assert.ok(it); assert.match(it.titulo, /acima do limite da compra direta/);
  // compra de mais de 90 dias: só Financeiro e gestão
  assert.match(amb.api('s_tiago', 'informar', base({ dataCompra: '2026-06-01', comprovante: comprovante('e') })).message, /informada pelo Financeiro/);
  // cancelar compra informada lançada por engano (quem informou), antes da conferência
  const c = amb.api('s_tiago', 'cancelar', { id: req.ID, motivo: 'Lançada por engano, já tinha informado' });
  assert.equal(c.ok, true, c.message);
  assert.ok(amb.tabelas.CMP_PARCELAS.filter((x) => x.REQUISICAO_ID === req.ID).every((x) => x.SITUACAO === 'CANCELADA'));
});

test('reembolso e faturado vão para A pagar; o Financeiro baixa com comprovante; ninguém baixa o próprio reembolso', () => {
  const amb = ambiente();
  regrasDeTeste(amb);
  assert.match(amb.api('s_tiago', 'informar', base({ formaPagamento: 'FATURADO', cartaoFinal: '' })).message, /vencimento/);
  informar(amb, 's_tiago', { formaPagamento: 'FATURADO', cartaoFinal: '', boletoVencimento: '2026-11-18', valor: '420,00' });
  const r = informar(amb, 's_fabio', { formaPagamento: 'REEMBOLSO', cartaoFinal: '', valor: '35,90', comprovante: comprovante('f') });
  const reemb = amb.tabelas.CMP_PARCELAS.find((x) => x.FORMA === 'REEMBOLSO');
  assert.equal(reemb.BENEFICIARIO_ID, 'u_fin'); assert.equal(reemb.SITUACAO, 'A_PAGAR'); assert.equal(reemb.VENCIMENTO, '2026-10-26', '5 dias úteis');
  const pix = informar(amb, 's_tiago', { formaPagamento: 'PIX', cartaoFinal: '', valor: '15,00', comprovante: comprovante('g') });
  assert.equal(amb.tabelas.CMP_PARCELAS.find((x) => x.REQUISICAO_NUMERO === pix.numero).SITUACAO, 'PAGA');
  const l = amb.api('s_fabio', 'aPagar', {});
  assert.equal(l.itens.length, 2); assert.equal(l.totais.reembolsos, 1);
  assert.equal(l.itens.find((x) => x.forma === 'REEMBOLSO').podePagar, false);
  assert.match(amb.api('s_fabio', 'marcarPago', { parcelaId: reemb.ID, pagoEm: '2026-10-19', comprovante: PDF }).message, /reembolso é para você/);
  assert.match(amb.api('s_dora', 'marcarPago', { parcelaId: reemb.ID, pagoEm: '2026-10-19' }).message, /anexe o comprovante/);
  const p = amb.api('s_dora', 'marcarPago', { parcelaId: reemb.ID, pagoEm: '2026-10-19', comprovante: PDF });
  assert.equal(p.ok, true, p.message);
  assert.equal(amb.tabelas.CMP_PARCELAS.find((x) => x.ID === reemb.ID).SITUACAO, 'PAGA');
  assert.ok(amb.tabelas.CMP_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_fin' && v.TIPO === 'REEMBOLSADO'));
  // técnico não vê A pagar
  assert.match(amb.api('s_tiago', 'aPagar', {}).message, /Financeiro/);
  void r;
});

test('cartões: só o final, final único, responsável; "o que falta"; ao cadastrar, as compras com o final se ligam e a fatura é recalculada', () => {
  const amb = ambiente();
  regrasDeTeste(amb);
  informar(amb, 's_tiago', { parcelas: 2, valor: '200,00', dataCompra: '2026-10-19' });
  let c = amb.api('s_fabio', 'cartoes', {});
  assert.ok(c.oQueFalta.some((x) => /Nenhum cartão/.test(x.texto)));
  assert.ok(c.oQueFalta.some((x) => /Final 4321 usado em 1 compra/.test(x.texto)));
  assert.match(amb.api('s_tiago', 'salvarCartao', { final: '4321', apelido: 'Cartão do Tiago' }).message, /Financeiro, da Diretoria e do Administrador/);
  assert.match(amb.api('s_fabio', 'salvarCartao', { final: '1234 5678 9012 4321', apelido: 'Cartão do Tiago' }).message, /4 últimos números/);
  const s = amb.api('s_fabio', 'salvarCartao', { final: '4321', apelido: 'Cartão da equipe técnica', tipo: 'CREDITO', responsavelId: 'u_tec', diaFechamento: 28, diaVencimento: 5 });
  assert.equal(s.ok, true, s.message); assert.match(s.message, /2 parcelas já informadas foram ligadas/);
  const parc = amb.tabelas.CMP_PARCELAS.filter((x) => x.CARTAO_FINAL === '4321').sort((a, b) => a.PARCELA - b.PARCELA);
  assert.deepEqual(parc.map((x) => [x.COMPETENCIA, x.ESTIMADA, x.CARTAO_ID]), [['2026-11', '', s.cartao.id], ['2026-12', '', s.cartao.id]]);
  assert.match(amb.api('s_fabio', 'salvarCartao', { final: '4321', apelido: 'Outro' }).message, /já existe cartão ativo com o final 4321/);
  // edição sem motivo recusa; com motivo junta só o que veio
  assert.match(amb.api('s_fabio', 'salvarCartao', { id: s.cartao.id, limite: '5.000,00' }).message, /o que mudou/);
  const e = amb.api('s_fabio', 'salvarCartao', { id: s.cartao.id, limite: '5.000,00', motivo: 'Limite informado pelo banco' });
  assert.equal(e.ok, true, e.message);
  const k = amb.tabelas.CMP_CARTOES.find((x) => x.ID === s.cartao.id);
  assert.equal(k.LIMITE, 5000); assert.equal(k.APELIDO, 'Cartão da equipe técnica'); assert.equal(k.RESPONSAVEL_ID, 'u_tec');
  assert.ok(amb.tabelas.CMP_HISTORICO.some((h) => h.ENTIDADE === 'CARTAO' && /limite: — → 5000/.test(h.TEXTO)));
  c = amb.api('s_fabio', 'cartoes', {});
  assert.ok(!c.oQueFalta.some((x) => x.grave), JSON.stringify(c.oQueFalta));
  // compradores consultam; técnico não
  assert.equal(amb.api('s_carlos', 'cartoes', {}).podeEditar, false);
  assert.match(amb.api('s_tiago', 'cartoes', {}).message, /Financeiro/);
});

test('conciliação: importa CSV e OFX, casa valor, data e parcela; não informado vira cobrança; justificar, próxima fatura, fechar e ressalva', () => {
  const amb = ambiente();
  regrasDeTeste(amb);
  amb.api('s_fabio', 'salvarCartao', { final: '4321', apelido: 'Cartão da equipe técnica', responsavelId: 'u_tec', diaFechamento: 28, diaVencimento: 5 });
  informar(amb, 's_tiago', { valor: '300,00', dataCompra: '2026-10-19' });                                 // cai na fatura de novembro
  informar(amb, 's_tiago', { valor: '90,00', parcelas: 3, dataCompra: '2026-10-16', comprovante: comprovante(2) }); // parcela 1 em novembro
  informar(amb, 's_tiago', { valor: '45,50', dataCompra: '2026-10-15', comprovante: comprovante(3) });     // não está no extrato
  const csv = 'Data;Descrição;Parcela;Valor (R$)\n19/10/2026;LOJA DE PECAS TESTE;;300,00\n16/10/2026;FERRAGENS TESTE PARC 01/03;01/03;30,00\n17/10/2026;POSTO TESTE;;150,00\n10/10/2026;PAGAMENTO DE FATURA;;-1.200,00\n';
  // prévia: nada gravado
  const pv = amb.api('s_fabio', 'importarExtrato', { final: '4321', competencia: '2026-11', texto: csv, nomeArquivo: 'fatura.csv' });
  assert.equal(pv.ok, true, pv.message); assert.equal(pv.previa, true); assert.match(pv.resumo, /3 lançamentos lidos: 2 casam/);
  assert.equal((amb.tabelas.CMP_EXTRATO || []).length, 0);
  const im = amb.api('s_fabio', 'importarExtrato', { final: '4321', competencia: '2026-11', texto: csv, nomeArquivo: 'fatura.csv', confirmar: true });
  assert.equal(im.ok, true, im.message); assert.equal(im.casadas, 2); assert.equal(im.naoInformadas, 1);
  // repetida não entra de novo
  assert.equal(amb.api('s_fabio', 'importarExtrato', { final: '4321', competencia: '2026-11', texto: csv, nomeArquivo: 'fatura.csv', confirmar: true }).gravadas, 0);
  let t = amb.api('s_fabio', 'fatura', { final: '4321', competencia: '2026-11' });
  assert.equal(t.resumo.conciliadas, 2); assert.equal(t.resumo.naoInformadas, 1); assert.equal(t.resumo.foraDaFatura, 1);
  // cobrança no Início do responsável do cartão (sem valor) e "Compras a informar" com o lançamento
  const pend = amb.ctx.Pend_resposta_(amb.ctx.Pend_contextoDaSessao_({ userId: 'u_tec', perfil: 'TECNICO', nome: 'TIAGO', usuario: 'tiago' }), { semCache: true }).itens;
  const cob = pend.find((i) => i.tipo === 'compras_nao_informada');
  assert.ok(cob); assert.match(cob.detalhe, /POSTO TESTE/); assert.ok(!/R\$/.test(cob.titulo + cob.detalhe));
  const m = amb.api('s_tiago', 'minhasInformadas', {});
  assert.equal(m.cobrancas.length, 1); assert.equal(m.cobrancas[0].valorTxt, 'R$ 150,00');
  // informar a partir da cobrança casa na hora
  const inf = amb.api('s_tiago', 'informar', base({ valor: '150,00', dataCompra: '2026-10-17', fornecedorNome: 'Posto Teste', vinculo: { tipo: 'INTERNO', motivoInterno: 'Combustível do gerador da sede, emergência', centroCusto: 'Administrativo' }, comprovante: comprovante(4), extratoId: m.cobrancas[0].extratoId, atrasoMotivo: 'Esqueci de informar no dia' }));
  assert.equal(inf.gravada, true, inf.message);
  t = amb.api('s_fabio', 'fatura', { final: '4321', competencia: '2026-11' });
  assert.equal(t.resumo.naoInformadas, 0); assert.equal(t.resumo.conciliadas, 3);
  // quem comprou não concilia a própria; ações exigem motivo
  const fora = t.parcelas.find((x) => x.situacao === 'NAO_ESTA_NA_FATURA');
  assert.match(amb.api('s_fabio', 'conciliacao', { acao: 'proxima', parcelaId: fora.id, motivo: 'curto' }).message, /pelo menos 15 letras/);
  // fechar com item aberto recusa; passa para a próxima fatura e fecha
  assert.match(amb.api('s_fabio', 'fecharFatura', { final: '4321', competencia: '2026-11' }).message, /ainda há 1 item aberto/);
  const px = amb.api('s_fabio', 'conciliacao', { acao: 'proxima', parcelaId: fora.id, motivo: 'Compra perto do fechamento, vem na próxima fatura' });
  assert.equal(px.ok, true, px.message);
  assert.equal(amb.tabelas.CMP_PARCELAS.find((x) => x.ID === fora.id).COMPETENCIA, '2026-12');
  const f = amb.api('s_fabio', 'fecharFatura', { final: '4321', competencia: '2026-11' });
  assert.equal(f.ok, true, f.message); assert.match(f.message, /tudo conciliado/);
  assert.match(amb.api('s_fabio', 'importarExtrato', { final: '4321', competencia: '2026-11', texto: csv, nomeArquivo: 'fatura.csv' }).message, /já foi fechada/);
  assert.match(amb.api('s_fabio', 'fecharFatura', { final: '4321', competencia: '2026-11', reabrir: true, motivo: 'Lançamento novo apareceu no banco' }).message, /Diretoria/);
  // OFX de dezembro: parcela 2/3 casa; lançamento desconhecido justificado; fechar com ressalva
  const ofx = 'OFXHEADER:100\n<OFX><BANKTRANLIST>\n<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261016120000[-3:BRT]<TRNAMT>-30.00<FITID>a1<MEMO>FERRAGENS TESTE PARC 02/03</STMTTRN>\n' +
    '<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261102120000[-3:BRT]<TRNAMT>-39.90<FITID>a2<MEMO>ASSINATURA SERVICO TESTE</STMTTRN>\n<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261103<TRNAMT>500.00<FITID>a3<MEMO>PAGAMENTO RECEBIDO</STMTTRN>\n</BANKTRANLIST></OFX>';
  const im2 = amb.api('s_fabio', 'importarExtrato', { final: '4321', competencia: '2026-12', texto: ofx, nomeArquivo: 'dezembro.ofx', confirmar: true });
  assert.equal(im2.ok, true, im2.message); assert.equal(im2.casadas, 1); assert.equal(im2.naoInformadas, 1);
  t = amb.api('s_fabio', 'fatura', { final: '4321', competencia: '2026-12' });
  const assin = t.linhas.find((x) => x.situacao === 'NAO_INFORMADA');
  const j = amb.api('s_fabio', 'conciliacao', { acao: 'justificar', extratoId: assin.id, motivo: 'Assinatura mensal do serviço de e-mail, despesa fixa' });
  assert.equal(j.ok, true, j.message);
  t = amb.api('s_fabio', 'fatura', { final: '4321', competencia: '2026-12' });
  assert.equal(t.resumo.foraDaFatura, 1, 'a compra passada para dezembro não veio no extrato');
  assert.match(amb.api('s_fabio', 'fecharFatura', { final: '4321', competencia: '2026-12', ressalva: true, motivo: 'curto' }).message, /pelo menos 20 letras/);
  const fr = amb.api('s_fabio', 'fecharFatura', { final: '4321', competencia: '2026-12', ressalva: true, motivo: 'Compra de 45,50 não apareceu; banco consultado, aguardando' });
  assert.equal(fr.ok, true, fr.message);
  assert.equal(amb.tabelas.CMP_FATURAS.find((x) => x.COMPETENCIA === '2026-12').SITUACAO, 'FECHADA_RESSALVA');
  assert.ok(amb.tabelas.CMP_HISTORICO.some((h) => h.ENTIDADE === 'EXTRATO' && h.TIPO === 'JUSTIFICADA'));
});

test('cobrança do não informado: e-mail CP02 depois de 2 dias úteis, Caixa do gestor e sugestão ao Conduta depois de 5; some quando informa', () => {
  const amb = ambiente();
  regrasDeTeste(amb);
  amb.api('s_fabio', 'salvarCartao', { final: '4321', apelido: 'Cartão da equipe técnica', responsavelId: 'u_tec', diaFechamento: 28, diaVencimento: 5 });
  amb.api('s_fabio', 'importarExtrato', { final: '4321', competencia: '2026-11', texto: 'Data;Estabelecimento;Valor\n15/10/2026;MERCADO TESTE;88,00\n', nomeArquivo: 'f.csv', confirmar: true });
  assert.equal(amb.ctx.CmpFat_cobrarPorEmail_().enviados, 0, 'antes de 2 dias úteis, só o Início');
  amb.mudar('2026-10-21T10:00:00-03:00');
  assert.equal(amb.ctx.CmpFat_cobrarPorEmail_().enviados, 1);
  const env = amb.tabelas.NTF_ENVIOS.filter((e) => e.USUARIO_ID === 'u_tec');
  assert.ok(env.length >= 1, JSON.stringify(amb.tabelas.NTF_ENVIOS));
  assert.equal(amb.ctx.CmpFat_cobrarPorEmail_().enviados, 0, 'uma cobrança por lançamento');
  amb.mudar('2026-10-26T10:00:00-03:00');
  const pend = amb.ctx.Pend_resposta_(amb.ctx.Pend_contextoDaSessao_({ userId: 'u_dir', perfil: 'DIRETORIA', nome: 'DORA', usuario: 'dora' }), { semCache: true }).itens;
  assert.ok(pend.some((i) => i.tipo === 'compras_nao_informada_gestao'));
  const us = {}; amb.tabelas.CAD_USUARIOS.forEach((u) => { us[u.ID] = u; });
  const cand = amb.ctx.Compras_candidatosConduta_(us);
  assert.equal(cand.length, 1); assert.equal(cand[0].tipo, 'COMPRA_NAO_INFORMADA'); assert.equal(cand[0].colaboradorId, 'u_tec'); assert.equal(cand[0].resolvivel, true);
  // informada: a cobrança some
  const l = amb.tabelas.CMP_EXTRATO[0];
  const r = amb.api('s_tiago', 'informar', base({ valor: '88,00', dataCompra: '2026-10-15', extratoId: l.ID, comprovante: comprovante(9), atrasoMotivo: 'Estava viajando a serviço' }));
  assert.equal(r.gravada, true, r.message);
  assert.equal(amb.ctx.Compras_candidatosConduta_(us).length, 0);
});

test('painel: índices, Kanban por situação e Gantt do pedido à entrega; relatórios A4 salvos e registrados; técnico não vê', () => {
  const amb = ambiente();
  regrasDeTeste(amb);
  informar(amb, 's_tiago', { valor: '300,00' });
  informar(amb, 's_tiago', { valor: '120,00', recebido: false, previsaoEntrega: '2026-10-22', comprovante: comprovante(5), cartaoFinal: '5555' });
  const p = amb.api('s_carlos', 'painelGeral', { dias: 30 });
  assert.equal(p.ok, true, p.message);
  assert.equal(p.indices.qtd, 2); assert.equal(p.indicesTxt.total, 'R$ 420,00'); assert.equal(p.indices.informadas, 2);
  const col = (n) => p.kanban.find((c) => c.nome === n);
  assert.equal(col('Pedido feito').qtd, 1); assert.equal(col('Entregue').qtd, 1);
  const g = p.gantt.find((x) => x.situacao === 'PEDIDO_FEITO');
  assert.ok(g.enviadoMs > 0); assert.equal(g.aberto, true); assert.ok(g.visitaPrevMs > g.enviadoMs); assert.equal(g.prazo.estado, 'NO_PRAZO');
  assert.equal(p.porForma[0].t, 'Cartão de crédito');
  assert.match(amb.api('s_tiago', 'painelGeral', {}).message, /fila de compras é dos compradores/);
  // o comprador recebe a compra informada que "ainda vai chegar": peça disponível avisa quem comprou
  assert.ok(amb.tabelas.CMP_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_cmp' && v.TIPO === 'INFORMADA_A_RECEBER'));
  for (const tipo of ['COLABORADOR', 'CLIENTE', 'FORMA', 'PERIODO']) {
    const r = amb.api('s_carlos', 'gerarRelatorio', { tipo, dias: 30 });
    assert.equal(r.ok, true, tipo + ': ' + r.message);
    assert.match(r.html, /<figure class="grafico">|Nenhuma compra no período|Figura/, tipo);
    assert.match(r.html, /Índices do período/);
  }
  assert.match(amb.api('s_carlos', 'gerarRelatorio', { tipo: 'CONCILIACAO', final: '4321', competencia: '2026-11' }).message, /Financeiro/);
  const rc = amb.api('s_fabio', 'gerarRelatorio', { tipo: 'CONCILIACAO', final: '4321', competencia: '2026-11' });
  assert.equal(rc.ok, true, rc.message); assert.match(rc.html, /Compras informadas que caem nesta fatura/);
  assert.equal(amb.tabelas.CMP_DOCUMENTOS.length, 5);
  assert.equal(amb.api('s_carlos', 'documentos', {}).documentos.length, 4, 'a conciliação fica com o Financeiro e a gestão');
  assert.equal(amb.api('s_fabio', 'documentos', {}).documentos.length, 5);
  assert.ok(amb.api('s_fabio', 'documentos', {}).documentos.every((d) => d.htmlUrl && d.pdfUrl));
});

test('integração: compra ligada a chamado aparece no custo do chamado; a pedido do Comercial, na proposta; valores só para quem pode ver', () => {
  const amb = ambiente({ tabelas: { ATEC_CHAMADOS: [{ ID: 'ch1', NUMERO: 'CH-2026-0007', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', CLIENTE_NOME: 'Hospital Teste Alfa', EQUIPAMENTO_TEXTO: 'Autoclave AC-01', SITUACAO: 'EM_ATENDIMENTO' }] } });
  regrasDeTeste(amb);
  assert.match(amb.api('s_tiago', 'informar', base({ vinculo: { tipo: 'CHAMADO', chamadoNumero: 'CH-2026-9999' } })).message, /não foi encontrado/);
  const r = informar(amb, 's_tiago', { vinculo: { tipo: 'CHAMADO', chamadoNumero: 'ch-2026-0007' }, valor: '210,00' });
  const req = amb.tabelas.CMP_REQUISICOES.find((x) => x.NUMERO === r.numero);
  assert.equal(req.OS_AUVO, 'CH-2026-0007'); assert.equal(req.CHAMADO_NUMERO, 'CH-2026-0007'); assert.equal(req.CLIENTE_ID, 'c1');
  const ch = amb.api('s_tiago', 'chamados', { busca: 'alfa' });
  assert.equal(ch.chamados[0].numero, 'CH-2026-0007');
  const custoGestor = amb.ctx.Compras_custoDoChamado_('u_gt', 'CH-2026-0007', '');
  assert.equal(custoGestor.quantidade, 1); assert.equal(custoGestor.totalTxt, 'R$ 210,00'); assert.equal(custoGestor.compras[0].origem, 'Informada');
  const custoTec = amb.ctx.Compras_custoDoChamado_('u_tec2', 'CH-2026-0007', '');
  assert.equal(custoTec.totalTxt, ''); assert.equal(custoTec.compras[0].valorTxt, undefined, 'técnico não vê valor');
  assert.equal(amb.ctx.Compras_custoDoChamado_('u_gt', 'CH-2026-0001', ''), null);
});

test('matriz de avisos: CP02 (cobrança sutil: e-mail no expediente, WhatsApp só no resumo) e CP03 (resumo ao Financeiro) registrados', () => {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext('var MTZ_PADRAO = []; var MTZ_MODULOS_NOMES = {}; var MTZ_ORIGEM_EVENTO = {};' + fs.readFileSync(path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db/SGO_Avisos_Setores.js'), 'utf8'), ctx);
  const por = Object.fromEntries(ctx.MTZ_PADRAO.map((x) => [x.cod, x]));
  assert.equal(por.CP02.email, 'HORA'); assert.equal(por.CP02.whatsapp, 'RESUMO');
  assert.equal(por.CP03.email, 'RESUMO'); assert.equal(por.CP03.whatsapp, 'NAO');
});
