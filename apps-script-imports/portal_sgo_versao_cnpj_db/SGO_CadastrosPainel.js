/****************************************************
 * CADASTROS E ADMINISTRAÇÃO 17/10 — painel das telas de cadastro
 *
 * Só leitura. Uma chamada por tela devolve a lista já com os números que a
 * tela mostra no resumo (unidades, equipamentos, documentos, vencimentos) e
 * as pendências de cada registro ("sem unidade", "cadastro incompleto",
 * "documento vencendo"...). O detalhe do painel lateral vem de
 * cadastrosDetalhe (cliente → unidades → equipamentos → documentos).
 *
 * Regras que valem aqui (as mesmas das listas antigas):
 *  - perfil CLIENTE só recebe a própria empresa (clienteId da sessão);
 *  - nada é gravado, nem log (as listas são abertas a todo momento).
 * Vencimento: vencido ou vence hoje = Vencido; até 30 dias = Vencendo
 * (mesma regra da central de pendências).
 ****************************************************/

var CADP_DIAS_VENCENDO = 30;

function CadPainel_txt_(v) { return String(v === null || v === undefined ? '' : v).trim(); }
function CadPainel_up_(v) { return CadPainel_txt_(v).toUpperCase(); }
function CadPainel_ativo_(r) { return !!r && CadPainel_up_(r.STATUS) === 'ATIVO'; }
function CadPainel_vigente_(r) { return !!r && CadPainel_up_(r.STATUS) !== 'INATIVO'; }
function CadPainel_mapa_(lista) { var m = {}; (lista || []).forEach(function (r) { m[CadPainel_txt_(r.ID)] = r; }); return m; }

/** Data de vencimento em dias a partir de hoje (0 = hoje). null quando não há data válida. */
function CadPainel_diasAte_(v) {
  if (v === null || v === undefined || v === '') return null;
  var d = null;
  if (Object.prototype.toString.call(v) === '[object Date]') d = new Date(v.getFullYear(), v.getMonth(), v.getDate());
  else {
    var s = CadPainel_txt_(v), m;
    if ((m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s))) d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    else if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  if (!d || isNaN(d.getTime())) return null;
  var h = new Date(); h = new Date(h.getFullYear(), h.getMonth(), h.getDate());
  return Math.round((d.getTime() - h.getTime()) / 86400000);
}

function CadPainel_dataIso_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return v.getFullYear() + '-' + p(v.getMonth() + 1) + '-' + p(v.getDate());
  }
  var s = CadPainel_txt_(v), m;
  if ((m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s))) return m[3] + '-' + m[2] + '-' + m[1];
  if ((m = /^(\d{4}-\d{2}-\d{2})/.exec(s))) return m[1];
  return '';
}

/** Situação do vencimento de um documento: vencido | vencendo | em_dia | sem_vencimento. */
function CadPainel_situacaoVenc_(doc) {
  var dias = CadPainel_diasAte_(doc.DATA_VENCIMENTO);
  if (dias === null) return { situacao: 'sem_vencimento', dias: null };
  if (dias <= 0) return { situacao: 'vencido', dias: dias };
  if (dias <= CADP_DIAS_VENCENDO) return { situacao: 'vencendo', dias: dias };
  return { situacao: 'em_dia', dias: dias };
}

function CadPainel_nomeCliente_(c) { return c ? (CadPainel_txt_(c.NOME_FANTASIA) || CadPainel_txt_(c.RAZAO_SOCIAL)) : ''; }
function CadPainel_nomeEquip_(e) { return e ? ([CadPainel_txt_(e.TIPO), CadPainel_txt_(e.TAG)].filter(Boolean).join(' - ') || 'Equipamento sem identificação') : ''; }

/** Lê as quatro tabelas uma vez, já recortadas para o perfil Cliente. */
function CadPainel_base_(sessao) {
  var cliente = CadPainel_up_(sessao.perfil) === 'CLIENTE';
  var cid = CadPainel_txt_(sessao.clienteId);
  var C = SGO_DATA.getAll('CAD_CLIENTES'), U = SGO_DATA.getAll('CAD_UNIDADES'), E = SGO_DATA.getAll('CAD_EQUIPAMENTOS');
  var D = [];
  try { D = SGO_DATA.getAll('DOC_DOCUMENTOS'); } catch (e) { D = []; }
  if (cliente) {
    C = C.filter(function (r) { return CadPainel_txt_(r.ID) === cid; });
    U = U.filter(function (r) { return CadPainel_txt_(r.CLIENTE_ID) === cid; });
    E = E.filter(function (r) { return CadPainel_txt_(r.CLIENTE_ID) === cid; });
    D = D.filter(function (r) { return CadPainel_txt_(r.CLIENTE_ID) === cid; });
  }
  return { C: C, U: U, E: E, D: D, mC: CadPainel_mapa_(C), mU: CadPainel_mapa_(U), mE: CadPainel_mapa_(E), cliente: cliente };
}

