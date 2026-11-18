// Onda B do Financeiro (18/11/2026), item B1: aprovação de pagamentos. Lista diária "a pagar hoje" (vencidas e de hoje, mais as que o
// Financeiro escolher) enviada pela Wanessa e aprovada pelo dono ou pela Diretoria em lote, num toque, com recusa e adiamento item por
// item; a baixa de conta a pagar só é preparada depois. Decisões do dono de 18/11/2026: só o dono e o Charles aprovam; quem enviou não
// aprova; dispensa por valor existe mas fica vazia (nenhuma dispensa). Especificação: ESPEC_ONDA2_FINANCEIRO.md, seção 5 (B1).
// Código REAL do SGO+ com o OMIE SIMULADO (tests/_financeiro_b1c3.cjs); nada sai para a rede, nenhum e-mail real.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { montarB1C3, listaAprovada } = require('./_financeiro_b1c3.cjs');

const baixa = (a, login, id, valor) => a.F('OmieOps_apiPrevia', login || 'wanessa', { acao: 'baixar', tipo: 'pagar', id: id || 101, dados: { contaId: 5, valor: valor || 1000, data: '2026-11-16', observacao: 'PIX ao fornecedor' } });
const pagamentos = (a) => a.escritas().filter((c) => c.call === 'LancarPagamento');

test('B1-1: a lista do dia traz as contas vencidas e as de hoje já marcadas; sem aprovação, a baixa de conta a pagar não é preparada (o quê, por quê e o que fazer)', () => {
  const a = montarB1C3();
  const r = a.F('OmiePag_apiTela', 'wanessa');
  assert.equal(r.ok, true, r.mensagem);
  assert.deepEqual(r.candidatos.map((c) => [c.id, c.vencimento, c.marcado, c.podeEnviar]), [[101, '10/11/2026', true, true], [105, '12/11/2026', true, true], [102, '16/11/2026', true, true]]);
  assert.equal(r.dispensa, '', 'sem valor de dispensa informado pelo dono: nenhuma dispensa');
  assert.equal(r.podeEnviar, true); assert.equal(r.podeDecidir, false);
  assert.match(r.aprovadores, /DORA DIRETORA TESTE ou DONO DO SISTEMA TESTE/);
  // com "também as que vencem em até 30 dias": a 103 (26/11) entra desmarcada; a 104 (janeiro) fica fora
  const r2 = a.F('OmiePag_apiTela', 'wanessa', { aVencer: true });
  assert.deepEqual(r2.candidatos.map((c) => [c.id, c.marcado]), [[101, true], [105, true], [102, true], [103, false]]);
  // baixa sem a lista: recusada, nada lido além do título, nada gravado
  const b = baixa(a);
  assert.equal(b.ok, false);
  assert.match(b.mensagem, /NF-001 ainda não passou pela lista de aprovação[\s\S]*decisão do dono[\s\S]*Nada foi preparado[\s\S]*Aprovação de pagamentos[\s\S]*Enviar para aprovação/);
  assert.equal(a.escritas().length, 0);
  // conta a receber continua sem a lista
  assert.equal(a.F('OmieOps_apiPrevia', 'wanessa', { acao: 'baixar', tipo: 'receber', id: 101, dados: { contaId: 5, valor: 100, data: '2026-11-16' } }).ok, true);
});

