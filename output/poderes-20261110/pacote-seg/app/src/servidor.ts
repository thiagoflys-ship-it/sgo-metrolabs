import { rotasFinanceiro } from "./servicos/financeiro.js";
/**
 * Servidor do SGO+ (Fastify). Rotas:
 *   GET  /            página principal (doGet do legado), inclusive ?equipamento=<ID> dos QR Codes
 *   POST /api/run     chamadas do navegador (google.script.run)
 *   POST /ponte       doPost do legado (Ponte com o COMMAND)
 *   POST|GET /webhook/whatsapp  webhook do WhatsApp (Z-API / Meta) — só nos outros sistemas (COMMAND; o retorno de status e as
 *                               respostas das mensagens do SGO+ também vão ao SGO+, servicos/whatsappRetorno.ts): POST responde
 *                     200 na hora e o doPost roda em segundo plano, na ordem (servicos/webhook.ts); GET (verificação
 *                     hub.* da Meta) chama o doGet e responde o que ele devolver
 *   GET  /arquivos/:id arquivos (antes no Google Drive)
 *   GET  /campo/       aplicativo do técnico de campo (SGO+ Campo, servicos/campo.ts) — só no SGO+
 *   GET  /agenda/<token>.ics  agenda por assinatura (iCalendar) — só nos outros sistemas (COMMAND): chama cmdAgendaIcs_(token)
 *                     do legado (AgendaFeed.js), cache de 5 min; token inválido/trocado = 404
 */
import Fastify, { type FastifyInstance } from "fastify";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { availableParallelism } from "node:os";
import { abrirDb, type Db } from "./db.js";
import { servicoPlanilhas } from "./servicos/planilhas.js";
import { servicoArquivos, arquivoRestrito, type ServicoArquivos } from "./servicos/arquivos.js";
import { Travas, CacheMemoria } from "./servicos/atendente.js";
import { PoolLegado } from "./legado/pool.js";
import { servicoPdf } from "./servicos/pdf.js";
import { criarAgendador } from "./servicos/agendador.js";
import { criarRotinasRapidas } from "./servicos/rotinaRapida.js";
import { criarTuyaMensagens } from "./servicos/tuyaMensagens.js";
import { criarPortoesLocais } from "./servicos/portoesLocais.js";
import { criarSentinela } from "./servicos/sentinela.js";
import { criarColetorLicitacoes } from "./servicos/licitacoes/coletor.js";
import { registrarColetor, registrarArquivosLic } from "./servicos/licitacoes/consulta.js";
import { criarArquivosLicitacoes } from "./servicos/licitacoes/arquivos.js";
import { executarGuarda } from "./servicos/licitacoes/guarda.js";
import { garantirTokenInterno, acessoInternoPermitido, CABECALHO_TOKEN_INTERNO } from "./servicos/licitacoes/interno.js";
import { servicoIntelbras } from "./servicos/intelbras.js";
import { LimiteLogin, LimitePedidos } from "./servicos/limiteLogin.js";
import { criarCarteiro } from "./servicos/carteiro.js";
import { rotasEstado } from "./servicos/estado.js";
import { rotasSegredos } from "./servicos/segredos.js";
import { rotasDocumentos } from "./servicos/rotasDocumentos.js";
import { rotasCampo } from "./servicos/campo.js";
import { rotasOrcamento } from "./servicos/orcamentoPublico.js";
import { criarModelos } from "./servicos/modelos.js";
import { criarPonteSgo } from "./servicos/ponteSgo.js";
import { FilaWebhook, cabecalhosParaLegado } from "./servicos/webhook.js";
import { ehPayloadZapi, servicoWhatsappPiloto, motivoBloqueio } from "./servicos/whatsappPiloto.js";
import { trocarLinksGoogle, trocarLinksNoValor } from "./servicos/links.js";
import { criarServicoImap, type ConectarImap } from "./servicos/emailImap.js";
import { garantirSegredoPonte } from "./servicos/segredoPonte.js";
import { criarEmailPessoal, type MotorEmail } from "./servicos/emailPessoal.js";
import { criarCofre } from "./servicos/cofre.js";
import { criarRetornoMeta } from "./servicos/whatsappRetorno.js";
import cookie from "@fastify/cookie";
import type { FastifyRequest } from "fastify";
import { WEB, lerDominios, sistemaDoHost, SISTEMA_PADRAO, FUNCOES_REPRESENTADA, PERFIL_REPRESENTADA, pareceSessaoSgo, perfilDaValidacao, pendenteDaValidacao, FUNCOES_TROCA_SENHA, MSG_TROCA_SENHA, COOKIE_APARELHO, APARELHO_DIAS, type DefinicaoWeb } from "./sistemas.js";

export interface Config {
  porta: number;
  host: string;
  urlPublica: string;
  pastaDados: string;
  pastaLegado: string;
  workers: number;
  limiteMs: number;
  emailSistema: string;
  databaseUrl?: string;
  /** Host → sistema (sgo.metrolabs.com.br → sgo, command.metrolabs.com.br → command); SISTEMAS_DOMINIOS acrescenta. */
  dominios: Record<string, string>;
  /** Outros sistemas com pool neste processo (ex.: command). Env: LEGADO_COMMAND (+ URL_PUBLICA_COMMAND, WORKERS_COMMAND). */
  outrosSistemas?: Record<string, { pastaLegado: string; urlPublica: string; workers?: number }>;
}

export function lerConfig(env = process.env): Config {
  const porta = Number(env.PORTA ?? 8080);
  return {
    porta,
    host: env.HOST ?? "127.0.0.1",
    urlPublica: (env.URL_PUBLICA ?? `http://localhost:${porta}`).replace(/\/$/, ""),
    pastaDados: resolve(env.PASTA_DADOS ?? "./dados"),
    pastaLegado: resolve(env.PASTA_LEGADO ?? "./legado"),
    workers: Number(env.WORKERS ?? Math.max(2, Math.min(8, availableParallelism() * 2))),
    limiteMs: Number(env.LIMITE_SEGUNDOS ?? 300) * 1000,
    emailSistema: env.EMAIL_SISTEMA ?? "sistema@metrolabs.com.br",
    databaseUrl: env.DATABASE_URL,
    dominios: lerDominios(env.SISTEMAS_DOMINIOS),
    outrosSistemas: Object.fromEntries(Object.keys(WEB).filter((s) => s !== SISTEMA_PADRAO && env[`LEGADO_${s.toUpperCase()}`]).map((s) => {
      const S = s.toUpperCase();
      return [s, {
        pastaLegado: resolve(env[`LEGADO_${S}`]!),
        urlPublica: (env[`URL_PUBLICA_${S}`] ?? `https://${s}.metrolabs.com.br`).replace(/\/$/, ""),
        workers: env[`WORKERS_${S}`] ? Number(env[`WORKERS_${S}`]) : undefined,
      }];
    })),
  };
}

/** Funções do legado do SGO+ que o navegador pode chamar (cada sistema tem a sua regra: sistemas.ts). */
export const podeChamar = WEB.sgo!.podeChamar;

