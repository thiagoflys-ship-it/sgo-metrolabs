/**
 * Ajuda "Como usar esta tela" — grupo Qualificacao (frente B).
 * Telas: Autoclaves, Lavadoras, Cadeia de frio, Estufa/banho-maria/secadora,
 * Relatório QI/QO/QD e Laudo NR-13.
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Texto puro, sem HTML.
 * Conferido contra a tela real (SGO_AutoRel/LavRel/CadeiaFrioRel/EstufaBanhoRel/
 * DeclaracaoExecQIQO/NR13_ConteudoModulo.js, JS_TemplateAutoclave/Lavadora.html)
 * em 17/10/2026.
 */
function SGO_ajudaTelas_Qualificacao_() {
  var CELULAR_TELA_COMPLETA = "No celular, a tela abre primeiro com uma apresentação curta. Toque em \"Abrir a tela completa\" para usar o formulário. Para enviar arquivo de registrador, prefira o computador.";
  var DETALHES = { nome: "Quadro \"Detalhes técnicos da operação\" (no fim da tela)", significado: "Lista cada ação com a hora. Linha verde: deu certo. Linha amarela: aviso, confira. Linha vermelha: erro, leia a mensagem e corrija." };
  var FAIXA_VERMELHA = { nome: "Faixa vermelha no topo da tela", significado: "Algo falhou. A própria faixa diz o que falhou e o que fazer. Corrija e tente de novo." };

  return {
    // ================================================================
    "autoclave": {
      titulo: "Autoclaves",
      paraQueServe: "Gera o relatório de qualificação térmica de uma autoclave a partir do arquivo do registrador de temperatura e pressão. O sistema calcula o F0 de cada sensor, diz se o ciclo foi aprovado ou reprovado e monta a planilha de dados (A4 deitado, com todas as leituras, gráficos e cálculos) e o relatório de ensaio (A4 em pé).",
      antesDeComecar: [
        "Tenha o arquivo exportado pelo registrador (planilha, CSV ou texto) com as leituras do ciclo.",
        "Saiba quantos sensores foram usados e qual ciclo foi rodado (121 °C, 127 °C, 134 °C ou baixa temperatura).",
        "Tenha o CNPJ do cliente e os dados da placa do equipamento (TAG, marca, modelo, número de série).",
        "Confira se os registradores usados estão cadastrados e com o certificado em dia em \"Padrões de referência\". O relatório informa o certificado e a validade de cada um.",
        "F0 é a quantidade de esterilização que o ciclo entregou, contada em minutos equivalentes a 121,1 °C. O sistema calcula sozinho; você não faz conta.",
        CELULAR_TELA_COMPLETA
      ],
      passos: [
        { titulo: "Gerar o relatório de dados (planilha)", itens: [
          "Toque em \"Autoclaves\" no menu.",
          "Toque na aba \"Gerar relatório\".",
          "Em \"1. Cliente e ensaio\", digite o CNPJ e toque em \"Buscar\".",
          "Confira o nome e o endereço que apareceram. Corrija se precisar.",
          "Preencha \"Receita / Programa\", \"Tipo de Ensaio\" e \"Ciclo Nº\".",
          "Em \"2. Equipamento\", preencha TAG, marca, modelo, número de série, lote, setor e o responsável técnico. O campo \"Operador\" já vem com o seu nome.",
          "Em \"3. Parâmetros de processo e norma\", escolha a \"Norma / ciclo alvo\" e a \"Temperatura programada\".",
          "Informe a \"Quantidade de sensores\".",
          "Em \"Sensores considerados na análise\", desmarque só o sensor que falhou durante o ensaio.",
          "Escolha a \"Remoção de ar do ciclo\" que foi usada.",
          "\"Analisar pressão\" vem ligado. Desligue só se não foi possível instalar o transmissor de pressão (autoclave de pequeno porte/cassete) e escreva a justificativa no campo que aparece. O relatório passa a considerar só a temperatura.",
          "Se um sensor ficou junto ao dreno (ponto de referência da câmara), informe o número dele em \"Sensor de referência da câmara\". É opcional.",
          "Em \"4. Dados do registrador\", escolha como os dados chegaram: \"Enviar arquivo ou informar o link\" (um arquivo com todos os sensores) ou \"Um arquivo por sensor (registradores individuais)\".",
          "Arquivo único: toque em \"Escolher arquivo\" e escolha o arquivo do registrador. O link é preenchido sozinho.",
          "Um arquivo por sensor: na grade \"Sensores considerados na análise\" (seção 3), escolha o arquivo de cada sensor marcado. Se a pressão estiver num registrador separado, envie o arquivo dele em \"Arquivo do registrador de pressão\".",
          "Toque em \"Pré-visualizar dados\".",
          "Confira na \"Prévia dos dados lidos\" se as datas, horas e temperaturas estão certas.",
          "Em \"5. Interpretação técnica do ensaio\", preencha \"Nº do ensaio (referência)\" e \"Identificação do registrador\" (TAG do cadastro de padrões, exemplo: DTL-01). A planilha usa esses dois campos: sem o registrador cadastrado e válido, ela não é gerada.",
          "Toque em \"Gerar relatório de dados (planilha)\".",
          "Responsável técnico: confirme a mensagem de aprovação. A planilha abre em nova aba e fica salva em HTML e PDF na pasta do cliente (subpasta do CNPJ), com o nome \"Planilha de dados Autoclave ...\" e o seu nome como aprovador.",
          "Técnico: a planilha vai para aprovação do responsável técnico. A minuta abre em outra aba com a faixa \"MINUTA PARA CONFERÊNCIA\" (não entregue ao cliente) e o pedido aparece em \"6. Aguardando aprovação\", com a coluna \"Documento\" = \"Planilha de dados\".",
          "Depois de emitida, use os botões \"Abrir PDF da planilha de dados\", \"Abrir pasta do cliente\" e \"Enviar ao cliente\" que aparecem abaixo do botão. Emitir de novo o mesmo número gera a revisão seguinte da planilha; as anteriores continuam na pasta.",
          "Se os dados tiverem problema (sensor com leitura impossível, sensor parado, leitura faltando, registrador sem cadastro ou vencido), a faixa vermelha diz o que corrigir e a planilha não é gerada."
        ] },
        { titulo: "Ler a planilha de dados", itens: [
          "Capa: cliente, equipamento, ciclo, data, responsáveis, registrador com certificado, validade e incerteza, e o resultado do ensaio.",
          "Sumário com o número da página de cada seção.",
          "1. Quadro-resumo: cada critério com o valor medido, o critério de aceitação, a fonte e a situação.",
          "2. Condições do ensaio, escopo, limitações e normas. 3. Resultados por sensor (mínima, máxima, média, desvio-padrão, tempo na faixa, horário em que atingiu a temperatura, F0) e por fase do ciclo.",
          "4. Gráficos: perfil térmico com as fases, detalhe da exposição com a faixa de esterilização, F0 acumulado, pressão e vapor saturado (só com \"Analisar pressão\" ligado) e o mapa do sensor mais frio ao mais quente.",
          "5. Memória de cálculo passo a passo: F0, vapor saturado, tempo de equilíbrio e incerteza. 6. Não conformidades e observações. 7. Assinaturas.",
          "8. Leituras da fase de exposição, folha a folha, com o cabeçalho em todas as folhas. Com mais de 12 sensores, a tabela vem em blocos de sensores. Anexo A: as demais leituras, em formato compacto. Anexo B: alinhamento dos registradores (um arquivo por sensor)."
        ] },
        { titulo: "Gerar o relatório de ensaio (interpretação técnica, A4)", itens: [
          "Gere antes o relatório de dados (tarefa acima) com os mesmos dados.",
          "Em \"5. Interpretação técnica do ensaio\", preencha \"Nº do ensaio (referência)\" e \"Revisão\".",
          "Em \"Identificação do registrador\", digite a TAG do registrador como está no cadastro de padrões (exemplo: DTL-01, DTL-06).",
          "Se quiser, anexe até 4 fotos com legenda.",
          "Toque em \"Gerar rascunho da interpretação\". Pode levar até um minuto e meio.",
          "Se aparecer a caixa vermelha \"O relatório não pode ser emitido\", leia cada item: o que aconteceu, por quê e como corrigir. Corrija e gere o rascunho de novo. Nada é redigido enquanto houver problema nos dados.",
          "Leia os textos que apareceram em \"Revise os textos antes de confirmar\". Corrija o que precisar. O resultado (aprovado ou reprovado) é o calculado: texto que diga outra coisa é recusado.",
          "Técnico: toque em \"Enviar para aprovação do responsável técnico\". O pedido aparece em \"6. Aguardando aprovação\".",
          "Responsável técnico: marque \"Conferi os dados, os critérios e os textos e aprovo a emissão\" e toque em \"Aprovar e emitir\". Ou, em \"6. Aguardando aprovação\", toque em \"Ver prévia\", confira e toque em \"Aprovar e emitir\" (ou \"Devolver\", com o motivo).",
          "O documento abre em nova aba e fica salvo em HTML e PDF na pasta do cliente, com o nome de quem aprovou. Para enviar ao cliente, use \"Enviar ao cliente\" na faixa verde do documento.",
          "Emitir de novo o mesmo número gera a revisão seguinte (Revisão 1, 2...). As revisões anteriores continuam na pasta."
        ] },
        { titulo: "Gerar a memória de cálculo do F0", itens: [
          "Gere o rascunho da interpretação (tarefa acima).",
          "Toque em \"Gerar a memória do F0\".",
          "O documento mostra, leitura a leitura, a temperatura e o F0 somado de cada sensor. Ele não usa IA e fica salvo na pasta do cliente."
        ] },
        { titulo: "Avaliar um teste de estanqueidade (vazamento da câmara)", itens: [
          "Preencha as seções 1 a 4 como no relatório de dados.",
          "Marque \"Este relatório é um teste de estanqueidade (pressão/vácuo da câmara)\".",
          "Informe o início e o fim do teste e a unidade de pressão do registrador.",
          "Toque em \"Gerar relatório de dados (planilha)\". O sistema calcula a taxa de vazamento em mbar/min e a planilha mostra a conta passo a passo e as leituras da janela do teste. O limite aceito é 1,3 mbar/min, numa janela de pelo menos 10 min.",
          "Se a pressão cair na janela, o sistema avisa: a janela informada não é a fase de espera (câmara isolada). Corrija os horários.",
          "O teste de estanqueidade não aparece com \"Analisar pressão\" desligado."
        ] },
        { titulo: "Preencher o modelo oficial (folha de identificação)", itens: [
          "Toque na aba \"Preencher modelo\".",
          "Preencha número do relatório, data do ciclo, cliente, local, equipamento e o resultado.",
          "Toque em \"Gerar documento e PDF\".",
          "Se o modelo oficial ainda não foi importado, sai a folha no modelo padrão do SGO+. Para usar o modelo oficial, peça ao administrador para importar o documento-modelo."
        ] },
        { titulo: "Reabrir documentos e arquivos", itens: [
          "Toque em \"Relatórios emitidos\" para abrir a pasta dos relatórios.",
          "Toque em \"Arquivos dos registradores\" para abrir a pasta com os arquivos enviados."
        ] }
      ],
      cores: [
        { nome: "Selo verde \"Último ciclo: aprovado\"", significado: "Todos os critérios foram atendidos. Nos ciclos a vapor, o menor F0 entre os sensores ficou igual ou acima de 15,00 min." },
        { nome: "Selo vermelho \"Último ciclo: reprovado\"", significado: "Algum critério não foi atendido, por exemplo F0 abaixo de 15,00 min ou exposição não identificada. O motivo aparece no relatório e em \"Detalhes técnicos da operação\"." },
        { nome: "Selo vermelho \"Falha na geração\"", significado: "O relatório não foi gerado. Leia a faixa vermelha no topo, corrija e gere de novo." },
        { nome: "Selo verde \"Pronto\"", significado: "A tela está carregada e pronta para uso." },
        { nome: "Selo laranja \"Relatório interno\"", significado: "O modo de dados reconstituídos está ligado. Só o administrador usa. O documento sai com a faixa \"uso interno\" e não vai para a pasta do cliente." },
        { nome: "Observação \"próximo do limite\" no relatório", significado: "O F0 passou do mínimo, mas por menos de 10%. O ciclo é aprovado e o relatório registra a observação." },
        { nome: "Caixa vermelha \"O relatório não pode ser emitido\"", significado: "Os dados têm problema (sensor com leitura impossível, sensor parado, pico na exposição, leitura faltando, poucas leituras, registrador sem cadastro ou vencido). Cada item diz como corrigir." },
        { nome: "Critério \"Não avaliado\" no relatório", significado: "Os dados não permitiram avaliar aquele critério (por exemplo, tempo de equilíbrio com leitura a cada 30 s). Não aprova nem reprova; o motivo está escrito." },
        { nome: "Cores nas leituras da planilha de dados", significado: "Fundo azul: menor temperatura da linha. Fundo laranja: maior temperatura da linha. Número vermelho: leitura do patamar fora da faixa de esterilização. Linha cinza: leitura depois do patamar (descida final), que entra no F0 mas fica fora dos critérios de tempo e de faixa." },
        { nome: "Faixa \"MINUTA PARA CONFERÊNCIA\" na planilha", significado: "A planilha ainda não foi aprovada pelo responsável técnico. Não entregue ao cliente." },
        FAIXA_VERMELHA,
        DETALHES
      ],
      problemas: [
        { situacao: "A prévia mostra datas trocadas (dia no lugar do mês).", oQueFazer: "Em \"Formato da data no arquivo\", escolha \"Brasil (DD/MM/AAAA)\" ou \"Americano (MM/DD/AAAA)\" e toque de novo em \"Pré-visualizar dados\"." },
        { situacao: "A prévia mostra as colunas misturadas.", oQueFazer: "Em \"Separador das colunas\", escolha o separador do arquivo (tabulação, ponto e vírgula, vírgula ou espaços) e pré-visualize de novo." },
        { situacao: "Um sensor mostra temperatura absurda (por exemplo, abaixo de zero) no início.", oQueFazer: "É leitura de sensor desconectado. O gráfico já deixa essa leitura de fora da escala e avisa na legenda. Se o sensor falhou o ciclo inteiro, desmarque-o em \"Sensores considerados na análise\" e registre o motivo." },
        { situacao: "Reprovado com \"exposição não identificada\".", oQueFazer: "Algum sensor não chegou à temperatura de exposição. Confira se a \"Temperatura programada\" está certa e se o arquivo é do ciclo certo. Não altere os \"Ajustes avançados da análise\" sem orientação do responsável técnico." },
        { situacao: "O relatório diz que o certificado do registrador está vencido ou que o registrador não está cadastrado.", oQueFazer: "Atualize o padrão em \"Padrões de referência\" e gere de novo. Confira se a TAG em \"Identificação do registrador\" está escrita igual ao cadastro." },
        { situacao: "O rascunho abriu com aviso de que a IA não está disponível ou de que o texto não passou na conferência.", oQueFazer: "O rascunho vem com o texto padrão, montado só com os resultados calculados. Revise, complete se quiser e siga para a aprovação. A chave da IA é configurada pelo administrador em \"Chaves e senhas\"." },
        { situacao: "Ao emitir, aparece \"Os textos revisados não podem ser emitidos\".", oQueFazer: "O texto diz um resultado diferente do calculado, cita norma fora da lista ou cita pressão num ensaio só de temperatura. Corrija o trecho indicado e emita de novo." },
        { situacao: "Um arquivo por sensor: aviso de leitura faltando na exposição.", oQueFazer: "O arquivo daquele sensor não cobre todo o ciclo ou o relógio do registrador estava fora de hora. Confira o arquivo; se o sensor falhou, desmarque-o e registre a falha." },
        { situacao: "Aviso \"Pressão incompatível com a temperatura\".", oQueFazer: "A coluna de pressão provavelmente está em bar relativo, kPa ou mbar. O ciclo usa bar absoluto: converta a coluna e envie de novo." },
        { situacao: "A planilha de dados não gera e diz que o registrador não foi informado ou não está no cadastro.", oQueFazer: "Preencha \"Identificação do registrador\" na seção 5 com a TAG do cadastro de padrões e gere de novo. Se o certificado venceu, atualize em \"Padrões de referência\"." },
        { situacao: "A planilha não abriu em outra aba.", oQueFazer: "O navegador bloqueou a nova aba. Permita janelas do SGO+ no navegador e gere de novo; a planilha emitida também fica na pasta do cliente (botão \"Abrir PDF da planilha de dados\")." },
        { situacao: "Apareceu a janela \"Tela sem uso\".", oQueFazer: "Toque em \"Continuar\". O que você preencheu continua na tela." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA", pode: "Gerar planilha, rascunho do relatório de ensaio, memória do F0 e folha do modelo." },
        { perfil: "ADMIN,DIRETORIA,GESTOR,METROLOGIA", pode: "Aprovar e emitir o relatório de ensaio e a planilha de dados (responsável técnico), ver a prévia dos pedidos e devolver com o motivo." },
        { perfil: "TECNICO", pode: "Envia o relatório de ensaio e a planilha de dados para aprovação do responsável técnico." },
        { perfil: "ADMIN", pode: "Também usa o \"Relatório interno\" (dados reconstituídos, com senha administrativa)." },
        { perfil: "COMERCIAL,FINANCEIRO", pode: "A tela abre, mas a emissão é tarefa da equipe técnica." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela. Recebe o relatório pela Metrolabs ou consulta em \"Arquivo de documentos\"." }
      ],
      perguntas: [
        { p: "Qual a diferença entre o relatório de dados e o relatório de ensaio?", r: "O relatório de dados é a planilha de dados (A4 deitado) com todas as leituras, estatísticas, gráficos e a memória de cálculo. O relatório de ensaio (interpretação técnica) é o documento A4 em pé para o cliente, com identificação, critérios, resultados, análise, conclusão e assinaturas. Os números dos dois são os mesmos; gere sempre os dois com os mesmos dados e o mesmo número." },
        { p: "E a planilha antiga do Google Planilhas?", r: "Foi guardada sem mudança e está desligada. Só o responsável pelo sistema pode voltar a usá-la, em \"Chaves e senhas\", grupo \"Relatórios técnicos\", item \"Autoclave: modelo da planilha de dados\". Planilhas já emitidas no modelo antigo continuam na pasta do cliente como estão." },
        { p: "Existe \"aprovado com alerta\"?", r: "Não. Abaixo do mínimo da norma o ciclo é reprovado. Acima do mínimo, mas perto dele, o ciclo é aprovado e o relatório registra a observação \"próximo do limite\"." },
        { p: "Numa campanha com vários ciclos, como faço?", r: "Gere uma planilha e uma interpretação para cada ciclo, mudando o \"Ciclo Nº\" e o \"Nº do ensaio (referência)\"." },
        { p: "Os ciclos de baixa temperatura usam F0?", r: "Não. Nos ciclos de 55 °C e 60 °C o resultado é avaliado pela temperatura na faixa do ciclo. O F0 vale para os ciclos a vapor de 121 °C, 127 °C e 134 °C." }
      ],
      secoesManual: [
        { titulo: "Termos usados nesta tela", paragrafos: [
          "Registrador (datalogger): aparelho que grava a temperatura e a pressão de cada sensor ao longo do ciclo.",
          "Exposição: parte do ciclo em que a câmara fica na temperatura de esterilização. O sistema identifica o início e o fim sozinho.",
          "F0: quantidade de esterilização entregue, em minutos equivalentes a 121,1 °C. Cada leitura soma uma parcela; quanto mais quente, maior a parcela. O mínimo exigido nos ciclos a vapor é 15,00 min no pior sensor.",
          "Teste de estanqueidade: verifica se a câmara segura o vácuo. O resultado é a taxa de vazamento, em mbar por minuto.",
          "QI, QO e QD: qualificação de instalação (o local e as ligações estão certos), de operação (o equipamento funciona vazio como especificado) e de desempenho (o equipamento entrega o resultado com carga)."
        ] }
      ]
    },

    // ================================================================
    "lavadora": {
      titulo: "Lavadoras",
      paraQueServe: "Gera o relatório de qualificação de termodesinfectoras e lavadoras ultrassônicas a partir do arquivo do registrador. Na termodesinfectora o sistema calcula o A0 de cada sensor. Na ultrassônica avalia o tempo de cavitação.",
      antesDeComecar: [
        "Tenha o arquivo exportado pelo registrador com as leituras do ciclo.",
        "Saiba se o artigo processado é crítico ou semicrítico/não crítico. Isso muda o mínimo de A0.",
        "Tenha o CNPJ do cliente e os dados da placa do equipamento.",
        "A0 é a quantidade de desinfecção térmica que o ciclo entregou, contada em segundos equivalentes a 80 °C. O sistema calcula sozinho.",
        "Confira se os registradores usados estão com o certificado em dia em \"Padrões de referência\".",
        CELULAR_TELA_COMPLETA
      ],
      passos: [
        { titulo: "Gerar o relatório de dados (planilha)", itens: [
          "Toque em \"Lavadoras\" no menu.",
          "Toque na aba \"Gerar relatório\".",
          "Em \"1. Cliente e ensaio\", digite o CNPJ e toque em \"Buscar\".",
          "Preencha \"Receita / Programa\", \"Tipo de Ensaio\" e o número do ciclo.",
          "Em \"2. Equipamento\", preencha TAG, marca, modelo, número de série, lote, setor e o responsável técnico.",
          "Em \"3. Parâmetros de processo e receita\", escolha o \"Equipamento a validar\": termodesinfectora ou lavadora ultrassônica.",
          "Na termodesinfectora, escolha a \"Classificação do artigo processado\".",
          "Informe a \"Temp. Alvo da Receita (°C)\" e a \"Quantidade de Sensores\".",
          "Em \"Sensores considerados na análise\", desmarque só o sensor que falhou.",
          "Em \"4. Dados do registrador\", escolha como enviar os dados e toque em \"Escolher arquivo\".",
          "Se cada sensor gravou um arquivo, escolha \"Um arquivo por sensor (registrador individual)\" e envie um arquivo por sensor.",
          "Toque em \"Pré-visualizar dados\" e confira as leituras.",
          "Toque em \"Gerar relatório de dados (planilha)\".",
          "Espere o selo do resultado e os botões \"Abrir planilha de dados\" e \"Baixar relatório (PDF)\".",
          "O PDF da planilha também fica salvo na pasta do cliente (subpasta do CNPJ), com o nome \"Relatório de dados ...\"; a frase abaixo dos botões confirma o nome do arquivo ou diz por que não salvou."
        ] },
        { titulo: "Gerar o relatório de ensaio (interpretação técnica, A4)", itens: [
          "Gere antes o relatório de dados com os mesmos dados.",
          "Em \"5. Interpretação técnica do ensaio\", preencha \"Nº do ensaio (referência)\", \"Revisão\" e \"Identificação do registrador\" (a TAG do cadastro de padrões).",
          "Se quiser, anexe até 4 fotos com legenda.",
          "Toque em \"Gerar rascunho da interpretação\".",
          "Leia e corrija os textos em \"Revise os textos antes de confirmar\".",
          "Toque em \"Confirmar e gerar a interpretação\".",
          "O documento abre em nova aba e fica salvo em HTML e PDF na pasta do cliente. Na termodesinfectora ele traz o anexo \"Memória de cálculo do A0\"."
        ] },
        { titulo: "Preencher o modelo oficial (folha de identificação)", itens: [
          "Toque na aba \"Preencher modelo\".",
          "Em \"Tipo de equipamento\", escolha termodesinfectora ou lavadora ultrassônica.",
          "Preencha os campos e o resultado.",
          "Toque em \"Gerar relatório da termodesinfectora\" ou \"Gerar relatório da lavadora ultrassônica\"."
        ] }
      ],
      cores: [
        { nome: "Selo verde \"Último ciclo: aprovado\"", significado: "O menor A0 entre os sensores atingiu o mínimo da classificação escolhida (ou o tempo de cavitação foi atendido, na ultrassônica)." },
        { nome: "Selo vermelho \"Último ciclo: reprovado\"", significado: "Algum critério não foi atendido. Exemplo: A0 de 1.511,98 s num artigo crítico, que exige 3.000 s." },
        { nome: "Selo vermelho \"Falha na geração\"", significado: "O relatório não foi gerado. Leia a faixa vermelha no topo." },
        { nome: "Selo laranja \"Relatório interno\"", significado: "Modo de dados reconstituídos, só do administrador. Não vai para a pasta do cliente." },
        FAIXA_VERMELHA,
        DETALHES
      ],
      problemas: [
        { situacao: "Não sei qual classificação escolher.", oQueFazer: "Artigo crítico é o que entra em tecido estéril ou na corrente sanguínea (exige A0 de 3.000 s). Semicrítico ou não crítico é o que toca mucosa ou pele (A0 de 600 s). Na dúvida, pergunte ao responsável técnico do cliente antes de gerar." },
        { situacao: "O mesmo ensaio aprovou como semicrítico e reprovou como crítico.", oQueFazer: "Está correto: o mínimo de A0 muda com a classificação. Use a classificação real do artigo processado." },
        { situacao: "A prévia mostra datas trocadas.", oQueFazer: "Em \"Padrão de Data\", escolha \"Brasil (DD/MM/AAAA)\" ou \"USA (MM/DD/AAAA)\" e pré-visualize de novo." },
        { situacao: "A temperatura alvo não é aceita.", oQueFazer: "A faixa permitida é de 20 °C a 100 °C. Digite o valor da receita do equipamento." },
        { situacao: "O rascunho abriu com aviso de que a IA não está disponível.", oQueFazer: "Revise o texto padrão, complete à mão e confirme. A chave da IA é configurada pelo administrador." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA", pode: "Gerar planilha, relatório de ensaio e folha do modelo." },
        { perfil: "ADMIN", pode: "Também usa o \"Relatório interno\" (com senha administrativa)." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela." }
      ],
      perguntas: [
        { p: "O A0 é calculado em todo o ciclo?", r: "Não. É calculado só na fase principal de desinfecção. É um resultado conservador, e o relatório explica isso na metodologia." },
        { p: "Existe \"aprovado com alerta\"?", r: "Não. Abaixo do mínimo exigido o ciclo é reprovado." },
        { p: "Qual norma a ultrassônica cita?", r: "A ABNT NBR 17130-1:2024 entra nas referências. O critério de aprovação é o tempo de cavitação do protocolo." }
      ],
      secoesManual: [
        { titulo: "Termos usados nesta tela", paragrafos: [
          "A0: quantidade de desinfecção térmica entregue, em segundos equivalentes a 80 °C. Cada leitura soma uma parcela; quanto mais quente, maior a parcela.",
          "Mínimo de A0 (ABNT NBR ISO 15883-1, Anexo B): 600 s para artigo semicrítico ou não crítico; 3.000 s para artigo crítico.",
          "Cavitação: formação de microbolhas pelo ultrassom, que fazem a limpeza na lavadora ultrassônica.",
          "Memória de cálculo do A0: anexo com o resumo por sensor e a conta leitura a leitura do pior sensor."
        ] }
      ]
    },

    // ================================================================
    "cadeia_frio": {
      titulo: "Cadeia de frio",
      paraQueServe: "Gera a qualificação térmica de refrigeradores, câmaras de conservação, câmaras frias, freezers, ultrafreezers e caixas térmicas (ABNT NBR 16328:2023, Anexo G). O sistema lê o arquivo do registrador, avalia cada estudo e monta a planilha e o certificado A4.",
      antesDeComecar: [
        "Tenha o arquivo do registrador com todo o período gravado (normalmente 24 horas ou mais).",
        "Anote os horários de início e fim de cada estudo feito: distribuição, abertura de porta, queda de energia ou autonomia.",
        "Tenha o CNPJ do cliente e os dados da placa do equipamento.",
        "Confira se os registradores estão com o certificado em dia em \"Padrões de referência\".",
        CELULAR_TELA_COMPLETA
      ],
      passos: [
        { titulo: "Preencher cliente e equipamento", itens: [
          "Toque em \"Cadeia de frio\" no menu.",
          "Em \"1. Cliente\", digite o CNPJ e toque em \"Buscar CNPJ\".",
          "Confira razão social e endereço.",
          "Preencha \"Responsável técnico (assinatura do laudo)\".",
          "Em \"2. Equipamento\", escolha o \"Perfil do equipamento\" antes de tudo. A tela muda conforme o perfil.",
          "Preencha TAG, marca, modelo, número de série, localização e volume.",
          "Marque \"Equipamento conjugado\" só se for um aparelho com duas partes (por exemplo, refrigerador com freezer).",
          "Confira a faixa mínima, a faixa máxima e a tolerância."
        ] },
        { titulo: "Marcar os estudos feitos", itens: [
          "Em \"3. Estudos do ensaio\", em \"Incluir estudo de distribuição?\", escolha \"Sim — em vazio\" ou \"Sim — com carga\".",
          "Digite o início e o fim do estudo no formato dd/MM/aaaa HH:mm:ss.",
          "Se o equipamento começou fora da faixa, toque em \"Detectar rampa automaticamente\" e confirme o horário sugerido.",
          "Se fez abertura de porta, marque \"Incluir estudo de abertura de porta neste laudo\" e preencha o horário do evento.",
          "Se fez queda de energia, marque \"Incluir estudo de queda de energia neste laudo\" e preencha o horário.",
          "Na caixa térmica, marque \"Incluir estudo de autonomia neste laudo\" e informe o período gravado.",
          "Em \"Sensores\", confira o \"Nº de sensores instalados\" e desmarque só o sensor que falhou."
        ] },
        { titulo: "Enviar os dados e gerar a planilha", itens: [
          "Em \"4. Dados do registrador\", confira o \"Formato de data nos arquivos\".",
          "Em \"Como enviar os dados\", escolha \"Arquivo do registrador (enviar ou informar o link)\".",
          "Toque em \"Escolher arquivo\" e escolha o arquivo. O campo do link é preenchido sozinho.",
          "Toque em \"Pré-visualizar dados\".",
          "Confira o período importado (início e fim) e os sensores detectados.",
          "Em \"5. Relatório de dados (planilha)\", toque em \"Gerar relatório de dados (planilha)\".",
          "Confira o selo do laudo e o selo de cada estudo.",
          "Toque em \"Abrir planilha\" ou em \"Baixar PDF\".",
          "O PDF da planilha também fica salvo na pasta do cliente (subpasta do CNPJ), com o nome \"Relatório de dados ...\"; a frase abaixo dos botões confirma o nome do arquivo ou diz por que não salvou."
        ] },
        { titulo: "Gerar o certificado de qualificação térmica (A4)", itens: [
          "Gere antes a planilha, com os mesmos dados.",
          "Em \"6. Certificado de qualificação térmica\", preencha \"Número do certificado\" e \"Revisão\".",
          "Em \"Identificação do registrador\", digite a TAG do cadastro de padrões (exemplo: DTL-01, DTL-06).",
          "Preencha \"Responsável pelo aceite (cliente)\".",
          "Se quiser, anexe até 4 fotos.",
          "Toque em \"Gerar rascunho do certificado\".",
          "Leia e corrija a introdução, o objetivo, as análises e a conclusão.",
          "Toque em \"Confirmar e gerar o certificado\".",
          "O documento abre em nova aba e fica salvo em HTML e PDF na pasta do cliente."
        ] }
      ],
      cores: [
        { nome: "Selo verde \"LAUDO: APROVADO\"", significado: "Todas as leituras ficaram dentro da faixa em todos os estudos com critério." },
        { nome: "Selo verde \"LAUDO: APROVADO (COM OBSERVAÇÃO)\"", significado: "Houve saída da faixa, mas dentro da tolerância declarada. O equipamento está aprovado. No certificado sai \"Aprovado\" e a saída aparece em Observações. Na planilha sai \"APROVADO (COM OBSERVAÇÃO)\"; não existe \"aprovado com alerta\"." },
        { nome: "Selo vermelho \"LAUDO: REPROVADO\"", significado: "Saiu da faixa além da tolerância, ou rompeu antes do tempo-alvo de porta ou energia. Avise o responsável técnico." },
        { nome: "Selo cinza \"INFORMATIVO\" ou \"CARACTERIZACAO\"", significado: "Estudo sem critério de aprovação, por exemplo porta ou energia sem tempo-alvo, ou a autonomia da caixa térmica. Só registra os tempos medidos." },
        { nome: "Faixa mínima e máxima em cinza (sem digitar)", significado: "Perfil com faixa fixa de 2 °C a 8 °C (câmara de conservação, refrigerador comum, caixa térmica). É de propósito." },
        FAIXA_VERMELHA,
        DETALHES
      ],
      problemas: [
        { situacao: "O selo geral ficou vermelho, mas só um estudo reprovou.", oQueFazer: "É a regra: o selo do laudo é o pior resultado entre os estudos. Veja o selo de cada estudo e o motivo em \"Detalhes técnicos da operação\"." },
        { situacao: "Não aparece o bloco de abertura de porta ou queda de energia.", oQueFazer: "O perfil escolhido não usa esse estudo. Na caixa térmica só existe a autonomia. Confira se o perfil está certo." },
        { situacao: "O período importado está com dia e mês trocados.", oQueFazer: "Em \"Formato de data nos arquivos\", escolha o formato do registrador e pré-visualize de novo." },
        { situacao: "Cada sensor gravou um arquivo separado.", oQueFazer: "Em \"Como enviar os dados\", escolha \"Um arquivo por sensor (registrador individual)\". Cada sensor marcado em \"Sensores\" ganha um campo de envio." },
        { situacao: "Mudei dados depois de gerar o rascunho do certificado.", oQueFazer: "Gere a planilha de novo e depois toque outra vez em \"Gerar rascunho do certificado\"." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA", pode: "Gerar planilha e certificado." },
        { perfil: "ADMIN", pode: "Também usa o \"Relatório interno\" (dados reconstituídos, com senha administrativa)." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela." }
      ],
      perguntas: [
        { p: "Preciso usar o número de sensores sugerido?", r: "Não. O sistema sugere 3 sensores para volume abaixo de 60 L e 12 nos demais casos ou no conjugado. Você pode mudar. Confira o número com o protocolo do cliente." },
        { p: "O que é a rampa de estabilização?", r: "É o tempo inicial em que o equipamento ainda está esfriando. As leituras dessa fase aparecem no gráfico, mas não contam para o resultado." },
        { p: "Quais normas o certificado cita?", r: "A ABNT NBR 16328, Anexo G, e a RDC nº 430/2020 da Anvisa. Na câmara de conservação de vacinas também o Manual de Rede de Frio do Ministério da Saúde." }
      ],
      secoesManual: [
        { titulo: "Termos usados nesta tela", paragrafos: [
          "Faixa operacional: temperaturas mínima e máxima aceitas para o equipamento.",
          "Tolerância: margem declarada em volta da faixa. Uma saída dentro dela vira observação, não reprovação.",
          "Tempo-alvo mínimo: tempo que o equipamento precisa aguentar dentro da faixa depois de abrir a porta ou faltar energia. Sem esse valor, o estudo só registra os tempos.",
          "Autonomia: quanto tempo a caixa térmica mantém 2 °C a 8 °C sem energia."
        ] }
      ]
    },

    // ================================================================
    "estufa_banhomaria": {
      titulo: "Estufa, banho-maria e secadora",
      paraQueServe: "Gera a qualificação térmica de estufas de incubação, banhos-maria, estufas de esterilização ou despirogenização e secadoras de traqueias da CME (ABNT NBR 16328). O sistema lê o arquivo do registrador, avalia cada estudo e monta a planilha e o certificado A4.",
      antesDeComecar: [
        "Tenha o arquivo do registrador com todo o período gravado.",
        "Anote os horários de início e fim de cada estudo e de cada repetição.",
        "Na estufa de esterilização ou despirogenização, tenha o resultado do indicador biológico ou do ensaio de endotoxina de cada repetição, e o registro impresso do ciclo.",
        "Tenha o CNPJ do cliente e os dados da placa do equipamento.",
        CELULAR_TELA_COMPLETA
      ],
      passos: [
        { titulo: "Preencher cliente e equipamento", itens: [
          "Toque em \"Estufa, banho-maria e secadora\" no menu.",
          "Em \"1. Cliente\", digite o CNPJ e toque em \"Buscar CNPJ\".",
          "Preencha \"Responsável técnico (assinatura do laudo)\".",
          "Em \"2. Equipamento\", escolha o \"Perfil do equipamento\" antes de tudo.",
          "Preencha TAG, marca, modelo, número de série, localização e volume.",
          "Confira a faixa mínima, a faixa máxima e a tolerância. Os valores são sugestões: confirme com o protocolo do cliente."
        ] },
        { titulo: "Marcar os estudos feitos", itens: [
          "Em \"3. Estudos do ensaio\", inclua só os estudos que foram realmente feitos.",
          "Estufa de incubação e banho-maria: preencha a distribuição de temperatura (início e fim).",
          "Banho-maria: responda \"Utilizou tampa durante o ensaio?\" e a \"Quantidade de líquido na cuba (observação)\".",
          "Estufa de incubação: se fez, inclua abertura de porta e queda de energia.",
          "Estufa de esterilização ou despirogenização: preencha as 3 repetições da distribuição em vazio e as 3 da penetração com carga.",
          "Em cada repetição com carga, informe o resultado de laboratório, o lote, a validade e o laboratório. Anexe o laudo, se tiver.",
          "Na despirogenização, anexe o registro impresso do ciclo do equipamento.",
          "Secadora de traqueias: preencha os três estudos em vazio e os três com carga, com início, duração e temperatura de trabalho.",
          "Em \"Sensores\", informe o \"Nº de sensores instalados\" e marque os sensores usados."
        ] },
        { titulo: "Enviar os dados e gerar a planilha", itens: [
          "Em \"4. Dados do registrador\", confira o \"Formato de data nos arquivos\".",
          "Escolha \"Arquivo do registrador (enviar ou informar o link)\" e toque em \"Escolher arquivo\".",
          "Se o arquivo tem várias abas, digite o nome da aba do ensaio em \"Nome da aba de dados (opcional)\".",
          "Toque em \"Pré-visualizar dados\" e confira o período importado.",
          "Toque em \"Gerar relatório de dados (planilha)\".",
          "Confira os selos e toque em \"Abrir planilha\" ou \"Baixar PDF\".",
          "O PDF da planilha também fica salvo na pasta do cliente (subpasta do CNPJ), com o nome \"Relatório de dados ...\"; a frase abaixo dos botões confirma o nome do arquivo ou diz por que não salvou."
        ] },
        { titulo: "Gerar o certificado de qualificação térmica (A4)", itens: [
          "Em \"6. Certificado de qualificação térmica\", preencha número, revisão, \"Identificação do registrador\" (TAG do cadastro de padrões) e o responsável pelo aceite.",
          "Toque em \"Gerar rascunho do certificado\".",
          "Leia e corrija os textos.",
          "Toque em \"Confirmar e gerar o certificado\".",
          "O documento abre em nova aba e fica salvo em HTML e PDF na pasta do cliente."
        ] }
      ],
      cores: [
        { nome: "Selo verde \"LAUDO: APROVADO\"", significado: "Todos os estudos com critério foram atendidos." },
        { nome: "Selo verde \"LAUDO: APROVADO (COM OBSERVAÇÃO)\"", significado: "Houve saída da faixa dentro da tolerância declarada. O equipamento está aprovado; a saída vai para Observações do certificado e da planilha. Não existe \"aprovado com alerta\"." },
        { nome: "Selo vermelho \"LAUDO: REPROVADO\"", significado: "Saiu da faixa além da tolerância, uma repetição reprovou ou o laboratório reprovou o indicador. Avise o responsável técnico." },
        { nome: "Selo cinza \"INFORMATIVO\" ou \"CARACTERIZACAO\"", significado: "Estudo sem critério de aprovação, por exemplo porta ou energia sem tempo-alvo." },
        FAIXA_VERMELHA,
        DETALHES
      ],
      problemas: [
        { situacao: "A repetição tem FH ou FD acima da meta, mas saiu reprovada.", oQueFazer: "O resultado do laboratório (indicador biológico ou endotoxina) vale mais que o cálculo. Se o laboratório reprovou, a repetição é reprovada." },
        { situacao: "O sistema avisa que falta o registro impresso do ciclo.", oQueFazer: "Na despirogenização a norma exige esse registro. Anexe o PDF ou a foto do papel impresso pelo equipamento." },
        { situacao: "O sistema informou várias abas no arquivo.", oQueFazer: "Copie o nome exato da aba do ensaio em \"Nome da aba de dados (opcional)\" e pré-visualize de novo." },
        { situacao: "Não aparece o estudo que eu fiz.", oQueFazer: "O perfil escolhido não usa esse estudo. Confira o perfil do equipamento." },
        { situacao: "Mudei sensores depois de gerar o certificado.", oQueFazer: "Gere a planilha de novo e depois gere os textos do certificado de novo." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA", pode: "Gerar planilha e certificado." },
        { perfil: "ADMIN", pode: "Também usa o \"Relatório interno\" (dados reconstituídos, com senha administrativa)." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela." }
      ],
      perguntas: [
        { p: "Por que a estufa de esterilização tem 3 repetições?", r: "A norma pede 3 repetições independentes. Se qualquer uma reprovar, o estudo é reprovado." },
        { p: "O que são FH e FD?", r: "FH é o efeito esterilizante do calor seco, em minutos equivalentes. FD é o mesmo para a destruição de endotoxinas (despirogenização). Em branco, o valor mínimo exigido é o padrão de 30 min." }
      ],
      secoesManual: [
        { titulo: "Perfis e estudos", paragrafos: [
          "Estufa de incubação (Anexo F): distribuição de temperatura (24 horas recomendadas), abertura de porta e queda de energia.",
          "Banho-maria (Anexo I): distribuição de temperatura, com registro do uso de tampa e da quantidade de líquido.",
          "Estufa de esterilização ou despirogenização (Anexo E): distribuição em vazio e penetração com carga, cada uma com 3 repetições.",
          "Secadora de traqueias da CME: três estudos em vazio e três com carga, com temperatura, tolerância e duração editáveis."
        ] }
      ]
    },

    // ================================================================
    "declaracao_qiqo": {
      titulo: "Relatório QI/QO/QD",
      paraQueServe: "Gera o relatório de qualificação de instalação (QI), de operação (QO) e de desempenho (QD) de um equipamento, com texto redigido pela IA a partir dos itens que você marcou, das fotos e dos certificados anexados.",
      antesDeComecar: [
        "QI confere se o local e as ligações estão certos (energia, água, dreno, espaço). QO confere se o equipamento funciona como especificado (ciclos, travas, alarmes). QD usa os certificados de calibração dos instrumentos do equipamento.",
        "Tenha o CNPJ do cliente e os dados do equipamento.",
        "Tenha as fotos e, se houver, os certificados de calibração dos instrumentos (PDF ou imagem)."
      ],
      passos: [
        { titulo: "Gerar o relatório", itens: [
          "Toque em \"Relatório QI/QO/QD\" no menu.",
          "Em \"1. Cliente\", digite o CNPJ e toque em \"Buscar CNPJ\".",
          "Em \"2. Equipamento\", escolha o equipamento e preencha TAG, marca, modelo, localização, datas e técnico.",
          "Marque \"Realizado no laboratório da Metrolabs\" só se o equipamento foi levado ao laboratório.",
          "Em \"3. Qualificação de Instalação / Operação (QI/QO)\", marque os itens verificados no atendimento.",
          "Anexe as fotos de QI e de QO (até 6 de cada). A legenda é opcional.",
          "Na parte de QD, anexe o certificado de cada instrumento que tiver.",
          "Toque em \"Gerar Relatório de QI/QO com IA\".",
          "Em \"3.1 Revise os textos do QI/QO antes de confirmar\", leia e corrija objetivo, QI, QO, QD e conclusão.",
          "Toque em \"Confirmar e Gerar Relatório de QI/QO\".",
          "O documento abre em nova aba e é salvo sozinho na pasta do cliente. Espere a mensagem \"Salvo na pasta do cliente\"."
        ] },
        { titulo: "Reabrir um relatório já gerado", itens: [
          "Em \"Documentos já gerados\", digite o cliente, a TAG ou o nome do arquivo.",
          "Toque em \"Buscar\".",
          "Abra o documento na lista."
        ] }
      ],
      cores: [
        { nome: "Aviso acima dos campos de revisão", significado: "A IA não respondeu. Os campos vêm com texto padrão completo. Revise e confirme." },
        { nome: "Botão \"Tentar salvar de novo\"", significado: "O documento foi gerado, mas não chegou à pasta do cliente. Toque para salvar outra vez." },
        { nome: "Quadro no alto do relatório", significado: "Cinza: \"Executado sem achado técnico registrado\". Laranja: \"Executado com achado técnico registrado\"; o achado aparece ao lado do item, na tabela da etapa. Não é aprovação nem reprovação." },
        FAIXA_VERMELHA
      ],
      problemas: [
        { situacao: "Apareceu \"Tentar salvar de novo\".", oQueFazer: "Toque no botão. Se falhar de novo, confira a internet e avise o administrador." },
        { situacao: "Não tenho o certificado de algum instrumento.", oQueFazer: "Deixe o campo em branco. Na tabela de certificados do relatório, o instrumento aparece como \"Não anexado nesta visita\"." },
        { situacao: "A nova aba não abriu.", oQueFazer: "Libere janelas novas (pop-up) para o endereço do SGO+ e gere de novo." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA", pode: "Gerar e consultar relatórios." },
        { perfil: "COMERCIAL,FINANCEIRO", pode: "Só consultam. O servidor recusa a geração e explica o motivo." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela." }
      ],
      perguntas: [
        { p: "O relatório aprova ou reprova o equipamento?", r: "Não. Ele registra o que foi verificado e as evidências. A conclusão não faz juízo de conformidade." },
        { p: "Como o relatório é organizado?", r: "Em seções numeradas: identificação, introdução, objetivo, QI, QO, QD, referências normativas e conclusão com as assinaturas. Os itens verificados de cada etapa ficam numa tabela, e os certificados numa tabela que diz qual foi anexado. Acima de 3 páginas, o relatório ganha sumário." },
        { p: "Onde o relatório fica salvo?", r: "Na pasta do cliente, numa subpasta com o CNPJ (14 dígitos), com o nome \"Relatorio de qualificacao - número - TAG - data e hora\", em PDF e em HTML." }
      ]
    },

    // ================================================================
    "nr13": {
      titulo: "Laudo NR-13",
      paraQueServe: "Monta o laudo de inspeção de vasos de pressão conforme a NR-13. O sistema calcula a categoria do vaso, sugere a data da próxima inspeção e gera o laudo em A4 com o parecer do profissional legalmente habilitado.",
      antesDeComecar: [
        "Tenha os dados da plaqueta do vaso: PMTA, volume, ano de fabricação, fluido e código de construção.",
        "PMTA é a pressão máxima de trabalho admissível: a maior pressão em que o vaso pode operar com segurança, informada pelo fabricante.",
        "Tenha os dados das válvulas de segurança e dos manômetros inspecionados.",
        "Tenha as fotos do exame e, se houve, os dados do teste hidrostático.",
        "O laudo é assinado pelo Profissional Legalmente Habilitado (PLH)."
      ],
      passos: [
        { titulo: "Preencher e emitir o laudo", itens: [
          "Toque em \"Laudo NR-13\" no menu.",
          "Em \"1. Cliente\", digite o CNPJ e toque em \"Buscar / Selecionar Cliente\".",
          "Se o cliente não existir, confira os dados que vieram da consulta e toque em \"Cadastrar Cliente\".",
          "Em \"2. Equipamento (vaso de pressão)\", escolha o vaso em \"Equipamento já cadastrado\" e toque em \"Usar este equipamento\".",
          "Se o vaso não estiver na lista, toque em \"+ Cadastrar equipamento novo\", preencha e toque em \"Cadastrar equipamento\".",
          "Em \"3. Dados técnicos do vaso\", escolha o \"Tipo de vaso\" e copie os valores da plaqueta, cada um com a sua unidade.",
          "Escolha a \"Classe do fluido\". A categoria do vaso aparece sozinha.",
          "Em \"4. Dados da inspeção\", escolha o tipo de inspeção e as datas. A próxima inspeção vem com 1 ano; mude se precisar.",
          "Escolha o PLH responsável.",
          "Toque em \"+ Adicionar válvula de segurança\" e em \"+ Adicionar manômetro\" para cada item inspecionado.",
          "Em \"5. Teste hidrostático (TH)\", responda se foi feito e preencha pressões e tempos.",
          "Em \"6. Registro fotográfico\", anexe as fotos, descreva cada uma e toque em \"Interpretar com IA\".",
          "Em \"7.\", escreva a descrição, o resultado e as recomendações. Use \"Revisar texto (IA)\" se quiser melhorar a redação.",
          "Em \"8. Veredito e parecer conclusivo\", escolha \"Aprovado\", \"Aprovado com Ressalvas\" ou \"Reprovado\".",
          "Escreva o parecer ou toque em \"Sugerir parecer com IA\" e revise.",
          "Em \"9. Salvar / Emitir\", toque em \"Salvar rascunho\" para guardar sem emitir.",
          "Quando estiver tudo conferido, toque em \"Emitir laudo final\"."
        ] },
        { titulo: "Continuar um rascunho ou reabrir um laudo", itens: [
          "No topo, em \"Consultar laudos já emitidos ou continuar rascunho salvo (por CNPJ)\", digite o CNPJ.",
          "Toque em \"Buscar rascunhos salvos\" para continuar de onde parou.",
          "Toque em \"Buscar laudos emitidos\" para reabrir um laudo pronto."
        ] }
      ],
      cores: [
        { nome: "Caixa verde \"Aprovado\"", significado: "O vaso pode continuar operando até a próxima inspeção." },
        { nome: "Caixa amarela \"Aprovado com Ressalvas\"", significado: "A integridade está mantida, mas depende das recomendações. Recomenda-se reinspeção." },
        { nome: "Caixa vermelha \"Reprovado\"", significado: "O vaso não deve permanecer em operação." },
        { nome: "Quadros da categoria (abaixo dos dados técnicos)", significado: "Mostram a categoria calculada, o grupo de risco e o valor P.V (MPa·m³). Mudam sozinhos quando você muda PMTA, volume ou fluido." }
      ],
      problemas: [
        { situacao: "A categoria não aparece.", oQueFazer: "Preencha PMTA, volume e classe do fluido, com as unidades certas." },
        { situacao: "Aparece \"Esta tela ainda aponta para um laudo já emitido\".", oQueFazer: "Laudo emitido não muda mais. Toque em \"Começar novo laudo com estes dados\" para salvar como laudo novo." },
        { situacao: "A página recarregou e perdi o que digitei.", oQueFazer: "Se você tinha tocado em \"Salvar rascunho\", use \"Buscar rascunhos salvos\". Salve o rascunho com frequência." },
        { situacao: "O perfil Comercial ou Financeiro não consegue salvar.", oQueFazer: "Esses perfis só consultam laudos. Peça a emissão a um técnico, à metrologia ou ao gestor." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA", pode: "Preencher, salvar rascunho e emitir laudos." },
        { perfil: "COMERCIAL,FINANCEIRO", pode: "Consultar laudos emitidos. Não preenchem nem emitem." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela." }
      ],
      perguntas: [
        { p: "Que pressão o sistema usa para a categoria?", r: "Usa a PMTA, que é o critério conservador. O laudo informa isso na seção 5 (Categorização e periodicidade), com a memória de cálculo na Tabela 1." },
        { p: "Como o laudo é organizado?", r: "Abre com o parecer do PLH (Aprovado, Aprovado com ressalvas ou Reprovado) e segue em seções numeradas: identificação, introdução, objetivo, referências normativas, categorização, inspeção executada (válvulas, manômetros, teste hidrostático com gráfico e fotos), resultados e recomendações e, no fim, o parecer conclusivo com as datas e a assinatura do PLH na mesma página. Acima de 3 páginas, o laudo ganha sumário." },
        { p: "Onde o laudo fica salvo?", r: "Na pasta do cliente, numa subpasta com o CNPJ (14 dígitos), com o nome \"Laudo NR-13 - número - TAG - data e hora\", em PDF e em HTML. As fotos do exame ficam na subpasta \"Fotos\" da mesma pasta." },
        { p: "Qual redação da NR-13 o laudo cita?", r: "A da Portaria MTP nº 1.846, de 1º de julho de 2022 (retificada em 20/10/2022), alterada pela Portaria MTP nº 4.219, de 20 de dezembro de 2022." }
      ],
      secoesManual: [
        { titulo: "Termos usados nesta tela", paragrafos: [
          "PMTA: pressão máxima de trabalho admissível, da plaqueta do vaso.",
          "P·V: produto da pressão (em MPa) pelo volume (em m³). Junto com a classe do fluido, define o grupo e a categoria (I a V).",
          "Categoria: define os prazos máximos de inspeção. Sem serviço próprio de inspeção, o prazo do exame externo e do interno vai de 1 e 3 anos (categoria I) até 5 e 10 anos (categoria V).",
          "Teste hidrostático: o vaso é cheio de água e pressurizado acima da PMTA (sugestão de 1,5 vez) para verificar se resiste sem vazar ou deformar.",
          "PLH: Profissional Legalmente Habilitado, que assina o laudo."
        ] }
      ]
    }
  };
}
