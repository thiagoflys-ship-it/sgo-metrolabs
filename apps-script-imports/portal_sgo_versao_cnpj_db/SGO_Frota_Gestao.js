/****************************************************
 * FROTA — GESTÃO E MELHORIA (19/10/2026)
 *
 * Metodologias de gestão para uma frota pequena, no mesmo padrão do Programa de
 * conduta (SGO_Conduta_Qualidade.js), reaproveitando o que lá é genérico
 * (Cndq_json_, Cndq_hist_, Cndq_atividadesDoPlano_):
 *
 * 1. Kanban dos casos: Aberta -> Em análise -> Em execução -> Concluída.
 *    "Aberta" mostra o que precisa de tratamento sem ninguém digitar nada:
 *    avaria na devolução (item em ordem na retirada e com problema na volta),
 *    multa em aberto e manutenção vencida ou a vencer. Nada vira caso sozinho:
 *    a gestão clica em "Abrir caso" (ou "Descartar", com motivo).
 * 2. Análise de causa (5 Porquês) no próprio caso. Obrigatória para concluir
 *    caso recorrente (2 avarias no mesmo veículo ou com o mesmo condutor em
 *    180 dias; 2 multas do mesmo condutor em 12 meses).
 * 3. Plano de ação 5W2H com o ciclo PDCA: cada ação é uma atividade de Minhas
 *    atividades no módulo "frota" (responsável e prazo); não existe outro
 *    sistema de tarefas. Concluir pede a verificação da eficácia; ação que não
 *    resolveu volta o caso para Em análise (novo ciclo).
 * 4. Indicadores do período: custo por km, consumo, disponibilidade, avarias,
 *    multas por condutor, manutenção preventiva feita no prazo e os casos.
 *
 * Tabela própria REG_FROTA_CASO, criada sob demanda (só tabela nova). Nada é
 * apagado: descarte e cancelamento ficam com quem decidiu, quando e o motivo.
 * Só a gestão (Administrador, Gestor, Diretoria).
 ****************************************************/

var FROTA_ABA_CASO = 'REG_FROTA_CASO';
var FROTA_COLUNAS_CASO = ['ID', 'CODIGO', 'TIPO', 'ORIGEM_CHAVE', 'ORIGEM_ID', 'VEICULO_ID', 'PLACA', 'CONDUTOR_ID', 'CONDUTOR_NOME', 'DATA_FATO', 'TITULO', 'DESCRICAO',
  'ETAPA', 'RESPONSAVEL_ID', 'RESPONSAVEL_NOME', 'PORQUES_JSON', 'CAUSA_RAIZ', 'O_QUE', 'POR_QUE', 'ONDE', 'QUANDO', 'QUEM_ID', 'QUEM_NOME', 'COMO', 'QUANTO',
  'ATIVIDADES_JSON', 'CICLO', 'VERIFICACAO_TEXTO', 'EFICAZ', 'RESOLUCAO', 'PADRONIZACAO_TEXTO', 'CONCLUIDO_EM', 'CANCELADO_EM', 'CANCELADO_MOTIVO',
  'HISTORICO_JSON', 'CRIADO_POR_ID', 'CRIADO_POR_NOME', 'ATUALIZADO_EM', 'CRIADO_EM'];
var FROTA_CASO_TIPOS = { AVARIA: 'Avaria', MULTA: 'Multa', MANUTENCAO: 'Manutenção', OUTRO: 'Outro' };
var FROTA_CASO_ETAPAS = { ABERTA: 'Aberta', ANALISE: 'Em análise', EXECUCAO: 'Em execução', CONCLUIDA: 'Concluída', CANCELADA: 'Descartada' };
var FROTA_CASO_COLUNAS = [
  { id: 'ABERTA', nome: 'Aberta', ajuda: 'O que precisa de tratamento. Abra o caso para analisar ou descarte com o motivo.' },
  { id: 'ANALISE', nome: 'Em análise', ajuda: 'Descubra a causa (5 Porquês) e decida: resolver direto ou criar o plano de ação.' },
  { id: 'EXECUCAO', nome: 'Em execução', ajuda: 'Plano 5W2H em andamento: as ações estão em Minhas atividades.' },
  { id: 'CONCLUIDA', nome: 'Concluída', ajuda: 'Resolvido e verificado.' }
];
var FROTA_JANELA_AVARIA_DIAS = 90;       // avarias desta janela aparecem em "Aberta"
var FROTA_RECORRENCIA_AVARIA_DIAS = 180; // 2 avarias no mesmo veículo ou com o mesmo condutor = recorrente
var FROTA_RECORRENCIA_MULTA_DIAS = 365;  // 2 multas do mesmo condutor em 12 meses = recorrente

// ------------------------------------------------------------
// BASE
// ------------------------------------------------------------
function FrotaG_exigirGestao_(sessionId) {
  var sessao = Frota_exigirEquipe_(sessionId);
  if (!Frota_ehGestao_(sessionId)) {
    throw new Error('Gestão e melhoria da Frota é da gestão (Administrador, Gestor ou Diretoria). Para retirar e devolver veículo, use a aba Situação e retiradas.');
  }
  Frota_bootstrap_();
  CertCal_garantirTabela_(FROTA_ABA_CASO, FROTA_COLUNAS_CASO);
  return sessao;
}

function FrotaG_json_(txt, padrao) { return typeof Cndq_json_ === 'function' ? Cndq_json_(txt, padrao) : (function () { try { var v = JSON.parse(String(txt || '')); return v == null ? padrao : v; } catch (e) { return padrao; } })(); }

function FrotaG_hist_(caso, sessao, acao, texto) {
  if (typeof Cndq_hist_ === 'function') return Cndq_hist_(caso, sessao, acao, texto);
  var h = FrotaG_json_(caso && caso.HISTORICO_JSON, []);
  if (!Array.isArray(h)) h = [];
  h.push({ em: SGO_UTILS.nowIso(), por: String(sessao.nome || sessao.usuario || ''), acao: acao, texto: String(texto || '').slice(0, 600) });
  return JSON.stringify(h);
}

function FrotaG_casos_() { return Frota_lerSeExistir_(FROTA_ABA_CASO); }

/** "dd/mm/aaaa" ou "aaaa-mm-dd" -> "dd/mm/aaaa" ('' se não for data). */
function FrotaG_dataBr_(v) {
  var s = Frota_textoData_(v);
  var iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || '').trim());
  if (iso) s = iso[3] + '/' + iso[2] + '/' + iso[1];
  return Frota_parseDataHora_(s, '00:00') ? s : '';
}

function FrotaG_iso_(br) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(br || '')); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }

function FrotaG_hojeBr_() { return Frota_agoraSP_().data; }

function FrotaG_diasAtras_(dias) {
  var d = Frota_dataDia_(FrotaG_hojeBr_());
  d.setDate(d.getDate() - dias);
  return d;
}

function FrotaG_br_(d) { return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }

