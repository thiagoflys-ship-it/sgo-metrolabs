/****************************************************
 * MÓDULO REPRESENTAÇÃO — DOCUMENTOS A4 POR PERFIL (29/10/2026)
 *
 * Pedido do dono (29/10/2026): "Relatório: como ficou a Brasmedical, o cliente e a Metrolabs [...] sempre gerar HTML A4,
 * salvar documentos gerados, fazer índice, gráfico, linha do tempo [...] documentos com fotos para cada perfil".
 *
 * Um motor só, três públicos (REPD_PUBLICOS). O que cada público lê sai de RepD_visao_ (atendimento) e de
 * RepD_visaoPeriodo_ (período); o desenho A4 só recebe o que já foi filtrado:
 *  - REPRESENTADA: eventos PUBLICO = REPRESENTADA ou SIM, conversa sem nota interna, anexos dela, fotos liberadas
 *    (ATEC_FOTOS.PUBLICO = REPRESENTADA ou SIM), marcos previsto x realizado. Nunca nota interna, valor ou outra representada.
 *  - CLIENTE: as 5 etapas do portal, eventos PUBLICO = SIM, visita, serviço, peças sem valor, fotos PUBLICO = SIM.
 *    Nunca a conversa com a representada, o nome da representada, prazos internos, valores; do técnico, só o nome.
 *  - INTERNO (Metrolabs): tudo o da representada + notas internas, prazos e SLA em horas úteis, primeiro contato,
 *    deslocamento e histórico de reincidência do equipamento.
 * Moldura: SGO_Documentos_RelatorioA4.js (RelA4_*: capa, sumário com páginas, seções, tabelas e figuras numeradas,
 * gráficos SVG) sobre SGO_DocA4.js. Gravação: SGO_DocSalvar_salvarHtmlEPdf_ (HTML + PDF), nunca sobrescreve (versão nova
 * a cada emissão, revisão no cabeçalho). Registro: REP_DOCUMENTOS (quem pode abrir = PUBLICO + REPRESENTADA_ID /
 * CLIENTE_ID); a versão do cliente de um chamado também entra no Arquivo de documentos (DOC_DOCUMENTOS) do equipamento.
 * Fotos: só as liberadas (RepD_liberarFoto_); a tela da Metrolabs manda uma cópia reduzida (lado maior 1000 px, JPEG),
 * guardada em ATEC_FOTOS.RELATORIO_ARQUIVO_ID, para o A4 não ficar pesado.
 * Nenhuma função devolve Date cru.
 ****************************************************/

var REPD_ABA = 'REP_DOCUMENTOS';
var REPD_PUBLICOS = { INTERNO: 'Metrolabs (uso interno)', REPRESENTADA: 'Representada', CLIENTE: 'Cliente' };
/** Nome da versão nas mensagens e no histórico. */
var REPD_VERSAO_TXT = { INTERNO: 'versão interna da Metrolabs', REPRESENTADA: 'versão da representada', CLIENTE: 'versão do cliente' };
var REPD_FOTO_LIBERACAO = { '': 'Não liberada (só a Metrolabs vê)', REPRESENTADA: 'Liberada à representada', SIM: 'Liberada ao cliente e à representada' };
/** Fotos por documento e tamanho máximo de cada uma no A4 (acima disso, só com a cópia reduzida da liberação). */
var REPD_MAX_FOTOS = 12;
var REPD_FOTO_MAX_BYTES = 450 * 1024;
var REPD_PASTA = 'Representação - Relatórios';
var REPD_COR_PRAZO = { NO_PRAZO: '#1f5fa8', EM_RISCO: '#c98a12', VENCIDO: '#a61b1b', PAUSADO: '#7b8794', CUMPRIDO: '#1d6b3f', FORA_DO_PRAZO: '#b45309', SEM_PRAZO: '#7b8794' };
var REPD_NOME_PRAZO = { NO_PRAZO: 'No prazo', EM_RISCO: 'Em risco', VENCIDO: 'Vencido', PAUSADO: 'Pausado', CUMPRIDO: 'Concluído no prazo', FORA_DO_PRAZO: 'Concluído fora do prazo', SEM_PRAZO: 'Sem prazo' };
var REPD_COR_ETAPA_CLIENTE = { 0: '#7b8794', 1: '#7b8794', 2: '#c98a12', 3: '#1f5fa8', 4: '#0f8b8d', 5: '#1d6b3f' };

// ------------------------------------------------------------
// APOIO
// ------------------------------------------------------------
function RepD_s_(v) { return Ast_s_(v); }
function RepD_br_(ms) { return ms === null || ms === undefined || !isFinite(ms) ? '' : Ast_br_(Ast_agora_(ms)); }
function RepD_dia_(ms) { return RepD_br_(ms).slice(0, 10); }
/** Minutos úteis -> "45 min úteis", "3,5 h úteis" ou "2,1 dias úteis" (o mesmo texto do painel). */
function RepD_tempo_(min) {
  if (min === null || min === undefined || !isFinite(min)) return '—';
  var dia = RepP_minDia_();
  if (min < 60) return RelA4_num_(min, 0) + ' min úteis';
  if (min <= dia) return RelA4_num_(min / 60, 1) + ' h úteis';
  return RelA4_num_(min / dia, 1) + ' dias úteis';
}
function RepD_pct_(v) { return v === null || v === undefined ? '—' : RelA4_num_(v, 1) + '%'; }
function RepD_ehImagem_(mime) { return /^image\/(png|jpe?g|webp|gif)$/i.test(RepD_s_(mime)); }

/** Tabela de registro dos documentos gerados (criada por Rep_garantirAbas_, REP_COLUNAS). */
function RepD_registros_() { return Rep_ler_(REPD_ABA); }
function RepD_publicoDoc_(r) {
  var htmlId = RepD_s_(r.HTML_ID), pdfId = RepD_s_(r.PDF_ID);
  return { id: RepD_s_(r.ID), tipo: Rep_up_(r.TIPO), tipoNome: Rep_up_(r.TIPO) === 'PERIODO' ? 'Relatório do período' : 'Relatório do atendimento', publico: Rep_up_(r.PUBLICO),
    publicoNome: REPD_PUBLICOS[Rep_up_(r.PUBLICO)] || '', numero: RepD_s_(r.NUMERO), versao: Number(r.VERSAO) || 1, titulo: RepD_s_(r.TITULO), chamadoNumero: RepD_s_(r.CHAMADO_NUMERO),
    periodo: RepD_s_(r.PERIODO_DE) ? RepD_s_(r.PERIODO_DE) + ' a ' + RepD_s_(r.PERIODO_ATE) : '', fotos: Number(r.FOTOS) || 0, paginas: Number(r.PAGINAS) || 0,
    htmlUrl: htmlId ? '/arquivos/' + htmlId : '', pdfUrl: pdfId ? '/arquivos/' + pdfId : '', por: RepD_s_(r.GERADO_POR_NOME), em: Ast_br_(r.EM) };
}

// ------------------------------------------------------------
// COLETA DO CHAMADO (tudo; o filtro por público vem depois)
// ------------------------------------------------------------
function RepD_coletar_(c, agoraMs) {
  var sol = RepD_s_(c.SOLICITACAO_ID) ? Ast_porId_(AST_ABAS.SOLICITACOES, c.SOLICITACAO_ID) : null;
  var oss = Ast_ler_(AST_ABAS.OS).filter(function (o) { return RepD_s_(o.CHAMADO_ID) === RepD_s_(c.ID) && Ast_up_(o.SITUACAO) !== 'CANCELADA'; })
    .sort(function (a, b) { return String(a.AGENDADO_PARA || a.CRIADO_EM).localeCompare(String(b.AGENDADO_PARA || b.CRIADO_EM)); });
  var os = (RepD_s_(c.OS_ID) ? oss.filter(function (o) { return RepD_s_(o.ID) === RepD_s_(c.OS_ID); })[0] : null) || oss[oss.length - 1] || null;
  var eq = Ast_mapa_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS)[RepD_s_(c.EQUIPAMENTO_ID)] || {}, cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[RepD_s_(c.CLIENTE_ID)] || {};
  var un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[RepD_s_(c.UNIDADE_ID)] || {}, rep = RepD_s_(c.REPRESENTADA_ID) ? Rep_representada_(c.REPRESENTADA_ID) : null;
  var osIds = {}; oss.forEach(function (o) { osIds[RepD_s_(o.ID)] = true; });
  var refs = { CHAMADO: {}, SOLICITACAO: {} }; refs.CHAMADO[RepD_s_(c.ID)] = true; if (sol) refs.SOLICITACAO[RepD_s_(sol.ID)] = true;
  var daRef = function (tipo, id) { tipo = Ast_up_(tipo); id = RepD_s_(id); return (tipo === 'OS' && osIds[id]) || !!(refs[tipo] && refs[tipo][id]); };
  var eventos = Ast_ler_(AST_ABAS.EVENTOS).filter(function (e) { return daRef(e.ENTIDADE, e.ENTIDADE_ID); }).sort(function (a, b) { return String(a.EM).localeCompare(String(b.EM)); });
  var mensagens = rep ? Rep_ler_(REP_ABAS.MENSAGENS).filter(function (m) { return RepD_s_(m.REPRESENTADA_ID) === RepD_s_(rep.ID) && daRef(m.REF_TIPO, m.REF_ID); }).sort(function (a, b) { return String(a.EM).localeCompare(String(b.EM)); }) : [];
  var anexos = rep ? Rep_ler_(REP_ABAS.ANEXOS).filter(function (a) { return RepD_s_(a.REPRESENTADA_ID) === RepD_s_(rep.ID) && daRef(a.REF_TIPO, a.REF_ID); }) : [];
  var fotos = Ast_ler_(AST_ABAS.FOTOS).filter(function (f) { return osIds[RepD_s_(f.OS_ID)] && Ast_up_(f.ATIVA || 'SIM') !== 'NAO'; })
    .sort(function (a, b) { return String(a.TIRADA_EM || a.RECEBIDA_EM).localeCompare(String(b.TIRADA_EM || b.RECEBIDA_EM)); });
  var pecas = os ? AstO_pecas_(os.ID) : [];
  var ctx = RepP_ctx_(agoraMs), ciclo = RepP_ciclo_(sol, c, ctx);
  var historico = Ast_ler_(AST_ABAS.CHAMADOS).filter(function (x) { return RepD_s_(c.EQUIPAMENTO_ID) && RepD_s_(x.EQUIPAMENTO_ID) === RepD_s_(c.EQUIPAMENTO_ID) && RepD_s_(x.ID) !== RepD_s_(c.ID) && Ast_up_(x.SITUACAO) !== 'CANCELADO'; })
    .sort(function (a, b) { return String(b.ABERTO_EM).localeCompare(String(a.ABERTO_EM)); });
  return { c: c, sol: sol, os: os, oss: oss, eq: eq, cli: cli, un: un, rep: rep, eventos: eventos, mensagens: mensagens, anexos: anexos, fotos: fotos, pecas: pecas,
    ciclo: ciclo, marcos: RepP_marcos_(ciclo), sla: Ast_slaEstado_(c, agoraMs), historico: historico, agoraMs: agoraMs };
}

// ------------------------------------------------------------
// VISÃO POR PÚBLICO (o único lugar que decide o que cada um lê)
// ------------------------------------------------------------
/** A foto entra no documento deste público? INTERNO: todas; REPRESENTADA: REPRESENTADA ou SIM; CLIENTE: só SIM. */
function RepD_fotoVisivel_(f, publico) {
  var p = Ast_up_(f.PUBLICO);
  return publico === 'INTERNO' || (publico === 'REPRESENTADA' && (p === 'SIM' || p === 'REPRESENTADA')) || (publico === 'CLIENTE' && p === 'SIM');
}
/** O evento entra na linha do tempo deste público? (ATEC_EVENTOS.PUBLICO: '' interno, REPRESENTADA, SIM) */
function RepD_eventoVisivel_(e, publico) {
  var p = Ast_up_(e.PUBLICO);
  return publico === 'INTERNO' || (publico === 'REPRESENTADA' && (p === 'SIM' || p === 'REPRESENTADA')) || (publico === 'CLIENTE' && p === 'SIM');
}

/** Versão do cliente: tira do texto o enquadramento comercial pretendido pela representada (garantia ou não), que é assunto dela com a Metrolabs. */
function RepD_semEnquadramento_(t) { return RepD_s_(t).replace(/\n?\s*Enquadramento pretendido:[^\n]*/gi, '').trim(); }

