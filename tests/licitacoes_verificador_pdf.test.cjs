// SGO+ Licitações, revisão de 02/11/2026 (banco de prova + revisão independente): o verificador da análise por IA com o texto
// REAL dos editais. Na produção (02/11), 20 análises com o texto do edital foram recusadas e 4 perderam o tempo: trechos
// copiados certos não batiam porque o PDF quebra linha, hifeniza fim de linha e põe o cabeçalho da página no meio da frase; a
// IA tirava a numeração da cláusula e punha "Item 1" na frente; "nova" e "teste" do cadastro valiam como marca.
// A revisão independente mostrou que a primeira calibração aceitava prova FALSA (número, negação, sinal, página e reticências):
// cada ataque dela é um caso abaixo. A regra central: o que fica gravado como prova é o texto DA FONTE, e significa o mesmo.
// Pedaços curtos dos editais reais (TRT-2 DE-209/26, Ibicaré/SC, Aparecida do Rio Doce/GO, Iporã do Oeste/SC, tacógrafos).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n');

function contexto(fabricantes) {
  const ctx = vm.createContext({
    console, Date, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt,
    Utilities: { getUuid: () => '0123456789abcdef0123456789abcdef' }, Session: { getScriptTimeZone: () => 'America/Sao_Paulo' },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    SGO_DATA: { getAll: () => [] }, SGO_CFG: { SHEETS: {} },
    ComEsp_fabricantes_: () => fabricantes || ['ortosintese', 'nova', 'teste', 'generico', 'nao consta']
  });
  for (const f of ['SGO_Expediente.js', 'SGO_Licitacoes_Config.js', 'SGO_Licitacoes.js', 'SGO_Licitacoes_Analise.js']) vm.runInContext(ler(f), ctx, { filename: f });
  return ctx;
}
const ctx = contexto();

// TRT-2, aviso de dispensa 209/2026 (A1), com a hifenização e as quebras de página como o extrator entrega
const TRT2 = 'Prazo de execução: até 20 (vinte) dias corridos, contados, a partir da entrega dos respectivos equipamentos à Con-\ntratada e da autorização para realização dos serviços.\n1\n[página 2]\nPODER JUDICIÁRIO\nJUSTIÇA DO TRABALHO\n' +
  'Manutenção preventiva – a manutenção preventiva deverá compreender, no mínimo:\n1.3.1. inspeção geral das condições físicas e funcionais do equipamento;\n1.3.2. limpeza técnica externa e interna, quando aplicável;\n' +
  '13.7.2. Multa moratória de 0,5% (cinco décimos por cento) do valor do contrato, em caso de\natraso injustificado, por dia, até o limite de 15% (quinze por cento).\n13.7.2.1. O atraso superior a 30 (trinta) dias autoriza a Administração a promover a\nextinção da contratação.\n' +
  '13.7.3. Multa compensatória de 10% (dez por cento) do valor do contrato em caso de\ninexecução parcial e de 30% (trinta por cento) do valor do contrato em caso de inexecução\ntotal do objeto.\n' +
  'A garantia deverá ser prestada nos casos de defeitos dos materiais fornecidos e estes deverão ser reparados pela Contratada, às suas expensas,\n17\n[página 18]\nPODER JUDICIÁRIO\nJUSTIÇA DO TRABALHO\nno total ou em parte, em prazo não superior a 15 (quinze) dias corridos.\n' +
  'O prazo de garantia é de 110 dias úteis, e o valor total de 4.412,50 reais por mês. O certiﬁcado deve ser “rastreável” à RBC.\n' +
  'A garantia contratual será de 1,5% do valor do contrato. O valor estimado é de R$ 15.000,00 para o lote. Prazo de atendimento de 10,5 horas úteis. Entrega em 1/12/2026 no almoxarifado central.\n' +
  'É desnecessária a apresentação de certificado de acreditação RBC. É inexigível a vistoria técnica prévia. A temperatura deve ser ≥ 8 °C na câmara e de -20 °C no freezer, e de -\n10 °C no congelador.\n' +
  'Não será exigida acreditação RBC dos laboratórios participantes. A empresa não poderá subcontratar o objeto do contrato sem autorização. As penalidades seguem o subitem 13.7.2. do edital e a multa será aplicada.\n';
