// Comercial C3, revisão de 01/11/2026 (commit 92c80be): um teste por defeito encontrado. Código real num contexto isolado
// (tests/_comercial_ambiente.cjs), só dados de teste (nomes fictícios). Cobre: carga da C1 montada só sob demanda, o vendedor sem o
// cliente de outros vendedores nem os detalhes da cotação de fornecedor, o preço sugerido pela compra só para a gestão, regras do
// Orçamentista (sinônimos e erros de digitação), casamento de serviço do catálogo sem código da tabela, preços fora da curva em lote,
// cota da busca na internet e da IA, verificador da justificativa e a alimentação sem duplicar ao reabrir e cancelar.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ambiente, oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
function amb0(o) {
  const amb = ambiente(Object.assign({ tabelas: { qual_distancia_referencia: [{ ID: 'd1', DESTINO: 'Anápolis/GO', KM_TRECHO: 55 }, { ID: 'd2', DESTINO: 'Goiânia/GO', KM_TRECHO: 0 }] } }, o || {}));
  amb.ctx.CONDUTA_SHEETS = { DISTANCIA_REFERENCIA: 'qual_distancia_referencia' };
  amb.ctx.Conduta_obterParametros_ = () => ({ VALOR_INCENTIVO_MISSAO: 300, MISSAO_KM_MINIMO: 200 });
  const pv = ok(amb.api('s_dora', 'importarC1Previa'));
  ok(amb.api('s_dora', 'importarC1', { marca: pv.marca, escolhas: {} }));
  return amb;
}
const carregar = (amb) => ok(amb.api('s_dora', 'bancoCarregar', { marca: ok(amb.api('s_dora', 'bancoCargaPrevia')).marca }));
const prod = (amb, tab) => amb.tabelas.COM_PRODUTOS.find((p) => p.TABELA_CODIGO === 'C1:' + tab);
const regras = (amb, texto) => ok(amb.api('s_vera', 'orcamentista', { texto, semIA: true })).itens.map((i) => [i.codigo, Number(i.quantidade)]);

test('peso: a carga da C1 não é montada em toda execução (função sob demanda); prévia e gerador continuam valendo', () => {
  const amb = amb0();
  assert.equal(typeof amb.ctx.COM_BANCO_C1, 'undefined', 'sem a global de 3.053 linhas montada ao carregar o projeto');
  assert.equal(typeof amb.ctx.ComBP_dadosC1_, 'function');
  const pv = ok(amb.api('s_dora', 'bancoCargaPrevia'));
  assert.equal(pv.c1.total, 3053); assert.equal(pv.versao, 'C1-2026-11-01'); assert.equal(pv.semArquivoC1, false);
  // sem o arquivo: a prévia diz o que fazer (operador nunca no limbo) e traz só Compras
  const sem = amb0(); sem.ctx.ComBP_dadosC1_ = undefined;
  const pv2 = ok(sem.api('s_dora', 'bancoCargaPrevia'));
  assert.equal(pv2.c1.total, 0); assert.equal(pv2.semArquivoC1, true); assert.match(pv2.foraTxt[0], /não está nesta instalação.*Administrador/);
  const g = spawnSync(process.execPath, [path.join(__dirname, '../_tools/gerar_banco_c1.cjs'), '--conferir'], { encoding: 'utf8' });
  assert.equal(g.status, 0, g.stderr);
});

