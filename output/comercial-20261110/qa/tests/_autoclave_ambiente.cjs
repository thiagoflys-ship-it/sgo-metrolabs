// Ambiente de teste do módulo Autoclave (SGO_AutoRel_*): carrega os arquivos do legado num contexto
// isolado com simulacros do Apps Script (Utilities, Session, Drive, propriedades, HtmlService com
// os marcadores <? ?>, <?= ?> e <?!= ?>). Só dados de teste: nada de cliente real.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { criarSession, criarUtilities } = require('./_simulacros_gas.cjs');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ARQUIVOS = [
  'SGO_Documento_LogoCompartilhado.js', 'SGO_DocA4.js', 'SGO_DocSalvar.js', 'SGO_RelTecIA.js',
  'SGO_QualifTermica_Calculos.js', 'SGO_QualifIA_Verificador.js', 'SGO_QualifEmissao.js',
  'SGO_AutoRel_Config.js', 'SGO_AutoRel_Parser.js', 'SGO_AutoRel_AnaliseCiclo.js', 'SGO_AutoRel_Main.js',
  'SGO_AutoRel_Simulador.js', 'SGO_AutoRel_LeakTest.js', 'SGO_AutoRel_MemoriaF0.js',
  'SGO_AutoRel_CertificadoIA.js', 'SGO_AutoRel_CertificadoRelatorio.js', 'SGO_AutoRel_PlanilhaDados.js'
];

function ler(nome) { return fs.readFileSync(path.join(BASE, nome), 'utf8').replace(/\r\n/g, '\n'); }

/** Compila um modelo HtmlService (<? código ?>, <?= escapado ?>, <?!= cru ?>) para uma função. */
function compilarModelo(fonte, ctx) {
  let corpo = 'var __o = [];\n';
  const re = /<\?(!=|=)?([\s\S]*?)\?>/g;
  let ultimo = 0, m;
  const esc = 'function __e(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/\'/g,"&#39;");}\n';
  while ((m = re.exec(fonte))) {
    corpo += '__o.push(' + JSON.stringify(fonte.slice(ultimo, m.index)) + ');\n';
    if (m[1] === '!=') corpo += '__o.push(String((' + m[2] + ')==null?"":(' + m[2] + ')));\n';
    else if (m[1] === '=') corpo += '__o.push(__e(' + m[2] + '));\n';
    else corpo += m[2] + '\n';
    ultimo = re.lastIndex;
  }
  corpo += '__o.push(' + JSON.stringify(fonte.slice(ultimo)) + ');\nreturn __o.join("");';
  return function (vars) {
    const nomes = Object.keys(vars);
    const fn = vm.runInContext('(function(' + nomes.join(',') + '){' + esc + corpo + '})', ctx);
    return fn.apply(null, nomes.map(k => vars[k]));
  };
}

