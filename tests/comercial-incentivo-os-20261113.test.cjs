// Incentivo de Missão por O.S. (13/11/2026, etapa 2 de 3). Pedido do dono: "A regra do incentivo é por O.S. e não por deslocamento,
// quantas vezes ele for lá. [...] temos que ter como fiscalizar isso para saber informar se é elegível ou não."
// Regra oficial: MAN-VIA-001 Rev. 03 (R$ 300 por executante por missão qualificada; 200 km ou mais por trecho a partir da sede, pela
// distância cadastral; execução concluída com relatório no prazo e fotos; sem ocorrência do executante; uma missão por saída; retorno
// Tipo A não gera; interrompida pelo cliente gera; gravíssima no mês zera). Casos do manual, com dados de teste (fictícios).
// Parte 1: conferência por O.S. (SGO_Conduta_MissaoOS.js, motor puro e API). Parte 2: proposta (SGO_Comercial_Precificacao.js).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { ambiente: ambienteBase, oportunidadeDeTeste } = require('./_comercial_ambiente.cjs');

const LEGADO = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(LEGADO, f), 'utf8');

// ---------------------------------------------------------------- parte 1: conduta
function conduta(tabelas, sessoes) {
  const log = [], inserts = [], updates = [];
  const t = Object.assign({ qual_parametro: [], qual_missao: [], qual_ocorrencia: [], qual_missao_os: [], qual_fechamento: [], qual_distancia_referencia: [],
    ATEC_OS: [], ATEC_CHAMADOS: [], ATEC_TIPOS: [], ATEC_FOTOS: [], CAD_UNIDADES: [], CAD_CLIENTES: [], CAD_USUARIOS: [] }, tabelas || {});
  let seq = 0;
  const ctx = vm.createContext({
    console,
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', CAD_UNIDADES: 'CAD_UNIDADES', CAD_CLIENTES: 'CAD_CLIENTES' } },
    SGO_DATA: {
      getAll: (aba) => (t[aba] || []).map((x) => Object.assign({}, x)),
      getById: (aba, id) => (t[aba] || []).find((x) => String(x.ID) === String(id)) || null,
      insert: (aba, r) => { const n = Object.assign({ ID: 'novo' + (++seq) }, r); (t[aba] = t[aba] || []).push(n); inserts.push(aba); return n; },
      update: (aba, id, c) => { const x = (t[aba] || []).find((y) => String(y.ID) === String(id)); Object.assign(x, c); updates.push(aba); return x; },
      log: (...a) => log.push(a)
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CertCal_garantirTabela_: () => {}, CertCal_garantirColuna_: () => {},
    exigirSessao: (sid) => { const s = (sessoes || {})[sid]; if (!s) throw new Error('Sessão inválida'); return s; },
    isAdminSession: (sid) => ['ADMIN', 'GESTOR', 'DIRETORIA'].indexOf(((sessoes || {})[sid] || {}).perfil) >= 0,
    SGO_ehPerfilRH_: (p) => p === 'RH'
  });
  for (const f of ['SGO_Utilis.js', 'SGO_Conduta_Setup.js', 'SGO_Conduta_Ocorrencias.js', 'SGO_Conduta_Ciencia.js', 'SGO_Conduta_Missao.js', 'SGO_Conduta_MissaoOS.js']) vm.runInContext(ler(f), ctx);
  return { ctx, t, log, inserts, updates };
}
const REFS = [{ ID: 'r1', DESTINO: 'Formosa GO', KM_TRECHO: 288 }, { ID: 'r2', DESTINO: 'Brasilia/DF', KM_TRECHO: 209 }, { ID: 'r3', DESTINO: 'Itumbiara/GO', KM_TRECHO: 200 },
  { ID: 'r4', DESTINO: 'Cidade Limite/GO', KM_TRECHO: 199 }, { ID: 'r5', DESTINO: 'Rio Verde/GO', KM_TRECHO: 228, CNPJ: '11222333000181' }];
const UNIDADES = [{ ID: 'uFor', CIDADE: 'FORMOSA', UF: 'GO' }, { ID: 'uBsb', CIDADE: 'Brasília', UF: 'DF' }, { ID: 'uItu', CIDADE: 'Itumbiara', UF: 'GO' },
  { ID: 'uLim', CIDADE: 'Cidade Limite', UF: 'GO' }, { ID: 'uSem', CIDADE: '', UF: '' }, { ID: 'uGyn', CIDADE: 'Goiânia', UF: 'GO' }, { ID: 'uRv', CIDADE: '', UF: '', CNPJ_UNIDADE: '11.222.333/0001-81' }];
const USUARIOS = [{ ID: 'ana', NOME: 'ANA TECNICA TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO' }, { ID: 'bruno', NOME: 'BRUNO TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO' },
  { ID: 'gestor', NOME: 'GESTOR TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO' }, { ID: 'dir', NOME: 'DIRETORIA TESTE', PERFIL: 'DIRETORIA', STATUS: 'ATIVO' }, { ID: 'rh', NOME: 'RH TESTE', PERFIL: 'RH', STATUS: 'ATIVO' }];
let nOS = 0;
/** O.S. encerrada no dia, com relatório no mesmo dia e 3 fotos (o padrão que cumpre os requisitos). */
function os(unidade, tecnico, dia, extra) {
  nOS++;
  const n = String(nOS).padStart(4, '0');
  return Object.assign({ ID: 'os' + n, NUMERO: 'OS-T-' + n, CHAMADO_ID: 'ch' + n, CHAMADO_NUMERO: 'CH-T-' + n, SITUACAO: 'ENCERRADA', TIPO_CODIGO: 'MANUTENCAO_CORRETIVA', TIPO_NOME: 'Manutenção corretiva',
    CLIENTE_ID: 'cli-' + unidade, UNIDADE_ID: unidade, UNIDADE_NOME: 'Unidade ' + unidade, TECNICO_ID: tecnico, AGENDADO_PARA: dia + 'T08:00:00', CHEGOU_EM: dia + 'T09:00:00',
    CONCLUIU_EM: dia + 'T15:00:00', RELATORIO_EM: dia + 'T15:05:00', QTD_FOTOS: 3 }, extra || {});
}
function apurar(dados, extra) {
  const { ctx } = conduta();
  return ctx.CondutaMOS_apurar_(Object.assign({ competencia: '2026-11', hoje: '2026-11-30', kmMinimo: 200, valor: 300, prazoRelatorio: 3, fotosMin: 2, sedeEndereco: 'Rua C-155, 789, Setor Jardim America, Goiania/GO',
    refs: REFS, unidades: UNIDADES, clientes: [], tipos: [{ CODIGO: 'MANUTENCAO_CORRETIVA', FOTOS_MIN: 2 }, { CODIGO: 'ENVIO_ORCAMENTO', SEM_VISITA: 'SIM' }], usuarios: USUARIOS,
    os: [], chamados: [], fotos: [], missoes: [], ocorrencias: [], conferencias: [] }, dados, extra || {}));
}
const linha = (r, numero, exec) => r.linhas.find((l) => l.os === numero && (!exec || l.executanteId === exec));
const lista = (x) => JSON.parse(JSON.stringify(x));
const pessoa = (r, id) => r.porExecutante.find((p) => p.executanteId === id);
const missaoLancada = (id, dia, destino, e1, e2, extra) => Object.assign({ ID: id, DATA: dia, COMPETENCIA: dia.slice(0, 7), DESTINO: destino, KM_TRECHO: 288, QUALIFICA: true, EXECUTANTE_1_ID: e1, EXECUTANTE_2_ID: e2 || '', APROVACAO: 'APROVADA' }, extra || {});

test('1. dois técnicos na mesma missão: cada um recebe R$ 300 integral (o 2º vem da missão lançada); a O.S. guarda um técnico só', () => {
  const o = os('uFor', 'ana', '2026-11-04');
  const r = apurar({ os: [o], missoes: [missaoLancada('m1', '2026-11-04', 'Formosa GO', 'ana', 'bruno')] });
  assert.equal(linha(r, o.NUMERO, 'ana').estado, 'DEVIDO'); assert.equal(linha(r, o.NUMERO, 'ana').valor, 300);
  assert.equal(linha(r, o.NUMERO, 'bruno').estado, 'DEVIDO'); assert.equal(linha(r, o.NUMERO, 'bruno').valor, 300);
  assert.equal(linha(r, o.NUMERO, 'bruno').origemExecutante, 'missão lançada');
  assert.equal(pessoa(r, 'ana').valorDevido, 300); assert.equal(pessoa(r, 'bruno').valorDevido, 300);
  assert.equal(pessoa(r, 'bruno').lancadasQueContam, 1); assert.equal(pessoa(r, 'bruno').diferenca, 0);
  assert.equal(r.divergencias.length, 0, JSON.stringify(r.divergencias));
  assert.match(linha(r, o.NUMERO, 'ana').criterios[0].texto, /Formosa GO: 288 km da sede \(cidade da unidade\), mínimo 200 km/);
});

test('2. missão de vários dias (O.S. de 03/11 a 06/11, pausada e retomada): um incentivo só, não um por dia nem por ida', () => {
  const o = os('uFor', 'ana', '2026-11-03', { CONCLUIU_EM: '2026-11-06T16:00:00', RELATORIO_EM: '2026-11-06T16:10:00' });
  const r = apurar({ os: [o] });
  assert.equal(r.missoes.length, 1); assert.equal(r.missoes[0].estado, 'DEVIDO');
  assert.equal(pessoa(r, 'ana').devidas, 1); assert.equal(pessoa(r, 'ana').valorDevido, 300);
  // sem missão lançada: a conferência mostra que o fechamento (que soma as lançadas) não pagaria
  assert.equal(r.divergencias.length, 1); assert.equal(r.divergencias[0].tipo, 'SEM_LANCAMENTO');
  assert.match(r.divergencias[0].texto, /cumpre os requisitos, mas não há missão lançada para ANA TECNICA TESTE: o fechamento do mês, que soma as missões lançadas, não paga este incentivo/);
});

test('3. duas cidades na mesma saída (Formosa e Brasília no mesmo dia) = uma missão; dia seguinte = pendente até a gestão dizer mesma ou nova saída', () => {
  const a = os('uFor', 'ana', '2026-11-05'), b = os('uBsb', 'ana', '2026-11-05');
  let r = apurar({ os: [a, b] });
  assert.equal(r.missoes.length, 1); assert.deepEqual(lista(r.missoes[0].os), [a.NUMERO, b.NUMERO]);
  assert.equal(linha(r, a.NUMERO).estado, 'DEVIDO'); assert.equal(linha(r, a.NUMERO).valor, 300);
  assert.equal(linha(r, b.NUMERO).estado, 'NAO_DEVIDO'); assert.match(linha(r, b.NUMERO).motivos[0], new RegExp('Mesma saída da O\\.S\\. ' + a.NUMERO + '.*conta uma vez só'));
  assert.equal(pessoa(r, 'ana').valorDevido, 300);
  // O.S. no dia seguinte: provável mesma saída (não há registro de volta à sede)
  const c = os('uFor', 'ana', '2026-11-06');
  r = apurar({ os: [a, b, c] });
  assert.equal(r.missoes.length, 1); assert.equal(r.missoes[0].estado, 'PENDENTE');
  assert.match(r.missoes[0].motivos.join(' '), new RegExp(c.NUMERO + ' \\(06/11/2026\\) no dia seguinte a outra O\\.S\\. desta saída: confirme se o executante voltou à sede'));
  r = apurar({ os: [a, b, c], conferencias: [{ ID: 'c1', OS_ID: c.ID, SAIDA: 'NOVA' }] });
  assert.equal(r.missoes.length, 2); assert.equal(pessoa(r, 'ana').devidas, 2); assert.equal(pessoa(r, 'ana').valorDevido, 600);
  r = apurar({ os: [a, b, c], conferencias: [{ ID: 'c1', OS_ID: c.ID, SAIDA: 'MESMA' }] });
  assert.equal(r.missoes.length, 1); assert.equal(r.missoes[0].estado, 'DEVIDO'); assert.equal(pessoa(r, 'ana').valorDevido, 300);
  // O.S. sem visita (envio de orçamento) não entra
  r = apurar({ os: [os('uFor', 'ana', '2026-11-20', { TIPO_CODIGO: 'ENVIO_ORCAMENTO' })] });
  assert.equal(r.linhas.length, 0);
});

test('4. contrato com 3 visitas (3 O.S. em dias separados) = 3 missões; Itumbiara a 200 km qualifica no limite', () => {
  const v = ['2026-11-05', '2026-11-15', '2026-11-25'].map((d) => os('uItu', 'ana', d));
  const r = apurar({ os: v, missoes: v.map((o, i) => missaoLancada('mi' + i, o.CHEGOU_EM.slice(0, 10), 'Itumbiara/GO', 'ana', '', { KM_TRECHO: 200 })) });
  assert.equal(r.missoes.length, 3); assert.ok(r.missoes.every((m) => m.estado === 'DEVIDO'));
  assert.equal(pessoa(r, 'ana').devidas, 3); assert.equal(pessoa(r, 'ana').valorDevido, 900);
  assert.equal(pessoa(r, 'ana').lancadasQueContam, 3); assert.equal(pessoa(r, 'ana').diferenca, 0); assert.equal(r.divergencias.length, 0);
});

test('5. retorno Tipo A (erro da equipe) não gera novo incentivo; retorno por falha do equipamento ou escopo novo gera; sem classificação fica pendente', () => {
  const a = os('uFor', 'ana', '2026-11-03'), b = os('uFor', 'ana', '2026-11-20', { CHAMADO_ID: a.CHAMADO_ID, CHAMADO_NUMERO: a.CHAMADO_NUMERO });
  let r = apurar({ os: [a, b] });
  assert.equal(linha(r, a.NUMERO).estado, 'DEVIDO');
  assert.equal(linha(r, b.NUMERO).estado, 'PENDENTE');
  assert.match(linha(r, b.NUMERO).motivos.join(' '), new RegExp('Possível retorno: segunda O\\.S\\. do chamado ' + a.CHAMADO_NUMERO + ' \\(antes: ' + a.NUMERO + '\\)'));
  r = apurar({ os: [a, b], conferencias: [{ ID: 'c', OS_ID: b.ID, RETORNO: 'TIPO_A' }] });
  assert.equal(linha(r, b.NUMERO).estado, 'NAO_DEVIDO'); assert.match(linha(r, b.NUMERO).motivos.join(' '), /Retorno Tipo A \(erro da equipe\).*não gera novo incentivo/);
  assert.equal(pessoa(r, 'ana').valorDevido, 300);
  r = apurar({ os: [a, b], conferencias: [{ ID: 'c', OS_ID: b.ID, RETORNO: 'EQUIPAMENTO' }] });
  assert.equal(linha(r, b.NUMERO).estado, 'DEVIDO'); assert.equal(pessoa(r, 'ana').valorDevido, 600);
  // chamado marcado como reincidente pela Assistência (mesmo equipamento em até 90 dias) também pede a classificação
  const c = os('uFor', 'bruno', '2026-11-10');
  r = apurar({ os: [c], chamados: [{ ID: c.CHAMADO_ID, NUMERO: c.CHAMADO_NUMERO, REINCIDENTE: 'SIM', REINCIDENCIA_DE: 'CH-T-0001' }] });
  assert.equal(linha(r, c.NUMERO).estado, 'PENDENTE'); assert.match(linha(r, c.NUMERO).motivos.join(' '), /chamado reincidente \(mesmo equipamento do CH-T-0001\)/);
  r = apurar({ os: [c], chamados: [{ ID: c.CHAMADO_ID, REINCIDENTE: 'SIM' }], conferencias: [{ ID: 'c', OS_ID: c.ID, RETORNO: 'ESCOPO_NOVO' }] });
  assert.equal(linha(r, c.NUMERO).estado, 'DEVIDO');
});

test('6. interrompida por causa do cliente = devido; por falha do executante = não devido; cancelada antes da saída não é missão', () => {
  const o = os('uFor', 'ana', '2026-11-12', { SITUACAO: 'CANCELADA', CANCELADA_MOTIVO: 'Setor fechado na chegada', SAIU_EM: '2026-11-12T05:00:00', CONCLUIU_EM: '', RELATORIO_EM: '', QTD_FOTOS: 0 });
  let r = apurar({ os: [o] });
  assert.equal(linha(r, o.NUMERO).estado, 'PENDENTE'); assert.match(linha(r, o.NUMERO).motivos.join(' '), /cancelada depois da saída \(Setor fechado na chegada\): a gestão classifica/);
  r = apurar({ os: [o], conferencias: [{ ID: 'c', OS_ID: o.ID, INTERRUPCAO: 'CLIENTE' }] });
  assert.equal(linha(r, o.NUMERO).estado, 'DEVIDO', 'o deslocamento aconteceu: sem relatório nem fotos exigidos'); assert.equal(linha(r, o.NUMERO).valor, 300);
  r = apurar({ os: [o], conferencias: [{ ID: 'c', OS_ID: o.ID, INTERRUPCAO: 'EXECUTANTE' }] });
  assert.equal(linha(r, o.NUMERO).estado, 'NAO_DEVIDO'); assert.match(linha(r, o.NUMERO).motivos.join(' '), /falha do executante/);
  const sem = os('uFor', 'bruno', '2026-11-12', { SITUACAO: 'CANCELADA', CANCELADA_MOTIVO: 'Cadastro errado', CHEGOU_EM: '', CONCLUIU_EM: '', RELATORIO_EM: '' });
  r = apurar({ os: [sem] });
  assert.equal(linha(r, sem.NUMERO).estado, 'NAO_DEVIDO'); assert.match(linha(r, sem.NUMERO).motivos.join(' '), /cancelada antes da saída: não houve deslocamento/);
  assert.equal(r.porExecutante.find((p) => p.executanteId === 'bruno').naoDevidas, 0, 'não conta como missão');
});

test('7. 199 km não qualifica; 200 km qualifica (mesmo limite da Conduta); 0 km na cidade da sede', () => {
  const a = os('uLim', 'ana', '2026-11-05'), b = os('uItu', 'bruno', '2026-11-05'), c = os('uGyn', 'ana', '2026-11-07');
  const r = apurar({ os: [a, b, c] });
  assert.equal(linha(r, a.NUMERO).estado, 'NAO_DEVIDO'); assert.match(linha(r, a.NUMERO).motivos[0], /Cidade Limite\/GO: 199 km da sede .*abaixo do mínimo de 200 km/);
  assert.equal(linha(r, b.NUMERO).estado, 'DEVIDO');
  assert.equal(linha(r, c.NUMERO).estado, 'NAO_DEVIDO'); assert.match(linha(r, c.NUMERO).motivos[0], /0 km da sede \(mesma cidade da sede\)/);
  assert.equal(r.divergencias.length, 1, 'só a O.S. de 200 km sem missão lançada');
});

test('8. sem distância cadastrada: pendente, com o que fazer; o CNPJ do cadastro acha a distância mesmo sem cidade na unidade', () => {
  const a = os('uSem', 'ana', '2026-11-05'), b = os('uRv', 'bruno', '2026-11-05');
  const r = apurar({ os: [a, b] });
  assert.equal(linha(r, a.NUMERO).estado, 'PENDENTE');
  assert.match(linha(r, a.NUMERO).motivos[0], /Distância cadastral ausente: a unidade não tem cidade e o cliente não tem distância cadastrada\. Cadastre a cidade com o CNPJ do cliente em Programa de conduta > Missões > "\+ Cadastrar cidade\/destino"/);
  assert.equal(r.divergencias.filter((x) => x.executanteId === 'ana').length, 0, 'sem distância não vira divergência');
  assert.equal(linha(r, b.NUMERO).estado, 'DEVIDO'); assert.match(linha(r, b.NUMERO).criterios[0].texto, /Rio Verde\/GO: 228 km da sede \(CNPJ do cadastro\)/);
});

test('9. sem relatório ou sem fotos: pendente dentro do prazo (3 dias úteis); depois do prazo, não devido; relatório atrasado também', () => {
  const o = os('uFor', 'ana', '2026-11-26', { RELATORIO_EM: '' });
  assert.equal(linha(apurar({ os: [o] }, { hoje: '2026-11-27' }), o.NUMERO).estado, 'PENDENTE');
  let r = apurar({ os: [o] }, { hoje: '2026-12-02' });
  assert.equal(linha(r, o.NUMERO).estado, 'NAO_DEVIDO'); assert.match(linha(r, o.NUMERO).motivos.join(' '), /Relatório não emitido até o prazo \(01\/12\/2026\)/);
  const f = os('uFor', 'bruno', '2026-11-26', { QTD_FOTOS: 1 });
  assert.equal(linha(apurar({ os: [f] }, { hoje: '2026-11-27' }), f.NUMERO).estado, 'PENDENTE');
  r = apurar({ os: [f] }, { hoje: '2026-12-02' });
  assert.equal(linha(r, f.NUMERO).estado, 'NAO_DEVIDO'); assert.match(linha(r, f.NUMERO).motivos.join(' '), /1 foto, abaixo do mínimo de 2 \(prazo vencido em 01\/12\/2026\)/);
  // as fotos ativas da O.S. também contam quando o contador está zerado
  const g = os('uFor', 'bruno', '2026-11-26', { QTD_FOTOS: 0 });
  assert.equal(linha(apurar({ os: [g], fotos: [{ OS_ID: g.ID, ATIVA: 'SIM' }, { OS_ID: g.ID, ATIVA: 'SIM' }] }), g.NUMERO).estado, 'DEVIDO');
  const t = os('uFor', 'ana', '2026-11-02', { RELATORIO_EM: '2026-11-10T10:00:00' });
  r = apurar({ os: [t] });
  assert.equal(linha(r, t.NUMERO).estado, 'NAO_DEVIDO'); assert.match(linha(r, t.NUMERO).motivos.join(' '), /Relatório emitido em 10\/11\/2026, depois do prazo \(05\/11\/2026\)/);
});

test('10. ocorrência do executante na missão: firme = não devido; em andamento = pendente; marcada pela gestão como fora da missão = devido', () => {
  const o = os('uFor', 'ana', '2026-11-05');
  const oc = (status, extra) => Object.assign({ ID: 'oc1', TIPO_CODIGO: 'VEI-03', STATUS: status, COLABORADOR_ID: 'ana', DATA_FATO: '2026-11-05', COMPETENCIA: '2026-11', NIVEL_APLICADO: 'M' }, extra || {});
  let r = apurar({ os: [o], ocorrencias: [oc('FIRME')] });
  assert.equal(linha(r, o.NUMERO).estado, 'NAO_DEVIDO'); assert.match(linha(r, o.NUMERO).motivos.join(' '), /Ocorrência firme do executante na missão: retira o incentivo desta missão/);
  r = apurar({ os: [o], ocorrencias: [oc('FIRME', { TIPO_CODIGO: 'CAM-03' })] });
  assert.match(linha(r, o.NUMERO).motivos.join(' '), /\(CAM-03, retorno Tipo A\)/);
  r = apurar({ os: [o], ocorrencias: [oc('HOMOLOGADA')] });
  assert.equal(linha(r, o.NUMERO).estado, 'PENDENTE');
  r = apurar({ os: [o], ocorrencias: [oc('FIRME')], conferencias: [{ ID: 'c', OS_ID: o.ID, OCORRENCIAS_FORA_JSON: '["oc1"]' }] });
  assert.equal(linha(r, o.NUMERO).estado, 'DEVIDO');
  // fora do período da missão, anulada ou de outra pessoa: não afeta
  assert.equal(linha(apurar({ os: [o], ocorrencias: [oc('FIRME', { DATA_FATO: '2026-11-20' }), oc('ANULADA', { ID: 'oc2' }), oc('FIRME', { ID: 'oc3', COLABORADOR_ID: 'bruno' })] }), o.NUMERO).estado, 'DEVIDO');
});

test('11. gravíssima firme do executante no mês zera todos os incentivos dele no mês (inclusive a lançada); em andamento fica pendente', () => {
  const a = os('uFor', 'ana', '2026-11-03'), b = os('uItu', 'ana', '2026-11-18'), c = os('uFor', 'bruno', '2026-11-10');
  const gg = (status) => ({ ID: 'gg', TIPO_CODIGO: 'VEI-08', STATUS: status, COLABORADOR_ID: 'ana', DATA_FATO: '2026-11-25', COMPETENCIA: '2026-11', NIVEL_APLICADO: 'GG' });
  let r = apurar({ os: [a, b, c], ocorrencias: [gg('FIRME')], missoes: [missaoLancada('m1', '2026-11-03', 'Formosa GO', 'ana')] });
  assert.equal(linha(r, a.NUMERO).estado, 'NAO_DEVIDO'); assert.equal(linha(r, b.NUMERO).estado, 'NAO_DEVIDO');
  assert.match(linha(r, a.NUMERO).motivos.join(' '), /Infração gravíssima firme do executante no mês: zera todos os incentivos de missão dele no mês/);
  assert.equal(pessoa(r, 'ana').valorDevido, 0); assert.equal(pessoa(r, 'ana').lancadasQueContam, 0, 'o fechamento também zera');
  assert.equal(linha(r, c.NUMERO).estado, 'DEVIDO', 'a gravíssima é só de quem cometeu');
  assert.ok(r.divergencias.some((x) => x.tipo === 'LANCADA_NAO_DEVIDA' && x.executanteId === 'ana'));
  r = apurar({ os: [a], ocorrencias: [gg('HOMOLOGADA')] });
  assert.equal(linha(r, a.NUMERO).estado, 'PENDENTE'); assert.match(linha(r, a.NUMERO).motivos.join(' '), /gravíssima do executante no mês em andamento/);
});

test('12. divergências: lançada em dobro na mesma saída, lançada sem O.S., lançada antes da Assistência do SGO+', () => {
  const a = os('uFor', 'ana', '2026-11-05'), b = os('uBsb', 'ana', '2026-11-05');
  const r = apurar({ os: [a, b], missoes: [missaoLancada('m1', '2026-11-05', 'Formosa GO', 'ana'), missaoLancada('m2', '2026-11-05', 'Brasilia/DF', 'ana', '', { KM_TRECHO: 209 }),
    missaoLancada('m3', '2026-11-22', 'Palmas/TO', 'ana', '', { KM_TRECHO: 870 })] });
  assert.equal(pessoa(r, 'ana').valorDevido, 300); assert.equal(pessoa(r, 'ana').lancadasQueContam, 3); assert.equal(pessoa(r, 'ana').diferenca, -600);
  assert.ok(r.divergencias.some((x) => x.tipo === 'LANCADA_EM_DOBRO' && /2 missões lançadas para ANA TECNICA TESTE na mesma saída/.test(x.texto)), JSON.stringify(r.divergencias));
  assert.ok(r.divergencias.some((x) => x.tipo === 'SEM_OS' && /Palmas\/TO em 22\/11\/2026/.test(x.texto)));
  const out = apurar({ os: [a], missoes: [missaoLancada('m9', '2026-10-09', 'Gurupi TO', 'ana')] }, { competencia: '2026-10' });
  assert.equal(out.divergencias[0].tipo, 'SEM_OS_ANTERIOR');
});

test('13. API: gestão e RH veem todos; o técnico só as dele; sigilo do código da ocorrência; classificação só da gestão e nunca na própria O.S.; nada além da conferência é gravado', () => {
  const sess = { sG: { userId: 'gestor', usuario: 'gestor', nome: 'GESTOR TESTE', perfil: 'GESTOR' }, sD: { userId: 'dir', usuario: 'dir', nome: 'DIRETORIA TESTE', perfil: 'DIRETORIA' },
    sR: { userId: 'rh', usuario: 'rh', perfil: 'RH' }, sA: { userId: 'ana', usuario: 'ana', perfil: 'TECNICO' }, sB: { userId: 'bruno', usuario: 'bruno', perfil: 'TECNICO' } };
  const a = os('uFor', 'ana', '2026-11-05'), b = os('uItu', 'bruno', '2026-11-06'), b2 = os('uItu', 'bruno', '2026-11-20', { CHAMADO_ID: b.CHAMADO_ID });
  const amb = conduta({ ATEC_OS: [a, b, b2], qual_distancia_referencia: REFS, CAD_UNIDADES: UNIDADES, CAD_USUARIOS: USUARIOS, ATEC_TIPOS: [{ CODIGO: 'MANUTENCAO_CORRETIVA', FOTOS_MIN: 2 }],
    qual_parametro: [{ CHAVE: 'MISSAO_KM_MINIMO', VALOR: '200' }, { CHAVE: 'VALOR_INCENTIVO_MISSAO', VALOR: '300.0' }, { CHAVE: 'SEDE_ENDERECO', VALOR: 'Rua C-155, 789, Setor Jardim America, Goiania/GO' }],
    qual_ocorrencia: [{ ID: 'oc1', TIPO_CODIGO: 'VEI-03', STATUS: 'FIRME', COLABORADOR_ID: 'ana', DATA_FATO: '2026-11-05', COMPETENCIA: '2026-11', NIVEL_APLICADO: 'M' }] }, sess);
  amb.ctx.Conduta_hojeISO_ = () => '2026-11-30';
  const antes = JSON.stringify(Object.keys(amb.t).filter((k) => k !== 'qual_missao_os').map((k) => amb.t[k]));
  const rG = amb.ctx.Conduta_apiConferenciaMissoesOS('sG', { competencia: '2026-11' });
  assert.equal(rG.linhas.length, 3); assert.equal(rG.podeConferir, true); assert.equal(rG.podeConferirOcorrencia, false, 'gestor fora da Qualidade não vê quem é o envolvido');
  const cA = linha(rG, a.NUMERO).criterios.find((c) => c.chave === 'OCORRENCIA');
  assert.equal(cA.codigos, undefined); assert.match(cA.texto, /detalhe sob sigilo/);
  assert.match(rG.regra, /Uma missão por O\.S\. \(não por deslocamento nem por dia\), por executante: R\$ 300,00/);
  const rR = amb.ctx.Conduta_apiConferenciaMissoesOS('sR', { competencia: '2026-11' });
  assert.equal(rR.linhas.length, 3); assert.equal(rR.podeConferir, false);
  const rD = amb.ctx.Conduta_apiConferenciaMissoesOS('sD', { competencia: '2026-11' });
  assert.deepEqual(lista(linha(rD, a.NUMERO).criterios.find((c) => c.chave === 'OCORRENCIA').codigos), ['VEI-03']);
  const rA = amb.ctx.Conduta_apiConferenciaMissoesOS('sA', { competencia: '2026-11' });
  assert.deepEqual(lista(rA.linhas.map((l) => l.os)), [a.NUMERO]); assert.deepEqual(lista(linha(rA, a.NUMERO).criterios.find((c) => c.chave === 'OCORRENCIA').codigos), ['VEI-03'], 'a própria pessoa vê a dela');
  assert.equal(JSON.stringify(Object.keys(amb.t).filter((k) => k !== 'qual_missao_os').map((k) => amb.t[k])), antes, 'consultar não grava nada');
  // classificar
  assert.throws(() => amb.ctx.Conduta_apiConferirMissaoOS('sA', { osId: a.ID, retorno: 'NAO' }), /Acesso restrito/);
  assert.throws(() => amb.ctx.Conduta_apiConferirMissaoOS('sG', { osId: b2.ID, retorno: 'TIPO_A', obs: 'curto' }), /retorno Tipo A, escreva o motivo/);
  assert.throws(() => amb.ctx.Conduta_apiConferirMissaoOS('sG', { osId: a.ID, ocorrenciasFora: ['oc1'] }), /só a Diretoria e o Gestor de Qualidade/);
  assert.throws(() => amb.ctx.Conduta_apiConferirMissaoOS('sG', { osId: a.ID, retorno: 'QUALQUER' }), /opção válida/);
  const ok = amb.ctx.Conduta_apiConferirMissaoOS('sG', { osId: b2.ID, retorno: 'TIPO_A', obs: 'Refez a vedação que ficou mal apertada na visita anterior' });
  assert.match(ok.message, /Nada foi pago nem lançado/);
  assert.deepEqual(lista(amb.inserts), ['qual_missao_os'], 'só a conferência é gravada'); assert.equal(amb.updates.length, 0);
  assert.equal(amb.t.qual_missao_os[0].RETORNO, 'TIPO_A'); assert.equal(JSON.parse(amb.t.qual_missao_os[0].HISTORICO_JSON).length, 1);
  assert.equal(linha(amb.ctx.Conduta_apiConferenciaMissoesOS('sG', { competencia: '2026-11' }), b2.NUMERO).estado, 'NAO_DEVIDO');
  amb.ctx.Conduta_apiConferirMissaoOS('sD', { osId: a.ID, ocorrenciasFora: ['oc1'], obs: 'Ocorrência do dia anterior à viagem, registrada com a data errada' });
  assert.equal(linha(amb.ctx.Conduta_apiConferenciaMissoesOS('sD', { competencia: '2026-11' }), a.NUMERO).estado, 'DEVIDO');
  // executante (gestor) não classifica a própria O.S.
  const c = os('uFor', 'gestor', '2026-11-08'); amb.t.ATEC_OS.push(c);
  assert.throws(() => amb.ctx.Conduta_apiConferirMissaoOS('sG', { osId: c.ID, saida: 'NOVA' }), /executante desta O\.S\./);
  assert.ok(amb.log.every((l) => l[0] === 'CONDUTA_MISSAO_OS_CONFERIR'));
});

test('14. tela e relatório: o quadro "Incentivo por O.S." entra na aba Missões pelo carregador das abas de Qualidade; o A4 de missões traz a conferência', () => {
  const { ctx } = conduta();
  vm.runInContext(ler('SGO_Conduta_TelaQualidade.js'), ctx);
  const t = ctx.Conduta_obterTelaQualidade();
  assert.doesNotThrow(() => new Function(t.js));
  assert.match(t.js, /Incentivo por O\.S\. \(conferência\)/); assert.match(t.js, /apiConferenciaMissoesOS/); assert.match(t.js, /apiConferirMissaoOS/); assert.match(t.css, /cndm-crit/);
  assert.match(ler('SGO_Conduta_Ocorrencias.js'), /apiConferenciaMissoesOS: Conduta_apiConferenciaMissoesOS,\s*apiConferirMissaoOS: Conduta_apiConferirMissaoOS/);
  // relatório A4 de missões: a seção nova a partir do contexto
  const rg = ler('SGO_Conduta_RelatoriosGerenciais.js');
  assert.match(rg, /conferenciaOS: typeof CondutaMOS_resumoParaRelatorio_ === 'function' \? CondutaMOS_resumoParaRelatorio_\(competencia\) : null/);
  assert.match(rg, /Conferência pelas O\.S\. de campo/);
});

// ---------------------------------------------------------------- parte 2: proposta
const ambiente = (o) => ambienteBase(Object.assign({ custoAvulso: 0.3 }, o || {}));
const okc = (r) => { assert.equal(r.ok, true, r.message); return r; };
function amb0(refs) {
  const amb = ambiente({ tabelas: { qual_distancia_referencia: refs || [{ ID: 'd1', DESTINO: 'Rio Verde/GO', KM_TRECHO: 228 }] } });
  amb.tabelas.CAD_UNIDADES[0].CIDADE = 'Rio Verde';
  amb.ctx.CONDUTA_SHEETS = { DISTANCIA_REFERENCIA: 'qual_distancia_referencia' };
  amb.ctx.Conduta_obterParametros_ = () => ({ VALOR_INCENTIVO_MISSAO: 300, MISSAO_KM_MINIMO: 200 });
  return amb;
}
const V = (extra) => Object.assign({ ha: 'SIM', tecnicos: 2, engenheiros: 0, destino: 'Rio Verde/GO', kmTrecho: '228', kmConfirmado: true, dias: 1, noites: 0, viagens: 1, linhas: { PEDAGIO: { valor: '45,00' } } }, extra || {});
function proposta(amb, viagem, repasse) {
  const { oportunidade } = oportunidadeDeTeste(amb);
  const id = okc(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id })).proposta.id;
  const s = okc(amb.api('s_vera', 'salvarProposta', { id, escopo: 'Manutenção preventiva com relatório.', itens: [{ descricao: 'Manutenção preventiva de autoclave', quantidade: 1, precoUnitario: '9.000,00' }],
    deslocamento: { viagem, repasse: repasse || 'ITEM' }, condicoes: { pagamento: 'Boleto em 28 dias', garantia: '90 dias' } }));
  return { id, s, d: s.proposta.deslocamento };
}
const cond = (d) => d.calculo.linhas.find((l) => l.codigo === 'CONDUTA');
const faltas = (d) => d.checklist.faltas.map((f) => f.codigo);

