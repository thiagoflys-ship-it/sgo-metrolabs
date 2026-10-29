// Comercial — especialista em precificação (29/10/2026, pedido do dono): "calcular o deslocamento de 1 ou 2 técnicos ou
// engenheiros; R$ 2,50 por km rodado, mais pedágios, alimentação e combustíveis, mais diária; o benefício do programa de
// conduta, R$ 300 por viagem por colaborador, tem que ser repassado; checklist para não deixar passar jamais esses custos;
// política de acréscimos e reajuste; um especialista cuidando das oportunidades, estratégias e reajustes".
// Código real num contexto isolado (tests/_comercial_ambiente.cjs). Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const textoDe = (html) => html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const reg = (amb, id) => amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === id);
const ANEXO = { nome: 'aceite.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF').toString('base64') };

/** Ambiente com a unidade em Rio Verde/GO, a tabela de distâncias e os parâmetros do Programa de conduta. */
function amb0(o) {
  const amb = ambiente(Object.assign({ tabelas: { qual_distancia_referencia: [{ ID: 'd1', DESTINO: 'Rio Verde/GO', KM_TRECHO: 228 }, { ID: 'd2', DESTINO: 'Anapolis/GO', KM_TRECHO: 57 }] } }, o || {}));
  amb.tabelas.CAD_UNIDADES[0].CIDADE = 'Rio Verde';
  amb.ctx.CONDUTA_SHEETS = { DISTANCIA_REFERENCIA: 'qual_distancia_referencia' };
  amb.ctx.Conduta_obterParametros_ = () => ({ VALOR_INCENTIVO_MISSAO: 300, MISSAO_KM_MINIMO: 200 });
  return amb;
}
/** A Diretoria grava a política (só os campos passados mudam). */
function politica(amb, campos, sid) {
  const m = ok(amb.api('s_dora', 'metodologia')).metodologia;
  delete m.versao; delete m.atualizadaEm; delete m.atualizadaPor;
  m.precificacao = Object.assign({}, m.precificacao, campos);
  return amb.api(sid || 's_dora', 'metodologia', { salvar: m, motivo: 'Política de precificação de teste' });
}
const POL = { impostosPct: 15, margemMinPct: 25, margemAlvoPct: 35, alimentacaoPessoaDia: 60, diariaPessoaDia: { TECNICO: 150, ENGENHEIRO: 250 }, hospedagemPessoaNoite: 180 };
const VIAGEM = { ha: 'SIM', tecnicos: 1, engenheiros: 1, destino: 'Rio Verde/GO', kmTrecho: '228', dias: 2, noites: 1, viagens: 1, linhas: { PEDAGIO: { valor: '45,00' } } };

function rascunho(amb, extra, itens) {
  const { oportunidade } = oportunidadeDeTeste(amb);
  const np = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  const s = ok(amb.api('s_vera', 'salvarProposta', Object.assign({ id: np.proposta.id, escopo: 'Qualificação térmica da autoclave da CME, com relatório.',
    itens: itens || [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '9.000,00', equipamentoId: 'eq1' }], condicoes: { pagamento: 'Boleto em 28 dias', prazoExecucao: 'A combinar', garantia: '90 dias' } }, extra || {})));
  return { id: np.proposta.id, salvo: s, oportunidade };
}

test('cálculo da viagem: engenheiro + técnico a Rio Verde (228 km), 2 dias e 1 noite; km a R$ 2,50 ida e volta, pedágio, alimentação, diárias por função, hospedagem e o benefício da Conduta em dobro; item repassado com impostos e arredondado', () => {
  const amb = amb0();
  ok(politica(amb, POL));
  const { id, salvo } = rascunho(amb, { deslocamento: { viagem: VIAGEM } });
  const d = salvo.proposta.deslocamento, l = Object.fromEntries(d.calculo.linhas.map((x) => [x.codigo, x]));
  assert.equal(l.KM.total, 1140, '228 x 2 x 2,50');
  assert.equal(l.PEDAGIO.total, 45);
  assert.equal(l.ALIMENTACAO.total, 240, '2 pessoas x 2 dias x 60');
  assert.equal(l.DIARIA.total, 800, '(150 + 250) x 2 dias');
  assert.equal(l.HOSPEDAGEM.total, 360, '2 pessoas x 1 noite x 180');
  assert.equal(l.CONDUTA.total, 600, 'R$ 300 por colaborador por viagem: dois colaboradores dobram');
  assert.equal(l.COMBUSTIVEL.nsa, true); assert.match(l.COMBUSTIVEL.motivo, /Veículo da empresa: o valor por km rodado já cobre o combustível/);
  assert.equal(d.calculo.custo, 3185);
  assert.equal(d.checklist.ok, true, JSON.stringify(d.checklist.faltas));
  const item = reg(amb, id) && JSON.parse(reg(amb, id).ITENS_JSON).find((i) => i.auto === 'DESLOCAMENTO');
  assert.equal(item.descricao, 'Despesas de deslocamento e estadia');
  assert.equal(item.precoUnitario, 3750, '3.185 / (1 - 15%) = 3.747,06, arredondado para cima a R$ 10');
  assert.equal(item.custoUnitario, 3185);
  assert.equal(salvo.proposta.tipoOrcamento, 'SERVICOS', 'o item automático não muda o tipo de orçamento');
  assert.equal(reg(amb, id).TOTAL, 12750);
  // documento ao cliente: o item aparece; o benefício da Conduta nunca aparece com esse nome
  ok(amb.api('s_vera', 'concluirProposta', { id }));
  const g = ok(amb.api('s_vera', 'gerarDocumento', { id }));
  const t = textoDe(amb.arquivos[g.htmlId].bytes.toString('utf8'));
  assert.match(t, /Despesas de deslocamento e estadia/);
  assert.match(t, /Equipe de 2 profissionais \(1 engenheiro e 1 técnico\); 1 viagem de Goiânia\/GO a Rio Verde\/GO; 2 dias e 1 noite por viagem\. Inclui deslocamento, pedágios, alimentação, hospedagem e diárias\./);
  assert.match(t, /R\$ 3\.750,00/);
  assert.doesNotMatch(t, /conduta|benef[ií]cio|incentivo|\bmiss[ãa]o|3\.185/i);
  // fotografia da precificação gravada ao concluir
  const f = JSON.parse(reg(amb, id).PRECIFICACAO_JSON);
  assert.equal(f.custoViagem, 3185); assert.equal(f.beneficio, 600); assert.equal(f.repasse, 'ITEM'); assert.equal(f.viagem, true);
});

