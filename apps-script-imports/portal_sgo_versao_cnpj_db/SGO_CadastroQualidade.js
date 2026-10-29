/****************************************************
 * CADASTROS — CADASTRO COMPLETO, "CIENTE" E CORREÇÕES DE CADASTRO (29/10/2026)
 *
 * Pedido do dono (29/10/2026): "Coloca como obrigatoriedade o preenchimento correto do cliente e cria um aviso que o
 * não preenchimento pode acarretar em problemas futuros, então sempre peça ao cliente os dados corretos e completos
 * para cadastros e não vá buscar informalmente no Google. E coloca um botão 'Ciente' para quando fizermos a
 * rastreabilidade do problema identificarmos quem foi, e mostrar os erros em relatório para não serem mais cometidos."
 * e "Um campo para mostrar erros de clientes e produtos cadastrados errados ou duplicados, onde mostra para tomar a
 * ação de correção."
 *
 * Regras:
 *  - Cliente, ao CRIAR ou ALTERAR pela tela de Clientes (computador e celular): CNPJ ou CPF válido (dígito
 *    verificador), razão social, endereço completo (CEP, logradouro, número, bairro, cidade, UF) e o contato
 *    responsável com nome, e-mail válido e telefone. Unidade: cidade e UF. Sem isso não salva e a resposta diz cada
 *    campo que falta (faltam: [{ campo, texto }]).
 *  - Caixa "Ciente — os dados foram informados pelo cliente" obrigatória para salvar. Grava quem e quando no próprio
 *    cadastro (CIENTE_POR_NOME, CIENTE_EM) e uma linha no histórico (HIST_CADASTROS) com os campos que mudaram (de/para).
 *  - Cadastro antigo incompleto abre e funciona normalmente (propostas, O.S., certificados não são bloqueados); só ao
 *    salvar uma alteração precisa completar. Aparece como "a completar" em Cadastros > Correções de cadastro.
 *  - Outros caminhos que criam cliente (cadastro rápido do Certificado de calibração, aplicativo de campo da
 *    Assistência, sincronização do Auvo, importação do CRM) continuam como estavam: o que vier incompleto aparece em
 *    Correções de cadastro, com quem cadastrou.
 *  - Correções de cadastro: clientes e unidades (CNPJ/CPF inválido, endereço incompleto, contato sem e-mail ou
 *    telefone, unidade sem cidade/UF, possíveis duplicados) e produtos/serviços do catálogo (sem preço, sem unidade,
 *    preço abaixo do custo só para quem vê custo, nomes repetidos). Diretoria e Administrador veem tudo e juntam
 *    duplicados; os demais veem os problemas dos cadastros que eles mesmos fizeram e corrigem.
 *  - Juntar clientes/unidades usa a consolidação de Vínculos (SGO_Vinculos.js: prévia, trava, auditoria em
 *    SYS_VINCULOS_AUDITORIA): unidades, equipamentos, documentos, contatos, ligação com o Auvo, oportunidades,
 *    propostas e contatos registrados do Comercial vão para o cadastro que fica; certificados, laudos e atendimentos
 *    ficam no cadastro original (regra de Vínculos); qualquer outra tabela ligada trava a junção e a prévia diz qual.
 *    O que sai fica INATIVO com JUNTADO_COM_ID (nunca apagado).
 *  - Juntar produtos: o item que sai fica arquivado com JUNTADO_COM_ID; propostas (ITENS_JSON.produtoId) e itens de
 *    compra (CMP_ITENS.PRODUTO_ID) passam a apontar o item que fica. Histórico de preço e de reajustes fica com o item
 *    original (o "Desfazer" do reajuste continua mexendo só no item daquele lote).
 *  - "Não é duplicado": o par não volta à lista (linha NAO_DUPLICADO no histórico).
 *  - Relatório "Qualidade dos cadastros" (Diretoria e Administrador): por pessoa e período.
 * Nenhuma função devolve Date cru.
 ****************************************************/

var CADQ_ABA_HIST = 'HIST_CADASTROS';
var CADQ_COLS_HIST = ['ID', 'DATA', 'USUARIO_ID', 'USUARIO_NOME', 'PERFIL', 'ENTIDADE', 'REGISTRO_ID', 'REGISTRO_NOME', 'ACAO', 'ORIGEM', 'CIENTE',
  'CAMPOS_JSON', 'PROBLEMAS_ANTES', 'PROBLEMAS_DEPOIS', 'DETALHE', 'CRIADO_EM'];
var CADQ_COLS_CLIENTE = ['CPF', 'CEP', 'LOGRADOURO', 'NUMERO', 'COMPLEMENTO', 'BAIRRO', 'CIDADE', 'UF', 'CRIADO_POR_ID', 'CRIADO_POR_NOME', 'ATUALIZADO_POR_NOME', 'ATUALIZADO_EM',
  'CIENTE_POR_NOME', 'CIENTE_EM', 'JUNTADO_COM_ID', 'JUNTADO_EM', 'JUNTADO_POR_NOME'];
var CADQ_COLS_UNIDADE = ['CRIADO_POR_ID', 'CRIADO_POR_NOME', 'ATUALIZADO_POR_NOME', 'ATUALIZADO_EM', 'CIENTE_POR_NOME', 'CIENTE_EM', 'JUNTADO_COM_ID', 'JUNTADO_EM', 'JUNTADO_POR_NOME'];
var CADQ_AVISO = 'Os dados devem ser pedidos ao cliente, completos e corretos. Não use informação buscada na internet. Cadastro incompleto ou errado pode causar problemas futuros (nota fiscal, certificado, cobrança e documentos com dados errados).';
var CADQ_CIENTE = 'Ciente — os dados foram informados pelo cliente';
var CADQ_UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
var CADQ_ROTULOS = {
  CNPJ: 'CNPJ ou CPF', CPF: 'CPF', RAZAO_SOCIAL: 'razão social', CEP: 'CEP', LOGRADOURO: 'logradouro (rua, avenida)', NUMERO: 'número', BAIRRO: 'bairro',
  CIDADE: 'cidade', UF: 'UF', CONTATO: 'nome do contato responsável', EMAIL: 'e-mail do contato', TELEFONE: 'telefone do contato (com DDD)',
  NOME_UNIDADE: 'nome da unidade', CNPJ_UNIDADE: 'CNPJ da unidade', CIENTE: 'Ciente', PRECO: 'preço de venda', UNIDADE_MEDIDA: 'unidade (un., h, kit...)'
};
/** Campos do cliente e da unidade que vão para o histórico (de/para). */
var CADQ_CAMPOS_HIST = {
  CLIENTE: ['RAZAO_SOCIAL', 'NOME_FANTASIA', 'CNPJ', 'CPF', 'CEP', 'LOGRADOURO', 'NUMERO', 'COMPLEMENTO', 'BAIRRO', 'CIDADE', 'UF', 'ENDERECO', 'CONTATO', 'EMAIL', 'TELEFONE', 'STATUS'],
  UNIDADE: ['NOME_UNIDADE', 'CNPJ_UNIDADE', 'ENDERECO', 'CIDADE', 'UF', 'RESPONSAVEL', 'TELEFONE', 'STATUS'],
  PRODUTO: ['CODIGO', 'NOME', 'TIPO', 'CATEGORIA', 'UNIDADE_MEDIDA', 'DESCRICAO', 'PRECO', 'CUSTO', 'ATIVO']
};
/** Campos que a Diretoria escolhe, um a um, ao juntar dois cadastros (a identificação fica a do cadastro que fica). */
var CADQ_CAMPOS_JUNTAR = {
  CLIENTE: ['RAZAO_SOCIAL', 'NOME_FANTASIA', 'CEP', 'LOGRADOURO', 'NUMERO', 'COMPLEMENTO', 'BAIRRO', 'CIDADE', 'UF', 'ENDERECO', 'CONTATO', 'EMAIL', 'TELEFONE'],
  UNIDADE: ['NOME_UNIDADE', 'ENDERECO', 'CIDADE', 'UF', 'RESPONSAVEL', 'TELEFONE'],
  PRODUTO: ['NOME', 'TIPO', 'CATEGORIA', 'UNIDADE_MEDIDA', 'DESCRICAO', 'PRECO', 'CUSTO']
};
var CADQ_NOMES_CAMPO = {
  RAZAO_SOCIAL: 'Razão social', NOME_FANTASIA: 'Nome fantasia', CNPJ: 'CNPJ', CPF: 'CPF', CEP: 'CEP', LOGRADOURO: 'Logradouro', NUMERO: 'Número', COMPLEMENTO: 'Complemento',
  BAIRRO: 'Bairro', CIDADE: 'Cidade', UF: 'UF', ENDERECO: 'Endereço (texto completo)', CONTATO: 'Contato responsável', EMAIL: 'E-mail', TELEFONE: 'Telefone', STATUS: 'Situação',
  NOME_UNIDADE: 'Nome da unidade', CNPJ_UNIDADE: 'CNPJ da unidade', RESPONSAVEL: 'Responsável no local', CODIGO: 'Código', NOME: 'Nome', TIPO: 'Tipo', CATEGORIA: 'Categoria',
  UNIDADE_MEDIDA: 'Unidade', DESCRICAO: 'Descrição', PRECO: 'Preço de venda', CUSTO: 'Custo', ATIVO: 'Ativo'
};