// Ibicaré/SC, edital (A2): tabela de itens e quebra de página
const IBICARE = '7.2.1.7. Preenchimento do Anexo IV – Cadastro do Responsável pela Assinatura do Contrato ou da Ata de\n[página 10]\nESTADO DE SANTA CATARINA\nPREFEITURA MUNICIPAL DE IBICARÉ\nRegistro de Preços\n7.2.1.8. Caso o signatário indicado não seja o representante legal.\n' +
  '01 01 UND\nCadeira Oftalmológica - Cadeira clínica para exames oftálmicos com sistema de ajuste elétrico de altura.\n5 unidades de cadeira clínica para exames oftálmicos.\nItem 12 Termômetro digital tipo espeto com certificado de calibração.\n' +
  'Prova de inscrição no Cadastro Nacional de P essoas Jurídicas do Ministério da Fazenda (CNPJ);\n' +
  'APARELHO DE ELETROCARDIOGRAMA DA MARCA BIONET, MODELO CARDIOCARE 2000 (EKG-2000), COMPREENDENDO CALIBRAÇÃO E TESTES DE SEGURANÇA.\n';
const OP = { ID: 'op1', CODIGO: 'LIC-2026-0097', UF: 'GO', MUNICIPIO: 'Aparecida do Rio Doce', MODALIDADE: 'Pregão - Eletrônico', MODO_DISPUTA: 'Aberto', OBJETO: 'Manutenção corretiva de 04 equipamentos médicos',
  VALOR_ESTIMADO: 8431.44, ENCERRAMENTO_PROPOSTAS: '2026-11-05T11:00:00', TRIAGEM: 'CANDIDATA', SRP: 'NAO' };
function montar(textos) {
  const fontes = ctx.Lic_fontesAnalise_(OP, { itens: [] }, textos || [{ ref: 'A1', id: 1, titulo: 'Aviso', nome: 'aviso.pdf', texto: TRT2 }, { ref: 'A2', id: 2, titulo: 'Edital', nome: 'edital.pdf', texto: IBICARE }]);
  const pesos = Object.assign({}, ctx.LIC_NOTA_PADRAO);
  const codigo = ctx.Lic_criteriosCodigo_(OP, pesos, '2026-11-01');
  return { fontes, pesos, codigo, cv: ctx.Lic_ctxVerificador_(OP, fontes, pesos, codigo) };
}
const B = montar();
function conf(ref, trecho, o, b) { const problemas = []; (b || B).cv._dicas = 0; const fo = ctx.Lic_conferirFonte_('afirmação 1', { ref, trecho }, (b || B).cv, problemas, o); return { fo, problemas: problemas.join(' | ') }; }
const recusa = (ref, trecho, o, re) => { const r = conf(ref, trecho, o); assert.equal(r.fo, null, 'aceitou: ' + trecho + (r.fo ? ' -> ' + r.fo.trecho : '')); if (re) assert.match(r.problemas, re); return r; };

test('quebra do PDF: hífen de fim de linha, quebra de linha, ligadura, aspas tipográficas e palavra partida depois da maiúscula', () => {
  let r = conf('A1', 'a partir da entrega dos respectivos equipamentos à Contratada e da autorização');
  assert.ok(r.fo, r.problemas); assert.equal(r.fo.ajuste, '');
  assert.equal(r.fo.trecho, 'a partir da entrega dos respectivos equipamentos à Con- tratada e da autorização', 'grava o texto DA FONTE');
  assert.ok(conf('A1', 'O certificado deve ser "rastreável" à RBC').fo);
  assert.ok(conf('A1', 'multa moratória de 0,5% (cinco décimos por cento) do valor do contrato, em caso de atraso injustificado').fo);
  r = conf('A2', 'Prova de inscrição no Cadastro Nacional de Pessoas Jurídicas do Ministério da Fazenda');
  assert.ok(r.fo, r.problemas);
});