test('acesso: o vendedor não vê o cliente de propostas de outros vendedores nem do CRM, nem acha a linha pelo nome do cliente; vê os dele e as licitações', () => {
  const amb = amb0(); carregar(amb);
  const ac = prod(amb, 'QT_AUTOCLAVE_GRANDE');
  // proposta do Vito para o Hospital Teste Alfa, concluída (entra no banco em aberto)
  const { oportunidade } = oportunidadeDeTeste(amb, 's_vito');
  const id = ok(amb.api('s_vito', 'novaProposta', { oportunidadeId: oportunidade.id })).proposta.id;
  ok(amb.api('s_vito', 'salvarProposta', { id, deslocamento: SEM_VIAGEM, itens: [{ produtoId: ac.ID, descricao: ac.NOME, quantidade: 1, precoUnitario: '3.020,00' }], condicoes: { pagamento: 'Boleto em 28 dias', garantia: '90 dias' } }));
  ok(amb.api('s_vito', 'concluirProposta', { id }));
  const item = ok(amb.api('s_vera', 'bancoItem', { itemChave: 'C1:QT_AUTOCLAVE_GRANDE' }));
  const doVito = item.linhas.find((l) => l.refRotulo === '' && l.origem === 'PROPOSTA_METROLABS' && l.registradoPor === 'VITO VENDEDOR TESTE');
  assert.ok(doVito, 'a linha da proposta do Vito aparece, com o valor');
  assert.equal(doVito.cliente, ''); assert.equal(doVito.clienteOculto, true); assert.equal(doVito.valor, 3020);
  assert.ok(item.linhas.filter((l) => l.origem === 'CRM').every((l) => l.cliente === ''), 'CRM antigo sem cliente para o vendedor');
  assert.ok(item.linhas.some((l) => l.origem === 'LICITACAO' && l.cliente), 'órgão público aparece');
  assert.doesNotMatch(JSON.stringify(item), /HOSPITAL TESTE ALFA|Hospital Teste Alfa/, 'o nome não vai na resposta da API');
  assert.equal(ok(amb.api('s_vera', 'bancoPrecos', { busca: 'Hospital Teste Alfa' })).encontradas, 0, 'busca pelo cliente escondido não acha');
  // o Vito vê o cliente da própria proposta; a gestão vê tudo
  assert.ok(ok(amb.api('s_vito', 'bancoItem', { itemChave: 'C1:QT_AUTOCLAVE_GRANDE' })).linhas.some((l) => /Hospital Teste Alfa|HOSPITAL TESTE ALFA/.test(l.cliente)));
  assert.ok(ok(amb.api('s_gaspar', 'bancoPrecos', { busca: 'Hospital Teste Alfa' })).encontradas >= 1);
});

test('acesso: cotação de fornecedor para o vendedor sem valor, fornecedor, marca nem a requisição de Compras (na lista e na busca)', () => {
  const amb = amb0({ tabelas: {
    CMP_REQUISICOES: [{ ID: 'rq1', NUMERO: 'REQ-0007' }],
    CMP_ITENS: [{ ID: 'it1', REQUISICAO_ID: 'rq1', DESCRICAO: 'Sensor PT100 classe A', UNIDADE: 'un', QUANTIDADE: 2, MARCA: 'MARCA TESTE' }],
    CMP_COTACOES: [{ ID: 'ct1', REQUISICAO_ID: 'rq1', FORNECEDOR_NOME: 'FORNECEDOR TESTE LTDA', REFERENCIA: 'ORC-99', PRECOS_JSON: JSON.stringify([{ itemId: 'it1', precoUnitario: 123.45 }]), CRIADO_EM: '2026-10-10T10:00:00-03:00' }]
  } });
  carregar(amb);
  const r = ok(amb.api('s_vera', 'bancoPrecos', { busca: 'PT100' }));
  const l = r.linhas.find((x) => x.origem === 'COTACAO_FORNECEDOR');
  assert.ok(l); assert.equal(l.valor, null); assert.equal(l.fornecedor, ''); assert.equal(l.marca, '');
  assert.doesNotMatch(JSON.stringify(r), /FORNECEDOR TESTE|MARCA TESTE|REQ-0007|ORC-99|123[.,]45/, 'nada da compra na resposta do vendedor');
  assert.equal(ok(amb.api('s_vera', 'bancoPrecos', { busca: 'FORNECEDOR TESTE' })).encontradas, 0, 'não acha pelo fornecedor');
  const g = ok(amb.api('s_gaspar', 'bancoPrecos', { busca: 'FORNECEDOR TESTE' }));
  assert.equal(g.encontradas, 1); assert.equal(g.linhas[0].valor, 123.45); assert.equal(g.linhas[0].fornecedor, 'FORNECEDOR TESTE LTDA');
});

