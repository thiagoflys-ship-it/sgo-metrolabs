// E-mail "igual ao Outlook" (17/11/2026, pedido da equipe repassado pelo dono): contatos salvos (por pessoa, privados) e
// catálogo da empresa (sem nada do Financeiro), busca ao digitar o destinatário com pílulas, × de excluir na linha sem
// abrir, excluir abre a próxima (a de baixo; se era a última, a de cima) mantendo a rolagem, Desfazer, seleção em lote,
// filtro Sinalizadas, rascunho automático e a página completa em 1366, 390 e 320 px sem rolagem lateral.
// Uso: DEST=<legado> node --require <fontes.cjs> --test tests/email-outlook-20261117.test.cjs   (só dados de teste)
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(PASTA, f), 'utf8');
const copia = (x) => JSON.parse(JSON.stringify(x));
const ok = (r) => { assert.equal(r.ok, true, r && r.message); return r; };

// ---------------- servidor de e-mail simulado (a global SGO_EMAIL do servidor próprio), com estado ----------------
function servidorEmail(o) {
  const op = o || {};
  const st = { pastas: { INBOX: [], Arquivo: [], Lixeira: [], Rascunhos: [], Enviados: [] }, chamadas: [], enviados: [], seq: 500 };
  const base = Date.UTC(2026, 10, 17, 13, 0, 0);
  for (let i = 1; i <= (op.qtd || 30); i++) {
    st.pastas.INBOX.push({ uid: i, messageId: '<m' + i + '@teste>', de: 'Remetente ' + i, deEndereco: 'r' + i + '@cliente-teste.com.br', para: 'ana@metrolabs.com.br',
      assunto: 'Assunto ' + String(i).padStart(2, '0'), data: new Date(base - (40 - i) * 3600000).toISOString(), lida: i % 3 !== 0, sinalizada: i === 7, temAnexo: i % 5 === 0 });
  }
  const pasta = (p) => st.pastas[p || 'INBOX'] || (st.pastas[p] = []);
  const tirar = (p, uids) => { const l = pasta(p), fora = l.filter((m) => uids.includes(m.uid)); st.pastas[p || 'INBOX'] = l.filter((m) => !uids.includes(m.uid)); return fora; };
  const chamar = (acao, usuario, dados) => {
    const d = dados || {};
    st.chamadas.push({ acao, usuario: copia(usuario), dados: copia(d) });
    const temCaixa = usuario.id === 'u_ana';
    switch (acao) {
      case 'situacao': return { conectada: temCaixa, pessoal: temCaixa ? { id: 'p_ana', tipo: 'pessoal', endereco: 'ana@metrolabs.com.br' } : null,
        compartilhadas: op.compartilhada && temCaixa ? [{ id: 'c_com', tipo: 'compartilhada', endereco: 'comercial@metrolabs.com.br' }] : [],
        servidor: { imap: 'mail.teste:993', smtp: 'mail.teste:465', dominios: ['metrolabs.com.br'] }, limites: {} };
      case 'assinaturas': return { lista: [], padraoNova: '', padraoResposta: '' };
      case 'pastas': return [['INBOX', 'Entrada', 'entrada'], ['Rascunhos', 'Rascunhos', 'rascunhos'], ['Enviados', 'Enviados', 'enviados'], ['Lixeira', 'Lixeira', 'lixeira'], ['Arquivo', 'Arquivo', 'arquivo']]
        .map((p) => ({ caminho: p[0], nome: p[1], especial: p[2], naoLidas: p[0] === 'INBOX' ? pasta('INBOX').filter((m) => !m.lida).length : null }));
      case 'listar': {
        let l = pasta(d.pasta).slice().sort((a, b) => b.uid - a.uid);
        if (d.naoLidas) l = l.filter((m) => !m.lida);
        if (d.sinalizadas && !op.servidorAntigo) l = l.filter((m) => m.sinalizada);
        if (d.busca) l = l.filter((m) => (m.de + m.deEndereco + m.assunto).toLowerCase().includes(String(d.busca).toLowerCase()));
        const pp = d.porPagina || 30, pg = d.pagina || 0;
        const r = { conta: d.conta, pasta: d.pasta, itens: copia(l.slice(pg * pp, pg * pp + pp)), total: l.length, pagina: pg, porPagina: pp, temMais: l.length > (pg + 1) * pp };
        if (!op.servidorAntigo) r.filtros = { sinalizadas: true };
        return r;
      }
      case 'ler': {
        const m = pasta(d.pasta).find((x) => x.uid === Number(d.uid));
        if (!m) throw new Error('Mensagem não encontrada (pode ter sido movida). Atualize a lista.');
        if (d.marcarLida !== false) m.lida = true;
        return Object.assign(copia(m), { pasta: d.pasta, de: m.de + ' <' + m.deEndereco + '>', paraLista: ['ana@metrolabs.com.br'], ccLista: [], html: '<p>Texto da mensagem ' + m.uid + '</p>', texto: 'Texto da mensagem ' + m.uid, anexos: [], tipoConta: 'pessoal', enderecoConta: 'ana@metrolabs.com.br' });
      }
      case 'marcar': pasta(d.pasta).forEach((m) => { if (d.uids.includes(m.uid)) { if (d.lida !== undefined) m.lida = !!d.lida; if (d.sinalizada !== undefined) m.sinalizada = !!d.sinalizada; } }); return { ok: true };
      case 'mover': tirar(d.pasta, d.uids).forEach((m) => pasta(d.destino).push(m)); return { ok: true };
      case 'apagar': { const fora = tirar(d.pasta, d.uids); if (!d.definitivo) fora.forEach((m) => pasta('Lixeira').push(m)); return { ok: true }; }
      case 'enviar': st.enviados.push(copia(d)); return { ok: true, de: d.conta === 'c_com' ? 'comercial@metrolabs.com.br' : 'ana@metrolabs.com.br', destinatarios: String([d.para, d.cc, d.cco].filter(Boolean).join(',')).split(/[,;]/).filter((x) => x.trim()).length, salvoEmEnviados: true, messageId: '<novo@teste>' };
      case 'rascunho': { const uid = ++st.seq; pasta('Rascunhos').push({ uid, assunto: d.assunto, para: d.para, de: 'Ana', deEndereco: 'ana@metrolabs.com.br', data: new Date().toISOString(), lida: true }); if (d.rascunhoUid) tirar('Rascunhos', [Number(d.rascunhoUid)]); return { ok: true, pasta: 'Rascunhos', uid, anexos: [] }; }
      case 'resumo': return { total: pasta('INBOX').filter((m) => !m.lida).length, totalCompartilhadas: 0, contas: temCaixa ? [{ id: 'p_ana', tipo: 'pessoal' }] : [], novas: [], agora: new Date().toISOString() };
      case 'recebidas': case 'recebidasEquipe': return [];
      case 'temCaixa': return { conectada: temCaixa, endereco: temCaixa ? 'ana@metrolabs.com.br' : '' };
      default: return { ok: true };
    }
  };
  return { st, SGO_EMAIL: { chamar } };
}