test('número é palavra inteira, com o separador: 1,5% ≠ 15%, 15.000,00 ≠ 1.500.000, 10,5 ≠ 105, 1/12 ≠ 11/2, 10 ≠ 110 (revisão independente)', () => {
  recusa('A1', 'A garantia contratual será de 15% do valor do contrato', {}, /não está em A1/);
  recusa('A1', 'O valor estimado é de R$ 1.500.000 para o lote');
  recusa('A1', 'Prazo de atendimento de 105 horas úteis');
  recusa('A1', 'Entrega em 11/2/2026 no almoxarifado central');
  recusa('A1', '10 dias úteis, e o valor total');
  recusa('A1', '412,50 reais por mês');
  assert.ok(conf('A1', 'A garantia contratual será de 1,5% do valor do contrato').fo);
  assert.ok(conf('A1', 'O valor estimado é de R$ 15.000,00 para o lote').fo);
  assert.ok(conf('A1', '110 dias úteis, e o valor total').fo);
  // valor no meio da frase não é numeração de cláusula: não sai
  recusa('A1', 'e o valor total de reais por mês');
});

test('sinal conta: "≥ 8 °C" ≠ "≤ 8 °C", "-20 °C" ≠ "20 °C"; "-\\n10 °C" do PDF é o -10 (revisão independente)', () => {
  recusa('A1', 'A temperatura deve ser ≤ 8 °C na câmara');
  assert.ok(conf('A1', 'A temperatura deve ser ≥ 8 °C na câmara').fo);
  recusa('A1', 'e de 20 °C no freezer, e');
  assert.ok(conf('A1', 'e de -20 °C no freezer').fo);
  assert.ok(conf('A1', 'e de -10 °C no congelador').fo);
  recusa('A1', 'e de 10 °C no congelador');
});

test('limite de palavra e negação: "necessária" não casa em "desnecessária"; trecho que vem depois de "não"/"inexigível" ou corta um ": não" recusa', () => {
  recusa('A1', 'necessária a apresentação de certificado de acreditação RBC');
  recusa('A1', 'exigível a vistoria técnica prévia');
  recusa('A1', 'será exigida acreditação RBC dos laboratórios participantes', {}, /vem logo depois de "nao".*copie a negação junto/);
  recusa('A1', 'poderá subcontratar o objeto do contrato sem autorização');
  recusa('CAMPO:srp', 'Sistema de registro de preços', {}, /nao/);
  assert.ok(conf('A1', 'Não será exigida acreditação RBC dos laboratórios participantes').fo);
});

test('reticências: só na mesma frase (5 palavras ou mais cada, até 300 caracteres, sem ponto final nem negação no meio); nunca em capacidade e trava', () => {
  let r = conf('A1', 'Multa compensatória de 10% (dez por cento) (...) de 30% (trinta por cento) do valor do contrato');
  assert.ok(r.fo, r.problemas); assert.equal(r.fo.ajuste, 'reticencias');
  assert.match(r.fo.trecho, /^Multa compensatória de 10% \(dez por cento\) \(\.\.\.\) de 30% \(trinta por cento\) do valor do contrato$/);
  // ataques da revisão
  recusa('A1', 'A empresa não ... poderá subcontratar o objeto do contrato', {}, /pelo menos 5 palavras/);
  recusa('A1', 'Não será exigida acreditação RBC ... A empresa não poderá subcontratar', {}, /pelo menos 5 palavras|negação/);
  recusa('A1', 'Multa moratória de 0,5% (cinco décimos por cento) ... Multa compensatória de 10% (dez por cento)', {}, /mesma frase/);
  recusa('A1', 'A empresa poderá subcontratar o objeto ... do contrato sem autorização das partes');
  recusa('A1', 'Multa compensatória de 10% (dez por cento) (...) de 30% (trinta por cento) do valor do contrato', { capacidade: true }, /não valem em capacidade nem em trava/);
  recusa('A1', 'Multa compensatória de 10% (dez por cento) (...) de 30% (trinta por cento) do valor do contrato', { estrito: true }, /não valem em capacidade nem em trava/);
  const longe = ctx.Lic_trechoNaFonte_('primeira frase do texto corrido (...) última frase do texto corrido', { texto: 'primeira frase do texto corrido ' + 'palavra '.repeat(60) + ' última frase do texto corrido' });
  assert.equal(longe.ok, false, 'pedaços a mais de 300 caracteres');
});

