// SGO+ Licitações, 03/11/2026: fila da análise automática (defeito real: em produção, 120 candidatas e só 2 com nota, porque
// Lic_aposArquivos_ analisava uma oportunidade por chamada e as outras não iam para fila nenhuma) e 5 problemas visuais das
// capturas reais: valor em reais quebrando no meio, contadores da Central de disputas sem espaço, aba Habilitação em Resultado
// e Contrato dizendo "ainda não está em análise", aviso informativo do Preço em vermelho, nota 0 acima das sem nota.
// Código real do SGO+ num contexto isolado; o servidor (SGO_LICITACOES), a IA, o gatilho (ScriptApp) e o RELÓGIO são simulados
// (o relógio é todo de mentira: nunca data fixa misturada com o relógio real).
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

const INICIO = Date.parse('2026-11-03T09:00:00-03:00');   // terça
const H = 3600e3;

const USUARIOS = [['u_dir', 'dora', 'DORA DIRETORA TESTE', 'DIRETORIA'], ['u_adm', 'admin', 'Administrador', 'ADMIN']];
const OBJETO = 'DISPENSA DE LICITAÇÃO PARA CONTRATAÇÃO DE EMPRESA ESPECIALIZADA PARA PRESTAÇÃO DE SERVIÇOS DE DIAGNÓSTICO TÉCNICO E MANUTENÇÃO CORRETIVA DE 04 (QUATRO) EQUIPAMENTOS MÉDICOS E FISIOTERAPÊUTICOS, SENDO';
function op(id, uf, enc, extra) {
  return Object.assign({ ID: id, CODIGO: 'LIC-2026-' + id.toUpperCase(), CHAVE_FONTE: 'PNCP:' + id, NUMERO_CONTROLE_PNCP: id, PORTAL_ORIGEM: 'PNCP', ORGAO_CNPJ: '24859316000100',
    ORGAO_NOME: 'MUNICIPIO TESTE ' + id.toUpperCase(), UNIDADE_NOME: 'FMS', UF: uf, MUNICIPIO: 'Cidade Teste', MODALIDADE: 'Dispensa', MODO_DISPUTA: 'Dispensa Com Disputa', AMPARO_LEGAL: 'Lei 14.133/2021, Art. 75, II', LEI: '14133', SRP: 'NAO',
    OBJETO, VALOR_ESTIMADO: 8431.44, ABERTURA_PROPOSTAS: '2026-11-03T07:00:00', ENCERRAMENTO_PROPOSTAS: enc.slice(0, 19), ENCERRAMENTO_ISO: enc, SITUACAO_FONTE: 'Divulgada no PNCP',
    TRIAGEM: 'CANDIDATA', TRIAGEM_MOTIVO: 'Termo de interesse: manutenção de equipamentos de saúde (no objeto).', SELOS_JSON: '[]', PENDENCIAS_JSON: '[]', PRIORIDADE_UF: 0, SITUACAO: 'RADAR', VERSAO_FONTE: 1, VERSAO_HASH: 'v' + id }, extra || {});
}
// SP fecha antes, mas fica depois das UFs prioritárias; entre as prioritárias, o prazo mais próximo primeiro
const OPS = () => [op('opsp', 'SP', '2026-11-06T14:00:00.000Z'), op('opgo', 'GO', '2026-11-25T14:00:00.000Z'), op('oprj', 'RJ', '2026-11-10T14:00:00.000Z'), op('opba', 'BA', '2026-11-12T14:00:00.000Z')];
const EDITAL = 'AVISO DE DISPENSA ELETRÔNICA Nº 12/2026\nObjeto: manutenção corretiva de 04 equipamentos: 01 autoclave horizontal 21 litros, 01 aparelho de ultrassom fisioterapêutico, 01 eletroestimulador e 01 bicicleta ergométrica.\n' +
  'Habilitação: certidão negativa de débitos federais, estaduais e municipais; certificado de regularidade do FGTS; atestado de capacidade técnica.\nO atendimento deverá ocorrer em até 24 horas após a abertura do chamado.\nAs peças serão fornecidas pela contratada sem custo adicional.';
const TEXTOS = [{ ref: 'A1', id: 11, titulo: 'Aviso de dispensa', nome: 'aviso.pdf', sha256: 'a'.repeat(64), situacao: 'EXTRAIDO', motivo: '', texto: EDITAL, cortado: false }];
function respostaValida() {
  return {
    resumo: 'Dispensa para manutenção corretiva de quatro equipamentos, um deles autoclave. As exigências de habilitação são as comuns.',
    capacidade: { pontos: 12, justificativa: 'A autoclave casa com a manutenção de autoclave do catálogo.', itens: [
      { descricao: 'Manutenção corretiva de autoclave horizontal 21 litros', grau: 'MEDIA', servico: 'MP_AUTOCLAVE_BANCADA', fonte: { ref: 'A1', trecho: '01 autoclave horizontal 21 litros' } },
      { descricao: 'Ultrassom fisioterapêutico e eletroestimulador', grau: 'NAO_ATENDE', servico: '', fonte: { ref: 'A1', trecho: '01 aparelho de ultrassom fisioterapêutico, 01 eletroestimulador' } }] },
    documentacao: { pontos: 7.5, justificativa: 'Exigências comuns de regularidade fiscal e atestado.', exigencias: [{ texto: 'Certidões negativas e FGTS', fonte: { ref: 'A1', trecho: 'certidão negativa de débitos federais, estaduais e municipais' } }] },
    riscos: [{ codigo: 'SLA_HORAS', texto: 'Atendimento em 24 horas.', fonte: { ref: 'A1', trecho: 'O atendimento deverá ocorrer em até 24 horas' } }],
    travas: [],
    afirmacoes: [{ tipo: 'FATO', criterio: 'capacidade', texto: 'O objeto é manutenção corretiva de quatro equipamentos médicos.', fonte: { ref: 'CAMPO:objeto', trecho: 'MANUTENÇÃO CORRETIVA DE 04 (QUATRO) EQUIPAMENTOS MÉDICOS' } },
      { tipo: 'PENDENCIA', criterio: 'documentacao', texto: 'Conferir o escopo da autoclave.' }]
  };
}

