/**
 * SGO_QualifEquipamento.js — fluxo integrado cliente → unidade → equipamento → qualificação (20/10/2026).
 *
 * Comum aos módulos de qualificação (Autoclave a vapor, baixa temperatura e os próximos):
 *  - escolha do cliente, da unidade e do equipamento a partir do cadastro (nada é digitado de novo);
 *  - conferência do vínculo: equipamento de outro cliente ou de outra unidade é recusado;
 *  - pasta do equipamento dentro da pasta do cliente: <pasta do módulo>/<CNPJ>/<TAG - tipo>/Qualificação;
 *  - registro do documento emitido no Arquivo de documentos (DOC_DOCUMENTOS), com o vencimento da
 *    requalificação: aparece na ficha do equipamento, na unidade, no cliente e nas pendências;
 *  - lista das qualificações do equipamento (ficha "Qualificações" e QR code): só documento emitido e
 *    aprovado para o cliente (nunca minuta), revisões anteriores marcadas como substituídas, trilha de acesso;
 *  - situação do equipamento: qualificado, vencendo, vencido, reprovado ou sem qualificação.
 *
 * Fontes lidas (somente leitura, exceto o vínculo de relatório antigo, que só preenche campo vazio):
 *  QUALIF_EMISSOES (SGO_QualifEmissao.js), BT_ENSAIOS (baixa temperatura) e DOC_DOCUMENTOS.
 * Nenhuma função devolve Date: só strings.
 */

var SGO_QEQ_TIPO_DOC = '3. RELATÓRIOS DE QUALIFICAÇÃO';
var SGO_QEQ_PERFIS_EQUIPE = ['ADMIN', 'DIRETORIA', 'GESTOR', 'TECNICO', 'METROLOGIA'];
var SGO_QEQ_DIAS_VENCENDO = 30;

/** Títulos dos documentos por módulo de emissão (QUALIF_EMISSOES.MODULO). conta: entra na situação do equipamento. */
var SGO_QEQ_MODULOS = {
  AUTOCLAVE_OFICIAL: { titulo: 'Relatório de qualificação — autoclave a vapor', conta: true, ordem: 1 },
  AUTOCLAVE: { titulo: 'Relatório de ensaio de ciclo — autoclave a vapor', conta: false, ordem: 2 },
  AUTOCLAVE_DADOS: { titulo: 'Planilha de dados de ciclo — autoclave a vapor', conta: false, ordem: 3 }
};

function SGO_QEQ_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function SGO_QEQ_up_(v) { return SGO_QEQ_s_(v).toUpperCase(); }
function SGO_QEQ_digitos_(v) { return SGO_QEQ_s_(v).replace(/\D/g, ''); }
function SGO_QEQ_semAcento_(v) { return SGO_QEQ_s_(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(); }
function SGO_QEQ_normTag_(v) { return SGO_QEQ_semAcento_(v).replace(/[^A-Z0-9]/g, ''); }
function SGO_QEQ_ativo_(r) { return !!r && SGO_QEQ_up_(r.STATUS || 'ATIVO') === 'ATIVO'; }

function SGO_QEQ_aba_(chave) {
  try { if (typeof SGO_CFG !== 'undefined' && SGO_CFG.SHEETS && SGO_CFG.SHEETS[chave]) return SGO_CFG.SHEETS[chave]; } catch (e) {}
  return chave;
}

function SGO_QEQ_ler_(chave) {
  try { return (typeof SGO_DATA !== 'undefined' && SGO_DATA.getAll(SGO_QEQ_aba_(chave))) || []; } catch (e) { return []; }
}

function SGO_QEQ_porId_(chave, id) {
  if (!SGO_QEQ_s_(id)) return null;
  try { return SGO_DATA.getById(SGO_QEQ_aba_(chave), id) || null; } catch (e) { return null; }
}

function SGO_QEQ_ehEquipe_(sessao) { return SGO_QEQ_PERFIS_EQUIPE.indexOf(SGO_QEQ_up_(sessao && sessao.perfil)) >= 0; }
function SGO_QEQ_ehCliente_(sessao) { return SGO_QEQ_up_(sessao && sessao.perfil) === 'CLIENTE'; }

function SGO_QEQ_cnpjFmt_(c) {
  var d = SGO_QEQ_digitos_(c);
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : SGO_QEQ_s_(c);
}

function SGO_QEQ_maiusculaInicial_(t) {
  var s = SGO_QEQ_s_(t).toLowerCase();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function SGO_QEQ_hojeIso_() {
  try { return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd'); } catch (e) { return new Date().toISOString().slice(0, 10); }
}

/** dd/mm/aaaa[ hh:mm...], aaaa-mm-dd[T...] → aaaa-mm-dd (ou ''). */
function SGO_QEQ_iso_(v) {
  var s = SGO_QEQ_s_(v), m;
  if (!s) return '';
  if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) return m[1] + '-' + m[2] + '-' + m[3];
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s))) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}

function SGO_QEQ_br_(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(SGO_QEQ_s_(iso));
  return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
}

