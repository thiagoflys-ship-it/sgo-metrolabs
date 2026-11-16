// Conta da viagem (13/11/2026, caso PROP-2026-0064: filial RJ, Rio de Janeiro -> Angra dos Reis). O diagnóstico achou erros do vendedor
// induzidos pela tela: a dica dos campos mostrava os valores de Goiânia numa viagem do Rio; valor abaixo da regra passava sem motivo; o km
// digitado "só a ida" virava 1.120 km rodados sem confirmação (e, acima de 200 km, somava Incentivo de Missão e horas de estrada sem aviso);
// a situação dizia "Aguardando aprovação do desconto" com desconto zero. Nada muda valor, regra ou proposta gravada: só confere e avisa.
// Código real num contexto isolado (tests/_comercial_ambiente.cjs). Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente, oportunidadeDeTeste } = require('./_comercial_ambiente.cjs');

const LEGADO = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const reg = (amb, id) => amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === id);

function amb0() {
  const amb = ambiente();
  amb.ctx.CONDUTA_SHEETS = { DISTANCIA_REFERENCIA: 'qual_distancia_referencia' };
  amb.ctx.Conduta_obterParametros_ = () => ({ VALOR_INCENTIVO_MISSAO: 300, MISSAO_KM_MINIMO: 200 });
  return amb;
}
function produto(amb, codigo, preco, custo) {
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo, nome: 'Autoclave hospitalar a vapor (teste) ' + codigo, tipo: 'SERVICO', preco, custo }));
  return amb.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === codigo);
}
// Como o Ricardo gravou: 2 técnicos, 2 viagens de 1 dia sem pernoite, 280 km digitados "só a ida", km a R$ 2,50 e alimentação a R$ 50
const VIAGEM_P64 = () => ({ unidade: 'RJ', viagem: { ha: 'SIM', tecnicos: 2, engenheiros: 0, transporte: 'VEICULO_EMPRESA', origem: 'Rio de Janeiro/RJ', destino: 'Angra dos Reis/RJ',
  // 13/11/2026 (etapa 2 do incentivo): com mais de uma viagem o vendedor informa as O.S. previstas (aqui, uma por viagem)
  kmTrecho: '280', kmFonte: 'DIGITADO', viagens: 2, osPrevistas: 2, dias: 1, noites: 0, linhas: { KM: { valor: '2,50' }, PEDAGIO: { valor: '50' }, ALIMENTACAO: { valor: '50' } } } });
function propostaP64(amb) {
  const auto = produto(amb, 'QUA-AUTO-T', '4.500,00', '2.756,95');
  const { oportunidade } = oportunidadeDeTeste(amb);
  const id = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id })).proposta.id;
  const itens = [{ produtoId: auto.ID, descricao: auto.NOME, quantidade: 1, precoUnitario: '4.500,00' },
    // item avulso sem custo (como as lavadoras da PROP-2026-0064): leva a proposta para a Diretoria
    { descricao: 'Qualificação lavadora ultrassônica (QI, QO e QD)', quantidade: 1, precoUnitario: '3.000,00' }];
  const salvo = ok(amb.api('s_vera', 'salvarProposta', { id, escopo: 'Qualificação térmica com relatório e certificado ao final.', itens, deslocamento: VIAGEM_P64(),
    condicoes: { pagamento: 'Boleto em 28 dias', garantia: '90 dias' } }));
  return { id, itens, salvo };
}
const tela = (amb, id, sid) => ok(amb.api(sid || 's_vera', 'proposta', { id })).proposta;