function RepD_visao_(D, publico) {
  var c = D.c, os = D.os || {}, eq = D.eq, cli = D.cli, un = D.un, rep = D.rep, sol = D.sol, interno = publico === 'INTERNO', cliente = publico === 'CLIENTE';
  var repNome = rep ? RepD_s_(rep.NOME) : '';
  var sit = Ast_up_(c.SITUACAO), pc = AstC_publicoCliente_(c, D.os), etRep = Rep_etapaChamado_(c);
  var concluidoMs = D.ciclo.conclusaoMs !== null && D.ciclo.conclusaoMs !== undefined ? D.ciclo.conclusaoMs : Ast_ms_(c.ENCERRADO_EM);
  var V = { publico: publico, publicoNome: REPD_PUBLICOS[publico], chamadoId: RepD_s_(c.ID), numero: RepD_s_(c.NUMERO), representadaId: rep ? RepD_s_(rep.ID) : '', clienteId: RepD_s_(c.CLIENTE_ID),
    unidadeId: RepD_s_(c.UNIDADE_ID), equipamentoId: RepD_s_(c.EQUIPAMENTO_ID), clienteNome: RepD_s_(c.CLIENTE_NOME) || Ast_clienteNome_(cli),
    representadaNome: cliente ? '' : repNome, protocolo: cliente ? '' : RepD_s_(c.PROTOCOLO_REPRESENTADA), encerrado: sit === 'ENCERRADO' || sit === 'RESOLVIDO_REMOTO', cancelado: sit === 'CANCELADO',
    etapaNome: cliente ? pc.etapaNome : interno ? (AST_SITUACOES[sit] || sit) + (rep ? ' (a representada vê: ' + etRep.nome + ')' : '') : etRep.nome,
    abertoEm: Ast_br_(c.ABERTO_EM), enviadoEm: RepD_br_(D.ciclo.enviadoMs), concluidoEm: RepD_br_(concluidoMs), agoraMs: D.agoraMs };
  // tipo e modelo sem repetir a palavra ("LAVADORA · LAVADORA ULTRASSÔNICA 10 L" vira "LAVADORA ULTRASSÔNICA 10 L")
  var eqTipo = RepD_s_(eq.TIPO), eqModelo = RepD_s_(eq.MODELO);
  V.equipamentoTexto = (eqTipo && eqModelo && eqModelo.toUpperCase().indexOf(eqTipo.toUpperCase()) === 0 ? eqModelo : [eqTipo, eqModelo].filter(Boolean).join(' · ')) || RepD_s_(c.EQUIPAMENTO_TEXTO);
  V.serie = RepD_s_(eq.SERIE);
  // cliente e equipamento
  V.identCliente = [['Cliente', V.clienteNome, { largo: true }], ['CNPJ', RepD_s_(cli.CNPJ)], ['Unidade', RepD_s_(c.UNIDADE_NOME) || RepD_s_(un.NOME_UNIDADE)],
    ['Cidade/UF', [RepD_s_(un.CIDADE), RepD_s_(un.UF)].filter(Boolean).join('/')], ['Setor', RepD_s_(eq.SETOR) || (sol ? RepD_s_(sol.SETOR) : '')]];
  if (!cliente && rep) V.identCliente.push(['Representada', repNome], ['Protocolo da representada', V.protocolo]);
  var gar = RepD_s_(eq.ID) ? Rep_garantia_(eq) : null;
  V.identEquip = [['Equipamento', V.equipamentoTexto, { largo: true }], ['Nº de série', V.serie], ['TAG', RepD_s_(eq.TAG)]];
  if (!cliente) {
    if (RepD_s_(eq.FABRICANTE)) V.identEquip.push(['Fabricante', RepD_s_(eq.FABRICANTE)]);
    V.identEquip.push(['Garantia', gar ? gar.texto : '—']);
    if (RepD_s_(eq.DATA_INSTALACAO)) V.identEquip.push(['Instalação', RelA4_dataBr_(eq.DATA_INSTALACAO)]);
    if (RepD_s_(eq.NF_VENDA_NUMERO)) V.identEquip.push(['Nota fiscal de venda', RepD_s_(eq.NF_VENDA_NUMERO) + (RepD_s_(eq.NF_VENDA_DATA) ? ' de ' + RelA4_dataBr_(eq.NF_VENDA_DATA) : '')]);
  }
  // relato da abertura
  var rel = sol ? Rep_json_(sol.RELATO_JSON, {}) || {} : {};
  V.relato = [['Problema relatado', cliente ? RepD_semEnquadramento_(c.SINTOMA || rel.sintoma) : RepD_s_(c.SINTOMA) || RepD_s_(rel.sintoma), { largo: true }], ['Situação do equipamento', REP_PARADA[Ast_up_(c.PARADA)] || AST_PARADA[Ast_up_(c.PARADA)] || '']];
  if (!cliente) {
    if (rel.inicio) V.relato.push(['Desde quando', RepD_s_(rel.inicio)]);
    V.relato.push(['Código de erro', rel.naoExibe ? 'O equipamento não exibe código' : RepD_s_(rel.codigoErro)]);
    if (rel.risco) V.relato.push(['Risco de continuar usando', RepD_s_(rel.risco)]);
    if (rel.tentado) V.relato.push(['O que já foi tentado', RepD_s_(rel.tentado)]);
    if (rel.enquadramento || RepD_s_(c.ENQUADRAMENTO_PRETENDIDO)) V.relato.push(['Enquadramento pretendido', REP_ENQUADRAMENTO[Ast_up_(rel.enquadramento || c.ENQUADRAMENTO_PRETENDIDO)] || '']);
    if (sol) V.relato.push(['Contato no local', [RepD_s_(sol.CONTATO_NOME), RepD_s_(sol.CONTATO_TELEFONE), RepD_s_(sol.CONTATO_EMAIL)].filter(Boolean).join(' · '), { largo: true }],
      ['Pedido', RepD_s_(sol.NUMERO) + ' · enviado em ' + Ast_br_(sol.CRIADO_EM) + (RepD_s_(sol.POR_NOME) ? ' por ' + RepD_s_(sol.POR_NOME) : ''), { largo: true }]);
    if (sol && RepD_s_(sol.COMPLEMENTO_PERGUNTA)) V.relato.push(['Complemento pedido pela Metrolabs', RepD_s_(sol.COMPLEMENTO_PERGUNTA), { largo: true }], ['Resposta da representada', RepD_s_(sol.COMPLEMENTO_RESPOSTA) || '—', { largo: true }]);
  } else V.relato.push(['Aberto em', V.abertoEm]);
  // as 5 etapas do portal do cliente (com o que já aconteceu)
  if (cliente) {
    var quando = { 1: Ast_ms_(c.ABERTO_EM), 2: Ast_ms_(c.TRIAGEM_INICIO_EM), 3: Ast_ms_(c.AGENDADO_PARA), 4: Ast_ms_(os.CHEGOU_EM), 5: concluidoMs };
    V.etapasCliente = AST_ETAPAS_CLIENTE.map(function (e) { return { n: e.etapa, nome: e.nome, feita: pc.etapa >= e.etapa, quando: pc.etapa >= e.etapa || e.etapa === 3 ? RepD_br_(quando[e.etapa]) : '' }; });
    V.etapaClienteAtual = pc.etapa;
  }
  // linha do tempo (só o que o público pode ler)
  var chave = repNome ? '(' + Rep_up_(repNome) + ')' : '';
  V.linha = D.eventos.filter(function (e) { return RepD_eventoVisivel_(e, publico); }).map(function (e) {
    var nome = RepD_s_(e.USUARIO_NOME), por = interno ? (nome || 'Sistema') : cliente ? 'Metrolabs' : (chave && Rep_up_(nome).indexOf(chave) >= 0 && RepD_s_(e.USUARIO_ID) ? nome : 'Metrolabs');
    var t = RepD_s_(e.TEXTO) || [AST_SITUACOES[Ast_up_(e.DE)] || RepD_s_(e.DE), AST_SITUACOES[Ast_up_(e.PARA)] || RepD_s_(e.PARA)].filter(Boolean).join(' → ');
    return { emMs: Ast_ms_(e.EM), em: Ast_br_(e.EM), texto: (cliente ? RepD_semEnquadramento_(t) : t).slice(0, 300), por: por, interno: interno && !Ast_up_(e.PUBLICO) };
  });
  // marcos previsto x realizado (representada e Metrolabs; o cliente não lê prazos internos)
  V.marcos = cliente ? [] : D.marcos;
  // visita e atendimento
  V.visita = [];
  if (D.os) {
    var dur = Ast_ms_(os.CHEGOU_EM) !== null && Ast_ms_(os.CONCLUIU_EM) !== null ? Ast_duracaoTxt_((Ast_ms_(os.CONCLUIU_EM) - Ast_ms_(os.CHEGOU_EM)) / 60000) : '';
    V.visita = [['Ordem de serviço', RepD_s_(os.NUMERO)], ['Tipo de serviço', RepD_s_(os.TIPO_NOME)], ['Técnico', RepD_s_(os.TECNICO_NOME)], ['Agendado para', Ast_br_(os.AGENDADO_PARA)],
      ['Chegada', Ast_br_(os.CHEGOU_EM)], ['Conclusão', Ast_br_(os.CONCLUIU_EM)], ['Tempo no local', dur]];
    if (interno) {
      var saiu = Ast_ms_(os.SAIU_EM), chegou = Ast_ms_(os.CHEGOU_EM);
      V.visita.push(['Saída para o local', Ast_br_(os.SAIU_EM)], ['Deslocamento', saiu !== null && chegou !== null ? Ast_duracaoTxt_((chegou - saiu) / 60000) : '—'],
        ['Equipamento conferido por', { QR: 'leitura do QR', SERIE: 'número de série', TAG: 'TAG' }[Ast_up_(os.IDENTIFICADO_POR)] || '—'], ['Observação da localização', RepD_s_(os.OBS_LOCALIZACAO) || '—', { largo: true }]);
      if (D.oss.length > 1) V.visita.push(['Outras visitas do chamado', D.oss.filter(function (o) { return o !== D.os; }).map(function (o) { return RepD_s_(o.NUMERO) + ' (' + (AST_OS_SITUACOES[Ast_up_(o.SITUACAO)] || o.SITUACAO) + ')'; }).join(', '), { largo: true }]);
    }
    V.visita.push(['Situação da O.S.', AST_OS_SITUACOES[Ast_up_(os.SITUACAO)] || RepD_s_(os.SITUACAO)]);
  } else if (Ast_ms_(c.AGENDADO_PARA) !== null) V.visita = [['Visita agendada para', Ast_br_(c.AGENDADO_PARA)], ['Técnico', RepD_s_(c.TECNICO_NOME)]];
  // diagnóstico e serviço
  V.servico = [['Condição encontrada', os.CONDICAO_ENCONTRADA], ['Causa ou diagnóstico', os.CAUSA], ['Serviço realizado', os.SERVICO_REALIZADO], ['Teste funcional', os.TESTE_FUNCIONAL], ['Recomendações', os.RECOMENDACOES]]
    .concat(interno ? [['Relato do técnico', os.RELATO], ['Orientação remota', c.ORIENTACAO_REMOTA]] : []).filter(function (x) { return RepD_s_(x[1]); }).map(function (x) { return [x[0], RepD_s_(x[1])]; });
  // peças (sem valor em nenhuma versão)
  V.pecas = D.pecas.map(function (p) {
    var q = Number(p.QUANTIDADE) || 0;
    return [RepD_s_(p.DESCRICAO), RepD_s_(p.CODIGO), Ast_fmtNum_(q, Math.round(q) === q ? 0 : 2) + ' ' + RepD_s_(p.UNIDADE), Ast_up_(p.SITUACAO) === 'FALTA' ? 'Em falta' + (interno && RepD_s_(p.REQUISICAO_NUMERO) ? ' (pedido ' + RepD_s_(p.REQUISICAO_NUMERO) + ')' : '') : 'Aplicada'];
  });
  // fotos liberadas (e as da representada, só para ela e para a Metrolabs)
  // momento da foto pela hora em que foi tirada e a janela da visita (chegada e conclusão da O.S.); sem a hora, só "Atendimento"
  var chegouMs = Ast_ms_(os.CHEGOU_EM), concluiuMs = Ast_ms_(os.CONCLUIU_EM);
  var momento = function (ms) {
    if (ms === null || ms === undefined || chegouMs === null) return 'Atendimento técnico';
    if (ms < chegouMs) return 'Antes da visita';
    return concluiuMs !== null && ms > concluiuMs ? 'Depois do serviço' : 'Durante a visita';
  };
  V.fotos = D.fotos.filter(function (f) { return RepD_fotoVisivel_(f, publico); }).map(function (f) {
    var ms = Ast_ms_(f.TIRADA_EM || f.RECEBIDA_EM);
    return { arquivoId: RepD_s_(f.RELATORIO_ARQUIVO_ID) || RepD_s_(f.ARQUIVO_ID), reduzida: !!RepD_s_(f.RELATORIO_ARQUIVO_ID), legenda: RepD_s_(f.LEGENDA) || 'Foto do atendimento',
      em: Ast_br_(f.TIRADA_EM || f.RECEBIDA_EM), por: RepD_s_(f.POR_NOME) || RepD_s_(os.TECNICO_NOME), origem: 'Metrolabs', momento: momento(ms), liberacao: interno ? REPD_FOTO_LIBERACAO[Ast_up_(f.PUBLICO)] || REPD_FOTO_LIBERACAO[''] : '' };
  });
  if (!cliente) D.anexos.filter(function (a) { return (interno || Ast_up_(a.PUBLICO) === 'REPRESENTADA') && Ast_up_(a.POR_LADO) === 'REPRESENTADA' && RepD_ehImagem_(a.MIME); }).forEach(function (a) {
    V.fotos.push({ arquivoId: RepD_s_(a.ARQUIVO_ID), reduzida: false, legenda: REP_TIPOS_ANEXO[Ast_up_(a.TIPO)] || 'Foto enviada pela representada', em: Ast_br_(a.EM), por: RepD_s_(a.POR_NOME), origem: 'Representada', momento: 'Abertura do pedido', liberacao: interno ? 'Enviada pela representada' : '' });
  });
  // as da abertura (representada) vêm antes das do atendimento
  V.fotos.sort(function (a, b) { return (a.origem === 'Representada' ? 0 : 1) - (b.origem === 'Representada' ? 0 : 1); });
  V.fotosTotal = V.fotos.length;
  V.fotosNaoLiberadas = interno ? 0 : D.fotos.filter(function (f) { return !RepD_fotoVisivel_(f, publico); }).length;
  // conversa e notas internas
  V.conversa = cliente ? [] : D.mensagens.filter(function (m) { return Ast_up_(m.INTERNA) !== 'SIM'; }).map(function (m) {
    return { em: Ast_br_(m.EM), autor: Ast_up_(m.AUTOR_LADO) === 'METROLABS' ? (interno ? RepD_s_(m.AUTOR_NOME) + ' (Metrolabs)' : 'Metrolabs · ' + RepD_s_(m.AUTOR_NOME)) : RepD_s_(m.AUTOR_NOME), texto: RepD_s_(m.TEXTO) };
  });
  V.notasInternas = interno ? D.mensagens.filter(function (m) { return Ast_up_(m.INTERNA) === 'SIM'; }).map(function (m) { return { em: Ast_br_(m.EM), autor: RepD_s_(m.AUTOR_NOME), texto: RepD_s_(m.TEXTO) }; })
    .concat(D.eventos.filter(function (e) { return !Ast_up_(e.PUBLICO) && /OBSERVA|CONTATO|NOTA/.test(Ast_up_(e.TIPO)); }).map(function (e) { return { em: Ast_br_(e.EM), autor: RepD_s_(e.USUARIO_NOME) || 'Sistema', texto: RepD_s_(e.TEXTO) }; })) : [];
  // documentos anexos
  V.anexos = cliente ? [] : D.anexos.filter(function (a) { return interno || Ast_up_(a.PUBLICO) === 'REPRESENTADA'; }).map(function (a) {
    return [REP_TIPOS_ANEXO[Ast_up_(a.TIPO)] || RepD_s_(a.TIPO), RepD_s_(a.NOME), RepD_s_(a.POR_NOME), Ast_br_(a.EM)].concat(interno ? [Ast_up_(a.PUBLICO) === 'REPRESENTADA' ? 'Representada vê' : 'Só Metrolabs'] : []);
  });
  V.relatorioOs = D.os && Ast_up_(os.SITUACAO) === 'ENCERRADA' && RepD_s_(os.RELATORIO_PDF_ID) ? { numero: RepD_s_(os.NUMERO), em: Ast_br_(os.RELATORIO_EM) } : null;
  // assinatura e aceite
  V.assinatura = D.os && (RepD_s_(os.ASSINATURA_NOME) || RepD_s_(os.SEM_ASSINATURA_MOTIVO) || RepD_s_(os.ASSINATURA_ARQUIVO_ID)) ? { nome: RepD_s_(os.ASSINATURA_NOME) || RepD_s_(os.SEM_ASSINATURA_RECEBIDO_POR),
    documento: RepD_s_(os.ASSINATURA_DOCUMENTO), em: Ast_br_(os.ASSINATURA_EM), arquivoId: RepD_s_(os.ASSINATURA_ARQUIVO_ID), sem: RepD_s_(os.SEM_ASSINATURA_MOTIVO) ? (AST_MOTIVOS_SEM_ASSINATURA[Ast_up_(os.SEM_ASSINATURA_MOTIVO)] || RepD_s_(os.SEM_ASSINATURA_MOTIVO)) : '',
    tecnico: RepD_s_(os.TECNICO_NOME) } : null;
  // só a Metrolabs: prazos e SLA, primeiro contato, histórico do equipamento
  if (interno) {
    var x = D.ciclo;
    V.prazos = [['Prioridade', AST_PRIORIDADES[Ast_up_(c.PRIORIDADE)] || RepD_s_(c.PRIORIDADE)], ['Prazo de atendimento (contrato)', Number(c.SLA_MIN_UTEIS) ? RepD_tempo_(Number(c.SLA_MIN_UTEIS)) + ' (' + (RepD_s_(c.SLA_FONTE) || 'padrão') + ')' : '—'],
      ['Situação do prazo', D.sla.texto || '—'], ['Prazo até', Ast_br_(D.sla.ate) || '—'],
      ['Aceite do pedido', x.aceiteMin === null ? '—' : RepD_tempo_(x.aceiteMin) + ' (prazo ' + RepD_tempo_(x.aceitePrazoMin) + ', ' + (x.aceiteNoPrazo ? 'no prazo' : 'fora do prazo') + ')'],
      ['Primeiro contato', x.primeiroContatoMin === null || x.primeiroContatoMin === undefined ? 'Sem registro' : RepD_tempo_(x.primeiroContatoMin) + ' depois do aceite (prazo ' + RepD_tempo_(x.primeiroContatoPrazoMin) + ')'],
      ['Do envio à visita', RepD_tempo_(x.visitaMin)], ['Do envio à conclusão', RepD_tempo_(x.conclusaoMin)], ['Pausa (complemento da representada)', x.pausaMin ? RepD_tempo_(x.pausaMin) : 'Nenhuma'],
      ['Triagem', [RepD_s_(c.TRIAGEM_RESPONSAVEL_NOME) || RepD_s_(c.ASSUMIDO_POR_NOME), Ast_br_(c.TRIAGEM_INICIO_EM)].filter(Boolean).join(' · ') || '—'], ['Aberto por', RepD_s_(c.ABERTO_POR_NOME) || '—'], ['Canal', AST_CANAIS[Ast_up_(c.CANAL)] || RepD_s_(c.CANAL)]];
    var limite = D.agoraMs - 365 * 864e5;
    V.historico = D.historico.filter(function (h) { return (Ast_ms_(h.ABERTO_EM) || 0) >= limite; }).map(function (h) {
      var dd = Math.abs((Ast_ms_(c.ABERTO_EM) || 0) - (Ast_ms_(h.ABERTO_EM) || 0)) / 864e5;
      return [RepD_s_(h.NUMERO), Ast_brDia_(h.ABERTO_EM), AST_SITUACOES[Ast_up_(h.SITUACAO)] || RepD_s_(h.SITUACAO), RepD_s_(h.SINTOMA).slice(0, 140), dd <= REPP_REINCIDENCIA_DIAS ? 'Sim (' + Math.round(dd) + ' dias)' : 'Não'];
    });
    V.reincidente = !!x.reincidente || V.historico.some(function (h) { return /^Sim/.test(h[4]); });
  }
  // quadro-resumo da capa: situação, visita, conclusão, próximo passo e (fora a versão do cliente) prazo, aceite e com quem está
  var cy = D.ciclo;
  V.visitaTexto = Ast_ms_(os.CHEGOU_EM) !== null ? 'Técnico no local em ' + Ast_br_(os.CHEGOU_EM) : Ast_ms_(c.AGENDADO_PARA) !== null && !V.encerrado && !V.cancelado ? 'Agendada para ' + Ast_br_(c.AGENDADO_PARA) : 'Sem visita registrada';
  var chegou = Ast_ms_(os.CHEGOU_EM) !== null, agendou = Ast_ms_(c.AGENDADO_PARA) !== null && !V.cancelado;
  V.visitaDia = chegou ? Ast_brDia_(os.CHEGOU_EM) : agendou ? Ast_brDia_(c.AGENDADO_PARA) : '';
  V.visitaRotulo = chegou ? 'Visita do técnico' : agendou ? 'Visita agendada' : 'Sem visita registrada';
  V.proximo = RepD_proximoPasso_(c, V);
  if (!cliente) {
    var pz = cy.prazo || {};
    V.prazoEstado = pz.estado || 'SEM_PRAZO';
    V.prazoTexto = V.prazoEstado !== 'SEM_PRAZO' ? REPD_NOME_PRAZO[V.prazoEstado] + (pz.ate ? ' (prazo até ' + pz.ate + ')' : '') : 'Sem prazo de atendimento definido';
    V.aceiteTexto = cy.aceiteMin === null || cy.aceiteMin === undefined ? '' : RepD_tempo_(cy.aceiteMin) + ' do envio ao aceite, ' + (cy.aceiteNoPrazo ? 'no prazo' : 'fora do prazo') + ' (prazo de ' + RepD_tempo_(cy.aceitePrazoMin) + ')';
    V.comQuem = { METROLABS: 'Com a Metrolabs', REPRESENTADA: 'Com a representada', CLIENTE: 'Com o cliente final' }[cy.comQuem] || '';
    V.visitaMin = cy.visitaMin; V.conclusaoMin = cy.conclusaoMin;
    var comPrev = V.marcos.filter(function (m) { return m.atrasado !== null; });
    V.marcosResumo = comPrev.length ? comPrev.filter(function (m) { return m.atrasado === false; }).length + ' de ' + comPrev.length : '—';
  }
  return V;
}

