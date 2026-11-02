// SGO+ Licitações, etapa 4 (02/11/2026): Kanban (colunas por etapa, filtros, transições só as que existem, sempre com motivo
// e histórico; colunas futuras desabilitadas com o porquê), Gantt (prazos de LIC_EVENTOS no tempo, natureza, janela semana/mês)
// e Painel (números com a fonte; os prazos batem com a Agenda e os alertas com a Central), permissão só da Diretoria e do
// Administrador, telas no computador e no celular (390 px) e desempenho com 260 oportunidades e mais de 500 prazos.
// Código real do SGO+ num contexto isolado; dados públicos do PNCP já usados nos docs 02 e 03 (Unioeste/Cascavel, IMBEL);
// pessoas fictícias. Nenhuma chamada de rede.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { ambiente: ambMatriz, pastaLegado } = require('./_matriz_ambiente.cjs');
const ler = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n');

const USUARIOS = [
  { ID: 'u_cha', USUARIO: 'charles', NOME: 'CHARLES DIRETOR TESTE', PERFIL: 'DIRETORIA', STATUS: 'ATIVO', EMAIL: 'charles@exemplo.test', CELULAR: '62999990021', AREA: 'DIRETORIA' },
  { ID: 'u_thi', USUARIO: 'admin', NOME: 'THIAGO DONO TESTE', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: 'thiago@exemplo.test', CELULAR: '62999990022', AREA: 'DIRETORIA' },
  { ID: 'u_gil', USUARIO: 'gil', NOME: 'GIL GESTOR TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'gil@exemplo.test', AREA: 'TECNICA' },
  { ID: 'u_vera', USUARIO: 'vera', NOME: 'VERA COMERCIAL TESTE', PERFIL: 'COMERCIAL', STATUS: 'ATIVO', EMAIL: 'vera@exemplo.test', AREA: 'COMERCIAL' }
];
const ARQ_LIC = ['SGO_Licitacoes_Config.js', 'SGO_Licitacoes.js', 'SGO_Licitacoes_Analise.js', 'SGO_Licitacoes_Agenda.js', 'SGO_Licitacoes_Alertas.js', 'SGO_Licitacoes_Painel.js', 'SGO_WhatsappPiloto.js', 'SGO_Ajuda.js', 'SGO_Ajuda_Licitacoes.js'];
const AGORA = '2026-11-02T10:00:00-03:00';

const OP = (id, extra) => Object.assign({ ID: id, CODIGO: 'LIC-2026-' + id.slice(-4), CHAVE_FONTE: 'PNCP:' + id, SITUACAO: 'RADAR', TRIAGEM: 'CANDIDATA', LEI: '14133', MODALIDADE: 'Pregão - Eletrônico',
  PORTAL_SESSAO: 'PUB-002', PORTAL_ORIGEM: 'PNCP', UF: 'PR', MUNICIPIO: 'Cascavel', ORGAO_NOME: 'UNIVERSIDADE ESTADUAL DO OESTE DO PARANA', NUMERO_CONTROLE_PNCP: '78680337000770-1-000430/2026',
  OBJETO: 'Manutenção preventiva e corretiva com certificado de calibração de equipamentos de laboratório do campus de Cascavel, com fornecimento de peças, mão de obra especializada e emissão de certificados rastreáveis à RBC', VALOR_ESTIMADO: 98765.43,
  ABERTURA_PROPOSTAS: '2026-10-20T08:00:00', ENCERRAMENTO_PROPOSTAS: '2026-11-04T08:30:00', ENCERRAMENTO_ISO: '2026-11-04T11:30:00.000Z', FUSO_PRESUMIDO: 'SIM', VERSAO_FONTE: 1, VERSAO_HASH: 'h1',
  SITUACAO_FONTE: 'Divulgada no PNCP', AMPARO_LEGAL: 'Lei 14.133/2021, Art. 28, I', SITUACAO_DESDE: '2026-11-01T22:00:00.000Z' }, extra || {});
const IMBEL = (id, extra) => OP(id, Object.assign({ SITUACAO: 'ANALISE', RESPONSAVEL_ID: 'u_cha', RESPONSAVEL_NOME: 'CHARLES DIRETOR TESTE', LEI: '13303', AMPARO_LEGAL: 'Lei 13.303/2016, Art. 32, IV', PORTAL_SESSAO: 'PUB-004',
  UF: 'RJ', MUNICIPIO: 'Magé', ORGAO_NOME: 'INDUSTRIA DE MATERIAL BELICO DO BRASIL IMBEL', NUMERO_CONTROLE_PNCP: '00444232000139-1-001311/2026', OBJETO: 'Inspeção de Segurança, NR-13, em vasos de pressão da Fábrica da Estrela',
  ENCERRAMENTO_PROPOSTAS: '2026-11-13T08:00:00', ENCERRAMENTO_ISO: '2026-11-13T11:00:00.000Z', NOTA: 55.5, NOTA_CLASSE: 'MEDIA', TRAVAS_A_CONFIRMAR: 1 }, extra || {}));

/** O conjunto do Kanban: uma em cada situação que existe hoje (e uma de cada origem de descarte). */
function opsBase() {
  return [
    OP('op_casc'),                                                                                                  // Radar, candidata, PR, prazo em 2 dias
    OP('op_ansn', { TRIAGEM: 'TRAVADA', UF: 'RJ', MUNICIPIO: 'Rio de Janeiro', ORGAO_NOME: 'AUTORIDADE NACIONAL DE SEGURANCA NUCLEAR', OBJETO: 'Calibração das balanças da DIRAD', ENCERRAMENTO_PROPOSTAS: '2026-11-09T08:00:00', ENCERRAMENTO_ISO: '2026-11-09T11:00:00.000Z' }),
    OP('op_goia', { UF: 'GO', MUNICIPIO: 'Goiânia', ORGAO_NOME: 'SECRETARIA DE ESTADO DA SAUDE DE GOIAS', NOTA: 81, NOTA_CLASSE: 'ALTA', ENCERRAMENTO_PROPOSTAS: '2026-11-25T09:00:00', ENCERRAMENTO_ISO: '2026-11-25T12:00:00.000Z' }),
    OP('op_venc', { UF: 'SP', MUNICIPIO: 'Campinas', ORGAO_NOME: 'MUNICIPIO DE CAMPINAS', ENCERRAMENTO_PROPOSTAS: '2026-10-30T09:00:00', ENCERRAMENTO_ISO: '2026-10-30T12:00:00.000Z' }),
    OP('op_sem0', { UF: 'BA', MUNICIPIO: 'Salvador', ORGAO_NOME: 'HOSPITAL UNIVERSITARIO DA BAHIA', ENCERRAMENTO_PROPOSTAS: '', ENCERRAMENTO_ISO: '' }),
    IMBEL('op_imbe'),                                                                                               // Em análise, trava a confirmar, Charles
    IMBEL('op_imb2', { RESPONSAVEL_ID: 'u_thi', RESPONSAVEL_NOME: 'THIAGO DONO TESTE', NOTA: 40, NOTA_CLASSE: 'BAIXA', TRAVAS_A_CONFIRMAR: 0, UF: 'DF', MUNICIPIO: 'Brasília' }),
    OP('op_desp', { SITUACAO: 'DESCARTADA', DESCARTE_ORIGEM: 'PESSOA', DESCARTE_MOTIVO: 'Escopo é fornecimento de peças, não serviço', DESCARTE_POR_NOME: 'CHARLES DIRETOR TESTE', DESCARTE_EM: '2026-11-01T20:00:00.000Z' }),
    OP('op_desr', { SITUACAO: 'DESCARTADA', TRIAGEM: 'DESCARTADA', DESCARTE_ORIGEM: 'REGRA', DESCARTE_MOTIVO: 'Descartada pela regra: castração', ORGAO_NOME: 'MUNICIPIO DE CAJAMAR', UF: 'SP' })
  ];
}

function ambiente(o) {
  o = o || {};
  const a = ambMatriz({ agora: Date.parse(o.agora || AGORA), extras: ARQ_LIC, tabelas: Object.assign({ CAD_USUARIOS: USUARIOS.map((u) => Object.assign({}, u)), NTF_GESTAO: [] }, o.tabelas || {}),
    props: Object.assign({ NTF_MODELOS_SITUACAO: JSON.stringify({ modelos: { sgo_licitacao_prazo: 'APPROVED' } }) }, o.props || {}) });
  a.ctx.Utilities.computeDigest = (alg, texto) => Array.from(crypto.createHash('sha256').update(String(texto), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b));
  a.ctx.Utilities.DigestAlgorithm = { SHA_256: 'SHA_256' }; a.ctx.Utilities.Charset = { UTF_8: 'UTF-8' };
  const gatilho = { timeBased: () => gatilho, everyMinutes: () => gatilho, everyHours: () => gatilho, everyDays: () => gatilho, atHour: () => gatilho, nearMinute: () => gatilho, create() {} };
  a.ctx.ScriptApp.newTrigger = () => gatilho;
  Object.assign(a.sessoes, { s_cha: { userId: 'u_cha', usuario: 'charles', nome: 'CHARLES DIRETOR TESTE', perfil: 'DIRETORIA' }, s_thi: { userId: 'u_thi', usuario: 'admin', nome: 'THIAGO DONO TESTE', perfil: 'ADMIN' },
    s_gil: { userId: 'u_gil', usuario: 'gil', nome: 'GIL GESTOR TESTE', perfil: 'GESTOR' }, s_vera: { userId: 'u_vera', usuario: 'vera', nome: 'VERA COMERCIAL TESTE', perfil: 'COMERCIAL' } });
  a.ctx.Lic_garantirAbas_();
  (o.ops || []).forEach((l) => a.tabelas.LIC_OPORTUNIDADES.push(l));
  a.leituras = {};
  const orig = a.ctx.SGO_DATA.getAll;
  a.ctx.SGO_DATA.getAll = (t) => { a.leituras[t] = (a.leituras[t] || 0) + 1; return orig(t); };
  a.api = (sid, acao, d) => JSON.parse(JSON.stringify(a.ctx.Licitacoes_api(sid, acao, d || {})));
  a.op = (id) => a.tabelas.LIC_OPORTUNIDADES.find((l) => l.ID === id);
  a.hist = (id) => (a.tabelas.LIC_HISTORICO || []).filter((h) => !id || h.ENTIDADE_ID === id);
  return a;
}
const col = (r, c) => r.colunas.find((k) => k.codigo === c);
const ids = (r, c) => col(r, c).cartoes.map((x) => x.id).sort();

// ------------------------------------------------------------------ permissão
test('permissão: Kanban, mover, Gantt e Painel só da Diretoria e do Administrador; as recusas não gravam nada', () => {
  const a = ambiente({ ops: opsBase() });
  for (const sid of ['s_cha', 's_thi']) for (const acao of ['kanban', 'gantt', 'painel']) assert.equal(a.api(sid, acao).ok, true, sid + ' ' + acao);
  const antes = JSON.stringify(a.tabelas.LIC_OPORTUNIDADES), hist = a.hist().length;
  for (const sid of ['s_gil', 's_vera']) for (const acao of ['kanban', 'kanbanMover', 'gantt', 'painel']) {
    const r = a.api(sid, acao, { id: 'op_casc', para: 'ANALISE', motivo: 'tentativa sem permissão' });
    assert.equal(r.ok, false, sid + ' ' + acao); assert.equal(r.semAcesso, true); assert.match(r.message, /Diretoria e do Administrador/);
  }
  assert.equal(JSON.stringify(a.tabelas.LIC_OPORTUNIDADES), antes, 'nada mudou');
  assert.equal(a.hist().length, hist, 'nada foi para o histórico');
});

// ------------------------------------------------------------------ Kanban
test('Kanban: 7 colunas na ordem do pedido do dono, cartão com o que a Diretoria precisa, futuras vazias com o porquê e descartadas pela regra fora do quadro', () => {
  const a = ambiente({ ops: opsBase() });
  const r = a.api('s_cha', 'kanban');
  assert.deepEqual(r.colunas.map((k) => k.nome), ['Radar', 'Em análise', 'Decisão', 'Proposta', 'Disputa', 'Resultado', 'Contrato']);
  assert.deepEqual(ids(r, 'RADAR'), ['op_ansn', 'op_casc', 'op_goia', 'op_sem0', 'op_venc']);
  assert.deepEqual(ids(r, 'ANALISE'), ['op_imb2', 'op_imbe']);
  assert.deepEqual(ids(r, 'DECISAO'), ['op_desp'], 'Decisão = descartadas pela Diretoria');
  assert.equal(r.foraDoQuadro.descartadasRegra, 1, 'a descartada só pela regra fica fora, contada');
  assert.equal(r.total, 8); assert.equal(r.semFiltro, 8);
  for (const c of ['PROPOSTA', 'DISPUTA', 'RESULTADO', 'CONTRATO']) { assert.equal(col(r, c).qtd, 0); assert.match(col(r, c).futura, /^Chega na etapa de /, c); }
  assert.match(col(r, 'PROPOSTA').futura, /etapa de preços e proposta/); assert.match(col(r, 'CONTRATO').futura, /etapa de contratos/);
  // ordem: prazo mais perto primeiro; vencido e sem data no fim
  assert.deepEqual(col(r, 'RADAR').cartoes.map((x) => x.id), ['op_casc', 'op_ansn', 'op_goia', 'op_venc', 'op_sem0']);
  const im = col(r, 'ANALISE').cartoes.find((x) => x.id === 'op_imbe');
  assert.equal(im.orgao, 'INDUSTRIA DE MATERIAL BELICO DO BRASIL IMBEL'); assert.equal(im.uf, 'RJ'); assert.equal(im.encerramentoIso, '2026-11-13T11:00:00.000Z');
  assert.equal(im.nota, 55.5); assert.equal(im.notaClasse, 'MEDIA'); assert.equal(im.travasAConfirmar, 1); assert.equal(im.faixaNota, 'TRAVA'); assert.equal(im.responsavel, 'CHARLES DIRETOR TESTE');
  const ca = col(r, 'RADAR').cartoes.find((x) => x.id === 'op_casc');
  assert.ok(ca.objeto.length <= 160 && ca.objeto.endsWith('…'), 'objeto curto');
  assert.equal(col(r, 'RADAR').cartoes.find((x) => x.id === 'op_ansn').travada, true);
  assert.equal(col(r, 'DECISAO').cartoes[0].descarte.motivo, 'Escopo é fornecimento de peças, não serviço');
  assert.deepEqual(r.responsaveis.map((u) => u.nome), ['CHARLES DIRETOR TESTE', 'THIAGO DONO TESTE']);
});

test('Kanban: filtros de UF (e prioridade), nota, prazo, responsável e busca, feitos no servidor', () => {
  const a = ambiente({ ops: opsBase() });
  const todos = (f) => a.api('s_cha', 'kanban', f).colunas.flatMap((k) => k.cartoes.map((x) => x.id)).sort();
  assert.deepEqual(todos({ uf: 'GO' }), ['op_goia']);
  assert.deepEqual(todos({ uf: 'PRIO' }), ['op_ansn', 'op_goia', 'op_imb2', 'op_imbe', 'op_sem0'], 'GO, DF, vizinhos (BA) e RJ');
  assert.deepEqual(todos({ nota: 'TRAVA' }), ['op_imbe']);
  assert.deepEqual(todos({ nota: 'ALTA' }), ['op_goia']);
  assert.deepEqual(todos({ nota: 'BAIXA' }), ['op_imb2']);
  assert.deepEqual(todos({ nota: 'SEM' }), ['op_ansn', 'op_casc', 'op_desp', 'op_sem0', 'op_venc']);
  assert.deepEqual(todos({ prazo: '7' }), ['op_ansn', 'op_casc', 'op_desp'], 'até 09/11');
  assert.deepEqual(todos({ prazo: '30' }), ['op_ansn', 'op_casc', 'op_desp', 'op_goia', 'op_imb2', 'op_imbe']);
  assert.deepEqual(todos({ prazo: 'VENCIDO' }), ['op_venc']);
  assert.deepEqual(todos({ prazo: 'SEM' }), ['op_sem0']);
  assert.deepEqual(todos({ responsavel: 'u_thi' }), ['op_imb2']);
  assert.deepEqual(todos({ responsavel: 'SEM' }), ['op_ansn', 'op_casc', 'op_desp', 'op_goia', 'op_sem0', 'op_venc']);
  assert.deepEqual(todos({ busca: 'nuclear' }), ['op_ansn']);
  assert.deepEqual(todos({ uf: 'XX', nota: 'QUALQUER', prazo: '99' }).length, 8, 'filtro inválido é ignorado');
  const r = a.api('s_cha', 'kanban', { uf: 'GO' });
  assert.equal(r.total, 1); assert.equal(r.semFiltro, 8); assert.equal(r.filtros.uf, 'GO');
});

test('Kanban: só as transições que existem, sempre com motivo e histórico (fonte Kanban); futuras e saltos recusados com o porquê e "Nada foi alterado"', () => {
  const a = ambiente({ ops: opsBase() });
  const g = a.ctx.Lic_kanbanRegras_();
  assert.equal(g['RADAR>ANALISE'].acao, 'enviarAnalise'); assert.equal(g['RADAR>DECISAO'].acao, 'descartar'); assert.equal(g['ANALISE>DECISAO'].acao, 'descartar'); assert.equal(g['DESCARTADA>RADAR'].acao, 'reabrir');
  assert.match(g['ANALISE>RADAR'].porque, /Não há volta direta/); assert.match(g['DESCARTADA>ANALISE'].porque, /Reabra primeiro/);
  assert.match(g['RADAR>RADAR'].porque, /já está em Radar/); assert.match(g['DESCARTADA>DECISAO'].porque, /já está em Decisão/);
  for (const de of ['RADAR', 'ANALISE', 'DESCARTADA']) for (const p of ['PROPOSTA', 'DISPUTA', 'RESULTADO', 'CONTRATO']) { assert.equal(g[de + '>' + p].acao, undefined); assert.match(g[de + '>' + p].porque, /Chega na etapa de/); }
  assert.match(g.participar.porque, /preço mínimo aprovado/);
  const antes = JSON.stringify(a.tabelas.LIC_OPORTUNIDADES), h0 = a.hist().length;
  // sem motivo, motivo curto, etapa futura, salto, situação velha: nada muda
  for (const [d, re] of [[{ id: 'op_casc', para: 'ANALISE' }, /Escreva o motivo da mudança de etapa.*Nada foi alterado/], [{ id: 'op_casc', para: 'ANALISE', motivo: 'curto' }, /pelo menos 10 letras/],
    [{ id: 'op_casc', para: 'PROPOSTA', motivo: 'quero propor já esta semana' }, /Chega na etapa de preços e proposta.*Nada foi alterado/], [{ id: 'op_imbe', para: 'RADAR', motivo: 'voltar ao radar por engano' }, /Não há volta direta.*Nada foi alterado/],
    [{ id: 'op_casc', para: 'ANALISE', motivo: 'motivo suficiente aqui', situacao: 'ANALISE' }, /alguém mudou agora há pouco.*Nada foi alterado/], [{ id: 'op_casc', para: 'RADAR', motivo: 'mesma coluna de antes' }, /já está em Radar.*Nada foi alterado/]]) {
    const r = a.api('s_cha', 'kanbanMover', d);
    assert.equal(r.ok, false, JSON.stringify(d)); assert.match(r.message, re);
  }
  assert.equal(JSON.stringify(a.tabelas.LIC_OPORTUNIDADES), antes); assert.equal(a.hist().length, h0);
  // Radar -> Em análise
  let r = a.api('s_cha', 'kanbanMover', { id: 'op_casc', para: 'ANALISE', situacao: 'RADAR', motivo: 'Objeto casa com calibração de laboratório' });
  assert.equal(r.ok, true); assert.equal(r.acao, 'enviarAnalise'); assert.match(r.texto, /foi de Radar para Em análise/);
  assert.equal(a.op('op_casc').SITUACAO, 'ANALISE'); assert.equal(a.op('op_casc').RESPONSAVEL_NOME, 'CHARLES DIRETOR TESTE'); assert.equal(a.op('op_casc').ANALISE_OBS, 'Objeto casa com calibração de laboratório');
  let h = a.hist('op_casc').filter((x) => x.TIPO === 'ENVIADA_PARA_ANALISE').pop();
  assert.equal(h.TIPO, 'ENVIADA_PARA_ANALISE'); assert.equal(h.DE, 'RADAR'); assert.equal(h.PARA, 'ANALISE'); assert.equal(h.FONTE, 'Kanban'); assert.equal(h.USUARIO_NOME, 'CHARLES DIRETOR TESTE');
  assert.match(h.TEXTO, /Objeto casa com calibração/); assert.match(h.HASH, /^[0-9a-f]{64}$/);
  // Em análise -> Decisão (descartar)
  r = a.api('s_thi', 'kanbanMover', { id: 'op_casc', para: 'DECISAO', situacao: 'ANALISE', motivo: 'Exige laboratório acreditado RBC' });
  assert.equal(r.ok, true); assert.equal(a.op('op_casc').SITUACAO, 'DESCARTADA'); assert.equal(a.op('op_casc').DESCARTE_ORIGEM, 'PESSOA'); assert.equal(a.op('op_casc').DESCARTE_POR_NOME, 'THIAGO DONO TESTE');
  h = a.hist('op_casc').filter((x) => x.TIPO === 'DESCARTADA_PELA_DIRETORIA').pop(); assert.ok(h); assert.equal(h.FONTE, 'Kanban');
  assert.deepEqual(ids(a.api('s_cha', 'kanban'), 'DECISAO'), ['op_casc', 'op_desp']);
  // Decisão -> Radar (reabrir)
  r = a.api('s_cha', 'kanbanMover', { id: 'op_casc', para: 'RADAR', situacao: 'DESCARTADA', motivo: 'O edital aceita rastreabilidade' });
  assert.equal(r.ok, true); assert.equal(a.op('op_casc').SITUACAO, 'RADAR'); assert.equal(a.hist('op_casc').filter((x) => x.TIPO === 'REABERTA').pop().FONTE, 'Kanban');
  // a lista continua gravando com a fonte de sempre
  assert.equal(a.api('s_cha', 'descartar', { id: 'op_goia', motivo: 'Fora do escopo do laboratório' }).ok, true);
  assert.equal(a.hist('op_goia').filter((x) => x.TIPO === 'DESCARTADA_PELA_DIRETORIA').pop().FONTE, 'Tela Oportunidades');
});

// ------------------------------------------------------------------ Gantt
test('Gantt: prazos de LIC_EVENTOS na janela, com a natureza; sem descartadas e sem versões substituídas; zoom semana e mês; pendentes sem data à parte', () => {
  const a = ambiente({ ops: opsBase() });
  a.ctx.Lic_agendaAtualizar_({ limite: 50 });
  assert.ok(a.tabelas.LIC_EVENTOS.length >= 10);
  // uma versão substituída e um suspenso
  const lim = a.tabelas.LIC_EVENTOS.find((e) => e.OPORTUNIDADE_ID === 'op_casc' && e.TIPO === 'LIMITE_PROPOSTA');
  a.tabelas.LIC_EVENTOS.push(Object.assign({}, lim, { ID: 'ev_velho', SITUACAO: 'RETIFICADO', QUANDO_ISO: '2026-11-03T11:30:00.000Z', VERSAO: 0 }));
  const imp = a.tabelas.LIC_EVENTOS.find((e) => e.OPORTUNIDADE_ID === 'op_ansn' && e.TIPO === 'PRAZO_IMPUGNACAO'); if (imp) imp.SITUACAO = 'SUSPENSO';
  let r = a.api('s_cha', 'gantt', { zoom: 'semana' });
  assert.equal(r.ok, true); assert.equal(r.zoom, 'semana'); assert.equal(r.de, '2026-11-01'); assert.equal(r.ate, '2026-11-09'); assert.equal(r.hoje, '2026-11-02'); assert.equal(r.dias, 9);
  const linhas = r.linhas.map((l) => l.id);
  assert.ok(linhas.includes('op_casc') && linhas.includes('op_ansn'));
  assert.ok(!linhas.includes('op_desp') && !linhas.includes('op_desr'), 'descartadas não entram');
  const casc = r.linhas.find((l) => l.id === 'op_casc');
  const mLim = casc.marcos.find((m) => m.tipo === 'LIMITE_PROPOSTA');
  assert.equal(mLim.natureza, 'CONFIRMADO'); assert.equal(mLim.dia, '2026-11-04'); assert.equal(mLim.hora, '08:30'); assert.equal(mLim.passou, false);
  assert.ok(!casc.marcos.some((m) => m.id === 'ev_velho'), 'versão substituída não aparece');
  assert.equal(casc.inicio, '2026-10-20'); assert.equal(casc.fim, '2026-11-04', 'barra do recebimento das propostas');
  assert.ok(casc.marcos.every((m) => m.dia >= r.de && m.dia <= r.ate));
  if (imp && imp.QUANDO_ISO) { const s = (r.linhas.find((l) => l.id === 'op_ansn') || { marcos: [] }).marcos.find((m) => m.id === imp.ID); if (s) assert.equal(s.situacao, 'SUSPENSO'); }
  assert.ok(r.linhas.some((l) => l.marcos.some((m) => m.natureza === 'CALCULADO')), 'impugnação/esclarecimento calculados aparecem');
  // ordem: o próximo prazo primeiro
  assert.equal(r.linhas[0].id, 'op_casc');
  // mês: janela maior, IMBEL (13/11) entra
  r = a.api('s_cha', 'gantt', { zoom: 'mes' });
  assert.equal(r.de, '2026-10-30'); assert.equal(r.ate, '2026-12-03');
  assert.ok(r.linhas.some((l) => l.id === 'op_imbe'));
  // pendentes sem data (sessão da estatal fora do Compras.gov) ficam à parte
  assert.ok(r.pendentes.some((p) => p.opId === 'op_imbe'), 'sessão da IMBEL sem data fica na lista de pendentes');
  // filtros: etapa, só travadas, natureza, UF; janela deslocada
  assert.deepEqual(a.api('s_cha', 'gantt', { zoom: 'mes', etapa: 'ANALISE' }).linhas.map((l) => l.id).sort(), ['op_imb2', 'op_imbe']);
  assert.deepEqual(a.api('s_cha', 'gantt', { zoom: 'mes', etapa: 'TRAVADAS' }).linhas.map((l) => l.id), ['op_ansn']);
  const so = a.api('s_cha', 'gantt', { zoom: 'mes', natureza: 'CALCULADO' });
  assert.ok(so.linhas.length && so.linhas.every((l) => l.marcos.every((m) => m.natureza === 'CALCULADO')));
  assert.deepEqual(a.api('s_cha', 'gantt', { zoom: 'mes', uf: 'GO' }).linhas.map((l) => l.id), ['op_goia']);
  const adiante = a.api('s_cha', 'gantt', { zoom: 'semana', inicio: '2026-11-20' });
  assert.equal(adiante.de, '2026-11-20'); assert.ok(adiante.linhas.some((l) => l.id === 'op_goia'));
  assert.equal(a.api('s_cha', 'gantt', { zoom: 'semana', inicio: 'ontem; DROP' }).de, '2026-11-01', 'início inválido volta ao padrão');
});

// ------------------------------------------------------------------ Painel
test('Painel: números com a fonte; prazos batem com a Agenda, alertas com a Central, etapas com o Kanban; UF na ordem da prioridade; IA com tempo médio só das medidas; coletor', () => {
  const a = ambiente({ ops: opsBase() });
  a.ctx.Lic_agendaAtualizar_({ limite: 50 });
  const futuro = '2026-11-04T11:30:00.000Z';
  a.tabelas.LIC_ALERTAS = [
    { ID: 'al1', OPORTUNIDADE_ID: 'op_casc', SITUACAO: 'ENVIADO', CIENTE_EM: '', ALVO_ISO: futuro, USUARIO_ID: 'u_cha', CRIADO_EM: '2026-11-02T12:00:00.000Z', TIPO: 'PRAZO' },
    { ID: 'al2', OPORTUNIDADE_ID: 'op_casc', SITUACAO: 'ENVIADO', CIENTE_EM: '2026-11-02T12:10:00.000Z', ALVO_ISO: futuro, USUARIO_ID: 'u_thi', CRIADO_EM: '2026-11-02T12:00:00.000Z', TIPO: 'PRAZO' },
    { ID: 'al3', OPORTUNIDADE_ID: 'op_imbe', SITUACAO: 'ESCALONADO', CIENTE_EM: '', ALVO_ISO: '2026-11-13T11:00:00.000Z', USUARIO_ID: 'u_thi', CRIADO_EM: '2026-11-02T12:00:00.000Z', TIPO: 'PRAZO' },
    { ID: 'al4', OPORTUNIDADE_ID: 'op_imbe', SITUACAO: 'PROGRAMADO', CIENTE_EM: '', ALVO_ISO: futuro, USUARIO_ID: 'u_thi', CRIADO_EM: '2026-11-02T12:00:00.000Z', TIPO: 'PRAZO' }];
  a.tabelas.LIC_ANALISES = [
    { ID: 'an1', OPORTUNIDADE_ID: 'op_imbe', SITUACAO: 'CONCLUIDA', DURACAO_MS: 90000, CRIADO_EM: '2026-11-02T11:00:00.000Z' },
    { ID: 'an2', OPORTUNIDADE_ID: 'op_imb2', SITUACAO: 'CONCLUIDA', DURACAO_MS: 30000, CRIADO_EM: '2026-11-02T11:30:00.000Z' },
    { ID: 'an3', OPORTUNIDADE_ID: 'op_casc', SITUACAO: 'RECUSADA', DURACAO_MS: '', CRIADO_EM: '2026-11-01T11:00:00.000Z' },
    { ID: 'an4', OPORTUNIDADE_ID: 'op_casc', SITUACAO: 'ERRO', CRIADO_EM: '2026-11-01T10:00:00.000Z' }];
  const d = a.api('s_cha', 'painel');
  assert.equal(d.ok, true);
  for (const b of ['etapas', 'ufs', 'notas', 'prazos', 'alertas', 'travas', 'coletor', 'ia']) assert.ok(d[b] && typeof d[b].fonte === 'string' && d[b].fonte.length > 30, 'fonte de ' + b);
  // etapas = Kanban
  const kb = a.api('s_cha', 'kanban');
  assert.deepEqual(d.etapas.itens.map((x) => x.n), kb.colunas.map((k) => k.qtd));
  assert.equal(d.etapas.descartadasRegra, 1); assert.equal(d.etapas.descartadasPessoa, 1); assert.equal(d.etapas.andamento, 7); assert.equal(d.etapas.travadas, 1);
  // prazos = Agenda (mesma regra)
  assert.equal(d.prazos.d7, a.api('s_cha', 'agenda', { periodo: '7' }).contagens.total);
  assert.equal(d.prazos.d30, a.api('s_cha', 'agenda', { periodo: '30' }).contagens.total);
  assert.ok(d.prazos.d7 > 0 && d.prazos.d30 >= d.prazos.d7);
  // alertas = Central
  assert.equal(d.alertas.semCiencia, 2); assert.equal(d.alertas.semCiencia, a.api('s_cha', 'alertas', {}).contagens.semCiencia);
  // travas, UF e notas
  assert.equal(d.travas.n, 1);
  assert.deepEqual(d.ufs.itens.slice(0, 8).map((x) => x.uf), ['GO', 'DF', 'MG', 'BA', 'TO', 'MT', 'MS', 'RJ'], 'prioridade primeiro, mesmo em zero');
  assert.deepEqual(d.ufs.itens.slice(0, 8).map((x) => x.n), [1, 1, 0, 1, 0, 0, 0, 2]);
  assert.equal(d.ufs.itens.find((x) => x.uf === 'RJ').grupo, 'RJ (filial)');
  assert.deepEqual(d.ufs.itens.slice(8).map((x) => x.uf), ['PR', 'SP']);
  const fx = Object.fromEntries(d.notas.faixas.map((x) => [x.codigo, x.n]));
  assert.deepEqual(fx, { ALTA: 1, MEDIA: 0, BAIXA: 1, DESCARTE: 0, TRAVA: 1, SEM: 4 });
  // IA: tempo médio só das 2 medidas
  assert.equal(d.ia.concluidas, 2); assert.equal(d.ia.recusadas, 1); assert.equal(d.ia.erro, 1); assert.equal(d.ia.total, 4); assert.equal(d.ia.medidas, 2); assert.equal(d.ia.tempoMedioMs, 60000);
  // sem coletor neste ambiente: diz o porquê; portais contados
  assert.equal(d.coletor.noServidor, false); assert.match(d.coletor.aviso, /roda só no servidor próprio/);
  assert.equal(d.coletor.portais.total, 33); assert.equal(d.coletor.portais.emTeste, 2);
  // com o coletor do servidor: falhas por rota e erros das últimas 24 h
  a.ctx.SGO_LICITACOES = { listar: () => ({ itens: [], ate: '', mais: false }),
    situacao: () => ({ ligado: true, falhasSeguidasPncp: 2, ultimaRodadaEm: '2026-11-02T12:58:00.000Z', ultimoSucessoEm: '2026-11-02T10:00:00.000Z', ultimoErro: 'HTTP 503', rotas: [{ chave: 'PNCP:publicacao:6', falhasSeguidas: 2 }, { chave: 'CGOV:5', falhasSeguidas: 0 }] }),
    conexoes: () => [{ portal: 'PUB-001', rota: '/v1/contratacoes/publicacao', inicio: '2026-11-02T12:58:00.000Z', status: 503, erro: 'HTTP 503' }, { portal: 'PUB-001', rota: '/v1/x', inicio: '2026-11-02T12:00:00.000Z', status: 200, erro: '' },
      { portal: 'PUB-002', rota: '/y', inicio: '2026-10-30T12:00:00.000Z', status: 500, erro: 'x' }] };
  const c = a.api('s_cha', 'painel').coletor;
  assert.equal(c.noServidor, true); assert.equal(c.ligado, true); assert.equal(c.falhasSeguidasPncp, 2); assert.equal(c.rotasComFalha, 1); assert.equal(c.rotas, 2);
  assert.equal(c.conexoes.chamadas24h, 2); assert.equal(c.conexoes.erros24h, 1, 'só as das últimas 24 h'); assert.match(c.conexoes.ultimoErro, /PUB-001 .*HTTP 503/);
});

test('análise por IA grava a duração (DURACAO_MS) para o tempo médio do Painel', () => {
  assert.match(ler('SGO_Licitacoes_Analise.js'), /DURACAO_MS: Math\.max\(0, Date\.now\(\) - inicio\)/);
  assert.match(ler('SGO_Licitacoes_Config.js'), /'RESPOSTAS_IA_JSON',\n\s+\/\/ etapa 4[^\n]*\n\s+'DURACAO_MS'\]/);
  assert.match(ler('SGO_Licitacoes_Config.js'), /LIC_ABAS_OK_V6/, 'o cache das abas muda para a coluna nova entrar');
});