function SGO_QEQ_diasAte_(iso, hojeIso) {
  if (!iso) return null;
  var a = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  var h = hojeIso || SGO_QEQ_hojeIso_();
  var b = Date.UTC(+h.slice(0, 4), +h.slice(5, 7) - 1, +h.slice(8, 10));
  return Math.round((a - b) / 86400000);
}

/** Soma meses a uma data aaaa-mm-dd (último dia do mês quando o dia não existe). */
function SGO_QEQ_somarMeses_(iso, meses) {
  if (!iso) return '';
  var a = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1 + Number(meses || 0), d = +iso.slice(8, 10);
  var ano = a + Math.floor(m / 12), mes = ((m % 12) + 12) % 12;
  var ultimo = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return ano + '-' + ('0' + (mes + 1)).slice(-2) + '-' + ('0' + Math.min(d, ultimo)).slice(-2);
}

/* ============================================================
 * Escolha do cliente, da unidade e do equipamento (cadastro)
 * ============================================================ */

function SGO_QEQ_nomeCliente_(c) { return SGO_QEQ_s_(c && (c.RAZAO_SOCIAL || c.NOME_FANTASIA)); }

function SGO_QEQ_pesquisarClientes_(sessao, termo) {
  var t = SGO_QEQ_semAcento_(termo), dig = SGO_QEQ_digitos_(termo);
  var lista = SGO_QEQ_ler_('CAD_CLIENTES').filter(SGO_QEQ_ativo_);
  if (SGO_QEQ_ehCliente_(sessao)) lista = lista.filter(function (c) { return SGO_QEQ_s_(c.ID) === SGO_QEQ_s_(sessao.clienteId); });
  if (t.length >= 2 || dig.length >= 3) {
    lista = lista.filter(function (c) {
      var nome = SGO_QEQ_semAcento_((c.RAZAO_SOCIAL || '') + ' ' + (c.NOME_FANTASIA || ''));
      return (t.length >= 2 && nome.indexOf(t) >= 0) || (dig.length >= 3 && SGO_QEQ_digitos_(c.CNPJ).indexOf(dig) >= 0);
    });
  }
  return lista.sort(function (a, b) { return SGO_QEQ_nomeCliente_(a).localeCompare(SGO_QEQ_nomeCliente_(b), 'pt-BR'); }).slice(0, 40).map(function (c) {
    return { id: SGO_QEQ_s_(c.ID), nome: SGO_QEQ_s_(c.NOME_FANTASIA) || SGO_QEQ_s_(c.RAZAO_SOCIAL), razao: SGO_QEQ_s_(c.RAZAO_SOCIAL) || SGO_QEQ_s_(c.NOME_FANTASIA), cnpj: SGO_QEQ_cnpjFmt_(c.CNPJ) };
  });
}

function SGO_QEQ_listarUnidades_(sessao, clienteId) {
  var cli = SGO_QEQ_s_(clienteId);
  if (SGO_QEQ_ehCliente_(sessao) && cli !== SGO_QEQ_s_(sessao.clienteId)) throw new Error('Acesso negado a este cliente.');
  return SGO_QEQ_ler_('CAD_UNIDADES').filter(function (u) { return SGO_QEQ_ativo_(u) && SGO_QEQ_s_(u.CLIENTE_ID) === cli; })
    .sort(function (a, b) { return SGO_QEQ_s_(a.NOME_UNIDADE).localeCompare(SGO_QEQ_s_(b.NOME_UNIDADE), 'pt-BR'); })
    .map(function (u) { return { id: SGO_QEQ_s_(u.ID), nome: SGO_QEQ_s_(u.NOME_UNIDADE) || 'Unidade', endereco: SGO_QEQ_s_(u.ENDERECO) }; });
}

/** filtroTipo (opcional): RegExp sobre o tipo do equipamento (ex.: /autoclave|esteriliz/i). Os outros vêm depois, marcados. */
function SGO_QEQ_listarEquipamentos_(sessao, clienteId, unidadeId, filtroTipo) {
  var cli = SGO_QEQ_s_(clienteId), uni = SGO_QEQ_s_(unidadeId);
  if (SGO_QEQ_ehCliente_(sessao) && cli !== SGO_QEQ_s_(sessao.clienteId)) throw new Error('Acesso negado a este cliente.');
  var itens = SGO_QEQ_ler_('CAD_EQUIPAMENTOS').filter(function (e) {
    return SGO_QEQ_ativo_(e) && SGO_QEQ_s_(e.CLIENTE_ID) === cli && (!uni || SGO_QEQ_s_(e.UNIDADE_ID) === uni);
  }).map(function (e) {
    var tipo = SGO_QEQ_s_(e.TIPO);
    return { id: SGO_QEQ_s_(e.ID), tag: SGO_QEQ_s_(e.TAG), tipo: SGO_QEQ_maiusculaInicial_(tipo), serie: SGO_QEQ_s_(e.SERIE), setor: SGO_QEQ_s_(e.SETOR),
      compativel: !filtroTipo || filtroTipo.test(SGO_QEQ_semAcento_(tipo)) };
  });
  return itens.sort(function (a, b) { return (b.compativel - a.compativel) || a.tag.localeCompare(b.tag, 'pt-BR'); });
}

