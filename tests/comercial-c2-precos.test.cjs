// Comercial C2 (01/11/2026): tabela de preços com a ficha de custo, faixas de prazo, deslocamento em bloco simples, margem única,
// importação idempotente da tabela C1, Metodologia em quatro páginas (com leitura do formato antigo) e os textos corrigidos.
// Estudo: docs/COMERCIAL_C1_PRECIFICACAO_20261101.md. Código real num contexto isolado (tests/_comercial_ambiente.cjs). Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente, oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');

const C1 = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/COMERCIAL_C1_TABELA_SERVICOS.json'), 'utf8')).servicos;
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const reg = (amb, id) => amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === id);
const textoDe = (html) => html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const prod = (amb, cod) => amb.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === cod);

function amb0(o) {
  const amb = ambiente(Object.assign({ tabelas: { qual_distancia_referencia: [{ ID: 'd1', DESTINO: 'Brasília/DF', KM_TRECHO: 210 }, { ID: 'd2', DESTINO: 'Aparecida de Goiânia/GO', KM_TRECHO: 20 }, { ID: 'd3', DESTINO: 'Itumbiara/GO', KM_TRECHO: 205 }] } }, o || {}));
  amb.ctx.CONDUTA_SHEETS = { DISTANCIA_REFERENCIA: 'qual_distancia_referencia' };
  amb.ctx.Conduta_obterParametros_ = () => ({ VALOR_INCENTIVO_MISSAO: 300, MISSAO_KM_MINIMO: 200 });
  return amb;
}
function importar(amb, escolhas) {
  const pv = ok(amb.api('s_dora', 'importarC1Previa'));
  return { pv, r: ok(amb.api('s_dora', 'importarC1', { marca: pv.marca, escolhas: escolhas || {} })) };
}
function rascunho(amb, itens, extra) {
  const { oportunidade } = oportunidadeDeTeste(amb);
  const np = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  const s = ok(amb.api('s_vera', 'salvarProposta', Object.assign({ id: np.proposta.id, deslocamento: SEM_VIAGEM, itens, condicoes: { pagamento: 'Boleto em 28 dias', garantia: '90 dias' } }, extra || {})));
  return { id: np.proposta.id, salvo: s };
}
const itemCat = (p, q, extra) => Object.assign({ produtoId: p.ID, descricao: p.NOME, quantidade: q || 1, precoUnitario: String(p.PRECO).replace('.', ',') }, extra || {});

test('fórmula do preço: com os valores iniciais, os 42 serviços da C1 saem com o mesmo custo, preço normal, mínimo e urgente da tabela', () => {
  const amb = amb0();
  const pol = amb.ctx.ComPr_politica_();
  assert.equal(pol.impostosPct, 14.25); assert.equal(pol.comissaoPct, 3); assert.equal(pol.margemAlvoPct, 20); assert.equal(pol.margemMinPct, 10);
  assert.deepEqual(JSON.parse(JSON.stringify(pol.custoHora)), { TECNICO: 45, ENGENHEIRO: 132 }); assert.equal(pol.custoFixoPct, 25); assert.equal(pol.horaAvulsa, 190);
  assert.equal(pol.taxaViagem.valor, 300); assert.equal(pol.alimentacaoPessoaDia, 100); assert.equal(pol.hospedagemPessoaNoite, 150); assert.equal(pol.valorKm, 2.5);
  assert.equal(amb.ctx.COM_TABELA_C1.servicos.length, 42);
  for (const s of C1) {
    const t = amb.ctx.ComF_tabelaC1_(s.codigo), c = amb.ctx.ComF_calcular_(t, pol);
    assert.ok(Math.abs(c.custo - s.custo.total) < 0.011, s.codigo + ' custo ' + c.custo + ' x ' + s.custo.total);
    assert.equal(c.precoConta, s.preco_pela_conta, s.codigo + ' preço pela conta');
    assert.equal(c.precoSugerido, s.preco_normal, s.codigo + ' preço normal');
    assert.equal(c.precoMinimo, s.preco_minimo, s.codigo + ' preço mínimo');
    assert.equal(c.precoUrgente, s.preco_urgente, s.codigo + ' urgente (x 2,1)');
  }
  // o exemplo da seção 4: autoclave acima de 100 L
  const ac = amb.ctx.ComF_calcular_(amb.ctx.ComF_tabelaC1_('QT_AUTOCLAVE_GRANDE'), pol);
  assert.equal(ac.maoObraTecnico, 630); assert.equal(ac.maoObraEngenheiro, 660); assert.equal(ac.custoFixo, 322.5); assert.equal(ac.custo, 1892.5);
  assert.equal(ac.divisorAlvo, 0.6275); assert.equal(ac.divisorMinimo, 0.7275); assert.equal(ac.precoSugerido, 3020);
  // regra do mercado e do histórico (os dois acima da conta: sobe até o menor) e as exceções
  assert.match(amb.ctx.ComF_calcular_(amb.ctx.ComF_tabelaC1_('CAL_MONITOR'), pol).fonteTxt, /mercado público e o histórico/);
  assert.equal(amb.ctx.ComF_calcular_(amb.ctx.ComF_tabelaC1_('QT_ULTRAFREEZER'), pol).fonte, 'PISO_RELATIVO');
  assert.equal(amb.ctx.ComF_calcular_(amb.ctx.ComF_tabelaC1_('HORA_TECNICO'), pol).precoSugerido, 190);
  // arredondamento: R$ 5 abaixo de R$ 100, R$ 10 acima
  assert.equal(amb.ctx.ComPr_arredondarTabela_(61.2), 65); assert.equal(amb.ctx.ComPr_arredondarTabela_(3015.9), 3020); assert.equal(amb.ctx.ComPr_arredondarTabela_(100), 100);
});

