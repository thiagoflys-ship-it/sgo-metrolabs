/****************************************************
 * NR13 — LAUDO DE INSPEÇÃO DE VASO DE PRESSÃO — BACKEND PRINCIPAL
 *
 * Emite o Relatório de Inspeção de Segurança de vaso de pressão exigido
 * pelo item 13.5.4.11 da NR-13, com categorização automática (Tabela 1
 * da norma) e periodicidade calculada (Tabela 2) — ver constantes em
 * SGO_NR13_Config.js. Integrado ao cadastro real do Portal (CAD_CLIENTES/
 * CAD_UNIDADES/CAD_EQUIPAMENTOS), no mesmo molde do Certificado de
 * Calibração (SGO_CertCal_Main.js) — módulo irmão independente, duplica
 * de propósito as funções locais de cliente/equipamento em vez de expor
 * uma API central (convenção já estabelecida no Portal).
 *
 * 1 tabela própria, criada sob demanda (NR13_garantirTabela_, idempotente
 * — NUNCA usar setupSGO() aqui, ele limpa todas as abas que gerencia):
 *  - NR13_LAUDOS: 1 linha por laudo (rascunho ou emitido). Um laudo
 *    emitido é IMUTÁVEL (como CERT_CALIBRACAO) — se depois for preciso
 *    reinspecionar pra validar correções de um "Aprovado com Ressalvas",
 *    isso gera um NOVO laudo (REGISTRO_ORIGEM_ID aponta pro original, que
 *    é marcado STATUS_PENDENCIA='fechado' ao final), no mesmo padrão de
 *    pendência aberta/fechada do Registros Operacionais (SGO_RegOp_Main.js).
 *
 * Fotos: enviadas em base64 só na hora do upload/análise de IA (nunca
 * armazenadas em base64 na planilha — DADOS_JSON guarda só {fileId, link,
 * legendaUsuario, interpretacaoIA}, célula pequena). Na emissão do PDF
 * final, os bytes são buscados de novo no Drive (DriveApp.getFileById)
 * pra montar o <img> embutido — ver NR13_apiEmitirLaudo.
 ****************************************************/

function NR13_apiDispatch(req) {
  req = req || {};
  var sessaoDispatch = exigirSessao(String(req.sessionId || ''));
  if (typeof SGO_bloquearRH_ === 'function') SGO_bloquearRH_(sessaoDispatch, 'o Laudo NR-13'); // perfil RH: sem documentos técnicos (SGO_Auth.js)
  // Laudo NR-13 é ferramenta da equipe interna: o perfil CLIENTE não pode
  // chamar nenhuma função daqui (sem esta trava, um cliente lia por CNPJ ou
  // por ID os laudos de outra empresa). O cliente recebe o laudo pelos
  // Documentos do próprio cadastro.
  if (!sessaoDispatch || String(sessaoDispatch.perfil || '').trim().toUpperCase() === 'CLIENTE') {
    throw new Error('Acesso exclusivo à equipe interna. O laudo NR-13 emitido fica disponível para o cliente em Documentos.');
  }
  var fn = String(req.fn || '').trim();
  var payload = req.payload || {};

  var allow = {
    apiPing: NR13_apiPing,
    apiConsultarCnpjPublico: NR13_apiConsultarCnpjPublico,
    apiPesquisarClientes: NR13_apiPesquisarClientes,
    apiCriarClienteComUnidade: NR13_apiCriarClienteComUnidade,
    apiListarUnidadesCliente: NR13_apiListarUnidadesCliente,
    apiListarEquipamentosCliente: NR13_apiListarEquipamentosCliente,
    apiCriarEquipamento: NR13_apiCriarEquipamento,
    apiCalcularCategoria: NR13_apiCalcularCategoria,
    apiCalcularTH: NR13_apiCalcularTH,
    apiUploadFoto: NR13_apiUploadFoto,
    apiAnalisarFoto: NR13_apiAnalisarFoto,
    apiMelhorarTexto: NR13_apiMelhorarTexto,
    apiGerarParecerConclusivo: NR13_apiGerarParecerConclusivo,
    apiSalvarRascunho: NR13_apiSalvarRascunho,
    apiObterLaudo: NR13_apiObterLaudo,
    apiListarRascunhosPorCnpj: NR13_apiListarRascunhosPorCnpj,
    apiListarPendenciasAbertas: NR13_apiListarPendenciasAbertas,
    apiEmitirLaudo: NR13_apiEmitirLaudo,
    apiBuscarLaudosPorCnpj: NR13_apiBuscarLaudosPorCnpj,
    apiReabrirLaudo: NR13_apiReabrirLaudo
  };

  if (!fn) throw new Error('Função não informada.');
  if (!allow[fn] || typeof allow[fn] !== 'function') throw new Error('Função não permitida ou não encontrada: ' + fn);

  // Decisão do dono (17/10/2026): Comercial e Financeiro consultam laudos, mas não emitem nem alteram.
  var perfilNr = String(sessaoDispatch.perfil || '').trim().toUpperCase();
  var soEquipeTecnica = { apiSalvarRascunho: 1, apiEmitirLaudo: 1, apiUploadFoto: 1, apiAnalisarFoto: 1, apiMelhorarTexto: 1, apiGerarParecerConclusivo: 1 };
  if ((perfilNr === 'COMERCIAL' || perfilNr === 'FINANCEIRO') && soEquipeTecnica[fn]) {
    throw new Error('O perfil ' + (perfilNr === 'COMERCIAL' ? 'Comercial' : 'Financeiro') + ' consulta os laudos NR-13, mas não pode preencher nem emitir. Peça a emissão a um técnico, à metrologia ou ao gestor.');
  }

  var resultadoNr = allow[fn](req.sessionId, payload);
  // 17/10/2026: laudo emitido substitui o vencimento anterior na central de pendências.
  if (fn === 'apiEmitirLaudo' && typeof SGO_Pendencias_aposGravar_ === 'function') SGO_Pendencias_aposGravar_(resultadoNr);
  return resultadoNr;
}

function NR13_apiPing() {
  return { ok: true, versao: '1.0', appTitle: NR13_CFG.APP_TITLE };
}


// ------------------------------------------------------------
// BOOTSTRAP — cria a aba própria sob demanda, sem tocar em nenhuma outra
// (NUNCA chamar setupSGO() aqui: destrutivo demais pra rodar contra uma
// base em produção).
// ------------------------------------------------------------
function NR13_garantirTabela_(nomeAba, cabecalhos) {
  var ss = SGO_DATA.getDB();
  var sheet = ss.getSheetByName(nomeAba);
  if (sheet) return;

  sheet = ss.insertSheet(nomeAba);
  sheet.appendRow(cabecalhos);
  sheet.getRange(1, 1, 1, cabecalhos.length).setFontWeight('bold').setBackground('#f3f3f3');
  sheet.setFrozenRows(1);
  delete SGO_DATA._headersCache[nomeAba];
  delete SGO_DATA._headerMapCache[nomeAba];
}

/**
 * Trava as colunas de data (texto "dd/mm/aaaa") em formato "Texto
 * simples" — sem isso, o Sheets auto-detecta e converte strings de data
 * em Date de verdade sempre que o dia é <= 12, quebrando o formato que o
 * resto do sistema espera (achado real em CAD_PADROES.VALIDADE nesta
 * mesma sessão — ver CertCal_forcarColunaTexto_ em SGO_CertCal_Main.js).
 * Idempotente e barato, roda em todo bootstrap.
 */
function NR13_forcarColunaTexto_(nomeAba, nomeColuna) {
  var ss = SGO_DATA.getDB();
  var sheet = ss.getSheetByName(nomeAba);
  if (!sheet) return;
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h || '').trim(); });
  var colIndex = headers.indexOf(nomeColuna);
  if (colIndex === -1) return;
  sheet.getRange(2, colIndex + 1, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('@');
}