// ------------------------------------------------------------------ desempenho
test('desempenho: 260 oportunidades e mais de 500 prazos — cada tela lê cada aba uma vez e responde rápido', (t) => {
  const ops = [];
  const ufs = ['GO', 'DF', 'MG', 'RJ', 'SP', 'PR', 'BA', 'PE', 'RS', 'AM'];
  for (let i = 0; i < 260; i++) {
    const n = String(1000 + i), dia = 3 + (i % 25), enc = '2026-11-' + String(dia).padStart(2, '0');
    const sit = i % 13 === 0 ? 'DESCARTADA' : i % 5 === 0 ? 'ANALISE' : 'RADAR';
    ops.push(OP('op_' + n, { CODIGO: 'LIC-2026-' + n, UF: ufs[i % ufs.length], SITUACAO: sit, TRIAGEM: i % 11 === 0 ? 'TRAVADA' : 'CANDIDATA', DESCARTE_ORIGEM: sit === 'DESCARTADA' ? (i % 2 ? 'PESSOA' : 'REGRA') : '',
      ENCERRAMENTO_PROPOSTAS: enc + 'T09:00:00', ENCERRAMENTO_ISO: enc + 'T12:00:00.000Z', NOTA: i % 3 ? 40 + (i % 50) : '', NOTA_CLASSE: i % 3 ? ((40 + (i % 50)) >= 75 ? 'ALTA' : (40 + (i % 50)) >= 50 ? 'MEDIA' : 'BAIXA') : '',
      TRAVAS_A_CONFIRMAR: i % 17 === 0 ? 1 : 0, RESPONSAVEL_ID: sit === 'ANALISE' ? 'u_cha' : '', RESPONSAVEL_NOME: sit === 'ANALISE' ? 'CHARLES DIRETOR TESTE' : '', NUMERO_CONTROLE_PNCP: '00000000000' + n + '-1-000' + n + '/2026' }));
  }
  const a = ambiente({ ops });
  a.ctx.Lic_agendaAtualizar_({ limite: 400 });
  const nEv = a.tabelas.LIC_EVENTOS.length;
  assert.ok(nEv >= 500, 'eventos gerados pela rotina da agenda: ' + nEv);
  a.tabelas.LIC_ALERTAS = Array.from({ length: 300 }, (_, i) => ({ ID: 'al' + i, OPORTUNIDADE_ID: ops[i % 260].ID, SITUACAO: i % 3 ? 'PROGRAMADO' : 'ENVIADO', ALVO_ISO: '2026-11-20T12:00:00.000Z', USUARIO_ID: 'u_cha', CRIADO_EM: '2026-11-02T12:00:00.000Z', TIPO: 'PRAZO' }));
  a.tabelas.LIC_ANALISES = Array.from({ length: 120 }, (_, i) => ({ ID: 'an' + i, OPORTUNIDADE_ID: ops[i].ID, SITUACAO: ['CONCLUIDA', 'RECUSADA', 'ERRO'][i % 3], DURACAO_MS: 40000 + i * 100, CRIADO_EM: '2026-11-02T12:00:00.000Z' }));
  const medir = (acao, d) => { a.leituras = {}; const t0 = process.hrtime.bigint(); const r = a.api('s_cha', acao, d); const ms = Number(process.hrtime.bigint() - t0) / 1e6; assert.equal(r.ok, true, acao + ': ' + r.message); return { r, ms, leituras: a.leituras }; };
  const k = medir('kanban'), g = medir('gantt', { zoom: 'mes' }), p = medir('painel');
  t.diagnostic(`260 oportunidades, ${nEv} prazos, 300 alertas, 120 análises: Kanban ${k.ms.toFixed(0)} ms, Gantt (mês) ${g.ms.toFixed(0)} ms, Painel ${p.ms.toFixed(0)} ms`);
  for (const [nome, m, limite] of [['Kanban', k, 1500], ['Gantt', g, 2500], ['Painel', p, 2500]]) assert.ok(m.ms < limite, nome + ' em ' + m.ms.toFixed(0) + ' ms');
  assert.equal(k.leituras.LIC_OPORTUNIDADES, 1, 'Kanban lê as oportunidades uma vez'); assert.equal(k.leituras.LIC_EVENTOS || 0, 0, 'Kanban não lê os prazos');
  assert.equal(g.leituras.LIC_OPORTUNIDADES, 1); assert.equal(g.leituras.LIC_EVENTOS, 1, 'Gantt lê os prazos uma vez');
  for (const aba of ['LIC_OPORTUNIDADES', 'LIC_EVENTOS', 'LIC_ALERTAS', 'LIC_ANALISES', 'LIC_PORTAIS']) assert.equal(p.leituras[aba], 1, 'Painel lê ' + aba + ' uma vez');
  assert.ok(k.r.colunas.find((c) => c.codigo === 'RADAR').cartoes.length <= 120, 'coluna cortada em 120 com o aviso');
  assert.ok(g.r.linhas.length <= 150);
  assert.ok(JSON.stringify(k.r).length < 400000, 'resposta do Kanban enxuta: ' + JSON.stringify(k.r).length + ' bytes');
});

