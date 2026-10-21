/****************************************************
 * COMPRAS — PENDÊNCIAS, AVISOS POR E-MAIL, ROTINA E CHAMADA ÚNICA DA TELA (21/10/2026)
 *
 * Pendências (central do Início e Caixa de decisões, registradas em SGO_Pendencias_Compras.js), pela matriz de avisos:
 *  - especificação incompleta: quem pediu, no sistema até completar (C030/C031);
 *  - compra aguardando aprovação: aprovador da faixa (Caixa de decisões; faixa do comprador: os compradores);
 *  - aprovada sem pedido há 1 dia útil e pedido com entrega atrasada: comprador; depois de 2 dias úteis, a Caixa do
 *    gestor da área de Compras;
 *  - recebida com divergência: comprador, até resolver;
 *  - compra para conferir: Financeiro, até conferir (C037); divergência do Financeiro: comprador, até corrigir (C038);
 *  - compra feita sem pedido: Caixa da gestão até alguém marcar "Ciente";
 *  - avisos (aprovada, reprovada, peça disponível, cancelada...): da própria pessoa, até abrir Compras.
 * E-mail: um resumo por pessoa por dia, a partir das 8 h, só no expediente, sem valor (avisos marcados para e-mail).
 * WhatsApp: nunca pelo Compras (as atividades já entram no resumo diário das atividades).
 *
 * Rotina: Compras_rotina_ (gatilho de 15 em 15 minutos, instalado por Compras_garantirRotina_; também roda quando
 * alguém abre Compras e a última rodada tem mais de 1 hora): resumo de e-mail, envios registrados do pedido de compra
 * e o relatório mensal no primeiro dia útil.
 ****************************************************/

var CMP_ROTINA_PROP = 'CMP_ROTINA_ULTIMA';
var CMP_FUNCAO_ROTINA = 'Compras_rotinaGatilho';

// ------------------------------------------------------------
// PENDÊNCIAS
// ------------------------------------------------------------
function Compras_fontePendencias_(add, ctx) {
  if (!ctx || ctx.cliente || typeof Pend_item_ !== 'function') return;
  if (typeof Compras_registrarTipos_ === 'function') Compras_registrarTipos_();
  if (typeof PEND_TIPOS === 'undefined' || !PEND_TIPOS.compras_espec) return;
  if (!Pend_abaExiste_(CMP_ABAS.REQUISICOES)) return;
  var hoje = Cmp_hoje_(), regras = Cmp_regras_(), us = null;
  var usuarios = function () { if (!us) us = Cmp_usuarios_(); return us; };
  Cmp_ler_(CMP_ABAS.REQUISICOES).forEach(function (r) {
    var s = Cmp_up_(r.SITUACAO), sol = Cmp_s_(r.SOLICITANTE_ID), num = Cmp_s_(r.NUMERO), tit = Cmp_s_(r.TITULO).slice(0, 70);
    if (s === 'SOLICITADA' && Cmp_sim_(r.ESPEC_INCOMPLETA)) {
      var falta = Cmp_json_(r.ESPEC_FALTA, []);
      add(Pend_item_('compras_espec', {
        id: 'CMP:ESPEC:' + r.ID, nome: num, publico: 'PESSOA', paraUsuarios: [sol], responsavel: Cmp_s_(r.SOLICITANTE_NOME), responsavelId: sol,
        gravidade: Cmp_up_(r.URGENCIA) === 'CRITICA' ? 'CRITICO' : 'ATENCAO', dias: null,
        titulo: 'Complete a especificação do pedido de compra ' + num + ' (' + tit + ')',
        detalhe: (Cmp_s_(r.ESPEC_DEVOLVIDA_TEXTO) ? 'Compras pediu: ' + Cmp_s_(r.ESPEC_DEVOLVIDA_TEXTO).slice(0, 200) : 'Falta: ' + falta.join('; ').slice(0, 260)) + ' Sem a especificação completa o pedido não é cotado.',
        oQueFazer: 'Abra Compras > Meus pedidos de compra, toque em "Completar a especificação", preencha o que falta e envie de novo.',
        tela: CMP_PEND_TELA('compras_meus', Cmp_s_(r.ID))
      }));
    }
    if (typeof CmpC_pendencias_ === 'function') CmpC_pendencias_(add, ctx, r, { hoje: hoje, regras: regras, usuarios: usuarios });
    if (typeof CmpP_pendencias_ === 'function') CmpP_pendencias_(add, ctx, r, { hoje: hoje, regras: regras, usuarios: usuarios });
    if (typeof CmpFin_pendencias_ === 'function') CmpFin_pendencias_(add, ctx, r, { hoje: hoje, regras: regras, usuarios: usuarios });
  });
  if (ctx.userId && !ctx.interno) {
    Cmp_ler_(CMP_ABAS.AVISOS).forEach(function (v) {
      if (Cmp_s_(v.DESTINATARIO_ID) !== ctx.userId || Cmp_s_(v.LIDO_EM)) return;
      // estes avisos já têm a pendência viva (até resolver); no Início aparece só ela (o aviso vai no resumo de e-mail)
      if (['ESPEC_DEVOLVIDA', 'PARA_CONFERIR', 'DIVERGENCIA_FIN'].indexOf(Cmp_up_(v.TIPO)) >= 0) return;
      add(Pend_item_('compras_aviso', {
        id: 'CMP:AVISO:' + v.ID, nome: Cmp_s_(v.TITULO).slice(0, 40), publico: 'PESSOA', paraUsuarios: [ctx.userId], responsavel: ctx.nome, responsavelId: ctx.userId, gravidade: 'INFO', dias: null,
        titulo: Cmp_s_(v.TITULO), detalhe: Cmp_s_(v.TEXTO).slice(0, 220), oQueFazer: 'Abra Compras: o aviso fica marcado como lido ao aparecer na tela.',
        tela: CMP_PEND_TELA(/^(APROVADA|REPROVADA|DIVERGENCIA_FIN|SEM_PEDIDO)/.test(Cmp_up_(v.TIPO)) ? 'compras' : 'compras_meus', Cmp_s_(v.REF_ID))
      }));
    });
  }
}

