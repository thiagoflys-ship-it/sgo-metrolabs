// Acessos por caixas — LOTE 1 (11/11/2026): Contas, senhas e acessos. As travas de SGO_Usuarios.js, SGO_Areas.js,
// SGO_SegurancaAcesso.js e SGO_ModoPersonalizado.js perguntam a caixa (SGO_poderRecusa_ / SGO_pode_).
//  1) equivalência: sem exceções, as 23 contas reais recebem, em cada ação do lote, o mesmo resultado (permitido ou
//     recusado) e a mesma mensagem do legado de antes da mudança (output/poderes-20261110/lote1-antes-legado);
//  2) exceção NÃO tira o poder de quem tinha (recusa no servidor, com a mensagem da caixa);
//  3) exceção SIM dá o poder a quem não tinha, sem passar por cima das proteções fixas (Administrador e Diretoria);
//  4) troca de e-mail avisa o e-mail antigo e fica registrada;
//  5) tela: menu e botões seguem as caixas da pessoa (e o servidor recusa do mesmo jeito).
// Rodar: cd C:\Users\venda\projetos\google-script-dev && FASE=candidato node --require ./output/poderes-20261110/fontes-locais.cjs tests/poderes-lote1.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente } = require('./_poderes_ambiente.cjs');

const pastaPoderes = path.join(__dirname, '../output/poderes-20261110');
const pastaAntes = path.join(pastaPoderes, 'lote1-antes-legado');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const lerLegado = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8');
const EXTRAS = ['SGO_Clientes.js', 'SGO_Usuarios.js', 'SGO_ModoPersonalizado.js'];
const j = (x) => JSON.parse(JSON.stringify(x === undefined ? null : x));
const LOTE1 = ['CONTAS_VER', 'CONTAS_CRIAR', 'CONTAS_ALTERAR_OUTROS', 'CONTAS_MUDAR_PERFIL', 'CONTAS_REDEFINIR_SENHA', 'CONTAS_INATIVAR', 'CONTAS_EXCLUIR',
  'CONTAS_GERIR_ADMINISTRADOR', 'CONTAS_DAR_DIRETORIA', 'AREAS_GERIR', 'AREAS_DEFINIR_PESSOA', 'SEGURANCA_VER_REGISTRO', 'SEGURANCA_ALTERAR',
  'MODO_PERSONALIZADO_DESIGNAR', 'ACESSOS_GERIR'];

/** Ambiente com Usuários, Segurança do acesso, Áreas e Modo personalizado; e-mails, registros e logs capturados. */
function amb(pasta) {
  const a = ambiente(Object.assign({ extras: EXTRAS }, pasta ? { pasta } : {}));
  let n = 0;
  a.emails = []; a.registros = []; a.logs = [];
  a.ctx.SGO_DATA.gerarRegistroBase = (x) => Object.assign({ ID: 'novo-' + (++n) }, x);
  a.ctx.SGO_DATA.mesclarCampos_ = (atual, normal, payload, campos) => {
    const o = Object.assign({}, normal);
    campos.forEach((c) => { o[c] = Object.prototype.hasOwnProperty.call(payload || {}, c) ? normal[c] : atual[c]; });
    return o;
  };
  a.ctx.SGO_DATA.log = (...args) => { a.logs.push(args); };
  a.ctx.MailApp = { sendEmail: (o) => { a.emails.push(o); }, getRemainingDailyQuota: () => 100 };
  const reg = a.ctx.SegAcesso_registrar_;
  a.ctx.SegAcesso_registrar_ = function (ev, u, c, det, por) { a.registros.push({ ev, id: u && u.ID, det, por }); return reg.apply(this, arguments); };
  a.sid = (login) => 's_' + login;
  return a;
}
const salvarExc = (a, login, mudancas, motivo) => {
  const r = a.api('admin', 'salvar', { usuarioId: a.idDe(login), motivo: motivo || 'Teste do lote 1 (exceção)', mudancas });
  assert.ok(r && r.ok, 'gravar exceção: ' + JSON.stringify(r));
  a.limparMemo();
};

