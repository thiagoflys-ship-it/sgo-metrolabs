/****************************************************
 * COMERCIAL — A ESPECIALISTA DE VERDADE (01/11/2026)
 *
 * Pedido do dono: "preciso que ela seja especialista mesmo e defina estratégias e que não seja genérica e que se uma não
 * der ela bola outra".
 *
 * "Pedir à especialista" (ficha, Quadro e Gantt) devolve, para UMA oportunidade:
 *   - o diagnóstico em 2 ou 3 frases com fatos do sistema (datas, dias, tentativas, valores);
 *   - o plano A (objetivo, 3 a 5 passos datados com canal, mensagem pronta, respostas às objeções, critério de sucesso);
 *   - os planos B e C, cada um com o GATILHO de troca (condição e data) e uma abordagem diferente de verdade;
 *   - a próxima ação com data, hora e canal, que o vendedor cria em Minhas atividades com um toque (ComEsp_criarAcao_).
 *
 * Fatos completos (ComEsp_fatos_): contatos registrados (data, canal, resultado), tentativas sem resposta, objeções que
 * aparecem no histórico, propostas e revisões (valores, desconto, validade, situação), dias na etapa e o critério de saída,
 * o histórico do cliente (compras e perdas, quem ganhou e por quanto), preços do Banco e a faixa de mercado, urgência e
 * prazo, licitação ou contrato. VISIBILIDADE: o vendedor só recebe as próprias oportunidades do cliente (nada de cliente,
 * preço ou oportunidade de outro vendedor), nunca custo, margem, preço de compra nem a regra do preço (que permitiria
 * derivar o custo). A gestão recebe tudo.
 *
 * Memória de planos (aba COM_PLANOS_ESPECIALISTA, uma linha por plano posto em uso): qual plano está em uso, o histórico
 * dos tentados e o motivo de cada falha. O vendedor marca "Usar este plano", "Troquei para o plano X" (com o motivo),
 * "Deu certo" ou "Não deu certo" (com o motivo). A consulta seguinte recebe os planos que falharam e é PROIBIDA de
 * repetir a abordagem deles (o verificador confere). Plano em uso com o gatilho vencido e sem resposta do cliente desde
 * que começou conta como falho: a ficha e a especialista sugerem a troca. Gravação sempre com merge (ComEsp_gravarPlano_).
 *
 * Verificador anti-genérico (ComEsp_verificar_): frase vazia ("manter contato", "agregar valor", "entender a necessidade"
 * sem dizer qual, "follow-up"), passo sem data ou com data inválida, plano B ou C igual ao A, abordagem repetida de plano
 * que falhou, número que não está nos dados do sistema, promessa, norma, fabricante. Resposta recusada é refeita até 2
 * vezes com os problemas apontados; depois vale a alternativa por regras (ComEsp_planosRegras_), que também entrega A, B
 * e C concretos a partir dos fatos e da metodologia. Cada chamada à IA gasta a cota por pessoa e hora do Comercial
 * (ComO_cotaIA_, a mesma do Orçamentista): sem cota, sem chave ou com erro, valem as regras com o aviso do porquê.
 *
 * Ela NÃO envia nada, NÃO muda etapa e NÃO cria atividade sozinha: a próxima ação só nasce no toque do vendedor.
 ****************************************************/

var COM_ESP_ABORDAGENS = {
  CANAL: 'Trocar o canal e o horário com o mesmo contato',
  DECISOR: 'Subir para o decisor (engenharia clínica, diretoria técnica ou administrativa)',
  USUARIO: 'Gerar a dor com quem usa (CME, enfermagem, centro cirúrgico)',
  COMPRAS: 'Caminho de compras (cadastro de fornecedor, pedido, empenho)',
  VISITA_TECNICA: 'Visita técnica ou diagnóstico presencial',
  CONFORMIDADE: 'Risco de conformidade e auditoria (vigilância sanitária, acreditação)',
  URGENCIA: 'Prazo e agenda (data limite do cliente, agenda técnica confirmada)',
  PACOTE_ANUAL: 'Pacote anual ou contrato (visitas programadas; condição aprovada pela gestão)',
  ESCOPO: 'Recalcular o escopo (fases, prioridade nos equipamentos críticos)',
  CONDICAO: 'Mudar a condição de pagamento, não o preço',
  VALOR_TECNICO: 'Comparar valor técnico, não preço (o que está incluso, custo da parada)',
  PROPOSTA: 'Apresentar a proposta em reunião, com data de decisão',
  GESTAO: 'Envolver a gestão comercial da Metrolabs com o decisor',
  LICITACAO: 'Caminho da compra pública (edital, termo de referência, ata, dispensa)',
  ENCERRAR: 'Encerramento educado com prazo, ou perda honesta'
};
var COM_ESP_CENARIOS = {
  SEM_RESPOSTA: 'cliente sem resposta', DESCONTO: 'pedido de desconto ou concorrente mais barato', QUALIFICACAO: 'qualificação incompleta (dor, decisor, verba, prazo)',
  PROPOSTA: 'proposta a apresentar ou sem decisão', NEGOCIACAO: 'negociação e data de decisão', LICITACAO: 'compra pública ou contrato'
};
var COM_ESP_ORDEM = {
  SEM_RESPOSTA: ['CANAL', 'DECISOR', 'USUARIO', 'VISITA_TECNICA', 'CONFORMIDADE', 'GESTAO', 'ENCERRAR'],
  DESCONTO: ['VALOR_TECNICO', 'ESCOPO', 'PACOTE_ANUAL', 'CONDICAO', 'DECISOR', 'GESTAO', 'ENCERRAR'],
  QUALIFICACAO: ['USUARIO', 'DECISOR', 'VISITA_TECNICA', 'CONFORMIDADE', 'CANAL', 'ENCERRAR'],
  PROPOSTA: ['PROPOSTA', 'URGENCIA', 'DECISOR', 'VALOR_TECNICO', 'VISITA_TECNICA', 'COMPRAS'],
  NEGOCIACAO: ['DECISOR', 'CONDICAO', 'URGENCIA', 'PACOTE_ANUAL', 'GESTAO', 'ENCERRAR'],
  LICITACAO: ['LICITACAO', 'CONFORMIDADE', 'COMPRAS', 'DECISOR', 'PACOTE_ANUAL', 'ENCERRAR']
};
/** Frases vazias (o verificador recusa a resposta que as usa). */
var COM_ESP_VAZIAS = [
  /\bmanter\s+(o\s+|um\s+)?contato\b/i,
  /\bagregar\s+valor\b/i,
  /\bentender\s+(melhor\s+)?(a|as)\s+necessidades?(\s+do\s+cliente)?(?!\s+(de|da|do|dos|das|com|sobre|para|em)\s)/i,
  /\bfollow[\s-]?up\b/i,
  /\bestreitar\s+(o\s+)?relacionamento\b/i,
  /\balinhar\s+(as\s+)?expectativas\b/i,
  /\bbuscar\s+sinergia/i,
  /\bser\s+proativ[oa]\b/i,
  /\bfazer\s+(um\s+)?acompanhamento\s*[.;]?$/i,
  /\bentrar\s+em\s+contato\s*[.;]?$/i
];
var COM_ESP_CANAIS = { LIGACAO: 'Ligação', WHATSAPP: 'WhatsApp', EMAIL: 'E-mail', REUNIAO: 'Reunião', VISITA: 'Visita' };
var COM_ESP_SITUACOES = { EM_USO: 'Em uso', DEU_CERTO: 'Deu certo', NAO_DEU_CERTO: 'Não deu certo', TROCADO: 'Trocado (não andou)', ATUALIZADO: 'Atualizado por consulta nova' };
var COM_ESP_SIMILAR = 0.5;
var COM_ESP_REFACOES = 2;
var COM_ESP_PARADAS = { 'para': 1, 'pela': 1, 'pelo': 1, 'com': 1, 'sem': 1, 'que': 1, 'uma': 1, 'como': 1, 'mais': 1, 'antes': 1, 'depois': 1, 'cliente': 1, 'contato': 1, 'proposta': 1,
  'hospital': 1, 'sobre': 1, 'este': 1, 'esta': 1, 'isso': 1, 'quem': 1, 'qual': 1, 'quando': 1, 'data': 1, 'seu': 1, 'sua': 1, 'dele': 1, 'dela': 1, 'metrolabs': 1, 'plano': 1, 'pedir': 1,
  'enviar': 1, 'ligar': 1, 'combinar': 1, 'confirmar': 1, 'decisao': 1, 'reuniao': 1, 'mensagem': 1, 'email': 1, 'whatsapp': 1, 'ligacao': 1, 'hoje': 1, 'dias': 1, 'uteis': 1, 'ate': 1 };