// ---------------- legado (SGO_Email.js) num contexto isolado ----------------
function ambiente(o) {
  const op = o || {};
  const tabelas = {
    CAD_USUARIOS: [
      { ID: 'u_ana', USUARIO: 'ana', NOME: 'ANA TECNICA TESTE', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'ana@metrolabs.com.br', AREA: 'TECNICA' },
      { ID: 'u_bia', USUARIO: 'bia', NOME: 'BIA COMERCIAL TESTE', PERFIL: 'COMERCIAL', STATUS: 'ATIVO', EMAIL: 'bia@metrolabs.com.br', AREA: 'COMERCIAL' },
      { ID: 'u_joa', USUARIO: 'joaquim', NOME: 'JOAQUIM GESTOR TESTE', PERFIL: 'GESTOR', STATUS: 'ATIVO', EMAIL: 'joaquim@metrolabs.com.br', AREA: 'TECNICA' },
      { ID: 'u_sai', USUARIO: 'saiu', NOME: 'PESSOA INATIVA TESTE', PERFIL: 'TECNICO', STATUS: 'INATIVO', EMAIL: 'saiu@metrolabs.com.br' },
      { ID: 'u_cli', USUARIO: 'cliente', NOME: 'CLIENTE USUARIO TESTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO', EMAIL: 'usuario.cliente@hospital-teste.com.br' },
      { ID: 'u_rep', USUARIO: 'rep', NOME: 'REPRESENTADA USUARIO TESTE', PERFIL: 'REPRESENTADA', STATUS: 'ATIVO', EMAIL: 'usuario@representada-teste.com.br' }
    ],
    CAD_CLIENTES: [
      { ID: 'c_hosp', RAZAO_SOCIAL: 'HOSPITAL TESTE LTDA', NOME_FANTASIA: 'Hospital São Teste', EMAIL: 'compras@hospital-teste.com.br; administrativo@metrolabs.com.br', STATUS: 'ATIVO' },
      { ID: 'c_ina', RAZAO_SOCIAL: 'CLINICA INATIVA TESTE', NOME_FANTASIA: 'Clínica Inativa', EMAIL: 'inativa@clinica-teste.com.br', STATUS: 'INATIVO' }
    ],
    CAD_CONTATOS: [
      { ID: 'ct1', CLIENTE_ID: 'c_hosp', NOME: 'Joana Compras', EMAIL: 'joana@hospital-teste.com.br', STATUS: 'ATIVO' },
      { ID: 'ct2', CLIENTE_ID: 'c_ina', NOME: 'Contato da Inativa', EMAIL: 'contato@clinica-teste.com.br', STATUS: 'ATIVO' }
    ],
    CMP_FORNECEDORES: [{ ID: 'f1', RAZAO_SOCIAL: 'FORNECEDOR TESTE LTDA', NOME_FANTASIA: 'Fornecedor Teste', CONTATO: 'Vendas Fornecedor', EMAIL_PEDIDOS: 'pedidos@fornecedor-teste.com.br', ATIVO: 'SIM' }],
    REP_REPRESENTADAS: [{ ID: 'r1', NOME: 'Representada Teste', CONTATO_NOME: 'Contato Representada', CONTATO_EMAIL: 'contato@representada-teste.com.br' }],
    // dados do Financeiro (sigilo): nunca podem aparecer no catálogo
    FIN_OMIE_CLIENTES: [{ ID: 'o1', NOME: 'Cliente do Omie', EMAIL: 'financeiro.secreto@omie-teste.com.br' }],
    EML_CONTATOS: [
      { ID: 'k1', USUARIO_ID: 'u_ana', NOME: 'João Contato', EMAIL: 'joao.contato@fornecedor-teste.com.br', EMPRESA: 'Fornecedor Teste', ORIGEM: 'MANUAL', FAVORITO: 'NAO', USOS: 3, ULTIMO_USO: '2026-11-16T10:00:00.000Z', STATUS: 'ATIVO' },
      { ID: 'k2', USUARIO_ID: 'u_bia', NOME: 'Segredo da Bia', EMAIL: 'segredo@bia-teste.com.br', ORIGEM: 'MANUAL', FAVORITO: 'SIM', USOS: 0, ULTIMO_USO: '', STATUS: 'ATIVO' }
    ]
  };
  let seq = 0;
  const props = {};
  const sessoes = {
    s_ana: { userId: 'u_ana', usuario: 'ana', nome: 'ANA TECNICA TESTE', perfil: 'TECNICO' },
    s_bia: { userId: 'u_bia', usuario: 'bia', nome: 'BIA COMERCIAL TESTE', perfil: 'COMERCIAL' },
    s_joa: { userId: 'u_joa', usuario: 'joaquim', nome: 'JOAQUIM GESTOR TESTE', perfil: 'GESTOR' },
    s_cli: { userId: 'u_cli', usuario: 'cliente', nome: 'CLIENTE USUARIO TESTE', perfil: 'CLIENTE', clienteId: 'c_hosp' }
  };
  const srv = servidorEmail(op);
  const ctx = vm.createContext({
    console, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt, encodeURIComponent, Date,
    Utilities: criarUtilities(), Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); } }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true }) },
    CertCal_garantirTabela_: (t) => { tabelas[t] = tabelas[t] || []; }, CertCal_garantirColuna_() {},
    SGO_DATA: {
      getAll: (t) => { if (!tabelas[t]) throw new Error('Aba não encontrada: ' + t); return tabelas[t].map((r) => Object.assign({}, r)); },
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq), CRIADO_EM: new Date().toISOString() }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
      update: (t, id, campos) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) throw new Error('não achou ' + id); Object.assign(r, campos); return Object.assign({}, r); },
      log() {}
    },
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS', CAD_CLIENTES: 'CAD_CLIENTES' } },
    exigirSessao: (sid) => { if (!sessoes[sid]) throw new Error('Sessão inválida'); return sessoes[sid]; },
    isAdminPerfilAuth_: (p) => ['ADMIN', 'GESTOR', 'DIRETORIA'].includes(String(p).toUpperCase())
  });
  if (op.compras !== false) {
    ctx.CMP_ABAS = { FORNECEDORES: 'CMP_FORNECEDORES' };
    ctx.Cmp_eu_ = (sid) => ({ veValores: sid === 's_joa' }); // gestor vê fornecedores em Compras; técnico e comercial não
    ctx.REP_ABAS = { REPRESENTADAS: 'REP_REPRESENTADAS' };
    ctx.RepI_podeAdministrar_ = (eu) => eu.perfil === 'GESTOR';
  }
  ctx.SGO_EMAIL = srv.SGO_EMAIL;
  for (const f of ['SGO_Utilis.js', 'SGO_Email.js']) vm.runInContext(ler(f), ctx, { filename: f });
  return { ctx, tabelas, props, srv, sessoes };
}

test('contatos: cada pessoa vê e mexe só nos próprios; ninguém abre o contato de outra pessoa', () => {
  const a = ambiente();
  const ana = ok(a.ctx.Email_apiContatos('s_ana'));
  assert.deepEqual(ana.contatos.map((c) => c.email), ['joao.contato@fornecedor-teste.com.br']);
  assert.ok(!JSON.stringify(ana).includes('segredo@bia-teste.com.br'), 'o contato da Bia não aparece para a Ana');
  const bia = ok(a.ctx.Email_apiContatos('s_bia'));
  assert.deepEqual(bia.contatos.map((c) => c.email), ['segredo@bia-teste.com.br']);
  // a Ana não edita, não exclui e não marca favorito no contato da Bia (o id do pedido não basta)
  assert.match(a.ctx.Email_apiContatoSalvar('s_ana', { id: 'k2', nome: 'x', email: 'x@y.com.br' }).message, /não foi encontrado entre os seus/);
  assert.match(a.ctx.Email_apiContatoExcluir('s_ana', 'k2').message, /não foi encontrado entre os seus/);
  assert.match(a.ctx.Email_apiContatoFavorito('s_ana', { id: 'k2', favorito: false }).message, /não foi encontrado/);
  assert.equal(a.tabelas.EML_CONTATOS.find((r) => r.ID === 'k2').STATUS, 'ATIVO');
  assert.match(a.ctx.Email_apiContatos('s_cli').message, /equipe interna/, 'cliente não usa');
});

