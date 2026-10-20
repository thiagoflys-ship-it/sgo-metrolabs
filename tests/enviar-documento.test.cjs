// Enviar documento ao cliente (20/10/2026): janela única para todos os módulos (SGO_EnviarDoc.js + JS_EnviarDoc.html).
// Cliente descoberto pelo arquivo (nunca o de outro cliente), anexo certo, pedido repetido não envia duas vezes,
// histórico, e-mail sem caixa pessoal pela caixa do sistema com "responder para", falha do WhatsApp com motivo e
// "tentar de novo", documento com dado pessoal bloqueado, perfil cliente recusado e a barra "Documento salvo"
// reconhecendo a resposta de cada gerador. Código real do SGO+ num contexto isolado; dados fictícios; nada sai daqui.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const deq = (a, b, m) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, m);
const ler = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n');

const SEG_10H = Date.parse('2026-10-19T10:00:00-03:00');
const ZAPI = { WHATSAPP_PROVEDOR: 'zapi', ZAPI_INSTANCIA: 'INSTANCIA-TESTE-123', ZAPI_TOKEN: 'TOKEN-TESTE-456', ZAPI_CLIENT_TOKEN: 'CLIENT-TESTE-789' };
const CNPJ_A = '11222333000181', CNPJ_B = '44555666000199';

/** Pastas e arquivos fictícios: raízes dos módulos com a subpasta do cliente (CNPJ ou nome). */
function drive() {
  const pastas = {}, arquivos = {};
  let n = 0;
  const pasta = (nome, pai, descricao) => { const id = 'P' + (++n); pastas[id] = { id, nome, pai: pai || null, descricao: descricao || '' }; return id; };
  const arquivo = (nome, pastaId, mime, texto) => { const id = 'ARQ' + String(++n).padStart(4, '0'); arquivos[id] = { id, nome, pasta: pastaId, mime, bytes: Buffer.from(texto || ('conteudo ' + nome)), criado: new Date(SEG_10H - n * 60000) }; return id; };
  const raiz = pasta('raiz');
  const ids = {};
  const comCliente = (nomeRaiz, sub, base) => { const r = pasta(nomeRaiz, raiz); const s = pasta(sub, r, 'HOSPITAL ALFA TESTE'); ids[base] = { pdf: arquivo(base + ' - 2026-10-19 0930.pdf', s, 'application/pdf'), html: arquivo(base + ' - 2026-10-19 0930.html', s, 'text/html'), pasta: s }; return s; };
  comCliente('Autoclave - Laudos', CNPJ_A, 'Relatório de ensaio - AC-77 - TAG-AC1');
  comCliente('Lavadora - Laudos', CNPJ_A, 'Relatório de ensaio - LV-12 - TAG-LV1');
  comCliente('Cadeia de Frio - Laudos', CNPJ_A, 'Relatório de qualificação térmica - CF-3 - TAG-GEL');
  comCliente('Estufa+Banho-maria - Laudos', CNPJ_A, 'Relatório de qualificação térmica - EB-5 - TAG-EST');
  comCliente('Certificado de Calibracao - Documentos Gerados', 'HOSPITAL ALFA TESTE LTDA', 'Certificado 2026-0377');
  comCliente('Relatorio Calibracao - Documentos Gerados', 'HOSPITAL ALFA TESTE LTDA', 'Relatorio Calibracao RC-9');
  comCliente('Laudos NR13 - Documentos Gerados', 'HOSPITAL ALFA TESTE LTDA', 'Laudo NR13 0042');
  comCliente('Declaracao Execucao Servico - Documentos Gerados', 'HOSPITAL ALFA TESTE LTDA', 'Declaracao DE-15');
  const pgt = pasta('PDFS_GERADOS', pasta('METROLABS_PGTPOP_SISTEMA', raiz));
  const pgtCli = pasta(CNPJ_A, pgt, 'HOSPITAL ALFA TESTE');
  ids.PGT = { pdf: arquivo('PGT - Hospital Alfa - rev1.pdf', pgtCli, 'application/pdf'), pasta: pgtCli };
  ['METROLABS_CME_SISTEMA', 'METROLABS_CRONEXEC_SISTEMA', 'METROLABS_REGOP_SISTEMA'].forEach((r) => { const p = pasta(CNPJ_A, pasta('PDFS_GERADOS', pasta(r, raiz))); ids[r] = { pdf: arquivo(r + ' documento.pdf', p, 'application/pdf'), pasta: p }; });
  comCliente('Inventario de Equipamentos - Documentos Gerados', 'HOSPITAL ALFA TESTE LTDA', 'Inventario INV-2');
  // outro cliente
  const acB = pastas[Object.keys(pastas).find((k) => pastas[k].nome === 'Autoclave - Laudos')].id;
  const cliB = pasta(CNPJ_B, acB, 'CLINICA BETA TESTE');
  ids.B = { pdf: arquivo('Relatório de ensaio - AC-90 - TAG-B.pdf', cliB, 'application/pdf'), pasta: cliB };
  // documentos internos e bloqueados
  const frota = pasta('Frota completa', pasta('Frota - Relatorios Gerados', raiz));
  ids.FROTA = { pdf: arquivo('FRT-REL - outubro.pdf', frota, 'application/pdf') };
  const cond = pasta('Fechamentos mensais', pasta('Programa de conduta - Relatórios', raiz));
  ids.CONDUTA = { pdf: arquivo('Fechamento conduta setembro.pdf', cond, 'application/pdf') };
  ids.FOTO = { pdf: arquivo('foto painel.jpg', frota, 'image/jpeg') };
  return { pastas, arquivos, ids };
}

