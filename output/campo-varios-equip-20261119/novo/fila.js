/*
 * SGO+ Campo: fila de envio do aparelho (sem tela; usada pelo aplicativo e pelos testes).
 * Contrato: docs/API_APP_TECNICO.md do SGO+ (versão 1, 21/10/2026).
 *
 * Regras:
 *  - cada ação do técnico vira um item com idLocal (chave única do aparelho) e a hora do aparelho (em);
 *  - nada sai da fila sem o servidor confirmar aquele idLocal; o item confirmado fica marcado "enviado";
 *  - envio em ordem: eventos seguidos vão num lote (Ast_appSincronizar); foto sobe sozinha, uma de cada vez
 *    (Ast_appEnviarFoto), na posição em que foi tirada;
 *  - o mesmo lote repetido leva o mesmo número de pedido (X-Pedido-Id e pedidoId) e os mesmos idLocal: o servidor não
 *    registra duas vezes;
 *  - sem sinal: para e tenta depois; sessão vencida (codigo SESSAO): para, guarda tudo e pede login;
 *    Assistência desligada ou sem acesso: para, guarda tudo e mostra a mensagem do servidor;
 *  - recusa de um item: fica "recusado", visível, com o motivo e o que corrigir, e os outros continuam.
 *    Recusa definitiva (não adianta reenviar) não tem "Tentar de novo", mas continua visível no aparelho.
 *
 * Versão 2 (22/10/2026): itens CADASTRO (cliente, unidade ou equipamento criado em campo, Ast_appCadastrar) e NOVA_OS (O.S. aberta
 * em campo, Ast_appAbrirOS) entram na mesma fila, na ordem, um por chamada. Sem internet eles levam ids provisórios (o próprio
 * idLocal); quando o servidor confirma, os itens pendentes que apontavam para o id provisório passam a apontar para o id real
 * (o servidor também aceita o provisório, por segurança). Recusa definitiva de um NOVA_OS recusa junto o que dependia dela.
 *
 * banco: { listarFila(usuario?), salvarItem(item), lerFoto(idLocal), salvarFoto(foto), lerFotoBase64(idLocal), liberarFoto(idLocal) }
 * api:   { sincronizar(sessionId, corpo, pedidoId), enviarFoto(sessionId, corpo, pedidoId), cadastrar(sessionId, corpo, pedidoId),
 *          abrirOs(sessionId, corpo, pedidoId) } — lançam ErroRede sem conexão
 */

// ENVIAR_CLIENTE (22/10/2026, etapa 2): o técnico manda o PDF do relatório ao cliente por e-mail no fim do atendimento; entra na fila como os demais
// 26/10/2026: ATV_* = Minhas atividades (atividade interna do técnico; osId "ATV:<id>", vão no lote como os eventos da O.S.)
export const TIPOS_EVENTO = ["SAIU", "CHEGUEI", "RESPOSTA", "FOTO", "RELATO", "PECA", "ASSINATURA", "CONCLUI", "RONDA", "CADASTRO", "NOVA_OS", "ENVIAR_CLIENTE", "ATV_SITUACAO", "ATV_JUSTIFICAR", "ATV_COMENTAR",
  // 18/11/2026: correção pelo técnico (desfazer a conclusão antes do encerramento; pedir à gestão depois dele)
  "DESFAZ_CONCLUSAO", "PEDIR_CORRECAO",
  // 19/11/2026: equipamento a mais atendido na mesma visita (vai no lote, como o relato)
  "EQUIPAMENTO"];
/** Itens que sobem sozinhos, um por chamada (os demais vão em lote pelo Ast_appSincronizar). */
export const TIPOS_SOZINHOS = ["FOTO", "CADASTRO", "NOVA_OS"];
export const TAMANHO_LOTE = 25;

export class ErroRede extends Error {
  constructor(msg) { super(msg || "Sem conexão com o servidor."); this.name = "ErroRede"; }
}

