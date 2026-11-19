// Manutenção geral do SGO+ (19/11/2026, pedido do dono: "mapear todo o SGO+, procurar erros, corrigir e ver se tudo se conversa").
// Relatório: output/manutencao-geral-20261119/RELATORIO.md. Uma verificação por correção e as verificações estáticas de "tudo se conversa":
//  (1) fotografia diária do Financeiro (SGO_Financeiro_Foto.js): a de 18/11 não saiu e não deixou rastro. Agora o recomeço por memória
//      perdida (reinício do servidor), a leitura que falhou e a fotografia que não terminou no dia ficam no registro como aviso, e a
//      lista de títulos de hoje perdida num reinício é refeita sozinha (no máximo 2 vezes por dia). Código REAL com o OMIE SIMULADO
//      (tests/_financeiro_bloco_b.cjs); nada sai para a rede.
//  (2) ajuda sem as telas do Auvo que saíram em 18/11 (Integração Auvo, importar questionários, sincronização de tarefas);
//  (3) E-mail > "abrir cliente" sem o atalho morto abrir("cadastros") (tela que não existe);
//  (4) toda função chamada pelas telas existe no legado; todo menu tem tela; toda rotina agendada existe.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { montarB } = require('./_financeiro_bloco_b.cjs');

const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db'); // redirecionada para DEST pela suíte
const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
const arquivos = () => fs.readdirSync(PASTA);

/** Ambiente da fotografia com os avisos do console capturados. */
function montarFoto(o) {
  const a = montarB(o);
  a.avisos = [];
  const cons = { log() {}, info() {}, error: (...x) => a.avisos.push('ERRO ' + x.join(' ')), warn: (...x) => a.avisos.push(x.join(' ')) };
  vm.runInContext('this.__c = null;', a.ctx); a.ctx.console = cons;
  return a;
}
const dia = '2026-11-16';

// ------------------------------------------------------------------------------------------------ (1) fotografia diária
test('Fotografia: memória perdida no meio (reinício) recomeça do primeiro passo, avisa no registro e a tela diz quantas vezes recomeçou', () => {
  const a = montarFoto({ agora: '2026-11-16T06:15:00-03:00' });
  a.tamPag = 2; // muitas páginas: a primeira rodada não termina
  const r1 = a.rodada();
  assert.ok(!r1.concluida, 'a primeira rodada não termina: ' + JSON.stringify(r1));
  assert.ok(a.props.FIN_FOTO_CURSOR, 'cursor guardado');
  // o servidor reinicia: a memória (cache) se perde, o cursor (propriedade) continua
  Object.keys(a.cache).forEach((k) => delete a.cache[k]);
  a.em('2026-11-16T06:30:00-03:00');
  a.rodada();
  const aviso = a.avisos.find((t) => /recomeçou do primeiro passo \(recomeço 1\)/.test(t));
  assert.ok(aviso, 'aviso do recomeço: ' + JSON.stringify(a.avisos));
  assert.match(aviso, /16\/11\/2026/); assert.match(aviso, /o servidor reiniciou/); assert.doesNotMatch(aviso, /R\$\s?\d/, 'sem valor em reais no registro');
  const est = a.j(a.ctx.FinFoto_estado_());
  if (est.emAndamento) { assert.equal(est.recomecos, 1); assert.match(est.motivo, /recomeçou 1 vez\(es\) hoje porque o servidor do SGO\+ foi reiniciado/); }
  // e termina normalmente depois
  let r; for (let i = 0; i < 30; i++) { r = a.rodada(); if (r.concluida || r.fora) break; a.relogio.agora += 15 * 60000; }
  assert.equal(r.concluida, 'COMPLETA', JSON.stringify(r));
});

test('Fotografia: a que não terminou no dia deixa aviso na virada (até onde chegou, rodadas e recomeços); antes não deixava rastro', () => {
  const a = montarFoto({ agora: '2026-11-16T23:40:00-03:00' });
  a.tamPag = 2;
  a.rodada();
  assert.ok(a.props.FIN_FOTO_CURSOR, 'em andamento');
  Object.keys(a.cache).forEach((k) => delete a.cache[k]);
  a.em('2026-11-16T23:55:00-03:00'); a.rodada(); // recomeço 1
  a.em('2026-11-17T00:10:00-03:00');
  const r = a.rodada();
  assert.match(r.fora || '', /antes do horário/, JSON.stringify(r));
  const aviso = a.avisos.find((t) => /não terminou/.test(t));
  assert.ok(aviso, JSON.stringify(a.avisos));
  assert.match(aviso, /^A fotografia do Financeiro de 16\/11\/2026 não terminou: parou em "[^"]+" depois de 2 rodada\(s\) e 1 recomeço\(s\)/);
  assert.match(aviso, /a de hoje sai na rodada automática a partir das 06:00/);
  assert.equal(a.props.FIN_FOTO_CURSOR, undefined, 'o cursor do dia anterior foi descartado');
});

