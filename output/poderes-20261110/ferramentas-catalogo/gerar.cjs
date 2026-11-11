// Uso (a partir desta pasta): node scan1.cjs ../base/legado gatelist2.txt rows.json && node gerar.cjs .. && node teste-equivalencia.cjs ../base/legado ../catalogo.json && node md.cjs ..
'use strict';
const fs = require('fs'), path = require('path');
const S = __dirname;
const OUT = process.argv[2];
const { USUARIOS, CFG, H_SRC, P } = require('./catalogo-fonte.cjs');
const extra = require('./catalogo-extra.cjs');
const rows = JSON.parse(fs.readFileSync(path.join(S, 'rows.json'), 'utf8'));

// ---------- avaliação das regras padrão
const H = new Function('CFG', H_SRC + '\nreturn H;')(CFG);
const avaliar = (expr, eu) => { try { return !!(new Function('eu', 'H', 'CFG', 'return (' + expr + ');'))(eu, H, CFG); } catch (e) { throw new Error('padrao inválido: ' + expr + ' :: ' + e.message); } };
const poderes = P.concat(extra.P_EXTRA);
// correções de padrão definidas no extra
poderes.forEach(p => { if (p.lote === 10) p.lote = 11; else if (p.lote === 9 && /^(ATIVIDADES|AVISOS|INICIO|CHAT|EMAIL|WHATSAPP|ASSISTENTE)_/.test(p.codigo)) p.lote = 10; });
Object.keys(extra.PADRAO_FIX).forEach(c => { const p = poderes.find(x => x.codigo === c); p.padrao = extra.PADRAO_FIX[c]; });

// ---------- regras de mapeamento (tiers: 0 override, 1 linha, 2 função, 3 genérica)
const regras = [];
extra.OVERRIDES.forEach(o => regras.push({ tier: 0, poder: o.poder, arq: o.arq, fn: o.fn || null, gate: o.gate || null, ex: o.ex || {}, ord: -1, motivo: o.motivo }));
poderes.forEach((p, ord) => (p.m || []).forEach(([arq, fn, gate, ex]) => {
  ex = ex || {};
  regras.push({ tier: ex.linha ? 1 : fn ? 2 : 3, poder: p.codigo, arq, fn, gate, ex, ord });
}));
regras.sort((a, b) => a.tier - b.tier || a.ord - b.ord);
const casa = (r, x) => {
  if (!r.arq.test(x.arquivo)) return false;
  if (r.tier === 0 && !r.ex.linha && !r.gate && !r.fn) return false;
  if (r.fn && !r.fn.test(x.funcao)) return false;
  if (r.gate && !r.gate.test(x.gate)) return false;
  if (r.ex.nivel && !r.ex.nivel.test(x.nivel)) return false;
  if (r.ex.caso && !r.ex.caso.test(x.caso)) return false;
  if (r.ex.trecho && !r.ex.trecho.test(x.trecho)) return false;
  if (r.ex.linha && r.ex.linha.indexOf(x.linha) < 0) return false;
  return true;
};
// definições de regra (a linha está dentro da própria função-porteiro ou do montador de nível)
const DEF = extra.DEFINICOES; // { nomeFuncao: 'PODER+PODER' | 'texto' }
const ROT = extra.ROTEAMENTO; // { nomeFuncao: 'descrição' }
const NAO = extra.NAO_TRAVA;  // [{arq, fn, linha?, motivo}]