function FrotaG_proximoCodigo_(casos) {
  var ano = FrotaG_hojeBr_().slice(-4), max = 0;
  casos.forEach(function (c) { var m = /^FC-(\d{4})-(\d+)$/.exec(String(c.CODIGO || '')); if (m && m[1] === ano) max = Math.max(max, Number(m[2])); });
  return 'FC-' + ano + '-' + ('00' + (max + 1)).slice(-3);
}

function FrotaG_usuariosAtivos_() {
  return Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) {
    return SGO_UTILS.safeUpper(u.STATUS || 'ATIVO') === 'ATIVO' && SGO_UTILS.safeUpper(u.PERFIL) !== 'CLIENTE';
  }).map(function (u) { return { id: SGO_UTILS.safe(u.ID), nome: SGO_UTILS.safe(u.NOME) || SGO_UTILS.safe(u.USUARIO) }; })
    .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
}

// ------------------------------------------------------------
// ORIGENS (só leitura): avaria, multa em aberto, manutenção vencida ou a vencer
// ------------------------------------------------------------
/** Itens que estavam em ordem na retirada e voltaram com problema na devolução. */
function FrotaG_itensAvaria_(m) {
  var saida = FrotaG_json_(m.CHECKLIST_SAIDA_JSON, []), chegada = FrotaG_json_(m.CHECKLIST_CHEGADA_JSON, []);
  var ok = {};
  (Array.isArray(saida) ? saida : []).forEach(function (i) { ok[String(i.grupo) + '|' + String(i.item)] = i.ok !== false; });
  return (Array.isArray(chegada) ? chegada : []).filter(function (i) { return i && i.ok === false && ok[String(i.grupo) + '|' + String(i.item)] !== false; });
}

/** Todas as avarias de devoluções desde "desde" (Date): { movId, veiculoId, condutorId, data, itens }. */
function FrotaG_avarias_(desde) {
  var out = [];
  Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).forEach(function (m) {
    if (SGO_UTILS.safeUpper(m.STATUS) !== 'FINALIZADO') return;
    var d = Frota_dataDia_(m.DATA_CHEGADA);
    if (!d || d.getTime() < desde.getTime()) return;
    var itens = FrotaG_itensAvaria_(m);
    if (!itens.length) return;
    out.push({ movId: SGO_UTILS.safe(m.ID), veiculoId: SGO_UTILS.safe(m.VEICULO_ID), condutorId: SGO_UTILS.safe(m.CONDUTOR_ID), data: Frota_textoData_(m.DATA_CHEGADA), itens: itens });
  });
  return out;
}

/**
 * O que precisa de tratamento agora (candidatos da coluna Aberta), cada um com a chave da origem.
 * Manutenção: a chave leva o ID da última manutenção daquele tipo, para o próximo vencimento virar outro caso.
 */
function Frota_casosCandidatos_() {
  var veiculos = {}, condutores = {};
  Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function (v) { veiculos[SGO_UTILS.safe(v.ID)] = v; });
  Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function (c) { condutores[SGO_UTILS.safe(c.ID)] = c; });
  var placa = function (id) { return SGO_UTILS.safe((veiculos[SGO_UTILS.safe(id)] || {}).PLACA) || 'veículo não localizado'; };
  var nome = function (id) { return SGO_UTILS.safe((condutores[SGO_UTILS.safe(id)] || {}).NOME); };
  var lista = [];
  FrotaG_avarias_(FrotaG_diasAtras_(FROTA_JANELA_AVARIA_DIAS)).forEach(function (a) {
    lista.push({ chave: 'AVARIA|' + a.movId, tipo: 'AVARIA', origemId: a.movId, veiculoId: a.veiculoId, placa: placa(a.veiculoId), condutorId: a.condutorId, condutorNome: nome(a.condutorId),
      data: a.data, titulo: 'Avaria na devolução do ' + placa(a.veiculoId) + ' em ' + a.data,
      detalhe: 'Em ordem na retirada e com problema na devolução: ' + a.itens.map(function (i) { return i.item + (i.observacao ? ' (' + i.observacao + ')' : ''); }).join('; ') + '.' });
  });
  Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_MULTA).forEach(function (m) {
    if (SGO_UTILS.safeUpper(m.STATUS) !== 'ABERTA') return;
    var data = Frota_textoData_(m.DATA_INFRACAO), cond = nome(m.CONDUTOR_ID);
    lista.push({ chave: 'MULTA|' + SGO_UTILS.safe(m.ID), tipo: 'MULTA', origemId: SGO_UTILS.safe(m.ID), veiculoId: SGO_UTILS.safe(m.VEICULO_ID), placa: placa(m.VEICULO_ID),
      condutorId: SGO_UTILS.safe(m.CONDUTOR_ID), condutorNome: cond, data: data,
      titulo: 'Multa do ' + placa(m.VEICULO_ID) + ' em ' + data + (SGO_UTILS.safe(m.DESCRICAO) ? ': ' + SGO_UTILS.safe(m.DESCRICAO) : ''),
      detalhe: 'Valor R$ ' + SGO_DocA4_num_(Frota_num_(m.VALOR, 0), 2) + (SGO_UTILS.safe(m.VENCIMENTO) ? ', vencimento ' + Frota_textoData_(m.VENCIMENTO) : '') +
        '. Condutor: ' + (cond || 'não identificado (indique em Documentos e multas)') + '.' });
  });
  var ultimas = Frota_ultimasManutencoesPorVeiculo_();
  Object.keys(ultimas).forEach(function (k) {
    var m = ultimas[k], v = veiculos[SGO_UTILS.safe(m.VEICULO_ID)];
    if (!v || SGO_UTILS.safeUpper(v.STATUS) === 'INATIVO') return;
    var st = Frota_classificarManutencao_(m, v);
    if (st !== 'VENCIDO' && st !== 'VENCENDO') return;
    var tipoInfo = FROTA_CFG.TIPOS_MANUTENCAO.filter(function (t) { return t.codigo === m.TIPO; })[0];
    var rot = tipoInfo ? tipoInfo.label : SGO_UTILS.safe(m.TIPO);
    var prev = [SGO_UTILS.safe(m.PROXIMA_DATA) ? 'data ' + Frota_textoData_(m.PROXIMA_DATA) : '', SGO_UTILS.safe(m.PROXIMA_KM) ? 'KM ' + Frota_kmTexto_(m.PROXIMA_KM) : ''].filter(Boolean).join(' ou ');
    lista.push({ chave: 'MANUTENCAO|' + SGO_UTILS.safe(m.ID), tipo: 'MANUTENCAO', origemId: SGO_UTILS.safe(m.ID), veiculoId: SGO_UTILS.safe(v.ID), placa: SGO_UTILS.safe(v.PLACA),
      condutorId: '', condutorNome: '', data: Frota_textoData_(m.PROXIMA_DATA) || Frota_textoData_(m.DATA),
      titulo: rot + ' do ' + SGO_UTILS.safe(v.PLACA) + (st === 'VENCIDO' ? ' vencida' : ' a vencer'),
      detalhe: 'Prevista para ' + (prev || 'data não informada') + '; KM atual ' + Frota_kmTexto_(v.KM_ATUAL) + '. O caso termina quando a manutenção for registrada em Manutenção e paradas.' });
  });
  return lista;
}

