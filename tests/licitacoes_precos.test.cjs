// SGO+ Licitações, tabela de preços própria e simulador (02/11/2026): importação do catálogo com prévia, versões e histórico da
// tabela, política com versão, a conta (casos reais do catálogo: CAL-001 R$ 75,50 x 100, pontos REG-CAL-001, deslocamento de 228 km
// com Incentivo de Missão, RJ pela equipe do Rio, parceiro, seguro-garantia), piso por item, item abaixo do piso, preço a confirmar,
// simulações imutáveis, nota (critério margem), permissão e telas (computador e celular de 390 px).
// Código real do Comercial e de Licitações num contexto isolado (tests/_licitacoes_precos_ambiente.cjs). Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { ambientePrecos } = require('./_licitacoes_precos_ambiente.cjs');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

const OPS = [{ ID: 'op1', CODIGO: 'LIC-2026-0001', UF: 'GO', MUNICIPIO: 'Rio Verde', VALOR_ESTIMADO: 20000, ORGAO_NOME: 'HOSPITAL MUNICIPAL TESTE' },
  { ID: 'op2', CODIGO: 'LIC-2026-0002', UF: 'RJ', MUNICIPIO: 'Niterói', VALOR_ESTIMADO: 50000 },
  { ID: 'op3', CODIGO: 'LIC-2026-0003', UF: 'GO', MUNICIPIO: 'Goiânia', VALOR_ESTIMADO: 9000 }];
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
/** Ambiente com o catálogo implantado e a tabela de licitação importada. */
function base(o) {
  const a = ambientePrecos(Object.assign({ oportunidades: OPS }, o || {}));
  const pv = ok(a.lic('s_dora', 'importarPrevia'));
  ok(a.lic('s_dora', 'importar', { marca: pv.marca, motivo: 'Ponto de partida da tabela' }));
  return a;
}
const linha = (a, cod) => a.tabelas.LIC_PRECOS.find((r) => r.CODIGO === cod);
const exec = (x) => Object.assign({ uf: 'GO', municipio: 'Rio Verde', tecnicos: 1, engenheiros: 0, viagens: 1, dias: 2, noites: 1, pedagio: '0', transporte: 'VEICULO_EMPRESA' }, x || {});
const LOCAL = { municipio: 'Goiânia', dias: 1, noites: 0 };
const calc = (a, id, itens, x, seguro) => ok(a.lic('s_dora', 'simulacaoCalcular', { id, entrada: { itens, execucao: exec(x), seguro: seguro || { exige: false } } })).resultado;

test('importar do catálogo: prévia antes, só códigos novos, ETO "a confirmar", eletromédicos por parceiro, nunca sobrescreve e versão 1 com fotografia', () => {
  const a = ambientePrecos({ oportunidades: OPS });
  const pv = ok(a.lic('s_dora', 'importarPrevia'));
  assert.equal(a.tabelas.LIC_PRECOS.length, 0, 'a prévia não grava nada');
  assert.ok(pv.novos >= 26);
  const eto = pv.linhas.find((l) => l.codigo === 'QT-AUTOCLAVE-BT');
  assert.equal(eto.situacao, 'A_CONFIRMAR'); assert.match(eto.aConfirmar, /a confirmar pela Diretoria/);
  assert.equal(pv.linhas.find((l) => l.codigo === 'CAL-MONITOR').execucao, 'PARCEIRO');
  assert.equal(pv.linhas.find((l) => l.codigo === 'CAL-BALANCA-PEQ').execucao, 'PROPRIA', 'balança pela equipe própria (Inmetro)');
  assert.equal(pv.linhas.find((l) => l.codigo === 'CAL-ESFIGMO').execucao, 'PROPRIA');
  const cal = pv.linhas.find((l) => l.codigo === 'CAL-001');
  assert.equal(cal.preco, 75.5); assert.equal(cal.regra, 'PONTOS'); assert.equal(cal.minimo, 3);
  // marca diferente: nada é gravado
  assert.match(a.lic('s_dora', 'importar', { marca: 'x', motivo: 'teste' }).message, /mudou desde a prévia/);
  assert.equal(a.tabelas.LIC_PRECOS.length, 0);
  // só os escolhidos
  ok(a.lic('s_dora', 'importar', { marca: pv.marca, codigos: ['CAL-001', 'QT-AUTOCLAVE-BT'], motivo: 'Primeiros itens' }));
  assert.deepEqual(a.tabelas.LIC_PRECOS.map((r) => r.CODIGO).sort(), ['CAL-001', 'QT-AUTOCLAVE-BT']);
  const r = linha(a, 'CAL-001');
  assert.equal(r.VERSAO, 1); assert.equal(r.CUSTO_ORIGEM, 'CATALOGO'); assert.equal(r.PRECO_SITUACAO, 'CONFIRMADO');
  assert.equal(linha(a, 'QT-AUTOCLAVE-BT').PRECO_SITUACAO, 'A_CONFIRMAR');
  const v = a.tabelas.LIC_PRECOS_VERSOES.filter((x) => x.PRECO_ID === r.ID);
  assert.equal(v.length, 1); assert.equal(JSON.parse(v[0].DADOS_JSON).PRECO_REFERENCIA, 75.5); assert.ok(r.HASH && r.HASH === v[0].HASH);
  // a Diretoria muda o preço; importar de novo não sobrescreve
  ok(a.lic('s_dora', 'itemSalvar', { id: r.ID, campos: { precoReferencia: '82,00' }, motivo: 'Preço próprio para licitação' }));
  const pv2 = ok(a.lic('s_dora', 'importarPrevia'));
  assert.equal(pv2.linhas.find((l) => l.codigo === 'CAL-001').acao, 'JA_NA_TABELA');
  ok(a.lic('s_dora', 'importar', { marca: pv2.marca, motivo: 'O resto do catálogo' }));
  assert.equal(linha(a, 'CAL-001').PRECO_REFERENCIA, 82);
  assert.equal(a.tabelas.LIC_PRECOS.filter((x) => x.CODIGO === 'CAL-001').length, 1, 'sem duplicar');
  assert.ok(a.tabelas.LIC_HISTORICO.some((h) => h.TIPO === 'IMPORTACAO_CATALOGO'));
});

