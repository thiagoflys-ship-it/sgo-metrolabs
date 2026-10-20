// E-mail integrado de cada colaborador (21/10/2026): SGO_Email.js com o servidor de e-mail simulado (a global
// SGO_EMAIL do servidor próprio). Confere: só o dono chega à própria caixa (o id vem da sessão, nunca do pedido),
// senha só de ida, cliente reconhecido pelo endereço e pelo domínio, pendências do próprio colaborador e da gestão
// (sem assunto), escada (GES_TIPOS), envio como usuário com e sem caixa pessoal, caixas compartilhadas só para o
// Administrador, horas úteis e a casca da tela (menu, rota, include, ajuda). Só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n');
const em = (iso) => Date.parse(iso);
const SEG_16H = em('2026-10-19T16:00:00-03:00'); // segunda-feira

function ambiente(opcoes) {
  const o = opcoes || {};
  const relogio = { agora: o.agora || SEG_16H };
  class DataFalsa extends Date {
    constructor(...a) { if (a.length === 0) super(relogio.agora); else super(...a); }
    static now() { return relogio.agora; }
  }
  const tabelas = {
    CAD_USUARIOS: [
      { ID: 'u_ana', USUARIO: 'ana', NOME: 'ANA TECNICA TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'ana@metrolabs.com.br', AREA: 'TECNICA' },
      { ID: 'u_bia', USUARIO: 'bia', NOME: 'BIA COMERCIAL TESTE', PERFIL: 'COMERCIAL', STATUS: 'ATIVO', EMAIL: 'bia@metrolabs.com.br', AREA: 'COMERCIAL' },
      { ID: 'u_gil', USUARIO: 'gil', NOME: 'GIL GESTOR TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'gil@metrolabs.com.br', AREA: 'TECNICA' },
      { ID: 'u_adm', USUARIO: 'admin', NOME: 'Administrador', PERFIL: 'ADMIN', STATUS: 'ATIVO', EMAIL: '', AREA: '' },
      { ID: 'u_sai', USUARIO: 'saiu', NOME: 'PESSOA INATIVA TESTE', PERFIL: 'TECNICO', STATUS: 'INATIVO', EMAIL: 'saiu@metrolabs.com.br' },
      { ID: 'u_cli', USUARIO: 'cliente', NOME: 'CLIENTE TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO' }
    ],
    CAD_AREAS: [['TECNICA', 'Técnica/Campo'], ['COMERCIAL', 'Comercial']].map((a, i) => ({ ID: 'ar' + i, CODIGO: a[0], NOME: a[1], ORDEM: i + 1, ATIVO: 'SIM' })),
    CAD_CLIENTES: [
      { ID: 'c_hosp', RAZAO_SOCIAL: 'HOSPITAL TESTE LTDA', NOME_FANTASIA: 'Hospital Teste', EMAIL: 'compras@hospital-teste.com.br', STATUS: 'ATIVO' },
      { ID: 'c_cli', RAZAO_SOCIAL: 'CLINICA TESTE', NOME_FANTASIA: 'Clínica Teste', EMAIL: 'contato.clinica@gmail.com', STATUS: 'ATIVO' }
    ]
  };
  let seq = 0;
  const props = {}, cache = {}, emails = [], chamadas = [];
  const sessoes = {
    s_ana: { userId: 'u_ana', usuario: 'ana', nome: 'ANA TECNICA TESTE', perfil: 'TECNICO' },
    s_bia: { userId: 'u_bia', usuario: 'bia', nome: 'BIA COMERCIAL TESTE', perfil: 'COMERCIAL' },
    s_gil: { userId: 'u_gil', usuario: 'gil', nome: 'GIL GESTOR TESTE', perfil: 'GESTOR' },
    s_adm: { userId: 'u_adm', usuario: 'admin', nome: 'Administrador', perfil: 'ADMIN' },
    s_cli: { userId: 'u_cli', usuario: 'cliente', nome: 'CLIENTE TESTE', perfil: 'CLIENTE', clienteId: 'c_hosp' }
  };
  // servidor de e-mail simulado: caixas por dono, como o atendente do servidor ("sgo:<id>")
  const servidor = {
    caixas: { 'sgo:u_ana': { endereco: 'ana@metrolabs.com.br' } },
    recebidas: {
      'sgo:u_ana': [
        { conta: 'p_ana', tipoConta: 'pessoal', enderecoConta: 'ana@metrolabs.com.br', uid: 1, messageId: '<m1@h>', remetente: 'compras@hospital-teste.com.br', remetenteNome: 'Compras', assunto: 'Orçamento urgente', recebidoEm: '2026-10-19T09:00:00-03:00', lida: false },
        { conta: 'p_ana', tipoConta: 'pessoal', enderecoConta: 'ana@metrolabs.com.br', uid: 2, messageId: '<m2@h>', remetente: 'engenharia@hospital-teste.com.br', remetenteNome: 'Engenharia', assunto: 'Laudo', recebidoEm: '2026-10-15T10:00:00-03:00', lida: true },
        { conta: 'p_ana', tipoConta: 'pessoal', enderecoConta: 'ana@metrolabs.com.br', uid: 3, messageId: '<m3@x>', remetente: 'promo@loja-teste.com.br', remetenteNome: 'Loja', assunto: 'Oferta', recebidoEm: '2026-10-16T10:00:00-03:00', lida: false },
        { conta: 'p_ana', tipoConta: 'pessoal', enderecoConta: 'ana@metrolabs.com.br', uid: 4, messageId: '<m4@g>', remetente: 'outro.paciente@gmail.com', remetenteNome: 'Outro', assunto: 'Gmail qualquer', recebidoEm: '2026-10-16T10:00:00-03:00', lida: false },
        { conta: 'p_ana', tipoConta: 'pessoal', enderecoConta: 'ana@metrolabs.com.br', uid: 5, messageId: '<m5@h>', remetente: 'compras@hospital-teste.com.br', remetenteNome: 'Compras', assunto: 'Recente', recebidoEm: '2026-10-19T15:30:00-03:00', lida: false }
      ]
    },
    equipe: [
      { conta: 'p_ana', tipoConta: 'pessoal', usuarioId: 'u_ana', enderecoConta: 'ana@metrolabs.com.br', remetente: 'engenharia@hospital-teste.com.br', recebidoEm: '2026-10-15T10:00:00-03:00', lida: true, acesso: null },
      { conta: 'p_ana', tipoConta: 'pessoal', usuarioId: 'u_ana', enderecoConta: 'ana@metrolabs.com.br', remetente: 'compras@hospital-teste.com.br', recebidoEm: '2026-10-19T09:00:00-03:00', lida: false, acesso: null },
      { conta: 'c_com', tipoConta: 'compartilhada', usuarioId: '', enderecoConta: 'comercial@metrolabs.com.br', remetente: 'contato.clinica@gmail.com', recebidoEm: '2026-10-14T10:00:00-03:00', lida: false, acesso: { areas: ['COMERCIAL'], pessoas: [] } }
    ],
    enviados: []
  };
  const SGO_EMAIL = {
    chamar(acao, usuario, dados) {
      chamadas.push({ acao, usuario: JSON.parse(JSON.stringify(usuario)), dados: JSON.parse(JSON.stringify(dados || {})) });
      const dono = 'sgo:' + usuario.id, cx = servidor.caixas[dono];
      switch (acao) {
        case 'situacao': return { conectada: !!cx, pessoal: cx ? { id: 'p_' + usuario.id, endereco: cx.endereco } : null, compartilhadas: [], servidor: { imap: 'mail.metrolabs.com.br:993', smtp: 'mail.metrolabs.com.br:465', dominios: ['metrolabs.com.br'] }, limites: {} };
        case 'conectar': if (dados.senha !== 'senha-certa') throw new Error('O servidor de e-mail recusou a senha.'); servidor.caixas[dono] = { endereco: dados.endereco.toLowerCase() }; return { ok: true, pessoal: { id: 'p_' + usuario.id, endereco: dados.endereco.toLowerCase() } };
        case 'desconectar': delete servidor.caixas[dono]; return { ok: true };
        case 'temCaixa': return { conectada: !!cx, endereco: cx ? cx.endereco : '' };
        case 'listar': return { itens: [{ uid: 1, deEndereco: 'compras@hospital-teste.com.br', assunto: 'Orçamento' }, { uid: 2, deEndereco: 'diretoria@hospital-teste.com.br', assunto: 'Outro' }, { uid: 3, deEndereco: 'x@y.com.br', assunto: 'Sem cliente' }], total: 3 };
        case 'ler': return { uid: dados.uid, pasta: dados.pasta, messageId: '<m1@h>', deEndereco: 'compras@hospital-teste.com.br', assunto: 'Orçamento', data: '2026-10-19T09:00:00-03:00', texto: 'Texto do e-mail de teste', enderecoConta: 'ana@metrolabs.com.br' };
        case 'enviar': servidor.enviados.push({ dono, dados }); return { ok: true, messageId: '<novo@metrolabs.com.br>', salvoEmEnviados: true, de: cx ? cx.endereco : '?', destinatarios: 1 };
        case 'registrarEnvioSistema': servidor.enviados.push({ dono, sistema: true, dados }); return { ok: true };
        case 'recebidas': return servidor.recebidas[dono] || [];
        case 'recebidasEquipe': return servidor.equipe;
        case 'resumo': return { total: 2, totalCompartilhadas: 0, contas: [{ id: 'p_ana', tipo: 'pessoal' }], novas: [{ conta: 'p_ana', uid: 5, de: 'Compras', deEndereco: 'compras@hospital-teste.com.br', assunto: 'Recente' }] };
        case 'compartilhadasAdmin': return [];
        case 'compartilhadaSalvar': return { ok: true, id: 'c_novo' };
        default: return { ok: true };
      }
    }
  };
  const blobs = [];
  const utilities = criarUtilities({
    base64Decode: (s) => Array.from(Buffer.from(String(s), 'base64')),
    newBlob: (bytes, tipo, nome) => { const b = { bytes, getBytes: () => bytes, getContentType: () => tipo, getName: () => nome, setName(n) { nome = n; return b; } }; blobs.push(b); return b; }
  });
  const ctx = vm.createContext({
    console, Date: DataFalsa, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt, encodeURIComponent,
    Utilities: utilities, Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true }) },
    MailApp: { sendEmail: (m) => emails.push(m), getRemainingDailyQuota: () => 100 },
    DriveApp: { getFileById: (id) => ({ getBlob: () => { const b = { id, getBytes: () => [1, 2], getContentType: () => 'application/pdf', getName: () => 'arquivo-' + id + '.pdf', setName() { return b; } }; return b; } }) },
    CertCal_garantirTabela_: (t) => { tabelas[t] = tabelas[t] || []; }, CertCal_garantirColuna_() {},
    SGO_DATA: {
      getDB: () => ({ getSheetByName: (n) => (tabelas[n] ? {} : null) }),
      getAll: (t) => { if (!tabelas[t]) throw new Error('Aba não encontrada: ' + t); return tabelas[t].map((r) => Object.assign({}, r)); },
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq), CRIADO_EM: new DataFalsa().toISOString() }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
      log() {}
    },
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', CAD_CLIENTES: 'CAD_CLIENTES', CAD_UNIDADES: 'CAD_UNIDADES' } },
    exigirSessao: (sid) => { if (!sessoes[sid]) throw new Error('Sessão inválida'); return sessoes[sid]; },
    isAdminPerfilAuth_: (p) => ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(String(p).toUpperCase()),
    Chaves_ehDonoUsuario_: () => false
  });
  if (o.comServidor !== false) ctx.SGO_EMAIL = SGO_EMAIL;
  for (const f of ['SGO_Utilis.js', 'SGO_Expediente.js', 'SGO_Areas.js', 'SGO_Alertas_Central.js', 'SGO_Gestao_Decisoes.js', 'SGO_Email.js', 'SGO_Ajuda.js', 'SGO_Ajuda_Email.js']) {
    vm.runInContext(ler(f), ctx, { filename: f });
  }
  return { ctx, tabelas, props, emails, chamadas, servidor, blobs, relogio };
}

