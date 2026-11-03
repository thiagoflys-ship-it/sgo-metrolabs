/****************************************************
 * SGO+ LICITAÇÕES — RELATÓRIOS EM A4 (02/11/2026)
 *
 * Pedido do dono (literal): "... fazer relatório em A4 HTML, salvar tudo e rastreabilidade de tudo." Manual:
 * docs/MANUAL_MODULO_LICITACOES.md, seção "Relatórios (Licitações › Relatórios)". Tela: JS_Licitacoes_Relatorios.html.
 *
 * Dois relatórios, na moldura A4 comum (RelA4_documento_), cada número com a FONTE escrita embaixo:
 *   (a) DA OPORTUNIDADE: resumo (PNCP), nota da última análise concluída com os critérios, leitura do edital (versão, cobertura e o
 *       checklist com a frase literal e a página), habilitação (o cruzamento da aba Habilitação), preço (a última simulação salva,
 *       com a versão e o hash), propostas (versões, situação e o SHA-256 da emitida), decisões e histórico (LIC_HISTORICO).
 *   (b) DO PERÍODO: oportunidades por etapa e por UF (primeira coleta no período), notas (classes e média), prazos de proposta no
 *       período, alertas criados no período (situação, nível, sem ciência), análises, propostas emitidas e resultados (etapas
 *       Resultado e Contrato; o SGO+ ainda não registra vencedor nem valor homologado).
 * Cada relatório gerado é uma VERSÃO IMUTÁVEL (LIC_RELATORIOS): o HTML exato fica guardado RESTRITO no serviço de arquivos do SGO+
 * (LicDoc_salvarHtml_, SGO_Licitacoes_Proposta.js) com o SHA-256; ao abrir, o SHA-256 é conferido. Nada é apagado nem refeito: gerar
 * de novo cria a versão seguinte. Tudo em LIC_HISTORICO (quem, quando, versão, hash e fonte).
 *
 * Ações: Licitacoes_api(sessionId, 'relatorios', { op, ... }); só Diretoria e Administrador.
 ****************************************************/

var LICREL_REGRAS = 'LIC-RELATORIO-2026-11-02.1';
var LICREL_ABA = 'LIC_RELATORIOS';
var LICREL_COLUNAS = ['ID', 'TIPO', 'CHAVE', 'OPORTUNIDADE_ID', 'CODIGO', 'PERIODO_DE', 'PERIODO_ATE', 'VERSAO', 'NUMERO', 'TITULO', 'RESUMO', 'DADOS_HASH', 'HTML_ARQUIVO_ID', 'HTML_SHA256',
  'HTML_TAMANHO', 'POR_ID', 'POR_NOME', 'EM', 'HASH'];
var LICREL_COLUNAS_TEXTO = ['CHAVE', 'PERIODO_DE', 'PERIODO_ATE', 'NUMERO', 'DADOS_HASH', 'HTML_SHA256', 'EM', 'HASH'];
var LICREL_TIPOS = { OPORTUNIDADE: 'Relatório da oportunidade', PERIODO: 'Relatório do período' };
var LICREL_PERIODO_MAX_DIAS = 400;
var LICREL_HIST_MAX = 120;
var LICREL_CHECKLIST_MAX = 60;
var LICREL_CRITERIOS = { capacidade: 'Capacidade técnica', margem: 'Margem', documentacao: 'Documentação', localizacao: 'Localização', prazo: 'Prazo', valor: 'Valor', riscos: 'Riscos' };

function LicRel_garantirAbas_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('LICREL_ABAS_OK_V1')) return; } catch (e) {}
  CertCal_garantirTabela_(LICREL_ABA, LICREL_COLUNAS);
  LICREL_COLUNAS.forEach(function (c) { CertCal_garantirColuna_(LICREL_ABA, c); });
  LICREL_COLUNAS_TEXTO.forEach(function (c) { CertCal_forcarColunaTexto_(LICREL_ABA, c); });
  try { if (cache) cache.put('LICREL_ABAS_OK_V1', '1', 21600); } catch (e) {}
}
function LicRel_diaSp_(iso) { var t = Date.parse(Lic_s_(iso)); return isFinite(t) ? new Date(t - 3 * 3600e3).toISOString().slice(0, 10) : ''; }
function LicRel_br_(dia) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(Lic_s_(dia)); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function LicRel_num_(v, casas) { return typeof RelA4_num_ === 'function' ? RelA4_num_(v, casas) : String(v); }
function LicRel_fonte_(t) { return '<p class="nota"><b>Fonte:</b> ' + RelA4_esc_(t) + '</p>'; }
function LicRel_hashReg_(r) { return Lic_hash_([Lic_s_(r.TIPO), Lic_s_(r.CHAVE), Number(r.VERSAO) || 0, Lic_s_(r.NUMERO), Lic_s_(r.DADOS_HASH), Lic_s_(r.HTML_SHA256), Lic_s_(r.POR_ID), Lic_s_(r.EM)].join('|')); }
function LicRel_lista_() { return Lic_ler_(LICREL_ABA).filter(function (r) { return Lic_s_(r.TIPO); }); }
function LicRel_resumoReg_(r) {
  return { id: Lic_s_(r.ID), tipo: Lic_s_(r.TIPO), tipoNome: LICREL_TIPOS[Lic_s_(r.TIPO)] || Lic_s_(r.TIPO), codigo: Lic_s_(r.CODIGO), oportunidadeId: Lic_s_(r.OPORTUNIDADE_ID), de: Lic_s_(r.PERIODO_DE), ate: Lic_s_(r.PERIODO_ATE),
    versao: Number(r.VERSAO) || 0, numero: Lic_s_(r.NUMERO), titulo: Lic_s_(r.TITULO), resumo: Lic_s_(r.RESUMO), por: Lic_s_(r.POR_NOME), em: Lic_s_(r.EM), sha256: Lic_s_(r.HTML_SHA256), integra: LicRel_hashReg_(r) === Lic_s_(r.HASH) };
}