test('acesso: o preço sugerido pela última compra (custo ÷ 0,7) é só da gestão; o vendedor vê o preço de venda praticado', () => {
  const amb = amb0({ tabelas: {
    CMP_REQUISICOES: [{ ID: 'rq1', NUMERO: 'REQ-0001' }],
    CMP_ITENS: [{ ID: 'it1', REQUISICAO_ID: 'rq1', DESCRICAO: 'Integrador químico classe 5', UNIDADE: 'un', QUANTIDADE: 100 }],
    CMP_COTACOES: [{ ID: 'ct1', REQUISICAO_ID: 'rq1', FORNECEDOR_NOME: 'FORNECEDOR TESTE', PRECOS_JSON: JSON.stringify([{ itemId: 'it1', precoUnitario: 7 }]), CRIADO_EM: '2026-10-10T10:00:00-03:00' }]
  } });
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'PRD-INT5', nome: 'Integrador químico classe 5', tipo: 'PRODUTO', preco: '9,00', custo: '7,00' }));
  carregar(amb);
  ok(amb.api('s_vera', 'bancoRegistrar', { origem: 'CONCORRENTE', concorrente: 'CONCORRENTE TESTE', tipo: 'PRODUTO', descricao: 'Integrador químico classe 5', valor: '11,00' }));
  const v = ok(amb.api('s_vera', 'orcamentista', { texto: 'integrador químico classe 5', semIA: true }));
  const iv = v.itens.find((i) => /Integrador/.test(i.nome));
  assert.ok(iv, 'achou o produto pelo nome');
  assert.equal(iv.precoSugeridoCompra, undefined);
  assert.doesNotMatch(JSON.stringify(v), /R\$\s?10,00/, 'o sugerido (7 ÷ 0,7 = 10) não vai ao vendedor');
  assert.ok(iv.riscos.some((x) => /conferir com a gestão/.test(x.texto) && !/R\$/.test(x.texto)), 'aviso sem número');
  const g = ok(amb.api('s_gaspar', 'orcamentista', { texto: 'integrador químico classe 5', semIA: true }));
  assert.equal(g.itens.find((i) => /Integrador/.test(i.nome)).precoSugeridoCompra, 10);
});