/**
 * Identificação a partir do cadastro, com o vínculo conferido. Lança erro com o que fazer quando
 * falta escolha, quando o equipamento é de outro cliente/unidade ou quando o cadastro está inativo.
 * Devolve { clienteId, unidadeId, equipamentoId, cliente, nomeFantasia, cnpj, endereco, cidadeUf, unidade,
 *           setor, tag, tipo, numeroSerie, _nomesProibidos }.
 */
function SGO_QEQ_identificacao_(sessionId, clienteId, unidadeId, equipamentoId) {
  var cli = SGO_QEQ_s_(clienteId), uni = SGO_QEQ_s_(unidadeId), eqId = SGO_QEQ_s_(equipamentoId);
  if (!cli || !uni || !eqId) {
    throw new Error('Escolha o cliente, a unidade e o equipamento em "Cliente e equipamento", no início da tela. Eles vêm do cadastro: ' +
      'se algum não aparecer, cadastre em Cadastros (Clientes, depois Unidades, depois Equipamentos) e volte aqui.');
  }
  var c = SGO_QEQ_porId_('CAD_CLIENTES', cli), u = SGO_QEQ_porId_('CAD_UNIDADES', uni), e = SGO_QEQ_porId_('CAD_EQUIPAMENTOS', eqId);
  if (!c || !u || !e) throw new Error('O cliente, a unidade ou o equipamento escolhido não está mais no cadastro (pode ter sido excluído ou trocado). Escolha de novo em "Cliente e equipamento".');
  if (SGO_QEQ_s_(e.CLIENTE_ID) !== cli) {
    throw new Error('O equipamento ' + (SGO_QEQ_s_(e.TAG) || 'escolhido') + ' pertence a outro cliente no cadastro, e o relatório não pode ser gerado para ele com este cliente. ' +
      'Escolha o equipamento na lista do cliente certo; se o cadastro estiver errado, a gestão corrige em Cadastros › Vínculos.');
  }
  if (SGO_QEQ_s_(e.UNIDADE_ID) !== uni || SGO_QEQ_s_(u.CLIENTE_ID) !== cli) {
    throw new Error('O equipamento ' + (SGO_QEQ_s_(e.TAG) || 'escolhido') + ' está ligado a outra unidade no cadastro. Escolha a unidade em que ele está instalado ou peça à gestão para corrigir em Cadastros › Vínculos.');
  }
  if (!SGO_QEQ_ativo_(c) || !SGO_QEQ_ativo_(u) || !SGO_QEQ_ativo_(e)) {
    throw new Error('O cliente, a unidade ou o equipamento está inativo no cadastro. Reative em Cadastros (ou peça à gestão) e volte aqui.');
  }
  // Mesmas regras do painel de vínculos (perfil do cliente, cadastros ativos).
  if (typeof SGO_VINCULOS !== 'undefined' && SGO_VINCULOS && typeof SGO_VINCULOS.relation === 'function') {
    SGO_VINCULOS.relation(sessionId, cli, uni, eqId);
  }
  var nomes = [e.FABRICANTE, e.MODELO].map(SGO_QEQ_s_).filter(function (x) { return x.length >= 3; });
  return {
    clienteId: cli, unidadeId: uni, equipamentoId: eqId,
    cliente: SGO_QEQ_nomeCliente_(c), nomeFantasia: SGO_QEQ_s_(c.NOME_FANTASIA), cnpj: SGO_QEQ_cnpjFmt_(c.CNPJ),
    endereco: SGO_QEQ_s_(u.ENDERECO) || SGO_QEQ_s_(c.ENDERECO),
    cidadeUf: [SGO_QEQ_s_(u.CIDADE), SGO_QEQ_s_(u.UF)].filter(Boolean).join('/'),
    unidade: SGO_QEQ_s_(u.NOME_UNIDADE), setor: SGO_QEQ_s_(e.SETOR),
    tag: SGO_QEQ_s_(e.TAG), tipo: SGO_QEQ_maiusculaInicial_(e.TIPO) || 'Equipamento', numeroSerie: SGO_QEQ_s_(e.SERIE),
    _nomesProibidos: nomes
  };
}

/**
 * Para as telas de ensaio que guardam texto livre (Autoclave a vapor): exige o vínculo e troca os campos de
 * identificação do payload pelos do cadastro. Desligado só se a propriedade QUALIF_VINCULO_OBRIGATORIO = NAO.
 * Devolve o payload (cópia) com cliente, CNPJ, endereço, setor, TAG e nº de série do cadastro.
 */
