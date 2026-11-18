/*
 * SGO+ Campo: leitura do "Meu dia" vindo do servidor e o que falta para concluir uma O.S. (sem tela; testável).
 * Contrato: docs/API_APP_TECNICO.md do SGO+ (versão 1). A leitura tolera pequenas diferenças de nome: o que não vier
 * fica vazio, nunca inventado.
 */

const txt = (v) => (v === null || v === undefined ? "" : String(v).trim());
const prim = (...vs) => { for (const v of vs) { const t = txt(v); if (t) return t; } return ""; };
const num = (v, padrao) => { const n = Number(v); return v !== "" && v !== null && v !== undefined && Number.isFinite(n) ? n : padrao; };
const sim = (v, padrao) => (v === undefined || v === null || v === "" ? padrao : v === true || /^(sim|s|true|1|obrigat)/i.test(String(v)));
const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

export const TIPOS_PERGUNTA = ["SIM_NAO", "NUMERO", "TEXTO", "OPCAO", "MULTIPLA", "DATA", "FOTO", "ASSINATURA"];
/** Valores do SIM_NAO no contrato e o texto do botão. */
export const OPCOES_SIM_NAO = [["SIM", "Sim"], ["NAO", "Não"], ["NA", "Não se aplica"]];

export function tipoPergunta(t) {
  const s = txt(t).toUpperCase();
  if (TIPOS_PERGUNTA.includes(s)) return s;
  if (/SIM|BOOL|CHECK/.test(s)) return "SIM_NAO";
  if (/NUM|VALOR|MEDIDA|LEITURA/.test(s)) return "NUMERO";
  if (/MULT/.test(s)) return "MULTIPLA";
  if (/OPC|ESCOLHA|LISTA/.test(s)) return "OPCAO";
  if (/DATA/.test(s)) return "DATA";
  if (/FOTO|IMAGEM/.test(s)) return "FOTO";
  if (/ASSIN/.test(s)) return "ASSINATURA";
  return "TEXTO";
}

export function normalizarPergunta(p, i) {
  p = obj(p);
  const tipo = tipoPergunta(p.tipo || p.formato);
  return {
    id: prim(p.id, p.perguntaId, p.codigo, "p" + (i + 1)),
    texto: prim(p.texto, p.pergunta, p.titulo, p.nome, "Pergunta " + (i + 1)),
    tipo,
    obrigatorio: sim(p.obrigatoria ?? p.obrigatorio ?? p.required, false),
    unidade: prim(p.unidade, p.un),
    ajuda: prim(p.ajuda, p.dica, p.descricao),
    opcoes: (Array.isArray(p.opcoes) ? p.opcoes : []).map(txt).filter(Boolean),
    fotosMin: tipo === "FOTO" ? Math.max(1, num(p.fotosMin, 1)) : 0,
  };
}

/** Dia (AAAA-MM-DD) de uma data do contrato ("2026-10-22T09:00:00", ISO com fuso ou só a data). */
export function diaDe(t) {
  const s = txt(t);
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (!m) return "";
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s.slice(10))) { const d = new Date(s); if (!isNaN(d)) return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  return m[1];
}
/** Hora (HH:MM) de uma data do contrato. */
export function horaDe(t) {
  const s = txt(t);
  if (!/T\d{2}:\d{2}/.test(s)) return "";
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s.slice(10))) { const d = new Date(s); if (!isNaN(d)) return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
  return s.slice(11, 16);
}

export function normalizarOs(o, i) {
  o = obj(o);
  const cli = typeof o.cliente === "object" ? obj(o.cliente) : { nome: o.cliente };
  const un = typeof o.unidade === "object" ? obj(o.unidade) : { nome: o.unidade };
  const end = typeof o.endereco === "object" ? obj(o.endereco) : { texto: o.endereco };
  const eq = typeof o.equipamento === "object" ? obj(o.equipamento) : { nome: o.equipamento };
  const tp = typeof o.tipo === "object" ? obj(o.tipo) : { nome: o.tipo };
  const ex = obj(tp.exige || o.exigencias || o.regras);
  const ck = Array.isArray(o.checklist) ? { perguntas: o.checklist } : obj(o.checklist);
  const reg = obj(o.registrado);
  const contato = obj(o.contato);
  const enderecoTexto = prim(un.endereco && [un.endereco, [un.cidade, un.uf].filter(Boolean).join("/")].filter(Boolean).join(", "), end.texto, end.completo);
  const agendado = prim(o.agendadoPara, o.inicioPrevisto);
  const situacao = prim(o.situacao, o.status).toUpperCase();
  return {
    osId: prim(o.id, o.osId),
    numero: prim(o.numero, o.codigo, o.id, o.osId),
    chamadoNumero: prim(o.chamadoNumero),
    ordem: num(o.ordem, i + 1),
    dia: diaDe(agendado),
    horario: prim(o.horario, horaDe(agendado)),
    duracaoMin: num(o.duracaoMin, 0),
    tipo: prim(tp.nome, tp.codigo),
    tipoCodigo: prim(tp.codigo).toUpperCase(),
    grupo: prim(tp.grupo).toUpperCase(),
    // 03/11/2026: logística (entrega, retirada, envio) com o termo próprio; null = segue pelo relato de manutenção
    logistica: normalizarLogistica(tp.logistica, tp.codigo, tp.nome),
    // 03/11/2026: ronda de engenharia clínica (setores, equipamentos, perguntas fixas); null nas demais
    ronda: normalizarRonda(o.ronda),
    // 16/11/2026 (opção B): base da declaração do termo de entrega (retirada, sem termo, nomes a ocultar); null nos demais
    declaracaoEntrega: o.declaracaoEntrega && typeof o.declaracaoEntrega === "object" ? { retiradaEm: txt(o.declaracaoEntrega.retiradaEm), semTermo: !!o.declaracaoEntrega.semTermo, ocultar: Array.isArray(o.declaracaoEntrega.ocultar) ? o.declaracaoEntrega.ocultar.map(txt) : [], equipamento: txt(o.declaracaoEntrega.equipamento) } : null,
    prioridade: prim(o.prioridadeNome, o.prioridade),
    prazo: obj(o.prazoAtendimento),
    descricao: prim(o.sintoma, o.descricao, o.resumo),
    orientacao: prim(o.orientacao),
    situacao, situacaoNome: prim(o.situacaoNome, o.situacao),
    cliente: { nome: prim(cli.nome, o.clienteNome), telefone: prim(cli.telefone) },
    unidade: { nome: prim(un.nome), responsavel: prim(un.responsavel), telefone: prim(un.telefone) },
    contato: { nome: prim(contato.nome, cli.contato), telefone: prim(contato.telefone) },
    endereco: { texto: enderecoTexto, mapa: prim(o.enderecoMapa), lat: end.lat ?? null, lng: end.lng ?? null },
    equipamento: { id: prim(eq.id), nome: prim(eq.tipo, eq.nome, eq.descricao), tag: prim(eq.tag), serie: prim(eq.serie), setor: prim(eq.setor), modelo: prim(eq.modelo), patrimonio: prim(eq.patrimonio) },
    checklist: (Array.isArray(ck.perguntas) ? ck.perguntas : []).map(normalizarPergunta),
    checklistNome: prim(ck.nome),
    exigencias: {
      fotosMin: Math.max(0, num(ex.fotosMin ?? ex.fotos, 0)),
      relato: sim(ex.relato, true),
      assinatura: sim(ex.assinatura, true),
      qrOuSerie: sim(ex.qrOuSerie, false),
      relatoCampos: camposDoRelatoExigidos(ex, o.pendencias),
      colaborador: sim(ex.assinaturaColaborador, false),
      // 13/11/2026: resultado do atendimento (teste e situação do equipamento ao final) e mínimos do relato em palavras (servidor novo)
      resultado: sim(ex.resultado, false), qualidade: qualidadeDe(ex.qualidade),
    },
    registrado: reg,
    historico: (Array.isArray(o.historicoEquipamento) ? o.historicoEquipamento : Array.isArray(o.historico) ? o.historico : []).slice(0, 5)
      .map((h) => ({ data: prim(h && h.data), texto: [prim(h && h.tipo), prim(h && h.resumo, h && h.texto)].filter(Boolean).join(": "), origem: prim(h && h.origem), numero: prim(h && h.numero) })),
    pendenciasServidor: (Array.isArray(o.pendencias) ? o.pendencias : []).map(txt).filter(Boolean),
    fechadaNoServidor: /^(ENCERRADA|CANCELADA)$/.test(situacao),
    cancelada: situacao === "CANCELADA",
    abertaEmCampo: sim(o.abertaEmCampo, false),
    podeExcluir: sim(o.podeExcluir, false),   // 12/11/2026: quem abriu em campo exclui antes de começar (Ast_appExcluirOS)
    provisoria: false,
    relatorioUrl: prim(o.relatorioUrl),
    envio: normalizarEnvio(o.envio, o.relatorioUrl, situacao),
    // 18/11/2026: reaberta para correção (pela gestão no SGO+ ou pelo próprio técnico ao desfazer a conclusão): quando, quem, motivo
    reaberta: reg.reaberta && typeof reg.reaberta === "object" && txt(reg.reaberta.em) ? { em: txt(reg.reaberta.em), por: txt(reg.reaberta.por), motivo: txt(reg.reaberta.motivo) } : null,
  };
}

