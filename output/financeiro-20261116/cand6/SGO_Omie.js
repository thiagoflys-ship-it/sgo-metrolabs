/** Omie: consultas financeiras. Credenciais somente no servidor. */
// 14/11/2026: caixas de acesso do Financeiro no SGO+ (lote 3), registradas pelo próprio módulo (padrão do lote 13). Padrão =
// espelho da trava de antes (perfil ADMIN, DIRETORIA ou FINANCEIRO); exceções por pessoa em Administração > Acessos.
var OMIE_PERFIS = ['ADMIN', 'DIRETORIA', 'FINANCEIRO'];
var OMIE_PODERES_ITENS = [
  ['FIN_OMIE_CONSULTAR', 'Financeiro', 'Consultar o Financeiro no SGO+ (Omie)', 'Abre o Financeiro do SGO+: visão geral, contas a pagar e a receber, fluxo de caixa, previsões, orçamento, faturamento e notas, sempre lidos do Omie. Não grava nada. Sigiloso: só as contas da lista de sigilo do Financeiro (Diretoria e Financeiro autorizado).', 'valores', 3],
  ['FIN_OMIE_LANCAR', 'Financeiro', 'Lançar, alterar e baixar títulos no Omie', 'Prepara e confirma a inclusão e a alteração de contas a pagar e a receber e o registro de pagamento ou recebimento (baixa) no Omie, sempre com prévia conferida. Sigiloso: só as contas da lista de sigilo do Financeiro (Diretoria e Financeiro autorizado).', 'valores', 3],
  ['FIN_OMIE_COBRAR', 'Financeiro', 'Gerar e prorrogar boletos pelo Omie', 'Gera ou prorroga o boleto de uma conta a receber pelo Omie (o banco pode cobrar tarifa). Sigiloso: só as contas da lista de sigilo do Financeiro (Diretoria e Financeiro autorizado).', 'operar', 3],
  ['FIN_OMIE_FATURAR', 'Financeiro', 'Faturar pedidos e O.S. e importar notas no Omie', 'Fatura pedido de venda ou O.S. já cadastrados no Omie (emite a nota fiscal), importa XML de NF-e de saída e recebe documentos de compra e NFS-e. Sigiloso: só as contas da lista de sigilo do Financeiro (Diretoria e Financeiro autorizado).', 'operar', 3],
  ['FIN_OMIE_CONCILIAR', 'Financeiro', 'Conferir o extrato do banco com o Omie', 'Importa o extrato do banco (OFX ou CSV), compara com o Omie e registra a conferência no SGO+ (não altera a conciliação dentro do Omie). Sigiloso: só as contas da lista de sigilo do Financeiro (Diretoria e Financeiro autorizado).', 'operar', 3],
  ['FIN_OMIE_PROVISOES', 'Financeiro', 'Registrar e cancelar provisões do Financeiro', 'Registra provisões internas (sem criar título no Omie) e cancela provisão, com o histórico preservado. Sigiloso: só as contas da lista de sigilo do Financeiro (Diretoria e Financeiro autorizado).', 'operar', 3]
];
var SGO_PODERES_MODULOS = (typeof SGO_PODERES_MODULOS !== 'undefined' && SGO_PODERES_MODULOS) || [];
OMIE_PODERES_ITENS.forEach(function (it) {
  if (SGO_PODERES_MODULOS.some(function (m) { return m && m.item && m.item[0] === it[0]; })) return;
  SGO_PODERES_MODULOS.push({ item: it, padrao: function (eu, c) { return OMIE_PERFIS.indexOf(String((c && c.p) || (eu && eu.perfil) || '').toUpperCase()) >= 0; }, ligado: true,
    // 16/11/2026: sigilo do Financeiro — fora da lista (SGO_Omie_Sigilo.js), nenhuma caixa do Financeiro vale
    restrito: function (eu) { return typeof Omie_contaNoSigilo_ === 'function' && Omie_contaNoSigilo_(eu && eu.id); },
    restritoMsg: 'O Financeiro é sigiloso: só as contas da lista de sigilo (Diretoria e Financeiro autorizado) podem ter estas caixas. A lista é mantida pelo responsável pelo sistema no Painel financeiro > Sigilo e acessos.' });
});

