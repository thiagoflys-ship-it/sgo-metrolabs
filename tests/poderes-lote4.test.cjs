// Acessos por caixas — LOTE 4 (11/11/2026): aprovação de relatório técnico. As travas de Autoclave, Lavadora, Cadeia de
// frio, Estufa/Banho-maria/Secadora e Baixa temperatura perguntam a caixa (SGO_QE_podeCaixa_ / SGO_QE_msgRecusa_ em
// SGO_QualifEmissao.js, que chamam SGO_pode_ / SGO_poderRecusa_ do SGO_Poderes.js).
//  1) equivalência: sem exceções, as 23 contas reais recebem, em cada ação do lote, o mesmo resultado e a mesma mensagem
//     do legado de antes da mudança (output/poderes-20261110/lote4-antes-legado);
//  2) exceção NÃO tira o poder (gestora de RH deixa de aprovar: o servidor recusa com a mensagem da caixa);
//  3) exceção SIM dá o poder (técnico passa a aprovar), sem passar por cima de "quem elaborou não aprova";
//  4) a simulação didática continua fora do caminho oficial (nada dela mudou e nada dela pergunta a caixa);
//  5) tela: os sinais que a tela usa (podeAprovar, podeAprovarEmissao, podeAlterarModelo) seguem a caixa; diagnóstico
//     "o que falta" diz quem efetivamente aprova; ajuda atualizada.
// Rodar: cd C:\Users\venda\projetos\google-script-dev && FASE=candidato node --require ./output/poderes-20261110/fontes-locais.cjs tests/poderes-lote4.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente } = require('./_poderes_ambiente.cjs');

const pastaPoderes = path.join(__dirname, '../output/poderes-20261110');
const pastaAntes = path.join(pastaPoderes, 'lote4-antes-legado');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const lerLegado = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8');
const lerAntes = (f) => fs.readFileSync(path.join(pastaAntes, f), 'utf8');
const EXTRAS = ['SGO_QualifEquipamento.js', 'SGO_LavRel_Config.js', 'SGO_AutoRel_CertificadoRelatorio.js', 'SGO_AutoRel_ModeloOficialNovo.js',
  'SGO_LavRel_CertificadoRelatorio.js', 'SGO_LavRel_ModeloOficialNovo.js', 'SGO_CadeiaFrioRel_Qualificacao.js', 'SGO_CadeiaFrioRel_Emissao.js',
  'SGO_CadeiaFrioRel_ModeloOficial.js', 'SGO_EstufaBanhoRel_Qualif.js', 'SGO_EstufaBanhoRel_ModeloOficialNovo.js', 'SGO_BaixaTemp_Main.js'];
const LOTE4 = ['RELATORIO_TECNICO_APROVAR', 'RELATORIO_BAIXATEMP_APROVAR', 'RELATORIO_MODELO_ESCOLHER'];
const PERFIS = ['ADMIN', 'DIRETORIA', 'GESTOR', 'METROLOGIA'];
const j = (x) => JSON.parse(JSON.stringify(x === undefined ? null : x));

function amb(pasta) { return ambiente(Object.assign({ extras: EXTRAS }, pasta ? { pasta } : {})); }
const ses = (a, login) => Object.assign({}, a.sessoes['s_' + login]);
const salvarExc = (a, login, mudancas, motivo) => {
  const r = a.api('admin', 'salvar', { usuarioId: a.idDe(login), motivo: motivo || 'Teste do lote 4 (exceção)', mudancas });
  assert.ok(r && r.ok, 'gravar exceção: ' + JSON.stringify(r));
  a.limparMemo();
};
const msgDe = (fn) => { try { fn(); return ''; } catch (e) { return String(e.message); } };
/** Resultado comparável: só os campos de permissão e a mensagem (o resto depende de dados que o teste não monta). */
function res(r) {
  if (!r || typeof r !== 'object') return { valor: r };
  const o = {};
  ['ok', 'success', 'message', 'erro', 'podeAprovar', 'podeAprovarEmissao', 'podeAlterarModelo', 'aprovador'].forEach((k) => { if (k in r) o[k] = r[k]; });
  return o;
}
const chamar = (a, nome, args) => {
  if (typeof a.ctx[nome] !== 'function') return { ausente: nome };
  try { return res(a.ctx[nome].apply(null, args)); } catch (e) { return { lancou: String(e.message) }; }
};

