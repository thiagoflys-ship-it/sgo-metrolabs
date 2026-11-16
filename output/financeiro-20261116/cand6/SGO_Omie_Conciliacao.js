/** Conferência bancária local. NÃO altera a conciliação no Omie.
 * Referência: https://api.omie.com.br/docs/apis/financas/extrato
 * CSV: Data;Valor;Descricao;Identificador (opcional);Tipo (opcional: D/C).
 */
var OMIE_CONC_ABA = 'OMIE_CONCILIACOES';
function OmieConc_empresa_() { return OmieConc_hash_(Omie_credenciais_().key); }
function OmieConc_escopo_(p) { return p.empresa + ':' + p.contaId; }
function OmieConc_hash_(v) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(v), Utilities.Charset.UTF_8).map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}
function OmieConc_data_(v) {
  var s = String(v || '').trim(), m, iso;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s))) iso = m[1] + '-' + m[2] + '-' + m[3];
  else if ((m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s))) iso = m[3] + '-' + m[2] + '-' + m[1];
  else throw new Error('Data inválida: use DD/MM/AAAA ou AAAA-MM-DD.');
  var d = new Date(iso + 'T12:00:00Z');
  if (!isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== iso) throw new Error('Data inexistente.');
  return iso;
}
function OmieConc_valor_(v) {
  var s = String(v === undefined ? '' : v).trim().replace(/^R\$\s*/, ''), n;
  if (/^-?\d{1,3}(\.\d{3})*,\d{1,2}$/.test(s) || /^-?\d+,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) throw new Error('Valor inválido: informe até duas casas decimais e sinal negativo para saída.');
  n = Math.round(Number(s) * 100);
  if (!Number.isSafeInteger(n) || Math.abs(n) > 100000000000) throw new Error('Valor fora do limite.');
  return n;
}
function OmieConc_csv_(texto) {
  var first = texto.split(/\r?\n/)[0], sep = first.indexOf(';') >= 0 ? ';' : ',', rows = [], row = [], field = '', quoted = false;
  for (var i = 0; i < texto.length; i++) {
    var c = texto[i];
    if (c === '"') { if (quoted && texto[i + 1] === '"') { field += '"'; i++; } else if (quoted || !field) quoted = !quoted; else throw new Error('Aspas CSV inválidas.'); }
    else if (!quoted && (c === sep || c === '\n')) { row.push(field.replace(/\r$/, '')); field = ''; if (c === '\n') { rows.push(row); row = []; } }
    else field += c;
  }
  if (quoted) throw new Error('CSV com aspas sem fechamento.');
  row.push(field.replace(/\r$/, '')); if (row.some(function(x) { return x.trim(); })) rows.push(row);
  var head = (rows.shift() || []).map(function(x) { return x.replace(/^\uFEFF/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase(); });
  var ix = { data: head.indexOf('data'), valor: head.indexOf('valor'), descricao: head.indexOf('descricao'), id: head.indexOf('identificador'), tipo: head.indexOf('tipo') };
  if (ix.data < 0 || ix.valor < 0 || ix.descricao < 0) throw new Error('CSV precisa dos cabeçalhos Data, Valor e Descricao. Identificador e Tipo são opcionais.');
  return rows.filter(function(r) { return r.some(function(x) { return x.trim(); }); }).map(function(r) {
    if (r.length !== head.length) throw new Error('Quantidade de colunas CSV inválida.');
    var cents = OmieConc_valor_(r[ix.valor]), tipo = ix.tipo >= 0 ? String(r[ix.tipo]).trim().toUpperCase() : '';
    if (tipo && !/^(D|C|DEBITO|CREDITO|DÉBITO|CRÉDITO)$/.test(tipo)) throw new Error('Tipo CSV inválido: use D ou C.');
    if (/^(D|DEBITO|DÉBITO)$/.test(tipo)) cents = -Math.abs(cents);
    if (/^(C|CREDITO|CRÉDITO)$/.test(tipo)) { if (cents < 0) throw new Error('Crédito CSV com valor negativo.'); cents = Math.abs(cents); }
    return { data: OmieConc_data_(r[ix.data]), centavos: cents, descricao: r[ix.descricao].slice(0, 300), identificador: ix.id >= 0 ? r[ix.id].slice(0, 150) : '' };
  });
}
function OmieConc_parse_(formato, texto) {
  if (typeof texto !== 'string' || !texto.trim() || texto.length > 500000 || Utilities.newBlob(texto).getBytes().length > 500000) throw new Error('Envie um arquivo de até 500 KB.');
  var itens;
  if (formato === 'CSV') itens = OmieConc_csv_(texto);
  else if (formato === 'OFX') {
    if (/<!DOCTYPE|<!ENTITY/i.test(texto)) throw new Error('OFX com declaração externa não permitido.');
    var blocos = texto.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];
    if (!/<OFX[>\s]/i.test(texto) || !blocos.length) throw new Error('OFX sem movimentos válidos.');
    if ((texto.match(/<STMTTRN>/gi) || []).length !== blocos.length) throw new Error('OFX incompleto: movimento sem fechamento.');
    if ((texto.match(/<ACCTID>/gi) || []).length > 1 || (texto.match(/<BANKTRANLIST>/gi) || []).length > 1) throw new Error('Importe uma única conta e extrato por arquivo OFX.');
    function tag(b, t) { var m = new RegExp('<' + t + '>\\s*([^<\\r\\n]*)', 'i').exec(b); return m ? m[1].trim() : ''; }
    itens = blocos.map(function(b) {
      var dt = tag(b, 'DTPOSTED'), m = /^(\d{4})(\d{2})(\d{2})(?:\d{6}(?:\.\d+)?(?:\[[^\]]+\])?)?$/.exec(dt);
      if (!m) throw new Error('Data OFX inválida.');
      return { data: OmieConc_data_(m[1] + '-' + m[2] + '-' + m[3]), centavos: OmieConc_valor_(tag(b, 'TRNAMT')), descricao: (tag(b, 'NAME') + ' ' + tag(b, 'MEMO')).trim().slice(0, 300), identificador: tag(b, 'FITID').slice(0, 150) };
    });
  } else throw new Error('Selecione OFX ou CSV.');
  if (!itens.length || itens.length > 100) throw new Error('Importe entre 1 e 100 movimentos por conferência.');
  return itens;
}
function OmieConc_param_(p) {
  p = p || {}; var id = String(p.contaId || '');
  if (!/^\d{1,16}$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) throw new Error('Escolha a conta corrente.');
  var inicio = OmieConc_data_(p.inicio), fim = OmieConc_data_(p.fim);
  if (fim < inicio || (Date.parse(fim) - Date.parse(inicio)) / 86400000 > 93) throw new Error('Escolha um período de até 94 dias.');
  return { contaId: id, empresa: OmieConc_empresa_(), inicio: inicio, fim: fim };
}
function OmieConc_extrato_(p) {
  function br(s) { return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4); }
  var r = Omie_requisitar_('financas/extrato', 'ListarExtrato', { nCodCC: Number(p.contaId), dPeriodoInicial: br(p.inicio), dPeriodoFinal: br(p.fim) });
  if (!Array.isArray(r.listaMovimentos) || r.listaMovimentos.length > 5000) throw new Error('Extrato indisponível ou muito grande. Reduza o período.');
  return r.listaMovimentos.map(function(m) {
    var nat = String(m.cNatureza || '').toUpperCase(), cents = Math.round(Number(m.nValorDocumento) * 100);
    // Natureza desconhecida nunca gera correspondência automática.
    var sinal = /^(P|D)$/.test(nat) ? -1 : /^(R|C)$/.test(nat) ? 1 : 0;
    return { id: String(m.nCodLancamento || ''), origem: String(m.cOrigem || ''), data: OmieConc_data_(m.dDataLancamento), centavos: sinal && isFinite(cents) ? sinal * Math.abs(cents) : null, descricao: String(m.cDesCliente || m.cObservacoes || '').slice(0, 200), conciliadoOmie: !!m.dDataConciliacao };
  });
}
function OmieConc_tabela_() {
  var db = SGO_DATA.getDB(), sh = db.getSheetByName(OMIE_CONC_ABA);
  if (!sh) { sh = db.insertSheet(OMIE_CONC_ABA); sh.appendRow(['ID', 'CRIADO_EM', 'CONTA_ID', 'CHAVE_BANCO', 'CHAVE_OMIE', 'DADOS_JSON']); sh.setFrozenRows(1); }
  if (sh.getRange(1, 1, 1, 6).getValues()[0].join('|') !== 'ID|CRIADO_EM|CONTA_ID|CHAVE_BANCO|CHAVE_OMIE|DADOS_JSON') throw new Error('Cabeçalho do histórico financeiro incompatível.');
  if (sh.getLastRow() > 20001) throw new Error('Histórico atingiu 20 mil registros. Solicite arquivamento ao administrador.');
  return sh;
}
function OmieConc_historico_(sh, conta) {
  if (sh.getLastRow() < 2) return [];
  if (sh.getLastRow() > 20001) throw new Error('Histórico atingiu o limite. Solicite arquivamento ao administrador.');
  return sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues().filter(function(r) { return String(r[2]) === String(conta); });
}
function OmieConc_chaveBanco_(conta, i) { return OmieConc_hash_(conta + '|' + (i.identificador ? 'id|' + i.identificador : [i.data, i.centavos, i.descricao.trim().toLowerCase()].join('|'))); }
function OmieConc_chaveOmie_(i) { return 'OMIE|' + i.origem + ':' + i.id; }
function OmieConc_parear_(banco, omie, historico, conta) {
  var quant = {}, usos = {};
  banco.forEach(function(b) { var k = OmieConc_chaveBanco_(conta, b); quant[k] = (quant[k] || 0) + 1; });
  var resultado = banco.map(function(b, ix) {
    var chave = OmieConc_chaveBanco_(conta, b), cand = omie.filter(function(o) { return o.id && o.centavos !== null && o.centavos === b.centavos && o.data === b.data; });
    var status = quant[chave] > 1 ? 'Duplicado no arquivo' : historico.some(function(h) { return h[3] === chave; }) ? 'Já conferido localmente' : cand.length === 0 ? 'Sem correspondência' : cand.length > 1 ? 'Ambíguo: vários lançamentos Omie' : cand[0].conciliadoOmie ? 'Já conciliado no Omie' : historico.some(function(h) { return h[4] === OmieConc_chaveOmie_(cand[0]); }) ? 'Lançamento Omie já conferido' : 'Correspondência sugerida';
    if (cand.length === 1) { var k = OmieConc_chaveOmie_(cand[0]); usos[k] = (usos[k] || 0) + 1; }
    return { indice: ix, banco: b, chaveBanco: chave, omie: cand.length === 1 ? cand[0] : null, candidatos: cand.length, status: status, elegivel: status === 'Correspondência sugerida' };
  });
  resultado.forEach(function(r) { if (r.elegivel && usos[OmieConc_chaveOmie_(r.omie)] > 1) { r.elegivel = false; r.status = 'Ambíguo: movimento Omie disputado'; } });
  return resultado;
}
function Omie_apiConciliacaoContas(sessionId, pagina) {
  try {
    Omie_exigirAcesso_(sessionId); pagina = Number(pagina || 1);
    if (!Number.isInteger(pagina) || pagina < 1 || pagina > 100) throw new Error('Página inválida.');
    var r = Omie_requisitar_('geral/contacorrente', 'ListarContasCorrentes', { pagina: pagina, registros_por_pagina: 100, apenas_importado_api: 'N' });
    if (!Array.isArray(r.ListarContasCorrentes)) throw new Error('Resposta de contas correntes inválida.');
    return { ok: true, paginas: Number(r.total_de_paginas) || 1, contas: r.ListarContasCorrentes.map(function(c) { return { id: String(c.nCodCC), descricao: String(c.descricao || c.nCodCC) }; }) };
  } catch(e) { return { ok: false, mensagem: e.message }; }
}
function Omie_apiConciliarPrevia(sessionId, payload) {
  try {
    Omie_exigirAcesso_(sessionId, 'FIN_OMIE_CONCILIAR', 'conferir o extrato'); var p = OmieConc_param_(payload), banco = OmieConc_parse_(String(payload.formato), payload.texto);
    if (banco.some(function(b) { return b.data < p.inicio || b.data > p.fim; })) throw new Error('O arquivo contém movimentos fora do período selecionado.');
    var omie = OmieConc_extrato_(p), lock = LockService.getScriptLock(); lock.waitLock(15000);
    var linhas;
    try { linhas = OmieConc_parear_(banco, omie, OmieConc_historico_(OmieConc_tabela_(), OmieConc_escopo_(p)), OmieConc_escopo_(p)); } finally { lock.releaseLock(); }
    var token = Utilities.getUuid(), registro = { sessao: OmieConc_hash_(sessionId), parametro: p, linhas: linhas, criado: Date.now() }, serialized = JSON.stringify(registro);
    if (serialized.length > 85000 || Utilities.newBlob(serialized).getBytes().length > 85000) throw new Error('Prévia muito grande. Divida o arquivo.');
    CacheService.getScriptCache().put('OMIE_CONC_' + token, serialized, 900);
    return { ok: true, token: token, linhas: linhas, aviso: 'Conferência registrada somente neste portal. A situação de conciliação no Omie não será alterada.' };
  } catch(e) { return { ok: false, mensagem: e.message }; }
}
function Omie_apiConciliarConfirmar(sessionId, payload) {
  var lock, bloqueado = false;
  try {
    var usuario = Omie_exigirAcesso_(sessionId, 'FIN_OMIE_CONCILIAR', 'registrar a conferência'), p = payload || {};
    if (!/^[a-f0-9-]{36}$/i.test(String(p.token || ''))) throw new Error('Prévia inválida.');
    var raw = CacheService.getScriptCache().get('OMIE_CONC_' + p.token), previa = raw && JSON.parse(raw);
    if (!previa || previa.sessao !== OmieConc_hash_(sessionId) || Date.now() - previa.criado > 900000) throw new Error('Prévia expirada. Gere novamente.');
    if (previa.parametro.empresa !== OmieConc_empresa_()) throw new Error('A integração Omie mudou. Gere uma nova prévia.');
    if (!Array.isArray(p.linhas) || !p.linhas.length || p.linhas.length > 100) throw new Error('Selecione as correspondências que revisou.');
    var indices = {};
    p.linhas.forEach(function(i) { if (!Number.isInteger(i) || indices[i] || !previa.linhas[i] || !previa.linhas[i].elegivel) throw new Error('Seleção inválida.'); indices[i] = true; });
    var atual = OmieConc_extrato_(previa.parametro);
    lock = LockService.getScriptLock(); lock.waitLock(15000); bloqueado = true;
    var sh = OmieConc_tabela_(), escopo = OmieConc_escopo_(previa.parametro), hist = OmieConc_historico_(sh, escopo), rows = [], repetidos = 0;
    p.linhas.forEach(function(i) {
      var l = previa.linhas[i], chaveOmie = OmieConc_chaveOmie_(l.omie), existente = hist.filter(function(h) { return h[3] === l.chaveBanco || h[4] === chaveOmie; });
      if (existente.length) {
        if (existente.some(function(h) { return h[3] !== l.chaveBanco || h[4] !== chaveOmie; })) throw new Error('Movimento já usado em outra conferência. Atualize a prévia.');
        repetidos++; return;
      }
      var candidatos = atual.filter(function(o) { return o.data === l.banco.data && o.centavos === l.banco.centavos; });
      if (candidatos.length !== 1 || OmieConc_chaveOmie_(candidatos[0]) !== chaveOmie || candidatos[0].conciliadoOmie) throw new Error('O extrato mudou. Gere uma nova prévia.');
      rows.push([Utilities.getUuid(), new Date().toISOString(), escopo, l.chaveBanco, chaveOmie, JSON.stringify({ banco: l.banco, omie: l.omie, usuario: String(usuario.usuario || usuario.email || usuario.nome || ''), tipo: 'CONFERENCIA_LOCAL' })]);
    });
    if (sh.getLastRow() + rows.length > 20001) throw new Error('Histórico cheio. Solicite arquivamento.');
    if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, 6).setValues(rows);
    return { ok: true, registrados: rows.length, repetidos: repetidos, mensagem: 'Conferência local registrada. A conciliação no Omie permanece sob controle do Omie.' };
  } catch(e) { return { ok: false, mensagem: e.message }; } finally { if (bloqueado) lock.releaseLock(); }
}
function Omie_apiConciliacaoHistorico(sessionId, payload) {
  try {
    Omie_exigirAcesso_(sessionId); var id = String((payload || {}).contaId || '');
    if (!/^\d{1,16}$/.test(id)) throw new Error('Conta inválida.');
    var sh = SGO_DATA.getDB().getSheetByName(OMIE_CONC_ABA), h = sh ? OmieConc_historico_(sh, OmieConc_empresa_() + ':' + id) : [];
    return { ok: true, total: h.length, itens: h.slice(-100).reverse().map(function(r) { var d = JSON.parse(r[5]); return { em: String(r[1]), banco: d.banco, omie: d.omie, usuario: d.usuario, tipo: d.tipo }; }) };
  } catch(e) { return { ok: false, mensagem: e.message }; }
}