var NR13_SHEET = 'NR13_LAUDOS';

function NR13_bootstrap_() {
  NR13_garantirTabela_(NR13_SHEET, [
    'ID', 'NUMERO_LAUDO', 'CLIENTE_ID', 'UNIDADE_ID', 'EQUIPAMENTO_ID',
    'TIPO_VASO', 'FABRICANTE', 'MODELO', 'NUMERO_SERIE', 'ANO_FABRICACAO', 'CODIGO_CONSTRUCAO',
    'PMTA_VALOR', 'PMTA_UNIDADE', 'PMTA_MPA', 'VOLUME_VALOR', 'VOLUME_UNIDADE', 'VOLUME_M3',
    'CLASSE_FLUIDO', 'FLUIDO_SERVICO', 'GRUPO_POTENCIAL_RISCO', 'CATEGORIA',
    'TIPO_INSPECAO', 'DATA_INICIO_INSPECAO', 'DATA_TERMINO_INSPECAO',
    'DESCRICAO_INSPECOES', 'RESULTADO_INSPECOES', 'RECOMENDACOES', 'OBSERVACOES',
    'FOTOS_JSON',
    'TH_REALIZADO', 'TH_UNIDADE_PRESSAO', 'TH_PRESSAO_TESTE', 'TH_TEMPO_SUBIDA_MIN',
    'TH_PRESSAO_INICIAL', 'TH_TEMPO_ENSAIO_MIN', 'TH_PRESSAO_FINAL', 'TH_TEMPO_DESCIDA_MIN',
    'VALVULAS_JSON', 'MANOMETROS_JSON',
    'VEREDITO', 'PARECER_CONCLUSIVO', 'DATA_PROXIMA_INSPECAO',
    'ASSINANTE_PH',
    'STATUS', 'STATUS_PENDENCIA', 'REGISTRO_ORIGEM_ID',
    'LINK_PDF', 'DADOS_JSON', 'CRIADO_EM'
  ]);
  NR13_forcarColunaTexto_(NR13_SHEET, 'DATA_INICIO_INSPECAO');
  NR13_forcarColunaTexto_(NR13_SHEET, 'DATA_TERMINO_INSPECAO');
  NR13_forcarColunaTexto_(NR13_SHEET, 'DATA_PROXIMA_INSPECAO');
}

// ------------------------------------------------------------
// CONSULTA PÚBLICA DE CNPJ (BrasilAPI — mesmo padrão do resto do Portal)
// ------------------------------------------------------------
function NR13_apiConsultarCnpjPublico(sessionId, payload) {
  payload = payload || {};
  var cnpj = String(payload.cnpj || '').replace(/\D/g, '');
  if (!/^\d{14}$/.test(cnpj)) throw new Error('Informe um CNPJ válido com 14 dígitos.');

  // Consulta com reserva entre várias bases públicas + cache (SGO_CnpjConsulta.js).
  var data = SGO_CNPJ_consultarDados_(cnpj);

  var enderecoPartes = [
    data.descricao_tipo_de_logradouro || '', data.logradouro || '', data.numero || '',
    data.complemento ? ('- ' + data.complemento) : '', data.bairro ? ('- ' + data.bairro) : '',
    data.municipio ? ('- ' + data.municipio) : '', data.uf ? ('/' + data.uf) : '',
    data.cep ? ('- CEP ' + data.cep) : ''
  ].filter(function(v) { return String(v || '').trim(); }).join(' ');

  return {
    ok: true,
    cnpj: cnpj,
    razaoSocial: data.razao_social || data.nome_fantasia || '',
    nomeFantasia: data.nome_fantasia || '',
    endereco: enderecoPartes.replace(/\s+/g, ' ').trim(),
    telefone: data.ddd_telefone_1 || '',
    email: data.email || ''
  };
}

// ------------------------------------------------------------
// CLIENTE / UNIDADE / EQUIPAMENTO — reaproveita o cadastro real já
// existente do Portal (SGO_CLIENTES/SGO_EQUIPAMENTOS), não duplica CRUD.
// ------------------------------------------------------------
function NR13_apiPesquisarClientes(sessionId, payload) {
  payload = payload || {};
  var r = SGO_CLIENTES.pesquisar(sessionId, String(payload.termo || ''));
  if (!r.success) throw new Error(r.message || 'Falha ao pesquisar clientes.');
  return { ok: true, items: r.items };
}

function NR13_apiCriarClienteComUnidade(sessionId, payload) {
  // Cadastro compartilhado, com preservação do CNPJ e lock do conjunto cliente/unidade.
  return CertCal_apiCriarClienteComUnidade(sessionId, payload);
}

function NR13_apiListarUnidadesCliente(sessionId, payload) {
  payload = payload || {};
  var r = SGO_EQUIPAMENTOS.listarUnidadesAtivasPorCliente(sessionId, payload.clienteId);
  return { ok: true, items: (r && r.items) || [] };
}

function NR13_apiListarEquipamentosCliente(sessionId, payload) {
  payload = payload || {};
  exigirSessao(sessionId);
  var clienteId = SGO_UTILS.safe(payload.clienteId);
  var itens = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS)
    .filter(function(e) { return SGO_UTILS.safe(e.CLIENTE_ID) === clienteId && SGO_UTILS.safeUpper(e.STATUS) === 'ATIVO'; })
    .sort(function(a, b) { return SGO_UTILS.safe(a.TAG).localeCompare(SGO_UTILS.safe(b.TAG)); });
  return { ok: true, items: itens };
}

function NR13_apiCriarEquipamento(sessionId, payload) {
  payload = payload || {};
  var r = SGO_EQUIPAMENTOS.criar(sessionId, {
    CLIENTE_ID: payload.clienteId,
    UNIDADE_ID: payload.unidadeId,
    TIPO: payload.tipo,
    FABRICANTE: payload.fabricante,
    MODELO: payload.modelo,
    SERIE: payload.serie,
    TAG: payload.tag,
    SETOR: payload.setor
  });
  if (!r.success) throw new Error(r.message || 'Falha ao cadastrar equipamento.');

  var equipamentos = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS);
  var criado = equipamentos.filter(function(e) {
    return SGO_UTILS.safe(e.CLIENTE_ID) === SGO_UTILS.safe(payload.clienteId) && SGO_UTILS.safeUpper(e.TAG) === SGO_UTILS.safeUpper(payload.tag);
  }).pop();

  return { ok: true, equipamento: criado || null };
}

// ------------------------------------------------------------
// CATEGORIZAÇÃO E PERIODICIDADE (NR-13, item 13.5.1.1 e 13.5.4.5) —
// cálculo determinístico no servidor, nunca confiar em conta feita no
// navegador (mesmo princípio do CertCal). Roda tanto no preview em tempo
// real da tela quanto na geração do PDF final, a partir da MESMA função.
// ------------------------------------------------------------

/**
 * Converte um valor de pressão informado na unidade da plaqueta do
 * fabricante (bar, kgf/cm² ou MPa) pra MPa — unidade canônica usada nas
 * fórmulas da NR-13. Fatores em NR13_CFG.UNIDADES_PRESSAO.
 */
function NR13_converterPressao_(valor, unidade) {
  var fator = NR13_CFG.UNIDADES_PRESSAO[unidade];
  if (!fator) throw new Error('Unidade de pressão inválida — use MPa, bar ou kgf/cm².');
  return Number(valor) * fator;
}

/** Converte um valor de volume (m³ ou L) pra m³ — unidade canônica da NR-13. */
function NR13_converterVolume_(valor, unidade) {
  var fator = NR13_CFG.UNIDADES_VOLUME[unidade];
  if (!fator) throw new Error('Unidade de volume inválida — use m³ ou L.');
  return Number(valor) * fator;
}

