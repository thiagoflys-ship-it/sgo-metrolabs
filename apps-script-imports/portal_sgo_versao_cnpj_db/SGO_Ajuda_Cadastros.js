/**
 * Ajuda "Como usar esta tela" — grupo Cadastros (frente A).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Texto puro, sem HTML.
 * Telas: Clientes, Unidades, Equipamentos, Vínculos e Arquivo de documentos
 * (redesenhadas em 17/10/2026: JS_Cadastros.html, JS_Equipamentos.html,
 * JS_Vinculos.html e JS_Admin.html). Inventário é de outra frente.
 */
function SGO_ajudaTelas_Cadastros_() {
  return {
    // =====================================================================
    // CLIENTES
    // =====================================================================
    "clientes": {
      titulo: "Clientes",
      paraQueServe: "Cadastra as empresas atendidas pela Metrolabs. Cada cliente é um CNPJ. Pelo cliente você chega às unidades, aos equipamentos e aos documentos dele.",
      antesDeComecar: [
        "Tenha em mãos o CNPJ da empresa. Com ele o sistema confere se a empresa já está cadastrada e busca os dados na Receita.",
        "Saiba se o cliente tem atendimento no próprio endereço. Nesse caso, ele precisa da unidade principal (mesmo CNPJ e endereço).",
        "Os locais atendidos ficam em \"Unidades\". Os equipamentos ficam ligados a uma unidade.",
        "O perfil Cliente não vê esta tela."
      ],
      passos: [
        {
          titulo: "Cadastrar um cliente",
          itens: [
            "Toque em \"Clientes\" no menu.",
            "Toque em \"Novo cliente\", à direita da barra de busca.",
            "Digite o CNPJ no primeiro campo.",
            "Confira a mensagem embaixo do campo. Se aparecer \"Já existe cliente com este CNPJ\", toque em \"Abrir o cadastro existente\" e não cadastre de novo.",
            "Toque em \"Preencher pela Receita\".",
            "Confira o aviso no canto da tela. Ele diz quantos campos foram preenchidos e quais ficaram como você digitou.",
            "Confira a razão social. Ela é obrigatória.",
            "Preencha o endereço, a pessoa de contato, o e-mail e o telefone com DDD.",
            "Deixe marcada a opção de criar a unidade principal. Desmarque só se o cliente apenas agrupa outras unidades e não tem atendimento próprio.",
            "Toque em \"Cadastrar cliente\".",
            "Confira o aviso \"Cliente ... cadastrado. Unidade principal criada.\" O painel do cliente abre em seguida."
          ]
        },
        {
          titulo: "Encontrar um cliente",
          itens: [
            "Digite na busca parte da razão social, do nome fantasia, do CNPJ (com ou sem pontos), do contato ou do e-mail.",
            "Toque em um dos números do topo para ver só aquele grupo. Toque de novo no mesmo número para desfazer.",
            "Escolha a ordem: \"Ordenar por nome\", \"Mais recentes primeiro\" ou \"Mais equipamentos primeiro\".",
            "Toque em \"Limpar filtros\" para voltar à lista completa. O botão só aparece quando há filtro ativo.",
            "Se a lista for longa, toque em \"Mostrar mais\" no fim da página."
          ]
        },
        {
          titulo: "Ver o detalhe e os vínculos",
          itens: [
            "Toque na linha do cliente. O painel de detalhe abre ao lado.",
            "Na aba \"Dados\", confira identificação, contato e o resumo de unidades, equipamentos e documentos.",
            "Toque na aba \"Unidades e equipamentos\" para ver a árvore cliente, unidades e equipamentos.",
            "Toque em \"Abrir\" ao lado de uma unidade ou de um equipamento para ir ao cadastro dele.",
            "Toque na aba \"Documentos\" para ver os documentos do cliente, com o vencimento de cada um.",
            "Toque em \"Abrir arquivo\" para ver o documento, ou em \"Ver\" para abrir o registro no Arquivo de documentos.",
            "Toque no X do painel para fechar."
          ]
        },
        {
          titulo: "Editar um cliente",
          itens: [
            "Toque em \"Editar\" na linha do cliente ou no rodapé do painel.",
            "Altere só o que precisa. Os campos que você não mexer ficam como estão.",
            "Toque em \"Salvar alterações\".",
            "Para desistir, toque em \"Cancelar\". Se houver algo digitado, o sistema pergunta se pode fechar sem salvar."
          ]
        },
        {
          titulo: "Criar a unidade principal depois",
          itens: [
            "Abra o cliente que mostra o selo \"Sem unidade\".",
            "Toque em \"Criar unidade principal\" no rodapé do painel. O botão só aparece se o cliente estiver ativo e tiver CNPJ.",
            "Confira o texto da janela e toque em \"Criar unidade principal\".",
            "Se o cliente não tiver CNPJ, toque em \"Editar\", informe o CNPJ, salve e tente de novo."
          ]
        },
        {
          titulo: "Cadastrar unidade ou equipamento a partir do cliente",
          itens: [
            "Toque em \"Mais\" na linha do cliente.",
            "Escolha \"Nova unidade deste cliente\" ou \"Novo equipamento deste cliente\".",
            "O formulário abre com o cliente já escolhido.",
            "Se o cliente estiver inativo, essas opções aparecem desabilitadas. Reative o cliente antes."
          ]
        },
        {
          titulo: "Inativar, reativar ou excluir",
          itens: [
            "Toque em \"Mais\" na linha do cliente ou em \"Mais ações\" no painel.",
            "Para tirar de uso sem perder nada, toque em \"Inativar cliente\" e confirme. Unidades, equipamentos e documentos continuam guardados.",
            "Para voltar a atender, toque em \"Reativar cliente\" e confirme. As unidades inativas continuam inativas até serem reativadas uma a uma.",
            "Para apagar de vez, toque em \"Excluir cliente\" e depois em \"Excluir definitivamente\". Só a gestão exclui, e só cadastro sem nada ligado.",
            "Para juntar dois cadastros do mesmo CNPJ, toque em \"Juntar cadastro repetido (Vínculos)\". Só a gestão usa essa opção."
          ]
        },
        {
          titulo: "Usar no celular",
          itens: [
            "A lista aparece em cartões, com o nome, o CNPJ, a situação e as quantidades de unidades, equipamentos e documentos.",
            "Toque no cartão para abrir o detalhe em tela cheia.",
            "Use os botões \"Editar\" e \"Mais\" do próprio cartão.",
            "Toque em Voltar, na barra do topo, para fechar o painel e voltar à lista."
          ]
        }
      ],
      cores: [
        { nome: "Número \"Total\"", significado: "Todos os clientes cadastrados. Toque para ver a lista completa." },
        { nome: "Número verde \"Ativos\"", significado: "Clientes em uso. Toque para ver só eles." },
        { nome: "Número \"Inativos\"", significado: "Clientes tirados de uso, com o histórico guardado." },
        { nome: "Número amarelo \"Sem unidade\"", significado: "Cliente ativo sem nenhuma unidade ativa. Ele não recebe atendimento nem documento." },
        { nome: "Número amarelo \"Cadastro incompleto\"", significado: "Falta CNPJ, endereço ou um meio de contato (e-mail ou telefone)." },
        { nome: "Número vermelho \"Documento vencido ou vencendo\"", significado: "O cliente tem documento vencido ou que vence em até 30 dias." },
        { nome: "Número em cinza claro", significado: "O grupo está vazio (zero)." },
        { nome: "Selo verde \"Ativo\"", significado: "O cliente está em uso." },
        { nome: "Selo cinza \"Inativo\"", significado: "O cliente foi tirado de uso. Nada foi apagado." },
        { nome: "Etiqueta amarela \"Sem unidade\"", significado: "Mesmo caso do número do topo. Crie a unidade principal ou cadastre uma unidade." },
        { nome: "Etiqueta amarela \"Cadastro incompleto\"", significado: "Pare o ponteiro sobre ela para ver o que falta. Toque em \"Editar\" para completar." },
        { nome: "Etiqueta vermelha \"Documento vencido\"", significado: "Há documento vencido ou que vence hoje." },
        { nome: "Etiqueta amarela \"Documento vencendo\"", significado: "Há documento que vence em até 30 dias." },
        { nome: "Linha com fundo verde claro", significado: "É o cliente aberto no painel ao lado." },
        { nome: "Opção vermelha no menu \"Mais\"", significado: "Ação de risco (inativar ou excluir). Sempre pede confirmação." },
        { nome: "Opção apagada no menu \"Mais\"", significado: "Ação não permitida agora. O texto logo abaixo diz o motivo ou a quem pedir." },
        { nome: "Aviso no canto da tela", significado: "Resultado da operação. O de sucesso some sozinho; o de erro fica até você fechar." }
      ],
      problemas: [
        { situacao: "Aparece \"Já existe cliente com este CNPJ\" embaixo do campo.", oQueFazer: "Toque em \"Abrir o cadastro existente\" e use esse cadastro. Se ele estiver inativo, reative em \"Mais\"." },
        { situacao: "Aparece \"Já existe cliente cadastrado com este CNPJ.\" ao salvar.", oQueFazer: "Outra pessoa cadastrou a empresa. Busque pelo CNPJ e abra o cadastro existente." },
        { situacao: "Aparece \"CNPJ inválido: confira os números\".", oQueFazer: "Confira os 14 números. Os dois últimos são o dígito verificador e costumam denunciar um número trocado." },
        { situacao: "Aparece \"Informe o CNPJ para criar a unidade principal, ou desmarque a unidade principal\".", oQueFazer: "Digite o CNPJ. Se o cliente for só um agrupador de outras unidades, desmarque a opção da unidade principal." },
        { situacao: "Aparece \"Este estabelecimento já está cadastrado como unidade\".", oQueFazer: "O CNPJ já é de uma unidade de outro cliente. Peça à gestão para conferir em \"Vínculos\", ou desmarque a unidade principal se for só um agrupador." },
        { situacao: "Aparece \"Informe a razão social.\"", oQueFazer: "Preencha a razão social. É o único campo sempre obrigatório." },
        { situacao: "Aparece \"E-mail inválido\" ou \"Telefone com DDD: 10 ou 11 números.\"", oQueFazer: "Corrija o formato: nome@empresa.com.br e telefone com DDD, por exemplo (19) 3333-0000." },
        { situacao: "\"Preencher pela Receita\" avisa \"CNPJ não encontrado\" ou que os serviços estão fora do ar.", oQueFazer: "Confira o número. Se estiver certo, preencha os campos à mão ou tente de novo em alguns minutos. Nada do que você digitou foi perdido." },
        { situacao: "\"Excluir cliente\" aparece apagado.", oQueFazer: "Excluir é feito pela gestão (Gestor, Diretoria ou Administrador). Peça a eles, ou use \"Inativar cliente\"." },
        { situacao: "A exclusão é recusada porque o cliente tem unidades, equipamentos ou documentos ligados.", oQueFazer: "Use \"Inativar cliente\", que guarda o histórico. Se for cadastro repetido, peça à gestão para juntar em \"Vínculos\"." },
        { situacao: "A lista não carregou.", oQueFazer: "Toque em \"Tentar de novo\". Se continuar, confira a conexão e atualize a página." },
        { situacao: "Aparece \"Não foi possível falar com o servidor\".", oQueFazer: "Confira a conexão. Antes de repetir, veja na lista se a alteração já foi feita, para não gravar em dobro." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Cadastrar, editar, inativar, reativar e excluir clientes sem nada ligado. Juntar cadastros repetidos pela tela Vínculos." },
        { perfil: "TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Cadastrar, editar, inativar e reativar clientes. Excluir e juntar cadastros fica com a gestão." },
        { perfil: "CLIENTE", pode: "Não vê esta tela. Os dados da sua empresa aparecem em Unidades, Equipamentos e Arquivo de documentos." }
      ],
      perguntas: [
        { p: "Qual a diferença entre cliente e unidade?", r: "O cliente é a empresa (o CNPJ). A unidade é o local atendido: matriz, filial ou anexo. Todo equipamento e todo documento ficam numa unidade." },
        { p: "Inativar apaga alguma coisa?", r: "Não. O cliente sai das listas de novos atendimentos e certificados, mas unidades, equipamentos e documentos continuam guardados. Para voltar, use \"Reativar cliente\"." },
        { p: "\"Preencher pela Receita\" apaga o que eu já digitei?", r: "Não. Ele só preenche campos vazios e avisa quais ficaram como você digitou." },
        { p: "Por que os nomes aparecem em letras maiúsculas?", r: "O sistema grava os cadastros em maiúsculas para manter o padrão das listas e dos documentos." },
        { p: "Como levo uma unidade para outro cliente?", r: "Pela tela \"Vínculos\", com o tipo Unidade e a ação Transferir. Só a gestão faz essa troca. Equipamentos e documentos acompanham." }
      ]
    },

    // =====================================================================
    // UNIDADES
    // =====================================================================
    "unidades": {
      titulo: "Unidades",
      paraQueServe: "Cadastra os locais atendidos de cada cliente: matriz, filiais e anexos. Todo equipamento e todo documento ficam ligados a uma unidade.",
      antesDeComecar: [
        "O cliente precisa estar cadastrado e ativo. Só clientes ativos aparecem na escolha.",
        "Tenha o CNPJ do local, se houver. Na unidade principal pode ser o mesmo CNPJ do cliente.",
        "Para o perfil Cliente, esta tela mostra só as unidades da própria empresa, sem edição."
      ],
      passos: [
        {
          titulo: "Cadastrar uma unidade",
          itens: [
            "Toque em \"Unidades\" no menu.",
            "Toque em \"Nova unidade\", à direita da barra de busca.",
            "No campo Cliente, digite parte do nome ou do CNPJ do cliente.",
            "Toque no cliente certo na lista de sugestões.",
            "Digite o CNPJ da unidade, se houver.",
            "Toque em \"Preencher pela Receita\" para buscar nome, endereço, cidade, UF e telefone.",
            "Confira o nome da unidade. Ele é obrigatório.",
            "Confira endereço, cidade e UF. Sem eles a unidade fica como \"Cadastro incompleto\".",
            "Preencha o responsável no local e o telefone.",
            "Toque em \"Cadastrar unidade\"."
          ]
        },
        {
          titulo: "Cadastrar a partir do cliente",
          itens: [
            "Em \"Clientes\", toque em \"Mais\" na linha do cliente.",
            "Toque em \"Nova unidade deste cliente\".",
            "O formulário de Unidades abre com o cliente já escolhido."
          ]
        },
        {
          titulo: "Encontrar uma unidade",
          itens: [
            "Digite na busca o nome da unidade, o cliente, o CNPJ, a cidade ou o responsável.",
            "Escolha um cliente em \"Todos os clientes\" para ver só as unidades dele.",
            "Escolha uma UF em \"Todas as UF\" para filtrar pelo estado.",
            "Toque em um número do topo para ver só aquele grupo. Toque de novo para desfazer.",
            "Toque em \"Limpar filtros\" para voltar à lista completa."
          ]
        },
        {
          titulo: "Ver o detalhe e os vínculos",
          itens: [
            "Toque na linha da unidade. O painel de detalhe abre ao lado.",
            "Na aba \"Dados\", confira nome, cliente, CNPJ, endereço e contato.",
            "Toque na aba \"Equipamentos\" para ver o cliente da unidade e os equipamentos dela.",
            "Toque em \"Abrir\" para ir ao cliente ou a um equipamento.",
            "Toque em \"Novo equipamento\" para cadastrar um equipamento já nesta unidade.",
            "Toque na aba \"Documentos\" para ver os documentos da unidade e o vencimento de cada um."
          ]
        },
        {
          titulo: "Editar uma unidade",
          itens: [
            "Toque em \"Editar\" na linha ou no rodapé do painel.",
            "Altere o que precisa. O cliente aparece travado: ele não muda por aqui.",
            "Toque em \"Salvar alterações\".",
            "Para levar a unidade a outro cliente, a gestão usa \"Vínculos › Transferir\", indicado embaixo do campo Cliente."
          ]
        },
        {
          titulo: "Inativar, reativar ou excluir",
          itens: [
            "Toque em \"Mais\" na linha ou em \"Mais ações\" no painel.",
            "Toque em \"Inativar unidade\" e confirme. Equipamentos e documentos continuam guardados.",
            "Para voltar a usar, toque em \"Reativar unidade\" e confirme. O cliente da unidade precisa estar ativo.",
            "Para apagar de vez, toque em \"Excluir unidade\" e depois em \"Excluir definitivamente\". Só a gestão exclui, e só unidade sem equipamento nem documento.",
            "Para mudar de cliente, toque em \"Transferir para outro cliente (Vínculos)\". Só a gestão usa essa opção."
          ]
        },
        {
          titulo: "Usar no celular",
          itens: [
            "A lista aparece em cartões, com o nome, o cliente, a cidade, a situação e as quantidades.",
            "Toque no cartão para abrir o detalhe em tela cheia.",
            "Toque em Voltar, na barra do topo, para fechar o painel e voltar à lista."
          ]
        }
      ],
      cores: [
        { nome: "Número \"Total\"", significado: "Todas as unidades que você pode ver." },
        { nome: "Número verde \"Ativas\"", significado: "Unidades em uso." },
        { nome: "Número \"Inativas\"", significado: "Unidades tiradas de uso, com o histórico guardado." },
        { nome: "Número vermelho \"Vínculo pendente\"", significado: "Unidade ativa cujo cliente está inativo ou não existe. Ela não recebe atendimento até a gestão corrigir em Vínculos." },
        { nome: "Número amarelo \"Cadastro incompleto\"", significado: "Falta endereço, cidade ou UF." },
        { nome: "Número vermelho \"Documento vencido ou vencendo\"", significado: "A unidade tem documento vencido ou que vence em até 30 dias." },
        { nome: "Selo verde \"Ativo\"", significado: "A unidade está em uso." },
        { nome: "Selo cinza \"Inativo\"", significado: "A unidade foi tirada de uso. Nada foi apagado." },
        { nome: "Etiqueta vermelha \"Vínculo pendente\"", significado: "Mesmo caso do número do topo. O painel diz o que fazer." },
        { nome: "Etiqueta amarela \"Cadastro incompleto\"", significado: "Pare o ponteiro sobre ela para ver o que falta." },
        { nome: "Etiquetas \"Documento vencido\" (vermelha) e \"Documento vencendo\" (amarela)", significado: "Há documento vencido ou vencendo em até 30 dias nesta unidade." },
        { nome: "Texto \"Cliente inativo\" na coluna Cliente", significado: "O cliente desta unidade está inativo. Reative o cliente antes de reativar a unidade." },
        { nome: "Campo Cliente em cinza no formulário", significado: "O cliente está travado. A troca é feita pela gestão em Vínculos." }
      ],
      problemas: [
        { situacao: "Aparece \"Escolha o cliente na lista\".", oQueFazer: "Digite parte do nome ou do CNPJ e toque na sugestão. Só digitar o nome não basta." },
        { situacao: "O cliente não aparece na lista de sugestões.", oQueFazer: "Só aparecem clientes ativos. Confira em \"Clientes\" se ele está cadastrado e reative se estiver inativo." },
        { situacao: "Aparece \"Já existe unidade com este CNPJ\".", oQueFazer: "Toque em \"Abrir a unidade existente\". Se ela estiver no cliente errado, peça à gestão para transferir em Vínculos." },
        { situacao: "Aparece \"Não é permitido cadastrar unidade para cliente inativo.\"", oQueFazer: "Reative o cliente em \"Clientes\" e cadastre a unidade de novo." },
        { situacao: "Aparece \"Não é permitido reativar unidade vinculada a cliente inativo.\"", oQueFazer: "Reative primeiro o cliente (\"Clientes\" › \"Mais\" › \"Reativar cliente\") e depois a unidade." },
        { situacao: "Aparece \"Informe o nome da unidade.\"", oQueFazer: "Preencha o nome. Exemplo: Hospital Modelo - Anexo Norte." },
        { situacao: "Aparece \"Telefone com DDD: 10 ou 11 números.\"", oQueFazer: "Digite o telefone com DDD, por exemplo (19) 3333-0000." },
        { situacao: "\"Excluir unidade\" foi recusado porque há equipamentos ou documentos ligados.", oQueFazer: "Use \"Inativar unidade\", ou peça à gestão para transferir em Vínculos." },
        { situacao: "\"Transferir para outro cliente (Vínculos)\" ou \"Excluir unidade\" aparecem apagados.", oQueFazer: "Essas ações são da gestão (Gestor, Diretoria ou Administrador). Peça a eles informando a unidade e o motivo." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Cadastrar, editar, inativar, reativar e excluir unidades sem nada ligado. Transferir a unidade para outro cliente em Vínculos." },
        { perfil: "TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Cadastrar, editar, inativar e reativar unidades. Excluir e trocar de cliente fica com a gestão." },
        { perfil: "CLIENTE", pode: "Ver as unidades da própria empresa, com os equipamentos e os documentos. Para corrigir um dado, fale com a Metrolabs." }
      ],
      perguntas: [
        { p: "A unidade principal pode ter o mesmo CNPJ do cliente?", r: "Sim. É o caso mais comum: a unidade principal usa o mesmo CNPJ e o mesmo endereço do cliente." },
        { p: "Por que não consigo trocar o cliente de uma unidade?", r: "Porque os equipamentos e os documentos precisam acompanhar. A troca é feita pela gestão em \"Vínculos\", com prévia e registro do motivo." },
        { p: "O que acontece com os equipamentos se eu inativar a unidade?", r: "Eles continuam guardados, com os documentos. A unidade só sai das listas de novos atendimentos." },
        { p: "Sou cliente. Por que não vejo o botão Editar?", r: "O perfil Cliente só consulta. Para corrigir um dado, fale com a Metrolabs." }
      ]
    },

    // =====================================================================
    // EQUIPAMENTOS
    // =====================================================================
    "equipamentos": {
      titulo: "Equipamentos",
      paraQueServe: "Cadastra o parque de equipamentos de cada cliente e unidade, identificados pela TAG. Mostra a situação dos documentos de cada equipamento e gera o QR Code da etiqueta.",
      antesDeComecar: [
        "O cliente e a unidade precisam estar cadastrados e ativos.",
        "Tenha em mãos a TAG (código da etiqueta ou do patrimônio), o número de série, o fabricante e o modelo, como estão na placa do equipamento.",
        "A TAG não pode se repetir entre equipamentos ativos do mesmo cliente.",
        "Para o perfil Cliente, esta tela mostra só os equipamentos da própria empresa."
      ],
      passos: [
        {
          titulo: "Cadastrar um equipamento",
          itens: [
            "Toque em \"Equipamentos\" no menu.",
            "Toque em \"Novo equipamento\", à direita da barra de busca.",
            "No campo Cliente, digite parte do nome ou do CNPJ e toque no cliente certo.",
            "Escolha a unidade onde o equipamento fica. Se o cliente tiver uma só unidade, ela já vem escolhida.",
            "Digite o tipo do equipamento ou escolha um da lista (por exemplo, Autoclave).",
            "Digite a TAG.",
            "Confira a mensagem embaixo da TAG. Se aparecer que o cliente já tem um equipamento ativo com essa TAG, toque em \"Abrir o existente\".",
            "Digite o número de série, o fabricante e o modelo.",
            "Digite o setor ou local (por exemplo, CME ou Centro cirúrgico).",
            "Toque em \"Cadastrar equipamento\"."
          ]
        },
        {
          titulo: "Cadastrar a partir do cliente ou da unidade",
          itens: [
            "Em \"Clientes\", toque em \"Mais\" e depois em \"Novo equipamento deste cliente\".",
            "Ou, em \"Unidades\", toque em \"Mais\" e depois em \"Novo equipamento nesta unidade\".",
            "O formulário abre com o cliente (e a unidade) já escolhidos."
          ]
        },
        {
          titulo: "Encontrar um equipamento",
          itens: [
            "Digite na busca a TAG, o tipo, a série, o fabricante, o modelo, o cliente ou o setor.",
            "Escolha um cliente em \"Todos os clientes\" para ver só os equipamentos dele.",
            "Escolha um tipo em \"Todos os tipos\".",
            "Escolha \"Vencimento mais próximo\" para ver primeiro os documentos que vencem antes.",
            "Toque em um número do topo para ver só aquele grupo. Toque de novo para desfazer."
          ]
        },
        {
          titulo: "Ver o detalhe, os documentos e os atendimentos",
          itens: [
            "Toque na linha do equipamento. O painel de detalhe abre ao lado.",
            "Na aba \"Dados\", confira a identificação, onde o equipamento está e o resumo dos documentos.",
            "Toque em \"Abrir cliente\" ou \"Abrir unidade\" para ir ao cadastro deles.",
            "Toque na aba \"Documentos\" para ver os documentos e o vencimento de cada um.",
            "Toque em \"Novo documento deste equipamento\" para enviar um documento já ligado a ele.",
            "Toque na aba \"Atendimentos\" para ver os atendimentos do Auvo ligados ao equipamento.",
            "Toque em \"Ver O.S.\" para abrir a ordem de serviço do atendimento."
          ]
        },
        {
          titulo: "Imprimir o QR Code da etiqueta",
          itens: [
            "Toque em \"Mais\" na linha do equipamento.",
            "Toque em \"QR Code e etiqueta\".",
            "Confira TAG, tipo, modelo e série na janela.",
            "Toque em \"Imprimir etiqueta\". Abre uma folha A4 com a etiqueta de 9 × 5 cm no canto de cima e a janela de impressão.",
            "Escolha a impressora e imprima. Se a janela de impressão não abrir, toque em \"Imprimir etiqueta\" no alto da folha.",
            "Recorte na linha tracejada e cole a etiqueta no equipamento, em local visível e sem dobras.",
            "Toque em \"Fechar\" para sair da janela do QR Code."
          ]
        },
        {
          titulo: "Editar um equipamento",
          itens: [
            "Toque em \"Editar\" na linha ou no rodapé do painel.",
            "Altere o que precisa. O cliente e a unidade aparecem travados: eles não mudam por aqui.",
            "Toque em \"Salvar alterações\".",
            "Para mudar de unidade ou de cliente, a gestão usa \"Vínculos › Transferir\", indicado no formulário."
          ]
        },
        {
          titulo: "Inativar, reativar ou excluir",
          itens: [
            "Toque em \"Mais\" na linha ou em \"Mais ações\" no painel.",
            "Toque em \"Inativar equipamento\" e confirme. Documentos, certificados e atendimentos continuam guardados.",
            "Para voltar a usar, toque em \"Reativar equipamento\" e confirme. O cliente e a unidade precisam estar ativos.",
            "Para apagar de vez, toque em \"Excluir equipamento\" e depois em \"Excluir definitivamente\". Só a gestão exclui.",
            "Equipamento com documento, certificado, laudo ou atendimento ligado não é excluído. Use \"Inativar equipamento\".",
            "Para mudar de unidade, toque em \"Transferir para outra unidade (Vínculos)\". Só a gestão usa essa opção."
          ]
        },
        {
          titulo: "Usar no celular",
          itens: [
            "A lista aparece em cartões, com a TAG, o tipo, o cliente, a unidade, a série e a situação.",
            "Toque no cartão para abrir o detalhe em tela cheia.",
            "Toque em Voltar, na barra do topo, para fechar o painel e voltar à lista."
          ]
        }
      ],
      cores: [
        { nome: "Número \"Total\"", significado: "Todos os equipamentos que você pode ver." },
        { nome: "Número verde \"Ativos\"", significado: "Equipamentos em uso." },
        { nome: "Número \"Inativos\"", significado: "Equipamentos tirados de uso, com o histórico guardado." },
        { nome: "Número amarelo \"Cadastro incompleto\"", significado: "Falta TAG, fabricante, modelo ou número de série." },
        { nome: "Número vermelho \"Vínculo pendente\"", significado: "A unidade ou o cliente estão inativos, ou a unidade é de outro cliente. A correção é feita em Vínculos (gestão)." },
        { nome: "Número vermelho \"Documento vencido ou vencendo\"", significado: "O equipamento tem documento vencido ou que vence em até 30 dias." },
        { nome: "Número amarelo \"Sem documento\"", significado: "Nenhum documento do equipamento no Arquivo de documentos." },
        { nome: "Selo verde \"Ativo\" e selo cinza \"Inativo\"", significado: "Situação do equipamento: em uso ou tirado de uso." },
        { nome: "Etiqueta vermelha \"N vencido(s)\" na coluna Documentos", significado: "Quantos documentos do equipamento estão vencidos." },
        { nome: "Etiqueta amarela \"N vencendo\" na coluna Documentos", significado: "Quantos documentos vencem em até 30 dias." },
        { nome: "Etiqueta azul \"Sem documento\"", significado: "O equipamento ainda não tem documento no arquivo." },
        { nome: "Selo verde \"Concluído\" na aba Atendimentos", significado: "O atendimento do Auvo foi finalizado." },
        { nome: "Selo amarelo \"Em andamento\" na aba Atendimentos", significado: "O atendimento do Auvo ainda não foi finalizado." }
      ],
      problemas: [
        { situacao: "Aparece \"Este cliente já tem um equipamento ativo com a TAG ...\".", oQueFazer: "Toque em \"Abrir o existente\" e confira se é o mesmo equipamento. Se for outro, use uma TAG diferente." },
        { situacao: "A lista de unidades mostra \"Este cliente não tem unidade ativa\".", oQueFazer: "Toque em \"Nova unidade\", no aviso embaixo do campo, cadastre a unidade e volte ao equipamento." },
        { situacao: "Aparece \"Escolha a unidade onde o equipamento fica.\"", oQueFazer: "Escolha o cliente primeiro e depois a unidade na lista." },
        { situacao: "Aparece \"Informe o tipo do equipamento.\"", oQueFazer: "Digite o tipo ou escolha um da lista, por exemplo Autoclave ou Refrigerador." },
        { situacao: "Ao reativar aparece que o cliente ou a unidade do equipamento está inativa.", oQueFazer: "Reative antes o cliente em \"Clientes\" ou a unidade em \"Unidades\" e depois o equipamento." },
        { situacao: "\"Excluir equipamento\" aparece apagado com \"Tem documento ligado: não é excluído\".", oQueFazer: "Use \"Inativar equipamento\". O histórico fica guardado." },
        { situacao: "O QR Code não foi gerado.", oQueFazer: "Confira a conexão e toque de novo em \"QR Code e etiqueta\". Nada foi alterado." },
        { situacao: "Aparece \"O navegador bloqueou a janela da etiqueta\".", oQueFazer: "Libere as janelas deste site pelo ícone na barra de endereço do navegador e toque em \"Imprimir etiqueta\" de novo." },
        { situacao: "A aba \"Atendimentos\" mostra \"Nenhum atendimento do Auvo ligado a este equipamento\".", oQueFazer: "O atendimento ainda não foi ligado a este equipamento no Auvo. Fale com a gestão da integração Auvo." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Cadastrar, editar, inativar, reativar e excluir equipamentos sem nada ligado. Transferir para outra unidade em Vínculos." },
        { perfil: "TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Cadastrar, editar, inativar e reativar equipamentos, gerar o QR Code e anexar documentos. Excluir e transferir fica com a gestão." },
        { perfil: "CLIENTE", pode: "Ver os equipamentos da própria empresa, os documentos de cada um e o QR Code (botão \"QR Code\"). Para corrigir um dado, fale com a Metrolabs." }
      ],
      perguntas: [
        { p: "O que é a TAG?", r: "É o código que identifica o equipamento no cliente, como o número do patrimônio ou da etiqueta. Exemplo: AUT-01." },
        { p: "Posso usar a mesma TAG em clientes diferentes?", r: "Sim. A TAG só não pode se repetir entre equipamentos ativos do mesmo cliente." },
        { p: "Por que não consigo excluir um equipamento?", r: "Porque ele tem documento, certificado, laudo ou atendimento ligado. Use \"Inativar equipamento\", que guarda o histórico." },
        { p: "Para que serve o QR Code?", r: "A etiqueta colada no equipamento leva ao cadastro dele no sistema, com os documentos, sem precisar procurar pela TAG." },
        { p: "Como mudo o equipamento de unidade?", r: "Pela tela \"Vínculos\", com o tipo Equipamento e a ação Transferir. Só a gestão faz. Os documentos do equipamento acompanham." }
      ]
    },

    // =====================================================================
    // VÍNCULOS
    // =====================================================================
    "vinculos": {
      titulo: "Vínculos",
      paraQueServe: "Mostra a cadeia cliente, unidade, equipamento e documentos, e aponta os cadastros com problema. Pela gestão, transfere, junta cadastros repetidos, desvincula, inativa, reativa ou exclui, sempre com prévia do impacto e registro do motivo.",
      antesDeComecar: [
        "Saiba qual cadastro precisa de correção: o cliente, a unidade ou o equipamento.",
        "Tenha o motivo da alteração. Ele é obrigatório (mínimo de 8 caracteres) e fica registrado com o seu nome, a data e a hora.",
        "As ações são da gestão (Gestor, Diretoria ou Administrador). Os demais perfis só consultam.",
        "O perfil Cliente não vê esta tela."
      ],
      passos: [
        {
          titulo: "1. Escolher a origem",
          itens: [
            "Toque em \"Vínculos\" no menu.",
            "Toque em um número do topo para ver só os cadastros com aquele problema. Toque de novo para desfazer.",
            "Escolha o tipo: \"Cliente\", \"Unidade\" ou \"Equipamento\".",
            "Digite na busca o nome, o CNPJ, a TAG ou o endereço.",
            "Se quiser, escolha uma situação em \"Todas as situações\".",
            "Toque no cadastro na lista."
          ]
        },
        {
          titulo: "2. Conferir a situação",
          itens: [
            "Leia o selo e a faixa da situação no cartão \"Situação\".",
            "Confira a que o cadastro está ligado e quantos itens dependem dele.",
            "Toque em \"Ver as unidades\" ou \"Ver os equipamentos\" para abrir a lista dos ligados.",
            "Confira em \"Onde este cadastro aparece\" os módulos que usam este cadastro.",
            "Para corrigir nome, endereço ou contato, toque em \"Abrir o cadastro\".",
            "Se o cliente estiver \"Sem unidade\", toque em \"Criar a unidade principal\" e confirme."
          ]
        },
        {
          titulo: "3. Escolher a ação (gestão)",
          itens: [
            "No cartão \"Escolha a ação\", marque a ação desejada. O texto de cada uma explica o que acontece.",
            "Em \"Transferir\" ou \"Juntar cadastros repetidos\", filtre e escolha o destino na lista.",
            "Escreva o motivo da alteração.",
            "Toque em \"Conferir o impacto\". Nada é gravado nesta etapa."
          ]
        },
        {
          titulo: "4. Conferir a prévia do impacto (gestão)",
          itens: [
            "Confira a origem, o destino e a ação.",
            "Leia as faixas vermelhas \"Impede a operação\". Enquanto houver uma delas, não é possível confirmar.",
            "Leia as faixas amarelas de aviso.",
            "Confira a tabela \"Documentos que acompanham\", com de onde e para onde vai cada documento.",
            "Toque em \"Todas as alterações\" para ver cada campo, com o antes e o depois."
          ]
        },
        {
          titulo: "5. Confirmar (gestão)",
          itens: [
            "Toque no botão \"Confirmar: ...\", que leva o nome da ação.",
            "Confira o resumo na janela: origem, destino, número de alterações, documentos e motivo.",
            "Toque em \"Aplicar a alteração\".",
            "Confira o aviso de resultado. A alteração fica registrada na auditoria.",
            "A prévia vale 10 minutos. Se passar disso, toque de novo em \"Conferir o impacto\"."
          ]
        },
        {
          titulo: "Abrir já com um cadastro escolhido",
          itens: [
            "Em \"Clientes\", \"Unidades\" ou \"Equipamentos\", toque em \"Mais\".",
            "Toque em \"Juntar cadastro repetido (Vínculos)\", \"Transferir para outro cliente (Vínculos)\" ou \"Transferir para outra unidade (Vínculos)\".",
            "A tela Vínculos abre com o cadastro já escolhido como origem."
          ]
        },
        {
          titulo: "Usar no celular",
          itens: [
            "Os cartões ficam um embaixo do outro: origem, situação, ação, prévia e confirmar.",
            "Ao tocar num cadastro, a tela rola até a situação.",
            "Toque em Voltar, na barra do topo, para voltar ao Início."
          ]
        }
      ],
      cores: [
        { nome: "Número amarelo \"Clientes sem unidade\"", significado: "Clientes ativos sem nenhuma unidade ativa. Não recebem atendimento." },
        { nome: "Número vermelho \"Unidades com vínculo pendente\"", significado: "Unidades sem cliente ativo. Bloqueiam novos atendimentos." },
        { nome: "Número vermelho \"Equipamentos inconsistentes\"", significado: "Equipamentos com cliente e unidade que não batem, ou inativos." },
        { nome: "Número amarelo \"Possíveis duplicidades\"", significado: "Mesmo CNPJ, ou mesma TAG no cliente, em outro cadastro ativo." },
        { nome: "Número verde \"Cadastros regulares\"", significado: "Cadastros e vínculos em ordem." },
        { nome: "Selo verde \"Regular\"", significado: "Cadastro e vínculo em ordem." },
        { nome: "Selo amarelo \"Sem unidade\"", significado: "Cliente ativo sem unidade ativa." },
        { nome: "Selo vermelho \"Vínculo pendente\"", significado: "Unidade sem cliente ativo." },
        { nome: "Selo vermelho \"Inconsistente\"", significado: "Equipamento com cliente e unidade que não batem, ou inativos." },
        { nome: "Selo amarelo \"Duplicidade\"", significado: "Existe outro cadastro ativo com o mesmo CNPJ ou a mesma TAG." },
        { nome: "Selo cinza \"Inativo\"", significado: "Cadastro inativo, guardado no histórico." },
        { nome: "Passos numerados de 1 a 5 no alto", significado: "Mostram em que etapa você está. O passo atual fica destacado; os anteriores aparecem como feitos." },
        { nome: "Ações com o nome em vermelho", significado: "Ações de risco: juntar cadastros, desvincular, inativar e excluir. Ao marcar uma delas, a borda fica vermelha e o botão de confirmar também." },
        { nome: "Faixa vermelha \"Impede a operação\"", significado: "Algo bloqueia a ação. Resolva e confira o impacto de novo." },
        { nome: "Faixa amarela na prévia", significado: "Aviso. A ação pode ser feita, mas leia antes de confirmar." },
        { nome: "Faixa azul para quem não é da gestão", significado: "Explica que as ações são da gestão e a quem pedir." },
        { nome: "Cartões apagados", significado: "Etapa ainda não liberada. Complete a etapa anterior." }
      ],
      problemas: [
        { situacao: "Aparece \"Escreva o motivo com pelo menos 8 caracteres.\"", oQueFazer: "Escreva o motivo com mais detalhe. Exemplo: cadastro repetido do mesmo CNPJ." },
        { situacao: "Aparece \"Escolha o destino na lista.\"", oQueFazer: "Filtre pelo nome ou CNPJ e toque no destino. Só aparecem destinos ativos." },
        { situacao: "Aparece \"A prévia vale 10 minutos e expirou. Nada foi gravado.\"", oQueFazer: "Toque em \"Conferir o impacto\" de novo e confirme." },
        { situacao: "Aparece \"Alguém alterou cadastros ou vínculos depois da sua prévia\".", oQueFazer: "Por segurança, nada foi gravado. Toque em \"Conferir o impacto\" de novo e confirme a nova prévia." },
        { situacao: "Aparece \"Esta prévia foi feita em outro login ou em outra aba.\"", oQueFazer: "Confira o impacto de novo nesta tela e confirme." },
        { situacao: "Aparece \"Só dá para consolidar clientes com o mesmo CNPJ.\"", oQueFazer: "Filiais com CNPJ diferente são clientes separados. Para levar uma unidade a outro cliente, use o tipo Unidade e a ação Transferir." },
        { situacao: "Aparece \"Os dois equipamentos têm números de série diferentes\".", oQueFazer: "Eles não são o mesmo equipamento. Se um número estiver errado, toque em \"Abrir o cadastro\", corrija e refaça." },
        { situacao: "Aparece \"O destino escolhido está inativo.\"", oQueFazer: "Escolha um destino ativo, ou reative o destino antes, e refaça." },
        { situacao: "Aparece \"o cliente não tem CNPJ válido\" ao criar a unidade principal.", oQueFazer: "Toque em \"Abrir o cadastro\", informe o CNPJ do cliente, salve e tente de novo." },
        { situacao: "Não aparecem as ações nem o botão de prévia.", oQueFazer: "Seu perfil não é da gestão. Peça a um Gestor, Diretoria ou Administrador, informando o cadastro e o motivo." },
        { situacao: "O painel de vínculos não carregou.", oQueFazer: "Toque em \"Tentar de novo\". Se continuar, confira a conexão." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Ver tudo, escolher a ação, conferir o impacto, confirmar e ver o histórico das alterações." },
        { perfil: "TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Ver a situação de cada cadastro, abrir o cadastro para corrigir dados e criar a unidade principal de cliente sem unidade. As ações de vínculo ficam com a gestão." },
        { perfil: "CLIENTE", pode: "Não vê esta tela." }
      ],
      perguntas: [
        { p: "O que acompanha uma unidade transferida para outro cliente?", r: "Os equipamentos da unidade e os documentos do Arquivo de documentos. O arquivo fica na mesma pasta e o link não muda." },
        { p: "Certificados e laudos também mudam de cliente?", r: "Não. Certificados, laudos NR-13 e atendimentos do Auvo ficam no cadastro original. A prévia mostra quantos registros ficam." },
        { p: "Juntar cadastros repetidos apaga a origem?", r: "Não. Tudo vai para o destino e a origem fica inativa." },
        { p: "Desvincular é o mesmo que excluir?", r: "Não. Desvincular tira a unidade do cliente, ou o equipamento da unidade. O cadastro fica com vínculo pendente até ser ligado de novo." },
        { p: "Onde vejo quem fez cada alteração?", r: "Na aba \"Histórico das alterações\" (gestão), com data, autor, motivo e cada campo antes e depois." }
      ]
    },

    "vinculos/historico": {
      titulo: "Histórico das alterações",
      paraQueServe: "Lista as últimas alterações de vínculo feitas pela tela Vínculos, com data, autor, motivo e cada campo antes e depois.",
      antesDeComecar: [
        "A aba só aparece para a gestão (Gestor, Diretoria ou Administrador)."
      ],
      passos: [
        {
          titulo: "Consultar o histórico",
          itens: [
            "Na tela \"Vínculos\", toque na aba \"Histórico das alterações\".",
            "Confira cada linha: data e hora, ação, cadastro de origem, autor e número de alterações.",
            "Toque na linha para abrir o motivo e a tabela com área, registro, campo, antes e depois.",
            "Toque em \"Atualizar\" para trazer as alterações mais recentes.",
            "Toque na aba \"Conferir e alterar\" para voltar ao fluxo de correção."
          ]
        }
      ],
      cores: [
        { nome: "Texto \"N documento(s) acompanharam\"", significado: "Quantos documentos mudaram junto com a unidade ou o equipamento." },
        { nome: "Valor \"Excluído\" na coluna Depois", significado: "O cadastro foi excluído nessa operação." }
      ],
      problemas: [
        { situacao: "Aparece \"Nenhuma alteração de vínculo registrada ainda.\"", oQueFazer: "Nenhuma transferência, junção, desvinculação, inativação ou exclusão foi feita pela tela Vínculos até agora." },
        { situacao: "O histórico não carregou.", oQueFazer: "Toque em \"Tentar de novo\". Se continuar, confira a conexão." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Ver o histórico completo das alterações de vínculo." }
      ],
      perguntas: [
        { p: "O histórico pode ser apagado?", r: "Não pela tela. Cada operação fica registrada na auditoria com o motivo." }
      ]
    },

    // =====================================================================
    // ARQUIVO DE DOCUMENTOS
    // =====================================================================
    "documentos": {
      titulo: "Arquivo de documentos",
      paraQueServe: "Guarda os relatórios, certificados, ordens de serviço e contratos de cada cliente, organizados pelas categorias da NBR 15943. Avisa os documentos vencidos, os que vencem em até 30 dias e os registros sem arquivo.",
      antesDeComecar: [
        "O cliente e a unidade precisam estar cadastrados e ativos. O equipamento é opcional.",
        "Tenha o arquivo em PDF, imagem, Word ou Excel, com até 5 MB.",
        "Saiba a data de vencimento, se o documento tiver uma. Com data, ele entra nos alertas.",
        "O arquivo é guardado na pasta Cliente › Unidade › TAG › categoria.",
        "Para o perfil Cliente, esta tela mostra só os documentos da própria empresa."
      ],
      passos: [
        {
          titulo: "Enviar um documento",
          itens: [
            "Toque em \"Arquivo de documentos\" no menu.",
            "Toque em \"Novo documento\", à direita da barra de busca.",
            "No campo Cliente, digite parte do nome ou do CNPJ e toque no cliente certo.",
            "Escolha a unidade.",
            "Escolha o equipamento, se o documento for de um equipamento. Deixe \"Geral da unidade (sem equipamento)\" para documentos como contrato.",
            "Escolha a categoria (NBR 15943).",
            "Digite o nome ou a referência do documento.",
            "Escolha a data de vencimento, se houver.",
            "Escolha o arquivo.",
            "Espere aparecer \"Pronto para enviar\" embaixo do campo do arquivo.",
            "Toque em \"Salvar documento\"."
          ]
        },
        {
          titulo: "Enviar a partir do equipamento",
          itens: [
            "Em \"Equipamentos\", toque em \"Mais\" na linha do equipamento.",
            "Toque em \"Novo documento deste equipamento\".",
            "O formulário abre com cliente, unidade e equipamento já escolhidos."
          ]
        },
        {
          titulo: "Encontrar um documento",
          itens: [
            "Digite na busca o nome do documento, o cliente, a unidade, a TAG ou a categoria.",
            "Escolha uma categoria em \"Todas as categorias\".",
            "Escolha um cliente em \"Todos os clientes\".",
            "Escolha a ordem: \"Mais recentes primeiro\", \"Vencimento mais próximo\" ou \"Ordenar por nome\".",
            "Toque em um número do topo para ver só aquele grupo. Toque de novo para desfazer."
          ]
        },
        {
          titulo: "Ver e abrir um documento",
          itens: [
            "Toque na linha do documento. O painel de detalhe abre ao lado.",
            "Confira a categoria, o vencimento e a que o documento está ligado.",
            "Toque em \"Abrir arquivo\" para ver ou baixar o arquivo.",
            "Toque em \"Abrir cliente\", \"Abrir unidade\" ou \"Abrir equipamento\" para ir aos cadastros ligados."
          ]
        },
        {
          titulo: "Anexar o arquivo que faltou",
          itens: [
            "Toque no número \"Sem arquivo\" do topo.",
            "Toque no documento.",
            "Toque em \"Editar e anexar arquivo\".",
            "Escolha o arquivo e espere aparecer \"Pronto para enviar\".",
            "Toque em \"Salvar alterações\"."
          ]
        },
        {
          titulo: "Editar ou renovar",
          itens: [
            "Toque em \"Editar\" na linha ou no rodapé do painel.",
            "Altere a categoria, o nome ou o vencimento.",
            "Para trocar o arquivo, escolha outro em \"Substituir o arquivo\". Sem escolher, o arquivo atual fica.",
            "Toque em \"Salvar alterações\".",
            "Para renovar um documento vencido, cadastre um novo (mesmo equipamento e mesma categoria) com o vencimento novo."
          ]
        },
        {
          titulo: "Inativar, reativar ou excluir",
          itens: [
            "Toque em \"Mais\" na linha ou em \"Mais ações\" no painel.",
            "Toque em \"Inativar documento\" e confirme. Ele sai dos alertas e da lista do cliente; o arquivo continua guardado.",
            "Para voltar, toque em \"Reativar documento\" e confirme.",
            "Para tirar da lista de vez, toque em \"Excluir documento\" e depois em \"Excluir da lista\". Só a gestão exclui. O arquivo guardado não é apagado."
          ]
        },
        {
          titulo: "Usar no celular",
          itens: [
            "A lista aparece em cartões, com o nome, a categoria, o cliente, o vencimento e a situação.",
            "Toque no cartão para abrir o detalhe em tela cheia.",
            "Toque em Voltar, na barra do topo, para fechar o painel e voltar à lista."
          ]
        }
      ],
      cores: [
        { nome: "Número \"Total\"", significado: "Todos os documentos que você pode ver." },
        { nome: "Número verde \"Ativos\"", significado: "Documentos em uso." },
        { nome: "Número \"Inativos\"", significado: "Documentos tirados de uso. O arquivo continua guardado." },
        { nome: "Número vermelho \"Vencidos\"", significado: "Documentos que venceram ou vencem hoje." },
        { nome: "Número amarelo \"Vencendo em 30 dias\"", significado: "Documentos que vencem em até 30 dias." },
        { nome: "Número amarelo \"Sem arquivo\"", significado: "Registros feitos sem o arquivo. Abra, toque em Editar e anexe." },
        { nome: "Selo vermelho \"Vencido\" ou \"Vence hoje\"", significado: "O documento venceu ou vence hoje. A data aparece embaixo." },
        { nome: "Selo amarelo \"Vence em N dias\"", significado: "Faltam N dias para vencer (até 30)." },
        { nome: "Data simples na coluna Vencimento", significado: "O documento está em dia." },
        { nome: "Texto \"Sem vencimento\"", significado: "O documento não tem data de vencimento e não entra nos alertas." },
        { nome: "Etiqueta amarela \"Sem arquivo\"", significado: "Falta anexar o arquivo." },
        { nome: "Selo amarelo \"Pendente\"", significado: "Documento registrado sem arquivo, aguardando o anexo." },
        { nome: "Selo verde \"Ativo\" e selo cinza \"Inativo\"", significado: "Situação do documento: em uso ou tirado de uso." },
        { nome: "Texto \"Geral da unidade\" na coluna Equipamento", significado: "O documento é da unidade, sem equipamento (por exemplo, um contrato)." },
        { nome: "Campo em cinza no formulário", significado: "O vínculo já preenchido está travado. Só a gestão troca cliente, unidade ou equipamento de um documento." }
      ],
      problemas: [
        { situacao: "Aparece \"O arquivo tem ... MB; o limite é 5 MB.\"", oQueFazer: "Reduza o arquivo (por exemplo, um PDF compactado) e escolha de novo." },
        { situacao: "Aparece \"Aguarde terminar a leitura do arquivo e clique em Salvar de novo.\"", oQueFazer: "Espere aparecer \"Pronto para enviar\" e toque em \"Salvar documento\" de novo." },
        { situacao: "Aparece \"Aguarde carregar as unidades e os equipamentos e salve de novo.\"", oQueFazer: "Espere as listas de unidade e equipamento terminarem de carregar e salve de novo." },
        { situacao: "Aparece \"Escolha o cliente na lista.\", \"Escolha a unidade.\" ou \"Escolha a categoria.\"", oQueFazer: "Preencha o campo indicado. Cliente, unidade, categoria e nome são obrigatórios." },
        { situacao: "A unidade mostra \"Este cliente não tem unidade ativa\".", oQueFazer: "Cadastre ou reative uma unidade do cliente em \"Unidades\" e volte ao documento." },
        { situacao: "Aparece \"Documento registrado como pendente (sem arquivo)\".", oQueFazer: "O registro foi salvo sem arquivo. Abra o documento, toque em \"Editar e anexar arquivo\" e anexe." },
        { situacao: "Aparece \"Não foi possível guardar o arquivo no Drive\".", oQueFazer: "Nada foi registrado. Confira a conexão e tente de novo." },
        { situacao: "Aparece \"Trocar o cliente, a unidade ou o equipamento de um documento já vinculado é feito pela gestão\".", oQueFazer: "Os outros campos podem ser editados. Para corrigir o vínculo, peça à gestão." },
        { situacao: "\"Abrir arquivo (sem arquivo)\" aparece apagado.", oQueFazer: "O documento ainda não tem arquivo. Toque em \"Editar\" e anexe." },
        { situacao: "\"Excluir documento\" aparece apagado.", oQueFazer: "Excluir é feito pela gestão. Para tirar de uso, use \"Inativar documento\"." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Enviar, editar, trocar o vínculo, inativar, reativar e excluir documentos da lista." },
        { perfil: "TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Enviar, editar, anexar arquivo, inativar e reativar documentos. O vínculo já preenchido fica travado; excluir fica com a gestão." },
        { perfil: "CLIENTE", pode: "Ver os documentos da própria empresa e abrir o arquivo pelo botão \"Abrir arquivo\"." }
      ],
      perguntas: [
        { p: "Qual a diferença entre \"Vencendo\" e \"Vencido\"?", r: "Vencendo vence em até 30 dias. Vencido já venceu ou vence hoje. É a mesma regra da central de pendências do Início." },
        { p: "Excluir apaga o arquivo?", r: "Não. O registro sai da lista, mas o arquivo guardado não é apagado." },
        { p: "Posso salvar sem o arquivo?", r: "Sim. O documento fica como \"Sem arquivo\" até alguém anexar." },
        { p: "Como renovo um certificado vencido?", r: "Cadastre o novo documento, com o mesmo equipamento e a mesma categoria e o vencimento novo. Ele substitui o antigo nos alertas." },
        { p: "O que acontece com os documentos quando a unidade muda de cliente?", r: "Eles acompanham automaticamente, pela tela Vínculos. O arquivo fica na mesma pasta e o link não muda." }
      ]
    }
  };
}
