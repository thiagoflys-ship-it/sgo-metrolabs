/****************************************************
 * COMERCIAL — DOCUMENTOS A4 (21/10/2026)
 *
 * Proposta comercial e relatório mensal do Comercial, na moldura A4 comum do SGO+ (SGO_DocA4 + blocos de
 * SGO_Documentos_RelatorioA4: cabeçalho e rodapé corridos, "Página X de Y", seções e tabelas numeradas,
 * números e datas em pt-BR, texto justificado, sem emoji, sem fabricante).
 *
 * Proposta: retrato. Conteúdo: dados do cliente e da unidade, responsável pela proposta, apresentação, escopo,
 * itens (Tabela), condições comerciais, responsabilidades, validade e aceite (assinaturas) e a marca de
 * conferência do conteúdo. Nunca leva custo nem margem. O modelo (textos padrão, condições, validade) vem da
 * metodologia, editável pela gestão; quando o dono mandar o modelo oficial, os textos entram lá.
 *
 * Relatório mensal: indicadores do funil, ganhos e perdas, perdas por motivo, propostas, por vendedor e a
 * análise da gestora comercial (IA conferida; sem IA, texto padrão com os mesmos números). Vai para a pasta
 * "Comercial - Relatórios" e à Diretoria no 1º dia útil pela rotina de relatórios que já existe.
 ****************************************************/

var COM_PASTA_RELATORIOS = 'Comercial - Relatórios';

function ComDoc_esc_(s) { return typeof RelA4_esc_ === 'function' ? RelA4_esc_(s) : String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

/** Telefone brasileiro legível: (62) 99999-0000 / (62) 3333-0000; outro formato passa como está. */
function ComDoc_fone_(f) {
  var d = Com_s_(f).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  return Com_s_(f);
}

function ComDoc_cnpj_(c) {
  var d = Com_s_(c).replace(/\D/g, '');
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : Com_s_(c);
}

/**
 * Cláusulas em parágrafos justificados, uma por linha do texto (sem virar lista: a numeração é parte da cláusula); o título da
 * cláusula em negrito ("1. DO OBJETO:"). Depois, a frase de concordância e a versão dos termos.
 */
function ComDoc_termosHtml_(tm) {
  var paras = Com_s_(tm.texto).replace(/\r\n?/g, '\n').split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
    var m = /^(\d+\.\s+(?:[A-ZÀÁÂÃÉÊÍÓÔÕÚÇ\/-]{2,}(?:\s+|(?=:)))+:?)([\s\S]*)$/.exec(l);
    return '<p style="text-align:justify;margin:0 0 2.2mm">' + (m ? '<b>' + ComDoc_esc_(m[1].trim()) + '</b> ' + ComDoc_esc_(m[2].trim()) : ComDoc_esc_(l)) + '</p>';
  }).join('');
  return '<div class="analise">' + paras + '</div>' +
    (Com_s_(tm.concordancia) ? '<p style="text-align:justify;margin:3mm 0 0"><b>' + ComDoc_esc_(tm.concordancia) + '</b></p>' : '') +
    '<p class="nota" style="margin-top:2mm">Termos e condições da contratação, versão ' + ComDoc_esc_(String(tm.versao || 1)) + '.</p>';
}