/** Recorrência que pede a análise de causa: texto ('' = não é recorrente). */
function FrotaG_recorrencia_(item, avarias180, multas) {
  if (item.tipo === 'AVARIA') {
    var mesmoVeic = avarias180.filter(function (a) { return a.veiculoId === item.veiculoId; }).length;
    var mesmoCond = item.condutorId ? avarias180.filter(function (a) { return a.condutorId === item.condutorId; }).length : 0;
    if (mesmoCond >= 2) return mesmoCond + ' avarias na devolução com ' + (item.condutorNome || 'o mesmo condutor') + ' em ' + FROTA_RECORRENCIA_AVARIA_DIAS + ' dias';
    if (mesmoVeic >= 2) return mesmoVeic + ' avarias no ' + item.placa + ' em ' + FROTA_RECORRENCIA_AVARIA_DIAS + ' dias';
  }
  if (item.tipo === 'MULTA' && item.condutorId) {
    var limite = FrotaG_diasAtras_(FROTA_RECORRENCIA_MULTA_DIAS).getTime();
    var n = multas.filter(function (m) {
      var d = Frota_dataDia_(m.DATA_INFRACAO);
      return SGO_UTILS.safe(m.CONDUTOR_ID) === item.condutorId && SGO_UTILS.safeUpper(m.STATUS) !== 'CANCELADA' && d && d.getTime() >= limite;
    }).length;
    if (n >= 2) return n + ' multas de ' + (item.condutorNome || 'o mesmo condutor') + ' em 12 meses';
  }
  return '';
}

function FrotaG_contexto_() {
  return { avarias180: FrotaG_avarias_(FrotaG_diasAtras_(FROTA_RECORRENCIA_AVARIA_DIAS)), multas: Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_MULTA) };
}

// ------------------------------------------------------------
// KANBAN
// ------------------------------------------------------------
function FrotaG_casoParaTela_(c, ativas, ctx, todasAtv) {
  var etapa = SGO_UTILS.safeUpper(c.ETAPA) || 'ANALISE';
  var acoes = typeof Cndq_atividadesDoPlano_ === 'function' ? Cndq_atividadesDoPlano_(c, todasAtv) : [];
  var abertas = acoes.filter(function (a) { return a.SITUACAO !== 'Concluída' && a.SITUACAO !== 'Cancelada'; });
  var hojeIso = FrotaG_iso_(FrotaG_hojeBr_());
  var quando = FrotaG_dataBr_(c.QUANDO);
  var item = { tipo: SGO_UTILS.safeUpper(c.TIPO), veiculoId: SGO_UTILS.safe(c.VEICULO_ID), condutorId: SGO_UTILS.safe(c.CONDUTOR_ID), condutorNome: SGO_UTILS.safe(c.CONDUTOR_NOME), placa: SGO_UTILS.safe(c.PLACA) };
  var porques = FrotaG_json_(c.PORQUES_JSON, []);
  return {
    id: SGO_UTILS.safe(c.ID), codigo: SGO_UTILS.safe(c.CODIGO), chave: SGO_UTILS.safe(c.ORIGEM_CHAVE), tipo: item.tipo, tipoNome: FROTA_CASO_TIPOS[item.tipo] || item.tipo,
    etapa: etapa, etapaNome: FROTA_CASO_ETAPAS[etapa] || etapa, placa: item.placa, condutorNome: item.condutorNome, data: Frota_textoData_(c.DATA_FATO),
    titulo: SGO_UTILS.safe(c.TITULO), detalhe: SGO_UTILS.safe(c.DESCRICAO), responsavelNome: SGO_UTILS.safe(c.RESPONSAVEL_NOME),
    recorrente: etapa === 'CONCLUIDA' || etapa === 'CANCELADA' ? '' : FrotaG_recorrencia_(item, ctx.avarias180, ctx.multas),
    origemAtiva: !SGO_UTILS.safe(c.ORIGEM_CHAVE) || !!ativas[SGO_UTILS.safe(c.ORIGEM_CHAVE)],
    porques: Array.isArray(porques) ? porques : [], causaRaiz: SGO_UTILS.safe(c.CAUSA_RAIZ),
    plano: SGO_UTILS.safe(c.O_QUE) ? { oQue: SGO_UTILS.safe(c.O_QUE), porQue: SGO_UTILS.safe(c.POR_QUE), onde: SGO_UTILS.safe(c.ONDE), quando: quando, quemNome: SGO_UTILS.safe(c.QUEM_NOME),
      como: SGO_UTILS.safe(c.COMO), quanto: SGO_UTILS.safe(c.QUANTO) } : null,
    acoes: acoes, acoesAbertas: abertas.length, ciclo: Number(c.CICLO) || 1,
    atrasado: etapa === 'EXECUCAO' && !!quando && FrotaG_iso_(quando) < hojeIso,
    verificacao: SGO_UTILS.safe(c.VERIFICACAO_TEXTO), eficaz: SGO_UTILS.safeUpper(c.EFICAZ), resolucao: SGO_UTILS.safe(c.RESOLUCAO), padronizacao: SGO_UTILS.safe(c.PADRONIZACAO_TEXTO),
    concluidoEm: Frota_textoData_(SGO_UTILS.safe(c.CONCLUIDO_EM).slice(0, 10)), canceladoMotivo: SGO_UTILS.safe(c.CANCELADO_MOTIVO),
    historico: FrotaG_json_(c.HISTORICO_JSON, [])
  };
}

function Frota_apiGestaoKanban(sessionId, payload) {
  FrotaG_exigirGestao_(sessionId);
  payload = payload || {};
  var dias = Math.min(Math.max(Number(payload.dias) || 90, 7), 400);
  var casos = FrotaG_casos_();
  var candidatos = Frota_casosCandidatos_();
  var ativas = {};
  candidatos.forEach(function (k) { ativas[k.chave] = true; });
  var comCaso = {};
  casos.forEach(function (c) { if (SGO_UTILS.safe(c.ORIGEM_CHAVE)) comCaso[SGO_UTILS.safe(c.ORIGEM_CHAVE)] = true; });
  var ctx = FrotaG_contexto_();
  var todasAtv = typeof Atividades_todas_ === 'function' ? Atividades_todas_() : [];
  var colunas = {}; FROTA_CASO_COLUNAS.forEach(function (c) { colunas[c.id] = []; });
  candidatos.forEach(function (k) {
    if (comCaso[k.chave]) return;
    colunas.ABERTA.push(Object.assign({ id: '', codigo: '', etapa: 'ABERTA', etapaNome: 'Aberta', tipoNome: FROTA_CASO_TIPOS[k.tipo], origemAtiva: true, novo: true,
      recorrente: FrotaG_recorrencia_(k, ctx.avarias180, ctx.multas), porques: [], acoes: [] }, k));
  });
  var corte = FrotaG_diasAtras_(dias).getTime(), descartados = 0;
  casos.forEach(function (c) {
    var t = FrotaG_casoParaTela_(c, ativas, ctx, todasAtv);
    if (t.etapa === 'CANCELADA') { descartados++; return; }
    if (t.etapa === 'CONCLUIDA') {
      var d = Frota_dataDia_(t.concluidoEm);
      if (d && d.getTime() < corte) return;
    }
    (colunas[t.etapa] || colunas.ANALISE).push(t);
  });
  Object.keys(colunas).forEach(function (k) {
    colunas[k].sort(function (a, b) { var x = Frota_dataDia_(a.data), y = Frota_dataDia_(b.data); return (y ? y.getTime() : 0) - (x ? x.getTime() : 0); });
  });
  return { ok: true, dias: dias, descartados: descartados, equipe: FrotaG_usuariosAtivos_(), hoje: FrotaG_hojeBr_(),
    colunas: FROTA_CASO_COLUNAS.map(function (c) { return { id: c.id, nome: c.nome, ajuda: c.ajuda, itens: colunas[c.id] }; }) };
}

