// SGO+ Licitações, revisão de 02/11/2026 (banco de prova): o verificador da análise por IA com o texto REAL dos editais.
// Na produção (02/11), 20 análises com o texto do edital foram recusadas e 4 perderam o tempo: trechos copiados certos não
// batiam porque o PDF quebra linha, hifeniza fim de linha e põe o cabeçalho da página no meio da frase; a IA tirava a
// numeração da cláusula e punha "Item 1" na frente; "nova" e "teste" do cadastro de equipamentos valiam como marca.
// Os casos abaixo são pedaços curtos dos editais reais (TRT-2 DE-209/26, Ibicaré/SC, Aparecida do Rio Doce/GO, Iporã do
// Oeste/SC, tacógrafos de Itaberaba/BA); a regra central continua: o que fica gravado como prova está na fonte.
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
    console, Date, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt, Uint8Array,
    Utilities: { getUuid: () => '0123456789abcdef0123456789abcdef' }, Session: { getScriptTimeZone: () => 'America/Sao_Paulo' },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    SGO_DATA: { getAll: () => [] }, SGO_CFG: { SHEETS: {} },
    ComEsp_fabricantes_: () => fabricantes || ['ortosintese', 'nova', 'teste', 'generico', 'nao consta']
  });
  for (const f of ['SGO_Expediente.js', 'SGO_Licitacoes_Config.js', 'SGO_Licitacoes.js', 'SGO_Licitacoes_Analise.js']) vm.runInContext(ler(f), ctx, { filename: f });
  return ctx;
}
const ctx = contexto();

// TRT-2, aviso de dispensa 209/2026 (A1), com a hifenização e a quebra de página como o extrator entrega
const TRT2 = 'Prazo de execução: até 20 (vinte) dias corridos, contados, a partir da entrega dos respectivos equipamentos à Con-\ntratada e da autorização para realização dos serviços.\n1\n[página 2]\nPODER JUDICIÁRIO\nJUSTIÇA DO TRABALHO\n' +
  'Manutenção preventiva – a manutenção preventiva deverá compreender, no mínimo:\n1.3.1. inspeção geral das condições físicas e funcionais do equipamento;\n1.3.2. limpeza técnica externa e interna, quando aplicável;\n' +
  '13.7.2. Multa moratória de 0,5% (cinco décimos por cento) do valor do contrato, em caso de\natraso injustificado, por dia, até o limite de 15% (quinze por cento).\n13.7.2.1. O atraso superior a 30 (trinta) dias autoriza a Administração a promover a\nextinção da contratação.\n' +
  '13.7.3. Multa compensatória de 10% (dez por cento) do valor do contrato em caso de\ninexecução parcial e de 30% (trinta por cento) do valor do contrato em caso de inexecução\ntotal do objeto.\n' +
  'O prazo de garantia é de 110 dias úteis, e o valor total de 4.412,50 reais por mês. O certiﬁcado deve ser “rastreável” à RBC.\n';
// Ibicaré/SC, edital (A2): a página vira no meio do item 7.2.1.7
const IBICARE = '7.2.1.7. Preenchimento do Anexo IV – Cadastro do Responsável pela Assinatura do Contrato ou da Ata de\n[página 10]\nESTADO DE SANTA CATARINA\nPREFEITURA MUNICIPAL DE IBICARÉ\nRegistro de Preços\n7.2.1.8. Caso o signatário indicado não seja o representante legal.\n' +
  '01 01 UND\nCadeira Oftalmológica - Cadeira clínica para exames oftálmicos com sistema de ajuste elétrico de altura.\n5 unidades de cadeira clínica para exames oftálmicos.\n' +
  'APARELHO DE ELETROCARDIOGRAMA DA MARCA BIONET, MODELO CARDIOCARE 2000 (EKG-2000), COMPREENDENDO CALIBRAÇÃO E TESTES DE SEGURANÇA.\n';
const OP = { ID: 'op1', CODIGO: 'LIC-2026-0097', UF: 'GO', MUNICIPIO: 'Aparecida do Rio Doce', MODALIDADE: 'Pregão - Eletrônico', MODO_DISPUTA: 'Aberto', OBJETO: 'Manutenção corretiva de 04 equipamentos médicos',
  VALOR_ESTIMADO: 8431.44, ENCERRAMENTO_PROPOSTAS: '2026-11-05T11:00:00', TRIAGEM: 'CANDIDATA' };
function montar(textos) {
  const fontes = ctx.Lic_fontesAnalise_(OP, { itens: [] }, textos || [{ ref: 'A1', id: 1, titulo: 'Aviso', nome: 'aviso.pdf', texto: TRT2 }, { ref: 'A2', id: 2, titulo: 'Edital', nome: 'edital.pdf', texto: IBICARE }]);
  const pesos = Object.assign({}, ctx.LIC_NOTA_PADRAO);
  const codigo = ctx.Lic_criteriosCodigo_(OP, pesos, '2026-11-01');
  return { fontes, pesos, codigo, cv: ctx.Lic_ctxVerificador_(OP, fontes, pesos, codigo) };
}
const B = montar();
function conf(ref, trecho, o) { const problemas = []; const fo = ctx.Lic_conferirFonte_('afirmação 1', { ref, trecho }, B.cv, problemas, o); return { fo, problemas: problemas.join(' | ') }; }