test('B1-2: a Wanessa envia; a trava da baixa diz de quem e desde quando; aviso e pendência só para o dono e a Diretoria, sem valor; Financeiro não aprova', () => {
  const a = montarB1C3();
  const e = a.F('OmiePag_apiEnviar', 'wanessa', { titulos: [101, 102], obs: 'fornecedor cobra multa a partir de amanhã' });
  assert.equal(e.ok, true, e.mensagem);
  assert.match(e.mensagem, /2 conta\(s\) enviada\(s\)[\s\S]*Nada foi pago nem gravado no Omie[\s\S]*Quem aprova: DORA DIRETORA TESTE ou DONO DO SISTEMA TESTE[\s\S]*aviso foi enviado agora/);
  assert.equal(a.escritas().length, 0, 'enviar não grava nada no Omie');
  const itens = a.itensPag();
  assert.deepEqual(itens.map((x) => [x.TITULO_OMIE, x.SITUACAO, x.VALOR, x.ORIGEM, x.ENVIADO_POR_ID]), [['101', 'AGUARDANDO', 1000, 'VENCIMENTO', 'u_fin'], ['102', 'AGUARDANDO', 2500.5, 'VENCIMENTO', 'u_fin']]);
  // aviso: dono e Diretoria da lista; sem valor nem fornecedor no assunto e no texto
  assert.equal(a.avisos.length, 1);
  assert.deepEqual(a.avisos[0].usuarios.slice().sort(), ['u_adm', 'u_dir']);
  assert.equal(a.avisos[0].titulo, 'Pagamentos aguardando a sua aprovação');
  assert.ok(!/R\$|\d+,\d{2}|Posto|Terceiros/.test(a.avisos[0].titulo + a.avisos[0].texto), 'sem valor e sem fornecedor no aviso');
  // a trava da baixa
  const b = baixa(a);
  assert.equal(b.ok, false);
  assert.match(b.mensagem, /NF-001 está aguardando aprovação desde 16\/11\/2026 10:00 \(enviado por WANESSA FINANCEIRO TESTE\)[\s\S]*Quem aprova: DORA DIRETORA TESTE ou DONO DO SISTEMA TESTE[\s\S]*Nada foi preparado/);
  // na lista de Lançamentos e baixas, a mesma situação em cada conta a pagar
  const l = a.F('OmieOps_apiListar', 'wanessa', { tipo: 'pagar', situacao: 'ATRASADO' });
  assert.equal(l.ok, true, l.mensagem);
  assert.match(l.itens.find((i) => i.id === 101).aprovacao.texto, /Aguardando aprovação desde 16\/11\/2026 10:00/);
  assert.match(l.itens.find((i) => i.id === 105).aprovacao.texto, /ainda não aprovado/);
  // o Financeiro não aprova (nem a Wanessa, nem outra pessoa do Financeiro): recusa registrada
  for (const login of ['wanessa', 'fabio']) {
    const d = a.F('OmiePag_apiDecidir', login, { decisao: 'aprovar_todos' });
    assert.equal(d.ok, false); assert.match(d.mensagem, /Você não aprova pagamentos: por decisão do dono, só o dono do sistema e a Diretoria[\s\S]*Nada foi alterado/);
  }
  assert.ok(a.acessos().some((x) => x.CONSULTA === 'OmiePag_apiDecidir' && x.RESULTADO === 'NEGADO' && x.USUARIO_ID === 'u_fin2'));
  // pendência: dono e Diretoria; nunca o Financeiro; sem valor
  const pd = a.pend('dora').filter((x) => x.tipo === 'fin_pag_aprovar');
  assert.equal(pd.length, 1); assert.match(pd[0].titulo, /2 pagamento\(s\) da lista de WANESSA FINANCEIRO TESTE aguardando aprovação desde 16\/11\/2026 10:00/);
  assert.ok(!/R\$/.test(pd[0].titulo + pd[0].detalhe));
  assert.equal(a.pend('admin').filter((x) => x.tipo === 'fin_pag_aprovar').length, 1);
  assert.equal(a.pend('wanessa').filter((x) => x.tipo === 'fin_pag_aprovar').length, 0);
  // faixa do topo do Painel
  assert.equal(a.F('Omie_apiIniciar', 'dora').pagamentosPendentes, 2);
  assert.equal(a.F('Omie_apiIniciar', 'wanessa').pagamentosPendentes, 0);
  // o mesmo título não entra duas vezes
  const de = a.F('OmiePag_apiEnviar', 'wanessa', { titulos: [101] });
  assert.equal(de.ok, false); assert.match(de.mensagem, /NF-001 já está na lista[\s\S]*Nada foi enviado/);
});