// ------------------------------------------------------------
// AÇÕES DO CASO
// ------------------------------------------------------------
function FrotaG_caso_(id) {
  var c = SGO_DATA.getById(FROTA_ABA_CASO, SGO_UTILS.safe(id));
  if (!c) throw new Error('O caso não foi encontrado. Atualize a tela (botão Atualizar) e tente de novo.');
  return c;
}

function FrotaG_exigirAberto_(c) {
  var e = SGO_UTILS.safeUpper(c.ETAPA);
  if (e === 'CONCLUIDA' || e === 'CANCELADA') throw new Error('O caso ' + c.CODIGO + ' já está ' + (FROTA_CASO_ETAPAS[e] || e).toLowerCase() + '. Atualize a tela para ver a situação atual.');
  return e;
}

function FrotaG_texto_(v, min, rotulo, max) {
  var s = String(v || '').replace(/\s+/g, ' ').trim();
  if (s.length < min) throw new Error('Preencha "' + rotulo + '" com pelo menos ' + min + ' caracteres (foram ' + s.length + ').');
  return s.slice(0, max || 1500);
}

/** Abre o caso a partir de um item da coluna Aberta (chave) ou um caso avulso (tipo OUTRO, com veículo e título). */
function Frota_apiGestaoAbrirCaso(sessionId, payload) {
  var sessao = FrotaG_exigirGestao_(sessionId);
  payload = payload || {};
  var chave = SGO_UTILS.safe(payload.chave);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var casos = FrotaG_casos_();
    var base;
    if (chave) {
      var ja = casos.filter(function (c) { return SGO_UTILS.safe(c.ORIGEM_CHAVE) === chave; })[0];
      if (ja) return { ok: true, jaExistia: true, id: SGO_UTILS.safe(ja.ID), codigo: SGO_UTILS.safe(ja.CODIGO),
        mensagem: 'Este item já tinha o caso ' + ja.CODIGO + ' (' + (FROTA_CASO_ETAPAS[SGO_UTILS.safeUpper(ja.ETAPA)] || ja.ETAPA).toLowerCase() + '). Nada foi criado em dobro.' };
      var k = Frota_casosCandidatos_().filter(function (x) { return x.chave === chave; })[0];
      if (!k) throw new Error('Este item não precisa mais de tratamento (a multa foi paga ou a manutenção já foi registrada). Atualize a tela.');
      base = { TIPO: k.tipo, ORIGEM_CHAVE: k.chave, ORIGEM_ID: k.origemId, VEICULO_ID: k.veiculoId, PLACA: k.placa, CONDUTOR_ID: k.condutorId, CONDUTOR_NOME: k.condutorNome,
        DATA_FATO: k.data, TITULO: k.titulo, DESCRICAO: k.detalhe };
    } else {
      var v = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, SGO_UTILS.safe(payload.veiculoId));
      if (!v) throw new Error('Escolha o veículo do caso.');
      base = { TIPO: FROTA_CASO_TIPOS[SGO_UTILS.safeUpper(payload.tipo)] ? SGO_UTILS.safeUpper(payload.tipo) : 'OUTRO', ORIGEM_CHAVE: '', ORIGEM_ID: '', VEICULO_ID: SGO_UTILS.safe(v.ID), PLACA: SGO_UTILS.safe(v.PLACA),
        CONDUTOR_ID: '', CONDUTOR_NOME: '', DATA_FATO: FrotaG_hojeBr_(), TITULO: FrotaG_texto_(payload.titulo, 5, 'O que aconteceu', 200),
        DESCRICAO: String(payload.descricao || '').trim().slice(0, 1500) };
    }
    var caso = SGO_DATA.normalizarObjetoParaSheet(FROTA_ABA_CASO, SGO_DATA.gerarRegistroBase(Object.assign(base, {
      CODIGO: FrotaG_proximoCodigo_(casos), ETAPA: 'ANALISE', RESPONSAVEL_ID: SGO_UTILS.safe(sessao.userId), RESPONSAVEL_NOME: SGO_UTILS.safe(sessao.nome || sessao.usuario),
      CICLO: 1, CRIADO_POR_ID: SGO_UTILS.safe(sessao.userId), CRIADO_POR_NOME: SGO_UTILS.safe(sessao.nome || sessao.usuario), ATUALIZADO_EM: SGO_UTILS.nowIso()
    })));
    caso.HISTORICO_JSON = FrotaG_hist_(null, sessao, 'ABERTO', 'Caso aberto em Em análise.');
    SGO_DATA.insert(FROTA_ABA_CASO, caso);
  } finally { lock.releaseLock(); }
  SGO_DATA.log('FROTA_CASO_ABERTO', sessao.usuario, caso.CODIGO + ' ' + caso.TIPO + ' ' + caso.PLACA, 'FROTA');
  return { ok: true, id: caso.ID, codigo: caso.CODIGO, mensagem: 'Caso ' + caso.CODIGO + ' aberto em "Em análise". Agora descubra a causa (5 Porquês) ou, se a solução for simples, conclua com a resolução.' };
}

/** Descarta um item da coluna Aberta (sem caso) ou um caso em andamento, sempre com o motivo. */
function Frota_apiGestaoDescartar(sessionId, payload) {
  var sessao = FrotaG_exigirGestao_(sessionId);
  payload = payload || {};
  var motivo = FrotaG_texto_(payload.motivo, 10, 'Motivo do descarte', 500);
  if (payload.id) {
    var c = FrotaG_caso_(payload.id);
    FrotaG_exigirAberto_(c);
    SGO_DATA.update(FROTA_ABA_CASO, c.ID, { ETAPA: 'CANCELADA', CANCELADO_EM: SGO_UTILS.nowIso(), CANCELADO_MOTIVO: motivo, ATUALIZADO_EM: SGO_UTILS.nowIso(),
      HISTORICO_JSON: FrotaG_hist_(c, sessao, 'DESCARTADO', motivo) });
    return { ok: true, mensagem: 'Caso ' + c.CODIGO + ' descartado. As atividades já lançadas continuam em Minhas atividades; cancele lá as que não fazem mais sentido.' };
  }
  if (!SGO_UTILS.safe(payload.chave)) throw new Error('Item não identificado. Atualize a tela e tente de novo.');
  var r = Frota_apiGestaoAbrirCaso(sessionId, { chave: payload.chave });
  if (r.jaExistia) throw new Error(r.mensagem + ' Para descartar, use o botão Descartar no cartão do caso ' + r.codigo + '.');
  var caso = FrotaG_caso_(r.id);
  SGO_DATA.update(FROTA_ABA_CASO, caso.ID, { ETAPA: 'CANCELADA', CANCELADO_EM: SGO_UTILS.nowIso(), CANCELADO_MOTIVO: motivo, ATUALIZADO_EM: SGO_UTILS.nowIso(),
    HISTORICO_JSON: FrotaG_hist_(caso, sessao, 'DESCARTADO', motivo) });
  return { ok: true, mensagem: 'Item descartado (' + caso.CODIGO + '): não aparece mais em Aberta. O motivo fica guardado.' };
}