test('Fotografia: leitura do Omie que falha fica de fora e deixa aviso (sem valor), a fotografia sai INCOMPLETA', () => {
  const a = montarFoto();
  a.falharRico.ListarOrcamentos = [{ faultstring: 'ERROR: falha interna do Omie', faultcode: 'SOAP-ENV:Server' }];
  const r = a.foto();
  assert.equal(r.concluida, 'INCOMPLETA', JSON.stringify(r));
  const aviso = a.avisos.find((t) => /a leitura de "orçamento do mês" falhou e fica de fora/.test(t));
  assert.ok(aviso, JSON.stringify(a.avisos));
});

test('Fotografia: lista de hoje perdida num reinício é refeita sozinha (no máximo 2 vezes por dia), com aviso; a Régua volta a ter títulos', () => {
  const a = montarFoto();
  assert.equal(a.foto().concluida, 'COMPLETA');
  const fotos = () => a.j(a.ctx.FinFoto_lista_());
  assert.equal(fotos().length, 1);
  // memória presente: nada a fazer
  a.em('2026-11-16T07:00:00-03:00');
  assert.match(a.rodada().fora, /já foi feita/);
  // reinício: some a lista
  const recuperar = (hora) => {
    Object.keys(a.cache).forEach((k) => delete a.cache[k]);
    a.em('2026-11-16T' + hora + ':00-03:00');
    let r; for (let i = 0; i < 12; i++) { r = a.rodada(); if (r.concluida || r.fora) break; }
    return r;
  };
  const r1 = recuperar('07:15');
  assert.equal(r1.concluida, 'COMPLETA', JSON.stringify(r1));
  assert.ok(a.ctx.FinFoto_titulos_(dia), 'a lista voltou para a memória');
  assert.equal(fotos().length, 1, 'a fotografia do dia é substituída, não duplicada');
  assert.equal(fotos()[0].ORIGEM, 'RECUPERACAO');
  assert.ok(a.avisos.some((t) => /se perdeu da memória do servidor \(reinício\)\. A rotina refaz a fotografia sozinha/.test(t)), JSON.stringify(a.avisos));
  const q = a.j(a.ctx.FinCob_apiQuadro('s_wanessa'));
  assert.ok(!q.semLista && (q.cartoes || []).length > 0, 'a Régua tem títulos de novo');
  assert.equal(recuperar('07:30').concluida, 'COMPLETA', 'segunda recuperação do dia');
  const r3 = recuperar('07:45');
  assert.match(r3.fora || '', /já foi feita/, 'terceira não: limite de 2 por dia');
  assert.equal(a.ctx.FinFoto_titulos_(dia), null);
  assert.equal(JSON.parse(a.props.FIN_FOTO_RECUPERACAO).n, 2);
  // no dia seguinte o contador recomeça (a fotografia nova é a da rotina normal)
  a.em('2026-11-17T06:15:00-03:00');
  let r; for (let i = 0; i < 12; i++) { r = a.rodada(); if (r.concluida || r.fora) break; }
  assert.equal(r.concluida, 'COMPLETA');
  assert.equal(fotos()[0].ORIGEM, 'ROTINA');
});

test('Fotografia: não refaz sozinha quando a fotografia de hoje já não leu os títulos (a falha é do Omie, não da memória)', () => {
  const a = montarFoto();
  a.falharRico.ListarMovimentos = Array.from({ length: 6 }, () => ({ faultstring: 'ERROR: falha interna do Omie', faultcode: 'SOAP-ENV:Server' }));
  const r = a.foto();
  assert.equal(r.concluida, 'INCOMPLETA', JSON.stringify(r));
  Object.keys(a.cache).forEach((k) => delete a.cache[k]);
  a.em('2026-11-16T07:00:00-03:00');
  assert.match(a.rodada().fora, /já foi feita/);
  assert.equal(a.props.FIN_FOTO_RECUPERACAO, undefined);
});