function CadQ_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function CadQ_up_(v) { return CadQ_s_(v).toUpperCase(); }
function CadQ_dig_(v) { return CadQ_s_(v).replace(/\D/g, ''); }
function CadQ_tem_(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
function CadQ_agora_() { return SGO_UTILS.nowIso(); }
function CadQ_dia_(v) { var s = CadQ_s_(v), m; if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) return m[0]; if ((m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s))) return m[3] + '-' + m[2] + '-' + m[1]; return ''; }
function CadQ_ativo_(r) { return !!r && CadQ_up_(r.STATUS || 'ATIVO') === 'ATIVO' && !CadQ_s_(r.JUNTADO_COM_ID); }
function CadQ_lerSeguro_(aba) { try { return SGO_DATA.getAll(aba); } catch (e) { return []; } }
function CadQ_ciente_(p) { var v = p && p.CIENTE; return v === true || CadQ_up_(v) === 'SIM' || CadQ_up_(v) === 'TRUE'; }

/** Colunas novas (só acrescentadas, nada é apagado) e a aba do histórico. Uma vez a cada 6 horas. */
function CadQ_garantirColunas_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('CADQ_COLUNAS_OK_V1')) return; } catch (e) { cache = null; }
  if (typeof CertCal_garantirColuna_ !== 'function') return;
  var abaC = (SGO_CFG && SGO_CFG.SHEETS && SGO_CFG.SHEETS.CAD_CLIENTES) || 'CAD_CLIENTES', abaU = (SGO_CFG && SGO_CFG.SHEETS && SGO_CFG.SHEETS.CAD_UNIDADES) || 'CAD_UNIDADES';
  CADQ_COLS_CLIENTE.forEach(function (c) { CertCal_garantirColuna_(abaC, c); });
  CADQ_COLS_UNIDADE.forEach(function (c) { CertCal_garantirColuna_(abaU, c); });
  if (typeof CertCal_forcarColunaTexto_ === 'function') ['CPF', 'CEP', 'NUMERO', 'ATUALIZADO_EM', 'CIENTE_EM', 'JUNTADO_EM'].forEach(function (c) { CertCal_forcarColunaTexto_(abaC, c); });
  if (typeof CertCal_garantirTabela_ === 'function') CertCal_garantirTabela_(CADQ_ABA_HIST, CADQ_COLS_HIST);
  CADQ_COLS_HIST.forEach(function (c) { CertCal_garantirColuna_(CADQ_ABA_HIST, c); });
  if (typeof CertCal_forcarColunaTexto_ === 'function') CertCal_forcarColunaTexto_(CADQ_ABA_HIST, 'DATA');
  try { if (cache) cache.put('CADQ_COLUNAS_OK_V1', '1', 21600); } catch (e) {}
}

// ------------------------------------------------------------
// REGRAS (funções puras; o servidor confere sempre)
// ------------------------------------------------------------
function CadQ_cnpjOk_(v) { var d = typeof SGO_UTILS.cnpjArmazenado === 'function' ? SGO_UTILS.cnpjArmazenado(v) : CadQ_dig_(v); return d.length === 14 && SGO_UTILS.isCnpj(d); }
function CadQ_cpfOk_(v) { return typeof SGO_UTILS.isCpf === 'function' && SGO_UTILS.isCpf(v); }
function CadQ_emailsOk_(v) {
  var l = CadQ_s_(v).split(/[\s,;]+/).filter(Boolean);
  return l.length > 0 && l.every(function (e) { return SGO_UTILS.isEmail(e); });
}
function CadQ_telefoneOk_(v) { var d = CadQ_dig_(v); if (d.length > 11 && d.indexOf('55') === 0) d = d.slice(2); return d.length === 10 || d.length === 11; }
function CadQ_problema_(codigo, campos, texto) { return { codigo: codigo, campos: campos, texto: texto }; }

/** Problemas do cadastro do cliente (lista vazia = completo). */
function CadQ_problemasCliente_(c) {
  c = c || {};
  var p = [], cnpj = CadQ_dig_(c.CNPJ), cpf = CadQ_dig_(c.CPF);
  if (!cnpj && !cpf) p.push(CadQ_problema_('DOC_FALTA', ['CNPJ'], 'Sem CNPJ nem CPF'));
  if (cnpj && !CadQ_cnpjOk_(c.CNPJ)) p.push(CadQ_problema_('CNPJ_INVALIDO', ['CNPJ'], 'CNPJ inválido (os dígitos verificadores não conferem)'));
  if (cpf && !CadQ_cpfOk_(c.CPF)) p.push(CadQ_problema_('CPF_INVALIDO', ['CPF'], 'CPF inválido (os dígitos verificadores não conferem)'));
  if (!CadQ_s_(c.RAZAO_SOCIAL)) p.push(CadQ_problema_('RAZAO_FALTA', ['RAZAO_SOCIAL'], 'Sem razão social'));
  var faltaEnd = [];
  if (CadQ_dig_(c.CEP).length !== 8) faltaEnd.push('CEP');
  ['LOGRADOURO', 'NUMERO', 'BAIRRO', 'CIDADE'].forEach(function (k) { if (!CadQ_s_(c[k])) faltaEnd.push(k); });
  if (CADQ_UFS.indexOf(CadQ_up_(c.UF)) < 0) faltaEnd.push('UF');
  if (faltaEnd.length) p.push(CadQ_problema_('ENDERECO_INCOMPLETO', faltaEnd, 'Endereço incompleto: falta ' + faltaEnd.map(function (k) { return CADQ_ROTULOS[k]; }).join(', ') +
    (CadQ_s_(c.ENDERECO) && faltaEnd.length >= 5 ? ' (o endereço antigo está num campo só: "' + CadQ_s_(c.ENDERECO).slice(0, 80) + '")' : '')));
  if (!CadQ_s_(c.CONTATO)) p.push(CadQ_problema_('CONTATO_FALTA', ['CONTATO'], 'Sem o nome do contato responsável'));
  if (!CadQ_s_(c.EMAIL)) p.push(CadQ_problema_('EMAIL_FALTA', ['EMAIL'], 'Contato sem e-mail'));
  else if (!CadQ_emailsOk_(c.EMAIL)) p.push(CadQ_problema_('EMAIL_INVALIDO', ['EMAIL'], 'E-mail inválido'));
  if (!CadQ_dig_(c.TELEFONE)) p.push(CadQ_problema_('TELEFONE_FALTA', ['TELEFONE'], 'Contato sem telefone'));
  else if (!CadQ_telefoneOk_(c.TELEFONE)) p.push(CadQ_problema_('TELEFONE_INVALIDO', ['TELEFONE'], 'Telefone inválido (use DDD e número: 10 ou 11 algarismos)'));
  return p;
}

/** Problemas da unidade: cidade e UF obrigatórias; nome; CNPJ (quando houver) válido. */
function CadQ_problemasUnidade_(u) {
  u = u || {};
  var p = [];
  if (!CadQ_s_(u.NOME_UNIDADE)) p.push(CadQ_problema_('NOME_FALTA', ['NOME_UNIDADE'], 'Sem o nome da unidade'));
  var falta = [];
  if (!CadQ_s_(u.CIDADE)) falta.push('CIDADE');
  if (CADQ_UFS.indexOf(CadQ_up_(u.UF)) < 0) falta.push('UF');
  if (falta.length) p.push(CadQ_problema_('CIDADE_UF_FALTA', falta, 'Unidade sem ' + falta.map(function (k) { return CADQ_ROTULOS[k]; }).join(' e ')));
  if (CadQ_dig_(u.CNPJ_UNIDADE) && !CadQ_cnpjOk_(u.CNPJ_UNIDADE)) p.push(CadQ_problema_('CNPJ_INVALIDO', ['CNPJ_UNIDADE'], 'CNPJ da unidade inválido'));
  return p;
}

