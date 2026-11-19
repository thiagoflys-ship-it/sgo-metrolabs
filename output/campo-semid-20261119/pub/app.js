/*
 * SGO+ Campo: aplicativo do técnico de campo (telas). Funciona sem internet:
 *   - as telas ficam guardadas pelo service worker (sw.js);
 *   - as O.S., o que o técnico fez e a fila de envio ficam no aparelho (banco.js, IndexedDB);
 *   - a fila (fila.js) sobe sozinha quando há sinal, em ordem, sem registrar duas vezes (idLocal + X-Pedido-Id).
 * Contrato: login / validarSessao / logout do SGO+ e Ast_appMeuDia, Ast_appSincronizar, Ast_appEnviarFoto
 * (docs/API_APP_TECNICO.md do SGO+, versão 1).
 */
import * as B from "./banco.js";
import { criarFila, ErroRede, ehSessaoExpirada, novoIdLocal } from "./fila.js";
import * as R from "./regras.js";

const VERSAO = document.documentElement.dataset.versao || "";
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const doisDig = (n) => String(n).padStart(2, "0");
const diaISO = (d) => d.getFullYear() + "-" + doisDig(d.getMonth() + 1) + "-" + doisDig(d.getDate());
const hojeISO = () => diaISO(new Date());
const amanhaISO = () => { const d = new Date(); d.setDate(d.getDate() + 1); return diaISO(d); };
const hora = (iso) => { if (!iso) return ""; if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(iso)) return iso.slice(11, 16); const d = new Date(iso); return isNaN(d) ? "" : doisDig(d.getHours()) + ":" + doisDig(d.getMinutes()); };
const dataHora = (iso) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d) ? "" : doisDig(d.getDate()) + "/" + doisDig(d.getMonth() + 1) + " " + hora(iso); };
const carimboAgora = () => { const d = new Date(); return doisDig(d.getDate()) + "/" + doisDig(d.getMonth() + 1) + "/" + d.getFullYear() + " " + doisDig(d.getHours()) + ":" + doisDig(d.getMinutes()); };
const diaBR = (dia) => (dia ? dia.slice(8, 10) + "/" + dia.slice(5, 7) + "/" + dia.slice(0, 4) : "");
const letras = (s) => String(s || "").replace(/[^A-Za-zÀ-ÿ]/g, "").length;

const NOMES_TIPO = { ATV_SITUACAO: "Atividade: situação", ATV_JUSTIFICAR: "Atividade: justificativa de atraso", ATV_COMENTAR: "Atividade: comentário", SAIU: "Saí para o atendimento", CHEGUEI: "Cheguei", RESPOSTA: "Resposta do checklist", FOTO: "Foto", RELATO: "Relato", PECA: "Peça", ASSINATURA: "Assinatura do cliente", CONCLUI: "Concluí", RONDA: "Ronda: registro do equipamento ou do setor", CADASTRO: "Cadastro feito em campo", NOVA_OS: "O.S. aberta em campo", ENVIAR_CLIENTE: "Envio do relatório ao cliente", DESFAZ_CONCLUSAO: "Desfazer conclusão (correção)", PEDIR_CORRECAO: "Pedido de correção à gestão" };
const AVISO_LOCALIZACAO = "O SGO+ Campo registra a sua localização só nos toques \"Cheguei\" e \"Concluí\", nunca o tempo todo. Ela serve para confirmar o atendimento no endereço do cliente e fica no registro da O.S.";

/* ---------------- estado ---------------- */
const E = {
  sessao: null,            // { sessionId, usuario, nome, perfil, renovadaEm, expirada }
  ultimoUsuario: null,
  aba: "abertas", agendaDia: "",   // 12/11/2026: abas Em aberto, Agenda, Kanban e Concluídas
  os: new Map(),           // osId → O.S. normalizada (com dia)
  exec: new Map(),         // osId → execução no aparelho
  regras: null, ligada: true,
  baixadoEm: 0, erroDia: "",
  resumo: { pendentes: 0, recusados: 0, maisAntigo: "", ultimoEnvio: "" },
  porOs: new Map(), outros: 0,
  enviando: false, baixando: false,
  ultimoEnvio: null, bloqueio: "",
  proximaTentativa: 0, espera: 0,
  arm: null, swNovo: null, instalar: null, semBanco: false,
  tipos: [], campo: null,      // versão 2: tipos de serviço (com checklist) e regras para abrir atendimento em campo
  novo: null,                  // estado da tela "Novo atendimento" (passos 1 a 4)
  atividades: [], motivosAtraso: [],   // 26/10/2026: Minhas atividades (atividades internas do técnico)
  renomeadas: new Map(),       // 18/11/2026: id provisório da O.S. aberta em campo -> id real (foto escolhida durante a troca)
};

function aparelho() {
  const ua = navigator.userAgent || "";
  const sistema = /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : "Outro";
  const m = /Android [\d.]+; ([^;)]+)/.exec(ua) || /(iPhone|iPad)/.exec(ua);
  return { modelo: m ? m[1].trim().slice(0, 60) : "", sistema };
}

const fila = criarFila({
  banco: B.bancoDaFila,
  api: {
    sincronizar: (sid, corpo, pedido) => chamar("Ast_appSincronizar", [sid, corpo], { pedidoId: pedido }),
    enviarFoto: (sid, corpo, pedido) => chamar("Ast_appEnviarFoto", [sid, corpo], { pedidoId: pedido, prazoMs: 120000 }),
    cadastrar: (sid, corpo, pedido) => chamar("Ast_appCadastrar", [sid, corpo], { pedidoId: pedido }),
    abrirOs: (sid, corpo, pedido) => chamar("Ast_appAbrirOS", [sid, corpo], { pedidoId: pedido }),
  },
  versaoApp: VERSAO, aparelho: aparelho(),
});

/* ---------------- servidor ---------------- */
async function chamar(fn, args, { pedidoId, prazoMs = 45000 } = {}) {
  if (navigator.onLine === false) throw new ErroRede();
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const prazo = ctl ? setTimeout(() => ctl.abort(), prazoMs) : null;
  let r;
  try {
    r = await fetch("/api/run", {
      method: "POST", credentials: "same-origin", cache: "no-store", signal: ctl ? ctl.signal : undefined,
      headers: { "Content-Type": "application/json", "X-Pedido-Id": pedidoId || novoIdLocal() },
      body: JSON.stringify({ fn, args }),
    });
  } catch (e) { throw new ErroRede(); } finally { if (prazo) clearTimeout(prazo); }
  // 31/10/2026: 429 do /api/run é o freio de senha e de código (login): mostra o motivo e o tempo de espera
  if (r.status === 429 && (fn === "login" || fn === "verificarCodigoAcesso" || fn === "pedirRedefinicaoSenha")) { let e429 = null; try { e429 = await r.json(); } catch (e) { e429 = null; } if (e429 && e429.erro) throw new Error(String(e429.erro)); }
  if ([0, 408, 429, 502, 503, 504].includes(r.status)) throw new ErroRede("Servidor ocupado ou fora do ar (HTTP " + r.status + ").");
  let j;
  try { j = await r.json(); } catch (e) { throw new ErroRede("Resposta incompleta do servidor."); }
  if (!j || j.ok !== true) {
    const m = String((j && j.erro) || "Falha no servidor (HTTP " + r.status + ").");
    // função ainda não publicada no servidor (módulo de Assistência ainda não ligado)
    if (/is not defined|not a function|n[aã]o est[aá] definid|NaoImplementado|Fun[cç][aã]o n[aã]o permitida/i.test(m + " " + ((j && j.nome) || ""))) throw new Error("O servidor ainda não está pronto para o app de campo. Avise o supervisor; o que está guardado continua no aparelho.");
    throw new Error(m);
  }
  return j.valor;
}

/* ---------------- sessão ---------------- */
async function carregarSessao() {
  let s = null;
  try { s = await B.cfg.ler("sessao"); } catch (e) { s = null; }
  if (!s) { try { const t = localStorage.getItem("SGO_CAMPO_SESSAO"); if (t) s = JSON.parse(t); } catch (e) { s = null; } }
  // já entrou no SGO+ neste navegador: aproveita a sessão (confirmada no servidor assim que houver sinal)
  if (!s) { try { const sid = localStorage.getItem("SGO_SESSION_PERSIST"); if (sid) s = { sessionId: sid, usuario: "", nome: "", herdada: true }; } catch (e) { s = null; } }
  E.sessao = s && s.sessionId ? s : null;
}
async function salvarSessao(s) {
  E.sessao = s;
  try { await B.cfg.gravar("sessao", s); } catch (e) { /* segue com o localStorage */ }
  try { localStorage.setItem("SGO_CAMPO_SESSAO", JSON.stringify(s)); } catch (e) { /* segue */ }
  // 31/10/2026 (login pelo e-mail): a tela de entrada lembra o e-mail; "usuario" segue como a chave interna dos dados do aparelho
  if (s && s.usuario) { E.ultimoUsuario = { usuario: s.usuario, nome: s.nome, email: s.email || (E.ultimoUsuario && E.ultimoUsuario.usuario === s.usuario ? E.ultimoUsuario.email : "") || "" }; try { await B.cfg.gravar("ultimoUsuario", E.ultimoUsuario); } catch (e) { /* segue */ } }
}
async function sessaoExpirou() {
  if (!E.sessao) return;
  if (!E.sessao.usuario) { await esquecerSessao(); render(); return; }
  await salvarSessao({ ...E.sessao, expirada: true });
  avisos(); barra();
}
async function esquecerSessao() {
  E.sessao = null;
  try { await B.cfg.apagar("sessao"); } catch (e) { /* segue */ }
  try { localStorage.removeItem("SGO_CAMPO_SESSAO"); } catch (e) { /* segue */ }
}
/** Renova a sessão no servidor (o SGO+ estende a validade a cada conferência). Sem sinal: segue trabalhando. */
async function renovar(forcar) {
  const s = E.sessao;
  if (!s || s.expirada || navigator.onLine === false) return;
  if (!forcar && s.usuario && Date.now() - (s.renovadaEm || 0) < 15 * 60000) return;
  let v;
  try { v = await chamar("validarSessao", [s.sessionId]); } catch (e) { return; }
  if (v && v.valid) {
    const d = v.data || {};
    await salvarSessao({ ...s, usuario: d.usuario || s.usuario, nome: d.nome || s.nome, perfil: d.perfil || s.perfil, userId: d.userId || s.userId, renovadaEm: Date.now(), expirada: false, herdada: false });
    if (!s.usuario) await carregarDoAparelho();
  } else if (v && /expirad|inexistent|desativad|n[aã]o existe|n[aã]o informad/i.test(String(v.message || ""))) await sessaoExpirou();
  // outra falha ao conferir (erro passageiro no servidor): segue com a sessão e confere de novo depois
}
const usuario = () => (E.sessao && E.sessao.usuario) || "";
const podeEnviar = () => !!(E.sessao && E.sessao.usuario && !E.sessao.expirada);

/* ---------------- dados no aparelho ---------------- */
async function carregarDoAparelho() {
  E.os.clear(); E.exec.clear();
  const u = usuario();
  if (!u) return;
  for (const o of await B.porUsuario("os", u)) E.os.set(o.osId, { ...o.dados, dia: o.dia });
  for (const x of await B.porUsuario("exec", u)) E.exec.set(x.osId, x);
  E.baixadoEm = (await B.cfg.ler("baixado|" + u)) || 0;
  E.regras = (await B.cfg.ler("regras|" + u)) || null;
  E.tipos = (await B.cfg.ler("tipos|" + u)) || [];
  E.campo = (await B.cfg.ler("campo|" + u)) || null;
  E.atividades = (await B.cfg.ler("atividades|" + u)) || [];
  E.motivosAtraso = (await B.cfg.ler("motivosAtraso|" + u)) || [];
  await atualizarResumo();
}
function execDe(osId) {
  let x = E.exec.get(osId);
  if (!x) { x = R.execucaoVazia(usuario(), osId); E.exec.set(osId, x); }
  return x;
}
async function salvarExec(x) { E.exec.set(x.osId, x); await B.gravar("exec", x); }
async function salvarOs(o) { E.os.set(o.osId, o); await B.gravar("os", { chave: usuario() + "|" + o.osId, usuario: usuario(), dia: o.dia, osId: o.osId, dados: o, baixadaEm: Date.now() }); }

async function atualizarResumo() {
  const u = usuario();
  try {
    const todos = await B.todos("fila");
    const meus = todos.filter((i) => i.usuario === u);
    const pend = meus.filter((i) => i.estado === "pendente");
    E.resumo = {
      pendentes: pend.length, recusados: meus.filter((i) => i.estado === "recusado").length,
      maisAntigo: pend.reduce((m, i) => (!m || i.criadoEm < m ? i.criadoEm : m), ""),
      ultimoEnvio: meus.filter((i) => i.estado === "enviado").reduce((m, i) => (i.enviadoEm > m ? i.enviadoEm : m), ""),
    };
    E.porOs = new Map();
    for (const i of pend) E.porOs.set(i.osId, (E.porOs.get(i.osId) || 0) + 1);
    E.outros = todos.filter((i) => i.usuario !== u && (i.estado === "pendente" || i.estado === "recusado")).length;
  } catch (e) { /* segue */ }
  barra();
}

/** Registra uma ação: primeiro a fila (o que vai ao servidor), depois o estado da tela. */
async function registrar(osId, tipo, dados, juntar, idLocal) {
  const item = await fila.registrar(usuario(), { tipo, osId, dados, juntar, idLocal });
  await atualizarResumo();
  setTimeout(() => tentarEnviar(false), 300);
  return item;
}

/* ---------------- Meu dia ---------------- */
async function baixarDia(manual) {
  if (!podeEnviar() || E.baixando) return;
  if (navigator.onLine === false) { if (manual) recado("Sem sinal agora. O app mostra o que foi baixado da última vez."); return; }
  E.baixando = true; E.erroDia = ""; if (rotaAtual().tela === "dia") render();
  try {
    const hoje = hojeISO();
    // 12/11/2026: "completo" traz todas as abertas (qualquer dia), a agenda de 30 dias e as concluídas dos últimos 30 dias
    const v = await chamar("Ast_appMeuDia", [E.sessao.sessionId, { dia: hoje, dias: 2, completo: true }]);
    if (ehSessaoExpirada(v)) { await sessaoExpirou(); return; }
    if (v && v.ok === false) throw new Error(v.message || v.erro || "O servidor recusou o pedido da agenda.");
    const n = R.normalizarMeuDia(v);
    if (!n) throw new Error("O servidor respondeu de um jeito que o app não entendeu.");
    const u = usuario();
    E.ligada = n.ligada; E.regras = n.regras;
    await B.cfg.gravar("regras|" + u, n.regras);
    if (n.tipos.length) { E.tipos = n.tipos; await B.cfg.gravar("tipos|" + u, n.tipos); }
    E.campo = n.campo; await B.cfg.gravar("campo|" + u, n.campo);
    await receberAtividades(n.atividades);
    if (n.motivosAtraso.length) { E.motivosAtraso = n.motivosAtraso; await B.cfg.gravar("motivosAtraso|" + u, n.motivosAtraso); }
    const novos = new Set(n.os.map((o) => o.osId));
    for (const o of await B.porUsuario("os", u)) if (!novos.has(o.osId)) {
      if (o.dados && o.dados.provisoria) continue;   // O.S. aberta em campo que ainda não subiu: fica até o servidor dar o número
      // saiu da agenda: só some do aparelho se nada foi feito nela aqui e não há nada dela para enviar
      const x = E.exec.get(o.osId);
      // 12/11/2026: com Saí ou Cheguei, fica marcada "saiu da sua agenda" até o que foi feito subir; na atualização seguinte, sem nada
      // pendente, sai (antes ficava para sempre em Em aberto: O.S. cancelada, passada a outro técnico ou excluída pela gestão)
      if ((!x || (!x.chegada && !x.saida) || o.dados.saiuDaAgenda) && !(E.porOs.get(o.osId) || 0)) { await B.apagar("os", o.chave); E.os.delete(o.osId); }
      else if (!o.dados.saiuDaAgenda) await salvarOs({ ...o.dados, dia: o.dia, saiuDaAgenda: true });
    }
    for (const o of n.os) {
      o.dia = o.dia || hoje;
      await salvarOs(o);
      const x = execDe(o.osId);
      if (R.mesclarRegistrado(x, o)) await salvarExec(x);
    }
    E.baixadoEm = Date.now();
    await B.cfg.gravar("baixado|" + u, E.baixadoEm);
    if (manual) recado("Agenda atualizada.");
  } catch (e) {
    E.erroDia = e instanceof ErroRede ? "" : String(e.message || e);
    if (manual) recado(e instanceof ErroRede ? "Sem sinal agora. Tente de novo mais tarde." : "Não foi possível atualizar: " + E.erroDia, 6000);
  } finally {
    E.baixando = false;
    redesenharSozinho(!E.erroDia);
  }
}

/**
 * 03/11/2026: redesenho que o app faz sozinho (agenda baixada, envio, sinal de volta, abertura). Só nas telas sem formulário
 * (R.podeRedesenharSozinho); em assinatura, termo, relato e demais passos os dados ficam em memória e a tela não é tocada
 * (assinatura no quadro e foco no campo seguem como estão). dadosNovos: mostra o aviso discreto "Dados atualizados".
 */
function redesenharSozinho(dadosNovos) {
  if (R.podeRedesenharSozinho(rotaAtual().tela)) { render(); return; }
  avisos(); barra();
  if (dadosNovos && $("recado").hidden && $("janela").hidden) recado("Dados atualizados.", 2500);
}

/** Situação das O.S. devolvida pelo servidor depois de um envio. */
async function aplicarSituacoes(lista) {
  for (const s of lista || []) {
    const o = E.os.get(String(s.id));
    if (!o) continue;
    const sit = String(s.situacao || o.situacao || "").toUpperCase();
    await salvarOs({ ...o, situacao: sit, situacaoNome: s.situacaoNome || o.situacaoNome,
      pendenciasServidor: Array.isArray(s.pendencias) ? s.pendencias.map(String) : o.pendenciasServidor, relatorioUrl: s.relatorioUrl || o.relatorioUrl || "",
      // 22/10/2026 (etapa 2): o estado do documento e do envio ao cliente vem na resposta do Sincronizar
      envio: s.envio ? R.normalizarEnvio(s.envio, s.relatorioUrl || o.relatorioUrl, sit) : (o.envio || R.normalizarEnvio(null, s.relatorioUrl || o.relatorioUrl, sit)),
      fechadaNoServidor: /^(ENCERRADA|CANCELADA)$/.test(sit), cancelada: sit === "CANCELADA" });
  }
}

/** O.S. aberta em campo que o servidor confirmou: a provisória (id = idLocal do NOVA_OS) vira a O.S. real, sem perder o que foi feito. */
async function aplicarNovasOs(lista) {
  for (const n of lista || []) {
    const prov = String(n.idLocal || ""), real = n.os && n.os.id ? String(n.os.id) : "";
    if (!prov || !real) continue;
    const antiga = E.os.get(prov), u = usuario();
    E.renomeadas.set(prov, real);
    const o = R.normalizarOs(n.os, 0);
    o.dia = (antiga && antiga.dia) || o.dia || hojeISO();
    if (antiga) { try { await B.apagar("os", u + "|" + prov); } catch (e) { /* segue */ } E.os.delete(prov); }
    const x = E.exec.get(prov);
    if (x) {
      try { await B.apagar("exec", x.chave); } catch (e) { /* segue */ }
      E.exec.delete(prov);
      const existente = E.exec.get(real);
      const y = existente || { ...x, chave: u + "|" + real, osId: real };
      if (existente) { for (const k of ["saida", "chegada", "conclusao", "assinatura", "assinaturaColab", "termo", "termoEnviado", "termoEnviadoEm"]) if (!y[k] && x[k]) y[k] = x[k]; y.respostas = { ...x.respostas, ...y.respostas }; y.fotos = y.fotos.concat(x.fotos.filter((f) => !y.fotos.some((g) => g.idLocal === f.idLocal))); y.pecas = y.pecas.concat(x.pecas); y.relato = { ...x.relato, ...y.relato }; }
      await salvarExec(y);
      if (R.mesclarRegistrado(y, o)) await salvarExec(y);
    }
    try { for (const f of await B.todos("fotos")) if (f.osId === prov) { f.osId = real; await B.gravar("fotos", f); } } catch (e) { /* segue */ }
    await salvarOs(o);
    if (rotaAtual().osId === prov) {
      const t = rotaAtual().tela, novo = "#/os/" + encodeURIComponent(real) + (t === "os" ? "" : "/" + t.replace(/^os-/, ""));
      if (R.podeRedesenharSozinho(t)) location.hash = novo;
      else { history.replaceState(null, "", novo); rotaAnterior = rotaAtual(); document.querySelectorAll("#tela [data-os]").forEach((el) => { if (el.dataset.os === prov) el.dataset.os = real; }); }
    }
    recado(n.message || "A O.S. provisória recebeu o número " + o.numero + ".", 6000);
  }
}

/* ---------------- envio ---------------- */
let timerEnvio = null;
async function tentarEnviar(manual) {
  if (E.enviando) return;
  if (!podeEnviar()) { if (manual) recado(E.sessao && E.sessao.expirada ? "Entre de novo para enviar. Nada do que está guardado foi perdido." : "Entre com o seu e-mail e a senha para enviar."); return; }
  if (navigator.onLine === false && !manual) return;
  if (!manual && E.resumo.pendentes === 0) return;
  if (!manual && Date.now() < E.proximaTentativa) return;
  E.enviando = true; barra();
  try {
    await renovar(false);
    if (!podeEnviar()) return;
    const tinhaAtv = (await B.porUsuario("fila", usuario())).some((i) => i.estado === "pendente" && /^ATV_/.test(i.tipo));
    const fazer = () => fila.enviar(E.sessao.sessionId, usuario());
    const r = navigator.locks && navigator.locks.request
      ? await navigator.locks.request("sgo-campo-envio", { ifAvailable: true }, (trava) => (trava ? fazer() : null))
      : await fazer();
    if (!r) return;                                  // outra aba do app já está enviando
    E.ultimoEnvio = { ...r, em: Date.now() };
    await aplicarNovasOs(r.novasOs);
    await aplicarSituacoes(r.os);
    for (const c of r.cadastros || []) if (c.existente && c.message) recado(c.message, 7000);
    E.bloqueio = r.parouPor === "bloqueado" ? r.motivo : "";
    if (tinhaAtv && !r.parouPor) setTimeout(() => baixarDia(false), 500);
    if (r.parouPor === "sessao") await sessaoExpirou();
    else if (r.parouPor) {
      E.espera = Math.min(300000, Math.max(15000, (E.espera || 7500) * 2));
      E.proximaTentativa = Date.now() + (r.parouPor === "bloqueado" ? 600000 : E.espera);
      if (manual) recado(r.parouPor === "rede" ? "Sem sinal agora. Fica guardado e o app tenta de novo sozinho." : "O envio parou: " + r.motivo, 6000);
    } else {
      E.espera = 0; E.proximaTentativa = 0;
      // 03/11/2026: registro recusado só porque a chegada ainda não tinha subido volta sozinho para a fila depois do Cheguei
      const presos = (await B.porUsuario("fila", usuario())).filter((i) => i.estado === "recusado" && !i.definitivo && (i.rodada || 0) < 3
        && /chegada/i.test(String(i.ultimoErro || "") + " " + String(i.corrigir || "")) && E.exec.get(i.osId) && E.exec.get(i.osId).chegada);
      for (const i of presos) await fila.tentarDeNovo(usuario(), i.idLocal);
      if (presos.length) setTimeout(() => tentarEnviar(false), 1500);
      if (manual) recado(r.recusados && !presos.length ? "Enviado, mas " + r.recusados + " item(ns) recusado(s). Veja em Envios." : "Tudo enviado.");
    }
  } catch (e) {
    E.ultimoEnvio = { parouPor: "erro", motivo: String(e.message || e), em: Date.now() };
  } finally {
    E.enviando = false;
    await atualizarResumo();
    redesenharSozinho(false);
  }
}
function agendarEnvios() {
  if (timerEnvio) clearInterval(timerEnvio);
  timerEnvio = setInterval(() => { if (document.visibilityState === "visible") { tentarEnviar(false); renovar(false); } }, 30000);
}

/* ---------------- localização (só Cheguei e Concluí) ---------------- */
function pegarLocalizacao() {
  return new Promise((ok) => {
    if (!navigator.geolocation) return ok({ loc: null, motivo: "Aparelho sem localização." });
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ loc: { lat: p.coords.latitude, lng: p.coords.longitude, precisao: Math.round(p.coords.accuracy || 0) }, motivo: "" }),
      (e) => ok({ loc: null, motivo: e && e.code === 1 ? "Localização não permitida no aparelho." : "Localização não obtida (sem sinal de GPS)." }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}
async function confirmarLocalizacao(titulo) {
  const visto = await B.cfg.ler("avisoLocalizacao");
  return new Promise((ok) => {
    janela(`<h2>${esc(titulo)}</h2>
      <p>${esc(AVISO_LOCALIZACAO)}</p>
      ${visto ? "" : "<p class=\"fraco\">Se o aparelho perguntar, toque em Permitir. Sem a localização o registro é feito do mesmo jeito, com a observação.</p>"}
      <button type="button" class="bt primario" data-j="com">Registrar com localização</button>
      <button type="button" class="bt" data-j="sem">Registrar sem localização</button>
      <button type="button" class="bt perigo" data-j="nao">Cancelar</button>`, async (q) => {
      if (q === "nao" || q === null) return ok(null);
      await B.cfg.gravar("avisoLocalizacao", Date.now());
      if (q === "sem") return ok({ loc: null, motivo: "O técnico preferiu não registrar a localização." });
      recado("Buscando a localização...", 16000);
      const r = await pegarLocalizacao();
      fecharRecado();
      ok(r);
    });
  });
}
const dadosLocalizacao = (r) => (r.loc ? { lat: r.loc.lat, lng: r.loc.lng, precisao: r.loc.precisao } : { semLocalizacao: r.motivo });

/* ---------------- fotos ---------------- */
function carregarImagem(arquivo) {
  return new Promise((ok, falha) => {
    const url = URL.createObjectURL(arquivo), img = new Image();
    img.onload = () => { ok({ fonte: img, w: img.naturalWidth, h: img.naturalHeight, soltar: () => URL.revokeObjectURL(url) }); };
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error("Não foi possível abrir esta foto.")); };
    img.src = url;
  });
}
const paraBlob = (c, q) => new Promise((ok) => c.toBlob((b) => ok(b), "image/jpeg", q));
function carimbar(g, w, h, texto) {
  const t = Math.max(14, Math.round(Math.min(w, h) * 0.032));
  g.font = "700 " + t + "px system-ui, Arial, sans-serif";
  const larg = g.measureText(texto).width + t;
  g.fillStyle = "rgba(0,0,0,0.6)";
  g.fillRect(0, h - t * 1.8, Math.min(w, larg), t * 1.8);
  g.fillStyle = "#ffffff";
  g.fillText(texto, t / 2, h - t * 0.55);
}
/*
 * 18/11/2026 (técnicos em campo sem conseguir pôr foto): a foto nunca some em silêncio. Causas tratadas:
 *  - o celular fecha o app enquanto a câmera ou a galeria está aberta (pouca memória: comum no iPhone com o app na tela de início
 *    e em Android simples): a página volta do zero e a foto escolhida se perde. O app anota antes de abrir a câmera
 *    (FOTO_ABERTA) e, ao voltar sem a foto, diz o que houve e o que fazer;
 *  - foto que o navegador não abre (HEIC do iPhone, arquivo que não é imagem) ou grande demais para a memória: tenta de novo
 *    reduzindo já na leitura e, se não der, diz o porquê e o que fazer;
 *  - o aparelho sem espaço ou sem conseguir guardar o arquivo da foto: guarda em texto (base64) e, se nem assim, diz o que fazer;
 *  - O.S. aberta em campo que recebeu o número oficial enquanto a câmera estava aberta: a foto vai para a O.S. certa.
 */