test('Orçamentista por regras: "bombas" sozinho, erros de digitação, instrumento "da autoclave"/"de geladeira", statim, estufa de secagem, "(4 caixas)", balança 5 a 10 kg, formol', () => {
  const amb = amb0();
  assert.deepEqual(regras(amb, 'calibração de 10 monitores e 5 bombas em Goiânia'), [['CAL_MONITOR', 10], ['CAL_BOMBA_INFUSAO', 5]]);
  assert.deepEqual(regras(amb, 'manutenção da bomba de vácuo da autoclave'), [['MP_AUTOCLAVE_GRANDE', 1]], 'bomba de vácuo não é bomba de infusão');
  assert.deepEqual(regras(amb, 'prevenitva lavadora ultrasonica'), [['MP_LAVADORA_US', 1]]);
  assert.deepEqual(regras(amb, 'qualificaçao termica autoclav 250 litros'), [['QT_AUTOCLAVE_GRANDE', 1]]);
  assert.deepEqual(regras(amb, 'calibrção de 5 bombas de infusão'), [['CAL_BOMBA_INFUSAO', 5]]);
  assert.deepEqual(regras(amb, 'calibração de manômetro e válvula de segurança da autoclave'), [['CAL_MANOMETRO', 1], ['CAL_VALVULA_SEG', 1]]);
  assert.deepEqual(regras(amb, 'calibrar 12 termometros de geladeira'), [['CAL_TERMOMETRO', 12]]);
  assert.deepEqual(regras(amb, 'qualificação de autoclave statim'), [['QT_AUTOCLAVE_BANCADA', 1]]);
  assert.deepEqual(regras(amb, 'qualificação de estufa de secagem'), [['QT_SECADORA', 1]]);
  assert.deepEqual(regras(amb, 'qualificação térmica de caixas térmicas (4 caixas)'), [['QT_CAIXA_TERMICA', 4]]);
  assert.deepEqual(regras(amb, 'qualificação de autoclave 300 L'), [['QT_AUTOCLAVE_GRANDE', 1]], '300 L não é quantidade');
  assert.deepEqual(regras(amb, 'calibração de balança 5 a 10 kg'), [['CAL_BALANCA_PEQ', 1]]);
  assert.deepEqual(regras(amb, 'qualificação de autoclave de formol'), [['QT_AUTOCLAVE_BT', 1]], 'uma autoclave de baixa temperatura, não duas');
  assert.deepEqual(regras(amb, 'termo higrometro'), [['CAL_TERMOHIGROMETRO', 1]]);
  const inc = ok(amb.api('s_vera', 'orcamentista', { texto: 'calibração de incubadora', semIA: true }));
  assert.ok(inc.itens[0].riscos.some((x) => /tipo da incubadora não foi dito/.test(x.texto)));
  assert.deepEqual(regras(amb, 'calibração de 2 incubadoras de indicador biológico'), [['CAL_INCUBADORA_BIO', 2]]);
  // a correção não inventa: cidade e palavra comum ficam como estão
  assert.equal(amb.ctx.ComO_corrigir_('anapolis urgente cliente goiania'), 'anapolis urgente cliente goiania');
});

test('casamento: serviço do catálogo sem código da tabela (vindo do CRM) casa pelo nome só quando é claro; a proposta entra no grupo da tabela', () => {
  const amb = amb0();
  const c = amb.ctx;
  const p = (NOME) => ({ ID: 'x', CODIGO: 'CRM-TESTE', NOME, TIPO: 'SERVICO' });
  assert.equal(c.ComBP_c1DoProduto_(p('Manutenção preventiva em autoclave hospitalar')), 'MP_AUTOCLAVE_GRANDE');
  assert.equal(c.ComBP_c1DoProduto_(p('Qualificação de (QI, QO e QD) em uma Autoclave Hospitalar')), 'QT_AUTOCLAVE_GRANDE');
  assert.equal(c.ComBP_c1DoProduto_(p('Qualificação em lavadora-desinfetadora (QI, QO, QD) - Calibração rastreável (RBC) da instrumentação')), 'QT_LAVADORA_TD');
  assert.equal(c.ComBP_c1DoProduto_(p('Calibração Rastreável (RBC) De Balanca ( 5 a 10 KG)')), 'CAL_BALANCA_PEQ');
  assert.equal(c.ComBP_c1DoProduto_(p('REPARO ESTRUTURAL COM SOLDA NA CÂMARA INTERNA DE AUTOCLAVE')), '', 'reparo fica pela descrição');
  assert.equal(c.ComBP_c1DoProduto_(p('MANUTENÇÃO CORRETIVA + MÃO DE OBRA (cuba ultrassônica)')), '', 'corretiva não é preventiva');
  assert.equal(c.ComBP_c1DoProduto_(p('Termo-Higrômetro digital com calibração')), '', 'venda do instrumento, não o serviço');
  assert.equal(c.ComBP_c1DoProduto_(p('Calibração de incubadora')), '', 'tipo da incubadora em dúvida');
  assert.equal(c.ComBP_c1DoProduto_({ NOME: 'Manutenção preventiva em autoclave hospitalar', TIPO: 'PRODUTO' }), '', 'produto não casa');
  // a proposta com esse item vai para o grupo C1:MP_AUTOCLAVE_GRANDE (o histórico do CRM e das licitações fica junto)
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'CRM-MPAC', nome: 'Manutenção preventiva em autoclave hospitalar', tipo: 'SERVICO', preco: '900,00' }));
  const it = amb.tabelas.COM_PRODUTOS.find((x) => x.CODIGO === 'CRM-MPAC');
  const { oportunidade } = oportunidadeDeTeste(amb, 's_vera');
  const id = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id })).proposta.id;
  ok(amb.api('s_vera', 'salvarProposta', { id, deslocamento: SEM_VIAGEM, itens: [{ produtoId: it.ID, descricao: it.NOME, quantidade: 1, precoUnitario: '900,00' }], condicoes: { pagamento: 'Boleto em 28 dias', garantia: '90 dias' } }));
  ok(amb.api('s_vera', 'concluirProposta', { id }));
  assert.equal(amb.tabelas.COM_PRECOS.find((r) => r.REF_ID === id).ITEM_CHAVE, 'C1:MP_AUTOCLAVE_GRANDE');
});