test('quebra de página: o pedaço de antes termina na página e o de depois começa logo depois do cabeçalho repetido; grava com [quebra de página]', () => {
  const r = conf('A1', 'estes deverão ser reparados pela Contratada, às suas expensas, no total ou em parte, em prazo não superior a 15 (quinze) dias corridos');
  assert.ok(r.fo, r.problemas); assert.equal(r.fo.ajuste, 'pagina');
  assert.equal(r.fo.trecho, 'estes deverão ser reparados pela Contratada, às suas expensas [quebra de página] no total ou em parte, em prazo não superior a 15 (quinze) dias corridos');
  // ataque da revisão: pedaço de antes no meio da página, frase de outra página depois
  const at = ctx.Lic_trechoNaFonte_('A contratada deverá apresentar certificado de acreditação RBC dos laboratórios', { texto: 'A contratada deverá apresentar certificado de calibração rastreável\n1\n[página 7]\nPREFEITURA MUNICIPAL\nNão será exigida acreditação RBC dos laboratórios.' });
  assert.equal(at.ok, false);
  // menos de 5 palavras depois da página (Ibicaré: "Registro de Preços" é o cabeçalho, não a continuação)
  recusa('A2', 'Preenchimento do Anexo IV – Cadastro do Responsável pela Assinatura do Contrato ou da Ata de Registro de Preços');
  recusa('A1', 'estes deverão ser reparados pela Contratada, às suas expensas, no total ou em parte, em prazo não superior a 15 (quinze) dias corridos', { capacidade: true });
});

test('numeração de cláusula que abre a linha da fonte pode faltar; número trocado, número no meio da linha e "2.5." não somem (revisão independente)', () => {
  let r = conf('A1', 'deverá compreender, no mínimo: inspeção geral das condições físicas e funcionais do equipamento; limpeza técnica externa');
  assert.ok(r.fo, r.problemas); assert.equal(r.fo.ajuste, 'numeracao');
  assert.match(r.fo.trecho, /no mínimo: 1\.3\.1\. inspeção geral/, 'grava a fonte, com a numeração');
  recusa('A1', 'As penalidades seguem o subitem 9.9.9. do edital e a multa');
  recusa('A1', 'As penalidades seguem o subitem do edital e a multa');
  const g = ctx.Lic_trechoNaFonte_('A garantia é de 7.5. por cento ao mês', { texto: 'A garantia é de 2.5. por cento ao mês.' });
  assert.equal(g.ok, false);
  assert.equal(ctx.Lic_trechoNaFonte_('A garantia é de por cento ao mês', { texto: 'A garantia é de 2.5. por cento ao mês.' }).ok, false);
});