const FOTO_ABERTA = "SGO_CAMPO_FOTO_ABERTA";
const ehHeic = (a) => /hei[cf]/i.test(String((a && a.type) || "")) || /\.hei[cf]$/i.test(String((a && a.name) || ""));
function erroFoto(arquivo, causa) {
  if (ehHeic(arquivo)) return new Error("Esta foto está no formato HEIC (padrão do iPhone) e o navegador deste celular não abre esse formato. O que fazer: use \"Tirar foto\" pelo app (a câmera do app já entrega no formato certo) ou, no iPhone, Ajustes > Câmera > Formatos > \"Mais compatível\" e tire de novo.");
  if (arquivo && arquivo.type && !/^image\//i.test(arquivo.type)) return new Error("O arquivo escolhido não é uma foto (" + arquivo.type + "). Escolha uma imagem (JPG ou PNG).");
  return new Error("Não foi possível abrir esta foto" + (causa ? " (" + causa + ")" : "") + ". Por quê: o celular não conseguiu ler a imagem, em geral por falta de memória com outros aplicativos abertos. O que fazer: feche os outros aplicativos e tente de novo; se repetir, tire a foto pela câmera do celular e use \"Escolher do celular\".");
}
/** Abre a imagem com o menor uso de memória possível: já reduzida na leitura quando o navegador sabe; senão inteira; senão pelo <img>. */
async function abrirImagem(arquivo) {
  const tentativas = [{ imageOrientation: "from-image", resizeWidth: 1600, resizeQuality: "high" }, { imageOrientation: "from-image" }];
  let ultimo = null;
  if (typeof createImageBitmap === "function") {
    for (const op of tentativas) {
      try {
        const bmp = await createImageBitmap(arquivo, op);
        // reduzida pela largura: foto em pé fica com 1600 × 2133; a redução final é feita no canvas
        return { fonte: bmp, w: bmp.width, h: bmp.height, soltar: () => { try { bmp.close(); } catch (e) { /* segue */ } } };
      } catch (e) { ultimo = e; }
    }
  }
  try { return await carregarImagem(arquivo); }
  catch (e) { throw erroFoto(arquivo, ultimo && ultimo.name === "InvalidStateError" ? "imagem grande demais" : ""); }
}
/** Reduz a foto no aparelho: lado maior até 1600 px, cerca de 300 KB, com a O.S., a data e a hora gravadas na imagem. */
async function comprimirFoto(arquivo, carimbo) {
  if (!arquivo || !arquivo.size) throw new Error("A foto veio vazia (0 KB). Tire ou escolha de novo.");
  const { fonte, w, h, soltar } = await abrirImagem(arquivo);
  const alvo = Math.min(330 * 1024, (E.regras && E.regras.fotoMaxBytes) || 2000000);
  try {
    for (const lado of [1600, 1280, 1024]) {
      const k = Math.min(1, lado / Math.max(w, h)), cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
      const c = document.createElement("canvas"); c.width = cw; c.height = ch;
      const g = c.getContext("2d");
      if (!g) throw erroFoto(arquivo, "sem memória para desenhar");
      g.drawImage(fonte, 0, 0, cw, ch);
      carimbar(g, cw, ch, carimbo);
      for (const q of [0.8, 0.7, 0.6, 0.5]) {
        const b = await paraBlob(c, q);
        if (b && (b.size <= alvo || (q === 0.5 && lado === 1024))) {
          const m = document.createElement("canvas"), km = Math.min(1, 320 / Math.max(cw, ch));
          m.width = Math.round(cw * km); m.height = Math.round(ch * km);
          m.getContext("2d").drawImage(c, 0, 0, m.width, m.height);
          const miniatura = m.toDataURL("image/jpeg", 0.6);
          c.width = c.height = 0; m.width = m.height = 0;   // libera a memória (iPhone)
          return { blob: b, largura: cw, altura: ch, miniatura };
        }
      }
      c.width = c.height = 0;
    }
    throw erroFoto(arquivo, "não foi possível reduzir");
  } finally { soltar(); }
}
let fotoAlvo = null;   // { osId, perguntaId, qr, legenda }
const lerFotoAberta = () => { try { const t = localStorage.getItem(FOTO_ABERTA); return t ? JSON.parse(t) : null; } catch (e) { return null; } };
const anotarFotoAberta = (a) => { try { if (a) localStorage.setItem(FOTO_ABERTA, JSON.stringify(a)); else localStorage.removeItem(FOTO_ABERTA); } catch (e) { /* segue */ } };
function abrirCamera(osId, perguntaId, galeria, qr, legenda) {
  if (qr ? bloqueada(osId) : bloqueadaFoto(osId)) return;
  fotoAlvo = { osId, perguntaId: perguntaId || "", qr: !!qr, legenda: legenda || "" };
  const inp = $(galeria ? "arqGaleria" : "arqCamera");
  if (!inp) { recado("O app está desatualizado neste celular. Feche o SGO+ Campo e abra de novo com internet.", 7000); return; }
  anotarFotoAberta({ ...fotoAlvo, galeria: !!galeria, rota: location.hash, em: Date.now() });
  inp.value = "";
  try { inp.click(); }
  catch (e) { anotarFotoAberta(null); recado("O celular não deixou abrir a " + (galeria ? "galeria" : "câmera") + ". Confira em Ajustes se o navegador tem permissão para a câmera e as fotos, e tente de novo.", 8000); }
}
/** Ao abrir o app: a câmera ou a galeria estava aberta e o celular fechou o app (falta de memória). Diz o que houve; nunca silêncio. */
function avisarFotoPerdida() {
  const a = lerFotoAberta();
  anotarFotoAberta(null);
  if (!a || !a.em || Date.now() - a.em > 20 * 60000) return;
  const os = E.os.get(a.osId);
  if (a.rota && a.rota !== location.hash && os) location.hash = a.rota;
  janela(`<h2>A foto não chegou ao app</h2>
    <p>O celular fechou o SGO+ Campo enquanto a ${a.galeria ? "galeria" : "câmera"} estava aberta${os ? " (O.S. " + esc(os.numero) + ")" : ""}. Isso acontece quando falta memória no aparelho. Nada do que já estava guardado se perdeu.</p>
    <p><strong>O que fazer:</strong> feche os outros aplicativos abertos e toque de novo em "${a.galeria ? "Escolher do celular" : "Tirar foto"}". Se repetir, tire a foto pela câmera do próprio celular e depois use "Escolher do celular".</p>
    <button type="button" class="bt primario" data-j="ok">Entendi</button>`, () => {});
}
/** O.S. aberta em campo que ganhou o número oficial enquanto a câmera estava aberta: a foto vai para a O.S. certa. */
const osIdAtual = (id) => (E.renomeadas && E.renomeadas.get(id)) || id;
async function aoEscolherFoto(ev) {
  // 12/11/2026 (pedido do dono): escolher várias fotos do celular de uma vez; uma só segue com a prévia e a legenda
  const inp = ev.target, arqs = inp.files ? Array.from(inp.files) : [], arq = arqs[0];
  const alvo = fotoAlvo || lerFotoAberta();
  anotarFotoAberta(null);
  if (!arq) { inp.value = ""; return; }   // a pessoa fechou a câmera ou a galeria sem escolher
  if (!alvo || !alvo.osId) { inp.value = ""; recado("A foto chegou, mas o app não sabe de qual O.S. ela é. Abra a O.S. e toque de novo em \"Tirar foto\" ou \"Escolher do celular\".", 8000); return; }
  alvo.osId = osIdAtual(alvo.osId);
  if (alvo.qr) { try { await lerQr(arq, alvo.osId); } finally { inp.value = ""; } return; }
  if (arqs.length > 1) { try { await guardarVariasFotos(arqs, alvo); } finally { inp.value = ""; } return; }
  const os = E.os.get(alvo.osId);
  recado("Preparando a foto...", 20000);
  let r;
  try { r = await comprimirFoto(arq, ((os && os.numero) || alvo.osId) + " · " + carimboAgora()); }
  catch (e) { fecharRecado(); recado(String(e.message || e), 12000); return; }
  finally { inp.value = ""; }
  fecharRecado();
  const pergunta = os && alvo.perguntaId ? os.checklist.find((p) => p.id === alvo.perguntaId) : null;
  janela(`<h2>Foto</h2>
    <img class="previa" src="${r.miniatura}" alt="Prévia da foto">
    <p class="fraco pequeno">${Math.round(r.blob.size / 1024)} KB · ${r.largura} × ${r.altura}${pergunta ? " · Pergunta: " + esc(pergunta.texto) : ""}</p>
    <label class="rotulo" for="fLegenda">Legenda (o que aparece na foto)</label>
    <input class="campo" id="fLegenda" maxlength="200" autocomplete="off" value="${esc(pergunta ? pergunta.texto : alvo.legenda || "")}">
    <button type="button" class="bt primario" data-j="ok">Guardar foto</button>
    <button type="button" class="bt perigo" data-j="nao">Descartar</button>`, async (q, campos) => {
    if (q !== "ok") { recado("Foto descartada."); return; }
    try { await guardarFoto({ ...alvo, osId: osIdAtual(alvo.osId) }, r, String(campos.fLegenda || "").trim()); }
    catch (e) { recado(String((e && e.message) || e), 12000); return; }
    recado("Foto guardada no aparelho.");
    render();
  });
}
/** Guarda o arquivo da foto no aparelho; sem conseguir guardar o arquivo (alguns iPhones), guarda em texto; sem espaço, diz o que fazer. */
async function gravarArquivoFoto(reg, blob) {
  try { await B.gravar("fotos", { ...reg, blob }); return; } catch (e) { /* tenta em texto */ }
  let base64 = "";
  try { base64 = await new Promise((ok, falha) => { const fr = new FileReader(); fr.onload = () => { const s = String(fr.result || ""); ok(s.slice(s.indexOf(",") + 1)); }; fr.onerror = () => falha(fr.error); fr.readAsDataURL(blob); }); }
  catch (e) { base64 = ""; }
  try { if (!base64) throw new Error("vazio"); await B.gravar("fotos", { ...reg, blob: null, base64 }); }
  catch (e) { throw new Error("O celular não conseguiu guardar a foto (sem espaço livre ou armazenamento bloqueado). O que fazer: apague fotos e vídeos que não precisa ou libere espaço, confira em Envios se há itens para enviar e tente de novo. Nada do que já estava guardado se perdeu."); }
}
/** Guarda uma foto já reduzida no aparelho e põe na fila de envio. */
async function guardarFoto(alvo, r, legenda) {
  const os = E.os.get(alvo.osId);
  const id = novoIdLocal(), em = new Date().toISOString();
  const nome = String((os && os.numero) || alvo.osId).replace(/[^\w-]/g, "") + "-" + em.replace(/[:.]/g, "-").slice(0, 19) + "-" + id.slice(-4) + ".jpg";
  await gravarArquivoFoto({ idLocal: id, osId: alvo.osId, nome, tipo: "image/jpeg", legenda, perguntaId: alvo.perguntaId, miniatura: r.miniatura, tamanho: r.blob.size, em }, r.blob);
  await registrar(alvo.osId, "FOTO", { legenda, perguntaId: alvo.perguntaId, nome, tamanho: r.blob.size }, "", id);
  const x = execDe(alvo.osId);
  x.fotos.push({ idLocal: id, perguntaId: alvo.perguntaId, legenda, em, miniatura: r.miniatura });
  await salvarExec(x);
}
/** 12/11/2026: várias fotos escolhidas do celular: reduz e guarda uma por vez (até 20), com a legenda da pergunta; diz quantas entraram. */
async function guardarVariasFotos(arqs, alvo) {
  const os = E.os.get(alvo.osId), lista = arqs.slice(0, 20);
  const pergunta = os && alvo.perguntaId ? os.checklist.find((p) => p.id === alvo.perguntaId) : null;
  const legenda = pergunta ? pergunta.texto : alvo.legenda || "";
  let ok = 0, erro = "";
  for (let i = 0; i < lista.length; i++) {
    recado("Preparando a foto " + (i + 1) + " de " + lista.length + "...", 30000);
    try { await guardarFoto({ ...alvo, osId: osIdAtual(alvo.osId) }, await comprimirFoto(lista[i], ((os && os.numero) || alvo.osId) + " · " + carimboAgora()), legenda); ok++; }
    catch (e) { erro = String(e && e.message || e); }
  }
  fecharRecado();
  recado(ok + (ok === 1 ? " foto guardada" : " fotos guardadas") + " no aparelho." + (ok < lista.length ? " " + (lista.length - ok) + " não entrou: " + erro : "") +
    (arqs.length > 20 ? " Foram usadas só as 20 primeiras; escolha as outras de novo." : ""), ok < lista.length ? 12000 : 7000);
  render();
}

/* ---------------- equipamento: QR (Android) ou série/TAG ---------------- */
const temLeitorQr = () => typeof window.BarcodeDetector === "function";
async function lerQr(arquivo, osId) {
  const os = E.os.get(osId);
  try {
    const bmp = await createImageBitmap(arquivo);
    const achados = await new window.BarcodeDetector({ formats: ["qr_code"] }).detect(bmp);
    try { bmp.close(); } catch (e) { /* segue */ }
    const texto = achados && achados[0] ? String(achados[0].rawValue || "") : "";
    if (!texto) { recado("Nenhum QR encontrado na foto. Tente mais perto e com luz, ou confira pela série.", 6000); return; }
    const m = /[?&]equipamento=([^&#\s]+)/.exec(texto);
    const lido = m ? decodeURIComponent(m[1]) : texto.trim();
    if (os.equipamento.id && lido !== os.equipamento.id && lido !== os.equipamento.tag) {
      recado("O QR lido é de outro equipamento. Confira se está no equipamento certo, ou confira pela série.", 7000);
      return;
    }
    await confirmarEquipamento(osId, os.equipamento.serie || os.equipamento.tag, "QR");
  } catch (e) { recado("Não foi possível ler o QR. Confira pela série ou pela TAG.", 6000); }
}
async function confirmarEquipamento(osId, serie, como) {
  if (bloqueada(osId)) return;
  const x = execDe(osId);
  x.relato = { ...x.relato, serieConfirmada: serie, identificadoPor: como };
  await registrarRelato(osId, x);
  const feito = como === "QR" ? "Equipamento confirmado pelo QR." : "Equipamento confirmado.";
  if (rotaAtual().tela === "os-equipamento") { seguirDepoisDe(osId, "equipamento", feito); return; }
  recado(feito);
  render();
}

/* ---------------- telas ---------------- */
function rotaAtual() {
  const p = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  if (!p.length || p[0] === "dia") return { tela: "dia" };
  if (p[0] === "os" && p[1]) return { tela: p[2] ? "os-" + p[2] : "os", osId: p[1], parte: p[3] || "" };
  if (p[0] === "atv" && p[1]) return { tela: "atv", atvId: p[1] };
  return { tela: p[0], parte: p[1] || "" };
}
const ir = (h) => { if (location.hash === h) render(); else location.hash = h; };

function render() {
  avisos(); barra();
  const tela = $("tela"), r = rotaAtual();
  $("btVoltar").hidden = r.tela === "dia" || r.tela === "entrar";
  // a tela de entrar tem a logo grande no corpo: o topo (logo pequena) e o título ficam escondidos nela
  const semSessao = !E.sessao || !E.sessao.usuario;
  const entrando = !E.semBanco && (semSessao ? r.tela !== "ajuda" : r.tela === "entrar");
  $("topo").hidden = entrando;
  $("titulo").hidden = entrando;
  if (E.semBanco) { titulo("SGO+ Campo"); tela.innerHTML = telaSemBanco(); return; }
  if (semSessao) {
    if (r.tela === "ajuda") { titulo("Como usar"); tela.innerHTML = telaAjuda(); return; }
    titulo("SGO+ Campo"); tela.innerHTML = telaEntrar(); return;
  }
  const os = r.osId ? E.os.get(r.osId) : null;
  if (r.osId && !os) { titulo("O.S."); tela.innerHTML = `<p>Esta O.S. não está mais neste aparelho.</p><button class="bt primario" data-acao="irDia">Ir para o Meu dia</button>`; return; }
  // 12/11/2026: atendimento com visita aberto em campo fica com quem abriu (decisão do dono de 03/11/2026), mesmo antes de subir
  // (O.S. provisória, sem sinal): só o pedido sem visita a outro setor (envio de orçamento, correção) espera a fila do setor.
  const pedidoSetor = (o) => o.provisoria && (o.tipoCodigo === "ENVIO_ORCAMENTO" || o.grupo === "COMERCIAL" || o.tipoCodigo === "CORRECAO_OS");
  if (os && (pedidoSetor(os) || String(os.situacaoNome || "").startsWith("Aguardando executor"))) {
    titulo(os.numero || "O.S. aguardando distribuição");
    tela.innerHTML = `<div class="aviso alerta"><p>${os.provisoria ? "O pedido está guardado neste aparelho. Ao recuperar a conexão, ele segue para o setor responsável, que escolhe quem executa." : esc(os.situacaoNome) + ". O setor precisa escolher o executor antes do atendimento."}</p></div><button class="bt primario" data-acao="irDia">Ir para o Meu dia</button>`;
    return;
  }
  switch (r.tela) {
    case "entrar": titulo("Entrar de novo"); tela.innerHTML = telaEntrar(); break;
    case "os": titulo(os.numero); tela.innerHTML = os.ronda ? telaOsRonda(os) : telaOs(os); break;
    // 03/11/2026: ronda de engenharia clínica
    case "os-setores": titulo("Setores e equipamentos"); tela.innerHTML = telaSetores(os); break;
    case "os-setor": titulo("Setor"); tela.innerHTML = telaSetor(os, r.parte); break;
    case "os-equipnovo": titulo("Equipamento fora do cadastro"); tela.innerHTML = telaEquipNovo(os, r.parte); break;
    case "os-orientacoes": titulo("Orientações e resumo"); tela.innerHTML = telaOrientacoes(os); break;
    case "os-equipamento": titulo("Equipamento"); tela.innerHTML = telaEquipamento(os); break;
    case "os-checklist": titulo("Checklist"); tela.innerHTML = telaChecklist(os); break;
    case "os-fotos": titulo("Fotos"); tela.innerHTML = telaFotos(os); break;
    case "os-pecas": titulo("Peças"); tela.innerHTML = telaPecas(os); break;
    case "os-relato": titulo("Relato"); tela.innerHTML = telaRelato(os); break;
    case "os-assinatura": titulo(R.nomePasso(os, "assinatura")); tela.innerHTML = telaAssinatura(os); montarQuadro(); break;
    case "os-termo": titulo(R.nomePasso(os, "termo")); tela.innerHTML = telaTermo(os); break;
    case "os-colaborador": titulo(R.nomePasso(os, "colaborador")); tela.innerHTML = telaColaborador(os); montarQuadro(); break;
    case "os-concluir": titulo("Concluir"); tela.innerHTML = telaConcluir(os); break;
    case "os-enviar": titulo("Enviar ao cliente"); tela.innerHTML = telaEnviar(os); break;
    case "novo": titulo("Novo atendimento"); tela.innerHTML = telaNovo(); break;
    case "atv": { const a = atvDe(r.atvId); titulo("Atividade"); tela.innerHTML = a ? telaAtividade(a) : `<p>Esta atividade não está mais na sua lista (concluída, replanejada ou passada para outra pessoa).</p><button class="bt primario" data-acao="irDia">Ir para o Meu dia</button>`; break; }
    case "envios": titulo("Envios"); tela.innerHTML = "<p>Carregando...</p>"; telaEnvios().then((h) => { if (rotaAtual().tela === "envios") tela.innerHTML = h; }); break;
    case "ajuda": titulo("Como usar"); tela.innerHTML = telaAjuda(); break;
    case "conta": titulo("Minha conta"); tela.innerHTML = telaConta(); break;
    default: titulo("Meu dia"); tela.innerHTML = telaDia();
  }
}
const titulo = (t) => { $("titulo").textContent = t; document.title = t === "SGO+ Campo" ? t : t + " · SGO+ Campo"; };

function telaSemBanco() {
  return `<div class="aviso erro"><p>Este navegador não deixa o SGO+ Campo guardar dados no aparelho (navegação privada ou anônima, ou armazenamento bloqueado).</p>
    <p>Sem isso o app não funciona sem internet. Abra o endereço numa aba normal do Chrome (Android) ou do Safari (iPhone).</p></div>
    <button class="bt" data-acao="recarregar">Tentar de novo</button>`;
}

/* 31/10/2026 (segurança do acesso do SGO+): depois da senha certa o servidor pode pedir o código do celular (etapa CODIGO)
   ou a senha nova obrigatória (etapa TROCAR_SENHA). O código e a senha nunca ficam guardados no aparelho. */
function telaEtapaLogin() {
  const t = E.etapaLogin;
  const marca = `<div class="entrar-marca"><img src="/campo/logo.webp" alt="Metrolabs" width="640" height="198"><p class="nome-app">SGO+ Campo</p></div>`;
  if (t.tipo === "SEM_ENVIO") return marca + `<div class="aviso erro"><p>${esc(t.message)}</p></div><button type="button" class="bt primario" data-acao="voltarLogin">Voltar</button>`;
  // 31/10/2026: "Esqueci minha senha": o link vai para o e-mail e abre a página do SGO+ para criar a senha nova
  if (t.tipo === "ESQUECI") {
    if (t.enviado) return marca + `<div class="caixa"><h2>Confira o seu e-mail</h2><div class="aviso ok"><p>${esc(t.enviado)}</p></div>
      <p class="fraco pequeno">O link abre a página do SGO+ no navegador. Depois de criar a senha nova, volte aqui e entre com o e-mail e a senha nova.</p></div>
      <button type="button" class="bt primario" data-acao="voltarLogin">Voltar para a entrada</button>`;
    return marca + `<form id="fEsqueci" class="caixa" autocomplete="on">
      <h2>Esqueci minha senha</h2><p class="fraco">Digite o e-mail cadastrado no SGO+. Enviamos para ele um link para criar uma senha nova (vale por 30 minutos, uma vez só).</p>
      <label class="rotulo" for="eEmailEsq">E-mail</label>
      <input class="campo" id="eEmailEsq" type="email" inputmode="email" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required value="${esc(t.email || "")}">
      <p id="eErro" class="aviso erro" hidden></p>
      <button type="submit" class="bt primario" id="eBotao">Enviar o link</button>
    </form>
    <button type="button" class="bt" data-acao="voltarLogin">Voltar para a entrada</button>
    <p class="fraco pequeno">Sem e-mail cadastrado ou sem acesso a ele? Peça à gestão da Metrolabs.</p>`;
  }
  if (t.tipo === "CODIGO") {
    const falta = Math.max(0, Math.ceil(((t.reenviarEm || 0) - Date.now()) / 1000));
    return marca + `<form id="fCodigo" class="caixa" autocomplete="off">
      <h2>Digite o código de acesso</h2><p class="fraco">${esc(t.message)}</p>
      <label class="rotulo" for="eCodigo">Código de 6 números</label>
      <input class="campo" id="eCodigo" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" required style="font-size:1.6em;letter-spacing:.4em;text-align:center">
      <label class="rotulo" style="display:flex;gap:10px;align-items:flex-start;font-weight:500"><input type="checkbox" id="eConfiar" checked style="width:22px;height:22px;margin:0"> <span>Confiar neste aparelho por 30 dias (não pede o código de novo neste celular). Desmarque se o celular não é só seu.</span></label>
      <p id="eErro" class="aviso erro" hidden></p>
      <button type="submit" class="bt primario" id="eBotao">Confirmar e entrar</button>
    </form>
    <button type="button" class="bt" data-acao="reenviarCodigo" ${falta > 0 || t.reenviosRestantes === 0 ? "disabled" : ""}>${t.reenviosRestantes === 0 ? "Reenvios usados (3 de 3)" : falta > 0 ? "Reenviar código (em " + falta + " s)" : "Reenviar código"}</button>
    ${t.podeEmail ? `<button type="button" class="bt" data-acao="codigoPorEmail" ${falta > 0 ? "disabled" : ""}>Receber por e-mail</button>` : ""}
    <button type="button" class="bt" data-acao="voltarLogin">Voltar</button>
    <p class="fraco pequeno">Não chegou? Confira a internet do celular; o e-mail pode levar até 1 minuto. Se nada chegar, peça ao administrador do SGO+ para conferir o seu celular e o seu e-mail.</p>`;
  }
  return marca + `<form id="fSenhaNova" class="caixa" autocomplete="off">
      <h2>Crie sua nova senha</h2><p class="fraco">Antes de continuar, crie uma senha nova. Por quê: a gestão do SGO+ pediu a troca da senha para proteger o sistema contra invasões.</p>
      <label class="rotulo" for="eNova">Senha nova</label>
      <input class="campo" id="eNova" type="password" autocomplete="new-password" maxlength="128" required>
      <label class="rotulo" for="eConf">Digite a senha nova de novo</label>
      <input class="campo" id="eConf" type="password" autocomplete="new-password" maxlength="128" required>
      <p class="fraco pequeno">8 caracteres ou mais, com letras e números; diferente da atual; nada de 12345678, do seu nome, do seu e-mail ou do nome da empresa. Depois da troca, os outros aparelhos com a senha antiga são desconectados.</p>
      <p id="eErro" class="aviso erro" hidden></p>
      <button type="submit" class="bt primario" id="eBotao">Salvar a senha nova e entrar</button>
    </form>
    <button type="button" class="bt" data-acao="voltarLogin">Sair sem trocar</button>`;
}

function telaEntrar() {
  if (E.etapaLogin) return telaEtapaLogin();
  const s = E.sessao, exp = s && s.expirada;
  // 31/10/2026: a entrada é pelo e-mail; o campo vem com o e-mail da última entrada neste aparelho (nunca o login interno)
  const ult = (s && s.email) || (E.ultimoUsuario && E.ultimoUsuario.email) || "";
  return `<div class="entrar-marca"><img src="/campo/logo.webp" alt="Metrolabs" width="640" height="198">
      <p class="nome-app">SGO+ Campo</p>
      <p class="lema">Aplicativo do técnico de campo · Soluções em Engenharia Clínica</p></div>
    ${exp ? `<div class="aviso alerta"><p>A sua sessão terminou no servidor. Entre de novo para continuar enviando.</p><p>Nada do que está guardado neste aparelho foi perdido.</p></div>` : ""}
    ${navigator.onLine === false ? `<div class="aviso alerta"><p>Sem internet agora. Para entrar é preciso sinal.${exp ? " Enquanto isso, o que você fizer continua guardado." : ""}</p></div>` : ""}
    <form id="fEntrar" class="caixa" autocomplete="on">
      <h2>${exp ? "Entrar de novo" : "Entrar"}</h2><p class="fraco">Use o mesmo e-mail e senha do SGO+.</p>
      <label class="rotulo" for="eUsuario">E-mail</label>
      <input class="campo" id="eUsuario" name="username" type="email" inputmode="email" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required placeholder="nome@empresa.com.br" value="${esc(ult)}">
      <label class="rotulo" for="eSenha">Senha</label>
      <input class="campo" id="eSenha" name="password" type="password" autocomplete="current-password" required>
      <p id="eErro" class="aviso erro" hidden></p>
      <button type="submit" class="bt primario" id="eBotao">Entrar</button>
    </form>
    <button type="button" class="bt" data-acao="esqueci">Esqueci minha senha</button>
    ${exp ? `<button type="button" class="bt" data-acao="irDia">Continuar sem enviar por enquanto</button>` : ""}
    <button type="button" class="bt" data-acao="ajuda">Como usar o SGO+ Campo</button>
    <p class="fraco pequeno" style="text-align:center">Versão ${esc(VERSAO)}</p>`;
}

function rotuloAtualizado() {
  const t = E.baixadoEm;
  if (!t) return navigator.onLine === false ? "Agenda ainda não baixada neste aparelho. Abra com internet." : "Agenda ainda não baixada.";
  const d = new Date(t), mesmoDia = diaISO(d) === hojeISO();
  return "Agenda atualizada " + (mesmoDia ? "às " : "em " + doisDig(d.getDate()) + "/" + doisDig(d.getMonth() + 1) + " às ") + doisDig(d.getHours()) + ":" + doisDig(d.getMinutes()) + (navigator.onLine === false ? " · sem sinal agora" : "");
}

/* 12/11/2026 (pedido do dono): Meu dia em abas. Em aberto (todas as O.S. abertas, de qualquer dia, com as atrasadas no alto),
 * Agenda (os próximos 14 dias, um botão por dia com a quantidade), Kanban (A fazer, Em andamento, Aguardando, Concluídas) e Concluídas
 * (encerradas dos últimos 30 dias). O servidor manda tudo isso no Ast_appMeuDia com "completo"; sem internet, vale o que foi baixado. */
function estadoOs(o) {
  const x = E.exec.get(o.osId);
  if (o.cancelada) return "cancelada";
  if (o.situacao === "DOC_PENDENTE" || o.situacao === "PAUSADA") return "aguardando";
  if (o.situacao === "ENCERRADA" || (x && x.conclusao)) return "concluida";
  if ((x && (x.chegada || x.saida)) || /^(EM_DESLOCAMENTO|NO_LOCAL|EM_EXECUCAO)$/.test(o.situacao || "")) return "andamento";
  return "afazer";
}
const porDia = (a, b) => (a.dia === b.dia ? (a.ordem || 0) - (b.ordem || 0) : a.dia < b.dia ? -1 : 1);
function diaCurto(dia) {
  const d = new Date(dia + "T12:00:00");
  return isNaN(d) ? diaBR(dia) : ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][d.getDay()] + " " + dia.slice(8, 10) + "/" + dia.slice(5, 7);
}
function rotuloDia(dia, hoje) {
  if (!dia) return "Sem data";
  if (dia < hoje) return "Atrasadas";
  if (dia === hoje) return "Hoje";
  if (dia === amanhaISO()) return "Amanhã";
  return diaCurto(dia);
}
function listaAgrupada(lista, hoje, vazio) {
  if (!lista.length) return `<div class="info"><p>${esc(vazio)}</p></div>`;
  let h = "", atual = null;
  for (const o of lista) {
    const g = rotuloDia(o.dia, hoje);
    if (g !== atual) { h += `<h2 class="grupo-dia">${esc(g)}</h2>`; atual = g; }
    h += cartaoOs(o, o.dia < hoje && estadoOs(o) !== "concluida");
  }
  return h;
}
function telaDia() {
  const hoje = hojeISO();
  if (!/^(abertas|agenda|kanban|concluidas)$/.test(E.aba)) E.aba = "abertas";
  const todas = [...E.os.values()].filter((o) => estadoOs(o) !== "cancelada");
  const abertas = todas.filter((o) => estadoOs(o) !== "concluida").sort(porDia);
  const concluidas = todas.filter((o) => estadoOs(o) === "concluida").sort((a, b) => -porDia(a, b));
  const nome = (E.sessao.nome || E.sessao.usuario || "").split(" ")[0];
  const nomeBonito = nome ? nome.charAt(0) + nome.slice(1).toLowerCase() : "";
  const aba = (id, rot, n) => `<button type="button" class="aba" role="tab" aria-selected="${E.aba === id}" data-acao="aba" data-aba="${id}">${rot}${n !== undefined ? ` <span class="conta">${n}</span>` : ""}</button>`;
  let corpo = "";
  if (E.aba === "abertas") {
    corpo = listaAgrupada(abertas, hoje, E.baixadoEm ? "Nenhuma O.S. em aberto com você." : "A agenda ainda não foi baixada neste aparelho.") +
      ((E.atividades || []).length ? `<h2>Minhas atividades</h2><p class="fraco pequeno">Tarefas internas lançadas no SGO+: atrasadas, que vencem até amanhã, em andamento e aguardando.</p>${E.atividades.map(cartaoAtv).join("")}` : "");
  } else if (E.aba === "agenda") {
    const sel = E.agendaDia && E.agendaDia >= hoje ? E.agendaDia : hoje;
    let chips = "";
    for (let i = 0; i < 14; i++) {
      const d = new Date(); d.setDate(d.getDate() + i); const dia = diaISO(d);
      const n = abertas.filter((o) => o.dia === dia).length + (i === 0 ? abertas.filter((o) => o.dia < hoje).length : 0);
      chips += `<button type="button" class="dia-chip" aria-pressed="${dia === sel}" data-acao="agendaDia" data-dia="${dia}"><span>${esc(i === 0 ? "Hoje" : i === 1 ? "Amanhã" : diaCurto(dia))}</span><strong>${n}</strong></button>`;
    }
    const doDia = todas.filter((o) => o.dia === sel || (sel === hoje && o.dia < hoje && estadoOs(o) !== "concluida")).sort(porDia);
    corpo = `<div class="dias" role="group" aria-label="Dias da agenda">${chips}</div>
      <h2 class="grupo-dia">${esc(sel === hoje ? "Hoje · " + diaBR(sel) : diaCurto(sel) + " · " + diaBR(sel))}</h2>
      ${doDia.length ? doDia.map((o) => cartaoOs(o, o.dia < hoje && estadoOs(o) !== "concluida")).join("") : `<div class="info"><p>Nenhuma O.S. agendada para você neste dia.</p></div>`}`;
  } else if (E.aba === "kanban") {
    const col = (id, titulo, lista) => `<section class="kb-col"><h2>${esc(titulo)} <span class="conta">${lista.length}</span></h2>${lista.length ? lista.map((o) => cartaoOs(o, o.dia < hoje && id !== "concluida")).join("") : `<p class="fraco pequeno">Nada aqui.</p>`}</section>`;
    corpo = `<p class="fraco pequeno">Arraste para o lado para ver todas as colunas. A coluna muda sozinha conforme você registra o atendimento (Saí, Cheguei, Concluí).</p>
      <div class="kanban">${col("afazer", "A fazer", abertas.filter((o) => estadoOs(o) === "afazer"))}${col("andamento", "Em andamento", abertas.filter((o) => estadoOs(o) === "andamento"))}${col("aguardando", "Aguardando", abertas.filter((o) => estadoOs(o) === "aguardando"))}${col("concluida", "Concluídas", concluidas.slice(0, 15))}</div>`;
  } else {
    corpo = concluidas.length ? concluidas.map((o) => cartaoOs(o, false)).join("") : `<div class="info"><p>Nenhuma O.S. concluída nos últimos 30 dias.</p></div>`;
  }
  return `<p class="fraco">Olá, ${esc(nomeBonito)}. ${esc(diaBR(hoje))}</p>
    <div class="abas abas-4" role="tablist">${aba("abertas", "Em aberto", abertas.length)}${aba("agenda", "Agenda")}${aba("kanban", "Kanban")}${aba("concluidas", "Concluídas", concluidas.length)}</div>
    <p class="fraco pequeno">${esc(rotuloAtualizado())}</p>
    ${!E.ligada ? `<div class="aviso alerta"><p>A Assistência técnica está desligada no SGO+ pela gestão. O que está guardado continua no aparelho.</p></div>` : ""}
    ${E.erroDia ? `<div class="aviso erro"><p>Não foi possível atualizar a agenda: ${esc(E.erroDia)}</p><p>O que já estava no aparelho continua aqui. Se continuar, avise o supervisor.</p></div>` : ""}
    ${corpo}
    ${E.campo && E.campo.podeAbrir === false ? "" : `<button type="button" class="bt primario bt-novo" data-acao="novoAtendimento">Novo atendimento</button>
    <p class="fraco pequeno" style="text-align:center;margin-top:4px">Atendimento que não estava na agenda: localizar ou cadastrar o cliente e abrir a O.S. aqui. Ela fica no seu nome e aparece em "Em aberto".</p>`}
    <button type="button" class="bt" data-acao="atualizarDia" ${E.baixando ? "disabled" : ""}>${E.baixando ? "Atualizando..." : "Atualizar agenda"}</button>
    <div class="linha-botoes"><button type="button" class="bt" data-acao="irConta">Minha conta</button><button type="button" class="bt" data-acao="ajuda">Como usar</button></div>`;
}

/* ---------------- Minhas atividades (26/10/2026, agenda única) ----------------
 * Atividades internas do técnico (Atividades da equipe do SGO+): iniciar, aguardando, concluir, justificar atraso e comentar.
 * Criar, editar e passar para outra pessoa continuam só no SGO+. Sem internet, vai pela mesma fila das O.S. (osId "ATV:<id>").
 * Se a gestão mudou a atividade antes do envio, vale a mudança dela: o servidor recusa e o motivo aparece em Envios. */
const atvDe = (id) => (E.atividades || []).find((a) => a.id === id) || null;
async function salvarAtividades() { await B.cfg.gravar("atividades|" + usuario(), E.atividades || []); }
/** Lista nova do servidor; o que ainda está na fila do aparelho continua aparecendo como feito aqui. */
async function receberAtividades(lista) {
  const pend = (await B.porUsuario("fila", usuario())).filter((i) => i.estado === "pendente" && /^ATV_/.test(i.tipo));
  const novas = (lista || []).map((a) => {
    const meus = pend.filter((i) => i.dados && i.dados.atividadeId === a.id);
    const b = { ...a, pendente: meus.length > 0 };
    for (const i of meus) aplicarAtvLocal(b, i.tipo, i.dados);
    return b;
  });
  E.atividades = novas;
  await salvarAtividades();
}
function aplicarAtvLocal(a, tipo, d) {
  if (tipo === "ATV_SITUACAO") a.situacao = d.situacao;
  if (tipo === "ATV_JUSTIFICAR") { a.prazo = d.novaPrevisao; a.atrasada = false; a.justificativas = (a.justificativas || 0) + 1; }
}
function seloAtv(a) {
  const env = a.pendente ? " · para enviar" : "";
  if (a.situacao === "Concluída") return `<span class="selo ok">Concluída${env}</span>`;
  return (a.atrasada ? `<span class="selo erro">Atrasada</span> ` : a.venceHoje ? `<span class="selo alerta">Vence hoje</span> ` : "") + `<span class="selo neutro">${esc(a.situacao)}${env}</span>`;
}
function cartaoAtv(a) {
  return `<button type="button" class="cartao" data-acao="abrirAtv" data-atv="${esc(a.id)}">
    <span class="cli">${esc(a.titulo)}</span>
    <span class="linha">Prazo ${esc(dataHora(a.prazo))}${a.prioridade && a.prioridade !== "Normal" ? ` · <strong>${esc(a.prioridade)}</strong>` : ""}</span>
    ${a.cliente ? `<span class="linha fraco">${esc(a.cliente)}</span>` : ""}
    <span>${seloAtv(a)}</span>
  </button>`;
}
function telaAtividade(a) {
  const aberta = a.situacao !== "Concluída", id = esc(a.id);
  const dado = (r, v) => (v ? `<dt>${r}</dt><dd>${v}</dd>` : "");
  const motivos = (E.motivosAtraso || []).map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join("");
  return `<h2>${esc(a.titulo)}</h2>
    <p>${seloAtv(a)}</p>
    ${a.descricao ? `<p style="white-space:pre-wrap">${esc(a.descricao)}</p>` : ""}
    <div class="info"><dl>${dado("Prazo", esc(dataHora(a.prazo)) + (a.prazoOriginal && a.prazoOriginal !== a.prazo ? " (original " + esc(dataHora(a.prazoOriginal)) + ")" : ""))}${dado("Prioridade", esc(a.prioridade))}${dado("Cliente", esc(a.cliente))}${dado("Módulo", esc(a.modulo))}${dado("Lançada por", esc(a.lancadaPor))}${dado("Aguardando", esc(a.situacao === "Aguardando" ? a.motivoAguardando : ""))}${dado("Justificativas", a.justificativas ? String(a.justificativas) : "")}</dl></div>
    ${aberta && a.situacao !== "Em andamento" ? `<button type="button" class="bt" data-acao="atvIniciar" data-atv="${id}">Iniciar</button>` : ""}
    ${aberta ? `<form id="fAtvConcluir" class="caixa" data-atv="${id}"><h3>Concluir</h3>
      <label class="rotulo" for="atvObs">Observação (opcional)</label><textarea class="campo" id="atvObs" maxlength="2000"></textarea>
      <button type="submit" class="bt primario">Concluir atividade</button></form>` : ""}
    ${aberta && a.atrasada ? `<form id="fAtvJust" class="caixa" data-atv="${id}"><h3>Justificar o atraso</h3>
      <label class="rotulo" for="atvCat">Motivo</label><select class="campo" id="atvCat" required><option value="">Escolha o motivo</option>${motivos}</select>
      <label class="rotulo" for="atvMot">O que atrasou (mínimo 15 letras)</label><textarea class="campo" id="atvMot" maxlength="2000" required></textarea>
      <label class="rotulo" for="atvPrev">Nova previsão</label><input class="campo" id="atvPrev" type="datetime-local" required>
      <button type="submit" class="bt primario">Registrar justificativa</button></form>` : ""}
    ${aberta && a.situacao !== "Aguardando" ? `<form id="fAtvAguardando" class="caixa" data-atv="${id}"><h3>Aguardando algo</h3>
      <label class="rotulo" for="atvAg">O que você está aguardando</label><textarea class="campo" id="atvAg" maxlength="2000" required></textarea>
      <button type="submit" class="bt">Marcar como aguardando</button></form>` : ""}
    <form id="fAtvComentar" class="caixa" data-atv="${id}"><h3>Comentário</h3>
      <label class="rotulo" for="atvCom">Andamento, dúvida ou combinado</label><textarea class="campo" id="atvCom" maxlength="4000" required></textarea>
      <button type="submit" class="bt">Enviar comentário</button></form>
    <p class="fraco pequeno">Editar, mudar o prazo ou passar para outra pessoa é feito no SGO+ (Minhas atividades). Sem internet, o que você fizer aqui fica guardado e é enviado depois. Se a gestão mudar a atividade antes, vale a mudança dela e o motivo aparece em Envios.</p>
    <button type="button" class="bt" data-acao="irDia">Voltar ao Meu dia</button>`;
}
/** Guarda a ação da atividade na fila e mostra na hora. */
async function registrarAtv(a, tipo, dados, recadoOk) {
  const d = { atividadeId: a.id, titulo: a.titulo, versao: a.versao, ...dados };
  await registrar("ATV:" + a.id, tipo, d);
  aplicarAtvLocal(a, tipo, d);
  a.pendente = true;
  await salvarAtividades();
  recado(recadoOk);
  render();
}
async function enviarFormAtv(form) {
  const a = atvDe(form.dataset.atv);
  if (!a) { recado("Esta atividade não está mais na sua lista."); return ir("#/dia"); }
  const v = (id) => ($(id) ? $(id).value.trim() : "");
  if (form.id === "fAtvConcluir") return registrarAtv(a, "ATV_SITUACAO", { situacao: "Concluída", observacao: v("atvObs") }, "Atividade concluída.");
  if (form.id === "fAtvAguardando") {
    if (letras(v("atvAg")) < 5) { recado("Escreva o que você está aguardando (mínimo 5 letras)."); $("atvAg").focus(); return; }
    return registrarAtv(a, "ATV_SITUACAO", { situacao: "Aguardando", motivo: v("atvAg") }, "Marcada como aguardando.");
  }
  if (form.id === "fAtvJust") {
    const prev = v("atvPrev");
    if (!v("atvCat")) { recado("Escolha o motivo do atraso."); $("atvCat").focus(); return; }
    if (letras(v("atvMot")) < 15) { recado("Explique o que atrasou (mínimo 15 letras)."); $("atvMot").focus(); return; }
    if (!prev || new Date(prev) <= new Date()) { recado("A nova previsão precisa ser depois de agora."); $("atvPrev").focus(); return; }
    return registrarAtv(a, "ATV_JUSTIFICAR", { categoria: v("atvCat"), motivo: v("atvMot"), novaPrevisao: prev.slice(0, 16) }, "Justificativa registrada.");
  }
  if (form.id === "fAtvComentar") {
    if (letras(v("atvCom")) < 2) { recado("Escreva o comentário."); $("atvCom").focus(); return; }
    return registrarAtv(a, "ATV_COMENTAR", { texto: v("atvCom") }, "Comentário registrado.");
  }
}

function cartaoOs(o, atrasada) {
  const x = E.exec.get(o.osId), pend = E.porOs.get(o.osId) || 0;
  const sit = R.situacaoLocal(o, x, pend);
  const cls = /enviada|Encerrada/.test(sit) ? "ok" : /Cancelada/.test(sit) ? "erro" : /aguardando|atendimento|caminho|pendente/i.test(sit) ? "alerta" : "neutro";
  return `<button type="button" class="cartao" data-acao="abrirOs" data-os="${esc(o.osId)}">
    <span class="cli"><span class="ordem">${esc(o.ordem)}</span>${esc(o.cliente.nome || "Cliente não informado")}</span>
    <span class="linha">${esc([o.horario, o.tipo].filter(Boolean).join(" · "))}${o.prioridade ? ` · <strong>${esc(o.prioridade)}</strong>` : ""}</span>
    ${o.endereco.texto ? `<span class="linha fraco">${esc(o.endereco.texto)}</span>` : ""}
    ${o.equipamento.nome || o.equipamento.tag ? `<span class="linha">${esc([o.equipamento.nome, o.equipamento.tag && "TAG " + o.equipamento.tag].filter(Boolean).join(" · "))}</span>` : ""}
    <span class="selo ${cls}">${esc(sit)}${pend ? " · " + pend + " para enviar" : ""}</span>
    ${o.provisoria ? `<span class="selo alerta">O.S. provisória</span>` : o.abertaEmCampo ? `<span class="selo neutro">Aberta em campo</span>` : ""}
    ${atrasada && !o.provisoria ? `<span class="selo erro">Agendada para ${esc(diaBR(o.dia))}</span>` : ""}
    ${o.saiuDaAgenda ? `<span class="selo alerta">Saiu da sua agenda</span>` : ""}
  </button>`;
}

function passo(osId, chave, nome, feito, estado, falta) {
  return `<li><button type="button" class="passo ${feito ? "feito" : ""} ${falta ? "falta" : ""}" data-acao="passo" data-os="${esc(osId)}" data-passo="${chave}">
    <span class="marca" aria-hidden="true">${feito ? "✓" : ""}</span><span class="nome">${esc(nome)}</span><span class="estado">${esc(estado)}</span></button></li>`;
}

/**
 * Linha de cada passo da O.S. (03/11/2026): feito, estado curto e se falta, a partir de R.faltasPorPasso (a mesma regra do Concluí).
 * Logística: termo no lugar do equipamento e do relato, sem peças, com a assinatura do colaborador.
 */
function linhaPasso(o, x, p, falta) {
  const eq = o.equipamento, f = falta.has(p), rot = R.rotulosLogistica(o), nome = R.nomePasso(o, p);
  const resp = o.checklist.filter((q) => R.respondida(q, x)).length;
  switch (p) {
    case "saida": return passo(o.osId, p, nome, !!x.saida, x.saida ? "às " + hora(x.saida.em) : "Opcional", false);
    case "chegada": return passo(o.osId, p, nome, !!x.chegada, x.chegada ? "às " + hora(x.chegada.em) : "Falta", f);
    case "equipamento": { const ok = !!(x.relato && x.relato.serieConfirmada); return passo(o.osId, p, nome, ok, ok ? (x.relato.identificadoPor === "QR" ? "Pelo QR" : eq.serie && x.relato.serieConfirmada !== eq.serie ? "Série diferente" : "Confirmado") : o.exigencias.qrOuSerie ? "Falta" : "Opcional", f); }
    case "checklist": return passo(o.osId, p, nome, !f, resp + " de " + o.checklist.length, f);
    case "fotos": return passo(o.osId, p, nome, o.exigencias.fotosMin ? !f : x.fotos.length > 0, x.fotos.length + (o.exigencias.fotosMin ? " de " + o.exigencias.fotosMin : ""), f);
    case "pecas": return passo(o.osId, p, nome, x.pecas.length > 0, x.pecas.length ? x.pecas.length + " lançada(s)" : "Nenhuma", false);
    case "relato": { const feito = o.exigencias.relato ? !f : R.textoDoRelato(x.relato).length >= 10; return passo(o.osId, p, nome, feito, feito ? "Feito" : o.exigencias.relato ? "Falta" : "Opcional", f); }
    case "termo": { const n = x.termo ? x.termo.itens.filter((i) => i.descricao || i.identificacao).length : 0; return passo(o.osId, p, nome, !!x.termo && !f, n ? (f ? n + " item(ns), falta completar" : n + " item(ns)") : "Falta", f); }
    case "assinatura": return passo(o.osId, p, nome, !!x.assinatura, x.assinatura ? (x.assinatura.ausente ? "Sem assinatura (motivo)" : "Feita") : o.exigencias.assinatura ? "Falta" : "Opcional", f);
    case "colaborador": return passo(o.osId, p, nome, !!x.assinaturaColab, x.assinaturaColab ? "Feita" : "Falta", f);
    case "setores": { const res = R.resumoRonda(o, x); return passo(o.osId, p, nome, !f && res.equipamentos > 0, res.equipamentos - res.semSituacao + " de " + res.equipamentos + " com situação", f); }
    case "orientacoes": { const r = R.rondaDe(x); return passo(o.osId, p, nome, !!(r.orientacoes || r.pedidosCliente), r.orientacoes || r.pedidosCliente ? "Registrado" : "Opcional", false); }
    case "concluir": { const n = R.faltasParaConcluir(o, x).length; return passo(o.osId, p, nome, !!x.conclusao, x.conclusao ? "às " + hora(x.conclusao.em) : n ? "Falta " + n + " item(ns)" : "Pronto para concluir", false); }
    default: return "";
  }
}

function telaOs(o) {
  const x = execDe(o.osId), eq = o.equipamento, mapa = R.linkMapa(o.endereco);
  const telefone = o.unidade.telefone || o.contato.telefone || o.cliente.telefone;
  const falta = new Set(R.faltasPorPasso(o, x).map(([p]) => p)), prox = R.proximoPasso(o, x, "");
  const aberta = !x.conclusao && !o.fechadaNoServidor;
  return `${o.provisoria ? `<div class="aviso alerta"><p><strong>O.S. provisória até sincronizar.</strong> Ela foi aberta aqui, em campo, sem sinal. O número oficial (OS-AAAA-NNNN) vem do servidor assim que o aparelho enviar; o que você registrar agora fica guardado e entra na O.S. certa.</p></div>`
    : o.abertaEmCampo ? `<div class="aviso info"><p>O.S. aberta em campo (fora da agenda). A gestão foi avisada e acompanha pelo chamado.</p></div>` : ""}
    ${o.saiuDaAgenda && !o.provisoria ? `<div class="aviso alerta"><p>Esta O.S. saiu da sua agenda no servidor. O que você já fez nela continua guardado e será enviado.</p></div>` : ""}
    ${o.fechadaNoServidor ? `<div class="aviso ${o.cancelada ? "erro" : "info"}"><p>${o.cancelada ? "Esta O.S. foi cancelada." : "Esta O.S. está encerrada no servidor."} Ela não aceita mais registros pelo app.</p></div>` : ""}
    ${o.fechadaNoServidor && !o.cancelada ? blocoEnvio(o) : ""}
    ${blocoCorrecao(o, x)}
    <div class="info">
      <p class="cli"><strong>${esc(o.cliente.nome || "Cliente não informado")}</strong></p>
      ${o.unidade.nome ? `<p>${esc(o.unidade.nome)}</p>` : ""}
      ${o.endereco.texto ? `<p>${esc(o.endereco.texto)}</p>` : ""}
      ${o.unidade.responsavel ? `<p>Responsável: ${esc(o.unidade.responsavel)}</p>` : ""}
      ${o.contato.nome ? `<p>Solicitante: ${esc(o.contato.nome)}</p>` : ""}
      <p>${esc([o.tipo, o.horario && "às " + o.horario, o.prioridade].filter(Boolean).join(" · "))}</p>
      ${o.descricao ? `<p><strong>Problema:</strong> ${esc(o.descricao)}</p>` : ""}
      ${o.orientacao ? `<p><strong>Orientação:</strong> ${esc(o.orientacao)}</p>` : ""}
      ${o.chamadoNumero ? `<p class="fraco pequeno">Chamado ${esc(o.chamadoNumero)}</p>` : ""}
    </div>
    <div class="linha-botoes">
      ${mapa ? `<a class="bt" href="${esc(mapa)}" target="_blank" rel="noopener">Abrir no mapa</a>` : ""}
      ${telefone ? `<a class="bt" href="tel:${esc(telefone.replace(/[^\d+]/g, ""))}">Ligar</a>` : ""}
    </div>
    <div class="info"><dl>
      <dt>Equipamento</dt><dd>${esc(eq.nome || "Não informado")}${eq.modelo ? " · " + esc(eq.modelo) : ""}</dd>
      <dt>TAG</dt><dd>${esc(eq.tag || "Não informada")}</dd>
      <dt>Nº de série</dt><dd>${esc(eq.serie || "Não informado")}</dd>
      <dt>Setor</dt><dd>${esc(eq.setor || "Não informado")}</dd>
      ${eq.patrimonio ? `<dt>Patrimônio</dt><dd>${esc(eq.patrimonio)}</dd>` : ""}
    </dl></div>
    ${o.historico.length ? `<h3>Últimos atendimentos do equipamento</h3><div class="info">${o.historico.map((h) => `<p><strong>${esc(h.data.split("-").reverse().join("/"))}</strong> ${esc(h.texto)}${h.origem === "AUVO" ? " <span class=\"fraco\">(Auvo)</span>" : ""}</p>`).join("")}</div>` : ""}
    ${o.pendenciasServidor.length && (x.chegada || x.conclusao) ? `<div class="aviso alerta"><p>O servidor diz que falta: ${esc(o.pendenciasServidor.join("; "))}.</p>${(E.porOs.get(o.osId) || 0) ? "<p class=\"pequeno\">Pode ser só o que ainda não foi enviado deste aparelho.</p>" : ""}</div>` : ""}
    ${R.podeAssinarColabDepois(o, x) ? `<div class="aviso alerta"><p><strong>Falta a sua assinatura.</strong> O servidor só encerra a O.S. com a assinatura do técnico que atendeu.</p><button type="button" class="bt primario" data-acao="passo" data-os="${esc(o.osId)}" data-passo="colaborador">Assinar agora</button></div>` : ""}
    <h2>Passo a passo</h2>
    ${o.logistica ? `<p class="fraco pequeno">${esc(R.rotulosLogistica(o).termo)}: liste o que foi ${esc(R.rotulosLogistica(o).verbo)}, de quem ou para quem, fotografe e colha as duas assinaturas. Campos de manutenção não se aplicam.</p>` : ""}
    ${aberta ? `<button type="button" class="bt primario continuar" data-acao="passo" data-os="${esc(o.osId)}" data-passo="${prox}">${prox === "concluir" ? "Tudo preenchido: ir para o Concluí" : "Continuar: " + esc(R.nomePasso(o, prox))}</button>` : ""}
    <ul class="passos">
      ${R.passosDaOs(o).map((p) => linhaPasso(o, x, p, falta)).join("")}
    </ul>
    ${podeExcluirNoApp(o, x) ? `<details class="excluir-os"><summary>Abri esta O.S. por engano ou em dobro</summary>
      <p class="fraco pequeno">Só dá para excluir antes de começar o atendimento (antes do Saí ou do Cheguei). O chamado sai junto, a gestão é avisada e pode restaurar se precisar.</p>
      <label class="rotulo" for="exMotivo">Motivo (pelo menos 10 letras)</label>
      <textarea class="campo" id="exMotivo" rows="2" maxlength="400" placeholder="Ex.: abri em dobro, o atendimento é a OS-2026-0028"></textarea>
      <button type="button" class="bt perigo" data-acao="excluirOs" data-os="${esc(o.osId)}">Excluir esta O.S.</button></details>` : ""}`;
}
/** 12/11/2026: quem abriu em campo exclui antes de começar (provisória: sai do aparelho; com número: Ast_appExcluirOS). */
function podeExcluirNoApp(o, x) { return !!o && !o.fechadaNoServidor && !(x && (x.saida || x.chegada || x.conclusao)) && (o.provisoria || o.podeExcluir === true); }
async function apagarOsLocal(o) {
  const u = usuario();
  try { await B.apagar("os", u + "|" + o.osId); } catch (e) { /* segue */ }
  const x = E.exec.get(o.osId); if (x) { try { await B.apagar("exec", x.chave); } catch (e) { /* segue */ } E.exec.delete(o.osId); }
  E.os.delete(o.osId);
  await atualizarResumo();
}
async function excluirOsCampo(osId) {
  const o = E.os.get(osId), u = usuario(), campo = $("exMotivo"), motivo = campo ? campo.value.trim() : "";
  if (!o) return;
  if (letras(motivo) < 10) { recado("Escreva o motivo da exclusão (pelo menos 10 letras).", 5000); if (campo) campo.focus(); return; }
  const todosDaOs = (await B.porUsuario("fila", u)).filter((i) => i.idLocal === osId || i.osId === osId);
  const daOs = todosDaOs.filter((i) => i.estado === "pendente");
  if (o.provisoria) {
    const nova = daOs.find((i) => i.tipo === "NOVA_OS");
    if (nova && !nova.tentado) {
      for (const i of daOs) await fila.desistir(u, i.idLocal);
      await apagarOsLocal(o);
      recado("O.S. provisória excluída do aparelho. Nada dela foi enviado ao servidor.", 6000);
      ir("#/dia"); return;
    }
    // 12/11/2026: a abertura foi recusada pelo servidor (ou já saiu da fila): a O.S. só existe no aparelho; antes o app perguntava ao
    // servidor, recebia "não encontrada" e o cartão ficava para sempre em Em aberto
    const abertura = todosDaOs.find((i) => i.tipo === "NOVA_OS");
    if (!abertura || abertura.estado === "cancelado" || (abertura.estado === "recusado" && abertura.definitivo)) {
      for (const i of todosDaOs) await fila.desistir(u, i.idLocal, true);
      await apagarOsLocal(o);
      recado("O.S. provisória excluída do aparelho. O servidor não tinha aceitado a abertura, então nada dela ficou no servidor.", 7000);
      ir("#/dia"); return;
    }
  }
  // 12/11/2026: com itens guardados esperando envio o motivo não é falta de sinal; diz o que fazer
  if (navigator.onLine !== false && podeEnviar() && E.resumo.pendentes > 0) { recado("Antes de excluir, o aparelho precisa enviar o que está guardado (" + E.resumo.pendentes + " item(ns)). Toque em Enviar agora, espere terminar e exclua de novo.", 8000); return; }
  if (!podeChamarDireto() || navigator.onLine === false) { recado("Para excluir uma O.S. que já foi ao servidor precisa de sinal. Tente de novo quando tiver internet.", 7000); return; }
  try {
    const v = await chamar("Ast_appExcluirOS", [E.sessao.sessionId, { osId, motivo }]);
    if (ehSessaoExpirada(v)) { await sessaoExpirou(); return; }
    if (!v || v.ok !== true) { recado((v && v.message) || "O servidor não excluiu a O.S.", 9000); return; }
    for (const i of todosDaOs) await fila.desistir(u, i.idLocal, true);   // 12/11/2026: inclusive o já tentado (não reabre a O.S.)
    await apagarOsLocal(o);
    recado(v.message || "O.S. excluída.", 7000);
    ir("#/dia");
  } catch (e) { recado(e instanceof ErroRede ? "Sem sinal agora. Tente de novo quando tiver internet." : "Não foi possível excluir: " + String(e.message || e), 7000); }
}

/**
 * 18/11/2026 (pedido do dono): corrigir depois de errar. Correção é acréscimo: nada é apagado, tudo fica no histórico da O.S.
 *  - concluída no aparelho (ou no servidor, com a documentação ainda pendente): "Desfazer conclusão para corrigir", com o motivo
 *    (evento DESFAZ_CONCLUSAO); a O.S. volta a aceitar fotos, respostas, relato, peças e assinaturas e o Concluí é feito de novo;
 *  - encerrada no servidor: "Pedir correção", com o motivo (evento PEDIR_CORRECAO, pendência para a gestão da área); quando o dono,
 *    a Diretoria ou o gestor reabre a O.S. no SGO+, o Meu dia traz a reabertura e o app libera os passos de novo.
 */
function blocoCorrecao(o, x) {
  const id = esc(o.osId), ra = o.reaberta;
  let h = "";
  if (ra && !o.fechadaNoServidor) h += `<div class="aviso alerta"><p><strong>Reaberta para correção</strong>${ra.por ? " por " + esc(ra.por) : ""}${ra.em ? " em " + esc(dataHora(ra.em)) : ""}.</p>${ra.motivo ? `<p>Motivo: ${esc(ra.motivo)}</p>` : ""}<p class="pequeno">Corrija o que foi pedido (fotos, respostas, relato, peças ou assinaturas) e toque em Concluí de novo. A correção fica no histórico da O.S.</p></div>`;
  if (o.cancelada || o.provisoria && !x.conclusao) return h;
  if (x.conclusao && !o.fechadaNoServidor) {
    h += `<div class="aviso info correcao"><p><strong>Errou algo?</strong> Enquanto a O.S. não for encerrada no servidor, você pode desfazer a conclusão, corrigir (fotos, respostas, relato, peças, assinaturas) e concluir de novo. O motivo fica no histórico.</p>
      <button type="button" class="bt" data-acao="desfazerConclusao" data-os="${id}">Desfazer conclusão para corrigir</button></div>`;
  } else if (o.fechadaNoServidor) {
    const cp = x.correcaoPedida;
    h += cp ? `<div class="aviso info correcao"><p><strong>Correção pedida</strong>${cp.em ? " em " + esc(dataHora(cp.em)) : ""}: ${esc(cp.motivo)}</p><p class="pequeno">A gestão da área recebe o pedido. Quando ela reabrir a O.S., os passos são liberados de novo aqui (toque em Atualizar no Meu dia).</p></div>`
      : `<div class="aviso info correcao"><p><strong>Precisa corrigir algo?</strong> Esta O.S. já foi encerrada no servidor, então a correção é liberada pela gestão (dono, Diretoria ou gestor da área). Peça aqui com o motivo; quando ela reabrir, você corrige pelo app.</p>
      <button type="button" class="bt" data-acao="pedirCorrecao" data-os="${id}">Pedir correção</button></div>`;
  }
  return h;
}
/** Janela com o motivo (pelo menos 10 letras). Devolve o texto ou null (desistiu). */
async function pedirMotivo(titulo, texto, botao, exemplo) {
  let aviso = "";
  for (;;) {
    const r = await new Promise((ok) => janela(`<h2>${esc(titulo)}</h2><p>${esc(texto)}</p>${aviso ? `<p class="aviso erro">${esc(aviso)}</p>` : ""}
      <label class="rotulo" for="jMotivo">Motivo (pelo menos 10 letras)</label>
      <textarea class="campo" id="jMotivo" rows="3" maxlength="500" placeholder="${esc(exemplo || "")}"></textarea>
      <button type="button" class="bt primario" data-j="ok">${esc(botao)}</button>
      <button type="button" class="bt" data-j="nao">Voltar</button>`, (q, campos) => ok({ q, motivo: String((campos && campos.jMotivo) || "").trim() })));
    if (r.q !== "ok") return null;
    if (letras(r.motivo) >= 10) return r.motivo;
    aviso = "Escreva o motivo com pelo menos 10 letras: o que está errado e o que vai ser corrigido.";
  }
}
async function desfazerConclusao(osId) {
  const o = E.os.get(osId), x = execDe(osId);
  if (!o || !x.conclusao) { render(); return; }
  if (o.fechadaNoServidor) { recado("Esta O.S. já foi encerrada no servidor. Use \"Pedir correção\": a gestão reabre e o app libera de novo.", 7000); render(); return; }
  const motivo = await pedirMotivo("Desfazer a conclusão", "A O.S. volta a aceitar fotos, respostas, relato, peças e assinaturas. Depois de corrigir, toque em Concluí de novo. O motivo fica no histórico da O.S.", "Desfazer conclusão", "Ex.: faltou a foto da plaqueta; assinatura saiu cortada");
  if (motivo === null) return;
  await registrar(osId, "DESFAZ_CONCLUSAO", { motivo });
  x.conclusoesDesfeitas = (x.conclusoesDesfeitas || []).concat([{ em: x.conclusao.em, desfeitaEm: new Date().toISOString(), motivo }]);
  x.conclusao = null;
  await salvarExec(x);
  recado("Conclusão desfeita. Corrija o que precisa e toque em Concluí de novo.", 6000);
  render();
}
async function pedirCorrecao(osId) {
  const o = E.os.get(osId), x = execDe(osId);
  if (!o || !o.fechadaNoServidor || o.cancelada) { render(); return; }
  const motivo = await pedirMotivo("Pedir correção à gestão", "A O.S. " + o.numero + " já foi encerrada. A gestão da área recebe o pedido com o motivo e, se concordar, reabre a O.S. para você corrigir pelo app.", "Pedir correção", "Ex.: mandei a foto errada do equipamento; o nome de quem assinou está errado");
  if (motivo === null) return;
  await registrar(osId, "PEDIR_CORRECAO", { motivo });
  x.correcaoPedida = { em: new Date().toISOString(), motivo };
  await salvarExec(x);
  recado(navigator.onLine === false ? "Pedido guardado no aparelho. Sobe para a gestão quando houver sinal." : "Pedido de correção enviado à gestão.", 6000);
  render();
}

/** O.S. que não aceita mais mudança no aparelho (concluída aqui, encerrada ou cancelada no servidor). */
function bloqueada(osId, passo) {
  const x = E.exec.get(osId), o = E.os.get(osId);
  if (passo === "colaborador" && o && R.podeAssinarColabDepois(o, x)) return false;
  // 18/11/2026: diz o caminho da correção (Desfazer conclusão ou Pedir correção, na tela da O.S.)
  if (o && o.fechadaNoServidor) { recado(o.cancelada ? "Esta O.S. foi cancelada e não aceita registros." : "Esta O.S. está encerrada no servidor. Para corrigir, abra a O.S. e toque em \"Pedir correção\": a gestão reabre e o app libera de novo.", 8000); return true; }
  if (x && x.conclusao) { recado("Esta O.S. está concluída. Para corrigir, abra a O.S. e toque em \"Desfazer conclusão para corrigir\".", 8000); return true; }
  return false;
}
const fechada = (o) => !!(execDe(o.osId).conclusao || o.fechadaNoServidor);
/** 18/11/2026 (hotfix publicado): foto pode entrar depois de concluir no aparelho (o servidor aceita até encerrar; a conclusão com foto faltando fica em documentação pendente). Só a O.S. encerrada ou cancelada no servidor trava. */
function bloqueadaFoto(osId) {
  const o = E.os.get(osId);
  if (o && o.fechadaNoServidor) { recado(o.cancelada ? "Esta O.S. foi cancelada e não aceita fotos." : "Esta O.S. está encerrada no servidor. Para acrescentar ou trocar fotos, abra a O.S. e toque em \"Pedir correção\": a gestão reabre e o app libera de novo.", 8000); return true; }
  return false;
}
const fotoTravada = (o) => !!o.fechadaNoServidor;

function telaEquipamento(o) {
  const x = execDe(o.osId), eq = o.equipamento, rel = x.relato || {}, f = fechada(o) ? "disabled" : "";
  return `<div class="info"><dl>
      <dt>Equipamento</dt><dd>${esc(eq.nome || "Não informado")}</dd>
      <dt>TAG</dt><dd>${esc(eq.tag || "Não informada")}</dd>
      <dt>Nº de série</dt><dd>${esc(eq.serie || "Não informado")}</dd>
      <dt>Setor</dt><dd>${esc(eq.setor || "Não informado")}</dd></dl></div>
    ${rel.serieConfirmada && (rel.identificadoPor === "SEM_IDENT" || rel.serieConfirmada === "SEM SERIE/TAG") ? `<div class="tudo-certo">Confirmado: o equipamento não tem série nem TAG. A gestão completa o cadastro depois.</div>` : rel.serieConfirmada ? `<div class="tudo-certo">Confirmado ${rel.identificadoPor === "QR" ? "pelo QR" : rel.identificadoPor === "TAG" ? "pela TAG" : "pela série"}: ${esc(rel.serieConfirmada)}${eq.serie && rel.serieConfirmada !== eq.serie ? " (diferente do cadastro: a gestão será avisada)" : ""}</div>` : `<p>Confira se este é o equipamento da O.S. antes de começar.</p>`}
    ${temLeitorQr() ? `<button class="bt primario" ${f} data-acao="lerQr" data-os="${esc(o.osId)}">Ler o QR do equipamento</button>` : `<p class="fraco pequeno">Este celular não lê QR pelo app. Confira pela série ou pela TAG.</p>`}
    ${eq.serie ? `<button class="bt ${temLeitorQr() ? "" : "primario"}" ${f} data-acao="serieConfere" data-os="${esc(o.osId)}">A série da etiqueta é ${esc(eq.serie)}</button>` : ""}
    ${eq.tag ? `<button class="bt" ${f} data-acao="tagConfere" data-os="${esc(o.osId)}">A TAG é ${esc(eq.tag)}</button>` : ""}
    <label class="rotulo" for="eqSerie">A série da etiqueta é outra (ou o cadastro não tem): digite</label>
    <input class="campo" id="eqSerie" ${f} maxlength="80" autocomplete="off" autocapitalize="characters">
    <button class="bt" ${f} data-acao="serieDigitada" data-os="${esc(o.osId)}">Confirmar esta série</button>
    <button class="bt" ${f} data-acao="semIdentificacao" data-os="${esc(o.osId)}">O equipamento não tem série nem TAG</button>
    ${seguirOuVoltar(o, "equipamento")}`;
}

function campoPergunta(o, p, x, d) {
  const r = x.respostas[p.id], v = r ? r.valor : "";
  const attrs = `data-os="${esc(o.osId)}" data-p="${esc(p.id)}"`;
  switch (p.tipo) {
    case "SIM_NAO":
      return `<div class="escolha">${R.OPCOES_SIM_NAO.map(([cod, nome]) => `<button type="button" class="bt" ${d} aria-pressed="${v === cod}" data-acao="responder" ${attrs} data-v="${cod}">${nome}</button>`).join("")}</div>`;
    case "OPCAO":
      return `<div class="opcoes">${p.opcoes.map((op) => `<button type="button" class="bt" ${d} aria-pressed="${v === op}" data-acao="responder" ${attrs} data-v="${esc(op)}">${esc(op)}</button>`).join("")}</div>`;
    case "MULTIPLA": {
      const lista = Array.isArray(v) ? v : [];
      return `<p class="fraco pequeno">Pode marcar mais de um.</p><div class="opcoes">${p.opcoes.map((op) => `<button type="button" class="bt" ${d} aria-pressed="${lista.includes(op)}" data-acao="marcar" ${attrs} data-v="${esc(op)}">${lista.includes(op) ? "✓ " : ""}${esc(op)}</button>`).join("")}</div>`;
    }
    case "NUMERO":
      return `<div class="valor-linha"><input class="campo" ${d} inputmode="decimal" enterkeyhint="done" autocomplete="off" data-resposta="numero" ${attrs} value="${esc(R.textoResposta(p, v))}" aria-label="${esc(p.texto)}">${p.unidade ? `<span class="un">${esc(p.unidade)}</span>` : ""}</div>`;
    case "DATA":
      return `<input class="campo" type="date" ${d} data-resposta="data" ${attrs} value="${esc(v)}" aria-label="${esc(p.texto)}">`;
    case "TEXTO":
      return `<textarea class="campo" ${d} rows="3" data-resposta="texto" ${attrs} aria-label="${esc(p.texto)}">${esc(v)}</textarea>`;
    case "FOTO": {
      const fs = x.fotos.filter((f) => f.perguntaId === p.id);
      return `${fs.length ? `<div class="grade-fotos">${fs.map((f) => miniaturaFoto(f, "")).join("")}</div>` : ""}
        <p class="fraco pequeno">${fs.length} de ${p.fotosMin} foto(s)</p>
        <button type="button" class="bt ${fs.length >= p.fotosMin ? "" : "primario"}" ${fotoTravada(o) ? "disabled" : ""} data-acao="camera" ${attrs}>${fs.length ? "Tirar outra foto" : "Tirar foto"}</button>
        <button type="button" class="bt" ${fotoTravada(o) ? "disabled" : ""} data-acao="galeria" ${attrs}>Escolher do celular (uma ou várias)</button>`;
    }
    case "ASSINATURA":
      return x.assinatura ? `<p class="tudo-certo">Assinatura registrada.</p>` : `<button type="button" class="bt primario" data-acao="passo" data-os="${esc(o.osId)}" data-passo="assinatura">Ir para a assinatura</button>`;
    default: return "";
  }
}

function telaChecklist(o) {
  const x = execDe(o.osId), d = fechada(o) ? "disabled" : "";
  if (!o.checklist.length) return `<p>Esta O.S. não tem checklist.</p><button class="bt primario" data-acao="voltarOs" data-os="${esc(o.osId)}">Voltar à O.S.</button>`;
  return `${o.checklistNome ? `<p><strong>${esc(o.checklistNome)}</strong></p>` : ""}<p class="fraco">Cada resposta é guardada na hora, mesmo sem sinal.</p>
    ${o.checklist.map((p) => `<div class="pergunta ${R.respondida(p, x) ? "feita" : ""}"><div class="ptexto">${esc(p.texto)}</div>
        ${p.obrigatorio ? `<div class="obrig">${p.tipo === "FOTO" ? "Foto obrigatória" : "Obrigatória"}</div>` : ""}
        ${p.ajuda ? `<div class="fraco pequeno">${esc(p.ajuda)}</div>` : ""}${campoPergunta(o, p, x, d)}</div>`).join("")}
    ${seguirOuVoltar(o, "checklist")}`;
}

const miniaturaFoto = (f, extra) => `<div class="foto">${f.miniatura ? `<img src="${f.miniatura}" alt="${esc(f.legenda || "Foto")}">` : `<div class="sem-mini">Foto já no servidor</div>`}<div class="leg">${esc(f.legenda || "Sem legenda")}${f.em ? `<br><span class="fraco">${esc(hora(f.em))}</span>` : ""}</div>${extra || ""}</div>`;

function telaFotos(o) {
  const x = execDe(o.osId), f = fotoTravada(o), min = o.exigencias.fotosMin;
  return `<p>${x.fotos.length} foto(s)${min ? " · mínimo " + min : ""}. A foto é reduzida no aparelho e leva a O.S., a data e a hora.</p>
    ${f ? "" : `<button type="button" class="bt primario" data-acao="camera" data-os="${esc(o.osId)}">Tirar foto</button>
    <button type="button" class="bt" data-acao="galeria" data-os="${esc(o.osId)}">Escolher do celular (uma ou várias)</button>`}
    <div class="grade-fotos">${x.fotos.map((ft) => miniaturaFoto(ft, f || ft.doServidor ? "" : `<button type="button" class="bt perigo" data-acao="removerFoto" data-os="${esc(o.osId)}" data-id="${esc(ft.idLocal)}">Remover</button>`)).join("")}</div>
    ${seguirOuVoltar(o, "fotos")}`;
}

function telaPecas(o) {
  const x = execDe(o.osId), f = fechada(o);
  return `${x.pecas.length ? x.pecas.map((p) => `<div class="peca"><div class="desc"><strong>${esc(String(p.quantidade).replace(".", ","))} ${esc(p.unidade || "")} ×</strong> ${esc(p.descricao)}
      <br><span class="selo ${p.situacao === "FALTA" ? "alerta" : "ok"}">${p.situacao === "FALTA" ? "Falta: pedir" + (p.urgencia === "URGENTE" ? " (urgente)" : "") : "Aplicada"}</span>${p.codigo ? ` <span class="fraco pequeno">Código ${esc(p.codigo)}</span>` : ""}</div>
      ${f || p.doServidor ? "" : `<button type="button" class="bt perigo" data-acao="removerPeca" data-os="${esc(o.osId)}" data-id="${esc(p.id)}">Desfazer</button>`}</div>`).join("") : `<p class="fraco">Nenhuma peça lançada nesta O.S.</p>`}
    ${f ? "" : `<h2>Lançar peça</h2>
    <form id="fPeca" data-os="${esc(o.osId)}">
      <div class="escolha" role="radiogroup" aria-label="Situação da peça">
        <button type="button" class="bt" aria-pressed="true" data-acao="situacaoPeca" data-v="APLICADA">Aplicada</button>
        <button type="button" class="bt" aria-pressed="false" data-acao="situacaoPeca" data-v="FALTA">Falta (pedir)</button>
      </div>
      <input type="hidden" id="pSit" value="APLICADA">
      <label class="rotulo" for="pDesc">Peça (nome e especificação, como na plaqueta)</label>
      <input class="campo" id="pDesc" required maxlength="160" autocomplete="off" placeholder="Ex.: Resistência 7 kW 220 V" data-peca-desc="1">
      <p class="fraco pequeno" id="pDica" role="status"></p>
      <label class="rotulo" for="pCod">Código (se tiver)</label>
      <input class="campo" id="pCod" maxlength="60" autocomplete="off" autocapitalize="characters">
      <label class="rotulo" for="pQtd">Quantidade</label>
      <div class="qtd"><button type="button" class="bt" data-acao="qtd" data-d="-1" aria-label="Diminuir">−</button>
        <input class="campo" id="pQtd" inputmode="decimal" value="1" autocomplete="off"><button type="button" class="bt" data-acao="qtd" data-d="1" aria-label="Aumentar">+</button></div>
      <label class="rotulo" for="pUn">Unidade</label>
      <input class="campo" id="pUn" maxlength="12" value="un" autocomplete="off" list="unidadesPeca">
      <datalist id="unidadesPeca">${R.UNIDADES_PECA.map((u) => `<option value="${esc(u)}">`).join("")}</datalist>
      <div id="pUrgBloco" hidden>
        <label class="rotulo">Urgência do pedido</label>
        <div class="escolha"><button type="button" class="bt" aria-pressed="true" data-acao="urgenciaPeca" data-v="NORMAL">Normal</button><button type="button" class="bt" aria-pressed="false" data-acao="urgenciaPeca" data-v="URGENTE">Urgente</button></div>
        <input type="hidden" id="pUrg" value="NORMAL">
        <p class="fraco pequeno">Peça em falta abre o pedido em Compras e a O.S. fica aguardando peça.</p>
      </div>
      <button type="submit" class="bt primario">Lançar peça</button>
    </form>`}
    ${seguirOuVoltar(o, "pecas")}`;
}

/**
 * 13/11/2026 (relatório de excelência): relato na ordem do relatório (encontrou, causa, fez, mediu, testou, como ficou, recomenda),
 * com exemplo em cada campo, medições em linhas (grandeza, valor, unidade, onde), resultado do teste e situação do equipamento ao
 * final em botões, o que ainda falta logo acima do "Guardar" e, com sinal, "Revisar o texto" (IA corrige o português; você decide).
 * Tudo fica no aparelho (rascunho) e sobe pela fila no evento RELATO, como antes.
 */
const relatoVisivel = (x) => { const rel = x.relato || {}, rasc = rel.rascunho || {}; return { ...rel, ...rasc }; };
function campoRelato(o, k, rel, f, linhas) {
  const def = R.CAMPOS_RELATO.find((c) => c[0] === k) || [k, k, ""], exige = o.exigencias.relato && ((o.exigencias.relatoCampos || []).includes(k) || (k === "causa" && o.exigencias.qualidade && o.exigencias.qualidade.causa));
  return `<label class="rotulo" for="r_${k}">${esc(def[1])}${exige ? " <span class=\"obrig\">(obrigatório)</span>" : ""}</label><p class="fraco pequeno">${esc(def[2])}</p>
      <textarea class="campo" id="r_${k}" rows="${linhas || 3}" maxlength="4000" data-relato="${k}" data-os="${esc(o.osId)}" placeholder="${esc(R.EXEMPLOS_RELATO[k] || "")}" ${f}>${esc(rel[k] || "")}</textarea>`;
}
function botoesOpcao(o, k, lista, atual, f) {
  return `<div class="escolha opcoes-relato" role="radiogroup">${lista.map(([v, t]) => `<button type="button" class="bt" aria-pressed="${atual === v}" data-acao="relatoOpcao" data-os="${esc(o.osId)}" data-k="${k}" data-v="${v}" ${f}>${esc(t)}</button>`).join("")}</div>`;
}
function blocoMedicoes(o, rel, f) {
  const l = Array.isArray(rel.medicoes) ? rel.medicoes : [];
  const linha = (m, i) => `<div class="medicao">
      <input class="campo" maxlength="80" placeholder="Grandeza (ex.: tensão entre fases)" aria-label="Grandeza" data-med="${i}" data-mk="grandeza" data-os="${esc(o.osId)}" value="${esc(m.grandeza || "")}" ${f}>
      <div class="valor-linha"><input class="campo" maxlength="40" inputmode="decimal" placeholder="Valor" aria-label="Valor" data-med="${i}" data-mk="valor" data-os="${esc(o.osId)}" value="${esc(m.valor || "")}" ${f}>
        <input class="campo un-med" maxlength="16" list="unidadesMedicao" placeholder="Unidade" aria-label="Unidade" data-med="${i}" data-mk="unidade" data-os="${esc(o.osId)}" value="${esc(m.unidade || "")}" ${f}></div>
      <input class="campo" maxlength="200" placeholder="Onde ou em que condição (ex.: L1-L2 na entrada do quadro)" aria-label="Onde ou em que condição" data-med="${i}" data-mk="obs" data-os="${esc(o.osId)}" value="${esc(m.obs || "")}" ${f}>
      ${f ? "" : `<button type="button" class="bt perigo" data-acao="medTirar" data-os="${esc(o.osId)}" data-i="${i}">Tirar esta medição</button>`}</div>`;
  return `<label class="rotulo">Medições (opcional)</label><p class="fraco pequeno">Tensão, corrente, resistência, temperatura, pressão: o que você mediu entra numa tabela no relatório. Uma linha por medição.</p>
    <datalist id="unidadesMedicao">${R.UNIDADES_MEDICAO.map((u) => `<option value="${esc(u)}">`).join("")}</datalist>
    ${l.map(linha).join("")}${f ? "" : `<button type="button" class="bt" data-acao="medAdd" data-os="${esc(o.osId)}">${l.length ? "Mais uma medição" : "Registrar uma medição"}</button>`}`;
}
function blocoRevisao(o) {
  const rv = E.revisao && E.revisao.osId === o.osId ? E.revisao : null;
  if (!rv) return "";
  const nomes = Object.fromEntries(R.CAMPOS_RELATO.map((c) => [c[0], c[1]]).concat([["resultadoDetalhe", "Restrição ou pendência da liberação"]]));
  const ks = Object.keys(rv.revisado || {});
  return `<div class="aviso info revisao" role="status"><p><strong>Revisão do texto</strong> ${esc(rv.message || "")}</p>
    ${ks.map((k) => `<div class="rev-item"><p class="fraco pequeno">${esc(nomes[k] || k)}</p><p>${esc(rv.revisado[k])}</p>
      <button type="button" class="bt" data-acao="usarRevisao" data-os="${esc(o.osId)}" data-k="${k}">Usar este texto</button></div>`).join("")}
    <div class="linha-botoes">${ks.length > 1 ? `<button type="button" class="bt primario" data-acao="usarRevisao" data-os="${esc(o.osId)}" data-k="*">Usar todos</button>` : ""}
      <button type="button" class="bt" data-acao="fecharRevisao">${ks.length ? "Manter o meu texto" : "Fechar"}</button></div></div>`;
}
function telaRelato(o) {
  const x = execDe(o.osId), f = fechada(o) ? "disabled" : "", rel = relatoVisivel(x), ex = o.exigencias || {};
  const falta = f ? [] : R.faltasDoPasso(o, { ...x, relato: { ...rel, medicoes: R.medicoesValidas(rel.medicoes) } }, "relato");
  return `<p class="fraco">Escreva com as suas palavras, em frases completas: o que encontrou, por quê, o que fez, como testou e como o equipamento ficou. Pode usar o microfone do teclado para ditar.</p>
    ${blocoRevisao(o)}
    ${campoRelato(o, "condicaoEncontrada", rel, f, 3)}${campoRelato(o, "causa", rel, f, 3)}${campoRelato(o, "servicoRealizado", rel, f, 5)}
    ${blocoMedicoes(o, rel, f)}
    ${ex.resultado ? `<label class="rotulo">Resultado do teste funcional <span class="obrig">(obrigatório)</span></label>${botoesOpcao(o, "testeResultado", R.TESTE_RESULTADOS, rel.testeResultado, f)}` : ""}
    ${campoRelato(o, "testeFuncional", rel, f, 3)}
    ${ex.resultado ? `<label class="rotulo">Como o equipamento ficou <span class="obrig">(obrigatório)</span></label><p class="fraco pequeno">Liberado para uso só com o teste aprovado. Se não puder ser usado, ou só com cuidado, diga o motivo e o que falta.</p>
      ${botoesOpcao(o, "resultadoFinal", R.RESULTADOS_FINAIS, rel.resultadoFinal, f)}
      ${rel.resultadoFinal && rel.resultadoFinal !== "LIBERADO" ? `<label class="rotulo" for="r_resultadoDetalhe">${rel.resultadoFinal === "NAO_LIBERADO" ? "O que falta para liberar" : "Qual a restrição de uso"} <span class="obrig">(obrigatório)</span></label>
      <textarea class="campo" id="r_resultadoDetalhe" rows="3" maxlength="1000" data-relato="resultadoDetalhe" data-os="${esc(o.osId)}" placeholder="${esc(R.EXEMPLOS_RELATO.resultadoDetalhe)}" ${f}>${esc(rel.resultadoDetalhe || "")}</textarea>` : ""}` : ""}
    ${campoRelato(o, "recomendacoes", rel, f, 3)}${campoRelato(o, "relato", rel, f, 3)}
    ${falta.length ? `<div class="faltas"><strong>Para o relato ficar completo:</strong><ul>${falta.map((m) => `<li>${esc(m.replace(/^No relato: /, ""))}</li>`).join("")}</ul></div>` : ""}
    <p class="fraco pequeno" id="rSit">${(x.relato || {}).em ? "Guardado às " + esc(hora(x.relato.em)) : "Ainda não guardado"}</p>
    <div class="rodape-acao">${f ? "" : `<button class="bt primario" data-acao="guardarRelato" data-os="${esc(o.osId)}">Guardar relato</button>
      ${navigator.onLine !== false ? `<button class="bt" data-acao="revisarTexto" data-os="${esc(o.osId)}" ${E.revisando ? "disabled" : ""}>${E.revisando ? "Revisando..." : "Revisar o português (precisa de internet)"}</button>` : ""}`}
    <button class="bt" data-acao="voltarOs" data-os="${esc(o.osId)}">Voltar à O.S.</button></div>`;
}

/*
 * 16/11/2026 (decisão do dono, opção B): declaração do termo de entrega de equipamento que passou pela guarda da Metrolabs.
 * declaracaoEntregaTexto tem o MESMO corpo de AstR_declaracaoEntregaTexto_ (SGO_Assistencia_Relatorio.js), que monta o PDF:
 * o texto que a tela mostra antes do quadro é o que sai no termo. A base (retirada, sem termo, nomes a ocultar) vem do servidor em
 * o.declaracaoEntrega; o resto vem do termo e da conferência deste aparelho (o mesmo que sobe ao servidor).
 */
function declaracaoEntregaTexto(d) {
  d = d || {};
  var s = function (v) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim(); };
  var tira = function (t) { var r = s(t); (d.ocultar || []).forEach(function (n) { n = s(n); if (n.length >= 3) r = r.split(n).join('o fabricante'); }); return r; };
  var ponto = function (t) { t = s(t); return t && !/[.!?]$/.test(t) ? t + '.' : t; };
  var estados = { BOM: 'em bom estado', AVARIA: 'com avaria', NA: 'estado não se aplica' };
  var ctp = d.contraparte || {}, quem = tira(ctp.nome) || 'quem recebe', doc = tira(ctp.documento), setor = tira(ctp.setor);
  var p = ['Eu, ' + quem + (doc ? ' (' + doc + ')' : '') + (setor ? ', do setor ' + setor : '') + ', declaro que recebi da Metrolabs o equipamento relacionado abaixo, nas condições descritas neste termo.'];
  var itens = (d.itens || []).filter(function (i) { return i && s(i.descricao); });
  if (!itens.length && s(d.equipamento)) itens = [{ descricao: d.equipamento, quantidade: 1, identificacao: '', estado: '', acessorios: '' }];
  itens.forEach(function (i) {
    var q = Number(i.quantidade) || 1, e = s(i.estado).toUpperCase();
    p.push((q > 1 ? q + 'x ' : '') + tira(i.descricao) + (s(i.identificacao) ? ' (' + tira(i.identificacao) + ')' : '') + ': ' + (estados[e] || 'estado não registrado') +
      (e === 'AVARIA' && s(i.avaria) ? ' (' + tira(i.avaria) + ')' : '') + (s(i.acessorios) ? '; acessórios: ' + tira(i.acessorios) : '') + '.');
  });
  var conf = (d.conferencia || []).filter(function (c) { return c && s(c.texto) && ['FOTO', 'ASSINATURA'].indexOf(s(c.tipo).toUpperCase()) < 0 && s(c.valor) !== ''; }).map(function (c) {
    var v = c.valor === true || s(c.valor).toUpperCase() === 'SIM' ? 'sim' : c.valor === false || s(c.valor).toUpperCase() === 'NAO' ? 'não' : tira(c.valor);
    return s(c.texto).replace(/[?:.\s]+$/, '') + ': ' + v;
  });
  // quem recebe é o hospital: frase com assunto comercial (garantia, protocolo, nota fiscal, rastreio, orçamento, valores) não entra
  var obs = tira(d.observacoes).split(/(?<=[.;])\s+/).filter(function (f) { return f && !/garantia|\bRMA\b|protocolo|nota fiscal|\bNF\b|rastreio|or[çc]amento|R\$/i.test(f); }).join(' ');
  if (conf.length || obs) p.push('Verificações e testes feitos no local, na entrega: ' + (conf.length ? conf.join('; ') + '.' : '') + (obs ? (conf.length ? ' ' : '') + ponto(obs) : ''));
  if (s(d.retiradaEm)) p.push('O equipamento esteve na oficina da Metrolabs de ' + s(d.retiradaEm) + ' até a entrega' + (d.semTermo ? ', retirado sem termo de retirada assinado; esta assinatura confirma também a retirada e esse período.' : '.'));
  return p;
}
/** Dados da declaração com o que está no aparelho (termo no formato de envio e respostas da conferência). */
function dadosDeclaracao(o, x) {
  const b = o.declaracaoEntrega || {}, t = x.termo ? R.termoParaEnvio(x.termo) : { itens: [], contraparte: {}, observacoes: "" };
  return { contraparte: t.contraparte || {}, itens: t.itens || [], observacoes: t.observacoes || "", retiradaEm: b.retiradaEm || "", semTermo: !!b.semTermo, ocultar: b.ocultar || [],
    equipamento: b.equipamento || "",
    conferencia: (Array.isArray(o.checklist) ? o.checklist : []).map((q) => ({ texto: q.texto, tipo: q.tipo, valor: x.respostas[q.id] ? x.respostas[q.id].valor : "" })) };
}
/** Resumo SHA-256 (12 primeiros caracteres) do texto mostrado: vai no evento ASSINATURA e o PDF confere. */
async function marcaDeclaracao(texto) {
  try { const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto)); return Array.from(new Uint8Array(h)).map((v) => v.toString(16).padStart(2, "0")).join("").slice(0, 12); } catch (e) { return ""; }
}
/** Quadro da declaração na tela de assinatura (só no termo de entrega de equipamento que passou pela guarda da Metrolabs). */
function blocoDeclaracao(o, x) {
  if (!o.declaracaoEntrega || !o.logistica || o.logistica.sentido !== "ENTREGA") return "";
  const par = declaracaoEntregaTexto(dadosDeclaracao(o, x));
  return `<section class="declaracao" aria-label="Declaração de quem recebe">
      <h3>Leia com quem vai assinar</h3>
      ${par.map((t, i) => `<p${i > 0 && i < par.length - 1 && !/^(Verificações|O equipamento esteve)/.test(t) ? ' class="item"' : ""}>${esc(t)}</p>`).join("")}
      <p class="fraco pequeno">É o mesmo texto do termo de entrega que vai para o hospital. Se algo estiver errado, volte ao termo e corrija antes de assinar.</p>
    </section>`;
}

