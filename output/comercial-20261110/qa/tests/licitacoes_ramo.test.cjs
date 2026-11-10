// SGO+ Licitações, filtro do ramo (03/11/2026, decisão do dono: os 4 itens, nesta ordem): tela "Revisar o filtro do ramo" (razão da
// triagem, palavras com versão e histórico, "não é do ramo" com a expressão, Aplicar com a triagem refeita e quantas saíram),
// sugestões dos descartes "Fora do ramo", IA como segundo filtro (Aguardando a análise, Descartadas pela IA, prazo curto, Trazer de
// volta) e tipo de serviço (triagem e análise, filtro da lista e do Painel). Caso real: LIC-2026-0232 (Fundação Estatal de Saúde
// do Pantanal), que entrou por "osmose reversa" e sai com "tratamento de água" ou "consultoria".
// Código real do SGO+ num contexto isolado; o servidor (SGO_LICITACOES: listar, retriar e simular) imita a triagem do servidor só
// no que importa aqui (palavras que excluem configuradas em LIC_CFG_COLETOR.ramo); o relógio é todo simulado.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const raiz = path.join(__dirname, '..');
const lerCru = (f) => fs.readFileSync(path.join(pasta, f), 'utf8');
const ler = (f) => lerCru(f).replace(/\r\n/g, '\n');

const INICIO = Date.parse('2026-11-03T21:00:00-03:00');
const H = 3600e3;
const USUARIOS = [['u_dir', 'dora', 'DORA DIRETORA TESTE', 'DIRETORIA'], ['u_tec', 'tito', 'TITO TECNICO TESTE', 'TECNICO']];
const PANTANAL = 'Contratação de empresa especializada em consultoria, assessoria, tratamento de água e treinamento de pessoal através de educação continuada, para monitoramento mensal, coleta e análises de água em sistema de osmose reversa das unidades de hemodiálise';
const enc = (h) => new Date(INICIO + h * H).toISOString();

function op(id, codigo, objeto, extra) {
  return Object.assign({ ID: id, CODIGO: codigo, CHAVE_FONTE: 'PNCP:' + id, NUMERO_CONTROLE_PNCP: id, PORTAL_ORIGEM: 'PNCP', ORGAO_NOME: 'ORGAO ' + id.toUpperCase(), UF: 'MS', MUNICIPIO: 'Cidade',
    MODALIDADE: 'Pregão - Eletrônico', LEI: '14133', OBJETO: objeto, VALOR_ESTIMADO: 10000, ENCERRAMENTO_ISO: enc(240), ENCERRAMENTO_PROPOSTAS: enc(240).slice(0, 19),
    TRIAGEM: 'CANDIDATA', TRIAGEM_MOTIVO: 'Termo de interesse: calibração (no objeto).', TRIAGEM_TERMO: 'calibração', TRIAGEM_REGRA: 'termo_interesse', SELOS_JSON: '[]', PENDENCIAS_JSON: '[]',
    PRIORIDADE_UF: 6, SITUACAO: 'RADAR', VERSAO_FONTE: 1, VERSAO_HASH: 'h-' + id }, extra || {});
}