test('ficha no catálogo: o preço sugerido acompanha os parâmetros; o preço de venda só muda quando a gestão confirma, com motivo e histórico', () => {
  const amb = amb0();
  importar(amb);
  const ac = prod(amb, 'QT-AUTOCLAVE-GRANDE');
  assert.equal(ac.PRECO, 3020); assert.equal(ac.HORAS_TECNICO, 14); assert.equal(ac.TABELA_CODIGO, 'C1:QT_AUTOCLAVE_GRANDE');
  let cat = ok(amb.api('s_gaspar', 'catalogo', { busca: 'QT-AUTOCLAVE-GRANDE' })).produtos[0];
  assert.equal(cat.ficha.conta.precoSugerido, 3020); assert.equal(cat.ficha.mercado.mediana, 2550); assert.equal(cat.ficha.historico.crm.mediana, 3800);
  assert.match(cat.ficha.mercadoTxt, /R\$ 610,74 \/ R\$ 2\.550,00 \/ R\$ 8\.700,00 \(59 preços\)/);
  // o vendedor vê mercado e histórico, nunca a conta
  const cv = ok(amb.api('s_vera', 'catalogo', { busca: 'QT-AUTOCLAVE-GRANDE' })).produtos[0];
  assert.equal(cv.ficha.conta, undefined); assert.equal(cv.custo, undefined); assert.ok(cv.ficha.mercado);
  // a Diretoria muda o custo fixo para 60%: o sugerido muda, o preço de venda não
  ok(amb.api('s_dora', 'metodologia', { pagina: 'PRECO', salvar: { precificacao: { custoFixoPct: 60 } }, motivo: 'Custo fixo real informado pelo dono' }));
  cat = ok(amb.api('s_gaspar', 'catalogo', { busca: 'QT-AUTOCLAVE-GRANDE' })).produtos[0];
  assert.equal(cat.ficha.conta.precoSugerido, 3740, 'C1, sensibilidade: com 60% o preço fica em R$ 3.740');
  assert.equal(prod(amb, 'QT-AUTOCLAVE-GRANDE').PRECO, 3020);
  assert.match(amb.api('s_gaspar', 'aplicarSugerido', { ids: [ac.ID], motivo: 'curto' }).message, /escreva o motivo/);
  assert.match(amb.api('s_vera', 'aplicarSugerido', { ids: [ac.ID], motivo: 'Vendedor tentando mudar' }).message, /gestão comercial/);
  const ap = ok(amb.api('s_gaspar', 'aplicarSugerido', { ids: [ac.ID], motivo: 'Custo fixo real aprovado pela Diretoria' }));
  assert.match(ap.message, /1 item passou ao preço sugerido/);
  assert.equal(prod(amb, 'QT-AUTOCLAVE-GRANDE').PRECO, 3740);
  const h = ok(amb.api('s_gaspar', 'historicoProduto', { id: ac.ID })).historico;
  assert.ok(h.some((x) => /de R\$ 3\.020,00 para R\$ 3\.740,00 \(preço sugerido pela ficha de custo/.test(x.texto) && /Custo fixo real aprovado/.test(x.texto)));
  // na proposta, o custo do item é o da ficha (política em vigor)
  const a = rascunho(amb, [itemCat(prod(amb, 'QT-AUTOCLAVE-GRANDE'))]);
  const it = JSON.parse(reg(amb, a.id).ITENS_JSON)[0];
  assert.equal(it.custoUnitario, 2344, '1.290 x 1,6 + 280');
  // gestão ajusta a ficha
  ok(amb.api('s_gaspar', 'salvarFicha', { id: ac.ID, horasTecnico: '16', horasEngenheiro: '5', padroes: '150', consumiveis: '130' }));
  assert.equal(prod(amb, 'QT-AUTOCLAVE-GRANDE').HORAS_TECNICO, 16);
  assert.match(amb.api('s_gaspar', 'salvarFicha', { id: ac.ID, horasTecnico: 'muitas' }).message, /as horas do técnico precisa ser um número/);
});

test('faixas de prazo: urgente = normal x 2,1; prioritária desligada até a Diretoria ligar (x 1,5); licitação sem acréscimo; produto fora; o documento mostra o prazo e o valor da faixa', () => {
  const amb = amb0();
  importar(amb);
  const ac = prod(amb, 'QT-AUTOCLAVE-GRANDE'), term = prod(amb, 'CAL-TERMOMETRO');
  const ini = ok(amb.api('s_vera', 'iniciar'));
  assert.deepEqual(ini.prazo.faixas.map((f) => [f.codigo, f.diasUteis, f.acrescimoPct, f.ativa]), [['NORMAL', 10, 0, true], ['PRIORITARIA', 5, 50, false], ['URGENTE', 3, 110, true]]);
  const a = rascunho(amb, [itemCat(ac, 1, { faixa: 'URGENTE', precoUnitario: '6.350,00' }), itemCat(term, 4), { tipo: 'PRODUTO', descricao: 'Termo-higrômetro digital', quantidade: 1, precoUnitario: '420,00', faixa: '' }], { prazo: { faixa: 'NORMAL' }, deslocamento: { viagem: { ha: 'NAO', motivoSem: 'Serviço com o cliente trazendo os equipamentos' }, frete: { nsa: true, motivo: 'Cliente retira na Metrolabs' } } });
  const itens = JSON.parse(reg(amb, a.id).ITENS_JSON);
  assert.equal(itens[0].precoTabela, 6350, 'urgente: 3.020 x 2,1 = 6.342, arredondado a R$ 10'); assert.equal(itens[0].precoTabelaNormal, 3020); assert.equal(itens[0].faixa, 'URGENTE');
  assert.equal(itens[1].precoTabela, 70, 'termômetro segue a proposta (normal)');
  assert.equal(reg(amb, a.id).DESCONTO_PCT, 0, 'o preço urgente não conta como "acima da tabela" nem como desconto');
  const cond = JSON.parse(reg(amb, a.id).CONDICOES_JSON);
  assert.match(cond.prazoExecucao, /^Prazo urgente \(item 1\): execução e entrega do relatório ou certificado em até 3 dias úteis, contados do aceite da proposta e da liberação do equipamento pelo cliente\. Prazo normal \(item 2\): .*até 10 dias úteis/);
  // prioritária desligada: não entra (a tela diz o que fazer)
  let r = amb.api('s_vera', 'salvarProposta', { id: a.id, itens: [itemCat(ac, 1, { faixa: 'PRIORITARIA' })] });
  assert.equal(r.ok, false); assert.match(r.message, /a faixa Prioritária \(item 1\) está desligada até a Diretoria aprovar/);
  assert.match(amb.api('s_vera', 'salvarProposta', { id: a.id, prazo: { faixa: 'PRIORITARIA' } }).message, /está desligada até a Diretoria aprovar/);
  // a Diretoria liga a prioritária (o gestor comercial não muda parâmetro de preço)
  const met = ok(amb.api('s_dora', 'metodologia'));
  const faixas = met.metodologia.precificacao.prazo.faixas.map((f) => Object.assign({}, f, f.codigo === 'PRIORITARIA' ? { ativa: true } : {}));
  assert.match(amb.api('s_gaspar', 'metodologia', { pagina: 'PRECO', salvar: { precificacao: { prazo: { faixas } } }, motivo: 'Liga a faixa prioritária' }).message, /só é alterada pela Diretoria/);
  ok(amb.api('s_dora', 'metodologia', { pagina: 'PRECO', salvar: { precificacao: { prazo: { faixas } } }, motivo: 'Dono aprovou a faixa prioritária' }));
  ok(amb.api('s_vera', 'salvarProposta', { id: a.id, itens: [itemCat(ac, 1, { faixa: 'PRIORITARIA', precoUnitario: '4.530,00' }), itemCat(term, 4)] }));
  assert.equal(JSON.parse(reg(amb, a.id).ITENS_JSON)[0].precoTabela, 4530, '3.020 x 1,5');
  // licitação ou contrato: sem acréscimo de urgência
  ok(amb.api('s_vera', 'salvarProposta', { id: a.id, prazo: { faixa: 'URGENTE', licitacao: true }, itens: [itemCat(ac, 1, { precoUnitario: '3.020,00' })] }));
  const il = JSON.parse(reg(amb, a.id).ITENS_JSON)[0];
  assert.equal(il.precoTabela, 3020); assert.match(JSON.parse(reg(amb, a.id).CONDICOES_JSON).prazoExecucao, /Prazo urgente: .*3 dias úteis.*Preço único de licitação ou contrato, sem acréscimo de urgência\./);
  // documento: prazo e valor da faixa escolhida
  ok(amb.api('s_vera', 'salvarProposta', { id: a.id, prazo: { faixa: 'NORMAL', licitacao: false }, itens: [itemCat(ac, 1, { faixa: 'URGENTE', precoUnitario: '6.350,00' })] }));
  ok(amb.api('s_vera', 'concluirProposta', { id: a.id }));
  const g = ok(amb.api('s_vera', 'gerarDocumento', { id: a.id }));
  const t = textoDe(amb.arquivos[g.htmlId].bytes.toString('utf8'));
  assert.match(t, /Prazo urgente: até 3 dias úteis até a entrega do relatório ou certificado/);
  assert.match(t, /R\$ 6\.350,00/);
  assert.match(t, /Prazo de execução Prazo urgente: execução e entrega do relatório ou certificado em até 3 dias úteis/);
  // prazo contado até a execução (a Diretoria escolhe): o texto muda
  const pol2 = amb.ctx.ComPr_politica_(); pol2.prazo.contaAte = 'EXECUCAO';
  assert.match(amb.ctx.ComPr_textoPrazo_(pol2, { faixa: 'NORMAL' }, [{ tipo: 'SERVICO' }]), /^Prazo normal: execução em até 10 dias úteis após o aceite da proposta e a liberação do equipamento; relatório ou certificado em até 5 dias úteis após a execução\.$/);
  // a revisão da gestora lembra de confirmar a agenda
  const rv = ok(amb.api('s_vera', 'revisarProposta', { id: a.id, comIA: false }));
  assert.ok(rv.alertas.some((x) => /prazo urgente de 3 dias úteis: confirme a agenda com a Área técnica/.test(x)), rv.alertas.join(' | '));
});

test('deslocamento em bloco simples: Brasília, 2 pessoas, 2 dias e 1 noite = custo R$ 3.325,00 e item de R$ 3.880,00 (C1, seção 6); Grande Goiânia sem taxa e sem alimentação; preço digitado abaixo do custo avisa', () => {
  const amb = amb0();
  const a = rascunho(amb, [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '3.020,00' }],
    { deslocamento: { viagem: { ha: 'SIM', tecnicos: 1, engenheiros: 1, destino: 'Brasília/DF', kmTrecho: '210', dias: 2, noites: 1, linhas: { PEDAGIO: { nsa: true, motivo: 'Sem pedágio no trajeto' } } } } });
  const d = a.salvo.proposta.deslocamento, l = Object.fromEntries(d.calculo.linhas.map((x) => [x.codigo, x]));
  assert.equal(l.KM.total, 1050); assert.equal(l.TAXA.total, 300); assert.equal(l.TAXA.nome, 'Taxa por viagem (fora da Grande Goiânia)');
  assert.equal(l.CONDUTA.total, 600); assert.equal(l.ALIMENTACAO.total, 400); assert.equal(l.HOSPEDAGEM.total, 300);
  assert.equal(l.HORAS.total, 1327.5, '6 h x (técnico 56,25 + engenheiro 165,00)');
  assert.equal(l.DIARIA.nsa, true); assert.match(l.DIARIA.motivo, /Sem diária em dinheiro: a alimentação e a hospedagem cobrem a estadia/);
  assert.equal(d.checklist.ok, true, JSON.stringify(d.checklist.faltas));
  // a C1 conta as horas de estrada do técnico para as 2 pessoas (2 x 6 h x 56,25 = 675): com 2 técnicos o número é o da C1
  const b = rascunho(amb, [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '3.020,00' }],
    { deslocamento: { viagem: { ha: 'SIM', tecnicos: 2, destino: 'Brasília/DF', kmTrecho: '210', dias: 2, noites: 1, linhas: { PEDAGIO: { nsa: true, motivo: 'Sem pedágio no trajeto' } } } } });
  assert.equal(b.salvo.proposta.deslocamento.calculo.custo, 3325);
  const item = JSON.parse(reg(amb, b.id).ITENS_JSON).find((i) => i.auto === 'DESLOCAMENTO');
  assert.equal(item.precoUnitario, 3880, '3.325 / (1 - 14,25%) = 3.877,55, para cima a R$ 10');
  // comissão não incide sobre o deslocamento
  const an = ok(amb.api('s_gaspar', 'proposta', { id: b.id })).proposta.deslocamento.analise;
  assert.equal(an.comissao, 90.6, '3% de 3.020 (o deslocamento fica fora)');
  // Itumbiara (205 km) bate-volta, 1 técnico: R$ 2.400,00 na C1
  const c = rascunho(amb, [{ descricao: 'Calibração', quantidade: 1, precoUnitario: '500' }], { deslocamento: { viagem: { ha: 'SIM', tecnicos: 1, destino: 'Itumbiara/GO', kmTrecho: '205', dias: 1, noites: 0, linhas: { PEDAGIO: { nsa: true, motivo: 'Sem pedágio no trajeto' } } } } });
  assert.equal(JSON.parse(reg(amb, c.id).ITENS_JSON).find((i) => i.auto).precoUnitario, 2400);
  // Aparecida (20 km): só o km (sem taxa, sem alimentação, sem Conduta, sem estrada): custo 100, item 120
  const e = rascunho(amb, [{ descricao: 'Calibração', quantidade: 1, precoUnitario: '500' }], { deslocamento: { viagem: { ha: 'SIM', tecnicos: 1, destino: 'Aparecida de Goiânia/GO', kmTrecho: '20', dias: 1, noites: 0, linhas: { PEDAGIO: { nsa: true, motivo: 'Sem pedágio no trajeto' } } } } });
  const le = Object.fromEntries(e.salvo.proposta.deslocamento.calculo.linhas.map((x) => [x.codigo, x]));
  assert.equal(e.salvo.proposta.deslocamento.calculo.custo, 100);
  assert.match(le.TAXA.motivo, /até 60 km \(Grande Goiânia\): sem taxa por viagem/); assert.match(le.ALIMENTACAO.motivo, /Grande Goiânia\): sem alimentação/); assert.match(le.HORAS.motivo, /o tempo de estrada já está nas horas faturáveis/);
  assert.equal(JSON.parse(reg(amb, e.id).ITENS_JSON).find((i) => i.auto).precoUnitario, 120);
  // o vendedor digita o deslocamento abaixo do custo (como no CRM, R$ 1.190 para Brasília): tela e gestora avisam; conta como desconto
  const s = ok(amb.api('s_vera', 'salvarProposta', { id: b.id, deslocamento: { precoInformado: '1.190,00' } }));
  assert.equal(s.proposta.deslocamento.abaixoDoCusto, true);
  const it2 = JSON.parse(reg(amb, b.id).ITENS_JSON).find((i) => i.auto === 'DESLOCAMENTO');
  assert.equal(it2.precoUnitario, 1190); assert.equal(it2.precoTabela, 3880);
  const rv = ok(amb.api('s_vera', 'revisarProposta', { id: b.id, comIA: false }));
  assert.ok(rv.alertas.some((x) => /o deslocamento está a R\$ 1\.190,00, abaixo do custo de R\$ 3\.325,00 da viagem: a empresa paga para ir/.test(x)), rv.alertas.join(' | '));
  assert.equal(s.politica.dentro, false, 'abaixo da tabela calculada conta como desconto');
  // voltar ao calculado: em branco
  ok(amb.api('s_vera', 'salvarProposta', { id: b.id, deslocamento: { precoInformado: '' } }));
  assert.equal(JSON.parse(reg(amb, b.id).ITENS_JSON).find((i) => i.auto === 'DESLOCAMENTO').precoUnitario, 3880);
});

