// Catálogo oficial da Diretoria (01/11/2026): os 26 serviços com os preços do dono, a regra de pontos REG-CAL-001 em centavos
// exatos, termo-higrômetro por grandeza, preço fixo, qualificação por receita (pacote-base), parâmetros técnicos, cópia congelada
// na proposta, passagem do escopo para a execução, travas de quem muda o quê, implantação idempotente, descrições padronizadas e o
// filtro de suspeitos no reajuste. Código real num contexto isolado (tests/_comercial_ambiente.cjs). Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { ambiente, oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const prodCod = (amb, cod) => amb.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === cod);
const reg = (amb, id) => amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === id);
const itensDe = (amb, id) => JSON.parse(reg(amb, id).ITENS_JSON);

/** Ambiente com a C1 importada e o catálogo oficial implantado (pela função do servidor, como o script). */
function amb0(o) {
  const amb = ambiente(Object.assign({ tabelas: { qual_distancia_referencia: [{ ID: 'd1', DESTINO: 'Rio Verde/GO', KM_TRECHO: 228 }] } }, o || {}));
  amb.ctx.CONDUTA_SHEETS = { DISTANCIA_REFERENCIA: 'qual_distancia_referencia' };
  amb.ctx.Conduta_obterParametros_ = () => ({ VALOR_INCENTIVO_MISSAO: 300, MISSAO_KM_MINIMO: 200 });
  return amb;
}
function implantar(amb, comC1) {
  if (comC1 !== false) { const pv = ok(amb.api('s_dora', 'importarC1Previa')); ok(amb.api('s_dora', 'importarC1', { marca: pv.marca, escolhas: {} })); }
  const p = amb.ctx.Comercial_catalogoOficial20261101({ etapa: 'CATALOGO' });
  assert.equal(p.ok, true, p.message);
  const a = amb.ctx.Comercial_catalogoOficial20261101({ etapa: 'CATALOGO', aplicar: true, marca: p.marca });
  assert.equal(a.ok, true, a.message);
  return { previa: p, aplicado: a };
}
function proposta(amb, itens, extra) {
  const { oportunidade } = oportunidadeDeTeste(amb);
  const id = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id })).proposta.id;
  const s = amb.api('s_vera', 'salvarProposta', Object.assign({ id, escopo: 'Serviços de calibração e qualificação conforme os itens.', itens, deslocamento: SEM_VIAGEM, condicoes: { pagamento: 'Boleto em 28 dias', garantia: '90 dias' } }, extra || {}));
  return { id, salvo: s };
}
/** Item de serviço oficial com a escolha técnica (sel) e o preço em branco (vale a tabela pela regra). */
const it = (amb, cod, qtd, sel, preco) => Object.assign({ produtoId: prodCod(amb, cod).ID, descricao: prodCod(amb, cod).NOME, quantidade: qtd || 1, precoUnitario: preco === undefined ? '' : preco }, sel ? { catalogo: { sel } } : {});

// ---------------------------------------------------------------- núcleo (exemplos que o dono pediu)
test('REG-CAL-001 em centavos exatos: 1, 2, 3, 4º ponto e além; vários equipamentos; manovacuômetro com 4 pontos', () => {
  const amb = amb0();
  const C = amb.ctx.ComCatN_calcular, d = (cod) => amb.ctx.ComCat_defParaGravar_(amb.ctx.ComCat_defCodigo_(cod));
  const term = d('CAL-001');
  const pts = (n) => ['-10', '2', '8', '20', '30', '40', '50', '60', '70'].slice(0, n);
  const un = (n, q) => C(term, { variante: 'SONDA_EXTERNA', pontos: pts(n) }, q || 1, 7550);
  assert.equal(un(1).unitarioCentavos, 7550); assert.equal(un(2).unitarioCentavos, 7550); assert.equal(un(3).unitarioCentavos, 7550);
  assert.equal(un(4).unitarioCentavos, 10067, '4 pontos: 100,67');
  assert.equal(un(5).unitarioCentavos, 12583, '5 pontos: 125,83');
  assert.equal(un(6).unitarioCentavos, 15100); assert.equal(un(9).unitarioCentavos, 22650);
  assert.equal(un(3, 10).subtotalCentavos, 75500, '10 equipamentos com 3 pontos: 755,00');
  assert.equal(un(5, 10).subtotalCentavos, 125833, '10 equipamentos com 5 pontos: 1.258,33 (não 1.258,30)');
  assert.equal(un(1).cobrados, 3); assert.match(un(1).avisos.join(' '), /mínimo de 3 pontos/);
  // sensor interno: o ambiente é 1 ponto e cobra o mínimo
  assert.equal(C(term, { variante: 'SENSOR_INTERNO', pontos: ['ambiente'] }, 1, 7550).unitarioCentavos, 7550);
  const mv = C(d('CAL-005'), { pontos: ['-500 mmHg', '1', '2', '3'], unidade: 'bar' }, 1, 18012);
  assert.equal(mv.erros.length, 0, mv.erros.join()); assert.equal(mv.n, 4); assert.equal(mv.unitarioCentavos, 24016, 'manovacuômetro 4 pontos: 240,16');
  // ponto repetido conta uma vez
  assert.equal(C(term, { pontos: ['2', '2,0', '8'] }, 1, 7550).n, 2);
});

test('pressão: bar e kgf/cm² são pontos diferentes; mmHg só negativo; faixa nominal recusa ponto fora; vacuômetro só negativo; manômetro só positivo', () => {
  const amb = amb0();
  const C = amb.ctx.ComCatN_calcular, d = (cod) => amb.ctx.ComCat_defParaGravar_(amb.ctx.ComCat_defCodigo_(cod));
  const man = d('CAL-004');
  const r = C(man, { unidade: 'bar', pontos: ['1', '1 kgf/cm²', '2', '3'] }, 1, 15000);
  assert.equal(r.n, 4, '1 bar e 1 kgf/cm² não são o mesmo ponto'); assert.equal(r.unitarioCentavos, 20000);
  assert.ok(Math.abs(r.pontos[1].emBar - 0.980665) < 1e-9, '1 kgf/cm² = 0,980665 bar');
  assert.match(C(d('CAL-005'), { pontos: ['500 mmHg'] }, 1, 18012).erros.join(), /mmHg, unidade usada só para pressão negativa/);
  assert.match(C(man, { unidade: 'bar', pontos: ['1', '2', '12'], parametros: { faixaMin: '0', faixaMax: '10' } }, 1, 15000).erros.join(), /fora da faixa nominal do instrumento \(0 a 10 bar\)/);
  assert.equal(C(man, { unidade: 'kgf/cm²', pontos: ['1', '2', '10'], parametros: { faixaMin: '0', faixaMax: '10' } }, 1, 15000).erros.length, 0, '10 kgf/cm² dentro da faixa de 0 a 10 kgf/cm²');
  assert.match(C(d('CAL-006'), { unidade: 'mmHg', pontos: ['-200', '400 bar'] }, 1, 15009).erros.join(), /mede pressão negativa/);
  assert.match(C(man, { unidade: 'bar', pontos: ['-1'] }, 1, 15000).erros.join(), /manômetro mede pressão positiva/);
  // vacuômetro: padrão "a definir" (sugestão pendente, não pré-selecionada), cobra o mínimo de 3
  const vac = d('CAL-006'), padV = amb.ctx.ComCat_padrao_(vac);
  assert.deepEqual(Array.from(padV.pontos), []); assert.deepEqual(Array.from(vac.sugestao), ['-200 mmHg', '-400 mmHg', '-600 mmHg']);
  const rv = C(vac, padV, 1, 15009);
  assert.equal(rv.unitarioCentavos, 15009); assert.match(rv.pendencias.join(), /pendentes de definição/);
  assert.match(amb.ctx.ComCat_descricao_('Base.', vac, padV, rv), /Pontos a definir/);
  // centrífuga: 1.500 e 3.000 RPM pré-selecionados, terceiro ponto a definir; cobra 3
  const cen = d('CAL-011'), rc = C(cen, amb.ctx.ComCat_padrao_(cen), 1, 19423);
  assert.equal(rc.n, 2); assert.equal(rc.cobrados, 3); assert.equal(rc.unitarioCentavos, 19423); assert.match(rc.pendencias.join(), /2\.250 RPM é sugestão pendente/);
  const qc = amb.ctx.ComCat_padrao_(d('QUA-010')).processos;
  assert.deepEqual(qc.filter((p) => p.selecionado).map((p) => p.nome), ['1.500 RPM', '3.000 RPM']);
});

