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
        { titulo: "Acompanhar pelo Painel", itens: [
          "A aba \"Painel\" abre primeiro. Escolha a representada (ou todas) e o período dos índices (30, 90, 180 ou 365 dias). Os tempos são em horas úteis do expediente da Metrolabs.",
          "Índices: pedidos na fila e quantos com o aceite vencido; aceite no prazo (aceitos no período em até o prazo da representada, padrão 4 h úteis, descontada a espera do complemento) e o tempo médio; primeiro contato no prazo (do aceite ao primeiro registro da Metrolabs no chamado: triagem assumida ou iniciada, ou mensagem à representada; padrão 8 h úteis); prazo vencido agora e em risco; abertos e com quem estão; tempo médio até a visita e até a conclusão (contados do envio do pedido); reincidência (mesmo equipamento com outro chamado em até 90 dias).",
          "Kanban: um cartão por pedido ou chamado, na etapa que a representada vê. A borda é a cor do prazo. O cartão não se arrasta: o pedido abre aqui (aceitar, complemento, recusar) e o chamado abre na Assistência técnica, onde a etapa muda pelas regras do atendimento.",
          "Gantt: cada barra vai do envio do pedido até a conclusão (ou até hoje). Escolha a janela e agrupe por chamado, cliente, técnico ou representada. O tracejado é o fim do prazo; a parte vermelha, o tempo depois dele; o losango vazado é a visita agendada e o cheio, a chegada do técnico. A agenda de cada técnico com as O.S. fica em Atividades da equipe (botão \"Abrir a agenda única\").",
          "Indicadores: fila de pedidos com a idade em horas úteis, prazo de atendimento por prioridade (atendidos, no prazo, média até a visita, abertos e vencidos), carga por técnico, por representada, por etapa, por cliente, por UF, garantia e reincidência por modelo e por equipamento. Toque numa linha da fila para abrir o pedido.",
          "O painel não se atualiza sozinho: toque em \"Atualizar\" no alto da tela."
        ] },
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
        { titulo: "Relatórios A4 (atendimento e período)", itens: [
          "Relatório do atendimento: na ficha do chamado (Assistência técnica), parte \"Relatórios do atendimento\", toque em \"Gerar (Metrolabs, uso interno)\", \"Gerar a versão do cliente\" ou \"Gerar a versão da representada\". Cada versão mostra só o que o público dela pode ler.",
          "Versão interna: tudo da versão da representada mais as notas internas, os prazos e o SLA em horas úteis, o primeiro contato, o técnico, o deslocamento e o histórico do equipamento (reincidência). Não envie à representada nem ao cliente.",
          "Versão da representada: capa, sumário, resumo, cliente e equipamento com a garantia, relato da abertura, linha do tempo pública para ela, marcos previsto e realizado, visita, diagnóstico e serviço, peças, fotos liberadas, conversa do chamado (sem nota interna), arquivos e assinatura.",
          "Versão do cliente: as 5 etapas de \"Meus chamados\", a linha do tempo pública do cliente, visita, serviço, peças, fotos liberadas, recomendações e assinatura. Sem o nome da representada, sem a conversa com ela, sem prazos internos e sem valores; do técnico, só o nome.",
          "Fotos: a foto do técnico só entra na versão do cliente ou da representada depois de liberada na mesma parte da ficha (\"Quem vê nos relatórios\"). Ao liberar, a tela guarda uma cópia reduzida para o A4 não ficar pesado. Libera a gestão da área Técnica e os responsáveis pela representação.",
          "Relatório do período: no Painel, escolha a representada e o período e toque em \"Relatório do período\" (versão interna, ou a da representada escolhida). Traz os índices do painel com as mesmas fórmulas, os gráficos (por etapa, prazo cumprido, tempos médios, por cliente e UF, garantia, reincidência por modelo), o Gantt impresso, a lista e, na interna, a carga por técnico, a fila e a comparação entre representadas.",
          "Todo documento fica salvo em HTML e PDF e registrado com o público que pode abrir. A versão do cliente de um chamado também entra no Arquivo de documentos do equipamento. Cada emissão é uma versão nova; nenhuma é apagada. A aba \"Relatórios gerados\" do Painel e a ficha do chamado listam os documentos para abrir de novo."
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
        { nome: "Selo \"Nota interna\" na conversa", significado: "Nota interna: a representada não vê." },
        { nome: "Painel, borda azul ou barra azul", significado: "No prazo." },
        { nome: "Painel, amarelo", significado: "Prazo em risco (aceite a 75% do prazo; atendimento com 25% ou menos do prazo restante)." },
        { nome: "Painel, vermelho", significado: "Prazo vencido. Na barra do Gantt, a parte vermelha é o tempo depois do fim do prazo." },
        { nome: "Painel, cinza", significado: "Prazo pausado (complemento com a representada, ou peça e cliente quando o contrato permite) ou sem prazo." },
        { nome: "Painel, verde", significado: "Concluído no prazo. Marrom: concluído fora do prazo." }
      ],
      problemas: [
        { situacao: "Aparece \"o cadastro da representada e do catálogo é do Administrador, da Diretoria, dos gestores e dos responsáveis pela representação\"", oQueFazer: "Peça a um deles, ou peça ao Administrador para colocar você como responsável em Regras da assistência > Representação." },
        { situacao: "A representada diz que o modelo dela não aparece no cadastro de equipamento", oQueFazer: "Inclua o modelo em \"Catálogo de modelos\" (situação Ativo)." },
        { situacao: "Ao aceitar, aparece que o equipamento já tem chamado em aberto", oQueFazer: "Confira se é o mesmo problema. Se for outro, aceite mesmo assim; se for o mesmo, recuse com o motivo e indique o chamado aberto." },
        { situacao: "A foto não aparece no relatório do cliente ou da representada", oQueFazer: "Libere a foto na ficha do chamado (Relatórios do atendimento > Quem vê nos relatórios) e gere o relatório de novo. Foto grande que ficou de fora: libere de novo para a tela gerar a cópia reduzida." },
        { situacao: "Ao gerar a versão da representada do período, aparece \"escolha a representada\"", oQueFazer: "Escolha a representada no filtro \"Representada\" do Painel: a versão dela só traz a carteira dela." },
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
        { p: "Onde fica o que a representada faz?", r: "Na aba \"Registro de ações\": buscas, cadastros, pedidos e cancelamentos, com nome, data e hora." },
        { p: "Por que o técnico vê menos chamados no Painel?", r: "O Painel mostra só os chamados que a pessoa pode abrir na Assistência técnica: o técnico vê os dele e os da fila livre; a gestão vê todos. A fila de pedidos é a mesma para todos." },
        { p: "Quem abre cada relatório gerado?", r: "A versão interna, só a equipe da Metrolabs. A da representada, só as pessoas daquela representada (o servidor confere a cada abertura do arquivo). A do cliente, só o cliente daquele chamado, em \"Meus chamados\" e no Arquivo de documentos do equipamento." },
        { p: "O que a representada vê no painel dela?", r: "Os mesmos índices de aceite, visita e conclusão, o Kanban e o Gantt, só da empresa dela. Ela não vê primeiro contato, fila de outras representadas, carga por técnico, notas internas nem valores." }
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
        { titulo: "Acompanhar pelo Painel", itens: [
          "O \"Painel\" abre primeiro. No alto: pedidos e chamados abertos, aguardando a Metrolabs, aguardando a sua empresa, aguardando o cliente final, aceitos no prazo e os tempos médios até o aceite, até a visita e até a conclusão. Escolha o período (30, 90, 180 ou 365 dias).",
          "Os tempos são em horas úteis do expediente da Metrolabs e contam do envio do pedido; o tempo em que o pedido esperou o complemento da sua empresa não conta.",
          "Pendências da sua empresa aparecem em amarelo, no alto: toque em \"Responder agora\".",
          "Kanban: um cartão por pedido ou chamado, na etapa em que está; a borda é a cor do prazo. O cartão não se arrasta: a etapa muda pelo atendimento da Metrolabs. Os cartões \"Depende de você\" têm o botão para responder.",
          "Gantt: cada barra vai do envio até a conclusão (ou até hoje). Escolha a janela e veja por chamado ou por cliente. O tracejado é o fim do prazo; o losango vazado é a visita agendada e o cheio, a chegada do técnico.",
          "Indicadores: por etapa, por prioridade, por cliente, por UF, garantia (pelo cadastro do equipamento) e reincidência (mesmo equipamento com outro chamado em até 90 dias) por modelo e por equipamento.",
          "Na ficha do chamado, \"Marcos\" mostra o previsto e o realizado do aceite, da visita e da conclusão."
        ] },
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
        { titulo: "Relatórios do atendimento e do período", itens: [
          "Na ficha do chamado, parte \"Relatórios do atendimento\", toque em \"Gerar relatório\". O documento A4 abre numa aba nova e fica salvo em HTML e PDF.",
          "O relatório traz capa, sumário, resumo, cliente e equipamento com a garantia, o relato da abertura, a linha do tempo, os marcos previsto e realizado (aceite, visita e conclusão), a visita, o diagnóstico e o serviço, as peças, as fotos liberadas pela Metrolabs, a conversa do chamado, os arquivos e a assinatura de quem recebeu o atendimento.",
          "No Painel, \"Relatório do período\" gera o relatório da carteira da sua empresa no período escolhido: os índices do painel, os gráficos, o Gantt e a lista dos pedidos e chamados.",
          "A aba \"Relatórios gerados\" do Painel e a ficha do chamado listam os documentos já gerados para abrir de novo. Cada emissão é uma versão nova; nenhuma é apagada. Só as pessoas da sua empresa abrem esses documentos."
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
        { nome: "Etapa em cinza", significado: "Recusado ou cancelado." },
        { nome: "Painel: azul", significado: "No prazo." },
        { nome: "Painel: amarelo", significado: "Prazo em risco." },
        { nome: "Painel: vermelho", significado: "Prazo vencido." },
        { nome: "Painel: cinza", significado: "Prazo pausado (por exemplo, complemento pedido à sua empresa) ou sem prazo." },
        { nome: "Painel: verde", significado: "Concluído no prazo. Marrom: concluído fora do prazo." }
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
        { p: "Onde vejo o relatório do atendimento?", r: "O relatório final no módulo vem numa próxima etapa. Enquanto isso, peça pela conversa do chamado." },
        { p: "Por que o painel não muda sozinho?", r: "Para não atrapalhar quem está digitando. Toque em \"Atualizar\" no alto da tela." }
      ]
    }
  };
}
