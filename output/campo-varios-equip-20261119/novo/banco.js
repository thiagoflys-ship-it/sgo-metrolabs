/*
 * SGO+ Campo: o que fica guardado no aparelho (IndexedDB "sgo-campo").
 *   cfg    chave/valor (sessão, preferências, últimas atualizações)
 *   os     O.S. baixadas do "Meu dia" (chave usuario|dia|osId)
 *   exec   o que o técnico fez em cada O.S. (chave usuario|osId)
 *   fila   ações a enviar (chave idLocal), nunca apagadas antes do servidor confirmar
 *   fotos  fotos e miniaturas (chave idLocal); o arquivo grande sai depois de confirmado, a miniatura fica
 */

const NOME = "sgo-campo", VERSAO = 1;
let aberto = null;

function abrir() {
  if (aberto) return aberto;
  aberto = new Promise((ok, falha) => {
    let req;
    try { req = indexedDB.open(NOME, VERSAO); } catch (e) { falha(e); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("cfg")) db.createObjectStore("cfg");
      if (!db.objectStoreNames.contains("os")) db.createObjectStore("os", { keyPath: "chave" }).createIndex("usuario", "usuario");
      if (!db.objectStoreNames.contains("exec")) db.createObjectStore("exec", { keyPath: "chave" }).createIndex("usuario", "usuario");
      if (!db.objectStoreNames.contains("fila")) { const f = db.createObjectStore("fila", { keyPath: "idLocal" }); f.createIndex("usuario", "usuario"); }
      if (!db.objectStoreNames.contains("fotos")) db.createObjectStore("fotos", { keyPath: "idLocal" }).createIndex("osId", "osId");
    };
    req.onsuccess = () => { const db = req.result; db.onversionchange = () => { db.close(); aberto = null; }; ok(db); };
    req.onerror = () => falha(req.error || new Error("Não foi possível abrir o armazenamento do aparelho."));
    req.onblocked = () => falha(new Error("Feche as outras abas do SGO+ Campo e abra de novo."));
  });
  aberto.catch(() => { aberto = null; });
  return aberto;
}

function pedir(loja, modo, fazer) {
  return abrir().then((db) => new Promise((ok, falha) => {
    const t = db.transaction(loja, modo), s = t.objectStore(loja);
    let r;
    try { r = fazer(s); } catch (e) { falha(e); return; }
    t.oncomplete = () => ok(r && "result" in r ? r.result : undefined);
    t.onerror = () => falha(t.error || new Error("Falha ao gravar no aparelho."));
    t.onabort = () => falha(t.error || new Error("Gravação no aparelho interrompida (espaço cheio?)."));
  }));
}

export const ler = (loja, chave) => pedir(loja, "readonly", (s) => s.get(chave));
export const gravar = (loja, valor, chave) => pedir(loja, "readwrite", (s) => (chave === undefined ? s.put(valor) : s.put(valor, chave)));
export const apagar = (loja, chave) => pedir(loja, "readwrite", (s) => s.delete(chave));
export const todos = (loja) => pedir(loja, "readonly", (s) => s.getAll());
export const porUsuario = (loja, usuario) => pedir(loja, "readonly", (s) => s.index("usuario").getAll(usuario));

export const cfg = {
  ler: (k) => ler("cfg", k),
  gravar: (k, v) => gravar("cfg", v, k),
  apagar: (k) => apagar("cfg", k),
};

/** O armazenamento do aparelho funciona? (navegação privada em alguns navegadores não deixa) */
export async function testar() {
  try { await cfg.gravar("teste", Date.now()); return true; } catch (e) { return false; }
}

function blobParaBase64(blob) {
  return new Promise((ok, falha) => {
    const r = new FileReader();
    r.onload = () => { const s = String(r.result || ""); ok(s.slice(s.indexOf(",") + 1)); };
    r.onerror = () => falha(r.error || new Error("Não foi possível ler a foto guardada."));
    r.readAsDataURL(blob);
  });
}

/** Adaptador para a fila (fila.js). */
export const bancoDaFila = {
  listarFila: (usuario) => (usuario ? porUsuario("fila", usuario) : todos("fila")),
  salvarItem: (item) => gravar("fila", item),
  lerFoto: (id) => ler("fotos", id),
  salvarFoto: (f) => gravar("fotos", f),
  // 18/11/2026: foto guardada em texto (aparelho que não guardou o arquivo) sobe do mesmo jeito
  lerFotoBase64: async (id) => { const f = await ler("fotos", id); if (f && !f.blob && f.base64) return f.base64; if (!f || !f.blob) throw new Error("A foto não está mais neste aparelho."); return blobParaBase64(f.blob); },
  // confirmada pelo servidor: o arquivo grande sai do aparelho, fica a miniatura
  liberarFoto: async (id) => { const f = await ler("fotos", id); if (f) { f.blob = null; f.base64 = ""; f.liberadaEm = new Date().toISOString(); await gravar("fotos", f); } },
};

/** Limpeza: itens enviados há mais de 7 dias saem da lista (o que não foi enviado nunca sai). */
export async function limparAntigos(dias = 7) {
  const limite = new Date(Date.now() - dias * 86400000).toISOString();
  const lista = await todos("fila");
  for (const i of lista) if ((i.estado === "enviado" || i.estado === "cancelado") && (i.enviadoEm || i.criadoEm) < limite) {
    await apagar("fila", i.idLocal);
    if (i.tipo === "FOTO") await apagar("fotos", i.idLocal);
  }
  const osLista = await todos("os");
  const diaLimite = limite.slice(0, 10);
  for (const o of osLista) if (o.dia && o.dia < diaLimite) await apagar("os", o.chave);
}
