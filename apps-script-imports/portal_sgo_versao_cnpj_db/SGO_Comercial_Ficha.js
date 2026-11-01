/****************************************************
 * COMERCIAL C2 — FICHA DE CUSTO DO SERVIÇO E IMPORTAÇÃO DA TABELA DE PREÇOS C1 (01/11/2026)
 *
 * Estudo: docs/COMERCIAL_C1_PRECIFICACAO_20261101.md (seção 4, a fórmula) e a tabela em SGO_Comercial_TabelaC1.js (gerada de
 * docs/COMERCIAL_C1_TABELA_SERVICOS.json por _tools/gerar_tabela_c1.cjs).
 *
 * Ficha de custo (colunas novas de COM_PRODUTOS): horas do técnico, horas do engenheiro, padrões (rateio) e consumíveis/ART.
 *   mão de obra = horas do técnico x custo da hora do técnico + horas do engenheiro x custo da hora do engenheiro
 *   custo       = mão de obra x (1 + custo fixo) + padrões + consumíveis
 *   preço pela conta = custo / (1 - impostos - comissão - margem alvo)   (arredondado para cima: R$ 5 abaixo de R$ 100, R$ 10 acima)
 *   preço mínimo     = custo / (1 - impostos - comissão - margem mínima)
 *   preço sugerido   = o pela conta; quando a mediana do mercado público E a mediana do histórico da Metrolabs (CRM 2025-26)
 *                      ficam as duas acima dela, sobe até o menor dos dois. Exceções da C1: ultracongelador com piso de 120% do
 *                      freezer; hora técnica avulsa no valor da política (R$ 190).
 * Os números vêm da política em vigor (Metodologia > Preço e desconto): mudou um parâmetro, o custo e o preço sugerido mudam na
 * hora. O PREÇO DE VENDA (PRECO) não muda sozinho: a gestão confirma ("Usar o preço sugerido"), com o motivo e o histórico.
 * O custo dos itens com ficha, nas propostas novas, é o custo calculado da ficha (ComF_custoProduto_).
 *
 * Importação ("Importar tabela de preços C1", gestão): prévia antes; idempotente pela chave TABELA_CODIGO ("C1:<código>"):
 * rodar de novo não duplica. Item que já existe com o mesmo código ou o mesmo nome aparece lado a lado: a gestão escolhe
 * "preencher só o que está vazio" (nunca troca preço, nome ou descrição já gravados) ou "deixar como está".
 ****************************************************/

// revisão da C2: "Criar um item novo" para quando o casamento pelo nome juntou serviços que são diferentes (o existente fica como está)
var COM_F_ESCOLHAS = { PREENCHER: 'Preencher só o que está vazio', IGNORAR: 'Deixar como está (não importa este serviço)', CRIAR: 'Criar um item novo (o existente fica como está)' };

function ComF_n_(v) { var n = ComPr_num_(v); return n === null ? null : n; }
function ComF_temFicha_(p) { return !!p && (Com_s_(p.HORAS_TECNICO) !== '' || Com_s_(p.HORAS_ENGENHEIRO) !== '' || Com_s_(p.TABELA_CODIGO) !== ''); }
function ComF_referencia_(p) { return Com_json_(p && p.REFERENCIA_JSON, null) || {}; }
function ComF_tabelaC1_(codigo) {
  if (typeof COM_TABELA_C1 === 'undefined' || !COM_TABELA_C1) return null;
  var c = Com_up_(codigo).replace(/^C1:/, '');
  return COM_TABELA_C1.servicos.filter(function (s) { return s.codigo === c; })[0] || null;
}

/**
 * Conta da ficha. f: { horasTecnico, horasEngenheiro, padroes, consumiveis, regra, historico, mercado }. Sem Date cru.
 * { maoObraTecnico, maoObraEngenheiro, maoObra, custoFixo, custo, precoConta, precoMinimo, precoSugerido, precoUrgente, fonte, fonteTxt }
 */