/** Próximo passo do atendimento, pela situação do chamado (texto que todos os públicos podem ler). */
function RepD_proximoPasso_(c, V) {
  var s = Ast_up_(c.SITUACAO), ag = Ast_ms_(c.AGENDADO_PARA) !== null ? Ast_br_(c.AGENDADO_PARA) : '', tec = RepD_s_(c.TECNICO_NOME);
  var secServico = V.publico === 'CLIENTE' ? 'Serviço realizado e recomendações' : 'Diagnóstico e serviço';
  var temRec = V.servico.some(function (x) { return x[0] === 'Recomendações'; });
  var faltam = V.pecas.filter(function (p) { return /^Em falta/.test(p[3]); }).map(function (p) { return p[0]; });
  switch (s) {
    case 'ENCERRADO': return 'Nenhuma ação pendente da Metrolabs.' + (temRec ? ' Seguir as recomendações registradas pelo técnico (seção "' + secServico + '").' : '');
    case 'RESOLVIDO_REMOTO': return 'Nenhuma ação pendente: resolvido com orientação a distância.';
    case 'DOC_PENDENTE': return 'Serviço concluído. A Metrolabs fecha o relatório da ordem de serviço.';
    case 'CANCELADO': return 'Chamado cancelado. Nenhuma ação pendente.';
    case 'PLANEJADO': case 'AGENDADO': return ag ? 'Visita técnica agendada para ' + ag + (tec ? ', técnico ' + tec : '') + '.' : 'A Metrolabs agenda a visita técnica.';
    case 'EM_DESLOCAMENTO': return 'Técnico a caminho do local.';
    case 'NO_LOCAL': case 'EM_EXECUCAO': return 'Serviço em execução no local.';
    case 'PAUSADO': return 'Serviço pausado no local.';
    case 'AGUARDANDO_PECA': return 'Aguardando peça para concluir o serviço' + (faltam.length ? ': ' + faltam.join(', ') : '') + '.';
    case 'AGUARDANDO_ORCAMENTO': return 'Aguardando a aprovação do orçamento.';
    case 'AGUARDANDO_CLIENTE': return 'Aguardando retorno do cliente.';
    default: return 'Análise técnica pela Metrolabs.';
  }
}

// ------------------------------------------------------------
// GRÁFICOS DO ATENDIMENTO (SVG; o PDF não executa script)
// ------------------------------------------------------------
var REPD_FUSO_MS = -3 * 3600000;
function RepD_partes_(ms) { var d = new Date(ms + REPD_FUSO_MS); return { a: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), s: d.getUTCDay() }; }
function RepD_p2_(n) { return ('0' + n).slice(-2); }
var REPD_MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** Largura aproximada do texto em SVG (Arial, px). */
function RepD_largTexto_(t, fonte, negrito) { return String(t || '').length * (fonte || 10) * (negrito ? 0.6 : 0.54); }
function RepD_txt_(x, y, t, extra) { return RelA4_txtSvg_(x, y, t, extra); }

/**
 * Régua de datas sem sobreposição: rótulo de mês no início de cada mês (o mês parcial do começo só aparece se couber
 * antes do mês seguinte) e marcas semanais (segundas) quando há espaço. Devolve partes do SVG.
 */
function RepD_regua_(de, ate, x0, largura, yMes, yTick, yFim, opcoes) {
  var o = opcoes || {}, s = [], DIA = 864e5, pxDia = largura / Math.max(1, (ate - de) / DIA), xm = function (ms) { return x0 + (ms - de) / DIA * pxDia; };
  var meses = [], ini = de - ((de + REPD_FUSO_MS) % DIA + DIA) % DIA;
  for (var t = ini; t <= ate; t += DIA) { var q = RepD_partes_(t); if (t === ini || q.d === 1) meses.push({ x: Math.max(x0, xm(t)), rot: REPD_MESES[q.m] + '/' + q.a, ms: t }); }
  meses.forEach(function (m, i) {
    var prox = meses[i + 1] ? meses[i + 1].x : x0 + largura, w = RepD_largTexto_(m.rot, 9.5, true);
    if (prox - m.x < w + 8) return; // não cabe antes do próximo mês: some (nunca um em cima do outro)
    s.push(RepD_txt_(m.x + 3, yMes, m.rot, 'font-size="9.5" font-weight="700" fill="#1f2933"'));
    if (i > 0 || m.x > x0 + 1) s.push('<line x1="' + m.x.toFixed(1) + '" y1="' + (yMes - 9) + '" x2="' + m.x.toFixed(1) + '" y2="' + yFim + '" stroke="#9aa5b1" stroke-width="0.7"/>');
  });
  if (o.dias && pxDia >= 26) {
    for (var t3 = ini; t3 <= ate; t3 += DIA) { var q3 = RepD_partes_(t3), x3 = xm(t3); if (x3 < x0) continue; s.push(RepD_txt_(x3 + 2, yTick, RepD_p2_(q3.d) + '/' + RepD_p2_(q3.m + 1), 'font-size="8" fill="#52606d"')); s.push('<line x1="' + x3.toFixed(1) + '" y1="' + (yTick + 3) + '" x2="' + x3.toFixed(1) + '" y2="' + yFim + '" stroke="#eef1f4" stroke-width="0.6"/>'); }
  } else if (o.semanas !== false && pxDia * 7 >= 30) {
    var ultimo = -99;
    for (var t2 = ini; t2 <= ate; t2 += DIA) {
      var q2 = RepD_partes_(t2); if (q2.s !== 1) continue;
      var xx = xm(t2); if (xx < x0 || xx - ultimo < 30) continue; ultimo = xx;
      s.push('<line x1="' + xx.toFixed(1) + '" y1="' + (yTick + 3) + '" x2="' + xx.toFixed(1) + '" y2="' + yFim + '" stroke="#e4e8ed" stroke-width="0.6"/>');
      s.push(RepD_txt_(xx + 2, yTick, RepD_p2_(q2.d) + '/' + RepD_p2_(q2.m + 1), 'font-size="8" fill="#52606d"'));
    }
  }
  return { svg: s.join(''), x: xm, pxDia: pxDia };
}

/** Legenda das figuras com marcador vazado (losango ou círculo) visível. itens: [{ cor, rotulo, vazado, losango, tracejado, circulo }] */
function RepD_legHtml_(itens) {
  return '<div class="leg-grafico">' + itens.map(function (l) {
    var st = l.tracejado ? 'height:0;border-top:1.2pt dashed ' + l.cor + ';border-radius:0' : l.vazado ? 'background:#fff;border:1.2pt solid ' + l.cor : 'background:' + l.cor;
    if (l.losango) st += ';transform:rotate(45deg);width:2.4mm;height:2.4mm'; else if (l.circulo) st += ';border-radius:50%';
    return '<span><i style="' + st + '"></i>' + RelA4_esc_(l.rotulo) + '</span>';
  }).join('') + '</div>';
}
/**
 * Linha do tempo vertical (lê-se de cima para baixo e imprime bem em preto e branco): data à esquerda só quando muda o
 * dia, hora, marcador na linha e o registro com quem fez. Intervalo de 2 dias ou mais entre registros aparece escrito.
 * Registro interno (só na versão da Metrolabs): marcador vazado e a marca "interno".
 */
function RepD_linhaDoTempoHtml_(linha) {
  var l = linha.filter(function (e) { return e.emMs !== null; }), sem = linha.filter(function (e) { return e.emMs === null; });
  if (!l.length && !sem.length) return '<p class="nota">Nenhum registro visível para este público ainda.</p>';
  var DIA = 864e5, diaDe = function (ms) { return Math.floor((ms + REPD_FUSO_MS) / DIA); }, ultimoDia = null, h = [];
  l.forEach(function (e) {
    var d = diaDe(e.emMs), novoDia = d !== ultimoDia;
    if (ultimoDia !== null && d - ultimoDia >= 2) h.push('<div class="rd-gap"><span></span><i></i><span>' + RelA4_esc_((d - ultimoDia) + ' dias depois') + '</span></div>');
    ultimoDia = d;
    h.push('<div class="rd-ev' + (e.interno ? ' int' : '') + (novoDia ? ' dia' : '') + '"><div class="q">' + (novoDia ? '<b>' + RelA4_esc_(e.em.slice(0, 10)) + '</b>' : '') + '<span>' + RelA4_esc_(e.em.slice(11, 16)) + '</span></div>' +
      '<div class="m"><i></i></div><div class="o">' + RelA4_esc_(e.texto) + (e.interno ? ' <span class="marca neutra">interno</span>' : '') + '<span class="por">' + RelA4_esc_(e.por) + '</span></div></div>');
  });
  sem.forEach(function (e) { h.push('<div class="rd-ev"><div class="q"><span>sem data</span></div><div class="m"><i></i></div><div class="o">' + RelA4_esc_(e.texto) + '<span class="por">' + RelA4_esc_(e.por) + '</span></div></div>'); });
  var temInterno = l.some(function (e) { return e.interno; });
  var intro = l.length ? RelA4_plural_(l.length, 'registro', 'registros') + ', de ' + l[0].em + ' a ' + l[l.length - 1].em + ' (horário de Brasília), na ordem em que aconteceram.' : '';
  return (intro ? '<p class="nota">' + RelA4_esc_(intro) + '</p>' : '') + '<div class="rd-tl">' + h.join('') + '</div>' +
    (temInterno ? RepD_legHtml_([{ cor: '#0b3d6e', rotulo: 'Registro que o cliente ou a representada também leem', circulo: true }, { cor: '#0b3d6e', rotulo: 'Registro interno (marcado "interno")', vazado: true, circulo: true }]) : '');
}

/** Diferença entre o realizado e o previsto, em horas úteis: "+4,8 dias úteis depois" ou "2 h úteis antes". */
function RepD_difMarco_(m) {
  if (!m.previstoMs || !m.realizadoMs) return '';
  var depois = m.realizadoMs > m.previstoMs, min = depois ? Ast_minUteisEntre_(m.previstoMs, m.realizadoMs) : Ast_minUteisEntre_(m.realizadoMs, m.previstoMs);
  if (!min) {
    // diferença só fora do expediente (almoço, noite): mostra o tempo corrido
    var corr = Math.round(Math.abs(m.realizadoMs - m.previstoMs) / 60000);
    return corr ? Ast_duracaoTxt_(corr) + (depois ? ' depois' : ' antes') + ' (fora do horário útil)' : 'No horário previsto';
  }
  return depois ? RepD_tempo_(min) + ' depois' : RepD_tempo_(min) + ' antes';
}

/**
 * Marcos previsto x realizado: losango vazado (previsto), cheio (realizado). Fora a cor (verde no previsto, vermelho
 * depois), a diferença vem escrita ao lado do marco, para ler também impresso em preto e branco.
 */
function RepD_marcosHtml_(marcos, agoraMs) {
  var ms = []; marcos.forEach(function (m) { if (m.previstoMs) ms.push(m.previstoMs); if (m.realizadoMs) ms.push(m.realizadoMs); });
  if (!ms.length) return '<p class="nota">Sem marcos com data ainda.</p>';
  var de = Math.min.apply(null, ms), ate = Math.max.apply(null, ms), folga = Math.max(4 * 3600000, (ate - de) * 0.06); de -= folga; ate += folga;
  var W = 680, rotW = 128, area = W - rotW - 14, lh = 30, H = 40 + marcos.length * lh;
  var reg = RepD_regua_(de, ate, rotW, area, 12, 26, H - 4, { dias: true });
  var los = function (x, y, cheio, cor) { return '<path d="M' + x.toFixed(1) + ' ' + (y - 7) + ' l7 7 l-7 7 l-7 -7 z" fill="' + (cheio ? cor : '#fff') + '" stroke="' + cor + '" stroke-width="1.6"/>'; };
  var s = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" role="img">', reg.svg];
  marcos.forEach(function (m, i) {
    var y = 40 + i * lh + lh / 2 - 4, cor = m.atrasado === true ? RELA4_CORES.vermelho : m.atrasado === false ? RELA4_CORES.verde : RELA4_CORES.azul;
    s.push(RepD_txt_(4, y + 3.5, m.nome, 'font-size="9.5" font-weight="700" fill="#1f2933"'));
    s.push('<line x1="' + rotW + '" y1="' + y + '" x2="' + (rotW + area) + '" y2="' + y + '" stroke="#e4e8ed" stroke-width="0.7"/>');
    if (m.previstoMs && m.realizadoMs) s.push('<line x1="' + reg.x(m.previstoMs).toFixed(1) + '" y1="' + y + '" x2="' + reg.x(m.realizadoMs).toFixed(1) + '" y2="' + y + '" stroke="' + cor + '" stroke-width="3.5" opacity=".45"/>');
    if (m.previstoMs) s.push(los(reg.x(m.previstoMs), y, false, RELA4_CORES.azul));
    if (m.realizadoMs) s.push(los(reg.x(m.realizadoMs), y, true, cor));
    // texto da diferença: à direita do marco mais à direita; sem espaço, à esquerda do mais à esquerda
    var dif = RepD_difMarco_(m);
    var t = m.atrasado === true ? (/ depois/.test(dif) ? '+' + dif.replace(/ depois.*$/, '') : 'depois do previsto') : m.atrasado === false ? 'no previsto' : (!m.realizadoMs && m.previstoMs && m.previstoMs < agoraMs ? 'atrasado' : '');
    if (t) {
      var xs = [m.previstoMs, m.realizadoMs].filter(Boolean).map(reg.x), xd = Math.max.apply(null, xs) + 11, xe = Math.min.apply(null, xs) - 11, wt = RepD_largTexto_(t, 8.5, true);
      s.push(xd + wt <= W - 2 ? RepD_txt_(xd, y + 3, t, 'font-size="8.5" font-weight="700" fill="#1f2933"') : RepD_txt_(xe, y + 3, t, 'font-size="8.5" font-weight="700" fill="#1f2933" text-anchor="end"'));
    }
  });
  s.push('</svg>');
  return RelA4_figura_(s.join('') + RepD_legHtml_([{ cor: RELA4_CORES.azul, rotulo: 'Previsto', vazado: true, losango: true }, { cor: RELA4_CORES.verde, rotulo: 'Realizado no previsto', losango: true }, { cor: RELA4_CORES.vermelho, rotulo: 'Realizado depois do previsto (diferença escrita ao lado)', losango: true }, { cor: RELA4_CORES.azul, rotulo: 'Realizado (sem previsão)', losango: true }]), 'Marcos do atendimento: previsto e realizado') +
    RelA4_tabela_([{ t: 'Marco' }, { t: 'Previsto', nw: true }, { t: 'Realizado', nw: true }, { t: 'Diferença' }, { t: 'Situação' }], marcos.map(function (m) {
      var sit = m.realizadoMs ? (m.atrasado === true ? RelA4_marca_('Depois do previsto', 'critico') : m.atrasado === false ? RelA4_marca_('No previsto', 'ok') : RelA4_marca_('Feito', 'ok')) :
        (m.previstoMs && m.previstoMs < agoraMs ? RelA4_marca_('Atrasado', 'critico') : RelA4_marca_('A acontecer', 'neutra'));
      return [m.nome, m.previsto || '—', m.realizado || '—', RepD_difMarco_(m) || '—', sit];
    }), { legenda: 'Marcos previsto e realizado (diferença em horas úteis do expediente da Metrolabs)' });
}