function ambiente(o) {
  o = o || {};
  const relogio = { agora: INICIO };
  class DataRelogio extends Date { constructor(...a) { if (a.length) super(...a); else super(relogio.agora); } static now() { return relogio.agora; } }
  const tabelas = { CAD_USUARIOS: USUARIOS.map((u) => ({ ID: u[0], USUARIO: u[1], NOME: u[2], PERFIL: u[3], STATUS: 'ATIVO' })), LIC_OPORTUNIDADES: o.ops || OPS() };
  const props = Object.assign({}, o.semChave ? {} : { GEMINI_API_KEY: 'chave-de-teste', IA_MODEL: 'gemini-2.5-flash' }), cache = {}, sessoes = {};
  tabelas.CAD_USUARIOS.forEach((u) => { sessoes['s_' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: u.PERFIL }; });
  let seq = 0;
  const bases = {};   // base dos arquivos por chave (o teste muda para simular arquivo novo)
  tabelas.LIC_OPORTUNIDADES.forEach((l) => { bases[l.CHAVE_FONTE] = crypto.createHash('sha256').update(l.CHAVE_FONTE + ':1').digest('hex'); });
  const ia = { respostas: (o.respostas || []).slice(), prompts: [], porChave: [] };
  const gatilhos = [];
  const SGO_LICITACOES = {
    listar: () => ({ itens: [], ate: '', mais: false }), conexoes: () => [], situacao: () => ({ ligado: true }),
    obter: () => ({ atual: null, versoes: [], itens: [{ numeroItem: 1, descricao: 'Manutenção corretiva de equipamentos médicos', materialServico: 'S', quantidade: 4, unidade: 'UNIDADE', valorUnitario: 2107.86, hash: 'i1' }] }),
    arquivos: (f) => ({ chave: f.chave, rodando: false, estado: { listaOk: true }, arquivos: [{ id: 11, versao: 1, titulo: 'Aviso de dispensa', nome: 'aviso.pdf', sha256: 'a'.repeat(64), situacao: 'BAIXADO', textoSituacao: 'EXTRAIDO', substituidoEm: '' }], baseHash: bases[f.chave] }),
    textos: (f) => { ia.porChave.push(f.chave); return TEXTOS.map((t) => Object.assign({}, t)); }
  };
  const ctx = vm.createContext({
    console, Date: DataRelogio, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt, Buffer,
    Utilities: criarUtilities({ computeDigest: (alg, texto) => Array.from(crypto.createHash('sha256').update(String(texto), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)), DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF-8' } }),
    Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true }) },
    ScriptApp: { getProjectTriggers: () => gatilhos.map((g) => ({ getHandlerFunction: () => g.funcao, getUniqueId: () => g.id })), deleteTrigger: (t) => { const i = gatilhos.findIndex((g) => g.id === t.getUniqueId()); if (i >= 0) gatilhos.splice(i, 1); },
      newTrigger: (funcao) => { const d = { funcao, id: 'g' + (++seq) }; const tb = { timeBased: () => tb, after: (ms) => { d.ms = ms; return tb; }, everyMinutes: () => tb, create: () => { gatilhos.push(d); return d; } }; return tb; } },
    CertCal_garantirTabela_: (t) => { tabelas[t] = tabelas[t] || []; }, CertCal_garantirColuna_() {}, CertCal_forcarColunaTexto_() {},
    SGO_DATA: {
      getAll: (t) => { if (!tabelas[t]) throw new Error('Aba não encontrada: ' + t); return tabelas[t].map((r) => Object.assign({}, r)); },
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) return false; Object.assign(r, d); return true; },
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq), CRIADO_EM: new Date(relogio.agora).toISOString() }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
      insertMany: (t, l) => { l.forEach((d) => (tabelas[t] = tabelas[t] || []).push(Object.assign({ ID: 'id' + (++seq) }, d))); }
    },
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', CAD_EQUIPAMENTOS: 'CAD_EQUIPAMENTOS' } },
    exigirSessao: (sid) => { if (!sessoes[sid]) throw new Error('Sessão inválida ou expirada. Entre de novo'); return sessoes[sid]; },
    SGO_execucaoInterna_: () => true,
    SGO_DocA4_chamarGemini_: (prompt) => { ia.prompts.push(prompt); if (!ia.respostas.length) throw new Error('A IA está temporariamente indisponível'); let r = ia.respostas.shift(); if (typeof r === 'function') r = r(); if (r instanceof Error) throw r; return typeof r === 'string' ? r : JSON.stringify(r); },
    ComEsp_fabricantes_: () => ['marca exemplo'],
    SGO_LICITACOES
  });
  for (const f of ['SGO_Expediente.js', 'SGO_Licitacoes_Config.js', 'SGO_Licitacoes.js', 'SGO_Licitacoes_Analise.js', 'SGO_Licitacoes_Agenda.js', 'SGO_Licitacoes_Painel.js']) vm.runInContext(ler(f), ctx, { filename: f });
  const api = (sid, acao, d) => ctx.Licitacoes_api(sid, acao, d || {});
  return { ctx, tabelas, props, ia, api, gatilhos, relogio, bases, op: (id) => tabelas.LIC_OPORTUNIDADES.find((l) => l.ID === id), hist: (tipo) => (tabelas.LIC_HISTORICO || []).filter((h) => !tipo || h.TIPO === tipo), analises: () => tabelas.LIC_ANALISES || [] };
}
const CHAVES = ['PNCP:opsp', 'PNCP:opgo', 'PNCP:oprj', 'PNCP:opba'];
const ordemAnalisada = (a) => a.analises().map((x) => x.OPORTUNIDADE_ID);