/**
 * @param {number} pmtaMpa Pressão Máxima de Trabalho Admissível, em MPa.
 * @param {number} volumeM3 Volume do vaso, em m³.
 * @param {string} classeFluido 'A'|'B'|'C'|'D' (item 13.5.1.1.1 da NR-13).
 * @returns {{pv:number, grupo:number, categoria:string, periodicidade:{externo:number, interno:number}}}
 */
function NR13_calcularCategoria_(pmtaMpa, volumeM3, classeFluido) {
  var p = Number(pmtaMpa);
  var v = Number(volumeM3);
  var classe = String(classeFluido || '').toUpperCase();

  if (!isFinite(p) || p <= 0) throw new Error('Informe a PMTA (Pressão Máxima de Trabalho Admissível) em MPa, maior que zero.');
  if (!isFinite(v) || v <= 0) throw new Error('Informe o Volume do vaso em m³, maior que zero.');
  if (!NR13_CFG.TABELA_CATEGORIA[classe]) throw new Error('Classe de fluido inválida — use A, B, C ou D.');

  // Arredonda o produto (9 casas) para a conversão kgf/cm² ou bar não
  // jogar um valor de fronteira (ex.: 1,0000000002 ou 0,9999999998) no
  // grupo errado.
  var pv = Math.round(p * v * 1e9) / 1e9;
  // Grupos de potencial de risco da NR-13 (limites inclusivos):
  // 1: P.V >= 100 | 2: 30 <= P.V < 100 | 3: 2,5 <= P.V < 30 | 4: 1 <= P.V < 2,5 | 5: P.V < 1
  var grupo;
  if (pv >= 100) grupo = 1;
  else if (pv >= 30) grupo = 2;
  else if (pv >= 2.5) grupo = 3;
  else if (pv >= 1) grupo = 4;
  else grupo = 5;

  var categoria = NR13_CFG.TABELA_CATEGORIA[classe][grupo - 1];
  var periodicidade = NR13_CFG.TABELA_PERIODICIDADE[categoria];

  // Campo de aplicação (item 13.2.1 da NR-13): vaso com P.V até 8, com P em
  // kPa e V em m³, só entra se o fluido for da classe A. Aqui P é a PMTA
  // (valor conservador). Não bloqueia: só avisa na tela e no laudo.
  var pvKpa = Math.round(p * 1000 * v * 1e6) / 1e6;
  var foraDoCampoAplicacao = pvKpa <= 8 && classe !== 'A';

  return { pv: pv, grupo: grupo, categoria: categoria, periodicidade: periodicidade, pvKpa: pvKpa, foraDoCampoAplicacao: foraDoCampoAplicacao };
}

function NR13_apiCalcularCategoria(sessionId, payload) {
  payload = payload || {};
  exigirSessao(sessionId);
  var pmtaMpa = NR13_converterPressao_(payload.pmtaValor, payload.pmtaUnidade);
  var volumeM3 = NR13_converterVolume_(payload.volumeValor, payload.volumeUnidade);
  var r = NR13_calcularCategoria_(pmtaMpa, volumeM3, payload.classeFluido);
  r.pmtaMpaConvertido = pmtaMpa;
  r.volumeM3Convertido = volumeM3;
  return { ok: true, resultado: r };
}

/** Soma N anos a uma data dd/mm/aaaa — usado pra sugerir a próxima inspeção (padrão: 1 ano). */
function NR13_somarAnos_(dataBr, anos) {
  var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(dataBr || '').trim());
  if (!m) return '';
  var base = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  base.setFullYear(base.getFullYear() + Number(anos));
  var tz = Session.getScriptTimeZone() || 'America/Sao_Paulo';
  return Utilities.formatDate(base, tz, 'dd/MM/yyyy');
}

/** Data dd/mm/aaaa real (rejeita 31/02, 00/13 etc.) → Date local; senão null. */
function NR13_dataBrValida_(dataBr) {
  var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(dataBr || '').trim());
  if (!m) return null;
  var d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  if (d.getFullYear() !== Number(m[3]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[1])) return null;
  return d;
}

// ------------------------------------------------------------
// TESTE HIDROSTÁTICO (TH) — calcula rampa de subida/descida e perda de
// pressão durante o patamar de ensaio, a partir dos tempos e pressões
// informados. Cálculo determinístico, mesmo princípio das outras contas
// deste módulo: roda igual no preview e na emissão final.
// ------------------------------------------------------------

/**
 * @param {Object} th { pressaoTeste, tempoSubidaMin, pressaoInicial, tempoEnsaioMin, pressaoFinal, tempoDescidaMin } — pressões todas na mesma unidade (a que o usuário escolheu).
 * @returns {{rampaSubida:number, rampaDescida:number, perda:number, perdaPercentual:number}}
 */
function NR13_calcularTH_(th) {
  var pressaoTeste = Number(th.pressaoTeste) || 0;
  var tempoSubida = Number(th.tempoSubidaMin) || 0;
  var pressaoInicial = Number(th.pressaoInicial) || 0;
  var tempoEnsaio = Number(th.tempoEnsaioMin) || 0;
  var pressaoFinal = Number(th.pressaoFinal) || 0;
  var tempoDescida = Number(th.tempoDescidaMin) || 0;

  var rampaSubida = tempoSubida > 0 ? (pressaoTeste / tempoSubida) : 0;
  var rampaDescida = tempoDescida > 0 ? (pressaoFinal / tempoDescida) : 0;
  var perda = pressaoInicial - pressaoFinal;
  var perdaPercentual = pressaoInicial > 0 ? (perda / pressaoInicial) * 100 : 0;

  return {
    pressaoTeste: pressaoTeste, tempoSubidaMin: tempoSubida, pressaoInicial: pressaoInicial,
    tempoEnsaioMin: tempoEnsaio, pressaoFinal: pressaoFinal, tempoDescidaMin: tempoDescida,
    rampaSubida: rampaSubida, rampaDescida: rampaDescida, perda: perda, perdaPercentual: perdaPercentual
  };
}

function NR13_apiCalcularTH(sessionId, payload) {
  payload = payload || {};
  exigirSessao(sessionId);
  return { ok: true, resultado: NR13_calcularTH_(payload) };
}

// ------------------------------------------------------------
// FOTOS — upload pro Drive (retorna fileId/link, nunca base64 persistido
// na planilha) + análise técnica por IA (SGO_NR13_IA.js).
// ------------------------------------------------------------
function NR13_apiUploadFoto(sessionId, payload) {
  payload = payload || {};
  exigirSessao(sessionId);
  if (!payload.base64) throw new Error('Nenhuma foto enviada.');

  var pasta = NR13_obterPastaFotos_(payload.nomeCliente || 'Cliente nao informado', payload.cnpj);
  var partes = String(payload.base64 || '').split(',');
  var dadosBase64 = partes.length > 1 ? partes[1] : partes[0];
  var mimeType = payload.mimeType || 'image/jpeg';
  var nomeArquivo = NR13_sanitizarNome_(payload.nomeArquivo || ('foto-' + new Date().getTime()));

  var blob = Utilities.newBlob(Utilities.base64Decode(dadosBase64), mimeType, nomeArquivo);
  var arquivo = pasta.createFile(blob);
  arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return { ok: true, fileId: arquivo.getId(), link: arquivo.getUrl() };
}

function NR13_apiAnalisarFoto(sessionId, payload) {
  payload = payload || {};
  exigirSessao(sessionId);
  if (!payload.base64) throw new Error('Nenhuma foto informada para análise.');
  var texto = NR13IA_analisarFoto_(payload.base64, payload.mimeType, payload.legendaUsuario, payload.contextoVaso);
  return { ok: true, interpretacao: texto };
}

