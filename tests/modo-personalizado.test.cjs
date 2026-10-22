// Modo personalizado (21/10/2026): responsáveis técnicos designados pelo Administrador, senha própria guardada
// só como resumo com sal, bloqueio depois de 5 senhas erradas, modo que fecha com 30 minutos sem uso, ajuste
// de parâmetros com faixa e justificativa, auditoria só-inclusão encadeada, documento marcado e emissão só com
// a aprovação do responsável com o modo aberto (SGO_ModoPersonalizado.js + estufa, banho-maria e secadora).
// Só dados de teste: usuários e clientes fictícios; o relógio do modo é simulado (sem depender da hora real).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const E = require('./_estufa_ambiente.cjs');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const SENHA = 'Teste' + 'Modo2026';

function ambiente(props) {
  const env = E.criarAmbiente({ props: props || {} });
  env.run(fs.readFileSync(path.join(BASE, 'SGO_ModoPersonalizado.js'), 'utf8').replace(/\r\n/g, '\n'));
  env.run([
    // Sessões de teste com o código da sessão de login (o modo fica preso a ele) e um segundo gestor não designado.
    'SESSOES_TESTE.gest2 = { perfil: "GESTOR", nome: "Gestor Dois", usuario: "gest2", userId: "u_gest2" };',
    'SESSOES_TESTE.rt_outro = Object.assign({}, SESSOES_TESTE.rt);',
    'Object.keys(SESSOES_TESTE).forEach(function (k) { SESSOES_TESTE[k].sessionId = k; });',
    '[["u_tec","tec","Técnico Teste","TECNICO"],["u_rt","rt","Responsável Teste","GESTOR"],["u_adm","adm","Administrador Teste","ADMIN"],["u_gest2","gest2","Gestor Dois","GESTOR"],["u_com","com","Comercial Teste","COMERCIAL"]]',
    '  .forEach(function (u) { SGO_DATA.insert("CAD_USUARIOS", { ID: u[0], USUARIO: u[1], NOME: u[2], PERFIL: u[3], STATUS: "ATIVO" }); });',
    'var __AGORA = Date.UTC(2026, 9, 21, 13, 0, 0); SGO_MP_agoraMs_ = function () { return __AGORA; };'
  ].join('\n'));
  env.mp = (sid, fn, payload) => JSON.parse(JSON.stringify(env.fn('SGO_MP_' + fn)(sid, payload || {})));
  env.avancarMin = (min) => env.run('__AGORA += ' + (min * 60000) + ';');
  env.auditoria = () => JSON.parse(JSON.stringify(env.run('SGO_MP_ler_(SGO_MP_CFG.ABA_AUDITORIA, SGO_MP_CAMPOS_AUDITORIA)')));
  return env;
}

/** Administrador designa o rt; rt cria a senha (modo aberto). */
function designarECriar(env) {
  assert.ok(env.mp('adm', 'apiDefinirResponsaveis', { ids: ['u_rt'] }).ok);
  const c = env.mp('rt', 'apiCriarSenha', { nova: SENHA, confirmar: SENHA });
  assert.ok(c.ok, c.message);
  assert.strictEqual(c.aberto, true);
}