/** As 5 etapas do portal do cliente: círculos ligados, cheios até a etapa atual, com a data de cada uma. */
function RepD_etapasClienteHtml_(etapas, atual) {
  var W = 680, H = 92, x0 = 50, passo = (W - 100) / (etapas.length - 1), s = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" role="img">'];
  s.push('<line x1="' + x0 + '" y1="26" x2="' + (x0 + passo * (etapas.length - 1)) + '" y2="26" stroke="#bcc5cf" stroke-width="3"/>');
  if (atual > 1) s.push('<line x1="' + x0 + '" y1="26" x2="' + (x0 + passo * (Math.min(atual, etapas.length) - 1)) + '" y2="26" stroke="#1d6b3f" stroke-width="3"/>');
  etapas.forEach(function (e, i) {
    var x = x0 + passo * i, cor = e.feita ? '#1d6b3f' : '#bcc5cf';
    s.push('<circle cx="' + x + '" cy="26" r="11" fill="' + (e.feita ? cor : '#fff') + '" stroke="' + cor + '" stroke-width="2"/>');
    s.push(RepD_txt_(x, 30, String(e.n), 'font-size="10" font-weight="700" text-anchor="middle" fill="' + (e.feita ? '#fff' : '#7b8794') + '"'));
    s.push(RepD_txt_(x, 54, e.nome, 'font-size="9.5" font-weight="700" text-anchor="middle" fill="#1f2933"'));
    if (e.quando) s.push(RepD_txt_(x, 68, e.quando, 'font-size="8.5" text-anchor="middle" fill="#52606d"'));
  });
  s.push('</svg>');
  return RelA4_figura_(s.join(''), 'Etapas do atendimento como aparecem em "Meus chamados"');
}

/** Bytes da foto para o A4 (a cópia reduzida da liberação, ou a original até REPD_FOTO_MAX_BYTES). */
function RepD_fotoBase64_(f) {
  try {
    var b = DriveApp.getFileById(String(f.arquivoId)).getBlob(), bytes = b.getBytes();
    if (!f.reduzida && bytes.length > REPD_FOTO_MAX_BYTES) return { grande: true };
    return { mime: b.getContentType() || 'image/jpeg', data: Utilities.base64Encode(bytes) };
  } catch (e) { return null; }
}
/**
 * Fotos em grade de duas colunas, quadro do mesmo tamanho para todas (a foto se ajusta dentro dele), separadas pela
 * origem (abertura do pedido / atendimento técnico) e com legenda: número, descrição, data e hora, quem tirou, momento.
 */
function RepD_fotosHtml_(V) {
  var lidas = [], grandes = 0, falhas = 0;
  V.fotos.slice(0, REPD_MAX_FOTOS).forEach(function (f) {
    var b = RepD_fotoBase64_(f);
    if (!b) { falhas++; return; }
    if (b.grande) { grandes++; return; }
    lidas.push({ f: f, b: b });
  });
  var n = 0, h = '';
  var grade = function (l) {
    return '<div class="fotos rd-fotos">' + l.map(function (x) {
      n++;
      var mime = /^image\/(png|jpe?g|gif|webp)$/i.test(String(x.b.mime || '')) ? x.b.mime : 'image/jpeg';
      var det = [x.f.em, x.f.por ? 'por ' + x.f.por : '', x.f.momento, x.f.liberacao].filter(Boolean).join(' · ');
      return '<div class="foto"><div class="q"><img src="data:' + mime + ';base64,' + String(x.b.data).replace(/[^A-Za-z0-9+\/=]/g, '') + '" alt="Foto ' + n + '"></div>' +
        '<div class="leg"><b>Foto ' + n + '</b> — ' + RelA4_esc_(x.f.legenda) + (det ? '<span class="rd-sub">' + RelA4_esc_(det) + '</span>' : '') + '</div></div>';
    }).join('') + '</div>';
  };
  var daRep = lidas.filter(function (x) { return x.f.origem === 'Representada'; }), daMet = lidas.filter(function (x) { return x.f.origem !== 'Representada'; });
  if (daRep.length && daMet.length) h = '<p class="rd-rot">Enviadas pela representada na abertura do pedido</p>' + grade(daRep) + '<p class="rd-rot">Registradas pela Metrolabs no atendimento</p>' + grade(daMet);
  else if (lidas.length) h = grade(lidas);
  else h = '<p class="nota">Nenhuma foto liberada para este público ainda.</p>';
  var notas = [];
  if (V.fotos.length > REPD_MAX_FOTOS) notas.push('Mais ' + (V.fotos.length - REPD_MAX_FOTOS) + ' foto(s) ficam no SGO+ (chamado ' + V.numero + ').');
  if (grandes) notas.push(grandes + ' foto(s) grande(s) demais para o A4 ficaram de fora: libere de novo na ficha do chamado (a tela gera a cópia reduzida).');
  if (falhas) notas.push(falhas + ' foto(s) não puderam ser lidas no arquivo.');
  if (V.fotosNaoLiberadas) notas.push(V.fotosNaoLiberadas + ' foto(s) do atendimento ainda não foram liberadas pela Metrolabs para esta versão.');
  return h + (notas.length ? '<p class="nota">' + RelA4_esc_(notas.join(' ')) + '</p>' : '');
}

// ------------------------------------------------------------
// APRESENTAÇÃO COMUM (capa com quadro-resumo, estilos, glossário)
// ------------------------------------------------------------
var REPD_AVISO_PUBLICO = {
  INTERNO: 'Uso interno da Metrolabs. Traz notas internas, prazos de contrato em horas úteis, primeiro contato, deslocamento e o histórico do equipamento. Não envie à representada nem ao cliente: cada um tem a sua versão.',
  REPRESENTADA: 'Versão da representada: o que a Metrolabs compartilha com a representada sobre este atendimento (linha do tempo, marcos, serviço, fotos liberadas e conversa do chamado). Registros de uso interno da Metrolabs não fazem parte desta versão.',
  CLIENTE: 'Versão do cliente: o andamento do atendimento técnico como aparece em "Meus chamados" no portal do cliente (etapas, visita, serviço realizado, peças, fotos liberadas e recomendações).'
};
/** Etapas que a representada acompanha (REP_ETAPAS), com o que cada uma quer dizer. */
var REPD_GLOSSARIO_REP = [
  ['Enviado', 'Pedido enviado pela representada, aguardando o aceite da Metrolabs.'],
  ['Complemento pedido', 'A Metrolabs pediu uma informação à representada. O prazo de aceite fica pausado até a resposta.'],
  ['Recusado', 'Pedido não aceito pela Metrolabs.'],
  ['Aceito, em análise', 'Pedido aceito e convertido em chamado; análise técnica em curso.'],
  ['Aguardando aprovação de orçamento', 'Orçamento enviado, aguardando aprovação.'],
  ['Aguardando peça', 'O serviço depende de peça ainda não disponível.'],
  ['Visita a agendar ou agendada', 'Visita técnica em planejamento ou com data marcada.'],
  ['Em atendimento', 'Técnico a caminho, no local ou com o serviço em execução.'],
  ['Concluído', 'Serviço concluído; relatório da ordem de serviço em fechamento, ou problema resolvido a distância.'],
  ['Encerrado', 'Atendimento encerrado com o relatório da ordem de serviço.'],
  ['Cancelado', 'Pedido ou chamado cancelado.']
];
/** As 5 etapas de "Meus chamados" (AST_ETAPAS_CLIENTE). */
var REPD_GLOSSARIO_CLIENTE = [
  ['Recebido', 'Chamado registrado pela Metrolabs.'],
  ['Em análise', 'Análise técnica do problema; pode incluir orçamento, peça ou retorno do cliente.'],
  ['Visita agendada', 'Visita técnica com data marcada, ou técnico a caminho.'],
  ['Em atendimento', 'Técnico no local ou serviço em execução.'],
  ['Concluído', 'Serviço concluído.']
];

/** Estilos próprios dos documentos da Representação (somados aos da moldura RelA4 e da SGO_DocA4). */
function RepD_estilos_() {
  return '' +
    '.capa .meio{margin-top:16mm}.capa h1{font-size:21pt}.capa table.t{max-width:none}.capa .sub{margin-bottom:4mm}' +
    '.rd-quadro{margin:5mm 0 0;border:.8pt solid #0b3d6e;break-inside:avoid;page-break-inside:avoid}' +
    '.rd-quadro .cab{background:#0b3d6e;color:#fff;font-weight:700;font-size:9pt;padding:1.4mm 3mm;letter-spacing:.02em;margin:0;text-align:left}' +
    '.rd-quadro table{width:100%;border-collapse:collapse;font-size:9pt;line-height:1.38}' +
    '.rd-quadro th{width:36mm;text-align:left;vertical-align:top;color:#3e4c59;font-weight:600;padding:1.5mm 3mm;border-top:.5pt solid #d5dbe1;background:#f5f7fa}' +
    '.rd-quadro td{padding:1.5mm 3mm;border-top:.5pt solid #d5dbe1;vertical-align:top;text-align:left}' +
    '.rd-quadro tr:first-child th,.rd-quadro tr:first-child td{border-top:0}' +
    '.rd-quadro td.sit{font-size:11.5pt;font-weight:700;color:#0b3d6e}' +
    '.rd-quadro td ul{margin:0;padding:0 0 0 4mm}.rd-quadro td li{margin:0 0 .6mm;text-align:left}' +
    '.capa .rd-aviso{margin:3mm 0 0;font-size:8.3pt;color:#3e4c59;border-left:2.5pt solid #9fb3c8;padding:1mm 0 1mm 3mm;text-align:left}' +
    '.capa .rd-aviso.int{border-left-color:#b45309;color:#5c3a00;font-weight:700}' +
    '.rd-rot{font-size:8.8pt;font-weight:700;color:#243b53;margin:3mm 0 1.2mm;text-align:left;break-after:avoid;page-break-after:avoid}' +
    '.rd-sub{display:block;font-size:7.6pt;color:#52606d;margin-top:.4mm;font-weight:400}' +
    '.rd-texto p{text-align:left}.rd-texto b{color:#243b53}' +
    // linha do tempo vertical
    '.rd-tl{margin:1.5mm 0 3mm}' +
    '.rd-ev,.rd-gap{display:grid;grid-template-columns:24mm 7mm 1fr;break-inside:avoid;page-break-inside:avoid}' +
    '.rd-ev .q{text-align:right;padding:1.1mm 1.6mm 1.1mm 0;font-size:8.4pt;line-height:1.3;color:#3e4c59;font-variant-numeric:tabular-nums}' +
    '.rd-ev .q b{display:block;color:#1f2933}' +
    '.rd-ev .m{position:relative;background:linear-gradient(#9aa5b1,#9aa5b1) no-repeat center/0.8pt 100%}' +
    '.rd-ev .m i{position:absolute;left:50%;top:1.7mm;width:2.8mm;height:2.8mm;margin-left:-1.4mm;border-radius:50%;background:#0b3d6e;border:.9pt solid #0b3d6e;box-sizing:border-box}' +
    '.rd-ev.int .m i{background:#fff}' +
    '.rd-ev .o{padding:1.1mm 0 1.1mm 1.6mm;font-size:8.8pt;line-height:1.35;border-bottom:.4pt solid #eef1f4;text-align:left}' +
    '.rd-ev .o .por{display:block;font-size:7.6pt;color:#52606d}' +
    '.rd-gap span{font-size:7.6pt;color:#7b8794;font-style:italic;padding:.5mm 0 .5mm 1.6mm}' +
    '.rd-gap i{display:block;background:repeating-linear-gradient(to bottom,#9aa5b1 0,#9aa5b1 1.1mm,transparent 1.1mm,transparent 2.1mm) no-repeat center/0.8pt 100%}' +
    // fotos: quadro igual para todas
    '.rd-fotos .foto{flex:0 0 calc(50% - 2mm)}.rd-fotos .foto .q{height:58mm}.rd-fotos .foto img{max-height:58mm;max-width:100%;object-fit:contain}' +
    '.rd-fotos .foto .leg b{color:#1f2933}' +
    // período
    '.pg-paisagem figure.grafico svg{max-width:none;width:100%}' +
    'table.rd-lista{font-size:7.9pt}table.rd-lista td,table.rd-lista th{padding:.8mm 1.4mm}' +
    'ul.rd-destaques{margin:0 0 3mm 4.5mm;padding:0}ul.rd-destaques li{margin:0 0 1.3mm;text-align:left}' +
    'table.rd-glossario th:first-child{width:52mm}';
}
/** Estilos + quadro-resumo e aviso do público dentro da capa (o essencial na primeira folha). */
function RepD_acabamento_(html, quadro, aviso, interno) {
  var h = html.replace('</head>', '<style>' + RepD_estilos_() + '</style></head>');
  var i = h.indexOf('<section class="capa">'), j = i < 0 ? -1 : h.indexOf('</div><div class="pe">', i);
  if (j < 0) return h;
  return h.slice(0, j) + quadro + (aviso ? '<p class="rd-aviso' + (interno ? ' int' : '') + '">' + RelA4_esc_(aviso) + '</p>' : '') + h.slice(j);
}
/** Quadro-resumo: linhas [[rótulo, valor (texto) ou {html}, 'sit']]. */
function RepD_quadro_(titulo, linhas) {
  return '<div class="rd-quadro"><p class="cab">' + RelA4_esc_(titulo) + '</p><table><tbody>' + linhas.filter(function (l) { return l && l[0] && (l[1] || l[1] === 0); }).map(function (l) {
    var v = l[1] && typeof l[1] === 'object' && l[1].html !== undefined ? l[1].html : RelA4_esc_(l[1]);
    return '<tr><th>' + RelA4_esc_(l[0]) + '</th><td' + (l[2] ? ' class="' + l[2] + '"' : '') + '>' + v + '</td></tr>';
  }).join('') + '</tbody></table></div>';
}
/** Tabela de identificação que não se divide entre folhas; vazio vira o texto pedido (padrão "—"). */
function RepD_ident_(pares, vazio) {
  return '<div class="manter">' + RelA4_identificacao_(pares.map(function (p) { return [p[0], RepD_s_(p[1]) === '' ? (vazio || '—') : p[1], p[2]]; })) + '</div>';
}
function RepD_glossarioHtml_(itens, legenda) {
  return RelA4_tabela_([{ t: 'Etapa' }, { t: 'O que quer dizer' }], itens, { legenda: legenda, compacta: true }).replace('<table class="t', '<table class="t rd-glossario');
}