function telaAssinatura(o) {
  const x = execDe(o.osId), a = x.assinatura, f = fechada(o);
  const motivos = (E.regras && E.regras.motivosSemAssinatura) || [{ codigo: "RESPONSAVEL_AUSENTE", nome: "Responsável ausente (informar quem recebeu)" }];
  if (a) return `${a.ausente ? `<div class="info"><p><strong>Sem assinatura.</strong> ${esc((motivos.find((m) => m.codigo === a.motivo) || {}).nome || a.motivo)}</p><p>Recebido por: ${esc(a.recebidoPor || "")}</p><p>${esc(a.justificativa || "")}</p></div>`
      : `${a.imagem ? `<img class="assinatura-img" src="${a.imagem}" alt="Assinatura">` : ""}<div class="info"><p><strong>${esc(a.nome)}</strong></p><p>Documento: ${esc(a.documento)}</p>${a.em ? `<p class="fraco">Assinado às ${esc(hora(a.em))}</p>` : ""}</div>`}
    ${f ? "" : `<button class="bt perigo" data-acao="refazerAssinatura" data-os="${esc(o.osId)}">Refazer</button>`}
    ${seguirOuVoltar(o, "assinatura")}`;
  if (f) return `<p>Esta O.S. não aceita mais assinatura pelo app.</p><button class="bt" data-acao="voltarOs" data-os="${esc(o.osId)}">Voltar à O.S.</button>`;
  // logística: quem assina é a pessoa do termo (de quem / para quem); nome e documento já vêm preenchidos
  const ctp = (o.logistica && x.termo && x.termo.contraparte) || {}, rot = R.rotulosLogistica(o);
  return `<p>${o.logistica ? `Peça a ${esc(rot.quem)} para assinar no quadro com o dedo. A assinatura vai para o ${esc(rot.termo.toLowerCase())}.` : "Peça ao responsável para assinar no quadro com o dedo."}</p>
    ${blocoDeclaracao(o, x)}
    <button type="button" class="bt primario" data-acao="assinarCheia" data-nome="aNome">Assinar em tela cheia</button>
    <div class="quadro-moldura"><canvas id="quadro" class="quadro-assinatura" aria-label="Quadro de assinatura"></canvas><div class="quadro-linha" aria-hidden="true"></div></div>
    <button type="button" class="bt" data-acao="limparQuadro">Limpar o quadro</button>
    <label class="rotulo" for="aNome">Nome completo de quem assina (nome e sobrenome)</label>
    <input class="campo" id="aNome" maxlength="120" autocomplete="off" autocapitalize="words" value="${esc(ctp.nome || "")}">
    <label class="rotulo" for="aDoc">Documento: CPF, RG ou matrícula (opcional)</label>
    <input class="campo" id="aDoc" maxlength="40" autocomplete="off" value="${esc(ctp.documento || "")}">
    <button type="button" class="bt primario" data-acao="guardarAssinatura" data-os="${esc(o.osId)}">Guardar assinatura</button>
    <h3>Sem assinatura</h3>
    <p class="fraco">Só use se não houver quem assine. O motivo vai para o ${o.logistica ? "termo" : "relatório"} e para a gestão.</p>
    <label class="rotulo" for="aMotivo">Motivo</label>
    <select class="campo" id="aMotivo">${motivos.map((m) => `<option value="${esc(m.codigo)}">${esc(m.nome)}</option>`).join("")}</select>
    <label class="rotulo" for="aRecebido">${o.logistica ? "Quem acompanhou no local (nome)" : "Quem recebeu o serviço (nome)"}</label>
    <input class="campo" id="aRecebido" maxlength="120" autocomplete="off" autocapitalize="words" value="${esc(ctp.nome || "")}">
    <label class="rotulo" for="aJust">Justificativa</label>
    <textarea class="campo" id="aJust" rows="3" maxlength="500"></textarea>
    <button type="button" class="bt" data-acao="semAssinatura" data-os="${esc(o.osId)}">Registrar sem assinatura</button>
    <div class="rodape-acao"><button class="bt" data-acao="voltarOs" data-os="${esc(o.osId)}">Voltar à O.S.</button></div>`;
}

