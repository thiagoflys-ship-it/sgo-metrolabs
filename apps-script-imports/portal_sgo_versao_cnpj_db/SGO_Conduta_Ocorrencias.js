/****************************************************
 * PROGRAMA DE CONDUTA — OCORRÊNCIAS, EVENTOS POSITIVOS E MÁQUINA DE ESTADOS
 *
 * Implementa a seção 4 do briefing (fluxo de estados) e a reincidência
 * da seção 6, sobre as abas criadas em SGO_Conduta_Setup.js.
 *
 * Máquina de estados de uma ocorrência:
 *
 *   REGISTRADA ──homologa (aprovar)──> HOMOLOGADA ──sem contestar (prazo)──> FIRME
 *      │                                    │                                  │
 *      │ prazo vencido sem decisão          │ contesta                        │ recurso (prazo)
 *      ▼                                    ▼                                  ▼
 *   DESCARTADA                          CONTESTADA ──julga (ANULAR/MANTER)──> ANULADA / FIRME
 *      (homologa/rejeitar também é                                            ▲
 *       decisão explícita -> REJEITADA)                    EM_RECURSO ────────┘ (mesmo julgamento,
 *                                                            reaberto por recurso)
 *
 * Só FIRME entra no cálculo de D (demérito). REJEITADA / DESCARTADA /
 * ANULADA não entram em D nem no placar. CONTESTADA / EM_RECURSO ficam
 * suspensas (fora de D) até decisão — regra explícita do briefing.
 *
 * Regra 12 (não negociável): quem homologa/julga não pode ser a mesma
 * pessoa que registrou a ocorrência como fiscal — bloqueado com
 * mensagem clara (não existe reatribuição automática pra outro gestor).
 ****************************************************/

// ------------------------------------------------------------
// DISPATCH
// ------------------------------------------------------------
function Conduta_apiDispatch(req) {
  req = req || {};
  Conduta_setup_(); // idempotente — garante schema+seed antes de qualquer chamada
  exigirSessao(String(req.sessionId || ''));
  // 2026-10-15: garante a rotina diária (prazos + fechamento automático) e o
  // saneamento único de 15/10 — leve: só lê propriedades na maioria das chamadas.
  try { Conduta_garantirRotina_(); } catch (eRotina) { SGO_DATA.log('CONDUTA_ROTINA_FALHA', 'sistema', String(eRotina && eRotina.message || eRotina), 'CONDUTA'); }
  var fn = String(req.fn || '').trim();
  var payload = req.payload || {};

  var allow = {
    apiPing: Conduta_apiPing,
    apiListarCatalogoOcorrencias: Conduta_apiListarCatalogoOcorrencias,
    apiListarEventosPositivosTipo: Conduta_apiListarEventosPositivosTipo,
    apiListarDistancias: Conduta_apiListarDistancias,
    apiCadastrarDestino: Conduta_apiCadastrarDestino,
    apiResolverDestinoCnpj: Conduta_apiResolverDestinoCnpj,
    apiListarColegas: Conduta_apiListarColegas,
    apiListarBiblioteca: Conduta_apiListarBiblioteca,
    apiObterMaterialBiblioteca: Conduta_apiObterMaterialBiblioteca,

    apiUploadFoto: Conduta_apiUploadFoto,
    apiRegistrarOcorrencia: Conduta_apiRegistrarOcorrencia,
    apiListarOcorrencias: Conduta_apiListarOcorrencias,
    apiHomologarOcorrencia: Conduta_apiHomologarOcorrencia,
    apiPreviaFechamento: Conduta_apiPreviaFechamento,
    apiDocumentoPrevia: Conduta_apiDocumentoPrevia,
    apiContestarOcorrencia: Conduta_apiContestarOcorrencia,
    apiJulgarOcorrencia: Conduta_apiJulgarOcorrencia,
    apiRecorrerOcorrencia: Conduta_apiRecorrerOcorrencia,

    apiRegistrarEventoPositivo: Conduta_apiRegistrarEventoPositivo,
    apiListarEventosPositivos: Conduta_apiListarEventosPositivos,

    apiRegistrarMissao: Conduta_apiRegistrarMissao,
    apiListarMissoes: Conduta_apiListarMissoes,
    apiRemoverMissao: Conduta_apiRemoverMissao,
    apiDecidirMissao: Conduta_apiDecidirMissao,
    apiGerarExtratoColaborador: Conduta_apiGerarExtratoColaborador,
    // 20/10/2026: relatório de todos os colaboradores (gestão, Diretoria e RH)
    apiGerarRelatorioEquipe: Conduta_apiGerarRelatorioEquipe,

    apiRegistrarAusencia: Conduta_apiRegistrarAusencia,
    apiListarAusencias: Conduta_apiListarAusencias,
    apiRemoverAusencia: Conduta_apiRemoverAusencia,

    apiProcessarPrazosVencidosAgora: Conduta_apiProcessarPrazosVencidosAgora,
    apiAtivarChecagemDiariaPrazos: Conduta_apiAtivarChecagemDiariaPrazos,
    apiDesativarChecagemDiariaPrazos: Conduta_apiDesativarChecagemDiariaPrazos,
    apiStatusChecagemDiariaPrazos: Conduta_apiStatusChecagemDiariaPrazos,

    apiFecharCompetencia: Conduta_apiFecharCompetencia,
    apiObterFechamento: Conduta_apiObterFechamento,
    apiListarFechamentos: Conduta_apiListarFechamentos,
    apiObterFarolAtual: Conduta_apiObterFarolAtual,
    apiObterVersaoFarol: Conduta_apiObterVersaoFarol,

    apiGerarRelatorio: Conduta_apiGerarRelatorio,
    apiObterRelatorio: Conduta_apiObterRelatorio,
    apiListarRelatorios: Conduta_apiListarRelatorios
    ,apiGerarRelatorioSemanal: Conduta_apiGerarRelatorioSemanal
    ,apiGerarRelatorioMissoes: Conduta_apiGerarRelatorioMissoes
    ,apiListarRelatoriosGerenciais: Conduta_apiListarRelatoriosGerenciais
    ,apiObterRelatorioGerencial: Conduta_apiObterRelatorioGerencial
    ,apiAtivarRelatorioSemanalAutomatico: Conduta_apiAtivarRelatorioSemanalAutomatico
    // 2026-10-15: avisos com registro de ciência, quem viu cada ocorrência,
    // fechamento automático e rotina diária (SGO_Conduta_Ciencia.js)
    ,apiObterAvisos: Conduta_apiObterAvisos
    ,apiRegistrarCiencia: Conduta_apiRegistrarCiencia
    ,apiPainelCiencia: Conduta_apiPainelCiencia
    ,apiRodarRotinaAgora: Conduta_apiRodarRotinaAgora
    ,apiPreverRotina: Conduta_apiPreverRotina
    // 19/10/2026: sugestões vindas dos outros módulos, análise de causa, planos 5W2H/PDCA,
    // Kanban e indicadores por área (SGO_Conduta_Qualidade.js)
    ,apiListarSugestoes: Conduta_apiListarSugestoes
    ,apiColetarSugestoesAgora: Conduta_apiColetarSugestoesAgora
    ,apiAceitarSugestao: Conduta_apiAceitarSugestao
    ,apiDescartarSugestao: Conduta_apiDescartarSugestao
    ,apiSalvarAnaliseCausa: Conduta_apiSalvarAnaliseCausa
    ,apiCriarPlanoAcao: Conduta_apiCriarPlanoAcao
    ,apiAdicionarAcaoPlano: Conduta_apiAdicionarAcaoPlano
    ,apiAvancarPlano: Conduta_apiAvancarPlano
    ,apiListarPlanos: Conduta_apiListarPlanos
    ,apiKanbanQualidade: Conduta_apiKanbanQualidade
    ,apiIndicadoresQualidade: Conduta_apiIndicadoresQualidade
  };

  if (!fn) throw new Error('Função não informada.');
  if (!allow[fn] || typeof allow[fn] !== 'function') throw new Error('Função não permitida ou não encontrada: ' + fn);

  var resultado = allow[fn](req.sessionId, payload);
  // 17/10/2026: ocorrência, ciência, missão e fechamento mudam pendências do Início.
  if (!/^api(Ping|Listar|Obter|Previa|Prever|Status|Painel|GerarRelatorio|GerarExtrato|Kanban|Indicadores)/.test(fn) && typeof SGO_Pendencias_invalidar_ === 'function') {
    try { SGO_Pendencias_invalidar_(); } catch (eInv) {}
  }
  // 19/10/2026: o farol aberto em outras telas só busca de novo quando este carimbo muda.
  if (!/^api(Ping|Listar|Obter|Previa|Prever|Status|Painel|GerarRelatorio|GerarExtrato|UploadFoto|Documento|Kanban|Indicadores|ColetarSugestoes|SalvarAnalise|CriarPlano|AdicionarAcao|AvancarPlano|DescartarSugestao)/.test(fn) && typeof Conduta_marcarMudancaFarol_ === 'function') Conduta_marcarMudancaFarol_();
  return resultado;
}