// ------------------------------------------------------------ (a) relatório da oportunidade
function LicRel_dadosOportunidade_(l) {
  var d = { avisos: [] };
  d.analise = null;
  try {
    var an = (typeof Lic_analisesDe_ === 'function' ? Lic_analisesDe_(l.ID) : []).filter(function (a) { return Lic_s_(a.SITUACAO) === 'CONCLUIDA'; })[0];
    if (an) d.analise = typeof Lic_comDecisoes_ === 'function' ? Lic_comDecisoes_(Lic_analiseTela_(an), l) : Lic_analiseTela_(an);
  } catch (e) { d.avisos.push('Análise: ' + Lic_s_(e && e.message)); }
  d.leitura = null;
  try {
    if (typeof LicLeit_leiturasDe_ === 'function') {
      var ls = LicLeit_leiturasDe_(l.ID), le = ls.filter(function (x) { return Lic_up_(x.SITUACAO) !== 'SUBSTITUIDA'; })[0] || ls[0];
      if (le) {
        var ck = LicLeit_checklistDe_(le), cob = Lic_json_(le.COBERTURA_JSON, null);
        d.leitura = { versao: Number(le.VERSAO) || 0, situacao: Lic_up_(le.SITUACAO), situacaoNome: (typeof LIC_LEIT_SITUACOES !== 'undefined' && LIC_LEIT_SITUACOES[Lic_up_(le.SITUACAO)]) || Lic_s_(le.SITUACAO), em: Lic_s_(le.CONSOLIDACAO_EM) || Lic_s_(le.CRIADO_EM),
          hash: Lic_s_(le.HASH), cobertura: cob && cob.total ? Lic_s_(cob.total.texto) : '', checklist: ck.itens || [], ilegivel: !!ck.ilegivel, resumo: Lic_json_(le.RESUMO_JSON, []) };
      }
    }
  } catch (e) { d.avisos.push('Leitura do edital: ' + Lic_s_(e && e.message)); }
  d.habilitacao = null;
  try { if (typeof LicH_contexto_ === 'function') { LicH_garantirAbas_(); var ctx = LicH_contexto_({ opIds: [l.ID] }); d.habilitacao = LicH_cruzar_(l, ctx); } } catch (e) { d.avisos.push('Habilitação: ' + Lic_s_(e && e.message)); }
  d.simulacao = null;
  try { var s = typeof LicP_simulacoesDe_ === 'function' ? LicP_simulacoesDe_(l.ID)[0] : null; if (s) d.simulacao = LicP_simulacaoCompleta_(s); } catch (e) { d.avisos.push('Preço: ' + Lic_s_(e && e.message)); }
  d.propostas = [];
  try { if (typeof LicProp_propostasDe_ === 'function') d.propostas = LicProp_propostasDe_(l.ID).map(LicProp_resumoLinha_); } catch (e) { d.avisos.push('Proposta: ' + Lic_s_(e && e.message)); }
  d.historico = Lic_ler_(LIC_ABAS.HISTORICO).filter(function (h) { return Lic_s_(h.ENTIDADE) === 'OPORTUNIDADE' && Lic_s_(h.ENTIDADE_ID) === Lic_s_(l.ID); })
    .sort(function (a, b) { return Lic_s_(a.DATA) < Lic_s_(b.DATA) ? -1 : Lic_s_(a.DATA) > Lic_s_(b.DATA) ? 1 : 0; });
  return d;
}
function LicRel_htmlOportunidade_(l, d, o) {
  var esc = RelA4_esc_, corpo = '';
  corpo += RelA4_secao_('Resumo', RelA4_identificacao_([['Licitação', Lic_s_(l.CODIGO)], ['Situação no SGO+', LIC_SITUACAO_NOMES[Lic_s_(l.SITUACAO)] || Lic_s_(l.SITUACAO)],
    ['Órgão', [l.ORGAO_NOME, l.UNIDADE_NOME].filter(Boolean).join(' · ') || '—', { largo: true }], ['Processo (PNCP)', Lic_s_(l.NUMERO_CONTROLE_PNCP) || '—'], ['Modalidade', Lic_s_(l.MODALIDADE) || '—'],
    ['Local', [l.MUNICIPIO, l.UF].filter(Boolean).join('/') || '—'], ['Valor estimado', l.VALOR_ESTIMADO === '' || l.VALOR_ESTIMADO === null || l.VALOR_ESTIMADO === undefined ? 'não informado' : RelA4_moeda_(l.VALOR_ESTIMADO)],
    ['Fim das propostas', Lic_s_(l.ENCERRAMENTO_PROPOSTAS) ? LicRel_br_(l.ENCERRAMENTO_PROPOSTAS) + ' ' + Lic_s_(l.ENCERRAMENTO_PROPOSTAS).slice(11, 16) : '—'], ['Responsável', Lic_s_(l.RESPONSAVEL_NOME) || '—'],
    ['Versão da fonte', String(Number(l.VERSAO_FONTE) || 1) + ' · ' + Lic_s_(l.VERSAO_HASH).slice(0, 16)]]) + '<p>' + esc(Lic_texto_(l.OBJETO, 1500)) + '</p>' +
    LicRel_fonte_('LIC_OPORTUNIDADES (campos do PNCP sincronizados pelo coletor; versão ' + (Number(l.VERSAO_FONTE) || 1) + ' da fonte).'));
  // nota
  var a = d.analise, notaH;
  if (!a) notaH = '<p>Sem análise concluída.</p>';
  else {
    var crit = a.criterios || {};
    notaH = RelA4_kpis_([[a.nota === null || a.nota === undefined ? '—' : LicRel_num_(a.nota, 1), 'Nota (0 a 100)', a.classe === 'ALTA' ? 'ok' : a.classe === 'MEDIA' ? 'aviso' : 'critico'], [a.classeNome || a.classe || '—', 'Classe', ''], ['Versão ' + a.versao, 'Análise de ' + LicRel_br_(LicRel_diaSp_(a.em)), '']]) +
      RelA4_tabela_([{ t: 'Critério' }, { t: 'Pontos', num: true }, { t: 'Peso', num: true }, { t: 'Como saiu' }], Object.keys(crit).map(function (k) { var c = crit[k] || {}; return [LICREL_CRITERIOS[k] || k, LicRel_num_(c.pontos, 1), LicRel_num_(c.peso, 0), Lic_texto_(c.como, 400)]; }), { legenda: 'Critérios da nota', vazio: 'Sem critérios gravados.' }) +
      (a.resumo ? '<p>' + esc(Lic_texto_(a.resumo, 1500)) + '</p>' : '');
  }
  corpo += RelA4_secao_('Nota da análise', notaH + LicRel_fonte_(a ? 'LIC_ANALISES versão ' + a.versao + ' (concluída em ' + LicRel_br_(LicRel_diaSp_(a.em)) + ', regras ' + a.regras + ', hash ' + Lic_s_(a.hash).slice(0, 16) + '), com as decisões da Diretoria sobre as travas.' : 'LIC_ANALISES: nenhuma análise concluída desta oportunidade.'));
  // leitura
  var le = d.leitura, leH;
  if (!le) leH = '<p>Sem leitura do edital.</p>';
  else {
    var ck = le.checklist.slice(0, LICREL_CHECKLIST_MAX);
    leH = RelA4_identificacao_([['Versão', String(le.versao)], ['Situação', le.situacaoNome], ['Cobertura', le.cobertura || '—', { largo: true }]]) +
      RelA4_tabela_([{ t: 'Item', cen: true, w: '11mm' }, { t: 'Tema' }, { t: 'Frase do edital' }, { t: 'Onde' }], ck.map(function (it) {
        var f = (it.fontes || [])[0] || {};
        return [Lic_s_(it.id), Lic_s_(it.temaNome) + (Lic_s_(it.tipo) === 'PENDENCIA' ? ' (pendência)' : ''), Lic_texto_(it.trecho, 500), [Lic_s_(f.arquivo && (f.arquivo.titulo || f.arquivo.nome)), Lic_s_(f.rotulo)].filter(Boolean).join(', ') || '—'];
      }), { legenda: 'O que realmente precisamos (checklist da leitura)', vazio: le.ilegivel ? 'Checklist ilegível (refaça a leitura).' : 'Nenhum item.' }) +
      (le.checklist.length > ck.length ? '<p class="nota">Mais ' + (le.checklist.length - ck.length) + ' item(ns) na aba Leitura do edital.</p>' : '');
  }
  corpo += RelA4_secao_('Leitura do edital', leH + LicRel_fonte_(le ? 'LIC_LEITURAS versão ' + le.versao + ' (hash ' + le.hash.slice(0, 16) + ') e LIC_LEITURA_CHECKLIST: cada frase é o texto literal do edital, conferido pelo verificador.' : 'LIC_LEITURAS: nenhuma leitura desta oportunidade.'));
  // habilitação
  var hb = d.habilitacao, hbH;
  if (!hb) hbH = '<p>O cruzamento da habilitação não está disponível.</p>';
  else {
    var cn = hb.contagens || {};
    hbH = RelA4_kpis_([[String(cn.ATENDE || 0), 'Atendem', 'ok'], [String(cn.A_CONFERIR || 0), 'A conferir', cn.A_CONFERIR ? 'aviso' : ''], [String(cn.VENCE_ANTES || 0), 'Vencem antes da sessão', cn.VENCE_ANTES ? 'critico' : ''], [String((cn.FALTA || 0) + (cn.NAO_ATENDE || 0)), 'Faltam ou não atendem', (cn.FALTA || cn.NAO_ATENDE) ? 'critico' : '']]) +
      RelA4_tabela_([{ t: 'Exigência' }, { t: 'Frase do edital' }, { t: 'Situação' }], (hb.itens || []).slice(0, 60).map(function (e) { return [Lic_s_(e.ref), Lic_texto_(e.texto, 300), Lic_s_(e.efetivoNome) + ': ' + Lic_texto_(e.efetivoTexto, 240)]; }), { legenda: 'Exigências de habilitação e documentos', vazio: 'Sem exigências de habilitação lidas.' });
  }
  corpo += RelA4_secao_('Habilitação', hbH + LicRel_fonte_('Aba Habilitação: exigências da leitura (LIC_LEITURA_CHECKLIST) e da análise (LIC_ANALISES) cruzadas com LIC_HAB_DOCUMENTOS e as decisões da Diretoria (LIC_HAB_CONFERENCIAS)' + (hb && hb.sessao ? '; sessão ' + (LicRel_br_(hb.sessao.dia) || 'sem data') + ' (' + hb.sessao.fonte + ')' : '') + '.'));
  // preço
  var s = d.simulacao, pH;
  if (!s) pH = '<p>Sem simulação de preço salva.</p>';
  else {
    var t = (s.resultado && s.resultado.totais) || {};
    pH = RelA4_kpis_([[RelA4_moeda_(t.piso), 'Piso', ''], [RelA4_moeda_(t.alvo), 'Alvo', ''], [t.edital ? RelA4_moeda_(t.edital) : '—', 'Preço do edital' + (t.margemEditalPct !== null && t.margemEditalPct !== undefined ? ' (sobra ' + LicRel_num_(t.margemEditalPct, 1) + '%)' : ''), t.abaixoEdital ? 'critico' : ''],
      [t.proposta ? RelA4_moeda_(t.proposta) : '—', 'Proposta' + (t.margemPropostaPct !== null && t.margemPropostaPct !== undefined ? ' (sobra ' + LicRel_num_(t.margemPropostaPct, 1) + '%)' : ''), t.abaixoProposta ? 'critico' : '']]) +
      (s.integra ? '' : RelA4_caixa_('O registro desta simulação não confere com o hash gravado (alterado fora do SGO+).', 'critico')) +
      '<p>' + esc((s.resultado && s.resultado.pendencias ? s.resultado.pendencias.length : 0) + ' pendência(s) na simulação. ' + (t.abaixoProposta ? t.abaixoProposta + ' item(ns) da proposta abaixo do piso. ' : '') + 'Motivo da versão: ' + s.motivo) + '</p>';
  }
  corpo += RelA4_secao_('Preço', pH + LicRel_fonte_(s ? 'LIC_SIMULACOES versão ' + s.versao + ' (salva em ' + LicRel_br_(LicRel_diaSp_(s.em)) + ' por ' + s.por + ', hash ' + Lic_s_(s.hash).slice(0, 16) + ', política ' + s.politicaVersao + ').' : 'LIC_SIMULACOES: nenhuma simulação salva desta oportunidade.'));
  // propostas
  corpo += RelA4_secao_('Propostas', RelA4_tabela_([{ t: 'Versão', cen: true }, { t: 'Número' }, { t: 'Situação' }, { t: 'Total', num: true }, { t: 'Simulação', cen: true }, { t: 'Emitida' }, { t: 'SHA-256 do documento' }], d.propostas.map(function (p) {
    return [String(p.versao), p.numero, p.situacaoNome + (p.integra ? '' : ' (registro alterado fora do SGO+)'), RelA4_moeda_(p.total), p.simulacaoVersao ? 'v' + p.simulacaoVersao : '—', p.emitidoEm ? LicRel_br_(LicRel_diaSp_(p.emitidoEm)) + ' · ' + p.emitidoPor : '—', p.htmlSha256 ? p.htmlSha256.slice(0, 24) + '…' : '—'];
  }), { legenda: 'Versões da proposta', vazio: 'Nenhuma proposta montada.' }) + LicRel_fonte_('LIC_PROPOSTAS (uma linha por versão) e LIC_PROPOSTA_EDICOES; a emitida guarda o HTML A4 congelado com o SHA-256.'));
  // decisões e histórico
  var hist = d.historico.slice(-LICREL_HIST_MAX);
  corpo += RelA4_secao_('Decisões e histórico', RelA4_tabela_([{ t: 'Quando' }, { t: 'Quem' }, { t: 'O quê' }, { t: 'De → para' }, { t: 'Versão e hash' }], hist.map(function (h) {
    return [LicRel_br_(LicRel_diaSp_(h.DATA)) + ' ' + new Date(Date.parse(h.DATA) - 3 * 3600e3).toISOString().slice(11, 16), Lic_s_(h.USUARIO_NOME), Lic_s_(h.TIPO).replace(/_/g, ' ').toLowerCase() + ': ' + Lic_texto_(h.TEXTO, 300),
      (Lic_s_(h.DE) || Lic_s_(h.PARA)) ? Lic_texto_(Lic_s_(h.DE), 120) + ' → ' + Lic_texto_(Lic_s_(h.PARA), 120) : '—', [Lic_s_(h.VERSAO), Lic_s_(h.HASH).slice(0, 12)].filter(Boolean).join(' · ') || '—'];
  }), { legenda: 'Histórico da oportunidade (do mais antigo ao mais novo)', vazio: 'Sem registros.', compacta: true }) +
    (d.historico.length > hist.length ? '<p class="nota">Mostrados os ' + hist.length + ' registros mais novos de ' + d.historico.length + '.</p>' : '') + LicRel_fonte_('LIC_HISTORICO: ' + d.historico.length + ' registro(s) desta oportunidade (quem, quando, o quê, versão, fonte e hash).'));
  if (d.avisos.length) corpo += RelA4_secao_('Avisos da montagem', RelA4_paragrafos_(d.avisos.map(function (x) { return '- ' + x; }).join('\n')));
  return RelA4_documento_({ titulo: 'Relatório da oportunidade', subtitulo: [Lic_s_(l.CODIGO), Lic_s_(l.ORGAO_NOME)].filter(Boolean).join(' · '), tituloCurto: 'Relatório de licitação', tituloArquivo: 'Relatorio de licitacao',
    numero: o.numero, revisao: Math.max(0, (o.versao || 1) - 1), identificacao: Lic_s_(l.CODIGO), rotuloIdentificacao: 'Licitação', emitidoPor: o.por, ficha: [['Regras', LICREL_REGRAS]], corpo: corpo, capa: false, sumario: false });
}