test('contatos: criar, validar o e-mail (o quê, por quê, o que fazer), mesmo e-mail atualiza, favorito e excluir', () => {
  const a = ambiente();
  const inval = a.ctx.Email_apiContatoSalvar('s_ana', { nome: 'Sem arroba', email: 'sem-arroba.com.br' });
  assert.equal(inval.ok, false);
  assert.match(inval.message, /não é um endereço válido.*@.*domínio.*salve de novo/);
  const novo = ok(a.ctx.Email_apiContatoSalvar('s_ana', { nome: 'Maria Fornecedora', email: 'Maria <MARIA@Fornecedor-Teste.com.br>', empresa: 'Fornecedor Teste', favorito: true }));
  assert.equal(novo.novo, true);
  assert.equal(novo.contato.email, 'maria@fornecedor-teste.com.br');
  assert.equal(novo.contato.favorito, true);
  assert.equal(a.tabelas.EML_CONTATOS.find((r) => r.ID === novo.contato.id).USUARIO_ID, 'u_ana', 'o dono vem da sessão');
  // salvar o remetente que já é contato não apaga o nome que a pessoa escreveu
  const rem = ok(a.ctx.Email_apiContatoSalvar('s_ana', { nome: 'MARIA (do e-mail)', email: 'maria@fornecedor-teste.com.br', origem: 'REMETENTE' }));
  assert.equal(rem.novo, false);
  assert.equal(rem.contato.id, novo.contato.id);
  assert.equal(rem.contato.nome, 'Maria Fornecedora');
  assert.equal(a.tabelas.EML_CONTATOS.filter((r) => r.EMAIL === 'maria@fornecedor-teste.com.br').length, 1, 'não duplica');
  // editar para um e-mail que já é de outro contato meu: recusa com o que fazer
  assert.match(a.ctx.Email_apiContatoSalvar('s_ana', { id: novo.contato.id, nome: 'Maria', email: 'joao.contato@fornecedor-teste.com.br' }).message, /já tem outro contato.*Edite aquele contato/);
  ok(a.ctx.Email_apiContatoFavorito('s_ana', { id: novo.contato.id, favorito: false }));
  assert.equal(a.tabelas.EML_CONTATOS.find((r) => r.ID === novo.contato.id).FAVORITO, 'NAO');
  ok(a.ctx.Email_apiContatoExcluir('s_ana', novo.contato.id));
  assert.ok(!ok(a.ctx.Email_apiContatos('s_ana')).contatos.some((c) => c.email === 'maria@fornecedor-teste.com.br'), 'excluído some da lista');
  assert.equal(a.tabelas.EML_CONTATOS.find((r) => r.ID === novo.contato.id).STATUS, 'EXCLUIDO', 'exclusão lógica');
  // cadastrar de novo o mesmo e-mail traz o contato de volta (sem duplicar a linha)
  const volta = ok(a.ctx.Email_apiContatoSalvar('s_ana', { nome: 'Maria de novo', email: 'maria@fornecedor-teste.com.br' }));
  assert.equal(volta.contato.id, novo.contato.id);
  assert.equal(volta.contato.nome, 'Maria de novo');
});

test('catálogo da empresa: colegas, clientes e contatos; fornecedores e representadas só para quem já vê; nada do Financeiro', () => {
  const a = ambiente();
  const emails = (sid) => ok(a.ctx.Email_apiContatos(sid)).empresa.map((c) => c.email);
  const ana = emails('s_ana');
  assert.ok(ana.includes('bia@metrolabs.com.br') && ana.includes('joaquim@metrolabs.com.br'), 'colegas ativos');
  assert.ok(!ana.includes('ana@metrolabs.com.br'), 'não sugere a própria pessoa');
  assert.ok(!ana.includes('saiu@metrolabs.com.br'), 'colega inativo fica de fora');
  assert.ok(!ana.includes('usuario.cliente@hospital-teste.com.br') && !ana.includes('usuario@representada-teste.com.br'), 'usuário cliente ou representada não é colega');
  assert.ok(ana.includes('compras@hospital-teste.com.br') && ana.includes('joana@hospital-teste.com.br'), 'cliente e contato do cliente');
  assert.ok(!ana.includes('administrativo@metrolabs.com.br'), 'e-mail da empresa no cadastro do cliente não vira cliente');
  assert.ok(!ana.includes('inativa@clinica-teste.com.br') && !ana.includes('contato@clinica-teste.com.br'), 'cliente inativo e o contato dele ficam de fora');
  assert.ok(!ana.includes('pedidos@fornecedor-teste.com.br'), 'técnico não vê fornecedores de Compras');
  assert.ok(!ana.includes('contato@representada-teste.com.br'), 'técnico não vê representadas');
  const joa = emails('s_joa');
  assert.ok(joa.includes('pedidos@fornecedor-teste.com.br') && joa.includes('contato@representada-teste.com.br'), 'gestor já vê essas telas');
  for (const l of [ana, joa, emails('s_bia')]) assert.ok(!l.includes('financeiro.secreto@omie-teste.com.br'), 'sigilo do Financeiro');
  const tipos = ok(a.ctx.Email_apiContatos('s_joa')).empresa.reduce((m, c) => (m[c.email] = c.tipo, m), {});
  assert.equal(tipos['bia@metrolabs.com.br'], 'colega');
  assert.equal(tipos['compras@hospital-teste.com.br'], 'cliente');
  assert.equal(tipos['joana@hospital-teste.com.br'], 'contato');
  assert.equal(tipos['pedidos@fornecedor-teste.com.br'], 'fornecedor');
  // sem os módulos de Compras/Representação carregados, o catálogo continua funcionando
  assert.ok(ok(ambiente({ compras: false }).ctx.Email_apiContatos('s_joa')).empresa.length >= 3);
});