test('dados: preços fora da curva (autoclave a R$ 4,50) propostos à gestão, tirados das contas em lote com prévia e motivo, sem apagar', () => {
  const amb = amb0(); carregar(amb);
  const total = amb.tabelas.COM_PRECOS.length;
  assert.match(amb.api('s_vera', 'bancoForaDaCurva').message, /ação é da gestão comercial/);
  const pv = ok(amb.api('s_gaspar', 'bancoForaDaCurva'));
  assert.ok(pv.total > 20 && pv.total < 200, 'dezenas, não centenas: ' + pv.total);
  const x = pv.linhas.find((l) => l.itemChave === 'C1:QT_AUTOCLAVE_GRANDE' && l.valor === 4.5);
  assert.ok(x, 'a autoclave a R$ 4,50 está na lista'); assert.match(x.leitura, /muito abaixo/); assert.match(x.referenciaTxt, /tabela C1/);
  assert.equal(pv.linhas.filter((l) => /COTACAO/.test(l.origemNome)).length, 0);
  assert.match(amb.api('s_gaspar', 'bancoDesconsiderarLote', { ids: [x.id], motivo: 'curto', marca: pv.marca }).message, /escreva o motivo/);
  assert.match(amb.api('s_gaspar', 'bancoDesconsiderarLote', { ids: [x.id], motivo: 'Valor lido errado na proposta antiga', marca: 'velha' }).message, /mudou desde a prévia/);
  const naoEsta = amb.tabelas.COM_PRECOS.find((r) => r.ITEM_CHAVE === 'C1:QT_AUTOCLAVE_GRANDE' && Number(r.VALOR_UNITARIO) === 3020) || amb.tabelas.COM_PRECOS.find((r) => r.ITEM_CHAVE === 'C1:QT_AUTOCLAVE_GRANDE' && Number(r.VALOR_UNITARIO) > 2000);
  const r = ok(amb.api('s_gaspar', 'bancoDesconsiderarLote', { ids: [x.id, naoEsta.ID], motivo: 'Valor lido errado na proposta antiga do Drive', marca: pv.marca }));
  assert.equal(r.feitos, 1, 'só o que estava na prévia');
  assert.equal(amb.tabelas.COM_PRECOS.length, total, 'nada apagado');
  const linha = amb.tabelas.COM_PRECOS.find((l) => l.ID === x.id);
  assert.equal(linha.SITUACAO, 'DESCONSIDERADO'); assert.match(linha.SITUACAO_MOTIVO, /proposta antiga do Drive.*GASPAR.*fora da curva/);
  assert.notEqual(naoEsta.SITUACAO, 'DESCONSIDERADO');
  const item = ok(amb.api('s_gaspar', 'bancoItem', { itemChave: 'C1:QT_AUTOCLAVE_GRANDE' }));
  assert.ok(item.geral.min > 4.5, 'o mínimo ignora a linha tirada das contas');
  assert.ok(item.linhas.some((l) => l.id === x.id && l.valida === false), 'continua no item, marcada');
  assert.ok(!ok(amb.api('s_gaspar', 'bancoForaDaCurva')).linhas.some((l) => l.id === x.id));
  ok(amb.api('s_gaspar', 'bancoDesconsiderar', { id: x.id, desconsiderar: false }));
  assert.equal(amb.tabelas.COM_PRECOS.find((l) => l.ID === x.id).SITUACAO, '');
});