test('termo-higrômetro: temperatura e umidade são grandezas independentes (nunca somadas como pontos da mesma grandeza)', () => {
  const amb = amb0();
  const C = amb.ctx.ComCatN_calcular, th = amb.ctx.ComCat_defParaGravar_(amb.ctx.ComCat_defCodigo_('CAL-003'));
  assert.equal(C(th, amb.ctx.ComCat_padrao_(th), 1, 10742).unitarioCentavos, 10742, 'ambiente + UR ambiente = preço mínimo');
  assert.equal(C(th, { grandezas: { TEMPERATURA: ['15', '25'], UMIDADE: ['40', '60'] } }, 1, 10742).unitarioCentavos, 10742, '2 + 2 pontos: cada grandeza no próprio mínimo');
  const r = C(th, { grandezas: { TEMPERATURA: ['10', '20', '30', '40'], UMIDADE: ['ambiente'] } }, 1, 10742);
  assert.equal(r.extras, 1); assert.equal(r.unitarioCentavos, 14323, 'um ponto além de 3 na temperatura: 107,42 × 4/3 = 143,23');
  assert.match(C(th, { grandezas: { UMIDADE: ['50 bar'] } }, 1, 10742).erros.join(), /não serve para esta grandeza/);
});

// ---------------------------------------------------------------- implantação
test('implantação: cria os 26 com os preços do dono, desativa os repetidos da C1 com histórico (nunca apaga), freezer com parâmetros; reexecutar cria 0', () => {
  const amb = amb0();
  const legado = { ID: 'pLeg', CODIGO: 'CRM-ANTIGO', NOME: 'Item antigo do CRM', TIPO: 'PRODUTO', PRECO: 10, ATIVO: 'SIM', DESCRICAO: 'Peça antiga', CRIADO_EM: '2026-01-01' };
  amb.tabelas.COM_PRODUTOS = [Object.assign({}, legado)];
  const antesPropostas = JSON.stringify(amb.tabelas.COM_PROPOSTAS || []);
  assert.match(amb.api('s_gaspar', 'catalogoOficialImplantar', {}).message, /é da Diretoria/);
  const { previa, aplicado } = implantar(amb);
  assert.equal(previa.qtdCriar, 26); assert.equal(aplicado.criados, 26);
  const esperado = { 'CAL-001': 75.5, 'CAL-002': 75, 'CAL-003': 107.42, 'CAL-004': 150, 'CAL-005': 180.12, 'CAL-006': 150.09, 'CAL-007': 171.01, 'CAL-008': 95, 'CAL-009': 480.07, 'CAL-010': 580.93,
    'QUA-001': 4870, 'QUA-002': 4798, 'QUA-003': 1200, 'CAL-011': 194.23, 'QUA-004': 1865.46, 'QUA-005': 3500.75, 'QUA-006': 1845.96, 'QUA-007': 2976, 'QUA-008': 845.77, 'QUA-009': 590.86,
    'QUA-010': 200.67, 'NR13-001': 850, 'NR13-002': 735, 'NR13-003': 2933.33, 'QUA-011': 4865.88, 'QUA-012': 5450 };
  Object.keys(esperado).forEach((c) => { const p = prodCod(amb, c); assert.ok(p, c); assert.equal(p.PRECO, esperado[c], c); assert.equal(p.CATALOGO_OFICIAL, 'Tabela oficial da Diretoria'); assert.equal(p.CATALOGO_VERSAO, 'DIRETORIA-2026-11-01'); assert.equal(p.TIPO, 'SERVICO'); });
  assert.equal(prodCod(amb, 'QUA-011').NOME, 'Qualificação de esterilizador por peróxido de hidrogênio (H₂O₂)');
  assert.equal(prodCod(amb, 'QUA-012').NOME, 'Qualificação de esterilizador por formaldeído (VBTF)');
  assert.doesNotMatch(JSON.stringify(amb.tabelas.COM_PRODUTOS.filter((p) => p.CATALOGO_OFICIAL)), /Phoenix|Cristófoli|Sercon|Baumer|Stermax/i, 'nunca cita fabricante');
  // repetidos da C1: desativados com o motivo; os sem equivalente (data logger, freezer, eletromédicos) ficam ativos
  const desat = ['CAL-TERMOMETRO', 'CAL-TERMOHIGROMETRO', 'CAL-MANOMETRO', 'CAL-VALVULA-SEG', 'CAL-CENTRIFUGA', 'QT-AUTOCLAVE-GRANDE', 'QT-LAVADORA-TD', 'QT-SECADORA', 'QT-LAVADORA-US', 'QT-AUTOCLAVE-BANCADA', 'QT-CAMARA-CONSERVADORA', 'QT-ULTRAFREEZER', 'QT-ESTUFA'];
  assert.equal(aplicado.desativados, desat.length);
  desat.forEach((c) => {
    const p = prodCod(amb, c); assert.equal(p.ATIVO, 'NAO', c);
    const h = amb.tabelas.COM_HISTORICO.find((x) => x.ENTIDADE_ID === p.ID && x.TIPO === 'ARQUIVADO');
    assert.match(h.TEXTO, /substituído pelo catálogo oficial de 01\/11\/2026: (CAL|QUA)-\d{3}/);
  });
  ['CAL-DATALOGGER', 'QT-FREEZER', 'CAL-MONITOR', 'HORA-TECNICO'].forEach((c) => assert.notEqual(prodCod(amb, c).ATIVO, 'NAO', c + ' continua ativo'));
  const fz = prodCod(amb, 'QT-FREEZER');
  assert.equal(fz.REGRA_PRECO, 'RECEITA'); assert.deepEqual(JSON.parse(fz.PARAMETROS_JSON).processos.map((p) => p.nome), ['0 °C', '-10 °C']); assert.equal(fz.CATALOGO_OFICIAL, undefined, 'freezer não entra na tabela oficial');
  // integridade: nada apagado, item antigo intacto, propostas intactas
  assert.deepEqual(Object.assign({}, prodCod(amb, 'CRM-ANTIGO')), legado);
  assert.equal(JSON.stringify(amb.tabelas.COM_PROPOSTAS || []), antesPropostas);
  const total = amb.tabelas.COM_PRODUTOS.length;
  // reimplantação: 0 criados, nada desativado de novo
  const p2 = amb.ctx.Comercial_catalogoOficial20261101({ etapa: 'CATALOGO' });
  assert.equal(p2.qtdCriar, 0); assert.equal(p2.qtdDesativar, 0); assert.equal(p2.existem.length, 26);
  const a2 = amb.ctx.Comercial_catalogoOficial20261101({ etapa: 'CATALOGO', aplicar: true, marca: p2.marca });
  assert.equal(a2.criados, 0); assert.equal(amb.tabelas.COM_PRODUTOS.length, total);
  assert.equal(amb.ctx.Comercial_catalogoOficial20261101({ etapa: 'CATALOGO', aplicar: true, marca: 'velha' }).ok, false, 'aplicar exige a marca da prévia');
  // código usado por outro item: não cria por cima
  const amb2 = amb0(); amb2.tabelas.COM_PRODUTOS = [{ ID: 'x1', CODIGO: 'CAL-001', NOME: 'Outro item', PRECO: 1, ATIVO: 'SIM' }];
  const pc = amb2.ctx.Comercial_catalogoOficial20261101({ etapa: 'CATALOGO' });
  assert.equal(pc.conflitos.length, 1); assert.equal(pc.qtdCriar, 25);
});