// ------------------------------------------------------------
// DOCUMENTO DO ATENDIMENTO
// ------------------------------------------------------------
function RepD_htmlAtendimento_(V, meta) {
  var m = meta || {}, cliente = V.publico === 'CLIENTE', interno = V.publico === 'INTERNO', corpo = '';
  var versao = interno ? 'uso interno' : cliente ? 'versão do cliente' : 'versão da representada';
  var secServico = cliente ? 'Serviço realizado e recomendações' : 'Diagnóstico e serviço';
  var achar = function (l, rot) { var x = l.filter(function (p) { return p[0] === rot; })[0]; return x ? RepD_s_(x[1]) : ''; };
  // 1. resumo: números do atendimento e o texto curto do problema e do serviço
  var kpis = cliente ? [[V.abertoEm.slice(0, 10) || '—', 'Aberto em'], [V.visitaDia || '—', V.visitaRotulo], [V.concluidoEm ? V.concluidoEm.slice(0, 10) : '—', V.concluidoEm ? 'Concluído em' : 'Ainda não concluído', V.concluidoEm ? 'ok' : 'aviso'],
    [achar(V.visita, 'Tempo no local') || '—', 'Tempo do técnico no local']] :
    [[RepD_tempo_(V.visitaMin), 'Do envio do pedido à visita'], [RepD_tempo_(V.conclusaoMin), 'Do envio do pedido à conclusão', V.concluidoEm ? '' : 'aviso'],
      [V.marcosResumo, 'Marcos cumpridos no previsto', /^0 de/.test(V.marcosResumo) ? 'critico' : ''], [V.prazoEstado === 'SEM_PRAZO' ? '—' : REPD_NOME_PRAZO[V.prazoEstado], 'Prazo de atendimento',
        { CUMPRIDO: 'ok', NO_PRAZO: 'ok', EM_RISCO: 'aviso', VENCIDO: 'critico', FORA_DO_PRAZO: 'aviso' }[V.prazoEstado] || '']];
  var problema = V.relato[0] ? RepD_s_(V.relato[0][1]) : '', servico = achar(V.servico, 'Serviço realizado'), causa = achar(V.servico, 'Causa ou diagnóstico');
  var txt = '<div class="rd-texto">' + (problema ? '<p><b>Problema relatado.</b> ' + RelA4_esc_(problema) + '</p>' : '') + (causa ? '<p><b>Causa encontrada.</b> ' + RelA4_esc_(causa) + '</p>' : '') +
    (servico ? '<p><b>Serviço realizado.</b> ' + RelA4_esc_(servico) + '</p>' : '<p><b>Serviço.</b> ' + RelA4_esc_(V.cancelado ? 'Chamado cancelado antes do serviço.' : 'Ainda não registrado na ordem de serviço.') + '</p>') +
    '<p><b>Próximo passo.</b> ' + RelA4_esc_(V.proximo) + '</p>' +
    (!V.concluidoEm && !V.cancelado ? '<p class="nota">Atendimento em andamento: este documento é o retrato de ' + RelA4_esc_(RepD_br_(V.agoraMs)) + '.</p>' : '') + '</div>';
  corpo += RelA4_secao_('Resumo do atendimento', RelA4_kpis_(kpis) + txt + (cliente ? '' : '<p class="nota">Tempos em horas úteis do expediente da Metrolabs, descontada a espera do complemento da representada.</p>'));
  // 2. cliente e equipamento (cadastro vazio aparece como "Não informado")
  corpo += RelA4_secao_('Cliente e equipamento', '<p class="rd-rot">Cliente</p>' + RepD_ident_(V.identCliente, 'Não informado') + '<p class="rd-rot">Equipamento</p>' + RepD_ident_(V.identEquip, 'Não informado'));
  corpo += RelA4_secao_('Relato da abertura', RepD_ident_(V.relato));
  if (cliente) corpo += RelA4_secao_('Etapas do atendimento', RepD_etapasClienteHtml_(V.etapasCliente, V.etapaClienteAtual));
  else corpo += RelA4_secao_('Marcos: previsto e realizado', RepD_marcosHtml_(V.marcos, V.agoraMs));
  corpo += RelA4_secao_('Linha do tempo', RepD_linhaDoTempoHtml_(V.linha));
  corpo += RelA4_secao_('Visita e atendimento', V.visita.length ? RepD_ident_(V.visita) : '<p class="nota">Visita ainda não agendada.</p>');
  corpo += RelA4_secao_(secServico, V.servico.length ? RelA4_identificacao_(V.servico.map(function (s) { return [s[0], s[1], { largo: true }]; })) : '<p class="nota">O serviço ainda não foi registrado na ordem de serviço.</p>');
  corpo += RelA4_secao_('Peças', RelA4_tabela_([{ t: 'Peça' }, { t: 'Código' }, { t: 'Qtd.', num: true }, { t: 'Situação' }], V.pecas, { vazio: 'Nenhuma peça registrada.', legenda: V.pecas.length ? 'Peças do atendimento' : '' }));
  corpo += RelA4_secao_('Fotos', RepD_fotosHtml_(V));
  if (!cliente) corpo += RelA4_secao_('Conversa do chamado', RelA4_tabela_([{ t: 'Quando', nw: true }, { t: 'Quem' }, { t: 'Mensagem' }], V.conversa.map(function (x) { return [x.em, x.autor, x.texto]; }), { vazio: 'Nenhuma mensagem na conversa do chamado.', legenda: V.conversa.length ? 'Mensagens trocadas entre a representada e a Metrolabs' : '' }));
  if (interno) corpo += RelA4_secao_('Notas internas', RelA4_tabela_([{ t: 'Quando', nw: true }, { t: 'Quem' }, { t: 'Nota' }], V.notasInternas.map(function (x) { return [x.em, x.autor, x.texto]; }), { vazio: 'Nenhuma nota interna.', legenda: V.notasInternas.length ? 'Notas internas (a representada e o cliente não leem)' : '' }));
  var docs = (V.anexos.length ? RelA4_tabela_([{ t: 'Tipo' }, { t: 'Arquivo' }, { t: 'Enviado por' }, { t: 'Quando', nw: true }].concat(interno ? [{ t: 'Quem lê' }] : []), V.anexos, { legenda: 'Arquivos do pedido e do chamado' }) : '') +
    (V.relatorioOs ? '<p class="nota">Relatório da ordem de serviço ' + RelA4_esc_(V.relatorioOs.numero) + ' emitido em ' + RelA4_esc_(V.relatorioOs.em) + (cliente ? ' (disponível em "Meus chamados").' : '.') + '</p>' : '');
  corpo += RelA4_secao_('Documentos do atendimento', docs || '<p class="nota">Nenhum arquivo anexado.</p>');
  if (interno) {
    corpo += RelA4_secao_('Prazos e SLA', RepD_ident_(V.prazos) + '<p class="nota">Tempos em horas úteis do expediente da Metrolabs. O aceite e o primeiro contato seguem os prazos da representada; o prazo de atendimento, a prioridade e o contrato.</p>');
    corpo += RelA4_secao_('Histórico do equipamento', (V.reincidente ? RelA4_caixa_('Reincidência: há outro chamado deste equipamento em até ' + REPP_REINCIDENCIA_DIAS + ' dias.', 'critico') : '') +
      RelA4_tabela_([{ t: 'Chamado', nw: true }, { t: 'Aberto em', nw: true }, { t: 'Situação' }, { t: 'Problema' }, { t: 'Reincidência' }], V.historico, { vazio: 'Nenhum outro chamado deste equipamento nos últimos 12 meses.', legenda: V.historico.length ? 'Outros chamados do equipamento (12 meses)' : '' }));
  }
  if (V.assinatura) {
    var img = V.assinatura.arquivoId ? AstR_b64Arquivo_(V.assinatura.arquivoId) : null;
    corpo += RelA4_secao_('Assinaturas e aceite', '<div class="manter">' + SGO_DocA4_assinaturas_([{ papel: 'Recebido por (cliente)', nome: V.assinatura.nome || ' ', cargo: V.assinatura.documento || (V.assinatura.sem ? 'Sem assinatura: ' + V.assinatura.sem : ''), imagemBase64: img ? { mimeType: 'image/png', data: img.data } : null },
      { papel: 'Técnico responsável', nome: V.assinatura.tecnico, cargo: 'Metrolabs' }]) + (V.assinatura.em ? '<p class="nota" style="margin-top:2mm">Recebimento do serviço assinado na tela do aparelho do técnico em ' + RelA4_esc_(V.assinatura.em) + '.</p>' : '') + '</div>');
  } else corpo += RelA4_secao_('Assinaturas e aceite', '<p class="nota">' + RelA4_esc_(V.cancelado ? 'Chamado cancelado: não há recebimento do serviço a assinar.' : 'A assinatura de quem recebeu o atendimento ainda não foi registrada na ordem de serviço. Ela entra neste documento quando o técnico encerrar a visita.') + '</p>');
  // fecho: a quem se destina, o que quer dizer cada etapa e a emissão
  corpo += RelA4_secao_('Sobre este documento', RepD_glossarioHtml_(cliente ? REPD_GLOSSARIO_CLIENTE : REPD_GLOSSARIO_REP, cliente ? 'Etapas de "Meus chamados"' : 'Etapas que a representada acompanha') +
    '<p class="nota">Gerado pelo SGO+ em ' + RelA4_esc_(RepD_br_(V.agoraMs)) + ' por ' + RelA4_esc_(m.por || '—') + '. Emissão ' + RelA4_esc_(String(m.versao || 1)) + ' (revisão ' + RelA4_esc_(SGO_DocA4_revisao_(m.revisao || 0)) + '); cada nova emissão gera outro arquivo e as anteriores continuam guardadas. Marca de conferência do conteúdo: ' +
    RelA4_esc_(String(m.marca || '').slice(0, 16)) + '.</p>');
  var ficha = [['Chamado', V.numero], ['Cliente', V.clienteNome], ['Equipamento', V.equipamentoTexto + (V.serie ? ' · série ' + V.serie : '')]];
  if (!cliente && V.representadaNome) ficha.splice(1, 0, ['Representada', V.representadaNome], ['Protocolo da representada', V.protocolo || 'Não informado']);
  var html = RelA4_documento_({ titulo: 'Relatório do atendimento', subtitulo: V.clienteNome + ' · ' + V.equipamentoTexto, tituloCurto: 'Relatório do atendimento ' + V.numero + ' · ' + versao, tituloArquivo: 'Relatorio do atendimento',
    numero: m.numero, revisao: m.revisao || 0, emitidoPor: m.por, ficha: ficha, tipoCapa: 'Relatório do atendimento · ' + versao, corpo: corpo, capa: true, sumario: true });
  var reg = RelA4_registro_(html); if (reg) reg.semSumario = null; // o dono pediu índice sempre
  var quadro = RepD_quadro_('Situação em ' + RepD_br_(V.agoraMs), [['Situação', V.etapaNome, 'sit']].concat(cliente ? [] : [['Prazo de atendimento', V.prazoTexto], ['Aceite do pedido', V.aceiteTexto]],
    [['Visita', V.visitaTexto], ['Conclusão', V.concluidoEm || (V.cancelado ? 'Chamado cancelado' : 'Ainda não concluído')]], !cliente && !V.encerrado && !V.cancelado ? [['Com quem está', V.comQuem]] : [], [['Próximo passo', V.proximo]]));
  return RepD_acabamento_(html, quadro, REPD_AVISO_PUBLICO[V.publico], interno);
}

// ------------------------------------------------------------
// PERÍODO: dados por público
// ------------------------------------------------------------
function RepD_ciclosPeriodo_(publico, repId, eu, agoraMs) {
  var ctx = RepP_ctx_(agoraMs), sols, chamados;
  if (publico === 'REPRESENTADA') { var esc = Rep_escopo_({ repId: repId, sessionId: (eu && eu.sessionId) || '' }); sols = esc.solicitacoes(); chamados = esc.chamados(); }
  else {
    var daRep = function (r) { return RepD_s_(r.REPRESENTADA_ID) && (!repId || RepD_s_(r.REPRESENTADA_ID) === repId); };
    chamados = Rep_lerAst_(AST_ABAS.CHAMADOS).filter(function (c) { return daRep(c) && (!eu || AstC_podeVer_(eu, c)); });
    sols = Rep_lerAst_(AST_ABAS.SOLICITACOES).filter(daRep);
  }
  var ciclos = RepP_ciclos_(sols, chamados, ctx);
  RepP_marcarReincidencia_(ciclos);
  return ciclos;
}
/** Visão do período. publico REPRESENTADA/INTERNO: índices do painel (RepP_indices_); CLIENTE: índices de "Meus chamados". */
function RepD_visaoPeriodo_(publico, o) {
  var agoraMs = o.agoraMs || Date.now(), dias = REPP_PERIODOS.indexOf(Number(o.dias)) >= 0 ? Number(o.dias) : REPP_PERIODO_PADRAO, de = agoraMs - dias * 864e5;
  var no = function (ms) { return ms !== null && ms !== undefined && ms >= de && ms <= agoraMs; };
  var P = { publico: publico, publicoNome: REPD_PUBLICOS[publico], dias: dias, deMs: de, agoraMs: agoraMs, de: RepD_dia_(de), ate: RepD_dia_(agoraMs), minDia: RepP_minDia_() };
  if (publico === 'CLIENTE') {
    var pn = AstP_painelCliente_(o.clienteId, agoraMs), cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[o.clienteId] || {};
    var todos = Ast_ler_(AST_ABAS.CHAMADOS).filter(function (c) { return RepD_s_(c.CLIENTE_ID) === o.clienteId; });
    P.clienteId = o.clienteId; P.escopoNome = Ast_clienteNome_(cli);
    var itens = pn.gantt.filter(function (x) { return x.aberto || no(x.fimMs) || no(x.enviadoMs); });
    var concl = itens.filter(function (x) { return x.etapa === 5 && no(x.conclusaoMs); }), tempos = concl.map(function (x) { return x.conclusaoMin; }).filter(function (v) { return v !== null; });
    var porEtapa = {}, porEq = {}, porUn = {}, porMes = {};
    itens.forEach(function (x) { RepP_conta_(porEtapa, x.etapaNome); RepP_conta_(porEq, x.equipamento); RepP_conta_(porUn, x.unidade || 'Unidade não informada'); });
    todos.forEach(function (c) { var t = Ast_ms_(c.ABERTO_EM); if (no(t)) { var q = RepD_partes_(t); RepP_conta_(porMes, q.a + '-' + RepD_p2_(q.m + 1)); } });
    P.indices = { abertos: pn.indices.abertos, emAtendimento: pn.indices.emAtendimento, visitaAgendada: pn.indices.visitaAgendada, emAnalise: pn.indices.emAnalise, proximaVisita: pn.indices.proximaVisita,
      concluidos: concl.length, mediaConclusaoMin: tempos.length ? Math.round(tempos.reduce(function (s, v) { return s + v; }, 0) / tempos.length) : null,
      abertosNoPeriodo: todos.filter(function (c) { return no(Ast_ms_(c.ABERTO_EM)); }).length };
    P.porEtapa = AST_ETAPAS_CLIENTE.map(function (e) { return { t: e.nome, n: porEtapa[e.nome] || 0, n0: e.etapa }; });
    P.porEquipamento = RepP_ordenar_(porEq, 12); P.porUnidade = RepP_ordenar_(porUn, 12);
    P.porMes = Object.keys(porMes).sort().map(function (k) { return { t: REPD_MESES[Number(k.slice(5, 7)) - 1] + '/' + k.slice(0, 4), n: porMes[k] }; });
    P.itens = itens.map(function (x) { return { numero: x.numero, equipamento: x.equipamento, unidade: x.unidade, etapa: x.etapa, etapaNome: x.etapaNome, enviadoMs: x.enviadoMs, fimMs: x.fimMs, aberto: x.aberto,
      visitaPrevMs: x.visitaPrevMs, visitaMs: null, conclusaoMs: x.conclusaoMs, abertoEm: x.abertoEm, rotulo: x.etapaNome, cor: REPD_COR_ETAPA_CLIENTE[x.etapa] || '#7b8794' }; });
    return P;
  }
  var repId = RepD_s_(o.representadaId), rep = repId ? Rep_representada_(repId) : null, interno = publico === 'INTERNO';
  if (publico === 'REPRESENTADA' && !rep) throw Rep_erro_('NAO_ENCONTRADO', 'Não foi possível gerar: escolha a representada do relatório.');
  P.representadaId = repId; P.escopoNome = rep ? RepD_s_(rep.NOME) : 'Todas as representadas';
  var ciclos = RepD_ciclosPeriodo_(publico, repId, o.eu, agoraMs);
  P.indices = RepP_indices_(ciclos, dias, agoraMs, interno);
  var vis = ciclos.filter(function (x) { return x.aberto || no(x.enviadoMs) || no(x.fimMs); }).sort(function (a, b) { return (a.enviadoMs || 0) - (b.enviadoMs || 0); });
  // prazo cumprido (chamados concluídos no período) e por mês
  var fechados = vis.filter(function (x) { return x.tipo === 'CHAMADO' && (x.prazo.estado === 'CUMPRIDO' || x.prazo.estado === 'FORA_DO_PRAZO') && no(x.conclusaoMs); });
  P.atendimentoPrazo = { total: fechados.length, noPrazo: fechados.filter(function (x) { return x.prazo.estado === 'CUMPRIDO'; }).length };
  P.atendimentoPrazo.pct = RepP_pct_(P.atendimentoPrazo.noPrazo, P.atendimentoPrazo.total);
  P.itens = vis.map(function (x) {
    var k = RepP_cartao_(x, !interno);
    return { numero: k.numero, pedidoNumero: k.pedidoNumero, tipo: k.tipo, cliente: k.clienteNome, cidade: k.cidade, equipamento: k.equipamento, etapaNome: k.etapaNome, enviadoMs: k.enviadoMs, fimMs: k.fimMs, aberto: k.aberto,
      visitaPrevMs: k.visitaPrevMs, visitaMs: k.visitaMs, conclusaoMs: k.conclusaoMs, prazo: k.prazo, prioridade: k.prioridade, prioridadePrevista: k.prioridadePrevista, reincidente: k.reincidente,
      representada: interno ? k.representadaNome : '', tecnico: k.tecnico, rotulo: k.etapaNome + (k.prazo.estado !== 'SEM_PRAZO' && REPD_NOME_PRAZO[k.prazo.estado] ? ' · ' + REPD_NOME_PRAZO[k.prazo.estado].toLowerCase() : ''),
      cor: REPD_COR_PRAZO[k.prazo.estado] || '#7b8794' };
  });
  return P;
}

