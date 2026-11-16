/****************************************************
 * DEPÓSITO DE VIAGEM — RELATÓRIO A4 DA SOLICITAÇÃO (E1, 11/11/2026)
 *
 * HTML A4 no padrão dos documentos do SGO+ (SGO_DocA4.js): cabeçalho e rodapé corridos com o número e a revisão,
 * "Página X de Y", texto justificado e tabelas com cabeçalho repetido. Cada revisão enviada tem o seu retrato
 * (VIA_REVISOES.CONTEUDO_JSON): o A4 de uma revisão mostra exatamente o que foi enviado e decidido nela. Conteúdo
 * ainda não enviado (ou alterado depois do envio) sai como PRÉVIA, com o aviso de que não vale como solicitação.
 * Nenhuma função devolve Date cru.
 ****************************************************/

function ViaDoc_esc_(s) { return SGO_DocA4_esc_(s); }
function ViaDoc_p_(texto) {
  var t = Via_s_(texto);
  return t ? SGO_DocA4_paragrafos_(t) : '<p>—</p>';
}

/** Retrato da revisão pedida (ou a atual enviada); null = conteúdo atual ainda não enviado (prévia). */
function ViaDoc_retrato_(r, revisao) {
  var revs = Via_ler_(VIA_ABAS.REVISOES).filter(function (v) { return Via_s_(v.SOLICITACAO_ID) === Via_s_(r.ID); });
  var alvo = null;
  if (Via_s_(revisao) !== '') {
    alvo = revs.filter(function (v) { return Number(v.REVISAO) === Number(revisao); })[0];
    if (!alvo) throw new Error('Não foi possível gerar o relatório: a revisão ' + Via_s_(revisao) + ' não existe nesta solicitação. Escolha uma das revisões listadas.');
  } else if (Via_s_(r.REVISAO_HASH) && Via_s_(r.CONTEUDO_HASH) === Via_s_(r.REVISAO_HASH)) {
    alvo = revs.filter(function (v) { return Number(v.REVISAO) === Number(r.REVISAO) && Via_s_(v.HASH) === Via_s_(r.REVISAO_HASH); })[0] || null;
  }
  if (!alvo) return null;
  var ret = Via_json_(alvo.CONTEUDO_JSON, null);
  if (!ret) return null;
  ret.revisao = Number(alvo.REVISAO) || 0; ret.hash = Via_s_(alvo.HASH); ret.criadaEm = Via_br_(alvo.CRIADA_EM); ret.criadaPor = Via_s_(alvo.CRIADA_POR_NOME); ret.motivo = Via_s_(alvo.MOTIVO);
  return ret;
}
/** Retrato do conteúdo atual (prévia). */
function ViaDoc_previa_(r) {
  var c = Via_conteudoDaLinha_(r), pol = Via_politica_(), anexos = Via_anexosAtivos_(r.ID);
  var conf = Via_conferir_(r, c, pol, { anexos: anexos });
  var ret = Via_retrato_(r, c, conf, anexos, pol);
  ret.revisao = Via_proximaRevisao_(r, c, anexos).numero; ret.hash = Via_hash_(c, anexos); ret.criadaEm = ''; ret.criadaPor = ''; ret.motivo = ''; ret.previa = true; ret.faltas = conf.faltas;
  return ret;
}