function Conduta_apiPing() {
  return { ok: true, versao: '1.0' };
}

// ------------------------------------------------------------
// GUARDAS DE ACESSO
// ------------------------------------------------------------
function Conduta_exigirEquipe_(sessionId) {
  var sessao = exigirSessao(sessionId);
  if (SGO_UTILS.safeUpper(sessao.perfil) === 'CLIENTE') {
    throw new Error('Acesso restrito à equipe Metrolab.');
  }
  return sessao;
}

// Consulta de todos (19/10/2026): gestão (isAdminSession) e o perfil RH. Só LEITURA:
// ocorrências, missões, ausências, fechamentos, relatórios e extratos de qualquer pessoa.
// Homologar, julgar, decidir missão, registrar ausência e fechar o mês continuam em
// Conduta_exigirGestor_ (o RH não faz). Ver SGO_Auth.js › SGO_podeConsultarPessoas_.
function Conduta_podeConsultarTodos_(sessionId) {
  if (isAdminSession(sessionId)) return true;
  try { var s = exigirSessao(sessionId); return typeof SGO_ehPerfilRH_ === 'function' && SGO_ehPerfilRH_(s && s.perfil); } catch (e) { return false; }
}

function Conduta_exigirGestor_(sessionId) {
  if (!isAdminSession(sessionId)) throw new Error('Acesso restrito a Gestor/Administrador/Diretoria.');
  return exigirSessao(sessionId);
}

// ------------------------------------------------------------
// DIRETORIA DECIDE O QUE É DELA (19/10/2026, decisão do dono)
// Quem é o colaborador envolvido não homologa nem julga a própria ocorrência
// (regra de 15/10), e quem é executante não decide a própria missão. A
// Diretoria não precisa pedir a ninguém: perfil DIRETORIA, ou o dono do
// sistema (mesma lista SGO_DONOS de Chaves e senhas, SGO_Chaves.js), decide
// mesmo sendo a envolvida — com fundamentação obrigatória e a marca gravada
// na ocorrência (DECISAO_DIRETORIA), no histórico (HISTORICO_JSON) e na
// auditoria (SGO_DATA.log). Gestor e Administrador comum seguem a regra de
// 15/10. A Regra 12 (o fiscal que registrou não decide) não muda para ninguém.
// ------------------------------------------------------------
var CONDUTA_MARCA_DIRETORIA_OCORRENCIA = 'Decisão da Diretoria sobre ocorrência em que é envolvida';
var CONDUTA_MARCA_DIRETORIA_MISSAO = 'Decisão da Diretoria sobre missão em que é envolvida';
var CONDUTA_FUNDAMENTACAO_DIRETORIA_MIN = 15;

/** Perfil DIRETORIA ou dono do sistema (SGO_DONOS). */
function Conduta_ehDiretoriaOuDono_(sessao) {
  if (!sessao) return false;
  if (SGO_UTILS.safeUpper(sessao.perfil) === 'DIRETORIA') return true;
  try { return typeof Chaves_ehDonoUsuario_ === 'function' && Chaves_ehDonoUsuario_(sessao.usuario); } catch (e) { return false; }
}

/** Fundamentação da decisão da Diretoria em caso próprio: obrigatória, com conteúdo. */
function Conduta_exigirFundamentacaoDiretoria_(texto, oQue) {
  var t = String(texto || '').trim();
  if (t.length < CONDUTA_FUNDAMENTACAO_DIRETORIA_MIN) {
    throw new Error('Você é a pessoa envolvida nesta ' + oQue + ' e decide como Diretoria: escreva a fundamentação da decisão (pelo menos ' +
      CONDUTA_FUNDAMENTACAO_DIRETORIA_MIN + ' caracteres) no campo de texto da janela e confirme de novo. Ela fica gravada no histórico e no extrato.');
  }
  return t;
}

/** Acrescenta um passo ao histórico da ocorrência (HISTORICO_JSON); devolve o texto JSON novo. */
function Conduta_historicoAcrescentar_(oc, sessao, acao, decisao, texto, marca) {
  var lista = [];
  try { lista = JSON.parse(String((oc && oc.HISTORICO_JSON) || '[]')); } catch (e) { lista = []; }
  if (!Array.isArray(lista)) lista = [];
  lista.push({ em: SGO_UTILS.nowIso(), porId: String(sessao.userId || ''), por: String(sessao.nome || sessao.usuario || ''),
    perfil: SGO_UTILS.safeUpper(sessao.perfil), acao: acao, decisao: decisao, texto: String(texto || ''), marca: marca || '' });
  return JSON.stringify(lista);
}

// ------------------------------------------------------------
// DATAS / DIAS ÚTEIS (não existe um genérico "somar N dias úteis" no
// projeto — o único parecido, CronExec_garantirDiaUtil_, só empurra pro
// próximo dia útil, não soma N. Sem calendário de feriados, igual ao
// resto do projeto.)
// ------------------------------------------------------------
function Conduta_formatarDataISO_(d) {
  var yyyy = d.getFullYear();
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd;
}

// CORREÇÃO 2026-09-24 (bug de produção: ocorrência registrada não entrava no
// contador e a tela mostrava "2026-09-24T00:00:00").
// Causa raiz: as colunas de data/competência são gravadas como string ISO,
// mas o Sheets converte sozinho o que "parece data" em Date de verdade —
// inclusive 'YYYY-MM' da COMPETENCIA, que vira o dia 1º do mês. Na volta,
// SGO_DATA.getAll() chama formatDateForOutput_(), que devolve
// "yyyy-MM-dd'T'HH:mm:ss". Resultado: COMPETENCIA voltava '2026-09-01T00:00:00'
// e NUNCA batia com '2026-09' em nenhuma das comparações do módulo — o que
// zerava D, placar, farol e fechamento em silêncio.
// Só o forcarColunaTexto_ não resolve: ele muda o FORMATO da coluna, não
// converte o que já foi gravado como Date. Por isso normalizamos na LEITURA,
// que conserta as linhas antigas também.
function Conduta_soData_(v) {
  if (v instanceof Date) return Conduta_formatarDataISO_(v);
  var s = String(v || '').trim();
  if (!s) return '';
  var m = s.match(/^\d{4}-\d{2}-\d{2}/); // 'YYYY-MM-DD' e 'YYYY-MM-DDTHH:mm:ss'
  return m ? m[0] : s;
}

function Conduta_soComp_(v) {
  var d = Conduta_soData_(v);
  return d ? d.substring(0, 7) : ''; // 'YYYY-MM' (de data completa ou já curta)
}

function Conduta_parseDataISO_(s) {
  // tolera Date e 'YYYY-MM-DDTHH:mm:ss' -- antes, split('-') devolvia
  // '24T00:00:00' no dia e Number() virava NaN => Invalid Date silencioso
  // em todo cálculo de prazo.
  var partes = Conduta_soData_(s).split('-');
  return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
}

function Conduta_hojeISO_() {
  return Conduta_formatarDataISO_(new Date());
}

