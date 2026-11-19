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

// 13/11/2026: até 24 fotos no PDF (antes 12, e o cliente não via as outras); acima disso a nota diz quais e como pedir
var AST_REL_MAX_FOTOS = 24;
var AST_PASTA_ORCAMENTOS = 'Assistência técnica - Orçamentos';
var AST_PASTA_RELMES = 'Assistência técnica - Relatórios mensais';

function AstR_b64Arquivo_(id) {
  try { var b = DriveApp.getFileById(String(id)).getBlob(); return { mime: b.getContentType() || 'image/jpeg', data: Utilities.base64Encode(b.getBytes()) }; } catch (e) { return null; }
}

/**
 * 03/11/2026 (logística): O.S. de entrega, retirada ou envio sai como TERMO (entrega, retirada ou envio), sem as seções de
 * manutenção (condição encontrada, causa, serviço, teste funcional, peças). O.S. de logística registrada antes do termo (só com o
 * relato escrito) continua saindo: o equipamento da O.S. vira o item e o relato entra nas observações; nada se perde.
 */
function AstR_htmlTermo_(os, o, tipo, rascunho) {
  var c = Ast_porId_(AST_ABAS.CHAMADOS, os.CHAMADO_ID) || {}, eq = Ast_mapa_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS)[Ast_s_(os.EQUIPAMENTO_ID)] || {};
  var cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(os.CLIENTE_ID)] || {};
  var s = tipo.logistica.sentido, rot = AST_LOG_ROTULOS[s] || AST_LOG_ROTULOS.ENTREGA;
  var lg = AstO_logistica_(os), antigo = !lg;
  lg = lg || { itens: [], contraparte: {}, local: '', motivo: '', destino: '', embalagem: '', lacre: '', rastreio: '', observacoes: '' };
  var ctp = lg.contraparte || {};
  var serieEq = Ast_s_(os.SERIE_CONFIRMADA) || Ast_s_(eq.SERIE);
  var itens = lg.itens.length ? lg.itens : (Ast_s_(os.EQUIPAMENTO_TEXTO) || Ast_s_(eq.TIPO) ? [{ descricao: [Ast_s_(eq.TIPO), Ast_s_(eq.MODELO)].filter(Boolean).join(' · ') || Ast_eqSemIdent_(os.EQUIPAMENTO_TEXTO), quantidade: 1,
    identificacao: [!Ast_vazioCad_(serieEq) ? 'Série ' + serieEq : '', !Ast_vazioCad_(eq.PATRIMONIO) ? 'Patrimônio ' + Ast_s_(eq.PATRIMONIO) : '', !Ast_vazioCad_(eq.TAG) ? 'TAG ' + Ast_s_(eq.TAG) : ''].filter(Boolean).join(' · '),
    estado: '', avaria: '', acessorios: '' }] : []);
  var corpo = '';
  if (rascunho) corpo += RelA4_caixa_('RASCUNHO: a O.S. ainda não foi encerrada' + (Ast_s_(os.FALTAS) ? ' (falta: ' + Ast_s_(os.FALTAS) + ')' : '') + '. Este documento não vale como termo final.', 'aviso');
  corpo += RelA4_secao_('Identificação', RelA4_identificacao_([
    ['Cliente', Ast_s_(os.CLIENTE_NOME) || Ast_clienteNome_(cli), { largo: true }], ['CNPJ', Ast_s_(cli.CNPJ)], ['Unidade', Ast_s_(os.UNIDADE_NOME)],
    ['Endereço', Ast_s_(os.ENDERECO), { largo: true }], ['Local ou setor', lg.local || Ast_s_(eq.SETOR)], ['Chamado', Ast_s_(os.CHAMADO_NUMERO)], ['Solicitante', Ast_s_(c.SOLICITANTE)]
  ].filter(function (p) { return ['Local ou setor', 'Solicitante'].indexOf(p[0]) < 0 || Ast_s_(p[1]); })));
  var linhaHora = function (srv, ap) { var t = Ast_br_(srv); var a = Ast_ms_(ap), b = Ast_ms_(srv); if (t && a !== null && b !== null && Math.abs(a - b) > 5 * 60000) t += ' (no aparelho: ' + Ast_br_(ap) + ')'; return t; };
  var mov = [['Tipo de serviço', tipo.nome], ['Movimentação', AST_LOG_SENTIDOS[s] || s], ['Colaborador da Metrolabs', Ast_s_(os.TECNICO_NOME)],
    ['Chegada ao local', linhaHora(os.CHEGOU_EM, os.CHEGOU_EM_APARELHO) || '—'], ['Conclusão', linhaHora(os.CONCLUIU_EM, os.CONCLUIU_EM_APARELHO) || '—'],
    [s === 'ENTREGA' ? 'Para quem (quem recebe)' : s === 'RETIRADA' ? 'De quem (quem entrega)' : 'Destinatário', [ctp.nome, ctp.documento, ctp.setor].filter(Boolean).join(' · ') || Ast_s_(os.ASSINATURA_NOME) || Ast_s_(os.SEM_ASSINATURA_RECEBIDO_POR) || '—', { largo: true }]];
  if (s === 'RETIRADA') mov.push(['Motivo da retirada', lg.motivo || Ast_s_(c.SINTOMA) || '—', { largo: true }], ['Destino', AST_LOG_DESTINOS[lg.destino] || '—']);
  if (s === 'ENVIO') mov.push(['Transportadora e rastreio', lg.rastreio || '—', { largo: true }]);
  if (lg.embalagem || lg.lacre) mov.push(['Embalagem', AST_LOG_EMBALAGENS[lg.embalagem] || '—'], ['Lacre', lg.lacre || '—']);
  if (Ast_s_(os.OBS_LOCALIZACAO)) mov.push(['Observação da localização', Ast_s_(os.OBS_LOCALIZACAO), { largo: true }]);
  corpo += RelA4_secao_('Movimentação', RelA4_identificacao_(mov));
  corpo += RelA4_secao_('Itens ' + (s === 'ENTREGA' ? 'entregues' : s === 'RETIRADA' ? 'retirados' : 'enviados'), RelA4_tabela_([{ t: 'Nº', cen: true, w: '8mm' }, { t: 'Item' }, { t: 'Qtd.', num: true }, { t: 'Identificação (série, patrimônio, TAG)' }, { t: 'Estado aparente' }, { t: 'Acessórios' }],
    itens.map(function (i, k) { return [String(k + 1), i.descricao, i.quantidade ? Ast_fmtNum_(Number(i.quantidade) || 0, Math.round(Number(i.quantidade)) === Number(i.quantidade) ? 0 : 2) : '—', i.identificacao, AST_LOG_ESTADOS[i.estado] || '—', i.acessorios]; }),
    { vazio: 'Nenhum item registrado.' }));
  var av = itens.map(function (i, k) { return i.estado === 'AVARIA' ? RelA4_subsecao_('Item ' + (k + 1) + ': ' + i.descricao, RelA4_paragrafos_(i.avaria || 'Avaria sem descrição.')) : ''; }).join('');
  if (av) corpo += RelA4_secao_('Avarias encontradas', av + '<p class="nota">As fotos das avarias estão na seção Fotos.</p>');
  var resp = AstO_respostas_(os), perg = AstO_perguntas_(os), fotos = AstO_fotos_(os.ID), ord = AstR_fotosOrdenadas_(fotos);
  if (perg.length) {
    // 13/11/2026: sem as linhas de assinatura (seção própria), foto com a referência numerada, texto longo fora da tabela
    var ck = AstR_checklistHtml_(perg, resp, ord, 'Conferência ' + ((Ast_modelo_(os.MODELO_CODIGO) || {}).nome || ''));
    if (ck) corpo += RelA4_secao_('Conferência', ck);
  }
  var obs = '';
  if (lg.observacoes) obs += RelA4_paragrafos_(lg.observacoes);
  [['Relato', os.RELATO], ['Serviço realizado', os.SERVICO_REALIZADO], ['Condição encontrada', os.CONDICAO_ENCONTRADA], ['Recomendações', os.RECOMENDACOES]]
    .forEach(function (x) { if (Ast_s_(x[1])) obs += RelA4_subsecao_(x[0], RelA4_paragrafos_(x[1])); });
  if (obs) corpo += RelA4_secao_('Observações', obs + (antigo ? '<p class="nota">Atendimento registrado antes do termo próprio da logística (03/11/2026): o item vem do equipamento da O.S. e o relato escrito aparece acima.</p>' : ''));
  if (ord.length) corpo += RelA4_secao_('Fotos', AstR_fotosHtml_(os, ord, perg));
  var imgCli = Ast_s_(os.ASSINATURA_ARQUIVO_ID) ? AstR_b64Arquivo_(os.ASSINATURA_ARQUIVO_ID) : null;
  var assCli = { papel: rot.papelCliente, nome: Ast_s_(os.ASSINATURA_NOME) || Ast_s_(os.SEM_ASSINATURA_RECEBIDO_POR) || ctp.nome || ' ',
    cargo: Ast_s_(os.ASSINATURA_DOCUMENTO) || (Ast_s_(os.SEM_ASSINATURA_MOTIVO) ? 'Sem assinatura: ' + (AST_MOTIVOS_SEM_ASSINATURA[Ast_up_(os.SEM_ASSINATURA_MOTIVO)] || '') : ctp.documento || ''), imagemBase64: imgCli ? { mimeType: 'image/png', data: imgCli.data } : null };
  var assCol = AstR_assinaturaColab_(os, rot.papelColab);
  var ass = (s === 'RETIRADA' ? [assCli, assCol] : [assCol, assCli]).filter(Boolean);
  // 16/11/2026 (opção B do dono): entrega de equipamento que passou pela guarda da Metrolabs leva a declaração completa, a mesma
  // mostrada a quem recebe na tela de assinatura do aplicativo (AstR_declaracaoEntrega_); os demais termos ficam como sempre
  var decEnt = s === 'ENTREGA' ? AstR_declaracaoEntrega_(os) : null;
  corpo += RelA4_secao_('Assinaturas', (decEnt ? AstR_declaracaoEntregaHtml_(os, decEnt) : '<p>' + Ast_esc_(rot.declaracao) + '</p>') + (typeof SGO_DocA4_assinaturas_ === 'function' ? SGO_DocA4_assinaturas_(ass) : '') +
    (Ast_s_(os.SEM_ASSINATURA_JUSTIFICATIVA) ? '<p class="nota">Justificativa da falta de assinatura: ' + Ast_esc_(os.SEM_ASSINATURA_JUSTIFICATIVA) + '</p>' : '') +
    AstR_notaAssinaturas_(os));
  corpo += RelA4_secao_('Rastreabilidade do atendimento', AstR_rastreabilidade_(os, c, fotos, { logistica: true, papelCliente: rot.papelCliente, papelColab: rot.papelColab }));
  corpo += '<p class="nota" style="margin-top:4mm">Marca de conferência do conteúdo: ' + Ast_esc_(o.marca || '') + '. Qualquer alteração no conteúdo deste termo muda esta marca.</p>';
  return RelA4_documento_({ titulo: rot.titulo + (rascunho ? ' (rascunho)' : ''), subtitulo: Ast_s_(os.CLIENTE_NOME), tituloCurto: rot.titulo, tituloArquivo: AstR_nomeTermo_(s),
    numero: Ast_s_(os.NUMERO), revisao: Number(o.revisao) || 0, identificacao: itens.length ? itens.map(function (i) { return i.descricao; }).join('; ').slice(0, 120) : Ast_s_(os.CLIENTE_NOME), rotuloIdentificacao: itens.length > 1 ? 'Itens' : 'Item',
    ficha: [['Tipo de serviço', tipo.nome], ['Colaborador', Ast_s_(os.TECNICO_NOME)], ['Situação', rascunho ? 'Rascunho' : 'Encerrada em ' + Ast_br_(os.ENCERRADA_EM)]], corpo: corpo, capa: false, sumario: false });
}
/**
 * 03/11/2026 (decisão do dono): assinatura do técnico ou colaborador da Metrolabs no A4 (relatório e termo). Sem ela (O.S. antiga ou
 * dispensada pela gestão), a linha sai com o nome do técnico da O.S. e "assinatura não registrada" (com a justificativa, se houver).
 */
