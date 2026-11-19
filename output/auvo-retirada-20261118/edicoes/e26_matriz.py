ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Avisos_Matriz.js'
PARES = [
(""" *  - Cliente e contato externo: WhatsApp só depois do piloto, e só se o
 *    evento for ligado aqui (S56 começa em "NAO").""",
 """ *  - Cliente e contato externo: WhatsApp só depois do piloto, e só se o
 *    evento for ligado aqui.
 *  - 18/11/2026: o Auvo foi descontinuado pelo dono. Os eventos S54, S55 e S56
 *    (chamados do Auvo) saíram da matriz; ficam em MTZ_RETIRADOS e aparecem na
 *    trilha de mudanças com a data e o motivo."""),
("var MTZ_MODULOS_SILENCIAVEIS = { comercial: 'Comercial', frota: 'Frota (reservas e registros em seu nome)', auvo: 'Integração Auvo' };",
 "var MTZ_MODULOS_SILENCIAVEIS = { comercial: 'Comercial', frota: 'Frota (reservas e registros em seu nome)' };"),
("var MTZ_TIPOS_TECNICOS = ['frota_rastreador_conexao', 'auvo_importacao'];",
 "var MTZ_TIPOS_TECNICOS = ['frota_rastreador_conexao'];"),
('__RE__', r"  // Integração Auvo\n  \{ cod: 'S54', modulo: 'auvo',[^\n]*\n  \{ cod: 'S55', modulo: 'auvo',[^\n]*\n  \{ cod: 'S56', modulo: 'auvo',[^\n]*\n",
 r"  // S54, S55 e S56 (chamados do Auvo): retirados em 18/11/2026, ver MTZ_RETIRADOS.\n", 1),
(", conduta: 'Programa de conduta', auvo: 'Integração Auvo', bate_papo: 'Bate-papo'",
 ", conduta: 'Programa de conduta', bate_papo: 'Bate-papo'"),
("""// Avisos do Comercial (COM_AVISOS.TIPO) que saem por e-mail na hora; os demais vão no resumo do dia (S32).""",
 """// 18/11/2026 (decisão do dono): eventos retirados da matriz porque o sistema de origem saiu do SGO+. Ficam aqui como registro
// e aparecem na trilha de mudanças (Mtz_trilha_). Não voltam a valer: não estão em MTZ_PADRAO.
var MTZ_RETIRADOS = [
  { cod: 'S54', evento: 'Chamado técnico aberto (Auvo)', antes: { email: 'RESUMO', whatsapp: 'NAO' } },
  { cod: 'S55', evento: 'Chamado técnico concluído (Auvo)', antes: { email: 'NAO', whatsapp: 'NAO', decisao: 'HISTORICO' } },
  { cod: 'S56', evento: 'Chamado aberto ou concluído, ao cliente (Auvo)', antes: { email: 'HORA', whatsapp: 'NAO' } }
].map(function (r) {
  return Object.assign({ retiradoEm: '2026-11-18T00:00:00', por: 'Sistema (retirada do Auvo)',
    motivo: 'O Auvo foi descontinuado pelo dono em 18/11/2026 e saiu do SGO+: o evento deixou de existir.' }, r);
});

// Avisos do Comercial (COM_AVISOS.TIPO) que saem por e-mail na hora; os demais vão no resumo do dia (S32)."""),
("""    Mtz_ler_(MTZ_ABAS.FILA).forEach(function (v) {
      if (Mtz_up_(v.SITUACAO) !== 'PENDENTE') return;""",
 """    Mtz_ler_(MTZ_ABAS.FILA).forEach(function (v) {
      if (Mtz_up_(v.SITUACAO) !== 'PENDENTE') return;
      if (Mtz_s_(v.MODULO).toLowerCase() === 'auvo') return; // 18/11/2026: Auvo descontinuado; aviso guardado do Auvo não sai mais"""),
("""    var fila = Mtz_ler_(MTZ_ABAS.FILA).filter(function (v) { return Mtz_up_(v.SITUACAO) === 'PENDENTE' && Mtz_s_(v.USUARIO_ID) === uid; });""",
 """    var fila = Mtz_ler_(MTZ_ABAS.FILA).filter(function (v) { return Mtz_up_(v.SITUACAO) === 'PENDENTE' && Mtz_s_(v.USUARIO_ID) === uid && Mtz_s_(v.MODULO).toLowerCase() !== 'auvo'; });"""),
("""function Mtz_trilha_(limite) {
  return Mtz_ler_(MTZ_ABAS.REGRAS).map(function (l) {
    return { codigo: Mtz_s_(l.CODIGO), em: Mtz_iso_(l.ALTERADO_EM), emBr: Mtz_br_(Mtz_iso_(l.ALTERADO_EM)), por: Mtz_s_(l.ALTERADO_POR_NOME), motivo: Mtz_s_(l.MOTIVO), antes: Mtz_json_(l.ANTES_JSON, {}), depois: Mtz_json_(l.DEPOIS_JSON, {}) };
  }).sort(""",
 """function Mtz_trilha_(limite) {
  // 18/11/2026: os eventos retirados (MTZ_RETIRADOS) entram na trilha como registro da retirada.
  var retirados = MTZ_RETIRADOS.map(function (r) {
    return { codigo: r.cod, em: r.retiradoEm, emBr: Mtz_br_(r.retiradoEm), por: r.por, motivo: r.motivo + ' (' + r.evento + ')', antes: r.antes, depois: { situacao: 'retirado da matriz' } };
  });
  return Mtz_ler_(MTZ_ABAS.REGRAS).map(function (l) {
    return { codigo: Mtz_s_(l.CODIGO), em: Mtz_iso_(l.ALTERADO_EM), emBr: Mtz_br_(Mtz_iso_(l.ALTERADO_EM)), por: Mtz_s_(l.ALTERADO_POR_NOME), motivo: Mtz_s_(l.MOTIVO), antes: Mtz_json_(l.ANTES_JSON, {}), depois: Mtz_json_(l.DEPOIS_JSON, {}) };
  }).concat(retirados).sort("""),
("  // 4. avisos do dia guardados pelos módulos (Frota, Comercial, Programa de conduta, Auvo, CNH...)",
 "  // 4. avisos do dia guardados pelos módulos (Frota, Comercial, Programa de conduta, CNH...)"),
]