// ---------------------------------------------------------------- 1. o defeito: as outras vão para a fila
test('defeito real: a chamada do servidor analisa uma e põe as outras na FILA (antes ficavam sem fila); ficha mostra a posição; Hoje e Painel contam', () => {
  const a = ambiente({ respostas: [respostaValida()] });
  const x = a.ctx.Lic_aposArquivos_({ chaves: CHAVES });
  assert.equal(x.analisadas, 1, 'a primeira é analisada na hora (cabe no tempo de uma execução)');
  assert.equal(x.enfileiradas, 3);
  assert.deepEqual(Array.from(x.outras), ['PNCP:opgo', 'PNCP:oprj', 'PNCP:opba']);
  assert.deepEqual(ordemAnalisada(a), ['opsp']);
  assert.equal(a.op('opsp').ANALISE_PENDENTE_SITUACAO, 'FEITA');
  for (const id of ['opgo', 'oprj', 'opba']) { assert.equal(a.op(id).ANALISE_PENDENTE_SITUACAO, 'NA_FILA', id); assert.ok(a.op(id).ANALISE_PENDENTE_BASE, id); assert.equal(Number(a.op(id).ANALISE_PENDENTE_TENTATIVAS), 0); }
  // gatilho próprio, de uma vez, 1 minuto depois
  assert.deepEqual(a.gatilhos.map((g) => [g.funcao, g.ms]), [['Licitacoes_rotinaAnalise', 60000]]);
  // ficha: posição na ordem (UF prioritária e prazo mais próximo primeiro): RJ (10/11), BA (12/11), GO (25/11)
  const pos = (id) => a.api('s_dora', 'ficha', { id }).analise.fila;
  assert.equal(pos('oprj').texto.slice(0, 41), 'Na fila de análise (posição 1 de 3). A ro');
  assert.match(pos('opba').texto, /^Na fila de análise \(posição 2 de 3\)\./);
  assert.match(pos('opgo').texto, /^Na fila de análise \(posição 3 de 3\)\./);
  assert.equal(pos('opsp'), null, 'a já analisada não está na fila');
  // Hoje e Painel: a quantidade na fila
  const hoje = a.api('s_dora', 'hoje');
  assert.equal(hoje.ok, true, hoje.message);
  assert.deepEqual([hoje.filaAnalise.naFila, hoje.filaAnalise.esperando, hoje.filaAnalise.falharam], [3, 0, 0]);
  const pn = a.ctx.Lic_painel_({ id: 'u_dir', nome: 'DORA' });
  assert.deepEqual([pn.ia.fila.naFila, pn.ia.fila.falharam], [3, 0]);
  assert.match(pn.ia.fonte, /LIC_OPORTUNIDADES/);
});

test('rotina da fila: até 2 por execução, na ordem (UF prioritária e prazo mais próximo), reagenda enquanto houver fila e se remove sem fila', () => {
  const a = ambiente({ respostas: [respostaValida(), respostaValida(), respostaValida(), respostaValida()] });
  a.ctx.Lic_aposArquivos_({ chaves: CHAVES });
  let r = a.ctx.Licitacoes_rotinaAnalise();
  assert.equal(r.analisadas, 2);
  assert.equal(r.restam, 1);
  assert.deepEqual(ordemAnalisada(a), ['opsp', 'oprj', 'opba'], 'RJ (10/11) e BA (12/11) antes de GO (25/11)');
  assert.deepEqual(a.gatilhos.map((g) => g.funcao), ['Licitacoes_rotinaAnalise'], 'reagendada (uma só)');
  a.relogio.agora += 61000;
  r = a.ctx.Licitacoes_rotinaAnalise();
  assert.equal(r.analisadas, 1); assert.equal(r.restam, 0);
  assert.deepEqual(ordemAnalisada(a), ['opsp', 'oprj', 'opba', 'opgo']);
  assert.equal(a.gatilhos.length, 0, 'sem fila, sem gatilho');
  assert.ok(a.analises().every((x) => x.ORIGEM_PEDIDO === 'AUTOMATICA' && x.SITUACAO === 'CONCLUIDA'));
  assert.equal(a.analises().find((x) => x.OPORTUNIDADE_ID === 'opgo').PEDIDO_POR_NOME, 'Fila da análise automática');
  assert.ok(['opsp', 'opgo', 'oprj', 'opba'].every((id) => a.op(id).ANALISE_PENDENTE_SITUACAO === 'FEITA' && a.op(id).NOTA !== undefined));
  assert.deepEqual(a.api('s_dora', 'hoje').filaAnalise, { naFila: 0, esperando: 0, falharam: 0 });
});