function ComF_calcular_(f, pol, ctx) {
  pol = pol || ComPr_politica_();
  ctx = ctx || {};
  var hT = Number(f.horasTecnico) || 0, hE = Number(f.horasEngenheiro) || 0;
  var r = { horasTecnico: hT, horasEngenheiro: hE, padroes: Com_r2_(Number(f.padroes) || 0), consumiveis: Com_r2_(Number(f.consumiveis) || 0) };
  r.maoObraTecnico = Com_r2_(hT * (Number(pol.custoHora.TECNICO) || 0));
  r.maoObraEngenheiro = Com_r2_(hE * (Number(pol.custoHora.ENGENHEIRO) || 0));
  r.maoObra = Com_r2_(r.maoObraTecnico + r.maoObraEngenheiro);
  r.custoFixo = Com_r2_(r.maoObra * (Number(pol.custoFixoPct) || 0) / 100);
  r.custo = Com_r2_(r.maoObra + r.custoFixo + r.padroes + r.consumiveis);
  var base = 1 - (Number(pol.impostosPct) || 0) / 100 - (Number(pol.comissaoPct) || 0) / 100;
  var dAlvo = base - (Number(pol.margemAlvoPct) || 0) / 100, dMin = base - (Number(pol.margemMinPct) || 0) / 100;
  r.divisorAlvo = Math.round(dAlvo * 10000) / 10000; r.divisorMinimo = Math.round(dMin * 10000) / 10000;
  r.precoConta = dAlvo > 0.05 ? ComPr_arredondarTabela_(r.custo / dAlvo) : null;
  r.precoMinimo = dMin > 0.05 ? ComPr_arredondarTabela_(r.custo / dMin) : null;
  var sug = r.precoConta, fonte = 'CONTA';
  var merc = f.mercado && f.mercado.mediana, hist = f.historico && f.historico.crm && f.historico.crm.mediana;
  if (sug !== null && merc > sug && hist > sug) { sug = ComPr_arredondarTabela_(Math.min(merc, hist)); fonte = 'MERCADO_HISTORICO'; }
  var regra = f.regra || {};
  if (regra.tipo === 'HORA_AVULSA' && Number(pol.horaAvulsa) > 0) { sug = Math.max(sug || 0, Com_r2_(pol.horaAvulsa)); fonte = 'HORA_AVULSA'; }
  if (regra.tipo === 'PISO_RELATIVO' && !ctx.semPiso) {
    var b = ComF_tabelaC1_(regra.base);
    if (b) { var pb = ComF_calcular_(b, pol, { semPiso: true }).precoSugerido; var piso = ComPr_arredondarTabela_(pb * (Number(regra.fator) || 1)); if (piso > (sug || 0)) { sug = piso; fonte = 'PISO_RELATIVO'; } }
  }
  r.precoSugerido = sug;
  r.precoUrgente = sug === null ? null : ComPr_precoNaFaixa_(sug, pol, 'URGENTE', false, 'SERVICO');
  r.fonte = fonte;
  r.fonteTxt = { CONTA: 'preço pela conta', MERCADO_HISTORICO: 'o mercado público e o histórico da Metrolabs estão os dois acima da conta: o preço sobe até o menor dos dois',
    HORA_AVULSA: 'hora avulsa da política (carrega espera e diagnóstico sem peça)', PISO_RELATIVO: 'piso de ' + Com_pct_(((Number(regra.fator) || 1) - 1) * 100, 0) + ' acima do serviço de referência (' + Com_s_(regra.base) + ')' }[fonte];
  return r;
}

/** Ficha de um item do catálogo (linha de COM_PRODUTOS) para a conta. */
function ComF_fichaDe_(p) {
  var ref = ComF_referencia_(p);
  return { horasTecnico: ComF_n_(p.HORAS_TECNICO) || 0, horasEngenheiro: ComF_n_(p.HORAS_ENGENHEIRO) || 0, padroes: ComF_n_(p.PADROES_CUSTO) || 0, consumiveis: ComF_n_(p.CONSUMIVEIS_CUSTO) || 0,
    regra: ref.regra || null, historico: ref.historico || null, mercado: ref.mercado || null };
}

/**
 * 01/11/2026 (revisão da C2): a ficha só passa a valer como custo do item quando a gestão salvou a ficha (FICHA_EM) ou quando o
 * item não tinha custo cadastrado. A importação que completa um item que já tinha CUSTO preenche as horas (a gestão vê a conta da
 * C1 na ficha), mas o custo das propostas continua o cadastrado até a gestão salvar a ficha: "só preenche o que está vazio".
 */
function ComF_fichaVale_(p) { return ComF_temFicha_(p) && (Com_s_(p.FICHA_EM) !== '' || Com_s_(p.CUSTO) === ''); }

/** Custo do item para a proposta: com ficha valendo, o custo calculado pela política em vigor; senão, o custo cadastrado (ou null). */
function ComF_custoProduto_(p, pol) {
  if (ComF_fichaVale_(p)) return ComF_calcular_(ComF_fichaDe_(p), pol).custo;
  return Com_s_(p && p.CUSTO) === '' ? null : Number(p.CUSTO) || 0;
}

/**
 * 01/11/2026 (revisão da C2): chave do nome para casar a tabela C1 com o catálogo. Sem acento, sem maiúscula, sem pontuação e sem
 * as palavras de ligação ("Manutenção preventiva EM autoclave" = "Manutenção preventiva DE autoclave"; "Calibração COM teste" =
 * "Calibração E teste"). A importação antiga só casava o nome idêntico e criava item repetido no catálogo.
 */
