// Comercial, etapa 2 (10/11/2026): exclusão lógica da oportunidade (h), atividades da gestão na oportunidade (b, D7/D8),
// assinatura cadastrada do vendedor (g), repetidos no catálogo e na proposta (a, D18/D19), troca de responsável (D5),
// "Marcar como ganha" pela proposta (D6), voltar para rascunho com link ativo (D14) e botões só do responsável (D16).
// Código real (tests/_comercial_ambiente.cjs). Só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente, oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const nok = (r, re) => { assert.equal(r.ok, false, 'devia recusar'); if (re) assert.match(r.message, re); return r; };
const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const PNG = 'data:image/png;base64,iVBORw0KGgo' + 'A'.repeat(1200);
const JPG = 'data:image/jpeg;base64,' + Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.alloc(600, 7)]).toString('base64');

function amb(opcoes) {
  const a = ambiente(opcoes);
  for (const f of ['SGO_Assistencia_Config.js', 'SGO_Assistencia_Aceite.js']) vm.runInContext(fs.readFileSync(path.join(PASTA, f), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  a.gi = []; a.ctx.SGO_avisoGestaoIrreversivel_ = (x) => a.gi.push(x);
  return a;
}
function rascunho(a, sid, extra) {
  const { oportunidade, contato } = oportunidadeDeTeste(a, sid, extra);
  const np = ok(a.api(sid || 's_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  ok(a.api(sid || 's_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id: np.proposta.id, escopo: 'Qualificação térmica da autoclave da CME.', contatoId: contato.id,
    itens: [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '4.500,00', equipamentoId: 'eq1' }], condicoes: { pagamento: 'Boleto em 28 dias' } }));
  return { o: oportunidade, pid: np.proposta.id, contato };
}
function pronta(a, assinarMetrolab) {
  const x = rascunho(a);
  ok(a.api('s_vera', 'concluirProposta', { id: x.pid }));
  ok(a.api('s_vera', 'gerarDocumento', { id: x.pid }));
  const p = ok(a.api('s_vera', 'proposta', { id: x.pid })).proposta;
  if (assinarMetrolab !== false) ok(a.api('s_vera', 'assinarResponsavel', { id: p.id, pdfId: p.pdfId, marca: p.marcaConteudo, concordo: true, assinatura: PNG }));
  return { o: x.o, p, row: () => a.tabelas.COM_PROPOSTAS.find((r) => r.ID === p.id), opo: () => a.tabelas.COM_OPORTUNIDADES.find((r) => r.ID === x.o.id) };
}
const hist = (a, id) => a.tabelas.COM_HISTORICO.filter((h) => h.ENTIDADE_ID === id);
const atv = (a, id) => a.tabelas.ATV_ATIVIDADES.find((x) => x.ID === id);
const opoRow = (a, id) => a.tabelas.COM_OPORTUNIDADES.find((x) => x.ID === id);
const ATV = { proxima: { acao: 'Ligar para a coordenação da CME', data: '2026-10-21', hora: '14:00', tipo: 'LIGACAO' } };