test('o usuário da caixa vem sempre da sessão: um pedido com outro usuário não troca o dono; cliente não usa', () => {
  const amb = ambiente();
  const r = amb.ctx.Email_apiListar('s_bia', { conta: 'p_ana', pasta: 'INBOX', usuarioId: 'u_ana' });
  assert.equal(r.ok, true, r.message);
  const ch = amb.chamadas.at(-1);
  assert.equal(ch.usuario.id, 'u_bia');
  assert.equal(ch.usuario.area, 'COMERCIAL');
  assert.equal(ch.usuario.admin, false);
  assert.equal(ch.dados.usuarioId, undefined);
  const c = amb.ctx.Email_apiSituacao('s_cli');
  assert.equal(c.ok, false);
  assert.match(c.message, /equipe interna/);
  assert.equal(amb.ctx.Email_apiSituacao('s_adm').ok, true);
  assert.equal(amb.chamadas.at(-1).usuario.admin, true);
});

test('conectar: a senha só vai para o servidor; a resposta e o registro nunca a trazem; senha errada explica', () => {
  const amb = ambiente();
  const errada = amb.ctx.Email_apiConectar('s_bia', { endereco: 'bia@metrolabs.com.br', senha: 'outra' });
  assert.equal(errada.ok, false);
  assert.match(errada.message, /recusou a senha/);
  const r = amb.ctx.Email_apiConectar('s_bia', { endereco: 'Bia@Metrolabs.com.br', senha: 'senha-certa' });
  assert.equal(r.ok, true, r.message);
  assert.ok(!JSON.stringify(r).includes('senha-certa'));
  assert.ok(!JSON.stringify(amb.props).includes('senha-certa'));
  assert.ok(!JSON.stringify(amb.tabelas).includes('senha-certa'));
  assert.equal(amb.ctx.Email_apiDesconectar('s_bia').ok, true);
  assert.equal(amb.servidor.caixas['sgo:u_bia'], undefined);
});