/** Contagem de documentos vigentes e de vencimentos por chave (cliente, unidade ou equipamento). */
function CadPainel_contarDocs_(D, campo) {
  var out = {};
  D.forEach(function (d) {
    if (!CadPainel_vigente_(d)) return;
    var k = CadPainel_txt_(d[campo]);
    if (!k) return;
    var o = out[k] || (out[k] = { total: 0, vencidos: 0, vencendo: 0, proximo: null });
    o.total++;
    var s = CadPainel_situacaoVenc_(d);
    if (s.situacao === 'vencido') o.vencidos++;
    if (s.situacao === 'vencendo') o.vencendo++;
    if (s.dias !== null && (o.proximo === null || s.dias < o.proximo)) o.proximo = s.dias;
  });
  return out;
}

function CadPainel_limpo_(r) {
  var o = {};
  Object.keys(r || {}).forEach(function (k) {
    if (k === 'SENHA' || k.charAt(0) === '_') return;
    var v = r[k];
    o[k] = Object.prototype.toString.call(v) === '[object Date]' ? v.toISOString() : v;
  });
  return o;
}

function CadPainel_montar_(sessionId, tipo) {
  var sessao = exigirSessao(sessionId);
  var b = CadPainel_base_(sessao);
  // 21/10/2026: gestão = rotina da empresa (gestão, RH e Financeiro), como a tela (CadUI_gestao_).
  var gestao = !b.cliente && (typeof SGO_rotinaSessao_ === 'function' ? SGO_rotinaSessao_(sessionId) : isAdminSession(sessionId));
  var itens = [];
  tipo = CadPainel_txt_(tipo).toLowerCase();

  if (tipo === 'clientes') {
    var docsC = CadPainel_contarDocs_(b.D, 'CLIENTE_ID');
    itens = b.C.map(function (c) {
      var id = CadPainel_txt_(c.ID);
      var uns = b.U.filter(function (u) { return CadPainel_txt_(u.CLIENTE_ID) === id; });
      var eqs = b.E.filter(function (e) { return CadPainel_txt_(e.CLIENTE_ID) === id && CadPainel_ativo_(e); });
      var dc = docsC[id] || { total: 0, vencidos: 0, vencendo: 0 };
      var faltam = [];
      if (!CadPainel_txt_(c.CNPJ)) faltam.push('CNPJ');
      if (!CadPainel_txt_(c.ENDERECO)) faltam.push('endereço');
      if (!CadPainel_txt_(c.EMAIL) && !CadPainel_txt_(c.TELEFONE)) faltam.push('e-mail ou telefone');
      var pend = [];
      var ativo = CadPainel_ativo_(c);
      if (ativo && !uns.some(CadPainel_ativo_)) pend.push('sem_unidade');
      if (ativo && faltam.length) pend.push('incompleto');
      if (ativo && dc.vencidos) pend.push('doc_vencido');
      if (ativo && dc.vencendo) pend.push('doc_vencendo');
      return Object.assign(CadPainel_limpo_(c), {
        QTD_UNIDADES: uns.filter(CadPainel_ativo_).length, QTD_UNIDADES_TOTAL: uns.length,
        QTD_EQUIPAMENTOS: eqs.length, QTD_DOCUMENTOS: dc.total, DOCS_VENCIDOS: dc.vencidos, DOCS_VENCENDO: dc.vencendo,
        FALTAM: faltam, PENDENCIAS: pend
      });
    });
    itens.sort(function (a, x) { return (CadPainel_ativo_(x) - CadPainel_ativo_(a)) || CadPainel_txt_(a.RAZAO_SOCIAL).localeCompare(CadPainel_txt_(x.RAZAO_SOCIAL), 'pt-BR'); });
  } else if (tipo === 'unidades') {
    var docsU = CadPainel_contarDocs_(b.D, 'UNIDADE_ID');
    itens = b.U.map(function (u) {
      var id = CadPainel_txt_(u.ID);
      var cli = b.mC[CadPainel_txt_(u.CLIENTE_ID)] || null;
      var eqs = b.E.filter(function (e) { return CadPainel_txt_(e.UNIDADE_ID) === id && CadPainel_ativo_(e); });
      var du = docsU[id] || { total: 0, vencidos: 0, vencendo: 0 };
      var faltam = [];
      if (!CadPainel_txt_(u.ENDERECO)) faltam.push('endereço');
      if (!CadPainel_txt_(u.CIDADE) || !CadPainel_txt_(u.UF)) faltam.push('cidade/UF');
      var pend = [];
      var ativo = CadPainel_ativo_(u);
      if (ativo && !CadPainel_ativo_(cli)) pend.push('vinculo_pendente');
      if (ativo && faltam.length) pend.push('incompleto');
      if (ativo && du.vencidos) pend.push('doc_vencido');
      if (ativo && du.vencendo) pend.push('doc_vencendo');
      return Object.assign(CadPainel_limpo_(u), {
        CLIENTE_NOME: CadPainel_nomeCliente_(cli), CLIENTE_STATUS: cli ? CadPainel_up_(cli.STATUS) : '',
        QTD_EQUIPAMENTOS: eqs.length, QTD_DOCUMENTOS: du.total, DOCS_VENCIDOS: du.vencidos, DOCS_VENCENDO: du.vencendo,
        FALTAM: faltam, PENDENCIAS: pend
      });
    });
    itens.sort(function (a, x) { return (CadPainel_ativo_(x) - CadPainel_ativo_(a)) || (a.CLIENTE_NOME + a.NOME_UNIDADE).localeCompare(x.CLIENTE_NOME + x.NOME_UNIDADE, 'pt-BR'); });
  } else if (tipo === 'equipamentos') {
    var docsE = CadPainel_contarDocs_(b.D, 'EQUIPAMENTO_ID');
    // 20/10/2026: situação da qualificação (qualificado, vencendo, vencido) — SGO_QualifEquipamento.js.
    var qualifE = {};
    try { if (typeof SGO_QEQ_situacoesPorEquipamento_ === 'function') qualifE = SGO_QEQ_situacoesPorEquipamento_(); } catch (eQ) { qualifE = {}; }
    itens = b.E.map(function (e) {
      var id = CadPainel_txt_(e.ID);
      var cli = b.mC[CadPainel_txt_(e.CLIENTE_ID)] || null, uni = b.mU[CadPainel_txt_(e.UNIDADE_ID)] || null;
      var de = docsE[id] || { total: 0, vencidos: 0, vencendo: 0, proximo: null };
      var faltam = [];
      // 21/10/2026: setor entra (sai nos relatórios e certificados, como TAG e série).
      ['TAG', 'SERIE', 'SETOR', 'FABRICANTE', 'MODELO'].forEach(function (k) { if (!CadPainel_txt_(e[k])) faltam.push({ TAG: 'TAG', FABRICANTE: 'fabricante', MODELO: 'modelo', SERIE: 'número de série', SETOR: 'setor' }[k]); });
      var pend = [];
      var ativo = CadPainel_ativo_(e);
      if (ativo && (!CadPainel_ativo_(cli) || !CadPainel_ativo_(uni) || CadPainel_txt_(uni.CLIENTE_ID) !== CadPainel_txt_(e.CLIENTE_ID))) pend.push('vinculo_pendente');
      if (ativo && faltam.length) pend.push('incompleto');
      if (ativo && de.vencidos) pend.push('doc_vencido');
      if (ativo && de.vencendo) pend.push('doc_vencendo');
      if (ativo && !de.total) pend.push('sem_documento');
      return Object.assign(CadPainel_limpo_(e), {
        CLIENTE_NOME: CadPainel_nomeCliente_(cli), CLIENTE_CNPJ: cli ? CadPainel_txt_(cli.CNPJ) : '', UNIDADE_NOME: uni ? CadPainel_txt_(uni.NOME_UNIDADE) : '',
        QTD_DOCUMENTOS: de.total, DOCS_VENCIDOS: de.vencidos, DOCS_VENCENDO: de.vencendo, PROXIMO_VENCIMENTO_DIAS: de.proximo,
        QUALIF_SITUACAO: qualifE[id] ? qualifE[id].situacao : '', QUALIF_ROTULO: qualifE[id] ? qualifE[id].rotulo : '', QUALIF_VALIDADE: qualifE[id] ? qualifE[id].validadeAte : '',
        FALTAM: faltam, PENDENCIAS: pend
      });
    });
    itens.sort(function (a, x) { return (CadPainel_ativo_(x) - CadPainel_ativo_(a)) || CadPainel_txt_(a.TAG).localeCompare(CadPainel_txt_(x.TAG), 'pt-BR'); });
  } else if (tipo === 'documentos') {
    itens = b.D.map(function (d) {
      var cli = b.mC[CadPainel_txt_(d.CLIENTE_ID)] || null, uni = b.mU[CadPainel_txt_(d.UNIDADE_ID)] || null, eq = b.mE[CadPainel_txt_(d.EQUIPAMENTO_ID)] || null;
      var s = CadPainel_situacaoVenc_(d);
      var pend = [];
      var vigente = CadPainel_vigente_(d);
      if (vigente && (CadPainel_up_(d.STATUS) === 'PENDENTE' || !CadPainel_txt_(d.LINK_ARQUIVO))) pend.push('sem_arquivo');
      if (vigente && s.situacao === 'vencido') pend.push('doc_vencido');
      if (vigente && s.situacao === 'vencendo') pend.push('doc_vencendo');
      return Object.assign(CadPainel_limpo_(d), {
        CLIENTE_NOME: CadPainel_nomeCliente_(cli), CLIENTE_CNPJ: cli ? CadPainel_txt_(cli.CNPJ) : '', UNIDADE_NOME: uni ? CadPainel_txt_(uni.NOME_UNIDADE) : '',
        EQUIPAMENTO_NOME: eq ? CadPainel_nomeEquip_(eq) : '', EQUIPAMENTO_TAG: eq ? CadPainel_txt_(eq.TAG) : '',
        VENCIMENTO_ISO: CadPainel_dataIso_(d.DATA_VENCIMENTO), VENCIMENTO_SITUACAO: s.situacao, VENCIMENTO_DIAS: s.dias, PENDENCIAS: pend
      });
    });
    itens.sort(function (a, x) { return CadPainel_txt_(x.CRIADO_EM).localeCompare(CadPainel_txt_(a.CRIADO_EM)); });
  } else {
    throw new Error('Tela de cadastro desconhecida. Atualize a página (F5) e tente de novo.');
  }
  return { success: true, tipo: tipo, items: itens, total: itens.length, gestao: gestao, perfil: CadPainel_up_(sessao.perfil), diasVencendo: CADP_DIAS_VENCENDO };
}

