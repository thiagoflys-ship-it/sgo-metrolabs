/**
 * Painel financeiro: buscar e cadastrar cliente e fornecedor no Omie pelo SGO+ (16/11/2026, especificação do Financeiro, seção 2
 * e achado B9).
 *
 * No Omie, cliente e fornecedor são o mesmo cadastro (geral/clientes/); a diferença é a tag ("Cliente", "Fornecedor").
 * - Busca: ListarClientes por CNPJ/CPF (clientesFiltro.cnpj_cpf, formatado; o filtro não é exato, então só os dígitos valem) ou
 *   por nome (clientesFiltro.razao_social; busca parcial "a confirmar" no Omie real).
 * - Cadastro: sempre procura por CNPJ antes, sem memória. Não achou: IncluirCliente com codigo_cliente_integracao "SGO-<dígitos>"
 *   (o mesmo documento gera o mesmo código). Achou ativo sem a tag: AlterarCliente com a lista de tags SOMADA à atual (lida antes
 *   com ConsultarCliente). Achou só inativo ou mais de um ativo: não cadastra e diz o que fazer. Nunca UpsertCliente (escreveria
 *   por cima do cadastro feito à mão no Omie).
 * - Mesmo padrão das operações: prévia com token de uso único, ligado à sessão e à empresa, por 10 minutos; confirmação só com a
 *   gravação ligada (Omie_exigirGravacao_); recusa clara do Omie = nada feito. Caixa FIN_OMIE_LANCAR e lista de sigilo.
 * - Depois de cadastrar, o código do Omie fica em OMIE_CODIGO (CAD_CLIENTES e CMP_FORNECEDORES), só nessa coluna.
 * Nada de valor financeiro passa por aqui; o registro de acessos guarda só o final do documento.
 */
var OMIE_CAD_PREFIXO = 'OMIE_CAD_';
function OmieCad_s_(v, max) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 200); }
function OmieCad_dig_(v) { return String(v === null || v === undefined ? '' : v).replace(/\D/g, ''); }
function OmieCad_cnpjOk_(d) {
  if (!/^\d{14}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false;
  var calc = function (n) { var pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], s = 0; for (var i = 0; i < n; i++) s += Number(d[i]) * pesos[i]; var r = s % 11; return r < 2 ? 0 : 11 - r; };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}