function Omie_erroPublico_(texto) { var e = new Error(texto); e.omieOpsPublica = true; e.omieFatSeguro = true; throw e; }
function Omie_exigirAcesso_(sessionId, codigo, acao) {
  var v = validarSessao(sessionId);
  if (!v || !v.valid || !v.data) Omie_erroPublico_('Sessão expirada. Entre novamente.');
  // 16/11/2026: sigilo do Financeiro, antes de tudo (SGO_Omie_Sigilo.js). Sem a trava carregada, ninguém passa.
  if (typeof Omie_contaNoSigilo_ !== 'function' || !Omie_contaNoSigilo_(v.data.userId)) {
    if (typeof Omie_registrarAcesso_ === 'function') Omie_registrarAcesso_(v.data, 'NEGADO');
    Omie_erroPublico_(typeof OMIE_SIGILO_MSG === 'string' ? OMIE_SIGILO_MSG : 'O Financeiro é sigiloso. Nada foi consultado.');
  }
  codigo = codigo || 'FIN_OMIE_CONSULTAR';
  if (typeof SGO_pode_ === 'function' && typeof Poderes_poder_ === 'function') {
    if (!SGO_pode_(sessionId, codigo)) { Omie_registrarAcesso_(v.data, 'NEGADO', '', 'Sem a caixa ' + codigo); Omie_erroPublico_(Poderes_msgSemPoder_(Poderes_poder_(codigo), acao)); }
  } else if (OMIE_PERFIS.indexOf(String(v.data.perfil || '').toUpperCase()) < 0) {
    Omie_erroPublico_('Acesso restrito ao Financeiro, à Diretoria e ao Administrador.');
  }
  Omie_registrarAcesso_(v.data, 'PERMITIDO');
  return v.data;
}

// 14/11/2026: gravação no Omie desligada até a primeira operação acompanhada (nenhuma escrita foi testada no Omie real).
// '1' = ligada. Só o dono grava em Chaves e senhas > Omie. A prévia continua funcionando; o envio recusa com o motivo.
function Omie_gravacaoLigada_() {
  try { return String(PropertiesService.getScriptProperties().getProperty('OMIE_GRAVACAO_LIGADA') || '').trim() === '1'; } catch (e) { return false; }
}
var OMIE_MSG_GRAVACAO_DESLIGADA = 'Nada foi enviado ao Omie: a gravação pelo SGO+ ainda está desligada. A prévia acima mostra exatamente o que seria enviado. A primeira operação será feita com acompanhamento; peça ao responsável pelo sistema para ligar a gravação no Omie quando combinar esse acompanhamento.';
function Omie_exigirGravacao_() { if (!Omie_gravacaoLigada_()) Omie_erroPublico_(OMIE_MSG_GRAVACAO_DESLIGADA); }

/** Início da tela: o que a pessoa pode fazer (as travas continuam no servidor) e se a gravação está ligada. */
function Omie_apiIniciar(sessionId) {
  try {
    var v = validarSessao(sessionId);
    if (!v || !v.valid || !v.data) return { ok: true, ver: false, poderes: {} };
    // 16/11/2026: fora da lista de sigilo, o menu nem aparece (e nada do Omie é dito: nem se está configurado)
    if (typeof Omie_contaNoSigilo_ !== 'function' || !Omie_contaNoSigilo_(v.data.userId)) return { ok: true, ver: false, poderes: {} };
    var poderes = {};
    OMIE_PODERES_ITENS.forEach(function (it) {
      var c = it[0];
      poderes[c] = typeof SGO_pode_ === 'function' && typeof Poderes_poder_ === 'function' ? !!SGO_pode_(sessionId, c) : OMIE_PERFIS.indexOf(String(v.data.perfil || '').toUpperCase()) >= 0;
    });
    var p = PropertiesService.getScriptProperties();
    var configurado = !!(String(p.getProperty('OMIE_APP_KEY') || '').trim() && String(p.getProperty('OMIE_APP_SECRET') || '').trim());
    // 16/11/2026 (sigilo, seção 5): nome e login de quem está vendo, para a marca d'água da tela e da impressão
    var marca = typeof Fin_marca_ === 'function' ? Fin_marca_(v.data) : null;
    return { ok: true, ver: !!poderes.FIN_OMIE_CONSULTAR, poderes: poderes, gravacao: Omie_gravacaoLigada_(), configurado: configurado, marca: marca,
      aprovacoesPendentes: typeof OmieRegras_contarPendentesPara_ === 'function' ? OmieRegras_contarPendentesPara_(v.data) : 0 }; // 16/11/2026: alçada de aprovação
  } catch (e) { return { ok: false, ver: false, poderes: {}, mensagem: 'Não foi possível conferir o acesso ao Financeiro.' }; }
}