test('margem única e migração: o valor antigo da política de desconto vale quando a precificação não tinha margem; os dois valores ficam guardados; o padrão é 10%', () => {
  const grava = (amb, valor) => amb.tabelas.COM_CONFIG.push({ ID: 'cfg1', CHAVE: 'METODOLOGIA', VERSAO: 2, VALOR_JSON: JSON.stringify(valor), ATUALIZADO_POR_NOME: 'GASPAR', ATUALIZADO_EM: '2026-10-25T10:00' });
  let amb = amb0({ tabelas: { COM_CONFIG: [] } });
  grava(amb, { politica: { descontoMaxPct: 12, margemMinPct: 18 }, precificacao: { margemMinPct: null, valorKm: 2.8 } });
  let m = amb.ctx.Com_metodologia_();
  assert.equal(m.precificacao.margemMinPct, 18); assert.equal(m.politica.margemMinPct, 18); assert.equal(m.margemUnificada.origem, 'POLITICA_ANTIGA');
  assert.equal(m.politica.descontoMaxPct, 12, 'o resto da versão gravada fica como estava');
  assert.equal(amb.ctx.ComPr_politica_().valorKm, 2.8, 'valor gravado nunca é trocado pelo inicial');
  assert.equal(amb.ctx.ComPr_politica_().impostosPct, 14.25, 'campo vazio recebe o valor inicial');
  amb = amb0({ tabelas: { COM_CONFIG: [] } });
  grava(amb, { politica: { margemMinPct: 18 }, precificacao: { margemMinPct: 8 } });
  m = amb.ctx.Com_metodologia_();
  assert.equal(m.precificacao.margemMinPct, 8); assert.equal(m.margemUnificada.divergiam, true); assert.deepEqual(JSON.parse(JSON.stringify(m.margemUnificada.antes)), { politica: 18, precificacao: 8 });
  amb = amb0({ tabelas: { COM_CONFIG: [] } });
  grava(amb, { politica: { margemMinPct: 0 } });
  assert.equal(amb.ctx.Com_metodologia_().precificacao.margemMinPct, 10); assert.equal(amb.ctx.Com_metodologia_().margemUnificada.origem, 'PADRAO');
  // salvar a página grava uma margem só (o espelho antigo acompanha)
  ok(amb.api('s_dora', 'metodologia', { pagina: 'PRECO', salvar: { precificacao: { margemMinPct: 12 } }, motivo: 'Margem mínima confirmada pelo dono' }));
  const ult = JSON.parse(amb.tabelas.COM_CONFIG.filter((c) => c.CHAVE === 'METODOLOGIA').sort((x, y) => y.VERSAO - x.VERSAO)[0].VALOR_JSON);
  assert.equal(ult.precificacao.margemMinPct, 12); assert.equal(ult.politica.margemMinPct, 12);
  // só uma margem é conferida: com a margem bruta antiga de 50% e a política de 12%, vale a de 12%
  const av = amb.ctx.ComP_avaliarPolitica_({ descontoPct: 0, margemPct: 20 }, 'u_ven', amb.ctx.Com_metodologia_(), null);
  assert.equal(av.dentro, true); assert.equal(av.margemMin, 12);
});

