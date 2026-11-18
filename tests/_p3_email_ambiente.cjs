// 18/11/2026 (pacote 3, item 11): servidor de e-mail simulado e legado do e-mail (SGO_Email.js) num contexto isolado. Cópia fiel
// do ambiente de email-outlook-20261117.test.cjs (que não muda), para os testes do pacote 3. Só dados de teste.
'use strict';
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

module.exports = { servidorEmail, ambiente, ler, copia, ok };