test('rótulo posto pela IA na frente sai e grava a fonte; número do rótulo diferente do da fonte recusa; "50 unidades" não perde o 50', () => {
  let r = conf('A2', 'LOTE 02 ITEM 01 UND Cadeira Oftalmológica - Cadeira clínica para exames oftálmicos', { capacidade: true });
  assert.ok(r.fo, r.problemas);
  assert.equal(r.fo.ajuste, 'rotulo');
  assert.equal(r.fo.trecho, 'Cadeira Oftalmológica - Cadeira clínica para exames oftálmicos');
  recusa('A2', 'Item 99 Termômetro digital tipo espeto com certificado', { capacidade: true }, /o número do rótulo \("99"\) não é o da fonte \("12"\)/);
  assert.ok(conf('A2', 'Item 12 Termômetro digital tipo espeto com certificado').fo);
  recusa('A2', '50 unidades de cadeira clínica para exames oftálmicos', {}, /não está em A2/);
});

test('relaxamentos só no texto enviado à IA: fora dele, só o literal', () => {
  const texto = '[página 1]\nTermo de referência.\n[página 2]\nManutenção preventiva deverá compreender, no mínimo:\n1.3.1. inspeção geral das condições físicas e funcionais do equipamento;\n';
  const f = { texto, textoPrompt: '[página 1]\nTermo de referência.\n[... 1 página(s) não enviada(s) à IA ...]' };
  assert.equal(ctx.Lic_trechoNaFonte_('no mínimo: inspeção geral das condições físicas e funcionais', f).ok, false, 'numeração tirada fora do texto enviado');
  assert.equal(ctx.Lic_trechoNaFonte_('no mínimo: 1.3.1. inspeção geral das condições físicas', f).ok, true, 'literal vale no texto inteiro');
});

