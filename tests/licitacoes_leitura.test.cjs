// SGO+ Licitações, leitura especialista do edital (02/11/2026): palavras-chave pelo código (acento, caixa, plural, hífen de fim
// de linha do PDF, zero ocorrência, várias páginas), divisão em blocos e retomada em várias execuções, bloco repetido e
// aproveitado, cobertura com bloco não lido e nova tentativa, o verificador da nota recusando item inventado, número trocado
// e negação cortada, consolidação sem duplicata (checklist pelo código; resumo e estratégia conferidos, sem decisão nem
// promessa de RBC), permissão, histórico e as telas (computador e celular de 390 px).
// Código real do SGO+ num contexto isolado; o servidor (SGO_LICITACOES) e a IA (SGO_DocA4_chamarGemini_) são simulados: nada
// aqui é resultado de IA real. O texto do edital é trecho real do PE 399/2026 de São José do Rio Preto/SP (PNCP), encurtado.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r\n/g, '\n');

const INICIO = Date.parse('2026-11-02T10:00:00-03:00');
const relogio = { agora: INICIO };
class DataMovel extends Date { constructor(...a) { if (a.length) super(...a); else super(relogio.agora); } static now() { return relogio.agora; } }

const USUARIOS = [['u_dir', 'dora', 'DORA DIRETORA TESTE', 'DIRETORIA'], ['u_adm', 'admin', 'Administrador', 'ADMIN'], ['u_ges', 'gil', 'GIL GESTOR TESTE', 'GESTOR'],
  ['u_com', 'vera', 'VERA COMERCIAL TESTE', 'COMERCIAL'], ['u_tec', 'tiago', 'TIAGO TECNICO TESTE', 'TECNICO'], ['u_cli', 'cliente', 'CLIENTE TESTE', 'CLIENTE']];
const CHAVE = 'PNCP:46588950000180-1-000988/2026';
const OP = { ID: 'op1', CODIGO: 'LIC-2026-0120', CHAVE_FONTE: CHAVE, ORGAO_NOME: 'MUNICIPIO DE SAO JOSE DO RIO PRETO', UF: 'SP', MUNICIPIO: 'São José do Rio Preto', MODALIDADE: 'Pregão - Eletrônico',
  OBJETO: 'PRESTAÇÃO DE SERVIÇOS PARA MANUTENÇÃO CORRETIVA E PREVENTIVA COM FORNECIMENTO DE PEÇAS, PARA AUTOCLAVES DAS UNIDADES DA SECRETARIA MUNICIPAL DE SAÚDE', VALOR_ESTIMADO: 152300.5,
  ENCERRAMENTO_PROPOSTAS: '2026-11-13T08:00:00', ENCERRAMENTO_ISO: '2026-11-13T11:00:00.000Z', TRIAGEM: 'CANDIDATA', SITUACAO: 'ANALISE', VERSAO_FONTE: 1, VERSAO_HASH: 'v'.repeat(64), LEI: '14133' };
const P1 = '[página 1]\nEDITAL DE PREGÃO (ELETRÔNICO) n.º 399/2026\nO Município torna público que se acha aberta licitação na modalidade PREGÃO, objetivando a PRESTAÇÃO DE SERVIÇOS PARA MANUTENÇÃO\n' +
  'CORRETIVA E PREVENTIVA COM FORNECIMENTO DE PEÇAS, PARA AUTOCLAVES DAS UNIDADES DA SECRETARIA MUNICIPAL DE SAÚDE.\n4.3. Não será admitida a participação de empresas em consórcio conforme justificativa\n' +
  'apresentada pela Secretaria da Saúde em seu Termo de Referência.\n2.1.1. O prazo de validade da proposta não será inferior 90 (noventa) dias, a contar da data marcada\npara a sua abertura.\n';
const P2 = '[página 2]\nATESTADOS DE CAPACIDADE TÉCNICA\nb.1) A comprovação referida no item anterior deverá ser realizada mediante apresentação de\ncertidões ou atestado(s) fornecido(s) por pessoa(s) jurídica(s) de direito público ou pri-\n' +
  'vado, em nome da empresa licitante, devidamente registrado(s) na entidade profissional competente, em\nquantitativo compatível em 50%(cinquenta por cento) do quantitativo dos equipamentos.\n';
const P3 = '[página 3]\nd) Multa:\nI - atraso de até 10 dias = multa de 0,2% por dia de atraso;\nII - atraso de 11 a 20 dias = multa de 0,4% por dia de atraso;\n' +
  '• Verificar os sensores de temperatura e pressão ligados ao sistema de controle devem ser verificados\ncom precisão documentada, rastreável a um padrão nacional. O atestado de calibração acompanha o relatório.\n';
const EDITAL = P1 + P2 + P3;
const ANEXO = P2.replace('[página 2]', '[página 1]');   // o mesmo texto em outro arquivo (o .zip repete o termo de referência)
const ARQS = () => ({ chave: CHAVE, baseHash: 'd'.repeat(64), arquivos: [
  { id: 21, titulo: 'Edital PE 399/2026', nome: 'edital.pdf', sha256: 'a'.repeat(64), textoPaginas: 3, textoSituacao: 'EXTRAIDO' },
  { id: 22, titulo: 'Anexo I', nome: 'anexo.pdf', sha256: 'b'.repeat(64), textoPaginas: 1, textoSituacao: 'EXTRAIDO' },
  { id: 23, titulo: 'Planilha escaneada', nome: 'planilha.pdf', sha256: 'c'.repeat(64), textoPaginas: 2, textoSituacao: 'NAO_EXTRAIDO' }] });
const TEXTOS = () => [
  { ref: 'A1', id: 21, titulo: 'Edital PE 399/2026', nome: 'edital.pdf', sha256: 'a'.repeat(64), situacao: 'EXTRAIDO', motivo: '', texto: EDITAL, cortado: false },
  { ref: 'A2', id: 22, titulo: 'Anexo I', nome: 'anexo.pdf', sha256: 'b'.repeat(64), situacao: 'EXTRAIDO', motivo: '', texto: ANEXO, cortado: false },
  { ref: 'A3', id: 23, titulo: 'Planilha escaneada', nome: 'planilha.pdf', sha256: 'c'.repeat(64), situacao: 'NAO_EXTRAIDO', motivo: 'PDF sem texto (imagem escaneada)', texto: '', cortado: false }];

/** Itens que a IA simulada devolve por página do bloco (trechos copiados do edital). */
const ITENS_POR_PAGINA = {
  1: [{ tema: 'OUTRO', rotulo: 'Objeto do pregão', trecho: 'PRESTAÇÃO DE SERVIÇOS PARA MANUTENÇÃO CORRETIVA E PREVENTIVA COM FORNECIMENTO DE PEÇAS' },
    { tema: 'CONSORCIO', rotulo: 'Participação em consórcio', trecho: 'Não será admitida a participação de empresas em consórcio' },
    { tema: 'PRAZOS', rotulo: 'Validade da proposta', trecho: 'O prazo de validade da proposta não será inferior 90 (noventa) dias' }],
  2: [{ tema: 'ATESTADOS', rotulo: 'Atestado do quantitativo dos equipamentos', trecho: 'quantitativo compatível em 50%(cinquenta por cento) do quantitativo dos equipamentos' }],
  3: [{ tema: 'PENALIDADES', rotulo: 'Multa por atraso', trecho: 'atraso de até 10 dias = multa de 0,2% por dia de atraso' },
    { tema: 'RBC_INMETRO', rotulo: 'Rastreabilidade dos sensores', trecho: 'com precisão documentada, rastreável a um padrão nacional' }]
};
function iaPadrao(prompt, o) {
  o = o || {};
  if (/ITENS \(o que precisamos/.test(prompt)) {
    const ids = {}; for (const m of prompt.matchAll(/^(I\d+) \[([A-Z_]+)\]/gm)) ids[m[2]] = m[1];
    return o.consolidacao ? o.consolidacao(ids, prompt) : {
      resumo: [{ texto: 'Pregão para manutenção corretiva e preventiva de autoclaves com fornecimento de peças.', fontes: [ids.OUTRO, 'CAMPO:objeto'] },
        { texto: 'Exige atestado de 50% do quantitativo dos equipamentos.', fontes: [ids.ATESTADOS] },
        { texto: 'A proposta vale por no mínimo 90 dias e consórcio não é admitido.', fontes: [ids.PRAZOS, ids.CONSORCIO] }],
      estrategia: { primeiro: [{ texto: 'Separar os atestados de manutenção de autoclave e conferir se somam 50% do quantitativo.', fontes: [ids.ATESTADOS] }],
        riscos: [{ texto: 'Multa de 0,2% por dia de atraso: planejar o prazo das peças.', fontes: [ids.PENALIDADES] }],
        documentos: [{ texto: 'Certificados dos padrões com rastreabilidade a padrão nacional.', fontes: [ids.RBC_INMETRO] }],
        perguntas: [{ texto: 'Perguntar ao órgão se o certificado rastreável dos padrões atende à rastreabilidade pedida para os sensores.', fontes: [ids.RBC_INMETRO].concat(/PRAZO:PRAZO_ESCLARECIMENTO:/.test(prompt) ? ['PRAZO:PRAZO_ESCLARECIMENTO'] : []) }] } };
  }
  const bloco = prompt.slice(prompt.indexOf('INICIO A'), prompt.lastIndexOf('<<<'));
  const pags = [...bloco.matchAll(/\[página (\d+)\]/g)].map((m) => Number(m[1]));
  const ref = /INICIO (A\d+)/.exec(prompt)[1];
  let itens = [];
  for (const p of pags) itens = itens.concat((ref === 'A2' ? ITENS_POR_PAGINA[2] : ITENS_POR_PAGINA[p]) || []);
  return { itens };
}

function ambiente(o) {
  o = o || {};
  relogio.agora = INICIO;
  const tabelas = { CAD_USUARIOS: USUARIOS.map((u) => ({ ID: u[0], USUARIO: u[1], NOME: u[2], PERFIL: u[3], STATUS: 'ATIVO' })), LIC_OPORTUNIDADES: [Object.assign({}, OP)], LIC_EVENTOS: o.eventos || [] };
  const props = Object.assign({}, o.semChave ? {} : { GEMINI_API_KEY: 'chave-de-teste', IA_MODEL: 'gemini-2.5-flash' }), cache = {}, sessoes = {};
  tabelas.CAD_USUARIOS.forEach((u) => { sessoes['s_' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: u.PERFIL }; });
  let seq = 0;
  const lidas = {};
  const srv = { textos: o.textos || TEXTOS(), arquivos: ARQS(), pedacos: [] };
  const ia = { prompts: [], opcoes: [], fila: (o.respostas || []).slice(), custoMs: o.custoMs === undefined ? 30000 : o.custoMs };
  const gatilhos = [];
  const SGO_LICITACOES = {
    listar: () => ({ itens: [], ate: '', mais: false }), obter: () => ({ itens: [] }),
    arquivos: () => srv.arquivos, textos: () => srv.textos.map((t) => Object.assign({}, t)),
    textoPedaco: o.semPedaco ? undefined : (f) => { srv.pedacos.push(f); const t = (o.textoCheio || {})[f.id] || ''; const q = t.slice(f.desde, f.desde + f.quantos); return { id: f.id, total: t.length, desde: f.desde, ate: f.desde + q.length, fim: f.desde + q.length >= t.length, texto: q }; }
  };
  if (o.semPedaco) delete SGO_LICITACOES.textoPedaco;
  const ctx = vm.createContext({
    console, Date: DataMovel, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt, Buffer,
    Utilities: criarUtilities({ computeDigest: (alg, texto) => Array.from(crypto.createHash('sha256').update(String(texto), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)), DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF-8' } }),
    Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true }) },
    ScriptApp: { getProjectTriggers: () => gatilhos.map((g) => ({ getHandlerFunction: () => g.funcao, getUniqueId: () => g.id })), deleteTrigger: (t) => { const i = gatilhos.findIndex((g) => g.id === t.getUniqueId()); if (i >= 0) gatilhos.splice(i, 1); },
      newTrigger: (funcao) => { const d = { funcao, id: 'g' + (++seq) }; const tb = { timeBased: () => tb, after: (ms) => { d.ms = ms; return tb; }, everyMinutes: () => tb, create: () => { gatilhos.push(d); return d; } }; return tb; } },
    CertCal_garantirTabela_: (t) => { tabelas[t] = tabelas[t] || []; }, CertCal_garantirColuna_() {}, CertCal_forcarColunaTexto_() {},
    SGO_DATA: {
      getAll: (t) => { lidas[t] = (lidas[t] || 0) + 1; if (!tabelas[t]) throw new Error('Aba não encontrada: ' + t); return tabelas[t].map((r) => Object.assign({}, r)); },
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) return false; Object.assign(r, d); return true; },
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq) }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
      insertMany: (t, l) => l.map((d) => { const r = Object.assign({ ID: 'id' + (++seq) }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); })
    },
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', CAD_EQUIPAMENTOS: 'CAD_EQUIPAMENTOS' } },
    exigirSessao: (sid) => { if (!sessoes[sid]) throw new Error('Sessão inválida ou expirada. Entre de novo'); return sessoes[sid]; },
    SGO_execucaoInterna_: () => o.interna !== false,
    SGO_DocA4_chamarGemini_: (prompt, opc) => {
      ia.prompts.push(prompt); ia.opcoes.push(opc); relogio.agora += ia.custoMs;
      let r = ia.fila.length ? ia.fila.shift() : null;
      if (typeof r === 'function') r = r(prompt);
      if (r === null || r === undefined) r = iaPadrao(prompt, o);
      if (r instanceof Error) throw r;
      return typeof r === 'string' ? r : JSON.stringify(r);
    },
    ComEsp_fabricantes_: () => ['marca exemplo'],
    SGO_LICITACOES
  });
  for (const f of ['SGO_Expediente.js', 'SGO_Licitacoes_Config.js', 'SGO_Licitacoes.js', 'SGO_Licitacoes_Analise.js', 'SGO_Licitacoes_Agenda.js', 'SGO_Licitacoes_Leitura.js', 'SGO_Ajuda.js', 'SGO_Ajuda_Licitacoes.js']) vm.runInContext(ler(f), ctx, { filename: f });
  // páginas curtas do teste: um bloco por página (o padrão é 18 mil caracteres)
  vm.runInContext('LIC_LEIT_BLOCO_CAR = ' + (o.blocoCar || 700) + ';', ctx);
  const api = (sid, acao, d) => ctx.Licitacoes_api(sid, acao, d || {});
  return { ctx, tabelas, props, srv, ia, api, gatilhos, lidas, op: () => tabelas.LIC_OPORTUNIDADES[0], hist: (tipo) => (tabelas.LIC_HISTORICO || []).filter((h) => !tipo || h.TIPO === tipo),
    leituras: () => tabelas.LIC_LEITURAS || [], blocos: () => (tabelas.LIC_LEITURA_BLOCOS || []).slice().sort((a, b) => a.ORDEM - b.ORDEM) };
}
const J = (x) => JSON.parse(JSON.stringify(x));
const bloco = (a, ordem) => a.blocos().filter((b) => b.LEITURA_ID === a.leituras()[a.leituras().length - 1].ID).find((b) => b.ORDEM === ordem);

