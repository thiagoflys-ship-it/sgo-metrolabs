// Janela "Avisos" ao entrar em cartões (31/10/2026, pedido do dono: "coloca um especialista para redesenhar e entregar
// esses avisos de forma melhor, tanto no celular quanto no computador, está muito desorganizado e não é possível entender
// nada claramente"). Código real de SGO_Alertas_Central.js (agrupamento) e SGO_Qualidade_Ocorrencias.js (resumo da
// janela) num contexto isolado; planilha, cache e sessão simulados.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const base = path.join(__dirname, '..', 'apps-script-imports', 'portal_sgo_versao_cnpj_db');
const ler = (f) => fs.readFileSync(path.join(base, f), 'utf8');

function ambiente(opcoes) {
  opcoes = opcoes || {};
  const cache = {};
  const ctx = vm.createContext({
    console,
    SGO_UTILS: {
      safe: (v) => (v === null || v === undefined ? '' : String(v)),
      safeUpper: (v) => (v === null || v === undefined ? '' : String(v)).toUpperCase()
    },
    SGO_CFG: { SHEETS: {} },
    SGO_DATA: { getAll: () => [] },
    Utilities: { formatDate: () => '31/10/2026 08:12' },
    CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = v; } }) },
    AlertasPadroes_config_: () => ({ ativo: !!opcoes.balaoPadroes, perfis: ['GESTOR'] })
  });
  vm.runInContext(ler('SGO_Alertas_Central.js'), ctx);
  vm.runInContext(ler('SGO_Qualidade_Ocorrencias.js'), ctx);
  ctx.__cache = cache;
  return ctx;
}

/** Itens como a central entrega para a tela (Pend_item_ + Pend_paraTela_). */
function itens(ctx, lista) {
  ctx.__lista = lista;
  return vm.runInContext('__lista.map(function (x) { var it = Pend_item_(x.tipo, x); it.meu = !!x.meu; return Pend_paraTela_(it); })', ctx);
}

function cenarioDaFoto(ctx) {
  const l = [];
  for (let k = 0; k < 76; k++) l.push({ tipo: 'padrao_vencido', id: 'P' + k, nome: 'PS-01.' + (10 + k), gravidade: 'CRITICO', dias: -(5 + k), titulo: 'Padrão PS-01.' + (10 + k) + ' vencido', publico: 'EQUIPE' });
  ['GFU5G11', 'PQB4394', 'PRD6C57', 'QWE1R23'].forEach((p, i) => l.push({ tipo: 'frota_rastreador_uso', id: 'R' + i, nome: p, gravidade: 'CRITICO', titulo: 'Veículo ' + p, detalhe: 'Andou sem retirada.', publico: 'GESTAO' }));
  l.push({ tipo: 'frota_caso', id: 'C1', nome: 'FC-2026-001', gravidade: 'CRITICO', titulo: 'Caso FC-2026-001 em análise', detalhe: 'Aberto há 9 dias.', oQueFazer: 'Decida a causa.', publico: 'GESTAO' });
  l.push({ tipo: 'documento_vencendo', id: 'D1', nome: 'Alvará', gravidade: 'ATENCAO', dias: 12, titulo: 'Alvará a vencer', publico: 'GESTAO' });
  const its = itens(ctx, l);
  return { ok: true, geradoEm: '31/10/2026 08:12', resumo: ctx.Pend_resumo_(its), grupos: ctx.Pend_agrupar_(its), itens: its };
}

test('o agrupamento da central passa a mandar até 3 exemplos, o que sobra e o prazo mais estourado', () => {
  const ctx = ambiente();
  const pend = cenarioDaFoto(ctx);
  const padroes = pend.grupos.find((g) => g.tipo === 'padrao_vencido');
  assert.equal(padroes.qtd, 76);
  assert.deepEqual(Array.from(padroes.exemplos), ['PS-01.10', 'PS-01.11', 'PS-01.12']);
  assert.equal(padroes.maisExemplos, 73);
  assert.equal(padroes.piorDias, -80);
  const caso = pend.grupos.find((g) => g.tipo === 'frota_caso');
  assert.deepEqual(Array.from(caso.exemplos), [], 'grupo de 1 já diz o nome no título');
  assert.equal(caso.maisExemplos, 0);
  assert.equal(caso.piorDias, null);
  // campos antigos continuam (Início, Painel de qualidade, COMMAND)
  for (const k of ['tipo', 'modulo', 'moduloNome', 'gravidade', 'rotulo', 'qtd', 'criticos', 'titulo', 'detalhe', 'oQueFazer', 'tela', 'ids']) assert.ok(k in padroes, k);
});