// ------------------------------------------------------------
// UTILITÁRIOS
// ------------------------------------------------------------
function ComEsp_diaUtil_(d) {
  if (typeof Ges_diaUtil_ === 'function') { try { return Ges_diaUtil_(d, Com_expediente_()); } catch (e) {} }
  var w = new Date(d + 'T12:00:00Z').getUTCDay();
  return w !== 0 && w !== 6;
}
/** Dia útil n a partir de hoje (n = 0: hoje, ou o próximo dia útil se hoje não for). ISO aaaa-mm-dd. */
function ComEsp_du_(base, n) {
  var b = Com_s_(base).slice(0, 10);
  if (!ComEsp_diaUtil_(b)) b = Com_somarDiasUteis_(b, 1);
  return n > 0 ? Com_somarDiasUteis_(b, n) : b;
}
/** dd/mm/aaaa ou aaaa-mm-dd -> aaaa-mm-dd ('' se inválido). */
function ComEsp_isoDe_(v) {
  var s = Com_s_(v), m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  var iso = m ? m[3] + '-' + m[2] + '-' + m[1] : (/^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '');
  if (!iso) return '';
  var d = new Date(iso + 'T12:00:00Z');
  return isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? '' : iso;
}
function ComEsp_norm_(t) { return Com_normBusca_(t); }
function ComEsp_palavras_(t, ignorar) {
  var s = {};
  ComEsp_norm_(t).split(' ').forEach(function (w) { if (w.length >= 4 && !COM_ESP_PARADAS[w] && !(ignorar && ignorar[w]) && !/^\d+$/.test(w)) s[w] = 1; });
  return s;
}
/** Semelhança (Jaccard) entre dois textos, sem as palavras comuns a qualquer plano desta oportunidade. 0 a 1. */
function ComEsp_similar_(a, b, ignorar) {
  var x = ComEsp_palavras_(a, ignorar), y = ComEsp_palavras_(b, ignorar), kx = Object.keys(x), ky = Object.keys(y);
  if (!kx.length || !ky.length) return 0;
  var inter = kx.filter(function (k) { return y[k]; }).length;
  return inter / (kx.length + ky.length - inter);
}
function ComEsp_textoPlano_(p) {
  return [Com_s_(p && p.titulo), Com_s_(p && p.objetivo)].concat(((p && p.passos) || []).map(function (s) { return Com_s_(s && s.acao); })).join(' ');
}
/** Nome do canal no meio da frase (WhatsApp mantém a grafia). */
function ComEsp_canalMin_(k) { return k === 'WHATSAPP' ? 'WhatsApp' : Com_s_(COM_ESP_CANAIS[k]).toLowerCase(); }
/** Título da oportunidade no meio da frase: só a primeira letra minúscula (siglas e códigos ficam como estão). */
function ComEsp_assunto_(t) { var s = Com_s_(t); return s && !/^[A-Z]{2}/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
function ComEsp_canal_(v) { var c = Com_up_(v).replace(/[^A-Z]/g, ''); if (c === 'MAIL' || c === 'EMAILS') c = 'EMAIL'; if (c === 'TELEFONE' || c === 'LIGAR') c = 'LIGACAO'; return COM_ESP_CANAIS[c] ? c : ''; }
function ComEsp_frases_(t) { return Com_s_(t).split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9"])/).filter(function (f) { return f.trim().length > 3; }).length; }

// ------------------------------------------------------------
// MEMÓRIA DE PLANOS (aba COM_PLANOS_ESPECIALISTA)
// ------------------------------------------------------------
function ComEsp_planosDe_(oid) {
  return Com_ler_(COM_ABAS.PLANOS).filter(function (r) { return Com_s_(r.OPORTUNIDADE_ID) === Com_s_(oid); })
    .sort(function (a, b) { return Com_s_(a.INICIADO_EM || a.CRIADO_EM).localeCompare(Com_s_(b.INICIADO_EM || b.CRIADO_EM)); });
}

/**
 * Grava (merge) um plano: campo vazio nunca apaga o que já está gravado; MOTIVO se acumula ("dd/mm/aaaa: texto"). Devolve a
 * linha como ficou. id vazio = linha nova. Chamar dentro da trava.
 */
function ComEsp_gravarPlano_(id, campos) {
  var agora = Com_agora_();
  if (!Com_s_(id)) {
    var limpo = {};
    Object.keys(campos || {}).forEach(function (k) { if (campos[k] !== undefined && campos[k] !== null) limpo[k] = campos[k]; });
    limpo.ATUALIZADO_EM = agora;
    return SGO_DATA.insert(COM_ABAS.PLANOS, limpo);
  }
  var atual = SGO_DATA.getById(COM_ABAS.PLANOS, Com_s_(id));
  if (!atual) throw new Error('Não foi possível gravar: o plano não foi encontrado. Peça à especialista de novo');
  var mud = {};
  Object.keys(campos || {}).forEach(function (k) {
    if (k === 'ID' || k === 'CRIADO_EM') return;
    var v = campos[k];
    if (v === undefined || v === null || Com_s_(v) === '') return; // merge: vazio não apaga
    if (k === 'MOTIVO' && Com_s_(atual.MOTIVO) && Com_s_(atual.MOTIVO).indexOf(Com_s_(v)) < 0) v = Com_s_(atual.MOTIVO) + '\n' + Com_s_(v);
    if (Com_s_(atual[k]) !== Com_s_(v)) mud[k] = v;
  });
  if (!Object.keys(mud).length) return atual;
  mud.ATUALIZADO_EM = agora;
  SGO_DATA.update(COM_ABAS.PLANOS, atual.ID, mud);
  return Object.assign({}, atual, mud);
}

/** Linha da memória para a tela e para o prompt. */
function ComEsp_planoTela_(r) {
  return { id: Com_s_(r.ID), letra: Com_s_(r.LETRA), abordagem: Com_up_(r.ABORDAGEM), abordagemNome: COM_ESP_ABORDAGENS[Com_up_(r.ABORDAGEM)] || Com_s_(r.ABORDAGEM), titulo: Com_s_(r.TITULO),
    resumo: Com_s_(r.RESUMO), gatilho: Com_s_(r.GATILHO), gatilhoAte: Com_brDia_(r.GATILHO_ATE), gatilhoAteIso: Com_dia_(r.GATILHO_ATE), situacao: Com_up_(r.SITUACAO),
    situacaoNome: COM_ESP_SITUACOES[Com_up_(r.SITUACAO)] || Com_s_(r.SITUACAO), motivo: Com_s_(r.MOTIVO), desde: Com_brDia_(r.INICIADO_EM), decididoEm: Com_brDia_(r.DECIDIDO_EM),
    por: Com_s_(r.INICIADO_POR_NOME), sugestaoId: Com_s_(r.SUGESTAO_ID), origem: Com_s_(r.ORIGEM) };
}

/**
 * Memória de uma oportunidade: o plano em uso, se o gatilho dele venceu (prazo passou e o cliente não respondeu desde que o
 * plano começou), os planos que falharam (não deu certo, trocado, ou em uso com o gatilho vencido) e o histórico.
 */
function ComEsp_memoria_(oid, regs, hoje) {
  hoje = hoje || Com_hoje_();
  var linhas = ComEsp_planosDe_(oid), emUso = null;
  linhas.forEach(function (r) { if (Com_up_(r.SITUACAO) === 'EM_USO') emUso = r; });
  var vencido = false;
  if (emUso && Com_dia_(emUso.GATILHO_ATE) && Com_dia_(emUso.GATILHO_ATE) < hoje) {
    var desde = Com_iso_(emUso.INICIADO_EM);
    var respondeu = (regs || Com_ler_(COM_ABAS.CONTATOS_REG).filter(function (c) { return Com_s_(c.OPORTUNIDADE_ID) === Com_s_(oid); }))
      .some(function (c) { return Com_iso_(c.DATA) >= desde && Com_up_(c.RESPONDEU) === 'SIM'; });
    vencido = !respondeu;
  }
  var falhos = linhas.filter(function (r) { var s = Com_up_(r.SITUACAO); return s === 'NAO_DEU_CERTO' || s === 'TROCADO' || (s === 'EM_USO' && vencido); })
    .map(function (r) {
      var p = ComEsp_planoTela_(r), j = Com_json_(r.PLANO_JSON, {}) || {};
      p.texto = ComEsp_textoPlano_(j) || p.titulo;
      if (Com_up_(r.SITUACAO) === 'EM_USO') p.motivo = 'o gatilho venceu em ' + p.gatilhoAte + ' sem resposta do cliente desde ' + p.desde;
      return p;
    });
  var m = { emUso: emUso ? ComEsp_planoTela_(emUso) : null, gatilhoVencido: vencido, falhos: falhos, historico: linhas.slice().reverse().map(ComEsp_planoTela_) };
  if (vencido) m.sugestaoTroca = 'O gatilho do plano ' + m.emUso.letra + ' (' + m.emUso.titulo + ') venceu em ' + m.emUso.gatilhoAte + ' sem resposta do cliente: troque de plano. Peça à especialista: ela não repete este plano.';
  return m;
}

/** Resumo para a ficha da oportunidade (plano em uso, gatilho, sugestão de troca). Nunca lança. */
function ComEsp_resumoFicha_(o) {
  try {
    if (!COM_ABAS.PLANOS) return null;
    var m = ComEsp_memoria_(Com_s_(o.ID));
    if (!m.emUso && !m.historico.length) return null;
    return { emUso: m.emUso, gatilhoVencido: m.gatilhoVencido, sugestaoTroca: m.sugestaoTroca || '', tentados: m.historico.length, falhos: m.falhos.length };
  } catch (e) { return null; }
}

// ------------------------------------------------------------
// FATOS (o que a especialista pode usar), respeitando quem vê o quê
// ------------------------------------------------------------
var COM_ESP_OBJ = [
  { re: /\b(caro|cara|caros|pre[cç]o\s+(alto|acima)|valor\s+(alto|acima)|mais\s+barat\w*|desconto|abaixar|baixar\s+o\s+(pre[cç]o|valor))/i, objecao: 'Está caro' },
  { re: /\b(j[aá]\s+(tem|temos|tenho|possu\w+)\s+(um\s+|outro\s+)?fornecedor|fornecedor\s+atual|concorrente|outra\s+empresa|outro\s+fornecedor)/i, objecao: 'Já tenho fornecedor' },
  { re: /\b(sem\s+verba|n[aã]o\s+tem\s+verba|verba|or[cç]amento\s+(fechado|estourado|do\s+ano)|sem\s+or[cç]amento)/i, objecao: 'Sem verba agora' },
  { re: /\b(manda(r)?\s+por\s+e-?mail|envia(r)?\s+por\s+e-?mail)/i, objecao: 'Manda por e-mail' },
  { re: /\b(vou\s+ver|vamos\s+ver|vou\s+analisar|vamos\s+analisar|retorno\s+depois|vou\s+dar\s+retorno|aguardar\s+a\s+diretoria)/i, objecao: 'Vou ver e retorno' },
  { re: /\b(setor\s+de\s+compras|falar\s+com\s+compras|compras\s+(vai|precisa)|aprova[cç][aã]o\s+da\s+diretoria|diretoria\s+(vai|precisa)\s+aprovar)/i, objecao: 'Preciso falar com compras' }
];

/** Cenário da oportunidade (decide a ordem das abordagens nas regras). */
function ComEsp_cenario_(x) {
  if (x.licitacao && !x.pedidoDesconto) return 'LICITACAO';
  if ((x.pedidoDesconto && x.pedidoDesconto.acimaDaAlcada) || x.descontoPendente || x.descontoNegado || (x.objecoes.indexOf('Está caro') >= 0 && x.concorrentes.length)) return 'DESCONTO';
  if (x.tentativas >= 2 || x.parada || x.propostaSemResposta) return 'SEM_RESPOSTA';
  if (x.licitacao) return 'LICITACAO';
  if (x.probabilidade <= 40) return 'QUALIFICACAO';
  if (x.probabilidade < 80) return 'PROPOSTA';
  return 'NEGOCIACAO';
}

/**
 * Monta os fatos e o contexto (x) da especialista. eu decide o que entra: vendedor = só as próprias oportunidades do cliente,
 * sem custo, margem, preço de compra nem a regra do preço; gestão = tudo.
 */
function ComEsp_fatos_(eu, o) {
  var c = ComG_contextoOportunidade_(eu, o), met = c.met, t = c.t, hoje = Com_hoje_();
  var ve = !!eu.veValores, veCusto = !!eu.veCusto;
  var f = Com_funil_(t.funil, met), idx = -1;
  (f ? f.etapas : []).forEach(function (e, i) { if (e.codigo === t.etapa) idx = i; });
  var proxima = f && idx >= 0 && idx < f.etapas.length - 1 ? f.etapas[idx + 1] : null;
  var crit = proxima ? ComOpo_criteriosMudanca_(o, proxima.codigo, { met: met }) : { confirmar: [], faltas: [] };
  var regs = c.regs, props = c.props.slice().sort(function (a, b) { return Com_s_(b.CRIADO_EM).localeCompare(Com_s_(a.CRIADO_EM)); });
  var contatosCli = typeof ComCt_listar_ === 'function' ? (ComCt_listar_(t.clienteId) || []) : [];
  // contatos e tentativas
  var canaisSemResp = [], ultResp = null;
  for (var i = 0; i < regs.length; i++) { if (Com_up_(regs[i].RESPONDEU) === 'SIM') { ultResp = regs[i]; break; } var cn = Com_up_(regs[i].TIPO); if (canaisSemResp.indexOf(cn) < 0) canaisSemResp.push(cn); }
  // objeções no histórico (contatos, recusas, pedidos de desconto, observações)
  var textos = regs.map(function (r) { return { onde: 'contato de ' + Com_brDia_(r.DATA), texto: Com_s_(r.RESUMO) }; })
    .concat(props.map(function (p) { return { onde: 'proposta ' + ComP_rotulo_(p), texto: [Com_s_(p.MOTIVO_RECUSA), Com_s_(p.RESPOSTA_TEXTO), Com_s_(p.DESCONTO_MOTIVO)].join(' ') }; }))
    .concat([{ onde: 'observações da oportunidade', texto: Com_s_(o.OBSERVACOES) }]);
  var objs = [];
  textos.forEach(function (tx) {
    COM_ESP_OBJ.forEach(function (ob) {
      var m = tx.texto.match(ob.re);
      if (m && !objs.some(function (x) { return x.objecao === ob.objecao; })) {
        var i0 = Math.max(0, m.index - 60);
        objs.push({ objecao: ob.objecao, onde: tx.onde, trecho: tx.texto.slice(i0, m.index + 90).replace(/\s+/g, ' ').trim() });
      }
    });
  });
  // pedido de desconto citado no histórico ("pediu 20% de desconto") e a alçada
  var limite = ComP_limiteDe_(Com_s_(o.RESPONSAVEL_ID), met), pol = met.politica || {};
  var pedido = null;
  textos.forEach(function (tx) {
    if (pedido) return;
    var m = /(\d{1,2}(?:,\d{1,2})?)\s*%\s*(?:de\s+)?desconto|desconto\s+de\s+(\d{1,2}(?:,\d{1,2})?)\s*%/i.exec(tx.texto);
    if (m) { var pct = Number(String(m[1] || m[2]).replace(',', '.')); if (pct > 0) pedido = { pct: pct, pctTxt: Com_pct_(pct, pct % 1 ? 2 : 0), onde: tx.onde, acimaDaAlcada: pct > limite + 1e-9 }; }
  });
  var descPend = props.some(function (p) { return Com_up_(p.SITUACAO) === 'AGUARDANDO_APROVACAO'; });
  var descNeg = props.some(function (p) { return Com_up_(p.DESCONTO_SITUACAO) === 'NEGADO' && Com_up_(p.SITUACAO) === 'RASCUNHO'; });
  if (!pedido) props.forEach(function (p) { if (!pedido && (Com_up_(p.SITUACAO) === 'AGUARDANDO_APROVACAO' || Com_up_(p.DESCONTO_SITUACAO) === 'NEGADO') && Number(p.DESCONTO_PCT) > 0) pedido = { pct: Number(p.DESCONTO_PCT), pctTxt: Com_pct_(p.DESCONTO_PCT), onde: 'proposta ' + ComP_rotulo_(p), acimaDaAlcada: Number(p.DESCONTO_PCT) > limite + 1e-9 }; });
  // concorrência: citada no histórico com valor, recusas com vencedor
  var concorrentes = [];
  textos.forEach(function (tx) {
    var m = /(concorrente|outra\s+empresa|outro\s+fornecedor)[^.]{0,80}?(R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i.exec(tx.texto);
    if (m) concorrentes.push({ quem: 'concorrente citado no histórico', valor: m[2].replace(/R\$\s?/, 'R$ '), onde: tx.onde });
  });
  props.forEach(function (p) { if (Com_s_(p.CONCORRENTE_VENCEDOR) || Number(p.VALOR_VENCEDOR) > 0) concorrentes.push({ quem: Com_s_(p.CONCORRENTE_VENCEDOR) || 'concorrente não informado', valor: Number(p.VALOR_VENCEDOR) > 0 ? Com_moeda_(p.VALOR_VENCEDOR) : '', onde: 'recusa da proposta ' + ComP_rotulo_(p) }); });
  // propostas
  var enviada = c.enviada || null, duEnvio = enviada ? Com_diasUteisEntre_(Com_dia_(enviada.ENVIADA_EM), hoje) : 0;
  var respDepoisEnvio = enviada && regs.some(function (r) { return Com_up_(r.RESPONDEU) === 'SIM' && Com_iso_(r.DATA) >= Com_iso_(enviada.ENVIADA_EM); });
  var propostasF = props.slice(0, 6).map(function (p) {
    var pz = Com_json_(p.PRAZO_JSON, {}) || {};
    var x = { numero: ComP_rotulo_(p), situacao: COM_SITUACOES_PROP[Com_up_(p.SITUACAO)] || Com_s_(p.SITUACAO), validaAte: Com_brDia_(p.VALIDA_ATE), enviadaEm: Com_brDia_(p.ENVIADA_EM),
      diasUteisDesdeEnvio: Com_s_(p.ENVIADA_EM) ? Com_diasUteisEntre_(Com_dia_(p.ENVIADA_EM), hoje) : '', descontoPct: Number(p.DESCONTO_PCT) > 0 ? Com_pct_(p.DESCONTO_PCT) : 'sem desconto',
      descontoSituacao: Com_s_(p.DESCONTO_SITUACAO), faixaDePrazo: Com_s_(pz.faixa), licitacao: !!pz.licitacao, motivoRecusa: Com_s_(p.MOTIVO_RECUSA), respostaCliente: Com_texto_(p.RESPOSTA_TEXTO, 300) };
    if (ve) { x.total = Com_moeda_(p.TOTAL); x.subtotal = Com_moeda_(p.SUBTOTAL); }
    if (veCusto) { if (Com_s_(p.MARGEM_PCT) !== '') x.margemPct = Com_pct_(p.MARGEM_PCT); if (Number(p.CUSTO_TOTAL) > 0) x.custoTotal = Com_moeda_(p.CUSTO_TOTAL); }
    return x;
  });
  // histórico do cliente: o vendedor vê só as dele; a gestão vê todas
  var outras = Com_ler_(COM_ABAS.OPORTUNIDADES).filter(function (x) { return Com_s_(x.CLIENTE_ID) === t.clienteId && Com_s_(x.ID) !== t.id && (eu.gestao || Com_s_(x.RESPONSAVEL_ID) === eu.id); })
    .sort(function (a, b) { return Com_s_(b.CRIADO_EM).localeCompare(Com_s_(a.CRIADO_EM)); }).slice(0, 10);
  var propsCli = ComP_lerPropostas_();
  var historicoCliente = outras.map(function (x) {
    var s = Com_up_(x.SITUACAO || 'ABERTA'), h = { codigo: Com_s_(x.CODIGO), titulo: Com_s_(x.TITULO), situacao: COM_SITUACOES_OPO[s] || s, data: Com_brDia_(x.GANHA_EM || x.PERDIDA_EM || x.CRIADO_EM) };
    if (eu.gestao) h.vendedor = Com_s_(x.RESPONSAVEL_NOME);
    if (ve) h.valor = Com_moeda_(x.VALOR_ESTIMADO);
    if (s === 'PERDIDA') { h.motivoPerda = Com_s_(x.MOTIVO_PERDA); h.quemGanhou = Com_s_(x.CONCORRENTE_VENCEDOR) || 'não informado'; if (Number(x.VALOR_VENCEDOR) > 0) h.porQuanto = Com_moeda_(x.VALOR_VENCEDOR); }
    var ap = propsCli.filter(function (p) { return Com_s_(p.OPORTUNIDADE_ID) === Com_s_(x.ID) && Com_up_(p.SITUACAO) === 'APROVADA'; })[0];
    if (ap) { h.compraAprovada = ComP_rotulo_(ap) + ' em ' + Com_brDia_(ap.RESPOSTA_EM); if (ve) h.compraValor = Com_moeda_(ap.TOTAL); }
    return h;
  });
  // preços do Banco e faixa de mercado (itens da proposta mais recente)
  var precos = [], ref = props.filter(function (p) { return ['CANCELADA', 'SUBSTITUIDA'].indexOf(Com_up_(p.SITUACAO)) < 0; })[0];
  if (ref && typeof ComBP_linhasDaProposta_ === 'function') {
    try {
      var banco = ComBP_ler_(), tabela = ComBP_tabelaPorItem_();
      ComBP_linhasDaProposta_(ref, 'EM_ABERTO').slice(0, 8).forEach(function (l) {
        var k = ComBP_itemChave_(l.ITEM_CODIGO, l.DESCRICAO);
        var linhas = banco.filter(function (r) { return Com_s_(r.ITEM_CHAVE) === k && Com_s_(r.REF_ID) !== Com_s_(ref.ID); });
        var res = ComBP_resumoItem_(linhas, eu);
        var merc = linhas.filter(function (r) { return ComBP_valida_(r) && ['LICITACAO', 'CONCORRENTE', 'INTERNET'].indexOf(Com_up_(r.ORIGEM)) >= 0; }).map(function (r) { return ComBP_num_(r.VALOR_UNITARIO); });
        var fx = ComBP_faixaMercado_(k, merc);
        var it = { item: ComBP_nomeItem_(k, l.DESCRICAO), quantidade: l.QUANTIDADE, precoNaProposta: ve ? Com_moeda_(l.VALOR_UNITARIO) : '', precoDeTabela: tabela[k] && ve ? Com_moeda_(tabela[k].valor) : '',
          praticadoNaEmpresa: res.praticadoTxt, ganhoMediana: res.ganhoTxt, perdidoMediana: res.perdidoTxt, taxaDeGanho: res.taxaGanhoTxt,
          faixaDeMercado: fx ? Com_moeda_(fx.de) + ' a ' + Com_moeda_(fx.ate) + ' (mediana ' + Com_moeda_(fx.mediana) + ', ' + fx.fonte + ')' : 'sem dados de mercado',
          quemGanhouDeNos: (res.vencedores || []).map(function (v) { return v.concorrente + ' por ' + v.valorTxt + ' em ' + v.data; }) };
        if (veCusto && res.compraTxt) it.precoDeCompra = res.compraTxt;
        if (veCusto && res.margemBrutaTxt) it.margemBruta = res.margemBrutaTxt;
        precos.push(it);
      });
    } catch (ePr) { console.error('Especialista, preços: ' + ((ePr && ePr.message) || ePr)); }
  }
  // urgência, prazo, licitação ou contrato
  var q = Com_json_(o.QUALIFICACAO_JSON, {}) || {};
  var txtCompra = [t.origem, t.titulo, Com_s_(o.OBSERVACOES), Com_s_(o.CLIENTE_NOME)].join(' ');
  var licitacao = /licita|preg[aã]o|ata\s+de\s+registro|dispensa|empenho|prefeitura|secretaria\s+(municipal|estadual|de\s+sa[uú]de)|fundo\s+municipal/i.test(txtCompra) || props.some(function (p) { return !!(Com_json_(p.PRAZO_JSON, {}) || {}).licitacao; });
  var contrato = !licitacao && /contrato|anual|mensal|programad/i.test(txtCompra);
  var x = {
    t: t, met: met, hoje: hoje, regs: regs, props: props, enviada: enviada, crit: crit, proxima: proxima, etapa: c.etapa, faltam: c.faltam, contatosCli: contatosCli,
    nome: ComG_primeiroNome_(t.contato) || 'o contato', eu: ComG_primeiroNome_(eu.nome), assunto: ComEsp_assunto_(t.titulo), proposta: enviada ? ComP_rotulo_(enviada) : (ref ? ComP_rotulo_(ref) : ''),
    tentativas: t.tentativasSemResposta, parada: t.parada, probabilidade: t.probabilidade, canaisSemResp: canaisSemResp, ultResp: ultResp,
    objecoes: objs.map(function (b) { return b.objecao; }), objsDet: objs, pedidoDesconto: pedido, descontoPendente: descPend, descontoNegado: descNeg, limite: limite, concorrentes: concorrentes,
    propostaSemResposta: !!enviada && duEnvio >= (Number(met.cadencia.propostaLembreteDiaUtil) || 2) && !respDepoisEnvio, duEnvio: duEnvio, licitacao: licitacao, contrato: contrato,
    decisorFalta: c.faltam.some(function (q2) { return q2.codigo === 'DECISOR'; }), prazoInformado: Com_s_(q.PRAZO)
  };
  x.cenario = ComEsp_cenario_(x);
  var fatos = {
    // 01/11/2026: a IA não sabe quais dias são feriados (marcou 02/11, Finados, 3 vezes e foi recusada); recebe a lista pronta
    hoje: Com_brDia_(hoje), proximosDiasUteis: (function () { var l = [], d = ComEsp_du_(hoje, 0); for (var i = 0; i < 12; i++) { l.push(Com_brDia_(d)); d = Com_somarDiasUteis_(d, 1); } return l; })(), quemPede: eu.gestao ? 'gestão comercial (vê tudo)' : 'vendedor responsável (vê só as próprias oportunidades)', vendedorPrimeiroNome: x.eu,
    oportunidade: { codigo: t.codigo, titulo: t.titulo, cliente: t.cliente, unidade: t.unidade, contatoPrimeiroNome: ComG_primeiroNome_(t.contato), origem: t.origem, funil: t.funilNome,
      etapa: t.etapaNome, probabilidade: t.probabilidade + '%', diasNaEtapa: t.diasNaEtapa, maxDiasNaEtapa: Number(c.etapa.maxDias) || '', criterioDeSaidaDaEtapa: Com_s_(c.etapa.criterio),
      listaDaEtapa: c.etapa.checklist || [], proximaEtapa: proxima ? proxima.nome : '', faltaParaAvancar: crit.faltas.map(function (z) { return z.texto; }).concat(crit.confirmar.filter(function (z) { return !z.confirmado; }).map(function (z) { return z.texto; })).slice(0, 8),
      diasSemContato: t.diasSemContato, ultimoContato: t.ultimoContato || 'nenhum registrado', proximaAcaoAtual: t.proximaAcao, proximaAcaoEm: t.proximaEm, previsaoFechamento: t.previsaoBr,
      qualificacaoRegistrada: t.qualificacao, qualificacaoFaltando: c.faltam.map(function (z) { return z.nome; }), observacoes: Com_texto_(o.OBSERVACOES, 600) },
    contatosRegistrados: regs.slice(0, 15).map(function (r) { return { data: Com_brDia_(r.DATA), canal: COM_TIPOS_CONTATO[Com_up_(r.TIPO)] || r.TIPO, resultado: Com_up_(r.RESPONDEU) === 'SIM' ? 'respondeu' : 'sem resposta', comQuem: ComG_primeiroNome_(r.CONTATO_NOME), resumo: Com_texto_(r.RESUMO, 300) }; }),
    tentativas: { semRespostaSeguidas: t.tentativasSemResposta, canaisJaTentadosSemResposta: canaisSemResp.map(function (k) { return COM_TIPOS_CONTATO[k] || k; }), ultimaResposta: ultResp ? Com_brDia_(ultResp.DATA) : 'nenhuma registrada' },
    outrosContatosDoCliente: contatosCli.filter(function (k) { return Com_s_(k.id) !== t.contatoId; }).slice(0, 6).map(function (k) { return { primeiroNome: ComG_primeiroNome_(k.nome), cargo: Com_s_(k.cargo), papel: Com_s_(k.papelNome || k.papel) }; }),
    objecoesNoHistorico: objs,
    propostas: propostasF,
    alcadaDeDesconto: { limiteDoVendedor: Com_pct_(limite, limite % 1 ? 2 : 0), gerente: Com_pct_(pol.alcadaGerentePct, 0), diretoria: Com_pct_(pol.alcadaDiretoriaPct, 2), regra: Com_s_(pol.texto) },
    pedidoDeDesconto: pedido ? { pedido: pedido.pctTxt, onde: pedido.onde, acimaDoLimiteDoVendedor: pedido.acimaDaAlcada } : 'nenhum registrado',
    concorrencia: concorrentes,
    historicoDoCliente: historicoCliente.length ? historicoCliente : (eu.gestao ? 'primeira oportunidade deste cliente' : 'nenhuma outra oportunidade sua com este cliente'),
    precos: precos.length ? precos : 'sem proposta com itens: os preços do banco entram quando houver proposta',
    urgenciaEPrazo: { prazoInformadoPeloCliente: x.prazoInformado || 'não informado', previsaoDeFechamento: t.previsaoBr || 'não informada', faixasDePrazo: ComEsp_faixasTxt_(met) },
    tipoDeCompra: licitacao ? 'compra pública ou licitação (preço único, sem acréscimo de urgência; lance abaixo do preço mínimo só com a Diretoria)' : contrato ? 'contrato ou serviço recorrente' : 'compra direta (avulsa)',
    // revisão 01/11/2026: nada de condição de pacote inventada. Só entra o que a gestão escreveu na política (met.politica.pacote),
    // e sempre como algo que depende de aprovação na Caixa de decisões.
    referenciasComerciais: ComEsp_referenciasPacote_(met).concat(['Prazo curto só depois de a Área técnica confirmar a agenda.',
      'Desconto acima do limite do vendedor vai para a Caixa de decisões da gestão, com a fundamentação; o vendedor não promete.',
      'Pacote anual ou contrato: preço e condição de pagamento dependem de aprovação da gestão na Caixa de decisões; não prometa percentual, abatimento nem número de parcelas.']),
    cenario: COM_ESP_CENARIOS[x.cenario]
  };
  if (ve) fatos.oportunidade.valorEstimado = Com_moeda_(o.VALOR_ESTIMADO);
  return { fatos: fatos, x: x, c: c };
}

/**
 * Referência de pacote ou contrato: só a que a gestão gravou na política (met.politica.pacote: texto, ou { texto }), sempre como
 * condição que depende de aprovação. Sem nada na política, nada entra (a especialista não inventa condição de contrato).
 */
function ComEsp_pacotePolitica_(met) {
  var p = met && met.politica && met.politica.pacote;
  var txt = typeof p === 'string' ? Com_s_(p) : Com_s_(p && p.texto);
  return txt;
}
function ComEsp_referenciasPacote_(met) {
  var txt = ComEsp_pacotePolitica_(met);
  return txt ? ['Pacote ou contrato, pela política da gestão (precisa de aprovação na Caixa de decisões antes de oferecer): ' + Com_texto_(txt, 400)] : [];
}
/** Números que a política de pacote permite citar (percentual a menos, parcelas). Vazio sem política de pacote. */
function ComEsp_numerosPacote_(met) {
  var txt = ComEsp_pacotePolitica_(met);
  return txt && typeof SGO_QIAV_numerosDe_ === 'function' ? SGO_QIAV_numerosDe_(txt) : [];
}
/** Condição comercial prometida sem estar na política: "% a menos", "abaixo da tabela", "abatimento", "N parcelas". */
function ComEsp_condicaoForaDaPolitica_(s, permitidos) {
  var l = [], t = Com_s_(s), m;
  if (/abaixo\s+d[ao]\s+(pre[cç]o\s+de\s+)?tabela/i.test(t)) l.push('preço "abaixo da tabela" (só com aprovação da gestão na Caixa de decisões)');
  if (/abatimento/i.test(t)) l.push('"abatimento" (condição que só a gestão aprova)');
  var reN = /(\d+(?:[.,]\d+)?)\s*%\s*a\s+menos|(\d+)\s*(?:x\s*)?(?:parcelas?|presta[cç][oõ]es)\b|\bem\s+(\d+)\s*x\b/gi;
  while ((m = reN.exec(t)) !== null) {
    var n = Number(String(m[1] || m[2] || m[3]).replace(',', '.'));
    if (!(permitidos || []).some(function (p) { return Math.abs(p - n) < 1e-9; })) l.push('condição "' + m[0] + '" que não está na política (depende de aprovação da gestão)');
  }
  return l;
}

function ComEsp_faixasTxt_(met) {
  try { var pp = ComPr_politica_(met); return pp.prazo.faixas.filter(function (z) { return z.ativa; }).map(function (z) { return z.nome + ' ' + z.diasUteis + ' dias úteis' + (z.acrescimoPct ? ' (+' + Com_pct_(z.acrescimoPct, 0) + ')' : ''); }).join('; '); } catch (e) { return ''; }
}

/** Metodologia para o prompt. Para quem não vê custo, sai a REGRA DO PREÇO (com o preço da proposta, deixaria derivar o custo). */
function ComEsp_metodologiaTexto_(met, eu) {
  var t = ComG_metodologiaTexto_(met);
  return eu && eu.veCusto ? t : t.split('\n').filter(function (l) { return !/^REGRA DO PREÇO|^POLÍTICA DE PRECIFICAÇÃO/.test(l); }).join('\n');
}

// ------------------------------------------------------------
// ALTERNATIVA POR REGRAS (sempre A, B e C concretos)
// ------------------------------------------------------------
function ComEsp_outroContato_(x, papeis) {
  return (x.contatosCli || []).filter(function (k) { return Com_s_(k.id) !== x.t.contatoId && (!papeis || papeis.indexOf(Com_up_(k.papel)) >= 0); })[0] || null;
}

/** Abordagem -> plano (passos com [dia útil relativo, canal, ação]). */
function ComEsp_montarAbordagem_(cod, x) {
  var n = x.nome, prop = x.proposta ? 'a proposta ' + x.proposta : 'a proposta';
  var ap = ComEsp_outroContato_(x, ['APROVA', 'FINANCEIRO']), us = ComEsp_outroContato_(x, ['USA', 'TECNICO']);
  var ordemCanais = ['WHATSAPP', 'LIGACAO', 'EMAIL', 'VISITA'], novo = ordemCanais.filter(function (k) { return x.canaisSemResp.indexOf(k) < 0; })[0] || 'VISITA';
  var conc = x.concorrentes.filter(function (k) { return k.valor; })[0];
  var b = {
    CANAL: { titulo: 'Trocar o canal: ' + ComEsp_canalMin_(novo) + ' com ' + n, objetivo: 'Conseguir a primeira resposta de ' + n + (x.tentativas ? ' depois de ' + Com_plural_(x.tentativas, 'tentativa', 'tentativas') + ' sem resposta' : '') + (x.canaisSemResp.length ? ' por ' + x.canaisSemResp.map(function (k) { return ComEsp_canalMin_(k) || Com_s_(k).toLowerCase(); }).join(' e ') : '') + ', com a data de uma conversa curta marcada.',
      passos: [[0, novo, (novo === 'VISITA' ? 'Passar na unidade e pedir para falar com ' + n + ' ou com quem responde por ' + x.assunto : 'Mandar para ' + n + ' por ' + ComEsp_canalMin_(novo) + ' a mensagem pronta da especialista, com a pergunta fechada (esta semana ou a próxima)')],
        [1, novo === 'LIGACAO' ? 'WHATSAPP' : 'LIGACAO', 'Ligar no início da manhã, antes da rotina da unidade, citando a mensagem do dia anterior'], [3, 'EMAIL', 'E-mail curto para ' + n + ' com o risco de deixar pendente ' + x.assunto + ' e a mesma pergunta fechada']],
      canalMsg: novo === 'EMAIL' || novo === 'VISITA' ? 'WHATSAPP' : novo,
      mensagem: 'Olá, ' + n + '. Aqui é ' + x.eu + ', da Metrolabs. Tentei falar com você sobre ' + x.assunto + ' e não consegui. Para não tomar o seu tempo: prefere que eu retome isso nesta semana ou na próxima?',
      sucesso: n + ' responde e a conversa fica marcada com data.' },
    DECISOR: { titulo: 'Subir para o decisor: ' + (ap ? ComG_primeiroNome_(ap.nome) + (ap.cargo ? ' (' + ap.cargo + ')' : '') : 'engenharia clínica ou diretoria técnica'), objetivo: 'Levar ' + x.assunto + ' a quem aprova a compra e sair com a data de decisão combinada.',
      passos: [[0, 'LIGACAO', ap ? 'Ligar para ' + ComG_primeiroNome_(ap.nome) + ' e apresentar o risco operacional de ' + x.assunto + ' em uma frase' : 'Perguntar para ' + n + ' quem aprova a compra e pedir para participar da conversa com essa pessoa'],
        [1, 'EMAIL', 'E-mail ao decisor (com ' + n + ' em cópia) com o risco em três linhas e o pedido de uma reunião curta'], [3, 'REUNIAO', 'Reunião com o decisor: confirmar dor, verba e prazo e combinar a data de decisão']],
      canalMsg: 'EMAIL', assunto: 'Metrolabs: ' + x.t.titulo, mensagem: 'Prezado(a), sou ' + x.eu + ', da Metrolabs. Estou conversando com ' + n + ' sobre ' + x.assunto + '. Para a decisão ficar segura do lado técnico e do financeiro, gostaria de uma conversa curta com você nesta semana. Qual o melhor horário?',
      sucesso: 'Reunião com quem aprova feita e a data de decisão registrada na oportunidade.' },
    USUARIO: { titulo: 'Gerar a dor com quem usa: ' + (us ? ComG_primeiroNome_(us.nome) : 'coordenação da CME ou da enfermagem'), objetivo: 'Fazer quem usa o equipamento levar o problema ao decisor: levantar o que acontece na rotina quando ' + x.assunto + ' fica pendente.',
      passos: [[0, 'LIGACAO', 'Ligar para ' + (us ? ComG_primeiroNome_(us.nome) : 'a coordenação da CME') + ' e perguntar como está hoje a rotina com o equipamento e o que acontece numa parada'],
        [2, 'VISITA', 'Visita curta à unidade para ver o equipamento com a equipe e anotar o que eles relatam'], [4, 'EMAIL', 'Enviar para ' + n + ' o resumo do que a equipe relatou e pedir a reunião com quem aprova']],
      canalMsg: 'WHATSAPP', mensagem: 'Olá. Aqui é ' + x.eu + ', da Metrolabs. Estamos tratando de ' + x.assunto + ' com a sua unidade. Você, que acompanha o equipamento no dia a dia, poderia me contar em 5 minutos como ele está hoje?',
      sucesso: 'Relato da equipe registrado na oportunidade e a dor confirmada por quem usa.' },
    COMPRAS: { titulo: 'Caminho de compras', objetivo: 'Destravar o pedido do lado de compras: cadastro de fornecedor, documentos e a data do pedido.',
      passos: [[0, 'LIGACAO', 'Perguntar para ' + n + ' quem em compras recebe ' + prop + ' e o que pedem para cadastrar fornecedor'], [1, 'EMAIL', 'Enviar a compras os documentos de cadastro e ' + prop], [3, 'LIGACAO', 'Ligar para compras e confirmar o andamento e a data do pedido']],
      canalMsg: 'EMAIL', assunto: 'Metrolabs: documentos para cadastro e ' + (x.proposta ? 'proposta ' + x.proposta : 'proposta'), mensagem: 'Prezados, a pedido de ' + n + ', seguem os documentos da Metrolabs para o cadastro de fornecedor e ' + prop + '. Podem me dizer o que mais é necessário e a previsão do pedido?',
      sucesso: 'Fornecedor cadastrado e a data do pedido informada por compras.' },
    VISITA_TECNICA: { titulo: 'Visita técnica sem compromisso', objetivo: 'Ver o equipamento e os documentos de perto para trazer fatos novos à conversa (estado, vencimentos, riscos).',
      passos: [[0, 'LIGACAO', 'Oferecer para ' + n + ' uma visita técnica curta para ver o equipamento e o histórico de manutenção'], [2, 'VISITA', 'Visita: levantar estado, documentos e o que vence (calibração, qualificação, preventiva)'],
        [4, 'EMAIL', 'Enviar o resumo da visita com o que foi encontrado e ' + (x.proposta ? 'a revisão da proposta, se precisar' : 'a proposta')]],
      canalMsg: 'WHATSAPP', mensagem: 'Olá, ' + n + '. Aqui é ' + x.eu + ', da Metrolabs. Posso passar na unidade nesta semana para ver o equipamento e os documentos de manutenção com você? Leva pouco tempo e ajuda a decidir com dados. Qual dia fica melhor?',
      sucesso: 'Visita feita e o resumo com os achados enviado ao cliente.' },
    CONFORMIDADE: { titulo: 'Mostrar o risco de conformidade', objetivo: 'Mostrar o que a vigilância sanitária e a acreditação cobram e o que está vencido ou faltando hoje.',
      passos: [[0, 'EMAIL', 'Enviar para ' + n + ' um checklist curto dos documentos de calibração e qualificação que a fiscalização pede'], [2, 'LIGACAO', 'Ligar para conferir junto quais documentos estão vencidos ou faltando'],
        [4, 'REUNIAO', 'Reunião com a qualidade ou o responsável técnico do hospital para fechar o plano de regularização']],
      canalMsg: 'EMAIL', assunto: 'Metrolabs: documentos que a fiscalização costuma pedir', mensagem: 'Olá, ' + n + '. Montei uma lista curta dos documentos de calibração e qualificação que a vigilância sanitária e a acreditação costumam pedir. Podemos conferir juntos o que está em dia e o que vence primeiro?',
      sucesso: 'Lista de documentos conferida com o cliente e o que vence primeiro registrado.' },
    URGENCIA: { titulo: 'Prazo e agenda', objetivo: 'Amarrar a decisão a uma data real do cliente (auditoria, parada programada, vencimento) com a agenda técnica confirmada.',
      passos: [[0, 'LIGACAO', 'Perguntar para ' + n + ' a data limite (auditoria, parada programada, vencimento de documento)'], [1, 'EMAIL', 'Confirmar com a Área técnica a agenda possível antes de oferecer prazo'],
        [2, 'WHATSAPP', 'Oferecer a data de agenda confirmada e pedir o aceite até a data combinada']],
      canalMsg: 'WHATSAPP', mensagem: 'Olá, ' + n + '. Para eu reservar a agenda da equipe técnica para ' + x.assunto + ', preciso saber: existe alguma data limite do seu lado (auditoria, parada ou vencimento)?',
      sucesso: 'Data limite do cliente registrada e o aceite combinado para antes dela.' },
    // revisão 01/11/2026: sem percentual nem parcelamento prometidos; a condição do pacote depende de aprovação na Caixa de decisões
    PACOTE_ANUAL: { titulo: 'Propor pacote anual', objetivo: 'Trocar a discussão de preço avulso por um pacote anual com visitas programadas. A condição de preço e de pagamento do pacote depende de aprovação da gestão na Caixa de decisões.',
      passos: [[0, 'LIGACAO', 'Levantar com ' + n + ' os outros equipamentos e o que vence nos próximos meses'], [1, 'EMAIL', 'Pedir à gestão, na Caixa de decisões, a condição do pacote anual com a lista dos equipamentos e das visitas'],
        [4, 'REUNIAO', 'Apresentar o pacote anual com as visitas programadas e a condição aprovada pela gestão, e pedir a data de decisão']],
      canalMsg: 'WHATSAPP', mensagem: 'Olá, ' + n + '. Pensando em evitar urgência e custo avulso, posso levar à minha gestão um pacote anual com as visitas programadas. Quais outros equipamentos vencem nos próximos meses?',
      sucesso: 'Lista dos equipamentos levantada, condição do pacote aprovada pela gestão e a data de decisão combinada com o cliente.' },
    ESCOPO: { titulo: 'Recalcular o escopo', objetivo: 'Caber na verba do cliente sem tirar preço: primeira fase só com o que é crítico, o resto em segunda fase.',
      passos: [[0, 'LIGACAO', 'Perguntar para ' + n + ' quais equipamentos são críticos e quais podem ficar para uma segunda fase'], [1, 'EMAIL', 'Montar nova revisão da proposta com a primeira fase só com o crítico, mantendo o preço unitário'],
        [3, 'LIGACAO', 'Apresentar a revisão e pedir a data de decisão']],
      canalMsg: 'WHATSAPP', mensagem: 'Olá, ' + n + '. Para caber no momento de vocês, posso dividir em duas fases: começamos pelo que é crítico e programamos o restante. Quais equipamentos não podem esperar?',
      sucesso: 'Revisão em fases enviada e a data de decisão da primeira fase combinada.' },
    CONDICAO: { titulo: 'Mudar a condição, não o preço', objetivo: 'Descobrir se o que trava é o valor total, o fluxo de caixa ou a aprovação, e oferecer condição de pagamento dentro da política (com a gestão), sem mexer no preço.',
      passos: [[0, 'LIGACAO', 'Perguntar para ' + n + ' o que trava: valor total, fluxo de caixa ou aprovação interna'], [1, 'EMAIL', 'Consultar a gestão e oferecer condição de pagamento diferente (parcelamento ou faturamento por etapa), sem mexer no preço'],
        [3, 'LIGACAO', 'Confirmar a aceitação da condição e a data do pedido']],
      canalMsg: 'WHATSAPP', mensagem: 'Olá, ' + n + '. Se o ponto for o fluxo de caixa, posso ver com a minha gestão uma condição de pagamento diferente, mantendo o escopo completo. O que pesa mais hoje para vocês?',
      sucesso: 'Condição aceita pelo cliente e a data do pedido combinada.' },
    VALOR_TECNICO: { titulo: 'Comparar valor técnico, não preço', objetivo: 'Mostrar, item por item, o que ' + prop + ' inclui e o concorrente não' + (conc ? ' (o concorrente apareceu com ' + conc.valor + ')' : '') + ', e o custo de uma parada do equipamento.',
      passos: [[0, 'LIGACAO', 'Pedir para ' + n + ' o escopo da proposta concorrente: relatório, certificados, rastreabilidade, prazo de entrega e deslocamento'], [1, 'EMAIL', 'Enviar quadro comparativo do que ' + prop + ' inclui, item por item, e o custo de uma parada'],
        [3, 'REUNIAO', 'Reunião com quem decide para mostrar o comparativo e pedir a decisão']],
      canalMsg: 'WHATSAPP', mensagem: 'Olá, ' + n + '. Para comparar as propostas de forma justa, você poderia me mostrar o que a outra inclui (relatório, certificados, prazo de entrega, deslocamento)? Monto um quadro lado a lado para vocês decidirem com segurança.',
      sucesso: 'Comparativo apresentado a quem decide e a decisão registrada.' },
    PROPOSTA: { titulo: 'Apresentar a proposta em reunião', objetivo: 'Não deixar a proposta só no e-mail: apresentar escopo, prazo e condições e sair com a data de decisão.',
      passos: [[0, 'LIGACAO', 'Marcar com ' + n + ' uma reunião curta para apresentar ' + prop], [2, 'REUNIAO', 'Apresentar escopo, prazo e condições e perguntar o que falta para decidir'], [3, 'EMAIL', 'Enviar o resumo da reunião com a data de decisão combinada']],
      canalMsg: 'WHATSAPP', mensagem: 'Olá, ' + n + '. Para a proposta ficar clara para quem decide, posso apresentá-la em uma conversa curta, presencial ou por vídeo. Qual dia desta semana fica melhor?',
      sucesso: 'Reunião feita e a data de decisão registrada na oportunidade.' },
    GESTAO: { titulo: 'Envolver a gestão comercial', objetivo: x.pedidoDesconto && x.pedidoDesconto.acimaDaAlcada ? 'Levar o pedido de ' + x.pedidoDesconto.pctTxt + ' de desconto (acima do seu limite de ' + Com_pct_(x.limite, 0) + ') à gestão com a fundamentação, sem prometer nada ao cliente.' : 'Um contato da gestão comercial com o decisor do cliente para destravar.',
      passos: [[0, 'EMAIL', x.pedidoDesconto ? 'Registrar o pedido de desconto na proposta com a fundamentação (concorrente, volume, prazo) para a decisão da gestão na Caixa de decisões' : 'Pedir apoio à gestão comercial pela oportunidade (Registrar contato com a estratégia "Envolver a gestão")'],
        [1, 'LIGACAO', 'Combinar com a gestão quem liga para o decisor do cliente e o que será dito'], [3, 'REUNIAO', 'Reunião com o decisor, com a gestão, para fechar a condição']],
      canalMsg: 'WHATSAPP', mensagem: 'Olá, ' + n + '. Levei o seu pedido à minha gestão e volto com uma resposta formal. Enquanto isso, me confirme: a decisão sai até qual data?',
      sucesso: 'Decisão da gestão registrada e o retorno dado ao cliente com data.' },
    LICITACAO: { titulo: 'Caminho da compra pública', objetivo: 'Saber como a compra vai acontecer (pregão, ata, dispensa ou contrato vigente) e preparar documentos e preço antes do edital.',
      passos: [[0, 'LIGACAO', 'Perguntar para ' + n + ' como a compra vai acontecer: pregão, ata de registro de preços, dispensa ou contrato vigente'], [1, 'EMAIL', 'Pedir o termo de referência ou a minuta do edital e conferir a habilitação da Metrolabs'],
        [3, 'REUNIAO', 'Validar com a gestão a margem, o prazo e a capacidade antes do lance (lance abaixo do preço mínimo só com a Diretoria)']],
      canalMsg: 'EMAIL', assunto: 'Metrolabs: termo de referência de ' + x.assunto, mensagem: 'Prezado(a) ' + n + ', para participarmos com tudo em ordem, poderia me enviar o termo de referência ou a minuta do edital de ' + x.assunto + ' e a previsão de publicação?',
      sucesso: 'Termo de referência recebido e a participação validada pela gestão.' },
    ENCERRAR: { titulo: 'Encerramento educado com prazo', objetivo: 'Dar ao cliente a chance de dizer não ou retomar; sem resposta, registrar a perda com o motivo real e programar a nutrição.',
      passos: [[0, 'LIGACAO', 'Última ligação ao decisor para confirmar se o assunto segue ou fica para outro momento'], [1, 'WHATSAPP', 'Mandar para ' + n + ' a mensagem de encerramento educado da especialista, deixando a porta aberta'],
        [4, 'EMAIL', 'Sem resposta: registrar a perda com o motivo real e agendar a nutrição para o próximo vencimento']],
      canalMsg: 'WHATSAPP', mensagem: ComG_preencher_(x.met.modelosMensagem.encerramento, { nome: n, assunto: x.assunto }), sucesso: 'Resposta clara do cliente (segue ou não) ou a perda registrada com o motivo real.' }
  };
  return b[cod] || null;
}

/** Objeções para um plano: as do histórico (com a resposta da metodologia) e as do cenário. */
function ComEsp_objecoesRegras_(x) {
  var l = x.met.objecoes || [], escolha = [];
  var add = function (nome, resposta) { if (!escolha.some(function (e) { return e.objecao === nome; }) && escolha.length < 3) escolha.push({ objecao: nome, resposta: resposta }); };
  x.objecoes.forEach(function (nome) { var m = l.filter(function (k) { return Com_s_(k.objecao) === nome; })[0]; if (m) add(nome, Com_s_(m.resposta)); });
  // respostas prontas para o cliente, pelo cenário (as da metodologia completam a lista)
  if (x.cenario === 'DESCONTO') add('Consegue fazer mais barato?', 'Consigo rever o escopo, as fases ou a condição de pagamento. Preço abaixo do proposto depende de aprovação da minha gestão e não posso prometer. O que na proposta pesa mais para vocês?');
  if (x.cenario === 'SEM_RESPOSTA') {
    add('Agora não é prioridade', 'Entendo. Para eu não insistir à toa: existe uma data (auditoria, vencimento de documento, parada programada) em que isso volta a ser prioridade? Retomo perto dela.');
    add('Manda por e-mail', 'Mando, sim. Antes, me diga qual equipamento preocupa mais hoje, para o e-mail já sair com o que interessa.');
  }
  if (x.cenario === 'QUALIFICACAO') add('Quem decide não sou eu', 'Sem problema. Quem participa da decisão técnica e quem aprova a compra? Posso preparar um resumo para você levar a eles.');
  if (x.cenario === 'LICITACAO') add('Só compramos por licitação', 'Perfeito. Qual a modalidade e a previsão do edital? Já deixo a documentação de habilitação pronta para participar.');
  ComG_objecoesProvaveis_({ met: x.met, t: x.t, faltam: x.faltam, enviada: x.enviada }).forEach(function (k) { add(k.objecao, k.resposta); });
  return escolha;
}

/** Diagnóstico pelas regras: 2 ou 3 frases com fatos do sistema. */
function ComEsp_diagnosticoRegras_(x, planoA, falhos) {
  var t = x.t, f = [];
  f.push(t.codigo + ' está na etapa ' + t.etapaNome + ' há ' + Com_plural_(t.diasNaEtapa, 'dia', 'dias') + (Number(x.etapa.maxDias) ? ' (a metodologia prevê até ' + x.etapa.maxDias + ')' : '') +
    (t.tentativasSemResposta ? ', com ' + Com_plural_(t.tentativasSemResposta, 'tentativa', 'tentativas') + ' sem resposta' : '') + ' e ' + Com_plural_(t.diasSemContato, 'dia', 'dias') + ' sem contato.');
  var s2 = '';
  if (x.cenario === 'DESCONTO') s2 = (x.pedidoDesconto ? 'O cliente pediu ' + x.pedidoDesconto.pctTxt + ' de desconto (' + x.pedidoDesconto.onde + '), ' + (x.pedidoDesconto.acimaDaAlcada ? 'acima' : 'dentro') + ' do limite de ' + Com_pct_(x.limite, 0) + ' do vendedor' : 'Há pedido de desconto em andamento') + (x.concorrentes[0] && x.concorrentes[0].valor ? '; o concorrente apareceu com ' + x.concorrentes[0].valor : '') + '.';
  else if (x.cenario === 'SEM_RESPOSTA') s2 = 'Última resposta do cliente: ' + (x.ultResp ? Com_brDia_(x.ultResp.DATA) : 'nenhuma registrada') + (x.canaisSemResp.length ? '; canais já tentados sem resposta: ' + x.canaisSemResp.map(function (k) { return ComEsp_canalMin_(k) || Com_s_(k).toLowerCase(); }).join(', ') : '') + (x.enviada ? '; a proposta ' + ComP_rotulo_(x.enviada) + ' foi enviada em ' + Com_brDia_(x.enviada.ENVIADA_EM) : '') + '.';
  else if (x.cenario === 'QUALIFICACAO') s2 = 'Falta na qualificação: ' + (x.faltam.map(function (q) { return q.nome.toLowerCase(); }).join(', ') || 'nada') + '.';
  else if (x.cenario === 'PROPOSTA') s2 = x.enviada ? 'A proposta ' + ComP_rotulo_(x.enviada) + ' foi enviada em ' + Com_brDia_(x.enviada.ENVIADA_EM) + ' e está há ' + Com_plural_(x.duEnvio, 'dia útil', 'dias úteis') + ' sem decisão.' : 'Ainda não há proposta enviada; o critério para sair da etapa é: ' + Com_s_(x.etapa.criterio) + '.';
  else if (x.cenario === 'LICITACAO') s2 = 'É compra pública: preço único, sem acréscimo de urgência, e lance abaixo do preço mínimo só com a Diretoria.';
  else s2 = 'Critério para sair da etapa: ' + Com_s_(x.etapa.criterio) + '.';
  f.push(s2);
  f.push('O plano A ataca por ' + Com_s_(COM_ESP_ABORDAGENS[planoA.abordagem]).toLowerCase() + (falhos.length ? ' e não repete ' + falhos.map(function (p) { return '"' + p.titulo + '"'; }).join(', ') + ', que não deu certo' : '') + '.');
  return f.join(' ');
}

/** Monta um plano datado a partir do dia útil de início. */
function ComEsp_planoDatado_(letra, cod, x, inicioIso) {
  var m = ComEsp_montarAbordagem_(cod, x);
  var passos = m.passos.map(function (p) { var iso = ComEsp_du_(inicioIso, p[0]); return { quando: Com_brDia_(iso), quandoIso: iso, canal: p[1], canalNome: COM_ESP_CANAIS[p[1]], acao: p[2] }; });
  return { letra: letra, abordagem: cod, abordagemNome: COM_ESP_ABORDAGENS[cod], titulo: m.titulo, objetivo: m.objetivo, passos: passos,
    mensagem: { canal: m.canalMsg, canalNome: COM_ESP_CANAIS[m.canalMsg] || 'WhatsApp', assunto: m.assunto || (m.canalMsg === 'EMAIL' ? 'Metrolabs: ' + x.t.titulo : ''), texto: m.mensagem }, objecoes: [], sucesso: m.sucesso };
}

/** Abordagens proibidas (falharam) e a ordem do cenário (plano em uso que ainda vale vem primeiro). */
function ComEsp_escolherAbordagens_(x, mem) {
  var proib = {};
  (mem.falhos || []).forEach(function (p) { proib[p.abordagem] = 1; });
  var ordem = (COM_ESP_ORDEM[x.cenario] || []).slice();
  if (mem.emUso && !mem.gatilhoVencido && !proib[mem.emUso.abordagem]) ordem.unshift(mem.emUso.abordagem);
  Object.keys(COM_ESP_ABORDAGENS).forEach(function (k) { ordem.push(k); });
  var escolha = [];
  ordem.forEach(function (k) {
    if (escolha.length >= 3 || proib[k] || escolha.indexOf(k) >= 0) return;
    if (k === 'CANAL' && x.canaisSemResp.length >= 4) return;
    escolha.push(k);
  });
  return { escolha: escolha, proibidas: Object.keys(proib) };
}

/** Planos A, B e C pelas regras (sem IA), com os gatilhos e a próxima ação. */
function ComEsp_planosRegras_(x, mem) {
  var esc = ComEsp_escolherAbordagens_(x, mem).escolha, avisoTodas = '';
  // revisão 01/11/2026: todas as abordagens já falharam: nada de erro; sai o encerramento educado com o aviso claro
  if (!esc.length) { esc = ['ENCERRAR']; avisoTodas = 'Todas as abordagens já foram tentadas nesta oportunidade e não deram certo: avalie encerrar (com o motivo real da perda) ou pedir ajuda à gestão comercial.'; }
  var inicio = ComEsp_du_(x.hoje, 0), planos = [], letras = ['A', 'B', 'C'];
  esc.forEach(function (cod, i) {
    var p = ComEsp_planoDatado_(letras[i], cod, x, inicio);
    var ultimo = p.passos[p.passos.length - 1].quandoIso, ate = ComEsp_du_(ultimo, 2);
    planos.push(p);
    // o plano seguinte começa quando o gatilho vence
    p._fim = ate;
    inicio = ComEsp_du_(ate, 1);
  });
  var a = planos[0];
  a.objecoes = ComEsp_objecoesRegras_(x);
  planos.forEach(function (p, i) {
    if (i === 0) return;
    var ant = planos[i - 1], ate = ant._fim;
    var txt;
    if (x.cenario === 'DESCONTO' && i === 1) txt = 'O cliente mantém o pedido de desconto acima do limite de ' + Com_pct_(x.limite, 0) + ' do vendedor, ou confirma que fica com o concorrente, até ' + Com_brDia_(ate) + '.';
    else if (x.cenario === 'SEM_RESPOSTA' || /CANAL|DECISOR|USUARIO/.test(ant.abordagem)) txt = 'Sem resposta de ' + x.nome + ' até ' + Com_brDia_(ate) + ' (2 dias úteis depois do último passo do plano ' + ant.letra + ').';
    else txt = 'O plano ' + ant.letra + ' não cumpriu o critério de sucesso ("' + ant.sucesso.replace(/[.\s]+$/, '') + '") até ' + Com_brDia_(ate) + '.';
    p.gatilho = { texto: txt, ate: Com_brDia_(ate), ateIso: ate };
    p.objecoes = [];
  });
  ComEsp_saidas_(planos, x);
  var falhos = mem.falhos || [];
  var r = { diagnostico: ComEsp_diagnosticoRegras_(x, a, avisoTodas ? [] : falhos), planos: planos, proximaAcao: ComEsp_proximaDoPlano_(a), perguntas: x.faltam.slice(0, 3).map(function (q) { return q.pergunta; }) };
  if (avisoTodas) { r.aviso = avisoTodas; r.diagnostico += ' ' + avisoTodas; }
  return r;
}

/** Prazo de cada plano (quando trocar): A e B pelo gatilho do seguinte; C pelo último passo mais 3 dias úteis. */
function ComEsp_saidas_(planos, x) {
  planos.forEach(function (p, i) {
    delete p._fim;
    if (planos[i + 1] && planos[i + 1].gatilho) p.saida = { texto: planos[i + 1].gatilho.texto, ate: planos[i + 1].gatilho.ate, ateIso: planos[i + 1].gatilho.ateIso };
    else { var u = p.passos[p.passos.length - 1], ate = ComEsp_du_(u.quandoIso, 3); p.saida = { texto: 'Sem avanço até ' + Com_brDia_(ate) + ': registre a perda com o motivo real ou combine a retomada com data.', ate: Com_brDia_(ate), ateIso: ate }; }
  });
}

function ComEsp_proximaDoPlano_(p) {
  var s = (p.passos || []).filter(function (z) { return z.quandoIso >= Com_hoje_(); })[0] || p.passos[0];
  var tipo = COM_TIPOS_CONTATO[s.canal] ? s.canal : 'LIGACAO', h = ComEsp_horaValida_(s.quandoIso, '10:00');
  return { acao: Com_texto_(s.acao, 300), data: Com_brDia_(h.dataIso), dataIso: h.dataIso, hora: h.hora, canal: tipo, canalNome: COM_TIPOS_CONTATO[tipo], plano: p.letra };
}

/** Data e hora da próxima ação que ainda não passaram: hoje com a hora já vencida vai para daqui a 1 hora (até 18:00) ou para o próximo dia útil às 09:00. */
function ComEsp_horaValida_(dataIso, hora) {
  var agora = Com_agora_(), h = /^([01]\d|2[0-3]):[0-5]\d$/.test(Com_s_(hora)) ? Com_s_(hora) : '10:00';
  if (!dataIso || dataIso + 'T' + h > agora) return { dataIso: dataIso, hora: h };
  var hh = Number(agora.slice(11, 13)) + 1;
  if (dataIso === agora.slice(0, 10) && hh <= 18) return { dataIso: dataIso, hora: Com_2_(hh) + ':00' };
  return { dataIso: ComEsp_du_(Com_somarDias_(agora.slice(0, 10), 1), 0), hora: '09:00' };
}

/** Registro da consulta em COM_IA_SUGESTOES (tipo ESPECIALISTA), com espaço para os três planos inteiros. Devolve o id. */
function ComEsp_registrar_(eu, t, origem, saida, verificacao) {
  try {
    var r = SGO_DATA.insert(COM_ABAS.SUGESTOES, { TIPO: 'ESPECIALISTA', REGRA: origem, USUARIO_ID: eu.id, OPORTUNIDADE_ID: t.id, PROPOSTA_ID: '', ORIGEM: origem, TITULO: Com_texto_(t.codigo, 300),
      CONTEUDO_JSON: JSON.stringify(saida || {}).slice(0, 45000), VERIFICACAO: Com_texto_(verificacao, 3000), DECISAO: '', DIA: Com_hoje_() });
    return Com_s_(r.ID);
  } catch (e) { return ''; }
}

// ------------------------------------------------------------
// VERIFICADOR ANTI-GENÉRICO
// ------------------------------------------------------------
/** Fabricantes e marcas conhecidos pelo sistema (o texto não pode citá-los). */
function ComEsp_fabricantes_() {
  var s = {};
  try { Com_ler_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).forEach(function (e) { var n = ComEsp_norm_(e.FABRICANTE); if (n.length >= 3) s[n] = 1; }); } catch (e) {}
  try { Com_ler_(COM_ABAS.PRECOS).forEach(function (r) { var n = ComEsp_norm_(r.MARCA); if (n.length >= 3) s[n] = 1; }); } catch (e) {}
  return Object.keys(s);
}

/**
 * Confere e normaliza a resposta da IA. ctx: { fatos, x, mem, fabricantes }. Devolve { ok, problemas[], saida }.
 * Uma resposta só passa inteira: plano solto não se mistura com o das regras (perderia a coerência entre A, B e C).
 */
function ComEsp_verificar_(j, ctx) {
  var problemas = [], fatos = ctx.fatos, x = ctx.x, mem = ctx.mem || { falhos: [] }, hoje = x.hoje, limiteDia = Com_somarDias_(hoje, 120);
  var ignorar = ComEsp_palavras_([x.t.titulo, x.t.cliente, x.t.unidade, x.t.contato, x.assunto].join(' '));
  var fabs = ctx.fabricantes || [], numPacote = ComEsp_numerosPacote_(x.met);
  var txt = function (onde, v, obrig) {
    var s = Com_s_(v);
    if (!s) { if (obrig) problemas.push(onde + ': vazio'); return ''; }
    var r = ComG_verificar_(s, fatos, { livres: 10 });
    if (!r.ok) problemas.push(onde + ': ' + r.problemas.slice(0, 2).join('; '));
    ComEsp_condicaoForaDaPolitica_(s, numPacote).forEach(function (c) { problemas.push(onde + ': ' + c); });
    COM_ESP_VAZIAS.forEach(function (re) { var m = s.match(re); if (m) problemas.push(onde + ': frase vazia ("' + m[0] + '"): diga o quê, com quem, por qual canal e quando'); });
    var n = ' ' + ComEsp_norm_(s) + ' ';
    fabs.forEach(function (fb) { if (n.indexOf(' ' + fb + ' ') >= 0) problemas.push(onde + ': cita fabricante ou marca (' + fb + ')'); });
    return s;
  };
  if (!j || typeof j !== 'object') return { ok: false, problemas: ['a resposta não é o JSON pedido'], saida: null };
  var diag = txt('diagnóstico', j.diagnostico, true);
  if (diag) {
    var nf = ComEsp_frases_(diag);
    if (nf < 2 || nf > 4) problemas.push('diagnóstico: escreva 2 ou 3 frases (vieram ' + nf + ')');
    if (!/\d/.test(diag)) problemas.push('diagnóstico: sem fato concreto (cite datas, dias, tentativas ou valores do sistema)');
  }
  var planos = Array.isArray(j.planos) ? j.planos : [];
  var letras = ['A', 'B', 'C'], saidaPlanos = [];
  if (planos.length !== 3) problemas.push('planos: são exatamente 3 (A, B e C); vieram ' + planos.length);
  planos.slice(0, 3).forEach(function (p, i) {
    var L = letras[i], onde = 'plano ' + L;
    p = p || {};
    var cod = Com_up_(p.abordagem);
    if (!COM_ESP_ABORDAGENS[cod]) problemas.push(onde + ': abordagem fora da lista (' + (Com_s_(p.abordagem) || 'vazia') + ')');
    var out = { letra: L, abordagem: cod, abordagemNome: COM_ESP_ABORDAGENS[cod] || '', titulo: Com_texto_(txt(onde + ', título', p.titulo, true), 200), objetivo: Com_texto_(txt(onde + ', objetivo', p.objetivo, true), 600), passos: [], objecoes: [], sucesso: '' };
    var ps = Array.isArray(p.passos) ? p.passos : [];
    var min = i === 0 ? 3 : 2;
    if (ps.length < min || ps.length > 5) problemas.push(onde + ': ' + (i === 0 ? '3 a 5' : '2 a 5') + ' passos (vieram ' + ps.length + ')');
    var antes = '';
    ps.slice(0, 5).forEach(function (s, k) {
      s = s || {};
      var iso = ComEsp_isoDe_(s.quando), canal = ComEsp_canal_(s.canal), o2 = onde + ', passo ' + (k + 1);
      if (!iso) problemas.push(o2 + ': sem data (use dd/mm/aaaa)');
      else if (iso < hoje) problemas.push(o2 + ': data no passado (' + Com_brDia_(iso) + ')');
      else if (iso > limiteDia) problemas.push(o2 + ': data longe demais (' + Com_brDia_(iso) + ')');
      else if (!ComEsp_diaUtil_(iso)) problemas.push(o2 + ': ' + Com_brDia_(iso) + ' não é dia útil');
      if (iso && antes && iso < antes) problemas.push(o2 + ': fora de ordem (data antes do passo anterior)');
      if (iso) antes = iso;
      if (!canal) problemas.push(o2 + ': canal fora da lista (LIGACAO, WHATSAPP, EMAIL, REUNIAO, VISITA)');
      var ac = txt(o2, s.acao, true);
      if (ac && ac.length < 15) problemas.push(o2 + ': ação curta demais para ser concreta');
      out.passos.push({ quando: iso ? Com_brDia_(iso) : '', quandoIso: iso, canal: canal, canalNome: COM_ESP_CANAIS[canal] || '', acao: Com_texto_(ac, 400) });
    });
    var msg = p.mensagem && typeof p.mensagem === 'object' ? p.mensagem : { texto: p.mensagem };
    var mc = ComEsp_canal_(msg.canal) || 'WHATSAPP';
    out.mensagem = { canal: mc, canalNome: COM_ESP_CANAIS[mc], assunto: Com_texto_(Com_s_(msg.assunto) ? txt(onde + ', assunto', msg.assunto) : '', 200), texto: Com_texto_(txt(onde + ', mensagem', msg.texto, true), 2500) };
    if (i === 0) {
      var obs = Array.isArray(p.objecoes) ? p.objecoes : [];
      if (!obs.length) problemas.push('plano A: faltam as respostas para as objeções prováveis');
      obs.slice(0, 4).forEach(function (b, k) { b = b || {}; var ob = txt('plano A, objeção ' + (k + 1), b.objecao, true), rs = txt('plano A, resposta ' + (k + 1), b.resposta, true); out.objecoes.push({ objecao: Com_texto_(ob, 300), resposta: Com_texto_(rs, 800) }); });
      out.sucesso = Com_texto_(txt('plano A, critério de sucesso', p.sucesso, true), 400);
    } else {
      out.sucesso = Com_texto_(txt(onde + ', critério de sucesso', p.sucesso, false), 400);
      var g = p.gatilho && typeof p.gatilho === 'object' ? p.gatilho : { texto: p.gatilho };
      var gt = txt(onde + ', gatilho', g.texto, true), gIso = ComEsp_isoDe_(g.ate);
      if (gt && !/\d|desconto|al[cç]ada|concorrente|recus|pedi[ud]|n[aã]o\s+respond|sem\s+resposta|entrou/i.test(gt)) problemas.push(onde + ', gatilho: condição vaga (diga o que dispara a troca e até quando)');
      if (!gIso) problemas.push(onde + ', gatilho: sem a data limite (campo "ate", dd/mm/aaaa)');
      else if (gIso < hoje) problemas.push(onde + ', gatilho: data no passado');
      out.gatilho = { texto: Com_texto_(gt, 400), ate: gIso ? Com_brDia_(gIso) : '', ateIso: gIso };
    }
    saidaPlanos.push(out);
  });
  // B e C diferentes do A (e entre si) de verdade
  for (var a = 0; a < saidaPlanos.length; a++) for (var b2 = a + 1; b2 < saidaPlanos.length; b2++) {
    var pa = saidaPlanos[a], pb = saidaPlanos[b2];
    if (pa.abordagem && pa.abordagem === pb.abordagem) problemas.push('plano ' + pb.letra + ': mesma abordagem do plano ' + pa.letra + ' (' + pa.abordagem + '); precisa ser diferente de verdade');
    else if (ComEsp_similar_(ComEsp_textoPlano_(pa), ComEsp_textoPlano_(pb), ignorar) >= COM_ESP_SIMILAR) problemas.push('plano ' + pb.letra + ': é variação do plano ' + pa.letra + ' (mesmos passos com outras palavras)');
  }
  // proibido repetir o que falhou
  (mem.falhos || []).forEach(function (f) {
    saidaPlanos.forEach(function (p) {
      if (p.abordagem && p.abordagem === f.abordagem) problemas.push('plano ' + p.letra + ': repete a abordagem ' + f.abordagem + ' do plano "' + f.titulo + '", que já falhou (' + Com_s_(f.motivo).slice(0, 120) + ')');
      else if (ComEsp_similar_(ComEsp_textoPlano_(p), f.texto, ignorar) >= COM_ESP_SIMILAR) problemas.push('plano ' + p.letra + ': repete o plano "' + f.titulo + '", que já falhou');
    });
  });
  // próxima ação
  var pa2 = j.proximaAcao || {}, pIso = ComEsp_isoDe_(pa2.data), pCanal = ComEsp_canal_(pa2.canal);
  var pAcao = txt('próxima ação', pa2.acao, true);
  if (!pIso) problemas.push('próxima ação: sem data'); else if (pIso < hoje) problemas.push('próxima ação: data no passado');
  if (!pCanal || !COM_TIPOS_CONTATO[pCanal]) problemas.push('próxima ação: canal fora da lista');
  var hv = ComEsp_horaValida_(pIso, pa2.hora);
  if (pIso) pIso = hv.dataIso;
  var hora = hv.hora;
  var perguntas = (Array.isArray(j.perguntas) ? j.perguntas : []).map(Com_s_).filter(function (q) { return q && ComG_verificar_(q, fatos, { livres: 10 }).ok && !COM_ESP_VAZIAS.some(function (re) { return re.test(q); }); }).slice(0, 3);
  var vistos = {};
  problemas = problemas.filter(function (p) { if (vistos[p]) return false; vistos[p] = 1; return true; });
  if (problemas.length) return { ok: false, problemas: problemas, saida: null };
  ComEsp_saidas_(saidaPlanos, x);
  return { ok: true, problemas: [], saida: { diagnostico: Com_texto_(diag, 1200), planos: saidaPlanos,
    proximaAcao: { acao: Com_texto_(pAcao, 300), data: Com_brDia_(pIso), dataIso: pIso, hora: hora, canal: pCanal, canalNome: COM_TIPOS_CONTATO[pCanal], plano: 'A' }, perguntas: perguntas } };
}

// ------------------------------------------------------------
// PROMPT
// ------------------------------------------------------------
function ComEsp_prompt_(eu, fx, mem) {
  var falhos = (mem.falhos || []).map(function (p) { return { abordagem: p.abordagem, titulo: p.titulo, motivo: p.motivo || p.situacaoNome, desde: p.desde }; });
  var emUso = mem.emUso && !mem.gatilhoVencido ? { letra: mem.emUso.letra, abordagem: mem.emUso.abordagem, titulo: mem.emUso.titulo, desde: mem.emUso.desde, gatilho: mem.emUso.gatilho, ate: mem.emUso.gatilhoAte } : null;
  return ComG_regrasPrompt_() +
    '\nVocê é a ESPECIALISTA em vendas B2B de serviços técnicos para hospitais (qualificação, calibração e manutenção de equipamentos; venda consultiva; compra pública e contrato). Você define a estratégia DESTA oportunidade, com base nos FATOS e na METODOLOGIA. Nada genérico: cada frase vale só para este caso.' +
    '\n\nMETODOLOGIA:\n' + ComEsp_metodologiaTexto_(fx.x.met, eu) +
    '\n\nABORDAGENS (escolha pelo código; os três planos usam abordagens diferentes):\n' + Object.keys(COM_ESP_ABORDAGENS).map(function (k) { return k + ': ' + COM_ESP_ABORDAGENS[k]; }).join('\n') +
    '\n\nFATOS:\n' + JSON.stringify(fx.fatos) +
    '\n\nPLANO EM USO (ainda dentro do prazo): ' + (emUso ? JSON.stringify(emUso) + '. O plano A continua esta abordagem com passos atualizados, salvo se os fatos mostrarem que ela falhou.' : 'nenhum.') +
    '\nPLANOS QUE FALHARAM (PROIBIDO repetir a abordagem ou os passos deles): ' + (falhos.length ? JSON.stringify(falhos) : 'nenhum.') +
    '\n\nREGRAS DA RESPOSTA:' +
    '\n- diagnostico: 2 ou 3 frases que citem fatos concretos do sistema (datas, dias, tentativas, valores, etapa), exatamente como estão nos FATOS.' +
    '\n- planos: exatamente 3, letras A, B e C. Abordagem diferente de verdade em cada um (trocar só o canal com o mesmo texto não conta como plano diferente).' +
    '\n- Plano A: objetivo; 3 a 5 passos, cada um com "quando" (dd/mm/aaaa, SÓ datas da lista proximosDiasUteis dos FATOS, que já exclui fins de semana e feriados, em ordem), "canal" (LIGACAO, WHATSAPP, EMAIL, REUNIAO ou VISITA) e "acao" concreta (o quê, com quem); mensagem pronta em nome do vendedor (WhatsApp ou e-mail com assunto); respostas para as objeções prováveis (as do histórico primeiro); critério de sucesso verificável.' +
    '\n- Planos B e C: gatilho de troca concreto com a data limite (por exemplo: sem resposta até dd/mm/aaaa, 3 dias úteis depois do passo 2; cliente pediu desconto acima do limite do vendedor; concorrente entrou com preço menor), 2 a 4 passos datados depois do gatilho, mensagem e critério de sucesso.' +
    '\n- proximaAcao: a primeira ação do plano A, com data (dd/mm/aaaa), hora (hh:mm) e canal.' +
    '\n- Proibido: "manter contato", "agregar valor", "entender a necessidade" sem dizer qual, "follow-up", "estreitar relacionamento", "alinhar expectativas". Toda ação diz o quê, com quem, por qual canal e quando.' +
    '\n- Desconto: nunca ofereça nem prometa. Acima do limite do vendedor, o caminho é a Caixa de decisões da gestão com a fundamentação, ou mudar escopo, prazo ou condição de pagamento.' +
    '\n- Pacote anual ou contrato: nunca prometa percentual "a menos", preço "abaixo da tabela", abatimento nem número de parcelas; diga que a condição depende de aprovação da gestão na Caixa de decisões' + (ComEsp_pacotePolitica_(fx.x.met) ? ' (a política da gestão está nos FATOS, em referenciasComerciais).' : '.') +
    '\n- Não cite marca, fabricante ou modelo de equipamento. Número só se estiver nos FATOS (dias úteis até 10 podem ser usados).' +
    '\n\nFormato: {"diagnostico":"...","planos":[{"letra":"A","abordagem":"CODIGO","titulo":"...","objetivo":"...","passos":[{"quando":"dd/mm/aaaa","canal":"LIGACAO","acao":"..."}],"mensagem":{"canal":"WHATSAPP","assunto":"","texto":"..."},"objecoes":[{"objecao":"...","resposta":"..."}],"sucesso":"..."},' +
    '{"letra":"B","abordagem":"CODIGO","titulo":"...","objetivo":"...","gatilho":{"texto":"...","ate":"dd/mm/aaaa"},"passos":[...],"mensagem":{...},"sucesso":"..."},{"letra":"C",...}],"proximaAcao":{"acao":"...","data":"dd/mm/aaaa","hora":"10:00","canal":"LIGACAO"},"perguntas":["..."]}';
}

// ------------------------------------------------------------
// CONSULTA (tela): fatos, IA conferida com refação, regras
// ------------------------------------------------------------
/**
 * "Pedir à especialista". d: { id, comIA }. Devolve { sugestaoId, sugestao: { diagnostico, cenario, planos[A,B,C], proximaAcao,
 * perguntas }, origem, aviso, memoria, oportunidade, proximaAtual, lembrete }. Só registra a sugestão (COM_IA_SUGESTOES, tipo
 * ESPECIALISTA); nada é enviado, nenhuma etapa muda e nenhuma atividade é criada.
 */
/**
 * Com que olhos a especialista monta os fatos. A própria oportunidade: a visão de quem pede. A gestão numa oportunidade de outra
 * pessoa: a visão do responsável (vendedor: vê valores das próprias, nunca custo nem o que é de outro vendedor).
 */
function ComEsp_visao_(eu, o) {
  var resp = Com_s_(o.RESPONSAVEL_ID);
  if (!eu.gestao || !resp || resp === eu.id) return { eu: eu, doResponsavel: false };
  return { doResponsavel: true, eu: { id: resp, nome: Com_s_(o.RESPONSAVEL_NOME), login: '', perfil: 'COMERCIAL', area: 'COMERCIAL', nivel: 'VENDEDOR', gestao: false, vendedor: true, financeiro: false,
    veValores: true, veCusto: false, catalogo: false, catalogoVenda: true, diretoria: false } };
}

function ComEsp_consultar_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'pedir à especialista');
  d = d || {};
  var o = ComOpo_obter_(eu, d.id, 'pedir à especialista');
  // revisão 01/11/2026: tudo o que a especialista escreve pode ser gravado na oportunidade (plano em uso, histórico) e lido pelo
  // responsável. Quando a gestão consulta a oportunidade de outra pessoa, os fatos e o prompt saem com a VISÃO DO RESPONSÁVEL
  // (sem custo, margem, preço de compra nem oportunidades de outros vendedores).
  var visao = ComEsp_visao_(eu, o), ev = visao.eu;
  var fx = ComEsp_fatos_(ev, o), x = fx.x, t = x.t;
  var mem = ComEsp_memoria_(t.id, x.regs, x.hoje);
  fx.fatos.planoEmUso = mem.emUso ? { letra: mem.emUso.letra, titulo: mem.emUso.titulo, desde: mem.emUso.desde, gatilho: mem.emUso.gatilho, ate: mem.emUso.gatilhoAte, gatilhoVencido: mem.gatilhoVencido } : 'nenhum';
  fx.fatos.planosQueFalharam = mem.falhos.map(function (p) { return { abordagem: p.abordagem, titulo: p.titulo, motivo: p.motivo }; });
  var saida = null, origem = 'REGRAS', avisos = [], tentativas = 0, recusas = [];
  if (d.comIA !== false) {
    if (!ComG_iaDisponivel_()) avisos.push('A especialista está trabalhando só pelas regras: a chave da IA não está cadastrada (Administração > Chaves e senhas). Os planos abaixo saem dos fatos do sistema e da metodologia.');
    else {
      var ctxV = { fatos: fx.fatos, x: x, mem: mem, fabricantes: ComEsp_fabricantes_() };
      var prompt = ComEsp_prompt_(ev, fx, mem), problemas = [];
      for (var k = 0; k <= COM_ESP_REFACOES; k++) {
        if (typeof ComO_cotaIA_ === 'function' && !ComO_cotaIA_(eu)) { avisos.push('Você já usou ' + (typeof COM_O_IA_POR_HORA !== 'undefined' ? COM_O_IA_POR_HORA : 20) + ' análises com IA nesta hora (a cota é por pessoa e vale para todo o Comercial): esta saiu pelas regras. Na próxima hora a IA volta.'); break; }
        tentativas++;
        var p2 = k === 0 ? prompt : prompt + '\n\nSUA RESPOSTA ANTERIOR FOI RECUSADA PELO VERIFICADOR. Corrija todos os pontos e responda de novo, completa:\n- ' + problemas.slice(0, 12).join('\n- ');
        var r = ComG_chamarIA_(p2, 16384);
        if (!r.json) { avisos.push(r.aviso.replace(/valem as regras\.?$/, 'valem as regras: os planos abaixo saem dos fatos do sistema e da metodologia.')); break; }
        var v = ComEsp_verificar_(r.json, ctxV);
        if (v.ok) { saida = v.saida; origem = 'IA'; break; }
        problemas = v.problemas;
        recusas.push({ tentativa: tentativas, problemas: v.problemas.slice(0, 8) });
      }
      // 01/11/2026 (pedido do dono): o detalhe da recusa é técnico e fica só para a gestão; o vendedor lê que o plano saiu pelas regras
      if (!saida && recusas.length && recusas.length === tentativas) avisos.push(eu.gestao ? 'A resposta da IA foi recusada ' + Com_plural_(tentativas, 'vez', 'vezes') + ' pelo verificador (' + recusas[recusas.length - 1].problemas.slice(0, 2).join('; ') + '). Valem os planos pelas regras, montados com os fatos do sistema.' : 'Planos montados pelas regras da metodologia, com os fatos desta oportunidade.');
    }
  }
  if (!saida) { saida = ComEsp_planosRegras_(x, mem); if (saida.aviso) avisos.unshift(saida.aviso); }
  saida.cenario = x.cenario; saida.cenarioNome = COM_ESP_CENARIOS[x.cenario];
  if (visao.doResponsavel) { saida.visao = 'responsavel'; avisos.push('Como a oportunidade é de ' + Com_s_(o.RESPONSAVEL_NOME) + ', os planos foram montados com a visão de quem é responsável por ela (sem custo, margem nem dados de outros vendedores): o plano posto em uso fica gravado na oportunidade e a pessoa responsável vê tudo.'); }
  var aviso = avisos.join(' ');
  var id = ComEsp_registrar_(eu, t, origem, saida, (aviso + (recusas.length ? ' Recusas: ' + JSON.stringify(recusas) : '')).trim());
  return { sugestaoId: id, sugestao: saida, origem: origem, aviso: aviso, tentativasIA: tentativas, memoria: mem,
    oportunidade: { id: t.id, codigo: t.codigo, cliente: t.cliente, titulo: t.titulo, etapaNome: t.etapaNome },
    proximaAtual: { acao: t.proximaAcao, em: t.proximaEm, temAtividade: !t.semProxima }, tiposContato: COM_TIPOS_CONTATO,
    lembrete: 'A especialista só sugere: nada é enviado ao cliente, a etapa não muda e a atividade só é criada quando você toca em "Criar a próxima ação". Revise a mensagem e envie você mesmo.' };
}

