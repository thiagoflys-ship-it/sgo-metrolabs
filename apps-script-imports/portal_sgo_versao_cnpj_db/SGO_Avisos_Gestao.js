/****************************************************
 * AVISOS DA GESTÃO NO CELULAR (01/11/2026, decisão do dono)
 *
 * Pedido do dono: "os avisos dessa gestão vão ao celular, como pendência, atrasos ou aprovação, e se tiver algo que é
 * irreversível (finalização, indeferimento), que toda essa movimentação seja, além do e-mail, enviada no WhatsApp para
 * tomada de ação... não perder nada". Inventário e decisões: docs/AVISOS_GESTAO_CELULAR_20261101.md.
 *
 * DECISÕES DO DONO (01/11/2026), aplicadas aqui:
 *  1. Horário: a Diretoria recebe a qualquer hora (noite e fim de semana). O gestor recebe só no expediente da empresa
 *     (SGO_Expediente.js); o que nasce fora dele sai na abertura do próximo dia útil (08:00 no padrão).
 *  2. Quantidade: sem o teto de 3 WhatsApp por dia. O que nasce dentro de 30 minutos vai numa mensagem só por pessoa, com a
 *     lista e um link por item. Atraso e ato irreversível saem na hora (sem esperar o agrupamento), respeitando o item 1.
 *  3. Ação: cada item leva um link que abre o item exato no SGO+, com login (?aviso=<código>). A decisão é sempre tomada no
 *     sistema; nada de botão de aprovar ou recusar no WhatsApp.
 *  4. Irreversível (perda, cancelamento, exclusão, indeferimento, recusa definitiva): avisa na hora o gestor da área e a
 *     Diretoria, com quem fez, o quê, em qual item e o motivo (SGO_avisoGestaoIrreversivel_, chamado pelos módulos).
 *  5. Para todos os gestores e a Diretoria, sem piloto e inclusive PJ (são gestores). O assunto ponto continua fora.
 *
 * QUEM É "GESTÃO" AQUI (revisão 01/11/2026): Administrador, Gestor, Diretoria e o dono; RH e Financeiro só quando são
 * responsáveis de área (Caixa de decisões > Regras e responsáveis). Ativos, sem a conta técnica "admin". Um auxiliar de RH ou
 * do Financeiro que não responde por área fica de fora e continua com o teto. Para as demais pessoas nada muda: o teto de 3 WhatsApp na hora, o resumo
 * do dia e as regras da matriz continuam iguais (SGO_avisoMatrizPreparar_ só desvia os destinatários da gestão).
 *
 * OS QUATRO TIPOS (campo "gestao" do evento na matriz de avisos):
 *  - PENDENCIA (pendência ou aprovação): agrupada em 30 minutos.
 *  - ATRASO: na hora (prazo de decisão vencido, escalada à Diretoria, atividade atrasada escalada pela SEDNA).
 *  - IRREVERSIVEL: na hora; não exige ação (fica resolvido assim que sai).
 *  - Informativo (evento sem o campo): continua como está e não vai para o WhatsApp da gestão.
 * A regra fica visível e ajustável em Administração > Matriz de avisos ("Avisos da gestão: ligado/desligado"). A ligação
 * para todos os eventos foi gravada uma vez em NTF_REGRAS (uma linha por evento, motivo "decisão do dono 01/11/2026",
 * com o canal de e-mail e WhatsApp de antes preservados; nada apagado).
 *
 * CICLO DE CADA AVISO (aba NTF_GESTAO, uma linha por evento + item + pessoa; nada é apagado):
 *   criado -> NA_FILA -> ENVIADO (e-mail e WhatsApp, cada um com a situação e o motivo) -> ENTREGUE/LIDO (retorno da Meta,
 *   SGO_avisosGestaoRetornoMeta_, pronto para receber) -> RESOLVIDO (o item saiu da pendência: Caixa de decisões ou
 *   atividade; o irreversível fica resolvido ao sair). Abrir o link grava ABERTO_EM.
 *   - O e-mail sai sempre; o WhatsApp sai junto pelo modelo sgo_gestao_acao (categoria Utilidade). Sem celular, sem modelo
 *     aprovado ("WhatsApp aguardando modelo") ou com erro da Meta, o motivo fica na linha e o e-mail já levou o aviso.
 *   - Idempotência: a CHAVE (evento|item|marco|pessoa) não se repete. O marco é a entrada do item na Caixa (ENTROU_EM) ou o
 *     título do aviso: um segundo marco do mesmo item (RP07 "em risco" e depois "vencido", um segundo pedido de nova data)
 *     avisa de novo. Chave repetida não tira a pessoa do e-mail comum do notificador.
 *   - Sem envio em dobro: a escolha das linhas fica sob LockService.tryLock e cada linha passa a ENVIANDO antes de sair
 *     (ENVIANDO há mais de 10 minutos volta a ser enviada, se a execução caiu no meio).
 *   - Piloto: o celular da gestão vai numa lista própria (WA_PILOTO.telefonesGestao, SGO_WhatsappPiloto.js), que libera só o
 *     modelo sgo_gestao_acao destes avisos; a lista "telefones" do piloto não muda.
 *   - Conferência dos parados (relatório semanal da manutenção): SGO_avisosGestaoConferir_().
 *
 * ENTRA NA RODADA DE 15 MINUTOS DA GESTÃO (SGO_Gestao_Escada.js Ges_rodada_), antes do corte do expediente (a Diretoria
 * recebe a qualquer hora): gera os avisos da Caixa de decisões (GS01, GS02, GS03), marca o que foi resolvido e envia.
 * PEDIDO DA REPRESENTADA (03/11/2026, pedido do dono; SGO_Representacao_Alertas.js): os eventos RP01 e RP02 (pedido novo) e
 * RP07 (prazo de aceite a 75% e vencido) vão também para quem responde pela representação (Regras da assistência >
 * Representação; sem ninguém, quem faz a triagem), mesmo quem não é da gestão: o celular dessas pessoas entra na lista da gestão
 * do piloto só para o modelo sgo_gestao_acao. Para esses eventos: só no expediente e em dia útil para todos, inclusive a
 * Diretoria (fora dele, na abertura do próximo expediente); RP01 e RP02 saem na hora (o prazo de aceite é de 4 horas úteis);
 * teto de AVG_REP_TETO_DIA WhatsApp por pessoa por dia (passou, o aviso vai só por e-mail, com o motivo); e o que ainda está na
 * fila sai como resolvido, sem mensagem, se o pedido foi aceito, recusado ou cancelado antes (RESOLVE_POR = REPSOL:<id>).
 *
 * Nenhuma função devolve Date cru. Nunca mostra token, chave ou número de telefone. Mensagens sóbrias, sem emoji.
 ****************************************************/

var AVG_FUSO = 'America/Sao_Paulo';
var AVG_ABA = 'NTF_GESTAO';
var AVG_COLUNAS = ['ID', 'AVISO_ID', 'CHAVE', 'USUARIO_ID', 'USUARIO_NOME', 'DIRETORIA', 'EVENTO', 'TIPO', 'MODULO', 'TITULO', 'TEXTO', 'LINHA', 'TELA_JSON',
  'REF_ID', 'RESOLVE_POR', 'PRAZO', 'QUANDO', 'LIBERAR_EM', 'SITUACAO', 'TENTATIVAS', 'ENVIADO_EM', 'MENSAGEM_ID', 'EMAIL_SITUACAO', 'EMAIL_MOTIVO',
  'WA_SITUACAO', 'WA_MOTIVO', 'WA_ID', 'ENTREGUE_EM', 'LIDO_EM', 'ABERTO_EM', 'RESOLVIDO_EM', 'RESOLUCAO', 'ORIGEM', 'CRIADO_EM', 'ENVIANDO_EM'];
var AVG_COLUNAS_TEXTO = ['QUANDO', 'LIBERAR_EM', 'ENVIADO_EM', 'ENTREGUE_EM', 'LIDO_EM', 'ABERTO_EM', 'RESOLVIDO_EM', 'PRAZO', 'ENVIANDO_EM'];
var AVG_ENVIANDO_MAX_MIN = 10;     // linha "ENVIANDO" há mais que isto (execução caiu no meio) volta a ser enviada
var AVG_MODELO = 'sgo_gestao_acao';
var AVG_AGRUPAR_MIN = 30;          // pendência espera até 30 minutos para ir junto com as outras da mesma pessoa
var AVG_PARADO_FILA_MIN = 60;      // na fila há mais que isto (fora a espera do expediente): aparece na conferência
var AVG_MAX_TENTATIVAS = 3;        // erro passageiro do e-mail: tenta de novo nas rodadas seguintes
var AVG_WA_MAX_LISTA = 560;        // tamanho da lista no WhatsApp (o resto vai em "e mais N")
var AVG_PADRAO_DONO = '20261101';
var AVG_MOTIVO_DONO = 'decisão do dono 01/11/2026: avisos da gestão no celular (WhatsApp e e-mail; pendência agrupada em 30 minutos; atraso e irreversível na hora; gestor no expediente, Diretoria a qualquer hora; sem teto e sem piloto para a gestão)';
var AVG_TIPOS = { PENDENCIA: 'Pendência / Aprovação', ATRASO: 'Atraso', IRREVERSIVEL: 'Irreversível' };
var AVG_URGENTES = ['ATRASO', 'IRREVERSIVEL'];
var AVG_MODULOS_FORA = ['ponto'];
// Itens da Caixa que não geram GS01-GS03: a atividade atrasada da equipe já é escalada pela SEDNA por prioridade (S72 ao gestor,
// S73 à Diretoria, avisos da gestão de atraso); avisar também na entrada da Caixa repetiria a cobrança e furaria os prazos da prioridade.
var AVG_CAIXA_FORA = ['atividade_atrasada'];
// Itens da Caixa de decisões que são aprovação (a linha do aviso diz "Aprovação" em vez de "Pendência")
var AVG_APROVACOES = ['comercial_desconto', 'comercial_reabertura', 'comercial_preco', 'atividade_justificativa', 'compras_aprovar', 'conduta_homologar', 'conduta_julgar',
  'conduta_missao', 'conduta_sugestao', 'frota_abast_justificativa', 'ast_orc_recusado', 'ast_orc_ajuste'];
var AVG_SITUACOES = { NA_FILA: 'Na fila', ENVIANDO: 'Enviando', ENVIADO: 'Enviado', FALHOU: 'Falhou', RESOLVIDO: 'Resolvido' };
var AVG_WA_ROTULOS = { ENVIADO: 'WhatsApp enviado', ENTREGUE: 'WhatsApp entregue', LIDO: 'WhatsApp lido', AGUARDANDO_MODELO: 'WhatsApp aguardando modelo', SEM_NUMERO: 'Sem celular no cadastro', FALHOU: 'WhatsApp falhou', FORA_DA_GESTAO: 'Fora da gestão: regra comum',
  TETO: 'Teto do dia: só e-mail' };
// 03/11/2026: pedido da representada (ver o cabeçalho). Quem responde pela representação vem de Rep_responsaveisWhatsapp_ (SGO_Representacao_Alertas.js).
var AVG_REP_EVENTOS = ['RP01', 'RP02', 'RP07'];
var AVG_NA_HORA_EVENTOS = ['RP01', 'RP02'];
var AVG_SO_EXPEDIENTE_EVENTOS = ['RP01', 'RP02', 'RP07'];
var AVG_REP_TETO_DIA = 10;
var AVG_SIGILO_TITULO = 'Julgamento registrado no Programa de Conduta';

