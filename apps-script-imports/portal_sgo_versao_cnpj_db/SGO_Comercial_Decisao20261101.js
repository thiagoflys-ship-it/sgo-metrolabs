/****************************************************
 * COMERCIAL — APLICAR A DECISÃO DO DONO DE 01/11/2026 NA PRODUÇÃO (política e preços)
 *
 * Decisão (docs/COMERCIAL_MATERIAL_DO_DONO_20261101.md, seção 0): sobra mínima de 35%, valores maiores, taxa por viagem removida
 * (era o Incentivo de Missão), Bônus Coletivo diluído na hora, km R$ 2,50 confirmado e impostos por unidade (Lucro Real).
 *
 * 1) Política (COM_CONFIG, metodologia versionada). Campo vazio na política gravada vale o padrão do código; campo gravado vence.
 *    Por isso a decisão é gravada como uma VERSÃO NOVA da metodologia, campo a campo, com o motivo:
 *      - campo vazio, ou igual ao valor inicial da C1 (o que o sistema usava antes de hoje)  -> recebe o valor decidido;
 *      - campo igual ao decidido                                                              -> fica (nada muda);
 *      - campo com outro valor gravado pela Diretoria                                          -> FICA, e a prévia mostra o conflito.
 *    Exceções, porque contrariam a decisão literal do dono: margem mínima abaixo de 35%, custo da hora do técnico abaixo de R$ 90,
 *    margem alvo abaixo da mínima e taxa por viagem com valor: recebem o valor decidido. "forcar" troca também um campo em conflito.
 * 2) Preços do catálogo. Itens com ficha de custo (os da tabela C1) e peças com custo cadastrado: o preço novo é o preço sugerido
 *    (o maior entre o atual, a tabela C1, a planilha de 30/10/2026 com o imposto por fora e a conta com a sobra mínima; peças pela
 *    conta de produto). Só SOBE preço. Grava como um lote de reajuste (COM_REAJUSTES): histórico por item e "Desfazer o último
 *    reajuste" em Produtos e serviços. Só PRECO e PRECO_DESDE mudam no item (merge; nada mais é sobrescrito).
 *
 * Tela: Comercial > Metodologia > Preço e desconto, quadro "Decisão do dono de 01/11/2026" (Diretoria e Administrador).
 * Servidor, sem tela (origem "editor"): Comercial_decisaoDono20261101({ etapa: 'POLITICA'|'PRECOS', aplicar: false|true, marca, motivo }).
 * Prévia sempre antes; aplicar exige a marca da prévia (se algo mudou entre as duas, nada é gravado).
 ****************************************************/

var COM_DEC_MOTIVO = 'Decisão do dono 01/11/2026: sobra mínima 35%, valores maiores, incentivos, impostos por unidade';
var COM_DEC_INDICE = 'Decisão do dono 01/11/2026 (valores maiores)';

function ComDec_podeAplicar_(eu) { return !!(eu && (eu.diretoria || eu.perfil === 'ADMIN')); }
function ComDec_exigir_(eu, acao) {
  if (!ComDec_podeAplicar_(eu)) throw new Error('Não foi possível ' + acao + ': aplicar a decisão do dono na política e nos preços é da Diretoria (ou do Administrador). Peça à Diretoria');
}

