// 16/11/2026 — Enviar acesso ao cliente (pedido da Bruna, Metrologia: "preciso ter acesso de como enviar o login e senha para
// os clientes"). Código real (SGO_Auth.js, SGO_SegurancaAcesso.js, SGO_Usuarios.js, SGO_Usuarios_AcessoCliente.js) num vm,
// com planilha, propriedades e e-mail simulados (nenhum e-mail sai de verdade). Confere: convite cria/usa/expira/reenviar
// invalida; ninguém vê a senha (nem no e-mail, nem na resposta, nem nos registros); a Bruna (Gestor) pode, técnico e cliente
// não; a caixa USUARIOS_CLIENTES_ENVIAR_ACESSO no catálogo de acessos com as contas reais; a página da senha a 390 e 320 px.
// Só dados de teste.
// Uso: DEST=<legado> node --require ./output/lote-20261111n/fontes.cjs --test tests/acesso-cliente-20261116.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { ambiente } = require('./_usuarios_ambiente.cjs');

const BASE = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(BASE, f), 'utf8').replace(/\r\n/g, '\n');
const DOCS = path.join(__dirname, '../docs');
const lerDoc = (f) => fs.readFileSync(path.join(DOCS, f), 'utf8').replace(/\r\n/g, '\n');
const CTX = { ip: '200.1.2.3', agente: 'Mozilla/5.0 (Linux; Android 14) Chrome/130', aparelho: '' };
const j = (x) => JSON.parse(JSON.stringify(x));