test('1. a tela recebe a regra do estado certo (RJ): km pela origem R$ 3,00; hotel R$ 200 e alimentação R$ 100 pelo destino; os valores gravados não mudam', () => {
  const amb = amb0();
  const { id } = propostaP64(amb);
  const d = tela(amb, id).deslocamento;
  assert.equal(d.unidade, 'RJ');
  assert.equal(d.fontes.valorKm.valor, 3); assert.equal(d.fontes.valorKm.uf, 'RJ');
  assert.equal(d.fontes.alimentacao.valor, 100); assert.equal(d.fontes.hospedagem.valor, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(d.politica.custosUF.RJ)), { valorKm: 3, hospedagemPessoaNoite: 200, alimentacaoPessoaDia: 100 }, 'a tela recebe a tabela para refazer a dica ao mudar origem ou destino');
  // a conta continua a mesma do diagnóstico (nenhum valor de preço ou regra muda): R$ 7.900 de custo, item R$ 9.220
  const l = Object.fromEntries(d.calculo.linhas.map((x) => [x.codigo, x]));
  assert.equal(l.KM.quantidadeTxt, '1.120 km (280 km x 2 x 2 viagens)'); assert.equal(l.KM.total, 2800);
  assert.equal(l.ALIMENTACAO.total, 200); assert.equal(l.CONDUTA.total, 1200); assert.equal(l.HORAS.total, 3600);
  assert.equal(d.calculo.custo, 7900); assert.equal(d.precoRepasse, 9220);
  // regra pela linha: origem Goiânia e destino Angra = km de GO (padrão) e hotel do RJ
  const pol = amb.ctx.ComPr_politica_();
  const v = { origem: 'Goiânia/GO', destino: 'Angra dos Reis/RJ' };
  assert.equal(amb.ctx.ComPr_regraLinha_(pol, v, 'KM').valor, 2.5); assert.equal(amb.ctx.ComPr_regraLinha_(pol, v, 'HOSPEDAGEM').valor, 200);
});

test('1b. a tela usa a regra do estado nas dicas, refaz ao mudar origem/destino e tem "Voltar aos valores da regra"', () => {
  const html = fs.readFileSync(path.join(LEGADO, 'JS_Comercial.html'), 'utf8');
  assert.ok(!/L\.codigo === "KM" \? dica\(pol\.valorKm\)/.test(html), 'a dica do km não usa mais o padrão da política (Goiânia)');
  assert.match(html, /Voltar aos valores da regra/); assert.match(html, /Motivo do valor abaixo da regra/); assert.match(html, /function Comercial_confirmarKm_/);
  // as funções da tela, num contexto isolado: mesma regra do servidor
  const pega = (nome) => { const i = html.indexOf('function ' + nome + '('); assert.ok(i > 0, nome); let n = 0, j = html.indexOf('{', i); for (let k = j; k < html.length; k++) { if (html[k] === '{') n++; else if (html[k] === '}') { n--; if (!n) return html.slice(i, k + 1); } } return ''; };
  const ctx = vm.createContext({});
  vm.runInContext(['Comercial_valorBr_', 'Comercial_ufDe_', 'Comercial_regraViagem_', 'Comercial_dicaRegra_'].map(pega).join('\n'), ctx);
  const d = { politica: { valorKm: 2.5, alimentacaoPessoaDia: 100, hospedagemPessoaNoite: 150, custosUF: { RJ: { valorKm: 3, hospedagemPessoaNoite: 200, alimentacaoPessoaDia: 100 } } }, beneficio: { valor: 300 } };
  assert.equal(ctx.Comercial_dicaRegra_(ctx.Comercial_regraViagem_(d, 'KM', 'Rio de Janeiro/RJ', 'Angra dos Reis/RJ')), 'regra RJ: 3');
  assert.equal(ctx.Comercial_dicaRegra_(ctx.Comercial_regraViagem_(d, 'HOSPEDAGEM', 'Rio de Janeiro/RJ', 'Angra dos Reis/RJ')), 'regra RJ: 200');
  assert.equal(ctx.Comercial_dicaRegra_(ctx.Comercial_regraViagem_(d, 'KM', 'Goiânia/GO', 'Angra dos Reis/RJ')), 'regra (padrão): 2,5');
  assert.equal(ctx.Comercial_dicaRegra_(ctx.Comercial_regraViagem_(d, 'HOSPEDAGEM', 'Rio de Janeiro/RJ', 'Rio Verde/GO')), 'regra (padrão): 150');
});

