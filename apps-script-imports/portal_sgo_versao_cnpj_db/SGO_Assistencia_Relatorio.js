/****************************************************
 * ASSISTÊNCIA TÉCNICA — DOCUMENTOS A4 E INDICADORES (21/10/2026)
 *
 * Relatório da O.S. (padrão A4 do SGO+: SGO_DocA4 + blocos RelA4): identificação, chamado, atendimento com as horas do
 * aparelho e do servidor, serviço, checklist, peças, fotos, assinatura, prazo e linha do tempo. Enquanto a O.S. não
 * fecha sai marcado como RASCUNHO. Nenhuma versão é sobrescrita (OS-2026-0007 v1, v2...). Salvo em HTML e PDF na pasta
 * "4. Ordens de Serviço" do equipamento (prontuário do QR) e registrado no Arquivo de documentos; "Enviar ao cliente"
 * usa o Enviar documento do SGO+.
 * Orçamento do chamado (peça ou serviço fora do contrato): A4 numerado, aprovação do cliente com o aceite anexado,
 * atividade para o Comercial e pedido em Compras para as peças aprovadas. O técnico não vê valores.
 * Indicadores (SLA cumprido, tempo de atendimento, reincidência por equipamento, O.S. por técnico) e relatório mensal A4,
 * que entra no e-mail mensal da Diretoria (Caixa de decisões, como Comercial e Compras).
 ****************************************************/

var AST_REL_MAX_FOTOS = 12;
var AST_PASTA_ORCAMENTOS = 'Assistência técnica - Orçamentos';
var AST_PASTA_RELMES = 'Assistência técnica - Relatórios mensais';

function AstR_b64Arquivo_(id) {
  try { var b = DriveApp.getFileById(String(id)).getBlob(); return { mime: b.getContentType() || 'image/jpeg', data: Utilities.base64Encode(b.getBytes()) }; } catch (e) { return null; }
}

/** HTML A4 do relatório da O.S. (sem salvar). */
function AstR_htmlOS_(os, opcoes) {
  var o = opcoes || {};
  var c = Ast_porId_(AST_ABAS.CHAMADOS, os.CHAMADO_ID) || {}, eq = Ast_mapa_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS)[Ast_s_(os.EQUIPAMENTO_ID)] || {};
  var cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(os.CLIENTE_ID)] || {}, tipo = Ast_tipo_(os.TIPO_CODIGO) || { nome: Ast_s_(os.TIPO_NOME), exige: {} };
  var rascunho = Ast_up_(os.SITUACAO) !== 'ENCERRADA';
  var corpo = '';
  if (rascunho) corpo += RelA4_caixa_('RASCUNHO: a O.S. ainda não foi encerrada' + (Ast_s_(os.FALTAS) ? ' (falta: ' + Ast_s_(os.FALTAS) + ')' : '') + '. Este documento não vale como relatório final.', 'aviso');
  corpo += RelA4_secao_('Identificação', RelA4_identificacao_([
    ['Cliente', Ast_s_(os.CLIENTE_NOME) || Ast_clienteNome_(cli), { largo: true }], ['CNPJ', Ast_s_(cli.CNPJ)], ['Unidade', Ast_s_(os.UNIDADE_NOME)],
    ['Endereço', Ast_s_(os.ENDERECO), { largo: true }], ['Equipamento', [Ast_s_(eq.TIPO), Ast_s_(eq.MODELO)].filter(Boolean).join(' · ') || Ast_s_(os.EQUIPAMENTO_TEXTO)],
    ['TAG', Ast_s_(eq.TAG)], ['Nº de série (cadastro)', Ast_s_(os.SERIE_CADASTRO) || Ast_s_(eq.SERIE)], ['Nº de série (conferido no local)', Ast_s_(os.SERIE_CONFIRMADA) + (Ast_sim_(os.SERIE_DIVERGENTE) ? ' (DIVERGENTE do cadastro)' : '')],
    ['Setor', Ast_s_(eq.SETOR)], ['Patrimônio', Ast_s_(eq.PATRIMONIO)],
    // 22/10/2026: identificação completa do cadastro do equipamento (campo vazio não aparece).
    ['Fabricante (marca)', Ast_s_(eq.FABRICANTE)], ['Capacidade ou volume', Ast_s_(eq.CAPACIDADE)], ['Ano de fabricação', Ast_s_(eq.ANO_FABRICACAO)]
  ].filter(function (p) { return ['Patrimônio', 'Fabricante (marca)', 'Capacidade ou volume', 'Ano de fabricação'].indexOf(p[0]) < 0 || Ast_s_(p[1]); })));
  var sla = c.ID ? Ast_slaEstado_(c, Date.now()) : null;
  corpo += RelA4_secao_('Chamado', RelA4_identificacao_([['Chamado', Ast_s_(os.CHAMADO_NUMERO)], ['Aberto em', Ast_br_(c.ABERTO_EM)], ['Solicitante', Ast_s_(c.SOLICITANTE)], ['Canal', AST_CANAIS[Ast_up_(c.CANAL)] || ''],
    ['Prioridade', AST_PRIORIDADES[Ast_up_(c.PRIORIDADE)] || ''], ['Prazo de atendimento', sla ? sla.texto : '—'], ['Problema relatado', Ast_s_(c.SINTOMA), { largo: true }]]));
  var linhaHora = function (srv, ap) { var t = Ast_br_(srv); var a = Ast_ms_(ap), b = Ast_ms_(srv); if (t && a !== null && b !== null && Math.abs(a - b) > 5 * 60000) t += ' (no aparelho: ' + Ast_br_(ap) + ')'; return t; };
  var dur = Ast_ms_(os.CHEGOU_EM) !== null && Ast_ms_(os.CONCLUIU_EM) !== null ? Ast_duracaoTxt_((Ast_ms_(os.CONCLUIU_EM) - Ast_ms_(os.CHEGOU_EM)) / 60000) : '';
  corpo += RelA4_secao_('Atendimento', RelA4_identificacao_([['Tipo de serviço', tipo.nome], ['Técnico', Ast_s_(os.TECNICO_NOME)], ['Agendado para', Ast_br_(os.AGENDADO_PARA)],
    ['Chegada', linhaHora(os.CHEGOU_EM, os.CHEGOU_EM_APARELHO)], ['Conclusão', linhaHora(os.CONCLUIU_EM, os.CONCLUIU_EM_APARELHO)], ['Tempo no local', dur],
    ['Equipamento conferido por', { QR: 'leitura do QR', SERIE: 'número de série', TAG: 'TAG' }[Ast_up_(os.IDENTIFICADO_POR)] || '—'], ['Observação da localização', Ast_s_(os.OBS_LOCALIZACAO) || '—', { largo: true }]]));
  var serv = '';
  [['Condição encontrada', os.CONDICAO_ENCONTRADA], ['Causa ou diagnóstico', os.CAUSA], ['Serviço realizado', os.SERVICO_REALIZADO], ['Relato do técnico', os.RELATO], ['Teste funcional', os.TESTE_FUNCIONAL], ['Recomendações', os.RECOMENDACOES]]
    .forEach(function (x) { if (Ast_s_(x[1])) serv += RelA4_subsecao_(x[0], RelA4_paragrafos_(x[1])); });
  corpo += RelA4_secao_('Serviço', serv || '<p class="nota">Sem relato registrado.</p>');
  var resp = AstO_respostas_(os), perg = AstO_perguntas_(os), fotos = AstO_fotos_(os.ID);
  if (perg.length) {
    corpo += RelA4_secao_('Checklist', RelA4_tabela_([{ t: 'Item' }, { t: 'Resposta' }], perg.map(function (p) {
      if (p.tipo === 'FOTO') { var n = fotos.filter(function (f) { return Ast_s_(f.PERGUNTA_ID) === p.id; }).length; return [p.texto, n ? Ast_plural_(n, 'foto anexada', 'fotos anexadas') : '—']; }
      var r = resp[p.id], v = r ? (Array.isArray(r.v) ? r.v.join(', ') : String(r.v)) : '—';
      if (p.tipo === 'SIM_NAO') v = { SIM: 'Sim', NAO: 'Não', NA: 'Não se aplica' }[v] || v;
      return [p.texto, v];
    }), { legenda: 'Checklist ' + ((Ast_modelo_(os.MODELO_CODIGO) || {}).nome || '') }));
  }
  var pecas = AstO_pecas_(os.ID);
  corpo += RelA4_secao_('Peças', RelA4_tabela_([{ t: 'Peça' }, { t: 'Código' }, { t: 'Qtd.', num: true }, { t: 'Situação' }], pecas.map(function (p) {
    return [Ast_s_(p.DESCRICAO), Ast_s_(p.CODIGO), Ast_fmtNum_(Number(p.QUANTIDADE) || 0, Math.round(Number(p.QUANTIDADE)) === Number(p.QUANTIDADE) ? 0 : 2) + ' ' + Ast_s_(p.UNIDADE), Ast_up_(p.SITUACAO) === 'FALTA' ? 'Em falta' + (Ast_s_(p.REQUISICAO_NUMERO) ? ' (pedido ' + Ast_s_(p.REQUISICAO_NUMERO) + ')' : '') : 'Aplicada'];
  }), { vazio: 'Nenhuma peça aplicada.' }));
  if (fotos.length) {
    var lf = [];
    fotos.slice(0, AST_REL_MAX_FOTOS).forEach(function (f) {
      var b = AstR_b64Arquivo_(f.ARQUIVO_ID);
      if (b) lf.push({ base64: b.data, mimeType: b.mime, legenda: Ast_s_(f.LEGENDA) || ((perg.filter(function (p) { return p.id === Ast_s_(f.PERGUNTA_ID); })[0] || {}).texto || '') + ' · ' + Ast_br_(f.TIRADA_EM || f.RECEBIDA_EM) });
      b = null;
    });
    corpo += RelA4_secao_('Fotos', (typeof SGO_DocA4_fotos_ === 'function' ? SGO_DocA4_fotos_(lf) : '') + (fotos.length > AST_REL_MAX_FOTOS ? '<p class="nota">Mais ' + (fotos.length - AST_REL_MAX_FOTOS) + ' foto(s) guardadas no SGO+ (O.S. ' + Ast_esc_(os.NUMERO) + ').</p>' : ''));
    lf = null;
  }
  var ass = [];
  var img = Ast_s_(os.ASSINATURA_ARQUIVO_ID) ? AstR_b64Arquivo_(os.ASSINATURA_ARQUIVO_ID) : null;
  ass.push({ papel: 'Recebido por (cliente)', nome: Ast_s_(os.ASSINATURA_NOME) || Ast_s_(os.SEM_ASSINATURA_RECEBIDO_POR) || ' ', cargo: Ast_s_(os.ASSINATURA_DOCUMENTO) || (Ast_s_(os.SEM_ASSINATURA_MOTIVO) ? 'Sem assinatura: ' + (AST_MOTIVOS_SEM_ASSINATURA[Ast_up_(os.SEM_ASSINATURA_MOTIVO)] || '') : ''),
    imagemBase64: img ? { mimeType: 'image/png', data: img.data } : null });
  ass.push({ papel: 'Técnico responsável', nome: Ast_s_(os.TECNICO_NOME), cargo: 'Metrolabs' });
  corpo += RelA4_secao_('Assinaturas', (typeof SGO_DocA4_assinaturas_ === 'function' ? SGO_DocA4_assinaturas_(ass) : '') +
    (Ast_s_(os.SEM_ASSINATURA_JUSTIFICATIVA) ? '<p class="nota">Justificativa da falta de assinatura: ' + Ast_esc_(os.SEM_ASSINATURA_JUSTIFICATIVA) + '</p>' : '') +
    (Ast_s_(os.ASSINATURA_EM) ? '<p class="nota">Assinado na tela do aparelho em ' + Ast_esc_(Ast_br_(os.ASSINATURA_EM)) + '.</p>' : ''));
  if (Ast_s_(os.DOC_TECNICO_REF)) corpo += RelA4_secao_('Documento técnico', '<p>Documento emitido para este atendimento: ' + Ast_esc_(os.DOC_TECNICO_REF) + (Ast_s_(os.DOC_TECNICO_URL) ? ' (' + Ast_esc_(os.DOC_TECNICO_URL) + ')' : '') + '.</p>');
  var evs = Ast_ler_(AST_ABAS.EVENTOS).filter(function (e) { return (Ast_up_(e.ENTIDADE) === 'OS' && Ast_s_(e.ENTIDADE_ID) === Ast_s_(os.ID)) || (Ast_up_(e.ENTIDADE) === 'CHAMADO' && Ast_s_(e.ENTIDADE_ID) === Ast_s_(os.CHAMADO_ID) && Ast_sim_(e.PUBLICO)); })
    .sort(function (a, b) { return String(a.EM).localeCompare(String(b.EM)); });
  corpo += RelA4_secao_('Linha do tempo', RelA4_tabela_([{ t: 'Quando', nw: true }, { t: 'O que aconteceu' }, { t: 'Por' }], evs.slice(-40).map(function (e) {
    return [Ast_br_(e.EM), Ast_s_(e.TEXTO).slice(0, 300) || [Ast_s_(e.DE), Ast_s_(e.PARA)].filter(Boolean).join(' → '), Ast_s_(e.USUARIO_NOME)];
  }), { vazio: 'Sem registros.' }));
  corpo += '<p class="nota" style="margin-top:4mm">Marca de conferência do conteúdo: ' + Ast_esc_(o.marca || '') + '. Qualquer alteração no conteúdo deste relatório muda esta marca.</p>';
  return RelA4_documento_({ titulo: 'Relatório de atendimento técnico' + (rascunho ? ' (rascunho)' : ''), subtitulo: Ast_s_(os.CLIENTE_NOME), tituloCurto: 'Relatório da O.S.', tituloArquivo: 'Relatorio da OS',
    // 22/10/2026: a revisão do cabeçalho é a revisão de verdade (0 na emissão; 1, 2... só com "Abrir para corrigir" e motivo), não a contagem de versões
    numero: Ast_s_(os.NUMERO), revisao: Number(o.revisao) || 0, identificacao: Ast_s_(os.EQUIPAMENTO_TEXTO) || Ast_s_(os.CLIENTE_NOME), rotuloIdentificacao: 'Equipamento',
    ficha: [['Tipo de serviço', tipo.nome], ['Técnico', Ast_s_(os.TECNICO_NOME)], ['Situação', rascunho ? 'Rascunho' : 'Encerrada em ' + Ast_br_(os.ENCERRADA_EM)]], corpo: corpo, capa: false, sumario: false });
}