// ---------------- palavras-chave (pelo código) ----------------
test('palavras-chave: acento, caixa, plural, hífen de fim de linha do PDF, várias páginas, zero ocorrência; página, linha e frase', () => {
  const a = ambiente();
  const r = a.api('s_dora', 'palavrasSalvar', { escopo: 'OPORTUNIDADE', id: 'op1', palavras: ['atestado', 'LICITACAO', 'privado', 'visita técnica', 'multa*', 'Atestados'], motivo: 'acompanhar a habilitação técnica' });
  assert.equal(r.ok, true, r.message);
  assert.deepEqual(r.lista.palavras, ['atestado', 'LICITACAO', 'privado', 'visita técnica', 'multa*'], '"Atestados" é a mesma palavra que "atestado" (plural): não repete');
  const t = a.api('s_dora', 'leitura', { id: 'op1' }).leitura;
  const b = Object.fromEntries(t.palavras.busca.palavras.map((x) => [x.palavra, x]));
  // "ATESTADOS" (p. 2, título), "atestado(s)" (p. 2) e "O atestado" (p. 3) no edital; o título e "atestado(s)" no anexo
  assert.equal(b.atestado.total, 5);
  assert.equal(b.atestado.arquivos, 2);
  assert.deepEqual(J(b.atestado.ocorrencias).map((x) => [x.ref, x.pagina, x.linha]), [['A1', 2, 1], ['A1', 2, 3], ['A1', 3, 5], ['A2', 1, 1], ['A2', 1, 3]]);
  assert.match(b.atestado.ocorrencias[1].frase, /certidões ou atestado\(s\) fornecido\(s\) por pessoa\(s\) jurídica\(s\) de direito público ou pri- vado/);
  const o1 = b.atestado.ocorrencias[1];
  assert.equal(o1.frase.slice(o1.marca[0], o1.marca[1]), 'atestado', 'a marca cobre a palavra achada');
  assert.equal(b.LICITACAO.total, 1, 'sem acento e sem caixa acha "licitação"');
  assert.equal(b.LICITACAO.ocorrencias[0].pagina, 1);
  assert.equal(b.privado.total, 2, '"pri-⏎vado" (hífen de fim de linha do PDF) é "privado"');
  assert.equal(b['multa*'].total, 3, '"multa*" acha "Multa:" e "multa" duas vezes');
  assert.equal(b['visita técnica'].total, 0);
  assert.equal(b['visita técnica'].zeroTexto, 'não encontrada em nenhuma das 4 página(s) de 2 arquivo(s) com texto (1 arquivo(s) sem texto legível não puderam ser procurados)');
  assert.deepEqual(J(t.palavras.busca.arquivosSemTexto).map((x) => x.ref), ['A3']);
  // a IA não foi chamada: a busca é do código
  assert.equal(a.ia.prompts.length, 0);
  // histórico com de → para e versão
  const h = a.hist('PALAVRAS_CHAVE')[0];
  assert.equal(h.ENTIDADE, 'OPORTUNIDADE');
  assert.equal(h.DE, '(nenhuma)');
  assert.match(h.TEXTO, /versão 1\)\. Motivo: acompanhar a habilitação técnica/);
});

test('palavras-chave: lista geral e da oportunidade somadas; junção de três vias quando outra pessoa salvou antes; validação e motivo', () => {
  const a = ambiente();
  assert.equal(a.api('s_dora', 'palavrasSalvar', { escopo: 'GERAL', palavras: ['RBC', 'Inmetro'], motivo: 'lista inicial da Diretoria' }).ok, true);
  // Admin abriu a tela com a versão 1 e trocou "Inmetro" por "garantia"; enquanto isso a Dora salvou a versão 2 com "multa"
  const v1 = a.api('s_dora', 'leituraCfg').geral;
  assert.equal(a.api('s_dora', 'palavrasSalvar', { escopo: 'GERAL', palavras: ['RBC', 'Inmetro', 'multa'], base: v1.palavras, versaoBase: 1, motivo: 'acrescentar multa' }).ok, true);
  const r = a.api('s_admin', 'palavrasSalvar', { escopo: 'GERAL', palavras: ['RBC', 'garantia'], base: v1.palavras, versaoBase: 1, motivo: 'trocar Inmetro por garantia' });
  assert.equal(r.ok, true, r.message);
  assert.equal(r.juntou, true);
  assert.deepEqual(J(r.lista.palavras), ['RBC', 'multa', 'garantia'], 'a mudança de cada um foi aplicada; nada se perdeu');
  assert.equal(r.lista.versao, 3);
  a.api('s_dora', 'palavrasSalvar', { escopo: 'OPORTUNIDADE', id: 'op1', palavras: ['rbc', 'atestado'], motivo: 'desta licitação' });
  const ef = a.ctx.LicLeit_palavrasEfetivas_('op1');
  assert.deepEqual(J(ef).map((x) => [x.palavra, x.origem]), [['rbc', 'OPORTUNIDADE'], ['atestado', 'OPORTUNIDADE'], ['multa', 'GERAL'], ['garantia', 'GERAL']]);
  for (const [palavras, msg] of [[['a'], /de 2 a 60 letras/], [['cal*ibra'], /o "\*" só no fim/], [Array.from({ length: 61 }, (_, i) => 'palavra' + i), /No máximo 60/]]) {
    const x = a.api('s_dora', 'palavrasSalvar', { escopo: 'GERAL', palavras, motivo: 'teste de validação' });
    assert.equal(x.ok, false); assert.match(x.message, msg); assert.match(x.message, /Nada foi alterado\.$/);
  }
  assert.match(a.api('s_dora', 'palavrasSalvar', { escopo: 'GERAL', palavras: ['x1'], motivo: '' }).message, /Escreva o motivo/);
  assert.equal(a.api('s_dora', 'palavrasSalvar', { escopo: 'GERAL', palavras: ['RBC', 'multa', 'garantia'], motivo: 'sem mudança nenhuma' }).semMudanca, true);
});

// ---------------- blocos, retomada, cobertura ----------------
test('ler edital inteiro: blocos de páginas, bloco repetido lido uma vez, retomada pela rotina, consolidação, histórico', () => {
  const a = ambiente({ eventos: [{ ID: 'ev1', OPORTUNIDADE_ID: 'op1', TIPO: 'PRAZO_ESCLARECIMENTO', NOME: 'Limite para pedir esclarecimento', SITUACAO: 'ATIVO', QUANDO_ISO: '2026-11-10T02:59:00.000Z', NATUREZA: 'CALCULADO', REGRA: 'Lei 14.133/2021, art. 164: até 3 dias úteis antes da abertura.' }] });
  const r = a.api('s_dora', 'leituraIniciar', { id: 'op1' });
  assert.equal(r.ok, true, r.message);
  assert.equal(r.criada.blocos, 4, '3 páginas do edital + 1 do anexo');
  // a tela lê enquanto cabe em 45 s (cada chamada simulada leva 30 s): 2 blocos agora, o resto na rotina
  assert.equal(r.resultado.lidos, 2);
  assert.equal(r.resultado.restam, 1, 'o bloco 4 repete o 2 (já lido): só o 3 fica na fila');
  assert.equal(r.leitura.leitura.progresso.texto, 'Lendo bloco 3 de 4 (3 lido(s))');
  assert.equal(a.gatilhos.length, 1); assert.equal(a.gatilhos[0].funcao, 'Licitacoes_rotinaLeitura'); assert.equal(a.gatilhos[0].ms, 60000);
  assert.equal(bloco(a, 4).SITUACAO, 'REPETIDO', 'o anexo repete a página 2: não vai à IA');
  assert.equal(bloco(a, 4).REPETIDO_DE, 2);
  const opc = a.ia.opcoes[0];
  assert.deepEqual([opc.tokens, opc.temperatura, opc.raciocinio, opc.json], [12288, 0.1, 4096, true]);
  assert.equal(opc.prazoAte, INICIO + 45000);
  // cada bloco vai sozinho, com o número do bloco, as regras do dono e o conteúdo entre marcadores
  assert.match(a.ia.prompts[0], /Este é o bloco 1 de 4 do edital LIC-2026-0120 \(arquivo A1 · Edital PE 399\/2026, página 1\)/);
  assert.match(a.ia.prompts[0], /LINHA POR LINHA/);
  assert.match(a.ia.prompts[0], /NÃO é acreditada RBC/);
  assert.match(a.ia.prompts[0], /<<<FONTE-[0-9a-f]+ INICIO A1>>>\n\[página 1\]/);
  assert.doesNotMatch(a.ia.prompts[0], /\[página 2\]/);
  // a rotina continua (execução interna), lê o resto e consolida
  const x = a.ctx.Licitacoes_rotinaLeitura();
  assert.equal(x.lidos, 1);
  assert.equal(x.consolidadas, 1);
  assert.equal(x.restam, 0);
  assert.equal(a.gatilhos.length, 0, 'sem pendência, sem gatilho');
  const le = a.leituras()[0];
  assert.equal(le.SITUACAO, 'LER_A_MAO', 'a A3 é escaneada: páginas para ler à mão');
  assert.equal(le.CONSOLIDACAO_SITUACAO, 'OK');
  const cl = JSON.parse(le.CHECKLIST_JSON);
  // sem duplicata: o atestado do edital e o do anexo são um item com as duas fontes
  assert.deepEqual(cl.map((e) => [e.id, e.tema]), [['I1', 'ATESTADOS'], ['I2', 'PRAZOS'], ['I3', 'PENALIDADES'], ['I4', 'RBC_INMETRO'], ['I5', 'CONSORCIO'], ['I6', 'OUTRO']]);
  // o item é a FRASE INTEIRA do edital em volta do que a IA citou (sem rótulo nem paráfrase), com o pedaço citado marcado
  assert.equal(cl[0].trecho, 'b.1) A comprovação referida no item anterior deverá ser realizada mediante apresentação de certidões ou atestado(s) fornecido(s) por pessoa(s) jurídica(s) de direito público ou pri- vado, em nome da empresa licitante, devidamente registrado(s) na entidade profissional competente, em quantitativo compatível em 50%(cinquenta por cento) do quantitativo dos equipamentos.');
  assert.equal(cl[0].trecho.slice(cl[0].fontes[0].citado[0], cl[0].fontes[0].citado[1]), 'quantitativo compatível em 50%(cinquenta por cento) do quantitativo dos equipamentos');
  assert.deepEqual([cl[0].titulo, cl[0].texto], [undefined, undefined]);
  assert.deepEqual(cl[0].fontes.map((f) => [f.ref, f.pagina, f.linha]), [['A1', 2, 5], ['A2', 1, 5]]);
  assert.equal(cl[0].fontes[1].rotulo, 'página 1', 'o anexo repete a página 2: o trecho é reencontrado no anexo, com a página e a linha dele');
  assert.equal(cl[0].fontes[0].arquivo.sha256, 'a'.repeat(64));
  assert.equal(cl[4].alerta, '', 'consórcio não é exigência impeditiva: sem alerta');
  // cobertura: 4 de 6 páginas lidas (A3 sem texto, 2 páginas)
  const cob = JSON.parse(le.COBERTURA_JSON);
  assert.equal(cob.total.texto, 'Lidas 4 de 4 página(s) com texto (4 de 4 bloco(s)) em 3 arquivo(s). Sem texto legível (ler à mão): A3 Planilha escaneada.');
  // resumo e estratégia conferidos; a pergunta cita o prazo da agenda
  const tela = a.api('s_dora', 'leitura', { id: 'op1' }).leitura;
  assert.equal(tela.leitura.resumo.length, 3);
  assert.equal(tela.leitura.estrategia.perguntas[0].tipo, 'SUGESTAO');
  assert.deepEqual(tela.prazos.map((p) => [p.ref, p.quando]), [['PRAZO:PRAZO_ESCLARECIMENTO', 'seg 09/11/2026 23:59']]);
  const cons = a.ia.prompts[a.ia.prompts.length - 1];
  assert.match(cons, /PRAZO:PRAZO_ESCLARECIMENTO: Limite para pedir esclarecimento seg 09\/11\/2026 23:59 \(calculado\)/);
  assert.match(cons, /COBERTURA: Lidas 4 de 4/);
  // histórico: pedido e conclusão, com versão, fonte (SHA-256) e hash
  const hp = a.hist('LEITURA_PEDIDA')[0];
  assert.equal(hp.USUARIO_NOME, 'DORA DIRETORA TESTE');
  assert.match(hp.TEXTO, /4 bloco\(s\) em 2 arquivo\(s\) com texto/);
  assert.match(hp.FONTE, /A1 aaaaaaaaaaaa, A2 bbbbbbbbbbbb, A3 cccccccccccc/);
  const hc = a.hist('LEITURA_CONCLUIDA_LER_A_MAO')[0];
  assert.equal(hc.USUARIO_NOME, 'Sistema');
  assert.equal(hc.HASH, le.HASH);
  assert.match(hc.TEXTO, /6 item\(ns\) em "O que realmente precisamos"\. Resumo e estratégia sugerida gerados e conferidos/);
  // ler de novo sem mudança: recusa; refazer exige motivo; refazer reaproveita os blocos lidos (mesmo hash)
  assert.match(a.api('s_dora', 'leituraIniciar', { id: 'op1' }).message, /já é desta versão dos arquivos e das palavras-chave\. Para ler de novo, use "Refazer"/);
  assert.match(a.api('s_dora', 'leituraIniciar', { id: 'op1', refazer: true, motivo: 'curto' }).message, /Escreva o motivo/);
  const n = a.ia.prompts.length;
  const rf = a.api('s_dora', 'leituraIniciar', { id: 'op1', refazer: true, motivo: 'conferir a leitura de novo' });
  assert.equal(rf.ok, true, rf.message);
  assert.equal(rf.criada.versao, 2);
  assert.equal(rf.criada.aproveitados, 3, 'os 3 blocos lidos têm o mesmo hash: nenhum vai à IA de novo');
  assert.equal(a.ia.prompts.length, n + 1, 'só a consolidação foi à IA');
  assert.equal(a.leituras()[0].VERSAO, 1, 'a versão 1 continua guardada');
  assert.equal(a.hist('LEITURA_REFEITA').length, 1);
  // "ler tudo de novo": todos os blocos voltam à IA
  const rt = a.api('s_dora', 'leituraIniciar', { id: 'op1', refazer: true, relerTudo: true, motivo: 'desconfio da leitura anterior' });
  assert.equal(rt.criada.aproveitados, 0);
});