function AstR_assinaturaColab_(os, papel) {
  var tp = Ast_tipo_(os.TIPO_CODIGO);
  if (tp && tp.semVisita && !Ast_s_(os.COLAB_ASSINATURA_ARQUIVO_ID)) return null;   // sem visita: a linha do técnico não se aplica
  var img = Ast_s_(os.COLAB_ASSINATURA_ARQUIVO_ID) ? AstR_b64Arquivo_(os.COLAB_ASSINATURA_ARQUIVO_ID) : null, doc = Ast_s_(os.COLAB_ASSINATURA_DOCUMENTO);
  return { papel: papel, nome: Ast_s_(os.COLAB_ASSINATURA_NOME) || Ast_s_(os.TECNICO_NOME) || ' ',
    cargo: Ast_s_(os.COLAB_ASSINATURA_ARQUIVO_ID) ? (doc ? doc + ' · ' : '') + 'Metrolabs' : 'Metrolabs · assinatura não registrada' + (Ast_s_(os.COLAB_DISPENSA_JUSTIFICATIVA) ? ' (dispensada pela gestão)' : ''),
    imagemBase64: img ? { mimeType: 'image/png', data: img.data } : null };
}
function AstR_notaAssinaturas_(os) {
  return (Ast_s_(os.ASSINATURA_EM) || Ast_s_(os.COLAB_ASSINATURA_EM) ? '<p class="nota">Assinado na tela do aparelho' + (Ast_s_(os.ASSINATURA_EM) ? ' (cliente em ' + Ast_esc_(Ast_br_(os.ASSINATURA_EM)) + ')' : '') +
      (Ast_s_(os.COLAB_ASSINATURA_EM) ? ' (Metrolabs em ' + Ast_esc_(Ast_br_(os.COLAB_ASSINATURA_EM)) + ')' : '') + '.</p>' : '') +
    (Ast_s_(os.COLAB_DISPENSA_JUSTIFICATIVA) ? '<p class="nota">Encerrada sem a assinatura do técnico, por ' + Ast_esc_(Ast_s_(os.COLAB_DISPENSA_POR_NOME) || 'gestão') + (Ast_s_(os.COLAB_DISPENSA_EM) ? ' em ' + Ast_esc_(Ast_br_(os.COLAB_DISPENSA_EM)) : '') + ': ' + Ast_esc_(os.COLAB_DISPENSA_JUSTIFICATIVA) + '</p>' : '');
}
/** Nome do arquivo do termo, sem acento (como "Relatorio da OS"). */
function AstR_nomeTermo_(sentido) { return { ENTREGA: 'Termo de entrega da OS', RETIRADA: 'Termo de retirada da OS', ENVIO: 'Termo de envio da OS' }[sentido] || 'Termo de entrega da OS'; }
/**
 * 16/11/2026 (decisão do dono, opção B): DECLARAÇÃO DO TERMO DE ENTREGA de equipamento que passou pela guarda da Metrolabs
 * (retirada com ou sem termo, inclusive chamado de representada). O texto é mostrado ao recebedor na tela de assinatura do
 * aplicativo do técnico ANTES do quadro e é o mesmo que sai no PDF do termo de entrega (e no documento do hospital).
 * Uma função só monta o texto: AstR_declaracaoEntregaTexto_ (aqui) e declaracaoEntregaTexto (publico/campo/app.js) têm o
 * MESMO corpo, sem dependência nenhuma (o teste representacao-dossie-20261116 confere que são idênticos). Entrada: o termo
 * (contraparte, itens, observações), as respostas da conferência e a base que vem do servidor (retiradaEm, semTermo, ocultar).
 * Nunca leva o nome da representada (ocultar: nomes trocados por "o fabricante"); não tem hora da entrega (o texto é o mesmo
 * antes e depois da assinatura).
 */
function AstR_declaracaoEntregaTexto_(d) {
  d = d || {};
  var s = function (v) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim(); };
  var tira = function (t) { var r = s(t); (d.ocultar || []).forEach(function (n) { n = s(n); if (n.length >= 3) r = r.split(n).join('o fabricante'); }); return r; };
  var ponto = function (t) { t = s(t); return t && !/[.!?]$/.test(t) ? t + '.' : t; };
  var estados = { BOM: 'em bom estado', AVARIA: 'com avaria', NA: 'estado não se aplica' };
  var ctp = d.contraparte || {}, quem = tira(ctp.nome) || 'quem recebe', doc = tira(ctp.documento), setor = tira(ctp.setor);
  var p = ['Eu, ' + quem + (doc ? ' (' + doc + ')' : '') + (setor ? ', do setor ' + setor : '') + ', declaro que recebi da Metrolabs o equipamento relacionado abaixo, nas condições descritas neste termo.'];
  var itens = (d.itens || []).filter(function (i) { return i && s(i.descricao); });
  if (!itens.length && s(d.equipamento)) itens = [{ descricao: d.equipamento, quantidade: 1, identificacao: '', estado: '', acessorios: '' }];
  itens.forEach(function (i) {
    var q = Number(i.quantidade) || 1, e = s(i.estado).toUpperCase();
    p.push((q > 1 ? q + 'x ' : '') + tira(i.descricao) + (s(i.identificacao) ? ' (' + tira(i.identificacao) + ')' : '') + ': ' + (estados[e] || 'estado não registrado') +
      (e === 'AVARIA' && s(i.avaria) ? ' (' + tira(i.avaria) + ')' : '') + (s(i.acessorios) ? '; acessórios: ' + tira(i.acessorios) : '') + '.');
  });
  var conf = (d.conferencia || []).filter(function (c) { return c && s(c.texto) && ['FOTO', 'ASSINATURA'].indexOf(s(c.tipo).toUpperCase()) < 0 && s(c.valor) !== ''; }).map(function (c) {
    var v = c.valor === true || s(c.valor).toUpperCase() === 'SIM' ? 'sim' : c.valor === false || s(c.valor).toUpperCase() === 'NAO' ? 'não' : tira(c.valor);
    return s(c.texto).replace(/[?:.\s]+$/, '') + ': ' + v;
  });
  // quem recebe é o hospital: frase com assunto comercial (garantia, protocolo, nota fiscal, rastreio, orçamento, valores) não entra
  var obs = tira(d.observacoes).split(/(?<=[.;])\s+/).filter(function (f) { return f && !/garantia|\bRMA\b|protocolo|nota fiscal|\bNF\b|rastreio|or[çc]amento|R\$/i.test(f); }).join(' ');
  if (conf.length || obs) p.push('Verificações e testes feitos no local, na entrega: ' + (conf.length ? conf.join('; ') + '.' : '') + (obs ? (conf.length ? ' ' : '') + ponto(obs) : ''));
  if (s(d.retiradaEm)) p.push('O equipamento esteve na oficina da Metrolabs de ' + s(d.retiradaEm) + ' até a entrega' + (d.semTermo ? ', retirado sem termo de retirada assinado; esta assinatura confirma também a retirada e esse período.' : '.'));
  return p;
}
/**
 * Base que só o servidor sabe (vai ao aplicativo em AstApp_os_.declaracaoEntrega): quando o equipamento saiu do cliente e se
 * houve termo. Vale para O.S. de ENTREGA de chamado com guarda registrada (fluxo da representada) ou com O.S. de retirada
 * encerrada. Nos demais termos devolve null (a tela e o PDF ficam como sempre).
 */
function AstR_declaracaoEntregaBase_(os) {
  try {
    var tp = Ast_tipo_(os && os.TIPO_CODIGO);
    if (!tp || !tp.logistica || tp.logistica.sentido !== 'ENTREGA' || !Ast_s_(os.CHAMADO_ID)) return null;
    var c = Ast_porId_(AST_ABAS.CHAMADOS, os.CHAMADO_ID) || {}, de = '', semTermo = false;
    if (typeof RepF_guarda_ === 'function' && Ast_s_(c.GUARDA_JSON)) {
      var g = RepF_guarda_(c), hist = (g.historico || []).concat(g.implicito ? [] : [g]);
      var saiu = hist.filter(function (h) { return h.onde !== 'CLIENTE' && Ast_s_(h.desde); })[0];
      if (saiu) { de = Ast_s_(saiu.desde); semTermo = !saiu.comTermo; }
    }
    if (!de) {
      var ret = Ast_ler_(AST_ABAS.OS).filter(function (o) { var t = Ast_tipo_(o.TIPO_CODIGO); return Ast_s_(o.CHAMADO_ID) === Ast_s_(os.CHAMADO_ID) && Ast_s_(o.ID) !== Ast_s_(os.ID) && t && t.logistica && t.logistica.sentido === 'RETIRADA' && Ast_up_(o.SITUACAO) === 'ENCERRADA'; })
        .sort(function (a, b) { return String(a.CONCLUIU_EM || a.ENCERRADA_EM).localeCompare(String(b.CONCLUIU_EM || b.ENCERRADA_EM)); })[0];
      if (ret) { de = Ast_s_(ret.CONCLUIU_EM) || Ast_s_(ret.ENCERRADA_EM); semTermo = !Ast_s_(ret.ASSINATURA_ARQUIVO_ID); }
    }
    if (!de) return null;
    var ocultar = [];
    if (Ast_s_(c.REPRESENTADA_ID)) { ocultar = (typeof RepF_nomesContasRep_ === 'function' ? RepF_nomesContasRep_(c.REPRESENTADA_ID).slice() : []).concat([Ast_s_(c.REPRESENTADA_NOME)]).filter(Boolean); }
    return { retiradaEm: Ast_br_(de), semTermo: semTermo, ocultar: ocultar, equipamento: Ast_eqSemIdent_(Ast_s_(os.EQUIPAMENTO_TEXTO)) };
  } catch (e) { return null; }
}
/** Declaração montada com o que o servidor tem da O.S. (o PDF usa esta). null quando não se aplica. */
function AstR_declaracaoEntrega_(os) {
  var base = AstR_declaracaoEntregaBase_(os);
  if (!base) return null;
  var lg = AstO_logistica_(os) || {}, resp = AstO_respostas_(os);
  var par = AstR_declaracaoEntregaTexto_({ contraparte: lg.contraparte || {}, itens: lg.itens || [], observacoes: lg.observacoes || '', retiradaEm: base.retiradaEm, semTermo: base.semTermo, ocultar: base.ocultar,
    equipamento: base.equipamento, conferencia: AstO_perguntas_(os).map(function (q) { return { texto: q.texto, tipo: q.tipo, valor: resp[q.id] ? resp[q.id].v : '' }; }) });
  return { paragrafos: par, texto: par.join('\n'), marca: Ast_marca_(par.join('\n')).slice(0, 12) };
}
/** Marca da declaração que o aplicativo mostrou na hora da assinatura (gravada no evento ASSINATURA), ou ''. */
function AstR_marcaMostrada_(os) {
  var ev = Ast_ler_(AST_ABAS.EVENTOS).filter(function (e) { return Ast_up_(e.ENTIDADE) === 'OS' && Ast_s_(e.ENTIDADE_ID) === Ast_s_(os.ID) && Ast_up_(e.TIPO) === 'ASSINATURA'; }).pop();
  var m = ev ? /marca ([0-9a-f]{12})\)/.exec(Ast_s_(ev.TEXTO)) : null;
  return m ? m[1] : '';
}
/** HTML da declaração no A4 (termo da O.S. e documento do hospital), com a nota de que foi a mesma mostrada na assinatura. */
function AstR_declaracaoEntregaHtml_(os, dec) {
  dec = dec || AstR_declaracaoEntrega_(os);
  if (!dec) return '';
  var mostrada = AstR_marcaMostrada_(os), esc = typeof Ast_esc_ === 'function' ? Ast_esc_ : RelA4_esc_;
  var nota = mostrada === dec.marca ? 'Declaração mostrada a quem recebeu na tela de assinatura do aparelho, antes de assinar (marca ' + dec.marca + ').' :
    mostrada ? 'Atenção: o texto mostrado na tela de assinatura (marca ' + mostrada + ') é diferente do texto acima (marca ' + dec.marca + '): o termo foi alterado depois da assinatura.' :
    'Marca da declaração: ' + dec.marca + '.';
  return '<div class="declaracao-entrega">' + dec.paragrafos.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div><p class="nota">' + esc(nota) + '</p>';
}
/** Título do documento da O.S. para e-mail, Enviar documento e avisos: termo (logística) ou relatório de atendimento técnico. */
function AstR_tituloDocOS_(os) {
  var t = Ast_tipo_(os && os.TIPO_CODIGO);
  if (t && t.ronda) return 'Relatório de ronda de engenharia clínica';
  return t && t.logistica ? (AST_LOG_ROTULOS[t.logistica.sentido] || AST_LOG_ROTULOS.ENTREGA).titulo : 'Relatório de atendimento técnico';
}