/** Eventos novos da matriz (gestao = tipo do aviso da gestão). Os de módulos que já existiam ganham o tipo em AVG_MARCAR. */
var AVG_MTZ_EVENTOS = [
  { cod: 'GS01', modulo: 'gestao', evento: 'Decisão nova na Caixa de decisões (pendência ou aprovação de qualquer módulo: desconto, reabertura, preço, nova data, compra, Frota, Assistência, padrões...)', origem: 'SGO_Avisos_Gestao.js (rodada de 15 minutos)', publico: 'Gestor responsável pelo item (Regras e responsáveis); sem gestor, a Diretoria', email: 'NAO', whatsapp: 'NAO', limite: '1 por item por pessoa, agrupado em 30 minutos', obs: 'Aviso da gestão: WhatsApp e e-mail com o link do item. Desligado, o item segue no sistema e no resumo do dia da Caixa de decisões. Ponto fica fora.', gestao: 'PENDENCIA' },
  { cod: 'GS02', modulo: 'gestao', evento: 'Decisão da Caixa com o prazo vencido e sem nenhuma ação', origem: 'SGO_Avisos_Gestao.js (rodada de 15 minutos)', publico: 'Gestor responsável pelo item', email: 'NAO', whatsapp: 'NAO', limite: '1 por item por pessoa', obs: 'Atraso: sai na hora (gestor no expediente). Sem ação, a escada da Caixa sobe à Diretoria.', gestao: 'ATRASO' },
  { cod: 'GS03', modulo: 'gestao', evento: 'Decisão escalada à Diretoria (parada há 5 dias úteis)', origem: 'SGO_Avisos_Gestao.js (rodada de 15 minutos)', publico: 'Diretoria', email: 'NAO', whatsapp: 'NAO', limite: '1 por item por pessoa', obs: 'Atraso: sai na hora, a qualquer hora, com o nome de quem está segurando.', gestao: 'ATRASO' },
  { cod: 'GI01', modulo: 'comercial', evento: 'Ato irreversível no Comercial: oportunidade perdida, proposta cancelada ou excluída, desconto não aprovado, reabertura recusada', origem: 'SGO_Comercial_Oportunidades.js; SGO_Comercial_Propostas.js', publico: 'Gestor da área (Comercial) e Diretoria, menos quem fez', email: 'HORA', whatsapp: 'NAO', limite: '1 por ato', obs: 'Quem fez, o quê, em qual item e o motivo. Não exige ação.', area: 'COMERCIAL', gestao: 'IRREVERSIVEL' },
  { cod: 'GI02', modulo: 'atividades', evento: 'Ato irreversível nas Atividades: pedido de nova data recusado', origem: 'SGO_Atividades.js', publico: 'Gestor da área da pessoa e Diretoria, menos quem fez', email: 'HORA', whatsapp: 'NAO', limite: '1 por recusa', obs: 'Quem recusou, a atividade, a data pedida e o motivo.', gestao: 'IRREVERSIVEL' },
  { cod: 'GI03', modulo: 'compras', evento: 'Ato irreversível em Compras: pedido de compra cancelado', origem: 'SGO_Compras_Requisicoes.js', publico: 'Gestor da área (Logística) e Diretoria, menos quem fez', email: 'HORA', whatsapp: 'NAO', limite: '1 por cancelamento', area: 'LOGISTICA', gestao: 'IRREVERSIVEL' },
  { cod: 'GI04', modulo: 'assistencia', evento: 'Ato irreversível na Assistência técnica: chamado cancelado ou excluído, solicitação do cliente descartada', origem: 'SGO_Assistencia_Chamados.js', publico: 'Gestor da área (Técnica) e Diretoria, menos quem fez', email: 'HORA', whatsapp: 'NAO', limite: '1 por ato', area: 'TECNICA', gestao: 'IRREVERSIVEL' },
  { cod: 'GI05', modulo: 'conduta', evento: 'Ato irreversível no Programa de conduta: julgamento de ocorrência (mantida ou anulada)', origem: 'SGO_Conduta_Ocorrencias.js', publico: 'Diretoria, menos quem decidiu', email: 'HORA', whatsapp: 'NAO', limite: '1 por julgamento', obs: 'Sigilo: a mensagem diz só quem decidiu e que houve julgamento; o detalhe e o motivo ficam no sistema.', sensivel: true, gestao: 'IRREVERSIVEL' },
  { cod: 'GI06', modulo: 'representacao', evento: 'Ato irreversível na Representação: pedido da representada recusado', origem: 'SGO_Assistencia_Chamados.js', publico: 'Gestor da área (Técnica) e Diretoria, menos quem fez', email: 'HORA', whatsapp: 'NAO', limite: '1 por recusa', area: 'TECNICA', gestao: 'IRREVERSIVEL' },
  { cod: 'GI07', modulo: 'cadastros', evento: 'Ato irreversível nos Cadastros: cliente, unidade, equipamento ou usuário excluído', origem: 'SGO_Clientes.js; SGO_Unidades.js; SGO_Equipamentos.js; SGO_Usuarios.js', publico: 'Diretoria, menos quem fez', email: 'HORA', whatsapp: 'NAO', limite: '1 por exclusão', obs: 'A exclusão de cadastro não pede motivo: o aviso diz quem excluiu e o quê.', gestao: 'IRREVERSIVEL' }
];
/** Eventos que já existiam e passam a ser avisos da gestão (para quem é gestão; os demais destinatários seguem a regra antiga). */
var AVG_MARCAR = { S23: 'PENDENCIA', S72: 'ATRASO', S73: 'ATRASO', RP01: 'PENDENCIA', RP02: 'PENDENCIA', RP07: 'ATRASO' };

// ------------------------------------------------------------
// REGISTRO NA MATRIZ
// ------------------------------------------------------------
function AvG_registrarEventos_() {
  try {
    if (typeof MTZ_PADRAO === 'undefined' || !Array.isArray(MTZ_PADRAO)) return;
    AVG_MTZ_EVENTOS.forEach(function (ev) { if (!MTZ_PADRAO.some(function (x) { return x && x.cod === ev.cod; })) MTZ_PADRAO.push(ev); });
    MTZ_PADRAO.forEach(function (x) { if (x && AVG_MARCAR[x.cod] && !x.gestao) x.gestao = AVG_MARCAR[x.cod]; });
    if (typeof MTZ_MODULOS_NOMES !== 'undefined' && MTZ_MODULOS_NOMES) {
      if (!MTZ_MODULOS_NOMES.cadastros) MTZ_MODULOS_NOMES.cadastros = 'Cadastros';
      if (!MTZ_MODULOS_NOMES.compras) MTZ_MODULOS_NOMES.compras = 'Compras';
      if (!MTZ_MODULOS_NOMES.assistencia) MTZ_MODULOS_NOMES.assistencia = 'Assistência técnica';
      if (!MTZ_MODULOS_NOMES.representacao) MTZ_MODULOS_NOMES.representacao = 'Representação';
    }
  } catch (e) { try { console.error('Avisos da gestão (registro): ' + ((e && e.message) || e)); } catch (x) {} }
}

/** A regra em vigor do evento é aviso da gestão ligado? Devolve o tipo ('' = não). */
function AvG_tipoLigado_(regra) {
  if (!regra || !regra.gestao || regra.gestaoLigada === false || regra.decisao === 'HISTORICO') return '';
  return AVG_TIPOS[regra.gestao] ? regra.gestao : '';
}

/**
 * Grava uma vez em NTF_REGRAS a ligação dos avisos da gestão (uma linha por evento, motivo "decisão do dono 01/11/2026").
 * Merge: o canal de e-mail, o de WhatsApp, a decisão e a área em vigor vão no "depois" (nada que a gestão mudou se perde).
 */
function AvG_migrar_() {
  try {
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty('AVG_MIGRADO') === AVG_PADRAO_DONO) return 0;
    if (typeof Mtz_regras_ !== 'function' || typeof MTZ_ABAS === 'undefined') return 0;
    var regras = Mtz_regras_(), n = 0, agora = Mtz_agora_();
    Mtz_garantirAba_(MTZ_ABAS.REGRAS);
    var linhas = Object.keys(regras).filter(function (cod) { return regras[cod].gestao; }).sort().map(function (cod) {
      var r = regras[cod], base = { email: r.email, whatsapp: r.whatsapp, decisao: r.decisao, area: r.area };
      n++;
      return { CODIGO: cod, ANTES_JSON: JSON.stringify(Object.assign({}, base, { gestaoLigada: false })),
        DEPOIS_JSON: JSON.stringify(Object.assign({}, base, { gestaoLigada: true, padraoDono: AVG_PADRAO_DONO })),
        MOTIVO: AVG_MOTIVO_DONO.slice(0, 500), ALTERADO_POR_ID: 'SISTEMA', ALTERADO_POR_NOME: 'Sistema (decisão do dono)', ALTERADO_EM: agora };
    });
    if (linhas.length) SGO_DATA.insertMany(MTZ_ABAS.REGRAS, linhas);
    props.setProperty('AVG_MIGRADO', AVG_PADRAO_DONO);
    if (typeof Mtz_invalidar_ === 'function') Mtz_invalidar_();
    return n;
  } catch (e) { console.error('Avisos da gestão (registro na matriz): ' + ((e && e.message) || e)); return 0; }
}

// ------------------------------------------------------------
// UTILITÁRIOS
// ------------------------------------------------------------
function AvG_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function AvG_up_(v) { return AvG_s_(v).toUpperCase(); }
function AvG_agora_(q) { return Utilities.formatDate(q instanceof Date ? q : new Date(), AVG_FUSO, "yyyy-MM-dd'T'HH:mm:ss"); }
function AvG_iso_(v) { return typeof Mtz_iso_ === 'function' ? Mtz_iso_(v) : AvG_s_(v); }
function AvG_br_(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(AvG_s_(iso)); return m ? m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '') : ''; }
function AvG_texto_(v, max) { var s = AvG_s_(v); return max && s.length > max ? s.slice(0, max - 3).replace(/\s+$/, '') + '...' : s; }
function AvG_json_(t, padrao) { try { var v = JSON.parse(AvG_s_(t)); return v === null || v === undefined ? padrao : v; } catch (e) { return padrao; } }
function AvG_hash_(s) { return typeof Notificar_hash_ === 'function' ? Notificar_hash_(s) : String(s).length.toString(36); }
/** "aaaa-mm-ddTHH:mm:ss" menos n minutos (mesmo relógio da empresa). */
function AvG_menosMin_(quando, n) { return AvG_agora_(new Date((quando instanceof Date ? quando : new Date()).getTime() - n * 60000)); }
function AvG_maior_(a, b) { return AvG_s_(a) > AvG_s_(b) ? AvG_s_(a) : AvG_s_(b); }

function AvG_garantirAba_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('AVG_ABA_OK_V2')) return; } catch (e) { cache = null; }
  CertCal_garantirTabela_(AVG_ABA, AVG_COLUNAS);
  AVG_COLUNAS.forEach(function (c) { CertCal_garantirColuna_(AVG_ABA, c); });
  AVG_COLUNAS_TEXTO.forEach(function (c) { CertCal_forcarColunaTexto_(AVG_ABA, c); });
  try { if (cache) cache.put('AVG_ABA_OK_V2', '1', 21600); } catch (e) {}
}