// ------------------------------------------------------------
// E-MAIL: RESUMO DA MANHÃ (um por pessoa por dia, sem valor)
// ------------------------------------------------------------
function Cmp_enviarResumos_(quando) {
  try {
    var ex = typeof SGO_dentroDoExpediente_ === 'function' ? SGO_dentroDoExpediente_(quando || new Date()) : { dentro: true, hora: Cmp_agora_().slice(11, 16) };
    var horaAgora = Cmp_s_(ex.hora) || Cmp_agora_().slice(11, 16), horaResumo = Cmp_s_(Cmp_regras_().avisos.horaResumo) || '08:00';
    if (!ex.dentro || horaAgora < horaResumo || typeof SGO_notificar_ !== 'function') return { enviados: 0, fora: !ex.dentro ? 'fora do expediente' : 'antes da hora do resumo' };
    var hoje = Cmp_hoje_(), porPessoa = {}, jaHoje = {}, limite = Cmp_somarDias_(hoje, -5), velhos = [];
    Cmp_ler_(CMP_ABAS.AVISOS).forEach(function (v) {
      var dest = Cmp_s_(v.DESTINATARIO_ID);
      if (Cmp_up_(v.EMAIL_SITUACAO) === 'ENVIADO' && Cmp_dia_(v.EMAIL_EM) === hoje) jaHoje[dest] = true;
      if (Cmp_up_(v.EMAIL_SITUACAO) !== 'PENDENTE') return;
      if (Cmp_s_(v.LIDO_EM)) { velhos.push([v, 'PULADO', 'aviso já lido no sistema antes do resumo']); return; }
      if (Cmp_dia_(v.DATA) && Cmp_dia_(v.DATA) < limite) { velhos.push([v, 'PULADO', 'aviso guardado há mais de 5 dias; não foi mais enviado']); return; }
      (porPessoa[dest] = porPessoa[dest] || []).push(v);
    });
    var enviados = 0, agora = Cmp_agora_();
    Object.keys(porPessoa).forEach(function (dest) {
      if (jaHoje[dest]) return; // um resumo por dia: o que chegou depois espera o de amanhã (ou é lido no sistema)
      var l = porPessoa[dest];
      var titulo = l.length === 1 ? 'Compras: ' + l[0].TITULO : 'Compras: ' + l.length + ' avisos';
      var texto = l.map(function (v, i) { return (l.length > 1 ? (i + 1) + '. ' : '') + v.TITULO + '\n' + v.TEXTO; }).join('\n\n') + '\n\nVeja no SGO+, em Compras.';
      var r = { ok: 0 };
      try { r = SGO_notificar_({ usuarios: [dest], canais: ['email'], titulo: titulo, texto: texto, origem: 'COMPRAS', categoria: 'COMPRAS', refId: l.map(function (v) { return v.ID; }).join(',').slice(0, 80) }) || { ok: 0 }; }
      catch (e) { r = { ok: 0, erro: 1, motivo: String((e && e.message) || e) }; }
      var sit = r.ok ? 'ENVIADO' : (r.pulado ? 'PULADO' : 'ERRO');
      if (r.ok) enviados++;
      l.forEach(function (v) { SGO_DATA.update(CMP_ABAS.AVISOS, v.ID, { EMAIL_SITUACAO: sit, EMAIL_EM: agora, EMAIL_MOTIVO: Cmp_texto_(r.motivo, 300) }); });
    });
    velhos.forEach(function (x) { SGO_DATA.update(CMP_ABAS.AVISOS, x[0].ID, { EMAIL_SITUACAO: x[1], EMAIL_EM: agora, EMAIL_MOTIVO: x[2] }); });
    return { enviados: enviados };
  } catch (e) { console.error('Compras, e-mails: ' + ((e && e.message) || e)); return { enviados: 0, erro: String((e && e.message) || e) }; }
}