test('checklist obrigatório: serviço sem resposta sobre a viagem não conclui; valor sem padrão na política é cobrado; "não se aplica" exige motivo; sem viagem exige motivo', () => {
  const amb = amb0();
  const a = rascunho(amb);
  let r = amb.api('s_vera', 'concluirProposta', { id: a.id });
  assert.equal(r.ok, false);
  assert.match(r.message, /checklist de custos está incompleto \(diga se o serviço tem viagem/);
  assert.match(r.message, /Todo custo de campo precisa entrar no preço/);
  assert.match(r.message, /preencha "Custos da viagem e do frete" no rascunho/);
  // política sem valores de alimentação, diárias e hospedagem (padrão: vazios)
  const s = ok(amb.api('s_vera', 'salvarProposta', { id: a.id, itens: [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '9.000,00' }], deslocamento: { viagem: VIAGEM } }));
  assert.match(s.message, /Custos da viagem e do frete: \d+ itens do checklist faltam/);
  r = amb.api('s_vera', 'concluirProposta', { id: a.id });
  assert.equal(r.ok, false);
  assert.match(r.message, /Alimentação: sem valor \(a política ainda não tem o valor padrão\); informe o valor por pessoa por dia ou marque "não se aplica" com o motivo/);
  assert.match(r.message, /Diária do técnico: sem valor/); assert.match(r.message, /Diária do engenheiro: sem valor/);
  assert.match(r.message, /Hospedagem: sem valor/);
  assert.doesNotMatch(r.message, /Km rodado/, 'o km tem padrão na política (R$ 2,50)');
  // "não se aplica" sem motivo continua travando
  ok(amb.api('s_vera', 'salvarProposta', { id: a.id, itens: [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '9.000,00' }],
    deslocamento: { viagem: { linhas: { ALIMENTACAO: { nsa: true, motivo: '' }, DIARIA: { valorTecnico: '150', valorEngenheiro: '250' }, HOSPEDAGEM: { valor: '200' } } } } }));
  r = amb.api('s_vera', 'concluirProposta', { id: a.id });
  assert.match(r.message, /Alimentação: "não se aplica" precisa do motivo/);
  ok(amb.api('s_vera', 'salvarProposta', { id: a.id, itens: [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '9.000,00' }],
    deslocamento: { viagem: { linhas: { ALIMENTACAO: { nsa: true, motivo: 'Cliente fornece as refeições no refeitório' } } } } }));
  assert.equal(ok(amb.api('s_vera', 'concluirProposta', { id: a.id })).proposta.situacao, 'PRONTA');
  // sem viagem: o motivo é obrigatório
  const b = rascunho(amb, { deslocamento: { viagem: { ha: 'NAO', motivoSem: 'lab' } } });
  assert.match(amb.api('s_vera', 'concluirProposta', { id: b.id }).message, /escreva por que não há viagem \(pelo menos 10 letras\)/);
  ok(amb.api('s_vera', 'salvarProposta', { id: b.id, itens: [{ descricao: 'Calibração de termômetro', quantidade: 1, precoUnitario: '300' }], deslocamento: SEM_VIAGEM }));
  ok(amb.api('s_vera', 'concluirProposta', { id: b.id }));
  // valor inválido: mensagem diz o que fazer
  const c = rascunho(amb);
  const ruim = amb.api('s_vera', 'salvarProposta', { id: c.id, deslocamento: { viagem: { linhas: { PEDAGIO: { valor: 'quarenta' } } } } });
  assert.equal(ruim.ok, false); assert.match(ruim.message, /o valor de pedágios \("quarenta"\) não é um número\. Use, por exemplo, 45,00/);
});