test('2. valor abaixo da regra (alimentação 50 e km 2,50 no RJ) trava a conclusão sem motivo; com o motivo vira alerta na revisão e na Caixa', () => {
  const amb = amb0();
  const { id, itens, salvo } = propostaP64(amb);
  assert.ok(salvo.checklist.faltas.some((f) => f.codigo === 'REGRA_ALIMENTACAO'), JSON.stringify(salvo.checklist.faltas));
  let d = tela(amb, id).deslocamento;
  const abx = d.foraDaRegra.abaixo.map((x) => x.texto);
  assert.ok(abx.includes('Alimentação R$ 50,00 abaixo da regra RJ (R$ 100,00)'), abx.join(' | '));
  assert.ok(abx.includes('Km rodado R$ 2,50 abaixo da regra RJ (R$ 3,00)'), abx.join(' | '));
  // trava: diz o quê, por quê e o que fazer
  const r = amb.api('s_vera', 'concluirProposta', { id, justificativa: 'Itens de lavadora sem custo cadastrado ainda' });
  assert.equal(r.ok, false);
  assert.match(r.message, /Alimentação: R\$ 50,00 por pessoa por dia, abaixo da regra RJ \(R\$ 100,00\)\. Valor abaixo da regra faz a viagem custar mais do que a proposta cobra .*escreva o motivo no campo "Motivo do valor abaixo da regra"/);
  assert.equal(reg(amb, id).SITUACAO, 'RASCUNHO');
  // com o motivo (e o km conferido) a proposta conclui e vai para a Diretoria pelo item sem custo
  const desl = VIAGEM_P64();
  desl.viagem.kmConfirmado = true;
  desl.viagem.linhas.ALIMENTACAO.motivoAbaixo = 'Cliente fornece o almoço no refeitório';
  desl.viagem.linhas.KM.motivoAbaixo = 'Carro da filial com consumo menor';
  const s2 = ok(amb.api('s_vera', 'salvarProposta', { id, itens, deslocamento: desl }));
  assert.equal(s2.checklist.ok, true, JSON.stringify(s2.checklist.faltas));
  ok(amb.api('s_vera', 'concluirProposta', { id, justificativa: 'Itens de lavadora sem custo cadastrado ainda' }));
  const p = reg(amb, id);
  assert.equal(p.SITUACAO, 'AGUARDANDO_APROVACAO', 'o código interno da situação não muda');
  const rev = JSON.parse(p.REVISAO_GESTORA_JSON);
  assert.ok(rev.alertas.some((x) => x.includes('Alimentação R$ 50,00 abaixo da regra RJ (R$ 100,00): motivo do vendedor: "Cliente fornece o almoço no refeitório"')), rev.alertas.join(' | '));
  const pend = [];
  amb.ctx.Comercial_fontePendencias_((x) => pend.push(x), {});
  const cx = pend.find((x) => x && x.id === 'COM:DESC:' + id);
  assert.ok(cx, 'na Caixa de decisões');
  assert.match(cx.titulo, /aguardando aprovação: item sem custo, valores da viagem abaixo da regra$/);
  assert.match(cx.detalhe, /Valores da viagem fora da regra: .*Alimentação R\$ 50,00 abaixo da regra RJ \(R\$ 100,00\): motivo do vendedor: "Cliente fornece o almoço no refeitório"/);
  assert.match(cx.detalhe, /só a Diretoria aprova/);
  // o aviso à Diretoria (sistema e e-mail) leva os valores fora da regra com o motivo do vendedor
  const avDir = (amb.tabelas.COM_AVISOS || []).find((x) => x.TIPO === 'MARGEM_DIRETORIA' && x.DESTINATARIO_ID === 'u_dir');
  assert.ok(avDir, 'aviso à Diretoria');
  assert.match(avDir.TEXTO, /Valores da viagem fora da regra: Km rodado R\$ 2,50 abaixo da regra RJ \(R\$ 3,00\): motivo do vendedor: "Carro da filial com consumo menor"; Alimentação R\$ 50,00 abaixo da regra RJ/);
});

