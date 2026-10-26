/****************************************************
 * APLICATIVO DO TÉCNICO — MINHAS ATIVIDADES (26/10/2026, agenda única aprovada pelo dono, etapa 3)
 *
 * O Meu dia (Ast_appMeuDia) passa a levar, além das O.S., as atividades internas do técnico (Atividades da equipe) que
 * importam no dia: atrasadas, que vencem até amanhã, em andamento e aguardando. Fica de fora o atendimento de O.S.
 * (OS_ID), que já é a própria O.S. no aplicativo.
 * O técnico faz pelo aplicativo só o básico, também sem internet (a fila do aparelho envia depois pelo Ast_appSincronizar):
 *   ATV_SITUACAO   { atividadeId, situacao: 'Em andamento'|'Aguardando'|'Concluída', observacao, motivo, versao }
 *   ATV_JUSTIFICAR { atividadeId, motivo, categoria, novaPrevisao, versao }
 *   ATV_COMENTAR   { atividadeId, texto }
 * Cada evento chama a mesma API da tela do SGO+ (Atividades_api*), com a sessão do técnico: valem as mesmas regras e
 * mensagens. Criar, editar e passar para outra pessoa continuam só no SGO+.
 * Se outra pessoa mudou a atividade depois que o aparelho a baixou (versao = ATUALIZADO_EM visto no aparelho), vale a
 * mudança dela: a situação ou a justificativa feita no aparelho é recusada com o motivo (aparece em Envios) e a lista
 * atualizada volta na resposta. Comentário sempre entra.
 ****************************************************/

var AST_APP_ATV_TIPOS = ['ATV_SITUACAO', 'ATV_JUSTIFICAR', 'ATV_COMENTAR'];
var AST_APP_ATV_MAX = 30;
var AST_APP_ATV_PESO = { Urgente: 4, Alta: 3, Normal: 2, Baixa: 1 };

/** Atividades do técnico para o Meu dia. Nunca lança (sem o módulo de atividades, lista vazia). */
function AstApp_atividades_(eu) {
  try {
    if (typeof Atividades_todas_ !== 'function') return [];
    var agora = Atividades_agora_(), hoje = agora.slice(0, 10);
    var amanha = Utilities.formatDate(new Date(Date.now() + 86400000), ATV_FUSO, 'yyyy-MM-dd');
    return Atividades_todas_().filter(function (a) {
      if (String(a.RESPONSAVEL_ID) !== String(eu.id) || !Atividades_aberta_(a)) return false;
      if (typeof Atividades_daOS_ === 'function' && Atividades_daOS_(a)) return false;
      var prev = String(a.PREVISAO_ATUAL || a.PRAZO || '');
      return Atividades_vencida_(a, agora) || (prev && prev.slice(0, 10) <= amanha) || a.SITUACAO === 'Em andamento' || a.SITUACAO === 'Aguardando';
    }).map(function (a) {
      var prev = String(a.PREVISAO_ATUAL || a.PRAZO || '');
      return {
        id: String(a.ID), titulo: String(a.TITULO || ''), descricao: String(a.DESCRICAO || '').slice(0, 600), prioridade: a.PRIORIDADE || 'Normal',
        situacao: a.SITUACAO, prazo: prev, prazoOriginal: String(a.PRAZO || ''), atrasada: Atividades_vencida_(a, agora), venceHoje: prev.slice(0, 10) === hoje,
        cliente: String(a.CLIENTE_NOME || ''), modulo: String(a.MODULO_NOME || ''), lancadaPor: String(a.CRIADO_POR_NOME || ''), justificativas: Number(a.QTD_JUSTIFICATIVAS) || 0,
        motivoAguardando: String(a.MOTIVO_AGUARDANDO || ''), versao: String(a.ATUALIZADO_EM || a.CRIADO_EM || '')
      };
    }).sort(function (x, y) {
      return (y.atrasada - x.atrasada) || ((AST_APP_ATV_PESO[y.prioridade] || 2) - (AST_APP_ATV_PESO[x.prioridade] || 2)) || (x.prazo < y.prazo ? -1 : x.prazo > y.prazo ? 1 : 0);
    }).slice(0, AST_APP_ATV_MAX);
  } catch (e) {
    console.error('Aplicativo do técnico, atividades: ' + ((e && e.message) || e));
    return [];
  }
}

/** Motivos de atraso (os mesmos da tela do SGO+) para a justificativa no aparelho. */
function AstApp_motivosAtraso_() { return typeof ATV_MOTIVOS_ATRASO !== 'undefined' ? ATV_MOTIVOS_ATRASO.slice() : []; }

/** Mudança de outra pessoa depois da versão vista no aparelho (histórico da atividade). null se não houve. */
function AstApp_mudancaDeOutro_(eu, atividadeId, versao) {
  if (!versao || typeof Atividades_historico_ !== 'function') return null;
  var h = Atividades_historico_(atividadeId).filter(function (x) {
    return String(x.DATA || '') > String(versao) && String(x.USUARIO_ID) !== String(eu.id) && String(x.TIPO) !== 'COMENTARIO';
  });
  return h.length ? h[0] : null; // histórico vem do mais recente para o mais antigo
}

/** Aplica um evento ATV_* com a sessão do técnico. Devolve { ok, nota } ou { ok:false, definitivo, motivo, corrigir }. */
function AstApp_aplicarAtividade_(sessionId, eu, tipo, dados) {
  var d = dados || {}, id = String(d.atividadeId || '').trim();
  if (!id) return { ok: false, definitivo: true, motivo: 'atividade não informada', corrigir: 'Atualize o aplicativo.' };
  if (typeof Atividades_apiMudarSituacao !== 'function') return { ok: false, definitivo: false, motivo: 'o módulo de atividades não está disponível agora', corrigir: 'O app tenta de novo sozinho.' };
  if (tipo !== 'ATV_COMENTAR') {
    var outro = AstApp_mudancaDeOutro_(eu, id, d.versao);
    if (outro) {
      return { ok: false, definitivo: true,
        motivo: (outro.USUARIO_NOME || 'A gestão') + ' mudou esta atividade em ' + Atividades_dataBr_(outro.DATA) + ', depois que o aparelho a baixou. Vale a mudança dela; a sua não foi aplicada',
        corrigir: 'Abra Minhas atividades no Meu dia (já atualizada), confira e faça de novo, se ainda for o caso.' };
    }
  }
  var r;
  if (tipo === 'ATV_SITUACAO') r = Atividades_apiMudarSituacao(sessionId, { id: id, situacao: String(d.situacao || ''), observacao: d.observacao || '', motivo: d.motivo || '' });
  else if (tipo === 'ATV_JUSTIFICAR') r = Atividades_apiJustificar(sessionId, { id: id, motivo: d.motivo || '', categoria: d.categoria || '', novaPrevisao: d.novaPrevisao || '' });
  else r = Atividades_apiComentar(sessionId, { id: id, texto: d.texto || '' });
  if (r && r.ok) return { ok: true, nota: String(r.message || '').slice(0, 200) };
  return { ok: false, definitivo: true, motivo: String((r && r.message) || 'recusado').replace(/^Não foi possível [^:]+:\s*/, ''), corrigir: 'Abra a atividade no Meu dia, corrija e faça de novo.' };
}