// ------------------------------------------------------------
// 13/11/2026 (relatório de excelência, pedido do dono): rastreabilidade legível, resultado do atendimento no topo, medições,
// checklist sem linhas repetidas, fotos numeradas com legenda. O.S. antiga (sem os campos novos) sai sem afirmar o que não foi
// registrado. Nada do banco é apagado nem reescrito: a trilha completa de eventos continua no SGO+; o PDF mostra o resumo.
// ------------------------------------------------------------
/** Rótulo vindo do checklist ou do Auvo: sem dois-pontos no fim e, se estiver todo em maiúsculas, em caixa normal. */
function AstR_rotulo_(t) {
  var s = Ast_s_(t).replace(/\s*:+\s*$/, '').replace(/\s+/g, ' ');
  if (s.replace(/[^A-Za-zÀ-ÿ]/g, '').length >= 4 && s === s.toUpperCase()) s = s.charAt(0) + s.slice(1).toLowerCase();
  return s;
}
/** Nome de pessoa gravado em maiúsculas ("HIDELBRANDO SAMPAIO ABREU") em forma de leitura ("Hidelbrando Sampaio Abreu"). */
function AstR_nomeLeitura_(n) {
  var s = Ast_s_(n);
  if (!s || s !== s.toUpperCase()) return s;
  return s.toLowerCase().split(/\s+/).map(function (p, i) { return i > 0 && /^(da|de|do|das|dos|e)$/.test(p) ? p : p.charAt(0).toUpperCase() + p.slice(1); }).join(' ');
}
/** Texto de evento para o cliente: sem nome de arquivo, sem id interno, sem dois-pontos dobrado, cortado em palavra inteira. */
function AstR_textoEvento_(t, max) {
  var s = Ast_s_(t).replace(/\S+\.(?:jpe?g|png|webp|gif|pdf|html?)\b/gi, '').replace(/\(\s*pergunta\s+[A-Za-z0-9_:.-]+\s*\)/gi, '').replace(/:{2,}/g, ':')
    .replace(/\s+([.,;:])/g, '$1').replace(/\s{2,}/g, ' ').replace(/[\s:·,-]+$/, '').trim();
  max = max || 220;
  if (s.length <= max) return s;
  var corte = s.slice(0, max), esp = corte.lastIndexOf(' ');
  return (esp > max * 0.6 ? corte.slice(0, esp) : corte).replace(/[\s.,;:·-]+$/, '') + '…';
}
/** Texto corrido do técnico: cada quebra de linha vira parágrafo (títulos curtos ficam separados); linhas "- " seguem como lista. */
function AstR_par_(t) { return RelA4_paragrafos_(Ast_s_(t).replace(/\r/g, '').replace(/\n(?!\n|\s*(?:[-*•]|\d{1,2}[.)])\s)/g, '\n\n')); }
/** "Foto 3", "Fotos 3 e 4", "Fotos 3 a 6", "Fotos 2, 5 e 9". */
function AstR_refFotos_(nums) {
  var l = nums.slice().sort(function (a, b) { return a - b; });
  if (!l.length) return '';
  if (l.length === 1) return 'Foto ' + l[0];
  var seguidos = l.every(function (n, i) { return !i || n === l[i - 1] + 1; });
  if (seguidos && l.length > 2) return 'Fotos ' + l[0] + ' a ' + l[l.length - 1];
  return 'Fotos ' + l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1];
}
/** Fotos ativas em ordem de quando foram tiradas (a mesma numeração no checklist e na seção Fotos). */
function AstR_fotosOrdenadas_(fotos) {
  return (fotos || []).slice().sort(function (a, b) { return String(Ast_iso_(a.TIRADA_EM || a.RECEBIDA_EM)).localeCompare(String(Ast_iso_(b.TIRADA_EM || b.RECEBIDA_EM))) || String(a.ID).localeCompare(String(b.ID)); });
}
/** Seção de fotos numeradas (todas até o limite), com a legenda do técnico ou a pergunta do checklist e a hora. */
function AstR_fotosHtml_(os, ord, perg) {
  var cx = ord.slice(0, AST_REL_MAX_FOTOS).map(function (f, i) {
    var b = AstR_b64Arquivo_(f.ARQUIVO_ID), pq = perg.filter(function (p) { return p.id === Ast_s_(f.PERGUNTA_ID); })[0];
    var leg = [AstR_rotulo_(Ast_s_(f.LEGENDA) || (pq ? pq.texto : '')), Ast_br_(f.TIRADA_EM || f.RECEBIDA_EM)].filter(Boolean).join(' · ');
    var mime = b && /^image\/(png|jpe?g|gif|webp)$/i.test(String(b.mime)) ? b.mime : 'image/jpeg';
    var h = '<div class="foto"><div class="q">' + (b ? '<img src="data:' + mime + ';base64,' + String(b.data).replace(/[^A-Za-z0-9+\/=]/g, '') + '" alt="Foto ' + (i + 1) + '">' : '<span class="nota">Arquivo da foto indisponível no momento da emissão.</span>') +
      '</div><div class="leg">Foto ' + (i + 1) + (leg ? ' — ' + Ast_esc_(leg) : '') + '</div></div>';
    b = null;
    return h;
  });
  var resto = ord.length - AST_REL_MAX_FOTOS;
  return '<div class="fotos">' + cx.join('') + '</div>' + (resto > 0 ? '<p class="nota">' + Ast_esc_(AstR_refFotos_(ord.slice(AST_REL_MAX_FOTOS).map(function (f, i) { return AST_REL_MAX_FOTOS + i + 1; }))) +
    (resto === 1 ? ' não coube' : ' não couberam') + ' neste documento e ' + (resto === 1 ? 'fica arquivada' : 'ficam arquivadas') + ' pela Metrolabs junto da O.S. ' + Ast_esc_(os.NUMERO) + ', à disposição do cliente quando solicitado.</p>' : '');
}
/**
 * Checklist (ou conferência): sem as perguntas de assinatura (as assinaturas estão na seção própria), pergunta de foto com a
 * referência às fotos numeradas, rótulos em caixa normal e respostas longas fora da tabela, como texto corrido.
 */
function AstR_checklistHtml_(perg, resp, ord, legenda) {
  var longos = [], linhas = [];
  perg.forEach(function (p) {
    if (p.tipo === 'ASSINATURA') return;
    var rot = AstR_rotulo_(p.texto);
    if (p.tipo === 'FOTO') {
      var nums = []; ord.forEach(function (f, i) { if (Ast_s_(f.PERGUNTA_ID) === p.id) nums.push(i + 1); });
      linhas.push([rot, nums.length ? Ast_plural_(nums.length, 'foto', 'fotos') + ' (' + AstR_refFotos_(nums) + ')' : '—']);
      return;
    }
    var r = resp[p.id], v = r ? (Array.isArray(r.v) ? r.v.join(', ') : String(r.v)) : '';
    if (p.tipo === 'SIM_NAO') v = { SIM: 'Sim', NAO: 'Não', NA: 'Não se aplica' }[v] || v;
    if (p.tipo === 'DATA' && /^\d{4}-\d{2}-\d{2}$/.test(v)) v = v.slice(8, 10) + '/' + v.slice(5, 7) + '/' + v.slice(0, 4);
    if (p.tipo === 'NUMERO' && v !== '' && p.unidade) v += ' ' + p.unidade;
    if (v.length > 160 || /\n/.test(v)) { longos.push([rot, v]); linhas.push([rot, 'Texto completo logo abaixo da tabela']); }
    else linhas.push([rot, v || '—']);
  });
  if (!linhas.length) return '';
  return RelA4_tabela_([{ t: 'Item' }, { t: 'Resposta' }], linhas, { legenda: legenda }) + longos.map(function (x) { return RelA4_subsecao_(x[0], AstR_par_(x[1])); }).join('');
}
/**
 * Resultado do atendimento (teste funcional e situação do equipamento ao final). Sem o registro estruturado (O.S. antiga), usa só o
 * que foi respondido no checklist ("Equipamento liberado para uso?"); sem nada, devolve null e o relatório não afirma nada.
 */
function AstR_resultado_(os, resp) {
  var r = AstO_resultado_(os);
  if (r.final) return { final: r.final, nome: r.finalNome, detalhe: r.detalhe, teste: r.teste, testeNome: r.testeNome, origem: 'REGISTRO' };
  var lib = resp && resp.liberado && Ast_up_(resp.liberado.v), ok = resp && resp.teste_ok && Ast_up_(resp.teste_ok.v);
  if (lib === 'SIM' || lib === 'NAO') return { final: lib === 'SIM' ? 'LIBERADO' : 'NAO_LIBERADO', nome: lib === 'SIM' ? AST_RESULTADOS_FINAIS.LIBERADO : AST_RESULTADOS_FINAIS.NAO_LIBERADO, detalhe: '',
    teste: r.teste || (ok === 'SIM' ? 'APROVADO' : ''), testeNome: r.testeNome || (ok === 'SIM' ? AST_TESTE_RESULTADOS.APROVADO : ''), origem: 'CHECKLIST' };
  return r.teste ? { final: '', nome: '', detalhe: '', teste: r.teste, testeNome: r.testeNome, origem: 'REGISTRO' } : null;
}
/** Caixa de destaque do resultado, logo no início do relatório (verde, amarela ou vermelha). */
function AstR_resultadoCaixa_(res) {
  if (!res || !res.final) return '';
  var t = 'Resultado do atendimento: equipamento ' + res.nome.toLowerCase() + (res.detalhe ? '. ' + (res.final === 'NAO_LIBERADO' ? 'Pendência para a liberação: ' : res.final === 'LIBERADO_RESTRICAO' ? 'Restrição: ' : '') + res.detalhe.replace(/[.\s]+$/, '') : '') + '.' +
    (res.testeNome ? ' Teste funcional: ' + res.testeNome.toLowerCase() + '.' : '') + (res.origem === 'CHECKLIST' ? ' (Conforme a resposta do checklist.)' : '');
  return RelA4_caixa_(t, res.final === 'LIBERADO' ? 'ok' : res.final === 'LIBERADO_RESTRICAO' ? 'aviso' : 'critico');
}
/**
 * Rastreabilidade do atendimento: um marco por fato, em ordem (abertura, agendamento, saída, chegada, início, registros, peças,
 * assinaturas, conclusão, encerramento). Horas dos campos da O.S. (as mesmas da seção Atendimento, com a hora do aparelho já
 * conferida); fotos e atualizações do relato agrupadas numa linha; sem nome de arquivo nem identificador interno; "por" só quando
 * quem registrou não é o técnico do atendimento. o: { papelCliente, papelColab, logistica }
 */