function AvG_ler_() {
  try { return SGO_DATA.getAll(AVG_ABA) || []; } catch (e) { if (/Aba não encontrada/i.test(String((e && e.message) || e))) return []; throw e; }
}

/** Ids responsáveis por alguma área em Caixa de decisões > Regras e responsáveis: { id: true }. */
function AvG_responsaveisDeArea_() {
  var m = {};
  try {
    var g = typeof Ges_cfg_ === 'function' ? (Ges_cfg_().gestoresPorArea || {}) : {};
    Object.keys(g).forEach(function (a) { (g[a] || []).forEach(function (id) { m[AvG_s_(id)] = true; }); });
  } catch (e) {}
  return m;
}

/**
 * Pessoa da gestão para estes avisos, ativa: Administrador, Gestor, Diretoria e o dono; RH e Financeiro (rotina) só quando
 * são responsáveis de área. resp: AvG_responsaveisDeArea_() (opcional; lido aqui quando não vem).
 */
function AvG_ehGestao_(u, resp) {
  if (!u || !u.ativo || u.sistema) return false;
  if (u.diretoria || u.dono || u.gestao) return true;
  if (!u.rotina) return false;
  return !!(resp || AvG_responsaveisDeArea_())[AvG_s_(u.id)];
}

/** Filtro por lote (lê os responsáveis de área uma vez). */
function AvG_filtroGestao_(us) { var resp = AvG_responsaveisDeArea_(); return function (id) { return AvG_ehGestao_(us[id], resp); }; }

function AvG_usuarios_() { return typeof Mtz_usuarios_ === 'function' ? Mtz_usuarios_() : (typeof Ges_usuarios_ === 'function' ? Ges_usuarios_() : {}); }

/** 03/11/2026: pessoas que recebem o aviso deste evento pela fila da gestão sem ser da gestão: { id: true } (pedido da representada). */
function AvG_extras_(evento) {
  var m = {};
  if (AVG_REP_EVENTOS.indexOf(AvG_up_(evento)) < 0 || typeof Rep_responsaveisWhatsapp_ !== 'function') return m;
  try { (Rep_responsaveisWhatsapp_() || []).forEach(function (id) { if (AvG_s_(id)) m[AvG_s_(id)] = true; }); } catch (e) {}
  return m;
}
/** A linha sai na hora (sem o agrupamento de 30 minutos)? Atraso, irreversível e o pedido novo da representada. */
function AvG_ehUrgente_(tipo, evento) { return AVG_URGENTES.indexOf(AvG_up_(tipo)) >= 0 || AVG_NA_HORA_EVENTOS.indexOf(AvG_up_(evento)) >= 0; }
function AvG_linhaUrgente_(l) { return AvG_ehUrgente_(l.TIPO, l.EVENTO); }

/**
 * Ids da gestão que recebem o WhatsApp da gestão sem piloto (decisão 5). Entram na lista de telefones que o servidor confere
 * (SGO_waPilotoTelefones_, SGO_WhatsappPiloto.js). Vazio se nenhum evento da gestão estiver ligado. Nunca lança.
 */
function AvG_idsGestaoWhatsapp_() {
  try {
    AvG_registrarEventos_();
    var regras = typeof Mtz_regras_ === 'function' ? Mtz_regras_() : {};
    if (!Object.keys(regras).some(function (k) { return AvG_tipoLigado_(regras[k]); })) return [];
    var us = AvG_usuarios_(), ehG = AvG_filtroGestao_(us);
    // 03/11/2026: quem responde pela representação recebe RP01, RP02 e RP07 por esta fila (só se algum deles estiver ligado)
    var extras = AVG_REP_EVENTOS.some(function (k) { return regras[k] && AvG_tipoLigado_(regras[k]); }) ? AvG_extras_('RP01') : {};
    return Object.keys(us).filter(function (id) { return ehG(id) || (extras[id] && us[id] && us[id].ativo); });
  } catch (e) { return []; }
}

/** Celular mascarado para tela e registro: "final 4321" (nunca o número inteiro). */
function AvG_mascarar_(fone) { var d = AvG_s_(fone).replace(/\D/g, ''); return d.length >= 4 ? 'final ' + d.slice(-4) : ''; }

// ------------------------------------------------------------
// HORÁRIO (decisão 1)
// ------------------------------------------------------------
/** Pode receber agora? Diretoria: sempre (menos os eventos só de expediente, 03/11/2026). Gestor: só no expediente. */
function AvG_podeAgora_(u, quando, evento) {
  if (u && u.diretoria && AVG_SO_EXPEDIENTE_EVENTOS.indexOf(AvG_up_(evento)) < 0) return true;
  if (typeof SGO_dentroDoExpediente_ !== 'function') return true;
  return !!SGO_dentroDoExpediente_(quando || new Date()).dentro;
}

/** Abertura do próximo expediente (hoje, se ainda não começou; senão o próximo dia útil), "aaaa-mm-ddTHH:mm:00". */
function AvG_proximoExpediente_(quando) {
  if (typeof SGO_expediente_ !== 'function' || typeof SGO_expedientePartes_ !== 'function' || typeof SGO_expedienteMotivoDia_ !== 'function') return AvG_agora_(quando);
  var cfg = SGO_expediente_(), p = SGO_expedientePartes_(quando || new Date());
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.dia);
  for (var i = 0; i < 30; i++) {
    var t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) + i * 864e5);
    var dia = t.getUTCFullYear() + '-' + ('0' + (t.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + t.getUTCDate()).slice(-2);
    if (SGO_expedienteMotivoDia_(dia, t.getUTCDay(), cfg)) continue;
    if (i === 0 && p.hora >= cfg.ini) continue;
    return dia + 'T' + cfg.ini + ':00';
  }
  return AvG_agora_(quando);
}

/** Quando o aviso desta pessoa pode sair: agora (Diretoria, ou gestor no expediente) ou a abertura do próximo expediente. */
function AvG_liberarEm_(u, quando, evento) {
  return AvG_podeAgora_(u, quando, evento) ? AvG_agora_(quando) : AvG_proximoExpediente_(quando);
}

// ------------------------------------------------------------
// LINKS (decisão 3)
// ------------------------------------------------------------
/** Endereço que abre o item exato depois do login: <SGO+>?aviso=<código>. */
function AvG_link_(avisoId) {
  var base = typeof Notificar_linkSgo_ === 'function' ? Notificar_linkSgo_() : '';
  if (!base || !avisoId) return base;
  return base + (base.indexOf('?') >= 0 ? '&' : '?') + 'aviso=' + encodeURIComponent(avisoId);
}

function AvG_linkCaixa_() { return typeof Ges_linkTela_ === 'function' ? Ges_linkTela_('gestao_decisoes') : (typeof Notificar_linkSgo_ === 'function' ? Notificar_linkSgo_() : ''); }

/** Ação da tela (a mesma do Início: Inicio_executarAcao_) a partir do endereço do módulo (?tela=...); sem tela, a Caixa de decisões. */
function AvG_telaDoLink_(link) {
  var m = /[?&]tela=([a-z_]{3,40})/.exec(AvG_s_(link));
  return { tipo: 'modulo', mod: m ? m[1] : 'gestao_decisoes' };
}

/** Só os tipos de ação que o Início sabe abrir; campos curtos (o link nunca leva endereço externo). */
var AVG_TELA_TIPOS = ['modulo', 'atalho', 'tela', 'atividade', 'compras', 'assistencia', 'comercial', 'frota_reservas', 'conduta_ciencia', 'qualidade_ciencia', 'cliente', 'equipamento', 'documento', 'certificado', 'representacao'];
function AvG_telaSegura_(t) {
  if (!t || typeof t !== 'object' || AVG_TELA_TIPOS.indexOf(AvG_s_(t.tipo)) < 0) return { tipo: 'modulo', mod: 'gestao_decisoes' };
  var out = {};
  Object.keys(t).forEach(function (k) { if (/^[a-zA-Z]{1,20}$/.test(k) && (typeof t[k] === 'string' || typeof t[k] === 'number')) out[k] = AvG_texto_(t[k], 120); });
  return out;
}

// ------------------------------------------------------------
// FILA (uma linha por evento + item + pessoa)
// ------------------------------------------------------------
function AvG_linhaCurta_(tipo, moduloNome, titulo) {
  var rot = tipo === 'PENDENCIA' ? '' : (tipo === 'ATRASO' ? 'Atraso' : 'Irreversível');
  return AvG_texto_((rot ? rot + ' · ' : '') + (moduloNome ? moduloNome + ': ' : '') + AvG_s_(titulo).replace(/\s+/g, ' '), 150);
}

/**
 * Põe um aviso na fila. x: { evento, tipo, modulo, u, titulo, texto, tela, refId, resolvePor, prazo, origem, sensivel, quando }.
 * Idempotente pela CHAVE (evento|item|pessoa). Devolve { novo, linha, motivo }.
 */
function AvG_enfileirar_(x, existentes) {
  var u = x.u, quando = x.quando || new Date();
  var ref = AvG_s_(x.refId) || ('H' + AvG_hash_(AvG_s_(x.titulo) + '|' + AvG_s_(x.texto)));
  // revisão 01/11/2026: o marco (entrada do item na Caixa, ou o tipo e o título do aviso) entra na chave: um novo marco do mesmo
  // item avisa de novo (RP07 "em risco" e depois "vencido"; segundo pedido de nova data na mesma atividade)
  var marco = AvG_s_(x.marco) || ('T' + AvG_hash_(AvG_up_(x.tipo) + '|' + AvG_s_(x.titulo)));
  var chave = (AvG_up_(x.evento) + '|' + ref.slice(0, 150) + '|' + marco.slice(0, 40) + '|' + u.id).slice(0, 240);
  var lista = existentes || AvG_ler_();
  var ja = lista.filter(function (l) { return AvG_s_(l.CHAVE) === chave; })[0];
  if (ja) return { novo: false, linha: ja, motivo: 'Aviso da gestão já registrado para esta pessoa (' + AVG_TIPOS[ja.TIPO] + ', ' + AVG_SITUACOES[AvG_up_(ja.SITUACAO)] + '); não foi repetido.' };
  var cache = null, ck = 'AVG_K_' + AvG_hash_(chave);
  try { cache = CacheService.getScriptCache(); if (cache.get(ck)) return { novo: false, linha: null, motivo: 'Aviso da gestão já registrado há pouco para esta pessoa; não foi repetido.' }; } catch (e) { cache = null; }
  var nomeMod = (typeof MTZ_MODULOS_NOMES !== 'undefined' && MTZ_MODULOS_NOMES[x.modulo]) || '';
  var titulo = AvG_texto_(x.titulo || 'Aviso da gestão', 180), texto = AvG_texto_(x.texto, 3000);
  if (x.sensivel) {
    titulo = AvG_texto_(x.tituloSigiloExato ? x.tituloSigilo : (nomeMod || 'Programa de conduta') + ': ' + (x.tituloSigilo || 'item que depende da gestão (detalhe só no sistema)'), 180);
    texto = AvG_texto_(x.textoSigilo || 'O detalhe fica só no sistema, por sigilo. Abra o item no SGO+ pelo link.', 600);
  }
  var agora = AvG_agora_(quando);
  var linha = {
    AVISO_ID: ('AG' + AvG_hash_(chave + '|' + agora) + AvG_hash_(ref)).slice(0, 24), CHAVE: chave, USUARIO_ID: u.id, USUARIO_NOME: u.nome || '', DIRETORIA: u.diretoria ? 'SIM' : '',
    EVENTO: AvG_up_(x.evento), TIPO: x.tipo, MODULO: AvG_s_(x.modulo), TITULO: titulo, TEXTO: texto, LINHA: AvG_linhaCurta_(x.tipo, nomeMod, titulo),
    TELA_JSON: JSON.stringify(AvG_telaSegura_(x.tela)), REF_ID: ref.slice(0, 120), RESOLVE_POR: AvG_s_(x.resolvePor).slice(0, 400), PRAZO: AvG_s_(x.prazo).slice(0, 19),
    QUANDO: agora, LIBERAR_EM: AvG_liberarEm_(u, quando, x.evento), SITUACAO: 'NA_FILA', TENTATIVAS: 0, ENVIADO_EM: '', MENSAGEM_ID: '', EMAIL_SITUACAO: '', EMAIL_MOTIVO: '',
    WA_SITUACAO: '', WA_MOTIVO: '', WA_ID: '', ENTREGUE_EM: '', LIDO_EM: '', ABERTO_EM: '', RESOLVIDO_EM: '', RESOLUCAO: '', ORIGEM: AvG_s_(x.origem).slice(0, 40)
  };
  AvG_garantirAba_();
  var gravada = SGO_DATA.insert(AVG_ABA, linha) || linha;
  if (existentes) existentes.push(gravada);
  try { if (cache) cache.put(ck, '1', 21600); } catch (e) {}
  var espera = linha.LIBERAR_EM > agora ? ' Fora do expediente: sai em ' + AvG_br_(linha.LIBERAR_EM) + '.' : '';
  return { novo: true, linha: gravada, motivo: 'Aviso da gestão (' + AVG_TIPOS[x.tipo] + '): vai por WhatsApp e e-mail' + (AvG_ehUrgente_(x.tipo, x.evento) ? ' na hora.' : ', agrupado em até 30 minutos.') + espera };
}