test('edge cases: atendimento local (0 km), trecho abaixo do mínimo da Conduta, sem pernoite, 3 técnicos, avião com passagem; repasse diluído não cria item', () => {
  const amb = amb0();
  ok(politica(amb, POL));
  const a = rascunho(amb, { deslocamento: { viagem: { ha: 'SIM', tecnicos: 1, destino: 'Goiânia/GO', kmTrecho: '0', dias: 1, noites: 0 } } });
  const l = Object.fromEntries(a.salvo.proposta.deslocamento.calculo.linhas.map((x) => [x.codigo, x]));
  assert.equal(l.KM.nsa, true); assert.match(l.KM.motivo, /Atendimento local/);
  assert.equal(l.PEDAGIO.nsa, true); assert.equal(l.HOSPEDAGEM.nsa, true); assert.match(l.HOSPEDAGEM.motivo, /Sem pernoite/);
  assert.equal(l.CONDUTA.nsa, true); assert.match(l.CONDUTA.motivo, /Trecho de 0 km, abaixo do mínimo de 200 km do Programa de conduta/);
  assert.equal(a.salvo.proposta.deslocamento.calculo.custo, 210, 'alimentação 60 + diária 150');
  assert.equal(a.salvo.proposta.deslocamento.checklist.ok, true);
  // Anápolis (57 km): abaixo do mínimo; benefício sai mesmo que o vendedor tente marcar valor
  const b = rascunho(amb, { deslocamento: { viagem: { ha: 'SIM', tecnicos: 3, destino: 'Anapolis/GO', kmTrecho: '57', dias: 1, noites: 0, linhas: { PEDAGIO: { nsa: true, motivo: 'Sem pedágio no trajeto' }, CONDUTA: { valor: '300' } } } } });
  const lb = Object.fromEntries(b.salvo.proposta.deslocamento.calculo.linhas.map((x) => [x.codigo, x]));
  assert.equal(lb.CONDUTA.total, 0); assert.equal(lb.KM.total, 285, '57 x 2 x 2,50');
  assert.equal(lb.ALIMENTACAO.total, 180, '3 técnicos x 1 dia x 60');
  // 3 técnicos a 300 km: benefício x3
  const c = rascunho(amb, { deslocamento: { viagem: { ha: 'SIM', tecnicos: 3, destino: 'Uberlândia/MG', kmTrecho: '340', dias: 1, noites: 1, linhas: { PEDAGIO: { valor: '80' } } } } });
  assert.equal(c.salvo.proposta.deslocamento.calculo.beneficio, 900);
  // avião: o combustível/passagem deixa de ser automático e é cobrado
  const d = rascunho(amb, { deslocamento: { viagem: { ha: 'SIM', engenheiros: 1, transporte: 'AVIAO', destino: 'Palmas/TO', kmTrecho: '830', dias: 2, noites: 2, linhas: { PEDAGIO: { nsa: true, motivo: 'Viagem de avião' }, KM: { nsa: true, motivo: 'Viagem de avião; táxi em outros custos' } } } } });
  assert.match(amb.api('s_vera', 'concluirProposta', { id: d.id }).message, /Combustível adicional ou passagem: sem valor/);
  ok(amb.api('s_vera', 'salvarProposta', { id: d.id, itens: [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '9.000,00' }], deslocamento: { viagem: { linhas: { COMBUSTIVEL: { valor: '1.800,00' }, OUTROS: { valor: '200', descricao: 'Táxi do aeroporto' } } } } }));
  const dd = ok(amb.api('s_vera', 'proposta', { id: d.id })).proposta.deslocamento;
  assert.equal(dd.calculo.linhas.find((x) => x.codigo === 'COMBUSTIVEL').total, 1800);
  assert.equal(dd.calculo.linhas.find((x) => x.codigo === 'CONDUTA').total, 300, 'engenheiro sozinho a 830 km');
  // diluído: sem item automático; o custo entra na margem
  const e = rascunho(amb, { deslocamento: { viagem: VIAGEM, repasse: 'DILUIDO' } });
  assert.equal(JSON.parse(reg(amb, e.id).ITENS_JSON).filter((i) => i.auto).length, 0);
  const ge = ok(amb.api('s_gaspar', 'proposta', { id: e.id })).proposta.deslocamento;
  assert.equal(ge.analise.custoDeslocamento, 3185);
  assert.equal(ge.diluir, 3747.06, 'quanto diluir nos serviços: custo mais impostos');
  // trocar para item cria o item; voltar para diluído tira
  ok(amb.api('s_vera', 'salvarProposta', { id: e.id, itens: [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '9.000,00' }], deslocamento: { repasse: 'ITEM' } }));
  assert.equal(JSON.parse(reg(amb, e.id).ITENS_JSON).filter((i) => i.auto === 'DESLOCAMENTO').length, 1);
});

