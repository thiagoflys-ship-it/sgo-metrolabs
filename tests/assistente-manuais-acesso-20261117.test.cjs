// Assistente "Tire sua dúvida": manuais restritos e parágrafos em duas versões (17/11/2026). Decisões do dono:
//  1. Os três manuais que ficavam fora da base entram, cada um só para quem abre a tela correspondente:
//     - Painel financeiro: só a lista de sigilo do Financeiro (OMIE_SIGILO_CONTAS); o perfil Financeiro fora da lista não lê;
//     - Ganhos dos vendedores: quem vê a tela (regra real de SGO_Ganhos_Vendedores.js › GV_veTela_); o contrato individual de
//       vendedor só para a lista de sigilo e a Diretoria; os recebimentos do Omie só para a lista de sigilo;
//     - Portal do cliente (interno): a caixa PORTAL_CLIENTE_CONTRATOS_VER; o reajuste dos contratos e o Painel financeiro só para a
//       lista de sigilo; a conta de cliente nunca lê.
//  2. Parágrafos que ficaram em duas versões depois da união docs/ + produção: fica a versão que descreve a tela de hoje (conferida no
//     código) e a outra sai do docs/ (lista e evidências em output/assistente-manuais-20261117/RELATORIO.md).
// Confere com o código real (SGO_Assistente.js, núcleo, base gerada, ajuda das telas, SGO_Ganhos_Vendedores.js, SGO_PortalCliente*.js
// e SGO_Omie_Sigilo.js): quem pode e quem não pode ler cada manual (nem o título chega a quem não pode), as marcas de seção, que
// nenhum parágrafo duplicado ficou e que nenhum parágrafo da base anterior se perdeu sem justificativa.
// Só dados de teste. Uso: DEST=<legado> node --require <fontes.cjs> tests/assistente-manuais-acesso-20261117.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { criarUtilities, criarSession } = require('./_simulacros_gas.cjs');
const gerador = require('../_tools/gerar_base_assistente.cjs');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const DOCS = path.join(__dirname, '../docs');
const BASE_ANTES = path.join(__dirname, '../output/assistente-manuais-20261117/SGO_AssistenteManuais.antes.js');
const ler = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8').replace(/\r\n/g, '\n');
const PAINEL = 'MANUAL_PAINEL_FINANCEIRO.md', GANHOS = 'MANUAL_GANHOS_VENDEDORES.md', PORTAL = 'MANUAL_MODULO_PORTAL_CLIENTE.md';

// Pessoas de teste. Lista de sigilo: administradora, Fabi (Financeiro) e Dora (Diretoria). Fora dela: Felipe (Financeiro), Davi
// (Diretoria), o gestor técnico, a gestora comercial, a vendedora, o técnico e a conta de cliente.
const USUARIOS = [
  { ID: 'u_adm', USUARIO: 'admin', NOME: 'ANA ADMINISTRADORA TESTE', PERFIL: 'ADMIN', AREA: '', STATUS: 'ATIVO' },
  { ID: 'u_fin', USUARIO: 'fin', NOME: 'FABI FINANCEIRO TESTE', PERFIL: 'FINANCEIRO', AREA: 'FINANCEIRO', STATUS: 'ATIVO' },
  { ID: 'u_dir', USUARIO: 'dir', NOME: 'DORA DIRETORA TESTE', PERFIL: 'DIRETORIA', AREA: '', STATUS: 'ATIVO' },
  { ID: 'u_fin2', USUARIO: 'fin2', NOME: 'FELIPE FINANCEIRO FORA TESTE', PERFIL: 'FINANCEIRO', AREA: 'FINANCEIRO', STATUS: 'ATIVO' },
  { ID: 'u_dir2', USUARIO: 'dir2', NOME: 'DAVI DIRETOR FORA TESTE', PERFIL: 'DIRETORIA', AREA: '', STATUS: 'ATIVO' },
  { ID: 'u_ges', USUARIO: 'ges', NOME: 'GIL GESTOR TECNICO TESTE', PERFIL: 'GESTOR', AREA: 'TECNICA', STATUS: 'ATIVO' },
  { ID: 'u_gcom', USUARIO: 'gcom', NOME: 'GINA GESTORA COMERCIAL TESTE', PERFIL: 'GESTOR', AREA: 'COMERCIAL', STATUS: 'ATIVO' },
  { ID: 'u_com', USUARIO: 'com', NOME: 'CIDA VENDEDORA TESTE', PERFIL: 'COMERCIAL', AREA: 'COMERCIAL', STATUS: 'ATIVO' },
  { ID: 'u_tec', USUARIO: 'tec', NOME: 'TEO TECNICO TESTE', PERFIL: 'TECNICO', AREA: 'TECNICA', STATUS: 'ATIVO' },
  { ID: 'u_cli', USUARIO: 'cli', NOME: 'CLARA CLIENTE TESTE', PERFIL: 'CLIENTE', AREA: '', STATUS: 'ATIVO' }
];
const SIGILO = ['u_adm', 'u_fin', 'u_dir'];

