/****************************************************
 * ASSISTÊNCIA TÉCNICA — CHECKLISTS DERIVADOS DAS TAREFAS DO AUVO (21/10/2026)
 *
 * No acervo de produção a lista de apoio "questionarios" ficou vazia (o Auvo não respondeu esse endereço), mas cada
 * tarefa copiada traz os questionários respondidos no JSON completo (tarefa_<id>.json): questionnaires[] com id, nome e
 * answers[] (pergunta, tipo de resposta, resposta). Aqui os modelos de checklist são montados a partir dessas respostas:
 * para cada questionário, as perguntas na ordem mais frequente e o tipo de resposta inferido (foto quando a resposta é
 * endereço de imagem, assinatura, sim ou não, número, opção, texto).
 *
 * Cuidados de memória (houve queda do servidor por leitura grande): a aba AUVO_ACERVO_TAREFAS é lida em faixas de
 * linhas (só as colunas usadas), um JSON por vez, JSON acima de 2 MB é pulado, e o acumulado guardado entre os lotes é
 * pequeno (contagens por pergunta, no máximo 15 opções por pergunta). Lotes curtos pela rotina ou pelo botão em Regras
 * da assistência. Os modelos nascem INATIVOS (rascunho): a gestão revisa e ativa no editor do modelo.
 ****************************************************/

var AST_QD_CHAVE = 'QUEST_DERIVA';
var AST_QD_LOTE = 60;
var AST_QD_MAX_BYTES = 2 * 1024 * 1024;
var AST_QD_MAX_OPCOES = 15;
var AST_QD_COLS = ['AUVO_TASK_ID', 'JSON_ARQUIVO_ID', 'QTD_QUESTIONARIOS', 'JSON_VERSAO'];

/** Linhas [ini, ini+n) da aba (0 = primeira linha de dados), só com as colunas pedidas. Sem ler a aba inteira. */
function AstQ_faixa_(aba, ini, n, colunas) {
  var sh = null;
  try { sh = SGO_DATA.getSheet(aba); } catch (e) { return { linhas: [], total: 0 }; }
  if (sh && typeof sh.getRange === 'function' && typeof sh.getLastRow === 'function') {
    var total = Math.max(0, sh.getLastRow() - 1), lc = sh.getLastColumn();
    if (ini >= total) return { linhas: [], total: total };
    var cab = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return Ast_s_(h); });
    var idx = colunas.map(function (c) { return cab.indexOf(c); });
    var max = Math.max.apply(null, idx.concat([0])) + 1, qtd = Math.min(n, total - ini);
    var vals = sh.getRange(ini + 2, 1, qtd, max).getValues();
    return { total: total, linhas: vals.map(function (v) { var o = {}; colunas.forEach(function (c, k) { o[c] = idx[k] >= 0 ? v[idx[k]] : ''; }); return o; }) };
  }
  // ambiente sem planilha (testes antigos): leitura simples
  var l = AstF_lerAba_(aba);
  return { total: l.length, linhas: l.slice(ini, ini + n) };
}