/** Campos da decisão: caminho na metodologia, valor decidido, valor inicial anterior (C1/C2) e a regra de conflito. */
function ComDec_campos_() {
  var pad = COM_METODOLOGIA_PADRAO.precificacao;
  return [
    { chave: 'margemMinPct', caminho: ['precificacao', 'margemMinPct'], nome: 'Sobra (margem) mínima', novo: 35, antes: 10, tipo: 'pct', aplicaSe: function (v) { return Number(v) < 35; }, porque: 'abaixo dos 35% decididos pelo dono' },
    { chave: 'margemAlvoPct', caminho: ['precificacao', 'margemAlvoPct'], nome: 'Margem alvo', novo: 40, antes: 20, tipo: 'pct', aplicaSe: function (v, m) { return Number(v) < m; }, porque: 'abaixo da sobra mínima' },
    { chave: 'impostosPct', caminho: ['precificacao', 'impostosPct'], nome: 'Imposto de serviço fixo (vazio = tabela por unidade)', novo: null, antes: 14.25, tipo: 'pct' },
    { chave: 'custoHoraTecnico', caminho: ['precificacao', 'custoHora', 'TECNICO'], nome: 'Custo da hora do técnico', novo: 90, antes: 45, tipo: 'moeda', aplicaSe: function (v) { return Number(v) < 90; }, porque: 'abaixo dos R$ 90 do MAN-VIA-001 (valor maior)' },
    { chave: 'custoHoraEngenheiro', caminho: ['precificacao', 'custoHora', 'ENGENHEIRO'], nome: 'Custo da hora do engenheiro', novo: 132, antes: 132, tipo: 'moeda', aplicaSe: function (v) { return Number(v) < 132; }, porque: 'abaixo dos R$ 132 (valor maior)' },
    { chave: 'taxaViagemValor', caminho: ['precificacao', 'taxaViagem', 'valor'], nome: 'Taxa por viagem (era o Incentivo de Missão)', novo: 0, antes: 300, tipo: 'moeda', aplicaSe: function (v) { return Number(v) > 0; }, porque: 'o dono removeu a taxa (era o Incentivo de Missão em dobro)' },
    { chave: 'taxaViagemRotulo', caminho: ['precificacao', 'taxaViagem', 'rotulo'], nome: 'Nome da taxa por viagem', novo: pad.taxaViagem.rotulo, antes: 'Taxa por viagem (fora da Grande Goiânia)', tipo: 'texto', aplicaSe: function () { return true; }, porque: 'a taxa foi desligada' },
    { chave: 'valorKm', caminho: ['precificacao', 'valorKm'], nome: 'Valor por km rodado (confirmado pelo dono)', novo: 2.5, antes: 2.5, tipo: 'moeda' },
    { chave: 'unidadePadrao', caminho: ['precificacao', 'unidadePadrao'], nome: 'Unidade emissora padrão', novo: 'GO', antes: undefined, tipo: 'texto' },
    { chave: 'unidades', caminho: ['precificacao', 'unidades'], nome: 'Impostos por unidade emissora (Goiânia e Rio de Janeiro)', novo: Com_copia_(pad.unidades), antes: undefined, tipo: 'objeto' },
    { chave: 'bonusConduta', caminho: ['precificacao', 'bonusConduta'], nome: 'Bônus Coletivo diluído na hora', novo: Com_copia_(pad.bonusConduta), antes: undefined, tipo: 'objeto' },
    { chave: 'texto', caminho: ['precificacao', 'texto'], nome: 'Texto da política de precificação', novo: pad.texto, antes: undefined, tipo: 'texto', textoAntigo: /benefício do Programa de conduta de cada colaborador|margem mínima só segue/ },
    { chave: 'textoDesconto', caminho: ['politica', 'texto'], nome: 'Texto da política de desconto', novo: COM_METODOLOGIA_PADRAO.politica.texto, antes: undefined, tipo: 'texto', textoAntigo: /depois de impostos, comissão e deslocamento\), só a Diretoria aprova/ }
  ];
}
function ComDec_ler_(o, caminho) { var x = o; for (var i = 0; i < caminho.length; i++) { if (!x || typeof x !== 'object') return undefined; x = x[caminho[i]]; } return x; }
function ComDec_gravar_(o, caminho, v) { var x = o; for (var i = 0; i < caminho.length - 1; i++) { if (!x[caminho[i]] || typeof x[caminho[i]] !== 'object') x[caminho[i]] = {}; x = x[caminho[i]]; } x[caminho[caminho.length - 1]] = Com_copia_(v); }
function ComDec_vazio_(v) { return v === undefined || v === null || (typeof v === 'string' && Com_s_(v) === ''); }
function ComDec_igual_(a, b) {
  if (ComDec_vazio_(a) && ComDec_vazio_(b)) return true;
  if (typeof a === 'object' || typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b);
  var na = Com_num_(a), nb = Com_num_(b);
  if (typeof b === 'number' && isFinite(na)) return Math.abs(na - nb) < 1e-9;
  return Com_s_(a) === Com_s_(b);
}
function ComDec_txt_(c, v) {
  if (ComDec_vazio_(v)) return 'vazio';
  if (c.tipo === 'pct') return Com_pct_(Number(v), 2);
  if (c.tipo === 'moeda') return Com_moeda_(Number(v));
  if (c.tipo === 'objeto') return c.chave === 'unidades' ? Object.keys(v).map(function (k) { var im = ComPr_impostosDaUnidade_(v[k]); return Com_s_(v[k].nome || k) + ': serviço ' + Com_pct_(im.servicoPct, 2) + ', produto ' + Com_pct_(im.produtoPct, 2) + ' menos ' + Com_pct_(im.creditoPct, 2) + ' de créditos'; }).join('; ') : 'valor do Programa de conduta, colaboradores ativos e ' + ComPr_qtd_(v.horasPorColaboradorCampo || 140) + ' h por colaborador de campo';
  return Com_s_(v).length > 90 ? Com_s_(v).slice(0, 90) + '...' : Com_s_(v);
}
/** Versão gravada mais recente (o que está no banco, sem o padrão do código por baixo). { versao, valor } */
function ComDec_gravada_() {
  var linhas = Com_ler_(COM_ABAS.CONFIG).filter(function (r) { return Com_s_(r.CHAVE) === 'METODOLOGIA'; }).sort(function (a, b) { return (Number(a.VERSAO) || 0) - (Number(b.VERSAO) || 0); });
  var u = linhas[linhas.length - 1];
  return { versao: u ? Number(u.VERSAO) || 0 : 0, valor: u ? Com_json_(u.VALOR_JSON, {}) || {} : {} };
}