/** Resposta do servidor dizendo que a sessão não vale mais (precisa entrar de novo). */
export function ehSessaoExpirada(v) {
  if (!v || typeof v !== "object") return false;
  if (v.codigo === "SESSAO" || v.sessaoExpirada === true) return true;
  if (v.ok === false || v.success === false || v.valid === false) {
    const m = String(v.erro || v.message || v.mensagem || "");
    return /sess[aã]o (expirad|vencid|inv[aá]lid|inexistent|n[aã]o informad|encerrad)|entre de novo|fa[cç]a (o )?login/i.test(m);
  }
  return false;
}

/** Códigos que param o envio sem perder nada (a mensagem do servidor é mostrada ao técnico). */
const PARAR = { DESLIGADA: "bloqueado", SEM_ACESSO: "bloqueado", ENTRADA: "erro", ERRO: "erro" };

const motivoDe = (r) => String((r && (r.message || r.motivo || r.erro || r.mensagem)) || "Recusado pelo servidor.");

/**
 * Resultado por idLocal da resposta do Ast_appSincronizar: { idLocal → { ok, duplicado, definitivo, motivo, corrigir } }.
 * Contrato v1: aceitos[] e recusados[]. Aceita também resultados[] (simulador antigo). null = resposta sem lista.
 */
export function resultadosDe(v) {
  if (!v || typeof v !== "object") return null;
  const m = new Map();
  let achou = false;
  if (Array.isArray(v.aceitos)) { achou = true; for (const a of v.aceitos) if (a) m.set(String(a.idLocal), { ok: true, duplicado: !!a.duplicado }); }
  if (Array.isArray(v.recusados)) { achou = true; for (const r of v.recusados) if (r) m.set(String(r.idLocal), { ok: false, definitivo: !!r.definitivo, motivo: motivoDe(r), corrigir: String(r.corrigir || "") }); }
  if (!achou && Array.isArray(v.resultados)) { achou = true; for (const r of v.resultados) if (r) m.set(String(r.idLocal), r.ok === false && !r.duplicado ? { ok: false, definitivo: !!r.definitivo, motivo: motivoDe(r), corrigir: String(r.corrigir || "") } : { ok: true, duplicado: !!r.duplicado }); }
  return achou ? m : null;
}

export function novoIdLocal() {
  try { if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* segue */ }
  let s = ""; for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s.slice(0, 8) + "-" + s.slice(8, 12) + "-4" + s.slice(13, 16) + "-a" + s.slice(17, 20) + "-" + s.slice(20, 32);
}

/** Resumo curto (FNV-1a, 8 hexadecimais) para compor o número do pedido sem expor a sessão. */
export function resumoCurto(texto) {
  let h = 0x811c9dc5;
  const s = String(texto);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}
/**
 * Número do pedido (X-Pedido-Id e pedidoId) de um lote: o mesmo lote repetido (conexão caiu) tem o mesmo número, e o
 * servidor devolve a resposta da primeira vez. Muda com a sessão (depois de entrar de novo não reaproveita a resposta
 * "sessão vencida") e com "Tentar de novo" de um recusado (rodada).
 */
export function pedidoDoLote(itens, sessionId = "") {
  const ids = itens.map((i) => i.idLocal + ":" + (i.rodada || 0)).join(",");
  const base = String(itens[0].idLocal).replace(/[^A-Za-z0-9]/g, "").slice(0, 32);
  return ("L" + base + "-" + itens.length + "-" + resumoCurto(ids) + "-" + resumoCurto(sessionId)).slice(0, 64);
}
export const pedidoDaFoto = (item, sessionId = "") => ("F" + String(item.idLocal).replace(/[^A-Za-z0-9]/g, "").slice(0, 32) + "-" + (item.rodada || 0) + "-" + resumoCurto(sessionId)).slice(0, 64);
export const pedidoDoItem = (item, sessionId = "") => ((item.tipo === "NOVA_OS" ? "N" : "C") + String(item.idLocal).replace(/[^A-Za-z0-9]/g, "").slice(0, 32) + "-" + (item.rodada || 0) + "-" + resumoCurto(sessionId)).slice(0, 64);

