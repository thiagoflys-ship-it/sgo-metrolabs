// Teste de equivalência: funções de produção (extraídas do legado, sem alteração) × padrão do catálogo, nas 23 contas.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const LEG = process.argv[2];
const cat = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const { USUARIOS, CFG } = require('./catalogo-fonte.cjs');

function extrair(arquivo, nome) {
  const L = fs.readFileSync(path.join(LEG, arquivo), 'utf8').split(/\r?\n/);
  const i = L.findIndex(l => new RegExp('^\\s*function\\s+' + nome.replace(/\$/g, '\\$') + '\\s*\\(').test(l));
  if (i < 0) throw new Error('não achei ' + nome + ' em ' + arquivo);
  let d = 0, ini = false, out = [];
  for (let j = i; j < L.length; j++) { out.push(L[j]); for (const c of L[j]) { if (c === '{') { d++; ini = true; } else if (c === '}') d--; } if (ini && d <= 0) break; }
  return { codigo: out.join('\n'), linha: i + 1 };
}
const FUNCS = [
  ['SGO_Auth.js', 'isAdminPerfilAuth_'], ['SGO_Auth.js', 'SGO_ehPerfilRH_'], ['SGO_Auth.js', 'SGO_ehGestaoRotina_'], ['SGO_Auth.js', 'SGO_podeConsultarPessoas_'],
  ['SGO_Chaves.js', 'Chaves_ehDonoUsuario_'],
  ['SGO_Comercial_Config.js', 'Com_ehDono_'], ['SGO_Comercial_Config.js', 'Com_nivelDe_'], ['SGO_Comercial_Contatos.js', 'ComCt_podeVer_'], ['SGO_Comercial_CatalogoOficial.js', 'ComCat_podeMudarPreco_'],
  ['SGO_Compras_Config.js', 'Cmp_ehDono_'], ['SGO_Compras_Config.js', 'Cmp_nivelDe_'], ['SGO_Compras_Faturas.js', 'CmpCart_podeEditar_'], ['SGO_Compras_Faturas.js', 'CmpCart_podeVer_'],
  ['SGO_Assistencia_Config.js', 'Ast_ehDono_'], ['SGO_Assistencia_Config.js', 'Ast_nivelDe_'], ['SGO_Assistencia_OS.js', 'AstO_podeTransferir_'], ['SGO_Assistencia_OS.js', 'AstO_podeGerirFila_'], ['SGO_Assistencia_Ronda.js', 'AstRd_podeSugestao_'],
  ['SGO_Conduta_Ocorrencias.js', 'Conduta_veIdentidadeUsuario_'], ['SGO_Gestao_Decisoes.js', 'Ges_veSigilo_'], ['SGO_Gestao_Decisoes.js', 'Ges_podeConfigurar_'], ['SGO_Gestao_Decisoes.js', 'Ges_ehDiretoriaSessao_'], ['SGO_Gestao_Decisoes.js', 'Ges_ehGestaoPerfil_'], ['SGO_Gestao_Decisoes.js', 'Ges_ehRotinaPerfil_'],
  ['SGO_Licitacoes_Config.js', 'Lic_ehDono_'], ['SGO_Licitacoes_Config.js', 'Lic_nivelDe_'], ['SGO_Licitacoes_Pareceres.js', 'LicPar_podeMudarCfg_'],
  ['SGO_Automacao_Predial.js', 'AutPred_ehDonoLogin_'], ['SGO_Automacao_Predial.js', 'AutPred_usuarioEhDiretor_'],
  ['SGO_QualifEmissao.js', 'SGO_QE_ehAprovador_'], ['SGO_CadastroQualidade.js', 'CadQ_podeJuntar_'], ['SGO_Representacao.js', 'RepI_podeAdministrar_'], ['SGO_SegurancaAcesso.js', 'SegAcesso_ehAdmin_'], ['SGO_SegurancaAcesso.js', 'SegAcesso_podeVer_'],
  ['SGO_Frota_Reservas.js', 'FrotaRes_ehGestaoPerfil_'], ['SGO_Frota_Reservas.js', 'FrotaRes_ehGestaoRotina_'],
];
const up = v => String(v === null || v === undefined ? '' : v).trim().toUpperCase();
const s_ = v => String(v === null || v === undefined ? '' : v).trim();
const ctx = {
  SGO_UTILS: { safeUpper: up, safe: s_ }, SGO_DONOS: ['admin'], SGO_PERFIS_ROTINA: ['ADMIN', 'DIRETORIA', 'GESTOR', 'RH', 'FINANCEIRO'],
  Com_up_: up, Com_s_: s_, CadQ_up_: up, Rep_s_: s_, Cmp_up_: up, Cmp_s_: s_, Ast_up_: up, Ast_s_: s_, Ges_up_: up, Lic_up_: up, Lic_s_: s_, AutPred_s_: s_, FrotaRes_up_: up, SegAcesso_txt_: s_,
  Com_gestoresConfigurados_: () => CFG.comGestores.slice(), Cmp_regras_: () => ({ compradores: CFG.compradores, substitutos: CFG.substitutos, areaCompras: CFG.areaCompras }),
  Ges_cfg_: () => ({ gestoresPorArea: CFG.gestoresPorArea }), Rep_responsaveis_: () => ({ ids: CFG.repResponsaveis }),
  SGO_areaDoUsuario_: (u) => ({ codigo: up(u.AREA) }), Areas_contaDoSistema_: () => false,
};
vm.createContext(ctx);
for (const [arq, nome] of FUNCS) vm.runInContext(extrair(arq, nome).codigo, ctx, { filename: arq });
vm.runInContext('var AUVO_ACERVO_CFG = { PERFIS: ["ADMIN","DIRETORIA"] }', ctx);
const PERF_APROV = ['ADMIN', 'DIRETORIA', 'GESTOR', 'METROLOGIA']; // SGO_AutoRel_Config.js:341 (= LavRel, CadeiaFrio, Estufa)
const PERF_BT = ['ADMIN', 'DIRETORIA', 'GESTOR'];                // SGO_BaixaTemp_Config.js:43
const SETORES = ['TECNICA', 'METROLOGIA', 'COMERCIAL', 'LOGISTICA', 'ADMINISTRATIVO'];