/**
 * Chamado por SGO_avisoMatrizPreparar_ (SGO_Avisos_Matriz.js) quando o evento é aviso da gestão ligado. Põe na fila os
 * destinatários da gestão e devolve { ids: { uid: motivo }, urgentes: [uid] } (null = ninguém da gestão). Os demais
 * destinatários seguem a regra antiga da matriz (teto, resumo do dia).
 */
function AvG_preparar_(o, internos, regra, evento) {
  var tipo = AvG_tipoLigado_(regra);
  if (!tipo || AVG_MODULOS_FORA.indexOf(regra.modulo) >= 0) return null;
  var us = AvG_usuarios_(), ehG = AvG_filtroGestao_(us), extras = AvG_extras_(evento);
  // 03/11/2026: quem responde pela representação entra aqui mesmo sem ser da gestão (RP01, RP02, RP07)
  var ids = (internos || []).filter(function (id) { return ehG(id) || (extras[id] && us[id] && us[id].ativo); });
  if (!ids.length) return null;
  var tela = o.tela && typeof o.tela === 'object' ? o.tela : AvG_telaDoLink_(o.link);
  var lista = AvG_ler_(), saida = { ids: {}, urgentes: [] };
  ids.forEach(function (uid) {
    var r = AvG_enfileirar_({ evento: evento, tipo: tipo, modulo: regra.modulo, u: us[uid], titulo: o.titulo, texto: o.texto, tela: tela, refId: o.refId,
      resolvePor: o.resolvePor, prazo: o.prazoGestao, origem: o.origem, sensivel: !!regra.sensivel }, lista);
    // revisão 01/11/2026: chave repetida (já avisado) não tira a pessoa do e-mail comum do notificador
    if (!r.novo) return;
    saida.ids[uid] = r.motivo;
    if (AvG_ehUrgente_(tipo, evento)) saida.urgentes.push(uid);
  });
  return Object.keys(saida.ids).length ? saida : null;
}

// ------------------------------------------------------------
// ENVIO (e-mail sempre; WhatsApp pelo modelo sgo_gestao_acao)
// ------------------------------------------------------------
/** Situação do modelo na Meta ('' = não cadastrado ou não lido ainda). */
function AvG_situacaoModelo_() {
  try { return typeof SGO_waModeloSituacao_ === 'function' ? AvG_up_(SGO_waModeloSituacao_(AVG_MODELO)) : ''; } catch (e) { return ''; }
}

/** Lista do WhatsApp numa linha só (a Meta não aceita quebra de linha na variável), com "e mais N" quando não cabe. */
function AvG_listaWhats_(linhas) {
  var partes = [], usado = 0;
  for (var i = 0; i < linhas.length; i++) {
    var p = (i + 1) + ') ' + AvG_s_(linhas[i].LINHA) + ': ' + (AvG_link_(linhas[i].AVISO_ID) || 'abra o SGO+');
    var resto = linhas.length - i - 1, reserva = resto ? 60 : 0;
    if (usado + p.length + 3 + reserva > AVG_WA_MAX_LISTA && partes.length) { partes.push('e mais ' + (linhas.length - i) + ': abra a Caixa de decisões'); return partes.join(' | '); }
    partes.push(p); usado += p.length + 3;
  }
  return partes.join(' | ');
}

/** Texto do e-mail de um lote: um item = o texto do próprio aviso; vários = a lista com um link por item (nada cortado). */
function AvG_montarEmail_(linhas) {
  if (linhas.length === 1) {
    var l = linhas[0];
    return { titulo: AvG_s_(l.TITULO), link: AvG_link_(l.AVISO_ID), rotulo: 'Abrir o item no SGO+',
      texto: AvG_s_(l.TEXTO) + '\n\n' + (l.TIPO === 'IRREVERSIVEL' ? 'Ato irreversível: aviso para a gestão e a Diretoria saberem na hora. Não exige ação.' : 'O botão abaixo abre o item direto no SGO+, com login. A decisão é tomada no sistema.') };
  }
  var urg = linhas.filter(function (l) { return AVG_URGENTES.indexOf(l.TIPO) >= 0; }).length;
  var corpo = linhas.map(function (l, i) {
    return (i + 1) + '. [' + AVG_TIPOS[l.TIPO] + '] ' + AvG_s_(l.TITULO) + '\n   ' + AvG_texto_(l.TEXTO, 500).replace(/\n+/g, '\n   ') + '\n   Abrir: ' + (AvG_link_(l.AVISO_ID) || 'abra o SGO+');
  }).join('\n\n');
  return { titulo: 'SGO+: ' + linhas.length + ' avisos da gestão' + (urg ? ' (' + urg + ' de atraso ou ato irreversível)' : ''), link: AvG_linkCaixa_(), rotulo: 'Abrir a Caixa de decisões',
    texto: 'Itens que pedem a sua ação ou atenção no SGO+. Cada link abre o item direto no sistema, com login; a decisão é sempre tomada no SGO+.\n\n' + corpo };
}

/**
 * Envia um lote a uma pessoa (uma mensagem por canal) e atualiza cada linha. Nunca lança. Devolve { email, whatsapp }.
 */
function AvG_enviarPessoa_(u, linhas, quando) {
  var agora = AvG_agora_(quando);
  var msgId = ('GM-' + AvG_hash_(u.id + '|' + linhas.map(function (l) { return l.ID; }).join(',') + '|' + agora)).slice(0, 40);
  var m = AvG_montarEmail_(linhas), evento = AvG_s_(linhas[0].EVENTO);
  var em = { situacao: 'FALHOU', motivo: '' }, wa = { situacao: '', motivo: '', id: '' };
  // E-MAIL (sempre)
  try {
    var r = SGO_notificar_({ usuarios: [u.id], canais: ['email'], origem: 'AVISOS_GESTAO', evento: evento, refId: msgId, titulo: m.titulo, texto: m.texto, link: m.link || undefined, rotuloLink: m.rotulo }) || {};
    if (r.ok) em = { situacao: 'ENVIADO', motivo: 'Entregue ao serviço de e-mail.' };
    else em = { situacao: /Sem e-mail no cadastro/i.test(String(r.motivo || '')) ? 'SEM_EMAIL' : 'FALHOU', motivo: AvG_texto_(r.motivo || 'O e-mail não saiu.', 300) };
  } catch (e) { em = { situacao: 'FALHOU', motivo: AvG_texto_((e && e.message) || e, 300) }; }
  // WHATSAPP (modelo da gestão; sem modelo aprovado, fica no e-mail com a marca "aguardando modelo")
  try {
    var c = typeof Notificar_contatos_ === 'function' ? Notificar_contatos_([u.id])[u.id] : null;
    var prov = typeof Notificar_provedorWhatsapp_ === 'function' ? Notificar_provedorWhatsapp_() : { provedor: '' };
    var st = AvG_situacaoModelo_(), teto = AvG_tetoRep_(u.id, linhas, quando);
    if (teto) wa = { situacao: 'TETO', motivo: teto };
    else if (!c || !c.telefone) wa = { situacao: 'SEM_NUMERO', motivo: 'Sem celular válido no cadastro (Administração > Usuários > Celular): o aviso foi só por e-mail.' };
    else if (!prov.provedor) wa = { situacao: 'FALHOU', motivo: AvG_texto_(prov.motivo || 'WhatsApp não configurado.', 300) + ' O aviso foi por e-mail.' };
    else if (prov.provedor === 'meta' && st !== 'APPROVED') wa = { situacao: 'AGUARDANDO_MODELO', motivo: 'WhatsApp aguardando modelo: o modelo ' + AVG_MODELO + ' ainda não está aprovado na Meta (situação: ' + (st || 'não cadastrado') + '). O aviso foi por e-mail; cadastre em Chaves e senhas > Cadastrar modelos na Meta.' };
    else {
      var qtd = linhas.length === 1 ? '1 aviso da gestão' : linhas.length + ' avisos da gestão';
      var rw = SGO_notificar_({ usuarios: [u.id], canais: ['whatsapp'], origem: 'AVISOS_GESTAO', evento: evento, refId: msgId, titulo: m.titulo, texto: m.texto, link: m.link || undefined,
        modeloSemReserva: true, modelo: { nome: AVG_MODELO, parametros: ['@NOME', qtd, AvG_listaWhats_(linhas), linhas.length === 1 ? (AvG_link_(linhas[0].AVISO_ID) || '@LINK') : (AvG_linkCaixa_() || '@LINK')] } }) || {};
      if (rw.ok) wa = { situacao: 'ENVIADO', motivo: 'Aceito pelo provedor do WhatsApp (celular ' + AvG_mascarar_(c.telefone) + ').', id: rw.ids && rw.ids[u.id] ? String(rw.ids[u.id]) : '' };
      else wa = { situacao: 'FALHOU', motivo: AvG_texto_(String(rw.motivo || 'O WhatsApp não saiu.').replace(/\d{8,}/g, '***'), 300) + ' O aviso foi por e-mail.' };
    }
  } catch (e) { wa = { situacao: 'FALHOU', motivo: AvG_texto_(String((e && e.message) || e).replace(/\d{8,}/g, '***'), 300) }; }
  var chegou = em.situacao === 'ENVIADO' || wa.situacao === 'ENVIADO';
  linhas.forEach(function (l) {
    var tent = (Number(l.TENTATIVAS) || 0) + 1;
    var campos = { TENTATIVAS: tent, ENVIADO_EM: chegou ? agora : AvG_s_(l.ENVIADO_EM), MENSAGEM_ID: msgId, EMAIL_SITUACAO: em.situacao, EMAIL_MOTIVO: em.motivo, WA_SITUACAO: wa.situacao, WA_MOTIVO: wa.motivo, WA_ID: wa.id };
    if (chegou) {
      campos.SITUACAO = l.TIPO === 'IRREVERSIVEL' ? 'RESOLVIDO' : 'ENVIADO';
      if (l.TIPO === 'IRREVERSIVEL') { campos.RESOLVIDO_EM = agora; campos.RESOLUCAO = 'Ato irreversível: aviso de informação, não exige ação.'; }
    } else campos.SITUACAO = 'FALHOU';
    SGO_DATA.update(AVG_ABA, l.ID, campos);
    Object.assign(l, campos);
  });
  return { email: em, whatsapp: wa };
}

