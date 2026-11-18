/*
 * SGO+ Campo: service worker. Guarda as telas do aplicativo no aparelho para abrir sem internet.
 * Os dados (O.S., fila, fotos) não passam por aqui: ficam no IndexedDB e sobem pela página (/api/run).
 * A versão e a lista de arquivos são postas pelo servidor (servicos/campo.ts).
 */
const VERSAO = "__VERSAO__";
const ARQUIVOS = __ARQUIVOS__;
const CACHE = "sgo-campo-" + VERSAO;

self.addEventListener("install", (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS.map((u) => new Request(u, { cache: "reload" })))));
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith("sgo-campo-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// a página pede para a versão nova assumir (botão "Atualizar agora")
self.addEventListener("message", (ev) => {
  if (ev.data && ev.data.tipo === "assumir") self.skipWaiting();
  if (ev.data && ev.data.tipo === "versao" && ev.source) ev.source.postMessage({ tipo: "versao", versao: VERSAO });
});

self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  if (req.method !== "GET") return;                       // /api/run e envios: sempre direto ao servidor
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith("/campo")) return;
  if (url.pathname === "/campo/sw.js" || url.pathname === "/campo/versao") return;
  // abrir uma tela do aplicativo: a página guardada (sem internet abre do mesmo jeito)
  if (req.mode === "navigate") {
    ev.respondWith(caches.open(CACHE).then((c) => c.match("/campo/").then((guardada) =>
      guardada || fetch(req).catch(() => new Response("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><body style='font:18px system-ui;padding:20px'><h1>SGO+ Campo</h1><p>Sem internet e o aplicativo ainda não foi guardado neste aparelho. Abra uma vez com internet.</p>", { headers: { "Content-Type": "text/html; charset=utf-8" } })))));
    return;
  }
  // arquivos do aplicativo: o guardado; se não houver, busca e guarda
  ev.respondWith(caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true }).then((g) => g || fetch(req).then((r) => {
    if (r.ok) c.put(req, r.clone());
    return r;
  }))));
});