function ambiente(opcoes) {
  const o = opcoes || {};
  const D = drive();
  const tabelas = {
    CAD_CLIENTES: [
      { ID: 'cliA', RAZAO_SOCIAL: 'HOSPITAL ALFA TESTE LTDA', NOME_FANTASIA: 'HOSPITAL ALFA TESTE', CNPJ: CNPJ_A, CONTATO: 'MARIA CONTATO', EMAIL: 'maria@alfa.exemplo.test', TELEFONE: '62999990101', STATUS: 'ATIVO' },
      { ID: 'cliB', RAZAO_SOCIAL: 'CLINICA BETA TESTE SA', NOME_FANTASIA: 'CLINICA BETA TESTE', CNPJ: CNPJ_B, CONTATO: 'JOAO BETA', EMAIL: 'joao@beta.exemplo.test', TELEFONE: '62999990202', STATUS: 'ATIVO' }
    ],
    CAD_UNIDADES: [
      { ID: 'uniA', CLIENTE_ID: 'cliA', NOME_UNIDADE: 'CME CENTRAL', RESPONSAVEL: 'PEDRO CME', TELEFONE: '6232220000', STATUS: 'ATIVO' },
      { ID: 'uniB', CLIENTE_ID: 'cliB', NOME_UNIDADE: 'BETA SEDE', RESPONSAVEL: 'ANA BETA', TELEFONE: '62999990303', STATUS: 'ATIVO' }
    ],
    CAD_EQUIPAMENTOS: [],
    CAD_USUARIOS: [
      { ID: 'u_tec', USUARIO: 'tiago', NOME: 'TIAGO TECNICO', PERFIL: 'TECNICO', STATUS: 'ATIVO', EMAIL: 'tiago@metrolabs.exemplo.test', CELULAR: '62999990002' },
      { ID: 'u_sem', USUARIO: 'semmail', NOME: 'SEM EMAIL', PERFIL: 'COMERCIAL', STATUS: 'ATIVO', EMAIL: '', CELULAR: '' },
      { ID: 'u_cli', USUARIO: 'portal.alfa', NOME: 'LUCIA PORTAL', PERFIL: 'CLIENTE', CLIENTE_ID: 'cliA', STATUS: 'ATIVO', EMAIL: 'lucia@alfa.exemplo.test', CELULAR: '62999990404' }
    ],
    DOC_DOCUMENTOS: [], DOC_ENVIOS: [], SYS_LOGS: []
  };
  let seq = 0;
  const props = Object.assign({}, o.props || {});
  const emails = [], pedidos = [], logs = [];
  const sessoes = {
    s_tec: { userId: 'u_tec', usuario: 'tiago', nome: 'TIAGO TECNICO', perfil: 'TECNICO' },
    s_sem: { userId: 'u_sem', usuario: 'semmail', nome: 'SEM EMAIL', perfil: 'COMERCIAL' },
    s_cli: { userId: 'u_cli', usuario: 'portal.alfa', nome: 'LUCIA PORTAL', perfil: 'CLIENTE', clienteId: 'cliA' }
  };
  const responder = o.responder || ((url) => (/send-document\/(pdf|html)$/.test(url) ? { cod: 200, corpo: { zaapId: 'z' + pedidos.length, messageId: 'MSG' + pedidos.length } } : { cod: 404, corpo: { error: 'não simulado' } }));
  const iterador = (l) => { let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; };
  const pastaObj = (id) => {
    const p = D.pastas[id];
    return {
      getId: () => p.id, getName: () => p.nome, getDescription: () => p.descricao, getUrl: () => 'https://sgo.exemplo.test/pastas/' + p.id,
      getParents: () => iterador(p.pai ? [pastaObj(p.pai)] : []),
      getFiles: () => iterador(Object.values(D.arquivos).filter((a) => a.pasta === id).map((a) => arqObj(a.id))),
      getFilesByName: (n) => iterador(Object.values(D.arquivos).filter((a) => a.pasta === id && a.nome === n).map((a) => arqObj(a.id)))
    };
  };
  const arqObj = (id) => {
    const a = D.arquivos[id];
    if (!a) throw new Error('Não foi possível encontrar o item com o ID ' + id);
    return {
      getId: () => a.id, getName: () => a.nome, getMimeType: () => a.mime, getSize: () => a.bytes.length, getUrl: () => 'https://sgo.exemplo.test/arquivos/' + a.id,
      getDateCreated: () => a.criado, getParents: () => iterador([pastaObj(a.pasta)]),
      getBlob: () => ({ getName: () => a.nome, setName() {}, getContentType: () => a.mime, getBytes: () => Array.from(a.bytes), _id: a.id })
    };
  };
  const ctx = vm.createContext({
    console, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt, Date: class extends Date { constructor(...a) { if (a.length === 0) super(o.agora || SEG_10H); else super(...a); } static now() { return o.agora || SEG_10H; } },
    Utilities: criarUtilities(), Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); } }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {}, hasLock: () => false }) },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://sgo.exemplo.test' }) },
    MailApp: { sendEmail: (m) => { if (o.mailFalha) throw new Error(o.mailFalha); emails.push(m); }, getRemainingDailyQuota: () => 100 },
    UrlFetchApp: {
      fetch: (url, op) => {
        const corpo = op && op.payload ? JSON.parse(op.payload) : null;
        pedidos.push({ url, corpo, cabecalhos: (op && op.headers) || {} });
        const r = responder(url, corpo);
        return { getResponseCode: () => r.cod, getContentText: () => JSON.stringify(r.corpo) };
      }
    },
    DriveApp: { getFileById: (id) => arqObj(id), getFoldersByName: (n) => iterador(Object.values(D.pastas).filter((p) => p.nome === n).map((p) => pastaObj(p.id))) },
    CertCal_garantirTabela_: (t) => { tabelas[t] = tabelas[t] || []; }, CertCal_garantirColuna_() {}, CertCal_forcarColunaTexto_() {},
    SGO_DATA: {
      getAll: (t) => { if (!tabelas[t]) throw new Error('Aba não encontrada: ' + t); return tabelas[t].map((r) => Object.assign({}, r)); },
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      insert: (t, d) => { const r = Object.assign({ ID: 'env' + (++seq) }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
      update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) return false; Object.assign(r, d); return true; },
      deleteById: () => { throw new Error('apagar é proibido'); },
      log: (a, u, m) => logs.push([a, u, m])
    },
    SGO_CFG: { SHEETS: { CAD_CLIENTES: 'CAD_CLIENTES', CAD_UNIDADES: 'CAD_UNIDADES', CAD_EQUIPAMENTOS: 'CAD_EQUIPAMENTOS', CAD_USUARIOS: 'CAD_USUARIOS', DOC_DOCUMENTOS: 'DOC_DOCUMENTOS', CAD_CONDUTORES: 'CAD_CONDUTORES', CAD_TECNICOS: 'CAD_TECNICOS', NTF_ENVIOS: 'NTF_ENVIOS' } },
    exigirSessao: (sid) => { if (!sessoes[sid]) throw new Error('Sessão inválida ou expirada.'); return Object.assign({}, sessoes[sid]); }
  });
  for (const f of ['SGO_Utilis.js', 'SGO_Notificar.js', 'SGO_Zapi.js', 'SGO_Expediente.js', 'SGO_DocSalvar.js', 'SGO_EnviarDoc.js']) vm.runInContext(ler(f), ctx, { filename: f });
  if (o.emailIntegrado) ctx.SGO_Email_enviarComoUsuario_ = o.emailIntegrado;
  return { ctx, tabelas, emails, pedidos, logs, D, props };
}