// ------------------------------------------------------------ (b) relatório do período
function LicRel_validarPeriodo_(de, ate) {
  de = Lic_s_(de); ate = Lic_s_(ate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(de) || !/^\d{4}-\d{2}-\d{2}$/.test(ate)) throw new Error('Escolha as datas de início e de fim do período. Nada foi gerado');
  if (ate < de) throw new Error('O fim do período (' + LicRel_br_(ate) + ') é antes do começo (' + LicRel_br_(de) + '). Nada foi gerado');
  if ((Date.parse(ate + 'T12:00:00Z') - Date.parse(de + 'T12:00:00Z')) / 864e5 > LICREL_PERIODO_MAX_DIAS) throw new Error('O período pode ter até ' + LICREL_PERIODO_MAX_DIAS + ' dias. Nada foi gerado');
  return { de: de, ate: ate };
}
function LicRel_contar_(lista, fn) { var m = {}; lista.forEach(function (x) { var k = fn(x); if (k === null || k === undefined) return; m[k] = (m[k] || 0) + 1; }); return m; }
function LicRel_dadosPeriodo_(de, ate) {
  var dentro = function (iso) { var d = LicRel_diaSp_(iso); return !!d && d >= de && d <= ate; };
  var todas = Lic_ativas_(), novas = todas.filter(function (l) { return dentro(Lic_s_(l.PRIMEIRA_COLETA_EM) || Lic_s_(l.CRIADO_EM)); });
  var d = { de: de, ate: ate, novas: novas.length, total: todas.length };
  d.porSituacao = LicRel_contar_(novas, function (l) { return Lic_s_(l.SITUACAO) || 'RADAR'; });
  d.porUf = LicRel_contar_(novas, function (l) { return Lic_up_(l.UF) || 'sem UF'; });
  var comNota = novas.filter(function (l) { return l.NOTA !== '' && l.NOTA !== null && l.NOTA !== undefined && isFinite(Number(l.NOTA)); });
  d.notas = { qtd: comNota.length, media: comNota.length ? Math.round(comNota.reduce(function (s, l) { return s + Number(l.NOTA); }, 0) / comNota.length * 10) / 10 : null, porClasse: LicRel_contar_(comNota, function (l) { return Lic_s_(l.NOTA_CLASSE) || 'sem classe'; }) };
  d.prazos = todas.filter(function (l) { return dentro(l.ENCERRAMENTO_ISO); }).sort(function (a, b) { return Lic_s_(a.ENCERRAMENTO_ISO) < Lic_s_(b.ENCERRAMENTO_ISO) ? -1 : 1; })
    .map(function (l) { return { codigo: Lic_s_(l.CODIGO), orgao: Lic_texto_(l.ORGAO_NOME, 90), uf: Lic_s_(l.UF), quando: Lic_s_(l.ENCERRAMENTO_ISO), situacao: LIC_SITUACAO_NOMES[Lic_s_(l.SITUACAO)] || Lic_s_(l.SITUACAO), nota: l.NOTA === '' || l.NOTA === undefined || l.NOTA === null ? null : Number(l.NOTA) }; });
  var al = Lic_ler_(LIC_ABAS.ALERTAS).filter(function (a) { return dentro(a.CRIADO_EM); });
  d.alertas = { total: al.length, porSituacao: LicRel_contar_(al, function (a) { return Lic_up_(a.SITUACAO) || 'SEM_SITUACAO'; }), porNivel: LicRel_contar_(al, function (a) { return Lic_up_(a.NIVEL) || 'NORMAL'; }),
    semCiencia: al.filter(function (a) { return !Lic_s_(a.CIENTE_EM) && ['ENVIADO', 'FALHOU', 'ESCALONADO', 'NO_RESUMO'].indexOf(Lic_up_(a.SITUACAO)) >= 0; }).length };
  var an = Lic_ler_(LIC_ABAS.ANALISES).filter(function (a) { return dentro(a.CRIADO_EM); });
  d.analises = { total: an.length, porSituacao: LicRel_contar_(an, function (a) { return Lic_up_(a.SITUACAO) || 'SEM_SITUACAO'; }) };
  var props = Lic_ler_(typeof LICPROP_ABAS !== 'undefined' ? LICPROP_ABAS.PROPOSTAS : 'LIC_PROPOSTAS').filter(function (p) { return Lic_up_(p.SITUACAO) === 'EMITIDA' && dentro(p.EMITIDO_EM); });
  d.propostas = props.map(function (p) { return { codigo: Lic_s_(p.CODIGO), numero: Lic_s_(p.NUMERO), total: Number(p.TOTAL) || 0, em: Lic_s_(p.EMITIDO_EM), por: Lic_s_(p.EMITIDO_POR_NOME), sha256: Lic_s_(p.HTML_SHA256) }; });
  d.resultados = todas.filter(function (l) { return ['RESULTADO', 'CONTRATO'].indexOf(Lic_s_(l.SITUACAO)) >= 0; }).map(function (l) { return { codigo: Lic_s_(l.CODIGO), orgao: Lic_texto_(l.ORGAO_NOME, 90), situacao: LIC_SITUACAO_NOMES[Lic_s_(l.SITUACAO)], desde: Lic_s_(l.SITUACAO_DESDE) }; });
  var hist = Lic_ler_(LIC_ABAS.HISTORICO).filter(function (h) { return dentro(h.DATA); });
  d.descartes = hist.filter(function (h) { return Lic_s_(h.TIPO) === 'DESCARTADA_PELA_DIRETORIA'; }).length;
  d.mudancasEtapa = hist.filter(function (h) { return /^(ENVIADA_PARA_ANALISE|ETAPA_|KANBAN|MOVIDA)/.test(Lic_s_(h.TIPO)); }).length;
  return d;
}
function LicRel_tabelaContagem_(m, nomes, legenda, rotulo) {
  var ks = Object.keys(m).sort(function (a, b) { return m[b] - m[a] || (a < b ? -1 : 1); });
  return RelA4_tabela_([{ t: rotulo || 'Grupo' }, { t: 'Quantidade', num: true }], ks.map(function (k) { return [(nomes && nomes[k]) || k, String(m[k])]; }), { legenda: legenda, vazio: 'Nenhum registro no período.' });
}
function LicRel_htmlPeriodo_(d, o) {
  var corpo = '', per = LicRel_br_(d.de) + ' a ' + LicRel_br_(d.ate);
  corpo += RelA4_secao_('Resumo do período', RelA4_kpis_([[String(d.novas), 'Oportunidades novas (primeira coleta)', ''], [d.notas.media === null ? '—' : LicRel_num_(d.notas.media, 1), 'Nota média (' + d.notas.qtd + ' com nota)', ''],
    [String(d.prazos.length), 'Fins de proposta no período', ''], [String(d.alertas.total), 'Alertas criados', d.alertas.semCiencia ? 'aviso' : ''], [String(d.propostas.length), 'Propostas emitidas', d.propostas.length ? 'ok' : ''], [String(d.resultados.length), 'Em resultado ou contrato (hoje)', '']]) +
    LicRel_fonte_('LIC_OPORTUNIDADES (' + d.total + ' ativas; ' + d.novas + ' com a primeira coleta entre ' + per + ', dia de Brasília), LIC_ALERTAS, LIC_PROPOSTAS e LIC_HISTORICO no mesmo período.'));
  corpo += RelA4_secao_('Oportunidades por etapa', LicRel_tabelaContagem_(d.porSituacao, LIC_SITUACAO_NOMES, 'Oportunidades novas no período, pela etapa de hoje', 'Etapa') + LicRel_fonte_('LIC_OPORTUNIDADES.SITUACAO das ' + d.novas + ' oportunidades com PRIMEIRA_COLETA_EM no período (a etapa é a de hoje, não a do fim do período). ' + d.descartes + ' descarte(s) pela Diretoria e ' + d.mudancasEtapa + ' envio(s) para análise ou mudança de etapa registrados no LIC_HISTORICO no período.'));
  corpo += RelA4_secao_('Oportunidades por UF', LicRel_tabelaContagem_(d.porUf, null, 'Oportunidades novas no período por UF', 'UF') + LicRel_fonte_('LIC_OPORTUNIDADES.UF (campo do PNCP) das oportunidades novas no período.'));
  corpo += RelA4_secao_('Notas', LicRel_tabelaContagem_(d.notas.porClasse, typeof LIC_CLASSES !== 'undefined' ? LIC_CLASSES : null, 'Oportunidades novas com nota, por classe', 'Classe') + LicRel_fonte_('LIC_OPORTUNIDADES.NOTA e NOTA_CLASSE (última análise concluída, com as decisões das travas) das ' + d.notas.qtd + ' oportunidades novas que têm nota. ' + d.analises.total + ' análise(s) gravada(s) no período em LIC_ANALISES (' + Object.keys(d.analises.porSituacao).map(function (k) { return k.toLowerCase() + ' ' + d.analises.porSituacao[k]; }).join(', ') + ').'));
  corpo += RelA4_secao_('Prazos de proposta no período', RelA4_tabela_([{ t: 'Licitação' }, { t: 'Órgão' }, { t: 'UF', cen: true }, { t: 'Fim das propostas' }, { t: 'Etapa' }, { t: 'Nota', num: true }], d.prazos.slice(0, 80).map(function (p) {
    return [p.codigo, p.orgao, p.uf, LicRel_br_(LicRel_diaSp_(p.quando)) + ' ' + new Date(Date.parse(p.quando) - 3 * 3600e3).toISOString().slice(11, 16), p.situacao, p.nota === null ? '—' : LicRel_num_(p.nota, 1)];
  }), { legenda: 'Fim do recebimento das propostas entre ' + per, vazio: 'Nenhum fim de proposta no período.', compacta: true }) + LicRel_fonte_('LIC_OPORTUNIDADES.ENCERRAMENTO_ISO (fim das propostas no PNCP, horário de Brasília) de todas as oportunidades ativas.'));
  corpo += RelA4_secao_('Alertas', LicRel_tabelaContagem_(d.alertas.porSituacao, null, 'Alertas criados no período por situação', 'Situação') + LicRel_tabelaContagem_(d.alertas.porNivel, null, 'Alertas criados no período por nível', 'Nível') +
    '<p>' + RelA4_esc_(d.alertas.semCiencia + ' alerta(s) enviado(s) sem ciência.') + '</p>' + LicRel_fonte_('LIC_ALERTAS com CRIADO_EM no período (' + d.alertas.total + ' linhas: uma por prazo, antecedência e pessoa, mais escalonamentos e reenvios). Sem ciência = enviado, falhou, escalonado ou no resumo, sem CIENTE_EM.'));
  corpo += RelA4_secao_('Propostas emitidas', RelA4_tabela_([{ t: 'Licitação' }, { t: 'Número' }, { t: 'Total', num: true }, { t: 'Emitida em' }, { t: 'Por' }, { t: 'SHA-256 do documento' }], d.propostas.map(function (p) {
    return [p.codigo, p.numero, RelA4_moeda_(p.total), LicRel_br_(LicRel_diaSp_(p.em)), p.por, p.sha256.slice(0, 24) + '…'];
  }), { legenda: 'Propostas emitidas no período', vazio: 'Nenhuma proposta emitida no período.' }) + LicRel_fonte_('LIC_PROPOSTAS com SITUACAO = EMITIDA e EMITIDO_EM no período; o total é o da simulação de preço salva usada na proposta.'));
  corpo += RelA4_secao_('Resultados', RelA4_tabela_([{ t: 'Licitação' }, { t: 'Órgão' }, { t: 'Etapa' }, { t: 'Desde' }], d.resultados.map(function (r) { return [r.codigo, r.orgao, r.situacao, LicRel_br_(LicRel_diaSp_(r.desde)) || '—']; }),
    { legenda: 'Oportunidades em Resultado ou Contrato (hoje)', vazio: 'Nenhuma oportunidade em Resultado ou Contrato.' }) + LicRel_fonte_('LIC_OPORTUNIDADES.SITUACAO = RESULTADO ou CONTRATO, hoje. O SGO+ ainda não registra o vencedor nem o valor homologado (etapa de disputa e resultado ainda não construída).'));
  return RelA4_documento_({ titulo: 'Relatório do período de Licitações', subtitulo: per, tituloCurto: 'Relatório de Licitações', tituloArquivo: 'Relatorio de Licitacoes', numero: o.numero, revisao: Math.max(0, (o.versao || 1) - 1),
    identificacao: per, rotuloIdentificacao: 'Período', emitidoPor: o.por, ficha: [['Regras', LICREL_REGRAS]], corpo: corpo, capa: false, sumario: false });
}