test('margem abaixo da mínima vai para a Caixa de decisões (só a Diretoria aprova); preço abaixo do mínimo da tabela e fora do mercado viram alerta da gestora', () => {
  const amb = amb0();
  importar(amb);
  const ac = prod(amb, 'QT-AUTOCLAVE-GRANDE');
  // 2.000 contra o custo de 1.892,50: sobra negativa depois de impostos e comissão
  const a = rascunho(amb, [itemCat(ac, 1, { precoUnitario: '2.000,00' })]);
  assert.equal(a.salvo.politica.exigeDiretoria, true);
  const rv = ok(amb.api('s_vera', 'revisarProposta', { id: a.id, comIA: false }));
  assert.ok(rv.alertas.some((x) => /QT-AUTOCLAVE-GRANDE a R\$ 2\.000,00, abaixo do preço mínimo da tabela \(R\$ 2\.610,00, margem de 10,0%\)/.test(x)), rv.alertas.join(' | '));
  ok(amb.api('s_vera', 'concluirProposta', { id: a.id, justificativa: 'Cliente estratégico, contrato anual em negociação' }));
  assert.equal(reg(amb, a.id).SITUACAO, 'AGUARDANDO_APROVACAO');
  const itens = [];
  amb.ctx.Comercial_fontePendencias_((x) => itens.push(x), {});
  const pend = itens.find((x) => x && /COM:DESC:/.test(x.id));
  assert.ok(pend, 'a proposta aparece na Caixa de decisões');
  assert.match(pend.detalhe, /só a Diretoria aprova/);
  assert.match(amb.api('s_gaspar', 'decidirDesconto', { id: a.id, aprovar: true, texto: 'Aprovo pelo contrato' }).message, /essa exceção é da Diretoria/);
  ok(amb.api('s_dora', 'decidirDesconto', { id: a.id, aprovar: true, texto: 'Aprovado pela Diretoria pelo contrato anual' }));
  // fora da faixa de mercado (acima do máximo público)
  const b = rascunho(amb, [itemCat(ac, 1, { precoUnitario: '9.500,00' })]);
  const rb = ok(amb.api('s_vera', 'revisarProposta', { id: b.id, comIA: false }));
  assert.ok(rb.alertas.some((x) => /acima do maior preço público \(R\$ 8\.700,00, 59 preços\)/.test(x)), rb.alertas.join(' | '));
  // desconto de pontualidade (até o dia 10) é avisado
  const c = rascunho(amb, [itemCat(ac)], { condicoes: { pagamento: 'Boleto com 8% de desconto se pago até o dia 10', garantia: '90 dias' } });
  assert.ok(ok(amb.api('s_vera', 'revisarProposta', { id: c.id, comIA: false })).alertas.some((x) => /desconto por pagamento em dia/.test(x)));
  // a gestora leva os parâmetros e as faixas para a IA
  const t = amb.ctx.ComG_metodologiaTexto_(amb.ctx.Com_metodologia_());
  assert.match(t, /REGRA DO PREÇO: preço = custo \/ \(1 - impostos 14,25% - comissão 3,0% - margem alvo 20,0%\); margem mínima 10,0%/);
  assert.match(t, /FAIXAS DE PRAZO: Normal 10 dias úteis; Urgente 3 dias úteis \(\+110%\)\. O prazo conta até a entrega do relatório ou certificado\. Licitação ou contrato: sem acréscimo de urgência\./);
});

