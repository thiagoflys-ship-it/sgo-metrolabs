// Monta novo/segredos.ts e novo/segredos.js a partir da produção (prod/) e das partes em fontes/. Uso: node montar.cjs
// O .js segue o compilado de produção: as mesmas rotas (copiadas de prod/segredos.js) e a lista e a página novas, sem os tipos.
const fs = require('fs');
const prod = fs.readFileSync('prod/segredos.ts', 'utf8'), prodJs = fs.readFileSync('prod/segredos.js', 'utf8');
const ini = prod.indexOf('export const SEGREDOS'), fimLista = prod.indexOf('];', ini) + 3, ipag = prod.indexOf('const PAGINA = ');
const linhas = prod.slice(prod.indexOf('[', ini) + 1, fimLista - 3).split('\n').filter((l) => l.trim());
const grupo = (k) => k === 'GEMINI_API_KEY' ? 'IA' : /^OMIE_/.test(k) ? 'Omie (matriz)' : /^(ZAPI|WHATSAPP|META)_/.test(k) ? 'WhatsApp' : 'Sistema';
const base = linhas.map((l) => { const k = /chave: "([A-Z_]+)"/.exec(l)[1]; return l.replace('{ chave: "' + k + '", ', '{ chave: "' + k + '", grupo: "' + grupo(k) + '", '); });
if (base.length !== 14) throw new Error('esperava 14 chaves antigas, achei ' + base.length);
const lista = fs.readFileSync('fontes/segredos-lista.ts.txt', 'utf8').replace('__BASE__', base.join('\n'));
const pagina = fs.readFileSync('fontes/segredos-pagina.ts.txt', 'utf8');
const ts = prod.slice(0, ini) + lista + prod.slice(fimLista, ipag) + pagina;
fs.mkdirSync('novo', { recursive: true });
fs.writeFileSync('novo/segredos.ts', ts);
// JS: tira os tipos da lista
let listaJs = lista.replace(/^type Segredo = .*\n/m, '')
  .replace('const BASE: Segredo[] = [', 'const BASE = [').replace('const EMPRESAS_FIN: Array<[string, string]> = ', 'const EMPRESAS_FIN = ')
  .replace('function chavesFinanceiro(): Segredo[] {', 'function chavesFinanceiro() {').replace('const l: Segredo[] = [];', 'const l = [];')
  .replace('export const SEGREDOS: Segredo[] = ', 'export const SEGREDOS = ');
if (/: Segredo|<\[string/.test(listaJs)) throw new Error('sobrou tipo');
const jIni = prodJs.indexOf('export const SEGREDOS'), jRotas = prodJs.indexOf('export function rotasSegredos'), jPag = prodJs.indexOf('const PAGINA = ');
const js = prodJs.slice(0, jIni) + listaJs + prodJs.slice(jRotas, jPag) + pagina.replace(/\n$/, '') + '\n//# sourceMappingURL=segredos.js.map';
fs.writeFileSync('novo/segredos.js', js);
console.log('ok ts', ts.length, 'js', js.length);