function criarAmbiente(opcoes) {
  opcoes = opcoes || {};
  const props = Object.assign({}, opcoes.props || {});
  const arquivos = {};
  const pastas = { raiz: { id: 'raiz', nome: 'raiz', arquivos: [] } };
  let seq = 0;
  const planilhas = {};
  function objArquivo(a) {
    return {
      getId: () => a.id, getName: () => a.nome, getUrl: () => '/arquivos/' + a.id, getMimeType: () => a.mime,
      getBlob: () => objBlob(a.bytes, a.mime, a.nome), setDescription() { return this; }, setSharing() { return this; }
    };
  }
  function objBlob(bytes, mime, nome) {
    let n = nome;
    return {
      getBytes: () => Array.from(bytes), getDataAsString: () => Buffer.from(bytes).toString('utf8'),
      getContentType: () => mime, getName: () => n, setName(x) { n = x; return this; }, _bytes: bytes
    };
  }
  function objPasta(p) {
    return {
      getId: () => p.id, getName: () => p.nome, getUrl: () => '/pastas/' + p.id,
      createFile(blobOuNome, conteudo, mime) {
        const id = 'arq' + (++seq);
        const b = typeof blobOuNome === 'string' ? objBlob(Buffer.from(String(conteudo || ''), 'utf8'), mime || 'text/html', blobOuNome) : blobOuNome;
        arquivos[id] = { id, nome: b.getName(), mime: b.getContentType(), bytes: Buffer.from(b._bytes || b.getBytes()), pasta: p.id };
        p.arquivos.push(id);
        return objArquivo(arquivos[id]);
      },
      createFolder(nome) { const id = 'pasta' + (++seq); pastas[id] = { id, nome, arquivos: [], pai: p.id }; return objPasta(pastas[id]); },
      getFoldersByName(nome) {
        const l = Object.values(pastas).filter(x => x.pai === p.id && x.nome === nome); let i = 0;
        return { hasNext: () => i < l.length, next: () => objPasta(l[i++]) };
      },
      getFilesByName(nome) {
        const l = p.arquivos.map(id => arquivos[id]).filter(a => a && a.nome === nome); let i = 0;
        return { hasNext: () => i < l.length, next: () => objArquivo(l[i++]) };
      },
      setDescription() { return this; }
    };
  }
  const Utilities = criarUtilities({
    computeDigest: (alg, texto) => Array.from(crypto.createHash('sha256').update(String(texto), 'utf8').digest()).map(b => (b > 127 ? b - 256 : b)),
    DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF-8' },
    base64Decode: s => Array.from(Buffer.from(String(s), 'base64')),
    newBlob: (bytes, mime, nome) => objBlob(Buffer.from(typeof bytes === 'string' ? Buffer.from(bytes, 'utf8') : Array.from(bytes, b => b & 255)), mime, nome)
  });
  const ctx = {
    console, Math, JSON, Date,
    Session: criarSession('America/Sao_Paulo'),
    Utilities,
    Logger: { log() {} },
    MimeType: { PLAIN_TEXT: 'text/plain', GOOGLE_SHEETS: 'application/vnd.google-apps.spreadsheet', MICROSOFT_EXCEL: 'application/vnd.ms-excel', CSV: 'text/csv', PDF: 'application/pdf', HTML: 'text/html' },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; } }) },
    DriveApp: {
      getFolderById: id => { if (!pastas[id]) throw new Error('Não foi possível encontrar a pasta com o ID ' + id); return objPasta(pastas[id]); },
      getFileById: id => { if (!arquivos[id]) throw new Error('Arquivo não encontrado: ' + id); return objArquivo(arquivos[id]); },
      getRootFolder: () => objPasta(pastas.raiz)
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }) },
    UrlFetchApp: { fetch: opcoes.fetch || (() => { throw new Error('rede desligada no teste'); }) },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://sgo.ensaio/' }), getOAuthToken: () => 'x' }
  };
  vm.createContext(ctx);
  ctx.HtmlService = {
    createTemplateFromFile(nome) {
      const fonte = ler(nome + '.html');
      const t = { evaluate() { const html = compilarModelo(fonte, ctx)(Object.fromEntries(Object.entries(t).filter(([k, v]) => typeof v !== 'function'))); return { getContent: () => html }; } };
      return t;
    }
  };
  // Pasta de laudos e pasta de envios já criadas (o ambiente não tem o Google Drive antigo).
  for (const nome of ARQUIVOS) {
    if (!fs.existsSync(path.join(BASE, nome))) continue;
    vm.runInContext(ler(nome), ctx, { filename: nome });
  }
  if (opcoes.extra) vm.runInContext(opcoes.extra, ctx);
  return {
    ctx, props, arquivos, pastas,
    run: codigo => vm.runInContext(codigo, ctx),
    fn: nome => vm.runInContext(nome, ctx),
    criarArquivo(nome, mime, conteudo) {
      const id = 'dl' + (++seq) + 'abcdefghijklmnopqrstuvwxyz';
      arquivos[id] = { id, nome, mime, bytes: Buffer.from(conteudo, 'utf8'), pasta: 'raiz' };
      return id;
    }
  };
}

/* ------------------------------------------------------------------
 * Gerador de ciclo sintético a vapor (dados de teste, formato do registrador)
 * ------------------------------------------------------------------ */
function pSatBar(tC) {
  const n = [0.11670521452767e4, -0.72421316598847e6, -0.17073846940092e2, 0.12020824702470e5, -0.32325550322333e7,
    0.14915108613530e2, -0.48232657361591e4, 0.40511340542057e6, -0.23855557567849, 0.65017534844798e3];
  const T = tC + 273.15, th = T + n[8] / (T - n[9]);
  const A = th * th + n[0] * th + n[1], B = n[2] * th * th + n[3] * th + n[4], C = n[5] * th * th + n[6] * th + n[7];
  return Math.pow(2 * C / (-B + Math.sqrt(B * B - 4 * A * C)), 4) * 10;
}

/**
 * Ciclo de pré-vácuo pulsado: 3 pulsos, rampa, patamar e secagem.
 * o: { inicio: Date, dtSeg, nSensores, tPatamar, patamarMin, desvios:[°C por sensor], aquecimentoAtraso:[s por sensor] }
 * Devolve linhas { data:'dd/mm/aaaa', hora:'HH:MM:SS:mmm', t:[...], p }.
 */