const enviar = (A, sid, p) => A.ctx.EnviarDoc_apiEnviar(sid, Object.assign({ pedidoId: 'pedido' + Math.random().toString(36).slice(2, 12), canais: { email: true }, assunto: 'Assunto', mensagemEmail: 'Texto do e-mail', mensagemWhatsapp: 'Olá, {nome}. Segue o documento.' }, p));

test('a janela abre a partir de cada tipo de documento, com o tipo e o cliente certos', () => {
  const A = ambiente();
  const esperado = {
    'Relatório de ensaio - AC-77 - TAG-AC1': 'Relatório de ensaio da autoclave', 'Relatório de ensaio - LV-12 - TAG-LV1': 'Relatório de ensaio da lavadora',
    'Relatório de qualificação térmica - CF-3 - TAG-GEL': 'Relatório de qualificação térmica', 'Relatório de qualificação térmica - EB-5 - TAG-EST': 'Relatório de qualificação térmica',
    'Certificado 2026-0377': 'Certificado de calibração', 'Relatorio Calibracao RC-9': 'Relatório de calibração', 'Laudo NR13 0042': 'Laudo de inspeção NR-13',
    'Declaracao DE-15': 'Declaração de execução de serviço', PGT: 'PGT / POP', METROLABS_CME_SISTEMA: 'Planejamento técnico do CME',
    METROLABS_CRONEXEC_SISTEMA: 'Cronograma de execução', METROLABS_REGOP_SISTEMA: 'Registro operacional', 'Inventario INV-2': 'Inventário de equipamentos'
  };
  for (const [chave, tipo] of Object.entries(esperado)) {
    const r = A.ctx.EnviarDoc_apiPreparar('s_tec', { arquivoId: A.D.ids[chave].pdf });
    assert.equal(r.ok, true, chave + ': ' + r.message);
    assert.equal(r.documento.tipo, tipo, chave);
    assert.equal(r.documento.classe, 'CLIENTE', chave);
    assert.equal(r.cliente && r.cliente.id, 'cliA', chave + ' devia ser do cliente A');
    assert.ok(r.contatos.some((c) => c.email === 'maria@alfa.exemplo.test'), chave + ' sem o contato do cliente');
    assert.ok(r.textos.assunto && /Metrolabs/.test(r.textos.email) && !/[\u{1F300}-\u{1FAFF}]/u.test(r.textos.email + r.textos.whatsapp), chave + ' textos');
  }
  // título sem o carimbo de data; HTML ao lado encontrado
  const r = A.ctx.EnviarDoc_apiPreparar('s_tec', { arquivoId: A.D.ids['Relatório de ensaio - AC-77 - TAG-AC1'].pdf });
  assert.equal(r.documento.titulo, 'Relatório de ensaio - AC-77 - TAG-AC1');
  assert.ok(r.documento.html && /\.html$/.test(r.documento.html.nome));
  // link do sistema também serve
  assert.equal(A.ctx.EnviarDoc_apiPreparar('s_tec', { arquivoId: 'https://sgo.exemplo.test/arquivos/' + A.D.ids.PGT.pdf }).ok, true);
});