/** Servidor falso: guarda a triagem de cada chave; retriar aplica as palavras que excluem do LIC_CFG_COLETOR.ramo (como triagem.ts). */
function servidor(props, inicial) {
  const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ');
  const s = { linhas: {}, seq: 0, retriar: [], simular: [] };
  const triar = (l, extraNeg) => {
    let cfg = {}; try { cfg = JSON.parse(props.LIC_CFG_COLETOR || '{}'); } catch (e) { cfg = {}; }
    const neg = ((cfg.ramo || {}).negativas || []).concat(extraNeg || []);
    const achou = neg.find((n) => norm(l.objeto).indexOf(norm(n)) >= 0);
    const entrada = { rotulo: l.rotulo, termo: l.rotulo, fonte: 'objeto', trecho: l.objeto.slice(0, 120), origem: 'taxonomia', todas: [l.rotulo] };
    if (achou) return { resultado: 'DESCARTADA', motivo: 'Descartada pela regra: termo que descarta configurado: ' + achou + ' (termo "' + achou + '").', regra: 'termo_negativo', termo: achou, trecho: l.objeto.slice(0, 120), fonteTrecho: 'objeto', selos: [], pendencias: [], prioridade: 6, versao: '2026-11-03.1:x', entrada, negativa: { configurada: true, expressao: achou }, tipoServico: l.tipo, tiposServico: [l.tipo] };
    return { resultado: 'CANDIDATA', motivo: 'Termo de interesse: ' + l.rotulo + ' (no objeto).', regra: 'termo_interesse', termo: l.rotulo, trecho: l.objeto.slice(0, 120), fonteTrecho: 'objeto', selos: [], pendencias: [], prioridade: 6, versao: '2026-11-03.1:x', entrada, negativa: null, tipoServico: l.tipo, tiposServico: [l.tipo] };
  };
  (inicial || []).forEach((x) => { s.linhas[x.chave] = Object.assign({ alterado: 0, triagem: null }, x); });
  const item = (chave) => { const l = s.linhas[chave]; return { chave, versao: 1, hash: 'h-' + chave.slice(5), portalOrigem: 'PNCP', rotaOrigem: 'publicacao', contratacao: { numeroControlePncp: chave.slice(5), orgaoNome: 'ORGAO ' + chave.slice(5).toUpperCase(), uf: 'MS', municipio: 'Cidade', modalidadeNome: 'Pregão - Eletrônico', lei: '14133', objeto: l.objeto, valorEstimado: 10000, encerramentoEm: l.enc, encerramentoTexto: String(l.enc).slice(0, 19) }, triagem: l.triagem }; };
  s.api = {
    listar: (f) => { const desde = Number(f.desde) || 0; const it = Object.keys(s.linhas).filter((k) => s.linhas[k].triagem && s.linhas[k].alterado > desde).sort((a, b) => s.linhas[a].alterado - s.linhas[b].alterado); return { itens: it.map(item), ate: it.length ? String(s.linhas[it[it.length - 1]].alterado) : String(desde), mais: false }; },
    retriar: (f) => { s.retriar.push(f.chaves.slice()); const r = { pedidas: f.chaves.length, refeitas: 0, mudaram: [] }; f.chaves.forEach((k) => { const l = s.linhas[k]; if (!l) return; const t = triar(l); if (!l.triagem || JSON.stringify(l.triagem) !== JSON.stringify(t)) { l.triagem = t; l.alterado = ++s.seq; } r.refeitas++; }); return r; },
    simular: (f) => { s.simular.push(f); return { itens: f.chaves.filter((k) => s.linhas[k]).map((k) => Object.assign({ chave: k }, triar(s.linhas[k], f.negativas))) }; },
    situacao: () => ({ ligado: true }), conexoes: () => [], obter: () => ({ atual: null, versoes: [], itens: [] }), arquivos: () => ({ arquivos: [], estado: {} }), textos: () => []
  };
  return s;
}

function ambiente(o) {
  o = o || {};
  const relogio = { agora: INICIO };
  class DataRelogio extends Date { constructor(...a) { if (a.length) super(...a); else super(relogio.agora); } static now() { return relogio.agora; } }
  const tabelas = { CAD_USUARIOS: USUARIOS.map((u) => ({ ID: u[0], USUARIO: u[1], NOME: u[2], PERFIL: u[3], STATUS: 'ATIVO' })), LIC_OPORTUNIDADES: o.ops || [], LIC_ANALISES: o.analises || [] };
  const props = Object.assign({}, o.semChave ? {} : { GEMINI_API_KEY: 'chave-de-teste' }, { LIC_SYNC_DESDE: '0' }), cache = {}, sessoes = {};
  tabelas.CAD_USUARIOS.forEach((u) => { sessoes['s_' + u.USUARIO] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: u.PERFIL }; });
  let seq = 0;
  const srv = servidor(props, o.servidor);
  const ctx = vm.createContext({
    console, Date: DataRelogio, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt, Buffer,
    Utilities: criarUtilities({ computeDigest: (alg, texto) => Array.from(crypto.createHash('sha256').update(String(texto), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)), DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF-8' } }),
    Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true }) },
    ScriptApp: { getProjectTriggers: () => [], deleteTrigger() {}, newTrigger: () => { const tb = { timeBased: () => tb, after: () => tb, everyMinutes: () => tb, create: () => ({}) }; return tb; } },
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
    SGO_LICITACOES: srv.api
  });
  for (const f of ['SGO_Expediente.js', 'SGO_Licitacoes_Config.js', 'SGO_Licitacoes.js', 'SGO_Licitacoes_Analise.js', 'SGO_Licitacoes_Agenda.js', 'SGO_Licitacoes_Painel.js', 'SGO_Licitacoes_Ramo.js', 'SGO_Ajuda.js', 'SGO_Ajuda_Licitacoes.js']) vm.runInContext(ler(f), ctx, { filename: f });
  const api = (sid, acao, d) => ctx.Licitacoes_api(sid, acao, d || {});
  const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
  return { ctx, tabelas, props, srv, api, ok, relogio, op: (id) => tabelas.LIC_OPORTUNIDADES.find((l) => l.ID === id), hist: (tipo) => (tabelas.LIC_HISTORICO || []).filter((h) => !tipo || h.TIPO === tipo) };
}
// o caso real e mais três candidatas (calibração do ramo, consultoria genérica e manutenção de equipamentos)
const CASOS = () => [
  { id: 'p232', codigo: 'LIC-2026-0232', objeto: PANTANAL, rotulo: 'osmose reversa', tipo: 'outro' },
  { id: 'c1', codigo: 'LIC-2026-0101', objeto: 'Calibração de termômetros clínicos e balanças das unidades de saúde', rotulo: 'calibração', tipo: 'calibracao' },
  { id: 'c2', codigo: 'LIC-2026-0102', objeto: 'Manutenção preventiva e corretiva de equipamentos médico-hospitalares com reposição de peças', rotulo: 'manutenção de equipamentos de saúde ou laboratório', tipo: 'manutencao' },
  { id: 'c3', codigo: 'LIC-2026-0103', objeto: 'Consultoria em gestão e calibração de instrumentos de laboratório', rotulo: 'calibração', tipo: 'calibracao' }
];
function ambienteCasos(o) {
  const casos = CASOS();
  const ops = casos.map((c) => op(c.id, c.codigo, c.objeto, { TRIAGEM_MOTIVO: 'Termo de interesse: ' + c.rotulo + ' (no objeto).', TRIAGEM_TERMO: c.rotulo, ORGAO_NOME: c.id === 'p232' ? 'FUNDACAO ESTATAL DE SAUDE DO PANTANAL' : 'ORGAO ' + c.id.toUpperCase() }));
  return ambiente(Object.assign({ ops, semChave: true, servidor: casos.map((c) => ({ chave: 'PNCP:' + c.id, objeto: c.objeto, rotulo: c.rotulo, tipo: c.tipo, enc: enc(240) })) }, o || {}));
}