/**
 * Registro do relatório encerrado no Arquivo de documentos (tipo "ORDEM DE SERVIÇO"). Com sessão de usuário, pelo
 * módulo Documentos; sem sessão (rotina, gancho de outro módulo), pela identidade do sistema, direto na tabela, com os
 * mesmos campos. 22/10/2026 (etapa 2): antes, o relatório fechado pela rotina não entrava no Arquivo. Nunca lança.
 */
function AstR_registrarNoArquivo_(eu, os, nomeArquivo, url) {
  if (!Ast_s_(os.UNIDADE_ID) || !Ast_s_(url)) return false;
  if (eu && eu.sessionId && typeof SGO_DOCUMENTOS !== 'undefined' && SGO_DOCUMENTOS.registrarDocumentoExistente) {
    try { var rr = SGO_DOCUMENTOS.registrarDocumentoExistente(eu.sessionId, { CLIENTE_ID: os.CLIENTE_ID, UNIDADE_ID: os.UNIDADE_ID, EQUIPAMENTO_ID: os.EQUIPAMENTO_ID, TIPO_DOCUMENTO: 'ORDEM DE SERVIÇO', NOME_ARQUIVO: nomeArquivo, LINK_ARQUIVO: url, DATA_VENCIMENTO: '' }); if (rr && rr.success) return true; } catch (eR) { /* tenta pela identidade do sistema */ }
  }
  try {
    var aba = (SGO_CFG.SHEETS && SGO_CFG.SHEETS.DOC_DOCUMENTOS) || 'DOC_DOCUMENTOS';
    var reg = { CLIENTE_ID: Ast_s_(os.CLIENTE_ID), UNIDADE_ID: Ast_s_(os.UNIDADE_ID), EQUIPAMENTO_ID: Ast_s_(os.EQUIPAMENTO_ID), TIPO_DOCUMENTO: 'ORDEM DE SERVIÇO', NOME_ARQUIVO: Ast_up_(nomeArquivo),
      LINK_ARQUIVO: Ast_s_(url), DATA_EMISSAO: Ast_agora_(), DATA_VENCIMENTO: '', STATUS: 'ATIVO', OBSERVACOES: 'Registrado pela ' + ((eu && eu.nome) || 'rotina da Assistência técnica') };
    if (typeof SGO_DATA.gerarRegistroBase === 'function') reg = SGO_DATA.gerarRegistroBase(reg);
    if (typeof SGO_DATA.normalizarObjetoParaSheet === 'function') reg = SGO_DATA.normalizarObjetoParaSheet(aba, reg);
    SGO_DATA.insert(aba, reg);
    try { SGO_DATA.log('DOCUMENTOS_REGISTRAR_EXISTENTE', (eu && eu.nome) || 'Rotina da Assistência', 'Relatório da O.S. registrado pela rotina: ' + nomeArquivo, 'DOCUMENTOS'); } catch (eL) {}
    return true;
  } catch (e) { console.error('Assistência, Arquivo de documentos: ' + ((e && e.message) || e)); return false; }
}

/**
 * Emite o relatório da O.S. Nunca sobrescreve: cada emissão é uma versão (v1, v2...) e a O.S. encerrada tem UM relatório
 * vigente. 22/10/2026 (etapa 2): toque repetido em "Relatório A4" numa O.S. encerrada NÃO gera versão nova: reabre a
 * mesma (opcoes.reaproveitar); versão nova só com motivo, pela gestão ("Abrir para corrigir", opcoes.revisao e
 * opcoes.motivo), ligada ao núcleo de revisões (SGO_DocRevisao). opcoes: { aoEncerrar, reaproveitar, revisao, motivo }.
 * Encerrada: salva na pasta "4. Ordens de Serviço" do equipamento, registra no Arquivo de documentos (também sem sessão)
 * e avisa o cliente (AT08, e-mail curto; o PDF vai pelo "Enviar ao cliente"). Nunca lança: { salvo, pdfUrl, pdfId, html, aviso, versao }.
 */