/** Vínculos de um registro para o painel lateral: cliente → unidades → equipamentos → documentos. */
function CadPainel_detalhe_(sessionId, tipo, id) {
  var sessao = exigirSessao(sessionId);
  var b = CadPainel_base_(sessao);
  id = CadPainel_txt_(id);
  tipo = CadPainel_txt_(tipo).toLowerCase();
  var tab = { clientes: b.mC, unidades: b.mU, equipamentos: b.mE, documentos: CadPainel_mapa_(b.D) }[tipo];
  if (!tab) throw new Error('Tela de cadastro desconhecida. Atualize a página (F5) e tente de novo.');
  var reg = tab[id];
  if (!reg) return { success: false, message: 'Cadastro não encontrado: pode ter sido alterado ou excluído por outra pessoa. Atualize a lista.' };

  var unid = function (u) { return { ID: CadPainel_txt_(u.ID), NOME_UNIDADE: CadPainel_txt_(u.NOME_UNIDADE), CNPJ_UNIDADE: CadPainel_txt_(u.CNPJ_UNIDADE), CIDADE: CadPainel_txt_(u.CIDADE), UF: CadPainel_txt_(u.UF), STATUS: CadPainel_up_(u.STATUS) }; };
  var equip = function (e) { var u = b.mU[CadPainel_txt_(e.UNIDADE_ID)]; return { ID: CadPainel_txt_(e.ID), TAG: CadPainel_txt_(e.TAG), TIPO: CadPainel_txt_(e.TIPO), SERIE: CadPainel_txt_(e.SERIE), UNIDADE_ID: CadPainel_txt_(e.UNIDADE_ID), UNIDADE_NOME: u ? CadPainel_txt_(u.NOME_UNIDADE) : '', STATUS: CadPainel_up_(e.STATUS) }; };
  var doc = function (d) { var s = CadPainel_situacaoVenc_(d), e = b.mE[CadPainel_txt_(d.EQUIPAMENTO_ID)]; return { ID: CadPainel_txt_(d.ID), NOME_ARQUIVO: CadPainel_txt_(d.NOME_ARQUIVO), TIPO_DOCUMENTO: CadPainel_txt_(d.TIPO_DOCUMENTO), VENCIMENTO_ISO: CadPainel_dataIso_(d.DATA_VENCIMENTO), VENCIMENTO_SITUACAO: s.situacao, VENCIMENTO_DIAS: s.dias, LINK_ARQUIVO: CadPainel_txt_(d.LINK_ARQUIVO), STATUS: CadPainel_up_(d.STATUS), EQUIPAMENTO_NOME: e ? CadPainel_nomeEquip_(e) : '', UNIDADE_ID: CadPainel_txt_(d.UNIDADE_ID), EQUIPAMENTO_ID: CadPainel_txt_(d.EQUIPAMENTO_ID) }; };
  var cliRes = function (c) { return c ? { ID: CadPainel_txt_(c.ID), NOME: CadPainel_nomeCliente_(c), RAZAO_SOCIAL: CadPainel_txt_(c.RAZAO_SOCIAL), CNPJ: CadPainel_txt_(c.CNPJ), STATUS: CadPainel_up_(c.STATUS) } : null; };

  var out = { success: true, tipo: tipo, item: CadPainel_limpo_(reg), cliente: null, unidade: null, equipamento: null, unidades: [], equipamentos: [], documentos: [] };
  if (tipo === 'clientes') {
    out.unidades = b.U.filter(function (u) { return CadPainel_txt_(u.CLIENTE_ID) === id; }).map(unid);
    out.equipamentos = b.E.filter(function (e) { return CadPainel_txt_(e.CLIENTE_ID) === id; }).map(equip);
    out.documentos = b.D.filter(function (d) { return CadPainel_txt_(d.CLIENTE_ID) === id; }).map(doc);
  } else if (tipo === 'unidades') {
    out.cliente = cliRes(b.mC[CadPainel_txt_(reg.CLIENTE_ID)]);
    out.equipamentos = b.E.filter(function (e) { return CadPainel_txt_(e.UNIDADE_ID) === id; }).map(equip);
    out.documentos = b.D.filter(function (d) { return CadPainel_txt_(d.UNIDADE_ID) === id; }).map(doc);
  } else if (tipo === 'equipamentos') {
    out.cliente = cliRes(b.mC[CadPainel_txt_(reg.CLIENTE_ID)]);
    var u = b.mU[CadPainel_txt_(reg.UNIDADE_ID)];
    out.unidade = u ? unid(u) : null;
    out.documentos = b.D.filter(function (d) { return CadPainel_txt_(d.EQUIPAMENTO_ID) === id; }).map(doc);
  } else {
    out.cliente = cliRes(b.mC[CadPainel_txt_(reg.CLIENTE_ID)]);
    var u2 = b.mU[CadPainel_txt_(reg.UNIDADE_ID)];
    out.unidade = u2 ? unid(u2) : null;
    var e2 = b.mE[CadPainel_txt_(reg.EQUIPAMENTO_ID)];
    out.equipamento = e2 ? equip(e2) : null;
    var s2 = CadPainel_situacaoVenc_(reg);
    out.item.VENCIMENTO_ISO = CadPainel_dataIso_(reg.DATA_VENCIMENTO);
    out.item.VENCIMENTO_SITUACAO = s2.situacao;
    out.item.VENCIMENTO_DIAS = s2.dias;
  }
  out.documentos.sort(function (a, x) { return (a.VENCIMENTO_DIAS === null) - (x.VENCIMENTO_DIAS === null) || (a.VENCIMENTO_DIAS || 0) - (x.VENCIMENTO_DIAS || 0); });
  return out;
}

function cadastrosPainel(sessionId, tipo) {
  try { return JSON.parse(JSON.stringify(CadPainel_montar_(sessionId, tipo))); }
  catch (e) { return { success: false, message: SGO_textoFalhaOperador_('carregar a lista', e) }; }
}

function cadastrosDetalhe(sessionId, tipo, id) {
  try { return JSON.parse(JSON.stringify(CadPainel_detalhe_(sessionId, tipo, id))); }
  catch (e) { return { success: false, message: SGO_textoFalhaOperador_('carregar o cadastro', e) }; }
}