test('quem não é responsável técnico não entra nem chama as funções do modo (servidor recusa)', () => {
  const env = ambiente();
  const s = env.mp('tec', 'apiSituacao');
  assert.strictEqual(s.ok, true); assert.strictEqual(s.responsavel, false); assert.strictEqual(s.podeDesignar, false);
  for (const fn of ['apiCriarSenha', 'apiEntrar', 'apiParametros', 'apiAlterar', 'apiRestaurar', 'apiDiferencas', 'apiAprovacoes', 'apiAuditoria', 'apiClientes']) {
    const r = env.mp('tec', fn, { senha: 'x', gerador: 'ESTUFA', perfil: 'ESTUFA_INCUBACAO', parametro: 'sensoresMinimos', valor: '9', justificativa: 'x'.repeat(30) });
    assert.strictEqual(r.ok, false, fn);
    assert.match(r.message, /exclusivo dos responsáveis técnicos designados/, fn);
  }
  // Gestor com perfil habilitado, mas fora da lista: também não entra.
  assert.match(env.mp('rt', 'apiEntrar', { senha: 'x' }).message, /exclusivo dos responsáveis técnicos/);
  // Só o Administrador designa, apaga a senha e desbloqueia.
  for (const fn of ['apiResponsaveis', 'apiDefinirResponsaveis', 'apiRedefinirSenha', 'apiDesbloquear']) {
    assert.match(env.mp('rt', fn, { ids: ['u_rt'], userId: 'u_rt' }).message, /são do Administrador/, fn);
  }
  // Perfil não habilitado não pode ser designado.
  assert.match(env.mp('adm', 'apiDefinirResponsaveis', { ids: ['u_com'] }).message, /Só os perfis Administrador, Diretoria, Gestor e Metrologia/);
  // As recusas ficam na auditoria.
  assert.ok(env.auditoria().filter(l => l.ACAO === 'ACESSO_RECUSADO').length >= 10);
  // Designado: vê a tela, mas sem senha nada abre.
  assert.ok(env.mp('adm', 'apiDefinirResponsaveis', { ids: ['u_rt'] }).ok);
  assert.strictEqual(env.mp('rt', 'apiSituacao').responsavel, true);
  assert.match(env.mp('rt', 'apiParametros', { gerador: 'ESTUFA', perfil: 'ESTUFA_INCUBACAO' }).message, /ainda não tem a senha/);
  // Quem sai da lista perde a senha e o acesso na hora.
  assert.ok(env.mp('rt', 'apiCriarSenha', { nova: SENHA, confirmar: SENHA }).ok);
  assert.ok(env.mp('adm', 'apiDefinirResponsaveis', { ids: [] }).ok);
  assert.match(env.mp('rt', 'apiParametros', { gerador: 'ESTUFA', perfil: 'ESTUFA_INCUBACAO' }).message, /exclusivo dos responsáveis/);
  assert.strictEqual(env.props.MODO_PERS_SENHA_u_rt, undefined);
});