test('tempo da execução: uma análise nova só começa antes de 140 s (300 s do pool menos a análise); a que não coube fica para a próxima', () => {
  const lenta = () => { return () => { ambienteAtual.relogio.agora += 150000; return respostaValida(); }; };
  let ambienteAtual = null;
  const a = ambienteAtual = ambiente({ respostas: [respostaValida(), lenta(), lenta(), lenta()] });
  a.ctx.Lic_aposArquivos_({ chaves: CHAVES });
  const r = a.ctx.Licitacoes_rotinaAnalise();
  assert.equal(r.analisadas, 1, 'a primeira levou 150 s: a segunda não começa (passaria dos 300 s)');
  assert.equal(r.restam, 2);
  assert.equal(a.gatilhos.length, 1);
  assert.equal(a.ctx.LIC_FILA_INICIO_MS, 140000); assert.equal(a.ctx.LIC_FILA_MAX_POR_RODADA, 2);
});

test('não reanalisa o que já está em dia: mesma base não entra na fila nem chama a IA; arquivo novo entra de novo', () => {
  const a = ambiente({ respostas: [respostaValida(), respostaValida(), respostaValida(), respostaValida(), respostaValida()] });
  a.ctx.Lic_aposArquivos_({ chaves: CHAVES });
  a.ctx.Licitacoes_rotinaAnalise(); a.relogio.agora += 61000; a.ctx.Licitacoes_rotinaAnalise();
  const prompts = a.ia.prompts.length;
  const x = a.ctx.Lic_aposArquivos_({ chaves: CHAVES });
  assert.equal(x.semMudanca, 4); assert.equal(x.enfileiradas, 0); assert.equal(x.analisadas, 0);
  // a varredura também não põe de volta (análise em dia)
  assert.equal(a.ctx.Lic_filaVarrerTalvez_(null, true), 0);
  assert.equal(a.ctx.Licitacoes_rotinaAnalise().analisadas, 0);
  assert.equal(a.ia.prompts.length, prompts, 'nenhuma chamada nova à IA');
  // arquivo novo numa delas: entra de novo e é refeita
  a.relogio.agora += H;
  a.bases['PNCP:opgo'] = 'f'.repeat(64);
  const y = a.ctx.Lic_aposArquivos_({ chaves: CHAVES });
  assert.equal(y.analisadas, 1); assert.equal(y.semMudanca, 3);
  assert.equal(a.analises().filter((v) => v.OPORTUNIDADE_ID === 'opgo').length, 2);
});

// ---------------------------------------------------------------- erro da IA: tentativas e espera
test('erro da IA: conta tentativa e volta à fila com espera (1 h, depois 6 h); na 3ª falha "análise automática falhou — use Analisar agora"', () => {
  const a = ambiente({ ops: [op('oprj', 'RJ', '2026-11-20T14:00:00.000Z')], respostas: [] });   // a IA não responde
  let x = a.ctx.Lic_aposArquivos_({ chaves: ['PNCP:oprj'] });
  assert.equal(x.analisadas, 0); assert.match(x.erroIA, /A IA não respondeu agora \(A IA está temporariamente indisponível\)/);
  let l = a.op('oprj');
  assert.deepEqual([l.ANALISE_PENDENTE_SITUACAO, Number(l.ANALISE_PENDENTE_TENTATIVAS)], ['NA_FILA', 1]);
  assert.equal(l.ANALISE_PENDENTE_PROXIMA, new Date(INICIO + H).toISOString(), 'espera 1 h');
  assert.equal(l.ANALISE_PENDENTE_ERRO, 'A IA está temporariamente indisponível');
  let f = a.api('s_dora', 'ficha', { id: 'oprj' }).analise.fila;
  assert.match(f.texto, /^Na fila de análise \(posição 1 de 1\)\. A IA não respondeu na tentativa anterior \(A IA está temporariamente indisponível\): nova tentativa a partir de 03\/11 às 10:00 \(tentativa 2 de 3\)\.$/);
  assert.equal(a.api('s_dora', 'hoje').filaAnalise.esperando, 1);
  // antes da hora: a rotina não chama a IA e não se reagenda em laço
  const n0 = a.ia.prompts.length;
  a.relogio.agora += 30 * 60000;
  let r = a.ctx.Licitacoes_rotinaAnalise();
  assert.equal(a.ia.prompts.length, n0); assert.equal(r.esperando, 1); assert.equal(r.restam, 0);
  assert.equal(a.gatilhos.length, 0);
  // a vigia (rotina dos alertas) também não agenda antes da hora
  assert.equal(a.ctx.Lic_filaVigiar_().vencidas, 0); assert.equal(a.gatilhos.length, 0);
  // passou 1 h: a vigia agenda, a rotina tenta de novo e falha: espera 6 h
  a.relogio.agora = INICIO + H + 1000;
  assert.equal(a.ctx.Lic_filaVigiar_().vencidas, 1); assert.deepEqual(a.gatilhos.map((g) => g.funcao), ['Licitacoes_rotinaAnalise']);
  r = a.ctx.Licitacoes_rotinaAnalise();
  assert.equal(r.erros, 1); assert.equal(r.falharam, 0);
  l = a.op('oprj');
  assert.equal(Number(l.ANALISE_PENDENTE_TENTATIVAS), 2);
  assert.equal(l.ANALISE_PENDENTE_PROXIMA, new Date(INICIO + H + 1000 + 6 * H).toISOString(), 'espera 6 h');
  // passou 6 h: terceira falha, sai da fila
  a.relogio.agora = INICIO + H + 1000 + 6 * H + 1000;
  r = a.ctx.Licitacoes_rotinaAnalise();
  assert.equal(r.falharam, 1);
  l = a.op('oprj');
  assert.deepEqual([l.ANALISE_PENDENTE_SITUACAO, Number(l.ANALISE_PENDENTE_TENTATIVAS), l.ANALISE_PENDENTE_PROXIMA], ['FALHOU', 3, '']);
  const h = a.hist('ANALISE_FILA_FALHOU');
  assert.equal(h.length, 1); assert.match(h[0].TEXTO, /A IA não respondeu em 3 tentativas .* use "Analisar agora" na ficha\./);
  f = a.api('s_dora', 'ficha', { id: 'oprj' }).analise.fila;
  assert.equal(f.situacao, 'FALHOU');
  assert.match(f.texto, /^Análise automática falhou 3 vezes nesta versão dos arquivos \(último erro: A IA está temporariamente indisponível\) — use "Analisar agora"\.$/);
  assert.deepEqual(a.api('s_dora', 'hoje').filaAnalise, { naFila: 0, esperando: 0, falharam: 1 });
  // depois de falhar: nem a varredura nem a chamada do servidor põem a mesma base de volta; nenhuma chamada nova
  const n1 = a.ia.prompts.length;
  a.relogio.agora += 24 * H;
  assert.equal(a.ctx.Lic_filaVarrerTalvez_(null, true), 0);
  assert.equal(a.ctx.Lic_aposArquivos_({ chaves: ['PNCP:oprj'] }).falharam, 1);
  assert.equal(a.ctx.Licitacoes_rotinaAnalise().analisadas, 0);
  assert.equal(a.ia.prompts.length, n1);
  // "Analisar agora" pela Diretoria resolve e tira a falha
  a.ia.respostas.push(respostaValida());
  const m = a.api('s_dora', 'analisar', { id: 'oprj', motivo: 'IA voltou, analisar de novo' });
  assert.equal(m.ok, true, m.message);
  assert.equal(a.op('oprj').ANALISE_PENDENTE_SITUACAO, 'FEITA');
  assert.equal(m.analise.fila, null);
  assert.deepEqual(a.api('s_dora', 'hoje').filaAnalise, { naFila: 0, esperando: 0, falharam: 0 });
});