// ------------------------------------------------------------
// AÇÕES DO VENDEDOR: usar, trocar, deu certo, não deu certo, criar a próxima ação
// ------------------------------------------------------------
function ComEsp_sugestao_(eu, sugestaoId, acao) {
  var s = SGO_DATA.getById(COM_ABAS.SUGESTOES, Com_s_(sugestaoId));
  if (!s || Com_s_(s.TIPO) !== 'ESPECIALISTA') throw new Error('Não foi possível ' + acao + ': a consulta à especialista não foi encontrada. Peça à especialista de novo');
  var o = ComOpo_obter_(eu, s.OPORTUNIDADE_ID, acao);
  return { s: s, o: o, conteudo: Com_json_(s.CONTEUDO_JSON, {}) || {} };
}

/**
 * Usar um plano da consulta (ou trocar para ele). d: { sugestaoId, letra, motivo }. Se outro plano está em uso: mesma abordagem =
 * atualização (sem motivo); abordagem diferente = "Troquei para o plano X" (motivo obrigatório; o anterior conta como falho).
 */
function ComEsp_usarPlano_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'usar o plano da especialista');
  d = d || {};
  var letra = Com_up_(d.letra);
  return Com_comTrava_(function () {
    var g = ComEsp_sugestao_(eu, d.sugestaoId, 'usar o plano');
    if (Com_up_(g.o.SITUACAO || 'ABERTA') !== 'ABERTA') throw new Error('Não foi possível usar o plano: a oportunidade ' + Com_s_(g.o.CODIGO) + ' está encerrada');
    var p = (g.conteudo.planos || []).filter(function (z) { return Com_up_(z.letra) === letra; })[0];
    if (!p) throw new Error('Não foi possível usar o plano: escolha o plano A, B ou C desta consulta');
    var mem = ComEsp_memoria_(Com_s_(g.o.ID));
    var agora = Com_agora_(), msg;
    if (mem.emUso) {
      if (Com_s_(mem.emUso.sugestaoId) === Com_s_(g.s.ID) && mem.emUso.letra === letra) return { message: 'O plano ' + letra + ' já está em uso.', memoria: mem };
      var mesma = mem.emUso.abordagem === Com_up_(p.abordagem);
      var motivo = Com_texto_(d.motivo, 500);
      if (!mesma && motivo.length < 5) throw new Error('Não foi possível trocar: diga em poucas palavras por que o plano ' + mem.emUso.letra + ' não andou (pelo menos 5 letras). A especialista usa isso para não repetir o que falhou');
      ComEsp_gravarPlano_(mem.emUso.id, { SITUACAO: mesma ? 'ATUALIZADO' : 'TROCADO', MOTIVO: Com_brDia_(agora) + ': ' + (mesma ? 'atualizado pela consulta de ' + Com_brDia_(g.s.CRIADO_EM || agora) : 'troquei para o plano ' + letra + '. ' + motivo), DECIDIDO_EM: agora, DECIDIDO_POR_NOME: eu.nome });
      msg = mesma ? 'Plano ' + letra + ' em uso (atualiza o anterior, mesma abordagem).' : 'Troca registrada: o plano ' + mem.emUso.letra + ' ficou como "não andou" e o plano ' + letra + ' está em uso.';
    } else msg = 'Plano ' + letra + ' em uso. Quando o gatilho vencer sem resposta do cliente, a ficha avisa para trocar.';
    var saida = p.saida || {};
    var regs = Com_ler_(COM_ABAS.CONTATOS_REG).filter(function (c) { return Com_s_(c.OPORTUNIDADE_ID) === Com_s_(g.o.ID); });
    ComEsp_gravarPlano_('', { OPORTUNIDADE_ID: Com_s_(g.o.ID), OPORTUNIDADE_CODIGO: Com_s_(g.o.CODIGO), RESPONSAVEL_ID: Com_s_(g.o.RESPONSAVEL_ID), SUGESTAO_ID: Com_s_(g.s.ID), ORIGEM: Com_s_(g.s.ORIGEM),
      LETRA: letra, ABORDAGEM: Com_up_(p.abordagem), TITULO: Com_texto_(p.titulo, 200), RESUMO: Com_texto_(p.objetivo, 600), GATILHO: Com_texto_(saida.texto, 400), GATILHO_ATE: Com_s_(saida.ateIso),
      SITUACAO: 'EM_USO', PLANO_JSON: JSON.stringify(p).slice(0, 20000), CONTATOS_INICIO: regs.length, INICIADO_EM: agora, INICIADO_POR_ID: eu.id, INICIADO_POR_NOME: eu.nome });
    Com_historico_('OPORTUNIDADE', Com_s_(g.o.ID), 'ESPECIALISTA', eu, { texto: 'Plano ' + letra + ' da especialista em uso: ' + Com_s_(p.titulo) + (saida.ate ? '. Trocar se: ' + Com_s_(saida.texto) : '') });
    return { message: msg, memoria: ComEsp_memoria_(Com_s_(g.o.ID)) };
  });
}

