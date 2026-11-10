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
  const leituras = {}, ordem = [];
  const ctx = vm.createContext({
    console, Date, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt, Buffer,
    Utilities: criarUtilities({ computeDigest: (alg, texto) => Array.from(crypto.createHash('sha256').update(String(texto), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)), DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF-8' } }),
    Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) },
    CacheService: { getScriptCache: () => ({ get: () => '1', put() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() { if (o.naTrava) o.naTrava(tabelas); }, releaseLock() {} }) },
    SGO_DATA: {
      getAll: (t) => { leituras[t] = (leituras[t] || 0) + 1; return (tabelas[t] || []).map((r) => Object.assign({}, r)); },
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (r) Object.assign(r, d); return !!r; },
      insert: (t, d) => { const r = Object.assign({ ID: 'n' + (++seq) }, d); (tabelas[t] = tabelas[t] || []).push(r); ordem.push('insert:' + t + ':' + d.TIPO + ':' + d.ENTIDADE_ID); return Object.assign({}, r); },
      remove: (t, id) => { ordem.push('remove:' + id); if ((o.removeFalha || []).includes(id)) throw new Error('planilha ocupada'); const i = (tabelas[t] || []).findIndex((x) => String(x.ID) === String(id)); if (i < 0) return false; tabelas[t].splice(i, 1); return true; }
    },
    SGO_execucaoInterna_: () => o.interna !== false
  });
  for (const f of ['SGO_Licitacoes_Config.js', 'SGO_Licitacoes.js', 'SGO_Licitacoes_Analise.js', 'SGO_Licitacoes_Guarda.js']) vm.runInContext(ler(f), ctx, { filename: f });
  return { ctx, tabelas, leituras, ordem, ids: () => tabelas.LIC_OPORTUNIDADES.map((l) => l.ID) };
}