const saida = [];
const semPoder = [];
rows.forEach(x => {
  let poder = '', tipo = 'trava', obs = '';
  const r = regras.find(r => casa(r, x));
  const fora = extra.FORA_ROWS.find(f => f.arq.test(x.arquivo) && (!f.fn || f.fn.test(x.funcao)) && (!f.gate || f.gate.test(x.gate)) && (!f.nivel || f.nivel.test(x.nivel)));
  const nao = NAO.find(n => n.arq.test(x.arquivo) && (!n.fn || n.fn.test(x.funcao)) && (!n.linha || n.linha.indexOf(x.linha) >= 0));
  if (r && r.tier <= 1) { poder = r.poder; if (r.motivo) obs = r.motivo; if (DEF[x.funcao]) tipo = 'definicao'; }
  else if (fora) { tipo = 'fora_caixas'; poder = fora.rotulo; }
  else if (nao) { tipo = 'nao_trava'; poder = '—'; obs = nao.motivo; }
  else if (DEF[x.funcao] && !(r && r.tier === 2)) { tipo = 'definicao'; poder = DEF[x.funcao]; }
  else if (ROT[x.funcao] && (x.gate.startsWith('inline') || !r)) { tipo = 'roteamento'; poder = 'ROTEAMENTO'; obs = ROT[x.funcao]; }
  else if (r) { poder = r.poder; }
  else { semPoder.push(x); poder = '?'; }
  saida.push(Object.assign({}, x, { poder, tipo, obs }));
});

// ---------- regra atual de cada porteiro (texto)
const RG = extra.REGRA_GATE;
const regraAtual = x => {
  const g = x.gate.startsWith('inline') ? '' : (RG[x.gate + ':' + x.nivel] || RG[x.gate] || '');
  const t = x.trecho.replace(/\s+/g, ' ');
  if (!g) return t;
  // a linha tem condição além do porteiro? mostra o trecho também
  return /^\s*(if|var|const|let|return)\b|&&|\|\|/.test(x.trecho) && !new RegExp('^\\s*(var\\s+\\w+\\s*=\\s*)?' + x.gate + '\\(').test(x.trecho) ? g + ' | linha: ' + t : g;
};