/** 5 Porquês: pelo menos 3 respostas e a causa raiz. */
function Frota_apiGestaoSalvarAnalise(sessionId, payload) {
  var sessao = FrotaG_exigirGestao_(sessionId);
  payload = payload || {};
  var c = FrotaG_caso_(payload.id);
  FrotaG_exigirAberto_(c);
  var porques = (Array.isArray(payload.porques) ? payload.porques : []).map(function (p) { return String(p || '').trim().slice(0, 500); }).filter(Boolean).slice(0, 5);
  if (porques.length < 3) throw new Error('Responda pelo menos 3 porquês: cada resposta vira a pergunta seguinte, até chegar a uma causa que a empresa consegue mudar.');
  var causa = FrotaG_texto_(payload.causaRaiz, 10, 'Causa raiz', 1000);
  SGO_DATA.update(FROTA_ABA_CASO, c.ID, { PORQUES_JSON: JSON.stringify(porques), CAUSA_RAIZ: causa, ATUALIZADO_EM: SGO_UTILS.nowIso(),
    HISTORICO_JSON: FrotaG_hist_(c, sessao, 'ANALISE', 'Causa raiz: ' + causa) });
  return { ok: true, mensagem: 'Análise salva. Se a causa pede mudança (treinamento, regra, conserto), crie o plano de ação; se já está resolvido, conclua o caso.' };
}

function FrotaG_quando_(v) {
  var br = FrotaG_dataBr_(v);
  if (!br) throw new Error('Informe o prazo (Quando) no formato dd/mm/aaaa.');
  if (FrotaG_iso_(br) < FrotaG_iso_(FrotaG_hojeBr_())) throw new Error('O prazo (Quando) não pode estar no passado. Escolha hoje ou uma data à frente.');
  return br;
}

function FrotaG_quem_(id) {
  var u = FrotaG_usuariosAtivos_().filter(function (x) { return x.id === SGO_UTILS.safe(id); })[0];
  if (!u) throw new Error('Escolha o responsável (Quem) na lista da equipe ativa.');
  return u;
}

/** Ação do plano como atividade de Minhas atividades (módulo "frota"). */
function FrotaG_criarAtividade_(sessionId, caso, o) {
  if (typeof Atividades_apiCriar !== 'function') throw new Error('o módulo Minhas atividades não está disponível nesta instalação');
  var r = Atividades_apiCriar(sessionId, { titulo: SGO_UTILS.safe(caso.CODIGO) + ' (' + SGO_UTILS.safe(caso.PLACA) + '): ' + String(o.oQue).slice(0, 160),
    descricao: String(o.descricao || '').slice(0, 3900), prazo: FrotaG_iso_(o.quando) + 'T18:00', prioridade: 'Alta', responsavelId: o.quemId, modulo: 'frota', moduloNome: 'Frota',
    // 5W2H também nos campos próprios da atividade (Minhas atividades mostra por quê, onde, como e quanto)
    porQue: o.porQue || '', onde: o.onde || '', como: o.como || '', quanto: o.quanto || '' });
  if (!r || r.ok !== true) throw new Error('A ação não foi lançada em Minhas atividades: ' + ((r && r.message) || 'resposta sem confirmação') + ' Nada foi gravado no caso; corrija e tente de novo.');
  return r.item;
}

function FrotaG_exigeAnalise_(c, ctx) {
  var item = { tipo: SGO_UTILS.safeUpper(c.TIPO), veiculoId: SGO_UTILS.safe(c.VEICULO_ID), condutorId: SGO_UTILS.safe(c.CONDUTOR_ID), condutorNome: SGO_UTILS.safe(c.CONDUTOR_NOME), placa: SGO_UTILS.safe(c.PLACA) };
  return FrotaG_recorrencia_(item, (ctx || FrotaG_contexto_()).avarias180, (ctx || FrotaG_contexto_()).multas);
}

/** Plano 5W2H: grava o plano e lança a primeira ação em Minhas atividades. Caso vai para Em execução. */
function Frota_apiGestaoCriarPlano(sessionId, payload) {
  var sessao = FrotaG_exigirGestao_(sessionId);
  payload = payload || {};
  var c = FrotaG_caso_(payload.id);
  FrotaG_exigirAberto_(c);
  if (SGO_UTILS.safe(c.O_QUE) && SGO_UTILS.safeUpper(c.ETAPA) === 'EXECUCAO') throw new Error('O caso ' + c.CODIGO + ' já tem plano em execução. Use "Mais uma ação" para lançar outra ação.');
  var rec = FrotaG_exigeAnalise_(c);
  if (rec && !SGO_UTILS.safe(c.CAUSA_RAIZ)) throw new Error('Caso recorrente (' + rec + '): faça primeiro a análise de causa (5 Porquês) no próprio cartão; o plano ataca a causa raiz.');
  var oQue = FrotaG_texto_(payload.oQue, 5, 'O quê (ação)', 300), porQue = FrotaG_texto_(payload.porQue, 5, 'Por quê', 500), como = FrotaG_texto_(payload.como, 10, 'Como', 1000);
  var onde = String(payload.onde || '').trim().slice(0, 200) || 'Não se aplica';
  var quanto = String(payload.quanto || '').trim().slice(0, 200) || 'Sem custo previsto';
  var quando = FrotaG_quando_(payload.quando);
  var quem = FrotaG_quem_(payload.quemId);
  var atv = FrotaG_criarAtividade_(sessionId, c, { oQue: oQue, quemId: quem.id, quando: quando, porQue: porQue, onde: onde, como: como, quanto: quanto,
    descricao: 'Plano de ação do caso ' + c.CODIGO + ' da Frota (' + c.TITULO + ').\nO quê: ' + oQue + '\nPor quê: ' + porQue + '\nOnde: ' + onde + '\nQuando: ' + quando +
      '\nQuem: ' + quem.nome + '\nComo: ' + como + '\nQuanto: ' + quanto + '\nAo terminar, marque esta atividade como Concluída; a gestão verifica a eficácia no caso (Frota > Gestão e melhoria).' });
  var ids = FrotaG_json_(c.ATIVIDADES_JSON, []); if (!Array.isArray(ids)) ids = [];
  ids.push(atv.ID);
  SGO_DATA.update(FROTA_ABA_CASO, c.ID, { O_QUE: oQue, POR_QUE: porQue, ONDE: onde, QUANDO: quando, QUEM_ID: quem.id, QUEM_NOME: quem.nome, COMO: como, QUANTO: quanto,
    ATIVIDADES_JSON: JSON.stringify(ids), ETAPA: 'EXECUCAO', ATUALIZADO_EM: SGO_UTILS.nowIso(),
    HISTORICO_JSON: FrotaG_hist_(c, sessao, 'PLANO', 'Plano 5W2H criado; ação "' + oQue + '" para ' + quem.nome + ' até ' + quando + '.') });
  SGO_DATA.log('FROTA_CASO_PLANO', sessao.usuario, c.CODIGO + ': ' + oQue.slice(0, 200), 'FROTA');
  return { ok: true, mensagem: 'Plano criado e a ação foi lançada em Minhas atividades para ' + quem.nome + ' (prazo ' + quando + '). O caso está em "Em execução".' };
}