test('editar item: merge, motivo obrigatório, versão + 1, fotografia e histórico de → para; custo da Diretoria e volta ao catálogo; sem mudança não cria versão', () => {
  const a = base();
  const r = linha(a, 'CAL-001'), antes = JSON.stringify(r);
  assert.match(a.lic('s_dora', 'itemSalvar', { id: r.ID, campos: { precoReferencia: '80' }, motivo: 'curto' }).message, /motivo/);
  assert.match(a.lic('s_dora', 'itemSalvar', { id: r.ID, campos: { precoReferencia: 'abc' }, motivo: 'Motivo suficiente aqui' }).message, /em reais/);
  assert.match(a.lic('s_dora', 'itemSalvar', { id: r.ID, campos: { vigenciaDesde: '2026-12-01', vigenciaAte: '2026-11-01' }, motivo: 'Motivo suficiente aqui' }).message, /termina antes de começar/);
  assert.equal(JSON.stringify(linha(a, 'CAL-001')), antes, 'recusas não gravam');
  const s = ok(a.lic('s_dora', 'itemSalvar', { id: r.ID, campos: { custo: '50,00', obs: 'Custo medido em 2026' }, motivo: 'Custo real da bancada' }));
  assert.equal(s.versao, 2);
  const n = linha(a, 'CAL-001');
  assert.equal(n.CUSTO_REFERENCIA, 50); assert.equal(n.CUSTO_ORIGEM, 'DIRETORIA'); assert.equal(n.CUSTO_MOTIVO, 'Custo real da bancada'); assert.equal(n.PRECO_REFERENCIA, 75.5, 'campo não enviado fica');
  const h = a.tabelas.LIC_HISTORICO.filter((x) => x.ENTIDADE === 'PRECO' && x.TIPO === 'PRECO_ITEM');
  assert.ok(h.some((x) => x.DE === 'do catálogo' && x.PARA === 'informado pela Diretoria'));
  assert.ok(h.some((x) => x.DE === 'R$ 64,70' && x.PARA === 'R$ 50,00'), 'de → para em pt-BR, sem JSON cru');
  const vs = ok(a.lic('s_dora', 'itemVersoes', { id: r.ID })).versoes;
  assert.deepEqual(vs.map((v) => v.versao), [2, 1]); assert.ok(vs.every((v) => v.integra));
  assert.match(vs[0].mudou, /Custo de referência: R\$ 64,70 → R\$ 50,00/); assert.match(vs[0].mudou, /Origem do custo: do catálogo → informado pela Diretoria/);
  assert.equal(ok(a.lic('s_dora', 'tabela')).itens.find((i) => i.codigo === 'CAL-001').custo, 50);
  assert.equal(ok(a.lic('s_dora', 'itemSalvar', { id: r.ID, campos: { custo: '50' }, motivo: 'Mesmo valor de novo' })).semMudanca, true);
  ok(a.lic('s_dora', 'itemSalvar', { id: r.ID, campos: { custo: 'CATALOGO' }, motivo: 'Volta ao custo do catálogo' }));
  assert.equal(ok(a.lic('s_dora', 'tabela')).itens.find((i) => i.codigo === 'CAL-001').custo, 64.7, 'custo do catálogo ao vivo');
  // confirmar o ETO exige preço
  const eto = linha(a, 'QT-AUTOCLAVE-BT');
  assert.match(a.lic('s_dora', 'itemSalvar', { id: eto.ID, campos: { precoReferencia: '', precoSituacao: 'CONFIRMADO' }, motivo: 'Confirmação do preço' }).message, /escreva o preço de referência/);
});

