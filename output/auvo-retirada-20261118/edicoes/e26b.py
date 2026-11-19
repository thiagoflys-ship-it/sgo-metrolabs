ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Avisos_Matriz.js'
PARES = [
("      if (Mtz_s_(v.MODULO).toLowerCase() === 'auvo') return; // 18/11/2026: Auvo descontinuado; aviso guardado do Auvo não sai mais",
 "      // 18/11/2026: Auvo descontinuado; aviso guardado do Auvo não sai mais (vai com os vencidos, que ficam PULADO com o motivo)\n      if (Mtz_s_(v.MODULO).toLowerCase() === 'auvo') { velhos.push(v); return; }"),
]
