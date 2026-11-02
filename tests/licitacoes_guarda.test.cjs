// SGO+ Licitações: regra de guarda (aprovada pelo dono em 02/11/2026) nas abas do legado (SGO_Licitacoes_Guarda.js).
// Prova que nada da regra 1 (a Diretoria mexeu: situação, descarte manual, reabertura, responsável ou qualquer ato de pessoa
// no histórico) nem da regra 2 (candidata/travada intocada dentro dos 2 anos) sai; que a candidata intocada com mais de
// 2 anos e a descartada só pela regra com mais de 1 ano saem de LIC_OPORTUNIDADES com o resumo no LIC_HISTORICO; que a
// lista de protegidas que vai ao servidor tem as regras 1 e 2; que a prévia só conta; e que só roda por execução interna.
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

const base = (id, extra) => Object.assign({ ID: id, CODIGO: 'LIC-' + id, CHAVE_FONTE: 'PNCP:' + id, NUMERO_CONTROLE_PNCP: id, ORGAO_NOME: 'ÓRGÃO ' + id, OBJETO: 'Calibração ' + id, VALOR_ESTIMADO: 1000, UF: 'GO',
  MODALIDADE: 'Pregão', ENCERRAMENTO_PROPOSTAS: '2024-06-10T09:00:00', VERSAO_FONTE: 1, VERSAO_HASH: 'h' + id, SITUACAO: 'RADAR', TRIAGEM: 'CANDIDATA' }, extra);
