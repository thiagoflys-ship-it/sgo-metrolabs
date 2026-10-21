/****************************************************
 * FONTE ÚNICA DE ATENDIMENTOS (21/10/2026) — etapa 5 do projeto da Assistência técnica
 *
 * SGO_Atendimentos_linhas_(opcoes) devolve, numa lista só, as tarefas do Auvo (AUVO_TAREFAS, sincronização atual) e as
 * O.S. do módulo novo (ATEC_OS), com os MESMOS campos que os leitores do Auvo já usam (AUVO_TASK_ID, CLIENTE_ID_SGO,
 * CLIENTE_NOME_AUVO, TECNICO_ID_SGO, TECNICO_NOME_AUVO, TIPO_TAREFA, DATA_TAREFA, FINALIZADA, CHECKIN_EM, CHECKOUT_EM,
 * RELATO_SERVICO, QTD_FOTOS, EQUIPAMENTOS_ID_SGO, ENDERECO, TASK_URL, QUESTIONARIO_JSON) mais ORIGEM ('AUVO' ou 'SGO').
 * Assim Painel de qualidade, Conduta (sugestões), Frota (deslocamento), ponto (técnico em atendimento), central,
 * Início, ficha do equipamento e Vínculos seguem funcionando no uso em paralelo, sem reescrita. Na O.S. do SGO+,
 * FINALIZADA = SIM só quando encerrada (documentação pendente conta como aberta).
 *
 * SGO_Atendimentos_doEquipamento_(id) junta também o histórico copiado do Auvo (acervo, etapa 0) já ligado aos
 * equipamentos pelo índice ATEC_ACERVO_EQUIP (montado em lotes curtos por AstF_indexarAcervo_, a partir do JSON de
 * cada tarefa guardado no acervo e do mapeamento AUVO_SYNC, regra "vale o original"). Tarefa sem vínculo fica no
 * índice sem equipamento, para a lista de revisão; nada se perde.
 *
 * Também aqui: importação dos 13 questionários do Auvo como modelos de checklist e dos tipos de tarefa que ainda não
 * existem, a partir das listas de apoio do acervo (só leitura; nada é apagado nem trocado no que a Qualidade editou).
 ****************************************************/

var AST_FONTE_MEMO = null;
function SGO_Atendimentos_invalidar_() { AST_FONTE_MEMO = null; }

function AstF_lerAba_(aba) {
  try { return SGO_DATA.getAll(aba) || []; } catch (e) { return []; }
}

/** O.S. do SGO+ no formato das linhas do Auvo. */
function AstF_linhaDaOs_(o) {
  var s = Ast_up_(o.SITUACAO);
  var resp = Ast_json_(o.RESPOSTAS_JSON, {}) || {}, perg = Ast_normPerguntas_(Ast_json_(o.PERGUNTAS_JSON, []));
  var questionario = perg.filter(function (p) { return resp[p.id]; }).map(function (p) { var v = resp[p.id].v; return { pergunta: p.texto, resposta: Array.isArray(v) ? v.join(', ') : String(v) }; });
  var relato = [Ast_s_(o.SERVICO_REALIZADO), Ast_s_(o.RELATO)].filter(Boolean).join(' · ');
  var abertaDias = '';
  if (s !== 'ENCERRADA' && s !== 'CANCELADA') { var ag = Ast_ms_(o.AGENDADO_PARA); if (ag !== null && ag < Date.now()) abertaDias = Math.floor((Date.now() - ag) / 864e5); }
  return {
    ID: 'ATEC:' + Ast_s_(o.ID), ORIGEM: 'SGO', OS_ID_SGO: Ast_s_(o.ID), CHAMADO_ID_SGO: Ast_s_(o.CHAMADO_ID), SITUACAO_SGO: s,
    AUVO_TASK_ID: Ast_s_(o.NUMERO), CLIENTE_AUVO_ID: '', CLIENTE_ID_SGO: Ast_s_(o.CLIENTE_ID), CLIENTE_NOME_AUVO: Ast_s_(o.CLIENTE_NOME),
    TECNICO_AUVO_ID: '', TECNICO_ID_SGO: Ast_s_(o.TECNICO_ID), TECNICO_NOME_AUVO: Ast_s_(o.TECNICO_NOME), TIPO_TAREFA: Ast_s_(o.TIPO_NOME),
    DATA_TAREFA: Ast_iso_(o.AGENDADO_PARA), FINALIZADA: s === 'ENCERRADA' ? 'SIM' : 'NAO', CANCELADA: s === 'CANCELADA' ? 'SIM' : '',
    CHECKIN_EM: Ast_iso_(o.CHEGOU_EM), CHECKOUT_EM: Ast_iso_(o.CONCLUIU_EM), PRIORIDADE: '', RELATO_SERVICO: relato, QTD_FOTOS: Number(o.QTD_FOTOS) || 0,
    EQUIPAMENTOS_ID_SGO: Ast_s_(o.EQUIPAMENTO_ID), ENDERECO: Ast_s_(o.ENDERECO), TASK_URL: '', QUESTIONARIO_JSON: JSON.stringify(questionario),
    ORIENTACAO: Ast_s_(o.ORIENTACAO), RELATORIO_URL: Ast_s_(o.RELATORIO_PDF_URL), DIAS_ABERTA: abertaDias, DOC_PENDENTE: s === 'DOC_PENDENTE' ? 'SIM' : ''
  };
}