function ComF_nomeChave_(s) { return Com_normBusca_(s).replace(/\b(de|da|do|das|dos|em|no|na|nos|nas|com|e|a|o|as|os|ao|aos|para|por)\b/g, ' ').replace(/\s+/g, ' ').trim(); }

/** Parte da tela do item. Gestão (veCusto): a conta inteira. Vendedor: só as referências de mercado e do histórico. */
function ComF_paraTela_(p, eu, pol) {
  var ref = ComF_referencia_(p), t = { tem: ComF_temFicha_(p), tabela: Com_s_(p.TABELA_CODIGO), mercado: ref.mercado || null, mercadoCentroOeste: ref.mercadoCentroOeste || null, historico: ref.historico || null, alertas: ref.alertas || [], unidadeTexto: ref.unidadeTexto || '' };
  if (!t.tem && !t.mercado && !t.historico) return null;
  var txt = function (x) { return x && x.n ? Com_moeda_(x.min) + ' / ' + Com_moeda_(x.mediana) + ' / ' + Com_moeda_(x.max) + ' (' + Com_plural_(x.n, 'preço', 'preços') + ')' : 'sem dados'; };
  t.mercadoTxt = txt(t.mercado); t.historicoTxt = txt(t.historico && t.historico.crm); t.ganhosTxt = txt(t.historico && t.historico.ganhos); t.driveTxt = txt(t.historico && t.historico.drive);
  if (t.tem && eu && eu.veCusto) {
    var c = ComF_calcular_(ComF_fichaDe_(p), pol || ComPr_politica_());
    t.conta = c;
    // revisão da C2: a ficha ainda não vale como custo (item já tinha custo cadastrado e a gestão não salvou a ficha)
    t.vale = ComF_fichaVale_(p);
    if (!t.vale) t.custoCadastradoTxt = Com_moeda_(p.CUSTO);
    t.contaTxt = { maoObraTecnico: Com_moeda_(c.maoObraTecnico), maoObraEngenheiro: Com_moeda_(c.maoObraEngenheiro), custoFixo: Com_moeda_(c.custoFixo), padroes: Com_moeda_(c.padroes), consumiveis: Com_moeda_(c.consumiveis), custo: Com_moeda_(c.custo),
      precoConta: c.precoConta === null ? '—' : Com_moeda_(c.precoConta), precoMinimo: c.precoMinimo === null ? '—' : Com_moeda_(c.precoMinimo), precoSugerido: c.precoSugerido === null ? '—' : Com_moeda_(c.precoSugerido), precoUrgente: c.precoUrgente === null ? '—' : Com_moeda_(c.precoUrgente) };
    var preco = Number(p.PRECO) || 0;
    t.diferenca = c.precoSugerido === null ? 0 : Com_r2_(preco - c.precoSugerido);
    t.diferencaTxt = Com_moeda_(Math.abs(t.diferenca));
    t.abaixoMinimo = c.precoMinimo !== null && preco > 0 && preco < c.precoMinimo - 0.004;
  }
  return t;
}

function ComF_exigirGestao_(eu, acao) {
  if (!(eu.gestao || eu.catalogo)) Com_exigir_(eu, 'GESTAO', acao);
}

/** Valor de horas ou reais da ficha: null quando vazio; lança com o que fazer. */
function ComF_valorFicha_(v, rotulo, max) {
  if (v === null || v === undefined || Com_s_(v) === '') return null;
  var n = Com_num_(v);
  if (!isFinite(n) || n < 0 || n > max) throw new Error('Não foi possível salvar a ficha: ' + rotulo + ' precisa ser um número de 0 a ' + SGO_DocA4_num_(max, 0) + ' (veio "' + Com_s_(v).slice(0, 20) + '")');
  return Math.round(n * 100) / 100;
}