test('sobra dos 26 pela ficha (só gestão e Diretoria): preço, custo, impostos GO, comissão, sobra R$ e %; o preço do dono não muda', () => {
  const amb = amb0(); implantar(amb);
  assert.match(amb.api('s_vera', 'catalogoOficial', {}).message, /é da gestão comercial/);
  assert.equal(amb.api('s_fabio', 'catalogoOficial', {}).ok, false, 'Financeiro não vê');
  const t = ok(amb.api('s_gaspar', 'catalogoOficial', {}));
  assert.equal(t.itens.length, 27, '26 oficiais + óxido de etileno (C1 mantido)'); assert.equal(t.implantados, 26); assert.equal(t.podeMudarPreco, false);
  const l = t.sobra.linhas.find((x) => x.codigo === 'QUA-012');
  assert.equal(l.preco, 5450); assert.equal(l.impostos, 776.63, '14,25% de Goiânia'); assert.equal(l.comissao, 163.5);
  assert.equal(l.sobra, Math.round((5450 - 776.63 - 163.5 - l.custo) * 100) / 100); assert.equal(l.fonte, 'C1:QT_AUTOCLAVE_BT');
  assert.equal(t.sobra.linhas.find((x) => x.codigo === 'NR13-001').fonte, 'estimativa');
  assert.equal(prodCod(amb, 'CAL-001').PRECO, 75.5);
});