function AstR_rastreabilidade_(os, c, fotos, o) {
  o = o || {};
  var tec = Ast_semAcento_(os.TECNICO_NOME), linhas = [];
  var add = function (quando, ordem, texto, por) {
    var ms = Ast_ms_(quando); if (ms === null || !Ast_s_(texto)) return;
    var p = Ast_s_(por), outro = p && Ast_semAcento_(p) !== tec && !/^(sistema|rotina)/i.test(p);
    linhas.push({ ms: ms, ordem: ordem, texto: Ast_s_(texto) + (outro ? ' (por ' + AstR_nomeLeitura_(p) + ')' : '') });
  };
  var horaEv = function (e) { var a = Ast_ms_(e.EM_APARELHO), b = Ast_ms_(e.EM); return a !== null && b !== null && a <= b + 5 * 60000 && a >= b - 7 * 864e5 ? Ast_agora_(a) : Ast_s_(e.EM); };
  var todos = Ast_ler_(AST_ABAS.EVENTOS);
  var evs = todos.filter(function (e) { return Ast_up_(e.ENTIDADE) === 'OS' && Ast_s_(e.ENTIDADE_ID) === Ast_s_(os.ID); }).sort(function (a, b) { return String(a.EM).localeCompare(String(b.EM)); });
  var evsC = c && c.ID ? todos.filter(function (e) { return Ast_up_(e.ENTIDADE) === 'CHAMADO' && Ast_s_(e.ENTIDADE_ID) === Ast_s_(c.ID) && Ast_sim_(e.PUBLICO); }) : [];
  var doTipo = function (t) { return evs.filter(function (e) { return Ast_up_(e.TIPO) === t; }); };
  var emCampo = Ast_sim_(os.ABERTA_EM_CAMPO);
  // abertura e agendamento
  if (c && c.ID && Ast_s_(c.ABERTO_EM)) add(c.ABERTO_EM, 1, emCampo ? 'Chamado ' + Ast_s_(c.NUMERO) + ' e O.S. ' + Ast_s_(os.NUMERO) + ' abertos em campo, sem agendamento prévio' :
    'Chamado ' + Ast_s_(c.NUMERO) + ' aberto' + (AST_CANAIS[Ast_up_(c.CANAL)] ? ' (' + AST_CANAIS[Ast_up_(c.CANAL)].toLowerCase() + ')' : '') + (Ast_s_(c.SOLICITANTE) ? ', a pedido de ' + Ast_s_(c.SOLICITANTE) : ''), c.ABERTO_POR_NOME);
  if (!emCampo) { var ag = doTipo('AGENDADA')[0]; if (ag) add(ag.EM, 2, 'O.S. ' + Ast_s_(os.NUMERO) + ' agendada para ' + Ast_br_(os.AGENDADO_PARA), ag.USUARIO_NOME); }
  doTipo('REAGENDADO').forEach(function (e) { add(e.EM, 2, 'Reagendamento: ' + AstR_textoEvento_(e.TEXTO, 180), e.USUARIO_NOME); });
  doTipo('TRANSFERIDA').forEach(function (e) { add(e.EM, 2, AstR_textoEvento_(e.TEXTO, 180), e.USUARIO_NOME); });
  // deslocamento e execução (horas da O.S.)
  if (Ast_s_(os.SAIU_EM)) add(os.SAIU_EM, 3, 'Saída para o atendimento');
  var mChe = Ast_ms_(os.CHEGOU_EM), mIni = Ast_ms_(os.INICIO_EM), juntos = !o.logistica && mChe !== null && mIni !== null && Math.abs(mIni - mChe) < 60000;
  if (mChe !== null) add(os.CHEGOU_EM, 4, juntos ? 'Chegada ao local e início do serviço' : 'Chegada ao local');
  if (!o.logistica && mIni !== null && !juntos) add(os.INICIO_EM, 5, 'Início do serviço');
  if (fotos.length) {
    var ms = fotos.map(function (f) { return Ast_ms_(f.TIRADA_EM || f.RECEBIDA_EM); }).filter(function (x) { return x !== null; }).sort(function (a, b) { return a - b; });
    if (ms.length) {
      var h1 = Ast_hora_(Ast_agora_(ms[0])), h2 = Ast_hora_(Ast_agora_(ms[ms.length - 1])), d1 = Ast_brDia_(Ast_agora_(ms[0])), d2 = Ast_brDia_(Ast_agora_(ms[ms.length - 1]));
      add(Ast_agora_(ms[0]), 6, fotos.length === 1 ? '1 foto registrada' : fotos.length + ' fotos registradas ' + (h1 === h2 && d1 === d2 ? 'às ' + h1 : 'entre ' + h1 + (d1 !== d2 ? ' de ' + d1 : '') + ' e ' + h2 + (d1 !== d2 ? ' de ' + d2 : '')));
    }
  }
  var regs = evs.filter(function (e) { return ['RELATO', 'RESPOSTA'].indexOf(Ast_up_(e.TIPO)) >= 0; });
  if (regs.length) add(horaEv(regs[regs.length - 1]), 7, o.logistica ? 'Última atualização do termo e da conferência' : 'Última atualização do checklist e do relato técnico');
  // peças (as que valem), falta de peça, compras e série
  AstO_pecas_(os.ID).forEach(function (p) {
    var e = evs.filter(function (x) { return Ast_s_(x.ID_LOCAL) && Ast_s_(x.ID_LOCAL) === Ast_s_(p.ID_LOCAL); })[0];
    var q = Ast_fmtNum_(Number(p.QUANTIDADE) || 0, Math.round(Number(p.QUANTIDADE)) === Number(p.QUANTIDADE) ? 0 : 2) + ' ' + Ast_unidadePeca_(p.UNIDADE);
    add(e ? horaEv(e) : p.CRIADO_EM, 7, (Ast_up_(p.SITUACAO) === 'FALTA' ? 'Falta de peça registrada: ' : 'Peça aplicada: ') + q + ' de ' + Ast_s_(p.DESCRICAO) + (Ast_s_(p.REQUISICAO_NUMERO) ? ' (pedido de compra ' + Ast_s_(p.REQUISICAO_NUMERO) + ')' : ''));
  });
  ['PECA_DISPONIVEL', 'SAIDA_SEM_PECA', 'SERIE_DIVERGENTE', 'SERIE_TRATADA', 'DOC_TECNICO', 'CORRECAO'].forEach(function (t) {
    doTipo(t).forEach(function (e) { add(horaEv(e), t === 'CORRECAO' ? 11 : 7, t === 'SAIDA_SEM_PECA' ? 'Visita encerrada aguardando peça' : AstR_textoEvento_(e.TEXTO, 200), e.USUARIO_NOME); });
  });
  // assinaturas, conclusão e encerramento
  if (Ast_s_(os.COLAB_ASSINATURA_EM)) add(os.COLAB_ASSINATURA_EM, 8, 'Assinatura ' + (o.papelColab ? 'de ' + o.papelColab.replace(/ \(Metrolabs\)$/, '').toLowerCase() : 'do técnico responsável') + ': ' + AstR_nomeLeitura_(os.COLAB_ASSINATURA_NOME));
  if (Ast_s_(os.ASSINATURA_EM)) add(os.ASSINATURA_EM, 8, 'Assinatura ' + (o.papelCliente ? 'de ' + o.papelCliente.toLowerCase() : 'do cliente') + ': ' + AstR_nomeLeitura_(os.ASSINATURA_NOME));
  doTipo('SEM_ASSINATURA').slice(-1).forEach(function (e) { add(horaEv(e), 8, 'Sem assinatura do cliente: recebido por ' + Ast_s_(os.SEM_ASSINATURA_RECEBIDO_POR) + ' (justificativa na seção Assinaturas)'); });
  if (Ast_s_(os.COLAB_DISPENSA_EM)) add(os.COLAB_DISPENSA_EM, 9, 'Assinatura do técnico dispensada pela gestão (justificativa na seção Assinaturas)', os.COLAB_DISPENSA_POR_NOME);
  if (Ast_s_(os.CONCLUIU_EM)) add(os.CONCLUIU_EM, 9, 'Execução concluída');
  if (Ast_s_(os.ENCERRADA_EM)) { var res = AstO_resultado_(os); add(os.ENCERRADA_EM, 10, 'O.S. encerrada' + (res.final ? '; equipamento ' + res.finalNome.toLowerCase() : ''), Ast_s_(os.ENCERRADA_POR_NOME)); }
  // eventos públicos do chamado que não repetem os marcos acima (orçamento, notas ao cliente, peça disponível)
  var temReag = doTipo('REAGENDADO').length > 0;
  evsC.forEach(function (e) {
    var t = Ast_up_(e.TIPO);
    if ((Ast_s_(e.DE) && Ast_s_(e.PARA) && t !== 'REAGENDADO') || ['ENVIADO_CLIENTE', 'RELATORIO_ATENDIMENTO', 'ABERTURA'].indexOf(t) >= 0 || (t === 'REAGENDADO' && temReag)) return;
    add(e.EM, t === 'REAGENDADO' ? 2 : 7, t === 'REAGENDADO' ? 'Reagendamento: ' + AstR_textoEvento_(e.TEXTO, 180) : AstR_textoEvento_(e.TEXTO, 200), e.USUARIO_NOME);
  });
  linhas.sort(function (a, b) { return Math.floor(a.ms / 60000) - Math.floor(b.ms / 60000) || a.ordem - b.ordem || a.ms - b.ms; });
  var vistos = {};
  linhas = linhas.filter(function (l) { var k = Math.floor(l.ms / 60000) + '|' + Ast_semAcento_(l.texto).slice(0, 50); if (vistos[k]) return false; vistos[k] = true; return true; });
  if (!linhas.length) return '<p class="nota">Sem marcos registrados.</p>';
  var dias = {}; linhas.forEach(function (l) { dias[Ast_brDia_(Ast_agora_(l.ms))] = true; });
  var umDia = Object.keys(dias).length === 1, resp = Ast_esc_(AstR_nomeLeitura_(os.TECNICO_NOME) || '—');
  return '<p>' + (umDia ? 'Atendimento de ' + Ast_esc_(Object.keys(dias)[0]) + '. ' : '') + 'Responsável pelo atendimento: ' + resp + '.</p>' +
    RelA4_tabela_([{ t: umDia ? 'Hora' : 'Data e hora', nw: true, w: umDia ? '16mm' : '32mm' }, { t: 'Marco do atendimento' }], linhas.map(function (l) { var b = Ast_br_(Ast_agora_(l.ms)); return [umDia ? b.slice(11, 16) : b, l.texto]; })) +
    '<p class="nota">Resumo dos marcos do atendimento. A trilha completa (cada foto, resposta e alteração, com a hora do aparelho e a do recebimento no servidor) fica guardada no SGO+ e é apresentada quando solicitada.</p>';
}