// ------------------------------------------------------------
// ROTINA
// ------------------------------------------------------------
/** Gatilho de 15 em 15 minutos; a rotina em si roda no máximo uma vez por hora. */
function Compras_rotinaGatilho() { return Compras_rotina_(new Date(), false); }

function Compras_garantirRotina_() {
  var tem = false;
  try { tem = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === CMP_FUNCAO_ROTINA; }); } catch (e) {}
  if (!tem) ScriptApp.newTrigger(CMP_FUNCAO_ROTINA).timeBased().everyMinutes(15).create();
  return { instalado: true, jaExistia: tem };
}

function Compras_emUso_() {
  try { return Cmp_ler_(CMP_ABAS.REQUISICOES).length > 0; } catch (e) { return false; }
}

function Compras_rotina_(quando, forcar) {
  var r = {};
  try { if (!Pend_abaExiste_(CMP_ABAS.REQUISICOES)) return { fora: 'Compras ainda sem uso' }; } catch (e) { return { fora: 'Compras ainda sem uso' }; }
  var props = PropertiesService.getScriptProperties(), ultima = Number(props.getProperty(CMP_ROTINA_PROP)) || 0, agoraMs = (quando || new Date()).getTime();
  if (!forcar && agoraMs - ultima < 55 * 60 * 1000) return { fora: 'rodou há menos de 1 hora' };
  props.setProperty(CMP_ROTINA_PROP, String(agoraMs));
  var passo = function (nome, fn) { try { r[nome] = fn(); } catch (e) { r[nome] = { erro: String((e && e.message) || e).slice(0, 300) }; console.error('Compras (' + nome + '): ' + r[nome].erro); } };
  if (typeof CmpP_sincronizarEnvios_ === 'function') passo('envios', CmpP_sincronizarEnvios_);
  passo('emails', function () { return Cmp_enviarResumos_(quando); });
  if (typeof CmpFin_relatorioAutomatico_ === 'function') passo('relatorioMensal', function () { return CmpFin_relatorioAutomatico_(quando); });
  return r;
}

// ------------------------------------------------------------
// CHAMADA ÚNICA DA TELA
// ------------------------------------------------------------
function Cmp_inicio_(eu) {
  var regras = Cmp_regras_();
  var base = { nivel: eu.nivel, comprador: eu.comprador, veValores: eu.veValores, veFila: eu.veFila, financeiro: eu.financeiro, podeRegras: eu.regras, gestao: eu.gestao, diretoria: eu.diretoria,
    eu: { id: eu.id, nome: eu.nome } };
  if (eu.nivel === 'NENHUM') return base;
  base.situacoes = CMP_SITUACOES; base.urgencias = CMP_URGENCIAS; base.vinculos = CMP_VINCULOS; base.categorias = CMP_CATEGORIAS_ITEM;
  base.categoriasFornecedor = CMP_CATEGORIAS_FORNECEDOR; base.formasPagamento = CMP_FORMAS_PAGAMENTO; base.compatibilidade = CMP_COMPATIBILIDADE; base.finSituacoes = CMP_FIN_SITUACOES;
  base.faixas = eu.veValores ? regras.faixas.map(function (f, i) { var fx = Cmp_faixaDe_(f.ate === null ? 1e12 : f.ate, regras); return { indice: i + 1, nome: fx.nome, aprovador: CMP_NIVEIS_APROVACAO[Cmp_up_(f.aprovador)], cotacoes: f.cotacoes }; }) : [];
  var us = Cmp_usuarios_();
  base.compradores = Cmp_compradoresAtivos_(regras, us).map(function (id) { return { id: id, nome: us[id].nome }; });
  base.temComprador = base.compradores.length > 0;
  base.avisos = Cmp_avisosDe_(eu);
  return base;
}

