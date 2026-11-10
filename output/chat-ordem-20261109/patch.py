import sys
src, dst = sys.argv[1], sys.argv[2]
b = open(src, 'rb').read().decode('utf-8')
crlf = '\r\n' in b
t = b.replace('\r\n', '\n')
reps = [
("""  function lerConversa(id) {
    var c = ST.conv[id]; if (!c) return;
    var lista = ST.msgs[id] || [], ult""",
"""  /** Põe as mensagens da conversa em ordem de envio (data e hora; empate pela linha gravada). As listas recebem
   *  mensagens por vários caminhos (abrir, "Mensagens anteriores", novidades, envio, edição do grupo) e a junção
   *  podia deixar mensagens antigas depois das novas. Ordenação estável: sem data, mantém a posição de chegada. */
  function ordenarMsgs(lista) {
    if (!lista || lista.length < 2) return lista;
    var dec = lista.map(function (m, i) { return { m: m, i: i, t: String(m.criado_em || ""), l: Number(m._linha) || 0 }; });
    dec.sort(function (a, b) {
      if (a.t && b.t && a.t !== b.t) return a.t < b.t ? -1 : 1;
      if (a.l && b.l && a.l !== b.l) return a.l - b.l;
      return a.i - b.i;
    });
    for (var k = 0; k < dec.length; k++) lista[k] = dec[k].m;
    return lista;
  }
  function lerConversa(id) {
    var c = ST.conv[id]; if (!c) return;
    ordenarMsgs(ST.msgs[id]);
    var lista = ST.msgs[id] || [], ult"""),
("""    var id = ST.aberta, c = ST.conv[id] || { titulo: "Conversa" }, eu = ST.d.eu, lista = ST.msgs[id];""",
"""    var id = ST.aberta, c = ST.conv[id] || { titulo: "Conversa" }, eu = ST.d.eu, lista = ordenarMsgs(ST.msgs[id]);"""),
("""      ST.msgs[id] = r.mensagens.concat(ja.filter(function (m) { return !ids[m.msg_id]; }));
      ST.mais[id] = r.mais; ST.antes[id] = r.antes;""",
"""      var ficam = ja.filter(function (m) { return !ids[m.msg_id]; });
      ST.msgs[id] = ordenarMsgs(r.mensagens.concat(ficam));
      // se "Mensagens anteriores" já trouxe mensagens mais velhas, a paginação continua de onde parou
      var antesJa = ST.antes[id], jaTinhaVelhas = ficam.some(function (m) { return Number(m._linha) && Number(m._linha) < Number(r.antes); });
      if (jaTinhaVelhas && Number(antesJa) && Number(antesJa) < Number(r.antes)) { ST.antes[id] = antesJa; }
      else { ST.mais[id] = r.mais; ST.antes[id] = r.antes; }"""),
]
for a, c in reps:
    n = t.count(a)
    assert n == 1, ("ocorrencias", n, a[:60])
    t = t.replace(a, c)
if crlf: t = t.replace('\n', '\r\n')
open(dst, 'wb').write(t.encode('utf-8'))
print("ok", "crlf" if crlf else "lf")