/** Gestão (ou Financeiro) grava a ficha de custo de um item. d: { id, horasTecnico, horasEngenheiro, padroes, consumiveis } */
function ComF_salvarFicha_(eu, d) {
  ComF_exigirGestao_(eu, 'salvar a ficha de custo');
  d = d || {};
  var campos = { HORAS_TECNICO: ComF_valorFicha_(d.horasTecnico, 'as horas do técnico', 500), HORAS_ENGENHEIRO: ComF_valorFicha_(d.horasEngenheiro, 'as horas do engenheiro', 500),
    PADROES_CUSTO: ComF_valorFicha_(d.padroes, 'o custo dos padrões', 1000000), CONSUMIVEIS_CUSTO: ComF_valorFicha_(d.consumiveis, 'o custo dos consumíveis e da ART', 1000000) };
  if (campos.HORAS_TECNICO === null && campos.HORAS_ENGENHEIRO === null) throw new Error('Não foi possível salvar a ficha: informe as horas do técnico, do engenheiro ou das duas funções (0 quando a função não participa)');
  return Com_comTrava_(function () {
    var p = SGO_DATA.getById(COM_ABAS.PRODUTOS, Com_s_(d.id));
    if (!p) throw new Error('Não foi possível salvar a ficha: o item não existe mais. Atualize o catálogo');
    Object.keys(campos).forEach(function (k) { if (campos[k] === null) campos[k] = 0; });
    var antes = ComF_temFicha_(p) ? ComF_calcular_(ComF_fichaDe_(p)).custo : null;
    campos.FICHA_EM = Com_agora_(); campos.FICHA_POR_NOME = eu.nome; campos.ATUALIZADO_EM = Com_agora_(); campos.ATUALIZADO_POR_NOME = eu.nome;
    SGO_DATA.update(COM_ABAS.PRODUTOS, p.ID, campos);
    var novo = Object.assign({}, p, campos), c = ComF_calcular_(ComF_fichaDe_(novo));
    Com_historico_('PRODUTO', p.ID, 'FICHA', eu, { de: antes === null ? '' : Com_moeda_(antes), para: Com_moeda_(c.custo), texto: 'Ficha de custo de ' + Com_s_(p.CODIGO) + ': técnico ' + ComPr_qtd_(campos.HORAS_TECNICO) + ' h, engenheiro ' + ComPr_qtd_(campos.HORAS_ENGENHEIRO) + ' h, padrões ' + Com_moeda_(campos.PADROES_CUSTO) + ', consumíveis ' + Com_moeda_(campos.CONSUMIVEIS_CUSTO) + '. Custo ' + Com_moeda_(c.custo) + ', preço sugerido ' + Com_moeda_(c.precoSugerido) + ' (o preço de venda não muda sozinho).' });
    return { produto: ComP_produtoParaTela_(novo, eu), message: 'Ficha de custo salva. Custo pela política em vigor: ' + Com_moeda_(c.custo) + '; preço sugerido: ' + Com_moeda_(c.precoSugerido) + '. O preço de venda continua ' + Com_moeda_(p.PRECO) + ' até a gestão confirmar.' };
  });
}

/**
 * Gestão confirma o preço sugerido como preço de venda. d: { ids: [id], motivo (>= 10) }. Item sem ficha ou já no preço sugerido
 * fica de fora (e é contado). Histórico de cada item com o preço anterior, o novo e o motivo.
 */
function ComF_aplicarSugerido_(eu, d) {
  ComF_exigirGestao_(eu, 'mudar o preço de venda');
  d = d || {};
  var motivo = Com_texto_(d.motivo, 500);
  if (motivo.length < 10) throw new Error('Não foi possível mudar o preço: escreva o motivo (pelo menos 10 letras, por exemplo "Tabela C1 aprovada pela Diretoria"). Ele fica no histórico de cada item');
  var ids = (Array.isArray(d.ids) ? d.ids : [d.id]).map(Com_s_).filter(Boolean);
  if (!ids.length) throw new Error('Não foi possível mudar o preço: escolha pelo menos um item');
  return Com_comTrava_(function () {
    var pol = ComPr_politica_(), agora = Com_agora_(), mudou = [], iguais = 0, semFicha = 0;
    ids.forEach(function (id) {
      var p = SGO_DATA.getById(COM_ABAS.PRODUTOS, id);
      if (!p || !ComF_temFicha_(p)) { semFicha++; return; }
      var c = ComF_calcular_(ComF_fichaDe_(p), pol), antes = Com_r2_(Number(p.PRECO) || 0);
      if (c.precoSugerido === null || Math.abs(c.precoSugerido - antes) < 0.005) { iguais++; return; }
      SGO_DATA.update(COM_ABAS.PRODUTOS, p.ID, { PRECO: c.precoSugerido, PRECO_DESDE: Com_hoje_(), PRECO_REFERENCIA: '', ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora });
      Com_historico_('PRODUTO', p.ID, 'PRECO', eu, { de: Com_moeda_(antes), para: Com_moeda_(c.precoSugerido), texto: 'Preço de venda de ' + Com_s_(p.CODIGO) + ' alterado de ' + Com_moeda_(antes) + ' para ' + Com_moeda_(c.precoSugerido) + ' (preço sugerido pela ficha de custo, ' + c.fonteTxt + '; política versão ' + pol.versao + '). Motivo: ' + motivo });
      mudou.push(Com_s_(p.CODIGO));
    });
    return { mudados: mudou.length, message: mudou.length ? Com_plural_(mudou.length, 'item passou', 'itens passaram') + ' ao preço sugerido (' + mudou.slice(0, 8).join(', ') + (mudou.length > 8 ? '...' : '') + '). As propostas já salvas guardam o preço antigo.' + (iguais ? ' ' + Com_plural_(iguais, 'item já estava', 'itens já estavam') + ' no preço sugerido.' : '') + (semFicha ? ' ' + Com_plural_(semFicha, 'item sem ficha ficou', 'itens sem ficha ficaram') + ' de fora.' : '')
      : 'Nenhum preço mudou: ' + (iguais ? 'os itens já estão no preço sugerido' : 'os itens escolhidos não têm ficha de custo') + '.' };
  });
}