test('sem a chave da IA: a fila guarda as oportunidades, nada é chamado nem agendado (sem laço); cadastrada a chave, a vigia retoma', () => {
  const a = ambiente({ semChave: true, respostas: [respostaValida(), respostaValida()] });
  const x = a.ctx.Lic_aposArquivos_({ chaves: CHAVES });
  assert.equal(x.indisponivel, true); assert.equal(x.analisadas, 0);
  assert.equal(a.ia.prompts.length, 0); assert.equal(a.gatilhos.length, 0);
  assert.ok(CHAVES.every((c) => a.tabelas.LIC_OPORTUNIDADES.find((l) => l.CHAVE_FONTE === c).ANALISE_PENDENTE_SITUACAO === 'NA_FILA'));
  for (let i = 0; i < 3; i++) { const r = a.ctx.Licitacoes_rotinaAnalise(); assert.equal(r.semChave, true); assert.equal(r.restam, 4); a.relogio.agora += 61000; }
  assert.equal(a.gatilhos.length, 0, 'não se reagenda sem a chave');
  assert.equal(a.ctx.Lic_filaVigiar_().gatilho, 'sem a chave da IA: não agendada'); assert.equal(a.gatilhos.length, 0);
  assert.match(a.api('s_dora', 'ficha', { id: 'oprj' }).analise.fila.texto, /Sem a chave da IA, a fila fica parada\.$/);
  assert.ok(a.tabelas.LIC_OPORTUNIDADES.every((l) => Number(l.ANALISE_PENDENTE_TENTATIVAS) === 0), 'sem chave não conta tentativa');
  // a chave foi cadastrada: a vigia agenda e a rotina analisa
  a.props.GEMINI_API_KEY = 'chave-de-teste';
  a.ctx.Lic_filaVigiar_();
  assert.deepEqual(a.gatilhos.map((g) => g.funcao), ['Licitacoes_rotinaAnalise']);
  assert.equal(a.ctx.Licitacoes_rotinaAnalise().analisadas, 2);
});