test('quebra do PDF: hífen de fim de linha, quebra de linha, ligadura e aspas tipográficas não recusam trecho copiado certo', () => {
  let r = conf('A1', 'a partir da entrega dos respectivos equipamentos à Contratada e da autorização');
  assert.ok(r.fo, r.problemas); assert.equal(r.fo.ajuste, '');
  r = conf('A1', 'O certificado deve ser "rastreável" à RBC');
  assert.ok(r.fo, r.problemas);
  r = conf('A1', 'multa moratória de 0,5% (cinco décimos por cento) do valor do contrato, em caso de atraso injustificado');
  assert.ok(r.fo, r.problemas);
});

test('número na borda do trecho: "10 dias" não vale dentro de "110 dias", nem "412,50 reais" dentro de "4.412,50 reais"', () => {
  assert.match(conf('A1', '10 dias úteis, e o valor total').problemas, /não está em A1/);
  assert.match(conf('A1', '412,50 reais por mês').problemas, /não está em A1/);
  assert.ok(conf('A1', '110 dias úteis, e o valor total').fo);
  // valor não é numeração de cláusula: não sai do meio da frase
  assert.match(conf('A1', 'e o valor total de reais por mês').problemas, /não está em A1/);
});

test('reticências: pedaços literais da mesma fonte, em ordem e perto, cada um com 3 palavras ou mais; pedaço curto, fora de ordem ou longe recusa', () => {
  let r = conf('A1', 'Multa compensatória de (...) 30% (trinta por cento) do valor do contrato em caso de inexecução total do objeto.');
  assert.ok(r.fo, r.problemas); assert.equal(r.fo.ajuste, 'reticencias');
  r = conf('A1', 'Multa moratória de 0,5% (cinco décimos por cento) ... Multa compensatória de 10% (dez por cento)');
  assert.ok(r.fo, r.problemas);
  // caso real de Aparecida: "calibração (...) em 4 (quatro) equipamentos" — pedaço de 1 palavra
  assert.match(conf('A1', 'calibração (...) em caso de inexecução parcial').problemas, /cada pedaço precisa de pelo menos 3 palavras/);
  assert.match(conf('A1', 'Multa compensatória de 10% [...] Multa moratória de 0,5%').problemas, /não está em A1/, 'fora de ordem');
  const longe = ctx.Lic_trechoNaFonte_('primeira frase do texto (...) última frase do texto', { texto: 'primeira frase do texto ' + 'x '.repeat(1000) + ' última frase do texto' });
  assert.equal(longe.ok, false, 'pedaços a mais de 1500 caracteres');
});

test('quebra de página no meio da frase (cabeçalho entre os pedaços) vale; o mesmo intervalo sem o marcador [página N] não vale', () => {
  const r = conf('A2', 'Preenchimento do Anexo IV – Cadastro do Responsável pela Assinatura do Contrato ou da Ata de Registro de Preços');
  assert.ok(r.fo, r.problemas); assert.equal(r.fo.ajuste, 'pagina');
  const sem = ctx.Lic_trechoNaFonte_('Cadastro do Responsável pela Assinatura do Contrato ou da Ata de Registro de Preços', { texto: IBICARE.replace('[página 10]', '') });
  assert.equal(sem.ok, false);
});

test('numeração de cláusula tirada pela IA ("no mínimo: inspeção geral" onde a fonte diz "no mínimo: 1.3.1. inspeção geral") vale', () => {
  let r = conf('A1', 'deverá compreender, no mínimo: inspeção geral das condições físicas e funcionais do equipamento; limpeza técnica externa');
  assert.ok(r.fo, r.problemas); assert.equal(r.fo.ajuste, 'numeracao');
  r = conf('A1', 'até o limite de 15% (quinze por cento). O atraso superior a 30 (trinta) dias');
  assert.ok(r.fo, r.problemas);
});

test('rótulo posto pela IA na frente ("LOTE 02 ITEM 01 UND") sai e grava só o que está na fonte; número solto ("50 unidades") não sai', () => {
  const r = conf('A2', 'LOTE 02 ITEM 01 UND Cadeira Oftalmológica - Cadeira clínica para exames oftálmicos', { capacidade: true });
  assert.ok(r.fo, r.problemas);
  assert.equal(r.fo.ajuste, 'rotulo');
  assert.equal(r.fo.trecho, 'Cadeira Oftalmológica - Cadeira clínica para exames oftálmicos');
  assert.match(conf('A2', '50 unidades de cadeira clínica para exames oftálmicos').problemas, /não está em A2/);
});