function ambiente(o) {
  o = o || {};
  const tabelas = { CAD_USUARIOS: USUARIOS.map((u) => Object.assign({}, u)), GAN_CONTRATOS: [] };
  const sessoes = {};
  USUARIOS.forEach((u) => { sessoes['s_' + u.ID.slice(2)] = { userId: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: u.PERFIL, clienteId: u.PERFIL === 'CLIENTE' ? 'c1' : '' }; });
  const props = { OMIE_SIGILO_CONTAS: JSON.stringify(SIGILO) }, cache = {};
  let seq = 0;
  const ctx = vm.createContext({
    console, Date, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt, encodeURIComponent,
    Utilities: criarUtilities(), Session: criarSession(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, getProperties: () => Object.assign({}, props) }) },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }) },
    HtmlService: { createHtmlOutputFromFile: (n) => ({ getContent: () => ler(n + '.html') }) },
    SGO_DATA: {
      getAll: (t) => { if (!tabelas[t]) throw new Error('Aba não encontrada: ' + t); return tabelas[t].map((r) => Object.assign({}, r)); },
      getById: (t, id) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); return r ? Object.assign({}, r) : null; },
      insert: (t, d) => { const r = Object.assign({ ID: 'id' + (++seq) }, d); (tabelas[t] = tabelas[t] || []).push(r); return Object.assign({}, r); },
      update: (t, id, d) => { const r = (tabelas[t] || []).find((x) => String(x.ID) === String(id)); if (!r) return false; Object.assign(r, d); return true; }
    },
    SGO_CFG: { SHEETS: { CAD_USUARIOS: 'CAD_USUARIOS' } },
    exigirSessao: (sid) => { if (!sessoes[sid]) throw new Error('Sessão inválida'); return sessoes[sid]; },
    // o dono do sistema é a conta admin
    Chaves_ehDonoUsuario_: (login) => String(login || '').toLowerCase() === 'admin',
    // vendedora da equipe comercial (o Comercial não é carregado aqui; a regra do vendedor é dele)
    Com_nivelDe_: (p) => ({ vendedor: p && p.id === 'u_com' })
  });
  const arquivos = ['SGO_Utilis.js', 'SGO_Ajuda.js'].concat(fs.readdirSync(pastaLegado).filter((f) => /^SGO_Ajuda_.*\.js$/.test(f)).sort(),
    ['SGO_EnviarDoc_Ajuda.js', 'SGO_AssistenteNucleo.js', 'SGO_AssistenteManuais.js', 'SGO_Assistente.js', 'SGO_Omie_Sigilo.js'],
    o.semModulos ? [] : ['SGO_Ganhos_Vendedores.js', 'SGO_PortalCliente_Config.js', 'SGO_PortalCliente.js']);
  for (const f of arquivos) vm.runInContext(ler(f), ctx, { filename: f });
  const api = (sid, acao, dados) => JSON.parse(JSON.stringify(ctx.SGO_Assist_api(sid, acao, dados)));
  const P = (sid, pergunta, tela) => api(sid, 'perguntar', { pergunta, tela: tela || '' });
  return { ctx, tabelas, props, api, P };
}
const tudo = (r) => JSON.stringify(r);