/** Problemas do item do catálogo (só itens ativos). veCusto: quem vê o custo (o vendedor não vê). */
function CadQ_problemasProduto_(p, veCusto) {
  p = p || {};
  var l = [];
  if (CadQ_up_(p.ATIVO || 'SIM') === 'NAO') return l;
  var preco = Number(p.PRECO);
  if (!(preco > 0)) l.push(CadQ_problema_('SEM_PRECO', ['PRECO'], 'Sem preço de venda'));
  if (!CadQ_s_(p.UNIDADE_MEDIDA)) l.push(CadQ_problema_('SEM_UNIDADE', ['UNIDADE_MEDIDA'], 'Sem unidade (un., h, kit...)'));
  if (veCusto && CadQ_s_(p.CUSTO) !== '' && preco > 0 && Number(p.CUSTO) > preco + 0.004) l.push(CadQ_problema_('ABAIXO_CUSTO', ['PRECO'], 'Preço de venda abaixo do custo cadastrado'));
  return l;
}

/** Lista plana { campo, texto } para a tela marcar cada campo. */
function CadQ_faltam_(probs) {
  var out = [], visto = {};
  (probs || []).forEach(function (pr) {
    (pr.campos || []).forEach(function (k) {
      if (visto[k]) return; visto[k] = 1;
      var t = pr.codigo === 'ENDERECO_INCOMPLETO' || pr.codigo === 'CIDADE_UF_FALTA' || /FALTA$/.test(pr.codigo) ? 'Obrigatório: informe ' + (CADQ_ROTULOS[k] || k) + '.' : pr.texto + '.';
      if (k === 'CEP' && pr.codigo === 'ENDERECO_INCOMPLETO') t = 'Obrigatório: informe o CEP (8 números).';
      if (k === 'UF') t = 'Obrigatório: escolha a UF.';
      out.push({ campo: k, texto: t });
    });
  });
  return out;
}

/** Nome para comparar duplicados: sem acento, maiúsculas, sem pontuação e sem LTDA, ME, EPP, EIRELI, S/A... */
function CadQ_nomeChave_(v) {
  var s = CadQ_s_(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  s = s.replace(/\bS\s*[\/.]\s*A\b\.?/g, ' SA ').replace(/[^A-Z0-9]+/g, ' ');
  var fora = { LTDA: 1, ME: 1, EPP: 1, EIRELI: 1, SA: 1, MEI: 1, SS: 1, CIA: 1, LIMITADA: 1 };
  return s.split(' ').filter(function (t) { return t && !fora[t]; }).join(' ');
}
function CadQ_distancia_(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  var prev = [], cur, i, j;
  for (j = 0; j <= b.length; j++) prev[j] = j;
  for (i = 1; i <= a.length; i++) {
    cur = [i]; var menor = i;
    for (j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)); if (cur[j] < menor) menor = cur[j]; }
    if (menor > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}
/** Nomes "muito parecidos": iguais sem acento/pontuação/sufixos, iguais sem espaços, ou com até 1 letra diferente (2 em nomes longos). */
function CadQ_nomesParecidos_(a, b) {
  if (!a || !b) return false;
  if (a === b || a.replace(/ /g, '') === b.replace(/ /g, '')) return true;
  var n = Math.min(a.length, b.length);
  if (n < 8) return false;
  return CadQ_distancia_(a, b, n >= 15 ? 2 : 1) <= (n >= 15 ? 2 : 1);
}
function CadQ_chavePar_(tipo, a, b) { var x = [CadQ_s_(a), CadQ_s_(b)].sort(); return tipo + ':' + x[0] + '|' + x[1]; }

/**
 * Pares de possíveis duplicados (só cadastros ativos). tipo CLIENTE | UNIDADE | PRODUTO.
 * Cliente: mesmo CNPJ, mesmo CPF ou nome muito parecido (dois CNPJs válidos e diferentes são empresas ou filiais
 * diferentes e não entram). Unidade: mesmo CNPJ ou mesmo nome no mesmo cliente. Produto: mesmo nome.
 */
function CadQ_paresDuplicados_(tipo, lista, naoDup) {
  naoDup = naoDup || {};
  var ativos = (lista || []).filter(CadQ_ativo_).filter(function (r) { return tipo !== 'PRODUTO' || CadQ_up_(r.ATIVO || 'SIM') !== 'NAO'; });
  var pares = {}, out = [];
  function add(a, b, motivo) {
    var k = CadQ_chavePar_(tipo, a.ID, b.ID);
    if (naoDup[k] || CadQ_s_(a.ID) === CadQ_s_(b.ID)) return;
    if (pares[k]) { if (pares[k].motivos.indexOf(motivo) < 0) pares[k].motivos.push(motivo); return; }
    pares[k] = { chave: k, a: a, b: b, motivos: [motivo] };
    out.push(pares[k]);
  }
  function porChave(fn, motivo) {
    var m = {};
    ativos.forEach(function (r) { var k = fn(r); if (!k) return; (m[k] = m[k] || []).push(r); });
    Object.keys(m).forEach(function (k) { var g = m[k]; for (var i = 0; i < g.length && i < 6; i++) for (var j = i + 1; j < g.length && j < 6; j++) add(g[i], g[j], motivo); });
  }
  if (tipo === 'CLIENTE') {
    porChave(function (r) { var d = typeof SGO_UTILS.cnpjArmazenado === 'function' ? SGO_UTILS.cnpjArmazenado(r.CNPJ) : CadQ_dig_(r.CNPJ); return d.length >= 11 ? d : ''; }, 'Mesmo CNPJ');
    porChave(function (r) { var d = CadQ_dig_(r.CPF); return d.length === 11 ? d : ''; }, 'Mesmo CPF');
    var docDiferente = function (a, b) {
      var ca = CadQ_dig_(a.CNPJ), cb = CadQ_dig_(b.CNPJ), pa = CadQ_dig_(a.CPF), pb = CadQ_dig_(b.CPF);
      return (ca && cb && ca !== cb && CadQ_cnpjOk_(a.CNPJ) && CadQ_cnpjOk_(b.CNPJ)) || (pa && pb && pa !== pb);
    };
    var comNome = ativos.map(function (r) { return { r: r, k: CadQ_nomeChave_(r.RAZAO_SOCIAL || r.NOME_FANTASIA) }; }).filter(function (x) { return x.k.length >= 3; });
    var baldes = {};
    comNome.forEach(function (x) { var b = x.k.replace(/ /g, '').slice(0, 3); (baldes[b] = baldes[b] || []).push(x); });
    Object.keys(baldes).forEach(function (b) {
      var g = baldes[b];
      if (g.length > 400) return; // balde grande demais (ex.: "HOS"): só igualdade exata, abaixo
      for (var i = 0; i < g.length; i++) for (var j = i + 1; j < g.length; j++) {
        if (CadQ_nomesParecidos_(g[i].k, g[j].k) && !docDiferente(g[i].r, g[j].r)) add(g[i].r, g[j].r, 'Nome muito parecido');
      }
    });
    porChave(function (r) { var k = CadQ_nomeChave_(r.RAZAO_SOCIAL || r.NOME_FANTASIA); return k.length >= 3 ? 'N:' + k.replace(/ /g, '') : ''; }, 'Nome muito parecido');
    out = out.filter(function (p) { return p.motivos.length > 1 || p.motivos[0] !== 'Nome muito parecido' || !docDiferente(p.a, p.b); });
  } else if (tipo === 'UNIDADE') {
    porChave(function (r) { var d = typeof SGO_UTILS.cnpjArmazenado === 'function' ? SGO_UTILS.cnpjArmazenado(r.CNPJ_UNIDADE) : CadQ_dig_(r.CNPJ_UNIDADE); return d.length >= 11 ? d : ''; }, 'Mesmo CNPJ');
    porChave(function (r) { var k = CadQ_nomeChave_(r.NOME_UNIDADE); return k && CadQ_s_(r.CLIENTE_ID) ? CadQ_s_(r.CLIENTE_ID) + ':' + k.replace(/ /g, '') : ''; }, 'Mesmo nome no mesmo cliente');
  } else {
    var norm = typeof Com_normBusca_ === 'function' ? Com_normBusca_ : function (v) { return CadQ_nomeChave_(v).toLowerCase(); };
    porChave(function (r) { return norm(r.NOME) || ''; }, 'Mesmo nome');
  }
  return out;
}

/** { campo, de, para } dos campos que mudaram. */
function CadQ_diff_(antes, depois, campos) {
  var out = [];
  (campos || []).forEach(function (k) {
    var a = CadQ_s_(antes && antes[k]), b = CadQ_s_(depois && depois[k]);
    if (a !== b) out.push({ campo: k, nome: CADQ_NOMES_CAMPO[k] || k, de: a, para: b });
  });
  return out;
}

// ------------------------------------------------------------
// ACESSO E HISTÓRICO
// ------------------------------------------------------------
/** Diretoria e Administrador (e o dono do sistema) veem tudo e juntam duplicados. sessao = objeto da sessão. */
function CadQ_podeJuntar_(sessao) {
  var p = CadQ_up_(sessao && sessao.perfil);
  if (p === 'ADMIN' || p === 'DIRETORIA') return true;
  try { return typeof Chaves_ehDonoUsuario_ === 'function' && !!Chaves_ehDonoUsuario_(sessao && sessao.usuario); } catch (e) { return false; }
}
function CadQ_sessao_(sessionId) {
  var s = exigirSessao(sessionId);
  if (CadQ_up_(s.perfil) === 'CLIENTE') throw new Error('Esta área é da equipe interna da Metrolabs');
  return s;
}
function CadQ_nomeSessao_(s) { return CadQ_s_(s && (s.nome || s.usuario)); }

/** Uma linha no histórico dos cadastros. Nunca derruba quem chamou. */
function CadQ_registrar_(sessao, o) {
  try {
    CadQ_garantirColunas_();
    var resumo = function (l) { return (l || []).map(function (p) { return p.codigo; }).join(','); };
    SGO_DATA.insert(CADQ_ABA_HIST, {
      DATA: CadQ_agora_(), USUARIO_ID: CadQ_s_(sessao && sessao.userId), USUARIO_NOME: CadQ_nomeSessao_(sessao), PERFIL: CadQ_up_(sessao && sessao.perfil),
      ENTIDADE: o.entidade, REGISTRO_ID: CadQ_s_(o.registroId), REGISTRO_NOME: CadQ_s_(o.registroNome).slice(0, 200), ACAO: o.acao, ORIGEM: CadQ_s_(o.origem).slice(0, 120),
      CIENTE: o.ciente ? 'SIM' : '', CAMPOS_JSON: JSON.stringify(o.campos || []).slice(0, 45000), PROBLEMAS_ANTES: resumo(o.problemasAntes), PROBLEMAS_DEPOIS: resumo(o.problemasDepois),
      DETALHE: CadQ_s_(o.detalhe).slice(0, 2000)
    });
  } catch (e) { console.error('Histórico do cadastro: ' + ((e && e.message) || e)); }
}
function CadQ_historico_() { return CadQ_lerSeguro_(CADQ_ABA_HIST); }
function CadQ_naoDuplicados_(hist) {
  var m = {};
  (hist || []).forEach(function (h) { if (CadQ_up_(h.ACAO) === 'NAO_DUPLICADO') m[CadQ_s_(h.REGISTRO_ID)] = h; });
  return m;
}

// ------------------------------------------------------------
// SALVAR PELA TELA (cliente e unidade)
// ------------------------------------------------------------
function CadQ_msgFalta_(faltam, novo, antigo) {
  var nomes = faltam.map(function (f) { return CADQ_ROTULOS[f.campo] || f.campo; });
  var lista = nomes.length > 1 ? nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1] : nomes[0];
  return (novo ? 'Não foi possível cadastrar: o cadastro precisa estar completo. Falta: ' : antigo ? 'Este cadastro é antigo e está incompleto: para salvar a alteração, complete: ' : 'Não foi possível salvar: o cadastro precisa estar completo. Falta: ') +
    lista + '. Peça esses dados ao cliente (não use informação buscada na internet) e salve de novo. Nada foi gravado.';
}
var CADQ_MSG_CIENTE = 'Não foi possível salvar: marque "' + CADQ_CIENTE + '". A marca registra quem conferiu os dados com o cliente e quando. Nada foi gravado.';

