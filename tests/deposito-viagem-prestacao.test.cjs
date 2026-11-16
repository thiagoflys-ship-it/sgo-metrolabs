// Depósito de viagem, ETAPA 2 (11/11/2026, pedido do dono): prestação de contas item a item ligada às linhas orçadas, comprovante
// obrigatório (foto ou PDF) com leitura por IA opcional, gasto sem comprovante só com justificativa e dentro do limite da política
// (padrão vazio = não aceito), conta calculada (a devolver / a reembolsar), prazo em dias úteis com avisos, trava de quem tem
// prestação vencida (liberação da Diretoria), conferência do Financeiro item a item (aceita ou glosa), acerto do saldo com
// comprovante, ciência do Matheus com o A4 de fechamento, Kanban/Gantt/relatórios, pendências, caixa VIAGEM_CONFERIR (lote 12) e os
// dados organizados para o módulo de conciliação com o Caju (que NÃO é desta etapa). Código real do SGO+; nada sai de verdade.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente, criarCompleta, PASTA } = require('./_viagem_ambiente.cjs');

const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
const recusa = (r, re) => { assert.equal(r.ok, false, 'esperava recusa, veio ok'); if (re) assert.match(r.message, re); return r; };
const solic = (a, id) => a.tabelas.VIA_SOLICITACOES.find((x) => x.ID === id);
const emailsPara = (a, quem) => a.emails.filter((m) => String(m.to).indexOf(quem + '@') === 0);
let nArq = 0;
const comp = (a, nome) => a.pdf((nome || 'comprovante') + '-' + (++nArq) + '.pdf');

/** Viagem de 26 a 29/10/2026 (seg a qui), aprovada e com carga de R$ 2.660,00 no cartão do Tiago (relógio em 19/10). */
function comCarga(a, extra) {
  const s = criarCompleta(a, 'gil', extra);
  a.ok(a.v('gil', 'enviar', { id: s.id }));
  a.ok(a.v('matheusgodoi', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'Valores dentro do praticado' }));
  return a.ok(a.v('wanessa', 'registrarCarga', { id: s.id, valor: '2.660,00', data: '2026-10-19', comprovante: comp(a, 'caju') })).solicitacao;
}
// 11/11/2026 (pedido do dono): todo gasto novo diz para que foi (descrição obrigatória, 10 letras ou mais).
const gasto = (a, s, x) => Object.assign({ id: s.id, data: '2026-10-27', pagoCom: 'CAJU', arquivo: comp(a), descricao: 'gasto da equipe no atendimento do Hospital Teste Alfa' }, x);
/** Lança hotel 1.500, alimentação 700 e estacionamento 40 (fora do orçado). */
function lancarTres(a, s, login) {
  a.ok(a.v(login || 'tiago', 'lancarGasto', gasto(a, s, { categoria: 'HOSPEDAGEM', linhaId: 'Lhotel', valor: '1.500,00', estabelecimento: 'Hotel Centro', cnpj: '12.345.678/0001-90' })));
  a.ok(a.v(login || 'tiago', 'lancarGasto', gasto(a, s, { categoria: 'ALIMENTACAO', valor: '700,00', estabelecimento: 'Restaurante Sabor' })));
  return a.ok(a.v(login || 'tiago', 'lancarGasto', gasto(a, s, { categoria: 'ESTACIONAMENTO', valor: '40', estabelecimento: 'Estacionamento Central' }))).solicitacao;
}

// ------------------------------------------------------------------ 1. prazo e situação calculada
test('carga grava o prazo (3 dias úteis depois da volta); depois da chegada a situação vira "prestação pendente" sem rotina', () => {
  const a = ambiente();
  const s = comCarga(a);
  const prazo = solic(a, s.id).PRESTACAO_PRAZO;
  assert.equal(prazo, a.ctx.Via_somarDiasUteis_('2026-10-29', 3));
  assert.ok(prazo > '2026-10-29' && prazo <= '2026-11-05', prazo);
  assert.equal(s.situacao, 'CARGA_FEITA', 'antes da viagem continua carga feita');
  assert.equal(s.prestacao.prazo.prazo, prazo);
  assert.match(emailsPara(a, 'tiago').find((m) => /Carga no cartão/.test(m.subject)).body, /Prestar contas\), até \d{2}\/\d{2}\/2026/);
  a.mudar('2026-10-30T10:00:00-03:00');
  const d = a.ok(a.v('tiago', 'abrir', { id: s.id })).solicitacao;
  assert.equal(d.situacao, 'PRESTACAO_PENDENTE'); assert.equal(d.situacaoGravada, 'CARGA_FEITA');
  assert.equal(d.situacaoNome, 'Prestação de contas pendente');
  assert.equal(d.acoes.prestar.pode, true); assert.equal(d.acoes.enviarPrestacao.pode, true);
  // a política muda o prazo das próximas cargas
  const b = ambiente();
  b.ok(b.v('dora', 'salvarPolitica', { politica: { aprovadores: ['matheusgodoi'], limiteDiretoria: '5.000,00', urgenteDiasUteis: 2, tetos: {}, prazoPrestacaoDiasUteis: 5 }, motivo: 'Prazo maior para viagens longas' }));
  const s2 = comCarga(b);
  assert.equal(solic(b, s2.id).PRESTACAO_PRAZO, b.ctx.Via_somarDiasUteis_('2026-10-29', 5));
});