/**
 * 03/11/2026: teto diário do WhatsApp do pedido da representada (lote só com RP01, RP02 ou RP07). Conta as mensagens de hoje
 * desses eventos que saíram pelo WhatsApp para a pessoa. Devolve o motivo ('' = pode).
 */
function AvG_tetoRep_(uid, linhas, quando) {
  if (!linhas.length || !linhas.every(function (l) { return AVG_REP_EVENTOS.indexOf(AvG_up_(l.EVENTO)) >= 0; })) return '';
  var hoje = AvG_agora_(quando).slice(0, 10), msgs = {};
  AvG_ler_().forEach(function (l) {
    if (AvG_s_(l.USUARIO_ID) !== AvG_s_(uid) || AVG_REP_EVENTOS.indexOf(AvG_up_(l.EVENTO)) < 0) return;
    if (['ENVIADO', 'ENTREGUE', 'LIDO'].indexOf(AvG_up_(l.WA_SITUACAO)) < 0 || AvG_s_(l.ENVIADO_EM).slice(0, 10) !== hoje) return;
    msgs[AvG_s_(l.MENSAGEM_ID) || AvG_s_(l.ID)] = true;
  });
  var n = Object.keys(msgs).length;
  return n >= AVG_REP_TETO_DIA ? 'Teto do dia: esta pessoa já recebeu hoje ' + n + ' WhatsApp de pedidos da representada (limite de ' + AVG_REP_TETO_DIA + ' por dia). O aviso foi por e-mail e está no sistema (aviso na tela e em Avisos).' : '';
}

/** A linha está pronta para sair agora? (liberada pelo horário; falha passageira ainda com tentativa; ENVIANDO abandonado) */
function AvG_pronta_(l, agora, velho) {
  var s = AvG_up_(l.SITUACAO);
  if (s === 'ENVIANDO') return !!velho && AvG_s_(l.ENVIANDO_EM) < velho;
  if (s === 'NA_FILA') return AvG_s_(l.LIBERAR_EM) <= agora;
  if (s === 'FALHOU') return AvG_up_(l.EMAIL_SITUACAO) === 'FALHOU' && (Number(l.TENTATIVAS) || 0) < AVG_MAX_TENTATIVAS && AvG_s_(l.LIBERAR_EM) <= agora;
  return false;
}

/**
 * Envia o que está pronto. soUrgentes: só atraso e irreversível (envio na hora, chamado logo depois de enfileirar).
 * Pendência: sai quando a mais antiga pronta completa 30 minutos (vai junto com as urgentes da mesma pessoa).
 * uids: limita às pessoas (opcional). Devolve { mensagens, itens }.
 */
function AvG_enviarProntos_(quando, soUrgentes, uids) {
  quando = quando || new Date();
  var agora = AvG_agora_(quando), limite = AvG_menosMin_(quando, AVG_AGRUPAR_MIN);
  var velho = AvG_menosMin_(quando, AVG_ENVIANDO_MAX_MIN);
  var us = AvG_usuarios_(), ehG = AvG_filtroGestao_(us), res = { mensagens: 0, itens: 0 }, lotes = [], extras = AvG_extras_('RP01');
  // revisão 01/11/2026: escolher e marcar ENVIANDO sob trava (a rodada de 15 minutos e o envio na hora não mandam a mesma linha
  // duas vezes); os envios (e-mail e Meta) ficam fora da trava
  var lock = null;
  try { lock = LockService.getScriptLock(); if (!lock.tryLock(10000)) return { ocupado: 'outro envio dos avisos da gestão em andamento; esta linha sai na próxima rodada' }; } catch (e) { lock = null; }
  try {
    var porPessoa = {};
    AvG_ler_().forEach(function (l) {
      var uid = AvG_s_(l.USUARIO_ID);
      if (uids && uids.indexOf(uid) < 0) return;
      if (!AvG_pronta_(l, agora, velho)) return;
      (porPessoa[uid] = porPessoa[uid] || []).push(l);
    });
    Object.keys(porPessoa).forEach(function (uid) {
      var u = us[uid], todas = porPessoa[uid], gestao = ehG(uid);
      // 03/11/2026: quem responde pela representação sem ser da gestão: as linhas do pedido da representada seguem esta fila;
      // as demais (de quando a pessoa era da gestão) vão pela regra comum
      var ext = !gestao && extras[uid] && u && u.ativo;
      var grupos = gestao ? [[todas, false]] : ext ? [[todas.filter(function (l) { return AVG_REP_EVENTOS.indexOf(AvG_up_(l.EVENTO)) >= 0; }), false], [todas.filter(function (l) { return AVG_REP_EVENTOS.indexOf(AvG_up_(l.EVENTO)) < 0; }), true]] : [[todas, true]];
      grupos.forEach(function (g) {
        var lista = g[0], comum = g[1];
        // pedido da representada: só no expediente também para a Diretoria (a linha que ficou para trás não sai à noite)
        if (!comum) lista = lista.filter(function (l) { return AVG_SO_EXPEDIENTE_EVENTOS.indexOf(AvG_up_(l.EVENTO)) < 0 || AvG_podeAgora_(u, quando, l.EVENTO); });
        if (!lista.length) return;
        if (!comum && !AvG_podeAgora_(u, quando)) return;
        var urg = lista.filter(AvG_linhaUrgente_);
        var norm = soUrgentes ? [] : lista.filter(function (l) { return !AvG_linhaUrgente_(l); });
        var maisAntiga = norm.reduce(function (a, l) { return !a || AvG_s_(l.QUANDO) < a ? AvG_s_(l.QUANDO) : a; }, '');
        var enviar = comum ? lista : urg.concat(norm.length && maisAntiga <= limite ? norm : []);
        if (!enviar.length) return;
        enviar.sort(function (a, b) { return AvG_linhaUrgente_(b) - AvG_linhaUrgente_(a) || AvG_s_(a.QUANDO).localeCompare(AvG_s_(b.QUANDO)); });
        enviar.forEach(function (l) { SGO_DATA.update(AVG_ABA, l.ID, { SITUACAO: 'ENVIANDO', ENVIANDO_EM: agora }); l.SITUACAO = 'ENVIANDO'; });
        lotes.push({ u: u, uid: uid, linhas: enviar, comum: comum });
      });
    });
  } finally { try { if (lock) lock.releaseLock(); } catch (e) {} }
  lotes.forEach(function (x) {
    if (x.comum) AvG_enviarComum_(x.uid, x.u, x.linhas, quando);
    else AvG_enviarPessoa_(x.u, x.linhas, quando);
    res.mensagens++; res.itens += x.linhas.length;
  });
  return res;
}

/**
 * Linha de quem deixou de ser da gestão depois de entrar na fila: segue a regra comum do notificador (e-mail conforme a matriz;
 * sem o WhatsApp da gestão). Inativo não recebe: a linha fica FALHOU com o motivo e aparece na conferência. Nunca lança.
 */
function AvG_enviarComum_(uid, u, linhas, quando) {
  var agora = AvG_agora_(quando);
  linhas.forEach(function (l) {
    var campos = { TENTATIVAS: (Number(l.TENTATIVAS) || 0) + 1, WA_SITUACAO: 'FORA_DA_GESTAO', WA_MOTIVO: 'A pessoa não é da gestão agora: sem o WhatsApp da gestão; vale a regra comum da matriz.' };
    if (!u || !u.ativo) {
      campos.SITUACAO = 'FALHOU'; campos.EMAIL_SITUACAO = 'SEM_EMAIL'; campos.EMAIL_MOTIVO = 'Pessoa inativa ou fora do cadastro: não recebeu. O item continua no sistema para quem responde por ele agora.';
    } else {
      var r = {};
      try { r = SGO_notificar_({ usuarios: [uid], canais: ['sgo', 'email'], evento: AvG_s_(l.EVENTO), origem: 'AVISOS_GESTAO_COMUM', refId: ('COMUM-' + AvG_s_(l.AVISO_ID)).slice(0, 80), titulo: AvG_s_(l.TITULO), texto: AvG_s_(l.TEXTO), link: AvG_link_(l.AVISO_ID) || undefined }) || {}; }
      catch (e) { r = { motivo: String((e && e.message) || e) }; }
      var ok = !!r.ok;
      // revisão: pela regra comum da matriz o evento pode ser "só no sistema" (sem e-mail); não é falha, o item segue no sistema
      if (!ok && /fica só no sistema/.test(AvG_s_(r.motivo))) {
        campos.SITUACAO = 'RESOLVIDO'; campos.EMAIL_SITUACAO = 'NAO_SE_APLICA'; campos.EMAIL_MOTIVO = AvG_texto_(r.motivo, 300);
        campos.RESOLVIDO_EM = agora; campos.RESOLUCAO = 'Fora da gestão: pela matriz este aviso fica só no sistema.';
        SGO_DATA.update(AVG_ABA, l.ID, campos); return;
      }
      campos.SITUACAO = ok ? (l.TIPO === 'IRREVERSIVEL' ? 'RESOLVIDO' : 'ENVIADO') : 'FALHOU';
      campos.EMAIL_SITUACAO = ok ? 'ENVIADO' : 'FALHOU'; campos.EMAIL_MOTIVO = ok ? (r.guardados ? AvG_texto_(r.motivo, 300) : 'Entregue pela regra comum da matriz.') : AvG_texto_(r.motivo || 'O e-mail não saiu.', 300);
      if (ok) { campos.ENVIADO_EM = agora; if (l.TIPO === 'IRREVERSIVEL') { campos.RESOLVIDO_EM = agora; campos.RESOLUCAO = 'Ato irreversível: aviso de informação, não exige ação.'; } }
    }
    SGO_DATA.update(AVG_ABA, l.ID, campos);
  });
}

/** Envio na hora das urgentes destas pessoas (chamado por SGO_notificar_ e pelo irreversível). Nunca lança. */
function AvG_enviarUrgentes_(uids, quando) {
  try { return AvG_enviarProntos_(quando || new Date(), true, uids); } catch (e) { console.error('Avisos da gestão (envio na hora): ' + ((e && e.message) || e)); return { erro: String((e && e.message) || e) }; }
}

// ------------------------------------------------------------
// IRREVERSÍVEL (decisão 4), chamado pelos módulos
// ------------------------------------------------------------
/**
 * Avisa na hora o gestor da área e a Diretoria de um ato irreversível. Nunca lança (a ação principal não cai por causa do aviso).
 * o: { evento ('GI01'...), modulo, area (opcional), quem: { id, nome }, oque, item, motivo, tela, refId, soDiretoria, sensivel }.
 * Devolve { avisados } ou { fora }.
 */