/** HTML A4 do relatório da O.S. (sem salvar). */
function AstR_htmlOS_(os, opcoes) {
  var o = opcoes || {};
  var c = Ast_porId_(AST_ABAS.CHAMADOS, os.CHAMADO_ID) || {}, eq = Ast_mapa_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS)[Ast_s_(os.EQUIPAMENTO_ID)] || {};
  var cli = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[Ast_s_(os.CLIENTE_ID)] || {}, tipo = Ast_tipo_(os.TIPO_CODIGO) || { nome: Ast_s_(os.TIPO_NOME), exige: {} };
  var rascunho = Ast_up_(os.SITUACAO) !== 'ENCERRADA';
  if (tipo.logistica) return AstR_htmlTermo_(os, o, tipo, rascunho);
  var resp = AstO_respostas_(os), perg = AstO_perguntas_(os), fotos = AstO_fotos_(os.ID), ord = AstR_fotosOrdenadas_(fotos);
  var res = AstR_resultado_(os, resp), comRes = Ast_tipoComResultado_(tipo);
  var corpo = '';
  if (rascunho) corpo += RelA4_caixa_('RASCUNHO: a O.S. ainda não foi encerrada' + (Ast_s_(os.FALTAS) ? ' (falta: ' + Ast_s_(os.FALTAS) + ')' : '') + '. Este documento não vale como relatório final.', 'aviso');
  corpo += AstR_resultadoCaixa_(res);
  corpo += RelA4_secao_('Identificação', RelA4_identificacao_([
    ['Cliente', Ast_s_(os.CLIENTE_NOME) || Ast_clienteNome_(cli), { largo: true }], ['CNPJ', Ast_s_(cli.CNPJ)], ['Unidade', Ast_s_(os.UNIDADE_NOME)],
    ['Endereço', Ast_s_(os.ENDERECO), { largo: true }], ['Equipamento', [Ast_s_(eq.TIPO), Ast_s_(eq.MODELO)].filter(Boolean).join(' · ') || Ast_eqSemIdent_(os.EQUIPAMENTO_TEXTO)],
    ['TAG', Ast_s_(eq.TAG)], ['Nº de série (cadastro)', Ast_s_(os.SERIE_CADASTRO) || Ast_s_(eq.SERIE)], ['Nº de série (conferido no local)', Ast_s_(os.SERIE_CONFIRMADA) + (Ast_sim_(os.SERIE_DIVERGENTE) ? ' (DIVERGENTE do cadastro)' : '')],
    ['Setor', Ast_s_(eq.SETOR)], ['Patrimônio', Ast_s_(eq.PATRIMONIO)],
    // 22/10/2026: identificação completa do cadastro do equipamento (campo vazio não aparece).
    ['Fabricante (marca)', Ast_s_(eq.FABRICANTE)], ['Capacidade ou volume', Ast_s_(eq.CAPACIDADE)], ['Ano de fabricação', Ast_s_(eq.ANO_FABRICACAO)]
  ].filter(function (p) { return ['Patrimônio', 'Fabricante (marca)', 'Capacidade ou volume', 'Ano de fabricação', 'TAG', 'Setor', 'Nº de série (cadastro)', 'Nº de série (conferido no local)'].indexOf(p[0]) < 0 || !Ast_vazioCad_(p[1]); })));
  var sla = c.ID ? Ast_slaEstado_(c, Date.now()) : null;
  var chamado = [['Chamado', Ast_s_(os.CHAMADO_NUMERO)], ['Aberto em', Ast_br_(c.ABERTO_EM)], ['Solicitante', Ast_s_(c.SOLICITANTE)], ['Canal', AST_CANAIS[Ast_up_(c.CANAL)] || ''],
    ['Prioridade', AST_PRIORIDADES[Ast_up_(c.PRIORIDADE)] || ''], ['Prazo de atendimento', sla ? sla.texto : '—'], ['Problema relatado', Ast_s_(c.SINTOMA), { largo: true }]];
  // 13/11/2026: a reincidência fica no próprio chamado (antes aparecia no meio da linha do tempo)
  if (Ast_sim_(c.REINCIDENTE) || Ast_s_(c.REINCIDENCIA_DE)) chamado.push(['Reincidência', 'Equipamento com chamado anterior nos últimos 30 dias' + (Ast_s_(c.REINCIDENCIA_DE) ? ' (' + Ast_s_(c.REINCIDENCIA_DE) + ')' : ''), { largo: true }]);
  corpo += RelA4_secao_('Chamado', RelA4_identificacao_(chamado));
  var linhaHora = function (srv, ap) { var t = Ast_br_(srv); var a = Ast_ms_(ap), b = Ast_ms_(srv); if (t && a !== null && b !== null && Math.abs(a - b) > 5 * 60000) t += ' (no aparelho: ' + Ast_br_(ap) + ')'; return t; };
  var dur = Ast_ms_(os.CHEGOU_EM) !== null && Ast_ms_(os.CONCLUIU_EM) !== null ? Ast_duracaoTxt_((Ast_ms_(os.CONCLUIU_EM) - Ast_ms_(os.CHEGOU_EM)) / 60000) : '';
  // 13/11/2026: O.S. aberta em campo não tem agendamento (antes "Agendado para" repetia a hora da abertura e parecia a chegada)
  var atd = [['Tipo de serviço', tipo.nome], ['Técnico', Ast_s_(os.TECNICO_NOME)],
    Ast_sim_(os.ABERTA_EM_CAMPO) ? ['Agendamento', 'Aberta em campo pelo técnico, sem agendamento prévio'] : ['Agendado para', Ast_br_(os.AGENDADO_PARA)],
    ['Chegada', linhaHora(os.CHEGOU_EM, os.CHEGOU_EM_APARELHO)], ['Conclusão', linhaHora(os.CONCLUIU_EM, os.CONCLUIU_EM_APARELHO)], ['Tempo no local', dur]];
  var ident = { QR: 'leitura do QR', SERIE: 'número de série', TAG: 'TAG' }[Ast_up_(os.IDENTIFICADO_POR)];
  if (ident) atd.push(['Equipamento conferido por', ident]);
  if (Ast_s_(os.OBS_LOCALIZACAO)) atd.push(['Observação da localização', Ast_s_(os.OBS_LOCALIZACAO), { largo: true }]);
  corpo += RelA4_secao_('Atendimento', RelA4_identificacao_(atd));
  // Serviço: o que encontrou, por quê, o que fez, o que mediu, como testou, como o equipamento ficou e o que recomenda
  var serv = '', sub = function (t, v) { if (Ast_s_(v)) serv += RelA4_subsecao_(t, AstR_par_(v)); };
  sub('Condição encontrada', os.CONDICAO_ENCONTRADA);
  sub('Causa ou diagnóstico', os.CAUSA);
  sub('Serviço realizado', os.SERVICO_REALIZADO);
  var med = Ast_normMedicoes_(os.MEDICOES_JSON);
  if (med.length) serv += RelA4_subsecao_('Medições realizadas', RelA4_tabela_([{ t: 'Grandeza' }, { t: 'Ponto ou condição da medição' }, { t: 'Valor', num: true }, { t: 'Unidade' }],
    med.map(function (m) { return [m.grandeza, m.obs || '—', m.valor, m.unidade || '—']; })));
  var r0 = AstO_resultado_(os);
  if (r0.teste || Ast_s_(os.TESTE_FUNCIONAL)) serv += RelA4_subsecao_('Teste funcional', (r0.teste ? '<p><b>Resultado: ' + Ast_esc_(r0.testeNome.toLowerCase()) + '.</b></p>' : '') + (Ast_s_(os.TESTE_FUNCIONAL) ? AstR_par_(os.TESTE_FUNCIONAL) : ''));
  if (res && res.final) serv += RelA4_subsecao_('Situação do equipamento ao final', '<p><b>' + Ast_esc_(res.nome) + '.</b>' + (res.origem === 'CHECKLIST' ? ' Conforme a resposta do checklist.' : '') + '</p>' + (res.detalhe ? AstR_par_(res.detalhe) : ''));
  else if (comRes && !rascunho) serv += RelA4_subsecao_('Situação do equipamento ao final', '<p class="nota">Não registrada de forma estruturada nesta O.S. (atendimento anterior ao registro obrigatório do resultado). Consulte o teste funcional e as recomendações.</p>');
  sub('Recomendações', os.RECOMENDACOES);
  sub('Observações do técnico', os.RELATO);
  corpo += RelA4_secao_('Serviço', serv || '<p class="nota">Sem relato registrado.</p>');
  if (perg.length) {
    var ck = AstR_checklistHtml_(perg, resp, ord, 'Checklist ' + ((Ast_modelo_(os.MODELO_CODIGO) || {}).nome || ''));
    if (ck) corpo += RelA4_secao_('Checklist', ck);
  }
  var pecas = AstO_pecas_(os.ID);
  corpo += RelA4_secao_('Peças', RelA4_tabela_([{ t: 'Peça' }, { t: 'Código' }, { t: 'Qtd.', num: true }, { t: 'Situação' }], pecas.map(function (p) {
    return [Ast_s_(p.DESCRICAO), Ast_s_(p.CODIGO), Ast_fmtNum_(Number(p.QUANTIDADE) || 0, Math.round(Number(p.QUANTIDADE)) === Number(p.QUANTIDADE) ? 0 : 2) + ' ' + Ast_unidadePeca_(p.UNIDADE), Ast_up_(p.SITUACAO) === 'FALTA' ? 'Em falta' + (Ast_s_(p.REQUISICAO_NUMERO) ? ' (pedido ' + Ast_s_(p.REQUISICAO_NUMERO) + ')' : '') : 'Aplicada'];
  }), { vazio: 'Nenhuma peça aplicada.' }));
  if (ord.length) corpo += RelA4_secao_('Fotos', AstR_fotosHtml_(os, ord, perg));
  var ass = [];
  var img = Ast_s_(os.ASSINATURA_ARQUIVO_ID) ? AstR_b64Arquivo_(os.ASSINATURA_ARQUIVO_ID) : null;
  ass.push({ papel: 'Recebido por (cliente)', nome: Ast_s_(os.ASSINATURA_NOME) || Ast_s_(os.SEM_ASSINATURA_RECEBIDO_POR) || ' ', cargo: Ast_s_(os.ASSINATURA_DOCUMENTO) || (Ast_s_(os.SEM_ASSINATURA_MOTIVO) ? 'Sem assinatura: ' + (AST_MOTIVOS_SEM_ASSINATURA[Ast_up_(os.SEM_ASSINATURA_MOTIVO)] || '') : ''),
    imagemBase64: img ? { mimeType: 'image/png', data: img.data } : null });
  var assTec = AstR_assinaturaColab_(os, 'Técnico responsável');
  if (assTec) ass.push(assTec);
  corpo += RelA4_secao_('Assinaturas', (typeof SGO_DocA4_assinaturas_ === 'function' ? SGO_DocA4_assinaturas_(ass) : '') +
    (Ast_s_(os.SEM_ASSINATURA_JUSTIFICATIVA) ? '<p class="nota">Justificativa da falta de assinatura: ' + Ast_esc_(os.SEM_ASSINATURA_JUSTIFICATIVA) + '</p>' : '') +
    AstR_notaAssinaturas_(os));
  if (Ast_s_(os.DOC_TECNICO_REF)) corpo += RelA4_secao_('Documento técnico', '<p>Documento emitido para este atendimento: ' + Ast_esc_(os.DOC_TECNICO_REF) + (Ast_s_(os.DOC_TECNICO_URL) ? ' (' + Ast_esc_(os.DOC_TECNICO_URL) + ')' : '') + '.</p>');
  corpo += RelA4_secao_('Rastreabilidade do atendimento', AstR_rastreabilidade_(os, c, fotos, {}));
  corpo += '<p class="nota" style="margin-top:4mm">Marca de conferência do conteúdo: ' + Ast_esc_(o.marca || '') + '. Qualquer alteração no conteúdo deste relatório muda esta marca.</p>';
  var ficha = [['Tipo de serviço', tipo.nome], ['Técnico', Ast_s_(os.TECNICO_NOME)], ['Situação', rascunho ? 'Rascunho' : 'Encerrada em ' + Ast_br_(os.ENCERRADA_EM)]];
  if (res && res.final) ficha.push(['Equipamento ao final', res.nome]);
  return RelA4_documento_({ titulo: 'Relatório de atendimento técnico' + (rascunho ? ' (rascunho)' : ''), subtitulo: Ast_s_(os.CLIENTE_NOME), tituloCurto: 'Relatório da O.S.', tituloArquivo: 'Relatorio da OS',
    // 22/10/2026: a revisão do cabeçalho é a revisão de verdade (0 na emissão; 1, 2... só com "Abrir para corrigir" e motivo), não a contagem de versões
    numero: Ast_s_(os.NUMERO), revisao: Number(o.revisao) || 0, identificacao: Ast_eqSemIdent_(os.EQUIPAMENTO_TEXTO) || Ast_s_(os.CLIENTE_NOME), rotuloIdentificacao: 'Equipamento',
    ficha: ficha, corpo: corpo, capa: false, sumario: false });
}

/**
 * Registro do relatório encerrado no Arquivo de documentos (tipo "ORDEM DE SERVIÇO"). Com sessão de usuário, pelo
 * módulo Documentos; sem sessão (rotina, gancho de outro módulo), pela identidade do sistema, direto na tabela, com os
 * mesmos campos. 22/10/2026 (etapa 2): antes, o relatório fechado pela rotina não entrava no Arquivo. Nunca lança.
 */
