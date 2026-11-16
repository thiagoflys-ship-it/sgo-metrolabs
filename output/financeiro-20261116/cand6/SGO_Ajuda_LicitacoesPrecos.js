/****************************************************
 * AJUDA "COMO USAR ESTA TELA" — SGO+ LICITAÇÕES, PREÇOS DE LICITAÇÃO (02/11/2026)
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Manual completo: docs/MANUAL_MODULO_LICITACOES.md, seção "Preços de licitação e simulador".
 * Tela: licitacoes_precos. Texto conferido com JS_Licitacoes_Precos.html e SGO_Licitacoes_Precos.js. Texto puro, sem HTML.
 * A aba "Preço" da ficha está na ajuda de Oportunidades (SGO_Ajuda_Licitacoes.js).
 ****************************************************/
function SGO_ajudaTelas_LicitacoesPrecos_() {
  return {
    "licitacoes_precos": {
      titulo: "Preços de licitação",
      paraQueServe: "Tabela própria de preços de licitação, cadastrada pela Diretoria (os preços não são os do Comercial), e a política do piso que o simulador da aba Preço usa. Cada mudança pede o motivo e vira uma versão nova, com histórico.",
      antesDeComecar: [
        "O custo de referência vem do catálogo do Comercial (ficha de custo pela política em vigor: custo da hora, custo fixo e Bônus Coletivo) ou é informado pela Diretoria, com motivo.",
        "Os impostos (matriz de Goiânia, CNPJ da proposta), o km de R$ 2,50 e o Incentivo de Missão vêm da política do Comercial; a sobra, a comissão e as equipes vêm da política de preços de licitação desta tela."
      ],
      passos: [
        { titulo: "Começar a tabela", itens: [
          "Toque em \"Importar do catálogo\": a prévia mostra os serviços do catálogo que ainda não estão na tabela, com o preço, o custo e a execução sugerida. Desmarque o que não serve e toque em \"Importar os marcados\".",
          "O que já está na tabela nunca é sobrescrito pela importação. Produtos e peças ficam fora.",
          "Eletromédicos entram como parceiro (o custo é o do parceiro); balança, esfigmomanômetro e o resto, pela equipe própria. O óxido de etileno entra com o preço \"a confirmar\"."
        ] },
        { titulo: "Editar um item", itens: [
          "\"Editar\" muda o preço de referência, a situação do preço (confirmado ou a confirmar), a execução, o custo (do catálogo ou informado pela Diretoria), o custo do parceiro, a vigência, as observações e se está ativo.",
          "O motivo é obrigatório (pelo menos 10 letras). Só o que você mudou muda; a versão sobe e a anterior fica em \"Histórico\".",
          "Item com preço a confirmar não tem piso no simulador: confirme o preço aqui para liberar."
        ] },
        { titulo: "Ler a tabela", itens: [
          "Piso (sem deslocamento): o preço unitário que deixa a sobra mínima com o custo de referência, antes do deslocamento da licitação.",
          "Sobra no preço de referência: quanto sobra no preço da tabela; em vermelho, com \"abaixo do piso\", quando fica abaixo da sobra mínima."
        ] },
        { titulo: "Mudar a política", itens: [
          "\"Mudar a política\" muda a sobra mínima (não fica abaixo de 35%, decisão do dono), a margem alvo, a comissão, as UFs da equipe do Rio, o piso por item ou no lote e o deslocamento diluído ou numa linha própria.",
          "Cada gravação é uma versão nova com o motivo. As simulações já salvas continuam com a versão que usaram."
        ] }
      ],
      cores: [
        { nome: "Selo laranja \"Preço a confirmar\"", significado: "O preço ainda não foi confirmado pela Diretoria: o simulador não calcula o piso deste item." },
        { nome: "Texto vermelho \"abaixo do piso\"", significado: "O preço de referência não deixa a sobra mínima." },
        { nome: "Selo cinza \"inativo\"", significado: "O item não aparece para escolher no simulador." }
      ],
      problemas: [
        { situacao: "Aparece \"Escreva o motivo da mudança\"", oQueFazer: "Escreva pelo menos 10 letras explicando a mudança. Nada foi alterado." },
        { situacao: "A importação diz que o catálogo mudou desde a prévia", oQueFazer: "Outra pessoa mudou o catálogo ou a tabela. Abra a prévia de novo, confira e importe. Nada foi gravado." },
        { situacao: "O custo aparece \"sem custo no catálogo\"", oQueFazer: "O catálogo não tem ficha de custo para o serviço: toque em \"Editar\", escolha \"Informado pela Diretoria\" e escreva o custo por equipamento com o motivo." },
        { situacao: "Custos e pisos aparecem sem conta", oQueFazer: "A política do Comercial não respondeu neste ambiente. Use o SGO+ completo (sgo.metrolabs.com.br)." }
      ],
      quemPode: [
        { perfil: "DIRETORIA,ADMIN", pode: "Tudo: importar o catálogo, editar os preços e custos, mudar a política e simular." },
        { perfil: "GESTOR,COMERCIAL,FINANCEIRO,TECNICO,METROLOGIA,RH,CLIENTE", pode: "Não usa este módulo: o menu não aparece e o servidor recusa as chamadas." }
      ],
      perguntas: [
        { p: "Por que o preço não é o do Comercial?", r: "Decisão do dono: os preços de licitação são cadastrados no módulo. O catálogo do Comercial serve de ponto de partida e de custo." },
        { p: "Mudar um preço muda as simulações salvas?", r: "Não. Cada simulação salva guarda a versão da tabela e da política que usou e nunca muda; a próxima simulação usa o valor novo." },
        { p: "Como o piso é calculado?", r: "Custo unitário (com o deslocamento diluído) dividido por (1 menos os impostos, a comissão e a sobra mínima), arredondado para cima ao centavo. Assim sobram 35% do preço inteiro." }
      ]
    }
  };
}
