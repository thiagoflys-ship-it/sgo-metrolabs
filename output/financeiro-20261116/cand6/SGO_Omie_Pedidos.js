/**
 * SGO_Omie_Pedidos.js — Painel financeiro, aba "Pedidos aprovados" (15/11/2026). Achado da Missão 01: o pedido aprovado chegava
 * ao Financeiro como atividade com checklist e tudo era redigitado no Omie. Aqui o Financeiro vê as propostas aprovadas pelo
 * cliente e prepara a conta a receber no Omie a partir delas: o formulário de "Novo lançamento" vem preenchido (cliente do Omie
 * achado pelo CNPJ, documento, valor, referência única SGO-<proposta>, observação com a condição de pagamento) e mostra os
 * títulos que o cliente já tem no Omie, para não lançar em dobro. O envio segue a prévia e a confirmação de sempre (e a chave
 * da gravação). Leitura no Omie: ListarClientes com clientesFiltro.cnpj_cpf (formatado) e ListarContasReceber com
 * filtrar_por_cpf_cnpj (só números) — conferidos no Omie real em 15/11.
 */
function OmiePed_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function OmiePed_cnpjFmt_(d) { d = OmiePed_s_(d).replace(/\D/g, ''); return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : d; }
function OmiePed_rotulo_(p) { return OmiePed_s_(p.NUMERO) + (Number(p.REVISAO) > 0 ? ' rev. ' + OmiePed_s_(p.REVISAO) : ''); }
function OmiePed_dia_(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(OmiePed_s_(v)); if (m) return m[3] + '/' + m[2] + '/' + m[1]; m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(OmiePed_s_(v)); return m ? m[0] : ''; }
function OmiePed_iso_(v) { var m = /^(\d{4}-\d{2}-\d{2})/.exec(OmiePed_s_(v)); if (m) return m[1]; m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(OmiePed_s_(v)); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
function OmiePed_faturamento_(p) {
  try { if (typeof ComP_dadosFaturamento_ === 'function') return ComP_dadosFaturamento_(p) || {}; } catch (e) {}
  var aba = (typeof SGO_CFG !== 'undefined' && SGO_CFG && SGO_CFG.SHEETS && SGO_CFG.SHEETS.CAD_CLIENTES) || 'CAD_CLIENTES';
  var cli = SGO_DATA.getById(aba, OmiePed_s_(p.CLIENTE_ID)) || {};
  var cond = {}; try { cond = JSON.parse(OmiePed_s_(p.CONDICOES_JSON) || '{}') || {}; } catch (e) {}
  return { razao: OmiePed_s_(cli.RAZAO_SOCIAL), cnpj: OmiePed_s_(cli.CNPJ), pagamento: OmiePed_s_(cond.pagamento) };
}
// 15/11/2026: vínculo pedido -> conta a receber criada pelo SGO+ (gravado na confirmação do lançamento com referência SGO-...).
// Títulos lançados direto no Omie, fora do SGO+, não aparecem aqui.
var OMIE_PED_ABA = 'FIN_OMIE_PEDIDOS';
var OMIE_PED_COLUNAS = ['ID', 'PROPOSTA_ID', 'PROPOSTA_NUMERO', 'REFERENCIA', 'TITULO_OMIE', 'DOCUMENTO', 'VALOR', 'VENCIMENTO', 'POR', 'EM'];
function OmiePed_ref_(p) { return ('SGO-' + OmiePed_rotulo_(p).replace(/\s+rev\.\s+/, '-R')).replace(/[^A-Za-z0-9-]/g, '').slice(0, 60); }
function OmiePed_vinculos_() { try { return SGO_DATA.getAll(OMIE_PED_ABA) || []; } catch (e) { return []; } }
/** Chamado por OmieOps_apiConfirmar depois de criar conta a receber no Omie. Falha aqui não desfaz nem marca o envio como incerto. */
function OmiePed_registrar_(param, resposta, eu) {
  var ref = OmiePed_s_(param && param.codigo_lancamento_integracao);
  if (!/^SGO-/.test(ref)) return null;
  // 15/11/2026: referência exata, ou exata + "-<número da parcela>"; propostas excluídas fora.
  var base = ref.replace(/-\d+$/, ''), alvo = null, porBase = null;
  SGO_DATA.getAll('COM_PROPOSTAS').forEach(function (p) {
    if (OmiePed_s_(p.SITUACAO).toUpperCase() !== 'APROVADA' || OmiePed_s_(p.EXCLUIDA_EM)) return;
    var r = OmiePed_ref_(p);
    if (r === ref) alvo = p; else if (r === base && !porBase) porBase = p;
  });
  alvo = alvo || porBase;
  if (!alvo) return null;
  if (typeof CertCal_garantirTabela_ === 'function') {
    CertCal_garantirTabela_(OMIE_PED_ABA, OMIE_PED_COLUNAS);
    if (typeof CertCal_garantirColuna_ === 'function') OMIE_PED_COLUNAS.forEach(function (c) { CertCal_garantirColuna_(OMIE_PED_ABA, c); });
    try { SGO_DATA._headersCache = {}; SGO_DATA._headerMapCache = {}; } catch (e) {}
  } else {
    var db = SGO_DATA.getDB(), sh = db.getSheetByName(OMIE_PED_ABA);
    if (!sh) { sh = db.insertSheet(OMIE_PED_ABA); sh.getRange(1, 1, 1, OMIE_PED_COLUNAS.length).setValues([OMIE_PED_COLUNAS]); }
  }
  var linha = { ID: Utilities.getUuid(), PROPOSTA_ID: OmiePed_s_(alvo.ID), PROPOSTA_NUMERO: OmiePed_rotulo_(alvo), REFERENCIA: ref, TITULO_OMIE: String(Number(resposta && resposta.codigo_lancamento_omie) || ''),
    DOCUMENTO: OmiePed_s_(param.numero_documento), VALOR: Number(param.valor_documento) || 0, VENCIMENTO: OmiePed_s_(param.data_vencimento), POR: OmiePed_s_(eu && (eu.nome || eu.usuario)), EM: new Date().toISOString() };
  SGO_DATA.insert(OMIE_PED_ABA, linha);
  return linha;
}
/** Propostas aprovadas pelo cliente (mais recentes primeiro), com busca por número, cliente, título ou OC. Não consulta o Omie. */
function OmiePed_apiListar(sessionId, payload) {
  try {
    Omie_exigirAcesso_(sessionId);
    var soPendentes = !!(payload || {}).soPendentes, vinc = {};
    OmiePed_vinculos_().forEach(function (v) { var k = OmiePed_s_(v.PROPOSTA_ID); (vinc[k] = vinc[k] || []).push(v); });
    var q = OmiePed_s_((payload || {}).q).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), termos = q ? q.split(/\s+/) : [];
    var l = [];
    SGO_DATA.getAll('COM_PROPOSTAS').forEach(function (p) {
      if (OmiePed_s_(p.SITUACAO).toUpperCase() !== 'APROVADA' || OmiePed_s_(p.EXCLUIDA_EM)) return;
      var texto = [p.NUMERO, p.CLIENTE_NOME, p.TITULO, p.OC_NUMERO, p.RESPONSAVEL_NOME].map(OmiePed_s_).join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (termos.some(function (t) { return texto.indexOf(t) < 0; })) return;
      var vs = vinc[OmiePed_s_(p.ID)] || [];
      if (soPendentes && vs.length) return;
      var f = OmiePed_faturamento_(p);
      l.push({ id: OmiePed_s_(p.ID), numero: OmiePed_rotulo_(p), cliente: OmiePed_s_(f.razao || p.CLIENTE_NOME), cnpj: OmiePed_cnpjFmt_(f.cnpj), titulo: OmiePed_s_(p.TITULO).slice(0, 160),
        total: Math.round((Number(p.TOTAL) || 0) * 100) / 100, aprovadaEm: OmiePed_dia_(p.RESPOSTA_EM || p.ASSINADA_EM), oc: OmiePed_s_(p.OC_NUMERO), vendedor: OmiePed_s_(p.RESPONSAVEL_NOME),
        pagamento: OmiePed_s_(f.pagamento).slice(0, 300),
        lancado: vs.length ? { titulos: vs.length, valor: Math.round(vs.reduce(function (s, v) { return s + (Number(v.VALOR) || 0); }, 0) * 100) / 100, ultimoEm: OmiePed_dia_(vs.map(function (v) { return OmiePed_s_(v.EM); }).sort().pop()), por: OmiePed_s_(vs[vs.length - 1].POR) } : null,
        _ord: OmiePed_iso_(p.RESPOSTA_EM || p.ASSINADA_EM || p.ATUALIZADO_EM) });
    });
    l.sort(function (a, b) { return a._ord < b._ord ? 1 : a._ord > b._ord ? -1 : 0; });
    return { ok: true, total: l.length, pedidos: l.slice(0, 40).map(function (x) { delete x._ord; return x; }) };
  } catch (e) { return { ok: false, mensagem: e.message }; }
}
/** Dados para o formulário "Novo lançamento" a receber, a partir da proposta; cliente do Omie pelo CNPJ e títulos que ele já tem. */
function OmiePed_apiPreparar(sessionId, payload) {
  try {
    Omie_exigirAcesso_(sessionId, 'FIN_OMIE_LANCAR', 'preparar a conta a receber');
    var id = OmiePed_s_((payload || {}).id), p = SGO_DATA.getById('COM_PROPOSTAS', id);
    if (!p || OmiePed_s_(p.SITUACAO).toUpperCase() !== 'APROVADA' || OmiePed_s_(p.EXCLUIDA_EM)) throw new Error('A proposta não está aprovada pelo cliente (ou foi excluída). Atualize a lista.');
    var f = OmiePed_faturamento_(p), cnpj = OmiePed_s_(f.cnpj).replace(/\D/g, '');
    if (cnpj.length !== 14 && cnpj.length !== 11) throw new Error('O cliente da proposta ' + OmiePed_rotulo_(p) + ' está sem CNPJ válido no SGO+. Corrija o cadastro do cliente (Cadastros > Clientes) e prepare de novo.');
    var c = Omie_requisitar_('geral/clientes/', 'ListarClientes', { pagina: 1, registros_por_pagina: 5, apenas_importado_api: 'N', clientesFiltro: { cnpj_cpf: OmiePed_cnpjFmt_(cnpj) } });
    var achados = (c.clientes_cadastro || []).filter(function (x) { return OmiePed_s_(x.cnpj_cpf).replace(/\D/g, '') === cnpj && OmiePed_s_(x.inativo) !== 'S'; });
    if (!achados.length) throw new Error('O CNPJ ' + OmiePed_cnpjFmt_(cnpj) + ' (' + OmiePed_s_(f.razao || p.CLIENTE_NOME) + ') não tem cadastro ativo no Omie. Cadastre o cliente no Omie e prepare de novo.');
    if (achados.length > 1) throw new Error('O CNPJ ' + OmiePed_cnpjFmt_(cnpj) + ' tem ' + achados.length + ' cadastros ativos no Omie. Deixe um só no Omie e prepare de novo.');
    var cli = achados[0], existentes = [], totalExistentes = 0;
    try {
      var t = Omie_requisitar_('financas/contareceber/', 'ListarContasReceber', { pagina: 1, registros_por_pagina: 10, apenas_importado_api: 'N', filtrar_por_cpf_cnpj: cnpj, ordenar_por: 'CODIGO', ordem_descrescente: 'S' });
      totalExistentes = Number(t.total_de_registros) || 0;
      existentes = (t.conta_receber_cadastro || []).map(function (x) { return { documento: OmiePed_s_(x.numero_documento || x.numero_documento_fiscal), vencimento: OmiePed_s_(x.data_vencimento), valor: Number(x.valor_documento) || 0, situacao: OmiePed_s_(x.status_titulo), integracao: OmiePed_s_(x.codigo_lancamento_integracao) }; });
    } catch (e) { existentes = null; }
    var rot = OmiePed_rotulo_(p), ref = OmiePed_ref_(p);
    var jaComRef = (existentes || []).filter(function (x) { return x.integracao === ref || (x.integracao.indexOf(ref + '-') === 0 && /^\d+$/.test(x.integracao.slice(ref.length + 1))); }).length > 0;
    var obs = ['Proposta ' + rot + ' aprovada' + (OmiePed_dia_(p.RESPOSTA_EM || p.ASSINADA_EM) ? ' em ' + OmiePed_dia_(p.RESPOSTA_EM || p.ASSINADA_EM) : '') + ' (SGO+).',
      OmiePed_s_(p.OC_NUMERO) ? 'OC ' + OmiePed_s_(p.OC_NUMERO) + (OmiePed_dia_(p.OC_DATA) ? ' de ' + OmiePed_dia_(p.OC_DATA) : '') + '.' : '',
      OmiePed_s_(f.pagamento) ? 'Pagamento: ' + OmiePed_s_(f.pagamento) : ''].filter(Boolean).join(' ').slice(0, 1000);
    // 16/11/2026: categoria sugerida pelo de-para das Regras do Financeiro (só quando há regra; a pessoa confere na prévia)
    var sugCat = typeof OmieRegras_sugerir_ === 'function' ? OmieRegras_sugerir_('RECEBER_PROPOSTA', cnpj) : null;
    var previoCat = sugCat ? { categoria: sugCat.categoria, categoriaNome: sugCat.descricao || sugCat.categoria, categoriaOrigem: sugCat.origem } : {};
    return { ok: true, proposta: { id: id, numero: rot, cliente: OmiePed_s_(f.razao || p.CLIENTE_NOME), total: Math.round((Number(p.TOTAL) || 0) * 100) / 100, pagamento: OmiePed_s_(f.pagamento) },
      previo: Object.assign({ referencia: ref, documento: rot.replace(/\s+rev\.\s+/, '-R').slice(0, 20), pessoaId: String(cli.codigo_cliente_omie), pessoaNome: OmiePed_s_(cli.razao_social || cli.nome_fantasia).slice(0, 160),
        valor: Math.round((Number(p.TOTAL) || 0) * 100) / 100, observacao: obs }, previoCat),
      existentes: existentes, totalExistentes: totalExistentes, jaComReferencia: jaComRef };
  } catch (e) { return { ok: false, mensagem: e.message }; }
}
