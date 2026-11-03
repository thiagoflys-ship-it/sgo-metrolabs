/****************************************************
 * AJUDA "COMO USAR ESTA TELA" — SGO+ LICITAÇÕES, PARECERES POR ÁREA E ALÇADAS DE DECISÃO (03/11/2026)
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Manual completo: docs/MANUAL_MODULO_LICITACOES.md, seção "Pareceres por área e alçadas
 * de decisão". Tela: licitacoes_pareceres (Meus pareceres). A aba "Pareceres" da ficha está também na ajuda de Oportunidades e a parte
 * "Alçadas e pareceres" na de Portais e configurações (SGO_Ajuda_Licitacoes.js). Texto conferido com JS_Licitacoes_Pareceres.html e
 * SGO_Licitacoes_Pareceres.js. Texto puro, sem HTML.
 ****************************************************/
function SGO_ajudaTelas_LicitacoesPareceres_() {
  return {
    "licitacoes_pareceres": {
      titulo: "Meus pareceres",
      paraQueServe: "Mostra os pedidos de parecer que a Diretoria fez a você sobre uma licitação (área Licitações, Técnica, Financeira ou Comercial): a oportunidade, o que a Diretoria quer saber e o prazo. Você lê o resumo, a nota da análise, a leitura do edital, o preço e a habilitação e registra o parecer: favorável, com ressalva ou contrário, com o motivo. Para a Diretoria, mostra também todos os pedidos em aberto.",
      antesDeComecar: [
        "O pedido chega por três caminhos: esta tela (menu Licitações › Meus pareceres), a atividade em Minhas atividades e o aviso por e-mail (e WhatsApp, só no expediente).",
        "Você vê só a oportunidade do pedido feito a você, e só enquanto o pedido está aberto e a Diretoria ainda não decidiu. Custo, piso e margem são da Diretoria: aqui aparece só se o preço respeita o piso."
      ],
      passos: [
        { titulo: "Abrir o pedido", itens: [
          "Toque em \"Abrir e dar o parecer\" no pedido. O prazo aparece no selo (vermelho quando passou).",
          "Leia a pergunta da Diretoria, o foco da sua área e o resumo da oportunidade (órgão, objeto, valor estimado e fim das propostas)."
        ] },
        { titulo: "Ler o que o sistema já tem", itens: [
          "Nota da análise: a nota de 0 a 100, a classe, as travas a confirmar e os critérios. A nota é da análise por IA com verificador; ela não decide.",
          "Leitura do edital: os itens do checklist com o trecho e onde está no edital.",
          "Preço: o total da proposta e o total pelo preço do edital na última simulação salva, e se o piso da Diretoria é respeitado.",
          "Habilitação: as exigências do edital cruzadas com os documentos da empresa (atende, vence antes, falta, a conferir, não atende)."
        ] },
        { titulo: "Registrar o parecer", itens: [
          "Escolha a posição: favorável, com ressalva ou contrário.",
          "Escreva o motivo com pelo menos 20 letras: o que você conferiu e por que chegou a essa posição.",
          "Toque em \"Registrar o parecer\". O parecer fica com o seu nome, a data, a versão e o que você viu (versão da análise e da simulação). A atividade em Minhas atividades é concluída sozinha e a Diretoria recebe o aviso.",
          "Depois de registrado, o parecer não muda. Se precisar mudar, peça à Diretoria um pedido novo: o parecer novo é a versão seguinte e pede também o que mudou."
        ] }
      ],
      cores: [
        { nome: "Selo laranja", significado: "Pedido aberto, dentro do prazo." },
        { nome: "Selo vermelho", significado: "Prazo do pedido passou (ainda dá para registrar; fica marcado no histórico), ou o preço está abaixo do piso." },
        { nome: "Selo verde", significado: "Parecer favorável, ou o preço respeita o piso." },
        { nome: "Selo cinza", significado: "Sem parecer ainda." }
      ],
      problemas: [
        { situacao: "Aparece \"a oportunidade saiu da sua tela\"", oQueFazer: "O pedido foi respondido, cancelado, ou a Diretoria já decidiu a licitação. Se ainda quer dizer algo, fale com quem pediu." },
        { situacao: "Aparece \"este pedido de parecer é de outra pessoa\"", oQueFazer: "O link ou o pedido é de outra pessoa. Os pedidos feitos a você ficam nesta tela." },
        { situacao: "Aparece \"escreva o que mudou\"", oQueFazer: "A sua área já tem um parecer registrado. O novo substitui o anterior: escreva no segundo campo o que mudou desde a versão anterior." },
        { situacao: "Não aparece nenhum pedido", oQueFazer: "A Diretoria ainda não pediu parecer a você. Quando pedir, ele aparece aqui, em Minhas atividades e no e-mail." }
      ],
      quemPode: [
        { perfil: "DIRETORIA,ADMIN", pode: "Pedir parecer às áreas, cancelar o pedido, acompanhar todos os pedidos em aberto, ver o preço com custo e piso, aprovar a participação pela alçada e mudar as alçadas." },
        { perfil: "GESTOR,COMERCIAL,FINANCEIRO,TECNICO,METROLOGIA", pode: "Só quem recebeu o pedido: ver a oportunidade do pedido (sem custo, piso nem margem) enquanto ele está aberto e registrar o parecer da área com o motivo." },
        { perfil: "RH,CLIENTE", pode: "Não usa esta tela." }
      ],
      perguntas: [
        { p: "Meu parecer decide se a empresa participa?", r: "Não. Quem decide é a Diretoria, pela alçada. O seu parecer entra no quadro da decisão e o sistema aponta quando ele diverge dos dados (por exemplo, favorável com a capacidade técnica baixa na análise)." },
        { p: "Posso mudar o parecer depois?", r: "Não: o parecer registrado não muda. A Diretoria pode pedir uma versão nova; ela substitui a anterior, que continua no histórico." },
        { p: "Por que não vejo o custo?", r: "Custo, piso e margem são informação da Diretoria. A tela mostra se o preço respeita o piso, sem os números." },
        { p: "O aviso chega fora do horário?", r: "Não. O aviso do pedido de parecer sai só no expediente, das 08:00 às 18:00 em dia útil. A atividade em Minhas atividades aparece na hora." }
      ]
    }
  };
}
