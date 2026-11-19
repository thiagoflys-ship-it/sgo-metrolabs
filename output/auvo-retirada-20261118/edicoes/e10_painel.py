ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Assistencia_Painel.js'
PARES = [
("""  importarAuvo: function (eu) { return AstF_importarDoAcervo_(eu); },
  derivarQuestionarios: function (eu, d) { return AstQ_derivar_(eu, { lote: 60, orcamentoMs: 90000, gerarAgora: !!(d && d.gerarAgora), recomecar: !!(d && d.recomecar) }); },""",
"""  // 18/11/2026: Auvo descontinuado pelo dono (SGO_Auvo_Retirada.js). "Trazer os questionários do Auvo" e "montar checklists das
  // tarefas do Auvo" saíram da tela; os modelos já trazidos continuam nas Regras como qualquer outro.
  importarAuvo: function () { throw Auvo_erroDescontinuado_(); },
  derivarQuestionarios: function () { throw Auvo_erroDescontinuado_(); },"""),
("'Assistência do SGO+ ligada (uso em paralelo ao Auvo).'", "'Assistência do SGO+ ligada.'"),
("""  // transição do Auvo e acervo
  transicao: function (eu) { Ast_exigir_(eu, 'GESTAO', 'ver a transição do Auvo'); return { transicao: AstP_transicao_(eu) }; },
  confirmarCriterio: function (eu, d) { return AstP_confirmar_(eu, d); },
  destinoAuvo: function (eu, d) { return AstP_destinoAuvo_(eu, d); },
  auvoDesligado: function (eu, d) { return AstP_marcarAuvoDesligado_(eu, d); },""",
"""  // 18/11/2026: Auvo descontinuado pelo dono. A tela "Transição do Auvo" saiu (o contrato foi cancelado); o registro da transição
  // fica guardado nas regras da Assistência. Continua só o histórico do Auvo ligado aos equipamentos (consulta).
  transicao: function () { throw Auvo_erroDescontinuado_(); },
  confirmarCriterio: function () { throw Auvo_erroDescontinuado_(); },
  destinoAuvo: function () { throw Auvo_erroDescontinuado_(); },
  auvoDesligado: function () { throw Auvo_erroDescontinuado_(); },"""),
]
