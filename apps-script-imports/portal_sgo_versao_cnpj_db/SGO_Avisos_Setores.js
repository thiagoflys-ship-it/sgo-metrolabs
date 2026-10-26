/****************************************************
 * AVISOS POR SETOR (26/10/2026, fase 4b do plano de avisos aprovado pelo dono)
 *
 * Eventos da matriz de avisos (SGO_Avisos_Matriz.js) dos setores que ainda não tinham evento próprio. Como os da
 * Assistência técnica (SGO_Pendencias_Assistencia.js), entram em MTZ_PADRAO ao carregar e aparecem na tela da matriz:
 *  - CP01 Compras: os avisos que o módulo já manda (requisição aprovada ou reprovada, item disponível, especificação
 *    devolvida, cancelamento, conferência, divergência no financeiro). Origem COMPRAS -> CP01.
 *  - VC01 Vencimentos: uma vez por dia, cada pessoa recebe, no e-mail de resumo do dia, o que vence e é dela pela
 *    central de pendências (padrões de referência, calibrações e requalificações de equipamentos, documentos, CNH e
 *    documentos e manutenções de veículos). Só o vencido e o que vence em até 7 dias; sem valores nem dados pessoais
 *    de colegas (a central já filtra o que cada pessoa enxerga).
 * Com o evento marcado "na hora" na matriz, o notificador manda também pelo WhatsApp (expediente, vínculo, piloto e
 * teto diário). O padrão aprovado não muda nada: CP01 e VC01 começam sem WhatsApp.
 ****************************************************/

var SET_MTZ_EVENTOS = [
  { cod: 'CP01', modulo: 'compras', evento: 'Avisos de Compras (requisição aprovada ou reprovada, item disponível, especificação devolvida, cancelamento, conferência)', origem: 'SGO_Compras_*.js', publico: 'Solicitante, comprador, vendedor e Financeiro, conforme o aviso', email: 'HORA', whatsapp: 'NAO', limite: '1 por aviso (agrupado por pessoa)', obs: 'O e-mail sai agrupado na rotina de Compras. Marque "na hora" para mandar também pelo WhatsApp.', area: 'LOGISTICA' },
  { cod: 'VC01', modulo: 'vencimentos', evento: 'Vencimentos que dependem de você (padrões, calibrações, requalificações, documentos, CNH e veículos)', origem: 'SGO_Avisos_Setores.js', publico: 'Quem enxerga o item na central de pendências (gestor da área, rotina da Frota, o próprio condutor)', email: 'RESUMO', whatsapp: 'NAO', limite: '1 por pessoa por dia', obs: 'Só o vencido e o que vence em até 7 dias. Marque "na hora" para receber também pelo WhatsApp no início do expediente.' }
];
var SET_VENC_TIPOS = ['padrao_vencido', 'padrao_vencendo', 'documento_vencido', 'documento_vencendo', 'calibracao_vencida', 'calibracao_vencendo',
  'requalificacao_vencida', 'requalificacao_vencendo', 'cnh_vencida', 'cnh_vencendo', 'veiculo_doc_vencido', 'veiculo_doc_vencendo', 'manutencao_vencida', 'manutencao_vencendo'];
var SET_VENC_DIAS = 7;

function Setores_registrarEventos_() {
  try {
    if (typeof MTZ_PADRAO !== 'undefined' && Array.isArray(MTZ_PADRAO)) SET_MTZ_EVENTOS.forEach(function (ev) { if (!MTZ_PADRAO.some(function (x) { return x && x.cod === ev.cod; })) MTZ_PADRAO.push(ev); });
    if (typeof MTZ_MODULOS_NOMES !== 'undefined' && MTZ_MODULOS_NOMES) {
      if (!MTZ_MODULOS_NOMES.compras) MTZ_MODULOS_NOMES.compras = 'Compras';
      if (!MTZ_MODULOS_NOMES.vencimentos) MTZ_MODULOS_NOMES.vencimentos = 'Vencimentos';
    }
    if (typeof MTZ_ORIGEM_EVENTO !== 'undefined' && MTZ_ORIGEM_EVENTO && !MTZ_ORIGEM_EVENTO.COMPRAS) MTZ_ORIGEM_EVENTO.COMPRAS = 'CP01';
  } catch (e) { try { console.error('Avisos por setor (registro): ' + ((e && e.message) || e)); } catch (x) {} }
}

/**
 * Vencimentos do dia (VC01): uma mensagem por pessoa, uma vez por dia, na primeira rodada do resumo do dia
 * (SGO_resumoDiaRodada_). Nunca lança. Devolve { pessoas, enviados } ou { fora }.
 */
function Setores_vencimentosDia_(quando) {
  try {
    Setores_registrarEventos_();
    var regra = typeof SGO_avisoRegra_ === 'function' ? SGO_avisoRegra_('VC01') : null;
    if (!regra || regra.decisao === 'HISTORICO' || (regra.email === 'NAO' && regra.whatsapp === 'NAO')) return { fora: 'evento VC01 desligado na matriz de avisos' };
    var hoje = Utilities.formatDate(quando || new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty('SET_VENC_DIA') === hoje) return { fora: 'já feito hoje' };
    props.setProperty('SET_VENC_DIA', hoje);
    if (typeof Pend_contextoDaSessao_ !== 'function' || typeof Pend_resposta_ !== 'function') return { fora: 'central de pendências indisponível' };
    var usuarios = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) {
      var p = SGO_UTILS.safeUpper(u.PERFIL);
      return SGO_UTILS.safeUpper(u.STATUS || 'ATIVO') === 'ATIVO' && p && p !== 'CLIENTE' && p !== 'AUVO_SYNC';
    });
    var r = { pessoas: 0, enviados: 0 };
    usuarios.forEach(function (u) {
      var ctx = Pend_contextoDaSessao_({ userId: String(u.ID), perfil: u.PERFIL, nome: u.NOME, usuario: u.USUARIO });
      var itens = (Pend_resposta_(ctx, { semCache: true }).itens || []).filter(function (i) {
        if (SET_VENC_TIPOS.indexOf(String(i.tipo)) < 0) return false;
        return i.dias === null || i.dias === undefined || Number(i.dias) <= SET_VENC_DIAS;
      });
      if (!itens.length) return;
      r.pessoas++;
      var linhas = itens.slice(0, 15).map(function (i) { return '- ' + String(i.titulo || '').replace(/\s+/g, ' ').slice(0, 160); });
      var texto = 'Vencimentos que dependem de você hoje (' + itens.length + '):\n' + linhas.join('\n') + (itens.length > 15 ? '\n(e mais ' + (itens.length - 15) + ')' : '') +
        '\n\nVeja e resolva na central de pendências do SGO+ (Início).';
      var res = SGO_notificar_({ usuarios: [String(u.ID)], canais: regra.whatsapp === 'HORA' ? ['email', 'whatsapp'] : ['email'], evento: 'VC01', origem: 'VENCIMENTOS', refId: 'VC01-' + hoje + '-' + u.ID,
        titulo: itens.length === 1 ? '1 vencimento depende de você' : itens.length + ' vencimentos dependem de você', texto: texto });
      if (res && res.ok) r.enviados++;
    });
    return r;
  } catch (e) {
    try { console.error('Avisos por setor (vencimentos): ' + ((e && e.message) || e)); } catch (x) {}
    return { erro: String((e && e.message) || e) };
  }
}

Setores_registrarEventos_();