/** Cliente pela tela (novo: id vazio). Confere completo + Ciente antes; grava; registra o histórico. */
function CadQ_salvarCliente_(sessionId, id, payload) {
  var sessao = exigirSessao(sessionId);
  if (CadQ_up_(sessao.perfil) === 'CLIENTE') return { success: false, message: 'Acesso negado: seu perfil não permite alterar cadastros.' };
  payload = payload || {};
  try { CadQ_garantirColunas_(); } catch (e) { console.error('Colunas do cadastro: ' + ((e && e.message) || e)); }
  id = CadQ_s_(id);
  var aba = SGO_CFG.SHEETS.CAD_CLIENTES;
  var atual = id ? SGO_DATA.getById(aba, id) : null;
  if (id && !atual) return { success: false, message: 'Cliente não encontrado: pode ter sido excluído ou juntado em outro. Atualize a lista e abra o cadastro de novo.' };
  var norm = SGO_CLIENTES._normalizar(payload), proj = {};
  SGO_CLIENTES.CAMPOS_EDITAVEIS.forEach(function (k) { proj[k] = CadQ_tem_(payload, k) ? norm[k] : (atual ? atual[k] : ''); });
  var probs = CadQ_problemasCliente_(proj);
  if (probs.length) {
    var faltam = CadQ_faltam_(probs);
    return { success: false, codigo: 'CADASTRO_INCOMPLETO', faltam: faltam, message: CadQ_msgFalta_(faltam, !atual, !!atual && CadQ_problemasCliente_(atual).length > 0) };
  }
  if (!CadQ_ciente_(payload)) return { success: false, codigo: 'SEM_CIENTE', faltam: [{ campo: 'CIENTE', texto: 'Marque esta caixa para salvar.' }], message: CADQ_MSG_CIENTE };
  var r = atual ? SGO_CLIENTES.atualizar(sessionId, id, payload) : SGO_VINCULOS.createClient(sessionId, payload);
  if (!r || !r.success) return r;
  var novoId = id || CadQ_s_(r.item && r.item.ID);
  var depois = novoId ? SGO_DATA.getById(aba, novoId) : null;
  var campos = CadQ_diff_(atual || {}, depois || {}, CADQ_CAMPOS_HIST.CLIENTE);
  if (!atual || campos.length || !CadQ_s_(atual.CIENTE_EM)) {
    CadQ_registrar_(sessao, { entidade: 'CLIENTE', registroId: novoId, registroNome: (depois && (depois.RAZAO_SOCIAL || depois.NOME_FANTASIA)) || proj.RAZAO_SOCIAL, acao: atual ? 'ALTERAR' : 'CRIAR',
      origem: CadQ_s_(payload.ORIGEM_TELA) || 'Cadastros > Clientes', ciente: true, campos: campos, problemasAntes: atual ? CadQ_problemasCliente_(atual) : [], problemasDepois: CadQ_problemasCliente_(depois || proj) });
  }
  if (r.unidade && r.unidade.ID) {
    CadQ_registrar_(sessao, { entidade: 'UNIDADE', registroId: r.unidade.ID, registroNome: r.unidade.NOME_UNIDADE, acao: 'CRIAR', origem: 'Cadastros > Clientes (unidade principal)', ciente: true,
      campos: CadQ_diff_({}, r.unidade, CADQ_CAMPOS_HIST.UNIDADE), problemasAntes: [], problemasDepois: CadQ_problemasUnidade_(r.unidade) });
  }
  return r;
}

function CadQ_normUnidade_(p) {
  return { CLIENTE_ID: CadQ_s_(p.CLIENTE_ID), NOME_UNIDADE: CadQ_up_(p.NOME_UNIDADE), CNPJ_UNIDADE: CadQ_dig_(p.CNPJ_UNIDADE), ENDERECO: CadQ_up_(p.ENDERECO), CIDADE: CadQ_up_(p.CIDADE),
    UF: CadQ_up_(p.UF), RESPONSAVEL: CadQ_up_(p.RESPONSAVEL), TELEFONE: CadQ_dig_(p.TELEFONE) };
}

/** Unidade pela tela (nova: id vazio). Cidade e UF obrigatórias + Ciente; grava; histórico. */
function CadQ_salvarUnidade_(sessionId, id, payload) {
  var sessao = exigirSessao(sessionId);
  if (CadQ_up_(sessao.perfil) === 'CLIENTE') return { success: false, message: 'Acesso negado: seu perfil não permite alterar cadastros.' };
  payload = payload || {};
  try { CadQ_garantirColunas_(); } catch (e) { console.error('Colunas do cadastro: ' + ((e && e.message) || e)); }
  id = CadQ_s_(id);
  var aba = SGO_CFG.SHEETS.CAD_UNIDADES;
  var atual = id ? SGO_DATA.getById(aba, id) : null;
  if (id && !atual) return { success: false, message: 'Unidade não encontrada: pode ter sido excluída ou juntada em outra. Atualize a lista e abra o cadastro de novo.' };
  var norm = CadQ_normUnidade_(payload), proj = {};
  Object.keys(norm).forEach(function (k) { proj[k] = CadQ_tem_(payload, k) ? norm[k] : (atual ? atual[k] : ''); });
  var probs = CadQ_problemasUnidade_(proj);
  if (probs.length) {
    var faltam = CadQ_faltam_(probs);
    return { success: false, codigo: 'CADASTRO_INCOMPLETO', faltam: faltam, message: CadQ_msgFalta_(faltam, !atual, !!atual && CadQ_problemasUnidade_(atual).length > 0) };
  }
  if (!CadQ_ciente_(payload)) return { success: false, codigo: 'SEM_CIENTE', faltam: [{ campo: 'CIENTE', texto: 'Marque esta caixa para salvar.' }], message: CADQ_MSG_CIENTE };
  var r = atual ? SGO_UNIDADES.atualizar(sessionId, id, payload) : SGO_UNIDADES.criar(sessionId, payload);
  if (!r || !r.success) return r;
  var novoId = id || CadQ_s_(r.item && r.item.ID);
  var depois = novoId ? SGO_DATA.getById(aba, novoId) : (r.item || null);
  var campos = CadQ_diff_(atual || {}, depois || {}, CADQ_CAMPOS_HIST.UNIDADE);
  if (!atual || campos.length || !CadQ_s_(atual.CIENTE_EM)) {
    CadQ_registrar_(sessao, { entidade: 'UNIDADE', registroId: novoId, registroNome: (depois && depois.NOME_UNIDADE) || proj.NOME_UNIDADE, acao: atual ? 'ALTERAR' : 'CRIAR', origem: CadQ_s_(payload.ORIGEM_TELA) || 'Cadastros > Unidades',
      ciente: true, campos: campos, problemasAntes: atual ? CadQ_problemasUnidade_(atual) : [], problemasDepois: CadQ_problemasUnidade_(depois || proj) });
  }
  return r;
}