test('CAL-001 R$ 75,50 x 100 em Rio Verde (228 km): custo do catálogo, deslocamento com Incentivo de Missão diluído, piso 35% e alvo 40% por item, edital abaixo do piso', () => {
  const a = base();
  const r = calc(a, 'op1', [{ numero: '1', codigo: 'CAL-001', quantidade: 100, precoEdital: '90,00', precoProposta: '180,00' }]);
  const v = r.viagem;
  assert.equal(v.base, 'GO'); assert.equal(v.km, 228); assert.match(v.kmFonte, /Programa de conduta/);
  assert.equal(v.incentivo, 300, 'trecho de 228 km: R$ 300 por executante');
  const L = (n) => v.linhas.find((x) => x.nome.indexOf(n) === 0);
  assert.equal(L('Km rodado').total, 1140, '456 km x R$ 2,50');
  assert.equal(L('Alimentação').total, 200); assert.equal(L('Hospedagem').total, 150); assert.equal(L('Horas de estrada').total, 731.25);
  assert.equal(v.custo, 2521.25);
  const i = r.itens[0];
  assert.equal(i.precoRefUnit, 75.5); assert.equal(i.precoRefTotal, 7550);
  assert.equal(i.custoUnitBase, 64.7, 'ficha da C1 pela política: 0,33 h x 90 + 0,1 h x 132, custo fixo 25%, bônus e padrões');
  assert.equal(i.custoDireto, 6470); assert.equal(i.rateioDeslocamento, 2521.25, 'item único recebe todo o deslocamento');
  assert.equal(i.custoTotal, 8991.25); assert.equal(i.custoUnitTotal, 89.9125);
  assert.equal(i.impostosPct, 14.25); assert.equal(i.comissaoPct, 0);
  assert.equal(i.pisoUnit, Math.ceil(89.9125 / (1 - 0.1425 - 0.35) * 100 - 1e-9) / 100); assert.equal(i.pisoUnit, 177.17);
  assert.equal(i.alvoUnit, 196.54, "89,9125 ÷ 0,4575 = 196,5301: para cima no centavo"); assert.equal(i.pisoTotal, 17717);
  const sobra = (p) => (p - p * 0.1425 - 89.9125) / p;
  assert.ok(sobra(i.pisoUnit) >= 0.35 - 1e-9 && sobra(i.pisoUnit - 0.01) < 0.35, 'o piso é o menor preço com 35%');
  assert.equal(i.abaixoPisoEdital, true); assert.ok(i.margemEditalPct < 0);
  assert.equal(i.abaixoPisoProposta, false); assert.ok(Math.abs(i.margemPropostaPct - Math.round(sobra(180) * 10000) / 100) < 0.011);
  assert.equal(r.totais.abaixoEdital, 1); assert.equal(r.situacao, 'COMPLETA');
  assert.ok(r.avisos.some((x) => /preço de referência do edital abaixo do piso/.test(x)));
  assert.ok(r.premissas.some((x) => /PIS 1,65% \+ COFINS 7,60% \+ ISS 5,00%/.test(x)));
  assert.ok(r.premissas.some((x) => /técnico R\$ 90,00/.test(x)));
  assert.equal(r.politica.licitacao.margemMinPct, 35); assert.equal(r.politica.comercial.valorKm, 2.5);
  // a conta não grava nada
  assert.equal((a.tabelas.LIC_SIMULACOES || []).length, 0);
});

test('REG-CAL-001: 4 e 5 pontos em centavos exatos; o custo acompanha o mesmo fator; trecho curto sem Incentivo de Missão', () => {
  const a = base();
  const r = calc(a, 'op1', [{ codigo: 'CAL-001', quantidade: 10, pontos: 5, precoEdital: '' }, { codigo: 'CAL-001', quantidade: 1, pontos: 4 }], { municipio: 'Anápolis' });
  assert.equal(r.itens[0].precoRefUnit, 125.83); assert.equal(r.itens[0].precoRefTotal, 1258.33, '10 x 5 pontos: 1.258,33 (não 1.258,30)');
  assert.equal(r.itens[1].precoRefUnit, 100.67);
  assert.equal(r.itens[0].custoUnitBase, Math.round(64.7 * 5 / 3 * 100) / 100);
  assert.equal(r.viagem.km, 55); assert.equal(r.viagem.incentivo, 0);
  assert.ok(r.viagem.linhas.find((l) => /Incentivo/.test(l.nome)).nsa);
  // rateio proporcional ao custo direto, somando exatamente o deslocamento
  assert.equal(Math.round((r.itens[0].rateioDeslocamento + r.itens[1].rateioDeslocamento) * 100), Math.round(r.viagem.custo * 100));
  assert.ok(r.itens[0].rateioDeslocamento > r.itens[1].rateioDeslocamento * 10);
  // Goiânia: atendimento local, 0 km, sem pendência de pedágio
  const g = calc(a, 'op3', [{ codigo: 'CAL-001', quantidade: 2 }], { municipio: 'Goiânia', pedagio: '' });
  assert.equal(g.viagem.km, 0); assert.equal(g.pendencias.length, 0);
});

test('RJ pela equipe do Rio: origem no Rio, sem a tabela de Goiânia, km informado; impostos continuam os da matriz de Goiânia', () => {
  const a = base();
  const sem = calc(a, 'op2', [{ codigo: 'CAL-001', quantidade: 10, precoEdital: '200' }], { uf: 'RJ', municipio: 'Niterói', pedagio: '' });
  assert.equal(sem.viagem.base, 'RJ'); assert.match(sem.viagem.origem, /Rio de Janeiro/); assert.equal(sem.viagem.km, null);
  assert.ok(sem.pendencias.some((p) => p.codigo === 'KM' && /Rio de Janeiro/.test(p.texto)));
  assert.equal(sem.situacao, 'COM_PENDENCIA');
  const com = calc(a, 'op2', [{ codigo: 'CAL-001', quantidade: 10, precoEdital: '200' }], { uf: 'RJ', municipio: 'Niterói', kmTrecho: '15', pedagio: '12,50' });
  assert.equal(com.viagem.km, 15); assert.equal(com.viagem.incentivo, 0); assert.equal(com.pendencias.length, 0);
  assert.equal(com.itens[0].impostosPct, 14.25, 'CNPJ da proposta: matriz de Goiânia');
  // ES também é da equipe do Rio (padrão); a Diretoria muda a lista com versão
  const es = calc(a, 'op1', [{ codigo: 'CAL-001', quantidade: 1 }], { uf: 'ES', municipio: 'Vitória', kmTrecho: '520' });
  assert.equal(es.viagem.base, 'RJ'); assert.equal(es.viagem.incentivo, 300);
});