function NR13_apiMelhorarTexto(sessionId, payload) {
  payload = payload || {};
  exigirSessao(sessionId);
  if (!String(payload.texto || '').trim()) throw new Error('Nenhum texto informado para melhorar.');
  var texto = NR13IA_melhorarTexto_(payload.rotulo, payload.texto, payload.contextoVaso);
  return { ok: true, texto: texto };
}

function NR13_apiGerarParecerConclusivo(sessionId, payload) {
  payload = payload || {};
  exigirSessao(sessionId);
  var texto = NR13IA_gerarParecerConclusivo_(payload);
  return { ok: true, texto: texto };
}

// ------------------------------------------------------------
// RASCUNHO — editável livremente (fotos, observações, veredito) até ser
// emitido. Salvo com STATUS='RASCUNHO'; NR13_apiSalvarRascunho cria na
// primeira chamada (sem id) e atualiza nas seguintes (com id).
// ------------------------------------------------------------
function NR13_apiSalvarRascunho(sessionId, payload) {
  payload = payload || {};
  var sessao = exigirSessao(sessionId);
  NR13_bootstrap_();

  var dados = NR13_normalizarPayloadLaudo_(payload);
  var laudoId = SGO_UTILS.safe(payload.laudoId);

  if (laudoId) {
    var atual = SGO_DATA.getById(NR13_SHEET, laudoId);
    if (!atual) throw new Error('Rascunho não encontrado.');
    if (SGO_UTILS.safeUpper(atual.STATUS) === NR13_CFG.STATUS.EMITIDO) throw new Error('Este laudo já foi emitido e não pode mais ser editado. Para fazer outro laudo deste vaso, clique em "Começar Novo Laudo (mantém os campos preenchidos)" e depois em Salvar Rascunho ou Emitir Laudo Final.');

    var novosDados = SGO_DATA.normalizarObjetoParaSheet(NR13_SHEET, Object.assign({}, dados, {
      ID: laudoId,
      STATUS: NR13_CFG.STATUS.RASCUNHO,
      STATUS_PENDENCIA: atual.STATUS_PENDENCIA || '',
      REGISTRO_ORIGEM_ID: atual.REGISTRO_ORIGEM_ID || SGO_UTILS.safe(payload.registroOrigemId),
      NUMERO_LAUDO: atual.NUMERO_LAUDO || '',
      CRIADO_EM: atual.CRIADO_EM
    }));
    SGO_DATA.update(NR13_SHEET, laudoId, novosDados);
    SGO_DATA.log('NR13_RASCUNHO_ATUALIZAR', sessao.usuario, 'Rascunho NR13 atualizado ID=' + laudoId, 'NR13');
    return { ok: true, laudoId: laudoId };
  }

  var registro = SGO_DATA.normalizarObjetoParaSheet(NR13_SHEET, SGO_DATA.gerarRegistroBase(Object.assign({}, dados, {
    NUMERO_LAUDO: '',
    STATUS: NR13_CFG.STATUS.RASCUNHO,
    STATUS_PENDENCIA: '',
    REGISTRO_ORIGEM_ID: SGO_UTILS.safe(payload.registroOrigemId),
    LINK_PDF: '',
    DADOS_JSON: ''
  })));
  SGO_DATA.insert(NR13_SHEET, registro);
  SGO_DATA.log('NR13_RASCUNHO_CRIAR', sessao.usuario, 'Rascunho NR13 criado ID=' + registro.ID, 'NR13');
  return { ok: true, laudoId: registro.ID };
}

/**
 * Conversão numérica pra valores que já chegam do FRONTEND como number
 * de verdade (o JS do navegador já fez parseFloat("5,6".replace(',','.'))
 * antes de mandar pro servidor via google.script.run, que preserva o
 * tipo number no JSON). NUNCA usar SGO_UTILS.toNumber aqui — aquela
 * função assume uma STRING no formato de moeda BR (ponto = milhar,
 * vírgula = decimal) e faz `.replace(/\./g,"")` pra tirar o "milhar"; se
 * o valor já chegar como number, String(5.6) vira "5.6" e o ponto
 * DECIMAL é confundido com separador de milhar, virando 56 — bug real
 * encontrado em produção (2026-08-24): "5,6" no formulário virou "56,00"
 * no laudo. Aqui o valor já é number, então só validamos que é finito.
 */
function NR13_num_(v, def) {
  var n = Number(v);
  return isFinite(n) ? n : (def === undefined ? 0 : def);
}

function NR13_normalizarPayloadLaudo_(payload) {
  var pmtaValor = NR13_num_(payload.pmtaValor, 0);
  var pmtaUnidade = SGO_UTILS.safe(payload.pmtaUnidade) || 'MPa';
  var volumeValor = NR13_num_(payload.volumeValor, 0);
  var volumeUnidade = SGO_UTILS.safe(payload.volumeUnidade) || 'm³';

  var pmtaMpa = 0;
  try { pmtaMpa = pmtaValor > 0 ? NR13_converterPressao_(pmtaValor, pmtaUnidade) : 0; } catch (e) { pmtaMpa = 0; }
  var volumeM3 = 0;
  try { volumeM3 = volumeValor > 0 ? NR13_converterVolume_(volumeValor, volumeUnidade) : 0; } catch (e) { volumeM3 = 0; }

  return {
    CLIENTE_ID: SGO_UTILS.safe(payload.clienteId),
    UNIDADE_ID: SGO_UTILS.safe(payload.unidadeId),
    EQUIPAMENTO_ID: SGO_UTILS.safe(payload.equipamentoId),
    TIPO_VASO: SGO_UTILS.safe(payload.tipoVaso),
    FABRICANTE: SGO_UTILS.safe(payload.fabricante),
    MODELO: SGO_UTILS.safe(payload.modelo),
    NUMERO_SERIE: SGO_UTILS.safe(payload.numeroSerie),
    ANO_FABRICACAO: SGO_UTILS.safe(payload.anoFabricacao),
    CODIGO_CONSTRUCAO: SGO_UTILS.safe(payload.codigoConstrucao),
    PMTA_VALOR: pmtaValor,
    PMTA_UNIDADE: pmtaUnidade,
    PMTA_MPA: pmtaMpa,
    VOLUME_VALOR: volumeValor,
    VOLUME_UNIDADE: volumeUnidade,
    VOLUME_M3: volumeM3,
    CLASSE_FLUIDO: SGO_UTILS.safeUpper(payload.classeFluido),
    FLUIDO_SERVICO: SGO_UTILS.safe(payload.fluidoServico),
    TIPO_INSPECAO: SGO_UTILS.safe(payload.tipoInspecao),
    DATA_INICIO_INSPECAO: SGO_UTILS.safe(payload.dataInicioInspecao),
    DATA_TERMINO_INSPECAO: SGO_UTILS.safe(payload.dataTerminoInspecao),
    DESCRICAO_INSPECOES: SGO_UTILS.safe(payload.descricaoInspecoes),
    RESULTADO_INSPECOES: SGO_UTILS.safe(payload.resultadoInspecoes),
    RECOMENDACOES: SGO_UTILS.safe(payload.recomendacoes),
    OBSERVACOES: SGO_UTILS.safe(payload.observacoes),
    FOTOS_JSON: JSON.stringify((Array.isArray(payload.fotos) ? payload.fotos : []).map(function(f) {
      return { fileId: f.fileId || '', link: f.link || '', legendaUsuario: f.legendaUsuario || '', interpretacaoIA: f.interpretacaoIA || '' };
    })),
    TH_REALIZADO: payload.thRealizado ? 'S' : 'N',
    TH_UNIDADE_PRESSAO: SGO_UTILS.safe(payload.thUnidadePressao) || pmtaUnidade,
    TH_PRESSAO_TESTE: NR13_num_(payload.thPressaoTeste, 0),
    TH_TEMPO_SUBIDA_MIN: NR13_num_(payload.thTempoSubidaMin, 0),
    TH_PRESSAO_INICIAL: NR13_num_(payload.thPressaoInicial, 0),
    TH_TEMPO_ENSAIO_MIN: NR13_num_(payload.thTempoEnsaioMin, 0),
    TH_PRESSAO_FINAL: NR13_num_(payload.thPressaoFinal, 0),
    TH_TEMPO_DESCIDA_MIN: NR13_num_(payload.thTempoDescidaMin, 0),
    VALVULAS_JSON: JSON.stringify((Array.isArray(payload.valvulas) ? payload.valvulas : []).map(function(v) {
      return { identificacao: v.identificacao || '', certificado: v.certificado || '', pressaoAbertura: v.pressaoAbertura || '', resultado: v.resultado || 'Aprovado' };
    })),
    MANOMETROS_JSON: JSON.stringify((Array.isArray(payload.manometros) ? payload.manometros : []).map(function(m) {
      return { identificacao: m.identificacao || '', faixaIndicacao: m.faixaIndicacao || '', certificado: m.certificado || '', resultado: m.resultado || 'Aprovado' };
    })),
    VEREDITO: NR13_normalizarVeredito_(payload.veredito),
    PARECER_CONCLUSIVO: SGO_UTILS.safe(payload.parecerConclusivo),
    ASSINANTE_PH: SGO_UTILS.safe(payload.assinantePh)
  };
}