// ------------------------------------------------------------
// IMPORTAÇÃO DA TABELA C1
// ------------------------------------------------------------
function ComF_codigoCatalogo_(s) { return Com_up_(s.codigo).replace(/_/g, '-'); }

/** Prévia (nada é gravado). { linhas: [{ codigo, nome, situacao NOVO|JA_IMPORTADO|EXISTE, existente, tabela, escolha }], resumo, marca } */
function ComF_previaImportacao_(eu) {
  Com_exigir_(eu, 'GESTAO', 'importar a tabela de preços C1');
  if (typeof COM_TABELA_C1 === 'undefined' || !COM_TABELA_C1) throw new Error('Não foi possível montar a prévia: a tabela C1 não está instalada neste servidor (SGO_Comercial_TabelaC1.js). Avise o Administrador');
  var pol = ComPr_politica_(), produtos = Com_ler_(COM_ABAS.PRODUTOS), resumo = { NOVO: 0, JA_IMPORTADO: 0, EXISTE: 0 };
  // revisão da C2: casamento pelo nome sem as palavras de ligação; com mais de um item igual, o primeiro com preço e mais recente
  // (os outros aparecem contados na prévia). Item do catálogo que já casou com um serviço não casa com outro.
  var porNome = {}, usados = {};
  produtos.forEach(function (p) {
    if (Com_up_(p.ATIVO || 'SIM') === 'NAO' || Com_s_(p.TABELA_CODIGO) !== '') return;
    var k = ComF_nomeChave_(p.NOME); if (!k) return;
    (porNome[k] = porNome[k] || []).push(p);
  });
  Object.keys(porNome).forEach(function (k) { porNome[k].sort(function (a, b) { return ((Number(b.PRECO) > 0) - (Number(a.PRECO) > 0)) || Com_s_(b.ATUALIZADO_EM).localeCompare(Com_s_(a.ATUALIZADO_EM)); }); });
  var linhas = COM_TABELA_C1.servicos.map(function (s) {
    var chave = 'C1:' + s.codigo, cod = ComF_codigoCatalogo_(s), c = ComF_calcular_(s, pol);
    var ja = produtos.filter(function (p) { return Com_s_(p.TABELA_CODIGO) === chave; })[0];
    var mesmos = ja ? [] : (porNome[ComF_nomeChave_(s.nome)] || []).filter(function (p) { return !usados[Com_s_(p.ID)]; });
    var igual = ja ? null : (produtos.filter(function (p) { return Com_up_(p.CODIGO) === cod && !usados[Com_s_(p.ID)]; })[0] || mesmos[0]);
    if (igual) usados[Com_s_(igual.ID)] = true;
    var sit = ja ? 'JA_IMPORTADO' : igual ? 'EXISTE' : 'NOVO';
    resumo[sit]++;
    var l = { codigo: s.codigo, codigoCatalogo: cod, nome: s.nome, grupo: s.grupo, situacao: sit, situacaoTxt: { NOVO: 'Novo no catálogo', JA_IMPORTADO: 'Já importado (fica como está)', EXISTE: 'Já existe um item parecido' }[sit],
      tabela: { custo: c.custo, custoTxt: Com_moeda_(c.custo), preco: c.precoSugerido, precoTxt: Com_moeda_(c.precoSugerido), minimoTxt: c.precoMinimo === null ? '—' : Com_moeda_(c.precoMinimo), unidade: s.unidade, horasTxt: ComPr_qtd_(s.horasTecnico) + ' h técnico · ' + ComPr_qtd_(s.horasEngenheiro) + ' h engenheiro' } };
    var ex = ja || igual;
    if (ex) {
      l.existente = { id: Com_s_(ex.ID), codigo: Com_s_(ex.CODIGO), nome: Com_s_(ex.NOME), precoTxt: Com_moeda_(ex.PRECO), custoTxt: Com_s_(ex.CUSTO) === '' ? 'sem custo' : Com_moeda_(ex.CUSTO), unidade: Com_s_(ex.UNIDADE_MEDIDA), ativo: Com_up_(ex.ATIVO || 'SIM') !== 'NAO', temFicha: ComF_temFicha_(ex) };
      if (sit === 'EXISTE') {
        l.vaiPreencher = ComF_camposVazios_(ex, s, c).map(function (x) { return x.nome; });
        if (Com_s_(ex.CUSTO) !== '' && l.vaiPreencher.indexOf('horas do técnico') >= 0) l.custoFica = 'O custo cadastrado (' + Com_moeda_(ex.CUSTO) + ') continua valendo nas propostas até a gestão salvar a ficha.';
        var outros = mesmos.filter(function (p) { return Com_s_(p.ID) !== Com_s_(ex.ID); }).length;
        if (outros) l.outrosIguais = 'Há mais ' + Com_plural_(outros, 'item ativo', 'itens ativos') + ' com o mesmo nome no catálogo (confira em Situação > "Possíveis duplicados (mesmo nome)").';
      }
    }
    l.escolha = sit === 'EXISTE' ? 'PREENCHER' : '';
    return l;
  });
  var marca = Com_marca_(JSON.stringify(linhas.map(function (l) { return [l.codigo, l.situacao, l.existente ? l.existente.id : '']; }))).slice(0, 32);
  return { linhas: linhas, resumo: resumo, marca: marca, versao: COM_TABELA_C1.versao, escolhas: COM_F_ESCOLHAS,
    politica: { versao: pol.versao, provisorios: ComPr_provisorios_(pol).length } };
}