test('importação da tabela C1: prévia, 42 serviços, idempotente (rodar de novo não duplica) e nunca sobrescreve o que já existe; vendedor não importa', () => {
  const amb = amb0();
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'TERMO-01', nome: 'Calibração de termômetro (digital, espeto, máxima e mínima)', tipo: 'SERVICO', preco: '75,00', descricao: 'Texto da casa, não mexer' }));
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'CAL-ECG', nome: 'ECG da casa', tipo: 'SERVICO', preco: '230,00', custo: '99,00' }));
  assert.match(amb.api('s_vera', 'importarC1Previa').message, /esta ação é da gestão comercial/);
  const pv = ok(amb.api('s_gaspar', 'importarC1Previa'));
  assert.equal(pv.linhas.length, 42); assert.deepEqual(JSON.parse(JSON.stringify(pv.resumo)), { NOVO: 40, JA_IMPORTADO: 0, EXISTE: 2 });
  assert.equal(amb.tabelas.COM_PRODUTOS.length, 2, 'a prévia não grava nada');
  const t = pv.linhas.find((l) => l.codigo === 'CAL_TERMOMETRO');
  assert.equal(t.situacao, 'EXISTE'); assert.equal(t.existente.precoTxt, 'R$ 75,00'); assert.equal(t.tabela.precoTxt, 'R$ 70,00');
  assert.deepEqual(t.vaiPreencher, ['horas do técnico', 'horas do engenheiro', 'padrões', 'consumíveis e ART', 'categoria', 'custo', 'referências de mercado e do histórico'], 'preço e descrição já gravados não entram');
  assert.match(amb.api('s_gaspar', 'importarC1', { marca: 'outra' }).message, /o catálogo mudou desde a prévia/);
  const r = ok(amb.api('s_gaspar', 'importarC1', { marca: pv.marca, escolhas: { CAL_ECG: 'IGNORAR' } }));
  assert.equal(r.criados, 40); assert.equal(r.preenchidos, 1); assert.equal(r.deixados, 1);
  const termo = prod(amb, 'TERMO-01');
  assert.equal(termo.PRECO, 75); assert.equal(termo.DESCRICAO, 'Texto da casa, não mexer'); assert.equal(termo.NOME, 'Calibração de termômetro (digital, espeto, máxima e mínima)');
  assert.equal(termo.HORAS_TECNICO, 0.33); assert.equal(termo.TABELA_CODIGO, 'C1:CAL_TERMOMETRO'); assert.ok(Math.abs(termo.CUSTO - 42.8) < 0.5);
  const ecg = prod(amb, 'CAL-ECG');
  assert.equal(ecg.PRECO, 230); assert.equal(ecg.CUSTO, 99); assert.equal(ecg.TABELA_CODIGO || '', '', '"deixar como está" não toca no item');
  assert.equal(amb.tabelas.COM_PRODUTOS.length, 42);
  const novo = prod(amb, 'QT-LAVADORA-TD');
  assert.equal(novo.PRECO, 2430); assert.equal(novo.CUSTO, 1260); assert.equal(novo.UNIDADE_MEDIDA, 'equip.'); assert.equal(novo.CATEGORIA, 'Qualificação térmica'); assert.match(novo.DESCRICAO, /Deslocamento cobrado à parte\./);
  // de novo: nada duplica
  const pv2 = ok(amb.api('s_gaspar', 'importarC1Previa'));
  assert.deepEqual(JSON.parse(JSON.stringify(pv2.resumo)), { NOVO: 0, JA_IMPORTADO: 41, EXISTE: 1 });
  const r2 = ok(amb.api('s_gaspar', 'importarC1', { marca: pv2.marca, escolhas: { CAL_ECG: 'IGNORAR' } }));
  assert.equal(r2.criados, 0); assert.equal(r2.jaImportados, 41);
  assert.equal(amb.tabelas.COM_PRODUTOS.length, 42);
  assert.match(r2.message, /41 já importados antes \(não duplicou\)/);
  assert.ok(amb.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE === 'CATALOGO' && /40 novos, 1 completados, 1 deixados como estavam/.test(h.TEXTO)));
});