test('margem e alçada: abaixo da mínima vai para aprovação e só a Diretoria aprova (o gestor comercial pode negar); vendedor vê só a situação da margem', () => {
  const amb = amb0();
  ok(politica(amb, POL));
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'QT-AC', nome: 'Qualificação térmica de autoclave', tipo: 'SERVICO', preco: '6.000,00', custo: '3.000,00' }));
  const prod = ok(amb.api('s_gaspar', 'catalogo')).produtos[0];
  const a = rascunho(amb, { deslocamento: { viagem: VIAGEM, repasse: 'DILUIDO' } }, [{ produtoId: prod.id, descricao: prod.nome, quantidade: 1, precoUnitario: '6.000,00' }]);
  // 6.000 - 900 (15%) - 3.000 - 3.185 = -1.085: abaixo da mínima
  const vv = ok(amb.api('s_vera', 'proposta', { id: a.id })).proposta;
  assert.equal(vv.deslocamento.analise, undefined, 'vendedor não vê custo e margem em número');
  assert.equal(vv.deslocamento.margem.situacao, 'ABAIXO_MIN');
  assert.equal(vv.politica.exigeDiretoria, true);
  const gg = ok(amb.api('s_gaspar', 'proposta', { id: a.id })).proposta.deslocamento;
  assert.equal(gg.analise.custoTotal, 6185); assert.equal(gg.analise.impostos, 900); assert.equal(gg.analise.margemPct, -18.08);
  assert.equal(gg.analise.precoMinimo, 10308.33, '6.185 / (1 - 15% - 25%)');
  let r = amb.api('s_vera', 'concluirProposta', { id: a.id });
  assert.match(r.message, /abaixo da mínima de 25,0% da política de precificação; só a Diretoria aprova/);
  assert.match(r.message, /precisa da aprovação da Diretoria/);
  ok(amb.api('s_vera', 'concluirProposta', { id: a.id, justificativa: 'Cliente estratégico; abre contrato anual de manutenção' }));
  assert.equal(reg(amb, a.id).SITUACAO, 'AGUARDANDO_APROVACAO');
  assert.ok(amb.tabelas.COM_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_dir' && v.TIPO === 'MARGEM_DIRETORIA'), 'a Diretoria é avisada');
  const pg = ok(amb.api('s_gaspar', 'proposta', { id: a.id })).proposta;
  assert.equal(pg.podeDecidirDesconto, true); assert.equal(pg.podeAprovarDesconto, false);
  r = amb.api('s_gaspar', 'decidirDesconto', { id: a.id, aprovar: true, texto: 'Aprovo pelo contrato anual' });
  assert.equal(r.ok, false); assert.match(r.message, /essa exceção é da Diretoria/);
  ok(amb.api('s_dora', 'decidirDesconto', { id: a.id, aprovar: true, texto: 'Aprovado pela Diretoria: contrato anual' }));
  assert.equal(reg(amb, a.id).SITUACAO, 'PRONTA');
  // o gestor comercial nega: volta para rascunho
  const b = rascunho(amb, { deslocamento: { viagem: VIAGEM, repasse: 'DILUIDO' } }, [{ produtoId: prod.id, descricao: prod.nome, quantidade: 1, precoUnitario: '6.000,00' }]);
  ok(amb.api('s_vera', 'concluirProposta', { id: b.id, justificativa: 'Cliente estratégico; abre contrato anual' }));
  ok(amb.api('s_gaspar', 'decidirDesconto', { id: b.id, aprovar: false, texto: 'Suba o preço dos serviços: a viagem está diluída' }));
  assert.equal(reg(amb, b.id).SITUACAO, 'RASCUNHO');
  // com o preço acima do mínimo, conclui direto
  ok(amb.api('s_vera', 'salvarProposta', { id: b.id, itens: [{ produtoId: prod.id, descricao: prod.nome, quantidade: 1, precoUnitario: '11.000,00' }] }));
  assert.equal(ok(amb.api('s_vera', 'concluirProposta', { id: b.id })).proposta.situacao, 'PRONTA');
});

test('desconto geral sobre o deslocamento: a gestora aponta o custo não repassado; revisão da proposta copia a viagem; passagem aos setores leva a viagem sem valor', () => {
  const amb = amb0();
  ok(politica(amb, POL));
  const a = rascunho(amb, { deslocamento: { viagem: VIAGEM }, descontoGeral: '1.000,00' });
  const rv = ok(amb.api('s_vera', 'revisarProposta', { id: a.id, comIA: false }));
  assert.ok(rv.alertas.some((x) => /o desconto geral reduz o repasse da viagem: R\$ [\d.,]+ do custo de deslocamento não volta no preço/.test(x)), rv.alertas.join(' | '));
  ok(amb.api('s_vera', 'concluirProposta', { id: a.id, justificativa: 'Desconto combinado com a compradora' }));
  if (reg(amb, a.id).SITUACAO === 'AGUARDANDO_APROVACAO') ok(amb.api('s_gaspar', 'decidirDesconto', { id: a.id, aprovar: true, texto: 'Aprovado pela gestão comercial' }));
  ok(amb.api('s_vera', 'gerarDocumento', { id: a.id }));
  ok(amb.api('s_vera', 'marcarEnviada', { id: a.id, como: 'Entregue em mãos na reunião com a CME' }));
  const nr = ok(amb.api('s_vera', 'novaRevisao', { id: a.id }));
  const nova = reg(amb, nr.proposta.id);
  assert.equal(nova.DESLOCAMENTO_JSON, reg(amb, a.id).DESLOCAMENTO_JSON, 'a revisão copia os custos da viagem');
  assert.equal(nr.proposta.deslocamento.calculo.custo, 3185);
  assert.ok(JSON.parse(nova.ITENS_JSON).some((i) => i.auto === 'DESLOCAMENTO'));
  // a nova revisão conclui e segue até a passagem aos setores
  ok(amb.api('s_vera', 'salvarProposta', { id: nova.ID, descontoGeral: '0', itens: JSON.parse(nova.ITENS_JSON) }));
  assert.equal(JSON.parse(reg(amb, nova.ID).ITENS_JSON).filter((i) => i.auto).length, 1, 'item automático vindo da tela não duplica');
  ok(amb.api('s_vera', 'concluirProposta', { id: nova.ID }));
  ok(amb.api('s_vera', 'gerarDocumento', { id: nova.ID }));
  ok(amb.api('s_vera', 'marcarEnviada', { id: nova.ID, como: 'Entregue em mãos na reunião com a CME' }));
  ok(amb.api('s_vera', 'respostaCliente', { id: nova.ID, resposta: 'APROVADA', texto: 'Aprovado por e-mail', arquivo: ANEXO }));
  ok(amb.api('s_vera', 'passarSetores', { id: nova.ID }));
  const tec = amb.tabelas.ATV_ATIVIDADES.find((x) => /Área técnica/.test(x.TITULO));
  assert.match(tec.DESCRICAO, /Viagem prevista na proposta: 1 engenheiro e 1 técnico; 1 viagem a Rio Verde\/GO \(228 km o trecho\); 2 dias e 1 noite por viagem/);
  assert.match(tec.DESCRICAO, /incentivo de missão do Programa de conduta para cada colaborador/);
  const fin = amb.tabelas.ATV_ATIVIDADES.find((x) => /Financeiro/.test(x.TITULO));
  assert.match(fin.DESCRICAO, /Viagem prevista/);
  [tec, fin].forEach((x) => assert.doesNotMatch(x.DESCRICAO, /R\$\s?\d/));
  assert.ok(!amb.tabelas.ATV_ATIVIDADES.some((x) => /Compras/.test(x.TITULO)), 'o item automático não cria setor');
});