// Achado real 2026-08-28: essa função assumia "APROVADO" pra qualquer
// veredito não reconhecido (vazio, nulo, digitado errado) — um laudo sem
// veredito explícito virava aprovado por omissão, o oposto do que se
// espera de um laudo regulatório. Agora só normaliza um valor já válido;
// devolve '' se não bater com nenhum dos 3 — quem chama decide o que fazer
// (rascunho aceita veredito vazio; NR13_validarParaEmissao_ barra).
function NR13_normalizarVeredito_(v) {
  var up = SGO_UTILS.safeUpper(v);
  if (up === NR13_CFG.VEREDITOS.REPROVADO) return NR13_CFG.VEREDITOS.REPROVADO;
  if (up === NR13_CFG.VEREDITOS.APROVADO_COM_RESSALVAS) return NR13_CFG.VEREDITOS.APROVADO_COM_RESSALVAS;
  if (up === NR13_CFG.VEREDITOS.APROVADO) return NR13_CFG.VEREDITOS.APROVADO;
  return '';
}

/**
 * Devolve o rascunho INTEIRO pronto pra repopular a tela (não só a linha
 * crua da planilha) — inclui cliente/unidade/equipamento completos, pra
 * "Continuar rascunho" nunca deixar o usuário perder o que já preencheu
 * (achado real 2026-08-24: usuário com medo de recarregar a página e
 * perder um formulário grande já preenchido).
 */
function NR13_apiObterLaudo(sessionId, payload) {
  payload = payload || {};
  exigirSessao(sessionId);
  NR13_bootstrap_();
  var laudo = SGO_DATA.getById(NR13_SHEET, SGO_UTILS.safe(payload.laudoId));
  if (!laudo) throw new Error('Rascunho não encontrado.');

  var fotos = [];
  try { fotos = JSON.parse(laudo.FOTOS_JSON || '[]'); } catch (e) { fotos = []; }
  var valvulas = [];
  try { valvulas = JSON.parse(laudo.VALVULAS_JSON || '[]'); } catch (e) { valvulas = []; }
  var manometros = [];
  try { manometros = JSON.parse(laudo.MANOMETROS_JSON || '[]'); } catch (e) { manometros = []; }

  var cliente = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, laudo.CLIENTE_ID);
  var equipamento = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, laudo.EQUIPAMENTO_ID);

  return {
    ok: true,
    laudo: Object.assign({}, laudo, { fotos: fotos, valvulas: valvulas, manometros: manometros }),
    cliente: cliente ? { ID: cliente.ID, RAZAO_SOCIAL: cliente.RAZAO_SOCIAL, CNPJ: cliente.CNPJ, ENDERECO: cliente.ENDERECO } : null,
    equipamento: equipamento || null
  };
}

/** Rascunhos (STATUS='RASCUNHO') de um cliente por CNPJ — pra "Continuar rascunho salvo" na tela. */
function NR13_apiListarRascunhosPorCnpj(sessionId, payload) {
  payload = payload || {};
  exigirSessao(sessionId);
  NR13_bootstrap_();

  var cnpjDigitos = String(payload.cnpj || '').replace(/\D/g, '');
  if (!cnpjDigitos) throw new Error('Informe um CNPJ para buscar.');

  var clientes = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES).filter(function(c) {
    return String(c.CNPJ || '').replace(/\D/g, '') === cnpjDigitos;
  });
  if (!clientes.length) return { ok: true, items: [] };

  var cliente = clientes[0];
  var mapaEquip = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).forEach(function(e) { mapaEquip[SGO_UTILS.safe(e.ID)] = e; });

  var rascunhos = SGO_DATA.getAll(NR13_SHEET)
    .filter(function(r) { return SGO_UTILS.safe(r.CLIENTE_ID) === SGO_UTILS.safe(cliente.ID) && SGO_UTILS.safeUpper(r.STATUS) === NR13_CFG.STATUS.RASCUNHO; })
    .sort(function(a, b) { return String(b.CRIADO_EM || '').localeCompare(String(a.CRIADO_EM || '')); })
    .map(function(r) {
      var eq = mapaEquip[SGO_UTILS.safe(r.EQUIPAMENTO_ID)] || {};
      return { id: r.ID, tipoVaso: r.TIPO_VASO || eq.TIPO || '', equipamentoTag: eq.TAG || '', criadoEm: r.CRIADO_EM };
    });

  return { ok: true, items: rascunhos };
}

/** Laudos com pendência aberta (veredito "com ressalvas") pro equipamento — oferece "Registrar Reinspeção" na tela. */
function NR13_apiListarPendenciasAbertas(sessionId, payload) {
  payload = payload || {};
  exigirSessao(sessionId);
  NR13_bootstrap_();
  var equipamentoId = SGO_UTILS.safe(payload.equipamentoId);
  var itens = SGO_DATA.getAll(NR13_SHEET).filter(function(l) {
    return SGO_UTILS.safe(l.EQUIPAMENTO_ID) === equipamentoId && SGO_UTILS.safe(l.STATUS_PENDENCIA) === 'aberto';
  }).sort(function(a, b) { return String(b.CRIADO_EM || '').localeCompare(String(a.CRIADO_EM || '')); });
  return { ok: true, items: itens };
}

