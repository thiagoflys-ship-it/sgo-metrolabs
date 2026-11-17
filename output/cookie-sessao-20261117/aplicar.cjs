// 17/11/2026: cookie da sessão acompanha a sessão viva (renovado no /api/run, no máximo 1 vez por hora por sessão).
const fs = require('fs');
function aplicar(arq, saida, ind, tipoMap) {
  let t = fs.readFileSync(arq, 'utf8');
  const ancMap = 'const perfis = new Map';
  if (t.split(ancMap).length !== 2) throw new Error(arq + ': âncora perfis');
  t = t.replace(ancMap, '/* 17/11/2026 (Mônica: "Este arquivo é interno" ao abrir o orçamento): o cookie da sessão (usado em /arquivos, /planilhas,\n' + ind + '   /pastas) vencia 24 h depois do login, mas a sessão continua viva enquanto a pessoa usa o sistema. O /api/run renova o\n' + ind + '   cookie da sessão válida do pedido (no máximo 1 vez por hora por sessão). */\n' + ind + 'const cookieRenovadoEm = new Map' + tipoMap + '();\n' + ind + ancMap);
  const re = /(\n(\s*)if \(sid && \(await estadoDaSessao\(sid\)\)\.pendente === "TROCA_SENHA"\) \{\n[^\n]*\n[^\n]*\n\s*\}\n)/;
  const m = t.match(re); if (!m) throw new Error(arq + ': âncora troca de senha');
  const i2 = m[2];
  const bloco = i2 + '// 17/11/2026: renova o cookie da sessão viva (ver cookieRenovadoEm)\n' +
    i2 + 'if (doPedido && (cookies[def.cookie] !== doPedido || Date.now() - (cookieRenovadoEm.get(doPedido) ?? 0) > 3_600_000)) {\n' +
    i2 + '  const est = await estadoDaSessao(doPedido);\n' +
    i2 + '  if (est.perfil && !est.pendente) {\n' +
    i2 + '    if (cookieRenovadoEm.size > 20000) cookieRenovadoEm.clear();\n' +
    i2 + '    cookieRenovadoEm.set(doPedido, Date.now());\n' +
    i2 + '    rep.setCookie(def.cookie, doPedido, { path: "/", httpOnly: true, sameSite: "lax", secure: s.urlPublica.startsWith("https://"), maxAge: 60 * 60 * 24 });\n' +
    i2 + '  }\n' + i2 + '}\n';
  t = t.replace(re, m[1] + bloco);
  fs.writeFileSync(saida, t);
}
aplicar('servidor.js.antes', 'servidor.js', '    ', '');
aplicar('servidor.ts.antes', 'servidor.ts', '  ', '<string, number>');