// ---------------------------------------------------------------- 1. tela: razão da triagem, palavras, expressões
test('tela: só a gestão; as candidatas antigas sem a razão têm a triagem refeita pelo servidor (mesma conta) e a razão chega pela sincronia, sem histórico de triagem', () => {
  const a = ambienteCasos();
  assert.equal(a.api('s_tito', 'ramo', { op: 'tela' }).ok, false, 'técnico não abre');
  const t = a.ok(a.api('s_dora', 'ramo', { op: 'tela' }));
  assert.deepEqual(a.srv.retriar[0].sort(), ['PNCP:c1', 'PNCP:c2', 'PNCP:c3', 'PNCP:p232'], 'pediu a triagem refeita das 4 sem razão');
  assert.equal(t.reconstrucao.pedidas, 4);
  const p = t.candidatas.find((x) => x.codigo === 'LIC-2026-0232');
  assert.equal(p.razao.rotulo, 'osmose reversa');
  assert.equal(p.razao.reconstruida, false, 'a razão veio do servidor (TRIAGEM_ENTRADA_JSON)');
  assert.ok(JSON.parse(a.op('p232').TRIAGEM_ENTRADA_JSON).rotulo === 'osmose reversa');
  assert.equal(a.op('p232').TIPO_SERVICO_TRIAGEM, 'outro');
  assert.equal(a.hist('TRIAGEM').length, 0, 'só a razão chegou: nenhum histórico de triagem (o resultado é o mesmo)');
  assert.deepEqual(Array.from(t.grupos.map((g) => g.rotulo + ':' + g.n)), ['calibração:2', 'manutenção de equipamentos de saúde ou laboratório:1', 'osmose reversa:1']);
  // as expressões sugeridas do objeto: sem termo de interesse, sem número, sem palavra vazia
  assert.deepEqual(Array.from(p.expressoes), ['consultoria', 'assessoria', 'tratamento de água', 'treinamento de pessoal', 'educação continuada', 'monitoramento mensal', 'coleta', 'análises de água']);
  assert.ok(!p.expressoes.some((e) => /osmose/.test(e)), 'nunca sugere o termo de interesse');
  assert.ok(t.padroes.positivos.indexOf('osmose reversa') >= 0, 'mostra a taxonomia do servidor');
  assert.equal(t.cfg.versao, 0);
});

test('razão lida do motivo quando o servidor ainda não refez (fora do servidor): marcada como reconstruída', () => {
  const a = ambienteCasos();
  const r = a.ctx.Lic_ramoRazao_(a.op('p232'));
  assert.deepEqual([r.rotulo, r.fonte, r.reconstruida], ['osmose reversa', 'objeto', true]);
  assert.equal(a.ctx.Lic_ramoRazao_({ TRIAGEM_MOTIVO: 'Travada: exige acreditação RBC.' }), null);
  assert.deepEqual(Array.from(a.ctx.Lic_ramoExpressoes_('Aquisição de 2 autoclaves de 21 litros')), [], 'só termo de interesse e número: nada a sugerir');
});