/**
 * Estado do documento e do envio ao cliente (contrato de 22/10/2026, campo "envio" da O.S. no Meu dia e na resposta do Sincronizar).
 * Sem o campo (servidor antigo): só o que dá para saber pela situação e pelo relatorioUrl.
 */
export function normalizarEnvio(e, relatorioUrl, situacao) {
  e = obj(e);
  const url = prim(e.relatorioUrl, relatorioUrl);
  const pdf = e.pdfGerado === true || (!("pdfGerado" in e) && !!url);
  const sit = txt(e.situacao).toUpperCase() || (txt(e.enviadoEm) ? "ENVIADO" : pdf ? "PDF_GERADO" : "SEM_PDF");
  return {
    situacao: sit, pdfGerado: pdf, relatorioUrl: url, geradoEm: txt(e.geradoEm), revisao: num(e.revisao, 0),
    enviadoEm: txt(e.enviadoEm), enviadoPor: txt(e.enviadoPor), enviadoCanal: txt(e.enviadoCanal), enviadoPara: txt(e.enviadoPara),
    podeEnviar: e.podeEnviar === undefined ? pdf && txt(situacao).toUpperCase() === "ENCERRADA" : !!e.podeEnviar,
    contatos: (Array.isArray(e.contatos) ? e.contatos : []).map((k) => ({ nome: txt(k && k.nome), email: txt(k && k.email).toLowerCase(), origem: txt(k && k.origem), sugerido: !!(k && k.sugerido) })).filter((k) => emailOk(k.email)),
    texto: txt(e.texto),
  };
}
/** E-mail completo (nome@dominio)? */
export const emailOk = (v) => /^[^\s@<>(),;:"\[\]]+@[^\s@<>(),;:"\[\]]+\.[a-z]{2,}$/i.test(txt(v));

/** Tipo de serviço da lista do Meu dia (versão 2): o que o aparelho precisa para montar uma O.S. aberta em campo sem internet. */
export function normalizarTipo(t) {
  t = obj(t);
  const ex = obj(t.exige), ck = obj(t.checklist);
  return {
    codigo: prim(t.codigo), nome: prim(t.nome, t.codigo), grupo: prim(t.grupo), descricao: prim(t.descricao), logistica: normalizarLogistica(t.logistica, t.codigo, t.nome),
    exigencias: { fotosMin: Math.max(0, num(ex.fotosMin, 0)), relato: sim(ex.relato, true), assinatura: sim(ex.assinatura, true), qrOuSerie: sim(ex.qrOuSerie, false), relatoCampos: camposDoRelatoExigidos(ex, []), colaborador: sim(ex.assinaturaColaborador, false),
      resultado: sim(ex.resultado, false), qualidade: qualidadeDe(ex.qualidade) },
    checklist: (Array.isArray(ck.perguntas) ? ck.perguntas : []).map(normalizarPergunta),
    checklistNome: prim(ck.nome), checklistId: prim(ck.modeloId), checklistVersao: num(ck.versao, 0),
  };
}

/**
 * O.S. provisória, montada no aparelho ao abrir um atendimento em campo (até o servidor dar o número oficial).
 * d: { idLocal, tipo (normalizarTipo), cliente, unidade, equipamento, sintoma, solicitante, contato, prioridade, prioridadeNome, em }
 */
export function osProvisoria(d) {
  const t = d.tipo || normalizarTipo({}), cli = obj(d.cliente), un = obj(d.unidade), eq = obj(d.equipamento), em = txt(d.em);
  const enderecoTexto = prim(un.enderecoTexto, un.endereco && [un.endereco, [un.cidade, un.uf].filter(Boolean).join("/")].filter(Boolean).join(", "), cli.endereco);
  return {
    osId: txt(d.idLocal), numero: "O.S. provisória", chamadoNumero: "", ordem: 999, dia: diaDe(em), horario: horaDe(em), duracaoMin: 0,
    tipo: t.nome, tipoCodigo: txt(t.codigo).toUpperCase(), grupo: txt(t.grupo).toUpperCase(), logistica: t.logistica || null,
    prioridade: prim(d.prioridadeNome, d.prioridade), prazo: {}, descricao: txt(d.sintoma), orientacao: "",
    situacao: "AGENDADA", situacaoNome: "Aberta em campo",
    cliente: { nome: prim(cli.nome, cli.nomeFantasia, cli.razaoSocial), telefone: prim(cli.telefone) },
    unidade: { nome: prim(un.nome), responsavel: prim(un.responsavel), telefone: prim(un.telefone) },
    contato: { nome: txt(d.solicitante), telefone: txt(d.contato) },
    endereco: { texto: enderecoTexto, mapa: "", lat: un.lat ?? null, lng: un.lng ?? null },
    equipamento: { id: prim(eq.id), nome: prim(eq.tipo, eq.nome, eq.descricao), tag: prim(eq.tag), serie: prim(eq.serie), setor: prim(eq.setor), modelo: prim(eq.modelo), patrimonio: prim(eq.patrimonio) },
    checklist: t.checklist || [], checklistNome: t.checklistNome || "",
    exigencias: { ...t.exigencias },
    registrado: {}, historico: [], pendenciasServidor: [], fechadaNoServidor: false, cancelada: false,
    abertaEmCampo: true, provisoria: true,
  };
}

/**
 * Campos do relato que o servidor exige para encerrar: tipo.exige.relatoCampos (contrato, mudança de 21/10/2026); sem ele,
 * lidos das pendências que o servidor mandou ("falta a condição encontrada", "falta o teste funcional").
 */
function camposDoRelatoExigidos(ex, pendencias) {
  if (Array.isArray(ex.relatoCampos)) return ex.relatoCampos.map(txt).filter(Boolean);
  if (!sim(ex.relato, true)) return [];
  const p = (Array.isArray(pendencias) ? pendencias : []).join(" | ");
  return ["servicoRealizado"].concat(/condi[cç][aã]o encontrada/i.test(p) ? ["condicaoEncontrada"] : []).concat(/teste funcional/i.test(p) ? ["testeFuncional"] : []);
}

/** Mínimos do relato em palavras (tipo.exige.qualidade do servidor); sem eles, null (nenhum mínimo além do que já existia). */
function qualidadeDe(q) {
  if (!q || typeof q !== "object") return null;
  const n = (k) => Math.max(0, num(q[k], 0));
  return { condicaoEncontrada: n("condicaoEncontrada"), causa: n("causa"), servicoRealizado: n("servicoRealizado"), testeMotivo: n("testeMotivo"), resultadoDetalhe: n("resultadoDetalhe") };
}

