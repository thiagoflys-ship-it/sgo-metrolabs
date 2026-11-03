/****************************************************
 * AJUDA "COMO USAR ESTA TELA" — SGO+ LICITAÇÕES, CENTRAL DE DISPUTAS (MODO ASSISTIDO) (02/11/2026)
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Manual completo: docs/MANUAL_MODULO_LICITACOES.md, seção "Disputas (Central de disputas
 * e aba Disputa da ficha)". Tela: licitacoes_disputas. Texto conferido com JS_Licitacoes_Disputa.html e SGO_Licitacoes_Disputa.js.
 * Texto puro, sem HTML. A aba "Disputa" da ficha também está na ajuda de Oportunidades (SGO_Ajuda_Licitacoes.js).
 ****************************************************/
function SGO_ajudaTelas_LicitacoesDisputas_() {
  return {
    "licitacoes_disputas": {
      titulo: "Central de disputas",
      paraQueServe: "Acompanha as sessões de disputa no modo assistido: as licitações prontas para abrir (proposta emitida), as disputas abertas e as que já têm resultado. O painel de cada disputa fica na ficha da licitação, aba Disputa. O SGO+ não envia lance nem acessa o portal: a Diretoria dá o lance no portal e digita aqui o que deu e o melhor lance do concorrente; o SGO+ confere o piso e sugere o próximo lance.",
      antesDeComecar: [
        "A disputa só abre com a proposta emitida (aba Proposta) e a simulação de preço que ela usou (aba Preço). O valor inicial de cada item é o da proposta; o piso é o da simulação (sobra mínima da política).",
        "O SGO+ não entra no portal, não digita senha nem resolve verificação de segurança. Tudo o que aparece no painel foi digitado por alguém da Diretoria."
      ],
      passos: [
        { titulo: "Abrir a disputa", itens: [
          "Na lista \"Sessões: prontas para abrir\", toque em \"Abrir a disputa\" (vai para a ficha, aba Disputa).",
          "Confira os itens (valor inicial, piso da simulação e custo mais os impostos), a data e a hora da sessão (a agenda sugere; diga de onde veio) e o intervalo mínimo entre lances (a frase do edital aparece quando a leitura achou; sem intervalo, R$ 0,01).",
          "Escreva o motivo e toque em \"Abrir a disputa\". A licitação vai para \"Disputa\" no Kanban, com o motivo no histórico."
        ] },
        { titulo: "Durante a sessão", itens: [
          "Em cada item, digite o melhor lance do concorrente (o que aparece no portal) e toque em \"Registrar o lance do concorrente\".",
          "A sugestão do SGO+ é o melhor lance menos o intervalo, nunca abaixo do piso. \"Usar a sugestão\" põe o valor no campo; dê o lance no portal e depois toque em \"Registrar o nosso lance\".",
          "Ao digitar o nosso lance, a tela mostra a sobra e avisa em vermelho se o valor está abaixo do piso. O SGO+ recusa lance abaixo do piso e diz o porquê: não dê esse lance no portal.",
          "\"Piso do item\" muda o piso com o motivo. Abaixo do custo mais os impostos, a tela mostra o prejuízo em vermelho e só grava com \"Assumo o prejuízo\".",
          "\"Desistir do item\" (com o motivo) para os lances daquele item. \"Parar sugestões\" esconde a sugestão de todos os itens; o piso continua valendo."
        ] },
        { titulo: "Depois da sessão: resultado", itens: [
          "Em cada item, toque em \"Registrar o resultado\": situação (ganho, perdido, fracassado, deserto, desclassificado com motivo, habilitação pendente ou em recurso), colocação, vencedor, valor final, adjudicação, homologação e a fonte.",
          "Em recurso, diga quem recorre e a data da ata: os prazos de razões e de contrarrazões entram na agenda como \"pendente de confirmação\". Confirme a data na aba Prazos para ter os alertas.",
          "Com todos os itens com resultado, \"Concluir o resultado\" (com o motivo) leva a licitação para \"Resultado\" no Kanban e prepara o dado dos itens ganhos para a etapa de Contrato. Pelo Kanban, \"Disputa → Resultado\" faz o mesmo.",
          "\"Relatório da disputa (A4)\" gera o documento com os lances, as decisões e o resultado, guardado com o SHA-256."
        ] }
      ],
      cores: [
        { nome: "Faixa da sugestão em vermelho", significado: "Cobrir o melhor lance passaria do piso: a sugestão é não cobrir (manter o lance ou desistir do item)." },
        { nome: "Borda verde no item", significado: "O nosso lance é o melhor." },
        { nome: "Borda laranja no item", significado: "O concorrente está na frente ou empatado." },
        { nome: "Selo vermelho \"prejuízo assumido\"", significado: "A Diretoria autorizou um piso abaixo do custo mais os impostos." },
        { nome: "Selo vermelho \"alterado\"", significado: "Um registro não confere com o hash gravado: o SGO+ para de gravar nessa disputa." }
      ],
      problemas: [
        { situacao: "Aparece \"lance recusado: ... abaixo do piso autorizado\"", oQueFazer: "Não dê esse lance no portal. Se a Diretoria decidir baixar o piso, use \"Piso do item\", com o motivo. Nada foi gravado." },
        { situacao: "Aparece \"o registro de lances desta disputa foi mexido fora do SGO+\"", oQueFazer: "Alguém mudou ou apagou uma linha direto na planilha. O Administrador confere a planilha e toca em \"Reconhecer a quebra\" (com o motivo): o registro recomeça de uma âncora. Até lá, anote os lances fora do SGO+; o resultado e a conclusão continuam." },
        { situacao: "Aparece \"use vírgula para os centavos\" ou \"no máximo 2 casas decimais\"", oQueFazer: "Escreva o valor como 185,40 (ponto só para o milhar: 1.234,56), sem \"%\" nos campos em reais. Nada foi gravado." },
        { situacao: "\"Abrir a disputa\" está travado", oQueFazer: "A lista \"Antes de abrir\" diz o que falta (proposta emitida, simulação conferida, piso de cada item). Os botões levam para a aba Proposta ou Preço." },
        { situacao: "\"Concluir o resultado\" está travado", oQueFazer: "Falta o resultado de algum item. Item desistido também recebe o resultado (por exemplo, perdido)." }
      ],
      quemPode: [
        { perfil: "DIRETORIA,ADMIN", pode: "Abrir a disputa, registrar lances, mudar o piso, desistir, registrar o resultado e gerar o relatório." },
        { perfil: "ADMIN", pode: "Reconhecer a quebra do registro de lances (depois de conferir a planilha), com o motivo." },
        { perfil: "GESTOR,COMERCIAL,FINANCEIRO,TECNICO,METROLOGIA,RH,CLIENTE", pode: "Não usa este módulo: o menu não aparece e o servidor recusa as chamadas." }
      ],
      perguntas: [
        { p: "O SGO+ dá o lance sozinho?", r: "Não. Hoje nenhuma plataforma de disputa permite lance por sistema de fornecedor. O SGO+ só registra o que a Diretoria digitou e confere o piso." },
        { p: "A IA sugere o valor do lance?", r: "Não. A sugestão é uma conta fixa: melhor lance do concorrente menos o intervalo mínimo, nunca abaixo do piso." },
        { p: "Posso corrigir um lance digitado errado?", r: "Não dá para apagar nem mudar: o registro é imutável. Registre o valor certo em seguida; o SGO+ considera o último lance informado." },
        { p: "Onde ficam os prazos de recurso?", r: "Na agenda e na aba Prazos da ficha, como \"pendente de confirmação\". Sem a confirmação da data, não há alerta." }
      ]
    }
  };
}