test('bloco não lido (IA fora do ar e verificador recusando) aparece na cobertura como "não lido", com nova tentativa', () => {
  const recusa = { itens: [{ tema: 'PENALIDADES', texto: 'Multa de 5% por dia.', trecho: 'multa de cinco por cento por dia de atraso no fornecimento' }] };
  const a = ambiente({ custoMs: 1000, respostas: [null, null, recusa, recusa, recusa], semPedaco: true });
  const r = a.api('s_dora', 'leituraIniciar', { id: 'op1' });
  assert.equal(r.ok, true, r.message);
  const le = a.leituras()[0];
  assert.equal(le.SITUACAO, 'PARCIAL');
  assert.equal(bloco(a, 3).SITUACAO, 'FALHOU');
  assert.equal(bloco(a, 3).TENTATIVAS, 3, '1 resposta + 2 refações, cada uma com os problemas apontados');
  assert.match(a.ia.prompts[3], /SUA RESPOSTA ANTERIOR FOI RECUSADA PELO VERIFICADOR[\s\S]*não está em A1/);
  const t = r.leitura.leitura;
  assert.match(t.cobertura.total.texto, /^Lidas 3 de 4 página\(s\) com texto \(3 de 4 bloco\(s\)\) em 3 arquivo\(s\)\. Não lidos: A1 página 3\./);
  assert.equal(t.falhos.length, 1);
  assert.match(t.falhos[0].erro, /recusada pelo verificador 3 vezes/);
  // nova tentativa: o bloco volta para a fila e é lido
  const d = a.api('s_dora', 'leituraTentarDeNovo', { id: 'op1' });
  assert.equal(d.ok, true, d.message);
  assert.equal(bloco(a, 3).SITUACAO, 'LIDO');
  assert.equal(a.leituras()[0].SITUACAO, 'LER_A_MAO', 'a A3 é escaneada: páginas para ler à mão');
  assert.equal(a.hist('LEITURA_BLOCOS_DE_NOVO').length, 1);
  // IA fora do ar: o bloco fica na fila na 1ª vez e vira "não lido" na 2ª
  const b = ambiente({ custoMs: 1000, respostas: [new Error('Serviço de IA indisponível (HTTP 503): fora'), new Error('Serviço de IA indisponível (HTTP 503): fora')] });
  b.api('s_dora', 'leituraIniciar', { id: 'op1' });
  assert.equal(bloco(b, 1).SITUACAO, 'PENDENTE');
  assert.match(bloco(b, 1).ERRO, /A IA não leu o bloco: Serviço de IA indisponível/);
  b.api('s_dora', 'leituraContinuar', { id: 'op1' });
  assert.equal(bloco(b, 1).SITUACAO, 'FALHOU');
  assert.equal(bloco(b, 2).SITUACAO, 'PENDENTE', 'IA fora do ar: a execução para (não insiste nos outros blocos)');
  b.api('s_dora', 'leituraContinuar', { id: 'op1' });
  assert.equal(bloco(b, 2).SITUACAO, 'LIDO', 'na execução seguinte, o próximo bloco é lido');
});

test('arquivo maior que o corte do servidor: lido inteiro em pedaços (textoPedaco); sem a operação, a cobertura diz o que faltou', () => {
  const cheio = EDITAL + '[página 4]\nGARANTIA CONTRATUAL de 5% do valor do contrato.\n';
  const cortado = TEXTOS().map((t) => (t.ref === 'A1' ? Object.assign({}, t, { texto: cheio.slice(0, 900), cortado: true }) : t));
  const a = ambiente({ textos: cortado, textoCheio: { 21: cheio }, blocoCar: 100000 });
  const tx = a.ctx.LicLeit_textos_(a.op());
  assert.equal(tx.arquivos[0].texto, cheio);
  assert.equal(tx.arquivos[0].completo, true);
  assert.deepEqual(a.srv.pedacos.map((p) => [p.id, p.desde]), [[21, 0]]);
  const b = ambiente({ textos: cortado, semPedaco: true });
  b.api('s_dora', 'leituraIniciar', { id: 'op1' });
  b.ctx.Licitacoes_rotinaLeitura();
  const cob = JSON.parse(b.leituras()[0].COBERTURA_JSON);
  assert.match(cob.arquivos[0].motivo, /não lido inteiro: o servidor entregou 900 caracteres; o resto não foi lido/);
  assert.match(cob.total.texto, /Não lido inteiro: A1\./);
  assert.equal(b.leituras()[0].SITUACAO, 'PARCIAL', 'arquivo não lido inteiro: a leitura não é Concluída');
});

// ---------------- o verificador ----------------
test('verificador do bloco (o mesmo da nota): recusa item inventado, número trocado, negação cortada e tema fora da lista; página e linha pelo código', () => {
  const a = ambiente();
  const c = a.ctx, tx = c.LicLeit_textos_(a.op()), arq = tx.arquivos[0];
  arq._ind = c.LicLeit_indice_(arq.texto);
  const b = c.LicLeit_dividir_(arq)[2]; b.ordem = 3;
  const ctx = { fontes: { A1: c.LicLeit_fonteBloco_(arq, b) }, pesos: c.LIC_NOTA_PADRAO, fabricantes: ['marca exemplo'] };
  const v = (itens) => c.LicLeit_verificarBloco_({ itens }, arq, b, ctx);
  assert.equal(v(ITENS_POR_PAGINA[3]).ok, true);
  const ok = v(ITENS_POR_PAGINA[3]).itens[0];
  assert.deepEqual([ok.ref, ok.pagina, ok.linha, ok.rotulo, ok.arquivo.sha256], ['A1', 3, 2, 'página 3', 'a'.repeat(64)]);
  // inventado: trecho que não está no bloco
  let r = v([{ tema: 'GARANTIA', texto: 'Garantia de 5% do contrato.', trecho: 'a contratada prestará garantia de cinco por cento do valor' }]);
  assert.equal(r.ok, false); assert.match(r.problemas.join(' | '), /não está em A1/);
  // rótulo e paráfrase da IA são ignorados: o item é o tema e o trecho
  r = v([{ tema: 'PENALIDADES', rotulo: 'Multa não aplicada', texto: 'Multa de 10% por dia até 0,2 dias, salvo exceções.', trecho: 'atraso de até 10 dias = multa de 0,2% por dia de atraso' }]);
  assert.equal(r.ok, true); assert.deepEqual([r.itens[0].texto, r.itens[0].titulo], [undefined, undefined], 'nem a paráfrase nem o rótulo são guardados');
  // número trocado no próprio trecho (separador entre dígitos): "0,2%" ≠ "2%"
  r = v([{ tema: 'PENALIDADES', texto: 'Multa por dia de atraso.', trecho: 'atraso de até 10 dias = multa de 2% por dia de atraso' }]);
  assert.equal(r.ok, false);
  // negação cortada (bloco 1): "admitida a participação ... consórcio" sem o "Não será"
  const b1 = c.LicLeit_dividir_(arq)[0]; b1.ordem = 1;
  const ctx1 = { fontes: { A1: c.LicLeit_fonteBloco_(arq, b1) }, pesos: c.LIC_NOTA_PADRAO, fabricantes: [] };
  r = c.LicLeit_verificarBloco_({ itens: [{ tema: 'CONSORCIO', rotulo: 'Consórcio', trecho: 'admitida a participação de empresas em consórcio conforme justificativa' }] }, arq, b1, ctx1);
  assert.equal(r.ok, false); assert.match(r.problemas[0], /vem logo depois de "nao"|vem logo depois de "Não"|negação/i);
  // tema fora da lista
  r = v([{ tema: 'PRECO', trecho: 'atraso de até 10 dias = multa de 0,2% por dia de atraso' }]);
  assert.match(r.problemas.join(' | '), /tema fora da lista/);
  // resposta que não é o JSON pedido
  assert.equal(c.LicLeit_verificarBloco_('texto solto', arq, b, ctx).ok, false);
});

test('rede de segurança: item impeditivo (RBC, acreditação, atestado) com negação ou exceção perto do trecho fica com o alerta "confirmar no edital"', () => {
  const texto = '[página 1]\nQUALIFICAÇÃO TÉCNICA\nSerá exigido certificado de calibração emitido por laboratório acreditado RBC para os sensores do equipamento.\nO certificado acreditado poderá ser substituído por certificado rastreável, a critério da fiscalização.\n';
  const a = ambiente({ textos: [{ ref: 'A1', id: 21, titulo: 'Edital', nome: 'e.pdf', sha256: 'a'.repeat(64), situacao: 'EXTRAIDO', motivo: '', texto, cortado: false }] });
  const c = a.ctx, arq = c.LicLeit_textos_(a.op()).arquivos[0];
  arq._ind = c.LicLeit_indice_(arq.texto);
  const b = c.LicLeit_dividir_(arq)[0]; b.ordem = 1;
  const r = c.LicLeit_verificarBloco_({ itens: [{ tema: 'RBC_INMETRO', texto: 'Certificado de laboratório acreditado RBC para os sensores.', trecho: 'Será exigido certificado de calibração emitido por laboratório acreditado RBC' }] }, arq, b,
    { fontes: { A1: c.LicLeit_fonteBloco_(arq, b) }, pesos: c.LIC_NOTA_PADRAO, fabricantes: [] });
  assert.equal(r.ok, true, r.problemas.join(' | '));
  assert.equal(r.itens[0].alerta, 'poderá');
});

// ---------------- consolidação ----------------
test('consolidação: checklist sem duplicata pelo código; resumo e estratégia recusados por decisão, RBC prometido, número e data fora das fontes; o checklist continua', () => {
  const a = ambiente();
  const c = a.ctx;
  const itens = [
    { tema: 'ATESTADOS', texto: 'Atestado de 50% do quantitativo.', trecho: 'quantitativo compatível em 50%(cinquenta por cento) do quantitativo dos equipamentos', ref: 'A1', pagina: 2, rotulo: 'página 2', linha: 6 },
    { tema: 'ATESTADOS', texto: 'Atestados de 50% do quantitativo dos equipamentos.', trecho: 'em quantitativo compatível em 50%(cinquenta por cento) do quantitativo dos equipamentos', ref: 'A2', pagina: 1, rotulo: 'página 1', linha: 6 },
    { tema: 'PENALIDADES', texto: 'Multa de 0,2% por dia.', trecho: 'atraso de até 10 dias = multa de 0,2% por dia de atraso', ref: 'A1', pagina: 3, rotulo: 'página 3', linha: 2 },
    { tema: 'PENALIDADES', texto: 'Multa de 0,4% por dia.', trecho: 'atraso de 11 a 20 dias = multa de 0,4% por dia de atraso', ref: 'A1', pagina: 3, rotulo: 'página 3', linha: 3 }];
  const cl = c.LicLeit_checklist_(itens);
  assert.equal(cl.length, 3, 'o atestado repetido (um trecho dentro do outro) é um item; as duas multas (números diferentes) são dois');
  assert.deepEqual(J(cl[0].fontes).map((f) => f.ref), ['A1', 'A2']);
  // estratégia que decide, promete RBC, inventa número e data
  const ruim = (ids) => ({ resumo: [{ texto: 'O edital tem 3 exigências e encerra em 20/11/2026.', fontes: [ids.ATESTADOS] }, { texto: 'Multa de 0,5% por dia de atraso.', fontes: [ids.PENALIDADES] }],
    estrategia: { primeiro: [{ texto: 'Vale a pena participar desta licitação.', fontes: [ids.ATESTADOS] }], riscos: [{ texto: 'Apresentar o certificado de acreditação RBC da Metrolabs.', fontes: [ids.RBC_INMETRO] }],
      documentos: [{ texto: 'Atestados.', fontes: ['I99'] }], perguntas: [] } });
  const b = ambiente({ consolidacao: ruim, custoMs: 1000 });
  b.api('s_dora', 'leituraIniciar', { id: 'op1' });
  const le = b.leituras()[0];
  assert.equal(le.CONSOLIDACAO_SITUACAO, 'RECUSADA');
  assert.equal(JSON.parse(le.CHECKLIST_JSON).length, 6, 'o checklist vale mesmo com o resumo recusado');
  const p = JSON.parse(le.CONSOLIDACAO_PROBLEMAS_JSON)[0].problemas.join(' | ');
  assert.match(p, /o número 3, a data 20\/11\/2026 não está, com a mesma unidade, em nenhuma das fontes citadas/);

  assert.match(p, /a IA não decide/);
  assert.match(p, /falou de RBC ou acreditação sem dizer como tratar/);
  assert.match(p, /fonte que não existe \(I99\)/);
  assert.equal(b.hist('LEITURA_CONSOLIDACAO_RECUSADA').length, 1);
  // refazer resumo e estratégia: motivo obrigatório; com a IA certa, passa
  assert.match(b.api('s_dora', 'leituraConsolidar', { id: 'op1', motivo: 'x' }).message, /Escreva o motivo/);
  b.ia.fila.push((pr) => iaPadrao(pr, {}), (pr) => iaPadrao(pr, {}), (pr) => iaPadrao(pr, {}));
  const rr = b.api('s_dora', 'leituraConsolidar', { id: 'op1', motivo: 'tentar de novo o resumo' });
  assert.equal(rr.ok, true, rr.message);
  assert.equal(b.leituras()[0].CONSOLIDACAO_SITUACAO, 'OK', b.leituras()[0].CONSOLIDACAO_PROBLEMAS_JSON);
});