// ---------------------------------------------------------------- 2. aplicar: versão, triagem refeita, quantas saíram, voltar
test('caso real do Pantanal: "não é do ramo" com "tratamento de água" → versão 1, triagem refeita agora, sai para Descartadas pela regra com o motivo; tirar a palavra traz de volta', () => {
  const a = ambienteCasos();
  a.ok(a.api('s_dora', 'ramo', { op: 'tela' }));
  // conferir o efeito (nada gravado)
  const sim = a.ok(a.api('s_dora', 'ramo', { op: 'simular', negativas: ['tratamento de água'] }));
  assert.deepEqual(Array.from(sim.sairiam.map((x) => x.codigo)), ['LIC-2026-0232']);
  assert.equal(sim.fonte, 'servidor');
  assert.equal((a.tabelas.LIC_CONFIG || []).filter((c) => c.CHAVE === 'RAMO').length, 0, 'a simulação não grava nada');
  // recusas sem mudar nada
  assert.match(a.api('s_dora', 'ramo', { op: 'aplicar', negativasAdd: ['tratamento de água'], motivo: 'x' }).message, /motivo da mudança/);
  assert.match(a.api('s_dora', 'ramo', { op: 'aplicar', negativasAdd: ['ag'], motivo: 'hemodiálise não é do ramo' }).message, /pelo menos 3 letras/);
  assert.match(a.api('s_dora', 'ramo', { op: 'aplicar', negativasAdd: ['gasometria'], positivasAdd: ['Gasometria'], motivo: 'teste de conflito' }).message, /incluir e excluir/);
  assert.match(a.api('s_dora', 'ramo', { op: 'aplicar', motivo: 'sem nada para aplicar' }).message, /Nada para aplicar/);
  assert.equal(a.op('p232').SITUACAO, 'RADAR');
  // aplicar
  const r = a.ok(a.api('s_dora', 'ramo', { op: 'aplicar', negativasAdd: ['tratamento de água'], marcadas: ['p232'], motivo: 'Tratamento de água de hemodiálise não é serviço da Metrolabs' }));
  assert.equal(r.versao, 1);
  assert.deepEqual(Array.from(r.sairam.map((x) => x.codigo)), ['LIC-2026-0232']);
  assert.equal(r.ficaram.length, 0);
  assert.match(r.texto, /1 saíram do Radar/);
  const cfg = a.tabelas.LIC_CONFIG.find((c) => c.CHAVE === 'RAMO');
  assert.deepEqual(JSON.parse(cfg.VALOR_JSON), { positivas: [], negativas: ['tratamento de água'] });
  assert.deepEqual([cfg.VERSAO, cfg.ATUALIZADO_POR_NOME], [1, 'DORA DIRETORA TESTE']);
  assert.deepEqual(JSON.parse(a.props.LIC_CFG_COLETOR).ramo, { versao: 1, positivas: [], negativas: ['tratamento de água'] }, 'entregue ao coletor do servidor');
  const l = a.op('p232');
  assert.deepEqual([l.SITUACAO, l.DESCARTE_ORIGEM, l.TRIAGEM], ['DESCARTADA', 'REGRA', 'DESCARTADA']);
  assert.match(l.DESCARTE_MOTIVO, /termo que descarta configurado: tratamento de água/);
  assert.ok(JSON.parse(l.TRIAGEM_ENTRADA_JSON).rotulo === 'osmose reversa', 'a razão da entrada continua guardada (pode voltar)');
  assert.equal(a.op('c1').SITUACAO, 'RADAR');
  const hv = a.hist('RAMO_VERSAO')[0];
  assert.match(hv.TEXTO, /^Versão 1: exclui "tratamento de água"\. Motivo: Tratamento de água/);
  assert.equal(hv.USUARIO_NOME, 'DORA DIRETORA TESTE');
  assert.ok(a.hist('SITUACAO').some((h) => h.ENTIDADE_ID === 'p232' && h.PARA === 'DESCARTADA'), 'a saída fica no histórico da oportunidade');
  // a tela mostra a versão e o histórico
  const t = a.ok(a.api('s_dora', 'ramo', { op: 'tela' }));
  assert.equal(t.cfg.versao, 1); assert.equal(t.candidatas.length, 3); assert.equal(t.historico[0].tipo, 'RAMO_VERSAO');
  // tirar a palavra: volta (nada foi apagado)
  const r2 = a.ok(a.api('s_dora', 'ramo', { op: 'aplicar', negativasRemover: ['Tratamento de Água'], motivo: 'Diretoria decidiu olhar hemodiálise de novo' }));
  assert.equal(r2.versao, 2);
  assert.deepEqual(Array.from(r2.voltaram.map((x) => x.codigo)), ['LIC-2026-0232']);
  assert.equal(a.op('p232').SITUACAO, 'RADAR');
  // a mesma configuração de novo não cria versão
  const r3 = a.ok(a.api('s_dora', 'ramo', { op: 'aplicar', negativasRemover: ['tratamento de água'], motivo: 'de novo, sem mudança' }));
  assert.equal(r3.semMudanca, true);
});

test('Pantanal com "consultoria": sai; a consultoria genérica reaberta pela Diretoria fica no Radar e o resultado diz o porquê', () => {
  const a = ambienteCasos();
  a.op('c3').DESCARTE_ORIGEM = 'REABERTA';
  a.ok(a.api('s_dora', 'ramo', { op: 'tela' }));
  const r = a.ok(a.api('s_dora', 'ramo', { op: 'aplicar', negativasAdd: ['consultoria'], marcadas: ['p232', 'c3'], motivo: 'consultoria não é serviço do catálogo' }));
  assert.deepEqual(Array.from(r.sairam.map((x) => x.codigo)), ['LIC-2026-0232']);
  assert.equal(r.ficaram.length, 1);
  assert.match(r.ficaram[0].porque, /reaberta pela Diretoria/);
  assert.equal(a.op('c3').SITUACAO, 'RADAR');
});