/** Rotas que existem em todo sistema; as outras (/planilhas, /pastas, /_sgo/estado, /_sgo/segredos) são só do SGO+. */
const ROTAS_DE_TODO_SISTEMA = /^\/(?:$|\?|api\/run(?:$|\?)|ponte(?:$|\?)|webhook\/whatsapp(?:$|\?)|arquivos\/|agenda\/[^/?]+\.ics(?:$|\?)|_sgo\/google-script\.js(?:$|\?)|saude(?:$|\?))/;

/** Função do legado que monta o .ics da rota /agenda/<token>.ics (COMMAND, AgendaFeed.js) e o tempo do cache. */
export const FUNCAO_AGENDA_ICS = "cmdAgendaIcs_";
export const CACHE_ICS_MS = 5 * 60 * 1000;

/** Parâmetros que o servidor novo não repassa ao legado (rotas de diagnóstico que não foram portadas). */
const PARAMETROS_REMOVIDOS = ["diagAuvo"];

/** Um sistema com pool neste processo. */
interface SistemaVivo { def: DefinicaoWeb; pool: PoolLegado }

export interface App {
  app: FastifyInstance; pool: PoolLegado; db: Db; arquivos: ServicoArquivos;
  /** Pools por sistema ("sgo" sempre; "command" quando for trazido). */
  pools: Map<string, PoolLegado>;
  /** Fila do webhook do WhatsApp de cada sistema que tem a rota (não o SGO+). */
  filasWebhook: Map<string, FilaWebhook>;
  agendador: ReturnType<typeof criarAgendador>;
  encerrar(): Promise<void>;
}

/** Para os testes: troca a conexão IMAP real por um servidor falso. */
export interface OpcoesApp {
  conectarImap?: ConectarImap; motorEmail?: MotorEmail;
  /** 02/11/2026: só para ensaios e testes: responde chamadas HTTP do legado do SGO+ antes da rede (ex.: simulador da Meta no ensaio). */
  interceptarHttpSgo?: (p: { url: string; metodo: string; cabecalhos: Record<string, string>; corpo64?: string }) => Promise<{ codigo: number; cabecalhos: Record<string, string>; corpo64: string } | null>;
}