/**
 * Atendimentos das duas origens. opcoes: { origem: 'AUVO'|'SGO', semCanceladas (padrão true) }. Leitura curta guardada por 5 s
 * (a gravação da Assistência limpa). Nunca lança: sem a aba, a origem fica vazia.
 */
function SGO_Atendimentos_linhas_(opcoes) {
  var o = opcoes || {};
  var agora = Date.now();
  if (!AST_FONTE_MEMO || agora - AST_FONTE_MEMO.em > 5000 || agora < AST_FONTE_MEMO.em) {
    var auvo = SGO_CFG.SHEETS.AUVO_TAREFAS ? AstF_lerAba_(SGO_CFG.SHEETS.AUVO_TAREFAS).map(function (t) { return Object.assign({ ORIGEM: 'AUVO' }, t); }) : [];
    var sgo = AstF_lerAba_(AST_ABAS.OS).map(AstF_linhaDaOs_);
    AST_FONTE_MEMO = { em: agora, auvo: auvo, sgo: sgo };
  }
  var semCanc = o.semCanceladas !== false;
  var sgoL = AST_FONTE_MEMO.sgo.filter(function (t) { return !semCanc || t.CANCELADA !== 'SIM'; });
  if (Ast_up_(o.origem) === 'AUVO') return AST_FONTE_MEMO.auvo.slice();
  if (Ast_up_(o.origem) === 'SGO') return sgoL.slice();
  return AST_FONTE_MEMO.auvo.concat(sgoL);
}

/** Existe alguma das duas fontes? (o painel diz "sem dados" só quando nenhuma existe) */
function SGO_Atendimentos_existe_() {
  try { SGO_DATA.getSheet(SGO_CFG.SHEETS.AUVO_TAREFAS); return true; } catch (e) {}
  try { SGO_DATA.getSheet(AST_ABAS.OS); return true; } catch (e2) {}
  return false;
}

/** Abertos agora (para o ponto): check-in sem check-out, não finalizado, das duas origens, por técnico. */
function SGO_Atendimentos_emAtendimento_(uid, agoraMs) {
  agoraMs = agoraMs || Date.now();
  return SGO_Atendimentos_linhas_().filter(function (t) {
    if (Ast_s_(t.TECNICO_ID_SGO) !== Ast_s_(uid) || Ast_up_(t.FINALIZADA) === 'SIM') return false;
    var ci = Ast_ms_(t.CHECKIN_EM);
    return ci !== null && ci <= agoraMs && !Ast_s_(t.CHECKOUT_EM);
  })[0] || null;
}

/**
 * Histórico de atendimentos de um equipamento: O.S. do SGO+, tarefas do Auvo (sincronização) e o acervo do Auvo (cópia
 * da etapa 0). opcoes: { limite, sessao (eu ou sessão: cliente vê só O.S. encerradas do próprio cliente; fotos do acervo só equipe interna) }.
 */