// ------------------------------------------------------------
// CORREÇÕES DE CADASTRO (lista)
// ------------------------------------------------------------
function CadQ_quemCriou_(r) {
  var nome = CadQ_s_(r.CRIADO_POR_NOME) || CadQ_s_(r.CAMPO_CRIADO_POR_NOME), id = CadQ_s_(r.CRIADO_POR_ID) || CadQ_s_(r.CAMPO_CRIADO_POR_ID);
  if (!nome) { var o = CadQ_up_(r.ORIGEM); if (/AUVO/.test(o)) nome = 'Integração Auvo'; else if (/CRM/.test(o)) nome = 'Importação do CRM'; }
  return { id: id, nome: nome };
}
function CadQ_resumoReg_(tipo, r) {
  var q = CadQ_quemCriou_(r);
  var doc = tipo === 'CLIENTE' ? (CadQ_dig_(r.CNPJ) ? 'CNPJ ' + (SGO_UTILS.formatCnpj ? SGO_UTILS.formatCnpj(r.CNPJ) : CadQ_s_(r.CNPJ)) : CadQ_dig_(r.CPF) ? 'CPF ' + CadQ_s_(r.CPF) : 'Sem CNPJ/CPF')
    : tipo === 'UNIDADE' ? (CadQ_dig_(r.CNPJ_UNIDADE) ? 'CNPJ ' + (SGO_UTILS.formatCnpj ? SGO_UTILS.formatCnpj(r.CNPJ_UNIDADE) : CadQ_s_(r.CNPJ_UNIDADE)) : 'Sem CNPJ') : 'Código ' + CadQ_s_(r.CODIGO);
  return { id: CadQ_s_(r.ID), nome: tipo === 'CLIENTE' ? CadQ_s_(r.RAZAO_SOCIAL || r.NOME_FANTASIA) || 'Cliente sem nome' : tipo === 'UNIDADE' ? CadQ_s_(r.NOME_UNIDADE) || 'Unidade sem nome' : CadQ_s_(r.NOME) || 'Item sem nome',
    doc: doc, codigo: tipo === 'PRODUTO' ? CadQ_s_(r.CODIGO) : '', criadoEm: CadQ_s_(r.CRIADO_EM), criadoPor: q.nome, criadoPorId: q.id, cientePor: CadQ_s_(r.CIENTE_POR_NOME), cienteEm: CadQ_s_(r.CIENTE_EM) };
}

/** Quem criou cada item do catálogo (COM_HISTORICO, tipo CRIACAO). */
function CadQ_criadoresProdutos_() {
  var m = {};
  CadQ_lerSeguro_('COM_HISTORICO').forEach(function (h) { if (CadQ_up_(h.ENTIDADE) === 'PRODUTO' && CadQ_up_(h.TIPO) === 'CRIACAO' && !m[CadQ_s_(h.ENTIDADE_ID)]) m[CadQ_s_(h.ENTIDADE_ID)] = { id: CadQ_s_(h.USUARIO_ID), nome: CadQ_s_(h.USUARIO_NOME) }; });
  return m;
}

/** Monta as linhas da tela. Sem sessão (para teste): ctx = { podeJuntar, userId, veProdutos, veCusto }. */
function CadQ_montarCorrecoes_(ctx, dados) {
  var itens = [], meu = function (q) { return ctx.podeJuntar || (!!ctx.userId && q === ctx.userId); };
  var naoDup = CadQ_naoDuplicados_(dados.hist);
  var nomeCli = {};
  (dados.clientes || []).forEach(function (c) { nomeCli[CadQ_s_(c.ID)] = CadQ_s_(c.NOME_FANTASIA || c.RAZAO_SOCIAL); });
  function linhas(tipo, lista, fnProb, extra) {
    lista.filter(CadQ_ativo_).forEach(function (r) {
      var probs = fnProb(r);
      if (!probs.length) return;
      var res = CadQ_resumoReg_(tipo, r);
      if (tipo === 'PRODUTO' && extra && extra[res.id]) { res.criadoPor = extra[res.id].nome; res.criadoPorId = extra[res.id].id; }
      if (tipo === 'PRODUTO' && !res.criadoPor && /importa[çc][ãa]o do crm/i.test(CadQ_s_(r.ATUALIZADO_POR_NOME))) res.criadoPor = 'Importação do CRM';
      if (!meu(res.criadoPorId)) return;
      itens.push({ ID: tipo + ':' + res.id, tipo: tipo, duplicado: false, registro: res, problemas: probs, problemasTexto: probs.map(function (p) { return p.texto; }),
        cliente: tipo === 'UNIDADE' ? nomeCli[CadQ_s_(r.CLIENTE_ID)] || '' : '', desde: res.criadoEm });
    });
  }
  linhas('CLIENTE', dados.clientes || [], CadQ_problemasCliente_);
  linhas('UNIDADE', dados.unidades || [], CadQ_problemasUnidade_);
  var criadores = dados.criadoresProdutos || {};
  if (ctx.veProdutos) linhas('PRODUTO', (dados.produtos || []).filter(function (p) { return CadQ_up_(p.ATIVO || 'SIM') !== 'NAO'; }), function (p) { return CadQ_problemasProduto_(p, ctx.veCusto); }, criadores);
  function dups(tipo, lista) {
    CadQ_paresDuplicados_(tipo, lista, naoDup).forEach(function (par) {
      var a = CadQ_resumoReg_(tipo, par.a), b = CadQ_resumoReg_(tipo, par.b);
      if (tipo === 'PRODUTO') { [a, b].forEach(function (x) { if (criadores[x.id]) { x.criadoPor = criadores[x.id].nome; x.criadoPorId = criadores[x.id].id; } }); }
      if (!meu(a.criadoPorId) && !meu(b.criadoPorId)) return;
      if (tipo === 'PRODUTO') { a.preco = Number(par.a.PRECO) || 0; b.preco = Number(par.b.PRECO) || 0; }
      if (tipo === 'UNIDADE') { a.cliente = nomeCli[CadQ_s_(par.a.CLIENTE_ID)] || ''; b.cliente = nomeCli[CadQ_s_(par.b.CLIENTE_ID)] || ''; }
      var bloqueio = '';
      if (tipo === 'CLIENTE') {
        var ca = CadQ_dig_(par.a.CNPJ), cb = CadQ_dig_(par.b.CNPJ);
        if (ca && cb && ca !== cb) bloqueio = 'Os dois têm CNPJs diferentes: são empresas ou filiais diferentes e não se juntam. Se um CNPJ está errado, corrija-o; se não for o mesmo cliente, use "Não é duplicado".';
      }
      if (tipo === 'UNIDADE') {
        var ua = CadQ_dig_(par.a.CNPJ_UNIDADE), ub = CadQ_dig_(par.b.CNPJ_UNIDADE);
        if (ua && ub && ua !== ub) bloqueio = 'As duas têm CNPJs diferentes: são locais diferentes. Se um CNPJ está errado, corrija-o; se não for o mesmo local, use "Não é duplicado".';
      }
      var desde = [a.criadoEm, b.criadoEm].filter(Boolean).sort().pop() || '';
      itens.push({ ID: 'DUP:' + par.chave, tipo: tipo, duplicado: true, chave: par.chave, a: a, b: b, motivos: par.motivos, problemas: [{ codigo: 'DUPLICADO', texto: 'Possível duplicado: ' + par.motivos.join(' e ').toLowerCase() }],
        problemasTexto: ['Possível duplicado (' + par.motivos.join(' e ').toLowerCase() + ')'], podeJuntar: !!ctx.podeJuntar && !bloqueio, bloqueioJuntar: bloqueio, desde: desde });
    });
  }
  dups('CLIENTE', dados.clientes || []);
  dups('UNIDADE', dados.unidades || []);
  if (ctx.veProdutos) dups('PRODUTO', dados.produtos || []);
  itens.sort(function (x, y) { return (x.duplicado === y.duplicado ? 0 : x.duplicado ? -1 : 1) || CadQ_s_(y.desde).localeCompare(CadQ_s_(x.desde)); });
  return itens;
}