// ---------------------------------------------------------------- 3. aprender com descartes
test('descarte "Fora do ramo" cria a sugestão (termo que fez entrar e a expressão do objeto), nunca aplica sozinha; aprovar aplica; recusar não muda nada', () => {
  const a = ambienteCasos();
  a.ok(a.api('s_dora', 'ramo', { op: 'tela' }));
  assert.match(a.api('s_dora', 'descartar', { id: 'p232', motivoPadrao: 'XYZ' }).message, /motivo do descarte na lista/);
  assert.match(a.api('s_dora', 'descartar', { id: 'p232', motivoPadrao: 'OUTRO', motivo: 'curto' }).message, /pelo menos 10 letras/);
  const d = a.ok(a.api('s_dora', 'descartar', { id: 'p232', motivoPadrao: 'FORA_DO_RAMO', motivo: 'hemodiálise' }));
  assert.equal(d.sugestao.expressao, 'consultoria');
  assert.equal(d.sugestao.entrada, 'osmose reversa');
  const l = a.op('p232');
  assert.deepEqual([l.SITUACAO, l.DESCARTE_ORIGEM, l.DESCARTE_MOTIVO, l.DESCARTE_MOTIVO_PADRAO], ['DESCARTADA', 'PESSOA', 'Fora do ramo: hemodiálise', 'FORA_DO_RAMO']);
  const s = a.tabelas.LIC_RAMO_SUGESTOES[0];
  assert.deepEqual([s.SITUACAO, s.CODIGO, s.ENTRADA_ROTULO, s.TIPO], ['PENDENTE', 'LIC-2026-0232', 'osmose reversa', 'NEGATIVA']);
  assert.ok(JSON.parse(s.EXPRESSOES_JSON).includes('tratamento de água'));
  assert.equal((a.tabelas.LIC_CONFIG || []).filter((c) => c.CHAVE === 'RAMO').length, 0, 'nada aplicado sozinho');
  assert.ok(a.hist('SUGESTAO_FILTRO_RAMO').length === 1);
  const t = a.ok(a.api('s_dora', 'ramo', { op: 'tela' }));
  assert.equal(t.pendentes, 1);
  assert.equal(a.ok(a.api('s_dora', 'hoje')).ramoPendentes, 1, 'o Hoje conta as sugestões esperando');
  // outro descarte "Fora do ramo" da mesma oportunidade (reaberta e descartada de novo) não duplica a sugestão pendente
  a.ok(a.api('s_dora', 'reabrir', { id: 'p232', motivo: 'reaberta para conferir o escopo' }));
  a.ok(a.api('s_dora', 'descartar', { id: 'p232', motivoPadrao: 'FORA_DO_RAMO', motivo: '' }));
  assert.equal(a.tabelas.LIC_RAMO_SUGESTOES.length, 1);
  // aprovar com a expressão escolhida: aplica pelo mesmo fluxo (versão, histórico, triagem refeita)
  const ap = a.ok(a.api('s_dora', 'ramo', { op: 'sugestao', id: s.ID, decisao: 'APROVAR', expressao: 'tratamento de água' }));
  assert.equal(ap.versao, 1);
  assert.deepEqual(JSON.parse(a.tabelas.LIC_CONFIG.find((c) => c.CHAVE === 'RAMO').VALOR_JSON).negativas, ['tratamento de água']);
  assert.deepEqual([s.SITUACAO, s.VERSAO_APLICADA, s.DECIDIDO_POR_NOME], ['APROVADA', 1, 'DORA DIRETORA TESTE']);
  assert.match(a.api('s_dora', 'ramo', { op: 'sugestao', id: s.ID, decisao: 'RECUSAR' }).message, /já foi aprovada/);
  // outra sugestão, recusada
  const d2 = a.ok(a.api('s_dora', 'descartar', { id: 'c2', motivoPadrao: 'FORA_DO_RAMO', motivo: 'peças, não serviço' }));
  const rc = a.ok(a.api('s_dora', 'ramo', { op: 'sugestao', id: d2.sugestao.id, decisao: 'RECUSAR', motivo: 'é do ramo, descarte foi por outro motivo' }));
  assert.equal(rc.recusada, true);
  assert.equal(a.tabelas.LIC_CONFIG.find((c) => c.CHAVE === 'RAMO').VERSAO, 1, 'recusar não cria versão');
  // descarte com outro motivo padronizado não sugere nada
  a.ok(a.api('s_dora', 'descartar', { id: 'c1', motivoPadrao: 'PRAZO', motivo: '' }));
  assert.equal(a.op('c1').DESCARTE_MOTIVO, 'Prazo insuficiente');
  assert.equal(a.tabelas.LIC_RAMO_SUGESTOES.length, 2);
});