/** HTML A4 da proposta (sem salvar). p: linha de COM_PROPOSTAS; cong: dados congelados; marca: conferência. */
function ComDoc_propostaHtml_(p, cong, marca) {
  var itens = Com_json_(p.ITENS_JSON, []), cond = Com_json_(p.CONDICOES_JSON, {}) || {}, met = Com_metodologia_();
  var rotulo = ComP_rotulo_(p), validaAte = Com_brDia_(p.VALIDA_ATE), empresa = typeof RelA4_empresa_ === 'function' ? RelA4_empresa_() : { nome: 'Metrolab Soluções em Engenharia Clínica LTDA', cnpj: '' };
  var cli = cong.cliente || {}, un = cong.unidade || {}, ct = cong.contato || {}, vd = cong.vendedor || {};
  var endereco = [un.endereco || cli.endereco, [un.cidade, un.uf].filter(Boolean).join('/')].filter(Boolean).join(' · ');
  var temServico = itens.some(function (i) { return i.tipo !== 'PRODUTO'; });
  var corpo = '';
  corpo += RelA4_secao_('Dados do cliente', RelA4_identificacao_([
    ['Razão social', cli.razao], ['CNPJ', ComDoc_cnpj_(un.cnpj || cli.cnpj)],
    ['Unidade', un.nome || '—'], ['Endereço', endereco || '—'],
    ['A/C', [ct.nome, ct.cargo].filter(Boolean).join(' — ') || '—'], ['E-mail', ct.email || '—'],
    ['Telefone', ComDoc_fone_(ct.telefone) || '—', { largo: true }]
  ]));
  corpo += RelA4_secao_('Responsável pela proposta', RelA4_identificacao_([
    ['Responsável', vd.nome || Com_s_(p.RESPONSAVEL_NOME)], ['Contato', [vd.email, ComDoc_fone_(vd.telefone)].filter(Boolean).join(' · ') || '—'],
    ['Empresa', empresa.nome + (empresa.cnpj ? ' · CNPJ ' + empresa.cnpj : ''), { largo: true }]
  ]));
  if (Com_s_(p.APRESENTACAO)) corpo += RelA4_secao_('Apresentação', RelA4_paragrafos_(p.APRESENTACAO));
  corpo += RelA4_secao_(temServico ? 'Escopo' : 'Resumo do fornecimento', RelA4_paragrafos_(ComP_escopo_(p) || 'Conforme os itens da tabela a seguir.'));
  var linhas = itens.map(function (i, k) {
    var q = Number(i.quantidade) || 0, pu = Number(i.precoUnitario) || 0;
    var desc = '<b>' + ComDoc_esc_(i.descricao) + '</b>' + (i.equipamentoTexto ? '<span class="sub">Equipamento: ' + ComDoc_esc_(i.equipamentoTexto) + '</span>' : '') + (i.detalhe ? '<span class="sub">' + ComDoc_esc_(i.detalhe) + '</span>' : '');
    return [String(k + 1), COM_TIPOS_ITEM[i.tipo] || 'Serviço', { html: desc }, SGO_DocA4_num_(q, Math.round(q) === q ? 0 : 2), i.unidade || 'un.', Com_moeda_(pu), Com_moeda_(q * pu)];
  });
  var cols = [{ t: 'Nº', cen: true, w: '7mm' }, { t: 'Tipo', w: '17mm' }, { t: 'Descrição' }, { t: 'Qtd.', num: true }, { t: 'Un.', cen: true }, { t: 'Preço unit.', num: true }, { t: 'Total', num: true }];
  var tabela = RelA4_tabela_(cols, linhas, { legenda: 'Itens da proposta ' + rotulo, vazio: 'Sem itens.' });
  var resumo = [['Subtotal', Com_moeda_(p.SUBTOTAL)]];
  if (Number(p.DESCONTO_GERAL) > 0) resumo.push(['Desconto', '- ' + Com_moeda_(p.DESCONTO_GERAL)]);
  resumo.push(['Total da proposta', Com_moeda_(p.TOTAL)]);
  tabela += '<table class="t compacta manter" style="width:auto;margin-left:auto;min-width:80mm"><tbody>' + resumo.map(function (r, k) {
    return '<tr' + (k === resumo.length - 1 ? ' class="total"' : '') + '><th>' + ComDoc_esc_(r[0]) + '</th><td class="num">' + ComDoc_esc_(r[1]) + '</td></tr>';
  }).join('') + '</tbody></table>';
  corpo += RelA4_secao_('Itens e valores', tabela);
  var c = [['Forma de pagamento', cond.pagamento], [temServico ? 'Prazo de execução' : 'Prazo de entrega', cond.prazoExecucao], ['Garantia', cond.garantia], ['Frete', cond.frete],
    ['Impostos', cond.impostos], ['Local de execução ou entrega', cond.local]].filter(function (x) { return Com_s_(x[1]); });
  var condHtml = c.length ? RelA4_identificacao_(c.map(function (x, k) { return [x[0], x[1], { largo: true }]; })) : '';
  if (Com_s_(cond.gerais)) condHtml += RelA4_subsecao_('Condições gerais', RelA4_paragrafos_(Com_s_(cond.gerais).split('\n').map(function (l) { return l.trim() ? '- ' + l.replace(/^[-•]\s*/, '') : ''; }).join('\n')));
  if (Com_s_(cond.observacoes)) condHtml += RelA4_subsecao_('Observações', RelA4_paragrafos_(cond.observacoes));
  corpo += RelA4_secao_('Condições comerciais', condHtml || '<p>A combinar.</p>');
  if (Com_s_(met.proposta.responsabilidades)) corpo += RelA4_secao_('Responsabilidades', RelA4_paragrafos_(met.proposta.responsabilidades));
  // 28/10/2026: termos e condições da contratação (cláusulas do contrato), congelados no documento (cong.termos), logo acima
  // de "Validade e aceite": a última frase ("firmam o presente instrumento") fica junto das assinaturas.
  var tm = cong.termos || (typeof Com_termosVigentes_ === 'function' ? Com_termosVigentes_() : null);
  if (tm && Com_s_(tm.texto)) corpo += RelA4_secao_('Termos e condições da contratação', ComDoc_termosHtml_(tm));
  var aceite = '<p>Esta proposta é válida até ' + ComDoc_esc_(validaAte) + '. ' + ComDoc_esc_(met.proposta.textoAceite) + '</p>' +
    '<div class="assinaturas manter">' +
    '<div class="assinatura"><div class="img"></div><div class="linha">' + ComDoc_esc_(vd.nome || Com_s_(p.RESPONSAVEL_NOME)) + '</div><div class="cargo">pela ' + ComDoc_esc_(empresa.nome) + '</div></div>' +
    '<div class="assinatura"><div class="img"></div><div class="linha">Aceite do cliente</div><div class="cargo">Nome, CPF ou CNPJ, cargo e data</div></div></div>' +
    '<p class="nota" style="margin-top:4mm">Marca de conferência do conteúdo: ' + ComDoc_esc_(marca) + '. Qualquer alteração no conteúdo desta proposta muda esta marca.</p>';
  corpo += RelA4_secao_('Validade e aceite', aceite);
  return RelA4_documento_({
    titulo: 'Proposta comercial', subtitulo: Com_s_(p.TITULO), tituloCurto: 'Proposta comercial', tituloArquivo: 'Proposta comercial', numero: Com_s_(p.NUMERO), revisao: Number(p.REVISAO) || 0,
    identificacao: cli.fantasia || cli.razao, rotuloIdentificacao: 'Cliente',
    ficha: [['Válida até', validaAte], ['Valor total', Com_moeda_(p.TOTAL)], ['Responsável', vd.nome || Com_s_(p.RESPONSAVEL_NOME)]],
    corpo: corpo, capa: false, sumario: false
  });
}