test('destinatários sempre do cliente do arquivo, nunca de outro (mesmo se a tela mandar outro cliente)', () => {
  const A = ambiente();
  const r = A.ctx.EnviarDoc_apiPreparar('s_tec', { arquivoId: A.D.ids['Relatório de ensaio - AC-77 - TAG-AC1'].pdf, dica: { clienteId: 'cliB' } });
  assert.equal(r.cliente.id, 'cliA');
  const emails = r.contatos.map((c) => c.email).filter(Boolean), fones = r.contatos.map((c) => c.celular).filter(Boolean);
  assert.ok(emails.includes('maria@alfa.exemplo.test') && emails.includes('lucia@alfa.exemplo.test'));
  assert.ok(!emails.some((e) => /beta/.test(e)) && !fones.includes('5562999990202') && !fones.includes('5562999990303'), 'apareceu contato do cliente B');
  assert.ok(r.avisos.some((a) => /outro cliente/.test(a)));
  // telefone fixo da unidade aparece marcado como sem WhatsApp
  assert.ok(r.contatos.some((c) => c.origem === 'Unidade CME CENTRAL' && !c.whatsOk && /fixo/.test(c.notaFone)));
  // documento do cliente B traz só os contatos de B
  const b = A.ctx.EnviarDoc_apiPreparar('s_tec', { arquivoId: A.D.ids.B.pdf, dica: { clienteId: 'cliA' } });
  assert.equal(b.cliente.id, 'cliB');
  assert.ok(!b.contatos.some((c) => /alfa/.test(c.email || '')));
  // quem já recebeu documento de A não aparece para B
  enviar(A, 's_tec', { arquivoId: A.D.ids.PGT.pdf, destinatarios: [{ nome: 'NOVO CONTATO', email: 'novo@alfa.exemplo.test' }] });
  const b2 = A.ctx.EnviarDoc_apiPreparar('s_tec', { arquivoId: A.D.ids.B.pdf });
  assert.ok(!b2.contatos.some((c) => c.email === 'novo@alfa.exemplo.test'));
  const a2 = A.ctx.EnviarDoc_apiPreparar('s_tec', { arquivoId: A.D.ids.PGT.pdf });
  assert.ok(a2.contatos.some((c) => c.email === 'novo@alfa.exemplo.test' && /Já recebeu/.test(c.origem)));
});

test('o anexo é o documento certo (PDF, HTML opcional, outros só do mesmo cliente)', () => {
  const A = ambiente();
  const ids = A.D.ids['Relatório de ensaio - AC-77 - TAG-AC1'];
  let r = enviar(A, 's_tec', { arquivoId: ids.pdf, destinatarios: [{ email: 'maria@alfa.exemplo.test' }] });
  assert.equal(r.ok, true, r.message);
  deq(A.emails[0].attachments.map((b) => b._id), [ids.pdf]);
  r = enviar(A, 's_tec', { arquivoId: ids.pdf, incluirHtml: true, destinatarios: [{ email: 'maria@alfa.exemplo.test' }] });
  deq(A.emails[1].attachments.map((b) => b._id), [ids.pdf, ids.html]);
  // documento de outro cliente não vai junto
  r = enviar(A, 's_tec', { arquivoId: ids.pdf, extras: [A.D.ids.B.pdf], destinatarios: [{ email: 'maria@alfa.exemplo.test' }] });
  assert.equal(r.ok, false);
  assert.match(r.message, /não é do mesmo cliente/);
  assert.equal(A.emails.length, 2);
  // outro documento do mesmo cliente vai
  const outroA = Object.keys(A.D.arquivos).find((k) => A.D.arquivos[k].pasta === ids.pasta && k !== ids.pdf && /pdf/.test(A.D.arquivos[k].mime)) ||
    (A.D.arquivos.EXTRA01 = { id: 'EXTRA01', nome: 'Memória de cálculo do F0.pdf', pasta: ids.pasta, mime: 'application/pdf', bytes: Buffer.from('x'), criado: new Date(SEG_10H) }, 'EXTRA01');
  // identificação inválida de anexo a mais: recusa em vez de mandar sem ele
  const inval = enviar(A, 's_tec', { arquivoId: ids.pdf, extras: ['x'], destinatarios: [{ email: 'maria@alfa.exemplo.test' }] });
  assert.equal(inval.ok, false);
  r = enviar(A, 's_tec', { arquivoId: ids.pdf, extras: [outroA], destinatarios: [{ email: 'maria@alfa.exemplo.test' }] });
  assert.equal(r.ok, true, r.message);
  deq(A.emails[2].attachments.map((b) => b._id), [ids.pdf, outroA]);
});