function AstR_emitirRelatorioOS_(eu, osId, opcoes) {
  var o = opcoes || {};
  try {
    var os = Ast_porId_(AST_ABAS.OS, osId);
    if (!os) return { salvo: false, aviso: 'O.S. não encontrada' };
    var rascunho = Ast_up_(os.SITUACAO) !== 'ENCERRADA';
    if (!rascunho && Ast_s_(os.RELATORIO_PDF_ID) && !o.revisao) {
      // relatório vigente da O.S. encerrada: reabre o mesmo (nenhuma versão nova sem motivo)
      return { salvo: true, reaproveitado: true, pdfUrl: Ast_s_(os.RELATORIO_PDF_URL), pdfId: Ast_s_(os.RELATORIO_PDF_ID), htmlId: Ast_s_(os.RELATORIO_HTML_ID), versao: Number(os.RELATORIO_VERSAO) || 1,
        revisao: Number(os.RELATORIO_REVISAO) || 0, rascunho: false, registrado: true, emitidoEm: Ast_br_(os.RELATORIO_EM) };
    }
    var versao = (Number(os.RELATORIO_VERSAO) || 0) + 1;
    var revisao = rascunho ? 0 : (o.revisao ? Math.max(1, (Number(os.RELATORIO_REVISAO) || 0) + 1) : 0);
    var marca = Ast_marca_(JSON.stringify([os.NUMERO, versao, os.RESPOSTAS_JSON, os.RELATO, os.SERVICO_REALIZADO, os.ASSINATURA_ARQUIVO_ID, os.QTD_FOTOS, os.QTD_PECAS, os.ENCERRADA_EM]));
    var rev = null;
    if (revisao > 0 && typeof SGO_DocRev_historico_ === 'function') {
      var hist = SGO_DocRev_historico_('ORDEM_SERVICO', Ast_s_(os.NUMERO)).filter(function (h) { return h.revisao < revisao; });
      if (!hist.length) hist.push({ revisao: 0, rotulo: typeof SGO_DocRev_rotulo_ === 'function' ? SGO_DocRev_rotulo_(0) : 'Rev. 00', em: Ast_dia_(os.RELATORIO_EM) || Ast_dia_(os.ENCERRADA_EM), por: Ast_s_(os.ENCERRADA_POR_NOME) || 'Assistência técnica', motivo: 'Emissão inicial' });
      hist.push({ revisao: revisao, rotulo: typeof SGO_DocRev_rotulo_ === 'function' ? SGO_DocRev_rotulo_(revisao) : 'Rev. ' + revisao, em: Ast_hoje_(), por: Ast_s_(eu && eu.nome), motivo: Ast_texto_(o.motivo, 500) });
      rev = { modo: 'CORRIGIR', numero: Ast_s_(os.NUMERO), revisao: revisao, rotulo: typeof SGO_DocRev_rotulo_ === 'function' ? SGO_DocRev_rotulo_(revisao) : 'Rev. ' + revisao, motivo: Ast_texto_(o.motivo, 500), origemId: '', historico: hist, ehRevisao: true };
    }
    var html = AstR_htmlOS_(os, { marca: marca, versao: versao, revisao: revisao });
    if (rev && typeof SGO_DocRev_injetarHtml_ === 'function') html = SGO_DocRev_injetarHtml_(html, rev);
    var nome = 'Relatorio da OS - ' + Ast_s_(os.NUMERO) + (revisao > 0 ? ' Rev ' + (revisao < 10 ? '0' : '') + revisao : '') + ' v' + versao + (rascunho ? ' RASCUNHO' : '') + ' - ' + Ast_s_(os.CLIENTE_NOME).slice(0, 60) + ' - ' + Utilities.formatDate(new Date(), AST_FUSO, 'yyyy-MM-dd HHmm');
    var fin = typeof RelA4_finalizar_ === 'function' ? RelA4_finalizar_(html, nome) : { html: html, pdfBlob: null };
    html = null;
    var pasta = rascunho ? Ast_pastaPrivadaOS_(os.NUMERO) : Ast_pastaRelatorio_(os);
    var g = SGO_DocSalvar_salvarHtmlEPdf_(pasta, nome, fin.html, fin.pdfBlob ? { compartilhar: !rascunho, pdfBlob: fin.pdfBlob } : { compartilhar: !rascunho });
    var pastaUrl = ''; try { pastaUrl = pasta.getUrl(); } catch (e) {}
    var agora = Ast_agora_();
    var reg = !rascunho && AstR_registrarNoArquivo_(eu, os, g.pdfNome || nome, g.pdfUrl);
    var docRevId = '';
    if (!rascunho && typeof SGO_DocRev_registrar_ === 'function') {
      // núcleo comum de revisões (SGO_DocRevisao): a emissão inicial entra como Rev. 00; a correção, como a revisão seguinte, e a anterior fica substituída
      try {
        var cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(os.CLIENTE_ID)] || {}, eq = Ast_mapa_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS)[Ast_s_(os.EQUIPAMENTO_ID)] || {};
        var rr = SGO_DocRev_registrar_('ORDEM_SERVICO', rev || { modo: '', numero: Ast_s_(os.NUMERO), revisao: 0, motivo: '', ehRevisao: false },
          { numero: Ast_s_(os.NUMERO), revisao: revisao, payload: { osId: Ast_s_(os.ID), relato: Ast_s_(os.RELATO), condicaoEncontrada: Ast_s_(os.CONDICAO_ENCONTRADA), causa: Ast_s_(os.CAUSA), servicoRealizado: Ast_s_(os.SERVICO_REALIZADO), testeFuncional: Ast_s_(os.TESTE_FUNCIONAL), recomendacoes: Ast_s_(os.RECOMENDACOES) },
            titulo: 'Relatório de atendimento técnico', cliente: Ast_s_(os.CLIENTE_NOME), cnpj: Ast_s_(cli.CNPJ), tag: Ast_s_(eq.TAG), equipamentoId: Ast_s_(os.EQUIPAMENTO_ID), pdfId: g.pdfId, htmlId: g.htmlId, pdfUrl: g.pdfUrl, htmlUrl: g.htmlUrl, aprovacao: '' },
          { nome: Ast_s_(eu && eu.nome), usuario: Ast_s_(eu && eu.login) });
        docRevId = rr && rr.ok ? rr.id : '';
      } catch (eD) { docRevId = ''; }
    }
    Ast_inserir_(AST_ABAS.RELATORIOS, { OS_ID: os.ID, OS_NUMERO: os.NUMERO, VERSAO: versao, REVISAO: revisao, MOTIVO: revisao > 0 ? Ast_texto_(o.motivo, 500) : '', RASCUNHO: rascunho ? 'SIM' : '', PDF_ID: g.pdfId, PDF_URL: g.pdfUrl, HTML_ID: g.htmlId, PASTA_URL: pastaUrl, MARCA: marca,
      EMITIDO_EM: agora, EMITIDO_POR_NOME: Ast_s_(eu && eu.nome), DOC_REGISTRADO: reg ? 'SIM' : '', DOCREV_ID: docRevId });
    if (!rascunho) {
      var campos = { RELATORIO_VERSAO: versao, RELATORIO_REVISAO: revisao, RELATORIO_PDF_ID: g.pdfId, RELATORIO_PDF_URL: g.pdfUrl, RELATORIO_HTML_ID: g.htmlId, RELATORIO_EM: agora, ATUALIZADO_EM: agora };
      if (revisao > 0 && Ast_s_(os.ENVIADO_CLIENTE_EM)) {
        // a revisão corrigida ainda não foi ao cliente: o envio anterior fica no histórico e a pendência de envio volta
        Ast_evento_('OS', os.ID, 'ENVIO_SUPERADO', eu, 'O envio de ' + Ast_br_(os.ENVIADO_CLIENTE_EM) + ' para ' + Ast_s_(os.ENVIADO_CLIENTE_PARA) + ' era da revisão anterior; a ' + rev.rotulo + ' precisa ser enviada de novo ao cliente.', { numero: os.NUMERO });
        Object.assign(campos, { ENVIADO_CLIENTE_EM: '', ENVIADO_CLIENTE_POR_NOME: '', ENVIADO_CLIENTE_CANAL: '', ENVIADO_CLIENTE_PARA: '' });
      }
      Ast_atualizar_(AST_ABAS.OS, os.ID, campos);
      Ast_evento_('OS', os.ID, revisao > 0 ? 'RELATORIO_REVISADO' : 'RELATORIO', eu, (revisao > 0 ? 'Relatório A4 ' + rev.rotulo + ' (v' + versao + ') emitido com o motivo: ' + Ast_texto_(o.motivo, 300) + '. A revisão anterior fica arquivada como substituída' : 'Relatório A4 v' + versao + ' salvo na pasta do equipamento') + (reg ? ' e registrado no Arquivo de documentos' : ''), { numero: os.NUMERO });
      if (o.aoEncerrar) {
        var c = Ast_porId_(AST_ABAS.CHAMADOS, os.CHAMADO_ID) || { ID: os.CHAMADO_ID, CLIENTE_ID: os.CLIENTE_ID, UNIDADE_ID: os.UNIDADE_ID };
        Ast_avisarCliente_(c, 'Atendimento concluído: O.S. ' + os.NUMERO, 'Prezados,\n\nO atendimento técnico ' + os.NUMERO + ' (' + Ast_s_(os.EQUIPAMENTO_TEXTO) + ') foi concluído em ' + Ast_br_(os.ENCERRADA_EM) +
          '.\nO relatório do atendimento segue por e-mail em seguida e fica disponível no portal do cliente do SGO+ e no prontuário do equipamento.\n\nMetrolabs — Assistência técnica', 'AT08');
      }
    } else Ast_atualizar_(AST_ABAS.OS, os.ID, { RELATORIO_VERSAO: versao, ATUALIZADO_EM: agora });
    return { salvo: true, pdfUrl: g.pdfUrl, pdfId: g.pdfId, htmlId: g.htmlId, htmlUrl: g.htmlUrl, pastaUrl: pastaUrl, html: g.html || fin.html, versao: versao, revisao: revisao, rascunho: rascunho, registrado: reg, emitidoEm: Ast_br_(agora) };
  } catch (e) {
    console.error('Assistência, relatório da O.S.: ' + ((e && e.message) || e));
    return { salvo: false, aviso: 'O relatório não foi salvo: ' + String((e && e.message) || e).replace(/[.\s]+$/, '') + '. A rotina tenta de novo; se continuar, avise o administrador.' };
  }
}

/** Relatório na tela: rascunho enquanto a O.S. está aberta (gera uma versão); encerrada, reabre o relatório vigente. */
function AstR_relatorioTela_(eu, d) {
  var os = AstO_obter_(eu, d && d.osId, 'gerar o relatório');
  if (eu.cliente && Ast_up_(os.SITUACAO) !== 'ENCERRADA') throw new Error('Não foi possível abrir: o relatório fica disponível quando o atendimento é concluído');
  if (eu.cliente) return { pdfUrl: Ast_s_(os.RELATORIO_PDF_URL) };
  var g = AstR_emitirRelatorioOS_(eu, os.ID, {});
  if (g.salvo && g.reaproveitado) {
    return { pdfUrl: g.pdfUrl, pdfId: g.pdfId, rascunho: false, versao: g.versao, revisao: g.revisao, reaproveitado: true,
      message: 'Relatório ' + (g.revisao > 0 ? 'Rev. ' + (g.revisao < 10 ? '0' : '') + g.revisao + ' ' : '') + 'da O.S. ' + os.NUMERO + ' emitido em ' + g.emitidoEm + '. Nenhuma versão nova foi gerada: para corrigir, a gestão usa "Abrir para corrigir" (com o motivo).' };
  }
  var av = [];
  if (g.salvo) av.push({ tipo: g.rascunho ? 'alerta' : 'ok', html: (g.rascunho ? 'Rascunho v' + g.versao + ' (a O.S. ainda não foi encerrada; não envie ao cliente).' : 'Relatório v' + g.versao + ' salvo na pasta do equipamento.') +
    (g.pdfUrl ? ' <a href="' + Ast_esc_(g.pdfUrl) + '" target="_blank" rel="noopener">Abrir o PDF</a>' : '') + (!g.rascunho && g.pdfId && typeof SGO_DocSalvar_linkEnviar_ === 'function' ? SGO_DocSalvar_linkEnviar_(g.pdfId) : '') });
  else av.push({ tipo: 'alerta', html: Ast_esc_(g.aviso || 'O relatório não foi salvo.') });
  return { html: typeof RelA4_injetarAvisos_ === 'function' ? RelA4_injetarAvisos_(g.html || '', av) : (g.html || ''), pdfUrl: g.pdfUrl || '', pdfId: g.pdfId || '', rascunho: !!g.rascunho, versao: g.versao || 0 };
}

/**
 * "Abrir para corrigir" (gestão, com motivo): corrige os textos do relato da O.S. encerrada e emite a revisão seguinte
 * (Rev. 01, 02...) do mesmo número; a anterior fica arquivada como substituída. d: { osId, motivo, relato:{ condicaoEncontrada, causa, servicoRealizado, testeFuncional, recomendacoes, relato } }
 */