// ------------------------------------------------------------------ 1) equivalência
const BOOLEANOS = ['AutoRel_acEhAprovador_', 'AutoOficial_ehAprovador_', 'CadeiaFrioRel_ehAprovador_', 'CadeiaFrioOficial_ehAprovador_', 'EstufaQ_ehAprovador_',
  'LavRel_lvEhAprovador_', 'LavOficial_ehAprovador_'];
const EXIGIR = ['AutoRel_acExigirAprovador_', 'AutoOficial_exigirAprovador_', 'CadeiaFrioRel_exigirAprovador_', 'CadeiaFrioOficial_exigirAprovador_',
  'EstufaOficial_exigirAprovador_', 'EstufaQ_exigirAprovador_', 'LavRel_lvExigirAprovador_', 'LavOficial_exigirAprovador_'];
const APIS = ['AutoRel_apiMontarCertificadoFinal', 'LavRel_apiMontarCertificadoFinal', 'CadeiaFrioRel_apiEmitirRelatorio', 'EstufaQ_apiEmitir',
  'AutoRel_apiListarAprovacoes', 'AutoRel_apiPreverAprovacao', 'AutoRel_apiAprovarEmitir', 'AutoRel_apiDevolverAprovacao',
  'LavRel_apiListarAprovacoes', 'LavRel_apiPreverAprovacao', 'LavRel_apiAprovarEmitir', 'LavRel_apiDevolverAprovacao',
  'CadeiaFrioRel_apiListarAprovacoes', 'CadeiaFrioRel_apiPreverAprovacao', 'CadeiaFrioRel_apiAprovarEmitir', 'CadeiaFrioRel_apiDevolverAprovacao',
  'CadeiaFrioOficial_apiPreverAprovacao', 'CadeiaFrioOficial_apiAprovarEmitir', 'CadeiaFrioOficial_apiDevolver',
  'AutoOficial_apiListarAprovacoes', 'AutoOficial_apiPreverAprovacao', 'AutoOficial_apiAprovarEmitir', 'AutoOficial_apiDevolver', 'AutoOficial_apiAbrir',
  'LavOficial_apiListarAprovacoes', 'LavOficial_apiPreverAprovacao', 'LavOficial_apiAprovarEmitir', 'LavOficial_apiDevolver', 'LavOficial_apiAbrir',
  'EstufaOficial_apiListarAprovacoes', 'EstufaOficial_apiPreverAprovacao', 'EstufaOficial_apiAprovarEmitir', 'EstufaOficial_apiDevolver', 'EstufaOficial_apiAbrir',
  'EstufaQ_apiListarAprovacoes', 'EstufaQ_apiPreverAprovacao', 'EstufaQ_apiAprovarEmitir', 'EstufaQ_apiDevolver',
  'AutoOficial_apiSituacao', 'LavOficial_apiSituacao', 'EstufaQ_apiSituacao', 'EstufaOficial_apiSituacao',
  'AutoOficial_apiDefinirModelo', 'LavOficial_apiDefinirModelo', 'EstufaQ_apiDefinirModelo', 'CadeiaFrioRel_apiDefinirModelos'];
function acoes() {
  const l = [];
  BOOLEANOS.forEach((f) => l.push([f, (a, eu) => chamar(a, f, [ses(a, eu)])]));
  EXIGIR.forEach((f) => l.push([f, (a, eu) => chamar(a, f, [ses(a, eu)])]));
  APIS.forEach((f) => l.push([f, (a, eu) => chamar(a, f, [{}, ses(a, eu)])]));
  l.push(['BaixaTemp_exigirAprovador_', (a, eu) => chamar(a, 'BaixaTemp_exigirAprovador_', [ses(a, eu), { ELABORADO_POR_ID: 'outra-pessoa' }])]);
  l.push(['BaixaTemp_exigirAprovador_ (quem elaborou)', (a, eu) => chamar(a, 'BaixaTemp_exigirAprovador_', [ses(a, eu), { ELABORADO_POR_ID: a.idDe(eu) }])]);
  l.push(['BaixaTemp_apiPing', (a, eu) => chamar(a, 'BaixaTemp_apiPing', ['s_' + eu, {}, ses(a, eu)])]);
  l.push(['quem aprova (diagnóstico)', (a) => ({ nomes: a.ctx.SGO_QEQ_nomesDosPerfis_(PERFIS, 'RELATORIO_TECNICO_APROVAR') })]);
  return l;
}

