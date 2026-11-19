/**
 * 11/11/2026 (Missão 01, achado D-04): segredos e sessões CIFRADOS EM REPOUSO na tabela `propriedades`.
 *
 * Antes, chaves de integração (Omie, SMTP, Meta/WhatsApp, Z-API, Auvo, Gemini, Tuya, rastreador, Caju...), senhas do
 * Simulador/Modo personalizado e as sessões do login ficavam em texto claro no banco e, por isso, dentro de todo dump.
 * Agora, na camada que lê e grava as propriedades (atendente do legado e serviços do servidor):
 *
 *   - Chave-segredo (lista + padrão de nome, ehChaveSegredo): grava "cofre:v1:<iv>:<tag>:<dados>" com o cofre AES-256-GCM
 *     (cofre.ts, chave em /cofre/chave, fora do backup); o dado adicional (AAD) amarra o valor ao escopo e ao nome
 *     ("propriedades|<escopo>|<chave>"): copiar o valor cifrado para outra chave não abre.
 *   - Leitura: valor com o prefixo é decifrado; valor antigo em texto claro continua sendo lido (migração preguiçosa).
 *     Valor que não abre (chave do cofre trocada) volta como null e fica registrado (só o NOME da chave, nunca o valor).
 *   - Sessões (SGO_SESSION_<id>): o nome gravado passa a ser SGO_SESSION_H_<sha256(id)> e o conteúdo vai cifrado.
 *     Quem tiver só o dump não descobre o id da sessão (não consegue entrar com ela). O legado continua pedindo
 *     SGO_SESSION_<id>: a tradução é feita aqui (atendente.ts). Sessão antiga (nome em claro) continua válida: na
 *     primeira leitura é regravada no formato novo e o nome antigo é apagado.
 *   - Cofre indisponível (SGO_COFRE_CHAVE inválida, arquivo corrompido ou ilegível, ou arquivo AUSENTE quando já existem
 *     valores cifrados no banco — nesse caso a chave NÃO é gerada de novo, para não trocar a chave em silêncio): o
 *     sistema não para. Lê o que der (texto claro), grava em texto claro e REGISTRA o erro (nome da chave, nunca o
 *     valor). A migração (migrarPropSegredas) cifra depois o que ficou em claro.
 *
 * Migração única dos valores que já existem: migrarPropSegredas (idempotente), chamada só por script interno
 * (dist/migracao/cifrarPropriedades.js dentro do contêiner) — nunca pelo /api/run (o legado não enxerga este módulo).
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Db } from "../db.js";
import { criarCofre, arquivoDaChaveCofre, type Cofre } from "./cofre.js";

export const PREFIXO_COFRE = "cofre:v1:";
/** Nome persistido da sessão: SGO_SESSION_H_<sha256 hex do id>. */
export const PREFIXO_SESSAO_HASH = "SGO_SESSION_H_";
const PREFIXO_SESSAO = "SGO_SESSION_";

/** Segredos conhecidos por nome (levantamento de 11/11/2026: tela /_sgo/segredos, legado, sistemas.ts e produção). */
export const SEGREDOS_POR_NOME: ReadonlySet<string> = new Set([
  "GEMINI_API_KEY", "OMIE_APP_KEY", "OMIE_APP_SECRET", "AUVO_API_KEY", "AUVO_API_TOKEN", "AUVO_TOKEN_CACHE",
  "MODO_PERSONALIZADO_SENHA", "SIMULADOR_ADMIN_SENHA", "SMTP_SENHA",
  "PONTE_COMMAND_SEGREDO", "CMD_PONTE_SEGREDO", "PONTO_SEGREDO", "CMD_PONTO_SEGREDO", "CMD_WEBHOOK_SEGREDO",
  "PORTOES_LOCAL_SEGREDO", "LIC_CIENCIA_SEGREDO",
  "ZAPI_INSTANCIA", "ZAPI_TOKEN", "ZAPI_CLIENT_TOKEN",                    // instância + token formam a URL de envio
  "META_WA_TOKEN", "WHATSAPP_TOKEN", "META_APP_SECRET", "META_WA_VERIFY_TOKEN", "WHATSAPP_VERIFY_TOKEN",
  "RASTREADOR_TOKEN", "RASTREADOR_TOKEN_COMANDOS",
  "TUYA_ACCESS_ID", "TUYA_ACCESS_SECRET",
]);
/** Padrão de nome para segredos futuros (ex.: CAJU_CLIENT_SECRET). */
const PADRAO_SEGREDO = /(SECRET|SEGREDO|SENHA|PASSWORD|PASSWD|_TOKEN|TOKEN_|API_KEY|APP_KEY|ACCESS_KEY|PRIVATE_KEY|CLIENT_ID)/i;
/** Nunca cifrar por padrão de nome: carimbos, testes, configuração já cifrada pelo próprio serviço e IDs públicos. */
const NAO_SEGREDO = /^(CHV_ALTERADO_|CHV_TESTE_|SGO_SESSION_)|^INTELBRAS_CONFIG_CIFRADA$|^META_WA_PHONE_ID$|^META_WA_WABA_ID$/;