function Frota_apiGestaoAdicionarAcao(sessionId, payload) {
  var sessao = FrotaG_exigirGestao_(sessionId);
  payload = payload || {};
  var c = FrotaG_caso_(payload.id);
  FrotaG_exigirAberto_(c);
  if (!SGO_UTILS.safe(c.O_QUE)) throw new Error('Crie primeiro o plano de ação (5W2H) do caso; depois lance as outras ações.');
  var oQue = FrotaG_texto_(payload.oQue, 5, 'O quê (ação)', 300);
  var quando = FrotaG_quando_(payload.quando);
  var quem = FrotaG_quem_(payload.quemId);
  var atv = FrotaG_criarAtividade_(sessionId, c, { oQue: oQue, quemId: quem.id, quando: quando, porQue: SGO_UTILS.safe(c.POR_QUE), como: String(payload.como || '').trim(),
    descricao: 'Ação do caso ' + c.CODIGO + ' da Frota (' + c.TITULO + ').\n' + String(payload.como || '').trim() });
  var ids = FrotaG_json_(c.ATIVIDADES_JSON, []); if (!Array.isArray(ids)) ids = [];
  ids.push(atv.ID);
  SGO_DATA.update(FROTA_ABA_CASO, c.ID, { ATIVIDADES_JSON: JSON.stringify(ids), ETAPA: 'EXECUCAO', ATUALIZADO_EM: SGO_UTILS.nowIso(),
    HISTORICO_JSON: FrotaG_hist_(c, sessao, 'ACAO', 'Ação "' + oQue + '" para ' + quem.nome + ' até ' + quando + '.') });
  return { ok: true, mensagem: 'Ação lançada em Minhas atividades para ' + quem.nome + '.' };
}

/**
 * Concluir (Verificar e Agir do PDCA).
 *  - Com plano: todas as ações concluídas ou canceladas (pelo menos uma concluída) e a verificação da eficácia.
 *    eficaz = NAO volta o caso para Em análise (novo ciclo).
 *  - Sem plano: a resolução (ex.: "multa paga pelo condutor; orientado sobre velocidade").
 *  - Caso recorrente: precisa da análise de causa antes.
 */
function Frota_apiGestaoConcluir(sessionId, payload) {
  var sessao = FrotaG_exigirGestao_(sessionId);
  payload = payload || {};
  var c = FrotaG_caso_(payload.id);
  FrotaG_exigirAberto_(c);
  var rec = FrotaG_exigeAnalise_(c);
  if (rec && !SGO_UTILS.safe(c.CAUSA_RAIZ)) throw new Error('Caso recorrente (' + rec + '): antes de concluir, faça a análise de causa (5 Porquês) no cartão, para o problema não voltar.');
  var ids = FrotaG_json_(c.ATIVIDADES_JSON, []);
  var temPlano = Array.isArray(ids) && ids.length > 0;
  var campos = { ATUALIZADO_EM: SGO_UTILS.nowIso() }, msg;
  if (temPlano) {
    var acoes = typeof Cndq_atividadesDoPlano_ === 'function' ? Cndq_atividadesDoPlano_(c, typeof Atividades_todas_ === 'function' ? Atividades_todas_() : []) : [];
    var abertas = acoes.filter(function (a) { return a.SITUACAO !== 'Concluída' && a.SITUACAO !== 'Cancelada'; });
    if (abertas.length) throw new Error('Ainda há ' + abertas.length + (abertas.length === 1 ? ' ação em aberto: ' : ' ações em aberto: ') + abertas.map(function (a) { return '"' + a.TITULO + '" (' + a.SITUACAO + ', ' + (a.RESPONSAVEL_NOME || 'sem responsável') + ')'; }).join('; ') +
      '. Peça para concluir em Minhas atividades (ou cancele lá a que não vale mais) e clique em Concluir de novo.');
    if (!acoes.some(function (a) { return a.SITUACAO === 'Concluída'; })) throw new Error('Nenhuma ação do plano foi concluída: lance uma ação nova ou descarte o caso com o motivo.');
    var verif = FrotaG_texto_(payload.verificacao, 15, 'Verificação da eficácia (o que foi conferido e o resultado)', 1500);
    var eficaz = SGO_UTILS.safeUpper(payload.eficaz);
    if (eficaz !== 'SIM' && eficaz !== 'NAO') throw new Error('Marque se a ação resolveu (Sim) ou não resolveu (Não).');
    campos.VERIFICACAO_TEXTO = verif; campos.EFICAZ = eficaz;
    if (eficaz === 'NAO') {
      campos.ETAPA = 'ANALISE'; campos.CICLO = (Number(c.CICLO) || 1) + 1;
      campos.HISTORICO_JSON = FrotaG_hist_(c, sessao, 'NAO_EFICAZ', verif);
      SGO_DATA.update(FROTA_ABA_CASO, c.ID, campos);
      return { ok: true, mensagem: 'A ação não resolveu: o caso voltou para "Em análise" (ciclo ' + campos.CICLO + '). Revise a causa raiz e lance novas ações.' };
    }
    campos.RESOLUCAO = String(payload.resolucao || '').trim().slice(0, 1500) || verif;
  } else {
    campos.RESOLUCAO = FrotaG_texto_(payload.resolucao, 10, 'Como foi resolvido', 1500);
  }
  campos.PADRONIZACAO_TEXTO = String(payload.padronizacao || '').trim().slice(0, 1500);
  campos.ETAPA = 'CONCLUIDA'; campos.CONCLUIDO_EM = SGO_UTILS.nowIso();
  campos.HISTORICO_JSON = FrotaG_hist_(c, sessao, 'CONCLUIDO', campos.RESOLUCAO + (campos.PADRONIZACAO_TEXTO ? ' | Padronizado: ' + campos.PADRONIZACAO_TEXTO : ''));
  SGO_DATA.update(FROTA_ABA_CASO, c.ID, campos);
  SGO_DATA.log('FROTA_CASO_CONCLUIDO', sessao.usuario, c.CODIGO + ': ' + campos.RESOLUCAO.slice(0, 200), 'FROTA');
  msg = 'Caso ' + c.CODIGO + ' concluído.';
  return { ok: true, mensagem: msg };
}