function SGO_avisoGestaoIrreversivel_(o) {
  try {
    o = o || {};
    if (typeof SGO_avisoRegra_ !== 'function') return { fora: 'matriz de avisos indisponível' };
    var evento = AvG_up_(o.evento), regra = SGO_avisoRegra_(evento);
    if (!regra || regra.decisao === 'HISTORICO') return { fora: 'evento ' + evento + ' desligado (vira histórico) na matriz de avisos' };
    var quem = o.quem || {}, quemId = AvG_s_(quem.id || quem.userId), quemNome = AvG_s_(quem.nome || quem.usuario) || 'alguém da equipe';
    var us = AvG_usuarios_(), dest = [];
    var add = function (id) { id = AvG_s_(id); if (id && id !== quemId && us[id] && us[id].ativo && !us[id].sistema && dest.indexOf(id) < 0) dest.push(id); };
    if (!o.soDiretoria && !regra.sensivel && typeof SGO_avisoGestoresDe_ === 'function') SGO_avisoGestoresDe_(o.modulo || regra.modulo, { area: o.area || regra.area, responsavelId: o.responsavelId, excluir: quemId ? [quemId] : [] }).forEach(add);
    var dir = typeof Ges_diretoria_ === 'function' ? Ges_diretoria_(us, quemId ? [quemId] : []) : Object.keys(us).filter(function (id) { return us[id].diretoria; });
    dir.forEach(add);
    if (!dest.length) return { fora: 'ninguém da gestão para avisar (quem fez é o único gestor e Diretoria)' };
    var sigilo = !!(regra.sensivel || o.sensivel);
    var item = AvG_texto_(o.item, 200), oque = sigilo ? AVG_SIGILO_TITULO : AvG_texto_(o.oque, 200), motivo = AvG_texto_(o.motivo, 800);
    var titulo = sigilo ? AVG_SIGILO_TITULO : AvG_texto_(oque + (item ? ': ' + item : ''), 180);
    var textoSigilo = 'Quem registrou: ' + quemNome + '. O resultado, o detalhe e o motivo ficam só no sistema, por sigilo. Abra no SGO+ pelo link.';
    var texto = 'Quem fez: ' + quemNome + '.\nO quê: ' + oque + '.\nItem: ' + (item || 'veja no sistema') + '.\nMotivo: ' + (motivo || 'não informado (a ação não pede motivo; veja o histórico do registro)') +
      '\nQuando: ' + AvG_br_(AvG_agora_()) + '.';
    var tipo = AvG_tipoLigado_(regra), ehG = AvG_filtroGestao_(us);
    // revisão 01/11/2026: só quem é da gestão vai para a fila da gestão; os demais (responsável de área que não é gestão, por
    // exemplo) recebem pela regra comum do notificador, nunca ficam sem aviso
    var daGestao = tipo ? dest.filter(ehG) : [], comuns = dest.filter(function (id) { return daGestao.indexOf(id) < 0; });
    var r0 = { avisados: 0, gestao: !!daGestao.length, comuns: comuns.length };
    if (comuns.length) {
      SGO_notificar_({ usuarios: comuns, canais: ['sgo', 'email'], evento: evento, origem: 'IRREVERSIVEL', refId: AvG_s_(o.refId).slice(0, 80), titulo: titulo, texto: sigilo ? textoSigilo : texto, link: AvG_linkCaixa_() || undefined });
      r0.avisados += comuns.length;
    }
    if (!daGestao.length) return r0;
    var lista = AvG_ler_(), novos = [];
    daGestao.forEach(function (uid) {
      var r = AvG_enfileirar_({ evento: evento, tipo: 'IRREVERSIVEL', modulo: o.modulo || regra.modulo, u: us[uid], titulo: titulo, texto: texto, tela: o.tela, refId: o.refId,
        origem: 'IRREVERSIVEL', sensivel: sigilo, tituloSigilo: AVG_SIGILO_TITULO, tituloSigiloExato: true, textoSigilo: textoSigilo }, lista);
      if (r.novo) novos.push(uid);
    });
    if (novos.length) AvG_enviarUrgentes_(novos);
    r0.avisados += novos.length;
    return r0;
  } catch (e) {
    console.error('Avisos da gestão (irreversível): ' + ((e && e.message) || e));
    return { erro: String((e && e.message) || e).slice(0, 200) };
  }
}

/** Cadastro antes da exclusão (para o aviso dizer o quê). Nunca lança. */
function SGO_avisoGestaoAntes_(aba, id) {
  try { return SGO_DATA.getById(aba, id); } catch (e) { return null; }
}

/** Exclusão de cadastro (GI07): quem excluiu e o quê. tipo: 'cliente' | 'unidade' | 'equipamento' | 'usuário'. Nunca lança. */
function SGO_avisoGestaoExclusao_(sessionId, tipo, antes) {
  try {
    if (!antes) return null;
    var s = exigirSessao(sessionId);
    var nome = AvG_s_(antes.NOME || antes.RAZAO_SOCIAL || antes.NOME_FANTASIA || antes.TAG || antes.DESCRICAO || antes.USUARIO) || ('registro ' + AvG_s_(antes.ID));
    var doc = AvG_s_(antes.CNPJ || antes.NUMERO_SERIE || antes.SERIE || '');
    return SGO_avisoGestaoIrreversivel_({ evento: 'GI07', modulo: 'cadastros', quem: { id: s.userId, nome: s.nome || s.usuario }, oque: 'Cadastro de ' + tipo + ' excluído',
      item: nome + (doc ? ' (' + doc + ')' : ''), motivo: '', soDiretoria: true, tela: { tipo: 'modulo', mod: tipo === 'usuário' ? 'usuarios' : tipo === 'unidade' ? 'unidades' : tipo === 'equipamento' ? 'equipamentos' : 'clientes' },
      refId: 'EXC-' + tipo + '-' + AvG_s_(antes.ID) });
  } catch (e) { return null; }
}

// ------------------------------------------------------------
// CAIXA DE DECISÕES: GS01 (nova), GS02 (prazo vencido) e GS03 (escalada à Diretoria)
// ------------------------------------------------------------
function AvG_implantadoEm_(quando) {
  var props = PropertiesService.getScriptProperties(), v = AvG_s_(props.getProperty('AVG_IMPLANTADO_EM'));
  if (v) return v;
  v = AvG_agora_(quando).slice(0, 16);
  props.setProperty('AVG_IMPLANTADO_EM', v);
  return v;
}

/** Avisos da Caixa de decisões. Só itens que entraram (ou escalaram) depois da implantação: nada de enxurrada do que já existia. */
function AvG_gerarDaCaixa_(quando) {
  if (typeof GES_ABA_DECISOES === 'undefined' || typeof Ges_ler_ !== 'function' || typeof SGO_avisoRegra_ !== 'function') return { fora: 'Caixa de decisões indisponível' };
  var implantado = AvG_implantadoEm_(quando);
  var t1 = AvG_tipoLigado_(SGO_avisoRegra_('GS01')), t2 = AvG_tipoLigado_(SGO_avisoRegra_('GS02')), t3 = AvG_tipoLigado_(SGO_avisoRegra_('GS03'));
  if (!t1 && !t2 && !t3) return { fora: 'GS01, GS02 e GS03 desligados na matriz de avisos' };
  var us = AvG_usuarios_(), lista = AvG_ler_(), hoje = AvG_agora_(quando).slice(0, 10), r = { novos: 0, atrasos: 0, escaladas: 0 };
  var sens = typeof MTZ_MODULOS_SENSIVEIS !== 'undefined' ? MTZ_MODULOS_SENSIVEIS : ['conduta', 'qualidade', 'ponto'], ehG = AvG_filtroGestao_(us);
  var iso = function (v) { return typeof Ges_iso_ === 'function' ? Ges_iso_(v) : AvG_iso_(v).slice(0, 16); };
  Ges_ler_(GES_ABA_DECISOES).forEach(function (d) {
    if (AvG_up_(d.SITUACAO) !== 'ABERTA' || AvG_up_(d.ACOMPANHAMENTO) === 'SIM') return;
    var modulo = AvG_s_(d.MODULO), tipoItem = AvG_s_(d.TIPO).toLowerCase(), itemId = AvG_s_(d.ITEM_ID);
    if (AVG_MODULOS_FORA.indexOf(modulo) >= 0 || AVG_CAIXA_FORA.indexOf(tipoItem) >= 0 || !itemId) return;
    var tela = AvG_json_(d.TELA_JSON, null) || { tipo: 'modulo', mod: 'gestao_decisoes' };
    var sigilo = sens.indexOf(modulo) >= 0 || !!(tela && tela.sigilo);
    var prazoDia = (typeof Ges_dia_ === 'function' ? Ges_dia_(d.PRAZO_DECISAO) : AvG_s_(d.PRAZO_DECISAO).slice(0, 10));
    var aprov = AVG_APROVACOES.indexOf(tipoItem) >= 0;
    var nomeMod = (typeof PEND_MODULOS !== 'undefined' && PEND_MODULOS[modulo]) || (typeof MTZ_MODULOS_NOMES !== 'undefined' && MTZ_MODULOS_NOMES[modulo]) || modulo;
    var base = { modulo: 'gestao', tela: tela, resolvePor: 'CAIXA:' + itemId, prazo: prazoDia ? prazoDia + 'T23:59:00' : '', origem: 'CAIXA_DECISOES', quando: quando, sensivel: sigilo,
      tituloSigilo: 'decisão aguardando você (detalhe só no sistema)', textoSigilo: 'Uma decisão de ' + nomeMod + ' espera por você. O detalhe fica só no sistema, por sigilo. Abra o item no SGO+ pelo link.' };
    var resp = AvG_s_(d.RESPONSAVEIS_IDS).split(',').map(AvG_s_).filter(ehG);
    var entrou = iso(d.ENTROU_EM);
    base.marco = 'E' + entrou;
    if (t1 && entrou > implantado) resp.forEach(function (uid) {
      var x = AvG_enfileirar_(Object.assign({}, base, { evento: 'GS01', tipo: 'PENDENCIA', u: us[uid], refId: itemId,
        titulo: (aprov ? 'Aprovação' : 'Pendência') + ' · ' + nomeMod + ': ' + AvG_s_(d.TITULO),
        texto: (AvG_s_(d.DETALHE) ? AvG_s_(d.DETALHE) + '\n' : '') + (prazoDia ? 'Prazo de decisão: ' + AvG_br_(prazoDia) + '.\n' : '') + (AvG_s_(d.ENVOLVIDO_NOME) ? 'Pessoa envolvida: ' + AvG_s_(d.ENVOLVIDO_NOME) + '.\n' : '') + 'O que fazer: abra o item no SGO+ e decida (também está na Caixa de decisões).' }), lista);
      if (x.novo) r.novos++;
    });
    var acomp = typeof Ges_dia_ === 'function' ? Ges_dia_(d.ACOMPANHAR_ATE) : '';
    if (t2 && entrou > implantado && prazoDia && prazoDia < hoje && !AvG_s_(d.PRIMEIRA_ACAO_EM) && !(acomp && acomp >= hoje)) resp.forEach(function (uid) {
      var x = AvG_enfileirar_(Object.assign({}, base, { evento: 'GS02', tipo: 'ATRASO', u: us[uid], refId: itemId, prazo: '',
        titulo: 'Prazo vencido · ' + nomeMod + ': ' + AvG_s_(d.TITULO),
        texto: 'O prazo de decisão venceu em ' + AvG_br_(prazoDia) + ' sem nenhuma ação registrada.\nO que fazer: decida agora ou registre a providência na Caixa de decisões; sem ação, o item sobe à Diretoria com o seu nome.' }), lista);
      if (x.novo) r.atrasos++;
    });
    var escalado = iso(d.ESCALADO_EM);
    if (t3 && escalado && escalado > implantado) {
      var dirIds = AvG_s_(d.ESCALADO_PARA).split(',').map(AvG_s_).filter(Boolean);
      if (!dirIds.length && typeof Ges_diretoria_ === 'function') dirIds = Ges_diretoria_(us, []);
      dirIds.filter(function (id) { return ehG(id) && id !== AvG_s_(d.ENVOLVIDO_ID); }).forEach(function (uid) {
        var x = AvG_enfileirar_(Object.assign({}, base, { evento: 'GS03', tipo: 'ATRASO', u: us[uid], refId: itemId, prazo: '',
          titulo: 'Escalada à Diretoria · ' + nomeMod + ': ' + AvG_s_(d.TITULO),
          texto: 'Parada desde ' + AvG_br_(entrou).slice(0, 10) + ', com ' + (AvG_s_(d.RESPONSAVEIS_NOMES) || 'a gestão da área') + '.' + (prazoDia ? ' Prazo de decisão: ' + AvG_br_(prazoDia) + '.' : '') +
            '\nO que fazer: cobre quem está com o item ou decida na Caixa de decisões.' }), lista);
        if (x.novo) r.escaladas++;
      });
    }
  });
  return r;
}

