/** Contas e boletos Omie. Cada escrita exige prévia, token de uso único e trava. */
// 16/11/2026 (especificação do Financeiro, achados B1 a B5): baixa só sem acréscimo até a confirmação no Omie; baixa confere o
// saldo em aberto e a situação; "Editar" não mexe em título com rateio nem pago e envia só o que mudou; categoria de despesa
// para conta a pagar e de receita para conta a receber; recusa clara do Omie volta a pendente ("nada foi feito"); envios
// incertos têm a ação "Conferi no Omie" (OmieOps_apiIncertos / OmieOps_apiResolverIncerto).
var OMIE_OPS_PREFIXO = 'OMIE_OPS_';
// B1: enquanto não for confirmado, na primeira baixa acompanhada, se o Omie soma juros e multa ao "valor" (e tira o desconto) no
// movimento da conta corrente, a baixa pelo SGO+ só aceita juros, multa e desconto iguais a zero. Mudar para true só depois da
// confirmação, junto com a regra fixada na prévia ("Efeito na conta corrente") e as duas dicas da tela.
var OMIE_OPS_BAIXA_ACRESCIMO_CONFIRMADO = false;
var OMIE_OPS_MSG_ACRESCIMO = 'Baixa com juros, multa ou desconto ainda não é feita pelo SGO+: falta confirmar, na primeira operação acompanhada, como o Omie soma esses valores no saldo do banco (sem essa confirmação, o banco no Omie pode receber os juros duas vezes). Nada foi preparado. Registre aqui só o valor sem acréscimo ou desconto, ou faça esta baixa direto no Omie.';
var OMIE_OPS_FECHADAS = /^(PAGO|RECEBIDO|LIQUIDADO|CANCELADO)$/;
function OmieOps_resposta_(fn) {
  try { return Object.assign({ ok: true }, fn()); }
  catch (e) { return { ok: false, mensagem: e.omieOpsPublica ? e.message : 'Não foi possível concluir no Omie. Consulte a situação do título antes de tentar outra operação.' }; }
}
function OmieOps_erro_(texto) { var e = new Error(texto); e.omieOpsPublica = true; throw e; }
function OmieOps_texto_(v, max) { return String(v == null ? '' : v).trim().slice(0, max || 200); }
// 16/11/2026 (M4): o Omie separa as linhas da observação com "|"; a quebra de linha vira " | " e o "|" digitado sai.
function OmieOps_obs_(v) { return OmieOps_texto_(String(v == null ? '' : v).replace(/\|/g, ' ').replace(/\s*[\r\n]+\s*/g, ' | '), 1000); }
function OmieOps_num_(v, nome, zero) {
  var n = Number(v);
  if (!isFinite(n) || n < (zero ? 0 : 0.01) || n > 999999999) OmieOps_erro_('Informe ' + nome + ' válido.');
  return Math.round(n * 100) / 100;
}
function OmieOps_moeda_(n) {
  var v = Math.round((Number(n) || 0) * 100) / 100, neg = v < 0, s = Math.abs(v).toFixed(2).split('.');
  return (neg ? '-' : '') + 'R$ ' + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + s[1];
}
function OmieOps_id_(v) { var n = Number(v); if (!Number.isSafeInteger(n) || n < 1) OmieOps_erro_('Selecione um cadastro válido.'); return n; }
function OmieOps_data_(v) {
  var s = String(v || ''), m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) s = m[3] + '/' + m[2] + '/' + m[1];
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) OmieOps_erro_('Informe uma data válida.');
  var d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  if (d.getFullYear() !== +m[3] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[1]) OmieOps_erro_('Informe uma data válida.');
  return s;
}
function OmieOps_hash_(s) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s)).map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join(''); }
function OmieOps_canonico_(v) {
  if (Array.isArray(v)) return v.map(OmieOps_canonico_);
  if (v && typeof v === 'object') { var out = {}; Object.keys(v).sort().forEach(function (k) { out[k] = OmieOps_canonico_(v[k]); }); return out; }
  return v;
}
function OmieOps_snapshot_(r) { return OmieOps_hash_(JSON.stringify(OmieOps_canonico_(r))); }
function OmieOps_vinculo_(sessao, eu) { return OmieOps_hash_(String(sessao) + '|' + String(eu.userId || eu.usuario || eu.id || '')); }
function OmieOps_empresa_() {
  var chave = String(PropertiesService.getScriptProperties().getProperty('OMIE_APP_KEY') || '').trim();
  if (!chave) OmieOps_erro_('Configure a conexão Omie antes de preparar uma operação.');
  return OmieOps_hash_(chave);
}
function OmieOps_servico_(tipo) { if (tipo !== 'pagar' && tipo !== 'receber') OmieOps_erro_('Selecione contas a pagar ou a receber.'); return 'financas/conta' + tipo + '/'; }
function OmieOps_consultar_(tipo, id) { return Omie_requisitar_(OmieOps_servico_(tipo), tipo === 'pagar' ? 'ConsultarContaPagar' : 'ConsultarContaReceber', { codigo_lancamento_omie: OmieOps_id_(id) }); }
function OmieOps_situacao_(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase(); }
function OmieOps_fechado_(s) { return OMIE_OPS_FECHADAS.test(OmieOps_situacao_(s)); }
function OmieOps_titulo_(r) {
  var sit = OmieOps_texto_(r.status_titulo);
  return { id: Number(r.codigo_lancamento_omie), documento: OmieOps_texto_(r.numero_documento || r.numero_documento_fiscal || r.codigo_lancamento_integracao),
    pessoaId: Number(r.codigo_cliente_fornecedor), categoria: OmieOps_texto_(r.codigo_categoria), contaId: Number(r.id_conta_corrente),
    vencimento: OmieOps_texto_(r.data_vencimento), previsao: OmieOps_texto_(r.data_previsao), emissao: OmieOps_texto_(r.data_emissao),
    valor: Number(r.valor_documento) || 0, observacao: OmieOps_texto_(r.observacao, 1000), situacao: sit,
    fechado: OmieOps_fechado_(sit), rateio: OmieOps_temRateio_(r) };
}
/** B3: título com mais de uma categoria (rateio) ou com distribuição por departamento. */
function OmieOps_temRateio_(r) {
  var c = r && r.categorias, d = r && r.distribuicao;
  return (Array.isArray(c) && c.length > 1) || (Array.isArray(d) && d.length > 0);
}
function OmieOps_apiConsultar(sessionId, payload) {
  return OmieOps_resposta_(function () { Omie_exigirAcesso_(sessionId); var p = payload || {}; return { titulo: OmieOps_titulo_(OmieOps_consultar_(p.tipo, p.id)) }; });
}
function OmieOps_apiListar(sessionId, payload) {
  return OmieOps_resposta_(function () {
    Omie_exigirAcesso_(sessionId); var p = payload || {}, pagina = OmieOps_id_(p.pagina || 1), tipo = p.tipo;
    var r = Omie_requisitar_(OmieOps_servico_(tipo), tipo === 'pagar' ? 'ListarContasPagar' : 'ListarContasReceber', Omie_filtroSituacao_({ pagina: pagina, registros_por_pagina: 50, apenas_importado_api: 'N' }, p.situacao === undefined ? 'ATRASADO' : p.situacao));
    var itens = (r[tipo === 'pagar' ? 'conta_pagar_cadastro' : 'conta_receber_cadastro'] || []).map(OmieOps_titulo_);
    if (typeof Omie_comNomes_ === 'function') Omie_comNomes_(itens, 'pessoaId', 'pessoaNome'); // 15/11/2026: nome do cliente ou fornecedor
    return { itens: itens, pagina: pagina, paginas: Number(r.total_de_paginas) || 0 };
  });
}
/** B4: categoria utilizável para o tipo do título. Na lista e de novo na prévia (ConsultarCategoria), sem confiar só na tela. */
function OmieOps_categoriaUsavel_(c, natureza) {
  if (!c || c.conta_inativa === 'S' || c.inativo === 'S' || c.totalizadora === 'S' || c.transferencia === 'S' || c.nao_exibir === 'S') return false;
  if (natureza === 'pagar') return c.conta_despesa === 'S';
  if (natureza === 'receber') return c.conta_receita === 'S';
  return true;
}
function OmieOps_conferirCategoria_(c, natureza, codigo) {
  if (!c || !OmieOps_texto_(c.descricao)) OmieOps_erro_('Não foi possível conferir a categoria ' + codigo + ' no Omie. Atualize a lista de categorias e escolha de novo.');
  if (c.conta_inativa === 'S' || c.inativo === 'S') OmieOps_erro_('A categoria "' + OmieOps_texto_(c.descricao) + '" está inativa no Omie. Nada foi preparado; escolha uma categoria ativa (a contabilidade desativou esta).');
  if (c.totalizadora === 'S' || c.transferencia === 'S') OmieOps_erro_('A categoria "' + OmieOps_texto_(c.descricao) + '" é um grupo ou de transferência entre contas e não recebe título. Nada foi preparado; escolha uma categoria de lançamento.');
  if (natureza === 'pagar' && c.conta_despesa !== 'S') OmieOps_erro_('A categoria "' + OmieOps_texto_(c.descricao) + '" não é de despesa. Conta a pagar só entra em categoria de despesa (senão o resultado do mês fica invertido). Nada foi preparado; escolha outra categoria.');
  if (natureza === 'receber' && c.conta_receita !== 'S') OmieOps_erro_('A categoria "' + OmieOps_texto_(c.descricao) + '" não é de receita. Conta a receber só entra em categoria de receita. Nada foi preparado; escolha outra categoria.');
}
/** Apoios paginados: valores e rótulos explícitos; sem devolver objetos do provedor. */
function OmieOps_apiApoios(sessionId, payload) {
  return OmieOps_resposta_(function () {
    Omie_exigirAcesso_(sessionId); var p = payload || {}, pagina = OmieOps_id_(p.pagina || 1);
    var mapa = { pessoas: ['geral/clientes/', 'ListarClientes', 'clientes_cadastro'], categorias: ['geral/categorias/', 'ListarCategorias', 'categoria_cadastro'], contas: ['geral/contacorrente/', 'ListarContasCorrentes', 'ListarContasCorrentes'] }, a = mapa[p.tipo];
    if (!a) OmieOps_erro_('Cadastro de apoio inválido.');
    var natureza = p.natureza === 'pagar' || p.natureza === 'receber' ? p.natureza : '';
    var r = Omie_requisitar_(a[0], a[1], { pagina: pagina, registros_por_pagina: 100, apenas_importado_api: 'N' });
    var itens = r[a[2]] || r.conta_corrente_cadastro || [];
    return { pagina: pagina, paginas: Number(r.total_de_paginas) || 0, itens: itens.filter(function (i) {
      if (p.tipo === 'categorias') return OmieOps_categoriaUsavel_(i, natureza);
      return i.inativo !== 'S';
    }).map(function (i) {
      return { id: String(p.tipo === 'pessoas' ? i.codigo_cliente_omie : p.tipo === 'contas' ? i.nCodCC : i.codigo), nome: OmieOps_texto_(i.razao_social || i.nome_fantasia || i.descricao || i.nome, 160) };
    }) };
  });
}
function OmieOps_apiBoleto(sessionId, payload) {
  return OmieOps_resposta_(function () {
    Omie_exigirAcesso_(sessionId); var r = Omie_requisitar_('financas/contareceberboleto/', 'ObterBoleto', { nCodTitulo: OmieOps_id_((payload || {}).id) });
    var url = String(r.cLinkBoleto || '');
    return { url: /^https:\/\/[^\s<>"']+$/i.test(url) ? url : '', linhaDigitavel: OmieOps_texto_(r.cCodBarras, 150) };
  });
}
/**
 * B2: saldo em aberto do título pelo Omie (ListarMovimentos, resumo.nValAberto, o mesmo dado da Ficha do cliente). Sem o saldo,
 * a baixa não é preparada. O filtro nCodTitulo do ListarMovimentos está "a confirmar" no Omie real: se o Omie o ignorar, o título
 * é procurado na resposta; não achou = recusa (nunca baixa às cegas).
 */
function OmieOps_saldo_(tipo, id) {
  var ler = function () { return Omie_requisitar_('financas/mf/', 'ListarMovimentos', { nPagina: 1, nRegPorPagina: 100, cTpLancamento: tipo === 'pagar' ? 'CP' : 'CR', nCodTitulo: id }); };
  var r = typeof Omie_semCache_ === 'function' ? Omie_semCache_(ler) : ler();
  var m = (r && r.movimentos || []).filter(function (x) { return x && x.detalhes && Number(x.detalhes.nCodTitulo) === Number(id); })[0];
  var aberto = m && m.resumo ? Number(m.resumo.nValAberto) : NaN;
  if (!isFinite(aberto) || aberto < 0) OmieOps_erro_('Não foi possível ler no Omie o saldo em aberto deste título. Sem o saldo, a baixa não é preparada (para não baixar a mais). Nada foi feito; tente de novo em 1 minuto ou registre a baixa direto no Omie.');
  return Math.round(aberto * 100) / 100;
}
function OmieOps_preparar_(p) {
  var acao = String(p.acao || ''), tipo = String(p.tipo || ''), d = p.dados || {}, param, anterior = null, snapshot = '', caminho = OmieOps_servico_(tipo), call, resumo = [], original = null;
  if (['criar', 'editar', 'baixar', 'gerarBoleto', 'prorrogarBoleto'].indexOf(acao) < 0) OmieOps_erro_('Operação inválida.');
  if (acao !== 'criar') {
    original = typeof Omie_semCache_ === 'function' ? Omie_semCache_(function () { return OmieOps_consultar_(tipo, p.id); }) : OmieOps_consultar_(tipo, p.id);
    var consultaEm = Date.now(); // 15/11/2026: a confirmação só relê o título 1 minuto depois (regra do Omie)
    anterior = OmieOps_titulo_(original); snapshot = OmieOps_snapshot_(original);
    if (!anterior.id) OmieOps_erro_('O título não foi encontrado no Omie.');
    resumo.push(['Título', anterior.documento || String(anterior.id)], ['Valor original', OmieOps_moeda_(anterior.valor)], ['Situação atual', anterior.situacao || 'Não informada']);
    if ((acao === 'editar' || acao === 'baixar') && anterior.fechado) OmieOps_erro_('Este título está "' + anterior.situacao + '" no Omie. Título pago, recebido, liquidado ou cancelado não é ' + (acao === 'editar' ? 'alterado' : 'baixado de novo') + ' pelo SGO+ (risco de baixa em dobro). Nada foi preparado; se precisa corrigir, confira no Omie.');
  }
  if (acao === 'criar' || acao === 'editar') {
    var novo = { codigo_cliente_fornecedor: OmieOps_id_(d.pessoaId), codigo_categoria: OmieOps_texto_(d.categoria, 20), id_conta_corrente: OmieOps_id_(d.contaId), data_vencimento: OmieOps_data_(d.vencimento), data_previsao: OmieOps_data_(d.previsao || d.vencimento), valor_documento: OmieOps_num_(d.valor, 'um valor'), numero_documento: OmieOps_texto_(d.documento, 20), observacao: OmieOps_obs_(d.observacao) };
    if (!novo.codigo_categoria || !novo.numero_documento) OmieOps_erro_('Selecione a categoria e informe o documento.');
    if (d.emissao) novo.data_emissao = OmieOps_data_(d.emissao);
    var rotulo = { codigo_cliente_fornecedor: 'Cliente ou fornecedor', codigo_categoria: 'Categoria', id_conta_corrente: 'Conta corrente', data_vencimento: 'Vencimento', data_previsao: 'Previsão', valor_documento: 'Valor do documento', numero_documento: 'Documento', observacao: 'Observação', data_emissao: 'Emissão' };
    var texto = function (k) { return k === 'codigo_cliente_fornecedor' ? OmieOps_texto_(d.pessoaNome || d.pessoaId) : k === 'codigo_categoria' ? OmieOps_texto_(d.categoriaNome || d.categoria) : k === 'id_conta_corrente' ? OmieOps_texto_(d.contaNome || d.contaId) : k === 'valor_documento' ? OmieOps_moeda_(novo[k]) : String(novo[k]); };
    if (acao === 'criar') {
      param = novo; param.codigo_lancamento_integracao = OmieOps_texto_(d.referencia, 60);
      if (!param.codigo_lancamento_integracao) OmieOps_erro_('Informe uma referência única para este lançamento.');
      resumo.push(['Documento', param.numero_documento], ['Cliente ou fornecedor', texto('codigo_cliente_fornecedor')], ['Categoria', texto('codigo_categoria')], ['Conta corrente', texto('id_conta_corrente')], ['Vencimento', param.data_vencimento], ['Previsão', param.data_previsao], ['Valor do documento', OmieOps_moeda_(param.valor_documento)], ['Observação', param.observacao]);
    } else {
      // B3: título com rateio de categorias ou departamentos não é alterado pelo SGO+ (a categoria única desfaria o rateio).
      if (anterior.rateio) OmieOps_erro_('Este título tem rateio de categorias ou de departamentos no Omie. Para não desfazer o rateio, ele não é alterado pelo SGO+. Nada foi preparado; altere direto no Omie.');
      // Só o que a pessoa mudou vai para o Omie (nunca o formulário inteiro por cima do cadastro).
      var antes = { codigo_cliente_fornecedor: anterior.pessoaId, codigo_categoria: anterior.categoria, id_conta_corrente: anterior.contaId, data_vencimento: anterior.vencimento, data_previsao: anterior.previsao || anterior.vencimento, valor_documento: Math.round(anterior.valor * 100) / 100, numero_documento: OmieOps_texto_(original.numero_documento, 20), observacao: OmieOps_obs_(anterior.observacao), data_emissao: anterior.emissao };
      param = { codigo_lancamento_omie: anterior.id }; var mudou = [];
      Object.keys(novo).forEach(function (k) { if (String(novo[k]) !== String(antes[k] == null ? '' : antes[k])) { param[k] = novo[k]; mudou.push(k); } });
      if (!mudou.length) OmieOps_erro_('Nenhum campo foi alterado em relação ao título no Omie. Nada foi preparado.');
      mudou.forEach(function (k) { resumo.push([rotulo[k], texto(k)]); });
      resumo.push(['Campos alterados', mudou.map(function (k) { return rotulo[k]; }).join(', ') + '. Os demais ficam como estão no Omie.']);
    }
    call = (acao === 'criar' ? 'IncluirConta' : 'AlterarConta') + (tipo === 'pagar' ? 'Pagar' : 'Receber');
  } else if (acao === 'baixar') {
    param = { codigo_lancamento: anterior.id, codigo_conta_corrente: OmieOps_id_(d.contaId), valor: OmieOps_num_(d.valor, 'um valor de baixa'), data: OmieOps_data_(d.data), desconto: OmieOps_num_(d.desconto || 0, 'um desconto', true), juros: OmieOps_num_(d.juros || 0, 'juros', true), multa: OmieOps_num_(d.multa || 0, 'uma multa', true), observacao: OmieOps_obs_(d.observacao) };
    if (!OMIE_OPS_BAIXA_ACRESCIMO_CONFIRMADO && (param.desconto || param.juros || param.multa)) OmieOps_erro_(OMIE_OPS_MSG_ACRESCIMO);
    var saldo = OmieOps_saldo_(tipo, anterior.id);
    if (saldo <= 0) OmieOps_erro_('Este título não tem saldo em aberto no Omie (já foi pago ou recebido por inteiro). Nada foi preparado.');
    if (param.valor + param.desconto > saldo + 0.01) OmieOps_erro_('A baixa de ' + OmieOps_moeda_(param.valor) + ' passa do saldo em aberto do título, que é ' + OmieOps_moeda_(saldo) + '. Nada foi preparado; confira o valor no extrato. Se o cliente pagou a mais, registre só o saldo e trate a diferença no Omie.');
    var depois = Math.round((saldo - param.valor - param.desconto) * 100) / 100;
    call = tipo === 'pagar' ? 'LancarPagamento' : 'LancarRecebimento';
    resumo.push(['Conta da baixa', OmieOps_texto_(d.contaNome || d.contaId)], ['Data da baixa', param.data],
      ['Saldo em aberto', 'Saldo antes: ' + OmieOps_moeda_(saldo) + ' · Esta baixa: ' + OmieOps_moeda_(param.valor) + ' · Saldo depois: ' + OmieOps_moeda_(depois) + (depois > 0.009 ? ' (baixa parcial)' : ' (quitado)')],
      ['Efeito na conta corrente', OmieOps_moeda_(param.valor) + (tipo === 'pagar' ? ' saem' : ' entram') + ' na conta escolhida (sem juros, multa ou desconto).'],
      ['Observação', param.observacao], ['Efeito', 'Registra a baixa financeira no Omie; não efetua transferência bancária.']);
  } else {
    if (tipo !== 'receber') OmieOps_erro_('Boletos estão disponíveis apenas para contas a receber.');
    caminho = 'financas/contareceberboleto/'; param = { nCodTitulo: anterior.id };
    call = acao === 'gerarBoleto' ? 'GerarBoleto' : 'ProrrogarBoleto';
    if (acao === 'prorrogarBoleto') { param.dDtVenc = OmieOps_data_(d.vencimento); resumo.push(['Novo vencimento', param.dDtVenc]); }
    resumo.push(['Tarifas', 'O banco pode cobrar tarifas de emissão ou alteração do boleto.']);
  }
  return { acao: acao, tipo: tipo, caminho: caminho, call: call, param: param, resumo: resumo, anterior: anterior, snapshot: snapshot, consultaEm: typeof consultaEm === 'number' ? consultaEm : 0 };
}
function OmieOps_rotulos_(op) {
  var d = op.param, nomes = {};
  if (d.codigo_cliente_fornecedor) {
    var pessoa = Omie_requisitar_('geral/clientes/', 'ConsultarCliente', { codigo_cliente_omie: d.codigo_cliente_fornecedor });
    nomes['Cliente ou fornecedor'] = OmieOps_texto_(pessoa.razao_social || pessoa.nome_fantasia);
  }
  if (d.codigo_categoria) {
    var categoria = Omie_requisitar_('geral/categorias/', 'ConsultarCategoria', { codigo: d.codigo_categoria });
    OmieOps_conferirCategoria_(categoria, op.tipo, d.codigo_categoria); // B4: de novo no servidor, não só na lista da tela
    nomes.Categoria = OmieOps_texto_(categoria.descricao);
  }
  if (d.id_conta_corrente || d.codigo_conta_corrente) {
    var conta = Omie_requisitar_('geral/contacorrente/', 'ConsultarContaCorrente', { nCodCC: d.id_conta_corrente || d.codigo_conta_corrente });
    nomes['Conta corrente'] = nomes['Conta da baixa'] = OmieOps_texto_(conta.descricao);
  }
  op.resumo.forEach(function (linha) { if (Object.prototype.hasOwnProperty.call(nomes, linha[0])) { if (!nomes[linha[0]]) OmieOps_erro_('Não foi possível conferir o cadastro selecionado. Atualize a lista.'); linha[1] = nomes[linha[0]]; } });
}
function OmieOps_codigo_(acao) { return acao === 'gerarBoleto' || acao === 'prorrogarBoleto' ? 'FIN_OMIE_COBRAR' : 'FIN_OMIE_LANCAR'; }
function OmieOps_apiPrevia(sessionId, payload) {
  return OmieOps_resposta_(function () {
    var eu = Omie_exigirAcesso_(sessionId, OmieOps_codigo_(String((payload || {}).acao || '')), 'preparar a operação'), empresa = OmieOps_empresa_(), op = OmieOps_preparar_(payload || {}), vinculo = OmieOps_vinculo_(sessionId, eu), token = Utilities.getUuid();
    OmieOps_rotulos_(op);
    if (empresa !== OmieOps_empresa_()) OmieOps_erro_('A conexão Omie mudou durante a conferência. Abra uma nova prévia.');
    var p = PropertiesService.getScriptProperties(), agora = Date.now();
    // 16/11/2026 (Regras do Financeiro): alçadas de segunda confirmação e de aprovação por outra pessoa (SGO_Omie_Regras.js).
    // Valem para baixa (a pagar e a receber) e para lançamento ou alteração de conta a pagar.
    var valorAlcada = op.acao === 'baixar' ? op.param.valor : ((op.acao === 'criar' || op.acao === 'editar') && op.tipo === 'pagar' ? (op.param.valor_documento || (op.anterior && op.anterior.valor) || 0) : 0);
    if (valorAlcada && typeof OmieRegras_alcada_ === 'function') op.alcada = OmieRegras_alcada_(valorAlcada, eu, op.resumo);
    // O índice dura 24 horas e impede uma nova prévia idêntica após envio incerto.
    var hash = OmieOps_hash_(JSON.stringify([empresa, op.acao, op.tipo, op.param]));
    op.vinculo = vinculo; op.empresa = empresa; op.expira = typeof OmieRegras_expira_ === 'function' ? OmieRegras_expira_(op, agora) : agora + 10 * 60000; op.estado = 'pendente'; op.hash = hash;
    var lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      var estado = p.getProperty(OMIE_OPS_PREFIXO + 'ENVIO_' + hash), registro = estado ? JSON.parse(estado) : null;
      if (registro && registro.em > agora - 24 * 3600000) OmieOps_erro_('Esta operação já foi enviada ou está com resultado pendente de conferência. Consulte o título no Omie antes de repetir; se o envio ficou incerto, use "Envios a conferir" nesta aba.');
      // Retira apenas registros deste módulo expirados. Nunca lê propriedades de credenciais. Envio incerto fica até ser conferido.
      var todas = p.getKeys ? p.getKeys() : [];
      todas.filter(function (k) { return k.indexOf(OMIE_OPS_PREFIXO) === 0; }).forEach(function (k) { try { var j = JSON.parse(p.getProperty(k)); if (j.estado === 'incerta') return; if ((j.expira && j.expira < agora - 24 * 3600000) || (j.em && j.em < agora - 24 * 3600000)) p.deleteProperty(k); } catch (_) {} });
      p.setProperty(OMIE_OPS_PREFIXO + token, JSON.stringify(op));
    } finally { lock.releaseLock(); }
    return { token: token, resumo: op.resumo, acao: op.acao, tipo: op.tipo, expiraEm: typeof OmieRegras_expiraTexto_ === 'function' ? OmieRegras_expiraTexto_(op) : '10 minutos', alcada: typeof OmieRegras_alcadaTela_ === 'function' ? OmieRegras_alcadaTela_(op) : null };
  });
}
function OmieOps_apiConfirmar(sessionId, payload) {
  return OmieOps_resposta_(function () {
    var eu = Omie_exigirAcesso_(sessionId), token = OmieOps_texto_((payload || {}).token, 80);
    if (!/^[a-zA-Z0-9-]{10,80}$/.test(token)) OmieOps_erro_('A prévia não é válida. Abra uma nova prévia.');
    var lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      var p = PropertiesService.getScriptProperties(), raw = p.getProperty(OMIE_OPS_PREFIXO + token), op = raw ? JSON.parse(raw) : null;
      if (!op || op.vinculo !== OmieOps_vinculo_(sessionId, eu)) OmieOps_erro_('Esta prévia não pertence à sua sessão. Abra uma nova prévia.');
      if (op.empresa !== OmieOps_empresa_()) OmieOps_erro_('A conexão Omie mudou desde a prévia. Confira a empresa e abra uma nova prévia.');
      Omie_exigirAcesso_(sessionId, OmieOps_codigo_(op.acao), 'confirmar a operação');
      if (op.estado === 'concluida') return { mensagem: 'Operação já confirmada. Consulte o título atualizado.', jaConfirmada: true };
      Omie_exigirGravacao_(); // 14/11/2026: gravação no Omie desligada até a primeira operação acompanhada (a prévia continua valendo)
      if (op.estado !== 'pendente') OmieOps_erro_('O envio anterior precisa ser conferido no Omie. Não reenviamos a operação.');
      if (op.expira < Date.now()) OmieOps_erro_('A prévia expirou. Abra uma nova prévia.');
      if (typeof OmieRegras_conferirAlcada_ === 'function') OmieRegras_conferirAlcada_(op, payload || {}); // 16/11/2026: alçadas
      // Outra prévia igual pode ter sido aberta em outra aba antes do primeiro envio.
      var envio = p.getProperty(OMIE_OPS_PREFIXO + 'ENVIO_' + op.hash);
      if (envio && JSON.parse(envio).em > Date.now() - 24 * 3600000) OmieOps_erro_('Esta operação já foi enviada. Confira o título no Omie.');
      if (op.anterior && typeof Omie_faltaReconsulta_ === 'function') { var faltam = Omie_faltaReconsulta_(op.consultaEm); if (faltam > 0) OmieOps_erro_(Omie_msgReconsulta_(faltam)); }
      if (op.anterior) {
        // Consulta nova e sem cache: qualquer alteração externa exige outra prévia.
        // Se o Omie limitar a consulta repetida, a escrita permanece bloqueada.
        var atual = Omie_semCache_(function () { return OmieOps_consultar_(op.tipo, op.anterior.id); });
        if (OmieOps_snapshot_(atual) !== op.snapshot) OmieOps_erro_('O título mudou no Omie desde a prévia. Atualize os dados e confira uma nova prévia antes de confirmar.');
        op.consultaEm = Date.now(); // 15/11/2026: a próxima releitura (nova confirmação após "ocupado") espera 1 minuto desta
      }
      if (op.empresa !== OmieOps_empresa_()) OmieOps_erro_('A conexão Omie mudou durante a conferência. Abra uma nova prévia.');
      op.estado = 'enviando'; op.enviadoEm = Date.now(); op.quem = String(eu.usuario || eu.userId || ''); p.setProperty(OMIE_OPS_PREFIXO + token, JSON.stringify(op));
      p.setProperty(OMIE_OPS_PREFIXO + 'ENVIO_' + op.hash, JSON.stringify({ em: Date.now() }));
      if (op.acao === 'baixar') op.param.codigo_baixa_integracao = 'SGO' + token.replace(/-/g, '').slice(0, 17);
      try {
        var r = Omie_requisitar_(op.caminho, op.call, op.param);
        var status = r.codigo_status !== undefined ? r.codigo_status : r.cCodStatus;
        if (status !== undefined && !/^0+$/.test(String(status))) throw new Error('Provedor recusou.');
        op.estado = 'concluida'; p.setProperty(OMIE_OPS_PREFIXO + token, JSON.stringify(op));
        try { if (typeof SGO_DATA !== 'undefined') SGO_DATA.log('OMIE_OPERACAO', String(eu.usuario || eu.userId || ''), op.acao + ' · ' + op.tipo + ' · título ' + String(op.param.codigo_lancamento_omie || op.param.codigo_lancamento || op.param.nCodTitulo || ''), 'FINANCEIRO'); } catch (_) {}
        // 15/11/2026: conta a receber de pedido aprovado (referência SGO-...): registra o vínculo para a aba Pedidos aprovados
        if (op.acao === 'criar' && op.tipo === 'receber' && typeof OmiePed_registrar_ === 'function') { try { OmiePed_registrar_(op.param, r, eu); } catch (_) {} }
        return { mensagem: 'Operação confirmada no Omie. Atualize a consulta para conferir.', id: Number(r.codigo_lancamento_omie || r.nCodTitulo) || 0 };
      } catch (_) {
        if (_ && (_.omieNaoExecutado || _.omieRecusado)) {
          // 14/11/2026: o Omie recusou sem executar (método ocupado ou limite): volta a pendente e libera o mesmo envio.
          // 16/11/2026 (B5): recusa com motivo (validação do Omie) também é "nada feito": libera corrigir e enviar de novo.
          op.estado = 'pendente'; delete op.enviadoEm; p.setProperty(OMIE_OPS_PREFIXO + token, JSON.stringify(op)); p.deleteProperty(OMIE_OPS_PREFIXO + 'ENVIO_' + op.hash);
          if (_.omieRecusado) {
            try { if (typeof SGO_DATA !== 'undefined') SGO_DATA.log('OMIE_OPERACAO_RECUSADA', String(eu.usuario || eu.userId || ''), op.acao + ' · ' + op.tipo + ' · recusada pelo Omie, nada feito.', 'FINANCEIRO'); } catch (e2) {}
            OmieOps_erro_(_.message + '. Nada foi feito no Omie. Corrija o que o Omie apontou (toque em "Revisar campos") e confira uma nova prévia.');
          }
          OmieOps_erro_(_.message + ' A prévia continua valendo: toque em Confirmar no Omie de novo.');
        }
        op.estado = 'incerta'; p.setProperty(OMIE_OPS_PREFIXO + token, JSON.stringify(op));
        try { if (typeof SGO_DATA !== 'undefined') SGO_DATA.log('OMIE_OPERACAO_INCERTA', String(eu.usuario || eu.userId || ''), op.acao + ' · ' + op.tipo + ' · conferir o resultado no Omie antes de repetir.', 'FINANCEIRO'); } catch (_) {}
        OmieOps_erro_('O envio não foi confirmado. Consulte o título no Omie antes de repetir; a operação pode ter sido processada. Nenhum reenvio automático será feito. Depois de conferir no Omie, registre o resultado em "Envios a conferir".');
      }
    } finally { lock.releaseLock(); }
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// B5: envios com resultado incerto (sem resposta do Omie). Ficam travados até alguém conferir no Omie e registrar o desfecho:
// "não foi feito" libera o mesmo envio; "foi feito" conclui. Caixa FIN_OMIE_LANCAR, motivo obrigatório, no registro de acessos.
var OMIE_OPS_NOMES_ACAO = { criar: 'Novo lançamento', editar: 'Alteração de título', baixar: 'Baixa', gerarBoleto: 'Geração de boleto', prorrogarBoleto: 'Prorrogação de boleto' };
function OmieOps_dataBr_(ms) {
  var d = new Date(Number(ms) || 0); if (!(Number(ms) > 0) || isNaN(d.getTime())) return 'data não registrada';
  try { return Utilities.formatDate(d, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'); } catch (e) { return d.toISOString().slice(0, 16).replace('T', ' '); }
}
function OmieOps_incertos_() {
  var p = PropertiesService.getScriptProperties(), lista = [];
  (p.getKeys ? p.getKeys() : []).forEach(function (k) {
    var j = null; try { j = JSON.parse(p.getProperty(k)); } catch (e) { return; }
    if (!j) return;
    if (k.indexOf(OMIE_OPS_PREFIXO) === 0 && k.indexOf(OMIE_OPS_PREFIXO + 'ENVIO_') !== 0 && j.estado === 'incerta') {
      lista.push({ chave: k, origem: 'Lançamentos e baixas', descricao: (OMIE_OPS_NOMES_ACAO[j.acao] || 'Operação') + ' · ' + (j.tipo === 'pagar' ? 'a pagar' : 'a receber') +
        (j.anterior ? ' · título ' + OmieOps_texto_(j.anterior.documento || j.anterior.id, 60) : j.param && j.param.numero_documento ? ' · documento ' + OmieOps_texto_(j.param.numero_documento, 40) : ''),
        em: OmieOps_dataBr_(j.enviadoEm || (j.expira ? j.expira - 10 * 60000 : 0)), quem: OmieOps_texto_(j.quem, 60), ms: Number(j.enviadoEm || j.expira || 0) });
    } else if (k.indexOf('OMIEFAT_OP_') === 0 && j.estado === 'enviado') {
      var ms = Date.parse(j.data || '') || 0;
      lista.push({ chave: k, origem: 'Faturamento e notas', descricao: OmieOps_texto_(j.descricao, 120) || 'Faturamento ou importação de NF-e (registro antigo, sem identificação: confira os envios do dia no Omie)', em: OmieOps_dataBr_(ms), quem: OmieOps_texto_(j.quem, 60), ms: ms });
    }
  });
  return lista.sort(function (a, b) { return b.ms - a.ms; }).map(function (x) { delete x.ms; return x; });
}
function OmieOps_apiIncertos(sessionId) {
  return OmieOps_resposta_(function () { Omie_exigirAcesso_(sessionId, 'FIN_OMIE_LANCAR', 'ver os envios a conferir'); return { itens: OmieOps_incertos_() }; });
}
function OmieOps_apiResolverIncerto(sessionId, payload) {
  return OmieOps_resposta_(function () {
    var eu = Omie_exigirAcesso_(sessionId, 'FIN_OMIE_LANCAR', 'registrar a conferência do envio'), d = payload || {};
    var chave = OmieOps_texto_(d.chave, 120), desfecho = String(d.desfecho || ''), motivo = OmieOps_texto_(d.motivo, 300);
    if (desfecho !== 'nao_feito' && desfecho !== 'feito') OmieOps_erro_('Escolha o que você conferiu no Omie: "não foi feito" ou "foi feito".');
    if (motivo.length < 10) OmieOps_erro_('Escreva o que você conferiu no Omie (pelo menos 10 letras), por exemplo: "título não aparece em Contas a receber". Nada foi alterado.');
    if (!/^(OMIE_OPS_[A-Za-z0-9-]{10,80}|OMIEFAT_OP_[0-9a-f]{64})$/.test(chave) || chave.indexOf(OMIE_OPS_PREFIXO + 'ENVIO_') === 0) OmieOps_erro_('Envio não encontrado. Atualize a lista.');
    var lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      var p = PropertiesService.getScriptProperties(), raw = p.getProperty(chave), j = raw ? JSON.parse(raw) : null, descricao = '';
      var item = OmieOps_incertos_().filter(function (x) { return x.chave === chave; })[0];
      if (!j || !item) OmieOps_erro_('Este envio já foi conferido ou não existe mais. Atualize a lista.');
      descricao = item.descricao;
      if (chave.indexOf('OMIEFAT_OP_') === 0) {
        if (desfecho === 'nao_feito') p.deleteProperty(chave);
        else { j.estado = 'concluido'; j.conferidoEm = new Date().toISOString(); p.setProperty(chave, JSON.stringify(j)); }
      } else {
        if (desfecho === 'nao_feito') { j.estado = 'descartada'; if (j.hash) p.deleteProperty(OMIE_OPS_PREFIXO + 'ENVIO_' + j.hash); }
        else j.estado = 'concluida';
        j.conferidoEm = Date.now(); p.setProperty(chave, JSON.stringify(j));
      }
      var texto = (desfecho === 'feito' ? 'Conferido no Omie: foi feito' : 'Conferido no Omie: não foi feito (envio liberado)') + ' · ' + descricao + ' · ' + motivo;
      if (typeof Omie_registrarAcesso_ === 'function') Omie_registrarAcesso_(eu, 'INCERTO_CONFERIDO', 'OmieOps_apiResolverIncerto', texto);
      try { if (typeof SGO_DATA !== 'undefined') SGO_DATA.log('OMIE_INCERTO_CONFERIDO', String(eu.usuario || eu.userId || ''), texto.slice(0, 300), 'FINANCEIRO'); } catch (_) {}
      return { mensagem: desfecho === 'feito' ? 'Registrado: o envio foi feito no Omie. Ele não será repetido.' : 'Registrado: o envio não foi feito no Omie. Abra uma nova prévia para enviar de novo.', itens: OmieOps_incertos_() };
    } finally { lock.releaseLock(); }
  });
}