function CadQ_contextoTela_(sessionId) {
  var s = CadQ_sessao_(sessionId);
  var pode = CadQ_podeJuntar_(s), eu = null;
  try { if (typeof Com_eu_ === 'function') eu = Com_eu_(sessionId); } catch (e) { eu = null; }
  var veProdutos = pode || !!(eu && (eu.catalogo || eu.catalogoVenda));
  var veCusto = pode || !!(eu && eu.veCusto);
  return { sessao: s, podeJuntar: pode, userId: CadQ_s_(s.userId), veProdutos: veProdutos, veCusto: veCusto };
}

function CadQ_correcoes_(sessionId) {
  var ctx = CadQ_contextoTela_(sessionId);
  var dados = { clientes: CadQ_lerSeguro_(SGO_CFG.SHEETS.CAD_CLIENTES), unidades: CadQ_lerSeguro_(SGO_CFG.SHEETS.CAD_UNIDADES), hist: CadQ_historico_(),
    produtos: ctx.veProdutos ? CadQ_lerSeguro_('COM_PRODUTOS') : [], criadoresProdutos: ctx.veProdutos ? CadQ_criadoresProdutos_() : {} };
  var itens = CadQ_montarCorrecoes_(ctx, dados);
  return { success: true, items: itens, total: itens.length, podeJuntar: ctx.podeJuntar, veProdutos: ctx.veProdutos, veCusto: ctx.veCusto, aviso: CADQ_AVISO,
    escopo: ctx.podeJuntar ? 'TODOS' : 'MEUS' };
}

/** "Não é duplicado": o par não volta à lista. Diretoria e Administrador. */
function CadQ_naoDuplicado_(sessionId, d) {
  var s = CadQ_sessao_(sessionId);
  if (!CadQ_podeJuntar_(s)) throw new Error('Marcar "Não é duplicado" é da Diretoria e do Administrador. Avise um deles informando os dois cadastros');
  d = d || {};
  var tipo = CadQ_up_(d.tipo), chave = CadQ_s_(d.chave);
  if (['CLIENTE', 'UNIDADE', 'PRODUTO'].indexOf(tipo) < 0 || chave.indexOf(tipo + ':') !== 0) throw new Error('Par de cadastros não reconhecido. Atualize a lista e tente de novo');
  var motivo = CadQ_s_(d.motivo);
  if (motivo.length < 8) throw new Error('Escreva por que não é duplicado (pelo menos 8 letras, por exemplo "filial em outra cidade"). Fica no histórico');
  CadQ_registrar_(s, { entidade: tipo, registroId: chave, registroNome: CadQ_s_(d.nomes).slice(0, 200), acao: 'NAO_DUPLICADO', origem: 'Cadastros > Correções de cadastro', detalhe: motivo });
  return { success: true, message: 'Marcado como não duplicado. O par não volta à lista; a marca fica no histórico com o seu nome.' };
}

// ------------------------------------------------------------
// JUNTAR DUPLICADOS
// ------------------------------------------------------------
function CadQ_abaDe_(tipo) { return tipo === 'CLIENTE' ? SGO_CFG.SHEETS.CAD_CLIENTES : tipo === 'UNIDADE' ? SGO_CFG.SHEETS.CAD_UNIDADES : 'COM_PRODUTOS'; }
function CadQ_ladoALado_(tipo, fica, sai) {
  return CADQ_CAMPOS_JUNTAR[tipo].map(function (k) {
    return { campo: k, nome: CADQ_NOMES_CAMPO[k] || k, fica: CadQ_s_(fica[k]), sai: CadQ_s_(sai[k]), iguais: CadQ_s_(fica[k]) === CadQ_s_(sai[k]) };
  });
}
function CadQ_exigirJuntar_(sessionId, d) {
  var s = CadQ_sessao_(sessionId);
  if (!CadQ_podeJuntar_(s)) throw new Error('Juntar cadastros repetidos é da Diretoria e do Administrador. Você pode corrigir os seus cadastros; para juntar, avise um deles informando os dois cadastros');
  d = d || {};
  var tipo = CadQ_up_(d.tipo), ficaId = CadQ_s_(d.ficaId), saiId = CadQ_s_(d.saiId);
  if (['CLIENTE', 'UNIDADE', 'PRODUTO'].indexOf(tipo) < 0) throw new Error('Tipo de cadastro não reconhecido. Atualize a lista e tente de novo');
  if (!ficaId || !saiId || ficaId === saiId) throw new Error('Escolha qual cadastro fica e qual sai (precisam ser diferentes)');
  var aba = CadQ_abaDe_(tipo), fica = SGO_DATA.getById(aba, ficaId), sai = SGO_DATA.getById(aba, saiId);
  if (!fica || !sai) throw new Error('Um dos cadastros não existe mais (pode ter sido juntado ou excluído por outra pessoa). Atualize a lista');
  if (tipo !== 'PRODUTO' && (!CadQ_ativo_(fica) || !CadQ_ativo_(sai))) throw new Error('Os dois cadastros precisam estar ativos para juntar. Atualize a lista');
  if (tipo === 'PRODUTO' && (CadQ_up_(fica.ATIVO || 'SIM') === 'NAO' || CadQ_up_(sai.ATIVO || 'SIM') === 'NAO')) throw new Error('Os dois itens precisam estar ativos no catálogo para juntar. Atualize a lista');
  return { sessao: s, tipo: tipo, aba: aba, fica: fica, sai: sai, ficaId: ficaId, saiId: saiId };
}
/** Valores escolhidos campo a campo: { CAMPO: 'SAI' } troca pelo valor do que sai; o resto fica como está. */
function CadQ_valoresEscolhidos_(tipo, fica, sai, valores) {
  var campos = {};
  CADQ_CAMPOS_JUNTAR[tipo].forEach(function (k) { if (CadQ_up_(valores && valores[k]) === 'SAI' && CadQ_s_(sai[k]) !== CadQ_s_(fica[k])) campos[k] = sai[k]; });
  return campos;
}

/** Prévia da junção (lado a lado e o que acompanha). Clientes e unidades: prévia da consolidação de Vínculos. */
function CadQ_juntarPrevia_(sessionId, d) {
  var j = CadQ_exigirJuntar_(sessionId, d);
  var out = { success: true, tipo: j.tipo, fica: CadQ_resumoReg_(j.tipo, j.fica), sai: CadQ_resumoReg_(j.tipo, j.sai), campos: CadQ_ladoALado_(j.tipo, j.fica, j.sai), bloqueios: [], avisos: [], token: '' };
  if (j.tipo === 'PRODUTO') {
    if (CadQ_up_(j.sai.PRECO_PEDIDO_SITUACAO) === 'PENDENTE') out.bloqueios.push('O item que sai tem pedido de redução de preço aguardando decisão. Decida o pedido em Comercial > Produtos e serviços e volte aqui.');
    var props = CadQ_lerSeguro_('COM_PROPOSTAS').filter(function (p) { return CadQ_itensComProduto_(p, j.saiId).length; });
    var itensCompra = CadQ_lerSeguro_('CMP_ITENS').filter(function (i) { return CadQ_s_(i.PRODUTO_ID) === j.saiId; });
    out.acompanham = [{ nome: 'Propostas com este item', qtd: props.length }, { nome: 'Itens de pedido de compra', qtd: itensCompra.length }];
    out.avisos.push('O item que sai fica arquivado com a marca "juntado com" o item que fica (não é apagado). As propostas e os pedidos de compra passam a apontar o item que fica; o preço e a descrição já gravados nas propostas não mudam. O histórico de preço e de reajustes continua no item original.');
    return out;
  }
  var semCnpj = j.tipo === 'CLIENTE' ? !CadQ_dig_(j.sai.CNPJ) : !CadQ_dig_(j.sai.CNPJ_UNIDADE);
  var docFica = j.tipo === 'CLIENTE' ? CadQ_dig_(j.fica.CNPJ) : CadQ_dig_(j.fica.CNPJ_UNIDADE), docSai = j.tipo === 'CLIENTE' ? CadQ_dig_(j.sai.CNPJ) : CadQ_dig_(j.sai.CNPJ_UNIDADE);
  if (!docFica && docSai) { out.bloqueios.push('O cadastro que fica não tem CNPJ e o que sai tem. Escolha como "fica" o cadastro com o CNPJ e faça a prévia de novo.'); return out; }
  if (docFica && docSai && docFica !== docSai) { out.bloqueios.push('Os dois têm CNPJs diferentes: não são o mesmo cadastro. Se um CNPJ está errado, corrija-o antes; se não for o mesmo, use "Não é duplicado".'); return out; }
  var motivo = CadQ_s_(d && d.motivo) || 'Junção de cadastro repetido (Correções de cadastro)';
  if (motivo.length < 8) motivo = 'Junção de cadastro repetido (Correções de cadastro): ' + motivo;
  var pv;
  try { pv = SGO_VINCULOS.preview(sessionId, { tipo: j.tipo, acao: 'CONSOLIDAR', origem: j.saiId, destino: j.ficaId, motivo: motivo, semCnpj: semCnpj }); }
  catch (e) { out.bloqueios.push(String((e && e.message) || e)); return out; }
  out.bloqueios = (pv.blocks || []).slice();
  out.avisos = (pv.warnings || []).slice();
  out.token = pv.token || '';
  out.alteracoes = (pv.changes || []).length;
  out.historico = pv.historical || {};
  out.documentos = (pv.documentos || []).length;
  var porTabela = {};
  (pv.changes || []).forEach(function (c) { if (c.table !== CadQ_abaDe_(j.tipo) || c.id !== j.saiId) porTabela[c.table] = (porTabela[c.table] || 0) + 1; });
  out.acompanham = Object.keys(porTabela).map(function (t) { return { tabela: t, qtd: porTabela[t] }; });
  return out;
}