/** 03/11/2026 (logística): assinatura do colaborador da Metrolabs (quem entrega, na entrega; quem recebe, na retirada). */
function telaColaborador(o) {
  const x = execDe(o.osId), a = x.assinaturaColab, f = fechada(o) && !R.podeAssinarColabDepois(o, x), rot = R.rotulosLogistica(o);
  const nome = (E.sessao && E.sessao.nome) || usuario();
  if (a) return `${a.imagem ? `<img class="assinatura-img" src="${a.imagem}" alt="Sua assinatura">` : ""}<div class="info"><p><strong>${esc(a.nome)}</strong></p>${a.documento ? `<p>Documento: ${esc(a.documento)}</p>` : ""}${a.em ? `<p class="fraco">Assinado às ${esc(hora(a.em))}</p>` : ""}</div>
    ${f ? "" : `<button class="bt perigo" data-acao="refazerColab" data-os="${esc(o.osId)}">Refazer</button>`}
    ${seguirOuVoltar(o, "colaborador")}`;
  if (f) return `<p>Esta O.S. não aceita mais assinatura pelo app.</p><button class="bt" data-acao="voltarOs" data-os="${esc(o.osId)}">Voltar à O.S.</button>`;
  return `<p>${o.logistica ? `Assine com o dedo: no ${esc(rot.termo.toLowerCase())} a sua assinatura fica como <strong>${esc(o.logistica.sentido === "RETIRADA" ? "Recebido por (Metrolabs)" : o.logistica.sentido === "ENVIO" ? "Despachado por (Metrolabs)" : "Entregue por (Metrolabs)")}</strong>, ao lado da de ${esc(rot.quem)}.` : "Assine com o dedo como técnico que atendeu. No relatório a sua assinatura fica como <strong>Técnico responsável</strong>, ao lado da do cliente."}</p>
    <button type="button" class="bt primario" data-acao="assinarCheia" data-nome="cNome">Assinar em tela cheia</button>
    <div class="quadro-moldura"><canvas id="quadro" class="quadro-assinatura" aria-label="Quadro da sua assinatura"></canvas><div class="quadro-linha" aria-hidden="true"></div></div>
    <button type="button" class="bt" data-acao="limparQuadro">Limpar o quadro</button>
    <label class="rotulo" for="cNome">Seu nome completo (nome e sobrenome)</label>
    <input class="campo" id="cNome" maxlength="120" autocomplete="off" autocapitalize="words" value="${esc(nome)}">
    <label class="rotulo" for="cDoc">Documento: CPF, RG ou matrícula (opcional)</label>
    <input class="campo" id="cDoc" maxlength="40" autocomplete="off">
    <button type="button" class="bt primario" data-acao="guardarColab" data-os="${esc(o.osId)}">Guardar minha assinatura</button>
    <div class="rodape-acao"><button class="bt" data-acao="voltarOs" data-os="${esc(o.osId)}">Voltar à O.S.</button></div>`;
}

/** Rodapé dos passos: o botão principal leva ao próximo passo que falta (ou ao Concluí); "Voltar à O.S." fica ao lado. */
function seguirOuVoltar(o, atual) {
  const x = execDe(o.osId);
  if (x.conclusao || o.fechadaNoServidor) return `<div class="rodape-acao"><button class="bt primario" data-acao="voltarOs" data-os="${esc(o.osId)}">Voltar à O.S.</button></div>`;
  const p = R.proximoPasso(o, x, atual), aqui = R.faltasDoPasso(o, x, atual);
  return `${aqui.length ? `<div class="faltas"><strong>Ainda falta neste passo:</strong><ul>${aqui.map((m) => `<li>${esc(m.replace(/^No (relato|termo): /, ""))}</li>`).join("")}</ul></div>` : ""}
    <div class="rodape-acao"><button class="bt primario" data-acao="passo" data-os="${esc(o.osId)}" data-passo="${p}">${p === "concluir" ? "Seguir para o Concluí" : "Seguir: " + esc(R.nomePasso(o, p))}</button>
    <button class="bt" data-acao="voltarOs" data-os="${esc(o.osId)}">Voltar à O.S.</button></div>`;
}

/**
 * 03/11/2026 (logística): termo de entrega, retirada (recebimento) ou envio. Itens com quantidade, identificação, estado aparente
 * (avaria descrita e fotografada) e acessórios; de quem / para quem; local; na retirada, motivo e destino; no envio, transportadora;
 * embalagem, lacre e observações. Tudo fica no aparelho na hora (rascunho); "Guardar o termo" põe na fila e segue para o próximo passo.
 */
function telaTermo(o) {
  const x = execDe(o.osId), d = fechada(o) ? "disabled" : "", rot = R.rotulosLogistica(o), s = o.logistica.sentido;
  const t = x.termo || R.termoInicial(o), id = `data-os="${esc(o.osId)}"`;
  const faltas = R.faltasDoTermo(o, t);
  const sugeridos = [o.unidade.responsavel && ["Responsável da unidade", o.unidade.responsavel], o.contato.nome && ["Quem pediu", o.contato.nome]].filter(Boolean).filter((v, i, a) => a.findIndex((w) => w[1] === v[1]) === i);
  const escolha = (campo, lista, atual, extra) => `<div class="opcoes">${lista.map(([v, n]) => `<button type="button" class="bt" ${d} aria-pressed="${atual === v}" data-acao="termoOpcao" ${id} data-campo="${campo}" ${extra || ""} data-v="${v}">${esc(n)}</button>`).join("")}</div>`;
  const campo = (k, rotulo, valor, attrs) => `<label class="rotulo" for="t_${k}">${esc(rotulo)}</label><input class="campo" id="t_${k}" ${d} data-termo="${k}" ${id} value="${esc(valor || "")}" autocomplete="off" ${attrs || ""}>`;
  return `${x.chegada ? "" : `<div class="aviso info"><p>Você pode preparar o termo antes de chegar. Ele fica no aparelho e vai para o servidor depois do "Cheguei".</p></div>`}
    <h2>${esc(rot.oQue)}</h2>
    ${t.itens.map((i, k) => `<div class="pergunta item-termo ${i.estado ? "feita" : ""}">
      <div class="ptexto">Item ${k + 1}</div>
      <label class="rotulo" for="t_i${k}_descricao">Equipamento, documento ou material</label>
      <input class="campo" id="t_i${k}_descricao" ${d} data-termo="itens.${k}.descricao" ${id} value="${esc(i.descricao)}" maxlength="300" autocomplete="off">
      <div class="duas"><div><label class="rotulo" for="t_i${k}_quantidade">Quantidade</label>
      <input class="campo" id="t_i${k}_quantidade" ${d} data-termo="itens.${k}.quantidade" ${id} value="${esc(i.quantidade)}" inputmode="decimal" maxlength="10" autocomplete="off"></div>
      <div><label class="rotulo" for="t_i${k}_identificacao">Série, patrimônio ou TAG</label>
      <input class="campo" id="t_i${k}_identificacao" ${d} data-termo="itens.${k}.identificacao" ${id} value="${esc(i.identificacao)}" maxlength="200" autocomplete="off" autocapitalize="characters"></div></div>
      <label class="rotulo">Estado aparente</label>
      ${escolha("estado", R.ESTADOS_ITEM, i.estado, `data-item="${k}"`)}
      ${i.estado === "AVARIA" ? `<label class="rotulo" for="t_i${k}_avaria">Descreva a avaria (e fotografe em Fotos)</label><textarea class="campo" id="t_i${k}_avaria" ${d} rows="2" data-termo="itens.${k}.avaria" ${id} maxlength="1000">${esc(i.avaria)}</textarea>` : ""}
      <label class="rotulo" for="t_i${k}_acessorios">Acessórios que acompanham (opcional)</label>
      <input class="campo" id="t_i${k}_acessorios" ${d} data-termo="itens.${k}.acessorios" ${id} value="${esc(i.acessorios)}" maxlength="500" autocomplete="off">
      ${d || t.itens.length < 2 ? "" : `<button type="button" class="bt perigo" data-acao="termoTirarItem" ${id} data-item="${k}">Tirar este item</button>`}
    </div>`).join("")}
    ${d ? "" : `<button type="button" class="bt" data-acao="termoMaisItem" ${id}>Acrescentar outro item</button>`}
    <h2>${esc(rot.contraparte)}</h2>
    ${sugeridos.length && !d ? `<div class="opcoes">${sugeridos.map(([q, n]) => `<button type="button" class="bt" data-acao="termoUsarNome" ${id} data-v="${esc(n)}">${esc(q)}: ${esc(n)}</button>`).join("")}</div>` : ""}
    ${campo("contraparte.nome", "Nome", t.contraparte.nome, 'maxlength="120" autocapitalize="words"')}
    ${campo("contraparte.documento", "Documento ou matrícula (opcional)", t.contraparte.documento, 'maxlength="60"')}
    ${campo("contraparte.setor", "Setor ou cargo (opcional)", t.contraparte.setor, 'maxlength="120"')}
    ${campo("local", "Local ou setor da " + (s === "RETIRADA" ? "retirada" : s === "ENVIO" ? "expedição" : "entrega") + " (opcional)", t.local, 'maxlength="200"')}
    ${s === "RETIRADA" ? `<h2>Motivo e destino</h2>
      <label class="rotulo" for="t_motivo">Motivo da retirada</label><textarea class="campo" id="t_motivo" ${d} rows="2" data-termo="motivo" ${id} maxlength="1000">${esc(t.motivo)}</textarea>
      <label class="rotulo">Para onde vai</label>${escolha("destino", R.DESTINOS_RETIRADA, t.destino)}` : ""}
    ${s === "ENVIO" ? campo("rastreio", "Transportadora e código de rastreio (opcional)", t.rastreio, 'maxlength="200"') : ""}
    <h2>Embalagem e observações</h2>
    <label class="rotulo">Embalagem (opcional)</label>${escolha("embalagem", R.EMBALAGENS, t.embalagem)}
    ${campo("lacre", "Número do lacre (opcional)", t.lacre, 'maxlength="120"')}
    <label class="rotulo" for="t_observacoes">Observações (opcional)</label><textarea class="campo" id="t_observacoes" ${d} rows="3" data-termo="observacoes" ${id} maxlength="3000">${esc(t.observacoes)}</textarea>
    ${faltas.length && !d ? `<div class="faltas" id="tFaltas"><strong>Para o termo ficar completo, falta:</strong><ul>${faltas.map((m) => `<li>${esc(m.replace(/^No termo: /, ""))}</li>`).join("")}</ul></div>` : ""}
    <p class="fraco pequeno" id="tSit">${x.termoEnviadoEm ? "Guardado às " + esc(hora(x.termoEnviadoEm)) : x.termo ? "No aparelho, ainda não guardado" : "Ainda não guardado"}</p>
    <div class="rodape-acao">${d ? "" : `<button class="bt primario" data-acao="guardarTermo" ${id}>Guardar o termo</button>`}
    <button class="bt" data-acao="voltarOs" ${id}>Voltar à O.S.</button></div>`;
}

/**
 * Bloco "Documento e envio" da O.S. encerrada (22/10/2026, etapa 2): o relatório A4 é gerado uma vez só no encerramento; o técnico vê
 * "PDF gerado", "Enviado ao cliente em ..." ou "Ainda não enviado" com o botão. O envio entra na fila como qualquer registro.
 */
function blocoEnvio(o) {
  const e = o.envio || R.normalizarEnvio(null, o.relatorioUrl, o.situacao), x = E.exec.get(o.osId);
  const pendEnvio = !!(x && x.envio && !e.enviadoEm);
  let situacao, cls = "info";
  if (e.enviadoEm) { situacao = `<strong>Enviado ao cliente</strong> em ${esc(dataHora(e.enviadoEm))}${e.enviadoPara ? " para " + esc(e.enviadoPara) : ""}${e.enviadoCanal ? " (" + esc(e.enviadoCanal) + ")" : ""}${e.enviadoPor ? ", por " + esc(e.enviadoPor) : ""}.`; cls = "ok"; }
  else if (pendEnvio) { situacao = `<strong>Envio guardado no aparelho</strong> para ${esc(x.envio.para.map((p) => p.email).join(", "))}. Sobe sozinho quando houver sinal (barra "Pendente de envio").`; cls = "alerta"; }
  else if (e.pdfGerado) { situacao = `<strong>PDF gerado</strong>${e.geradoEm ? " em " + esc(dataHora(e.geradoEm)) : ""}${e.revisao ? " (Rev. " + String(e.revisao).padStart(2, "0") + ")" : ""}. <strong>Ainda não enviado ao cliente.</strong>`; cls = "alerta"; }
  else situacao = "O relatório A4 está sendo gerado no servidor. Atualize a agenda em alguns minutos; depois você envia ao cliente por aqui.";
  return `<div class="aviso ${cls} documento-envio"><h3>Documento e envio</h3><p>${situacao}</p>
    <div class="linha-botoes">
      ${e.relatorioUrl ? `<a class="bt" href="${esc(e.relatorioUrl)}" target="_blank" rel="noopener">Ver relatório</a>` : ""}
      ${e.pdfGerado && e.podeEnviar && !e.enviadoEm && !pendEnvio ? `<button type="button" class="bt primario" data-acao="irEnviar" data-os="${esc(o.osId)}">Enviar ao cliente por e-mail</button>` : ""}
      ${e.enviadoEm && e.podeEnviar ? `<button type="button" class="bt" data-acao="irEnviar" data-os="${esc(o.osId)}">Enviar de novo</button>` : ""}
    </div></div>`;
}

/** Tela "Enviar ao cliente": contatos do cadastro com o e-mail conferível, outro e-mail editável, prévia curta e um toque em Enviar. */
function telaEnviar(o) {
  const e = o.envio || R.normalizarEnvio(null, o.relatorioUrl, o.situacao), x = execDe(o.osId);
  if (!e.pdfGerado) return `<div class="aviso alerta"><p>O relatório desta O.S. ainda não foi gerado no servidor (a O.S. precisa estar encerrada). Atualize a agenda e tente de novo.</p></div><button class="bt" data-acao="voltarOs" data-os="${esc(o.osId)}">Voltar à O.S.</button>`;
  const ja = x.envio ? x.envio.para.map((p) => p.email) : [];
  return `<div class="info"><p><strong>${esc(o.numero)}</strong> · ${esc(o.cliente.nome)}${o.unidade.nome ? " · " + esc(o.unidade.nome) : ""}</p>
    <p class="fraco pequeno">O PDF do ${o.logistica ? esc(R.rotulosLogistica(o).termo.toLowerCase()) : "relatório de atendimento"} vai anexado num e-mail da Metrolabs, com o número do chamado no assunto. O envio fica registrado na O.S.</p></div>
    ${e.enviadoEm ? `<div class="aviso ok"><p>Já enviado em ${esc(dataHora(e.enviadoEm))} para ${esc(e.enviadoPara)}. Enviar de novo manda outra cópia.</p></div>` : ""}
    <h2>Para quem enviar</h2>
    ${e.contatos.length ? e.contatos.map((k) => `<label class="opcao"><input type="checkbox" class="chk" data-email="${esc(k.email)}" data-nome="${esc(k.nome)}" ${k.sugerido || ja.includes(k.email) ? "checked" : ""}><span><strong>${esc(k.nome || k.email)}</strong><br><span class="pequeno">${esc(k.email)} · ${esc(k.origem)}</span></span></label>`).join("")
      : `<div class="aviso alerta"><p>O cadastro do cliente não tem e-mail. Digite abaixo o e-mail do responsável e confira com ele; a gestão completa o cadastro depois.</p></div>`}
    <label class="rotulo" for="envOutro">Outro e-mail (opcional; confira com o cliente)</label>
    <input class="campo" id="envOutro" type="email" inputmode="email" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="nome@empresa.com.br">
    <p class="fraco pequeno">Assunto: ${o.logistica ? esc(R.rotulosLogistica(o).termo) : "Relatório de atendimento técnico"} ${esc(o.numero)}${o.chamadoNumero ? " | Chamado " + esc(o.chamadoNumero) : ""} | ${esc(o.cliente.nome)}</p>
    <button type="button" class="bt primario" data-acao="enviarCliente" data-os="${esc(o.osId)}">Enviar</button>
    <button class="bt" data-acao="voltarOs" data-os="${esc(o.osId)}">Voltar à O.S.</button>`;
}

function telaConcluir(o) {
  const x = execDe(o.osId);
  if (x.conclusao) return `<div class="tudo-certo">O.S. concluída às ${esc(hora(x.conclusao.em))}.</div>
    <p>${(E.porOs.get(o.osId) || 0) && !(x.envio && !(o.envio && o.envio.enviadoEm)) ? "Ainda há itens desta O.S. para enviar. Eles sobem sozinhos quando houver sinal." : o.situacao === "DOC_PENDENTE" ? "Enviado. O servidor marcou documentação pendente: " + esc(o.pendenciasServidor.join("; ") || "veja com o supervisor") + "." : o.situacao === "ENCERRADA" ? "Tudo desta O.S. já foi enviado. A O.S. está encerrada no servidor." : "Tudo desta O.S. já foi enviado."}</p>
    ${o.situacao === "ENCERRADA" ? blocoEnvio(o) : ""}
    ${R.podeAssinarColabDepois(o, x) ? `<div class="aviso alerta"><p><strong>Falta a sua assinatura.</strong> O servidor só encerra a O.S. com a assinatura do técnico que atendeu.</p><button type="button" class="bt primario" data-acao="passo" data-os="${esc(o.osId)}" data-passo="colaborador">Assinar agora</button></div>` : ""}
    <button class="bt primario" data-acao="irDia">Ir para o Meu dia</button>`;
  if (o.fechadaNoServidor) return `<p>Esta O.S. já está ${o.cancelada ? "cancelada" : "encerrada"} no servidor.</p>${o.cancelada ? "" : blocoEnvio(o)}<button class="bt primario" data-acao="irDia">Ir para o Meu dia</button>`;
  // 03/11/2026: o que falta vem por passo, cada um com o botão que leva direto a ele (antes era só a lista e a pessoa voltava procurando)
  const fp = R.faltasPorPasso(o, x), f = fp.flatMap(([, t]) => t);
  return `${f.length ? `<div class="faltas"><strong>Para concluir, falta:</strong>${fp.map(([p, t]) => `<div class="falta-passo"><ul>${t.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
      <button type="button" class="bt" data-acao="passo" data-os="${esc(o.osId)}" data-passo="${p}">${p === "chegada" ? "Registrar a chegada" : "Ir para: " + esc(R.nomePasso(o, p))}</button></div>`).join("")}</div>` : `<div class="tudo-certo">Tudo pronto para concluir.</div>`}
    <div class="info"><p>${o.ronda ? (() => { const rr = R.resumoRonda(o, x); return `${rr.equipamentos} equipamento(s) em ${rr.setores} setor(es): ${rr.por.FUNCIONANDO} em funcionamento, ${rr.por.OBSERVACAO} com observação, ${rr.por.FORA_USO} fora de uso, ${rr.por.NAO_LOCALIZADO} não localizado(s), ${rr.por.NAO_VERIFICADO} não verificado(s); ${rr.fotos} foto(s).`; })() : o.logistica ? `${x.termo ? x.termo.itens.filter((i) => i.descricao || i.identificacao).length : 0} item(ns) no termo, ${x.fotos.length} foto(s), ${[x.assinatura, x.assinaturaColab].filter(Boolean).length} assinatura(s).` : `${x.fotos.length} foto(s), ${x.pecas.length} peça(s), ${Object.keys(x.respostas).length} resposta(s) do checklist.`}</p>
    <p class="fraco pequeno">Depois de concluir, a O.S. não pode mais ser mudada neste aparelho.</p></div>
    <button type="button" class="bt ok" data-acao="concluir" data-os="${esc(o.osId)}" ${f.length ? "aria-disabled=\"true\"" : ""}>Concluí</button>
    <button class="bt" data-acao="voltarOs" data-os="${esc(o.osId)}">Voltar à O.S.</button>`;
}

async function telaEnvios() {
  const lista = (await B.porUsuario("fila", usuario())).filter((i) => i.estado !== "cancelado").sort((a, b) => b.ordem - a.ordem);
  const pend = lista.filter((i) => i.estado === "pendente"), rec = lista.filter((i) => i.estado === "recusado"), env = lista.filter((i) => i.estado === "enviado").slice(0, 30);
  const nomeOs = (id) => { const o = E.os.get(id); return o ? o.numero + (o.cliente.nome ? " · " + o.cliente.nome : "") : id ? "O.S. " + id : ""; };
  // cadastro feito em campo: o que foi cadastrado; O.S. aberta em campo: o número oficial quando já existe, senão "O.S. provisória"
  const rotulo = (i) => {
    if (i.tipo === "CADASTRO") { const d = (i.dados && i.dados.dados) || {}, t = (i.dados && i.dados.tipo) || ""; return (t === "CLIENTE" ? "Cliente " : t === "UNIDADE" ? "Unidade " : "Equipamento ") + (d.nome || d.tipo || "") + (i.estado === "enviado" && i.existente ? " (já existia)" : ""); }
    if (/^ATV_/.test(i.tipo)) return "Atividade" + (i.dados && i.dados.titulo ? " · " + i.dados.titulo : "");
    if (i.tipo === "NOVA_OS") { const o = E.os.get(i.idReal || "") || E.os.get(i.osId); return o && !o.provisoria ? o.numero + (o.cliente.nome ? " · " + o.cliente.nome : "") : "O.S. provisória" + (i.dados && i.dados.sintoma ? " · " + String(i.dados.sintoma).slice(0, 40) : ""); }
    return nomeOs(i.osId);
  };
  const item = (i) => `<div class="envio ${i.estado}"><strong>${esc(NOMES_TIPO[i.tipo] || i.tipo)}</strong> · ${esc(rotulo(i))}<br>
    <span class="pequeno">Feito em ${esc(dataHora(i.criadoEm))}${i.estado === "enviado" ? " · enviado em " + esc(dataHora(i.enviadoEm)) : ""}${i.tentativas && i.estado !== "enviado" ? " · " + i.tentativas + " tentativa(s)" : ""}</span>
    ${i.ultimoErro && i.estado !== "enviado" ? `<br><span class="pequeno"><strong>${i.estado === "recusado" ? "Motivo:" : "Última tentativa:"}</strong> ${esc(i.ultimoErro)}</span>` : ""}
    ${i.corrigir && i.estado === "recusado" ? `<br><span class="pequeno"><strong>O que fazer:</strong> ${esc(i.corrigir)}</span>` : ""}
    ${i.estado === "recusado" ? (i.definitivo ? `<br><span class="pequeno">Não adianta reenviar. Fica guardado aqui como registro; fale com o supervisor.</span>` : `<button class="bt" data-acao="tentarDeNovo" data-id="${esc(i.idLocal)}">Tentar de novo</button>`) : ""}</div>`;
  let espaco = "";
  try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); espaco = "Espaço usado pelo app neste aparelho: " + (Math.round((e.usage || 0) / 1048576 * 10) / 10).toLocaleString("pt-BR") + " MB."; } } catch (e) { /* segue */ }
  const ue = E.ultimoEnvio;
  return `<p>${pend.length ? pend.length + " item(ns) guardado(s) no aparelho esperando envio." : "Nada pendente de envio."}</p>
    <p class="fraco pequeno">${E.resumo.ultimoEnvio ? "Último envio confirmado: " + esc(dataHora(E.resumo.ultimoEnvio)) + ". " : ""}Nada é apagado do aparelho antes do servidor confirmar.</p>
    ${ue && (ue.parouPor === "erro" || ue.parouPor === "bloqueado") && pend.length ? `<div class="aviso erro"><p>O último envio parou: ${esc(ue.motivo)}</p><p>O app tenta de novo sozinho. Se continuar, avise o supervisor.</p></div>` : ""}
    <button class="bt primario" data-acao="enviarAgora" ${E.enviando ? "disabled" : ""}>${E.enviando ? "Enviando..." : "Enviar agora"}</button>
    ${rec.length ? `<h2>Recusados pelo servidor (${rec.length})</h2><p class="fraco">Continuam guardados. Veja o motivo e o que fazer; se não souber resolver, avise o supervisor.</p>${rec.map(item).join("")}` : ""}
    ${pend.length ? `<h2>Esperando envio (${pend.length})</h2>${pend.map(item).join("")}` : ""}
    ${env.length ? `<h2>Enviados</h2>${env.map(item).join("")}` : ""}
    <p class="fraco pequeno">${esc(espaco)}</p>`;
}

function telaConta() {
  const s = E.sessao, arm = E.arm || {};
  return `<div class="info"><dl><dt>Nome</dt><dd>${esc(s.nome)}</dd><dt>E-mail</dt><dd>${esc(s.email || "não informado")}</dd>
    <dt>Sessão</dt><dd>${s.expirada ? "Terminou: entre de novo" : s.renovadaEm ? "Confirmada às " + esc(hora(new Date(s.renovadaEm).toISOString())) : "Ainda não confirmada"}</dd>
    <dt>Armazenamento</dt><dd>${arm.persistente ? "Garantido pelo navegador" : "Não garantido pelo navegador"}</dd>
    <dt>Instalado</dt><dd>${arm.instalado ? "Sim" : "Não (aberto no navegador)"}</dd>
    <dt>Versão</dt><dd>${esc(VERSAO)}</dd></dl></div>
    ${E.instalar ? `<button class="bt primario" data-acao="instalar">Instalar o app neste celular</button>` : ""}
    <button class="bt" data-acao="letra">${document.documentElement.dataset.letra === "grande" ? "Letra normal" : "Letra grande"}</button>
    ${s.expirada ? `<button class="bt primario" data-acao="irEntrar">Entrar de novo</button>` : ""}
    <button class="bt perigo" data-acao="sair">Sair</button>
    <p class="fraco pequeno">Sair não apaga o que está guardado para envio. Quando você entrar de novo neste aparelho, o envio continua.</p>`;
}