test('pedido repetido (duplo clique ou conexão que repete) não envia duas vezes', () => {
  const A = ambiente({ props: ZAPI });
  const p = { pedidoId: 'PEDIDOFIXO123456', arquivoId: A.D.ids.PGT.pdf, canais: { email: true, whatsapp: true }, destinatarios: [{ nome: 'MARIA CONTATO', email: 'maria@alfa.exemplo.test', celular: '62999990101' }] };
  const r1 = enviar(A, 's_tec', p), r2 = enviar(A, 's_tec', p);
  assert.equal(r1.ok, true, r1.message);
  assert.equal(r1.enviados, 2);
  assert.equal(r2.repetido, true);
  assert.equal(A.emails.length, 1);
  assert.equal(A.pedidos.filter((x) => /send-document/.test(x.url)).length, 1);
  assert.equal(A.tabelas.DOC_ENVIOS.length, 2);
});

test('registro no histórico do documento e do cliente', () => {
  const A = ambiente({ props: ZAPI });
  const id = A.D.ids['Certificado 2026-0377'].pdf;
  const r = enviar(A, 's_tec', { arquivoId: id, canais: { email: true, whatsapp: true }, cc: 'copia@alfa.exemplo.test', destinatarios: [{ nome: 'MARIA CONTATO', email: 'maria@alfa.exemplo.test', celular: '(62) 99999-0101' }, { nome: 'LUCIA PORTAL', email: 'lucia@alfa.exemplo.test' }] });
  assert.equal(r.ok, true, r.message);
  const linhas = A.tabelas.DOC_ENVIOS;
  assert.equal(linhas.length, 2);
  const em = linhas.find((l) => l.CANAL === 'EMAIL'), wa = linhas.find((l) => l.CANAL === 'WHATSAPP');
  assert.equal(em.DESTINO, 'maria@alfa.exemplo.test; lucia@alfa.exemplo.test');
  assert.equal(em.COPIA, 'copia@alfa.exemplo.test');
  assert.equal(wa.DESTINO, '5562999990101');
  for (const l of linhas) { assert.equal(l.SITUACAO, 'ENVIADO'); assert.equal(l.USUARIO_ID, 'u_tec'); assert.equal(l.CLIENTE_ID, 'cliA'); assert.equal(l.ARQUIVO_ID, id); assert.ok(l.QUANDO); }
  assert.equal(wa.MENSAGEM, 'Olá, Maria. Segue o documento.');
  const pedido = A.pedidos.find((x) => /send-document\/pdf$/.test(x.url));
  assert.equal(pedido.corpo.phone, '5562999990101');
  assert.match(pedido.corpo.document, /^data:application\/pdf;base64,/);
  assert.equal(pedido.corpo.fileName, A.D.arquivos[id].nome);
  assert.equal(pedido.cabecalhos['Client-Token'], ZAPI.ZAPI_CLIENT_TOKEN);
  const hDoc = A.ctx.EnviarDoc_apiHistorico('s_tec', { arquivoId: id });
  assert.equal(hDoc.itens.length, 2);
  assert.equal(hDoc.itens.find((i) => i.canal === 'WhatsApp').destino, '(62) 99999-0101');
  assert.equal(A.ctx.EnviarDoc_apiHistorico('s_tec', { clienteId: 'cliA' }).itens.length, 2);
  assert.equal(A.ctx.EnviarDoc_apiHistorico('s_tec', { clienteId: 'cliB' }).itens.length, 0);
  // pasta do cliente: o documento aparece com o último envio
  const pc = A.ctx.EnviarDoc_apiDocumentosDoCliente('s_tec', { clienteId: 'cliA' });
  assert.equal(pc.ok, true, pc.message);
  const doc = pc.documentos.find((d) => d.arquivoId === id);
  assert.ok(doc && doc.ultimoEnvio && doc.ultimoEnvio.situacao === 'ENVIADO');
  assert.ok(!pc.documentos.some((d) => d.arquivoId === A.D.ids.B.pdf), 'documento do cliente B na pasta do A');
  assert.ok(pc.documentos.length >= 12);
  // envios recentes (Arquivo de documentos) com filtro
  assert.equal(A.ctx.EnviarDoc_apiEnvios('s_tec', { situacao: 'FALHOU' }).itens.length, 0);
  assert.equal(A.ctx.EnviarDoc_apiEnvios('s_tec', { clienteId: 'cliA' }).itens.length, 2);
});