function SGO_QEQ_aplicarVinculoPayload_(sessionId, payload) {
  payload = payload || {};
  var obrigatorio = true;
  try { obrigatorio = SGO_QEQ_up_(PropertiesService.getScriptProperties().getProperty('QUALIF_VINCULO_OBRIGATORIO')) !== 'NAO'; } catch (e) {}
  if (!payload.equipamentoId && !obrigatorio) return payload;
  var id = SGO_QEQ_identificacao_(sessionId, payload.clienteId, payload.unidadeId, payload.equipamentoId);
  return Object.assign({}, payload, {
    clienteId: id.clienteId, unidadeId: id.unidadeId, equipamentoId: id.equipamentoId,
    cliente: id.cliente, cnpj: id.cnpj, endereco: [id.endereco, id.cidadeUf].filter(Boolean).join(' - '),
    setor: [id.unidade, id.setor].filter(Boolean).join(' — '), tag: id.tag, numSerie: id.numeroSerie
  });
}

/* ============================================================
 * Pasta do equipamento e Arquivo de documentos
 * ============================================================ */

function SGO_QEQ_subpasta_(pai, nome) {
  var it = pai.getFoldersByName(nome);
  return it.hasNext() ? it.next() : pai.createFolder(nome);
}

/** <raiz do módulo>/<CNPJ do cliente>/<TAG - tipo>/Qualificação (cria o que faltar). */
function SGO_QEQ_pastaEquipamento_(raiz, ident) {
  var cliente = SGO_DocSalvar_pastaClienteEm_(raiz, ident.cnpj, ident.cliente);
  var nomeEq = SGO_DocSalvar_sanitizarNome_([ident.tag || 'Sem TAG', ident.tipo || 'Equipamento'].join(' - '));
  return SGO_QEQ_subpasta_(SGO_QEQ_subpasta_(cliente, nomeEq), 'Qualificação');
}

/**
 * Registra o PDF emitido no Arquivo de documentos (cliente, unidade e equipamento), sem duplicar.
 * o: { nomeArquivo, link, vencimentoIso }. Nunca lança: { ok, aviso }.
 */
function SGO_QEQ_registrarDocumento_(sessionId, ident, o) {
  try {
    if (typeof SGO_DOCUMENTOS === 'undefined' || !SGO_DOCUMENTOS.registrarDocumentoExistente) return { ok: false, aviso: 'o Arquivo de documentos não está disponível neste ambiente' };
    var link = SGO_QEQ_s_(o.link);
    var ja = SGO_QEQ_ler_('DOC_DOCUMENTOS').some(function (d) { return SGO_QEQ_s_(d.LINK_ARQUIVO) === link; });
    if (ja) return { ok: true, jaExistia: true };
    var r = SGO_DOCUMENTOS.registrarDocumentoExistente(sessionId, {
      CLIENTE_ID: ident.clienteId, UNIDADE_ID: ident.unidadeId, EQUIPAMENTO_ID: ident.equipamentoId,
      TIPO_DOCUMENTO: SGO_QEQ_TIPO_DOC, NOME_ARQUIVO: o.nomeArquivo, LINK_ARQUIVO: link, DATA_VENCIMENTO: o.vencimentoIso || ''
    });
    if (r && r.success) return { ok: true };
    return { ok: false, aviso: (r && r.message) || 'o Arquivo de documentos não confirmou o registro' };
  } catch (e) {
    return { ok: false, aviso: String(e && e.message ? e.message : e) };
  }
}

/* ============================================================
 * Qualificações do equipamento (ficha, QR code, cronograma, pendências)
 * ============================================================ */

function SGO_QEQ_idDoLink_(link) {
  var s = SGO_QEQ_s_(link);
  if (typeof SGO_DocSalvar_idDaUrl_ === 'function') { try { var id = SGO_DocSalvar_idDaUrl_(s); if (id) return String(id); } catch (e) {} }
  var m = /\/arquivos\/([A-Za-z0-9_-]+)/.exec(s) || /\/d\/([A-Za-z0-9_-]+)/.exec(s) || /[?&]id=([A-Za-z0-9_-]+)/.exec(s);
  return m ? m[1] : '';
}