test('Fotografia: ajuda da tela e manual explicam o recomeço e a recuperação sozinha', () => {
  const aj = ler('SGO_Ajuda_Financeiro.js');
  assert.match(aj, /A rotina refaz a fotografia sozinha nas rodadas seguintes \(até duas vezes por dia\)/);
  assert.match(aj, /"Atualizar agora" diz que a fotografia recomeçou/);
  const man = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_PAINEL_FINANCEIRO.md'), 'utf8');
  assert.match(man, /\*\*Quando a fotografia não sai\.\*\*/);
  assert.match(man, /a rotina refaz a fotografia de hoje sozinha nas rodadas seguintes \(até duas vezes por dia\)/);
  assert.match(ler('SGO_AssistenteManuais.js'), /Quando a fotografia não sai\. Cada reinício do servidor/, 'base do assistente gerada de novo');
});

// ------------------------------------------------------------------------------------------------ (2) ajuda sem telas do Auvo que saíram
test('Ajuda: nenhuma orientação aponta para tela ou botão do Auvo que saiu em 18/11/2026', () => {
  const ajuda = arquivos().filter((f) => /^SGO_Ajuda_(?!Auvo)/.test(f)).map(ler).join('\n');
  for (const velho of ['tarefa nova do Auvo nesse endereço fica pendente em Integração Auvo', 'O.S. do Auvo finalizada ou passada para outro dia no Auvo',
    '"Trazer os questionários do Auvo" lê', 'Montar os checklists a partir das tarefas do Auvo', 'conduta, chamados do Auvo, lembretes']) assert.ok(!ajuda.includes(velho), 'resta na ajuda: ' + velho);
  assert.match(ler('SGO_Ajuda_Assistencia.js'), /não há mais importação do Auvo/);
  assert.match(ler('SGO_Ajuda_Cadastros.js'), /só para consulta do histórico \(o Auvo foi descontinuado em 18\/11\/2026 e não chega tarefa nova\)/);
});

// ------------------------------------------------------------------------------------------------ (3) atalho morto do E-mail
test('E-mail: "abrir cliente" nunca cai em tela que não existe (abrir("cadastros") virou abrir("clientes"))', () => {
  const t = ler('JS_Email.html');
  assert.ok(!/abrir\("cadastros"\)/.test(t));
  assert.match(t, /function Email_abrirCliente_\(id\) \{ if \(typeof CadTela_irPara_ === "function"\) CadTela_irPara_\("clientes", id\); else abrir\("clientes"\); \}/);
});