/** Prévia da política (nada é gravado). forcar: lista de chaves em conflito que devem receber o valor decidido. */
function ComDec_previaPolitica_(eu, d) {
  ComDec_exigir_(eu, 'ver a prévia da política');
  d = d || {};
  var forcar = (Array.isArray(d.forcar) ? d.forcar : []).map(Com_s_);
  var g = ComDec_gravada_(), linhas = [];
  var minFinal = null;
  ComDec_campos_().forEach(function (c) {
    var v = ComDec_ler_(g.valor, c.caminho), acao, motivo;
    if (ComDec_igual_(v, c.novo)) { acao = 'IGUAL'; motivo = 'já está com o valor decidido'; }
    else if (ComDec_vazio_(v)) { acao = 'APLICAR'; motivo = c.antes === undefined ? 'campo novo da política' : 'campo vazio (valia o valor inicial do código)'; }
    else if (c.antes !== undefined && ComDec_igual_(v, c.antes)) { acao = 'APLICAR'; motivo = 'era o valor inicial da C1, não uma decisão da Diretoria'; }
    else if (c.textoAntigo && c.textoAntigo.test(Com_s_(v))) { acao = 'APLICAR'; motivo = 'texto antigo do sistema (fala da regra anterior)'; }
    else if (c.aplicaSe && c.aplicaSe(v, minFinal === null ? 35 : minFinal)) { acao = 'APLICAR'; motivo = 'valor gravado ' + c.porque; }
    else if (forcar.indexOf(c.chave) >= 0) { acao = 'APLICAR'; motivo = 'conflito: a Diretoria pediu para trocar ("forçar")'; }
    else { acao = 'MANTER'; motivo = 'a Diretoria gravou outro valor: fica como está (para trocar, marque "forçar")'; }
    if (c.chave === 'margemMinPct') minFinal = acao === 'APLICAR' ? c.novo : Number(v);
    linhas.push({ chave: c.chave, nome: c.nome, atual: ComDec_vazio_(v) ? null : Com_copia_(v), atualTxt: ComDec_txt_(c, v), novoTxt: ComDec_txt_(c, c.novo), acao: acao, motivo: motivo, conflito: acao === 'MANTER' });
  });
  var marca = Com_marca_(JSON.stringify({ v: g.versao, l: linhas.map(function (l) { return [l.chave, l.acao, l.atualTxt]; }) })).slice(0, 32);
  return { versaoAtual: g.versao, linhas: linhas, aplicar: linhas.filter(function (l) { return l.acao === 'APLICAR'; }).length, conflitos: linhas.filter(function (l) { return l.conflito; }).length, marca: marca, motivoPadrao: COM_DEC_MOTIVO, forcar: forcar };
}