/** Resposta do Ast_appMeuDia → { dia, ate, ligada, regras, tecnico, os } (null se não for uma resposta válida). */
export function normalizarMeuDia(v) {
  if (!v || typeof v !== "object" || v.ok === false || v.success === false) return null;
  const lista = Array.isArray(v.os) ? v.os : Array.isArray(v.ordens) ? v.ordens : Array.isArray(v.itens) ? v.itens : null;
  if (!lista) return null;
  const rg = obj(v.regras), campo = obj(v.campo);
  return {
    dia: txt(v.dia), ate: txt(v.ate || v.dia), geradoEm: txt(v.geradoEm),
    ligada: v.assistenciaLigada !== false,
    tecnico: obj(v.tecnico),
    versaoContrato: num(v.versaoContrato, 1),
    // versão 2: abrir atendimento em campo (tipos com checklist; prioridades e parada; limite da busca)
    campo: {
      podeAbrir: campo.podeAbrir !== false && num(v.versaoContrato, 1) >= 2, duracaoPadraoMin: num(campo.duracaoPadraoMin, 90), limiteBusca: num(campo.limiteBusca, 20),
      prioridades: (Array.isArray(campo.prioridades) ? campo.prioridades : []).map((p) => ({ codigo: prim(p && p.codigo), nome: prim(p && p.nome, p && p.codigo) })).filter((p) => p.codigo),
      paradas: (Array.isArray(campo.paradas) ? campo.paradas : []).map((p) => ({ codigo: prim(p && p.codigo), nome: prim(p && p.nome, p && p.codigo) })).filter((p) => p.codigo),
    },
    tipos: (Array.isArray(v.tipos) ? v.tipos : []).map(normalizarTipo).filter((t) => t.codigo),
    regras: {
      fotoMaxBytes: num(rg.fotoMaxBytes, 2000000), fotoRecomendadaBytes: num(rg.fotoRecomendadaBytes, 300000),
      motivosSemAssinatura: (Array.isArray(rg.motivosSemAssinatura) && rg.motivosSemAssinatura.length ? rg.motivosSemAssinatura : [{ codigo: "RESPONSAVEL_AUSENTE", nome: "Responsável ausente (informar quem recebeu)" }])
        .map((m) => ({ codigo: prim(m && m.codigo), nome: prim(m && m.nome, m && m.codigo) })).filter((m) => m.codigo),
    },
    os: lista.map(normalizarOs).filter((o) => o.osId),
    // 26/10/2026: Minhas atividades (atividades internas do técnico) e os motivos de atraso da justificativa
    atividades: (Array.isArray(v.atividades) ? v.atividades : []).map(normalizarAtividade).filter((a) => a.id),
    motivosAtraso: (Array.isArray(v.motivosAtraso) ? v.motivosAtraso : []).map((m) => txt(m)).filter(Boolean),
  };
}

/** Atividade interna do técnico, como vem do Ast_appMeuDia. */
export function normalizarAtividade(a) {
  const o = obj(a);
  return {
    id: txt(o.id), titulo: txt(o.titulo) || "Atividade", descricao: txt(o.descricao), prioridade: txt(o.prioridade) || "Normal", situacao: txt(o.situacao) || "A fazer",
    prazo: txt(o.prazo), prazoOriginal: txt(o.prazoOriginal), atrasada: o.atrasada === true, venceHoje: o.venceHoje === true, cliente: txt(o.cliente), modulo: txt(o.modulo),
    lancadaPor: txt(o.lancadaPor), justificativas: num(o.justificativas, 0), motivoAguardando: txt(o.motivoAguardando), versao: txt(o.versao), pendente: false,
  };
}

/** Estado vazio da execução de uma O.S. no aparelho. termo e assinaturaColab: logística (03/11/2026); execução antiga sem eles = null. */
export const execucaoVazia = (usuario, osId) => ({ chave: usuario + "|" + osId, usuario, osId, saida: null, chegada: null, respostas: {}, fotos: [], relato: { em: "" }, pecas: [], assinatura: null, conclusao: null, equipamento: null, termo: null, assinaturaColab: null, ronda: null });

/**
 * O que o servidor já tem (registrado) entra na execução do aparelho onde ela está vazia (ex.: troca de celular).
 * Nunca troca o que foi feito neste aparelho. Devolve true se mudou algo.
 */
export function mesclarRegistrado(exec, os) {
  const r = os.registrado || {};
  let mudou = false;
  if (!exec.saida && r.saiuEm) { exec.saida = { em: r.saiuEm, doServidor: true }; mudou = true; }
  if (!exec.chegada && r.chegouEm) { exec.chegada = { em: r.chegouEm, doServidor: true }; mudou = true; }
  // 18/11/2026: reabertura para correção mais nova que a conclusão: a conclusão sai (fica em conclusoesDesfeitas) e os passos voltam;
  // conclusão desfeita aqui que o servidor ainda não recebeu não volta pelo Meu dia
  const ra = r.reaberta && typeof r.reaberta === "object" ? r.reaberta : null, msRa = ra ? Date.parse(txt(ra.em)) : NaN;
  if (exec.conclusao && !isNaN(msRa) && !(Date.parse(txt(exec.conclusao.em)) > msRa)) {
    exec.conclusoesDesfeitas = (Array.isArray(exec.conclusoesDesfeitas) ? exec.conclusoesDesfeitas : []).concat([{ em: txt(exec.conclusao.em), desfeitaEm: txt(ra.em), motivo: txt(ra.motivo), por: txt(ra.por) }]);
    exec.conclusao = null; mudou = true;
  }
  if (exec.correcaoPedida && !isNaN(msRa) && Date.parse(txt(exec.correcaoPedida.em)) <= msRa) { delete exec.correcaoPedida; mudou = true; }
  const desfeitaDepois = (em) => (Array.isArray(exec.conclusoesDesfeitas) ? exec.conclusoesDesfeitas : []).some((d) => Date.parse(txt(d.desfeitaEm)) >= Date.parse(txt(em)));
  if (!exec.conclusao && r.concluiuEm && !desfeitaDepois(r.concluiuEm)) { exec.conclusao = { em: r.concluiuEm, doServidor: true }; mudou = true; }
  for (const [k, v] of Object.entries(obj(r.respostas))) if (!exec.respostas[k] && v !== "" && v !== null && v !== undefined) { exec.respostas[k] = { valor: v, doServidor: true }; mudou = true; }
  for (const f of Array.isArray(r.fotos) ? r.fotos : []) {
    const id = txt(f && f.idLocal);
    if (id && !exec.fotos.some((x) => x.idLocal === id)) { exec.fotos.push({ idLocal: id, perguntaId: txt(f.perguntaId), legenda: txt(f.legenda || f.nome), em: "", miniatura: "", doServidor: true }); mudou = true; }
  }
  const rel = obj(r.relato);
  for (const k of CAMPOS_RELATO.map((c) => c[0]).concat(["serieConfirmada", "identificadoPor", "testeResultado", "resultadoFinal", "resultadoDetalhe"])) if (!txt(exec.relato[k]) && txt(rel[k])) { exec.relato[k] = txt(rel[k]); mudou = true; }
  if (!Array.isArray(exec.relato.medicoes) && Array.isArray(rel.medicoes) && rel.medicoes.length) { exec.relato.medicoes = medicoesValidas(rel.medicoes); mudou = true; }
  if (!exec.assinatura && r.assinatura && typeof r.assinatura === "object") { exec.assinatura = { ...r.assinatura, ausente: !!r.assinatura.semAssinatura, doServidor: true }; mudou = true; }
  if (!exec.assinaturaColab && r.assinaturaColaborador && typeof r.assinaturaColaborador === "object") { exec.assinaturaColab = { ...r.assinaturaColaborador, doServidor: true }; mudou = true; }
  if (os.ronda && mesclarRonda(exec, os.ronda.registrado)) mudou = true;
  if (!exec.termo && r.logistica && typeof r.logistica === "object" && Array.isArray(r.logistica.itens)) { exec.termo = { ...termoDeDados(r.logistica), doServidor: true }; exec.termoEnviado = JSON.stringify(termoParaEnvio(exec.termo)); mudou = true; }
  for (const p of Array.isArray(r.pecas) ? r.pecas : []) {
    const id = txt(p && (p.idLocal || p.id));
    if (id && !exec.pecas.some((x) => x.id === id)) { exec.pecas.push({ id, descricao: txt(p.descricao), codigo: txt(p.codigo), quantidade: txt(p.quantidade), unidade: txt(p.unidade), situacao: txt(p.situacao) || "APLICADA", doServidor: true }); mudou = true; }
  }
  return mudou;
}

/**
 * 03/11/2026 (decisão do dono), mesma regra do servidor (Ast_nomeCompletoOk_ / Ast_documentoErro_): quem assina põe o nome
 * completo (nome e sobrenome); o documento é opcional e, preenchido, é conferido (CPF com os dígitos; outro com 3 letras ou números).
 */
export function nomeCompletoOk(nome) {
  return txt(nome).split(/\s+/).filter((p) => p.replace(/[^A-Za-zÀ-ÿ]/g, "").length >= 2).length >= 2;
}
export function documentoErro(doc) {
  const s = txt(doc);
  if (!s) return "";
  const dig = s.replace(/\D/g, "");
  if (/^[\d.\-\s/]+$/.test(s) && dig.length === 11) {
    const n = dig.split("").map(Number), dv = (k) => { let t = 0; for (let i = 0; i < k; i++) t += n[i] * (k + 1 - i); const r = (t * 10) % 11; return r === 10 ? 0 : r; };
    return /^(\d)\1{10}$/.test(dig) || dv(9) !== n[9] || dv(10) !== n[10] ? "O CPF não confere: confira os números ou deixe o documento em branco." : "";
  }
  return s.replace(/[^A-Za-z0-9À-ÿ]/g, "").length < 3 ? "Documento incompleto: escreva o CPF, o RG ou a matrícula, ou deixe em branco." : "";
}

