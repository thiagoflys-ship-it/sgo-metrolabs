/** 18/11/2026, somente leitura: pastas do cliente (ficha do Admin, ficha de um Gestor e Portal da conta de cliente), todos os clientes. */
function Ensaio_qrClientes_() {
  var orig = Docs_indice_, memo = {};
  Docs_indice_ = function (o) { var k = JSON.stringify(o || {}); if (!memo[k]) memo[k] = orig(o); return JSON.parse(JSON.stringify(memo[k])); };
  try {
    var adm = Ensaio_qrSessao_(), ges = { userId: 'x', usuario: 'ensaio', nome: 'ensaio', perfil: 'GESTOR' };
    var C = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES || 'CAD_CLIENTES'), r = { clientes: 0, admItens: 0, admAnteriores: 0, gesItens: 0, gesAnteriores: 0, portalItens: 0, portalAnteriores: 0, ter5: null };
    C.forEach(function (cl) {
      var id = String(cl.ID), a, g, p;
      try { a = Docs_doCliente_(adm, id, 'ficha'); g = Docs_doCliente_(ges, id, 'ficha'); p = Docs_doCliente_({ userId: '', usuario: 'e', nome: 'e', perfil: 'CLIENTE', clienteId: id }, id, 'portal'); } catch (e) { return; }
      r.clientes++;
      [[a, 'adm'], [g, 'ges'], [p, 'portal']].forEach(function (z) { z[0].pastas.forEach(function (pp) { pp.itens.forEach(function (it) { r[z[1] + 'Itens']++; r[z[1] + 'Anteriores'] += (it.anteriores || []).length; }); }); });
    });
    var t = Docs_doEquipamento_(adm, '98489473-50b8-4f12-b1e8-fbf203961eb9', 'ficha');
    r.ter5 = t.pastas.filter(function (x) { return x.itens.length; }).map(function (x) { return x.itens.map(function (i) { return i.titulo + ' [' + (i.anteriores || []).map(function (y) { return y.numero + ':' + y.situacao; }).join(',') + ']'; }); });
    return r;
  } finally { Docs_indice_ = orig; }
}