test('Metodologia: leitura do formato antigo (texto com barras) e páginas que salvam só o que é delas (merge)', () => {
  const amb = amb0({ tabelas: { COM_CONFIG: [{ ID: 'cfgA', CHAVE: 'METODOLOGIA', VERSAO: 3, ATUALIZADO_POR_NOME: 'GASPAR', ATUALIZADO_EM: '2026-10-20T09:00', VALOR_JSON: JSON.stringify({
    regrasDeOuro: 'Regra um da casa\nRegra dois da casa',
    origens: ['Indicação', 'Licitação'],
    estrategias: ['CANAL | Trocar o canal | WhatsApp, depois ligação', 'GESTAO | Envolver a gestão | Ligação do gestor'],
    objecoes: 'Está caro | Mostre o custo da parada\nJá tenho fornecedor | Seja o reserva',
    cadencia: { esfriandoDias: 6, paradaDias: 11, propostaLembreteDiaUtil: 2, propostaEscalaDiaUtil: 5, passos: '1 | LIGACAO | Ligar\n3 | EMAIL | Mandar e-mail' },
    funis: [{ codigo: 'ENGENHARIA', nome: 'Engenharia', descricao: 'Serviços', etapas: 'Prospecção | 20 | 7 | Validar a dor | Dor; Decisor\nProposta | 60 | 7 | Enviar | Retorno agendado\nGanho | 100 | 5 | Aceite | Aceite' }]
  }) }] } });
  const m = amb.ctx.Com_metodologia_();
  assert.deepEqual(JSON.parse(JSON.stringify(m.regrasDeOuro)), ['Regra um da casa', 'Regra dois da casa']);
  assert.deepEqual(JSON.parse(JSON.stringify(m.estrategias[1])), { codigo: 'GESTAO', titulo: 'Envolver a gestão', texto: 'Ligação do gestor' });
  assert.equal(m.objecoes[0].objecao, 'Está caro'); assert.equal(m.objecoes[1].resposta, 'Seja o reserva');
  assert.deepEqual(JSON.parse(JSON.stringify(m.cadencia.passos[1])), { dia: 3, canal: 'EMAIL', titulo: 'Mandar e-mail' });
  assert.equal(m.funis[0].etapas.length, 3); assert.equal(m.funis[0].etapas[0].probabilidade, 20); assert.deepEqual(JSON.parse(JSON.stringify(m.funis[0].etapas[0].checklist)), ['Dor', 'Decisor']);
  assert.equal(m.cadencia.esfriandoDias, 6, 'nada se perde');
  // a tela abre e as tabelas mostram as linhas (uma por item)
  const r = ok(amb.api('s_gaspar', 'metodologia'));
  assert.deepEqual(r.paginas.map((p) => p.nome), ['Como vendemos', 'Preço e desconto', 'Documento da proposta', 'Depois da venda']);
  // a Diretoria muda o preço; depois o gestor salva "Como vendemos" com a versão que tinha aberto antes: o preço fica
  ok(amb.api('s_dora', 'metodologia', { pagina: 'PRECO', salvar: { precificacao: { comissaoPct: 4 } }, motivo: 'Comissão confirmada pelo dono' }));
  const s = ok(amb.api('s_gaspar', 'metodologia', { pagina: 'VENDEMOS', salvar: { tese: 'Tese nova da gestão comercial', estrategias: r.metodologia.estrategias.concat([{ codigo: 'VISITA', titulo: 'Visitar', texto: 'Ir até o cliente' }]) }, motivo: 'Tese e estratégia nova' }));
  assert.match(s.message, /Página "Como vendemos" salva \(versão \d+\)/);
  const m2 = amb.ctx.Com_metodologia_();
  assert.equal(m2.tese, 'Tese nova da gestão comercial'); assert.equal(m2.estrategias.length, 3); assert.equal(m2.precificacao.comissaoPct, 4, 'a página de vendas não apaga o preço salvo por outra pessoa');
  assert.match(amb.api('s_gaspar', 'metodologia', { pagina: 'INVENTADA', salvar: { tese: 'x' }, motivo: 'Página que não existe' }).message, /a página "INVENTADA" da metodologia não existe/);
  assert.equal(amb.api('s_vera', 'metodologia', { pagina: 'VENDEMOS', salvar: { tese: 'x' }, motivo: 'Vendedor tentando salvar' }).ok, false);
  // a gestão salva o desconto; a Diretoria salva o preço; o vendedor não vê custo nem margem
  ok(amb.api('s_gaspar', 'metodologia', { pagina: 'PRECO', salvar: { politica: { descontoMaxPct: 8, alcadaGerentePct: 10, alcadaDiretoriaPct: 13.75 } }, motivo: 'Alçadas da C1 para teste' }));
  assert.equal(amb.ctx.Com_metodologia_().politica.descontoMaxPct, 8);
  const v = ok(amb.api('s_vera', 'metodologia')).metodologia;
  assert.equal(v.precificacao.custoHora, null); assert.equal(v.precificacao.comissaoPct, null); assert.equal(v.politica.margemMinPct, null);
  // provisórios: a Diretoria marca o que o dono confirmou
  let pend = ok(amb.api('s_dora', 'metodologia')).precificacao.pendentes;
  assert.ok(pend.includes('comissaoPct') && pend.includes('prioritaria'));
  ok(amb.api('s_dora', 'metodologia', { pagina: 'PRECO', salvar: { precificacao: { confirmados: ['comissaoPct'] } }, motivo: 'Dono confirmou a comissão' }));
  pend = ok(amb.api('s_dora', 'metodologia')).precificacao.pendentes;
  assert.ok(!pend.includes('comissaoPct') && pend.includes('custoHora'));
});