test('o resumo da janela mantém o texto corrido e manda os grupos estruturados para os cartões', () => {
  const ctx = ambiente();
  const pend = cenarioDaFoto(ctx);
  const item = ctx.Qualidade_itemResumoPendencias_({ perfil: 'DIRETORIA', userId: 'u1' }, pend);
  assert.equal(item.TIPO, 'PENDENCIAS');
  assert.match(item.ID, /^PEND:/);
  assert.match(item.DESCRICAO, /^Há 81 pendências críticas no SGO\+\. /, 'texto de quem lê só texto continua igual');
  assert.match(item.DESCRICAO, /Ver todas as pendências/);
  assert.deepEqual(JSON.parse(JSON.stringify(item.RESUMO)), { criticas: 81, grupos: 3, total: 82, geradoEm: '31/10/2026 08:12' });
  assert.equal(item.GRUPOS.length, 3, 'só os grupos críticos');
  for (const g of item.GRUPOS) {
    assert.ok(g.titulo, 'o quê');
    assert.ok(g.oQueFazer, 'o que fazer');
    assert.ok(g.tela && g.tela.tipo, 'para onde o "Abrir" leva');
    assert.ok(g.rotulo || g.porque, 'por quê (etiqueta ou detalhe)');
  }
  const caso = item.GRUPOS.find((g) => g.tipo === 'frota_caso');
  assert.equal(caso.porque, 'Aberto há 9 dias.', 'grupo de 1: o detalhe é o porquê');
  assert.equal(caso.oQueFazer, 'Decida a causa.');
  const padroes = item.GRUPOS.find((g) => g.tipo === 'padrao_vencido');
  assert.equal(padroes.titulo, '76 padrões de referência vencidos');
  assert.equal(padroes.rotulo, 'Bloqueia emissão');
  assert.deepEqual(JSON.parse(JSON.stringify(padroes.tela)), { tipo: 'atalho', alvo: 'padroes' });
  assert.equal(padroes.abrirLista, false);
});

test('ordem dos cartões: o que é da pessoa, depois prazo estourado, depois o resto na ordem da central', () => {
  const ctx = ambiente();
  const its = itens(ctx, [
    { tipo: 'frota_caso', id: 'C1', nome: 'FC-1', gravidade: 'CRITICO', titulo: 'Caso FC-1', publico: 'GESTAO' },
    { tipo: 'documento_vencido', id: 'D1', nome: 'Alvará', gravidade: 'CRITICO', dias: -12, titulo: 'Alvará vencido', publico: 'GESTAO' },
    { tipo: 'cnh_vencida', id: 'H1', nome: 'Rui', gravidade: 'CRITICO', dias: -3, titulo: 'CNH vencida', publico: 'GESTAO', meu: true }
  ]);
  const pend = { ok: true, geradoEm: '', resumo: ctx.Pend_resumo_(its), grupos: ctx.Pend_agrupar_(its), itens: its };
  const item = ctx.Qualidade_itemResumoPendencias_({ perfil: 'GESTOR', userId: 'u2' }, pend);
  assert.deepEqual(Array.from(item.GRUPOS, (g) => g.tipo), ['cnh_vencida', 'documento_vencido', 'frota_caso']);
  assert.equal(item.GRUPOS[1].prazoEstourado, true);
  assert.equal(item.GRUPOS[2].prazoEstourado, false);
});

test('"Prazo estourado" no título (chamado da Assistência sem dias) também sobe; grupo sem tela abre a lista filtrada', () => {
  const ctx = ambiente();
  ctx.PEND_TIPOS.ens_link = { modulo: 'auvo', um: 'x', varios: 'xs', rotulo: 'R', fazer: 'faça', tela: null, origem: 'AUVO' };
  const its = itens(ctx, [
    { tipo: 'frota_caso', id: 'C1', nome: 'FC-1', gravidade: 'CRITICO', titulo: 'Caso FC-1', publico: 'GESTAO' },
    { tipo: 'plano_atrasado', id: 'A1', gravidade: 'CRITICO', titulo: 'Prazo estourado: chamado CH-2026-0005 (CENTRAL)', detalhe: 'Prazo estourado em 28/10/2026.', publico: 'GESTAO' },
    { tipo: 'ens_link', id: 'L1', nome: 'O.S. 1', gravidade: 'CRITICO', titulo: 'O.S. 1', publico: 'GESTAO', tela: { tipo: 'link', url: 'https://exemplo.test/1' } },
    { tipo: 'ens_link', id: 'L2', nome: 'O.S. 2', gravidade: 'CRITICO', titulo: 'O.S. 2', publico: 'GESTAO', tela: { tipo: 'link', url: 'https://exemplo.test/2' } }
  ]);
  const pend = { ok: true, geradoEm: '', resumo: ctx.Pend_resumo_(its), grupos: ctx.Pend_agrupar_(its), itens: its };
  const item = ctx.Qualidade_itemResumoPendencias_({ perfil: 'GESTOR', userId: 'u3' }, pend);
  assert.equal(item.GRUPOS[0].tipo, 'plano_atrasado');
  const link = item.GRUPOS.find((g) => g.tipo === 'ens_link');
  assert.equal(link.abrirLista, true);
});

