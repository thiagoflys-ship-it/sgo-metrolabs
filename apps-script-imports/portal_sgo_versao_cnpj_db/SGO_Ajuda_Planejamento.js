/**
 * Ajuda "Como usar esta tela" — grupo Planejamento (frente B).
 * Telas: Planejamento CME e Cronograma de execução.
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Texto puro, sem HTML.
 * Conferido contra a tela real (SGO_PlanCME_ConteudoModulo.js e
 * SGO_CronExec_ConteudoModulo.js) em 17/10/2026.
 */
function SGO_ajudaTelas_Planejamento_() {
  return {
    // ================================================================
    "planejamento_cme": {
      titulo: "Planejamento CME",
      paraQueServe: "Calcula quantos sensores, indicadores biológicos, integradores químicos e outros insumos são necessários para qualificar um equipamento da CME (Central de Material e Esterilização), conforme o que foi vendido. Gera um documento único com o planejamento, a justificativa de cada item e como o cliente pode pedir mudança de critério.",
      antesDeComecar: [
        "Tenha o CNPJ do cliente.",
        "Saiba o tipo de processo do equipamento e o volume da câmara em litros. O volume muda o número de sensores.",
        "Saiba o que foi vendido: QI, QO, QD e, na autoclave a vapor, o teste Bowie-Dick.",
        "QI confere a instalação. QO confere o funcionamento com o equipamento vazio. QD confere o resultado com carga ou com as receitas do cliente.",
        "Tenha a lista das receitas (ciclos) que serão qualificadas.",
        "No celular, a tela abre com uma apresentação curta. Toque em \"Abrir a tela completa\" para usar o formulário."
      ],
      passos: [
        { titulo: "Calcular o planejamento", itens: [
          "Toque em \"Planejamento CME\" no menu.",
          "Na etapa \"1. Dados do cliente\", digite o CNPJ e toque em \"Buscar\".",
          "Confira a razão social e o endereço. Se a busca falhar, digite à mão.",
          "Toque em \"Próximo\".",
          "Na etapa \"2. Dados do equipamento\", escolha o tipo de equipamento e o tipo de processo.",
          "Preencha marca, modelo, número de série e o volume da câmara em litros.",
          "Responda \"Possui bomba de vácuo?\" e toque em \"Próximo\".",
          "Na etapa \"3. O que foi vendido?\", marque exatamente o que foi contratado e toque em \"Próximo\".",
          "Na etapa \"4. Receitas que serão qualificadas\", digite o nome da receita e toque em \"Adicionar receita\". Repita para cada receita.",
          "Toque em \"Calcular planejamento\". O cálculo já pede o texto à IA e pode levar alguns segundos.",
          "Na etapa \"5. Resultado do planejamento\", confira os números e a tabela de insumos."
        ] },
        { titulo: "Gerar, salvar e enviar o documento", itens: [
          "Se quiser, escreva em \"Observações adicionais\" e toque em \"Refinar texto com IA\".",
          "Toque em \"Gerar Documento\". O documento abre em nova aba.",
          "Toque em \"Salvar na pasta do cliente\" para guardar o PDF. Sem isso o documento não fica registrado.",
          "Toque em \"Abrir WhatsApp\" para enviar o resumo. O link do documento só vai na mensagem se você salvou antes."
        ] }
      ],
      cores: [
        { nome: "Aviso ao lado do botão \"Próximo\"", significado: "Falta um dado da etapa: razão social, tipo de processo, volume maior que zero ou pelo menos um serviço contratado. O campo recebe o foco." },
        { nome: "Coluna \"Base calculada\"", significado: "Quantidade mínima calculada para o que foi vendido." },
        { nome: "Coluna \"Total com margem\"", significado: "Quantidade a separar, com a margem de segurança já somada." },
        { nome: "Quadro \"Histórico da operação\"", significado: "Lista cada ação com a hora. Vermelho indica erro; leia a mensagem." }
      ],
      problemas: [
        { situacao: "O campo do Bowie-Dick sumiu.", oQueFazer: "É esperado. O teste Bowie-Dick só existe na autoclave a vapor." },
        { situacao: "O campo de receitas sumiu.", oQueFazer: "Sem QO nem QD não é preciso informar receitas." },
        { situacao: "Com QI e QO sem QD, apareceram 3 indicadores biológicos e 3 integradores por ciclo.", oQueFazer: "É a regra do sistema: são fixos no início, no meio e no fim da câmara. Confira se a QD estava mesmo desmarcada." },
        { situacao: "Voltei uma etapa e fiquei com medo de perder o cálculo.", oQueFazer: "\"Voltar\" não apaga o cálculo. Se nada mudou, \"Calcular planejamento\" só volta ao resultado. Se algum dado mudou, o sistema recalcula." },
        { situacao: "Erro ao calcular com mensagem sobre a IA.", oQueFazer: "Foi uma falha temporária do texto. Toque em \"Calcular planejamento\" de novo." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Calcular, gerar e salvar planejamentos." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela. Para receber um planejamento, solicite à Metrolabs." }
      ],
      perguntas: [
        { p: "Por que uma receita com \"Príons\" no nome muda os insumos?", r: "O sistema reconhece a palavra no nome e troca o integrador químico comum pelo integrador específico para príons nessa receita. O indicador biológico continua o mesmo." },
        { p: "O que é a E.R.U.?", r: "Especificação de Requisitos do Usuário. É o documento que o cliente assina quando quer mudar um critério do planejamento." },
        { p: "O que o documento traz?", r: "Seções numeradas: identificação, objetivo e escopo, quantitativo (Tabela 1 e um gráfico da base com a margem), composição do cálculo por etapa e receita (Tabela 2), fundamentação técnica, checklist da QI, referências, E.R.U. e assinaturas. Sem a IA, a fundamentação sai numa tabela com a base e a natureza de cada quantidade (normativa, protocolo do fabricante ou critério da executante)." }
      ],
      secoesManual: [
        { titulo: "Termos usados nesta tela", paragrafos: [
          "Indicador biológico: insumo com esporos de teste que mostra se o ciclo matou os micro-organismos.",
          "Integrador químico: insumo que muda de cor quando as condições do ciclo (tempo, temperatura, agente) foram atingidas.",
          "Bowie-Dick: teste diário da autoclave a vapor que mostra se ficou ar dentro da câmara.",
          "Receita: o programa que o equipamento roda para um tipo de carga."
        ] }
      ]
    },

    // ================================================================
    "cronograma_execucao": {
      titulo: "Cronograma de execução",
      paraQueServe: "Monta o cronograma de calibração e qualificação dos equipamentos de um cliente. O sistema separa os equipamentos em grupos e sugere as datas de cada grupo em dias úteis. Você ajusta e gera o documento.",
      antesDeComecar: [
        "Tenha o CNPJ do cliente. Se ele está no cadastro, os equipamentos podem vir de lá.",
        "Saiba a data de início, quantas unidades cabem por grupo e quantos dias úteis cada grupo leva."
      ],
      passos: [
        { titulo: "Montar o cronograma", itens: [
          "Toque em \"Cronograma de execução\" no menu.",
          "Na etapa \"1. Cliente\", digite o CNPJ e toque em \"Buscar\".",
          "Confira razão social e endereço e toque em \"Avançar\".",
          "Na etapa \"2. Equipamentos\", escolha a unidade (ou todas) e toque em \"Trazer equipamentos do cadastro\".",
          "Para acrescentar à mão, preencha tipo, marca, modelo e quantidade e toque em \"+ Adicionar\".",
          "Use \"Remover\" na linha que não deve entrar.",
          "Toque em \"Avançar\".",
          "Na etapa \"3. Grupos\", informe a data de início do grupo 1, o máximo de unidades por grupo, os dias úteis por grupo e o intervalo entre grupos.",
          "Toque em \"Sugerir Grupos\".",
          "Confira os grupos sugeridos. Mude as datas de início e fim se precisar. Use \"+ Novo grupo vazio\" para criar outro grupo.",
          "Toque em \"Avançar\".",
          "Na etapa \"4. Gerar\", toque em \"Gerar Cronograma\"."
        ] },
        { titulo: "Abrir, salvar e enviar", itens: [
          "Na etapa \"5. Documento\", toque em \"Abrir Documento\". Ele abre em nova aba.",
          "Toque em \"Salvar na pasta do cliente\".",
          "Toque em \"Abrir WhatsApp\" para enviar ao cliente.",
          "Para ajustar algo, toque em \"Voltar aos Grupos\"."
        ] }
      ],
      cores: [
        { nome: "Mensagem \"CNPJ encontrado\"", significado: "Os dados do cliente foram preenchidos. Confira." },
        { nome: "Mensagem ao lado do \"Avançar\"", significado: "Falta a razão social, pelo menos 1 equipamento ou a data de início. O campo recebe o foco." },
        { nome: "Mensagem \"Salvo na pasta do cliente\"", significado: "O documento foi guardado. O link abre o arquivo." }
      ],
      problemas: [
        { situacao: "\"Trazer equipamentos do cadastro\" não encontrou o cliente.", oQueFazer: "O cliente não está no cadastro. Cadastre em \"Clientes\" ou acrescente os equipamentos à mão." },
        { situacao: "Aparece \"Adicione ao menos um equipamento na etapa 2 antes de sugerir os grupos.\"", oQueFazer: "Volte à etapa 2 e inclua os equipamentos." },
        { situacao: "Aparece que o navegador bloqueou a nova aba.", oQueFazer: "Libere janelas novas (pop-up) para o SGO+ e toque em \"Abrir Documento\" de novo. O \"Salvar na pasta do cliente\" já funciona." },
        { situacao: "Aparece \"Abra o documento primeiro\".", oQueFazer: "Toque em \"Abrir Documento\" antes de salvar." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Montar, gerar e salvar cronogramas." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela." }
      ],
      perguntas: [
        { p: "O que é o \"Limite p/ grupo único\"?", r: "Se o total de unidades for menor ou igual a esse número, tudo fica num grupo só." },
        { p: "As datas contam fim de semana?", r: "Não. Os dias úteis pulam sábado, domingo e feriado nacional." },
        { p: "O que o documento traz?", r: "Seções numeradas com a lista de equipamentos (Tabela 1), os grupos com início, término e dias úteis (Tabela 2) e um calendário dos grupos (Figura 1), em que sábados, domingos e feriados nacionais aparecem sombreados. As considerações finais e as assinaturas ficam na mesma página." },
        { p: "Os equipamentos do cadastro vêm um por um?", r: "Não. Vêm agrupados por tipo, marca e modelo, com a quantidade." }
      ]
    }
  };
}