function AstR_registrarNoArquivo_(eu, os, nomeArquivo, url, tipoDocumento) {
  var tipoDoc = Ast_s_(tipoDocumento) || 'ORDEM DE SERVIÇO'; // 29/10/2026: o relatório do atendimento (versão do cliente) usa o mesmo registro
  if (!Ast_s_(os.UNIDADE_ID) || !Ast_s_(url)) return false;
  if (eu && eu.sessionId && typeof SGO_DOCUMENTOS !== 'undefined' && SGO_DOCUMENTOS.registrarDocumentoExistente) {
    try { var rr = SGO_DOCUMENTOS.registrarDocumentoExistente(eu.sessionId, { CLIENTE_ID: os.CLIENTE_ID, UNIDADE_ID: os.UNIDADE_ID, EQUIPAMENTO_ID: os.EQUIPAMENTO_ID, TIPO_DOCUMENTO: tipoDoc, NOME_ARQUIVO: nomeArquivo, LINK_ARQUIVO: url, DATA_VENCIMENTO: '' }); if (rr && rr.success) return true; } catch (eR) { /* tenta pela identidade do sistema */ }
  }
  try {
    var aba = (SGO_CFG.SHEETS && SGO_CFG.SHEETS.DOC_DOCUMENTOS) || 'DOC_DOCUMENTOS';
    var reg = { CLIENTE_ID: Ast_s_(os.CLIENTE_ID), UNIDADE_ID: Ast_s_(os.UNIDADE_ID), EQUIPAMENTO_ID: Ast_s_(os.EQUIPAMENTO_ID), TIPO_DOCUMENTO: tipoDoc, NOME_ARQUIVO: Ast_up_(nomeArquivo),
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
    // 03/11/2026: a ronda de engenharia clínica tem o relatório próprio, em duas versões (cliente e interna)
    if (typeof AstRd_ehRonda_ === 'function' && AstRd_ehRonda_(os)) return AstRd_emitirRelatorio_(eu, osId, o);
    var rascunho = Ast_up_(os.SITUACAO) !== 'ENCERRADA';
    if (!rascunho && Ast_s_(os.RELATORIO_PDF_ID) && !o.revisao) {
      // relatório vigente da O.S. encerrada: reabre o mesmo (nenhuma versão nova sem motivo)
      return { salvo: true, reaproveitado: true, pdfUrl: Ast_s_(os.RELATORIO_PDF_URL), pdfId: Ast_s_(os.RELATORIO_PDF_ID), htmlId: Ast_s_(os.RELATORIO_HTML_ID), versao: Number(os.RELATORIO_VERSAO) || 1,
        revisao: Number(os.RELATORIO_REVISAO) || 0, rascunho: false, registrado: true, emitidoEm: Ast_br_(os.RELATORIO_EM) };
    }
    var versao = (Number(os.RELATORIO_VERSAO) || 0) + 1;
    var revisao = rascunho ? 0 : (o.revisao ? Math.max(1, (Number(os.RELATORIO_REVISAO) || 0) + 1) : 0);
    var marca = Ast_marca_(JSON.stringify([os.NUMERO, versao, os.RESPOSTAS_JSON, os.RELATO, os.SERVICO_REALIZADO, os.ASSINATURA_ARQUIVO_ID, os.QTD_FOTOS, os.QTD_PECAS, os.ENCERRADA_EM]
      .concat(Ast_s_(os.LOGISTICA_JSON) || Ast_s_(os.COLAB_ASSINATURA_ARQUIVO_ID) || Ast_s_(os.COLAB_DISPENSA_JUSTIFICATIVA) ? [os.LOGISTICA_JSON, os.COLAB_ASSINATURA_ARQUIVO_ID, os.COLAB_DISPENSA_JUSTIFICATIVA] : [])
      // 13/11/2026: resultado, medições e os demais textos do serviço (só quando a O.S. tem o resultado; a conta das antigas não muda)
      .concat(Ast_s_(os.RESULTADO_FINAL) || Ast_s_(os.TESTE_RESULTADO) || Ast_s_(os.MEDICOES_JSON) ? [os.TESTE_RESULTADO, os.RESULTADO_FINAL, os.RESULTADO_DETALHE, os.MEDICOES_JSON, os.CONDICAO_ENCONTRADA, os.CAUSA, os.TESTE_FUNCIONAL, os.RECOMENDACOES] : [])));
    var tipoDoc = Ast_tipo_(os.TIPO_CODIGO), tituloDoc = AstR_tituloDocOS_(os);
    var rev = null;
    if (revisao > 0 && typeof SGO_DocRev_historico_ === 'function') {
      var hist = SGO_DocRev_historico_('ORDEM_SERVICO', Ast_s_(os.NUMERO)).filter(function (h) { return h.revisao < revisao; });
      if (!hist.length) hist.push({ revisao: 0, rotulo: typeof SGO_DocRev_rotulo_ === 'function' ? SGO_DocRev_rotulo_(0) : 'Rev. 00', em: Ast_dia_(os.RELATORIO_EM) || Ast_dia_(os.ENCERRADA_EM), por: Ast_s_(os.ENCERRADA_POR_NOME) || 'Assistência técnica', motivo: 'Emissão inicial' });
      hist.push({ revisao: revisao, rotulo: typeof SGO_DocRev_rotulo_ === 'function' ? SGO_DocRev_rotulo_(revisao) : 'Rev. ' + revisao, em: Ast_hoje_(), por: Ast_s_(eu && eu.nome), motivo: Ast_texto_(o.motivo, 500) });
      rev = { modo: 'CORRIGIR', numero: Ast_s_(os.NUMERO), revisao: revisao, rotulo: typeof SGO_DocRev_rotulo_ === 'function' ? SGO_DocRev_rotulo_(revisao) : 'Rev. ' + revisao, motivo: Ast_texto_(o.motivo, 500), origemId: '', historico: hist, ehRevisao: true };
    }
    var html = AstR_htmlOS_(os, { marca: marca, versao: versao, revisao: revisao });
    if (rev && typeof SGO_DocRev_injetarHtml_ === 'function') html = SGO_DocRev_injetarHtml_(html, rev);
    var nome = (tipoDoc && tipoDoc.logistica ? AstR_nomeTermo_(tipoDoc.logistica.sentido) : 'Relatorio da OS') + ' - ' + Ast_s_(os.NUMERO) + (revisao > 0 ? ' Rev ' + (revisao < 10 ? '0' : '') + revisao : '') + ' v' + versao + (rascunho ? ' RASCUNHO' : '') + ' - ' + Ast_s_(os.CLIENTE_NOME).slice(0, 60) + ' - ' + Utilities.formatDate(new Date(), AST_FUSO, 'yyyy-MM-dd HHmm');
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
          { numero: Ast_s_(os.NUMERO), revisao: revisao, payload: { osId: Ast_s_(os.ID), relato: Ast_s_(os.RELATO), condicaoEncontrada: Ast_s_(os.CONDICAO_ENCONTRADA), causa: Ast_s_(os.CAUSA), servicoRealizado: Ast_s_(os.SERVICO_REALIZADO), testeFuncional: Ast_s_(os.TESTE_FUNCIONAL), recomendacoes: Ast_s_(os.RECOMENDACOES),
              testeResultado: Ast_s_(os.TESTE_RESULTADO), resultadoFinal: Ast_s_(os.RESULTADO_FINAL), resultadoDetalhe: Ast_s_(os.RESULTADO_DETALHE), medicoes: Ast_s_(os.MEDICOES_JSON) },
            titulo: tituloDoc, cliente: Ast_s_(os.CLIENTE_NOME), cnpj: Ast_s_(cli.CNPJ), tag: Ast_s_(eq.TAG), equipamentoId: Ast_s_(os.EQUIPAMENTO_ID), pdfId: g.pdfId, htmlId: g.htmlId, pdfUrl: g.pdfUrl, htmlUrl: g.htmlUrl, aprovacao: '' },
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
        if (tipoDoc && tipoDoc.logistica) Ast_avisarCliente_(c, tituloDoc + ': O.S. ' + os.NUMERO, 'Prezados,\n\nA O.S. ' + os.NUMERO + ' (' + (tipoDoc.nome || 'logística') + (Ast_s_(os.EQUIPAMENTO_TEXTO) ? ', ' + Ast_s_(os.EQUIPAMENTO_TEXTO) : '') + ') foi concluída em ' + Ast_br_(os.ENCERRADA_EM) +
          '.\nO ' + tituloDoc.charAt(0).toLowerCase() + tituloDoc.slice(1) + ', com os itens e as assinaturas, segue por e-mail em seguida e fica disponível no portal do cliente do SGO+.\n\nMetrolabs — Assistência técnica', 'AT08',
          { cod: 'PC05', tipo: 'LOGISTICA', osId: os.ID, osNumero: os.NUMERO, encerradaEm: os.ENCERRADA_EM, docNome: tipoDoc.nome || '' }); // 18/11/2026: cliente com portal recebe pelo portal (PC05)
        // 16/11/2026 (fluxo da representada, furo F8): no chamado de representada a visita não encerra o caso; o texto diz que o caso segue
        else if (Ast_s_(c.REPRESENTADA_ID)) Ast_avisarCliente_(c, 'Visita técnica concluída: O.S. ' + os.NUMERO, 'Prezados,\n\nVisita técnica concluída (' + os.NUMERO + ', ' + Ast_s_(os.EQUIPAMENTO_TEXTO) + ') em ' + Ast_br_(os.ENCERRADA_EM) +
          '. O caso segue em análise; avisaremos o próximo passo.\nO relatório da visita fica disponível no portal do cliente do SGO+ e no prontuário do equipamento.\n\nMetrolabs — Assistência técnica', 'AT08');
        else {
          // 13/11/2026: equipamento não liberado (ou com restrição) é dito no próprio aviso, não só no PDF
          var rsC = AstO_resultado_(os);
          var txtRes = rsC.final && rsC.final !== 'LIBERADO' ? '\n\nAtenção: ao final do atendimento o equipamento ficou ' + rsC.finalNome.toLowerCase() + (rsC.detalhe ? ' (' + rsC.detalhe.replace(/[.\s]+$/, '') + ')' : '') + '. Os detalhes estão no relatório.' : '';
          Ast_avisarCliente_(c, 'Atendimento concluído: O.S. ' + os.NUMERO, 'Prezados,\n\nO atendimento técnico ' + os.NUMERO + ' (' + Ast_s_(os.EQUIPAMENTO_TEXTO) + ') foi concluído em ' + Ast_br_(os.ENCERRADA_EM) +
            '.' + txtRes + '\nO relatório do atendimento segue por e-mail em seguida e fica disponível no portal do cliente do SGO+ e no prontuário do equipamento.\n\nMetrolabs — Assistência técnica', 'AT08',
            { cod: 'PC05', tipo: 'CONCLUIDO', osId: os.ID, osNumero: os.NUMERO, encerradaEm: os.ENCERRADA_EM, alerta: txtRes }); // 18/11/2026: cliente com portal recebe pelo portal (PC05)
        }
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
  if (typeof AstRd_ehRonda_ === 'function' && AstRd_ehRonda_(os)) return AstRd_corrigir_(eu, os, d);
  if (!Ast_s_(os.RELATORIO_PDF_ID)) throw new Error('Não foi possível corrigir: a O.S. ' + os.NUMERO + ' ainda não tem o relatório emitido. Toque em "Relatório A4" primeiro');
  var motivo = Ast_texto_(d.motivo, 500);
  if (motivo.length < 10) throw new Error('Não foi possível corrigir: escreva o motivo da revisão (pelo menos 10 letras). Ele aparece no histórico de revisões do documento');
  var cr = {}, mapa = { relato: 'RELATO', condicaoEncontrada: 'CONDICAO_ENCONTRADA', causa: 'CAUSA', servicoRealizado: 'SERVICO_REALIZADO', testeFuncional: 'TESTE_FUNCIONAL', recomendacoes: 'RECOMENDACOES', resultadoDetalhe: 'RESULTADO_DETALHE' }, rel = d.relato || {};
  Object.keys(mapa).forEach(function (k) { if (rel[k] !== undefined && rel[k] !== null && Ast_texto_(rel[k], 4000) !== Ast_s_(os[mapa[k]])) cr[mapa[k]] = Ast_texto_(rel[k], 4000); });
  // 13/11/2026: o resultado do teste e a situação do equipamento também podem ser corrigidos (só os códigos aceitos)
  [['testeResultado', 'TESTE_RESULTADO', AST_TESTE_RESULTADOS], ['resultadoFinal', 'RESULTADO_FINAL', AST_RESULTADOS_FINAIS]].forEach(function (x) {
    if (rel[x[0]] === undefined || rel[x[0]] === null) return;
    var v = Ast_up_(rel[x[0]]);
    if (v && !x[2][v]) throw new Error('Não foi possível corrigir: valor não aceito para ' + (x[0] === 'testeResultado' ? 'o resultado do teste funcional' : 'a situação do equipamento ao final') + ' (' + v + ')');
    if (v !== Ast_up_(os[x[1]])) cr[x[1]] = v;
  });
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
  var tipoT = Ast_tipo_(os.TIPO_CODIGO);
  if (tipoT && tipoT.ronda) {
    // 03/11/2026: ronda de engenharia clínica (o anexo é a versão do cliente do relatório)
    var resR = typeof AstRd_resumo_ === 'function' ? AstRd_resumo_(os) : { equipamentos: 0, problemas: 0 };
    return { assunto: ('Relatório de ronda de engenharia clínica ' + Ast_s_(os.NUMERO) + (rev > 0 ? ' (Rev. ' + (rev < 10 ? '0' : '') + rev + ')' : '') + ' | ' + Ast_s_(os.UNIDADE_NOME) + ' | ' + Ast_s_(os.CLIENTE_NOME)).slice(0, 180),
      texto: 'Prezados(as),\n\nEncaminhamos em anexo o relatório da ronda de engenharia clínica ' + Ast_s_(os.NUMERO) + (rev > 0 ? ' (revisão ' + (rev < 10 ? '0' : '') + rev + ', que substitui a anterior)' : '') + ', realizada na unidade ' + Ast_s_(os.UNIDADE_NOME) +
        (Ast_s_(os.CHEGOU_EM) ? ' em ' + Ast_brDia_(os.CHEGOU_EM) : '') + ' por ' + Ast_s_(os.TECNICO_NOME) + '.\n\n' + 'Foram verificados ' + resR.equipamentos + ' equipamento(s), setor a setor; ' + resR.problemas + ' com observação ou fora de uso. ' +
        'O relatório traz a situação de cada equipamento, os achados com as recomendações e a prioridade, os chamados abertos a partir da ronda, a comparação com a ronda anterior e as assinaturas.\n\n' +
        'Ele também fica disponível no portal do cliente do SGO+.\n\nEm caso de dúvida, estamos à disposição.\n\nAtenciosamente,\n' + (Ast_s_(eu && eu.nome) || 'Equipe Metrolabs') + '\nMetrolabs' };
  }
  if (tipoT && tipoT.logistica) {
    // 03/11/2026 (logística): o anexo é o termo de entrega, retirada ou envio, não um relatório técnico
    var tt = AstR_tituloDocOS_(os), lgT = AstO_logistica_(os) || { itens: [] };
    return { assunto: (tt + ' ' + Ast_s_(os.NUMERO) + (rev > 0 ? ' (Rev. ' + (rev < 10 ? '0' : '') + rev + ')' : '') + (Ast_s_(os.CHAMADO_NUMERO) ? ' | Chamado ' + Ast_s_(os.CHAMADO_NUMERO) : '') + ' | ' + Ast_s_(os.CLIENTE_NOME)).slice(0, 180),
      texto: 'Prezados(as),\n\n' + 'Encaminhamos em anexo o ' + tt.charAt(0).toLowerCase() + tt.slice(1) + ' ' + Ast_s_(os.NUMERO) + (rev > 0 ? ' (revisão ' + (rev < 10 ? '0' : '') + rev + ', que substitui a anterior)' : '') +
        (Ast_s_(os.CHAMADO_NUMERO) ? ', referente ao chamado ' + Ast_s_(os.CHAMADO_NUMERO) : '') + (Ast_s_(un.NOME_UNIDADE) ? ' (' + Ast_s_(un.NOME_UNIDADE) + ')' : '') + '.\n\n' +
        'A movimentação foi feita por ' + Ast_s_(os.TECNICO_NOME) + (Ast_s_(os.CHEGOU_EM) ? ' em ' + Ast_brDia_(os.CHEGOU_EM) : '') + (lgT.itens.length ? ' e abrange ' + Ast_plural_(lgT.itens.length, 'item', 'itens') : '') +
        '. O termo traz os itens com a quantidade, a identificação e o estado aparente, as fotos e as assinaturas de quem entregou e de quem recebeu.\n\n' +
        'Recomendamos arquivar o documento. Ele também fica disponível no portal do cliente do SGO+.\n\n' + 'Em caso de dúvida, estamos à disposição.\n\n' +
        'Atenciosamente,\n' + (Ast_s_(eu && eu.nome) || 'Equipe Metrolabs') + '\nMetrolabs' };
  }
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
    dica: { clienteId: Ast_s_(os.CLIENTE_ID), numero: Ast_s_(os.NUMERO), equipamento: Ast_s_(os.EQUIPAMENTO_TEXTO), titulo: AstR_tituloDocOS_(os) + ' ' + Ast_s_(os.NUMERO) },
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
  var ja = Ast_ler_(AST_ABAS.ORCAMENTOS).filter(function (o) { return Ast_s_(o.CHAMADO_ID) === Ast_s_(c.ID) && ['RASCUNHO', 'EMITIDO', 'AJUSTE'].indexOf(Ast_up_(o.SITUACAO)) >= 0; })[0];
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
    decisaoTexto: Ast_s_(o.DECISAO_TEXTO), requisicao: Ast_s_(o.REQUISICAO_ID), veValores: ver, aceiteCanal: Ast_s_(o.ACEITE_CANAL) };
  // 12/11/2026: "Faturar para" (pagador diferente do dono do equipamento)
  var pg = Ast_orcPagador_(o);
  r.clienteId = Ast_s_(o.CLIENTE_ID); r.pagadorOutro = pg.outro; r.pagadorId = pg.outro ? pg.id : ''; r.pagadorNome = pg.nome; r.pagadorCnpj = pg.cnpj;
  if (ver) { r.valorTotal = Number(o.VALOR_TOTAL) || 0; r.valorTotalTxt = Ast_moeda_(o.VALOR_TOTAL); }
  // 22/10/2026 (etapa 4): situação do link de aceite e a resposta registrada (só para quem vê valores)
  if (ver && typeof AstL_aceiteTela_ === 'function') { try { r.aceite = AstL_aceiteTela_(o); } catch (e) { r.aceite = null; } }
  return r;
}
function AstR_orcamentosDoChamado_(eu, c) {
  return Ast_ler_(AST_ABAS.ORCAMENTOS).filter(function (o) { return Ast_s_(o.CHAMADO_ID) === Ast_s_(c.ID); }).sort(function (a, b) { return String(a.CRIADO_EM).localeCompare(String(b.CRIADO_EM)); }).map(function (o) { return AstR_orcPublico_(o, eu); });
}
/** Salva itens e condições do rascunho. d: { id, itens:[{tipo, descricao, codigo, quantidade, unidade, valorUnitario}], validade, condicoes, pagadorId } */
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
  // 12/11/2026: "Faturar para". Só muda quando a tela manda o campo; vazio ou o próprio dono = sem pagador diferente.
  if (Object.prototype.hasOwnProperty.call(d, 'pagadorId')) {
    var pid = Ast_s_(d.pagadorId);
    if (!pid || pid === Ast_s_(o.CLIENTE_ID)) { campos.PAGADOR_ID = ''; campos.PAGADOR_NOME = ''; }
    else {
      var pc = Ast_mapa_(SGO_CFG.SHEETS.CAD_CLIENTES)[pid];
      if (!pc) throw new Error('Não foi possível salvar: o cliente escolhido em "Faturar para" não foi encontrado no cadastro. Busque de novo e escolha na lista');
      if (Ast_up_(pc.STATUS || 'ATIVO') !== 'ATIVO') throw new Error('Não foi possível salvar: o cliente escolhido em "Faturar para" (' + Ast_clienteNome_(pc) + ') está inativo. Reative em Cadastros > Clientes ou escolha outro');
      campos.PAGADOR_ID = pid; campos.PAGADOR_NOME = Ast_clienteNome_(pc);
    }
  }
  Ast_atualizar_(AST_ABAS.ORCAMENTOS, o.ID, campos);
  var pgS = Ast_orcPagador_(Object.assign({}, o, campos));
  return { orcamento: AstR_orcPublico_(Object.assign({}, o, campos), eu), message: 'Orçamento ' + o.NUMERO + ' salvo (' + Ast_moeda_(total) + ')' + (pgS.outro ? ', faturado para ' + pgS.nome + (pgS.cnpj ? ' (CNPJ ' + pgS.cnpj + ')' : '') : '') + '.' };
}
/**
 * 13/11/2026 (dono: "o orçamento ficou bem menor, sem os termos jurídicos"): o orçamento da Assistência usa os mesmos textos
 * validados da Proposta comercial (Comercial > Metodologia > Modelo da proposta): condições comerciais, condições gerais,
 * responsabilidades, texto de aceite e os Termos e condições da contratação, na versão em vigor. O modelo segue os itens:
 * só peças = Produto; peças e serviço = Misto; senão Serviço. Os textos são congelados na emissão (CONGELADO_JSON) e não
 * mudam depois, mesmo que a metodologia mude. Sem o módulo Comercial carregado devolve null (o A4 sai como antes).
 */