// ---------------------------------------------------------------- 4. IA como segundo filtro
function ambienteIA(o) {
  const ana = (id, v, soma, travas) => ({ ID: 'a-' + id, OPORTUNIDADE_ID: id, VERSAO: v, SITUACAO: 'CONCLUIDA', SOMA: soma, NOTA: soma, TRAVAS_JSON: JSON.stringify(travas || []),
    ITENS_JSON: JSON.stringify([{ descricao: 'x', grau: 'ALTA', servico: id === 'n55' ? 'QUA-001' : 'CAL-001' }]) });
  const ops = [
    op('sem', 'LIC-2026-0001', 'Calibração de termômetros', { ANALISE_PENDENTE_SITUACAO: 'NA_FILA', TIPO_SERVICO_TRIAGEM: 'calibracao' }),
    op('n55', 'LIC-2026-0002', 'Qualificação térmica de autoclaves', { NOTA: 55, NOTA_CLASSE: 'MEDIA', ANALISE_VERSAO: 1, ANALISE_SITUACAO: 'CONCLUIDA', TIPO_SERVICO_TRIAGEM: 'calibracao' }),
    op('n30', 'LIC-2026-0003', 'Calibração de balanças', { NOTA: 30, NOTA_CLASSE: 'BAIXA', ANALISE_VERSAO: 1, ANALISE_SITUACAO: 'CONCLUIDA' }),
    op('fora', 'LIC-2026-0004', 'Serviço de autoclave e esterilização de materiais', { NOTA: 60, NOTA_CLASSE: 'TRAVA_A_CONFIRMAR', TRAVAS_A_CONFIRMAR: 1, ANALISE_VERSAO: 1, ANALISE_SITUACAO: 'CONCLUIDA' }),
    op('curto', 'LIC-2026-0005', 'Calibração de manômetros', { ENCERRAMENTO_ISO: enc(20) }),
    op('rec', 'LIC-2026-0006', 'Calibração de pipetas', { ANALISE_SITUACAO: 'RECUSADA', ANALISE_PENDENTE_SITUACAO: 'FEITA' }),
    op('trav', 'LIC-2026-0007', 'Calibração com RBC', { TRIAGEM: 'TRAVADA' })
  ];
  const analises = [ana('n55', 1, 55), ana('n30', 1, 30), ana('fora', 1, 60, [{ codigo: 'FORA_DO_CATALOGO', nome: 'Todos os itens fora do que a Metrolabs faz', chave: 'TF', assinatura: 'as1', fonte: { ref: 'CAMPO:objeto', trecho: 'x' } }])];
  return ambiente(Object.assign({ ops, analises }, o || {}));
}
const abas = (a) => { const r = a.ok(a.api('s_dora', 'oportunidades', { aba: 'analisar' })); return r; };
const ids = (a, aba) => Array.from(a.ok(a.api('s_dora', 'oportunidades', { aba })).lista.map((x) => x.id)).sort();

test('segundo filtro pela IA: nota 40 ou mais sem fora do ramo na lista principal; abaixo ou fora do ramo em Descartadas pela IA; sem análise em Aguardando; prazo curto aparece com o selo', () => {
  const a = ambienteIA();
  const r = abas(a);
  assert.deepEqual(r.contagens, { analisar: 2, aguardando: 2, travadas: 1, analise: 0, descartadas_ia: 2, descartadas: 0 });
  assert.deepEqual(ids(a, 'analisar'), ['curto', 'n55']);
  assert.deepEqual(ids(a, 'aguardando'), ['rec', 'sem']);
  assert.deepEqual(ids(a, 'descartadas_ia'), ['fora', 'n30']);
  assert.equal(r.filtroIA.ativo, true); assert.equal(r.filtroIA.notaMinima, 40);
  const curto = r.lista.find((x) => x.id === 'curto');
  assert.equal(curto.radar.selo, 'Sem análise (prazo curto)');
  const di = a.ok(a.api('s_dora', 'oportunidades', { aba: 'descartadas_ia' })).lista;
  assert.match(di.find((x) => x.id === 'n30').radar.motivo, /Nota 30 abaixo do mínimo 40/);
  assert.match(di.find((x) => x.id === 'fora').radar.motivo, /fora do ramo: Todos os itens fora do que a Metrolabs faz/);
  const ag = a.ok(a.api('s_dora', 'oportunidades', { aba: 'aguardando' })).lista;
  assert.match(ag.find((x) => x.id === 'rec').radar.texto, /recusada pelo verificador.*Analisar agora.*traga para a lista/);
  assert.match(ag.find((x) => x.id === 'sem').radar.texto, /Na fila da análise automática/);
  // nada saiu do Radar: a IA não descarta de vez
  assert.ok(['n30', 'fora', 'sem', 'rec'].every((id) => a.op(id).SITUACAO === 'RADAR'));
  // alertas e resumo: a mesma regra
  assert.equal(a.ctx.Lic_radarSemAlerta_(a.op('n55')), '');
  assert.equal(a.ctx.Lic_radarSemAlerta_(a.op('curto')), '');
  assert.match(a.ctx.Lic_radarSemAlerta_(a.op('sem')), /aguardando a análise da IA/);
  assert.match(a.ctx.Lic_radarSemAlerta_(a.op('n30')), /descartada pela IA/);
  // Hoje conta as abas novas
  const h = a.ok(a.api('s_dora', 'hoje'));
  assert.deepEqual([h.kpis.analisar, h.kpis.aguardando, h.kpis.descartadas_ia], [2, 2, 2]);
  // a fila e o teto são os de sempre: o filtro não chama a IA
  assert.equal((a.tabelas.LIC_ANALISES || []).length, 3);
});