// ------------------------------------------------------------------ 1) equivalência
/** Sequência de ações do lote (as mesmas, na mesma ordem, nos dois ambientes). Cada item: [rótulo, fn(a, eu) -> resultado comparável]. */
function acoes() {
  const res = (r) => (r && typeof r === 'object' ? { success: r.success, ok: r.ok, message: r.message } : { valor: r });
  const painel = (r) => (r && r.success ? { success: true, souAdmin: r.souAdmin, podeDarDiretoria: r.podeDarDiretoria, podeGerir: r.podeGerir, podeExcluir: r.podeExcluir,
    podeGerirAreas: r.podeGerirAreas, perfis: r.perfis, alterar: (r.items || []).map((u) => u.ID + ':' + u.PODE_ALTERAR).join(',') } : res(r));
  const id = (a, l) => a.idDe(l);
  return [
    ['usuariosListar', (a, eu) => res(a.ctx.usuariosListar(a.sid(eu)))],
    ['usuariosObter', (a, eu) => res(a.ctx.usuariosObter(a.sid(eu), id(a, 'joaopedro')))],
    ['usuariosPesquisar', (a, eu) => res(a.ctx.usuariosPesquisar(a.sid(eu), 'a'))],
    ['usuariosPainel', (a, eu) => painel(a.ctx.usuariosPainel(a.sid(eu)))],
    ['criar técnico', (a, eu) => res(a.ctx.usuariosCriar(a.sid(eu), { NOME: 'PESSOA NOVA ' + eu.toUpperCase(), EMAIL: 'nova.' + eu.replace(/\W/g, '') + '@exemplo.test', PERFIL: 'TECNICO', SENHA: 'Teste2026xy', VINCULO_TRABALHO: 'CLT' }))],
    ['criar Diretoria', (a, eu) => res(a.ctx.usuariosCriar(a.sid(eu), { NOME: 'DIRETORA NOVA', EMAIL: 'dir.' + eu.replace(/\W/g, '') + '@exemplo.test', PERFIL: 'DIRETORIA', SENHA: 'Teste2026xy', VINCULO_TRABALHO: 'DIRETORIA' }))],
    ['criar Administrador', (a, eu) => res(a.ctx.usuariosCriar(a.sid(eu), { NOME: 'ADM NOVO', EMAIL: 'adm.' + eu.replace(/\W/g, '') + '@exemplo.test', PERFIL: 'ADMIN', SENHA: 'Teste2026xy', VINCULO_TRABALHO: 'CLT' }))],
    ['alterar nome de outro', (a, eu) => res(a.ctx.usuariosAtualizar(a.sid(eu), id(a, 'joaopedro'), { NOME: 'JOAO PEDRO ALTERADO' }))],
    ['mudar perfil de outro', (a, eu) => res(a.ctx.usuariosAtualizar(a.sid(eu), id(a, 'gabrieldias'), { PERFIL: 'METROLOGIA' }))],
    ['promover a Diretoria', (a, eu) => res(a.ctx.usuariosAtualizar(a.sid(eu), id(a, 'paulohenrique'), { PERFIL: 'DIRETORIA' }))],
    ['promover a Administrador', (a, eu) => res(a.ctx.usuariosAtualizar(a.sid(eu), id(a, 'paulohenrique'), { PERFIL: 'ADMIN' }))],
    ['alterar conta da Diretoria', (a, eu) => res(a.ctx.usuariosAtualizar(a.sid(eu), id(a, 'charles'), { NOME: 'CHARLES ALTERADO' }))],
    ['alterar conta do Administrador', (a, eu) => res(a.ctx.usuariosAtualizar(a.sid(eu), id(a, 'admin'), { NOME: 'ADMIN ALTERADO' }))],
    ['mudar o próprio perfil', (a, eu) => res(a.ctx.usuariosAtualizar(a.sid(eu), id(a, eu), { PERFIL: 'GESTOR' }))],
    ['área pela edição', (a, eu) => res(a.ctx.usuariosAtualizar(a.sid(eu), id(a, 'hidelbrandosampaio'), { AREA: 'METROLOGIA' }))],
    ['senha provisória (tem e-mail)', (a, eu) => res(a.ctx.usuariosAtualizar(a.sid(eu), id(a, 'joaopedro'), { SENHA: 'Prov2026xyz' }))],
    ['link de nova senha', (a, eu) => res(a.ctx.usuariosEnviarLinkRedefinicao(a.sid(eu), id(a, 'joaopedro'), 'motivo do teste'))],
    ['link para o Administrador', (a, eu) => res(a.ctx.usuariosEnviarLinkRedefinicao(a.sid(eu), id(a, 'admin'), 'motivo do teste'))],
    ['inativar', (a, eu) => res(a.ctx.usuariosInativar(a.sid(eu), id(a, 'guilherme')))],
    ['reativar', (a, eu) => res(a.ctx.usuariosReativar(a.sid(eu), id(a, 'guilherme')))],
    ['inativar Diretoria', (a, eu) => res(a.ctx.usuariosInativar(a.sid(eu), id(a, 'charles')))],
    ['inativar Administrador', (a, eu) => res(a.ctx.usuariosInativar(a.sid(eu), id(a, 'admin')))],
    ['inativar a si mesmo', (a, eu) => res(a.ctx.usuariosInativar(a.sid(eu), id(a, eu)))],
    ['vínculos antes de excluir', (a, eu) => res(a.ctx.usuariosVinculosConta(a.sid(eu), id(a, 'rafael.marques')))],
    ['excluir Administrador', (a, eu) => res(a.ctx.usuariosExcluir(a.sid(eu), id(a, 'admin'), 'motivo longo do teste'))],
    ['excluir', (a, eu) => res(a.ctx.usuariosExcluir(a.sid(eu), id(a, 'rafael.marques'), 'motivo longo do teste'))],
    ['áreas: painel', (a, eu) => res(a.ctx.areasPainel(a.sid(eu)))],
    ['áreas: salvar', (a, eu) => res(a.ctx.areasSalvar(a.sid(eu), { nome: 'Área de teste ' + eu.replace(/\W/g, '') }))],
    ['áreas: área da pessoa', (a, eu) => res(a.ctx.areasDefinirDoUsuario(a.sid(eu), { usuarioId: id(a, 'joaopedro'), area: 'METROLOGIA' }))],
    ['áreas: preencher pelo perfil', (a, eu) => res(a.ctx.areasPreencherPeloPerfil(a.sid(eu), {}))],
    ['segurança: painel', (a, eu) => { const r = a.ctx.SegAcesso_api(a.sid(eu), 'painel', {}); return { ok: r.ok, message: r.message, podeAlterar: r.podeAlterar }; }],
    ['segurança: registro', (a, eu) => res(a.ctx.SegAcesso_api(a.sid(eu), 'registro', {}))],
    ['segurança: gravar config', (a, eu) => res(a.ctx.SegAcesso_api(a.sid(eu), 'gravarConfig', { modo: 'DESLIGADO', perfis: [] }))],
    ['segurança: exigir troca (técnico)', (a, eu) => res(a.ctx.SegAcesso_api(a.sid(eu), 'exigirTrocaUsuario', { usuarioId: id(a, 'gabrielpereira'), motivo: 'motivo do teste' }))],
    ['segurança: zerar segundo fator', (a, eu) => res(a.ctx.SegAcesso_api(a.sid(eu), 'zerarSegundoFator', { usuarioId: id(a, 'gabrielpereira'), motivo: 'motivo do teste' }))],
    ['modo personalizado: situação', (a, eu) => { const r = a.ctx.SGO_MP_apiSituacao(a.sid(eu), {}); return { ok: r.ok, message: r.message, podeDesignar: r.podeDesignar }; }],
    ['modo personalizado: responsáveis', (a, eu) => res(a.ctx.SGO_MP_apiResponsaveis(a.sid(eu), {}))],
    ['modo personalizado: desbloquear', (a, eu) => res(a.ctx.SGO_MP_apiDesbloquear(a.sid(eu), { userId: id(a, 'beatriz') }))],
    ['acessos: pode', (a, eu) => { const r = a.api(eu, 'pode'); return { ok: r.ok, pode: r.pode, message: r.message }; }],
    ['segurança: exigir troca de todos', (a, eu) => res(a.ctx.SegAcesso_api(a.sid(eu), 'exigirTrocaTodos', { motivo: 'motivo do teste', confirmar: true }))]
  ];
}