test('varredura: põe na fila as elegíveis sem análise em dia (no máximo a cada 30 min); descartada, de prazo vencido e já em dia ficam fora', () => {
  const ops = [op('opgo', 'GO', '2026-11-25T14:00:00.000Z', { ARQUIVOS_BASE_HASH: 'x'.repeat(64), ARQUIVOS_EM: '2026-11-02T10:00:00.000Z' }),
    op('oprj', 'RJ', '2026-11-10T14:00:00.000Z', { ANALISE_SITUACAO: 'ERRO', ANALISE_EM: '2026-11-02T11:00:00.000Z', ARQUIVOS_BASE_HASH: 'y'.repeat(64) }),
    op('opok', 'MG', '2026-11-10T14:00:00.000Z', { ANALISE_BASE_HASH: 'b'.repeat(64), ANALISE_SITUACAO: 'CONCLUIDA', ANALISE_EM: '2026-11-02T12:00:00.000Z', ARQUIVOS_EM: '2026-11-02T10:00:00.000Z', NOTA: 60 }),
    op('opdesc', 'GO', '2026-11-25T14:00:00.000Z', { SITUACAO: 'DESCARTADA' }),
    op('opvenc', 'GO', '2026-11-02T14:00:00.000Z'),
    op('opsem', 'BA', '2026-11-12T14:00:00.000Z', { TRIAGEM: 'SEM_TERMO' })];
  const a = ambiente({ ops, respostas: [respostaValida(), respostaValida()] });
  const v = a.ctx.Lic_filaVigiar_();
  assert.equal(v.varridas, 2);
  assert.deepEqual(a.tabelas.LIC_OPORTUNIDADES.filter((l) => l.ANALISE_PENDENTE_SITUACAO === 'NA_FILA').map((l) => l.ID), ['opgo', 'oprj']);
  assert.equal(v.vencidas, 2); assert.equal(a.gatilhos.length, 1);
  assert.equal(a.ctx.Lic_filaVigiar_().varridas, null, 'a varredura não roda de novo antes de 30 min');
  const r = a.ctx.Licitacoes_rotinaAnalise();
  assert.equal(r.analisadas, 2);
  assert.deepEqual(ordemAnalisada(a), ['oprj', 'opgo'], 'GO e RJ são prioritárias: o prazo mais próximo (RJ) primeiro');
  // a rotina dos alertas chama a vigia (passo próprio, cada passo em separado)
  assert.match(ler('SGO_Licitacoes_Alertas.js'), /passo\('filaAnalise', function \(\) \{ return typeof Lic_filaVigiar_ === 'function' \? Lic_filaVigiar_\(\) : null; \}\);/);
});

test('saiu do radar ou do prazo enquanto estava na fila: deixa de contar e não chama a IA; reaberta, volta para a fila', () => {
  const a = ambiente({ respostas: [respostaValida(), respostaValida(), respostaValida(), respostaValida()] });
  a.ctx.Lic_aposArquivos_({ chaves: CHAVES });
  a.op('oprj').SITUACAO = 'DESCARTADA';
  const n0 = a.ia.prompts.length;
  const r = a.ctx.Lic_filaRodada_({ varrer: false });
  assert.equal(r.analisadas, 2);
  assert.deepEqual(ordemAnalisada(a).slice(1), ['opba', 'opgo']);
  assert.equal(a.ia.prompts.length, n0 + 2);
  assert.equal(a.api('s_dora', 'hoje').filaAnalise.naFila, 0, 'a descartada não conta na fila');
  assert.ok(a.ctx.Lic_filaEstado_(a.op('oprj')) === null);
  // reaberta pela Diretoria (volta ao radar, como candidata reaberta): volta a contar e é analisada
  Object.assign(a.op('oprj'), { SITUACAO: 'RADAR', DESCARTE_ORIGEM: 'REABERTA' });
  assert.equal(a.api('s_dora', 'hoje').filaAnalise.naFila, 1);
  assert.equal(a.ctx.Lic_filaRodada_({ varrer: false }).analisadas, 1);
  assert.equal(a.op('oprj').ANALISE_PENDENTE_SITUACAO, 'FEITA');
});