/** Campos do relato no contrato (evento RELATO), na ordem da tela. 13/11/2026: dica com o que escrever e exemplo no campo. */
export const CAMPOS_RELATO = [
  ["condicaoEncontrada", "Condição encontrada", "Como o equipamento estava ao chegar: o que o cliente relatou, o que apareceu no painel e o que você constatou."],
  ["causa", "Causa ou diagnóstico", "O que provocou a falha e como você constatou (medição, teste, inspeção)."],
  ["servicoRealizado", "Serviço realizado", "O que foi feito, em qual parte do equipamento e com qual peça."],
  ["testeFuncional", "Teste funcional", "Como foi testado e o que deu. Se não testou, diga por quê."],
  ["recomendacoes", "Recomendações", "O que o cliente deve fazer ou acompanhar."],
  ["relato", "Observações gerais", "Combinados com o cliente, pendências da unidade, outras informações."],
];
/** Exemplo no campo vazio (placeholder): mostra o nível de detalhe esperado, sem marca de fabricante. */
export const EXEMPLOS_RELATO = {
  condicaoEncontrada: "Ex.: Autoclave parada, sem aquecer. O cliente relatou que parou no meio do ciclo; o painel indicava falha de aquecimento.",
  causa: "Ex.: Três resistências do gerador de vapor queimadas (circuito aberto no teste de continuidade).",
  servicoRealizado: "Ex.: Substituídas as três resistências do gerador de vapor; reapertados os bornes e conferida a isolação.",
  testeFuncional: "Ex.: Ciclo completo a 134 °C sem falha. Ou: não testado porque a energia da unidade caiu durante o atendimento.",
  recomendacoes: "Ex.: Corrigir o desequilíbrio entre as fases da alimentação antes de voltar a usar o equipamento.",
  relato: "Ex.: Ficaram três resistências de reserva com o responsável da CME.",
  resultadoDetalhe: "Ex.: Aguardando a correção da rede elétrica pela manutenção do hospital; depois, retorno para teste e liberação.",
};
/** 13/11/2026: resultado do teste funcional e situação do equipamento ao final (mesmos códigos do servidor). */
export const TESTE_RESULTADOS = [["APROVADO", "Aprovado"], ["REPROVADO", "Reprovado"], ["NAO_REALIZADO", "Não realizado"]];
export const RESULTADOS_FINAIS = [["LIBERADO", "Liberado para uso"], ["LIBERADO_RESTRICAO", "Liberado com restrição"], ["NAO_LIBERADO", "Não liberado"]];
/** Unidades sugeridas nas medições e nas peças (o técnico pode escrever outra). */
export const UNIDADES_MEDICAO = ["V", "A", "W", "kW", "kV", "Hz", "Ω", "kΩ", "MΩ", "°C", "bar", "kPa", "kgf/cm²", "psi", "%", "min", "s", "L", "mm", "m"];
export const UNIDADES_PECA = ["un", "pç", "par", "conj.", "kit", "m", "kg", "L"];
/** Palavras de verdade num texto (a mesma conta do servidor): "Parada" = 1; "Substituição das 3 resistências" = 4. */
export const palavras = (t) => txt(t).split(/\s+/).filter((p) => /\d/.test(p) || p.replace(/[^A-Za-zÀ-ÿ]/g, "").length >= 2).length;
/** Medições preenchidas (linha sem grandeza ou sem valor sai), no formato do evento RELATO. */
export const medicoesValidas = (l) => (Array.isArray(l) ? l : []).map((m) => ({ grandeza: txt(m && m.grandeza), valor: txt(m && m.valor), unidade: txt(m && m.unidade), obs: txt(m && m.obs) }))
  .filter((m) => m.grandeza && m.valor).slice(0, 30);
/**
 * Dica para a especificação escrita no nome da peça (ex.: "Resistência 7kv"): unidade elétrica em caixa errada ou grudada no número.
 * Não muda o que o técnico escreveu; só lembra de conferir na plaqueta. "" = nada a dizer.
 */
export function dicaPeca(desc) {
  const m = /(\d+(?:[.,]\d+)?)\s*(kv|kva|kw|w|v|a|hz|ma|mw)\b/i.exec(txt(desc));
  if (!m) return "";
  const certo = { kv: "kV", kva: "kVA", kw: "kW", w: "W", v: "V", a: "A", hz: "Hz", ma: "mA", mw: "MW" }[m[2].toLowerCase()];
  if (m[2] === certo && /\s/.test(m[0])) return "";
  return "Confira a especificação \"" + m[0] + "\": escreva como na plaqueta, com espaço e a unidade certa (ex.: " + m[1] + " " + certo + "). Lembre: kV é tensão (quilovolt), kW é potência (quilowatt).";
}
export const textoDoRelato = (rel) => CAMPOS_RELATO.map(([k]) => txt(rel && rel[k])).filter(Boolean).join(" ");

export function respondida(p, exec) {
  if (p.tipo === "FOTO") return exec.fotos.filter((f) => f.perguntaId === p.id).length >= (p.fotosMin || 1);
  if (p.tipo === "ASSINATURA") return !!exec.assinatura;
  const r = exec.respostas[p.id];
  if (!r) return false;
  if (Array.isArray(r.valor)) return r.valor.length > 0;
  return txt(r.valor) !== "";
}

const plural = (n, um, varios) => n + " " + (n === 1 ? um : varios);

/* ---------------- logística: termo de entrega, retirada (recebimento) ou envio (03/11/2026) ---------------- */

/** Sentido do termo pelo código ou pelo nome do tipo (mesma regra do servidor, Ast_sentidoLogistica_). */
export function sentidoLogistica(codigo, nome) {
  const s = (txt(codigo) + " " + txt(nome)).toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/ENVIO|ENVIAR|TRANSPORTADORA|CORREIO/.test(s)) return "ENVIO";
  if (/RETIRADA|RETIRAR|ENTRADA|RECEBIMENTO|COLETA/.test(s)) return "RETIRADA";
  return "ENTREGA";
}
/** Bloco "logistica" do tipo (servidor de 03/11/2026 em diante); sem ele, null: a O.S. segue pelo relato, como antes. */
export function normalizarLogistica(l, codigo, nome) {
  if (!l || typeof l !== "object" || l.termo === false) return null;
  const s = /^(ENTREGA|RETIRADA|ENVIO)$/.test(txt(l.sentido).toUpperCase()) ? txt(l.sentido).toUpperCase() : sentidoLogistica(codigo, nome);
  return { sentido: s, colaborador: l.colaborador !== false, titulo: prim(l.titulo, ROTULOS_LOGISTICA[s].termo) };
}
/** Textos da tela e do termo por sentido. */
export const ROTULOS_LOGISTICA = {
  ENTREGA: { termo: "Termo de entrega", verbo: "entregue", oQue: "O que está sendo entregue", contraparte: "Para quem (quem recebe)", quem: "quem recebe",
    assinaturaCliente: "Assinatura de quem recebe", assinaturaColab: "Sua assinatura (quem entrega)" },
  RETIRADA: { termo: "Termo de retirada (recebimento)", verbo: "retirado", oQue: "O que está sendo retirado", contraparte: "De quem (quem entrega ao colaborador)", quem: "quem entrega",
    assinaturaCliente: "Assinatura de quem entrega", assinaturaColab: "Sua assinatura (quem recebe)" },
  ENVIO: { termo: "Termo de envio", verbo: "enviado", oQue: "O que está sendo enviado", contraparte: "Destinatário", quem: "o destinatário",
    assinaturaCliente: "Assinatura de quem recebe", assinaturaColab: "Sua assinatura (quem despacha)" },
};
export const rotulosLogistica = (os) => ROTULOS_LOGISTICA[(os && os.logistica && os.logistica.sentido) || "ENTREGA"] || ROTULOS_LOGISTICA.ENTREGA;
export const ESTADOS_ITEM = [["BOM", "Bom estado"], ["AVARIA", "Com avaria"], ["NA", "Não se aplica"]];
export const DESTINOS_RETIRADA = [["OFICINA", "Oficina da Metrolabs"], ["CALIBRACAO", "Calibração (laboratório)"], ["QUALIFICACAO", "Qualificação"], ["ANALISE", "Análise técnica em bancada"], ["OUTRO", "Outro (escreva no motivo)"]];
export const EMBALAGENS = [["ORIGINAL", "Embalagem original"], ["OUTRA", "Outra embalagem"], ["SEM", "Sem embalagem"]];

