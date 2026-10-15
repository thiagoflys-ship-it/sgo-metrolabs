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
    apiContestarOcorrencia: Conduta_apiContestarOcorrencia,
    apiJulgarOcorrencia: Conduta_apiJulgarOcorrencia,
    apiRecorrerOcorrencia: Conduta_apiRecorrerOcorrencia,

    apiRegistrarEventoPositivo: Conduta_apiRegistrarEventoPositivo,
    apiListarEventosPositivos: Conduta_apiListarEventosPositivos,

    apiRegistrarMissao: Conduta_apiRegistrarMissao,
    apiListarMissoes: Conduta_apiListarMissoes,
    apiRemoverMissao: Conduta_apiRemoverMissao,

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
  };

  if (!fn) throw new Error('Função não informada.');
  if (!allow[fn] || typeof allow[fn] !== 'function') throw new Error('Função não permitida ou não encontrada: ' + fn);

  return allow[fn](req.sessionId, payload);
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

function Conduta_exigirGestor_(sessionId) {
  if (!isAdminSession(sessionId)) throw new Error('Acesso restrito a Gestor/Administrador/Diretoria.');
  return exigirSessao(sessionId);
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
  if (congelado) throw new Error('A competência ' + competencia + ' está congelada. O ajuste exige tratamento formal fora deste fechamento.');
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
  return SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS)
    .filter(function (u) { return SGO_UTILS.safeUpper(u.STATUS) === 'ATIVO' && SGO_UTILS.safeUpper(u.PERFIL) !== 'CLIENTE' && !Conduta_ehContaGenerica_(u); })
    .map(function (u) { return { ID: u.ID, NOME: u.NOME, SETOR: u.SETOR || u.DEPARTAMENTO || '' }; })
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
  payload = payload || {};

  var tipo = Conduta_buscarTipoOcorrencia_(payload.tipoCodigo);
  var colaboradorId = String(payload.colaboradorId || '').trim();
  if (!colaboradorId) throw new Error('Informe o colaborador envolvido.');
  // 2026-10-15: as ocorrências de setembro foram lançadas na conta genérica
  // "Administrador" — não é uma pessoa, não aparece no placar de ninguém.
  var colaboradorUsuario = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, colaboradorId);
  if (!colaboradorUsuario) throw new Error('Colaborador não encontrado.');
  if (Conduta_ehContaGenerica_(colaboradorUsuario)) throw new Error('Escolha a pessoa envolvida: a conta "' + (colaboradorUsuario.NOME || colaboradorUsuario.USUARIO) + '" é uma conta do sistema, não um colaborador.');

  var dataFato = String(payload.dataFato || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataFato)) throw new Error('Data do fato inválida (use AAAA-MM-DD).');
  if (dataFato > Conduta_hojeISO_()) throw new Error('A data do fato não pode estar no futuro.');

  Conduta_exigirCompetenciaAberta_(Conduta_competenciaDe_(dataFato));

  var parametros = Conduta_obterParametros_();
  var prazoRegistroDias = Number(parametros.PRAZO_REGISTRO_DIAS_UTEIS) || 2;
  var limiteRegistro = Conduta_somarDiasUteis_(dataFato, prazoRegistroDias);
  if (limiteRegistro < Conduta_hojeISO_()) {
    throw new Error('Prazo de registro (' + prazoRegistroDias + ' dias úteis após o fato) já venceu para esta data.');
  }

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
    MISSAO_ID: String(payload.missaoId || '')
  });

  return { success: true, item: registro };
}