test('trecho inventado continua recusado, com o pedaço mais parecido da fonte (ou a ref certa); a dica só nas primeiras 15 recusas', () => {
  let r = recusa('A1', 'Prazo de execução: até 20 (vinte) dias corridos, contados a partir do envio do e-mail');
  assert.match(r.problemas, /o mais perto em A1 é "Prazo de execução: até 20 \(vinte\) dias corridos, contados, a partir da entrega/);
  r = recusa('A1', 'calibração de 300 termômetros digitais com certificado acreditado');
  assert.match(r.problemas, /nenhum pedaço de 4 palavras seguidas dele está em A1/);
  r = recusa('A1', 'Cadeira Oftalmológica - Cadeira clínica para exames oftálmicos');
  assert.match(r.problemas, /ele está em A2: cite a ref A2/);
  const j = { resumo: 'Frase um. Frase dois.', capacidade: { justificativa: 'x', itens: [] }, documentacao: { pontos: 5, justificativa: 'x', exigencias: [] }, riscos: [], travas: [], afirmacoes: [] };
  for (let i = 0; i < 30; i++) j.afirmacoes.push({ tipo: 'FATO', criterio: 'x', texto: 't', fonte: { ref: 'A1', trecho: 'Prazo de execução: até 20 (vinte) dias corridos inventado ' + i } });
  const v = ctx.Lic_verificarAnalise_(j, B.cv);
  assert.equal(v.problemas.filter((p) => /o mais perto em/.test(p)).length, 15);
});

test('trecho longo e literal vale até 1.200 caracteres (grava 600); acima disso recusa', () => {
  const texto = 'Cláusula de garantia. ' + 'O contratado garante o serviço prestado durante o prazo. '.repeat(25);
  const b = montar([{ ref: 'A1', id: 1, titulo: 'TR', nome: 'tr.pdf', texto }]);
  const corte = (n) => texto.slice(0, n).replace(/\s+\S*$/, '');
  const p1 = [], p2 = [];
  const fo = ctx.Lic_conferirFonte_('risco 1', { ref: 'A1', trecho: corte(800) }, b.cv, p1);
  assert.ok(fo, p1.join()); assert.equal(fo.trecho.length, 600);
  assert.equal(ctx.Lic_conferirFonte_('risco 1', { ref: 'A1', trecho: corte(1300) }, b.cv, p2), null);
  assert.match(p2.join(), /trecho longo demais \(\d+ caracteres; o máximo é 1200/);
});

test('números do sistema citáveis como SISTEMA ("CALCULADO PELO SISTEMA") só em afirmação; campo composto do PNCP vale por parte', () => {
  let r = conf('CALCULADO PELO SISTEMA', '3 dias úteis até 05/11/2026', { tipo: 'FATO', permiteSistema: true });
  assert.ok(r.fo, r.problemas); assert.equal(r.fo.ref, 'SISTEMA');
  assert.match(conf('SISTEMA', '3 dias úteis até 05/11/2026', { capacidade: true }).problemas, /SISTEMA .* só vale em afirmação/);
  assert.equal(Object.keys(B.fontes).includes('SISTEMA'), false, 'não entra na lista de FONTES do pedido');
  assert.ok(conf('CAMPO:modalidade', 'Pregão - Eletrônico').fo);
});

test('fabricante: palavra comum do cadastro ("nova", "teste", "genérico") não vale como marca; marca de verdade continua recusada', () => {
  assert.deepEqual(Array.from(ctx.Lic_fabricantesLista_()), ['ortosintese']);
  const p = [];
  ctx.Lic_conferirTexto_('resumo', 'Pedir nova data e os testes de segurança elétrica.', B.cv, p, true);
  assert.deepEqual(p, []);
  ctx.Lic_conferirTexto_('capacidade, item 1, descrição', 'Bomba de água para autoclave Ortosíntese.', B.cv, p, true);
  assert.match(p.join(), /cita fabricante ou marca \(ortosintese\); escreva o tipo do equipamento sem a marca/);
});

test('catálogo: "eletrocardiograma" e "EKG" casam com CAL_ECG (caso real de Aparecida do Rio Doce)', () => {
  assert.equal(ctx.Lic_servicoCompativel_('CAL_ECG', 'APARELHO DE ELETROCARDIOGRAMA DA MARCA BIONET, MODELO CARDIOCARE 2000 (EKG-2000)'), '');
});

test('pedido à IA: até o orçamento, termo de referência antes da minuta, página repetida uma vez só, marcador do que não foi; o verificador confere o literal contra o texto inteiro', () => {
  const pag = (n, t) => '[página ' + n + ']\n' + t + ' ' + 'texto corrido da página. '.repeat(120) + '\n';
  const tr = pag(1, 'TERMO DE REFERÊNCIA. Especificação dos itens: calibração de termômetros e manutenção de autoclave.') + pag(2, 'Habilitação: atestado de capacidade técnica.');
  const minuta = pag(1, 'MINUTA DO CONTRATO. CLÁUSULA PRIMEIRA. Das partes.') + pag(2, 'CLÁUSULA SEGUNDA. Do foro da comarca escolhida.');
  const edital = pag(1, 'EDITAL DO PREGÃO. Do objeto e da participação.') + pag(2, 'Habilitação: atestado de capacidade técnica.') + pag(3, 'Multa de 20% sobre o valor do contrato e garantia de 5%.');
  const b = montar([{ ref: 'A1', id: 1, titulo: 'Minuta do contrato', nome: 'minuta.pdf', texto: minuta }, { ref: 'A2', id: 2, titulo: 'Termo de Referência', nome: 'tr.pdf', texto: tr }, { ref: 'A3', id: 3, titulo: 'Edital', nome: 'edital.pdf', texto: edital }]);
  const est = ctx.Lic_selecionarTextos_(b.fontes, 13000);
  assert.ok(est.enviado <= 13000, String(est.enviado));
  assert.equal(est.repetidas, 1, 'a página de habilitação repetida no edital vai uma vez só');
  assert.match(b.fontes.A2.textoPrompt, /TERMO DE REFERÊNCIA/);
  assert.match(b.fontes.A3.textoPrompt, /Multa de 20%/);
  assert.match(b.fontes.A3.textoPrompt, /1 página\(s\) repetida\(s\) de outro arquivo/);
  assert.match(b.fontes.A1.textoPrompt, /página\(s\) não enviada\(s\) à IA/);
  assert.doesNotMatch(b.fontes.A1.textoPrompt, /Do foro da comarca/);
  const prompt = ctx.Lic_promptAnalise_(OP, b.fontes, b.codigo, b.pesos, '2026-11-01', 'FONTE-teste');
  assert.doesNotMatch(prompt, /Do foro da comarca/);
  assert.match(prompt, /TRECHO \(campo "trecho" de toda fonte\): de 5 a 30 palavras seguidas/);
  const p = [];
  assert.ok(ctx.Lic_conferirFonte_('exigência 1', { ref: 'A1', trecho: 'CLÁUSULA SEGUNDA. Do foro da comarca escolhida.' }, b.cv, p), p.join());
});

test('SGO_DocA4_chamarGemini_: raciocínio, JSON e prazo só para quem pede; sem as opções, o pedido é o de sempre', () => {
  const pedidos = [];
  let agora = 1000;
  const g = vm.createContext({
    console, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt,
    Date: { now: () => agora },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => ({ GEMINI_API_KEY: 'chave-de-teste', IA_MODEL: 'gemini-2.5-flash' })[k] || null }) },
    Utilities: { sleep() {} },
    UrlFetchApp: { fetch: (url, o) => { pedidos.push(JSON.parse(o.payload).generationConfig); agora += 60000; return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ finishReason: pedidos.length === 1 && g.__cortar ? 'MAX_TOKENS' : 'STOP', content: { parts: [{ text: '{"ok":1}' }] } }] }) }; } }
  });
  vm.runInContext(ler('SGO_DocA4.js'), g, { filename: 'SGO_DocA4.js' });
  g.SGO_DocA4_chamarGemini_('p', { tokens: 16384, temperatura: 0.2 });
  assert.deepEqual(JSON.parse(JSON.stringify(pedidos[0])), { maxOutputTokens: 16384, temperature: 0.2, thinkingConfig: { thinkingBudget: -1 } });
  g.SGO_DocA4_chamarGemini_('p', { tokens: 20480, temperatura: 0.1, raciocinio: 4096, json: true });
  assert.deepEqual(JSON.parse(JSON.stringify(pedidos[1])), { maxOutputTokens: 20480, temperature: 0.1, thinkingConfig: { thinkingBudget: 4096 }, responseMimeType: 'application/json' });
  pedidos.length = 0; g.__cortar = true;
  assert.throws(() => g.SGO_DocA4_chamarGemini_('p', { tokens: 20480, raciocinio: 4096, json: true, prazoAte: agora + 30000 }), /resposta incompleta \(MAX_TOKENS\) \(sem tempo para tentar de novo\)/);
  assert.equal(pedidos.length, 1);
});