test('"não é trava" no fora do ramo devolve à lista principal; Trazer de volta pede motivo e fica no histórico; a nota mínima é configurável com versão', () => {
  const a = ambienteIA();
  abas(a);
  // a Diretoria diz "não é trava" no FORA_DO_CATALOGO: o veredito é refeito (decisões mudaram)
  a.op('fora').TRAVAS_DECISOES_JSON = JSON.stringify({ TF: { decisao: 'NAO_E_TRAVA', assinatura: 'as1' } });
  assert.ok(ids(a, 'analisar').includes('fora'));
  // trazer de volta
  assert.match(a.api('s_dora', 'trazerDeVolta', { id: 'n30', motivo: 'curto' }).message, /pelo menos 10 letras/);
  a.ok(a.api('s_dora', 'trazerDeVolta', { id: 'n30', motivo: 'a margem baixou a nota; o escopo é do ramo' }));
  assert.ok(ids(a, 'analisar').includes('n30'));
  const h = a.hist('TRAZIDA_DE_VOLTA')[0];
  assert.match(h.TEXTO, /Trazida de volta pela Diretoria: a margem baixou a nota.*Nota 30 abaixo do mínimo 40/);
  assert.equal(h.USUARIO_NOME, 'DORA DIRETORA TESTE');
  assert.match(a.api('s_dora', 'trazerDeVolta', { id: 'n30', motivo: 'de novo, já está na lista' }).message, /já está na lista principal/);
  a.ok(a.api('s_dora', 'trazerDeVolta', { id: 'rec', motivo: 'a IA não concluiu; olhar o edital à mão' }));
  assert.ok(ids(a, 'analisar').includes('rec'), 'quem a IA não conclui também pode ser trazida (nunca no limbo)');
  // nota mínima configurável
  assert.match(a.api('s_dora', 'ramo', { op: 'filtroIA', ligado: true, notaMinima: 25, motivo: '' }).message, /motivo da mudança/);
  assert.match(a.api('s_dora', 'ramo', { op: 'filtroIA', ligado: true, notaMinima: 0, motivo: 'teste da faixa' }).message, /1 a 100/);
  const s = a.ok(a.api('s_dora', 'ramo', { op: 'filtroIA', ligado: true, notaMinima: 60, motivo: 'subir a régua para testar' }));
  assert.equal(s.versao, 1);
  assert.ok(ids(a, 'descartadas_ia').includes('n55'), 'nota 55 abaixo de 60');
  a.ok(a.api('s_dora', 'ramo', { op: 'filtroIA', ligado: false, notaMinima: 60, motivo: 'desligar o filtro para conferir' }));
  const r = abas(a);
  assert.equal(r.contagens.aguardando + r.contagens.descartadas_ia, 0, 'desligado: tudo na lista principal');
  assert.equal(a.hist('FILTRO_IA_CONFIG').length, 2);
});

test('sem a chave da IA o segundo filtro não esconde nada (operador nunca no limbo)', () => {
  const a = ambienteIA({ semChave: true });
  const r = abas(a);
  assert.deepEqual([r.contagens.analisar, r.contagens.aguardando, r.contagens.descartadas_ia], [6, 0, 0]);
  assert.equal(r.filtroIA.ativo, false);
});

