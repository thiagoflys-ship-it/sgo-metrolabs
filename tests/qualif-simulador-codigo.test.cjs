// Código pelo WhatsApp do dono para abrir o modo de dados reconstituídos (11/11/2026): além da senha administrativa,
// 6 dígitos no WhatsApp do dono (admin), 10 minutos, uso único, até 5 tentativas, registro e aviso ao dono a cada
// pedido; liberado, vale 2 horas na sessão. Sem WhatsApp configurado, não libera. Envio simulado; só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('./_estufa_ambiente.cjs');

const ARQ = path.join(E.MO.A.BASE, 'SGO_SimuladorCodigo.js');
const tem = fs.existsSync(ARQ);

function ambiente(opcoes) {
  opcoes = opcoes || {};
  const env = E.criarAmbiente({ props: { SIMULADOR_ADMIN_SENHA: 'senha-teste' } });
  env.run(fs.readFileSync(ARQ, 'utf8'));
  env.run([
    'var ENVIOS_WA = []; var AVISOS_DONO = []; var FALHA_WA = ' + JSON.stringify(opcoes.falhaWa || '') + ';',
    'SegAcesso_enviarWhatsapp_ = function (t, c) { if (FALHA_WA) return { ok: false, motivo: FALHA_WA }; ENVIOS_WA.push({ t: t, c: c }); return { ok: true }; };',
    'SGO_notificar_ = function (o) { AVISOS_DONO.push(o); return { ok: 1 }; };',
    'SESSOES_TESTE.bento = { perfil: "TECNICO", nome: "Bento Teste", usuario: "bento", userId: "b36756b2-d5e1-474d-9ae3-f5e5826a6c13" };',
    'SESSOES_TESTE.bento2 = { perfil: "TECNICO", nome: "Outro Bento", usuario: "bento", userId: "outro-id" };'
  ].join('\n'));
  if (opcoes.dono !== false) env.run('SGO_DATA.insert("CAD_USUARIOS", { ID: "u_dono", USUARIO: "admin", NOME: "Dono Teste", PERFIL: "ADMIN", CELULAR: ' + JSON.stringify(opcoes.celular === undefined ? '(62) 99999-0000' : opcoes.celular) + ', STATUS: "ATIVO" });');
  env.pedir = sid => JSON.parse(JSON.stringify(env.fn('simuladorCodigoPedir')(sid)));
  env.conferir = (sid, c) => JSON.parse(JSON.stringify(env.fn('simuladorCodigoValidarSenhaCodigo')(sid, c)));
  env.situacao = sid => JSON.parse(JSON.stringify(env.fn('simuladorCodigoSituacao')(sid)));
  env.ultimoCodigo = () => env.run('ENVIOS_WA[ENVIOS_WA.length - 1].c');
  env.validarSenha = sid => env.fn('EstufaBanhoRel_apiDispatch')({ sessionId: sid, fn: 'apiValidarSenhaSimuladorAdmin', payload: { senha: 'senha-teste' } });
  env.logs = () => env.run('LOGS_TESTE').map(l => l.acao);
  return env;
}

test('sem o código do dono, nenhuma chamada do simulador passa (nem a senha)', { skip: !tem }, () => {
  const env = ambiente();
  assert.throws(() => env.validarSenha('adm'), /CÓDIGO DO DONO NECESSÁRIO/);
  const p = Object.assign({ modoEntrada: 'SIMULADO_ADMIN', simulacaoSenha: 'senha-teste' });
  assert.throws(() => env.fn('EstufaBanhoRel_apiDispatch')({ sessionId: 'adm', fn: 'apiQGerarRascunho', payload: p }), /CÓDIGO DO DONO NECESSÁRIO/);
  const q = JSON.parse(JSON.stringify(env.fn('EstufaOficial_apiDispatch')({ sessionId: 'adm', fn: 'apiSimQualificacao', payload: { simulacaoSenha: 'senha-teste' } })));
  assert.equal(q.ok, false); assert.match(q.erro, /CÓDIGO DO DONO NECESSÁRIO/);
  // o caminho oficial (dados reais) não muda
  assert.doesNotThrow(() => env.fn('EstufaBanhoRel_apiDispatch')({ sessionId: 'tec', fn: 'apiQSituacao', payload: {} }));
});