test('retorno só com texto, números, listas e objetos simples (nada de Date cru no google.script.run)', () => {
  const ctx = ambiente();
  const item = ctx.Qualidade_itemResumoPendencias_({ perfil: 'DIRETORIA', userId: 'u4' }, cenarioDaFoto(ctx));
  const visitar = (v, onde) => {
    assert.ok(!(v instanceof Date) && Object.prototype.toString.call(v) !== '[object Date]', 'Date cru em ' + onde);
    if (v && typeof v === 'object') Object.keys(v).forEach((k) => visitar(v[k], onde + '.' + k));
  };
  visitar(item, 'item');
  assert.deepEqual(JSON.parse(JSON.stringify(item)).GRUPOS.length, item.GRUPOS.length);
});

test('muitos grupos: no máximo 20 vão para a janela, e RESUMO.grupos diz quantos existem', () => {
  const ctx = ambiente();
  const tipos = Object.keys(ctx.PEND_TIPOS).filter((t) => ctx.PEND_TIPOS_COM_JANELA_PROPRIA.indexOf(t) < 0).slice(0, 25);
  const its = itens(ctx, tipos.map((t, i) => ({ tipo: t, id: 'X' + i, nome: 'N' + i, gravidade: 'CRITICO', titulo: 'T' + i, publico: 'GESTAO' })));
  const pend = { ok: true, geradoEm: '', resumo: ctx.Pend_resumo_(its), grupos: ctx.Pend_agrupar_(its), itens: its };
  const item = ctx.Qualidade_itemResumoPendencias_({ perfil: 'GESTOR', userId: 'u5' }, pend);
  assert.equal(item.RESUMO.grupos, 25);
  assert.equal(item.GRUPOS.length, 20);
});

test('"Estou ciente" continua só escondendo o mesmo conjunto por 20 horas', () => {
  const ctx = ambiente();
  const pend = cenarioDaFoto(ctx);
  const item = ctx.Qualidade_itemResumoPendencias_({ perfil: 'DIRETORIA', userId: 'u6' }, pend);
  ctx.exigirSessao = () => ({ userId: 'u6', perfil: 'DIRETORIA' });
  ctx.Qualidade_bootstrapOcorrencias_ = () => {};
  const r = ctx.Qualidade_apiMarcarCiencia('s', { ocorrenciaId: item.ID });
  assert.equal(r.ok, true);
  assert.equal(ctx.Qualidade_itemResumoPendencias_({ perfil: 'DIRETORIA', userId: 'u6' }, pend), null);
  assert.match(ler('SGO_Qualidade_Ocorrencias.js'), /QUALIDADE_PEND_VISTO_PREFIXO \+ sessao\.userId, id\.slice\(5\), 72000\)/);
});

test('a janela desenha cartões (um por grupo), "Abrir", "Ver todas as pendências" e "Estou ciente" fixo no rodapé', () => {
  const js = ler('JS_Core.html');
  assert.match(js, /function Avisos_cartao_\(g, i\)/);
  assert.match(js, /o\.TIPO === "PENDENCIAS" && o\.GRUPOS && o\.GRUPOS\.length/, 'sem GRUPOS (servidor antigo) cai no texto');
  assert.match(js, /onclick="Avisos_abrirGrupo_\(' \+ i \+ '\)"/);
  assert.match(js, /Ver todas as pendências/);
  assert.match(js, /só esconde este resumo por 20 horas\. Não resolve nenhuma pendência/);
  assert.match(js, /class="btn-primary avisos-ciente-pend"/);
  assert.match(js, /Por quê/);
  assert.match(js, /O que fazer/);
  assert.match(js, /Inicio_executarAcao_\(g\.tela\)/, '"Abrir" usa o mesmo caminho das telas do Início');
  const css = ler('UI_Estilos.html');
  assert.match(css, /#avisosLoginOverlay \.avisos-login-modal--pend/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*avisos-rodape-botoes button \{ width: 100%; min-height: 48px/);
  assert.match(css, /overflow-x: hidden/);
});

test('ajuda da tela e manual descrevem a janela nova', () => {
  const ajuda = ler('SGO_Ajuda_Qualidade.js');
  assert.match(ajuda, /um cartão por grupo/i);
  assert.match(ajuda, /Abrir/);
  const manual = fs.readFileSync(path.join(__dirname, '..', 'docs', 'MANUAL_MATRIZ_DE_AVISOS.md'), 'utf8');
  assert.match(manual, /Janela "Avisos" ao entrar/);
});