// ------------------------------------------------------------
// RELATÓRIO MENSAL
// ------------------------------------------------------------
function ComDoc_pastaRelatorios_() { return SGO_DocSalvar_pastaPersistente_('COM_PASTA_RELATORIOS_ID', COM_PASTA_RELATORIOS, ''); }

/** HTML do relatório mensal. ind: Com_indicadores_(comp); analise: { texto, sugestoes[], origem, aviso }. */
function ComDoc_relatorioMesHtml_(comp, ind, analise, emitidoPor) {
  var corpo = '';
  corpo += RelA4_secao_('Resumo do mês', RelA4_kpis_([
    [Com_moeda_(ind.ganho.valor), 'Valor ganho no mês (' + Com_plural_(ind.ganho.qtd, 'venda', 'vendas') + ')', ind.ganho.qtd ? 'ok' : ''],
    [Com_plural_(ind.perdido.qtd, 'perda', 'perdas'), 'Perdidas no mês (' + Com_moeda_(ind.perdido.valor) + ')', ind.perdido.qtd ? 'aviso' : ''],
    [ind.conversaoTxt, 'Conversão (ganhas sobre decididas)', ''],
    [Com_moeda_(ind.aberto.valor), 'Em aberto (' + Com_plural_(ind.aberto.qtd, 'oportunidade', 'oportunidades') + ')', ''],
    [Com_plural_(ind.propostas.enviadas, 'proposta', 'propostas'), 'Propostas enviadas no mês', ''],
    [ind.aprovacaoTxt, 'Taxa de aprovação das propostas respondidas', ''],
    [ind.higieneTxt, 'Abertas com próxima ação em dia', ind.higienePct >= 90 ? 'ok' : (ind.higienePct >= 70 ? 'aviso' : 'critico')],
    [Com_plural_(ind.pedidosSemPassagem, 'pedido', 'pedidos'), 'Aprovados sem passagem aos setores', ind.pedidosSemPassagem ? 'critico' : 'ok']
  ]));
  corpo += RelA4_secao_('Funil em aberto', RelA4_tabela_([{ t: 'Funil' }, { t: 'Etapa' }, { t: 'Prob.', num: true }, { t: 'Oportunidades', num: true }, { t: 'Valor', num: true }, { t: 'Ponderado', num: true }],
    ind.funil.map(function (e) { return [e.funil, e.etapa, e.probabilidade + '%', String(e.qtd), Com_moeda_(e.valor), Com_moeda_(e.ponderado)]; }),
    { legenda: 'Oportunidades abertas por etapa na data do relatório', vazio: 'Nenhuma oportunidade aberta.', total: ['Total', '', '', String(ind.aberto.qtd), Com_moeda_(ind.aberto.valor), Com_moeda_(ind.aberto.ponderado)] }));
  var perdas = ind.perdasPorMotivo.filter(function (m) { return m.qtd; });
  corpo += RelA4_secao_('Perdas por motivo', perdas.length ?
    RelA4_barras_(perdas.map(function (m) { return { rotulo: m.motivo, valor: m.qtd, rotuloValor: m.qtd + ' (' + Com_moeda_(m.valor) + ')', cor: RELA4_CORES.vermelho }; }), { titulo: 'Perdas do mês por motivo (quantidade e valor)' }) :
    '<p>Nenhuma perda registrada no mês.</p>');
  corpo += RelA4_secao_('Propostas', RelA4_identificacao_([
    ['Enviadas', String(ind.propostas.enviadas)], ['Aprovadas', String(ind.propostas.aprovadas)], ['Recusadas', String(ind.propostas.recusadas)], ['Vencidas sem resposta', String(ind.propostas.vencidas)],
    ['Desconto médio das enviadas', ind.propostas.descontoMedioTxt], ['Tempo médio até a 1ª proposta', ind.tempoPrimeiraPropostaTxt]
  ]));
  corpo += RelA4_secao_('Por vendedor', RelA4_tabela_([{ t: 'Vendedor' }, { t: 'Abertas', num: true }, { t: 'Sem próxima ação', num: true }, { t: 'Paradas', num: true }, { t: 'Ganhas', num: true }, { t: 'Valor ganho', num: true }, { t: 'Perdidas', num: true }],
    ind.porVendedor.map(function (v) { return [v.nome, String(v.abertas), String(v.semProxima), String(v.paradas), String(v.ganhas), Com_moeda_(v.valorGanho), String(v.perdidas)]; }),
    { legenda: 'Situação de cada vendedor no mês', vazio: 'Sem vendedores com movimento.' }));
  if (ind.origens.length) corpo += RelA4_secao_('De onde vieram as oportunidades', RelA4_tabela_([{ t: 'Origem' }, { t: 'Novas no mês', num: true }, { t: 'Ganhas no mês', num: true }],
    ind.origens.map(function (o) { return [o.origem, String(o.novas), String(o.ganhas)]; }), { legenda: 'Oportunidades por origem' }));
  var an = RelA4_paragrafos_(analise.texto);
  if (analise.sugestoes && analise.sugestoes.length) an += RelA4_subsecao_('Sugestões de ajuste para o próximo mês', RelA4_paragrafos_(analise.sugestoes.map(function (s) { return '- ' + s; }).join('\n')));
  an += '<p class="nota">' + (analise.origem === 'IA' ? 'Análise redigida pela gestora comercial do sistema e conferida contra os números deste relatório; a decisão é da gestão.' : 'Análise montada pelas regras do sistema com os números deste relatório.') + '</p>';
  corpo += RelA4_secao_('Análise da gestão comercial', an);
  return RelA4_documento_({ titulo: 'Relatório mensal do Comercial', subtitulo: RelA4_competencia_(comp), tituloCurto: 'Relatório do Comercial', tituloArquivo: 'Relatorio do Comercial', sigla: 'COM',
    identificacao: RelA4_competencia_(comp), rotuloIdentificacao: 'Competência', emitidoPor: emitidoPor || 'Rotina automática', corpo: corpo, tipoCapa: 'Relatório gerencial' });
}