export async function criarApp(cfg: Config, opcoes: OpcoesApp = {}): Promise<App> {
  const db = await abrirDb({ url: cfg.databaseUrl, pasta: join(cfg.pastaDados, "pglite") });
  const arquivos = servicoArquivos(db, cfg.pastaDados);
  const log = (nivel: string, texto: string, origem?: string) => {
    if (nivel !== "info") void db.query("INSERT INTO registro (nivel, origem, texto) VALUES ($1, $2, $3)", [nivel, origem ?? null, texto.slice(0, 20000)]).catch(() => undefined);
    if (process.env.SGO_LOG_LEGADO || nivel !== "info") console.log(`[${nivel}] ${origem ?? ""} ${texto.slice(0, 500)}`);
  };
  const pdf = servicoPdf();
  // HTML que vira PDF: links do Drive apontam para o próprio servidor por dentro (o Chromium não passa pelo Caddy)
  const pdfDeHtml = (html: string) => pdf.deHtml(trocarLinksGoogle(html, `http://127.0.0.1:${cfg.porta}`));
  // caixa de e-mail do sistema por IMAP (GmailApp do legado): sistema@metrolabs.com.br, senha SMTP_SENHA
  const email = criarServicoImap({ db, log, conectar: opcoes.conectarImap });
  // e-mail integrado de cada colaborador (SGO_EMAIL do legado): senha cifrada com a chave do servidor (cofre.ts)
  const caixas = criarEmailPessoal({ db, cofre: criarCofre({ pastaDados: cfg.pastaDados }), log, motor: opcoes.motorEmail,
    lerArquivo: async (id) => { const a = await arquivos.lerParaRota(id); return a ? { nome: a.meta.nome, tipo: a.meta.tipo, base64: a.bytes.toString("base64") } : null; } });
  const base = { db, planilhas: servicoPlanilhas(db), arquivos, travas: new Travas(), cache: new CacheMemoria(), log, pdfDeHtml, email, caixas };
  // Templates Autoclave/Lavadora: atendem aqui as chamadas que o SGO+ fazia para os webapps deles no Google
  const modelos = criarModelos(join(cfg.pastaLegado, "..", "legado_modelos"), base, { urlPublica: cfg.urlPublica, emailSistema: cfg.emailSistema, limiteMs: cfg.limiteMs });
  const pool = new PoolLegado(
    { ...base, modelo: (url, corpo, tipo) => modelos.atender(url, corpo, tipo), interceptarHttp: opcoes.interceptarHttpSgo },
    { tamanho: cfg.workers, pastaLegado: cfg.pastaLegado, urlPublica: cfg.urlPublica, emailSistema: cfg.emailSistema, limiteMs: cfg.limiteMs, excluir: [], sistema: SISTEMA_PADRAO },
  );
  // sistemas com pool neste processo: o SGO+ sempre; os outros (COMMAND) quando a pasta do legado deles for configurada
  const sistemas = new Map<string, SistemaVivo & { urlPublica: string }>([[SISTEMA_PADRAO, { def: WEB[SISTEMA_PADRAO]!, pool, urlPublica: cfg.urlPublica }]]);
  for (const [nome, o] of Object.entries(cfg.outrosSistemas ?? {})) {
    const def = WEB[nome];
    if (!def || nome === SISTEMA_PADRAO) { log("erro", `sistema desconhecido na configuração: ${nome}`, "inicio"); continue; }
    // ponte para o SGO+ (COMMAND → SGO_PonteCommand.js): o UrlFetch para a URL da ponte vira o doPost do pool do SGO+, aqui dentro
    const ponte = criarPonteSgo({
      db, sistema: nome, urlPublicaSgo: cfg.urlPublica, log,
      extras: String(process.env.PONTE_SGO_URLS ?? "").split(",").map((x) => x.trim()).filter(Boolean),
      doPost: async (texto, tipo) => {
        const r = await pool.executar({ tipo: "doPost", evento: montarEvento("/ponte", { tipo, texto }), origem: "navegador" });
        return r.ok ? { ok: true as const, valor: r.valor } : { ok: false as const, erro: r.erro };
      },
    });
    const p = new PoolLegado({ ...base, interceptarHttp: (pedido) => ponte.atender(pedido) }, { tamanho: o.workers ?? cfg.workers, pastaLegado: o.pastaLegado, urlPublica: o.urlPublica, emailSistema: cfg.emailSistema, limiteMs: cfg.limiteMs, excluir: [], sistema: nome });
    sistemas.set(nome, { def, pool: p, urlPublica: o.urlPublica });
    // segredo da ponte: o mesmo valor nas duas pontas antes da primeira chamada (gera ou copia; nunca vai para o log)
    try { await garantirSegredoPonte(db, nome, log); } catch (e) { log("erro", `ponte ${nome} → SGO+: não garanti o segredo (${(e as Error).message})`, "ponte"); }
  }
  for (const [nome, s] of sistemas) {
    await s.pool.pronto();
    if (s.pool.info?.avisosCarga.length) for (const a of s.pool.info.avisosCarga) log("aviso", `${nome}: ${a}`, "carga");
  }
  // banco vazio em desenvolvimento: o próprio setupSGO do legado cria a estrutura (na virada, o banco vem convertido)
  if (process.env.SGO_PREPARAR === "1" && !(await db.query("SELECT 1 FROM propriedades WHERE escopo = 'script' AND chave = 'DB_ID'"))[0]) {
    const r = await pool.executar({ tipo: "executar", fn: "setupSGO", args: [], origem: "editor" });
    log(r.ok ? "aviso" : "erro", r.ok ? "banco de desenvolvimento criado pelo setupSGO" : `setupSGO falhou: ${r.erro}`, "preparar");
  }

  // gatilhos de tempo do legado (Conduta 06h, Auvo 30 min, Padrões...) — SGO_AGENDADOR=0 desliga (ensaios).
  // Cada gatilho roda no pool do sistema dele, com o evento do Apps Script (triggerUid...) e o dono como usuário ativo.
  const agendador = criarAgendador(db, async (funcao, ev, sistema) => {
    const s = sistemas.get(sistema);
    if (!s) return { ok: false, erro: `sistema ${sistema} sem pool neste servidor`, ms: 0 };
    const r = await s.pool.executar({ tipo: "executar", fn: funcao, args: [ev], origem: "gatilho" });
    return { ok: r.ok, erro: r.ok ? undefined : r.erro, ms: r.ms };
  }, log, { sistemas: () => [...sistemas.keys()] });
  // SGO_ENSAIO=1 (dados reais, Google ainda oficial): sem rotinas automáticas, sem envios para fora, faixa de aviso na tela
  const ensaio = process.env.SGO_ENSAIO === "1";
  if (ensaio) log("aviso", "MODO ENSAIO: rotinas automáticas desligadas e envios para fora bloqueados", "inicio");
  else if (process.env.SGO_AGENDADOR !== "0") agendador.iniciar();
  // rotinas de segundos (abertura automática da porta pela campainha): só chamam o legado com o sinal ligado no banco
  const rapidas = criarRotinasRapidas(db, async (funcao, sistema) => {
    const s = sistemas.get(sistema);
    if (!s) return { ok: false, erro: `sistema ${sistema} sem pool neste servidor`, ms: 0 };
    const r = await s.pool.executar({ tipo: "executar", fn: funcao, args: [], origem: "gatilho" });
    return { ok: r.ok, erro: r.ok ? undefined : r.erro, ms: r.ms };
  }, log);
  if (!ensaio && process.env.SGO_AGENDADOR !== "0") rapidas.iniciar();
  // 27/10/2026 (cota da Tuya esgotada às 07:45): eventos da Tuya pelo serviço de mensagens (a campainha e a posição dos portões
  // chegam sem gastar chamada) e a sentinela de infraestrutura a cada 5 min (servicos/tuyaMensagens.ts, servicos/sentinela.ts)
  const executarSgo = async (fn: string, args: unknown[]) => { const r = await pool.executar({ tipo: "executar", fn, args, origem: "gatilho" }); return { ok: r.ok, erro: r.ok ? undefined : r.erro }; };
  const mensagensTuya = criarTuyaMensagens({ db, log, aoEvento: async (devId) => { const r = await executarSgo("AutPred_aoEventoTuya", [devId]); if (!r.ok) log("erro", `evento da Tuya ${devId}: ${r.erro}`, "tuya-mensagens"); } });
  // 27/10/2026: ponte local dos portões (celular na rede da empresa, HTTPS de saída assinado; servicos/portoesLocais.ts).
  //   Sem PORTOES_LOCAL_SEGREDO no banco as rotas recusam (503) e o legado segue pela nuvem, exatamente como antes.
  const portoesLocais = criarPortoesLocais({ db, log, registrar: mensagensTuya.registrar,
    aoEvento: async (devId) => { const r = await executarSgo("AutPred_aoEventoTuya", [devId]); if (!r.ok) log("erro", `ponte local dos portões ${devId.slice(-4)}: ${r.erro}`, "portoes-locais"); } });
  if (!ensaio) portoesLocais.iniciar();
  // 01/11/2026: SGO+ Licitações — coletor do PNCP e do Compras.gov (servicos/licitacoes/coletor.ts). O laço confere a cada
  //   minuto a chave LIC_COLETOR_LIGADO (gravada pela tela) e a frequência; LIC_COLETOR=0 no ambiente desliga o laço.
  const coletorLic = criarColetorLicitacoes({ db, log, executarLegado: executarSgo });
  registrarColetor(coletorLic);
  if (!ensaio && process.env.SGO_AGENDADOR !== "0" && process.env.LIC_COLETOR !== "0") coletorLic.iniciar();
  // 02/11/2026 (etapa 2): arquivos do edital das candidatas e travadas, na mesma fila do coletor (1 chamada a cada 3 s no
  //   PNCP somando tudo). A rotina de 5 em 5 minutos lê as candidatas só com o coletor ligado; os pedidos da tela rodam
  //   sempre, em segundo plano. Arquivo novo ou mudado: o legado refaz a análise por IA se a base mudou (Lic_aposArquivos_).
  const arquivosLic = criarArquivosLicitacoes({ db, arquivos, cliente: coletorLic.cliente, log, pastaDados: cfg.pastaDados,
    aoMudar: async (chave) => { const r = await executarSgo("Lic_aposArquivos_", [{ chaves: [chave] }]); if (!r.ok) log("erro", `licitações: análise depois dos arquivos de ${chave}: ${r.erro}`, "licitacoes"); } });
  registrarArquivosLic(arquivosLic);
  if (!ensaio && process.env.SGO_AGENDADOR !== "0" && process.env.LIC_COLETOR !== "0")
    arquivosLic.iniciar(5 * 60_000, async () => (await coletorLic.situacao()).ligado);
  const sentinela = criarSentinela({ db, log, executarLegado: executarSgo, agendador, rapidas, mensagens: mensagensTuya, alarme: () => servicoIntelbras(db).saude(), portoes: portoesLocais,
    licitacoes: { situacao: () => coletorLic.situacao(), frequenciaMin: async () => Number((await coletorLic.lerCfg()).portais["PUB-001"]?.frequenciaMin) || 120 } });
  if (!ensaio && process.env.SGO_AGENDADOR !== "0") { if (process.env.TUYA_MENSAGENS !== "0") mensagensTuya.iniciar(); sentinela.iniciar(); }
  const carteiro = criarCarteiro(db, log);
  carteiro.iniciar();
  // verificação periódica das caixas de e-mail dos colaboradores (contador, balão e pendências); SGO_AGENDADOR=0 desliga
  //   EMAIL_VERIFICAR=1 liga mesmo com SGO_AGENDADOR=0 (ensaio local com servidor de e-mail falso)
  if (process.env.EMAIL_VERIFICAR === "1" || (process.env.SGO_AGENDADOR !== "0" && process.env.EMAIL_VERIFICAR !== "0")) caixas.iniciar();

  const limiteLogin = new LimiteLogin(), limitePedidos = new LimitePedidos();
  // só o Caddy (rede interna do Docker) e a própria máquina informam o IP real; de fora, X-Forwarded-For não vale
  // 29/10/2026: 72 MB (antes 60): o vídeo de até 50 MB do módulo Representação vai em base64 (cerca de 67 MB) pelo /api/run
  const app = Fastify({ logger: false, bodyLimit: 72 * 1024 * 1024, trustProxy: ["loopback", "uniquelocal"] });
  await app.register(cookie);

  /* Roteamento por domínio: o Host diz o sistema (sgo.metrolabs.com.br → sgo, command.metrolabs.com.br → command).
     Host desconhecido (localhost, IP, o Chromium dos PDFs em 127.0.0.1) é o SGO+, como sempre foi. */
  const nomeDoSistema = (req: FastifyRequest) => sistemaDoHost(req.host, cfg.dominios);
  const sistemaDe = (req: FastifyRequest) => sistemas.get(nomeDoSistema(req))!;   // o gancho abaixo garante que existe
  app.addHook("onRequest", async (req, rep) => {
    const nome = nomeDoSistema(req);
    if (nome === SISTEMA_PADRAO) return;
    const caminho = req.url;
    if (!ROTAS_DE_TODO_SISTEMA.test(caminho)) return rep.code(404).type("text/html; charset=utf-8").send(paginaErro("Página não encontrada.", nome));
    if (sistemas.has(nome)) return;
    // domínio já apontado para cá, mas o sistema ainda não foi trazido (o Caddy hoje responde isso sozinho)
    if (/^\/(api\/run|ponte|webhook\/whatsapp)(?:$|\?)/.test(caminho)) return rep.code(503).header("Retry-After", "3600").send({ ok: false, erro: "Sistema em preparação." });
    return rep.code(503).header("Retry-After", "3600").header("Cache-Control", "no-store").type("text/html; charset=utf-8").send(paginaPreparacao(nome));
  });

  // conferência da sessão no legado do sistema (cookie do sistema: sgo_sessao, cmd_sessao)
  const sessaoValidaEm = async (s: SistemaVivo, sessao: string) => {
    const r = await s.pool.executar({ tipo: "executar", fn: s.def.validarSessao.fn, args: [sessao] });
    return r.ok && s.def.validarSessao.valida(r.valor);
  };
  /* 29/10/2026 (módulo Representação): perfil de cada sessão do SGO+, guardado por 60 s (a conferência é no legado:
     validarSessao). A sessão REPRESENTADA só chama FUNCOES_REPRESENTADA e não abre /planilhas, /pastas nem arquivo
     que não seja anexo da própria representada. */
  /* 31/10/2026 (segurança do acesso): o mesmo cache guarda a pendência da sessão ("TROCA_SENHA" = a pessoa precisa criar
     a senha nova antes de qualquer outra coisa; validarSessao do legado devolve valid:false com pendente). */
  const perfis = new Map<string, { perfil: string; pendente: string; ate: number }>();
  const estadoDaSessao = async (sessao: string): Promise<{ perfil: string; pendente: string }> => {
    const agora = Date.now(), c = perfis.get(sessao);
    if (c && c.ate > agora) return c;
    const r = await pool.executar({ tipo: "executar", fn: "validarSessao", args: [sessao] });
    const perfil = r.ok ? perfilDaValidacao(r.valor) : "", pendente = r.ok ? pendenteDaValidacao(r.valor) : "";
    if (perfis.size > 20000) for (const [k, v] of perfis) if (v.ate <= agora) perfis.delete(k);
    perfis.set(sessao, { perfil, pendente, ate: agora + 60_000 });
    return { perfil, pendente };
  };
  const perfilDaSessao = async (sessao: string): Promise<string> => (await estadoDaSessao(sessao)).perfil;
  const sessaoValida = async (sessao: string) => (await sessaoValidaEm(sistemas.get(SISTEMA_PADRAO)!, sessao)) && (await perfilDaSessao(sessao)) !== PERFIL_REPRESENTADA;
  // só do SGO+ (o gancho acima barra estas rotas nos outros domínios)
  rotasDocumentos(app, db, arquivos, { sessaoValida, pdfDeHtml });
  // aplicativo do técnico de campo (SGO+ Campo: instalável, funciona sem internet), servicos/campo.ts
  rotasCampo(app);
  // orçamento do chamado para o cliente responder por link, sem login (Assistência técnica, etapa 4), servicos/orcamentoPublico.ts
  rotasOrcamento(app, { executar: (fn, args) => sistemas.get(SISTEMA_PADRAO)!.pool.executar({ tipo: "executar", fn, args, origem: "navegador" }), log });
  rotasOrcamento(app, {
    prefixo: "/assinar-proposta/",
    funcoes: { ver: "ComP_assinaturaVer_", responder: "ComP_assinaturaResponder_", pdf: "ComP_assinaturaPdf_" },
    executar: (fn, args) => sistemas.get(SISTEMA_PADRAO)!.pool.executar({ tipo: "executar", fn, args, origem: "navegador" }),
    log,
  });
  const shim = readFileSync(fileURLToPath(new URL("./publico/google-script.js", import.meta.url)), "utf8");

  app.get("/_sgo/google-script.js", async (_req, rep) => rep.type("application/javascript; charset=utf-8").header("Cache-Control", "no-cache").send(shim));
  const popsCadeiaFria = new Set(["refrigerador.pdf", "vacinas.pdf", "camara-fria.pdf", "freezer.pdf", "ultrafreezer.pdf", "caixa-termica.pdf"]);
  app.get<{ Params: { arquivo: string } }>("/cadeia-fria/pop/:arquivo", async (req, rep) => {
    const { arquivo } = req.params;
    if (nomeDoSistema(req) !== SISTEMA_PADRAO || !popsCadeiaFria.has(arquivo)) return rep.code(404).send();
    const pdf = readFileSync(new URL("./publico/pop-cadeia-fria/" + arquivo, import.meta.url));
    return rep.type("application/pdf").header("Content-Disposition", 'inline; filename="' + arquivo + '"').send(pdf);
  });
  const ehAdmin = async (sessao: string) => { const r = await pool.executar({ tipo: "executar", fn: "isAdminSession", args: [sessao] }); return r.ok && r.valor === true; };
  rotasEstado(app, db, ehAdmin);
  // 10/11/2026: gravar chaves e senhas é só do dono do sistema (mesma regra da tela Chaves e senhas, que registra a tentativa recusada)
  const ehDono = async (sessao: string) => { const r = await pool.executar({ tipo: "executar", fn: "Chaves_exigirDono_", args: [sessao] }); return r.ok === true; };
  rotasSegredos(app, db, ehDono);
  rotasFinanceiro(app, db, async (req, sessao) => {
    if (nomeDoSistema(req) !== SISTEMA_PADRAO || !pareceSessaoSgo(sessao)) return "";
    const r = await pool.executar({ tipo: "executar", fn: "validarSessao", args: [sessao] });
    if (!r.ok || !["ADMIN", "DIRETORIA", "FINANCEIRO"].includes(perfilDaValidacao(r.valor))) return "";
    const dados = (r.valor as { data?: { usuario?: string; userId?: string } }).data;
    return String(dados?.usuario || dados?.userId || "");
  });

  await portoesLocais.rotas(app);
  app.get("/saude", async (req) => { const s = sistemaDe(req); return { ok: true, sistema: s.def.sistema, workers: cfg.workers, arquivos: s.pool.info?.arquivos }; });

  const evento = montarEvento;

  /** Saída do legado → resposta HTTP. HTML ganha o google.script.run do servidor e o título. */
  const responder = (rep: any, saida: any, urlPublica = cfg.urlPublica) => {
    if (saida?.tipo === "html") {
      let html: string = trocarLinksGoogle(saida.conteudo ?? "", urlPublica);
      // viewport: uma só — a da própria página, senão a do addMetaTag do legado, senão a padrão (largura do aparelho)
      const vpLegado = (saida.metas ?? []).find(([n]: [string]) => n === "viewport")?.[1];
      const temViewport = /<meta[^>]+name=["']?viewport/i.test(html);
      const cabeca = `<meta charset="utf-8">` + (temViewport ? "" : `<meta name="viewport" content="${esc(vpLegado || "width=device-width, initial-scale=1, viewport-fit=cover")}">`) +
        (saida.metas ?? []).filter(([n]: [string]) => n !== "viewport").map(([n, v]: [string, string]) => `<meta name="${esc(n)}" content="${esc(v)}">`).join("") +
        (saida.titulo ? `<title>${esc(saida.titulo)}</title>` : "") + `<script src="/_sgo/google-script.js"></script>` + (ensaio ? FAIXA_ENSAIO : "");
      html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + cabeca) : `<!DOCTYPE html><html><head>${cabeca}</head><body>${html}</body></html>`;
      return rep.type("text/html; charset=utf-8").header("Cache-Control", "no-store").header("X-Frame-Options", saida.xframe === "ALLOWALL" ? undefined : "SAMEORIGIN").send(html);
    }
    return rep.type(`${saida?.mime ?? "text/plain"}; charset=utf-8`).header("Cache-Control", "no-store").send(saida?.conteudo ?? "");
  };

  // navegador = usuário anônimo (origem "navegador": Session.getActiveUser().getEmail() === "")
  app.get("/", async (req, rep) => {
    const s = sistemaDe(req);
    const r = await s.pool.executar({ tipo: "doGet", evento: evento(req.url), origem: "navegador" });
    if (!r.ok) { log("erro", `${s.def.sistema} doGet: ${r.erro}\n${r.pilha ?? ""}`, "http"); return rep.code(500).type("text/html; charset=utf-8").send(paginaErro(r.erro, s.def.sistema)); }
    return responder(rep, r.valor, s.urlPublica);
  });

  app.addContentTypeParser(["text/plain", "application/x-www-form-urlencoded"], { parseAs: "string" }, (_req, corpo, feito) => feito(null, corpo));
  app.post("/ponte", async (req, rep) => {
    const texto = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
    const s = sistemaDe(req);
    const r = await s.pool.executar({ tipo: "doPost", evento: evento(req.url, { tipo: String(req.headers["content-type"] ?? "text/plain").split(";")[0]!, texto }), origem: "navegador" });
    if (!r.ok) { log("erro", `${s.def.sistema} doPost: ${r.erro}`, "http"); return rep.code(500).send({ ok: false, erro: "Falha interna." }); }
    return responder(rep, r.valor, s.urlPublica);
  });

  /* Webhook do WhatsApp (Z-API / Meta) — só nos sistemas que não são o SGO+ (o SGO+ não tem rota de entrada própria).
     Corpo cru (sem converter JSON): a assinatura X-Hub-Signature-256 da Meta é calculada sobre os bytes exatos.
     02/11/2026: o webhook do número do sistema está na rota do COMMAND; os status (sent, delivered, read, failed) e as respostas
     a uma mensagem também são repassados ao SGO+ (avisos da gestão e alertas de licitação), só com assinatura ou segredo válido,
     numa fila própria (o COMMAND recebe o mesmo corpo, como antes). */
  const filasWebhook = new Map<string, FilaWebhook>();
  for (const nome of sistemas.keys()) if (nome !== SISTEMA_PADRAO) filasWebhook.set(nome, new FilaWebhook(2000, log));
  const filaRetornoSgo = new FilaWebhook(2000, log);
  if (sistemas.has("command")) filasWebhook.set("retorno-sgo", filaRetornoSgo);
  const retornoMeta = criarRetornoMeta({ db, log, executar: executarSgo, sistemaRota: "command" });
  await app.register(async (sub) => {
    sub.removeAllContentTypeParsers();
    sub.addContentTypeParser("*", { parseAs: "string" }, (_req, corpo, feito) => feito(null, corpo));
    const doSistema = (req: FastifyRequest) => { const nome = nomeDoSistema(req); return nome === SISTEMA_PADRAO ? null : sistemas.get(nome) ?? null; };
    sub.post("/webhook/whatsapp", async (req, rep) => {
      const s = doSistema(req), fila = s && filasWebhook.get(s.def.sistema);
      if (!s || !fila) return rep.code(404).send({ ok: false, erro: "Rota não encontrada." });
      const texto = typeof req.body === "string" ? req.body : "";
      // 21/10/2026: Z-API fora (piloto do WhatsApp ou provedor meta): evento com o formato da Z-API não chega ao legado —
      // não vira entrada na Caixa de Entrada, não vai ao bate-papo nem à IA. Registro mínimo, sem o conteúdo.
      if (ehPayloadZapi(texto)) {
        const cfgPiloto = await servicoWhatsappPiloto(db).lerCfg().catch(() => null);
        if (!cfgPiloto || motivoBloqueio({ provedor: "zapi", destino: "", modelo: "" }, cfgPiloto)) {
          log("aviso", `${s.def.sistema} webhook: evento da Z-API ignorado (Z-API desligada; o WhatsApp do sistema é o oficial)`, "webhook");
          return rep.code(200).send({ ok: true });
        }
      }
      if (s.def.sistema === "command" && texto.indexOf("\"entry\"") >= 0) {
        const q = (req.query ?? {}) as Record<string, unknown>, assinatura = req.headers["x-hub-signature-256"];
        filaRetornoSgo.colocar(async () => { await retornoMeta.repassar(texto, q.wh, assinatura); });
      }
      const ev = montarEvento(req.url, { tipo: String(req.headers["content-type"] ?? "text/plain").split(";")[0]!.trim(), texto }, cabecalhosParaLegado(req.headers));
      const aceito = fila.colocar(async () => {
        const r = await s.pool.executar({ tipo: "doPost", evento: ev, origem: "navegador" });
        if (!r.ok) log("erro", `${s.def.sistema} webhook doPost: ${r.erro}`, "webhook");
      });
      if (!aceito) { log("aviso", `${s.def.sistema} webhook: fila cheia, evento recusado (o provedor reenvia)`, "webhook"); return rep.code(503).header("Retry-After", "30").send({ ok: false, erro: "Ocupado." }); }
      return rep.code(200).send({ ok: true });
    });
    sub.get("/webhook/whatsapp", async (req, rep) => {
      const s = doSistema(req);
      if (!s) return rep.code(404).send({ ok: false, erro: "Rota não encontrada." });
      const r = await s.pool.executar({ tipo: "doGet", evento: montarEvento(req.url, undefined, cabecalhosParaLegado(req.headers)), origem: "navegador" });
      if (!r.ok) { log("erro", `${s.def.sistema} webhook doGet: ${r.erro}`, "webhook"); return rep.code(500).send({ ok: false, erro: "Falha interna." }); }
      return responder(rep, r.valor, s.urlPublica);
    });
  });

  /** Pedidos recentes do navegador (10 min), para a repetição automática não executar duas vezes. */
  const pedidosRecentes = new Map<string, { em: number; p: Promise<any> }>();
  const guardarPedido = (chave: string, p: Promise<any>) => {
    const agora = Date.now();
    if (pedidosRecentes.size > 5000) for (const [k, v] of pedidosRecentes) if (agora - v.em > 10 * 60_000 || pedidosRecentes.size > 4000) pedidosRecentes.delete(k); else break;
    pedidosRecentes.set(chave, { em: agora, p });
    setTimeout(() => pedidosRecentes.delete(chave), 10 * 60_000).unref?.();
  };

  app.post("/api/run", async (req, rep) => {
    const s = sistemaDe(req), def = s.def;
    const corpo = req.body as { fn?: unknown; args?: unknown };
    if (!def.podeChamar(corpo?.fn)) return rep.code(403).send({ ok: false, erro: "Função não permitida." });
    const args = Array.isArray(corpo.args) ? corpo.args.slice() : [];
    const cookies = (req.cookies as Record<string, string | undefined> | undefined) ?? {};
    // 31/10/2026 (segurança do acesso): o argumento de contexto do login, do código e da troca de senha é sempre o do
    // servidor (IP real, navegador e o cookie HttpOnly do aparelho confiado); o que o navegador mandar nele é descartado.
    const aparelhos = String(cookies[COOKIE_APARELHO] ?? "").slice(0, 520).split(".")
      .filter((token) => /^[0-9a-f]{64}$/.test(token)).slice(0, 8);
    const posCtx = def.contexto?.[corpo.fn];
    if (posCtx !== undefined) {
      args.length = Math.min(args.length, posCtx);
      while (args.length < posCtx) args.push(null);
      args[posCtx] = { ip: req.ip, agente: String(req.headers["user-agent"] ?? "").slice(0, 200), aparelho: aparelhos.join(".") };
    }
    // login e senhas de modo administrador: freio contra adivinhação (só tentativas erradas contam)
    // 29/10/2026: sessão REPRESENTADA (no 1º argumento ou no cookie) só chama as funções do módulo Representação
    if (def.sistema === SISTEMA_PADRAO && !FUNCOES_REPRESENTADA.has(corpo.fn)) {
      const cookieSessao = cookies[def.cookie] ?? "";
      for (const sid of [args[0], cookieSessao]) {
        if (!pareceSessaoSgo(sid)) continue;
        if ((await perfilDaSessao(sid)) === PERFIL_REPRESENTADA) {
          log("aviso", `${corpo.fn} recusada: sessão de representada (${req.ip})`, "seguranca");
          return rep.code(403).send({ ok: false, erro: "Função não permitida para o perfil Representada: este usuário usa só o módulo Representação." });
        }
      }
    }
    // 31/10/2026 (pedido do dono): sessão com troca de senha pendente só chama a troca e o básico da sessão. Vale a sessão
    // do pedido (1º argumento, ou o sessionId dentro dele); sem sessão no pedido, a do cookie. O legado também recusa.
    if (def.sistema === SISTEMA_PADRAO && !FUNCOES_TROCA_SENHA.has(corpo.fn)) {
      const a0 = args[0] as any, doPedido = [a0, a0 && typeof a0 === "object" ? a0.sessionId : undefined].find(pareceSessaoSgo);
      const sid = doPedido ?? (pareceSessaoSgo(cookies[def.cookie]) ? cookies[def.cookie] : undefined);
      if (sid && (await estadoDaSessao(sid)).pendente === "TROCA_SENHA") {
        log("aviso", `${corpo.fn} recusada: sessão com troca de senha pendente (${req.ip})`, "seguranca");
        return rep.code(403).send({ ok: false, erro: MSG_TROCA_SENHA, trocaSenha: true });
      }
    }
    const comSenha = def.comSenha(corpo.fn);
    const quem = (def.sistema === SISTEMA_PADRAO ? "" : def.sistema + ":") + (corpo.fn === def.login.fn ? def.login.quem(args) : def.quemDoFreio?.(corpo.fn, args) ?? corpo.fn);
    if (comSenha) {
      const espera = limiteLogin.bloqueio(req.ip, quem);
      if (espera) { log("aviso", `${def.sistema} ${corpo.fn} travado por excesso de erros (${req.ip})`, "seguranca"); return rep.code(429).send({ ok: false, erro: espera }); }
    }
    // 31/10/2026 ("esqueci minha senha"): pedidos que mandam e-mail ou código têm limite por conexão (1 hora). Repetição
    // automática do mesmo pedido (x-pedido-id) não conta duas vezes.
    const maxPedidos = def.limitePedidos?.[corpo.fn];
    if (maxPedidos && !(pedidosRecentes.has(`${def.sistema}|${String(req.headers["x-pedido-id"] ?? "")}|${String(corpo.fn)}`))) {
      const espera = limitePedidos.pedir(req.ip, `${def.sistema}:${corpo.fn}`, maxPedidos);
      if (espera) { log("aviso", `${def.sistema} ${corpo.fn} recusado: limite de pedidos por conexão (${req.ip})`, "seguranca"); return rep.code(429).send({ ok: false, erro: espera }); }
    }
    // Mesmo pedido de novo (o navegador repete sozinho quando a conexão cai antes da resposta chegar): não executa
    // de novo — devolve o resultado da primeira vez (ou espera ela terminar). Evita retirada/registro em dobro e o
    // "já foi registrado" para quem só perdeu a resposta. Chave: sistema + número do pedido (aleatório, do navegador).
    const idPedido = String(req.headers["x-pedido-id"] ?? "");
    const chavePedido = /^[A-Za-z0-9-]{16,64}$/.test(idPedido) ? `${def.sistema}|${idPedido}|${String(corpo.fn)}` : "";
    const anterior = chavePedido ? pedidosRecentes.get(chavePedido) : undefined;
    if (anterior) log("info", `${corpo.fn}: pedido repetido pelo navegador, devolvido o resultado da primeira vez`, "repeticao");
    const execucao = anterior?.p ?? s.pool.executar({ tipo: "executar", fn: corpo.fn, args, origem: "navegador" });
    if (chavePedido && !anterior) guardarPedido(chavePedido, execucao);
    const r = await execucao;
    let avisoRestantes = "";
    if (comSenha && !anterior) {
      const v = r.ok ? (r.valor as { success?: unknown; ok?: unknown; message?: unknown } | null) : null;
      const certo = r.ok && v?.success !== false && v?.ok !== false;
      limiteLogin.registrar(req.ip, quem, certo);
      // 31/10/2026: senha errada no login avisa quantas tentativas faltam antes do bloqueio temporário
      if (!certo && corpo.fn === def.login.fn && /inv[aá]lid/i.test(String(v?.message ?? ""))) {
        const n = limiteLogin.restantes(req.ip, quem);
        if (n > 0 && n <= 3) avisoRestantes = ` Restam ${n} tentativa${n > 1 ? "s" : ""} antes do bloqueio temporário de 15 minutos. Se esqueceu a senha, toque em \"Esqueci minha senha\": o link vai para o seu e-mail.`;
        else if (n === 0) avisoRestantes = " Por segurança, novas tentativas ficam bloqueadas por 15 minutos. Se esqueceu a senha, toque em \"Esqueci minha senha\": o link vai para o seu e-mail.";
      }
    }
    if (r.ms > 2000) log("aviso", `${corpo.fn} levou ${Math.round(r.ms)} ms`, "lento");
    if (!r.ok) {
      if (!/NaoImplementado/.test(r.nome ?? "")) log("erro", `${corpo.fn}: ${r.erro}\n${r.pilha ?? ""}`, "api");
      else log("aviso", `${corpo.fn}: ${r.erro}`, "nao-implementado");
      return rep.send({ ok: false, erro: r.erro, nome: r.nome });
    }
    // login/logout: cookie de sessão do sistema (sgo_sessao, cmd_sessao) para as páginas que o navegador abre direto
    // (/arquivos, /planilhas, /pastas). Sem Domain: cada cookie fica só no domínio do próprio sistema.
    const sessao = corpo.fn === def.login.fn ? def.login.sessao(r.valor) : def.criamSessao?.[corpo.fn]?.(r.valor) ?? null;
    if (sessao && def.sistema === SISTEMA_PADRAO) perfis.set(sessao, { perfil: String((r.valor as any)?.user?.perfil ?? "").trim().toUpperCase(), pendente: (r.valor as any)?.etapa === "TROCAR_SENHA" ? "TROCA_SENHA" : "", ate: Date.now() + 60_000 });
    if ((corpo.fn === def.logout || corpo.fn === "trocarSenhaAcesso") && typeof args[0] === "string") perfis.delete(args[0]);
    if (sessao) rep.setCookie(def.cookie, sessao, { path: "/", httpOnly: true, sameSite: "lax", secure: s.urlPublica.startsWith("https://"), maxAge: 60 * 60 * 24 });
    if (corpo.fn === def.logout) rep.clearCookie(def.cookie, { path: "/" });
    let valor: any = r.valor;
    // 31/10/2026: aparelho confiado por 30 dias — o token vai só no cookie HttpOnly (nunca na resposta ao navegador)
    if (posCtx !== undefined && valor && typeof valor === "object" && !Array.isArray(valor) && ("aparelhoToken" in valor || "limparAparelho" in valor)) {
      const { aparelhoToken, limparAparelho, ...resto } = valor;
      if (typeof aparelhoToken === "string" && /^[0-9a-f]{64}$/.test(aparelhoToken))
        rep.setCookie(COOKIE_APARELHO, [...new Set([aparelhoToken, ...aparelhos])].slice(0, 8).join("."), { path: "/", httpOnly: true, sameSite: "strict", secure: s.urlPublica.startsWith("https://"), maxAge: APARELHO_DIAS * 86400 });
      else if (limparAparelho === true) rep.clearCookie(COOKIE_APARELHO, { path: "/" });
      valor = resto;
    }
    if (avisoRestantes && valor && typeof valor === "object") valor = { ...valor, message: String(valor.message ?? "") + avisoRestantes };
    return rep.send({ ok: true, valor: trocarLinksNoValor(valor, s.urlPublica) });
  });

  /* Agenda por assinatura (Google Agenda "Por URL", iPhone "Calendário assinado", Outlook "Da internet"): pública pelo token.
     Cache curto por sistema+token (o celular consulta de tempos em tempos; "Gerar novo link" vale em até 5 min). */
  const cacheIcs = new Map<string, { ate: number; corpo: string | null }>();
  app.get("/agenda/:arquivo", async (req, rep) => {
    const nome = nomeDoSistema(req), s = sistemas.get(nome);
    const naoAchou = () => rep.code(404).type("text/plain; charset=utf-8").header("Cache-Control", "no-store")
      .send("Link de agenda inválido ou trocado. Abra o METROLABS COMMAND → Agenda → Assinar minha agenda no celular e assine de novo com o link atual.");
    const m = /^([A-Za-z0-9]{32,80})\.ics$/.exec(String((req.params as { arquivo?: string }).arquivo ?? ""));
    if (!s || nome === SISTEMA_PADRAO || !m) return naoAchou();
    const chave = `${nome}|${m[1]}`, agora = Date.now();
    let item = cacheIcs.get(chave);
    if (!item || item.ate < agora) {
      const r = await s.pool.executar({ tipo: "executar", fn: FUNCAO_AGENDA_ICS, args: [m[1]], origem: "navegador" });
      if (!r.ok) {
        log("erro", `${nome} agenda .ics: ${r.erro}`, "agenda");
        return rep.code(503).header("Retry-After", "300").type("text/plain; charset=utf-8").send("Agenda indisponível agora. O celular tenta de novo sozinho mais tarde.");
      }
      item = { ate: agora + CACHE_ICS_MS, corpo: typeof r.valor === "string" && r.valor ? r.valor : null };
      if (cacheIcs.size > 5000) for (const [k, v] of cacheIcs) if (v.ate < agora) cacheIcs.delete(k);
      cacheIcs.set(chave, item);
    }
    if (item.corpo === null) return naoAchou();
    return rep.type("text/calendar; charset=utf-8").header("Content-Disposition", 'inline; filename="agenda-command.ics"')
      .header("Cache-Control", `private, max-age=${Math.round(CACHE_ICS_MS / 1000)}`).header("X-Robots-Tag", "noindex").send(item.corpo);
  });

  // 02/11/2026 (revisão): regra de guarda das licitações NO PROCESSO PRINCIPAL (mesma trava do legado que a sincronização
  //   usa; coletor e arquivos pausados). Só por dentro do servidor: a manutenção semanal chama de dentro do contêiner.
  //   Revisão: endereço do socket em loopback (não req.ip) E o token de <dados>/interno.token (gerado aqui se faltar).
  const tokenInterno = garantirTokenInterno(cfg.pastaDados);
  app.post("/interno/licitacoes/guarda", async (req, rep) => {
    if (!acessoInternoPermitido(req.socket.remoteAddress, req.headers[CABECALHO_TOKEN_INTERNO], tokenInterno))
      return rep.code(403).header("Cache-Control", "no-store").send({ ok: false, texto: "Só por dentro do servidor, com o token interno." });
    const previa = String((req.query as Record<string, string>)?.previa ?? "") === "1";
    const r = await executarGuarda({ db, previa, pastaDados: cfg.pastaDados, pausaveis: [coletorLic, arquivosLic],
      executarLegado: async (fn, args) => { const x = await pool.executar({ tipo: "executar", fn, args, origem: "gatilho" }); return { ok: x.ok, valor: x.ok ? x.valor : undefined, erro: x.ok ? undefined : x.erro }; } });
    return rep.header("Cache-Control", "no-store").send(r);
  });

  app.get("/arquivos/:id", async (req, rep) => {
    const { id } = req.params as { id: string };
    const sv = sistemaDe(req);
    const a = await arquivos.lerParaRota(id);
    if (!a && arquivoRestrito(await arquivos.arquivo({ id })))
      return rep.code(403).type("text/html; charset=utf-8").header("Cache-Control", "no-store").send(paginaErro("Este arquivo só abre dentro do sistema, para quem tem acesso a ele. Por quê: ele não pode circular por link (por exemplo, imagem do bate-papo, que só quem é da conversa vê). O que fazer: entre no sistema e abra pelo lugar onde ele foi enviado, como a conversa no balão de conversas.", sv.def.sistema));
    if (!a) return rep.code(404).type("text/html; charset=utf-8").send(paginaErro("Arquivo não encontrado.", sv.def.sistema));
    // como no Drive: "qualquer pessoa com o link" abre direto; o resto só com login (ou pelo próprio servidor, ex. PDF)
    const publico = /^ANYONE/.test(String(a.meta.compartilhamento ?? ""));
    const interno = req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1";
    if (!publico && !interno) {
      const s = (req.cookies as Record<string, string | undefined>)?.[sv.def.cookie] ?? "";
      const valida = !!s && (await sessaoValidaEm(sv, s));
      // 29/10/2026: a sessão REPRESENTADA só abre o anexo que é da própria representada (o legado confere)
      if (valida && sv.def.sistema === SISTEMA_PADRAO && (await perfilDaSessao(s)) === PERFIL_REPRESENTADA) {
        const pr = await pool.executar({ tipo: "executar", fn: "Representacao_arquivoPermitido_", args: [s, id] });
        if (!(pr.ok && pr.valor === true)) return rep.code(403).type("text/html; charset=utf-8").header("Cache-Control", "no-store").send(paginaErro("Este arquivo não está entre os da sua empresa. Por quê: o seu usuário de representada só abre os arquivos dos pedidos e chamados da sua empresa. O que fazer: abra pelo módulo Representação, na ficha do chamado; se precisar de outro documento, peça à Metrolabs pela conversa.", sv.def.sistema));
      }
      // 30/10/2026: a sessão CLIENTE só abre documento da Representação se for a versão do cliente dele (os demais arquivos seguem a regra de sempre)
      // 31/10/2026: a mesma conferência cobre os relatórios do ciclo da lavadora (o legado consulta LavCic_arquivoClientePermitido_): só os das lavadoras do cliente
      if (valida && sv.def.sistema === SISTEMA_PADRAO && (await perfilDaSessao(s)) === "CLIENTE") {
        const pr = await pool.executar({ tipo: "executar", fn: "Representacao_arquivoClientePermitido_", args: [s, id] });
        if (!(pr.ok && pr.valor === true)) return rep.code(403).type("text/html; charset=utf-8").header("Cache-Control", "no-store").send(paginaErro("Este documento não está entre os da sua empresa. Por quê: o seu usuário de cliente só abre os relatórios dos seus próprios chamados e dos ciclos das lavadoras da sua empresa. O que fazer: abra pela tela Meus chamados (em Documentos) ou pela tela Relatórios de ciclo; se precisar de outro documento, peça à Metrolabs.", sv.def.sistema));
      }
      if (!valida)
        return rep.code(401).type("text/html; charset=utf-8").send(paginaErro(`Este arquivo é interno da Metrolabs. Entre no ${NOMES[sv.def.sistema] ?? "sistema"} com o seu usuário e abra o link de novo (pode usar o mesmo botão que trouxe você até aqui).`, sv.def.sistema));
    }
    const baixar = "baixar" in (req.query as object);
    return rep.type(a.meta.tipo === "application/vnd.google-apps.document" ? "text/html; charset=utf-8" : a.meta.tipo).header("Content-Disposition", `${baixar ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(a.meta.nome)}`).header("Cache-Control", "private, max-age=300").send(a.bytes);
  });

  const pools = new Map([...sistemas].map(([n, s]) => [n, s.pool]));
  return {
    app, pool, pools, filasWebhook, db, arquivos, agendador,
    encerrar: async () => { agendador.parar(); rapidas.parar(); sentinela.parar(); coletorLic.parar(); registrarColetor(null); arquivosLic.parar(); registrarArquivosLic(null); mensagensTuya.parar(); portoesLocais.parar(); carteiro.parar(); await app.close(); for (const f of filasWebhook.values()) await f.ocioso(); for (const p of pools.values()) await p.encerrar(); await modelos.encerrar(); await email.encerrar(); await caixas.encerrar(); await pdf.fechar(); await db.fechar(); },
  };
}