test('sem o servidor próprio (Google) a tela explica onde funciona, sem quebrar', () => {
  const amb = ambiente({ comServidor: false });
  const r = amb.ctx.Email_apiSituacao('s_ana');
  assert.equal(r.ok, true);
  assert.equal(r.disponivel, false);
  assert.match(r.motivo, /sgo\.metrolabs\.com\.br/);
  assert.match(amb.ctx.Email_apiListar('s_ana', {}).message, /servidor próprio/);
  assert.deepEqual(JSON.parse(JSON.stringify(amb.ctx.Email_apiResumo('s_ana', ''))), { ok: true, disponivel: false });
});

test('cliente reconhecido pelo endereço e pelo domínio do cadastro (nunca por provedor público); filtro "De cliente"', () => {
  const amb = ambiente();
  const c = amb.ctx;
  assert.equal(c.Email_clienteDe_('COMPRAS@hospital-teste.com.br').id, 'c_hosp');
  assert.equal(c.Email_clienteDe_('diretoria@hospital-teste.com.br').por, 'dominio');
  assert.equal(c.Email_clienteDe_('contato.clinica@gmail.com').id, 'c_cli');
  assert.equal(c.Email_clienteDe_('outro.paciente@gmail.com'), null);
  const l = c.Email_apiListar('s_ana', { deCliente: true });
  assert.equal(l.ok, true, l.message);
  assert.deepEqual(l.itens.map((i) => i.cliente ? i.cliente.nome : ''), ['Hospital Teste', 'Hospital Teste', '']);
  const f = amb.chamadas.at(-1).dados.remetentes;
  assert.ok(f.enderecos.includes('compras@hospital-teste.com.br'));
  assert.ok(f.dominios.includes('hospital-teste.com.br'));
  assert.ok(!f.dominios.includes('gmail.com'));
});