// ---------------------------------------------------------------- proposta (simulador)
test('proposta: pontos alterados pelo comercial, vários equipamentos e vários serviços; preço fixo; autoclave 3 processos; odontológica 1 receita', () => {
  const amb = amb0(); implantar(amb);
  const r = proposta(amb, [
    it(amb, 'CAL-001', 10, { variante: 'SONDA_EXTERNA', pontos: ['-10', '2', '8', '20', '30'] }),
    it(amb, 'CAL-005', 1),
    it(amb, 'QUA-001', 1),
    it(amb, 'QUA-005', 1, { processos: [{ codigo: '121', nome: '121 °C', selecionado: false }, { codigo: '134', nome: '134 °C', selecionado: true }] }),
    it(amb, 'NR13-002', 2)
  ]);
  ok(r.salvo);
  const its = itensDe(amb, r.id);
  assert.equal(Math.round(its[0].quantidade * its[0].precoUnitario * 100) / 100, 1258.33);
  assert.equal(its[0].catalogo.unitarioCentavos, 12583); assert.equal(its[0].catalogo.subtotalCentavos, 125833); assert.equal(its[0].catalogo.pontosCobrados, 5);
  assert.match(its[0].detalhe, /Pontos contratados: -10 °C, 2 °C, 8 °C, 20 °C e 30 °C \(com sonda externa\)/);
  assert.equal(its[1].precoUnitario, 240.16, 'manovacuômetro pré-preenchido com 4 pontos');
  assert.equal(its[2].precoUnitario, 4870); assert.deepEqual(its[2].catalogo.sel.processos.filter((p) => p.selecionado).map((p) => p.nome), ['Bowie-Dick', '121 °C', '134 °C']);
  assert.match(its[2].detalhe, /Processos contratados: Bowie-Dick \(ensaio de remoção de ar e penetração de vapor\), 121 °C e 134 °C/);
  assert.equal(its[3].precoUnitario, 3500.75); assert.equal(its[3].catalogo.escopoAdicional, false);
  assert.equal(its[4].precoUnitario, 735); assert.equal(its[4].quantidade, 2);
  assert.equal(reg(amb, r.id).TOTAL, Math.round((1258.33 + 240.16 + 4870 + 3500.75 + 1470) * 100) / 100);
  its.forEach((i) => { ['codigo', 'nome', 'categoria', 'versaoTabela', 'precoBase', 'regra', 'def', 'sel', 'unitarioCentavos', 'subtotalCentavos'].forEach((k) => assert.ok(i.catalogo[k] !== undefined, k)); });
  // a vendedora vê os parâmetros na tela da proposta (sem custo)
  const tela = ok(amb.api('s_vera', 'proposta', { id: r.id })).proposta;
  assert.equal(tela.itens[0].catalogo.regra, 'PONTOS'); assert.equal(tela.itens[0].custoUnitario, undefined);
  // autoclave vertical de 75 L: uma receita a 121 °C
  const v = proposta(amb, [it(amb, 'QUA-001', 1, { variante: 'VERTICAL_75L', processos: [{ codigo: '121', nome: '121 °C', selecionado: true }], parametros: { volume: '75 L' } })]);
  ok(v.salvo); assert.equal(itensDe(amb, v.id)[0].precoUnitario, 4870); assert.match(itensDe(amb, v.id)[0].detalhe, /Autoclave vertical de 75 L\. Processos contratados: 121 °C\./);
  // quantidade de equipamentos tem que ser inteira; parâmetro inválido diz o quê e o que fazer
  assert.match(proposta(amb, [it(amb, 'CAL-004', 1.5)]).salvo.message, /quantidade de equipamentos precisa ser um número inteiro/);
  assert.match(proposta(amb, [it(amb, 'CAL-004', 1, { unidade: 'bar', pontos: ['1', '2', 'xyz'] })]).salvo.message, /item 1 \(CAL-004.*"xyz" não é um ponto.*Corrija os parâmetros técnicos do item e salve de novo/);
  assert.match(proposta(amb, [it(amb, 'CAL-009', 1, { parametros: { pmta: '8', pressaoAjuste: '9', unidadePressao: 'kgf/cm²' } })]).salvo.message, /pressão de ajuste da válvula \(9\) ficou acima da PMTA do vaso \(8\)/);
});

test('qualificação por receita: receita além do pacote-base é escopo adicional (motivo obrigatório para concluir) até a Diretoria aprovar a cobrança proporcional', () => {
  const amb = amb0(); implantar(amb);
  const dois = [{ codigo: '121', nome: '121 °C', selecionado: true }, { codigo: '134', nome: '134 °C', selecionado: true }];
  const r = proposta(amb, [it(amb, 'QUA-005', 1, { processos: dois })]);
  ok(r.salvo);
  const i0 = itensDe(amb, r.id)[0];
  assert.equal(i0.precoUnitario, 3500.75, 'sem aprovação: o preço de tabela fica o do pacote-base'); assert.equal(i0.catalogo.escopoAdicional, true);
  assert.match(amb.api('s_dora', 'concluirProposta', { id: r.id, justificativa: 'Diretoria conclui com a sobra' }).message, /escopo além do pacote-base .* escreva o motivo do ajuste/);
  ok(amb.api('s_vera', 'salvarProposta', { id: r.id, itens: [it(amb, 'QUA-005', 1, { processos: dois, motivoAjuste: 'Segunda receita a pedido do cliente' }, '4.500,00')] }));
  assert.equal(itensDe(amb, r.id)[0].precoUnitario, 4500, 'ajuste manual do preço');
  assert.notEqual(amb.api('s_dora', 'concluirProposta', { id: r.id, justificativa: 'Diretoria conclui com a sobra' }).message || '', /escopo além/);
  // odontológica sem receita escolhida não conclui
  const s = proposta(amb, [it(amb, 'QUA-005', 1, { processos: [{ codigo: '121', nome: '121 °C', selecionado: false }, { codigo: '134', nome: '134 °C', selecionado: false }] })]);
  assert.match(amb.api('s_dora', 'concluirProposta', { id: s.id, justificativa: 'Diretoria conclui com a sobra' }).message, /escolha a receita \(121 °C ou 134 °C\)/);
  // a Diretoria aprova a unidade faturável: a segunda receita passa a custar proporcional (3.500,75 × 2)
  const q5 = prodCod(amb, 'QUA-005');
  assert.match(amb.api('s_gaspar', 'catalogoOficialSalvar', { id: q5.ID, receita: { unidadeFaturavel: 'RECEITA', incluidas: 1, aprovada: true }, motivo: 'Gestor tentando aprovar' }).message, /só a Diretoria ou o Administrador mudam/);
  ok(amb.api('s_dora', 'catalogoOficialSalvar', { id: q5.ID, receita: { unidadeFaturavel: 'RECEITA', incluidas: 1, aprovada: true }, motivo: 'Cobrança por receita aprovada' }));
  const n = proposta(amb, [it(amb, 'QUA-005', 1, { processos: dois })]);
  assert.equal(itensDe(amb, n.id)[0].precoUnitario, 7001.5); assert.equal(itensDe(amb, n.id)[0].catalogo.escopoAdicional, false);
});

test('despesas adicionais (viagem) reaproveitadas; desconto autorizado conclui; desconto sem alçada fica travado até a gestão decidir', () => {
  const amb = amb0(); implantar(amb);
  const viagem = { viagem: { ha: 'SIM', tecnicos: 1, destino: 'Rio Verde/GO', kmTrecho: '228', dias: 1, noites: 0, linhas: { PEDAGIO: { nsa: true, motivo: 'Sem pedágio no trajeto' } } } };
  const r = proposta(amb, [it(amb, 'QUA-012', 1)], { deslocamento: viagem, descontoGeral: '545,00' });
  ok(r.salvo);
  const itens = itensDe(amb, r.id), auto = itens.find((i) => i.auto === 'DESLOCAMENTO');
  assert.ok(auto && auto.precoUnitario > 0, 'item de deslocamento da viagem');
  assert.equal(reg(amb, r.id).TOTAL, Math.round((5450 - 545 + auto.precoUnitario) * 100) / 100, 'desconto só no serviço');
  assert.equal(reg(amb, r.id).DESCONTO_PCT, 10);
  assert.equal(ok(amb.api('s_vera', 'concluirProposta', { id: r.id })).proposta.situacao, 'PRONTA', '10% dentro da alçada e sobra acima de 35%');
  const b = proposta(amb, [it(amb, 'QUA-012', 1)], { descontoGeral: '1.090,00' });
  assert.match(amb.api('s_vera', 'concluirProposta', { id: b.id }).message, /desconto de 20,0% acima do limite de 15%/);
  assert.equal(ok(amb.api('s_vera', 'concluirProposta', { id: b.id, justificativa: 'Cliente com três concorrentes na disputa' })).proposta.situacao, 'AGUARDANDO_APROVACAO');
  assert.match(amb.api('s_vera', 'gerarDocumento', { id: b.id }).message, /aguarda a aprovação do desconto/);
});

test('bloqueio de alteração indevida: vendedor não muda o item oficial; gestão muda descrição mas não preço nem regra; Diretoria muda preço com vigência, versão e histórico', () => {
  const amb = amb0(); implantar(amb);
  const p = prodCod(amb, 'CAL-001');
  assert.match(amb.api('s_vera', 'salvarProduto', { id: p.ID, codigo: 'CAL-001', nome: p.NOME, tipo: 'SERVICO', preco: '60,00' }).message, /é da tabela oficial da Diretoria/);
  assert.match(amb.api('s_vera', 'arquivarProduto', { id: p.ID }).message, /tabela oficial da Diretoria/);
  assert.match(amb.api('s_vera', 'catalogoOficialSalvar', { id: p.ID, preco: '1,00', motivo: 'tentativa da vendedora' }).message, /é da gestão comercial/);
  assert.match(amb.api('s_gaspar', 'salvarProduto', { id: p.ID, codigo: 'CAL-001', nome: p.NOME, tipo: 'SERVICO', preco: '80,00' }).message, /preço-base de CAL-001 é da tabela oficial/);
  assert.match(amb.api('s_fabio', 'salvarProduto', { id: p.ID, codigo: 'CAL-001', nome: p.NOME, tipo: 'SERVICO', preco: '75,50' }).message, /tabela oficial da Diretoria/);
  assert.match(amb.api('s_gaspar', 'catalogoOficialSalvar', { id: p.ID, preco: '80,00', motivo: 'Gestor tentando mudar o preço' }).message, /só a Diretoria ou o Administrador mudam/);
  assert.match(amb.api('s_gaspar', 'catalogoOficialSalvar', { id: p.ID, regra: 'FIXO', motivo: 'Gestor tentando mudar a regra' }).message, /a regra de preço da tabela oficial só a Diretoria/);
  assert.equal(prodCod(amb, 'CAL-001').PRECO, 75.5);
  ok(amb.api('s_gaspar', 'catalogoOficialSalvar', { id: p.ID, descricao: 'Calibração da indicação de temperatura nos pontos contratados, com certificado.', motivo: 'Texto revisado pela gestão' }));
  assert.match(prodCod(amb, 'CAL-001').DESCRICAO, /nos pontos contratados/);
  assert.match(amb.api('s_gaspar', 'catalogoOficialSalvar', { id: p.ID, descricao: 'x', motivo: 'curto' }).message, /pelo menos 10 letras/);
  ok(amb.api('s_dora', 'catalogoOficialSalvar', { id: p.ID, preco: '80,00', motivo: 'Novo preço da Diretoria' }));
  const p2 = prodCod(amb, 'CAL-001');
  assert.equal(p2.PRECO, 80); assert.match(p2.CATALOGO_VERSAO, /^DIRETORIA-2026-10-19/); assert.equal(p2.VIGENCIA_DESDE, '2026-10-19');
  assert.ok(amb.tabelas.COM_REAJUSTES.some((x) => x.PRODUTO_ID === p.ID && x.INDICE === 'Tabela oficial da Diretoria' && x.SITUACAO === 'APLICADO'));
  assert.ok(amb.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === p.ID && h.TIPO === 'PRECO_OFICIAL' && h.USUARIO_NOME === 'DORA DIRETORA TESTE'));
  // agendado: vale na vigência (rotina)
  ok(amb.api('s_dora', 'catalogoOficialSalvar', { id: p.ID, preco: '90,00', vigencia: '2026-11-03', motivo: 'Preço agendado da Diretoria' }));
  assert.equal(prodCod(amb, 'CAL-001').PRECO, 80);
  amb.mudar('2026-11-03T08:00:00-03:00'); amb.ctx.ComPr_rotinaReajustes_();
  assert.equal(prodCod(amb, 'CAL-001').PRECO, 90); assert.equal(prodCod(amb, 'CAL-001').VIGENCIA_DESDE, '2026-11-03'); assert.match(prodCod(amb, 'CAL-001').CATALOGO_VERSAO, /^DIRETORIA-2026-11-03/);
  // "usar o preço sugerido" da ficha não mexe no oficial
  assert.match(ok(amb.api('s_dora', 'aplicarSugerido', { ids: [p.ID], motivo: 'Teste do preço sugerido' })).message, /tabela oficial/);
  assert.equal(prodCod(amb, 'CAL-001').PRECO, 90);
});