export const ehChaveSegredo = (chave: string) => {
  const c = String(chave ?? "");
  if (SEGREDOS_POR_NOME.has(c)) return true;
  return !NAO_SEGREDO.test(c) && PADRAO_SEGREDO.test(c);
};

/** "SGO_SESSION_<id>" como o legado pede (id em claro). O formato hash não conta. */
export const ehSessaoLegado = (chave: string) => {
  const c = String(chave ?? "");
  return c.startsWith(PREFIXO_SESSAO) && !c.startsWith(PREFIXO_SESSAO_HASH) && c.length > PREFIXO_SESSAO.length;
};
export const ehSessaoHash = (chave: string) => String(chave ?? "").startsWith(PREFIXO_SESSAO_HASH);
/** Nome persistido da sessão a partir do nome que o legado usa. */
export const nomeSessaoHash = (chaveLegado: string) =>
  PREFIXO_SESSAO_HASH + createHash("sha256").update(String(chaveLegado).slice(PREFIXO_SESSAO.length), "utf8").digest("hex");

/** Este valor precisa ficar cifrado no banco? */
export const deveCifrar = (chave: string) => ehChaveSegredo(chave) || ehSessaoHash(chave) || ehSessaoLegado(chave);

const contextoDe = (escopo: string, chave: string) => `propriedades|${escopo}|${chave}`;

/* ───────────────────────── cofre das propriedades (um por processo) ───────────────────────── */
type Log = (nivel: string, texto: string, origem?: string) => void;
interface Config { env: NodeJS.ProcessEnv; pastaDados: string; log: Log }
let cfg: Config = { env: process.env, pastaDados: resolve(process.env.PASTA_DADOS ?? "./dados"), log: (n, t, o) => console.error(`[${n}] ${o ?? ""} ${t}`) };
let estado: { cofre: Cofre | null; motivo: string; em: number } | null = null;
const ultimoAviso = new Map<string, number>();

/** Chamado na subida do servidor (e pelos testes). Zera o estado: a próxima operação confere o cofre de novo. */
export function configurarPropSegredas(op: { env?: NodeJS.ProcessEnv; pastaDados?: string; log?: Log } = {}) {
  cfg = { env: op.env ?? cfg.env, pastaDados: op.pastaDados ? resolve(op.pastaDados) : cfg.pastaDados, log: op.log ?? cfg.log };
  estado = null; ultimoAviso.clear();
}

/** Registro com freio (a mesma mensagem no máximo a cada 10 min). Nunca recebe valores, só nomes. */
function registrar(nivel: string, tipo: string, texto: string) {
  const agora = Date.now();
  if (agora - (ultimoAviso.get(tipo) ?? 0) < 10 * 60_000) return;
  ultimoAviso.set(tipo, agora);
  try { cfg.log(nivel, texto, "cofre-propriedades"); } catch { /* registro nunca derruba */ }
}

/** O cofre, ou null (indisponível; motivo registrado). Revalida a cada 60 s enquanto estiver indisponível. */
async function obterCofre(db: Db): Promise<Cofre | null> {
  if (estado?.cofre) return estado.cofre;
  if (estado && Date.now() - estado.em < 60_000) return null;
  let motivo = "";
  try {
    const temEnv = String(cfg.env.SGO_COFRE_CHAVE ?? "").trim() !== "";
    if (!temEnv && !existsSync(arquivoDaChaveCofre(cfg.env, cfg.pastaDados))) {
      // sem chave: só pode ser gerada se ainda não existe nada cifrado (senão a chave nova não abriria o que já existe)
      const cifrados = await db.query("SELECT 1 FROM propriedades WHERE valor LIKE $1 LIMIT 1", [PREFIXO_COFRE + "%"]);
      if (cifrados[0]) motivo = "o arquivo da chave do cofre sumiu e já existem valores cifrados no banco (a chave não foi gerada de novo)";
    }
    if (!motivo) {
      const c = criarCofre({ env: cfg.env, pastaDados: cfg.pastaDados });
      c.cifrar("teste", "teste");      // lê (ou cria, na primeira vez) e valida a chave
      estado = { cofre: c, motivo: "", em: Date.now() };
      return c;
    }
  } catch (e) { motivo = (e as Error).message; }
  estado = { cofre: null, motivo, em: Date.now() };
  registrar("erro", "indisponivel", `cofre das propriedades INDISPONÍVEL: ${motivo}. Segredos e sessões novos serão gravados SEM cifra até a chave voltar; depois rode a migração (cifrarPropriedades).`);
  return null;
}