function Conduta_apiListarOcorrencias(sessionId, payload) {
  var sessao = Conduta_exigirEquipe_(sessionId);
  payload = payload || {};
  var somenteMinhas = !isAdminSession(sessionId); // não-gestor só vê as próprias (fiscal ou envolvido)

  // CORREÇÃO 2026-09-24: a tela decidia às cegas. Quem homologava via só
  // "M03 · 24/09 · REGISTRADA" -- sem saber DE QUEM era, O QUE tinha
  // acontecido, e sem acesso à FOTO que o fiscal subiu. E quem julgava uma
  // contestação decidia sem poder ler a defesa, porque TEXTO_CONTESTACAO e
  // TEXTO_RECURSO eram gravados e nunca lidos por nenhuma tela. Montamos os
  // dois mapas UMA vez por chamada (não por linha) para não repetir leitura
  // de planilha.
  var nomes = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) { nomes[String(u.ID)] = u.NOME; });
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
    o.PODE_HOMOLOGAR = !somenteMinhas && !o.SOU_O_FISCAL;
    // Julgar tem a MESMA regra da homologação (gestor e não ser o fiscal):
    // antes a tela oferecia "Julgar" a todo mundo e o erro só aparecia depois
    // de escrever a fundamentação -- inclusive para o colaborador que tinha
    // acabado de contestar, que acreditava poder se absolver.
    o.PODE_JULGAR = !somenteMinhas && !o.SOU_O_FISCAL;
    // Contestar/recorrer são do ACUSADO (ou da gestão em nome dele), e só
    // dentro do prazo -- o servidor já recusava fora disso, mas a tela nunca
    // mostrava a data limite, então a pessoa descobria que perdeu o prazo
    // depois de escrever a defesa.
    var hojeISO = Conduta_hojeISO_();
    o.PRAZO_CONTESTACAO_VENCIDO = !!o.PRAZO_CONTESTACAO && o.PRAZO_CONTESTACAO < hojeISO;
    o.PRAZO_RECURSO_VENCIDO = !!o.PRAZO_RECURSO && o.PRAZO_RECURSO < hojeISO;
    o.PODE_CONTESTAR = (o.SOU_O_COLABORADOR || !somenteMinhas) && !o.PRAZO_CONTESTACAO_VENCIDO;
    o.PODE_RECORRER = (o.SOU_O_COLABORADOR || !somenteMinhas) && !o.PRAZO_RECURSO_VENCIDO;
    // Contexto para quem decide (e para quem se defende saber do que é acusado)
    var d = descricoes[SGO_UTILS.safeUpper(o.TIPO_CODIGO)] || {};
    o.COLABORADOR_NOME = nomes[String(o.COLABORADOR_ID)] || o.COLABORADOR_ID || '';
    o.FISCAL_NOME = nomes[String(o.FISCAL_ID)] || o.FISCAL_ID || '';
    o.TIPO_DESCRICAO = d.descricao || '';
    o.TIPO_GRUPO = d.grupo || '';
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
  if (String(oc.COLABORADOR_ID) === String(sessao.userId)) {
    throw new Error('Você é o colaborador envolvido nesta ocorrência — peça a outro Gestor/Administrador/Diretoria para decidir.');
  }
  // 2026-10-15: competência já fechada não recebe ocorrência nova — senão ela
  // ficaria fora do mês do fato (congelado) e também do mês atual.
  if (SGO_UTILS.safeUpper(payload.decisao) === 'APROVAR') Conduta_exigirCompetenciaAberta_(Conduta_soComp_(oc.COMPETENCIA || oc.DATA_FATO));

  var decisao = SGO_UTILS.safeUpper(payload.decisao);
  if (decisao !== 'APROVAR' && decisao !== 'REJEITAR') throw new Error('Decisão inválida (use APROVAR ou REJEITAR).');

  if (decisao === 'REJEITAR') {
    SGO_DATA.update(CONDUTA_SHEETS.OCORRENCIA, oc.ID, {
      STATUS: 'REJEITADA',
      JULGADA_EM: Conduta_hojeISO_(),
      JULGADA_POR: sessao.userId,
      TEXTO_JULGAMENTO: String(payload.justificativa || '')
    });
    return { success: true };
  }

  var parametros = Conduta_obterParametros_();
  var prazoContestacaoDias = Number(parametros.PRAZO_CONTESTACAO_DIAS_UTEIS) || 3;

  SGO_DATA.update(CONDUTA_SHEETS.OCORRENCIA, oc.ID, {
    STATUS: 'HOMOLOGADA',
    HOMOLOGADA_EM: Conduta_hojeISO_(),
    HOMOLOGADA_POR: sessao.userId,
    PRAZO_CONTESTACAO: Conduta_somarDiasUteis_(Conduta_hojeISO_(), prazoContestacaoDias)
  });
  return { success: true };
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
  if (String(oc.COLABORADOR_ID) === String(sessao.userId)) {
    throw new Error('Você é o colaborador envolvido nesta ocorrência — peça a outro Gestor/Administrador/Diretoria para julgar.');
  }

  var decisao = SGO_UTILS.safeUpper(payload.decisao);
  if (decisao !== 'ANULAR' && decisao !== 'MANTER') throw new Error('Decisão inválida (use ANULAR ou MANTER).');

  if (decisao === 'ANULAR') {
    SGO_DATA.update(CONDUTA_SHEETS.OCORRENCIA, oc.ID, {
      STATUS: 'ANULADA',
      ANULADA_EM: Conduta_hojeISO_(),
      JULGADA_EM: Conduta_hojeISO_(),
      JULGADA_POR: sessao.userId,
      TEXTO_JULGAMENTO: String(payload.textoJulgamento || '')
    });
    return { success: true };
  }

  var parametros = Conduta_obterParametros_();
  var prazoRecursoDias = Number(parametros.PRAZO_RECURSO_DIAS_UTEIS) || 2;

  SGO_DATA.update(CONDUTA_SHEETS.OCORRENCIA, oc.ID, {
    STATUS: 'FIRME',
    FIRME_EM: Conduta_hojeISO_(),
    JULGADA_EM: Conduta_hojeISO_(),
    JULGADA_POR: sessao.userId,
    TEXTO_JULGAMENTO: String(payload.textoJulgamento || ''),
    // 2026-10-15 (auditoria): recurso já julgado não abre novo prazo de recurso —
    // antes o ciclo FIRME → recurso → FIRME era infinito e travava o fechamento do mês.
    PRAZO_RECURSO: statusAtual === 'EM_RECURSO' ? Conduta_hojeISO_() : Conduta_somarDiasUteis_(Conduta_hojeISO_(), prazoRecursoDias)
  });
  return { success: true };
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
    TEXTO_RECURSO: texto
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
  return SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA)
    .filter(function (o) { return Conduta_soComp_(o.COMPETENCIA) === competencia && SGO_UTILS.safeUpper(o.STATUS) === 'FIRME'; })
    .reduce(function (soma, o) { return soma + (Number(o.PESO_APLICADO) || 0); }, 0);
}

function Conduta_temGGNaCompetencia_(competencia) {
  return SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA).some(function (o) {
    return Conduta_soComp_(o.COMPETENCIA) === competencia && SGO_UTILS.safeUpper(o.STATUS) === 'FIRME' && SGO_UTILS.safeUpper(o.NIVEL_APLICADO) === 'GG';
  });
}

function Conduta_placarIndividual_(competencia, colaboradorId) {
  var negativos = SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA)
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
      var tipo = SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA_TIPO)
        .find(function (t) { return SGO_UTILS.safeUpper(t.CODIGO) === SGO_UTILS.safeUpper(o.TIPO_CODIGO); });
      return soma + (tipo ? (Number(tipo.PONTOS_PLACAR) || 0) : 0);
    }, 0);

  var eventosTipo = SGO_DATA.getAll(CONDUTA_SHEETS.EVENTO_POSITIVO_TIPO);
  var positivos = SGO_DATA.getAll(CONDUTA_SHEETS.EVENTO_POSITIVO)
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