/** "Deu certo" ou "Não deu certo" no plano em uso. d: { planoId, resultado: DEU_CERTO|NAO_DEU_CERTO, motivo } */
function ComEsp_decidirPlano_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'marcar o resultado do plano');
  d = d || {};
  var res = Com_up_(d.resultado);
  if (res !== 'DEU_CERTO' && res !== 'NAO_DEU_CERTO') throw new Error('Não foi possível marcar: escolha "Deu certo" ou "Não deu certo"');
  var motivo = Com_texto_(d.motivo, 500);
  if (res === 'NAO_DEU_CERTO' && motivo.length < 5) throw new Error('Não foi possível marcar: diga em poucas palavras por que não deu certo (pelo menos 5 letras, por exemplo "cliente disse que fica com o fornecedor atual"). A próxima consulta não repete este plano');
  return Com_comTrava_(function () {
    var r = SGO_DATA.getById(COM_ABAS.PLANOS, Com_s_(d.planoId));
    if (!r) throw new Error('Não foi possível marcar: o plano não foi encontrado. Abra a especialista de novo');
    var o = ComOpo_obter_(eu, r.OPORTUNIDADE_ID, 'marcar o resultado do plano');
    if (Com_up_(r.SITUACAO) !== 'EM_USO') throw new Error('Não foi possível marcar: o plano ' + Com_s_(r.LETRA) + ' não está mais em uso (' + (COM_ESP_SITUACOES[Com_up_(r.SITUACAO)] || r.SITUACAO).toLowerCase() + ')');
    var agora = Com_agora_();
    ComEsp_gravarPlano_(r.ID, { SITUACAO: res, MOTIVO: motivo ? Com_brDia_(agora) + ': ' + motivo : '', DECIDIDO_EM: agora, DECIDIDO_POR_NOME: eu.nome });
    Com_historico_('OPORTUNIDADE', Com_s_(o.ID), 'ESPECIALISTA', eu, { texto: 'Plano ' + Com_s_(r.LETRA) + ' da especialista (' + Com_s_(r.TITULO) + '): ' + (res === 'DEU_CERTO' ? 'deu certo' : 'não deu certo. ' + motivo) });
    try { if (Com_s_(r.SUGESTAO_ID)) SGO_DATA.update(COM_ABAS.SUGESTOES, r.SUGESTAO_ID, { DECISAO: res === 'DEU_CERTO' ? 'USEI' : 'DESCARTEI', DECISAO_EM: agora, DECISAO_MOTIVO: motivo || 'Plano ' + Com_s_(r.LETRA) + ' deu certo' }); } catch (e) {}
    return { message: res === 'DEU_CERTO' ? 'Anotado: o plano ' + Com_s_(r.LETRA) + ' deu certo.' : 'Anotado. Peça à especialista o próximo plano: ela não repete este.', memoria: ComEsp_memoria_(Com_s_(o.ID)) };
  });
}