test('1) equivalência: 23 contas reais × ações do lote 1, sem exceções = legado de antes (resultado e mensagem)', () => {
  assert.ok(fs.existsSync(path.join(pastaAntes, 'SGO_Usuarios.js')), 'cópia de antes: ' + pastaAntes);
  const contas = amb().contas.map((u) => u.login);
  assert.equal(contas.length, 23);
  const lista = acoes(), divergencias = [], linhas = [];
  let comparacoes = 0, recusadas = 0;
  for (const eu of contas) {
    const antes = amb(pastaAntes), depois = amb();
    for (const [rotulo, fn] of lista) {
      let ra, rd;
      try { ra = j(fn(antes, eu)); } catch (e) { ra = { lancou: String(e.message) }; }
      try { rd = j(fn(depois, eu)); } catch (e) { rd = { lancou: String(e.message) }; }
      comparacoes++;
      if (ra && (ra.success === false || ra.ok === false || ra.lancou)) recusadas++;
      if (JSON.stringify(ra) !== JSON.stringify(rd)) divergencias.push(eu + ' · ' + rotulo + '\n   antes:  ' + JSON.stringify(ra).slice(0, 300) + '\n   depois: ' + JSON.stringify(rd).slice(0, 300));
    }
    linhas.push(eu);
  }
  fs.writeFileSync(path.join(pastaPoderes, 'lote1-equivalencia.txt'),
    'Lote 1 — equivalência (sem exceções) em ' + new Date().toISOString() + '\ncontas=' + contas.length + ' ações=' + lista.length + ' comparações=' + comparacoes +
    ' recusadas(antes)=' + recusadas + ' divergências=' + divergencias.length + '\nações: ' + lista.map((x) => x[0]).join(' | ') + '\n' + divergencias.join('\n') + '\n');
  assert.equal(divergencias.length, 0, divergencias.slice(0, 5).join('\n'));
  assert.ok(recusadas > 200 && recusadas < comparacoes - 100, 'a sequência precisa ter recusas e liberações: ' + recusadas + '/' + comparacoes);
});