function ambiente(o) {
  o = o || {};
  const tabelas = {
    LIC_OPORTUNIDADES: [
      base('A', { PUBLICACAO_EM: '2024-05-01T12:00:00Z' }),                                      // regra 2 vencida: sai
      base('B', { PUBLICACAO_EM: '2025-05-01T12:00:00Z', TRIAGEM: 'TRAVADA' }),                   // regra 2 dentro: fica e é protegida
      base('C', { PUBLICACAO_EM: '2023-01-01T12:00:00Z' }),                                      // antiga, mas a Diretoria abriu o arquivo: regra 1
      base('D', { PUBLICACAO_EM: '2022-01-01T12:00:00Z', SITUACAO: 'ANALISE' }),                  // regra 1
      base('E', { PUBLICACAO_EM: '2025-06-01T12:00:00Z', SITUACAO: 'DESCARTADA', TRIAGEM: 'DESCARTADA', DESCARTE_ORIGEM: 'REGRA' }),   // regra 3 vencida: sai
      base('F', { PUBLICACAO_EM: '2026-08-01T12:00:00Z', SITUACAO: 'DESCARTADA', TRIAGEM: 'DESCARTADA', DESCARTE_ORIGEM: 'REGRA' }),   // regra 3 dentro: fica, sem proteção
      base('G', { PUBLICACAO_EM: '2020-01-01T12:00:00Z', SITUACAO: 'DESCARTADA', DESCARTE_ORIGEM: 'PESSOA' }),                         // descarte da Diretoria: regra 1
      base('H', { PRIMEIRA_COLETA_EM: '2020-01-01T12:00:00Z', DESCARTE_ORIGEM: 'REABERTA' })                                           // reaberta: regra 1 (sem publicação, vale a coleta)
    ],
    LIC_HISTORICO: [{ ID: 'h1', ENTIDADE: 'OPORTUNIDADE', ENTIDADE_ID: 'C', TIPO: 'ARQUIVO_ABERTO', USUARIO_ID: 'u_dir', USUARIO_NOME: 'Dora' },
      { ID: 'h2', ENTIDADE: 'OPORTUNIDADE', ENTIDADE_ID: 'A', TIPO: 'ENTROU_NO_RADAR', USUARIO_ID: '', USUARIO_NOME: 'Coletor' }]
  };
  let seq = 0;
  const ctx = vm.createContext({
    console, Date, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt, Buffer,
    Utilities: criarUtilities({ computeDigest: (alg, texto) => Array.from(crypto.createHash('sha256').update(String(texto), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)), DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF-8' } }),
    Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) },
    CacheService: { getScriptCache: () => ({ get: () => '1', put() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SGO_DATA: {
      getAll: (t) => (tabelas[t] || []).map((r) => Object.assign({}, r)),
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (r) Object.assign(r, d); return !!r; },
      insert: (t, d) => { const r = Object.assign({ ID: 'n' + (++seq) }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
      remove: (t, id) => { const i = (tabelas[t] || []).findIndex((x) => String(x.ID) === String(id)); if (i < 0) return false; tabelas[t].splice(i, 1); return true; }
    },
    SGO_execucaoInterna_: () => o.interna !== false
  });
  for (const f of ['SGO_Licitacoes_Config.js', 'SGO_Licitacoes.js', 'SGO_Licitacoes_Analise.js', 'SGO_Licitacoes_Guarda.js']) vm.runInContext(ler(f), ctx, { filename: f });
  return { ctx, tabelas, ids: () => tabelas.LIC_OPORTUNIDADES.map((l) => l.ID) };
}

test('guarda no legado: regras 1 e 2 ficam (e vão protegidas ao servidor); 2 anos e 1 ano saem com o resumo no histórico; prévia só conta', () => {
  const a = ambiente();
  const p = a.ctx.Lic_guarda_({ previa: true, hoje: '2026-11-02' });
  assert.equal(JSON.stringify(p.saem), JSON.stringify({ regra2: 1, regra3: 1 }));
  assert.equal(JSON.stringify(p.ficam), JSON.stringify({ regra1: 4, regra2: 1, regra3: 1 }));
  assert.match(p.texto, /prévia, nada apagado[\s\S]*Sairiam de LIC_OPORTUNIDADES: 1 pela regra 2 e 1 pela regra 3/);
  assert.equal(a.ids().join(','), 'A,B,C,D,E,F,G,H', 'a prévia não apaga nada');
  assert.equal(a.tabelas.LIC_HISTORICO.length, 2);

  const r = a.ctx.Lic_guarda_({ hoje: '2026-11-02' });
  assert.equal(a.ids().join(','), 'B,C,D,F,G,H');
  assert.equal([...r.protegidas].sort().join(','), 'PNCP:B,PNCP:C,PNCP:D,PNCP:G,PNCP:H', 'regras 1 e 2 protegidas; regra 3 não');
  const saiu = a.tabelas.LIC_HISTORICO.filter((h) => h.TIPO === 'SAIU_PELA_GUARDA');
  assert.equal(saiu.map((h) => h.ENTIDADE_ID).join(','), 'A,E');
  assert.match(saiu[0].TEXTO, /^Regra 2 da guarda: candidata ou travada nunca tocada pela Diretoria, publicada há mais de 2 anos\. Resumo: \{"orgao":"ÓRGÃO A","objeto":"Calibração A","valor":1000,"uf":"GO"/);
  assert.match(saiu[0].TEXTO, /"numeroControlePncp":"A","hash":"hA"/);
  assert.match(saiu[1].TEXTO, /^Regra 3 da guarda: descartada só pela regra do radar/);
  assert.equal(saiu[0].HASH, 'hA');
  assert.equal(saiu[0].FONTE, 'GUARDA-2026-11-02');
  assert.equal(saiu[0].USUARIO_NOME, 'Regra de guarda (manutenção semanal)');
  assert.ok(a.tabelas.LIC_HISTORICO.find((h) => h.ID === 'h2'), 'o histórico antigo da que saiu não é apagado');
  // segunda rodada: nada mais sai
  const r2 = a.ctx.Lic_guarda_({ hoje: '2026-11-02' });
  assert.equal(r2.saem.regra2 + r2.saem.regra3, 0);
  // só execução interna
  assert.equal(ambiente({ interna: false }).ctx.Lic_guarda_({ hoje: '2026-11-02' }), null);
});

test('guarda: a sincronização grava a data de publicação (conta os 2 anos); manual e doc 00 trazem a regra', () => {
  const src = ler('SGO_Licitacoes.js');
  assert.match(src, /PUBLICACAO_EM: Lic_s_\(c\.publicacaoEm\)/);
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_LICITACOES.md'), 'utf8');
  assert.match(manual, /Regra de guarda/);
  assert.match(manual, /para sempre/i);
  const doc00 = fs.readFileSync(path.join(__dirname, '../docs/LICITACOES_00_MISSAO_DIRETORIA_20261101.md'), 'utf8');
  assert.match(doc00, /Prazo de guarda \(aprovado\)/);
  assert.match(ler('SGO_AssistenteManuais.js'), /Regra de guarda/);
});