function telaAjuda() {
  return `<div class="ajuda">
  <section id="aj-instalar"><h2>Instalar no celular</h2>
    <p><strong>Android (Chrome):</strong> abra o endereço do SGO+ Campo, entre com o seu e-mail e toque em "Instalar" (ou no menu de três pontos e em "Instalar aplicativo" / "Adicionar à tela inicial").</p>
    <p><strong>iPhone (Safari):</strong> abra o endereço no Safari, toque em Compartilhar (o quadrado com a seta para cima) e em "Adicionar à Tela de Início". Use sempre o ícone da Tela de Início: assim o iPhone não apaga o que está guardado.</p>
    <p>O ícone do aplicativo é o símbolo da Metrolabs (os três hexágonos). Quem instalou antes de 22/10/2026 ainda vê o ícone antigo: espere "Pendente de envio (0)", remova o ícone antigo e instale de novo.</p>
  </section>
  <section id="aj-dia"><h2>Meu dia</h2>
    <ul><li>Mostra as suas O.S. de hoje (e as que ficaram abertas de dias anteriores) e as de amanhã, na ordem do supervisor.</li>
    <li>Abra o app com internet ao menos uma vez por dia (de preferência antes de sair) para baixar a agenda.</li>
    <li>Toque na O.S. para ver cliente, endereço, equipamento e o passo a passo. "Abrir no mapa" abre o aplicativo de mapas do celular; "Ligar" liga para o local.</li></ul>
  </section>
  <section id="aj-atividades"><h2>Minhas atividades</h2>
    <p>Abaixo das O.S. de hoje aparecem as suas tarefas internas lançadas no SGO+: as atrasadas, as que vencem até amanhã, as em andamento e as aguardando.</p>
    <p>Toque na atividade para iniciar, marcar como aguardando (escreva o que aguarda), concluir, justificar o atraso (motivo, explicação e nova previsão) ou comentar. Funciona sem internet: fica guardado e é enviado depois.</p>
    <p>Editar, mudar o prazo ou passar para outra pessoa é feito no SGO+. Se a gestão mudar a atividade antes do envio, vale a mudança dela e o motivo aparece em Envios.</p>
  </section>
  <section id="aj-novo"><h2>Novo atendimento (fora da agenda)</h2>
    <p>Surgiu um atendimento que não estava no Meu dia (equipamento ao lado, pedido do responsável, cliente novo)? Toque em <strong>Novo atendimento</strong>, no fim do Meu dia, e siga os quatro passos:</p>
    <ol><li><strong>Cliente:</strong> busque pelo nome, CNPJ, TAG ou série (a busca precisa de internet). Achou: toque em "Escolher". Não achou: "Não encontrei: cadastrar o cliente" (nome; CNPJ com "Consultar" para preencher a razão social e o endereço; contato; telefone; e-mail).</li>
    <li><strong>Unidade:</strong> escolha na lista ou cadastre (nome e endereço; "Usar a minha localização" guarda as coordenadas do aparelho; para cliente novo, "Mesmo endereço do cliente").</li>
    <li><strong>Equipamento:</strong> escolha na lista (filtre por TAG, série ou tipo) ou cadastre (tipo; fabricante, modelo, série, TAG, setor e patrimônio quando souber).</li>
    <li><strong>Abrir a O.S.:</strong> tipo de serviço, problema relatado, quem pediu, prioridade e se o equipamento está parado. Confira o resumo e toque em "Abrir a O.S.".</li></ol>
    <p>A O.S. aparece no Meu dia e o atendimento segue igual aos outros (Cheguei, checklist, fotos, relato, peças, assinatura, Concluí). Retirada, entrega e envio seguem pelo termo (veja "Retirada, entrega e envio de equipamento"). O chamado nasce com a triagem feita em campo e a gestão é avisada.</p>
    <p><strong>Sem sinal:</strong> a busca não funciona, mas o cadastro e a abertura funcionam: a O.S. fica "provisória" e ganha o número oficial quando o aparelho enviar. Nunca é criado cadastro em dobro: o servidor confere CNPJ, nome, série e TAG e, se já existir, usa o existente e avisa ("já cadastrado como...").</p>
    <p>Todo cadastro feito em campo fica marcado "criado em campo" para a gestão conferir depois; nada é bloqueado por isso.</p>
  </section>
  <section id="aj-atendimento"><h2>Atendimento, passo a passo</h2>
    <ol><li><strong>Saí para o atendimento</strong> (opcional): ao sair para o cliente.</li>
    <li><strong>Cheguei:</strong> ao chegar no cliente. A localização é registrada só neste toque e no "Concluí", nunca o tempo todo.</li>
    <li><strong>Confirmar equipamento:</strong> leia o QR (Android) ou confira a série ou a TAG. Série diferente do cadastro é aceita e a gestão é avisada.</li>
    <li><strong>Checklist:</strong> responda cada pergunta. As obrigatórias estão marcadas. Pergunta com foto abre a câmera.</li>
    <li><strong>Fotos:</strong> tire pela câmera. A foto é reduzida no aparelho (cerca de 300 KB) e leva a O.S., a data e a hora. Escreva uma legenda curta.</li>
    <li><strong>Peças:</strong> "Aplicada" para a peça usada; "Falta (pedir)" abre o pedido em Compras. Lançou errado: "Desfazer". Escreva o nome e a especificação como na plaqueta (ex.: Resistência 7 kW 220 V) e escolha a unidade (un, pç, par, conj., kit).</li>
    <li><strong>Relato:</strong> condição encontrada, causa ou diagnóstico, serviço realizado, medições, teste funcional, como o equipamento ficou, recomendações e observações. Cada campo mostra um exemplo. Nos serviços técnicos, os textos têm um mínimo de palavras (condição encontrada 4, causa 3 na corretiva, serviço realizado 5) e são obrigatórios o <strong>resultado do teste</strong> (aprovado, reprovado ou não realizado, com o motivo) e a <strong>situação do equipamento ao final</strong> (liberado para uso, liberado com restrição ou não liberado, com o que falta). "Liberado para uso" só com o teste aprovado: o relatório mostra esse resultado no topo, para o cliente. Toque em "Guardar relato": o app guarda e já leva ao próximo passo que falta. Se ainda faltar algo no relato, a lista "Para o relato ficar completo" diz o quê.</li>
    <li><strong>Medições:</strong> "Registrar uma medição" abre uma linha com a grandeza (ex.: tensão entre fases), o valor, a unidade e onde foi medido (ex.: L1-L2 na entrada do quadro). Cada linha vira uma linha da tabela "Medições realizadas" no relatório. Funciona sem sinal, como o resto do relato.</li>
    <li><strong>Revisar o português:</strong> com internet, o botão pede à IA do SGO+ para corrigir a ortografia e organizar as frases do que você escreveu. Ela não acrescenta fatos nem números; você vê o texto revisado e toca em "Usar este texto" só se o sentido continuar o mesmo. Sem sinal ou sem a IA ligada, o relato segue normalmente.</li>
    <li><strong>Assinatura do cliente:</strong> o responsável assina no quadro com o nome completo (nome e sobrenome). O documento (CPF, RG ou matrícula) é opcional; se for preenchido, o app confere. Sem quem assine, use "Registrar sem assinatura" com quem recebeu e a justificativa.</li>
    <li><strong>Sua assinatura (técnico que atendeu):</strong> toda O.S. tem também a assinatura de quem atendeu pela Metrolabs, com o nome completo; documento opcional. Sem ela a O.S. não fecha. Se a O.S. já foi concluída e o servidor ainda pedir a sua assinatura, toque em "Assinar agora" na O.S.</li>
    <li><strong>Concluí:</strong> só libera quando não falta nada; a tela diz o que falta, passo por passo, com o botão "Ir para" que leva direto a ele. Depois de concluir, a O.S. não muda mais no aparelho.</li>
    <li><strong>Documento e envio:</strong> quando o servidor encerra a O.S., o bloco mostra "PDF gerado, ainda não enviado" ou "Enviado ao cliente em ...". "Ver relatório" abre o PDF; "Enviar ao cliente por e-mail" mostra os contatos do cadastro com o e-mail para conferir (dá para acrescentar outro) e manda o PDF num e-mail da Metrolabs. O envio entra na fila como qualquer registro e nunca sai duas vezes.</li></ol>
    <p><strong>Continuar:</strong> na O.S., o botão "Continuar" abre o próximo passo que falta. No fim de cada passo, "Seguir" leva ao seguinte, sem precisar voltar à O.S. a cada um.</p>
    <p><strong>Antes do "Cheguei":</strong> checklist, fotos, relato e assinatura só valem depois da chegada. Se abrir um deles antes, o app pergunta se quer registrar a chegada agora. Registro que o servidor recusou só porque a chegada ainda não tinha subido volta sozinho para a fila depois do "Cheguei".</p>
  </section>
  <section id="aj-logistica"><h2>Retirada, entrega e envio de equipamento</h2>
    <p>Nas O.S. de logística (entrega, retirada, entrada para calibração, envio) o formulário é o <strong>termo</strong>, não o relato de manutenção. Condição encontrada, causa, teste funcional, peças e conferência de QR ou série não se aplicam e não travam o Concluí.</p>
    <ol><li><strong>Cheguei</strong> no local. O termo pode ser preparado antes: fica no aparelho e sobe depois da chegada.</li>
    <li><strong>Termo:</strong> o que está sendo entregue ou retirado. O equipamento da O.S. já vem como item 1; acrescente outros itens se houver (acessórios, documentos, insumos). Para cada item: quantidade, série, patrimônio ou TAG, estado aparente (bom, com avaria ou não se aplica; avaria pede a descrição e a foto) e acessórios. Depois, de quem ou para quem (nome, documento ou matrícula, setor) e o local. Na retirada: o motivo e para onde vai (oficina, calibração, qualificação, análise). Embalagem, lacre e observações quando houver. Toque em "Guardar o termo".</li>
    <li><strong>Conferência</strong> (checklist): as respostas que o termo já diz (conferido, estado, acessórios) vêm preenchidas; confira e mude se precisar.</li>
    <li><strong>Fotos:</strong> do que foi entregue ou retirado e de cada avaria.</li>
    <li><strong>Assinatura de quem recebe</strong> (entrega) ou <strong>de quem entrega</strong> (retirada): nome e documento já vêm do termo.</li>
    <li><strong>Sua assinatura:</strong> o colaborador da Metrolabs assina como quem entrega (entrega) ou quem recebe (retirada). Nas duas assinaturas: nome completo obrigatório, documento opcional.</li>
    <li><strong>Concluí.</strong> O documento gerado é o "Termo de entrega" ou o "Termo de retirada (recebimento)", com os itens e as duas assinaturas, e vai ao cliente como o relatório.</li></ol>
  </section>
  <section id="aj-ronda"><h2>Ronda de engenharia clínica</h2>
    <p>A ronda aparece no Meu dia como as outras O.S. (agendada pela gestão, avulsa ou pelo contrato de ronda). É feita só por técnico ou engenheiro.</p>
    <ol><li><strong>Cheguei</strong> na unidade. Os setores e os equipamentos do cadastro ficam fixos a partir daqui.</li>
    <li><strong>Setores e equipamentos:</strong> abra um setor por vez; o selo mostra quantos equipamentos já têm situação.</li>
    <li>Em cada equipamento, <strong>um toque</strong> na situação: Em funcionamento, Com observação, Fora de uso ou com defeito, Não localizado ou Não verificado.</li>
    <li><strong>Com observação</strong> e <strong>Fora de uso</strong> pedem a descrição e a foto do problema. No <strong>Fora de uso</strong>, diga também se o equipamento está <strong>parado</strong> (não pode ser usado) ou se <strong>funciona com defeito ou limitação</strong>: isso define a prioridade do chamado que nasce da ronda. <strong>Não verificado</strong> pede o motivo. Fotografe só o equipamento, nunca paciente nem documento de paciente.</li>
    <li>Autoclave, lavadora, câmara fria ou refrigerador e seladora têm <strong>perguntas fixas</strong> (porta, registro de ciclo, etiqueta de calibração, alarme...). Uma resposta "Não" não combina com "Em funcionamento": marque "Com observação" ou "Fora de uso".</li>
    <li>Equipamento que está no setor e não está na lista: <strong>Equipamento fora do cadastro</strong> (tipo, série ou TAG, setor) e depois a situação e a foto. Setor que não está na lista: <strong>Acrescentar setor</strong>.</li>
    <li><strong>Achados gerais do setor</strong> (texto e foto), opcional. "Setor concluído" leva ao próximo setor que falta.</li>
    <li><strong>Orientações e resumo:</strong> as orientações dadas à equipe e os pedidos do cliente; o resumo em números sai sozinho.</li>
    <li><strong>Duas assinaturas:</strong> o responsável do cliente e você, com o nome completo (documento opcional). Depois, <strong>Concluí</strong>.</li></ol>
    <p>Depois de encerrada, o equipamento fora de uso vira chamado sozinho (um por equipamento, sem repetir) e o relatório da ronda vai para a gestão e para o cliente. Sem sinal, tudo fica guardado e sobe depois, na ordem.</p>
  </section>
  <section id="aj-fotos"><h2>Fotos: câmera e galeria</h2>
    <ul><li><strong>Tirar foto</strong> abre a câmera; <strong>Escolher do celular</strong> abre a galeria e aceita até 20 fotos de uma vez. A foto é reduzida no aparelho e leva a O.S., a data e a hora.</li>
    <li>Se aparecer "A foto não chegou ao app", o celular fechou o app enquanto a câmera estava aberta (falta de memória). Feche os outros aplicativos e tente de novo; se repetir, tire a foto pela câmera do celular e use "Escolher do celular".</li>
    <li>Foto HEIC do iPhone que o navegador não abre: use "Tirar foto" pelo app ou, no iPhone, Ajustes &gt; Câmera &gt; Formatos &gt; "Mais compatível".</li>
    <li>Sem espaço no celular, o app avisa: libere espaço e tente de novo. Nada do que já estava guardado se perde.</li></ul>
  </section>
  <section id="aj-assinatura"><h2>Assinatura em tela cheia</h2>
    <ul><li>Na tela da assinatura, toque em <strong>Assinar em tela cheia</strong>: o quadro ocupa a tela inteira, com a linha de base e o nome de quem assina. Vire o celular de lado para ter mais espaço (no Android ele já vira sozinho quando deixa).</li>
    <li><strong>Limpar</strong> apaga e começa de novo; <strong>Cancelar</strong> volta sem mudar nada; <strong>Confirmar</strong> passa a assinatura para o quadro da tela. Depois confira o nome e toque em Guardar.</li>
    <li>Vale para a assinatura do cliente e para a sua (técnico ou colaborador da logística).</li></ul>
  </section>
  <section id="aj-corrigir"><h2>Errei: como corrigir</h2>
    <ul><li><strong>Antes de a O.S. ser encerrada no servidor</strong> (concluída aqui, ou com a documentação ainda pendente): na O.S., toque em <strong>Desfazer conclusão para corrigir</strong> e escreva o motivo. A O.S. volta a aceitar fotos, respostas, relato, peças e assinaturas ("Refazer"). Corrija e toque em Concluí de novo.</li>
    <li><strong>Depois de encerrada no servidor</strong>: toque em <strong>Pedir correção</strong> e escreva o motivo. A gestão da área recebe o pedido e, se concordar, reabre a O.S. no SGO+. Atualize o Meu dia: a O.S. aparece como "Reaberta para correção" e os passos ficam liberados.</li>
    <li>Nada é apagado: o motivo, quem corrigiu e quando ficam no histórico da O.S.; o relatório sai de novo como revisão (Rev. 01, 02...).</li></ul>
  </section>
  <section id="aj-sem-sinal"><h2>Sem sinal</h2>
    <ul><li>Trabalhe normalmente: tudo fica guardado no aparelho.</li>
    <li>A barra de baixo mostra "Pendente de envio (N)". Quando o sinal volta, o app envia sozinho, em ordem, sem registrar nada duas vezes.</li>
    <li>Para forçar, toque na barra e em "Enviar agora".</li>
    <li>Nada é apagado do aparelho antes do servidor confirmar.</li>
    <li>Se a agenda for atualizada enquanto você assina ou escreve (assinatura, termo, relato), a tela não muda: aparece só "Dados atualizados".</li>
    <li>Se a sessão terminar, o app pede para entrar de novo. O que está guardado não se perde.</li></ul>
  </section>
  <section id="aj-envios"><h2>Envios</h2>
    <p>Lista o que ainda não subiu, com a hora de cada item. "Recusado pelo servidor" mostra o motivo e o que fazer; quando dá para corrigir, tem "Tentar de novo". Se não souber resolver, avise o supervisor.</p>
  </section>
  <section id="aj-trocar"><h2>Trocar de celular</h2>
    <ol><li>No celular antigo, abra o app com internet e espere "Pendente de envio (0)".</li>
    <li>Só depois desinstale ou entregue o aparelho. O que não foi enviado existe só naquele celular.</li>
    <li>No celular novo, instale o app e entre com o seu e-mail: a agenda e o que já está no servidor são baixados de novo.</li></ol>
  </section>
  <section id="aj-cuidados"><h2>Cuidados</h2>
    <ul><li>Não limpe os dados do navegador nem desinstale o app com itens pendentes.</li>
    <li>No iPhone, use o app pela Tela de Início e abra-o com internet todos os dias.</li>
    <li>Um aparelho por pessoa. Se outra pessoa entrar no mesmo celular, o que é seu fica guardado e só é enviado quando você entrar de novo.</li></ul>
  </section>
  <p class="fraco pequeno">Versão ${esc(VERSAO)}</p>
  <button class="bt primario" data-acao="voltar">Voltar</button></div>`;
}

