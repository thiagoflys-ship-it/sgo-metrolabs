// Versão do app de campo como o servidor calcula (src/servicos/campo.ts, carregarCampo): sha256 de nome+corpo, em ordem, 12 primeiros.
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const EXT = [".html", ".js", ".css", ".webmanifest", ".png", ".webp", ".svg"];
const pasta = process.argv[2], h = crypto.createHash("sha256");
for (const n of fs.readdirSync(pasta).sort()) { if (!EXT.includes(path.extname(n)) || !/^[a-z0-9.-]+$/i.test(n)) continue; h.update(n).update(fs.readFileSync(path.join(pasta, n))); }
console.log(h.digest("hex").slice(0, 12));