// ------------------------------------------------------------ gerar (versão imutável) e abrir
function LicRel_gravar_(eu, tipo, chave, extra, montarHtml, dados, resumo, titulo, historico) {
  return Lic_comTrava_(function () {
    var ant = LicRel_lista_().filter(function (r) { return Lic_s_(r.CHAVE) === chave; }), versao = ant.reduce(function (m, r) { return Math.max(m, Number(r.VERSAO) || 0); }, 0) + 1;
    var numero = (tipo === 'OPORTUNIDADE' ? 'REL-' + extra.CODIGO : 'REL-PER-' + extra.PERIODO_DE.replace(/-/g, '') + '-' + extra.PERIODO_ATE.replace(/-/g, '')) + '-V' + (versao < 10 ? '0' : '') + versao, agora = Lic_agora_();
    var html = montarHtml({ numero: numero, versao: versao, por: eu.nome });
    var g = LicDoc_salvarHtml_(tipo === 'OPORTUNIDADE' ? extra.CODIGO : 'Relatórios do período', numero, html, {});
    var reg = Object.assign({ TIPO: tipo, CHAVE: chave, VERSAO: versao, NUMERO: numero, TITULO: Lic_texto_(titulo, 300), RESUMO: Lic_texto_(resumo, 1000), DADOS_HASH: Lic_hash_(JSON.stringify(dados)), HTML_ARQUIVO_ID: g.id, HTML_SHA256: g.sha256, HTML_TAMANHO: g.tamanho, POR_ID: eu.id, POR_NOME: eu.nome, EM: agora }, extra);
    reg.HASH = LicRel_hashReg_(reg);
    var ins = SGO_DATA.insert(LICREL_ABA, reg); reg.ID = Lic_s_(ins && ins.ID);
    historico(reg);
    return { relatorio: LicRel_resumoReg_(reg), html: html, texto: LICREL_TIPOS[tipo] + ' ' + numero + ' gerado e guardado (versão ' + versao + ', SHA-256 ' + g.sha256.slice(0, 16) + '…). Ele não muda: para outro, gere de novo.' };
  });
}
function LicRel_gerarOportunidade_(eu, d) {
  var l = Lic_acharOp_(d.id), dados = LicRel_dadosOportunidade_(l);
  var resumo = 'Nota ' + (dados.analise && dados.analise.nota !== null && dados.analise.nota !== undefined ? LicRel_num_(dados.analise.nota, 1) : '—') + '; leitura ' + (dados.leitura ? 'v' + dados.leitura.versao + ' com ' + dados.leitura.checklist.length + ' item(ns)' : 'sem') +
    '; habilitação ' + (dados.habilitacao ? (dados.habilitacao.contagens.pendencias || 0) + ' pendência(s)' : '—') + '; simulação ' + (dados.simulacao ? 'v' + dados.simulacao.versao : 'sem') + '; ' + dados.propostas.length + ' versão(ões) de proposta; ' + dados.historico.length + ' registro(s) no histórico.';
  return LicRel_gravar_(eu, 'OPORTUNIDADE', 'OP:' + Lic_s_(l.ID), { OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), PERIODO_DE: '', PERIODO_ATE: '' }, function (o) { return LicRel_htmlOportunidade_(l, dados, o); }, dados, resumo, 'Relatório da oportunidade ' + Lic_s_(l.CODIGO),
    function (reg) { Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'RELATORIO_GERADO', eu, { para: reg.NUMERO, texto: 'Relatório da oportunidade gerado em A4 e guardado (SHA-256 ' + reg.HTML_SHA256 + '). ' + resumo, versao: 'relatório ' + reg.VERSAO + ' · ' + LICREL_REGRAS, fonte: 'Licitações › Relatórios', hash: reg.HASH }); });
}
function LicRel_gerarPeriodo_(eu, d) {
  var p = LicRel_validarPeriodo_(d.de, d.ate), dados = LicRel_dadosPeriodo_(p.de, p.ate);
  var resumo = dados.novas + ' oportunidade(s) nova(s), ' + dados.prazos.length + ' fim(ns) de proposta, ' + dados.alertas.total + ' alerta(s), ' + dados.propostas.length + ' proposta(s) emitida(s), ' + dados.resultados.length + ' em resultado ou contrato.';
  return LicRel_gravar_(eu, 'PERIODO', 'PERIODO:' + p.de + ':' + p.ate, { OPORTUNIDADE_ID: '', CODIGO: '', PERIODO_DE: p.de, PERIODO_ATE: p.ate }, function (o) { return LicRel_htmlPeriodo_(dados, o); }, dados, resumo, 'Relatório do período ' + LicRel_br_(p.de) + ' a ' + LicRel_br_(p.ate),
    function (reg) { Lic_historico_('RELATORIO', reg.ID, reg.NUMERO, 'RELATORIO_GERADO', eu, { para: reg.NUMERO, texto: 'Relatório do período ' + LicRel_br_(p.de) + ' a ' + LicRel_br_(p.ate) + ' gerado em A4 e guardado (SHA-256 ' + reg.HTML_SHA256 + '). ' + resumo, versao: 'relatório ' + reg.VERSAO + ' · ' + LICREL_REGRAS, fonte: 'Licitações › Relatórios', hash: reg.HASH }); });
}
function LicRel_ver_(eu, d) {
  var r = SGO_DATA.getById(LICREL_ABA, Lic_s_(d.relatorioId));
  if (!r || !Lic_s_(r.TIPO)) throw new Error('Não foi possível abrir: o relatório não foi encontrado (a lista pode estar desatualizada). Toque em "Atualizar" e tente de novo');
  var lido = LicDoc_lerHtml_(r.HTML_ARQUIVO_ID, r.HTML_SHA256);
  return { html: lido.html, integra: lido.integra && LicRel_hashReg_(r) === Lic_s_(r.HASH), relatorio: LicRel_resumoReg_(r) };
}
function LicRel_tela_(eu, d) {
  // mais novo primeiro (no mesmo instante, o gravado depois)
  var lista = LicRel_lista_().map(function (r, i) { r._i = i; return r; }).sort(function (a, b) { return Lic_s_(b.EM) < Lic_s_(a.EM) ? -1 : Lic_s_(b.EM) > Lic_s_(a.EM) ? 1 : b._i - a._i; });
  var oid = Lic_s_(d && d.id);
  if (oid) lista = lista.filter(function (r) { return Lic_s_(r.OPORTUNIDADE_ID) === oid; });
  var hoje = LicRel_diaSp_(Lic_agora_());
  return { relatorios: lista.slice(0, 100).map(LicRel_resumoReg_), total: lista.length, hoje: hoje, inicioMes: hoje.slice(0, 8) + '01',
    oportunidades: Lic_ativas_().filter(function (l) { return Lic_s_(l.SITUACAO) !== 'DESCARTADA'; }).sort(function (a, b) { return Lic_s_(b.CODIGO) < Lic_s_(a.CODIGO) ? -1 : 1; }).slice(0, 300)
      .map(function (l) { return { id: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), orgao: Lic_texto_(l.ORGAO_NOME, 90), uf: Lic_s_(l.UF), situacao: LIC_SITUACAO_NOMES[Lic_s_(l.SITUACAO)] || Lic_s_(l.SITUACAO) }; }), regras: LICREL_REGRAS };
}

// ------------------------------------------------------------ ações (Licitacoes_api 'relatorios', { op })
var LICREL_OPS = {
  tela: function (eu, d) { return LicRel_tela_(eu, d); },
  gerarOportunidade: function (eu, d) { return LicRel_gerarOportunidade_(eu, d); },
  gerarPeriodo: function (eu, d) { return LicRel_gerarPeriodo_(eu, d); },
  ver: function (eu, d) { return LicRel_ver_(eu, d); }
};
function LicRel_acao_(eu, d) {
  Lic_exigir_(eu, 'usar os relatórios de licitação');
  var fn = LICREL_OPS[Lic_s_(d && d.op)];
  if (!fn) throw new Error('Não foi possível: ação de relatório desconhecida (' + Lic_s_(d && d.op) + '). Atualize a página (F5) e tente de novo');
  LicRel_garantirAbas_();
  try { if (typeof LicProp_garantirAbas_ === 'function') LicProp_garantirAbas_(); } catch (e) {}
  return fn(eu, d || {});
}