function Omie_credenciais_() {
  var p = PropertiesService.getScriptProperties();
  var key = String(p.getProperty('OMIE_APP_KEY') || '').trim();
  var secret = String(p.getProperty('OMIE_APP_SECRET') || '').trim();
  if (!key || !secret) throw new Error('Configure a App Key e o App Secret em Administração → Chaves e senhas → Omie.');
  return { key: key, secret: secret };
}

// 14/11/2026: leituras (Listar, Consultar, Obter, Pesquisar) guardadas 60 s no servidor: o Omie só responde uma vez à mesma
// consulta por minuto. Conferências antes de gravar usam Omie_semCache_(fn) para ler o estado atual do Omie.
var OMIE_LEITURA = /^(Listar|Consultar|Obter|Pesquisar)/;
var OMIE_SEM_CACHE = false;
var OMIE_EM_ROTINA = false; // 16/11/2026: true enquanto a rotina da fotografia do Financeiro consulta o Omie
function Omie_semCache_(fn) { var antes = OMIE_SEM_CACHE; OMIE_SEM_CACHE = true; try { return fn(); } finally { OMIE_SEM_CACHE = antes; } }
/** Recusa do Omie sem execução (método ocupado, consulta repetida, limite): nada foi feito do lado do Omie. */
function Omie_erroNaoExecutado_(texto) { var e = new Error(texto); e.omieOpsPublica = true; e.omieFatSeguro = true; e.omieNaoExecutado = true; return e; }
function Omie_motivo_(j, c) {
  var m = String((j && (j.faultstring || j.description || j.message)) || '');
  [c.key, c.secret].forEach(function (s) { if (s) m = m.split(s).join('***'); });
  return m.replace(/^\s*ERROR:\s*/i, '').replace(/\s+/g, ' ').trim().slice(0, 220);
}
var OMIE_INTERVALO_MS = 5000;
// 15/11/2026: o Omie só responde à mesma consulta uma vez por minuto; a confirmação relê o título da prévia depois disso.
var OMIE_ESPERA_RECONSULTA_MS = 61000;
function Omie_faltaReconsulta_(desde) {
  var espera = typeof OMIE_ESPERA_RECONSULTA_MS === 'number' ? OMIE_ESPERA_RECONSULTA_MS : 0;
  return desde ? Math.max(0, Math.ceil((espera - (Date.now() - Number(desde))) / 1000)) : 0;
}
function Omie_msgReconsulta_(seg) { return 'Para conferir que o título não mudou desde a prévia, o Omie exige 1 minuto entre duas consultas do mesmo título. Nada foi enviado; toque em Confirmar de novo daqui a ' + seg + ' segundo(s). A prévia continua valendo.'; }
// 15/11/2026: páginas seguidas de ListarMovimentos passaram no Omie real sem recusa (resumo do mês e agenda): sem espera.
var OMIE_SEM_ESPACO = /^ListarMovimentos$/;
function Omie_aguardarVez_(chamada) {
  if (OMIE_SEM_ESPACO.test(chamada)) return;
  try {
    var cache = CacheService.getScriptCache(), chave = 'OMIE_ULT_' + chamada, agora = Date.now();
    var ultima = Number(cache.get(chave) || 0), espera = ultima ? ultima + OMIE_INTERVALO_MS - agora : 0;
    if (espera > OMIE_INTERVALO_MS) espera = OMIE_INTERVALO_MS;
    if (espera > 0) { Utilities.sleep(espera); agora = Date.now(); }
    cache.put(chave, String(agora), 120);
  } catch (e) {}
}
function Omie_requisitar_(caminho, chamada, parametro) {
  caminho = String(caminho || '').replace(/\/$/, '') + '/';
  if (!/^(financas|geral|produtos|servicos)\/[a-z0-9]+\/$/.test(caminho) || !/^[A-Za-z]+$/.test(chamada)) throw new Error('Operação Omie inválida.');
  var c = Omie_credenciais_(), leitura = OMIE_LEITURA.test(chamada), cache = null, chave = '';
  if (leitura) {
    try {
      cache = CacheService.getScriptCache();
      chave = 'OMIE_RESP_' + Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, c.key + '|' + caminho + '|' + chamada + '|' + JSON.stringify(parametro || {}), Utilities.Charset.UTF_8)
        .map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
      if (!OMIE_SEM_CACHE) { var guardado = cache.get(chave); if (guardado) return JSON.parse(guardado); }
    } catch (e) { cache = null; }
  }
  // Ritmo: o Omie recusa a chamada do mesmo método feita logo depois da anterior. Espera até OMIE_INTERVALO_MS desde a última
  // chamada deste método (registro compartilhado pelo servidor). Nada é repetido sozinho: repetir após a recusa piora (60 s).
  Omie_aguardarVez_(chamada);
  // 16/11/2026 (Onda 2, E3): marca que a TELA chamou o Omie agora. A rotina da fotografia diária (SGO_Financeiro_Foto.js) não
  // chama o Omie no expediente enquanto a tela da Wanessa estiver consultando (não disputa o mesmo método nem o limite).
  if (!OMIE_EM_ROTINA) { try { CacheService.getScriptCache().put('FIN_OMIE_TELA_EM', String(Date.now()), 600); } catch (eM) {} }
  for (var tentativa = 1; ; tentativa++) {
    var resp, http, j, texto;
    try {
      resp = UrlFetchApp.fetch('https://app.omie.com.br/api/v1/' + caminho, {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        payload: JSON.stringify({ call: chamada, app_key: c.key, app_secret: c.secret, param: [parametro || {}] })
      });
    } catch (e) { throw new Error('Não foi possível confirmar a resposta do Omie. Confira o resultado no Omie antes de repetir uma operação de gravação.'); }
    http = resp.getResponseCode(); texto = resp.getContentText();
    if (http === 425 || http === 429 || /too many requests/i.test(String(texto).slice(0, 300))) throw Omie_erroNaoExecutado_('O Omie limitou as chamadas desta conexão por alguns minutos (limite de consumo do Omie). Nada foi feito; aguarde e tente de novo.');
    try { j = JSON.parse(texto); } catch (e) { throw new Error('O Omie devolveu uma resposta inválida. Confira o resultado no Omie antes de repetir.'); }
    var motivo = j && (j.faultstring || j.faultcode) ? Omie_motivo_(j, c) : '';
    if (motivo && /^Listar/.test(chamada) && /não existem registros para a página|nao existem registros para a pagina/i.test(motivo)) {
      if (leitura && cache && chave) { try { cache.put(chave, '{}', 60); } catch (e3) {} } // 15/11/2026: lista vazia também fica 60 s
      return {};
    }
    if (motivo && /requisi[cç][aã]o desse m[eé]todo sendo executada/i.test(motivo)) {
      throw Omie_erroNaoExecutado_('O Omie estava ocupado com outra chamada do mesmo tipo e não executou esta. Nada foi feito; aguarde um minuto e tente de novo.');
    }
    if (motivo && /redundan|j[aá] (foi|est[aá]) (feita|realizada|sendo)|consumo indevido|aguarde \d+ segundos/i.test(motivo)) {
      throw Omie_erroNaoExecutado_('O Omie só responde à mesma consulta uma vez por minuto. Nada foi feito; aguarde um minuto e tente de novo.');
    }
    if (http < 200 || http >= 300 || !j || j.faultstring || j.faultcode || j.fatal || j.code && j.description) {
      var e = new Error('O Omie recusou a operação' + (motivo ? ': ' + motivo : '. Confira as chaves, as permissões e os dados no Omie.'));
      e.omieOpsPublica = true; e.omieFatSeguro = true;
      // 16/11/2026 (B5): recusa com motivo e código de erro de cliente (validação: categoria, cliente, campo) = o Omie respondeu e
      // NADA foi feito. Sem resposta legível, sem motivo ou erro do servidor do Omie continua "incerto" (pode ter sido processado).
      if (motivo && /client/i.test(String(j.faultcode || ''))) e.omieRecusado = true;
      throw e;
    }
    if (leitura && cache && chave) { try { var s = JSON.stringify(j); if (s.length < 90000) cache.put(chave, s, 60); } catch (e2) {} }
    return j;
  }
}