test('parceiro (eletromédico): sem custo do parceiro é pendência sem piso; com o custo, a mesma sobra de 35%', () => {
  const a = base();
  const s = calc(a, 'op3', [{ codigo: 'CAL-MONITOR', quantidade: 5, precoEdital: '400' }], LOCAL);
  assert.equal(s.itens[0].execucao, 'PARCEIRO'); assert.equal(s.itens[0].pisoUnit, null);
  assert.ok(s.pendencias.some((p) => /custo do parceiro/.test(p.texto)));
  const c = calc(a, 'op3', [{ codigo: 'CAL-MONITOR', quantidade: 5, precoEdital: '400', custoParceiro: '150,00' }], LOCAL);
  const i = c.itens[0];
  assert.equal(i.custoUnitBase, 150); assert.match(i.custoFonte, /parceiro informado nesta simulação/);
  assert.equal(i.pisoUnit, Math.ceil(150 / (1 - 0.1425 - 0.35) * 100 - 1e-9) / 100);
  // custo do parceiro gravado na tabela vale sem digitar na simulação
  ok(a.lic('s_dora', 'itemSalvar', { id: linha(a, 'CAL-MONITOR').ID, campos: { custoParceiro: '160' }, motivo: 'Cotação do parceiro de 2026' }));
  assert.equal(calc(a, 'op3', [{ codigo: 'CAL-MONITOR', quantidade: 1 }], { municipio: 'Goiânia' }).itens[0].custoUnitBase, 160);
});

test('seguro-garantia: só quando o edital exige; sem o custo é pendência; com o custo entra diluído no preço', () => {
  const a = base();
  const sem = calc(a, 'op3', [{ codigo: 'CAL-001', quantidade: 10 }], { municipio: 'Goiânia' }, { exige: 'SIM', custo: '' });
  assert.ok(sem.pendencias.some((p) => p.codigo === 'SEGURO'));
  const nao = calc(a, 'op3', [{ codigo: 'CAL-001', quantidade: 10 }], { municipio: 'Goiânia' }, { exige: 'NAO', custo: '999' });
  assert.equal(nao.totais.seguro, 0, 'sem exigência do edital, o custo não entra');
  const com = calc(a, 'op3', [{ codigo: 'CAL-001', quantidade: 10 }, { codigo: 'CAL-002', quantidade: 10 }], { municipio: 'Goiânia' }, { exige: true, custo: '300,00' });
  assert.equal(com.totais.seguro, 300);
  assert.equal(Math.round((com.itens[0].rateioSeguro + com.itens[1].rateioSeguro) * 100), 30000);
  assert.ok(com.itens[0].pisoUnit > nao.itens[0].pisoUnit);
});

test('preço a confirmar (óxido de etileno): pendência e sem piso; o resto do lote calcula; piso por item marca só o item abaixo', () => {
  const a = base();
  const r = calc(a, 'op3', [{ numero: '1', codigo: 'QT-AUTOCLAVE-BT', quantidade: 1, precoEdital: '5000' }, { numero: '2', codigo: 'CAL-001', quantidade: 10, precoEdital: '500', precoProposta: '300' },
    { numero: '3', codigo: 'CAL-001', quantidade: 10, precoProposta: '100' }], { municipio: 'Goiânia' });
  assert.equal(r.itens[0].pisoUnit, null); assert.equal(r.itens[0].semPiso, true);
  assert.ok(r.pendencias.some((p) => /a confirmar pela Diretoria/.test(p.texto) && /não calcula o piso/.test(p.texto)));
  assert.equal(r.totais.pisoCompleto, false);
  assert.ok(r.itens[1].pisoUnit > 0);
  assert.equal(r.itens[1].abaixoPisoProposta, false); assert.equal(r.itens[2].abaixoPisoProposta, true, 'R$ 100 abaixo do piso do item');
  assert.equal(r.totais.abaixoProposta, 1);
  assert.ok(r.avisos.some((x) => /piso por item/.test(x)), 'nenhum item abaixo, mesmo que o lote feche');
  // a Diretoria confirma o preço: o piso passa a ser calculado
  ok(a.lic('s_dora', 'itemSalvar', { id: linha(a, 'QT-AUTOCLAVE-BT').ID, campos: { precoSituacao: 'CONFIRMADO' }, motivo: 'Preço do ETO confirmado pela Diretoria' }));
  assert.ok(calc(a, 'op3', [{ codigo: 'QT-AUTOCLAVE-BT', quantidade: 1 }], { municipio: 'Goiânia' }).itens[0].pisoUnit > 0);
  // erros de digitação: a tela recebe o que fazer
  assert.match(a.lic('s_dora', 'simulacaoCalcular', { id: 'op3', entrada: { itens: [{ codigo: 'CAL-001', quantidade: 1, precoEdital: 'muito' }], execucao: exec({ municipio: 'Goiânia' }) } }).message, /em reais/);
  assert.ok(calc(a, 'op3', [{ codigo: 'XYZ-9', quantidade: 1 }], { municipio: 'Goiânia' }).pendencias.some((p) => /não está na tabela/.test(p.texto)));
});

