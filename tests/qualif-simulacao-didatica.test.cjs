// Simulação didática (11/11/2026, decisão do dono): no modo de dados reconstituídos, todos os documentos da
// estufa saem com a marca d'água "SIMULAÇÃO DIDÁTICA", numeração SIM-AAAA-NNNN, registro em aba própria e
// nunca entram no caminho oficial (ficha, QR code, Arquivo de documentos, envio ao cliente, situação).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('./_estufa_ambiente.cjs');

const temSimulacao = fs.existsSync(path.join(E.MO.A.BASE, 'SGO_QualifSimulacao.js'));
const VINC = { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq3' };
const temCodigo = fs.existsSync(path.join(E.MO.A.BASE, 'SGO_SimuladorCodigo.js'));
/**
 * Como na produção: carrega o código do WhatsApp do dono (SGO_SimuladorCodigo.js) e libera a sessão pelo fluxo
 * real (pedido → envio simulado ao WhatsApp → conferência). Sem o arquivo na fonte testada, não faz nada.
 */
function liberar(env, sid) {
  if (!temCodigo) return;
  env.run(fs.readFileSync(path.join(E.MO.A.BASE, 'SGO_SimuladorCodigo.js'), 'utf8'));
  env.run('var ENVIOS_WA = []; SegAcesso_enviarWhatsapp_ = function (t, c) { ENVIOS_WA.push({ t: t, c: c }); return { ok: true }; };' +
    'SGO_DATA.insert("CAD_USUARIOS", { ID: "u_dono", USUARIO: "admin", NOME: "Dono Teste", PERFIL: "ADMIN", CELULAR: "(62) 99999-0000", STATUS: "ATIVO" });');
  const p = env.fn('simuladorCodigoPedir')(sid);
  assert.equal(p.ok, true, p.erro);
  const c = env.run('ENVIOS_WA[ENVIOS_WA.length - 1].c');
  const v = env.fn('simuladorCodigoValidarSenhaCodigo')(sid, c);
  assert.equal(v.ok, true, v.erro);
}
const hora = (h, m = 0) => `04/11/2026 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;

function payloadSim(extra) {
  return Object.assign({
    perfil: 'ESTUFA_INCUBACAO', nSensores: 12, sensoresAtivos: Array(12).fill(true), faixaTMin: 34.9, faixaTMax: 35.1, tolerancia: 0.5,
    modoEntrada: 'SIMULADO_ADMIN', simulacaoSenha: 'senha-teste', cliente: 'HOSPITAL MODELO TESTE LTDA', cnpj: '11.222.333/0001-81', tag: 'EST-TESTE-01',
    simulacao: { temperaturaAlvo: 35, intervaloSegundos: 60, inicioEstudo: hora(8), fimEstudo: hora(16), resultadoDistribuicao: 'APROVADO' },
    estudos: { distribuicao: { tipo: 'DISTRIBUICAO_VAZIO', inicio: hora(8), fim: hora(16), resultadoDesejado: 'APROVADO' } },
    qualif: { setpoint: 35, limUniformidade: 0.1, limEstabilidade: 0.1, limDesvioSetpoint: 0.05 }, certDataLogger: 'DTL-T1', responsavelTecnico: 'Técnico Teste'
  }, extra || {});
}

function marcaEmTodasAsPaginas(html) {
  assert.match(html, /<div class="sgo-sim-didatica" aria-hidden="true">SIMULAÇÃO DIDÁTICA<\/div>/);
  assert.match(html, /\.sgo-sim-didatica\{position:fixed;[^}]*rotate\(-35deg\);[^}]*21pt[^}]*rgba\(190,30,30,\.13\)/);
  assert.doesNotMatch(html, /class="aviso-simulado"/, 'sem faixa vermelha');
  assert.doesNotMatch(html, /sgo-docsalvar-aviso/, 'sem outro texto de aviso');
  // position:fixed repete a marca em cada página impressa; se o HTML vier paginado, cada página tem a marca no corpo.
  const paginas = (html.match(/class="pagina[ "]/g) || []).length;
  if (paginas > 1) assert.ok((html.match(/sgo-sim-didatica" aria-hidden/g) || []).length >= 1);
}

function emitirSim(env) {
  const p = payloadSim();
  const r = env.estufa('adm', 'apiQGerarRascunho', p);
  assert.equal(r.ok, true, r.erro);
  assert.equal(r.bloqueado, false, JSON.stringify(r.travas));
  const em = env.estufa('adm', 'apiQEmitir', Object.assign({}, p, { assinaturaContexto: r.assinaturaContexto, textosCertificado: r.textos }));
  assert.equal(em.ok, true, em.erro);
  const pl = env.estufa('adm', 'apiGerarPlanilhaDados', p);
  assert.equal(pl.ok, true, pl.erro);
  return { em, pl, p };
}

test('simulação didática: relatório de ensaio e planilha com marca d\'água, número SIM e aba própria; nada oficial', { skip: !temSimulacao }, () => {
  const env = E.criarAmbiente({ props: { SIMULADOR_ADMIN_SENHA: 'senha-teste' } });
  liberar(env, 'adm');
  const antesSeq = JSON.stringify(env.props);
  const { em, pl } = emitirSim(env);
  assert.match(em.numero, /^SIM-\d{4}-\d{4}-E$/);
  assert.match(pl.numero, /^SIM-\d{4}-\d{4}-D$/);
  marcaEmTodasAsPaginas(em.html);
  marcaEmTodasAsPaginas(pl.html);
  assert.equal(em.pdfUrl, ''); assert.equal(em.pdfId, '', 'sem "Enviar ao cliente" (sem PDF oficial)');
  // nunca a numeração oficial: a sequência REE não andou e nada em QUALIF_EMISSOES
  assert.ok(!Object.keys(env.props).some(k => /^ESTUFAQ_SEQ|^ESTUFAOFICIAL_SEQ/.test(k) && !antesSeq.includes(k)), JSON.stringify(env.props));
  assert.equal(env.fn('SGO_QE_lerTudo_')().length, 0);
  const sims = env.oficialEstufa('tec', 'apiSimListar', {});
  assert.equal(sims.itens.length, 2);
  assert.deepEqual(sims.itens.map(i => i.rotulo).sort(), ['Planilha de dados', 'Relatório de ensaio']);
  // reabrir: sempre com a marca
  const ab = env.oficialEstufa('tec', 'apiSimAbrir', { id: em.simulacaoDidatica.id });
  assert.equal(ab.ok, true, ab.erro);
  marcaEmTodasAsPaginas(ab.html);
  // ficha, QR code, Arquivo de documentos, situação e diagnóstico oficial não veem a simulação
  const eq = env.oficialEstufa('tec', 'apiEquipamento', VINC);
  assert.equal(eq.ensaios.length, 0);
  assert.equal(eq.oficiais.length, 0);
  assert.notEqual(eq.situacao.situacao, 'QUALIFICADO');
  assert.equal(eq.diagnostico.passos.length, 4, 'simulação não conta como emitido');
  assert.equal(env.run('SGO_DATA.getAll("DOC_DOCUMENTOS")').length, 0);
  assert.equal((env.fn('SGO_QEQ_todosItens_')()['eq3'] || []).length, 0);
});

test('relatório completo de qualificação simulado: só ensaios simulados, número SIM, marca e nada no caminho oficial', { skip: !temSimulacao }, () => {
  const env = E.criarAmbiente({ props: { SIMULADOR_ADMIN_SENHA: 'senha-teste' } });
  liberar(env, 'adm');
  const { em } = emitirSim(env);
  const qi = {};
  env.oficialEstufa('tec', 'apiSituacao', {}).qiItens.forEach(it => { qi[it.id] = { situacao: 'C' }; });
  const base = Object.assign({}, VINC, { etapas: { QI: true, QO: true }, motivo: 'Qualificação inicial', periodicidadeMeses: 12, qi, dataQi: '05/11/2026', simulacaoSenha: 'senha-teste' });
  // sem senha: recusado
  const semSenha = env.oficialEstufa('adm', 'apiSimQualificacao', Object.assign({}, base, { simulacaoSenha: '', ensaios: [em.simulacaoDidatica.id] }));
  assert.equal(semSenha.ok, false);
  assert.match(semSenha.erro, /Senha administrativa/);
  const q = env.oficialEstufa('adm', 'apiSimQualificacao', Object.assign({}, base, { ensaios: [em.simulacaoDidatica.id] }));
  assert.equal(q.ok, true, q.erro);
  assert.equal(q.bloqueado, false, JSON.stringify(q.travas));
  assert.match(q.numero, /^SIM-\d{4}-\d{4}$/);
  marcaEmTodasAsPaginas(q.html);
  assert.match(q.html, new RegExp(em.numero), 'Anexo A lista o ensaio simulado');
  assert.doesNotMatch(q.html, /MINUTA PARA CONFERÊNCIA/);
  // nada oficial: sem QUALIF_EMISSOES, sem Arquivo de documentos, sem situação de qualificado
  assert.equal(env.fn('SGO_QE_lerTudo_')().length, 0);
  assert.equal(env.run('SGO_DATA.getAll("DOC_DOCUMENTOS")').length, 0);
  const eq = env.oficialEstufa('tec', 'apiEquipamento', VINC);
  assert.equal(eq.oficiais.length, 0);
  assert.notEqual(eq.situacao.situacao, 'QUALIFICADO');
  assert.equal(env.oficialEstufa('tec', 'apiSimListar', {}).itens.filter(i => i.tipo === 'QUALIFICACAO').length, 1);
  // simulado nunca vira oficial: o id simulado é recusado no caminho oficial
  const of = env.oficialEstufa('tec', 'apiGerarRascunho', Object.assign({}, base, { ensaios: [em.simulacaoDidatica.id] }));
  assert.equal(of.bloqueado, true);
  assert.ok(of.travas.some(t => t.codigo === 'ENSAIO_NAO_ENCONTRADO'), JSON.stringify(of.travas));
});

test('relatório completo simulado não aceita ensaio oficial (não mistura)', { skip: !temSimulacao }, () => {
  const env = E.criarAmbiente({ props: { SIMULADOR_ADMIN_SENHA: 'senha-teste' } });
  liberar(env, 'adm');
  const id = env.fn('SGO_QE_registrar_')({ MODULO: 'ESTUFA', STATUS: 'EMITIDO', NUMERO: 'REE-T-9', EQUIPAMENTO_ID: 'eq3', RESUMO_JSON: '{"estudos":[],"statusConsolidado":"APROVADO"}' });
  const q = env.oficialEstufa('adm', 'apiSimQualificacao', Object.assign({}, VINC, { etapas: { QO: true }, motivo: 'Qualificação inicial', periodicidadeMeses: 12, ensaios: [id], simulacaoSenha: 'senha-teste' }));
  assert.equal(q.ok, true, q.erro);
  assert.equal(q.bloqueado, true);
  assert.ok(q.travas.some(t => t.codigo === 'SIM_NAO_ENCONTRADO'));
  assert.equal(env.oficialEstufa('tec', 'apiSimListar', {}).itens.length, 0);
});

test('caminho oficial inalterado: emissão real continua com número oficial, sem marca d\'água, na ficha', { skip: !temSimulacao }, () => {
  const env = E.criarAmbiente();
  const s = E.serieEstufa({});
  const p = E.payloadIncubacao(s, { certNumero: 'REE-T-1' });
  const r = env.estufa('rt', 'apiQGerarRascunho', p);
  assert.equal(r.bloqueado, false, JSON.stringify(r.travas));
  const em = env.estufa('rt', 'apiQEmitir', Object.assign({}, p, { assinaturaContexto: r.assinaturaContexto, textosCertificado: r.textos, confirmacaoRevisao: true }));
  assert.equal(em.ok, true, em.erro);
  assert.equal(em.numero, 'REE-T-1');
  assert.doesNotMatch(em.html, /SIMULAÇÃO DIDÁTICA|sgo-sim-didatica/);
  assert.equal(em.simulacaoDidatica, undefined);
  assert.equal(env.oficialEstufa('tec', 'apiEquipamento', VINC).ensaios.length, 1);
  assert.equal(env.oficialEstufa('tec', 'apiSimListar', {}).itens.length, 0);
});

test('marca d\'água: função comum retira faixas de aviso e repete com position:fixed', { skip: !temSimulacao }, () => {
  const env = E.criarAmbiente();
  const h = env.fn('SGO_QSIM_marca_')('<!DOCTYPE html><html><head><style></style></head><body><main><div class="aviso-simulado">RELATÓRIO INTERNO — x</div><p>a</p></main></body></html>');
  marcaEmTodasAsPaginas(h);
  assert.equal(env.fn('SGO_QSIM_marca_')(h), h, 'idempotente');
  assert.equal(env.fn('SGO_QSIM_ehNumeroSimulacao_')('SIM-2026-0001-E'), true);
  assert.equal(env.fn('SGO_QSIM_ehNumeroSimulacao_')('REE-2026-00002'), false);
});

/* ---------------- Autoclave, lavadora e cadeia de frio ---------------- */
const MO = require('./_modelo_oficial_ambiente.cjs');
const C = require('./_cadeiafrio_ambiente.cjs');
const L = require('./_lavadora_ambiente.cjs');

function vaporSim(extra) {
  return Object.assign({
    modoEntrada: 'SIMULADO_ADMIN', nSensores: 12, setpoint: '134', motor: '134', dateStyle: 'BR', simulacaoSenha: 'senha-teste',
    equipamento: { modoRemocaoAr: 'AUTO', unidadePressao: 'BAR_ABS' }, cliente: 'HOSPITAL MODELO TESTE LTDA', cnpj: '11.222.333/0001-81', tag: 'AUT-TESTE-01',
    certNumero: 'AUT-T-0001', certDataLogger: 'DTL-T1', respTecnico: 'Técnico Teste', ensaio: 'QO (Vazio)', cicloNum: '1',
    clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1',
    simulacao: { inicioCiclo: '22/01/2026 05:00:00', fimCiclo: '22/01/2026 06:20:00', inicioPreVacuo: '22/01/2026 05:03:00', fimPreVacuo: '22/01/2026 05:25:00',
      pulsosPreVacuo: '3', pressaoPulsoPositiva: '1.50', pressaoVacuoMin: '0.35', inicioEsterilizacao: '22/01/2026 05:42:00', fimEsterilizacao: '22/01/2026 05:57:00',
      inicioSecagem: '22/01/2026 05:58:00', fimSecagem: '22/01/2026 06:15:00', temperaturaAlvo: '134', intervaloSegundos: '10', resultadoDesejado: 'APROVADO' }
  }, extra || {});
}

test('autoclave: ensaio e planilha simulados com SIM e marca; relatório completo simulado só com ciclos simulados; nada oficial', { skip: !temSimulacao }, () => {
  const env = MO.criarAmbiente({ props: { SIMULADOR_ADMIN_SENHA: 'senha-teste' } });
  liberar(env, 'adm');
  const D = (sid, fn, payload) => JSON.parse(JSON.stringify(env.fn('AutoRel_apiDispatch')({ sessionId: sid, fn, payload })));
  const p = vaporSim();
  const pl = D('adm', 'apiConverter', p);
  assert.ok(!pl.erro && pl.ok !== false, JSON.stringify(pl).slice(0, 300));
  assert.match(pl.numero || (pl.simulacaoDidatica || {}).numero || '', /^SIM-\d{4}-\d{4}-D$/);
  marcaEmTodasAsPaginas(pl.html);
  const r = D('adm', 'apiGerarRascunhoCertificado', p);
  assert.ok(r.ok !== false, JSON.stringify(r).slice(0, 300));
  const em = D('adm', 'apiMontarCertificadoFinal', Object.assign({}, p, { assinaturaContextoCertificado: r.assinaturaContexto, textosCertificado: r.textos, confirmacaoRevisao: true }));
  assert.ok(em.ok !== false, JSON.stringify(em).slice(0, 400));
  assert.match(em.numero, /^SIM-\d{4}-\d{4}-E$/);
  marcaEmTodasAsPaginas(em.html);
  assert.equal(env.fn('SGO_QE_lerTudo_')().length, 0, 'nada em QUALIF_EMISSOES');
  const lista = env.oficial('tec', 'apiSimListar', {});
  assert.equal(lista.itens.length, 2);
  const q = env.oficial('adm', 'apiSimQualificacao', { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1', etapas: { QO: true }, motivo: 'Qualificação inicial', periodicidadeMeses: 12, ciclos: [em.simulacaoDidatica.id], simulacaoSenha: 'senha-teste' });
  assert.equal(q.ok, true, q.erro);
  assert.equal(q.bloqueado, false, JSON.stringify(q.travas));
  assert.match(q.numero, /^SIM-\d{4}-\d{4}$/);
  marcaEmTodasAsPaginas(q.html);
  const eq = env.oficial('tec', 'apiEquipamento', { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1' });
  assert.equal(eq.ciclos.length, 0); assert.equal(eq.oficiais.length, 0);
  assert.equal(env.run('SGO_DATA.getAll("DOC_DOCUMENTOS")').length, 0);
  // simulado nunca vira oficial
  const of = env.oficial('tec', 'apiGerarRascunho', { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1', etapas: { QO: true }, motivo: 'Qualificação inicial', periodicidadeMeses: 12, ciclos: [em.simulacaoDidatica.id] });
  assert.equal(of.bloqueado, true);
  const semSenha = env.oficial('adm', 'apiSimQualificacao', { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1', etapas: { QO: true }, motivo: 'Qualificação inicial', periodicidadeMeses: 12, ciclos: [em.simulacaoDidatica.id], simulacaoSenha: 'errada' });
  assert.equal(semSenha.ok, false);
});

/** Copia o resumo de um ensaio oficial para um registro da simulação (só para testar a consolidação simulada). */
function simDeResumo(env, modulo, resumoJson, numero) {
  return env.fn('SGO_QSIM_registrar_')({ MODULO: modulo, TIPO: 'ENSAIO', NUMERO: numero, RESUMO_JSON: resumoJson, CRIADO_POR: 'Teste' });
}

test('cadeia de frio e lavadora: relatório completo simulado consolida só a simulação, com marca e número SIM', { skip: !temSimulacao }, () => {
  // Lavadora: resumo de um ciclo oficial copiado para a simulação
  const l = L.criarAmbiente({ cadastro: true, props: { SIMULADOR_ADMIN_SENHA: 'senha-teste' } });
  liberar(l, 'adm');
  const resumoLav = JSON.stringify(l.fn('LavOficial_resumoCiclo_') ? { statusConsolidado: 'APROVADO', identificacao: { dataDoEnsaio: '05/11/2026' }, tipoCiclo: 'TERMO', ensaio: 'QO (Vazio)' } : {});
  const idL = simDeResumo(l, 'LAVADORA', resumoLav, 'SIM-2026-0101-E');
  const ql = l.oficial('adm', 'apiSimQualificacao', { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1', etapas: { QO: true }, motivo: 'Qualificação inicial', periodicidadeMeses: 12, ciclos: [idL], simulacaoSenha: 'senha-teste' });
  assert.equal(ql.ok, true, ql.erro);
  if (!ql.bloqueado) { assert.match(ql.numero, /^SIM-/); marcaEmTodasAsPaginas(ql.html); }
  else assert.ok(!ql.travas.some(t => /^SIM_/.test(t.codigo)), 'a simulação foi encontrada: ' + JSON.stringify(ql.travas));
  assert.equal(l.fn('SGO_QE_lerTudo_')().filter(r => /OFICIAL/.test(r.MODULO)).length, 0);
  // Cadeia de frio: id oficial é recusado no simulado; o simulado é aceito
  const c = C.criarAmbiente({ props: { SIMULADOR_ADMIN_SENHA: 'senha-teste' } });
  liberar(c, 'adm');
  const idOf = c.fn('SGO_QE_registrar_')({ MODULO: 'CADEIA_FRIO', STATUS: 'EMITIDO', NUMERO: 'RCF-T-1', EQUIPAMENTO_ID: 'eq1', RESUMO_JSON: '{"estudos":[],"statusConsolidado":"APROVADO","identificacao":{}}' });
  const qc1 = c.oficial('adm', 'apiSimQualificacao', { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1', etapas: { QO: true }, motivo: c.fn('CFOFICIAL_CFG').MOTIVOS[0], periodicidadeMeses: 12, ensaios: [idOf], simulacaoSenha: 'senha-teste' });
  assert.equal(qc1.ok, true, qc1.erro);
  assert.equal(qc1.bloqueado, true);
  assert.ok(qc1.travas.some(t => t.codigo === 'SIM_NAO_ENCONTRADO'));
  assert.equal(c.oficial('tec', 'apiSimListar', {}).itens.length, 0);
});

test('telas: lista "Simulações didáticas" nos quatro módulos (reabrir e relatório completo simulado)', { skip: !temSimulacao }, () => {
  const base = E.MO.A.BASE;
  const ler = n => fs.readFileSync(path.join(base, n), 'utf8');
  const decod = n => { const l = ler(n).split(/\r?\n/)[0]; return JSON.parse(l.slice(l.indexOf('= ') + 2).replace(/;\s*$/, '')); };
  const telas = { estufa: decod('SGO_EstufaBanhoRel_ConteudoModulo.js'), cadeia: decod('SGO_CadeiaFrioRel_ConteudoModulo.js'), autoclave: ler('JS_TemplateAutoclave.html'), lavadora: ler('JS_TemplateLavadora.html') };
  for (const [nome, t] of Object.entries(telas)) {
    assert.match(t, /Simulações didáticas/, nome);
    assert.match(t, /'apiSimListar'/, nome);
    assert.match(t, /'apiSimAbrir'/, nome);
    assert.match(t, /'apiSimQualificacao'/, nome);
    assert.match(t, /não entram na ficha do equipamento, no QR code, no Arquivo de documentos/, nome);
  }
});

test('número SIM nunca entra no registro oficial (mesmo digitado no campo do número)', { skip: !temSimulacao }, () => {
  const env = E.criarAmbiente();
  assert.throws(() => env.fn('SGO_QE_registrar_')({ MODULO: 'ESTUFA', STATUS: 'AGUARDANDO_APROVACAO', NUMERO: 'SIM-2026-0003-E' }), /simulação didática e não pode ser usado em documento oficial/);
  const s = E.serieEstufa({});
  const p = E.payloadIncubacao(s, { certNumero: 'SIM-2026-0003-D' });
  const r = env.estufa('rt', 'apiQGerarRascunho', p);
  assert.equal(r.bloqueado, false, JSON.stringify(r.travas));
  assert.throws(() => env.estufa('rt', 'apiQEmitir', Object.assign({}, p, { assinaturaContexto: r.assinaturaContexto, textosCertificado: r.textos, confirmacaoRevisao: true })), /simulação didática/);
  assert.equal(env.fn('SGO_QE_lerTudo_')().length, 0);
  assert.equal(Object.values(env.arquivos).filter(a => /SIM-2026-0003/.test(a.nome)).length, 0, 'nada salvo na pasta do cliente');
});