// ------------------------------------------------------------
// INDICADORES DO PERÍODO
// ------------------------------------------------------------
/** Preventiva no prazo: cada manutenção do período comparada com a "próxima troca" da anterior do mesmo tipo. */
function FrotaG_preventivas_(inicio, fim) {
  var porChave = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.REG_FROTA_MANUTENCAO).forEach(function (m) {
    if (SGO_UTILS.safeUpper(m.TIPO) === 'OUTRO') return;
    var k = SGO_UTILS.safe(m.VEICULO_ID) + '|' + SGO_UTILS.safe(m.TIPO);
    (porChave[k] = porChave[k] || []).push(m);
  });
  var out = {};
  Object.keys(porChave).forEach(function (k) {
    var lista = porChave[k].map(function (m) { return { m: m, d: Frota_dataDia_(m.DATA) }; }).filter(function (x) { return x.d; })
      .sort(function (a, b) { return a.d.getTime() - b.d.getTime() || (Number(a.m.KM) || 0) - (Number(b.m.KM) || 0); });
    for (var i = 1; i < lista.length; i++) {
      var atual = lista[i], ant = lista[i - 1].m;
      if (atual.d.getTime() < inicio.getTime() || atual.d.getTime() > fim.getTime()) continue;
      var dPrev = Frota_dataDia_(ant.PROXIMA_DATA), kmPrev = SGO_UTILS.safe(ant.PROXIMA_KM) ? Frota_num_(ant.PROXIMA_KM, NaN) : NaN;
      if (!dPrev && !isFinite(kmPrev)) continue;
      var noPrazo = (!dPrev || atual.d.getTime() <= dPrev.getTime()) && (!isFinite(kmPrev) || Frota_num_(atual.m.KM, 0) <= kmPrev);
      var vid = SGO_UTILS.safe(atual.m.VEICULO_ID);
      out[vid] = out[vid] || { feitas: 0, noPrazo: 0 };
      out[vid].feitas++; if (noPrazo) out[vid].noPrazo++;
    }
  });
  return out;
}

function Frota_apiGestaoIndicadores(sessionId, payload) {
  FrotaG_exigirGestao_(sessionId);
  payload = payload || {};
  var dias = Math.min(Math.max(Number(payload.dias) || 90, 7), 400);
  var fim = Frota_dataDia_(FrotaG_hojeBr_()), inicio = FrotaG_diasAtras_(dias - 1);
  var fimDia = new Date(fim.getTime()); fimDia.setHours(23, 59, 59, 0);
  var ag = FrotaRel_agregarDados_(FrotaG_br_(inicio), FrotaG_br_(fim));
  var avarias = FrotaG_avarias_(inicio).filter(function (a) { var d = Frota_dataDia_(a.data); return d && d.getTime() <= fimDia.getTime(); });
  var prev = FrotaG_preventivas_(inicio, fimDia);
  var vencidasAgora = {};
  (ag.alertasAtuais || []).forEach(function (a) { if (a.categoria === 'MANUTENCAO' && a.status === 'VENCIDO') vencidasAgora[SGO_UTILS.safe(a.veiculoId)] = (vencidasAgora[SGO_UTILS.safe(a.veiculoId)] || 0) + 1; });
  var pct = function (a, b) { return b ? Math.round((a / b) * 1000) / 10 : null; };
  var tot = { kmRodado: 0, custoTotal: 0, avarias: avarias.length, multas: 0, multasValor: 0, diasVeiculo: 0, diasParados: 0, prevFeitas: 0, prevNoPrazo: 0, vencidasAgora: 0, retiradas: 0 };
  var veiculos = ag.veiculos.map(function (v) {
    var vid = SGO_UTILS.safe(v.id);
    var nAv = avarias.filter(function (a) { return a.veiculoId === vid; }).length;
    var p = prev[vid] || { feitas: 0, noPrazo: 0 };
    var disp = Math.max(0, Math.min(100, ((ag.periodo.dias - v.paradasDias) / ag.periodo.dias) * 100));
    tot.kmRodado += v.kmRodado; tot.custoTotal += v.custoTotal; tot.multas += v.multasQtd; tot.multasValor += v.multasValor; tot.retiradas += v.retiradas;
    tot.diasVeiculo += ag.periodo.dias; tot.diasParados += Math.min(v.paradasDias, ag.periodo.dias); tot.prevFeitas += p.feitas; tot.prevNoPrazo += p.noPrazo; tot.vencidasAgora += vencidasAgora[vid] || 0;
    return { placa: v.placa, modelo: v.modelo, retiradas: v.retiradas, kmRodado: v.kmRodado, custoTotal: v.custoTotal, custoPorKm: v.kmRodado > 0 ? v.custoPorKm : null,
      consumoKmL: v.consumoMedioKmL || null, avarias: nAv, avariasPorMilKm: v.kmRodado > 0 ? Math.round((nAv / v.kmRodado) * 1000 * 100) / 100 : null,
      multas: v.multasQtd, multasValor: v.multasValor, disponibilidadePct: Math.round(disp * 10) / 10,
      preventivasFeitas: p.feitas, preventivasNoPrazoPct: pct(p.noPrazo, p.feitas), preventivasVencidas: vencidasAgora[vid] || 0 };
  });
  // Por condutor: retiradas, KM, avarias e multas (com pontos) do período.
  var condutores = {};
  Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function (c) { condutores[SGO_UTILS.safe(c.ID)] = SGO_UTILS.safe(c.NOME); });
  var porCond = {};
  var cond = function (id) { var k = SGO_UTILS.safe(id) || '-'; return (porCond[k] = porCond[k] || { nome: k === '-' ? 'Condutor não identificado' : (condutores[k] || 'Condutor não localizado'), retiradas: 0, kmRodado: 0, avarias: 0, multas: 0, multasValor: 0, pontos: 0 }); };
  Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).forEach(function (m) {
    var s = Frota_parseDataHora_(m.DATA_SAIDA, m.HORA_SAIDA);
    if (!s || s.getTime() < inicio.getTime() || s.getTime() > fimDia.getTime()) return;
    var c = cond(m.CONDUTOR_ID); c.retiradas++;
    if (SGO_UTILS.safeUpper(m.STATUS) === 'FINALIZADO') { var km = Frota_num_(m.KM_CHEGADA, 0) - Frota_num_(m.KM_SAIDA, 0); if (km > 0) c.kmRodado += km; }
  });
  avarias.forEach(function (a) { cond(a.condutorId).avarias++; });
  Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_MULTA).forEach(function (mu) {
    var d = Frota_dataDia_(mu.DATA_INFRACAO);
    if (!d || d.getTime() < inicio.getTime() || d.getTime() > fimDia.getTime() || SGO_UTILS.safeUpper(mu.STATUS) === 'CANCELADA') return;
    var c = cond(mu.CONDUTOR_ID); c.multas++; c.multasValor += Frota_num_(mu.VALOR, 0); c.pontos += Frota_num_(mu.PONTOS, 0);
  });
  var condutoresLista = Object.keys(porCond).map(function (k) { return porCond[k]; }).filter(function (c) { return c.retiradas || c.avarias || c.multas; })
    .sort(function (a, b) { return (b.multas + b.avarias) - (a.multas + a.avarias) || b.retiradas - a.retiradas || a.nome.localeCompare(b.nome, 'pt-BR'); });
  // Casos (Kanban)
  var casos = { abertos: 0, emExecucao: 0, concluidos: 0, descartados: 0, verificados: 0, eficazes: 0, diasAteConcluir: 0, atrasados: 0 };
  var hojeIso = FrotaG_iso_(FrotaG_hojeBr_());
  FrotaG_casos_().forEach(function (c) {
    var e = SGO_UTILS.safeUpper(c.ETAPA);
    if (e === 'ANALISE') casos.abertos++;
    if (e === 'EXECUCAO') { casos.emExecucao++; if (FrotaG_dataBr_(c.QUANDO) && FrotaG_iso_(FrotaG_dataBr_(c.QUANDO)) < hojeIso) casos.atrasados++; }
    var conc = new Date(SGO_UTILS.safe(c.CONCLUIDO_EM)), canc = new Date(SGO_UTILS.safe(c.CANCELADO_EM));
    if (e === 'CONCLUIDA' && !isNaN(conc.getTime()) && conc.getTime() >= inicio.getTime()) {
      casos.concluidos++;
      var cri = new Date(SGO_UTILS.safe(c.CRIADO_EM));
      if (!isNaN(cri.getTime())) casos.diasAteConcluir += Math.max(0, (conc.getTime() - cri.getTime()) / 86400000);
    }
    if (e === 'CANCELADA' && !isNaN(canc.getTime()) && canc.getTime() >= inicio.getTime()) casos.descartados++;
    if (SGO_UTILS.safeUpper(c.EFICAZ)) { casos.verificados++; if (SGO_UTILS.safeUpper(c.EFICAZ) === 'SIM') casos.eficazes++; }
  });
  casos.tempoMedioDias = casos.concluidos ? Math.round((casos.diasAteConcluir / casos.concluidos) * 10) / 10 : null;
  casos.eficaciaPct = pct(casos.eficazes, casos.verificados);
  delete casos.diasAteConcluir;
  return {
    ok: true, dias: dias, periodo: { inicio: FrotaG_br_(inicio), fim: FrotaG_br_(fim) },
    frota: { veiculos: veiculos.length, retiradas: tot.retiradas, kmRodado: tot.kmRodado, custoTotal: tot.custoTotal, custoPorKm: tot.kmRodado > 0 ? tot.custoTotal / tot.kmRodado : null,
      consumoKmL: ag.totais.consumoMedioKmL || null, avarias: tot.avarias, avariasPorMilKm: tot.kmRodado > 0 ? Math.round((tot.avarias / tot.kmRodado) * 1000 * 100) / 100 : null,
      multas: tot.multas, multasValor: tot.multasValor, disponibilidadePct: tot.diasVeiculo ? Math.round(((tot.diasVeiculo - tot.diasParados) / tot.diasVeiculo) * 1000) / 10 : null,
      preventivasFeitas: tot.prevFeitas, preventivasNoPrazoPct: pct(tot.prevNoPrazo, tot.prevFeitas), preventivasVencidas: tot.vencidasAgora },
    veiculos: veiculos, condutores: condutoresLista, casos: casos
  };
}