test('política com versão: mínima nunca abaixo de 35%, alvo acima da mínima, a simulação usa a versão em vigor', () => {
  const a = base();
  assert.match(a.lic('s_dora', 'politicaSalvar', { campos: { margemMinPct: '30' }, motivo: 'Teste de redução' }).message, /entre 35 e 80/);
  assert.match(a.lic('s_dora', 'politicaSalvar', { campos: { margemAlvoPct: '36', margemMinPct: '38' }, motivo: 'Alvo abaixo da mínima' }).message, /não pode ficar abaixo/);
  const p = ok(a.lic('s_dora', 'politicaSalvar', { campos: { margemMinPct: '38', margemAlvoPct: '45', ufsEquipeRio: 'RJ' }, motivo: 'Diretoria sobe a sobra mínima' }));
  assert.equal(p.versao, 1);
  assert.equal(ok(a.lic('s_dora', 'politicaSalvar', { campos: { margemMinPct: '38' }, motivo: 'Mesmo valor de novo' })).semMudanca, true);
  const r = calc(a, 'op1', [{ codigo: 'CAL-001', quantidade: 1 }], { uf: 'ES', municipio: 'Vitória', kmTrecho: '1000' });
  assert.equal(r.politica.licitacao.versao, 1); assert.equal(r.viagem.base, 'GO', 'ES saiu da equipe do Rio');
  assert.equal(r.itens[0].pisoUnit, Math.ceil(r.itens[0].custoUnitTotal / (1 - 0.1425 - 0.38) * 100 - 1e-9) / 100);
  assert.ok(a.tabelas.LIC_HISTORICO.some((h) => h.TIPO === 'POLITICA_DE_PRECOS'));
});

test('simulações imutáveis: cada salvar é uma versão nova, a anterior não muda, o hash confere, a conta é refeita no servidor e o histórico registra', () => {
  const a = base();
  const itens = [{ numero: '1', codigo: 'CAL-001', quantidade: 100, precoEdital: '90,00' }];
  assert.match(a.lic('s_dora', 'simulacaoSalvar', { id: 'op1', entrada: { itens, execucao: exec() }, motivo: 'curto' }).message, /motivo/);
  const s1 = ok(a.lic('s_dora', 'simulacaoSalvar', { id: 'op1', entrada: { itens, execucao: exec() }, motivo: 'Primeira simulação da Diretoria', resultado: { totais: { piso: 1 } } }));
  assert.equal(s1.versao, 1); assert.match(s1.texto, /Refazer análise/);
  assert.equal(s1.simulacao.resultado.totais.piso, 17717, 'a conta enviada pela tela é ignorada');
  const v1 = JSON.stringify(a.tabelas.LIC_SIMULACOES[0]);
  // a tabela muda depois: a versão salva continua com o que usou
  ok(a.lic('s_dora', 'itemSalvar', { id: linha(a, 'CAL-001').ID, campos: { custo: '40' }, motivo: 'Custo novo depois da simulação' }));
  const s2 = ok(a.lic('s_dora', 'simulacaoSalvar', { id: 'op1', entrada: { itens, execucao: exec() }, motivo: 'Segunda versão com custo novo' }));
  assert.equal(s2.versao, 2);
  assert.equal(JSON.stringify(a.tabelas.LIC_SIMULACOES[0]), v1, 'a versão 1 não mudou');
  const ver1 = ok(a.lic('s_dora', 'simulacaoVer', { id: 'op1', versao: 1 })).simulacao;
  assert.equal(ver1.integra, true); assert.equal(ver1.resultado.itens[0].custoUnitBase, 64.7); assert.equal(ver1.resultado.itens[0].precoVersao, 1);
  assert.equal(ok(a.lic('s_dora', 'simulacaoVer', { id: 'op1', versao: 2 })).simulacao.resultado.itens[0].custoUnitBase, 40);
  // alteração fora do sistema aparece
  a.tabelas.LIC_SIMULACOES[0].RESULTADO_JSON = a.tabelas.LIC_SIMULACOES[0].RESULTADO_JSON.replace('17717', '1');
  assert.equal(ok(a.lic('s_dora', 'simulacaoVer', { id: 'op1', versao: 1 })).simulacao.integra, false);
  // não existe ação de alterar uma simulação salva
  for (const op of ['simulacaoAlterar', 'simulacaoApagar', 'simulacaoEditar']) assert.match(a.lic('s_dora', op, { id: 'op1', versao: 1 }).message, /desconhecida/);
  const h = a.tabelas.LIC_HISTORICO.filter((x) => x.TIPO === 'SIMULACAO_DE_PRECO');
  assert.equal(h.length, 2); assert.match(h[1].DE, /versão 1/); assert.match(h[1].PARA, /versão 2/); assert.equal(h[1].USUARIO_NOME, 'DORA DIRETORA TESTE');
  // a aba Preço abre com a última versão como rascunho e as versões
  const ab = ok(a.lic('s_dora', 'simulacao', { id: 'op1' }));
  assert.equal(ab.rascunhoDe, 'VERSAO'); assert.deepEqual(ab.versoes.map((v) => v.versao), [2, 1]);
});

