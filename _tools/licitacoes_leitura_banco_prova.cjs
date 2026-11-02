// SGO+ Licitações — banco de prova da LEITURA ESPECIALISTA DO EDITAL (02/11/2026).
//
// Roda o verificador da leitura (LicLeit_verificarBloco_ e LicLeit_verificarConsolidacao_) do código do SGO+ sobre o que a
// produção guardou: as respostas CRUAS da IA de cada bloco lido (LIC_LEITURA_RESULTADOS.RESPOSTA_IA), a última resposta da
// consolidação (LIC_LEITURAS.CONSOLIDACAO_RESPOSTA) e os motivos das recusas (LIC_LEITURA_BLOCOS.PROBLEMAS_JSON), com o texto
// de cada arquivo do edital. Não chama a IA, não acessa a produção: lê um arquivo exportado (sem segredos).
//
// Uso:  node _tools/licitacoes_leitura_banco_prova.cjs <producao_leitura.json> [pasta-do-legado] [--detalhe]
//   producao_leitura.json: { leituras, blocos, resultados, arquivos } (linhas das abas, a primeira linha é o cabeçalho;
//     arquivos = [{ sha256, nome, texto }])
//   pasta-do-legado: onde estão os .js do SGO+ (padrão: apps-script-imports/portal_sgo_versao_cnpj_db). Para "antes × depois",
//     rode uma vez com a pasta de uma versão anterior (git show <rev>:...) e outra com a atual.
//
// Mostra: (1) a tabela das causas das recusas guardadas, por regra; (2) cada resposta crua de bloco conferida de novo (itens
// aceitos, recusados); (3) quantos blocos o edital dá com o tamanho de bloco da versão; (4) a consolidação: recusada inteira, ou
// publicada com as frases que passaram e as retiradas listadas.
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');

const args = process.argv.slice(2);
const detalhe = args.includes('--detalhe');
const pos = args.filter((a) => !a.startsWith('--'));
if (!pos[0]) { console.error('Uso: node _tools/licitacoes_leitura_banco_prova.cjs <producao_leitura.json> [pasta-do-legado] [--detalhe]'); process.exit(2); }
const pasta = pos[1] || path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const d = JSON.parse(fs.readFileSync(pos[0], 'utf8'));
const tab = (t) => { const h = t[0]; return t.slice(1).map((r) => { const o = {}; h.forEach((c, i) => { o[c] = r[i]; }); return o; }); };
const leituras = tab(d.leituras), blocos = tab(d.blocos), resultados = tab(d.resultados);