test('busca na internet: a mesma busca não chama a IA de novo; mais de 10 por hora por pessoa é recusada sem chamar', () => {
  const amb = amb0();
  amb.props.COM_BUSCA_WEB = '1'; amb.props.GEMINI_API_KEY = 'chave-de-teste';
  let chamadas = 0;
  amb.ctx.UrlFetchApp = { fetch: () => { chamadas++; return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ resultados: [{ titulo: 'Ata', url: 'https://pncp.gov.br/x/1', valor: 100, data: '2026-05-10' }] }) }] }, groundingMetadata: { webSearchQueries: ['q'] } }] }) }; } };
  const a = ok(amb.api('s_vera', 'bancoBuscarInternet', { descricao: 'calibração de termômetro' }));
  const b = ok(amb.api('s_vera', 'bancoBuscarInternet', { descricao: 'Calibração de termômetro' }));
  assert.equal(chamadas, 1); assert.equal(b.repetida, true); assert.equal(b.token, a.token); assert.equal(b.resultados.length, 1);
  ok(amb.api('s_vera', 'bancoConfirmarInternet', { token: b.token, indice: 0 }));
  for (let i = 2; i <= 10; i++) ok(amb.api('s_vera', 'bancoBuscarInternet', { descricao: 'item de teste número ' + i }));
  assert.equal(chamadas, 10);
  const lim = ok(amb.api('s_vera', 'bancoBuscarInternet', { descricao: 'mais um item de teste' }));
  assert.equal(chamadas, 10, 'a 11ª não chama'); assert.equal(lim.limite, true); assert.match(lim.message, /10 buscas.*próxima hora.*Nada travou/);
  ok(amb.api('s_vito', 'bancoBuscarInternet', { descricao: 'mais um item de teste' }));
  assert.equal(chamadas, 11, 'o limite é por pessoa');
});

test('IA: justificativa com prazo, parcela ou desconto inventados é recusada; mais de 20 análises por hora vão só pelas regras, sem chamar a IA', () => {
  const resp = (fr) => (prompt) => /TAREFA: interpretar/.test(prompt) ? JSON.stringify({ itens: [{ codigo: 'QT_AUTOCLAVE_GRANDE', quantidade: 1 }], faixa: 'NORMAL' }) : JSON.stringify({ justificativa: fr });
  for (const fr of ['Ofereça 15 dias de prazo para fechar.', 'Divida em 3 parcelas.', 'Dê 10% de desconto.']) {
    const amb = amb0({ ia: resp(fr) });
    const r = ok(amb.api('s_vera', 'orcamentista', { texto: 'qualificação da autoclave' }));
    assert.equal(r.justificativaOrigem, 'REGRAS', fr); assert.match(r.avisos.join(' '), /recusada pelo verificador/);
  }
  const amb = amb0({ ia: resp('Uma qualificação de autoclave pela tabela, a R$ 3.020,00, no prazo normal.') });
  assert.equal(ok(amb.api('s_vera', 'orcamentista', { texto: 'qualificação da autoclave' })).justificativaOrigem, 'IA', 'com os números do sistema passa');
  for (let i = 0; i < 19; i++) ok(amb.api('s_vera', 'orcamentista', { texto: 'qualificação da autoclave' }));
  const n = amb.iaPrompts.length;
  const r = ok(amb.api('s_vera', 'orcamentista', { texto: 'qualificação da autoclave' }));
  assert.equal(amb.iaPrompts.length, n, 'a 21ª não chama a IA'); assert.equal(r.origem, 'REGRAS'); assert.match(r.avisos.join(' '), /20 análises com IA nesta hora/);
  assert.deepEqual(r.itens.map((i) => i.codigo), ['QT_AUTOCLAVE_GRANDE'], 'pelas regras, os mesmos itens');
});