// ------------------------------------------------------------------ h) exclusão da oportunidade
test('h: responsável exclui oportunidade de teste: linha fica, EXCLUIDA_*, proposta não enviada excluída, atividades canceladas, histórico, GI01', () => {
  const a = amb(), x = rascunho(a);
  const g = ok(a.api('s_gaspar', 'criarAtividadeOportunidade', Object.assign({ id: x.o.id }, ATV)));
  const antes = opoRow(a, x.o.id), atvProx = antes.ATIVIDADE_ID, n = a.tabelas.COM_OPORTUNIDADES.length;
  const f = ok(a.api('s_vera', 'oportunidade', { id: x.o.id }));
  assert.equal(f.podeExcluir, true);
  const r = ok(a.api('s_vera', 'excluirOportunidade', { id: x.o.id, motivo: 'Oportunidade criada para teste do sistema' }));
  assert.match(r.message, /excluída/);
  const o = opoRow(a, x.o.id);
  assert.equal(a.tabelas.COM_OPORTUNIDADES.length, n, 'nunca apaga a linha');
  assert.equal(o.SITUACAO, 'EXCLUIDA'); assert(o.EXCLUIDA_EM); assert.equal(o.EXCLUIDA_POR_ID, 'u_ven'); assert.equal(o.EXCLUIDA_MOTIVO, 'Oportunidade criada para teste do sistema');
  const p = a.tabelas.COM_PROPOSTAS.find((y) => y.ID === x.pid);
  assert.equal(p.SITUACAO, 'EXCLUIDA'); assert.match(p.EXCLUIDA_MOTIVO, /excluída/);
  assert.equal(atv(a, atvProx).SITUACAO, 'Cancelada'); assert.equal(atv(a, g.atividadeId).SITUACAO, 'Cancelada');
  assert(hist(a, x.o.id).some((h) => h.TIPO === 'EXCLUIDA' && /Motivo: Oportunidade criada para teste/.test(h.TEXTO)));
  assert(hist(a, x.pid).some((h) => h.TIPO === 'EXCLUIDA'));
  assert.equal(a.gi.length, 1); assert.equal(a.gi[0].evento, 'GI01'); assert.match(a.gi[0].oque, /Oportunidade excluída/);
  nok(a.api('s_vera', 'oportunidade', { id: x.o.id }), /foi excluída em .* por VERA VENDEDORA TESTE \(motivo: Oportunidade criada/);
});

test('h: listas, quadro, entrada, painel, ficha do cliente e pendências ignoram a excluída', () => {
  const a = amb(), x = rascunho(a), y = oportunidadeDeTeste(a, 's_vera', { titulo: 'Calibração de termômetros da CME' }).oportunidade;
  const ind0 = a.ctx.Com_indicadores_('2026-10', '').aberto.qtd;
  const ent0 = ok(a.api('s_vera', 'entrada')).abertas;
  ok(a.api('s_vera', 'excluirOportunidade', { id: x.o.id, motivo: 'Criada por engano em duplicidade' }));
  const lista = ok(a.api('s_gaspar', 'oportunidades', { situacao: 'TODAS' })).oportunidades;
  assert(!lista.some((o) => o.id === x.o.id)); assert(lista.some((o) => o.id === y.id));
  const q = ok(a.api('s_gaspar', 'quadro', { funil: 'ENGENHARIA' }));
  const cartoes = [].concat(...q.colunas.map((c) => c.cartoes || c.itens || []));
  assert(!cartoes.some((c) => c.id === x.o.id)); assert(cartoes.some((c) => c.id === y.id));
  assert.equal(ok(a.api('s_vera', 'entrada')).abertas, ent0 - 1);
  assert.equal(a.ctx.Com_indicadores_('2026-10', '').aberto.qtd, ind0 - 1);
  assert(!ok(a.api('s_gaspar', 'doCliente', { clienteId: 'c1' })).oportunidades.some((o) => o.id === x.o.id));
  assert(!ok(a.api('s_gaspar', 'propostas', { situacao: 'TODAS' })).propostas.some((p) => p.id === x.pid));
  // pendências: a excluída ficou sem próxima ação (cancelada), mas não vira pendência
  const itens = []; a.ctx.Pend_item_ = (t, o) => o; a.ctx.PEND_TIPOS = { comercial_sem_proxima: 1, comercial_parada: 1 }; a.ctx.Pend_abaExiste_ = () => true;
  a.ctx.Comercial_fontePendencias_((i) => itens.push(i), {});
  assert(!itens.some((i) => String(i.id).indexOf(x.o.id) >= 0));
  assert.equal(a.ctx.ComOpo_lerOportunidades_().length, a.tabelas.COM_OPORTUNIDADES.length - 1);
});

test('h: recusas com o motivo claro (motivo curto, outro vendedor, financeiro, enviada, link, ganha, contrato, banco de preços)', () => {
  let a = amb(), x = rascunho(a);
  nok(a.api('s_vera', 'excluirOportunidade', { id: x.o.id, motivo: 'teste' }), /pelo menos 10 letras/);
  nok(a.api('s_vito', 'excluirOportunidade', { id: x.o.id, motivo: 'Oportunidade criada para teste' }), /é de VERA/);
  nok(a.api('s_fabio', 'excluirOportunidade', { id: x.o.id, motivo: 'Oportunidade criada para teste' }));
  assert.equal(opoRow(a, x.o.id).SITUACAO, 'ABERTA');
  // gestão exclui a oportunidade de outra pessoa (o responsável é avisado)
  ok(a.api('s_gaspar', 'excluirOportunidade', { id: x.o.id, motivo: 'Oportunidade criada para teste' }));
  assert(a.tabelas.COM_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_ven' && v.TIPO === 'OPORTUNIDADE_EXCLUIDA'));
  // enviada ao cliente
  a = amb(); let y = pronta(a, false);
  ok(a.api('s_vera', 'marcarEnviada', { id: y.p.id, como: 'Entregue em mãos na reunião com a CME' }));
  let f = ok(a.api('s_vera', 'oportunidade', { id: y.o.id }));
  assert.equal(f.podeExcluir, false); assert.match(f.motivoSemExcluir, /Registrar perda/);
  nok(a.api('s_gaspar', 'excluirOportunidade', { id: y.o.id, motivo: 'Oportunidade criada para teste' }), /já foi ao cliente|está "enviada/);
  // link de assinatura enviado (versão anterior, só em Properties)
  a = amb(); y = pronta(a);
  const reg = JSON.parse(a.props['COM_ASS_RESP_' + y.p.id]); reg.linkHash = 'abc'; reg.clienteEmailEsperado = 'ana@alfa.exemplo.test'; a.props['COM_ASS_RESP_' + y.p.id] = JSON.stringify(reg);
  nok(a.api('s_vera', 'excluirOportunidade', { id: y.o.id, motivo: 'Oportunidade criada para teste' }), /link de assinatura enviado para ana@alfa/);
  // ganha
  a = amb(); x = rascunho(a); opoRow(a, x.o.id).SITUACAO = 'GANHA';
  nok(a.api('s_gaspar', 'excluirOportunidade', { id: x.o.id, motivo: 'Oportunidade criada para teste' }), /ganha.*reabre/);
  // contrato de Licitações vinculado
  a = amb({ tabelas: { LIC_CONTRATOS: [] } }); x = rascunho(a);
  a.tabelas.LIC_CONTRATOS.push({ ID: 'ct1', NUMERO: 'CTR-001', NUMERO_CONTRATO: '12/2026', COMERCIAL_OPO_ID: x.o.id });
  nok(a.api('s_gaspar', 'excluirOportunidade', { id: x.o.id, motivo: 'Oportunidade criada para teste' }), /contrato 12\/2026/);
  // perdida com proposta concluída: o banco de preços tem o preço como perdido
  a = amb(); x = rascunho(a); ok(a.api('s_vera', 'concluirProposta', { id: x.pid }));
  ok(a.api('s_vera', 'perder', { id: x.o.id, motivo: a.ctx.Com_metodologia_().motivosPerda[0], aprendizado: 'Teste do sistema registrado como perda por engano' }));
  nok(a.api('s_gaspar', 'excluirOportunidade', { id: x.o.id, motivo: 'Oportunidade criada para teste' }), /banco de preços como perdido.*Desconsiderar/);
  // perdida sem proposta: pode
  a = amb(); const z = oportunidadeDeTeste(a).oportunidade;
  ok(a.api('s_vera', 'perder', { id: z.id, motivo: a.ctx.Com_metodologia_().motivosPerda[0], aprendizado: 'Teste do sistema registrado como perda por engano' }));
  ok(a.api('s_vera', 'excluirOportunidade', { id: z.id, motivo: 'Oportunidade criada para teste' }));
  assert.equal(opoRow(a, z.id).SITUACAO, 'EXCLUIDA');
});

// ------------------------------------------------------------------ b) atividades da gestão (D7, D8)
test('b: atividade da gestão: título com código e cliente, ids na oportunidade, ficha mostra e gestor comercial sem perfil de gestor cria', () => {
  const a = amb({ props: { GESTAO_DECISOES_CFG: JSON.stringify({ gestoresPorArea: { COMERCIAL: ['u_ven2'] } }) } });
  const o = oportunidadeDeTeste(a).oportunidade;
  // vito tem perfil COMERCIAL, mas é gestão comercial pela Caixa de decisões (antes: Minhas atividades recusava)
  const r = ok(a.api('s_vito', 'criarAtividadeOportunidade', Object.assign({ id: o.id }, ATV)));
  const t = atv(a, r.atividadeId);
  assert.equal(t.TITULO, '[' + o.codigo + '] Ligar para a coordenação da CME — Hospital Teste Alfa');
  assert.equal(t.RESPONSAVEL_ID, 'u_ven'); assert.match(t.DESCRICAO, /Pedida pela gestão comercial: VITO VENDEDOR TESTE/); assert.equal(t.RESTRITA, 'SIM');
  const lista = JSON.parse(opoRow(a, o.id).ATIVIDADES_GESTAO_JSON);
  assert.equal(lista[0].id, r.atividadeId); assert.equal(lista[0].porNome, 'VITO VENDEDOR TESTE');
  const f = ok(a.api('s_vito', 'oportunidade', { id: o.id }));
  assert.equal(f.podeCriarAtividadeGestao, true);
  assert.equal(f.atividadesGestao.length, 1);
  assert.deepEqual([f.atividadesGestao[0].responsavel, f.atividadesGestao[0].prazo, f.atividadesGestao[0].situacao, f.atividadesGestao[0].aberta], ['VERA VENDEDORA TESTE', '21/10/2026 14:00', 'A fazer', true]);
  assert(hist(a, o.id).some((h) => h.TIPO === 'ATIVIDADE_GESTAO' && /pedida por VITO VENDEDOR TESTE/.test(h.TEXTO)));
  assert.equal(ok(a.api('s_vera', 'oportunidade', { id: o.id })).podeCriarAtividadeGestao, false);
  nok(a.api('s_vera', 'criarAtividadeOportunidade', Object.assign({ id: o.id }, ATV)), /gestão comercial/);
});

test('b: ganhar, perder e excluir cancelam as atividades abertas da gestão; a troca de responsável as transfere', () => {
  let a = amb(), o = oportunidadeDeTeste(a).oportunidade;
  let r = ok(a.api('s_gaspar', 'criarAtividadeOportunidade', Object.assign({ id: o.id }, ATV)));
  ok(a.api('s_vera', 'ganhar', { id: o.id }));
  assert.equal(atv(a, r.atividadeId).SITUACAO, 'Cancelada');
  a = amb(); o = oportunidadeDeTeste(a).oportunidade;
  r = ok(a.api('s_gaspar', 'criarAtividadeOportunidade', Object.assign({ id: o.id }, ATV)));
  ok(a.api('s_vera', 'perder', { id: o.id, motivo: a.ctx.Com_metodologia_().motivosPerda[0], aprendizado: 'Cliente fechou com outro fornecedor' }));
  assert.equal(atv(a, r.atividadeId).SITUACAO, 'Cancelada');
  a = amb(); o = oportunidadeDeTeste(a).oportunidade;
  r = ok(a.api('s_gaspar', 'criarAtividadeOportunidade', Object.assign({ id: o.id }, ATV)));
  const cheia = ok(a.api('s_gaspar', 'oportunidade', { id: o.id })).oportunidade;
  ok(a.api('s_gaspar', 'salvarOportunidade', Object.assign({}, cheia, { valor: '4.500,00', responsavelId: 'u_ven2' })));
  const t = atv(a, r.atividadeId);
  assert.equal(t.RESPONSAVEL_ID, 'u_ven2'); assert(!['Concluída', 'Cancelada'].includes(t.SITUACAO));
  assert(hist(a, o.id).some((h) => h.TIPO === 'RESPONSAVEL' && /1 atividade da gestão passou para VITO/.test(h.TEXTO)));
});

// ------------------------------------------------------------------ D5) troca de responsável
test('D5: rascunho passa ao novo responsável; a assinada pela Metrolab e a enviada pelo link ficam; os dois são avisados', () => {
  const a = amb(), x = pronta(a);
  ok(a.api('s_vera', 'linkAssinatura', { id: x.p.id, email: 'ana@alfa.exemplo.test' })); // enviada pelo link
  const p2 = ok(a.api('s_vera', 'novaProposta', { oportunidadeId: x.o.id })).proposta;
  const cheia = ok(a.api('s_gaspar', 'oportunidade', { id: x.o.id })).oportunidade;
  const r = ok(a.api('s_gaspar', 'salvarOportunidade', Object.assign({}, cheia, { valor: '4.500,00', responsavelId: 'u_ven2' })));
  assert.match(r.message, /Propostas que passaram junto: PROP-2026-0002 rev\.00/); assert.match(r.message, /Continuam com VERA VENDEDORA TESTE: PROP-2026-0001 rev\.00 \(já foi assinada pela Metrolab/);
  assert.equal(a.tabelas.COM_PROPOSTAS.find((p) => p.ID === p2.id).RESPONSAVEL_ID, 'u_ven2');
  assert.equal(x.row().RESPONSAVEL_ID, 'u_ven');
  assert(hist(a, p2.id).some((h) => h.TIPO === 'RESPONSAVEL' && /passou junto/.test(h.TEXTO)));
  assert(hist(a, x.p.id).some((h) => h.TIPO === 'RESPONSAVEL_MANTIDO' && /continua com VERA/.test(h.TEXTO)));
  assert(a.tabelas.COM_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_ven' && v.TIPO === 'OPORTUNIDADE_TRANSFERIDA' && /Continuam com você/.test(v.TEXTO)));
  assert(a.tabelas.COM_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_ven2' && v.TIPO === 'OPORTUNIDADE_RECEBIDA'));
  // o novo responsável vê e trabalha a proposta que passou; a outra continua da Vera
  ok(a.api('s_vito', 'proposta', { id: p2.id })); nok(a.api('s_vito', 'proposta', { id: x.p.id }), /é de VERA/);
});

test('D5: pronta sem assinatura passa; pronta assinada pela Metrolab fica com quem assinou', () => {
  let a = amb(), x = pronta(a, false);
  let cheia = ok(a.api('s_gaspar', 'oportunidade', { id: x.o.id })).oportunidade;
  ok(a.api('s_gaspar', 'salvarOportunidade', Object.assign({}, cheia, { valor: '4.500,00', responsavelId: 'u_ven2' })));
  assert.equal(x.row().RESPONSAVEL_ID, 'u_ven2');
  a = amb(); x = pronta(a, true);
  cheia = ok(a.api('s_gaspar', 'oportunidade', { id: x.o.id })).oportunidade;
  const r = ok(a.api('s_gaspar', 'salvarOportunidade', Object.assign({}, cheia, { valor: '4.500,00', responsavelId: 'u_ven2' })));
  assert.equal(x.row().RESPONSAVEL_ID, 'u_ven'); assert.match(r.message, /assinada pela Metrolab/);
});

// ------------------------------------------------------------------ D6) ganhar pela ficha
test('D6: com proposta pronta, a ficha leva ao aceite (servidor recusa ganhar sem nada); sem proposta, a observação é obrigatória', () => {
  let a = amb(), x = pronta(a, false);
  const f = ok(a.api('s_vera', 'oportunidade', { id: x.o.id }));
  assert.deepEqual([f.propostaParaAceite.id, f.propostaParaAceite.acao], [x.p.id, 'resposta']);
  nok(a.api('s_vera', 'ganhar', { id: x.o.id, texto: 'Cliente aprovou por telefone', daFicha: true }), /Registrar resposta do cliente/);
  assert.equal(x.opo().SITUACAO, 'ABERTA');
  a = amb(); const o = oportunidadeDeTeste(a).oportunidade;
  assert.equal(ok(a.api('s_vera', 'oportunidade', { id: o.id })).propostaParaAceite, null);
  nok(a.api('s_vera', 'ganhar', { id: o.id, texto: 'ok', daFicha: true }), /observação \(pelo menos 10 letras\)/);
  ok(a.api('s_vera', 'ganhar', { id: o.id, texto: 'Contrato assinado na reunião presencial', daFicha: true }));
  const row = opoRow(a, o.id);
  assert.equal(row.SITUACAO, 'GANHA'); assert.equal(row.GANHA_VIA, 'MANUAL');
  assert(hist(a, o.id).some((h) => h.TIPO === 'GANHA' && /Contrato assinado na reunião presencial/.test(h.TEXTO)));
});

// ------------------------------------------------------------------ D14) voltar para rascunho com link ativo
test('D14: voltar para rascunho com link ativo exige confirmação, cancela o link e registra no histórico', () => {
  const a = amb(), x = pronta(a);
  const tok = 'cd'.repeat(32), hash = a.ctx.Com_marca_(tok), reg = JSON.parse(a.props['COM_ASS_RESP_' + x.p.id]);
  reg.clienteEmailEsperado = 'ana@alfa.exemplo.test'; reg.linkHash = hash; reg.linkEnviadoEm = '2026-10-19T09:00';
  a.props['COM_ASS_RESP_' + x.p.id] = JSON.stringify(reg); a.props['COM_ASS_LINK_' + hash] = x.p.id;
  assert.equal(a.ctx.ComP_assinaturaVer_(tok).ok, true);
  nok(a.api('s_vera', 'voltarRascunho', { id: x.p.id }), /o link enviado para ana@alfa\.exemplo\.test deixa de abrir/);
  assert.equal(x.row().SITUACAO, 'PRONTA'); assert(a.props['COM_ASS_LINK_' + hash]);
  const r = ok(a.api('s_vera', 'voltarRascunho', { id: x.p.id, cancelarLink: true }));
  assert.match(r.message, /link de assinatura enviado para ana@alfa\.exemplo\.test .* foi cancelado/);
  assert.equal(x.row().SITUACAO, 'RASCUNHO'); assert.equal(a.props['COM_ASS_LINK_' + hash], undefined);
  assert.equal(a.ctx.ComP_assinaturaVer_(tok).codigo, 'INDISPONIVEL');
  assert(hist(a, x.p.id).some((h) => h.TIPO === 'RASCUNHO' && /foi cancelado e deixa de abrir \(confirmado por VERA/.test(h.TEXTO)));
  // sem link: volta sem pedir nada
  const b = amb(), y = pronta(b, false);
  ok(b.api('s_vera', 'voltarRascunho', { id: y.p.id }));
});

// ------------------------------------------------------------------ g) Minha assinatura
test('g: enviar PNG, trocar por JPG (anterior guardada), remover; arquivo privado com SHA; recusas de formato e tamanho', () => {
  const a = amb();
  assert.equal(ok(a.api('s_vera', 'minhaAssinatura')).assinatura, null);
  ok(a.api('s_vera', 'salvarMinhaAssinatura', { imagem: PNG }));
  let m = ok(a.api('s_vera', 'minhaAssinatura'));
  assert.equal(m.assinatura.tipo, 'image/png'); assert.match(m.assinatura.imagem, /^data:image\/png;base64,iVBORw0KGgo/); assert.equal(m.assinatura.sha.length, 64);
  const l1 = a.tabelas.COM_ASSINATURAS_USUARIO[0];
  assert.equal(l1.SITUACAO, 'ATIVA'); assert.equal(a.arquivos[l1.ARQUIVO_ID].nome.endsWith('.png'), true);
  ok(a.api('s_vera', 'salvarMinhaAssinatura', { imagem: JPG }));
  m = ok(a.api('s_vera', 'minhaAssinatura'));
  assert.equal(m.assinatura.tipo, 'image/jpeg'); assert.equal(m.historico.length, 2);
  assert.equal(l1.SITUACAO, 'SUBSTITUIDA'); assert(l1.SUBSTITUIDA_EM); assert(a.arquivos[l1.ARQUIVO_ID], 'a versão anterior não é apagada');
  ok(a.api('s_vera', 'removerMinhaAssinatura'));
  assert.equal(ok(a.api('s_vera', 'minhaAssinatura')).assinatura, null);
  assert.equal(a.tabelas.COM_ASSINATURAS_USUARIO.filter((r) => r.SITUACAO === 'REMOVIDA').length, 1);
  assert(hist(a, 'u_ven').some((h) => h.TIPO === 'ASSINATURA_TROCADA') && hist(a, 'u_ven').some((h) => h.TIPO === 'ASSINATURA_REMOVIDA'));
  nok(a.api('s_vera', 'removerMinhaAssinatura'), /não tem assinatura/);
  nok(a.api('s_vera', 'salvarMinhaAssinatura', { imagem: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' }), /PNG ou JPG/);
  nok(a.api('s_vera', 'salvarMinhaAssinatura', { imagem: 'data:image/png;base64,' + Buffer.from('GIF89a texto qualquer').toString('base64') }), /não é uma imagem PNG ou JPG válida/);
  nok(a.api('s_vera', 'salvarMinhaAssinatura', { imagem: 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 13, 10, 26, 10]), Buffer.alloc(300 * 1024)]).toString('base64') }), /limite é 300 KB/);
  nok(a.api('s_fabio', 'salvarMinhaAssinatura', { imagem: PNG }));
});

test('g: assinar pela Metrolab com a assinatura cadastrada (JPG): concordância e PDF conferidos, histórico com SHA, PDF final aceita JPG; SHA alterado é recusado', () => {
  const a = amb(), x = pronta(a, false);
  nok(a.api('s_vera', 'assinarResponsavel', { id: x.p.id, pdfId: x.p.pdfId, marca: x.p.marcaConteudo, concordo: true, usarCadastrada: true }), /não tem assinatura cadastrada/);
  ok(a.api('s_vera', 'salvarMinhaAssinatura', { imagem: JPG }));
  const tela = ok(a.api('s_vera', 'proposta', { id: x.p.id })).proposta;
  assert.match(tela.assinaturaCadastrada.imagem, /^data:image\/jpeg;base64,/);
  assert.equal(ok(a.api('s_gaspar', 'proposta', { id: x.p.id })).proposta.assinaturaCadastrada, undefined);
  nok(a.api('s_vera', 'assinarResponsavel', { id: x.p.id, pdfId: x.p.pdfId, marca: x.p.marcaConteudo, concordo: false, usarCadastrada: true }), /concordância/);
  nok(a.api('s_vera', 'assinarResponsavel', { id: x.p.id, pdfId: 'outro', marca: x.p.marcaConteudo, concordo: true, usarCadastrada: true }), /PDF atualizado/);
  // arquivo da assinatura cadastrada alterado: o SHA não confere e não é usado
  const l = a.tabelas.COM_ASSINATURAS_USUARIO.find((r) => r.SITUACAO === 'ATIVA'), bytes = a.arquivos[l.ARQUIVO_ID].bytes;
  a.arquivos[l.ARQUIVO_ID].bytes = Buffer.concat([bytes, Buffer.from([1])]);
  nok(a.api('s_vera', 'assinarResponsavel', { id: x.p.id, pdfId: x.p.pdfId, marca: x.p.marcaConteudo, concordo: true, usarCadastrada: true }), /não confere com o registrado/);
  a.arquivos[l.ARQUIVO_ID].bytes = bytes;
  const r = ok(a.api('s_vera', 'assinarResponsavel', { id: x.p.id, pdfId: x.p.pdfId, marca: x.p.marcaConteudo, concordo: true, usarCadastrada: true }));
  assert.equal(r.cadastrada, true);
  const reg = JSON.parse(a.props['COM_ASS_RESP_' + x.p.id]);
  assert.equal(reg.origem, 'CADASTRADA'); assert.equal(reg.assinaturaTipo, 'image/jpeg'); assert.equal(reg.cadastradaSha, l.SHA256);
  assert(hist(a, x.p.id).some((h) => h.TIPO === 'ASSINATURA_METROLAB' && h.TEXTO.includes('assinatura cadastrada') && h.TEXTO.includes(l.SHA256)));
  // o documento aceita a imagem JPG; outros formatos continuam fora
  assert.match(a.ctx.ComDoc_assinaturaProposta_('Vera', 'pela Metrolabs', { imagem: JPG, em: '2026-10-19T10:00' }), /<img alt="Assinatura"/);
  assert.doesNotMatch(a.ctx.ComDoc_assinaturaProposta_('Vera', 'pela Metrolabs', { imagem: 'data:image/gif;base64,R0lGOD', em: '' }), /<img/);
  // o cliente assina pelo link: o PDF final sai com a assinatura JPG da Metrolab
  const lk = ok(a.api('s_vera', 'linkAssinatura', { id: x.p.id, email: 'ana@alfa.exemplo.test' }));
  let html = '';
  const fin = a.ctx.RelA4_finalizar_; a.ctx.RelA4_finalizar_ = (h, n) => { html = h; return fin(h, n); };
  const res = a.ctx.ComP_assinaturaResponder_(lk.caminho.split('#')[1], { decisao: 'APROVADO', nome: 'Ana Enfermeira Teste', cargo: 'Coordenadora', email: 'ana@alfa.exemplo.test', concordo: true, assinatura: PNG }, { ip: '10.0.0.1', navegador: 'teste' });
  assert.equal(res.ok, true); assert.match(html, /src="data:image\/jpeg;base64,/);
  assert.equal(x.row().SITUACAO, 'APROVADA');
});

// ------------------------------------------------------------------ a) repetidos
test('a: catálogo: "Excluir repetido" exige outro ativo de mesmo nome e qual fica; grava JUNTADO_*; não reativa; sem catálogo não exclui', () => {
  const a = amb();
  const p1 = ok(a.api('s_gaspar', 'salvarProduto', { codigo: 'QT-1', tipo: 'SERVICO', nome: 'Qualificação térmica teste', unidade: 'un.', preco: '100', custo: '20' })).produto;
  const p3 = ok(a.api('s_gaspar', 'salvarProduto', { codigo: 'QT-3', tipo: 'SERVICO', nome: 'Serviço sem repetição', unidade: 'un.', preco: '100', custo: '20' })).produto;
  a.tabelas.COM_PRODUTOS.push({ ID: 'p2', CODIGO: 'QT-2', TIPO: 'SERVICO', NOME: 'Qualificação Térmica  teste', UNIDADE_MEDIDA: 'un.', PRECO: 110, ATIVO: 'SIM' });
  const cat = ok(a.api('s_gaspar', 'catalogo', { situacao: 'DUPLICADOS' })).produtos;
  const c1 = cat.find((p) => p.id === p1.id);
  assert.equal(c1.duplicado, true); assert.deepEqual(c1.repetidoCom.map((x) => x.id), ['p2']);
  assert(!ok(a.api('s_gaspar', 'catalogo', {})).produtos.find((p) => p.id === p3.id).duplicado);
  nok(a.api('s_gaspar', 'excluirProdutoDuplicado', { id: p3.id, manterId: p1.id, motivo: 'Cadastrado duas vezes por engano' }), /não é repetido/);
  nok(a.api('s_gaspar', 'excluirProdutoDuplicado', { id: 'p2', motivo: 'Cadastrado duas vezes por engano' }), /escolha qual item fica.*QT-1/);
  // vendedor (catálogo de venda) continua podendo excluir repetido, como já podia; quem não tem catálogo, não
  nok(a.api('s_tiago', 'excluirProdutoDuplicado', { id: 'p2', manterId: p1.id, motivo: 'Cadastrado duas vezes por engano' }), /./);
  const r = ok(a.api('s_gaspar', 'excluirProdutoDuplicado', { id: 'p2', manterId: p1.id, motivo: 'Cadastrado duas vezes por engano' }));
  assert.match(r.message, /fica QT-1/);
  const p2 = a.tabelas.COM_PRODUTOS.find((p) => p.ID === 'p2');
  assert.deepEqual([p2.ATIVO, p2.JUNTADO_COM_ID, p2.JUNTADO_POR_NOME], ['NAO', p1.id, 'GASPAR GESTOR COMERCIAL TESTE']); assert(p2.JUNTADO_EM);
  assert(hist(a, 'p2').some((h) => /Exclusão de duplicado: .* Fica o item QT-1/.test(h.TEXTO))); assert(hist(a, p1.id).some((h) => h.TIPO === 'REPETIDO_JUNTADO'));
  nok(a.api('s_gaspar', 'arquivarProduto', { id: 'p2', reativar: true }), /foi juntado/);
});

test('a: proposta: o mesmo item do catálogo (mesmo equipamento e prazo) duas vezes é recusado com o caminho; outro equipamento é aceito', () => {
  const a = amb();
  a.tabelas.CAD_EQUIPAMENTOS.push({ ID: 'eq2', CLIENTE_ID: 'c1', UNIDADE_ID: 'un1', TIPO: 'Autoclave', TAG: 'AC-02', SETOR: 'CME', STATUS: 'ATIVO' });
  const prod = ok(a.api('s_gaspar', 'salvarProduto', { codigo: 'QT-AC', tipo: 'SERVICO', nome: 'Qualificação de autoclave teste', unidade: 'un.', preco: '4500', custo: '900' })).produto;
  const x = rascunho(a);
  const item = (eq) => ({ produtoId: prod.id, descricao: 'Qualificação de autoclave teste', quantidade: 1, precoUnitario: '4.500,00', equipamentoId: eq });
  const r = nok(a.api('s_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id: x.pid, contatoId: x.contato.id, itens: [item('eq1'), item('eq1')], condicoes: { pagamento: 'Boleto' } }),
    /o item 2 repete o item 1 .*Por quê:.*Como corrigir: some a quantidade no item 1 e exclua o item 2/);
  assert.equal(JSON.parse(a.tabelas.COM_PROPOSTAS.find((p) => p.ID === x.pid).ITENS_JSON).length, 1, 'nada foi gravado');
  ok(a.api('s_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id: x.pid, contatoId: x.contato.id, itens: [item('eq1'), item('eq2')], condicoes: { pagamento: 'Boleto' } }));
  // itens avulsos (fora do catálogo) com o mesmo texto não são conferidos
  ok(a.api('s_vera', 'salvarProposta', { deslocamento: SEM_VIAGEM, id: x.pid, contatoId: x.contato.id, itens: [{ descricao: 'Visita técnica', quantidade: 1, precoUnitario: '100' }, { descricao: 'Visita técnica', quantidade: 1, precoUnitario: '100' }], condicoes: { pagamento: 'Boleto' } }));
});

// ------------------------------------------------------------------ telas desenhadas com o retorno real do servidor
function telaComercial(a, sid) {
  const html = fs.readFileSync(path.join(PASTA, 'JS_Comercial.html'), 'utf8');
  const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  const vivos = new Set();
  const unesc = (v) => String(v).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  function elem(attrs) {
    const e = { attrs: attrs || {}, style: {}, _html: '', _els: {}, textContent: '', value: '', checked: false, disabled: false,
      set innerHTML(v) { Object.values(this._els).flat().forEach((x) => vivos.delete(x)); this._html = String(v); this._els = {}; },
      get innerHTML() { return this._html; },
      getAttribute(k) { return this.attrs[k]; }, remove() { vivos.delete(this); this.removido = true; }, appendChild() {}, select() {}, focus() {}, scrollIntoView() {}, addEventListener() {}, setPointerCapture() {}, toDataURL: () => PNG,
      getContext: () => ({ beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, clearRect() {} }), getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 180 }),
      querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
      querySelectorAll(sel) {
        if (this._els[sel]) return this._els[sel];
        let l = [];
        const m = /^#([\w-]+)$/.exec(sel), at = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(sel), cl = /^\.([\w-]+)$/.exec(sel);
        if (m) { const t = new RegExp('<[^>]*\\bid="' + m[1] + '"[^>]*>').exec(this._html); if (t) { const v = /\bvalue="([^"]*)"/.exec(t[0]); l = [elem({ id: m[1] })]; l[0].value = v ? unesc(v[1]) : ''; } }
        else if (at) { const re = new RegExp('\\b' + at[1] + '="([^"]*)"', 'g'); let x; while ((x = re.exec(this._html))) if (at[2] === undefined || x[1] === at[2]) l.push(elem({ [at[1]]: x[1] }));  if (!l.length && at[2] === undefined && new RegExp('\\b' + at[1] + '[\\s>]').test(this._html)) l.push(elem({ [at[1]]: '' })); }
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
  const janela = { confirm: () => true, prompt: () => null };
  const ctx = vm.createContext({ console, setTimeout, URL, location: { origin: 'https://sgo.exemplo.test' }, document, window: janela, confirm: () => true, alert() {},
    USER_CONTEXT: { perfil: 'COMERCIAL' }, escapeHtml_: (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
    SGO_iniciarCarregamento_() {}, SGO_finalizarCarregamento_() {}, google: { script: { run: {} } } });
  vm.runInContext(script, ctx);
  const chamadas = [];
  ctx.Com_chamar_ = (acao, d, okf, erro) => { chamadas.push({ acao, d }); const r = a.api(sid, acao, d); if (r.ok) okf(r); else if (erro) erro(r.message); };
  vm.runInContext('Com_chamar_ = this.Com_chamar_;', ctx);
  ctx.CM.ini = a.api(sid, 'iniciar');
  const g = elem({}); g._els.h3 = [elem({})];
  const abrirProp = (id) => { ctx.Com_chamar_('proposta', { id }, (r) => ctx.Comercial_desenharProposta_(g, r.proposta)); return corpo; };
  const abrirOpo = (id) => { ctx.Com_chamar_('oportunidade', { id }, (r) => ctx.Comercial_desenharOportunidade_(g, r)); return corpo; };
  const clicar = (raiz, sel) => { const m = /^\[([\w-]+)="([^"]*)"\]$/.exec(sel); const b = raiz.querySelectorAll('[' + m[1] + ']').find((x) => x.getAttribute(m[1]) === m[2]); assert(b, 'sem ' + sel); b.onclick(); };
  return { ctx, corpo, modais, abrirProp, abrirOpo, clicar, chamadas, document, janela };
}

test('tela D16: a gestão não vê "Assinar pela Metrolab" nem o link e lê a explicação; o responsável vê', () => {
  const a = amb(), x = pronta(a, false);
  let t = telaComercial(a, 's_gaspar');
  let c = t.abrirProp(x.p.id);
  assert.doesNotMatch(c.innerHTML, /data-acao="assinarResponsavel"/); assert.doesNotMatch(c.innerHTML, /data-acao="linkAssinatura"/);
  assert.match(c.innerHTML, /Só o responsável pela proposta \(VERA VENDEDORA TESTE\) assina pela Metrolab e envia o link/);
  t = telaComercial(a, 's_vera');
  c = t.abrirProp(x.p.id);
  assert.match(c.innerHTML, /data-acao="assinarResponsavel"/); assert.doesNotMatch(c.innerHTML, /Só o responsável pela proposta/);
});

test('tela g: a janela "Assinar pela Metrolab" mostra a assinatura cadastrada e exige "Li e concordo" para usá-la', () => {
  const a = amb(), x = pronta(a, false);
  ok(a.api('s_vera', 'salvarMinhaAssinatura', { imagem: PNG }));
  const t = telaComercial(a, 's_vera');
  const c = t.abrirProp(x.p.id);
  t.clicar(c, '[data-acao="assinarResponsavel"]');
  const ov = t.modais[t.modais.length - 1];
  assert.match(ov.innerHTML, /id="cmAssCadImg"[^>]*src="data:image\/png;base64,iVBORw0KGgo/); assert.match(ov.innerHTML, /Usar minha assinatura cadastrada/); assert.match(ov.innerHTML, /id="cmAssQuadro"/);
  ov.querySelector('#cmAssUsar').onclick();
  assert.match(t.document.getElementById('cmAssMsg') ? ov.innerHTML : '', /cmAssMsg/);
  assert(!t.chamadas.some((ch) => ch.acao === 'assinarResponsavel'), 'sem a concordância nada é enviado');
  ov.querySelector('#cmAssConcordo').checked = true;
  ov.querySelector('#cmAssUsar').onclick();
  const ch = t.chamadas.find((y) => y.acao === 'assinarResponsavel');
  assert.equal(ch.d.usarCadastrada, true); assert.equal(ch.d.concordo, true);
  assert.equal(JSON.parse(a.props['COM_ASS_RESP_' + x.p.id]).origem, 'CADASTRADA');
});

test('tela D6 e b: "Marcar como ganha" abre a proposta no aceite; gestão vê "Criar atividade" em destaque e "Atividades da gestão"; excluir na ficha', () => {
  const a = amb(), x = pronta(a, false);
  ok(a.api('s_gaspar', 'criarAtividadeOportunidade', Object.assign({ id: x.o.id }, ATV)));
  let t = telaComercial(a, 's_gaspar');
  let c = t.abrirOpo(x.o.id);
  assert.match(c.innerHTML, /class="btn-primary" data-acao="atividadeGestao"/); assert.match(c.innerHTML, /Atividades da gestão/); assert.match(c.innerHTML, /\[OPO-2026-0001\] Ligar para a coordenação da CME/);
  assert.match(c.innerHTML, /data-acao="excluirOpo"/);
  t.clicar(c, '[data-acao="ganha"]');
  assert.match(t.corpo.innerHTML, /registre o aceite do cliente na proposta PROP-2026-0001/);
  assert.match(t.document.getElementById('cmPropAcao').innerHTML, /id="cmRTipo"/);
  assert.equal(x.opo().SITUACAO, 'ABERTA');
  // sem proposta: formulário com a observação obrigatória
  const o2 = oportunidadeDeTeste(a, 's_vera', { titulo: 'Calibração de termômetros da CME' }).oportunidade;
  t = telaComercial(a, 's_vera');
  c = t.abrirOpo(o2.id);
  assert.doesNotMatch(c.innerHTML, /data-acao="atividadeGestao"/);
  t.clicar(c, '[data-acao="ganha"]');
  const area = t.document.getElementById('cmOpoAcao');
  assert.match(area.innerHTML, /Observação \(obrigatória/);
  t.document.getElementById('cmGObs').value = 'curto';
  t.document.getElementById('cmGOk').onclick();
  assert(!t.chamadas.some((ch) => ch.acao === 'ganhar'));
  // ficha da oportunidade com proposta enviada: sem o botão de excluir, com o motivo
  ok(a.api('s_vera', 'marcarEnviada', { id: x.p.id, como: 'Entregue em mãos na reunião com a CME' }));
  t = telaComercial(a, 's_vera');
  c = t.abrirOpo(x.o.id);
  assert.doesNotMatch(c.innerHTML, /data-acao="excluirOpo"/); assert.match(c.innerHTML, /Excluir oportunidade: A proposta PROP-2026-0001 rev\.00 está &quot;enviada ao cliente&quot;|Excluir oportunidade: A proposta/);
});

test('tela D14 e a: voltar com link ativo pede confirmação; o item repetido do catálogo oferece somar à quantidade', () => {
  const a = amb(), x = pronta(a);
  const reg = JSON.parse(a.props['COM_ASS_RESP_' + x.p.id]); reg.linkHash = a.ctx.Com_marca_('ef'.repeat(32)); reg.clienteEmailEsperado = 'ana@alfa.exemplo.test';
  a.props['COM_ASS_RESP_' + x.p.id] = JSON.stringify(reg); a.props['COM_ASS_LINK_' + reg.linkHash] = x.p.id;
  const t = telaComercial(a, 's_vera');
  let msg = '';
  t.janela.confirm = (m) => { msg = m; return false; };
  const c = t.abrirProp(x.p.id);
  t.clicar(c, '[data-acao="voltar"]');
  assert.match(msg, /o link enviado para ana@alfa\.exemplo\.test deixa de abrir/); assert.equal(x.row().SITUACAO, 'PRONTA');
  t.janela.confirm = () => true;
  t.clicar(c, '[data-acao="voltar"]');
  assert.equal(t.chamadas.filter((ch) => ch.acao === 'voltarRascunho').pop().d.cancelarLink, true); assert.equal(x.row().SITUACAO, 'RASCUNHO');
  // editor: o mesmo produto escolhido duas vezes soma à quantidade
  vm.runInContext('Comercial_lerItens_ = function () {}; Comercial_desenharItens_ = function () {};', t.ctx);
  t.ctx.CM.itens = [{ produtoId: 'pX', descricao: 'Serviço X', quantidade: 2, equipamentoId: 'eq1', faixa: '' }, { produtoId: '', descricao: 'ser', quantidade: 1, equipamentoId: 'eq1', faixa: '' }];
  t.ctx.Comercial_aplicarProduto_(1, { id: 'pX', nome: 'Serviço X', codigo: 'X', tipo: 'SERVICO', preco: 10, unidade: 'un.' });
  assert.equal(t.ctx.CM.itens.length, 1); assert.equal(t.ctx.CM.itens[0].quantidade, 3);
});

test('ajuda, tela e leitor único: manual atualizado e as telas ligadas às ações novas', () => {
  const ajuda = fs.readFileSync(path.join(PASTA, 'SGO_Ajuda_Comercial.js'), 'utf8');
  for (const t of ['Excluir oportunidade (teste ou engano)', 'Atividades da gestão', 'Minha assinatura', 'Usar minha assinatura cadastrada', 'Excluir repetido', 'somar à quantidade', 'deixa de abrir', 'Trocar o responsável', 'observação (pelo menos 10 letras)']) assert(ajuda.includes(t), t);
  const tela = fs.readFileSync(path.join(PASTA, 'JS_Comercial.html'), 'utf8');
  for (const t of ['excluirOportunidade', 'salvarMinhaAssinatura', 'removerMinhaAssinatura', 'usarCadastrada: true', 'cancelarLink', 'manterId', 'daFicha: true', '!p.duplicado']) assert(tela.includes(t), t);
  for (const f of ['SGO_Comercial_Painel.js', 'SGO_Comercial_Gestora.js', 'SGO_Comercial_Quadro.js', 'SGO_Comercial_Especialista.js', 'SGO_Comercial_Orcamentista.js']) assert.doesNotMatch(fs.readFileSync(path.join(PASTA, f), 'utf8'), /Com_ler_\(COM_ABAS\.OPORTUNIDADES\)/, f);
});