// ------------------------------------------------------------
// RESOLUÇÃO (o item saiu da pendência)
// ------------------------------------------------------------
function AvG_resolver_(quando) {
  var agora = AvG_agora_(quando), linhas = AvG_ler_().filter(function (l) { return ['NA_FILA', 'ENVIADO', 'FALHOU'].indexOf(AvG_up_(l.SITUACAO)) >= 0 && AvG_s_(l.RESOLVE_POR); });
  if (!linhas.length) return { resolvidos: 0 };
  var abertos = null, conhecidos = null, atv = null, n = 0;
  linhas.forEach(function (l) {
    var rp = AvG_s_(l.RESOLVE_POR), resolvido = false, como = '';
    if (rp.indexOf('CAIXA:') === 0) {
      if (abertos === null) {
        abertos = {}; conhecidos = {};
        try { if (typeof GES_ABA_DECISOES !== 'undefined' && typeof Ges_ler_ === 'function') Ges_ler_(GES_ABA_DECISOES).forEach(function (d) { conhecidos[AvG_s_(d.ITEM_ID)] = true; if (AvG_up_(d.SITUACAO) === 'ABERTA') abertos[AvG_s_(d.ITEM_ID)] = true; }); } catch (e) { conhecidos = {}; }
      }
      var it = rp.slice(6);
      if (conhecidos[it] && !abertos[it]) { resolvido = true; como = 'O item saiu da Caixa de decisões (decidido ou resolvido na origem).'; }
    } else if (rp.indexOf('REPSOL:') === 0 && typeof Rep_solicitacaoTratada_ === 'function') {
      // 03/11/2026: pedido da representada aceito, recusado ou cancelado: o aviso que ainda não saiu não sai mais
      var txt = Rep_solicitacaoTratada_(rp.slice(7));
      if (txt) { resolvido = true; como = txt; }
    } else if (rp.indexOf('ATV:') === 0 && typeof Atividades_todas_ === 'function' && typeof Atividades_vencida_ === 'function') {
      if (atv === null) { atv = {}; try { Atividades_todas_().forEach(function (a) { atv[AvG_s_(a.ID)] = a; }); } catch (e) { atv = {}; } }
      var agoraAtv = typeof Atividades_agora_ === 'function' ? Atividades_agora_() : agora.slice(0, 16);
      var ids = rp.slice(4).split(',').map(AvG_s_).filter(Boolean);
      if (ids.length && ids.every(function (id) { return atv[id] && !Atividades_vencida_(atv[id], agoraAtv); })) { resolvido = true; como = 'A atividade foi concluída ou ganhou nova previsão.'; }
    }
    if (!resolvido) return;
    var antesDeSair = AvG_up_(l.SITUACAO) === 'NA_FILA';
    SGO_DATA.update(AVG_ABA, l.ID, { SITUACAO: 'RESOLVIDO', RESOLVIDO_EM: agora, RESOLUCAO: como + (antesDeSair ? ' Resolvido antes do envio: a mensagem não precisou sair.' : '') });
    n++;
  });
  return { resolvidos: n };
}

// ------------------------------------------------------------
// RODADA (Ges_rodada_, a cada 15 minutos, a qualquer hora)
// ------------------------------------------------------------
function SGO_avisosGestaoRodada_(quando) {
  quando = quando || new Date();
  var r = {};
  var passo = function (nome, fn) { try { r[nome] = fn(); } catch (e) { r[nome] = { erro: String((e && e.message) || e).slice(0, 300) }; console.error('Avisos da gestão (' + nome + '): ' + r[nome].erro); } };
  AvG_registrarEventos_();
  passo('matriz', function () { return AvG_migrar_(); });
  passo('caixa', function () { return AvG_gerarDaCaixa_(quando); });
  passo('resolvidos', function () { return AvG_resolver_(quando); });
  passo('envio', function () { return AvG_enviarProntos_(quando, false); });
  return r;
}

// ------------------------------------------------------------
// RETORNO DA META (entregue / lido), pronto para o servidor chamar
// ------------------------------------------------------------
/**
 * Retorno de um status do WhatsApp oficial (sent, delivered, read, failed) para os avisos da gestão. Ligado em 02/11/2026: o
 * servidor recebe o webhook da Meta (rota do número do sistema, assinatura conferida) e chama SGO_whatsappRetornoMeta_ abaixo,
 * que repassa cada status para cá e para os alertas de licitação. Devolve quantas linhas mudaram.
 */
function SGO_avisosGestaoRetornoMeta_(wamid, status, quandoIso, motivo) {
  try {
    wamid = AvG_s_(wamid); status = AvG_s_(status).toLowerCase();
    if (!wamid) return 0;
    var em = AvG_iso_(quandoIso) || AvG_agora_(), n = 0;
    AvG_ler_().forEach(function (l) {
      if (AvG_s_(l.WA_ID) !== wamid) return;
      var c = {};
      if (status === 'delivered' && ['LIDO'].indexOf(AvG_up_(l.WA_SITUACAO)) < 0) { c.WA_SITUACAO = 'ENTREGUE'; c.ENTREGUE_EM = em; }
      else if (status === 'read') { c.WA_SITUACAO = 'LIDO'; c.LIDO_EM = em; if (!AvG_s_(l.ENTREGUE_EM)) c.ENTREGUE_EM = em; }
      else if (status === 'failed') { c.WA_SITUACAO = 'FALHOU'; c.WA_MOTIVO = AvG_texto_('A Meta devolveu falha na entrega' + (motivo ? ': ' + String(motivo).replace(/\d{8,}/g, '***') : '') + '. O aviso foi por e-mail.', 300); }
      if (Object.keys(c).length) { SGO_DATA.update(AVG_ABA, l.ID, c); n++; }
    });
    return n;
  } catch (e) { return 0; }
}

/**
 * 02/11/2026: entrada única do retorno da Meta no SGO+ (chamada pelo servidor, sgo_servidor servicos/whatsappRetorno.ts, depois de
 * conferir a assinatura X-Hub-Signature-256 ou o segredo da rota). lista = [{ tipo: STATUS, id (wamid), status, quando, motivo } |
 * { tipo: RESPOSTA, contexto (wamid da mensagem respondida), de (número), texto, quando }]. Repassa os status aos avisos da gestão
 * e aos alertas de licitação; a resposta "ciente" a um alerta de licitação registra a ciência. Só execução interna. Nunca lança.
 */
function SGO_whatsappRetornoMeta_(lista) {
  if (typeof SGO_execucaoInterna_ === 'function' && !SGO_execucaoInterna_()) return null;
  var r = { status: 0, gestao: 0, licitacoes: 0, respostas: 0, ciencias: 0 };
  try {
    (Array.isArray(lista) ? lista : []).slice(0, 500).forEach(function (x) {
      if (!x || typeof x !== 'object') return;
      if (x.tipo === 'STATUS') {
        r.status++;
        r.gestao += SGO_avisosGestaoRetornoMeta_(x.id, x.status, x.quando, x.motivo) || 0;
        if (typeof Lic_alertasRetornoMeta_ === 'function') r.licitacoes += Lic_alertasRetornoMeta_(x.id, x.status, x.quando, x.motivo) || 0;
      } else if (x.tipo === 'RESPOSTA') {
        r.respostas++;
        if (typeof Lic_alertasRespostaWhatsapp_ === 'function') r.ciencias += Lic_alertasRespostaWhatsapp_(x.contexto, x.de, x.texto, x.quando) || 0;
      }
    });
    if (r.status || r.respostas) PropertiesService.getScriptProperties().setProperty('SGO_WA_RETORNO_ULTIMO', JSON.stringify({ em: new Date().toISOString(), status: r.status, gestao: r.gestao, licitacoes: r.licitacoes, respostas: r.respostas, ciencias: r.ciencias }));
  } catch (e) { r.erro = String((e && e.message) || e).slice(0, 200); }
  return r;
}

// ------------------------------------------------------------
// CONFERÊNCIA DOS PARADOS (relatório semanal da manutenção)
// ------------------------------------------------------------
function AvG_itemConferencia_(l, motivo) {
  return { avisoId: AvG_s_(l.AVISO_ID), pessoa: AvG_s_(l.USUARIO_NOME), evento: AvG_s_(l.EVENTO), tipo: AVG_TIPOS[l.TIPO] || AvG_s_(l.TIPO), modulo: AvG_s_(l.MODULO),
    titulo: AvG_s_(l.TITULO), criadoEm: AvG_br_(l.QUANDO), liberarEm: AvG_br_(l.LIBERAR_EM), enviadoEm: AvG_br_(l.ENVIADO_EM), prazo: AvG_br_(l.PRAZO),
    situacao: AVG_SITUACOES[AvG_up_(l.SITUACAO)] || AvG_s_(l.SITUACAO), email: AvG_s_(l.EMAIL_SITUACAO), whatsapp: AVG_WA_ROTULOS[AvG_up_(l.WA_SITUACAO)] || AvG_s_(l.WA_SITUACAO), motivo: motivo };
}

/**
 * Avisos da gestão parados. Para o relatório semanal da manutenção (script do servidor) e para a tela.
 * quando: Date (opcional). Devolve {
 *   ok, geradoEm ("dd/mm/aaaa hh:mm"), totais: { paradosNaFila, semResolucao, falhasSemEmail, aguardandoModelo },
 *   paradosNaFila: [item]   criados e não enviados há mais de 1 hora (fora a espera do expediente),
 *   semResolucao: [item]    enviados e ainda pendentes depois do prazo do item,
 *   falhasSemEmail: [item]  nada chegou (e-mail sem sair e WhatsApp sem sair),
 *   texto: resumo em pt-BR (uma linha por grupo)
 * } com item = { avisoId, pessoa, evento, tipo, modulo, titulo, criadoEm, liberarEm, enviadoEm, prazo, situacao, email, whatsapp, motivo }.
 * Nunca lança: erro em { ok: false, message }.
 */
