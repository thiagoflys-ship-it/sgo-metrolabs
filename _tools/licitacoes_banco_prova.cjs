// SGO+ Licitações — banco de prova do verificador da análise por IA (02/11/2026).
//
// Roda o verificador (Lic_verificarAnalise_ e Lic_conferirFonte_) do código do SGO+ sobre as respostas CRUAS da IA guardadas
// em LIC_ANALISES.RESPOSTAS_IA_JSON, com as mesmas fontes que a análise teve (campos do PNCP, itens e o texto extraído de cada
// arquivo do edital). Não chama a IA, não acessa a produção: lê um arquivo exportado (sem segredos).
//
// Uso:  node _tools/licitacoes_banco_prova.cjs <export.json> [pasta-do-legado] [--detalhe] [--amostra N] [--json saida.json]
//   export.json: { cab_analises, analises, cab_oport, oportunidades, arquivos, itens } (linhas das abas e do servidor)
//   pasta-do-legado: onde estão os .js do SGO+ (padrão: apps-script-imports/portal_sgo_versao_cnpj_db). Para comparar
//     "antes × depois", rode uma vez com a pasta de uma versão anterior (git show) e outra com a atual.
//
// Respostas cortadas na gravação (LIC_RESPOSTA_MAX) não viram JSON inteiro: delas o banco confere cada par
// "ref + trecho" encontrado no texto (a parte que chegou), um por um, com a mesma Lic_conferirFonte_.
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');

const args = process.argv.slice(2);
const opc = { detalhe: args.includes('--detalhe'), amostra: 0, json: '' };
const pos = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--amostra') opc.amostra = Number(args[++i]) || 0;
  else if (args[i] === '--json') opc.json = args[++i];
  else if (!args[i].startsWith('--')) pos.push(args[i]);
}
if (!pos[0]) { console.error('Uso: node _tools/licitacoes_banco_prova.cjs <export.json> [pasta-do-legado] [--detalhe] [--amostra N] [--json saida.json]'); process.exit(2); }
const pasta = pos[1] || path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const d = JSON.parse(fs.readFileSync(pos[0], 'utf8'));

// ------------------------------------------------------------ código real do SGO+ num contexto isolado
function carregar() {
  const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n');
  const ctx = vm.createContext({
    console, Date, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt, Buffer, Uint8Array,
    Utilities: { getUuid: () => crypto.randomUUID(), computeDigest: (a, t) => Array.from(crypto.createHash('sha256').update(String(t), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)), DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF-8' }, formatDate: (x) => new Date(x).toISOString() },
    Session: { getScriptTimeZone: () => 'America/Sao_Paulo' },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true }) },
    SGO_DATA: { getAll: () => [], getById: () => null, update: () => true, insert: (t, x) => x, insertMany() {} },
    SGO_CFG: { SHEETS: {} },
    ComEsp_fabricantes_: () => FABRICANTES
  });
  for (const f of ['SGO_Expediente.js', 'SGO_Licitacoes_Config.js', 'SGO_Licitacoes.js', 'SGO_Licitacoes_Analise.js']) vm.runInContext(ler(f), ctx, { filename: f });
  return ctx;
}
// as marcas da produção vêm de planilhas (equipamentos e preços); aqui, as que o verificador da produção apontou
const FABRICANTES = [];
const linhas = (cab, rs) => rs.map((r) => { const o = {}; cab.forEach((h, i) => { o[h] = r[i]; }); return o; });
const analises = linhas(d.cab_analises, d.analises);
const oports = Object.fromEntries(linhas(d.cab_oport, d.oportunidades).map((o) => [String(o.ID), o]));
analises.forEach((a) => { (String(a.RECUSAS_JSON || '') + String(a.RESPOSTAS_IA_JSON || '')).replace(/cita fabricante ou marca \(([^)]+)\)/g, (m, x) => { if (!FABRICANTES.includes(x) && !/^metro ?labs$/i.test(x)) FABRICANTES.push(x); return m; }); });
// (a própria Metrolabs saiu da lista na produção em 02/11, antes destas respostas: COM_ESP_PROPRIA_MARCA)
const ctx = carregar();
const arqPorId = {};
Object.values(d.arquivos).forEach((a) => { arqPorId[String(a.ref_id != null ? a.ref_id : a.id)] = a; });
const itensPorChave = {};
(d.itens || []).forEach((i) => { (itensPorChave[i.chave] = itensPorChave[i.chave] || []).push(i.dados); });