test('coleta ao enviar: endereço novo vira contato, o usado ganha uso e data; desligada não coleta; caixa compartilhada não coleta; excluído não volta', () => {
  const a = ambiente({ compartilhada: true });
  const r = ok(a.ctx.Email_apiEnviar('s_ana', { conta: 'p_ana', para: 'Novo Cliente <novo@cliente-teste.com.br>, joao.contato@fornecedor-teste.com.br', cc: 'ana@metrolabs.com.br', assunto: 'Teste', html: '<p>oi</p>' }));
  assert.equal(r.contatosNovos, 1);
  const l = a.tabelas.EML_CONTATOS.filter((x) => x.USUARIO_ID === 'u_ana');
  const novo = l.find((x) => x.EMAIL === 'novo@cliente-teste.com.br');
  assert.equal(novo.ORIGEM, 'AUTOMATICO');
  assert.equal(novo.NOME, 'Novo Cliente');
  assert.equal(Number(novo.USOS), 1);
  assert.equal(Number(l.find((x) => x.ID === 'k1').USOS), 4, 'contato já salvo conta mais um uso');
  assert.ok(l.find((x) => x.ID === 'k1').ULTIMO_USO > '2026-11-16T10:00:00.000Z');
  assert.ok(!l.some((x) => x.EMAIL === 'ana@metrolabs.com.br'), 'o próprio endereço não vira contato');
  // pela caixa compartilhada: não coleta nem conta uso
  ok(a.ctx.Email_apiEnviar('s_ana', { conta: 'c_com', para: 'outro@cliente-teste.com.br', assunto: 'Pela compartilhada', html: 'x' }));
  assert.ok(!a.tabelas.EML_CONTATOS.some((x) => x.EMAIL === 'outro@cliente-teste.com.br'));
  // desligada: não guarda endereço novo, mas o contato já salvo continua ganhando uso (recentes primeiro)
  ok(a.ctx.Email_apiContatosPrefs('s_ana', { coletar: false }));
  assert.equal(ok(a.ctx.Email_apiContatos('s_ana')).prefs.coletar, false);
  assert.equal(ok(a.ctx.Email_apiContatos('s_bia')).prefs.coletar, true, 'preferência é de cada pessoa');
  ok(a.ctx.Email_apiEnviar('s_ana', { conta: 'p_ana', para: 'terceiro@cliente-teste.com.br; joao.contato@fornecedor-teste.com.br', assunto: 'x', html: 'x' }));
  assert.ok(!a.tabelas.EML_CONTATOS.some((x) => x.EMAIL === 'terceiro@cliente-teste.com.br'));
  assert.equal(Number(a.tabelas.EML_CONTATOS.find((x) => x.ID === 'k1').USOS), 5);
  // excluído pela pessoa não volta sozinho
  ok(a.ctx.Email_apiContatosPrefs('s_ana', { coletar: true }));
  ok(a.ctx.Email_apiContatoExcluir('s_ana', novo.ID));
  ok(a.ctx.Email_apiEnviar('s_ana', { conta: 'p_ana', para: 'novo@cliente-teste.com.br', assunto: 'x', html: 'x' }));
  assert.equal(a.tabelas.EML_CONTATOS.find((x) => x.ID === novo.ID).STATUS, 'EXCLUIDO');
  assert.equal(a.tabelas.EML_CONTATOS.filter((x) => x.EMAIL === 'novo@cliente-teste.com.br').length, 1);
  // a ordem dos meus contatos: recentes primeiro
  assert.equal(ok(a.ctx.Email_apiContatos('s_ana')).contatos[0].email, 'joao.contato@fornecedor-teste.com.br');
});

test('filtro Sinalizadas: vai ao servidor; servidor novo filtra a caixa toda; servidor antigo filtra a página e avisa', () => {
  const novo = ambiente();
  const r = ok(novo.ctx.Email_apiListar('s_ana', { conta: 'p_ana', pasta: 'INBOX', sinalizadas: true }));
  assert.equal(novo.srv.st.chamadas.at(-1).dados.sinalizadas, true);
  assert.deepEqual(r.itens.map((i) => i.uid), [7]);
  assert.equal(r.sinalizadasParcial, undefined);
  const antigo = ambiente({ servidorAntigo: true });
  const r2 = ok(antigo.ctx.Email_apiListar('s_ana', { conta: 'p_ana', pasta: 'INBOX', sinalizadas: true }));
  assert.deepEqual(r2.itens.map((i) => i.uid), [7]);
  assert.equal(r2.sinalizadasParcial, true);
  const sem = ok(antigo.ctx.Email_apiListar('s_ana', { conta: 'p_ana', pasta: 'INBOX' }));
  assert.equal(sem.itens.length, 30);
  assert.equal(antigo.srv.st.chamadas.at(-1).dados.sinalizadas, undefined, 'sem o filtro, nada muda no pedido');
});