function Conduta_competenciaDe_(dataISO) {
  return Conduta_soComp_(dataISO); // 'YYYY-MM' -- tolera Date e ISO com hora
}

function Conduta_validarCompetencia_(valor) {
  var competencia = String(valor || '').trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) throw new Error('Competência inválida (use AAAA-MM).');
  return competencia;
}

function Conduta_exigirCompetenciaAberta_(competencia) {
  var congelado = SGO_DATA.getAll(CONDUTA_SHEETS.FECHAMENTO).some(function (f) {
    return Conduta_soComp_(f.COMPETENCIA) === competencia &&
      (f.CONGELADO === true || SGO_UTILS.safeUpper(f.CONGELADO) === 'TRUE');
  });
  if (congelado) throw new Error('O mês de ' + Conduta_nomeCompetencia_(competencia) + ' já foi fechado e congelado: nada com data nesse mês pode ser lançado, alterado ou removido no programa. Confira a data informada; se o caso for real, a gestão registra o ajuste fora do programa (o fechamento não é refeito).');
}

function Conduta_somarDiasUteis_(dataISO, n) {
  var d = Conduta_parseDataISO_(dataISO);
  var restante = Number(n) || 0;
  while (restante > 0) {
    d.setDate(d.getDate() + 1);
    var diaSemana = d.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) restante--;
  }
  return Conduta_formatarDataISO_(d);
}

// ------------------------------------------------------------
// CATÁLOGO (leitura)
// ------------------------------------------------------------
function Conduta_apiListarCatalogoOcorrencias(sessionId) {
  Conduta_exigirEquipe_(sessionId);
  return SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA_TIPO)
    .filter(function (t) { return SGO_UTILS.safeUpper(t.ATIVO) === 'TRUE' || t.ATIVO === true; })
    .sort(function (a, b) { return String(a.CODIGO).localeCompare(String(b.CODIGO)); });
}

function Conduta_apiListarEventosPositivosTipo(sessionId) {
  Conduta_exigirEquipe_(sessionId);
  return SGO_DATA.getAll(CONDUTA_SHEETS.EVENTO_POSITIVO_TIPO)
    .filter(function (t) { return SGO_UTILS.safeUpper(t.ATIVO) === 'TRUE' || t.ATIVO === true; })
    .sort(function (a, b) { return String(a.CODIGO).localeCompare(String(b.CODIGO)); });
}

function Conduta_apiListarDistancias(sessionId) {
  Conduta_exigirEquipe_(sessionId);
  return SGO_DATA.getAll(CONDUTA_SHEETS.DISTANCIA_REFERENCIA)
    .sort(function (a, b) { return Number(a.KM_TRECHO) - Number(b.KM_TRECHO); });
}

/**
 * Lista enxuta de colegas (ID+NOME só) pra seletor de picker — aberta a
 * qualquer membro da equipe (não exige admin, diferente de
 * usuariosListar/CAD_USUARIOS que é gestão completa de usuário). É o
 * cerne do programa: fiscalização mútua, qualquer um pode reportar
 * qualquer um.
 */
function Conduta_apiListarColegas(sessionId) {
  Conduta_exigirEquipe_(sessionId);
  var nomesAreas = typeof Cndq_nomesAreas_ === 'function' ? Cndq_nomesAreas_() : {};
  return SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS)
    .filter(function (u) { return SGO_UTILS.safeUpper(u.STATUS) === 'ATIVO' && SGO_UTILS.safeUpper(u.PERFIL) !== 'CLIENTE' && !Conduta_ehContaGenerica_(u); })
    // 19/10/2026: a área vem de CAD_USUARIOS.AREA (SGO_Areas.js); SETOR fica igual para as telas antigas.
    .map(function (u) { var ar = typeof Conduta_areaColaborador_ === 'function' ? Conduta_areaColaborador_(u, nomesAreas) : { codigo: '', nome: '' }; return { ID: u.ID, NOME: u.NOME, AREA: ar.codigo, AREA_NOME: ar.codigo ? ar.nome : '', SETOR: ar.codigo ? ar.nome : '' }; })
    .sort(function (a, b) { return String(a.NOME).localeCompare(String(b.NOME)); });
}

function Conduta_apiCadastrarDestino(sessionId, payload) {
  Conduta_exigirGestor_(sessionId); payload=payload||{};
  var destino=SGO_UTILS.safe(payload.destino), km=Number(String(payload.kmTrecho||'').replace(',','.'));
  if(!destino)throw new Error('Informe cidade e UF do destino.');
  if(!isFinite(km)||km<0)throw new Error('Informe a distância do trecho em quilômetros.');
  var existentes=SGO_DATA.getAll(CONDUTA_SHEETS.DISTANCIA_REFERENCIA);
  var cnpjLimpo=String(payload.cnpj||'').replace(/\D/g,'');
  var atual=existentes.find(function(d){return SGO_UTILS.safeUpper(d.DESTINO)===SGO_UTILS.safeUpper(destino)&&String(d.CNPJ||'').replace(/\D/g,'')===cnpjLimpo;});
  var dados={DESTINO:destino,KM_TRECHO:km,QUALIFICA:CondutaCalculo.missaoQualifica(km,Number(Conduta_obterParametros_().MISSAO_KM_MINIMO)||200),CLIENTE_ID:String(payload.clienteId||''),CNPJ:cnpjLimpo,ORIGEM:String(payload.origem||'MANUAL')};
  if(atual){SGO_DATA.update(CONDUTA_SHEETS.DISTANCIA_REFERENCIA,atual.ID,dados);dados.ID=atual.ID;}else dados=SGO_DATA.insert(CONDUTA_SHEETS.DISTANCIA_REFERENCIA,dados);
  return {success:true,item:dados};
}

function Conduta_apiResolverDestinoCnpj(sessionId,payload){
  Conduta_exigirEquipe_(sessionId);var cnpj=String((payload||{}).cnpj||'').replace(/\D/g,'');
  if(cnpj.length!==14)throw new Error('Informe um CNPJ válido com 14 dígitos.');
  var clientes=SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES), unidades=SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_UNIDADES);
  var unidade=unidades.find(function(u){return String(u.CNPJ_UNIDADE||'').replace(/\D/g,'')===cnpj;});
  var cliente=clientes.find(function(c){return String(c.CNPJ||'').replace(/\D/g,'')===cnpj;}) || (unidade&&clientes.find(function(c){return String(c.ID)===String(unidade.CLIENTE_ID);}));
  var cidade=unidade&&SGO_UTILS.safe(unidade.CIDADE),uf=unidade&&SGO_UTILS.safe(unidade.UF),origem='CAD_UNIDADES';
  if(!cidade){var pub=CertCal_apiConsultarCnpjPublico(sessionId,{cnpj:cnpj});cidade=pub.municipio||pub.cidade||'';uf=pub.uf||'';origem='BRASIL_API';}
  if(!cidade)throw new Error('A consulta não retornou a cidade deste CNPJ. Cadastre-a manualmente.');
  var destino=cidade+(uf?'/'+uf:'');var ref=SGO_DATA.getAll(CONDUTA_SHEETS.DISTANCIA_REFERENCIA).find(function(d){return SGO_UTILS.safeUpper(d.DESTINO)===SGO_UTILS.safeUpper(destino);});
  return {success:true,destino:destino,clienteId:cliente?cliente.ID:(unidade?unidade.CLIENTE_ID:''),clienteNome:cliente?(cliente.NOME_FANTASIA||cliente.RAZAO_SOCIAL):'',cnpj:cnpj,origem:origem,cadastrado:!!ref,referencia:ref||null};
}

function Conduta_buscarTipoOcorrencia_(codigo) {
  var tipo = SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA_TIPO)
    .find(function (t) { return SGO_UTILS.safeUpper(t.CODIGO) === SGO_UTILS.safeUpper(codigo); });
  if (!tipo) throw new Error('Código de ocorrência não encontrado no catálogo: ' + codigo);
  return tipo;
}