function AstR_orcTextos_(o) {
  if (typeof Com_modeloProposta_ !== 'function' || typeof Com_termosVigentes_ !== 'function') return null;
  try {
    var itens = Ast_json_(o.ITENS_JSON, []) || [], temPeca = false, temServ = false;
    itens.forEach(function (i) { if (Ast_up_(i.tipo) === 'PECA') temPeca = true; else temServ = true; });
    var tipo = temPeca && temServ ? 'MISTO' : (temPeca ? 'PRODUTOS' : 'SERVICOS');
    var m = Com_modeloProposta_(tipo), tm = Com_termosVigentes_() || {};
    // 13/11/2026 (dono: "Certo"): nas condições, responsabilidades e aceite, "proposta" vira "orçamento". As cláusulas dos Termos e
    // condições da contratação e a frase de concordância delas NÃO mudam (texto jurídico validado).
    var orc = function (t) { return Ast_s_(t).replace(/\b([DdNn])esta proposta\b/g, function (x, l) { return l + 'este orçamento'; }).replace(/\b([Dd])a proposta\b/g, function (x, l) { return l + 'o orçamento'; }); };
    var cond = {};
    ['pagamento', 'prazoExecucao', 'garantia', 'frete', 'impostos', 'local', 'gerais'].forEach(function (k) { if (Ast_s_(m.condicoes && m.condicoes[k])) cond[k] = orc(m.condicoes[k]); });
    return { tipo: tipo, condicoes: cond, responsabilidades: orc(m.responsabilidades), textoAceite: orc(m.textoAceite),
      termos: Ast_s_(tm.texto) ? { versao: Number(tm.versao) || 1, texto: Ast_s_(tm.texto), concordancia: Ast_s_(tm.concordancia) } : null };
  } catch (e) { return null; }
}
function AstR_htmlOrcamento_(o, c, marca) {
  var pg = Ast_orcPagador_(o), itens = Ast_json_(o.ITENS_JSON, []), cong = Ast_json_(o.CONGELADO_JSON, null);
  // 12/11/2026: com pagador diferente, o orçamento é endereçado a ele e mostra também o proprietário do equipamento.
  var quem = pg.outro ? [['Faturar para', pg.nome, { largo: true }], ['CNPJ', pg.cnpj], ['Proprietário do equipamento', pg.donoNome, { largo: true }], ['CNPJ do proprietário', pg.donoCnpj]]
    : [['Cliente', pg.nome, { largo: true }], ['CNPJ', pg.cnpj]];
  var corpo = RelA4_secao_('Cliente e equipamento', RelA4_identificacao_(quem.concat([['Chamado', Ast_s_(o.CHAMADO_NUMERO)],
    ['Equipamento', Ast_s_(c.EQUIPAMENTO_TEXTO), { largo: true }], ['Problema relatado', Ast_s_(c.SINTOMA), { largo: true }], ['Diagnóstico', Ast_s_((Ast_json_(c.TRIAGEM_JSON, {}) || {}).diagnostico_preliminar), { largo: true }]])));
  var linhas = itens.map(function (i, k) { return [String(k + 1), { html: '<b>' + Ast_esc_(i.descricao) + '</b>' + (i.codigo ? '<span class="sub">Código ' + Ast_esc_(i.codigo) + '</span>' : '') }, Ast_up_(i.tipo) === 'PECA' ? 'Peça' : 'Serviço', Ast_fmtNum_(i.quantidade, Math.round(i.quantidade) === Number(i.quantidade) ? 0 : 2) + ' ' + Ast_s_(i.unidade), Ast_moeda_(i.valorUnitario), Ast_moeda_(i.quantidade * i.valorUnitario)]; });
  corpo += RelA4_secao_('Itens', RelA4_tabela_([{ t: 'Nº', cen: true, w: '7mm' }, { t: 'Descrição' }, { t: 'Tipo' }, { t: 'Qtd.', num: true }, { t: 'Unitário', num: true }, { t: 'Total', num: true }], linhas, { total: ['', 'Total do orçamento', '', '', '', Ast_moeda_(o.VALOR_TOTAL)] }));
  var execucao = '<p>A execução começa depois da aprovação deste orçamento pelo cliente (assinatura abaixo ou aceite por escrito citando o número ' + Ast_esc_(o.NUMERO) + ').</p>';
  var fecho = RelA4_assinaturas_(['Aprovação do cliente', 'Metrolabs']) + '<p class="nota" style="margin-top:4mm">Marca de conferência do conteúdo: ' + Ast_esc_(marca) + '.</p>';
  if (cong && typeof cong === 'object') {
    // 13/11/2026: textos validados da Proposta comercial, congelados na emissão (AstR_orcTextos_)
    var cd = cong.condicoes || {}, tp = Ast_s_(cong.tipo);
    var lc = [['Forma de pagamento', cd.pagamento], [tp === 'PRODUTOS' ? 'Prazo de entrega' : tp === 'MISTO' ? 'Prazo de execução e de entrega' : 'Prazo de execução', cd.prazoExecucao], ['Garantia', cd.garantia],
      ['Frete', cd.frete], ['Impostos', cd.impostos], [tp === 'PRODUTOS' ? 'Local de entrega' : tp === 'MISTO' ? 'Local de execução e de entrega' : 'Local de execução', cd.local]].filter(function (x) { return Ast_s_(x[1]); });
    var condHtml = lc.length ? RelA4_identificacao_(lc.map(function (x) { return [x[0], Ast_s_(x[1]), { largo: true }]; })) : '';
    if (Ast_s_(cd.gerais)) condHtml += RelA4_subsecao_('Condições gerais', RelA4_paragrafos_(Ast_s_(cd.gerais).split('\n').map(function (l) { return l.trim() ? '- ' + l.replace(/^[-•]\s*/, '') : ''; }).join('\n')));
    if (Ast_s_(o.CONDICOES)) condHtml += RelA4_subsecao_('Observações', RelA4_paragrafos_(o.CONDICOES));
    corpo += RelA4_secao_('Condições comerciais', condHtml || '<p>A combinar.</p>');
    if (Ast_s_(cong.responsabilidades)) corpo += RelA4_secao_('Responsabilidades', RelA4_paragrafos_(cong.responsabilidades));
    if (cong.termos && Ast_s_(cong.termos.texto) && typeof ComDoc_termosHtml_ === 'function') corpo += RelA4_secao_('Termos e condições da contratação', ComDoc_termosHtml_(cong.termos));
    corpo += RelA4_secao_('Validade e aceite', RelA4_identificacao_([['Validade', Ast_brDia_(o.VALIDADE)], ['Revisão', String(Number(o.REVISAO) || 0)]]) +
      '<p style="text-align:justify">Este orçamento é válido até ' + Ast_esc_(Ast_brDia_(o.VALIDADE)) + '. ' + Ast_esc_(Ast_s_(cong.textoAceite)) + '</p>' + execucao + fecho);
  } else {
    corpo += RelA4_secao_('Condições', RelA4_identificacao_([['Validade', Ast_brDia_(o.VALIDADE)], ['Revisão', String(Number(o.REVISAO) || 0)]]) + (Ast_s_(o.CONDICOES) ? RelA4_paragrafos_(o.CONDICOES) : '') + execucao + fecho);
  }
  return RelA4_documento_({ titulo: 'Orçamento de assistência técnica', subtitulo: pg.nome, tituloCurto: 'Orçamento', tituloArquivo: 'Orcamento de assistencia', numero: Ast_s_(o.NUMERO),
    revisao: Number(o.REVISAO) || 0, identificacao: pg.nome, rotuloIdentificacao: pg.outro ? 'Faturar para' : 'Cliente', ficha: [['Total', Ast_moeda_(o.VALOR_TOTAL)], ['Validade', Ast_brDia_(o.VALIDADE)]], corpo: corpo, capa: false, sumario: false });
}
/** Emite o A4 do orçamento (rascunho -> emitido). d: { id } */
function AstR_emitirOrcamento_(eu, d) {
  Ast_exigir_(eu, 'VALORES', 'emitir o orçamento');
  var o = Ast_porId_(AST_ABAS.ORCAMENTOS, d && d.id);
  if (!o) throw new Error('Não foi possível emitir: o orçamento não foi encontrado');
  if (Ast_up_(o.SITUACAO) !== 'RASCUNHO') throw new Error('Não foi possível emitir: o orçamento ' + o.NUMERO + ' não está em rascunho');
  if (!(Number(o.VALOR_TOTAL) >= 0) || !Ast_json_(o.ITENS_JSON, []).some(function (i) { return Number(i.valorUnitario) > 0; })) throw new Error('Não foi possível emitir: preencha os valores dos itens e salve antes de emitir');
  var c = Ast_porId_(AST_ABAS.CHAMADOS, o.CHAMADO_ID) || {};
  var pg = Ast_orcPagador_(o);
  // 13/11/2026: congela os textos validados da Proposta comercial (condições, responsabilidades e termos) neste orçamento
  var tx = AstR_orcTextos_(o), congTxt = tx ? JSON.stringify(tx) : '';
  if (congTxt) o = Object.assign({}, o, { CONGELADO_JSON: congTxt });
  // 12/11/2026: o pagador entra na marca só quando é outro cliente (marca dos orçamentos antigos não muda). 13/11: os textos congelados também.
  var marca = Ast_marca_(JSON.stringify([o.NUMERO, o.REVISAO, o.ITENS_JSON, o.VALOR_TOTAL, o.CONDICOES, o.VALIDADE].concat(pg.outro ? [pg.id] : []).concat(congTxt ? [congTxt] : [])));
  var html = AstR_htmlOrcamento_(o, c, marca);
  var nome = 'Orcamento de assistencia - ' + o.NUMERO + ' rev' + (Number(o.REVISAO) || 0) + ' - ' + pg.nome.slice(0, 60);
  var fin = typeof RelA4_finalizar_ === 'function' ? RelA4_finalizar_(html, nome) : { html: html, pdfBlob: null };
  var pasta = SGO_DocSalvar_pastaClienteEm_(SGO_DocSalvar_pastaPersistente_('ATEC_PASTA_ORC_ID', AST_PASTA_ORCAMENTOS, ''), pg.cnpj, pg.nome || 'Sem cliente');
  var g = SGO_DocSalvar_salvarHtmlEPdf_(pasta, nome, fin.html, fin.pdfBlob ? { compartilhar: true, pdfBlob: fin.pdfBlob } : { compartilhar: true });
  var campos = { SITUACAO: 'EMITIDO', PDF_ID: g.pdfId, PDF_URL: g.pdfUrl, HTML_ID: g.htmlId, EMITIDO_EM: Ast_agora_(), EMITIDO_POR_NOME: eu.nome, ATUALIZADO_EM: Ast_agora_() };
  if (congTxt) campos.CONGELADO_JSON = congTxt;
  Ast_atualizar_(AST_ABAS.ORCAMENTOS, o.ID, campos);
  // 18/11/2026 (Portal do cliente, etapa 4): o Gestor do cliente da unidade, com portal, recebe "orçamento para aprovação" (PC04, sem valores)
  if (typeof PCl_avisoOrcamento_ === 'function') { var oAv = Object.assign({}, o, campos), cAv = c; Ast_depois_(function () { PCl_avisoOrcamento_(oAv, cAv); }); }
  if (c.ID) Ast_evento_('CHAMADO', c.ID, 'ORCAMENTO', eu, 'Orçamento ' + o.NUMERO + ' emitido' + (pg.outro ? ' (faturar para ' + pg.nome + ')' : '') + '; aguarda a resposta do cliente', { numero: c.NUMERO, publico: true });
  return { orcamento: AstR_orcPublico_(Object.assign({}, o, campos), eu), html: g.html || fin.html,
    message: 'Orçamento ' + o.NUMERO + ' emitido. Envie ao cliente pelo botão "Enviar com link de aceite": o cliente aprova, recusa ou pede ajuste pelo link. Quem responder por telefone ou e-mail tem a resposta registrada em "Registrar a resposta do cliente", com o aceite anexado.' };
}
/** Nova revisão do orçamento emitido (a anterior fica como substituída). */
function AstR_revisarOrcamento_(eu, d) {
  Ast_exigir_(eu, 'VALORES', 'revisar o orçamento');
  var o = Ast_porId_(AST_ABAS.ORCAMENTOS, d && d.id);
  if (!o || ['EMITIDO', 'RECUSADO', 'AJUSTE'].indexOf(Ast_up_(o.SITUACAO)) < 0) throw new Error('Não foi possível revisar: só orçamento emitido, recusado ou com pedido de ajuste ganha revisão');
  var r = Ast_comTrava_(function () {
    // 12/11/2026: dois toques em "Nova revisão" (ou duas pessoas) criavam duas revisões em rascunho; confere de novo dentro da trava
    var atualR = Ast_reler_(AST_ABAS.ORCAMENTOS, o.ID);
    if (!atualR || ['EMITIDO', 'RECUSADO', 'AJUSTE'].indexOf(Ast_up_(atualR.SITUACAO)) < 0) throw new Error('Não foi possível revisar: o orçamento ' + o.NUMERO + ' rev. ' + (Number(o.REVISAO) || 0) + ' acabou de mudar (' + (AST_ORC_SITUACOES[Ast_up_(atualR && atualR.SITUACAO)] || 'não encontrado') + '), provavelmente já foi revisado. Atualize a ficha do chamado e continue pela revisão mais nova');
    Ast_atualizar_(AST_ABAS.ORCAMENTOS, o.ID, { SITUACAO: 'SUBSTITUIDO', ATUALIZADO_EM: Ast_agora_() });
    // a revisão nova revoga o link de aceite da anterior (etapa 4)
    if (typeof AstL_encerrarLinks_ === 'function') AstL_encerrarLinks_(o.ID, 'SUBSTITUIDO', 'Orçamento substituído pela revisão ' + ((Number(o.REVISAO) || 0) + 1));
    return Ast_inserir_(AST_ABAS.ORCAMENTOS, { NUMERO: o.NUMERO, REVISAO: (Number(o.REVISAO) || 0) + 1, CHAMADO_ID: o.CHAMADO_ID, CHAMADO_NUMERO: o.CHAMADO_NUMERO, CLIENTE_ID: o.CLIENTE_ID, CLIENTE_NOME: o.CLIENTE_NOME,
      PAGADOR_ID: Ast_s_(o.PAGADOR_ID), PAGADOR_NOME: Ast_s_(o.PAGADOR_NOME),
      ITENS_JSON: o.ITENS_JSON, VALOR_TOTAL: o.VALOR_TOTAL, VALIDADE: Ast_somarDias_(Ast_hoje_(), 15), CONDICOES: o.CONDICOES, SITUACAO: 'RASCUNHO', COMERCIAL_ATIVIDADE_ID: o.COMERCIAL_ATIVIDADE_ID, POR_ID: eu.id, POR_NOME: eu.nome, ATUALIZADO_EM: Ast_agora_() });
  });
  if (Ast_s_(r.CHAMADO_ID)) Ast_atualizar_(AST_ABAS.CHAMADOS, r.CHAMADO_ID, { ORCAMENTO_ID: r.ID });
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
  var res = AstR_aplicarDecisao_(eu, o, { decisao: dec, por: por, texto: txt, arquivo: arq, comprarPecas: d.comprarPecas !== false, canal: 'MANUAL' });
  return { message: 'Resposta registrada: orçamento ' + o.NUMERO + ' ' + (dec === 'APROVADO' ? 'aprovado' + (res.comprar ? ' e peças pedidas a Compras' : '; agende o atendimento') : 'recusado; decida entre nova revisão e cancelar o chamado') + '.',
    chamado: res.c ? AstC_publico_(res.c, eu, Date.now()) : null };
}
/**
 * Núcleo único da resposta do cliente (22/10/2026, etapa 4): a mesma para o registro manual com anexo, o link de aceite e o
 * portal "Meus chamados". x: { decisao: APROVADO|RECUSADO|AJUSTE, por, texto, arquivo:{ id, url, nome }|null, comprarPecas, canal: MANUAL|LINK|PORTAL, registroId }.
 * Confere de novo dentro da trava que o orçamento ainda está emitido (resposta única). Aprovado: chamado a "Planejado" ou
 * "Aguardando peça" com um pedido em Compras por peça; recusado e ajuste: o chamado fica aguardando a decisão da gestão.
 */