test('alimentação: voltar ao rascunho e concluir de novo não duplica; ganha depois de enviada atualiza; cancelar marca, nada é apagado', () => {
  const amb = amb0();
  const ac = prod(amb, 'QT_AUTOCLAVE_GRANDE'), tm = prod(amb, 'CAL_TERMOMETRO');
  const { oportunidade } = oportunidadeDeTeste(amb, 's_vera');
  const id = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id })).proposta.id;
  const itens = [{ produtoId: ac.ID, descricao: ac.NOME, quantidade: 1, precoUnitario: '3.020,00' }, { produtoId: tm.ID, descricao: tm.NOME, quantidade: 5, precoUnitario: '70,00' }];
  const cond = { pagamento: 'Boleto em 28 dias', garantia: '90 dias' };
  ok(amb.api('s_vera', 'salvarProposta', { id, deslocamento: SEM_VIAGEM, itens, condicoes: cond }));
  ok(amb.api('s_vera', 'concluirProposta', { id }));
  const linhas = () => (amb.tabelas.COM_PRECOS || []).filter((r) => r.REF_ID === id);
  const validas = () => linhas().filter((r) => !['SUBSTITUIDO', 'CANCELADO', 'DESCONSIDERADO'].includes(String(r.SITUACAO || '').toUpperCase()));
  assert.equal(validas().length, 2);
  // volta para rascunho, inverte a ordem dos itens e conclui de novo
  ok(amb.api('s_vera', 'voltarRascunho', { id }));
  ok(amb.api('s_vera', 'salvarProposta', { id, deslocamento: SEM_VIAGEM, itens: [itens[1], itens[0]], condicoes: cond }));
  ok(amb.api('s_vera', 'concluirProposta', { id }));
  assert.equal(validas().length, 2, 'duas linhas nas contas, não quatro');
  assert.ok(linhas().every((r) => r.ID), 'as antigas ficam, marcadas');
  // enviada e aprovada: as mesmas linhas viram ganhas
  ok(amb.api('s_vera', 'gerarDocumento', { id }));
  ok(amb.api('s_vera', 'marcarEnviada', { id, como: 'Entregue em mãos na reunião com a CME' }));
  const antes = linhas().length;
  ok(amb.api('s_vera', 'respostaCliente', { id, resposta: 'APROVADA', texto: 'Aprovado por e-mail', data: '2026-10-19', arquivo: { nome: 'aceite.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF aceite').toString('base64') } }));
  assert.equal(linhas().length, antes, 'aprovar não cria linha nova');
  assert.ok(validas().every((r) => r.RESULTADO === 'GANHO'));
  // outra proposta, cancelada: as linhas em aberto ficam CANCELADO, sem apagar
  const o2 = oportunidadeDeTeste(amb, 's_vera').oportunidade;
  const id2 = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: o2.id })).proposta.id;
  ok(amb.api('s_vera', 'salvarProposta', { id: id2, deslocamento: SEM_VIAGEM, itens: [itens[0]], condicoes: cond }));
  ok(amb.api('s_vera', 'concluirProposta', { id: id2 }));
  const n2 = amb.tabelas.COM_PRECOS.length;
  ok(amb.api('s_vera', 'cancelarProposta', { id: id2, motivo: 'Cliente desistiu do serviço neste ano' }));
  assert.equal(amb.tabelas.COM_PRECOS.length, n2);
  assert.ok(amb.tabelas.COM_PRECOS.filter((r) => r.REF_ID === id2).every((r) => r.SITUACAO === 'CANCELADO'));
});