/** Valor a gravar no banco: cifrado se a chave for segredo/sessão; em claro (com registro) se o cofre faltar. */
export async function selarProp(db: Db, escopo: string, chave: string, valor: string): Promise<string> {
  const v = String(valor);
  if (!deveCifrar(chave) || v.startsWith(PREFIXO_COFRE)) return v;
  const c = await obterCofre(db);
  if (!c) {
    registrar("erro", "claro:" + (ehSessaoHash(chave) ? "sessao" : chave), `propriedade ${ehSessaoHash(chave) ? "de sessão" : chave} gravada SEM cifra (cofre indisponível). A migração cifra depois.`);
    return v;
  }
  return PREFIXO_COFRE + c.cifrar(v, contextoDe(escopo, chave));
}

/** Valor lido do banco → texto. Em claro: devolve como está. Cifrado que não abre: null (registrado). */
export async function abrirProp(db: Db, escopo: string, chave: string, valor: string | null | undefined): Promise<string | null> {
  if (valor === null || valor === undefined) return null;
  const v = String(valor);
  if (!v.startsWith(PREFIXO_COFRE)) return v;
  const c = await obterCofre(db);
  if (!c) return null;
  try { return c.decifrar(v.slice(PREFIXO_COFRE.length), contextoDe(escopo, chave)); }
  catch {
    registrar("erro", "ilegivel:" + (ehSessaoHash(chave) ? "sessao" : chave), `propriedade ${ehSessaoHash(chave) ? "de sessão" : chave} (${escopo}) cifrada não abriu com a chave atual do cofre; tratada como vazia.`);
    return null;
  }
}

/** Lê uma propriedade já decifrada ("" quando não existe ou não abre — o padrão dos serviços do servidor). */
export async function lerProp(db: Db, escopo: string, chave: string): Promise<string> {
  const r = await db.query<{ valor: string }>("SELECT valor FROM propriedades WHERE escopo = $1 AND chave = $2", [escopo, chave]);
  return (await abrirProp(db, escopo, chave, r[0]?.valor)) ?? "";
}

/** Grava (insere ou troca) uma propriedade, cifrando se for segredo. */
export async function gravarProp(db: Db, escopo: string, chave: string, valor: string): Promise<void> {
  await db.query("INSERT INTO propriedades (escopo, chave, valor) VALUES ($1, $2, $3) ON CONFLICT (escopo, chave) DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now()",
    [escopo, chave, await selarProp(db, escopo, chave, valor)]);
}

/* ───────────────────────── migração única e conferência ───────────────────────── */
export interface ResultadoMigracao {
  cofreDisponivel: boolean;
  segredosCifrados: number; sessoesMigradas: number; jaCifrados: number; falhas: number;
  /** nomes das chaves-segredo tratadas (NUNCA valores) */
  chaves: string[];
}

/**
 * Cifra os segredos que estão em texto claro e passa as sessões para o nome com hash. Idempotente: rodar de novo não
 * muda nada. Cada linha é trocada só se o valor ainda for o mesmo que foi lido (não atropela gravação concorrente).
 * Sem cofre: não grava nada e devolve cofreDisponivel = false.
 */
export async function migrarPropSegredas(db: Db): Promise<ResultadoMigracao> {
  const r: ResultadoMigracao = { cofreDisponivel: false, segredosCifrados: 0, sessoesMigradas: 0, jaCifrados: 0, falhas: 0, chaves: [] };
  const c = await obterCofre(db);
  if (!c) return r;
  r.cofreDisponivel = true;
  const linhas = await db.query<{ escopo: string; chave: string; valor: string }>("SELECT escopo, chave, valor FROM propriedades ORDER BY escopo, chave");
  for (const l of linhas) {
    if (!deveCifrar(l.chave)) continue;
    if (l.valor.startsWith(PREFIXO_COFRE) && !ehSessaoLegado(l.chave)) { r.jaCifrados++; continue; }
    try {
      if (ehSessaoLegado(l.chave)) {
        const texto = l.valor.startsWith(PREFIXO_COFRE) ? await abrirProp(db, l.escopo, l.chave, l.valor) : l.valor;
        if (texto === null) { r.falhas++; continue; }
        const nome = nomeSessaoHash(l.chave);
        await db.transacao(async (tx) => {
          await tx.query("INSERT INTO propriedades (escopo, chave, valor) VALUES ($1, $2, $3) ON CONFLICT (escopo, chave) DO NOTHING", [l.escopo, nome, await selarProp(tx, l.escopo, nome, texto)]);
          await tx.query("DELETE FROM propriedades WHERE escopo = $1 AND chave = $2 AND valor = $3", [l.escopo, l.chave, l.valor]);
        });
        r.sessoesMigradas++;
      } else {
        const novo = await selarProp(db, l.escopo, l.chave, l.valor);
        if (!novo.startsWith(PREFIXO_COFRE)) { r.falhas++; continue; }
        const feito = await db.query("UPDATE propriedades SET valor = $3 WHERE escopo = $1 AND chave = $2 AND valor = $4 RETURNING 1", [l.escopo, l.chave, novo, l.valor]);
        if (feito[0]) { r.segredosCifrados++; if (!ehSessaoHash(l.chave)) r.chaves.push(`${l.escopo}/${l.chave}`); }
      }
    } catch { r.falhas++; }
  }
  return r;
}