test('1) equivalência: 23 contas reais × ações do lote 4, sem exceções = legado de antes (resultado e mensagem)', () => {
  assert.ok(fs.existsSync(path.join(pastaAntes, 'SGO_QualifEmissao.js')), 'cópia de antes: ' + pastaAntes);
  assert.ok(!/SGO_QE_podeCaixa_/.test(lerAntes('SGO_QualifEmissao.js')), 'a cópia de antes precisa ser anterior ao lote 4');
  const contas = amb().contas.map((u) => u.login);
  assert.equal(contas.length, 23);
  const lista = acoes(), divergencias = [];
  let comparacoes = 0, recusadas = 0, ausentes = 0;
  for (const eu of contas) {
    const antes = amb(pastaAntes), depois = amb();
    for (const [rotulo, fn] of lista) {
      const ra = j(fn(antes, eu)), rd = j(fn(depois, eu));
      comparacoes++;
      if (ra && ra.ausente) ausentes++;
      if (ra && (ra.lancou || ra.ok === false || ra.success === false || ra.valor === false)) recusadas++;
      if (JSON.stringify(ra) !== JSON.stringify(rd)) divergencias.push(eu + ' · ' + rotulo + '\n   antes:  ' + JSON.stringify(ra).slice(0, 300) + '\n   depois: ' + JSON.stringify(rd).slice(0, 300));
    }
  }
  fs.writeFileSync(path.join(pastaPoderes, 'lote4-equivalencia.txt'),
    'Lote 4 — equivalência (sem exceções) em ' + new Date().toISOString() + '\ncontas=' + contas.length + ' ações=' + lista.length + ' comparações=' + comparacoes +
    ' recusadas(antes)=' + recusadas + ' funções ausentes=' + ausentes + ' divergências=' + divergencias.length + '\nações: ' + lista.map((x) => x[0]).join(' | ') + '\n' + divergencias.join('\n') + '\n');
  assert.equal(divergencias.length, 0, divergencias.slice(0, 5).join('\n'));
  assert.equal(ausentes, 0, 'toda função da lista existe nos dois legados');
  assert.ok(recusadas > 300 && recusadas < comparacoes - 200, 'a sequência precisa ter recusas e liberações: ' + recusadas + '/' + comparacoes);
});