test('e-mail sem caixa pessoal: sai pela caixa do sistema com "responder para" o usuário', () => {
  const A = ambiente();
  const r = enviar(A, 's_tec', { arquivoId: A.D.ids.PGT.pdf, destinatarios: [{ email: 'maria@alfa.exemplo.test' }] });
  assert.equal(r.ok, true, r.message);
  assert.equal(A.emails[0].replyTo, 'tiago@metrolabs.exemplo.test');
  assert.equal(A.emails[0].to, 'maria@alfa.exemplo.test');
  assert.match(A.emails[0].name, /TIAGO TECNICO \| Metrolabs/);
  assert.match(A.emails[0].htmlBody, /responder/i);
  assert.equal(A.tabelas.DOC_ENVIOS[0].MODO, 'SISTEMA');
  // usuário sem e-mail: sem responder-para e a janela avisa
  const p = A.ctx.EnviarDoc_apiPreparar('s_sem', { arquivoId: A.D.ids.PGT.pdf });
  assert.equal(p.canais.email.modo, 'SISTEMA');
  assert.match(p.canais.email.texto, /não tem e-mail/);
  enviar(A, 's_sem', { arquivoId: A.D.ids.PGT.pdf, destinatarios: [{ email: 'maria@alfa.exemplo.test' }] });
  assert.equal(A.emails[1].replyTo, undefined);
  // com o e-mail integrado: usa a caixa da pessoa; se ela responder semCaixa, cai na caixa do sistema
  const chamadas = [];
  const B = ambiente({ emailIntegrado: (m) => { chamadas.push(m); return { ok: true, id: 'msg-1' }; } });
  enviar(B, 's_tec', { arquivoId: B.D.ids.PGT.pdf, cc: 'copia@alfa.exemplo.test', destinatarios: [{ email: 'maria@alfa.exemplo.test' }] });
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].usuarioId, 'u_tec');
  assert.equal(chamadas[0].para, 'maria@alfa.exemplo.test');
  assert.equal(chamadas[0].cc, 'copia@alfa.exemplo.test');
  assert.equal(chamadas[0].anexos.length, 1);
  assert.equal(B.emails.length, 0);
  assert.equal(B.tabelas.DOC_ENVIOS[0].MODO, 'USUARIO');
  const C = ambiente({ emailIntegrado: () => ({ ok: false, semCaixa: true }) });
  enviar(C, 's_tec', { arquivoId: C.D.ids.PGT.pdf, destinatarios: [{ email: 'maria@alfa.exemplo.test' }] });
  assert.equal(C.emails.length, 1);
  assert.equal(C.emails[0].replyTo, 'tiago@metrolabs.exemplo.test');
});

test('falha do WhatsApp fica registrada com o motivo e "tentar de novo" cria uma linha nova ligada à original', () => {
  let falhar = true;
  const A = ambiente({ props: ZAPI, responder: (url) => (falhar ? { cod: 400, corpo: { error: 'phone not exists' } } : { cod: 200, corpo: { messageId: 'OK1' } }) });
  const r = enviar(A, 's_tec', { arquivoId: A.D.ids.PGT.pdf, canais: { whatsapp: true }, destinatarios: [{ nome: 'MARIA', celular: '62999990101' }] });
  assert.equal(r.ok, true, r.message);
  assert.equal(r.falhas, 1);
  const linha = A.tabelas.DOC_ENVIOS[0];
  assert.equal(linha.SITUACAO, 'FALHOU');
  assert.match(linha.MOTIVO, /recusou o envio \(código 400\): phone not exists/);
  assert.ok(!/TOKEN-TESTE|INSTANCIA-TESTE|CLIENT-TESTE/.test(linha.MOTIVO), 'motivo vazou a chave');
  let h = A.ctx.EnviarDoc_apiHistorico('s_tec', { arquivoId: A.D.ids.PGT.pdf });
  assert.equal(h.itens[0].podeTentar, true);
  falhar = false;
  const t1 = A.ctx.EnviarDoc_apiTentarDeNovo('s_tec', { envioId: linha.ID, pedidoId: 'TENTATIVA0001' });
  assert.equal(t1.ok, true, t1.message);
  assert.equal(t1.itens[0].situacao, 'ENVIADO');
  assert.equal(A.tabelas.DOC_ENVIOS.length, 2);
  assert.equal(A.tabelas.DOC_ENVIOS[1].TENTATIVA_DE, linha.ID);
  assert.equal(A.tabelas.DOC_ENVIOS[0].SITUACAO, 'FALHOU', 'a original não pode ser apagada nem reescrita');
  // a mesma tentativa repetida não manda de novo; e a original não pode ser refeita outra vez
  assert.equal(A.ctx.EnviarDoc_apiTentarDeNovo('s_tec', { envioId: linha.ID, pedidoId: 'TENTATIVA0001' }).repetido, true);
  const t2 = A.ctx.EnviarDoc_apiTentarDeNovo('s_tec', { envioId: linha.ID, pedidoId: 'TENTATIVA0002' });
  assert.equal(t2.ok, false);
  assert.match(t2.message, /já foi tentado de novo/);
  h = A.ctx.EnviarDoc_apiHistorico('s_tec', { arquivoId: A.D.ids.PGT.pdf });
  assert.equal(h.itens.find((i) => i.id === linha.ID).podeTentar, false);
  assert.equal(A.pedidos.filter((x) => /send-document/.test(x.url)).length, 2);
  // sem Z-API configurada: falha com o caminho para resolver
  const B = ambiente();
  const p = B.ctx.EnviarDoc_apiPreparar('s_tec', { arquivoId: B.D.ids.PGT.pdf });
  assert.equal(p.canais.whatsapp.ok, false);
  assert.match(p.canais.whatsapp.texto, /Chaves e senhas/);
  enviar(B, 's_tec', { arquivoId: B.D.ids.PGT.pdf, canais: { whatsapp: true }, destinatarios: [{ celular: '62999990101' }] });
  assert.equal(B.tabelas.DOC_ENVIOS[0].SITUACAO, 'FALHOU');
  assert.match(B.tabelas.DOC_ENVIOS[0].MOTIVO, /Chaves e senhas/);
  // celular fixo recusado antes de enviar, com o motivo
  const C = ambiente({ props: ZAPI });
  const rc = enviar(C, 's_tec', { arquivoId: C.D.ids.PGT.pdf, canais: { whatsapp: true }, destinatarios: [{ celular: '6232220000' }] });
  assert.equal(rc.ok, false);
  assert.match(rc.message, /não é um celular com WhatsApp/);
  assert.equal(C.tabelas.DOC_ENVIOS.length, 0);
});