// ------------------------------------------------------------------ 2) exceção NÃO
test('2) exceção NÃO tira o poder de quem tinha: o servidor recusa com a mensagem da caixa; o resto continua', () => {
  const a = amb();
  const elisa = a.sid('elisa'), jp = a.idDe('joaopedro');
  assert.equal(a.ctx.usuariosAtualizar(elisa, jp, { NOME: 'ANTES DA EXCECAO' }).success, true, 'padrão: gestor altera');
  salvarExc(a, 'elisa', [{ codigo: 'CONTAS_ALTERAR_OUTROS', valor: 'NAO' }, { codigo: 'AREAS_GERIR', valor: 'NAO' }, { codigo: 'SEGURANCA_VER_REGISTRO', valor: 'NAO' }, { codigo: 'CONTAS_INATIVAR', valor: 'NAO' }]);
  const r = a.ctx.usuariosAtualizar(elisa, jp, { NOME: 'DEPOIS DA EXCECAO' });
  assert.equal(r.success, false); assert.match(r.message, /«Alterar dados de outra pessoa»/); assert.match(r.message, /Administração > Acessos/);
  assert.equal(a.tabelas.CAD_USUARIOS.find((u) => u.ID === jp).NOME, 'ANTES DA EXCECAO', 'nada gravado');
  // as outras caixas continuam: mudar o perfil e a área ainda passam
  assert.equal(a.ctx.usuariosAtualizar(elisa, jp, { PERFIL: 'METROLOGIA' }).success, true);
  assert.equal(a.ctx.areasDefinirDoUsuario(elisa, { usuarioId: jp, area: 'TECNICA' }).success, true);
  const ap = a.ctx.areasPainel(elisa); assert.equal(ap.success, false); assert.match(ap.message, /«Cadastrar áreas»/);
  const ina = a.ctx.usuariosInativar(elisa, a.idDe('guilherme')); assert.equal(ina.success, false); assert.match(ina.message, /«Inativar e reativar conta»/);
  const seg = a.ctx.SegAcesso_api(elisa, 'painel', {}); assert.equal(seg.ok, false); assert.match(seg.message, /«Ver a Segurança do acesso/);
  // a tela recebe as caixas para esconder os botões
  const p = a.ctx.usuariosPainel(elisa);
  assert.equal(p.success, true);
  assert.equal(p.poderes.CONTAS_ALTERAR_OUTROS, false); assert.equal(p.poderes.CONTAS_VER, true); assert.equal(p.podeGerirAreas, false);
  assert.equal(p.items.find((u) => u.ID === a.idDe('guilherme')).PODE_INATIVAR, false);
  // Diretoria sem a caixa de Diretoria: não cria conta da Diretoria (exceção NÃO vence a regra de perfil que permitia)
  salvarExc(a, 'charles', [{ codigo: 'CONTAS_DAR_DIRETORIA', valor: 'NAO' }]);
  const d = a.ctx.usuariosCriar(a.sid('charles'), { NOME: 'OUTRA DIRETORA', EMAIL: 'outra.dir@exemplo.test', PERFIL: 'DIRETORIA', SENHA: 'Teste2026xy', VINCULO_TRABALHO: 'DIRETORIA' });
  assert.equal(d.success, false); assert.match(d.message, /«Dar ou alterar o perfil Diretoria»/);
  assert.equal(a.ctx.usuariosCriar(a.sid('charles'), { NOME: 'TECNICO NOVO', EMAIL: 'tec.novo@exemplo.test', PERFIL: 'TECNICO', SENHA: 'Teste2026xy', VINCULO_TRABALHO: 'CLT' }).success, true, 'o resto continua');
  // dono: nenhuma exceção grava para ele (proteção do lote 0) e ele continua com tudo
  assert.equal(a.api('charles', 'salvar', { usuarioId: a.idDe('admin'), motivo: 'tentativa', mudancas: [{ codigo: 'CONTAS_VER', valor: 'NAO' }] }).ok, false);
  for (const c of LOTE1) assert.equal(a.ctx.SGO_pode_('s_admin', c), true, c);
});