// ------------------------------------------------------------
// ÚLTIMA FIRME (âncora de reincidência — ANULADA nunca serve de âncora)
// ------------------------------------------------------------
function Conduta_ultimaFirmeMesmoTipo_(colaboradorId, tipoCodigo, antesDe) {
  var candidatas = SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA).filter(function (o) {
    // <=, não < : duas ocorrências do mesmo tipo no MESMO dia (data_fato
    // igual) também contam como reincidência (achado real do harness de
    // regressão — a comparação estrita excluía esse caso).
    return String(o.COLABORADOR_ID) === String(colaboradorId) &&
      SGO_UTILS.safeUpper(o.TIPO_CODIGO) === SGO_UTILS.safeUpper(tipoCodigo) &&
      SGO_UTILS.safeUpper(o.STATUS) === 'FIRME' &&
      Conduta_soData_(o.DATA_FATO) <= Conduta_soData_(antesDe);
  });
  if (!candidatas.length) return null;
  candidatas.sort(function (a, b) { return Conduta_soData_(b.DATA_FATO).localeCompare(Conduta_soData_(a.DATA_FATO)); });
  var ultima = candidatas[0];
  return { id: ultima.ID, dataFato: Conduta_soData_(ultima.DATA_FATO) };
}

// ------------------------------------------------------------
// UPLOAD DE FOTO — mesmo padrão de Frota_uploadFotoNaPasta_
// (SGO_Frota_Main.js): pasta própria no Drive, sharing por link, sem
// exigir perfil de gestor (qualquer um da equipe pode anexar evidência
// na ocorrência que está registrando).
// ------------------------------------------------------------
function Conduta_obterPastaFotos_() {
  var props = PropertiesService.getScriptProperties();
  var idSalvo = props.getProperty('CONDUTA_FOTOS_FOLDER_ID');
  if (idSalvo) {
    try { return DriveApp.getFolderById(idSalvo); } catch (e) { /* pasta salva não existe mais — recria abaixo */ }
  }
  var folder = DriveApp.getRootFolder().createFolder('Conduta - Fotos de Ocorrências');
  props.setProperty('CONDUTA_FOTOS_FOLDER_ID', folder.getId());
  return folder;
}

function Conduta_sanitizarNomeArquivo_(nome) {
  var limpo = String(nome || '').replace(/[\\/:*?"<>|#%]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80);
  return limpo || 'foto';
}

function Conduta_uploadFoto_(base64, mimeType, nomeArquivoSugerido) {
  var partes = String(base64 || '').split(',');
  var dadosBase64 = partes.length > 1 ? partes[1] : partes[0];
  var nomeArquivo = Conduta_sanitizarNomeArquivo_(nomeArquivoSugerido || 'foto-ocorrencia');

  var blob = Utilities.newBlob(Utilities.base64Decode(dadosBase64), mimeType || 'image/jpeg', nomeArquivo);
  var arquivo = Conduta_obterPastaFotos_().createFile(blob);
  arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return arquivo.getUrl();
}

function Conduta_apiUploadFoto(sessionId, payload) {
  Conduta_exigirEquipe_(sessionId);
  payload = payload || {};
  if (!payload.base64) throw new Error('Nenhuma imagem recebida.');
  var url = Conduta_uploadFoto_(payload.base64, payload.mimeType, payload.nomeArquivo);
  return { success: true, url: url };
}

// ------------------------------------------------------------
// REGISTRO (qualquer pessoa da equipe pode ser o "fiscal" — é o cerne
// do programa: fiscalização mútua, não só de cima pra baixo)
// ------------------------------------------------------------
function Conduta_apiRegistrarOcorrencia(sessionId, payload) {
  var sessao = Conduta_exigirEquipe_(sessionId);
  return Conduta_registrarOcorrencia_(sessao, payload || {}, {});
}

/**
 * Registro de ocorrência (tela ou sugestão aceita, SGO_Conduta_Qualidade.js).
 * opcoes.dataBasePrazo: data a partir da qual conta o prazo de registro (a
 * sugestão usa a data em que o SGO+ encontrou o caso); vazio = data do fato.
 * opcoes.origem: colunas ORIGEM_* e SUGESTAO_ID gravadas na ocorrência.
 */
function Conduta_registrarOcorrencia_(sessao, payload, opcoes) {
  opcoes = opcoes || {};
  var tipo = Conduta_buscarTipoOcorrencia_(payload.tipoCodigo);
  var colaboradorId = String(payload.colaboradorId || '').trim();
  if (!colaboradorId) throw new Error('Informe o colaborador envolvido.');
  // 2026-10-15: as ocorrências de setembro foram lançadas na conta genérica
  // "Administrador" — não é uma pessoa, não aparece no placar de ninguém.
  var colaboradorUsuario = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, colaboradorId);
  if (!colaboradorUsuario) throw new Error('Colaborador não encontrado.');
  if (Conduta_ehContaGenerica_(colaboradorUsuario)) throw new Error('Escolha a pessoa envolvida: a conta "' + (colaboradorUsuario.NOME || colaboradorUsuario.USUARIO) + '" é uma conta do sistema, não um colaborador.');
  // 19/10/2026 (pente fino): a lista da tela já trazia só a equipe ativa, mas o servidor aceitava
  // qualquer ID (cliente ou pessoa inativa), e a ocorrência ficava fora do farol de todos.
  if (SGO_UTILS.safeUpper(colaboradorUsuario.PERFIL) === 'CLIENTE') throw new Error('Escolha uma pessoa da equipe: a conta escolhida é de cliente.');
  if (SGO_UTILS.safeUpper(colaboradorUsuario.STATUS || 'ATIVO') !== 'ATIVO') throw new Error('A pessoa escolhida está inativa no SGO+: ocorrência só é registrada para quem está ativo. Se ela voltou, peça à gestão para reativar o usuário.');

  var dataFato = String(payload.dataFato || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataFato)) throw new Error('Data do fato inválida (use AAAA-MM-DD).');
  if (dataFato > Conduta_hojeISO_()) throw new Error('A data do fato não pode estar no futuro.');

  Conduta_exigirCompetenciaAberta_(Conduta_competenciaDe_(dataFato));

  var parametros = Conduta_obterParametros_();
  var prazoRegistroDias = Number(parametros.PRAZO_REGISTRO_DIAS_UTEIS) || 2;
  var basePrazo = Conduta_soData_(opcoes.dataBasePrazo) > dataFato ? Conduta_soData_(opcoes.dataBasePrazo) : dataFato;
  var limiteRegistro = Conduta_somarDiasUteis_(basePrazo, prazoRegistroDias);
  if (limiteRegistro < Conduta_hojeISO_()) {
    throw new Error('Prazo de registro (' + prazoRegistroDias + ' dias úteis após ' + (basePrazo === dataFato ? 'o fato' : 'a data em que o caso foi encontrado, ' + Conduta_dataBr_(basePrazo)) +
      ') já venceu: terminou em ' + Conduta_dataBr_(limiteRegistro) + '. Ocorrência fora do prazo não é registrada no programa; se for sugestão, descarte com o motivo "fora do prazo".');
  }
  var descricao = String(payload.descricao || '').trim().slice(0, 2000);

  var janelaDias = Number(parametros.JANELA_REINCIDENCIA_DIAS) || 90;
  var ultimaFirme = Conduta_ultimaFirmeMesmoTipo_(colaboradorId, tipo.CODIGO, dataFato);
  var aplicado = CondutaCalculo.aplicarNivel(
    { nivel: tipo.NIVEL, reincidivel: (SGO_UTILS.safeUpper(tipo.REINCIDIVEL) === 'TRUE' || tipo.REINCIDIVEL === true) },
    ultimaFirme, dataFato, janelaDias
  );

  var prazoHomologacaoDias = Number(parametros.PRAZO_HOMOLOGACAO_DIAS_UTEIS) || 3;

  var registro = SGO_DATA.insert(CONDUTA_SHEETS.OCORRENCIA, {
    TIPO_CODIGO: tipo.CODIGO,
    COLABORADOR_ID: colaboradorId,
    FISCAL_ID: sessao.userId,
    DATA_FATO: dataFato,
    COMPETENCIA: Conduta_competenciaDe_(dataFato),
    STATUS: 'REGISTRADA',
    NIVEL_APLICADO: aplicado.nivelAplicado,
    PESO_APLICADO: aplicado.pesoAplicado,
    REINCIDENCIA_DE_ID: aplicado.reincidenciaDeId || '',
    PRAZO_HOMOLOGACAO: Conduta_somarDiasUteis_(Conduta_hojeISO_(), prazoHomologacaoDias),
    FOTO_URL: String(payload.fotoUrl || ''),
    FOTO_LEGENDA: String(payload.fotoLegenda || ''),
    MISSAO_ID: String(payload.missaoId || ''),
    // 19/10/2026: o que aconteceu (antes só existia a legenda da foto) e o vínculo com a origem da sugestão.
    DESCRICAO: descricao,
    ORIGEM_MODULO: (opcoes.origem && opcoes.origem.ORIGEM_MODULO) || '',
    ORIGEM_TIPO: (opcoes.origem && opcoes.origem.ORIGEM_TIPO) || '',
    ORIGEM_ID: (opcoes.origem && opcoes.origem.ORIGEM_ID) || '',
    ORIGEM_ROTULO: (opcoes.origem && opcoes.origem.ORIGEM_ROTULO) || '',
    ORIGEM_TELA: (opcoes.origem && opcoes.origem.ORIGEM_TELA) || '',
    ORIGEM_LINK: (opcoes.origem && opcoes.origem.ORIGEM_LINK) || '',
    SUGESTAO_ID: (opcoes.origem && opcoes.origem.SUGESTAO_ID) || ''
  });

  return { success: true, item: registro };
}

