// Monta o pacote da camada (Node; o bash com cmp por arquivo era lento demais no Windows).
// Uso: node montar-camada.cjs <base> <candidata> <saída> <TAG> <BASE imagem>
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const [B, C, O, TAG, BASEIMG] = process.argv.slice(2);
const h = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
fs.rmSync(O, { recursive: true, force: true }); fs.mkdirSync(O, { recursive: true });
const cand = fs.readdirSync(C).sort(), base = fs.readdirSync(B).sort();
const removidos = base.filter((f) => !cand.includes(f));
if (removidos.length) throw new Error('arquivo removido na candidata (não suportado): ' + removidos.join(', '));
const man = [], bh = [], mh = [], lista = [];
for (const f of cand) {
  const hc = h(path.join(C, f));
  if (!base.includes(f)) { man.push('NOVO ' + f); lista.push(f); mh.push(hc + '  ' + f); }
  else { const hb = h(path.join(B, f)); if (hb !== hc) { man.push('ALTERADO ' + f); lista.push(f); bh.push(hb + '  ' + f); mh.push(hc + '  ' + f); } }
}
fs.writeFileSync(path.join(O, 'manifesto.txt'), man.join('\n') + '\n');
fs.writeFileSync(path.join(O, 'base-hashes.txt'), bh.length ? bh.join('\n') + '\n' : '');
fs.writeFileSync(path.join(O, 'manifesto-hashes.txt'), mh.join('\n') + '\n');
fs.writeFileSync(path.join(O, 'total-esperado.txt'), cand.length + '\n');
execFileSync('tar', ['-czf', path.resolve(O, 'camada.tgz').replace(/^([A-Za-z]):/, (m, d) => '/' + d.toLowerCase()).replace(/\\/g, '/'), ...lista], { cwd: C });
const pub = fs.readFileSync(path.join(__dirname, '../financeiro-20261115/publicar.sh'), 'utf8').replace(/^TAG=.*$/m, 'TAG=' + TAG).replace(/^BASE=.*$/m, 'BASE=' + BASEIMG);
fs.writeFileSync(path.join(O, 'publicar.sh'), pub.replace(/\r\n/g, '\n'));
console.log(man.join('\n')); console.log('total: ' + cand.length);