test('B1-3: o dono ou a Diretoria aprova todos num toque; a baixa fica liberada, confere de novo na confirmação e marca o item como pago', () => {
  const a = montarB1C3();
  listaAprovada(a, [101, 102], 'dora');
  assert.deepEqual(a.itensPag().map((x) => [x.SITUACAO, x.DECIDIDO_POR_ID]), [['APROVADO', 'u_dir'], ['APROVADO', 'u_dir']]);
  assert.equal(a.escritas().length, 0, 'aprovar não grava nada no Omie');
  // a baixa acima do aprovado é recusada
  let b = baixa(a, 'wanessa', 101, 1000.01);
  assert.equal(b.ok, false); assert.match(b.mensagem, /passa do valor aprovado para pagar \(R\$ 1\.000,00/);
  // baixa parcial: liberada, a prévia diz quem aprovou
  b = baixa(a, 'wanessa', 101, 400);
  assert.equal(b.ok, true, b.mensagem);
  assert.match(b.resumo.map((x) => x.join(': ')).join('\n'), /Aprovação do pagamento: Aprovado por DORA DIRETORA TESTE em 16\/11\/2026 10:00 \(lista enviada por WANESSA FINANCEIRO TESTE\)\. Liberado até R\$ 1\.000,00/);
  const c = a.F('OmieOps_apiConfirmar', 'wanessa', { token: b.token });
  assert.equal(c.ok, true, c.mensagem);
  assert.equal(pagamentos(a).length, 1);
  let it = a.itensPag().find((x) => x.TITULO_OMIE === '101');
  assert.deepEqual([it.SITUACAO, it.VALOR_PAGO], ['APROVADO', 400], 'parcial: continua aprovado para o restante');
  a.saldo = 600;
  b = baixa(a, 'wanessa', 101, 600.01);
  assert.equal(b.ok, false); assert.match(b.mensagem, /passa do valor aprovado para pagar \(R\$ 600,00/);
  b = baixa(a, 'wanessa', 101, 600);
  assert.equal(b.ok, true, b.mensagem);
  assert.equal(a.F('OmieOps_apiConfirmar', 'wanessa', { token: b.token }).ok, true);
  it = a.itensPag().find((x) => x.TITULO_OMIE === '101');
  assert.deepEqual([it.SITUACAO, it.VALOR_PAGO, it.PAGO_POR_NOME], ['PAGO', 1000, 'WANESSA FINANCEIRO TESTE']);
  // pago: nova baixa do mesmo título volta a exigir a lista
  assert.match(baixa(a, 'wanessa', 101, 10).mensagem, /ainda não passou pela lista/);
  // a trilha das operações registra as baixas como sempre
  assert.equal(a.trilha().filter((l) => l.ACAO === 'BAIXA' && l.TIPO === 'pagar' && l.RESULTADO === 'OK').length, 2);
});

test('B1-4: recusar e adiar item por item, com motivo; adiado não volta antes da data; quem enviou não decide; retirar com motivo', () => {
  const a = montarB1C3();
  assert.equal(a.F('OmiePag_apiEnviar', 'wanessa', { titulos: [101, 102, 105] }).ok, true);
  const id = (t) => a.itensPag().find((x) => x.TITULO_OMIE === t && x.SITUACAO === 'AGUARDANDO').ID;
  let d = a.F('OmiePag_apiDecidir', 'dora', { decisao: 'recusar', itens: [id('102')], motivo: 'curto' });
  assert.equal(d.ok, false); assert.match(d.mensagem, /pelo menos 10 letras[\s\S]*Nada foi alterado/);
  d = a.F('OmiePag_apiDecidir', 'dora', { decisao: 'recusar', itens: [id('102')], motivo: 'valor diferente do contrato, confirmar com o fornecedor' });
  assert.equal(d.ok, true, d.mensagem);
  d = a.F('OmiePag_apiDecidir', 'admin', { decisao: 'adiar', itens: [id('105')], motivo: 'pagar depois da entrada do cliente', adiarPara: '2026-11-16' });
  assert.equal(d.ok, false); assert.match(d.mensagem, /uma data depois de hoje/);
  d = a.F('OmiePag_apiDecidir', 'admin', { decisao: 'adiar', itens: [id('105')], motivo: 'pagar depois da entrada do cliente', adiarPara: '2026-11-20' });
  assert.equal(d.ok, true, d.mensagem);
  // "Aprovar todos" aprova só o que sobrou
  d = a.F('OmiePag_apiDecidir', 'dora', { decisao: 'aprovar_todos' });
  assert.equal(d.ok, true); assert.equal(d.decididos, 1);
  assert.deepEqual(a.itensPag().map((x) => [x.TITULO_OMIE, x.SITUACAO]), [['101', 'APROVADO'], ['102', 'RECUSADO'], ['105', 'ADIADO']]);
  // a trava mostra a recusa e o adiamento
  let b = baixa(a, 'wanessa', 102, 2500.5);
  assert.equal(b.ok, false); assert.match(b.mensagem, /foi recusado: Recusado por DORA DIRETORA TESTE em 16\/11\/2026 10:00: valor diferente do contrato/);
  b = baixa(a, 'wanessa', 105, 45.9);
  assert.equal(b.ok, false); assert.match(b.mensagem, /foi adiado: Adiado por DONO DO SISTEMA TESTE[\s\S]*para 20\/11\/2026[\s\S]*A partir de 20\/11\/2026/);
  // adiado não pode ser reenviado antes da data; recusado pode (com nova decisão)
  let e = a.F('OmiePag_apiEnviar', 'wanessa', { titulos: [105] });
  assert.equal(e.ok, false); assert.match(e.mensagem, /foi adiado para 20\/11\/2026/);
  e = a.F('OmiePag_apiEnviar', 'wanessa', { titulos: [102] });
  assert.equal(e.ok, true, e.mensagem);
  // na data, o adiado volta a poder ser enviado
  a.em('2026-11-20T09:00:00-03:00'); a.limparCache();
  const tela = a.F('OmiePag_apiTela', 'wanessa');
  assert.equal(tela.candidatos.find((c) => c.id === 105).podeEnviar, true);
  // quem enviou não decide: o dono envia, só a Diretoria aprova
  assert.equal(a.F('OmiePag_apiEnviar', 'admin', { titulos: [105] }).ok, true);
  const doDono = a.itensPag().find((x) => x.TITULO_OMIE === '105' && x.SITUACAO === 'AGUARDANDO');
  d = a.F('OmiePag_apiDecidir', 'admin', { decisao: 'aprovar', itens: [doDono.ID] });
  assert.equal(d.ok, false); assert.match(d.mensagem, /Quem enviou o item não decide o próprio envio/);
  d = a.F('OmiePag_apiDecidir', 'admin', { decisao: 'aprovar_todos' });
  assert.equal(d.ok, true); assert.equal(d.decididos, 1, 'o dono aprova só o 102, enviado pela Wanessa');
  assert.equal(a.itensPag().find((x) => x.ID === doDono.ID).SITUACAO, 'AGUARDANDO');
  assert.equal(a.F('OmiePag_apiDecidir', 'dora', { decisao: 'aprovar', itens: [doDono.ID] }).ok, true);
  // retirar: com motivo; o aprovado retirado volta a travar a baixa
  const ap = a.itensPag().find((x) => x.TITULO_OMIE === '101');
  let rt = a.F('OmiePag_apiRetirar', 'wanessa', { item: ap.ID, motivo: 'x' });
  assert.equal(rt.ok, false); assert.match(rt.mensagem, /pelo menos 10 letras/);
  rt = a.F('OmiePag_apiRetirar', 'wanessa', { item: ap.ID, motivo: 'fornecedor mandou boleto novo com outro valor' });
  assert.equal(rt.ok, true, rt.mensagem);
  a.limparCache();
  assert.match(baixa(a, 'wanessa', 101, 1000).mensagem, /ainda não passou pela lista/);
});

test('B1-5: a aprovação é conferida de novo na confirmação: retirado depois da prévia, nada é enviado ao Omie', () => {
  const a = montarB1C3();
  listaAprovada(a, [101], 'dora');
  const b = baixa(a, 'wanessa', 101, 1000);
  assert.equal(b.ok, true, b.mensagem);
  assert.equal(a.F('OmiePag_apiRetirar', 'wanessa', { item: a.itensPag()[0].ID, motivo: 'boleto cancelado pelo fornecedor' }).ok, true);
  const c = a.F('OmieOps_apiConfirmar', 'wanessa', { token: b.token });
  assert.equal(c.ok, false); assert.match(c.mensagem, /ainda não passou pela lista de aprovação/);
  assert.equal(pagamentos(a).length, 0);
});

test('B1-6: dispensa por valor: vazia por padrão (decisão do dono); informada em Chaves, libera só abaixo do valor; validação do campo', () => {
  const a = montarB1C3();
  const chave = vm.runInContext("typeof CHV_ITENS !== 'undefined' ? CHV_ITENS.filter(function (c) { return c.chave === 'FIN_PAG_DISPENSA_ABAIXO'; })[0] : null", a.ctx);
  assert.ok(chave, 'a chave existe em Chaves e senhas > Regras do Financeiro');
  assert.equal(chave.grupo, 'Regras do Financeiro'); assert.match(chave.ajuda, /Sem valor \(padrão, decisão do dono\) = nenhuma dispensa/);
  assert.equal(a.props.FIN_PAG_DISPENSA_ABAIXO, undefined, 'nenhum valor inventado');
  assert.match(baixa(a, 'wanessa', 101, 45.9).mensagem, /ainda não passou pela lista/);
  a.props.FIN_PAG_DISPENSA_ABAIXO = '100.00';
  // o título 101 (R$ 1.000,00) continua exigindo a lista; um título abaixo de R$ 100,00 é liberado
  assert.match(baixa(a, 'wanessa', 101, 45.9).mensagem, /ainda não passou pela lista[\s\S]*exceto títulos abaixo de R\$ 100,00/);
  a.titulo = Object.assign({}, a.titulo, { valor_documento: 45.9 }); a.saldo = 45.9; a.limparCache();
  const b = baixa(a, 'wanessa', 101, 45.9);
  assert.equal(b.ok, true, b.mensagem);
  assert.match(b.resumo.map((x) => x.join(': ')).join('\n'), /Aprovação do pagamento: Dispensada: o valor do título \(R\$ 45,90\) está abaixo de R\$ 100,00/);
  const tela = a.F('OmiePag_apiTela', 'wanessa');
  assert.equal(tela.dispensa, 'R$ 100,00');
  assert.deepEqual([tela.candidatos.find((c) => c.id === 105).dispensado, tela.candidatos.find((c) => c.id === 105).podeEnviar], [true, false]);
  // validação em Chaves: valor em reais maior que zero, gravado com duas casas
  const validar = (v) => vm.runInContext('(function () { try { return Chaves_validarValor_(Chaves_item_("FIN_PAG_DISPENSA_ABAIXO"), ' + JSON.stringify(v) + '); } catch (e) { return "ERRO: " + e.message; } })()', a.ctx);
  assert.equal(validar('1.250,00'), '1250.00');
  assert.match(validar('0'), /^ERRO: Não foi possível gravar: informe o valor em reais, maior que zero[\s\S]*Apagar/);
  assert.match(validar('abc'), /^ERRO: /);
});

test('B1-7: lista enviada fora do expediente: o aviso espera a rodada do expediente; a rodada não repete o aviso', () => {
  const a = montarB1C3({ expediente: false });
  const e = a.F('OmiePag_apiEnviar', 'wanessa', { titulos: [101] });
  assert.equal(e.ok, true, e.mensagem); assert.match(e.mensagem, /aviso sai no início do próximo expediente/);
  assert.equal(a.avisos.length, 0);
  assert.match(vm.runInContext('Ges_rodada_.toString()', a.ctx), /if \(!ex\.dentro\)[\s\S]*FinPag_rodada_\(ex\)/);
  assert.deepEqual(a.j(a.ctx.FinPag_rodada_({ dentro: false })), { fora: 'fora do expediente' });
  a.expediente = true;
  const r = a.j(a.ctx.FinPag_rodada_({ dentro: true }));
  assert.equal(r.pagamentos.enviado, true); assert.equal(a.avisos.length, 1);
  a.j(a.ctx.FinPag_rodada_({ dentro: true }));
  assert.equal(a.avisos.length, 1, 'cada lista é avisada uma vez');
});