/**
 * "Criar a próxima ação" (um toque do vendedor): cria a atividade em Minhas atividades pela função de sempre (ComOpo_criarProxima_)
 * e passa a ser a próxima ação da oportunidade. A atividade aberta anterior é cancelada com o motivo. Sem plano em uso, o plano
 * de onde saiu a ação passa a ser o plano em uso. d: { id, sugestaoId, letra, acao, data, hora, tipo }
 */
function ComEsp_criarAcao_(eu, sessionId, d) {
  Com_exigir_(eu, 'VENDEDOR', 'criar a próxima ação');
  d = d || {};
  var prox = ComOpo_proxima_({ acao: d.acao, data: ComEsp_isoDe_(d.data) || d.data, hora: d.hora, tipo: d.tipo }, 'criar a próxima ação');
  var letra = Com_up_(d.letra) || 'A';
  var r = Com_comTrava_(function () {
    var o = ComOpo_obter_(eu, d.id, 'criar a próxima ação');
    if (Com_up_(o.SITUACAO || 'ABERTA') !== 'ABERTA') throw new Error('Não foi possível criar a próxima ação: a oportunidade ' + Com_s_(o.CODIGO) + ' está encerrada');
    // revisão 01/11/2026: a consulta tem de ser desta oportunidade (sugestaoId de outra não põe plano em uso aqui)
    if (Com_s_(d.sugestaoId)) {
      var sg = SGO_DATA.getById(COM_ABAS.SUGESTOES, Com_s_(d.sugestaoId));
      if (!sg || Com_s_(sg.TIPO) !== 'ESPECIALISTA' || Com_s_(sg.OPORTUNIDADE_ID) !== Com_s_(o.ID)) throw new Error('Não foi possível criar a próxima ação: a consulta à especialista não é desta oportunidade. Peça à especialista de novo nesta oportunidade');
    }
    var antiga = Com_atividade_(o.ATIVIDADE_ID), trocou = false;
    var campos = { PROXIMA_ACAO: prox.texto, PROXIMA_ACAO_TIPO: prox.tipo, PROXIMA_ACAO_EM: prox.prazo, ATUALIZADO_EM: Com_agora_() };
    var novo = Object.assign({}, o, campos);
    campos.ATIVIDADE_ID = ComOpo_criarProxima_(eu, sessionId, novo, prox);
    if (Com_atividadeAberta_(antiga)) { Com_mudarAtividade_(o.ATIVIDADE_ID, 'Cancelada', 'Trocada pela próxima ação do plano ' + letra + ' da especialista: ' + prox.texto); trocou = true; }
    SGO_DATA.update(COM_ABAS.OPORTUNIDADES, o.ID, campos);
    Com_historico_('OPORTUNIDADE', o.ID, 'ESPECIALISTA', eu, { texto: 'Próxima ação criada pelo plano ' + letra + ' da especialista: ' + prox.texto + ' em ' + Com_br_(prox.prazo) + (trocou ? ' (a anterior, "' + Com_s_(o.PROXIMA_ACAO) + '", foi cancelada).' : '.') });
    return { o: o, trocou: trocou, anterior: Com_s_(o.PROXIMA_ACAO) };
  });
  var memo = null;
  if (Com_s_(d.sugestaoId)) {
    try { var mem = ComEsp_memoria_(Com_s_(r.o.ID)); if (!mem.emUso) memo = ComEsp_usarPlano_(eu, { sugestaoId: d.sugestaoId, letra: letra }).memoria; } catch (e) { console.error('Especialista, plano em uso: ' + ((e && e.message) || e)); }
  }
  return { message: 'Próxima ação criada em Minhas atividades para ' + Com_br_(prox.prazo) + (r.trocou ? '. A anterior ("' + r.anterior + '") foi cancelada.' : '.'), memoria: memo || ComEsp_memoria_(Com_s_(r.o.ID)) };
}

/** Memória para a tela (histórico dos planos). d: { id } */
function ComEsp_planosTela_(eu, d) {
  Com_exigir_(eu, 'VENDEDOR', 'ver os planos da especialista');
  var o = ComOpo_obter_(eu, d && d.id, 'ver os planos da especialista');
  return { memoria: ComEsp_memoria_(Com_s_(o.ID)) };
}
