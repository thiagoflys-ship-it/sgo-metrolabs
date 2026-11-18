// Pendências da onda 1 do Financeiro (18/11/2026), fora da onda A: lançamento avulso na conta corrente (IncluirLancCC: tarifa,
// rendimento, aporte, transferência entre contas) e parcelamento no novo lançamento (N títulos com REF-1..N e numero_parcela 001/00N).
// Especificação: ESPEC_FINANCEIRO.md, seção 1.3 e itens 7 e 10 da seção 6. Mesmo caminho das outras gravações: prévia, confirmação,
// trava de envio repetido, envios a conferir e a trilha FIN_OMIE_OPERACOES. Código REAL do SGO+ com o OMIE SIMULADO; nada sai para a rede.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { montarB1C3 } = require('./_financeiro_b1c3.cjs');

const avulso = (a, dados, login) => a.F('OmieOps_apiPrevia', login || 'wanessa', { acao: 'avulso', tipo: 'cc', dados: Object.assign({ tipoLanc: 'SAIDA', contaId: 5, data: '2026-11-16', valor: '35,90', categoria: '2.03', referencia: 'LCC-20261116-AB12', observacao: 'tarifa do pacote de serviços' }, dados || {}) });
const parcelado = (a, dados, login) => a.F('OmieOps_apiPrevia', login || 'wanessa', { acao: 'criar', tipo: 'pagar', dados: Object.assign({ pessoaId: 90, categoria: '2.10', contaId: 5, vencimento: '2026-12-31', valor: '1000', documento: 'NF-9', referencia: 'REF-9', parcelas: 3, intervalo: 'MENSAL' }, dados || {}) });
const texto = (p) => p.resumo.map((x) => x.join(': ')).join('\n');
const FALHA_CLIENTE = { faultstring: 'ERROR: Categoria inválida para a parcela', faultcode: 'SOAP-ENV:Client-102' };