// ------------------------------------------------------------------ 3) exceção SIM
test('3) exceção SIM dá o poder a quem não tinha, sem passar por cima das proteções fixas de Administrador e Diretoria', () => {
  const a = amb();
  const jp = a.sid('joaopedro');
  assert.equal(a.ctx.usuariosListar(jp).success, false, 'padrão: técnico não vê a lista');
  salvarExc(a, 'joaopedro', ['CONTAS_VER', 'CONTAS_CRIAR', 'CONTAS_ALTERAR_OUTROS', 'CONTAS_MUDAR_PERFIL', 'CONTAS_INATIVAR', 'CONTAS_EXCLUIR', 'CONTAS_REDEFINIR_SENHA',
    'CONTAS_GERIR_ADMINISTRADOR', 'CONTAS_DAR_DIRETORIA', 'SEGURANCA_VER_REGISTRO', 'SEGURANCA_ALTERAR', 'AREAS_GERIR', 'MODO_PERSONALIZADO_DESIGNAR'].map((codigo) => ({ codigo, valor: 'SIM' })),
  'Cobre a gestão de contas nas férias');
  // ganha: ver, alterar outro técnico, inativar, áreas, segurança de um técnico, modo personalizado
  assert.equal(a.ctx.usuariosListar(jp).success, true);
  assert.equal(a.ctx.usuariosAtualizar(jp, a.idDe('gabrieldias'), { NOME: 'GABRIEL ALTERADO' }).success, true);
  assert.equal(a.ctx.usuariosInativar(jp, a.idDe('guilherme')).success, true);
  assert.equal(a.ctx.areasPainel(jp).success, true);
  assert.equal(a.ctx.SegAcesso_api(jp, 'exigirTrocaUsuario', { usuarioId: a.idDe('gabrielpereira'), motivo: 'motivo do teste' }).ok, true);
  assert.equal(a.ctx.SGO_MP_apiResponsaveis(jp, {}).ok, true);
  assert.equal(a.ctx.SGO_MP_apiSituacao(jp, {}).podeDesignar, true);
  // proteções fixas: conta e perfil de Administrador/Diretoria, último Administrador, a própria conta
  const fixas = [
    a.ctx.usuariosAtualizar(jp, a.idDe('admin'), { NOME: 'X' }), a.ctx.usuariosAtualizar(jp, a.idDe('charles'), { NOME: 'X' }),
    a.ctx.usuariosAtualizar(jp, a.idDe('paulohenrique'), { PERFIL: 'ADMIN' }), a.ctx.usuariosAtualizar(jp, a.idDe('paulohenrique'), { PERFIL: 'DIRETORIA' }),
    a.ctx.usuariosCriar(jp, { NOME: 'ADM X', EMAIL: 'admx@exemplo.test', PERFIL: 'ADMIN', SENHA: 'Teste2026xy', VINCULO_TRABALHO: 'CLT' }),
    a.ctx.usuariosInativar(jp, a.idDe('admin')), a.ctx.usuariosInativar(jp, a.idDe('charles')),
    a.ctx.usuariosExcluir(jp, a.idDe('admin'), 'motivo longo do teste'), a.ctx.usuariosExcluir(jp, a.idDe('charles'), 'motivo longo do teste'),
    a.ctx.usuariosEnviarLinkRedefinicao(jp, a.idDe('admin'), 'motivo do teste')
  ];
  fixas.forEach((r, i) => { assert.equal(r.success, false, 'fixa ' + i + ': ' + r.message); assert.match(r.message, /Administrador|Diretoria/, 'fixa ' + i); });
  assert.equal(a.tabelas.CAD_USUARIOS.find((u) => u.USUARIO === 'admin').STATUS, 'ATIVO');
  const proprio = a.ctx.usuariosAtualizar(jp, a.idDe('joaopedro'), { PERFIL: 'GESTOR' });
  assert.equal(proprio.success, false); assert.match(proprio.message, /próprio perfil/);
  const s1 = a.ctx.SegAcesso_api(jp, 'exigirTrocaUsuario', { usuarioId: a.idDe('admin'), motivo: 'motivo do teste' });
  assert.equal(s1.ok, false); assert.match(s1.message, /Administrador/);
  const s2 = a.ctx.SegAcesso_api(jp, 'zerarSegundoFator', { usuarioId: a.idDe('charles'), motivo: 'motivo do teste' });
  assert.equal(s2.ok, false); assert.match(s2.message, /Diretoria/);
  const s3 = a.ctx.SegAcesso_api(jp, 'exigirTrocaTodos', { motivo: 'motivo do teste', confirmar: true });
  assert.equal(s3.ok, false); assert.match(s3.message, /Administrador/);
  // a tela: o painel não oferece editar conta de Administrador nem os perfis Administrador e Diretoria
  const p = a.ctx.usuariosPainel(jp);
  assert.equal(p.items.find((u) => u.USUARIO === undefined && u.ID === a.idDe('admin')).PODE_ALTERAR, false);
  assert.equal(p.items.find((u) => u.ID === a.idDe('admin')).CONTA_PROTEGIDA, true);
  assert.ok(!p.perfis.map(String).some((x) => /^(ADMIN|DIRETORIA)$/i.test(x)), JSON.stringify(p.perfis));
  // ninguém mexe nas próprias caixas
  assert.equal(a.api('joaopedro', 'salvar', { usuarioId: a.idDe('joaopedro'), motivo: 'tentativa', mudancas: [{ codigo: 'ACESSOS_GERIR', valor: 'SIM' }] }).ok, false);
});