test('preservação: a proposta guarda a cópia congelada; mudar o catálogo depois não altera a proposta; proposta antiga sem os campos continua igual', () => {
  const amb = amb0(); implantar(amb);
  const r = proposta(amb, [it(amb, 'CAL-002', 2)]);
  ok(r.salvo);
  const p = prodCod(amb, 'CAL-002');
  ok(amb.api('s_dora', 'catalogoOficialSalvar', { id: p.ID, preco: '99,00', pontos: '10; 30; 50; 70', motivo: 'Mudança de tabela para o teste' }));
  ok(amb.api('s_vera', 'salvarProposta', { id: r.id, itens: [it(amb, 'CAL-002', 2, itensDe(amb, r.id)[0].catalogo.sel, '75,00')] }));
  const i0 = itensDe(amb, r.id)[0];
  assert.equal(i0.catalogo.precoBase, 75); assert.equal(i0.precoUnitario, 75); assert.equal(i0.catalogo.versaoTabela, 'DIRETORIA-2026-11-01'); assert.deepEqual(i0.catalogo.sel.pontos, ['10', '30', '50']);
  const n = proposta(amb, [it(amb, 'CAL-002', 1)]);
  const n0 = itensDe(amb, n.id)[0];
  assert.equal(n0.catalogo.precoBase, 99); assert.equal(n0.catalogo.sel.pontos.length, 4); assert.equal(n0.precoUnitario, 132, '99 × 4/3');
  // proposta antiga (item sem catalogo, de um produto comum): mesmo preço, sem campos novos
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'SRV-ANT', nome: 'Serviço antigo de teste', tipo: 'SERVICO', preco: '300,00' }));
  const a = proposta(amb, [{ produtoId: prodCod(amb, 'SRV-ANT').ID, descricao: 'Serviço antigo de teste', quantidade: 3, precoUnitario: '300,00' }]);
  const a0 = itensDe(amb, a.id)[0];
  assert.equal(a0.catalogo, undefined); assert.equal(a0.precoUnitario, 300); assert.equal(reg(amb, a.id).TOTAL, 900);
});

test('passagem para a execução: a atividade da Área técnica leva o escopo técnico de cada item (pontos, processos, parâmetros, NR-13), sem valores', () => {
  const amb = amb0(); implantar(amb);
  const r = proposta(amb, [it(amb, 'CAL-001', 3), it(amb, 'QUA-001', 1), it(amb, 'NR13-003', 1, { parametros: { pmta: '2,5', pressaoAjuste: '2,2', unidadePressao: 'kgf/cm²', categoria: 'IV' } })]);
  ok(r.salvo);
  ok(amb.api('s_dora', 'concluirProposta', { id: r.id, justificativa: 'Diretoria: preço da tabela oficial' }));
  const g = ok(amb.api('s_vera', 'gerarDocumento', { id: r.id }));
  amb.tabelas.DOC_ENVIOS.push({ ID: 'e1', ARQUIVO_ID: g.pdfId, SITUACAO: 'ENVIADO', CANAL: 'EMAIL', DESTINO: 'ana@alfa.exemplo.test', USUARIO_ID: 'u_ven', USUARIO_NOME: 'VERA', QUANDO: '2026-10-19T10:30:00' });
  ok(amb.api('s_vera', 'proposta', { id: r.id }));
  ok(amb.api('s_vera', 'respostaCliente', { id: r.id, resposta: 'APROVADA', texto: 'Aprovado por e-mail', arquivo: { nome: 'aceite.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF').toString('base64') } }));
  ok(amb.api('s_vera', 'passarSetores', { id: r.id }));
  const tec = amb.tabelas.ATV_ATIVIDADES.find((a) => /Área técnica/.test(a.TITULO));
  assert.ok(tec, 'atividade da Área técnica');
  assert.match(tec.DESCRICAO, /CAL-001 .*\n  Escopo técnico: versão da tabela DIRETORIA-2026-11-01; variante: Com sonda externa; pontos: -10 °C; 2 °C; 8 °C/);
  assert.match(tec.DESCRICAO, /processo Bowie-Dick .*ensaios Ensaio de remoção de ar/);
  assert.match(tec.DESCRICAO, /pmta \(pressão máxima de trabalho admissível\): 2,5; .*pressão de ajuste da válvula de segurança: 2,2/);
  assert.match(tec.DESCRICAO, /teste hidrostático: Quando tecnicamente aplicável/);
  assert.doesNotMatch(tec.DESCRICAO, /R\$\s?\d/, 'sem valores');
  assert.equal(amb.ctx.ComCat_escopoTexto_({ descricao: 'avulso', quantidade: 1 }), '', 'item sem catálogo: nada muda');
});