/** Troca um id provisório pelo real dentro dos dados de um item da fila (clienteId, unidadeId, equipamentoId e osId). */
export function trocarIdProvisorio(item, provisorio, real) {
  let mudou = false;
  const troca = (obj, k) => { if (obj && obj[k] === provisorio) { obj[k] = real; mudou = true; } };
  troca(item, "osId");
  troca(item.dados, "clienteId"); troca(item.dados, "unidadeId"); troca(item.dados, "equipamentoId");
  if (item.dados && item.dados.dados) { troca(item.dados.dados, "clienteId"); troca(item.dados.dados, "unidadeId"); troca(item.dados.dados, "equipamentoId"); }
  return mudou;
}

export function criarFila({ banco, api, agora = () => Date.now(), novoId = novoIdLocal, versaoApp = "", aparelho = null }) {
  let ultimaOrdem = 0;
  const proximaOrdem = () => { const t = agora() * 100; ultimaOrdem = t > ultimaOrdem ? t : ultimaOrdem + 1; return ultimaOrdem; };

  /**
   * Guarda uma ação. `juntar` (ex.: id da pergunta): resposta ou relato ainda NUNCA tentado com a mesma chave é
   * atualizado em vez de criar outro item (o que já foi tentado não muda mais: o servidor pode já ter recebido).
   * FOTO: o arquivo já está guardado (banco.salvarFoto) com o mesmo idLocal; o item é o envio dele.
   */
  async function registrar(usuario, { tipo, osId, dados, juntar, idLocal }) {
    if (!TIPOS_EVENTO.includes(tipo)) throw new Error("Tipo de ação desconhecido: " + tipo);
    const em = new Date(agora()).toISOString();
    const lista = await banco.listarFila(usuario);
    // a ordem nunca volta, nem se o relógio do aparelho for atrasado
    for (const i of lista) if (i.ordem > ultimaOrdem) ultimaOrdem = i.ordem;
    if (juntar) {
      const igual = lista.find((i) => i.estado === "pendente" && !i.tentado && i.tipo === tipo && i.osId === String(osId) && i.juntar === juntar);
      if (igual) {
        igual.dados = { ...dados }; igual.em = em;
        await banco.salvarItem(igual);
        return igual;
      }
    }
    const item = { idLocal: idLocal || novoId(), ordem: proximaOrdem(), usuario, tipo, osId: String(osId), em, dados: { ...(dados || {}) },
      juntar: juntar || "", estado: "pendente", tentado: false, tentativas: 0, rodada: 0, criadoEm: em, ultimoErro: "", corrigir: "", definitivo: false, enviadoEm: "" };
    await banco.salvarItem(item);
    return item;
  }

  /**
   * Tira da fila um item que nunca foi tentado (ex.: foto removida antes de enviar). Já tentado: não sai.
   * 12/11/2026: forcar = a O.S. foi excluída no servidor; o que ainda não foi aceito (pendente, mesmo já tentado, ou recusado) sai
   * da fila. Antes, a abertura já tentada continuava pendente e, reenviada, abria a O.S. de novo com outro número.
   */
  async function desistir(usuario, idLocal, forcar) {
    const it = (await banco.listarFila(usuario)).find((i) => i.idLocal === idLocal);
    if (!it) return true;
    if (it.estado === "enviado" || it.estado === "cancelado") return it.estado === "cancelado";
    if (it.tentado && !forcar) return false;
    it.estado = "cancelado"; it.ultimoErro = forcar ? "A O.S. foi excluída; este registro não é mais enviado." : "Removido no aparelho antes de enviar.";
    await banco.salvarItem(it);
    if (it.tipo === "FOTO") await banco.liberarFoto(idLocal);
    return true;
  }

  async function tentarDeNovo(usuario, idLocal) {
    const it = (await banco.listarFila(usuario)).find((i) => i.idLocal === idLocal);
    if (it && it.estado === "recusado" && !it.definitivo) { it.estado = "pendente"; it.rodada = (it.rodada || 0) + 1; it.ultimoErro = ""; it.corrigir = ""; await banco.salvarItem(it); }
  }

  async function resumo(usuario) {
    const lista = await banco.listarFila(usuario);
    const pend = lista.filter((i) => i.estado === "pendente");
    return {
      pendentes: pend.length,
      recusados: lista.filter((i) => i.estado === "recusado").length,
      maisAntigo: pend.length ? pend.reduce((m, i) => (i.criadoEm < m ? i.criadoEm : m), pend[0].criadoEm) : "",
      ultimoEnvio: lista.filter((i) => i.estado === "enviado").reduce((m, i) => (i.enviadoEm > m ? i.enviadoEm : m), ""),
    };
  }

  const corpoEvento = (i) => ({ tipo: i.tipo, osId: i.osId, em: i.em, dados: i.dados, idLocal: i.idLocal });
  const agoraIso = () => new Date(agora()).toISOString();

  async function marcarErro(itens, msg) {
    for (const i of itens) { i.tentativas = (i.tentativas || 0) + 1; i.ultimoErro = msg; await banco.salvarItem(i); }
  }
  async function recusar(i, r) {
    i.estado = "recusado"; i.ultimoErro = r.motivo; i.corrigir = r.corrigir || ""; i.definitivo = !!r.definitivo; i.tentativas = (i.tentativas || 0) + 1;
    await banco.salvarItem(i);
  }
  /** Parada geral pela resposta do servidor (ok: false para a chamada inteira). */
  function parada(v) {
    if (ehSessaoExpirada(v)) return { parouPor: "sessao", motivo: motivoDe(v) };
    return { parouPor: PARAR[v && v.codigo] || "erro", motivo: motivoDe(v), codigo: String((v && v.codigo) || "") };
  }

  /** Sobe a foto de um item FOTO. Devolve null (seguiu) ou a parada. */
  async function subirFoto(sessionId, item, out) {
    const foto = await banco.lerFoto(item.idLocal);
    if (!foto || (!foto.blob && !foto.base64 && !foto.subiuEm)) {
      await recusar(item, { motivo: "A foto não está mais neste aparelho (o armazenamento foi apagado).", definitivo: true });
      out.recusados++;
      return null;
    }
    if (foto.subiuEm) {   // já confirmada antes (item voltou para a fila): não sobe de novo
      item.estado = "enviado"; item.enviadoEm = item.enviadoEm || foto.subiuEm; await banco.salvarItem(item); out.enviados++;
      return null;
    }
    let base64;
    try { base64 = await banco.lerFotoBase64(item.idLocal); }
    catch (e) { await recusar(item, { motivo: String(e && e.message || e), definitivo: true }); out.recusados++; return null; }
    if (!item.tentado) { item.tentado = true; await banco.salvarItem(item); }
    let v;
    try {
      v = await api.enviarFoto(sessionId, { osId: item.osId, idLocal: item.idLocal, nome: foto.nome, base64, perguntaId: foto.perguntaId || "", legenda: foto.legenda || "", em: item.em },
        pedidoDaFoto(item, sessionId));
    } catch (e) {
      const rede = e instanceof ErroRede;
      await marcarErro([item], rede ? "Sem sinal." : String(e && e.message || e));
      return { parouPor: rede ? "rede" : "erro", motivo: String(e && e.message || e) };
    }
    if (v && v.ok === true) {
      foto.subiuEm = agoraIso(); foto.arquivoId = String((v.foto && v.foto.id) || v.arquivoId || "");
      await banco.salvarFoto(foto);
      item.estado = "enviado"; item.enviadoEm = foto.subiuEm; item.ultimoErro = ""; item.duplicado = !!v.duplicado;
      await banco.salvarItem(item);
      await banco.liberarFoto(item.idLocal);
      out.enviados++;
      if (v.os && v.os.id) out.os.push(v.os);
      return null;
    }
    // recusa da foto (ENTRADA: O.S. de outro técnico, encerrada, arquivo vazio/grande/formato): fica visível, os outros seguem
    if (v && v.codigo === "ENTRADA") { await recusar(item, { motivo: motivoDe(v), definitivo: true }); out.recusados++; return null; }
    const p = parada(v);
    await marcarErro([item], p.motivo);
    return p;
  }

  /** Depois que um id provisório ganhou id real: os itens pendentes que apontavam para ele passam a apontar para o real. */
  async function resolverProvisorio(usuario, provisorio, real) {
    if (!provisorio || !real || provisorio === real) return;
    for (const i of await banco.listarFila(usuario)) if (i.estado === "pendente" && trocarIdProvisorio(i, provisorio, real)) await banco.salvarItem(i);
  }
  /** NOVA_OS recusada em definitivo: o que dependia dela (eventos e fotos da O.S. provisória) é recusado junto, com o motivo. */
  async function recusarDependentes(usuario, provisorio, motivo, out) {
    for (const i of await banco.listarFila(usuario)) {
      if (i.estado !== "pendente" || i.osId !== provisorio) continue;
      await recusar(i, { motivo: "A O.S. provisória não foi aceita pelo servidor (" + motivo + "), então este registro não tem onde entrar.", definitivo: true, corrigir: "Abra a O.S. de novo em Novo atendimento e refaça o registro, ou fale com o supervisor." });
      out.recusados++;
    }
  }
  /** Sobe um cadastro feito em campo (CADASTRO) ou uma O.S. aberta em campo (NOVA_OS). Devolve null (seguiu) ou a parada. */
  async function subirItem(sessionId, usuario, item, out) {
    if (!item.tentado) { item.tentado = true; await banco.salvarItem(item); }
    const novaOs = item.tipo === "NOVA_OS", pedido = pedidoDoItem(item, sessionId);
    const corpo = novaOs ? { idLocal: item.idLocal, em: item.em, aparelho: aparelho ? { ...aparelho, versaoApp } : { versaoApp }, ...item.dados }
      : { idLocal: item.idLocal, tipo: item.dados.tipo, dados: item.dados.dados, em: item.em, aparelho: aparelho ? { ...aparelho, versaoApp } : { versaoApp } };
    let v;
    try { v = novaOs ? await api.abrirOs(sessionId, corpo, pedido) : await api.cadastrar(sessionId, corpo, pedido); }
    catch (e) {
      const rede = e instanceof ErroRede;
      await marcarErro([item], rede ? "Sem sinal." : String(e && e.message || e));
      return { parouPor: rede ? "rede" : "erro", motivo: String(e && e.message || e) };
    }
    if (v && v.ok === true) {
      const quando = agoraIso();
      const real = novaOs ? String((v.os && v.os.id) || "") : String(v.id || "");
      item.estado = "enviado"; item.enviadoEm = quando; item.ultimoErro = ""; item.duplicado = !!v.duplicado; item.idReal = real; item.existente = !!v.existente; item.mensagem = String(v.message || "");
      await banco.salvarItem(item);
      await resolverProvisorio(usuario, item.idLocal, real);
      out.enviados++;
      if (novaOs) { out.novasOs.push({ idLocal: item.idLocal, os: v.os || null, chamado: v.chamado || null, existente: !!v.existente, duplicado: !!v.duplicado, message: String(v.message || "") }); if (v.os && v.os.id) out.os.push({ id: v.os.id, numero: v.os.numero, situacao: v.os.situacao, situacaoNome: v.os.situacaoNome, pendencias: v.os.pendencias || [], relatorioUrl: v.os.relatorioUrl || "" }); }
      else out.cadastros.push({ idLocal: item.idLocal, tipo: String(v.tipo || item.dados.tipo), id: real, existente: !!v.existente, duplicado: !!v.duplicado, cliente: v.cliente || null, unidade: v.unidade || null, equipamento: v.equipamento || null, message: String(v.message || "") });
      return null;
    }
    // ENTRADA: o servidor não aceitou os dados (CNPJ inválido, nome curto, tipo de serviço inexistente...): fica visível, os outros seguem
    if (v && v.codigo === "ENTRADA") {
      const motivo = motivoDe(v);
      await recusar(item, { motivo, definitivo: true, corrigir: novaOs ? "Abra a O.S. de novo em Novo atendimento com os dados corrigidos, ou peça à gestão para abrir o chamado no computador." : "Cadastre de novo em Novo atendimento com os dados corrigidos, ou peça à gestão para cadastrar no computador." });
      out.recusados++;
      if (novaOs) await recusarDependentes(usuario, item.idLocal, motivo, out);
      return null;
    }
    const p = parada(v);
    if (p.parouPor !== "sessao") await marcarErro([item], p.motivo);
    return p;
  }

  /**
   * Envia o que estiver pendente do usuário, em ordem.
   * Devolve { enviados, recusados, parouPor, motivo, codigo, os, cadastros, novasOs } — parouPor: "" (acabou), "rede", "sessao",
   * "bloqueado" (Assistência desligada / sem acesso), "erro". os: situação das O.S. que o servidor devolveu; cadastros e novasOs:
   * o que o servidor criou (ou reconheceu como já existente) a partir dos itens CADASTRO e NOVA_OS, com os ids reais.
   */
  async function enviar(sessionId, usuario) {
    const out = { enviados: 0, recusados: 0, parouPor: "", motivo: "", codigo: "", os: [], cadastros: [], novasOs: [] };
    for (let volta = 0; volta < 1000; volta++) {
      const pend = (await banco.listarFila(usuario)).filter((i) => i.estado === "pendente").sort((a, b) => a.ordem - b.ordem);
      if (!pend.length) return out;
      if (pend[0].tipo === "FOTO") {
        const p = await subirFoto(sessionId, pend[0], out);
        if (p) return Object.assign(out, p);
        continue;
      }
      if (pend[0].tipo === "CADASTRO" || pend[0].tipo === "NOVA_OS") {
        const p = await subirItem(sessionId, usuario, pend[0], out);
        if (p) return Object.assign(out, p);
        continue;
      }
      // lote: eventos seguidos até a próxima foto, cadastro ou O.S. nova
      const lote = [];
      for (const i of pend) { if (TIPOS_SOZINHOS.includes(i.tipo) || lote.length >= TAMANHO_LOTE) break; lote.push(i); }
      for (const i of lote) if (!i.tentado) { i.tentado = true; await banco.salvarItem(i); }
      const pedidoId = pedidoDoLote(lote, sessionId);
      let v;
      try {
        v = await api.sincronizar(sessionId, { pedidoId, aparelho: aparelho ? { ...aparelho, versaoApp } : { versaoApp }, eventos: lote.map(corpoEvento) }, pedidoId);
      } catch (e) {
        const rede = e instanceof ErroRede;
        await marcarErro(lote, rede ? "Sem sinal." : String(e && e.message || e));
        return Object.assign(out, { parouPor: rede ? "rede" : "erro", motivo: String(e && e.message || e) });
      }
      if (!v || v.ok !== true) {
        const p = parada(v);
        if (p.parouPor !== "sessao") await marcarErro(lote, p.motivo);
        return Object.assign(out, p);
      }
      if (Array.isArray(v.os)) for (const o of v.os) if (o && o.id) out.os.push(o);
      const res = resultadosDe(v);
      let andou = 0;
      const quando = agoraIso();
      for (const i of lote) {
        const r = res ? res.get(i.idLocal) : { ok: true };
        if (!r) continue;                       // o servidor não respondeu por este: fica pendente
        if (r.ok === false) { await recusar(i, r); out.recusados++; }
        else {
          i.estado = "enviado"; i.enviadoEm = quando; i.ultimoErro = ""; i.duplicado = !!r.duplicado;
          await banco.salvarItem(i);
          out.enviados++;
        }
        andou++;
      }
      if (!andou) {
        const motivo = "O servidor não confirmou os itens enviados. O app tenta de novo.";
        await marcarErro(lote, motivo);
        return Object.assign(out, { parouPor: "erro", motivo });
      }
    }
    return out;
  }

  return { registrar, enviar, resumo, desistir, tentarDeNovo };
}