// ------------------------------------------------------------
// EMISSÃO DO LAUDO FINAL — trava o registro (imutável), numera, gera
// PDF (com fotos re-buscadas do Drive em base64 pra embutir), salva no
// Drive, e se for reinspeção fecha a pendência do laudo original.
// ------------------------------------------------------------
function NR13_apiEmitirLaudo(sessionId, payload) {
  payload = payload || {};
  var sessao = exigirSessao(sessionId);
  NR13_bootstrap_();

  var laudoId = SGO_UTILS.safe(payload.laudoId);
  if (!laudoId) throw new Error('Salve o rascunho antes de emitir o laudo.');
  var atual = SGO_DATA.getById(NR13_SHEET, laudoId);
  if (!atual) throw new Error('Laudo não encontrado.');
  if (SGO_UTILS.safeUpper(atual.STATUS) === NR13_CFG.STATUS.EMITIDO) throw new Error('Este laudo já foi emitido.');

  var dados = NR13_normalizarPayloadLaudo_(payload);
  var erros = NR13_validarParaEmissao_(dados);
  if (erros.length) throw new Error(erros.join(' '));

  var cliente = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, dados.CLIENTE_ID);
  SGO_VINCULOS.relation(sessionId, dados.CLIENTE_ID, dados.UNIDADE_ID, dados.EQUIPAMENTO_ID);
  var unidade = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, dados.UNIDADE_ID) || {};
  var equipamento = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, dados.EQUIPAMENTO_ID) || {};
  if (!cliente) throw new Error('Cliente não encontrado.');

  var categoria = NR13_calcularCategoria_(dados.PMTA_MPA, dados.VOLUME_M3, dados.CLASSE_FLUIDO);

  // Data da próxima inspeção: por padrão da Metrolabs, sempre 1 ano após
  // a data de término da inspeção atual — INDEPENDENTE do prazo máximo
  // que a categoria da NR-13 permitiria (esse prazo máximo continua
  // calculado e exibido só como referência, ver ctx.categoria.periodicidade
  // e a memória de cálculo no documento). O técnico pode digitar
  // manualmente outra data no formulário (ex.: quando o cliente pede um
  // prazo diferente, ou quando o prazo legal da categoria for menor que 1
  // ano) — se vier preenchida e em formato válido, ela sempre prevalece
  // sobre a sugestão automática.
  var dataProximaManual = SGO_UTILS.safe(payload.dataProximaInspecao);
  var dataProxima = dataProximaManual || NR13_somarAnos_(dados.DATA_TERMINO_INSPECAO, 1);
  // Data digitada à mão: antes uma data em formato errado era trocada em
  // silêncio por "término + 1 ano". Agora a emissão para e diz o que corrigir,
  // e não aceita data além do prazo máximo da categoria (exame externo).
  var dTerminoProx = NR13_dataBrValida_(dados.DATA_TERMINO_INSPECAO);
  var dProxima = NR13_dataBrValida_(dataProxima);
  if (!dProxima) throw new Error('A data prevista da próxima inspeção (' + dataProxima + ') não é uma data válida. Corrija no passo 4 (Dados da inspeção) no formato dd/mm/aaaa, ou apague o campo para usar a sugestão de 1 ano após o término.');
  if (dTerminoProx && dProxima.getTime() <= dTerminoProx.getTime()) throw new Error('A data prevista da próxima inspeção (' + dataProxima + ') precisa ser posterior à data de término da inspeção (' + dados.DATA_TERMINO_INSPECAO + '). Corrija no passo 4 (Dados da inspeção).');
  var limiteProximaBr = NR13_somarAnos_(dados.DATA_TERMINO_INSPECAO, categoria.periodicidade.externo);
  var limiteProxima = NR13_dataBrValida_(limiteProximaBr);
  if (limiteProxima && dProxima.getTime() > limiteProxima.getTime()) throw new Error('A data prevista da próxima inspeção (' + dataProxima + ') ultrapassa o prazo máximo da NR-13 para vaso de categoria ' + categoria.categoria + ' (exame externo a cada ' + categoria.periodicidade.externo + ' ano(s), ou seja, até ' + limiteProximaBr + '). Corrija no passo 4 (Dados da inspeção).');

  var numero = NR13_proximoNumero_();
  var tz = Session.getScriptTimeZone() || 'America/Sao_Paulo';
  var dataEmissao = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy');

  var fotosPayload = (Array.isArray(payload.fotos) ? payload.fotos : []).slice(0, 20);
  var fotosParaDocumento = fotosPayload.map(function(f) {
    var base64 = '';
    var mimeType = 'image/jpeg';
    if (f.fileId) {
      try {
        var blob = DriveApp.getFileById(f.fileId).getBlob();
        base64 = Utilities.base64Encode(blob.getBytes());
        mimeType = blob.getContentType() || mimeType;
      } catch (e) { /* foto removida do Drive nesse meio-tempo — segue sem imagem */ }
    }
    return { base64: base64, mimeType: mimeType, legendaUsuario: f.legendaUsuario || '', interpretacaoIA: f.interpretacaoIA || '' };
  });

  var ctx = {
    numeroLaudo: numero,
    dataEmissao: dataEmissao,
    cliente: { id: cliente.ID, razaoSocial: cliente.RAZAO_SOCIAL || cliente.NOME_FANTASIA || '', cnpj: SGO_UTILS.formatCnpj(cliente.CNPJ), endereco: unidade.ENDERECO || cliente.ENDERECO || '' },
    unidade: { id: unidade.ID || '', nome: unidade.NOME_UNIDADE || '' },
    vaso: {
      tipo: dados.TIPO_VASO, tag: equipamento.TAG || '', fabricante: dados.FABRICANTE, modelo: dados.MODELO,
      numeroSerie: dados.NUMERO_SERIE, anoFabricacao: dados.ANO_FABRICACAO, codigoConstrucao: dados.CODIGO_CONSTRUCAO,
      pmtaValor: dados.PMTA_VALOR, pmtaUnidade: dados.PMTA_UNIDADE, pmtaMpa: dados.PMTA_MPA,
      volumeValor: dados.VOLUME_VALOR, volumeUnidade: dados.VOLUME_UNIDADE, volumeM3: dados.VOLUME_M3,
      classeFluido: dados.CLASSE_FLUIDO, fluidoServico: dados.FLUIDO_SERVICO,
      setor: equipamento.SETOR || ''
    },
    categoria: categoria,
    inspecao: {
      tipo: dados.TIPO_INSPECAO, dataInicio: dados.DATA_INICIO_INSPECAO, dataTermino: dados.DATA_TERMINO_INSPECAO,
      descricao: dados.DESCRICAO_INSPECOES, resultado: dados.RESULTADO_INSPECOES, recomendacoes: dados.RECOMENDACOES,
      observacoes: dados.OBSERVACOES
    },
    testeHidrostatico: dados.TH_REALIZADO === 'S' ? Object.assign(
      { realizado: true, unidade: dados.TH_UNIDADE_PRESSAO },
      NR13_calcularTH_({
        pressaoTeste: dados.TH_PRESSAO_TESTE, tempoSubidaMin: dados.TH_TEMPO_SUBIDA_MIN,
        pressaoInicial: dados.TH_PRESSAO_INICIAL, tempoEnsaioMin: dados.TH_TEMPO_ENSAIO_MIN,
        pressaoFinal: dados.TH_PRESSAO_FINAL, tempoDescidaMin: dados.TH_TEMPO_DESCIDA_MIN
      })
    ) : { realizado: false },
    valvulas: JSON.parse(dados.VALVULAS_JSON || '[]'),
    manometros: JSON.parse(dados.MANOMETROS_JSON || '[]'),
    fotos: fotosParaDocumento,
    veredito: dados.VEREDITO,
    parecerConclusivo: dados.PARECER_CONCLUSIVO,
    dataProximaInspecao: dataProxima,
    assinantePh: dados.ASSINANTE_PH,
    registroOrigemId: SGO_UTILS.safe(payload.registroOrigemId) || atual.REGISTRO_ORIGEM_ID || ''
  };

  if (ctx.registroOrigemId) {
    var origem = SGO_DATA.getById(NR13_SHEET, ctx.registroOrigemId);
    if (origem) ctx.registroOrigemInfo = { numeroLaudo: origem.NUMERO_LAUDO, dataEmissao: '' };
  }

  // Introdução/Objetivo gerados por IA, grounded nos dados reais acima —
  // nunca trava a emissão do laudo se a IA falhar (mesmo princípio de
  // resiliência da legenda decorativa do CertCal): cai no texto fixo.
  try {
    ctx.textosIA = NR13IA_gerarTextosLaudo_(ctx);
  } catch (e) {
    ctx.textosIA = { introducao: NR13Doc_textoIntroducaoFixo_(ctx), objetivo: NR13Doc_textoObjetivoFixo_(ctx) };
  }

  // Pasta do cliente = CNPJ com 14 dígitos (padrão A4 de 18/10/2026); nome
  // "<Tipo> - <número> - <TAG> - <aaaa-MM-dd HHmm>", .html e .pdf de mesmo nome.
  var pasta = NR13_obterPastaCliente_(ctx.cliente.razaoSocial, ctx.cliente.cnpj);
  var carimbo = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HHmm');
  var nomeBase = NR13_sanitizarNome_('Laudo NR-13 - ' + numero + ' - ' + (ctx.vaso.tag || ctx.vaso.tipo || 'sem TAG') + ' - ' + carimbo);
  var nomeArquivo = nomeBase + '.pdf';
  // Sumário com páginas só se o laudo passar de 3 páginas (NR13Doc_finalizar_).
  var fin = NR13Doc_finalizar_(ctx, nomeBase);
  ctx.sumario = !!fin.sumario;
  var html = fin.html;
  var salvo = SGO_DocSalvar_salvarHtmlEPdf_(pasta, nomeBase, html, fin.pdfBlob ? { pdfBlob: fin.pdfBlob, compartilhar: true } : { compartilhar: true });
  html = salvo.html || html;
  var arquivo = DriveApp.getFileById(salvo.pdfId);

  var novosDados = SGO_DATA.normalizarObjetoParaSheet(NR13_SHEET, Object.assign({}, dados, {
    ID: laudoId,
    NUMERO_LAUDO: numero,
    DATA_PROXIMA_INSPECAO: dataProxima,
    GRUPO_POTENCIAL_RISCO: String(categoria.grupo),
    CATEGORIA: categoria.categoria,
    STATUS: NR13_CFG.STATUS.EMITIDO,
    STATUS_PENDENCIA: dados.VEREDITO === NR13_CFG.VEREDITOS.APROVADO_COM_RESSALVAS ? 'aberto' : '',
    REGISTRO_ORIGEM_ID: ctx.registroOrigemId,
    LINK_PDF: arquivo.getUrl(),
    DADOS_JSON: JSON.stringify(ctx),
    CRIADO_EM: atual.CRIADO_EM
  }));
  SGO_DATA.update(NR13_SHEET, laudoId, novosDados);

  if (ctx.registroOrigemId) {
    SGO_DATA.update(NR13_SHEET, ctx.registroOrigemId, { STATUS_PENDENCIA: 'fechado' });
  }

  try {
    SGO_DOCUMENTOS.registrarDocumentoExistente(sessionId, {
      CLIENTE_ID: ctx.cliente.id,
      UNIDADE_ID: ctx.unidade.id,
      EQUIPAMENTO_ID: dados.EQUIPAMENTO_ID,
      TIPO_DOCUMENTO: 'LAUDO NR13 - VASO DE PRESSAO',
      NOME_ARQUIVO: nomeArquivo,
      LINK_ARQUIVO: arquivo.getUrl(),
      DATA_VENCIMENTO: NR13_dataParaIsoOuVazio_(dataProxima)
    });
  } catch (e) {
    SGO_DATA.log('NR13_REGISTRAR_DOC_FALHOU', sessao.usuario, e.message, 'NR13');
  }

  SGO_DATA.log('NR13_EMITIR', sessao.usuario, 'Laudo NR13 emitido nº ' + numero + ' — ' + (ctx.vaso.tag || ctx.vaso.tipo), 'NR13');

  // Integração Auvo: cria uma Tarefa concluída pra este atendimento. Nunca
  // derruba a emissão do laudo se o Auvo estiver fora do ar ou mal
  // configurado — ver SGO_Auvo_Main.js.
  try {
    Auvo_criarTarefa_({
      documentoId: laudoId,
      titulo: 'Laudo NR-13 nº ' + numero + ' — ' + (ctx.vaso.tag || ctx.vaso.tipo),
      descricao: 'Inspeção de vaso de pressão (NR-13), categoria ' + categoria.categoria + ' — veredito: ' + ctx.veredito,
      clienteId: ctx.cliente.id,
      usuarioId: sessao.userId,
      data: ctx.inspecao.dataTermino,
      linkPdf: arquivo.getUrl()
    });
  } catch (e) {
    SGO_DATA.log('AUVO_TAREFA_FALHOU', sessao.usuario, 'NR13 ' + numero + ': ' + e.message, 'AUVO');
  }

  // Regra do dono: além do PDF, a cópia HTML A4 fica na mesma pasta do cliente (gravada junto, acima).
  return { ok: true, html: html, laudoId: laudoId, numeroLaudo: numero, linkPdf: arquivo.getUrl(), htmlId: salvo.htmlId, htmlUrl: salvo.htmlUrl, pastaUrl: pasta.getUrl() };
}