test('15. proposta: 2 técnicos em missão de 5 dias = 2 x 1 missão (R$ 600); dias e pernoites não multiplicam; a tela diz de onde vem a conta', () => {
  const { d } = proposta(amb0(), V({ dias: 5, noites: 4 }));
  assert.equal(cond(d).total, 600); assert.equal(cond(d).quantidade, 2);
  assert.equal(cond(d).quantidadeTxt, '2 executantes x 1 missão (uma missão por O.S.; 1 viagem)');
  assert.match(d.incentivo.texto, /^Incentivo de Missão: R\$ 300,00 x 2 executantes x 1 missão = R\$ 600,00\. Conta uma vez por O\.S\. prevista e por executante .*dias e pernoites não multiplicam o incentivo/);
  assert.match(d.incentivo.texto, /distância cadastral do cliente \(Rio Verde\/GO, tabela do Programa de conduta\): 228 km, mínimo 200 km/);
  assert.match(d.incentivo.texto, /fica fora da margem e da sobra nos dois modos/);
  assert.match(fs.readFileSync(path.join(LEGADO, 'JS_Comercial.html'), 'utf8'), /id="cmCvOs"[\s\S]*osPrevistas: g\("cmCvOs"\)/);
});

test('16. contrato com 3 visitas = 3 O.S. = 3 missões; uma O.S. com 2 idas = 1 missão; 2 O.S. na mesma viagem = 1 missão; sem o número com 2 viagens, o checklist cobra', () => {
  let { d } = proposta(amb0(), V({ viagens: 3, osPrevistas: 3 }));
  assert.equal(cond(d).total, 1800); assert.match(cond(d).quantidadeTxt, /2 executantes x 3 missões \(3 O\.S\. previstas, uma missão por O\.S\.\)/);
  ({ d } = proposta(amb0(), V({ viagens: 2, osPrevistas: 1 })));
  assert.equal(cond(d).total, 600); assert.match(cond(d).quantidadeTxt, /1 O\.S\. prevista em 2 viagens: a O\.S\. conta uma vez, mesmo com mais de uma ida/);
  ({ d } = proposta(amb0(), V({ viagens: 1, osPrevistas: 2 })));
  assert.equal(cond(d).total, 600); assert.match(cond(d).quantidadeTxt, /2 O\.S\. previstas em 1 viagem: O\.S\. na mesma viagem contam uma vez/);
  ({ d } = proposta(amb0(), V({ viagens: 2 })));
  assert.equal(cond(d).total, 1200, 'sem o número: provisório, uma missão por viagem (como a proposta antiga)');
  assert.ok(faltas(d).includes('MISSOES'), faltas(d).join(','));
  assert.match(d.checklist.faltas.find((f) => f.codigo === 'MISSOES').texto, /informe quantas O\.S\. \(visitas\) a proposta prevê no campo "O\.S\. previstas"/);
});