test('rascunho com os itens do PNCP: número, descrição, quantidade e valor unitário; sigiloso fica sem preço; km sugerido', () => {
  const a = ambientePrecos({ oportunidades: OPS, itensFonte: [{ numeroItem: 1, descricao: 'Calibração de termômetros digitais', materialServico: 'S', quantidade: 100, unidade: 'UN', valorUnitario: 90, valorTotal: 9000, sigiloso: false },
    { numeroItem: 2, descricao: 'Qualificação de autoclave', materialServico: 'S', quantidade: 1, valorUnitario: null, sigiloso: true }] });
  const r = ok(a.lic('s_dora', 'simulacao', { id: 'op1' }));
  assert.equal(r.rascunhoDe, 'PNCP');
  assert.deepEqual(r.rascunho.itens.map((i) => [i.numero, i.quantidade, i.precoEdital, i.origem]), [['1', 100, 90, 'PNCP'], ['2', 1, '', 'PNCP']]);
  assert.equal(r.rascunho.execucao.kmTrecho, 228); assert.equal(r.rascunho.execucao.kmFonte, 'SUGERIDO');
});

test('nota: o critério margem usa a última simulação salva (pontos pelo piso e pelo edital); sem simulação continua 5 com pendência; a base da análise muda só com simulação', () => {
  const a = base();
  const pesos = a.ctx.Lic_pesos_();
  const l = () => a.tabelas.LIC_OPORTUNIDADES.find((x) => x.ID === 'op1');
  const baseSem = a.ctx.Lic_baseAnalise_(l(), null, null, pesos);
  let c = a.ctx.Lic_criteriosCodigo_(l(), pesos, '2026-11-02');
  assert.equal(c.criterios.margem.pontos, 5 * pesos.margem / 15); assert.equal(c.criterios.margem.origem, 'CODIGO');
  assert.ok(c.afirmacoes.some((x) => x.criterio === 'margem' && x.tipo === 'PENDENCIA' && /aba Preço/.test(x.texto)));
  // edital abaixo do piso: 0
  ok(a.lic('s_dora', 'simulacaoSalvar', { id: 'op1', entrada: { itens: [{ codigo: 'CAL-001', quantidade: 100, precoEdital: '90' }], execucao: exec() }, motivo: 'Simulação para a nota' }));
  c = a.ctx.Lic_criteriosCodigo_(l(), pesos, '2026-11-02');
  assert.equal(c.criterios.margem.origem, 'SIMULACAO'); assert.equal(c.criterios.margem.pontos, 0);
  assert.match(c.criterios.margem.como, /Simulação de preço versão 1/);
  assert.ok(c.afirmacoes.some((x) => x.tipo === 'FATO' && x.criterio === 'margem' && /abaixo do piso/.test(x.texto) && x.fonte.ref === 'SIMULACAO:v1'));
  const baseCom = a.ctx.Lic_baseAnalise_(l(), null, null, pesos);
  assert.notEqual(baseCom, baseSem, 'simulação nova: a análise fica desatualizada');
  // edital acima do alvo: 15; entre a mínima e o alvo: 11
  ok(a.lic('s_dora', 'simulacaoSalvar', { id: 'op1', entrada: { itens: [{ codigo: 'CAL-001', quantidade: 100, precoEdital: '250' }], execucao: exec() }, motivo: 'Edital com preço bom' }));
  assert.equal(a.ctx.Lic_criteriosCodigo_(l(), pesos, '2026-11-02').criterios.margem.pontos, 15 * pesos.margem / 15);
  ok(a.lic('s_dora', 'simulacaoSalvar', { id: 'op1', entrada: { itens: [{ codigo: 'CAL-001', quantidade: 100, precoEdital: '185' }], execucao: exec() }, motivo: 'Edital entre o piso e o alvo' }));
  assert.equal(a.ctx.Lic_criteriosCodigo_(l(), pesos, '2026-11-02').criterios.margem.pontos, 11 * pesos.margem / 15);
  // com pendência: 5, como pendência
  ok(a.lic('s_dora', 'simulacaoSalvar', { id: 'op1', entrada: { itens: [{ codigo: 'QT-AUTOCLAVE-BT', quantidade: 1, precoEdital: '9000' }], execucao: exec() }, motivo: 'Com o ETO a confirmar' }));
  c = a.ctx.Lic_criteriosCodigo_(l(), pesos, '2026-11-02');
  assert.equal(c.criterios.margem.pontos, 5 * pesos.margem / 15); assert.match(c.criterios.margem.como, /pendência/);
  // outra oportunidade sem simulação: base igual à de antes
  const l3 = a.tabelas.LIC_OPORTUNIDADES.find((x) => x.ID === 'op3');
  assert.equal(a.ctx.LicP_baseNota_(l3), '');
});