/**
 * Reversão (só para voltar a uma imagem anterior a esta correção): decifra os segredos e devolve as sessões ao nome em
 * claro, que é o formato que a versão antiga sabe ler. Tem de rodar COM a imagem nova (que tem a chave e este código),
 * ANTES de trocar a imagem. Depois dela o banco volta a ter segredos em claro (o achado D-04 volta a valer).
 */
export async function reverterPropSegredas(db: Db): Promise<{ cofreDisponivel: boolean; segredosDecifrados: number; sessoesRevertidas: number; falhas: number }> {
  const r = { cofreDisponivel: false, segredosDecifrados: 0, sessoesRevertidas: 0, falhas: 0 };
  if (!(await obterCofre(db))) return r;
  r.cofreDisponivel = true;
  const linhas = await db.query<{ escopo: string; chave: string; valor: string }>("SELECT escopo, chave, valor FROM propriedades WHERE valor LIKE $1", [PREFIXO_COFRE + "%"]);
  for (const l of linhas) {
    const texto = await abrirProp(db, l.escopo, l.chave, l.valor);
    if (texto === null) { r.falhas++; continue; }
    try {
      if (ehSessaoHash(l.chave)) {
        let sid = ""; try { sid = String(JSON.parse(texto)?.sessionId ?? ""); } catch { sid = ""; }
        const nome = PREFIXO_SESSAO + sid;
        if (!sid || nomeSessaoHash(nome) !== l.chave) { r.falhas++; continue; }
        await db.transacao(async (tx) => {
          await tx.query("INSERT INTO propriedades (escopo, chave, valor) VALUES ($1, $2, $3) ON CONFLICT (escopo, chave) DO NOTHING", [l.escopo, nome, texto]);
          await tx.query("DELETE FROM propriedades WHERE escopo = $1 AND chave = $2 AND valor = $3", [l.escopo, l.chave, l.valor]);
        });
        r.sessoesRevertidas++;
      } else {
        const feito = await db.query("UPDATE propriedades SET valor = $3 WHERE escopo = $1 AND chave = $2 AND valor = $4 RETURNING 1", [l.escopo, l.chave, texto, l.valor]);
        if (feito[0]) r.segredosDecifrados++;
      }
    } catch { r.falhas++; }
  }
  return r;
}

/** Conferência sem ler valores: quantas propriedades que deveriam estar cifradas ainda estão em claro (só contagens). */
export async function contarPropSegredasEmClaro(db: Db): Promise<{ segredosEmClaro: number; sessoesNomeEmClaro: number; sessoesConteudoEmClaro: number; cifrados: number; nomesEmClaro: string[] }> {
  const linhas = await db.query<{ escopo: string; chave: string; cifrado: boolean }>("SELECT escopo, chave, valor LIKE $1 AS cifrado FROM propriedades", [PREFIXO_COFRE + "%"]);
  const out = { segredosEmClaro: 0, sessoesNomeEmClaro: 0, sessoesConteudoEmClaro: 0, cifrados: 0, nomesEmClaro: [] as string[] };
  for (const l of linhas) {
    if (l.cifrado) out.cifrados++;
    if (ehSessaoLegado(l.chave)) out.sessoesNomeEmClaro++;
    else if (ehSessaoHash(l.chave)) { if (!l.cifrado) out.sessoesConteudoEmClaro++; }
    else if (ehChaveSegredo(l.chave) && !l.cifrado) { out.segredosEmClaro++; out.nomesEmClaro.push(`${l.escopo}/${l.chave}`); }
  }
  return out;
}