test('produto: checklist de frete; frete vira item "Frete e entrega" sem mudar o tipo nem os setores; proposta mista cobra viagem e frete', () => {
  const amb = amb0();
  ok(politica(amb, POL));
  const p = rascunho(amb, {}, [{ tipo: 'PRODUTO', descricao: 'Termo-higrômetro digital', quantidade: 2, unidade: 'un', precoUnitario: '420,00' }]);
  let r = amb.api('s_vera', 'concluirProposta', { id: p.id });
  assert.match(r.message, /frete e entrega: informe o custo do frete ou marque "não se aplica" com o motivo/);
  assert.doesNotMatch(r.message, /diga se o serviço tem viagem/, 'proposta só de produto não pede viagem');
  const s = ok(amb.api('s_vera', 'salvarProposta', { id: p.id, itens: [{ tipo: 'PRODUTO', descricao: 'Termo-higrômetro digital', quantidade: 2, unidade: 'un', precoUnitario: '420,00' }], deslocamento: { frete: { valor: '85,00' } } }));
  assert.equal(s.proposta.tipoOrcamento, 'PRODUTOS');
  const fr = JSON.parse(reg(amb, p.id).ITENS_JSON).find((i) => i.auto === 'FRETE');
  assert.equal(fr.descricao, 'Frete e entrega'); assert.equal(fr.precoUnitario, 100, '85 / (1 - 15%) = 100,00');
  assert.equal(fr.tipo, 'PRODUTO');
  ok(amb.api('s_vera', 'concluirProposta', { id: p.id }));
  // misto: viagem e frete
  const m = rascunho(amb, {}, [{ tipo: 'PRODUTO', descricao: 'Termo-higrômetro digital', quantidade: 1, unidade: 'un', precoUnitario: '420,00' }, { descricao: 'Instalação e treinamento', quantidade: 1, precoUnitario: '800,00' }]);
  r = amb.api('s_vera', 'concluirProposta', { id: m.id });
  assert.match(r.message, /diga se o serviço tem viagem/); assert.match(r.message, /frete e entrega/);
  ok(amb.api('s_vera', 'salvarProposta', { id: m.id, itens: [{ tipo: 'PRODUTO', descricao: 'Termo-higrômetro digital', quantidade: 1, unidade: 'un', precoUnitario: '420,00' }, { descricao: 'Instalação e treinamento', quantidade: 1, precoUnitario: '800,00' }],
    deslocamento: { viagem: VIAGEM, frete: { nsa: true, motivo: 'Produto vai junto com a equipe na visita' } } }));
  assert.equal(ok(amb.api('s_vera', 'proposta', { id: m.id })).proposta.tipoOrcamento, 'MISTO');
});

test('política de precificação: só Diretoria e Administrador mudam (versão com motivo); gestor comercial é barrado; vendedor não vê impostos nem margens; valores inválidos recusados', () => {
  const amb = amb0();
  let r = politica(amb, { impostosPct: 12 }, 's_gaspar');
  assert.equal(r.ok, false); assert.match(r.message, /a política de precificação .* só é alterada pela Diretoria ou pelo Administrador/);
  // o gestor comercial continua salvando o resto da metodologia (política intacta)
  const m = ok(amb.api('s_gaspar', 'metodologia')).metodologia; delete m.versao; delete m.atualizadaEm; delete m.atualizadaPor;
  m.tese = 'Tese de teste do gestor comercial';
  ok(amb.api('s_gaspar', 'metodologia', { salvar: m, motivo: 'Ajuste da tese pelo gestor' }));
  r = ok(politica(amb, Object.assign({}, POL, { valorKm: '2,80' })));
  assert.match(r.message, /Metodologia salva \(versão \d+\)/);
  assert.equal(r.metodologia.precificacao.impostosPct, 15); assert.equal(r.metodologia.precificacao.valorKm, '2,80');
  assert.equal(amb.ctx.ComPr_politica_().valorKm, 2.8);
  const v = ok(amb.api('s_vera', 'metodologia'));
  assert.equal(v.metodologia.precificacao.impostosPct, null); assert.equal(v.metodologia.precificacao.margemMinPct, null);
  assert.equal(v.metodologia.precificacao.alimentacaoPessoaDia, 60, 'valores da viagem o vendedor vê');
  assert.equal(v.podeEditarPrecificacao, false);
  assert.match(politica(amb, { margemMinPct: 40, margemAlvoPct: 30 }).message, /a margem alvo \(30,0%\) não pode ser menor que a margem mínima \(40,0%\)/);
  assert.match(politica(amb, { impostosPct: 'muito' }).message, /"impostos sobre o faturamento" precisa ficar entre 0% e 60%/);
  assert.match(politica(amb, { alimentacaoPessoaDia: -5 }).message, /"alimentação por pessoa por dia" precisa ser um valor em reais/);
  // benefício: vem dos parâmetros do Programa de conduta
  amb.ctx.Conduta_obterParametros_ = () => ({ VALOR_INCENTIVO_MISSAO: '350', MISSAO_KM_MINIMO: '150' });
  const b = amb.ctx.ComPr_beneficio_(amb.ctx.ComPr_politica_());
  assert.equal(b.valor, 350); assert.equal(b.kmMinimo, 150); assert.match(b.fonte, /Programa de conduta/);
  amb.ctx.CONDUTA_SHEETS = undefined;
  assert.equal(amb.ctx.ComPr_beneficio_(amb.ctx.ComPr_politica_()).valor, 300, 'sem o programa, vale a reserva da política');
});