// ------------------------------------------------------------------ 2) exceção NÃO
test('2) exceção NÃO: a gestora de RH deixa de aprovar relatório técnico; o servidor recusa com a mensagem da caixa', () => {
  const a = amb();
  const s = () => ses(a, 'elisa');
  assert.equal(a.ctx.EstufaQ_ehAprovador_(s()), true, 'padrão: gestor aprova');
  assert.equal(a.ctx.BaixaTemp_podeAprovar_(s()), true);
  assert.ok(a.ctx.SGO_QEQ_nomesDosPerfis_(PERFIS, 'RELATORIO_TECNICO_APROVAR').includes('ELISA'));
  salvarExc(a, 'elisa', [{ codigo: 'RELATORIO_TECNICO_APROVAR', valor: 'NAO' }, { codigo: 'RELATORIO_BAIXATEMP_APROVAR', valor: 'NAO' }], 'Gestora de RH não assina relatório técnico');
  BOOLEANOS.forEach((f) => assert.equal(a.ctx[f](s()), false, f));
  EXIGIR.forEach((f) => {
    const m = msgDe(() => a.ctx[f](s()));
    assert.match(m, /«Aprovar relatório técnico de qualificação»/, f + ': ' + m);
    assert.match(m, /Administração > Acessos/, f);
  });
  ['AutoRel_apiMontarCertificadoFinal', 'LavRel_apiMontarCertificadoFinal', 'CadeiaFrioRel_apiEmitirRelatorio', 'EstufaQ_apiEmitir',
    'AutoOficial_apiAprovarEmitir', 'LavOficial_apiAprovarEmitir', 'EstufaOficial_apiAprovarEmitir', 'CadeiaFrioOficial_apiAprovarEmitir', 'EstufaQ_apiAprovarEmitir',
    'AutoRel_apiAprovarEmitir', 'LavRel_apiAprovarEmitir', 'CadeiaFrioRel_apiAprovarEmitir', 'AutoOficial_apiDevolver', 'EstufaQ_apiDevolver'].forEach((f) => {
    const m = msgDe(() => a.ctx[f]({}, s()));
    assert.match(m, /«Aprovar relatório técnico de qualificação»/, f + ': ' + m);
  });
  const mb = msgDe(() => a.ctx.BaixaTemp_exigirAprovador_(s(), { ELABORADO_POR_ID: 'outra' }));
  assert.match(mb, /«Aprovar ensaio de baixa temperatura»/, mb);
  // a tela recebe "não aprova"; o diagnóstico deixa de citá-la; as outras caixas dela continuam
  assert.equal(a.ctx.EstufaQ_apiSituacao({}, s()).podeAprovar, false);
  assert.equal(a.ctx.AutoOficial_apiSituacao({}, s()).podeAprovar, false);
  assert.equal(a.ctx.BaixaTemp_apiPing('s_elisa', {}, s()).podeAprovar, false);
  const nomes = a.ctx.SGO_QEQ_nomesDosPerfis_(PERFIS, 'RELATORIO_TECNICO_APROVAR');
  assert.ok(!nomes.includes('ELISA') && nomes.includes('BEATRIZ'), JSON.stringify(nomes));
  assert.equal(a.ctx.SGO_pode_('s_elisa', 'CONTAS_VER'), true, 'só a caixa tirada muda');
  // quem não tem exceção continua igual (Beatriz, Metrologia)
  assert.equal(a.ctx.EstufaQ_ehAprovador_(ses(a, 'beatriz')), true);
  assert.equal(msgDe(() => a.ctx.LavOficial_exigirAprovador_(ses(a, 'beatriz'))), '');
});

// ------------------------------------------------------------------ 3) exceção SIM
test('3) exceção SIM: técnico passa a aprovar relatório técnico; "quem elaborou não aprova" continua valendo', () => {
  const a = amb();
  const s = () => ses(a, 'joaopedro');
  const padrao = msgDe(() => a.ctx.AutoOficial_exigirAprovador_(s()));
  assert.match(padrao, /^Somente o responsável técnico \(perfis ADMIN, DIRETORIA, GESTOR, METROLOGIA\)/, 'padrão: técnico recusado com a mensagem de antes');
  salvarExc(a, 'joaopedro', [{ codigo: 'RELATORIO_TECNICO_APROVAR', valor: 'SIM' }, { codigo: 'RELATORIO_BAIXATEMP_APROVAR', valor: 'SIM' }], 'Técnico habilitado como responsável técnico substituto');
  BOOLEANOS.forEach((f) => assert.equal(a.ctx[f](s()), true, f));
  EXIGIR.forEach((f) => assert.equal(msgDe(() => a.ctx[f](s())), '', f));
  assert.equal(a.ctx.EstufaQ_apiSituacao({}, s()).podeAprovar, true);
  assert.equal(a.ctx.LavOficial_apiSituacao({}, s()).podeAprovar, true);
  assert.equal(a.ctx.EstufaQ_apiSituacao({}, s()).podeAlterarModelo, false, 'escolher modelo é outra caixa');
  // a emissão direta passa da trava de aprovação e para na conferência seguinte (confirmação), igual a um gestor
  const m = msgDe(() => a.ctx.EstufaQ_apiEmitir({}, s()));
  assert.doesNotMatch(m, /aprovação do responsável técnico|«Aprovar/, m);
  assert.ok(a.ctx.SGO_QEQ_nomesDosPerfis_(PERFIS, 'RELATORIO_TECNICO_APROVAR').includes('JOAOPEDRO'));
  // baixa temperatura: aprova, mas nunca o ensaio que ele mesmo elaborou (proteção fixa)
  assert.equal(msgDe(() => a.ctx.BaixaTemp_exigirAprovador_(s(), { ELABORADO_POR_ID: 'outra' })), '');
  assert.match(msgDe(() => a.ctx.BaixaTemp_exigirAprovador_(s(), { ELABORADO_POR_ID: a.idDe('joaopedro') })), /Quem elaborou o ensaio não pode aprová-lo/);
  assert.equal(a.ctx.BaixaTemp_apiPing('s_joaopedro', {}, s()).podeAprovar, true);
  // escolher o modelo: Diretoria com SIM passa a escolher; sem SIM, a mensagem de antes
  assert.match(msgDe(() => a.ctx.AutoOficial_apiDefinirModelo({}, ses(a, 'charles'))), /^Somente o Administrador do sistema/);
  salvarExc(a, 'charles', [{ codigo: 'RELATORIO_MODELO_ESCOLHER', valor: 'SIM' }], 'Diretoria escolhe o modelo dos relatórios');
  assert.equal(a.ctx.AutoOficial_apiSituacao({}, ses(a, 'charles')).podeAlterarModelo, true);
  assert.equal(msgDe(() => a.ctx.AutoOficial_apiDefinirModelo({ modelo: 'NOVO' }, ses(a, 'charles'))), '');
  assert.equal(a.ctx.CadeiaFrioRel_apiDefinirModelos({}, ses(a, 'charles')).ok, true);
  // exceção NÃO no modelo para o Administrador não-dono não existe nas contas reais; o dono continua com tudo
  for (const c of LOTE4) assert.equal(a.ctx.SGO_pode_('s_admin', c), true, c);
  // conta de fora nunca aprova, mesmo com o perfil certo na sessão
  assert.equal(a.ctx.EstufaQ_ehAprovador_(Object.assign(ses(a, 'hst'), { perfil: 'CLIENTE' })), false);
});