test('documento com dado pessoal de colaborador não sai; documento interno pede destinatário; cliente não envia', () => {
  const A = ambiente();
  const c = A.ctx.EnviarDoc_apiPreparar('s_tec', { arquivoId: A.D.ids.CONDUTA.pdf });
  assert.equal(c.bloqueado, true);
  assert.match(c.motivoBloqueio, /LGPD/);
  const e = enviar(A, 's_tec', { arquivoId: A.D.ids.CONDUTA.pdf, destinatarios: [{ email: 'alguem@exemplo.test' }] });
  assert.equal(e.ok, false);
  assert.equal(A.emails.length, 0);
  const f = A.ctx.EnviarDoc_apiPreparar('s_tec', { arquivoId: A.D.ids.FROTA.pdf });
  assert.equal(f.documento.classe, 'INTERNO');
  assert.equal(f.contatos.length, 0);
  assert.ok(f.equipe.length >= 1 && f.equipe.every((u) => !('celular' in u) && !('email' in u)), 'a tela não recebe telefone/e-mail da equipe');
  const ef = enviar(A, 's_tec', { arquivoId: A.D.ids.FROTA.pdf, destinatarios: [{ usuarioId: 'u_tec' }] });
  assert.equal(ef.ok, true, ef.message);
  assert.equal(A.emails[0].to, 'tiago@metrolabs.exemplo.test');
  const cli = A.ctx.EnviarDoc_apiPreparar('s_cli', { arquivoId: A.D.ids.PGT.pdf });
  assert.equal(cli.ok, false);
  assert.match(cli.message, /não envia documentos/);
  assert.equal(enviar(A, 's_cli', { arquivoId: A.D.ids.PGT.pdf, destinatarios: [{ email: 'x@exemplo.test' }] }).ok, false);
});

test('fora do horário comercial a janela avisa e o envio fica marcado, sem bloquear', () => {
  const A = ambiente({ agora: Date.parse('2026-10-18T21:00:00-03:00') }); // domingo à noite
  const p = A.ctx.EnviarDoc_apiPreparar('s_tec', { arquivoId: A.D.ids.PGT.pdf });
  assert.equal(p.horario.fora, true);
  assert.match(p.horario.texto, /fora do horário comercial/);
  const r = enviar(A, 's_tec', { arquivoId: A.D.ids.PGT.pdf, destinatarios: [{ email: 'maria@alfa.exemplo.test' }] });
  assert.equal(r.enviados, 1);
  assert.equal(A.tabelas.DOC_ENVIOS[0].FORA_HORARIO, 'SIM');
});

test('depois de gerar: conferir reconhece o documento (PDF) e ignora foto e documento bloqueado', () => {
  const A = ambiente();
  const ids = A.D.ids['Laudo NR13 0042'];
  const r = A.ctx.EnviarDoc_apiConferir('s_tec', { ids: [ids.html, ids.pdf] });
  assert.equal(r.documento.arquivoId, ids.pdf);
  assert.equal(r.documento.htmlId, ids.html);
  assert.equal(r.documento.cliente, 'HOSPITAL ALFA TESTE');
  assert.equal(A.ctx.EnviarDoc_apiConferir('s_tec', { ids: [A.D.ids.FOTO.pdf] }).documento, null);
  assert.equal(A.ctx.EnviarDoc_apiConferir('s_tec', { ids: [A.D.ids.CONDUTA.pdf] }).documento, null);
});

/* ---------------- tela (JS_EnviarDoc.html) ---------------- */

function tela() {
  const html = ler('JS_EnviarDoc.html');
  const js = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  const chamadas = [];
  const el = () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, insertAdjacentHTML() {}, closest: () => null });
  const criarRun = (ok, falha) => new Proxy({
    withSuccessHandler: (f) => criarRun(f, falha),
    withFailureHandler: (f) => criarRun(ok, f),
    withUserObject: () => criarRun(ok, falha)
  }, { get: (t, n) => (n in t ? t[n] : function () { chamadas.push({ fn: n, args: Array.from(arguments), ok, falha }); }) });
  const proxyRun = criarRun(null, null);
  const win = { google: { script: { run: proxyRun } }, crypto: { randomUUID: () => 'abcd-ef' }, SGO_getSessionId: () => 'sid' };
  const ctx = vm.createContext({
    window: win, google: win.google, console, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, Proxy, JSON, Math, URLSearchParams, URL,
    location: { search: '', href: 'https://sgo.exemplo.test/', pathname: '/', hash: '' }, history: { replaceState() {} },
    USER_CONTEXT: { perfil: 'TECNICO' }, alert() {},
    document: { readyState: 'complete', body: el(), getElementById: () => null, createElement: el, addEventListener() {}, activeElement: null },
    MutationObserver: class { observe() {} }
  });
  vm.runInContext(js, ctx, { filename: 'JS_EnviarDoc.html' });
  return { ctx, win, chamadas };
}