test('sugestão de destino e km pela tabela de distâncias da Conduta (cidade da unidade); sem referência, o vendedor digita', () => {
  const amb = amb0();
  const a = rascunho(amb);
  const d = ok(amb.api('s_vera', 'proposta', { id: a.id })).proposta.deslocamento;
  assert.equal(d.sugestao.destino, 'Rio Verde/GO'); assert.equal(d.sugestao.kmTrecho, 228); assert.equal(d.sugestao.kmFonte, 'REFERENCIA_CONDUTA');
  assert.ok(d.referencias.some((x) => x.destino === 'Anapolis/GO' && x.km === 57));
  assert.equal(d.politica.valorKm, 2.5); assert.equal(d.politica.origemPadrao, 'Goiânia/GO');
  assert.equal(d.beneficio.valor, 300);
  amb.tabelas.CAD_UNIDADES[0].CIDADE = 'Cidade Sem Referência';
  const d2 = ok(amb.api('s_vera', 'proposta', { id: a.id })).proposta.deslocamento;
  assert.equal(d2.sugestao.kmTrecho, null); assert.equal(d2.sugestao.destino, 'Cidade Sem Referência/GO');
});

test('reajuste do catálogo: só Diretoria; prévia por tipo, aplicar confere a prévia, histórico, desfazer o último (item mudado depois fica), agendado aplicado pela rotina', () => {
  const amb = amb0();
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'SRV-1', nome: 'Qualificação térmica de autoclave', tipo: 'SERVICO', preco: '4.500,00', custo: '2.000,00' }));
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'SRV-2', nome: 'Calibração de termômetro', tipo: 'SERVICO', preco: '320,00' }));
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'PRD-1', nome: 'Termo-higrômetro digital', tipo: 'PRODUTO', preco: '420,00' }));
  const dados = { selecao: { modo: 'TIPO', tipo: 'SERVICO' }, percentual: '4,5', indice: 'IPCA 12 meses (informado pela Diretoria)', arredondarPara: '1', motivo: 'Reajuste anual dos serviços pelo IPCA' };
  assert.match(amb.api('s_gaspar', 'reajustePrevia', dados).message, /o reajuste de preços do catálogo é da Diretoria/);
  const pv = ok(amb.api('s_dora', 'reajustePrevia', dados));
  assert.equal(pv.qtd, 2); assert.equal(pv._todas, undefined);
  const l = Object.fromEntries(pv.linhas.map((x) => [x.codigo, x]));
  assert.equal(l['SRV-1'].precoNovo, 4703, '4.500 x 1,045 = 4.702,50, arredondado a R$ 1'); assert.equal(l['SRV-2'].precoNovo, 334);
  assert.equal(amb.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === 'SRV-1').PRECO, 4500, 'a prévia não grava nada');
  assert.match(amb.api('s_dora', 'reajusteAplicar', Object.assign({}, dados, { marca: 'outra' })).message, /o catálogo ou a seleção mudou desde a prévia/);
  assert.match(amb.api('s_dora', 'reajusteAplicar', Object.assign({}, dados, { marca: pv.marca, motivo: 'curto' })).message, /escreva o motivo \(pelo menos 10 letras/);
  const ap = ok(amb.api('s_dora', 'reajusteAplicar', Object.assign({}, dados, { marca: pv.marca })));
  assert.match(ap.message, /Reajuste RJ-2026-0001 aplicado em 2 itens/);
  const srv1 = amb.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === 'SRV-1');
  assert.equal(srv1.PRECO, 4703); assert.equal(srv1.PRECO_DESDE, '2026-10-19');
  assert.equal(amb.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === 'PRD-1').PRECO, 420, 'produto fora da seleção');
  const h = ok(amb.api('s_gaspar', 'reajustes'));
  assert.equal(h.lotes[0].lote, 'RJ-2026-0001'); assert.equal(h.lotes[0].qtd, 2); assert.equal(h.lotes[0].por, 'DORA DIRETORA TESTE'); assert.equal(h.desfazivel, '', 'gestor vê o histórico, mas não desfaz');
  assert.ok(amb.tabelas.COM_REAJUSTES.every((x) => x.PRECO_ANTERIOR > 0 && x.MOTIVO && x.USUARIO_NOME && x.DATA));
  // alguém muda o preço de um item depois do reajuste: o desfazer mantém esse item
  ok(amb.api('s_gaspar', 'salvarProduto', { id: srv1.ID, codigo: 'SRV-1', nome: 'Qualificação térmica de autoclave', tipo: 'SERVICO', preco: '4.800,00', custo: '2.000,00' }));
  const df = ok(amb.api('s_dora', 'reajusteDesfazer', { lote: 'RJ-2026-0001', motivo: 'Índice informado errado; refazer com o IGP-M' }));
  assert.match(df.message, /1 item voltou ao preço anterior\. 1 item ficou como está \(o preço foi mudado depois do reajuste\): SRV-1/);
  assert.equal(amb.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === 'SRV-2').PRECO, 320);
  assert.equal(amb.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === 'SRV-1').PRECO, 4800);
  assert.match(amb.api('s_dora', 'reajusteDesfazer', { motivo: 'Desfazer de novo para testar' }).message, /não há reajuste aplicado ou agendado para desfazer/);
  // agendado: vigência futura; a rotina aplica no dia
  const dadosAg = { selecao: { modo: 'CATEGORIA', categoria: '' }, percentual: '10', vigencia: '2026-11-03', motivo: 'Reajuste dos produtos a partir de novembro' };
  assert.match(amb.api('s_dora', 'reajustePrevia', dadosAg).message, /escolha a categoria/);
  const pv2 = ok(amb.api('s_dora', 'reajustePrevia', { selecao: { modo: 'BUSCA', busca: 'termo higrometro' }, percentual: '10', vigencia: '2026-11-03', motivo: 'Reajuste dos produtos a partir de novembro' }));
  assert.equal(pv2.qtd, 1); assert.equal(pv2.agendado, true);
  assert.match(ok(amb.api('s_dora', 'reajusteAplicar', { selecao: { modo: 'BUSCA', busca: 'termo higrometro' }, percentual: '10', vigencia: '2026-11-03', motivo: 'Reajuste dos produtos a partir de novembro', marca: pv2.marca })).message, /agendado: 1 item muda de preço em 03\/11\/2026/);
  assert.equal(amb.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === 'PRD-1').PRECO, 420);
  assert.match(amb.api('s_dora', 'reajustePrevia', { selecao: { modo: 'TODOS' }, percentual: '5', vigencia: '2026-10-01', motivo: 'Reajuste retroativo de teste' }).message, /a vigência \(01\/10\/2026\) não pode ser no passado/);
  amb.mudar('2026-11-03T08:00:00-03:00');
  assert.equal(amb.ctx.ComPr_rotinaReajustes_(), 1);
  const prd = amb.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === 'PRD-1');
  assert.equal(prd.PRECO, 462); assert.equal(prd.PRECO_DESDE, '2026-11-03');
  assert.equal(amb.ctx.ComPr_rotinaReajustes_(), 0, 'não aplica duas vezes');
});