test('CC-1: saída da conta (tarifa): prévia com o efeito e o "a confirmar"; categoria conferida; IncluirLancCC com cabeçalho e detalhes; trilha', () => {
  const a = montarB1C3();
  // categoria de receita numa saída: recusa
  let p = avulso(a, { categoria: '1.01' });
  assert.equal(p.ok, false); assert.match(p.mensagem, /não é de despesa[\s\S]*Nada foi preparado/);
  assert.match(avulso(a, { referencia: 'x' }).mensagem, /referência única do lançamento \(de 4 a 20/);
  assert.match(avulso(a, { tipoLanc: 'OUTRO' }).mensagem, /Escolha o tipo do lançamento/);
  p = avulso(a);
  assert.equal(p.ok, true, p.mensagem);
  const t = texto(p);
  assert.match(t, /Tipo: Saída da conta \(tarifa, juros, IOF\)/); assert.match(t, /Valor: R\$ 35,90/); assert.match(t, /Categoria: Combustível/);
  assert.match(t, /Efeito: R\$ 35,90 saem da conta "Banco simulado" no Omie\. Não movimenta o banco/);
  assert.match(t, /A confirmar: A confirmar na 1ª operação acompanhada: o SGO\+ envia o valor positivo e o Omie decide saída ou entrada pela categoria/);
  assert.equal(a.escritas().length, 0, 'a prévia não grava');
  // gravação desligada: nada vai ao Omie
  delete a.props.OMIE_GRAVACAO_LIGADA;
  let c = a.F('OmieOps_apiConfirmar', 'wanessa', { token: p.token });
  assert.equal(c.ok, false); assert.match(c.mensagem, /gravação pelo SGO\+ ainda está desligada/);
  a.props.OMIE_GRAVACAO_LIGADA = '1';
  c = a.F('OmieOps_apiConfirmar', 'wanessa', { token: p.token });
  assert.equal(c.ok, true, c.mensagem); assert.match(c.mensagem, /Lançamento avulso confirmado no Omie/);
  const env = a.escritas().filter((x) => x.call === 'IncluirLancCC');
  assert.equal(env.length, 1);
  assert.deepEqual(env[0].param, { cCodIntLanc: 'LCC-20261116-AB12', cabecalho: { nCodCC: 5, dDtLanc: '16/11/2026', nValorLanc: 35.9 }, detalhes: { cTipo: 'DEB', cNumDoc: '', cObs: 'tarifa do pacote de serviços', cCodCateg: '2.03' } });
  const l = a.trilha().slice(-1)[0];
  assert.deepEqual([l.ACAO, l.TIPO, l.CHAMADA, l.TITULO_OMIE, l.CODIGO_INTEGRACAO, l.VALOR, l.DATA, l.CONTA, l.RESULTADO], ['LANCAMENTO_CC', 'cc', 'IncluirLancCC', '5001', 'LCC-20261116-AB12', 35.9, '16/11/2026', '5', 'OK']);
  const tri = a.F('OmieTri_apiLista', 'wanessa', {});
  assert.equal(tri.itens[0].acaoNome, 'Lançamento avulso na conta corrente'); assert.equal(tri.itens[0].tipoNome, 'conta corrente');
  assert.equal(tri.itens[0].podeEstornar, false); assert.equal(tri.itens[0].podeExcluir, false);
  // o mesmo envio não sai de novo (24 horas)
  p = avulso(a);
  assert.equal(p.ok, false); assert.match(p.mensagem, /já foi enviada/);
  // não passa pela aprovação de pagamentos (não é baixa de conta a pagar) e exige a caixa de lançar
  assert.equal(a.itensPag().length, 0);
  assert.equal(avulso(a, { referencia: 'LCC-OUTRA-0001' }, 'dora').ok, true);
});

test('CC-2: entrada (rendimento) com categoria de receita; transferência com conta de destino, sem categoria ou com a de transferência', () => {
  const a = montarB1C3();
  let p = avulso(a, { tipoLanc: 'ENTRADA', categoria: '1.01', referencia: 'LCC-REND-0001', observacao: 'rendimento da aplicação' });
  assert.equal(p.ok, true, p.mensagem); assert.match(texto(p), /R\$ 35,90 entram na conta "Banco simulado"/);
  assert.match(avulso(a, { tipoLanc: 'ENTRADA', categoria: '2.03', referencia: 'LCC-REND-0002' }).mensagem, /não é de receita/);
  assert.match(avulso(a, { tipoLanc: 'TRANSFERENCIA', categoria: '', contaDestinoId: 5, referencia: 'LCC-TRF-0001' }).mensagem, /conta de destino é a mesma de origem/);
  assert.match(avulso(a, { tipoLanc: 'TRANSFERENCIA', categoria: '2.03', contaDestinoId: 6, referencia: 'LCC-TRF-0001' }).mensagem, /não é de transferência entre contas/);
  p = avulso(a, { tipoLanc: 'TRANSFERENCIA', categoria: '', contaDestinoId: 6, valor: '10.000,00', referencia: 'LCC-TRF-0001' });
  assert.equal(p.ok, true, p.mensagem);
  assert.match(texto(p), /Conta de destino: Banco simulado[\s\S]*Categoria: Sem categoria \(transferência\)[\s\S]*saem de "Banco simulado" e entram em "Banco simulado"[\s\S]*Na transferência, confira também se a entrada apareceu na conta de destino/);
  assert.equal(a.F('OmieOps_apiConfirmar', 'wanessa', { token: p.token }).ok, true);
  const env = a.escritas().filter((x) => x.call === 'IncluirLancCC').slice(-1)[0].param;
  assert.deepEqual([env.cabecalho.nValorLanc, env.transferencia, env.detalhes.cCodCateg, env.detalhes.cTipo], [10000, { nCodCCDestino: 6 }, undefined, 'TRA']);
  p = avulso(a, { tipoLanc: 'TRANSFERENCIA', categoria: '9.01', contaDestinoId: 6, referencia: 'LCC-TRF-0002' });
  assert.equal(p.ok, true, p.mensagem); assert.match(texto(p), /Categoria: Transferência/);
  // categorias oferecidas na tela por tipo
  const cs = a.F('OmieLcc_apiCategorias', 'wanessa', { tipoLanc: 'SAIDA' });
  assert.deepEqual(cs.itens.map((c) => c.id), ['2.03', '2.10']);
  assert.deepEqual(a.F('OmieLcc_apiCategorias', 'wanessa', { tipoLanc: 'ENTRADA' }).itens.map((c) => c.id), ['1.01']);
  assert.deepEqual(a.F('OmieLcc_apiCategorias', 'wanessa', { tipoLanc: 'TRANSFERENCIA' }).itens.map((c) => c.id), ['9.01']);
});

test('P-1: parcelamento: valor total dividido (o centavo vai na última), vencimento mensal ou em dias, REF-1..N e 001/00N; regras de recusa', () => {
  const a = montarB1C3();
  let p = parcelado(a);
  assert.equal(p.ok, true, p.mensagem);
  const t = texto(p);
  assert.match(t, /Valor total: R\$ 1\.000,00/);
  assert.match(t, /Parcela 001\/003: Vencimento 31\/12\/2026 · R\$ 333,33 · referência REF-9-1/);
  assert.match(t, /Parcela 002\/003: Vencimento 31\/01\/2027 · R\$ 333,33 · referência REF-9-2/);
  assert.match(t, /Parcela 003\/003: Vencimento 28\/02\/2027 · R\$ 333,34 · referência REF-9-3/);
  p = parcelado(a, { vencimento: '2026-12-10', intervalo: '15', parcelas: 4, valor: '100', referencia: 'REF-10', documento: 'NF-10' });
  assert.equal(p.ok, true, p.mensagem);
  assert.deepEqual(p.resumo.filter((x) => /^Parcela 0/.test(x[0])).map((x) => x[1].slice(11, 21)), ['10/12/2026', '25/12/2026', '09/01/2027', '24/01/2027']);
  assert.match(parcelado(a, { parcelas: 49 }).mensagem, /de 1 a 48/);
  assert.match(parcelado(a, { intervalo: '3' }).mensagem, /mensal ou de 7 a 90 dias/);
  assert.match(parcelado(a, { referencia: 'FIX-abc-202611' }).mensagem, /conta fixa não é parcelado por aqui/);
  assert.match(parcelado(a, { previsao: '2027-01-05' }).mensagem, /previsão financeira acompanha o vencimento de cada parcela/);
  assert.match(parcelado(a, { valor: '0.02' }).mensagem, /pequeno demais para 3 parcelas/);
  // 1 parcela: o lançamento de sempre, sem numero_parcela
  p = parcelado(a, { parcelas: 1, referencia: 'REF-11', documento: 'NF-11' });
  assert.equal(p.ok, true); assert.match(texto(p), /Valor do documento: R\$ 1\.000,00/); assert.ok(!/Parcela 0/.test(texto(p)));
  // a alçada vale pelo total do parcelamento
  a.props.OMIE_ALCADA_SEGUNDA_CONFIRMACAO = '900';
  p = parcelado(a, { referencia: 'REF-12', documento: 'NF-12' });
  assert.equal(p.ok, true); assert.equal(p.alcada.segunda, true, 'R$ 1.000,00 no total passa da alçada de R$ 900,00');
});

test('P-2: envio uma parcela por vez; recusa do Omie no meio não repete as já lançadas e continua da que falhou', () => {
  const a = montarB1C3();
  const p = parcelado(a);
  a.falharNa.IncluirContaPagar = { n: 2, erro: FALHA_CLIENTE };
  let c = a.F('OmieOps_apiConfirmar', 'wanessa', { token: p.token });
  assert.equal(c.ok, false);
  assert.match(c.mensagem, /O Omie recusou a operação: Categoria inválida para a parcela\. Já lançadas no Omie: 1 de 3 parcelas \(001\/003\); elas não serão repetidas\. Faltam 2, a partir da 002\/003/);
  const lanc = () => a.contasPagar.map((x) => x.numero_parcela);
  assert.deepEqual(lanc(), ['001/003']);
  // aparece em "Envios a conferir" como parcelamento pela metade
  let inc = a.F('OmieOps_apiIncertos', 'wanessa', {});
  assert.equal(inc.itens.length, 1); assert.equal(inc.itens[0].parcial, true);
  assert.match(inc.itens[0].descricao, /Novo lançamento · a pagar · documento NF-9 · parcelado em 3 \(1 já lançada\(s\)\) · faltam 2, a partir da 002\/003/);
  // nova prévia igual é barrada (as parcelas já lançadas não podem sair de novo)
  assert.match(parcelado(a).mensagem, /já foi enviada/);
  // continuar: só a 2 e a 3
  c = a.F('OmieOps_apiConfirmar', 'wanessa', { token: inc.itens[0].token });
  assert.equal(c.ok, true, c.mensagem); assert.match(c.mensagem, /3 parcelas lançadas no Omie \(001\/003 a 003\/003\)/);
  assert.deepEqual(lanc(), ['001/003', '002/003', '003/003']);
  assert.deepEqual(a.trilha().filter((l) => l.CHAMADA === 'IncluirContaPagar').map((l) => [l.DOCUMENTO, l.RESULTADO]),
    [['NF-9 parcela 001/003', 'OK'], ['NF-9 parcela 002/003', 'RECUSADO'], ['NF-9 parcela 002/003', 'OK'], ['NF-9 parcela 003/003', 'OK']]);
  assert.equal(a.F('OmieOps_apiIncertos', 'wanessa', {}).itens.length, 0);
});

test('P-3: sem resposta do Omie numa parcela: fica para conferir; "foi feito" continua da seguinte; "encerrar" fecha sem as que faltam', () => {
  const a = montarB1C3();
  let p = parcelado(a);
  a.falharNa.IncluirContaPagar = { n: 2, erro: 'transporte' };
  let c = a.F('OmieOps_apiConfirmar', 'wanessa', { token: p.token });
  assert.equal(c.ok, false); assert.match(c.mensagem, /O envio da parcela 002\/003 não foi confirmado pelo Omie[\s\S]*Já lançadas no Omie: 1 de 3[\s\S]*Nenhum reenvio automático/);
  let inc = a.F('OmieOps_apiIncertos', 'wanessa', {}).itens;
  assert.equal(inc.length, 1); assert.equal(inc[0].parcial, undefined);
  assert.match(inc[0].descricao, /parcelado em 3 \(1 já lançada\(s\); a 002\/003 ficou sem resposta\)/);
  // conferido no Omie: a 002 foi lançada; faltam a 003
  let rz = a.F('OmieOps_apiResolverIncerto', 'wanessa', { chave: inc[0].chave, desfecho: 'feito', motivo: 'a parcela 002 aparece no Omie' });
  assert.equal(rz.ok, true, rz.mensagem); assert.match(rz.mensagem, /foi feito no Omie[\s\S]*Faltam 1 parcela\(s\), a partir da 003\/003/);
  assert.equal(rz.itens.length, 1); assert.equal(rz.itens[0].parcial, true);
  c = a.F('OmieOps_apiConfirmar', 'wanessa', { token: rz.itens[0].token });
  assert.equal(c.ok, true, c.mensagem);
  assert.equal(a.escritas().filter((x) => x.call === 'IncluirContaPagar' && !x.falhou).length, 2, 'a 001 e a 003 (a 002 foi conferida como feita)');
  // encerrar sem as que faltam
  p = parcelado(a, { referencia: 'REF-20', documento: 'NF-20' });
  a.falharNa.IncluirContaPagar = { n: a.contagem.IncluirContaPagar + 2, erro: FALHA_CLIENTE };
  assert.equal(a.F('OmieOps_apiConfirmar', 'wanessa', { token: p.token }).ok, false);
  inc = a.F('OmieOps_apiIncertos', 'wanessa', {}).itens;
  assert.match(a.F('OmieOps_apiResolverIncerto', 'wanessa', { chave: inc[0].chave, desfecho: 'nao_feito', motivo: 'conferido no Omie' }).mensagem, /não está sem resposta[\s\S]*Continuar as parcelas[\s\S]*Encerrar/);
  rz = a.F('OmieOps_apiResolverIncerto', 'wanessa', { chave: inc[0].chave, desfecho: 'encerrar', motivo: 'lancei as parcelas 2 e 3 direto no Omie' });
  assert.equal(rz.ok, true, rz.mensagem); assert.match(rz.mensagem, /parcelamento encerrado\. As 2 parcela\(s\) que faltavam não serão enviadas pelo SGO\+/);
  assert.equal(rz.itens.length, 0);
  assert.ok(a.acessos().some((x) => x.CONSULTA === 'OmieOps_apiResolverIncerto' && /Parcelamento encerrado sem as parcelas que faltavam/.test(x.DETALHE)));
});

test('P-4: sem resposta logo na primeira parcela e "não foi feito": o envio é liberado como no lançamento simples', () => {
  const a = montarB1C3();
  const p = parcelado(a);
  a.falharNa.IncluirContaPagar = { n: 1, erro: 'transporte' };
  assert.match(a.F('OmieOps_apiConfirmar', 'wanessa', { token: p.token }).mensagem, /Nenhuma parcela anterior foi lançada/);
  const inc = a.F('OmieOps_apiIncertos', 'wanessa', {}).itens;
  const rz = a.F('OmieOps_apiResolverIncerto', 'wanessa', { chave: inc[0].chave, desfecho: 'nao_feito', motivo: 'nenhuma parcela aparece no Omie' });
  assert.equal(rz.ok, true, rz.mensagem); assert.match(rz.mensagem, /não foi feito no Omie\. Abra uma nova prévia/);
  const p2 = parcelado(a);
  assert.equal(p2.ok, true, p2.mensagem);
  assert.equal(a.F('OmieOps_apiConfirmar', 'wanessa', { token: p2.token }).ok, true);
  assert.equal(a.contasPagar.length, 3);
});