// reconferência da revisão independente (02/11/2026): a junção do PDF apagava a negação; a negação longe e depois de "?" ou "–"
test('negação: junção do PDF nunca come a negação; negação no começo da frase (até 12 palavras) e depois de ? – | ou quebra de linha recusa', () => {
  const texto = ['Grupo D vedada a participação de consórcios no certame.', 'Lote B nenhuma certidão será exigida para o lote.',
    'Não será, sob qualquer pretexto, exigida acreditação RBC do laboratório.', 'A empresa não precisará, nesta fase, apresentar certidão de regularidade fiscal.',
    'Exige acreditação RBC do laboratório? Não.', 'Exige garantia de proposta do licitante – Não', 'Exige vistoria técnica prévia obrigatória\nNÃO',
    'Exige atestado de capacidade técnica | NÃO |', 'Garantia: 5 % do valor do contrato, dispensada para microempresas.',
    'Anexo P essoas jurídicas impedidas de licitar serão inabilitadas.', 'O prazo de entrega será de 10 dias corridos não prorrogáveis.',
    'Hora técnica: HORA_TECNICO, HORA_ENGENHEIRO.', 'SEM serviço no catálogo hoje: osmose reversa.'].join('\n');
  const f = { texto };
  const r = (t) => ctx.Lic_trechoNaFonte_(t, f);
  for (const t of ['a participação de consórcios no certame', 'certidão será exigida para o lote', 'exigida acreditação RBC do laboratório',
    'apresentar certidão de regularidade fiscal', 'Exige acreditação RBC do laboratório', 'Exige garantia de proposta do licitante',
    'Exige vistoria técnica prévia obrigatória', 'Exige atestado de capacidade técnica', 'Garantia: 5 % do valor do contrato']) {
    const x = r(t);
    assert.equal(x.ok, false, 'aceitou: ' + t);
    assert.match(x.motivo || '', /copie a negação junto/, t);
  }
  assert.deepEqual(Array.from(ctx.Lic_tokens_('Grupo D vedada a participação', true).toks), ['grupo', 'd', 'vedada', 'a', 'participacao'], 'não junta antes de negação');
  assert.equal(r('Pessoas jurídicas impedidas de licitar serão inabilitadas').ok, true, 'a junção legítima continua');
  assert.equal(r('O prazo de entrega será de 10 dias corridos').ok, true, 'negação depois de só espaço não conta');
  assert.equal(r('Hora técnica: HORA_TECNICO, HORA_ENGENHEIRO.').ok, true, 'negação na frase seguinte (depois do ponto) não conta');
  assert.equal(r('Não será, sob qualquer pretexto, exigida acreditação RBC do laboratório').ok, true, 'com a negação junto vale');
});