function SGO_Atendimentos_doEquipamento_(equipId, opcoes) {
  var o = opcoes || {};
  equipId = Ast_s_(equipId);
  if (!equipId) return [];
  var s = o.sessao || {}, perfil = Ast_up_(s.perfil), cliente = perfil === 'CLIENTE', clienteId = Ast_s_(s.clienteId);
  var saida = [], vistosAuvo = {};
  SGO_Atendimentos_linhas_().forEach(function (t) {
    if (Ast_s_(t.EQUIPAMENTOS_ID_SGO).split(',').map(Ast_s_).indexOf(equipId) < 0) return;
    if (cliente && Ast_s_(t.CLIENTE_ID_SGO) !== clienteId) return;
    if (cliente && t.ORIGEM === 'SGO' && Ast_up_(t.FINALIZADA) !== 'SIM') return;
    if (t.ORIGEM === 'AUVO') vistosAuvo[Ast_s_(t.AUVO_TASK_ID)] = true;
    saida.push({ origem: t.ORIGEM, origemNome: t.ORIGEM === 'SGO' ? 'SGO+' : 'Auvo', numero: Ast_s_(t.AUVO_TASK_ID), auvoTaskId: t.ORIGEM === 'AUVO' ? Ast_s_(t.AUVO_TASK_ID) : '',
      osId: Ast_s_(t.OS_ID_SGO), chamadoId: Ast_s_(t.CHAMADO_ID_SGO), data: Ast_iso_(t.DATA_TAREFA), dataBr: Ast_brDia_(t.DATA_TAREFA), tipo: Ast_s_(t.TIPO_TAREFA),
      finalizada: Ast_up_(t.FINALIZADA) === 'SIM', tecnico: Ast_s_(t.TECNICO_NOME_AUVO) || (t.TECNICO_AUVO_ID ? 'Técnico Auvo #' + t.TECNICO_AUVO_ID : ''),
      relato: Ast_s_(t.RELATO_SERVICO), relatorioUrl: Ast_s_(t.RELATORIO_URL), link: cliente ? '' : Ast_s_(t.TASK_URL), situacao: Ast_s_(t.SITUACAO_SGO) });
  });
  AstF_lerAba_(AST_ABAS.ACERVO_EQUIP).forEach(function (a) {
    if (Ast_s_(a.EQUIPAMENTO_ID_SGO) !== equipId || vistosAuvo[Ast_s_(a.AUVO_TASK_ID)]) return;
    if (cliente && Ast_s_(a.CLIENTE_ID_SGO) !== clienteId) return;
    vistosAuvo[Ast_s_(a.AUVO_TASK_ID)] = true;
    saida.push({ origem: 'AUVO_ACERVO', origemNome: 'Auvo (histórico)', numero: Ast_s_(a.AUVO_TASK_ID), auvoTaskId: Ast_s_(a.AUVO_TASK_ID), osId: '', data: Ast_iso_(a.DATA_TAREFA),
      dataBr: Ast_brDia_(a.DATA_TAREFA), tipo: Ast_s_(a.TIPO_TAREFA), finalizada: Ast_up_(a.FINALIZADA) === 'SIM', tecnico: Ast_s_(a.TECNICO_NOME), relato: Ast_s_(a.RESUMO),
      qtdArquivos: Number(a.QTD_ARQUIVOS) || 0, acervo: !cliente, link: '' });
  });
  saida.sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); });
  return saida.slice(0, Number(o.limite) || 40);
}