/** 16/11/2026: esquece a leitura guardada de uma consulta (depois de gravar algo que muda a resposta, como um cadastro novo). */
function Omie_esquecerLeitura_(caminho, chamada, parametro) {
  try {
    var c = Omie_credenciais_(); caminho = String(caminho || '').replace(/\/$/, '') + '/';
    var chave = 'OMIE_RESP_' + Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, c.key + '|' + caminho + '|' + chamada + '|' + JSON.stringify(parametro || {}), Utilities.Charset.UTF_8)
      .map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
    CacheService.getScriptCache().remove(chave);
  } catch (e) {}
}

// 14/11/2026: situação do título (filtrar_por_status, valores conferidos no Omie real) ou todos com os mais recentes primeiro.
var OMIE_SITUACOES = { ATRASADO: 'Vencidos', VENCEHOJE: 'Vencem hoje', AVENCER: 'A vencer', '': 'Todos (mais recentes primeiro)' };
function Omie_filtroSituacao_(param, situacao) {
  situacao = String(situacao == null ? 'ATRASADO' : situacao).toUpperCase();
  if (!Object.prototype.hasOwnProperty.call(OMIE_SITUACOES, situacao)) throw new Error('Escolha a situação dos títulos.');
  if (situacao) param.filtrar_por_status = situacao; else { param.ordenar_por = 'CODIGO'; param.ordem_descrescente = 'S'; }
  return param;
}
function Omie_consultar_(tipo, pagina, tamanho, situacao) {
  var servicos = {
    pagar: { caminho: 'contapagar', chamada: 'ListarContasPagar', lista: 'conta_pagar_cadastro' },
    receber: { caminho: 'contareceber', chamada: 'ListarContasReceber', lista: 'conta_receber_cadastro' }
  };
  var s = servicos[tipo];
  if (!s) throw new Error('Escolha contas a pagar ou contas a receber.');
  var param = { pagina: pagina, registros_por_pagina: tamanho, apenas_importado_api: 'N' };
  if (situacao !== undefined) Omie_filtroSituacao_(param, situacao);
  var j = Omie_requisitar_('financas/' + s.caminho + '/', s.chamada, param);
  if (!Object.keys(j).length) return { itens: [], pagina: pagina, paginas: 0, total: 0 };
  if (!Array.isArray(j[s.lista])) throw new Error('A resposta do Omie não contém a lista esperada. Tente novamente.');
  return {
    pagina: pagina, paginas: Number(j.total_de_paginas) || 0, total: Number(j.total_de_registros) || 0,
    itens: j[s.lista].map(function (i) {
      // Lista explícita: não repassar a resposta do provedor ao navegador.
      return { id: String(i.codigo_lancamento_omie || ''), documento: String(i.numero_documento || i.numero_documento_fiscal || ''),
        pessoaId: String(i.codigo_cliente_fornecedor || ''), vencimento: String(i.data_vencimento || ''),
        valor: Number(i.valor_documento) || 0, situacao: String(i.status_titulo || 'Não informada') };
    })
  };
}