// ---------------------------------------------------------------- 5. tipo de serviço
test('tipo de serviço: pela triagem, confirmado ou corrigido pela análise; filtro da lista e do Painel', () => {
  const a = ambienteIA({ semChave: true });
  abas(a);   // acerta o veredito da IA (tipo pela análise)
  assert.deepEqual(a.ctx.Lic_tipoDe_(a.op('n55')).origem, 'CORRIGIDO', 'triagem dizia calibração; a análise, qualificação');
  assert.equal(a.op('n55').TIPO_SERVICO_IA, 'qualificacao');
  assert.deepEqual([a.ctx.Lic_tipoDe_(a.op('sem')).codigo, a.ctx.Lic_tipoDe_(a.op('sem')).origem], ['calibracao', 'TRIAGEM']);
  assert.equal(a.ctx.Lic_tipoDe_(a.op('curto')).codigo, '', 'sem triagem nova e sem análise: não classificado');
  assert.equal(a.op('fora').TIPO_SERVICO_IA, 'outro', 'fora do ramo pela análise = outro');
  assert.equal(a.ctx.Lic_tipoDaAnalise_([{ grau: 'MEDIA', servico: 'MP_AUTOCLAVE_GRANDE' }, { grau: 'ALTA', servico: 'NR13-002' }, { grau: 'NAO_ATENDE', servico: 'CAL-001' }]), 'nr13');
  assert.equal(a.ctx.Lic_tipoDaAnalise_([{ grau: 'BAIXA', servico: 'CAL-001' }]), '');
  const r = a.ok(a.api('s_dora', 'oportunidades', { aba: 'analisar', tipo: 'qualificacao' }));
  assert.deepEqual(Array.from(r.lista.map((x) => x.id)), ['n55']);
  assert.equal(r.lista[0].tipoNome, 'Qualificação e validação');
  assert.equal(a.ok(a.api('s_dora', 'oportunidades', { aba: 'analisar', tipo: 'NC' })).lista.length, 2);
  const pn = a.ok(a.api('s_dora', 'painel', {}));
  const n = {}; pn.tipos.itens.forEach((x) => { n[x.codigo] = x.n; });
  assert.deepEqual([n.calibracao, n.qualificacao, n.outro, n.NC], [2, 1, 1, 3]);
  assert.match(pn.tipos.fonte, /TIPO_SERVICO_TRIAGEM/);
  const pq = a.ok(a.api('s_dora', 'painel', { tipo: 'qualificacao' }));
  assert.equal(pq.etapas.andamento, 1, 'com o filtro, os números do Painel contam só o tipo');
});

// ---------------------------------------------------------------- 6. ligações, ajuda, manual e assistente
test('ligações: menu, navegação, tela, abas da lista, ajuda da tela, manual e base do assistente; terminação de linha preservada', () => {
  const idx = lerCru('Index.html'), js = lerCru('JS_Licitacoes.html'), rm = lerCru('JS_Licitacoes_Ramo.html');
  assert.match(idx, /data-mod="licitacoes_ramo"[^>]*onclick="abrir\('licitacoes_ramo'\)"[^>]*>.*Revisar o filtro do ramo<\/button>/);
  assert.match(idx, /include\('JS_Licitacoes_Ramo'\)/);
  assert.match(js, /\["licitacoes_ramo", "Filtro do ramo"\]/);
  assert.match(js, /licitacoes_ramo: "Revisar o filtro do ramo"/);
  assert.match(js, /LIC\.mod === "licitacoes_ramo"\) \{ if \(typeof LicRm_renderTela_ === "function"\)/);
  assert.match(js, /\["aguardando", "Aguardando a análise"\]/); assert.match(js, /\["descartadas_ia", "Descartadas pela IA"\]/);
  assert.match(js, /data-lic-trazer/); assert.match(js, /licMotivoPadrao/); assert.match(js, /licFTipo/); assert.match(js, /licPnTipo/);
  assert.match(rm, /function LicRm_renderTela_\(\)/);
  assert.ok(!/text-align:\s*left/.test(rm), 'a tela não sobrescreve a régua do texto justificado');
  const a = ambienteCasos();
  const aj = a.ctx.SGO_ajudaTelas_Licitacoes_().licitacoes_ramo;
  assert.ok(aj && /filtro do ramo/i.test(aj.titulo), 'ajuda da tela');
  assert.ok(a.ctx.SGO_AJUDA_NOMES.licitacoes_ramo);
  const op = a.ctx.SGO_ajudaTelas_Licitacoes_().licitacoes_oportunidades;
  assert.match(JSON.stringify(op), /Aguardando a análise/); assert.match(JSON.stringify(op), /Descartadas pela IA/); assert.match(JSON.stringify(op), /Fora do ramo/);
  const man = fs.readFileSync(path.join(raiz, 'docs/MANUAL_MODULO_LICITACOES.md'), 'utf8');
  assert.match(man, /Revisar o filtro do ramo/); assert.match(man, /Descartadas pela IA/); assert.match(man, /tipo de serviço/i);
  assert.match(lerCru('SGO_AssistenteManuais.js'), /Revisar o filtro do ramo/);
  for (const f of ['SGO_Licitacoes_Ramo.js', 'JS_Licitacoes_Ramo.html', 'SGO_Licitacoes.js', 'SGO_Licitacoes_Config.js', 'SGO_Licitacoes_Painel.js', 'JS_Licitacoes.html', 'Index.html', 'SGO_Ajuda.js', 'SGO_Ajuda_Licitacoes.js', 'SGO_AssistenteManuais.js']) {
    assert.ok(!/[^\r]\n/.test(lerCru(f)), f + ' em CRLF');
  }
});