test('fluxo: pedido vai ao WhatsApp do dono, dono é avisado, código certo libera a sessão por 2 horas', { skip: !tem }, () => {
  const env = ambiente();
  assert.equal(env.situacao('adm').liberado, false);
  const p = env.pedir('adm');
  assert.equal(p.ok, true, p.erro);
  assert.match(p.mensagem, /final 0000/);
  const envio = env.run('ENVIOS_WA[0]');
  assert.equal(envio.t, '5562999990000');
  assert.match(envio.c, /^\d{6}$/);
  const aviso = env.run('AVISOS_DONO[0]');
  assert.equal(JSON.stringify(aviso.usuarios), JSON.stringify(['u_dono']));
  assert.match(aviso.texto, /Administrador Teste \(ADMIN\) pediu em \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
  assert.doesNotMatch(aviso.texto, new RegExp(envio.c), 'o aviso não leva o código');
  // o código nunca fica gravado em texto
  assert.ok(!JSON.stringify(env.props).includes(envio.c));
  const v = env.conferir('adm', envio.c);
  assert.equal(v.ok, true, v.erro);
  assert.equal(env.situacao('adm').liberado, true);
  assert.doesNotThrow(() => env.validarSenha('adm'));
  // uso único: o mesmo código não vale de novo
  assert.equal(env.conferir('adm', envio.c).ok, false);
  // a liberação é da sessão: outra pessoa continua fechada
  assert.throws(() => env.validarSenha('rt'), /CÓDIGO DO DONO NECESSÁRIO/);
  // depois de 2 horas, fecha de novo
  const k = Object.keys(env.props).find(x => x.startsWith('SIMCOD_L_'));
  const l = JSON.parse(env.props[k]); assert.ok(l.ate - Date.now() > 119 * 60000 && l.ate - Date.now() <= 120 * 60000);
  env.props[k] = JSON.stringify(Object.assign(l, { ate: Date.now() - 1 }));
  assert.throws(() => env.validarSenha('adm'), /CÓDIGO DO DONO NECESSÁRIO/);
  const logs = env.logs();
  assert.ok(logs.includes('SIMULADOR_CODIGO_PEDIDO') && logs.includes('SIMULADOR_CODIGO_LIBERADO'), logs.join(','));
});

test('no máximo 5 tentativas; na 5ª errada o pedido é cancelado e o dono é avisado', { skip: !tem }, () => {
  const env = ambiente();
  env.pedir('adm');
  const certo = env.ultimoCodigo(), errado = certo === '000000' ? '111111' : '000000';
  for (let i = 1; i <= 4; i++) { const r = env.conferir('adm', errado); assert.equal(r.ok, false); assert.match(r.erro, new RegExp('Restam ' + (5 - i))); }
  const r5 = env.conferir('adm', errado);
  assert.match(r5.erro, /5ª vez.*cancelado/);
  assert.equal(env.conferir('adm', certo).ok, false, 'depois de cancelado, nem o código certo vale');
  assert.equal(env.run('AVISOS_DONO.length'), 2);
  assert.match(env.run('AVISOS_DONO[1].texto'), /errou o código 5 vezes/);
  assert.ok(env.logs().filter(a => a === 'SIMULADOR_CODIGO_RECUSADO').length >= 5);
  assert.equal(env.situacao('adm').liberado, false);
});

test('o código vale 10 minutos; pedir de novo antes de 1 minuto é recusado', { skip: !tem }, () => {
  const env = ambiente();
  env.pedir('adm');
  const r2 = env.pedir('adm');
  assert.equal(r2.ok, false); assert.match(r2.erro, /Espere 1 minuto/);
  const k = Object.keys(env.props).find(x => x.startsWith('SIMCOD_P_'));
  const p = JSON.parse(env.props[k]);
  assert.ok(p.expira - p.criadoEm === 10 * 60000);
  env.props[k] = JSON.stringify(Object.assign(p, { expira: Date.now() - 1 }));
  const v = env.conferir('adm', env.ultimoCodigo());
  assert.equal(v.ok, false); assert.match(v.erro, /venceu/);
  assert.equal(env.situacao('adm').liberado, false);
});

test('quem pode pedir: a regra atual (ADMIN ou o Bento autorizado); técnico é recusado e registrado', { skip: !tem }, () => {
  const env = ambiente();
  const t = env.pedir('tec');
  assert.equal(t.ok, false); assert.match(t.erro, /só do administrador e das pessoas autorizadas/);
  assert.ok(env.logs().includes('SIMULADOR_CODIGO_RECUSADO'));
  assert.equal(env.pedir('bento2').ok, false, 'mesmo login com outro cadastro não vale');
  const b = env.pedir('bento');
  assert.equal(b.ok, true, b.erro);
  assert.equal(env.conferir('bento', env.ultimoCodigo()).ok, true);
  assert.doesNotThrow(() => env.validarSenha('bento'));
  assert.throws(() => env.validarSenha('tec'), /CÓDIGO DO DONO NECESSÁRIO/);
});

test('sem WhatsApp configurado ou sem celular do dono: a tela explica e não libera', { skip: !tem }, () => {
  const semWa = ambiente({ falhaWa: 'WhatsApp oficial (Meta) sem token ou número configurado em Chaves e senhas' });
  const r = semWa.pedir('adm');
  assert.equal(r.ok, false);
  assert.match(r.erro, /não pôde ser enviado pelo WhatsApp \(WhatsApp oficial \(Meta\) sem token/);
  assert.match(r.erro, /continua fechado/);
  assert.equal(semWa.situacao('adm').liberado, false);
  assert.ok(semWa.logs().includes('SIMULADOR_CODIGO_SEM_WHATSAPP'));
  assert.throws(() => semWa.validarSenha('adm'), /CÓDIGO DO DONO NECESSÁRIO/);
  const semCel = ambiente({ celular: '' });
  assert.equal(semCel.situacao('adm').donoComCelular, false);
  const r2 = semCel.pedir('adm');
  assert.equal(r2.ok, false); assert.match(r2.erro, /não tem celular válido/);
  const semDono = ambiente({ dono: false });
  assert.match(semDono.pedir('adm').erro, /não foi encontrado no cadastro/);
});

test('telas: os quatro botões "Relatório interno" pedem o código antes da senha', { skip: !tem }, () => {
  const base = E.MO.A.BASE;
  const decod = n => { const l = fs.readFileSync(path.join(base, n), 'utf8').split(/\r?\n/)[0]; return JSON.parse(l.slice(l.indexOf('= ') + 2).replace(/;\s*$/, '')); };
  for (const [n, P] of [['SGO_EstufaBanhoRel_ConteudoModulo.js', 'tplEstufaBanhoRel'], ['SGO_CadeiaFrioRel_ConteudoModulo.js', 'tplCadeiaFrioRel'], ['SGO_AutoRel_ConteudoModulo.js', 'tplAutoRel'], ['SGO_LavRel_ConteudoModulo.js', 'tplLavRel']]) {
    const t = decod(n);
    const i = t.indexOf('async function ' + P + '_ativarModoSimuladoAdmin() {');
    assert.ok(i >= 0, n);
    const corpo = t.slice(i, i + 400);
    assert.ok(corpo.indexOf('SGO_SimCodigo_garantir') >= 0 && corpo.indexOf('SGO_SimCodigo_garantir') < corpo.indexOf('SGO_senhaMascarada_'), n);
  }
  const seg = fs.readFileSync(path.join(base, 'JS_SegurancaAcesso.html'), 'utf8');
  assert.match(seg, /function SGO_SimCodigo_garantir\(\)/);
  assert.match(seg, /simuladorCodigoValidarSenhaCodigo/);
});