function Conduta_apiListarOcorrencias(sessionId, payload) {
  var sessao = Conduta_exigirEquipe_(sessionId);
  payload = payload || {};
  // não-gestor só vê as próprias (fiscal ou envolvido); o RH consulta todas, sem homologar nem julgar
  var podeDecidir = isAdminSession(sessionId);
  var souDiretoria = podeDecidir && Conduta_ehDiretoriaOuDono_(sessao);
  var somenteMinhas = !podeDecidir && !Conduta_podeConsultarTodos_(sessionId);

  // CORREÇÃO 2026-09-24: a tela decidia às cegas. Quem homologava via só
  // "M03 · 24/09 · REGISTRADA" -- sem saber DE QUEM era, O QUE tinha
  // acontecido, e sem acesso à FOTO que o fiscal subiu. E quem julgava uma
  // contestação decidia sem poder ler a defesa, porque TEXTO_CONTESTACAO e
  // TEXTO_RECURSO eram gravados e nunca lidos por nenhuma tela. Montamos os
  // dois mapas UMA vez por chamada (não por linha) para não repetir leitura
  // de planilha.
  var nomes = {}, areasCol = {};
  var nomesAreas = typeof Cndq_nomesAreas_ === 'function' ? Cndq_nomesAreas_() : {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) {
    nomes[String(u.ID)] = u.NOME;
    if (typeof Conduta_areaColaborador_ === 'function') areasCol[String(u.ID)] = Conduta_areaColaborador_(u, nomesAreas);
  });
  var descricoes = {};
  SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA_TIPO).forEach(function (t) {
    descricoes[SGO_UTILS.safeUpper(t.CODIGO)] = { descricao: t.DESCRICAO, grupo: t.GRUPO };
  });

  return SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA).filter(function (o) {
    if (payload.competencia && Conduta_soComp_(o.COMPETENCIA) !== Conduta_soComp_(payload.competencia)) return false;
    if (payload.status && SGO_UTILS.safeUpper(o.STATUS) !== SGO_UTILS.safeUpper(payload.status)) return false;
    if (payload.colaboradorId && String(o.COLABORADOR_ID) !== String(payload.colaboradorId)) return false;
    if (somenteMinhas) {
      return String(o.FISCAL_ID) === String(sessao.userId) || String(o.COLABORADOR_ID) === String(sessao.userId);
    }
    return true;
  }).map(function (o) {
    // Normaliza o que sai para a tela: sem isso a data chegava crua como
    // '2026-09-24T00:00:00' quando a célula virou Date no Sheets (e
    // '2026-09-24' quando continuou texto) -- duas linhas da MESMA lista
    // saindo em formatos diferentes, que foi o que o usuário viu.
    // PODE_HOMOLOGAR é decidido aqui, no servidor, porque é onde a sessão é
    // conhecida: a Regra 12 proíbe quem registrou de homologar, e a tela
    // precisa saber disso ANTES de oferecer o botão.
    o.DATA_FATO = Conduta_soData_(o.DATA_FATO);
    o.COMPETENCIA = Conduta_soComp_(o.COMPETENCIA);
    o.PRAZO_HOMOLOGACAO = Conduta_soData_(o.PRAZO_HOMOLOGACAO);
    o.PRAZO_CONTESTACAO = Conduta_soData_(o.PRAZO_CONTESTACAO);
    o.PRAZO_RECURSO = Conduta_soData_(o.PRAZO_RECURSO);
    o.HOMOLOGADA_EM = Conduta_soData_(o.HOMOLOGADA_EM);
    o.SOU_O_FISCAL = String(o.FISCAL_ID) === String(sessao.userId);
    o.SOU_O_COLABORADOR = String(o.COLABORADOR_ID) === String(sessao.userId);
    // 19/10/2026: o envolvido não decide a própria ocorrência, salvo a Diretoria
    // (perfil DIRETORIA ou dono do sistema), que decide com fundamentação.
    o.DECIDE_COMO_DIRETORIA = o.SOU_O_COLABORADOR && souDiretoria;
    var envolvidoBloqueado = o.SOU_O_COLABORADOR && !souDiretoria;
    o.DECISAO_DIRETORIA = SGO_UTILS.safe(o.DECISAO_DIRETORIA);
    o.PODE_HOMOLOGAR = podeDecidir && !o.SOU_O_FISCAL && !envolvidoBloqueado;
    // Julgar tem a MESMA regra da homologação (gestor e não ser o fiscal):
    // antes a tela oferecia "Julgar" a todo mundo e o erro só aparecia depois
    // de escrever a fundamentação -- inclusive para o colaborador que tinha
    // acabado de contestar, que acreditava poder se absolver.
    o.PODE_JULGAR = podeDecidir && !o.SOU_O_FISCAL && !envolvidoBloqueado;
    // Contestar/recorrer são do ACUSADO (ou da gestão em nome dele), e só
    // dentro do prazo -- o servidor já recusava fora disso, mas a tela nunca
    // mostrava a data limite, então a pessoa descobria que perdeu o prazo
    // depois de escrever a defesa.
    var hojeISO = Conduta_hojeISO_();
    o.PRAZO_CONTESTACAO_VENCIDO = !!o.PRAZO_CONTESTACAO && o.PRAZO_CONTESTACAO < hojeISO;
    o.PRAZO_RECURSO_VENCIDO = !!o.PRAZO_RECURSO && o.PRAZO_RECURSO < hojeISO;
    // 16/10/2026: o botão Recorrer aparecia depois do recurso já julgado (o
    // servidor recusava) — cada ocorrência tem um recurso só. E só oferece cada
    // ação no status em que ela é aceita.
    var statusO = SGO_UTILS.safeUpper(o.STATUS);
    o.PODE_CONTESTAR = statusO === 'HOMOLOGADA' && (o.SOU_O_COLABORADOR || podeDecidir) && !o.PRAZO_CONTESTACAO_VENCIDO;
    o.PODE_RECORRER = statusO === 'FIRME' && !Conduta_soData_(o.RECURSO_EM) && (o.SOU_O_COLABORADOR || podeDecidir) && !o.PRAZO_RECURSO_VENCIDO;
    // Contexto para quem decide (e para quem se defende saber do que é acusado)
    var d = descricoes[SGO_UTILS.safeUpper(o.TIPO_CODIGO)] || {};
    o.COLABORADOR_NOME = nomes[String(o.COLABORADOR_ID)] || o.COLABORADOR_ID || '';
    o.FISCAL_NOME = nomes[String(o.FISCAL_ID)] || o.FISCAL_ID || '';
    o.TIPO_DESCRICAO = d.descricao || '';
    o.TIPO_GRUPO = d.grupo || '';
    // 19/10/2026: área do envolvido (CAD_USUARIOS.AREA) e o caminho até a origem da sugestão.
    var ar = areasCol[String(o.COLABORADOR_ID)] || { codigo: '', nome: 'Sem área definida' };
    o.COLABORADOR_AREA = ar.codigo;
    o.COLABORADOR_AREA_NOME = ar.nome;
    o.DESCRICAO = SGO_UTILS.safe(o.DESCRICAO);
    o.ORIGEM_ROTULO = SGO_UTILS.safe(o.ORIGEM_ROTULO);
    o.ORIGEM_TELA = SGO_UTILS.safe(o.ORIGEM_TELA);
    o.ORIGEM_LINK = SGO_UTILS.safe(o.ORIGEM_LINK);
    return o;
  }).sort(function (a, b) { return String(b.DATA_FATO).localeCompare(String(a.DATA_FATO)); });
}