test('trecho inventado continua recusado, com o pedaço mais parecido da fonte (ou a ref certa) para a nova tentativa', () => {
  let r = conf('A1', 'Prazo de execução: até 20 (vinte) dias corridos, contados a partir do envio do e-mail');
  assert.equal(r.fo, null);
  assert.match(r.problemas, /o mais perto em A1 é "Prazo de execução: até 20 \(vinte\) dias corridos, contados, a partir da entrega/);
  r = conf('A1', 'calibração de 300 termômetros digitais com certificado acreditado');
  assert.match(r.problemas, /nenhum pedaço de 4 palavras seguidas dele está em A1/);
  r = conf('A1', 'Cadeira Oftalmológica - Cadeira clínica para exames oftálmicos');
  assert.match(r.problemas, /ele está em A2: cite a ref A2/);
});

test('trecho longo e literal vale até 1.200 caracteres (grava 600); acima disso recusa', () => {
  const texto = 'Cláusula de garantia. ' + 'O contratado garante o serviço prestado durante o prazo. '.repeat(25);
  const b = montar([{ ref: 'A1', id: 1, titulo: 'TR', nome: 'tr.pdf', texto }]);
  const p1 = [], p2 = [];
  const fo = ctx.Lic_conferirFonte_('risco 1', { ref: 'A1', trecho: texto.slice(0, 800) }, b.cv, p1);
  assert.ok(fo, p1.join()); assert.equal(fo.trecho.length, 600);
  assert.equal(ctx.Lic_conferirFonte_('risco 1', { ref: 'A1', trecho: texto.slice(0, 1300) }, b.cv, p2), null);
  assert.match(p2.join(), /trecho longo demais \(1300 caracteres; o máximo é 1200/);
});

test('números do sistema citáveis como SISTEMA ("CALCULADO PELO SISTEMA") só em afirmação; campo composto do PNCP vale por parte', () => {
  let r = conf('CALCULADO PELO SISTEMA', '3 dias úteis até 05/11/2026', { tipo: 'FATO', permiteSistema: true });
  assert.ok(r.fo, r.problemas); assert.equal(r.fo.ref, 'SISTEMA');
  assert.match(conf('SISTEMA', '3 dias úteis até 05/11/2026', { capacidade: true }).problemas, /SISTEMA .* só vale em afirmação/);
  assert.equal(Object.keys(B.fontes).includes('SISTEMA'), false, 'não entra na lista de FONTES do pedido');
  r = conf('CAMPO:modalidade', 'Pregão - Eletrônico');
  assert.ok(r.fo, r.problemas);
});

test('fabricante: palavra comum do cadastro ("nova", "teste", "genérico") não vale como marca; marca de verdade continua recusada', () => {
  const lista = ctx.Lic_fabricantesLista_();
  assert.deepEqual(Array.from(lista), ['ortosintese']);
  const p = [];
  ctx.Lic_conferirTexto_('resumo', 'Pedir nova data e os testes de segurança elétrica.', B.cv, p, true);
  assert.deepEqual(p, []);
  ctx.Lic_conferirTexto_('capacidade, item 1, descrição', 'Bomba de água para autoclave Ortosíntese.', B.cv, p, true);
  assert.match(p.join(), /cita fabricante ou marca \(ortosintese\); escreva o tipo do equipamento sem a marca/);
});

test('catálogo: "eletrocardiograma" e "EKG" casam com CAL_ECG (caso real de Aparecida do Rio Doce)', () => {
  assert.equal(ctx.Lic_servicoCompativel_('CAL_ECG', 'APARELHO DE ELETROCARDIOGRAMA DA MARCA BIONET, MODELO CARDIOCARE 2000 (EKG-2000)'), '');
});

test('pedido à IA: até o orçamento, termo de referência antes da minuta, página repetida uma vez só, marcador do que não foi; o verificador confere contra o texto inteiro', () => {
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
  // a prova que ficou fora do pedido continua conferível contra o texto inteiro
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
  g.SGO_DocA4_chamarGemini_('p', { tokens: 16384, temperatura: 0.1, raciocinio: 4096, json: true });
  assert.deepEqual(JSON.parse(JSON.stringify(pedidos[1])), { maxOutputTokens: 16384, temperature: 0.1, thinkingConfig: { thinkingBudget: 4096 }, responseMimeType: 'application/json' });
  // prazo: resposta cortada depois do prazo não abre chamada em outro modelo (que estouraria o tempo do servidor)
  pedidos.length = 0; g.__cortar = true;
  assert.throws(() => g.SGO_DocA4_chamarGemini_('p', { tokens: 16384, raciocinio: 4096, json: true, prazoAte: agora + 30000 }), /resposta incompleta \(MAX_TOKENS\) \(sem tempo para tentar de novo\)/);
  assert.equal(pedidos.length, 1);
});