test('2b. valor acima da regra é só alerta (não trava); proposta antiga com valor abaixo, já concluída, abre e calcula igual, com alerta e sem bloqueio', () => {
  const amb = amb0();
  const pol = amb.ctx.ComPr_politica_();
  const n = amb.ctx.ComPr_normalizar_({ unidade: 'RJ', viagem: { ha: 'SIM', tecnicos: 1, origem: 'Rio de Janeiro/RJ', destino: 'Angra dos Reis/RJ', kmTrecho: '150', kmFonte: 'BANCO_ROTAS', dias: 2, noites: 1,
    linhas: { PEDAGIO: { valor: '30' }, HOSPEDAGEM: { valor: '250' } } } }, null, pol, {});
  const fr = amb.ctx.ComPr_foraDaRegra_(n, pol);
  assert.equal(fr.abaixo.length, 0); assert.deepEqual([...fr.acima.map((x) => x.texto)], ['Hospedagem R$ 250,00 acima da regra RJ (R$ 200,00)']);
  assert.equal(amb.ctx.ComPr_checklist_(n, 'SERVICOS', pol).faltas.filter((f) => /^REGRA_/.test(f.codigo)).length, 0);
  // proposta concluída antes desta regra (PRONTA, sem motivo gravado): calcula igual e só alerta
  const { id } = propostaP64(amb);
  const p = reg(amb, id);
  const antes = amb.ctx.ComPr_calcularViagem_(JSON.parse(p.DESLOCAMENTO_JSON), amb.ctx.ComPr_polUnidade_(pol, 'RJ')).custo;
  assert.equal(antes, 7900);
  p.SITUACAO = 'PRONTA';
  const rv = amb.ctx.ComG_revisarPropostaRegras_(p);
  assert.ok(!rv.erros.some((x) => /abaixo da regra/.test(x)), rv.erros.join(' | '));
  assert.ok(rv.alertas.some((x) => /Alimentação R\$ 50,00 abaixo da regra RJ \(R\$ 100,00\): sem o motivo do vendedor/.test(x)), rv.alertas.join(' | '));
  assert.equal(JSON.parse(p.DESLOCAMENTO_JSON).viagem.linhas.ALIMENTACAO.valor, 50, 'nada foi regravado');
});

test('3. km digitado: resumo legível com confirmação; trecho acima de 200 km mostra o que acrescenta; horas de estrada além de 6 h num dia avisam', () => {
  const amb = amb0();
  const { id, itens } = propostaP64(amb);
  let d = tela(amb, id).deslocamento;
  assert.equal(d.kmResumo.pergunta, 'Você informou 280 km só a ida: a equipe vai rodar 1.120 km (ida e volta × 2 viagens). Confere?');
  assert.equal(d.kmResumo.precisaConfirmar, true);
  assert.equal(d.avisoTrecho, 'O trecho de 280 km (só a ida) passa de 200 km: entram o Incentivo de Missão (R$ 1.200,00) e as horas de estrada (R$ 3.600,00), R$ 4.800,00 a mais no custo da viagem. Abaixo de 200 km esses valores não entram: confira se o km é o do trecho, só a ida.');
  assert.match(d.avisoHoras, /^8 h de estrada por viagem \(ida e volta: 560 km a 70 km\/h\) em 1 dia por viagem: mais de 6 h de estrada por dia/);
  // a revisão da gestora alerta o km não conferido e as horas
  const rv0 = amb.ctx.ComG_revisarPropostaRegras_(reg(amb, id));
  assert.ok(rv0.alertas.some((x) => /km do trecho digitado à mão e não confirmado pelo vendedor \(280 km só a ida; 1\.120 km rodados \(ida e volta × 2 viagens\)\)/.test(x)), rv0.alertas.join(' | '));
  // conferido: vale para o km e as viagens conferidos
  const desl = VIAGEM_P64(); desl.viagem.kmConfirmado = true;
  ok(amb.api('s_vera', 'salvarProposta', { id, itens, deslocamento: desl }));
  d = tela(amb, id).deslocamento;
  assert.equal(d.kmResumo.confirmado, true); assert.equal(d.kmResumo.confirmadoPor, 'VERA VENDEDORA TESTE');
  const d3 = VIAGEM_P64(); d3.viagem.viagens = 3;
  ok(amb.api('s_vera', 'salvarProposta', { id, itens, deslocamento: d3 }));
  d = tela(amb, id).deslocamento;
  assert.equal(d.kmResumo.precisaConfirmar, true, 'mudou o número de viagens: pede de novo');
  assert.match(d.kmResumo.pergunta, /a equipe vai rodar 1\.680 km \(ida e volta × 3 viagens\)/);
  // km do banco de rotas não pede confirmação; trecho de 140 km não soma incentivo nem horas
  const d4 = VIAGEM_P64(); d4.viagem.kmTrecho = '140'; d4.viagem.kmFonte = 'BANCO_ROTAS';
  ok(amb.api('s_vera', 'salvarProposta', { id, itens, deslocamento: d4 }));
  d = tela(amb, id).deslocamento;
  assert.equal(d.kmResumo.precisaConfirmar, false); assert.equal(d.avisoTrecho, undefined); assert.equal(d.avisoHoras, undefined);
  // a tela pede a confirmação ao calcular e ao concluir
  const html = fs.readFileSync(path.join(LEGADO, 'JS_Comercial.html'), 'utf8');
  assert.match(html, /bt\.onclick = function \(\) \{ Comercial_confirmarKm_\(calcular\); \}/);
  assert.match(html, /return Comercial_confirmarKm_\(function \(\) \{ acao\.concluirDepoisKm\(\); \}\)/);
});