test('horas úteis: só dentro do expediente, sem fim de semana', () => {
  const c = ambiente().ctx;
  assert.equal(c.Email_horasUteis_('2026-10-19T09:00:00-03:00', new Date(em('2026-10-19T16:00:00-03:00'))), 7);
  // sexta 17:00 -> segunda 09:00 = 0,5 h + 1 h
  assert.equal(c.Email_horasUteis_('2026-10-16T17:00:00-03:00', new Date(em('2026-10-19T09:00:00-03:00'))), 1.5);
  assert.equal(c.Email_horasUteis_('2026-10-18T10:00:00-03:00', new Date(em('2026-10-18T15:00:00-03:00'))), 0);
});

test('pendências da própria pessoa: e-mail de cliente não lido e lido sem resposta; propaganda e recente ficam de fora; ninguém mais vê', () => {
  const amb = ambiente();
  const itens = [];
  amb.ctx.Email_pendencias_((it) => itens.push(it), { userId: 'u_ana', nome: 'ANA TECNICA TESTE', perfil: 'TECNICO', gestao: false });
  const ids = itens.map((i) => i.id).sort();
  assert.deepEqual(ids, ['EMAIL:p_ana:1', 'EMAIL:p_ana:2']);
  const naoLido = itens.find((i) => i.id === 'EMAIL:p_ana:1'), semResp = itens.find((i) => i.id === 'EMAIL:p_ana:2');
  assert.equal(naoLido.tipo, 'email_cliente_nao_lido');
  assert.equal(semResp.tipo, 'email_cliente_sem_resposta');
  assert.equal(semResp.gravidade, 'CRITICO');   // mais de 2 dias úteis
  assert.equal(naoLido.publico, 'PESSOA');
  assert.deepEqual([...naoLido.paraUsuarios], ['u_ana']);
  assert.match(naoLido.titulo, /Hospital Teste: Orçamento urgente/);
  // outra pessoa (mesmo gestor) não enxerga o item pessoal
  assert.equal(amb.ctx.Pend_podeVer_(naoLido, { userId: 'u_gil', perfil: 'GESTOR', gestao: true }), false);
  assert.equal(amb.ctx.Pend_podeVer_(naoLido, { userId: 'u_ana', perfil: 'TECNICO', gestao: false }), true);
  // a fonte está registrada na central
  assert.ok(amb.ctx.PEND_FONTES.some((f) => f.nome === 'e-mail'));
});

