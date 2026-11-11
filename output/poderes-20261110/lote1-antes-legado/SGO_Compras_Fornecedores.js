/****************************************************
 * COMPRAS — CADASTRO DE FORNECEDORES (21/10/2026)
 *
 * O SGO+ não tinha cadastro de fornecedores (a Frota guarda a oficina e o posto como texto solto). Aqui nasce:
 *  - CNPJ (ou CPF, para pessoa física) que não se repete; razão social, nome fantasia e endereço pela consulta de CNPJ
 *    que já existe (SGO_CnpjConsulta.js); contato, telefone, WhatsApp, e-mail para pedidos, categorias, prazo médio,
 *    condição de pagamento e observações.
 *  - Busca por nome antes de criar (evita duplicado) e arquivar sem apagar (com o motivo); reativar quando voltar.
 *  - Importação de planilha (opcional): o comprador cola as linhas copiadas da planilha. CNPJ que já existe só ganha os
 *    campos vazios (nunca sobrescreve o que está preenchido); CNPJ novo vira fornecedor. Primeiro a prévia, depois aplicar.
 * Quem mantém: comprador e gestão de Compras. Quem consulta: também Financeiro e gestores.
 ****************************************************/

function CmpF_doc_(v) { return Cmp_digitos_(v); }
function CmpF_docValido_(d) {
  if (d.length === 14) return typeof SGO_CNPJ_digitosValidos_ === 'function' ? SGO_CNPJ_digitosValidos_(d) : true;
  if (d.length === 11) {
    if (/^(\d)\1{10}$/.test(d)) return false;
    var dv = function (n) { var s = 0; for (var i = 0; i < n; i++) s += Number(d.charAt(i)) * (n + 1 - i); var r = (s * 10) % 11; return r === 10 ? 0 : r; };
    return dv(9) === Number(d.charAt(9)) && dv(10) === Number(d.charAt(10));
  }
  return false;
}
function CmpF_docFmt_(d) {
  d = Cmp_digitos_(d);
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return d;
}
function CmpF_emailOk_(e) { return /^[^\s@<>(),;:"\[\]]+@[^\s@<>(),;:"\[\]]+\.[a-z]{2,}$/i.test(Cmp_s_(e)); }
function CmpF_nome_(f) { return Cmp_s_(f && (f.NOME_FANTASIA || f.RAZAO_SOCIAL)) || Cmp_s_(f && f.RAZAO_SOCIAL); }
function CmpF_ativo_(f) { return Cmp_up_(f.ATIVO || 'SIM') !== 'NAO'; }
function CmpF_norm_(s) { return Cmp_s_(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\b(ltda|me|epp|eireli|s\/?a|comercio|com|de|e|da|do)\b/g, '').replace(/[^a-z0-9]/g, ''); }

function CmpF_paraTela_(f, completo) {
  var t = { id: Cmp_s_(f.ID), codigo: Cmp_s_(f.CODIGO), tipoPessoa: Cmp_up_(f.TIPO_PESSOA) || 'PJ', documento: CmpF_docFmt_(f.DOCUMENTO), razao: Cmp_s_(f.RAZAO_SOCIAL),
    fantasia: Cmp_s_(f.NOME_FANTASIA), nome: CmpF_nome_(f), cidade: [Cmp_s_(f.CIDADE), Cmp_s_(f.UF)].filter(Boolean).join('/'), contato: Cmp_s_(f.CONTATO),
    telefone: Cmp_s_(f.TELEFONE), whatsapp: Cmp_s_(f.WHATSAPP), email: Cmp_s_(f.EMAIL_PEDIDOS), categorias: Cmp_s_(f.CATEGORIAS) ? Cmp_s_(f.CATEGORIAS).split(/\s*;\s*/) : [],
    prazoMedioDias: Cmp_s_(f.PRAZO_MEDIO_DIAS), ativo: CmpF_ativo_(f), arquivadoMotivo: Cmp_s_(f.ARQUIVADO_MOTIVO) };
  if (completo) {
    t.endereco = Cmp_s_(f.ENDERECO); t.cidadeNome = Cmp_s_(f.CIDADE); t.uf = Cmp_s_(f.UF); t.condicaoPagamento = Cmp_s_(f.CONDICAO_PAGAMENTO); t.obs = Cmp_s_(f.OBS);
    t.atualizadoEm = Cmp_br_(f.ATUALIZADO_EM); t.atualizadoPor = Cmp_s_(f.ATUALIZADO_POR_NOME) || Cmp_s_(f.CRIADO_POR_NOME); t.origem = Cmp_s_(f.ORIGEM);
  }
  return t;
}