// ------------------------------------------------------------------ 4) e-mail antigo
test('4) troca de e-mail avisa o e-mail ANTIGO e registra (SYS_LOGS e Segurança do acesso); sem troca, nada', () => {
  const a = amb();
  const id = a.idDe('joaopedro');
  const antigo = a.tabelas.CAD_USUARIOS.find((u) => u.ID === id).EMAIL;
  const r = a.ctx.usuariosAtualizar(a.sid('elisa'), id, { EMAIL: 'joao.novo@exemplo.test' });
  assert.equal(r.success, true, r.message);
  assert.match(r.message, /e-mail antigo \(joaopedro@exemplo\.test\) recebeu um aviso/);
  const m = a.emails.filter((e) => e.to === antigo);
  assert.equal(m.length, 1, 'um aviso ao e-mail antigo');
  assert.match(m[0].subject, /e-mail da sua conta do SGO\+ foi trocado/);
  assert.match(m[0].body, /jo\*\*\*@exemplo\.test/, 'e-mail novo mascarado');
  assert.ok(!m[0].body.includes('joao.novo@'), 'e-mail novo não vai inteiro');
  assert.match(m[0].htmlBody, /text-align:justify/);
  assert.ok(!a.emails.some((e) => e.to === 'joao.novo@exemplo.test'), 'o aviso não vai para o e-mail novo');
  assert.ok(a.registros.some((x) => x.ev === 'EMAIL_TROCADO' && x.id === id && /joaopedro@exemplo\.test -> joao\.novo@exemplo\.test/.test(x.det)));
  assert.ok(a.logs.some((l) => l[0] === 'USUARIOS_EMAIL_TROCADO'));
  assert.equal(vm.runInContext('SEGA_EVENTOS.EMAIL_TROCADO', a.ctx), 'E-mail da conta trocado');
  // salvar sem trocar o e-mail: nenhum aviso
  a.emails.length = 0;
  assert.equal(a.ctx.usuariosAtualizar(a.sid('elisa'), id, { NOME: 'JOAO PEDRO' }).success, true);
  assert.equal(a.emails.length, 0);
  // e-mail que não sai: a mensagem avisa para falar com a pessoa por outro meio
  a.ctx.MailApp = { sendEmail: () => { throw new Error('cota'); } };
  const r2 = a.ctx.usuariosAtualizar(a.sid('elisa'), id, { EMAIL: 'joao.outro@exemplo.test' });
  assert.equal(r2.success, true); assert.match(r2.message, /não chegou a ser enviado ao e-mail antigo/);
});