function AstR_corrigirRelatorio_(eu, d) {
  Ast_exigir_(eu, 'GESTAO', 'corrigir o relatório da O.S.');
  d = d || {};
  var os = AstO_obter_(eu, d.osId, 'corrigir o relatório');
  if (Ast_up_(os.SITUACAO) !== 'ENCERRADA') throw new Error('Não foi possível corrigir: a O.S. ' + os.NUMERO + ' ainda não foi encerrada. Corrija pelo próprio atendimento (aplicativo ou ficha da O.S.)');
  if (!Ast_s_(os.RELATORIO_PDF_ID)) throw new Error('Não foi possível corrigir: a O.S. ' + os.NUMERO + ' ainda não tem o relatório emitido. Toque em "Relatório A4" primeiro');
  var motivo = Ast_texto_(d.motivo, 500);
  if (motivo.length < 10) throw new Error('Não foi possível corrigir: escreva o motivo da revisão (pelo menos 10 letras). Ele aparece no histórico de revisões do documento');
  var cr = {}, mapa = { relato: 'RELATO', condicaoEncontrada: 'CONDICAO_ENCONTRADA', causa: 'CAUSA', servicoRealizado: 'SERVICO_REALIZADO', testeFuncional: 'TESTE_FUNCIONAL', recomendacoes: 'RECOMENDACOES' }, rel = d.relato || {};
  Object.keys(mapa).forEach(function (k) { if (rel[k] !== undefined && rel[k] !== null && Ast_texto_(rel[k], 4000) !== Ast_s_(os[mapa[k]])) cr[mapa[k]] = Ast_texto_(rel[k], 4000); });
  var g = Ast_comTrava_(function () {
    if (Object.keys(cr).length) {
      cr.ATUALIZADO_EM = Ast_agora_();
      Ast_atualizar_(AST_ABAS.OS, os.ID, cr);
      Ast_evento_('OS', os.ID, 'CORRECAO', eu, 'Relato corrigido pela gestão (' + Object.keys(cr).filter(function (k) { return k !== 'ATUALIZADO_EM'; }).map(function (k) { return k.toLowerCase().replace(/_/g, ' '); }).join(', ') + '). Motivo: ' + motivo, { numero: os.NUMERO });
    }
    return AstR_emitirRelatorioOS_(eu, os.ID, { revisao: true, motivo: motivo });
  });
  if (!g.salvo) throw new Error('Não foi possível emitir a revisão: ' + String(g.aviso || '').replace(/[.\s]+$/, ''));
  return { os: AstO_publico_(Ast_porId_(AST_ABAS.OS, os.ID), eu), pdfUrl: g.pdfUrl, versao: g.versao, revisao: g.revisao,
    message: 'Relatório da O.S. ' + os.NUMERO + ' emitido como Rev. ' + (g.revisao < 10 ? '0' : '') + g.revisao + '. A revisão anterior fica arquivada como substituída. Envie a revisão ao cliente pelo botão "Enviar ao cliente".' };
}

// ------------------------------------------------------------
// ENVIO DO RELATÓRIO AO CLIENTE (22/10/2026, etapa 2): o técnico no aplicativo ou a gestão na tela; sempre uma pessoa
// ------------------------------------------------------------
/** Contatos do cliente com e-mail (cadastro, unidade, contatos, acessos do portal) para o técnico escolher no aplicativo. */
function AstR_contatosEnvio_(os) {
  var lista = [], vistos = {};
  var add = function (nome, email, origem, sugerido) {
    email = Ast_s_(email).toLowerCase();
    if (!/^[^\s@<>(),;:"\[\]]+@[^\s@<>(),;:"\[\]]+\.[a-z]{2,}$/i.test(email) || vistos[email]) return;
    vistos[email] = true;
    lista.push({ nome: Ast_s_(nome), email: email, origem: origem, sugerido: !!sugerido });
  };
  var cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(os.CLIENTE_ID)] || {}, un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[Ast_s_(os.UNIDADE_ID)] || {};
  var c = Ast_porId_(AST_ABAS.CHAMADOS, os.CHAMADO_ID) || {};
  add(Ast_s_(un.RESPONSAVEL) || Ast_s_(un.NOME_UNIDADE), un.EMAIL, 'Responsável da unidade', true);
  if (/@/.test(Ast_s_(c.CONTATO))) add(Ast_s_(c.SOLICITANTE), c.CONTATO, 'Solicitante do chamado', true);
  add(Ast_s_(cli.CONTATO) || Ast_clienteNome_(cli), cli.EMAIL, 'Cadastro do cliente', !lista.length);
  try {
    Ast_ler_('CAD_CONTATOS').forEach(function (k) { if (Ast_s_(k.CLIENTE_ID) === Ast_s_(os.CLIENTE_ID) && Ast_up_(k.STATUS || 'ATIVO') === 'ATIVO') add(k.NOME, k.EMAIL, 'Contato do cliente' + (Ast_s_(k.CARGO) ? ' (' + Ast_s_(k.CARGO) + ')' : ''), false); });
  } catch (e) {}
  return lista.slice(0, 12);
}
/** Assunto e texto do e-mail ao cliente com o PDF do relatório (tom profissional; sem fabricante; assinatura da Metrolabs). */
function AstR_textoEnvio_(os, eu) {
  var c = Ast_porId_(AST_ABAS.CHAMADOS, os.CHAMADO_ID) || {}, rev = Number(os.RELATORIO_REVISAO) || 0;
  var un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[Ast_s_(os.UNIDADE_ID)] || {};
  var assunto = ('Relatório de atendimento técnico ' + Ast_s_(os.NUMERO) + (rev > 0 ? ' (Rev. ' + (rev < 10 ? '0' : '') + rev + ')' : '') + (Ast_s_(os.CHAMADO_NUMERO) ? ' | Chamado ' + Ast_s_(os.CHAMADO_NUMERO) : '') + ' | ' + Ast_s_(os.CLIENTE_NOME)).slice(0, 180);
  var texto = 'Prezados(as),\n\n' +
    'Encaminhamos em anexo o relatório de atendimento técnico ' + Ast_s_(os.NUMERO) + (rev > 0 ? ' (revisão ' + (rev < 10 ? '0' : '') + rev + ', que substitui a anterior)' : '') + ', referente ao chamado ' + (Ast_s_(os.CHAMADO_NUMERO) || 'registrado') +
    (Ast_s_(os.EQUIPAMENTO_TEXTO) ? ', equipamento ' + Ast_s_(os.EQUIPAMENTO_TEXTO) : '') + (Ast_s_(un.NOME_UNIDADE) ? ' (' + Ast_s_(un.NOME_UNIDADE) + ')' : '') + '.\n\n' +
    'O atendimento foi realizado por ' + Ast_s_(os.TECNICO_NOME) + (Ast_s_(os.CHEGOU_EM) ? ' em ' + Ast_brDia_(os.CHEGOU_EM) : '') + (Ast_s_(c.SINTOMA) ? ', em razão do problema relatado: ' + Ast_s_(c.SINTOMA).slice(0, 200) : '') +
    '. O relatório traz a condição encontrada, o serviço realizado, o teste funcional, as peças aplicadas, as fotos e a assinatura de quem acompanhou o atendimento.\n\n' +
    'Recomendamos arquivar o documento no prontuário do equipamento. Ele também fica disponível no portal do cliente do SGO+.\n\n' +
    'Em caso de dúvida, estamos à disposição.\n\n' +
    'Atenciosamente,\n' + (Ast_s_(eu && eu.nome) || 'Equipe Metrolabs') + '\nMetrolabs';
  return { assunto: assunto, texto: texto };
}
/**
 * Envia o PDF do relatório vigente ao cliente por e-mail pelo Enviar documento (registro em DOC_ENVIOS; a O.S. é
 * marcada pelo gancho Assistencia_aoEnviarDocumento_). d: { osId, pedidoId, para:[{ nome, email }] | [emails], mensagem }.
 * Idempotente por pedidoId. Técnico responsável ou gestão. Fora da trava da Assistência (o Enviar documento tem a sua).
 */
function AstR_enviarRelatorioCliente_(eu, d) {
  d = d || {};
  var os = AstO_obter_(eu, d.osId, 'enviar o relatório ao cliente');
  AstO_exigirCampo_(eu, os, 'enviar o relatório ao cliente');
  if (Ast_up_(os.SITUACAO) !== 'ENCERRADA' || !Ast_s_(os.RELATORIO_PDF_ID)) throw new Error('Não foi possível enviar: a O.S. ' + os.NUMERO + ' ainda não está encerrada com o relatório gerado. Conclua a O.S. (o relatório é gerado no encerramento) e envie de novo');
  if (!eu.sessionId || typeof EnviarDoc_apiEnviar !== 'function') throw new Error('Não foi possível enviar: o Enviar documento não está disponível nesta sessão. Envie pela ficha da O.S. no SGO+ (botão "Enviar ao cliente")');
  var pedidoId = Ast_s_(d.pedidoId).replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 80);
  if (pedidoId.length < 8) pedidoId = ('envio-' + Ast_s_(os.ID) + '-' + Date.now()).replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 80);
  var para = (Array.isArray(d.para) ? d.para : [d.para]).map(function (p) { return typeof p === 'string' ? { nome: '', email: p } : (p || {}); })
    .map(function (p) { return { nome: Ast_texto_(p.nome, 120), email: Ast_s_(p.email).toLowerCase() }; }).filter(function (p) { return p.email; });
  if (!para.length) throw new Error('Não foi possível enviar: escolha ou digite o e-mail do contato do cliente que vai receber o relatório');
  var ruins = para.filter(function (p) { return !/^[^\s@<>(),;:"\[\]]+@[^\s@<>(),;:"\[\]]+\.[a-z]{2,}$/i.test(p.email); });
  if (ruins.length) throw new Error('Não foi possível enviar: o e-mail "' + ruins[0].email + '" não está completo (nome@dominio). Corrija e envie de novo');
  var t = AstR_textoEnvio_(os, eu), msg = Ast_texto_(d.mensagem, 8000) || t.texto;
  var r = EnviarDoc_apiEnviar(eu.sessionId, { pedidoId: pedidoId, arquivoId: Ast_s_(os.RELATORIO_PDF_ID), htmlId: Ast_s_(os.RELATORIO_HTML_ID), incluirHtml: false,
    dica: { clienteId: Ast_s_(os.CLIENTE_ID), numero: Ast_s_(os.NUMERO), equipamento: Ast_s_(os.EQUIPAMENTO_TEXTO), titulo: 'Relatório de atendimento técnico ' + Ast_s_(os.NUMERO) },
    destinatarios: para, canais: { email: true, whatsapp: false }, assunto: t.assunto, mensagemEmail: msg });
  if (!r || r.ok === false) throw new Error('Não foi possível enviar: ' + String((r && (r.erro || r.message)) || 'o Enviar documento não respondeu').replace(/[.\s]+$/, ''));
  var falha = (r.itens || []).filter(function (i) { return i.situacao === 'FALHOU'; })[0];
  if (!r.enviados && falha) throw new Error('Não foi possível enviar: ' + String(falha.motivo || 'o e-mail não saiu').replace(/[.\s]+$/, '') + '. Tente de novo; se continuar, a gestão envia pela ficha da O.S.');
  Ast_memoLimpar_();
  var atual = Ast_porId_(AST_ABAS.OS, os.ID) || os;
  return { enviado: true, repetido: !!r.repetido, para: para.map(function (p) { return p.email; }), enviadoEm: Ast_br_(atual.ENVIADO_CLIENTE_EM), os: atual,
    message: r.repetido ? 'Este envio já tinha sido feito; nada foi enviado de novo.' : 'Relatório da O.S. ' + os.NUMERO + ' enviado por e-mail para ' + para.map(function (p) { return p.email; }).join(', ') + '.' };
}
/**
 * Gancho do Enviar documento (SGO_EnviarDoc.js), depois de cada envio: o relatório da O.S. e o orçamento do chamado
 * passam a mostrar "enviado ao cliente em / por / canal / para". linhas: [{ arquivoId, canal, destino, destinoNome, quando, porNome }]. Nunca lança.
 */