function Via_documentoHtml_(r, revisao) {
  var ret = ViaDoc_retrato_(r, revisao) || ViaDoc_previa_(r);
  var c = ret.conteudo || {}, previa = !!ret.previa;
  var decisoes = Via_decisoesDe_(r.ID).filter(function (d) { return Number(d.REVISAO) === ret.revisao && Via_s_(d.HASH) === ret.hash; });
  var cargas = Via_ler_(VIA_ABAS.CARGAS).filter(function (g) { return Via_s_(g.SOLICITACAO_ID) === Via_s_(r.ID); }).sort(function (a, b) { return Via_s_(a.EM).localeCompare(Via_s_(b.EM)); });
  var aprovadaEsta = Via_up_(r.APROVACAO_VALIDA) === 'SIM' && Number(r.APROVADO_REVISAO) === ret.revisao && Via_s_(r.APROVADO_HASH) === ret.hash;
  var situacao = previa ? 'Prévia (não enviada para aprovação)' : (Number(r.REVISAO) === ret.revisao && Via_s_(r.REVISAO_HASH) === ret.hash ? (VIA_SITUACOES[Via_up_(r.SITUACAO)] || r.SITUACAO) : 'Revisão substituída pela revisão ' + Via_s_(r.REVISAO));
  var dur = ret.dias !== null && ret.dias !== undefined ? Via_plural_(ret.dias, 'dia', 'dias') + ' (' + Via_plural_(ret.noites, 'noite', 'noites') + ')' : '—';
  var vinc = (VIA_VINCULOS[c.vinculoTipo] || '—') + (c.vinculoTipo === 'CLIENTE' || ret.clienteNome ? ': ' + (ret.clienteNome || '—') : '') + (c.vinculoRef ? ' · nº ' + c.vinculoRef : '');
  var veic = (VIA_VEICULOS[c.veiculoTipo] || '—') + (ret.veiculoNome ? ': ' + ret.veiculoNome : '');
  var resultado;
  if (previa) resultado = { classe: 'info', rotulo: 'Total pela soma das linhas (prévia)', valor: Via_moeda_(ret.total), texto: 'Ainda não enviada para aprovação: este documento não autoriza carga no cartão.' };
  else if (aprovadaEsta) resultado = { classe: 'ok', rotulo: 'Total aprovado', valor: Via_moeda_(ret.total), texto: 'Aprovado na revisão ' + SGO_DocA4_revisao_(ret.revisao) + ' em ' + Via_br_(r.APROVADO_EM) + '. A carga no cartão Caju não pode passar deste valor sem nova aprovação.' };
  else if (Via_up_(r.SITUACAO) === 'NEGADA' && decisoes.some(function (d) { return Via_up_(d.DECISAO) === 'NEGAR'; })) resultado = { classe: 'nok', rotulo: 'Total pedido', valor: Via_moeda_(ret.total), texto: 'Solicitação negada. Veja a fundamentação na seção 7.' };
  else resultado = { classe: 'info', rotulo: 'Total pedido pela soma das linhas', valor: Via_moeda_(ret.total), texto: situacao + '.' };
  var doc = {
    titulo: 'Solicitação de depósito de viagem', subtitulo: 'Orçamento discriminado da viagem para carga no cartão Caju', tituloCurto: 'Depósito de viagem', rotuloNumero: 'Nº',
    numero: Via_s_(r.NUMERO), revisao: String(ret.revisao), emissao: ret.criadaEm || Via_br_(Via_agora_()),
    ficha: [['Situação', situacao], ['Revisão emitida em', ret.criadaEm ? ret.criadaEm + (ret.criadaPor ? ' por ' + ret.criadaPor : '') : 'ainda não emitida'],
      ['Solicitante', ret.solicitante ? ret.solicitante.nome : Via_s_(r.SOLICITANTE_NOME)], ['Centro de custo', ret.centro ? ret.centro.codigo + ' · ' + ret.centro.nome : '—'],
      ['Vínculo', vinc, { largo: true }], ['Destino', [c.destinoCidade, c.destinoUf].filter(Boolean).join('/')], ['Duração', dur], ['Saída', Via_br_(c.saidaEm)], ['Chegada', Via_br_(c.chegadaEm)],
      ['Responsável pelo dinheiro', ret.responsavelNome || '—'], ['Transporte', veic],
      ['Urgência', ret.urgente ? 'Urgente (' + (ret.diasUteis === 0 ? 'começa hoje ou já começou' : Via_plural_(ret.diasUteis, 'dia útil', 'dias úteis') + ' até a saída') + ')' : 'Dentro da antecedência da política'],
      ['Política conferida', 'Versão ' + (ret.politica ? ret.politica.versao : '—') + (ret.politica ? ' · Diretoria acima de ' + Via_moeda_(ret.politica.limiteDiretoria) : '')]],
    resultado: resultado
  };
  var h = [SGO_DocA4_inicioDocumento_(doc)];
  if (previa) {
    h.push('<p><b>Prévia.</b> Este conteúdo ainda não foi enviado para aprovação' + (Number(r.REVISAO) > 0 || Via_s_(r.REVISAO_HASH) ? ' (ou mudou depois do último envio)' : '') +
      ' e não autoriza carga no cartão. A versão que vale é a da revisão enviada e aprovada.' + (ret.faltas && ret.faltas.length ? ' Para enviar, ainda falta: ' + ret.faltas.length + ' item(ns), listados na tela da solicitação.' : '') + '</p>');
  }
  if (!previa && ret.revisao > 0 && ret.motivo) h.push('<p><b>O que mudou nesta revisão:</b> ' + ViaDoc_esc_(ret.motivo) + '</p>');
  // 1. objetivo
  h.push('<h2>1. Objetivo da viagem</h2>' + ViaDoc_p_(c.objetivo));
  if (c.vinculoTipo === 'INTERNA') h.push('<p><b>Justificativa da viagem interna:</b> ' + ViaDoc_esc_(c.vinculoJustificativa) + '</p>');
  if (c.veiculoTipo === 'PROPRIO') h.push('<p><b>Veículo próprio:</b> ' + ViaDoc_esc_(c.veiculoJustificativa) + '</p>');
  // 2. equipe
  h.push('<h2>2. Equipe</h2>');
  h.push(SGO_DocA4_tabela_([{ t: 'Pessoa' }, { t: 'Função' }, { t: 'Vínculo' }, { t: 'Responsável pelo dinheiro', cls: 'cen' }],
    (ret.equipe || []).map(function (p) { return [p.nome, VIA_FUNCOES[p.funcao] || p.funcao, p.vinculo || '—', p.id === c.responsavelId ? 'Sim' : '']; })));
  // 3. roteiro
  h.push('<h2>3. Roteiro</h2>' + ViaDoc_p_(c.roteiro));
  // 4. orçamento
  h.push('<h2>4. Orçamento discriminado</h2>');
  h.push('<p>O total não é digitado: é a soma das linhas abaixo, cada uma com a base de cálculo. O teto é o da política de viagem na versão conferida. Só hospedagem (diária por quarto) e alimentação (por pessoa por dia) têm teto; sem teto preenchido, a linha não é conferida contra teto.</p>');
  var linhas = (ret.linhas || []).map(function (l) {
    var cat = VIA_CAT[l.categoria] || { nome: l.categoria, tetoRot: '' };
    var desc = Via_s_(l.descricao) + (l.justificativa ? (l.descricao ? '. ' : '') + 'Justificativa: ' + l.justificativa : '') + (l.acimaTeto && l.justificativaTeto ? ' Acima do teto: ' + l.justificativaTeto : '');
    return [cat.nome, desc || '—', l.base || '—', l.teto ? { html: (l.acimaTeto ? '<span class="nok-txt">' : '') + ViaDoc_esc_(Via_moeda_(l.teto) + ' ' + cat.tetoRot) + (l.acimaTeto ? ' (acima)</span>' : '') } : (typeof VIA_TETO_CATS !== 'undefined' && VIA_TETO_CATS.indexOf(l.categoria) < 0 ? 'não tem teto' : 'sem teto'), { t: Via_moeda_(l.valor), cls: 'num' }];
  });
  h.push(SGO_DocA4_tabela_([{ t: 'Categoria' }, { t: 'Descrição' }, { t: 'Base de cálculo' }, { t: 'Teto da política' }, { t: 'Valor', cls: 'num' }], linhas,
    { rodape: [{ html: '<b>Total</b>' }, '', '', '', { html: '<b>' + ViaDoc_esc_(Via_moeda_(ret.total)) + '</b>', cls: 'num' }] }));
  var na = c.naoSeAplica || {}, naL = VIA_CATEGORIAS.filter(function (k) { return na[k.cod]; }).map(function (k) { return [k.nome, na[k.cod]]; });
  if (naL.length) { h.push('<p>Categorias marcadas como "não se aplica", com o motivo:</p>'); h.push(SGO_DocA4_tabela_([{ t: 'Categoria' }, { t: 'Motivo' }], naL)); }
  // 5. conferência
  h.push('<h2>5. Conferência automática</h2>');
  var ap = (ret.apontamentos || []).map(function (a) { return (a.tipo === 'INFO' ? 'Informação: ' : 'Atenção: ') + a.texto; });
  h.push(ap.length ? SGO_DocA4_lista_(ap) : '<p>Nenhum apontamento: dentro da política conferida.</p>');
  if (ret.exigeDiretoria) h.push('<p><b>Aprovação da Diretoria exigida:</b> ' + ViaDoc_esc_((ret.motivosDiretoria || []).join('; ')) + '.</p>');
  // 6. anexos
  h.push('<h2>6. Orçamentos e prints anexados</h2>');
  var linhaCat = {}; (ret.linhas || []).forEach(function (l) { linhaCat[l.id] = (VIA_CAT[l.categoria] || { nome: l.categoria }).nome; });
  var ax = (ret.anexos || []).map(function (a) { return [linhaCat[a.linhaId] || a.categoria, a.nome, a.por, a.em]; });
  h.push(ax.length ? SGO_DocA4_tabela_([{ t: 'Linha' }, { t: 'Arquivo' }, { t: 'Anexado por' }, { t: 'Em' }], ax) : '<p>Nenhum anexo.</p>');
  // 7. aprovações e carga
  h.push('<h2>7. Aprovações e carga no cartão</h2>');
  if (decisoes.length) {
    h.push(SGO_DocA4_tabela_([{ t: 'Etapa' }, { t: 'Decisão' }, { t: 'Por' }, { t: 'Em' }, { t: 'Fundamentação' }],
      decisoes.map(function (d) { return [VIA_ETAPAS[Via_up_(d.ETAPA)] || d.ETAPA, VIA_DECISOES_NOMES[Via_up_(d.DECISAO)] || d.DECISAO, Via_s_(d.POR_NOME), Via_br_(d.EM), Via_s_(d.FUNDAMENTACAO)]; })));
  } else h.push('<p>' + (previa ? 'Sem decisão: a prévia não vai para aprovação.' : 'Aguardando a decisão de quem aprova.') + '</p>');
  var cargasRev = cargas.filter(function (g) { return Number(g.REVISAO) === ret.revisao; });
  if (cargasRev.length) {
    h.push(SGO_DocA4_tabela_([{ t: 'Data da carga' }, { t: 'Valor', cls: 'num' }, { t: 'Centro de custo no Caju' }, { t: 'Registrada por' }, { t: 'Comprovante' }],
      cargasRev.map(function (g) { return [Via_brDia_(g.DATA), { t: Via_moeda_(g.VALOR), cls: 'num' }, Via_s_(g.CENTRO_CUSTO_CAJU), Via_s_(g.POR_NOME) + ' em ' + Via_br_(g.EM), Via_s_(g.COMPROVANTE_NOME)]; })));
  }
  var ass = [{ papel: 'Solicitado por', nome: ret.solicitante ? ret.solicitante.nome : Via_s_(r.SOLICITANTE_NOME), cargo: ret.criadaEm ? 'Enviado em ' + ret.criadaEm : 'Prévia, não enviada' }];
  decisoes.filter(function (d) { return Via_up_(d.DECISAO) === 'APROVAR'; }).forEach(function (d) {
    ass.push({ papel: Via_up_(d.ETAPA) === 'DIRETORIA' ? 'Aprovado pela Diretoria' : 'Aprovado pela gerência', nome: Via_s_(d.POR_NOME), cargo: 'Registrado no SGO+ em ' + Via_br_(d.EM) });
  });
  if (cargasRev.length) ass.push({ papel: 'Carga registrada (Financeiro)', nome: Via_s_(cargasRev[cargasRev.length - 1].POR_NOME), cargo: 'Em ' + Via_br_(cargasRev[cargasRev.length - 1].EM) });
  h.push(SGO_DocA4_assinaturas_(ass));
  // 8. revisões
  var revs = Via_ler_(VIA_ABAS.REVISOES).filter(function (v) { return Via_s_(v.SOLICITACAO_ID) === Via_s_(r.ID); }).sort(function (a, b) { return (Number(a.REVISAO) || 0) - (Number(b.REVISAO) || 0); });
  h.push('<h2>8. Histórico de revisões</h2>');
  h.push(revs.length ? SGO_DocA4_tabela_([{ t: 'Revisão', cls: 'cen' }, { t: 'Emitida em' }, { t: 'Por' }, { t: 'O que mudou' }, { t: 'Total', cls: 'num' }],
    revs.map(function (v) { return [SGO_DocA4_revisao_(v.REVISAO), Via_br_(v.CRIADA_EM), Via_s_(v.CRIADA_POR_NOME), Via_s_(v.MOTIVO), { t: Via_moeda_(v.TOTAL), cls: 'num' }]; })) : '<p>Nenhuma revisão emitida ainda.</p>');
  h.push('<p>Mudar o conteúdo depois do envio gera uma revisão nova, que precisa de nova aprovação; a aprovação vale só para a revisão aprovada. Marca de conferência do conteúdo desta revisão (SHA-256): ' + ViaDoc_esc_(ret.hash) + '. Documento gerado pelo SGO+ em ' + ViaDoc_esc_(Via_br_(Via_agora_())) + '.</p>');
  h.push(SGO_DocA4_fimDocumento_());
  return h.join('');
}