function OmieCad_cpfOk_(d) {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  var calc = function (n) { var s = 0; for (var i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); var r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}
function OmieCad_docOk_(d) { return d.length === 14 ? OmieCad_cnpjOk_(d) : d.length === 11 ? OmieCad_cpfOk_(d) : false; }
function OmieCad_docFmt_(d) {
  d = OmieCad_dig_(d);
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return d;
}
function OmieCad_empresaCnpj_() { try { return OmieCad_dig_(PropertiesService.getScriptProperties().getProperty('OMIE_EMPRESA_CNPJ')); } catch (e) { return ''; } }
function OmieCad_tags_(lista) {
  return (Array.isArray(lista) ? lista : []).map(function (t) { return OmieCad_s_(t && typeof t === 'object' ? t.tag : t, 60); }).filter(Boolean);
}
/** Procura no Omie pelo documento. { ativos: [{codigo, nome, tags}], inativos: n }. semCache: lê o Omie agora (antes de gravar). */
function OmieCad_paramBusca_(d) { return { pagina: 1, registros_por_pagina: 20, apenas_importado_api: 'N', clientesFiltro: { cnpj_cpf: OmieCad_docFmt_(d) } }; }
function OmieCad_procurar_(doc, semCache) {
  var d = OmieCad_dig_(doc);
  var ler = function () { return Omie_requisitar_('geral/clientes/', 'ListarClientes', OmieCad_paramBusca_(d)); };
  var r = semCache && typeof Omie_semCache_ === 'function' ? Omie_semCache_(ler) : ler();
  var mesmos = (r && r.clientes_cadastro || []).filter(function (x) { return OmieCad_dig_(x.cnpj_cpf) === d; });
  var ativos = mesmos.filter(function (x) { return OmieCad_s_(x.inativo) !== 'S'; }).map(function (x) {
    return { codigo: Number(x.codigo_cliente_omie) || 0, nome: OmieCad_s_(x.razao_social || x.nome_fantasia, 120), tags: OmieCad_tags_(x.tags) };
  });
  return { ativos: ativos, inativos: mesmos.length - ativos.length };
}
function OmieCad_tagsDoTipo_(tipo) { return tipo === 'ambos' ? ['Cliente', 'Fornecedor'] : tipo === 'cliente' ? ['Cliente'] : ['Fornecedor']; }

/** B9: busca por CNPJ/CPF ou por nome. payload: { texto }. Mostra razão social, CNPJ, cidade/UF e se está inativo. */
function OmieCad_apiBuscar(sessionId, payload) {
  return OmieOps_resposta_(function () {
    Omie_exigirAcesso_(sessionId, 'FIN_OMIE_CONSULTAR', 'buscar cadastros no Omie');
    var t = OmieCad_s_((payload || {}).texto, 80), d = OmieCad_dig_(t), filtro;
    if (d.length === 11 || d.length === 14) filtro = { cnpj_cpf: OmieCad_docFmt_(d) };
    else if (t.replace(/[^A-Za-zÀ-ÿ0-9]/g, '').length >= 3 && d.length < 8) filtro = { razao_social: t };
    else OmieOps_erro_('Digite o CNPJ ou CPF completo (só os números servem) ou pelo menos 3 letras do nome.');
    var r = Omie_requisitar_('geral/clientes/', 'ListarClientes', { pagina: 1, registros_por_pagina: 20, apenas_importado_api: 'N', clientesFiltro: filtro });
    var itens = (r && r.clientes_cadastro || []).filter(function (x) { return !filtro.cnpj_cpf || OmieCad_dig_(x.cnpj_cpf) === d; }).slice(0, 20).map(function (x) {
      return { id: String(Number(x.codigo_cliente_omie) || ''), razao: OmieCad_s_(x.razao_social, 120), fantasia: OmieCad_s_(x.nome_fantasia, 120), documento: OmieCad_docFmt_(x.cnpj_cpf),
        cidade: OmieCad_s_(x.cidade, 60), uf: OmieCad_s_(x.estado, 2), inativo: OmieCad_s_(x.inativo) === 'S', tags: OmieCad_tags_(x.tags) };
    }).filter(function (x) { return x.id; });
    return { itens: itens, porDocumento: !!filtro.cnpj_cpf, documento: filtro.cnpj_cpf ? OmieCad_docFmt_(d) : '' };
  });
}

/** Dados do SGO+ para o documento (Cadastros > Clientes e Compras > Fornecedores), para completar o que falta. */
function OmieCad_doSgo_(d) {
  var achados = { cliente: null, fornecedor: null };
  try {
    var abaCli = (typeof SGO_CFG !== 'undefined' && SGO_CFG.SHEETS && SGO_CFG.SHEETS.CAD_CLIENTES) || 'CAD_CLIENTES';
    achados.cliente = SGO_DATA.getAll(abaCli).filter(function (c) { return OmieCad_dig_(c.CNPJ) === d || OmieCad_dig_(c.CPF) === d; })[0] || null;
    if (achados.cliente) achados.cliente._aba = abaCli;
  } catch (e) {}
  try {
    var abaF = (typeof CMP_ABAS !== 'undefined' && CMP_ABAS.FORNECEDORES) || 'CMP_FORNECEDORES';
    achados.fornecedor = SGO_DATA.getAll(abaF).filter(function (f) { return OmieCad_dig_(f.DOCUMENTO) === d; })[0] || null;
    if (achados.fornecedor) achados.fornecedor._aba = abaF;
  } catch (e) {}
  return achados;
}
/** Junta os dados: o digitado ou lido da nota vale; o vazio é completado pelo SGO+. Cada campo leva a origem. */
function OmieCad_montarDados_(p, eu) {
  var base = {}, origem = {}, avisos = [];
  var campos = ['documento', 'razao', 'fantasia', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'codMunicipio', 'uf', 'cep', 'email', 'telefone', 'ie', 'im', 'crt'];
  var por = function (fonte, rotulo) { campos.forEach(function (k) { var v = OmieCad_s_(fonte && fonte[k], 200); if (v && !base[k]) { base[k] = v; origem[k] = rotulo; } }); };
  if (p.origem === 'nota') {
    if (typeof OmieNota_lerQualquer_ !== 'function') OmieOps_erro_('O leitor de notas não está disponível. Avise o responsável pelo sistema.');
    var l = OmieNota_lerQualquer_(p.xml, p.tipoNota, true);
    por(l.emitente, l.tipo === 'nfse' ? 'NFS-e (prestador)' : 'NF-e (emitente)');
  }
  por(p.dados || {}, 'digitado na tela');
  var d = OmieCad_dig_(base.documento);
  if (!d) OmieOps_erro_('Informe o CNPJ ou o CPF de quem será cadastrado.');
  var sgo = OmieCad_doSgo_(d), c = sgo.cliente, f = sgo.fornecedor;
  if (c) por({ razao: c.RAZAO_SOCIAL, fantasia: c.NOME_FANTASIA, logradouro: c.LOGRADOURO || c.ENDERECO, numero: c.NUMERO, complemento: c.COMPLEMENTO, bairro: c.BAIRRO, cidade: c.CIDADE, uf: c.UF, cep: c.CEP, email: c.EMAIL, telefone: c.TELEFONE }, 'cadastro de Clientes do SGO+');
  if (f) por({ razao: f.RAZAO_SOCIAL, fantasia: f.NOME_FANTASIA, logradouro: f.ENDERECO, cidade: f.CIDADE, uf: f.UF, email: f.EMAIL_PEDIDOS, telefone: f.TELEFONE }, 'cadastro de Fornecedores de Compras');
  if (d.length === 14 && (!base.logradouro || !base.cidade) && typeof SGO_CNPJ_consultarDados_ === 'function') {
    try {
      var q = SGO_CNPJ_consultarDados_(d) || {};
      por({ razao: q.razao_social, fantasia: q.nome_fantasia, logradouro: [q.descricao_tipo_de_logradouro, q.logradouro].filter(Boolean).join(' '), numero: q.numero, complemento: q.complemento, bairro: q.bairro, cidade: q.municipio, uf: q.uf, cep: q.cep, email: q.email, telefone: q.ddd_telefone_1 }, 'consulta pública do CNPJ');
    } catch (e) { avisos.push('A consulta pública do CNPJ não respondeu; o endereço vem só do que foi digitado e do SGO+.'); }
  }
  return { dados: base, origem: origem, avisos: avisos, documento: d, sgo: sgo };
}
function OmieCad_param_(m, tipo) {
  var b = m.dados, d = m.documento, avisos = m.avisos;
  var razao = OmieCad_s_(b.razao, 300);
  if (razao.length > 60) { avisos.push('A razão social tem ' + razao.length + ' letras; o Omie aceita 60. Vai cortada: "' + razao.slice(0, 60) + '".'); razao = razao.slice(0, 60); }
  var tel = OmieCad_dig_(b.telefone).replace(/^0+/, ''), cep = OmieCad_dig_(b.cep);
  var p = { codigo_cliente_integracao: 'SGO-' + d, razao_social: razao, nome_fantasia: OmieCad_s_(b.fantasia || razao, 100), cnpj_cpf: OmieCad_docFmt_(d), tags: OmieCad_tagsDoTipo_(tipo).map(function (t) { return { tag: t }; }) };
  if (d.length === 11) p.pessoa_fisica = 'S';
  if (b.logradouro) p.endereco = OmieCad_s_(b.logradouro, 60);
  if (b.numero) p.endereco_numero = OmieCad_s_(b.numero, 60);
  if (b.complemento) p.complemento = OmieCad_s_(b.complemento, 60);
  if (b.bairro) p.bairro = OmieCad_s_(b.bairro, 60);
  if (b.codMunicipio && /^\d{7}$/.test(b.codMunicipio)) p.cidade = b.codMunicipio; else if (b.cidade) p.cidade = OmieCad_s_(b.cidade, 40);
  if (b.uf && /^[A-Za-z]{2}$/.test(b.uf)) p.estado = b.uf.toUpperCase();
  if (cep.length === 8) p.cep = cep.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  if (b.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) p.email = OmieCad_s_(b.email, 500);
  if (tel.length >= 10) { p.telefone1_ddd = tel.slice(0, 2); p.telefone1_numero = tel.slice(2, 17); }
  if (b.ie && /^[0-9A-Za-z.\-\/]{2,20}$/.test(b.ie)) p.inscricao_estadual = b.ie;
  if (b.im) p.inscricao_municipal = OmieCad_s_(b.im, 20);
  if (b.crt === '1' || b.crt === '4') p.optante_simples_nacional = 'S'; else if (b.crt === '2' || b.crt === '3') p.optante_simples_nacional = 'N';
  if (!p.endereco || !p.cidade || !p.estado) avisos.push('Endereço incompleto (rua, cidade e UF). O Omie pode aceitar assim, mas a nota e o boleto precisam do endereço: complete aqui ou no cadastro do SGO+ antes, se puder.');
  return p;
}
function OmieCad_resumo_(param, m, acao, tipo, existente) {
  var o = m.origem, linhas = [];
  var add = function (rot, v, k) { if (v) linhas.push([rot, String(v), o[k] || '']); };
  linhas.push(['O que será feito', acao === 'incluir' ? 'Cadastrar no Omie como ' + OmieCad_tagsDoTipo_(tipo).join(' e ') : 'Acrescentar a tag ' + existente.faltam.join(' e ') + ' ao cadastro que já existe no Omie (' + existente.nome + '). Nada mais do cadastro muda.', '']);
  if (acao === 'incluir') {
    add('CNPJ ou CPF', param.cnpj_cpf, 'documento'); add('Razão social', param.razao_social, 'razao'); add('Nome fantasia', param.nome_fantasia, 'fantasia');
    add('Endereço', [param.endereco, param.endereco_numero, param.complemento, param.bairro].filter(Boolean).join(', '), 'logradouro');
    add('Cidade e UF', [param.cidade, param.estado].filter(Boolean).join(' / '), 'cidade'); add('CEP', param.cep, 'cep'); add('E-mail', param.email, 'email');
    add('Telefone', param.telefone1_ddd ? '(' + param.telefone1_ddd + ') ' + param.telefone1_numero : '', 'telefone');
    add('Inscrição estadual', param.inscricao_estadual, 'ie'); add('Simples Nacional', param.optante_simples_nacional === 'S' ? 'Optante' : param.optante_simples_nacional === 'N' ? 'Não optante' : '', 'crt');
    linhas.push(['Código de integração', param.codigo_cliente_integracao, 'gerado pelo SGO+ (o mesmo documento gera o mesmo código)']);
  } else linhas.push(['Tags depois da alteração', existente.tagsDepois.join(', '), 'cadastro atual do Omie + a que falta']);
  return linhas;
}
/** Prepara (sem gravar). payload: { tipo: 'cliente'|'fornecedor'|'ambos', origem: 'manual'|'nota', dados: {...}, xml, tipoNota } */
function OmieCad_apiPrevia(sessionId, payload) {
  return OmieOps_resposta_(function () {
    var eu = Omie_exigirAcesso_(sessionId, 'FIN_OMIE_LANCAR', 'cadastrar no Omie'), p = payload || {}, tipo = String(p.tipo || '');
    if (['cliente', 'fornecedor', 'ambos'].indexOf(tipo) < 0) OmieOps_erro_('Escolha se o cadastro é de cliente, de fornecedor ou dos dois.');
    var empresa = OmieOps_empresa_(), m = OmieCad_montarDados_(p, eu), d = m.documento;
    if (d.length !== 14 && d.length !== 11) OmieOps_erro_('O documento precisa ter 14 números (CNPJ) ou 11 (CPF). Fornecedor do exterior, sem CNPJ, é cadastrado direto no Omie (com o país).');
    if (!OmieCad_docOk_(d)) OmieOps_erro_('O ' + (d.length === 14 ? 'CNPJ' : 'CPF') + ' ' + OmieCad_docFmt_(d) + ' não confere (dígitos verificadores). Nada foi preparado; confira o número no documento.');
    if (d === OmieCad_empresaCnpj_()) OmieOps_erro_('Este é o CNPJ da própria empresa. Ela não é cadastrada como cliente ou fornecedor dela mesma. Nada foi preparado.');
    if (!OmieCad_s_(m.dados.razao)) OmieOps_erro_('Informe a razão social (o nome oficial, como no cartão CNPJ). Nada foi preparado.');
    var achou = OmieCad_procurar_(d, true), consultaEm = Date.now(), acao, param, call, existente = null;
    if (achou.ativos.length > 1) OmieOps_erro_('Há ' + achou.ativos.length + ' cadastros ativos no Omie com o documento ' + OmieCad_docFmt_(d) + '. Nada foi preparado: peça ao Financeiro para unificar no Omie (deixar um só ativo) e tente de novo.');
    var precisa = OmieCad_tagsDoTipo_(tipo);
    if (achou.ativos.length === 1) {
      var a = achou.ativos[0], faltam = precisa.filter(function (t) { return a.tags.map(function (x) { return x.toLowerCase(); }).indexOf(t.toLowerCase()) < 0; });
      if (!faltam.length) return { jaCadastrado: true, codigo: String(a.codigo), nome: a.nome, mensagem: 'Já cadastrado no Omie como ' + a.nome + ' (' + a.tags.join(', ') + '). Nada a fazer: use este cadastro.' };
      var atual = Omie_requisitar_('geral/clientes/', 'ConsultarCliente', { codigo_cliente_omie: a.codigo });
      var tagsAtuais = OmieCad_tags_(atual && atual.tags);
      var depois = tagsAtuais.concat(faltam.filter(function (t) { return tagsAtuais.map(function (x) { return x.toLowerCase(); }).indexOf(t.toLowerCase()) < 0; }));
      acao = 'tag'; call = 'AlterarCliente'; existente = { codigo: a.codigo, nome: a.nome, faltam: faltam, tagsDepois: depois };
      // A confirmar no Omie real: AlterarCliente substitui a lista inteira de tags. Por isso vai a lista completa (atual + a nova).
      param = { codigo_cliente_omie: a.codigo, tags: depois.map(function (t) { return { tag: t }; }) };
    } else if (achou.inativos > 0) {
      OmieOps_erro_('O documento ' + OmieCad_docFmt_(d) + ' já tem cadastro no Omie, mas inativo. Nada foi preparado: reativar é decisão do Financeiro e se faz no Omie (Clientes e Fornecedores). Depois de reativar, busque de novo aqui.');
    } else { acao = 'incluir'; call = 'IncluirCliente'; param = OmieCad_param_(m, tipo); }
    var resumo = OmieCad_resumo_(param, m, acao, tipo, existente), token = Utilities.getUuid(), agora = Date.now();
    var op = { acao: acao, call: call, param: param, tipo: tipo, documento: d, nome: acao === 'incluir' ? param.razao_social : existente.nome, codigoExistente: existente ? existente.codigo : 0,
      sgo: { cliente: m.sgo.cliente ? { aba: m.sgo.cliente._aba, id: OmieCad_s_(m.sgo.cliente.ID) } : null, fornecedor: m.sgo.fornecedor ? { aba: m.sgo.fornecedor._aba, id: OmieCad_s_(m.sgo.fornecedor.ID) } : null },
      vinculo: OmieOps_vinculo_(sessionId, eu), empresa: empresa, expira: agora + 10 * 60000, estado: 'pendente', consultaEm: consultaEm };
    var props = PropertiesService.getScriptProperties(), lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      (props.getKeys ? props.getKeys() : []).filter(function (k) { return k.indexOf(OMIE_CAD_PREFIXO) === 0; }).forEach(function (k) { try { var j = JSON.parse(props.getProperty(k)); if (j.expira < agora - 24 * 3600000) props.deleteProperty(k); } catch (e) {} });
      props.setProperty(OMIE_CAD_PREFIXO + token, JSON.stringify(op));
    } finally { lock.releaseLock(); }
    return { token: token, acao: acao, resumo: resumo, avisos: m.avisos, expiraEm: '10 minutos' };
  });
}
/** Grava o código do Omie no cadastro do SGO+ (só a coluna OMIE_CODIGO). Falhar aqui não desfaz o cadastro no Omie. */
function OmieCad_gravarCodigo_(ref, codigo) {
  if (!ref || !ref.aba || !ref.id || !codigo) return false;
  try { if (typeof CertCal_garantirColuna_ === 'function') CertCal_garantirColuna_(ref.aba, 'OMIE_CODIGO'); } catch (e) {}
  try { return SGO_DATA.update(ref.aba, ref.id, { OMIE_CODIGO: String(codigo) }) !== false; } catch (e) { return false; }
}
function OmieCad_apiConfirmar(sessionId, payload) {
  return OmieOps_resposta_(function () {
    var eu = Omie_exigirAcesso_(sessionId, 'FIN_OMIE_LANCAR', 'cadastrar no Omie'), token = OmieCad_s_((payload || {}).token, 80);
    if (!/^[a-zA-Z0-9-]{10,80}$/.test(token)) OmieOps_erro_('A prévia não é válida. Confira de novo.');
    var props = PropertiesService.getScriptProperties(), lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      var raw = props.getProperty(OMIE_CAD_PREFIXO + token), op = raw ? JSON.parse(raw) : null;
      if (!op || op.vinculo !== OmieOps_vinculo_(sessionId, eu)) OmieOps_erro_('Esta prévia não pertence à sua sessão. Confira de novo.');
      if (op.empresa !== OmieOps_empresa_()) OmieOps_erro_('A conexão Omie mudou desde a prévia. Confira de novo.');
      if (op.estado === 'concluida') return { jaConfirmada: true, codigo: String(op.codigo || ''), nome: op.nome, mensagem: 'Cadastro já confirmado.' };
      Omie_exigirGravacao_();
      if (op.estado !== 'pendente') OmieOps_erro_('O envio anterior ficou sem resposta do Omie. Busque o CNPJ de novo: se o cadastro aparecer, ele foi feito; se não, confira uma nova prévia.');
      if (op.expira < Date.now()) OmieOps_erro_('A prévia expirou. Confira de novo.');
      var faltam = typeof Omie_faltaReconsulta_ === 'function' ? Omie_faltaReconsulta_(op.consultaEm) : 0;
      if (faltam > 0) OmieOps_erro_('Para conferir que ninguém cadastrou este documento no Omie desde a prévia, o Omie exige 1 minuto entre duas consultas iguais. Nada foi enviado; toque em Confirmar de novo daqui a ' + faltam + ' segundo(s). A prévia continua valendo.');
      var agora = OmieCad_procurar_(op.documento, true); op.consultaEm = Date.now();
      if (op.acao === 'incluir' && agora.ativos.length) {
        op.estado = 'concluida'; op.codigo = agora.ativos[0].codigo; props.setProperty(OMIE_CAD_PREFIXO + token, JSON.stringify(op));
        return { codigo: String(op.codigo), nome: agora.ativos[0].nome, mensagem: 'Alguém cadastrou este documento no Omie depois da prévia (' + agora.ativos[0].nome + '). Nada foi enviado: use este cadastro.' };
      }
      if (op.acao === 'tag' && (agora.ativos.length !== 1 || agora.ativos[0].codigo !== op.codigoExistente)) OmieOps_erro_('O cadastro mudou no Omie desde a prévia. Nada foi enviado; confira de novo.');
      op.estado = 'enviando'; props.setProperty(OMIE_CAD_PREFIXO + token, JSON.stringify(op));
      var r;
      try { r = Omie_requisitar_('geral/clientes/', op.call, op.param); }
      catch (e) {
        if (e && (e.omieNaoExecutado || e.omieRecusado)) {
          op.estado = 'pendente'; props.setProperty(OMIE_CAD_PREFIXO + token, JSON.stringify(op));
          OmieOps_erro_(e.message + (e.omieRecusado ? '. Nada foi feito no Omie. Se o Omie pediu um campo obrigatório da conta, complete os dados e confira de novo.' : ''));
        }
        op.estado = 'incerta'; props.setProperty(OMIE_CAD_PREFIXO + token, JSON.stringify(op));
        OmieOps_erro_('O Omie não confirmou o cadastro. Ele pode ter sido feito: busque o CNPJ ' + OmieCad_docFmt_(op.documento) + ' daqui a 1 minuto. Nenhum reenvio automático será feito.');
      }
      var status = r && (r.codigo_status !== undefined ? r.codigo_status : r.cCodStatus);
      if (status !== undefined && !/^0+$/.test(String(status))) { op.estado = 'pendente'; props.setProperty(OMIE_CAD_PREFIXO + token, JSON.stringify(op)); OmieOps_erro_('O Omie recusou o cadastro' + (r.descricao_status ? ': ' + OmieCad_s_(r.descricao_status, 200) : '') + '. Nada foi feito.'); }
      // a busca por este documento (guardada 60 s) mudou: esquece, para o lançamento ver o cadastro novo na hora
      if (typeof Omie_esquecerLeitura_ === 'function') Omie_esquecerLeitura_('geral/clientes/', 'ListarClientes', OmieCad_paramBusca_(op.documento));
      var codigo = Number((r && r.codigo_cliente_omie) || op.codigoExistente) || 0;
      op.estado = 'concluida'; op.codigo = codigo; props.setProperty(OMIE_CAD_PREFIXO + token, JSON.stringify(op));
      var gravou = [];
      if (op.sgo && op.sgo.cliente && OmieCad_gravarCodigo_(op.sgo.cliente, codigo)) gravou.push('Clientes');
      if (op.sgo && op.sgo.fornecedor && OmieCad_gravarCodigo_(op.sgo.fornecedor, codigo)) gravou.push('Fornecedores de Compras');
      var det = (op.acao === 'incluir' ? 'Cadastro novo no Omie (' + OmieCad_tagsDoTipo_(op.tipo).join(' e ') + ')' : 'Tag acrescentada no Omie') + ' · documento final ' + op.documento.slice(-4) + ' · código Omie ' + codigo;
      if (typeof Omie_registrarAcesso_ === 'function') Omie_registrarAcesso_(eu, 'CADASTRO_OMIE', 'OmieCad_apiConfirmar', det);
      try { SGO_DATA.log('OMIE_CADASTRO', String(eu.usuario || eu.userId || ''), det, 'FINANCEIRO'); } catch (e) {}
      return { codigo: String(codigo), nome: op.nome, mensagem: (op.acao === 'incluir' ? 'Cadastrado no Omie: ' : 'Tag acrescentada no Omie: ') + op.nome + '.' + (gravou.length ? ' O código do Omie ficou guardado no cadastro do SGO+ (' + gravou.join(' e ') + ').' : '') };
    } finally { lock.releaseLock(); }
  });
}