test('colunas novas entram por merge (cache das abas V8) e o gatilho tem nome sem "_" (o agendador acha)', () => {
  const cfg = ler('SGO_Licitacoes_Config.js');
  for (const c of ['ANALISE_PENDENTE_SITUACAO', 'ANALISE_PENDENTE_BASE', 'ANALISE_PENDENTE_EM', 'ANALISE_PENDENTE_TENTATIVAS', 'ANALISE_PENDENTE_PROXIMA', 'ANALISE_PENDENTE_ERRO']) assert.match(cfg, new RegExp("'" + c + "'"));
  assert.match(cfg, /LIC_ABAS_OK_V([8-9]|\d\d)/);
  assert.match(ler('SGO_Licitacoes_Analise.js'), /\nfunction Licitacoes_rotinaAnalise\(\) \{\n  if \(typeof SGO_execucaoInterna_ === 'function' && !SGO_execucaoInterna_\(\)\) return null;/);
  assert.doesNotMatch(ler('SGO_Licitacoes_Analise.js'), /if \(r\.analisadas >= 1\) \{ r\.outras\.push\(chave\); return; \}/, 'o corte sem fila saiu');
});

// ---------------------------------------------------------------- e) ordem por nota
test('visual e) ordem "Nota (maior primeiro)": notas acima de zero, depois as sem nota, e as de descarte (nota 0 ou classe descarte) por último', () => {
  const ops = [op('o80', 'GO', '2026-11-25T14:00:00.000Z', { NOTA: 80, NOTA_CLASSE: 'ALTA' }), op('o0', 'GO', '2026-11-25T14:00:00.000Z', { NOTA: 0, NOTA_CLASSE: 'DESCARTE', NOTA_TRAVA: 'RBC' }),
    op('osem', 'GO', '2026-11-25T14:00:00.000Z'), op('o40', 'SP', '2026-11-25T14:00:00.000Z', { NOTA: 40, NOTA_CLASSE: 'BAIXA' }), op('o25', 'GO', '2026-11-25T14:00:00.000Z', { NOTA: 25, NOTA_CLASSE: 'DESCARTE' }),
    op('osem2', 'SP', '2026-11-25T14:00:00.000Z')];
  const a = ambiente({ ops });
  const r = a.api('s_dora', 'oportunidades', { aba: 'analisar', ordem: 'nota' });
  assert.equal(r.ok, true, r.message);
  assert.deepEqual(r.lista.map((x) => x.id), ['o80', 'o40', 'osem', 'osem2', 'o25', 'o0']);
});

// ---------------------------------------------------------------- telas
function telaCliente(arquivos) {
  const els = {};
  const el = (id) => (els[id] = els[id] || { id, style: {}, innerHTML: '', value: '', querySelectorAll: () => [], querySelector: () => null, addEventListener() {} });
  el('conteudo'); el('licCorpo');
  const ctx = vm.createContext({ console, window: {}, setTimeout, USER_CONTEXT: { perfil: 'DIRETORIA' },
    document: { getElementById: (id) => els[id] || null, querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, removeEventListener() {}, body: { appendChild() {} }, createElement: () => el('x' + Math.random()) },
    ehMobileModo_: () => false, atualizarTituloMobile_() {}, abrir() {}, SGO_getSessionId: () => 's',
    google: { script: { run: { withSuccessHandler() { return { withFailureHandler() { return { Licitacoes_api: () => {} }; } }; } } } } });
  for (const f of ['JS_Licitacoes.html'].concat(arquivos || [])) { const h = ler(f); vm.runInContext(h.slice(h.indexOf('<script>') + 8, h.lastIndexOf('</script>')), ctx); }
  return ctx;
}

test('telas da fila: faixa na aba Análise (posição e falha), número no Hoje com a faixa das que esperam ou falharam, linha no Painel', () => {
  const t = telaCliente();
  const base = { analise: { iaDisponivel: true, atual: null, ultima: null, versoes: [], elegivel: '', fila: { situacao: 'NA_FILA', posicao: 2, total: 5, texto: 'Na fila de análise (posição 2 de 5). A rotina analisa até 2 por vez, a UF prioritária e o prazo mais próximo primeiro.' } }, op: {} };
  let h = t.Lic_htmlAnalise_(base);
  assert.match(h, /<div class="cm-faixa info">Na fila de análise \(posição 2 de 5\)\./);
  base.analise.fila = { situacao: 'FALHOU', texto: 'Análise automática falhou 3 vezes nesta versão dos arquivos (último erro: x) — use "Analisar agora".' };
  h = t.Lic_htmlAnalise_(base);
  assert.match(h, /<div class="cm-faixa aviso">Análise automática falhou 3 vezes .* — use &quot;Analisar agora&quot;\.<\/div>/);
  const hoje = t.Lic_htmlHoje_({ kpis: {}, prazos: [], novas: [], filaAnalise: { naFila: 7, esperando: 1, falharam: 2 } });
  assert.match(hoje, /<span class="v">7<\/span><span class="r">Na fila de análise por IA<\/span>/);
  assert.match(hoje, /1 oportunidade espera nova tentativa da análise automática .* 2 oportunidades ficaram sem nota: a análise automática falhou 3 vezes\. Abra a ficha e use &quot;Analisar agora&quot;\./);
  assert.doesNotMatch(t.Lic_htmlHoje_({ kpis: {}, prazos: [], novas: [], filaAnalise: { naFila: 3, esperando: 0, falharam: 0 } }), /espera nova tentativa|ficaram sem nota/);
  assert.match(ler('JS_Licitacoes.html'), /"<dt>Fila de análise<\/dt><dd>" \+ Lic_esc_\(\(ia\.fila\.naFila \|\| 0\) \+ " na fila"/);
});

test('visual a) valor em reais não quebra no meio: Lic_brlHtml_ com white-space: nowrap; Contratos, Proposta, Preço e a ficha usam', () => {
  const t = telaCliente(['JS_Licitacoes_Precos.html']);
  assert.equal(t.Lic_brlHtml_(8380), '<span class="lic-rs">R$ 8.380,00</span>');
  assert.equal(t.LicPr_moedaHtml_(2266.01), '<span class="lic-rs">R$ 2.266,01</span>');
  assert.equal(t.LicPr_moedaHtml_(null), '<span class="lic-rs">—</span>');
  const js = ler('JS_Licitacoes.html');
  assert.match(js, /\.lic-rs \{ white-space: nowrap; font-variant-numeric: tabular-nums; \}/);
  assert.match(js, /#licTela \.cm-tabela td \{ overflow-wrap: anywhere; \}/, 'a regra que quebrava continua para o texto; o valor fica protegido');
  for (const f of ['JS_Licitacoes_Contratos.html', 'JS_Licitacoes_Proposta.html', 'JS_Licitacoes.html', 'JS_Licitacoes_Disputa.html']) {
    const fonte = ler(f).replace(/function Lic_brlHtml_[^\n]*\n/, '');
    assert.doesNotMatch(fonte, /Lic_esc_\(Lic_brl_\(/, f + ': todo valor em reais escapado usa Lic_brlHtml_');
  }
  const precos = ler('JS_Licitacoes_Precos.html').replace(/function LicPr_moedaHtml_[^\n]*\n/, '');
  const restantes = precos.split('\n').filter((l) => /Lic_esc_\(LicPr_moeda_\(/.test(l));
  assert.ok(restantes.every((l) => /<option/.test(l)), 'no Preço, só o rótulo de <option> continua texto puro');
  assert.match(ler('JS_Licitacoes_Contratos.html'), /Lic_brlHtml_\(x\.valor\)/, 'coluna Valor da lista de contratos');
  assert.match(ler('JS_Licitacoes_Proposta.html'), /cot \? Lic_brlHtml_\(i\.precoUnit\) : "—"/, 'itens da proposta');
  assert.match(ler('JS_Licitacoes_Precos.html'), /LicPr_moedaHtml_\(r\.precoEdital\)/, 'Preço › Por item');
  assert.match(ler('JS_Licitacoes_Precos.html'), /<b class="lic-rs">' \+ Lic_esc_\(val\)/, 'caixas dos totais');
});

test('visual b) Central de disputas: número e texto dos contadores separados (valor em cima, rótulo embaixo, como os outros contadores)', () => {
  const t = telaCliente(['JS_Licitacoes_Proposta.html', 'JS_Licitacoes_Disputa.html']);
  const h = t.LicDp_htmlCentral_({ contagens: { abertas: 0, prontas: 1, resultado: 2 }, disputas: [], prontas: [], resultados: [] });
  assert.match(h, /<div class="cm-kpi"><span class="v">0<\/span><span class="r">Disputas abertas<\/span><\/div>/);
  assert.match(h, /<span class="v">1<\/span><span class="r">Prontas para abrir \(proposta emitida\)<\/span>/);
  assert.match(h, /<span class="v">2<\/span><span class="r">Com resultado registrado<\/span>/);
  assert.doesNotMatch(h, /<b>0<\/b><span>Disputas abertas/);
});

test('visual c) aba Habilitação em Resultado e Contrato: habilitação concluída/contratada, conferência visível, sem "ainda não está em análise"', () => {
  const t = telaCliente(['JS_Licitacoes_Habilitacao.html']);
  const res = t.LicHb_faixaSituacao_({ situacao: 'RESULTADO', acompanhada: false });
  assert.match(res, /^<div class="cm-faixa info">Habilitação da licitação concluída \(situação Resultado\): a conferência abaixo continua visível para consulta e não gera pendência nova no Hoje nem no Painel\.<\/div>$/);
  const ct = t.LicHb_faixaSituacao_({ situacao: 'CONTRATO', acompanhada: false });
  assert.match(ct, /Licitação contratada \(situação Contrato\): a habilitação foi concluída/);
  for (const x of [res, ct]) assert.doesNotMatch(x, /ainda não está em análise/);
  assert.match(t.LicHb_faixaSituacao_({ situacao: 'RADAR', acompanhada: false }), /cm-faixa aviso">Esta oportunidade ainda não está em análise/);
  assert.equal(t.LicHb_faixaSituacao_({ situacao: 'ANALISE', acompanhada: true }), '', 'acompanhada: sem faixa');
  // pendência nova continua só das acompanhadas (a lista do servidor não inclui Resultado nem Contrato)
  const m = /var LICH_SITUACOES_OP = (\[[^\]]*\])/.exec(ler('SGO_Licitacoes_Habilitacao.js'));
  assert.ok(m, 'lista das situações acompanhadas');
  const lista = JSON.parse(m[1].replace(/'/g, '"'));
  assert.ok(!lista.includes('RESULTADO') && !lista.includes('CONTRATO'));
});

test('visual d) Preço: "o lote cobre a soma dos pisos" é informação (faixa verde); vermelho só para problema, também nas versões salvas antes', () => {
  const t = telaCliente(['JS_Licitacoes_Precos.html']);
  const res = { totais: {}, viagem: {}, itens: [], pendencias: [], politica: { licitacao: {} }, premissas: [],
    informacoes: ['O total do lote no edital (R$ 10.000,00) cobre a soma dos pisos (R$ 9.000,00).'], avisos: ['1 item(ns) com o preço de referência do edital abaixo do piso: participar nesses itens não deixa a sobra mínima.'] };
  let h = t.LicPr_htmlResultado_(res);
  assert.match(h, /<div class="cm-faixa ok">O total do lote no edital \(R\$ 10\.000,00\) cobre a soma dos pisos/);
  assert.match(h, /<div class="cm-faixa erro" role="alert">1 item\(ns\) com o preço de referência do edital abaixo do piso/);
  // versão salva antes de 03/11/2026: tudo em "avisos"
  h = t.LicPr_htmlResultado_(Object.assign({}, res, { informacoes: undefined, avisos: ['O total do lote no edital (R$ 10.000,00) cobre a soma dos pisos (R$ 9.000,00).', 'O lote só tem itens por parceiro: sem viagem da equipe própria.'] }));
  assert.doesNotMatch(h, /cm-faixa erro/);
  assert.equal((h.match(/cm-faixa ok/g) || []).length, 2);
  // o servidor separa: a informação vai em "informacoes"
  assert.match(ler('SGO_Licitacoes_Precos.js'), /\} else if \(pisoLote > 0\) informacoes\.push\('O total do lote no edital \('/);
  assert.match(ler('SGO_Licitacoes_Precos.js'), /avisos: avisos, informacoes: informacoes,/);
});

test('ajuda, manual e base do assistente explicam a fila e os ajustes visuais', () => {
  const aj = ler('SGO_Ajuda_Licitacoes.js'), man = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_LICITACOES.md'), 'utf8'), base = ler('SGO_AssistenteManuais.js');
  assert.match(aj, /Fila da análise automática: .*Na fila de análise \(posição N de M\).*1 hora e depois em 6 horas.*Análise automática falhou — use Analisar agora/);
  assert.match(aj, /as de descarte, com nota 0 ou abaixo de 30, por último/);
  assert.match(aj, /vermelha só para problema/);
  assert.match(ler('SGO_Ajuda_LicitacoesHabilitacao.js'), /Em Resultado e em Contrato: a faixa azul diz que a habilitação da licitação foi concluída/);
  assert.match(man, /Fila da análise automática \(03\/11\/2026\)/);
  assert.match(man, /Licitacoes_rotinaAnalise/);
  assert.match(man, /Na fila de análise por IA/);
  assert.match(base, /Fila da análise automática \(03\/11\/2026\)/, 'base do assistente gerada de novo');
});