function CmpF_listar_(eu, d) {
  Cmp_exigir_(eu, 'VALORES', 'ver os fornecedores');
  d = d || {};
  var q = CmpF_norm_(d.busca), dig = Cmp_digitos_(d.busca), incl = !!d.incluirArquivados;
  return Cmp_ler_(CMP_ABAS.FORNECEDORES).filter(function (f) {
    if (!incl && !CmpF_ativo_(f)) return false;
    if (d.categoria && (Cmp_s_(f.CATEGORIAS).split(/\s*;\s*/).indexOf(d.categoria) < 0)) return false;
    if (!q && !dig) return true;
    return (q && (CmpF_norm_(f.RAZAO_SOCIAL).indexOf(q) >= 0 || CmpF_norm_(f.NOME_FANTASIA).indexOf(q) >= 0 || CmpF_norm_(f.CONTATO).indexOf(q) >= 0)) ||
      (dig.length >= 4 && Cmp_digitos_(f.DOCUMENTO).indexOf(dig) >= 0);
  }).map(function (f) { return CmpF_paraTela_(f, false); }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
}

/** Ficha do fornecedor com o histórico de compras (quem vendeu o quê e por quanto). */
function CmpF_detalhe_(eu, id) {
  Cmp_exigir_(eu, 'VALORES', 'ver o fornecedor');
  var f = SGO_DATA.getById(CMP_ABAS.FORNECEDORES, Cmp_s_(id));
  if (!f) throw new Error('Não foi possível abrir o fornecedor: ele não foi encontrado. Atualize a lista');
  var t = CmpF_paraTela_(f, true);
  var reqs = {};
  Cmp_ler_(CMP_ABAS.REQUISICOES).forEach(function (r) { reqs[Cmp_s_(r.ID)] = r; });
  t.compras = Cmp_ler_(CMP_ABAS.PEDIDOS).filter(function (p) { return Cmp_s_(p.FORNECEDOR_ID) === t.id; }).map(function (p) {
    var r = reqs[Cmp_s_(p.REQUISICAO_ID)] || {};
    return { numero: Cmp_s_(p.NUMERO) || 'Compra sem pedido', requisicao: Cmp_s_(p.REQUISICAO_NUMERO), titulo: Cmp_s_(r.TITULO), em: Cmp_brDia_(p.EMITIDO_EM || p.CRIADO_EM),
      valorTxt: Cmp_moeda_(p.VALOR_TOTAL), situacao: CMP_SITUACOES[Cmp_up_(r.SITUACAO)] || '' };
  }).reverse().slice(0, 50);
  t.cotacoes = Cmp_ler_(CMP_ABAS.COTACOES).filter(function (c) { return Cmp_s_(c.FORNECEDOR_ID) === t.id; }).length;
  return t;
}

/** Fornecedores com o mesmo documento ou nome parecido (aviso antes de criar). */
function CmpF_parecidos_(doc, nome, exceto) {
  var n = CmpF_norm_(nome);
  return Cmp_ler_(CMP_ABAS.FORNECEDORES).filter(function (f) {
    if (exceto && Cmp_s_(f.ID) === exceto) return false;
    if (doc && Cmp_digitos_(f.DOCUMENTO) === doc) return true;
    return n.length >= 5 && (CmpF_norm_(f.RAZAO_SOCIAL) === n || CmpF_norm_(f.NOME_FANTASIA) === n);
  });
}

/** Criar ou editar. d: { id, tipoPessoa, documento, razao, fantasia, endereco, cidade, uf, contato, telefone, whatsapp, email, categorias[], prazoMedioDias, condicaoPagamento, obs, confirmarParecido } */
function CmpF_salvar_(eu, d) {
  Cmp_exigir_(eu, 'COMPRADOR', 'salvar o fornecedor');
  d = d || {};
  var doc = CmpF_doc_(d.documento), tipo = doc.length === 11 ? 'PF' : 'PJ';
  if (doc && !CmpF_docValido_(doc)) throw new Error('Não foi possível salvar: o ' + (doc.length === 11 ? 'CPF' : 'CNPJ') + ' ' + CmpF_docFmt_(doc) + ' não confere (dígitos verificadores). Confira o número no orçamento ou na nota do fornecedor e salve de novo');
  if (!doc) throw new Error('Não foi possível salvar: informe o CNPJ (ou o CPF, se for pessoa física). É ele que impede o mesmo fornecedor cadastrado duas vezes. Está no orçamento ou na nota fiscal do fornecedor');
  var razao = Cmp_texto_(d.razao, 160);
  if (razao.length < 3) throw new Error('Não foi possível salvar: escreva a razão social (ou o nome, para pessoa física). Use "Consultar CNPJ" para preencher sozinho');
  var email = Cmp_s_(d.email).toLowerCase();
  if (email && !CmpF_emailOk_(email)) throw new Error('Não foi possível salvar: o e-mail para pedidos "' + email + '" não parece válido. Corrija (exemplo: compras@fornecedor.com.br) ou deixe em branco');
  var prazo = Cmp_s_(d.prazoMedioDias) === '' ? '' : Cmp_num_(d.prazoMedioDias);
  if (prazo !== '' && !(prazo >= 0 && prazo <= 365)) throw new Error('Não foi possível salvar: o prazo médio de entrega fica entre 0 e 365 dias. Corrija ou deixe em branco');
  var cats = (Array.isArray(d.categorias) ? d.categorias : []).map(Cmp_s_).filter(function (c) { return CMP_CATEGORIAS_FORNECEDOR.indexOf(c) >= 0; });
  return Cmp_comTrava_(function () {
    var id = Cmp_s_(d.id), atual = id ? SGO_DATA.getById(CMP_ABAS.FORNECEDORES, id) : null;
    if (id && !atual) throw new Error('Não foi possível salvar: o fornecedor não foi encontrado. Atualize a lista');
    var mesmoDoc = Cmp_ler_(CMP_ABAS.FORNECEDORES).filter(function (f) { return Cmp_digitos_(f.DOCUMENTO) === doc && Cmp_s_(f.ID) !== id; })[0];
    if (mesmoDoc) throw new Error('Não foi possível salvar: o ' + (tipo === 'PF' ? 'CPF' : 'CNPJ') + ' ' + CmpF_docFmt_(doc) + ' já está cadastrado como ' + CmpF_nome_(mesmoDoc) + (CmpF_ativo_(mesmoDoc) ? '' : ' (arquivado: reative em Compras > Fornecedores, "Mostrar arquivados")') + '. Abra esse cadastro e atualize os dados lá');
    if (!id && !d.confirmarParecido) {
      var par = CmpF_parecidos_('', d.fantasia || razao, '');
      if (par.length) return { parecidos: par.map(function (f) { return CmpF_paraTela_(f, false); }), message: 'Já existe fornecedor com nome parecido: ' + par.map(CmpF_nome_).join(', ') + '. Se for outro fornecedor, toque em "Salvar mesmo assim".' };
    }
    var agora = Cmp_agora_();
    var campos = { TIPO_PESSOA: tipo, DOCUMENTO: doc, RAZAO_SOCIAL: razao, NOME_FANTASIA: Cmp_texto_(d.fantasia, 160), ENDERECO: Cmp_texto_(d.endereco, 300), CIDADE: Cmp_texto_(d.cidade, 80),
      UF: Cmp_up_(d.uf).slice(0, 2), CONTATO: Cmp_texto_(d.contato, 120), TELEFONE: Cmp_texto_(d.telefone, 40), WHATSAPP: Cmp_texto_(d.whatsapp, 40), EMAIL_PEDIDOS: email,
      CATEGORIAS: cats.join('; '), PRAZO_MEDIO_DIAS: prazo === '' ? '' : Math.round(prazo), CONDICAO_PAGAMENTO: Cmp_texto_(d.condicaoPagamento, 200), OBS: Cmp_texto_(d.obs, 1000),
      ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: agora };
    var salvo;
    if (atual) { SGO_DATA.update(CMP_ABAS.FORNECEDORES, id, campos); salvo = Object.assign({}, atual, campos); Cmp_historico_('FORNECEDOR', id, 'EDICAO', eu, { texto: 'Cadastro atualizado.' }); }
    else {
      campos.CODIGO = Cmp_proximoNumero_('FOR', CMP_ABAS.FORNECEDORES, 'CODIGO', true); campos.ATIVO = 'SIM'; campos.ORIGEM = 'TELA'; campos.CRIADO_POR_ID = eu.id; campos.CRIADO_POR_NOME = eu.nome;
      salvo = SGO_DATA.insert(CMP_ABAS.FORNECEDORES, campos);
      Cmp_historico_('FORNECEDOR', salvo.ID, 'CRIACAO', eu, { texto: 'Fornecedor cadastrado: ' + CmpF_nome_(salvo) + ' (' + CmpF_docFmt_(doc) + ').' });
    }
    return { fornecedor: CmpF_paraTela_(salvo, true), message: atual ? 'Fornecedor atualizado.' : 'Fornecedor ' + salvo.CODIGO + ' cadastrado.' };
  });
}

function CmpF_arquivar_(eu, d) {
  Cmp_exigir_(eu, 'COMPRADOR', 'arquivar o fornecedor');
  d = d || {};
  var reativar = d.reativar === true, motivo = Cmp_texto_(d.motivo, 500);
  if (!reativar && motivo.length < 10) throw new Error('Não foi possível arquivar: escreva o motivo (pelo menos 10 letras), por exemplo "Fechou a empresa" ou "Entregas atrasadas repetidas". O fornecedor não é apagado: sai da escolha e continua no histórico das compras');
  return Cmp_comTrava_(function () {
    var f = SGO_DATA.getById(CMP_ABAS.FORNECEDORES, Cmp_s_(d.id));
    if (!f) throw new Error('Não foi possível: o fornecedor não foi encontrado. Atualize a lista');
    var campos = reativar ? { ATIVO: 'SIM', ARQUIVADO_EM: '', ARQUIVADO_MOTIVO: '', ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: Cmp_agora_() } :
      { ATIVO: 'NAO', ARQUIVADO_EM: Cmp_agora_(), ARQUIVADO_MOTIVO: motivo, ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: Cmp_agora_() };
    SGO_DATA.update(CMP_ABAS.FORNECEDORES, f.ID, campos);
    Cmp_historico_('FORNECEDOR', f.ID, reativar ? 'REATIVADO' : 'ARQUIVADO', eu, { texto: reativar ? 'Fornecedor reativado.' : motivo });
    return { fornecedor: CmpF_paraTela_(Object.assign({}, f, campos), true), message: reativar ? 'Fornecedor reativado.' : 'Fornecedor arquivado. Ele não aparece mais para escolha; o histórico continua.' };
  });
}

/** Consulta de CNPJ (preenche razão social, nome fantasia, endereço, cidade, UF, telefone e e-mail). */
function CmpF_consultarCnpj_(eu, d) {
  Cmp_exigir_(eu, 'COMPRADOR', 'consultar o CNPJ');
  if (typeof SGO_CNPJ_consultarDados_ !== 'function') throw new Error('Não foi possível consultar: a consulta de CNPJ não está disponível neste servidor. Preencha à mão');
  var doc = CmpF_doc_(d && d.documento);
  var dados;
  try { dados = SGO_CNPJ_consultarDados_(doc); } catch (e) { throw new Error('Não foi possível consultar o CNPJ: ' + String((e && e.message) || e).replace(/[.\s]+$/, '')); }
  var end = [[Cmp_s_(dados.descricao_tipo_de_logradouro), Cmp_s_(dados.logradouro)].filter(Boolean).join(' '), Cmp_s_(dados.numero), Cmp_s_(dados.complemento), Cmp_s_(dados.bairro)].filter(Boolean).join(', ');
  var fone = Cmp_s_(dados.ddd_telefone_1);
  var ja = Cmp_ler_(CMP_ABAS.FORNECEDORES).filter(function (f) { return Cmp_digitos_(f.DOCUMENTO) === doc; })[0];
  return { dados: { documento: CmpF_docFmt_(doc), razao: Cmp_s_(dados.razao_social), fantasia: Cmp_s_(dados.nome_fantasia), endereco: end + (Cmp_s_(dados.cep) ? ' · CEP ' + Cmp_s_(dados.cep) : ''),
    cidade: Cmp_s_(dados.municipio), uf: Cmp_s_(dados.uf), telefone: fone, email: Cmp_s_(dados.email).toLowerCase(), situacao: Cmp_s_(dados.descricao_situacao_cadastral) },
    jaCadastrado: ja ? CmpF_paraTela_(ja, false) : null,
    message: ja ? 'Este CNPJ já está cadastrado como ' + CmpF_nome_(ja) + '. Abra esse cadastro para atualizar.' : 'Dados preenchidos pela consulta do CNPJ. Confira e complete o contato e o e-mail para pedidos.' };
}

// ------------------------------------------------------------
// IMPORTAÇÃO DE PLANILHA (só preenche; nunca sobrescreve)
// ------------------------------------------------------------
var CMPF_COLUNAS_IMPORT = [
  ['DOCUMENTO', /^(cnpj|cpf|cnpj\/cpf|documento)$/], ['RAZAO_SOCIAL', /^(razao social|razao|nome|fornecedor)$/], ['NOME_FANTASIA', /^(nome fantasia|fantasia)$/],
  ['CONTATO', /^(contato|vendedor|responsavel)$/], ['TELEFONE', /^(telefone|fone|tel)$/], ['WHATSAPP', /^(whatsapp|celular)$/], ['EMAIL_PEDIDOS', /^(e-?mail|email para pedidos|e-?mail de pedidos)$/],
  ['CATEGORIAS', /^(categoria|categorias|ramo)$/], ['PRAZO_MEDIO_DIAS', /^(prazo|prazo medio|prazo medio \(dias\)|prazo de entrega)$/], ['CIDADE', /^(cidade|municipio)$/], ['UF', /^(uf|estado)$/],
  ['ENDERECO', /^(endereco)$/], ['CONDICAO_PAGAMENTO', /^(condicao|condicao de pagamento|pagamento)$/], ['OBS', /^(obs|observacao|observacoes)$/]
];

/** Lê o texto colado (linhas da planilha, separadas por tabulação ou ponto e vírgula, com a linha de títulos). */
function CmpF_lerColado_(texto) {
  var linhas = String(texto || '').replace(/\r\n?/g, '\n').split('\n').filter(function (l) { return l.trim(); });
  if (linhas.length < 2) throw new Error('Não foi possível ler: cole a linha de títulos (CNPJ, Razão social...) e pelo menos uma linha de fornecedor, copiadas da planilha');
  var sep = linhas[0].indexOf('\t') >= 0 ? '\t' : (linhas[0].indexOf(';') >= 0 ? ';' : ',');
  var norm = function (s) { return Cmp_s_(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' '); };
  var cab = linhas[0].split(sep).map(norm);
  var mapa = cab.map(function (c) { var m = CMPF_COLUNAS_IMPORT.filter(function (x) { return x[1].test(c); })[0]; return m ? m[0] : ''; });
  if (mapa.indexOf('DOCUMENTO') < 0 || mapa.indexOf('RAZAO_SOCIAL') < 0) throw new Error('Não foi possível ler: a primeira linha precisa ter as colunas "CNPJ" e "Razão social" (outras reconhecidas: Nome fantasia, Contato, Telefone, WhatsApp, E-mail, Categoria, Prazo, Cidade, UF, Endereço, Condição, Observações). Ajuste os títulos na planilha e cole de novo');
  return linhas.slice(1, 501).map(function (l, i) {
    var cols = l.split(sep), o = { linha: i + 2 };
    mapa.forEach(function (k, j) { if (k) o[k] = Cmp_s_(cols[j]).replace(/^"|"$/g, ''); });
    return o;
  });
}

/** Prévia (aplicar=false) ou aplicação da importação. Devolve { novos, completados, iguais, recusados: [{linha, motivo}] }. */
function CmpF_importar_(eu, d) {
  Cmp_exigir_(eu, 'COMPRADOR', 'importar fornecedores');
  var linhas = CmpF_lerColado_(d && d.texto), aplicar = !!(d && d.aplicar);
  var r = { novos: [], completados: [], iguais: 0, recusados: [] };
  var exec = function () {
    var existentes = {};
    Cmp_ler_(CMP_ABAS.FORNECEDORES).forEach(function (f) { existentes[Cmp_digitos_(f.DOCUMENTO)] = f; });
    var vistos = {};
    linhas.forEach(function (o) {
      var doc = Cmp_digitos_(o.DOCUMENTO);
      if (!doc || !CmpF_docValido_(doc)) { r.recusados.push({ linha: o.linha, motivo: 'CNPJ/CPF ausente ou inválido (' + (o.DOCUMENTO || 'vazio') + ')' }); return; }
      if (vistos[doc]) { r.recusados.push({ linha: o.linha, motivo: 'CNPJ repetido na própria planilha (linha ' + vistos[doc] + ')' }); return; }
      vistos[doc] = o.linha;
      if (Cmp_s_(o.EMAIL_PEDIDOS) && !CmpF_emailOk_(o.EMAIL_PEDIDOS)) o.EMAIL_PEDIDOS = '';
      if (o.CATEGORIAS) o.CATEGORIAS = o.CATEGORIAS.split(/\s*[;,/]\s*/).filter(function (c) { return CMP_CATEGORIAS_FORNECEDOR.indexOf(c) >= 0; }).join('; ');
      if (o.PRAZO_MEDIO_DIAS) { var p = Cmp_num_(o.PRAZO_MEDIO_DIAS); o.PRAZO_MEDIO_DIAS = p >= 0 && p <= 365 ? Math.round(p) : ''; }
      var atual = existentes[doc];
      if (atual) {
        // regra do dono: importação em massa só preenche o que está vazio; o que já foi digitado nunca é trocado
        var campos = {};
        Object.keys(o).forEach(function (k) { if (k !== 'linha' && k !== 'DOCUMENTO' && Cmp_s_(o[k]) && !Cmp_s_(atual[k])) campos[k] = Cmp_texto_(o[k], 300); });
        if (!Object.keys(campos).length) { r.iguais++; return; }
        r.completados.push({ linha: o.linha, nome: CmpF_nome_(atual), campos: Object.keys(campos) });
        if (aplicar) { campos.ATUALIZADO_POR_NOME = eu.nome; campos.ATUALIZADO_EM = Cmp_agora_(); SGO_DATA.update(CMP_ABAS.FORNECEDORES, atual.ID, campos); }
        return;
      }
      if (Cmp_s_(o.RAZAO_SOCIAL).length < 3) { r.recusados.push({ linha: o.linha, motivo: 'sem razão social' }); return; }
      r.novos.push({ linha: o.linha, nome: Cmp_s_(o.NOME_FANTASIA) || Cmp_s_(o.RAZAO_SOCIAL), documento: CmpF_docFmt_(doc) });
      if (aplicar) {
        var novo = { TIPO_PESSOA: doc.length === 11 ? 'PF' : 'PJ', DOCUMENTO: doc, ATIVO: 'SIM', ORIGEM: 'PLANILHA', CRIADO_POR_ID: eu.id, CRIADO_POR_NOME: eu.nome, ATUALIZADO_POR_NOME: eu.nome, ATUALIZADO_EM: Cmp_agora_() };
        Object.keys(o).forEach(function (k) { if (k !== 'linha' && k !== 'DOCUMENTO') novo[k] = Cmp_texto_(o[k], 300); });
        novo.CODIGO = Cmp_proximoNumero_('FOR', CMP_ABAS.FORNECEDORES, 'CODIGO', true);
        var ins = SGO_DATA.insert(CMP_ABAS.FORNECEDORES, novo);
        existentes[doc] = ins;
      }
    });
    if (aplicar) Cmp_historico_('FORNECEDOR', 'IMPORTACAO', 'IMPORTACAO', eu, { texto: r.novos.length + ' novos, ' + r.completados.length + ' completados (só campos vazios), ' + r.recusados.length + ' recusados.' });
    return r;
  };
  r = aplicar ? Cmp_comTrava_(exec) : exec();
  r.message = (aplicar ? 'Importação aplicada: ' : 'Prévia: ') + Cmp_plural_(r.novos.length, 'fornecedor novo', 'fornecedores novos') + ', ' + Cmp_plural_(r.completados.length, 'cadastro completado', 'cadastros completados') +
    ' (só campos vazios; nada já preenchido é trocado), ' + Cmp_plural_(r.iguais, 'sem mudança', 'sem mudança') + ', ' + Cmp_plural_(r.recusados.length, 'linha recusada', 'linhas recusadas') + '.' +
    (aplicar ? '' : ' Confira e toque em "Aplicar a importação".');
  return r;
}