const NOMES: Record<string, string> = { sgo: "SGO+", command: "METROLABS COMMAND" };

/**
 * Evento do doGet/doPost como o do Apps Script (parameter, parameters, queryString, postData...).
 * `cabecalhos` (só no webhook) vai em e.headers — o Apps Script não tem isso; serve para o legado conferir
 * X-Hub-Signature-256 da Meta sobre o corpo cru (e.postData.contents é o corpo exatamente como chegou).
 */
function montarEvento(url: string, corpo?: { tipo: string; texto: string }, cabecalhos?: Record<string, string>) {
  const q = new URL(url, "http://x").searchParams, parameter: Record<string, string> = {}, parameters: Record<string, string[]> = {};
  q.forEach((v, k) => { if (PARAMETROS_REMOVIDOS.includes(k)) return; if (!(k in parameter)) parameter[k] = v; (parameters[k] ??= []).push(v); });
  return {
    parameter, parameters, queryString: [...q].filter(([k]) => !PARAMETROS_REMOVIDOS.includes(k)).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&"),
    contextPath: "", pathInfo: "", contentLength: corpo ? Buffer.byteLength(corpo.texto) : -1,
    ...(corpo ? { postData: { contents: corpo.texto, length: Buffer.byteLength(corpo.texto), type: corpo.tipo, name: "postData" } } : {}),
    ...(cabecalhos ? { headers: cabecalhos } : {}),
  };
}