// ---------------- permissão, chave, descartada, rotina automática ----------------
test('permissão: só Diretoria e Administrador; sem a chave da IA a busca continua e a leitura diz "falta a chave"; descartada não lê', () => {
  const a = ambiente();
  for (const sid of ['s_gil', 's_vera', 's_tiago', 's_cliente']) {
    for (const acao of ['leitura', 'leituraIniciar', 'leituraContinuar', 'leituraTentarDeNovo', 'leituraConsolidar', 'palavrasSalvar', 'leituraCfg', 'leituraCfgSalvar', 'leituraProgresso']) {
      const r = a.api(sid, acao, { id: 'op1', escopo: 'GERAL', palavras: ['x1'], motivo: 'tentativa sem permissão' });
      assert.equal(r.ok, false, sid + ' ' + acao); assert.equal(r.semAcesso, true, sid + ' ' + acao);
    }
  }
  assert.equal(a.ia.prompts.length, 0); assert.equal(a.leituras().length, 0); assert.equal(a.hist().length, 0);
  const s = ambiente({ semChave: true });
  s.api('s_dora', 'palavrasSalvar', { escopo: 'GERAL', palavras: ['atestado'], motivo: 'lista inicial' });
  const t = s.api('s_admin', 'leitura', { id: 'op1' });
  assert.equal(t.ok, true, t.message);
  assert.equal(t.leitura.iaDisponivel, false);
  assert.match(t.leitura.aviso, /falta a chave da IA/);
  assert.equal(t.leitura.palavras.busca.palavras[0].total, 5, 'a busca é do código: funciona sem a chave');
  const r = s.api('s_dora', 'leituraIniciar', { id: 'op1' });
  assert.equal(r.ok, false); assert.match(r.message, /falta a chave da IA[\s\S]*Nada foi alterado\.$/);
  assert.equal(s.leituras().length, 0);
  a.op().SITUACAO = 'DESCARTADA';
  assert.match(a.api('s_dora', 'leituraIniciar', { id: 'op1' }).message, /está descartada/);
});

test('rotina: só execução interna; leitura automática (desligada no padrão) põe na fila a candidata depois dos arquivos, sem chamar a IA ali', () => {
  const a = ambiente({ interna: false });
  assert.equal(a.ctx.Licitacoes_rotinaLeitura(), null);
  const b = ambiente();
  assert.deepEqual(JSON.parse(JSON.stringify(b.ctx.Lic_leituraAposArquivos_([CHAVE]))), { enfileiradas: 0 }, 'desligada: nada');
  assert.equal(b.api('s_dora', 'leituraCfgSalvar', { automatica: true, motivo: 'ler sozinho as candidatas' }).ok, true);
  b.op().SITUACAO = 'RADAR';
  const r = b.ctx.Lic_leituraAposArquivos_([CHAVE]);
  assert.equal(r.enfileiradas, 1);
  assert.equal(b.ia.prompts.length, 0, 'a IA não foi chamada na rotina de arquivos');
  assert.equal(b.leituras()[0].ORIGEM_PEDIDO, 'AUTOMATICA');
  assert.equal(b.gatilhos.length, 1);
  assert.equal(b.ctx.Lic_leituraAposArquivos_([CHAVE]).enfileiradas, 0, 'mesma base: não repete');
  assert.equal(b.hist('LEITURA_AUTOMATICA').length, 1);
  assert.equal(b.hist('LEITURA_CONFIG').length, 1);
});