// ------------------------------------------------------------
// GANTT IMPRESSO (paisagem; rótulos nunca encostam nos losangos)
// ------------------------------------------------------------
function RepD_ganttSvg_(itens, de, ate, agoraMs, comPrazo) {
  var W = 1000, rotW = 200, area = W - rotW - 12, lh = 24, cab = 34, H = cab + itens.length * lh + 8, DIA = 864e5;
  var reg = RepD_regua_(de, ate, rotW, area, 12, 27, H - 4, {}), xm = function (ms) { return Math.max(rotW, Math.min(rotW + area, reg.x(ms))); };
  var s = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" role="img">', reg.svg];
  var faixas = [], hoje = agoraMs >= de && agoraMs <= ate ? xm(agoraMs) : null;
  var los = function (x, y, h, cheio) { return '<path d="M' + x.toFixed(1) + ' ' + (y - 1) + ' l5 ' + (h / 2 + 1) + ' l-5 ' + (h / 2 + 1) + ' l-5 -' + (h / 2 + 1) + ' z" fill="' + (cheio ? '#0b3d6e' : '#fff') + '" stroke="#0b3d6e" stroke-width="1.3"/>'; };
  itens.forEach(function (x, i) {
    var y = cab + i * lh, by = y + 4, bh = lh - 8;
    if (i % 2) faixas.push('<rect x="0" y="' + y + '" width="' + W + '" height="' + lh + '" fill="#f5f7fa"/>');
    s.push(RepD_txt_(4, y + 10.5, String(x.numero), 'font-size="10" font-weight="700" fill="#1f2933"'));
    s.push(RepD_txt_(4, y + 20.5, String(x.sub || '').slice(0, 38), 'font-size="8.3" fill="#3e4c59"'));
    var x0 = xm(x.enviadoMs), fim = x.aberto ? agoraMs : (x.fimMs || x.enviadoMs), x1 = Math.max(x0 + 4, xm(fim));
    s.push('<rect x="' + x0.toFixed(1) + '" y="' + by + '" width="' + (x1 - x0).toFixed(1) + '" height="' + bh + '" rx="2" fill="' + x.cor + '" fill-opacity="0.9"' + (x.prazo && x.prazo.estado === 'VENCIDO' ? ' stroke="#a61b1b" stroke-width="1.5"' : '') + '/>');
    var marcas = [];
    if (comPrazo && x.prazo && x.prazo.ateMs && x.prazo.ateMs >= de && x.prazo.ateMs <= ate) { var xp = xm(x.prazo.ateMs); s.push('<line x1="' + xp.toFixed(1) + '" y1="' + (by - 2) + '" x2="' + xp.toFixed(1) + '" y2="' + (by + bh + 2) + '" stroke="#1f2933" stroke-width="1.4" stroke-dasharray="3,2"/>'); marcas.push(xp); }
    if (x.visitaPrevMs && x.visitaPrevMs >= de && x.visitaPrevMs <= ate) { var xv = xm(x.visitaPrevMs); s.push(los(xv, by, bh, false)); marcas.push(xv); }
    if (x.visitaMs && x.visitaMs >= de && x.visitaMs <= ate) { var xr = xm(x.visitaMs); s.push(los(xr, by, bh, true)); marcas.push(xr); }
    // rótulo: dentro da barra se couber sem tocar marca; senão à direita do que estiver mais à direita (barra ou marca)
    var t = String(x.rotulo || x.numero), wt = RepD_largTexto_(t, 8.5, true), xt = x0 + 4;
    var bate = function (a, b) { return marcas.some(function (mx) { return mx + 7 > a && mx - 7 < b; }); };
    if (x1 - x0 >= wt + 8 && !bate(xt - 2, xt + wt + 2)) s.push(RepD_txt_(xt, by + bh / 2 + 3, t, 'font-size="8.5" font-weight="700" fill="#fff"'));
    else {
      var dir = Math.max.apply(null, [x1].concat(marcas.map(function (mx) { return mx + 6; }))) + 5;
      if (dir + wt > W - 4 && x0 - wt - 8 > rotW) s.push(RepD_txt_(x0 - 6, by + bh / 2 + 3, t, 'font-size="8.5" font-weight="700" fill="#1f2933" text-anchor="end"'));
      else s.push(RepD_txt_(dir, by + bh / 2 + 3, t.slice(0, Math.max(6, Math.floor((W - 4 - dir) / (8.5 * 0.6)))), 'font-size="8.5" font-weight="700" fill="#1f2933"'));
    }
  });
  s.push('</svg>');
  // faixas zebradas e a linha de hoje vão por baixo das barras e dos rótulos
  s.splice(1, 0, faixas.join('') + (hoje !== null ? '<line x1="' + hoje.toFixed(1) + '" y1="' + (cab - 4) + '" x2="' + hoje.toFixed(1) + '" y2="' + (H - 4) + '" stroke="#0b3d6e" stroke-width="1.6" opacity=".55"/>' + RepD_txt_(hoje + 3, cab - 6, 'hoje', 'font-size="8" font-weight="700" fill="#0b3d6e"') : ''));
  return s.join('');
}
function RepD_ganttHtml_(P, comPrazo) {
  if (!P.itens.length) return '<p class="nota">Nenhum pedido ou chamado no período.</p>';
  // janela justa: do primeiro envio que aparece (no máximo o início do período) até uma semana depois de hoje ou da última visita agendada
  var ini = Math.max(P.deMs, Math.min.apply(null, P.itens.map(function (x) { return x.enviadoMs || P.deMs; })) - 3 * 864e5);
  var ate = Math.max(P.agoraMs, Math.max.apply(null, P.itens.map(function (x) { return x.visitaPrevMs || 0; }))) + 7 * 864e5, h = '', porPagina = 20;
  var leg = comPrazo ? ['NO_PRAZO', 'EM_RISCO', 'VENCIDO', 'PAUSADO', 'CUMPRIDO', 'FORA_DO_PRAZO'].map(function (k) { return { cor: REPD_COR_PRAZO[k], rotulo: REPD_NOME_PRAZO[k] }; }).concat([{ cor: '#1f2933', rotulo: 'Fim do prazo (tracejado)', tracejado: true }])
    : AST_ETAPAS_CLIENTE.map(function (e) { return { cor: REPD_COR_ETAPA_CLIENTE[e.etapa], rotulo: e.nome }; });
  leg = leg.concat([{ cor: '#0b3d6e', rotulo: 'Visita agendada', vazado: true, losango: true }].concat(comPrazo ? [{ cor: '#0b3d6e', rotulo: 'Chegada do técnico', losango: true }] : []), [{ cor: '#0b3d6e', rotulo: 'Hoje (linha)' }]);
  for (var i = 0; i < P.itens.length; i += porPagina) {
    var parte = P.itens.slice(i, i + porPagina).map(function (x) { return Object.assign({}, x, { sub: P.publico === 'CLIENTE' ? x.equipamento : [P.publico === 'INTERNO' ? x.representada : '', x.cliente].filter(Boolean).join(' · ') }); });
    h += RelA4_figura_(RepD_ganttSvg_(parte, ini, ate, P.agoraMs, comPrazo) + RepD_legHtml_(leg), 'Gantt da carteira, de ' + RepD_dia_(ini) + ' a ' + RepD_dia_(ate) + (P.itens.length > porPagina ? ' (parte ' + (i / porPagina + 1) + ' de ' + Math.ceil(P.itens.length / porPagina) + ')' : ''));
  }
  return h + '<p class="nota">Cada barra vai do envio do pedido (ou da abertura do chamado) até a conclusão; aberto, vai até hoje. ' + (comPrazo ? 'O texto da barra é a etapa e a situação do prazo que vale agora (aceite para o pedido; atendimento para o chamado); a cor repete a situação do prazo.' : 'O texto da barra é a etapa em "Meus chamados"; a cor repete a etapa.') + '</p>';
}

// ------------------------------------------------------------
// DOCUMENTO DO PERÍODO
// ------------------------------------------------------------
/** Célula com a linha principal e uma segunda linha menor (cidade, série, nº do pedido). */
function RepD_cel2_(a, b) {
  return { html: RelA4_esc_(RepD_s_(a) || '—') + [].concat(b || []).filter(function (x) { return RepD_s_(x); }).map(function (x) { return '<span class="rd-sub">' + RelA4_esc_(x) + '</span>'; }).join('') };
}
/** "MODELO · série X" -> ["MODELO", "série X"]. */
function RepD_eqPartes_(t) { t = RepD_s_(t); var i = t.indexOf(' · série '); return i < 0 ? [t, ''] : [t.slice(0, i), t.slice(i + 3)]; }