function Assistencia_aoEnviarDocumento_(linhas) {
  try {
    if (!linhas || !linhas.length) return;
    Ast_memoLimpar_();
    if (typeof Pend_abaExiste_ === 'function' && !Pend_abaExiste_(AST_ABAS.OS)) return;
    var oss = Ast_ler_(AST_ABAS.OS), orcs = Ast_ler_(AST_ABAS.ORCAMENTOS);
    linhas.forEach(function (l) {
      var arq = Ast_s_(l.arquivoId); if (!arq) return;
      var quando = Ast_iso_(l.quando) || Ast_agora_(), para = Ast_texto_(l.destino, 500), canal = Ast_up_(l.canal) === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL', por = Ast_texto_(l.porNome, 120);
      oss.filter(function (o) { return Ast_s_(o.RELATORIO_PDF_ID) === arq || Ast_s_(o.RELATORIO_HTML_ID) === arq; }).forEach(function (o) {
        Ast_atualizar_(AST_ABAS.OS, o.ID, { ENVIADO_CLIENTE_EM: quando, ENVIADO_CLIENTE_POR_NOME: por, ENVIADO_CLIENTE_CANAL: canal, ENVIADO_CLIENTE_PARA: para, ATUALIZADO_EM: Ast_agora_() });
        Ast_evento_('OS', o.ID, 'ENVIADO_CLIENTE', { id: Ast_s_(l.porId), nome: por }, 'Relatório enviado ao cliente por ' + (canal === 'EMAIL' ? 'e-mail' : 'WhatsApp') + ' para ' + para, { numero: o.NUMERO });
        if (Ast_s_(o.CHAMADO_ID)) Ast_evento_('CHAMADO', o.CHAMADO_ID, 'ENVIADO_CLIENTE', { id: Ast_s_(l.porId), nome: por }, 'Relatório da O.S. ' + Ast_s_(o.NUMERO) + ' enviado ao cliente por ' + (canal === 'EMAIL' ? 'e-mail' : 'WhatsApp') + ' para ' + para, { numero: o.CHAMADO_NUMERO, publico: true });
      });
      orcs.filter(function (q) { return Ast_s_(q.PDF_ID) === arq; }).forEach(function (q) {
        Ast_atualizar_(AST_ABAS.ORCAMENTOS, q.ID, { ENVIADO_EM: quando, ENVIADO_PARA: para, ATUALIZADO_EM: Ast_agora_() });
        if (Ast_s_(q.CHAMADO_ID)) Ast_evento_('CHAMADO', q.CHAMADO_ID, 'ORCAMENTO_ENVIADO', { id: Ast_s_(l.porId), nome: por }, 'Orçamento ' + Ast_s_(q.NUMERO) + ' enviado ao cliente por ' + (canal === 'EMAIL' ? 'e-mail' : 'WhatsApp') + ' para ' + para, { numero: q.CHAMADO_NUMERO, publico: true });
      });
    });
    if (typeof SGO_Pendencias_invalidar_ === 'function') { try { SGO_Pendencias_invalidar_(); } catch (e2) {} }
  } catch (e) { console.error('Assistência, envio ao cliente: ' + ((e && e.message) || e)); }
}