test('senha própria: regras, guardada só como resumo com sal, 5 erradas bloqueiam e o Administrador desbloqueia ou apaga', () => {
  const env = ambiente();
  env.mp('adm', 'apiDefinirResponsaveis', { ids: ['u_rt'] });
  assert.match(env.mp('rt', 'apiCriarSenha', { nova: 'curta1', confirmar: 'curta1' }).message, /pelo menos 8 caracteres/);
  assert.match(env.mp('rt', 'apiCriarSenha', { nova: 'somenteletras', confirmar: 'somenteletras' }).message, /letras e números/);
  assert.match(env.mp('rt', 'apiCriarSenha', { nova: 'rt12345678', confirmar: 'rt12345678' }).message, /não pode conter o seu login/);
  assert.match(env.mp('rt', 'apiCriarSenha', { nova: SENHA, confirmar: SENHA + 'x' }).message, /confirmação não é igual/);
  assert.ok(env.mp('rt', 'apiCriarSenha', { nova: SENHA, confirmar: SENHA }).ok);
  assert.match(env.mp('rt', 'apiCriarSenha', { nova: SENHA, confirmar: SENHA }).message, /já tem a senha/);
  // Nada da senha em texto nas propriedades nem na auditoria.
  const guardado = JSON.parse(env.props.MODO_PERS_SENHA_u_rt);
  assert.ok(guardado.sal && /^[0-9a-f]{64}$/.test(guardado.hash) && guardado.it >= 1000);
  assert.ok(!JSON.stringify(env.props).includes(SENHA));
  assert.ok(!JSON.stringify(env.auditoria()).includes(SENHA));
  assert.ok(env.mp('rt', 'apiSair').ok);
  for (let i = 1; i <= 4; i++) {
    const r = env.mp('rt', 'apiEntrar', { senha: 'Errada' + i + 'xx' });
    assert.match(r.message, new RegExp('Senha incorreta. Resta' + (5 - i === 1 ? ' 1 tentativa' : 'm ' + (5 - i) + ' tentativas')));
  }
  assert.match(env.mp('rt', 'apiEntrar', { senha: 'Errada5xx' }).message, /bloqueada até/);
  // Bloqueado: nem a senha certa entra.
  assert.match(env.mp('rt', 'apiEntrar', { senha: SENHA }).message, /entrada está bloqueada até/);
  assert.strictEqual(env.mp('rt', 'apiSituacao').bloqueado, true);
  assert.ok(env.auditoria().some(l => l.ACAO === 'BLOQUEIO'));
  // Desbloqueio pelo Administrador.
  assert.ok(env.mp('adm', 'apiDesbloquear', { userId: 'u_rt' }).ok);
  assert.strictEqual(env.mp('rt', 'apiEntrar', { senha: SENHA }).aberto, true);
  // Bloqueio vence sozinho em 15 minutos.
  env.mp('rt', 'apiSair');
  for (let i = 0; i < 5; i++) env.mp('rt', 'apiEntrar', { senha: 'Errada' + i + 'yy' });
  env.avancarMin(16);
  assert.strictEqual(env.mp('rt', 'apiEntrar', { senha: SENHA }).aberto, true);
  // Esqueceu: o Administrador apaga e o responsável cria outra.
  const r = env.mp('adm', 'apiRedefinirSenha', { userId: 'u_rt' });
  assert.ok(r.ok && r.itens.find(x => x.userId === 'u_rt').temSenha === false);
  assert.match(env.mp('rt', 'apiParametros', { gerador: 'ESTUFA', perfil: 'ESTUFA_INCUBACAO' }).message, /ainda não tem a senha/);
  assert.ok(env.mp('rt', 'apiCriarSenha', { nova: 'Outra' + 'Senha99', confirmar: 'Outra' + 'Senha99' }).ok);
  // Troca exige a senha atual.
  assert.match(env.mp('rt', 'apiTrocarSenha', { atual: SENHA, nova: 'Nova' + 'Senha77', confirmar: 'Nova' + 'Senha77' }).message, /senha atual não confere/);
  assert.ok(env.mp('rt', 'apiTrocarSenha', { atual: 'Outra' + 'Senha99', nova: 'Nova' + 'Senha77', confirmar: 'Nova' + 'Senha77' }).ok);
});

test('o modo fecha com 30 minutos sem uso, fica preso à sessão de login e cada ação renova o prazo', () => {
  const env = ambiente();
  designarECriar(env);
  const pedir = sid => env.mp(sid, 'apiParametros', { gerador: 'ESTUFA', perfil: 'ESTUFA_INCUBACAO' });
  assert.ok(pedir('rt').ok);
  // Outra sessão de login do mesmo usuário: precisa digitar a senha de novo.
  assert.match(pedir('rt_outro').message, /está fechado/);
  env.avancarMin(29); assert.ok(pedir('rt').ok);
  env.avancarMin(29); assert.ok(pedir('rt').ok); // renovado na chamada anterior
  env.avancarMin(31);
  const r = pedir('rt');
  assert.strictEqual(r.ok, false);
  assert.match(r.message, /está fechado \(fecha sozinho depois de 30 minutos sem uso\)/);
  assert.strictEqual(env.mp('rt', 'apiSituacao').aberto, false);
  assert.strictEqual(env.mp('rt', 'apiEntrar', { senha: SENHA }).aberto, true);
  assert.ok(env.mp('rt', 'apiSair').ok);
  assert.match(pedir('rt').message, /está fechado/);
});