test('gestão: e-mail de cliente parado além do prazo vira item da gestão sem assunto nem texto, roteado pela área da pessoa e na escada', () => {
  const amb = ambiente();
  const itens = [];
  amb.ctx.Email_pendencias_((it) => itens.push(it), { userId: '', perfil: 'ADMIN', gestao: true, interno: true });
  const daAna = itens.find((i) => i.id === 'EMAILGES:U:u_ana'), comercial = itens.find((i) => i.id === 'EMAILGES:C:c_com');
  assert.ok(daAna && comercial);
  assert.equal(daAna.tipo, 'email_cliente_parado');
  assert.equal(daAna.publico, 'GESTAO');
  assert.equal(daAna.responsavelId, 'u_ana');
  assert.match(daAna.titulo, /ANA TECNICA TESTE: 1 e-mail de cliente sem resposta/);   // o de hoje 09:00 ainda está no prazo
  assert.ok(!/Orçamento|Laudo/.test(JSON.stringify(itens)), 'gestão não recebe assunto');
  assert.equal(comercial.extra.area, 'COMERCIAL');
  assert.ok(amb.ctx.GES_TIPOS.email_cliente_parado, 'entra na Caixa de decisões e na escada');
  assert.equal(amb.ctx.Ges_entra_(daAna), true);
  assert.equal(amb.ctx.GES_AREA_MODULO_PADRAO.email, 'COMERCIAL');
});

