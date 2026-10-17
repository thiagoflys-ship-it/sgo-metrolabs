/****************************************************
 * SGO_Qualidade_Main.js
 * PAINEL DE QUALIDADE — backend principal
 *
 * Pedido do usuário 2026-08-28: módulo de gestão da qualidade de verdade —
 * não só leitura, serve pra agir (cobrar/parabenizar, com registro que
 * fica salvo — ver SGO_Qualidade_Ocorrencias.js) e gerar relatório A4 com
 * IA (ver SGO_Qualidade_Relatorio.js/SGO_Qualidade_IA.js). Desenhado pra
 * crescer: cada área (Auvo, Frota, e o que entrar depois) é um coletor
 * isolado num arquivo próprio (padrão `Qualidade<Area>_coletar_()`) — 1
 * arquivo novo + 1 linha aqui é o suficiente pra adicionar uma área nova.
 * Acesso restrito a Gestor/Administrador.
 ****************************************************/

function Qualidade_exigirGestor_(sessionId) {
  if (!isAdminSession(sessionId)) {
    throw new Error('Acesso restrito a Gestor/Administrador — esta ação não está disponível para o seu perfil.');
  }
}

function Qualidade_apiDispatch(req) {
  req = req || {};
  exigirSessao(String(req.sessionId || ''));
  var fn = String(req.fn || '').trim();
  var payload = req.payload || {};

  var allow = {
    apiObterPainel: Qualidade_apiObterPainel,
    apiRegistrarOcorrencia: Qualidade_apiRegistrarOcorrencia,
    apiListarOcorrencias: Qualidade_apiListarOcorrencias,
    apiResolverOcorrencia: Qualidade_apiResolverOcorrencia,
    apiGerarRelatorio: Qualidade_apiGerarRelatorio,
    apiObterAvisosLogin: Qualidade_apiObterAvisosLogin,
    apiMarcarCiencia: Qualidade_apiMarcarCiencia
  };

  if (!fn) throw new Error('Função não informada.');
  if (!allow[fn] || typeof allow[fn] !== 'function') throw new Error('Função não permitida ou não encontrada: ' + fn);

  return allow[fn](req.sessionId, payload);
}

// Cada área avaliada é um coletor isolado em SGO_Qualidade_<Area>.js
// (função Qualidade<Area>_coletar_()). Adicionar área nova = criar o
// arquivo + 1 linha aqui dentro do try/catch, na mesma forma.
function Qualidade_coletarTodasAreas_(desde) {
  var resultado = {};
  try { resultado.auvo = QualidadeAuvo_coletar_(desde); } catch (e) { resultado.auvo = {indisponivel:true,erro:String(e.message||e),total:0}; }
  try { resultado.frota = QualidadeFrota_coletar_(desde); } catch (e) { resultado.frota = {indisponivel:true,erro:String(e.message||e),totalMovimentacoes:0}; }
  return resultado;
}

function Qualidade_apiObterPainel(sessionId,payload) {
  Qualidade_exigirGestor_(sessionId);
  var dias=Number((payload||{}).periodoDias);if(!isFinite(dias)||dias<=0)dias=30;
  var desde=new Date(Date.now()-dias*86400000),areas=Qualidade_coletarTodasAreas_(desde),a=areas.auvo||{},f=areas.frota||{};
  var pendencias=(a.semRelato||0)+(a.semFoto||0)+(a.questionariosVazios||0)+(a.finalizadasSemCheckout||0)+(a.semVinculo||0)+(f.totalIncompletas||0)+(f.viagensPenduradas||0)+(f.multasSemCondutor||0)+(f.documentosVencidos||0)+(f.cnhVencidas||0);
  // 16/10/2026 (auditoria P2): "OK, integrações respondendo" aparecia com o Auvo sem chaves.
  var props=PropertiesService.getScriptProperties(),auvoConfigurado=!!(props.getProperty('AUVO_API_KEY')&&props.getProperty('AUVO_API_TOKEN'));
  return Object.assign({ok:true,auvoConfigurado:auvoConfigurado,periodoDias:dias,geradoEm:Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'America/Sao_Paulo','dd/MM/yyyy HH:mm'),resumo:{pendencias:pendencias,atendimentos:a.total||0,movimentacoes:f.totalMovimentacoes||0,areasIndisponiveis:(a.indisponivel?1:0)+(f.indisponivel?1:0)}},areas);
}

function Qualidade_obterConteudoModulo() {
  return QUALIDADE_CONTEUDO_MODULO;
}