// ---------------- telas ----------------
function tela(o) {
  o = o || {};
  const html = fs.readFileSync(path.join(pasta, 'JS_Licitacoes.html'), 'utf8'), leit = fs.readFileSync(path.join(pasta, 'JS_Licitacoes_Leitura.html'), 'utf8');
  const sc = (h) => h.slice(h.indexOf('<script>') + 8, h.lastIndexOf('</script>'));
  const els = {};
  const el = (id) => (els[id] = els[id] || { id, style: {}, innerHTML: '', querySelectorAll: () => [], querySelector: () => null, addEventListener() {} });
  el('conteudo'); el('menu-secao-licitacoes'); el('licCorpo');
  const ctx = vm.createContext({ console, window: {}, setTimeout, clearTimeout, USER_CONTEXT: { perfil: 'DIRETORIA' },
    document: { getElementById: (id) => els[id] || null, querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, removeEventListener() {}, body: { appendChild() {} }, createElement: () => el('x' + Math.random()) },
    ehMobileModo_: () => !!o.celular, atualizarTituloMobile_() {}, abrir() {}, SGO_getSessionId: () => 's', google: { script: { run: { withSuccessHandler() { return { withFailureHandler() { return { Licitacoes_api() {} }; } }; } } } } });
  vm.runInContext(sc(html), ctx); vm.runInContext(sc(leit), ctx);
  return { ctx, html, leit };
}
test('tela: aba "Leitura do edital" na ficha (palavras, cobertura, checklist, resumo, estratégia como sugestão), escape do que vem do edital e da IA, celular 390 px', () => {
  const a = ambiente({ eventos: [{ ID: 'ev1', OPORTUNIDADE_ID: 'op1', TIPO: 'PRAZO_ESCLARECIMENTO', NOME: 'Limite para pedir esclarecimento', SITUACAO: 'ATIVO', QUANDO_ISO: '2026-11-10T02:59:00.000Z', NATUREZA: 'CALCULADO' }] });
  a.api('s_dora', 'palavrasSalvar', { escopo: 'OPORTUNIDADE', id: 'op1', palavras: ['atestado', 'visita técnica'], motivo: 'acompanhar' });
  a.api('s_dora', 'leituraIniciar', { id: 'op1' });
  const andamento = a.api('s_dora', 'leitura', { id: 'op1' }).leitura;
  const t = tela();
  const h0 = t.ctx.LicLeit_htmlAba_(andamento);
  assert.match(h0, /id="licLeitProg"[\s\S]*Lendo bloco 3 de 4 \(3 lido\(s\)\)/);
  assert.match(h0, /data-lic-leit-continuar>Continuar agora/);
  assert.doesNotMatch(h0, /data-lic-leit-ler=/, 'durante a leitura não há "Ler edital inteiro"');
  a.ctx.Licitacoes_rotinaLeitura();
  const d = a.api('s_dora', 'leitura', { id: 'op1' }).leitura;
  const h = t.ctx.LicLeit_htmlAba_(d);
  assert.match(h, /<summary><span>atestado<\/span><span class="cm-selo verde">5 ocorrências em 2 arquivo\(s\)/);
  assert.match(h, /A1 · Edital PE 399\/2026 · página 2 · linha 3<\/span><br>[^<]*certidões ou <mark>atestado<\/mark>\(s\)/);
  assert.match(h, /<b>visita técnica<\/b> <span class="cm-selo cinza">não encontrada<\/span><\/p><p class="cm-meta" style="margin:2px 0 0">não encontrada em nenhuma das 4 página\(s\)/);
  assert.match(h, /Cobertura da leitura<\/h3><p class="cm-txt">Lidas 4 de 4 página\(s\) com texto/);
  assert.match(h, /O que realmente precisamos \(6\)/);
  assert.match(h, /<h4 class="lic-leit-tema">Atestado de capacidade técnica<\/h4>/);
  assert.match(h, /<span class="lic-leit-id">I1<\/span>Atestado de capacidade técnica<\/p>(<p class="lic-motivo pend">.*?<\/p>)?<blockquote class="lic-trecho">"b\.1\) A comprovação [^<]*em <mark>quantitativo compatível em 50%\(cinquenta por cento\) do quantitativo dos equipamentos<\/mark>\."<cite>A1 · Edital PE 399\/2026 · página 2 · linha 5/);
  assert.match(h, /Mais 1 fonte\(s\)/);
  assert.match(h, /<h3>Sugestão da IA — confira nos trechos<\/h3>/);
  assert.match(h, /Resumo do edital[\s\S]*Trechos citados \(I6, CAMPO:objeto\)<\/summary><p class="cm-meta" style="margin:6px 0 0"><span class="lic-leit-id">I6<\/span>Outro<\/p><blockquote class="lic-trecho">"[^"]*PRESTAÇÃO DE SERVIÇOS/);
  assert.match(h, /A IA não decide: participar ou descartar é da Diretoria\./);
  assert.match(h, /<span class="lic-leit-sug">Sugestão<\/span>Perguntar ao órgão/);
  assert.match(h, /Prazo na agenda \(calculado ou confirmado pelo sistema\): Limite para pedir esclarecimento seg 09\/11\/2026 23:59 \(calculado\)/);
  assert.match(h, /data-lic-leit-ler="refazer">Refazer<\/button>/);
  const tds = h.match(/<td[^>]*>/g) || [];
  assert.ok(tds.length >= 4 && tds.every((x) => /data-r="/.test(x)), 'toda célula com data-r (vira cartão no celular)');
  // escape: texto do edital e da IA nunca vira HTML
  const mal = JSON.parse(JSON.stringify(d));
  mal.leitura.checklist[0].temaNome = '<img src=x onerror=alert(1)>';
  mal.leitura.checklist[0].fontes[0].trecho = '"><script>alert(2)</script>';
  mal.palavras.busca.palavras[0].ocorrencias[0].frase = '<b>atestado</b>';
  mal.leitura.resumo[0].texto = '<iframe>';
  const hm = t.ctx.LicLeit_htmlAba_(mal);
  assert.doesNotMatch(hm, /<img|<script>|<iframe>|<b>atestado/);
  assert.match(hm, /&lt;img src=x onerror=alert\(1\)&gt;/);
  // sem a chave: aviso e botão desligado
  const s = ambiente({ semChave: true });
  const hs = t.ctx.LicLeit_htmlAba_(s.api('s_dora', 'leitura', { id: 'op1' }).leitura);
  assert.match(hs, /Leitura pela IA indisponível: falta a chave da IA/);
  assert.match(hs, /data-lic-leit-ler="primeira" disabled aria-disabled="true">Ler edital inteiro/);
  assert.match(hs, /Sem a chave da IA, só a busca das palavras-chave funciona: nada é inventado/);
  // a ficha ganha a aba e a casca; Portais ganha "Leitura do edital"
  const f = t.ctx.Lic_htmlFicha_({ op: { codigo: 'LIC-2026-0120', orgao: 'X', uf: 'SP', selos: [], pendencias: [] }, historico: [] }, 'leitura');
  assert.match(f, /aria-selected="true" data-lic-fab="leitura">Leitura do edital<\/button>/);
  assert.match(f, /<div id="licLeitura" aria-live="polite">/);
  assert.match(t.ctx.Lic_htmlPortaisCab_('leitura'), /data-lic-pab="leitura">Leitura do edital/);
  const cfg = t.ctx.LicLeit_htmlCfg_(a.api('s_dora', 'leituraCfg'));
  assert.match(cfg, /Palavras-chave gerais da Diretoria/); assert.match(cfg, /Ler sozinho o edital das candidatas/);
  // celular 390 px: nada com largura fixa maior que a tela; CRLF como os demais
  for (const m of t.leit.matchAll(/(?:^|[^-])width:\s*(\d+)px/g)) assert.ok(Number(m[1]) <= 360, 'largura fixa ' + m[0]);
  for (const m of t.leit.matchAll(/min-width:\s*(\d+)px/g)) assert.ok(Number(m[1]) <= 200, 'largura mínima ' + m[0]);
  assert.doesNotMatch(t.leit, /setInterval/);
  assert.doesNotMatch(t.leit, /[^\r]\n/, 'CRLF');
  assert.doesNotMatch(fs.readFileSync(path.join(pasta, 'SGO_Licitacoes_Leitura.js'), 'utf8'), /[^\r]\n/, 'CRLF');
  // Index.html inclui a tela depois de JS_Licitacoes
  const idx = ler('Index.html');
  assert.ok(idx.indexOf("include('JS_Licitacoes_Leitura')") > idx.indexOf("include('JS_Licitacoes')"));
});

test('ajuda, manual e base do assistente falam da leitura do edital; nada de "antiburro" nem de acreditação prometida', () => {
  const a = ambiente();
  const telas = JSON.stringify(a.ctx.SGO_ajudaTelas_Licitacoes_());
  for (const s of ['Leitura do edital', 'Ler edital inteiro', 'palavras-chave', 'O que realmente precisamos', 'não lido']) assert.ok(telas.includes(s), 'ajuda: ' + s);
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_LICITACOES.md'), 'utf8');
  for (const s of ['Leitura especialista do edital', 'Ler edital inteiro', 'Palavras-chave', 'Cobertura', 'Estratégia sugerida', 'Refazer resumo e estratégia']) assert.ok(manual.includes(s), 'manual: ' + s);
  assert.match(ler('SGO_AssistenteManuais.js'), /Leitura especialista do edital/);
  const textos = ['SGO_Licitacoes_Leitura.js', 'JS_Licitacoes_Leitura.html'].map(ler).join('\n');
  assert.doesNotMatch(textos, /antiburro/i);
  assert.doesNotMatch(textos, /somos acreditad|Metrolabs é acreditad/i);
});

// ---------------- revisão independente de 7b401dc (cada caso falhava antes da correção) ----------------
function verBloco(a, pagina, itens) {
  const c = a.ctx, arq = c.LicLeit_textos_(a.op()).arquivos[0];
  arq._ind = c.LicLeit_indice_(arq.texto);
  const b = c.LicLeit_dividir_(arq, '').find((x) => x.pIni === pagina); b.ordem = pagina;
  const v = c.LicLeit_verificarBloco_({ itens }, arq, b, { fontes: { A1: c.LicLeit_fonteBloco_(arq, b) }, pesos: c.LIC_NOTA_PADRAO, fabricantes: [] });
  return { ok: v.ok, p: v.problemas.join(' | '), itens: J(v.itens) };
}
/**
 * Decisão do coordenador (02/11/2026): o item do checklist é o trecho; a paráfrase só existe nas frases do resumo e da estratégia.
 * Estes casos conferem a camada de sentido e de número dessas frases (LicLeit_sentidoDiferente_ e LicLeit_numerosForaDaFonte_)
 * contra o trecho do item citado.
 */
const CTX_FRASE = ambiente().ctx;
function verTexto(_t, itens) {
  const it = itens[0], c = CTX_FRASE, p = [];
  const fora = c.LicLeit_numerosForaDaFonte_(it.texto, it.trecho);
  if (fora.length) p.push('no texto, ' + fora.join(', ') + ' não está no trecho citado com a mesma unidade');
  const sd = c.LicLeit_sentidoDiferente_(it.texto, it.trecho);
  if (sd) p.push(sd);
  return { ok: !p.length, p: p.join(' | ') };
}
test('revisão: número com a unidade do trecho (permuta, extenso, data invertida), sentido invertido, trecho fora do bloco, consolidação contra UM item', () => {
  const a = ambiente();
  let r = verTexto(null, [{ tema: 'PENALIDADES', texto: 'Multa de 10% por dia de atraso até 0,2 dias.', trecho: 'atraso de até 10 dias = multa de 0,2% por dia de atraso' }]);
  assert.equal(r.ok, false); assert.match(r.p, /no texto, 10%, 0,2 dia não está no trecho citado com a mesma unidade/);
  r = verTexto(null, [{ tema: 'CONSORCIO', texto: 'Consórcio é admitido.', trecho: 'Não será admitida a participação de empresas em consórcio' }]);
  assert.equal(r.ok, false); assert.match(r.p, /o trecho tem 1 negação\(ões\) \("nao"\) e o texto nenhuma/);
  r = verTexto(null, [{ tema: 'PRAZOS', texto: 'Validade da proposta de no mínimo sessenta dias.', trecho: 'O prazo de validade da proposta não será inferior 90 (noventa) dias' }]);
  assert.equal(r.ok, false); assert.match(r.p, /sessenta dia não está no trecho/);
  assert.equal(verTexto(null, [{ tema: 'PRAZOS', texto: 'Validade da proposta de no mínimo noventa dias.', trecho: 'O prazo de validade da proposta não será inferior 90 (noventa) dias' }]).ok, true, 'por extenso igual ao do trecho passa');
  r = verBloco(a, 3, [{ tema: 'CONSORCIO', rotulo: 'Consórcio', trecho: 'Não será admitida a participação de empresas em consórcio' }]);
  assert.equal(r.ok, false); assert.match(r.p, /não está NESTE bloco/);
  // data invertida (dia e mês) e hora
  const c = a.ctx;
  assert.deepEqual(J(c.LicLeit_numerosForaDaFonte_('Sessão em 11/10/2026 às 09:00.', 'A sessão pública será em 10/11/2026, às 09:00.')), ['11/10/2026']);
  assert.deepEqual(J(c.LicLeit_numerosForaDaFonte_('Sessão em 10/11/2026 às 10:00.', 'A sessão pública será em 10/11/2026, às 09:00.')), ['10:00']);
  // consolidação: cada número com a unidade numa fonte só (90 dias de I2 e 10% que não existe em nenhuma)
  const p = [];
  c.LicLeit_conferirFrase_('x', { texto: 'Prazo de execução de 90 dias com multa de 10%.', fontes: ['I1', 'I2'] }, { fontes: {}, fabricantes: [], fontesCons: { I1: { texto: 'Multa 0,2% até 10 dias', item: true }, I2: { texto: 'validade 90 dias', item: true } } }, p, true);
  assert.match(p.join(' | '), /o número 10% não está, com a mesma unidade, em nenhuma das fontes citadas/);
});

test('revisão: rede de segurança em todos os temas; item com negação perto (fora do trecho) vira pendência; o checklist mostra "Pendência"', () => {
  const texto = '[página 1]\nPRAZOS\nO prazo de entrega das peças será de 15 dias corridos. Poderá ser prorrogado a critério da fiscalização.\n9.2. Não será exigida garantia contratual.\n';
  const a = ambiente({ textos: [{ ref: 'A1', id: 21, titulo: 'Edital', nome: 'e.pdf', sha256: 'a'.repeat(64), situacao: 'EXTRAIDO', motivo: '', texto, cortado: false }] });
  const r = verBloco(a, 1, [{ tema: 'PRAZOS', rotulo: 'Entrega das peças', trecho: 'O prazo de entrega das peças será de 15 dias corridos' }]);
  assert.equal(r.ok, true, r.p);
  assert.deepEqual([r.itens[0].tipo, r.itens[0].alerta], ['PENDENCIA', 'Poderá'], 'a frase seguinte excetua; a cláusula 9.2 (outra) não conta');
  const cl = a.ctx.LicLeit_checklist_(r.itens);
  assert.equal(cl[0].tipo, 'PENDENCIA');
  const t = tela();
  const h = t.ctx.LicLeit_htmlChecklist_({ situacao: 'CONCLUIDA', checklist: J(cl) });
  assert.match(h, /<span class="lic-af-tipo PENDENCIA">Pendência<\/span>Confirmar no edital: há negação ou exceção perto do trecho \("Poderá"\)/);
});

test('revisão: versão nova com os arquivos em outra ordem e uma errata na frente: o que é aproveitado tem arquivo (SHA-256), página e linha do bloco atual', () => {
  const a = ambiente({ custoMs: 1000 });
  a.api('s_dora', 'leituraIniciar', { id: 'op1' });
  const nova = '[página 1]\nERRATA: fica alterado o item 9.9 do edital, conforme publicação no diário oficial do município.\n' + P1.replace('[página 1]', '[página 2]') + P2.replace('[página 2]', '[página 3]') + P3.replace('[página 3]', '[página 4]');
  const t = TEXTOS();
  a.srv.textos = [Object.assign({}, t[1], { ref: 'A1' }), Object.assign({}, t[0], { ref: 'A2', texto: nova, sha256: 'e'.repeat(64), id: 31 }), t[2]];
  a.srv.arquivos = Object.assign(ARQS(), { baseHash: 'f'.repeat(64) });
  a.ia.fila.push(() => ({ itens: [] }));   // a errata entra no bloco da página seguinte (texto novo): esse vai à IA; o resto é aproveitado
  const r = a.api('s_dora', 'leituraIniciar', { id: 'op1', motivo: 'edital retificado publicado' });
  assert.equal(r.ok, true, r.message);
  assert.equal(r.criada.aproveitados, 2, 'o anexo (que agora é o original) e a página 4 do edital; a página 3 repete o anexo');
  a.ctx.Licitacoes_rotinaLeitura();
  const cl = a.api('s_dora', 'leitura', { id: 'op1' }).leitura.leitura.checklist;
  const at = cl.find((e) => e.tema === 'ATESTADOS');
  assert.deepEqual(at.fontes.map((f) => [f.ref, f.arquivo.nome, f.arquivo.sha256.slice(0, 1), f.pagina, f.linha]).sort(), [['A1', 'anexo.pdf', 'b', 1, 5], ['A2', 'edital.pdf', 'e', 3, 5]]);
  const mu = cl.find((e) => e.tema === 'PENALIDADES');
  assert.deepEqual([mu.fontes[0].ref, mu.fontes[0].pagina, mu.fontes[0].linha], ['A2', 4, 2]);
});

test('revisão: arquivo cortado sem textoPedaco = PARCIAL e a busca avisa; página só com cabeçalho repetido conta como "sem texto"', () => {
  const t = TEXTOS(); t[0].texto = P1 + P2; t[0].cortado = true;
  const a = ambiente({ semPedaco: true, textos: t, custoMs: 1000 });
  a.srv.arquivos.arquivos[0].textoCaracteres = EDITAL.length;
  const r = a.api('s_dora', 'leituraIniciar', { id: 'op1' });
  assert.equal(r.leitura.leitura.situacao, 'PARCIAL');
  const pal = a.api('s_dora', 'palavrasSalvar', { escopo: 'OPORTUNIDADE', id: 'op1', palavras: ['multa'], motivo: 'teste multa' });
  assert.match(pal.leitura.palavras.busca.palavras[0].zeroTexto, /atenção: A1 Edital PE 399\/2026 não foi lido inteiro \(\d[\d.]* de \d[\d.]* caracteres\): a palavra pode estar no resto/);
  const tl = tela().ctx.LicLeit_htmlPalavras_(pal.leitura);
  assert.match(tl, /Atenção: A1 Edital PE 399\/2026 não foi lido inteiro/);
  // escaneado: 4 páginas com o mesmo cabeçalho; a 3 só tem o cabeçalho
  const cab = 'Município de São José do Rio Preto\nSecretaria Municipal de Administração\nDiretoria de Contratações Públicas\n';
  const sc = [1, 2, 3, 4].map((n) => '[página ' + n + ']\n' + cab + (n === 3 ? '' : ['', 'A contratada apresentará o atestado de capacidade técnica do serviço.', 'O pagamento será feito em trinta dias após a medição aprovada.', '', 'A garantia dos serviços prestados cobre os doze meses seguintes.'][n] + '\n')).join('');
  const b = ambiente({ custoMs: 1000, respostas: [() => ({ itens: [] }), () => ({ itens: [] }), () => ({ itens: [] }), () => ({ itens: [] })], textos: [{ ref: 'A1', id: 21, titulo: 'Edital', nome: 'e.pdf', sha256: 'a'.repeat(64), situacao: 'EXTRAIDO', motivo: '', texto: sc, cortado: false }], blocoCar: 260 });
  b.api('s_dora', 'leituraIniciar', { id: 'op1' }); b.ctx.Licitacoes_rotinaLeitura();
  const cob = JSON.parse(b.leituras()[0].COBERTURA_JSON);
  assert.match(cob.total.texto, /^Lidas 3 de 3 página\(s\) com texto .* 1 página\(s\) sem texto \(provável imagem; ler à mão\): A1 1 página\(s\)\./);
  assert.equal(b.blocos().filter((x) => x.SITUACAO === 'VAZIO').length, 1, 'a página só com cabeçalho não vai à IA');
});

test('revisão: falha passageira ao ler os textos deixa os blocos na fila; sem a chave a rotina não se reagenda; o fim cabe no tempo da execução', () => {
  const a = ambiente({ custoMs: 30000 });
  a.api('s_dora', 'leituraIniciar', { id: 'op1' });
  const orig = a.ctx.SGO_LICITACOES.textos;
  a.ctx.SGO_LICITACOES.textos = () => { throw new Error('ECONNRESET'); };
  const x = a.ctx.Licitacoes_rotinaLeitura();
  assert.match(x.erroTexto, /ECONNRESET/);
  assert.equal(a.leituras()[0].SITUACAO, 'EM_ANDAMENTO');
  assert.deepEqual(a.blocos().map((b) => b.SITUACAO), ['LIDO', 'LIDO', 'PENDENTE', 'REPETIDO'], 'nada vira "não lido" por falha passageira');
  assert.equal(a.gatilhos.length, 1, 'tenta de novo em 1 minuto');
  a.ctx.SGO_LICITACOES.textos = orig;
  // sem a chave: a rotina não lê nem se reagenda
  delete a.props.GEMINI_API_KEY;
  for (let i = 0; i < 3; i++) { const r = a.ctx.Licitacoes_rotinaLeitura(); assert.equal(r.semChave, true); }
  assert.equal(a.gatilhos.length, 0);
  assert.equal(a.ctx.LicLeit_agendar_(), 'sem a chave da IA: não agendada');
  // a chave volta: a tela aberta reagenda e a rotina termina; a consolidação usa o prazo do INÍCIO da execução
  a.props.GEMINI_API_KEY = 'chave-de-teste';
  a.api('s_dora', 'leitura', { id: 'op1' });
  assert.equal(a.gatilhos.length, 1);
  const inicio = relogio.agora;
  a.lidas.LIC_LEITURA_BLOCOS = 0;
  a.ctx.Licitacoes_rotinaLeitura();
  assert.equal(a.lidas.LIC_LEITURA_BLOCOS, 1, 'a fila é lida uma vez na rodada');
  assert.equal(a.leituras()[0].SITUACAO, 'LER_A_MAO', 'a A3 é escaneada: páginas para ler à mão');
  assert.equal(a.ia.opcoes[a.ia.opcoes.length - 1].prazoAte, inicio + 140000, 'a consolidação não ganha 140 s próprios');
  // a linha da fila é pequena: itens e resposta da IA ficam em LIC_LEITURA_RESULTADOS
  for (const b of a.tabelas.LIC_LEITURA_BLOCOS) assert.ok(JSON.stringify(b).length < 3000, 'linha da fila pequena');
  assert.ok((a.tabelas.LIC_LEITURA_RESULTADOS || []).length >= 3);
});

test('revisão: hífen e espaço nos dois sentidos; palavra nova muda a base (Refazer procura a palavra); substituída fica substituída; "Ler de novo" zera as tentativas; tempo gasto fica gravado', () => {
  const texto = '[página 1]\nCalibração do termo higrômetro digital e do termo-higrômetro de parede, com certificado.\n';
  const a = ambiente({ custoMs: 1000, textos: [{ ref: 'A1', id: 21, titulo: 'Edital', nome: 'e.pdf', sha256: 'a'.repeat(64), situacao: 'EXTRAIDO', motivo: '', texto, cortado: false }], respostas: [() => ({ itens: [] }), () => ({ itens: [] })] });
  const b = a.ctx.LicLeit_buscar_(a.ctx.LicLeit_textos_(a.op()).arquivos, [{ palavra: 'termo-higrômetro', origem: 'GERAL' }, { palavra: 'termo higrômetro', origem: 'GERAL' }]);
  assert.deepEqual(J(b.palavras.map((x) => x.total)), [2, 2]);
  a.api('s_dora', 'leituraIniciar', { id: 'op1' });
  a.ctx.Licitacoes_rotinaLeitura();
  a.api('s_dora', 'palavrasSalvar', { escopo: 'OPORTUNIDADE', id: 'op1', palavras: ['certificado'], motivo: 'palavra nova' });
  const t = a.api('s_dora', 'leitura', { id: 'op1' }).leitura;
  assert.equal(t.leitura.desatualizada, true, 'palavra nova: a leitura fica desatualizada');
  const n = a.ia.prompts.length;
  a.api('s_dora', 'leituraIniciar', { id: 'op1', motivo: 'procurar a palavra nova' });
  assert.match(a.ia.prompts[n], /Palavras-chave da Diretoria[^\n]*certificado/, 'o bloco vai de novo à IA, com a palavra nova');
  // a leitura antiga, consolidada depois de substituída, continua substituída
  const velha = a.leituras()[0];
  assert.equal(velha.SITUACAO, 'CONCLUIDA', 'a antiga já estava concluída: continua concluída');
  const c0 = ambiente({ custoMs: 30000 });
  c0.api('s_dora', 'leituraIniciar', { id: 'op1' });
  c0.api('s_dora', 'leituraIniciar', { id: 'op1', refazer: true, motivo: 'substituir a leitura em andamento' });
  const sub = c0.leituras()[0];
  assert.equal(sub.SITUACAO, 'SUBSTITUIDA');
  c0.ctx.LicLeit_consolidar_(c0.ctx.SGO_DATA.getById('LIC_LEITURAS', sub.ID), c0.ctx.LicLeit_blocosDe_(sub.ID), c0.op(), null, '');
  assert.equal(c0.leituras()[0].SITUACAO, 'SUBSTITUIDA');
  // "Ler de novo": tentativas zeradas (a primeira falha da IA volta para a fila em vez de virar "não lido")
  const lixo = () => ({ itens: [{ tema: 'GARANTIA', texto: 'x y z', trecho: 'nada disso existe no edital de verdade' }] });
  const c = ambiente({ custoMs: 1000, respostas: [null, null, lixo, lixo, lixo] });
  c.api('s_dora', 'leituraIniciar', { id: 'op1' });
  assert.equal(bloco(c, 3).SITUACAO, 'FALHOU'); assert.equal(bloco(c, 3).TENTATIVAS, 3);
  c.ia.fila.push(new Error('Serviço de IA indisponível (HTTP 503)'));
  c.api('s_dora', 'leituraTentarDeNovo', { id: 'op1' });
  assert.equal(bloco(c, 3).SITUACAO, 'PENDENTE'); assert.equal(bloco(c, 3).TENTATIVAS, 1);
  // tempo acabou entre a resposta recusada e a nova tentativa: a tentativa gasta e os problemas ficam gravados
  const d = ambiente({ custoMs: 50000, respostas: [lixo] });
  d.api('s_dora', 'leituraIniciar', { id: 'op1' });
  assert.equal(bloco(d, 1).SITUACAO, 'PENDENTE'); assert.equal(bloco(d, 1).TENTATIVAS, 1);
  assert.match(bloco(d, 1).PROBLEMAS_JSON, /não está em A1/);
  // tela: o resumo não se chama "Fato"
  const h = tela().ctx.LicLeit_htmlResumoEstrategia_({ iaDisponivel: true, prazos: [], leitura: { situacao: 'CONCLUIDA', consolidacao: { situacao: 'OK' }, resumo: [{ texto: 'Frase.', fontes: ['I1'] }], estrategia: {} } });
  assert.match(h, /Resumo \(conferido número e data\)<\/span>Frase\./);
  assert.doesNotMatch(h, />Fato</);
});

// ---------------- reconferência de ed92c50 (probe4 e probe5) ----------------
const T5 = '[página 1]\n5.1. O prazo de execução será de 10 dias corridos, contados da ordem de serviço.\n5.2. O valor unitário de referência é R$ 10,00 por item calibrado.\n5.3. A garantia contratual será de 10% do valor do contrato.\n5.4. A visita técnica é obrigatória para todas as licitantes interessadas.\n5.5. Não será admitida a participação de empresas em consórcio nesta licitação.\n';

test('reconferência: exceção, negação e limite nos dois sentidos (inventados no texto são recusados; "apenas" e "exceto" não cobrem um "não")', () => {
  const casos = [
    ['VISITA_TECNICA', 'Visita técnica obrigatória, salvo declaração formal de conhecimento das condições.', 'A visita técnica é obrigatória para todas as licitantes interessadas', /o texto tem exceção \("salvo"\) que o trecho não tem/],
    ['VISITA_TECNICA', 'Visita técnica não é obrigatória.', 'A visita técnica é obrigatória para todas as licitantes interessadas', /o texto tem negação \("nao"\) que o trecho não tem/],
    ['SUBCONTRATACAO', 'Consórcio admitido apenas entre empresas do mesmo grupo.', 'Não será admitida a participação de empresas em consórcio', /o trecho tem 1 negação\(ões\) \("nao"\) e o texto nenhuma/],
    ['SUBCONTRATACAO', 'Consórcio admitido, exceto com empresas estrangeiras.', 'Não será admitida a participação de empresas em consórcio', /o trecho tem 1 negação\(ões\) \("nao"\) e o texto nenhuma/],
    ['SUBCONTRATACAO', 'Consórcio não é admitido, apenas empresa isolada.', 'Não será admitida a participação de empresas em consórcio', /o texto tem limite de exclusividade \(apenas, somente\) que o trecho não tem/]
  ];
  for (const [tema, texto, trecho, re] of casos) { const r = verTexto(T5, [{ tema, texto, trecho }]); assert.equal(r.ok, false, texto); assert.match(r.p, re, texto); }
  assert.equal(verTexto(T5, [{ tema: 'SUBCONTRATACAO', texto: 'Consórcio não é admitido.', trecho: 'Não será admitida a participação de empresas em consórcio' }]).ok, true);
  assert.equal(verTexto(T5, [{ tema: 'VISITA_TECNICA', texto: 'Visita técnica obrigatória para todas as licitantes.', trecho: 'A visita técnica é obrigatória para todas as licitantes interessadas' }]).ok, true);
});

test('reconferência: unidade com o qualificador (úteis × corridos) e "mil"/"milhão" multiplicam o valor', () => {
  let r = verTexto(T5, [{ tema: 'PRAZOS', texto: 'Execução em 10 dias úteis.', trecho: 'O prazo de execução será de 10 dias corridos' }]);
  assert.equal(r.ok, false); assert.match(r.p, /10 dia util não está no trecho/);
  assert.equal(verTexto(T5, [{ tema: 'PRAZOS', texto: 'Execução em 10 dias corridos.', trecho: 'O prazo de execução será de 10 dias corridos' }]).ok, true);
  assert.equal(verTexto(T5, [{ tema: 'PRAZOS', texto: 'Execução em 10 dias.', trecho: 'O prazo de execução será de 10 dias corridos' }]).ok, true, 'sem qualificador no texto: aceita o do trecho');
  r = verTexto(T5, [{ tema: 'PAGAMENTO', texto: 'Valor de referência de R$ 10 mil por item calibrado.', trecho: 'O valor unitário de referência é R$ 10,00 por item calibrado' }]);
  assert.equal(r.ok, false); assert.match(r.p, /R\$ 10 mil não está no trecho/);
  const c = ambiente().ctx;
  assert.deepEqual(J(c.LicLeit_numerosForaDaFonte_('Valor estimado de R$ 2 milhões.', 'valor estimado de R$ 2.000.000,00')), []);
  assert.deepEqual(J(c.LicLeit_numerosForaDaFonte_('Garantia de dez mil reais.', 'garantia de R$ 10.000,00')), []);
});

test('reconferência: tabela de itens com linhas iguais é texto (só as linhas de cima e de baixo repetidas são cabeçalho); página e arquivo sem texto = "Concluída com páginas para ler à mão"', () => {
  let tab = ''; for (let p = 1; p <= 4; p++) { tab += '[página ' + p + ']\n'; for (let i = 0; i < 8; i++) tab += 'Calibração de termômetro digital com certificado RBC - ' + (p * 10 + i) + ' unidades\n'; }
  const a = ambiente();
  const arq = { ref: 'A1', id: 1, titulo: 'Itens', nome: 'i.pdf', sha256: 'a'.repeat(64), texto: tab };
  arq._ind = a.ctx.LicLeit_indice_(tab);
  assert.ok(arq._ind.paginas.every((p) => p.util >= 10), 'a tabela tem texto útil');
  assert.ok(a.ctx.LicLeit_dividir_(arq, '').every((b) => !b.vazio), 'nenhum bloco da tabela é vazio');
  // o edital do teste tem a A3 escaneada: a leitura inteira lida fica "com páginas para ler à mão", não "Concluída"
  const b = ambiente({ custoMs: 1000 });
  b.api('s_dora', 'leituraIniciar', { id: 'op1' }); b.ctx.Licitacoes_rotinaLeitura();
  const le = b.api('s_dora', 'leitura', { id: 'op1' }).leitura.leitura;
  assert.deepEqual([le.situacao, le.situacaoNome], ['LER_A_MAO', 'Concluída com páginas para ler à mão']);
  assert.equal(b.hist('LEITURA_CONCLUIDA_LER_A_MAO').length, 1);
});

// ---------------- reconferência de 6700f26 (probe6) ----------------
const T6 = '[página 1]\n5.1. O prazo de entrega não será inferior a 10 dias e não será admitida a subcontratação do serviço.\n5.2. O atendimento corretivo ocorrerá em até 10 dias contados do chamado técnico.\n5.3. O licitante deverá ter no mínimo 2 técnicos certificados em seu quadro permanente.\n';
test('reconferência 2: "não será inferior" só retira a própria negação; a direção do limite (máximo, mínimo, exclusividade) é a mesma nos dois lados para cada número', () => {
  const recusa = [
    ['PRAZOS', 'Entrega em no máximo 10 dias.', 'O prazo de entrega não será inferior a 10 dias', /limite de máximo que o trecho não tem/],
    ['PRAZOS', 'Entrega em no mínimo 10 dias, com subcontratação do serviço permitida.', 'O prazo de entrega não será inferior a 10 dias e não será admitida a subcontratação do serviço', /o trecho tem 1 negação\(ões\) \("nao"\) e o texto nenhuma/],
    ['PRAZOS', 'Atendimento corretivo em no mínimo 10 dias do chamado.', 'O atendimento corretivo ocorrerá em até 10 dias contados do chamado técnico', /limite de mínimo que o trecho não tem/],
    ['EQUIPE_RT', 'No máximo 2 técnicos certificados no quadro.', 'O licitante deverá ter no mínimo 2 técnicos certificados em seu quadro permanente', /limite de máximo que o trecho não tem/],
    ['EQUIPE_RT', '2 técnicos certificados no quadro, no mínimo um engenheiro.', 'O licitante deverá ter no mínimo 2 técnicos certificados em seu quadro permanente', /o número 2 tem no texto nenhum limite e no trecho limite de mínimo/]
  ];
  for (const [tema, texto, trecho, re] of recusa) { const r = verTexto(T6, [{ tema, texto, trecho }]); assert.equal(r.ok, false, texto); assert.match(r.p, re, texto); }
  const aceita = [
    ['PRAZOS', 'Entrega em no mínimo 10 dias; subcontratação do serviço não admitida.', 'O prazo de entrega não será inferior a 10 dias e não será admitida a subcontratação do serviço'],
    ['PRAZOS', 'Atendimento corretivo em no máximo 10 dias do chamado.', 'O atendimento corretivo ocorrerá em até 10 dias contados do chamado técnico'],
    ['EQUIPE_RT', 'Pelo menos 2 técnicos certificados no quadro permanente.', 'O licitante deverá ter no mínimo 2 técnicos certificados em seu quadro permanente']
  ];
  for (const [tema, texto, trecho] of aceita) { const r = verTexto(T6, [{ tema, texto, trecho }]); assert.equal(r.ok, true, texto + ' | ' + r.p); }
});

test('reconferência 2: página de tabela cujo cabeçalho de coluna foi descontado conta como lida quando o bloco foi à IA', () => {
  let tab = ''; for (let p = 1; p <= 4; p++) { tab += '[página ' + p + ']\nANEXO I - RELAÇÃO DE EQUIPAMENTOS\nItem Equipamento Qtd Exigência: calibração com certificado RBC obrigatório\nSecretaria Municipal de Saúde\n'; for (let i = 0; i < 6; i++) tab += (p * 10 + i) + ' Autoclave ' + (i + 1) + '\n'; }
  const a = ambiente({ custoMs: 1000, respostas: [() => ({ itens: [] }), () => ({ itens: [] })], textos: [{ ref: 'A1', id: 21, titulo: 'Anexo I', nome: 'a.pdf', sha256: 'a'.repeat(64), situacao: 'EXTRAIDO', motivo: '', texto: tab, cortado: false }] });
  a.api('s_dora', 'leituraIniciar', { id: 'op1' }); a.ctx.Licitacoes_rotinaLeitura();
  const le = a.leituras()[0], cob = JSON.parse(le.COBERTURA_JSON);
  assert.equal(cob.total.texto.indexOf('sem texto'), -1, cob.total.texto);
  assert.match(cob.total.texto, /^Lidas 4 de 4 página\(s\) com texto/);
  assert.equal(le.SITUACAO, 'CONCLUIDA');
});

// ---------------- reconferência de 7615103 (probe7 e probe8): o item é o trecho; a frase da IA tem a camada de sentido ----------------
const T7 = '[página 1]\n6.1. Não é vedada a subcontratação parcial dos serviços de calibração pela contratada.\n6.2. Não será exigido atestado de capacidade técnica das licitantes nesta contratação.\n6.3. A multa será de 10% e o prazo de entrega de até 10 dias contados da ordem.\n6.4. As propostas serão recebidas até as 23h59 do dia 10/11/2026 no portal eletrônico.\n6.5. As propostas serão recebidas até 10/11/2026 no portal eletrônico indicado.\n7.1. Não será exigida visita técnica prévia das licitantes interessadas neste certame.\n';
test('decisão do coordenador: o item do checklist é o TRECHO; paráfrase invertida da IA não vira exigência (não é guardada nem mostrada)', () => {
  const a = ambiente({ textos: [{ ref: 'A1', id: 21, titulo: 'Edital', nome: 'e.pdf', sha256: 'a'.repeat(64), situacao: 'EXTRAIDO', motivo: '', texto: T7, cortado: false }], blocoCar: 5000 });
  const invertidos = [
    { tema: 'SUBCONTRATACAO', rotulo: 'Subcontratação parcial', texto: 'É vedada a subcontratação parcial; não há outra regra.', trecho: 'Não é vedada a subcontratação parcial dos serviços de calibração' },
    { tema: 'VISITA_TECNICA', rotulo: 'Visita técnica prévia', texto: 'Visita técnica prévia exigida, sem ressalvas.', trecho: 'Não será exigida visita técnica prévia das licitantes interessadas' },
    { tema: 'PENALIDADES', rotulo: 'Multa e prazo de entrega', texto: 'Multa de até 10% e prazo de 10 dias.', trecho: 'A multa será de 10% e o prazo de entrega de até 10 dias contados da ordem' },
    { tema: 'OUTRO', rotulo: 'Recebimento das propostas', texto: 'Propostas recebidas a partir de 10/11/2026.', trecho: 'As propostas serão recebidas até as 23h59 do dia 10/11/2026 no portal eletrônico' }
  ];
  const r = verBloco(a, 1, invertidos);
  assert.equal(r.ok, true, r.p);
  assert.deepEqual(r.itens.map((i) => [i.trecho.slice(0, 22), i.texto]), [['Não é vedada a subcont', undefined], ['Não será exigida visit', undefined], ['A multa será de 10% e ', undefined], ['As propostas serão rec', undefined]]);
  const cl = a.ctx.LicLeit_checklist_(r.itens), h = tela().ctx.LicLeit_htmlChecklist_({ situacao: 'CONCLUIDA', checklist: J(cl) });
  for (const x of invertidos) { assert.ok(h.includes(x.trecho), 'o trecho do edital aparece'); assert.ok(!h.includes(x.texto), 'a paráfrase não aparece: ' + x.texto); assert.ok(!h.includes(x.rotulo), 'o rótulo não aparece: ' + x.rotulo); }
});

test('decisão do coordenador: no resumo e na estratégia, frase com o sentido trocado (negação dupla ou trocada, "até" migrando, "a partir de" × "até") é retirada e listada', () => {
  const casos = [
    ['É vedada a subcontratação parcial; não há outra regra.', 'Não é vedada a subcontratação parcial dos serviços de calibração', /sentido contrário ao do trecho/],
    ['Visita técnica prévia exigida, sem ressalvas.', 'Não será exigida visita técnica prévia das licitantes interessadas', /sentido contrário ao do trecho/],
    ['Multa de até 10% e prazo de entrega de 10 dias.', 'A multa será de 10% e o prazo de entrega de até 10 dias contados da ordem', /o número 10 tem no texto limite de máximo e no trecho nenhum limite/],
    ['Propostas recebidas até as 23h59 do dia 10/11/2026.', 'As propostas serão recebidas a partir de 10/11/2026 no portal eletrônico', /limite de máximo que o trecho não tem/],
    ['Propostas recebidas a partir de 10/11/2026 no portal.', 'As propostas serão recebidas até 10/11/2026 no portal eletrônico indicado', /limite de mínimo que o trecho não tem/]
  ];
  for (const [frase, trecho, re] of casos) { const sd = CTX_FRASE.LicLeit_sentidoDiferente_(frase, trecho); assert.match(sd, re, frase); }
  assert.equal(CTX_FRASE.LicLeit_sentidoDiferente_('A subcontratação parcial não é vedada.', 'Não é vedada a subcontratação parcial dos serviços de calibração'), '');
  // na consolidação: a frase reprovada sai da tela e aparece em "Frases retiradas pelo verificador"; o resto vale
  const cons = (ids) => ({ resumo: [{ texto: 'Pregão para manutenção de autoclaves com fornecimento de peças.', fontes: [ids.OUTRO, 'CAMPO:objeto'] }, { texto: 'Consórcio é admitido.', fontes: [ids.CONSORCIO] }, { texto: 'Exige atestado de 50% do quantitativo dos equipamentos.', fontes: [ids.ATESTADOS] }],
    estrategia: { primeiro: [{ texto: 'Separar os atestados de autoclave.', fontes: [ids.ATESTADOS] }], riscos: [{ texto: 'Multa de 0,2% por dia de atraso.', fontes: [ids.PENALIDADES] }], documentos: [{ texto: 'Certificados rastreáveis dos padrões.', fontes: [ids.RBC_INMETRO] }], perguntas: [] } });
  const b = ambiente({ custoMs: 1000, consolidacao: cons });
  b.api('s_dora', 'leituraIniciar', { id: 'op1' });
  const le = b.leituras()[0];
  assert.equal(le.CONSOLIDACAO_SITUACAO, 'OK');
  const t = b.api('s_dora', 'leitura', { id: 'op1' }).leitura;
  assert.deepEqual(t.leitura.resumo.map((x) => x.texto), ['Pregão para manutenção de autoclaves com fornecimento de peças.', 'Exige atestado de 50% do quantitativo dos equipamentos.']);
  assert.equal(t.leitura.estrategia.retiradas.length, 1);
  assert.match(t.leitura.estrategia.retiradas[0].motivo, /o trecho tem 1 negação/);
  const h = tela().ctx.LicLeit_htmlResumoEstrategia_(t);
  assert.match(h, /Frases retiradas pelo verificador \(1\)[\s\S]*<s>Consórcio é admitido\.<\/s>/);
  assert.match(h, /Trechos citados \(I1\)<\/summary>[\s\S]*quantitativo compatível em 50%/);
  // frase sem item citado: recusada (toda frase cita item)
  const p = [];
  CTX_FRASE.LicLeit_conferirFrase_('x', { texto: 'Pregão eletrônico.', fontes: ['CAMPO:objeto'] }, { fontes: {}, fabricantes: [], fontesCons: { 'CAMPO:objeto': { texto: 'Pregão eletrônico' } } }, p, false);
  assert.match(p.join(' | '), /sem item citado/);
});

// ---------------- reconferência de 88c564d (probe9 e probe10) ----------------
test('reconferência 4: sem rótulo; a frase inteira do edital é a prova (a exceção depois da vírgula aparece e vira pendência); tema conferido por palavras mínimas', () => {
  const T9 = '[página 1]\n8.1. A vistoria técnica é obrigatória, podendo ser substituída por declaração formal de pleno conhecimento das condições do local.\n8.2. Não será admitida a participação de empresas em consórcio nesta licitação.\n8.3. O pagamento será efetuado em até 30 dias após o aceite da nota fiscal.\n';
  const a = ambiente({ textos: [{ ref: 'A1', id: 21, titulo: 'Edital', nome: 'e.pdf', sha256: 'a'.repeat(64), situacao: 'EXTRAIDO', motivo: '', texto: T9, cortado: false }], blocoCar: 5000 });
  const r = verBloco(a, 1, [
    { tema: 'VISITA_TECNICA', rotulo: 'Visita técnica obrigatória', trecho: 'A vistoria técnica é obrigatória' },
    { tema: 'CONSORCIO', rotulo: 'Consórcio permitido e aceito', trecho: 'Não será admitida a participação de empresas em consórcio' },
    { tema: 'GARANTIA', trecho: 'O pagamento será efetuado em até 30 dias após o aceite da nota fiscal' }
  ]);
  assert.equal(r.ok, true, r.p);
  const [vis, con, pag] = r.itens;
  assert.equal(vis.trecho, 'A vistoria técnica é obrigatória, podendo ser substituída por declaração formal de pleno conhecimento das condições do local.', 'a frase inteira, com a exceção (a numeração 8.1. fica de fora)');
  assert.equal(vis.trecho.slice(vis.citado[0], vis.citado[1]), 'A vistoria técnica é obrigatória');
  assert.deepEqual([vis.tipo, vis.alerta], ['PENDENCIA', 'podendo']);
  assert.equal(con.trecho, 'Não será admitida a participação de empresas em consórcio nesta licitação.');
  assert.deepEqual([vis.titulo, con.titulo], [undefined, undefined], 'o rótulo da IA não é guardado');
  assert.deepEqual([pag.tema, pag.temaIA], ['A_CONFIRMAR', 'GARANTIA'], 'a frase não fala de garantia: tema a confirmar');
  const cl = a.ctx.LicLeit_checklist_(r.itens), h = tela().ctx.LicLeit_htmlChecklist_({ situacao: 'CONCLUIDA', checklist: J(cl) });
  assert.doesNotMatch(h, /Visita técnica obrigatória|Consórcio permitido e aceito/);
  assert.match(h, /"<mark>A vistoria técnica é obrigatória<\/mark>, podendo ser substituída por declaração formal/);
  assert.match(h, /<h4 class="lic-leit-tema">Tema a confirmar<\/h4>[\s\S]*\(a IA indicou "GARANTIA", mas a frase não fala desse tema: confira\)/);
  // a IA do resumo recebe só o tema e o trecho (frase inteira), sem rótulo
  const fontes = a.ctx.LicLeit_fontesConsolidacao_(a.op(), cl, [], 'cobertura');
  const prompt = a.ctx.LicLeit_promptConsolidar_(a.op(), cl, fontes, [], 'cobertura', 'FONTE-x');
  assert.doesNotMatch(prompt, /Visita técnica obrigatória|Consórcio permitido/);
  assert.match(prompt, /\[VISITA_TECNICA\] PENDÊNCIA \(confirmar no edital: negação ou exceção perto do trecho, "podendo"\): trecho do edital: "A vistoria técnica é obrigatória, podendo/);
  // a frase longa demais é cortada em 600 caracteres, com "…", sem cortar o pedaço citado
  const longa = '[página 1]\n' + 'Cláusula de teste com muitas palavras repetidas para alongar a frase do edital com outras palavras '.repeat(12) + 'e o atestado de capacidade técnica será exigido de todas as licitantes ' + 'com mais palavras repetidas no final da mesma frase longa do edital '.repeat(10) + 'acabando aqui.\n';
  const b = ambiente({ textos: [{ ref: 'A1', id: 21, titulo: 'Edital', nome: 'e.pdf', sha256: 'a'.repeat(64), situacao: 'EXTRAIDO', motivo: '', texto: longa, cortado: false }], blocoCar: 5000 });
  const rl = verBloco(b, 1, [{ tema: 'ATESTADOS', trecho: 'e o atestado de capacidade técnica será exigido de todas as licitantes' }]);
  assert.equal(rl.ok, true, rl.p);
  const it = rl.itens[0];
  assert.ok(it.trecho.length <= 602 && it.cortada && /^…/.test(it.trecho) && /…$/.test(it.trecho), it.trecho.length + ' ' + it.cortada);
  assert.equal(it.trecho.slice(it.citado[0], it.citado[1]), 'e o atestado de capacidade técnica será exigido de todas as licitantes');
});

// ---------------- reconferência de 6b92b2a (probe11) ----------------
test('reconferência 5: exceção em subitem filho da cláusula vira pendência; frase cortada pelo limite = pendência "frase longa"; palavras mínimas do tema específicas', () => {
  const T11 = '[página 1]\n8.3. A visita prévia é obrigatória para as licitantes deste certame.\n8.3.1. Fica dispensada da visita a empresa que apresentar declaração formal.\n8.4. A visita técnica será agendada pelo telefone da unidade.\n9. A garantia contratual será de 5% do valor do contrato.\n';
  const a = ambiente({ textos: [{ ref: 'A1', id: 21, titulo: 'Edital', nome: 'e.pdf', sha256: 'a'.repeat(64), situacao: 'EXTRAIDO', motivo: '', texto: T11, cortado: false }], blocoCar: 5000 });
  let r = verBloco(a, 1, [{ tema: 'VISITA_TECNICA', trecho: 'A visita prévia é obrigatória para as licitantes deste certame' }, { tema: 'VISITA_TECNICA', trecho: 'A visita técnica será agendada pelo telefone da unidade' }]);
  assert.equal(r.ok, true, r.p);
  assert.deepEqual([r.itens[0].tipo, r.itens[0].alerta], ['PENDENCIA', 'dispensada'], 'o subitem 8.3.1 excetua o 8.3');
  assert.deepEqual([r.itens[1].tipo, r.itens[1].alerta], ['EXIGENCIA', ''], 'a cláusula irmã 8.4 não herda a exceção do 8.3.1');
  assert.equal(a.ctx.LicLeit_fimDaClausula_(T11, T11.indexOf('A visita prévia'), T11.indexOf('8.3.1.') - 1), T11.indexOf('\n8.4.'));
  // frase longa cortada na tela: pendência, e a rede olha até o fim real da frase
  const longa = '[página 1]\n9.1. A visita técnica ao local de execução dos serviços é obrigatória para todas as licitantes interessadas em participar do certame' + ', devendo ser realizada em dia útil e no horário de expediente da unidade' .repeat(9) + ', ficando dispensadas as empresas que já prestaram serviço à Secretaria.\n';
  const b = ambiente({ textos: [{ ref: 'A1', id: 21, titulo: 'Edital', nome: 'e.pdf', sha256: 'a'.repeat(64), situacao: 'EXTRAIDO', motivo: '', texto: longa, cortado: false }], blocoCar: 5000 });
  r = verBloco(b, 1, [{ tema: 'VISITA_TECNICA', trecho: 'A visita técnica ao local de execução dos serviços é obrigatória para todas as licitantes interessadas em participar do certame' }]);
  assert.equal(r.ok, true, r.p);
  assert.deepEqual([r.itens[0].tipo, r.itens[0].longa, r.itens[0].alerta], ['PENDENCIA', true, 'dispensadas']);
  const h = tela().ctx.LicLeit_htmlChecklist_({ situacao: 'CONCLUIDA', checklist: J(b.ctx.LicLeit_checklist_(r.itens)) });
  assert.match(h, /Frase longa: a tela mostra até 600 caracteres; leia o restante no edital\./);
  // palavras mínimas: "técnica", "calibração" e "registro" soltos não confirmam o tema
  const T3 = '[página 1]\n8.4. A multa por atraso na assistência técnica será de 2% do valor mensal.\n8.5. O atestado deverá comprovar serviços de calibração de autoclaves.\n8.6. A contratada manterá registro dos chamados técnicos no sistema da unidade.\n8.7. A licitante comprovará qualificação técnica por certidão de acervo técnico.\n';
  const c = ambiente({ textos: [{ ref: 'A1', id: 21, titulo: 'Edital', nome: 'e.pdf', sha256: 'a'.repeat(64), situacao: 'EXTRAIDO', motivo: '', texto: T3, cortado: false }], blocoCar: 5000 });
  r = verBloco(c, 1, [{ tema: 'QUALIFICACAO_TECNICA', trecho: 'A multa por atraso na assistência técnica será de 2% do valor mensal' }, { tema: 'RBC_INMETRO', trecho: 'O atestado deverá comprovar serviços de calibração de autoclaves' },
    { tema: 'QUALIFICACAO_TECNICA', trecho: 'A contratada manterá registro dos chamados técnicos no sistema da unidade' }, { tema: 'QUALIFICACAO_TECNICA', trecho: 'A licitante comprovará qualificação técnica por certidão de acervo técnico' }]);
  assert.equal(r.ok, true, r.p);
  assert.deepEqual(r.itens.map((i) => i.tema), ['A_CONFIRMAR', 'A_CONFIRMAR', 'A_CONFIRMAR', 'QUALIFICACAO_TECNICA']);
});

// ---------------- reconferência de efceb90 (probe12) ----------------
function verArquivo(texto, itens, outros) {
  const a = ambiente({ textos: [{ ref: 'A1', id: 21, titulo: 'Edital', nome: 'e.pdf', sha256: 'a'.repeat(64), situacao: 'EXTRAIDO', motivo: '', texto, cortado: false }].concat(outros || []), blocoCar: 18000 });
  const c = a.ctx, todos = c.LicLeit_textos_(a.op()).arquivos.filter((x) => x.texto), arq = todos[0];
  arq._ind = c.LicLeit_indice_(arq.texto);
  const b = c.LicLeit_dividir_(arq, '')[0]; b.ordem = 1;
  const v = c.LicLeit_verificarBloco_({ itens }, arq, b, { fontes: { A1: c.LicLeit_fonteBloco_(arq, b) }, pesos: c.LIC_NOTA_PADRAO, fabricantes: [], arquivos: todos });
  return { ok: v.ok, p: v.problemas.join(' | '), itens: J(v.itens), a };
}
test('reconferência 6: negação no cabeçalho da cláusula-mãe e errata longe da cláusula (no mesmo arquivo ou em outro) fazem do item uma pendência, com a frase', () => {
  const H = '[página 1]\n8.2. Não serão exigidos, nesta contratação, os seguintes documentos de habilitação técnica:\n8.2.1. Certidão de registro da empresa no CREA da sede da licitante.\n8.2.2. Comprovação de responsável técnico com vínculo permanente com a licitante.\n9. DO PAGAMENTO\n9.1. O pagamento será feito em 30 dias após a medição.\n';
  let r = verArquivo(H, [{ tema: 'EQUIPE_RT', trecho: 'Comprovação de responsável técnico com vínculo permanente com a licitante' }, { tema: 'PAGAMENTO', trecho: 'O pagamento será feito em 30 dias após a medição' }]);
  assert.equal(r.ok, true, r.p);
  assert.deepEqual([r.itens[0].tipo, r.itens[0].alerta], ['PENDENCIA', 'nao']);
  assert.equal(r.itens[0].origemAlerta, 'o cabeçalho da cláusula 8.2 diz: "Não serão exigidos, nesta contratação, os seguintes documentos de habilitação técnica:"');
  assert.deepEqual([r.itens[1].tipo, r.itens[1].origemAlerta], ['EXIGENCIA', ''], 'a cláusula 9.1 não está sob o 8.2');
  // alínea sob cláusula que dispensa
  const A = '[página 1]\n8.5. Ficam dispensados os documentos abaixo, para as microempresas.\na) comprovação de responsável técnico com vínculo permanente;\n8.6. A garantia será de 5% do valor do contrato.\n';
  r = verArquivo(A, [{ tema: 'EQUIPE_RT', trecho: 'comprovação de responsável técnico com vínculo permanente' }]);
  assert.equal(r.ok, true, r.p);
  assert.match(r.itens[0].origemAlerta, /^o cabeçalho da cláusula 8\.5 diz: "Ficam dispensados/);
  // errata longe, no mesmo arquivo
  const E = '[página 1]\n8.3. A visita prévia é obrigatória para as licitantes deste certame.\n8.4. Outras disposições gerais constam do termo de referência anexo.\n' + '9. Texto de enchimento das cláusulas seguintes do edital, para afastar.\n'.repeat(60) + '15. ERRATA: fica revogado o subitem 8.3 deste edital, por decisão do pregoeiro.\n';
  r = verArquivo(E, [{ tema: 'VISITA_TECNICA', trecho: 'A visita prévia é obrigatória para as licitantes deste certame' }, { tema: 'OUTRO', trecho: 'Outras disposições gerais constam do termo de referência anexo' }]);
  assert.equal(r.ok, true, r.p);
  assert.equal(r.itens[0].tipo, 'PENDENCIA');
  assert.match(r.itens[0].origemAlerta, /^errata sobre a cláusula 8\.3 \(A1, página 1\): ".*fica revogado o subitem 8\.3 deste edital/);
  assert.equal(r.itens[1].tipo, 'EXIGENCIA', 'o 8.4 não foi revogado');
  // errata em OUTRO arquivo da oportunidade
  const T = '[página 1]\n8.3. A visita prévia é obrigatória para as licitantes deste certame.\n8.4. Outras disposições gerais constam do termo de referência anexo.\n';
  r = verArquivo(T, [{ tema: 'VISITA_TECNICA', trecho: 'A visita prévia é obrigatória para as licitantes deste certame' }], [{ ref: 'A2', id: 22, titulo: 'Errata 1', nome: 'errata.pdf', sha256: 'f'.repeat(64), situacao: 'EXTRAIDO', motivo: '', texto: '[página 1]\nO item 8.3 do edital passa a ter a seguinte nova redação: a visita é facultativa.\n', cortado: false }]);
  assert.equal(r.ok, true, r.p);
  assert.match(r.itens[0].origemAlerta, /^errata sobre a cláusula 8\.3 \(A2, página 1\)/);
  // a tela mostra de onde veio o alerta
  const h = tela().ctx.LicLeit_htmlChecklist_({ situacao: 'CONCLUIDA', checklist: J(r.a.ctx.LicLeit_checklist_(r.itens)) });
  assert.match(h, /Confirmar no edital: errata sobre a cláusula 8\.3 \(A2, página 1\)/);
});

// ---------------- reconferência de 452a6dd (probe13) ----------------
test('reconferência 7: lista com marcadores sob cabeçalho negativo sem numeração vira pendência mostrando o cabeçalho; sob cabeçalho comum, exigência', () => {
  const B = '[página 1]\nDOCUMENTOS DE HABILITAÇÃO\nNão serão exigidos nesta contratação os documentos relacionados a seguir:\n• Certidão de registro da empresa no CREA da sede da licitante.\n• Comprovação de responsável técnico com vínculo permanente\ncom a licitante, por contrato ou carteira de trabalho.\n– Declaração de conhecimento das condições locais da execução.\nDO PAGAMENTO\nSerão exigidos os documentos a seguir:\n* Certidão negativa de débitos trabalhistas da licitante.\n';
  const r = verArquivo(B, [
    { tema: 'EQUIPE_RT', trecho: 'Comprovação de responsável técnico com vínculo permanente' },
    { tema: 'EQUIPE_RT', trecho: 'com a licitante, por contrato ou carteira de trabalho' },
    { tema: 'OUTRO', trecho: 'Declaração de conhecimento das condições locais da execução' },
    { tema: 'HAB_FISCAL', trecho: 'Certidão negativa de débitos trabalhistas da licitante' }]);
  assert.equal(r.ok, true, r.p);
  assert.deepEqual(r.itens.map((i) => [i.tipo, i.alerta]), [['PENDENCIA', 'nao'], ['PENDENCIA', 'nao'], ['PENDENCIA', 'nao'], ['EXIGENCIA', '']]);
  assert.equal(r.itens[0].origemAlerta, 'o cabeçalho da lista diz: "Não serão exigidos nesta contratação os documentos relacionados a seguir:"');
  const c = r.a.ctx;
  assert.equal(c.LicLeit_cabecalhoLista_(B, B.indexOf('Certidão negativa de débitos')), null, 'cabeçalho comum ("Serão exigidos...:") não é exceção');
  assert.equal(c.LicLeit_cabecalhoLista_('[página 1]\nTexto corrido sem lista.\nNão é lista: frase solta.\n', 30), null);
});

// ---------------- calibração com a prova real (Aparecida do Rio Doce, 02/11/2026; _tools/licitacoes_leitura_banco_prova.cjs) ----------------
test('calibração: consolidação publica as frases que passaram e lista as retiradas; referências no texto não viram número; JSON grande em partes; retorno por regra; bloco menor', () => {
  // frases boas e ruins na mesma resposta: a consolidação não cai inteira
  const mista = (ids) => ({ resumo: [{ texto: 'Exige atestado de 50% do quantitativo dos equipamentos (I1).', fontes: [ids.ATESTADOS] }, { texto: 'Multa de 0,5% por dia de atraso.', fontes: [ids.PENALIDADES] }, { texto: 'Pregão para manutenção de autoclaves com fornecimento de peças.', fontes: [ids.OUTRO, 'CAMPO:objeto'] }],
    estrategia: { primeiro: [{ texto: 'Vale a pena participar desta licitação.', fontes: [ids.ATESTADOS] }, { texto: 'Separar os atestados de autoclave (I1).', fontes: [ids.ATESTADOS] }], riscos: [{ texto: 'Páginas não lidas.', fontes: ['COBERTURA'] }], documentos: [{ texto: 'Certificados rastreáveis dos padrões.', fontes: [ids.RBC_INMETRO] }], perguntas: [] } });
  const a = ambiente({ consolidacao: mista, custoMs: 1000 });
  a.api('s_dora', 'leituraIniciar', { id: 'op1' });
  const le = a.leituras()[0];
  assert.equal(le.CONSOLIDACAO_SITUACAO, 'OK', 'publicada com as frases que passaram');
  const t = a.api('s_dora', 'leitura', { id: 'op1' }).leitura.leitura;
  assert.deepEqual(J(t.resumo).map((x) => x.texto), ['Exige atestado de 50% do quantitativo dos equipamentos (I1).', 'Pregão para manutenção de autoclaves com fornecimento de peças.'], '"(I1)" no texto não é o número 1');
  assert.deepEqual(J(t.estrategia.primeiro).map((x) => x.texto), ['Separar os atestados de autoclave (I1).']);
  const ret = J(t.estrategia.retiradas);
  assert.deepEqual(ret.map((x) => x.secao), ['Resumo do edital', 'O que fazer primeiro', 'Riscos']);
  assert.match(ret[0].motivo, /o número 0,5% não está/); assert.match(ret[1].motivo, /a IA não decide/); assert.match(ret[2].motivo, /sem item citado/);
  assert.equal(a.ia.prompts.filter((p) => /ITENS \(o que precisamos/.test(p)).length, 3, 'refez com o retorno antes de publicar a melhor');
  assert.match(a.ia.prompts[a.ia.prompts.length - 1], /ALGUMAS FRASES DA SUA RESPOSTA ANTERIOR FORAM RETIRADAS PELO VERIFICADOR \(as outras valem\)/);
  // JSON grande: em partes (nunca cortado no meio), lido de volta inteiro
  const c = a.ctx, grande = Array.from({ length: 120 }, (_, i) => ({ id: 'I' + (i + 1), tema: 'OUTRO', trecho: 'x'.repeat(600), fontes: [{ ref: 'A1', rotulo: 'página ' + i }] }));
  const partes = J(c.LicLeit_partes_('CHECKLIST_JSON', grande, 4));
  assert.deepEqual(Object.keys(partes), ['CHECKLIST_JSON', 'CHECKLIST_JSON_2', 'CHECKLIST_JSON_3', 'CHECKLIST_JSON_4']);
  assert.ok(Object.values(partes).every((v) => v.length <= 45000));
  assert.equal(J(c.LicLeit_lerPartes_(partes, 'CHECKLIST_JSON', [])).length, 120);
  // retorno da nova tentativa do bloco: agrupado por regra, com o que fazer
  const r = c.LicLeit_retorno_(['no máximo 40 itens por bloco (vieram 70): o mesmo trecho vira um item só', 'item 7: o trecho "x y z" não está em A1 (copie literalmente do texto da fonte); na fonte, o trecho vem logo depois de "sem"', 'item 30: trecho curto demais para conferir ("CPF:")']);
  assert.match(r, /Itens demais: mande no máximo 40 itens/); assert.match(r, /copie a frase inteira até o ponto final/); assert.match(r, /campos de formulário e títulos não são exigências/);
  // bloco menor e prompt com o que o verificador recusa
  const b = ambiente();
  vm.runInContext('LIC_LEIT_BLOCO_CAR = 8000;', b.ctx);
  assert.equal(b.ctx.LIC_LEIT_BLOCO_PAGINAS, 6);
  const tx = b.ctx.LicLeit_textos_(b.op()), arq = tx.arquivos[0]; arq._ind = b.ctx.LicLeit_indice_(arq.texto);
  const pr = b.ctx.LicLeit_promptBloco_(b.op(), arq, Object.assign(b.ctx.LicLeit_dividir_(arq, '')[0], { ordem: 1 }), 1, [], 'FONTE-x');
  for (const re of [/NO MÁXIMO 40 itens por bloco/, /Nunca pare antes de uma negação ou exceção/, /campos de formulário para preencher/, /não invente uma frase para cada parte/, /Errado: parar em "recebimento definitivo"/]) assert.match(pr, re);
});
