// Usuários (03/11/2026, pedido do dono): "Excluir usuário" só do Administrador, com o que está ligado à conta e o motivo;
// conta sem vínculo sai do cadastro, conta com vínculo fica guardada (exclusão lógica: some, a sessão cai na hora, o login é
// recusado, não volta). Vínculo de trabalho ganha "Cliente" e "Representante", coerentes com o perfil, e essas contas
// continuam fora do ponto e dos avisos internos. Código real (SGO_Auth.js, SGO_SegurancaAcesso.js, SGO_Usuarios.js,
// SGO_Notificar.js, SGO_Ponto_Config.js, SGO_Atividades_Avisos.js) num vm. Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente } = require('./_usuarios_ambiente.cjs');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(BASE, f), 'utf8').replace(/\r\n/g, '\n');
const CTX = { ip: '200.1.2.3', agente: 'Mozilla/5.0 (Linux; Android 14) Chrome/130', aparelho: '' };
const j = (x) => JSON.parse(JSON.stringify(x));

const ADMIN = { ID: 'u-admin', USUARIO: 'admin', SENHA: 'Velha2026x', NOME: 'ADMINISTRADOR TESTE', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: 'dono@exemplo.test' };
const ADMIN2 = { ID: 'u-admin2', USUARIO: 'adm2', SENHA: 'Adm2026xy', NOME: 'SEGUNDO ADMIN TESTE', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: 'adm2@exemplo.test' };
const DIR = { ID: 'u-dir', USUARIO: 'dora', SENHA: 'Dora2026x', NOME: 'DORA DIRETORA TESTE', PERFIL: 'DIRETORIA', STATUS: 'ATIVO', EMAIL: 'dora@exemplo.test' };
const GES = { ID: 'u-ges', USUARIO: 'gil', SENHA: 'Gestor2026', NOME: 'GIL GESTOR TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'gil@exemplo.test' };
const TEC = { ID: 'u-tec', USUARIO: 'joao', SENHA: 'Joao!2026', NOME: 'JOAO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'joao@exemplo.test' };
const NOVO = { ID: 'u-novo', USUARIO: 'nunca', SENHA: 'Nunca2026', NOME: 'NUNCA USOU TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'nunca@exemplo.test' };

function amb() {
  const a = ambiente();
  [ADMIN, ADMIN2, DIR, GES, TEC, NOVO].forEach((u) => a.add(Object.assign({}, u)));
  const s = (email, senha) => { const r = a.ctx.login(email, senha, CTX); assert.equal(r.success, true, r.message); return r.sessionId; };
  a.sAdm = s('dono@exemplo.test', 'Velha2026x');
  a.sDir = s('dora@exemplo.test', 'Dora2026x');
  a.sGes = s('gil@exemplo.test', 'Gestor2026');
  a.aba = (nome, cab, linhas) => { a.abas.set(nome, { cab: cab.slice(), linhas: linhas.map((o) => cab.map((c) => (o[c] === undefined ? '' : o[c]))) }); };
  return a;
}

test('excluir: só o Administrador (a Diretoria e a gestão usam Inativar); ninguém exclui a própria conta; motivo obrigatório', () => {
  const a = amb();
  for (const sid of [a.sDir, a.sGes]) {
    const r = a.ctx.usuariosExcluir(sid, 'u-novo', 'conta criada por engano no teste');
    assert.equal(r.success, false);
    assert.match(r.message, /só do Administrador[\s\S]*Inativar/);
    assert.equal(a.ctx.usuariosVinculosConta(sid, 'u-novo').success, false, 'nem a conferência dos vínculos');
  }
  assert.ok(a.cad('u-novo'), 'nada foi apagado');
  const proprio = a.ctx.usuariosExcluir(a.sAdm, 'u-admin', 'quero sair do sistema agora');
  assert.equal(proprio.success, false); assert.match(proprio.message, /própria conta/);
  const semMotivo = a.ctx.usuariosExcluir(a.sAdm, 'u-novo', 'curto');
  assert.equal(semMotivo.success, false); assert.match(semMotivo.message, /motivo/);
  // a tela recebe podeExcluir só para o Administrador
  assert.equal(a.ctx.usuariosPainel(a.sAdm).podeExcluir, true);
  assert.equal(a.ctx.usuariosPainel(a.sDir).podeExcluir, false);
});

test('excluir: o último Administrador ativo não sai (regra do servidor, também por exclusão)', () => {
  const src = ler('SGO_Usuarios.js');
  const corpo = src.slice(src.indexOf('  function excluir(sessionId, id, motivo) {'), src.indexOf('  function enviarLinkRedefinicao('));
  assert.match(corpo, /ehUltimoAdminAtivo_\(usuarioId\)/);
  assert.match(corpo, /único Administrador ativo/);
  // com dois Administradores, um exclui o outro; o que sobra não consegue se excluir (própria conta) e é o único ativo
  const a = amb();
  a.aba('ATEC_CHAMADOS', ['ID', 'NUMERO', 'CRIADO_POR_ID'], [{ ID: 'ch1', NUMERO: 'CH-2026-0001', CRIADO_POR_ID: 'u-admin2' }]);
  assert.equal(a.ctx.usuariosExcluir(a.sAdm, 'u-admin2', 'saiu da empresa em outubro').success, true);
  assert.equal(a.ctx.usuariosPainel(a.sAdm).items.find((u) => u.ID === 'u-admin').ULTIMO_ADMIN, true);
});

test('conta sem nenhum vínculo: a conferência mostra tudo zerado e a linha sai do cadastro (com auditoria)', () => {
  const a = amb();
  const v = a.ctx.usuariosVinculosConta(a.sAdm, 'u-novo');
  assert.equal(v.success, true, v.message);
  assert.equal(v.modo, 'REMOVER'); assert.equal(v.total, 0);
  assert.deepEqual(j(v.categorias.map((c) => c.cat)), ['acessos', 'chamados', 'os', 'mensagens', 'atividades', 'documentos', 'avisos', 'historico']);
  const r = a.ctx.usuariosExcluir(a.sAdm, 'u-novo', 'conta criada em duplicidade');
  assert.equal(r.success, true, r.message); assert.equal(r.modo, 'REMOVIDA');
  assert.equal(a.cad('u-novo'), null);
  assert.ok(a.registro().some((l) => l[2] === 'CONTA_EXCLUIDA' && /duplicidade/.test(l[8])));
});

test('conta com vínculo: exclusão lógica; some da lista, a sessão cai na hora, o login é recusado, o nome fica e não volta', () => {
  const a = amb();
  const sTec = a.ctx.login('joao@exemplo.test', 'Joao!2026', CTX).sessionId;
  assert.equal(a.ctx.validarSessao(sTec).valid, true);
  const copiaSessao = a.props.get('SGO_SESSION_' + sTec);
  a.aba('ATEC_OS', ['ID', 'NUMERO', 'TECNICO_ID', 'TECNICO_NOME'], [{ ID: 'os1', NUMERO: 'OS-2026-0001', TECNICO_ID: 'u-tec', TECNICO_NOME: 'JOAO TESTE' }, { ID: 'os2', NUMERO: 'OS-2026-0002', TECNICO_ID: 'outro' }]);
  a.aba('ATV_ATIVIDADES', ['ID', 'TITULO', 'RESPONSAVEL_ID', 'PARTICIPANTES_IDS'], [{ ID: 'a1', TITULO: 'Calibrar', RESPONSAVEL_ID: 'u-ges', PARTICIPANTES_IDS: 'u-ges,u-tec' }]);
  a.aba('REP_MENSAGENS', ['ID', 'AUTOR_ID', 'TEXTO'], [{ ID: 'm1', AUTOR_ID: 'u-tec', TEXTO: 'oi' }]);
  const v = a.ctx.usuariosVinculosConta(a.sAdm, 'u-tec');
  assert.equal(v.modo, 'LOGICA');
  const cat = (k) => v.categorias.find((c) => c.cat === k);
  assert.equal(cat('os').total, 1); assert.equal(cat('atividades').total, 1); assert.equal(cat('mensagens').total, 1);
  assert.ok(cat('acessos').total >= 1, 'login e registro de segurança contam como acessos');
  const r = a.ctx.usuariosExcluir(a.sAdm, 'u-tec', 'saiu da empresa em 31/10/2026');
  assert.equal(r.success, true, r.message); assert.equal(r.modo, 'LOGICA');
  const u = a.cad('u-tec');
  assert.ok(u, 'a linha fica');
  assert.equal(u.STATUS, 'INATIVO'); assert.ok(u.EXCLUIDO_EM); assert.equal(u.EXCLUIDO_POR, 'ADMINISTRADOR TESTE'); assert.equal(u.EXCLUIDO_POR_ID, 'u-admin');
  assert.match(u.EXCLUIDO_MOTIVO, /saiu da empresa/); assert.equal(u.SITUACAO_ANTES_EXCLUSAO, 'ATIVO'); assert.equal(u.NOME, 'JOAO TESTE');
  // sessão cai na hora (sem esperar os 5 minutos da reconferência): a sessão é apagada e, se alguma sobrar (lista das
  // propriedades indisponível), a marca da conta excluída derruba na primeira chamada, com a mensagem certa
  assert.equal(a.ctx.validarSessao(sTec).valid, false);
  assert.equal(a.props.has('SGO_SESSION_' + sTec), false);
  a.props.set('SGO_SESSION_' + sTec, copiaSessao);
  const vs = a.ctx.validarSessao(sTec);
  assert.equal(vs.valid, false); assert.match(vs.message, /excluída/);
  assert.equal(a.props.has('SGO_SESSION_' + sTec), false);
  // login recusado com a mensagem certa (com a senha certa)
  const lg = a.ctx.login('joao@exemplo.test', 'Joao!2026', CTX);
  assert.equal(lg.success, false); assert.match(lg.message, /conta foi excluída/);
  assert.equal(a.ctx.login('joao@exemplo.test', 'errada', CTX).message, 'E-mail ou senha inválidos.', 'senha errada não revela nada');
  // não volta e não é editada; o registro antigo continua com o nome
  assert.match(a.ctx.usuariosReativar(a.sAdm, 'u-tec').message, /foi excluída[\s\S]*cadastre uma conta nova/);
  assert.equal(a.ctx.usuariosAtualizar(a.sAdm, 'u-tec', { NOME: 'OUTRO' }).success, false);
  assert.equal(a.ctx.usuariosInativar(a.sAdm, 'u-tec').success, false);
  assert.equal(a.ctx.usuariosExcluir(a.sAdm, 'u-tec', 'de novo para conferir').success, false);
  assert.equal(a.ctx.SGO_DATA.getAll('ATEC_OS')[0].TECNICO_NOME, 'JOAO TESTE');
  // some da lista e aparece só em Excluídos (consulta)
  const p = a.ctx.usuariosPainel(a.sAdm);
  assert.ok(!p.items.some((x) => x.ID === 'u-tec'));
  const ex = p.excluidos.find((x) => x.ID === 'u-tec');
  assert.ok(ex); assert.match(ex.EXCLUIDO_MOTIVO, /saiu da empresa/); assert.equal(ex.EXCLUIDO_POR, 'ADMINISTRADOR TESTE'); assert.match(ex.EXCLUIDO_EM_BR, /^\d{2}\/\d{2}\/\d{4}/);
  // o e-mail pode ganhar uma conta nova
  const novo = a.ctx.usuariosCriar(a.sAdm, { NOME: 'Joao Volta', EMAIL: 'joao@exemplo.test', PERFIL: 'TECNICO', SENHA: '123456', VINCULO_TRABALHO: 'CLT' });
  assert.equal(novo.success, true, novo.message);
  // auditoria
  assert.ok(a.registro().some((l) => l[2] === 'CONTA_EXCLUIDA' && /exclusão lógica/.test(l[8])));
});

test('aba que não deu para ler: nunca remove a linha (exclusão lógica por segurança) e a tela diz qual ficou sem conferir', () => {
  const a = amb();
  const orig = a.ctx.SGO_DATA.getAll;
  a.ctx.SGO_DATA.getAll = (n) => { if (n === 'NTF_ENVIOS') throw new Error('Tempo esgotado ao ler a planilha'); return orig(n); };
  const v = a.ctx.usuariosVinculosConta(a.sAdm, 'u-novo');
  assert.equal(v.modo, 'LOGICA'); assert.deepEqual(j(v.naoConferidas), ['NTF_ENVIOS']);
  assert.equal(a.ctx.usuariosExcluir(a.sAdm, 'u-novo', 'conta de teste que não será usada').modo, 'LOGICA');
  assert.ok(a.cad('u-novo'));
});

test('a tela: botão Excluir só do Administrador, conferência antes, motivo, Excluídos; ajuda atualizada', () => {
  const t = ler('JS_Admin.html');
  assert.match(t, /CadUI_chamar_\("usuariosVinculosConta", \[u\.ID\]/);
  assert.match(t, /CadUI_chamar_\("usuariosExcluir", \[u\.ID, val\.motivo\]/);
  assert.match(t, /motivo: \{ rotulo: "Motivo da exclusão", min: 10/);
  assert.match(t, /function Usuarios_excluidosAbrir_\(\)/);
  assert.match(t, /Excluir uma conta é só do Administrador/);
  assert.match(t, /<b>Excluir usuário<\/b> \(só o Administrador/);
  assert.ok(!/Excluir de vez é só do Administrador e da Diretoria/.test(t));
});

// ---------------------------------------------------------------- vínculo Cliente e Representante
function ambRep() {
  const a = amb();
  a.add({ ID: 'u-cli', USUARIO: 'hospital', SENHA: 'Cliente2026', NOME: 'HOSPITAL TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', CLIENTE_ID: 'c1', EMAIL: 'hosp@exemplo.test' });
  a.add({ ID: 'u-rep', USUARIO: 'rep', SENHA: 'Rep2026xx', NOME: 'REPRESENTANTE TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', REPRESENTADA_ID: 'rep1', REPRESENTACAO_PAPEL: 'ATENDENTE', EMAIL: 'rep@exemplo.test' });
  return a;
}

test('vínculo Cliente e Representante: combinação incoerente é recusada no servidor com o que corrigir; a coerente é salva', () => {
  const a = ambRep();
  const novo = (o) => a.ctx.usuariosCriar(a.sAdm, Object.assign({ NOME: 'Pessoa Teste', EMAIL: 'p' + Math.random().toString(36).slice(2, 7) + '@exemplo.test', SENHA: '123456' }, o));
  const r1 = novo({ PERFIL: 'TECNICO', VINCULO_TRABALHO: 'REPRESENTANTE' });
  assert.equal(r1.success, false); assert.match(r1.message, /Vínculo de trabalho incoerente: o vínculo Representante é só da conta da representada[\s\S]*O que corrigir/);
  const r2 = novo({ PERFIL: 'TECNICO', VINCULO_TRABALHO: 'CLIENTE' });
  assert.equal(r2.success, false); assert.match(r2.message, /o vínculo Cliente é só da conta de cliente[\s\S]*escolha o perfil Cliente e a empresa/);
  const r3 = novo({ PERFIL: 'CLIENTE', CLIENTE_ID: 'c1', VINCULO_TRABALHO: 'CLT' });
  assert.equal(r3.success, false); assert.match(r3.message, /perfil Cliente é de fora da Metrolabs e tem o vínculo Cliente/);
  const r4 = novo({ PERFIL: 'REPRESENTADA', REPRESENTADA_ID: 'rep1', REPRESENTACAO_PAPEL: 'LEITURA', VINCULO_TRABALHO: 'PJ' });
  assert.equal(r4.success, false); assert.match(r4.message, /vínculo Representante/);
  // vínculo Cliente sem a empresa: a regra do perfil Cliente pede a empresa
  const r5 = novo({ PERFIL: 'CLIENTE', VINCULO_TRABALHO: 'CLIENTE' });
  assert.equal(r5.success, false); assert.match(r5.message, /Vínculo de cliente é obrigatório/);
  const r6 = novo({ PERFIL: 'REPRESENTADA', VINCULO_TRABALHO: 'REPRESENTANTE', REPRESENTADA_ID: 'rep1' });
  assert.equal(r6.success, false); assert.match(r6.message, /papel na representada/);
  // coerentes; perfil de fora sem vínculo já nasce alinhado
  assert.equal(novo({ PERFIL: 'CLIENTE', CLIENTE_ID: 'c1', VINCULO_TRABALHO: 'CLIENTE', NOME: 'Cliente Um' }).success, true);
  assert.equal(novo({ PERFIL: 'REPRESENTADA', REPRESENTADA_ID: 'rep1', REPRESENTACAO_PAPEL: 'ADMIN', NOME: 'Rep Dois' }).success, true);
  const todos = a.ctx.SGO_DATA.getAll('CAD_USUARIOS');
  assert.equal(todos.find((x) => x.NOME === 'CLIENTE UM').VINCULO_TRABALHO, 'CLIENTE');
  assert.equal(todos.find((x) => x.NOME === 'REP DOIS').VINCULO_TRABALHO, 'REPRESENTANTE');
  // edição: trocar o perfil de um cliente para Técnico mantendo o vínculo Cliente é recusado; só o celular passa
  const ed = a.ctx.usuariosAtualizar(a.sAdm, 'u-cli', { PERFIL: 'TECNICO', VINCULO_TRABALHO: 'CLIENTE' });
  assert.equal(ed.success, false); assert.match(ed.message, /O que corrigir/);
  assert.equal(a.cad('u-cli').PERFIL, 'CLIENTE');
  assert.equal(a.ctx.usuariosAtualizar(a.sAdm, 'u-cli', { CELULAR: '(62) 98888-7777' }).success, true);
  assert.equal(a.ctx.usuariosAtualizar(a.sAdm, 'u-tec', { VINCULO_TRABALHO: 'PJ' }).success, true, 'equipe segue como antes');
});

test('contas Cliente/Representada sem vínculo: a tela sugere e a rotina preenche uma vez (com auditoria); vínculo informado não muda', () => {
  const a = ambRep();
  a.add({ ID: 'u-cli2', USUARIO: 'outro.cli', SENHA: 'x', NOME: 'OUTRO CLIENTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', CLIENTE_ID: 'c1', EMAIL: 'oc@exemplo.test' });
  assert.equal(a.ctx.Usuarios_vinculoSugerido_(a.cad('u-cli')), 'CLIENTE');
  assert.equal(a.ctx.Usuarios_vinculoSugerido_(a.cad('u-rep')), 'REPRESENTANTE');
  assert.equal(a.ctx.Usuarios_vinculoSugerido_(a.cad('u-tec')), '');
  const r = a.ctx.Usuarios_saneamentoVinculoExternos_();
  assert.equal(r.aplicado, true); assert.deepEqual(j(r.logins).sort(), ['hospital', 'outro.cli', 'rep']);
  assert.equal(a.cad('u-cli').VINCULO_TRABALHO, 'CLIENTE'); assert.equal(a.cad('u-rep').VINCULO_TRABALHO, 'REPRESENTANTE');
  assert.equal(a.cad('u-tec').VINCULO_TRABALHO, '', 'equipe sem vínculo continua sem (a gestão escolhe)');
  assert.equal(a.props.get('USR_VINCULO_EXTERNOS_20261103'), '1');
  a.add({ ID: 'u-cli3', USUARIO: 'depois', SENHA: 'x', NOME: 'DEPOIS', PERFIL: 'CLIENTE', STATUS: 'ATIVO', CLIENTE_ID: 'c1', EMAIL: 'dp@exemplo.test' });
  assert.equal(a.ctx.Usuarios_saneamentoVinculoExternos_().aplicado, false, 'roda uma vez');
  assert.equal(a.cad('u-cli3').VINCULO_TRABALHO, '');
  // a tela mostra a sugestão; o saneamento da Diretoria não mexe nas contas de fora
  const p = a.ctx.usuariosPainel(a.sAdm);
  assert.equal(p.items.find((x) => x.ID === 'u-cli3').VINCULO_SUGERIDO, 'CLIENTE');
  assert.equal(p.items.find((x) => x.ID === 'u-cli').VINCULO_ROTULO, 'Cliente');
  assert.equal(p.items.find((x) => x.ID === 'u-rep').VINCULO_ROTULO, 'Representante');
  assert.deepEqual(j(a.ctx.SGO_VINCULOS_TRABALHO), ['CLT', 'PJ', 'DIRETORIA', 'CLIENTE', 'REPRESENTANTE']);
  // a rotina diária do Programa de conduta também chama o preenchimento
  assert.match(ler('SGO_Conduta_Ciencia.js'), /Usuarios_saneamentoVinculoExternos_\(\)\.logins/);
});

test('Cliente e Representante continuam fora do ponto e dos avisos internos (nada que hoje é só CLT passa a incluí-los)', () => {
  // categoria PONTO do notificador
  const nt = { console };
  vm.createContext(nt);
  vm.runInContext(ler('SGO_Notificar.js').match(/var NTF_MOTIVO_PONTO_PJ[\s\S]*?function Notificar_motivoCategoria_\([\s\S]*?\n\}\n/)[0], nt);
  for (const v of ['CLIENTE', 'REPRESENTANTE']) assert.match(nt.Notificar_motivoCategoria_('PONTO', { vinculo: v }), /conta de fora da Metrolabs/);
  assert.equal(nt.Notificar_motivoCategoria_('PONTO', { vinculo: 'CLT' }), '');
  // WhatsApp de atividades e da gestão: mesmo com "vínculo vazio" liberado, Cliente/Representante ficam fora
  const nt2 = { console, Atividades_avisosCfg_: () => ({ whatsappResumo: true, vinculosWhatsapp: ['CLT', 'PJ', 'DIRETORIA', 'VAZIO'] }) };
  vm.createContext(nt2);
  const src = ler('SGO_Notificar.js');
  vm.runInContext(src.match(/var NTF_MOTIVO_ATV_LIMITE[\s\S]*?function Notificar_motivoAtividadesWhatsapp_\([\s\S]*?\n\}\n/)[0], nt2);
  vm.runInContext(src.match(/var NTF_MOTIVO_GESTAO_LIMITE[\s\S]*?function Notificar_motivoGestaoWhatsapp_\([\s\S]*?\n\}\n/)[0], nt2);
  for (const v of ['CLIENTE', 'REPRESENTANTE']) {
    assert.match(nt2.Notificar_motivoAtividadesWhatsapp_({ id: 'x', vinculo: v }, {}, new Date()), /fora da lista/);
    assert.match(nt2.Notificar_motivoGestaoWhatsapp_({ id: 'x', vinculo: v }, {}, new Date()), /fora da lista/);
  }
  // as opções da lista do WhatsApp (Avisos e horários) não oferecem Cliente nem Representante
  const atv = ler('SGO_Atividades_Avisos.js');
  assert.match(atv, /var ATV_VINCULOS_OPCOES = \['CLT', 'PJ', 'DIRETORIA', 'VAZIO'\];/);
  // Assistente do ponto
  const pto = { Pto_s_: (v) => (v === null || v === undefined ? '' : String(v).trim()), Pto_verdade_: () => true };
  vm.createContext(pto);
  const ps = ler('SGO_Ponto_Config.js');
  vm.runInContext(ps.match(/var PONTO_FORA_TEXTO = \{[\s\S]*?\n\};\n/)[0], pto);
  vm.runInContext(ps.match(/function Ponto_motivoFora_\([\s\S]*?\n\}\n/)[0], pto);
  const base = { ativo: true, sistema: false, celular: '5511999999999' };
  for (const v of ['CLIENTE', 'REPRESENTANTE']) assert.equal(pto.Ponto_motivoFora_(Object.assign({}, base, { vinculo: v }), null, null, {}), 'EXTERNO');
  assert.match(pto.PONTO_FORA_TEXTO.EXTERNO, /não recebe nada do ponto/);
  // a matriz e o ponto só liberam pelo valor exato (CLT ou a lista configurada), nunca por "tem vínculo"
  assert.ok(!/VINCULO_TRABALHO\)?\s*\?\s*['"]?(SIM|true)/.test(ler('SGO_Avisos_Matriz.js')));
});