test('permissão: só Diretoria e Administrador; os outros perfis são recusados e nada é gravado', () => {
  const a = base();
  const antes = JSON.stringify([a.tabelas.LIC_PRECOS, a.tabelas.LIC_SIMULACOES || [], a.tabelas.LIC_CONFIG || []]);
  for (const sid of ['s_gaspar', 's_vera', 's_tiago', 's_fabio', 's_rita', 's_mara']) {
    for (const op of ['tabela', 'importarPrevia', 'importar', 'itemSalvar', 'politicaSalvar', 'simulacao', 'simulacaoCalcular', 'simulacaoSalvar', 'simulacaoVer']) {
      const r = a.lic(sid, op, { id: linha(a, 'CAL-001').ID, campos: { precoReferencia: '1' }, motivo: 'tentativa sem permissão', entrada: {} });
      assert.equal(r.ok, false, sid + ' ' + op); assert.equal(r.semAcesso, true, sid + ' ' + op);
    }
  }
  assert.equal(JSON.stringify([a.tabelas.LIC_PRECOS, a.tabelas.LIC_SIMULACOES || [], a.tabelas.LIC_CONFIG || []]), antes);
  ok(a.lic('s_admin', 'tabela'));
});

test('sem o Comercial no projeto: a tabela abre com o aviso e o simulador diz o porquê (operador nunca no limbo)', () => {
  const a = ambientePrecos({ oportunidades: OPS, catalogo: false });
  vm.runInContext('ComPr_politica_ = undefined;', a.ctx);
  const t = ok(a.lic('s_dora', 'tabela'));
  assert.match(t.aviso, /não está disponível neste ambiente/);
  assert.match(ok(a.lic('s_dora', 'simulacao', { id: 'op1' })).msgSemComercial, /não está disponível/);
  assert.match(a.lic('s_dora', 'simulacaoCalcular', { id: 'op1', entrada: {} }).message, /não está disponível.*Nada foi alterado/);
});

// ---------------------------------------------------------------- telas
function tela() {
  const els = {};
  const el = (id) => (els[id] = els[id] || { id, style: {}, innerHTML: '', value: '', querySelectorAll: () => [], querySelector: () => null, addEventListener() {} });
  el('conteudo'); el('licCorpo'); el('licPreco');
  const chamadas = [];
  const ctx = vm.createContext({ console, window: {}, setTimeout, USER_CONTEXT: { perfil: 'DIRETORIA' },
    document: { getElementById: (id) => els[id] || null, querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, removeEventListener() {}, body: { appendChild() {} }, createElement: () => el('x' + Math.random()) },
    ehMobileModo_: () => false, atualizarTituloMobile_() {}, abrir() {}, SGO_getSessionId: () => 's',
    google: { script: { run: { withSuccessHandler() { return { withFailureHandler() { return { Licitacoes_api: (sid, acao, d) => { chamadas.push(acao + ':' + (d && d.op)); } }; } }; } } } } });
  const html = {};
  for (const f of ['JS_Licitacoes.html', 'JS_Licitacoes_Precos.html']) {
    html[f] = fs.readFileSync(path.join(pasta, f), 'utf8');
    vm.runInContext(html[f].slice(html[f].indexOf('<script>') + 8, html[f].lastIndexOf('</script>')), ctx);
  }
  return { ctx, els, chamadas, html };
}

