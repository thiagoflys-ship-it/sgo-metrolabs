/**
 * Ajuda "Como usar esta tela" — grupo Conduta (frente C).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Texto puro, sem HTML.
 * Conferido contra a tela real (SGO_Conduta_ConteudoModulo.js e JS_Core.html, celular) em 17/10/2026.
 */
function SGO_ajudaTelas_Conduta_() {
  return {
    "conduta": {
      titulo: "Programa de conduta",
      paraQueServe: "Mede a conduta da equipe como um time. As ocorrências confirmadas tiram pontos do índice do mês. Se o mês fecha no verde, toda a equipe recebe o bônus. Aqui também ficam os reconhecimentos, as missões, as ausências, os fechamentos e os relatórios.",
      antesDeComecar: [
        "A tela tem as abas \"Farol do mês\", \"Ocorrências\", \"Reconhecimentos\", \"Missões\", \"Ausências\", \"Fechamentos\", \"Relatórios e extratos\" e \"Manuais e documentos\". A Diretoria e o Gestor de Qualidade também veem \"Sugestões\" e \"Qualidade e planos\". Por sigilo do colaborador (28/10/2026), quem é o envolvido numa ocorrência só eles sabem, além da própria pessoa e de quem registrou.",
        "A área de cada pessoa (Comercial, Técnica/Campo, Financeiro...) vem do cadastro do usuário, em Administração > Usuários. Quem está sem área aparece como \"Sem área definida\".",
        "No topo de cada aba há o link \"Manual do colaborador\" (ou \"Manual do gestor\", para a gestão). Ele abre o manual já na parte daquela aba.",
        "No celular a tela é mais simples: farol, \"Registrar ocorrência\", \"Reconhecer colega\", \"Registrar missão\", suas ocorrências e suas missões. A Diretoria e o Gestor de Qualidade têm também \"Sugestões de ocorrência\" e \"Kanban, planos de ação e indicadores\". O restante fica no computador.",
        "Gestão, neste programa, é Administrador, Gestor e Diretoria."
      ],
      passos: [
        { titulo: "Ver como está o mês", itens: [
          "Toque em \"Programa de conduta\" no menu.",
          "Na aba \"Farol do mês\", olhe a cor do farol e o \"Índice de conduta\".",
          "Ao lado do velocímetro, leia o selo do bônus (\"Bônus preservado\", \"Bônus em risco\"...).",
          "Veja a barra \"Margem até o amarelo\" (no amarelo, \"Margem até o vermelho\"): ela diz quantos pontos ainda cabem. A parte listrada são pontos em prazo de defesa.",
          "Se houver ocorrência em prazo de defesa, a linha \"Em prazo de defesa\" diz para onde o índice vai se ela ficar firme. No velocímetro, a marca tracejada mostra o mesmo ponto.",
          "O gráfico \"dia a dia\" só aparece quando o índice mudou no mês; sem mudança aparece \"Sem perda de pontos\". O gráfico dos meses fechados aparece a partir de 3 meses fechados. O tracejado é o limite do verde.",
          "Deixe a tela aberta: o farol se atualiza sozinho (\"Ao vivo\"). Quando o índice muda, o ponteiro anda e aparece um aviso no canto, por exemplo \"Índice atualizado: 98,5\". Não precisa recarregar a página."
        ] },
        { titulo: "Registrar uma ocorrência", itens: [
          "Abra a aba \"Ocorrências\".",
          "Toque em \"+ Registrar ocorrência\".",
          "Escolha o \"Colaborador envolvido\". Se ninguém sabe quem foi, escolha \"Não identificado\": conta no resultado da equipe, sem o nome de ninguém.",
          "Em \"Tipo\", busque pelo código ou pela descrição e escolha.",
          "Preencha a \"Data do fato\". O prazo é de até 2 dias úteis depois do fato.",
          "Em \"O que aconteceu\", escreva o fato: onde, quando e o que foi visto (pelo menos 10 caracteres). É o que a gestão lê para homologar.",
          "Se tiver, anexe a foto e escreva a legenda. Fotografe só o objeto e o local, nunca a pessoa: a foto não tem link e abre só para quem está na ocorrência, a Diretoria e o Gestor de Qualidade.",
          "Toque em \"Registrar\".",
          "A ocorrência vai para a homologação da gestão."
        ] },
        { titulo: "Reconhecer um colega", itens: [
          "Abra a aba \"Reconhecimentos\".",
          "Toque em \"+ Reconhecer pessoa, grupo ou departamento\".",
          "Escolha \"Uma pessoa\" ou \"Grupo ou departamento\".",
          "Escolha o colega (ou o grupo e as pessoas).",
          "Escolha o \"Motivo\".",
          "Escreva o que foi visto de melhoria.",
          "Preencha a data e toque em \"Reconhecer\"."
        ] },
        { titulo: "Registrar uma missão", itens: [
          "Abra a aba \"Missões\".",
          "Toque em \"+ Registrar missão\".",
          "Escolha o \"Destino\".",
          "Preencha a data e o \"1º executante\". Se houve um segundo, escolha em \"2º executante (opcional)\".",
          "Toque em \"Registrar\".",
          "A missão com incentivo vai para a aprovação da gestão. Você recebe o aviso da decisão."
        ] },
        { titulo: "Contestar uma ocorrência em seu nome", itens: [
          "Abra a aba \"Ocorrências\" (no celular, \"Minhas ocorrências recentes\").",
          "Na linha da ocorrência, toque em \"Contestar\". O prazo aparece ao lado.",
          "Escreva o motivo.",
          "Toque em \"Enviar contestação\" (no celular, \"Enviar\")."
        ] },
        { titulo: "Gerar o seu extrato do mês", itens: [
          "Abra a aba \"Relatórios e extratos\".",
          "No quadro \"Extrato do colaborador\", escolha a \"Competência\".",
          "Toque em \"Gerar extrato em A4\"."
        ] },
        { titulo: "Confirmar a leitura de um aviso", itens: [
          "Ao entrar, leia cada aviso do programa.",
          "Toque em \"Li e estou ciente\" em cada um.",
          "Ou role até o fim e toque em \"Li todos e estou ciente\"."
        ] }
      ],
      cores: [
        { nome: "Farol \"VERDE\" (índice 85 ou mais)", significado: "\"Bônus preservado\". Se o mês fechar assim, toda a equipe recebe o bônus." },
        { nome: "Farol \"AMARELO\" (70 a 84,9)", significado: "\"Bônus em risco\". Ainda dá tempo de voltar ao verde no mês." },
        { nome: "Farol \"VERMELHO\" (abaixo de 70)", significado: "\"Bônus perdido neste mês\". Os incentivos de missão continuam sendo pagos." },
        { nome: "\"GRAVÍSSIMA\" junto do farol", significado: "Uma ocorrência gravíssima confirmada cancela o bônus do mês, qualquer que seja o índice." },
        { nome: "Selo do bônus no farol (verde, amarelo ou vermelho)", significado: "Situação do bônus do mês: preservado, em risco, perdido ou cancelado. O selo cinza \"Período de teste\" indica que o bônus ainda não é pago." },
        { nome: "Marca e arco tracejados no velocímetro", significado: "Projeção: onde o índice vai parar se as ocorrências em prazo de defesa ficarem firmes. Ainda não conta." },
        { nome: "Parte listrada na barra de margem", significado: "Pontos de ocorrências em prazo de defesa. Se ficarem firmes, a margem diminui nesse tanto." },
        { nome: "\"Ao vivo\" com ponto verde piscando", significado: "O farol confere sozinho a cada 45 segundos se algo mudou. Com a aba do navegador escondida, a conferência para." },
        { nome: "Selo azul \"Registrada\"", significado: "Aguardando a homologação da gestão." },
        { nome: "Selo âmbar \"Homologada\"", significado: "A gestão aprovou. Está no prazo de contestação. Ainda não conta." },
        { nome: "Selo roxo \"Contestada\" ou \"Em recurso\"", significado: "A defesa está em julgamento pela gestão." },
        { nome: "Selo vermelho \"Firme\"", significado: "Confirmada. Já conta no índice da equipe." },
        { nome: "Selo cinza \"Anulada\", \"Descartada\" ou \"Rejeitada\"", significado: "Não conta." },
        { nome: "Missão âmbar \"Aguardando aprovação da gestão\"", significado: "Ainda não conta para o incentivo." },
        { nome: "Missão verde \"Aprovada\"", significado: "Conta para o incentivo do mês." },
        { nome: "Missão vermelha \"Recusada\"", significado: "Não conta. O motivo aparece ao lado." },
        { nome: "Missão cinza \"Aprovação legada\"", significado: "Missão antiga, de antes da regra de aprovação. Conta como aprovada." },
        { nome: "Missão cinza clara \"Sem incentivo (abaixo da distância mínima)\"", significado: "O destino tem menos de 200 km. Fica registrada, sem incentivo." },
        { nome: "Selo \"Requer sua ação\" no aviso", significado: "A ocorrência é sua. Leia e, se não concordar, conteste no prazo." }
      ],
      problemas: [
        { situacao: "\"Prazo de registro (2 dias úteis após o fato) já venceu para esta data.\"", oQueFazer: "A ocorrência não pode mais ser registrada. Fale com a gestão se for caso grave." },
        { situacao: "\"A data do fato não pode estar no futuro.\"", oQueFazer: "Corrija a data." },
        { situacao: "\"O mês de ... já foi fechado e congelado\"", oQueFazer: "Nada com data nesse mês pode ser lançado ou alterado. Fale com a gestão." },
        { situacao: "\"Prazo de contestação encerrado\"", oQueFazer: "O prazo passou. Se a ocorrência ficar firme, ainda cabe um recurso no prazo indicado em \"Recorrer\"." },
        { situacao: "\"Já existe missão lançada para este destino, nesta data, com este executante.\"", oQueFazer: "A missão já está registrada. Confira a lista." },
        { situacao: "\"Nenhum destino cadastrado para missões\" (celular)", oQueFazer: "Peça à gestão para cadastrar o destino no computador, em Missões." },
        { situacao: "\"Acesso restrito a Gestor/Administrador/Diretoria.\"", oQueFazer: "Esta ação é da gestão. Peça a ela." },
        { situacao: "\"Você pode gerar só o seu próprio extrato.\"", oQueFazer: "Por sigilo do colaborador, o extrato de outra pessoa fica com a Diretoria e o Gestor de Qualidade." },
        { situacao: "\"Não foi possível abrir a foto: por sigilo do colaborador...\"", oQueFazer: "A evidência abre só para quem está na ocorrência, a Diretoria e o Gestor de Qualidade. Se precisa ver, peça a eles." },
        { situacao: "Sou gestor e não vejo as ocorrências dos outros", oQueFazer: "É o sigilo do colaborador (decisão da direção, 28/10/2026): você vê as que registrou e as em seu nome. A decisão das demais fica com a Diretoria e o Gestor de Qualidade; o resultado da equipe está no farol." },
        { situacao: "\"Esta ação já está sendo processada.\"", oQueFazer: "Espere terminar. Não toque de novo." }
      ],
      quemPode: [
        { perfil: "TODOS", pode: "Ver o farol, registrar ocorrência, reconhecer colegas, registrar missão, contestar e recorrer das próprias ocorrências, gerar o próprio extrato, ver os fechamentos e os relatórios semanais e ler os manuais." },
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Tudo da equipe. Também, só a Diretoria e o Gestor de Qualidade (sigilo do colaborador): ver todas as ocorrências, homologar e julgar (nunca a ocorrência que registrou; a ocorrência em que é o envolvido só a Diretoria decide, com fundamentação), aprovar e recusar missões (nunca a própria), cadastrar destinos, registrar ausências, conferir e fechar o mês, gerar relatórios semanais e de missões e cuidar da automação de prazos. O extrato de outra pessoa e o relatório da equipe são só da Diretoria e do Gestor de Qualidade." },
        { perfil: "RH", pode: "Tudo da equipe. Também consulta missões, ausências, meses fechados (com os valores de cada pessoa) e relatórios semanais. Pelo sigilo do colaborador, não vê quem é o envolvido nas ocorrências dos outros, nem sugestões, Kanban, extratos de outras pessoas e o relatório da equipe. Não homologa, não julga, não decide missões, não registra ausências e não fecha o mês." },
        { perfil: "CLIENTE", pode: "Não usa o programa." }
      ],
      perguntas: [
        { p: "Outro módulo pode lançar ocorrência sozinho?", r: "Não. Frota, Auvo, Painel de qualidade, Minhas atividades, Avisos e o ponto do COMMAND só geram sugestões. A ocorrência só existe quando alguém da gestão aceita a sugestão, e depois segue o fluxo normal (homologação por outra pessoa, contestação, julgamento)." },
        { p: "Uma ocorrência registrada já tira ponto?", r: "Não. Só conta quando fica \"Firme\": depois de homologada e sem contestação no prazo, ou mantida no julgamento." },
        { p: "Como o índice é calculado?", r: "Índice = 100 menos (pontos de demérito divididos pelo número de pessoas) vezes 5. Quem está de férias ou afastado sai da conta." },
        { p: "Quanto vale cada nível?", r: "Leve 2 pontos, leve reincidente 5, média 8, média reincidente 15, grave 30. A gravíssima cancela o bônus do mês." },
        { p: "O incentivo de missão depende do farol?", r: "Não. A missão aprovada paga o incentivo mesmo com o farol vermelho. Só perde quem tem gravíssima própria no mês." },
        { p: "Quem vê as ocorrências?", r: "O envolvido, quem registrou, a Diretoria e o Gestor de Qualidade (sigilo do colaborador, 28/10/2026). O aviso para a equipe diz o que aconteceu, sem dizer quem foi. Os reconhecimentos são vistos por toda a equipe." }
      ]
    },

    "conduta/sugestoes": {
      titulo: "Sugestões de ocorrência (Diretoria e Gestor de Qualidade)",
      paraQueServe: "Junta numa fila o que os outros módulos encontraram e pode virar ocorrência: multa com condutor identificado, avaria na devolução, devolução ou retirada registrada pela gestão e KM a conferir (Frota); O.S. finalizada sem foto, sem relato ou sem check-out e O.S. aberta há dias (Auvo); cobrança do Painel de qualidade; três ou mais atividades atrasadas no mês (Minhas atividades); ciência de aviso vencida (Avisos); resumo do terceiro esquecimento de ponto (COMMAND, só informativo). Nada vira ocorrência sem a gestão aceitar.",
      antesDeComecar: [
        "A busca nos módulos é automática: todo dia às 6h e quando a aba é aberta (no máximo a cada 3 horas). O botão \"Buscar sugestões agora\" faz na hora.",
        "Cada sugestão aparece uma vez só. A aceita, a descartada e a que saiu da fila não voltam.",
        "Quando a origem se resolve sozinha (KM conferido, O.S. finalizada, ciência confirmada), a sugestão sai da fila como \"Saiu da fila\".",
        "O prazo de registro (2 dias úteis) conta da data em que o SGO+ encontrou o caso, porque multas e falhas de registro chegam depois do fato."
      ],
      passos: [
        { titulo: "Aceitar e registrar", itens: [
          "Abra a aba \"Sugestões\". O número ao lado do nome é quantas esperam decisão.",
          "Leia o cartão: pessoa, área, data do fato, de onde veio e o código sugerido.",
          "Para conferir a origem, toque em \"Abrir Frota\" (ou \"Abrir no Auvo\", \"Abrir Avisos\"...).",
          "Toque em \"Aceitar e registrar\". Confira o colaborador, o código, a data do fato e o texto de \"O que aconteceu\".",
          "Toque em \"Registrar ocorrência\". Você fica como fiscal: outra pessoa da gestão homologa na aba \"Ocorrências\"."
        ] },
        { titulo: "Descartar", itens: [
          "Toque em \"Descartar\".",
          "Escreva por que a sugestão não vira ocorrência (pelo menos 10 caracteres), por exemplo \"KM conferido, a foto do painel confirma\".",
          "Toque em \"Descartar\". O motivo fica guardado com o seu nome e a data."
        ] },
        { titulo: "Consultar o histórico", itens: [
          "No primeiro filtro, escolha \"Aceitas\", \"Descartadas\", \"Saiu da fila\" ou \"Todas\". No segundo, filtre pela área."
        ] }
      ],
      cores: [
        { nome: "Selo azul com o nome do módulo", significado: "De onde veio a sugestão." },
        { nome: "\"Informativa\"", significado: "Veio do ponto do COMMAND: é um resumo, não acusa nada. Registre só se houver falta de comunicação ou atraso recorrente." },
        { nome: "\"Sem código sugerido\"", significado: "O catálogo não tem um código próprio para o caso: escolha o código ao aceitar, ou descarte." }
      ],
      problemas: [
        { situacao: "\"A sugestão é sobre você\"", oQueFazer: "Quem é o envolvido não decide. Peça à Diretoria ou ao Gestor de Qualidade." },
        { situacao: "\"Prazo de registro ... já venceu\"", oQueFazer: "O caso foi encontrado há mais de 2 dias úteis. Descarte com o motivo \"fora do prazo\"." },
        { situacao: "\"O mês de ... já foi fechado\"", oQueFazer: "O fato é de um mês congelado. Descarte com o motivo; o fechamento não é refeito." },
        { situacao: "Aviso \"multa(s) com condutor sem login\" ou \"O.S. sem técnico ligado\"", oQueFazer: "Ligue o condutor a um usuário em Frota > Veículos e condutores > Condutores > Editar, ou vincule o técnico em Integração Auvo. A sugestão aparece na próxima busca." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Ver, buscar agora, aceitar e descartar (nunca a sugestão sobre si)." },
        { perfil: "RH", pode: "Não vê a aba (sigilo do colaborador, 28/10/2026). Quem decide é a Diretoria e o Gestor de Qualidade." },
        { perfil: "TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Não vê a aba. Sugestão não é acusação: a pessoa só fica sabendo quando a ocorrência é registrada e homologada." }
      ]
    },

    "conduta/qualidade": {
      titulo: "Qualidade e planos: Kanban, análise de causa, 5W2H/PDCA e indicadores",
      paraQueServe: "Acompanha cada ocorrência até o fim e trata as graves e as repetidas com análise de causa e plano de ação. As ações do plano viram atividades em Minhas atividades, com responsável e prazo; não existe outra lista de tarefas.",
      passos: [
        { titulo: "Ler o Kanban das ocorrências", itens: [
          "Abra a aba \"Qualidade e planos\" e escolha \"Kanban das ocorrências\".",
          "Colunas: \"Registrada\" (aguarda homologação), \"Em defesa\" (prazo de contestação, contestada ou em recurso), \"Homologada\" (firme), \"Plano de ação\" (com plano em andamento) e \"Concluída\" (plano concluído, ou firme sem necessidade de plano e com o prazo de recurso encerrado).",
          "O cartão anda sozinho conforme o fluxo do programa; não se arrasta.",
          "\"Plano recomendado\" marca ocorrência grave, gravíssima ou reincidente.",
          "Filtre pelo período e pela área. Marque \"Mostrar as encerradas sem efeito\" para ver rejeitadas, anuladas e descartadas."
        ] },
        { titulo: "Fazer a análise de causa (5 Porquês)", itens: [
          "No cartão, toque em \"Análise de causa\" (ou, em \"Indicadores por área\", no código recorrente).",
          "Escreva o problema: o que aconteceu, onde e quantas vezes.",
          "Responda o 1º por quê. A resposta vira a pergunta seguinte. Responda pelo menos 3.",
          "Escreva a causa raiz: a causa que a empresa controla (processo, treinamento, ferramenta).",
          "Se quiser, abra \"Ishikawa (6M)\" e anote as causas por método, mão de obra, material, máquina, medida e meio ambiente.",
          "Toque em \"Salvar a análise\"."
        ] },
        { titulo: "Criar o plano de ação 5W2H", itens: [
          "No cartão firme, toque em \"Criar plano 5W2H\" (ou \"+ Novo plano de ação\" na aba dos planos).",
          "Ligue a análise de causa, se houver.",
          "Preencha O quê, Por quê, Onde, Quando, Quem, Como e Quanto. Onde e Quanto podem ficar vazios.",
          "Toque em \"Criar o plano\". A ação vira uma atividade para o responsável em Minhas atividades e aparece em \"Atividades do módulo\"."
        ] },
        { titulo: "Levar o plano pelo ciclo PDCA", itens: [
          "Planejar (P): análise e 5W2H. Executar (D): as ações em Minhas atividades. Para mais ações, toque em \"+ Ação\".",
          "Quando todas as ações estiverem concluídas ou canceladas em Minhas atividades, toque em \"Passar para Verificar\".",
          "Verificar (C): confira se o problema voltou (por exemplo, nenhuma ocorrência do mesmo código em 30 dias), toque em \"Registrar a verificação\" e escreva o que conferiu.",
          "Toque em \"Foi eficaz\" para ir a Agir, ou em \"Não foi eficaz (novo ciclo)\": o plano volta a Planejar no ciclo seguinte.",
          "Agir (A): toque em \"Concluir (padronizar)\" e escreva o que virou padrão (procedimento, treinamento, checklist).",
          "Se o plano não fizer mais sentido, toque em \"Cancelar plano\" e escreva o motivo. Nada é apagado."
        ] },
        { titulo: "Ler os indicadores por área", itens: [
          "Escolha \"Indicadores por área\" e o período.",
          "Reincidência: das firmes, quantas repetem o código da mesma pessoa. Tempo de homologação: dias úteis do registro à homologação. Homologadas no prazo. Descartadas por prazo (ninguém homologou a tempo). Planos concluídos, atrasados e eficácia. Sugestões pendentes.",
          "Em \"Códigos recorrentes\" (3 ou mais firmes no período), toque em \"Análise de causa\" ou \"Criar plano\".",
          "Se aparecer pessoa sem área, toque em \"Abrir Usuários\" e use o botão \"Áreas\"."
        ] }
      ],
      problemas: [
        { situacao: "\"Ainda há ação(ões) em aberto\"", oQueFazer: "Conclua ou cancele as atividades listadas em Minhas atividades e toque em \"Passar para Verificar\" de novo." },
        { situacao: "\"Esta ocorrência já tem o plano ... em andamento\"", oQueFazer: "Abra o plano existente na aba dos planos e acrescente a ação com \"+ Ação\"." },
        { situacao: "\"Responda pelo menos 3 porquês\"", oQueFazer: "Preencha o 1º, o 2º e o 3º por quê antes de salvar." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Ver tudo, fazer análises, criar e conduzir os planos." },
        { perfil: "RH", pode: "Não vê a aba (sigilo do colaborador, 28/10/2026): Kanban, planos, análises e indicadores são da Diretoria e do Gestor de Qualidade." },
        { perfil: "TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Não vê a aba. Quem é responsável por uma ação a recebe em Minhas atividades." }
      ]
    },

    "conduta/ocorrencias": {
      titulo: "Ocorrências: homologar, julgar e prazos (gestão)",
      paraQueServe: "A gestão confirma ou rejeita cada ocorrência e julga as defesas. Os prazos correm sozinhos quando a automação está ligada.",
      passos: [
        { titulo: "Homologar uma ocorrência", itens: [
          "Na linha com selo \"Registrada\", toque em \"Homologar\".",
          "Leia o resumo e toque em \"Ver a foto\", se houver: ela abre por cima da janela, com \"Baixar\" e \"Fechar\". \"Não identificado\" no envolvido quer dizer que quem registrou não sabia quem foi.",
          "Para confirmar, toque em \"Aprovar\".",
          "Para rejeitar, escreva a fundamentação e toque em \"Rejeitar\". Sem fundamentação, a rejeição não é aceita."
        ] },
        { titulo: "Julgar uma contestação ou recurso", itens: [
          "Na linha com selo \"Contestada\" ou \"Em recurso\", toque em \"Julgar\".",
          "Leia a defesa do colaborador.",
          "Escreva a fundamentação.",
          "Toque em \"Anular\" ou em \"Manter (firme)\"."
        ] },
        { titulo: "Diretoria: decidir ocorrência em que é a envolvida", itens: [
          "Vale para o perfil Diretoria e para o responsável pelo sistema. Gestor e Administrador pedem a outra pessoa da gestão.",
          "Toque em \"Homologar\" ou \"Julgar\", como em qualquer ocorrência.",
          "Escreva a fundamentação no campo de texto da janela (pelo menos 15 caracteres), também para aprovar.",
          "Toque na decisão. Fica gravado \"Decisão da Diretoria sobre ocorrência em que é envolvida\" no histórico da ocorrência, na auditoria e no extrato, e a lista mostra o selo \"Decisão da Diretoria\"."
        ] },
        { titulo: "Conferir a automação de prazos", itens: [
          "Leia o quadro \"Automação de prazos\".",
          "Deve estar \"LIGADA\". Se estiver desligada, toque em \"Ligar agora\".",
          "Para aplicar os prazos vencidos na hora, toque em \"Processar prazos vencidos agora\" e confirme. Não há como desfazer."
        ] }
      ],
      cores: [
        { nome: "\"Você registrou — outro gestor homologa\"", significado: "Quem registrou não decide. Peça a outra pessoa da gestão." }
      ],
      problemas: [
        { situacao: "\"Você é o fiscal que registrou esta ocorrência\" ou \"Você é o colaborador envolvido\"", oQueFazer: "Peça à Diretoria ou ao Gestor de Qualidade para decidir. A Diretoria decide a ocorrência em que é envolvida, mas nunca a que ela mesma registrou." },
        { situacao: "\"Não foi possível homologar (ou julgar): por sigilo do colaborador...\"", oQueFazer: "Quem decide as ocorrências é a Diretoria e o Gestor de Qualidade. Se você soube de um caso, registre a ocorrência; a decisão fica com eles." },
        { situacao: "\"Você é a pessoa envolvida nesta ocorrência e decide como Diretoria: escreva a fundamentação\"", oQueFazer: "Escreva a fundamentação no campo de texto da janela, com pelo menos 15 caracteres, e toque de novo na decisão." },
        { situacao: "Automação \"DESLIGADA\"", oQueFazer: "Nenhuma ocorrência fica firme sozinha e o mês não é contado. Toque em \"Ligar agora\"." }
      ],
      perguntas: [
        { p: "Quais são os prazos?", r: "Registro: 2 dias úteis após o fato. Homologação: 3 dias úteis (sem decisão, é descartada). Contestação: 3 dias úteis (sem contestação, fica firme). Julgamento: 5 dias úteis. Recurso: 2 dias úteis após manter, uma vez só." }
      ],
      quemPode: [
        { perfil: "RH", pode: "Ver as ocorrências que registrou e as em seu nome, e registrar ocorrência como qualquer colaborador (sigilo do colaborador, 28/10/2026). Não homologa, não julga e não processa prazos." },
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Homologar, julgar, processar prazos e ligar ou desligar a automação." },
        { perfil: "DIRETORIA", pode: "Também homologar e julgar a ocorrência em que é a envolvida, com fundamentação obrigatória. Vale também para o responsável pelo sistema." }
      ]
    },

    "conduta/missoes": {
      titulo: "Missões: aprovar, recusar e destinos (gestão)",
      paraQueServe: "A missão lançada pelo próprio colaborador só conta depois da aprovação da gestão. Missão pendente trava o fechamento do mês.",
      passos: [
        { titulo: "Aprovar ou recusar uma missão", itens: [
          "Abra a aba \"Missões\".",
          "Na linha \"Aguardando aprovação da gestão\", toque em \"Aprovar\" e confirme.",
          "Para recusar, toque em \"Recusar\", escreva o motivo e toque em \"Recusar missão\".",
          "Quem lançou recebe o aviso da decisão."
        ] },
        { titulo: "Diretoria: decidir a própria missão", itens: [
          "Vale para o perfil Diretoria e para o responsável pelo sistema. Gestor e Administrador pedem a outra pessoa da gestão.",
          "Na linha da missão em que você é executante, toque em \"Aprovar\" ou \"Recusar\".",
          "Escreva a fundamentação (pelo menos 15 caracteres) e confirme. No celular, o texto é pedido numa caixa.",
          "Fica gravado \"Decisão da Diretoria sobre missão em que é envolvida\" e a linha mostra o selo \"Decisão da Diretoria\"."
        ] },
        { titulo: "Cadastrar um destino", itens: [
          "Toque em \"+ Cadastrar cidade/destino\".",
          "Se o destino é um cliente, digite o CNPJ e toque em \"Buscar CNPJ\".",
          "Confira a \"Cidade/UF\" e preencha a \"Distância do trecho em km\".",
          "Toque em \"Salvar destino\"."
        ] }
      ],
      problemas: [
        { situacao: "\"Você é executante desta missão e não pode decidir sobre ela.\"", oQueFazer: "Peça a outra pessoa da gestão. A Diretoria decide a própria missão, com fundamentação." },
        { situacao: "\"Para recusar, escreva o motivo (pelo menos 8 caracteres).\"", oQueFazer: "Escreva um motivo mais completo." }
      ],
      quemPode: [
        { perfil: "RH", pode: "Ver as missões de todas as pessoas e registrar as próprias. Não aprova, não recusa e não remove." },
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Aprovar, recusar, remover missões e cadastrar destinos." }
      ]
    },

    "conduta/ausencias": {
      titulo: "Ausências",
      paraQueServe: "Registra férias e afastamentos. Quem está ausente sai da conta do índice do mês, mas continua recebendo o bônus.",
      passos: [
        { titulo: "Registrar uma ausência", itens: [
          "Abra a aba \"Ausências\".",
          "Toque em \"+ Registrar ausência\".",
          "Escolha o colaborador e o tipo: \"Férias\" ou \"Afastamento\".",
          "Preencha a data de início e a data de fim.",
          "Toque em \"Registrar\"."
        ] }
      ],
      problemas: [
        { situacao: "\"Data de fim não pode ser anterior à data de início.\"", oQueFazer: "Corrija as datas." },
        { situacao: "\"Acesso restrito a Gestor/Administrador/Diretoria.\"", oQueFazer: "Só a gestão registra ausência. Avise a gestão das suas férias." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Registrar e remover ausências." },
        { perfil: "RH", pode: "Ver as ausências de todas as pessoas. Não registra nem remove." },
        { perfil: "TODOS", pode: "Ver as próprias ausências." }
      ]
    },

    "conduta/fechamentos": {
      titulo: "Fechamentos do mês",
      paraQueServe: "Congela o resultado do mês. O fechamento acontece sozinho depois do prazo, se não houver defesa nem missão pendente. A gestão pode conferir a prévia e fechar antes.",
      passos: [
        { titulo: "Conferir a prévia", itens: [
          "Abra a aba \"Fechamentos\".",
          "Em \"Competência para conferência\", confira o mês.",
          "Toque em \"Consultar prévia\".",
          "Confira as defesas pendentes, as missões aguardando aprovação e os valores por pessoa.",
          "Se quiser, toque em \"Imprimir prévia\". A prévia abre em A4 numa aba nova e uma cópia (PDF e HTML) fica na pasta do programa, em \"Prévias\". Ela não autoriza pagamento."
        ] },
        { titulo: "Fechar o mês", itens: [
          "Resolva as defesas e as missões pendentes.",
          "Consulte a prévia de novo.",
          "Toque em \"Fechar competência conferida\" e confirme.",
          "O resultado fica congelado e o relatório do mês é gerado."
        ] },
        { titulo: "Ver o relatório de um mês fechado", itens: [
          "Na lista de fechamentos, toque em \"Ver relatório\". O relatório abre em A4 numa aba nova.",
          "No topo: o velocímetro do índice (o mesmo do farol), a situação do bônus, os pontos de demérito com a margem e os números do mês. Depois: a interpretação, a composição do demérito por grupo e código, a evolução dos meses fechados (a partir de três), reconhecimentos, missões, contestações e as assinaturas.",
          "Se a cópia gravada do mês estiver no modelo anterior do relatório, a versão atual é gerada na hora com os números do fechamento congelado (nada é recalculado) e sai como nova revisão. A faixa no topo da aba avisa e traz o link \"Abrir a cópia original\".",
          "A cópia gravada no dia do fechamento nunca é apagada: ela abre pelo link \"Abrir a cópia original\" da faixa.",
          "Se o relatório não existir, a gestão toca em \"Gerar de novo\"."
        ] },
        { titulo: "Gerar o relatório de novo (gestão)", itens: [
          "Toque em \"Gerar de novo\" na linha do mês. A aba abre na hora com \"Gerando...\" e mostra o relatório quando ficar pronto.",
          "O número do documento é o do mês (por exemplo, CND-202609) e a revisão sobe a cada geração (01, 02...). Os números são sempre os do fechamento congelado."
        ] }
      ],
      problemas: [
        { situacao: "\"Fechamento bloqueado: ... missão aguarda aprovação\"", oQueFazer: "Abra a aba \"Missões\", aprove ou recuse cada uma e feche de novo." },
        { situacao: "\"Fechamento bloqueado: ... ocorrência(s) com decisão ou prazo de defesa pendente\"", oQueFazer: "Aguarde os prazos ou julgue as defesas. Depois feche." },
        { situacao: "\"Aguarde o término do mês para congelar a competência.\"", oQueFazer: "O mês ainda não acabou." },
        { situacao: "No farol aparece \"Aplicar agora: fechamentos pendentes e ajustes do programa\"", oQueFazer: "Há rotina atrasada. Toque no botão, leia o que será fechado e confirme." },
        { situacao: "\"Ver relatório\" mostra a faixa \"A cópia gravada deste mês estava no modelo anterior\"", oQueFazer: "Nada a fazer: é a versão atual do mesmo fechamento. Para conferir a cópia do dia do fechamento, toque em \"Abrir a cópia original\" na faixa." },
        { situacao: "A aba do relatório não abriu", oQueFazer: "O navegador bloqueou a janela. Permita janelas do SGO+ no navegador e toque no botão de novo; se ele baixar o arquivo, abra o arquivo baixado." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Consultar a prévia, fechar e gerar o relatório de novo." },
        { perfil: "RH", pode: "Ver os meses fechados com os valores de cada pessoa (bônus, incentivo e missões, sem o placar de ocorrências) e abrir o relatório. Não consulta a prévia e não fecha o mês." },
        { perfil: "TODOS", pode: "Ver a lista de meses fechados e o relatório." }
      ]
    },

    "conduta/relatorios_e_extratos": {
      titulo: "Relatórios e extratos",
      paraQueServe: "Gera o extrato de cada pessoa, o relatório da equipe com todos os colaboradores, o relatório semanal e a prestação de contas das missões, todos em A4.",
      passos: [
        { titulo: "Gerar o relatório da equipe (Diretoria e Gestor de Qualidade)", itens: [
          "Em \"Relatório da equipe\", escolha o mês em \"De\" e em \"Até\" (o mesmo mês, ou um intervalo de até 12 meses).",
          "Toque em \"Gerar relatório da equipe\". O relatório abre em A4 deitado numa aba nova.",
          "Traz uma linha por colaborador (área, ocorrências firmes e em andamento, pontos, reconhecimentos, missões elegíveis, incentivo, ciência dos avisos e situação do bônus) e os totais por área. O gráfico por área só aparece com quatro ou mais áreas com pontos.",
          "Quem está sem área no cadastro aparece como \"Área não informada\", nunca fica de fora. Para corrigir, a gestão informa a área no cadastro da pessoa, em Administração > Usuários, e gera o relatório de novo.",
          "O documento tem as ocorrências de cada pessoa: por sigilo do colaborador, é da Diretoria e do Gestor de Qualidade e não deve ser publicado nem passado adiante."
        ] },
        { titulo: "Gerar o relatório semanal (gestão)", itens: [
          "Em \"Relatório semanal para toda a equipe\", escolha \"Semana terminando em\".",
          "Toque em \"Gerar os 7 dias em A4\".",
          "Para gerar sozinho todo domingo às 18h, toque em \"Ativar geração todo domingo\"."
        ] },
        { titulo: "Gerar a prestação de contas das missões (gestão)", itens: [
          "Em \"Prestação de contas das missões\", escolha a competência.",
          "Toque em \"Gerar missões em A4\"."
        ] },
        { titulo: "Abrir um relatório já publicado", itens: [
          "Na lista de relatórios, toque em \"Abrir\"."
        ] },
        { titulo: "Onde ficam as cópias", itens: [
          "Cada extrato e cada relatório gerado fica guardado em PDF e HTML na pasta \"Programa de conduta - Relatórios\": \"Fechamentos mensais\", \"Relatórios semanais\", \"Missões\", \"Extratos\" (uma subpasta por pessoa), \"Relatórios da equipe\" e \"Prévias\".",
          "Relatório com mais de três páginas traz o sumário com o número das páginas."
        ] }
      ],
      problemas: [
        { situacao: "\"O navegador bloqueou a janela.\"", oQueFazer: "O relatório foi baixado. Abra o arquivo baixado." },
        { situacao: "\"A competência escolhida ainda não começou.\"", oQueFazer: "Escolha o mês atual ou um anterior." },
        { situacao: "\"O período do relatório da equipe vai até 12 meses.\"", oQueFazer: "Escolha em \"De\" e \"Até\" um intervalo de no máximo 12 meses." },
        { situacao: "No relatório da equipe aparece \"Área não informada\"", oQueFazer: "A pessoa está sem área no cadastro. A gestão informa a área em Administração > Usuários e gera o relatório de novo." }
      ],
      quemPode: [
        { perfil: "TODOS", pode: "Gerar o próprio extrato e abrir os relatórios semanais." },
        { perfil: "RH", pode: "Gerar o próprio extrato e abrir os relatórios semanais e de missões. O extrato de outra pessoa e o relatório da equipe são da Diretoria e do Gestor de Qualidade (sigilo do colaborador)." },
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Gerar o relatório semanal e o de missões. O extrato de qualquer pessoa e o relatório da equipe: só a Diretoria e o Gestor de Qualidade." }
      ]
    },

    "conduta/ciencia": {
      titulo: "Avisos com ciência",
      paraQueServe: "Os avisos do programa (ocorrência homologada e resultado do mês) aparecem ao entrar no SGO+. O sistema guarda quando cada pessoa viu e confirmou.",
      passos: [
        { titulo: "Ver quem confirmou (gestão)", itens: [
          "Na aba \"Farol do mês\", toque em \"Ver quem confirmou a leitura dos avisos\".",
          "Leia a situação de cada pessoa."
        ] }
      ],
      cores: [
        { nome: "Verde \"Confirmou\"", significado: "A pessoa leu e confirmou." },
        { nome: "Amarelo \"Viu e não confirmou\"", significado: "O aviso apareceu, mas a pessoa fechou sem confirmar." },
        { nome: "Vermelho \"Ainda não viu\"", significado: "A pessoa ainda não entrou depois do aviso." }
      ],
      quemPode: [
        { perfil: "TODOS", pode: "Confirmar os próprios avisos." },
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Ver quem confirmou." }
      ]
    }
  };
}
