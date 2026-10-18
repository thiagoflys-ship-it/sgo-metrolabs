/**
 * Ajuda "Como usar esta tela" — grupo Documentos (frente B).
 * Telas: Declaração de execução, PGT e POP e Registros operacionais.
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Texto puro, sem HTML.
 * Conferido contra a tela real (SGO_DeclaracaoExec_ConteudoModulo.js,
 * SGO_PgtPop_ConteudoModulo.js e SGO_RegOp_ConteudoModulo.js) em 17/10/2026.
 */
function SGO_ajudaTelas_Documentos_() {
  var DETALHES = { nome: "Quadro \"Histórico da operação\" ou \"Detalhes técnicos da operação\"", significado: "Lista cada ação com a hora. Verde: deu certo. Amarelo: aviso. Vermelho: erro; leia a mensagem e corrija." };

  return {
    // ================================================================
    "declaracao_exec": {
      titulo: "Declaração de execução",
      paraQueServe: "Gera a declaração de que um serviço foi executado num equipamento do cliente: o que foi feito, quando, por quem e quais calibrações foram realizadas. A declaração registra a execução; ela não aprova nem reprova o equipamento.",
      antesDeComecar: [
        "Tenha o CNPJ do cliente e os dados do equipamento atendido.",
        "Anote as datas do atendimento, o técnico e como o serviço foi conduzido.",
        "Separe até 4 fotos, se tiver."
      ],
      passos: [
        { titulo: "Gerar a declaração", itens: [
          "Toque em \"Declaração de execução\" no menu.",
          "Em \"1. Cliente\", digite o CNPJ e toque em \"Buscar CNPJ\".",
          "Confira a razão social e o endereço.",
          "Em \"2. Equipamento\", escolha o tipo de equipamento.",
          "Preencha TAG, marca, modelo e localização.",
          "Digite a data de início. Deixe a data de fim em branco se o serviço foi feito em 1 dia.",
          "Digite o técnico executor.",
          "Marque \"Realizado no laboratório da Metrolabs\" só se o equipamento foi levado ao laboratório.",
          "Em \"3. Declaração de Execução\", descreva a metodologia: como o atendimento foi conduzido.",
          "Marque as calibrações realizadas (válvula de segurança, manômetro e outras).",
          "Anexe até 4 fotos, se quiser.",
          "Se a empresa usa código interno, preencha o número do documento. Não coloque a data nesse campo.",
          "Toque em \"Gerar Declaração com IA\".",
          "Em \"3.1 Revise os textos da Declaração antes de confirmar\", leia e corrija introdução, metodologia, calibrações e declaração final.",
          "Toque em \"Confirmar e Gerar Documento\".",
          "O documento abre em nova aba e é salvo sozinho na pasta do cliente. Espere a mensagem \"Salvo na pasta do cliente\"."
        ] },
        { titulo: "Reabrir uma declaração já gerada", itens: [
          "Em \"Documentos já gerados\", digite o cliente, a TAG ou o nome do arquivo.",
          "Toque em \"Buscar\".",
          "Abra o documento na lista."
        ] }
      ],
      cores: [
        { nome: "Mensagem \"Rascunho gerado. Revise os textos abaixo antes de confirmar.\"", significado: "A IA terminou. Os textos vão para o documento exatamente como estiverem." },
        { nome: "Aviso acima dos campos de revisão", significado: "A IA não respondeu. Os campos vêm com texto padrão completo para você revisar." },
        { nome: "Mensagem verde \"Salvo na pasta do cliente\"", significado: "O documento foi guardado. O link abre o arquivo." },
        { nome: "Botão \"Tentar salvar de novo\"", significado: "O documento foi gerado, mas não chegou à pasta. Toque para salvar outra vez." },
        DETALHES
      ],
      problemas: [
        { situacao: "A nova aba não abriu.", oQueFazer: "Libere janelas novas (pop-up) para o endereço do SGO+ e toque de novo em \"Confirmar e Gerar Documento\"." },
        { situacao: "Apareceu \"Tentar salvar de novo\".", oQueFazer: "Toque no botão. Se falhar de novo, confira a internet e avise o administrador." },
        { situacao: "A busca de CNPJ não preencheu nada.", oQueFazer: "Digite a razão social e o endereço à mão e continue." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Gerar e consultar declarações." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela." }
      ],
      perguntas: [
        { p: "A declaração diz se o equipamento foi aprovado?", r: "Não. Ela registra a execução do serviço. Resultado de aprovação fica nos relatórios técnicos, como QI/QO/QD, qualificação térmica ou calibração." }
      ]
    },

    // ================================================================
    "pgt_pop": {
      titulo: "PGT e POP",
      paraQueServe: "Gera o PGT (Plano de Gerenciamento de Tecnologias em Saúde) e os POPs (Procedimentos Operacionais Padrão) personalizados para cada cliente, com texto redigido pela IA. Cada documento tem código e revisão.",
      antesDeComecar: [
        "PGT é o plano geral de como o cliente gerencia os equipamentos de saúde. POP é o passo a passo de uma tarefa específica.",
        "Tenha o CNPJ do cliente, o porte, o número de leitos e o responsável técnico do cliente.",
        "Tenha nome, cargo e registro profissional de quem elaborou o documento.",
        "A geração depende da IA. Sem a IA, o PGT e os POPs sem roteiro não são gerados; o POP com roteiro sai com texto padrão."
      ],
      passos: [
        { titulo: "Gerar o PGT e os POPs", itens: [
          "Toque em \"PGT e POP\" no menu.",
          "Na etapa \"1. Cliente\", digite o CNPJ e toque em \"Buscar\".",
          "Confira o endereço e preencha porte, leitos e o responsável técnico do cliente.",
          "Preencha nome, cargo e registro de quem elaborou. Os 3 campos são da mesma pessoa.",
          "Toque em \"Avançar\". Se faltar algum campo obrigatório, a mensagem aparece ao lado do botão.",
          "Na etapa \"2. PGT\", escreva um roteiro, se quiser guiar a IA. Em branco, a IA monta a estrutura completa.",
          "Anexe imagens, se quiser, e toque em \"Avançar\".",
          "Na etapa \"3. POPs\", marque os POPs que se aplicam ao cliente.",
          "Para um POP fora da lista, digite o nome e toque em \"+ Adicionar POP avulso\".",
          "Toque em \"Avançar\".",
          "Na etapa \"4. Gerar\", toque em \"Gerar Tudo\". A IA gera um documento por vez e pode levar alguns minutos.",
          "Toque em \"Ver Documentos\"."
        ] },
        { titulo: "Abrir e salvar os documentos", itens: [
          "Na lista, toque em \"Abrir\" para ver o documento em nova aba.",
          "Toque em \"Salvar na pasta do cliente\". Depois de salvo, o botão vira \"PDF salvo\".",
          "Em \"5. Documentos\", toque em \"Atualizar lista\" para ver a lista de controle do cliente (código, título, revisão e data)."
        ] },
        { titulo: "Consultar o que já foi gerado para o cliente", itens: [
          "Na etapa 1, digite o CNPJ.",
          "Toque em \"Consultar documentos já gerados\"."
        ] }
      ],
      cores: [
        { nome: "Mensagem \"CNPJ encontrado\"", significado: "Os dados do cliente foram preenchidos. Confira." },
        { nome: "Mensagem \"Não foi possível buscar automaticamente\"", significado: "Preencha os dados à mão e continue." },
        { nome: "Botão \"PDF salvo\"", significado: "O documento já está na pasta do cliente. Toque para abrir o PDF." },
        DETALHES
      ],
      problemas: [
        { situacao: "\"Avançar\" não passa da etapa 1.", oQueFazer: "Preencha a razão social, o responsável técnico e o \"Elaborado por\". O campo que falta recebe o foco." },
        { situacao: "O PGT não foi gerado e a mensagem diz que nada foi gravado.", oQueFazer: "A IA não respondeu. A revisão continua a mesma. Tente mais tarde ou peça ao administrador para conferir a chave em \"Chaves e senhas\"." },
        { situacao: "O navegador bloqueou a nova aba.", oQueFazer: "Libere janelas novas (pop-up) para o SGO+ e toque de novo em \"Abrir\"." },
        { situacao: "Tentei salvar sem abrir o documento.", oQueFazer: "Toque primeiro em \"Abrir\" e depois em \"Salvar na pasta do cliente\"." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Gerar, abrir e salvar PGT e POPs." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela. Para receber um documento, solicite à Metrolabs." }
      ],
      perguntas: [
        { p: "Gerar de novo apaga a versão anterior?", r: "Não. Cada geração cria uma nova revisão (1.0, 2.0...). A lista de controle mostra a revisão e a data." }
      ]
    },

    // ================================================================
    "reg_op": {
      titulo: "Registros operacionais",
      paraQueServe: "Registra a execução dos POPs no cliente: rondas, checklists, formulários e treinamentos. Também controla as pendências que um registro abre até o registro de fechamento.",
      antesDeComecar: [
        "Tenha o CNPJ do cliente.",
        "Saiba qual tipo de documento vai preencher. Se ainda não existe, você pode criar um tipo novo.",
        "Tenha nome e cargo de quem vai assinar."
      ],
      passos: [
        { titulo: "Preencher um registro", itens: [
          "Toque em \"Registros operacionais\" no menu.",
          "Na etapa \"1. Cliente\", digite o CNPJ e toque em \"Buscar\".",
          "Toque em \"Avançar\".",
          "Na etapa \"2. Tipo de Documento\", escolha o tipo na lista.",
          "Toque em \"Avançar\".",
          "Na etapa \"3. Preenchimento\", digite a data (dd/mm/aaaa).",
          "Responda cada campo. Nos itens de marcar, escolha \"Sim\", \"Não\" ou \"N/A\".",
          "Nos campos de texto com \"Revisar texto (IA)\", toque no botão se quiser melhorar a redação. Depois escolha \"Usar sugestão da IA\" ou \"Manter o que escrevi\".",
          "Anexe fotos, se quiser.",
          "Preencha nome e cargo de cada assinatura pedida.",
          "Toque em \"Gerar Registro\"."
        ] },
        { titulo: "Criar um tipo de documento novo", itens: [
          "Na etapa 2, escolha \"+ Criar novo tipo de documento\" na lista.",
          "Digite o nome do tipo e marque os POPs relacionados, se houver.",
          "Escreva um roteiro, se quiser, e toque em \"Gerar sugestão de campos com IA\". Ou toque em \"Montar os campos manualmente\".",
          "Confira os campos. Use \"+ Adicionar campo\" e \"Remover\" para ajustar.",
          "Use \"+ Adicionar assinatura\" para cada pessoa que assina.",
          "Se este documento abre uma pendência, marque a opção e escolha o documento que fecha a pendência.",
          "Toque em \"Salvar tipo de documento\". O tipo fica disponível para todos os clientes."
        ] },
        { titulo: "Consultar registros e fechar pendências", itens: [
          "Toque em \"Consultar registros e pendências\".",
          "Digite o CNPJ e toque em \"Buscar\".",
          "Em \"Pendências em Aberto\", toque em \"Registrar Fechamento\" para preencher o documento que fecha a pendência.",
          "Em \"Histórico Completo\", veja todos os registros já gerados."
        ] }
      ],
      cores: [
        { nome: "Mensagem \"Nenhuma pendência em aberto pra este CNPJ.\"", significado: "Não há nada aguardando fechamento para este cliente." },
        { nome: "Mensagem \"Registro gerado.\"", significado: "O registro foi gravado e aparece no histórico do cliente." },
        DETALHES
      ],
      problemas: [
        { situacao: "O botão \"Avançar\" da etapa 2 está apagado.", oQueFazer: "Escolha um tipo de documento na lista primeiro." },
        { situacao: "Quero excluir um tipo de documento.", oQueFazer: "Escolha o tipo e toque em \"Excluir este tipo\". O sistema mostra se o tipo já foi usado e pede a confirmação em \"Sim, excluir mesmo assim\". Os registros já gerados continuam intactos; o tipo só some da lista para novos preenchimentos." },
        { situacao: "A IA não sugeriu campos.", oQueFazer: "Toque em \"Montar os campos manualmente\" e crie os campos com \"+ Adicionar campo\"." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Preencher registros, criar e editar tipos de documento e consultar pendências." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela." }
      ],
      perguntas: [
        { p: "O que é uma pendência?", r: "É um registro que precisa de outro depois. Exemplo: uma não conformidade encontrada na ronda fica em aberto até alguém registrar a correção." }
      ]
    }
  };
}