function AstQ_norm_(t) { return Ast_semAcento_(t).replace(/[^A-Z0-9]+/g, ' ').trim(); }
function AstQ_tipoDaResposta_(a, desc) {
  var r = Ast_s_(a.reply !== undefined ? a.reply : (a.answer !== undefined ? a.answer : a.value)), t = Ast_semAcento_(a.answerType || a.type || a.questionType), d = Ast_semAcento_(desc);
  if (/ASSINATURA/.test(d) || /SIGN/.test(t)) return 'ASSINATURA';
  if (/^https?:\/\//i.test(r) && (/\.(jpe?g|png|webp|gif|heic)(\?|$)/i.test(r) || /image|foto|photo|upload|amazonaws|storage/i.test(r))) return 'FOTO';
  if (/\bFOTO/.test(d) || /PHOTO|IMAGE|PICTURE/.test(t)) return 'FOTO';
  var ru = Ast_semAcento_(r);
  if (['SIM', 'NAO', 'YES', 'NO', 'TRUE', 'FALSE', 'S', 'N', 'NA', 'N/A'].indexOf(ru) >= 0) return 'SIM_NAO';
  if (/YES|BOOL/.test(t)) return 'SIM_NAO';
  if (r && /^-?\d+([.,]\d+)?$/.test(r)) return 'NUMERO';
  if (/^\d{2}\/\d{2}\/\d{4}$|^\d{4}-\d{2}-\d{2}/.test(r)) return 'DATA';
  return r ? 'TEXTO' : '';
}

/** Soma um questionário respondido ao acumulado. */
function AstQ_somar_(acc, q) {
  var id = Ast_s_(q.id || q.questionnaireId).replace(/\D/g, '');
  if (!id) return;
  var a = acc[id] = acc[id] || { nome: '', n: 0, p: {} };
  var nome = Ast_s_(q.description || q.name || q.questionnaireDescription || q.title);
  if (nome && !a.nome) a.nome = nome.slice(0, 150);
  a.n++;
  var vistas = {};
  (Array.isArray(q.answers) ? q.answers : []).forEach(function (r, pos) {
    var desc = Ast_s_(r && (r.questionDescription || r.description || r.question || r.title));
    var k = AstQ_norm_(desc).slice(0, 80);
    if (!k || vistas[k]) return;
    vistas[k] = true;
    var p = a.p[k] = a.p[k] || { t: desc.slice(0, 300), n: 0, pos: 0, tp: {}, op: {}, opMuitas: false };
    p.n++; p.pos += pos;
    var tp = AstQ_tipoDaResposta_(r || {}, desc);
    if (tp) p.tp[tp] = (p.tp[tp] || 0) + 1;
    var val = Ast_s_(r.reply !== undefined ? r.reply : r.answer);
    if (tp === 'TEXTO' && val && val.length <= 40 && !p.opMuitas) {
      if (p.op[val] !== undefined) p.op[val]++;
      else if (Object.keys(p.op).length < AST_QD_MAX_OPCOES) p.op[val] = 1;
      else { p.opMuitas = true; p.op = {}; }
    }
  });
}

/** Um lote: lê até `lote` linhas a partir do cursor e soma os questionários. Devolve o estado. */
function AstQ_derivarLote_(opcoes) {
  var o = opcoes || {};
  var abaT = (typeof AUVO_ACERVO_CFG !== 'undefined' && AUVO_ACERVO_CFG.ABA_TAREFAS) || 'AUVO_ACERVO_TAREFAS';
  var est = Ast_cfgChave_(AST_QD_CHAVE, null) || { cursor: 0, lidas: 0, comQuestionario: 0, pulados: 0, acc: {}, concluido: false };
  if (est.concluido && !o.recomecar) return est;
  if (o.recomecar) est = { cursor: 0, lidas: 0, comQuestionario: 0, pulados: 0, acc: {}, concluido: false };
  var lote = Math.max(1, Math.min(200, Number(o.lote) || AST_QD_LOTE)), t0 = Date.now(), orc = Number(o.orcamentoMs) || 90000;
  var f = AstQ_faixa_(abaT, est.cursor, lote, AST_QD_COLS);
  est.total = f.total;
  for (var i = 0; i < f.linhas.length; i++) {
    if (Date.now() - t0 > orc) break;
    var r = f.linhas[i];
    est.cursor++; est.lidas++;
    if ((Number(r.JSON_VERSAO) || 1) > 1 || Number(r.QTD_QUESTIONARIOS) === 0 || !Ast_s_(r.JSON_ARQUIVO_ID)) continue;
    var j = null;
    try {
      var arq = DriveApp.getFileById(String(r.JSON_ARQUIVO_ID));
      if (typeof arq.getSize === 'function' && arq.getSize() > AST_QD_MAX_BYTES) { est.pulados++; continue; }
      j = JSON.parse(arq.getBlob().getDataAsString('UTF-8'));
    } catch (e) { est.pulados++; continue; }
    var qs = j && Array.isArray(j.questionnaires) ? j.questionnaires : [];
    j = null;
    if (qs.length) est.comQuestionario++;
    qs.forEach(function (q) { AstQ_somar_(est.acc, q); });
  }
  est.concluido = est.cursor >= est.total;
  est.em = Ast_agora_();
  AstQ_gravarEstado_(est, o.porNome);
  return est;
}

/** O estado fica numa linha só de ATEC_CONFIG, regravada a cada lote (não cresce uma linha por lote). */
function AstQ_gravarEstado_(est, por) {
  var l = Ast_ler_(AST_ABAS.CONFIG).filter(function (x) { return Ast_s_(x.CHAVE) === AST_QD_CHAVE; })[0];
  var d = { VALOR_JSON: JSON.stringify(est), VERSAO: 1, MOTIVO: 'Checklists a partir das tarefas do Auvo: ' + est.cursor + ' de ' + est.total + ' linhas', ATUALIZADO_POR_NOME: por || 'Rotina da Assistência', ATUALIZADO_EM: Ast_agora_() };
  if (l) Ast_atualizar_(AST_ABAS.CONFIG, l.ID, d); else Ast_inserir_(AST_ABAS.CONFIG, Object.assign({ CHAVE: AST_QD_CHAVE }, d));
}

/** Modelos a partir do acumulado: um por questionário, INATIVO (rascunho). Só cria ou atualiza o rascunho que ninguém editou. */
function AstQ_gerarRascunhos_(eu) {
  var est = Ast_cfgChave_(AST_QD_CHAVE, null);
  if (!est || !est.acc || !Object.keys(est.acc).length) return { criados: 0, atualizados: 0, motivo: 'nenhum questionário encontrado nas tarefas lidas até agora' };
  var modelos = Ast_ler_(AST_ABAS.MODELOS), criados = 0, atualizados = 0, agora = Ast_agora_(), rotina = 'Rotina (tarefas do Auvo)';
  Object.keys(est.acc).forEach(function (id) {
    var a = est.acc[id];
    var perg = Object.keys(a.p).map(function (k) { return a.p[k]; }).filter(function (p) { return p.n >= Math.max(1, Math.ceil(a.n * 0.1)); })
      .sort(function (x, y) { return x.pos / x.n - y.pos / y.n; }).map(function (p, i) {
        var tipos = Object.keys(p.tp).sort(function (x, y) { return p.tp[y] - p.tp[x]; });
        var tipo = tipos[0] || 'TEXTO';
        var opcoes = Object.keys(p.op).filter(function (v) { return p.op[v] >= 2; });
        if (tipo === 'TEXTO' && !p.opMuitas && opcoes.length >= 2 && opcoes.length <= AST_QD_MAX_OPCOES && opcoes.reduce(function (s, v) { return s + p.op[v]; }, 0) >= p.n * 0.8) tipo = 'OPCAO';
        return { id: 'q' + (i + 1), texto: p.t, tipo: tipo, obrigatoria: p.n >= a.n * 0.8, opcoes: tipo === 'OPCAO' ? opcoes : [], fotosMin: tipo === 'FOTO' ? 1 : 0 };
      });
    if (!perg.length) return;
    var codigo = 'AUVO_Q' + id, atual = modelos.filter(function (m) { return Ast_up_(m.CODIGO) === codigo; })[0];
    var dados = { NOME: (a.nome || 'Questionário ' + id) + ' (Auvo, ' + a.n + ' tarefas)', PERGUNTAS_JSON: JSON.stringify(Ast_normPerguntas_(perg)), ORIGEM: 'AUVO', AUVO_QUESTIONARIO_ID: id, ATUALIZADO_POR_NOME: rotina, ATUALIZADO_EM: agora };
    if (!atual) { Ast_inserir_(AST_ABAS.MODELOS, Object.assign({ ID: 'mod_auvo_' + id, CODIGO: codigo, VERSAO: 1, ATIVO: 'NAO' }, dados)); criados++; }
    else if (Ast_up_(atual.ATIVO) === 'NAO' && Ast_s_(atual.ATUALIZADO_POR_NOME) === rotina) { Ast_atualizar_(AST_ABAS.MODELOS, atual.ID, Object.assign({ VERSAO: (Number(atual.VERSAO) || 1) + 1 }, dados)); atualizados++; }
  });
  if (criados || atualizados) Ast_evento_('REGRAS', 'MODELOS', 'DERIVADOS_AUVO', eu, criados + ' modelo(s) criado(s) e ' + atualizados + ' atualizado(s) como rascunho a partir de ' + est.comQuestionario + ' tarefa(s) do Auvo.');
  return { criados: criados, atualizados: atualizados };
}

/** Botão em Regras da assistência e rotina: um lote; ao terminar a leitura, gera os rascunhos. */
function AstQ_derivar_(eu, opcoes) {
  var o = opcoes || {};
  if (!o.sistema) Ast_exigir_(eu, 'REGRAS', 'montar os checklists a partir das tarefas do Auvo');
  var est = AstQ_derivarLote_({ lote: o.lote, orcamentoMs: o.orcamentoMs, porNome: eu && eu.nome, recomecar: !!o.recomecar });
  var g = est.concluido || o.gerarAgora ? AstQ_gerarRascunhos_(eu) : { criados: 0, atualizados: 0 };
  var qs = Object.keys(est.acc || {}).length;
  return { situacao: { lidas: est.cursor, total: est.total, comQuestionario: est.comQuestionario, pulados: est.pulados, questionarios: qs, concluido: est.concluido }, criados: g.criados, atualizados: g.atualizados,
    message: est.total ? 'Tarefas do Auvo lidas: ' + est.cursor + ' de ' + est.total + ' (' + est.comQuestionario + ' com questionário; ' + qs + ' questionário(s) diferentes). ' +
      (est.concluido ? g.criados + ' modelo(s) criado(s) e ' + g.atualizados + ' atualizado(s) como rascunho: revise e ative em Modelos de checklist.' : 'Toque de novo para ler o próximo lote (a rotina também continua de hora em hora).') :
      'O acervo do Auvo ainda não tem tarefas copiadas (Integração Auvo > Acervo do Auvo).' };
}