// ------------------------------------------------------------
// ORÇAMENTO DO CHAMADO
// ------------------------------------------------------------
function AstR_comercialPara_() {
  var us = Ast_usuarios_(), ids = [];
  try { ids = ((typeof Ges_cfg_ === 'function' ? Ges_cfg_().gestoresPorArea : {}) || {}).COMERCIAL || []; } catch (e) { ids = []; }
  ids = ids.map(Ast_s_).filter(function (id) { return us[id] && us[id].ativo; });
  if (!ids.length) ids = Object.keys(us).filter(function (id) { return us[id].ativo && us[id].perfil === 'GESTOR' && us[id].area === 'COMERCIAL'; });
  if (!ids.length) ids = Ast_triagemPara_(us).ids;
  return ids.length ? { id: ids[0], nome: us[ids[0]].nome } : null;
}
/** A triagem pediu orçamento: cria o rascunho e a atividade do Comercial (sem valores). Chamar dentro da trava. */
function AstR_pedirOrcamento_(eu, c, descricao) {
  var ja = Ast_ler_(AST_ABAS.ORCAMENTOS).filter(function (o) { return Ast_s_(o.CHAMADO_ID) === Ast_s_(c.ID) && ['RASCUNHO', 'EMITIDO'].indexOf(Ast_up_(o.SITUACAO)) >= 0; })[0];
  if (ja) return ja;
  var o = Ast_inserir_(AST_ABAS.ORCAMENTOS, { NUMERO: Ast_proximoNumero_('OA', AST_ABAS.ORCAMENTOS), REVISAO: 0, CHAMADO_ID: c.ID, CHAMADO_NUMERO: c.NUMERO, CLIENTE_ID: c.CLIENTE_ID, CLIENTE_NOME: c.CLIENTE_NOME,
    ITENS_JSON: JSON.stringify([{ tipo: 'SERVICO', descricao: Ast_texto_(descricao, 300), quantidade: 1, unidade: 'serv.', valorUnitario: 0 }]), VALOR_TOTAL: 0,
    VALIDADE: Ast_somarDias_(Ast_hoje_(), 15), CONDICOES: '', SITUACAO: 'RASCUNHO', POR_ID: eu.id, POR_NOME: eu.nome, ATUALIZADO_EM: Ast_agora_() });
  Ast_atualizar_(AST_ABAS.CHAMADOS, c.ID, { ORCAMENTO_ID: o.ID });
  var com = AstR_comercialPara_();
  if (com) {
    var oid = o.ID;
    Ast_criarAtividade_({ responsavelId: com.id, titulo: 'Orçamento do chamado ' + c.NUMERO + ' · ' + Ast_s_(c.CLIENTE_NOME), prioridade: Ast_up_(c.PRIORIDADE) === 'P1' ? 'Urgente' : 'Alta',
      prazo: (typeof Ges_somarDiasUteis_ === 'function' ? Ges_somarDiasUteis_(Ast_hoje_(), 1) : Ast_somarDias_(Ast_hoje_(), 1)) + 'T17:00',
      descricao: 'A triagem da área Técnica pediu orçamento: ' + Ast_texto_(descricao, 1000) + '\nEquipamento: ' + Ast_s_(c.EQUIPAMENTO_TEXTO) + '\n\nPreencha os valores em Assistência técnica > Chamados > ' + c.NUMERO + ' > Orçamento, emita o A4, envie ao cliente e registre a resposta com o aceite.',
      clienteId: c.CLIENTE_ID, unidadeId: c.UNIDADE_ID, porQue: 'Chamado parado aguardando orçamento.', onde: 'Assistência técnica > Chamados', como: 'Orçamento do chamado (A4) e aceite do cliente.' },
      function (idAtv) { Ast_atualizar_(AST_ABAS.ORCAMENTOS, oid, { COMERCIAL_ATIVIDADE_ID: idAtv }); });
    Ast_avisar_(com.id, 'ORCAMENTO_PEDIDO', 'Orçamento pedido pela Técnica: ' + c.NUMERO, Ast_texto_(descricao, 400), c.ID, { autorId: eu.id, evento: 'AT12' });
  }
  return o;
}
function AstR_orcPublico_(o, eu) {
  var ver = !!(eu && eu.valores);
  var itens = Ast_json_(o.ITENS_JSON, []).map(function (i) { var x = { tipo: Ast_up_(i.tipo) === 'PECA' ? 'PECA' : 'SERVICO', descricao: Ast_s_(i.descricao), quantidade: Number(i.quantidade) || 0, unidade: Ast_s_(i.unidade), codigo: Ast_s_(i.codigo) }; if (ver) { x.valorUnitario = Number(i.valorUnitario) || 0; x.total = Math.round(x.quantidade * x.valorUnitario * 100) / 100; } return x; });
  var r = { id: o.ID, numero: o.NUMERO, revisao: Number(o.REVISAO) || 0, chamadoId: o.CHAMADO_ID, chamadoNumero: o.CHAMADO_NUMERO, clienteNome: o.CLIENTE_NOME, situacao: Ast_up_(o.SITUACAO),
    situacaoNome: AST_ORC_SITUACOES[Ast_up_(o.SITUACAO)] || o.SITUACAO, itens: itens, validade: Ast_brDia_(o.VALIDADE), validadeIso: Ast_dia_(o.VALIDADE), condicoes: ver ? Ast_s_(o.CONDICOES) : '',
    pdfUrl: Ast_s_(o.PDF_URL), pdfId: Ast_s_(o.PDF_ID), emitidoEm: Ast_br_(o.EMITIDO_EM), enviadoEm: Ast_br_(o.ENVIADO_EM), enviadoPara: Ast_s_(o.ENVIADO_PARA), aceiteUrl: Ast_s_(o.ACEITE_URL), aceitePor: Ast_s_(o.ACEITE_POR), decididoEm: Ast_br_(o.DECIDIDO_EM),
    decisaoTexto: Ast_s_(o.DECISAO_TEXTO), requisicao: Ast_s_(o.REQUISICAO_ID), veValores: ver };
  if (ver) { r.valorTotal = Number(o.VALOR_TOTAL) || 0; r.valorTotalTxt = Ast_moeda_(o.VALOR_TOTAL); }
  return r;
}
function AstR_orcamentosDoChamado_(eu, c) {
  return Ast_ler_(AST_ABAS.ORCAMENTOS).filter(function (o) { return Ast_s_(o.CHAMADO_ID) === Ast_s_(c.ID); }).sort(function (a, b) { return String(a.CRIADO_EM).localeCompare(String(b.CRIADO_EM)); }).map(function (o) { return AstR_orcPublico_(o, eu); });
}
/** Salva itens e condições do rascunho. d: { id, itens:[{tipo, descricao, codigo, quantidade, unidade, valorUnitario}], validade, condicoes } */
function AstR_salvarOrcamento_(eu, d) {
  Ast_exigir_(eu, 'VALORES', 'preencher o orçamento');
  var o = Ast_porId_(AST_ABAS.ORCAMENTOS, d && d.id);
  if (!o) throw new Error('Não foi possível salvar: o orçamento não foi encontrado. Atualize a ficha do chamado');
  if (Ast_up_(o.SITUACAO) !== 'RASCUNHO') throw new Error('Não foi possível salvar: o orçamento ' + o.NUMERO + ' já foi emitido. Para mudar, faça uma revisão (botão "Nova revisão")');
  var itens = (Array.isArray(d.itens) ? d.itens : []).map(function (i, k) {
    var desc = Ast_texto_(i.descricao, 300), q = Ast_num_(i.quantidade), v = Ast_num_(i.valorUnitario);
    if (desc.length < 3) throw new Error('Não foi possível salvar: o item ' + (k + 1) + ' está sem descrição');
    if (!(q > 0)) throw new Error('Não foi possível salvar: o item ' + (k + 1) + ' (' + desc + ') está sem quantidade');
    if (!(v >= 0)) throw new Error('Não foi possível salvar: o item ' + (k + 1) + ' (' + desc + ') está sem valor unitário (use 0 para cortesia)');
    return { tipo: Ast_up_(i.tipo) === 'PECA' ? 'PECA' : 'SERVICO', descricao: desc, codigo: Ast_texto_(i.codigo, 80), quantidade: q, unidade: Ast_texto_(i.unidade, 20) || 'un.', valorUnitario: Math.round(v * 100) / 100 };
  });
  if (!itens.length) throw new Error('Não foi possível salvar: inclua pelo menos um item no orçamento');
  var total = Math.round(itens.reduce(function (s, i) { return s + i.quantidade * i.valorUnitario; }, 0) * 100) / 100;
  var campos = { ITENS_JSON: JSON.stringify(itens), VALOR_TOTAL: total, CONDICOES: Ast_texto_(d.condicoes, 1500), VALIDADE: Ast_dia_(d.validade) || Ast_s_(o.VALIDADE), ATUALIZADO_EM: Ast_agora_() };
  Ast_atualizar_(AST_ABAS.ORCAMENTOS, o.ID, campos);
  return { orcamento: AstR_orcPublico_(Object.assign({}, o, campos), eu), message: 'Orçamento ' + o.NUMERO + ' salvo (' + Ast_moeda_(total) + ').' };
}
function AstR_htmlOrcamento_(o, c, marca) {
  var cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(o.CLIENTE_ID)] || {}, itens = Ast_json_(o.ITENS_JSON, []);
  var corpo = RelA4_secao_('Cliente e equipamento', RelA4_identificacao_([['Cliente', Ast_s_(o.CLIENTE_NOME), { largo: true }], ['CNPJ', Ast_s_(cli.CNPJ)], ['Chamado', Ast_s_(o.CHAMADO_NUMERO)],
    ['Equipamento', Ast_s_(c.EQUIPAMENTO_TEXTO), { largo: true }], ['Problema relatado', Ast_s_(c.SINTOMA), { largo: true }], ['Diagnóstico', Ast_s_((Ast_json_(c.TRIAGEM_JSON, {}) || {}).diagnostico_preliminar), { largo: true }]]));
  var linhas = itens.map(function (i, k) { return [String(k + 1), { html: '<b>' + Ast_esc_(i.descricao) + '</b>' + (i.codigo ? '<span class="sub">Código ' + Ast_esc_(i.codigo) + '</span>' : '') }, Ast_up_(i.tipo) === 'PECA' ? 'Peça' : 'Serviço', Ast_fmtNum_(i.quantidade, Math.round(i.quantidade) === Number(i.quantidade) ? 0 : 2) + ' ' + Ast_s_(i.unidade), Ast_moeda_(i.valorUnitario), Ast_moeda_(i.quantidade * i.valorUnitario)]; });
  corpo += RelA4_secao_('Itens', RelA4_tabela_([{ t: 'Nº', cen: true, w: '7mm' }, { t: 'Descrição' }, { t: 'Tipo' }, { t: 'Qtd.', num: true }, { t: 'Unitário', num: true }, { t: 'Total', num: true }], linhas, { total: ['', 'Total do orçamento', '', '', '', Ast_moeda_(o.VALOR_TOTAL)] }));
  corpo += RelA4_secao_('Condições', RelA4_identificacao_([['Validade', Ast_brDia_(o.VALIDADE)], ['Revisão', String(Number(o.REVISAO) || 0)]]) + (Ast_s_(o.CONDICOES) ? RelA4_paragrafos_(o.CONDICOES) : '') +
    '<p>A execução começa depois da aprovação deste orçamento pelo cliente (assinatura abaixo ou aceite por escrito citando o número ' + Ast_esc_(o.NUMERO) + ').</p>' + RelA4_assinaturas_(['Aprovação do cliente', 'Metrolabs']) +
    '<p class="nota" style="margin-top:4mm">Marca de conferência do conteúdo: ' + Ast_esc_(marca) + '.</p>');
  return RelA4_documento_({ titulo: 'Orçamento de assistência técnica', subtitulo: Ast_s_(o.CLIENTE_NOME), tituloCurto: 'Orçamento', tituloArquivo: 'Orcamento de assistencia', numero: Ast_s_(o.NUMERO),
    revisao: Number(o.REVISAO) || 0, identificacao: Ast_s_(o.CLIENTE_NOME), rotuloIdentificacao: 'Cliente', ficha: [['Total', Ast_moeda_(o.VALOR_TOTAL)], ['Validade', Ast_brDia_(o.VALIDADE)]], corpo: corpo, capa: false, sumario: false });
}
/** Emite o A4 do orçamento (rascunho -> emitido). d: { id } */
function AstR_emitirOrcamento_(eu, d) {
  Ast_exigir_(eu, 'VALORES', 'emitir o orçamento');
  var o = Ast_porId_(AST_ABAS.ORCAMENTOS, d && d.id);
  if (!o) throw new Error('Não foi possível emitir: o orçamento não foi encontrado');
  if (Ast_up_(o.SITUACAO) !== 'RASCUNHO') throw new Error('Não foi possível emitir: o orçamento ' + o.NUMERO + ' não está em rascunho');
  if (!(Number(o.VALOR_TOTAL) >= 0) || !Ast_json_(o.ITENS_JSON, []).some(function (i) { return Number(i.valorUnitario) > 0; })) throw new Error('Não foi possível emitir: preencha os valores dos itens e salve antes de emitir');
  var c = Ast_porId_(AST_ABAS.CHAMADOS, o.CHAMADO_ID) || {};
  var marca = Ast_marca_(JSON.stringify([o.NUMERO, o.REVISAO, o.ITENS_JSON, o.VALOR_TOTAL, o.CONDICOES, o.VALIDADE]));
  var html = AstR_htmlOrcamento_(o, c, marca);
  var nome = 'Orcamento de assistencia - ' + o.NUMERO + ' rev' + (Number(o.REVISAO) || 0) + ' - ' + Ast_s_(o.CLIENTE_NOME).slice(0, 60);
  var fin = typeof RelA4_finalizar_ === 'function' ? RelA4_finalizar_(html, nome) : { html: html, pdfBlob: null };
  var cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(o.CLIENTE_ID)] || {};
  var pasta = SGO_DocSalvar_pastaClienteEm_(SGO_DocSalvar_pastaPersistente_('ATEC_PASTA_ORC_ID', AST_PASTA_ORCAMENTOS, ''), cli.CNPJ, o.CLIENTE_NOME || 'Sem cliente');
  var g = SGO_DocSalvar_salvarHtmlEPdf_(pasta, nome, fin.html, fin.pdfBlob ? { compartilhar: true, pdfBlob: fin.pdfBlob } : { compartilhar: true });
  var campos = { SITUACAO: 'EMITIDO', PDF_ID: g.pdfId, PDF_URL: g.pdfUrl, HTML_ID: g.htmlId, EMITIDO_EM: Ast_agora_(), EMITIDO_POR_NOME: eu.nome, ATUALIZADO_EM: Ast_agora_() };
  Ast_atualizar_(AST_ABAS.ORCAMENTOS, o.ID, campos);
  if (c.ID) Ast_evento_('CHAMADO', c.ID, 'ORCAMENTO', eu, 'Orçamento ' + o.NUMERO + ' emitido; aguarda a resposta do cliente', { numero: c.NUMERO, publico: true });
  return { orcamento: AstR_orcPublico_(Object.assign({}, o, campos), eu), html: g.html || fin.html,
    message: 'Orçamento ' + o.NUMERO + ' emitido. Envie ao cliente pelo botão "Enviar ao cliente" e registre a resposta com o aceite anexado.' };
}
/** Nova revisão do orçamento emitido (a anterior fica como substituída). */
function AstR_revisarOrcamento_(eu, d) {
  Ast_exigir_(eu, 'VALORES', 'revisar o orçamento');
  var o = Ast_porId_(AST_ABAS.ORCAMENTOS, d && d.id);
  if (!o || ['EMITIDO', 'RECUSADO'].indexOf(Ast_up_(o.SITUACAO)) < 0) throw new Error('Não foi possível revisar: só orçamento emitido ou recusado ganha revisão');
  var r = Ast_comTrava_(function () {
    Ast_atualizar_(AST_ABAS.ORCAMENTOS, o.ID, { SITUACAO: 'SUBSTITUIDO', ATUALIZADO_EM: Ast_agora_() });
    return Ast_inserir_(AST_ABAS.ORCAMENTOS, { NUMERO: o.NUMERO, REVISAO: (Number(o.REVISAO) || 0) + 1, CHAMADO_ID: o.CHAMADO_ID, CHAMADO_NUMERO: o.CHAMADO_NUMERO, CLIENTE_ID: o.CLIENTE_ID, CLIENTE_NOME: o.CLIENTE_NOME,
      ITENS_JSON: o.ITENS_JSON, VALOR_TOTAL: o.VALOR_TOTAL, VALIDADE: Ast_somarDias_(Ast_hoje_(), 15), CONDICOES: o.CONDICOES, SITUACAO: 'RASCUNHO', COMERCIAL_ATIVIDADE_ID: o.COMERCIAL_ATIVIDADE_ID, POR_ID: eu.id, POR_NOME: eu.nome, ATUALIZADO_EM: Ast_agora_() });
  });
  return { orcamento: AstR_orcPublico_(r, eu), message: 'Revisão ' + r.REVISAO + ' do orçamento ' + r.NUMERO + ' aberta em rascunho.' };
}
/**
 * Resposta do cliente. d: { id, decisao: APROVADO|RECUSADO, aceite:{ nome, tipo, base64 }, aceitePor, texto, comprarPecas }
 * Aprovar exige o aceite anexado (e-mail, foto do orçamento assinado ou PDF). Aprovado: chamado vai a "Planejado" (ou "Aguardando peça"
 * com o pedido de compra das peças aprovadas); recusado: fica aguardando a decisão da gestão (nova revisão ou cancelar).
 */