test('ajuste: faixa permitida, justificativa obrigatória, comparação com a referência, restaurar e auditoria encadeada', () => {
  const env = ambiente();
  designarECriar(env);
  const base = { gerador: 'ESTUFA', perfil: 'ESTUFA_INCUBACAO', parametro: 'sensoresMinimos' };
  assert.match(env.mp('rt', 'apiAlterar', Object.assign({}, base, { valor: '9' })).message, /Escreva a justificativa/);
  assert.match(env.mp('rt', 'apiAlterar', Object.assign({}, base, { valor: '3', justificativa: 'Protocolo do cliente de teste, equipamento pequeno.' })).message, /fora da faixa permitida.*de 6 a 60 sensores/);
  assert.match(env.mp('rt', 'apiAlterar', Object.assign({}, base, { valor: '9,5', justificativa: 'Protocolo do cliente de teste, equipamento pequeno.' })).message, /só número inteiro/);
  assert.match(env.mp('rt', 'apiAlterar', Object.assign({}, base, { valor: '12', justificativa: 'Protocolo do cliente de teste, equipamento pequeno.' })).message, /igual à referência normativa/);
  const ok = env.mp('rt', 'apiAlterar', Object.assign({}, base, { clienteId: 'cli1', valor: '9', justificativa: 'Protocolo do cliente de teste, equipamento pequeno.' }));
  assert.ok(ok.ok, ok.message);
  const it = ok.itens.find(i => i.chave === 'sensoresMinimos');
  assert.strictEqual(it.personalizado, true); assert.strictEqual(it.emUsoTxt, '9 sensores'); assert.strictEqual(it.normativoTxt, '12 sensores');
  assert.match(it.fonte, /ABNT NBR 16328:2024, Anexo F/);
  // Outro cliente e "todos os clientes" continuam na referência.
  assert.strictEqual(env.mp('rt', 'apiParametros', { gerador: 'ESTUFA', perfil: 'ESTUFA_INCUBACAO', clienteId: 'cli2' }).itens.find(i => i.chave === 'sensoresMinimos').personalizado, false);
  const dif = env.mp('rt', 'apiDiferencas');
  assert.strictEqual(dif.itens.length, 1);
  assert.strictEqual(dif.itens[0].diferencaTxt, '-3 sensores');
  // Auditoria: quem, quando, de quanto para quanto e o motivo.
  const aud = env.mp('rt', 'apiAuditoria', { acao: 'PARAMETRO_ALTERADO' });
  assert.strictEqual(aud.linhas.length, 1);
  const l = aud.linhas[0];
  assert.strictEqual(l.nome, 'Responsável Teste'); assert.match(l.em, /^21\/10\/2026/);
  assert.strictEqual(l.anterior, '12 sensores (referência)'); assert.strictEqual(l.novo, '9 sensores');
  assert.match(l.motivo, /Protocolo do cliente de teste/);
  // Restaurar também exige motivo e volta à referência.
  assert.match(env.mp('rt', 'apiRestaurar', Object.assign({}, base, { clienteId: 'cli1' })).message, /Escreva a justificativa/);
  const rest = env.mp('rt', 'apiRestaurar', Object.assign({}, base, { clienteId: 'cli1', justificativa: 'Cliente de teste voltou ao protocolo da norma.' }));
  assert.ok(rest.ok);
  assert.strictEqual(rest.itens.find(i => i.chave === 'sensoresMinimos').personalizado, false);
  assert.match(env.mp('rt', 'apiRestaurar', Object.assign({}, base, { clienteId: 'cli1', justificativa: 'Cliente de teste voltou ao protocolo da norma.' })).message, /Não há ajuste/);
  // Integridade: íntegro; uma linha alterada direto no banco é apontada.
  assert.strictEqual(env.mp('adm', 'apiAuditoria', { conferir: true }).integridade.ok, true);
  env.run('SGO_MP_MEMORIA_[SGO_MP_CFG.ABA_AUDITORIA].filter(function (x) { return x.ACAO === "PARAMETRO_ALTERADO"; })[0].VALOR_NOVO = "6 sensores";');
  const integ = env.mp('adm', 'apiAuditoria', { conferir: true }).integridade;
  assert.strictEqual(integ.ok, false);
  assert.match(integ.problemas.join(' '), /alterado depois de gravado/);
});

