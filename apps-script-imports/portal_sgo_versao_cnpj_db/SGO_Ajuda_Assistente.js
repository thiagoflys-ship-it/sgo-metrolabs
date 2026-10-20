/**
 * Ajuda "Como usar esta tela" do assistente "Tire sua dúvida" e do painel "Perguntas ao assistente" (20/10/2026).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Manual completo: docs/MANUAL_ASSISTENTE_DUVIDAS.md.
 */
function SGO_ajudaTelas_Assistente_() {
  return {
    "assistente_duvidas": {
      titulo: "Tire sua dúvida",
      paraQueServe: "Um assistente para perguntar como usar o SGO+: como fazer uma tarefa, onde fica uma tela, quem faz o quê. A resposta vem da ajuda das telas e dos manuais do sistema, com o passo a passo para o seu perfil, o caminho no menu e a fonte. O assistente só orienta: ele não faz nenhuma alteração no sistema.",
      antesDeComecar: [
        "O botão \"Tire sua dúvida\" fica no canto direito da tela, acima do balão do bate-papo. No celular, é a aba \"Dúvida\" na borda direita.",
        "Também abre pelo botão \"Tire sua dúvida\" do painel \"Como usar esta tela\".",
        "Escreva a dúvida com as suas palavras. Não escreva senhas nem dados de clientes."
      ],
      passos: [
        { titulo: "Fazer uma pergunta", itens: [
          "Toque em \"Tire sua dúvida\".",
          "Escreva a dúvida no campo de baixo. Exemplo: \"Como reservo um veículo?\".",
          "Toque em \"Perguntar\" (ou aperte Enter).",
          "Leia o passo a passo. O caminho no menu aparece no primeiro passo.",
          "Para ir direto à tela, toque em \"Abrir esta tela\".",
          "Confira a fonte, no fim da resposta: ela diz de qual ajuda ou manual veio a informação."
        ] },
        { titulo: "Dizer se a resposta resolveu", itens: [
          "No fim da resposta, toque em \"Sim\" ou \"Não\" ao lado de \"Isso resolveu?\".",
          "Se tocou em \"Não\", toque em \"Falar com o administrador\" para continuar pelo bate-papo.",
          "A sua avaliação ajuda a gestão a melhorar a ajuda e os manuais."
        ] },
        { titulo: "Falar com o administrador", itens: [
          "Toque em \"Falar com o administrador\" na resposta.",
          "O bate-papo abre na conversa com o administrador, com a sua pergunta já escrita.",
          "Se houver mais de um administrador, escolha com quem falar na lista.",
          "Confira o texto e envie a mensagem."
        ] }
      ],
      cores: [
        { nome: "Resposta com barra azul", significado: "A tarefa é feita por outro perfil. A resposta diz quem faz e como pedir." },
        { nome: "Resposta com barra laranja", significado: "O pedido não pode ser atendido porque contorna uma regra do sistema. A resposta mostra o caminho correto." },
        { nome: "Resposta com barra cinza", significado: "A informação não está na ajuda nem nos manuais. O assistente não responde para não orientar errado." },
        { nome: "Faixa amarela no começo da resposta", significado: "A resposta automática não estava disponível: aparecem os trechos da ajuda mais próximos da pergunta." }
      ],
      problemas: [
        { situacao: "Aparece \"Não encontrei essa informação na ajuda e nos manuais\"", oQueFazer: "Escreva a dúvida de outro jeito, com o nome da tela ou do botão. Se continuar, toque em \"Falar com o administrador\": a pergunta vai junto e ajuda a completar o manual." },
        { situacao: "Aparece \"Você já fez 20 perguntas nesta hora\"", oQueFazer: "É o limite por pessoa. Volte a perguntar na próxima hora; enquanto isso, use \"Como usar esta tela\" ou o bate-papo." },
        { situacao: "A resposta diz que a tarefa é de outro perfil", oQueFazer: "Peça a quem faz, pelo caminho que a resposta mostra (a tela ou o bate-papo com a gestão)." },
        { situacao: "Aparece \"Não foi possível responder agora\"", oQueFazer: "Confira a conexão e toque em \"Tentar de novo\". A pergunta que você escreveu continua na conversa." }
      ],
      quemPode: [
        { perfil: "TODOS", pode: "Todos os perfis da equipe perguntam. A resposta ensina só o que o seu perfil pode fazer." },
        { perfil: "ADMIN,DIRETORIA", pode: "Também veem o painel \"Perguntas ao assistente\" (Administração), com os assuntos mais perguntados e os sem resposta." },
        { perfil: "CLIENTE", pode: "Não usa o assistente. Para falar com a Metrolabs, use os contatos do portal." }
      ],
      perguntas: [
        { p: "De onde vêm as respostas?", r: "Da ajuda \"Como usar esta tela\" de cada tela, dos manuais dos módulos e do menu do sistema. Quando a ajuda ou um manual é atualizado, o assistente passa a responder pelo texto novo." },
        { p: "O assistente pode fazer a tarefa por mim?", r: "Não. Ele só orienta e mostra o botão \"Abrir esta tela\". Quem faz a tarefa é você, na tela." },
        { p: "Por que o assistente não respondeu o que eu pedi?", r: "Ele não ajuda a contornar regras, como apagar ocorrência, mudar a data de um registro, esconder KM ou ver dados de colegas. Nesses casos, ele mostra o caminho correto, como a contestação ou o pedido à gestão." },
        { p: "Esqueci a minha senha. O que faço?", r: "Peça a redefinição a um gestor ou ao Administrador. Eles redefinem a senha em Menu > Administração > Usuários." },
        { p: "Quem vê as minhas perguntas?", r: "O Administrador e a Diretoria veem o texto das perguntas, sem o seu nome, para melhorar a ajuda. E-mail, telefone, documento e placa escritos na pergunta ficam escondidos." }
      ]
    },
    "assistente": {
      titulo: "Perguntas ao assistente",
      paraQueServe: "Mostra o que a equipe pergunta ao \"Tire sua dúvida\": os assuntos mais frequentes, as perguntas sem resposta na base, as que não resolveram e os pedidos recusados. Serve para melhorar a ajuda das telas e os manuais.",
      antesDeComecar: [
        "Fica em Menu > Administração > Perguntas ao assistente.",
        "As perguntas aparecem sem o nome de quem perguntou. E-mail, telefone, documento e placa ficam escondidos."
      ],
      passos: [
        { titulo: "Ver os assuntos mais perguntados", itens: [
          "Abra Menu > Administração > Perguntas ao assistente.",
          "Escolha o \"Período\" (7, 30, 90 ou 365 dias).",
          "Na aba \"Assuntos mais frequentes\", cada cartão junta perguntas parecidas, com o número de perguntas, as telas e os perfis.",
          "Os selos mostram quantas ficaram sem resposta, não resolveram, resolveram ou foram recusadas."
        ] },
        { titulo: "Melhorar a ajuda a partir das perguntas", itens: [
          "Abra a aba \"Sem resposta ou não resolveu\" para ver o que a ajuda ainda não cobre.",
          "Na aba \"Assuntos mais frequentes\", toque em \"Sugerir texto de ajuda\" no assunto escolhido.",
          "Leia o rascunho. Ele usa só o que já está na ajuda e lista o que falta conferir na tela.",
          "Toque em \"Copiar o rascunho\" e revise o texto.",
          "Peça a inclusão do texto revisado na ajuda da tela e no manual do módulo. Nada é publicado sozinho."
        ] },
        { titulo: "Conferir a base do assistente", itens: [
          "Abra a aba \"Base do assistente\".",
          "Veja quantos trechos, telas e manuais a base tem e quando foi montada.",
          "Para testar, toque em \"Testar o assistente\" e faça uma pergunta."
        ] }
      ],
      cores: [
        { nome: "Selo vermelho \"sem resposta\"", significado: "A ajuda e os manuais não têm a resposta. É o primeiro ponto a completar." },
        { nome: "Selo laranja \"não resolveu\"", significado: "Havia resposta, mas a pessoa disse que não resolveu. Vale reler a ajuda daquela tela." },
        { nome: "Selo verde \"resolveu\"", significado: "A pessoa disse que a resposta resolveu." }
      ],
      problemas: [
        { situacao: "O rascunho veio só com a moldura", oQueFazer: "A IA não está ligada. Use as perguntas e os trechos listados para escrever o texto." },
        { situacao: "Aparece \"Não há perguntas registradas neste assunto\"", oQueFazer: "Toque em \"Atualizar\" e escolha outro assunto." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA", pode: "Ver o painel, gerar e copiar rascunhos de texto de ajuda." },
        { perfil: "GESTOR,TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO,RH", pode: "Não usam esta tela. Para sugerir melhoria na ajuda, escrevam ao administrador pelo bate-papo." }
      ],
      perguntas: [
        { p: "O rascunho entra na ajuda sozinho?", r: "Não. O rascunho é só para revisar. A ajuda e o manual mudam na próxima atualização do sistema, depois da revisão." },
        { p: "Dá para saber quem fez a pergunta?", r: "Não. O registro guarda o perfil e a tela, não a pessoa." }
      ]
    }
  };
}
