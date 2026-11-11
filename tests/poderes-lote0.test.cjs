// Acessos por caixas, LOTE 0 (10/11/2026): catálogo de 150 poderes, exceções por pessoa, histórico, API e tela Acessos.
// Equivalência: sem exceção gravada, SGO_pode_ responde o mesmo que as funções de hoje do legado, nas 23 contas reais e com a
// configuração real (inclusive GES_CONFIG.gestoresPorArea, que o catalogo.json supôs vazio). Só a conta do dono muda (dono =
// tudo), nas 3 caixas documentadas no catálogo.
// Rodar: cd C:\Users\venda\projetos\google-script-dev && FASE=candidato node --require ./output/poderes-20261110/fontes-locais.cjs tests/poderes-lote0.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente } = require('./_poderes_ambiente.cjs');

const pastaPoderes = path.join(__dirname, '../output/poderes-20261110');
const pastaLegado = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const lerLegado = (f) => fs.readFileSync(path.join(pastaLegado, f), 'utf8');
const catalogo = JSON.parse(fs.readFileSync(path.join(pastaPoderes, 'catalogo.json'), 'utf8'));
const fonteCat = require(path.join(pastaPoderes, 'ferramentas-catalogo/catalogo-fonte.cjs'));
const DONO_TRES = ['FROTA_BLOQUEIO_ROUBO', 'COM_CATALOGO_EDITAR_VENDA', 'REP_ABRIR_EM_NOME'];
const SETORES = ['TECNICA', 'METROLOGIA', 'COMERCIAL', 'LOGISTICA', 'ADMINISTRATIVO'];
const ok = (r) => { assert.ok(r && r.ok === true, 'esperava ok: ' + JSON.stringify(r && (r.message || r)).slice(0, 400)); return r; };
const recusa = (r, re) => { assert.ok(r && r.ok === false, 'esperava recusa: ' + JSON.stringify(r).slice(0, 300)); if (re) assert.match(r.message, re); return r; };