function Omie_apiListar(sessionId, payload) {
  try {
    Omie_exigirAcesso_(sessionId);
    var p = payload || {}, pagina = p.pagina === undefined ? 1 : Number(p.pagina);
    if (!isFinite(pagina) || pagina < 1 || pagina > 100000 || Math.floor(pagina) !== pagina) throw new Error('Página inválida.');
    var r = Omie_consultar_(String(p.tipo || 'receber'), pagina, 50, p.situacao === undefined ? 'ATRASADO' : p.situacao);
    Omie_comNomes_(r.itens, 'pessoaId', 'pessoa'); // 15/11/2026: nome do cliente ou fornecedor no lugar do código do Omie
    r.ok = true;
    return r;
  } catch (e) { return { ok: false, mensagem: e.message }; }
}

function Omie_testarConexao_() {
  try {
    Omie_consultar_('receber', 1, 1);
    Omie_consultar_('pagar', 1, 1);
    return { funcionou: true, texto: 'Funcionou: o Omie autorizou a consulta de contas a pagar e a receber.' };
  } catch (e) { return { funcionou: false, texto: e.message }; }
}

/** 15/11/2026: põe o nome do cadastro do Omie em cada item (campoId = código do cliente/fornecedor). Sem os nomes, a lista segue. */
function Omie_comNomes_(itens, campoId, campoNome) {
  var cods = [];
  (itens || []).forEach(function (i) { var c = Number(i[campoId]); if (c > 0 && cods.indexOf(c) < 0) cods.push(c); });
  var nomes = cods.length ? Omie_nomesClientes_(cods) : {};
  (itens || []).forEach(function (i) { i[campoNome] = nomes[String(Number(i[campoId]))] || ''; });
  return itens;
}
/** { códigoOmie: nome } pelo cadastro do Omie, 50 códigos por chamada. Falha nos nomes não derruba a lista. */
function Omie_nomesClientes_(codigos) {
  var nomes = {};
  for (var k = 0; k < codigos.length; k += 50) {
    try {
      var c = Omie_requisitar_('geral/clientes/', 'ListarClientes', { pagina: 1, registros_por_pagina: 50, apenas_importado_api: 'N',
        clientesPorCodigo: codigos.slice(k, k + 50).map(function (x) { return { codigo_cliente_omie: x }; }) });
      (c.clientes_cadastro || []).forEach(function (x) { nomes[String(x.codigo_cliente_omie)] = String(x.nome_fantasia || x.razao_social || '').slice(0, 120); });
    } catch (e) { break; }
  }
  return nomes;
}