// ------------------------------------------------------------------ 2. lançar gastos
test('lançar: comprovante obrigatório, ligado à linha do orçamento, data não futura, comprovante repetido recusado; quem pode lançar', () => {
  const a = ambiente();
  const s = comCarga(a);
  a.mudar('2026-10-30T10:00:00-03:00');
  recusa(a.v('tiago', 'lancarGasto', { id: s.id, categoria: 'HOSPEDAGEM', data: '2026-10-27', valor: '100', estabelecimento: 'Hotel' }), /anexe a foto ou o PDF do comprovante[\s\S]*hoje a política não aceita gasto sem comprovante/);
  recusa(a.v('tiago', 'lancarGasto', gasto(a, s, { categoria: 'HOSPEDAGEM', semComprovante: true, justificativa: 'perdi o papel do hotel no caminho', valor: '100', estabelecimento: 'Hotel' })), /política de viagem não aceita gasto sem comprovante/);
  recusa(a.v('tiago', 'lancarGasto', gasto(a, s, { categoria: 'XYZ', valor: '10', estabelecimento: 'Loja' })), /escolha a categoria/);
  recusa(a.v('tiago', 'lancarGasto', gasto(a, s, { categoria: 'ALIMENTACAO', valor: '10', estabelecimento: 'Loja', data: '2026-11-02' })), /é futura/);
  recusa(a.v('tiago', 'lancarGasto', gasto(a, s, { categoria: 'ALIMENTACAO', valor: '0', estabelecimento: 'Loja' })), /valor pago \(maior que zero\)/);
  recusa(a.v('tiago', 'lancarGasto', gasto(a, s, { categoria: 'ALIMENTACAO', valor: '10', estabelecimento: '' })), /escreva o estabelecimento/);
  recusa(a.v('tiago', 'lancarGasto', gasto(a, s, { categoria: 'ALIMENTACAO', valor: '10', estabelecimento: 'Loja', cnpj: '123' })), /CNPJ tem 14 números/);
  recusa(a.v('tiago', 'lancarGasto', gasto(a, s, { categoria: 'HOSPEDAGEM', linhaId: 'Lalim', valor: '10', estabelecimento: 'Hotel' })), /não é de Hospedagem/);
  // quem pode: o responsável pelo dinheiro e quem pediu; os demais recebem o motivo
  recusa(a.v('paulo', 'lancarGasto', gasto(a, s, { categoria: 'ALIMENTACAO', valor: '10', estabelecimento: 'Loja' })), /Quem presta contas é o responsável pelo dinheiro \(TIAGO TECNICO TESTE\) ou quem pediu a viagem \(GIL GESTOR TECNICO TESTE\)/);
  recusa(a.v('wanessa', 'lancarGasto', gasto(a, s, { categoria: 'ALIMENTACAO', valor: '10', estabelecimento: 'Loja' })), /Quem presta contas/);
  const hashAntes = solic(a, s.id).CONTEUDO_HASH;
  const arq = comp(a, 'hotel');
  const r = a.ok(a.v('tiago', 'lancarGasto', gasto(a, s, { categoria: 'HOSPEDAGEM', valor: '1.500,00', estabelecimento: 'Hotel Centro', arquivo: arq })));
  assert.match(r.message, /Gasto nº 1 lançado: Hospedagem, R\$ 1\.500,00/);
  const it = a.tabelas.VIA_PRESTACOES[0];
  assert.equal(it.LINHA_ID, 'Lhotel', 'categoria com uma linha: liga sozinha'); assert.equal(it.ITEM_NUMERO, 1); assert.equal(it.SITUACAO, 'LANCADO');
  assert.equal(it.CENTRO_CUSTO_CODIGO, 'GO-TECNICA'); assert.equal(it.PESSOA_ID, 'u_tec'); assert.ok(it.COMPROVANTE_URL && it.COMPROVANTE_SHA);
  assert.ok(a.tabelas.VIA_ANEXOS.some((x) => x.TIPO === 'COMPROVANTE_GASTO' && x.LINHA_ID === it.ID));
  assert.equal(solic(a, s.id).CONTEUDO_HASH, hashAntes, 'comprovante da prestação não mexe na marca da aprovação');
  assert.equal(a.ok(a.v('gil', 'abrir', { id: s.id })).solicitacao.aprovacao.valida, true);
  // o mesmo comprovante não entra duas vezes
  recusa(a.v('gil', 'lancarGasto', gasto(a, s, { categoria: 'ALIMENTACAO', valor: '50', estabelecimento: 'Outro', arquivo: arq })), /este comprovante já foi lançado \(VIA-2026-0001, gasto nº 1/);
  // quem pediu lança pelo responsável; categoria sem linha = fora do orçado
  const f = a.ok(a.v('gil', 'lancarGasto', gasto(a, s, { categoria: 'ESTACIONAMENTO', valor: '40', estabelecimento: 'Estacionamento Central' })));
  assert.match(f.message, /fora do orçado/);
  assert.equal(a.tabelas.VIA_PRESTACOES[1].FORA_DO_ORCADO, 'SIM'); assert.equal(a.tabelas.VIA_PRESTACOES[1].LANCADO_POR_ID, 'u_gt');
  // com gasto lançado a solicitação não muda mais (a aprovação não cai)
  const ed = a.ok(a.v('gil', 'abrir', { id: s.id })).solicitacao.acoes.editar;
  assert.equal(ed.pode, false); assert.match(ed.motivo, /Já há gastos lançados/);
  // tirar o gasto: some da conta, o comprovante fica
  const t = a.ok(a.v('tiago', 'removerGasto', { id: s.id, itemId: a.tabelas.VIA_PRESTACOES[1].ID }));
  assert.match(t.message, /retirado da prestação/); assert.equal(t.solicitacao.prestacao.itens.length, 1);
  assert.ok(a.tabelas.VIA_PRESTACOES[1].REMOVIDO_EM); assert.equal(a.tabelas.VIA_PRESTACOES.length, 2, 'nada é apagado');
  assert.ok(a.tabelas.VIA_HISTORICO.some((h) => h.ACAO === 'GASTO_RETIRADO'));
});

// ------------------------------------------------------------------ 3. a conta
test('conta calculada (nunca digitada): previsão pelo gasto, por categoria orçado x aprovado x gasto; valores gravados na solicitação', () => {
  const a = ambiente();
  const s = comCarga(a);
  a.mudar('2026-10-30T10:00:00-03:00');
  const d = lancarTres(a, s);
  const k = d.prestacao.contas;
  assert.equal(k.carregado, 2660); assert.equal(k.gasto, 2240); assert.equal(k.aDevolver, 420); assert.equal(k.aReembolsar, 0); assert.equal(k.conferida, false); assert.equal(k.lado, 'DEVOLUCAO');
  const cat = Object.fromEntries(k.porCategoria.map((x) => [x.cod, x]));
  assert.deepEqual([cat.HOSPEDAGEM.orcado, cat.HOSPEDAGEM.aprovado, cat.HOSPEDAGEM.gasto], [1500, 1500, 1500]);
  assert.deepEqual([cat.ALIMENTACAO.orcado, cat.ALIMENTACAO.gasto], [800, 700]);
  assert.deepEqual([cat.COMBUSTIVEL.aprovado, cat.COMBUSTIVEL.gasto], [360, 0]);
  assert.deepEqual([cat.ESTACIONAMENTO.aprovado, cat.ESTACIONAMENTO.gasto], [0, 40]);
  const r = solic(a, s.id);
  assert.deepEqual([r.GASTO_TOTAL, r.GASTO_CAJU, r.A_DEVOLVER, r.ACEITO_TOTAL], [2240, 2240, 420, '']);
  // dinheiro próprio acima do carregado vira reembolso
  a.ok(a.v('tiago', 'lancarGasto', gasto(a, s, { categoria: 'COMBUSTIVEL', valor: '600,00', estabelecimento: 'Posto Rio Verde', pagoCom: 'PROPRIO' })));
  const k2 = a.ok(a.v('tiago', 'abrir', { id: s.id })).solicitacao.prestacao.contas;
  assert.equal(k2.gasto, 2840); assert.equal(k2.gastoProprio, 600); assert.equal(k2.aDevolver, 0); assert.equal(k2.aReembolsar, 180); assert.equal(k2.lado, 'REEMBOLSO');
  // nenhuma tela manda total: o servidor não lê nenhum
  assert.doesNotMatch(ler('JS_DepositoViagem.html').match(/function VgT_gastoLancar_[\s\S]*?\n  }/)[0], /total/i);
});