/** Todos os itens de qualificação por equipamento: { eqId: [item] }. Item: { ref, origem, titulo, numero, revisao, emitidoEm, validadeAte, resultado, situacao, conta, aprovadoPor, pdfId, htmlId, link } */
function SGO_QEQ_todosItens_() {
  var porEq = {}, idsArquivo = {};
  var docs = SGO_QEQ_ler_('DOC_DOCUMENTOS');
  var vencPorArquivo = {};
  docs.forEach(function (d) { var id = SGO_QEQ_idDoLink_(d.LINK_ARQUIVO); if (id) vencPorArquivo[id] = SGO_QEQ_iso_(d.DATA_VENCIMENTO); });
  function add(eq, it) { if (!eq) return; (porEq[eq] = porEq[eq] || []).push(it); if (it.pdfId) idsArquivo[it.pdfId] = true; }

  // 1. Emissões com aprovação do responsável técnico (Autoclave a vapor e próximos módulos).
  var qe = [];
  try { if (typeof SGO_QE_lerTudo_ === 'function') qe = SGO_QE_lerTudo_(); } catch (e) { qe = []; }
  qe.forEach(function (r) {
    var eq = SGO_QEQ_s_(r.EQUIPAMENTO_ID);
    if (!eq) return;
    var st = SGO_QEQ_up_(r.STATUS);
    var sit = st === 'EMITIDO' ? 'VIGENTE' : (st === 'SUBSTITUIDO' ? 'SUBSTITUIDO' : (st === 'AGUARDANDO_APROVACAO' || st === 'DEVOLVIDO' ? 'MINUTA' : ''));
    if (!sit) return;
    var mod = SGO_QEQ_MODULOS[SGO_QEQ_up_(r.MODULO)] || { titulo: 'Documento de qualificação', conta: false, ordem: 9 };
    var validade = SGO_QEQ_iso_(r.VALIDADE_ATE) || vencPorArquivo[SGO_QEQ_s_(r.PDF_ID)] || '';
    add(eq, {
      ref: 'QE:' + SGO_QEQ_s_(r.ID), origem: 'EMISSAO', modulo: SGO_QEQ_up_(r.MODULO), titulo: mod.titulo, ordem: mod.ordem,
      numero: SGO_QEQ_s_(r.NUMERO), revisao: SGO_QEQ_s_(r.REVISAO) || '0', emitidoEmIso: SGO_QEQ_iso_(r.APROVADO_EM),
      validadeIso: validade, resultado: SGO_QEQ_up_(r.RESULTADO), situacao: sit, conta: mod.conta && sit === 'VIGENTE',
      aprovadoPor: sit === 'MINUTA' ? '' : SGO_QEQ_s_(r.APROVADO_POR), pdfId: sit === 'MINUTA' ? '' : SGO_QEQ_s_(r.PDF_ID), htmlId: sit === 'MINUTA' ? '' : SGO_QEQ_s_(r.HTML_ID), link: ''
    });
  });

  // 2. Esterilização a baixa temperatura (tabela própria do módulo).
  var abaBt = (typeof BAIXATEMP_CFG !== 'undefined' && BAIXATEMP_CFG.ABA_ENSAIOS) || 'BT_ENSAIOS';
  var mesesBt = (typeof BAIXATEMP_CFG !== 'undefined' && Number(BAIXATEMP_CFG.VALIDADE_DOCUMENTO_MESES)) || 12;
  var bt = [];
  try { bt = (typeof SGO_DATA !== 'undefined' && SGO_DATA.getAll(abaBt)) || []; } catch (e) { bt = []; }
  var maiorRev = {};
  bt.forEach(function (r) { if (SGO_QEQ_up_(r.STATUS) === 'EMITIDO') { var n = SGO_QEQ_s_(r.NUMERO); maiorRev[n] = Math.max(maiorRev[n] === undefined ? -1 : maiorRev[n], parseInt(r.REVISAO, 10) || 0); } });
  bt.forEach(function (r) {
    var eq = SGO_QEQ_s_(r.EQUIPAMENTO_ID), st = SGO_QEQ_up_(r.STATUS);
    if (!eq || (st !== 'EMITIDO' && st !== 'EM_REVISAO' && st !== 'APROVADO')) return;
    var minuta = st !== 'EMITIDO';
    var vigente = !minuta && (parseInt(r.REVISAO, 10) || 0) === maiorRev[SGO_QEQ_s_(r.NUMERO)];
    var emit = SGO_QEQ_iso_(r.EMITIDO_EM);
    var pdf = SGO_QEQ_s_(r.PDF_ID);
    add(eq, {
      ref: 'BT:' + SGO_QEQ_s_(r.ID), origem: 'BAIXA_TEMPERATURA', modulo: 'BAIXA_TEMPERATURA', titulo: 'Relatório de qualificação — esterilizador a baixa temperatura', ordem: 1,
      numero: SGO_QEQ_s_(r.NUMERO), revisao: SGO_QEQ_s_(r.REVISAO) || '0', emitidoEmIso: emit,
      validadeIso: minuta ? '' : (vencPorArquivo[pdf] || SGO_QEQ_somarMeses_(emit, mesesBt)), resultado: SGO_QEQ_up_(r.RESULTADO),
      situacao: minuta ? 'MINUTA' : (vigente ? 'VIGENTE' : 'SUBSTITUIDO'), conta: vigente,
      aprovadoPor: minuta ? '' : SGO_QEQ_s_(r.APROVADO_RT || r.APROVADO_POR), pdfId: minuta ? '' : pdf, htmlId: minuta ? '' : SGO_QEQ_s_(r.HTML_ID), link: minuta ? '' : SGO_QEQ_s_(r.LINK_PDF)
    });
  });

  // 3. Relatórios de qualificação guardados no Arquivo de documentos (enviados pela equipe), sem repetir os de cima.
  docs.forEach(function (d) {
    var eq = SGO_QEQ_s_(d.EQUIPAMENTO_ID);
    if (!eq || SGO_QEQ_up_(d.STATUS) !== 'ATIVO' || !/QUALIFICA/.test(SGO_QEQ_semAcento_(d.TIPO_DOCUMENTO))) return;
    var id = SGO_QEQ_idDoLink_(d.LINK_ARQUIVO);
    if (id && idsArquivo[id]) return;
    add(eq, {
      ref: 'DOC:' + SGO_QEQ_s_(d.ID), origem: 'ARQUIVO', modulo: 'ARQUIVO', titulo: SGO_QEQ_s_(d.NOME_ARQUIVO) || 'Relatório de qualificação', ordem: 4,
      numero: '', revisao: '', emitidoEmIso: SGO_QEQ_iso_(d.DATA_EMISSAO || d.CRIADO_EM), validadeIso: SGO_QEQ_iso_(d.DATA_VENCIMENTO),
      resultado: '', situacao: 'VIGENTE', conta: true, aprovadoPor: '', pdfId: id, htmlId: '', link: SGO_QEQ_s_(d.LINK_ARQUIVO)
    });
  });

  Object.keys(porEq).forEach(function (eq) {
    porEq[eq].sort(function (a, b) {
      return (a.situacao === 'MINUTA') - (b.situacao === 'MINUTA') || b.emitidoEmIso.localeCompare(a.emitidoEmIso) || a.ordem - b.ordem || (parseInt(b.revisao, 10) || 0) - (parseInt(a.revisao, 10) || 0);
    });
  });
  return porEq;
}