// ---------- catálogo final
const logins = USUARIOS.map(u => u.login);
const hojeDe = p => {
  const o = {};
  USUARIOS.forEach(u => { o[u.login] = u.perfil === 'REPRESENTADA' ? false : avaliar(p.padrao, u); });
  return o;
};
const catalogo = {
  geradoEm: new Date().toISOString(),
  fonte: 'output/poderes-20261110/base (imagem metrolabs/sgo:comercial-assinatura-20261110; legado commit 26914c8). Só leitura.',
  usuarios: USUARIOS.map(u => ({ login: u.login, perfil: u.perfil, area: u.area, vinculo: u.vinculo })),
  configUsada: CFG,
  premissas: extra.PREMISSAS,
  regrasBase: H_SRC.trim(),
  poderes: poderes.map(p => {
    const tr = saida.filter(x => x.poder.split('+').indexOf(p.codigo) >= 0 && x.tipo === 'trava').map(x => ({ arquivo: 'base/legado/' + x.arquivo, linha: x.linha, funcao: x.funcao, acao: x.acao || x.caso || '', regraAtual: regraAtual(x) }));
    const defs = saida.filter(x => x.poder.split('+').indexOf(p.codigo) >= 0 && x.tipo === 'definicao').map(x => ({ arquivo: 'base/legado/' + x.arquivo, linha: x.linha, funcao: x.funcao, acao: '(definição da regra)', regraAtual: x.trecho.replace(/\s+/g, ' ') }));
    const o = { codigo: p.codigo, modulo: p.modulo, nome: p.nome, descricao: p.descricao, categoria: p.categoria, padrao: p.padrao, lote: p.lote };
    if (p.escopo) o.escopo = p.escopo;
    if (p.limite) o.limite = p.limite;
    if (p.lista) o.lista = p.lista;
    if (p.nova) o.nova = true;
    if (p.obs) o.obs = p.obs;
    o.travas = tr.concat(defs).concat(p.travasExtras || []);
    o.hoje = hojeDe(p);
    return o;
  }),
  travasSoTela: extra.TELA,
  divergencias: extra.DIVERGENCIAS,
  foraDasCaixas: extra.FORA,
  roteamento: saida.filter(x => x.tipo === 'roteamento').map(x => ({ arquivo: 'base/legado/' + x.arquivo, linha: x.linha, funcao: x.funcao, regraAtual: x.trecho.replace(/\s+/g, ' '), uso: x.obs })),
  foraDasCaixasLinhas: saida.filter(x => x.tipo === 'fora_caixas').map(x => ({ arquivo: 'base/legado/' + x.arquivo, linha: x.linha, funcao: x.funcao, regraAtual: x.trecho.replace(/\s+/g, ' '), rotulo: x.poder })),
  naoSaoTravas: saida.filter(x => x.tipo === 'nao_trava').map(x => ({ arquivo: 'base/legado/' + x.arquivo, linha: x.linha, funcao: x.funcao, motivo: x.obs })),
};
// ---------- conferências
const cods = new Set();
catalogo.poderes.forEach(p => { if (cods.has(p.codigo)) throw new Error('código repetido ' + p.codigo); cods.add(p.codigo); if (!/^[A-Z][A-Z0-9_]+$/.test(p.codigo)) throw new Error('código fora do padrão ' + p.codigo); });
saida.forEach(x => x.poder.split('+').forEach(c => { if (x.tipo === 'fora_caixas') return; if (!['—', '?', 'ROTEAMENTO'].includes(c) && !cods.has(c) && !/^\(/.test(c)) throw new Error('poder inexistente ' + c + ' em ' + x.arquivo + ':' + x.linha); }));
catalogo.poderes.forEach(p => { if (!p.travas.length && !p.nova) console.error('AVISO sem trava: ' + p.codigo); });

fs.writeFileSync(path.join(OUT, 'catalogo.json'), JSON.stringify(catalogo, null, 1));
// CSV
const esc = v => String(v === undefined || v === null ? '' : v).replace(/;/g, ',').replace(/[\r\n]+/g, ' ');
const modDe = x => { const p = poderes.find(p => p.codigo === x.poder.split('+')[0]); return p ? p.modulo : (extra.MODULO_ARQ.find(([re]) => re.test(x.arquivo)) || [0, ''])[1]; };
const linhasCsv = ['arquivo;linha;funcao;acao;regraAtual;modulo;poder;tipo'];
saida.forEach(x => linhasCsv.push([ 'base/legado/' + x.arquivo, x.linha, x.funcao, x.acao || (x.caso ? 'case ' + x.caso : '') || (x.tipo === 'definicao' ? '(definição da regra)' : ''), x.tipo === 'roteamento' || x.tipo === 'nao_trava' ? x.trecho.replace(/\s+/g, ' ') + ' [' + x.obs + ']' : regraAtual(x), modDe(x), x.poder, x.tipo ].map(esc).join(';')));
poderes.forEach(p => (p.travasExtras || []).forEach(t => linhasCsv.push([t.arquivo, t.linha, t.funcao, t.acao, t.regraAtual, p.modulo, p.codigo, 'trava'].map(esc).join(';'))));
extra.TELA.forEach(t => linhasCsv.push([t.arquivo, t.linha, t.funcao, t.acao, t.regraAtual, t.modulo, t.poder, 'so_tela'].map(esc).join(';')));
fs.writeFileSync(path.join(OUT, 'INVENTARIO_TRAVAS.csv'), '﻿' + linhasCsv.join('\r\n') + '\r\n');
fs.writeFileSync(path.join(S, 'sem-poder.json'), JSON.stringify(semPoder, null, 1));
// resumo
const cont = {}; saida.forEach(x => cont[x.tipo] = (cont[x.tipo] || 0) + 1);
console.log('linhas', saida.length, cont, 'sem poder', semPoder.length, 'poderes', catalogo.poderes.length, 'tela', extra.TELA.length, 'extrasNode', poderes.reduce((s, p) => s + (p.travasExtras || []).length, 0));
const porLote = {}; catalogo.poderes.forEach(p => { porLote[p.lote] = porLote[p.lote] || { poderes: 0, travas: 0 }; porLote[p.lote].poderes++; porLote[p.lote].travas += p.travas.filter(t => t.acao !== '(definição da regra)').length; });
console.log(JSON.stringify(porLote));
fs.writeFileSync(path.join(S, 'saida.json'), JSON.stringify(saida));