/* ---------------- Novo atendimento (fora da agenda): 1 Cliente, 2 Unidade, 3 Equipamento, 4 Abrir a O.S. ---------------- */
const NOVO_PASSOS = ["Cliente", "Unidade", "Equipamento", "Abrir a O.S."];
function novoVazio() {
  return { passo: 1, modo: "buscar", busca: { termo: "", r: null, erro: "", buscando: false, feita: false }, lista: { unidades: null, equipamentos: null, erro: "", carregando: false, filtro: "" },
    cliente: null, unidade: null, equipamento: null, form: { cliente: {}, unidade: {}, equipamento: {}, os: { prioridade: "P3", parada: "NAO" } }, erros: {}, cnpj: { consultando: false, aviso: "" }, abrindo: false, salvando: false };
}
const novoEstado = () => { if (!E.novo) E.novo = novoVazio(); return E.novo; };
/** Dá para falar com o servidor agora mesmo (nada na fila esperando, para a ordem dos cadastros não se perder)? */
const podeChamarDireto = () => navigator.onLine !== false && podeEnviar() && E.resumo.pendentes === 0;
const tipoPorCodigo = (cod) => (E.tipos || []).find((t) => t.codigo === cod) || null;
const campoErro = (n, erros) => (erros && erros[n] ? `<p class="erro-campo" id="e_${esc(n)}">${esc(erros[n])}</p>` : "");
const inval = (n, erros) => (erros && erros[n] ? " invalido" : "");
function campoTexto(id, rotulo, valor, erros, attrs) {
  return `<label class="rotulo" for="${esc(id)}">${esc(rotulo)}</label><input class="campo${inval(id, erros)}" id="${esc(id)}" value="${esc(valor || "")}" ${attrs || ""}>${campoErro(id, erros)}`;
}
function etapas(passo) {
  return `<ol class="etapas" aria-label="Passos">${NOVO_PASSOS.map((n, i) => `<li class="${i + 1 < passo ? "feita" : i + 1 === passo ? "atual" : ""}"><span class="num">${i + 1}</span><span class="nome">${esc(n)}</span></li>`).join("")}</ol>`;
}
function resumoEscolhas(n) {
  const linha = (rot, v, passo) => (v ? `<p><strong>${rot}:</strong> ${esc(v)}${n.passo > passo ? ` <button type="button" class="link" data-acao="novoIr" data-passo="${passo}">trocar</button>` : ""}</p>` : "");
  const h = linha("Cliente", n.cliente && (n.cliente.nome + (n.cliente.novo ? " (novo)" : "")), 1) + linha("Unidade", n.unidade && (n.unidade.nome + (n.unidade.novo ? " (nova)" : "")), 2) + linha("Equipamento", n.equipamento && (n.equipamento.texto + (n.equipamento.novo ? " (novo)" : "")), 3);
  return h ? `<div class="info resumo-novo">${h}</div>` : "";
}
function telaNovo() {
  const n = novoEstado();
  if (!E.tipos.length) return `<div class="aviso alerta"><p>Para abrir um atendimento em campo, o app precisa dos tipos de serviço do SGO+, que ainda não foram baixados neste aparelho.</p><p>Abra o app com internet uma vez (toque em "Atualizar agenda" no Meu dia) e volte aqui.</p></div><button class="bt" data-acao="irDia">Voltar ao Meu dia</button>`;
  const sem = navigator.onLine === false;
  let corpo = "";
  if (n.passo === 1) corpo = n.modo === "cadastrar" ? formCliente(n) : passoBuscar(n, sem);
  else if (n.passo === 2) corpo = n.modo === "cadastrar" ? formUnidade(n) : passoLista(n, sem, "unidade");
  else if (n.passo === 3) corpo = n.modo === "cadastrar" ? formEquipamento(n) : passoLista(n, sem, "equipamento");
  else corpo = formOs(n);
  return `${etapas(n.passo)}${resumoEscolhas(n)}${corpo}`;
}
function passoBuscar(n, sem) {
  const b = n.busca, r = b.r;
  let res = "";
  if (b.buscando) res = `<p class="carregando">Buscando...</p>`;
  else if (b.erro) res = `<div class="aviso erro"><p>${esc(b.erro)}</p></div>`;
  else if (r) {
    const nada = !r.clientes.length && !r.unidades.length && !r.equipamentos.length;
    res = nada ? `<div class="info"><p>Nada encontrado para "${esc(b.termo)}".</p><p class="fraco pequeno">Confira a grafia ou tente o CNPJ. Se o cliente é novo, cadastre abaixo.</p></div>` : "";
    if (r.clientes.length) res += `<h3>Clientes${r.total.clientes > r.clientes.length ? ` (${r.clientes.length} de ${r.total.clientes}; refine a busca)` : ""}</h3>` + r.clientes.map((c, i) => `<button type="button" class="cartao" data-acao="novoEscolherCliente" data-i="${i}"><span class="cli">${esc(c.nome)}</span>${c.cnpj ? `<span class="linha fraco">CNPJ ${esc(c.cnpj)}</span>` : ""}${c.endereco ? `<span class="linha fraco">${esc(c.endereco)}</span>` : ""}<span class="selo neutro">Escolher</span></button>`).join("");
    if (r.unidades.length) res += `<h3>Unidades com esse CNPJ</h3>` + r.unidades.map((u, i) => `<button type="button" class="cartao" data-acao="novoEscolherUnidadeBusca" data-i="${i}"><span class="cli">${esc(u.nome)}</span><span class="linha fraco">${esc(u.clienteNome || "")}${u.enderecoTexto ? " · " + esc(u.enderecoTexto) : ""}</span><span class="selo neutro">Escolher</span></button>`).join("");
    if (r.equipamentos.length) res += `<h3>Equipamentos${r.total.equipamentos > r.equipamentos.length ? ` (${r.equipamentos.length} de ${r.total.equipamentos})` : ""}</h3>` + r.equipamentos.map((e, i) => `<button type="button" class="cartao" data-acao="novoEscolherEquipBusca" data-i="${i}"><span class="cli">${esc(e.texto)}</span><span class="linha fraco">${esc(e.clienteNome || "")}${e.unidadeNome ? " · " + esc(e.unidadeNome) : ""}</span><span class="selo neutro">Escolher este equipamento</span></button>`).join("");
  }
  return `<h2>Qual é o cliente?</h2>
    ${sem ? `<div class="aviso alerta"><p>A busca precisa de internet, e agora não há sinal.</p><p>Se você conhece o cliente, cadastre abaixo: ao enviar, o servidor confere se ele já existe e usa o cadastro existente (nada fica em dobro).</p></div>` : ""}
    <form id="fNovoBusca" class="busca">
      <label class="rotulo" for="nTermo">Nome, CNPJ, TAG ou série</label>
      <div class="valor-linha"><input class="campo" id="nTermo" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="none" value="${esc(b.termo)}" ${sem ? "disabled" : ""}><button type="submit" class="bt primario" style="width:auto;margin:0" ${sem ? "disabled" : ""}>Buscar</button></div>
    </form>
    ${res}
    <h3>Não encontrei</h3>
    <button type="button" class="bt ${r && !r.clientes.length ? "primario" : ""}" data-acao="novoCadastrar">Cadastrar o cliente</button>
    <div class="rodape-acao"><button class="bt" data-acao="irDia">Cancelar e voltar ao Meu dia</button></div>`;
}
function passoLista(n, sem, tipo) {
  const l = n.lista, un = tipo === "unidade";
  const itens = un ? l.unidades : l.equipamentos;
  const novoPai = un ? n.cliente && n.cliente.novo : n.unidade && n.unidade.novo;
  let res = "";
  if (novoPai) res = `<div class="info"><p>${un ? "Cliente novo: cadastre a unidade onde você está." : "Unidade nova: cadastre o equipamento."}</p></div>`;
  else if (l.carregando) res = `<p class="carregando">Carregando...</p>`;
  else if (l.erro) res = `<div class="aviso erro"><p>${esc(l.erro)}</p></div>`;
  else if (sem && !itens) res = `<div class="aviso alerta"><p>Sem internet não dá para listar ${un ? "as unidades" : "os equipamentos"} do cadastro.</p><p>Cadastre ${un ? "a unidade" : "o equipamento"} abaixo: o servidor confere depois se já existe (${un ? "CNPJ ou nome" : "série ou TAG"}) e usa o existente.</p></div>`;
  else if (itens) {
    const f = (l.filtro || "").trim().toLowerCase();
    const vis = itens.filter((x) => !f || (un ? x.nome + " " + (x.enderecoTexto || "") : x.texto).toLowerCase().includes(f));
    res = (itens.length > 5 ? `<label class="rotulo" for="nFiltro">Filtrar</label><input class="campo" id="nFiltro" type="search" autocomplete="off" value="${esc(l.filtro)}" data-novo-filtro="1">` : "") +
      (vis.length ? vis.map((x) => un ? `<button type="button" class="cartao" data-acao="novoEscolherUnidade" data-id="${esc(x.id)}"><span class="cli">${esc(x.nome)}</span>${x.enderecoTexto ? `<span class="linha fraco">${esc(x.enderecoTexto)}</span>` : ""}${x.responsavel ? `<span class="linha fraco">Responsável: ${esc(x.responsavel)}</span>` : ""}<span class="selo neutro">Escolher</span></button>`
        : `<button type="button" class="cartao" data-acao="novoEscolherEquip" data-id="${esc(x.id)}"><span class="cli">${esc(x.tipo || "Equipamento")}${x.modelo ? " · " + esc(x.modelo) : ""}${x.setor ? " — Setor " + esc(x.setor) : ""}</span><span class="linha fraco">${esc([x.tag && "TAG " + x.tag, x.serie && "série " + x.serie].filter(Boolean).join(" · "))}</span><span class="selo neutro">Escolher</span></button>`).join("")
        : `<div class="info"><p>${itens.length ? "Nada com esse filtro." : un ? "Este cliente ainda não tem unidade cadastrada." : "Esta unidade ainda não tem equipamento cadastrado."}</p></div>`) +
      (l.total > itens.length ? `<p class="fraco pequeno">Mostrando ${itens.length} de ${l.total}. Não achou? Use o filtro ou cadastre.</p>` : "");
  }
  return `<h2>${un ? "Qual é a unidade?" : "Qual é o equipamento?"}</h2>${un ? "" : `<label class="rotulo" for="nServico">O que será feito? (opcional neste passo)</label><textarea class="campo" id="nServico" rows="3" maxlength="3000" data-novo-servico="1">${esc(n.form.os.sintoma || "")}</textarea>`}${res}
    <h3>Não encontrei</h3>
    <button type="button" class="bt ${novoPai || (itens && !itens.length) ? "primario" : ""}" data-acao="novoCadastrar">${un ? "Cadastrar a unidade" : "Cadastrar o equipamento"}</button>
    <div class="rodape-acao"><button class="bt" data-acao="novoVoltar">Voltar</button></div>`;
}
function formCliente(n) {
  const f = n.form.cliente, e = n.erros, c = n.cnpj;
  return `<h2>Cadastrar o cliente</h2><p class="fraco">Só o nome é obrigatório. O resto ajuda a gestão a completar depois.</p>
    <form id="fNovoCliente">
      ${campoTexto("nome", "Nome do cliente (fantasia)", f.nome, e, 'maxlength="160" autocomplete="organization" autocapitalize="words"')}
      <label class="rotulo" for="cnpj">CNPJ</label>
      <div class="valor-linha"><input class="campo${inval("cnpj", e)}" id="cnpj" inputmode="numeric" autocomplete="off" maxlength="18" value="${esc(f.cnpj || "")}"><button type="button" class="bt" style="width:auto;margin:0" data-acao="novoConsultarCnpj" ${c.consultando || navigator.onLine === false ? "disabled" : ""}>${c.consultando ? "Consultando..." : "Consultar"}</button></div>
      ${campoErro("cnpj", e)}${c.aviso ? `<p class="fraco pequeno">${esc(c.aviso)}</p>` : `<p class="fraco pequeno">${navigator.onLine === false ? "Sem sinal a consulta não funciona; preencha à mão." : "Consultar preenche a razão social, o endereço e o telefone pelo CNPJ (precisa de internet)."}</p>`}
      ${campoTexto("razaoSocial", "Razão social", f.razaoSocial, e, 'maxlength="200" autocomplete="off"')}
      ${campoTexto("cep", "CEP", f.cep, e, 'inputmode="numeric" maxlength="9" autocomplete="postal-code"')}
      ${campoTexto("logradouro", "Logradouro", f.logradouro, e, 'maxlength="160"')}
      ${campoTexto("numero", "Número", f.numero, e, 'maxlength="20"')}
      ${campoTexto("complemento", "Complemento", f.complemento, e, 'maxlength="100"')}
      ${campoTexto("bairro", "Bairro", f.bairro, e, 'maxlength="80"')}
      ${campoTexto("cidade", "Cidade", f.cidade, e, 'maxlength="80"')}
      ${campoTexto("uf", "UF", f.uf, e, 'maxlength="2" autocapitalize="characters"')}
      ${campoTexto("contato", "Pessoa de contato", f.contato, e, 'maxlength="120" autocapitalize="words" autocomplete="off"')}
      ${campoTexto("telefone", "Telefone", f.telefone, e, 'inputmode="tel" maxlength="20" autocomplete="off"')}
      ${campoTexto("email", "E-mail", f.email, e, 'inputmode="email" maxlength="120" autocapitalize="none" autocomplete="off"')}
      ${e.geral ? `<div class="aviso erro"><p>${esc(e.geral)}</p></div>` : ""}
      <button type="submit" class="bt primario" ${n.salvando ? "disabled" : ""}>${n.salvando ? "Salvando..." : "Salvar o cliente e seguir"}</button>
    </form>
    <div class="rodape-acao"><button class="bt" data-acao="novoVoltarBusca">Voltar à busca</button></div>`;
}
function formUnidade(n) {
  const f = n.form.unidade, e = n.erros, cli = n.cliente || {};
  return `<h2>Cadastrar a unidade</h2><p class="fraco">Onde o equipamento fica. Só o nome é obrigatório.</p>
    <form id="fNovoUnidade">
      ${cli.novo || cli.endereco ? `<button type="button" class="bt" data-acao="novoMesmoEndereco">Mesmo nome e endereço do cliente</button>` : ""}
      ${campoTexto("nome", "Nome da unidade", f.nome, e, 'maxlength="160" autocapitalize="words" autocomplete="off"')}
      ${campoTexto("endereco", "Endereço", f.endereco, e, 'maxlength="300" autocomplete="street-address"')}
      ${campoTexto("cidade", "Cidade", f.cidade, e, 'maxlength="80" autocapitalize="words" autocomplete="off"')}
      ${campoTexto("uf", "UF (2 letras)", f.uf, e, 'maxlength="2" autocapitalize="characters" autocomplete="off" style="max-width:140px"')}
      <button type="button" class="bt" data-acao="novoLocalizacao">${f.lat ? "Localização guardada (" + esc(String(f.lat).slice(0, 8)) + ", " + esc(String(f.lng).slice(0, 8)) + ")" : "Usar a minha localização"}</button>
      <p class="fraco pequeno">A localização do aparelho fica no cadastro da unidade e ajuda a confirmar as próximas chegadas. É pedida só neste toque.</p>
      ${campoTexto("cnpj", "CNPJ da unidade (se diferente do cliente)", f.cnpj, e, 'inputmode="numeric" maxlength="18" autocomplete="off"')}
      ${campoTexto("responsavel", "Responsável no local", f.responsavel, e, 'maxlength="120" autocapitalize="words" autocomplete="off"')}
      ${campoTexto("telefone", "Telefone do local", f.telefone, e, 'inputmode="tel" maxlength="20" autocomplete="off"')}
      ${e.geral ? `<div class="aviso erro"><p>${esc(e.geral)}</p></div>` : ""}
      <button type="submit" class="bt primario" ${n.salvando ? "disabled" : ""}>${n.salvando ? "Salvando..." : "Salvar a unidade e seguir"}</button>
    </form>
    <div class="rodape-acao"><button class="bt" data-acao="novoVoltarBusca">Voltar à lista</button></div>`;
}
function formEquipamento(n) {
  const f = n.form.equipamento, e = n.erros;
  return `<h2>Cadastrar o equipamento</h2><p class="fraco">Copie da plaqueta: tipo é obrigatório; série ou TAG, ao menos um.</p>
    <form id="fNovoEquip">
      ${campoTexto("tipo", "Tipo (autoclave, lavadora, estufa...)", f.tipo, e, 'maxlength="80" autocapitalize="words" autocomplete="off"')}
      ${campoTexto("fabricante", "Fabricante", f.fabricante, e, 'maxlength="80" autocapitalize="words" autocomplete="off"')}
      ${campoTexto("modelo", "Modelo", f.modelo, e, 'maxlength="80" autocapitalize="characters" autocomplete="off"')}
      ${campoTexto("serie", "Número de série", f.serie, e, 'maxlength="80" autocapitalize="characters" autocomplete="off"')}
      ${campoTexto("tag", "TAG (etiqueta do SGO+ ou do cliente)", f.tag, e, 'maxlength="60" autocapitalize="characters" autocomplete="off"')}
      ${campoTexto("setor", "Setor", f.setor, e, 'maxlength="80" autocapitalize="words" autocomplete="off"')}
      ${campoTexto("patrimonio", "Patrimônio", f.patrimonio, e, 'maxlength="60" autocomplete="off"')}
      ${e.geral ? `<div class="aviso erro"><p>${esc(e.geral)}</p></div>` : ""}
      <button type="submit" class="bt primario" ${n.salvando ? "disabled" : ""}>${n.salvando ? "Salvando..." : "Salvar o equipamento e seguir"}</button>
    </form>
    <div class="rodape-acao"><button class="bt" data-acao="novoVoltarBusca">Voltar à lista</button></div>`;
}
function formOs(n) {
  const f = n.form.os, e = n.erros, c = E.campo || {}, tipo = tipoPorCodigo(f.tipoCodigo);
  const prios = c.prioridades && c.prioridades.length ? c.prioridades : [{ codigo: "P1", nome: "P1 — Crítica" }, { codigo: "P2", nome: "P2 — Alta" }, { codigo: "P3", nome: "P3 — Normal" }, { codigo: "P4", nome: "P4 — Baixa" }];
  const paradas = c.paradas && c.paradas.length ? c.paradas : [{ codigo: "NAO", nome: "Sem parada" }, { codigo: "PARCIAL", nome: "Parada parcial" }, { codigo: "TOTAL", nome: "Parada total" }];
  const direto = podeChamarDireto() && !(n.cliente && n.cliente.novo && !n.cliente.direto) && !(n.unidade && n.unidade.novo && !n.unidade.direto) && !(n.equipamento && n.equipamento.novo && !n.equipamento.direto);
  return `<h2>O que você vai fazer?</h2>
    <form id="fNovoOs">
      <label class="rotulo" for="tipoCodigo">Tipo de serviço</label>
      <select class="campo${inval("tipoCodigo", e)}" id="tipoCodigo"><option value="">Escolha</option>${E.tipos.map((t) => `<option value="${esc(t.codigo)}" ${t.codigo === f.tipoCodigo ? "selected" : ""}>${esc(t.nome)}</option>`).join("")}</select>${campoErro("tipoCodigo", e)}
      ${tipo ? `<p class="fraco pequeno">${esc(tipo.descricao || "")} Exige: ${esc([tipo.exigencias.fotosMin ? tipo.exigencias.fotosMin + " foto(s)" : "", tipo.exigencias.qrOuSerie ? "conferir QR ou série" : "", tipo.exigencias.assinatura ? "assinatura do cliente" : "", tipo.checklist.length ? "checklist de " + tipo.checklist.length + " item(ns)" : ""].filter(Boolean).join(", ") || "relato")}.</p>` : ""}
      <label class="rotulo" for="sintoma">${tipo && tipo.logistica ? (tipo.logistica.sentido === "RETIRADA" ? "O que vai ser retirado e por quê" : tipo.logistica.sentido === "ENVIO" ? "O que vai ser enviado e para quem" : "O que vai ser entregue e para quem") : "Problema relatado (o que o cliente disse)"}</label>
      <textarea class="campo${inval("sintoma", e)}" id="sintoma" rows="3" maxlength="3000">${esc(f.sintoma || "")}</textarea>${campoErro("sintoma", e)}
      ${campoTexto("solicitante", "Quem pediu o atendimento", f.solicitante, e, 'maxlength="120" autocapitalize="words" autocomplete="off"')}
      ${campoTexto("contato", "Telefone ou e-mail de quem pediu", f.contato, e, 'maxlength="200" autocomplete="off"')}
      <label class="rotulo">Prioridade</label>
      <div class="opcoes">${prios.map((p) => `<button type="button" class="bt" aria-pressed="${f.prioridade === p.codigo}" data-acao="novoOpcao" data-campo="prioridade" data-v="${esc(p.codigo)}">${esc(p.nome)}</button>`).join("")}</div>
      <p class="fraco pequeno">P1 só para equipamento parado que afeta o paciente.</p>
      ${tipo && tipo.logistica ? `<p class="fraco pequeno">Retirada, entrega e envio usam o ${esc(R.ROTULOS_LOGISTICA[tipo.logistica.sentido].termo.toLowerCase())}: itens, de quem ou para quem e as duas assinaturas. Sem campos de manutenção.</p>` : `<label class="rotulo">O equipamento está parado?</label>
      <div class="opcoes">${paradas.map((p) => `<button type="button" class="bt" aria-pressed="${f.parada === p.codigo}" data-acao="novoOpcao" data-campo="parada" data-v="${esc(p.codigo)}">${esc(p.nome)}</button>`).join("")}</div>`}
      <div class="info resumo-novo"><p><strong>Você vai abrir uma O.S. para:</strong></p><p>${esc(n.cliente ? n.cliente.nome : "")} › ${esc(n.unidade ? n.unidade.nome : "")} › ${esc(n.equipamento ? n.equipamento.texto : "")}</p>
        <p class="fraco pequeno">${direto ? "Com sinal: a O.S. recebe o número oficial na hora e a gestão é avisada." : "Sem sinal (ou com itens na fila): a O.S. fica provisória neste aparelho e ganha o número oficial ao sincronizar; o chamado nasce com a triagem feita em campo."}</p></div>
      ${e.geral ? `<div class="aviso erro"><p>${esc(e.geral)}</p></div>` : ""}
      ${n.duplicadas ? `<div class="aviso alerta" role="alert"><p><strong>Você já abriu hoje uma O.S. nesta unidade.</strong></p>
        ${n.duplicadas.servidor ? `<p>${esc(n.duplicadas.servidor)}.</p>` : (n.duplicadas.lista || []).map((d) => `<p>${esc(d.texto)}</p>`).join("")}
        <p>Se é o mesmo atendimento, continue nela. Abra outra só se for outro equipamento ou outro serviço.</p>
        ${(n.duplicadas.lista || []).length ? `<button type="button" class="bt primario" data-acao="abrirOs" data-os="${esc(n.duplicadas.lista[0].osId)}">Continuar na O.S. que já existe</button>` : ""}
        <button type="button" class="bt" data-acao="novoConfirmarOutra">É outro atendimento: abrir mais uma</button></div>` : ""}
      <button type="submit" class="bt ok" ${n.abrindo || n.duplicadas ? "disabled" : ""}>${n.abrindo ? "Abrindo..." : "Abrir a O.S."}</button>
    </form>
    <div class="rodape-acao"><button class="bt" data-acao="novoVoltar">Voltar</button></div>`;
}
function lerForm(ids, prefixo) {
  const d = {};
  for (const id of ids) { const el = $(id); if (el) d[id] = el.value.trim(); }
  return d;
}
/** Cadastro salvo num passo: com sinal e fila vazia vai ao servidor agora (e já diz se existia); senão fica no aparelho até "Abrir a O.S.". */
async function salvarCadastro(tipo, dados) {
  const n = novoEstado(), idLocal = novoIdLocal();
  const obj = { idLocal, novo: true, direto: false, dados };
  // 12/11/2026: unidade de um cliente (ou equipamento de uma unidade) que ainda só está no aparelho vai pela fila, depois dele; direto,
  // o servidor não conhecia o id provisório e respondia "o cliente dela não foi encontrado"
  const dependeProvisorio = (tipo !== "CLIENTE" && n.cliente && n.cliente.novo && !n.cliente.direto) || (tipo === "EQUIPAMENTO" && n.unidade && n.unidade.novo && !n.unidade.direto);
  if (!dependeProvisorio && podeChamarDireto()) {
    try {
      const v = await chamar("Ast_appCadastrar", [E.sessao.sessionId, { idLocal, tipo, dados, em: new Date().toISOString(), aparelho: aparelho() }]);
      if (ehSessaoExpirada(v)) { await sessaoExpirou(); return { erro: "A sua sessão terminou. Entre de novo para continuar." }; }
      if (!v || v.ok !== true) return { erro: (v && v.message) || "O servidor não aceitou o cadastro." };
      obj.direto = true; obj.id = String(v.id);
      if (v.existente) { obj.novo = false; obj.existente = true; }
      obj.resposta = v;
      return { obj, message: v.message || "" };
    } catch (e) { if (!(e instanceof ErroRede)) return { erro: String(e.message || e) }; }
  }
  obj.id = idLocal;   // provisório: o servidor troca pelo real ao sincronizar
  return { obj, message: "" };
}
async function carregarLista(n) {
  const l = n.lista, un = n.passo === 2;
  if (un ? n.cliente && n.cliente.novo : n.unidade && n.unidade.novo) { l.unidades = l.unidades || []; l.equipamentos = []; return; }
  if (navigator.onLine === false || !podeEnviar()) return;
  l.carregando = true; l.erro = ""; render();
  try {
    const v = await chamar("Ast_appBuscarCadastro", [E.sessao.sessionId, un ? { clienteId: n.cliente.id } : { clienteId: n.cliente.id, unidadeId: n.unidade.id }]);
    if (ehSessaoExpirada(v)) { await sessaoExpirou(); return; }
    if (!v || v.ok !== true) throw new Error((v && v.message) || "O servidor não respondeu a busca.");
    if (un) { l.unidades = v.unidades || []; l.total = v.total ? v.total.unidades : 0; }
    else { l.equipamentos = v.equipamentos || []; l.total = v.total ? v.total.equipamentos : 0; }
  } catch (e) { l.erro = e instanceof ErroRede ? "" : String(e.message || e); if (e instanceof ErroRede) { if (un) l.unidades = l.unidades || null; } }
  finally { l.carregando = false; render(); }
}
function irPasso(n, passo) {
  n.passo = passo; n.modo = "buscar"; n.erros = {}; n.lista = { unidades: null, equipamentos: null, erro: "", carregando: false, filtro: "" };
  render();
  if (passo === 2 || passo === 3) carregarLista(n);   // desenha de novo quando a lista chegar (ou avisa que não dá para listar sem sinal)
  window.scrollTo(0, 0);
}
const acoesNovo = {
  novoAtendimento: () => { E.novo = novoVazio(); ir("#/novo"); },
  novoIr: (b) => { const n = novoEstado(), p = Number(b.dataset.passo); n.duplicadas = null; n.confirmouOutra = false; if (p <= 1) { n.cliente = null; } if (p <= 2) n.unidade = null; if (p <= 3) n.equipamento = null; irPasso(n, p); },
  novoVoltar: () => { const n = novoEstado(); if (n.passo <= 1) { ir("#/dia"); return; } acoesNovo.novoIr({ dataset: { passo: String(n.passo - 1) } }); },
  // 12/11/2026: confirmou que é outro atendimento na mesma unidade: abre (o formulário é enviado de novo com a confirmação)
  novoConfirmarOutra: () => { const n = novoEstado(); n.confirmouOutra = true; n.duplicadas = null; render(); const f = $("fNovoOs"); if (f) { if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })); } },
  novoVoltarBusca: () => { const n = novoEstado(); n.modo = "buscar"; n.erros = {}; render(); },
  novoCadastrar: () => { const n = novoEstado(); n.modo = "cadastrar"; n.erros = {}; render(); setTimeout(() => { const el = $(n.passo === 3 ? "tipo" : "nome"); if (el) el.focus(); }, 50); },
  novoEscolherCliente: (b) => { const n = novoEstado(), c = n.busca.r.clientes[Number(b.dataset.i)]; n.cliente = { id: c.id, nome: c.nome, cnpj: c.cnpj, endereco: c.endereco, telefone: c.telefone, novo: false, direto: true }; irPasso(n, 2); },
  novoEscolherUnidadeBusca: (b) => { const n = novoEstado(), u = n.busca.r.unidades[Number(b.dataset.i)]; n.cliente = { id: u.clienteId, nome: u.clienteNome || "Cliente", novo: false, direto: true }; n.unidade = { ...u, novo: false, direto: true }; irPasso(n, 3); },
  novoEscolherEquipBusca: (b) => { const n = novoEstado(), e = n.busca.r.equipamentos[Number(b.dataset.i)]; n.cliente = { id: e.clienteId, nome: e.clienteNome || "Cliente", novo: false, direto: true }; n.unidade = { id: e.unidadeId, nome: e.unidadeNome || "Unidade", novo: false, direto: true }; n.equipamento = { ...e, novo: false, direto: true }; irPasso(n, 4); },
  novoEscolherUnidade: (b) => { const n = novoEstado(), u = (n.lista.unidades || []).find((x) => x.id === b.dataset.id); if (!u) return; n.unidade = { ...u, novo: false, direto: true }; irPasso(n, 3); },
  novoEscolherEquip: (b) => { const n = novoEstado(), e = (n.lista.equipamentos || []).find((x) => x.id === b.dataset.id); if (!e) return; n.equipamento = { ...e, novo: false, direto: true }; irPasso(n, 4); },
  novoOpcao: (b) => { const n = novoEstado(); n.form.os[b.dataset.campo] = b.dataset.v; b.parentElement.querySelectorAll("[aria-pressed]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); },
  novoMesmoEndereco: () => { const n = novoEstado(), c = n.cliente || {}, d = c.dados || {}; Object.assign(n.form.unidade, { nome: c.nome || d.nome || "", endereco: d.endereco || c.endereco || "", cidade: d.cidade || "", uf: d.uf || "", cnpj: d.cnpj || c.cnpj || "", responsavel: d.contato || "", telefone: d.telefone || c.telefone || "" }); render(); },
  novoLocalizacao: async () => {
    const n = novoEstado();
    recado("Buscando a localização...", 16000);
    const r = await pegarLocalizacao(); fecharRecado();
    if (!r.loc) { recado(r.motivo, 5000); return; }
    Object.assign(n.form.unidade, lerForm(["nome", "endereco", "cidade", "uf", "cnpj", "responsavel", "telefone"]), { lat: r.loc.lat, lng: r.loc.lng, precisao: r.loc.precisao });
    recado("Localização guardada para a unidade."); render();
  },
  novoConsultarCnpj: async () => {
    const n = novoEstado(), f = Object.assign(n.form.cliente, lerForm(["nome", "cnpj", "razaoSocial", "cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf", "contato", "telefone", "email"]));
    const c = R.lerCnpj(f.cnpj);
    if (!c.valido) { n.erros = { cnpj: "CNPJ com 14 números e dígitos conferentes." }; render(); return; }
    n.cnpj = { consultando: true, aviso: "" }; n.erros = {}; render();
    try {
      const v = await chamar("Ast_appConsultarCnpj", [E.sessao.sessionId, { cnpj: c.digitos }]);
      if (ehSessaoExpirada(v)) { await sessaoExpirou(); return; }
      if (!v || v.ok !== true) throw new Error((v && v.message) || "A consulta não respondeu.");
      if (v.jaCadastrado) {
        const ja = v.jaCadastrado;
        n.cnpj = { consultando: false, aviso: "" };
        janela(`<h2>CNPJ já cadastrado</h2><p>Este CNPJ já está no SGO+ como ${esc(ja.texto)}.</p><p>Use o cadastro existente: nada é criado em dobro.</p>
          <button type="button" class="bt primario" data-j="usar">Usar o cadastro existente</button><button type="button" class="bt" data-j="nao">Voltar ao formulário</button>`, (q) => {
          if (q !== "usar") { render(); return; }
          n.cliente = { id: ja.cliente.id, nome: ja.cliente.nome, cnpj: ja.cliente.cnpj, endereco: ja.cliente.endereco, telefone: ja.cliente.telefone, novo: false, direto: true };
          if (ja.unidade) { n.unidade = { ...ja.unidade, novo: false, direto: true }; irPasso(n, 3); } else irPasso(n, 2);
        });
        return;
      }
      if (v.consultado) {
        Object.assign(f, { cnpj: R.cnpjBonito(v.cnpj), razaoSocial: v.razaoSocial || f.razaoSocial, nome: f.nome || v.nomeFantasia || v.razaoSocial, endereco: [v.endereco, v.cidade && v.uf ? v.cidade + "/" + v.uf : v.cidade].filter(Boolean).join(", ") || f.endereco, cep: v.cep || f.cep || "", logradouro: v.logradouro || f.logradouro || "", numero: v.numero || f.numero || "", complemento: v.complemento || f.complemento || "", bairro: v.bairro || f.bairro || "", cidade: v.cidade || f.cidade || "", uf: v.uf || f.uf || "", telefone: f.telefone || v.telefone, email: f.email || v.email });
        n.cnpj = { consultando: false, aviso: "Dados preenchidos pela consulta pública. Confira e complete." };
      } else n.cnpj = { consultando: false, aviso: v.aviso || "A consulta não trouxe dados; preencha à mão." };
    } catch (e) { n.cnpj = { consultando: false, aviso: e instanceof ErroRede ? "Sem sinal para consultar agora; preencha à mão." : String(e.message || e) }; }
    render();
  },
};

async function enviarFormNovo(form) {
  const n = novoEstado();
  if (form.id === "fNovoBusca") {
    const termo = $("nTermo").value.trim();
    n.busca = { termo, r: null, erro: "", buscando: true, feita: true }; render();
    try {
      const v = await chamar("Ast_appBuscarCadastro", [E.sessao.sessionId, { termo }]);
      if (ehSessaoExpirada(v)) { await sessaoExpirou(); return; }
      if (!v || v.ok !== true) throw new Error((v && v.message) || "O servidor não respondeu a busca.");
      n.busca.r = v;
    } catch (e) { n.busca.erro = e instanceof ErroRede ? "Sem sinal agora. A busca precisa de internet; se o cliente é novo, cadastre abaixo." : String(e.message || e); }
    n.busca.buscando = false; render();
    return;
  }
  if (form.id === "fNovoCliente" || form.id === "fNovoUnidade" || form.id === "fNovoEquip") {
    const tipo = form.id === "fNovoCliente" ? "CLIENTE" : form.id === "fNovoUnidade" ? "UNIDADE" : "EQUIPAMENTO";
    const chave = tipo.toLowerCase();
    const ids = tipo === "CLIENTE" ? ["nome", "cnpj", "razaoSocial", "cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf", "contato", "telefone", "email"] : tipo === "UNIDADE" ? ["nome", "endereco", "cidade", "uf", "cnpj", "responsavel", "telefone"] : ["tipo", "fabricante", "modelo", "serie", "tag", "setor", "patrimonio"];
    const f = Object.assign(n.form[chave], lerForm(ids));
    const erros = R.faltasDoCadastro(tipo, f);
    n.erros = erros;
    if (Object.keys(erros).length) { render(); const el = $(Object.keys(erros)[0]); if (el) el.focus(); return; }
    const dados = { ...f };
    if (tipo === "UNIDADE") dados.clienteId = n.cliente.id;
    if (tipo === "EQUIPAMENTO") { dados.clienteId = n.cliente.id; dados.unidadeId = n.unidade.id; }
    n.salvando = true; render();
    const r = await salvarCadastro(tipo, dados);
    n.salvando = false;
    if (r.erro) { n.erros = { geral: r.erro }; render(); return; }
    const o = r.obj;
    if (tipo === "CLIENTE") {
      const v = o.resposta;
      n.cliente = v && v.cliente ? { id: v.cliente.id, nome: v.cliente.nome, cnpj: v.cliente.cnpj, endereco: v.cliente.endereco, telefone: v.cliente.telefone, novo: o.novo, direto: true, idLocal: o.idLocal, dados }
        : { id: o.id, nome: f.nome, cnpj: f.cnpj, endereco: f.endereco, telefone: f.telefone, novo: true, direto: false, idLocal: o.idLocal, dados };
      if (v && v.existente) recado(v.message, 7000); else recado(o.direto ? "Cliente cadastrado." : "Cliente guardado no aparelho; vai ao servidor com a O.S.", 5000);
      if (v && v.existente && v.unidades && v.unidades.length) { irPasso(n, 2); return; }
      irPasso(n, 2);
    } else if (tipo === "UNIDADE") {
      const v = o.resposta;
      n.unidade = v && v.unidade ? { ...v.unidade, novo: o.novo, direto: true, idLocal: o.idLocal, dados } : { id: o.id, nome: f.nome, enderecoTexto: [f.endereco, [f.cidade, f.uf].filter(Boolean).join("/")].filter(Boolean).join(", "), endereco: f.endereco, cidade: f.cidade, uf: f.uf, responsavel: f.responsavel, telefone: f.telefone, lat: f.lat, lng: f.lng, novo: true, direto: false, idLocal: o.idLocal, dados };
      if (v && v.existente) { recado(v.message, 7000); if (v.cliente) n.cliente = { id: v.cliente.id, nome: v.cliente.nome, cnpj: v.cliente.cnpj, novo: false, direto: true }; }
      else recado(o.direto ? "Unidade cadastrada." : "Unidade guardada no aparelho; vai ao servidor com a O.S.", 5000);
      irPasso(n, 3);
    } else {
      const v = o.resposta;
      n.equipamento = v && v.equipamento ? { ...v.equipamento, novo: o.novo, direto: true, idLocal: o.idLocal, dados }
        : { id: o.id, tipo: f.tipo, modelo: f.modelo, serie: f.serie, tag: f.tag, setor: f.setor, patrimonio: f.patrimonio, texto: [f.tipo, f.modelo, f.tag && "TAG " + f.tag, f.serie && "série " + f.serie, f.setor].filter(Boolean).join(" · "), novo: true, direto: false, idLocal: o.idLocal, dados };
      if (v && v.existente) { recado(v.message, 7000); if (v.unidade) n.unidade = { ...v.unidade, novo: false, direto: true }; if (v.cliente) n.cliente = { id: v.cliente.id, nome: v.cliente.nome, cnpj: v.cliente.cnpj, novo: false, direto: true }; }
      else recado(o.direto ? "Equipamento cadastrado." : "Equipamento guardado no aparelho; vai ao servidor com a O.S.", 5000);
      irPasso(n, 4);
    }
    return;
  }
  if (form.id === "fNovoOs") {
    const f = Object.assign(n.form.os, lerForm(["sintoma", "solicitante", "contato"]), { tipoCodigo: $("tipoCodigo").value });
    const tp = tipoPorCodigo(f.tipoCodigo);
    const erros = R.faltasDoCadastro("OS", { ...f, logistica: tp && tp.logistica ? tp.logistica.sentido : "" });
    n.erros = erros;
    if (Object.keys(erros).length) { render(); const el = $(Object.keys(erros)[0]); if (el) el.focus(); return; }
    if (!n.cliente || !n.unidade || !n.equipamento) { n.erros = { geral: "Falta escolher ou cadastrar o cliente, a unidade e o equipamento (passos 1 a 3)." }; render(); return; }
    // 12/11/2026 (pedido do dono): O.S. aberta hoje por você na mesma unidade e ainda aberta pede confirmação antes de abrir outra
    if (!n.confirmouOutra) {
      const iguais = osAbertasNaUnidade(n);
      if (iguais.length) { n.duplicadas = { lista: iguais.map((o) => ({ osId: o.osId, texto: (o.numero || "O.S.") + " · " + [o.equipamento.nome, o.equipamento.tag && "TAG " + o.equipamento.tag].filter(Boolean).join(" · ") + (o.horario ? " · aberta às " + o.horario : "") })) }; render(); return; }
    }
    n.abrindo = true; render();
    await abrirOsNova(n, f);
    n.abrindo = false;
  }
}
/** 12/11/2026: O.S. abertas em campo hoje, ainda abertas, na mesma unidade (o aparelho confere antes de abrir outra, com ou sem sinal). */
function osAbertasNaUnidade(n) {
  const norm = (t) => String(t || "").trim().toUpperCase(), hoje = hojeISO();
  return [...E.os.values()].filter((o) => o.abertaEmCampo && (o.dia === hoje || o.provisoria) && !/^(concluida|cancelada)$/.test(estadoOs(o)) &&
    norm(o.unidade.nome) === norm(n.unidade && n.unidade.nome) && (!o.cliente.nome || !(n.cliente && n.cliente.nome) || norm(o.cliente.nome) === norm(n.cliente.nome)));
}
async function abrirOsNova(n, f) {
  const tipo = tipoPorCodigo(f.tipoCodigo), em = new Date().toISOString(), u = usuario();
  const dados = { clienteId: n.cliente.id, unidadeId: n.unidade.id, equipamentoId: n.equipamento.id, tipoCodigo: f.tipoCodigo, sintoma: f.sintoma, solicitante: f.solicitante, contato: f.contato, prioridade: f.prioridade || "P3", parada: f.parada || "NAO" };
  const pendentesLocais = [n.cliente, n.unidade, n.equipamento].filter((x) => x && x.novo && !x.direto);
  const idLocal = novoIdLocal();
  if (!pendentesLocais.length && podeChamarDireto()) {
    try {
      const v = await chamar("Ast_appAbrirOS", [E.sessao.sessionId, { idLocal, ...dados, confirmarOutra: !!n.confirmouOutra, em, aparelho: aparelho() }]);
      if (ehSessaoExpirada(v)) { await sessaoExpirou(); n.erros = { geral: "A sua sessão terminou. Entre de novo e toque em Abrir a O.S. outra vez." }; render(); return; }
      if (v && v.codigo === "POSSIVEL_DUPLICADO") { n.duplicadas = { servidor: v.message || "" }; render(); return; }
      if (!v || v.ok !== true) { n.erros = { geral: (v && v.message) || "O servidor não abriu a O.S." }; render(); return; }
      if (v.os && String(v.os.situacaoNome || "").startsWith("Aguardando executor")) {
        E.novo = null;
        recado(v.message, 7000);
        ir("#/dia");
        return;
      }
      const o = R.normalizarOs(v.os, 0); o.dia = o.dia || hojeISO();
      await salvarOs(o);
      const x = execDe(o.osId); if (R.mesclarRegistrado(x, o)) await salvarExec(x);
      E.novo = null;
      recado(v.message || "O.S. " + o.numero + " aberta.", 6000);
      ir("#/os/" + encodeURIComponent(o.osId));
      return;
    } catch (e) { if (!(e instanceof ErroRede)) { n.erros = { geral: String(e.message || e) }; render(); return; } }
  }
  // sem sinal (ou com fila): tudo entra na fila, na ordem, e a O.S. nasce provisória no aparelho
  for (const x of pendentesLocais) {
    const t = x === n.cliente ? "CLIENTE" : x === n.unidade ? "UNIDADE" : "EQUIPAMENTO";
    await fila.registrar(u, { tipo: "CADASTRO", osId: "", dados: { tipo: t, dados: x.dados }, idLocal: x.idLocal });
    x.direto = true;   // já na fila: não entra de novo
  }
  const item = await fila.registrar(u, { tipo: "NOVA_OS", osId: "", dados: { ...dados, confirmarOutra: true }, idLocal });   // conferido no aparelho (osAbertasNaUnidade)
  item.osId = item.idLocal; await B.gravar("fila", item);   // a O.S. provisória tem o id do próprio item
  const o = R.osProvisoria({ idLocal: item.idLocal, tipo, cliente: n.cliente, unidade: n.unidade, equipamento: n.equipamento, sintoma: f.sintoma, solicitante: f.solicitante, contato: f.contato, prioridade: f.prioridade, prioridadeNome: ((E.campo && E.campo.prioridades) || []).concat([{ codigo: f.prioridade, nome: f.prioridade }]).find((p) => p.codigo === f.prioridade).nome, em });
  await salvarOs(o);
  execDe(o.osId);
  await atualizarResumo();
  E.novo = null;
  recado(navigator.onLine === false ? "O.S. provisória aberta e guardada no aparelho. Ela ganha o número oficial quando houver sinal." : "O.S. provisória aberta; o número oficial chega na sincronização.", 6000);
  ir("#/os/" + encodeURIComponent(o.osId));
  setTimeout(() => tentarEnviar(false), 300);
}

/* ---------------- avisos e barra ---------------- */
function avisos() {
  const a = [], s = E.sessao, arm = E.arm;
  if (E.swNovo) a.push(`<div class="aviso info"><p>Versão nova do app pronta.</p><button class="bt primario" data-acao="atualizarApp">Atualizar agora</button></div>`);
  if (s && s.expirada) a.push(`<div class="aviso erro"><p>A sua sessão terminou. Entre de novo para enviar. Nada do que está guardado foi perdido.</p><button class="bt primario" data-acao="irEntrar">Entrar de novo</button></div>`);
  if (E.bloqueio && E.resumo.pendentes) a.push(`<div class="aviso alerta"><p>${esc(E.bloqueio)}</p><p>O que está guardado continua no aparelho.</p></div>`);
  const antigo = E.resumo.maisAntigo && Date.now() - Date.parse(E.resumo.maisAntigo) > 12 * 3600000;
  if (antigo) a.push(`<div class="aviso erro"><p>Há itens guardados desde ${esc(dataHora(E.resumo.maisAntigo))} sem envio. Abra o app com internet para enviar.</p><p>Não limpe os dados do navegador nem desinstale o app.</p></div>`);
  if (E.outros) a.push(`<div class="aviso alerta"><p>Há ${E.outros} item(ns) de outro usuário guardado(s) neste aparelho. Eles só são enviados quando essa pessoa entrar de novo aqui.</p></div>`);
  if (arm && !arm.persistente && s && s.usuario) {
    if (arm.ios && !arm.instalado) a.push(`<div class="aviso alerta"><p>No iPhone, o que fica guardado pode ser apagado pelo próprio aparelho se o app não estiver na Tela de Início.</p><p>Toque em Compartilhar (quadrado com seta) e em "Adicionar à Tela de Início". Depois, abra sempre pelo ícone.</p></div>`);
    else if (!arm.instalado) a.push(`<div class="aviso alerta"><p>Instale o app neste celular para o que fica guardado não ser apagado.</p>${E.instalar ? `<button class="bt primario" data-acao="instalar">Instalar o app</button>` : `<p>No Chrome: menu de três pontos e "Instalar aplicativo".</p>`}</div>`);
    else if (E.resumo.pendentes) a.push(`<div class="aviso alerta"><p>O navegador não garante guardar os dados deste app. Abra com internet todos os dias para enviar o que estiver pendente.</p></div>`);
  }
  $("avisos").innerHTML = a.join("");
}

function barra() {
  const est = $("barraEstado"), bt = $("barraBotao");
  if (!est || !bt) return;
  const n = E.resumo.pendentes, rec = E.resumo.recusados;
  bt.textContent = "Pendente de envio (" + n + ")";
  bt.className = "barra-botao" + (rec ? " erro" : n ? " tem" : "");
  let t;
  if (!E.sessao || !E.sessao.usuario) t = navigator.onLine === false ? "Sem sinal" : "Entre para começar";
  else if (E.sessao.expirada) t = "Entre de novo para enviar";
  else if (E.enviando) t = "Enviando...";
  else if (navigator.onLine === false) t = n ? "Sem sinal: guardado no aparelho" : "Sem sinal";
  else if (rec) t = rec + " recusado(s): veja Envios";
  else if (n && E.ultimoEnvio && E.ultimoEnvio.parouPor) t = E.ultimoEnvio.parouPor === "bloqueado" ? "Envio parado pelo servidor" : "Envio parado, tentando de novo";
  else if (n) t = "Aguardando envio";
  else t = E.resumo.ultimoEnvio ? "Tudo enviado às " + hora(E.resumo.ultimoEnvio) : "Nada para enviar";
  est.textContent = t;
}

let timerRecado = null;
function recado(texto, ms) {
  const r = $("recado");
  r.textContent = texto; r.hidden = false;
  clearTimeout(timerRecado);
  timerRecado = setTimeout(() => { r.hidden = true; }, ms || 3500);
}
const fecharRecado = () => { clearTimeout(timerRecado); $("recado").hidden = true; };

let fimJanela = null;
function janela(html, aoResponder) {
  const j = $("janela");
  j.innerHTML = `<div class="janela-caixa" role="dialog" aria-modal="true">${html}</div>`;
  j.hidden = false;
  fimJanela = aoResponder;
}
function fecharJanela(resposta) {
  const j = $("janela"), f = fimJanela;
  fimJanela = null;
  const campos = {};
  j.querySelectorAll("input, textarea, select").forEach((c) => { if (c.id) campos[c.id] = c.value; });
  j.hidden = true; j.innerHTML = "";
  if (f) Promise.resolve(f(resposta, campos)).catch((e) => recado("Não foi possível: " + (e && e.message || e), 6000));
}
function confirmar(texto, sim, nao) {
  return new Promise((ok) => janela(`<p>${esc(texto)}</p><button class="bt primario" data-j="sim">${esc(sim || "Sim")}</button><button class="bt" data-j="nao">${esc(nao || "Não")}</button>`, (q) => ok(q === "sim")));
}

/* ---------------- assinatura ---------------- */
let quadro = null;
/** Prepara o canvas no tamanho de tela (nítido no celular): fundo branco e traço preto. */
function prepararCanvas(c, dpr) {
  const r = c.getBoundingClientRect();
  c.width = Math.max(1, Math.round(r.width * dpr)); c.height = Math.max(1, Math.round(r.height * dpr));
  const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
  g.lineWidth = 2.6 * dpr; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#000";
}
/**
 * Desenho com o dedo num canvas. O ponto é convertido pela proporção entre o tamanho do canvas e o tamanho na tela (vale mesmo se a
 * tela girar). caixa: retângulo onde há traço (para a assinatura em tela cheia ir inteira e centralizada para o quadro).
 */
function ligarDesenho(c, dpr, aoTracar) {
  let ultimo = null;
  const caixa = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const ponto = (e) => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * c.width / Math.max(1, r.width), y: (e.clientY - r.top) * c.height / Math.max(1, r.height) }; };
  const marcar = (p) => { caixa.x0 = Math.min(caixa.x0, p.x); caixa.y0 = Math.min(caixa.y0, p.y); caixa.x1 = Math.max(caixa.x1, p.x); caixa.y1 = Math.max(caixa.y1, p.y); };
  c.addEventListener("pointerdown", (e) => { e.preventDefault(); try { c.setPointerCapture(e.pointerId); } catch (x) { /* segue */ } ultimo = ponto(e); marcar(ultimo); const g = c.getContext("2d"); g.beginPath(); g.arc(ultimo.x, ultimo.y, 1.2 * dpr, 0, Math.PI * 2); g.fillStyle = "#000"; g.fill(); aoTracar(); });
  c.addEventListener("pointermove", (e) => { if (!ultimo) return; e.preventDefault(); const p = ponto(e), g = c.getContext("2d"); g.beginPath(); g.moveTo(ultimo.x, ultimo.y); g.lineTo(p.x, p.y); g.stroke(); ultimo = p; marcar(p); aoTracar(); });
  const fim = () => { ultimo = null; };
  c.addEventListener("pointerup", fim); c.addEventListener("pointercancel", fim); c.addEventListener("pointerleave", fim);
  return { caixa, zerar: () => { caixa.x0 = caixa.y0 = Infinity; caixa.x1 = caixa.y1 = -Infinity; } };
}
const dprTela = () => Math.max(1, Math.min(3, window.devicePixelRatio || 1));
function montarQuadro() {
  const c = $("quadro");
  if (!c) { quadro = null; return; }
  const dpr = dprTela();
  const ajustar = () => prepararCanvas(c, dpr);
  ajustar();
  quadro = { c, tracos: 0, dpr, ajustar };
  ligarDesenho(c, dpr, () => { quadro.tracos++; });
}
/**
 * 18/11/2026 (pedido do dono): assinatura em tela cheia. O quadro ocupa a tela inteira, com a linha de base e o nome de quem assina;
 * no Android entra em tela cheia e vira na horizontal quando o celular deixa; no iPhone aparece só a dica de virar (nunca obriga).
 * Confirmar passa a assinatura (cortada no traço, centralizada) para o quadro da tela; o "Guardar" segue igual, com os mesmos
 * limites da imagem (800 a 200.000 caracteres).
 */
let fecharTelaCheia = null;
function assinarTelaCheia(quem) {
  if (!quadro) return;
  if (fecharTelaCheia) fecharTelaCheia();
  const dpr = dprTela(), cx = document.createElement("div");
  cx.className = "assinar-cheia"; cx.setAttribute("role", "dialog"); cx.setAttribute("aria-modal", "true"); cx.setAttribute("aria-label", "Assinatura em tela cheia");
  cx.innerHTML = `<div class="ac-topo"><p class="ac-quem">Assinatura de <strong>${esc(quem || "quem assina")}</strong></p><p class="ac-dica" id="acDica">Dica: vire o celular de lado para ter mais espaço.</p></div>
    <div class="ac-area"><canvas class="ac-quadro" aria-label="Quadro de assinatura em tela cheia"></canvas><div class="ac-linha" aria-hidden="true"><span>Assine sobre a linha</span></div></div>
    <div class="ac-botoes"><button type="button" class="bt" data-ac="limpar">Limpar</button><button type="button" class="bt" data-ac="cancelar">Cancelar</button><button type="button" class="bt primario" data-ac="ok">Confirmar</button></div>`;
  document.body.appendChild(cx);
  document.documentElement.classList.add("com-assinar-cheia");
  const c = cx.querySelector("canvas");
  let tracos = 0;
  prepararCanvas(c, dpr);
  const des = ligarDesenho(c, dpr, () => { tracos++; });
  const dica = () => { const d = cx.querySelector("#acDica"); if (d) d.hidden = window.innerWidth > window.innerHeight; };
  dica();
  // gira ou muda de tamanho: o que já foi assinado é redesenhado no tamanho novo (nada se perde)
  const mudou = () => {
    const r = c.getBoundingClientRect();
    if (Math.round(r.width * dpr) === c.width && Math.round(r.height * dpr) === c.height) { dica(); return; }
    const copia = document.createElement("canvas"); copia.width = c.width; copia.height = c.height; copia.getContext("2d").drawImage(c, 0, 0);
    const k0 = { w: c.width, h: c.height };
    prepararCanvas(c, dpr);
    if (tracos) {
      const k = Math.min(c.width / k0.w, c.height / k0.h);
      c.getContext("2d").drawImage(copia, 0, 0, k0.w * k, k0.h * k);
      const cx0 = des.caixa; if (cx0.x1 >= cx0.x0) { cx0.x0 *= k; cx0.y0 *= k; cx0.x1 *= k; cx0.y1 *= k; }
    }
    copia.width = copia.height = 0;
    dica();
  };
  let t = null;
  const aoMudar = () => { clearTimeout(t); t = setTimeout(mudou, 150); };
  window.addEventListener("resize", aoMudar);
  try {
    const p = cx.requestFullscreen ? cx.requestFullscreen({ navigationUI: "hide" }) : null;
    if (p && p.then) p.then(() => (screen.orientation && screen.orientation.lock ? screen.orientation.lock("landscape") : null)).catch(() => { /* o celular não deixou: segue na tela do app */ });
  } catch (e) { /* segue */ }
  const fechar = () => {
    fecharTelaCheia = null;
    window.removeEventListener("resize", aoMudar); clearTimeout(t);
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* segue */ }
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); } catch (e) { /* segue */ }
    document.documentElement.classList.remove("com-assinar-cheia");
    cx.remove();
  };
  fecharTelaCheia = fechar;
  cx.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ac]");
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (b.dataset.ac === "limpar") { prepararCanvas(c, dpr); tracos = 0; des.zerar(); return; }
    if (b.dataset.ac === "cancelar") { fechar(); return; }
    if (tracos < 5) { recado("Assine no quadro antes de confirmar.", 4000); return; }
    passarParaQuadro(c, des.caixa, dpr);
    quadro.tracos = Math.max(quadro.tracos, tracos);
    fechar();
    recado("Assinatura passada para o quadro. Confira o nome e toque em Guardar.", 5000);
  });
}
/** Copia a assinatura da tela cheia para o quadro da tela: só a parte com traço (com margem), no maior tamanho que cabe, centralizada. */
function passarParaQuadro(origem, caixa, dpr) {
  const d = quadro.c, g = d.getContext("2d"), m = 12 * dpr;
  quadro.ajustar();
  const x0 = Math.max(0, caixa.x0 - m), y0 = Math.max(0, caixa.y0 - m), x1 = Math.min(origem.width, caixa.x1 + m), y1 = Math.min(origem.height, caixa.y1 + m);
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0), k = Math.min(d.width * 0.94 / w, d.height * 0.9 / h);
  g.drawImage(origem, x0, y0, w, h, (d.width - w * k) / 2, (d.height - h * k) / 2, w * k, h * k);
}
/** Imagem PNG da assinatura dentro do limite do contrato (800 a 200.000 caracteres). */
function imagemDoQuadro() {
  const c = quadro.c;
  for (const larg of [600, 420, 300]) {
    const k = Math.min(1, larg / c.width), s = document.createElement("canvas");
    s.width = Math.round(c.width * k); s.height = Math.round(c.height * k);
    const g = s.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, s.width, s.height); g.drawImage(c, 0, 0, s.width, s.height);
    const url = s.toDataURL("image/png");
    s.width = s.height = 0;
    if (url.length <= 200000) return url;
  }
  return "";
}