function Cmp_avisosDe_(eu) {
  return Cmp_ler_(CMP_ABAS.AVISOS).filter(function (v) { return Cmp_s_(v.DESTINATARIO_ID) === eu.id; })
    .sort(function (a, b) { return String(b.DATA).localeCompare(String(a.DATA)); }).slice(0, 20)
    .map(function (v) { return { titulo: Cmp_s_(v.TITULO), texto: Cmp_s_(v.TEXTO), em: Cmp_br_(v.DATA), novo: !Cmp_s_(v.LIDO_EM), refId: Cmp_s_(v.REF_ID), tipo: Cmp_s_(v.TIPO) }; });
}

function Cmp_marcarAvisosLidos_(eu) {
  var agora = Cmp_agora_(), n = 0;
  Cmp_ler_(CMP_ABAS.AVISOS).forEach(function (v) { if (Cmp_s_(v.DESTINATARIO_ID) === eu.id && !Cmp_s_(v.LIDO_EM)) { SGO_DATA.update(CMP_ABAS.AVISOS, v.ID, { LIDO_EM: agora }); n++; } });
  if (n && typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_();
  return n;
}

/** Regras de compras: leitura (gestão de compras e quem pode editar) e gravação (Administrador e Diretoria). */
function Cmp_regrasTela_(eu, d) {
  d = d || {};
  if (d.salvar) {
    Cmp_exigir_(eu, 'REGRAS', 'salvar as regras de compras');
    var motivo = Cmp_texto_(d.motivo, 500);
    if (motivo.length < 10) throw new Error('Não foi possível salvar: escreva o que mudou e por quê (pelo menos 10 letras). Cada versão fica no histórico');
    var v = Cmp_comTrava_(function () { Cmp_garantirAbas_(); return Cmp_gravarRegras_(d.salvar, eu, motivo); });
    return { regras: Cmp_regras_(), message: 'Regras de compras salvas (versão ' + v + '). Valem para as próximas escolhas de orçamento e aprovações.' };
  }
  Cmp_exigir_(eu, 'VALORES', 'ver as regras de compras');
  var us = Cmp_usuarios_();
  var r = { regras: Cmp_regras_(), podeEditar: eu.regras, padrao: CMP_REGRAS_PADRAO, niveis: CMP_NIVEIS_APROVACAO };
  r.equipe = Object.keys(us).filter(function (id) { return us[id].ativo && !Cmp_ehContaSistema_(us[id]); }).map(function (id) { return { id: id, nome: us[id].nome, perfil: us[id].perfil, area: us[id].area }; })
    .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  r.areas = typeof Areas_todas_ === 'function' ? (function () { try { return Areas_todas_().map(function (a) { return { codigo: Cmp_up_(a.CODIGO || a.codigo), nome: Cmp_s_(a.NOME || a.nome) }; }); } catch (e) { return []; } })() : [];
  if (!r.areas.length) r.areas = [{ codigo: 'LOGISTICA', nome: 'Logística' }, { codigo: 'ADMINISTRATIVO', nome: 'Administrativo' }];
  r.versoes = Cmp_ler_(CMP_ABAS.CONFIG).filter(function (c) { return Cmp_s_(c.CHAVE) === 'REGRAS'; }).map(function (c) { return { versao: Number(c.VERSAO), em: Cmp_br_(c.ATUALIZADO_EM), por: Cmp_s_(c.ATUALIZADO_POR_NOME), motivo: Cmp_s_(c.MOTIVO) }; })
    .sort(function (a, b) { return b.versao - a.versao; });
  r.gestoresCompras = Cmp_gestoresCompras_(r.regras, us).map(function (id) { return us[id].nome; });
  return r;
}

var CMP_ACOES = {
  iniciar: function (eu) {
    var b = Cmp_inicio_(eu);
    if (eu.nivel !== 'NENHUM') { try { Compras_rotina_(new Date(), false); } catch (e) {} }
    return b;
  },
  acesso: function (eu) { return { nivel: eu.nivel, comprador: eu.comprador, veFila: eu.veFila, veValores: eu.veValores, financeiro: eu.financeiro, podeRegras: eu.regras }; },
  avisosLidos: function (eu) { return { marcados: Cmp_marcarAvisosLidos_(eu) }; },
  // requisições
  salvarRequisicao: function (eu, sid, d) { return CmpR_salvar_(eu, d); },
  devolverEspec: function (eu, sid, d) { return CmpR_devolverEspec_(eu, d); },
  iniciarCotacao: function (eu, sid, d) { return CmpR_iniciarCotacao_(eu, d); },
  cancelar: function (eu, sid, d) { return CmpR_cancelar_(eu, d); },
  meus: function (eu) { return { requisicoes: CmpR_meus_(eu) }; },
  fila: function (eu, sid, d) { return CmpR_fila_(eu, d); },
  requisicao: function (eu, sid, d) { return { requisicao: CmpR_detalhe_(eu, d && d.id) }; },
  clientes: function (eu, sid, d) { return { clientes: CmpR_buscarClientes_(eu, d) }; },
  cliente: function (eu, sid, d) { return CmpR_doCliente_(eu, d); },
  opcoesVinculo: function (eu) { return { pedidosComercial: CmpR_pedidosComercial_(), veiculos: CmpR_veiculos_() }; },
  // cotações e aprovação
  salvarCotacao: function (eu, sid, d) { return CmpC_salvar_(eu, d); },
  retirarCotacao: function (eu, sid, d) { return CmpC_retirar_(eu, d); },
  escolher: function (eu, sid, d) { return CmpC_escolher_(eu, d); },
  decidir: function (eu, sid, d) { return CmpC_decidir_(eu, d); },
  // pedido de compra, recebimento e entrega
  emitirPedido: function (eu, sid, d) { return CmpP_emitir_(eu, d); },
  marcarEnviado: function (eu, sid, d) { return CmpP_marcarEnviado_(eu, d); },
  sincronizarEnvios: function (eu, sid, d) { CmpP_sincronizarEnvios_(); return { requisicao: CmpR_detalhe_(eu, d && d.requisicaoId) }; },
  previsao: function (eu, sid, d) { return CmpP_previsao_(eu, d); },
  receber: function (eu, sid, d) { return CmpP_receber_(eu, d); },
  resolverDivergencia: function (eu, sid, d) { return CmpP_resolverDivergencia_(eu, d); },
  entregar: function (eu, sid, d) { return CmpP_entregar_(eu, d); },
  equipe: function (eu) { Cmp_exigir_(eu, 'COMPRADOR', 'ver a equipe'); var us = Cmp_usuarios_(); return { equipe: Object.keys(us).filter(function (id) { return us[id].ativo && !Cmp_ehContaSistema_(us[id]); }).map(function (id) { return { id: id, nome: us[id].nome }; }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); }) }; },
  // fornecedores
  fornecedores: function (eu, sid, d) { return { fornecedores: CmpF_listar_(eu, d) }; },
  fornecedor: function (eu, sid, d) { return { fornecedor: CmpF_detalhe_(eu, d && d.id) }; },
  salvarFornecedor: function (eu, sid, d) { return CmpF_salvar_(eu, d); },
  arquivarFornecedor: function (eu, sid, d) { return CmpF_arquivar_(eu, d); },
  consultarCnpj: function (eu, sid, d) { return CmpF_consultarCnpj_(eu, d); },
  importarFornecedores: function (eu, sid, d) { return CmpF_importar_(eu, d); },
  // regras
  regras: function (eu, sid, d) { return Cmp_regrasTela_(eu, d); }
};

/** google.script.run: Compras_api(sessionId, acao, dados). Nunca lança. */
function Compras_api(sessionId, acao, dados) {
  try {
    var fn = CMP_ACOES[Cmp_s_(acao)];
    if (!fn) return { ok: false, message: 'Ação de Compras desconhecida (' + Cmp_s_(acao) + '). Atualize a página (F5) e tente de novo.' };
    var eu = Cmp_eu_(sessionId);
    if (eu.nivel === 'NENHUM') return { ok: false, semAcesso: true, message: 'Não foi possível abrir: Compras é da equipe interna da Metrolabs.' };
    if (acao !== 'acesso') { try { Cmp_garantirAbas_(); } catch (e) {} }
    var r = fn(eu, sessionId, dados || {});
    return JSON.parse(JSON.stringify(Object.assign({ ok: true }, r || {})));
  } catch (e) {
    var m = String((e && e.message) || e).replace(/[.\s]+$/, '');
    return { ok: false, message: (/^Não foi possível|^O pedido|^Escreva/.test(m) ? m : 'Não foi possível concluir: ' + m) + '.' };
  }
}