/** Aplica a política como versão nova da metodologia. d: { marca, motivo (opcional, padrão COM_DEC_MOTIVO), forcar } */
function ComDec_aplicarPolitica_(eu, d) {
  ComDec_exigir_(eu, 'aplicar a decisão na política');
  d = d || {};
  return Com_comTrava_(function () {
    Com_garantirAbas_();
    var prev = ComDec_previaPolitica_(eu, d);
    if (Com_s_(d.marca) !== prev.marca) throw new Error('Não foi possível aplicar: a política mudou desde a prévia (outra versão foi gravada). Veja a prévia de novo e confira antes de aplicar. Nada foi gravado');
    if (!prev.aplicar) return { versao: prev.versaoAtual, aplicados: 0, conflitos: prev.conflitos, message: 'Nada a aplicar: a política já está com os valores decididos' + (prev.conflitos ? ' (há ' + Com_plural_(prev.conflitos, 'campo', 'campos') + ' com valor da Diretoria mantido)' : '') + '.' };
    // revisão: a prévia leu o banco agora; a metodologia em memória (até 20 s) pode ser de uma versão anterior e gravá-la por cima
    // apagaria o que outra pessoa salvou nesse intervalo. Lê de novo do banco.
    COM_METODOLOGIA_MEMO = null;
    var m = Com_copia_(Com_metodologia_());
    if ((Number(m.versao) || 0) !== (Number(prev.versaoAtual) || 0) && prev.versaoAtual) throw new Error('Não foi possível aplicar: a política mudou desde a prévia (outra versão foi gravada). Veja a prévia de novo e confira antes de aplicar. Nada foi gravado');
    delete m.versao; delete m.atualizadaEm; delete m.atualizadaPor; delete m.margemUnificada;
    var porChave = {};
    ComDec_campos_().forEach(function (c) { porChave[c.chave] = c; });
    prev.linhas.forEach(function (l) { if (l.acao === 'APLICAR') ComDec_gravar_(m, porChave[l.chave].caminho, porChave[l.chave].novo); });
    // a margem é uma só: o espelho antigo acompanha (Com_gravarMetodologia_ também faz)
    if (m.politica && m.precificacao) m.politica.margemMinPct = m.precificacao.margemMinPct;
    var motivo = Com_texto_(d.motivo, 500) || COM_DEC_MOTIVO;
    var v = Com_gravarMetodologia_(m, eu, motivo + '. Campos: ' + prev.linhas.filter(function (l) { return l.acao === 'APLICAR'; }).map(function (l) { return l.nome + ' (' + l.atualTxt + ' → ' + l.novoTxt + ')'; }).join('; ') + (prev.conflitos ? '. Mantidos (valor da Diretoria): ' + prev.linhas.filter(function (l) { return l.conflito; }).map(function (l) { return l.nome + ' ' + l.atualTxt; }).join('; ') : ''));
    return { versao: v, aplicados: prev.aplicar, conflitos: prev.conflitos, message: 'Política gravada na versão ' + v + ': ' + Com_plural_(prev.aplicar, 'campo recebeu', 'campos receberam') + ' o valor decidido' + (prev.conflitos ? '; ' + Com_plural_(prev.conflitos, 'campo ficou', 'campos ficaram') + ' com o valor que a Diretoria tinha gravado' : '') + '. Próximo passo: "Ver a prévia dos preços".' };
  });
}

/** Prévia dos preços (nada é gravado). Só sobe preço; item sem preço fica de fora (a importação da tabela C1 preenche). */
function ComDec_previaPrecos_(eu) {
  ComDec_exigir_(eu, 'ver a prévia dos preços');
  var pol = ComPr_politica_(), linhas = [], semPreco = 0, iguais = 0;
  Com_ler_(COM_ABAS.PRODUTOS).forEach(function (p) {
    if (Com_up_(p.ATIVO || 'SIM') === 'NAO') return;
    var atual = Com_r2_(Number(p.PRECO) || 0), novo = null, fonte = '';
    if (ComF_temFicha_(p)) { var c = ComF_calcular_(ComF_fichaDe_(p), pol); novo = c.precoSugerido; fonte = c.fonteTxt; }
    else if (Com_up_(p.TIPO) === 'PRODUTO' && Number(p.CUSTO) > 0) { novo = ComPr_precoProduto_(Number(p.CUSTO), pol); fonte = 'peça pela conta com a sobra mínima e os impostos de produto (custo cadastrado ' + Com_moeda_(p.CUSTO) + ')'; }
    else return;
    if (novo === null || !(novo > 0)) return;
    if (!(atual > 0)) { semPreco++; return; }
    if (!(novo > atual + 0.004)) { iguais++; return; }
    linhas.push({ id: Com_s_(p.ID), codigo: Com_s_(p.CODIGO), nome: Com_s_(p.NOME), tipoNome: COM_TIPOS_ITEM[Com_up_(p.TIPO)] || 'Serviço', precoAtual: atual, precoNovo: novo, precoAtualTxt: Com_moeda_(atual), precoNovoTxt: Com_moeda_(novo),
      percentual: Math.round((novo / atual - 1) * 1000000) / 10000, percentualTxt: Com_pct_((novo / atual - 1) * 100, 1), fonte: fonte });
  });
  linhas.sort(function (a, b) { return a.codigo.localeCompare(b.codigo); });
  var marca = Com_marca_(JSON.stringify({ v: pol.versao, l: linhas.map(function (x) { return [x.id, x.precoAtual, x.precoNovo]; }) })).slice(0, 32);
  var antes = linhas.reduce(function (t, x) { return t + x.precoAtual; }, 0), depois = linhas.reduce(function (t, x) { return t + x.precoNovo; }, 0);
  return { linhas: linhas, qtd: linhas.length, semPreco: semPreco, iguais: iguais, marca: marca, politicaVersao: pol.versao, somaAntesTxt: Com_moeda_(antes), somaDepoisTxt: Com_moeda_(depois), motivoPadrao: COM_DEC_MOTIVO };
}