function NR13_validarParaEmissao_(dados) {
  var erros = [];
  if (!dados.CLIENTE_ID) erros.push('Selecione o cliente.');
  if (!dados.EQUIPAMENTO_ID) erros.push('Selecione o equipamento (vaso de pressão).');
  if (!dados.TIPO_VASO) erros.push('Informe o tipo de vaso.');
  if (!(dados.PMTA_VALOR > 0)) erros.push('Informe a PMTA, maior que zero.');
  if (!(dados.PMTA_MPA > 0)) erros.push('Unidade da PMTA inválida.');
  if (!(dados.VOLUME_VALOR > 0)) erros.push('Informe o Volume do vaso, maior que zero.');
  if (!(dados.VOLUME_M3 > 0)) erros.push('Unidade do Volume inválida.');
  if (!dados.CLASSE_FLUIDO) erros.push('Selecione a classe do fluido.');
  if (!dados.TIPO_INSPECAO) erros.push('Selecione o tipo de inspeção.');
  if (!dados.DATA_TERMINO_INSPECAO) erros.push('Informe a data de término da inspeção.');
  else if (!NR13_dataBrValida_(dados.DATA_TERMINO_INSPECAO)) erros.push('A data de término da inspeção (' + dados.DATA_TERMINO_INSPECAO + ') não é uma data válida: use dd/mm/aaaa.');
  if (dados.DATA_INICIO_INSPECAO) {
    var dIni = NR13_dataBrValida_(dados.DATA_INICIO_INSPECAO);
    var dFim = NR13_dataBrValida_(dados.DATA_TERMINO_INSPECAO);
    if (!dIni) erros.push('A data de início da inspeção (' + dados.DATA_INICIO_INSPECAO + ') não é uma data válida: use dd/mm/aaaa.');
    else if (dFim && dIni.getTime() > dFim.getTime()) erros.push('A data de início da inspeção não pode ser posterior à data de término.');
  }
  if (!dados.ASSINANTE_PH) erros.push('Selecione o Profissional Legalmente Habilitado (PLH) responsável.');
  else {
    // O documento assina com o PH escolhido; sem esta checagem, um nome fora
    // da lista fazia o laudo sair assinado pelo primeiro PH cadastrado.
    var phs = (typeof CadeiaFrioRel_CFCFG !== 'undefined' && CadeiaFrioRel_CFCFG.ASSINATURAS_PADRAO) || [];
    if (phs.length && !phs.some(function (a) { return a && a.nome === dados.ASSINANTE_PH; })) {
      erros.push('O Profissional Legalmente Habilitado "' + dados.ASSINANTE_PH + '" não está na lista de assinaturas cadastradas. Selecione um PH da lista no passo 4 (Dados da inspeção).');
    }
  }
  if (!dados.DESCRICAO_INSPECOES) erros.push('Descreva as inspeções, exames e testes executados.');
  if (!dados.PARECER_CONCLUSIVO) erros.push('Escreva o parecer conclusivo (obrigatório pela NR-13, item 13.5.4.11-k).');
  if (!dados.VEREDITO) erros.push('Selecione o veredito do laudo (Aprovado, Aprovado com ressalvas ou Reprovado).');
  if (dados.TH_REALIZADO === 'S') {
    if (!(dados.TH_PRESSAO_TESTE > 0)) erros.push('Teste hidrostático: informe a pressão de teste.');
    if (!(dados.TH_PRESSAO_INICIAL > 0)) erros.push('Teste hidrostático: informe a pressão inicial do patamar.');
    if (!(dados.TH_PRESSAO_FINAL > 0)) erros.push('Teste hidrostático: informe a pressão final do patamar.');
    if (!(dados.TH_TEMPO_ENSAIO_MIN > 0)) erros.push('Teste hidrostático: informe o tempo de ensaio (patamar), em minutos.');
  }
  return erros;
}