const itemVazio = () => ({ descricao: "", quantidade: "1", identificacao: "", estado: "", avaria: "", acessorios: "" });
/** Termo novo, já com o equipamento da O.S. como primeiro item e, na retirada, o motivo do pedido e o destino pelo tipo. */
export function termoInicial(os) {
  const s = (os.logistica && os.logistica.sentido) || "ENTREGA", eq = os.equipamento || {};
  const item = itemVazio();
  if (eq.nome || eq.modelo || eq.serie || eq.tag) {
    item.descricao = [eq.nome, eq.modelo].filter(Boolean).join(" · ");
    // 03/11/2026: "N/S", "S/N", traço: não informa nada e não entra no termo
    const vale = (v) => !!v && !/^(n\/?s|s\/?n|n\/?a|na|ns|sn|-+|—+)$/i.test(String(v).trim());
    item.identificacao = [vale(eq.serie) && "Série " + eq.serie, vale(eq.patrimonio) && "Patrimônio " + eq.patrimonio, vale(eq.tag) && "TAG " + eq.tag].filter(Boolean).join(" · ");
  }
  const cod = txt(os.tipoCodigo);
  const destino = s !== "RETIRADA" ? "" : /ANALISE/.test(cod) ? "ANALISE" : /QUALIFICACAO/.test(cod) ? "QUALIFICACAO" : /CALIBRACAO/.test(cod) ? "CALIBRACAO" : /PREVENTIVA/.test(cod) ? "OFICINA" : "";
  return { sentido: s, itens: [item], contraparte: { nome: "", documento: "", setor: "" }, local: txt(eq.setor), motivo: s === "RETIRADA" ? txt(os.descricao) : "", destino,
    embalagem: "", lacre: "", rastreio: "", observacoes: "" };
}
/** Termo gravado (servidor ou aparelho) no formato do formulário (quantidade como texto pt-BR). */
export function termoDeDados(t) {
  t = obj(t);
  const c = obj(t.contraparte);
  return { sentido: txt(t.sentido), itens: (Array.isArray(t.itens) ? t.itens : []).map((i) => ({ descricao: txt(i && i.descricao), quantidade: i && i.quantidade !== undefined && i.quantidade !== null && i.quantidade !== "" ? String(i.quantidade).replace(".", ",") : "",
    identificacao: txt(i && i.identificacao), estado: txt(i && i.estado).toUpperCase(), avaria: txt(i && i.avaria), acessorios: txt(i && i.acessorios) })),
    contraparte: { nome: txt(c.nome), documento: txt(c.documento), setor: txt(c.setor) }, local: txt(t.local), motivo: txt(t.motivo), destino: txt(t.destino).toUpperCase(),
    embalagem: txt(t.embalagem).toUpperCase(), lacre: txt(t.lacre), rastreio: txt(t.rastreio), observacoes: txt(t.observacoes) };
}
/** O que vai ao servidor no evento RELATO (logistica): itens vazios saem, quantidade vira número. */
export function termoParaEnvio(t) {
  const d = termoDeDados(t);
  d.itens = d.itens.filter((i) => i.descricao || i.identificacao).map((i) => { const n = lerNumero(i.quantidade); return { ...i, quantidade: n ? n.numero : 0 }; });
  delete d.sentido;
  return d;
}
/** O que falta no termo, em palavras (cada frase começa com "No termo:"). */
export function faltasDoTermo(os, termo) {
  const rot = rotulosLogistica(os), s = (os.logistica && os.logistica.sentido) || "ENTREGA", f = [];
  const t = termo ? termoDeDados(termo) : null;
  const itens = t ? t.itens.filter((i) => i.descricao || i.identificacao) : [];
  if (!itens.length) { f.push("No termo: o que foi " + rot.verbo + " (pelo menos um item, com a quantidade)."); }
  itens.forEach((i, k) => {
    const n = "item " + (k + 1) + (i.descricao ? " (" + i.descricao.slice(0, 30) + ")" : "");
    const q = lerNumero(i.quantidade);
    if (!i.descricao) f.push("No termo: o nome do " + n + ".");
    if (!q || q.numero <= 0) f.push("No termo: a quantidade do " + n + ".");
    if (!i.estado) f.push("No termo: o estado do " + n + " (bom, com avaria ou não se aplica).");
    if (i.estado === "AVARIA" && txt(i.avaria).length < 3) f.push("No termo: descreva a avaria do " + n + " (e fotografe).");
  });
  if (!t || txt(t.contraparte.nome).length < 3) f.push("No termo: o nome de " + rot.quem + ".");
  if (s === "RETIRADA") {
    if (!t || txt(t.motivo).length < 3) f.push("No termo: o motivo da retirada.");
    if (!t || !t.destino) f.push("No termo: o destino (oficina, calibração, qualificação, análise ou outro).");
  }
  return f;
}

/* ---------------- passo a passo da O.S. ---------------- */

/** Passos da O.S. na ordem da tela. Logística: termo no lugar do equipamento e do relato, sem peças, com a assinatura do colaborador. */
export function passosDaOs(os) {
  if (os.ronda) return ["saida", "chegada", "setores", "orientacoes", "assinatura"].concat(exigeAssinaturaColab(os) ? ["colaborador"] : [], ["concluir"]);
  if (os.logistica) return ["saida", "chegada", "termo"].concat(os.checklist.length ? ["checklist"] : [], ["fotos", "assinatura"], exigeAssinaturaColab(os) ? ["colaborador"] : [], ["concluir"]);
  return ["saida", "chegada", "equipamento"].concat(os.checklist.length ? ["checklist"] : [], ["fotos", "pecas", "relato", "assinatura"], exigeAssinaturaColab(os) ? ["colaborador"] : [], ["concluir"]);
}
/** 03/11/2026 (decisão do dono): a O.S. pede a assinatura do técnico ou colaborador que atendeu (o servidor diz por O.S.; a logística, pelo tipo). */
export function exigeAssinaturaColab(os) {
  // só o que o servidor diz (exige.assinaturaColaborador): vale a dispensa da gestão e a O.S. já em execução antes da regra
  return !!(os.exigencias && os.exigencias.colaborador);
}
/**
 * Assinatura do técnico depois do Concluí no aparelho: liberada enquanto a O.S. não está encerrada no servidor e o servidor
 * diz que falta essa assinatura (ex.: concluída num aplicativo antigo, antes do passo existir).
 */
export function podeAssinarColabDepois(os, exec) {
  return !!(exec && exec.conclusao && !exec.assinaturaColab && !os.fechadaNoServidor
    && (os.pendenciasServidor || []).some((p) => /assinatura do (t[ée]cnico|colaborador)/i.test(p)));
}
/** Nome do passo na tela. */
export function nomePasso(os, p) {
  const rot = rotulosLogistica(os);
  return ({ saida: "Saí para o atendimento", chegada: "Cheguei", equipamento: "Confirmar equipamento", checklist: os.logistica ? "Conferência" : "Checklist", fotos: "Fotos", pecas: "Peças",
    relato: "Relato", termo: rot.termo, setores: "Setores e equipamentos", orientacoes: "Orientações e resumo", assinatura: os.logistica ? rot.assinaturaCliente : os.ronda ? "Assinatura do responsável do cliente" : "Assinatura do cliente", colaborador: os.logistica ? rot.assinaturaColab : "Sua assinatura (técnico que atendeu)", concluir: "Concluí" })[p] || p;
}
/** Passos que só valem depois do "Cheguei" (o servidor recusa checklist, fotos, relato e assinatura antes da chegada). */
export const PASSOS_DEPOIS_DA_CHEGADA = ["equipamento", "checklist", "fotos", "pecas", "relato", "termo", "assinatura", "colaborador", "setores", "setor", "orientacoes", "equipnovo"];

/**
 * O que falta, passo a passo: [[passo, [frases]]] na ordem da tela (só os passos com falta). Base do "Concluí", do selo
 * "Falta" de cada passo e do "próximo passo". Textos dos passos técnicos iguais aos de antes.
 */