/* ---------------- ações ---------------- */
function alternar(b, idCampo) {
  b.parentElement.querySelectorAll("[aria-pressed]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  $(idCampo).value = b.dataset.v;
}
const acoes = {
  voltar: () => { if (history.length > 1 && location.hash) history.back(); else ir("#/dia"); },
  ajuda: () => ir("#/ajuda"),
  irDia: () => ir("#/dia"),
  irEnvios: () => ir("#/envios"),
  irConta: () => ir("#/conta"),
  irEntrar: () => ir("#/entrar"),
  // 31/10/2026: etapas do login (código do celular e senha nova)
  reenviarCodigo: () => reenviarCodigo(""),
  codigoPorEmail: () => reenviarCodigo("EMAIL"),
  voltarLogin: () => { const t = E.etapaLogin; E.etapaLogin = null; if (t && t.tipo === "SENHA" && t.sessionId) chamar("logout", [t.sessionId]).catch(() => {}); render(); },
  // 31/10/2026: "Esqueci minha senha" (o e-mail digitado na entrada já vem preenchido)
  esqueci: () => { const c = $("eUsuario"); const v = c ? String(c.value || "").trim() : ""; E.etapaLogin = { tipo: "ESQUECI", email: v.indexOf("@") > 0 ? v : "" }; render(); setTimeout(() => { const e = $("eEmailEsq"); if (e) e.focus(); }, 50); },
  recarregar: () => location.reload(),
  aba: (b) => { E.aba = b.dataset.aba; render(); },
  agendaDia: (b) => { E.agendaDia = b.dataset.dia; render(); },
  atualizarDia: () => baixarDia(true),
  abrirOs: (b) => ir("#/os/" + encodeURIComponent(b.dataset.os)),
  excluirOs: (b) => { excluirOsCampo(b.dataset.os).catch((e) => recado("Não foi possível excluir: " + (e && e.message || e), 7000)); },
  abrirAtv: (b) => ir("#/atv/" + encodeURIComponent(b.dataset.atv)),
  atvIniciar: (b) => { const a = atvDe(b.dataset.atv); return a ? registrarAtv(a, "ATV_SITUACAO", { situacao: "Em andamento" }, "Atividade iniciada.") : null; },
  voltarOs: (b) => ir("#/os/" + encodeURIComponent(b.dataset.os)),
  passo: async (b) => {
    const osId = b.dataset.os, p = b.dataset.passo;
    if (p === "chegada") return fazerChegada(osId);
    if (p === "saida") return fazerSaida(osId);
    // 03/11/2026: o servidor só aceita checklist, fotos, relato e assinatura depois do "Cheguei"; sem ele, o registro voltava
    // recusado em Envios. O termo da logística pode ser preparado antes (fica no aparelho até o Cheguei).
    const o = E.os.get(osId), x = execDe(osId);
    if (o && !x.chegada && !fechada(o) && p !== "termo" && R.PASSOS_DEPOIS_DA_CHEGADA.includes(p)) {
      const q = await new Promise((ok) => janela(`<h2>Primeiro, o "Cheguei"</h2>
        <p>${esc(R.nomePasso(o, p))} só vale depois de registrar a chegada no cliente. Sem a chegada, o servidor recusa o que for registrado aqui.</p>
        <button type="button" class="bt primario" data-j="chegar">Registrar a chegada agora</button>
        <button type="button" class="bt" data-j="nao">Ainda não cheguei</button>`, ok));
      if (q !== "chegar") return;
      await fazerChegada(osId);
      if (!execDe(osId).chegada) return;
    }
    ir("#/os/" + encodeURIComponent(osId) + "/" + p);
  },
  // 03/11/2026 (logística): termo de entrega, retirada ou envio
  termoOpcao: async (b) => {
    const osId = b.dataset.os;
    if (bloqueada(osId)) return;
    const x = execDe(osId), t = termoDe(osId), v = b.dataset.v;
    if (b.dataset.campo === "estado") { const i = t.itens[Number(b.dataset.item)]; if (i) i.estado = v; }
    else t[b.dataset.campo] = t[b.dataset.campo] === v && b.dataset.campo === "embalagem" ? "" : v;
    await salvarExec(x); render();
    if (b.dataset.campo === "estado" && v === "AVARIA") { const c = $("t_i" + b.dataset.item + "_avaria"); if (c) c.focus(); }
  },
  termoMaisItem: async (b) => {
    const osId = b.dataset.os;
    if (bloqueada(osId)) return;
    const x = execDe(osId), t = termoDe(osId);
    t.itens.push({ descricao: "", quantidade: "1", identificacao: "", estado: "", avaria: "", acessorios: "" });
    await salvarExec(x); render();
    const c = $("t_i" + (t.itens.length - 1) + "_descricao"); if (c) { c.focus(); c.scrollIntoView({ block: "center" }); }
  },
  termoTirarItem: async (b) => {
    const osId = b.dataset.os;
    if (bloqueada(osId)) return;
    const x = execDe(osId), t = termoDe(osId), k = Number(b.dataset.item), i = t.itens[k];
    if (!i || !(await confirmar("Tirar o item " + (k + 1) + (i.descricao ? " (" + i.descricao + ")" : "") + " do termo?", "Tirar", "Manter"))) return;
    t.itens.splice(k, 1);
    await salvarExec(x); render();
  },
  termoUsarNome: async (b) => {
    const osId = b.dataset.os;
    if (bloqueada(osId)) return;
    const x = execDe(osId); termoDe(osId).contraparte.nome = b.dataset.v;
    await salvarExec(x); render();
  },
  guardarTermo: async (b) => {
    const osId = b.dataset.os;
    if (bloqueada(osId)) return;
    const ok = await guardarTermo(osId, true);
    if (!ok) return;
    if (!execDe(osId).chegada) { render(); return; }
    await preencherConferencia(osId);
    seguirDepoisDe(osId, "termo", "Termo guardado.");
  },
  guardarColab: async (b) => {
    const osId = b.dataset.os;
    if (bloqueada(osId, "colaborador")) return;
    const nome = $("cNome").value.trim(), doc = $("cDoc").value.trim();
    const faltam = [];
    if (!quadro || quadro.tracos < 5) faltam.push("a sua assinatura no quadro");
    if (!R.nomeCompletoOk(nome)) faltam.push("o seu nome completo (nome e sobrenome)");
    if (faltam.length) { recado("Falta " + faltam.join(" e ") + ".", 5000); return; }
    const erroDoc = R.documentoErro(doc);
    if (erroDoc) { recado(erroDoc, 6000); $("cDoc").focus(); return; }
    const imagem = imagemDoQuadro();
    if (imagem.length < 800) { recado("A assinatura ficou muito pequena. Assine de novo, maior.", 5000); return; }
    await registrar(osId, "ASSINATURA", { papel: "COLABORADOR", nome, documento: doc, imagem, versaoApp: VERSAO || "campo" });
    const x = execDe(osId); x.assinaturaColab = { nome, documento: doc, imagem, em: new Date().toISOString() };
    await salvarExec(x);
    seguirDepoisDe(osId, "colaborador", "Sua assinatura foi guardada.");
  },
  refazerColab: async (b) => {
    const osId = b.dataset.os;
    if (bloqueada(osId, "colaborador")) return;
    if (!(await confirmar("Refazer a sua assinatura? A nova substitui a anterior.", "Refazer", "Manter"))) return;
    const x = execDe(osId); x.assinaturaColab = null; await salvarExec(x); render();
  },
  responder: async (b) => {
    const osId = b.dataset.os;
    if (bloqueada(osId)) return;
    await gravarResposta(osId, b.dataset.p, b.dataset.v);
    render();
  },
  marcar: async (b) => {
    const osId = b.dataset.os;
    if (bloqueada(osId)) return;
    const x = execDe(osId), r = x.respostas[b.dataset.p], atual = r && Array.isArray(r.valor) ? r.valor : [];
    const novo = atual.includes(b.dataset.v) ? atual.filter((v) => v !== b.dataset.v) : atual.concat(b.dataset.v);
    await gravarResposta(osId, b.dataset.p, novo);
    render();
  },
  camera: (b) => abrirCamera(b.dataset.os, b.dataset.p, false),
  galeria: (b) => abrirCamera(b.dataset.os, b.dataset.p, true),
  lerQr: (b) => abrirCamera(b.dataset.os, "", false, true),
  serieConfere: (b) => confirmarEquipamento(b.dataset.os, E.os.get(b.dataset.os).equipamento.serie, "SERIE"),
  tagConfere: (b) => { const eq = E.os.get(b.dataset.os).equipamento; return confirmarEquipamento(b.dataset.os, eq.serie || eq.tag, "TAG"); },
  // 19/11/2026 (pedido do dono): equipamento sem série nem TAG na etiqueta; o técnico segue e a gestão completa o cadastro depois.
  semIdentificacao: (b) => confirmarEquipamento(b.dataset.os, "SEM SERIE/TAG", "SEM_IDENT"),
  serieDigitada: (b) => {
    const s = $("eqSerie").value.trim().toUpperCase();
    if (s.length < 2) { recado("Digite a série que está na etiqueta do equipamento."); $("eqSerie").focus(); return; }
    return confirmarEquipamento(b.dataset.os, s, "SERIE");
  },
  removerFoto: async (b) => {
    const osId = b.dataset.os, id = b.dataset.id;
    if (bloqueada(osId)) return;
    if (!(await confirmar("Remover esta foto?", "Remover", "Manter"))) return;
    const ok = await fila.desistir(usuario(), id);
    if (!ok) { recado("Esta foto já começou a ser enviada e não pode ser removida pelo app. Se ela estiver errada, avise o supervisor.", 6000); return; }
    const x = execDe(osId);
    x.fotos = x.fotos.filter((f) => f.idLocal !== id);
    await salvarExec(x); await atualizarResumo();
    recado("Foto removida."); render();
  },
  qtd: (b) => { const i = $("pQtd"); const n = R.lerNumero(i.value); i.value = String(Math.max(1, (n ? n.numero : 0) + Number(b.dataset.d))).replace(".", ","); },
  situacaoPeca: (b) => { alternar(b, "pSit"); $("pUrgBloco").hidden = b.dataset.v !== "FALTA"; },
  urgenciaPeca: (b) => alternar(b, "pUrg"),
  removerPeca: async (b) => {
    const osId = b.dataset.os, id = b.dataset.id;
    if (bloqueada(osId)) return;
    const x = execDe(osId), p = x.pecas.find((q) => q.id === id);
    if (!p || !(await confirmar("Desfazer o lançamento de \"" + p.descricao + "\"?", "Desfazer", "Manter"))) return;
    await registrar(osId, "PECA", { removerIdLocal: id });
    x.pecas = x.pecas.filter((q) => q.id !== id);
    await salvarExec(x); render();
  },
  guardarRelato: async (b) => { await guardarRelato(b.dataset.os, true); },
  // 13/11/2026: botões do resultado, linhas de medição e a revisão do texto (o que muda fica no rascunho até o "Guardar relato")
  relatoOpcao: async (b) => {
    const osId = b.dataset.os; if (bloqueada(osId)) return;
    const x = execDe(osId); guardarDigitado(x);
    x.relato = { ...x.relato, rascunho: { ...((x.relato && x.relato.rascunho) || {}), [b.dataset.k]: b.dataset.v } };
    await salvarExec(x); render();
  },
  medAdd: async (b) => {
    const osId = b.dataset.os; if (bloqueada(osId)) return;
    const x = execDe(osId); guardarDigitado(x);
    const r = x.relato.rascunho || {}, l = (Array.isArray(r.medicoes) ? r.medicoes : Array.isArray(x.relato.medicoes) ? x.relato.medicoes : []).slice();
    if (l.length >= 30) { recado("No máximo 30 medições por O.S."); return; }
    l.push({ grandeza: "", valor: "", unidade: "", obs: "" });
    x.relato = { ...x.relato, rascunho: { ...r, medicoes: l } };
    await salvarExec(x); render();
  },
  medTirar: async (b) => {
    const osId = b.dataset.os; if (bloqueada(osId)) return;
    const x = execDe(osId); guardarDigitado(x);
    const r = x.relato.rascunho || {}, l = (Array.isArray(r.medicoes) ? r.medicoes : Array.isArray(x.relato.medicoes) ? x.relato.medicoes : []).slice();
    l.splice(Number(b.dataset.i), 1);
    x.relato = { ...x.relato, rascunho: { ...r, medicoes: l } };
    await salvarExec(x); render();
  },
  revisarTexto: async (b) => { await revisarTexto(b.dataset.os); },
  usarRevisao: async (b) => {
    const osId = b.dataset.os, rv = E.revisao; if (!rv || rv.osId !== osId || bloqueada(osId)) return;
    const x = execDe(osId); guardarDigitado(x);
    const ks = b.dataset.k === "*" ? Object.keys(rv.revisado) : [b.dataset.k], r = { ...((x.relato && x.relato.rascunho) || {}) };
    for (const k of ks) { if (rv.revisado[k] !== undefined) { r[k] = rv.revisado[k]; delete rv.revisado[k]; } }
    x.relato = { ...x.relato, rascunho: r };
    if (!Object.keys(rv.revisado).length) E.revisao = null;
    await salvarExec(x); render();
    recado("Texto revisado colocado no campo. Confira e toque em \"Guardar relato\".", 5000);
  },
  fecharRevisao: () => { E.revisao = null; render(); },
  limparQuadro: () => { if (quadro) { quadro.ajustar(); quadro.tracos = 0; } },
  assinarCheia: (b) => { const n = $(b.dataset.nome); assinarTelaCheia(n ? n.value.trim() : ""); },
  desfazerConclusao: (b) => desfazerConclusao(b.dataset.os),
  pedirCorrecao: (b) => pedirCorrecao(b.dataset.os),
  guardarAssinatura: async (b) => {
    const osId = b.dataset.os;
    if (bloqueada(osId)) return;
    const nome = $("aNome").value.trim(), doc = $("aDoc").value.trim();
    const faltam = [];
    if (!quadro || quadro.tracos < 5) faltam.push("a assinatura no quadro");
    // 03/11/2026 (decisão do dono): nome completo obrigatório; documento sempre opcional, conferido se preenchido
    if (!R.nomeCompletoOk(nome)) faltam.push("o nome completo de quem assina (nome e sobrenome)");
    if (faltam.length) { recado("Falta " + faltam.join(", ") + ".", 5000); if (!R.nomeCompletoOk(nome)) $("aNome").focus(); return; }
    const erroDoc = R.documentoErro(doc);
    if (erroDoc) { recado(erroDoc, 6000); $("aDoc").focus(); return; }
    const imagem = imagemDoQuadro();
    if (imagem.length < 800) { recado("A assinatura ficou muito pequena. Peça para assinar de novo, maior.", 5000); return; }
    const em = new Date().toISOString();
    // 16/11/2026 (opção B): marca da declaração mostrada antes do quadro (o PDF confere que é o mesmo texto)
    const oD = E.os.get(osId), xD = execDe(osId), declaracaoMarca = oD && oD.declaracaoEntrega ? await marcaDeclaracao(declaracaoEntregaTexto(dadosDeclaracao(oD, xD)).join(String.fromCharCode(10))) : "";
    await registrar(osId, "ASSINATURA", { nome, documento: doc, imagem, versaoApp: VERSAO || "campo", ...(declaracaoMarca ? { declaracaoMarca } : {}) });
    const x = execDe(osId); x.assinatura = { nome, documento: doc, imagem, ausente: false, em };
    await salvarExec(x);
    seguirDepoisDe(osId, "assinatura", "Assinatura guardada.");
  },
  semAssinatura: async (b) => {
    const osId = b.dataset.os;
    if (bloqueada(osId)) return;
    const motivo = $("aMotivo").value, recebidoPor = $("aRecebido").value.trim(), justificativa = $("aJust").value.trim();
    if (recebidoPor.length < 3) { recado("Escreva o nome de quem recebeu o serviço.", 5000); $("aRecebido").focus(); return; }
    if (letras(justificativa) < 10) { recado("Escreva a justificativa (pelo menos uma frase).", 5000); $("aJust").focus(); return; }
    const em = new Date().toISOString();
    await registrar(osId, "ASSINATURA", { semAssinatura: true, motivo, recebidoPor, justificativa });
    const x = execDe(osId); x.assinatura = { ausente: true, motivo, recebidoPor, justificativa, em };
    await salvarExec(x);
    seguirDepoisDe(osId, "assinatura", "Registrado sem assinatura.");
  },
  refazerAssinatura: async (b) => {
    const osId = b.dataset.os;
    if (bloqueada(osId)) return;
    if (!(await confirmar("Refazer a assinatura? A nova substitui a anterior.", "Refazer", "Manter"))) return;
    const x = execDe(osId); x.assinatura = null; await salvarExec(x); render();
  },
  concluir: async (b) => {
    const osId = b.dataset.os, o = E.os.get(osId), x = execDe(osId);
    if (x.conclusao || bloqueada(osId)) return;
    await guardarRelato(osId, false);
    await guardarTermo(osId, false);
    await descarregarRonda();
    const f = R.faltasParaConcluir(o, x);
    if (f.length) { recado("Ainda falta: " + f.join(" "), 7000); render(); return; }
    const r = await confirmarLocalizacao("Concluí");
    if (!r) return;
    const em = new Date().toISOString();
    await registrar(osId, "CONCLUI", dadosLocalizacao(r));
    x.conclusao = { em, loc: r.loc };
    await salvarExec(x);
    recado(navigator.onLine === false ? "O.S. concluída. Guardada no aparelho para enviar quando houver sinal." : "O.S. concluída.", 5000);
    render();
  },
  irEnviar: (b) => ir("#/os/" + encodeURIComponent(b.dataset.os) + "/enviar"),
  enviarCliente: async (b) => {
    const osId = b.dataset.os, o = E.os.get(osId), x = execDe(osId);
    const e = (o && o.envio) || R.normalizarEnvio(null, o && o.relatorioUrl, o && o.situacao);
    if (!e.pdfGerado) { recado("O relatório ainda não foi gerado no servidor. Atualize a agenda e tente de novo.", 6000); return; }
    const para = [...document.querySelectorAll("#tela .chk:checked")].map((c) => ({ nome: c.dataset.nome || "", email: (c.dataset.email || "").toLowerCase() }));
    const outro = ($("envOutro") ? $("envOutro").value : "").trim().toLowerCase();
    if (outro) { if (!R.emailOk(outro)) { recado("O e-mail digitado não está completo (nome@dominio). Confira com o cliente.", 6000); $("envOutro").focus(); return; } if (!para.some((p) => p.email === outro)) para.push({ nome: "", email: outro }); }
    if (!para.length) { recado("Marque pelo menos um contato ou digite o e-mail do cliente.", 6000); return; }
    if (!(await confirmar("Enviar o relatório da " + (o ? o.numero : "O.S.") + " por e-mail para " + para.map((p) => p.email).join(", ") + "?", "Enviar", "Voltar"))) return;
    const em = new Date().toISOString();
    await registrar(osId, "ENVIAR_CLIENTE", { para, reenviar: !!e.enviadoEm });
    x.envio = { em, para };
    await salvarExec(x);
    recado(navigator.onLine === false ? "Envio guardado no aparelho. Sobe sozinho quando houver sinal." : "Envio registrado. O e-mail sai pelo servidor em instantes.", 5000);
    ir("#/os/" + encodeURIComponent(osId));
  },
  enviarAgora: () => tentarEnviar(true),
  tentarDeNovo: async (b) => { await fila.tentarDeNovo(usuario(), b.dataset.id); E.proximaTentativa = 0; await atualizarResumo(); tentarEnviar(true); },
  atualizarApp: () => { if (E.swNovo) E.swNovo.postMessage({ tipo: "assumir" }); },
  instalar: async () => { if (!E.instalar) return; E.instalar.prompt(); try { await E.instalar.userChoice; } catch (e) { /* segue */ } E.instalar = null; render(); },
  letra: async () => { const g = document.documentElement.dataset.letra === "grande" ? "" : "grande"; document.documentElement.dataset.letra = g; await B.cfg.gravar("letra", g); render(); },
  sair: async () => {
    const n = E.resumo.pendentes;
    const ok = await confirmar(n ? "Ainda há " + n + " item(ns) para enviar. Se sair, eles continuam guardados neste aparelho e são enviados quando você entrar de novo aqui. Sair mesmo assim?" : "Sair do SGO+ Campo neste aparelho?", "Sair", "Ficar");
    if (!ok) return;
    const s = E.sessao;
    if (s && navigator.onLine !== false) { try { await chamar("logout", [s.sessionId]); } catch (e) { /* segue */ } }
    await esquecerSessao();
    E.os.clear(); E.exec.clear();
    await atualizarResumo();
    ir("#/dia");
  },
};
Object.assign(acoes, acoesNovo);   // ações do "Novo atendimento" (acoesNovo é definido antes deste ponto)

async function gravarResposta(osId, perguntaId, valor) {
  const x = execDe(osId);
  await registrar(osId, "RESPOSTA", { perguntaId, valor }, "p:" + perguntaId);
  x.respostas[perguntaId] = { valor, em: new Date().toISOString() };
  await salvarExec(x);
}

/** Um item RELATO com todos os campos (inclusive a confirmação do equipamento); o que ainda não foi tentado é atualizado. */
async function registrarRelato(osId, x) {
  const rel = x.relato || {}, dados = {};
  // 12/11/2026: campo apagado pelo técnico (texto vazio) também vai, para o servidor apagar; antes o texto antigo ficava no relatório
  for (const [k] of R.CAMPOS_RELATO) if (rel[k] || rel[k] === "") dados[k] = rel[k];
  // 13/11/2026: resultado do atendimento e medições (servidor antigo ignora; lista vazia apaga)
  for (const k of ["testeResultado", "resultadoFinal", "resultadoDetalhe"]) if (rel[k] || rel[k] === "") dados[k] = rel[k];
  if (Array.isArray(rel.medicoes)) dados.medicoes = R.medicoesValidas(rel.medicoes);
  if (rel.serieConfirmada) { dados.serieConfirmada = rel.serieConfirmada; dados.identificadoPor = rel.identificadoPor || "SERIE"; }
  await registrar(osId, "RELATO", dados, "relato");
  x.relato = { ...rel, em: new Date().toISOString() };
  delete x.relato.rascunho;
  await salvarExec(x);
}
function lerCamposRelato(x) {
  const rel = { ...(x.relato || {}) }, rasc = rel.rascunho || {};
  let mudou = false;
  // 13/11/2026: também a restrição/pendência da liberação (texto), o resultado do teste e a situação ao final (botões) e as medições
  for (const k of R.CAMPOS_RELATO.map((c) => c[0]).concat(["resultadoDetalhe"])) {
    const t = $("r_" + k), v = (t ? t.value : rasc[k] !== undefined ? rasc[k] : rel[k] || "").trim();
    if (v !== (rel[k] || "")) { rel[k] = v; mudou = true; }
  }
  for (const k of ["testeResultado", "resultadoFinal"]) if (rasc[k] !== undefined && rasc[k] !== (rel[k] || "")) { rel[k] = rasc[k]; mudou = true; }
  if (rasc.medicoes !== undefined) {
    const m = R.medicoesValidas(rasc.medicoes);
    if (JSON.stringify(m) !== JSON.stringify(R.medicoesValidas(rel.medicoes))) { rel.medicoes = m; mudou = true; }
  }
  return { rel, mudou };
}
/** O que está digitado na tela do relato vai para o rascunho antes de redesenhar (botões, medições, revisão). */
function guardarDigitado(x) {
  const r = { ...((x.relato && x.relato.rascunho) || {}) };
  document.querySelectorAll("[data-relato]").forEach((t) => { r[t.dataset.relato] = t.value; });
  const med = document.querySelectorAll("[data-med]");
  if (med.length) {
    const l = (Array.isArray(r.medicoes) ? r.medicoes : Array.isArray(x.relato && x.relato.medicoes) ? x.relato.medicoes : []).map((m) => ({ ...m }));
    med.forEach((t) => { const i = Number(t.dataset.med); if (l[i]) l[i][t.dataset.mk] = t.value; });
    r.medicoes = l;
  }
  x.relato = { ...x.relato, rascunho: r };
}
/**
 * 13/11/2026: "Revisar o português" (Ast_appRevisarTexto, precisa de sinal). A IA só corrige e organiza o que você escreveu; o
 * servidor descarta a revisão que traz número novo ou muda muito o tamanho. Nada é trocado sem você tocar em "Usar".
 */
async function revisarTexto(osId) {
  const x = execDe(osId), o = E.os.get(osId);
  if (!o || fechada(o) || E.revisando) return;
  guardarDigitado(x);
  const v = relatoVisivel(x), campos = {};
  for (const k of R.CAMPOS_RELATO.map((c) => c[0]).concat(["resultadoDetalhe"])) if (R.palavras(v[k]) >= 2) campos[k] = String(v[k]);
  if (!Object.keys(campos).length) { recado("Escreva o relato antes de pedir a revisão."); return; }
  if (navigator.onLine === false || !E.sessao) { recado("A revisão do texto precisa de internet. O seu texto continua guardado no aparelho."); return; }
  E.revisando = true; render();
  try {
    const r = await chamar("Ast_appRevisarTexto", [E.sessao.sessionId, { osId: o.provisoria ? "" : osId, campos }], { prazoMs: 60000 });
    if (r && r.ok === false) { recado(r.message || "Não foi possível revisar agora.", 7000); return; }
    E.revisao = { osId, revisado: (r && r.revisado) || {}, message: (r && r.message) || "" };
    if (!Object.keys(E.revisao.revisado).length) { recado(E.revisao.message || "Nada a mudar.", 7000); }
  } catch (e) {
    recado(e instanceof ErroRede ? "Sem sinal agora: a revisão fica para depois. O seu texto continua guardado." : "Não foi possível revisar: " + (e.message || e), 7000);
  } finally { E.revisando = false; render(); }
}
async function guardarRelato(osId, avisar) {
  const x = execDe(osId), o = E.os.get(osId);
  if (x.conclusao || (o && o.fechadaNoServidor)) return;
  const { rel, mudou } = lerCamposRelato(x);
  if (!mudou) {
    if (!avisar) return;
    if (!R.textoDoRelato(rel) && !rel.testeResultado && !rel.resultadoFinal) { recado("Escreva o relato antes de guardar."); return; }
    seguirDepoisDe(osId, "relato", "Relato já guardado.");
    return;
  }
  x.relato = rel;
  await registrarRelato(osId, x);
  // 03/11/2026 (pedido do dono): antes o app ficava na mesma tela depois de "Guardar relato"; agora segue para o próximo passo que falta
  if (avisar) seguirDepoisDe(osId, "relato", "Relato guardado.");
}

/**
 * Depois de guardar um passo (relato, termo, assinatura, equipamento): o passo ainda tem falta = fica na tela e diz o que falta;
 * completo = vai para o próximo passo que falta (R.proximoPasso) ou para o Concluí. A chegada é um toque na tela da O.S.
 */
function seguirDepoisDe(osId, atual, feito) {
  const o = E.os.get(osId), x = execDe(osId);
  if (!o) { render(); return; }
  const falta = R.faltasDoPasso(o, x, atual);
  if (falta.length) { recado(feito + " Ainda falta neste passo: " + falta.map((t) => t.replace(/^No (relato|termo): /, "")).join(" "), 8000); render(); return; }
  const p = R.proximoPasso(o, x, atual);
  recado(feito + (p === "concluir" ? " Tudo preenchido: confira e toque em Concluí." : " Agora: " + R.nomePasso(o, p) + "."), 5000);
  ir("#/os/" + encodeURIComponent(osId) + (p === "chegada" ? "" : "/" + p));
}

/* ---------------- termo da logística (03/11/2026) ---------------- */
function termoDe(osId) {
  const x = execDe(osId), o = E.os.get(osId);
  if (!x.termo && o) x.termo = R.termoInicial(o);
  return x.termo;
}
function definirCampoTermo(t, caminho, v) {
  const p = String(caminho).split(".");
  if (p[0] === "itens") { const i = t.itens[Number(p[1])]; if (i) i[p[2]] = v; }
  else if (p[0] === "contraparte") t.contraparte[p[1]] = v;
  else t[p[0]] = v;
}
/**
 * Põe o termo na fila (evento RELATO com "logistica"; um item só enquanto não foi tentado). Sem o "Cheguei" ainda, fica só no
 * aparelho e sobe depois da chegada (fazerChegada). Devolve false se não há o que guardar.
 */
async function guardarTermo(osId, avisar) {
  const x = execDe(osId), o = E.os.get(osId);
  if (!o || !o.logistica || x.conclusao || o.fechadaNoServidor) return false;
  if (!x.termo) { if (avisar) recado("Preencha o termo antes de guardar."); return false; }
  clearTimeout(timerRascunho);
  await salvarExec(x);
  if (!x.chegada) { if (avisar) recado("Termo guardado no aparelho. Ele vai para o servidor depois do \"Cheguei\".", 6000); return true; }
  const dados = R.termoParaEnvio(x.termo), json = JSON.stringify(dados);
  if (json === x.termoEnviado) return true;
  await registrar(osId, "RELATO", { logistica: dados }, "termo");
  x.termoEnviado = json; x.termoEnviadoEm = new Date().toISOString();
  await salvarExec(x);
  return true;
}
/**
 * Conferência (checklist MOD_LOGISTICA) a partir do termo, só nas perguntas ainda sem resposta: "conferido" = Sim com o termo
 * completo; "estado" = Com avaria / Bom / Não se aplica pelos itens; "acessorios" = os acessórios dos itens. A pessoa pode mudar.
 */
async function preencherConferencia(osId) {
  const o = E.os.get(osId), x = execDe(osId);
  if (!o || !o.logistica || !x.termo || !x.chegada) return;
  const itens = x.termo.itens.filter((i) => i.descricao || i.identificacao), est = itens.map((i) => i.estado);
  if (!itens.length) return;
  for (const p of o.checklist) {
    if (x.respostas[p.id]) continue;
    let v = "";
    if (p.id === "conferido" && p.tipo === "SIM_NAO" && !R.faltasDoTermo(o, x.termo).length) v = "SIM";
    else if (p.id === "estado" && p.tipo === "OPCAO") {
      // item "não se aplica" (documento, manual) não conta: com avaria em algum = Com avaria; senão, algum bom = Bom
      const alvo = est.includes("AVARIA") ? "Com avaria" : est.includes("") ? "" : est.includes("BOM") ? "Bom" : "Não se aplica";
      if (alvo && p.opcoes.includes(alvo)) v = alvo;
    } else if (p.id === "acessorios" && p.tipo === "TEXTO") v = itens.map((i) => i.acessorios).filter(Boolean).join("; ");
    if (v) await gravarResposta(osId, p.id, v);
  }
}

async function fazerChegada(osId) {
  if (bloqueada(osId)) return;
  const x = execDe(osId);
  if (x.chegada) { recado("Chegada já registrada às " + hora(x.chegada.em) + "."); return; }
  const r = await confirmarLocalizacao("Cheguei");
  if (!r) return;
  const em = new Date().toISOString();
  await registrar(osId, "CHEGUEI", dadosLocalizacao(r));
  x.chegada = { em, loc: r.loc };
  await salvarExec(x);
  // logística: o termo preparado antes da chegada sobe agora, depois do CHEGUEI (03/11/2026)
  const o = E.os.get(osId);
  if (o && o.logistica && x.termo) { await guardarTermo(osId, false); await preencherConferencia(osId); }
  if (o && o.ronda) await enviarRondaAposChegada(osId);
  recado(r.loc ? "Chegada registrada às " + hora(em) + "." : "Chegada registrada às " + hora(em) + ", sem localização.");
  render();
}
async function fazerSaida(osId) {
  if (bloqueada(osId)) return;
  const x = execDe(osId);
  if (x.saida) { recado("Saída já registrada às " + hora(x.saida.em) + "."); return; }
  if (x.chegada) { recado("A chegada já foi registrada."); return; }
  if (!(await confirmar("Registrar que você saiu para este atendimento? (sem localização)", "Registrar", "Cancelar"))) return;
  const em = new Date().toISOString();
  await registrar(osId, "SAIU", {});
  x.saida = { em };
  await salvarExec(x);
  recado("Saída registrada às " + hora(em) + ".");
  render();
}

async function entrar(ev) {
  ev.preventDefault();
  const u = $("eUsuario").value.trim(), s = $("eSenha").value, erro = $("eErro"), bt = $("eBotao");
  erro.hidden = true;
  if (navigator.onLine === false) { erro.textContent = "Sem internet agora. Para entrar é preciso sinal."; erro.hidden = false; return; }
  bt.disabled = true; bt.textContent = "Entrando...";
  let v;
  try { v = await chamar("login", [u, s]); }
  catch (e) { erro.textContent = e instanceof ErroRede ? "Sem conexão com o servidor. Tente de novo quando houver sinal." : String(e.message || e); erro.hidden = false; bt.disabled = false; bt.textContent = "Entrar"; return; }
  if (!v || !v.success) { erro.textContent = (v && v.message) || "E-mail ou senha inválidos."; erro.hidden = false; bt.disabled = false; bt.textContent = "Entrar"; return; }
  if (v.etapa) { abrirEtapaLogin(v, u); return; }
  await concluirEntrada(v, u);
}

function abrirEtapaLogin(v, u) {
  if (v.etapa === "CODIGO") E.etapaLogin = { tipo: "CODIGO", usuario: u, desafio: v.desafio, message: v.message, podeEmail: !!v.podeEmail, reenviosRestantes: v.reenviosRestantes, reenviarEm: Date.now() + (Number(v.reenviarEmS) || 0) * 1000 };
  else if (v.etapa === "TROCAR_SENHA") E.etapaLogin = { tipo: "SENHA", usuario: u, sessionId: v.sessionId, user: v.user };
  else E.etapaLogin = { tipo: "SEM_ENVIO", message: v.message || "Não foi possível concluir a entrada. Fale com o administrador do SGO+." };
  render();
  if (E.etapaLogin.tipo === "CODIGO") {
    const fim = E.etapaLogin.reenviarEm, et = E.etapaLogin;
    const tique = setInterval(() => { if (E.etapaLogin !== et || Date.now() > fim + 1500) { clearInterval(tique); if (E.etapaLogin === et) render(); return; } const b = document.querySelector('[data-acao="reenviarCodigo"]'); if (b) { const f = Math.ceil((fim - Date.now()) / 1000); if (f > 0) b.textContent = "Reenviar código (em " + f + " s)"; } }, 1000);
  }
  setTimeout(() => { const c = $("eCodigo") || $("eNova"); if (c) c.focus(); }, 50);
}

function erroEtapa(msg) { const e = $("eErro"); if (e) { e.textContent = msg; e.hidden = false; } const b = $("eBotao"); if (b) b.disabled = false; }

async function enviarCodigo(ev) {
  ev.preventDefault();
  const t = E.etapaLogin, bt = $("eBotao");
  const codigo = String($("eCodigo").value || "").replace(/\D/g, "");
  if (codigo.length !== 6) { erroEtapa("Digite os 6 números do código que chegou para você."); return; }
  bt.disabled = true; bt.textContent = "Conferindo...";
  let v;
  try { v = await chamar("verificarCodigoAcesso", [t.desafio, codigo, !!$("eConfiar").checked]); }
  catch (e) { bt.textContent = "Confirmar e entrar"; erroEtapa(e instanceof ErroRede ? "Sem conexão com o servidor. Tente de novo quando houver sinal." : String(e.message || e)); return; }
  bt.textContent = "Confirmar e entrar";
  if (v && v.success && v.etapa === "TROCAR_SENHA") { abrirEtapaLogin(v, t.usuario); return; }
  if (v && v.success && v.sessionId) { E.etapaLogin = null; await concluirEntrada(v, t.usuario); return; }
  if (v && v.etapa === "LOGIN") { E.etapaLogin = { tipo: "SEM_ENVIO", message: v.message }; render(); return; }
  $("eCodigo").value = "";
  erroEtapa((v && v.message) || "O código não foi aceito. Confira e digite de novo.");
}

async function reenviarCodigo(canal) {
  const t = E.etapaLogin;
  if (!t || t.tipo !== "CODIGO") return;
  let v;
  try { v = await chamar("reenviarCodigoAcesso", [t.desafio, { canal: canal || "" }]); }
  catch (e) { recado(e instanceof ErroRede ? "Sem conexão. Tente de novo quando houver sinal." : String(e.message || e)); return; }
  if (v && v.success) { abrirEtapaLogin(v, t.usuario); recado("Código novo enviado. Use só o mais recente."); return; }
  if (v && v.etapa === "LOGIN") { E.etapaLogin = { tipo: "SEM_ENVIO", message: v.message }; render(); return; }
  recado((v && v.message) || "Não foi possível reenviar agora.", 6000);
}

async function enviarSenhaNova(ev) {
  ev.preventDefault();
  const t = E.etapaLogin, bt = $("eBotao");
  const nova = $("eNova").value, conf = $("eConf").value;
  if (nova.length < 8 || !/[A-Za-zÀ-ÿ]/.test(nova) || !/\d/.test(nova)) { erroEtapa("A senha nova precisa de 8 caracteres ou mais, com letras e números."); return; }
  if (nova !== conf) { erroEtapa("Digite a mesma senha nova nos dois campos."); return; }
  bt.disabled = true; bt.textContent = "Salvando...";
  let v;
  try { v = await chamar("trocarSenhaAcesso", [t.sessionId, { nova, confirmacao: conf }]); }
  catch (e) { bt.textContent = "Salvar a senha nova e entrar"; erroEtapa(e instanceof ErroRede ? "Sem conexão com o servidor. Nada foi alterado: tente de novo quando houver sinal." : String(e.message || e)); return; }
  bt.textContent = "Salvar a senha nova e entrar";
  if (v && v.success) { E.etapaLogin = null; await concluirEntrada({ sessionId: v.sessionId || t.sessionId, user: v.user || t.user }, t.usuario); recado("Senha nova criada. Use-a no próximo login.", 6000); return; }
  if (v && v.etapa === "LOGIN") { E.etapaLogin = { tipo: "SEM_ENVIO", message: v.message }; render(); return; }
  erroEtapa((v && v.message) || "A senha não foi aceita. Confira as regras e tente de novo.");
}

/** 31/10/2026: "Esqueci minha senha" — a resposta é sempre a mesma (não revela se o e-mail tem conta). */
async function pedirLinkSenha(ev) {
  ev.preventDefault();
  const bt = $("eBotao");
  const email = String($("eEmailEsq").value || "").replace(/\s+/g, "").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { erroEtapa("Confira o e-mail digitado: ele precisa ter o formato nome@empresa.com.br."); return; }
  if (navigator.onLine === false) { erroEtapa("Sem internet agora. Para pedir o link é preciso sinal."); return; }
  bt.disabled = true; bt.textContent = "Enviando...";
  let v;
  try { v = await chamar("pedirRedefinicaoSenha", [email]); }
  catch (e) { bt.disabled = false; bt.textContent = "Enviar o link"; erroEtapa(e instanceof ErroRede ? "Sem conexão com o servidor. Tente de novo quando houver sinal." : String(e.message || e)); return; }
  if (!v || !v.success) { bt.disabled = false; bt.textContent = "Enviar o link"; erroEtapa((v && v.message) || "Não foi possível pedir o link agora."); return; }
  E.etapaLogin = { tipo: "ESQUECI", email, enviado: v.message };
  render();
}

/** Login aprovado (senha, código ou senha nova): guarda a sessão e abre o Meu dia. */
async function concluirEntrada(v, u) {
  const us = v.user || {};
  // "usuario" (login interno) continua a chave dos dados guardados no aparelho: a fila de envios de antes não se perde
  await salvarSessao({ sessionId: v.sessionId, usuario: us.usuario || u.toLowerCase(), email: us.email || (u.indexOf("@") > 0 ? u.replace(/\s+/g, "").toLowerCase() : ""), nome: us.nome || "", perfil: us.perfil || "", userId: us.id || "", renovadaEm: Date.now(), entrouEm: Date.now(), expirada: false });
  await carregarDoAparelho();
  E.espera = 0; E.proximaTentativa = 0; E.bloqueio = "";
  ir("#/dia");
  verificarArmazenamento();
  tentarEnviar(false).then(() => baixarDia(false));
}

/* ---------------- armazenamento e instalação ---------------- */
async function verificarArmazenamento() {
  const ua = navigator.userAgent || "";
  const ios = /iP(hone|ad|od)/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const instalado = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  let persistente = false;
  try {
    if (navigator.storage && navigator.storage.persisted) {
      persistente = await navigator.storage.persisted();
      if (!persistente && navigator.storage.persist) persistente = await navigator.storage.persist();
    }
  } catch (e) { persistente = false; }
  E.arm = { ios, instalado, persistente };
  avisos();
}

/* ---------------- início ---------------- */
document.addEventListener("click", (e) => {
  const j = e.target.closest("[data-j]");
  if (j && $("janela").contains(j)) { e.preventDefault(); fecharJanela(j.dataset.j); return; }
  if (e.target === $("janela")) { fecharJanela(null); return; }
  const b = e.target.closest("[data-acao]");
  if (!b || !acoes[b.dataset.acao]) return;
  if (b.tagName !== "A") e.preventDefault();
  if (b.disabled) return;
  Promise.resolve(acoes[b.dataset.acao](b, e)).catch((err) => recado("Não foi possível: " + (err && err.message || err), 6000));
});
document.addEventListener("submit", (e) => {
  if (e.target.id === "fEntrar") return entrar(e);
  if (e.target.id === "fEsqueci") return pedirLinkSenha(e).catch((err) => erroEtapa(String((err && err.message) || err)));
  if (e.target.id === "fCodigo") return enviarCodigo(e).catch((err) => erroEtapa(String((err && err.message) || err)));
  if (e.target.id === "fSenhaNova") return enviarSenhaNova(e).catch((err) => erroEtapa(String((err && err.message) || err)));
  if (/^fAtv/.test(e.target.id)) { e.preventDefault(); enviarFormAtv(e.target).catch((err) => recado("Não foi possível: " + (err && err.message || err), 6000)); return; }
  if (/^fNovo/.test(e.target.id)) { e.preventDefault(); enviarFormNovo(e.target).catch((err) => recado("Não foi possível: " + (err && err.message || err), 6000)); return; }
  if (e.target.id === "fRondaEquip") { e.preventDefault(); salvarEquipRonda(e.target).catch((err) => recado("Não foi possível: " + (err && err.message || err), 6000)); return; }
  if (e.target.id === "fPeca") {
    e.preventDefault();
    const osId = e.target.dataset.os;
    if (bloqueada(osId)) return;
    const descricao = $("pDesc").value.trim(), codigo = $("pCod").value.trim(), q = R.lerNumero($("pQtd").value), unidade = $("pUn").value.trim() || "un";
    const situacao = $("pSit").value === "FALTA" ? "FALTA" : "APLICADA", urgencia = situacao === "FALTA" ? $("pUrg").value : "";
    if (descricao.length < 2) { recado("Escreva o nome da peça."); $("pDesc").focus(); return; }
    if (!q || q.numero <= 0) { recado("Informe a quantidade."); $("pQtd").focus(); return; }
    (async () => {
      const dados = { descricao, codigo, quantidade: q.numero, unidade, situacao };
      if (urgencia) dados.urgencia = urgencia;
      const item = await registrar(osId, "PECA", dados);
      const x = execDe(osId); x.pecas.push({ id: item.idLocal, descricao, codigo, quantidade: q.numero, unidade, situacao, urgencia, em: item.em });
      await salvarExec(x); recado(situacao === "FALTA" ? "Peça em falta lançada (vai para Compras)." : "Peça lançada."); render();
    })().catch((err) => recado("Não foi possível: " + err.message));
  }
});
document.addEventListener("change", (e) => {
  const c = e.target;
  if (c.id === "arqCamera" || c.id === "arqGaleria") { aoEscolherFoto(e); return; }
  // Novo atendimento: trocar o tipo redesenha o formulário (o que o tipo exige e, na logística, os textos de retirada ou entrega)
  if (c.id === "tipoCodigo" && c.form && c.form.id === "fNovoOs") { const n = novoEstado(); Object.assign(n.form.os, lerForm(["sintoma", "solicitante", "contato"]), { tipoCodigo: c.value }); render(); return; }
  if (c.dataset && c.dataset.resposta) {
    const osId = c.dataset.os;
    if (bloqueada(osId)) return;
    let v = c.value.trim();
    if (c.dataset.resposta === "numero" && v) {
      const n = R.lerNumero(v);
      if (!n) { recado("Número inválido. Use só números, com vírgula para decimais."); c.focus(); return; }
      v = n.numero; c.value = n.texto;
    }
    gravarResposta(osId, c.dataset.p, v).then(() => { const caixa = c.closest(".pergunta"); if (caixa) caixa.classList.toggle("feita", v !== ""); });
  }
});
// 18/11/2026: câmera ou galeria fechada sem escolher (os navegadores novos avisam com "cancel"): não é foto perdida
document.addEventListener("cancel", (e) => { if (e.target && (e.target.id === "arqCamera" || e.target.id === "arqGaleria")) anotarFotoAberta(null); }, true);
let timerRascunho = null;
document.addEventListener("input", (e) => {
  // Novo atendimento: a mensagem de erro ao lado do campo some assim que a pessoa corrige
  if (e.target.form && /^fNovo/.test(e.target.form.id) && e.target.id) { e.target.classList.remove("invalido"); const m = $("e_" + e.target.id); if (m) m.remove(); }
  if (e.target.dataset && e.target.dataset.novoServico) { novoEstado().form.os.sintoma = e.target.value; return; }
  if (e.target.dataset && e.target.dataset.novoFiltro) { const n = novoEstado(); n.lista.filtro = e.target.value; const pos = e.target.selectionStart; render(); const el = $("nFiltro"); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (x) { /* segue */ } } return; }
  // termo da logística: cada letra fica no aparelho (salva em 0,6 s); "Guardar o termo" põe na fila
  // ronda: cada letra fica no aparelho; a fila recebe o item em 0,9 s (e ao sair da tela)
  const dr = e.target.dataset || {};
  if (dr.rdTxt || dr.rdSetor !== undefined || dr.rdOri || dr.rdNum) {
    const osId = dr.os, o = E.os.get(osId), x = execDe(osId), r = R.rondaDe(x);
    if (!o || fechada(o)) return;
    if (dr.rdTxt) { const it = r.itens[dr.chave] = { ...(r.itens[dr.chave] || {}) }; it[dr.rdTxt] = e.target.value; delete it.doServidor; agendarRonda(osId, dr.chave, "item"); }
    else if (dr.rdNum) { const n = R.lerNumero(e.target.value), it = r.itens[dr.chave] = { ...(r.itens[dr.chave] || {}) }; it.respostas = { ...(it.respostas || {}) }; if (n) it.respostas[dr.p] = n.numero; else delete it.respostas[dr.p]; delete it.doServidor; agendarRonda(osId, dr.chave, "item"); }
    else if (dr.rdOri) { r[dr.rdOri] = e.target.value; agendarRonda(osId, "_", "ori"); }
    else { const k = R.chaveSetor(dr.rdSetor); r.setores[k] = { ...(r.setores[k] || {}), nome: dr.rdSetor, achados: e.target.value }; agendarRonda(osId, dr.rdSetor, "setor"); }
    return;
  }
  const kt = e.target.dataset && e.target.dataset.termo;
  if (kt) {
    const osId = e.target.dataset.os, o = E.os.get(osId), xt = execDe(osId);
    if (!o || fechada(o)) return;
    definirCampoTermo(termoDe(osId), kt, e.target.value);
    clearTimeout(timerRascunho);
    timerRascunho = setTimeout(() => salvarExec(xt), 600);
    const st = $("tSit"); if (st) st.textContent = "No aparelho, ainda não guardado: toque em \"Guardar o termo\"";
    return;
  }
  // 13/11/2026: linhas de medição (rascunho, como o texto) e dica da especificação da peça
  if (e.target.dataset && e.target.dataset.med !== undefined && e.target.dataset.mk) {
    const xm = execDe(e.target.dataset.os), rm = { ...((xm.relato && xm.relato.rascunho) || {}) };
    const l = (Array.isArray(rm.medicoes) ? rm.medicoes : Array.isArray(xm.relato && xm.relato.medicoes) ? xm.relato.medicoes : []).map((m) => ({ ...m }));
    const i = Number(e.target.dataset.med); if (!l[i]) return;
    l[i][e.target.dataset.mk] = e.target.value;
    xm.relato = { ...xm.relato, rascunho: { ...rm, medicoes: l } };
    clearTimeout(timerRascunho); timerRascunho = setTimeout(() => salvarExec(xm), 800);
    const sm = $("rSit"); if (sm) sm.textContent = "Não guardado ainda: toque em \"Guardar relato\"";
    return;
  }
  if (e.target.dataset && e.target.dataset.pecaDesc) { const d = $("pDica"); if (d) d.textContent = R.dicaPeca(e.target.value); return; }
  const k = e.target.dataset && e.target.dataset.relato;
  if (!k) return;
  const x = execDe(e.target.dataset.os);
  x.relato = { ...x.relato, rascunho: { ...((x.relato && x.relato.rascunho) || {}), [k]: e.target.value } };
  clearTimeout(timerRascunho);
  timerRascunho = setTimeout(() => salvarExec(x), 800);
  const sit = $("rSit"); if (sit) sit.textContent = "Não guardado ainda: toque em \"Guardar relato\"";
});