// ------------------------------------------------------------
// HOMOLOGAÇÃO
// ------------------------------------------------------------
function Conduta_apiHomologarOcorrencia(sessionId, payload) {
  var sessao = Conduta_exigirGestor_(sessionId);
  payload = payload || {};
  var oc = SGO_DATA.getById(CONDUTA_SHEETS.OCORRENCIA, payload.id);
  if (!oc) throw new Error('Ocorrência não encontrada.');
  if (SGO_UTILS.safeUpper(oc.STATUS) !== 'REGISTRADA') throw new Error('Só é possível homologar uma ocorrência em status REGISTRADA.');

  // Regra 12: gestor não homologa registro em que ele é o fiscal.
  if (String(oc.FISCAL_ID) === String(sessao.userId)) {
    throw new Error('Você é o fiscal que registrou esta ocorrência — peça a outro Gestor/Administrador/Diretoria para homologar.');
  }
  // 2026-10-15: ninguém homologa (nem rejeita) a ocorrência em que é o próprio
  // colaborador envolvido — em setembro a conta "Administrador" homologou as
  // ocorrências lançadas em nome dela mesma.
  // 19/10/2026 (decisão do dono): a Diretoria decide mesmo sendo a envolvida.
  var diretoriaPropria = String(oc.COLABORADOR_ID) === String(sessao.userId);
  if (diretoriaPropria && !Conduta_ehDiretoriaOuDono_(sessao)) {
    throw new Error('Você é o colaborador envolvido nesta ocorrência — peça a outro Gestor/Administrador/Diretoria para decidir.');
  }
  // 2026-10-15: competência já fechada não recebe ocorrência nova — senão ela
  // ficaria fora do mês do fato (congelado) e também do mês atual.
  if (SGO_UTILS.safeUpper(payload.decisao) === 'APROVAR') Conduta_exigirCompetenciaAberta_(Conduta_soComp_(oc.COMPETENCIA || oc.DATA_FATO));

  var decisao = SGO_UTILS.safeUpper(payload.decisao);
  if (decisao !== 'APROVAR' && decisao !== 'REJEITAR') throw new Error('Decisão inválida (use APROVAR ou REJEITAR).');
  var justificativa = String(payload.justificativa || '').trim();
  if (diretoriaPropria) justificativa = Conduta_exigirFundamentacaoDiretoria_(justificativa, 'ocorrência');
  // 19/10/2026: rejeitar sempre pede a fundamentação (a tela já pedia no rótulo do campo).
  if (decisao === 'REJEITAR' && !justificativa) throw new Error('Para rejeitar, escreva a fundamentação no campo de texto da janela e toque de novo em Rejeitar.');
  var marca = diretoriaPropria ? CONDUTA_MARCA_DIRETORIA_OCORRENCIA : '';
  var historico = Conduta_historicoAcrescentar_(oc, sessao, 'HOMOLOGACAO', decisao, justificativa, marca);

  var campos;
  if (decisao === 'REJEITAR') {
    campos = {
      STATUS: 'REJEITADA',
      JULGADA_EM: Conduta_hojeISO_(),
      JULGADA_POR: sessao.userId,
      TEXTO_JULGAMENTO: justificativa
    };
  } else {
    var parametros = Conduta_obterParametros_();
    var prazoContestacaoDias = Number(parametros.PRAZO_CONTESTACAO_DIAS_UTEIS) || 3;
    campos = {
      STATUS: 'HOMOLOGADA',
      HOMOLOGADA_EM: Conduta_hojeISO_(),
      HOMOLOGADA_POR: sessao.userId,
      PRAZO_CONTESTACAO: Conduta_somarDiasUteis_(Conduta_hojeISO_(), prazoContestacaoDias)
    };
  }
  campos.HISTORICO_JSON = historico;
  if (marca) campos.DECISAO_DIRETORIA = marca;
  SGO_DATA.update(CONDUTA_SHEETS.OCORRENCIA, oc.ID, campos);
  Conduta_auditarDecisao_(sessao, oc, decisao === 'REJEITAR' ? 'REJEITADA' : 'HOMOLOGADA', justificativa, marca);
  return { success: true, decisaoDiretoria: marca };
}

/** Auditoria da decisão (homologação/julgamento); a marca da Diretoria vai no texto. */
function Conduta_auditarDecisao_(sessao, oc, resultado, texto, marca) {
  try {
    SGO_DATA.log(marca ? 'CONDUTA_DECISAO_DIRETORIA_PROPRIA' : 'CONDUTA_OCORRENCIA_' + resultado, sessao.usuario,
      (marca ? marca + '. ' : '') + 'Ocorrência ' + oc.ID + ' (' + (oc.TIPO_CODIGO || '') + ', fato em ' + Conduta_soData_(oc.DATA_FATO) + '): ' + resultado.toLowerCase() +
      (texto ? '. Fundamentação: ' + texto : ''), 'CONDUTA');
  } catch (e) { console.error('Conduta auditoria decisão: ' + ((e && e.message) || e)); }
}

// ------------------------------------------------------------
// CONTESTAÇÃO (o colaborador envolvido contesta dentro do prazo)
// ------------------------------------------------------------
function Conduta_apiContestarOcorrencia(sessionId, payload) {
  var sessao = Conduta_exigirEquipe_(sessionId);
  payload = payload || {};
  var oc = SGO_DATA.getById(CONDUTA_SHEETS.OCORRENCIA, payload.id);
  if (!oc) throw new Error('Ocorrência não encontrada.');
  if (String(oc.COLABORADOR_ID) !== String(sessao.userId) && !isAdminSession(sessionId)) {
    throw new Error('Só o colaborador envolvido (ou um Gestor/Administrador em nome dele) pode contestar.');
  }
  if (SGO_UTILS.safeUpper(oc.STATUS) !== 'HOMOLOGADA') throw new Error('Só é possível contestar uma ocorrência HOMOLOGADA (ainda dentro do prazo).');
  if (oc.PRAZO_CONTESTACAO && Conduta_soData_(oc.PRAZO_CONTESTACAO) < Conduta_hojeISO_()) throw new Error('Prazo de contestação já venceu.');

  var texto = String(payload.texto || '').trim();
  if (!texto) throw new Error('Descreva o motivo da contestação.');

  var parametros = Conduta_obterParametros_();
  var prazoJulgamentoDias = Number(parametros.PRAZO_JULGAMENTO_DIAS_UTEIS) || 5;

  SGO_DATA.update(CONDUTA_SHEETS.OCORRENCIA, oc.ID, {
    STATUS: 'CONTESTADA',
    CONTESTADA_EM: Conduta_hojeISO_(),
    TEXTO_CONTESTACAO: texto,
    HISTORICO_JSON: Conduta_historicoAcrescentar_(oc, sessao, 'CONTESTACAO', 'CONTESTAR', texto, ''),
    PRAZO_JULGAMENTO: Conduta_somarDiasUteis_(Conduta_hojeISO_(), prazoJulgamentoDias)
  });
  return { success: true };
}