test('3b. horas de estrada e trabalho previsto pela ficha que não cabem nos dias avisam', () => {
  const amb = amb0();
  const pol = amb.ctx.ComPr_polUnidade_(amb.ctx.ComPr_politica_(), 'RJ');
  const auto = produto(amb, 'QUA-HORAS', '4.500,00', '2.756,95');
  auto.HORAS_TECNICO = 12; auto.HORAS_ENGENHEIRO = 0;
  const n = amb.ctx.ComPr_normalizar_({ unidade: 'RJ', viagem: { ha: 'SIM', tecnicos: 2, origem: 'Rio de Janeiro/RJ', destino: 'Volta Redonda/RJ', kmTrecho: '130', dias: 1, noites: 0 } }, null, pol, {});
  const av = amb.ctx.ComPr_avisoHoras_(n.viagem, pol, [{ produtoId: auto.ID, quantidade: 2, tipo: 'SERVICO' }]);
  // 130 km x 2 a 70 km/h = 3,7 h de estrada; 24 h de trabalho ÷ 2 técnicos = 12 h por pessoa: 15,7 h no dia
  assert.ok(av, 'aviso esperado');
  assert.match(av.texto, /^Estrada e trabalho não cabem em 1 dia por viagem: 3,7 h de estrada \(ida e volta\) e cerca de 12 h de trabalho por pessoa .* acima da jornada de 10 h/);
});

test('4. "Aguardando aprovação" com o motivo real (desconto zero não aparece como desconto); a lista, o documento e a Caixa dizem o motivo', () => {
  assert.equal(amb0().ctx.COM_SITUACOES_PROP.AGUARDANDO_APROVACAO, 'Aguardando aprovação');
  const amb = amb0();
  const { id, itens } = propostaP64(amb);
  const desl = VIAGEM_P64(); desl.viagem.kmConfirmado = true;
  desl.viagem.linhas.ALIMENTACAO = { valor: '' }; desl.viagem.linhas.KM = { valor: '' }; // "Voltar aos valores da regra"
  const s = ok(amb.api('s_vera', 'salvarProposta', { id, itens, deslocamento: desl }));
  assert.equal(s.checklist.ok, true, JSON.stringify(s.checklist.faltas));
  ok(amb.api('s_vera', 'concluirProposta', { id, justificativa: 'Itens de lavadora sem custo cadastrado ainda' }));
  const p = reg(amb, id);
  assert.equal(p.SITUACAO, 'AGUARDANDO_APROVACAO'); assert.equal(Number(p.DESCONTO_PCT), 0);
  assert.deepEqual(JSON.parse(p.PRECIFICACAO_JSON).pedido.rotulos, ['item sem custo']);
  const t = tela(amb, id);
  assert.equal(t.situacaoNome, 'Aguardando aprovação: item sem custo');
  assert.ok(!/desconto/i.test(t.situacaoNome));
  const lista = ok(amb.api('s_vera', 'propostas', {})).propostas.find((x) => x.id === id);
  assert.equal(lista.situacaoNome, 'Aguardando aprovação: item sem custo');
  assert.match(amb.api('s_vera', 'gerarDocumento', { id }).message, /Ela aguarda a aprovação da Diretoria \(Caixa de decisões\)\. Motivo: item sem custo\./);
  // pedido anterior a 13/11/2026 (sem os motivos gravados): o motivo é calculado de novo ao abrir
  const f = JSON.parse(p.PRECIFICACAO_JSON); delete f.pedido; p.PRECIFICACAO_JSON = JSON.stringify(f);
  assert.equal(tela(amb, id).situacaoNome, 'Aguardando aprovação: item sem custo');
  // só desconto: o texto continua dizendo desconto
  const m = amb.ctx.ComP_motivosAprovacao_({}, { pol: { codigos: ['DESCONTO'] }, itens: [] });
  assert.deepEqual([...m.rotulos], ['desconto acima do limite']);
});