// ------------------------------------------------------------------ 4) simulação didática
test('4) simulação didática continua fora do caminho oficial: nada dela mudou e nada dela pergunta a caixa', () => {
  ['SGO_QualifSimulacao.js', 'SGO_SimuladorCodigo.js'].forEach((f) => {
    if (!fs.existsSync(path.join(pastaAntes, f))) return;
    assert.equal(lerLegado(f), lerAntes(f), f + ' não pode mudar no lote 4');
    assert.doesNotMatch(lerLegado(f), /SGO_QE_podeCaixa_|SGO_pode_|RELATORIO_TECNICO_APROVAR/, f);
  });
  // os desvios de simulação (dados reconstituídos) continuam antes da trava, com o mesmo texto
  const pares = [['SGO_EstufaBanhoRel_Qualif.js', "if (!simulado && !EstufaQ_ehAprovador_(sessao)) throw new Error(SGO_QE_msgRecusa_(sessao, "],
    ['SGO_AutoRel_CertificadoRelatorio.js', 'if (!payload.modoRelatorioSimulado && !AutoRel_acEhAprovador_(sessao)) {'],
    ['SGO_LavRel_CertificadoRelatorio.js', 'if (!payload.modoRelatorioSimulado && !LavRel_lvEhAprovador_(sessao)) {'],
    ['SGO_CadeiaFrioRel_Emissao.js', 'if (!payload.modoRelatorioSimulado && !CadeiaFrioRel_ehAprovador_(sessao)) {']];
  pares.forEach(([f, t]) => assert.ok(lerLegado(f).includes(t), f));
  // o registro oficial e a simulação: as linhas que separam "simulado" de "oficial" são idênticas às de antes
  ['SGO_EstufaBanhoRel_Qualif.js', 'SGO_EstufaBanhoRel_ModeloOficialNovo.js', 'SGO_AutoRel_ModeloOficialNovo.js', 'SGO_LavRel_ModeloOficialNovo.js', 'SGO_CadeiaFrioRel_ModeloOficial.js',
    'SGO_AutoRel_CertificadoRelatorio.js', 'SGO_LavRel_CertificadoRelatorio.js', 'SGO_CadeiaFrioRel_Emissao.js'].forEach((f) => {
    const sim = (t) => t.split(/\r?\n/).filter((l) => /SGO_QSIM_|simDidatica|simulacaoDidatica|ctx\.simulado/.test(l));
    assert.deepEqual(sim(lerLegado(f)), sim(lerAntes(f)), f);
  });
  // gestora com exceção NÃO: a simulação continua a mesma (o desvio do simulado vem antes da caixa, como antes)
  const a = amb();
  salvarExc(a, 'elisa', [{ codigo: 'RELATORIO_TECNICO_APROVAR', valor: 'NAO' }]);
  const m = msgDe(() => a.ctx.EstufaQ_apiEmitir({ modoEntrada: 'SIMULADO_ADMIN' }, ses(a, 'elisa')));
  assert.doesNotMatch(m, /«Aprovar relatório técnico/, 'a caixa não é o que libera ou trava a simulação: ' + m);
});