test('prazos configuráveis só pelo Administrador e em ordem crescente', () => {
  const amb = ambiente();
  assert.match(amb.ctx.Email_apiConfigSalvar('s_gil', { horasNaoLido: 2, horasSemResposta: 4, horasGestao: 8 }).message, /Só o Administrador/);
  assert.match(amb.ctx.Email_apiConfigSalvar('s_adm', { horasNaoLido: 9, horasSemResposta: 4, horasGestao: 8 }).message, /precisam crescer/);
  assert.equal(amb.ctx.Email_apiConfigSalvar('s_adm', { horasNaoLido: 2, horasSemResposta: 4, horasGestao: 8 }).ok, true);
  assert.equal(amb.ctx.Email_config_().horasGestao, 8);
});

test('caixas compartilhadas: só o Administrador cadastra; gestor e técnico recebem a explicação', () => {
  const amb = ambiente();
  assert.match(amb.ctx.Email_apiCompartilhadas('s_gil').message, /Só o Administrador/);
  assert.match(amb.ctx.Email_apiCompartilhadaSalvar('s_ana', { endereco: 'comercial@metrolabs.com.br' }).message, /Só o Administrador/);
  const r = amb.ctx.Email_apiCompartilhadas('s_adm');
  assert.equal(r.ok, true, r.message);
  assert.ok(r.pessoas.some((p) => p.chave === 'sgo:u_bia'));
  assert.ok(!r.pessoas.some((p) => p.chave === 'sgo:u_cli' || p.chave === 'sgo:u_sai'));
  assert.equal(amb.ctx.Email_apiCompartilhadaSalvar('s_adm', { endereco: 'comercial@metrolabs.com.br', senha: 's', areas: ['COMERCIAL'] }).ok, true);
  assert.equal(amb.chamadas.at(-1).usuario.admin, true);
});

test('pela tela não dá para anexar arquivo do sistema por id (só do computador)', () => {
  const amb = ambiente();
  const r = amb.ctx.Email_apiEnviar('s_ana', { para: 'compras@hospital-teste.com.br', assunto: 'Teste', html: '<p>oi</p>', anexos: [{ arquivoId: 'ARQ_INTERNO', nome: 'x.pdf' }] });
  assert.equal(r.ok, true, r.message);
  const a = amb.servidor.enviados.at(-1).dados.anexos[0];
  assert.equal(a.arquivoId, undefined);
});

test('registrar no cliente: guarda resumo e vínculo no histórico do cliente', () => {
  const amb = ambiente();
  const r = amb.ctx.Email_apiRegistrarNoCliente('s_ana', { conta: 'p_ana', pasta: 'INBOX', uid: 1, resumo: 'Cliente pediu orçamento de calibração.' });
  assert.equal(r.ok, true, r.message);
  const reg = amb.tabelas.EML_CLIENTE_REGISTROS[0];
  assert.equal(reg.CLIENTE_ID, 'c_hosp');
  assert.equal(reg.USUARIO_ID, 'u_ana');
  assert.equal(reg.RESUMO, 'Cliente pediu orçamento de calibração.');
  const h = amb.ctx.Email_apiRegistrosDoCliente('s_bia', 'c_hosp');
  assert.equal(h.registros.length, 1);
});

test('enviar como usuário COM caixa pessoal: sai da caixa dele, com anexos por id de arquivo e Blob', () => {
  const amb = ambiente();
  const blob = { getBytes: () => [65, 66], getContentType: () => 'text/plain', getName: () => 'nota.txt' };
  const r = amb.ctx.SGO_Email_enviarComoUsuario_({ usuarioId: 'u_ana', para: 'compras@hospital-teste.com.br', assunto: 'Certificado', html: '<p>Segue.</p>',
    anexos: [{ arquivoId: 'ARQ1' }, { conteudo: Buffer.from('xyz').toString('base64'), nome: 'a.txt', tipo: 'text/plain' }, blob] });
  assert.equal(r.ok, true, r.message);
  assert.equal(r.via, 'pessoal');
  assert.equal(r.de, 'ana@metrolabs.com.br');
  const env = amb.servidor.enviados.at(-1);
  assert.equal(env.dono, 'sgo:u_ana');
  assert.deepEqual(env.dados.anexos.map((a) => a.arquivoId || a.nome), ['ARQ1', 'a.txt', 'nota.txt']);
  assert.equal(env.dados.anexos[2].base64, Buffer.from('AB').toString('base64'));
  assert.equal(amb.emails.length, 0);
});