/** Arquivos (fotos e assinaturas) de uma tarefa do acervo: só a equipe interna; o arquivo abre com login (privado). */
function AstF_arquivosAcervo_(eu, taskId) {
  Ast_exigir_(eu, 'INTERNO', 'ver as fotos do histórico do Auvo');
  var id = Ast_s_(taskId).replace(/\D/g, '');
  if (!id) throw new Error('Não foi possível abrir: informe o número da tarefa do Auvo');
  var aba = (typeof AUVO_ACERVO_CFG !== 'undefined' && AUVO_ACERVO_CFG.ABA_ARQUIVOS) || 'AUVO_ACERVO_ARQUIVOS';
  // a aba de arquivos do acervo é grande (cerca de 19 mil linhas): uma leitura só e filtro pela tarefa
  var l = AstF_lerAba_(aba).filter(function (r) { return Ast_s_(r.AUVO_TASK_ID) === id && Ast_s_(r.ARQUIVO_ID); });
  return { taskId: id, arquivos: l.slice(0, 60).map(function (r) {
    var url = '';
    try { url = DriveApp.getFileById(String(r.ARQUIVO_ID)).getUrl(); } catch (e) { url = ''; }
    return { tipo: Ast_s_(r.TIPO), pergunta: Ast_s_(r.PERGUNTA), nome: Ast_s_(r.NOME_ARQUIVO), url: url };
  }) };
}