/** O que a importação preenche num item já existente: só campo vazio (nunca troca o que está gravado). [{ coluna, nome, valor }] */
function ComF_camposVazios_(p, s, c) {
  var l = [], vazio = function (k) { return Com_s_(p[k]) === ''; };
  if (vazio('HORAS_TECNICO') && vazio('HORAS_ENGENHEIRO')) {
    l.push({ coluna: 'HORAS_TECNICO', nome: 'horas do técnico', valor: s.horasTecnico }, { coluna: 'HORAS_ENGENHEIRO', nome: 'horas do engenheiro', valor: s.horasEngenheiro });
    if (vazio('PADROES_CUSTO')) l.push({ coluna: 'PADROES_CUSTO', nome: 'padrões', valor: s.padroes });
    if (vazio('CONSUMIVEIS_CUSTO')) l.push({ coluna: 'CONSUMIVEIS_CUSTO', nome: 'consumíveis e ART', valor: s.consumiveis });
  }
  if (vazio('CATEGORIA')) l.push({ coluna: 'CATEGORIA', nome: 'categoria', valor: s.grupo });
  if (vazio('DESCRICAO')) l.push({ coluna: 'DESCRICAO', nome: 'descrição', valor: ComF_descricao_(s) });
  if (vazio('CUSTO')) l.push({ coluna: 'CUSTO', nome: 'custo', valor: c.custo });
  if (!(Number(p.PRECO) > 0)) l.push({ coluna: 'PRECO', nome: 'preço de venda', valor: c.precoSugerido });
  if (vazio('REFERENCIA_JSON')) l.push({ coluna: 'REFERENCIA_JSON', nome: 'referências de mercado e do histórico', valor: JSON.stringify(ComF_referenciaDe_(s)) });
  return l;
}
function ComF_descricao_(s) { return Com_texto_(s.escopo + ' Unidade: ' + s.unidadeTexto + '. Deslocamento cobrado à parte.', 2000); }
function ComF_referenciaDe_(s) { return { mercado: s.mercado, mercadoCentroOeste: s.mercadoCentroOeste, historico: s.historico, regra: s.regra, fonte: s.fonte, alertas: s.alertas, unidadeTexto: s.unidadeTexto, c1: s.c1, versao: COM_TABELA_C1.versao }; }

