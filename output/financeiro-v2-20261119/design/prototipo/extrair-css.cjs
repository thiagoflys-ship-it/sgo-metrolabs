// Copia os estilos REAIS do SGO+ (cand34, igual à produção) para o protótipo do Financeiro v2.
// Só lê a cand34; escreve em prototipo/css/. Rodar de novo quando a produção mudar:
//   node output/financeiro-v2-20261119/design/prototipo/extrair-css.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const CAND = path.resolve(__dirname, '../../../financeiro-20261116/cand34');
const SAIDA = path.join(__dirname, 'css');
function blocoStyle(arquivo) {
  const t = fs.readFileSync(path.join(CAND, arquivo), 'utf8');
  const i = t.indexOf('<style>'), f = t.indexOf('</style>', i);
  if (i < 0 || f < 0) throw new Error('sem <style> em ' + arquivo);
  return t.slice(i + 7, f);
}
const cab = (orig) => '/* CÓPIA AUTOMÁTICA de ' + orig + ' (cand34). Não editar aqui: rode extrair-css.cjs. */\n';
fs.writeFileSync(path.join(SAIDA, 'sgo-ui-estilos.css'), cab('UI_Estilos.html') + blocoStyle('UI_Estilos.html'));
fs.writeFileSync(path.join(SAIDA, 'sgo-comercial.css'), cab('JS_Comercial.html') + blocoStyle('JS_Comercial.html'));
fs.writeFileSync(path.join(SAIDA, 'sgo-atividades-modal.css'), cab('JS_Atividades.html (janela .atv-*)') + blocoStyle('JS_Atividades.html'));
console.log('ok', fs.readdirSync(SAIDA));