function RepD_htmlPeriodo_(P, meta) {
  var m = meta || {}, cliente = P.publico === 'CLIENTE', interno = P.publico === 'INTERNO', k = P.indices, corpo = '', C = RELA4_CORES;
  var versao = interno ? 'uso interno' : cliente ? 'versão do cliente' : 'versão da representada';
  var aviso = interno ? 'Uso interno da Metrolabs: traz primeiro contato, prazo por prioridade, fila, carga por técnico e a comparação entre representadas. Não envie à representada nem ao cliente.' :
    cliente ? 'Versão do cliente: os seus chamados de assistência técnica no período, como aparecem em "Meus chamados".' : 'Versão da representada ' + P.escopoNome + ': só os pedidos e chamados da sua empresa.';
  var abertos = P.itens.filter(function (x) { return x.aberto; });
  var proximas = abertos.filter(function (x) { return x.visitaPrevMs && x.visitaPrevMs >= P.agoraMs; }).sort(function (a, b) { return a.visitaPrevMs - b.visitaPrevMs; });
  var nomeItem = function (x) { return x.numero + ' (' + (cliente ? RepD_eqPartes_(x.equipamento)[0] : x.cliente) + ')'; };
  var listaCurta = function (l, max) { return l.slice(0, max).map(nomeItem).join('; ') + (l.length > max ? '; e mais ' + (l.length - max) : ''); };
  var visitas = proximas.length ? 'Próximas visitas: ' + proximas.slice(0, 5).map(function (x) { return RepD_br_(x.visitaPrevMs) + ', ' + nomeItem(x); }).join('; ') + (proximas.length > 5 ? '; e mais ' + (proximas.length - 5) : '') + '.' : 'Nenhuma visita agendada a partir de hoje.';
  var destaques = [], quadro = [], definicoes = [];
  if (cliente) {
    destaques = ['Movimento no período: ' + RelA4_plural_(k.abertosNoPeriodo, 'chamado aberto', 'chamados abertos') + ' e ' + RelA4_plural_(k.concluidos, 'concluído', 'concluídos') + '.',
      'Situação agora: ' + RelA4_num_(k.abertos, 0) + ' em aberto (' + k.emAnalise + ' em análise, ' + k.visitaAgendada + ' com visita agendada e ' + k.emAtendimento + ' em atendimento).', visitas,
      k.mediaConclusaoMin !== null ? 'Tempo médio da abertura à conclusão: ' + RepD_tempo_(k.mediaConclusaoMin) + '.' : 'Nenhum chamado concluído no período.'];
    quadro = [['Em aberto agora', RelA4_num_(k.abertos, 0) + ' (' + k.emAnalise + ' em análise, ' + k.visitaAgendada + ' com visita agendada, ' + k.emAtendimento + ' em atendimento)', 'sit'],
      ['Abertos no período', RelA4_num_(k.abertosNoPeriodo, 0)], ['Concluídos no período', RelA4_num_(k.concluidos, 0)],
      ['Tempo médio até a conclusão', k.mediaConclusaoMin !== null ? RepD_tempo_(k.mediaConclusaoMin) : 'Sem conclusão no período'],
      ['Próxima visita', k.proximaVisita ? k.proximaVisita.quando + ', ' + k.proximaVisita.numero + ' (' + k.proximaVisita.equipamento + ')' : 'Nenhuma agendada']];
    corpo += RelA4_secao_('Resumo do período', RelA4_kpis_([[RelA4_num_(k.abertos, 0), 'Em aberto agora'], [RelA4_num_(k.abertosNoPeriodo, 0), 'Chamados abertos no período'], [RelA4_num_(k.concluidos, 0), 'Concluídos no período', 'ok'],
      [RepD_tempo_(k.mediaConclusaoMin), 'Tempo médio até a conclusão']]) + '<ul class="rd-destaques">' + destaques.map(function (d) { return '<li>' + RelA4_esc_(d) + '</li>'; }).join('') + '</ul>');
    var porMes = P.porMes.length >= 2 ? RelA4_colunas_(P.porMes.map(function (x) { return { rotulo: x.t, valor: x.n, rotuloValor: String(x.n) }; }), { titulo: 'Chamados abertos por mês', altura: 160 }) :
      '<p class="nota">Chamados abertos por mês: ' + (P.porMes.length ? RelA4_esc_(P.porMes[0].t + ', ' + RelA4_plural_(P.porMes[0].n, 'chamado', 'chamados')) : 'nenhum no período') + ' (o gráfico por mês aparece quando o período tem dois meses ou mais com chamados).</p>';
    corpo += RelA4_secao_('Índices e gráficos', RelA4_barras_(P.porEtapa.map(function (e) { return { rotulo: e.t, valor: e.n, cor: REPD_COR_ETAPA_CLIENTE[e.n0] }; }), { titulo: 'Chamados por etapa (abertos agora e fechados no período)' }) + porMes +
      RelA4_barras_(P.porEquipamento.map(function (x) { return { rotulo: x.t, valor: x.n }; }), { titulo: 'Chamados por equipamento', cor: C.petroleo }) +
      RelA4_barras_(P.porUnidade.map(function (x) { return { rotulo: x.t, valor: x.n }; }), { titulo: 'Chamados por unidade', cor: C.roxo }));
    definicoes = ['Horas úteis: tempo contado só no expediente da Metrolabs.', 'Tempo médio até a conclusão: da abertura do chamado à conclusão do serviço.', 'Chamados por etapa: os que estão abertos agora e os que fecharam no período.'];
  } else {
    var vencidos = abertos.filter(function (x) { return x.prazo && x.prazo.estado === 'VENCIDO'; }), risco = abertos.filter(function (x) { return x.prazo && x.prazo.estado === 'EM_RISCO'; });
    var ap = P.atendimentoPrazo, deTotal = function (n, t, pct) { return t ? RepD_pct_(pct) + ' (' + n + ' de ' + t + ')' : 'Sem registro no período'; };
    destaques = ['Movimento no período: ' + RelA4_plural_(k.enviadosPeriodo, 'pedido enviado', 'pedidos enviados') + ', ' + RelA4_plural_(k.aceite.total, 'aceito', 'aceitos') + ' (' + k.aceite.noPrazo + ' no prazo), ' +
        RelA4_plural_(k.visita.total, 'visita', 'visitas') + ' e ' + RelA4_plural_(k.conclusao.total, 'conclusão', 'conclusões') + '.',
      'Situação agora: ' + RelA4_num_(k.abertos, 0) + ' em aberto: ' + k.aguardandoMetrolabs + ' com a Metrolabs, ' + k.aguardandoRepresentada + ' com a representada e ' + k.aguardandoCliente + ' com o cliente final.',
      vencidos.length ? 'Prazo vencido: ' + listaCurta(vencidos, 6) + '.' : 'Nenhum pedido ou chamado com o prazo vencido agora.', risco.length ? 'Prazo em risco: ' + listaCurta(risco, 6) + '.' : '', visitas,
      k.reincidencia.porEquipamento.length ? 'Reincidência: ' + RelA4_plural_(k.reincidencia.porEquipamento.length, 'equipamento', 'equipamentos') + ' com chamado repetido em até ' + REPP_REINCIDENCIA_DIAS + ' dias (seção "Equipamentos reincidentes").' : ''].filter(Boolean);
    quadro = [['Em aberto agora', RelA4_num_(k.abertos, 0) + ' (' + RelA4_plural_(vencidos.length, 'com prazo vencido', 'com prazo vencido') + ', ' + risco.length + ' em risco)', 'sit'],
      ['Enviados no período', RelA4_num_(k.enviadosPeriodo, 0)], ['Aceite no prazo', deTotal(k.aceite.noPrazo, k.aceite.total, k.aceite.pct)], ['Atendimento no prazo', deTotal(ap.noPrazo, ap.total, ap.pct)],
      ['Tempo médio até a conclusão', k.conclusao.mediaMin !== null && k.conclusao.mediaMin !== undefined ? RepD_tempo_(k.conclusao.mediaMin) : 'Sem conclusão no período'],
      ['Pontos de atenção', vencidos.length ? 'Prazo vencido: ' + listaCurta(vencidos, 4) : risco.length ? 'Prazo em risco: ' + listaCurta(risco, 4) : 'Nenhum prazo vencido ou em risco agora']];
    var kp = [[RelA4_num_(k.abertos, 0), 'Pedidos e chamados abertos'], [RelA4_num_(k.enviadosPeriodo, 0), 'Enviados no período'], [RepD_pct_(k.aceite.pct), 'Aceite no prazo', k.aceite.pct !== null && k.aceite.pct < 80 ? 'aviso' : 'ok'],
      [RepD_pct_(ap.pct), 'Atendimento no prazo', ap.pct !== null && ap.pct < 80 ? 'aviso' : 'ok'], [RepD_tempo_(k.aceite.mediaMin), 'Tempo médio até o aceite'],
      [RepD_tempo_(k.visita.mediaMin), 'Tempo médio até a visita'], [RepD_tempo_(k.conclusao.mediaMin), 'Tempo médio até a conclusão'], [RepD_pct_(k.reincidencia.pct), 'Reincidência', k.reincidencia.reincidentes ? 'critico' : '']];
    if (interno) kp.splice(4, 0, [RepD_pct_(k.primeiroContato.pct), 'Primeiro contato no prazo'], [RelA4_num_(k.vencidos, 0), 'Prazo vencido agora', k.vencidos ? 'critico' : 'ok']);
    corpo += RelA4_secao_('Resumo do período', RelA4_kpis_(kp) + '<ul class="rd-destaques">' + destaques.map(function (d) { return '<li>' + RelA4_esc_(d) + '</li>'; }).join('') + '</ul>');
    var g = '';
    g += RelA4_barras_(k.porEtapa.map(function (e) { return { rotulo: e.t, valor: e.n }; }), { titulo: 'Pedidos e chamados por etapa (abertos agora e fechados no período)' });
    g += RelA4_barrasEmpilhadas_([{ rotulo: 'Aceite do pedido', partes: [k.aceite.noPrazo, k.aceite.total - k.aceite.noPrazo], rotuloValor: k.aceite.noPrazo + ' de ' + k.aceite.total + ' no prazo (' + RepD_pct_(k.aceite.pct) + ')' },
      { rotulo: 'Atendimento do chamado', partes: [ap.noPrazo, ap.total - ap.noPrazo], rotuloValor: ap.noPrazo + ' de ' + ap.total + ' no prazo (' + RepD_pct_(ap.pct) + ')' }]
      .concat(interno ? [{ rotulo: 'Primeiro contato', partes: [k.primeiroContato.noPrazo, k.primeiroContato.total - k.primeiroContato.noPrazo], rotuloValor: k.primeiroContato.noPrazo + ' de ' + k.primeiroContato.total + ' no prazo (' + RepD_pct_(k.primeiroContato.pct) + ')' }] : []),
      [{ rotulo: 'No prazo', cor: C.verde }, { rotulo: 'Fora do prazo', cor: C.vermelho }], { titulo: 'Prazo cumprido no período', vazio: 'Nenhum aceite ou atendimento concluído no período.' });
    var tempos = [{ rotulo: 'Do envio ao aceite', min: k.aceite.mediaMin }].concat(interno ? [{ rotulo: 'Do aceite ao primeiro contato', min: k.primeiroContato.mediaMin }] : [], [{ rotulo: 'Do envio à visita', min: k.visita.mediaMin }, { rotulo: 'Do envio à conclusão', min: k.conclusao.mediaMin }]);
    g += RelA4_barras_(tempos.map(function (t) { var sem = t.min === null || t.min === undefined; return { rotulo: t.rotulo, valor: sem ? 0 : t.min, rotuloValor: sem ? 'sem registro no período' : RepD_tempo_(t.min) }; }), { titulo: 'Tempos médios (horas úteis do expediente da Metrolabs)', cor: C.azul });
    g += RelA4_barras_(k.porCliente.map(function (x) { return { rotulo: x.t, valor: x.n }; }), { titulo: 'Pedidos e chamados por cliente (enviados no período)', cor: C.petroleo });
    g += RelA4_barras_(k.porUf.map(function (x) { return { rotulo: x.t, valor: x.n }; }), { titulo: 'Por UF (enviados no período)', cor: C.roxo });
    g += RelA4_barras_(k.garantia.map(function (x) { return { rotulo: x.t, valor: x.n, cor: x.codigo === 'EM_GARANTIA' ? C.verde : x.codigo === 'FORA' ? C.laranja : C.cinza }; }), { titulo: 'Garantia pelo cadastro do equipamento (enviados no período)' });
    g += RelA4_barrasEmpilhadas_(k.reincidencia.porModelo.map(function (x) { return { rotulo: x.t, partes: [x.n - x.reincidentes, x.reincidentes], rotuloValor: x.reincidentes + ' reincidente(s) de ' + x.n }; }),
      [{ rotulo: 'Sem reincidência', cor: C.azul }, { rotulo: 'Reincidente (mesmo equipamento em até ' + REPP_REINCIDENCIA_DIAS + ' dias)', cor: C.vermelho }], { titulo: 'Reincidência por modelo (chamados no período)', vazio: 'Nenhum chamado no período.' });
    corpo += RelA4_secao_('Índices e gráficos', g);
    if (k.reincidencia.porEquipamento.length) corpo += RelA4_secao_('Equipamentos reincidentes', RelA4_tabela_([{ t: 'Equipamento · cliente' }, { t: 'Reincidências', num: true }], k.reincidencia.porEquipamento.map(function (x) { return [x.t, String(x.n)]; }), { legenda: 'Equipamentos com chamado repetido em até ' + REPP_REINCIDENCIA_DIAS + ' dias' }));
    definicoes = ['Horas úteis: tempo contado só no expediente da Metrolabs, descontada a espera do complemento da representada.',
      'Aceite no prazo: pedidos aceitos no período dentro do prazo de aceite combinado com a representada.', 'Atendimento no prazo: chamados concluídos no período dentro do prazo de atendimento.',
      'Tempos médios: contados do envio do pedido; a visita é a chegada do técnico ao local.'].concat(interno ? ['Primeiro contato: do aceite ao primeiro registro da Metrolabs no chamado (triagem assumida ou iniciada, ou mensagem à representada).'] : [],
      ['Reincidência: chamado de um equipamento que já teve outro chamado em até ' + REPP_REINCIDENCIA_DIAS + ' dias.', 'Garantia pelo cadastro: a garantia registrada no cadastro do equipamento, não o enquadramento pedido na abertura.',
        'Por etapa: os abertos agora e os que fecharam no período. Por cliente, UF e garantia: os enviados no período.']);
  }
  // Gantt (folha deitada) e lista
  var gantt = RelA4_secao_('Gantt da carteira', RepD_ganttHtml_(P, !cliente));
  var cols = cliente ? [{ t: 'Chamado', nw: true }, { t: 'Equipamento' }, { t: 'Unidade' }, { t: 'Etapa' }, { t: 'Aberto em', nw: true }, { t: 'Concluído em', nw: true }] :
    [{ t: 'Nº', nw: true }].concat(interno ? [{ t: 'Representada', w: '26mm' }] : [], [{ t: 'Cliente', w: interno ? '40mm' : '34mm' }, { t: 'Equipamento', w: interno ? '40mm' : '34mm' }, { t: 'Etapa' }, { t: 'Enviado', nw: true }, { t: 'Concluído', nw: true }, { t: 'Prazo' }], interno ? [{ t: 'Técnico', w: '28mm' }] : []);
  var linhas = P.itens.map(function (x) {
    var eq = RepD_eqPartes_(x.equipamento);
    if (cliente) return [x.numero, RepD_cel2_(eq[0], eq[1]), x.unidade, x.etapaNome, String(x.abertoEm).slice(0, 10), RepD_dia_(x.conclusaoMs) || '—'];
    var pz = x.prazo && x.prazo.estado !== 'SEM_PRAZO' ? RelA4_marca_(REPD_NOME_PRAZO[x.prazo.estado], { NO_PRAZO: 'neutra', EM_RISCO: 'aviso', VENCIDO: 'critico', PAUSADO: 'neutra', CUMPRIDO: 'ok', FORA_DO_PRAZO: 'critico' }[x.prazo.estado]) : '—';
    var sub = [x.tipo === 'CHAMADO' && x.pedidoNumero ? 'pedido ' + x.pedidoNumero : '', x.reincidente ? 'reincidente' : ''];
    return [RepD_cel2_(x.numero, sub)].concat(interno ? [x.representada] : [], [RepD_cel2_(x.cliente, x.cidade), RepD_cel2_(eq[0], eq[1]), x.etapaNome, RepD_dia_(x.enviadoMs), RepD_dia_(x.conclusaoMs) || '—', pz], interno ? [x.tecnico || '—'] : []);
  });
  var lista = RelA4_secao_(cliente ? 'Chamados do período' : 'Pedidos e chamados do período', RelA4_tabela_(cols, linhas, { legenda: 'Abertos agora e os que foram enviados ou fecharam no período', compacta: true }).replace('<table class="t', '<table class="t rd-lista'));
  corpo += interno ? RelA4_paisagem_(gantt + lista) : RelA4_paisagem_(gantt) + lista;
  if (interno) {
    corpo += RelA4_secao_('Prazo de atendimento por prioridade', RelA4_tabela_([{ t: 'Prioridade' }, { t: 'Atendidos', num: true }, { t: 'No prazo', num: true }, { t: '% no prazo', num: true }, { t: 'Média até a visita', num: true }, { t: 'Abertos', num: true }, { t: 'Em risco', num: true }, { t: 'Vencidos', num: true }],
      k.slaPorPrioridade.map(function (s) { return [s.t, String(s.atendidos), String(s.noPrazo), RepD_pct_(s.pct), RepD_tempo_(s.mediaVisitaMin), String(s.abertos), String(s.emRisco), String(s.vencidos)]; }), { legenda: 'SLA por prioridade (' + P.dias + ' dias)' }));
    corpo += RelA4_secao_('Carga por técnico', RelA4_barrasEmpilhadas_(k.cargaTecnico.map(function (t) { return { rotulo: t.nome, partes: [t.abertos - t.vencidos - t.emRisco, t.emRisco, t.vencidos], rotuloValor: t.abertos + ' aberto(s) · ' + t.agendados + ' com visita' }; }),
      [{ rotulo: 'No prazo', cor: C.azul }, { rotulo: 'Em risco', cor: C.ambar }, { rotulo: 'Vencido', cor: C.vermelho }], { titulo: 'Chamados abertos por técnico', vazio: 'Nenhum chamado aberto.' }) +
      RelA4_tabela_([{ t: 'Técnico' }, { t: 'Abertos', num: true }, { t: 'Visita agendada', num: true }, { t: 'Em risco', num: true }, { t: 'Vencidos', num: true }], k.cargaTecnico.map(function (t) { return [t.nome, String(t.abertos), String(t.agendados), String(t.emRisco), String(t.vencidos)]; }), { legenda: 'Carga por técnico (abertos agora)', vazio: 'Nenhum chamado aberto.' }));
    corpo += RelA4_secao_('Fila de pedidos e representadas', RelA4_tabela_([{ t: 'Pedido', nw: true }, { t: 'Representada' }, { t: 'Cliente' }, { t: 'Idade', num: true }, { t: 'Prazo de aceite' }], k.fila.map(function (f) { return [f.numero, f.representada, f.cliente, RepD_tempo_(f.idadeMin), f.prazo.texto || REPD_NOME_PRAZO[f.prazo.estado] || '—']; }), { legenda: 'Fila de pedidos aguardando o aceite', vazio: 'Nenhum pedido na fila.' }) +
      RelA4_tabela_([{ t: 'Representada' }, { t: 'Abertos', num: true }, { t: 'Na fila', num: true }, { t: 'Vencidos', num: true }, { t: 'Enviados', num: true }, { t: 'Aceite no prazo', num: true }], k.porRepresentada.map(function (r) { return [r.nome, String(r.abertos), String(r.fila), String(r.vencidos), String(r.enviados), RepD_pct_(r.aceitePct)]; }), { legenda: 'Por representada' }));
  }
  corpo += RelA4_secao_('Como ler este relatório', '<ul class="rd-destaques">' + definicoes.map(function (d) { return '<li>' + RelA4_esc_(d) + '</li>'; }).join('') + '</ul>' +
    RepD_glossarioHtml_(cliente ? REPD_GLOSSARIO_CLIENTE : REPD_GLOSSARIO_REP, cliente ? 'Etapas de "Meus chamados"' : 'Etapas que a representada acompanha') +
    '<p class="nota">Gerado pelo SGO+ em ' + RelA4_esc_(RepD_br_(P.agoraMs)) + ' por ' + RelA4_esc_(m.por || '—') + '. Período: ' + RelA4_esc_(P.de + ' a ' + P.ate) + ' (' + P.dias + ' dias). Fórmulas: manual do módulo, seção "Painel".</p>');
  var html = RelA4_documento_({ titulo: cliente ? 'Relatório do período · Assistência técnica' : 'Relatório do período · Representação', subtitulo: P.escopoNome, tituloCurto: 'Relatório do período ' + P.de + ' a ' + P.ate + ' · ' + versao,
    tituloArquivo: 'Relatorio do periodo', numero: m.numero, revisao: 0, emitidoPor: m.por, identificacao: P.de + ' a ' + P.ate + ' (' + P.dias + ' dias)', ficha: [[cliente ? 'Cliente' : 'Representada', P.escopoNome]],
    tipoCapa: 'Relatório gerencial · ' + versao, corpo: corpo, capa: true, sumario: true });
  var reg = RelA4_registro_(html); if (reg) reg.semSumario = null;
  return RepD_acabamento_(html, RepD_quadro_('Situação em ' + RepD_br_(P.agoraMs), quadro), aviso, interno);
}

// ------------------------------------------------------------
// GRAVAÇÃO E REGISTRO
// ------------------------------------------------------------
function RepD_pastaRaiz_() { return SGO_DocSalvar_pastaPersistente_('REP_PASTA_DOCS_ID', REPD_PASTA, ''); }
/** Pasta de cada público: cliente na pasta do equipamento (prontuário); representada e interno na pasta própria do módulo. */
function RepD_pasta_(publico, o) {
  var ano = Ast_hoje_().slice(0, 4);
  if (publico === 'CLIENTE') {
    if (o.chamado) return Ast_pastaRelatorio_({ CLIENTE_ID: o.chamado.CLIENTE_ID, UNIDADE_ID: o.chamado.UNIDADE_ID, EQUIPAMENTO_ID: o.chamado.EQUIPAMENTO_ID, CLIENTE_NOME: o.chamado.CLIENTE_NOME });
    var cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[o.clienteId] || {};
    return Ast_subpasta_(SGO_DocSalvar_pastaClienteEm_(SGO_DocSalvar_pastaPersistente_('ATEC_PASTA_DOCS_ID', AST_PASTA_DOCS, ''), cli.CNPJ, Ast_clienteNome_(cli) || 'Sem cliente'), 'Relatórios do período');
  }
  var raiz = RepD_pastaRaiz_(), base = Ast_subpasta_(Ast_subpasta_(raiz, publico === 'INTERNO' ? 'Metrolabs - uso interno' : (RepD_s_(o.repNome) || 'Representada') + ' - ' + RepD_s_(o.repId)), ano);
  return Ast_subpasta_(base, o.chamado ? RepD_s_(o.chamado.NUMERO) : 'Relatórios do período');
}
/** Grava HTML + PDF, registra em REP_DOCUMENTOS (e a versão do cliente de um chamado no Arquivo de documentos). Lança erro legível. */
function RepD_salvar_(eu, html, reg, o) {
  var nome = RelA4_nomeArquivo_(reg.TIPO === 'PERIODO' ? 'Relatorio do periodo' : 'Relatorio do atendimento', reg.NUMERO, [reg.PUBLICO === 'INTERNO' ? 'interno' : reg.PUBLICO === 'CLIENTE' ? 'cliente' : 'representada', 'v' + reg.VERSAO, RepD_s_(o.identificador).slice(0, 60)].filter(Boolean).join(' '));
  var fin = RelA4_finalizar_(html, nome);
  var pasta = RepD_pasta_(reg.PUBLICO, o);
  var g = SGO_DocSalvar_salvarHtmlEPdf_(pasta, nome, fin.html, fin.pdfBlob ? { compartilhar: false, pdfBlob: fin.pdfBlob } : { compartilhar: false });
  var pastaUrl = ''; try { pastaUrl = pasta.getUrl(); } catch (e) {}
  var registrado = '';
  if (reg.PUBLICO === 'CLIENTE' && o.chamado && typeof AstR_registrarNoArquivo_ === 'function')
    registrado = AstR_registrarNoArquivo_(eu && eu.externo ? null : eu, { CLIENTE_ID: o.chamado.CLIENTE_ID, UNIDADE_ID: o.chamado.UNIDADE_ID, EQUIPAMENTO_ID: o.chamado.EQUIPAMENTO_ID }, g.pdfNome || nome, g.pdfUrl, 'RELATÓRIO DE ATENDIMENTO') ? 'SIM' : '';
  var r = Rep_inserir_(REPD_ABA, Object.assign({}, reg, { HTML_ID: g.htmlId, PDF_ID: g.pdfId, PASTA_URL: pastaUrl, PAGINAS: fin.paginas || '', DOC_REGISTRADO: registrado,
    GERADO_POR_ID: RepD_s_(eu && eu.id), GERADO_POR_NOME: eu ? (eu.externo ? Rep_quem_(eu) : RepD_s_(eu.nome)) : 'Rotina', GERADO_POR_LADO: eu && eu.externo ? 'REPRESENTADA' : eu && eu.cliente ? 'CLIENTE' : 'METROLABS', EM: Ast_agora_() }));
  if (reg.CHAMADO_ID) Ast_evento_('CHAMADO', reg.CHAMADO_ID, 'RELATORIO_ATENDIMENTO', eu && eu.externo ? Rep_comoAst_(eu) : eu, 'Relatório do atendimento (' + REPD_VERSAO_TXT[reg.PUBLICO] + ', v' + reg.VERSAO + ') gerado e salvo em HTML e PDF', { numero: reg.CHAMADO_NUMERO });
  return RepD_publicoDoc_(r);
}