test('17. 199 x 200 km sem distância cadastral; com distância cadastral vale a do cadastro (não o km digitado); viagem a outro destino gera alerta', () => {
  const semRef = () => { const a = amb0([]); return a; };
  let { d } = proposta(semRef(), V({ kmTrecho: '199' }));
  assert.equal(cond(d).nsa, true); assert.match(cond(d).motivo, /Trecho de 199 km, abaixo do mínimo de 200 km do Programa de conduta/);
  ({ d } = proposta(semRef(), V({ kmTrecho: '200' })));
  assert.equal(cond(d).nsa, false); assert.equal(cond(d).total, 600);
  // cadastro diz 228 km: o vendedor digitou 150 km para a mesma cidade, o incentivo continua
  ({ d } = proposta(amb0(), V({ kmTrecho: '150' })));
  assert.equal(cond(d).nsa, false); assert.equal(cond(d).total, 600);
  assert.match(d.incentivo.texto, /O km do trecho da viagem \(150 km\) serve para o km rodado; para o incentivo vale a distância cadastral/);
  // cadastro diz 199 km (abaixo): não há incentivo mesmo com 230 km digitados
  ({ d } = proposta(amb0([{ ID: 'd1', DESTINO: 'Rio Verde/GO', KM_TRECHO: 199 }]), V({ kmTrecho: '230' })));
  assert.equal(cond(d).nsa, true); assert.match(cond(d).motivo, /Distância cadastral do cliente \(Rio Verde\/GO\) de 199 km, abaixo do mínimo de 200 km/);
  // viagem lançada para outra cidade (Goiânia, 0 km): vale o km do trecho e a gestão vê o alerta
  const amb = amb0();
  const p = proposta(amb, V({ destino: 'Goiânia/GO', kmTrecho: '0' }));
  assert.equal(cond(p.d).nsa, true);
  const probs = amb.ctx.ComPr_problemas_(amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === p.id), amb.ctx.ComPr_politica_());
  assert.ok(probs.some((x) => x.regra === 'CONDUTA_DESTINO' && /a unidade do cliente fica a 228 km da sede \(distância cadastral, Rio Verde\/GO\), mas a viagem foi lançada para Goiânia\/GO/.test(x.texto)), JSON.stringify(probs));
});