test('enviar como usuário SEM caixa pessoal: caixa do sistema com responder para o e-mail dele, conta no limite; inativo e sem destinatário recusam', () => {
  const amb = ambiente();
  const r = amb.ctx.SGO_Email_enviarComoUsuario_({ usuarioId: 'u_bia', para: 'compras@hospital-teste.com.br', cc: 'eng@hospital-teste.com.br', assunto: 'Proposta', texto: 'Segue a proposta.', anexos: [{ arquivoId: 'ARQ9', nome: 'proposta.pdf' }] });
  assert.equal(r.ok, true, r.message);
  assert.equal(r.via, 'sistema');
  assert.equal(r.responderPara, 'bia@metrolabs.com.br');
  const m = amb.emails.at(-1);
  assert.equal(m.replyTo, 'bia@metrolabs.com.br');
  assert.equal(m.name, 'BIA COMERCIAL TESTE (Metrolabs)');
  assert.equal(m.attachments.length, 1);
  assert.match(m.htmlBody, /Segue a proposta/);
  const lim = amb.servidor.enviados.at(-1);
  assert.equal(lim.sistema, true);
  assert.equal(lim.dados.destinatarios, 2);
  assert.match(amb.ctx.SGO_Email_enviarComoUsuario_({ usuarioId: 'u_sai', para: 'x@y.com.br', assunto: 'a' }).message, /inativo/);
  assert.match(amb.ctx.SGO_Email_enviarComoUsuario_({ usuarioId: 'u_bia', assunto: 'a' }).message, /destinatário/);
  // sem o servidor próprio também funciona (Google): só a caixa do sistema
  const g = ambiente({ comServidor: false });
  const rg = g.ctx.SGO_Email_enviarComoUsuario_({ usuarioId: 'u_ana', para: 'x@y.com.br', assunto: 'a', html: '<p>b</p>' });
  assert.equal(rg.via, 'sistema');
  assert.equal(g.emails.length, 1);
});

test('casca da tela: menu, include, rota, celular, ajuda registrada; textos sem emoji', () => {
  const index = ler('Index.html'), core = ler('JS_Core.html'), tela = ler('JS_Email.html'), ajudaReg = ler('SGO_Ajuda.js');
  assert.match(index, /include\('JS_Email'\)/);
  assert.match(index, /id="menu-btn-email"[^>]*onclick="abrir\('email'\)"/);
  assert.match(index, /id="menuBadgeEmail"/);
  assert.match(core, /mod === "email" && typeof Email_render_ === "function"/);
  assert.match(core, /Email_iniciar_\(\)/);
  assert.match(core, /Email_parar_\(\)/);
  assert.match(core, /legenda: "E-mail", mod: "email"/);
  assert.match(ajudaReg, /SGO_ajudaTelas_Email_/);
  const amb = ambiente();
  const aj = amb.ctx.SGO_ajudaTelas_Email_().email;
  assert.ok(aj.passos.length >= 5 && aj.problemas.length >= 4);
  // o corpo do e-mail vai num iframe sem script, e a política de conteúdo não libera nada de fora antes do clique
  assert.match(tela, /sandbox="allow-same-origin"/);
  assert.ok(!/sandbox="[^"]*allow-scripts/.test(tela));
  assert.match(tela, /default-src 'none'/);
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  for (const t of [tela, ler('SGO_Email.js'), ler('SGO_Ajuda_Email.js')]) assert.ok(!emoji.test(t), 'sem emoji');
});
