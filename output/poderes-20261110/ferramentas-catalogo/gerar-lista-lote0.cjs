// Gera o bloco SGO_PODERES_LISTA (codigo, modulo, nome, descricao, categoria, lote) para SGO_Poderes.js a partir do catalogo.json.
'use strict';
const cat = require('../catalogo.json');
const linhas = cat.poderes.map((p) => '  [' + [p.codigo, p.modulo, p.nome.replace(/\s*\*\(NOVO\)\*\s*$/, ''), p.descricao, p.categoria].map((x) => JSON.stringify(String(x))).join(', ') + ', ' + p.lote + ']');
process.stdout.write('var SGO_PODERES_LISTA = [\n' + linhas.join(',\n') + '\n];\n');