test('servidor (cópia de produção + patch): filtro Sinalizadas na busca IMAP, na chave do cache e no retorno, em src e dist', () => {
  const raiz = path.join(__dirname, '../output/email-melhorias-20261117');
  const pares = [['servidor/src/servicos/emailPessoal.ts', 'servidor-producao/src/servicos/emailPessoal.ts'], ['servidor/dist/servicos/emailPessoal.js', 'servidor-producao/dist/servicos/emailPessoal.js']];
  for (const [novo, prod] of pares) {
    const n = fs.readFileSync(path.join(raiz, novo), 'utf8'), p = fs.readFileSync(path.join(raiz, prod), 'utf8');
    assert.match(n, /if \(d\.sinalizadas\)\s*\n?\s*crit\.flagged = true;/, novo);
    assert.match(n, /d\.comAnexo, !!d\.sinalizadas, filtraRem/, 'o filtro entra na chave do cache: ' + novo);
    assert.match(n, /temMais, filtros: \{ sinalizadas: true \} \}/, novo);
    assert.ok(!/sinalizadas/.test(p.slice(p.indexOf('async listar'), p.indexOf('async ler'))), 'produção ainda não tem o filtro: ' + prod);
    // o resto do arquivo é idêntico à produção: só entram linhas do filtro e só saem as três linhas trocadas
    const ln = n.split('\n'), lp = p.split('\n'), so = (x, y) => x.filter((l) => !y.includes(l));
    const novas = so(ln, lp), tiradas = so(lp, ln);
    assert.ok(novas.length >= 3 && novas.every((l) => /sinalizadas|Sinalizadas|crit\.flagged/.test(l)), novo + ': ' + novas.join(' | '));
    assert.ok(tiradas.length <= 3 && tiradas.every((l) => /async listar\(q|const chave = |return \{ conta: c\.id, pasta, itens/.test(l)), novo + ': ' + tiradas.join(' | '));
  }
  require('node:child_process').execFileSync(process.execPath, ['--check', path.join(raiz, 'servidor/dist/servicos/emailPessoal.js')]);
});

// ---------------- funções da tela (JS_Email.html) sem navegador ----------------
function telaVm() {
  const html = ler('JS_Email.html');
  const valores = {};
  const doc = { getElementById: (id) => (id in valores ? { value: valores[id] } : null), querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, body: { appendChild() {} } };
  const ctx = vm.createContext({ console, window: {}, document: doc, setTimeout, clearTimeout, USER_CONTEXT: { perfil: 'TECNICO' }, google: { script: { run: {} } },
    escapeHtml_: (v) => String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;') });
  vm.runInContext(html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>')), ctx, { filename: 'JS_Email.html' });
  return { ctx, valores };
}

test('sugestão ao digitar: nome, e-mail ou empresa, sem acento e sem maiúscula; recentes primeiro; sem repetir os já escolhidos', () => {
  const { ctx } = telaVm();
  const fontes = {
    contatos: [
      { nome: 'João Contato', email: 'joao.contato@fornecedor-teste.com.br', empresa: 'Fornecedor Teste', ultimoUso: '2026-11-16T10:00:00Z' },
      { nome: 'Joana Antiga', email: 'joana.antiga@x-teste.com.br', ultimoUso: '2026-10-01T10:00:00Z' },
      { nome: 'Jonas Favorito', email: 'jonas@y-teste.com.br', favorito: true },
      { nome: 'Zé Fornecedor', email: 'ze@fornecedor-teste.com.br', empresa: 'Fornecedor Teste' }
    ],
    empresa: [{ nome: 'JOAQUIM GESTOR', email: 'joaquim@metrolabs.com.br', tipo: 'colega' }, { nome: 'Hospital São Teste', email: 'compras@hospital-teste.com.br', tipo: 'cliente', empresa: 'Hospital São Teste' }]
  };
  const nomes = (l) => copia(l).map((x) => x.email);
  assert.deepEqual(nomes(ctx.Email_sugerir_('JOAO', fontes, [])), ['joao.contato@fornecedor-teste.com.br'], 'sem acento e sem maiúscula');
  assert.deepEqual(nomes(ctx.Email_sugerir_('jo', fontes, [])), ['joao.contato@fornecedor-teste.com.br', 'joana.antiga@x-teste.com.br', 'jonas@y-teste.com.br', 'joaquim@metrolabs.com.br'],
    'recentes (último uso) primeiro, depois favorito, depois a empresa');
  assert.deepEqual(nomes(ctx.Email_sugerir_('sao teste', fontes, [])), ['compras@hospital-teste.com.br'], 'nome com acento');
  assert.deepEqual(nomes(ctx.Email_sugerir_('fornecedor', fontes, [])).sort(), ['joao.contato@fornecedor-teste.com.br', 'ze@fornecedor-teste.com.br'].sort(), 'pela empresa e pelo domínio');
  assert.deepEqual(nomes(ctx.Email_sugerir_('jo', fontes, ['JOAO.contato@fornecedor-teste.com.br'])).slice(0, 1), ['joana.antiga@x-teste.com.br'], 'quem já está no Para/Cc/Cco não repete');
  assert.deepEqual(nomes(ctx.Email_sugerir_('', fontes, [])), ['joao.contato@fornecedor-teste.com.br', 'joana.antiga@x-teste.com.br'], 'campo vazio: só os usados por último');
  assert.equal(ctx.Email_sugerir_('o', fontes, [], 2).length, 2, 'limite');
  assert.equal(ctx.Email_sugerir_('zzz', fontes, []).length, 0);
  assert.equal(ctx.Email_sugerir_('j', null, []).length, 0, 'sem contatos carregados não quebra');
});

test('pílulas: colar vários (; , quebra de linha, espaços), nome com vírgula entre aspas, validação e o texto que vai ao servidor', () => {
  const { ctx, valores } = telaVm();
  const p = (t) => JSON.parse(JSON.stringify(ctx.Email_partesEndereco_(t)));
  assert.deepEqual(p('"Silva, Ana" <Ana@X-teste.com.br>; b@y-teste.com.br, c@z-teste.com.br\nd@w-teste.com.br'), [
    { nome: 'Silva, Ana', email: 'ana@x-teste.com.br' }, { nome: '', email: 'b@y-teste.com.br' }, { nome: '', email: 'c@z-teste.com.br' }, { nome: '', email: 'd@w-teste.com.br' }]);
  assert.deepEqual(p('a@x-teste.com.br b@y-teste.com.br').map((x) => x.email), ['a@x-teste.com.br', 'b@y-teste.com.br']);
  assert.deepEqual(p('mailto:Cliente@Teste.com.br'), [{ nome: '', email: 'cliente@teste.com.br' }]);
  assert.equal(ctx.Email_emailOk_('nome@empresa.com.br'), true);
  for (const e of ['nome@empresa', 'nome.empresa.com.br', 'a b@x.com', '@x.com.br', 'x@']) assert.equal(ctx.Email_emailOk_(e), false, e);
  vm.runInContext('EM.comp = { dest: { emPara: [], emCc: [], emCco: [] }, versao: 0 };', ctx);
  vm.runInContext('EM.comp.dest.emPara = [Email_pilula_({ email: "A@x-teste.com.br", nome: "A" }), Email_pilula_({ email: "errado@" })];', ctx);
  valores.emPara = 'ultimo@x-teste.com.br'; valores.emCc = ''; valores.emCco = '';
  assert.equal(ctx.Email_destTexto_('emPara'), 'a@x-teste.com.br, errado@, ultimo@x-teste.com.br', 'o que ficou digitado também vai');
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.Email_destInvalidos_())), ['Para: «errado@»']);
});

test('próxima depois de excluir: a de baixo; se era a última, a de cima; várias de uma vez; linhas esperando o Desfazer não contam', () => {
  const { ctx } = telaVm();
  vm.runInContext('EM.conta = "p"; EM.pasta = "INBOX"; EM.pastas = [{ caminho: "INBOX", especial: "entrada" }]; EM.lista = { itens: [5, 4, 3, 2, 1].map(function (u) { return { uid: u }; }) };', ctx);
  const plano = (uids, aberta) => { vm.runInContext('EM.aberta = ' + (aberta ? '{ pasta: "INBOX", uid: ' + aberta + ' }' : 'null') + '; EM.focoUid = ' + (aberta || 'null') + ';', ctx); return JSON.parse(JSON.stringify(ctx.Email_planoProximo_(uids))); };
  assert.equal(plano([4], 4).proximo, 3, 'a de baixo');
  assert.equal(plano([4], 4).abertaSaiu, true);
  assert.equal(plano([1], 1).proximo, 2, 'era a última: a de cima');
  assert.equal(plano([5], 5).proximo, 4, 'a primeira: a de baixo');
  assert.equal(plano([3, 2], 3).proximo, 1, 'várias: a primeira depois do bloco');
  assert.equal(plano([2, 1], 2).proximo, 3, 'várias até o fim: a de cima do bloco');
  assert.equal(plano([3], 5).abertaSaiu, false, 'excluir outra linha não troca a aberta');
  vm.runInContext('EM.pend = [{ conta: "p", pasta: "INBOX", uids: [3], tipo: "apagar" }];', ctx);
  assert.equal(plano([4], 4).proximo, 2, 'a escondida pelo Desfazer é pulada');
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.Email_itensVisiveis_().map((i) => i.uid))), [5, 4, 2, 1]);
  vm.runInContext('EM.pend = []; EM.lista.itens = [{ uid: 9 }];', ctx);
  assert.equal(plano([9], 9).proximo, null, 'era a única');
});

