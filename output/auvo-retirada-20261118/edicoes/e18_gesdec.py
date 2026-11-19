ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Gestao_Decisoes.js'
PARES = [
(" *     Frota = Administrativo, Auvo e NR-13 = Técnica/Campo...).",
 " *     Frota = Administrativo, NR-13 = Técnica/Campo...)."),
("var GES_SITUACOES = { ABERTA: 'Aberta', RESOLVIDA: 'Resolvida', PERDIDA: 'Venceu sem decisão', SANEADA: 'Saneada (fora da avaliação)' }; // SANEADA: 11/11/2026, SGO_Gestao_Painel.js",
 "// SANEADA: 11/11/2026, SGO_Gestao_Painel.js. RETIRADA: 18/11/2026, item do Auvo que saiu da Caixa porque o Auvo foi descontinuado\n// pelo dono (não é decisão tomada nem perdida; fica fora da avaliação e dos números de resolvidos).\nvar GES_SITUACOES = { ABERTA: 'Aberta', RESOLVIDA: 'Resolvida', PERDIDA: 'Venceu sem decisão', SANEADA: 'Saneada (fora da avaliação)', RETIRADA: 'Retirada (Auvo descontinuado)' };"),
("conduta: 'RH', qualidade: 'QUALIDADE', auvo: 'TECNICA', atividades: 'ADMINISTRATIVO'",
 "conduta: 'RH', qualidade: 'QUALIDADE', atividades: 'ADMINISTRATIVO'"),
("['qualidade', 'Qualidade'], ['auvo', 'Integração Auvo'], ['atividades', 'Atividades']",
 "['qualidade', 'Qualidade'], ['atividades', 'Atividades']"),
("""  qualidade_os: { prazo: 3 }, qualidade_mov: { prazo: 3 },
  auvo_os_aberta: { prazo: 3 }, auvo_sem_vinculo: { prazo: 3 }, auvo_importacao: { prazo: 1 },""",
 """  qualidade_os: { prazo: 3 }, qualidade_mov: { prazo: 3 },
  // 18/11/2026: auvo_os_aberta, auvo_sem_vinculo e auvo_importacao saíram (Auvo descontinuado pelo dono, SGO_Auvo_Retirada.js)."""),
("""        var reg = abertos[itemId], sit = 'RESOLVIDA';
        if (/^CONDUTA:OC:/.test(itemId) && typeof CONDUTA_SHEETS !== 'undefined') {""",
 """        var reg = abertos[itemId], sit = 'RESOLVIDA';
        // 18/11/2026: item do Auvo sai como RETIRADA (o Auvo foi descontinuado; ninguém decidiu nada), fora da avaliação.
        if (Ges_ehItemAuvo_(itemId, reg.TIPO)) sit = 'RETIRADA';
        if (/^CONDUTA:OC:/.test(itemId) && typeof CONDUTA_SHEETS !== 'undefined') {"""),
("""/** Linha aberta de cada item (ITEM_ID -> linha). */""",
 """/** 18/11/2026: item da Caixa que veio do Auvo (O.S. aberta, O.S. sem vínculo ou importação parada). */
function Ges_ehItemAuvo_(itemId, tipo) {
  return /^AUVO:/i.test(Ges_s_(itemId)) || /^AUVO_/i.test(Ges_s_(tipo));
}

/** Linha aberta de cada item (ITEM_ID -> linha). */"""),
]