test('especialista contínuo: lista do vendedor cobra o checklist; panorama da gestão aponta política incompleta, benefício da Conduta tirado à mão e catálogo sem reajuste; painel "Precificação e estratégia"', () => {
  const amb = amb0();
  // rascunho com checklist incompleto aparece na lista do dia da vendedora
  const a = rascunho(amb, { deslocamento: { viagem: VIAGEM } });
  const hoje = ok(amb.api('s_vera', 'hoje', { papel: 'VENDEDOR' }));
  const it = hoje.itens.find((i) => i.regra === 'CHECKLIST_CUSTOS');
  assert.ok(it, JSON.stringify(hoje.itens.map((i) => i.regra)));
  assert.match(it.porque, /benefício do Programa de conduta de cada colaborador/); assert.match(it.acao, /Sem isso a proposta não conclui/);
  // panorama: política incompleta
  let pan = ok(amb.api('s_gaspar', 'hoje', { papel: 'GESTAO' }));
  assert.ok(pan.itens.some((i) => i.regra === 'POLITICA_INCOMPLETA' && /impostos sobre o faturamento/.test(i.titulo)), pan.itens.map((i) => i.titulo).join(' | '));
  // benefício tirado à mão numa viagem de 228 km
  ok(politica(amb, POL));
  ok(amb.api('s_vera', 'salvarProposta', { id: a.id, itens: [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '9.000,00' }], deslocamento: { viagem: { linhas: { CONDUTA: { nsa: true, motivo: 'Cliente não paga benefício' } } } } }));
  ok(amb.api('s_vera', 'concluirProposta', { id: a.id }));
  // item do catálogo sem reajuste há mais de 12 meses
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'SRV-9', nome: 'Manutenção preventiva de autoclave', tipo: 'SERVICO', preco: '2.000,00' }));
  amb.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === 'SRV-9').PRECO_DESDE = '2025-09-01';
  pan = ok(amb.api('s_gaspar', 'hoje', { papel: 'GESTAO' }));
  const conduta = pan.itens.find((i) => i.regra === 'PRECIFICACAO');
  assert.ok(conduta, pan.itens.map((i) => i.regra).join(','));
  assert.match(conduta.titulo, /o benefício do Programa de conduta ficou "não se aplica" numa viagem de 228 km/);
  assert.ok(pan.itens.some((i) => i.regra === 'CATALOGO_SEM_REAJUSTE' && /1 item do catálogo está sem reajuste há mais de 12 meses/.test(i.titulo)));
  assert.ok(!pan.itens.some((i) => i.regra === 'POLITICA_INCOMPLETA'), 'a política foi preenchida');
  const rv = ok(amb.api('s_vera', 'revisarProposta', { id: a.id, comIA: false }));
  assert.ok(rv.alertas.some((x) => /benefício do Programa de conduta ficou "não se aplica"/.test(x)));
  // catálogo: filtro "sem reajuste"
  const cat = ok(amb.api('s_gaspar', 'catalogo', { situacao: 'SEM_REAJUSTE' }));
  assert.deepEqual(cat.produtos.map((p) => p.codigo), ['SRV-9']); assert.equal(cat.semReajuste, 1); assert.equal(cat.produtos[0].semReajuste, true);
  assert.equal(ok(amb.api('s_vera', 'catalogo', { situacao: 'SEM_REAJUSTE' })).produtos.length, 1, 'vendedor não tem o filtro: vê os ativos');
  // painel: quadro de precificação só para a gestão
  ok(amb.api('s_vera', 'gerarDocumento', { id: a.id }));
  ok(amb.api('s_vera', 'marcarEnviada', { id: a.id, como: 'Entregue em mãos na reunião com a CME' }));
  const pn = ok(amb.api('s_gaspar', 'painel', { competencia: '2026-10' })).precificacao;
  assert.equal(pn.enviadas, 1); assert.equal(pn.viagens, 1); assert.equal(pn.custoViagem, 2585, '3.185 sem os 600 do benefício tirado'); assert.equal(pn.semReajuste, 1);
  assert.ok(pn.estrategia.some((x) => /sem reajuste há mais de 12 meses/.test(x)));
  assert.equal(pn.abertasComProblema, 1);
  assert.equal(ok(amb.api('s_vera', 'painel', { competencia: '2026-10' })).precificacao, null);
});

