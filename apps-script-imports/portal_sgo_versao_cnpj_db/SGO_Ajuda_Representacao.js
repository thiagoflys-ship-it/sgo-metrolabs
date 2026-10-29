/****************************************************
 * AJUDA "COMO USAR ESTA TELA" — MÓDULO REPRESENTAÇÃO (29/10/2026)
 * Contrato: docs/AJUDA_CONTRATO_20261017.md
 * Telas: representacao (visão da equipe da Metrolabs) e representacao/representada (visão da empresa representada,
 * sem termos internos; é a que a pessoa da representada lê na aba "Como usar" do módulo, Representacao_api > ajuda).
 * Texto conferido com JS_Representacao.html, SGO_Representacao.js, SGO_Representacao_Config.js e
 * SGO_Representacao_Avisos.js. Texto puro, sem HTML.
 ****************************************************/
function SGO_ajudaTelas_Representacao_() {
  return {
    "representacao": {
      titulo: "Representação",
      paraQueServe: "Recebe os pedidos de atendimento da empresa representada (Brasmedical) aos clientes finais dos equipamentos dela, com a conversa e os arquivos de cada pedido. Aqui a equipe aceita o pedido (ele vira chamado na Assistência técnica com a marca da representada), pede complemento ou recusa com o motivo, e cadastra a representada e o catálogo de modelos.",
      antesDeComecar: [
        "A pessoa da representada entra no SGO+ pelo login normal, com o perfil \"Representada\". Ela só vê o módulo Representação e só os pedidos e chamados da empresa dela.",
        "As contas da representada são criadas e inativadas em Administração > Usuários: perfil \"Representada\", a empresa (representada) e o papel (administrador da representada, atendente, financeiro de garantia ou leitura).",
        "Antes de criar a primeira conta, cadastre a representada na aba \"Representadas\" e os modelos dela na aba \"Catálogo de modelos\" (código, nome, tipo de equipamento e garantia em meses). Sem modelo no catálogo, a representada não consegue cadastrar equipamento.",
        "Quem responde pela representação fica em Assistência técnica > Regras da assistência > Representação. Sem ninguém lá, os pedidos vão para quem faz a triagem."
      ],
      passos: [
        { titulo: "Tratar um pedido", itens: [
          "Abra a aba \"Pedidos\". Cada pedido mostra a representada, o cliente, o equipamento e o prazo de aceite (verde em dia, amarelo em risco, vermelho vencido, cinza pausado).",
          "Toque no pedido para ver o relato completo, o contato no local, as fotos, o vídeo e a conversa.",
          "Aceitar: escolha a prioridade (sem escolher, vale P2 para equipamento parado e P3 para os demais) e, se já souber, o tipo de serviço. O pedido vira chamado na Assistência técnica e segue a triagem de sempre. A representada recebe e-mail.",
          "Pedir complemento: escreva o que falta. O pedido volta para a representada e o prazo de aceite fica pausado até ela responder.",
          "Recusar: escreva o motivo (por exemplo, equipamento que não é da representada ou cliente fora da área de atendimento). A representada vê o motivo e recebe e-mail.",
          "Os mesmos botões aparecem em Assistência técnica > Solicitações dos clientes, com o selo da representada."
        ] },
        { titulo: "Conversar com a representada", itens: [
          "Na aba \"Conversas\" ficam as conversas por pedido, por chamado e o canal geral de cada representada. Escolha a representada para abrir o canal geral.",
          "Escreva e toque em \"Enviar\". A representada recebe e-mail com a mensagem.",
          "Marque \"Nota interna\" para registrar algo que a representada não pode ver. A nota aparece em amarelo, só para a equipe.",
          "Nada é apagado: correção vira mensagem nova."
        ] },
        { titulo: "Cadastrar a representada e os modelos", itens: [
          "Aba \"Representadas\": nome, CNPJ, contrato, vigência, contato e os prazos (aceite em minutos úteis, padrão 240 = 4 horas; alerta a 75% do prazo; chamado sem registro em 3 dias úteis). Marque se a consulta de CNPJ na base pública da Receita fica ligada e se a representada pode cancelar antes da visita.",
          "Representada inativa: as pessoas dela não abrem mais o módulo; nada é apagado.",
          "Aba \"Catálogo de modelos\": escolha a representada, preencha código, nome, tipo, família, garantia em meses e, se souber, o padrão do número de série. O mesmo código altera o modelo."
        ] },
        { titulo: "Acompanhar na Assistência técnica", itens: [
          "Em Assistência técnica > Chamados, o filtro \"Representação\" mostra só os chamados de representadas ou de uma delas, e cada chamado leva o selo roxo com o nome da representada.",
          "Na ficha do chamado, a parte \"Representação\" mostra o protocolo da representada, o enquadramento pretendido (garantia, fora de garantia, não sei), o relato, o contato no local e os arquivos.",
          "O que a equipe registra no histórico do chamado com público para o cliente aparece também para a representada. Registros internos não aparecem."
        ] }
      ],
      cores: [
        { nome: "Selo verde do prazo", significado: "Aceite em dia." },
        { nome: "Selo amarelo do prazo", significado: "Já passou de 75% do prazo de aceite: o responsável pela representação foi avisado." },
        { nome: "Selo vermelho do prazo", significado: "Prazo de aceite vencido: a gestão da área Técnica foi avisada e o item está na Caixa de decisões." },
        { nome: "Selo cinza \"pausado\"", significado: "A Metrolabs pediu complemento; o prazo só volta a contar quando a representada responder." },
        { nome: "Mensagem em amarelo tracejado", significado: "Nota interna: a representada não vê." }
      ],
      problemas: [
        { situacao: "Aparece \"o cadastro da representada e do catálogo é do Administrador, da Diretoria, dos gestores e dos responsáveis pela representação\"", oQueFazer: "Peça a um deles, ou peça ao Administrador para colocar você como responsável em Regras da assistência > Representação." },
        { situacao: "A representada diz que o modelo dela não aparece no cadastro de equipamento", oQueFazer: "Inclua o modelo em \"Catálogo de modelos\" (situação Ativo)." },
        { situacao: "Ao aceitar, aparece que o equipamento já tem chamado em aberto", oQueFazer: "Confira se é o mesmo problema. Se for outro, aceite mesmo assim; se for o mesmo, recuse com o motivo e indique o chamado aberto." },
        { situacao: "A pessoa da representada não consegue entrar", oQueFazer: "Confira em Administração > Usuários se a conta está ativa, com o perfil Representada, a representada e o papel; e se a representada está ativa na aba Representadas." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR", pode: "Tudo: pedidos, conversas, cadastro da representada e do catálogo, registro de ações." },
        { perfil: "TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO,RH", pode: "Tratar pedidos (aceitar, pedir complemento, recusar) e conversar. O cadastro da representada e do catálogo é dos responsáveis pela representação e da gestão." },
        { perfil: "CLIENTE", pode: "Não usa este módulo." },
        { perfil: "REPRESENTADA", pode: "Usa a visão da representada (aba \"Como usar\" dentro do módulo)." }
      ],
      perguntas: [
        { p: "A representada vê os outros clientes da Metrolabs?", r: "Não. Ela busca cliente só pelo CNPJ ou CPF completo e equipamento só pela série exata, sem lista e sem busca por nome. Ela vê só os pedidos e chamados da empresa dela." },
        { p: "A representada vê valores?", r: "Não nesta etapa. Custos e fechamento entram em etapas seguintes do projeto." },
        { p: "Onde fica o que a representada faz?", r: "Na aba \"Registro de ações\": buscas, cadastros, pedidos e cancelamentos, com nome, data e hora." }
      ]
    },
    "representacao/representada": {
      titulo: "Representação (empresa representada)",
      paraQueServe: "Área da sua empresa no SGO+ da Metrolabs: você pede atendimento técnico para os clientes finais dos equipamentos que a sua empresa representa e acompanha cada pedido até o encerramento, com a linha do tempo, os arquivos e a conversa com a Metrolabs.",
      antesDeComecar: [
        "O seu acesso é pessoal. Não compartilhe a senha. Tudo o que é feito aqui fica registrado com o seu nome, a data e a hora.",
        "Os dados do cliente devem vir do próprio cliente ou da nota fiscal, completos e corretos. Não use informação buscada na internet.",
        "Tenha em mãos o CNPJ (ou CPF) completo do cliente, o número de série do equipamento, o nome, o telefone e o e-mail do contato no local e as fotos do equipamento e da etiqueta.",
        "Fotos e vídeos não podem mostrar pacientes, prontuários ou documentos pessoais."
      ],
      passos: [
        { titulo: "Pedir um atendimento", itens: [
          "Toque em \"Novo pedido\".",
          "Cliente: digite o CNPJ ou o CPF completo e toque em \"Buscar\". Achou: escolha a unidade. Não achou: preencha o cadastro completo (o botão da base pública da Receita preenche razão social e endereço; o contato precisa vir do cliente) e marque \"Ciente\".",
          "Equipamento: digite o número de série como está na etiqueta e toque em \"Buscar\". Não achou: escolha o modelo, informe a série, a data da instalação, a nota fiscal de venda (se tiver), envie a foto da etiqueta e marque \"Ciente\". A garantia é calculada pelo modelo a partir da instalação ou da nota fiscal.",
          "Relato: setor, contato no local, sintoma (pelo menos 30 letras), quando começou, código de erro do visor (ou marque que não exibe), se o equipamento está parado, o risco de uso, o que já foi tentado e o enquadramento pretendido. Envie pelo menos 1 foto do equipamento e 1 da etiqueta; vídeo é opcional (até 50 MB).",
          "Toque em \"Enviar o pedido à Metrolabs\". A tela diz até quando a Metrolabs responde."
        ] },
        { titulo: "Acompanhar", itens: [
          "Em \"Chamados\" estão os seus pedidos e chamados com a etapa: Enviado, Complemento pedido, Recusado, Aceito em análise, Aguardando aprovação de orçamento, Aguardando peça, Visita a agendar ou agendada, Em atendimento, Concluído, Encerrado ou Cancelado.",
          "Toque no chamado para ver a linha do tempo, os arquivos e a conversa. Quando a visita é agendada, aparecem a data e o técnico.",
          "Complemento pedido: responda na própria ficha (pode mandar fotos). O pedido volta para a Metrolabs.",
          "Antes da visita, o pedido ou o chamado pode ser cancelado com o motivo (se o contrato permitir)."
        ] },
        { titulo: "Conversar com a Metrolabs", itens: [
          "Cada pedido e cada chamado tem a sua conversa. Assuntos fora de um chamado (dúvida, inclusão de pessoa da sua equipe) vão no \"Canal geral\".",
          "Fora do horário de trabalho da Metrolabs, a resposta vem no próximo horário útil.",
          "Você recebe por e-mail quando o pedido é aceito, quando a Metrolabs pede complemento ou recusa, e quando ela escreve na conversa."
        ] }
      ],
      cores: [
        { nome: "Etapa em azul", significado: "Em andamento com a Metrolabs." },
        { nome: "Etapa em amarelo", significado: "Depende da sua empresa (por exemplo, complemento pedido)." },
        { nome: "Etapa em verde", significado: "Concluído ou encerrado." },
        { nome: "Etapa em cinza", significado: "Recusado ou cancelado." }
      ],
      problemas: [
        { situacao: "Aparece que o CNPJ ou CPF não confere", oQueFazer: "Digite o número completo e confira os dígitos com o cliente ou na nota fiscal." },
        { situacao: "Aparece \"Muitas buscas seguidas\"", oQueFazer: "Espere o tempo indicado e busque de novo com o documento ou a série conferidos." },
        { situacao: "Aparece que a série já está cadastrada em outro cliente", oQueFazer: "Escreva no \"Canal geral\" para a Metrolabs conferir (equipamento vendido, transferido ou série digitada errada)." },
        { situacao: "O modelo do equipamento não aparece na lista", oQueFazer: "Peça à Metrolabs pelo \"Canal geral\" para incluir o modelo no catálogo." },
        { situacao: "Aparece que o seu papel não permite", oQueFazer: "Peça ao administrador da sua empresa ou à Metrolabs. O papel Leitura só consulta; o Financeiro de garantia consulta e conversa." },
        { situacao: "Aparece que a foto passa de 2 MB ou o vídeo passa de 50 MB", oQueFazer: "Tire a foto de novo pelo próprio botão (ela é reduzida no aparelho) ou grave um vídeo mais curto." }
      ],
      quemPode: [
        { perfil: "REPRESENTADA", pode: "Administrador da representada: tudo, mais ver a equipe e o registro de ações. Atendente: buscar, cadastrar, pedir atendimento, conversar e cancelar antes da visita. Financeiro de garantia: consultar e conversar. Leitura: só consultar." }
      ],
      perguntas: [
        { p: "Por que não há busca por nome do cliente?", r: "Para proteger os dados dos clientes atendidos pela Metrolabs. A busca é só pelo CNPJ ou CPF completo." },
        { p: "Como incluir ou tirar uma pessoa da minha equipe?", r: "Escreva no \"Canal geral\". A Metrolabs cria e inativa os acessos." },
        { p: "Onde vejo o relatório do atendimento?", r: "O relatório final no módulo vem numa próxima etapa. Enquanto isso, peça pela conversa do chamado." }
      ]
    }
  };
}