/** Importa conforme a prévia conferida. d: { marca, escolhas: { <codigo C1>: 'PREENCHER'|'IGNORAR'|'CRIAR' } } */
function ComF_importar_(eu, d) {
  Com_exigir_(eu, 'GESTAO', 'importar a tabela de preços C1');
  d = d || {};
  return Com_comTrava_(function () {
    Com_garantirAbas_();
    var prev = ComF_previaImportacao_(eu);
    if (Com_s_(d.marca) !== prev.marca) throw new Error('Não foi possível importar: o catálogo mudou desde a prévia (item novo, editado ou já importado por outra pessoa). Toque em "Ver a prévia" de novo e confira antes de importar. Nada foi gravado');
    var pol = ComPr_politica_(), agora = Com_agora_(), hoje = Com_hoje_(), escolhas = d.escolhas || {}, criados = [], preenchidos = [], deixados = 0, ja = 0;
    // revisão da C2: as escolhas são conferidas antes de gravar qualquer item (antes, uma escolha inválida parava no meio)
    prev.linhas.forEach(function (l) {
      var e = l.situacao === 'EXISTE' ? (Com_up_(escolhas[l.codigo]) || 'PREENCHER') : '';
      if (e && !COM_F_ESCOLHAS[e]) throw new Error('Não foi possível importar: a escolha "' + Com_s_(escolhas[l.codigo]) + '" para ' + l.nome + ' não existe. Escolha preencher só o que está vazio, deixar como está ou criar um item novo. Nada foi gravado');
    });
    prev.linhas.forEach(function (l) {
      var s = ComF_tabelaC1_(l.codigo), c = ComF_calcular_(s, pol);
      if (l.situacao === 'JA_IMPORTADO') { ja++; return; }
      var esc = l.situacao === 'EXISTE' ? (Com_up_(escolhas[l.codigo]) || 'PREENCHER') : '';
      if (l.situacao === 'NOVO' || esc === 'CRIAR') {
        // código igual ao do item existente (casou pelo código): o item novo leva "-C1" para não repetir o código
        var codNovo = l.situacao === 'EXISTE' && l.existente && Com_up_(l.existente.codigo) === Com_up_(l.codigoCatalogo) ? l.codigoCatalogo + '-C1' : l.codigoCatalogo;
        var reg = SGO_DATA.insert(COM_ABAS.PRODUTOS, { CODIGO: codNovo, NOME: s.nome, TIPO: 'SERVICO', CATEGORIA: s.grupo, UNIDADE_MEDIDA: s.unidade, DESCRICAO: ComF_descricao_(s),
          PRECO: c.precoSugerido, CUSTO: c.custo, ATIVO: 'SIM', PRECO_DESDE: hoje, HORAS_TECNICO: s.horasTecnico, HORAS_ENGENHEIRO: s.horasEngenheiro, PADROES_CUSTO: s.padroes, CONSUMIVEIS_CUSTO: s.consumiveis,
          TABELA_CODIGO: 'C1:' + s.codigo, TABELA_VERSAO: COM_TABELA_C1.versao, REFERENCIA_JSON: JSON.stringify(ComF_referenciaDe_(s)), FICHA_EM: agora, FICHA_POR_NOME: eu.nome,
          ATUALIZADO_POR_NOME: eu.nome + ' (tabela de preços C1)', ATUALIZADO_EM: agora });
        Com_historico_('PRODUTO', reg.ID, 'CRIACAO', eu, { para: Com_moeda_(c.precoSugerido), texto: s.nome + ' (' + codNovo + ') importado da tabela de preços C1 com a ficha de custo: custo ' + Com_moeda_(c.custo) + ', preço de venda ' + Com_moeda_(c.precoSugerido) + ' (' + c.fonteTxt + ')' + (esc === 'CRIAR' ? '; criado à parte de ' + l.existente.codigo + ' (' + l.existente.nome + '), que ficou como estava' : '') + '.' });
        criados.push(codNovo);
        return;
      }
      if (esc === 'IGNORAR') { deixados++; return; }
      var p = SGO_DATA.getById(COM_ABAS.PRODUTOS, l.existente.id), vaz = ComF_camposVazios_(p, s, c), campos = { TABELA_CODIGO: 'C1:' + s.codigo, TABELA_VERSAO: COM_TABELA_C1.versao, ATUALIZADO_EM: agora, ATUALIZADO_POR_NOME: eu.nome + ' (tabela de preços C1)' };
      vaz.forEach(function (x) { campos[x.coluna] = x.valor; });
      if (campos.PRECO !== undefined) campos.PRECO_DESDE = hoje;
      // a ficha só vale como custo quando o item não tinha custo cadastrado (ComF_fichaVale_); senão a gestão confirma salvando a ficha
      if (campos.HORAS_TECNICO !== undefined && Com_s_(p.CUSTO) === '') { campos.FICHA_EM = agora; campos.FICHA_POR_NOME = eu.nome; }
      SGO_DATA.update(COM_ABAS.PRODUTOS, p.ID, campos);
      Com_historico_('PRODUTO', p.ID, 'EDICAO', eu, { texto: 'Ligado à tabela de preços C1 (' + s.codigo + '). Preenchido o que estava vazio: ' + (vaz.length ? vaz.map(function (x) { return x.nome; }).join(', ') : 'nada (tudo já estava preenchido)') + '. O que já estava gravado ficou como estava' + (Com_s_(p.CUSTO) !== '' && campos.HORAS_TECNICO !== undefined ? ' (o custo cadastrado de ' + Com_moeda_(p.CUSTO) + ' continua valendo nas propostas até a gestão salvar a ficha)' : '') + '.' });
      preenchidos.push(Com_s_(p.CODIGO));
    });
    Com_historico_('CATALOGO', 'TABELA_C1', 'IMPORTACAO', eu, { texto: 'Importação da tabela de preços C1 (' + COM_TABELA_C1.versao + '): ' + criados.length + ' novos, ' + preenchidos.length + ' completados, ' + deixados + ' deixados como estavam, ' + ja + ' já importados.' });
    return { criados: criados.length, preenchidos: preenchidos.length, deixados: deixados, jaImportados: ja,
      message: 'Tabela de preços C1 importada: ' + Com_plural_(criados.length, 'item novo', 'itens novos') + ', ' + Com_plural_(preenchidos.length, 'item completado', 'itens completados') + ' (só o que estava vazio)' + (deixados ? ', ' + Com_plural_(deixados, 'deixado', 'deixados') + ' como estava' : '') + (ja ? ', ' + Com_plural_(ja, 'já importado', 'já importados') + ' antes (não duplicou)' : '') + '.' };
  });
}