function AstR_aplicarDecisao_(eu, o, x) {
  var dec = Ast_up_(x.decisao), por = Ast_s_(x.por), txt = Ast_s_(x.texto), arq = x.arquivo || null, canal = Ast_up_(x.canal) || 'MANUAL';
  var itens = Ast_json_(o.ITENS_JSON, []), pecas = itens.filter(function (i) { return Ast_up_(i.tipo) === 'PECA'; });
  var comprar = !!(dec === 'APROVADO' && pecas.length && x.comprarPecas !== false);
  var pelo = canal === 'LINK' ? ' pelo link do orçamento' : canal === 'PORTAL' ? ' pelo portal do cliente' : '';
  var res = Ast_comTrava_(function () {
    Ast_memoTirar_(AST_ABAS.ORCAMENTOS);
    var atual = Ast_porId_(AST_ABAS.ORCAMENTOS, o.ID);
    if (!atual || Ast_up_(atual.SITUACAO) !== 'EMITIDO') throw new Error('Não foi possível registrar: o orçamento ' + o.NUMERO + ' já foi respondido ou substituído (' + (AST_ORC_SITUACOES[Ast_up_(atual && atual.SITUACAO)] || 'não encontrado') + '). Atualize a ficha do chamado');
    var campos = { SITUACAO: dec, ACEITE_POR: por, DECISAO_TEXTO: txt, DECIDIDO_EM: Ast_agora_(), ACEITE_CANAL: canal, ACEITE_REGISTRO_ID: Ast_s_(x.registroId), ATUALIZADO_EM: Ast_agora_() };
    if (arq) Object.assign(campos, { ACEITE_ARQUIVO_ID: arq.id, ACEITE_URL: arq.url, ACEITE_NOME: arq.nome });
    Ast_atualizar_(AST_ABAS.ORCAMENTOS, o.ID, campos);
    var c = Ast_porId_(AST_ABAS.CHAMADOS, o.CHAMADO_ID);
    if (c && Ast_up_(c.SITUACAO) === 'AGUARDANDO_ORCAMENTO') {
      if (dec === 'APROVADO') {
        if (comprar) {
          c = AstC_mudar_(eu, c, 'AGUARDANDO_PECA', { PECA_DESCRICAO: pecas.map(function (p) { return p.quantidade + ' × ' + p.descricao; }).join('; ').slice(0, 500), PROXIMA_ACAO: 'Aguardar as peças do orçamento aprovado e agendar' }, 'ORCAMENTO_APROVADO', 'Orçamento ' + o.NUMERO + ' aprovado por ' + por + pelo + '; peças pedidas a Compras');
          var cc = c;
          pecas.forEach(function (p) { Ast_depois_(function () { AstC_ligarPedidoCompra_(eu, cc, { descricao: p.descricao, codigo: p.codigo, quantidade: p.quantidade, urgencia: 'ALTA' }); }); });
        } else c = AstC_mudar_(eu, c, 'PLANEJADO', { PROXIMA_ACAO: 'Agendar o atendimento (orçamento aprovado)' }, 'ORCAMENTO_APROVADO', 'Orçamento ' + o.NUMERO + ' aprovado por ' + por + pelo);
      } else if (dec === 'AJUSTE') {
        Ast_atualizar_(AST_ABAS.CHAMADOS, c.ID, { PROXIMA_ACAO: 'Cliente pediu ajuste no orçamento: faça a nova revisão e envie de novo', ATUALIZADO_EM: Ast_agora_() });
        Ast_evento_('CHAMADO', c.ID, 'ORCAMENTO_AJUSTE', eu, 'Ajuste pedido no orçamento ' + o.NUMERO + ' por ' + por + pelo + ': ' + txt, { numero: c.NUMERO, publico: true });
        c = Ast_porId_(AST_ABAS.CHAMADOS, c.ID) || c;
      } else {
        Ast_atualizar_(AST_ABAS.CHAMADOS, c.ID, { PROXIMA_ACAO: 'Cliente recusou o orçamento: decidir entre negociar (nova revisão), cobrar a visita ou encerrar o chamado', ATUALIZADO_EM: Ast_agora_() });
        Ast_evento_('CHAMADO', c.ID, 'ORCAMENTO_RECUSADO', eu, 'Orçamento ' + o.NUMERO + ' recusado por ' + por + pelo + ': ' + txt, { numero: c.NUMERO, publico: true });
        c = Ast_porId_(AST_ABAS.CHAMADOS, c.ID) || c;
      }
    }
    if (dec !== 'AJUSTE') Ast_mudarAtividade_(o.COMERCIAL_ATIVIDADE_ID, 'Concluída', 'Orçamento ' + o.NUMERO + ' ' + (dec === 'APROVADO' ? 'aprovado' : 'recusado') + ' pelo cliente (' + por + ')' + pelo + '.');
    if (c) {
      var nomeDec = dec === 'APROVADO' ? 'aprovado' : dec === 'AJUSTE' ? 'com pedido de ajuste' : 'recusado';
      var dest = Ast_gestoresTecnica_(), ev = 'AT12';
      if (canal !== 'MANUAL') {
        // 22/10/2026 (etapa 4): resposta do próprio cliente pelo link ou pelo portal avisa a gestão, o Comercial e o técnico do chamado
        var com = AstR_comercialPara_();
        if (com) dest = dest.concat([com.id]);
        if (Ast_s_(c.TECNICO_ID)) dest = dest.concat([Ast_s_(c.TECNICO_ID)]);
        ev = dec === 'APROVADO' ? 'AT16' : 'AT17';
      }
      Ast_avisar_(dest, 'ORCAMENTO_' + dec, 'Orçamento ' + nomeDec + pelo + ': ' + c.NUMERO, 'Cliente ' + Ast_s_(c.CLIENTE_NOME) + ' · respondeu ' + por + (txt ? ': ' + txt : '') + '. ' + Ast_s_(c.PROXIMA_ACAO), c.ID, { autorId: eu.id, evento: ev });
    }
    return { c: c };
  });
  return { c: res.c, comprar: comprar };
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
  // 18/11/2026: sem a contagem de tarefas do Auvo no mês (Auvo descontinuado pelo dono).
  return {
    comp: comp, abertos: abertos.length, atendidos: atendidos.length, encerrados: ch.filter(function (c) { return no(c.ENCERRADO_EM); }).length, cancelados: ch.filter(function (c) { return no(c.CANCELADO_EM); }).length,
    slaPct: atendidos.length ? Math.round(cumpridos * 100 / atendidos.length) : null, cumpridos: cumpridos, foraDoPrazo: fora, estouradosAgora: estouradosAgora, porPrioridade: porPrioridade,
    tempoMedioMinUteis: media, reincidentes: reinc, equipamentosReincidentes: equipReinc, tecnicos: tecnicos,
    porTipo: Object.keys(porTipo).map(function (k) { return { tipo: k, qtd: porTipo[k] }; }).sort(function (a, b) { return b.qtd - a.qtd; }),
    reclamacoes: { abertas: casos.filter(function (k) { return no(k.CRIADO_EM); }).length, resolvidas: casos.filter(function (k) { return no(k.RESOLVIDO_EM); }).length, pendentes: casos.filter(function (k) { return Ast_up_(k.SITUACAO) !== 'RESOLVIDO'; }).length },
    docPendenteAgora: oss.filter(function (o) { return Ast_up_(o.SITUACAO) === 'DOC_PENDENTE'; }).length, osSgoMes: oss.filter(function (o) { return no(o.AGENDADO_PARA) && Ast_up_(o.SITUACAO) !== 'CANCELADA'; }).length
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
    '<p class="nota">O.S. no SGO+ no mês: ' + ind.osSgoMes + '. Reclamações: ' + ind.reclamacoes.abertas + ' registradas e ' + ind.reclamacoes.resolvidas + ' resolvidas no mês.</p>');
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
