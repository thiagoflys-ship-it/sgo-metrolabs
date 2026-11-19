/** 19/11/2026, somente leitura: por que GS08-GS11 nunca saíram. */
function Ensaio_diagMat_() {
  var out = {};
  try { AvG_registrarEventos_(); } catch (e) { out.regErr = String(e); }
  ['GS04','GS06','GS08','GS09','GS10','GS11'].forEach(function (c) { try { var r = SGO_avisoRegra_(c); out['regra_' + c] = r ? { gestao: r.gestao, ligada: r.gestaoLigada, decisao: r.decisao, tipo: AvG_tipoLigado_(r) } : null; } catch (e) { out['regra_' + c] = 'ERR ' + e; } });
  try { out.soDiretoria = Cmp_soDiretoria_(); } catch (e) { out.soDiretoria = 'ERR ' + e; }
  try { out.delegadoIdsPadrao = SGO_delegadoIds_(null); } catch (e) { out.delegadoIdsPadrao = 'ERR ' + e; }
  try { var rg = Cmp_regras_(); out.cmpRegrasVersao = rg.versao; out.cmpDelegadoGravado = rg.delegado; var us = Cmp_usuarios_(); var cfg = Cmp_delegadoCfg_(rg, us); out.cmpCfg = cfg;
    out.cmpDonoDir = Cmp_donoDiretoria_(us, []).map(function (id) { return id + ' ' + (us[id] && us[id].nome); });
    out.cmpDestinosTres = CmpC_destinosTres_(us, cfg, []).map(function (id) { return id + ' ' + (us[id] && us[id].nome); });
  } catch (e) { out.cmpErr = String(e && e.stack || e).slice(0, 600); }
  try { var c2 = ComDel_cfg_(); out.comCfg = c2; out.comDestinos = ComDel_destinos_([], c2); } catch (e) { out.comErr = String(e && e.stack || e).slice(0, 600); }
  try { var us2 = AvG_usuarios_(), ehG = AvG_filtroGestao_(us2); out.usuariosGestao = Object.keys(us2).filter(function (id) { return /MATHEUS|CHARLES|THIAGO|ADMIN/i.test(us2[id].nome + ' ' + us2[id].login); }).map(function (id) { var u = us2[id]; return { id: id, nome: u.nome, login: u.login, perfil: u.perfil, ativo: u.ativo, dir: u.diretoria, dono: u.dono, gestao: u.gestao, sistema: u.sistema, ehG: ehG(id) }; }); } catch (e) { out.usErr = String(e); }
  try { var cu = Com_usuarios_(), gest = Com_gestoresConfigurados_(); out.comNivel = Object.keys(cu).filter(function (id) { return /MATHEUS/i.test(cu[id].nome); }).map(function (id) { return { id: id, nivel: Com_nivelDe_(cu[id], gest) }; }); } catch (e) { out.comNivErr = String(e); }
  try { out.tipos = { CmpC_avisarNovaSolicitacao_: typeof CmpC_avisarNovaSolicitacao_, SGO_avisoTresNaHora_: typeof SGO_avisoTresNaHora_, ComDel_avisoTres_: typeof ComDel_avisoTres_, CmpC_rodadaDelegado_: typeof CmpC_rodadaDelegado_, ComDel_rodada_: typeof ComDel_rodada_ }; } catch (e) {}
  return out;
}