/** Situação do equipamento pelos documentos vigentes que têm validade. */
function SGO_QEQ_situacao_(itens, hojeIso) {
  var cand = (itens || []).filter(function (i) { return i.conta && i.validadeIso; });
  if (!cand.length) {
    var temCiclo = (itens || []).some(function (i) { return i.situacao === 'VIGENTE'; });
    return { situacao: 'SEM_QUALIFICACAO', rotulo: temCiclo ? 'Sem relatório de qualificação emitido (há relatórios de ensaio de ciclo)' : 'Sem qualificação registrada', validadeAte: '', dias: null };
  }
  cand.sort(function (a, b) { return b.emitidoEmIso.localeCompare(a.emitidoEmIso) || b.validadeIso.localeCompare(a.validadeIso); });
  var it = cand[0];
  var dias = SGO_QEQ_diasAte_(it.validadeIso, hojeIso);
  var br = SGO_QEQ_br_(it.validadeIso);
  if (it.resultado === 'REPROVADO') return { situacao: 'REPROVADO', rotulo: 'Última qualificação reprovada' + (it.emitidoEmIso ? ' (emitida em ' + SGO_QEQ_br_(it.emitidoEmIso) + ')' : '') + ': o equipamento precisa de correção e nova qualificação', validadeAte: br, dias: dias };
  if (dias < 0) return { situacao: 'VENCIDO', rotulo: 'Qualificação vencida desde ' + br, validadeAte: br, dias: dias };
  if (dias <= SGO_QEQ_DIAS_VENCENDO) return { situacao: 'VENCENDO', rotulo: dias === 0 ? 'Requalificação vence hoje' : 'Requalificação vence em ' + dias + (dias === 1 ? ' dia' : ' dias') + ' (' + br + ')', validadeAte: br, dias: dias };
  return { situacao: 'QUALIFICADO', rotulo: 'Qualificado até ' + br, validadeAte: br, dias: dias };
}

/** { eqId: situação } de todos os equipamentos com algum documento (para listas e cronograma). */
function SGO_QEQ_situacoesPorEquipamento_() {
  var todos = SGO_QEQ_todosItens_(), hoje = SGO_QEQ_hojeIso_(), out = {};
  Object.keys(todos).forEach(function (eq) { out[eq] = SGO_QEQ_situacao_(todos[eq].filter(function (i) { return i.situacao !== 'MINUTA'; }), hoje); });
  return out;
}

function SGO_QEQ_itemPublico_(i, equipe) {
  return {
    ref: i.ref, origem: i.origem, titulo: i.titulo, numero: i.numero, revisao: i.revisao,
    emitidoEm: SGO_QEQ_br_(i.emitidoEmIso), validadeAte: SGO_QEQ_br_(i.validadeIso), resultado: i.resultado,
    situacao: i.situacao, situacaoRotulo: i.situacao === 'VIGENTE' ? 'Vigente' : (i.situacao === 'SUBSTITUIDO' ? 'Substituído por revisão posterior' : 'Aguardando aprovação (minuta, não é entregue ao cliente)'),
    aprovadoPor: i.aprovadoPor, temArquivo: !!(i.pdfId || i.link), conta: !!i.conta, equipe: !!equipe
  };
}

/** Equipamento que a sessão pode ver (cliente: só os dele). Lança erro com o motivo. */
function SGO_QEQ_equipamentoVisivel_(sessao, equipamentoId) {
  var e = SGO_QEQ_porId_('CAD_EQUIPAMENTOS', equipamentoId);
  if (!e) throw new Error('Equipamento não encontrado no cadastro. Atualize a lista e tente de novo.');
  if (SGO_QEQ_ehCliente_(sessao) && SGO_QEQ_s_(e.CLIENTE_ID) !== SGO_QEQ_s_(sessao.clienteId)) {
    throw new Error('Acesso negado: este equipamento não pertence ao seu cadastro de cliente.');
  }
  return e;
}