test('telas: tabela de preços, aba Preço com a conta inteira, item abaixo do piso em vermelho com texto, escape do que vem do edital, celular de 390 px', () => {
  const a = base();
  const t = tela();
  // a tela da tabela com os dados reais do servidor
  const tab = ok(a.lic('s_dora', 'tabela'));
  tab.itens[0].nome = '<img src=x onerror=alert(1)>';
  const ht = t.ctx.LicPr_htmlTabela_(tab);
  assert.doesNotMatch(ht, /<img src=x/); assert.match(ht, /&lt;img src=x/);
  assert.match(ht, /data-lpr-importar>Importar do catálogo/); assert.match(ht, /Mudar a política/);
  assert.match(ht, /Preço a confirmar/); assert.match(ht, /abaixo do piso/);
  const tds = ht.match(/<td[^>]*>/g) || []; assert.ok(tds.length > 20 && tds.every((x) => /data-r="/.test(x)), 'células viram cartão no celular');
  // a aba Preço: formulário e resultado
  const sim = ok(a.lic('s_dora', 'simulacao', { id: 'op1' }));
  sim.rascunho.itens = [{ numero: '1', descricao: '"><script>alert(1)</script>', codigo: 'CAL-001', quantidade: 100, pontos: '', precoEdital: 90.5, precoProposta: '', origem: 'PNCP' }];
  const res = calc(a, 'op1', [{ numero: '1', descricao: '<b>x</b>', codigo: 'CAL-001', quantidade: 100, precoEdital: '90' }, { numero: '2', codigo: 'CAL-001', quantidade: 1, precoEdital: '300' }]);
  const st = { dados: sim, rascunho: sim.rascunho, resultado: res, ver: 0 };
  const hf = t.ctx.LicPr_htmlAba_(st);
  assert.doesNotMatch(hf, /<script>alert/); assert.match(hf, /&lt;script&gt;/);
  assert.match(hf, /value="90,5"/, 'número no campo com vírgula decimal');
  assert.match(hf, /Pontos por equipamento \(mínimo 3\)/, 'serviço por pontos mostra o campo dos pontos');
  assert.match(hf, /data-lpr-calcular>Calcular \(não grava\)/); assert.match(hf, /Salvar simulação \(versão nova\)/);
  assert.match(hf, /<tr class="lpr-linha-abaixo">/); assert.match(hf, /abaixo do piso/);
  assert.equal((hf.match(/<tr class="lpr-linha-abaixo">/g) || []).length, 1, 'só o item abaixo do piso fica vermelho');
  const piso = (hf.match(/Piso = [^<]*/) || [''])[0];
  assert.match(piso, /Piso = custo unitário ÷ \(1 − 14,25% de impostos − 0,00% de comissão − 35,0% de sobra\) = R\$\s176,68 \(total R\$\s17\.668,00\)/);
  assert.match(hf, /Incentivo de Missão/); assert.match(hf, /Premissas e versões usadas/); assert.match(hf, /Política de Licitações versão 0 · Comercial versão 1/);
  // versão salva: só leitura, com o hash e o aviso de alteração fora do sistema
  const vs = t.ctx.LicPr_htmlAba_({ dados: Object.assign({}, sim, { versoes: [{ versao: 1, em: '2026-11-02T10:00:00Z', por: 'Dora' }] }), rascunho: sim.rascunho, ver: 1, verSim: { versao: 1, em: '2026-11-02T10:00:00Z', por: 'Dora', motivo: 'm', hash: 'a'.repeat(64), integra: false, resultado: res } });
  assert.match(vs, /salva, não muda/); assert.match(vs, /alterado fora do SGO\+/); assert.doesNotMatch(vs, /data-lpr-calcular/);
  // ficha: a aba Preço existe e chama o servidor só quando aberta
  const ficha = t.ctx.Lic_htmlFicha_({ op: { id: 'op1', codigo: 'LIC-2026-0001', uf: 'GO', selos: [], pendencias: [] }, historico: [] }, 'preco');
  assert.match(ficha, /aria-selected="true" data-lic-fab="preco">Preço<\/button>/); assert.match(ficha, /id="licPreco"/);
  t.ctx.LicPr_ligarAbaPreco_({}, {}, 'op1'); assert.deepEqual(t.chamadas, ['precos:simulacao']);
  // celular de 390 px: nada de largura fixa maior que a tela; toque de 44 px nos resumos
  const css = t.html['JS_Licitacoes_Precos.html'];
  for (const m of css.matchAll(/(?:^|[^-])width:\s*(\d+)px/g)) assert.ok(Number(m[1]) <= 360, 'largura fixa ' + m[0]);
  assert.match(css, /minmax\(150px, 1fr\)/); assert.match(css, /\.lpr-det summary \{[^}]*min-height: 44px/);
  assert.doesNotMatch(css, /setInterval/);
  assert.match(css, /\r\n/, 'JS_*.html em CRLF como os demais');
});

test('integração na casca: menu, rota, inclusão do arquivo novo, navegação do celular, ajuda da tela e manual', () => {
  const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8');
  const idx = ler('Index.html');
  assert.match(idx, /data-mod="licitacoes_precos"[^>]*onclick="abrir\('licitacoes_precos'\)"[^>]*>.*Preços de licitação<\/button>/);
  assert.match(idx, /<\?!= include\('JS_Licitacoes_Precos'\); \?>/);
  assert.ok(fs.existsSync(path.join(pasta, 'JS_Licitacoes_Precos.html')));
  const js = ler('JS_Licitacoes.html');
  assert.match(js, /\["licitacoes_precos", "Preços"\]/); assert.match(js, /licitacoes_precos: "Preços de licitação"/);
  assert.match(js, /LIC\.mod === "licitacoes_precos"\) \{ if \(typeof LicPr_renderTabela_ === "function"\)/);
  assert.match(ler('SGO_Licitacoes.js'), /precos: function \(eu, d\) \{ return LicP_acao_\(eu, d\); \}/);
  const a = ambientePrecos({ catalogo: false });
  vm.runInContext(ler('SGO_Ajuda.js').replace(/\r\n/g, '\n'), a.ctx);
  const t = a.ctx.SGO_ajudaTelas_LicitacoesPrecos_().licitacoes_precos;
  assert.ok(t.titulo && t.paraQueServe && t.passos.length && t.cores.length && t.problemas.length && t.quemPode.length && t.perguntas.length);
  assert.ok(a.ctx.SGO_AJUDA_NOMES.licitacoes_precos);
  assert.ok(a.ctx.SGO_Ajuda_todas_().telas.licitacoes_precos);
  assert.ok(a.ctx.SGO_ajudaTelas_Licitacoes_().licitacoes_oportunidades.passos.some((p) => p.titulo === 'Preço (simulador)'));
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_LICITACOES.md'), 'utf8');
  assert.match(manual, /## Preços de licitação e simulador/);
  const textos = ['SGO_Licitacoes_Precos.js', 'JS_Licitacoes_Precos.html', 'SGO_Ajuda_LicitacoesPrecos.js'].map(ler).join('\n') + manual;
  assert.doesNotMatch(textos, /antiburro/i);
});
