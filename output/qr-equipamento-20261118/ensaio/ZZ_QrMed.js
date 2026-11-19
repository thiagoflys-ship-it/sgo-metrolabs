/** 18/11/2026, somente leitura: medição antes/depois do prontuário de TODOS os equipamentos (QR da equipe e do cliente). */
function Ensaio_qrMedir_() {
  var orig = Docs_indice_, memo = {};
  Docs_indice_ = function (o) { var k = JSON.stringify(o || {}); if (!memo[k]) memo[k] = orig(o); return JSON.parse(JSON.stringify(memo[k])); };
  try {
    var adm = Ensaio_qrSessao_();
    var E = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS);
    var r = { equipamentos: E.length, comDocs: 0, itensQr: 0, anterioresQr: 0, daUnidadeQr: 0, errados: 0, repetidosVisiveis: 0, itensCli: 0, anterioresCli: 0, erradosCli: 0,
      maxItens: 0, pgtPopEmEquip: 0, exemplosErrado: [], exemplosRepetido: [], porEquip: {} };
    E.forEach(function (e) {
      var id = String(e.ID);
      var q; try { q = Docs_doEquipamento_(adm, id, 'qr'); } catch (x) { return; }
      var n = 0, rep = {};
      (q.pastas || []).forEach(function (p) { p.itens.forEach(function (it) {
        n++; if (it.daUnidade) r.daUnidadeQr++; if (p.id === 'PGT_POP' || p.id === 'REGISTROS') r.pgtPopEmEquip++;
        (it.anteriores || []).forEach(function (a) { r.anterioresQr++; if (a.equipamentoId !== id) { r.errados++; if (r.exemplosErrado.length < 5) r.exemplosErrado.push(id + ' <- ' + a.titulo); } });
        if (it.equipamentoId !== id) { r.errados++; if (r.exemplosErrado.length < 5) r.exemplosErrado.push(id + ' <- ' + it.titulo); }
        var k = p.id + '|' + String(it.tipo) + '|' + String(it.emitidoIso);
        if (rep[k]) { r.repetidosVisiveis++; if (r.exemplosRepetido.length < 8) r.exemplosRepetido.push(String(e.TAG) + ': ' + rep[k] + ' / ' + it.titulo); } else rep[k] = it.titulo;
      }); });
      r.itensQr += n; if (n) r.comDocs++; if (n > r.maxItens) r.maxItens = n;
      r.porEquip[id] = n;
      // visão da conta de cliente dona do equipamento (QR pelo celular do cliente)
      var sc = { userId: '', usuario: 'ensaio', nome: 'ensaio', perfil: 'CLIENTE', clienteId: String(e.CLIENTE_ID) };
      try {
        var c = Docs_doEquipamento_(sc, id, 'qr');
        (c.pastas || []).forEach(function (p) { p.itens.forEach(function (it) {
          r.itensCli++; if (it.equipamentoId !== id) r.erradosCli++;
          (it.anteriores || []).forEach(function (a) { r.anterioresCli++; if (a.equipamentoId !== id) r.erradosCli++; });
        }); });
      } catch (x2) {}
    });
    // mistura entre equipamentos na ficha do cliente (versão anterior de outro equipamento dentro de um documento)
    var C = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES || 'CAD_CLIENTES'), mist = 0, mistEx = [];
    C.forEach(function (cl) {
      var f; try { f = Docs_doCliente_(adm, String(cl.ID), 'ficha'); } catch (x) { return; }
      f.pastas.forEach(function (p) { p.itens.forEach(function (it) { (it.anteriores || []).forEach(function (a) {
        if (String(a.equipamentoId || '') !== String(it.equipamentoId || '') || String(a.unidadeId || '') !== String(it.unidadeId || '')) { mist++; if (mistEx.length < 6) mistEx.push(it.titulo + ' [' + it.equipamentoNome + '] <- ' + a.titulo + ' [' + a.equipamentoNome + ']'); }
      }); }); });
    });
    r.misturaNaFicha = mist; r.misturaEx = mistEx;
    return r;
  } finally { Docs_indice_ = orig; }
}
