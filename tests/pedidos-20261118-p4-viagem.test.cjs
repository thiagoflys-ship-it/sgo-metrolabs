// Pacote 4 de 18/11/2026, item 12 (Matheus, 17/11 22:48): depósito de viagem com recarga proporcional (percentual VAZIO até a gestão
// decidir) ou fixa, combustível pelo consumo real do veículo da Frota, "sem combustível nesta viagem" e o aviso ao Financeiro para
// recolher a sobra do cartão Caju. Código real do SGO+ (SGO_Viagem*.js, SGO_Caju*.js, Frota de abastecimento); nada sai de verdade.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente, solicitacaoBase, criarCompleta, PASTA } = require('./_viagem_ambiente.cjs');
const { ambienteCaju } = require('./_caju_ambiente.cjs');

const recusa = (r, re) => { assert.equal(r.ok, false, 'esperava recusa, veio ok'); if (re) assert.match(r.message, re); return r; };
const solic = (a, id) => a.tabelas.VIA_SOLICITACOES.find((x) => x.ID === id);
let nArq = 0;
const comp = (a, nome) => a.pdf((nome || 'comprovante') + '-' + (++nArq) + '.pdf');
const gasto = (a, s, x) => Object.assign({ id: s.id, data: '2026-10-27', pagoCom: 'CAJU', arquivo: comp(a), descricao: 'gasto da equipe no atendimento do Hospital Teste Alfa' }, x);
const pend = (a, uid, perfil) => { const l = []; a.ctx.Viagem_fontePendencias_((x) => l.push(x), { userId: uid, perfil }); return l; };
const POL = { aprovadores: ['matheusgodoi'], limiteDiretoria: '5.000,00', urgenteDiasUteis: 2, tetos: {} };
function enviarAprovar(a, s) {
  a.ok(a.v('gil', 'enviar', { id: s.id }));
  return a.ok(a.v('matheusgodoi', 'decidir', { id: s.id, decisao: 'APROVAR', fundamentacao: 'Valores dentro do praticado' })).solicitacao;
}
/** A Frota de abastecimento (código real) no mesmo contexto, para o consumo do veículo. */
function comFrota(a, abast) {
  a.ctx.SGO_CFG.SHEETS.REG_FROTA_ABASTECIMENTO = 'REG_FROTA_ABASTECIMENTO';
  for (const f of ['SGO_Frota_Main.js', 'SGO_Frota_Rastreador.js', 'SGO_Frota_Rastreamento.js', 'SGO_Frota_Abastecimento.js']) vm.runInContext(fs.readFileSync(path.join(PASTA, f), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  a.tabelas.REG_FROTA_ABASTECIMENTO = (abast || []).map((x, i) => Object.assign({ ID: 'ab' + i, VEICULO_ID: 'v1', HORA: '08:00', TIPO_COMBUSTIVEL: 'Gasolina', EXCLUIDO_EM: '' }, x));
  return a;
}
// 4 abastecimentos: intervalos de 420, 440 e 440 km com 40 L = 10,5 / 11 / 11 km/L (mediana 11); último litro R$ 6,29
const QUATRO = [{ DATA: '01/10/2026', KM: 100000, LITROS: 40, VALOR: 240 }, { DATA: '08/10/2026', KM: 100420, LITROS: 40, VALOR: 244 },
  { DATA: '15/10/2026', KM: 100860, LITROS: 40, VALOR: 248 }, { DATA: '17/10/2026', KM: 101300, LITROS: 40, VALOR: 251.6 }];

// ------------------------------------------------------------------ a) recarga
test('12a: sem recarga escolhida tudo continua como antes (mesma marca de conteúdo da cand28; carga = total aprovado)', () => {
  const a = ambiente();
  const base = solicitacaoBase(a);
  const novo = a.ctx.Via_hash_(a.ctx.Via_conteudoLimpo_(JSON.parse(JSON.stringify(base)), a.ctx.Via_politica_()), []);
  // código antigo (cand28) no mesmo contexto: a marca precisa ser igual para as solicitações em andamento não perderem a aprovação
  const antigo = fs.readFileSync(path.join(__dirname, '../output/financeiro-20261116/cand28/SGO_Viagem.js'), 'utf8');
  const b = ambiente();
  vm.runInContext(antigo, b.ctx, { filename: 'cand28/SGO_Viagem.js' });
  assert.equal(b.ctx.Via_hash_(b.ctx.Via_conteudoLimpo_(JSON.parse(JSON.stringify(base))), []), novo);
  const s = enviarAprovar(a, criarCompleta(a, 'gil'));
  assert.equal(solic(a, s.id).APROVADO_RECARGA, '');
  assert.equal(s.saldoACarregar, 2660);
  assert.equal(s.recarga.modo, 'INTEGRAL');
  assert.ok(!s.apontamentos.some((x) => x.codigo === 'RECARGA'));
});

test('12a: percentual da política VAZIO = proporcional não aparece e é recusado com o que fazer; com 70% carrega 70% do total', () => {
  const a = ambiente();
  const op = a.ok(a.v('gil', 'opcoes')).recarga;
  assert.deepEqual(op.modos.map((m) => m[0]), ['INTEGRAL', 'FIXO']);
  assert.equal(op.semPercentual, true);
  assert.equal(a.ctx.Via_politica_().recargaPercentual, null, 'nenhum percentual inventado');
  const s = criarCompleta(a, 'gil', { recarga: { modo: 'PROPORCIONAL' } });
  assert.ok(s.faltas.some((f) => /ainda não tem o percentual da recarga proporcional[\s\S]*Política/.test(f)), s.faltas.join(' | '));
  recusa(a.v('gil', 'enviar', { id: s.id }), /percentual/);
  // a gestão define 70%
  recusa(a.v('gil', 'salvarPolitica', { politica: Object.assign({ recargaPercentual: '70' }, POL), motivo: 'percentual decidido pela gestão' }), /política/);
  recusa(a.v('dora', 'salvarPolitica', { politica: Object.assign({ recargaPercentual: '170' }, POL), motivo: 'percentual decidido pela gestão' }), /de 1 a 100/);
  a.ok(a.v('dora', 'salvarPolitica', { politica: Object.assign({ recargaPercentual: '70' }, POL), motivo: 'percentual decidido pela gestão' }));
  assert.deepEqual(a.ok(a.v('gil', 'opcoes')).recarga.modos.map((m) => m[0]), ['INTEGRAL', 'PROPORCIONAL', 'FIXO']);
  // a solicitação antiga ficou com o percentual vazio: salvar de novo recalcula
  const s2 = a.ok(a.v('gil', 'salvar', Object.assign(solicitacaoBase(a, { recarga: { modo: 'PROPORCIONAL' } }), { id: s.id }))).solicitacao;
  assert.deepEqual(s2.faltas, []);
  assert.equal(s2.recarga.valor, 1862); assert.equal(s2.recarga.valorTxt, 'R$ 1.862,00');
  assert.match(s2.recarga.texto, /70% do total de R\$ 2\.660,00/);
  assert.ok(s2.apontamentos.some((x) => x.codigo === 'RECARGA' && /R\$ 1\.862,00/.test(x.texto)));
  const ap = enviarAprovar(a, s2);
  assert.equal(solic(a, s.id).APROVADO_RECARGA, 1862);
  assert.equal(ap.saldoACarregar, 1862);
  assert.equal(a.ok(a.v('wanessa', 'abrir', { id: s.id })).solicitacao.acoes.carga.saldo, 1862);
  assert.ok(a.emails.some((m) => /Carga a fazer no cartão Caju: .*R\$ 1\.862,00/.test(m.subject)));
  recusa(a.v('wanessa', 'registrarCarga', { id: s.id, valor: '2.660,00', data: '2026-10-19', comprovante: comp(a) }), /passa do que falta carregar \(R\$ 1\.862,00 de R\$ 1\.862,00 de recarga aprovada/);
  const c = a.ok(a.v('wanessa', 'registrarCarga', { id: s.id, valor: '1.862,00', data: '2026-10-19', comprovante: comp(a) })).solicitacao;
  assert.match(c.acoes.carga.motivo, /recarga aprovada \(R\$ 1\.862,00\) já foi toda carregada/);
  assert.equal(a.ok(a.v('wanessa', 'listar', { aba: 'carga' })).itens.length, 0);
  // A4: a recarga aparece na solicitação e no fechamento
  const html = a.ok(a.v('gil', 'documento', { id: s.id })).html;
  assert.match(html, /Recarga no cartão Caju:<\/b> R\$ 1\.862,00/);
  assert.match(a.ok(a.v('gil', 'fechamento', { id: s.id })).html, /Recarga aprovada para o cartão \(70% do total/);
});

test('12a: valor fixo com motivo, nunca acima do total; a política pode mandar sempre o total; a carga pelo Caju segue a recarga aprovada', () => {
  const a = ambienteCaju({});
  a.vincularEquipe();
  let s = criarCompleta(a, 'gil', { recarga: { modo: 'FIXO', valor: '3.000,00' } });
  assert.ok(s.faltas.some((f) => /valor fixo \(R\$ 3\.000,00\) passa do total da solicitação \(R\$ 2\.660,00\)/.test(f)));
  assert.ok(s.faltas.some((f) => /por que o valor fixo/.test(f)));
  s = a.ok(a.v('gil', 'salvar', Object.assign(solicitacaoBase(a, { recarga: { modo: 'FIXO', valor: '1.000,00', justificativa: 'hotel pago pela empresa direto ao fornecedor' } }), { id: s.id }))).solicitacao;
  assert.deepEqual(s.faltas, []);
  assert.equal(solic(a, s.id).RECARGA_MODO, 'FIXO'); assert.equal(solic(a, s.id).RECARGA_VALOR, 1000);
  // política: sempre o total -> o fixo vira falta com o que fazer
  a.ok(a.v('dora', 'salvarPolitica', { politica: Object.assign({ recargaModo: 'INTEGRAL' }, POL), motivo: 'Diretoria quer carregar sempre o total' }));
  assert.ok(a.ok(a.v('gil', 'abrir', { id: s.id })).solicitacao.faltas.some((f) => /manda carregar o total da solicitação/.test(f)));
  recusa(a.v('dora', 'salvarPolitica', { politica: Object.assign({ recargaModo: 'PROPORCIONAL' }, POL), motivo: 'teste sem o percentual' }), /preencha o percentual/);
  a.ok(a.v('dora', 'salvarPolitica', { politica: Object.assign({ recargaModo: 'SOLICITANTE' }, POL), motivo: 'volta a quem pede escolher' }));
  const ap = enviarAprovar(a, s);
  assert.equal(ap.recarga.aprovadaTxt, 'R$ 1.000,00');
  const fin = a.ok(a.v('wanessa', 'abrir', { id: s.id })).solicitacao;
  assert.equal(fin.acoes.cargaCaju.pode, true, fin.acoes.cargaCaju.motivo); assert.equal(fin.acoes.cargaCaju.saldo, 1000);
  const r = a.ok(a.c('wanessa', 'pedidoCriar', { id: s.id, categoria: 'FLEXIBLE', daViagem: true }));
  const ped = a.tabelas.CJU_PEDIDOS.find((p) => p.SOLICITACAO_ID === s.id);
  assert.equal(ped.VALOR, 1000, 'o pedido de crédito no Caju sai com a recarga aprovada, não com o total');
  assert.ok(r);
  // a tela dos créditos mostra a recarga aprovada
  const cred = a.ok(a.c('wanessa', 'creditos', {}));
  assert.ok(JSON.stringify(cred).indexOf('R$ 1.000,00') >= 0);
});

// ------------------------------------------------------------------ b) combustível pelo veículo
test('12b: consumo real do veículo pela Frota (mediana de 3 intervalos ou mais) e preço do último abastecimento; sem leituras, diz e pede', () => {
  const a = comFrota(ambiente(), QUATRO);
  const k = a.ok(a.v('gil', 'consumoVeiculo', { veiculoId: 'v1' })).consumo;
  assert.equal(k.suficiente, true); assert.equal(k.kmL, 11); assert.equal(k.intervalos, 3);
  assert.equal(k.preco, 6.29); assert.equal(k.precoOrigem, 'FROTA'); assert.equal(k.precoData, '17/10/2026');
  assert.match(k.texto, /consumo real do veículo ABC1D23 · Strada · Onça: 11,00 km\/L \(mediana de 3 intervalos entre abastecimentos registrados na Frota\); preço do litro R\$ 6,29 do último abastecimento do veículo \(17\/10\/2026, gasolina\)/i);
  recusa(a.v('rita', 'consumoVeiculo', { veiculoId: 'v1' }), /quem monta a solicitação/);
  // a linha guarda como foi calculado; consumo informado muito diferente vira apontamento para quem aprova
  const s = criarCompleta(a, 'gil', { linhas: [
    { id: 'Lhotel', categoria: 'HOSPEDAGEM', q1: 2, q2: 3, unitario: '250,00', descricao: 'Hotel Centro, Rio Verde' }, { id: 'Lalim', categoria: 'ALIMENTACAO', q1: 2, q2: 4, unitario: '100,00' },
    { id: 'Lcomb', categoria: 'COMBUSTIVEL', q1: 600, q2: 7, unitario: '6,29', calculo: { consumo: 'INFORMADO', preco: 'FROTA', texto: k.texto + ' Consumo alterado à mão por quem pediu.' } }] });
  const lc = s.linhas.find((l) => l.id === 'Lcomb');
  assert.equal(lc.calculo.preco, 'FROTA'); assert.match(lc.calculo.texto, /Consumo alterado à mão/);
  assert.ok(s.apontamentos.some((x) => x.codigo === 'CONSUMO' && /consumo informado de 7,00 km\/L; o consumo real do veículo .* é 11,00 km\/L/.test(x.texto)));
  assert.match(a.ok(a.v('gil', 'documento', { id: s.id })).html, /Como foi calculado: Consumo real do veículo/);
  // com o consumo real, sem apontamento
  const s2 = criarCompleta(a, 'gil', { saidaEm: '2026-11-09T07:00', chegadaEm: '2026-11-10T18:00', linhas: [{ id: 'Lhotel', categoria: 'HOSPEDAGEM', q1: 1, q2: 1, unitario: '250,00', descricao: 'Hotel' }, { id: 'Lalim', categoria: 'ALIMENTACAO', q1: 2, q2: 2, unitario: '100,00' }, { id: 'Lcomb', categoria: 'COMBUSTIVEL', q1: 600, q2: 11, unitario: '6,29' }] });
  assert.ok(!s2.apontamentos.some((x) => x.codigo === 'CONSUMO'));
  // só dois abastecimentos: não tem leituras suficientes; sem nenhum: preço da política (vazio por padrão) ou pede
  const b = comFrota(ambiente(), QUATRO.slice(0, 2));
  const k2 = b.ok(b.v('gil', 'consumoVeiculo', { veiculoId: 'v1' })).consumo;
  assert.equal(k2.suficiente, false); assert.equal(k2.kmL, null); assert.equal(k2.preco, 6.1);
  assert.match(k2.texto, /ainda não tem leituras suficientes para o consumo \(tem 1 intervalo coerente entre abastecimentos; são necessários 3\): informe o consumo/);
  const c = comFrota(ambiente(), []);
  assert.match(c.ok(c.v('gil', 'consumoVeiculo', { veiculoId: 'v1' })).consumo.texto, /sem abastecimento com valor registrado e sem preço de referência na política: informe o preço do litro/);
  c.ok(c.v('dora', 'salvarPolitica', { politica: Object.assign({ precoLitroPadrao: '6,49' }, POL), motivo: 'preço de referência da gestão' }));
  const k3 = c.ok(c.v('gil', 'consumoVeiculo', { veiculoId: 'v1' })).consumo;
  assert.equal(k3.preco, 6.49); assert.equal(k3.precoOrigem, 'POLITICA');
  // sem a Frota carregada, a tela diz o que fazer
  const d = ambiente();
  assert.match(d.ok(d.v('gil', 'consumoVeiculo', { veiculoId: 'v1' })).consumo.texto, /não estão disponíveis agora. Informe o consumo/);
  assert.match(d.ok(d.v('gil', 'consumoVeiculo', {})).consumo.texto, /Escolha o veículo da Frota/);
});

// ------------------------------------------------------------------ c) sem combustível
test('12c: "sem combustível nesta viagem" (abastecimento pelo cartão da frota) zera o combustível da recarga e leva o motivo ao A4', () => {
  const a = ambiente();
  const op = a.ok(a.v('gil', 'opcoes')).recarga;
  const m = op.semCombustivel.find((x) => x.cod === 'CARTAO_FROTA');
  assert.match(m.texto, /cartão da frota \(Itaú\), uma vez por semana/);
  const base = solicitacaoBase(a);
  base.linhas = base.linhas.filter((l) => l.categoria !== 'COMBUSTIVEL');
  base.naoSeAplica.COMBUSTIVEL = m.texto;
  const s = a.ok(a.v('gil', 'salvar', base)).solicitacao;
  a.ok(a.v('gil', 'anexar', { id: s.id, linhaId: 'Lhotel', arquivo: a.pdf('hotel.pdf') }));
  const d = a.ok(a.v('gil', 'abrir', { id: s.id })).solicitacao;
  assert.deepEqual(d.faltas, []);
  assert.equal(d.totalCalculado, 2300, 'sem os R$ 360,00 do combustível');
  assert.equal(d.recarga.valor, 2300);
  assert.match(a.ok(a.v('gil', 'documento', { id: s.id })).html, /Combustível<\/td><td>Abastecimento pelo cartão da frota \(Itaú\)/);
});

// ------------------------------------------------------------------ d) sobra a recolher
test('12d: prestação enviada com sobra no cartão -> aviso e pendência ao Financeiro (lista de sigilo) com valor e prazo; o acerto registra quando foi recolhido', () => {
  const a = ambiente();
  const s = criarCompleta(a, 'gil');
  enviarAprovar(a, s);
  a.ok(a.v('wanessa', 'registrarCarga', { id: s.id, valor: '2.660,00', data: '2026-10-19', comprovante: comp(a, 'caju') }));
  a.mudar('2026-10-30T10:00:00-03:00');
  a.ok(a.v('tiago', 'lancarGasto', gasto(a, s, { categoria: 'HOSPEDAGEM', linhaId: 'Lhotel', valor: '1.500,00', estabelecimento: 'Hotel Centro' })));
  a.ok(a.v('tiago', 'lancarGasto', gasto(a, s, { categoria: 'ALIMENTACAO', valor: '300,00', estabelecimento: 'Restaurante', pagoCom: 'PROPRIO' })));
  assert.equal(pend(a, 'u_fin', 'FINANCEIRO').filter((x) => x.tipo === 'viagem_recolher').length, 0, 'antes do envio não há sobra conhecida');
  a.ok(a.v('tiago', 'enviarPrestacao', { id: s.id }));
  // carregado 2.660 − gasto no cartão 1.500 = 1.160 no cartão; a conta prevê devolver 2.660 − 1.800 = 860: recolher 860
  const it = pend(a, 'u_fin', 'FINANCEIRO').find((x) => x.tipo === 'viagem_recolher');
  assert.ok(it, 'pendência do recolhimento');
  assert.equal(it.titulo, 'Recolher a sobra de R$ 860,00 do cartão Caju de TIAGO TECNICO TESTE (viagem ' + solic(a, s.id).NUMERO + ')');
  assert.deepEqual(Array.from(it.paraUsuarios).sort(), ['u_fin', 'u_fin2']);
  assert.ok(it.extra.sigiloFin); assert.match(it.id, /^VIA:ACERTO:REC:/);
  const prazo = a.ctx.Via_somarDiasUteis_('2026-10-30', 2);
  assert.equal(it.vencimento, a.ctx.Via_brDia_(prazo));
  assert.match(it.detalhe, /saldo previsto no cartão R\$ 1\.160,00/);
  assert.match(it.oQueFazer, /Recolhimento do saldo no Caju", com a data do recolhimento e o comprovante/);
  assert.ok(!Array.from(it.paraUsuarios).includes('u_tec') && !Array.from(it.paraUsuarios).includes('u_gt'), 'o viajante e quem pediu não recebem a pendência');
  const av = a.emails.filter((m) => /Sobra no cartão Caju a recolher/.test(m.subject));
  assert.deepEqual(av.map((m) => m.to.split('@')[0]).sort(), ['fabio', 'wanessa']);
  assert.ok(av.every((m) => !/R\$/.test(m.subject) && /R\$ 860,00/.test(m.body)), 'valor no corpo, nunca no assunto');
  assert.equal(solic(a, s.id).RECOLHER_PRAZO, prazo);
  // a tela: o Financeiro vê o quadro com o que fazer; o viajante vê o dele
  assert.match(a.ok(a.v('wanessa', 'abrir', { id: s.id })).solicitacao.prestacao.recolher.fazer, /portal do Caju/);
  assert.match(a.ok(a.v('tiago', 'abrir', { id: s.id })).solicitacao.prestacao.recolher.fazer, /você não precisa fazer nada/);
  // prazo vencido: aviso uma vez pela rotina
  a.mudar(a.ctx.Via_somarDias_(prazo, 1) + 'T10:00:00-03:00');
  delete a.props.VIA_ROTINA_DIA;
  a.ctx.Viagem_rotina_({ dentro: true });
  delete a.props.VIA_ROTINA_DIA;
  a.ctx.Viagem_rotina_({ dentro: true });
  assert.equal(a.emails.filter((m) => /Prazo vencido: sobra no cartão Caju a recolher/.test(m.subject)).length, 2, 'uma vez para cada pessoa do Financeiro');
  assert.equal(pend(a, 'u_fin', 'FINANCEIRO').find((x) => x.tipo === 'viagem_recolher').gravidade, 'CRITICO');
  // conferência: glosa de 100 no hotel -> devolver 960; recolher do cartão 960 (cabe no saldo de 1.160)
  const itens = a.tabelas.VIA_PRESTACOES;
  a.ok(a.v('wanessa', 'conferirItem', { id: s.id, itemId: itens[0].ID, decisao: 'GLOSAR', valorGlosado: '100,00', motivo: 'frigobar não é despesa de viagem' }));
  a.ok(a.v('wanessa', 'conferirItem', { id: s.id, itemId: itens[1].ID, decisao: 'ACEITAR' }));
  a.ok(a.v('wanessa', 'concluirConferencia', { id: s.id }));
  const ac = pend(a, 'u_fin', 'FINANCEIRO');
  assert.equal(ac.filter((x) => x.tipo === 'viagem_recolher').length, 0, 'depois da conferência fica um item só');
  const acerto = ac.find((x) => x.tipo === 'viagem_acerto');
  assert.match(acerto.titulo, /^Recolher a sobra de R\$ 960,00 do cartão Caju de TIAGO TECNICO TESTE .* e registrar o acerto — prazo vencido/);
  a.ok(a.v('wanessa', 'registrarAcerto', { id: s.id, tipo: 'DEVOLUCAO', forma: 'RECOLHIMENTO_CAJU', data: a.ctx.Via_hoje_(), valor: '960,00', comprovante: comp(a) }));
  assert.equal(pend(a, 'u_fin', 'FINANCEIRO').filter((x) => /viagem_(recolher|acerto)/.test(x.tipo)).length, 0);
  const reg = a.tabelas.VIA_ACERTOS[0];
  assert.equal(reg.FORMA, 'RECOLHIMENTO_CAJU'); assert.equal(reg.DATA, a.ctx.Via_hoje_()); assert.equal(reg.POR_NOME, 'WANESSA FINANCEIRO TESTE');
});

test('12d: sem sobra no cartão (gastou tudo ou a conta pede reembolso) não há aviso nem pendência de recolhimento', () => {
  const a = ambiente();
  const s = criarCompleta(a, 'gil');
  enviarAprovar(a, s);
  a.ok(a.v('wanessa', 'registrarCarga', { id: s.id, valor: '2.660,00', data: '2026-10-19', comprovante: comp(a, 'caju') }));
  a.mudar('2026-10-30T10:00:00-03:00');
  a.ok(a.v('tiago', 'lancarGasto', gasto(a, s, { categoria: 'HOSPEDAGEM', linhaId: 'Lhotel', valor: '2.000,00', estabelecimento: 'Hotel Centro' })));
  a.ok(a.v('tiago', 'lancarGasto', gasto(a, s, { categoria: 'ALIMENTACAO', valor: '700,00', estabelecimento: 'Restaurante', pagoCom: 'PROPRIO' })));
  a.ok(a.v('tiago', 'enviarPrestacao', { id: s.id }));
  assert.equal(pend(a, 'u_fin', 'FINANCEIRO').filter((x) => x.tipo === 'viagem_recolher').length, 0);
  assert.equal(a.emails.filter((m) => /Sobra no cartão Caju/.test(m.subject)).length, 0);
  assert.equal(a.ok(a.v('wanessa', 'abrir', { id: s.id })).solicitacao.prestacao.recolher, null);
});