// ------------------------------------------------------------------ "hoje" pelas funções originais do legado
/** Configuração real lida pelas funções de leitura do próprio legado (as mesmas que as travas usam). */
function cfgDoLegado(c) {
  const regras = c.Cmp_regras_();
  const restritos = c.AutPred_ler_('AUT_DISPOSITIVOS').filter((d) => c.AutPred_restrito_(d)).map((d) => String(d.ID));
  const acionar = c.AutPred_ler_('AUT_PERMISSOES').map((p) => String(p.USUARIO_ID)).filter((id, i, l) => l.indexOf(id) === i)
    .filter((id) => { const pm = c.AutPred_permissoesDe_(id); return restritos.some((d) => String(pm[d] || '').toUpperCase() === 'ACIONAR'); });
  return {
    donos: vm.runInContext('SGO_DONOS.slice()', c), compradores: (regras.compradores || []).map(String), substitutos: (regras.substitutos || []).map(String), areaCompras: String(regras.areaCompras || ''),
    triagem: (c.Ast_triagemPara_().ids || []).map(String), comGestores: (c.Com_metodologia_().gestores || []).map(String), repResponsaveis: (c.Rep_responsaveis_().ids || []).map(String),
    gestoresPorArea: c.Ges_cfg_().gestoresPorArea || {}, repEmNome: (c.Rep_emNomeCfg_().ids || []).map(String), pontoRhIds: (c.Ponto_cfg_().rhIds || []).map(String),
    autPermissoesAcionar: acionar, idsTransferirOS: fonteCat.CFG.idsTransferirOS.slice(), relatorioInterno: Object.assign({}, fonteCat.CFG.relatorioInterno)
  };
}
/** Regras-base do catálogo (H), avaliadas com a configuração real; gestoresCompras pela função do legado (o catálogo deixou []). */
function hDoCatalogo(c, CFG) {
  const H = new Function('CFG', fonteCat.H_SRC + '\nreturn H;')(CFG);
  H.gestoresCompras = () => (c.Cmp_gestoresCompras_() || []).map(String);
  return (expr, eu) => !!(new Function('eu', 'H', 'CFG', 'return (' + expr + ');'))(eu, H, CFG);
}
/** As funções de hoje, chamadas do legado sem alteração (mesmo mapa do teste de equivalência do catálogo, agora com a configuração real). */
function pDoLegado(c, u) {
  const sess = { perfil: u.perfil, usuario: u.login, userId: u.id };
  const pessoa = { id: u.id, perfil: u.perfil, area: u.area, login: u.login };
  const com = c.Com_nivelDe_(pessoa), cmp = c.Cmp_nivelDe_(pessoa);
  const ast = Object.assign({}, pessoa, c.Ast_nivelDe_(pessoa));
  const uGes = { ativo: true, sistema: false, perfil: u.perfil, area: u.area, diretoria: u.perfil === 'DIRETORIA' || c.Chaves_ehDonoUsuario_(u.login) };
  const rotina = c.SGO_ehGestaoRotina_(u.perfil), gd = c.isAdminPerfilAuth_(u.perfil);
  const linha = { STATUS: 'ATIVO', PERFIL: u.perfil, USUARIO: u.login, AREA: u.area, VINCULO_TRABALHO: u.vinculo };
  return {
    CONTAS_VER: rotina, CONTAS_CRIAR: rotina, CONTAS_ALTERAR_OUTROS: rotina, CONTAS_INATIVAR: rotina, AREAS_GERIR: c.SGO_podeConsultarPessoas_(u.perfil),
    SEGURANCA_VER_REGISTRO: c.SegAcesso_podeVer_(sess), SEGURANCA_ALTERAR: c.SegAcesso_ehAdmin_(sess),
    CONDUTA_VER_NOMES: gd && c.Conduta_veIdentidadeUsuario_(linha), CONDUTA_DECIDIR: gd && c.Conduta_veIdentidadeUsuario_(linha),
    CONDUTA_MISSAO_DECIDIR: gd, CONDUTA_FECHAR_MES: gd,
    FIN_CARTOES_VER: !!c.CmpCart_podeVer_(cmp), FIN_CARTOES_EDITAR: !!c.CmpCart_podeEditar_(cmp),
    RELATORIO_TECNICO_APROVAR: c.SGO_QE_ehAprovador_(sess, vm.runInContext('AutoRel_UCFG.EMISSAO.perfisAprovadores', c)),
    RELATORIO_BAIXATEMP_APROVAR: c.SGO_QE_ehAprovador_(sess, vm.runInContext('BAIXATEMP_CFG.PERFIS_APROVADORES', c)),
    COMPRAS_PEDIR: cmp.nivel !== 'NENHUM', COMPRAS_VER_FILA: !!cmp.veFila, COMPRAS_VER_VALORES: !!cmp.veValores, COMPRAS_COMPRAR: !!cmp.comprador, COMPRAS_GESTAO: !!cmp.gestao,
    COMPRAS_REGRAS_EDITAR: !!cmp.regras, FIN_CONFERIR_COMPRAS: !!cmp.financeiro,
    FROTA_RESERVAS_GERIR: c.FrotaRes_ehGestaoRotina_(u.perfil),
    COM_USAR: !!(com.gestao || com.vendedor), COM_TODAS_AS_VENDAS: !!com.gestao, COM_PEDIDOS_APROVADOS: !!(com.gestao || com.vendedor || com.financeiro), COM_VER_VALORES: !!com.veValores, COM_VER_CUSTO: !!com.veCusto,
    COM_CATALOGO_EDITAR: !!com.catalogo, COM_CATALOGO_EDITAR_VENDA: !!com.catalogoVenda, COM_CONTATOS_CLIENTES: c.ComCt_podeVer_(Object.assign({ perfil: u.perfil }, com)),
    COM_POLITICA_PRECOS: c.ComCat_podeMudarPreco_(Object.assign({ perfil: u.perfil }, com)),
    AST_USAR: !!ast.interno, AST_GESTAO: !!ast.gestao, AST_REGRAS: !!ast.regras, AST_VER_VALORES: !!ast.valores, AST_EXCLUIR: !!ast.excluir,
    AST_TRANSFERIR_OS: !!c.AstO_podeTransferir_(ast), AST_GERIR_FILA_SETOR: SETORES.some((s) => c.AstO_podeGerirFila_(ast, s)), RONDA_SUGESTAO_DECIDIR: c.AstRd_podeSugestao_(ast),
    AST_VER_TODOS_CHAMADOS: !!(ast.interno && (ast.gestao || !ast.tecnico)), AST_TRIAGEM: !!(ast.interno && (ast.gestao || c.AstC_ehDaTriagem_(ast))),
    REP_ADMINISTRAR: c.RepI_podeAdministrar_({ id: u.id, perfil: u.perfil, diretoria: ast.diretoria }), REP_RECEBER_ALERTAS: !!c.RepAl_podeReceber_(Object.assign({ externo: false }, ast)).pode,
    REP_ABRIR_EM_NOME: !!c.Rep_podeAbrirEmNome_({ id: u.id, externo: false }),
    GESTAO_VER_SIGILO: c.Ges_veSigilo_(uGes), GESTAO_CONFIGURAR: c.Ges_podeConfigurar_(sess), GESTAO_AVALIACAO_GESTORES: c.Ges_ehDiretoriaSessao_(sess),
    GESTAO_CAIXA_VER_TODAS: c.Ges_ehGestaoPerfil_(u.perfil), GESTAO_CAIXA_DECISOES: c.Ges_ehRotinaPerfil_(u.perfil),
    LIC_USAR: c.Lic_nivelDe_({ perfil: u.perfil, login: u.login }).gestao, LIC_ALCADAS: c.LicPar_podeMudarCfg_({ perfil: u.perfil, login: u.login }),
    CADASTROS_JUNTAR_DUPLICADOS: c.CadQ_podeJuntar_(sess), AUVO_ACERVO: vm.runInContext('AUVO_ACERVO_CFG.PERFIS', c).indexOf(u.perfil) >= 0,
    AUT_ADMINISTRAR: u.perfil === 'ADMIN' || c.AutPred_usuarioEhDiretor_(linha)
  };
}
/** Matriz "hoje" (23 contas × 150 poderes) e as divergências entre o catálogo (H) e as funções do legado (P). */
function montarHoje(a) {
  const c = a.ctx, CFG = cfgDoLegado(c), avaliar = hDoCatalogo(c, CFG);
  const hoje = {}, divergHP = [];
  for (const u of a.contas) {
    const P = u.perfil === 'REPRESENTADA' || u.perfil === 'CLIENTE' ? null : pDoLegado(c, u);
    hoje[u.login] = {};
    for (const p of catalogo.poderes) {
      let v;
      if (u.perfil === 'REPRESENTADA') v = false;                    // exigirSessao recusa fora do módulo Representação
      else {
        const h = avaliar(p.padrao, u);
        if (P && p.codigo in P) { v = !!P[p.codigo]; if (v !== h) divergHP.push(p.codigo + ' ' + u.login + ': legado=' + v + ' catálogo(H)=' + h); }
        else v = h;
      }
      hoje[u.login][p.codigo] = v;
    }
  }
  return { hoje, CFG, divergHP };
}

// ------------------------------------------------------------------ 1. catálogo
const LIGADOS_LOTE1 = ['CONTAS_VER', 'CONTAS_CRIAR', 'CONTAS_ALTERAR_OUTROS', 'CONTAS_MUDAR_PERFIL', 'CONTAS_REDEFINIR_SENHA', 'CONTAS_INATIVAR', 'CONTAS_EXCLUIR', 'CONTAS_GERIR_ADMINISTRADOR', 'CONTAS_DAR_DIRETORIA', 'AREAS_GERIR', 'AREAS_DEFINIR_PESSOA', 'SEGURANCA_VER_REGISTRO', 'SEGURANCA_ALTERAR', 'MODO_PERSONALIZADO_DESIGNAR', 'ACESSOS_GERIR',
  // lote 4 (11/11/2026): aprovação de relatório técnico (RELATORIO_INTERNO_SIMULADO fica de fora)
  'RELATORIO_TECNICO_APROVAR', 'RELATORIO_BAIXATEMP_APROVAR', 'RELATORIO_MODELO_ESCOLHER',
  // lote 5 (11/11/2026): Compras
  'COMPRAS_PEDIR', 'COMPRAS_VER_FILA', 'COMPRAS_VER_VALORES', 'COMPRAS_COMPRAR', 'COMPRAS_APROVAR_ATE_LIMITE', 'COMPRAS_APROVAR_DA_AREA',
  'COMPRAS_APROVAR_SEM_LIMITE', 'COMPRAS_GESTAO', 'COMPRAS_REGRAS_EDITAR', 'COMPRAS_CIENCIA_GESTAO'];