function SGO_QEQ_log_(acao, sessao, detalhe) {
  try { if (typeof SGO_DATA !== 'undefined' && SGO_DATA.log) SGO_DATA.log(acao, SGO_QEQ_s_(sessao && (sessao.usuario || sessao.nome)), detalhe, 'QUALIFICACAO'); } catch (e) {}
}

/** Lista para a ficha do equipamento e para o QR. Cliente: só emitido e aprovado (vigente e substituído). */
function SGO_QEQ_listarParaSessao_(sessao, equipamentoId) {
  var e = SGO_QEQ_equipamentoVisivel_(sessao, equipamentoId);
  var equipe = SGO_QEQ_ehEquipe_(sessao);
  var itens = (SGO_QEQ_todosItens_()[SGO_QEQ_s_(e.ID)] || []).filter(function (i) { return equipe || i.situacao !== 'MINUTA'; });
  var sit = SGO_QEQ_situacao_(itens.filter(function (i) { return i.situacao !== 'MINUTA'; }));
  return {
    success: true, situacao: sit, itens: itens.map(function (i) { return SGO_QEQ_itemPublico_(i, equipe); }),
    equipamento: { ID: SGO_QEQ_s_(e.ID), TAG: SGO_QEQ_s_(e.TAG), TIPO: SGO_QEQ_maiusculaInicial_(e.TIPO) }, podeVerMinutas: equipe
  };
}

/* ============================================================
 * Vínculo de relatório antigo (só preenche campo vazio)
 * ============================================================ */

/** Relatórios de ensaio de ciclo do mesmo cliente que ainda não estão ligados a equipamento algum. */
function SGO_QEQ_emissoesSemVinculo_(ident, modulos) {
  var cnpj = SGO_QEQ_digitos_(ident.cnpj), nome = SGO_QEQ_semAcento_(ident.cliente), tag = SGO_QEQ_normTag_(ident.tag);
  var lista = [];
  try { lista = SGO_QE_lerTudo_(); } catch (e) { lista = []; }
  return lista.filter(function (r) {
    if ((modulos || ['AUTOCLAVE']).indexOf(SGO_QEQ_up_(r.MODULO)) < 0) return false;
    if (SGO_QEQ_s_(r.EQUIPAMENTO_ID) || SGO_QEQ_up_(r.STATUS) !== 'EMITIDO') return false;
    var c = SGO_QEQ_digitos_(r.CNPJ);
    return c ? c === cnpj : (!!nome && SGO_QEQ_semAcento_(r.CLIENTE) === nome);
  }).map(function (r) {
    return { id: SGO_QEQ_s_(r.ID), numero: SGO_QEQ_s_(r.NUMERO), revisao: SGO_QEQ_s_(r.REVISAO) || '0', tag: SGO_QEQ_s_(r.TAG), resultado: SGO_QEQ_up_(r.RESULTADO),
      emitidoEm: SGO_QEQ_br_(SGO_QEQ_iso_(r.APROVADO_EM)), mesmaTag: !!tag && SGO_QEQ_normTag_(r.TAG) === tag };
  });
}

/**
 * Liga um relatório emitido antes do vínculo ao equipamento escolhido. Só preenche CLIENTE_ID, UNIDADE_ID e
 * EQUIPAMENTO_ID vazios: relatório já ligado a outro equipamento, de outro CNPJ ou com outra TAG (sem
 * confirmação) é recusado. Nada do documento emitido muda.
 */
function SGO_QEQ_vincularEmissao_(sessionId, sessao, p) {
  if (!SGO_QEQ_ehEquipe_(sessao)) throw new Error('Somente a equipe técnica liga relatórios a equipamentos.');
  var ident = SGO_QEQ_identificacao_(sessionId, p.clienteId, p.unidadeId, p.equipamentoId);
  var reg = SGO_QE_obter_(p.emissaoId);
  if (!reg) throw new Error('Relatório não encontrado. Atualize a lista e tente de novo.');
  var atual = SGO_QEQ_s_(reg.EQUIPAMENTO_ID);
  if (atual === ident.equipamentoId) return { ok: true, mensagem: 'O relatório ' + reg.NUMERO + ' já está ligado a este equipamento.' };
  if (atual) throw new Error('O relatório ' + reg.NUMERO + ' já está ligado a outro equipamento e não é trocado por aqui. Se o vínculo estiver errado, a gestão corrige em Cadastros › Vínculos.');
  var cnpjReg = SGO_QEQ_digitos_(reg.CNPJ);
  if (cnpjReg && cnpjReg !== SGO_QEQ_digitos_(ident.cnpj)) throw new Error('O relatório ' + reg.NUMERO + ' foi emitido para outro CNPJ (' + SGO_QEQ_cnpjFmt_(cnpjReg) + ') e não pode ser ligado a um equipamento deste cliente.');
  if (SGO_QEQ_s_(reg.TAG) && SGO_QEQ_normTag_(reg.TAG) !== SGO_QEQ_normTag_(ident.tag) && p.confirmarTagDiferente !== true) {
    throw new Error('A TAG do relatório (' + reg.TAG + ') é diferente da TAG do cadastro (' + (ident.tag || 'sem TAG') + '). Confira se é o mesmo equipamento; se for (por exemplo, a etiqueta foi trocada), marque "É o mesmo equipamento" e vincule de novo.');
  }
  var campos = {};
  if (!SGO_QEQ_s_(reg.CLIENTE_ID)) campos.CLIENTE_ID = ident.clienteId;
  if (!SGO_QEQ_s_(reg.UNIDADE_ID)) campos.UNIDADE_ID = ident.unidadeId;
  campos.EQUIPAMENTO_ID = ident.equipamentoId;
  SGO_QE_atualizar_(reg.ID, campos);
  SGO_QEQ_log_('QUALIF_VINCULO_RELATORIO', sessao, 'Relatório ' + reg.NUMERO + ' rev ' + (reg.REVISAO || '0') + ' (' + reg.MODULO + ') ligado ao equipamento ' + ident.equipamentoId + ' (' + ident.tag + ').');
  return { ok: true, mensagem: 'Relatório ' + reg.NUMERO + ' ligado ao equipamento ' + (ident.tag || ident.equipamentoId) + '. O documento emitido não foi alterado.' };
}