let rotaAnterior = rotaAtual();
window.addEventListener("hashchange", () => {
  // saindo da tela do relato: guarda o que foi escrito
  if (rotaAnterior.tela === "os-relato" && rotaAnterior.osId && E.sessao) guardarRelato(rotaAnterior.osId, false).catch(() => {});
  if (rotaAnterior.tela === "os-termo" && rotaAnterior.osId && E.sessao) guardarTermo(rotaAnterior.osId, false).catch(() => {});
  if (rdPendentes.size && E.sessao) descarregarRonda().catch(() => {});
  rotaAnterior = rotaAtual();
  if ($("janela").hidden === false) fecharJanela(null);
  if (fecharTelaCheia) fecharTelaCheia();
  render();
  window.scrollTo(0, 0);
  assumirSePuder();
});
window.addEventListener("online", () => { E.proximaTentativa = 0; barra(); renovar(true).then(() => tentarEnviar(false)).then(() => baixarDia(false)); });
window.addEventListener("offline", () => { barra(); if (rotaAtual().tela === "dia") render(); });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  renovar(false).then(() => tentarEnviar(false));
  if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) navigator.serviceWorker.getRegistration("/campo/").then((r) => r && r.update()).catch(() => {});
});
window.addEventListener("beforeunload", (e) => { if (E.resumo.pendentes > 0) { e.preventDefault(); e.returnValue = ""; } });
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); E.instalar = e; avisos(); });
window.addEventListener("appinstalled", () => { E.instalar = null; verificarArmazenamento(); });

/** 18/11/2026: troca para a versão nova sem perguntar quando não há formulário aberto nem câmera, galeria ou janela abertas. */
function assumirSePuder() {
  if (!E.swNovo || !R.podeRedesenharSozinho(rotaAtual().tela) || $("janela").hidden === false || fecharTelaCheia || lerFotoAberta()) return;
  try { E.swNovo.postMessage({ tipo: "assumir" }); } catch (e) { /* fica o botão */ }
}
function registrarSw() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/campo/sw.js", { scope: "/campo/" }).then((reg) => {
    // 18/11/2026: versão nova assume sozinha quando a tela não tem formulário (tudo o que foi feito fica no aparelho); com formulário
    // aberto (assinatura, relato, termo), fica o aviso "Atualizar agora" e a troca acontece na próxima tela sem formulário
    const pronta = (w) => { E.swNovo = w; avisos(); assumirSePuder(); };
    const vigiar = (w) => { if (!w) return; w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) pronta(w); }); };
    if (reg.waiting && navigator.serviceWorker.controller) pronta(reg.waiting);
    reg.addEventListener("updatefound", () => vigiar(reg.installing));
  }).catch(() => { /* sem service worker: o app funciona com internet */ });
  let recarregou = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (E.swNovo && !recarregou) { recarregou = true; location.reload(); } });
}

async function iniciar() {
  if (!(await B.testar())) { E.semBanco = true; render(); return; }
  try { const l = await B.cfg.ler("letra"); if (l) document.documentElement.dataset.letra = l; } catch (e) { /* segue */ }
  try { E.ultimoUsuario = await B.cfg.ler("ultimoUsuario"); } catch (e) { /* segue */ }
  await carregarSessao();
  await carregarDoAparelho();
  render();
  avisarFotoPerdida();
  registrarSw();
  verificarArmazenamento();
  agendarEnvios();
  B.limparAntigos().catch(() => {});
  if (E.sessao) {
    await renovar(true);
    redesenharSozinho(false);
    if (podeEnviar()) { await tentarEnviar(false); baixarDia(false); }
  }
}
iniciar().catch((e) => { $("tela").innerHTML = `<div class="aviso erro"><p>O app não abriu: ${esc(e && e.message || e)}</p><p>Feche e abra de novo. Se continuar, avise o supervisor.</p></div>`; });

/* ---------------- ronda de engenharia clínica (03/11/2026) ----------------
 * Cheguei → setores (um a um, com progresso) → em cada equipamento um toque na situação; observação e defeito pedem descrição e
 * foto; "não verificado" pede o motivo; autoclave, lavadora, câmara fria e seladora têm perguntas fixas; equipamento fora do
 * cadastro é cadastrado ali; achados do setor; orientações e pedidos; resumo; duas assinaturas; Concluí. Cada toque fica no
 * aparelho na hora e entra na fila (evento RONDA, um item por equipamento enquanto não foi tentado): sem sinal, nada se perde. */
function setoresDe(o) { return R.setoresDaRonda(o, execDe(o.osId)); }
function telaOsRonda(o) {
  const x = execDe(o.osId), mapa = R.linkMapa(o.endereco), telefone = o.unidade.telefone || o.contato.telefone || o.cliente.telefone;
  const falta = new Set(R.faltasPorPasso(o, x).map(([p]) => p)), prox = R.proximoPasso(o, x, ""), aberta = !x.conclusao && !o.fechadaNoServidor, res = R.resumoRonda(o, x);
  return `${o.saiuDaAgenda ? `<div class="aviso alerta"><p>Esta ronda saiu da sua agenda no servidor. O que você já fez nela continua guardado e será enviado.</p></div>` : ""}
    ${o.fechadaNoServidor ? `<div class="aviso ${o.cancelada ? "erro" : "info"}"><p>${o.cancelada ? "Esta ronda foi cancelada." : "Esta ronda está encerrada no servidor."} Ela não aceita mais registros pelo app.</p></div>` : ""}
    ${o.fechadaNoServidor && !o.cancelada ? blocoEnvio(o) : ""}
    ${blocoCorrecao(o, x)}
    <div class="info">
      <p class="cli"><strong>${esc(o.cliente.nome || "Cliente não informado")}</strong></p>
      ${o.unidade.nome ? `<p>${esc(o.unidade.nome)}</p>` : ""}${o.endereco.texto ? `<p>${esc(o.endereco.texto)}</p>` : ""}
      ${o.unidade.responsavel ? `<p>Responsável: ${esc(o.unidade.responsavel)}</p>` : ""}
      <p>${esc(["Ronda de engenharia clínica", o.horario && "às " + o.horario].filter(Boolean).join(" · "))}</p>
      ${o.orientacao ? `<p><strong>Orientação:</strong> ${esc(o.orientacao)}</p>` : ""}
      <p class="fraco pequeno">${res.setores} setor(es) · ${res.equipamentos} equipamento(s) · ${res.equipamentos - res.semSituacao} com situação</p>
    </div>
    <div class="linha-botoes">${mapa ? `<a class="bt" href="${esc(mapa)}" target="_blank" rel="noopener">Abrir no mapa</a>` : ""}${telefone ? `<a class="bt" href="tel:${esc(telefone.replace(/[^\d+]/g, ""))}">Ligar</a>` : ""}</div>
    ${o.pendenciasServidor.length && (x.chegada || x.conclusao) ? `<div class="aviso alerta"><p>O servidor diz que falta: ${esc(o.pendenciasServidor.join("; "))}.</p>${(E.porOs.get(o.osId) || 0) ? "<p class=\"pequeno\">Pode ser só o que ainda não foi enviado deste aparelho.</p>" : ""}</div>` : ""}
    ${R.podeAssinarColabDepois(o, x) ? `<div class="aviso alerta"><p><strong>Falta a sua assinatura.</strong></p><button type="button" class="bt primario" data-acao="passo" data-os="${esc(o.osId)}" data-passo="colaborador">Assinar agora</button></div>` : ""}
    <h2>Passo a passo</h2>
    <p class="fraco pequeno">Percorra os setores um a um. Em cada equipamento, um toque na situação; problema pede descrição e foto. Sem sinal, tudo fica guardado.</p>
    ${aberta ? `<button type="button" class="bt primario continuar" data-acao="passo" data-os="${esc(o.osId)}" data-passo="${prox}">${prox === "concluir" ? "Tudo preenchido: ir para o Concluí" : "Continuar: " + esc(R.nomePasso(o, prox))}</button>` : ""}
    <ul class="passos">${R.passosDaOs(o).map((p) => linhaPasso(o, x, p, falta)).join("")}</ul>`;
}
function telaSetores(o) {
  const x = execDe(o.osId), l = setoresDe(o), f = fechada(o), id = `data-os="${esc(o.osId)}"`;
  return `${x.chegada ? "" : `<div class="aviso info"><p>Registre o "Cheguei" antes de começar: sem a chegada, o servidor recusa a ronda.</p></div>`}
    <p class="fraco">Toque no setor para ver os equipamentos. O selo mostra quantos já têm situação.</p>
    <div class="lista-setores">${l.map((s, i) => { const p = R.progressoSetor(o, x, s), ok = p.total > 0 && !p.comFalta;
      return `<button type="button" class="cartao setor ${ok ? "feito" : ""}" data-acao="rdAbrirSetor" ${id} data-i="${i}"><span class="cli">${esc(s.nome)}${s.extra ? " (novo)" : ""}</span>
        <span class="progresso" aria-hidden="true"><span style="width:${p.total ? Math.round(p.comSituacao * 100 / p.total) : 0}%"></span></span>
        <span class="linha">${p.comSituacao} de ${p.total} equipamento(s) com situação</span>
        <span class="selo ${ok ? "ok" : p.comFalta ? "alerta" : "neutro"}">${ok ? "Completo" : p.total ? "Falta " + p.comFalta : "Sem equipamento"}</span></button>`; }).join("") || `<div class="info"><p>A unidade não tem setor nem equipamento no cadastro. Cadastre o primeiro equipamento abaixo.</p></div>`}</div>
    ${f ? "" : `<button type="button" class="bt" data-acao="rdNovoSetor" ${id}>Acrescentar setor</button>
    <button type="button" class="bt" data-acao="rdNovoEquip" ${id} data-setor="">Equipamento fora do cadastro</button>`}
    ${seguirOuVoltar(o, "setores")}`;
}
function botoesResposta(o, eq, p, it, d) {
  const r = (it.respostas || {})[p.id], at = `data-os="${esc(o.osId)}" data-chave="${esc(eq.chave)}" data-p="${esc(p.id)}"`;
  if (p.tipo === "NUMERO") return `<div class="valor-linha"><input class="campo" ${d} inputmode="decimal" autocomplete="off" data-rd-num="1" ${at} value="${esc(r === undefined || r === null ? "" : String(r).replace(".", ","))}" aria-label="${esc(p.texto)}"></div>`;
  return `<div class="escolha">${R.OPCOES_SIM_NAO.map(([c, n]) => `<button type="button" class="bt" ${d} aria-pressed="${r === c}" data-acao="rdResp" ${at} data-v="${c}">${n}</button>`).join("")}</div>`;
}
function cartaoEquipRonda(o, x, eq, setor) {
  const reg = R.rondaDe(x), it = reg.itens[eq.chave] || {}, d = fechada(o) ? "disabled" : "", at = `data-os="${esc(o.osId)}" data-chave="${esc(eq.chave)}"`;
  const faltas = R.faltasDoItemRonda(o, x, eq), fs = R.fotosDoItemRonda(x, eq.chave), perg = R.perguntasDoEquipRonda(o, eq), val = eq.validade || {};
  const venc = [val.cal && val.cal.vencida ? "Calibração vencida" : "", val.qual && val.qual.vencida ? "Qualificação vencida" : ""].filter(Boolean);
  const nome = [eq.tipo, eq.modelo].filter(Boolean).join(" · ") || "Equipamento";
  return `<div class="pergunta rd-eq ${faltas.length ? "" : "feita"}" id="rd_${esc(eq.chave.replace(/[^\w-]/g, "_"))}">
    <div class="ptexto">${esc(nome)}${eq.novo ? ` <span class="selo neutro">Cadastrado na ronda</span>` : ""}</div>
    <div class="fraco pequeno">${esc([eq.tag && "TAG " + eq.tag, eq.serie && "Série " + eq.serie, eq.patrimonio && "Pat. " + eq.patrimonio].filter(Boolean).join(" · ") || "Sem identificação no cadastro")}</div>
    ${venc.length ? `<p><span class="selo erro">${esc(venc.join(" e "))}</span></p>` : ""}
    <div class="rd-sit" role="radiogroup" aria-label="Situação de ${esc(nome)}">${R.SITUACOES_RONDA.map(([c, n]) => `<button type="button" class="bt rd-${c.toLowerCase()}" ${d} aria-pressed="${it.situacao === c}" data-acao="rdSit" ${at} data-v="${c}">${esc(n)}</button>`).join("")}</div>
    ${it.situacao === "FORA_USO" ? `<p class="rotulo">O equipamento está</p><div class="rd-parada" role="radiogroup">${R.PARADAS_RONDA.map(([c, n]) => `<button type="button" class="bt" ${d} aria-pressed="${it.parada === c}" data-acao="rdParada" ${at} data-v="${c}">${esc(n)}</button>`).join("")}</div>` : ""}
    ${R.problemaRonda(it.situacao) || it.situacao === "NAO_LOCALIZADO" ? `<label class="rotulo" for="rdd_${esc(eq.chave)}">${it.situacao === "NAO_LOCALIZADO" ? "Observação (opcional)" : "O que foi encontrado"}</label>
      <textarea class="campo" id="rdd_${esc(eq.chave)}" rows="2" maxlength="1500" ${d} data-rd-txt="descricao" ${at}>${esc(it.descricao || "")}</textarea>` : ""}
    ${it.situacao === "NAO_VERIFICADO" ? `<label class="rotulo" for="rdm_${esc(eq.chave)}">Motivo de não ter verificado</label><textarea class="campo" id="rdm_${esc(eq.chave)}" rows="2" maxlength="500" ${d} data-rd-txt="motivo" ${at}>${esc(it.motivo || "")}</textarea>` : ""}
    ${R.problemaRonda(it.situacao) ? `${fs.length ? `<div class="grade-fotos">${fs.map((f) => miniaturaFoto(f, "")).join("")}</div>` : ""}<button type="button" class="bt ${fs.length ? "" : "primario"}" ${d} data-acao="rdFoto" ${at} data-leg="${esc(nome)}">${fs.length ? "Tirar outra foto" : "Tirar a foto do problema"}</button>` : ""}
    ${perg.length && ["FUNCIONANDO", "OBSERVACAO", "FORA_USO"].includes(it.situacao) ? `<div class="rd-perg"><p class="fraco pequeno"><strong>Verificações (${esc((o.ronda.categorias || {})[eq.categoria] || eq.categoria)})</strong></p>${perg.map((p) => `<div class="rd-q"><div>${esc(p.texto)}</div>${botoesResposta(o, eq, p, it, d)}</div>`).join("")}</div>` : ""}
    ${faltas.length && it.situacao ? `<ul class="rd-faltas">${faltas.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : ""}
  </div>`;
}
function telaSetor(o, parte) {
  const x = execDe(o.osId), l = setoresDe(o), i = Math.max(0, Math.min(l.length - 1, Number(parte) || 0)), s = l[i], f = fechada(o), id = `data-os="${esc(o.osId)}"`;
  if (!s) return `<p>Setor não encontrado.</p><button class="bt" data-acao="passo" ${id} data-passo="setores">Voltar aos setores</button>`;
  const p = R.progressoSetor(o, x, s), st = R.rondaDe(x).setores[s.chave] || {}, fsSetor = x.fotos.filter((ft) => ft.perguntaId === "ronda:setor:" + s.chave);
  const prox = R.proximoSetorComFalta(o, x, i);
  return `<p class="fraco">Setor ${i + 1} de ${l.length}: <strong>${esc(s.nome)}</strong> · ${p.comSituacao} de ${p.total} com situação</p>
    <span class="progresso" aria-hidden="true"><span style="width:${p.total ? Math.round(p.comSituacao * 100 / p.total) : 0}%"></span></span>
    ${s.equipamentos.map((eq) => cartaoEquipRonda(o, x, eq, s.nome)).join("") || `<div class="info"><p>Nenhum equipamento neste setor no cadastro.</p></div>`}
    ${f ? "" : `<button type="button" class="bt" data-acao="rdNovoEquip" ${id} data-setor="${esc(s.nome)}">Equipamento fora do cadastro neste setor</button>`}
    <h3>Achados gerais do setor (opcional)</h3>
    <textarea class="campo" rows="3" maxlength="3000" ${f ? "disabled" : ""} data-rd-setor="${esc(s.nome)}" ${id} placeholder="Ex.: tomada solta atrás da bancada; pia sem sabonete">${esc(st.achados || "")}</textarea>
    ${fsSetor.length ? `<div class="grade-fotos">${fsSetor.map((ft) => miniaturaFoto(ft, "")).join("")}</div>` : ""}
    ${f ? "" : `<button type="button" class="bt" data-acao="rdFotoSetor" ${id} data-setor="${esc(s.nome)}">Foto do setor</button>`}
    ${p.comFalta ? `<div class="faltas"><strong>Ainda falta neste setor:</strong> ${p.comFalta} equipamento(s). Veja a lista em cada cartão.</div>` : `<div class="tudo-certo">Setor completo.</div>`}
    <div class="rodape-acao">${f ? "" : `<button class="bt primario" data-acao="rdSeguirSetor" ${id} data-i="${i}">${prox >= 0 && prox !== i ? "Setor concluído: ir para " + esc(l[prox].nome) : prox === i ? "Conferir o que falta aqui" : "Todos os setores completos: seguir"}</button>`}
    <button class="bt" data-acao="passo" ${id} data-passo="setores">Voltar aos setores</button></div>`;
}
function telaEquipNovo(o, parte) {
  const setor = decodeURIComponent(parte || ""), id = `data-os="${esc(o.osId)}"`;
  return `<p class="fraco">Equipamento que está no setor e não estava no cadastro. Copie da plaqueta: tipo é obrigatório; série ou TAG, ao menos um. Depois tire uma foto dele na situação.</p>
    <form id="fRondaEquip" ${id}>
      <label class="rotulo" for="rqTipo">Tipo (autoclave, lavadora, câmara fria, seladora...)</label><input class="campo" id="rqTipo" maxlength="80" autocapitalize="words" autocomplete="off">
      <label class="rotulo" for="rqModelo">Modelo</label><input class="campo" id="rqModelo" maxlength="80" autocapitalize="characters" autocomplete="off">
      <label class="rotulo" for="rqSerie">Número de série</label><input class="campo" id="rqSerie" maxlength="80" autocapitalize="characters" autocomplete="off">
      <label class="rotulo" for="rqTag">TAG</label><input class="campo" id="rqTag" maxlength="60" autocapitalize="characters" autocomplete="off">
      <label class="rotulo" for="rqPat">Patrimônio</label><input class="campo" id="rqPat" maxlength="60" autocomplete="off">
      <label class="rotulo" for="rqSetor">Setor</label><input class="campo" id="rqSetor" maxlength="80" autocapitalize="words" autocomplete="off" value="${esc(setor)}">
      <p class="erro-campo" id="rqErro" hidden></p>
      <button type="submit" class="bt primario">Cadastrar e voltar ao setor</button>
    </form>
    <div class="rodape-acao"><button class="bt" data-acao="passo" ${id} data-passo="setores">Voltar aos setores</button></div>`;
}
function telaOrientacoes(o) {
  const x = execDe(o.osId), r = R.rondaDe(x), res = R.resumoRonda(o, x), d = fechada(o) ? "disabled" : "", id = `data-os="${esc(o.osId)}"`;
  return `<h2>Resumo da ronda</h2>
    <div class="info"><dl>
      <dt>Setores</dt><dd>${res.setores}</dd><dt>Equipamentos</dt><dd>${res.equipamentos}</dd>
      ${R.SITUACOES_RONDA.map(([c, n]) => `<dt>${esc(n)}</dt><dd>${res.por[c] || 0}</dd>`).join("")}
      <dt>Sem situação</dt><dd>${res.semSituacao}</dd><dt>Fotos</dt><dd>${res.fotos}</dd></dl></div>
    <label class="rotulo" for="rdOri">Orientações dadas à equipe (opcional)</label>
    <textarea class="campo" id="rdOri" rows="4" maxlength="4000" ${d} data-rd-ori="orientacoes" ${id}>${esc(r.orientacoes || "")}</textarea>
    <label class="rotulo" for="rdPed">Pedidos do cliente (opcional)</label>
    <textarea class="campo" id="rdPed" rows="3" maxlength="4000" ${d} data-rd-ori="pedidosCliente" ${id}>${esc(r.pedidosCliente || "")}</textarea>
    <p class="fraco pequeno">Equipamento fora de uso vira chamado sozinho depois do encerramento; calibração ou qualificação vencida vira sugestão ao Comercial.</p>
    ${seguirOuVoltar(o, "orientacoes")}`;
}

/** Guarda o item no aparelho e na fila (um item por equipamento enquanto não foi tentado). */
async function registrarItemRonda(osId, chave) {
  const o = E.os.get(osId), x = execDe(osId);
  if (!o || !x.chegada) return;   // antes do Cheguei fica só no aparelho (sobe no Cheguei)
  for (const s of setoresDe(o)) { const eq = s.equipamentos.find((e) => e.chave === chave); if (eq) { await registrar(osId, "RONDA", R.itemRondaParaEnvio(x, eq, s.nome), "rd:" + chave); return; } }
}
const rdPendentes = new Map();   // osId|chave → tipo (texto digitado ainda não enviado à fila)
let timerRonda = null;
async function descarregarRonda() {
  clearTimeout(timerRonda);
  const l = [...rdPendentes.entries()]; rdPendentes.clear();
  for (const [k, tipo] of l) {
    const [osId, chave] = k.split("|");
    const x = execDe(osId), r = R.rondaDe(x);
    await salvarExec(x);
    if (!x.chegada) continue;
    if (tipo === "item") await registrarItemRonda(osId, chave);
    else if (tipo === "setor") { const st = r.setores[R.chaveSetor(chave)] || {}; await registrar(osId, "RONDA", { parte: "SETOR", setor: chave, achados: st.achados || "", novo: !!st.extra }, "rds:" + R.chaveSetor(chave)); }
    else if (tipo === "ori") await registrar(osId, "RONDA", { parte: "ORIENTACOES", orientacoes: r.orientacoes, pedidosCliente: r.pedidosCliente }, "rdo");
  }
}
/** Revisão de 03/11/2026: cada letra vai para o aparelho na hora (IndexedDB); a fila recebe o item em 0,9 s, ao sair da tela, ao esconder o app e ao fechar. */
function agendarRonda(osId, chave, tipo) { rdPendentes.set(osId + "|" + chave, tipo); salvarExec(execDe(osId)).catch(() => {}); clearTimeout(timerRonda); timerRonda = setTimeout(() => descarregarRonda().catch(() => {}), 900); }
function descarregarRondaJa() { if (rdPendentes.size && E.sessao) descarregarRonda().catch(() => {}); }
window.addEventListener("pagehide", descarregarRondaJa);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") descarregarRondaJa(); });
/** Tudo o que foi feito antes do "Cheguei" (não deveria, mas pode) sobe depois dele. */
async function enviarRondaAposChegada(osId) {
  const o = E.os.get(osId), x = execDe(osId);
  if (!o || !o.ronda) return;
  const r = R.rondaDe(x);
  for (const k of Object.keys(r.itens)) if (!r.itens[k].doServidor) await registrarItemRonda(osId, k);
}
const acoesRonda = {
  rdAbrirSetor: (b) => ir("#/os/" + encodeURIComponent(b.dataset.os) + "/setor/" + b.dataset.i),
  rdSit: async (b) => {
    const osId = b.dataset.os; if (bloqueada(osId)) return;
    const x = execDe(osId), r = R.rondaDe(x), it = r.itens[b.dataset.chave] = { ...(r.itens[b.dataset.chave] || {}) };
    it.situacao = b.dataset.v; it.em = new Date().toISOString(); delete it.doServidor;
    await salvarExec(x); await registrarItemRonda(osId, b.dataset.chave);
    const y = window.scrollY; render(); window.scrollTo(0, y);
    if (R.problemaRonda(b.dataset.v) || b.dataset.v === "NAO_VERIFICADO") { const c = $((b.dataset.v === "NAO_VERIFICADO" ? "rdm_" : "rdd_") + b.dataset.chave); if (c && !c.value) c.focus({ preventScroll: true }); }
  },
  rdResp: async (b) => {
    const osId = b.dataset.os; if (bloqueada(osId)) return;
    const x = execDe(osId), r = R.rondaDe(x), it = r.itens[b.dataset.chave] = { ...(r.itens[b.dataset.chave] || {}) };
    it.respostas = { ...(it.respostas || {}), [b.dataset.p]: b.dataset.v }; delete it.doServidor;
    await salvarExec(x); await registrarItemRonda(osId, b.dataset.chave);
    const y = window.scrollY; render(); window.scrollTo(0, y);
  },
  rdParada: async (b) => {
    const osId = b.dataset.os; if (bloqueada(osId)) return;
    const x = execDe(osId), r = R.rondaDe(x), it = r.itens[b.dataset.chave] = { ...(r.itens[b.dataset.chave] || {}) };
    it.parada = b.dataset.v; delete it.doServidor;
    await salvarExec(x); await registrarItemRonda(osId, b.dataset.chave);
    const y = window.scrollY; render(); window.scrollTo(0, y);
  },
  rdFoto: (b) => abrirCamera(b.dataset.os, "ronda:" + b.dataset.chave, false, false, b.dataset.leg),
  rdFotoSetor: (b) => abrirCamera(b.dataset.os, "ronda:setor:" + R.chaveSetor(b.dataset.setor), false, false, "Setor " + b.dataset.setor),
  rdSeguirSetor: async (b) => {
    const o = E.os.get(b.dataset.os), x = execDe(b.dataset.os), i = Number(b.dataset.i);
    await descarregarRonda();
    const prox = R.proximoSetorComFalta(o, x, i);
    if (prox === i) { const el = document.querySelector(".rd-eq:not(.feita)"); if (el) el.scrollIntoView({ block: "center" }); recado("Ainda falta neste setor: veja os cartões sem o sinal de completo.", 5000); return; }
    if (prox >= 0) { recado("Setor guardado. Agora: " + setoresDe(o)[prox].nome + ".", 4000); ir("#/os/" + encodeURIComponent(o.osId) + "/setor/" + prox); return; }
    seguirDepoisDe(o.osId, "setores", "Setores completos.");
  },
  rdNovoSetor: async (b) => {
    const osId = b.dataset.os; if (bloqueada(osId)) return;
    const nome = await new Promise((ok) => janela(`<h2>Acrescentar setor</h2><p>Setor que não estava no cadastro da unidade (entra no cadastro quando a ronda for encerrada).</p>
      <label class="rotulo" for="jSetor">Nome do setor</label><input class="campo" id="jSetor" maxlength="80" autocapitalize="words" autocomplete="off">
      <button type="button" class="bt primario" data-j="ok">Acrescentar</button><button type="button" class="bt" data-j="nao">Cancelar</button>`, (q, campos) => ok(q === "ok" ? String(campos.jSetor || "").trim() : "")));
    if (!nome || nome.length < 2) return;
    const x = execDe(osId), r = R.rondaDe(x), k = R.chaveSetor(nome);
    r.setores[k] = { ...(r.setores[k] || {}), nome, extra: true };
    await salvarExec(x);
    if (x.chegada) await registrar(osId, "RONDA", { parte: "SETOR", setor: nome, novo: true, achados: r.setores[k].achados || "" }, "rds:" + k);
    const i = setoresDe(E.os.get(osId)).findIndex((s) => s.chave === k);
    recado("Setor " + nome + " acrescentado.");
    ir("#/os/" + encodeURIComponent(osId) + "/setor/" + i);
  },
  rdNovoEquip: (b) => { if (bloqueada(b.dataset.os)) return; ir("#/os/" + encodeURIComponent(b.dataset.os) + "/equipnovo/" + encodeURIComponent(b.dataset.setor || "")); },
};
async function salvarEquipRonda(form) {
  const osId = form.dataset.os, o = E.os.get(osId);
  if (!o || bloqueada(osId)) return;
  const v = (id) => ($(id) ? $(id).value.trim() : "");
  const d = { tipo: v("rqTipo"), modelo: v("rqModelo"), serie: v("rqSerie").toUpperCase(), tag: v("rqTag").toUpperCase(), patrimonio: v("rqPat"), setor: v("rqSetor") || "Sem setor informado" };
  const f = R.faltasDoCadastro("EQUIPAMENTO", d), erro = $("rqErro");
  if (Object.keys(f).length) { erro.textContent = Object.values(f).join(" "); erro.hidden = false; return; }
  const idLocal = novoIdLocal(), u = usuario(), x = execDe(osId), r = R.rondaDe(x), chave = "n:" + idLocal;
  await fila.registrar(u, { tipo: "CADASTRO", osId, dados: { tipo: "EQUIPAMENTO", dados: { clienteId: o.ronda.clienteId, unidadeId: o.ronda.unidadeId, ...d } }, idLocal });
  r.novos.push({ chave, id: idLocal, tipo: d.tipo, modelo: d.modelo, serie: d.serie, tag: d.tag, patrimonio: d.patrimonio, setor: d.setor, categoria: R.categoriaRonda(d.tipo, d.modelo), validade: {} });
  r.itens[chave] = { ...(r.itens[chave] || {}), ident: { tipo: d.tipo, modelo: d.modelo, serie: d.serie, tag: d.tag, patrimonio: d.patrimonio }, setor: d.setor };
  await salvarExec(x); await atualizarResumo();
  setTimeout(() => tentarEnviar(false), 300);
  const i = setoresDe(o).findIndex((s) => s.chave === R.chaveSetor(d.setor));
  recado("Equipamento cadastrado no aparelho (sobe com a fila). Agora marque a situação dele.", 6000);
  ir("#/os/" + encodeURIComponent(osId) + "/setor/" + Math.max(0, i));
}
Object.assign(acoes, acoesRonda);   // ações da ronda (acoesRonda é definido acima, depois das ações gerais)
