// 17/11/2026: Portal do cliente, etapa 0 — portão da sessão CLIENTE no /api/run (lista fechada decidida pelo legado).
// Aplicado sobre os arquivos do CONTÊINER (prod/), por âncoras; o patch original foi feito sobre o repositório (diverge).
const fs = require('fs');
const um = (t, anc, arq) => { if (t.split(anc).length !== 2) throw new Error(arq + ': âncora não única: ' + anc.slice(0, 60)); };
function servidor(arq, saida, ts) {
  let t = fs.readFileSync(arq, 'utf8');
  const imp = 'APARELHO_DIAS' + (ts ? ', type DefinicaoWeb' : '') + ' } from "./sistemas.js";';
  um(t, imp, arq);
  t = t.replace(imp, imp.replace(' } from', ', PERFIL_CLIENTE, PORTAO_CLIENTE_FN, FUNCOES_CLIENTE_BASICAS, MSG_CLIENTE_RECUSADA } from'));
  const m1 = t.match(/\n(\s*)const perfilDaSessao = async \(sessao[^\n]*\n/); if (!m1) throw new Error(arq + ': perfilDaSessao');
  const i = m1[1];
  const bloco1 = i + '/* 17/11/2026 (Portal do cliente, etapa 0): portão da sessão CLIENTE. O legado decide (PortalCliente_portaoFuncao_: observa e,\n' +
    i + '   com a chave de recusa ligada, recusa função fora da lista); a decisão fica guardada 60 s por sessão e função. Sem a função no\n' +
    i + '   legado ou com erro, deixa passar: a chave de recusa só é ligada pela Diretoria na tela Portal do cliente > Segurança. */\n' +
    i + 'const portoesCliente = new Map' + (ts ? '<string, { permitir: boolean; mensagem: string; ate: number }>' : '') + '();\n' +
    i + 'const portaoCliente = async (sessao' + (ts ? ': string' : '') + ', fn' + (ts ? ': string' : '') + ', ip' + (ts ? ': string' : '') + ') => {\n' +
    i + '  const k = sessao + "|" + fn, agora = Date.now(), c = portoesCliente.get(k);\n' +
    i + '  if (c && c.ate > agora) return c;\n' +
    i + '  const r = await pool.executar({ tipo: "executar", fn: PORTAO_CLIENTE_FN, args: [sessao, fn, ip] });\n' +
    i + '  const v = r.ok && r.valor && typeof r.valor === "object" ? (r.valor' + (ts ? ' as { permitir?: unknown; mensagem?: unknown }' : '') + ') : null;\n' +
    i + '  const d = { permitir: v ? v.permitir !== false : true, mensagem: v ? String(v.mensagem ?? "") : "", ate: agora + 60_000 };\n' +
    i + '  if (portoesCliente.size > 20000) for (const [kk, vv] of portoesCliente) if (vv.ate <= agora) portoesCliente.delete(kk);\n' +
    i + '  portoesCliente.set(k, d);\n' +
    i + '  return d;\n' + i + '};\n';
  t = t.replace(m1[0], m1[0] + bloco1);
  const m2 = t.match(/\n(\s*)\/\/ 31\/10\/2026 \(pedido do dono\): sessão com troca de senha pendente/); if (!m2) throw new Error(arq + ': troca');
  const j = m2[1];
  const bloco2 = '\n' + j + '// 17/11/2026 (Portal do cliente, etapa 0): sessão CLIENTE (no 1º argumento, no sessionId dentro dele ou no cookie) passa pelo\n' +
    j + '// portão do legado; recusada só com a chave de recusa ligada (modo OBSERVAR: só registra)\n' +
    j + 'if (def.sistema === SISTEMA_PADRAO && !FUNCOES_CLIENTE_BASICAS.has(corpo.fn)) {\n' +
    j + '  const a0c = args[0]' + (ts ? ' as any' : '') + ';\n' +
    j + '  for (const sid of [a0c, a0c && typeof a0c === "object" ? a0c.sessionId : undefined, cookies[def.cookie]]) {\n' +
    j + '    if (!pareceSessaoSgo(sid)) continue;\n' +
    j + '    if ((await perfilDaSessao(sid)) !== PERFIL_CLIENTE) continue;\n' +
    j + '    const d = await portaoCliente(sid, String(corpo.fn), String(req.ip ?? ""));\n' +
    j + '    if (!d.permitir) {\n' +
    j + '      log("aviso", `${corpo.fn} recusada: sessão de cliente, função fora da lista do Portal do cliente (${req.ip})`, "seguranca");\n' +
    j + '      return rep.code(403).send({ ok: false, erro: d.mensagem || MSG_CLIENTE_RECUSADA });\n' +
    j + '    }\n' + j + '    break;\n' + j + '  }\n' + j + '}';
  t = t.replace(m2[0], bloco2 + m2[0]);
  const velho = 'Este documento não está entre os da sua empresa. Por quê: o seu usuário de cliente só abre os relatórios dos seus próprios chamados e dos ciclos das lavadoras da sua empresa. O que fazer: abra pela tela Meus chamados (em Documentos) ou pela tela Relatórios de ciclo; se precisar de outro documento, peça à Metrolabs.';
  um(t, velho, arq);
  t = t.replace(velho, 'Este arquivo não está entre os da sua empresa. Por quê: o seu usuário de cliente só abre os documentos, relatórios, orçamentos e fotos ligados aos registros da sua empresa. O que fazer: abra pelo Arquivo de documentos, por Meus chamados ou por Relatórios de ciclo; se precisar de outro documento, peça à Metrolabs.');
  fs.writeFileSync(saida, t);
}
function sistemas(arq, saida, ts) {
  let t = fs.readFileSync(arq, 'utf8');
  const anc = '/** E-mail (ou o nome da conta técnica) como chave do freio do login';
  um(t, anc, arq);
  const add = '/**\n * PERFIL CLIENTE (17/11/2026, Portal do cliente, etapa 0): a conta de cliente passa por uma lista fechada de funções conferida no\n' +
    ' * legado (PortalCliente_portaoFuncao_, SGO_PortalCliente_Seguranca.js). Modo OBSERVAR (padrão): só registra. Modo RECUSAR (chave\n' +
    ' * ligada pela Diretoria em Portal do cliente > Contratos > Segurança): função fora da lista volta 403 com a mensagem do legado.\n' +
    ' * As funções abaixo nunca passam pelo portão (básico da sessão e da segurança do acesso).\n */\n' +
    'export const PERFIL_CLIENTE = "CLIENTE";\n' +
    'export const PORTAO_CLIENTE_FN = "PortalCliente_portaoFuncao_";\n' +
    'export const FUNCOES_CLIENTE_BASICAS' + (ts ? ': ReadonlySet<string> = new Set<string>([' : ' = new Set([') + '\n' +
    '    "getSessaoAtual", "validarSessao", "logout", "login", "getPublicConfig", "verificarCodigoAcesso", "reenviarCodigoAcesso", "trocarSenhaAcesso",\n' +
    '    ...FUNCOES_REDEFINICAO,\n]);\n' +
    'export const MSG_CLIENTE_RECUSADA = "Esta função é da equipe Metrolabs e não faz parte do Portal do cliente. Por quê: o seu acesso de cliente usa só as telas do Portal. O que fazer: abra o que precisa pelo menu; se algo que você usava parou de funcionar, avise a Metrolabs.";\n';
  t = t.replace(anc, add + anc);
  fs.writeFileSync(saida, t);
}
fs.mkdirSync('novo', { recursive: true });
servidor('prod/dist_servidor.js', 'novo/servidor.js', false);
servidor('prod/src_servidor.ts', 'novo/servidor.ts', true);
sistemas('prod/dist_sistemas.js', 'novo/sistemas.js', false);
sistemas('prod/src_sistemas.ts', 'novo/sistemas.ts', true);
console.log('ok');