// ------------------------------------------------------------------ telas
function tela(o) {
  o = o || {};
  const html = fs.readFileSync(path.join(pastaLegado, 'JS_Licitacoes.html'), 'utf8');
  const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  const els = {}, abertos = [];
  const el = (id) => (els[id] = els[id] || { id, style: {}, innerHTML: '', clientWidth: 1100, querySelectorAll: () => [], querySelector: () => null, addEventListener() {} });
  el('conteudo'); el('menu-secao-licitacoes'); el('licCorpo');
  const chamadas = [];
  const ctx = vm.createContext({
    console, window: {}, setTimeout, USER_CONTEXT: { perfil: 'DIRETORIA' }, JSON, Date, Math,
    document: { getElementById: (id) => els[id] || null, querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, removeEventListener() {}, body: { appendChild() {} }, createElement: () => el('x' + Math.random()) },
    ehMobileModo_: () => !!o.celular, atualizarTituloMobile_() {}, abrir: (m) => abertos.push(m), SGO_getSessionId: () => 's',
    google: { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return { Licitacoes_api: (sid, acao, d) => { chamadas.push([acao, d]); if (o.respostas && o.respostas[acao]) ok(Object.assign({ ok: true }, o.respostas[acao])); } }; } }; } } } }
  });
  vm.runInContext(script, ctx);
  return { ctx, els, chamadas, html, abertos };
}

