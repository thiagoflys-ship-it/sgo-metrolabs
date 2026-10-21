/**
 * Ajuda "Como usar esta tela" — Esterilização a baixa temperatura (21/10/2026).
 * Tela: JS_BaixaTemp.html + SGO_BaixaTemp_Tela.js (abas 1 a 8). Servidor: SGO_BaixaTemp_*.js.
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Texto puro, sem HTML.
 * Manual completo: docs/MANUAL_MODULO_BAIXA_TEMPERATURA.md (base do assistente).
 */
function SGO_ajudaTelas_BaixaTemp_() {
  return {
    "baixa_temperatura": {
      titulo: "Esterilização a baixa temperatura",
      paraQueServe: "Faz a qualificação de esterilizadores a peróxido de hidrogênio (com ou sem plasma) e a vapor a baixa temperatura com formaldeído (VBTF): instalação (QI), operação (QO) e desempenho (QD). O sistema lê os arquivos do registrador, identifica as fases do ciclo, calcula temperaturas, tempo de exposição, pulsos e uniformidade, confere os indicadores químicos e biológicos e decide se cada critério foi atendido. O responsável técnico revisa e aprova, e o relatório sai em A4 (HTML e PDF) na pasta do cliente.",
      antesDeComecar: [
        "Tenha o cliente, a unidade e o esterilizador cadastrados (Cadastros > Clientes, Unidades e Equipamentos).",
        "Tenha a especificação do ciclo do fabricante do equipamento: temperatura programada e tolerâncias, tempo de exposição e, se houver, número de pulsos e pressão de vácuo. Esses valores são os limites de aceitação.",
        "Confira se os registradores e transdutores usados estão em Calibração > Padrões de referência, com o certificado válido no período do ensaio.",
        "Exporte os arquivos do registrador de cada ciclo (planilha XLSX ou XLS, ou texto CSV ou TXT). Pode ser um arquivo com todos os sensores ou um arquivo por sensor.",
        "Anote os indicadores químicos e biológicos de cada ciclo: posição, lote, validade e resultado. O ciclo de desempenho só fecha depois da incubação dos indicadores biológicos.",
        "O relatório não cita fabricante nem modelo do equipamento, do registrador ou dos indicadores."
      ],
      passos: [
        { titulo: "Começar um ensaio", itens: [
          "Toque em \"Esterilização a baixa temperatura\" no menu (grupo Qualificação e inspeção).",
          "Toque em \"Novo ensaio\".",
          "Em \"1. Identificação\", escolha o tipo de processo e marque as etapas executadas (QI, QO e QD).",
          "Digite o nome ou o CNPJ do cliente, toque em \"Buscar cliente\" e escolha na lista.",
          "Escolha a unidade e o equipamento. Só aparecem os equipamentos ativos da unidade escolhida; equipamento de outro cliente ou de outra unidade é recusado ao salvar.",
          "Se o cliente, a unidade ou o equipamento não aparecer, toque em \"Cadastrar cliente\", \"Cadastrar unidade\" ou \"Cadastrar equipamento\": o cadastro abre em outra aba. Salve lá, volte para esta aba e toque em \"Buscar cliente\" de novo; o ensaio continua como estava.",
          "Confira a data de início, o técnico executor e o motivo da qualificação.",
          "Toque em \"Salvar\". Você pode salvar a qualquer momento e continuar depois pela lista."
        ] },
        { titulo: "Informar o ciclo programado e os instrumentos", itens: [
          "Em \"2. Ciclo e critérios\", copie da especificação do fabricante a temperatura programada, as tolerâncias, o tempo de exposição e, se houver, o número de pulsos e a pressão de vácuo.",
          "Em \"Origem dos parâmetros\", escreva de onde vieram os valores (exemplo: manual de operação, revisão 3).",
          "Deixe em branco o que o fabricante não declara: o critério fica informativo ou não é avaliado.",
          "Em \"3. Instrumentos\", toque em \"Carregar padrões\", escolha cada registrador ou transdutor e toque em \"Acrescentar\".",
          "Confira a grandeza (temperatura ou pressão), a incerteza U e o fator k do certificado, e informe a resolução do registrador."
        ] },
        { titulo: "Registrar a instalação (QI) e a operação (QO)", itens: [
          "Em \"4. Instalação (QI)\", responda cada verificação com Sim, Não ou Não se aplica. \"Não se aplica\" exige observação.",
          "Em \"5. Operação (QO)\", responda as verificações funcionais.",
          "Se o equipamento tiver ensaio de estanqueidade, marque \"Estanqueidade aplicável\" e informe as pressões no início e no fim da espera, a duração e o limite do fabricante.",
          "Toque em \"Acrescentar ciclo de operação\" para o ciclo com a câmara vazia."
        ] },
        { titulo: "Enviar o arquivo do registrador de um ciclo", itens: [
          "No cartão do ciclo, preencha o número do ciclo no equipamento e a data do ciclo.",
          "Em \"Enviar arquivo(s)\", escolha o arquivo. Para um arquivo por sensor, escolha todos de uma vez.",
          "Confira a prévia: cada coluna tem um papel (Data e hora, Hora, Temperatura, Pressão...). Corrija o papel se precisar e toque em \"Ler de novo com as colunas abaixo\".",
          "Confira a unidade da pressão (mbar, kPa, Pa...) e o formato da data (Brasil ou americano).",
          "Em \"Sensores do ciclo\", marque se cada sensor está na carga ou na câmara e escreva a posição. Desmarque \"Ativo\" só do sensor que falhou e explique nas observações.",
          "A janela de exposição fica \"Automática\". Use \"Manual\" só se os dados não mostrarem a exposição; informe início, fim e a justificativa (por exemplo, o registro impresso do equipamento).",
          "Registre os indicadores químicos e, no desempenho, os biológicos, o controle positivo e a incubação."
        ] },
        { titulo: "Registrar o desempenho (QD)", itens: [
          "Em \"6. Desempenho (QD)\", toque em \"Acrescentar ciclo de desempenho\" para cada ciclo com carga (o plano pede três ciclos).",
          "Envie o arquivo de cada ciclo e registre os indicadores como no passo anterior.",
          "Marque \"Incubação concluída\" só depois de ler todos os indicadores biológicos."
        ] },
        { titulo: "Calcular o resultado e redigir os textos", itens: [
          "Em \"7. Resultado e textos\", toque em \"Calcular resultado\".",
          "Leia \"O que falta\": cada item diz o que corrigir e onde. Corrija, salve e calcule de novo até a lista ficar vazia.",
          "Toque em \"Redigir textos\". As análises e as conclusões são montadas a partir do resultado calculado e conferidas pelo sistema.",
          "Revise os textos, ajuste o que precisar e toque em \"Salvar\"."
        ] },
        { titulo: "Revisão do responsável técnico e emissão", itens: [
          "Em \"8. Revisão e emissão\", toque em \"Ver prévia do relatório\" e leia o documento inteiro.",
          "Toque em \"Enviar para revisão\". O ensaio passa a \"Aguardando revisão do responsável técnico\".",
          "O responsável técnico abre o ensaio, lê a prévia, escolhe quem assina, escreve o parecer e toca em \"Aprovar\" (ou em \"Devolver ao técnico\", com o que corrigir).",
          "Depois da aprovação, toque em \"Emitir relatório\". O documento abre em outra aba e fica salvo em PDF e HTML na pasta do equipamento (dentro da pasta do cliente) e no Arquivo de documentos.",
          "Toque em \"Enviar ao cliente\" para mandar por e-mail ou WhatsApp."
        ] },
        { titulo: "Corrigir um relatório já emitido", itens: [
          "Abra o ensaio emitido pela lista.",
          "Em \"8. Revisão e emissão\", toque em \"Nova revisão\". O sistema cria um rascunho com os mesmos dados e a revisão seguinte; o relatório emitido continua guardado.",
          "Corrija, calcule, envie para revisão e emita a nova revisão."
        ] }
      ],
      cores: [
        { nome: "Selo \"Rascunho\"", significado: "O ensaio pode ser alterado. Ainda não foi enviado para revisão." },
        { nome: "Selo amarelo \"Aguardando revisão do responsável técnico\"", significado: "O técnico enviou. Só o responsável técnico aprova ou devolve. Qualquer alteração nos dados volta o ensaio para rascunho." },
        { nome: "Selo azul \"Aprovado, pronto para emitir\"", significado: "O responsável técnico aprovou sobre estes dados. Falta tocar em \"Emitir relatório\"." },
        { nome: "Selo verde \"Emitido\"", significado: "O relatório foi emitido e salvo. O ensaio não muda mais; correção é feita por \"Nova revisão\"." },
        { nome: "Selo verde \"Conforme\" e vermelho \"Não conforme\"", significado: "Resultado calculado pelo sistema: conforme quando todos os critérios avaliados foram atendidos. Não existe resultado intermediário." },
        { nome: "Selo \"Informativo\"", significado: "O critério não tem limite declarado pelo fabricante: o valor é registrado, mas não aprova nem reprova." },
        { nome: "Selo amarelo \"a confirmar\" nas normas", significado: "O número, a edição ou o título da norma ainda precisam ser confirmados pelo responsável técnico." },
        { nome: "Lista \"O que falta\"", significado: "Pendências que impedem a emissão: dado faltando, incoerente ou vencido. Cada uma diz o que fazer." }
      ],
      problemas: [
        { situacao: "A prévia mostra as colunas trocadas ou a temperatura como texto.", oQueFazer: "Escolha o papel certo de cada coluna no topo da prévia e toque em \"Ler de novo com as colunas abaixo\"." },
        { situacao: "As datas saíram com dia e mês trocados.", oQueFazer: "Em \"Formato da data no arquivo\", escolha \"Brasil (dd/mm/aaaa)\" ou \"Americano (mm/dd/aaaa)\" e leia de novo." },
        { situacao: "O arquivo só tem a hora, sem a data.", oQueFazer: "Preencha a \"Data do ciclo\" no cartão do ciclo e leia o arquivo de novo." },
        { situacao: "\"A janela de exposição não foi identificada pelos dados\".", oQueFazer: "Confira a temperatura programada e as tolerâncias em 2. Ciclo e critérios e as colunas na prévia. Se estiverem certas, use a janela \"Manual\" com os horários do registro do equipamento e escreva a justificativa." },
        { situacao: "O número de pulsos identificado é diferente do programado.", oQueFazer: "Confira no registro do equipamento. Se o arquivo estiver certo, o critério fica não conforme. O ajuste \"Elevação mínima de pressão para contar um pulso\" só muda com orientação do responsável técnico." },
        { situacao: "\"Certificado vencido\" ou \"sem incerteza\" no instrumento.", oQueFazer: "Atualize o padrão em Calibração > Padrões de referência, remova o instrumento em 3. Instrumentos e acrescente de novo." },
        { situacao: "\"O controle positivo não apresentou crescimento\".", oQueFazer: "A leitura do lote de indicadores biológicos não é válida. Repita a incubação com outro indicador do mesmo lote ou repita o ciclo." },
        { situacao: "\"Redigir textos\" voltou com aviso de texto padrão.", oQueFazer: "A redação automática não está disponível ou foi descartada pela conferência. O texto padrão já está certo; revise e complete se quiser. A chave da IA é configurada pelo administrador em Chaves e senhas." },
        { situacao: "\"Os dados ou os arquivos mudaram depois da aprovação\".", oQueFazer: "O responsável técnico devolve o ensaio, o técnico confere, calcula de novo e envia para revisão outra vez." },
        { situacao: "\"Quem elaborou o ensaio não pode aprová-lo\".", oQueFazer: "A revisão precisa ser de outro responsável técnico. Peça a outra pessoa com perfil de Administrador, Diretoria ou Gestor." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA", pode: "Cria e preenche ensaios, envia arquivos, calcula, redige os textos, envia para revisão e emite depois da aprovação." },
        { perfil: "ADMIN,DIRETORIA,GESTOR", pode: "Revisa e aprova (ou devolve) ensaios elaborados por outra pessoa." },
        { perfil: "COMERCIAL,FINANCEIRO", pode: "Consulta a lista de ensaios, abre os ensaios e os relatórios emitidos, sem alterar." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela. Recebe o relatório pela Metrolabs ou consulta em Arquivo de documentos." }
      ],
      perguntas: [
        { p: "Quem decide se o ensaio é conforme?", r: "O cálculo do sistema, a partir dos critérios configurados e dos dados. A redação automática só escreve sobre esse resultado e é conferida: número que não está nos resultados, norma fora da lista ou resultado diferente fazem o sistema usar o texto padrão." },
        { p: "De onde vêm os limites de aceitação?", r: "Da especificação do ciclo declarada pelo fabricante do equipamento, digitada em 2. Ciclo e critérios, e do plano de validação aprovado pelo responsável técnico. Cada critério aparece no relatório com a fonte." },
        { p: "Como o sistema acha a exposição?", r: "No peróxido de hidrogênio, pelos pulsos de pressão: do início do primeiro pulso de injeção até a volta ao vácuo depois do último. No VBTF, pelo maior trecho em que todos os sensores ativos ficam no limite inferior da faixa de temperatura. Sem os dados necessários, um método serve de reserva para o outro." },
        { p: "Posso usar um arquivo por sensor?", r: "Sim. Envie todos os arquivos do ciclo de uma vez. O sistema une as leituras pelo horário (até meio intervalo de diferença)." },
        { p: "Quantos ciclos de desempenho são exigidos?", r: "Três ciclos, conforme o plano de validação configurado. Se o plano do cliente for outro, o responsável técnico ajusta a configuração do módulo." },
        { p: "Onde fica o relatório?", r: "Na pasta do equipamento, dentro da pasta do cliente (Baixa Temperatura - Laudos > CNPJ > TAG e tipo do equipamento > Qualificação), em PDF e HTML A4, com o nome \"Relatório de qualificação baixa temperatura - número - TAG - data e hora\", e no Arquivo de documentos do cliente." }
      ],
      secoesManual: [
        { titulo: "Termos usados nesta tela", paragrafos: [
          "QI, QO e QD: qualificação de instalação (o equipamento está instalado como o fabricante pede), de operação (executa o ciclo e as funções com a câmara vazia) e de desempenho (entrega o ciclo com carga, comprovado por medição e indicadores).",
          "Janela de exposição: o trecho do ciclo em que o agente esterilizante age sobre a carga. É nela que o sistema confere temperatura, tempo e pulsos.",
          "Pulso: cada injeção do agente, vista como uma elevação da pressão a partir do vácuo. A elevação até a pressão ambiente é ventilação, não pulso.",
          "Uniformidade: a maior diferença de temperatura entre sensores no mesmo instante.",
          "Indicador químico: muda de cor quando exposto ao processo. Indicador biológico: contém microrganismos de referência; sem crescimento depois da incubação, o processo foi eficaz naquele ponto. O controle positivo (não exposto) precisa crescer para a leitura valer.",
          "Incerteza expandida (k = 2): a dúvida da medição, somando o certificado de calibração e a resolução do registrador. Na regra de aceitação simples ela é declarada e não reduz o limite."
        ] }
      ]
    }
  };
}
