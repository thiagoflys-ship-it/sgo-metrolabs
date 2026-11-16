/****************************************************
 * DEPÓSITO DE VIAGEM — A4 DE FECHAMENTO (E2, 11/11/2026)
 *
 * Relatório A4 (HTML, padrão SGO_DocA4.js) da prestação de contas e do fechamento da viagem: orçado (1ª revisão enviada) ×
 * aprovado (revisão aprovada) × gasto × aceito × glosado por categoria; carregado, devolvido e reembolsado no total (a carga e a
 * devolução são do cartão inteiro, não de uma categoria); cada gasto com o comprovante, as glosas com o motivo, os acertos e as
 * assinaturas de quem prestou contas, de quem conferiu e de quem deu ciência. Antes da ciência sai como PRÉVIA.
 * Nenhuma função devolve Date cru. Este arquivo pode carregar antes de SGO_Viagem.js: só funções.
 ****************************************************/

function Via_fechamentoHtml_(r, eu) {
  var s = Via_up_(r.SITUACAO), carregado = Number(r.CARREGADO_TOTAL) || 0;
  if (!(carregado > 0) && VIA_POS_CARGA.indexOf(s) < 0) throw new Error('Não foi possível gerar o A4 de fechamento: a viagem ' + Via_s_(r.NUMERO) + ' ainda não teve carga no cartão, então não há prestação de contas. Use "Ver o relatório A4" da solicitação.');
  var itens = Via_itensAtivos_(r.ID), acertos = Via_acertosDe_(r.ID), k = Via_contasPrestacao_(r, itens, acertos), m = Via_moeda_, esc = SGO_DocA4_esc_;
  var encerrada = s === 'ENCERRADA', se = Via_sitEfetiva_(r), pz = Via_prazoInfo_(r);
  var num = function (v) { return { t: m(v), cls: 'num' }; };
  var resultado;
  if (encerrada) resultado = { classe: 'ok', rotulo: 'Contas fechadas', valor: m(k.aceito), texto: 'Gasto aceito pelo Financeiro. Carregado ' + m(k.carregado) + '; devolvido ' + m(k.devolvido) + '; reembolsado ' + m(k.reembolsado) + '. Ciência de ' + Via_s_(r.CIENCIA_POR_NOME) + ' em ' + Via_br_(r.CIENCIA_EM) + '.' };
  else if (k.aDevolver > 0) resultado = { classe: 'nok', rotulo: k.conferida ? 'A devolver (conferido)' : 'A devolver (pela conta de hoje)', valor: m(k.aDevolver), texto: 'Carregado ' + m(k.carregado) + ' menos ' + (k.conferida ? 'o aceito ' + m(k.aceito) : 'o gasto lançado ' + m(k.gasto) + (k.glosado ? ' (menos o glosado até agora, ' + m(k.glosado) + ')' : '')) + (k.devolvido ? ', menos o já devolvido ' + m(k.devolvido) : '') + '.' };
  else if (k.aReembolsar > 0) resultado = { classe: 'info', rotulo: k.conferida ? 'A reembolsar (conferido)' : 'A reembolsar (pela conta de hoje)', valor: m(k.aReembolsar), texto: (k.conferida ? 'Aceito ' + m(k.aceito) : 'Gasto lançado ' + m(k.gasto)) + ' menos o carregado ' + m(k.carregado) + (k.reembolsado ? ', menos o já reembolsado ' + m(k.reembolsado) : '') + '.' };
  else resultado = { classe: 'ok', rotulo: 'Saldo', valor: m(0), texto: k.conferida ? 'Saldo acertado. ' + (s === 'AGUARDANDO_CIENCIA' ? 'Aguardando a ciência.' : '') : 'Pela conta de hoje, o gasto lançado bate com o carregado.' };
  var doc = {
    titulo: 'Prestação de contas e fechamento da viagem', subtitulo: 'Orçado, aprovado, carregado no cartão Caju, gasto e devolvido', tituloCurto: 'Fechamento de viagem', rotuloNumero: 'Nº',
    numero: Via_s_(r.NUMERO), revisao: String(Number(r.APROVADO_REVISAO) || 0), emissao: Via_br_(Via_agora_()),
    ficha: [['Situação', VIA_SITUACOES[se] || se], ['Responsável pelo dinheiro', Via_s_(r.RESPONSAVEL_NOME)], ['Solicitante', Via_s_(r.SOLICITANTE_NOME)],
      ['Centro de custo', Via_s_(r.CENTRO_CUSTO_CODIGO) + (Via_centroCaju_(r) !== Via_up_(r.CENTRO_CUSTO_CODIGO) ? ' (no Caju: ' + Via_centroCaju_(r) + ')' : '')],
      ['Destino', Via_s_(r.DESTINO_CIDADE) + '/' + Via_up_(r.DESTINO_UF)], ['Viagem', Via_br_(r.SAIDA_EM) + ' a ' + Via_br_(r.CHEGADA_EM)],
      ['Prazo da prestação', pz ? pz.prazoTxt + (pz.vencida ? ' (vencida)' : '') : (Via_s_(r.PRESTACAO_ENVIADA_EM) ? 'cumprido: enviada em ' + Via_br_(r.PRESTACAO_ENVIADA_EM) : '—')],
      ['Conferência', Via_s_(r.CONFERIDA_EM) ? Via_s_(r.CONFERIDA_POR_NOME) + ' em ' + Via_br_(r.CONFERIDA_EM) : 'ainda não concluída'],
      ['Ciência', Via_s_(r.CIENCIA_EM) ? Via_s_(r.CIENCIA_POR_NOME) + ' em ' + Via_br_(r.CIENCIA_EM) : 'ainda não dada']],
    resultado: resultado
  };
  var h = [SGO_DocA4_inicioDocumento_(doc)];
  if (!encerrada) h.push('<p><b>Prévia.</b> As contas desta viagem ainda não estão fechadas (' + esc((VIA_SITUACOES[se] || se).toLowerCase()) + '). Os valores ' + (k.conferida ? 'são os da conferência do Financeiro' : 'são os lançados por quem prestou contas, antes da conferência do Financeiro') + '. O documento que vale é o emitido depois da ciência.</p>');
  // 1. resumo
  h.push('<h2>1. Resumo das contas</h2>');
  h.push('<p>Nenhum valor desta página é digitado: o aprovado vem da revisão aprovada da solicitação; o carregado, das cargas registradas pelo Financeiro com comprovante; o gasto, dos comprovantes lançados na prestação; o aceito e o glosado, da conferência do Financeiro; o devolvido e o reembolsado, dos acertos registrados com comprovante. A devolver = carregado − aceito (antes de concluída a conferência, carregado − gasto lançado, menos o que já foi glosado); se der negativo, a diferença é a reembolsar.</p>');
  h.push(SGO_DocA4_tabela_([{ t: 'Conta' }, { t: 'Valor', cls: 'num' }], [
    ['Aprovado (revisão ' + SGO_DocA4_revisao_(Number(r.APROVADO_REVISAO) || 0) + ')', num(Number(r.APROVADO_TOTAL) || 0)], ['Carregado no cartão Caju', num(k.carregado)],
    ['Gasto lançado (' + k.itens + (k.itens === 1 ? ' gasto' : ' gastos') + ')', num(k.gasto)], ['   no cartão Caju', num(k.gastoCaju)], ['   com dinheiro próprio', num(k.gastoProprio)],
    ['   sem comprovante (com justificativa)', num(k.semComprovante)], ['Aceito pelo Financeiro', k.conferida ? num(k.aceito) : 'conferência não concluída'], ['Glosado', num(k.glosado)],
    ['Devolvido pela pessoa', num(k.devolvido)], ['Reembolsado pela empresa', num(k.reembolsado)], ['Falta devolver', num(k.aDevolver)], ['Falta reembolsar', num(k.aReembolsar)]]));
  // 2. por categoria
  h.push('<h2>2. Por categoria</h2>');
  h.push('<p>Orçado é a primeira revisão enviada (o pedido original); aprovado é a revisão aprovada. A carga e a devolução são do cartão inteiro, por isso aparecem só no total. Gasto fora do orçado é o de categoria sem linha no orçamento.</p>');
  var tc = k.porCategoria.reduce(function (a, x) { a.o += Via_cent_(x.orcado); a.a += Via_cent_(x.aprovado); a.g += Via_cent_(x.gasto); a.c += Via_cent_(x.aceito); a.l += Via_cent_(x.glosado); return a; }, { o: 0, a: 0, g: 0, c: 0, l: 0 });
  h.push(SGO_DocA4_tabela_([{ t: 'Categoria' }, { t: 'Orçado', cls: 'num' }, { t: 'Aprovado', cls: 'num' }, { t: 'Gasto', cls: 'num' }, { t: 'Aceito', cls: 'num' }, { t: 'Glosado', cls: 'num' }],
    k.porCategoria.map(function (x) { return [x.nome + (x.aprovado === 0 && x.gasto > 0 ? ' (fora do orçado)' : ''), num(x.orcado), num(x.aprovado), num(x.gasto), k.conferida ? num(x.aceito) : '—', num(x.glosado)]; }),
    { rodape: [{ html: '<b>Total</b>' }, num(tc.o / 100), num(tc.a / 100), num(tc.g / 100), k.conferida ? num(tc.c / 100) : '—', num(tc.l / 100)] }));
  h.push(SGO_DocA4_tabela_([{ t: 'Cartão' }, { t: 'Carregado', cls: 'num' }, { t: 'Gasto no cartão', cls: 'num' }, { t: 'Devolvido', cls: 'num' }, { t: 'Reembolsado', cls: 'num' }],
    [['Caju de ' + Via_s_(r.RESPONSAVEL_NOME), num(k.carregado), num(k.gastoCaju), num(k.devolvido), num(k.reembolsado)]]));
  // 3. gastos
  h.push('<h2>3. Gastos da prestação</h2>');
  h.push(itens.length ? SGO_DocA4_tabela_([{ t: 'Nº', cls: 'cen' }, { t: 'Data' }, { t: 'Categoria' }, { t: 'Para que foi, estabelecimento e comprovante' }, { t: 'Pago com' }, { t: 'Valor', cls: 'num' }, { t: 'Conferência' }],
    itens.map(function (i) {
      var cat = VIA_CAT[Via_up_(i.CATEGORIA)] || { nome: Via_s_(i.CATEGORIA) }, sit = Via_up_(i.SITUACAO);
      return [String(Number(i.ITEM_NUMERO) || ''), Via_brDia_(i.DATA), cat.nome + (Via_up_(i.FORA_DO_ORCADO) === 'SIM' ? ' (fora do orçado)' : ''),
        (Via_letras_(i.DESCRICAO) >= VIA_DESCRICAO_MIN ? Via_s_(i.DESCRICAO) : 'SEM DESCRIÇÃO (pedir a quem prestou contas)') + ' · ' + Via_s_(i.ESTABELECIMENTO) + (Via_s_(i.CNPJ) ? ' · CNPJ ' + Via_s_(i.CNPJ) : '') + ' · ' + (Via_up_(i.SEM_COMPROVANTE) === 'SIM' ? 'SEM COMPROVANTE: ' + Via_s_(i.JUSTIFICATIVA_SEM_COMPROVANTE) : Via_s_(i.COMPROVANTE_NOME)) +
          (Via_s_(i.IA_DIVERGENCIAS) ? ' · diferente da leitura do comprovante: ' + Via_s_(i.IA_DIVERGENCIAS) : ''),
        Via_up_(i.PAGO_COM) === 'PROPRIO' ? 'Dinheiro próprio' : 'Cartão Caju', num(i.VALOR),
        sit === 'ACEITO' ? 'Aceito' : sit === 'GLOSADO' ? 'Glosado ' + m(i.VALOR_GLOSADO) + ': ' + Via_s_(i.GLOSA_MOTIVO) : 'A conferir'];
    }), { rodape: [{ html: '<b>Total</b>' }, '', '', '', '', num(k.gasto), ''] }) : '<p>Nenhum gasto lançado.' + (Via_s_(r.PRESTACAO_OBS) ? ' Observação de quem prestou contas: ' + esc(r.PRESTACAO_OBS) : '') + '</p>');
  if (itens.length && Via_s_(r.PRESTACAO_OBS)) h.push('<p><b>Observação de quem prestou contas:</b> ' + esc(r.PRESTACAO_OBS) + '</p>');
  // 4. glosas
  var glosas = itens.filter(function (i) { return Via_up_(i.SITUACAO) === 'GLOSADO'; });
  h.push('<h2>4. Glosas</h2>');
  h.push(glosas.length ? SGO_DocA4_tabela_([{ t: 'Gasto' }, { t: 'Valor glosado', cls: 'num' }, { t: 'Motivo' }, { t: 'Por' }], glosas.map(function (i) { return ['Nº ' + Via_s_(i.ITEM_NUMERO) + ' · ' + Via_s_(i.ESTABELECIMENTO), num(i.VALOR_GLOSADO), Via_s_(i.GLOSA_MOTIVO), Via_s_(i.CONFERIDO_POR_NOME) + ' em ' + Via_br_(i.CONFERIDO_EM)]; }))
    + '<p>Valor glosado não é aceito como gasto da empresa e entra no valor a devolver. Desconto em folha só nos casos da lei ou por decisão da Diretoria, depois do aval do jurídico.</p>' : '<p>Nenhuma glosa.</p>');
  // 5. acertos
  h.push('<h2>5. Acerto do saldo</h2>');
  h.push(acertos.length ? SGO_DocA4_tabela_([{ t: 'Tipo' }, { t: 'Como' }, { t: 'Data' }, { t: 'Valor', cls: 'num' }, { t: 'Comprovante' }, { t: 'Registrado por' }],
    acertos.map(function (a) { var fs = VIA_FORMAS_ACERTO[Via_up_(a.TIPO)] || {}; return [Via_up_(a.TIPO) === 'DEVOLUCAO' ? 'Devolução' : 'Reembolso', fs[Via_up_(a.FORMA)] || Via_s_(a.FORMA), Via_brDia_(a.DATA), num(a.VALOR), Via_s_(a.COMPROVANTE_NOME), Via_s_(a.POR_NOME) + ' em ' + Via_br_(a.EM) + (Via_s_(a.OBSERVACAO) ? '. ' + Via_s_(a.OBSERVACAO) : '')]; }))
    : '<p>' + (k.conferida && k.zerado ? 'Sem saldo a acertar.' : 'Nenhum acerto registrado ainda.') + '</p>');
  // assinaturas
  var ass = [{ papel: 'Prestou contas', nome: Via_s_(r.PRESTACAO_ENVIADA_POR_NOME) || Via_s_(r.RESPONSAVEL_NOME), cargo: Via_s_(r.PRESTACAO_ENVIADA_EM) ? 'Enviada em ' + Via_br_(r.PRESTACAO_ENVIADA_EM) : 'Ainda não enviada' }];
  ass.push({ papel: 'Conferido (Financeiro)', nome: Via_s_(r.CONFERIDA_POR_NOME) || '—', cargo: Via_s_(r.CONFERIDA_EM) ? 'Em ' + Via_br_(r.CONFERIDA_EM) : 'Conferência não concluída' });
  ass.push({ papel: 'Ciência do fechamento', nome: Via_s_(r.CIENCIA_POR_NOME) || '—', cargo: Via_s_(r.CIENCIA_EM) ? 'Em ' + Via_br_(r.CIENCIA_EM) + (Via_s_(r.CIENCIA_COMENTARIO) ? '. ' + Via_s_(r.CIENCIA_COMENTARIO) : '') : 'Aguardando' });
  h.push(SGO_DocA4_assinaturas_(ass));
  h.push('<p>Conciliação com o extrato do cartão Caju: fora deste documento (módulo de conciliação do Financeiro). ' + (Via_s_(r.FECHAMENTO_HASH) ? 'Marca de conferência do fechamento (SHA-256): ' + esc(r.FECHAMENTO_HASH) + '. ' : '') + 'Documento gerado pelo SGO+ em ' + esc(Via_br_(Via_agora_())) + (eu && eu.nome ? ' por ' + esc(eu.nome) : '') + '.</p>');
  h.push(SGO_DocA4_fimDocumento_());
  return h.join('');
}