test('Voltar: sair do resultado do Orçamentista não pergunta "Descartar o que foi digitado?" (o pedido fica); sub-nível comum continua perguntando', () => {
  const fs = require('node:fs'), vm = require('node:vm');
  const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
  const fonte = fs.readFileSync(path.join(pasta, 'JS_Navegacao.html'), 'utf8').replace(/\r\n/g, '\n').replace(/^\s*<script>/, '').replace(/<\/script>\s*$/, '');
  const ctx = vm.createContext({ console, Date, Math, JSON, Object, Array, String, Number, RegExp, Error, Proxy, window: { __SGO_NAV_TESTE__: true } });
  vm.runInContext(fonte, ctx);
  const h = { entradas: [{ state: null, url: '/' }], i: 0, pendentes: [] };
  h.pushState = (st, _t, url) => { h.entradas.length = h.i + 1; h.entradas.push({ state: JSON.parse(JSON.stringify(st)), url }); h.i++; };
  h.replaceState = (st, _t, url) => { h.entradas[h.i] = { state: JSON.parse(JSON.stringify(st)), url }; };
  h.go = (n) => { const a = h.i + n; if (a >= 0 && a < h.entradas.length) h.pendentes.push(a); }; h.back = () => h.go(-1);
  Object.defineProperty(h, 'state', { get: () => h.entradas[h.i].state });
  const reg = { tela: 'mobile_home', confirmar: [] };
  const n = ctx.SGO_NAV_criarNucleo_({ history: h, urlBase: () => '/', abrirTela: (m) => { reg.tela = m; n.aoAbrir(m); }, telaAtual: () => reg.tela, telaInicial: () => 'mobile_home', usuario: () => 'u1',
    aviso() {}, confirmar: (t) => { reg.confirmar.push(t); return false; }, janelaAberta: () => false, janelaTrava: () => false, janelaSuja: () => false, fecharJanela: () => true, rotuloJanela: (e) => e, textoTrava: () => '',
    conteudoSujo: () => true, telaPermitida: () => true, hashTela: () => '', agora: () => 1000, agendar() {} });
  const voltar = () => { h.back(); while (h.pendentes.length) { h.i = h.pendentes.shift(); n.aoPop(h.entradas[h.i].state); } };
  n.iniciarSessao(); reg.tela = 'comercial_orcamentista'; n.aoAbrir('comercial_orcamentista');
  const feito = [];
  n.empilhar('Orçamentista: resultado', () => feito.push('resultado limpo'), { chave: 'cm-orc-res', mantemTexto: true });
  voltar();
  assert.deepEqual(feito, ['resultado limpo']); assert.equal(reg.confirmar.length, 0, 'não perguntou');
  assert.equal(reg.tela, 'comercial_orcamentista');
  n.empilhar('Outro', () => feito.push('outro'));
  voltar();
  assert.equal(reg.confirmar.length, 1, 'sub-nível comum com texto digitado pergunta'); assert.deepEqual(feito, ['resultado limpo']);
  const js = fs.readFileSync(path.join(pasta, 'JS_Comercial.html'), 'utf8');
  assert.match(js, /chave: "cm-orc-res", mantemTexto: true/);
});

test('tela: descrição das propostas antigas sem os símbolos de lista do Word (quadradinhos) na consulta e em Preços fora da curva', () => {
  const amb = amb0(); carregar(amb);
  const suja = amb.tabelas.COM_PRECOS.find((r) => /[-]/.test(String(r.DESCRICAO)));
  assert.ok(suja, 'a carga tem descrições com esses símbolos');
  const it = ok(amb.api('s_gaspar', 'bancoItem', { itemChave: suja.ITEM_CHAVE }));
  assert.ok(it.linhas.every((l) => !/[-]/.test(l.descricao)));
  assert.ok(ok(amb.api('s_gaspar', 'bancoForaDaCurva')).linhas.every((l) => !/[-]/.test(l.descricao)));
  assert.match(String(amb.tabelas.COM_PRECOS.find((r) => r.ID === suja.ID).DESCRICAO), /[-]/, 'o dado gravado não muda');
});