/** Aplica os preços como um lote de reajuste (desfazível). d: { marca, motivo (opcional) } */
function ComDec_aplicarPrecos_(eu, d) {
  ComDec_exigir_(eu, 'aplicar os preços da decisão');
  d = d || {};
  return Com_comTrava_(function () {
    Com_garantirAbas_();
    var prev = ComDec_previaPrecos_(eu);
    if (Com_s_(d.marca) !== prev.marca) throw new Error('Não foi possível aplicar: o catálogo ou a política mudou desde a prévia. Veja a prévia de novo e confira antes de aplicar. Nada foi gravado');
    if (!prev.qtd) return { qtd: 0, message: 'Nenhum preço a subir: o catálogo já está nos valores da decisão' + (prev.semPreco ? ' (' + Com_plural_(prev.semPreco, 'item sem preço ficou', 'itens sem preço ficaram') + ' de fora: use "Importar tabela de preços C1")' : '') + '.' };
    var motivo = Com_texto_(d.motivo, 500) || COM_DEC_MOTIVO, hoje = Com_hoje_(), agora = Com_agora_();
    var lote = Com_proximoNumero_('RJ', COM_ABAS.REAJUSTES, 'LOTE'), registros = [];
    prev.linhas.forEach(function (x) {
      var p = SGO_DATA.getById(COM_ABAS.PRODUTOS, x.id);
      registros.push({ LOTE: lote, PRODUTO_ID: x.id, CODIGO: x.codigo, NOME: x.nome, PRECO_ANTERIOR: x.precoAtual, PRECO_NOVO: x.precoNovo, PRECO_DESDE_ANTERIOR: Com_s_(p && p.PRECO_DESDE),
        PERCENTUAL: x.percentual, ARREDONDAR_PARA: 0.01, INDICE: COM_DEC_INDICE, VIGENCIA: hoje, MOTIVO: motivo + ' (' + x.fonte + ')', SITUACAO: 'APLICADO',
        USUARIO_ID: eu.id, USUARIO_NOME: eu.nome, DATA: agora, APLICADO_EM: agora });
      SGO_DATA.update(COM_ABAS.PRODUTOS, x.id, { PRECO: x.precoNovo, PRECO_DESDE: hoje, ATUALIZADO_POR_NOME: eu.nome + ' (decisão do dono 01/11/2026)', ATUALIZADO_EM: agora });
    });
    SGO_DATA.insertMany(COM_ABAS.REAJUSTES, registros);
    Com_historico_('REAJUSTE', lote, 'APLICADO', eu, { para: 'preços da decisão', texto: Com_plural_(registros.length, 'item', 'itens') + ' passaram ao maior dos valores (tabela, planilha de 30/10/2026 com imposto por fora e conta com a sobra mínima). ' + motivo });
    return { lote: lote, qtd: registros.length, message: 'Preços aplicados no lote ' + lote + ': ' + Com_plural_(registros.length, 'item subiu', 'itens subiram') + ' de preço. As propostas já salvas guardam o preço antigo. Se precisar, use "Desfazer o último reajuste" em Produtos e serviços.' };
  });
}

/**
 * Para rodar no servidor sem tela (origem "editor", como as outras rotinas): prévia por padrão; aplicar exige aplicar: true e a
 * marca da prévia. o: { etapa: 'POLITICA' | 'PRECOS', aplicar, marca, motivo, forcar }. Devolve o resultado (nunca lança).
 */
function Comercial_decisaoDono20261101(o) {
  o = o || {};
  try {
    var eu = { id: 'SISTEMA', nome: 'Rotina do servidor (decisão do dono 01/11/2026)', login: 'sistema', perfil: 'ADMIN', diretoria: true, gestao: true, catalogo: true, veCusto: true, nivel: 'GESTAO' };
    var etapa = Com_up_(o.etapa) || 'POLITICA';
    var r = etapa === 'PRECOS' ? (o.aplicar === true ? ComDec_aplicarPrecos_(eu, o) : ComDec_previaPrecos_(eu)) : (o.aplicar === true ? ComDec_aplicarPolitica_(eu, o) : ComDec_previaPolitica_(eu, o));
    return JSON.parse(JSON.stringify(Object.assign({ ok: true, etapa: etapa, aplicado: o.aplicar === true }, r)));
  } catch (e) { return { ok: false, message: String((e && e.message) || e) }; }
}