export function faltasPorPasso(os, exec) {
  const out = [], por = (p, f) => { if (f.length) out.push([p, f]); };
  por("chegada", exec.chegada ? [] : ["Tocar em \"Cheguei\" ao chegar no cliente."]);
  // 03/11/2026: ronda de engenharia clínica
  if (os.ronda) {
    por("setores", faltasDaRonda(os, exec));
    por("assinatura", os.exigencias.assinatura && !exec.assinatura ? ["A assinatura do responsável do cliente ou o motivo de não haver assinatura."] : []);
    if (exigeAssinaturaColab(os)) por("colaborador", exec.assinaturaColab ? [] : ["Sua assinatura (técnico que atendeu)."]);
    return out;
  }
  if (!os.logistica) por("equipamento", os.exigencias.qrOuSerie && !txt(exec.relato && exec.relato.serieConfirmada) ? ["Confirmar o equipamento (ler o QR ou conferir o número de série)."] : []);
  if (os.logistica && os.exigencias.relato) por("termo", faltasDoTermo(os, exec.termo));
  const obrig = os.checklist.filter((p) => p.obrigatorio && p.tipo !== "ASSINATURA" && !respondida(p, exec));
  por("checklist", obrig.length ? [plural(obrig.length, "pergunta obrigatória", "perguntas obrigatórias") + " do " + (os.logistica ? "checklist de conferência" : "checklist") + ": " + obrig.slice(0, 3).map((p) => p.texto).join("; ") + (obrig.length > 3 ? "; ..." : "") + "."] : []);
  const fotos = exec.fotos.length;
  por("fotos", fotos < os.exigencias.fotosMin ? [plural(os.exigencias.fotosMin - fotos, "foto", "fotos") + " (mínimo " + os.exigencias.fotosMin + ")."] : []);
  if (!os.logistica && os.exigencias.relato) {
    const rel = exec.relato || {}, campos = os.exigencias.relatoCampos || ["servicoRealizado"], f = [];
    if (txt(rel.servicoRealizado).length < 10 && txt(rel.relato).length < 10) f.push("No relato: o serviço realizado (pelo menos uma frase).");
    const nomes = { condicaoEncontrada: "a condição encontrada", testeFuncional: "o teste funcional", causa: "a causa", recomendacoes: "as recomendações" };
    for (const k of campos) if (nomes[k] && txt(rel[k]).length < 3) f.push("No relato: " + nomes[k] + ".");
    faltasDoResultado(os, rel).forEach((x) => f.push(x));
    por("relato", f);
  }
  const assinaturaNoChecklist = os.checklist.some((p) => p.tipo === "ASSINATURA" && p.obrigatorio);
  por("assinatura", (os.exigencias.assinatura || assinaturaNoChecklist) && !exec.assinatura
    ? [os.logistica ? "A assinatura de " + rotulosLogistica(os).quem + " ou o motivo de não haver assinatura." : "A assinatura do cliente ou o motivo de não haver assinatura."] : []);
  if (exigeAssinaturaColab(os)) por("colaborador", exec.assinaturaColab ? [] : [(os.logistica ? rotulosLogistica(os).assinaturaColab : "Sua assinatura (técnico que atendeu)") + "."]);
  return out;
}
/**
 * 13/11/2026 (relatório de excelência): mínimos do relato em palavras e o resultado do atendimento (mesmas regras e números do
 * servidor, AstO_faltasResultado_). Cada frase diz o que escrever. Só quando o servidor pede (exigencias.resultado).
 */
export function faltasDoResultado(os, rel) {
  const ex = os.exigencias || {}, q = ex.qualidade || {}, f = [];
  if (!ex.resultado) return f;
  rel = rel || {};
  const poucas = (k, min, oQue, dica) => { const n = palavras(rel[k]); if (n && min && n < min) f.push("No relato: " + oQue + " mais completo (" + n + (n === 1 ? " palavra" : " palavras") + "; mínimo " + min + "): " + dica + "."); };
  poucas("condicaoEncontrada", q.condicaoEncontrada, "a condição encontrada", "como o equipamento estava, o que o cliente relatou e o que você constatou");
  if (q.causa) { if (!palavras(rel.causa)) f.push("No relato: a causa ou o diagnóstico (o que provocou a falha e como foi constatado)."); else poucas("causa", q.causa, "a causa ou o diagnóstico", "o que provocou a falha e como foi constatado"); }
  poucas("servicoRealizado", q.servicoRealizado, "o serviço realizado", "o que foi feito, em qual parte do equipamento e com qual peça");
  const tr = txt(rel.testeResultado), rf = txt(rel.resultadoFinal);
  if (!TESTE_RESULTADOS.some(([c]) => c === tr)) f.push("No relato: o resultado do teste funcional (aprovado, reprovado ou não realizado).");
  else if (tr !== "APROVADO" && palavras(rel.testeFuncional) < (q.testeMotivo || 1)) f.push("No relato: no teste funcional, " + (tr === "REPROVADO" ? "o que falhou no teste" : "por que o teste não foi feito") + (q.testeMotivo ? " (pelo menos " + q.testeMotivo + " palavras)" : "") + ".");
  if (!RESULTADOS_FINAIS.some(([c]) => c === rf)) f.push("No relato: a situação do equipamento ao final (liberado para uso, liberado com restrição ou não liberado).");
  else {
    if (rf !== "LIBERADO" && palavras(rel.resultadoDetalhe) < (q.resultadoDetalhe || 1)) f.push("No relato: " + (rf === "NAO_LIBERADO" ? "o que falta para o equipamento ser liberado" : "a restrição de uso do equipamento") + (q.resultadoDetalhe ? " (pelo menos " + q.resultadoDetalhe + " palavras)" : "") + ".");
    if (rf === "LIBERADO" && tr && tr !== "APROVADO") f.push("No relato: o equipamento está como \"liberado para uso\", mas o teste " + (tr === "REPROVADO" ? "foi reprovado" : "não foi feito") + ". Escolha \"liberado com restrição\" ou \"não liberado\" e diga o motivo, ou registre o teste aprovado.");
  }
  return f;
}
/** O que falta para concluir, em palavras. Lista vazia = pode concluir. */
export function faltasParaConcluir(os, exec) {
  return faltasPorPasso(os, exec).flatMap(([, f]) => f);
}
/**
 * Próximo passo depois de "atual" (ex.: depois de guardar o relato): o primeiro passo seguinte que ainda tem falta; se os
 * seguintes estão completos, o primeiro com falta antes dele; nada faltando, "concluir". Saída e peças são opcionais e
 * nunca são o destino. atual vazio = do começo (botão "Continuar" da O.S.).
 */
export function proximoPasso(os, exec, atual) {
  const falta = new Set(faltasPorPasso(os, exec).map(([p]) => p));
  // ronda: depois dos setores completos, sempre as orientações e o resumo (opcionais, mas o técnico confere antes das assinaturas)
  if (os.ronda && atual === "setores" && !falta.has("setores")) return "orientacoes";
  const lista = passosDaOs(os).filter((p) => p !== "saida" && p !== "pecas" && p !== "concluir");
  const i = lista.indexOf(atual);
  for (const p of lista.slice(i + 1)) if (falta.has(p)) return p;
  for (const p of lista.slice(0, Math.max(0, i))) if (falta.has(p)) return p;
  return "concluir";
}
/** O passo atual ainda tem falta? (fica na tela e mostra o que falta em vez de seguir) */
export const faltasDoPasso = (os, exec, p) => (faltasPorPasso(os, exec).find(([q]) => q === p) || [null, []])[1];

/** Situação da O.S. no aparelho, em palavras curtas. */
export function situacaoLocal(os, exec, pendentesDaOs) {
  if (os.cancelada) return "Cancelada";
  if (os.provisoria && !(exec && exec.conclusao)) return exec && exec.chegada ? "Em atendimento (provisória)" : "Provisória, aguardando envio";
  if (os.situacao === "ENCERRADA" && os.envio && os.envio.enviadoEm) return "Encerrada · relatório enviado ao cliente";
  if (os.situacao === "ENCERRADA" && os.envio && os.envio.pdfGerado) return pendentesDaOs ? "Encerrada · envio ao cliente aguardando sinal" : "Encerrada · relatório ainda não enviado";
  if (exec && exec.conclusao) return pendentesDaOs ? "Concluída, aguardando envio" : os.situacao === "DOC_PENDENTE" ? "Documentação pendente" : "Concluída e enviada";
  if (os.situacao === "ENCERRADA") return "Encerrada";
  if (os.situacao === "DOC_PENDENTE") return "Documentação pendente";
  if (exec && exec.chegada) return "Em atendimento";
  if (exec && exec.saida) return "A caminho";
  return os.situacaoNome && os.situacao !== "AGENDADA" ? os.situacaoNome : "A fazer";
}