// ---------------------------------------------------------------- reajuste
test('reajuste da decisão: suspeitos (alta acima de 100% ou custo maior que o preço) ficam fora; limite configurável; os 26 oficiais sempre fora (também do reajuste por percentual)', () => {
  const amb = amb0(); implantar(amb, false);
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'PECA-ABS', nome: 'Peça com custo absurdo', tipo: 'PRODUTO', preco: '280,00', custo: '167.890,00' }));
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'PECA-110', nome: 'Peça que sobe 110%', tipo: 'PRODUTO', preco: '100,00', custo: '90,00' }));
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'PECA-OK', nome: 'Peça normal', tipo: 'PRODUTO', preco: '50,00', custo: '40,00' }));
  const pv = ok(amb.api('s_dora', 'decisaoDonoPrecos', {}));
  assert.equal(pv.limiteAltaPct, 100); assert.equal(pv.oficiais, 26);
  assert.deepEqual(pv.suspeitos.map((x) => x.codigo).sort(), ['PECA-110', 'PECA-ABS']);
  assert.match(pv.suspeitos.find((x) => x.codigo === 'PECA-ABS').motivo, /custo cadastrado \(R\$ 167\.890,00\) maior que o preço atual/);
  assert.ok(!pv.linhas.some((x) => /^(CAL|QUA|NR13)-/.test(x.codigo)), 'oficiais fora');
  assert.deepEqual(pv.linhas.map((x) => x.codigo), ['PECA-OK']);
  const pv2 = ok(amb.api('s_dora', 'decisaoDonoPrecos', { limiteAltaPct: '200' }));
  assert.deepEqual(pv2.linhas.map((x) => x.codigo).sort(), ['PECA-110', 'PECA-OK']); assert.deepEqual(pv2.suspeitos.map((x) => x.codigo), ['PECA-ABS']);
  assert.match(amb.api('s_dora', 'decisaoDonoPrecos', { aplicar: true, marca: pv.marca, limiteAltaPct: '200' }).message, /mudou desde a prévia/, 'marca é do limite da prévia');
  const ap = ok(amb.api('s_dora', 'decisaoDonoPrecos', { aplicar: true, marca: pv.marca }));
  assert.equal(ap.qtd, 1); assert.equal(prodCod(amb, 'PECA-ABS').PRECO, 280); assert.equal(prodCod(amb, 'CAL-001').PRECO, 75.5);
  const f = amb.ctx.Comercial_decisaoDono20261101({ etapa: 'PRECOS', limiteAltaPct: 5000 });
  assert.equal(f.limiteAltaPct, 5000);
  // reajuste por percentual (Diretoria): a tabela oficial fica fora
  const rj = ok(amb.api('s_dora', 'reajustePrevia', { percentual: '5', selecao: { modo: 'TODOS' } }));
  assert.ok(!rj.linhas.some((x) => /^(CAL|QUA|NR13)-/.test(x.codigo)));
});

// ---------------------------------------------------------------- descrições
test('descrições: só o campo vazio (nunca sobrescreve), família certa do serviço, produto sem especificação inventada, marca "revisar" e reexecução sem duplicar', () => {
  const amb = amb0();
  amb.tabelas.COM_PRODUTOS = [
    { ID: 'd1', CODIGO: 'CRM-AAA1', NOME: 'CALIBRAÇÃO DE BALANÇA PEDIÁTRICA', TIPO: 'SERVICO', PRECO: 150, ATIVO: 'SIM', DESCRICAO: '' },
    { ID: 'd2', CODIGO: 'CRM-AAA2', NOME: 'Manutenção preventiva de seladora', TIPO: 'SERVICO', PRECO: 200, ATIVO: 'SIM', DESCRICAO: 'Manutenção preventiva de seladora' },
    { ID: 'd3', CODIGO: 'CRM-AAA3', NOME: 'Inspeção NR-13 de caldeira', TIPO: 'SERVICO', PRECO: 900, ATIVO: 'SIM' },
    { ID: 'd4', CODIGO: 'PA001', NOME: 'SENSOR PT100 MARCA X', TIPO: 'PRODUTO', CATEGORIA: 'Peças', UNIDADE_MEDIDA: 'pç', PRECO: 50, ATIVO: 'SIM', DESCRICAO: '' },
    { ID: 'd5', CODIGO: 'CRM-AAA5', NOME: 'Qualificação de seladora', TIPO: 'SERVICO', PRECO: 500, ATIVO: 'SIM', DESCRICAO: 'Texto que a gestão escreveu e fica.' },
    { ID: 'd6', CODIGO: 'CRM-AAA6', NOME: 'Hora técnica de técnico', TIPO: 'SERVICO', PRECO: 190, ATIVO: 'SIM', DESCRICAO: '' },
    { ID: 'd7', CODIGO: 'CRM-AAA7', NOME: 'Arquivado sem descrição', TIPO: 'SERVICO', PRECO: 1, ATIVO: 'NAO', DESCRICAO: '' }
  ];
  const p = amb.ctx.Comercial_catalogoOficial20261101({ etapa: 'DESCRICOES' });
  assert.equal(p.ok, true, p.message); assert.equal(p.qtd, 5); assert.equal(p.servicos, 4); assert.equal(p.produtos, 1);
  const nova = (id) => p.linhas.find((l) => l.id === id).nova;
  assert.match(nova('d1'), /^Serviço de calibração .* com emissão de certificado de calibração\.$/);
  assert.match(nova('d2'), /^Manutenção preventiva .* registro em ordem de serviço\.$/);
  assert.match(nova('d3'), /NR-13 e o enquadramento/);
  assert.match(nova('d6'), /^Hora técnica/);
  assert.equal(nova('d4'), 'Peça de reposição: SENSOR PT100 MARCA X. Fornecimento por peça.', 'produto: só nome, categoria e unidade');
  p.linhas.forEach((l) => assert.doesNotMatch(l.nova, /RBC|acredita|ART\b|garantia|compatível|prazo de/i, 'nada prometido fora do escopo: ' + l.nova));
  const a = amb.ctx.Comercial_catalogoOficial20261101({ etapa: 'DESCRICOES', aplicar: true, marca: p.marca });
  assert.equal(a.gravados, 5);
  assert.equal(amb.tabelas.COM_PRODUTOS.find((x) => x.ID === 'd5').DESCRICAO, 'Texto que a gestão escreveu e fica.');
  assert.equal(amb.tabelas.COM_PRODUTOS.find((x) => x.ID === 'd7').DESCRICAO, '', 'arquivado fica como está');
  assert.equal(amb.tabelas.COM_PRODUTOS.find((x) => x.ID === 'd1').DESCRICAO_GERADA, 'Descrição criada em 01/11/2026, revisar');
  assert.ok(amb.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === 'd1' && /Descrição criada em 01\/11\/2026, revisar/.test(h.TEXTO)));
  const p2 = amb.ctx.Comercial_catalogoOficial20261101({ etapa: 'DESCRICOES' });
  assert.equal(p2.qtd, 0, 'reexecução: nada a criar');
  // a gestão vê a marca e o filtro; ao editar a descrição, a marca some
  const cat = ok(amb.api('s_gaspar', 'catalogo', { situacao: 'DESCRICAO_GERADA' }));
  assert.equal(cat.encontrados, 5); assert.equal(cat.descricoesGeradas, 5); assert.ok(cat.produtos.every((x) => x.descricaoGerada));
  assert.equal(ok(amb.api('s_vera', 'catalogo', {})).produtos.some((x) => x.descricaoGerada), false, 'a marca é só da gestão');
  ok(amb.api('s_gaspar', 'salvarProduto', { id: 'd1', codigo: 'CRM-AAA1', nome: 'CALIBRAÇÃO DE BALANÇA PEDIÁTRICA', tipo: 'SERVICO', preco: '150,00', descricao: 'Calibração de balança pediátrica com certificado.' }));
  assert.equal(amb.tabelas.COM_PRODUTOS.find((x) => x.ID === 'd1').DESCRICAO_GERADA, '');
});

