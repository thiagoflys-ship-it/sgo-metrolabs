/****************************************************
 * AJUDA "COMO USAR ESTA TELA" — SGO+ LICITAÇÕES, RELATÓRIOS EM A4 (02/11/2026)
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Manual completo: docs/MANUAL_MODULO_LICITACOES.md, seção "Relatórios (Licitações › Relatórios)".
 * Tela: licitacoes_relatorios. Texto conferido com JS_Licitacoes_Relatorios.html e SGO_Licitacoes_Relatorios.js. Texto puro, sem HTML.
 * A aba "Proposta" da ficha está na ajuda de Oportunidades (SGO_Ajuda_Licitacoes.js).
 ****************************************************/
function SGO_ajudaTelas_LicitacoesRelatorios_() {
  return {
    "licitacoes_relatorios": {
      titulo: "Relatórios de Licitações",
      paraQueServe: "Gera em A4 o relatório de uma oportunidade (resumo, nota, leitura do edital com a cobertura, habilitação, preço, propostas, decisões e histórico) e o relatório de um período (oportunidades por etapa e por UF, notas, prazos, alertas, propostas emitidas e resultados). Cada número diz de onde vem. Cada relatório gerado fica guardado como uma versão que não muda.",
      antesDeComecar: [
        "O relatório mostra o que está gravado no SGO+ na hora em que é gerado. Para ver o estado de depois, gere de novo: sai a versão seguinte, e a anterior continua guardada.",
        "No computador o documento abre em aba nova. No celular, o documento abre dentro do SGO+, em tela cheia, com Voltar e Imprimir."
      ],
      passos: [
        { titulo: "Relatório da oportunidade", itens: [
          "Em \"Buscar\", escreva o código, o órgão ou a UF; escolha a oportunidade na lista e toque em \"Gerar o relatório (A4)\".",
          "O mesmo relatório sai pela ficha da licitação, aba Proposta, botão \"Relatório desta oportunidade (A4)\"."
        ] },
        { titulo: "Relatório do período", itens: [
          "Escolha \"De\" e \"Até\" (até 400 dias) e toque em \"Gerar o relatório (A4)\".",
          "Oportunidades novas são as que tiveram a primeira coleta no período (a etapa é a de hoje). Prazos são os fins de proposta no período. Alertas e propostas emitidas contam pela data em que foram criados ou emitidos."
        ] },
        { titulo: "Abrir um relatório guardado", itens: [
          "Na lista \"Relatórios gerados\", toque em \"Abrir\". O SGO+ confere o SHA-256 do documento guardado; se não conferir, aparece o aviso \"alterado fora do SGO+\".",
          "Para imprimir ou salvar em PDF, use o botão no alto do documento."
        ] }
      ],
      cores: [
        { nome: "Selo vermelho \"alterado fora do SGO+\"", significado: "O registro ou o documento guardado não confere com o SHA-256 gravado." },
        { nome: "Número com borda vermelha no documento", significado: "Ponto de atenção (item abaixo do piso, documento que falta ou vence antes da sessão)." }
      ],
      problemas: [
        { situacao: "Aparece \"O fim do período é antes do começo\"", oQueFazer: "Troque as datas: \"De\" é o primeiro dia e \"Até\" o último. Nada foi gerado." },
        { situacao: "Aparece \"Não foi possível guardar a cópia do documento\"", oQueFazer: "O serviço de arquivos do SGO+ não respondeu. Nada foi gravado: tente de novo em alguns minutos e avise o Administrador se repetir." },
        { situacao: "O documento não abre", oQueFazer: "O navegador bloqueou a janela: libere as janelas do SGO+ e toque de novo." }
      ],
      quemPode: [
        { perfil: "DIRETORIA,ADMIN", pode: "Gerar e abrir os relatórios." },
        { perfil: "GESTOR,COMERCIAL,FINANCEIRO,TECNICO,METROLOGIA,RH,CLIENTE", pode: "Não usa este módulo: o menu não aparece e o servidor recusa as chamadas." }
      ],
      perguntas: [
        { p: "Posso apagar ou refazer um relatório?", r: "Não. Cada relatório gerado é uma versão guardada com o SHA-256 e a data. Gere de novo para ter a versão seguinte; a anterior continua na lista." },
        { p: "De onde vem cada número?", r: "Embaixo de cada parte do documento há a linha \"Fonte\", com a aba do SGO+ e o filtro usado (por exemplo, LIC_ALERTAS criados no período)." },
        { p: "O relatório mostra quem venceu a licitação?", r: "O relatório do período lista as licitações em Resultado e Contrato. O vencedor, a colocação e o valor final de cada item ficam no relatório da disputa, gerado na ficha, aba Disputa (Central de disputas)." }
      ]
    }
  };
}