// ------------------------------------------------------------------ 4. envio, conferência, glosa, acerto e ciência
test('fluxo completo: envia, Financeiro glosa e aceita, conclui, registra a devolução no Caju e o Matheus dá ciência (A4 de fechamento)', () => {
  const a = ambiente();
  const s = comCarga(a);
  recusa(a.v('tiago', 'enviarPrestacao', { id: s.id }), /A viagem ainda não começou/);
  a.mudar('2026-10-30T10:00:00-03:00');
  lancarTres(a, s);
  recusa(a.v('wanessa', 'conferirItem', { id: s.id, itemId: a.tabelas.VIA_PRESTACOES[0].ID, decisao: 'ACEITAR' }), /A prestação ainda não foi enviada/);
  const e = a.ok(a.v('tiago', 'enviarPrestacao', { id: s.id, observacao: '' }));
  assert.equal(e.solicitacao.situacao, 'PRESTACAO_ENVIADA'); assert.match(e.message, /sobram R\$ 420,00 a devolver/);
  assert.ok(emailsPara(a, 'wanessa').some((m) => /Prestação de contas a conferir: VIA-2026-0001/.test(m.subject)));
  recusa(a.v('tiago', 'lancarGasto', gasto(a, s, { categoria: 'ALIMENTACAO', valor: '10', estabelecimento: 'Loja' })), /já foi enviada/);
  // separação: quem viaja ou pediu não confere, mesmo com a caixa
  a.props.OMIE_SIGILO_CONTAS = JSON.stringify(JSON.parse(a.props.OMIE_SIGILO_CONTAS).concat('u_gt')); // 16/11/2026: caixa do Financeiro só para a lista de sigilo
  a.ok(a.ctx.Poderes_api('s_admin', 'salvar', { usuarioId: 'u_gt', motivo: 'teste de separação de funções', mudancas: [{ codigo: 'VIAGEM_CONFERIR', valor: 'SIM' }] }));
  recusa(a.v('gil', 'conferirItem', { id: s.id, itemId: a.tabelas.VIA_PRESTACOES[0].ID, decisao: 'ACEITAR' }), /ninguém confere as próprias contas/);
  recusa(a.v('matheusgodoi', 'conferirItem', { id: s.id, itemId: a.tabelas.VIA_PRESTACOES[0].ID, decisao: 'ACEITAR' }), /caixa «Conferir a prestação de contas de viagem»/);
  const [hotel, alim, est] = a.tabelas.VIA_PRESTACOES.map((x) => x.ID);
  a.ok(a.v('wanessa', 'conferirItem', { id: s.id, itemId: hotel, decisao: 'ACEITAR' }));
  recusa(a.v('wanessa', 'conferirItem', { id: s.id, itemId: alim, decisao: 'GLOSAR', motivo: 'curto' }), /motivo da glosa \(15 letras/);
  recusa(a.v('wanessa', 'conferirItem', { id: s.id, itemId: alim, decisao: 'GLOSAR', valorGlosado: '800', motivo: 'bebida alcoólica não é reembolsável' }), /até o valor do gasto \(R\$ 700,00\)/);
  a.ok(a.v('wanessa', 'conferirItem', { id: s.id, itemId: alim, decisao: 'GLOSAR', valorGlosado: '100,00', motivo: 'bebida alcoólica não é reembolsável' }));
  recusa(a.v('wanessa', 'concluirConferencia', { id: s.id }), /falta conferir o gasto nº 3/);
  a.ok(a.v('fabio', 'conferirItem', { id: s.id, itemId: est, decisao: 'ACEITAR' }));
  const c = a.ok(a.v('wanessa', 'concluirConferencia', { id: s.id }));
  assert.equal(c.solicitacao.situacao, 'ACERTO_PENDENTE'); assert.match(c.message, /a devolver R\$ 520,00/);
  const k = c.solicitacao.prestacao.contas;
  assert.deepEqual([k.conferida, k.aceito, k.glosado, k.aDevolver], [true, 2140, 100, 520]);
  assert.match(emailsPara(a, 'tiago').find((m) => /conferida/.test(m.subject)).body, /Glosas: gasto nº 2 \(R\$ 100,00\): bebida alcoólica[\s\S]*Resultado: a devolver R\$ 520,00/);
  assert.equal(solic(a, s.id).ACEITO_TOTAL, 2140);
  // acerto
  recusa(a.v('wanessa', 'registrarAcerto', { id: s.id, tipo: 'REEMBOLSO', forma: 'PIX_EMPRESA', data: '2026-10-30', valor: '520', comprovante: comp(a) }), /a pessoa devolve R\$ 520,00 \(não é reembolso\)/);
  recusa(a.v('wanessa', 'registrarAcerto', { id: s.id, tipo: 'DEVOLUCAO', forma: 'RECOLHIMENTO_CAJU', data: '2026-10-30', valor: '520' }), /anexe o comprovante \(print do recolhimento/);
  recusa(a.v('wanessa', 'registrarAcerto', { id: s.id, tipo: 'DEVOLUCAO', forma: 'RECOLHIMENTO_CAJU', data: '2026-10-30', valor: '600', comprovante: comp(a) }), /passa do que falta devolver \(R\$ 520,00\)/);
  recusa(a.v('wanessa', 'registrarAcerto', { id: s.id, tipo: 'DEVOLUCAO', forma: 'RECOLHIMENTO_CAJU', data: '2026-10-30', valor: '420', comprovante: comp(a) }), /acerto é parcial/);
  recusa(a.v('wanessa', 'registrarAcerto', { id: s.id, tipo: 'DEVOLUCAO', forma: 'PIX_EMPRESA', data: '2026-10-30', valor: '520', comprovante: comp(a) }), /escolha como foi feito/);
  const p1 = a.ok(a.v('wanessa', 'registrarAcerto', { id: s.id, tipo: 'DEVOLUCAO', forma: 'RECOLHIMENTO_CAJU', data: '2026-10-30', valor: '420', observacao: 'saldo que estava no cartão', comprovante: comp(a, 'recolhimento') }));
  assert.equal(p1.solicitacao.situacao, 'ACERTO_PENDENTE'); assert.match(p1.message, /Ainda falta R\$ 100,00/);
  const p2 = a.ok(a.v('wanessa', 'registrarAcerto', { id: s.id, tipo: 'DEVOLUCAO', forma: 'DEPOSITO_COLABORADOR', data: '2026-10-30', valor: '100', comprovante: comp(a, 'pix') }));
  assert.equal(p2.solicitacao.situacao, 'AGUARDANDO_CIENCIA'); assert.match(p2.message, /Devolução de R\$ 100,00 registrada[\s\S]*ciência de MATHEUS GERENTE TESTE/);
  assert.ok(emailsPara(a, 'matheus').some((m) => /Fechamento de viagem para a sua ciência/.test(m.subject)));
  assert.deepEqual([solic(a, s.id).DEVOLVIDO_TOTAL, solic(a, s.id).A_DEVOLVER, solic(a, s.id).SALDO_RECOLHIDO], [520, 0, 520]);
  assert.equal(a.tabelas.VIA_ACERTOS.length, 2); assert.ok(a.tabelas.VIA_ACERTOS.every((x) => x.COMPROVANTE_URL && x.CENTRO_CUSTO_CODIGO === 'GO-TECNICA'));
  // ciência: nem quem viaja, nem quem conferiu; o Matheus (aprovador) sim
  recusa(a.v('tiago', 'darCiencia', { id: s.id }), /Você viaja/);
  recusa(a.v('wanessa', 'darCiencia', { id: s.id }), /Você conferiu esta prestação|aprovador da política/);
  assert.equal(a.ok(a.v('matheusgodoi', 'listar', { aba: 'decidir' })).itens.length, 1, 'a ciência aparece em Aguardando minha decisão');
  assert.equal(a.ok(a.v('matheusgodoi', 'iniciar')).contagens.ciencia, 1);
  const fe = a.ok(a.v('matheusgodoi', 'fechamento', { id: s.id })).html;
  assert.match(fe, /Prestação de contas e fechamento da viagem/); assert.match(fe, /Prévia\./);
  const ci = a.ok(a.v('matheusgodoi', 'darCiencia', { id: s.id, comentario: 'Ciente; atenção às bebidas' }));
  assert.equal(ci.solicitacao.situacao, 'ENCERRADA'); assert.equal(solic(a, s.id).CIENCIA_POR_ID, 'u_mat');
  const h = a.ok(a.v('wanessa', 'fechamento', { id: s.id })).html;
  for (const t of ['Contas fechadas', 'Orçado', 'Aprovado', 'Carregado no cartão Caju', 'R$ 2.660,00', 'R$ 2.240,00', 'R$ 2.140,00', 'R$ 520,00', 'bebida alcoólica não é reembolsável', 'Hotel Centro',
    'Estacionamento (fora do orçado)', 'Recolhimento do saldo no Caju', 'Ciência do fechamento', 'MATHEUS GERENTE TESTE', 'Conferido (Financeiro)']) assert.ok(h.includes(t), t);
  assert.doesNotMatch(h, /Prévia\./);
  assert.doesNotMatch(h.replace(/data:[^"')]+/g, ''), />[^<]*(undefined|NaN)[^<]*</);
  // nada muda depois de encerrada
  recusa(a.v('wanessa', 'registrarAcerto', { id: s.id, tipo: 'DEVOLUCAO', forma: 'RECOLHIMENTO_CAJU', data: '2026-10-30', valor: '1', comprovante: comp(a) }), /Não há acerto de saldo pendente/);
  // trilha
  for (const ac of ['GASTO_LANCADO', 'PRESTACAO_ENVIADA', 'ITEM_ACEITO', 'ITEM_GLOSADO', 'CONFERENCIA_CONCLUIDA', 'ACERTO_REGISTRADO', 'CIENCIA_FECHAMENTO']) assert.ok(a.tabelas.VIA_HISTORICO.some((x) => x.ACAO === ac), ac);
});

test('devolver a prestação para ajuste dá prazo novo; reembolso quando o gasto aceito passa do carregado; prestação vazia pede o motivo', () => {
  const a = ambiente();
  const s = comCarga(a);
  a.mudar('2026-10-30T10:00:00-03:00');
  recusa(a.v('tiago', 'enviarPrestacao', { id: s.id, observacao: 'nada' }), /não há gasto lançado[\s\S]*20 letras/);
  lancarTres(a, s);
  a.ok(a.v('tiago', 'lancarGasto', gasto(a, s, { categoria: 'COMBUSTIVEL', valor: '600,00', estabelecimento: 'Posto Rio Verde', pagoCom: 'PROPRIO' })));
  a.ok(a.v('tiago', 'enviarPrestacao', { id: s.id }));
  recusa(a.v('wanessa', 'devolverPrestacao', { id: s.id, motivo: 'curto' }), /15 letras/);
  const d = a.ok(a.v('wanessa', 'devolverPrestacao', { id: s.id, motivo: 'Falta a nota do posto no CNPJ da empresa' }));
  assert.equal(d.solicitacao.situacao, 'PRESTACAO_DEVOLVIDA');
  assert.equal(solic(a, s.id).PRESTACAO_PRAZO, a.ctx.Via_somarDiasUteis_('2026-10-30', 3));
  assert.match(emailsPara(a, 'tiago').find((m) => /devolvida para ajuste/.test(m.subject)).body, /Falta a nota do posto/);
  assert.equal(a.ok(a.v('tiago', 'iniciar')).contagens.prestar, 1);
  a.ok(a.v('tiago', 'enviarPrestacao', { id: s.id }));
  a.tabelas.VIA_PRESTACOES.forEach((i) => a.ok(a.v('wanessa', 'conferirItem', { id: s.id, itemId: i.ID, decisao: 'ACEITAR' })));
  const c = a.ok(a.v('wanessa', 'concluirConferencia', { id: s.id }));
  assert.equal(c.solicitacao.prestacao.contas.aReembolsar, 180);
  recusa(a.v('wanessa', 'registrarAcerto', { id: s.id, tipo: 'DEVOLUCAO', forma: 'RECOLHIMENTO_CAJU', data: '2026-10-30', valor: '180', comprovante: comp(a) }), /a empresa reembolsa R\$ 180,00/);
  const r = a.ok(a.v('wanessa', 'registrarAcerto', { id: s.id, tipo: 'REEMBOLSO', forma: 'PIX_EMPRESA', data: '2026-10-30', valor: '180,00', comprovante: comp(a, 'pix-reembolso') }));
  assert.equal(r.solicitacao.situacao, 'AGUARDANDO_CIENCIA'); assert.equal(solic(a, s.id).REEMBOLSADO_TOTAL, 180);
  // conferência zerada vai direto para a ciência
  const b = ambiente();
  const z = comCarga(b);
  b.mudar('2026-10-30T10:00:00-03:00');
  b.ok(b.v('tiago', 'lancarGasto', gasto(b, z, { categoria: 'HOSPEDAGEM', valor: '2.660,00', estabelecimento: 'Hotel Centro' })));
  b.ok(b.v('tiago', 'enviarPrestacao', { id: z.id }));
  b.ok(b.v('wanessa', 'conferirItem', { id: z.id, itemId: b.tabelas.VIA_PRESTACOES[0].ID, decisao: 'ACEITAR' }));
  assert.equal(b.ok(b.v('wanessa', 'concluirConferencia', { id: z.id })).solicitacao.situacao, 'AGUARDANDO_CIENCIA');
  // viagem que não aconteceu: prestação vazia com o motivo; tudo volta
  const c2 = ambiente();
  const v = comCarga(c2);
  c2.mudar('2026-10-30T10:00:00-03:00');
  c2.ok(c2.v('gil', 'enviarPrestacao', { id: v.id, observacao: 'O cliente cancelou a visita na véspera; nada foi gasto.' }));
  const k = c2.ok(c2.v('wanessa', 'concluirConferencia', { id: v.id })).solicitacao.prestacao.contas;
  assert.equal(k.aDevolver, 2660);
  recusa(c2.v('gil', 'cancelar', { id: v.id, motivo: 'cliente cancelou a visita' }), /preste contas sem gastos|não se cancela|já está encerrada|não muda/);
});

// ------------------------------------------------------------------ 5. gasto sem comprovante e leitura por IA
test('sem comprovante: só com justificativa e até o limite POR VIAGEM da política; vazio não aceita', () => {
  const a = ambiente();
  recusa(a.v('dora', 'salvarPolitica', { politica: { aprovadores: ['matheusgodoi'], limiteDiretoria: '5.000,00', urgenteDiasUteis: 2, tetos: {}, limiteSemComprovante: '-5' }, motivo: 'teste do limite' }), /maior que zero, ou ficar vazio/);
  recusa(a.v('dora', 'salvarPolitica', { politica: { aprovadores: ['matheusgodoi'], limiteDiretoria: '5.000,00', urgenteDiasUteis: 2, tetos: {}, prazoPrestacaoDiasUteis: '0' }, motivo: 'teste do prazo' }), /de 1 a 30/);
  a.ok(a.v('dora', 'salvarPolitica', { politica: { aprovadores: ['matheusgodoi'], limiteDiretoria: '5.000,00', urgenteDiasUteis: 2, tetos: {}, limiteSemComprovante: '50,00' }, motivo: 'Estacionamento de rua sem recibo' }));
  const pol = a.ok(a.v('dora', 'politica'));
  assert.equal(pol.politica.limiteSemComprovante, 50); assert.equal(pol.politica.prazoPrestacaoDiasUteis, 3);
  assert.match(pol.versoes[0].semComprovante, /até R\$ 50,00 por viagem/);
  const s = comCarga(a);
  a.mudar('2026-10-30T10:00:00-03:00');
  const sem = (v, j) => ({ id: s.id, categoria: 'ESTACIONAMENTO', data: '2026-10-27', valor: v, estabelecimento: 'Rua do cliente', semComprovante: true, justificativa: j, descricao: 'estacionamento na visita ao Hospital Teste Alfa' });
  recusa(a.v('tiago', 'lancarGasto', sem('30', 'sem recibo')), /por que não há comprovante \(20 letras/);
  a.ok(a.v('tiago', 'lancarGasto', sem('30', 'flanelinha na rua do hospital, sem recibo')));
  recusa(a.v('tiago', 'lancarGasto', sem('30', 'flanelinha na rua do hospital, sem recibo')), /somam R\$ 60,00, acima do limite da política \(R\$ 50,00 por viagem\)/);
  const k = a.ok(a.v('tiago', 'abrir', { id: s.id })).solicitacao.prestacao;
  assert.equal(k.contas.semComprovante, 30); assert.equal(k.itens[0].semComprovante, true);
});

test('leitura do comprovante por IA: sem chave explica e segue; com chave sugere, só preenche o vazio na tela e a diferença fica para o Financeiro', () => {
  const a = ambiente();
  const s = comCarga(a);
  a.mudar('2026-10-30T10:00:00-03:00');
  const foto = { nome: 'cupom.jpg', tipo: 'image/jpeg', base64: Buffer.from('foto do cupom do restaurante').toString('base64') };
  const sem = a.ok(a.v('tiago', 'lerComprovante', { id: s.id, arquivo: foto }));
  assert.equal(sem.disponivel, false); assert.match(sem.mensagem, /chave da IA não está configurada[\s\S]*funciona igual/);
  a.props.GEMINI_API_KEY = 'chave-de-teste';
  const fetchOriginal = a.ctx.UrlFetchApp.fetch;
  a.ctx.UrlFetchApp.fetch = (url, op) => /generativelanguage/.test(url)
    ? { getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ valor: 187.5, data: '27/10/2026', estabelecimento: 'Restaurante Sabor', cnpj: '12345678000190', tipo: 'restaurante', legivel: true }) }] } }] }) }
    : fetchOriginal(url, op);
  recusa(a.v('paulo', 'lerComprovante', { id: s.id, arquivo: foto }), /Quem presta contas/);
  const l = a.ok(a.v('tiago', 'lerComprovante', { id: s.id, arquivo: foto }));
  assert.deepEqual([l.leitura.valor, l.leitura.data, l.leitura.estabelecimento, l.leitura.cnpj, l.leitura.categoria], [187.5, '2026-10-27', 'Restaurante Sabor', '12345678000190', 'ALIMENTACAO']);
  assert.match(l.mensagem, /confira cada campo/);
  // lançou com valor diferente do lido: aceita, e a diferença fica registrada
  const r = a.ok(a.v('tiago', 'lancarGasto', { id: s.id, categoria: 'ALIMENTACAO', data: '2026-10-27', valor: '287,50', estabelecimento: 'Restaurante Sabor', cnpj: '12345678000190', arquivo: foto, descricao: 'almoço da equipe no Hospital Teste Alfa' }));
  assert.match(r.message, /diferente do que a leitura do comprovante sugeriu \(valor lido R\$ 187,50, lançado R\$ 287,50\)/);
  const it = a.tabelas.VIA_PRESTACOES[0];
  assert.match(it.IA_DIVERGENCIAS, /valor lido R\$ 187,50/); assert.equal(JSON.parse(it.LEITURA_IA_JSON).valor, 187.5);
  assert.equal(r.solicitacao.prestacao.itens[0].iaDivergencias, it.IA_DIVERGENCIAS);
  // a tela nunca troca o que a pessoa digitou
  assert.match(ler('JS_DepositoViagem.html'), /if \(e && v !== null && v !== undefined && v !== "" && !String\(e\.value \|\| ""\)\.trim\(\)\)/);
  // arquivo que a IA não lê
  const x = a.ok(a.v('tiago', 'lerComprovante', { id: s.id, arquivo: { nome: 'a.heic', tipo: 'image/heic', base64: 'AAAA' } }));
  assert.equal(x.falhou, true); assert.match(x.mensagem, /JPEG, PNG ou WEBP\) ou PDF/);
});