// ------------------------------------------------------------------ 5) tela
/** Página completa como o servidor monta (Index.html com os include() resolvidos). */
function paginaCompleta() {
  return lerLegado('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => lerLegado(f + '.html'));
}
function navegador(a, login, contexto) {
  const els = {};
  const el = (id) => (els[id] = els[id] || { style: { display: id === 'menu-btn-acessos' || id === 'menu-btn-seguranca_acesso' ? 'none' : '' } });
  const janela = {
    document: { getElementById: el, querySelectorAll: () => [] }, console,
    USER_CONTEXT: contexto, SGO_getSessionId: () => 's_' + login,
    SGO_ehRotina_: () => ['ADMIN', 'DIRETORIA', 'GESTOR', 'RH', 'FINANCEIRO'].includes(contexto.perfil),
    google: { script: { run: (function mk(ok, falha) { return new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => mk(f, falha) : k === 'withFailureHandler' ? (f) => mk(ok, f) : (...args) => { try { ok(j(a.ctx[k](...args))); } catch (e) { falha(e); } } }); })(() => {}, () => {}) } }
  };
  janela.window = janela;
  vm.createContext(janela);
  for (const f of ['JS_Acessos.html', 'JS_SegurancaAcesso.html']) {
    const js = /<script>([\s\S]*?)<\/script>/.exec(lerLegado(f))[1];
    vm.runInContext(js, janela);
  }
  return { janela, el };
}
test('5) tela: menu Usuários e Segurança do acesso seguem as caixas da pessoa; botões da tela Usuários pela lista de caixas; a página completa tem tudo', () => {
  const pg = paginaCompleta();
  assert.ok(!/<\?!=\s*include/.test(pg));
  for (const fn of ['function SGO_temPoder_(', 'function SGO_poderesAplicarMenu_(', 'function Usuarios_aplicarPoderes_(', 'function Usuarios_temPoder_(', 'function Usuarios_semCaixa_(']) assert.equal(pg.split(fn).length, 2, fn);
  assert.match(pg, /SGO_temPoder_\("CONTAS_VER", SGO_ehRotina_\)/);
  assert.match(pg, /SGO_temPoder_\("SEGURANCA_VER_REGISTRO", porPerfil\)/);
  assert.match(pg, /u\.PODE_SENHA === false/); assert.match(pg, /u\.PODE_INATIVAR === false/);
  assert.match(pg, /Usuarios_temPoder_\("CONTAS_MUDAR_PERFIL"\)/);
  assert.match(pg, /if \(!Usuarios_temPoder_\("CONTAS_VER"\)\)/);
  const a = amb();
  salvarExc(a, 'joaopedro', [{ codigo: 'CONTAS_VER', valor: 'SIM' }, { codigo: 'SEGURANCA_VER_REGISTRO', valor: 'SIM' }]);
  salvarExc(a, 'elisa', [{ codigo: 'CONTAS_VER', valor: 'NAO' }, { codigo: 'SEGURANCA_VER_REGISTRO', valor: 'NAO' }]);
  const casos = [
    ['admin', 'ADMIN', true, true], ['charles', 'DIRETORIA', true, true], ['ricardo', 'GESTOR', true, true], ['wanessa', 'FINANCEIRO', true, false],
    ['monica', 'COMERCIAL', false, false], ['gabrieldias', 'TECNICO', false, false],
    ['joaopedro', 'TECNICO', true, true],   // exceção SIM
    ['elisa', 'GESTOR', false, false]       // exceção NÃO
  ];
  for (const [login, perfil, usuarios, seguranca] of casos) {
    const n = navegador(a, login, { perfil, usuario: login });
    vm.runInContext('AcessosTela_iniciar_();', n.janela);
    assert.equal(n.el('menu-btn-usuarios').style.display === '', usuarios, login + ' Usuários');
    assert.equal(n.el('menu-btn-seguranca_acesso').style.display === '', seguranca, login + ' Segurança do acesso');
    assert.equal(vm.runInContext('SegAcessoTela_pode_()', n.janela), seguranca, login);
    // o servidor recusa do mesmo jeito que a tela esconde
    assert.equal(a.ctx.usuariosListar('s_' + login).success, usuarios, login + ' servidor');
    assert.equal(a.ctx.SegAcesso_api('s_' + login, 'registro', {}).ok, seguranca, login + ' servidor segurança');
  }
  // antes da resposta do servidor, vale o perfil (fallback)
  const n2 = navegador(a, 'monica', { perfil: 'GESTOR', usuario: 'monica' });
  assert.equal(vm.runInContext('SGO_temPoder_("CONTAS_VER", SGO_ehRotina_)', n2.janela), true);
  // ajuda da Administração atualizada
  const aj = a.ctx.SGO_ajudaTelas_Administracao_();
  assert.match(JSON.stringify(aj.acessos), /Contas, senhas e acessos/);
  assert.match(JSON.stringify(aj.acessos), /e-mail antigo/);
});