// produção: o que a função de hoje responde para cada conta (só onde a regra depende de perfil/área/listas)
const P = (u) => {
  const sess = { perfil: u.perfil, usuario: u.login, userId: u.id };
  const com = ctx.Com_nivelDe_({ id: u.id, perfil: u.perfil, area: u.area, login: u.login }, CFG.comGestores);
  const cmp = ctx.Cmp_nivelDe_({ id: u.id, perfil: u.perfil, area: u.area, login: u.login });
  const ast = Object.assign({ id: u.id, perfil: u.perfil, area: u.area, login: u.login }, ctx.Ast_nivelDe_({ id: u.id, perfil: u.perfil, area: u.area, login: u.login }));
  const uGes = { ativo: true, sistema: false, perfil: u.perfil, area: u.area, diretoria: u.perfil === 'DIRETORIA' || ctx.Chaves_ehDonoUsuario_(u.login) };
  const rotina = ctx.SGO_ehGestaoRotina_(u.perfil), gd = ctx.isAdminPerfilAuth_(u.perfil);
  return {
    CONTAS_VER: rotina, CONTAS_CRIAR: rotina, CONTAS_ALTERAR_OUTROS: rotina, CONTAS_INATIVAR: rotina, AREAS_GERIR: ctx.SGO_podeConsultarPessoas_(u.perfil),
    SEGURANCA_VER_REGISTRO: ctx.SegAcesso_podeVer_(sess) && u.perfil !== 'REPRESENTADA', SEGURANCA_ALTERAR: ctx.SegAcesso_ehAdmin_(sess),
    CONDUTA_VER_NOMES: gd && ctx.Conduta_veIdentidadeUsuario_({ STATUS: 'ATIVO', PERFIL: u.perfil, USUARIO: u.login, AREA: u.area }),
    CONDUTA_DECIDIR: gd && ctx.Conduta_veIdentidadeUsuario_({ STATUS: 'ATIVO', PERFIL: u.perfil, USUARIO: u.login, AREA: u.area }),
    CONDUTA_MISSAO_DECIDIR: gd, CONDUTA_FECHAR_MES: gd,
    FIN_CARTOES_VER: !!ctx.CmpCart_podeVer_(cmp), FIN_CARTOES_EDITAR: !!ctx.CmpCart_podeEditar_(cmp),
    RELATORIO_TECNICO_APROVAR: ctx.SGO_QE_ehAprovador_(sess, PERF_APROV), RELATORIO_BAIXATEMP_APROVAR: ctx.SGO_QE_ehAprovador_(sess, PERF_BT),
    COMPRAS_VER_FILA: !!cmp.veFila, COMPRAS_VER_VALORES: !!cmp.veValores, COMPRAS_COMPRAR: !!cmp.comprador, COMPRAS_GESTAO: !!cmp.gestao, COMPRAS_REGRAS_EDITAR: !!cmp.regras, FIN_CONFERIR_COMPRAS: !!cmp.financeiro,
    FROTA_RESERVAS_GERIR: ctx.FrotaRes_ehGestaoRotina_(u.perfil),
    COM_USAR: !!(com.gestao || com.vendedor), COM_TODAS_AS_VENDAS: !!com.gestao, COM_PEDIDOS_APROVADOS: !!(com.gestao || com.vendedor || com.financeiro), COM_VER_VALORES: !!com.veValores, COM_VER_CUSTO: !!com.veCusto,
    COM_CATALOGO_EDITAR: !!com.catalogo, COM_CATALOGO_EDITAR_VENDA: !!com.catalogoVenda, COM_CONTATOS_CLIENTES: ctx.ComCt_podeVer_(Object.assign({ perfil: u.perfil }, com)),
    COM_POLITICA_PRECOS: ctx.ComCat_podeMudarPreco_(Object.assign({ perfil: u.perfil }, com)),
    AST_USAR: !!ast.interno, AST_GESTAO: !!ast.gestao, AST_REGRAS: !!ast.regras, AST_VER_VALORES: !!ast.valores, AST_EXCLUIR: !!ast.excluir,
    AST_TRANSFERIR_OS: !!ctx.AstO_podeTransferir_(ast), AST_GERIR_FILA_SETOR: SETORES.some(s => ctx.AstO_podeGerirFila_(ast, s)), RONDA_SUGESTAO_DECIDIR: ctx.AstRd_podeSugestao_(ast),
    AST_VER_TODOS_CHAMADOS: !!(ast.interno && (ast.gestao || (ast.interno && !ast.tecnico))),
    REP_ADMINISTRAR: ctx.RepI_podeAdministrar_({ id: u.id, perfil: u.perfil, diretoria: ast.diretoria }),
    GESTAO_VER_SIGILO: ctx.Ges_veSigilo_(uGes), GESTAO_CONFIGURAR: ctx.Ges_podeConfigurar_(sess), GESTAO_AVALIACAO_GESTORES: ctx.Ges_ehDiretoriaSessao_(sess),
    GESTAO_CAIXA_VER_TODAS: ctx.Ges_ehGestaoPerfil_(u.perfil), GESTAO_CAIXA_DECISOES: ctx.Ges_ehRotinaPerfil_(u.perfil),
    LIC_USAR: ctx.Lic_nivelDe_({ perfil: u.perfil, login: u.login }).gestao, LIC_ALCADAS: ctx.LicPar_podeMudarCfg_({ perfil: u.perfil, login: u.login }),
    CADASTROS_JUNTAR_DUPLICADOS: ctx.CadQ_podeJuntar_(sess), AUVO_ACERVO: ctx.AUVO_ACERVO_CFG.PERFIS.indexOf(u.perfil) >= 0,
    AUT_PORTA_DIRETORIA_VER: ctx.AutPred_usuarioEhDiretor_({ PERFIL: u.perfil, VINCULO_TRABALHO: u.vinculo, USUARIO: u.login }),
  };
};
let total = 0, falhas = [];
for (const u of USUARIOS) {
  const prod = P(u);
  for (const cod of Object.keys(prod)) {
    if (cod === 'AUT_PORTA_DIRETORIA_VER') continue;
    const p = cat.poderes.find(x => x.codigo === cod);
    if (!p) { falhas.push('sem poder ' + cod); continue; }
    // conta REPRESENTADA: exigirSessao recusa fora do módulo dela (o catálogo grava NÃO)
    const esperado = u.perfil === 'REPRESENTADA' ? false : !!prod[cod];
    total++;
    if (p.hoje[u.login] !== esperado) falhas.push(cod + ' ' + u.login + ': produção=' + esperado + ' catálogo=' + p.hoje[u.login]);
  }
}
console.log('comparações:', total, 'poderes testados:', Object.keys(P(USUARIOS[0])).length - 1, 'divergências:', falhas.length);
falhas.slice(0, 40).forEach(f => console.log('  ' + f));
process.exitCode = falhas.length ? 1 : 0;