function CadQ_itensComProduto_(prop, produtoId) { var l = []; try { l = JSON.parse(CadQ_s_(prop.ITENS_JSON) || '[]'); } catch (e) { l = []; } return (Array.isArray(l) ? l : []).filter(function (i) { return i && CadQ_s_(i.produtoId) === produtoId; }); }

/** Junta dois itens do catálogo (dentro da trava do Comercial). */
function CadQ_juntarProdutos_(j, valores, motivo) {
  var faz = function () {
    var fica = SGO_DATA.getById('COM_PRODUTOS', j.ficaId), sai = SGO_DATA.getById('COM_PRODUTOS', j.saiId);
    if (!fica || !sai || CadQ_up_(sai.ATIVO || 'SIM') === 'NAO') throw new Error('O item que sai já foi arquivado ou juntado por outra pessoa. Atualize a lista');
    if (CadQ_up_(sai.PRECO_PEDIDO_SITUACAO) === 'PENDENTE') throw new Error('O item que sai tem pedido de redução de preço aguardando decisão. Decida o pedido em Comercial > Produtos e serviços e volte aqui');
    var agora = typeof Com_agora_ === 'function' ? Com_agora_() : CadQ_agora_(), quem = CadQ_nomeSessao_(j.sessao);
    var campos = CadQ_valoresEscolhidos_('PRODUTO', fica, sai, valores);
    var antesFica = Object.assign({}, fica);
    if (Object.keys(campos).length) {
      if (CadQ_tem_(campos, 'PRECO')) campos.PRECO_DESDE = typeof Com_hoje_ === 'function' ? Com_hoje_() : agora.slice(0, 10);
      campos.ATUALIZADO_POR_NOME = quem; campos.ATUALIZADO_EM = agora;
      SGO_DATA.update('COM_PRODUTOS', fica.ID, campos);
    }
    var nProp = 0, nCmp = 0;
    CadQ_lerSeguro_('COM_PROPOSTAS').forEach(function (p) {
      var l; try { l = JSON.parse(CadQ_s_(p.ITENS_JSON) || '[]'); } catch (e) { return; }
      if (!Array.isArray(l)) return;
      var mudou = false, rasc = CadQ_up_(p.SITUACAO) === 'RASCUNHO';
      l.forEach(function (i) { if (i && CadQ_s_(i.produtoId) === j.saiId) { i.produtoId = j.ficaId; if (rasc) i.codigo = CadQ_s_(fica.CODIGO); mudou = true; } });
      if (mudou) { SGO_DATA.update('COM_PROPOSTAS', p.ID, { ITENS_JSON: JSON.stringify(l) }); nProp++; }
    });
    CadQ_lerSeguro_('CMP_ITENS').forEach(function (i) { if (CadQ_s_(i.PRODUTO_ID) === j.saiId) { SGO_DATA.update('CMP_ITENS', i.ID, { PRODUTO_ID: j.ficaId }); nCmp++; } });
    SGO_DATA.update('COM_PRODUTOS', sai.ID, { ATIVO: 'NAO', JUNTADO_COM_ID: fica.ID, JUNTADO_EM: agora, JUNTADO_POR_NOME: quem, ATUALIZADO_POR_NOME: quem, ATUALIZADO_EM: agora });
    var eu = { id: CadQ_s_(j.sessao.userId), nome: quem };
    if (typeof Com_historico_ === 'function') {
      Com_historico_('PRODUTO', sai.ID, 'JUNCAO', eu, { para: CadQ_s_(fica.CODIGO), texto: 'Item juntado em ' + CadQ_s_(fica.CODIGO) + ' (' + CadQ_s_(fica.NOME) + ') e arquivado. ' + motivo });
      Com_historico_('PRODUTO', fica.ID, 'JUNCAO', eu, { de: CadQ_s_(sai.CODIGO), texto: 'Recebeu o item repetido ' + CadQ_s_(sai.CODIGO) + ' (' + nProp + ' proposta(s) e ' + nCmp + ' item(ns) de compra passaram a apontar este item).' + (Object.keys(campos).length ? ' Valores trazidos do repetido: ' + CADQ_CAMPOS_JUNTAR.PRODUTO.filter(function (k) { return CadQ_tem_(campos, k); }).map(function (k) { return CADQ_NOMES_CAMPO[k]; }).join(', ') + '.' : '') });
    }
    CadQ_registrar_(j.sessao, { entidade: 'PRODUTO', registroId: fica.ID, registroNome: CadQ_s_(fica.NOME), acao: 'JUNTAR', origem: 'Cadastros > Correções de cadastro',
      campos: CadQ_diff_(antesFica, Object.assign({}, antesFica, campos), CADQ_CAMPOS_JUNTAR.PRODUTO), detalhe: 'Juntado: ' + CadQ_s_(sai.CODIGO) + ' (' + sai.ID + ') em ' + CadQ_s_(fica.CODIGO) + '. ' + nProp + ' proposta(s), ' + nCmp + ' item(ns) de compra. ' + motivo });
    return { success: true, message: 'Itens juntados: ' + CadQ_s_(sai.CODIGO) + ' foi arquivado com a marca "juntado com ' + CadQ_s_(fica.CODIGO) + '". ' + nProp + ' proposta(s) e ' + nCmp + ' item(ns) de compra passaram a apontar o item que ficou.', propostas: nProp, compras: nCmp };
  };
  return typeof Com_comTrava_ === 'function' ? Com_comTrava_(faz) : faz();
}