// ------------------------------------------------------------ código real do SGO+ num contexto isolado
const ctx = vm.createContext({
  console, Date, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt, Buffer,
  Utilities: { getUuid: () => crypto.randomUUID(), computeDigest: (a, t) => Array.from(crypto.createHash('sha256').update(String(t), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)), DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF-8' }, formatDate: () => '', sleep() {} },
  Session: { getScriptTimeZone: () => 'America/Sao_Paulo' },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
  CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
  SGO_DATA: { getAll: () => [] }, ComEsp_fabricantes_: () => []
});
for (const f of ['SGO_Expediente.js', 'SGO_Licitacoes_Config.js', 'SGO_Licitacoes.js', 'SGO_Licitacoes_Analise.js', 'SGO_Licitacoes_Agenda.js', 'SGO_Licitacoes_Leitura.js']) {
  vm.runInContext(fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n'), ctx, { filename: f });
}
const c = ctx;
const versao = vm.runInContext('LIC_LEIT_REGRAS', ctx);

// arquivos da exportação na forma que a leitura usa (ref = a mesma da leitura gravada, pelo SHA-256)
const le = leituras[0], arqsLeitura = JSON.parse(le.ARQUIVOS_JSON || '[]');
const arquivos = d.arquivos.map((a) => {
  const g = arqsLeitura.find((x) => x.sha256 === a.sha256) || {};
  const x = { ref: g.ref || '?', id: g.id || 0, titulo: g.titulo || a.nome, nome: a.nome, sha256: a.sha256, texto: a.texto, completo: true, situacao: 'EXTRAIDO' };
  x._ind = c.LicLeit_indice_(x.texto);
  return x;
});
const porSha = {}; arquivos.forEach((a) => { porSha[a.sha256] = a; });

console.log('Banco de prova da leitura do edital · regras ' + versao + ' · pasta ' + path.relative(process.cwd(), pasta));
console.log('Leitura ' + le.VERSAO + ': ' + le.SITUACAO + ', consolidação ' + le.CONSOLIDACAO_SITUACAO + ', ' + blocos.length + ' blocos (' + ['LIDO', 'REPETIDO', 'FALHOU'].map((s) => blocos.filter((b) => b.SITUACAO === s).length + ' ' + s).join(', ') + ')\n');

// ------------------------------------------------------------ 1. causas das recusas guardadas (última tentativa de cada bloco)
const REGRAS = [
  ['itens demais no bloco (> 40)', /no máximo \d+ itens por bloco/],
  ['trecho cortado antes ou depois de negação', /vem logo depois de "/],
  ['trecho não literal (o mais perto existe)', /não está em A\d+.*o mais perto/],
  ['trecho não literal (nada parecido)', /não está em A\d+/],
  ['trecho curto demais (< 3 palavras)', /trecho curto demais/],
  ['trecho fora do bloco', /não está NESTE bloco/],
  ['tema fora da lista', /tema fora da lista/],
  ['outra', /./]
];
const conta = {};
blocos.forEach((b) => {
  (JSON.parse(b.PROBLEMAS_JSON || '[]') || []).forEach((p) => { const r = REGRAS.find((x) => x[1].test(p)); conta[r[0]] = (conta[r[0]] || 0) + 1; });
});
console.log('1. Causas das recusas guardadas (última tentativa dos blocos não lidos):');
REGRAS.forEach((r) => { if (conta[r[0]]) console.log('   ' + String(conta[r[0]]).padStart(3) + '  ' + r[0]); });

// ------------------------------------------------------------ 2. respostas cruas guardadas, conferidas de novo
console.log('\n2. Respostas cruas dos blocos lidos, conferidas pelo verificador desta versão:');
let aceitos = 0, recusados = 0, blocosOk = 0, blocosRec = 0;
resultados.filter((r) => r.ORIGEM === 'IA' && r.RESPOSTA_IA).forEach((r) => {
  const b = blocos.find((x) => x.ID === r.BLOCO_ID), a = b && porSha[b.ARQUIVO_SHA];
  if (!b || !a) return;
  const bb = { ref: a.ref, ordem: Number(b.ORDEM), ini: Number(b.CAR_INI), fim: Number(b.CAR_FIM), rotulo: b.PAGINAS_ROTULO };
  const f = c.LicLeit_fonteBloco_(a, bb), cx = { fontes: {}, pesos: c.LIC_NOTA_PADRAO, fabricantes: [], arquivos };
  cx.fontes[a.ref] = f;
  let j = null; try { j = JSON.parse(String(r.RESPOSTA_IA).replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '')); } catch (e) { j = null; }
  const v = c.LicLeit_verificarBloco_(j, a, bb, cx);
  const n = j && Array.isArray(j.itens) ? j.itens.length : 0;
  if (v.ok) { blocosOk++; aceitos += v.itens.length; } else { blocosRec++; recusados += n; }
  console.log('   bloco ' + b.ORDEM + ' (' + a.ref + ', ' + b.PAGINAS_ROTULO + '): ' + n + ' item(ns) → ' + (v.ok ? 'aceito, ' + v.itens.length + ' item(ns), ' + v.itens.filter((x) => x.tipo === 'PENDENCIA').length + ' pendência(s)' : 'RECUSADO: ' + v.problemas.length + ' problema(s)'));
  if (detalhe && !v.ok) v.problemas.slice(0, 8).forEach((p) => console.log('      - ' + p.slice(0, 220)));
});
console.log('   total: ' + blocosOk + ' bloco(s) aceito(s) com ' + aceitos + ' item(ns); ' + blocosRec + ' recusado(s)');

// ------------------------------------------------------------ 3. tamanho do bloco
const plano = [];
arquivos.forEach((a) => { c.LicLeit_dividir_(a, '').forEach((b) => plano.push(b)); });
const car = vm.runInContext('LIC_LEIT_BLOCO_CAR', ctx), pag = vm.runInContext('LIC_LEIT_BLOCO_PAGINAS', ctx), max = vm.runInContext('LIC_LEIT_ITENS_MAX', ctx);
console.log('\n3. Blocos com o tamanho desta versão (até ' + car + ' caracteres e ' + pag + ' páginas; até ' + max + ' itens por bloco): ' + plano.length + ' bloco(s), maior com ' + Math.max.apply(null, plano.map((b) => b.caracteres)) + ' caracteres');
// estimativa: itens por mil caracteres nos blocos lidos da produção
const lidos = blocos.filter((b) => b.SITUACAO === 'LIDO' && Number(b.ITENS_QTD));
const taxa = lidos.reduce((s, b) => s + Number(b.ITENS_QTD), 0) / Math.max(1, lidos.reduce((s, b) => s + Number(b.CARACTERES), 0)) * 1000;
const recusadosPorTamanho = blocos.filter((b) => /no máximo \d+ itens por bloco \(vieram (\d+)\)/.test(b.PROBLEMAS_JSON || ''));
const taxaRec = recusadosPorTamanho.map((b) => Number(/vieram (\d+)/.exec(b.PROBLEMAS_JSON)[1]) / Number(b.CARACTERES) * 1000);
const pior = Math.max(taxa, ...taxaRec);
console.log('   itens por mil caracteres: ' + taxa.toFixed(2) + ' nos blocos lidos; até ' + pior.toFixed(2) + ' nos recusados por excesso → bloco de ' + car + ' caracteres dá até ' + Math.round(pior * car / 1000) + ' item(ns) (limite ' + max + ')');

// ------------------------------------------------------------ 4. consolidação
console.log('\n4. Consolidação (última resposta guardada):');
// a produção cortou CHECKLIST_JSON em 48 mil caracteres (JSON quebrado): o checklist é refeito dos itens guardados, como a
// consolidação o montou (mesma ordem dos blocos, mesma função): os I1, I2... da resposta guardada são os mesmos
let checklist;
try { checklist = JSON.parse(le.CHECKLIST_JSON || '[]'); console.log('   checklist gravado: ' + checklist.length + ' item(ns)'); }
catch (e) {
  const res = {}; resultados.forEach((r) => { res[r.ID] = r; });
  checklist = c.LicLeit_checklist_(c.LicLeit_itensDe_(blocos, res));
  console.log('   checklist gravado: JSON cortado em ' + String(le.CHECKLIST_JSON).length + ' caracteres (inválido); refeito dos itens guardados: ' + checklist.length + ' item(ns)');
}
// campos públicos do PNCP desta oportunidade (Aparecida do Rio Doce/GO, LIC-2026-0097; os mesmos dos testes da análise)
const OP = { ID: le.OPORTUNIDADE_ID, CODIGO: le.CODIGO, ORGAO_NOME: 'MUNICIPIO DE APARECIDA DO RIO DOCE', UNIDADE_NOME: 'FMS', UF: 'GO', MUNICIPIO: 'Aparecida do Rio Doce', MODALIDADE: 'Dispensa', MODO_DISPUTA: 'Dispensa Com Disputa',
  AMPARO_LEGAL: 'Lei 14.133/2021, Art. 75, II', OBJETO: 'DISPENSA DE LICITAÇÃO PARA CONTRATAÇÃO DE EMPRESA ESPECIALIZADA PARA PRESTAÇÃO DE SERVIÇOS DE DIAGNÓSTICO TÉCNICO E MANUTENÇÃO CORRETIVA DE 04 (QUATRO) EQUIPAMENTOS MÉDICOS E FISIOTERAPÊUTICOS, SENDO',
  VALOR_ESTIMADO: 8431.44, ABERTURA_PROPOSTAS: '2026-11-03T07:00:00', ENCERRAMENTO_PROPOSTAS: '2026-11-05T11:00:00', SRP: 'NAO' };
const cob = JSON.parse(le.COBERTURA_JSON || '{"total":{"texto":""}}');
const fontesCons = c.LicLeit_fontesConsolidacao_(OP, checklist, [], cob.total.texto);
const cx = { fontes: {}, fontesCons, pesos: c.LIC_NOTA_PADRAO, fabricantes: [] };
let j = null; try { j = JSON.parse(String(le.CONSOLIDACAO_RESPOSTA || '').replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '')); } catch (e) { j = null; }
const v = c.LicLeit_verificarConsolidacao_(j, cx);
const pub = v.ok ? v.saida : v.aproveitavel ? v.saida : null;
const frases = (s) => (s ? s.resumo.length + Object.keys(s.estrategia).reduce((n, k) => n + (s.estrategia[k] || []).length, 0) : 0);
console.log('   ' + (pub ? 'PUBLICADA: ' + frases(pub) + ' frase(s) (' + pub.resumo.length + ' no resumo), ' + (pub.retiradas || []).length + ' retirada(s) pelo verificador' : 'RECUSADA inteira: ' + v.problemas.length + ' problema(s)'));
if (pub && detalhe) (pub.retiradas || []).forEach((x) => console.log('      retirada (' + x.secao + '): ' + x.texto.slice(0, 90) + ' → ' + String(x.motivo).slice(0, 160)));
if (!pub && detalhe) v.problemas.slice(0, 10).forEach((p) => console.log('      - ' + p.slice(0, 200)));