function cicloSintetico(o) {
  o = Object.assign({ inicio: new Date(2026, 9, 10, 8, 0, 0), dtSeg: 10, nSensores: 6, tPatamar: 134.6, patamarMin: 4, desvios: [], aquecimentoAtraso: [] }, o || {});
  const linhas = [];
  const fases = [];
  // 0–6 min: 3 pulsos de vácuo (pressão 1,0 → 0,1 → 1,5 bar), temperatura sobe devagar
  const tPulsos = 6 * 60, tRampa = tPulsos + 5 * 60, tPatamar = tRampa + o.patamarMin * 60, tFim = tPatamar + 8 * 60;
  for (let s = 0; s <= tFim; s += o.dtSeg) {
    let p, tb;
    if (s < tPulsos) {
      const fase = (s % 120) / 120;
      p = fase < 0.5 ? 1.0 - 1.8 * fase : 0.1 + 2.8 * (fase - 0.5);
      tb = 30 + (70 * s) / tPulsos;
    } else if (s < tRampa) {
      const f = (s - tPulsos) / (tRampa - tPulsos);
      tb = 100 + (o.tPatamar - 100) * f;
      p = pSatBar(tb);
    } else if (s <= tPatamar) {
      tb = o.tPatamar + 0.15 * Math.sin(s / 37);
      p = pSatBar(tb);
    } else {
      const f = Math.min(1, (s - tPatamar) / 120);
      tb = o.tPatamar - (o.tPatamar - 105) * f;
      p = f < 1 ? pSatBar(tb) * (1 - f) + 0.1 * f : 0.1;
    }
    const t = [];
    for (let k = 0; k < o.nSensores; k++) {
      const atraso = o.aquecimentoAtraso[k] || 0;
      let v = tb;
      if (s >= tPulsos && s < tRampa + atraso) {
        const f = Math.min(1, (s - tPulsos) / (tRampa + atraso - tPulsos));
        v = 100 + (o.tPatamar - 100) * f;
      }
      v += (o.desvios[k] || 0) - 0.02 * k;
      t.push(Math.round(v * 100) / 100);
    }
    const d = new Date(o.inicio.getTime() + s * 1000);
    const dd = x => String(x).padStart(2, '0');
    linhas.push({ data: dd(d.getDate()) + '/' + dd(d.getMonth() + 1) + '/' + d.getFullYear(), hora: dd(d.getHours()) + ':' + dd(d.getMinutes()) + ':' + dd(d.getSeconds()) + ':000', t, p: Math.round(p * 1000) / 1000 });
  }
  return linhas;
}

/** CSV completo no formato do registrador (Data;Horário;ST-01..;Pressão), vírgula decimal. */
function csvCompleto(linhas) {
  const n = linhas[0].t.length;
  const cab = ['Data', 'Horário'].concat(Array.from({ length: n }, (_, i) => 'ST-' + String(i + 1).padStart(2, '0'))).concat(['Pressão (bar abs)']);
  return [cab.join(';')].concat(linhas.map(l => [l.data, l.hora].concat(l.t.map(v => String(v.toFixed(2)).replace('.', ','))).concat([String(l.p.toFixed(3)).replace('.', ',')]).join(';'))).join('\n');
}

/** CSV de um registrador individual: Nº;Data;Hora;Temperatura (°C). deslocSeg: relógio do registrador adiantado. */
function csvIndividual(linhas, k, deslocSeg) {
  deslocSeg = deslocSeg || 0;
  return ['Nº;Data;Hora;Temperatura (°C)'].concat(linhas.map((l, i) => {
    let hora = l.hora.slice(0, 8);
    if (deslocSeg) {
      const [h, m, s] = hora.split(':').map(Number);
      const tot = h * 3600 + m * 60 + s + deslocSeg;
      hora = [Math.floor(tot / 3600), Math.floor(tot / 60) % 60, tot % 60].map(x => String(x).padStart(2, '0')).join(':');
    }
    return [i + 1, l.data, hora, String(l.t[k].toFixed(2)).replace('.', ',')].join(';');
  })).join('\n');
}

/** Registrador de dados de pressão (arquivo próprio): Data;Hora;Pressão (bar). */
function csvPressao(linhas) {
  return ['Data;Hora;Pressão (bar abs)'].concat(linhas.map(l => [l.data, l.hora.slice(0, 8), String(l.p.toFixed(3)).replace('.', ',')].join(';'))).join('\n');
}

module.exports = { criarAmbiente, cicloSintetico, csvCompleto, csvIndividual, csvPressao, pSatBar, BASE };