// ------------------------------------------------------------
// CENTRAL DE PENDÊNCIAS (chamado por Pend_fonteFrota_): avaria sem tratamento e multa com pagamento perto do vencimento.
// ------------------------------------------------------------
function Frota_gestaoPendencias_(add) {
  var casos = {};
  FrotaG_casos_().forEach(function (c) { if (SGO_UTILS.safe(c.ORIGEM_CHAVE)) casos[SGO_UTILS.safe(c.ORIGEM_CHAVE)] = true; });
  var veiculos = {};
  Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function (v) { veiculos[SGO_UTILS.safe(v.ID)] = v; });
  FrotaG_avarias_(FrotaG_diasAtras_(30)).forEach(function (a) {
    if (casos['AVARIA|' + a.movId]) return;
    var placa = SGO_UTILS.safe((veiculos[a.veiculoId] || {}).PLACA) || 'veículo não identificado';
    add(Pend_item_('frota_avaria', {
      id: 'FROTA:AVARIA:' + a.movId, nome: placa + ' (' + a.data + ')', publico: 'GESTAO', gravidade: 'ATENCAO', dias: null, vencimento: a.data, responsavel: 'Gestão da frota',
      titulo: 'Avaria na devolução do veículo ' + placa + ' em ' + a.data,
      detalhe: 'Em ordem na retirada e com problema na devolução: ' + a.itens.map(function (i) { return i.item + (i.observacao ? ' (' + i.observacao + ')' : ''); }).join('; ') + '.',
      oQueFazer: 'Abra Frota > Gestão e melhoria > Kanban e clique em "Abrir caso" no cartão da avaria (ou "Descartar", com o motivo, se for desgaste normal).',
      textoEstavel: 'O veículo \'' + placa + '\' voltou com avaria em ' + a.data + ' e o caso ainda não foi aberto.'
    }));
  });
  Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_MULTA).forEach(function (m) {
    if (SGO_UTILS.safeUpper(m.STATUS) !== 'ABERTA') return;
    var dias = Frota_diasAte_(m.VENCIMENTO);
    if (dias === null || dias > FROTA_CFG.DIAS_AVISO_VENCIMENTO) return;
    var placa = SGO_UTILS.safe((veiculos[SGO_UTILS.safe(m.VEICULO_ID)] || {}).PLACA) || 'veículo não identificado';
    var venc = Frota_textoData_(m.VENCIMENTO), critico = dias <= 0;
    add(Pend_item_(critico ? 'multa_vencida' : 'multa_vencendo', {
      id: 'FROTA:MULTAVENC:' + SGO_UTILS.safe(m.ID), nome: placa + ' (vence ' + venc + ')', publico: 'GESTAO', gravidade: critico ? 'CRITICO' : 'ATENCAO', dias: dias, vencimento: venc,
      responsavel: 'Gestão da frota',
      titulo: 'Multa do veículo ' + placa + (dias === 0 ? ' vence hoje' : (critico ? ' vencida desde ' : ' vence em ') + venc),
      detalhe: 'Multa de ' + Frota_textoData_(m.DATA_INFRACAO) + ', valor R$ ' + SGO_DocA4_num_(Frota_num_(m.VALOR, 0), 2) + '. Depois do vencimento o desconto e o prazo de recurso podem se perder.',
      oQueFazer: 'Pague ou recorra e mude a situação da multa em Frota > Documentos e multas (Paga, Recorrida ou Cancelada); o aviso some na hora.',
      textoEstavel: 'A multa do veículo \'' + placa + '\' ' + (critico ? 'venceu' : 'vence') + ' em ' + venc + '.'
    }));
  });
}