// ------------------------------------------------------------------ 6. trava e liberação
test('trava: prestação vencida impede ser responsável pelo dinheiro e receber carga; a Diretoria libera com motivo e validade', () => {
  const a = ambiente();
  const s = comCarga(a);
  const prazo = solic(a, s.id).PRESTACAO_PRAZO;
  a.mudar(a.ctx.Via_somarDias_(prazo, 1) + 'T10:00:00-03:00');
  const v = a.ok(a.v('tiago', 'abrir', { id: s.id })).solicitacao;
  assert.equal(v.prestacao.prazo.vencida, true);
  assert.equal(a.ok(a.v('wanessa', 'listar', { aba: 'todas' })).itens[0].prestacaoVencida, true);
  // nova viagem com o Tiago responsável: falta clara e envio recusado
  const n = criarCompleta(a, 'gil', { saidaEm: '2026-11-23T07:00', chegadaEm: '2026-11-24T18:00' });
  const falta = n.faltas.find((f) => /prestação de contas vencida/.test(f));
  assert.ok(falta, n.faltas.join(' | '));
  assert.match(falta, /TIAGO TECNICO TESTE tem prestação de contas vencida \(VIA-2026-0001, prazo \d{2}\/\d{2}\/2026\)[\s\S]*Depósito de viagem > Prestar contas[\s\S]*outro responsável[\s\S]*a Diretoria libera/);
  recusa(a.v('gil', 'enviar', { id: n.id }), /prestação de contas vencida/);
  // outro responsável: passa
  assert.ok(!a.ok(a.v('gil', 'salvar', Object.assign(require('./_viagem_ambiente.cjs').solicitacaoBase(a, { saidaEm: '2026-11-23T07:00', chegadaEm: '2026-11-24T18:00' }), { id: n.id, responsavelId: 'u_tec2' }))).solicitacao.faltas.some((f) => /vencida/.test(f)));
  a.ok(a.v('gil', 'salvar', Object.assign(require('./_viagem_ambiente.cjs').solicitacaoBase(a, { saidaEm: '2026-11-23T07:00', chegadaEm: '2026-11-24T18:00' }), { id: n.id })));
  // liberação: só a Diretoria, com motivo e validade
  recusa(a.v('gil', 'liberarTrava', { id: s.id, motivo: 'viagem urgente ao cliente do Tiago', dias: 7 }), /Só a Diretoria libera/);
  recusa(a.v('dora', 'liberarTrava', { id: s.id, motivo: 'curto', dias: 7 }), /20 letras/);
  recusa(a.v('dora', 'liberarTrava', { id: s.id, motivo: 'viagem urgente ao cliente; presta contas na volta', dias: 40 }), /1 a 30 dias/);
  recusa(a.v('dora', 'liberarTrava', { id: n.id, motivo: 'viagem urgente ao cliente; presta contas na volta', dias: 7 }), /não está vencida/);
  const lb = a.ok(a.v('dora', 'liberarTrava', { id: s.id, motivo: 'viagem urgente ao cliente; presta contas na volta', dias: 7 }));
  assert.match(lb.message, /Trava liberada até/);
  assert.equal(a.tabelas.VIA_LIBERACOES.length, 1); assert.equal(a.tabelas.VIA_LIBERACOES[0].PESSOA_ID, 'u_tec');
  assert.ok(emailsPara(a, 'tiago').some((m) => /Trava liberada pela Diretoria/.test(m.subject)));
  assert.deepEqual(a.ok(a.v('gil', 'abrir', { id: n.id })).solicitacao.faltas, []);
  a.ok(a.v('gil', 'enviar', { id: n.id }));
  a.ok(a.v('matheusgodoi', 'decidir', { id: n.id, decisao: 'APROVAR', fundamentacao: 'Viagem urgente liberada pela Diretoria' }));
  // a liberação vence: a carga volta a ser recusada enquanto a prestação continuar vencida
  a.mudar(a.ctx.Via_somarDias_(prazo, 10) + 'T10:00:00-03:00');
  recusa(a.v('wanessa', 'registrarCarga', { id: n.id, valor: '2.660,00', data: a.ctx.Via_somarDias_(prazo, 10), comprovante: comp(a) }), /Não foi possível registrar a carga: TIAGO TECNICO TESTE tem prestação de contas vencida/);
  // prestou contas: a trava sai
  a.ok(a.v('tiago', 'lancarGasto', gasto(a, s, { categoria: 'HOSPEDAGEM', valor: '1.500,00', estabelecimento: 'Hotel Centro' })));
  a.ok(a.v('tiago', 'enviarPrestacao', { id: s.id }));
  a.ok(a.v('wanessa', 'registrarCarga', { id: n.id, valor: '2.660,00', data: a.ctx.Via_somarDias_(prazo, 10), comprovante: comp(a) }));
});