test('textos corrigidos: a CONTRATADA conclui a entrega e o prazo segue a faixa escolhida (sem "10 a 30 dias"), também no texto já gravado, sem criar versão nova dos termos', () => {
  const amb = amb0();
  const t = amb.ctx.Com_termosVigentes_();
  assert.equal(t.versao, 1);
  assert.match(t.texto, /a CONTRATADA compromete-se a concluir a entrega do\(s\) item\(ns\)/);
  assert.match(t.texto, /dentro do prazo da faixa escolhida em cada item desta proposta \(seção Condições comerciais, prazo de execução\), contado em dias úteis/);
  assert.doesNotMatch(t.texto, /CONTRATANTE compromete-se|10 a 30 dias/);
  // metodologia gravada antes da C2 com o texto antigo: lida já corrigida e na mesma versão
  const antigo = amb.ctx.COM_METODOLOGIA_PADRAO.proposta.termos.replace('a CONTRATADA compromete-se a concluir a entrega', 'a CONTRATANTE compromete-se a concluir a entrega')
    .replace('dentro do prazo da faixa escolhida em cada item desta proposta (seção Condições comerciais, prazo de execução), contado em dias úteis a partir da data de assinatura desta minuta', 'dentro de um prazo de 10 a 30 dias, iniciando-se a contagem a partir da data de assinatura desta minuta');
  assert.match(antigo, /CONTRATANTE compromete-se.*10 a 30 dias/);
  amb.tabelas.COM_CONFIG = [{ ID: 'cfgT', CHAVE: 'METODOLOGIA', VERSAO: 2, ATUALIZADO_EM: '2026-10-28T10:00', ATUALIZADO_POR_NOME: 'DORA', VALOR_JSON: JSON.stringify({ proposta: { termos: antigo } }) }];
  amb.ctx.COM_METODOLOGIA_MEMO = null;
  const t2 = amb.ctx.Com_termosVigentes_();
  assert.equal(t2.versao, 1, 'o texto antigo, corrigido, é o mesmo texto: não conta como versão nova');
  assert.doesNotMatch(t2.texto, /CONTRATANTE compromete-se|10 a 30 dias/);
  assert.doesNotMatch(amb.ctx.Com_metodologia_().proposta.termos, /CONTRATANTE compromete-se|10 a 30 dias/);
  // no documento
  const a = rascunho(amb, [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '3.020,00' }]);
  ok(amb.api('s_vera', 'concluirProposta', { id: a.id }));
  const g = ok(amb.api('s_vera', 'gerarDocumento', { id: a.id }));
  const doc = textoDe(amb.arquivos[g.htmlId].bytes.toString('utf8'));
  assert.match(doc, /a CONTRATADA compromete-se a concluir a entrega/); assert.doesNotMatch(doc, /10 a 30 dias/);
  assert.match(doc, /Prazo normal: execução e entrega do relatório ou certificado em até 10 dias úteis/);
});