/* ============================================================
 * Chamadas das telas (google.script.run): ficha do equipamento e QR code
 * ============================================================ */

function qualifEquipamentoListar(sessionId, equipamentoId) {
  try {
    var sessao = exigirSessao(String(sessionId || ''));
    return JSON.parse(JSON.stringify(SGO_QEQ_listarParaSessao_(sessao, equipamentoId)));
  } catch (e) {
    return { success: false, message: typeof SGO_textoFalhaOperador_ === 'function' ? SGO_textoFalhaOperador_('carregar as qualificações do equipamento', e) : String(e && e.message ? e.message : e) };
  }
}

/** Lista do QR code (prontuário do equipamento), com trilha de acesso. */
function qrcodeQualificacao(sessionId, equipamentoId) {
  try {
    var sessao = exigirSessao(String(sessionId || ''));
    var r;
    try { r = SGO_QEQ_listarParaSessao_(sessao, equipamentoId); }
    catch (eNeg) { SGO_QEQ_log_('QRCODE_QUALIFICACAO_NEGADO', sessao, 'Equipamento ' + equipamentoId + ': ' + (eNeg && eNeg.message)); throw eNeg; }
    // No QR a lista é a do cliente: só emitido e aprovado, também para a equipe.
    r.itens = r.itens.filter(function (i) { return i.situacao !== 'MINUTA'; });
    r.podeVerMinutas = false;
    SGO_QEQ_log_('QRCODE_QUALIFICACAO_VISTA', sessao, 'Equipamento ' + equipamentoId + ' (perfil ' + SGO_QEQ_up_(sessao.perfil) + '): ' + r.itens.length + ' documento(s) listados.');
    return JSON.parse(JSON.stringify(r));
  } catch (e) {
    return { success: false, message: typeof SGO_textoFalhaOperador_ === 'function' ? SGO_textoFalhaOperador_('carregar a qualificação do equipamento', e) : String(e && e.message ? e.message : e) };
  }
}

/** Abre um documento da lista (ficha ou QR): confere o acesso, registra a abertura e devolve o endereço. */
function qualifEquipamentoAbrir(sessionId, equipamentoId, ref, via) {
  try {
    var sessao = exigirSessao(String(sessionId || ''));
    SGO_QEQ_equipamentoVisivel_(sessao, equipamentoId);
    var itens = SGO_QEQ_todosItens_()[SGO_QEQ_s_(equipamentoId)] || [];
    var it = itens.filter(function (i) { return i.ref === SGO_QEQ_s_(ref); })[0];
    if (!it) throw new Error('Documento não encontrado neste equipamento. Atualize a lista.');
    if (it.situacao === 'MINUTA') throw new Error('Este documento ainda aguarda a aprovação do responsável técnico e não pode ser aberto por aqui. A prévia fica na tela do módulo, em "Aguardando aprovação".');
    var url = it.link;
    if (it.pdfId) {
      var arq = DriveApp.getFileById(it.pdfId);
      if (SGO_QEQ_ehCliente_(sessao)) { try { arq.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (eS) {} }
      url = arq.getUrl();
    }
    if (!url) throw new Error('O arquivo deste documento não foi encontrado. Avise a Metrolabs para conferir o documento emitido.');
    SGO_QEQ_log_(via === 'qr' ? 'QRCODE_QUALIFICACAO_ABERTO' : 'QUALIF_DOCUMENTO_ABERTO', sessao, 'Equipamento ' + equipamentoId + ', ' + it.titulo + (it.numero ? ' nº ' + it.numero + ' rev ' + it.revisao : '') + ' (' + it.situacao + ').');
    return { success: true, url: url };
  } catch (e) {
    return { success: false, message: typeof SGO_textoFalhaOperador_ === 'function' ? SGO_textoFalhaOperador_('abrir o documento', e) : String(e && e.message ? e.message : e) };
  }
}