// ------------------------------------------------------------
// ÍNDICE DO ACERVO POR EQUIPAMENTO (lotes curtos, retomável)
// ------------------------------------------------------------
var AST_ACERVO_LOTE = 120;
function AstF_mapaSync_() {
  var m = { EQUIPAMENTO: {}, CLIENTE: {} };
  if (!SGO_CFG.SHEETS.AUVO_SYNC) return m;
  AstF_lerAba_(SGO_CFG.SHEETS.AUVO_SYNC).forEach(function (r) {
    var t = Ast_up_(r.ENTIDADE_TIPO), a = Ast_s_(r.AUVO_ID);
    if (!m[t] || !a || m[t][a]) return; // vale o original (primeiro vínculo gravado)
    m[t][a] = Ast_s_(r.ENTIDADE_ID);
  });
  return m;
}
function AstF_resumoTarefa_(j) {
  var partes = [];
  try {
    (Array.isArray(j.questionnaires) ? j.questionnaires : []).forEach(function (q) {
      (q && Array.isArray(q.answers) ? q.answers : []).forEach(function (a) {
        var desc = Ast_up_(a && (a.questionDescription || a.description));
        var r = Ast_s_(a && (a.reply || a.answer || a.value));
        if (!r || /^https?:\/\//i.test(r) || /FOTO|ASSINATURA/.test(desc)) return;
        partes.push(r);
      });
    });
  } catch (e) {}
  var rel = Ast_s_(j.report || j.taskReport || j.orientation);
  return [rel].concat(partes).filter(Boolean).join(' · ').slice(0, 600);
}
/**
 * Um lote do índice. Devolve { feitos, total, restantes, semEquipamento, concluido }. Só a gestão roda (tela Transição do
 * Auvo) e a rotina diária continua sozinha até terminar. Lê as abas uma vez por lote; um JSON por vez.
 */
function AstF_indexarAcervo_(opcoes) {
  var o = opcoes || {};
  var abaT = (typeof AUVO_ACERVO_CFG !== 'undefined' && AUVO_ACERVO_CFG.ABA_TAREFAS) || 'AUVO_ACERVO_TAREFAS';
  var tarefas = AstF_lerAba_(abaT);
  if (!tarefas.length) return { feitos: 0, total: 0, restantes: 0, concluido: false, motivo: 'o acervo do Auvo ainda não tem tarefas copiadas' };
  var ja = {};
  AstF_lerAba_(AST_ABAS.ACERVO_EQUIP).forEach(function (r) { ja[Ast_s_(r.AUVO_TASK_ID)] = true; });
  var porTarefa = {};
  tarefas.forEach(function (t) { var id = Ast_s_(t.AUVO_TASK_ID); if (id && (!porTarefa[id] || (Number(t.JSON_VERSAO) || 0) > (Number(porTarefa[id].JSON_VERSAO) || 0))) porTarefa[id] = t; });
  var ids = Object.keys(porTarefa).sort();
  var falta = ids.filter(function (id) { return !ja[id]; });
  var lote = falta.slice(0, Math.max(1, Math.min(500, Number(o.lote) || AST_ACERVO_LOTE)));
  var sync = AstF_mapaSync_(), linhas = [], semEq = 0, t0 = Date.now(), orc = Number(o.orcamentoMs) || 120000;
  for (var i = 0; i < lote.length; i++) {
    if (Date.now() - t0 > orc) break;
    var t = porTarefa[lote[i]], j = null;
    if (Ast_s_(t.JSON_ARQUIVO_ID)) { try { j = JSON.parse(DriveApp.getFileById(String(t.JSON_ARQUIVO_ID)).getBlob().getDataAsString('UTF-8')); } catch (e) { j = null; } }
    var eqs = j && Array.isArray(j.equipmentsId) ? j.equipmentsId.map(Ast_s_).filter(Boolean) : [];
    var cliSgo = sync.CLIENTE[Ast_s_(t.CLIENTE_AUVO_ID) || Ast_s_(j && j.customerId)] || '';
    var base = { AUVO_TASK_ID: lote[i], DATA_TAREFA: Ast_s_(t.DATA_TAREFA), TIPO_TAREFA: Ast_s_(t.TIPO_TAREFA), TECNICO_NOME: Ast_s_(t.TECNICO_NOME), FINALIZADA: Ast_s_(t.FINALIZADA),
      CLIENTE_AUVO_ID: Ast_s_(t.CLIENTE_AUVO_ID), CLIENTE_ID_SGO: cliSgo, RESUMO: j ? AstF_resumoTarefa_(j) : '', QTD_ARQUIVOS: Number(t.QTD_ARQUIVOS) || 0, CRIADO_EM: Ast_agora_() };
    if (!eqs.length) { semEq++; linhas.push(Object.assign({ EQUIP_AUVO_ID: '', EQUIPAMENTO_ID_SGO: '' }, base)); }
    else eqs.forEach(function (ea) { var sg = sync.EQUIPAMENTO[ea] || ''; if (!sg) semEq++; linhas.push(Object.assign({ EQUIP_AUVO_ID: ea, EQUIPAMENTO_ID_SGO: sg }, base)); });
    j = null;
  }
  if (linhas.length) SGO_DATA.insertMany(AST_ABAS.ACERVO_EQUIP, linhas);
  var feitosAgora = linhas.reduce(function (m, l) { m[l.AUVO_TASK_ID] = true; return m; }, {});
  var nFeitos = Object.keys(feitosAgora).length;
  var restantes = falta.length - nFeitos;
  var est = { total: ids.length, indexadas: ids.length - restantes, restantes: restantes, semVinculoNoLote: semEq, em: Ast_agora_(), concluido: restantes <= 0 };
  try { Ast_cfgGravar_('ACERVO_INDICE', est, { id: '', nome: o.porNome || 'Rotina da Assistência' }, 'Índice do acervo do Auvo por equipamento'); } catch (e2) {}
  return { feitos: nFeitos, total: ids.length, restantes: restantes, semEquipamento: semEq, concluido: restantes <= 0 };
}
/** Tarefas do acervo sem equipamento do SGO+ ligado (lista de revisão). */
function AstF_revisaoAcervo_(eu) {
  Ast_exigir_(eu, 'GESTAO', 'ver a revisão do histórico do Auvo');
  var l = AstF_lerAba_(AST_ABAS.ACERVO_EQUIP).filter(function (r) { return !Ast_s_(r.EQUIPAMENTO_ID_SGO); });
  return { total: l.length, itens: l.slice(0, 200).map(function (r) { return { taskId: Ast_s_(r.AUVO_TASK_ID), data: Ast_brDia_(r.DATA_TAREFA), tipo: Ast_s_(r.TIPO_TAREFA), equipAuvo: Ast_s_(r.EQUIP_AUVO_ID), clienteSgo: !!Ast_s_(r.CLIENTE_ID_SGO) }; }) };
}

// ------------------------------------------------------------
// QUESTIONÁRIOS E TIPOS DE TAREFA DO ACERVO
// ------------------------------------------------------------
/** Lista de apoio do acervo (questionarios, tipos_de_tarefa): itens do JSON copiado na etapa 0, ou null. */
function AstF_listaApoio_(nome) {
  try {
    var est = typeof AuvoAcervo_lerEstado_ === 'function' ? AuvoAcervo_lerEstado_() : null;
    var c = est && (est.catalogos || []).filter(function (x) { return x.nome === nome && x.arquivoId; })[0];
    if (!c) return null;
    var j = JSON.parse(DriveApp.getFileById(String(c.arquivoId)).getBlob().getDataAsString('UTF-8'));
    return Array.isArray(j) ? j : (j && Array.isArray(j.itens) ? j.itens : null);
  } catch (e) { return null; }
}
function AstF_tipoPergunta_(q) {
  var t = Ast_semAcento_(q.answerType || q.type || q.questionType || q.tipo), d = Ast_semAcento_(q.description || q.question || q.title || q.name);
  if (/SIGN|ASSINAT/.test(t) || /ASSINATURA/.test(d)) return 'ASSINATURA';
  if (/PHOTO|FOTO|IMAGE|IMAGEM|PICTURE|CAMERA/.test(t) || /\bFOTO/.test(d)) return 'FOTO';
  if (/MULTI|CHECKBOX/.test(t)) return 'MULTIPLA';
  if (/YES|SIM|BOOL/.test(t)) return 'SIM_NAO';
  if (/NUMBER|NUMER|DECIMAL|INTEGER|INT\b/.test(t)) return 'NUMERO';
  if (/DATE|DATA/.test(t)) return 'DATA';
  if (/SELECT|OPTION|CHOICE|LIST|COMBO|RADIO|UNICA/.test(t)) return 'OPCAO';
  return 'TEXTO';
}
function AstF_opcoes_(q) {
  var l = q.options || q.alternatives || q.choices || q.answerOptions || q.possibleAnswers || [];
  if (!Array.isArray(l)) return [];
  return l.map(function (x) { return typeof x === 'object' && x ? Ast_s_(x.description || x.text || x.value || x.name) : Ast_s_(x); }).filter(Boolean);
}
/** Importa os questionários do Auvo como modelos (ORIGEM AUVO) e liga aos tipos que o Auvo exigia. Só acrescenta. */
function AstF_importarDoAcervo_(eu, opcoes) {
  if (!(opcoes && opcoes.sistema)) Ast_exigir_(eu, 'REGRAS', 'trazer os questionários do Auvo');
  var qs = AstF_listaApoio_('questionarios');
  if (!qs) throw new Error('Não foi possível trazer os questionários: a lista de questionários do acervo do Auvo não foi encontrada. Ela é copiada na etapa 0 (Integração Auvo > Acervo do Auvo, fase "Listas de apoio"); depois volte aqui');
  var tiposAuvo = AstF_listaApoio_('tipos_de_tarefa') || [];
  var modelos = Ast_ler_(AST_ABAS.MODELOS), jaQ = {};
  modelos.forEach(function (m) { if (Ast_s_(m.AUVO_QUESTIONARIO_ID)) jaQ[Ast_s_(m.AUVO_QUESTIONARIO_ID)] = Ast_up_(m.CODIGO); });
  var novos = [], agora = Ast_agora_();
  qs.forEach(function (q) {
    var id = Ast_s_(q.id || q.questionnaireId);
    if (!id || jaQ[id]) return;
    var perguntas = (q.questions || q.questionnaireQuestions || q.items || []).map(function (p, i) {
      var tp = AstF_tipoPergunta_(p);
      return { id: 'q' + Ast_s_(p.id || (i + 1)), texto: Ast_texto_(p.description || p.question || p.title || p.name, 300), tipo: tp, obrigatoria: !!(p.requiredAnswer || p.required), opcoes: AstF_opcoes_(p), fotosMin: tp === 'FOTO' ? 1 : 0 };
    });
    var codigo = 'AUVO_Q' + id.replace(/\D/g, '');
    jaQ[id] = codigo;
    novos.push({ ID: 'mod_auvo_' + id.replace(/\D/g, ''), CODIGO: codigo, NOME: Ast_texto_(q.description || q.name || ('Questionário ' + id), 150) + ' (Auvo)', VERSAO: 1,
      PERGUNTAS_JSON: JSON.stringify(Ast_normPerguntas_(perguntas)), ORIGEM: 'AUVO', AUVO_QUESTIONARIO_ID: id, ATIVO: 'SIM', ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora, CRIADO_EM: agora });
  });
  if (novos.length) { SGO_DATA.insertMany(AST_ABAS.MODELOS, novos); delete AST_MEMO[AST_ABAS.MODELOS]; }
  // tipos que exigiam um questionário no Auvo passam a usar o modelo importado (só se a Qualidade não editou o tipo)
  var ligados = 0, tiposNovos = 0, porAuvoId = {};
  tiposAuvo.forEach(function (t) { porAuvoId[Ast_s_(t.id)] = t; });
  var tipos = Ast_ler_(AST_ABAS.TIPOS), conhecidos = {};
  tipos.forEach(function (t) {
    Ast_s_(t.AUVO_TIPOS).split(',').map(Ast_s_).filter(Boolean).forEach(function (aid) {
      conhecidos[aid] = true;
      var ta = porAuvoId[aid], req = ta && ta.requirements ? (ta.requirements.requiredQuestionnaires || []) : [];
      var qid = (Array.isArray(req) ? req : []).map(function (x) { return Ast_s_(typeof x === 'object' ? (x.id || x.questionnaireId) : x); }).filter(function (x) { return jaQ[x]; })[0];
      if (qid && !Ast_s_(t.ATUALIZADO_POR_NOME) && Ast_up_(t.MODELO_CODIGO) !== jaQ[qid]) {
        Ast_atualizar_(AST_ABAS.TIPOS, t.ID, { MODELO_CODIGO: jaQ[qid], EXIGE_CHECKLIST: 'SIM', ATUALIZADO_EM: agora });
        ligados++;
      }
    });
  });
  var extras = [];
  tiposAuvo.forEach(function (ta, i) {
    var aid = Ast_s_(ta.id);
    if (!aid || conhecidos[aid] || Ast_up_(ta.active) === 'FALSE') return;
    var r = ta.requirements || {};
    var nome = Ast_texto_(String(ta.description || ta.name || 'Tipo ' + aid).replace(/\s*\(.*\)\s*$/, ''), 120);
    extras.push({ ID: 'tipo_auvo_' + aid, CODIGO: 'AUVO_' + aid, NOME: nome, GRUPO: 'OUTROS', DESCRICAO: Ast_texto_(ta.description, 300) + ' (trazido do Auvo)', EXIGE_RELATO: r.fillReport ? 'SIM' : '',
      EXIGE_ASSINATURA: r.getSignature ? 'SIM' : '', FOTOS_MIN: Number(r.minimumNumberOfPhotos) || 0, EXIGE_QR_SERIE: '', EXIGE_CHECKLIST: '', MODELO_CODIGO: '', DOCUMENTO_TECNICO: '', SEM_VISITA: '',
      AUVO_TIPOS: aid, ORDEM: 100 + i, ATIVO: 'SIM', ATUALIZADO_EM: agora, CRIADO_EM: agora });
  });
  if (extras.length) { SGO_DATA.insertMany(AST_ABAS.TIPOS, extras); tiposNovos = extras.length; delete AST_MEMO[AST_ABAS.TIPOS]; }
  Ast_evento_('REGRAS', 'MODELOS', 'IMPORTACAO_AUVO', eu, novos.length + ' questionário(s) do Auvo viraram modelos; ' + ligados + ' tipo(s) ligado(s) ao questionário que o Auvo exigia; ' + tiposNovos + ' tipo(s) novo(s).');
  return { modelos: novos.length, ligados: ligados, tiposNovos: tiposNovos,
    message: novos.length + ' questionário(s) do Auvo viraram modelos de checklist' + (ligados ? ', ' + ligados + ' tipo(s) passaram a usar o questionário que o Auvo exigia' : '') + (tiposNovos ? ' e ' + tiposNovos + ' tipo(s) de tarefa novo(s) foram trazidos' : '') + '. Revise em Regras da assistência > Tipos e checklists.' };
}