/** Fontes como a análise teve: arquivos na ordem de ARQUIVOS_JSON, cortados como o servidor corta (200 mil por arquivo, 450 mil no total). */
function fontesDa(a, l) {
  let arqs = [];
  try { arqs = JSON.parse(a.ARQUIVOS_JSON || '[]'); } catch (e) { arqs = []; }
  let usado = 0;
  const maxArq = typeof ctx.LIC_TEXTO_MAX_ARQUIVO === 'number' ? ctx.LIC_TEXTO_MAX_ARQUIVO : 200000, maxTot = typeof ctx.LIC_TEXTO_MAX_TOTAL === 'number' ? ctx.LIC_TEXTO_MAX_TOTAL : 450000;
  const textos = arqs.map((x) => {
    const f = arqPorId[String(x.id)] || {};
    let t = String(f.texto || '');
    const cabe = Math.max(0, Math.min(maxArq, maxTot - usado));
    const cortado = t.length > cabe;
    if (cortado) t = t.slice(0, cabe);
    usado += t.length;
    return { ref: x.ref, id: x.id, titulo: x.titulo, nome: x.nome, sha256: x.sha256, situacao: x.situacao, texto: t, cortado };
  });
  const fonte = { itens: itensPorChave[l.CHAVE_FONTE] || [] };
  return { fontes: ctx.Lic_fontesAnalise_(l, fonte, textos), textos, fonte };
}
function hojeDe(iso) { return new Date(Date.parse(iso) - 3 * 3600e3).toISOString().slice(0, 10); }
function semCerca(s) { return String(s || '').replace(/^\s*```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim(); }

/** Pares {ref, trecho} de um texto JSON cortado (o que chegou), com o lugar onde aparecem (para dizer item, exigência...). */
function paresDoTexto(s) {
  const out = [], re = /"fonte(Regra)?"\s*:\s*\{\s*"ref"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"trecho"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/g;
  let m;
  while ((m = re.exec(s))) {
    let ref, tr;
    try { ref = JSON.parse('"' + m[2] + '"'); tr = JSON.parse('"' + m[3] + '"'); } catch (e) { continue; }
    const antes = s.slice(0, m.index);
    const secao = ['"afirmacoes"', '"travas"', '"riscos"', '"exigencias"', '"itens"'].map((k) => [k, antes.lastIndexOf(k)]).sort((x, y) => y[1] - x[1])[0];
    const grau = (/"grau"\s*:\s*"([A-Z_]+)"[^{}]*$/.exec(antes.slice(-1500)) || [])[1] || '';
    const tipo = (/"tipo"\s*:\s*"([A-ZÊÉ_]+)"[^{}]*$/.exec(antes.slice(-1500)) || [])[1] || '';
    out.push({ regra: !!m[1], ref, trecho: tr, secao: secao[1] >= 0 ? secao[0].replace(/"/g, '') : '', grau, tipo });
  }
  return out;
}

/** Causa de uma recusa (texto do problema do verificador). */
function causa(p) {
  if (/não está em (A\d+|CAMPO|ITEM|REGRA)/.test(p)) return 'TRECHO_NAO_ESTA_NA_FONTE';
  if (/fonte "[^"]*" não existe/.test(p)) return 'REF_INEXISTENTE';
  if (/trecho longo demais/.test(p)) return 'TRECHO_LONGO';
  if (/trecho curto demais/.test(p)) return 'TRECHO_CURTO';
  if (/é regra da empresa, não fato/.test(p)) return 'REGRA_COMO_FATO';
  if (/não prova o serviço pedido/.test(p)) return 'REF_NAO_PROVA_SERVICO';
  if (/o número .* não está nas fontes/.test(p)) return 'NUMERO_SEM_FONTE';
  if (/a citação .* não está em nenhuma fonte/.test(p)) return 'CITACAO_SEM_FONTE';
  if (/grau (ALTA|MEDIA) com/.test(p)) return 'GRAU_SEM_TERMO_DO_CATALOGO';
  if (/sem fonte/.test(p)) return 'FATO_SEM_FONTE';
  if (/cita fabricante/.test(p)) return 'FABRICANTE';
  if (/a IA não decide/.test(p)) return 'FRASE_DE_DECISAO';
  if (/acreditação RBC/.test(p)) return 'PROMESSA_RBC';
  if (/resumo: escreva de 2 a 4 frases/.test(p)) return 'RESUMO_FRASES';
  if (/código fora da lista/.test(p)) return 'CODIGO_FORA_DA_LISTA';
  if (/grau fora da lista/.test(p)) return 'GRAU_FORA_DA_LISTA';
  if (/fora do peso|vale no máximo|pontos ausentes/.test(p)) return 'PONTOS';
  if (/vazio/.test(p)) return 'CAMPO_VAZIO';
  if (/não é o JSON/.test(p)) return 'NAO_E_JSON';
  if (/markdown|emoji/.test(p)) return 'FORMATACAO';
  if (/triagem por regras travou/.test(p)) return 'TRAVA_DA_TRIAGEM';
  if (/fonteRegra/.test(p)) return 'FONTE_REGRA';
  return 'OUTRA';
}

// ------------------------------------------------------------ diagnóstico de um trecho recusado (a IA estava certa?)
const sa = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** Normalização "de PDF" independente do verificador: junta hífen de fim de linha e compara só letras e números. */
function forte(t) { return sa(t).replace(/([a-z])-\s*\n\s*([a-z])/g, '$1$2').replace(/[^a-z0-9]+/g, ''); }
function diagnostico(tr, ref, fontes) {
  const f = fontes[ref];
  const nt = forte(tr);
  if (!f) return 'ref inexistente';
  const ff = forte(f.texto);
  if (nt && ff.indexOf(nt) >= 0) return 'existe (sem espaços/pontuação): quebra do PDF';
  const pedacos = String(tr).split(/\s*(?:\.{3}|…|\[\.\.\.\]|\(\.\.\.\))\s*/).filter((x) => x.trim());
  if (pedacos.length > 1 && pedacos.every((p) => ff.indexOf(forte(p)) >= 0)) return 'existe com reticências entre pedaços';
  const outra = Object.keys(fontes).find((k) => k !== ref && forte(fontes[k].texto).indexOf(nt) >= 0);
  if (outra) return 'existe em outra fonte (' + outra + ')';
  // prefixo ou sufixo acrescentado pela IA ("ITEM 02 ...")
  const pal = sa(tr).replace(/[^a-z0-9]+/g, ' ').trim().split(' ');
  for (let corte = 1; corte <= 3 && pal.length - corte >= 3; corte++) {
    if (ff.indexOf(pal.slice(corte).join('')) >= 0) return 'existe sem as ' + corte + ' primeira(s) palavra(s) (rótulo acrescentado)';
    if (ff.indexOf(pal.slice(0, pal.length - corte).join('')) >= 0) return 'existe sem as ' + corte + ' última(s) palavra(s)';
  }
  // trechos de 6 palavras que existem: emenda de frases ou paráfrase
  let ach = 0, tot = 0;
  for (let i = 0; i + 6 <= pal.length; i += 3) { tot++; if (ff.indexOf(pal.slice(i, i + 6).join('')) >= 0) ach++; }
  if (tot && ach / tot >= 0.6) return 'emenda de pedaços que existem (' + ach + '/' + tot + ' janelas de 6 palavras)';
  if (tot && ach > 0) return 'paráfrase parcial (' + ach + '/' + tot + ' janelas de 6 palavras)';
  return 'não existe (inventado ou parafraseado)';
}

// ------------------------------------------------------------ banco
const resultado = { analises: 0, tentativas: 0, inteiras: 0, inteirasAceitas: 0, cortadas: 0, pares: 0, paresAceitos: 0, causasNovas: {}, causasProducao: {}, diagnosticos: {}, porAnalise: [], aceitosAmostra: [], recusadosAmostra: [], foraDoPedido: [], pedido: { analises: 0, caracteres: 0, max: 0, arquivos: 0 }, cobertura: { provas: 0, noPedido: 0 } };
const conta = (o, k, n) => { o[k] = (o[k] || 0) + (n || 1); };
for (const a of analises) {
  let rs;
  try { rs = JSON.parse(a.RESPOSTAS_IA_JSON || '[]'); } catch (e) { rs = []; }
  if (!Array.isArray(rs) || !rs.length) continue;
  const l = oports[String(a.OPORTUNIDADE_ID)];
  if (!l) continue;
  resultado.analises++;
  const { fontes, textos } = fontesDa(a, l);
  const pesos = Object.assign({}, ctx.LIC_NOTA_PADRAO);
  const codigo = ctx.Lic_criteriosCodigo_(l, pesos, hojeDe(a.CRIADO_EM));
  const cv = ctx.Lic_ctxVerificador_(l, fontes, pesos, codigo);
  // tamanho do pedido à IA (com a seleção de páginas, quando o código tiver)
  if (typeof ctx.Lic_selecionarTextos_ === 'function') ctx.Lic_selecionarTextos_(fontes, ctx.LIC_PROMPT_ORCAMENTO);
  const prompt = ctx.Lic_promptAnalise_(l, fontes, codigo, pesos, hojeDe(a.CRIADO_EM), 'FONTE-banco');
  resultado.pedido.analises++; resultado.pedido.caracteres += prompt.length; resultado.pedido.max = Math.max(resultado.pedido.max, prompt.length);
  resultado.pedido.arquivos += textos.reduce((s2, t2) => s2 + t2.texto.length, 0);
  const linha = { id: a.ID, codigo: a.CODIGO || l.CODIGO, em: a.CRIADO_EM, situacao: a.SITUACAO, arquivos: textos.length, caracteres: textos.reduce((s, t) => s + t.texto.length, 0), tentativas: [] };
  rs.forEach((t) => {
    resultado.tentativas++;
    (t.problemas || []).forEach((p) => conta(resultado.causasProducao, causa(p)));
    const s = semCerca(t.texto);
    let j = null;
    try { j = JSON.parse(s); } catch (e) { j = null; }
    const tl = { tentativa: t.tentativa, cortada: !!t.cortada || !j };
    if (j) {
      resultado.inteiras++;
      const v = ctx.Lic_verificarAnalise_(j, cv);
      tl.aceita = v.ok; tl.problemas = v.problemas;
      // 03/11/2026: resposta aceita em parte (o que caiu vira pendência); o verificador antigo não devolve caidos
      tl.caidos = (v.caidos || []).length; tl.parcial = !!v.parcial;
      if (v.ok) {
        resultado.inteirasAceitas++;
        const nf = ctx.Lic_notaFinal_(v.saida, codigo, pesos);
        tl.nota = nf.nota; tl.classe = nf.classe; tl.travas = nf.travas.map((x) => x.codigo + (x.origem === 'SISTEMA' ? '(código)' : ''));
        tl.capacidade = v.saida.capacidade.pontos; tl.itens = v.saida.capacidade.itens.map((x) => x.grau + (x.origem === 'SISTEMA' ? '(código)' : ''));
        tl.itensDet = v.saida.capacidade.itens.map((x) => ({ grau: x.grau, servico: x.servico, ref: x.fonte && x.fonte.ref, trecho: x.fonte && x.fonte.trecho.slice(0, 200) }));
        tl.caidosDet = (v.caidos || []).map((c) => c.criterio + ': ' + c.oque);
        // para a conferência à mão: cada prova gravada, com o ajuste e o texto da fonte em volta
        tl.provas = [].concat(v.saida.capacidade.itens.map((x) => x.fonte), v.saida.documentacao.exigencias.map((x) => x.fonte), v.saida.riscos.map((x) => x.fonte), v.saida.travas.map((x) => x.fonte), v.saida.afirmacoes.map((x) => x.fonte))
          .filter(Boolean).map((fo) => ({ ref: fo.ref, ajuste: fo.ajuste || '', trecho: fo.trecho }));
        if (opc.detalhe) {
          console.log('\n[ACEITA] ' + a.ID + ' t' + t.tentativa + ' · nota ' + nf.nota + ' (' + nf.classe + ')' + (tl.travas.length ? ' travas: ' + tl.travas.join(', ') : '') + '\n  resumo: ' + v.saida.resumo);
          tl.provas.forEach((x) => console.log('  - [' + x.ref + (x.ajuste ? ' · ' + x.ajuste : '') + '] ' + x.trecho.slice(0, 160).replace(/\s+/g, ' ')));
        }
      }
      v.problemas.forEach((p) => conta(resultado.causasNovas, causa(p)));
    } else resultado.cortadas++;
    // pares ref+trecho (inteiras e cortadas), um por um
    const pares = paresDoTexto(s);
    tl.pares = pares.length; tl.paresAceitos = 0;
    pares.forEach((par) => {
      resultado.pares++;
      const probs = [];
      const tipo = par.regra ? 'TRAVA' : par.secao === 'afirmacoes' ? (ctx.Lic_up_(par.tipo).replace(/Ê/g, 'E') || 'FATO') : 'FATO';
      const fo = ctx.Lic_conferirFonte_('par', { ref: par.ref, trecho: par.trecho }, cv, probs, { tipo, capacidade: par.secao === 'itens' });
      if (fo) {
        resultado.paresAceitos++; tl.paresAceitos++;
        // rede de segurança: prova de trava (ou de exigência impeditiva) com negação no parágrafo vira pendência
        if (typeof ctx.Lic_negacaoPerto_ === 'function' && (par.secao === 'travas' && !par.regra || (/exigencias|afirmacoes/.test(par.secao) && ctx.Lic_impeditivo_(par.trecho)))) {
          const chave = par.secao === 'travas' ? 'travas' : 'impeditivos';
          resultado.rede = resultado.rede || { travas: 0, travasPendencia: 0, impeditivos: 0, impeditivosPendencia: 0, exemplos: [] };
          resultado.rede[chave]++;
          const ng = ctx.Lic_negacaoPerto_(fo);
          if (ng) { resultado.rede[chave + 'Pendencia']++; if (resultado.rede.exemplos.length < 12) resultado.rede.exemplos.push(chave + ' [' + ng + '] ' + par.trecho.slice(0, 110)); }
        }
        if (resultado.aceitosAmostra.length < 4000) resultado.aceitosAmostra.push({ analise: a.ID, tentativa: t.tentativa, ref: fo.ref, trecho: par.trecho, ajuste: fo.ajuste || '' });
        // a prova está no texto que foi no pedido? (mede se a seleção de páginas tira o que a IA usou)
        if (/^A\d+$/.test(fo.ref) && typeof ctx.Lic_trechoNaFonte_ === 'function') {
          resultado.cobertura.provas++;
          // vale em qualquer arquivo enviado: página repetida sai de um e fica no outro (a IA cita o outro)
          const enviados = Object.keys(fontes).filter((k) => /^A\d+$/.test(k)).map((k) => fontes[k].textoPrompt);
          if (enviados.some((tp) => typeof tp !== 'string') || enviados.some((tp) => ctx.Lic_trechoNaFonte_(par.trecho, { texto: tp }).ok)) resultado.cobertura.noPedido++;
          else if (resultado.foraDoPedido.length < 300) resultado.foraDoPedido.push({ analise: a.ID, ref: fo.ref, secao: par.secao, trecho: par.trecho.slice(0, 200) });
        }
      } else {
        probs.forEach((p) => {
          const c = causa(p);
          conta(resultado.causasNovas, 'par:' + c);
          if (c === 'TRECHO_NAO_ESTA_NA_FONTE') { const dg = diagnostico(par.trecho, par.ref, fontes).replace(/\(\d+\/\d+ janelas de 6 palavras\)/, '').replace(/\(A\d+\)/, '(outra)').trim(); conta(resultado.diagnosticos, dg); resultado.recusadosAmostra.push({ analise: a.ID, ref: par.ref, trecho: par.trecho.slice(0, 1200), diag: dg, problema: p }); }
        });
      }
    });
    linha.tentativas.push(tl);
  });
  resultado.porAnalise.push(linha);
}

// ------------------------------------------------------------ relatório
const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + '%' : '-');
console.log('Banco de prova — verificador de ' + path.relative(process.cwd(), pasta));
console.log('Análises com resposta guardada: ' + resultado.analises + ' · tentativas: ' + resultado.tentativas + ' (inteiras: ' + resultado.inteiras + ', cortadas na gravação: ' + resultado.cortadas + ')');
console.log('Respostas inteiras aceitas: ' + resultado.inteirasAceitas + ' de ' + resultado.inteiras);
// por análise: passa se alguma tentativa inteira passa (a melhor: a aceita com menos elementos caídos)
{
  const porA = resultado.porAnalise.map((x) => ({ x, ac: x.tentativas.filter((t) => t.aceita).sort((p, q) => (p.caidos || 0) - (q.caidos || 0))[0], medida: x.tentativas.some((t) => !t.cortada) }));
  const med = porA.filter((p) => p.medida), ok = med.filter((p) => p.ac);
  const cl = {}; ok.forEach((p) => conta(cl, p.ac.classe + (p.ac.travas.length ? ' [' + p.ac.travas.join(',') + ']' : '')));
  console.log('Análises que passariam: ' + ok.length + ' de ' + med.length + ' com resposta inteira guardada (' + (porA.length - med.length) + ' só com respostas cortadas na gravação, sem como medir)' + (ok.length ? '; em parte: ' + ok.filter((p) => p.ac.parcial).length + ', elementos caídos na melhor: média ' + (ok.reduce((s, p) => s + (p.ac.caidos || 0), 0) / ok.length).toFixed(1).replace('.', ',') : ''));
  if (opc.detalhe) { console.log('Classe das que passariam:'); Object.entries(cl).sort((p, q) => q[1] - p[1]).forEach(([k, v]) => console.log('  ' + String(v).padStart(4) + '  ' + k)); }
  resultado.passariam = ok.map((p) => ({ id: p.x.id, nota: p.ac.nota, classe: p.ac.classe, travas: p.ac.travas, itens: p.ac.itens, capacidade: p.ac.capacidade, caidos: p.ac.caidos || 0, tentativa: p.ac.tentativa }));
}
console.log('Pares ref+trecho conferidos um a um: ' + resultado.pares + ' · aceitos: ' + resultado.paresAceitos + ' (' + pct(resultado.paresAceitos, resultado.pares) + ')');
const tab = (o) => Object.entries(o).sort((x, y) => y[1] - x[1]).forEach(([k, v]) => console.log('  ' + String(v).padStart(5) + '  ' + k));
const P = resultado.pedido, med = (x) => Math.round(x / Math.max(1, P.analises));
console.log('Pedido à IA: média ' + med(P.caracteres) + ' caracteres (~' + med(P.caracteres / 4) + ' tokens, a 4 caracteres por token), maior ' + P.max + '; texto dos arquivos lido: média ' + med(P.arquivos));
if (resultado.cobertura.provas) console.log('Provas de arquivo aceitas que estão no texto enviado à IA: ' + resultado.cobertura.noPedido + ' de ' + resultado.cobertura.provas + ' (' + pct(resultado.cobertura.noPedido, resultado.cobertura.provas) + ')');
if (resultado.rede) console.log('Rede de segurança: provas de trava aceitas ' + resultado.rede.travas + ' (todas ficam a confirmar), com alerta de exceção ' + resultado.rede.travasPendencia + '; provas impeditivas (RBC, acreditação, registro, atestado) ' + resultado.rede.impeditivos + ', viram pendência ' + resultado.rede.impeditivosPendencia);
if (resultado.rede && opc.detalhe) resultado.rede.exemplos.forEach((x) => console.log('  ' + x));
console.log('\nCausas (verificador desta pasta: respostas inteiras + pares):'); tab(resultado.causasNovas);
console.log('\nTrechos "não está na fonte" — diagnóstico (a IA estava certa?):'); tab(resultado.diagnosticos);
if (opc.detalhe) {
  console.log('\nPor análise:');
  resultado.porAnalise.forEach((x) => console.log('  ' + x.em + ' ' + x.situacao.padEnd(9) + ' arquivos ' + x.arquivos + ' (' + x.caracteres + ' car.) · ' + x.tentativas.map((t) => 't' + t.tentativa + (t.cortada ? '[cortada]' : t.aceita ? '[ACEITA]' : '[recusada ' + t.problemas.length + ']') + ' pares ' + t.paresAceitos + '/' + t.pares).join(' · ')));
  resultado.porAnalise.forEach((x) => x.tentativas.filter((t) => t.problemas && t.problemas.length).forEach((t) => { console.log('\n  ' + x.id + ' t' + t.tentativa + ':'); t.problemas.slice(0, 12).forEach((p) => console.log('    - ' + p.slice(0, 220))); }));
}
if (opc.amostra) {
  console.log('\nAmostra de trechos ACEITOS (conferir à mão):');
  const am = resultado.aceitosAmostra.filter((x) => /^A\d+$/.test(x.ref));
  for (let i = 0; i < opc.amostra && am.length; i++) { const x = am[Math.floor((i * 7919) % am.length)]; console.log('  [' + x.ref + '] ' + x.trecho.slice(0, 200).replace(/\s+/g, ' ')); }
}
if (opc.json) fs.writeFileSync(opc.json, JSON.stringify(resultado, null, 1));