// ------------------------------------------------------------
// JULGAMENTO (contestação OU recurso, mesmo mecanismo: ANULAR ou MANTER)
// ------------------------------------------------------------
function Conduta_apiJulgarOcorrencia(sessionId, payload) {
  var sessao = Conduta_exigirGestor_(sessionId);
  payload = payload || {};
  var oc = SGO_DATA.getById(CONDUTA_SHEETS.OCORRENCIA, payload.id);
  if (!oc) throw new Error('Ocorrência não encontrada.');
  var statusAtual = SGO_UTILS.safeUpper(oc.STATUS);
  if (statusAtual !== 'CONTESTADA' && statusAtual !== 'EM_RECURSO') {
    throw new Error('Só é possível julgar uma ocorrência CONTESTADA ou EM_RECURSO.');
  }
  if (String(oc.FISCAL_ID) === String(sessao.userId)) {
    throw new Error('Você é o fiscal que registrou esta ocorrência — peça a outro Gestor/Administrador/Diretoria para julgar.');
  }
  // 2026-10-15 (auditoria): quem é o colaborador envolvido não julga a própria contestação/recurso.
  // 19/10/2026 (decisão do dono): a Diretoria julga mesmo sendo a envolvida.
  var diretoriaPropria = String(oc.COLABORADOR_ID) === String(sessao.userId);
  if (diretoriaPropria && !Conduta_ehDiretoriaOuDono_(sessao)) {
    throw new Error('Você é o colaborador envolvido nesta ocorrência — peça a outro Gestor/Administrador/Diretoria para julgar.');
  }

  var decisao = SGO_UTILS.safeUpper(payload.decisao);
  if (decisao !== 'ANULAR' && decisao !== 'MANTER') throw new Error('Decisão inválida (use ANULAR ou MANTER).');
  var textoJulgamento = String(payload.textoJulgamento || '').trim();
  if (diretoriaPropria) textoJulgamento = Conduta_exigirFundamentacaoDiretoria_(textoJulgamento, 'ocorrência');
  var marca = diretoriaPropria ? CONDUTA_MARCA_DIRETORIA_OCORRENCIA : '';
  var historico = Conduta_historicoAcrescentar_(oc, sessao, statusAtual === 'EM_RECURSO' ? 'JULGAMENTO_RECURSO' : 'JULGAMENTO_CONTESTACAO', decisao, textoJulgamento, marca);

  var campos;
  if (decisao === 'ANULAR') {
    campos = {
      STATUS: 'ANULADA',
      ANULADA_EM: Conduta_hojeISO_(),
      JULGADA_EM: Conduta_hojeISO_(),
      JULGADA_POR: sessao.userId,
      TEXTO_JULGAMENTO: textoJulgamento
    };
  } else {
    var parametros = Conduta_obterParametros_();
    var prazoRecursoDias = Number(parametros.PRAZO_RECURSO_DIAS_UTEIS) || 2;
    campos = {
      STATUS: 'FIRME',
      FIRME_EM: Conduta_hojeISO_(),
      JULGADA_EM: Conduta_hojeISO_(),
      JULGADA_POR: sessao.userId,
      TEXTO_JULGAMENTO: textoJulgamento,
      // 2026-10-15 (auditoria): recurso já julgado não abre novo prazo de recurso —
      // antes o ciclo FIRME → recurso → FIRME era infinito e travava o fechamento do mês.
      PRAZO_RECURSO: statusAtual === 'EM_RECURSO' ? Conduta_hojeISO_() : Conduta_somarDiasUteis_(Conduta_hojeISO_(), prazoRecursoDias)
    };
  }
  campos.HISTORICO_JSON = historico;
  if (marca) campos.DECISAO_DIRETORIA = marca;
  SGO_DATA.update(CONDUTA_SHEETS.OCORRENCIA, oc.ID, campos);
  Conduta_auditarDecisao_(sessao, oc, decisao === 'ANULAR' ? 'ANULADA' : 'MANTIDA', textoJulgamento, marca);
  return { success: true, decisaoDiretoria: marca };
}

// ------------------------------------------------------------
// RECURSO (o colaborador envolvido pede reabertura de uma FIRME, dentro
// do prazo contado a partir de FIRME_EM — reabre pro mesmo julgamento)
// ------------------------------------------------------------
function Conduta_apiRecorrerOcorrencia(sessionId, payload) {
  var sessao = Conduta_exigirEquipe_(sessionId);
  payload = payload || {};
  var oc = SGO_DATA.getById(CONDUTA_SHEETS.OCORRENCIA, payload.id);
  if (!oc) throw new Error('Ocorrência não encontrada.');
  if (String(oc.COLABORADOR_ID) !== String(sessao.userId) && !isAdminSession(sessionId)) {
    throw new Error('Só o colaborador envolvido (ou um Gestor/Administrador em nome dele) pode recorrer.');
  }
  if (SGO_UTILS.safeUpper(oc.STATUS) !== 'FIRME') throw new Error('Só é possível recorrer de uma ocorrência FIRME (ainda dentro do prazo de recurso).');
  if (Conduta_soData_(oc.RECURSO_EM)) throw new Error('O recurso desta ocorrência já foi julgado — não cabe novo recurso.');
  if (oc.PRAZO_RECURSO && Conduta_soData_(oc.PRAZO_RECURSO) < Conduta_hojeISO_()) throw new Error('Prazo de recurso já venceu.');

  var texto = String(payload.texto || '').trim();
  if (!texto) throw new Error('Descreva o motivo do recurso.');

  SGO_DATA.update(CONDUTA_SHEETS.OCORRENCIA, oc.ID, {
    STATUS: 'EM_RECURSO',
    RECURSO_EM: Conduta_hojeISO_(),
    TEXTO_RECURSO: texto,
    HISTORICO_JSON: Conduta_historicoAcrescentar_(oc, sessao, 'RECURSO', 'RECORRER', texto, '')
  });
  return { success: true };
}

// ------------------------------------------------------------
// EVENTOS POSITIVOS — sem homologação no briefing, registro direto;
// mesma filosofia de reconhecimento mútuo, aberto a toda a equipe.
// ------------------------------------------------------------
function Conduta_apiRegistrarEventoPositivo(sessionId, payload) {
  var sessao = Conduta_exigirEquipe_(sessionId);
  payload = payload || {};

  var tipo = SGO_DATA.getAll(CONDUTA_SHEETS.EVENTO_POSITIVO_TIPO)
    .find(function (t) { return SGO_UTILS.safeUpper(t.CODIGO) === SGO_UTILS.safeUpper(payload.tipoCodigo); });
  if (!tipo) throw new Error('Código de evento positivo não encontrado no catálogo: ' + payload.tipoCodigo);

  var tipoAlvo=SGO_UTILS.safeUpper(payload.tipoAlvo)||'INDIVIDUAL';
  var destinatarios=(payload.destinatarios||[]).map(String).filter(Boolean);
  var colaboradorId = String(payload.colaboradorId || destinatarios[0] || '').trim();
  if(tipoAlvo==='INDIVIDUAL'&&!colaboradorId)throw new Error('Informe o colaborador reconhecido.');
  if(tipoAlvo==='GRUPO'&&!destinatarios.length)throw new Error('Selecione as pessoas do grupo/departamento.');
  var texto=String(payload.texto||'').trim();if(!texto)throw new Error('Descreva a melhoria ou atitude que foi observada.');

  var dataFato = String(payload.dataFato || '').trim() || Conduta_hojeISO_();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataFato)) throw new Error('Data do fato inválida (use AAAA-MM-DD).');
  if (dataFato > Conduta_hojeISO_()) throw new Error('A data do fato não pode estar no futuro.');
  Conduta_exigirCompetenciaAberta_(Conduta_competenciaDe_(dataFato));

  var registro = SGO_DATA.insert(CONDUTA_SHEETS.EVENTO_POSITIVO, {
    TIPO_CODIGO: tipo.CODIGO,
    COLABORADOR_ID: colaboradorId,
    DATA_FATO: dataFato,
    COMPETENCIA: Conduta_competenciaDe_(dataFato),
    REGISTRADO_POR: sessao.userId,
    TIPO_ALVO:tipoAlvo, GRUPO_NOME:tipoAlvo==='GRUPO'?String(payload.grupoNome||'Grupo/Departamento'):'',
    TEXTO_RECONHECIMENTO:texto, DESTINATARIOS_JSON:JSON.stringify(tipoAlvo==='GRUPO'?destinatarios:[colaboradorId]),
    VISIBILIDADE:'TODOS'
  });

  return { success: true, item: registro };
}