const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const FAIXA_ENSAIO = `<script>addEventListener("DOMContentLoaded",function(){if(window.top!==window)return;var d=document.createElement("div");d.textContent="AMBIENTE DE ENSAIO — o SGO+ oficial continua sendo o do Google. O que for lançado aqui será descartado na troca.";d.style.cssText="position:fixed;left:0;right:0;bottom:0;z-index:2147483647;background:#b45309;color:#fff;font:600 13px system-ui;padding:6px 12px;text-align:center;pointer-events:none";document.body.appendChild(d)});</script>`;
const paginaErro = (msg: string, sistema = SISTEMA_PADRAO) => { const n = esc(NOMES[sistema] ?? sistema); return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${n}</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:system-ui;padding:24px;background:#111827;color:#e5e7eb"><h2>${n}</h2><p>${esc(msg)}</p></body></html>`; };
/** Domínio de um sistema que ainda não foi trazido para o servidor. */
const paginaPreparacao = (sistema: string) => paginaErro("Sistema em preparação. Ele ainda está sendo trazido para este servidor; enquanto isso, continue usando o endereço de sempre.", sistema);

/* início direto: node dist/servidor.js (ou npm run dev) */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cfg = lerConfig();
  const t0 = Date.now();
  const { app, encerrar } = await criarApp(cfg);
  await app.listen({ port: cfg.porta, host: cfg.host });
  console.log(`SGO+ servidor em ${cfg.urlPublica} (${cfg.workers} workers, pronto em ${Date.now() - t0} ms)`);
  const sair = async () => { await encerrar(); process.exit(0); };
  process.on("SIGINT", sair); process.on("SIGTERM", sair);
}