/** Confirma a junção. Clientes e unidades: aplica a consolidação de Vínculos (token da prévia) e depois os valores escolhidos. */
function CadQ_juntar_(sessionId, d) {
  var j = CadQ_exigirJuntar_(sessionId, d);
  var motivo = CadQ_s_(d && d.motivo);
  if (j.tipo === 'PRODUTO') return CadQ_juntarProdutos_(j, d && d.valores, motivo);
  var token = CadQ_s_(d && d.token);
  if (!token) throw new Error('A prévia não autorizou a junção (há algo que impede ou ela expirou). Clique em Juntar de novo para refazer a prévia');
  var campos = CadQ_valoresEscolhidos_(j.tipo, j.fica, j.sai, d && d.valores);
  var r = SGO_VINCULOS.confirm(sessionId, token);
  if (!r || !r.success) return r;
  var agora = CadQ_agora_(), quem = CadQ_nomeSessao_(j.sessao), aviso = '';
  var antesFica = Object.assign({}, j.fica);
  try {
    if (Object.keys(campos).length) {
      if (j.tipo === 'CLIENTE' && ['CEP', 'LOGRADOURO', 'NUMERO', 'COMPLEMENTO', 'BAIRRO', 'CIDADE', 'UF'].some(function (k) { return CadQ_tem_(campos, k); }) && !CadQ_tem_(campos, 'ENDERECO')) {
        var montado = SGO_CLIENTES._compoeEndereco(Object.assign({}, j.fica, campos));
        if (montado) campos.ENDERECO = montado;
      }
      SGO_DATA.update(j.aba, j.ficaId, Object.assign({}, campos, { ATUALIZADO_POR_NOME: quem, ATUALIZADO_EM: agora }));
    }
  } catch (e) { aviso = ' Atenção: os cadastros foram juntados, mas os valores escolhidos não foram gravados no que ficou (' + String((e && e.message) || e) + '). Abra o cadastro que ficou e corrija à mão.'; }
  try { SGO_DATA.update(j.aba, j.saiId, { JUNTADO_COM_ID: j.ficaId, JUNTADO_EM: agora, JUNTADO_POR_NOME: quem }); } catch (e2) { console.error('Marca de junção: ' + ((e2 && e2.message) || e2)); }
  var nome = j.tipo === 'CLIENTE' ? function (x) { return CadQ_s_(x.RAZAO_SOCIAL || x.NOME_FANTASIA); } : function (x) { return CadQ_s_(x.NOME_UNIDADE); };
  CadQ_registrar_(j.sessao, { entidade: j.tipo, registroId: j.ficaId, registroNome: nome(j.fica), acao: 'JUNTAR', origem: 'Cadastros > Correções de cadastro',
    campos: CadQ_diff_(antesFica, Object.assign({}, antesFica, campos), CADQ_CAMPOS_JUNTAR[j.tipo]), detalhe: 'Juntado: ' + nome(j.sai) + ' (' + j.saiId + ') em ' + nome(j.fica) + ' (' + j.ficaId + '). Operação de Vínculos ' + CadQ_s_(r.operationId) + '. ' + motivo });
  return { success: true, message: 'Cadastros juntados. "' + nome(j.sai) + '" ficou inativo com a marca "juntado com ' + nome(j.fica) + '"; tudo o que estava ligado a ele foi para o cadastro que ficou (a lista completa está no histórico de Vínculos).' + aviso, operationId: r.operationId };
}

// ------------------------------------------------------------
// RELATÓRIO "QUALIDADE DOS CADASTROS" (Diretoria e Administrador)
// ------------------------------------------------------------
function CadQ_relatorioDados_(dados, de, ate) {
  var dentro = function (v) { var d = CadQ_dia_(v); return !!d && (!de || d >= de) && (!ate || d <= ate); };
  var pessoas = {}, P = function (nome) { nome = CadQ_s_(nome) || 'Não registrado (cadastro anterior a 29/10/2026)'; return pessoas[nome] || (pessoas[nome] = { nome: nome, cadastrou: 0, cadastrouComProblema: 0, comCiente: 0, alteracoes: 0, corrigiuProprios: 0, corrigiuDeOutros: 0, corrigidosPorOutros: 0, juntou: 0, problemas: {} }); };
  var criadorDe = {};
  function contar(tipo, lista, fnProb) {
    lista.filter(CadQ_ativo_).forEach(function (r) {
      var q = CadQ_quemCriou_(r); criadorDe[tipo + ':' + CadQ_s_(r.ID)] = q.nome;
      if (!dentro(r.CRIADO_EM)) return;
      var p = P(q.nome), probs = fnProb(r);
      p.cadastrou++;
      if (CadQ_s_(r.CIENTE_EM)) p.comCiente++;
      if (probs.length) { p.cadastrouComProblema++; probs.forEach(function (x) { p.problemas[x.texto.replace(/:.*$/, '').replace(/ \(.*$/, '')] = (p.problemas[x.texto.replace(/:.*$/, '').replace(/ \(.*$/, '')] || 0) + 1; }); }
    });
  }
  contar('CLIENTE', dados.clientes || [], CadQ_problemasCliente_);
  contar('UNIDADE', dados.unidades || [], CadQ_problemasUnidade_);
  var correcoes = [];
  (dados.hist || []).forEach(function (h) {
    if (!dentro(h.DATA || h.CRIADO_EM)) return;
    var acao = CadQ_up_(h.ACAO), p = P(h.USUARIO_NOME);
    if (acao === 'ALTERAR') {
      p.alteracoes++;
      var antes = CadQ_s_(h.PROBLEMAS_ANTES).split(',').filter(Boolean), depois = CadQ_s_(h.PROBLEMAS_DEPOIS).split(',').filter(Boolean);
      var resolvidos = antes.filter(function (c) { return depois.indexOf(c) < 0; });
      if (resolvidos.length) {
        var criador = criadorDe[CadQ_up_(h.ENTIDADE) + ':' + CadQ_s_(h.REGISTRO_ID)] || '';
        var proprio = !!criador && criador === CadQ_s_(h.USUARIO_NOME);
        if (proprio) p.corrigiuProprios++; else { p.corrigiuDeOutros++; if (criador) P(criador).corrigidosPorOutros++; }
        correcoes.push({ data: CadQ_s_(h.DATA), quem: CadQ_s_(h.USUARIO_NOME), tipo: CadQ_up_(h.ENTIDADE), cadastro: CadQ_s_(h.REGISTRO_NOME), cadastrou: criador || 'Não registrado', resolvidos: resolvidos });
      }
    }
    if (acao === 'JUNTAR') p.juntou++;
  });
  var lista = Object.keys(pessoas).map(function (k) { var p = pessoas[k]; p.problemas = Object.keys(p.problemas).map(function (t) { return { texto: t, qtd: p.problemas[t] }; }).sort(function (a, b) { return b.qtd - a.qtd; }); return p; })
    .sort(function (a, b) { return (b.cadastrouComProblema - a.cadastrouComProblema) || (b.cadastrou - a.cadastrou) || a.nome.localeCompare(b.nome, 'pt-BR'); });
  correcoes.sort(function (a, b) { return b.data.localeCompare(a.data); });
  var tot = { cadastros: 0, comProblema: 0, comCiente: 0, correcoes: correcoes.length };
  lista.forEach(function (p) { tot.cadastros += p.cadastrou; tot.comProblema += p.cadastrouComProblema; tot.comCiente += p.comCiente; });
  return { pessoas: lista, correcoes: correcoes.slice(0, 300), totais: tot };
}

function CadQ_relatorio_(sessionId, d) {
  var s = CadQ_sessao_(sessionId);
  if (!CadQ_podeJuntar_(s)) throw new Error('O relatório "Qualidade dos cadastros" é da Diretoria e do Administrador');
  d = d || {};
  var ate = CadQ_dia_(d.ate) || CadQ_agora_().slice(0, 10);
  var de = CadQ_dia_(d.de);
  if (!de) { var x = new Date(ate + 'T12:00:00'); x.setDate(x.getDate() - 90); de = x.toISOString().slice(0, 10); }
  if (de > ate) throw new Error('A data inicial ficou depois da final. Corrija o período e gere de novo');
  var r = CadQ_relatorioDados_({ clientes: CadQ_lerSeguro_(SGO_CFG.SHEETS.CAD_CLIENTES), unidades: CadQ_lerSeguro_(SGO_CFG.SHEETS.CAD_UNIDADES), hist: CadQ_historico_() }, de, ate);
  r.success = true; r.de = de; r.ate = ate;
  return r;
}

// ------------------------------------------------------------
// google.script.run (nunca lançam)
// ------------------------------------------------------------
function CadQ_resp_(fn, acao) {
  try { return JSON.parse(JSON.stringify(fn())); }
  catch (e) {
    var m = String((e && e.message) || e).replace(/[.\s]+$/, '');
    return { success: false, message: /^(Não|Não foi|Escreva|Escolha|Marque|O |A |Os |As |Um |Juntar|Esta|Tipo|Par|Acesso)/.test(m) && !/\w+\.\w+\(/.test(m) ? m + '.' : (typeof SGO_textoFalhaOperador_ === 'function' ? SGO_textoFalhaOperador_(acao, e) : 'Não foi possível ' + acao + '. Tente de novo.') };
  }
}
function cadastroCorrecoes(sessionId) { return CadQ_resp_(function () { return CadQ_correcoes_(sessionId); }, 'carregar as correções de cadastro'); }
function cadastroNaoDuplicado(sessionId, d) { return CadQ_resp_(function () { return CadQ_naoDuplicado_(sessionId, d); }, 'marcar como não duplicado'); }
function cadastroJuntarPrevia(sessionId, d) { return CadQ_resp_(function () { return CadQ_juntarPrevia_(sessionId, d); }, 'preparar a junção'); }
function cadastroJuntar(sessionId, d) { return CadQ_resp_(function () { var r = CadQ_juntar_(sessionId, d); return typeof SGO_Pendencias_aposGravar_ === 'function' ? SGO_Pendencias_aposGravar_(r) : r; }, 'juntar os cadastros'); }
function cadastroQualidadeRelatorio(sessionId, d) { return CadQ_resp_(function () { return CadQ_relatorio_(sessionId, d); }, 'gerar o relatório'); }