// ------------------------------------------------------------------------------------------------ (4) tudo se conversa
function funcoesDoLegado() {
  const defs = new Set();
  for (const f of arquivos().filter((x) => x.endsWith('.js'))) {
    const t = ler(f);
    for (const m of t.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) defs.add(m[1]);
    for (const m of t.matchAll(/^(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*function/gm)) defs.add(m[1]);
  }
  return defs;
}
/** Funções chamadas direto pelas telas: google.script.run[.withX(...)]*.nome( e chamarServidor('nome'). */
function chamadasDasTelas() {
  const IGN = new Set(['withSuccessHandler', 'withFailureHandler', 'withUserObject']);
  const out = new Map();
  const add = (n, f) => { if (!out.has(n)) out.set(n, new Set()); out.get(n).add(f); };
  for (const f of arquivos().filter((x) => x.endsWith('.html'))) {
    const t = ler(f);
    for (const m of t.matchAll(/google\.script\.run/g)) {
      const s = t.slice(m.index + 17, m.index + 4000);
      let i = 0;
      while (i < s.length) {
        const mm = /^\s*\.\s*([A-Za-z_$][\w$]*)\s*\(/.exec(s.slice(i));
        if (!mm) break;
        if (!IGN.has(mm[1])) { add(mm[1], f); break; }
        i += mm[0].length;
        let d = 1, q = null;
        while (i < s.length && d > 0) {
          const c = s[i];
          if (q) { if (c === '\\') i++; else if (c === q) q = null; } else if (c === '"' || c === "'" || c === '`') q = c; else if (c === '(') d++; else if (c === ')') d--;
          i++;
        }
      }
    }
    for (const m of t.matchAll(/\bchamarServidor\(\s*['"]([A-Za-z_$][\w$]*)['"]/g)) if (m[1] !== 'nomeFuncao') add(m[1], f); // 'nomeFuncao': exemplo do comentário do JS_Core
  }
  return out;
}

test('Tudo se conversa: toda função que as telas chamam no servidor existe no legado', () => {
  const defs = funcoesDoLegado(), ch = chamadasDasTelas();
  assert.ok(ch.size > 100, 'achou as chamadas (' + ch.size + ')');
  const faltam = [...ch].filter(([n]) => !defs.has(n)).map(([n, s]) => n + ' (' + [...s].join(', ') + ')');
  assert.deepEqual(faltam, []);
});

test('Tudo se conversa: todo item de menu e todo abrir("tela") tem tela em abrirModulo_ (ou é tratado antes, como trocar_senha)', () => {
  const idx = ler('Index.html'), core = ler('JS_Core.html');
  const todas = arquivos().filter((f) => f.endsWith('.html')).map(ler).join('\n');
  const corpo = core.slice(core.indexOf('function abrirModulo_(mod)'));
  const antes = core.slice(core.indexOf('function abrir(mod)'), core.indexOf('function abrirModulo_(mod)'));
  const mods = new Set();
  for (const m of idx.matchAll(/data-mod="([^"]+)"/g)) mods.add(m[1]);
  for (const m of todas.matchAll(/\babrir\(\s*['"]([a-z0-9_]+)['"]\s*\)/g)) mods.add(m[1]);
  const prefixos = [...corpo.matchAll(/mod\.indexOf\(\s*["']([a-z0-9_]+)["']\s*\)\s*===\s*0/g)].map((m) => m[1]);
  const sem = [...mods].filter((mod) => {
    const re = new RegExp('mod\\s*===\\s*["\']' + mod + '["\']');
    return !re.test(corpo) && !re.test(antes) && !prefixos.some((p) => mod.indexOf(p) === 0);
  });
  assert.ok(mods.size > 100, 'achou os menus (' + mods.size + ')');
  assert.deepEqual(sem, []);
});

// Rotinas do SGO+ na tabela gatilhos da produção em 19/11/2026 01:45 (sistema "sgo"; as do COMMAND são de outro sistema).
const GATILHOS_PRODUCAO = ['Assistencia_rotinaGatilho', 'Atividades_rotinaAtrasos', 'AutPred_rotinaPedidos', 'CajuConc_rotinaGatilho', 'Compras_rotinaGatilho',
  'Conduta_gerarRelatorioSemanalAutomatico_', 'Conduta_rotinaDiaria_', 'Frota_rastreadorRotina', 'Gestao_rotinaDecisoes', 'Licitacoes_rotinaAlertas', 'Ponto_rotina',
  'SGO_comSincronizarPessoasDiario', 'SGO_comWhatsappRodada', 'SGO_waPilotoResumoDiario'];

test('Tudo se conversa: toda rotina agendada (produção e newTrigger do código) existe no legado; nenhuma rotina do Auvo volta', () => {
  const defs = funcoesDoLegado();
  const codigo = arquivos().filter((f) => f.endsWith('.js')).map((f) => [f, ler(f)]);
  const consts = {};
  for (const [, t] of codigo) for (const m of t.matchAll(/\b([A-Z][A-Z0-9_]*FUNCAO[A-Z0-9_]*)\s*=\s*['"]([A-Za-z_$][\w$]*)['"]/g)) consts[m[1]] = m[2];
  const doCodigo = new Set();
  for (const [f, t] of codigo) {
    for (const m of t.matchAll(/newTrigger\(\s*(?:['"]([A-Za-z_$][\w$]*)['"]|([A-Z][A-Z0-9_]+))\s*\)/g)) {
      const nome = m[1] || consts[m[2]];
      assert.ok(nome, 'constante de gatilho sem valor em ' + f + ': ' + m[2]);
      doCodigo.add(nome);
    }
  }
  const faltam = [...new Set(GATILHOS_PRODUCAO.concat([...doCodigo]))].filter((n) => !defs.has(n));
  assert.deepEqual(faltam, []);
  assert.deepEqual([...doCodigo].filter((n) => /^Auvo/i.test(n)), [], 'nenhuma rotina do Auvo é criada pelo código');
  // a rotina da Gestão chama a fotografia do Financeiro (dela dependem Indicadores, Régua de cobrança e Agenda)
  assert.match(ler('SGO_Gestao_Escada.js'), /passo\('financeiroFoto', function \(\) \{ return FinFoto_rodada_\(quando\); \}\)/);
});