function NR13_dataParaIsoOuVazio_(dataBr) {
  var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(dataBr || ''));
  if (!m) return '';
  return m[3] + '-' + m[2] + '-' + m[1];
}

// ------------------------------------------------------------
// BUSCA POR CNPJ / REABERTURA
// ------------------------------------------------------------
function NR13_apiBuscarLaudosPorCnpj(sessionId, payload) {
  payload = payload || {};
  exigirSessao(sessionId);
  NR13_bootstrap_();

  var cnpjDigitos = String(payload.cnpj || '').replace(/\D/g, '');
  if (!cnpjDigitos) throw new Error('Informe um CNPJ para buscar.');

  var clientes = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES).filter(function(c) {
    return String(c.CNPJ || '').replace(/\D/g, '') === cnpjDigitos;
  });
  if (!clientes.length) return { ok: true, cliente: null, items: [] };

  var cliente = clientes[0];
  var laudos = SGO_DATA.getAll(NR13_SHEET)
    .filter(function(r) { return SGO_UTILS.safe(r.CLIENTE_ID) === SGO_UTILS.safe(cliente.ID) && SGO_UTILS.safeUpper(r.STATUS) === NR13_CFG.STATUS.EMITIDO; })
    .sort(function(a, b) { return String(b.CRIADO_EM || '').localeCompare(String(a.CRIADO_EM || '')); });

  var mapaEquip = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).forEach(function(e) { mapaEquip[SGO_UTILS.safe(e.ID)] = e; });

  var items = laudos.map(function(r) {
    var eq = mapaEquip[SGO_UTILS.safe(r.EQUIPAMENTO_ID)] || {};
    return {
      id: r.ID,
      numeroLaudo: r.NUMERO_LAUDO,
      equipamentoTipo: r.TIPO_VASO || eq.TIPO || '',
      equipamentoTag: eq.TAG || '',
      categoria: r.CATEGORIA,
      veredito: r.VEREDITO,
      statusPendencia: r.STATUS_PENDENCIA,
      dataProximaInspecao: r.DATA_PROXIMA_INSPECAO,
      linkPdf: r.LINK_PDF
    };
  });

  return { ok: true, cliente: { id: cliente.ID, razaoSocial: cliente.RAZAO_SOCIAL, cnpj: SGO_UTILS.formatCnpj(cliente.CNPJ) }, items: items };
}

function NR13_apiReabrirLaudo(sessionId, payload) {
  payload = payload || {};
  exigirSessao(sessionId);
  NR13_bootstrap_();

  var registro = SGO_DATA.getById(NR13_SHEET, SGO_UTILS.safe(payload.laudoId));
  if (!registro) throw new Error('Laudo não encontrado.');

  var ctx;
  try { ctx = JSON.parse(registro.DADOS_JSON); } catch (e) { throw new Error('Não foi possível ler os dados salvos deste laudo.'); }

  // Laudo emitido com sumário: refaz os números de página para a tela (o PDF gravado não muda).
  var html = ctx.sumario
    ? RelTecA4_paginar_(NR13Doc_montarDocumentoHtml_(ctx, { sumario: true }), 'Laudo NR-13 ' + (ctx.numeroLaudo || '')).html
    : NR13Doc_montarDocumentoHtml_(ctx);
  return { ok: true, ctx: ctx, html: html, linkPdf: registro.LINK_PDF };
}

// ------------------------------------------------------------
// PERSISTÊNCIA NO DRIVE (mesmo padrão do resto do Portal)
// ------------------------------------------------------------
var NR13_DOCS_FOLDER_PROP = 'NR13_DOCUMENTOS_FOLDER_ID';

function NR13_obterPastaDocumentos_() {
  var props = PropertiesService.getScriptProperties();
  var idSalvo = props.getProperty(NR13_DOCS_FOLDER_PROP);
  if (idSalvo) {
    try { return DriveApp.getFolderById(idSalvo); } catch (e) { /* pasta salva não existe mais — recria abaixo */ }
  }
  var folder = DriveApp.getRootFolder().createFolder('Laudos NR13 - Documentos Gerados');
  props.setProperty(NR13_DOCS_FOLDER_PROP, folder.getId());
  return folder;
}

function NR13_sanitizarNome_(nome) {
  var limpo = String(nome || '')
    .replace(/[\\\/:*?"<>|#%]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
  return limpo || 'sem-nome';
}

/**
 * Subpasta do cliente: CNPJ com 14 dígitos (SGO_DocSalvar_pastaClienteEm_), com a
 * razão social na descrição. Sem CNPJ, procura o cliente no cadastro pelo nome;
 * se não achar, usa o nome do cliente (como antes).
 */
function NR13_obterPastaCliente_(nomeCliente, cnpj) {
  var raiz = NR13_obterPastaDocumentos_();
  var nome = String(nomeCliente || '').trim() || 'Cliente nao informado';
  var doc = String(cnpj || '').replace(/\D/g, '') || NR13_cnpjDoCadastro_(nome);
  return SGO_DocSalvar_pastaClienteEm_(raiz, doc, nome);
}

/** CNPJ (14 dígitos) do cliente com esta razão social ou nome fantasia no cadastro; '' se não achar. Nunca lança. */
function NR13_cnpjDoCadastro_(nomeCliente) {
  try {
    var alvo = String(nomeCliente || '').trim().toUpperCase();
    if (!alvo) return '';
    var achado = (SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES) || []).filter(function (c) {
      return String(c.RAZAO_SOCIAL || '').trim().toUpperCase() === alvo || String(c.NOME_FANTASIA || '').trim().toUpperCase() === alvo;
    })[0];
    var d = achado ? String(achado.CNPJ || '').replace(/\D/g, '') : '';
    return d.length === 14 ? d : '';
  } catch (e) { return ''; }
}

function NR13_obterPastaFotos_(nomeCliente, cnpj) {
  var pastaCliente = NR13_obterPastaCliente_(nomeCliente, cnpj);
  var nome = 'Fotos';
  var existentes = pastaCliente.getFoldersByName(nome);
  if (existentes.hasNext()) return existentes.next();
  return pastaCliente.createFolder(nome);
}

var NR13_NUMERO_PROP_PREFIX = 'NR13_NUMERO_';

function NR13_proximoNumero_() {
  var props = PropertiesService.getScriptProperties();
  var ano = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Sao_Paulo', 'yyyy');
  var chave = NR13_NUMERO_PROP_PREFIX + ano;
  // Trava: duas emissões ao mesmo tempo liam o mesmo contador e saíam com
  // o mesmo número de laudo.
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(20000)) throw new Error('Outro laudo NR-13 está sendo numerado neste momento. Aguarde alguns segundos e clique em "Emitir Laudo Final" de novo.');
  try {
    var atual = parseInt(props.getProperty(chave) || '0', 10) || 0;
    var proximo = atual + 1;
    props.setProperty(chave, String(proximo));
    return ano + String(proximo).padStart(5, '0');
  } finally {
    trava.releaseLock();
  }
}