test('documento com parâmetro personalizado: seção no documento, envio do técnico e emissão só com o responsável e o modo aberto', () => {
  const env = ambiente();
  designarECriar(env);
  env.mp('adm', 'apiDefinirResponsaveis', { ids: ['u_rt'] });
  const s = E.serieEstufa({ n: 9 });
  const p = E.payloadIncubacao(s, { certNumero: 'REE-TESTE-MP' });
  // Sem ajuste: 9 sensores travam (mínimo 12 do Anexo F).
  const antes = env.estufa('tec', 'apiQGerarRascunho', p);
  assert.ok(antes.travas.some(t => t.codigo === 'SENSORES_ABAIXO_MINIMO'));
  assert.strictEqual(antes.contexto.parametrosPersonalizados.length, 0);
  // Ajuste para o cliente do ensaio.
  assert.ok(env.mp('rt', 'apiAlterar', { gerador: 'ESTUFA', perfil: 'ESTUFA_INCUBACAO', clienteId: 'cli1', parametro: 'sensoresMinimos', valor: '9', justificativa: 'Protocolo de teste acordado com o cliente para câmara pequena.' }).ok);
  const r = env.estufa('tec', 'apiQGerarRascunho', p);
  assert.ok(!r.travas.some(t => t.codigo === 'SENSORES_ABAIXO_MINIMO'), JSON.stringify(r.travas));
  assert.strictEqual(r.contexto.parametrosPersonalizados.length, 1);
  assert.strictEqual(r.contexto.parametrosPersonalizados[0].usadoTxt, '9 sensores');
  assert.ok(r.contexto.escopo.some(x => /Parâmetros personalizados pelo responsável técnico/.test(x)));
  const pe = Object.assign({}, p, { assinaturaContexto: r.assinaturaContexto, textosCertificado: r.textos, confirmacaoRevisao: true });
  const envio = env.estufa('tec', 'apiQEnviarParaAprovacao', pe);
  assert.match(env.run('SGO_QE_obter_("' + envio.id + '").PARAMETROS_PERSONALIZADOS'), /Mínimo de sensores: 9 sensores \(referência 12 sensores\)/);
  // A pendência aparece na aba Aprovações do modo.
  const ap = env.mp('rt', 'apiAprovacoes');
  assert.strictEqual(ap.pendentes.length, 1); assert.strictEqual(ap.pendentes[0].tela, 'estufa_banhomaria');
  // Prévia marcada.
  const prev = env.estufa('rt', 'apiQPreverAprovacao', { id: envio.id });
  assert.match(prev.html, /Parâmetros personalizados/);
  assert.match(prev.html, /Aguardando a aprovação do responsável técnico para os parâmetros personalizados/);
  assert.match(prev.html, /Protocolo de teste acordado com o cliente/);
  // Gestor aprovador do módulo, mas não responsável do modo: recusado.
  assert.throws(() => env.estufa('gest2', 'apiQAprovarEmitir', { id: envio.id, confirmacaoRevisao: true }), /parâmetros personalizados.*responsável técnico do modo personalizado/);
  // Responsável com o modo fechado: recusado, com o caminho.
  env.mp('rt', 'apiSair');
  assert.throws(() => env.estufa('rt', 'apiQAprovarEmitir', { id: envio.id, confirmacaoRevisao: true }), /abra Qualificação e inspeção > Modo personalizado, entre com a sua senha/);
  // Com o modo aberto: emite, com a seção e a aprovação no documento e o registro na auditoria.
  assert.strictEqual(env.mp('rt', 'apiEntrar', { senha: SENHA }).aberto, true);
  const em = env.estufa('rt', 'apiQAprovarEmitir', { id: envio.id, confirmacaoRevisao: true });
  assert.match(em.html, /Parâmetros personalizados aprovados para emissão por<\/b> Responsável Teste/);
  assert.match(em.html, /Personalizados \(ver seção 4\)/);
  const aud = env.auditoria().filter(l => l.ACAO === 'DOCUMENTO_APROVADO');
  assert.strictEqual(aud.length, 1);
  assert.match(aud[0].REFERENCIA, /REE-TESTE-MP/);
  // Restaurado o padrão, o mesmo payload volta a travar.
  env.mp('rt', 'apiRestaurar', { gerador: 'ESTUFA', perfil: 'ESTUFA_INCUBACAO', clienteId: 'cli1', justificativa: 'Fim do protocolo de teste do cliente.' });
  assert.ok(env.estufa('tec', 'apiQGerarRascunho', p).travas.some(t => t.codigo === 'SENSORES_ABAIXO_MINIMO'));
});