test('tela: ajuda, manual e "Como fazer nesta aba"; auto-atualização não redesenha formulário; textos de erro com o que fazer', () => {
  const tela = ler('JS_Email.html'), ajuda = ler('SGO_Ajuda_Email.js');
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_EMAIL.md'), 'utf8');
  for (const aba of ['caixa', 'contatos', 'minha', 'compartilhadas']) assert.match(tela, new RegExp('Email_comoFazer_\\("' + aba + '"\\)'), aba);
  assert.match(tela, /\.em-como p, \.em-como li \{ text-align: justify/);
  assert.match(tela, /function Email_atualizarListaSozinha_\(\) \{ if \(EM\.aba !== "caixa" \|\| Email_emEdicao_\(\)/);
  assert.match(tela, /function Email_emEdicao_\(\) \{\s*if \(EM\.comp \|\| document\.querySelector\("\.em-overlay"\)\) return true;/);
  for (const t of ['Excluir sem abrir e seguir para a próxima', 'Destinatário: busca ao digitar', 'Contatos', 'Teclas de atalho', 'Várias mensagens de uma vez', 'Rascunho automático'])
    assert.ok(ajuda.includes("titulo: '" + t + "'"), 'ajuda: ' + t);
  assert.match(ajuda, /Alguém vê a minha lista de contatos\?/);
  assert.match(manual, /## 6C\. Igual ao Outlook \(17\/11\/2026\)/);
  assert.match(manual, /OMIE_SIGILO_CONTAS/);
  assert.match(tela, /Endereço errado: .*O e-mail não foi enviado\. Dê dois cliques na pílula vermelha/);
  assert.doesNotMatch(tela, /antiburro/i);
  // cada campo novo da janela de contato tem explicação embaixo
  for (const id of ['emCtNome', 'emCtEmail', 'emCtEmpresa', 'emCtTel']) assert.match(tela, new RegExp('Email_campoContato_\\("' + id + '", "[^"]+", c\\.[a-z]+, "[^"]{10,}'), id);
});

// ---------------- página completa no navegador ----------------
let chromium = null;
try { chromium = require(process.env.PLAYWRIGHT || 'C:/Users/venda/projetos/sgo_servidor/node_modules/playwright').chromium; } catch (e) { chromium = null; }
const saida = process.env.CAPTURAS || path.join(__dirname, '../output/email-melhorias-20261117/capturas');

async function abrirPagina(browser, a, largura, extra) {
  const INC = /<\?!=\s*include\('([^']+)'\);\s*\?>/g;
  const VER = /<\?!=\s*JSON\.stringify\(typeof SGO_versaoTelasCalcular_[\s\S]*?\?>/;
  const html = ler('Index.html').replace(INC, (m, f) => ler(f + '.html')).replace(VER, '""');
  const celular = largura < 500;
  const page = await browser.newPage(Object.assign({ viewport: { width: largura, height: celular ? 844 : 900 } }, celular ? { isMobile: true, hasTouch: true } : {}, extra || {}));
  const erros = [], dialogos = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => { dialogos.push(d.message()); d.accept(); });
  await page.route(/^https?:\/\//, (r) => (r.request().url() === 'http://sgo.ensaio.test/' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : r.abort()));
  await page.exposeFunction('qaRun', (fn, args) => {
    if (fn === 'getSessaoAtual') return { ok: true, valor: { success: true, session: Object.assign({ sessionId: 's_ana' }, a.sessoes.s_ana) } };
    if (/^Email_api/.test(fn) && typeof a.ctx[fn] === 'function') return { ok: true, valor: copia(a.ctx[fn].apply(null, args)) };
    return { ok: false, erro: 'indisponível no ensaio: ' + fn };
  });
  await page.addInitScript(() => {
    try { sessionStorage.setItem('SGO_SESSION', 's_ana'); } catch (e) {}
    const corredor = (okf, falha) => new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => corredor(f, falha) : k === 'withFailureHandler' ? (f) => corredor(okf, f) : k === 'withUserObject' ? () => corredor(okf, falha) :
      (...args) => { window.qaRun(String(k), args).then((r) => { if (r.ok) { if (okf) okf(r.valor); } else if (falha) falha(new Error(r.erro)); }); } });
    window.google = { script: { run: corredor(null, null) } };
  });
  await page.goto('http://sgo.ensaio.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof USER_CONTEXT !== 'undefined' && USER_CONTEXT && USER_CONTEXT.perfil, null, { timeout: 15000 });
  await page.evaluate(() => { EMAIL_DESFAZER_MS = 600; abrir('email'); });
  await page.waitForFunction(() => document.querySelectorAll('#emLista .em-item').length > 0, null, { timeout: 15000 });
  return { page, erros, dialogos };
}
const semRolagemLateral = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const chamadas = (a, acao) => a.srv.st.chamadas.filter((c) => c.acao === acao);
const uidsVisiveis = (page) => page.evaluate(() => Array.prototype.map.call(document.querySelectorAll('#emLista .em-item'), (r) => Number(r.getAttribute('data-uid'))));

test('página completa (1366): × na linha exclui sem abrir, Desfazer, excluir a aberta abre a próxima, rolagem mantida, atalhos, lote e Sinalizadas',
  { skip: !chromium && 'Playwright indisponível' }, async () => {
  fs.mkdirSync(saida, { recursive: true });
  const a = ambiente();
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, erros, dialogos } = await abrirPagina(browser, a, 1366);
    assert.equal((await uidsVisiveis(page)).length, 30);
    // "Como fazer nesta aba" com texto justificado
    assert.equal(await page.locator('details.em-como[data-aba="caixa"] p').first().evaluate((p) => getComputedStyle(p).textAlign), 'justify');
    // o × aparece ao passar o mouse e exclui sem abrir
    const linha = page.locator('#emLista .em-item[data-uid="29"]');
    assert.equal(await linha.locator('.em-ia.del').evaluate((b) => getComputedStyle(b).visibility), 'hidden', 'escondido sem o mouse');
    await linha.hover();
    assert.equal(await linha.locator('.em-ia.del').evaluate((b) => getComputedStyle(b).visibility), 'visible', 'aparece com o mouse');
    await page.screenshot({ path: path.join(saida, '1366-lista-x-na-linha.png') });
    const leAntes = chamadas(a, 'ler').length;
    await linha.locator('.em-ia.del').click();
    assert.ok(!(await uidsVisiveis(page)).includes(29), 'a linha some na hora');
    assert.equal(chamadas(a, 'ler').length, leAntes, 'não abriu a mensagem');
    assert.equal(chamadas(a, 'apagar').length, 0, 'ainda esperando o Desfazer');
    await page.locator('#emDesfazer').waitFor();
    assert.match(await page.locator('#emDesfazer').innerText(), /Mensagem excluída/);
    await page.screenshot({ path: path.join(saida, '1366-desfazer.png') });
    await page.locator('#emDesfazer button').click();
    assert.ok((await uidsVisiveis(page)).includes(29), 'Desfazer traz de volta');
    await page.waitForTimeout(900);
    assert.equal(chamadas(a, 'apagar').length, 0, 'desfeito: nada foi ao servidor');
    assert.ok(a.srv.st.pastas.INBOX.some((m) => m.uid === 29));
    // excluir pela linha sem Desfazer: vai para a Lixeira depois do prazo
    await linha.hover(); await linha.locator('.em-ia.del').click();
    await page.waitForFunction(() => !document.getElementById('emDesfazer'), null, { timeout: 5000 });
    await page.waitForTimeout(200);
    assert.deepEqual(chamadas(a, 'apagar').at(-1).dados.uids, [29]);
    assert.ok(a.srv.st.pastas.Lixeira.some((m) => m.uid === 29));
    // abrir a 20 e excluir com ela aberta: abre a de baixo (19), sem mexer na rolagem
    await page.evaluate(() => { document.getElementById('emLista').scrollTop = 400; });
    const rolagem = await page.evaluate(() => document.getElementById('emLista').scrollTop);
    assert.ok(rolagem > 100, 'a lista tem rolagem');
    await page.locator('#emLista .em-item[data-uid="20"] .em-item-corpo').click();
    await page.waitForFunction(() => EM.aberta && EM.aberta.uid === 20);
    const rolagem2 = await page.evaluate(() => document.getElementById('emLista').scrollTop);
    await page.locator('#emLeitor button[title^="Excluir e abrir a próxima"]').click();
    await page.waitForFunction(() => EM.aberta && EM.aberta.uid === 19, null, { timeout: 5000 });
    assert.ok(Math.abs((await page.evaluate(() => document.getElementById('emLista').scrollTop)) - rolagem2) <= 2, 'a lista não pula');
    assert.match(await page.locator('#emLeitor h3').innerText(), /Assunto 19/);
    await page.screenshot({ path: path.join(saida, '1366-excluiu-abriu-a-proxima.png') });
    // a última da lista: abre a de cima
    await page.locator('#emLista .em-item[data-uid="1"] .em-item-corpo').click();
    await page.waitForFunction(() => EM.aberta && EM.aberta.uid === 1);
    await page.keyboard.press('Delete');
    await page.waitForFunction(() => EM.aberta && EM.aberta.uid === 2, null, { timeout: 5000 });
    // setas: a de baixo e a de cima
    await page.locator('#emLista .em-item[data-uid="2"]').focus();
    await page.keyboard.press('ArrowUp');
    await page.waitForFunction(() => EM.aberta && EM.aberta.uid === 3, null, { timeout: 5000 });
    // "U" marca como não lida na linha em foco; "I" sinaliza
    await page.keyboard.press('u');
    await page.waitForFunction(() => { const it = Email_itemPorUid_(3); return it && it.lida === false; });
    await page.keyboard.press('i');
    await page.waitForTimeout(150);
    assert.equal(a.srv.st.pastas.INBOX.find((m) => m.uid === 3).sinalizada, true);
    // lote: marcar 3 e excluir de uma vez
    await page.waitForFunction(() => !document.getElementById('emDesfazer'), null, { timeout: 5000 });
    for (const u of [10, 11, 12]) await page.locator('#emLista .em-item[data-uid="' + u + '"] .em-item-check input').check();
    assert.match(await page.locator('#emLote').innerText(), /3 selecionadas/);
    await page.screenshot({ path: path.join(saida, '1366-lote.png') });
    await page.locator('#emLote button', { hasText: 'Excluir' }).click();
    for (const u of [10, 11, 12]) assert.ok(!(await uidsVisiveis(page)).includes(u));
    assert.match(await page.locator('#emDesfazer').innerText(), /3 mensagens excluídas/);
    await page.waitForFunction(() => !document.getElementById('emDesfazer'), null, { timeout: 5000 });
    await page.waitForTimeout(200);
    assert.deepEqual(chamadas(a, 'apagar').at(-1).dados.uids.slice().sort((x, y) => x - y), [10, 11, 12]);
    // lote: marcar como lida
    for (const u of [15, 18]) await page.locator('#emLista .em-item[data-uid="' + u + '"] .em-item-check input').check();
    await page.locator('#emLote button', { hasText: /^Lida$/ }).click();
    await page.waitForTimeout(150);
    assert.deepEqual(chamadas(a, 'marcar').at(-1).dados.uids.slice().sort((x, y) => x - y), [15, 18]);
    assert.equal(chamadas(a, 'marcar').at(-1).dados.lida, true);
    // bandeira na linha + filtro Sinalizadas
    const l8 = page.locator('#emLista .em-item[data-uid="8"]');
    await l8.hover(); await l8.locator('.em-ia.flag').click();
    await page.waitForTimeout(150);
    assert.equal(a.srv.st.pastas.INBOX.find((m) => m.uid === 8).sinalizada, true);
    await page.locator('.em-chip', { hasText: 'Sinalizadas' }).click();
    await page.waitForFunction(() => document.querySelectorAll('#emLista .em-item').length === 3, null, { timeout: 5000 });
    assert.deepEqual(await uidsVisiveis(page), [8, 7, 3]);
    assert.equal(chamadas(a, 'listar').at(-1).dados.sinalizadas, true);
    await page.locator('.em-chip', { hasText: 'Sinalizadas' }).click();
    await page.waitForFunction(() => document.querySelectorAll('#emLista .em-item').length > 3);
    // arrastar para a pasta Arquivo
    await page.locator('#emLista .em-item[data-uid="14"]').dragTo(page.locator('.em-pasta', { hasText: 'Arquivo' }));
    await page.waitForTimeout(200);
    assert.ok(a.srv.st.pastas.Arquivo.some((m) => m.uid === 14), 'arrastou para a pasta');
    assert.ok(await semRolagemLateral(page));
    assert.deepEqual(erros, []);
    assert.deepEqual(dialogos, []);
    await page.close();
  } finally { await browser.close(); }
});

test('página completa (1366): destinatário em pílulas com busca ao digitar, colar vários, inválido trava o envio, coleta do contato; auto-atualização não redesenha a janela; aba Contatos',
  { skip: !chromium && 'Playwright indisponível' }, async () => {
  fs.mkdirSync(saida, { recursive: true });
  const a = ambiente();
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, erros, dialogos } = await abrirPagina(browser, a, 1366);
    await page.evaluate(() => Email_escrever_({}));
    await page.locator('#emPara').waitFor();
    await page.waitForFunction(() => EM.ct && EM.ct.contatos.length > 0, null, { timeout: 5000 });
    await page.locator('#emPara').fill('');
    await page.locator('#emPara').type('JOAO');
    await page.locator('#emParaSug .em-sug-item').first().waitFor();
    assert.match(await page.locator('#emParaSug').innerText(), /João Contato/);
    await page.screenshot({ path: path.join(saida, '1366-sugestao-ao-digitar.png') });
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#emParaPil .em-pilula').count(), 1);
    assert.match(await page.locator('#emParaPil .em-pilula').innerText(), /João Contato/);
    // catálogo da empresa: colega pelo nome
    await page.locator('#emPara').type('bia');
    await page.locator('#emParaSug .em-sug-item').first().waitFor();
    assert.match(await page.locator('#emParaSug').innerText(), /BIA COMERCIAL TESTE[\s\S]*Colega/);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('#emParaPil .em-pilula').count(), 2);
    // colar vários no Cc
    await page.locator('#emCc').focus();
    await page.evaluate(() => { const i = document.getElementById('emCc'), dt = new DataTransfer(); dt.setData('text', 'um@cliente-teste.com.br; dois@cliente-teste.com.br, errado@'); i.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); });
    assert.equal(await page.locator('#emCcPil .em-pilula').count(), 3);
    assert.equal(await page.locator('#emCcPil .em-pilula.inv').count(), 1, 'endereço errado fica vermelho');
    await page.locator('#emAssunto').fill('Teste das pílulas');
    await page.locator('#emEditor').click(); await page.keyboard.type('Olá.');
    // auto-atualização da caixa com a janela aberta: não redesenha nem chama a lista
    const antes = chamadas(a, 'listar').length;
    await page.evaluate(() => Email_atualizarListaSozinha_());
    await page.waitForTimeout(150);
    assert.equal(chamadas(a, 'listar').length, antes);
    assert.equal(await page.locator('#emCcPil .em-pilula').count(), 3, 'pílulas intactas');
    await page.screenshot({ path: path.join(saida, '1366-pilulas-invalida.png') });
    await page.locator('#emBtnEnviar').click();
    assert.match(await page.locator('#emCompMsg').innerText(), /Endereço errado: Cc: «errado@»/);
    assert.equal(a.srv.st.enviados.length, 0, 'não envia com pílula vermelha');
    await page.locator('#emCcPil .em-pilula.inv button').click();
    assert.equal(await page.locator('#emCcPil .em-pilula').count(), 2);
    await page.locator('#emBtnEnviar').click();
    await page.waitForFunction(() => !document.getElementById('emOverlay'), null, { timeout: 5000 });
    const env = a.srv.st.enviados.at(-1);
    assert.equal(env.para, 'joao.contato@fornecedor-teste.com.br, bia@metrolabs.com.br');
    assert.equal(env.cc, 'um@cliente-teste.com.br, dois@cliente-teste.com.br');
    assert.ok(dialogos.some((d) => /E-mail enviado/.test(d) && /guardados nos seus contatos/.test(d)), 'avisa os contatos guardados');
    assert.ok(a.tabelas.EML_CONTATOS.some((x) => x.USUARIO_ID === 'u_ana' && x.EMAIL === 'um@cliente-teste.com.br' && x.ORIGEM === 'AUTOMATICO'));
    // aba Contatos: busca sem acento, novo contato, favorito e excluir
    await page.locator('.em-tab', { hasText: 'Contatos' }).click();
    await page.locator('#emCtLista .em-ct').first().waitFor();
    await page.locator('#emCtBusca').fill('joao');
    assert.match(await page.locator('#emCtLista').innerText(), /João Contato/);
    await page.locator('#emCtBusca').fill('');
    await page.locator('button', { hasText: 'Novo contato' }).click();
    await page.locator('#emCtEmail').fill('sem-arroba');
    await page.locator('#emCtSalvarBtn').click();
    assert.match(await page.locator('#emCtEdMsg').innerText(), /não é um endereço válido/);
    await page.locator('#emCtNome').fill('Carla Cliente');
    await page.locator('#emCtEmail').fill('carla@cliente-teste.com.br');
    await page.locator('#emCtFav').check();
    await page.screenshot({ path: path.join(saida, '1366-novo-contato.png') });
    await page.locator('#emCtSalvarBtn').click();
    await page.waitForFunction(() => !document.getElementById('emOverlay'), null, { timeout: 5000 });
    assert.match(await page.locator('#emCtMsg').innerText(), /salvo nos seus contatos/);
    const carla = a.tabelas.EML_CONTATOS.find((x) => x.EMAIL === 'carla@cliente-teste.com.br');
    assert.equal(carla.FAVORITO, 'SIM');
    await page.locator('.em-chip', { hasText: 'Favoritos' }).click();
    assert.match(await page.locator('#emCtLista').innerText(), /Carla Cliente/);
    await page.screenshot({ path: path.join(saida, '1366-contatos.png'), fullPage: true });
    await page.locator('#emCtLista .em-ct', { hasText: 'Carla Cliente' }).locator('button', { hasText: 'Excluir' }).click();
    await page.waitForFunction(() => !document.querySelector('#emCtLista') || !/Carla Cliente/.test(document.querySelector('#emCtLista').innerText), null, { timeout: 5000 });
    assert.equal(a.tabelas.EML_CONTATOS.find((x) => x.EMAIL === 'carla@cliente-teste.com.br').STATUS, 'EXCLUIDO');
    assert.ok(dialogos.some((d) => /Excluir o contato «Carla Cliente»/.test(d)));
    // salvar remetente nos contatos, a partir da leitura
    await page.locator('.em-tab', { hasText: 'Caixa de e-mail' }).click();
    await page.locator('#emLista .em-item[data-uid="30"] .em-item-corpo').click();
    await page.waitForFunction(() => EM.aberta && EM.aberta.uid === 30);
    await page.locator('#emLeitor button', { hasText: 'Salvar remetente nos contatos' }).click();
    await page.locator('#emCtEmail').waitFor();
    assert.equal(await page.locator('#emCtEmail').inputValue(), 'r30@cliente-teste.com.br');
    assert.equal(await page.locator('#emCtNome').inputValue(), 'Remetente 30');
    await page.locator('#emCtSalvarBtn').click();
    await page.waitForFunction(() => !document.getElementById('emOverlay'), null, { timeout: 5000 });
    assert.equal(a.tabelas.EML_CONTATOS.find((x) => x.EMAIL === 'r30@cliente-teste.com.br').ORIGEM, 'REMETENTE');
    assert.deepEqual(erros, []);
    await page.close();
  } finally { await browser.close(); }
});