// ---------------------------------------------------------------- tela (celular) e o mesmo núcleo no servidor e na tela
test('tela: o núcleo do cálculo é o mesmo texto no servidor e na tela; o quadro de parâmetros funciona em 360 px', () => {
  const html = fs.readFileSync(path.join(pasta, 'JS_Comercial.html'), 'utf8').replace(/\r\n/g, '\n');
  const srv = fs.readFileSync(path.join(pasta, 'SGO_Comercial_CatalogoOficial.js'), 'utf8').replace(/\r\n/g, '\n');
  const bloco = (s) => s.slice(s.indexOf('// NUCLEO-CATALOGO-INICIO'), s.indexOf('// NUCLEO-CATALOGO-FIM'));
  assert.ok(bloco(srv).length > 2000); assert.equal(bloco(html), bloco(srv), 'núcleo igual');
  // CSS do celular: quadro em uma coluna, alvos de 44 px, sem largura fixa
  assert.match(html, /@media \(max-width: 900px\) \{\n    \.cm-tec-grade \{ grid-template-columns: 1fr; \}/);
  assert.match(html, /\.cm-item-tec input, \.cm-item-tec select, \.cm-item-tec button \{ min-height: 44px; max-width: 100%; \}/);
  assert.match(html, /\.cm-item-tec \{ grid-column: 1 \/ -1;/);
  // o quadro desenhado (sem servidor): campos de pontos, receitas, campos técnicos, pendência e o preço ao vivo
  const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  const ctx = vm.createContext({ console, window: {}, setTimeout, escapeHtml_: (v) => String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`), document: { getElementById: () => null, querySelectorAll: () => [], querySelector: () => null, addEventListener() {} }, google: { script: { run: {} } } });
  vm.runInContext(script, ctx);
  const amb = amb0(); implantar(amb, false);
  const tela = ok(amb.api('s_vera', 'catalogo', { busca: 'CAL-005', situacao: 'ATIVOS' })).produtos[0];
  assert.equal(tela.oficial.regra, 'PONTOS');
  const item = { quantidade: 2, tipo: 'SERVICO', precoUnitario: '', faixa: 'NORMAL', catalogo: ctx.Comercial_catDoProduto_(tela) };
  ctx.Comercial_faixaDoItem_ = () => 'NORMAL'; ctx.CM.ini = { prazo: { faixas: [{ codigo: 'NORMAL', acrescimoPct: 0, ativa: true }] } };
  vm.runInContext('Comercial_faixaDoItem_ = this.Comercial_faixaDoItem_;', ctx);
  ctx.Comercial_catReprecificar_(item);
  assert.equal(item.precoUnitario, 240.16, 'mesma conta do servidor');
  // mudou o parâmetro: os totais recalculam a tabela primeiro (sem mexer no preço) e o preço digitado ainda acompanha a tabela nova
  item.catalogo.sel.pontos = ['1', '2', '3']; ctx.Comercial_catTabela_(item); ctx.Comercial_catReprecificar_(item);
  assert.equal(item.precoUnitario, 180.12);
  item.precoUnitario = '170,00'; item.catalogo.sel.pontos = ['1', '2', '3', '4']; ctx.Comercial_catReprecificar_(item);
  assert.equal(item.precoUnitario, '170,00', 'preço digitado fora da tabela fica como o comercial escreveu');
  item.catalogo.sel.pontos = ['-500 mmHg', '1', '2', '3']; item.precoUnitario = ''; ctx.Comercial_catReprecificar_(item);
  const h = ctx.Comercial_painelTec_(item, 0);
  assert.match(h, /data-t="pontos" value="-500 mmHg; 1; 2; 3"/); assert.match(h, /data-t="unidade"/); assert.match(h, /data-t="c:faixaMin"/);
  assert.match(h, /cobra 4 · unitário R\$ 240,16 · subtotal R\$ 480,32/);
  const q1 = { quantidade: 1, tipo: 'SERVICO', precoUnitario: '', catalogo: ctx.Comercial_catDoProduto_(ok(amb.api('s_vera', 'catalogo', { busca: 'QUA-001', situacao: 'ATIVOS' })).produtos[0]) };
  const h1 = ctx.Comercial_painelTec_(q1, 1);
  assert.match(h1, /data-t="p:0:nome" value="Bowie-Dick"/); assert.match(h1, /data-t="variante"/); assert.match(h1, /A inspeção NR-13 não está incluída/);
  const q6 = { quantidade: 1, tipo: 'SERVICO', precoUnitario: '', catalogo: ctx.Comercial_catDoProduto_(ok(amb.api('s_vera', 'catalogo', { busca: 'CAL-006', situacao: 'ATIVOS' })).produtos[0]) };
  assert.match(ctx.Comercial_painelTec_(q6, 2), /pendente de aprovação técnica.*pendentes de definição/s);
  assert.equal(ctx.Comercial_valorPreco_(125.83333333333333), '125,83');
});

test('documentação no mesmo pacote: ajuda da tela, manuais e a base do assistente falam do catálogo oficial', () => {
  const ajuda = fs.readFileSync(path.join(pasta, 'SGO_Ajuda_Comercial.js'), 'utf8');
  const man = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_COMERCIAL.md'), 'utf8');
  const gest = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_COMERCIAL_PRECOS_GESTAO.md'), 'utf8');
  const base = fs.readFileSync(path.join(pasta, 'SGO_AssistenteManuais.js'), 'utf8');
  [ajuda, man, base].forEach((t) => { assert.match(t, /Parâmetros técnicos/); assert.match(t, /tabela oficial da Diretoria/i); });
  assert.match(man, /REG-CAL-001/); assert.match(gest, /sobra/i); assert.match(gest, /suspeito/i); assert.match(gest, /DESCRICOES/);
});

// ---------------------------------------------------------------- revisão de 01/11/2026 (pedido do dono: óxido de etileno; achados da revisão)
test('óxido de etileno: o QT-AUTOCLAVE-BT da C1 continua ativo, vira a oferta de ETO (nome e descrição só se ainda forem os da C1), preço mantido "a confirmar", sobra da gestão; reimplantação não duplica', () => {
  const amb = amb0();
  const pv = ok(amb.api('s_dora', 'importarC1Previa')); ok(amb.api('s_dora', 'importarC1', { marca: pv.marca, escolhas: {} }));
  const bt = prodCod(amb, 'QT-AUTOCLAVE-BT'), precoC1 = bt.PRECO, nomeC1 = bt.NOME;
  // proposta já salva com o item antigo (antes da implantação)
  const r = proposta(amb, [{ produtoId: bt.ID, descricao: nomeC1, quantidade: 1, precoUnitario: String(precoC1).replace('.', ',') }]);
  ok(r.salvo);
  const antesItem = JSON.stringify(itensDe(amb, r.id)[0]);
  const { previa, aplicado } = implantar(amb, false);
  assert.ok(!previa.desativar.some((d) => d.codigo === 'QT-AUTOCLAVE-BT'), 'não é desativado');
  const linha = previa.parametrizar.find((x) => x.codigo === 'QT-AUTOCLAVE-BT');
  assert.ok(linha && linha.parametros && linha.nomeNovo && linha.descricaoNova); assert.equal(linha.precoAConfirmar, 'preço a confirmar pela Diretoria');
  assert.ok(aplicado.parametrizados >= 2);
  const p = prodCod(amb, 'QT-AUTOCLAVE-BT');
  assert.equal(p.ATIVO, 'SIM'); assert.equal(p.PRECO, precoC1, 'preço o que estava gravado');
  assert.equal(p.NOME, 'Qualificação de esterilizador por óxido de etileno (ETO)');
  assert.match(p.DESCRICAO, /^Qualificação de instalação, operação e desempenho de esterilizador por óxido de etileno/);
  assert.equal(p.REGRA_PRECO, 'RECEITA'); assert.equal(p.CATALOGO_OFICIAL, undefined);
  const def = JSON.parse(p.PARAMETROS_JSON);
  assert.equal(def.precoAConfirmar, 'preço a confirmar pela Diretoria');
  ['fabricante', 'modelo', 'serie', 'receitaCiclo', 'temperatura', 'umidade', 'concentracao', 'tempo', 'aeracao', 'indicadoresQuimicos', 'indicadoresBiologicos', 'ciclos', 'carga'].forEach((c) => assert.ok(def.campos.some((x) => x.codigo === c), c));
  assert.ok(amb.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === p.ID && /óxido de etileno/.test(h.TEXTO) && /preço a confirmar/.test(h.TEXTO)));
  // proposta antiga: igual, mesmo salvando de novo pela tela (sem os parâmetros)
  assert.equal(JSON.stringify(itensDe(amb, r.id)[0]), antesItem);
  const tela = ok(amb.api('s_vera', 'proposta', { id: r.id })).proposta.itens[0];
  ok(amb.api('s_vera', 'salvarProposta', { id: r.id, itens: [{ produtoId: tela.produtoId, descricao: tela.descricao, detalhe: tela.detalhe, quantidade: tela.quantidade, precoUnitario: String(tela.precoUnitario).replace('.', ',') }] }));
  const i0 = itensDe(amb, r.id)[0];
  assert.equal(i0.precoUnitario, precoC1); assert.equal(i0.descricao, nomeC1); assert.equal(i0.catalogo, undefined);
  // sobra da gestão
  const t = ok(amb.api('s_gaspar', 'catalogoOficial', {}));
  const so = t.sobra.linhas.find((x) => x.codigo === 'QT-AUTOCLAVE-BT');
  assert.ok(so && so.extra); assert.equal(so.preco, precoC1); assert.equal(so.precoAConfirmar, 'preço a confirmar pela Diretoria');
  assert.equal(t.itens.find((x) => x.codigo === 'QT-AUTOCLAVE-BT').extra, true);
  // reimplantação: não duplica, segue ativo, nada muda
  const total = amb.tabelas.COM_PRODUTOS.length;
  const p2 = amb.ctx.Comercial_catalogoOficial20261101({ etapa: 'CATALOGO' });
  assert.equal(p2.parametrizar.length, 0); assert.equal(p2.qtdCriar, 0); assert.equal(p2.qtdDesativar, 0);
  ok(amb.ctx.Comercial_catalogoOficial20261101({ etapa: 'CATALOGO', aplicar: true, marca: p2.marca }));
  assert.equal(amb.tabelas.COM_PRODUTOS.length, total); assert.equal(prodCod(amb, 'QT-AUTOCLAVE-BT').ATIVO, 'SIM');
  // nome editado pela gestão não é sobrescrito
  const amb2 = amb0();
  const pv2 = ok(amb2.api('s_dora', 'importarC1Previa')); ok(amb2.api('s_dora', 'importarC1', { marca: pv2.marca, escolhas: {} }));
  const bt2 = prodCod(amb2, 'QT-AUTOCLAVE-BT'); bt2.NOME = 'Qualificação de esterilizador ETO (nome da gestão)'; bt2.DESCRICAO = 'Descrição escrita pela gestão para o serviço.';
  implantar(amb2, false);
  assert.equal(prodCod(amb2, 'QT-AUTOCLAVE-BT').NOME, 'Qualificação de esterilizador ETO (nome da gestão)');
  assert.equal(prodCod(amb2, 'QT-AUTOCLAVE-BT').DESCRICAO, 'Descrição escrita pela gestão para o serviço.');
  assert.equal(prodCod(amb2, 'QT-AUTOCLAVE-BT').REGRA_PRECO, 'RECEITA', 'os parâmetros (campo vazio) entram');
});

test('revisão: escopo para a execução sem o motivo comercial do ajuste; concordância "condições contratadas"; Diretoria não muda o preço oficial pelo cadastro comum', () => {
  const amb = amb0(); implantar(amb);
  const r = proposta(amb, [it(amb, 'QUA-008', 1, { processos: [{ codigo: 'C1', nome: '50 °C' }, { codigo: 'C2', nome: '100 °C' }, { codigo: 'C3', nome: '150 °C' }, { codigo: 'N4', nome: '200 °C' }], motivoAjuste: 'quarta condição; desconto de R$ 100,00 combinado' })]);
  ok(r.salvo);
  const i0 = itensDe(amb, r.id)[0];
  assert.match(i0.detalhe, /Condições contratadas: 50 °C, 100 °C, 150 °C e 200 °C\./);
  const esc = amb.ctx.ComCat_escopoTexto_(i0);
  assert.match(esc, /ESCOPO ADICIONAL ao pacote-base \(4 condições \(o pacote-base inclui 3\)\)/);
  assert.doesNotMatch(esc, /desconto|R\$/);
  const p = prodCod(amb, 'CAL-001');
  assert.match(amb.api('s_dora', 'salvarProduto', { id: p.ID, codigo: 'CAL-001', nome: p.NOME, tipo: 'SERVICO', preco: '80,00' }).message, /Catálogo oficial > Editar/);
  assert.equal(prodCod(amb, 'CAL-001').PRECO, 75.5);
});