/** Gera o relatório do atendimento de um chamado já conferido pelo escopo de quem pede. */
function RepD_gerarAtendimento_(eu, c, publico) {
  try { Rep_garantirAbas_(); } catch (e0) {}
  if (!REPD_PUBLICOS[publico]) throw Rep_erro_('INCOMPLETO', 'Não foi possível gerar: escolha a versão do relatório (Metrolabs, representada ou cliente).');
  if (publico === 'REPRESENTADA' && !RepD_s_(c.REPRESENTADA_ID)) throw Rep_erro_('INCOMPLETO', 'Não foi possível gerar a versão da representada: o chamado ' + c.NUMERO + ' não veio de uma representada. Gere a versão do cliente ou a interna.');
  var agoraMs = Date.now(), D = RepD_coletar_(c, agoraMs), V = RepD_visao_(D, publico);
  var ant = RepD_registros_().filter(function (r) { return Rep_up_(r.TIPO) === 'ATENDIMENTO' && RepD_s_(r.CHAMADO_ID) === RepD_s_(c.ID) && Rep_up_(r.PUBLICO) === publico; }).length;
  var numero = 'RAT-' + RepD_s_(c.NUMERO).replace(/^CH-/, '') + '-' + { INTERNO: 'M', REPRESENTADA: 'R', CLIENTE: 'C' }[publico];
  var marca = Ast_marca_(JSON.stringify([numero, ant + 1, V.linha.length, V.fotos.map(function (f) { return f.arquivoId; }), V.servico, V.conversa.length, V.etapaNome]));
  var html = RepD_htmlAtendimento_(V, { numero: numero, revisao: ant, versao: ant + 1, marca: marca, por: eu ? (eu.externo ? Rep_quem_(eu) : eu.nome) : 'Rotina' });
  var doc = RepD_salvar_(eu, html, { TIPO: 'ATENDIMENTO', PUBLICO: publico, REPRESENTADA_ID: RepD_s_(c.REPRESENTADA_ID), CLIENTE_ID: RepD_s_(c.CLIENTE_ID), UNIDADE_ID: RepD_s_(c.UNIDADE_ID), EQUIPAMENTO_ID: RepD_s_(c.EQUIPAMENTO_ID),
    CHAMADO_ID: RepD_s_(c.ID), CHAMADO_NUMERO: RepD_s_(c.NUMERO), NUMERO: numero, VERSAO: ant + 1, TITULO: 'Relatório do atendimento ' + c.NUMERO, MARCA: marca, FOTOS: Math.min(V.fotos.length, REPD_MAX_FOTOS) },
    { chamado: c, repId: RepD_s_(c.REPRESENTADA_ID), repNome: RepD_s_(c.REPRESENTADA_NOME), identificador: c.CLIENTE_NOME });
  return { documento: doc, message: 'Relatório do atendimento ' + c.NUMERO + ' (' + REPD_VERSAO_TXT[publico] + ', emissão ' + doc.versao + ') gerado e salvo em HTML e PDF. Ele fica em "Relatórios gerados" para abrir de novo.' };
}
/** Gera o relatório do período. o: { dias, representadaId, clienteId }. */
function RepD_gerarPeriodo_(eu, publico, o) {
  try { Rep_garantirAbas_(); } catch (e0) {}
  var P = RepD_visaoPeriodo_(publico, Object.assign({ agoraMs: Date.now(), eu: publico === 'INTERNO' ? eu : null }, o));
  var numero = RelA4_numero_(publico === 'CLIENTE' ? 'RPC' : publico === 'INTERNO' ? 'RPM' : 'RPR');
  var html = RepD_htmlPeriodo_(P, { numero: numero, por: eu ? (eu.externo ? Rep_quem_(eu) : eu.nome) : 'Rotina' });
  var doc = RepD_salvar_(eu, html, { TIPO: 'PERIODO', PUBLICO: publico, REPRESENTADA_ID: publico === 'CLIENTE' ? '' : RepD_s_(P.representadaId), CLIENTE_ID: publico === 'CLIENTE' ? RepD_s_(P.clienteId) : '', NUMERO: numero, VERSAO: 1,
    TITULO: 'Relatório do período ' + P.de + ' a ' + P.ate, PERIODO_DIAS: P.dias, PERIODO_DE: P.de, PERIODO_ATE: P.ate },
    { repId: P.representadaId, repNome: P.escopoNome, clienteId: P.clienteId, identificador: P.escopoNome });
  return { documento: doc, message: 'Relatório do período de ' + P.de + ' a ' + P.ate + ' (' + REPD_VERSAO_TXT[publico] + ') gerado e salvo em HTML e PDF. Ele fica em "Relatórios gerados".' };
}

// ------------------------------------------------------------
// AÇÕES (Representacao_api e Assistencia_api)
// ------------------------------------------------------------
/** Representada: relatório do atendimento de um chamado dela (sempre a versão da representada). */
function RepDA_relatorioAtendimento_(eu, d) {
  if (Rep_up_(d && d.tipo) === 'SOLICITACAO') throw Rep_erro_('INCOMPLETO', 'Não foi possível gerar: o relatório do atendimento sai quando o pedido vira chamado. Acompanhe o pedido pela ficha e pela conversa.');
  return RepD_gerarAtendimento_(eu, Rep_escopo_(eu).chamado(d && d.id), 'REPRESENTADA');
}
function RepDA_relatorioPeriodo_(eu, d) { return RepD_gerarPeriodo_(eu, 'REPRESENTADA', { dias: d && d.dias, representadaId: eu.repId }); }
/** Lista de documentos que este usuário pode abrir. f: { chamadoId, tipo } */
function RepD_listar_(filtro, f) {
  f = f || {};
  return { documentos: RepD_registros_().filter(function (r) { return filtro(r) && (!f.chamadoId || RepD_s_(r.CHAMADO_ID) === RepD_s_(f.chamadoId)) && (!f.tipo || Rep_up_(r.TIPO) === Rep_up_(f.tipo)); })
    .sort(function (a, b) { return String(b.EM).localeCompare(String(a.EM)); }).slice(0, 200).map(RepD_publicoDoc_) };
}
function RepDA_documentos_(eu, d) {
  if (d && d.chamadoId) Rep_escopo_(eu).chamado(d.chamadoId);
  return RepD_listar_(function (r) { return RepD_s_(r.REPRESENTADA_ID) === eu.repId && Rep_up_(r.PUBLICO) === 'REPRESENTADA'; }, d);
}
/** Metrolabs: qualquer versão de um chamado que a pessoa pode ver. */
function RepDI_relatorioAtendimento_(eu, d) {
  var c = Ast_porId_(AST_ABAS.CHAMADOS, d && d.id);
  if (!c || !AstC_podeVer_(eu, c)) throw Rep_erro_('NAO_ENCONTRADO', 'Não foi possível gerar: chamado não encontrado entre os que você acompanha. Atualize a lista.');
  return RepD_gerarAtendimento_(eu, c, Rep_up_(d && d.publico) || 'INTERNO');
}
function RepDI_relatorioPeriodo_(eu, d) {
  var publico = Rep_up_(d && d.publico) || 'INTERNO';
  if (publico === 'CLIENTE') throw Rep_erro_('INCOMPLETO', 'Não foi possível gerar: o relatório do período do cliente sai em "Meus chamados" pelo próprio cliente, ou pela ficha do chamado na Assistência.');
  if (publico === 'REPRESENTADA' && !RepD_s_(d && d.representadaId)) throw Rep_erro_('INCOMPLETO', 'Não foi possível gerar a versão da representada: escolha a representada no filtro do painel.');
  return RepD_gerarPeriodo_(eu, publico, { dias: d && d.dias, representadaId: RepD_s_(d && d.representadaId) });
}
function RepDI_documentos_(eu, d) {
  d = d || {};
  var podeVer = {};
  Ast_ler_(AST_ABAS.CHAMADOS).forEach(function (c) { if (AstC_podeVer_(eu, c)) podeVer[RepD_s_(c.ID)] = true; });
  return RepD_listar_(function (r) {
    return (!d.representadaId || RepD_s_(r.REPRESENTADA_ID) === RepD_s_(d.representadaId)) && (!d.publico || Rep_up_(r.PUBLICO) === Rep_up_(d.publico)) && (!RepD_s_(r.CHAMADO_ID) || podeVer[RepD_s_(r.CHAMADO_ID)]);
  }, d);
}
/** Cliente do portal: só a versão do cliente, só dos chamados dele. */
function RepDC_relatorioAtendimento_(eu, d) {
  var c = Ast_porId_(AST_ABAS.CHAMADOS, d && d.id);
  if (!c || !eu.clienteId || RepD_s_(c.CLIENTE_ID) !== eu.clienteId) throw new Error('Não foi possível gerar: o chamado não está entre os seus. Atualize "Meus chamados"');
  return RepD_gerarAtendimento_(eu, c, 'CLIENTE');
}
function RepDC_relatorioPeriodo_(eu, d) {
  if (!eu.clienteId) throw new Error('Não foi possível gerar: o seu login não está ligado a um cliente. Fale com a Metrolabs para corrigir o acesso');
  return RepD_gerarPeriodo_(eu, 'CLIENTE', { dias: d && d.dias, clienteId: eu.clienteId });
}
function RepDC_documentos_(eu, d) {
  return RepD_listar_(function (r) { return Rep_up_(r.PUBLICO) === 'CLIENTE' && RepD_s_(r.CLIENTE_ID) === eu.clienteId; }, d);
}

/** Fotos do chamado com a liberação atual (Metrolabs). */
function RepD_fotosDoChamado_(eu, d) {
  var c = Ast_porId_(AST_ABAS.CHAMADOS, d && d.id);
  if (!c || !AstC_podeVer_(eu, c)) throw new Error('Não foi possível abrir: chamado não encontrado entre os que você acompanha');
  var oss = {}; Ast_ler_(AST_ABAS.OS).forEach(function (o) { if (RepD_s_(o.CHAMADO_ID) === RepD_s_(c.ID)) oss[RepD_s_(o.ID)] = RepD_s_(o.NUMERO); });
  return { fotos: Ast_ler_(AST_ABAS.FOTOS).filter(function (f) { return oss[RepD_s_(f.OS_ID)] && Ast_up_(f.ATIVA || 'SIM') !== 'NAO'; }).map(function (f) {
    return { id: RepD_s_(f.ID), os: oss[RepD_s_(f.OS_ID)], legenda: RepD_s_(f.LEGENDA), nome: RepD_s_(f.NOME), em: Ast_br_(f.TIRADA_EM || f.RECEBIDA_EM), por: RepD_s_(f.POR_NOME), url: '/arquivos/' + RepD_s_(f.ARQUIVO_ID),
      publico: Ast_up_(f.PUBLICO), publicoNome: REPD_FOTO_LIBERACAO[Ast_up_(f.PUBLICO)] || REPD_FOTO_LIBERACAO[''], reduzida: !!RepD_s_(f.RELATORIO_ARQUIVO_ID), liberadaPor: RepD_s_(f.LIBERADA_POR_NOME), liberadaEm: Ast_br_(f.LIBERADA_EM) };
  }), liberacoes: REPD_FOTO_LIBERACAO, temRepresentada: !!RepD_s_(c.REPRESENTADA_ID), podeLiberar: !!eu.gestao || Rep_responsaveis_().ids.indexOf(eu.id) >= 0 };
}
/**
 * Libera (ou recolhe) a foto para os documentos externos. d: { fotoId, publico: ''|'REPRESENTADA'|'SIM', reduzida: { base64, tipo } }.
 * Gestão da área Técnica e responsáveis pela representação. A cópia reduzida (feita no navegador) vai para a pasta privada da O.S.
 */
function RepD_liberarFoto_(eu, d) {
  d = d || {};
  if (!eu.gestao && Rep_responsaveis_().ids.indexOf(eu.id) < 0) throw new Error('Não foi possível liberar a foto: a liberação para o cliente e a representada é da gestão da área Técnica e dos responsáveis pela representação. Peça a um deles');
  var f = Ast_porId_(AST_ABAS.FOTOS, d.fotoId);
  if (!f) throw new Error('Não foi possível liberar: foto não encontrada. Atualize a ficha do chamado');
  var os = Ast_porId_(AST_ABAS.OS, f.OS_ID), c = os ? Ast_porId_(AST_ABAS.CHAMADOS, os.CHAMADO_ID) : null;
  if (!c || !AstC_podeVer_(eu, c)) throw new Error('Não foi possível liberar: o chamado desta foto não está entre os que você acompanha');
  var pub = Rep_up_(d.publico);
  if (['', 'REPRESENTADA', 'SIM'].indexOf(pub) < 0) throw new Error('Não foi possível liberar: escolha para quem a foto fica visível');
  if (pub === 'REPRESENTADA' && !RepD_s_(c.REPRESENTADA_ID)) throw new Error('Não foi possível liberar só à representada: o chamado ' + c.NUMERO + ' não veio de representada');
  var campos = { PUBLICO: pub, LIBERADA_POR_NOME: eu.nome, LIBERADA_EM: Ast_agora_() };
  var red = d.reduzida && RepD_s_(d.reduzida.base64) ? d.reduzida : null;
  if (red) {
    var bytes = Utilities.base64Decode(RepD_s_(red.base64));
    if (bytes.length > REPD_FOTO_MAX_BYTES) throw new Error('Não foi possível guardar a cópia reduzida: ficou com ' + Math.round(bytes.length / 1024) + ' KB (limite ' + Math.round(REPD_FOTO_MAX_BYTES / 1024) + ' KB). Atualize a página e libere de novo');
    var arq = Ast_pastaPrivadaOS_(os.NUMERO).createFile(Utilities.newBlob(bytes, 'image/jpeg', 'relatorio_' + RepD_s_(f.NOME || f.ID).replace(/\.[a-z0-9]+$/i, '') + '.jpg'));
    Ast_privado_(arq);
    campos.RELATORIO_ARQUIVO_ID = arq.getId();
  }
  Ast_atualizar_(AST_ABAS.FOTOS, f.ID, campos);
  Ast_evento_('OS', os.ID, 'FOTO_LIBERACAO', eu, 'Foto "' + (RepD_s_(f.LEGENDA) || RepD_s_(f.NOME)) + '": ' + REPD_FOTO_LIBERACAO[pub].toLowerCase(), { numero: os.NUMERO });
  return { message: 'Foto: ' + REPD_FOTO_LIBERACAO[pub].toLowerCase() + '.' + (red ? ' Cópia reduzida guardada para os relatórios.' : '') };
}

/** Rota /arquivos (servidor próprio): a representada abre o documento gerado se for da versão dela, da representada dela. */
function RepD_arquivoDaRepresentada_(repId, arquivoId) {
  var id = RepD_s_(arquivoId);
  return !!id && RepD_registros_().some(function (r) { return RepD_s_(r.REPRESENTADA_ID) === RepD_s_(repId) && Rep_up_(r.PUBLICO) === 'REPRESENTADA' && (RepD_s_(r.HTML_ID) === id || RepD_s_(r.PDF_ID) === id); });
}
/** Rota /arquivos (servidor próprio, 30/10/2026): o login de cliente só abre documento da Representação se for a versão do cliente
    dele. Arquivo que não é documento da Representação segue a regra de sempre (login válido). */
function Representacao_arquivoClientePermitido_(sessionId, arquivoId) {
  try {
    Rep_memoLimpar_(); Ast_memoLimpar_();
    var id = RepD_s_(arquivoId);
    if (!id) return false;
    var regs = RepD_registros_().filter(function (r) { return RepD_s_(r.HTML_ID) === id || RepD_s_(r.PDF_ID) === id; });
    if (!regs.length) return true;
    var eu = Ast_eu_(sessionId);
    return !!eu.clienteId && regs.some(function (r) { return Rep_up_(r.PUBLICO) === 'CLIENTE' && RepD_s_(r.CLIENTE_ID) === eu.clienteId; });
  } catch (e) { return false; }
}
