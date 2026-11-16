'use strict';
// 16/11/2026: XmlService de leitura igual ao do servidor (sgo_servidor/src/compat/xml.ts, criarXmlService), em JavaScript, para os
// testes que leem XML de nota fiscal. Mesmo comportamento: getName devolve o nome local; getChildren() sem nome devolve todos os
// filhos; getAttribute(nome) só acha atributo sem prefixo; DOCTYPE e comentários são ignorados.
const ENT = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
const decodificar = (s) => (s.indexOf('&') < 0 ? s : s.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENT[e] !== undefined ? ENT[e] : m))));
function analisarXml(xml) {
  const pilha = []; let raiz = null;
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<\/([^\s>]+)\s*>|<([^\s/>]+)((?:\s+[^\s=]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(xml))) {
    const topo = pilha[pilha.length - 1];
    if (m[1] !== undefined) { if (topo) topo.no.filhos.push(m[1]); continue; }
    if (m[6] !== undefined) { if (topo) topo.no.filhos.push(decodificar(m[6])); continue; }
    if (m[2] !== undefined) { pilha.pop(); continue; }
    if (m[3] === undefined) continue;
    const ns = new Map(topo ? topo.ns : []), brutos = [];
    for (const a of m[4].matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      const nome = a[1], valor = decodificar(a[2] !== undefined ? a[2] : (a[3] || ''));
      if (nome === 'xmlns') ns.set('', valor); else if (nome.startsWith('xmlns:')) ns.set(nome.slice(6), valor); else brutos.push([nome, valor]);
    }
    const partes = m[3].includes(':') ? m[3].split(':') : ['', m[3]];
    const no = { nome: partes[1], prefixo: partes[0], uri: ns.get(partes[0]) || '', filhos: [],
      attrs: brutos.map(([n, v]) => (n.includes(':') ? { nome: n.split(':')[1], uri: ns.get(n.split(':')[0]) || '', valor: v } : { nome: n, uri: '', valor: v })) };
    if (topo) topo.no.filhos.push(no); else if (!raiz) raiz = no;
    if (!m[5]) pilha.push({ no, ns });
  }
  if (!raiz) throw new Error('Content is not allowed in prolog.');
  return raiz;
}
function criarXmlService() {
  const texto = (n) => n.filhos.filter((f) => typeof f === 'string').join('');
  const elemento = (n) => ({
    getName: () => n.nome, getText: () => texto(n), getTextTrim: () => texto(n).trim(),
    getChildren: (nome) => n.filhos.filter((x) => typeof x !== 'string' && (nome === undefined || (x.nome === nome && x.uri === ''))).map(elemento),
    getChild: (nome) => { const f = n.filhos.find((x) => typeof x !== 'string' && x.nome === nome && x.uri === ''); return f ? elemento(f) : null; },
    getAttribute: (nome) => { const a = n.attrs.find((x) => x.nome === nome && x.uri === ''); return a ? { getName: () => a.nome, getValue: () => a.valor } : null; }
  });
  return { parse: (xml) => { const r = analisarXml(String(xml)); return { getRootElement: () => elemento(r) }; } };
}
module.exports = { criarXmlService };