test('telas: Kanban (computador: 7 colunas; celular: uma etapa por aba), Gantt (SVG com legenda; celular: linha do tempo) e Painel (cada número abre a lista filtrada, com a fonte)', () => {
  const a = ambiente({ ops: opsBase() });
  a.ctx.Lic_agendaAtualizar_({ limite: 50 });
  const kb = a.api('s_cha', 'kanban'), gt = a.api('s_cha', 'gantt', { zoom: 'mes' }), pn = a.api('s_cha', 'painel');
  const pc = tela(), cel = tela({ celular: true });
  // Kanban no computador
  let h = pc.ctx.Lic_htmlKanban_(kb, false);
  assert.equal((h.match(/class="cmk-col[" ]/g) || []).length, 7);
  assert.match(h, /class="cm-modos" role="tablist"[\s\S]*data-lic-modo="licitacoes_kanban"/);
  assert.equal((h.match(/lic-kb-col-futura/g) || []).length, 4);
  assert.match(h, /Etapa futura<\/b>Chega na etapa de preços e proposta/);
  assert.match(h, /cm-selo vermelho">Trava a confirmar/); assert.match(h, /Travada \(decisão da Diretoria\)/); assert.match(h, /Descartada pela Diretoria/);
  assert.match(h, /Responsável: CHARLES DIRETOR TESTE/); assert.match(h, /Nota 55,5 · média/); assert.match(h, /Sem nota da IA/);
  assert.match(h, /data-lic-kb-mover="op_casc"/); assert.match(h, /draggable="true" data-lic-kb="op_casc"/);
  assert.match(h, /1 descartadas só pela regra do radar ficam fora/);
  assert.match(h, /<select id="licKbUf">[\s\S]*<select id="licKbNota">[\s\S]*<select id="licKbPrazo">[\s\S]*<select id="licKbResp">/);
  // Kanban no celular: abas, uma coluna, sem o quadro largo
  vm.runInContext('LIC.kanbanColMob = "ANALISE";', cel.ctx);
  h = cel.ctx.Lic_htmlKanban_(kb, true);
  assert.doesNotMatch(h, /cmk-quadro/);
  assert.match(h, /role="tablist" aria-label="Etapas do Kanban"/);
  assert.equal((h.match(/data-lic-kb-col="/g) || []).length, 7);
  assert.match(h, /aria-selected="true" data-lic-kb-col="ANALISE">Em análise \(2\)/);
  assert.match(h, /role="tabpanel" aria-label="Em análise"/);
  assert.doesNotMatch(h, /data-lic-kb="op_casc"/, 'só a etapa da aba');
  vm.runInContext('LIC.kanbanColMob = "DISPUTA";', cel.ctx);
  assert.match(cel.ctx.Lic_htmlKanban_(kb, true), /Chega na etapa de disputas/);
  // Gantt
  h = pc.ctx.Lic_htmlGantt_(gt, false, 1300);
  assert.match(h, /<svg [^>]*role="img" aria-label="Gantt dos prazos de/);
  assert.match(h, /Cheio: Confirmado[\s\S]*Vazado: Calculado \(regra legal\)[\s\S]*Tracejado: Pendente de confirmação/);
  assert.match(h, />agora<\/text>/, 'hoje marcado');
  assert.match(h, /data-lic-gt="op_casc"/); assert.match(h, /data-lic-gt-zoom="semana"[\s\S]*data-lic-gt-zoom="mes"/);
  assert.match(h, /Ver os mesmos prazos em lista/);
  assert.match(h, /prazos sem data \(pendentes de confirmação\) não aparecem no tempo/);
  h = cel.ctx.Lic_htmlGantt_(gt, true, 360);
  assert.doesNotMatch(h, /<svg/); assert.match(h, /<ol class="lic-tl"/); assert.match(h, /class="lic-tl-agora"/); assert.match(h, /cm-selo verde">Confirmado/);
  // Painel
  h = pc.ctx.Lic_htmlPainel_(pn);
  const fontes = (h.match(/<b>Fonte:<\/b>/g) || []).length;
  assert.equal(fontes, 6, 'cada caixa com a fonte');
  const kpis = h.match(/<button type="button" class="cm-kpi[^>]*>/g) || [];
  assert.ok(kpis.length >= 6 && kpis.every((k) => /data-lic-ir="/.test(k) && /title="Fonte: /.test(k)), 'todo número clicável e com a fonte');
  const barras = h.match(/<button type="button" class="atv-barra-ind lic-pn-barra"[^>]*>/g) || [];
  assert.ok(barras.length >= 20 && barras.every((b) => /data-lic-ir="/.test(b) && /aria-label="/.test(b)));
  assert.match(h, /Em andamento por UF/); assert.match(h, /RJ <span class="cm-meta">RJ \(filial\)/);
  // o clique leva à lista filtrada
  pc.ctx.Lic_irLink_({ mod: 'licitacoes_kanban', kanban: { uf: 'GO' }, coluna: 'ANALISE' });
  assert.deepEqual(pc.abertos.pop(), 'licitacoes_kanban');
  assert.equal(vm.runInContext('LIC.kanbanFiltros.uf + "|" + LIC.kanbanFiltros.nota + "|" + LIC.kanbanColMob', pc.ctx), 'GO||ANALISE');
  pc.ctx.Lic_irLink_({ mod: 'licitacoes_agenda', agenda: { periodo: '7' } });
  assert.equal(vm.runInContext('LIC.agendaPeriodo', pc.ctx), '7'); assert.equal(pc.abertos.pop(), 'licitacoes_agenda');
  pc.ctx.Lic_irLink_({ mod: 'licitacoes_alertas', alertas: 'semCiencia' });
  assert.equal(vm.runInContext('LIC.alertasFiltro', pc.ctx), 'semCiencia');
  // as telas pedem ao servidor uma vez cada
  const t2 = tela({ respostas: { acesso: { nivel: 'GESTAO' }, kanban: kb, gantt: gt, painel: pn } });
  t2.ctx.Licitacoes_iniciar_();
  for (const m of ['licitacoes_kanban', 'licitacoes_gantt', 'licitacoes_painel']) { t2.chamadas.length = 0; t2.ctx.Licitacoes_render_(m); assert.deepEqual(t2.chamadas.map((c) => c[0]), [m.replace('licitacoes_', '')]); }
  assert.match(t2.els.conteudo.innerHTML, /<h2 class="content-title">Painel de Licitações \(Dashboard\)<\/h2>/);
  const cel2 = tela({ celular: true, respostas: { acesso: { nivel: 'GESTAO' }, kanban: kb } });
  cel2.ctx.Licitacoes_iniciar_(); cel2.ctx.Licitacoes_render_('licitacoes_kanban');
  for (const r of ['Painel', 'Kanban', 'Gantt']) assert.match(cel2.els.conteudo.innerHTML, new RegExp('data-lic-nav="licitacoes_' + r.toLowerCase() + '">' + r + '</button>'));
});

test('integração: menu da Diretoria com Painel, Kanban e Gantt; ajuda das três telas; manual e base do assistente; CSS sem largura fixa e sem atualização automática', () => {
  const idx = ler('Index.html');
  for (const [m, nome] of [['licitacoes_painel', 'Painel \\(Dashboard\\)'], ['licitacoes_kanban', 'Kanban'], ['licitacoes_gantt', 'Gantt']]) assert.match(idx, new RegExp('data-mod="' + m + '"[^>]*onclick="abrir\\(\'' + m + '\'\\)"><span class="menu-btn-icon">.*?</span>' + nome + '</button>'));
  const grupo = idx.slice(idx.indexOf('id="menu-secao-licitacoes"'), idx.indexOf('<!-- 29/10/2026: módulo Representação'));
  assert.match(grupo, /data-mod="licitacoes_kanban"/, 'dentro do grupo só da Diretoria e do Administrador');
  const a = ambiente();
  const telas = a.ctx.SGO_ajudaTelas_Licitacoes_();
  for (const k of ['licitacoes_kanban', 'licitacoes_gantt', 'licitacoes_painel']) {
    const t = telas[k];
    assert.ok(t && t.titulo && t.paraQueServe && t.passos.length && t.cores.length && t.problemas.length && t.quemPode.length && t.perguntas.length, k);
    assert.ok(a.ctx.SGO_AJUDA_NOMES[k], k);
  }
  assert.match(telas.licitacoes_kanban.titulo, /Kanban/); assert.match(telas.licitacoes_gantt.titulo, /Gantt/);
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_LICITACOES.md'), 'utf8');
  assert.match(manual, /### 6\.10 Kanban/); assert.match(manual, /### 6\.11 Gantt/); assert.match(manual, /### 6\.12 Painel \(Dashboard\)/);
  assert.match(ler('SGO_AssistenteManuais.js'), /Kanban das licitações/);
  const html = ler('JS_Licitacoes.html');
  for (const m of html.matchAll(/(?:^|[^-])width:\s*(\d+)px/g)) assert.ok(Number(m[1]) <= 360, 'largura fixa ' + m[0]);
  assert.doesNotMatch(html, /setInterval/);
  assert.match(fs.readFileSync(path.join(pastaLegado, 'JS_Licitacoes.html'), 'utf8'), /\r\n/, 'CRLF preservado');
  assert.doesNotMatch(fs.readFileSync(path.join(pastaLegado, 'JS_Licitacoes.html'), 'utf8'), /[^\r]\n/, 'nenhuma linha em LF solto');
});
