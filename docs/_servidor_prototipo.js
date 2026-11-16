const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const types = {'.html':'text/html; charset=utf-8','.png':'image/png','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
http.createServer((req,res)=>{
  const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  const target = path.resolve(root, '.' + pathname);
  if (!target.startsWith(root) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    res.writeHead(404); return res.end('Arquivo não encontrado');
  }
  res.writeHead(200, {'Content-Type': types[path.extname(target)] || 'application/octet-stream'});
  fs.createReadStream(target).pipe(res);
}).listen(8765, '127.0.0.1');