/** CNPJ digitado: só os dígitos; válido quando tem 14 números e os dois dígitos conferem (mesma conta da Receita). */
export function lerCnpj(t) {
  const d = txt(t).replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return { digitos: d, valido: false };
  const n = d.split("").map(Number);
  const dv = (nums, pesos) => { const s = nums.reduce((a, x, i) => a + x * pesos[i], 0) % 11; return s < 2 ? 0 : 11 - s; };
  const d1 = dv(n.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]), d2 = dv(n.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return { digitos: d, valido: n[12] === d1 && n[13] === d2 };
}
export const cnpjBonito = (d) => { const x = txt(d).replace(/\D/g, ""); return x.length === 14 ? x.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : txt(d); };

/**
 * O que falta no formulário de Novo atendimento, campo a campo (mensagem ao lado do campo). tipo: CLIENTE, UNIDADE, EQUIPAMENTO ou OS.
 * Devolve { campo: mensagem }; vazio = pode seguir.
 */
export function faltasDoCadastro(tipo, d) {
  const f = {};
  d = obj(d);
  if (tipo === "CLIENTE") {
    if (txt(d.nome).length < 3) f.nome = "Escreva o nome do cliente (pelo menos 3 letras).";
    if (txt(d.cnpj) && !lerCnpj(d.cnpj).valido) f.cnpj = "CNPJ com 14 números e dígitos conferentes, ou deixe em branco.";
    if (txt(d.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(txt(d.email))) f.email = "E-mail incompleto (nome@dominio).";
  } else if (tipo === "UNIDADE") {
    if (txt(d.nome).length < 3) f.nome = "Escreva o nome da unidade (pelo menos 3 letras).";
    if (txt(d.cnpj) && !lerCnpj(d.cnpj).valido) f.cnpj = "CNPJ com 14 números e dígitos conferentes, ou deixe em branco.";
    if (txt(d.uf) && txt(d.uf).length !== 2) f.uf = "UF com 2 letras (GO, SP...).";
  } else if (tipo === "EQUIPAMENTO") {
    if (txt(d.tipo).length < 3) f.tipo = "Escreva o tipo do equipamento (pelo menos 3 letras).";
    if (!txt(d.serie) && !txt(d.tag)) f.serie = "Informe a série ou a TAG (ao menos uma) para o equipamento ser reconhecido depois.";
  } else if (tipo === "OS") {
    if (!txt(d.tipoCodigo)) f.tipoCodigo = "Escolha o tipo de serviço.";
    if (txt(d.sintoma).replace(/\s+/g, " ").length < 10) f.sintoma = d.logistica === "RETIRADA" ? "Escreva o que vai ser retirado e por quê (pelo menos 10 letras)."
      : d.logistica ? "Escreva o que vai ser " + (d.logistica === "ENVIO" ? "enviado" : "entregue") + " e para quem (pelo menos 10 letras)." : "Descreva o problema relatado (pelo menos 10 letras).";
    if (txt(d.solicitante).length < 3) f.solicitante = "Quem pediu o atendimento (nome, pelo menos 3 letras).";
  }
  return f;
}

/** Número digitado em pt-BR ("12,5") → { texto: "12,5", numero: 12.5 }; null se não for número. */
export function lerNumero(t) {
  let s = txt(t).replace(/\s/g, "");
  if (!s) return null;
  if (/^[-+]?\d+\.\d+$/.test(s)) s = s.replace(".", ",");          // teclado com ponto: "12.5" → "12,5"
  if (!(/^[-+]?\d+(,\d+)?$/.test(s) || /^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))) return null;
  return { texto: s, numero: Number(s.replace(/\./g, "").replace(",", ".")) };
}
export const lerValor = (t) => { const n = lerNumero(t); return n ? n.texto : ""; };

/** Link de mapa (abre o aplicativo de mapas do celular). */
export function linkMapa(end) {
  if (end.mapa && /^https:\/\//.test(end.mapa)) return end.mapa;
  if (end.lat !== null && end.lat !== undefined && end.lng !== null && end.lng !== undefined && end.lat !== "" && end.lng !== "") return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(end.lat + "," + end.lng);
  return end.texto ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(end.texto) : "";
}

/** Texto curto de um valor de resposta para mostrar (SIM → Sim, lista → "a, b"). */
export function textoResposta(p, v) {
  if (Array.isArray(v)) return v.join(", ");
  if (p.tipo === "SIM_NAO") { const o = OPCOES_SIM_NAO.find((x) => x[0] === v); return o ? o[1] : txt(v); }
  if (p.tipo === "NUMERO" && typeof v === "number") return String(v).replace(".", ",");
  return txt(v);
}

/**
 * Telas que o app pode redesenhar sozinho (agenda baixada, envio terminado, sinal de volta, abertura). As demais têm formulário,
 * quadro de assinatura ou campo com foco: o redesenho apagaria a assinatura em andamento ou tiraria o dedo do campo (03/11/2026).
 */
export const TELAS_REDESENHO_SOZINHO = ["dia", "os", "envios", "os-concluir"];
export const podeRedesenharSozinho = (tela) => TELAS_REDESENHO_SOZINHO.includes(String(tela || ""));

/* ---------------- ronda de engenharia clínica (03/11/2026): a mesma regra do servidor (SGO_Assistencia_Ronda.js) ---------------- */

/** Situações de cada equipamento na ronda: [código, nome, é problema (pede descrição e foto)]. */
export const SITUACOES_RONDA = [["FUNCIONANDO", "Em funcionamento", false], ["OBSERVACAO", "Com observação", true], ["FORA_USO", "Fora de uso ou com defeito", true], ["NAO_LOCALIZADO", "Não localizado", false], ["NAO_VERIFICADO", "Não verificado", false]];
export const nomeSituacaoRonda = (c) => (SITUACOES_RONDA.find((x) => x[0] === c) || [c, ""])[1];
/** Decisão do dono (03/11/2026): no "fora de uso", parado (chamado P2) ou funciona com defeito ou limitação (chamado P3); a prioridade é configurável no SGO+. */
export const PARADAS_RONDA = [["TOTAL", "Parado: não pode ser usado"], ["PARCIAL", "Funciona com defeito ou limitação"]];
export const problemaRonda = (c) => !!(SITUACOES_RONDA.find((x) => x[0] === c) || [])[2];
export const chaveSetor = (nome) => txt(nome).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]+/g, " ").trim() || "SEM SETOR";
const letrasR = (t) => txt(t).replace(/[^A-Za-zÀ-ÿ]/g, "").length;