test('catálogo: 150 poderes com regra padrão, desligados no lote 0 exceto os ligados pelo lote 1; nada fora do catalogo.json', () => {
  const a = ambiente();
  const cat = a.ctx.SGO_poderesCatalogo_();
  assert.equal(cat.lista.length, 150);
  assert.deepEqual(Array.from(cat.lista, (p) => p.codigo), catalogo.poderes.map((p) => p.codigo));
  for (const p of cat.lista) {
    const ref = catalogo.poderes.find((x) => x.codigo === p.codigo);
    assert.equal(p.modulo, ref.modulo); assert.equal(p.categoria, ref.categoria); assert.equal(p.lote, ref.lote); assert.equal(p.descricao, ref.descricao);
    assert.ok(p.nome && !/NOVO/.test(p.nome), p.codigo);
    assert.equal(typeof p.padrao, 'function', p.codigo);
    // lote 1 (11/11/2026): só as caixas de Contas, senhas e acessos ligadas (SISTEMA_* ficam no servidor Node)
    assert.equal(p.ligado, LIGADOS_LOTE1.includes(p.codigo), p.codigo + ' ligado fora dos lotes 1, 4 e 5');
  }
  assert.deepEqual(Array.from(vm.runInContext('SGO_PODERES_LIGADOS', a.ctx)), LIGADOS_LOTE1);
  assert.throws(() => a.ctx.SGO_pode_('s_admin', 'PODER_INEXISTENTE'), /Poder desconhecido/);
});

// ------------------------------------------------------------------ 2. equivalência
test('equivalência: sem exceções, SGO_pode_ = hoje (funções do legado + configuração real) nos 150 poderes × 23 contas; só o dono muda, nas 3 caixas documentadas', () => {
  const a = ambiente();
  const { hoje, CFG, divergHP } = montarHoje(a);
  // o catálogo (H) e as funções do legado concordam com a configuração real, salvo uma simplificação documentada do catálogo:
  // AST_GERIR_FILA_SETOR no catálogo aceita responsável de QUALQUER área; o legado (AstO_podeGerirFila_) só das 5 filas de setor.
  // A Elisa é responsável só da área RH (que não é fila de O.S.): hoje NÃO. SGO_pode_ segue o legado (esperado = legado).
  assert.deepEqual(divergHP, ['AST_GERIR_FILA_SETOR elisa: legado=false catálogo(H)=true'], 'regra do catálogo diferente da função do legado');
  // a configuração real foi lida (não a suposição vazia do catálogo)
  assert.ok(Object.keys(CFG.gestoresPorArea).length >= 9 && CFG.gestoresPorArea.FINANCEIRO.length === 3, 'gestoresPorArea real não carregado');
  // /_sgo/segredos passou a ser só do dono em 10/11/2026 (servidor Node, Chaves_exigirDono_): o legado não tem essa trava,
  // então o "hoje" desse poder é NÃO para todos fora o dono.
  for (const l of Object.keys(hoje)) if (l !== 'admin') hoje[l].SISTEMA_SEGREDOS_SERVIDOR = false;
  const falhas = [], donoMuda = [];
  let comparacoes = 0;
  for (const u of a.contas) {
    for (const p of catalogo.poderes) {
      const atual = a.ctx.SGO_pode_('s_' + u.login, p.codigo), esperado = hoje[u.login][p.codigo];
      comparacoes++;
      if (u.login === 'admin') { assert.equal(atual, true, 'dono sem ' + p.codigo); if (!esperado) donoMuda.push(p.codigo); continue; }
      if (atual !== esperado) falhas.push(p.codigo + ' ' + u.login + ': SGO_pode_=' + atual + ' hoje=' + esperado);
    }
  }
  assert.equal(comparacoes, 150 * 23);
  assert.deepEqual(falhas, [], falhas.slice(0, 20).join('\n'));
  assert.deepEqual(donoMuda.sort(), DONO_TRES.slice().sort(), 'o dono só pode mudar nas 3 caixas documentadas');
  // a mesma resposta por todas as entradas (sessão por ID, sessão validada, pessoa)
  for (const u of a.contas.filter((x) => x.perfil !== 'REPRESENTADA')) {
    const s = a.sessoes['s_' + u.login];
    for (const cod of ['COM_USAR', 'AST_TRIAGEM', 'PONTO_VER_EQUIPE_AREA', 'COMPRAS_APROVAR_DA_AREA']) {
      assert.equal(a.ctx.SGO_pode_(s, cod), a.ctx.SGO_pode_('s_' + u.login, cod));
      assert.equal(a.ctx.SGO_pode_({ id: u.id, login: u.login, perfil: u.perfil, area: u.area, vinculo: u.vinculo }, cod), a.ctx.SGO_pode_('s_' + u.login, cod));
    }
  }
  // registro: o que mudou em relação ao catalogo.json (que supôs gestoresPorArea vazio e responsáveis da representação vazios)
  const mudou = [];
  for (const p of catalogo.poderes) for (const u of a.contas) if (hoje[u.login][p.codigo] !== p.hoje[u.login]) mudou.push({ codigo: p.codigo, login: u.login, catalogo: p.hoje[u.login], real: hoje[u.login][p.codigo] });
  if (process.env.FASE === 'candidato') {
    const porPoder = {};
    mudou.forEach((m) => { (porPoder[m.codigo] = porPoder[m.codigo] || []).push(m.login + ' ' + (m.real ? 'ganha' : 'perde')); });
    const linhas = ['Equivalência do lote 0 (gerado por tests/poderes-lote0.test.cjs em ' + new Date().toISOString() + ')',
      'Comparações: ' + comparacoes + ' (150 poderes × 23 contas). Divergências SGO_pode_ × hoje: ' + falhas.length + '. Catálogo (H) × funções do legado: ' + divergHP.length + (divergHP.length ? ' (' + divergHP.join('; ') + '; vale o legado)' : '') + '.',
      'Dono (admin): SIM em tudo; muda em ' + donoMuda.length + ' caixas: ' + donoMuda.join(', ') + '.',
      'Configuração real usada: gestoresPorArea=' + JSON.stringify(CFG.gestoresPorArea) + '; triagem=' + JSON.stringify(CFG.triagem) + '; responsáveis da representação (Rep_responsaveis_)=' + JSON.stringify(CFG.repResponsaveis) + '.',
      '', 'Diferenças do "hoje" real em relação ao catalogo.json (' + mudou.length + ' células, ' + Object.keys(porPoder).length + ' poderes):'];
    Object.keys(porPoder).forEach((k) => linhas.push('  ' + k + ': ' + porPoder[k].join(', ')));
    linhas.push('', 'Poderes por pessoa (hoje real; catalogo.json entre parênteses):');
    a.contas.forEach((u) => { const n = catalogo.poderes.filter((p) => hoje[u.login][p.codigo]).length, n0 = catalogo.poderes.filter((p) => p.hoje[u.login]).length; linhas.push('  ' + u.login + ' ' + u.perfil + '/' + (u.area || '-') + ': ' + n + ' (' + n0 + ')'); });
    fs.writeFileSync(path.join(pastaPoderes, 'lote0-equivalencia.txt'), linhas.join('\n') + '\n');
  }
});