function AstR_decidirOrcamento_(eu, d) {
  Ast_exigir_(eu, 'VALORES', 'registrar a resposta do cliente');
  d = d || {};
  var o = Ast_porId_(AST_ABAS.ORCAMENTOS, d.id);
  if (!o || Ast_up_(o.SITUACAO) !== 'EMITIDO') throw new Error('Não foi possível registrar: só orçamento emitido recebe a resposta do cliente');
  var dec = Ast_up_(d.decisao);
  if (dec !== 'APROVADO' && dec !== 'RECUSADO') throw new Error('Não foi possível registrar: escolha "Aprovado" ou "Recusado"');
  var por = Ast_texto_(d.aceitePor, 120), txt = Ast_texto_(d.texto, 1000), arq = null;
  if (por.length < 3) throw new Error('Não foi possível registrar: informe quem respondeu pelo cliente');
  if (dec === 'APROVADO') {
    if (!d.aceite || !Ast_s_(d.aceite.base64)) throw new Error('Não foi possível aprovar: anexe o aceite do cliente (o e-mail salvo em PDF, a foto do orçamento assinado ou o PDF assinado). Sem o aceite a aprovação não tem prova');
    var b64 = String(d.aceite.base64).replace(/^data:[^,]+,/, '');
    if (b64.length > 14 * 1024 * 1024) throw new Error('Não foi possível aprovar: o arquivo do aceite passa de 10 MB. Salve menor e anexe de novo');
    var nomeA = SGO_DocSalvar_sanitizarNome_('Aceite ' + o.NUMERO + ' - ' + Ast_s_(d.aceite.nome || 'aceite.pdf'));
    if (!/\.(pdf|png|jpe?g|webp|eml|msg)$/i.test(nomeA)) throw new Error('Não foi possível aprovar: o aceite precisa ser PDF, imagem (PNG, JPG) ou e-mail salvo (.eml)');
    var pasta = Ast_pastaPrivadaOS_(o.CHAMADO_NUMERO);
    var f = pasta.createFile(Utilities.newBlob(Utilities.base64Decode(b64), Ast_s_(d.aceite.tipo) || 'application/octet-stream', nomeA));
    Ast_privado_(f);
    arq = { id: f.getId(), url: f.getUrl(), nome: nomeA };
  } else if (txt.length < 5) throw new Error('Não foi possível registrar: escreva o motivo da recusa informado pelo cliente');
  var itens = Ast_json_(o.ITENS_JSON, []), pecas = itens.filter(function (i) { return Ast_up_(i.tipo) === 'PECA'; });
  var comprar = dec === 'APROVADO' && pecas.length && d.comprarPecas !== false;
  var res = Ast_comTrava_(function () {
    var campos = { SITUACAO: dec, ACEITE_POR: por, DECISAO_TEXTO: txt, DECIDIDO_EM: Ast_agora_(), ATUALIZADO_EM: Ast_agora_() };
    if (arq) Object.assign(campos, { ACEITE_ARQUIVO_ID: arq.id, ACEITE_URL: arq.url, ACEITE_NOME: arq.nome });
    Ast_atualizar_(AST_ABAS.ORCAMENTOS, o.ID, campos);
    var c = Ast_porId_(AST_ABAS.CHAMADOS, o.CHAMADO_ID);
    if (c && Ast_up_(c.SITUACAO) === 'AGUARDANDO_ORCAMENTO') {
      if (dec === 'APROVADO') {
        if (comprar) {
          c = AstC_mudar_(eu, c, 'AGUARDANDO_PECA', { PECA_DESCRICAO: pecas.map(function (p) { return p.quantidade + ' × ' + p.descricao; }).join('; ').slice(0, 500), PROXIMA_ACAO: 'Aguardar as peças do orçamento aprovado e agendar' }, 'ORCAMENTO_APROVADO', 'Orçamento ' + o.NUMERO + ' aprovado por ' + por + '; peças pedidas a Compras');
          var cc = c;
          pecas.forEach(function (p) { Ast_depois_(function () { AstC_ligarPedidoCompra_(eu, cc, { descricao: p.descricao, codigo: p.codigo, quantidade: p.quantidade, urgencia: 'ALTA' }); }); });
        } else c = AstC_mudar_(eu, c, 'PLANEJADO', { PROXIMA_ACAO: 'Agendar o atendimento (orçamento aprovado)' }, 'ORCAMENTO_APROVADO', 'Orçamento ' + o.NUMERO + ' aprovado por ' + por);
      } else {
        Ast_atualizar_(AST_ABAS.CHAMADOS, c.ID, { PROXIMA_ACAO: 'Cliente recusou o orçamento: fazer nova revisão ou cancelar o chamado', ATUALIZADO_EM: Ast_agora_() });
        Ast_evento_('CHAMADO', c.ID, 'ORCAMENTO_RECUSADO', eu, 'Orçamento ' + o.NUMERO + ' recusado por ' + por + ': ' + txt, { numero: c.NUMERO, publico: true });
      }
    }
    Ast_mudarAtividade_(o.COMERCIAL_ATIVIDADE_ID, 'Concluída', 'Orçamento ' + o.NUMERO + ' ' + (dec === 'APROVADO' ? 'aprovado' : 'recusado') + ' pelo cliente (' + por + ').');
    if (c) Ast_avisar_(Ast_gestoresTecnica_(), 'ORCAMENTO_' + dec, 'Orçamento ' + (dec === 'APROVADO' ? 'aprovado' : 'recusado') + ': ' + c.NUMERO, 'Cliente ' + Ast_s_(c.CLIENTE_NOME) + ' · respondeu ' + por + (txt ? ': ' + txt : '') + '. ' + Ast_s_(c.PROXIMA_ACAO), c.ID, { autorId: eu.id, evento: 'AT12' });
    return { c: c };
  });
  return { message: 'Resposta registrada: orçamento ' + o.NUMERO + ' ' + (dec === 'APROVADO' ? 'aprovado' + (comprar ? ' e peças pedidas a Compras' : '; agende o atendimento') : 'recusado; decida entre nova revisão e cancelar o chamado') + '.',
    chamado: res.c ? AstC_publico_(res.c, eu, Date.now()) : null };
}