/** Trechos de manual que chegam à pessoa (situação não nula), por arquivo, com as seções. */
function visiveis(a, sid) {
  const eu = a.ctx.SGO_Assist_eu_(sid);
  const base = a.ctx.SGO_Assist_base_(a.ctx.SGO_Assist_nivel_(eu));
  const r = {};
  base.trechos.filter((t) => t.tipo === 'manual').forEach((t) => {
    if (!a.ctx.SGO_Assist_situacao_(base, t, eu)) return;
    const arq = t.id.replace(/^man:/, '').replace(/#\d+$/, '') + '.md';
    (r[arq] = r[arq] || []).push(t);
  });
  return { r, base, eu };
}
const titulos = (l) => (l || []).map((t) => t.titulo + ' ' + t.texto).join('\n');

// ------------------------------------------------------------------ 1. gerador
test('1. gerador: os três manuais entram com a regra de acesso; marcas de seção conferidas', () => {
  for (const f of [PAINEL, GANHOS, PORTAL]) assert.ok(!gerador.IGNORAR.includes(f) && gerador.MAPA[f], f);
  assert.deepEqual(gerador.MAPA[PAINEL], { tela: 'omie', acesso: ['sigilo'] });
  assert.deepEqual(gerador.MAPA[GANHOS], { tela: 'ganhos_vendedores', acesso: ['ganhos'] });
  assert.deepEqual(gerador.MAPA[PORTAL], { tela: 'portal_cliente_contratos', acesso: ['portal_contratos'] });
  // marca desconhecida é recusada (palavra errada não pode abrir o manual para todos)
  assert.throws(() => gerador.lerManual('X.md', '# X\n\n## A\n\n<!-- assistente: acesso=sigilio -->\ntexto'), /regra de acesso desconhecida/);
  // a marca abaixo de "##" vale para as subseções; abaixo de "###", só para ela
  const m = gerador.lerManual('X.md', '# X\n\n## A\n\n<!-- assistente: acesso=sigilo -->\num\n\n### A1\n\ndois\n\n## B\n\ntrês\n\n### B1\n\n<!-- assistente: acesso=sigilo_diretoria -->\nquatro\n\n### B2\n\ncinco');
  assert.deepEqual(m.secoes.map((s) => [s.titulo, s.acesso || null]), [['A', ['sigilo']], ['A > A1', ['sigilo']], ['B', null], ['B > B1', ['sigilo_diretoria']], ['B > B2', null]]);
  // a base gravada é a que o gerador produz do docs/ atual
  const g = gerador.gerar(DOCS);
  assert.equal(ler('SGO_AssistenteManuais.js'), g.js, 'base em dia com o docs/');
  const man = (f) => g.js && JSON.parse(g.js.slice(g.js.indexOf('{'), g.js.lastIndexOf('}') + 1)).manuais.find((x) => x.arquivo === f);
  // Ganhos: o contrato da Mônica só em seção sigilo_diretoria; os recebimentos do Omie em seção sigilo
  const ga = man(GANHOS);
  for (const s of ga.secoes) {
    if (/M[ôo]nica/.test(s.titulo + s.texto)) assert.deepEqual(s.acesso, ['sigilo_diretoria'], 'Mônica: ' + s.titulo);
    if (/\bOmie\b/.test(s.titulo + s.texto)) assert.ok((s.acesso || []).includes('sigilo'), 'Omie: ' + s.titulo);
    if (!s.acesso) assert.ok(!/30\.000|60\.000|80\.000|2%|5%/.test(s.texto), 'faixas de contrato fora da seção restrita: ' + s.titulo);
  }
  // Portal: tudo que fala do Painel financeiro, da lista de sigilo ou da aprovação do reajuste fica em seção sigilo
  const po = man(PORTAL);
  for (const s of po.secoes) {
    if (/Painel financeiro|lista de sigilo|Reajustes de contratos/.test(s.titulo + ' ' + s.texto)) assert.ok((s.acesso || []).includes('sigilo'), 'Portal: ' + s.titulo);
  }
  assert.ok(po.secoes.some((s) => /Reajuste automático/.test(s.titulo) && (s.acesso || []).includes('sigilo')));
  assert.ok(po.secoes.some((s) => !s.acesso && /Registrar um contrato/.test(s.titulo)), 'a parte de uso continua sem marca');
});

// ------------------------------------------------------------------ 2. quem lê cada manual
test('2. cada manual só para quem abre a tela; nem o título chega a quem não pode', () => {
  const a = ambiente();
  const V = {};
  for (const u of USUARIOS.filter((x) => x.PERFIL !== 'CLIENTE')) V[u.ID] = visiveis(a, 's_' + u.ID.slice(2)).r;
  const le = (id, f) => !!(V[id][f] && V[id][f].length);
  // Painel financeiro: só a lista de sigilo
  assert.deepEqual(USUARIOS.filter((u) => u.PERFIL !== 'CLIENTE' && le(u.ID, PAINEL)).map((u) => u.ID).sort(), SIGILO.slice().sort());
  // Ganhos dos vendedores: quem vê a tela (caixas GANHOS_*: Financeiro e Diretoria; a vendedora da equipe; o dono); o técnico e
  // os gestores sem caixa, não
  const ganhos = USUARIOS.filter((u) => u.PERFIL !== 'CLIENTE' && le(u.ID, GANHOS)).map((u) => u.ID).sort();
  assert.deepEqual(ganhos, ['u_adm', 'u_com', 'u_dir', 'u_dir2', 'u_fin', 'u_fin2']);
  // Portal do cliente: caixa PORTAL_CLIENTE_CONTRATOS_VER (padrão: Administrador, Diretoria, gestores e gestão comercial)
  const portal = USUARIOS.filter((u) => u.PERFIL !== 'CLIENTE' && le(u.ID, PORTAL)).map((u) => u.ID).sort();
  assert.deepEqual(portal, ['u_adm', 'u_dir', 'u_dir2', 'u_gcom', 'u_ges']);
  // seções restritas dentro dos manuais
  const tem = (id, f, re) => re.test(titulos(V[id][f]));
  assert.ok(tem('u_fin', GANHOS, /Mônica/) && tem('u_dir2', GANHOS, /Mônica/) && tem('u_adm', GANHOS, /Mônica/), 'contrato da Mônica: lista de sigilo e Diretoria');
  for (const id of ['u_fin2', 'u_com']) {
    assert.ok(!tem(id, GANHOS, /Mônica|30\.000|1\.500,00/), id + ' não lê o contrato de outra pessoa');
    assert.ok(tem(id, GANHOS, /Fluxo do fechamento|Conferir \(vendedor\)/), id + ' lê a parte de uso');
  }
  assert.ok(tem('u_fin', GANHOS, /Recebimentos do Omie/) && !tem('u_dir2', GANHOS, /Recebimentos do Omie/) && !tem('u_fin2', GANHOS, /Omie/), 'recebimentos do Omie: só a lista de sigilo');
  assert.ok(tem('u_adm', PORTAL, /Reajuste automático|Painel financeiro/) && tem('u_dir', PORTAL, /Painel financeiro > Reajustes de contratos/), 'reajuste: lista de sigilo');
  for (const id of ['u_dir2', 'u_ges', 'u_gcom']) {
    assert.ok(!tem(id, PORTAL, /Painel financeiro|lista de sigilo|Reajuste automático/), id + ' não lê o reajuste nem o Painel financeiro');
    assert.ok(tem(id, PORTAL, /Registrar um contrato/), id + ' lê a parte de uso');
  }
  // quem está fora da lista nem tem o Painel na base (vocabulário, correção de digitação e estatística da busca incluídos)
  for (const sid of ['s_fin2', 's_dir2', 's_tec', 's_com']) {
    const { base } = visiveis(a, sid);
    assert.ok(!base.trechos.some((t) => /MANUAL_PAINEL_FINANCEIRO/.test(t.id) || (t.acesso || []).includes('sigilo')), sid);
  }
  assert.ok(!visiveis(a, 's_tec').base.trechos.some((t) => (t.acesso || []).includes('sigilo_diretoria')), 'contrato de vendedor fora da base geral');
});

// ------------------------------------------------------------------ 3. de ponta a ponta, pela pergunta
test('3. pela pergunta: a resposta e as fontes seguem as mesmas regras; conta de cliente não usa o assistente', () => {
  const a = ambiente();
  const fontes = (r) => tudo(r.trechos || []) + (r.fontes || []).join(' ') + ' ' + tudo(r.passos || []) + ' ' + (r.resumo || '');
  // Painel financeiro
  const qp = 'como funciona a nota de saúde financeira e a foto diária do painel financeiro';
  const rf = a.P('s_fin', qp);
  assert.match(fontes(rf), /Manual: .*Painel financeiro|MANUAL_PAINEL_FINANCEIRO/i, tudo(rf));
  for (const sid of ['s_fin2', 's_dir2', 's_tec']) {
    const r = a.P(sid, qp);
    assert.ok(!/MANUAL_PAINEL_FINANCEIRO|Manual: .*Painel financeiro/i.test(fontes(r)), sid + ' ' + tudo(r));
  }
  // Ganhos: o contrato da Mônica
  const qg = 'quais são as faixas do contrato de comissão da Mônica';
  assert.match(fontes(a.P('s_dir2', qg)), /Mônica/);
  for (const sid of ['s_com', 's_fin2', 's_tec']) assert.ok(!/30\.000|1\.500,00|negocia[çc][ãa]o da M[ôo]nica/.test(fontes(a.P(sid, qg))), sid);
  // Portal: aprovação do reajuste
  const qr = 'quem aprova o reajuste do contrato pelo índice do banco central';
  assert.match(fontes(a.P('s_adm', qr)), /Painel financeiro|Reajuste autom/);
  for (const sid of ['s_ges', 's_gcom', 's_dir2', 's_tec']) assert.ok(!/Painel financeiro > Reajustes|lista de sigilo|MANUAL_MODULO_PORTAL_CLIENTE#.*Reajuste autom/.test(fontes(a.P(sid, qr))), sid);
  // Portal: a parte de uso chega ao gestor e não chega ao técnico
  const qc = 'como registro o contrato de um cliente no portal do cliente';
  assert.match(fontes(a.P('s_ges', qc)), /MANUAL_MODULO_PORTAL_CLIENTE|Portal do cliente/);
  assert.ok(!/MANUAL_MODULO_PORTAL_CLIENTE|Portal do cliente — manual interno/.test(fontes(a.P('s_tec', qc))), 'técnico não lê o manual interno');
  // conta de cliente: o assistente é da equipe interna
  const rc = a.ctx.SGO_Assist_api('s_cli', 'perguntar', { pergunta: qc });
  assert.ok(rc && (rc.ok === false || rc.erro || rc.message), tudo(rc));
  assert.match(tudo(rc), /equipe interna/);
});

// ------------------------------------------------------------------ 4. sem os módulos (teste isolado): o padrão da tela, e erro fecha
test('4. sem os módulos carregados vale o padrão de cada tela; erro na conferência fecha o acesso', () => {
  const a = ambiente({ semModulos: true });
  const le = (sid, f) => !!(visiveis(a, sid).r[f] || []).length;
  assert.ok(le('s_ges', PORTAL) && !le('s_tec', PORTAL) && !le('s_fin2', PORTAL));
  assert.ok(le('s_com', GANHOS) && le('s_fin2', GANHOS) && !le('s_ges', GANHOS) && !le('s_tec', GANHOS));
  assert.ok(le('s_fin', PAINEL) && !le('s_fin2', PAINEL));
  // a conferência que falha não abre o manual
  a.ctx.PCl_eu_ = () => { throw new Error('falha simulada'); };
  a.ctx.PCl_pode_ = () => true;
  assert.ok(!le('s_ges', PORTAL), 'erro = sem acesso');
});

// ------------------------------------------------------------------ 5. parágrafos em duas versões
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const tok = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 2));
const contido = (a, b) => { const A = tok(a), B = tok(b); let n = 0; A.forEach((w) => { if (B.has(w)) n++; }); return n / (A.size || 1); };

