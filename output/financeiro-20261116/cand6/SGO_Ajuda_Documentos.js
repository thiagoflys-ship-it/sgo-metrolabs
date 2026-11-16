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
          "Opcional: no quadro \"Buscar no cadastro\", acima de \"1. Cliente\", busque o cliente (nome ou CNPJ), escolha a unidade e o equipamento. Cliente, CNPJ, endereço, TAG, modelo e localização (unidade e setor) entram nos campos vazios; o que você digitou não muda. Desde 22/10/2026 o fabricante (marca) também vem do cadastro, e o nº de série do cadastro sai no documento. No quadro \"Padrões de referência utilizados (opcional)\", logo abaixo, toque em \"Escolher padrões\" e marque todos os padrões usados no serviço (sem limite): o documento traz uma tabela com cada um, e padrão vencido na data do serviço impede a geração, com a explicação.", "Em \"1. Cliente\", digite o CNPJ e toque em \"Buscar CNPJ\".",
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
          "O documento abre em nova aba e é salvo sozinho na pasta do cliente. No celular, o documento abre dentro do SGO+, com Voltar e Imprimir. Espere a mensagem \"Salvo na pasta do cliente\"."
        ] },
        { titulo: "Reabrir uma declaração já gerada", itens: [
          "Em \"Documentos já gerados\", digite o cliente, a TAG ou o nome do arquivo.",
          "Toque em \"Buscar\".",
          "Abra o documento na lista."
        ] },
        { titulo: "Corrigir um documento já gerado (nova revisão)", itens: [
          "No fim da tela, em \"Documentos gerados: corrigir ou usar como base\", busque pelo número, cliente ou TAG.",
          "Na linha do documento, toque em \"Abrir para corrigir\". O formulário volta preenchido com tudo o que foi usado (dados digitados, textos, anexos e leituras), sem importar nada de novo.",
          "No quadro amarelo \"Correção do documento\", no alto do formulário, escreva o motivo da revisão (ao menos 10 caracteres).",
          "Altere só o que precisa e toque em \"Confirmar e Gerar Documento\". Sai a revisão seguinte (Rev. 01, 02...) com o mesmo número; o motivo, a data e o seu nome entram no histórico de revisões do documento.",
          "A revisão anterior continua guardada na pasta do cliente, com a revisão no nome do arquivo, e passa a constar como \"Substituído pela Rev. NN\" na lista.",
          "Para desistir, toque em \"Cancelar a correção e limpar o formulário\"."
        ] },
        { titulo: "Usar um documento como base para um novo", itens: [
          "Na mesma lista, toque em \"Usar como base\" (por exemplo, o mesmo equipamento no ano seguinte).",
          "O formulário volta preenchido. Confira datas, leituras e resultados, que são do serviço anterior.",
          "Toque em \"Confirmar e Gerar Documento\": sai um documento novo, com número novo. O documento de origem não muda."
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
        { situacao: "A nova aba não abriu.", oQueFazer: "Libere janelas novas (pop-up) para o endereço do SGO+ e toque de novo em \"Confirmar e Gerar Documento\". No celular, o documento abre dentro do SGO+, sem aba nova." },
        { situacao: "Apareceu \"Tentar salvar de novo\".", oQueFazer: "Toque no botão. Se falhar de novo, confira a internet e avise o administrador." },
        { situacao: "A busca de CNPJ não preencheu nada.", oQueFazer: "Digite a razão social e o endereço à mão e continue." },
        { situacao: "Ao gerar a correção apareceu \"Escreva o motivo da revisão\".", oQueFazer: "Escreva o motivo no quadro amarelo \"Correção do documento\", no alto do formulário (ao menos 10 caracteres), e toque de novo em \"Confirmar e Gerar Documento\"." },
        { situacao: "Apareceu \"O número ... já é de um documento gerado\".", oQueFazer: "Para corrigir aquele documento, use \"Abrir para corrigir\" na lista de documentos gerados. Para um documento novo, apague o número ou use outro." },
        { situacao: "O documento não aparece na lista para corrigir.", oQueFazer: "Documentos gerados antes de 21/10/2026 não guardaram os dados do formulário e não entram nessa lista. O PDF continua na pasta do cliente. Para corrigir um deles, preencha o formulário e gere um documento novo." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Gerar e consultar declarações." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela." }
      ],
      perguntas: [
        { p: "A declaração diz se o equipamento foi aprovado?", r: "Não. Ela registra a execução do serviço. Resultado de aprovação fica nos relatórios técnicos, como QI/QO/QD, qualificação térmica ou calibração." },
        { p: "Como a declaração é organizada?", r: "Em seções numeradas: identificação, introdução, metodologia, calibrações realizadas (com a Tabela 1 dos itens, quantidades e observações), referências normativas e, no fim, a declaração com a data de emissão e as assinaturas na mesma página. As normas aparecem uma vez só." },
        { p: "Onde a declaração fica salva?", r: "Na pasta do cliente, numa subpasta com o CNPJ (14 dígitos), com o nome \"Declaracao de execucao - número - TAG - data e hora\", em PDF e em HTML. As declarações antigas, na pasta com o nome do cliente, continuam aparecendo em \"Documentos já gerados\"." }
      ]
    },

    // ================================================================
    "pgt_pop": {
      titulo: "PGT e POP",
      paraQueServe: "Gera o PGT (Plano de Gerenciamento de Tecnologias em Saúde, só de equipamentos de saúde) e os POPs (Procedimentos Operacionais Padrão) de cada cliente, com texto redigido pela IA a partir da ficha técnica de cada documento, revisada por especialista em engenharia clínica. Cada documento tem código e revisão.",
      antesDeComecar: [
        "PGT é o plano geral de como o cliente gerencia os equipamentos de saúde. POP é o passo a passo de uma tarefa específica.",
        "Tenha o CNPJ do cliente, o porte, o número de leitos e o responsável técnico do cliente.",
        "Tenha nome e cargo de quem aprova pelo cliente e de quem elaborou. Os dois cargos são obrigatórios e começam vazios; o registro profissional de quem elaborou é recomendado.",
        "Tenha as respostas do cliente às perguntas das fichas (14/11/2026): modelo da engenharia clínica e responsável pelo plano, setores existentes, natureza jurídica, onde registra, estruturas (NSP, gerência de risco, SESMT, CCIH, comissão de padronização), situação de implantação de cada etapa e recursos (gerador, cilindros, central de gases, CME, radiologia, Rede Sentinela, área própria de guarda). Sem uma resposta obrigatória, o documento não é gerado. Nunca invente uma resposta: pergunte ao cliente.",
        "Cada documento segue a ficha técnica dele: seções na ordem, conteúdo mínimo, passos, responsabilidades, registros, indicadores e a lista fechada de normas vigentes que pode citar. A IA usa como fatos do cliente só as respostas da tela; o que não foi respondido sai como \"a definir pelo estabelecimento\".",
        "O sistema monta, sem a IA, as Referências normativas de cada documento e, no PGT, o glossário fixo (Termos e definições) e os Documentos relacionados.",
        "Cada documento é redigido pela IA como por um especialista sênior no assunto dele (o tema do POP; no PGT, o tema de cada parte), sem inventar dado do cliente nem citar norma fora da lista da ficha. O especialista orienta a redação, mas não aparece no documento.",
        "O título de cada POP é o nome do catálogo (no avulso, o nome digitado): a IA redige o conteúdo, não o título. Os nomes foram revistos em 14/11/2026; os códigos não mudaram e a busca acha os documentos antigos pelo título gravado.",
        "Depois da IA, o sistema retira do texto o que não pode sair no documento (rótulos do pedido, menções à forma de elaboração, seções de revisão escritas pela IA, seções que o sistema monta) e aponta os pontos para conferir: item da ficha que faltou no texto, norma fora da lista do documento, prazo ou meta que o cliente não informou, setor que o cliente não tem, pendência de dado opcional ou campo que ficou para preencher.",
        "A geração depende da IA. Sem a IA, o PGT e os POPs sem roteiro não são gerados; o POP com roteiro sai com texto padrão."
      ],
      passos: [
        { titulo: "Como a tela é organizada", itens: [
          "No alto fica o \"Guia do PGT e POP\": toque para ver o que é cada documento, as 5 etapas, quanto demora, onde fica salvo e os erros comuns.",
          "A trilha mostra as 5 etapas (\"1. Cliente e assinaturas\", \"2. PGT\", \"3. POPs\", \"4. Conferir e gerar\", \"5. Documentos\") com o resumo de cada uma. Toque numa etapa para ir até ela. Voltar é sempre livre; para passar da etapa 1, os campos obrigatórios precisam estar preenchidos.",
          "Cada campo tem uma legenda curta à vista e o \"Como preencher\" (toque no i): o que é, de onde vem, um exemplo e o cuidado que pede.",
          "No computador, o quadro \"Esta rodada\", à direita, resume o cliente, as assinaturas e os documentos que vão ser gerados."
        ] },
        { titulo: "Gerar o PGT e os POPs", itens: [
          "Toque em \"PGT e POP\" no menu.",
          "Na etapa \"1. Cliente e assinaturas\", digite o CNPJ e toque em \"Buscar no cadastro público\". A razão social e o endereço são preenchidos e ficam com fundo amarelo claro até você conferir.",
          "Preencha porte, leitos e quem aprova pelo cliente: nome e cargo do responsável técnico do cliente, os dois obrigatórios.",
          "Preencha nome e cargo de quem elaborou (obrigatórios; o cargo começa vazio, sem cargo padrão) e o registro profissional (recomendado). Os 3 campos são da mesma pessoa.",
          "Responda a caixa \"1.5 Dados do estabelecimento\" (três grupos recolhíveis, cada um com o contador do que falta) e a caixa \"1.6 Recursos do estabelecimento\" (sim ou não). Valem para todos os documentos da rodada.",
          "Toque em \"Avançar para o PGT\". Se faltar algum campo obrigatório da assinatura ou do cliente, ele fica em vermelho e a faixa acima do botão diz o que falta. As perguntas das caixas 1.5 e 1.6 não impedem de avançar: a etapa 4 mostra o que falta antes de gerar.",
          "Na etapa \"2. PGT\", responda a caixa \"2.1 Dados do estabelecimento para o PGT\" (onde estão os planos das demais tecnologias é obrigatório). Escreva um roteiro, se quiser guiar a IA; os trechos prontos entram no fim do texto, sem apagar o que já está escrito.",
          "Anexe imagens, se quiser, com \"Escolher imagens\", e toque em \"Avançar para os POPs\".",
          "Na etapa \"3. POPs\", abra os grupos e toque na linha de cada POP que se aplica ao cliente. Use \"Procurar no catálogo\" para achar pelo nome ou pelo código. Cada POP marcado mostra \"Dados do estabelecimento para este POP\"; as perguntas usadas por mais de um POP ficam na caixa \"3.3\". O roteiro de cada POP é opcional.",
          "O POP023 (gerador), o POP024 (cilindros) e o POP026 (área própria de guarda) só são gerados quando a caixa 1.6 diz que o cliente tem o recurso. Com \"Não\", o POP fica indisponível, com a explicação no cartão; sem área própria, as regras de higiene das áreas entram no POP010.",
          "Para um POP fora do catálogo, digite o nome e toque em \"Adicionar POP avulso\".",
          "Toque em \"Conferir e gerar\".",
          "Na etapa \"4. Conferir e gerar\", confira o resumo. Se faltar dado obrigatório, a faixa vermelha \"Faltam dados obrigatórios do estabelecimento\" diz quais documentos não vão ser gerados e quais perguntas faltam, com a caixa de cada uma; os botões \"Ir para a etapa\" levam até elas, marcadas em vermelho. Os outros documentos saem normalmente.",
          "A caixa \"Revisões desta rodada\" mostra os documentos que já existem para este CNPJ e saem como revisão (\"Rev. 2.0 → sai a Rev. 3.0\"); nesse caso, escreva o \"Motivo desta revisão\" (um para a rodada, ao menos 10 caracteres). Ele vai para o controle de revisões de cada documento revisado.",
          "Toque em \"Gerar tudo\". A fila de geração mostra cada documento: primeiro o PGT, depois cada POP, um por vez. Pode levar alguns minutos: mantenha a aba aberta.",
          "No fim, a tela vai sozinha para a etapa \"5. Documentos\". Para ir antes, toque em \"Ver os documentos\"."
        ] },
        { titulo: "Abrir e salvar os documentos", itens: [
          "Em \"5. Documentos\", toque em \"Abrir\" para ver o documento em nova aba. No celular, o documento abre dentro do SGO+, com Voltar e Imprimir.",
          "Cada documento gerado já é salvo sozinho na pasta do cliente (PDF e cópia A4) e aparece com o selo \"Salvo na pasta\" e o botão \"PDF salvo\".",
          "Se aparecer \"Falta salvar na pasta\", toque em \"Abrir\" e depois em \"Salvar na pasta do cliente\". Se o documento já estava salvo, o sistema mostra o arquivo que já existe e não cria outra cópia. Ao salvar, o documento passa a aparecer com \"Abrir PDF\" em \"Documentos emitidos\".",
          "O selo \"Conferir\" mostra a lista \"Pontos para conferir\": \"Falta: ...\" (item da ficha técnica que não apareceu no texto), norma fora da lista do documento, prazo, meta ou frequência que o cliente não informou, setor que o cliente não tem, \"Pendência\" (pergunta opcional sem resposta), seção que o sistema monta e a IA escreveu (foi retirada), campo que ficou para preencher, nome de sistema ou marca, texto que parece cortado ou trecho sobre a forma de elaboração que foi retirado. O documento já está gravado; abra, confira e, se precisar mudar algo, toque em \"Abrir para corrigir\".",
          "Toque em \"Atualizar lista\" para ver a lista de controle do cliente (código, título, revisão e data).",
          "\"Começar outro cliente\" volta à etapa 1 sem apagar nada."
        ] },
        { titulo: "Consultar o que já foi gerado para o cliente", itens: [
          "Na etapa 1, digite o CNPJ e toque em \"Consultar documentos já gerados\". A faixa diz quantos documentos vigentes o CNPJ tem (PGT e POPs) e traz \"Ver documentos deste cliente\" e \"Abrir a pasta do cliente\".",
          "Se a razão social estiver em branco, os dados do cliente são preenchidos pelo documento registrado mais recente, e a faixa azul diz quais campos e de qual data vieram. Confira se continuam valendo.",
          "No fim da tela, em \"Documentos emitidos\", nada é listado até você pesquisar. Digite o CNPJ (com ou sem pontos), parte do nome do cliente, o código (POP013, PGTS) ou parte do título e toque no botão Buscar, ao lado do campo. Na busca por nome ou título, acentos e maiúsculas não fazem diferença.",
          "Os documentos aparecem agrupados por cliente, um por código, na revisão vigente. As anteriores ficam em \"Revisões anteriores (N)\", cada uma com \"Abrir PDF\".",
          "Cada documento tem \"Abrir PDF\" e \"Mais ações\". Em \"Mais ações\" ficam \"Enviar\" (o único botão de envio), \"Abrir para imprimir\", \"Abrir para corrigir\" e \"Usar como base\", cada um com a explicação ao lado.",
          "A busca mostra os documentos emitidos a partir de 26/10/2026. Os anteriores continuam na pasta do cliente.",
          "Documento com o selo vermelho \"Suspenso\": não use nem envie. Os PGTs e POPs emitidos antes da revisão técnica completa do módulo serão todos refeitos (decisão da Diretoria em 14/11/2026, depois da auditoria que encontrou erros no texto). O botão \"Enviar\" não aparece e o envio pelo sistema é recusado; o PDF abre só para consulta interna (\"Ver PDF (consulta interna)\"). Para entregar ao cliente, gere o documento de novo quando a geração revisada estiver liberada; \"Abrir para corrigir\" carrega os dados do documento para isso."
        ] },
        { titulo: "Fila de geração", itens: [
          "\"Na fila\": ainda não começou.",
          "\"Gerando…\": está sendo redigido agora. O PGT leva mais tempo, porque é redigido em 6 partes.",
          "\"Gerado · rev. N.0\": pronto e salvo na pasta do cliente.",
          "\"Gerado · conferir\": pronto e salvo, com pontos para conferir na etapa 5.",
          "\"Gerado · revisar\": pronto, mas com um aviso (texto padrão sem a IA ou falta salvar na pasta). O aviso diz o que fazer.",
          "\"Não gerado\": a linha mostra o motivo e o que fazer. Os outros documentos continuam sendo gerados."
        ] },
        { titulo: "Corrigir um documento já gerado (nova revisão)", itens: [
          "No fim da tela, em \"Documentos emitidos\", pesquise o documento (CNPJ, cliente, código ou título).",
          "Toque em \"Mais ações\" e em \"Abrir para corrigir\". O formulário volta preenchido com tudo o que foi usado (dados digitados, roteiro e imagens), sem importar nada de novo. Se já houver outro documento aberto, a tela pergunta, ali mesmo, se você quer descartá-lo.",
          "No quadro amarelo \"Correção do documento\", no alto do formulário, escreva o motivo da revisão (ao menos 10 caracteres).",
          "A tela abre na etapa \"4. Conferir e gerar\". O CNPJ e o código ficam travados: a revisão pertence ao documento aberto. Altere só o que precisa e toque em \"Gerar tudo\". Só o documento aberto entra na fila. Sai a revisão seguinte do mesmo código (2.0, 3.0...); o motivo e a data entram no controle de revisões do documento.",
          "O POP avulso corrigido também sai como revisão seguinte do código próprio dele (AV-...).",
          "A revisão anterior continua guardada na pasta do cliente e passa a aparecer em \"Revisões anteriores\", como substituída.",
          "Para desistir, toque em \"Cancelar a correção e limpar o formulário\"."
        ] },
        { titulo: "Usar um documento como base para um novo", itens: [
          "Na mesma busca, toque em \"Mais ações\" e em \"Usar como base\" (por exemplo, o mesmo documento para outro cliente).",
          "O formulário volta preenchido. Troque o CNPJ e os dados do cliente na etapa 1. A faixa abaixo do CNPJ diz o que vai sair.",
          "No mesmo CNPJ, com o mesmo código, sai a revisão seguinte e a etapa 4 pede o motivo. Em outro CNPJ, sai a revisão 1.0 (ou a seguinte, se o código já existir lá)."
        ] }
      ],
      cores: [
        { nome: "Faixa verde \"Cliente encontrado no cadastro público\"", significado: "A razão social e o endereço foram preenchidos (campos em amarelo claro). Confira com o contrato." },
        { nome: "Faixa amarela \"A busca não trouxe os dados do cliente\"", significado: "Confira o CNPJ e busque de novo, ou preencha os dados à mão e continue." },
        { nome: "Campo com fundo amarelo claro", significado: "Preenchido pela busca ou pela consulta. Some quando você edita o campo." },
        { nome: "Campo com borda vermelha", significado: "Obrigatório e em branco. Na etapa 1 (cliente e assinaturas), preencha para avançar; nas perguntas sobre o estabelecimento, responda para o documento ser gerado." },
        { nome: "Selo vermelho \"faltam N obrigatórias\"", significado: "No grupo da caixa 1.5 ou no cartão do POP: ainda há perguntas obrigatórias sem resposta. Sem elas, o documento não é gerado." },
        { nome: "Faixa vermelha \"Faltam dados obrigatórios do estabelecimento\"", significado: "Na etapa 4 ou no cartão \"Não gerado\": lista os documentos que não saem e as perguntas que faltam, com a caixa de cada uma. Os botões levam às perguntas." },
        { nome: "Cartão de POP acinzentado \"Não se aplica\"", significado: "O cliente respondeu \"Não\" ao recurso desse POP na caixa 1.6 (gerador, cilindros ou área própria de guarda). Se estiver errado, corrija a resposta na etapa 1." },
        { nome: "Selo \"Salvo na pasta\"", significado: "O documento já está na pasta do cliente. \"PDF salvo\" abre o PDF." },
        { nome: "Selo \"Revisar texto\"", significado: "O POP saiu com o texto padrão montado a partir do roteiro, sem a redação da IA. Abra e revise antes de enviar ao cliente." },
        { nome: "Selo \"Falta salvar na pasta\"", significado: "O documento foi gerado, mas não chegou à pasta do cliente. Toque em \"Abrir\" e depois em \"Salvar na pasta do cliente\"." },
        { nome: "Selo \"Não gerado\"", significado: "O documento não foi gerado e nada foi gravado. A faixa vermelha do cartão diz o motivo e o que fazer." },
        { nome: "Selo \"Não gerado nesta rodada\"", significado: "Na correção só o documento aberto é gerado de novo; este continua com a revisão que já tinha." },
        { nome: "Selo \"Conferir\"", significado: "O documento foi gravado, mas tem pontos para conferir (lista no cartão). Não impede o uso: abra, confira e, se precisar, corrija." },
        { nome: "Faixa vermelha \"Falta o motivo desta revisão\"", significado: "Algum documento da rodada já existe para este CNPJ e sai como revisão. Escreva o motivo na caixa 4.2." },
        { nome: "Campo com fundo cinza e \"Travado\"", significado: "Na correção, o CNPJ e o código ficam travados: a revisão pertence ao documento aberto." },
        DETALHES
      ],
      problemas: [
        { situacao: "\"Avançar para o PGT\" não passa da etapa 1.", oQueFazer: "Preencha a razão social, o nome e o cargo de quem aprova pelo cliente e o nome e o cargo de quem elaborou. Os campos que faltam ficam em vermelho e o primeiro recebe o cursor." },
        { situacao: "\"Gerar tudo\" mostra \"Falta o motivo desta revisão\".", oQueFazer: "Algum documento marcado já existe para este CNPJ e sai como revisão. Escreva o que mudou na caixa 4.2 \"Revisões desta rodada\" (ao menos 10 caracteres) e toque de novo em \"Gerar tudo\". Se cada documento mudou por um motivo diferente, gere em rodadas separadas." },
        { situacao: "Um documento aparece como \"Não gerado\" com \"Faltam dados obrigatórios do estabelecimento\".", oQueFazer: "Nada foi gravado. A mensagem lista as perguntas que faltam e a caixa de cada uma (1.5, 1.6, 2.1, 3.3 ou o cartão do POP). Toque em \"Preencher os dados\": a tela vai até a primeira, marcada em vermelho. Responda com o cliente e toque de novo em \"Gerar tudo\"." },
        { situacao: "Um POP aparece como \"Não gerado\" porque o estabelecimento \"informou que não tem\" o recurso.", oQueFazer: "A caixa 1.6 diz que o cliente não tem o gerador, os cilindros ou a área própria de guarda desse POP. Se for verdade, desmarque o POP; se não, corrija a resposta e gere de novo." },
        { situacao: "O POP023, o POP024 ou o POP026 não pode ser marcado.", oQueFazer: "O cliente respondeu \"Não\" ao recurso na caixa 1.6. Se a resposta estiver errada, corrija na etapa 1: o POP volta a ficar disponível." },
        { situacao: "Um documento saiu com o selo \"Conferir\".", oQueFazer: "O documento já está gravado. Leia os pontos do cartão, abra o documento e confira os trechos. Se precisar mudar algo, toque em \"Abrir para corrigir\": sai a revisão seguinte, com o motivo." },
        { situacao: "O PGT aparece como \"Não gerado\" e a mensagem diz que nada foi gravado.", oQueFazer: "A IA não respondeu ou devolveu o texto incompleto mesmo depois de tentar de novo e de passar ao modelo reserva. A revisão continua a mesma. Os POPs já gerados ficam salvos. Tente mais tarde ou peça ao administrador para conferir a chave em \"Chaves e senhas\"." },
        { situacao: "Um POP aparece como \"Não gerado\".", oQueFazer: "Os outros documentos estão salvos. Toque em \"Escrever o roteiro\", escreva como o cliente faz o procedimento e gere de novo: com roteiro, o POP sai mesmo sem a IA, com texto padrão para você revisar." },
        { situacao: "O documento diz \"O servidor não respondeu a este documento\".", oQueFazer: "Recarregue a página (F5) e confira a lista de controle antes de gerar de novo: o documento pode ter sido gravado mesmo assim." },
        { situacao: "O navegador bloqueou a nova aba.", oQueFazer: "Libere janelas novas (pop-up) para o SGO+ e toque de novo em \"Abrir\". No celular, o documento abre dentro do SGO+, sem aba nova." },
        { situacao: "Tentei salvar sem abrir o documento.", oQueFazer: "Toque primeiro em \"Abrir\" e depois em \"Salvar na pasta do cliente\"." },
        { situacao: "O catálogo de POPs não carregou.", oQueFazer: "Recarregue a página (F5). Os campos já digitados se perdem ao recarregar. Enquanto isso, ainda dá para adicionar um POP avulso. Se repetir, avise o administrador com o horário." },
        { situacao: "Ao gerar a correção apareceu \"Escreva o motivo da revisão\".", oQueFazer: "Escreva o motivo no quadro amarelo \"Correção do documento\", no alto do formulário (ao menos 10 caracteres), e toque de novo em \"Gerar tudo\"." },
        { situacao: "O documento não aparece em \"Documentos emitidos\".", oQueFazer: "A busca mostra os documentos emitidos a partir de 26/10/2026. Os anteriores não guardaram os dados do formulário e continuam só na pasta do cliente (\"Abrir a pasta do cliente\", na etapa 1). Para corrigir um deles, preencha o formulário com o mesmo CNPJ e o mesmo POP e gere: sai a revisão seguinte, com o motivo." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Gerar, abrir e salvar PGT e POPs." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela. Para receber um documento, solicite à Metrolabs." }
      ],
      perguntas: [
        { p: "Gerar de novo apaga a versão anterior?", r: "Não. Cada geração cria uma nova revisão (1.0, 2.0...), com o motivo informado na etapa 4. A anterior fica guardada como substituída. A lista de controle mostra a revisão e a data." },
        { p: "Por que o título do POP não é o que a IA escreveu?", r: "O título de cada POP é o nome do catálogo, igual para todos os clientes (no avulso, o nome digitado). O código e o nome do cliente já estão no cabeçalho do documento." },
        { p: "Como sai o documento?", r: "O PGT sai com capa, sumário com as páginas, seções numeradas e as quatro assinaturas na página final. O POP sai com título, histórico de revisões (Tabela 1), seções numeradas e as assinaturas. O arquivo se chama, por exemplo, \"POP - POP005 rev 1.0 - Etiquetagem e Identificação de Situação dos Equipame - 2026-11-14 1430\" (o nome do POP é cortado em 60 caracteres)." },
        { p: "De onde vêm as normas citadas?", r: "De uma lista fechada por documento, conferida em fonte oficial pelo especialista (só normas vigentes). A seção Referências normativas é montada pelo sistema; normas que só valem com um recurso (radiologia, CME, Rede Sentinela) ou para hospital público entram só quando a resposta do cliente diz isso." },
        { p: "O PGT cobre medicamentos e saneantes?", r: "Não. O PGT da Metrolabs cobre só equipamentos de saúde, e o texto diz isso. A caixa 2.1 pergunta onde estão os planos das demais tecnologias, que o PGT indica." },
        { p: "Por que o documento traz \"a definir pelo estabelecimento\"?", r: "Porque o cliente não informou aquele dado (pergunta opcional sem resposta, meta ou frequência). O sistema nunca preenche por conta própria; o ponto aparece como pendência em \"Pontos para conferir\"." }
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
        ] },
        { titulo: "Corrigir um documento já gerado (nova revisão)", itens: [
          "No fim da tela, em \"Documentos gerados: corrigir ou usar como base\", busque pelo número, cliente ou TAG.",
          "Na linha do documento, toque em \"Abrir para corrigir\". O formulário volta preenchido com tudo o que foi usado (dados digitados, textos, anexos e leituras), sem importar nada de novo.",
          "No quadro amarelo \"Correção do documento\", no alto do formulário, escreva o motivo da revisão (ao menos 10 caracteres).",
          "Altere só o que precisa e toque em \"Gerar Registro\". Sai a revisão seguinte (Rev. 01, 02...) com o mesmo número; o motivo, a data e o seu nome entram no histórico de revisões do documento.",
          "A revisão anterior continua guardada na pasta do cliente, com a revisão no nome do arquivo, e passa a constar como \"Substituído pela Rev. NN\" na lista.",
          "Para desistir, toque em \"Cancelar a correção e limpar o formulário\"."
        ] },
        { titulo: "Usar um documento como base para um novo", itens: [
          "Na mesma lista, toque em \"Usar como base\" (por exemplo, o mesmo equipamento no ano seguinte).",
          "O formulário volta preenchido. Confira datas, leituras e resultados, que são do serviço anterior.",
          "Toque em \"Gerar Registro\": sai um documento novo, com número novo. O documento de origem não muda."
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
        { situacao: "A IA não sugeriu campos.", oQueFazer: "Toque em \"Montar os campos manualmente\" e crie os campos com \"+ Adicionar campo\"." },
        { situacao: "Ao gerar a correção apareceu \"Escreva o motivo da revisão\".", oQueFazer: "Escreva o motivo no quadro amarelo \"Correção do documento\", no alto do formulário (ao menos 10 caracteres), e toque de novo em \"Gerar Registro\"." },
        { situacao: "Apareceu \"O número ... já é de um documento gerado\".", oQueFazer: "Para corrigir aquele documento, use \"Abrir para corrigir\" na lista de documentos gerados. Para um documento novo, apague o número ou use outro." },
        { situacao: "O documento não aparece na lista para corrigir.", oQueFazer: "Documentos gerados antes de 21/10/2026 não guardaram os dados do formulário e não entram nessa lista. O PDF continua na pasta do cliente. Para corrigir um deles, preencha o formulário e gere um documento novo." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Preencher registros, criar e editar tipos de documento e consultar pendências." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela." }
      ],
      perguntas: [
        { p: "O que é uma pendência?", r: "É um registro que precisa de outro depois. Exemplo: uma não conformidade encontrada na ronda fica em aberto até alguém registrar a correção." },
        { p: "Onde fica o registro gerado?", r: "Na pasta do cliente (pelo CNPJ), em PDF e em cópia A4, com o nome \"Registro operacional - REG-… - <tipo> - <data> <hora>\". Cada seção do tipo de documento vira uma seção numerada; texto longo ocupa a linha inteira e as assinaturas saem com nome, cargo e papel." }
      ]
    }
  };
}