// ------------------------------------------------------------------ 5) tela e ajuda
test('5) tela: os sinais da tela seguem a caixa; caixas ligadas na tela Acessos; ajuda atualizada', () => {
  const a = amb();
  const cat = a.ctx.SGO_poderesCatalogo_().mapa;
  LOTE4.forEach((c) => assert.equal(cat[c].ligado, true, c));
  assert.equal(cat.RELATORIO_INTERNO_SIMULADO.ligado, false, 'relatório interno fica de fora (trava é a senha do simulador)');
  // as telas não decidem por perfil: usam os sinais do servidor
  const autoTela = lerLegado('JS_TemplateAutoclave.html'), lavTela = lerLegado('JS_TemplateLavadora.html');
  [autoTela, lavTela].forEach((t) => { assert.match(t, /podeAprovar/); assert.match(t, /podeAlterarModelo/); });
  ['SGO_AutoRel_ConteudoModulo.js', 'SGO_LavRel_ConteudoModulo.js', 'SGO_CadeiaFrioRel_ConteudoModulo.js', 'SGO_EstufaBanhoRel_ConteudoModulo.js'].forEach((f) => assert.match(lerLegado(f), /podeAprovar/, f));
  assert.match(lerLegado('SGO_BaixaTemp_Tela.js'), /podeAprovar/);
  // a página completa inclui as telas (o include está na página servida, não só no componente)
  const paginas = fs.readdirSync(pastaLegado).filter((f) => /\.html$/.test(f)).map((f) => lerLegado(f)).join('\n');
  ['JS_TemplateAutoclave', 'JS_TemplateLavadora', 'JS_BaixaTemp'].forEach((n) => assert.match(paginas, new RegExp("include\\(['\"]" + n + "['\"]\\)"), n));
  // 8 casos: o sinal da tela é o mesmo que a recusa do servidor
  const casos = [['beatriz', []], ['elisa', []], ['joaopedro', []], ['wanessa', []],
    ['elisa', [{ codigo: 'RELATORIO_TECNICO_APROVAR', valor: 'NAO' }]], ['joaopedro', [{ codigo: 'RELATORIO_TECNICO_APROVAR', valor: 'SIM' }]],
    ['wanessa', [{ codigo: 'RELATORIO_TECNICO_APROVAR', valor: 'SIM' }]], ['priscilla', [{ codigo: 'RELATORIO_TECNICO_APROVAR', valor: 'NAO' }]]];
  casos.forEach(([login, exc]) => {
    const b = amb();
    if (exc.length) salvarExc(b, login, exc);
    const s = ses(b, login);
    const tela = [b.ctx.AutoOficial_apiSituacao({}, s).podeAprovar, b.ctx.LavOficial_apiSituacao({}, s).podeAprovar, b.ctx.EstufaQ_apiSituacao({}, s).podeAprovar];
    const servidor = msgDe(() => b.ctx.CadeiaFrioOficial_exigirAprovador_(s)) === '';
    tela.forEach((v) => assert.equal(v, servidor, login + ' ' + JSON.stringify(exc)));
  });
  // ajuda
  const ajudaAdm = lerLegado('SGO_Ajuda_Administracao.js');
  assert.match(ajudaAdm, /lote 4/i); assert.match(ajudaAdm, /Aprovar relatório técnico de qualificação/);
  const ajudas = fs.readdirSync(pastaLegado).filter((f) => /^SGO_Ajuda.*\.js$/.test(f) && f !== 'SGO_Ajuda_Administracao.js').map((f) => lerLegado(f)).join('\n');
  assert.match(ajudas, /Administração > Acessos[^"]{0,400}aprova|aprova[^"]{0,400}Administração > Acessos/);
});