// ------------------------------------------------------------
// INDICADORES E RELATÓRIO MENSAL
// ------------------------------------------------------------
/** Indicadores da competência ('aaaa-mm'). */
function AstR_indicadores_(comp) {
  var ini = comp + '-01', fim = Ast_somarDias_(Ast_somarDias_(ini, 31).slice(0, 8) + '01', -1);
  var no = function (v) { var d = Ast_dia_(v); return d && d >= ini && d <= fim; };
  var regras = Ast_regras_(), agora = Date.now();
  var ch = Ast_ler_(AST_ABAS.CHAMADOS), oss = Ast_ler_(AST_ABAS.OS);
  var abertos = ch.filter(function (c) { return no(c.ABERTO_EM); });
  var atendidos = ch.filter(function (c) { return no(c.ATENDIDO_EM); });
  var cumpridos = 0, fora = [];
  var tempos = [];
  atendidos.forEach(function (c) {
    var e = Ast_slaEstado_(c, agora, regras);
    if (e.estado === 'CUMPRIDO') cumpridos++; else if (e.estado === 'FORA_DO_PRAZO') fora.push({ numero: c.NUMERO, cliente: c.CLIENTE_NOME, prioridade: c.PRIORIDADE, texto: e.texto });
    var t = Ast_minUteisEntre_(Ast_ms_(c.ABERTO_EM), Ast_ms_(c.ATENDIDO_EM)); if (t >= 0) tempos.push(t);
  });
  var estouradosAgora = ch.filter(function (c) { return AST_TERMINAIS.indexOf(Ast_up_(c.SITUACAO)) < 0 && Ast_slaEstado_(c, agora, regras).estado === 'ESTOURADO'; })
    .map(function (c) { return { numero: c.NUMERO, cliente: c.CLIENTE_NOME, prioridade: c.PRIORIDADE, situacao: AST_SITUACOES[Ast_up_(c.SITUACAO)] || c.SITUACAO }; });
  var porPrioridade = Object.keys(AST_PRIORIDADES).map(function (p) {
    var l = atendidos.filter(function (c) { return Ast_up_(c.PRIORIDADE) === p; });
    var ok = l.filter(function (c) { return Ast_slaEstado_(c, agora, regras).estado === 'CUMPRIDO'; }).length;
    return { prioridade: p, nome: AST_PRIORIDADES[p], atendidos: l.length, cumpridos: ok, pct: l.length ? Math.round(ok * 100 / l.length) : null };
  });
  var media = tempos.length ? Math.round(tempos.reduce(function (s, x) { return s + x; }, 0) / tempos.length) : 0;
  // reincidência: chamados reincidentes do mês e equipamentos com 2 ou mais chamados nos últimos 90 dias
  var reinc = abertos.filter(function (c) { return Ast_sim_(c.REINCIDENTE); }).map(function (c) { return { numero: c.NUMERO, de: c.REINCIDENCIA_DE, equipamento: c.EQUIPAMENTO_TEXTO, cliente: c.CLIENTE_NOME }; });
  var lim90 = Ast_somarDias_(fim, -90), porEq = {};
  ch.forEach(function (c) { var d = Ast_dia_(c.ABERTO_EM); if (!Ast_s_(c.EQUIPAMENTO_ID) || Ast_up_(c.SITUACAO) === 'CANCELADO' || !d || d < lim90 || d > fim) return; var k = Ast_s_(c.EQUIPAMENTO_ID); (porEq[k] = porEq[k] || { equipamento: c.EQUIPAMENTO_TEXTO, cliente: c.CLIENTE_NOME, qtd: 0 }).qtd++; });
  var equipReinc = Object.keys(porEq).map(function (k) { return porEq[k]; }).filter(function (x) { return x.qtd >= 2; }).sort(function (a, b) { return b.qtd - a.qtd; }).slice(0, 15);
  // O.S. por técnico
  var porTec = {};
  oss.forEach(function (o) {
    var id = Ast_s_(o.TECNICO_ID); if (!id) return;
    var t = porTec[id] = porTec[id] || { nome: Ast_s_(o.TECNICO_NOME), encerradas: 0, docPendente: 0, minutosLocal: [], semAssinatura: 0, divergencias: 0 };
    if (Ast_up_(o.SITUACAO) === 'ENCERRADA' && no(o.ENCERRADA_EM)) {
      t.encerradas++;
      var a = Ast_ms_(o.CHEGOU_EM), b = Ast_ms_(o.CONCLUIU_EM); if (a !== null && b !== null && b > a) t.minutosLocal.push((b - a) / 60000);
      if (!Ast_s_(o.ASSINATURA_ARQUIVO_ID)) t.semAssinatura++;
      if (Ast_sim_(o.SERIE_DIVERGENTE)) t.divergencias++;
    }
    if (Ast_up_(o.SITUACAO) === 'DOC_PENDENTE') t.docPendente++;
  });
  var tecnicos = Object.keys(porTec).map(function (k) { var t = porTec[k]; return { nome: t.nome, encerradas: t.encerradas, docPendente: t.docPendente, mediaLocalMin: t.minutosLocal.length ? Math.round(t.minutosLocal.reduce(function (s, x) { return s + x; }, 0) / t.minutosLocal.length) : 0, semAssinatura: t.semAssinatura, divergencias: t.divergencias }; })
    .filter(function (t) { return t.encerradas || t.docPendente; }).sort(function (a, b) { return b.encerradas - a.encerradas; });
  var porTipo = {};
  oss.forEach(function (o) { if (Ast_up_(o.SITUACAO) === 'ENCERRADA' && no(o.ENCERRADA_EM)) porTipo[Ast_s_(o.TIPO_NOME) || 'Sem tipo'] = (porTipo[Ast_s_(o.TIPO_NOME) || 'Sem tipo'] || 0) + 1; });
  var casos = Ast_ler_(AST_ABAS.CASOS);
  var auvoMes = 0;
  try { if (typeof SGO_Atendimentos_linhas_ === 'function') auvoMes = SGO_Atendimentos_linhas_({ origem: 'AUVO' }).filter(function (t) { return no(t.DATA_TAREFA); }).length; } catch (e) {}
  return {
    comp: comp, abertos: abertos.length, atendidos: atendidos.length, encerrados: ch.filter(function (c) { return no(c.ENCERRADO_EM); }).length, cancelados: ch.filter(function (c) { return no(c.CANCELADO_EM); }).length,
    slaPct: atendidos.length ? Math.round(cumpridos * 100 / atendidos.length) : null, cumpridos: cumpridos, foraDoPrazo: fora, estouradosAgora: estouradosAgora, porPrioridade: porPrioridade,
    tempoMedioMinUteis: media, reincidentes: reinc, equipamentosReincidentes: equipReinc, tecnicos: tecnicos,
    porTipo: Object.keys(porTipo).map(function (k) { return { tipo: k, qtd: porTipo[k] }; }).sort(function (a, b) { return b.qtd - a.qtd; }),
    reclamacoes: { abertas: casos.filter(function (k) { return no(k.CRIADO_EM); }).length, resolvidas: casos.filter(function (k) { return no(k.RESOLVIDO_EM); }).length, pendentes: casos.filter(function (k) { return Ast_up_(k.SITUACAO) !== 'RESOLVIDO'; }).length },
    docPendenteAgora: oss.filter(function (o) { return Ast_up_(o.SITUACAO) === 'DOC_PENDENTE'; }).length, osSgoMes: oss.filter(function (o) { return no(o.AGENDADO_PARA) && Ast_up_(o.SITUACAO) !== 'CANCELADA'; }).length, tarefasAuvoMes: auvoMes
  };
}
function AstR_relatorioMesHtml_(ind, quem) {
  var t = function (cols, linhas, leg, vazio) { return RelA4_tabela_(cols, linhas, { legenda: leg, vazio: vazio }); };
  var corpo = RelA4_secao_('Resumo do mês', RelA4_kpis_([
    [ind.slaPct === null ? '—' : ind.slaPct + '%', 'Atendimentos no prazo (' + ind.cumpridos + ' de ' + ind.atendidos + ')', ind.slaPct === null ? '' : ind.slaPct >= 90 ? 'ok' : ind.slaPct >= 75 ? 'aviso' : 'critico'],
    [Ast_duracaoTxt_(ind.tempoMedioMinUteis), 'Tempo médio de atendimento (horas úteis)', ''], [String(ind.abertos), 'Chamados abertos no mês', ''], [String(ind.encerrados), 'Chamados encerrados no mês', 'ok'],
    [String(ind.estouradosAgora.length), 'Prazos estourados agora', ind.estouradosAgora.length ? 'critico' : 'ok'], [String(ind.reincidentes.length), 'Reincidências no mês', ind.reincidentes.length ? 'aviso' : 'ok'],
    [String(ind.docPendenteAgora), 'O.S. com documentação pendente agora', ind.docPendenteAgora ? 'aviso' : 'ok'], [String(ind.reclamacoes.pendentes), 'Reclamações em aberto', ind.reclamacoes.pendentes ? 'aviso' : 'ok']
  ]));
  corpo += RelA4_secao_('Prazo de atendimento por prioridade', t([{ t: 'Prioridade' }, { t: 'Atendidos', num: true }, { t: 'No prazo', num: true }, { t: '%', num: true }], ind.porPrioridade.map(function (p) { return [p.nome, String(p.atendidos), String(p.cumpridos), p.pct === null ? '—' : p.pct + '%']; }), 'Atendimentos do mês por prioridade', 'Nenhum atendimento no mês.') +
    RelA4_subsecao_('Atendidos fora do prazo', t([{ t: 'Chamado' }, { t: 'Cliente' }, { t: 'Prioridade' }, { t: 'Detalhe' }], ind.foraDoPrazo.map(function (x) { return [x.numero, x.cliente, x.prioridade, x.texto]; }), 'Chamados atendidos depois do prazo', 'Nenhum.')) +
    RelA4_subsecao_('Prazos estourados na data do relatório', t([{ t: 'Chamado' }, { t: 'Cliente' }, { t: 'Prioridade' }, { t: 'Situação' }], ind.estouradosAgora.map(function (x) { return [x.numero, x.cliente, x.prioridade, x.situacao]; }), 'Chamados em aberto com o prazo vencido', 'Nenhum.')));
  corpo += RelA4_secao_('O.S. por técnico', t([{ t: 'Técnico' }, { t: 'Encerradas', num: true }, { t: 'Doc. pendente', num: true }, { t: 'Tempo médio no local', num: true }, { t: 'Sem assinatura', num: true }, { t: 'Série divergente', num: true }],
    ind.tecnicos.map(function (x) { return [x.nome, String(x.encerradas), String(x.docPendente), x.mediaLocalMin ? Ast_duracaoTxt_(x.mediaLocalMin) : '—', String(x.semAssinatura), String(x.divergencias)]; }), 'O.S. encerradas no mês e documentação pendente agora', 'Nenhuma O.S. no mês.'));
  corpo += RelA4_secao_('Reincidência por equipamento', t([{ t: 'Equipamento' }, { t: 'Cliente' }, { t: 'Chamados em 90 dias', num: true }], ind.equipamentosReincidentes.map(function (x) { return [x.equipamento, x.cliente, String(x.qtd)]; }), 'Equipamentos com dois ou mais chamados nos últimos 90 dias', 'Nenhum equipamento com reincidência.'));
  corpo += RelA4_secao_('Serviços do mês', t([{ t: 'Tipo de serviço' }, { t: 'O.S. encerradas', num: true }], ind.porTipo.map(function (x) { return [x.tipo, String(x.qtd)]; }), 'O.S. encerradas por tipo de serviço', 'Nenhuma.') +
    '<p class="nota">Uso em paralelo ao Auvo: ' + ind.osSgoMes + ' O.S. no SGO+ e ' + ind.tarefasAuvoMes + ' tarefa(s) no Auvo no mês. Reclamações: ' + ind.reclamacoes.abertas + ' registradas e ' + ind.reclamacoes.resolvidas + ' resolvidas no mês.</p>');
  return RelA4_documento_({ titulo: 'Relatório mensal da assistência técnica', subtitulo: RelA4_competencia_(ind.comp), tituloCurto: 'Relatório da assistência', tituloArquivo: 'Relatorio da assistencia tecnica', sigla: 'AST',
    identificacao: RelA4_competencia_(ind.comp), rotuloIdentificacao: 'Competência', emitidoPor: quem || 'Rotina automática', corpo: corpo, tipoCapa: 'Relatório gerencial' });
}
/** Gera e salva o relatório da competência (usado pela tela, pela rotina e pelo e-mail mensal da Diretoria). */
function Assistencia_relatorioMes_(comp, quem) {
  Ast_memoLimpar_();
  try { Ast_garantirAbas_(); } catch (e) {}
  var ind = AstR_indicadores_(comp);
  var html = AstR_relatorioMesHtml_(ind, quem);
  var g = RelA4_salvar_(function () { return SGO_DocSalvar_pastaPersistente_('ATEC_PASTA_RELMES_ID', AST_PASTA_RELMES, ''); }, comp, html, { compartilhar: false });
  return { salvo: g.salvo, link: g.pdfUrl, aviso: g.aviso, html: g.html, pdfUrl: g.pdfUrl, pastaUrl: g.pastaUrl, indicadores: ind };
}
function Assistencia_emUso_() { try { return AstF_lerAba_(AST_ABAS.CHAMADOS).length > 0; } catch (e) { return false; } }