test('rascunho automático: salva sozinho sem tela de espera; enviar espera o salvamento; descartar manda o rascunho automático para a Lixeira',
  { skip: !chromium && 'Playwright indisponível' }, async () => {
  const a = ambiente();
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, erros } = await abrirPagina(browser, a, 1366);
    await page.evaluate(() => Email_escrever_({ para: 'cliente@cliente-teste.com.br' }));
    await page.locator('#emAssunto').fill('Rascunho automático');
    await page.evaluate(() => Email_salvarRascunho_(true));
    await page.waitForFunction(() => EM.comp && EM.comp.rascunhoUid, null, { timeout: 5000 });
    assert.match(await page.locator('#emAutoInfo').innerText(), /Rascunho salvo sozinho às/);
    assert.equal(chamadas(a, 'rascunho').length, 1);
    assert.equal(await page.evaluate(() => EM.comp.sujo), false);
    const uid = await page.evaluate(() => EM.comp.rascunhoUid);
    await page.locator('#emAssunto').fill('Rascunho automático mudou');
    await page.locator('button', { hasText: 'Descartar' }).click();
    await page.waitForFunction(() => !document.getElementById('emOverlay'), null, { timeout: 5000 });
    await page.waitForTimeout(200);
    assert.deepEqual(chamadas(a, 'apagar').at(-1).dados, { conta: 'p_ana', pasta: 'Rascunhos', uids: [uid], definitivo: false, confirmado: false });
    assert.ok(a.srv.st.pastas.Lixeira.some((m) => m.uid === uid), 'foi para a Lixeira (recuperável)');
    assert.deepEqual(erros, []);
    await page.close();
  } finally { await browser.close(); }
});