test('proposta antiga (concluída antes do checklist) não trava o documento: vira alerta; a nova revisão cobra o checklist', () => {
  const amb = amb0();
  const a = rascunho(amb, { deslocamento: SEM_VIAGEM });
  ok(amb.api('s_vera', 'concluirProposta', { id: a.id }));
  reg(amb, a.id).DESLOCAMENTO_JSON = ''; // como as propostas concluídas antes de 29/10/2026
  const g = ok(amb.api('s_vera', 'gerarDocumento', { id: a.id }));
  assert.ok(g.alertas.some((x) => /concluída antes do checklist de custos da viagem e do frete/.test(x)));
  ok(amb.api('s_vera', 'marcarEnviada', { id: a.id, como: 'Entregue em mãos na reunião com a CME' }));
  const nr = ok(amb.api('s_vera', 'novaRevisao', { id: a.id }));
  assert.match(amb.api('s_vera', 'concluirProposta', { id: nr.proposta.id }).message, /diga se o serviço tem viagem/);
});


test('telas: caixa de custos no rascunho, resumo fora dele, política na Metodologia e quadro do Painel desenham com os dados do servidor', () => {
  const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
  const html = fs.readFileSync(path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db/JS_Comercial.html'), 'utf8');
  const tela = vm.createContext({ console, window: {}, setTimeout, USER_CONTEXT: { perfil: 'COMERCIAL' }, escapeHtml_: (v) => String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`),
    document: { getElementById: () => null, querySelectorAll: () => [], querySelector: () => null, addEventListener() {} }, google: { script: { run: {} } } });
  vm.runInContext(html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>')), tela);
  const amb = amb0();
  ok(politica(amb, POL));
  const a = rascunho(amb, { deslocamento: { viagem: VIAGEM } });
  const pv = ok(amb.api('s_vera', 'proposta', { id: a.id })).proposta;
  const cx = tela.Comercial_editorCustos_(pv);
  assert.match(cx, /Custos da viagem e do frete \(checklist obrigatório\)/);
  assert.match(cx, /data-cvl="CONDUTA"/); assert.match(cx, /R\$ 3\.185,00/); assert.match(cx, /R\$ 3\.750,00/);
  assert.match(cx, /Referência do Programa de conduta: Rio Verde\/GO, 228 km/);
  assert.doesNotMatch(cx, /Precificação \(só gestão\)/, 'vendedor não vê a margem em número');
  const pg = ok(amb.api('s_gaspar', 'proposta', { id: a.id })).proposta;
  assert.match(tela.Comercial_editorCustos_(pg), /Precificação \(só gestão\):.*margem/);
  ok(amb.api('s_vera', 'concluirProposta', { id: a.id }));
  const pr = ok(amb.api('s_vera', 'proposta', { id: a.id })).proposta;
  assert.match(tela.Comercial_resumoCustos_(pr.deslocamento), /Benefício do Programa de conduta/);
  const met = ok(amb.api('s_dora', 'metodologia'));
  const cp = tela.Comercial_caixaPrecificacao_(met);
  assert.match(cp, /Política de precificação \(acréscimos e reajuste\)/); assert.doesNotMatch(cp, / disabled/);
  assert.match(tela.Comercial_caixaPrecificacao_(ok(amb.api('s_gaspar', 'metodologia'))), / disabled/, 'gestor comercial vê, mas não edita');
  const pn = ok(amb.api('s_gaspar', 'painel', { competencia: '2026-10' })).precificacao;
  assert.match(tela.Comercial_quadroPrecificacao_(pn), /Precificação e estratégia/);
});

test('item de deslocamento digitado (do catálogo do CRM) junto com o cálculo da viagem: a revisão avisa a cobrança em dobro', () => {
  const amb = amb0();
  ok(politica(amb, POL));
  const a = rascunho(amb, { deslocamento: { viagem: VIAGEM } }, [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '9.000,00' }, { descricao: 'DESLOCAMENTO GO/DF', quantidade: 1, precoUnitario: '1.190,00' }]);
  const rv = ok(amb.api('s_vera', 'revisarProposta', { id: a.id, comIA: false }));
  assert.ok(rv.alertas.some((x) => /há item digitado de deslocamento \(DESLOCAMENTO GO\/DF\) além do cálculo da viagem: confira para não cobrar duas vezes/.test(x)), rv.alertas.join(' | '));
});