function SGO_avisosGestaoConferir_(quando) {
  try {
    quando = quando || new Date();
    var agora = AvG_agora_(quando), umaHora = AvG_menosMin_(quando, AVG_PARADO_FILA_MIN);
    var linhas = AvG_ler_(), parados = [], semRes = [], falhas = [], aguardando = 0;
    linhas.forEach(function (l) {
      var s = AvG_up_(l.SITUACAO), wa = AvG_up_(l.WA_SITUACAO), emOk = AvG_up_(l.EMAIL_SITUACAO) === 'ENVIADO', waOk = ['ENVIADO', 'ENTREGUE', 'LIDO'].indexOf(wa) >= 0;
      if (wa === 'AGUARDANDO_MODELO' && s !== 'RESOLVIDO') aguardando++;
      if ((s === 'NA_FILA' || s === 'ENVIANDO') && AvG_maior_(l.QUANDO, l.LIBERAR_EM) < umaHora) parados.push(AvG_itemConferencia_(l, 'Na fila desde ' + AvG_br_(l.QUANDO) + (AvG_s_(l.LIBERAR_EM) > AvG_s_(l.QUANDO) ? ' (liberado em ' + AvG_br_(l.LIBERAR_EM) + ')' : '') + ' e ainda não enviado. Confira se a rodada da gestão (a cada 15 minutos) está rodando.'));
      if (s === 'ENVIADO' && !AvG_s_(l.RESOLVIDO_EM) && AvG_s_(l.PRAZO) && AvG_s_(l.PRAZO) < agora) semRes.push(AvG_itemConferencia_(l, 'Enviado em ' + AvG_br_(l.ENVIADO_EM) + ' e ainda pendente depois do prazo (' + AvG_br_(l.PRAZO) + '). A escada da Caixa de decisões e a SEDNA continuam cobrando.'));
      if ((s === 'FALHOU' || (s !== 'NA_FILA' && AvG_s_(l.MENSAGEM_ID))) && !emOk && !waOk) falhas.push(AvG_itemConferencia_(l, 'Nada chegou: e-mail ' + (AvG_s_(l.EMAIL_MOTIVO) || 'sem envio') + ' WhatsApp: ' + (AvG_s_(l.WA_MOTIVO) || 'sem envio')));
    });
    var texto = [
      'Avisos da gestão parados em ' + AvG_br_(agora) + ':',
      '- Na fila há mais de 1 hora: ' + parados.length + '.',
      '- Enviados e sem resolução depois do prazo: ' + semRes.length + '.',
      '- Falhas sem e-mail (nada chegou): ' + falhas.length + '.',
      '- WhatsApp aguardando o modelo ' + AVG_MODELO + ' (o e-mail saiu): ' + aguardando + '.'
    ].join('\n');
    return { ok: true, geradoEm: AvG_br_(agora), totais: { paradosNaFila: parados.length, semResolucao: semRes.length, falhasSemEmail: falhas.length, aguardandoModelo: aguardando },
      paradosNaFila: parados, semResolucao: semRes, falhasSemEmail: falhas, texto: texto };
  } catch (e) {
    return { ok: false, message: 'Não foi possível conferir os avisos da gestão: ' + String((e && e.message) || e).slice(0, 200) };
  }
}

// ------------------------------------------------------------
// TELAS
// ------------------------------------------------------------
/** Painel do dia (Administração > Matriz de avisos > Avisos da gestão): enviados, na fila, falhas e parados, com o motivo. */
function AvG_painelDia_(dia) {
  dia = /^\d{4}-\d{2}-\d{2}$/.test(AvG_s_(dia)) ? AvG_s_(dia) : AvG_agora_().slice(0, 10);
  var conf = SGO_avisosGestaoConferir_();
  var parados = {};
  ['paradosNaFila', 'semResolucao', 'falhasSemEmail'].forEach(function (k) { (conf[k] || []).forEach(function (i) { parados[i.avisoId] = i.motivo; }); });
  var t = { enviados: 0, naFila: 0, falhas: 0, parados: Object.keys(parados).length, resolvidos: 0, aguardandoModelo: 0 };
  var linhas = AvG_ler_().filter(function (l) { return AvG_s_(l.QUANDO).slice(0, 10) === dia || AvG_up_(l.SITUACAO) === 'NA_FILA' || parados[AvG_s_(l.AVISO_ID)]; }).map(function (l) {
    var s = AvG_up_(l.SITUACAO);
    if (AvG_s_(l.QUANDO).slice(0, 10) === dia) {
      if (s === 'ENVIADO' || (s === 'RESOLVIDO' && AvG_s_(l.ENVIADO_EM))) t.enviados++;
      if (s === 'FALHOU') t.falhas++;
      if (s === 'RESOLVIDO') t.resolvidos++;
      if (AvG_up_(l.WA_SITUACAO) === 'AGUARDANDO_MODELO') t.aguardandoModelo++;
    }
    if (s === 'NA_FILA') t.naFila++;
    var motivo = parados[AvG_s_(l.AVISO_ID)] || (s === 'NA_FILA' ? (AvG_s_(l.LIBERAR_EM) > AvG_agora_() ? 'Fora do expediente da pessoa: sai em ' + AvG_br_(l.LIBERAR_EM) + '.' : (AVG_URGENTES.indexOf(l.TIPO) >= 0 ? 'Sai na próxima rodada.' : 'Agrupando: sai quando a mais antiga completar 30 minutos.')) :
      [AvG_s_(l.EMAIL_MOTIVO) ? 'E-mail: ' + AvG_s_(l.EMAIL_MOTIVO) : '', AvG_s_(l.WA_MOTIVO) ? 'WhatsApp: ' + AvG_s_(l.WA_MOTIVO) : '', AvG_s_(l.RESOLUCAO)].filter(Boolean).join(' '));
    return { hora: AvG_br_(l.QUANDO), pessoa: AvG_s_(l.USUARIO_NOME), diretoria: AvG_up_(l.DIRETORIA) === 'SIM', evento: AvG_s_(l.EVENTO), tipo: AVG_TIPOS[l.TIPO] || AvG_s_(l.TIPO), titulo: AvG_s_(l.TITULO),
      situacao: s, situacaoNome: AVG_SITUACOES[s] || s, parado: !!parados[AvG_s_(l.AVISO_ID)], email: AvG_up_(l.EMAIL_SITUACAO), whatsapp: AvG_up_(l.WA_SITUACAO), whatsappNome: AVG_WA_ROTULOS[AvG_up_(l.WA_SITUACAO)] || '',
      aberto: !!AvG_s_(l.ABERTO_EM), motivo: AvG_texto_(motivo, 400), quando: AvG_s_(l.QUANDO) };
  }).sort(function (a, b) { return a.quando < b.quando ? 1 : -1; }).slice(0, 300);
  linhas.forEach(function (x) { delete x.quando; });
  return { dia: dia, totais: t, linhas: linhas, modelo: { nome: AVG_MODELO, situacao: AvG_situacaoModelo_() || 'NAO_CADASTRADO' }, conferencia: conf.ok ? conf.texto : conf.message };
}

/** Bloco de Meus avisos: a pessoa é da gestão? Os avisos da gestão são obrigatórios para ela, com o porquê. */
function AvG_meusAvisos_(uid) {
  var us = AvG_usuarios_(), u = us[AvG_s_(uid)];
  if (!AvG_ehGestao_(u)) return { ehGestao: false };
  return { ehGestao: true, diretoria: !!u.diretoria, modelo: AvG_situacaoModelo_() === 'APPROVED' ? 'aprovado' : 'aguardando aprovação na Meta',
    texto: 'Avisos da gestão (pendência, aprovação, atraso e ato irreversível): chegam por WhatsApp e por e-mail, com um link que abre o item no SGO+. São obrigatórios para quem responde pela gestão: decisão do dono em 01/11/2026, para nenhuma decisão ficar parada sem ninguém saber. ' +
      (u.diretoria ? 'Diretoria: a qualquer hora, inclusive à noite e no fim de semana.' : 'Gestor: só no expediente; o que nasce fora dele chega na abertura do próximo dia útil.') +
      ' Pendências vêm juntas a cada 30 minutos; atraso e ato irreversível chegam na hora. Não contam no limite de 3 WhatsApp por dia.' };
}

/**
 * google.script.run: SGO_AvisosGestao_api(sessionId, 'abrir', { aviso }). Abre o item do link do aviso (?aviso=...), depois do
 * login: devolve a ação da tela (a mesma do Início) e grava que a pessoa abriu. Nunca lança.
 */
function SGO_AvisosGestao_api(sessionId, acao, dados) {
  try {
    var s = exigirSessao(sessionId);
    if (AvG_up_(s.perfil) === 'CLIENTE') throw new Error('Este link é de um aviso da equipe da Metrolabs.');
    var d = dados || {};
    if (acao !== 'abrir') throw new Error('Ação desconhecida.');
    var id = AvG_s_(d.aviso);
    // 02/11/2026: link de alerta de licitação (LA + 10): abre a ficha na aba Prazos (SGO_Licitacoes_Alertas.js)
    // 03/11/2026: "Não vou participar" (LA...-NAO, LIC-AAAA-NNNN-NAO) e a ficha do resumo diário do Radar (LIC-AAAA-NNNN)
    if (/^(LA[0-9a-f]{10}|LIC-\d{4}-\d{1,6})(-NAO)?$/.test(id) && typeof Lic_avisoAbrir_ === 'function') return Lic_avisoAbrir_(s, id);
    var l = /^[A-Za-z0-9-]{4,40}$/.test(id) ? AvG_ler_().filter(function (x) { return AvG_s_(x.AVISO_ID) === id; })[0] : null;
    if (!l) return { ok: false, tela: { tipo: 'modulo', mod: 'gestao_decisoes' }, message: 'Não encontramos este aviso (o link pode ser de outro ambiente ou ter sido copiado pela metade). Abrimos a Caixa de decisões: o item continua lá até ser resolvido.' };
    // revisão 01/11/2026: só o destinatário do aviso e a gestão abrem pelo link
    var euId = AvG_s_(s.userId), usL = AvG_usuarios_();
    if (AvG_s_(l.USUARIO_ID) !== euId && !AvG_ehGestao_(usL[euId])) return { ok: false, tela: null, outraPessoa: true, message: 'Este aviso é de outra pessoa. O que é seu está no Início e em Meus avisos.' };
    if (AvG_s_(l.USUARIO_ID) === AvG_s_(s.userId) && !AvG_s_(l.ABERTO_EM)) { try { SGO_DATA.update(AVG_ABA, l.ID, { ABERTO_EM: AvG_agora_() }); } catch (e) {} }
    var resolvido = AvG_up_(l.SITUACAO) === 'RESOLVIDO' && l.TIPO !== 'IRREVERSIVEL';
    return { ok: true, tela: AvG_telaSegura_(AvG_json_(l.TELA_JSON, null)), message: resolvido ? 'Este item já foi resolvido em ' + AvG_br_(l.RESOLVIDO_EM) + '. A tela abre para você conferir.' : '' };
  } catch (e) {
    return { ok: false, tela: { tipo: 'modulo', mod: 'gestao_decisoes' }, message: String((e && e.message) || e) };
  }
}

AvG_registrarEventos_();