// ------------------------------------------------------------------ 7. avisos, pendências, painel e relatórios
test('avisos do prazo (rotina da gestão, uma vez por dia), pendências de cada papel, Kanban, Gantt e relatórios com as etapas novas', () => {
  const a = ambiente();
  const s = comCarga(a);
  assert.match(ler('SGO_Gestao_Escada.js'), /typeof Viagem_rotina_ === 'function'\) passo\('viagem'/);
  a.mudar('2026-10-30T10:00:00-03:00');
  const r1 = a.ctx.Viagem_rotina_({ dentro: true });
  assert.equal(r1.avisos, 1);
  assert.ok(emailsPara(a, 'tiago').some((m) => /Viagem terminou: preste contas até/.test(m.subject)));
  assert.ok(emailsPara(a, 'gil').some((m) => /Viagem terminou/.test(m.subject)), 'o gestor também');
  assert.equal(a.ctx.Viagem_rotina_({ dentro: true }).pulou, 'já rodou hoje');
  delete a.props.VIA_ROTINA_DIA;
  assert.equal(a.ctx.Viagem_rotina_({ dentro: true }).avisos, 0, 'o mesmo aviso não sai duas vezes');
  const prazo = solic(a, s.id).PRESTACAO_PRAZO;
  a.mudar(prazo + 'T09:00:00-03:00');
  assert.equal(a.ctx.Viagem_rotina_({ dentro: true }).avisos, 1);
  assert.ok(emailsPara(a, 'tiago').some((m) => /vence hoje/.test(m.subject)));
  a.mudar(a.ctx.Via_somarDias_(prazo, 1) + 'T09:00:00-03:00');
  a.ctx.Viagem_rotina_({ dentro: true });
  assert.ok(emailsPara(a, 'tiago').some((m) => /Prestação de contas vencida/.test(m.subject) && /não pode receber dinheiro de outra viagem/.test(m.body)));
  // pendências: prestar (responsável e quem pediu, crítica quando vencida)
  const pend = (uid, perfil) => { const l = []; a.ctx.Viagem_fontePendencias_((x) => l.push(x), { userId: uid, perfil }); return l; };
  const pr = pend('u_tec', 'TECNICO').find((x) => x.tipo === 'viagem_prestar');
  assert.deepEqual(Array.from(pr.paraUsuarios).sort(), ['u_gt', 'u_tec']); assert.equal(pr.gravidade, 'CRITICO'); assert.match(pr.titulo, /vencida desde/);
  assert.doesNotMatch(pr.titulo, /R\$/);
  // Kanban e Gantt
  const p = a.ok(a.v('wanessa', 'painel'));
  const it = p.itens.find((x) => x.id === s.id);
  assert.equal(it.situacao, 'PRESTACAO_PENDENTE'); assert.equal(it.coluna, 'PRESTACAO_PENDENTE'); assert.equal(it.vencida, true); assert.equal(it.cor, p.cores.PRESTACAO_PENDENTE);
  // enviada: pendência de conferir para o Financeiro
  a.ok(a.v('tiago', 'lancarGasto', gasto(a, s, { categoria: 'HOSPEDAGEM', valor: '1.500,00', estabelecimento: 'Hotel Centro' })));
  a.ok(a.v('tiago', 'enviarPrestacao', { id: s.id }));
  const cf = pend('u_fin', 'FINANCEIRO').find((x) => x.tipo === 'viagem_conferir');
  assert.deepEqual(Array.from(cf.paraUsuarios).sort(), ['u_fin', 'u_fin2']);
  assert.equal(a.ok(a.v('wanessa', 'iniciar')).contagens.conferir, 1);
  assert.equal(a.ok(a.v('wanessa', 'listar', { aba: 'conferir' })).itens.length, 1);
  recusa(a.v('tiago', 'listar', { aba: 'conferir' }), /«Conferir a prestação de contas de viagem»[\s\S]*Prestar contas/);
  assert.equal(a.ok(a.v('wanessa', 'painel')).itens.find((x) => x.id === s.id).coluna, 'PRESTACAO_ENVIADA');
  a.ok(a.v('wanessa', 'conferirItem', { id: s.id, itemId: a.tabelas.VIA_PRESTACOES[0].ID, decisao: 'ACEITAR' }));
  a.ok(a.v('wanessa', 'concluirConferencia', { id: s.id }));
  assert.ok(pend('u_fin', 'FINANCEIRO').some((x) => x.tipo === 'viagem_acerto'));
  assert.equal(a.ok(a.v('wanessa', 'painel')).itens.find((x) => x.id === s.id).coluna, 'ACERTO');
  a.ok(a.v('wanessa', 'registrarAcerto', { id: s.id, tipo: 'DEVOLUCAO', forma: 'RECOLHIMENTO_CAJU', data: a.ctx.Via_hoje_(), valor: '1.160,00', comprovante: comp(a) }));
  const cc = pend('u_mat', 'GESTOR').find((x) => x.tipo === 'viagem_ciencia');
  assert.deepEqual(Array.from(cc.paraUsuarios), ['u_mat']);
  // relatórios A4 com as etapas novas
  const per = { de: '2026-10-01', ate: '2026-11-30' };
  const rp = a.ok(a.v('wanessa', 'relatorio', Object.assign({ tipo: 'PERIODO' }, per))).html;
  for (const t of ['Gasto lançado na prestação', 'Aceito pelo Financeiro', 'Prestação de contas por centro de custo', 'Prestações de contas em aberto', 'Devolvido']) assert.ok(rp.includes(t), t);
  const rk = a.ok(a.v('wanessa', 'relatorio', Object.assign({ tipo: 'KANBAN' }, per))).html;
  for (const t of ['Prestação de contas pendente', 'Prestação em conferência', 'Acerto e ciência', 'Encerrada']) assert.ok(rk.includes(t), t);
  assert.doesNotMatch(rp.replace(/data:[^"')]+/g, ''), />[^<]*(undefined|NaN)[^<]*</);
  const g = a.ok(a.v('wanessa', 'relatorio', Object.assign({ tipo: 'GANTT' }, per))).html;
  assert.match(g, new RegExp('<rect[^>]+fill="' + a.ctx.VIA_CORES.AGUARDANDO_CIENCIA + '"'), 'cor da etapa nova no Gantt');
});

// ------------------------------------------------------------------ 8. caixa, dados para a conciliação, tela, ajuda e manual
test('caixa VIAGEM_CONFERIR no lote 12 (registrada com o módulo; catálogo congelado de 150 intacto) e exceção em Acessos', () => {
  const a = ambiente();
  const cat = a.ctx.SGO_poderesCatalogo_();
  const p = cat.mapa.VIAGEM_CONFERIR;
  assert.ok(p && p.lote === 12 && p.ligado && p.modulo === 'Depósito de viagem');
  const b = ambiente({ semArquivos: ['SGO_Viagem.js', 'SGO_Viagem_Documento.js', 'SGO_Viagem_Painel.js', 'SGO_Viagem_Prestacao.js', 'SGO_Viagem_Fechamento.js'] });
  assert.equal(b.ctx.SGO_poderesCatalogo_().lista.length, 150);
  const pod = (l) => a.ok(a.v(l, 'iniciar')).poderes;
  assert.equal(pod('wanessa').VIAGEM_CONFERIR, true); assert.equal(pod('fabio').VIAGEM_CONFERIR, true);
  assert.equal(pod('gil').VIAGEM_CONFERIR, false); assert.equal(pod('matheusgodoi').VIAGEM_CONFERIR, false); assert.equal(pod('dora').VIAGEM_CONFERIR, false);
  // separar: o Fábio carrega, mas não confere
  a.ok(a.ctx.Poderes_api('s_admin', 'salvar', { usuarioId: 'u_fin2', motivo: 'Fábio só faz a carga', mudancas: [{ codigo: 'VIAGEM_CONFERIR', valor: 'NAO' }] }));
  assert.equal(pod('fabio').VIAGEM_CONFERIR, false); assert.equal(pod('fabio').VIAGEM_DEPOSITAR, true);
  const s = comCarga(a);
  a.mudar('2026-10-30T10:00:00-03:00');
  a.ok(a.v('tiago', 'lancarGasto', gasto(a, s, { categoria: 'HOSPEDAGEM', valor: '1.500,00', estabelecimento: 'Hotel Centro' })));
  a.ok(a.v('tiago', 'enviarPrestacao', { id: s.id }));
  assert.ok(emailsPara(a, 'wanessa').some((m) => /a conferir/.test(m.subject)));
  assert.ok(!emailsPara(a, 'fabio').some((m) => /a conferir/.test(m.subject)), 'quem não tem a caixa não é chamado');
  recusa(a.v('fabio', 'conferirItem', { id: s.id, itemId: a.tabelas.VIA_PRESTACOES[0].ID, decisao: 'ACEITAR' }), /caixa «Conferir a prestação de contas de viagem»/);
});

test('dados para o módulo de conciliação com o Caju: ids estáveis, valores por gasto, categoria, centro de custo e pessoa; só Financeiro e quem vê todas', () => {
  const a = ambiente();
  const centro = a.ok(a.v('wanessa', 'centros')).centros.find((c) => c.codigo === 'GO-TECNICA');
  a.ok(a.v('wanessa', 'conferirCentro', { id: centro.id, codigoCaju: 'CAJU-GO-TEC' }));
  const s = comCarga(a);
  a.mudar('2026-10-30T10:00:00-03:00');
  lancarTres(a, s);
  a.ok(a.v('tiago', 'enviarPrestacao', { id: s.id }));
  a.tabelas.VIA_PRESTACOES.forEach((i) => a.ok(a.v('wanessa', 'conferirItem', { id: s.id, itemId: i.ID, decisao: 'ACEITAR' })));
  a.ok(a.v('wanessa', 'concluirConferencia', { id: s.id }));
  a.ok(a.v('wanessa', 'registrarAcerto', { id: s.id, tipo: 'DEVOLUCAO', forma: 'RECOLHIMENTO_CAJU', data: '2026-10-30', valor: '420', comprovante: comp(a) }));
  recusa(a.v('tiago', 'dadosConciliacao', {}), /são do Financeiro/);
  const d = a.ok(a.v('wanessa', 'dadosConciliacao', { de: '2026-10-01', ate: '2026-10-31' }));
  assert.equal(d.versao, 1);
  assert.equal(d.solicitacoes.length, 1);
  const so = d.solicitacoes[0];
  assert.deepEqual([so.id, so.numero, so.centroCustoCodigo, so.centroCustoCaju, so.pessoaId, so.carregado, so.gasto, so.aceito, so.devolvido, so.aDevolver, so.conciliacaoSituacao],
    [s.id, 'VIA-2026-0001', 'GO-TECNICA', 'CAJU-GO-TEC', 'u_tec', 2660, 2240, 2240, 420, 0, '']);
  assert.equal(d.cargas.length, 1); assert.deepEqual([d.cargas[0].valor, d.cargas[0].extratoId, d.cargas[0].pessoaId], [2660, '', 'u_tec']);
  assert.deepEqual(d.gastos.map((g) => [g.item, g.categoria, g.valor, g.valorAceito, g.pagoCom, g.centroCustoCaju, g.transacaoId]),
    [[1, 'HOSPEDAGEM', 1500, 1500, 'CAJU', 'CAJU-GO-TEC', ''], [2, 'ALIMENTACAO', 700, 700, 'CAJU', 'CAJU-GO-TEC', ''], [3, 'ESTACIONAMENTO', 40, 40, 'CAJU', 'CAJU-GO-TEC', '']]);
  assert.ok(d.gastos.every((g) => /^[\w-]+$/.test(g.id) && g.solicitacaoId === s.id && g.pessoaId === 'u_tec'));
  assert.equal(d.acertos[0].tipo, 'DEVOLUCAO'); assert.equal(d.acertos[0].transacaoId, '');
  assert.deepEqual(d.porCentro.map((c) => [c.centro, c.centroCaju, c.carregado, c.gastoCaju, c.aceito, c.devolvido]), [['GO-TECNICA', 'CAJU-GO-TEC', 2660, 2240, 2240, 420]]);
  assert.equal(a.ok(a.v('wanessa', 'dadosConciliacao', { de: '2026-12-01', ate: '2026-12-31' })).solicitacoes.length, 0);
  // colunas reservadas para o módulo novo estão no modelo e vazias
  for (const c of ['TRANSACAO_ID', 'CONCILIACAO_SITUACAO']) assert.ok(a.ctx.VIA_COLUNAS.VIA_PRESTACOES.includes(c), c);
  assert.ok(a.ctx.VIA_COLUNAS.VIA_ACERTOS.includes('TRANSACAO_ID')); assert.ok(a.ctx.VIA_COLUNAS.VIA_SOLICITACOES.includes('CONCILIACAO_SITUACAO'));
  assert.ok(!a.tabelas.VIA_EXTRATO_CAJU, 'a importação do extrato do Caju é do módulo novo');
});

test('tela: abas Prestar contas e Conferir prestações, lançamento com IA, glosa, acerto, ciência e trava; sem confirm/prompt; nada redesenha sozinho', () => {
  const tela = ler('JS_DepositoViagem.html'), js = /<script>([\s\S]*)<\/script>/.exec(tela)[1];
  new vm.Script(js);
  for (const t of ['"Prestar contas"', '"Conferir prestações"', 'Lançar o gasto', 'Ler o comprovante', 'Enviar a prestação ao Financeiro', 'Concluir a conferência', 'Devolver para ajuste',
    'Confirmar a glosa', 'Registrar o acerto', 'Dar ciência', 'Liberar a trava', 'Ver o A4 de fechamento', 'Descartar o gasto que você está lançando?']) assert.ok(js.includes(t), t);
  assert.doesNotMatch(js, /\b(window\.)?(confirm|prompt|alert)\s*\(/);
  assert.doesNotMatch(js, /setInterval|setTimeout\([^)]*VgT_(abrir|irAba|mostrarDetalhe)/, 'nada redesenha sozinho');
  assert.match(js, /id="vgGasto" class="vg-faixa is-neutra" data-sgo-sujo="0"/);
  // cores iguais às do servidor
  const a = ambiente();
  const coresTela = JSON.parse(/var VG_CORES = (\{[^}]+\})/.exec(js)[1].replace(/(\w+):/g, '"$1":'));
  assert.deepEqual(coresTela, JSON.parse(JSON.stringify(a.ctx.VIA_CORES)));
  for (const k of Object.keys(a.ctx.VIA_CORES)) assert.match(tela, new RegExp('\\.vg-selo\\.s-' + k + ' \\{'), 'selo ' + k);
});

test('ajuda, manual (docs e base do assistente) e guia da Wanessa cobrem a prestação de contas', () => {
  const a = ambiente();
  const aj = JSON.stringify(a.ctx.SGO_Ajuda_todas_().telas.deposito_viagem);
  for (const t of ['Prestar contas', 'Conferir prestações', 'glosa', 'A4 de fechamento', 'ciência', 'trava', 'sem comprovante']) assert.ok(aj.toLowerCase().includes(t.toLowerCase()), 'ajuda: ' + t);
  assert.doesNotMatch(aj, /Fica para a próxima etapa do módulo \(prestação/);
  const man = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_DEPOSITO_VIAGEM.md'), 'utf8');
  for (const t of ['Prestar contas', 'Conferir a prestação', 'Acerto do saldo', 'Ciência do fechamento', 'Trava', 'conciliação com o extrato']) assert.ok(man.includes(t), 'manual: ' + t);
  const c = {}; vm.createContext(c); vm.runInContext(ler('SGO_AssistenteManuais.js') + ';this.M=SGO_ASSIST_MANUAIS', c);
  const e = c.M.manuais.find((m) => m.arquivo === 'MANUAL_DEPOSITO_VIAGEM.md');
  assert.ok(e.secoes.some((x) => /Prestar contas/.test(x.titulo)), 'base do assistente atualizada');
  assert.ok(c.M.manuais.some((m) => m.arquivo === 'MANUAL_MODULO_FROTA.md'), 'o resto da base continua lá');
  const guia = fs.readFileSync(path.join(__dirname, '../output/deposito-viagem-e2/GUIA_WANESSA.md'), 'utf8');
  for (const t of ['Conferir prestações', 'Glosar', 'Registrar o acerto', 'Concluir a conferência']) assert.ok(guia.includes(t), 'guia: ' + t);
});
