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
          "Se o equipamento não estiver na lista, preencha os campos de equipamento novo (o patrimônio do cliente é opcional) e toque em \"Cadastrar Equipamento\". O patrimônio gravado no cadastro sai no certificado.",
          "Em \"3. Dados da calibração\", escolha o técnico executor ou digite o nome no campo de texto livre.",
          "Digite a data da calibração (dd/mm/aaaa).",
          "Deixe \"Não — emissão sem data (seleção padrão).\" na pergunta sobre a próxima calibração, a menos que o cliente tenha pedido a data.",
          "Desmarque \"Realizado no laboratório da Metrolabs\" se a calibração foi feita no cliente.",
          "Se quiser, digite a temperatura ambiente e a umidade relativa (só os números).",
          "Em \"4. Ensaios (blocos de resultado)\", toque em \"+ Adicionar bloco de ensaio\".",
          "Digite o \"Título (grandeza/canal)\" e a unidade.",
          "Digite a \"Resolução do instrumento (na unidade do bloco)\". Se deixar em branco, o sistema deduz pelas leituras e marca com asterisco no certificado.",
          "Marque os padrões de referência usados neste bloco (quantos forem). O certificado traz uma tabela com cada padrão usado: fabricante, modelo, nº de série, certificado, laboratório, calibração, validade e incerteza do certificado.",
          "Padrão com vários pontos calibrados: em cada ponto medido entra a U95, o k e o νeff do ponto do certificado do padrão que vale para aquele valor (o mesmo ponto; entre dois pontos, o de maior incerteza). Valor fora da faixa calibrada do padrão é recusado ao calcular, dizendo o padrão e a faixa. A prévia mostra o ponto do padrão usado em cada linha.",
          "Opcional: em \"Correção do valor de referência\", escolha o padrão cujo erro corrige a leitura (valor de referência = leitura do padrão − erro do padrão no ponto). Deixe \"Não corrigir\" quando o valor digitado já é o de referência.",
          "Em cada ponto, digite a referência e as leituras do Ensaio 1, 2 e 3. Use \"+ Adicionar ponto\" para mais pontos.",
          "Toque em \"Calcular\" e confira a prévia (média, tendência, U95, Veff).",
          "Em \"5. Fotos do ensaio (opcional)\", anexe as fotos, se tiver.",
          "Em \"6. Gerar\", toque em \"Gerar Certificado de Calibração\".",
          "O certificado abre em nova aba, com número automático, e fica salvo em HTML e PDF na pasta do cliente (subpasta com o CNPJ). No celular, o documento abre dentro do SGO+, com Voltar e Imprimir. O documento traz identificação, método e rastreabilidade, resultados com U95 e k, orçamento de incerteza, observações, próxima calibração e assinaturas, em seções numeradas."
        ] },
        { titulo: "Gerar o relatório interpretativo", itens: [
          "Depois de emitir o certificado, toque em \"Gerar Relatório Interpretativo\".",
          "Espere até um minuto. O relatório abre em nova aba e fica salvo em HTML e PDF na pasta do cliente (subpasta com o CNPJ). No celular, o documento abre dentro do SGO+, com Voltar e Imprimir.",
          "Ele explica os mesmos números do certificado, sem recalcular nada, com um gráfico por grandeza (tendência e intervalo de ±U95 em cada ponto)."
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
        ] },
        { titulo: "Corrigir um documento já gerado (nova revisão)", itens: [
          "Na busca de certificados emitidos (por CNPJ), toque em Buscar; cada certificado tem os botões Abrir para corrigir e Usar como base. Os emitidos a partir de 21/10/2026 também ficam no quadro Documentos gerados: corrigir ou usar como base, no fim da tela.",
          "Na linha do documento, toque em \"Abrir para corrigir\". O formulário volta preenchido com tudo o que foi usado (dados digitados, textos, anexos e leituras), sem importar nada de novo.",
          "No quadro amarelo \"Correção do documento\", no alto do formulário, escreva o motivo da revisão (ao menos 10 caracteres).",
          "Altere só o que precisa e toque em \"Gerar Certificado de Calibração\". Sai a revisão seguinte (Rev. 01, 02...) com o mesmo número; o motivo, a data e o seu nome entram no histórico de revisões do documento.",
          "A revisão anterior continua guardada na pasta do cliente, com a revisão no nome do arquivo, e passa a constar como \"Substituído pela Rev. NN\" na lista.",
          "Para desistir, toque em \"Cancelar a correção e limpar o formulário\"."
        ] },
        { titulo: "Usar um documento como base para um novo", itens: [
          "Na mesma lista, toque em \"Usar como base\" (por exemplo, o mesmo equipamento no ano seguinte).",
          "O formulário volta preenchido. Confira datas, leituras e resultados, que são do serviço anterior.",
          "Toque em \"Gerar Certificado de Calibração\": sai um documento novo, com número novo. O documento de origem não muda."
        ] }
      ],
      cores: [
        { nome: "Aviso vermelho sobre padrões vencidos ou com data inválida", significado: "Esses padrões não podem ser usados em certificado. Registre o certificado da nova calibração em \"Padrões de referência\" › \"Novo certificado\"." },
        { nome: "Aviso amarelo \"vencem nos próximos 30 dias\"", significado: "Ainda podem ser usados, mas programe a recalibração." },
        { nome: "Aviso \"parece ser de outra grandeza\"", significado: "O padrão marcado no bloco é de uma grandeza diferente da do bloco. Confira se marcou o padrão certo antes de gerar." },
        { nome: "Coluna \"|Tendência| + U95\" da prévia", significado: "Soma da tendência (sem sinal) com a U95. É informação para o cliente; não é decisão de aceitação." },
        { nome: "Asterisco na resolução do certificado", significado: "A resolução não foi digitada e foi deduzida do menor passo das leituras." }
      ],
      problemas: [
        { situacao: "Aparece \"Informe um CNPJ válido (14 dígitos).\"", oQueFazer: "Digite os 14 números do CNPJ, sem ponto, barra ou traço." },
        { situacao: "Aparece \"Selecione o cliente e o equipamento antes de gerar.\"", oQueFazer: "Volte às seções 1 e 2 e confirme o cliente e o equipamento." },
        { situacao: "Aparece \"Adicione ao menos 1 bloco de ensaio.\"", oQueFazer: "Toque em \"+ Adicionar bloco de ensaio\" e preencha os pontos." },
        { situacao: "O certificado foi recusado porque o padrão estava vencido na data da calibração.", oQueFazer: "Registre o certificado novo do padrão em \"Padrões de referência\" (abra o padrão e use \"Novo certificado\") ou marque outro padrão no bloco. Sem certificado vigente, a rastreabilidade não está garantida." },
        { situacao: "Um padrão não aparece para marcar.", oQueFazer: "Ele está inativo. Reative em \"Padrões de referência\", filtro \"Inativos\"." },
        { situacao: "Os números da prévia parecem estranhos.", oQueFazer: "Confira a unidade do bloco, o padrão marcado e as leituras digitadas. Vírgula e ponto valem como separador decimal." },
        { situacao: "Ao gerar a correção apareceu \"Escreva o motivo da revisão\".", oQueFazer: "Escreva o motivo no quadro amarelo \"Correção do documento\", no alto do formulário (ao menos 10 caracteres), e toque de novo em \"Gerar Certificado de Calibração\"." },
        { situacao: "Apareceu \"O número ... já é de um documento gerado\".", oQueFazer: "Para corrigir aquele documento, use \"Abrir para corrigir\" na lista de documentos gerados. Para um documento novo, apague o número ou use outro." },
        { situacao: "O documento não aparece na lista para corrigir.", oQueFazer: "Certificados já emitidos, inclusive os de antes de 21/10/2026, aparecem na busca por CNPJ com os botões Abrir para corrigir e Usar como base: o formulário é remontado do registro do certificado. Nos antigos, só a temperatura e a umidade precisam ser digitadas de novo (o certificado guardou só a frase das condições ambientais). Certificado substituído por uma revisão não aparece na busca; ele fica no quadro do fim da tela, como substituído." }
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
          "Opcional: no quadro \"Buscar no cadastro\", acima de \"1. Cliente\", busque o cliente (nome ou CNPJ), escolha a unidade e o equipamento. Cliente, CNPJ, endereço, TAG, modelo e localização (unidade e setor) entram nos campos vazios; o que você digitou não muda. Desde 22/10/2026 o fabricante (marca) também vem do cadastro, e o nº de série do cadastro sai no documento. Se a leitura do certificado já preencheu algum desses campos, o valor do cadastro fica no lugar. No quadro \"Padrões de referência utilizados (opcional)\", logo abaixo, toque em \"Escolher padrões\" e marque todos os padrões usados (sem limite): o relatório traz uma tabela com cada um, e padrão vencido na data da calibração impede a geração, com a explicação.", "Em \"1. Cliente\", digite o CNPJ e toque em \"Buscar CNPJ\".",
          "Em \"2. Instrumento\", escolha o tipo de instrumento.",
          "Preencha TAG, marca, modelo, localização, data da calibração e técnico.",
          "Deixe \"Realizado no laboratório da Metrolabs\" marcado, a menos que a calibração tenha sido no cliente.",
          "Em \"3. Certificado e Fotos\", anexe o certificado.",
          "Se quiser, marque \"Detectar automaticamente os dados do certificado\" e confira o que foi preenchido.",
          "Anexe até 6 fotos, se tiver.",
          "Toque em \"Gerar Relatório de Calibração\".",
          "O relatório abre em nova aba e é salvo na pasta do cliente. No celular, o documento abre dentro do SGO+, com Voltar e Imprimir. Espere a mensagem \"Salvo na pasta do cliente\"."
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
        ] },
        { titulo: "Corrigir um documento já gerado (nova revisão)", itens: [
          "No fim da tela, em \"Documentos gerados: corrigir ou usar como base\", busque pelo número, cliente ou TAG.",
          "Na linha do documento, toque em \"Abrir para corrigir\". O formulário volta preenchido com tudo o que foi usado (dados digitados, textos, anexos e leituras), sem importar nada de novo.",
          "No quadro amarelo \"Correção do documento\", no alto do formulário, escreva o motivo da revisão (ao menos 10 caracteres).",
          "Altere só o que precisa e toque em \"Gerar Relatório de Calibração\". Sai a revisão seguinte (Rev. 01, 02...) com o mesmo número; o motivo, a data e o seu nome entram no histórico de revisões do documento.",
          "A revisão anterior continua guardada na pasta do cliente, com a revisão no nome do arquivo, e passa a constar como \"Substituído pela Rev. NN\" na lista.",
          "Para desistir, toque em \"Cancelar a correção e limpar o formulário\"."
        ] },
        { titulo: "Usar um documento como base para um novo", itens: [
          "Na mesma lista, toque em \"Usar como base\" (por exemplo, o mesmo equipamento no ano seguinte).",
          "O formulário volta preenchido. Confira datas, leituras e resultados, que são do serviço anterior.",
          "Toque em \"Gerar Relatório de Calibração\": sai um documento novo, com número novo. O documento de origem não muda."
        ] }
      ],
      cores: [
        { nome: "Mensagem verde \"Dados detectados automaticamente\"", significado: "O sistema leu o certificado e preencheu os campos. Revise antes de gerar." },
        { nome: "Mensagem \"Não foi possível detectar os dados automaticamente\"", significado: "Preencha os campos à mão." },
        { nome: "Aviso de texto padrão", significado: "A IA não respondeu. O relatório sai com texto padrão, com o instrumento, as normas e como ler o certificado anexado. Revise." }
      ],
      problemas: [
        { situacao: "O relatório não foi salvo na pasta.", oQueFazer: "Leia a mensagem em vermelho e tente de novo em instantes. O sistema não salva duas vezes o mesmo documento." },
        { situacao: "Aparece \"Escolha ao menos Cliente e Unidade.\" ao vincular.", oQueFazer: "Escolha o cliente e a unidade antes de tocar em \"Vincular\"." },
        { situacao: "Ao gerar a correção apareceu \"Escreva o motivo da revisão\".", oQueFazer: "Escreva o motivo no quadro amarelo \"Correção do documento\", no alto do formulário (ao menos 10 caracteres), e toque de novo em \"Gerar Relatório de Calibração\"." },
        { situacao: "Apareceu \"O número ... já é de um documento gerado\".", oQueFazer: "Para corrigir aquele documento, use \"Abrir para corrigir\" na lista de documentos gerados. Para um documento novo, apague o número ou use outro." },
        { situacao: "O documento não aparece na lista para corrigir.", oQueFazer: "Documentos gerados antes de 21/10/2026 não guardaram os dados do formulário e não entram nessa lista. O PDF continua na pasta do cliente. Para corrigir um deles, preencha o formulário e gere um documento novo." }
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
        "Cada padrão tem a tabela \"Pontos calibrados do certificado\": uma linha por ponto (ou faixa De/Até) do certificado, com U95, k e νeff de cada um. Um padrão de valor único tem 1 linha, como antes.",
        "Cada canal ou grandeza de um certificado continua sendo um cadastro próprio, com TAG, tabela de pontos e validade. Exemplo: REG-001 (CANAL1) a REG-001 (CANAL8). Todas as linhas de um cadastro ficam na mesma unidade.",
        "Cadastros com a mesma TAG base aparecem juntos num grupo.",
        "Nos números, vírgula e ponto valem como separador decimal.",
        "νeff (graus de liberdade) do certificado do padrão: deixe vazio ou 0 quando o certificado não informar ou disser ∞; 0 significa infinito."
      ],
      passos: [
        { titulo: "Encontrar um padrão", itens: [
          "Toque em \"Padrões de referência\" no menu.",
          "Toque num número do resumo (por exemplo, \"Vencidos\") para filtrar a lista. Toque de novo para voltar a \"Ativos\". Os números seguem o local, a grandeza e a busca em uso: o número tocado é a quantidade que aparece na lista.",
          "Ou digite na busca a TAG, a descrição, a série, a marca, o modelo ou o número do certificado. Acentos não importam (termometro acha Termômetro).",
          "Use os filtros \"Situação\", \"Local\" e \"Grandeza\" e o campo \"Ordenar\". A linha acima da lista diz quais filtros estão em uso.",
          "\"Todos (ativos e inativos)\" em Situação e \"Todos os locais\" em Local mostram tudo. Ao entrar de novo na tela, a lista começa sem filtro.",
          "Toque em \"Limpar filtros\" para ver tudo de novo.",
          "Toque na TAG para abrir o painel de detalhe ao lado."
        ] },
        { titulo: "Cadastrar um padrão", itens: [
          "Toque em \"Cadastrar padrão\".",
          "Preencha TAG, número do certificado, descrição e validade (dd/mm/aaaa).",
          "Em \"Pontos calibrados do certificado\", preencha os pontos (veja \"Cadastrar os pontos calibrados\" abaixo). Com um ponto só, basta U95, k e νeff.",
          "Anexe o PDF do certificado do padrão.",
          "Toque em \"Salvar padrão\".",
          "Se a TAG já existir, o sistema recusa e avisa. Use outra TAG ou edite o cadastro existente."
        ] },
        { titulo: "Cadastrar os pontos calibrados (padrão com várias faixas ou pontos)", itens: [
          "Abra o padrão e toque em \"Editar\" (aba \"Cadastro e validade\"). A tabela \"Pontos calibrados do certificado\" fica abaixo da validade.",
          "Jeito mais rápido: toque em \"Colar tabela do PDF ou planilha\", cole a tabela de resultados do certificado JUNTO com a linha de títulos e toque em \"Ler a tabela colada\". Aceita texto do PDF, Excel, Google Planilhas e CSV com ; ou |.",
          "Se o certificado já foi lido por IA antes, toque em \"Trazer da leitura já salva\". Com o PDF anexado, \"Ler os pontos do PDF com IA\" lê todas as páginas.",
          "Quando o certificado traz várias grandezas ou canais, o sistema pergunta quais linhas são deste cadastro: marque só as deste canal e toque em \"Trazer as linhas marcadas\".",
          "Para digitar: \"Adicionar ponto\" cria uma linha; \"Duplicar\" copia a linha para você trocar só o ponto e a incerteza; \"Remover\" apaga a linha. \"Mostrar faixa De/Até e resolução\" mostra as colunas de faixa (incerteza declarada para uma faixa) e resolução.",
          "Em cada linha: Ponto (o valor que se lê no padrão), Indicação e Valor de referência do certificado, Erro (indicação − referência; se o certificado der correção, use o sinal trocado), U95, k e νeff. Sem o Ponto, o sistema usa a Indicação.",
          "Abaixo da tabela aparece a conferência: a faixa calibrada, o ponto de maior incerteza e, em vermelho, cada linha com problema e o que fazer. Com problema, nada é salvo.",
          "Confira cada linha com o PDF e toque em \"Salvar alterações\". A IA e a colagem só PROPÕEM os valores: nada vai para o cálculo sem você salvar."
        ] },
        { titulo: "Novo certificado (nova calibração): renovar um padrão vencido ou a vencer", itens: [
          "Encontre o padrão, toque na TAG e depois na aba \"Novo certificado\" (ou em \"⋯\" (Mais ações) e em \"Novo certificado (nova calibração)\").",
          "Em \"1. PDF do certificado novo\", escolha o PDF (até 12 MB) e toque em \"Anexar e ler com IA\". O PDF é guardado no padrão e a IA lê todas as páginas.",
          "Se você já tinha anexado o PDF por \"Substituir PDF\", toque em \"Já anexei: ler o PDF atual com IA\".",
          "Em \"2. Confira com o PDF e salve\", confira o número do certificado, a data da calibração, a nova validade e o laboratório que a IA preencheu. Se o certificado não traz validade, informe a data definida pelo intervalo de calibração do laboratório.",
          "Confira a tabela \"Pontos calibrados do certificado novo\": a IA propõe TODOS os pontos do PDF (e pergunta o canal, se houver vários). Compare cada linha (ponto, erro, U95, k e νeff) com o PDF; corrija, duplique ou remova o que for preciso.",
          "Marque \"Conferi número, datas, incerteza (U95, k e νeff) e pontos com o PDF do certificado novo\" e toque em \"Salvar certificado novo\".",
          "O padrão volta a \"Vigente\" com a nova validade. O certificado anterior (número, validade, incerteza, tabela de pontos e PDF da época) aparece em \"Calibrações anteriores\" no Resumo; os certificados já emitidos continuam com os dados da época.",
          "Certificado com vários canais: repita para cada canal (cada canal é um cadastro com U95, k e validade próprios)."
        ] },
        { titulo: "Corrigir número ou validade digitados errado", itens: [
          "Encontre o padrão e toque em \"Editar\".",
          "Corrija o número do certificado ou a validade e toque em \"Salvar alterações\". Use este caminho só para correção; certificado de nova calibração vai por \"Novo certificado\".",
          "Para trocar só o PDF, toque em \"⋯\" (Mais ações) e em \"Substituir PDF\". O PDF anterior continua no histórico."
        ] },
        { titulo: "Completar dados, localização e foto", itens: [
          "Toque em \"⋯\" (Mais ações) e em \"Dados, localização e foto\".",
          "Se quiser, toque em \"Ler o certificado com IA\" e confira a proposta com o PDF. Sem PDF anexado, o botão fica desligado e aparece \"Anexar PDF\" ao lado.",
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
        { nome: "Selo vermelho \"Vencido\"", significado: "A validade passou. Não entra em certificado até registrar o certificado da nova calibração em \"Novo certificado\"." },
        { nome: "Selo vermelho \"Data inválida\"", significado: "A validade foi digitada errada. Corrija em \"Editar\" (dd/mm/aaaa)." },
        { nome: "Selo amarelo \"Sem validade\"", significado: "Nenhuma validade foi informada. Informe em \"Editar\"." },
        { nome: "Selo cinza \"Inativo\"", significado: "Fora de uso. Não aparece para os ensaios." },
        { nome: "Faixa vermelha \"A tabela de pontos calibrados é do certificado nº ...\"", significado: "O número do certificado mudou e a tabela de pontos ainda é do certificado anterior. O padrão não entra em certificado até alguém conferir os pontos em \"Cadastro e validade\" e salvar." },
        { nome: "Linha vermelha na tabela de pontos", significado: "Aquela linha tem um problema (número inválido, falta U95 ou k, faixa incompleta ou outra unidade). A mensagem abaixo da tabela diz o que corrigir. Nada é salvo antes." },
        { nome: "Selo amarelo \"Validade divergente\"", significado: "Os canais do mesmo grupo têm validades diferentes. Confira cada canal; o diferente vem destacado." },
        { nome: "Selo amarelo \"Lido por IA, falta conferir\"", significado: "Os dados vieram da leitura automática e ainda não foram conferidos pela equipe." },
        { nome: "Selo verde \"Conferido pela equipe\"", significado: "Alguém conferiu os dados com o certificado atual." },
        { nome: "Faixa vermelha com \"Ver vencidos\"", significado: "Mostra quantos padrões vencidos ou com data inválida existem. Com local, grandeza ou busca em uso, mostra o número desse filtro e o total geral. Toque para filtrar." },
        { nome: "Faixa amarela com \"Programar recalibração\"", significado: "Mostra quantos vencem em até 30 dias. Toque para filtrar." }
      ],
      problemas: [
        { situacao: "Quero voltar para a ficha, a aba ou a lista de antes.", oQueFazer: "Toque em voltar (o Voltar do alto no celular, o botão voltar do aparelho ou o voltar do navegador no computador). Cada toque desfaz um passo: fecha a janela de cima, volta à aba anterior ou à ficha de onde você abriu outra ficha, e devolve a lista com a mesma busca, os mesmos filtros e a mesma altura. Com texto digitado, o SGO+ pergunta antes de descartar." },
        { situacao: "Não vejo \"Editar\" nem \"Cadastrar padrão\".", oQueFazer: "Seu perfil só consulta. O cadastro é feito pela metrologia, pelos técnicos ou pela gestão." },
        { situacao: "Fechei o painel e ele perguntou se quero sair.", oQueFazer: "Havia algo digitado e não salvo. Toque em cancelar para voltar e salvar, ou confirme para descartar." },
        { situacao: "O padrão não aparece na lista.", oQueFazer: "Leia a linha acima da lista: ela diz os filtros em uso (situação, local, grandeza, busca). Toque em \"Limpar filtros\". Padrões inativos só aparecem em \"Inativos\" ou \"Todos (ativos e inativos)\"." },
        { situacao: "Apareceu \"Não foi possível montar a lista de padrões\".", oQueFazer: "Nenhum dado foi alterado. Toque em \"Atualizar lista\". Se o aviso continuar, toque em \"Limpar filtros\" e envie a mensagem do aviso ao suporte." },
        { situacao: "\"Ler o certificado com IA\" está desligado.", oQueFazer: "O padrão ainda não tem PDF anexado. Use \"Novo certificado\" (anexa e já lê) ou o botão \"Anexar PDF\" ao lado. Com PDF anexado, o botão liga na hora." },
        { situacao: "Ao colar a tabela apareceu \"Não encontrei a linha de títulos\".", oQueFazer: "Copie a tabela junto com a linha de títulos (Ponto, Indicação, Erro, U95, k, νeff...) ou digite os títulos na primeira linha, separados por ponto e vírgula, e leia de novo." },
        { situacao: "O certificado de calibração foi recusado: \"fora da faixa calibrada do padrão\".", oQueFazer: "O valor do ponto está fora dos pontos calibrados do padrão, e fora da faixa a rastreabilidade não está garantida. Confira o valor digitado; use um padrão calibrado nesse valor; ou, se o certificado do padrão cobre esse valor, inclua o ponto em \"Cadastro e validade\" e calcule de novo." },
        { situacao: "O certificado foi recusado: \"o bloco está em %UR, mas os pontos do padrão estão em °C\".", oQueFazer: "O padrão marcado é de outra grandeza ou canal. Desmarque e marque o canal certo (por exemplo, THM-002 (U) para umidade), ou corrija a unidade do bloco." },
        { situacao: "A leitura por IA deu erro.", oQueFazer: "A mensagem diz o motivo (PDF acima de 12 MB, arquivo que não é PDF, IA sem resposta). O PDF anexado continua guardado: tente de novo em \"Ler de novo com IA\" ou digite os dados conferindo com o PDF e salve." },
        { situacao: "A IA leu um número de certificado ou validade diferente do cadastro.", oQueFazer: "Na aba \"Dados, localização e foto\" o sistema só avisa. Se é o certificado de uma nova calibração, use \"Novo certificado\": ali o número e a validade lidos entram como proposta para você conferir e salvar." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA", pode: "Cadastrar, editar, anexar PDF, completar dados, inativar e reativar padrões. Gerar inventário, orçamento e relatórios." },
        { perfil: "COMERCIAL,FINANCEIRO", pode: "Só consultam. O painel abre só no Resumo." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela." }
      ],
      perguntas: [
        { p: "Por que um padrão vencido bloqueia o certificado?", r: "Sem certificado vigente do padrão, a rastreabilidade da calibração não está garantida. O certificado do cliente é recusado com a explicação." },
        { p: "Qual ponto do padrão entra no certificado de calibração?", r: "Para cada ponto medido: no mesmo valor de um ponto calibrado, U95, k e νeff desse ponto; entre dois pontos calibrados, o vizinho de maior incerteza (escolha conservadora); dentro de uma faixa De/Até do certificado, os dados da faixa. Fora da faixa calibrada a emissão é bloqueada. O certificado mostra, na seção 3, qual ponto do padrão foi usado em cada medição." },
        { p: "Posso corrigir o valor de referência pelo erro do padrão?", r: "Sim, no bloco do ensaio, em \"Correção do valor de referência\": escolha o padrão. O sistema usa leitura do padrão − erro do padrão no ponto (interpolado entre dois pontos) e mostra a leitura e a correção no certificado. O padrão é \"Não corrigir\"." },
        { p: "O que acontece com os certificados já emitidos quando cadastro os pontos?", r: "Nada. Cada certificado guarda os números da época em que foi emitido." },
        { p: "No celular dá para usar esta tela?", r: "Sim. A mesma página abre em cartões, com os filtros no botão \"Filtros\". A leitura de certificados em lote fica só no computador." },
        { p: "O histórico de PDFs some quando substituo?", r: "Não. Os PDFs anteriores ficam guardados. O painel de detalhe mostra o histórico e marca o atual." },
        { p: "O que acontece com o certificado anterior quando registro um novo?", r: "Nada é apagado. O número, a validade, a data, o laboratório, U95, k, νeff e o PDF da época ficam em \"Calibrações anteriores\" no Resumo do padrão. Os certificados de clientes já emitidos continuam apontando para a calibração da época." }
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
          "O documento emitido recebe um número (INV-aaaammdd-hhmm no inventário, ORC-aaaammdd-hhmm no orçamento) e fica salvo em HTML e PDF na pasta interna dos padrões. A prévia fica salva só em HTML.",
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
      paraQueServe: "Gera o plano de renovação e auditoria dos padrões e o relatório de desempenho da emissão de certificados de calibração, prontos para imprimir em A4. São documentos internos, com número próprio (REN-… e DES-…).",
      passos: [
        { titulo: "Gerar um relatório gerencial", itens: [
          "Toque na aba \"Relatórios gerenciais\".",
          "Em \"Plano de renovação e auditoria\", toque em \"Gerar plano\".",
          "Ou, em \"Relatório de desempenho\", escolha o \"Período\" e toque em \"Gerar relatório\".",
          "O documento abre pronto para imprimir e fica salvo em HTML e PDF na pasta \"Relatorios gerenciais dos padroes\", dentro da pasta dos certificados de calibração."
        ] }
      ]
    }
  };
}