test('guarda no legado: regras 1 e 2 ficam (e vão protegidas ao servidor); 2 anos e 1 ano saem com o resumo no histórico; prévia só conta', () => {
  const a = ambiente();
  const p = a.ctx.Lic_guarda_({ previa: true, hoje: '2026-11-02' });
  assert.equal(JSON.stringify(p.saem), JSON.stringify({ regra2: 1, regra3: 1 }));
  assert.equal(JSON.stringify(p.ficam), JSON.stringify({ regra1: 4, regra2: 1, regra3: 1 }));
  assert.match(p.texto, /prévia, nada apagado[\s\S]*Sairiam de LIC_OPORTUNIDADES: 1 pela regra 2 e 1 pela regra 3/);
  assert.equal(a.ids().join(','), 'A,B,C,D,E,F,G,H', 'a prévia não apaga nada');
  assert.equal(a.tabelas.LIC_HISTORICO.length, 2);

  const lidasAntes = a.leituras.LIC_HISTORICO;
  const r = a.ctx.Lic_guarda_({ hoje: '2026-11-02' });
  assert.equal(a.ids().join(','), 'B,C,D,F,G,H');
  assert.equal([...r.protegidas].sort().join(','), 'PNCP:B,PNCP:C,PNCP:D,PNCP:G,PNCP:H', 'regras 1 e 2 protegidas; regra 3 não');
  assert.equal([...r.existentes].sort().join(','), 'PNCP:B,PNCP:C,PNCP:D,PNCP:F,PNCP:G,PNCP:H', 'tudo que ficou na aba vai em existentes (o servidor nunca apaga a contratação delas)');
  assert.equal(r.linhasLegado, 6);
  // revisão: o registro vem antes da remoção
  assert.ok(a.ordem.indexOf('insert:LIC_HISTORICO:SAIU_PELA_GUARDA:A') < a.ordem.indexOf('remove:A'));
  // revisão: o histórico é lido uma vez no começo, uma por lote e uma no fim (não uma vez por linha)
  assert.ok(a.leituras.LIC_HISTORICO - lidasAntes <= 4, 'leituras do histórico (reconciliação, início, um lote, fim): ' + (a.leituras.LIC_HISTORICO - lidasAntes));
  const saiu = a.tabelas.LIC_HISTORICO.filter((h) => h.TIPO === 'SAIU_PELA_GUARDA');
  assert.equal(saiu.map((h) => h.ENTIDADE_ID).join(','), 'E,A', 'de baixo para cima');
  const saiuA = saiu.find((h) => h.ENTIDADE_ID === 'A'), saiuE = saiu.find((h) => h.ENTIDADE_ID === 'E');
  assert.match(saiuA.TEXTO, /^Regra 2 da guarda: candidata ou travada nunca tocada pela Diretoria, publicada há mais de 2 anos\. Resumo: \{"orgao":"ÓRGÃO A","objeto":"Calibração A","valor":1000,"uf":"GO"/);
  assert.match(saiuA.TEXTO, /"numeroControlePncp":"A","hash":"hA"/);
  assert.match(saiuE.TEXTO, /^Regra 3 da guarda: descartada só pela regra do radar/);
  assert.equal(saiuA.HASH, 'hA');
  assert.equal(saiuA.FONTE, 'GUARDA-2026-11-02');
  assert.equal(saiuA.USUARIO_NOME, 'Regra de guarda (manutenção semanal)');
  assert.ok(a.tabelas.LIC_HISTORICO.find((h) => h.ID === 'h2'), 'o histórico antigo da que saiu não é apagado');
  // segunda rodada: nada mais sai
  const r2 = a.ctx.Lic_guarda_({ hoje: '2026-11-02' });
  assert.equal(r2.saem.regra2 + r2.saem.regra3, 0);
  // só execução interna
  assert.equal(ambiente({ interna: false }).ctx.Lic_guarda_({ hoje: '2026-11-02' }), null);
});

test('revisão: linha que ia sair e não saiu (tocada agora há pouco, ou remoção falhou) continua protegida e nas existentes', () => {
  // durante a trava, a Diretoria abre um arquivo da A (candidata vencida): ela não sai; a E falha ao remover
  const a = ambiente({ removeFalha: ['E'], naTrava: (t) => { if (!t.LIC_HISTORICO.some((h) => h.ID === 'hx')) t.LIC_HISTORICO.push({ ID: 'hx', ENTIDADE: 'OPORTUNIDADE', ENTIDADE_ID: 'A', TIPO: 'ARQUIVO_ABERTO', USUARIO_ID: 'u_dir' }); } });
  const r = a.ctx.Lic_guarda_({ hoje: '2026-11-02' });
  assert.equal(a.ids().join(','), 'A,B,C,D,E,F,G,H', 'nada saiu');
  assert.ok(r.protegidas.includes('PNCP:A'), 'A tocada agora: protegida (regra 1)');
  assert.ok(r.existentes.includes('PNCP:A') && r.existentes.includes('PNCP:E'), 'as duas continuam em existentes');
  assert.equal(r.saem.regra2 + r.saem.regra3, 0);
  assert.match(r.falhas.join(' '), /LIC-E: planilha ocupada/);
  assert.equal(a.tabelas.LIC_HISTORICO.filter((h) => h.TIPO === 'GUARDA_FALHOU').map((h) => h.ENTIDADE_ID).join(','), 'E');
  assert.match(r.texto, /1 falha\(s\), que continuam protegidas/);
  // prévia: o que sairia não vai nas existentes (o servidor conta junto o que sairia)
  const p = ambiente().ctx.Lic_guarda_({ previa: true, hoje: '2026-11-02' });
  assert.equal([...p.existentes].sort().join(','), 'PNCP:B,PNCP:C,PNCP:D,PNCP:F,PNCP:G,PNCP:H');
});

test('revisão 2: lotes de 20 com a trava solta entre eles, de baixo para cima; tempo máximo deixa o resto para depois; registro de saída sem remoção é estornado', () => {
  // 45 candidatas intocadas vencidas: 3 lotes (20, 20, 5), cada um numa trava
  const muitas = [];
  for (let i = 0; i < 45; i++) muitas.push({ ID: 'M' + i, CODIGO: 'LIC-M' + i, CHAVE_FONTE: 'PNCP:M' + i, SITUACAO: 'RADAR', TRIAGEM: 'CANDIDATA', PUBLICACAO_EM: '2024-01-01T12:00:00Z', VERSAO_HASH: 'h' + i });
  let travas = 0;
  const a = ambiente({ naTrava: () => { travas++; } });
  a.tabelas.LIC_OPORTUNIDADES.push(...muitas);
  const r = a.ctx.Lic_guarda_({ hoje: '2026-11-02' });
  assert.equal(r.saem.regra2, 46, 'as 45 e a A');
  assert.equal(travas, 1 + 3, 'reconciliação + 3 lotes de até 20');
  const removidas = a.ordem.filter((x) => x.startsWith('remove:')).map((x) => x.slice(7));
  assert.deepEqual(removidas.slice(0, 3), ['M44', 'M43', 'M42'], 'de baixo para cima');
  // tempo máximo: o que não coube fica para a próxima semana, sem registro de saída
  const b = ambiente();
  b.tabelas.LIC_OPORTUNIDADES.push(...muitas.map((m) => Object.assign({}, m)));
  const rb = b.ctx.Lic_guarda_({ hoje: '2026-11-02', tempoMs: -1 });
  assert.equal(rb.cortada, 47, "as 45, a A e a E");
  assert.equal(b.tabelas.LIC_HISTORICO.filter((h) => h.TIPO === 'SAIU_PELA_GUARDA').length, 0);
  assert.match(rb.texto, /47 ficaram para a próxima semana/);
  assert.ok(rb.protegidas.includes('PNCP:M0') && rb.existentes.includes('PNCP:M0'), 'o que ficou continua protegido');
  // execução anterior cortada entre o registro e a remoção: estorno no início (uma vez só)
  const c = ambiente();
  c.tabelas.LIC_HISTORICO.push({ ID: 'hs', ENTIDADE: 'OPORTUNIDADE', ENTIDADE_ID: 'B', TIPO: 'SAIU_PELA_GUARDA', USUARIO_ID: '', DATA: '2026-10-26T09:30:00.000Z' });
  const rc = c.ctx.Lic_guarda_({ hoje: '2026-11-02' });
  assert.equal(rc.estornos, 1);
  const est = c.tabelas.LIC_HISTORICO.filter((h) => h.TIPO === 'GUARDA_ESTORNO');
  assert.equal(est.length, 1);
  assert.equal(est[0].ENTIDADE_ID, 'B');
  assert.match(est[0].TEXTO, /não chegou a remover a linha \(execução cortada\)/);
  assert.equal(c.ctx.Lic_guarda_({ hoje: '2026-11-02' }).estornos, 0, 'não estorna duas vezes');
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