// ------------------------------------------------------------------ 3. exceções e histórico
test('exceções: SIM e NÃO sobrepõem o padrão; voltar ao padrão; histórico com antes e depois; nunca apaga histórico', () => {
  const a = ambiente(), monica = a.idDe('monica');
  assert.equal(a.ctx.SGO_pode_('s_monica', 'COMPRAS_GESTAO'), false);
  assert.equal(a.ctx.SGO_pode_('s_monica', 'COM_USAR'), true);
  const r = ok(a.api('admin', 'salvar', { usuarioId: monica, motivo: 'Assumiu a gestão de compras na ausência do gestor', mudancas: [{ codigo: 'COMPRAS_GESTAO', valor: 'SIM' }, { codigo: 'COM_USAR', valor: 'NAO' }] }));
  assert.equal(r.alteradas, 2);
  assert.equal(a.ctx.SGO_pode_('s_monica', 'COMPRAS_GESTAO'), true);
  assert.equal(a.ctx.SGO_pode_('s_monica', 'COM_USAR'), false);
  const ef = a.ctx.SGO_poderesEfetivos_(monica);
  const g = ef.find((p) => p.codigo === 'COMPRAS_GESTAO');
  assert.equal(g.origem, 'excecao'); assert.equal(g.valor, true); assert.equal(g.padrao, false); assert.equal(g.ligado, true); // ligado desde o lote 5 (Compras)
  assert.equal(ef.find((p) => p.codigo === 'CONDUTA_PARTICIPAR').origem, 'padrao');
  assert.equal(a.tabelas.SYS_PODERES_EXCECOES.length, 2);
  const e1 = a.tabelas.SYS_PODERES_EXCECOES.find((l) => l.PODER === 'COMPRAS_GESTAO');
  assert.deepEqual([e1.USUARIO_ID, e1.VALOR, e1.ALTERADO_POR_ID, e1.MOTIVO], [monica, 'SIM', a.idDe('admin'), 'Assumiu a gestão de compras na ausência do gestor']);
  assert.match(e1.ALTERADO_EM, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  const log = a.tabelas.SYS_PODERES_LOG;
  assert.equal(log.length, 2);
  const l1 = log.find((l) => l.PODER === 'COM_USAR');
  assert.deepEqual([l1.ANTES_EXCECAO, l1.DEPOIS_EXCECAO, l1.ANTES_EFETIVO, l1.DEPOIS_EFETIVO, l1.ACAO, l1.POR_ID], ['PADRAO', 'NAO', 'SIM', 'NAO', 'EXCECAO', a.idDe('admin')]);
  assert.equal(log[0].LOTE, log[1].LOTE, 'as caixas salvas juntas ficam no mesmo lote do histórico');
  // voltar ao padrão
  const v = ok(a.api('admin', 'voltarPadrao', { usuarioId: monica, codigo: 'COM_USAR', motivo: 'Voltou a vender normalmente' }));
  assert.equal(v.alteradas, 1);
  assert.equal(a.ctx.SGO_pode_('s_monica', 'COM_USAR'), true);
  assert.equal(a.tabelas.SYS_PODERES_EXCECOES.length, 1);
  assert.equal(log.length, 3);
  const l3 = log[2];
  assert.deepEqual([l3.PODER, l3.ANTES_EXCECAO, l3.DEPOIS_EXCECAO, l3.ANTES_EFETIVO, l3.DEPOIS_EFETIVO, l3.ACAO], ['COM_USAR', 'NAO', 'PADRAO', 'NAO', 'SIM', 'VOLTAR_AO_PADRAO']);
  // trocar SIM por NÃO direto: substitui a exceção, histórico mostra antes SIM
  ok(a.api('admin', 'salvar', { usuarioId: monica, motivo: 'Gestor de compras voltou', mudancas: [{ codigo: 'COMPRAS_GESTAO', valor: 'PADRAO' }] }));
  assert.equal(a.tabelas.SYS_PODERES_EXCECOES.length, 0);
  assert.equal(log.length, 4);
  // gravar o mesmo de novo não cria linha
  const igual = ok(a.api('admin', 'salvar', { usuarioId: monica, motivo: 'Conferência sem mudança', mudancas: [{ codigo: 'COMPRAS_GESTAO', valor: 'PADRAO' }] }));
  assert.equal(igual.alteradas, 0); assert.equal(log.length, 4);
  // histórico pela API
  const h = ok(a.api('admin', 'historico', { usuarioId: monica })).historico;
  assert.equal(h.length, 4);
  assert.ok(h.every((x) => x.por && x.motivo && x.quando && x.poderNome));
  // ninguém apaga histórico: nenhuma ação remove linha do log
  assert.ok(!/remove\(\s*PODERES_ABA_LOG/.test(lerLegado('SGO_Poderes.js')));
  // exceção NÃO grava "NÃO" com acento também é lida
  a.tabelas.SYS_PODERES_EXCECOES.push({ ID: 'x1', USUARIO_ID: monica, PODER: 'AST_USAR', VALOR: 'NÃO' });
  a.limparMemo();
  assert.equal(a.ctx.SGO_pode_('s_monica', 'AST_USAR'), false);
});

test('motivo obrigatório (5 letras), valores inválidos e caixas repetidas são recusados sem gravar nada', () => {
  const a = ambiente(), monica = a.idDe('monica');
  recusa(a.api('admin', 'salvar', { usuarioId: monica, motivo: 'abc', mudancas: [{ codigo: 'COMPRAS_GESTAO', valor: 'SIM' }] }), /motivo/);
  recusa(a.api('admin', 'salvar', { usuarioId: monica, motivo: '    ', mudancas: [{ codigo: 'COMPRAS_GESTAO', valor: 'SIM' }] }), /motivo/);
  recusa(a.api('admin', 'salvar', { usuarioId: monica, motivo: 'Motivo válido', mudancas: [{ codigo: 'COMPRAS_GESTAO', valor: 'TALVEZ' }] }), /valor inválido/);
  recusa(a.api('admin', 'salvar', { usuarioId: monica, motivo: 'Motivo válido', mudancas: [{ codigo: 'COMPRAS_GESTAO', valor: 'SIM' }, { codigo: 'COMPRAS_GESTAO', valor: 'NAO' }] }), /duas vezes/);
  recusa(a.api('admin', 'salvar', { usuarioId: monica, motivo: 'Motivo válido', mudancas: [] }), /nenhuma caixa/);
  recusa(a.api('admin', 'salvar', { usuarioId: monica, motivo: 'Motivo válido', mudancas: [{ codigo: 'NAO_EXISTE', valor: 'SIM' }] }), /Poder desconhecido/);
  recusa(a.api('admin', 'voltarPadrao', { usuarioId: monica, codigo: 'COM_USAR', motivo: 'ab' }), /motivo/);
  recusa(a.api('admin', 'salvar', { usuarioId: 'id-que-nao-existe', motivo: 'Motivo válido', mudancas: [{ codigo: 'COM_USAR', valor: 'SIM' }] }), /não está no cadastro/);
  assert.equal((a.tabelas.SYS_PODERES_EXCECOES || []).length, 0);
  assert.equal((a.tabelas.SYS_PODERES_LOG || []).length, 0);
  assert.equal(a.trava.presa, false);
});

test('proteções: ninguém altera as próprias caixas; não-dono sem ACESSOS_GERIR é recusado no servidor; dono não perde poder; conta de fora não tem caixa', () => {
  const a = ambiente(), charles = a.idDe('charles'), monica = a.idDe('monica'), admin = a.idDe('admin');
  // não-dono sem a caixa: recusado em todas as ações (mesmo chamando o servidor direto)
  for (const login of ['charles', 'ricardo', 'matheusgodoi', 'elisa', 'wanessa', 'bento', 'monica']) {
    assert.equal(ok(a.api(login, 'pode')).pode, false, login);
    for (const acao of ['pessoas', 'pessoa', 'salvar', 'copiar', 'aplicarModelo', 'voltarPadrao', 'historico', 'verComo', 'modelos']) {
      recusa(a.api(login, acao, { usuarioId: monica, motivo: 'Tentativa sem permissão', mudancas: [{ codigo: 'COM_USAR', valor: 'NAO' }], deUsuarioId: admin, modelo: 'TECNICO' }), /responsável pelo sistema/);
    }
  }
  assert.equal(ok(a.api('admin', 'pode')).pode, true);
  // o dono não altera a si mesmo (e não precisa: tem tudo)
  recusa(a.api('admin', 'salvar', { usuarioId: admin, motivo: 'Teste de proteção', mudancas: [{ codigo: 'COM_USAR', valor: 'NAO' }] }), /próprias/);
  // o dono libera a gestão dos acessos para a Diretoria
  ok(a.api('admin', 'salvar', { usuarioId: charles, motivo: 'Diretor passa a gerir os acessos', mudancas: [{ codigo: 'ACESSOS_GERIR', valor: 'SIM' }] }));
  assert.equal(ok(a.api('charles', 'pode')).pode, true);
  // agora ele grava para outra pessoa, mas não para si
  ok(a.api('charles', 'salvar', { usuarioId: monica, motivo: 'Vendedora sem catálogo', mudancas: [{ codigo: 'COM_CATALOGO_EDITAR_VENDA', valor: 'NAO' }] }));
  recusa(a.api('charles', 'salvar', { usuarioId: charles, motivo: 'Quero mais acesso', mudancas: [{ codigo: 'LIC_ATOS_EXCEPCIONAIS', valor: 'SIM' }] }), /próprias/);
  // e não tira poder do dono
  recusa(a.api('charles', 'salvar', { usuarioId: admin, motivo: 'Tirar acesso do dono', mudancas: [{ codigo: 'CONTAS_EXCLUIR', valor: 'NAO' }] }), /responsável pelo sistema/);
  recusa(a.api('charles', 'aplicarModelo', { usuarioId: admin, modelo: 'TECNICO', motivo: 'Rebaixar o dono' }), /responsável pelo sistema/);
  recusa(a.api('charles', 'copiar', { usuarioId: admin, deUsuarioId: monica, motivo: 'Copiar para o dono' }), /responsável pelo sistema/);
  // exceção gravada direto na planilha para o dono não vale
  a.tabelas.SYS_PODERES_EXCECOES.push({ ID: 'manual1', USUARIO_ID: admin, PODER: 'CONTAS_EXCLUIR', VALOR: 'NAO' });
  a.limparMemo();
  assert.equal(a.ctx.SGO_pode_('s_admin', 'CONTAS_EXCLUIR'), true);
  assert.equal(a.ctx.SGO_poderesEfetivos_(admin).find((p) => p.codigo === 'CONTAS_EXCLUIR').origem, 'dono');
  // o dono retira de novo a gestão: o diretor perde o acesso na hora
  ok(a.api('admin', 'voltarPadrao', { usuarioId: charles, codigo: 'ACESSOS_GERIR', motivo: 'Fim da delegação' }));
  recusa(a.api('charles', 'pessoas'), /responsável pelo sistema/);
  // conta de fora: nenhuma caixa, nem com exceção SIM gravada direto
  recusa(a.api('admin', 'salvar', { usuarioId: a.idDe('hst'), motivo: 'Cliente com acesso', mudancas: [{ codigo: 'AST_USAR', valor: 'SIM' }] }), /conta de fora/);
  a.tabelas.SYS_PODERES_EXCECOES.push({ ID: 'manual2', USUARIO_ID: a.idDe('qualidade'), PODER: 'REP_USAR', VALOR: 'SIM' });
  a.limparMemo();
  assert.equal(a.ctx.SGO_pode_({ id: a.idDe('qualidade'), login: 'qualidade', perfil: 'REPRESENTADA' }, 'REP_USAR'), false);
  // a lista de pessoas não mostra clientes nem representadas
  const pessoas = ok(a.api('admin', 'pessoas')).pessoas;
  assert.equal(pessoas.length, 18);
  assert.ok(!pessoas.some((p) => ['CLIENTE', 'REPRESENTADA'].includes(p.perfil)));
  assert.equal(pessoas.find((p) => p.id === admin).dono, true);
  // a tela da própria pessoa e do dono vem só para consulta, com o porquê
  const propria = ok(a.api('admin', 'pessoa', { usuarioId: admin }));
  assert.equal(propria.podeAlterar, false); assert.match(propria.porQueNaoAltera, /ninguém altera as próprias/);
  assert.equal(a.trava.presa, false);
});

test('SGO_podeExigir_: recusa com o nome da caixa, o porquê e o que fazer', () => {
  const a = ambiente();
  assert.equal(a.ctx.SGO_podeExigir_('s_charles', 'COMPRAS_APROVAR_SEM_LIMITE'), true);
  assert.throws(() => a.ctx.SGO_podeExigir_('s_monica', 'COMPRAS_GESTAO', null, 'reabrir a compra'),
    (e) => /^Você não tem a permissão «Gestão de Compras» para reabrir a compra: .+\. Peça ao responsável pelo sistema/.test(e.message));
});

test('copiar de outra pessoa: fica igual, com exceção só onde difere do padrão; a caixa de gerir acessos nunca é copiada', () => {
  const a = ambiente(), ricardo = a.idDe('ricardo'), priscilla = a.idDe('priscilla'), charles = a.idDe('charles');
  ok(a.api('admin', 'salvar', { usuarioId: charles, motivo: 'Diretor gere os acessos', mudancas: [{ codigo: 'ACESSOS_GERIR', valor: 'SIM' }] }));
  ok(a.api('admin', 'salvar', { usuarioId: ricardo, motivo: 'Ricardo confere o banco', mudancas: [{ codigo: 'FIN_CONCILIAR_BANCO', valor: 'SIM' }] }));
  const antes = a.tabelas.SYS_PODERES_LOG.length;
  const r = ok(a.api('admin', 'copiar', { usuarioId: priscilla, deUsuarioId: ricardo, motivo: 'Priscilla cobre as férias do Ricardo' }));
  const efR = a.ctx.SGO_poderesEfetivos_(ricardo), efP = a.ctx.SGO_poderesEfetivos_(priscilla);
  for (const p of efR) assert.equal(efP.find((x) => x.codigo === p.codigo).valor, p.valor, p.codigo);
  const excP = a.tabelas.SYS_PODERES_EXCECOES.filter((l) => l.USUARIO_ID === priscilla);
  assert.equal(excP.length, r.alteradas);
  assert.ok(excP.length > 0);
  for (const l of excP) { const p = efP.find((x) => x.codigo === l.PODER); assert.notEqual(p.padrao, l.VALOR === 'SIM', 'exceção onde já era o padrão: ' + l.PODER); }
  assert.ok(a.tabelas.SYS_PODERES_LOG.slice(antes).every((l) => l.ACAO === 'COPIAR' && /copiado de RICARDO/.test(l.MOTIVO)));
  // ACESSOS_GERIR não passa na cópia
  ok(a.api('admin', 'copiar', { usuarioId: a.idDe('bruna'), deUsuarioId: charles, motivo: 'Bruna com o acesso do diretor' }));
  assert.equal(a.ctx.SGO_pode_('s_bruna', 'ACESSOS_GERIR'), false);
  assert.equal(a.ctx.SGO_pode_('s_bruna', 'COMPRAS_APROVAR_SEM_LIMITE'), true);
  // copiar de novo: nada muda
  assert.equal(ok(a.api('admin', 'copiar', { usuarioId: priscilla, deUsuarioId: ricardo, motivo: 'Conferir de novo' })).alteradas, 0);
  recusa(a.api('admin', 'copiar', { usuarioId: priscilla, deUsuarioId: priscilla, motivo: 'Copiar dela mesma' }), /diferente/);
});

test('modelos: substituir deixa exatamente o modelo; somar só libera; Gestor de área usa a área; nenhum modelo mexe em gerir acessos', () => {
  const a = ambiente(), wanessa = a.idDe('wanessa'), bento = a.idDe('bento'), ricardo = a.idDe('ricardo');
  const modelos = ok(a.api('admin', 'modelos', { usuarioId: ricardo })).modelos;
  assert.deepEqual(modelos.map((m) => m.chave), ['GERENTE', 'GESTOR_AREA', 'TECNICO', 'METROLOGIA', 'COMERCIAL', 'FINANCEIRO', 'RH']);
  for (const m of modelos) { assert.ok(!m.poderes.includes('ACESSOS_GERIR'), m.chave); assert.ok(m.poderes.length > 0, m.chave); }
  const conj = (k) => modelos.find((m) => m.chave === k).poderes;
  // o modelo é o padrão de hoje do perfil de referência
  assert.ok(conj('GESTOR_AREA').includes('COM_GESTAO_COMERCIAL'), 'Gestor da área Comercial tem a gestão comercial');
  assert.ok(!conj('GERENTE').includes('COM_GESTAO_COMERCIAL'));
  assert.ok(conj('TECNICO').includes('DOCTEC_EMITIR_OFICIAL') && !conj('TECNICO').includes('COMPRAS_COMPRAR'));
  // substituir
  ok(a.api('admin', 'aplicarModelo', { usuarioId: wanessa, modelo: 'TECNICO', modo: 'SUBSTITUIR', motivo: 'Wanessa vai a campo' }));
  const efW = a.ctx.SGO_poderesEfetivos_(wanessa);
  for (const p of efW) assert.equal(p.valor, conj('TECNICO').includes(p.codigo), p.codigo);
  assert.ok(a.tabelas.SYS_PODERES_LOG.every((l) => l.ACAO === 'MODELO' && /modelo Técnico/.test(l.MOTIVO)));
  // somar: só ganha
  const antesB = a.ctx.SGO_poderesEfetivos_(bento).filter((p) => p.valor).map((p) => p.codigo);
  ok(a.api('admin', 'aplicarModelo', { usuarioId: bento, modelo: 'COMERCIAL', modo: 'SOMAR', motivo: 'Bento ajuda nas vendas' }));
  const depoisB = a.ctx.SGO_poderesEfetivos_(bento).filter((p) => p.valor).map((p) => p.codigo);
  for (const c of antesB) assert.ok(depoisB.includes(c), 'somar retirou ' + c);
  for (const c of conj('COMERCIAL')) assert.ok(depoisB.includes(c), 'somar não deu ' + c);
  // Gestor de área sem área no cadastro
  a.tabelas.CAD_USUARIOS.find((u) => u.ID === bento).AREA = '';
  a.limparMemo();
  recusa(a.api('admin', 'aplicarModelo', { usuarioId: bento, modelo: 'GESTOR_AREA', motivo: 'Bento coordena' }), /sem área no cadastro/);
  recusa(a.api('admin', 'aplicarModelo', { usuarioId: bento, modelo: 'CHEFAO', motivo: 'Modelo que não existe' }), /modelo desconhecido/);
  // registro dos conjuntos para o documento do lote 0
  if (process.env.FASE === 'candidato') {
    const todos = ok(a.api('admin', 'modelos', {})).modelos;
    const nomes = Object.fromEntries(catalogo.poderes.map((p) => [p.codigo, p.nome]));
    const linhas = ['Modelos do lote 0 (padrão de hoje do perfil de referência, sem listas de configuração; Gestor de área mostrado para a área Comercial)', ''];
    for (const m of todos) {
      const p = m.chave === 'GESTOR_AREA' ? conj('GESTOR_AREA') : m.poderes;
      linhas.push(m.chave + ' (' + p.length + ' caixas): ' + p.join(', '), '');
    }
    const ga = {};
    for (const area of ['COMERCIAL', 'TECNICA', 'QUALIDADE', 'RH', 'FINANCEIRO', 'METROLOGIA', 'LOGISTICA', 'ADMINISTRATIVO', 'DIRETORIA']) {
      const r = a.ctx.Poderes_conjuntoModelo_('GESTOR_AREA', { area, nome: 'x' });
      ga[area] = Object.keys(r);
    }
    const base = ga.ADMINISTRATIVO;
    linhas.push('Gestor de área: base (' + base.length + ') = área sem gestão específica; a mais por área:');
    for (const k of Object.keys(ga)) linhas.push('  ' + k + ': +' + ga[k].filter((c) => !base.includes(c)).join(', ') + (base.filter((c) => !ga[k].includes(c)).length ? ' / -' + base.filter((c) => !ga[k].includes(c)).join(', ') : ''));
    linhas.push('', 'Nomes: ' + Object.keys(nomes).length + ' caixas no catálogo.');
    fs.writeFileSync(path.join(pastaPoderes, 'lote0-modelos.txt'), linhas.join('\n') + '\n');
  }
});

test('API da tela: pessoa agrupada por módulo com padrão × efetivo × origem × ligado; ver como; tela devolvida depois de salvar', () => {
  const a = ambiente(), elisa = a.idDe('elisa');
  const t = ok(a.api('admin', 'pessoa', { usuarioId: elisa }));
  assert.equal(t.pessoa.nome, 'ELISA'); assert.equal(t.pessoa.perfil, 'GESTOR'); assert.equal(t.pessoa.area, 'RH'); assert.equal(t.pessoa.areaNome, 'RH'); assert.equal(t.podeAlterar, true);
  assert.equal(t.grupos.length, 18);
  assert.equal(t.grupos.reduce((s, g) => s + g.itens.length, 0), 150);
  const i = t.grupos.find((g) => g.modulo === 'Assistente do ponto').itens.find((x) => x.codigo === 'PONTO_VER_TODOS');
  assert.deepEqual([i.valor, i.padrao, i.origem, i.ligado, i.lote], [true, true, 'padrao', false, 9]);
  assert.ok(i.nome && i.descricao && i.categoriaNome && i.origemNome);
  const s = ok(a.api('admin', 'salvar', { usuarioId: elisa, motivo: 'Ponto passa para outra pessoa', mudancas: [{ codigo: 'PONTO_VER_TODOS', valor: 'NAO' }] }));
  const i2 = s.tela.grupos.find((g) => g.modulo === 'Assistente do ponto').itens.find((x) => x.codigo === 'PONTO_VER_TODOS');
  assert.deepEqual([i2.valor, i2.padrao, i2.origem], [false, true, 'excecao']);
  assert.equal(i2.excecao.valor, 'NAO'); assert.match(i2.excecao.em, /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/); assert.ok(i2.excecao.por);
  assert.equal(s.tela.pessoa.excecoes, 1);
  const vc = ok(a.api('admin', 'verComo', { usuarioId: elisa }));
  assert.ok(vc.resumo.length > 0);
  assert.ok(!vc.resumo.some((g) => g.pode.some((x) => x.nome === i.nome)), 'ver como mostra só o que a pessoa pode');
  assert.equal(vc.resumo.reduce((s2, g) => s2 + g.pode.length, 0), a.ctx.SGO_poderesEfetivos_(elisa).filter((p) => p.valor).length);
  const pessoas = ok(a.api('admin', 'pessoas')).pessoas;
  assert.equal(pessoas.find((p) => p.id === elisa).excecoes, 1);
  assert.deepEqual(ok(a.api('admin', 'pessoas')).ligados, LIGADOS_LOTE1);
  recusa(a.api('admin', 'acaoInventada', {}), /ação desconhecida/);
  recusa(a.api('admin', 'pessoa', { usuarioId: a.idDe('ndi') }), /conta de fora/);
});

test('fora do ar não libera: regra padrão que falha vale NÃO e o erro chega à tela; abas ausentes = sem exceção', () => {
  const a = ambiente({ semArquivos: ['SGO_Comercial_Config.js', 'SGO_Comercial_Contatos.js', 'SGO_Comercial_CatalogoOficial.js'] });
  assert.equal(a.ctx.SGO_pode_('s_monica', 'COM_USAR'), false);
  const p = a.ctx.SGO_poderesEfetivos_(a.idDe('monica')).find((x) => x.codigo === 'COM_USAR');
  assert.equal(p.valor, false); assert.ok(p.erro, 'erro informado');
  // o dono continua com tudo
  assert.equal(a.ctx.SGO_pode_('s_admin', 'COM_USAR'), true);
  // as abas novas ainda não existem: ninguém tem exceção e nada quebra
  assert.equal(a.tabelas.SYS_PODERES_EXCECOES, undefined);
  assert.equal(a.ctx.SGO_pode_('s_charles', 'COMPRAS_APROVAR_SEM_LIMITE'), true);
});

test('memória por requisição: muitas perguntas leem as abas uma vez; gravar limpa a memória', () => {
  const a = ambiente();
  let leituras = 0;
  const orig = a.ctx.SGO_DATA.getAll;
  a.ctx.SGO_DATA.getAll = function (t) { if (t === 'SYS_PODERES_EXCECOES' || t === 'CAD_USUARIOS') leituras++; return orig.apply(this, arguments); };
  a.limparMemo();
  ok(a.api('admin', 'salvar', { usuarioId: a.idDe('monica'), motivo: 'Cria a aba de exceções', mudancas: [{ codigo: 'COMPRAS_GESTAO', valor: 'SIM' }] }));
  a.limparMemo(); leituras = 0;
  for (let i = 0; i < 500; i++) a.ctx.SGO_pode_('s_monica', i % 2 ? 'COMPRAS_GESTAO' : 'COM_USAR');
  assert.ok(leituras <= 2, 'leituras: ' + leituras);
  assert.equal(a.ctx.SGO_pode_('s_monica', 'COMPRAS_GESTAO'), true);
  ok(a.api('admin', 'voltarPadrao', { usuarioId: a.idDe('monica'), codigo: 'COMPRAS_GESTAO', motivo: 'Fim do teste' }));
  assert.equal(a.ctx.SGO_pode_('s_monica', 'COMPRAS_GESTAO'), false, 'depois de gravar a resposta muda na hora');
});

// ------------------------------------------------------------------ tela
/** Página completa como o servidor monta (Index.html com os include() resolvidos). */
function paginaCompleta() {
  return lerLegado('Index.html').replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g, (m, f) => lerLegado(f + '.html'));
}
test('tela: incluída na página completa, item do menu escondido por padrão e só aparece para quem pode; casca abre a tela; ajuda registrada', () => {
  const pg = paginaCompleta();
  assert.ok(!/<\?!=\s*include/.test(pg), 'sobrou include sem resolver');
  const botao = /<button[^>]*data-mod="acessos"[^>]*>/.exec(pg);
  assert.ok(botao, 'item Acessos no menu');
  assert.match(botao[0], /id="menu-btn-acessos"/); assert.match(botao[0], /style="display:none;"/);
  assert.ok(pg.indexOf('id="menu-btn-acessos"') > pg.indexOf('id="menu-grupo-itens-administracao"'), 'no grupo Administração');
  assert.equal((pg.match(/id="menu-btn-acessos"/g) || []).length, 1);
  for (const fn of ['function AcessosTela_iniciar_', 'function AcessosTela_render_', 'function AcessosTela_pode_', 'function AcessosTela_antesDeSair_']) assert.ok(pg.includes(fn), fn);
  assert.equal((pg.match(/function AcessosTela_render_\(/g) || []).length, 1);
  const core = lerLegado('JS_Core.html');
  assert.equal((core.match(/AcessosTela_iniciar_\(\);/g) || []).length, 2, 'login e entrada automática');
  assert.match(core, /mod === "acessos" && typeof AcessosTela_render_ === "function"/);
  assert.match(core, /AcessosTela_pode_\(\)\) itens\.push\(\{[^}]*mod: "acessos"/);
  // script da tela roda num navegador mínimo: o item só aparece quando o servidor responde pode=true
  for (const [login, deve] of [['admin', true], ['charles', false], ['ricardo', false], ['monica', false]]) {
    const a = ambiente();
    const botaoEl = { style: { display: 'none' } };
    const janela = {
      document: { getElementById: (id) => (id === 'menu-btn-acessos' ? botaoEl : null), querySelectorAll: () => [] }, console,
      SGO_getSessionId: () => 's_' + login,
      google: { script: { run: (function mk(ok, falha) { return new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f) => mk(f, falha) : k === 'withFailureHandler' ? (f) => mk(ok, f) : (...args) => { try { ok(a.ctx[k](...args)); } catch (e) { falha(e); } } }); })(() => {}, () => {}) } }
    };
    vm.createContext(janela);
    const js = /<script>([\s\S]*?)<\/script>/.exec(lerLegado('JS_Acessos.html'))[1];
    vm.runInContext(js, janela);
    vm.runInContext('AcessosTela_iniciar_()', janela);
    assert.equal(botaoEl.style.display === '', deve, login);
    assert.equal(vm.runInContext('AcessosTela_pode_()', janela), deve);
  }
  // ajuda da tela no grupo Administração, com nome no catálogo de nomes
  const a = ambiente();
  const ajuda = a.ctx.SGO_ajudaTelas_Administracao_().acessos;
  assert.ok(ajuda && ajuda.titulo === 'Acessos' && ajuda.passos.length >= 5 && ajuda.quemPode.length === 3 && ajuda.secoesManual.length >= 2);
  assert.match(JSON.stringify(ajuda), /passa a valer quando o módulo for ligado/);
  assert.match(lerLegado('SGO_Ajuda.js'), /acessos: 'Acessos'/);
});

test('tela: textos corridos justificados, celular sem largura fixa, aviso do lote em toda caixa desligada, motivo pedido em toda gravação', () => {
  const h = lerLegado('JS_Acessos.html');
  assert.match(h, /\.acs-desc \{[^}]*text-align: justify/);
  assert.match(h, /@media \(max-width: 760px\)/);
  assert.ok(!/width:\s*\d{4,}px/.test(h));
  assert.match(h, /Esta caixa passa a valer quando o módulo for ligado \(lote /);
  assert.equal((h.match(/AcessosTela_chamar_\("(salvar|voltarPadrao|copiar|aplicarModelo)"/g) || []).length, 4);
  assert.ok((h.match(/v\.motivo/g) || []).length >= 4);
  // operador nunca no limbo: erros do servidor chegam à tela, com o caminho de volta
  assert.match(h, /Voltar ao Início/);
});