test('tela: o script carrega, o Index inclui o componente e a ajuda tem a janela', () => {
  const T = tela();
  assert.equal(typeof T.win.SGO_EnviarDoc.abrir, 'function');
  assert.ok(/include\('JS_EnviarDoc'\)/.test(ler('Index.html')), 'Index.html não inclui JS_EnviarDoc');
  // a ajuda junta a tela própria e o passo em cada tela de documento
  const c = vm.createContext({ console, JSON, Object, Array, String });
  vm.runInContext(ler('SGO_EnviarDoc_Ajuda.js'), c);
  const todas = { autoclave: { titulo: 'Autoclaves', passos: [{ titulo: 'Emitir', itens: ['x'] }] }, documentos: { titulo: 'Arquivo de documentos' } }, ordem = ['autoclave', 'documentos'];
  c.SGO_ajudaComplementos_(todas, ordem);
  assert.ok(todas.enviar_documento && ordem.includes('enviar_documento'));
  assert.ok(todas.autoclave.passos.some((p) => /Enviar o documento ao cliente/.test(p.titulo)));
  assert.ok(todas.documentos.passos.some((p) => /Envios de documentos/.test(p.itens[0])));
  c.SGO_ajudaComplementos_(todas, ordem); // de novo: não repete
  assert.equal(todas.autoclave.passos.filter((p) => /Enviar o documento/.test(p.titulo)).length, 1);
  assert.ok(!/burr/i.test(ler('SGO_EnviarDoc_Ajuda.js') + ler('SGO_EnviarDoc.js') + ler('JS_EnviarDoc.html')));
});

test('tela: a barra "Documento salvo" reconhece a resposta de cada gerador e ignora listas', () => {
  const T = tela();
  const ids = T.win.SGO_EnviarDoc._idsDoResultado;
  const U = (id) => 'https://sgo.exemplo.test/arquivos/' + id;
  const respostas = {
    certificadoEquipamento: { ok: true, html: '<html>' + U('NAOCONTA') + '</html>', pdfId: 'PDF001', pdfUrl: U('PDF001'), htmlId: 'HTM001', htmlUrl: U('HTM001'), pastaUrl: 'https://sgo.exemplo.test/pastas/P1' },
    planilhaDados: { ok: true, pdfId: 'PDF002', pdfSalvoUrl: U('PDF002'), sheetUrl: 'https://sgo.exemplo.test/planilhas/S1' },
    nr13: { ok: true, laudoId: 'L1', numeroLaudo: '0042', linkPdf: U('PDF003'), htmlId: 'HTM003' },
    declaracao: { ok: true, fileId: 'PDF004', fileName: 'Declaracao.pdf', url: U('PDF004'), htmlId: 'HTM004' },
    frota: { ok: true, link: U('PDF005'), htmlUrl: U('HTM005') },
    certcalDispatch: { ok: true, data: { documento: { pdfUrl: U('PDF006') } } },
    modeloOficial: { ok: true, modelo: 'OFICIAL', docUrl: 'https://sgo.exemplo.test/arquivos/DOC007', pdfUrl: U('PDF007') },
    googleDrive: { ok: true, url: 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view' }
  };
  deq(ids(respostas.certificadoEquipamento), ['PDF001', 'HTM001']);
  deq(ids(respostas.planilhaDados), ['PDF002']);
  deq(ids(respostas.nr13), ['PDF003', 'HTM003']);
  deq(ids(respostas.declaracao), ['PDF004', 'HTM004']);
  deq(ids(respostas.frota), ['PDF005', 'HTM005']);
  deq(ids(respostas.certcalDispatch), ['PDF006']);
  deq(ids(respostas.modeloOficial), ['DOC007', 'PDF007']);
  deq(ids(respostas.googleDrive), ['1AbCdEfGhIjKlMnOp']);
  // lista de documentos (consulta) não abre a barra
  deq(ids({ ok: true, itens: [1, 2, 3, 4, 5].map((n) => ({ url: U('L' + n + '00000') })) }), []);
  // a observação chama o servidor só para geração, nunca para foto/listagem
  T.win.SGO_EnviarDoc.observar('NR13_apiEmitirLaudo', respostas.nr13);
  T.win.SGO_EnviarDoc.observar('Frota_apiUploadFoto', { ok: true, url: U('FOTO1') });
  T.win.SGO_EnviarDoc.observar('PgtPop_apiListarDocumentos', { ok: true, url: U('PDF009') });
  const conf = T.chamadas.filter((c) => c.fn === 'EnviarDoc_apiConferir');
  assert.equal(conf.length, 1);
  deq(conf[0].args[1].ids, ['PDF003', 'HTM003']);
  assert.equal(conf[0].args[1].dica.numero, '0042');
  // o google.script.run envolvido continua chamando a função original com os mesmos argumentos
  let recebido = null;
  T.win.google.script.run.withSuccessHandler((r) => { recebido = r; }).Modulo_apiGerar('a', 'b');
  const ch = T.chamadas.find((c) => c.fn === 'Modulo_apiGerar');
  deq(ch.args, ['a', 'b']);
  ch.ok({ ok: true, valor: 1 });
  deq(recebido, { ok: true, valor: 1 });
});