const ADMIN = { ID: 'u-admin', USUARIO: 'admin', SENHA: 'Velha2026x', NOME: 'ADMINISTRADOR TESTE', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: 'dono@exemplo.test' };
const BRUNA = { ID: 'u-bruna', USUARIO: 'bruna', SENHA: 'Bruna2026x', NOME: 'BRUNA DE OLIVEIRA TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'bruna@exemplo.test' };
const TEC = { ID: 'u-tec', USUARIO: 'joao', SENHA: 'Joao!2026', NOME: 'JOAO TECNICO TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'joao@exemplo.test' };
const RH = { ID: 'u-rh', USUARIO: 'rosa', SENHA: 'Rosa2026x', NOME: 'ROSA RH TESTE', PERFIL: 'RH', STATUS: 'ATIVO', EMAIL: 'rosa@exemplo.test' };
const CLI = { ID: 'u-cli', USUARIO: 'carla', SENHA: 'Cliente2026x', NOME: 'CARLA CLIENTE TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'carla@hospital.test', CLIENTE_ID: 'c1' };

function amb() {
  const a = ambiente();
  [ADMIN, BRUNA, TEC, RH, CLI].forEach((u) => a.add(Object.assign({}, u)));
  a.abas.get('CAD_CLIENTES').linhas.push(['c2', 'CLINICA INATIVA TESTE', 'INATIVO']);
  vm.runInContext(ler('SGO_Usuarios_AcessoCliente.js'), a.ctx, { filename: 'SGO_Usuarios_AcessoCliente.js' });
  // captura a senha em texto que chega ao hash (só para provar que ela não vaza para lugar nenhum)
  a.senhasClaras = [];
  const hashReal = a.ctx.gerarHashSenhaAuth_;
  a.ctx.gerarHashSenhaAuth_ = function (s) { a.senhasClaras.push(String(s)); return hashReal.apply(this, arguments); };
  a.logs = [];
  a.ctx.SGO_DATA.log = (...x) => { a.logs.push(x); return true; };
  const s = (email, senha) => { const r = a.ctx.login(email, senha, CTX); assert.equal(r.success, true, r.message); return r.sessionId; };
  a.sAdm = s(ADMIN.EMAIL, ADMIN.SENHA); a.sBruna = s(BRUNA.EMAIL, BRUNA.SENHA); a.sTec = s(TEC.EMAIL, TEC.SENHA); a.sRh = s(RH.EMAIL, RH.SENHA); a.sCli = s(CLI.EMAIL, CLI.SENHA);
  a.senhasClaras = []; // o login das contas de teste regrava o hash antigo; daqui para frente conta só o que o envio gera
  a.api = (sid, acao, d) => j(a.ctx.acessoClienteApi(sid, acao, d || {}));
  a.convites = () => a.emails.filter((e) => e.subject === 'Seu acesso ao SGO+ da Metrolabs');
  a.envios = () => a.ctx.SGO_DATA.getAll('SYS_ACESSO_CLIENTE_ENVIOS');
  a.porEmail = (e) => a.ctx.SGO_DATA.getAll('CAD_USUARIOS').find((u) => String(u.EMAIL).toLowerCase() === e);
  return a;
}
const NOVO = { clienteId: 'c1', nome: 'Marta Enfermeira', email: ' Marta.CME@Hospital.test ', celular: '(11) 98765-4321' };

test('a Bruna (Gestor) cria a conta do cliente e envia o convite: login no e-mail, link de uso único, senha em lugar nenhum', () => {
  const a = amb();
  const r = a.api(a.sBruna, 'enviar', NOVO);
  assert.equal(r.success, true, r.message);
  assert.equal(r.contaCriada, true);
  assert.match(r.message, /Conta de cliente criada e convite enviado para marta\.cme@hospital\.test/);
  assert.match(r.message, /não aparece para ninguém da Metrolabs/);
  const u = a.porEmail('marta.cme@hospital.test');
  assert.ok(u, 'conta criada');
  assert.equal(u.PERFIL, 'CLIENTE'); assert.equal(u.CLIENTE_ID, 'c1'); assert.equal(u.VINCULO_TRABALHO, 'CLIENTE'); assert.equal(u.PRECISA_TROCAR_SENHA, 'SIM');
  assert.equal(u.NOME, 'MARTA ENFERMEIRA');
  assert.equal(a.senhasClaras.length, 1, 'uma senha aleatória gerada para a conta nova');
  const clara = a.senhasClaras[0];
  assert.ok(clara.length >= 40, 'senha aleatória longa');
  assert.notEqual(String(u.SENHA), clara, 'a senha gravada é o hash, nunca o texto');
  // o e-mail: para o contato, com o login, o link e a resposta para a Bruna; sem senha
  const conv = a.convites();
  assert.equal(conv.length, 1);
  const e = conv[0];
  assert.equal(e.to, 'marta.cme@hospital.test'); assert.equal(e.replyTo, 'bruna@exemplo.test'); assert.equal(e.name, 'Metrolabs · SGO+');
  assert.match(e.body, /Seu login: marta\.cme@hospital\.test/);
  assert.match(e.body, /A Metrolabs não sabe e não envia a sua senha/);
  assert.match(e.body, /https:\/\/sgo\.metrolabs\.com\.br\/#redefinir=[0-9a-f]{64}/);
  assert.match(e.body, /vale até \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}/);
  assert.match(e.body, /acesse https:\/\/sgo\.metrolabs\.com\.br e digite o seu e-mail/);
  assert.match(e.body, /HOSPITAL TESTE/);
  assert.match(e.body, /Dúvidas: fale com Bruna de Oliveira Teste \(bruna@exemplo\.test\), da Metrolabs/);
  assert.match(e.htmlBody, />Metrolabs</); assert.match(e.htmlBody, /Criar minha senha/); assert.match(e.htmlBody, /text-align:justify/);
  const tudoEmail = e.body + e.htmlBody + e.subject;
  assert.ok(!tudoEmail.includes(clara), 'a senha aleatória não vai no e-mail');
  assert.doesNotMatch(tudoEmail, /Senha:\s*\S{6,}/, 'nenhuma linha "Senha: xxxx"');
  // o token só existe no e-mail
  const token = a.linkDe(e);
  const guardado = JSON.stringify([...a.props.entries()]) + JSON.stringify([...a.cache.entries()]) + JSON.stringify(a.registro()) + JSON.stringify(a.logs) + JSON.stringify(a.envios()) + JSON.stringify(r);
  assert.ok(!guardado.includes(token), 'o token não fica em propriedade, cache, registro, log, aba de envios nem na resposta');
  assert.ok(!guardado.includes(clara), 'a senha aleatória não fica em lugar nenhum');
  assert.ok(a.props.has('SEGA_RED_' + crypto.createHash('sha256').update(token).digest('hex')), 'só o resumo SHA-256');
  // registro de cada envio: quem, para qual e-mail, quando, até quando, conta criada
  const env = a.envios();
  assert.equal(env.length, 1);
  assert.equal(env[0].EMAIL, 'marta.cme@hospital.test'); assert.equal(env[0].POR, 'BRUNA DE OLIVEIRA TESTE'); assert.equal(env[0].POR_ID, 'u-bruna');
  assert.equal(env[0].CONTA_CRIADA, 'SIM'); assert.equal(env[0].SITUACAO, 'ENVIADO'); assert.equal(env[0].HORAS, '72'); assert.match(env[0].QUANDO, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  assert.ok(a.registro().some((l) => l[2] === 'CONVITE_CLIENTE_ENVIADO' && /marta\.cme@hospital\.test/.test(l[8]) && l[9] === 'BRUNA DE OLIVEIRA TESTE'));
  assert.ok(a.logs.some((l) => l[0] === 'USUARIOS_CONVITE_CLIENTE'));
  // a resposta e o "preparar" não levam Date cru nem senha
  const p = a.api(a.sBruna, 'preparar', { usuarioId: u.ID });
  assert.equal(p.success, true, p.message);
  assert.equal(p.conta.ULTIMO_ENVIO.situacao, 'ENVIADO'); assert.equal(p.historico.length, 1); assert.equal(p.horas, 72);
  assert.ok(!/"SENHA"|pbkdf2/.test(JSON.stringify(p)), 'nada de senha (nem o hash) no preparar');
});

test('convite: abrir mostra o texto de convite com data; criar a senha usa o link (uso único) e a conta entra com ela', () => {
  const a = amb();
  a.api(a.sBruna, 'enviar', NOVO);
  const token = a.linkDe(a.convites()[0]);
  const ab = j(a.ctx.abrirRedefinicaoSenha(token, CTX));
  assert.equal(ab.success, true); assert.equal(ab.etapa, 'NOVA_SENHA'); assert.equal(ab.convite, true); assert.equal(ab.nome, 'Marta');
  assert.match(ab.validoAte, /^\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}$/, 'convite mostra data e hora (vale dias)');
  assert.match(ab.email, /•••/);
  const fraca = j(a.ctx.concluirRedefinicaoSenha(token, { nova: '12345678a', confirmacao: '12345678a' }, CTX));
  assert.equal(fraca.success, false); assert.match(fraca.message, /fácil de adivinhar/);
  const fim = j(a.ctx.concluirRedefinicaoSenha(token, { nova: 'Ipe amarelo 2026', confirmacao: 'Ipe amarelo 2026' }, CTX));
  assert.equal(fim.success, true, fim.message); assert.equal(fim.etapa, 'FIM'); assert.equal(fim.convite, true);
  assert.match(fim.message, /Pronto: a sua senha foi criada\. O que fazer: na tela de entrada, digite o seu e-mail/);
  const u = a.porEmail('marta.cme@hospital.test');
  assert.equal(u.PRECISA_TROCAR_SENHA, ''); assert.ok(u.SENHA_TROCADA_EM);
  const login = a.ctx.login('marta.cme@hospital.test', 'Ipe amarelo 2026', CTX);
  assert.equal(login.success, true, JSON.stringify(login));
  // uso único: o mesmo link não vale mais, com a mensagem do convite
  const de2 = j(a.ctx.abrirRedefinicaoSenha(token, CTX));
  // (o link usado é apagado na hora: a página diz que não vale mais, por quê e o que fazer)
  assert.equal(de2.etapa, 'INVALIDO');
  assert.match(de2.message, /não vale mais\. Por quê: .*já foi usado.*O que fazer: /);
  assert.equal(a.envios()[0].SITUACAO, 'USADO'); assert.ok(a.envios()[0].USADO_EM);
  assert.ok(a.registro().some((l) => l[2] === 'CONVITE_CLIENTE_CONCLUIDO'));
  assert.ok(a.emails.some((e) => /foi alterada/.test(e.subject) && /convite de acesso/.test(e.body)), 'confirmação de senha criada por e-mail');
});

test('convite: vence no prazo (72 h por padrão; o Administrador muda, a Bruna não); vencido diz o quê, por quê e o que fazer', () => {
  const a = amb();
  const r = a.api(a.sBruna, 'enviar', { usuarioId: 'u-cli' });
  assert.equal(r.success, true, r.message); assert.equal(r.contaCriada, false); assert.equal(r.horas, 72);
  const token = a.linkDe(a.convites()[0]);
  const chave = 'SEGA_RED_' + crypto.createHash('sha256').update(token).digest('hex');
  const rec = JSON.parse(a.props.get(chave));
  assert.equal(rec.convite, true); assert.equal(rec.tipo, 'SENHA');
  const h = (rec.exp - Date.now()) / 3600000;
  assert.ok(h > 71.9 && h <= 72, 'validade de 72 h: ' + h);
  // a senha atual da Carla continua valendo até ela criar outra
  assert.equal(a.ctx.login(CLI.EMAIL, CLI.SENHA, CTX).success, true);
  // vencido
  rec.exp = Date.now() - 1000; a.props.set(chave, JSON.stringify(rec));
  const v = j(a.ctx.abrirRedefinicaoSenha(token, CTX));
  assert.equal(v.etapa, 'INVALIDO'); assert.equal(v.vencido, true); assert.equal(v.convite, true);
  assert.match(v.message, /^Este convite venceu\. Por quê: .* O que fazer: peça um convite novo/);
  // prazo configurável: só quem altera a Segurança do acesso (aqui, sem o catálogo de caixas: o Administrador)
  const nega = a.api(a.sBruna, 'configurar', { horas: 24 });
  assert.equal(nega.success, false); assert.match(nega.message, /^Não foi possível alterar a validade do convite: .*O que fazer: /);
  assert.match(a.api(a.sAdm, 'configurar', { horas: 500 }).message, /Validade inválida: escolha de 1 a 168 horas/);
  const ok = a.api(a.sAdm, 'configurar', { horas: 24 });
  assert.equal(ok.success, true, ok.message); assert.equal(ok.horas, 24);
  const r2 = a.api(a.sBruna, 'enviar', { usuarioId: 'u-cli' });
  assert.equal(r2.horas, 24);
  const rec2 = JSON.parse(a.props.get('SEGA_RED_' + crypto.createHash('sha256').update(a.linkDe(a.convites()[1])).digest('hex')));
  const h2 = (rec2.exp - Date.now()) / 3600000;
  assert.ok(h2 > 23.9 && h2 <= 24, 'validade de 24 h: ' + h2);
  assert.equal(a.api(a.sBruna, 'preparar', {}).horas, 24);
});

test('reenviar invalida o anterior (e o anterior fica como "trocado"); limite de 5 por hora por conta', () => {
  const a = amb();
  a.api(a.sBruna, 'enviar', { usuarioId: 'u-cli' });
  a.api(a.sBruna, 'enviar', { usuarioId: 'u-cli' });
  const [t1, t2] = a.convites().map(a.linkDe);
  assert.notEqual(t1, t2);
  const v1 = j(a.ctx.abrirRedefinicaoSenha(t1, CTX));
  assert.equal(v1.etapa, 'INVALIDO'); assert.match(v1.message, /trocado por um (link|convite) mais novo/);
  assert.equal(j(a.ctx.abrirRedefinicaoSenha(t2, CTX)).etapa, 'NOVA_SENHA');
  const env = a.envios().sort((x, y) => String(x.QUANDO).localeCompare(String(y.QUANDO)));
  assert.deepEqual(env.map((x) => x.SITUACAO).sort(), ['ENVIADO', 'SUBSTITUIDO']);
  // "Esqueci minha senha" também cancela o convite (um link vivo por pessoa)
  a.ctx.pedirRedefinicaoSenha(CLI.EMAIL, CTX);
  assert.equal(j(a.ctx.abrirRedefinicaoSenha(t2, CTX)).etapa, 'INVALIDO');
  a.api(a.sBruna, 'enviar', { usuarioId: 'u-cli' }); a.api(a.sBruna, 'enviar', { usuarioId: 'u-cli' }); a.api(a.sBruna, 'enviar', { usuarioId: 'u-cli' });
  const sexto = a.api(a.sBruna, 'enviar', { usuarioId: 'u-cli' });
  assert.equal(sexto.success, false); assert.match(sexto.message, /já recebeu 5 convites na última hora\. Por quê: .* O que fazer: /);
  assert.equal(a.convites().length, 5);
});

test('quem pode: Bruna (Gestor), Administrador; técnico, RH e cliente não (mensagem diz o quê, por quê e o que fazer)', () => {
  const a = amb();
  assert.equal(a.api(a.sAdm, 'enviar', { usuarioId: 'u-cli' }).success, true);
  assert.equal(a.api(a.sBruna, 'preparar', {}).success, true);
  for (const sid of [a.sTec, a.sRh]) {
    const r = a.api(sid, 'enviar', NOVO);
    assert.equal(r.success, false);
    assert.match(r.message, /^Não foi possível enviar o acesso ao cliente: esta ação é da gestão .* Por quê: .* O que fazer: /);
    assert.equal(a.api(sid, 'preparar', {}).success, false);
  }
  const c = a.api(a.sCli, 'enviar', NOVO);
  assert.equal(c.success, false); assert.match(c.message, /contas de cliente e de representada não enviam convites/);
  assert.equal(a.convites().length, 1, 'só o envio do Administrador saiu');
  assert.equal(a.porEmail('marta.cme@hospital.test'), undefined, 'nenhuma conta criada pelos recusados');
  // painel de Usuários: o botão aparece para a Bruna e não para o RH; o item de conta de cliente segue a mesma caixa
  const pb = j(a.ctx.usuariosPainel(a.sBruna));
  assert.equal(pb.podeEnviarAcessoCliente, true);
  assert.equal(pb.items.find((u) => u.ID === 'u-cli').PODE_ENVIAR_ACESSO, true);
  assert.equal(pb.items.find((u) => u.ID === 'u-tec').PODE_ENVIAR_ACESSO, false, 'só conta de cliente');
  const pr = j(a.ctx.usuariosPainel(a.sRh));
  assert.equal(pr.podeEnviarAcessoCliente, false);
});

test('conferências: e-mail de outra conta, cliente inativo, conta inativa, conta da equipe, campos faltando', () => {
  const a = amb();
  const dup = a.api(a.sBruna, 'enviar', Object.assign({}, NOVO, { email: TEC.EMAIL }));
  assert.equal(dup.success, false); assert.match(dup.message, /já é da conta de JOAO TECNICO TESTE, da equipe\. Por quê: .* O que fazer: /);
  const outra = a.api(a.sBruna, 'enviar', Object.assign({}, NOVO, { clienteId: 'c2', email: 'nova@clinica.test' }));
  assert.equal(outra.success, false); assert.match(outra.message, /está inativo\. Por quê: .* O que fazer: reative o cliente/);
  const falta = a.api(a.sBruna, 'enviar', { clienteId: '', nome: '', email: 'x' });
  assert.equal(falta.success, false); assert.match(falta.message, /escolha a empresa .*escreva o nome do contato.*confira o e-mail/);
  const equipe = a.api(a.sBruna, 'enviar', { usuarioId: 'u-tec' });
  assert.equal(equipe.success, false); assert.match(equipe.message, /não é conta de cliente .* O que fazer: para pessoas da equipe, use Mais > Enviar link de redefinição/);
  // mesmo e-mail de uma conta de cliente da mesma empresa: usa a conta que existe (não cria outra)
  const mesma = a.api(a.sBruna, 'enviar', { clienteId: 'c1', nome: 'Carla', email: 'CARLA@hospital.test' });
  assert.equal(mesma.success, true, mesma.message); assert.equal(mesma.contaCriada, false); assert.equal(mesma.usuarioId, 'u-cli');
  assert.equal(a.ctx.SGO_DATA.getAll('CAD_USUARIOS').filter((u) => /carla@/i.test(u.EMAIL)).length, 1);
  // conta inativa
  a.ctx.SGO_DATA.update('CAD_USUARIOS', 'u-cli', { STATUS: 'INATIVO' });
  const ina = a.api(a.sBruna, 'enviar', { usuarioId: 'u-cli' });
  assert.equal(ina.success, false); assert.match(ina.message, /está inativa\. Por quê: .* O que fazer: reative a conta/);
  // e-mail que não sai: nada fica pela metade (o link é apagado) e a mensagem diz o que fazer
  const b = amb();
  b.ctx.MailApp = { sendEmail: () => { throw new Error('cota diária esgotada'); } };
  const falhou = b.api(b.sBruna, 'enviar', { usuarioId: 'u-cli' });
  assert.equal(falhou.success, false); assert.match(falhou.message, /Não foi possível enviar o e-mail do convite agora\. Por quê: .* O que fazer: /);
  assert.ok(![...b.props.keys()].some((k) => k.startsWith('SEGA_RED_')), 'nenhum link vivo sem e-mail');
  assert.equal(b.envios().length, 0);
});

test('caixa USUARIOS_CLIENTES_ENVIAR_ACESSO no catálogo de acessos: contas reais, Bruna passa, técnico e cliente não; exceção NÃO recusa', () => {
  const { ambiente: ambP } = require('./_poderes_ambiente.cjs');
  const p = ambP({ extras: ['SGO_Clientes.js', 'SGO_Usuarios.js', 'SGO_Usuarios_AcessoCliente.js'] });
  const cat = p.ctx.SGO_poderesCatalogo_();
  const poder = cat.mapa.USUARIOS_CLIENTES_ENVIAR_ACESSO;
  assert.ok(poder, 'caixa no catálogo');
  assert.equal(poder.modulo, 'Contas e acessos'); assert.equal(poder.ligado, true); assert.equal(poder.nome, 'Enviar acesso ao cliente');
  const pode = (login) => p.ctx.SGO_pode_('s_' + login, 'USUARIOS_CLIENTES_ENVIAR_ACESSO');
  assert.equal(pode('bruna'), true, 'Bruna (GESTOR, Metrologia)');
  assert.equal(pode('admin'), true, 'dono'); assert.equal(pode('charles'), true, 'Diretoria');
  for (const login of ['joaopedro', 'bento', 'hst', 'energiza2209']) assert.equal(pode(login), false, login);
  const padrao = p.contas.filter((u) => pode(u.login)).map((u) => u.perfil).filter((x, i, l) => l.indexOf(x) === i).sort();
  assert.deepEqual(padrao, ['ADMIN', 'DIRETORIA', 'GESTOR'].filter((x) => padrao.includes(x)), 'só dono, Administrador, Diretoria e Gestor');
  assert.ok(padrao.every((x) => ['ADMIN', 'DIRETORIA', 'GESTOR'].includes(x)), JSON.stringify(padrao));
  // a trava do servidor usa a caixa: exceção NÃO para a Bruna recusa com a mensagem da caixa
  assert.equal(p.ctx.AcessoCli_recusa_({ userId: p.idDe('bruna'), usuario: 'bruna', perfil: 'GESTOR', nome: 'BRUNA' }), '');
  const r = p.api('admin', 'salvar', { usuarioId: p.idDe('bruna'), motivo: 'Teste: tirar o envio de acesso', mudancas: [{ codigo: 'USUARIOS_CLIENTES_ENVIAR_ACESSO', valor: 'NAO' }] });
  assert.ok(r && r.ok, JSON.stringify(r)); p.limparMemo();
  const msg = p.ctx.AcessoCli_recusa_({ userId: p.idDe('bruna'), usuario: 'bruna', perfil: 'GESTOR', nome: 'BRUNA' });
  assert.match(msg, /Você não tem a permissão «Enviar acesso ao cliente»/);
  // exceção SIM não passa por cima da proteção fixa das contas de fora
  const rc = p.api('admin', 'salvar', { usuarioId: p.idDe('hst'), motivo: 'Teste: cliente com a caixa', mudancas: [{ codigo: 'USUARIOS_CLIENTES_ENVIAR_ACESSO', valor: 'SIM' }] });
  p.limparMemo();
  assert.equal(pode('hst'), false, 'conta de cliente nunca envia' + (rc && rc.ok ? '' : ' (gravação recusada: ' + (rc && rc.message) + ')'));
});

test('telas, ajuda e manuais: botão e menus, função da tela sem "_", texto justificado, nada de senha em log do navegador', () => {
  const admin = ler('JS_Admin.html'), cad = ler('JS_Cadastros.html'), sga = ler('JS_SegurancaAcesso.html'), srv = ler('SGO_Usuarios_AcessoCliente.js');
  assert.match(admin, /Enviar acesso a cliente/); assert.match(admin, /Enviar acesso ao cliente \(login e link da senha\)/);
  assert.match(admin, /CadUI_chamar_\("acessoClienteApi"/);
  assert.match(cad, /Enviar acesso ao portal \(login do cliente\)/); assert.match(cad, /AcessoCli_abrir_\(\{ clienteId: c\.ID/);
  assert.match(srv, /^function acessoClienteApi\(sessionId, acao, dados\)/m, 'função chamada pela tela não termina com "_"');
  assert.match(srv, /return JSON\.parse\(JSON\.stringify\(AcessoCli_enviar_/, 'resposta passa por JSON (nada de Date cru)');
  assert.match(admin, /\.acli-just\{text-align:justify/); assert.match(sga, /\.sga-just \{ text-align: justify/);
  for (const t of [admin, cad, sga]) assert.doesNotMatch(t, /console\.(log|info)\([^)]*(senha|token)/i);
  // ajuda das telas
  const ctx = vm.createContext({});
  vm.runInContext(ler('SGO_Ajuda_Administracao.js'), ctx);
  const us = ctx.SGO_ajudaTelas_Administracao_().usuarios;
  assert.ok(us.passos.some((p) => /Enviar acesso ao cliente/.test(p.titulo) && p.itens.some((i) => /72 horas/.test(i))));
  assert.ok(us.problemas.some((p) => /esta ação é da gestão/.test(p.situacao)));
  assert.ok(us.perguntas.some((p) => /Como mando o login e a senha para um cliente\?/.test(p.p)));
  assert.match(ler('SGO_Ajuda_Cadastros.js'), /Enviar acesso ao portal \(login do cliente\)/);
  // manuais
  assert.match(lerDoc('MANUAL_SEGURANCA_ACESSO_GESTAO.md'), /## Enviar acesso ao cliente \(16\/11\/2026\)/);
  assert.match(lerDoc('MANUAL_SEGURANCA_ACESSO.md'), /## Recebi um convite de acesso \(clientes, 16\/11\/2026\)/);
  assert.match(lerDoc('MANUAL_CLIENTES_UNIDADES_VINCULOS.md'), /## Enviar acesso ao portal para o contato do cliente \(16\/11\/2026\)/);
});

// Celular: a página da senha (link do convite) e a janela de envio, a 390 e 320 px, sem rolagem lateral e com texto justificado.
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
test('celular: página "Criar a sua senha" do convite e janela "Enviar acesso a cliente" a 390 e 320 px', { skip: !chromium && 'Playwright indisponível' }, async () => {
  const INC = /<\?!=\s*include\('([^']+)'\);\s*\?>/g;
  const VER = /<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/;
  const html = ler('Index.html').replace(INC, (m, f) => ler(f + '.html')).replace(VER, '""');
  const saida = path.join(__dirname, '../output/acesso-cliente-20261116/capturas'); // fixo: o rodar-lista.sh aponta CAPTURAS para outra pasta
  fs.mkdirSync(saida, { recursive: true });
  const a = amb();
  a.api(a.sBruna, 'enviar', NOVO);
  const token = a.linkDe(a.convites()[0]);
  const prep = a.api(a.sBruna, 'preparar', { clienteId: 'c1' });
  const prepConta = a.api(a.sBruna, 'preparar', { usuarioId: 'u-cli' });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [390, 320]) {
      const page = await browser.newPage({ viewport: { width: largura, height: 844 }, isMobile: true, hasTouch: true });
      const erros = [];
      page.on('pageerror', (e) => erros.push(e.message));
      page.on('dialog', (d) => d.accept().catch(() => {}));
      await page.route(/^https?:\/\//, (r) => (r.request().url().startsWith('http://sgo.ensaio.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : r.abort()));
      let concluir = 0;
      await page.exposeFunction('qaRun', (fn, args) => {
        if (fn === 'abrirRedefinicaoSenha') return { ok: true, valor: j(a.ctx.abrirRedefinicaoSenha(args[0], CTX)) };
        if (fn === 'concluirRedefinicaoSenha') { concluir++; return { ok: true, valor: { success: true, etapa: 'FIM', tipo: 'SENHA', convite: true, message: 'Pronto: a sua senha foi criada. O que fazer: na tela de entrada, digite o seu e-mail (m•••e@hospital.test) e a senha que você acabou de criar. Enviamos também um e-mail confirmando a criação da senha.' } }; }
        if (fn === 'acessoClienteApi') return { ok: true, valor: args[1] === 'preparar' ? (args[2] && args[2].usuarioId ? prepConta : prep) : { success: true, message: 'ok' } };
        if (fn === 'getPublicConfig') return { ok: true, valor: { success: true } };
        return { ok: true, valor: { success: false } };
      });
      await page.addInitScript(() => {
        const corredor = (okf, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(okf, f) : k === 'withUserObject' ? () => corredor(okf, falha) :
          (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (okf) okf(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
        window.google = { script: { run: corredor(null, null) } };
      });
      await page.goto('http://sgo.ensaio.test/#redefinir=' + token, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => /Criar a sua senha/.test(document.body.innerText), null, { timeout: 15000 });
      assert.equal(await page.evaluate(() => location.hash), '', 'o token sai do endereço na hora');
      const txt = await page.evaluate(() => document.body.innerText);
      assert.match(txt, /A Metrolabs liberou o seu acesso ao SGO\+/);
      assert.match(txt, /O link vale até \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}/);
      assert.ok(await page.evaluate(() => Array.from(document.querySelectorAll('.sga-just')).some((p) => /liberou o seu acesso/.test(p.textContent) && getComputedStyle(p).textAlign === 'justify')), 'texto justificado');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem lateral (página da senha)');
      assert.ok((await page.locator('#sgaRedSalvar').boundingBox()).height >= 44, 'botão com toque grande');
      await page.screenshot({ path: path.join(saida, largura + '-convite-criar-senha.png'), fullPage: true });
      await page.fill('#sgaNova', 'Ipe amarelo 2026'); await page.fill('#sgaConf', 'Ipe amarelo 2026');
      await page.click('#sgaRedSalvar');
      await page.waitForFunction(() => /Senha criada/.test(document.body.innerText));
      assert.equal(concluir, 1);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem lateral (fim)');
      await page.screenshot({ path: path.join(saida, largura + '-convite-senha-criada.png'), fullPage: true });
      // link inválido (convite já usado): o quê, por quê, o que fazer
      await page.evaluate(() => SegAcesso_desenharRedefinir_({ success: false, etapa: 'INVALIDO', convite: true, vencido: true, message: 'Este convite venceu. Por quê: o link do convite vale por um prazo definido pela Metrolabs (o e-mail diz até quando) e esse prazo passou. O que fazer: peça um convite novo a quem enviou (basta responder o e-mail do convite) ou, na tela de entrada, toque em "Esqueci minha senha" e digite o mesmo e-mail.' }));
      assert.match(await page.evaluate(() => document.body.innerText), /Este convite venceu/);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem lateral (vencido)');
      await page.screenshot({ path: path.join(saida, largura + '-convite-vencido.png'), fullPage: true });
      // janela da gestão: contato novo (empresa já escolhida, com as contas e os contatos) e conta existente
      await page.evaluate(() => { document.querySelectorAll('.sga-sobre, #loginScreen, .login-etapa').forEach((x) => { x.style.display = 'none'; }); AcessoCli_abrir_({ clienteId: 'c1', clienteNome: 'HOSPITAL TESTE' }); });
      await page.locator('#cadxDialogo #acliNome').waitFor();
      await page.waitForFunction(() => /Contas de cliente desta empresa/.test(document.getElementById('cadxDialogo').innerText));
      const dlg = await page.evaluate(() => document.getElementById('cadxDialogo').innerText);
      assert.match(dlg, /link de uso único/); assert.match(dlg, /72 horas/); assert.match(dlg, /CARLA CLIENTE TESTE/);
      assert.ok(await page.evaluate(() => getComputedStyle(document.querySelector('#cadxDialogo .acli-just')).textAlign === 'justify'), 'janela justificada');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem lateral (janela nova)');
      await page.screenshot({ path: path.join(saida, largura + '-janela-enviar-acesso-novo.png'), fullPage: false });
      await page.click('#cadxDlgCancelar');
      await page.evaluate(() => AcessoCli_abrir_({ usuarioId: 'u-cli' }));
      await page.waitForFunction(() => document.getElementById('cadxDialogo') && /Enviar para carla@hospital\.test/.test(document.getElementById('cadxDialogo').innerText));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem lateral (janela da conta)');
      await page.screenshot({ path: path.join(saida, largura + '-janela-enviar-acesso-conta.png'), fullPage: false });
      assert.deepEqual(erros, []);
      await page.close();
    }
  } finally { await browser.close(); }
});