function Conduta_apiListarEventosPositivos(sessionId, payload) {
  Conduta_exigirEquipe_(sessionId);
  payload = payload || {};
  return SGO_DATA.getAll(CONDUTA_SHEETS.EVENTO_POSITIVO).filter(function (e) {
    if (payload.competencia && Conduta_soComp_(e.COMPETENCIA) !== Conduta_soComp_(payload.competencia)) return false;
    if (payload.colaboradorId && String(e.COLABORADOR_ID) !== String(payload.colaboradorId)) return false;
    return true;
  }).map(function (e) {
    e.DATA_FATO = Conduta_soData_(e.DATA_FATO);
    e.COMPETENCIA = Conduta_soComp_(e.COMPETENCIA);
    return e;
  }).sort(function (a, b) { return String(b.DATA_FATO).localeCompare(String(a.DATA_FATO)); });
}

// ------------------------------------------------------------
// PLACAR / D — leitura agregada, sempre calculada on-the-fly sobre as
// duas abas transacionais (nunca persistida à parte — evita 2 fontes
// de verdade; só o RESULTADO de um fechamento vira imutável).
// ------------------------------------------------------------
function Conduta_calcularDCompetencia_(competencia) {
  return Conduta_ler_(CONDUTA_SHEETS.OCORRENCIA)
    .filter(function (o) { return Conduta_soComp_(o.COMPETENCIA) === competencia && SGO_UTILS.safeUpper(o.STATUS) === 'FIRME'; })
    .reduce(function (soma, o) { return soma + (Number(o.PESO_APLICADO) || 0); }, 0);
}

function Conduta_temGGNaCompetencia_(competencia) {
  return Conduta_ler_(CONDUTA_SHEETS.OCORRENCIA).some(function (o) {
    return Conduta_soComp_(o.COMPETENCIA) === competencia && SGO_UTILS.safeUpper(o.STATUS) === 'FIRME' && SGO_UTILS.safeUpper(o.NIVEL_APLICADO) === 'GG';
  });
}

function Conduta_placarIndividual_(competencia, colaboradorId) {
  var negativos = Conduta_ler_(CONDUTA_SHEETS.OCORRENCIA)
    .filter(function (o) {
      return Conduta_soComp_(o.COMPETENCIA) === competencia && String(o.COLABORADOR_ID) === String(colaboradorId) && SGO_UTILS.safeUpper(o.STATUS) === 'FIRME';
    })
    .reduce(function (soma, o) {
      // CORREÇÃO 2026-09-24: aqui se usava Conduta_buscarTipoOcorrencia_, que
      // LANÇA exceção quando o código não está no catálogo. Como o placar roda
      // por colaborador dentro da apuração, e a apuração alimenta o card do
      // farol da home, bastava alguém apagar/renomear uma linha do catálogo
      // para o módulo inteiro ficar indisponível para TODA a equipe e o
      // fechamento do mês parar de rodar. A contagem de eventos positivos,
      // três linhas abaixo, já usava find com fallback — agora as duas são
      // iguais: código sumido vale 0 ponto e não derruba ninguém.
      var tipo = Conduta_ler_(CONDUTA_SHEETS.OCORRENCIA_TIPO)
        .find(function (t) { return SGO_UTILS.safeUpper(t.CODIGO) === SGO_UTILS.safeUpper(o.TIPO_CODIGO); });
      return soma + (tipo ? (Number(tipo.PONTOS_PLACAR) || 0) : 0);
    }, 0);

  var eventosTipo = Conduta_ler_(CONDUTA_SHEETS.EVENTO_POSITIVO_TIPO);
  var positivos = Conduta_ler_(CONDUTA_SHEETS.EVENTO_POSITIVO)
    .filter(function (e) { var ds=[];try{ds=JSON.parse(e.DESTINATARIOS_JSON||'[]');}catch(x){} return Conduta_soComp_(e.COMPETENCIA) === competencia && (String(e.COLABORADOR_ID) === String(colaboradorId)||ds.map(String).indexOf(String(colaboradorId))>=0); })
    .reduce(function (soma, e) {
      var tipo = eventosTipo.find(function (t) { return SGO_UTILS.safeUpper(t.CODIGO) === SGO_UTILS.safeUpper(e.TIPO_CODIGO); });
      return soma + (tipo ? (Number(tipo.PONTOS_PLACAR) || 0) : 0);
    }, 0);

  return negativos + positivos;
}

// ------------------------------------------------------------
// PRAZOS VENCIDOS — trigger diário (mesmo padrão de auto-reagendamento
// já usado no painel de Pendências do Auvo)
// ------------------------------------------------------------
function Conduta_processarPrazosVencidos_() {
  var hoje = Conduta_hojeISO_();
  var todas = SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA);
  var processadas = 0;

  todas.forEach(function (o) {
    var status = SGO_UTILS.safeUpper(o.STATUS);

    if (status === 'REGISTRADA' && o.PRAZO_HOMOLOGACAO && Conduta_soData_(o.PRAZO_HOMOLOGACAO) < hoje) {
      SGO_DATA.update(CONDUTA_SHEETS.OCORRENCIA, o.ID, { STATUS: 'DESCARTADA', DESCARTADA_EM: hoje });
      processadas++;
      return;
    }

    if (status === 'HOMOLOGADA' && o.PRAZO_CONTESTACAO && Conduta_soData_(o.PRAZO_CONTESTACAO) < hoje) {
      var parametros = Conduta_obterParametros_();
      var prazoRecursoDias = Number(parametros.PRAZO_RECURSO_DIAS_UTEIS) || 2;
      SGO_DATA.update(CONDUTA_SHEETS.OCORRENCIA, o.ID, {
        STATUS: 'FIRME',
        FIRME_EM: hoje,
        PRAZO_RECURSO: Conduta_somarDiasUteis_(hoje, prazoRecursoDias)
      });
      processadas++;
    }
    // CONTESTADA/EM_RECURSO com prazo de julgamento vencido: fica como
    // pendência visível pro gestor (fila de julgamento) — decisão de
    // ANULAR/MANTER é sempre humana, nunca automática.
  });

  return { processadas: processadas };
}

function Conduta_apiProcessarPrazosVencidosAgora(sessionId) {
  Conduta_exigirGestor_(sessionId);
  return Conduta_processarPrazosVencidos_();
}

function Conduta_apiAtivarChecagemDiariaPrazos(sessionId) {
  Conduta_exigirGestor_(sessionId);
  Conduta_apiDesativarChecagemDiariaPrazos(sessionId);
  // 2026-10-15: a rotina diária faz prazos + fechamento automático
  ScriptApp.newTrigger('Conduta_rotinaDiaria_')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
  return { success: true };
}

function Conduta_apiDesativarChecagemDiariaPrazos(sessionId) {
  Conduta_exigirGestor_(sessionId);
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === 'Conduta_processarPrazosVencidos_' || h === 'Conduta_rotinaDiaria_') ScriptApp.deleteTrigger(t);
  });
  return { success: true };
}

function Conduta_apiStatusChecagemDiariaPrazos(sessionId) {
  Conduta_exigirGestor_(sessionId);
  var ativo = ScriptApp.getProjectTriggers().some(function (t) {
    var h = t.getHandlerFunction();
    return h === 'Conduta_processarPrazosVencidos_' || h === 'Conduta_rotinaDiaria_';
  });
  return { ativo: ativo };
}