test('celular (390 e 320) e computador (1366): sem rolagem lateral na caixa, na janela de escrever com sugestões e na aba Contatos; × sempre à vista no celular',
  { skip: !chromium && 'Playwright indisponível' }, async () => {
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const largura of [1366, 390, 320]) {
      const a = ambiente();
      const { page, erros } = await abrirPagina(browser, a, largura);
      assert.ok(await semRolagemLateral(page), 'caixa sem rolagem lateral em ' + largura);
      if (largura < 500) {
        assert.equal(await page.locator('#emLista .em-item').first().locator('.em-ia.del').evaluate((b) => getComputedStyle(b).visibility), 'visible', '× à vista no celular');
        const caixa = await page.locator('#emLista .em-item').first().boundingBox();
        assert.ok(caixa.x >= 0 && caixa.x + caixa.width <= largura + 1, 'linha cabe na tela');
      }
      if (largura === 390) {
        // na leitura (celular): Excluir abre a próxima na própria leitura
        await page.locator('#emLista .em-item[data-uid="29"] .em-item-corpo').click();
        await page.waitForFunction(() => EM.aberta && EM.aberta.uid === 29);
        await page.locator('#emLeitor button[title^="Excluir e abrir a próxima"]').click();
        await page.waitForFunction(() => EM.aberta && EM.aberta.uid === 28, null, { timeout: 5000 });
        assert.equal(await page.evaluate(() => document.getElementById('emGrade').classList.contains('lendo')), true);
        await page.screenshot({ path: path.join(saida, '390-excluiu-abriu-a-proxima.png') });
        // de volta à lista: o × da linha da mensagem que estava aberta não pula para a leitura
        await page.locator('#emLeitor .em-voltar').click();
        await page.locator('#emLista .em-item[data-uid="28"] .em-ia.del').click();
        assert.equal(await page.evaluate(() => document.getElementById('emGrade').classList.contains('lendo')), false, 'continua na lista');
        assert.equal(await page.evaluate(() => EM.aberta), null);
        await page.screenshot({ path: path.join(saida, '390-lista-desfazer.png') });
        await page.waitForFunction(() => !document.getElementById('emDesfazer'), null, { timeout: 5000 });
      }
      await page.screenshot({ path: path.join(saida, largura + '-caixa.png') });
      await page.evaluate(() => Email_escrever_({ para: 'Nome Bem Comprido de Cliente Teste <nome.bem.comprido.de.cliente@hospital-com-nome-grande-teste.com.br>' }));
      await page.locator('#emPara').waitFor();
      await page.waitForFunction(() => EM.ct, null, { timeout: 5000 });
      await page.locator('#emCc').type('jo');
      await page.locator('#emCcSug .em-sug-item').first().waitFor();
      assert.ok(await semRolagemLateral(page), 'janela de escrever sem rolagem lateral em ' + largura);
      const sug = await page.locator('#emCcSug').boundingBox();
      assert.ok(sug.x >= 0 && sug.x + sug.width <= largura + 1, 'sugestões cabem na tela em ' + largura);
      await page.screenshot({ path: path.join(saida, largura + '-escrever-sugestoes.png') });
      await page.keyboard.press('Escape'); // fecha só a lista de sugestões
      assert.ok(await page.locator('#emOverlay').count(), 'Esc na lista não fecha a janela');
      await page.evaluate(() => { EM.comp.sujo = false; Email_descartar_(); });
      await page.locator('.em-tab', { hasText: 'Contatos' }).click();
      await page.locator('#emCtLista .em-ct').first().waitFor();
      assert.ok(await semRolagemLateral(page), 'Contatos sem rolagem lateral em ' + largura);
      await page.screenshot({ path: path.join(saida, largura + '-contatos.png') });
      assert.deepEqual(erros, []);
      await page.close();
    }
  } finally { await browser.close(); }
});