// ------------------------------------------------------------
// GESTORA: preço abaixo do mínimo, fora do mercado, prazo curto, alçadas e desconto de pontualidade
// ------------------------------------------------------------
/** Problemas da proposta ligados à tabela de preços e às faixas (só regras). [{ regra, texto, grave }] */
function ComF_problemasItens_(p, pol) {
  pol = pol || ComPr_politica_();
  var l = [], add = function (r, t, g) { l.push({ regra: r, texto: t, grave: !!g }); };
  var itens = Com_json_(p.ITENS_JSON, []) || [], pz = Com_json_(p.PRAZO_JSON, {}) || {}, cat = {};
  if (itens.some(function (i) { return i && i.produtoId; })) Com_ler_(COM_ABAS.PRODUTOS).forEach(function (x) { cat[Com_s_(x.ID)] = x; });
  itens.forEach(function (i) {
    if (!i || i.auto || !i.produtoId) return;
    var pr = cat[Com_s_(i.produtoId)];
    if (!pr) return;
    var fx = ComPr_faixa_(pol, i.faixa || pz.faixa), fat = i.tipo === 'PRODUTO' ? 1 : ComPr_fatorFaixa_(pol, fx.codigo, pz.licitacao);
    var pu = Number(i.precoUnitario) || 0, nome = Com_s_(i.codigo) || Com_s_(i.descricao).slice(0, 40);
    if (ComF_temFicha_(pr)) {
      var c = ComF_calcular_(ComF_fichaDe_(pr), pol);
      if (c.precoMinimo !== null && pu > 0 && pu < c.precoMinimo * fat - 0.004) add('PRECO_ABAIXO_MINIMO', nome + ' a ' + Com_moeda_(pu) + ', abaixo do preço mínimo da tabela (' + Com_moeda_(Com_r2_(c.precoMinimo * fat)) + ', margem de ' + Com_pct_(pol.margemMinPct, 1) + ')', false);
    }
    var m = ComF_referencia_(pr).mercado;
    if (m && m.n >= 3 && pu > 0) {
      var base = pu / fat;
      if (base < m.min - 0.004) add('FORA_MERCADO', nome + ' a ' + Com_moeda_(base) + ' (preço normal), abaixo do menor preço público (' + Com_moeda_(m.min) + ', ' + Com_plural_(m.n, 'preço', 'preços') + ')', false);
      else if (base > m.max + 0.004) add('FORA_MERCADO', nome + ' a ' + Com_moeda_(base) + ' (preço normal), acima do maior preço público (' + Com_moeda_(m.max) + ', ' + Com_plural_(m.n, 'preço', 'preços') + '): o cliente pode comparar', false);
    }
  });
  var curtas = {};
  itens.forEach(function (i) { if (i && !i.auto && i.tipo !== 'PRODUTO') { var fx = ComPr_faixa_(pol, i.faixa || pz.faixa); if (fx.codigo !== 'NORMAL') curtas[fx.nome] = fx.diasUteis; } });
  Object.keys(curtas).forEach(function (n) { add('PRAZO_CURTO', 'prazo ' + n.toLowerCase() + ' de ' + Com_plural_(curtas[n], 'dia útil', 'dias úteis') + ': confirme a agenda com a Área técnica antes do envio (não prometer prazo sem validar)', false); });
  var cond = Com_json_(p.CONDICOES_JSON, {}) || {}, met = Com_metodologia_();
  if (!met.politica.descontoPontualidade && /pontualidade|at[ée] o dia 10|pago at[ée]/i.test(Com_s_(cond.pagamento) + ' ' + Com_s_(cond.gerais) + ' ' + Com_s_(cond.observacoes)))
    add('DESCONTO_PONTUALIDADE', 'as condições falam em desconto por pagamento em dia (até o dia 10): a política de preço não prevê esse desconto, que come metade da margem', false);
  var dp = Number(p.DESCONTO_PCT) || 0, ad = Com_num_(met.politica.alcadaDiretoriaPct);
  if (isFinite(ad) && ad > 0 && dp > ad + 1e-9) add('ALCADA_DIRETORIA', 'desconto de ' + Com_pct_(dp) + ' sobre a tabela, acima da alçada da Diretoria (' + Com_pct_(ad, 2) + ', valor provisório)', false);
  return l;
}