test('telas: proposta em quatro passos com o quadro de preço sempre à vista; Metodologia em quatro páginas com tabelas editáveis; importação e ficha no catálogo', () => {
  const html = fs.readFileSync(path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db/JS_Comercial.html'), 'utf8');
  const tela = vm.createContext({ console, window: {}, setTimeout, USER_CONTEXT: { perfil: 'COMERCIAL' }, escapeHtml_: (v) => String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`),
    document: { getElementById: () => null, querySelectorAll: () => [], querySelector: () => null, addEventListener() {} }, google: { script: { run: {} } } });
  vm.runInContext(html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>')), tela);
  const amb = amb0();
  importar(amb);
  tela.CM.ini = ok(amb.api('s_vera', 'iniciar'));
  const a = rascunho(amb, [itemCat(prod(amb, 'QT-AUTOCLAVE-GRANDE'))]);
  const p = ok(amb.api('s_vera', 'proposta', { id: a.id })).proposta;
  const ed = tela.Comercial_editorProposta_(p);
  for (const passo of ['1</span>Itens', '2</span>Deslocamento', '3</span>Prazo e condições', '4</span>Revisar e enviar']) assert.ok(ed.includes(passo), passo);
  assert.match(ed, /id="cmQuadroPreco"/); assert.match(ed, /id="cmPrFaixa"/); assert.match(ed, /Licitação ou contrato: sem acréscimo de urgência/);
  assert.match(ed, /O prazo conta do aceite da proposta \(e da liberação do equipamento\) até a entrega do relatório ou certificado/);
  assert.match(ed, /data-painel="2" hidden/, 'só um passo aparece por vez');
  assert.doesNotMatch(ed, /<option value="PRIORITARIA"/, 'faixa desligada não aparece para o vendedor');
  assert.equal(tela.Comercial_precoNaFaixa_(3020, 'URGENTE', 'SERVICO'), 6350); assert.equal(tela.Comercial_precoNaFaixa_(70, 'URGENTE', 'SERVICO'), 150); assert.equal(tela.Comercial_precoNaFaixa_(420, 'URGENTE', 'PRODUTO'), 420);
  assert.match(html, /SGO_NAV\.empilhar\("Proposta: " \+ nomes\[n\]/); assert.match(html, /SGO_NAV\.empilhar\("Metodologia: "/);
  // Metodologia: páginas e tabelas
  tela.CM.ini = ok(amb.api('s_gaspar', 'iniciar'));
  const r = ok(amb.api('s_gaspar', 'metodologia'));
  const v = tela.Comercial_metVendemos_(r);
  assert.match(v, /class="cm-tabed" id="cmTEstr"/); assert.match(v, /\+ adicionar estratégia/); assert.match(v, /data-tabed-rem="cmTPassos"/);
  assert.doesNotMatch(v, /separados por \||\(código \| título \| texto\)/, 'sem texto com barras');
  const rd = ok(amb.api('s_dora', 'metodologia'));
  const pr = tela.Comercial_metPreco_(rd);
  assert.match(pr, /valor provisório/); assert.match(pr, /Taxa por viagem \(fora da Grande Goiânia\)/); assert.match(pr, /desligada até o dono aprovar/); assert.match(pr, /id="cmRegraPreco"/);
  assert.match(pr, /Custo da hora do técnico \(R\$\)/); assert.match(pr, /O que o dono já confirmou/);
  assert.match(tela.Comercial_metPreco_(ok(amb.api('s_vera', 'metodologia'))), /placeholder="só a gestão vê" disabled/);
  // catálogo
  assert.match(html, /id="cmImpC1"/); assert.match(html, /Importar tabela de preços C1/); assert.match(html, /data-ficha="/);
  // celular: botões de 44 px e folga para os botões redondos do canto
  assert.match(html, /\.cm-passo \{[^}]*min-height: 44px/); assert.match(html, /#cmGavetaCorpo \{ padding-bottom: 120px; \}/);
});