test('5. nenhum parágrafo duplicado: o que veio da produção não repete outro parágrafo do mesmo manual', () => {
  const MARCA = /recuperado da base do assistente/;
  const achados = [];
  for (const f of fs.readdirSync(DOCS).filter((x) => /^MANUAL_.*\.md$/.test(x))) {
    const linhas = fs.readFileSync(path.join(DOCS, f), 'utf8').replace(/\r\n/g, '\n').split('\n');
    const blocos = []; let buf = [], rec = false;
    const fechar = () => { if (buf.length) blocos.push({ rec, texto: buf.join('\n') }); buf = []; };
    for (const l of linhas) {
      if (/^#{1,6}\s/.test(l)) { fechar(); rec = false; continue; }
      if (MARCA.test(l)) { fechar(); rec = true; continue; }
      if (!l.trim() || /^<\/?div/.test(l.trim())) { fechar(); continue; }
      buf.push(l);
    }
    fechar();
    for (const b of blocos.filter((x) => x.rec && tok(x.texto).size >= 8)) {
      for (const o of blocos.filter((x) => !x.rec)) {
        const c = contido(b.texto, o.texto);
        if (c >= 0.85) achados.push(f + ': ' + b.texto.slice(0, 90) + ' ~ ' + o.texto.slice(0, 60) + ' (' + c.toFixed(2) + ')');
      }
    }
  }
  assert.deepEqual(achados, []);
  // os pares resolvidos: a versão que não descreve a tela de hoje não volta
  const doc = (f) => fs.readFileSync(path.join(DOCS, f), 'utf8');
  const cf = doc('MANUAL_MODULO_CADEIA_FRIO.md'), co = doc('MANUAL_MODULO_COMERCIAL.md'), re = doc('MANUAL_MODULO_REPRESENTACAO.md');
  assert.ok(!/toque em \*\*Editar\*\* e atualize o número do certificado|registrador, Editar, atualize/.test(cf), 'registrador vencido: "Novo certificado", não "Editar"');
  assert.equal((cf.match(/Novo certificado/g) || []).length >= 2, true);
  assert.ok(!/evento \(porta ou energia\) começando com sensor fora da faixa, horário/.test(cf), 'evento fora da faixa no início não é trava (fica Inconclusivo)');
  assert.ok(!/"No início do evento havia sensor fora da faixa" \|/.test(cf), 'mensagem que o sistema não tem mais');
  assert.ok(!/executantes x viagens x valor/.test(co), 'Incentivo de Missão: executantes x missões');
  assert.ok(!/a viagem diluída entra nela/.test(co), 'o deslocamento diluído fica fora da sobra');
  assert.equal((co.match(/Como a equipe é pequena e nem sempre há gestor comercial/g) || []).length, 1);
  assert.match(co, /evento GS06\); a gestão comercial recebe pela mesma fila/);
  assert.ok(!/conta esse prazo até a conclusão do atendimento/.test(re), 'prazo da representada: o selo segue a etapa da régua');
  assert.ok(!/^## Régua de prazos do chamado da representada/m.test(re) && /^### 6\.3 Régua de prazos/m.test(re), 'régua: fica a tabela da 6.3');
  assert.equal((re.match(/Metrolabs · SGO\+ · versão de 11\/11\/2026/g) || []).length, 1);
  assert.match(re, /um dia de expediente tem 570 minutos/);
});

// ------------------------------------------------------------------ 6. nada perdido
test('6. nenhum parágrafo da base anterior se perdeu sem justificativa', { skip: !fs.existsSync(BASE_ANTES) && 'cópia da base anterior indisponível' }, () => {
  const carregar = (txt) => { const c = {}; vm.runInNewContext(txt, c); return c.SGO_ASSIST_MANUAIS; };
  const antes = carregar(fs.readFileSync(BASE_ANTES, 'utf8')), nova = carregar(ler('SGO_AssistenteManuais.js'));
  const pars = (m) => { const l = []; (m ? m.secoes : []).forEach((s) => s.texto.split(/\n+/).forEach((p) => { if (norm(p)) l.push(p); })); return l; };
  const N = Object.fromEntries(nova.manuais.map((m) => [m.arquivo, m]));
  // os três manuais novos entraram; nenhum saiu
  assert.deepEqual(Array.from(antes.manuais.map((m) => m.arquivo).filter((f) => !N[f])), []);
  for (const f of [PAINEL, GANHOS, PORTAL]) assert.ok(N[f] && N[f].secoes.length > 5, f);
  // parágrafos que saíram de propósito (a outra versão do par; ver RELATORIO.md) — identificados por um trecho
  const JUSTIFICADOS = [
    /toque em "Novo certificado", anexe o PDF do certificado novo e leia com IA; confira número, data da calibração/, // P1 (juntado ao item da lista)
    /toque em Editar e atualize o número do certificado, a validade e o PDF do certificado novo/, // P1
    /^Documentos novos, todos em A4, salvos na pasta do equipamento .*Relatório de ensaio \(seção 6, retrato\)/, // P2 (a lista ficou)
    /evento \(porta ou energia\) começando com sensor fora da faixa/, // P2
    /registrador, Editar, atualize número do certificado/, // P3
    /^"O registrador \.\.\. não está no cadastro de padrões" ou "estava vencido" \| Identificação digitada/, // P3
    /"No início do evento havia sensor fora da faixa"/, // P4
    /executantes x viagens x valor/, // P5
    /^Como a equipe é pequena e nem sempre há gestor comercial, a equipe comercial mantém o catálogo, com estes limites \(o servidor confere em toda gravação\): Cadastra/, // P6
    /vira pedido "aguardando aprovação da Diretoria"\. O pedido entra na Caixa de decisões da gestão comercial \("Preço do item \.\.\. aguardando aprovação", sem valores\), e a gestão recebe o aviso\. Até a decisão/, // P6 (ampliado)
    /"Decidir o preço" \(vê o preço atual, o pedido, o custo e o motivo\)/, // P6 (ampliado)
    /^Onde ficam o Kanban e o Gantt\? No menu do computador continuam os atalhos .*Diminua o desconto/, // P7
    /^Metrolabs · SGO\+ · versão de 11\/11\/2026 \(régua de prazos do chamado/, // P8
    /^2\. Prazos \((padrão do estudo, )?configuráveis por representada\)/, // P9
    /^Decisão do dono \(11\/11\/2026\): o chamado da representada não tem um prazo único; anda por etapas/, // P10
    /^[1-5]\. (Estudar o caso e agendar \(Metrolabs\)|Relatório do atendimento \(Metrolabs\)|Peça \(representada\)|Avaliação depois da peça \(Metrolabs\)|Pedir mais prazo:)/, // P10
    /^(Onde: caixa "Régua de prazos"|Quem age: na Metrolabs|Avisos: RP09|Na Assistência, o selo de prazo e a central seguem)/, // P10
    /^Trocar a prioridade na triagem mantém o prazo da representada\. Chamado comum ligado depois/, // P11
    /^Atenção: o SGO\+ conta esse prazo até a conclusão do atendimento/, // P11
    /^4\. "Importar e conciliar" grava os lançamentos e casa sozinho: mesmo final, valor com diferença até R\$ 0,05.*estorno e crédito são ignorados com o motivo/, // P12 (18/11/2026, achado M8: o estorno deixou de ser ignorado; o item 4 foi reescrito e o 5 explica o estorno)
    // 18/11/2026 (Pacote 1, decisão do dono): "WhatsApp nunca pelo Compras" deixou de ser verdade (GS08 a GS10 para o dono, a Diretoria e o
    // aprovador delegado): o parágrafo dos avisos de Compras foi reescrito
    /^Seguem a matriz de avisos aprovada: no sistema até resolver; e-mail só no resumo da manhã .*WhatsApp nunca pelo Compras/,
    // Ganhos dos vendedores e Portal não estavam na base anterior; nada deles conta aqui
  ];
  const perdidos = [];
  for (const m of antes.manuais) {
    const novos = pars(N[m.arquivo]), conj = new Set(novos.map(norm));
    for (const p of pars(m)) {
      if (conj.has(norm(p))) continue;
      if (JUSTIFICADOS.some((re) => re.test(p))) continue;
      // o mesmo parágrafo em outra "parte" da seção (a divisão em partes de até 1.800 letras mudou) ou juntado a outro
      if (novos.some((q) => contido(p, q) >= 0.95)) continue;
      perdidos.push(m.arquivo + ': ' + p.slice(0, 120));
    }
  }
  assert.deepEqual(perdidos, []);
});