/** Bloco "ronda" do item de O.S. do Meu dia; sem ele (servidor antigo ou outro tipo), null. */
export function normalizarRonda(r) {
  if (!r || typeof r !== "object" || !Array.isArray(r.setores)) return null;
  const perg = {};
  for (const [k, l] of Object.entries(obj(r.perguntas))) perg[k] = (Array.isArray(l) ? l : []).map(normalizarPergunta);
  return {
    clienteId: txt(r.clienteId), unidadeId: txt(r.unidadeId), unidadeNome: txt(r.unidadeNome), congelado: !!r.congelado, perguntas: perg, categorias: obj(r.categorias),
    regras: { descricaoMin: num(obj(r.regras).descricaoMin, 10), motivoMin: num(obj(r.regras).motivoMin, 5) },
    setores: r.setores.map((s) => ({ nome: txt(s && s.nome) || "Sem setor informado", chave: txt(s && s.chave) || chaveSetor(s && s.nome), extra: !!(s && s.extra),
      equipamentos: (Array.isArray(s && s.equipamentos) ? s.equipamentos : []).map((e) => ({ chave: txt(e.chave), id: txt(e.id), tipo: txt(e.tipo), modelo: txt(e.modelo), serie: txt(e.serie), tag: txt(e.tag), patrimonio: txt(e.patrimonio),
        categoria: txt(e.categoria).toUpperCase(), validade: obj(e.validade), novo: !!e.novo })).filter((e) => e.chave) })),
    registrado: obj(r.registrado),
  };
}
/** Estado da ronda no aparelho (criado vazio na primeira vez). */
export function rondaDe(exec) {
  if (!exec.ronda) exec.ronda = { itens: {}, setores: {}, orientacoes: "", pedidosCliente: "", novos: [] };
  if (!Array.isArray(exec.ronda.novos)) exec.ronda.novos = [];
  return exec.ronda;
}
/** O que o servidor já tem entra onde o aparelho ainda está vazio (troca de celular). Nunca troca o que foi feito aqui. */
export function mesclarRonda(exec, reg) {
  reg = obj(reg);
  let mudou = false;
  const r = rondaDe(exec);
  for (const [k, it] of Object.entries(obj(reg.itens))) if (!r.itens[k] && it && typeof it === "object") { r.itens[k] = { ...it, doServidor: true }; mudou = true; }
  for (const [k, st] of Object.entries(obj(reg.setores))) if (!r.setores[k] && st && typeof st === "object") { r.setores[k] = { ...st, doServidor: true }; mudou = true; }
  if (!r.orientacoes && txt(reg.orientacoes)) { r.orientacoes = txt(reg.orientacoes); mudou = true; }
  if (!r.pedidosCliente && txt(reg.pedidosCliente)) { r.pedidosCliente = txt(reg.pedidosCliente); mudou = true; }
  return mudou;
}
/** Categoria das perguntas fixas pelo tipo e modelo (mesma regra do servidor). */
export function categoriaRonda(tipo, modelo) {
  const t = (txt(tipo) + " " + txt(modelo)).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/AUTOCLAV|ESTERILIZADOR A VAPOR/.test(t)) return "AUTOCLAVE";
  if (/LAVADORA|ULTRASS|TERMODESINF|TERMO DESINF/.test(t)) return "LAVADORA";
  if (/CAMARA FRIA|CAMARA DE CONSERV|CAMARA REFRIGER|CAMARA DE VACIN|CAMARA FRIGORIF|REFRIGERADOR|GELADEIRA|FREEZER|CONSERVADORA/.test(t)) return "FRIO";
  if (/SELADORA/.test(t)) return "SELADORA";
  return "";
}
/** Setores da ronda: o escopo do servidor + o setor acrescentado e o equipamento cadastrado aqui. */
export function setoresDaRonda(os, exec) {
  const base = os.ronda ? os.ronda.setores : [], r = rondaDe(exec), mapa = new Map(), lista = [];
  for (const s of base) { const c = { ...s, equipamentos: [...s.equipamentos] }; mapa.set(s.chave, c); lista.push(c); }
  const setor = (nome) => { const k = chaveSetor(nome); if (!mapa.has(k)) { const c = { nome: txt(nome) || "Sem setor informado", chave: k, extra: true, equipamentos: [] }; mapa.set(k, c); lista.push(c); } return mapa.get(k); };
  for (const st of Object.values(r.setores)) if (st && st.extra) setor(st.nome);
  const vistos = new Set(lista.flatMap((s) => s.equipamentos.map((e) => e.chave)));
  for (const n of r.novos) if (!vistos.has(n.chave)) { setor(n.setor).equipamentos.push({ ...n, novo: true }); vistos.add(n.chave); }
  for (const [k, it] of Object.entries(r.itens)) if (!vistos.has(k) && /^n:/.test(k)) {
    const id = obj(it.ident);
    setor(it.setor).equipamentos.push({ chave: k, id: txt(it.equipamentoId), tipo: txt(id.tipo), modelo: txt(id.modelo), serie: txt(id.serie), tag: txt(id.tag), patrimonio: txt(id.patrimonio), categoria: categoriaRonda(id.tipo, id.modelo), validade: {}, novo: true });
    vistos.add(k);
  }
  return lista;
}
export const perguntasDoEquipRonda = (os, eq) => (os.ronda && eq.categoria ? os.ronda.perguntas[eq.categoria] || [] : []);
export const fotosDoItemRonda = (exec, chave) => exec.fotos.filter((f) => f.perguntaId === "ronda:" + chave);
/** O que falta num equipamento da ronda, em palavras (vazio = completo). */
export function faltasDoItemRonda(os, exec, eq) {
  const it = rondaDe(exec).itens[eq.chave], f = [], rg = (os.ronda && os.ronda.regras) || { descricaoMin: 10, motivoMin: 5 };
  if (!it || !it.situacao) return ["Escolha a situação."];
  const perg = perguntasDoEquipRonda(os, eq);
  if (problemaRonda(it.situacao)) {
    if (letrasR(it.descricao) < rg.descricaoMin) f.push("Descreva o que encontrou (pelo menos uma frase).");
    if (!fotosDoItemRonda(exec, eq.chave).length) f.push("Tire a foto do problema.");
  }
  if (it.situacao === "FORA_USO" && !PARADAS_RONDA.some(([c]) => c === txt(it.parada).toUpperCase())) f.push("Diga se o equipamento está parado ou funciona com defeito ou limitação.");
  if (it.situacao === "NAO_VERIFICADO" && letrasR(it.motivo) < rg.motivoMin) f.push("Escreva o motivo de não ter verificado.");
  if (["FUNCIONANDO", "OBSERVACAO", "FORA_USO"].includes(it.situacao) && perg.length) {
    const r = obj(it.respostas), sem = perg.filter((p) => p.obrigatorio && (r[p.id] === undefined || r[p.id] === null || txt(r[p.id]) === ""));
    if (sem.length) f.push("Responda " + plural(sem.length, "pergunta fixa", "perguntas fixas") + ".");
    if (it.situacao === "FUNCIONANDO" && perg.some((p) => p.tipo === "SIM_NAO" && txt(r[p.id]).toUpperCase() === "NAO")) f.push("Uma verificação ficou \"Não\": marque \"Com observação\" ou \"Fora de uso\" e descreva.");
  }
  return f;
}
/** Progresso de um setor: { total, comSituacao, comFalta }. */
export function progressoSetor(os, exec, setor) {
  const eqs = setor.equipamentos;
  return { total: eqs.length, comSituacao: eqs.filter((e) => (rondaDe(exec).itens[e.chave] || {}).situacao).length, comFalta: eqs.filter((e) => faltasDoItemRonda(os, exec, e).length).length };
}
/** O que falta nos setores (uma frase por setor com falta). */
export function faltasDaRonda(os, exec) {
  const setores = setoresDaRonda(os, exec), f = [];
  if (!setores.some((s) => s.equipamentos.length)) f.push("Pelo menos um equipamento na ronda: cadastre em \"Equipamento fora do cadastro\".");
  for (const s of setores) { const p = progressoSetor(os, exec, s); if (p.comFalta) f.push("Setor " + s.nome + ": " + plural(p.comFalta, "equipamento", "equipamentos") + " com o que falta (" + p.comSituacao + " de " + p.total + " com situação)."); }
  return f;
}
/** Próximo setor com falta depois do índice atual (ou antes); -1 = nenhum. */
export function proximoSetorComFalta(os, exec, atual) {
  const l = setoresDaRonda(os, exec), tem = (i) => progressoSetor(os, exec, l[i]).comFalta > 0;
  for (let i = atual + 1; i < l.length; i++) if (tem(i)) return i;
  for (let i = 0; i < Math.min(Math.max(atual, 0), l.length); i++) if (tem(i)) return i;
  return -1;
}
/** Resumo automático em números. */
export function resumoRonda(os, exec) {
  const r = { setores: 0, equipamentos: 0, semSituacao: 0, fotos: 0, por: {} };
  for (const [c] of SITUACOES_RONDA) r.por[c] = 0;
  const setores = setoresDaRonda(os, exec), reg = rondaDe(exec);
  r.setores = setores.length;
  for (const s of setores) for (const e of s.equipamentos) { r.equipamentos++; const it = reg.itens[e.chave]; if (it && it.situacao) r.por[it.situacao] = (r.por[it.situacao] || 0) + 1; else r.semSituacao++; }
  r.fotos = exec.fotos.filter((f) => /^ronda:/.test(f.perguntaId || "")).length;
  return r;
}
/** O que vai no evento RONDA (parte ITEM): o estado inteiro do item; o equipamento novo leva a identificação e o id provisório. */
export function itemRondaParaEnvio(exec, eq, setor) {
  const it = rondaDe(exec).itens[eq.chave] || {};
  const d = { parte: "ITEM", chave: eq.chave, setor, situacao: txt(it.situacao), descricao: txt(it.descricao), motivo: txt(it.motivo), respostas: obj(it.respostas) };
  if (it.situacao === "FORA_USO") d.parada = txt(it.parada).toUpperCase();
  if (eq.novo) { d.equipamentoId = txt(eq.id) || eq.chave.slice(2); d.ident = { tipo: txt(eq.tipo), modelo: txt(eq.modelo), serie: txt(eq.serie), tag: txt(eq.tag), patrimonio: txt(eq.patrimonio) }; }
  return d;
}
