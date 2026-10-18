/**
 * Ajuda "Como usar esta tela" — grupo Calibracao (frente B).
 * Telas: Certificado de calibração, Relatório de calibração e
 * Padrões de referência (página nova de 17/10/2026).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Texto puro, sem HTML.
 * Conferido contra a tela real (SGO_CertCal_ConteudoModulo.js, JS_Padroes_Documentos.html,
 * SGO_RelCal_ConteudoModulo.js e o assistente do celular em JS_Core.html) em 17/10/2026.
 */
function SGO_ajudaTelas_Calibracao_() {
  return {
    // ================================================================
    "certificado_calibracao": {
      titulo: "Certificado de calibração",
      paraQueServe: "Emite o certificado de calibração oficial da Metrolabs. Você digita as leituras feitas contra o padrão de referência e o sistema calcula a tendência e a incerteza, numera o certificado e salva o documento na pasta do cliente. Depois, se quiser, gera o relatório interpretativo em linguagem simples.",
      antesDeComecar: [
        "Tenha o CNPJ do cliente e os dados do equipamento calibrado.",
        "Tenha as leituras: para cada ponto, o valor de referência e as 3 leituras do equipamento.",
        "Confira em \"Padrões de referência\" se os padrões usados estão vigentes. Padrão vencido na data da calibração impede a emissão.",
        "Tendência é a diferença entre a média das leituras e o valor de referência.",
        "U95 é a incerteza expandida: a faixa em volta do resultado em que o valor verdadeiro está, com cerca de 95% de confiança.",
        "k é o fator que multiplica a incerteza combinada para chegar à U95. Veff (graus de liberdade efetivos) mostra quanta informação sustenta a incerteza; quanto menor, maior o k.",
        "Esta tela não decide se o equipamento está aprovado. Quem avalia a adequação ao uso é o setor de qualidade do cliente."
      ],
      passos: [
        { titulo: "Emitir um certificado no computador", itens: [
          "Toque em \"Certificado de calibração\" no menu.",
          "Em \"1. Cliente\", digite o CNPJ só com números.",
          "Toque em \"Buscar / Selecionar Cliente\".",
          "Se o cliente não existir, confira os dados que vieram da consulta e toque em \"Cadastrar Cliente\".",
          "Em \"2. Equipamento\", escolha o equipamento em \"Equipamento já cadastrado\" e toque em \"Usar este equipamento\".",
          "Se o equipamento não estiver na lista, preencha os campos de equipamento novo e toque em \"Cadastrar Equipamento\".",
          "Em \"3. Dados da calibração\", escolha o técnico executor ou digite o nome no campo de texto livre.",
          "Digite a data da calibração (dd/mm/aaaa).",
          "Deixe \"Não — emissão sem data (seleção padrão).\" na pergunta sobre a próxima calibração, a menos que o cliente tenha pedido a data.",
          "Desmarque \"Realizado no laboratório da Metrolabs\" se a calibração foi feita no cliente.",
          "Se quiser, digite a temperatura ambiente e a umidade relativa (só os números).",
          "Em \"4. Ensaios (blocos de resultado)\", toque em \"+ Adicionar bloco de ensaio\".",
          "Digite o \"Título (grandeza/canal)\" e a unidade.",
          "Digite a \"Resolução do instrumento (na unidade do bloco)\". Se deixar em branco, o sistema deduz pelas leituras e marca com asterisco no certificado.",
          "Marque os padrões de referência usados neste bloco.",
          "Em cada ponto, digite a referência e as leituras do Ensaio 1, 2 e 3. Use \"+ Adicionar ponto\" para mais pontos.",
          "Toque em \"Calcular\" e confira a prévia (média, tendência, U95, Veff).",
          "Em \"5. Fotos do ensaio (opcional)\", anexe as fotos, se tiver.",
          "Em \"6. Gerar\", toque em \"Gerar Certificado de Calibração\".",
          "O certificado abre em nova aba, com número automático, e fica salvo na pasta do cliente."
        ] },
        { titulo: "Gerar o relatório interpretativo", itens: [
          "Depois de emitir o certificado, toque em \"Gerar Relatório Interpretativo\".",
          "Espere até um minuto. O relatório abre em nova aba e fica salvo na pasta do cliente.",
          "Ele explica os mesmos números do certificado, sem recalcular nada."
        ] },
        { titulo: "Reabrir um certificado já emitido", itens: [
          "Em \"Certificados emitidos\", no fim da página, digite o CNPJ.",
          "Toque em \"Buscar\".",
          "Toque em \"Reabrir certificado\" ou no link do relatório interpretativo."
        ] },
        { titulo: "Emitir pelo celular", itens: [
          "Toque em \"Certificado de calibração\".",
          "Siga os 5 passos da tela: cliente, equipamento, dados da calibração, blocos de ensaio, fotos e emissão.",
          "No celular ainda não há campo de resolução. O sistema deduz a resolução pelas leituras e marca com asterisco."
        ] }
      ],
      cores: [
        { nome: "Aviso vermelho sobre padrões vencidos ou com data inválida", significado: "Esses padrões não podem ser usados em certificado. Atualize a validade em \"Padrões de referência\"." },
        { nome: "Aviso amarelo \"vencem nos próximos 30 dias\"", significado: "Ainda podem ser usados, mas programe a recalibração." },
        { nome: "Aviso \"parece ser de outra grandeza\"", significado: "O padrão marcado no bloco é de uma grandeza diferente da do bloco. Confira se marcou o padrão certo antes de gerar." },
        { nome: "Coluna \"|Tendência| + U95\" da prévia", significado: "Soma da tendência (sem sinal) com a U95. É informação para o cliente; não é decisão de aceitação." },
        { nome: "Asterisco na resolução do certificado", significado: "A resolução não foi digitada e foi deduzida do menor passo das leituras." }
      ],
      problemas: [
        { situacao: "Aparece \"Informe um CNPJ válido (14 dígitos).\"", oQueFazer: "Digite os 14 números do CNPJ, sem ponto, barra ou traço." },
        { situacao: "Aparece \"Selecione o cliente e o equipamento antes de gerar.\"", oQueFazer: "Volte às seções 1 e 2 e confirme o cliente e o equipamento." },
        { situacao: "Aparece \"Adicione ao menos 1 bloco de ensaio.\"", oQueFazer: "Toque em \"+ Adicionar bloco de ensaio\" e preencha os pontos." },
        { situacao: "O certificado foi recusado porque o padrão estava vencido na data da calibração.", oQueFazer: "Atualize o padrão com o certificado novo em \"Padrões de referência\" (Editar) ou marque outro padrão no bloco. Sem certificado vigente, a rastreabilidade não está garantida." },
        { situacao: "Um padrão não aparece para marcar.", oQueFazer: "Ele está inativo. Reative em \"Padrões de referência\", filtro \"Inativos\"." },
        { situacao: "Os números da prévia parecem estranhos.", oQueFazer: "Confira a unidade do bloco, o padrão marcado e as leituras digitadas. Vírgula e ponto valem como separador decimal." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA", pode: "Emitir certificados e relatórios interpretativos e consultar os emitidos." },
        { perfil: "COMERCIAL,FINANCEIRO", pode: "Só consultam certificados emitidos. O servidor recusa a emissão e explica o motivo." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela. Vê os próprios documentos em \"Arquivo de documentos\"." }
      ],
      perguntas: [
        { p: "Qual a diferença entre esta tela e o \"Relatório de calibração\"?", r: "Aqui o SGO+ faz a conta e emite o certificado. O \"Relatório de calibração\" lê um certificado que já existe e explica o resultado." },
        { p: "O que entra no orçamento de incerteza?", r: "A repetibilidade das 3 leituras, a incerteza de cada padrão usado e a resolução do instrumento. O sistema combina tudo pelo método do GUM e calcula Veff, k e U95 com cerca de 95% de confiança." },
        { p: "Posso mudar um certificado já emitido?", r: "Não. O certificado emitido guarda os próprios números. Se houver erro, emita um novo." }
      ],
      secoesManual: [
        { titulo: "Termos usados nesta tela", paragrafos: [
          "Padrão de referência: instrumento calibrado, mais exato, usado para comparar com o equipamento do cliente.",
          "Bloco de ensaio: uma grandeza ou canal medido (por exemplo, sensor interno, temperatura).",
          "Ponto: um valor de referência testado, com 3 leituras do equipamento.",
          "Resolução: o menor passo que o instrumento mostra (por exemplo, 0,1 °C). Entra na incerteza.",
          "Tendência: média das leituras menos o valor de referência.",
          "U95: incerteza expandida, com cerca de 95% de confiança. k: fator que leva da incerteza combinada à U95. Veff: graus de liberdade efetivos, que definem o k."
        ] }
      ]
    },

    // ================================================================
    "relatorio_calibracao": {
      titulo: "Relatório de calibração",
      paraQueServe: "Gera um relatório que explica, em linguagem clara, um certificado de calibração que já existe. A IA lê o certificado anexado e escreve o relatório sem mudar nenhum número. O documento é salvo sozinho na pasta do cliente.",
      antesDeComecar: [
        "Tenha o certificado de calibração do instrumento em PDF ou imagem.",
        "Se o instrumento tem mais de uma peça calibrada (por exemplo, centrífuga), tenha um certificado por peça. Não junte vários certificados num arquivo só.",
        "Tenha o CNPJ do cliente."
      ],
      passos: [
        { titulo: "Gerar o relatório", itens: [
          "Toque em \"Relatório de calibração\" no menu.",
          "Em \"1. Cliente\", digite o CNPJ e toque em \"Buscar CNPJ\".",
          "Em \"2. Instrumento\", escolha o tipo de instrumento.",
          "Preencha TAG, marca, modelo, localização, data da calibração e técnico.",
          "Deixe \"Realizado no laboratório da Metrolabs\" marcado, a menos que a calibração tenha sido no cliente.",
          "Em \"3. Certificado e Fotos\", anexe o certificado.",
          "Se quiser, marque \"Detectar automaticamente os dados do certificado\" e confira o que foi preenchido.",
          "Anexe até 6 fotos, se tiver.",
          "Toque em \"Gerar Relatório de Calibração\".",
          "O relatório abre em nova aba e é salvo na pasta do cliente. Espere a mensagem \"Salvo na pasta do cliente\"."
        ] },
        { titulo: "Ligar o relatório ao equipamento do cadastro", itens: [
          "Depois de salvo, aparece o quadro \"Vincular ao Cadastro\".",
          "Escolha cliente, unidade e equipamento.",
          "Se quiser, informe a data de vencimento.",
          "Toque em \"Vincular\". O documento passa a aparecer no \"Inventário de equipamentos\"."
        ] },
        { titulo: "Reabrir um relatório já gerado", itens: [
          "Em \"Documentos já gerados\", digite o cliente, a TAG ou o nome do arquivo.",
          "Toque em \"Buscar\"."
        ] }
      ],
      cores: [
        { nome: "Mensagem verde \"Dados detectados automaticamente\"", significado: "O sistema leu o certificado e preencheu os campos. Revise antes de gerar." },
        { nome: "Mensagem \"Não foi possível detectar os dados automaticamente\"", significado: "Preencha os campos à mão." },
        { nome: "Aviso de texto padrão", significado: "A IA não respondeu. O relatório sai com texto padrão, com o instrumento, as normas e como ler o certificado anexado. Revise." }
      ],
      problemas: [
        { situacao: "O relatório não foi salvo na pasta.", oQueFazer: "Leia a mensagem em vermelho e tente de novo em instantes. O sistema não salva duas vezes o mesmo documento." },
        { situacao: "Aparece \"Escolha ao menos Cliente e Unidade.\" ao vincular.", oQueFazer: "Escolha o cliente e a unidade antes de tocar em \"Vincular\"." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA", pode: "Gerar, salvar e vincular relatórios." },
        { perfil: "COMERCIAL,FINANCEIRO", pode: "Só consultam. O servidor recusa a geração." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela." }
      ],
      perguntas: [
        { p: "O relatório aprova o instrumento?", r: "Não. Ele explica os resultados do certificado. A decisão de uso é do cliente." }
      ]
    },

    // ================================================================
    "padroes": {
      titulo: "Padrões de referência",
      paraQueServe: "Controla os padrões de referência do laboratório: validade, certificado em PDF, incerteza, localização e foto. Também gera o inventário, o orçamento de recalibração e os relatórios gerenciais. Padrão vencido não pode ser usado em certificado.",
      antesDeComecar: [
        "Cada canal ou grandeza de um certificado é um cadastro próprio, com TAG, U95, k e validade. Exemplo: REG-001 (CANAL1) a REG-001 (CANAL8).",
        "Cadastros com a mesma TAG base aparecem juntos num grupo.",
        "Nos números, vírgula e ponto valem como separador decimal.",
        "νeff (graus de liberdade) do certificado do padrão: deixe 0 quando o certificado não informar; 0 significa infinito."
      ],
      passos: [
        { titulo: "Encontrar um padrão", itens: [
          "Toque em \"Padrões de referência\" no menu.",
          "Toque num número do resumo (por exemplo, \"Vencidos\") para filtrar a lista. Toque de novo para voltar a \"Ativos\".",
          "Ou digite na busca a TAG, a descrição, a série, a marca, o modelo ou o número do certificado.",
          "Use os filtros \"Situação\", \"Local\" e \"Grandeza\" e o campo \"Ordenar\".",
          "Toque em \"Limpar filtros\" para ver tudo de novo.",
          "Toque na TAG para abrir o painel de detalhe ao lado."
        ] },
        { titulo: "Cadastrar um padrão", itens: [
          "Toque em \"Cadastrar padrão\".",
          "Preencha TAG, número do certificado, descrição, U95, fator k, graus de liberdade e validade (dd/mm/aaaa).",
          "Anexe o PDF do certificado do padrão.",
          "Toque em \"Salvar padrão\".",
          "Se a TAG já existir, o sistema recusa e avisa. Use outra TAG ou edite o cadastro existente."
        ] },
        { titulo: "Atualizar a validade depois da recalibração", itens: [
          "Encontre o padrão e toque em \"Editar\".",
          "Digite o novo número do certificado e a nova validade.",
          "Toque em \"Salvar alterações\".",
          "Para trocar o PDF, toque em \"⋯\" (Mais ações) e em \"Substituir PDF\". O PDF anterior continua no histórico."
        ] },
        { titulo: "Completar dados, localização e foto", itens: [
          "Toque em \"⋯\" (Mais ações) e em \"Dados, localização e foto\".",
          "Se quiser, toque em \"Ler o certificado com IA\" e confira a proposta com o PDF.",
          "Informe a localização. Ela é sempre digitada pela equipe.",
          "Anexe a foto do instrumento (JPG ou PNG, até 12 MB).",
          "Marque \"Conferi identificação, datas, faixas e todos os pontos com o certificado atual\" só depois de conferir.",
          "Toque em \"Salvar dados\"."
        ] },
        { titulo: "Inativar ou reativar", itens: [
          "Toque em \"⋯\" (Mais ações) e em \"Inativar\".",
          "Confirme. O padrão sai da escolha dos ensaios, mas o histórico fica guardado.",
          "Para reativar, filtre \"Inativos\", toque em \"⋯\" e em \"Reativar\"."
        ] },
        { titulo: "Ler vários certificados com IA (só no computador)", itens: [
          "Toque em \"Ler certificados com IA\".",
          "Toque em \"Iniciar leitura\". A leitura é feita em lotes e não apaga o que foi digitado.",
          "Para acompanhar, toque em \"Ver andamento ou retomar\".",
          "Depois, confira cada padrão com o PDF. O selo \"Lido por IA, falta conferir\" mostra o que falta."
        ] }
      ],
      cores: [
        { nome: "Selo verde \"Vigente\"", significado: "O certificado do padrão está válido por mais de 30 dias." },
        { nome: "Selo amarelo \"Vence em 30 dias\" ou \"Vence em N dias\"", significado: "Vence em até 30 dias. Ainda pode ser usado. Programe a recalibração." },
        { nome: "Selo vermelho \"Vencido\"", significado: "A validade passou. Não entra em certificado até atualizar." },
        { nome: "Selo vermelho \"Data inválida\"", significado: "A validade foi digitada errada. Corrija em \"Editar\" (dd/mm/aaaa)." },
        { nome: "Selo amarelo \"Sem validade\"", significado: "Nenhuma validade foi informada. Informe em \"Editar\"." },
        { nome: "Selo cinza \"Inativo\"", significado: "Fora de uso. Não aparece para os ensaios." },
        { nome: "Selo amarelo \"Validade divergente\"", significado: "Os canais do mesmo grupo têm validades diferentes. Confira cada canal; o diferente vem destacado." },
        { nome: "Selo amarelo \"Lido por IA, falta conferir\"", significado: "Os dados vieram da leitura automática e ainda não foram conferidos pela equipe." },
        { nome: "Selo verde \"Conferido pela equipe\"", significado: "Alguém conferiu os dados com o certificado atual." },
        { nome: "Faixa vermelha com \"Ver vencidos\"", significado: "Mostra quantos padrões vencidos ou com data inválida existem. Toque para filtrar." },
        { nome: "Faixa amarela com \"Programar recalibração\"", significado: "Mostra quantos vencem em até 30 dias. Toque para filtrar." }
      ],
      problemas: [
        { situacao: "Não vejo \"Editar\" nem \"Cadastrar padrão\".", oQueFazer: "Seu perfil só consulta. O cadastro é feito pela metrologia, pelos técnicos ou pela gestão." },
        { situacao: "Fechei o painel e ele perguntou se quero sair.", oQueFazer: "Havia algo digitado e não salvo. Toque em cancelar para voltar e salvar, ou confirme para descartar." },
        { situacao: "O padrão não aparece na lista.", oQueFazer: "Confira o filtro \"Situação\". Padrões inativos só aparecem em \"Inativos\" ou \"Todos\"." },
        { situacao: "A IA leu um número de certificado ou validade diferente do cadastro.", oQueFazer: "O sistema avisa, mas não troca sozinho. Confira o PDF e, se for o caso, corrija em \"Editar\"." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA", pode: "Cadastrar, editar, anexar PDF, completar dados, inativar e reativar padrões. Gerar inventário, orçamento e relatórios." },
        { perfil: "COMERCIAL,FINANCEIRO", pode: "Só consultam. O painel abre só no Resumo." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela." }
      ],
      perguntas: [
        { p: "Por que um padrão vencido bloqueia o certificado?", r: "Sem certificado vigente do padrão, a rastreabilidade da calibração não está garantida. O certificado do cliente é recusado com a explicação." },
        { p: "No celular dá para usar esta tela?", r: "Sim. A mesma página abre em cartões, com os filtros no botão \"Filtros\". A leitura de certificados em lote fica só no computador." },
        { p: "O histórico de PDFs some quando substituo?", r: "Não. Os PDFs anteriores ficam guardados. O painel de detalhe mostra o histórico e marca o atual." }
      ]
    },

    "padroes/inventario_orcamento": {
      titulo: "Padrões de referência: inventário e orçamento",
      paraQueServe: "Gera o inventário dos padrões escolhidos ou o pedido de orçamento de recalibração para um laboratório.",
      passos: [
        { titulo: "Gerar inventário ou orçamento", itens: [
          "Na lista de padrões, marque a caixa dos padrões desejados. A caixa do grupo marca todos os canais.",
          "Na barra que aparece, toque em \"Inventário e orçamento\". Ou abra a aba \"Inventário e orçamento\" e toque em \"Escolher na lista\".",
          "Em \"Dados do documento\", preencha o laboratório destinatário e as orientações, se quiser.",
          "Toque em \"Gerar inventário\" ou em \"Pesquisar faixas e gerar orçamento\".",
          "Revise o texto em \"Texto — revise antes de emitir\".",
          "Toque em \"Emitir e salvar cópia\".",
          "Para imprimir, toque em \"Abrir documento para impressão\" e depois em \"Imprimir / salvar PDF\"."
        ] },
        { titulo: "Reabrir um documento salvo", itens: [
          "Em \"Documentos e rascunhos salvos\", toque em \"Consultar\".",
          "Toque em \"Abrir cópia\"."
        ] }
      ]
    },

    "padroes/relatorios_gerenciais": {
      titulo: "Padrões de referência: relatórios gerenciais",
      paraQueServe: "Gera o plano de renovação e auditoria dos padrões e o relatório de desempenho do módulo, prontos para imprimir em A4.",
      passos: [
        { titulo: "Gerar um relatório gerencial", itens: [
          "Toque na aba \"Relatórios gerenciais\".",
          "Em \"Plano de renovação e auditoria\", toque em \"Gerar plano\".",
          "Ou, em \"Relatório de desempenho\", escolha o \"Período\" e toque em \"Gerar relatório\".",
          "O documento abre pronto para imprimir e fica salvo em HTML e PDF."
        ] }
      ]
    }
  };
}