test('18. a 200 km ou mais a linha é obrigatória e sem desconto (COM-02); entra igual no item separado e no diluído, fora da sobra', () => {
  let { d } = proposta(amb0(), V({ linhas: { PEDAGIO: { valor: '45,00' }, CONDUTA: { nsa: true, motivo: 'Cliente não aceita' } } }));
  assert.ok(faltas(d).includes('CONDUTA_OBRIGATORIA'), faltas(d).join(','));
  assert.match(d.checklist.faltas.find((f) => f.codigo === 'CONDUTA_OBRIGATORIA').texto, /a linha é obrigatória e não pode ficar "não se aplica" \(MAN-VIA-001 §6; proposta sem a linha é a ocorrência COM-02\)/);
  ({ d } = proposta(amb0(), V({ linhas: { PEDAGIO: { valor: '45,00' }, CONDUTA: { valor: '200', motivoAbaixo: 'Desconto combinado com o cliente na reunião' } } })));
  assert.ok(faltas(d).includes('CONDUTA_DESCONTO'), 'o motivo não libera desconto no incentivo');
  assert.ok(!faltas(d).includes('REGRA_CONDUTA'));
  // mesmo valor nos dois modos (etapa 1): o incentivo está no repasse da viagem, fora da sobra
  const amb = amb0();
  const it = proposta(amb, V(), 'ITEM'), di = proposta(amb, V(), 'DILUIDO');
  const pI = amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === it.id), pD = amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === di.id);
  assert.equal(pI.TOTAL, pD.TOTAL); assert.equal(cond(it.d).total, 600); assert.equal(cond(di.d).total, 600);
  const aI = amb.ctx.ComPr_daProposta_(pI, null).analise, aD = amb.ctx.ComPr_daProposta_(pD, null).analise;
  assert.equal(aI.margemPct, aD.margemPct); assert.equal(aI.custoDiluido, 0); assert.equal(aD.custoDiluido, 0);
  assert.ok(aI.custoViagem >= 600, 'o incentivo está no custo da viagem');
});