// segunda reconferência (02/11/2026): negação sozinha depois do trecho, janela até o começo da frase, negações novas
test('negação sozinha depois do trecho recusa com qualquer separador; negação que abre outra oração com conteúdo não; janela até 40 palavras; inaplicável, dispensável, isenta', () => {
  const r = (src, t) => ctx.Lic_trechoNaFonte_(t, { texto: src });
  const recusam = [
    ['Exige acreditação RBC do laboratório; NÃO\nOutro item.', 'Exige acreditação RBC do laboratório'],
    ['Exige acreditação RBC do laboratório. Não.', 'Exige acreditação RBC do laboratório'],
    ['Exige acreditação RBC do laboratório Não\nExige vistoria Sim', 'Exige acreditação RBC do laboratório'],
    ['Não será, em hipótese alguma e por qualquer motivo que venha a ser alegado pelos participantes deste certame ou por terceiros interessados, exigida acreditação RBC do laboratório.', 'exigida acreditação RBC do laboratório'],
    ['É inaplicável a exigência de acreditação RBC do laboratório.', 'a exigência de acreditação RBC do laboratório'],
    ['Fica dispensável a apresentação de atestado de capacidade técnica.', 'a apresentação de atestado de capacidade técnica'],
    ['A microempresa fica isenta da garantia contratual de 5% do valor.', 'da garantia contratual de 5% do valor'],
    ['A vistoria é facultativa e a visita técnica ao local poderá ser agendada.', 'a visita técnica ao local poderá ser agendada'],
    ['Não P essoas jurídicas impedidas serão aceitas.', 'Pessoas jurídicas impedidas serão aceitas']
  ];
  for (const [src, t] of recusam) { const x = r(src, t); assert.equal(x.ok, false, 'aceitou: ' + src); }
  assert.equal(r('Será exigida acreditação RBC do laboratório; não se aplica aos itens de balança.', 'Será exigida acreditação RBC do laboratório').ok, true);
  assert.equal(r('A contratada deverá apresentar acreditação RBC não sendo aceita a rastreabilidade.', 'A contratada deverá apresentar acreditação RBC').ok, true);
  // item numerado que abre a linha começa outra cláusula: a negação da cláusula de cima não conta
  assert.equal(r('8.7 Documento sem rasura\n8.8 portaria de autorização de funcionamento no Brasil', 'portaria de autorização de funcionamento no Brasil').ok, true);
});