test('documento sem parâmetro personalizado segue igual (aprovador do módulo emite sem o modo)', () => {
  const env = ambiente();
  const s = E.serieEstufa({});
  const p = E.payloadIncubacao(s, { certNumero: 'REE-TESTE-NORMAL' });
  const r = env.estufa('tec', 'apiQGerarRascunho', p);
  assert.strictEqual(r.contexto.parametrosPersonalizados.length, 0);
  const em = env.estufa('gest2', 'apiQEmitir', Object.assign({}, p, { assinaturaContexto: r.assinaturaContexto, textosCertificado: r.textos, confirmacaoRevisao: true }));
  assert.ok(!/Parâmetros personalizados/.test(em.html));
});

test('a senha única antiga em texto é apagada e o caminho antigo da estufa só recusa', () => {
  const env = ambiente({ MODO_PERSONALIZADO_SENHA: 'antiga-em-texto', CHV_ALTERADO_MODO_PERSONALIZADO_SENHA: '2026-10-01T10:00:00' });
  assert.ok(env.mp('adm', 'apiSituacao').ok);
  assert.strictEqual(env.props.MODO_PERSONALIZADO_SENHA, undefined);
  assert.strictEqual(env.props.CHV_ALTERADO_MODO_PERSONALIZADO_SENHA, undefined);
  assert.ok(env.auditoria().some(l => l.ACAO === 'SENHA_ANTIGA_REMOVIDA'));
  assert.throws(() => env.fn('EstufaBanhoRel_apiValidarSenhaModoPersonalizado')({ senha: 'antiga-em-texto' }), /Modo personalizado, com a senha própria/);
  // Nenhum arquivo do sistema compara mais a senha única.
  for (const f of fs.readdirSync(BASE).filter(n => /\.(js|html)$/.test(n))) {
    const t = fs.readFileSync(path.join(BASE, f), 'utf8');
    assert.ok(!/getProperty\(['"]MODO_PERSONALIZADO_SENHA['"]\)\s*\|\|/.test(t), f);
  }
  const chaves = fs.readFileSync(path.join(BASE, 'SGO_Chaves.js'), 'utf8');
  assert.ok(!/chave: 'MODO_PERSONALIZADO_SENHA'/.test(chaves));
});

test('ajuda da tela só para o responsável e o Administrador', () => {
  const env = ambiente();
  env.mp('adm', 'apiDefinirResponsaveis', { ids: ['u_rt'] });
  assert.strictEqual(env.run('SGO_MP_ajudaLiberada_("rt")'), true);
  assert.strictEqual(env.run('SGO_MP_ajudaLiberada_("adm")'), true);
  assert.strictEqual(env.run('SGO_MP_ajudaLiberada_("tec")'), false);
  assert.strictEqual(env.run('SGO_MP_ajudaLiberada_("gest2")'), false);
  const aj = fs.readFileSync(path.join(BASE, 'SGO_Ajuda.js'), 'utf8');
  assert.match(aj, /SGO_ajudaTelas_ModoPersonalizado_/);
  assert.match(aj, /modulo === 'modo_personalizado' && !mpLib \? \[\]/);
});
