/**
 * Ajuda "Como usar esta tela" — grupo Frota (frente C).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Texto puro, sem HTML.
 * Conferido contra a tela real (JS_Core.html, trecho da Frota, e SGO_Frota_ConteudoModulo.js) em 17/10/2026.
 */
function SGO_ajudaTelas_Frota_() {
  return {
    "frota": {
      titulo: "Frota",
      paraQueServe: "Registra quem pegou cada veículo da empresa e quando devolveu, com o KM, as fotos e a vistoria. A gestão também cuida aqui de cadastros, documentos, abastecimentos, multas, despesas e relatório.",
      antesDeComecar: [
        "O seu login precisa estar ligado a um condutor. Quem liga é a gestão, em Frota > Veículos e condutores.",
        "Tenha o celular com câmera e, se possível, com internet. Com sinal fraco o sistema tenta de novo sozinho.",
        "A data e a hora são sempre as do momento em que você confirma. Você não digita data nem hora.",
        "No celular a tela é a mesma para todos os perfis. No computador, a mesma tela fica na aba \"Situação e retiradas\", quadro \"Retirar e devolver\"."
      ],
      passos: [
        { titulo: "Retirar um veículo", itens: [
          "Toque em \"Frota\" no menu.",
          "Em \"Retirar um veículo\", toque no cartão do veículo. Só aparecem os disponíveis.",
          "Olhe o número no painel do carro.",
          "Se for igual ao KM que já aparece, não mexa.",
          "Se for diferente, corrija o número e toque em \"Tirar foto do painel (obrigatória: KM diferente)\".",
          "Toque em \"Tirar foto do veículo\". A câmera abre direto. Tire pelo menos uma foto.",
          "Olhe o veículo por fora e por dentro.",
          "Se estiver tudo certo, toque em \"Tudo OK\".",
          "Se achar algum problema, toque em \"Tem problema\", toque no item e escreva o que viu.",
          "Toque em \"Confirmar retirada\".",
          "Espere o aviso \"Retirada registrada\"."
        ] },
        { titulo: "Devolver o veículo", itens: [
          "Abra a Frota (ou o Início, no celular).",
          "Toque no botão verde \"Devolver\" com a placa do veículo.",
          "Digite o KM que está no painel agora.",
          "Toque em \"Tirar foto do painel (obrigatória)\".",
          "Faça a vistoria: \"Tudo OK\" ou \"Tem problema\".",
          "Se quiser, abra \"Mais fotos e observações (opcional)\".",
          "Toque em \"Confirmar devolução\".",
          "Espere o aviso \"Devolução registrada\"."
        ] },
        { titulo: "Continuar uma retirada que ficou pela metade", itens: [
          "Abra a Frota.",
          "Toque em \"Continuar a retirada\" (ou \"Continuar a devolução\") com a placa.",
          "As fotos já enviadas continuam lá. Termine os passos e confirme."
        ] },
        { titulo: "Desistir antes de confirmar", itens: [
          "Toque em \"Cancelar e voltar\", no fim da tela.",
          "Confirme a pergunta. Nada é registrado."
        ] }
      ],
      cores: [
        { nome: "Botão verde \"Devolver\" com a placa", significado: "Este veículo está com você. Toque para devolver." },
        { nome: "Linha \"Falta: ...\" acima do botão", significado: "Diz o que ainda falta para confirmar. Quando aparece \"Tudo pronto.\", pode confirmar." },
        { nome: "Selo \"Preparando…\" na foto", significado: "A foto está sendo reduzida no celular. Aguarde." },
        { nome: "Selo \"Enviando…\" na foto", significado: "A foto está subindo. Você pode continuar os outros passos." },
        { nome: "Selo verde \"Enviada\"", significado: "A foto chegou ao sistema." },
        { nome: "Selo \"Sem sinal: nova tentativa em instantes\"", significado: "A internet falhou. O sistema tenta de novo sozinho. Não faça nada." },
        { nome: "Selo vermelho \"Não enviada: toque para tentar de novo\"", significado: "As tentativas automáticas acabaram. Toque na foto para enviar de novo, ou remova no \"×\" e tire outra." },
        { nome: "Selo vermelho \"Não deu para ler: remova e tire de novo\"", significado: "A foto veio com defeito. Toque no \"×\" e tire outra." },
        { nome: "Botão \"Tudo OK\" verde", significado: "Todos os itens da vistoria serão gravados como OK." },
        { nome: "Botão \"Tem problema\" vermelho", significado: "Você vai marcar os itens com problema. Cada item marcado precisa de uma descrição." },
        { nome: "Selo \"OK\" ou \"Problema\" em cada item da vistoria", significado: "Situação daquele item. Toque para trocar." },
        { nome: "Aviso vermelho \"Vencido\" (avisos da frota)", significado: "Documento, manutenção ou CNH com prazo vencido. A gestão precisa resolver." },
        { nome: "Aviso amarelo \"A vencer\"", significado: "Vence em até 30 dias." },
        { nome: "Aviso vermelho \"Multa a conferir\"", significado: "Chegou multa e o sistema não achou com certeza quem estava com o veículo. A gestão confere." },
        { nome: "Aviso vermelho no topo sobre o rastreador", significado: "Só aparece quando a iTracker liberar o bloqueio da partida (hoje não há). A partida do veículo não foi liberada. A retirada já está registrada. Ligue para a gestão." }
      ],
      problemas: [
        { situacao: "Deu erro ao confirmar, ou o sinal está fraco", oQueFazer: "Não saia da tela. O sistema tenta de novo sozinho. Se a tela pedir, toque de novo em \"Confirmar retirada\" ou \"Confirmar devolução\": as fotos já enviadas não são enviadas outra vez." },
        { situacao: "Aparece \"Já estava registrado\" ou \"já estava registrada\"", oQueFazer: "Está tudo certo. O primeiro toque já tinha gravado. Nada foi registrado em dobro. Não faça mais nada." },
        { situacao: "Aparece \"Registro conferido\" (\"A conexão caiu na resposta, mas o registro foi gravado\")", oQueFazer: "Está tudo certo. Não registre de novo." },
        { situacao: "\"Seu login ainda não tem condutor vinculado\"", oQueFazer: "Peça à gestão (Administrador, Gestor ou Diretoria) para ligar o seu usuário a um condutor em Frota > Veículos e condutores. Depois abra a Frota de novo." },
        { situacao: "KM \"Menor que o KM registrado\"", oQueFazer: "Confira o número no painel. O odômetro não volta. Se o número registrado estiver errado, peça à gestão o ajuste de KM." },
        { situacao: "KM \"Diferente do KM registrado\"", oQueFazer: "Não é erro. Tire a foto do painel e continue. A gestão confere depois." },
        { situacao: "\"Esta retirada está com\" outra pessoa", oQueFazer: "Só quem retirou, ou a gestão, pode devolver. Peça a essa pessoa para registrar. Se não der, procure a gestão." },
        { situacao: "Tocou num veículo que está com outra pessoa", oQueFazer: "A tela mostra com quem ele está. Escolha outro veículo ou fale com essa pessoa." },
        { situacao: "\"Nenhum veículo disponível agora\"", oQueFazer: "Todos estão em uso. Veja em \"Em uso por outras pessoas\". A lista se atualiza sozinha quando alguém devolver." },
        { situacao: "\"O veículo ... não está mais disponível. A lista foi atualizada.\"", oQueFazer: "Outra pessoa retirou antes. Escolha outro veículo." },
        { situacao: "\"Partida não liberada pelo rastreador\" (só quando o bloqueio da partida estiver ligado)", oQueFazer: "A retirada já está registrada. Não registre de novo. Ligue para a gestão, que libera a partida." },
        { situacao: "\"Não foi possível carregar a frota agora\"", oQueFazer: "Confira a internet e toque em \"Tentar de novo\". Se continuar, avise o administrador." },
        { situacao: "Esqueceu de devolver", oQueFazer: "Retirada aberta há mais de 12 horas aparece no Início como possível devolução esquecida. Devolva assim que puder ou avise a gestão." }
      ],
      quemPode: [
        { perfil: "TODOS", pode: "Retirar em seu próprio nome e devolver a própria retirada. Ver a situação da frota, os avisos e o histórico." },
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Tudo da equipe. Também: retirar em nome de outro condutor e devolver no lugar dele (com justificativa), informar outra data e hora, cadastrar veículos e condutores, ajustar KM, conferir KM, ver a trilha de auditoria, registrar manutenção, parada, documentos, multas e abastecimentos, consultar despesas, gerar relatório e usar o rastreador." },
        { perfil: "ADMIN", pode: "Também o \"Levantamento de valores suspeitos\", na aba Despesas." },
        { perfil: "CLIENTE", pode: "Não usa a Frota." }
      ],
      perguntas: [
        { p: "Preciso tirar foto do painel na retirada?", r: "Só quando o KM do painel for diferente do registrado. Na devolução a foto do painel é sempre obrigatória." },
        { p: "Posso registrar a retirada de um colega?", r: "Não. Só a gestão registra em nome de outra pessoa, com justificativa. O colega é avisado." },
        { p: "Posso escolher a data e a hora?", r: "Não. Vale a hora em que você confirma. Só a gestão pode informar outra, com justificativa." },
        { p: "Tirei a foto sem internet. Perdi?", r: "Não. O sistema tenta de novo sozinho em alguns segundos. Se ficar \"Não enviada\", toque na foto." },
        { p: "Toquei duas vezes em confirmar. Ficou em dobro?", r: "Não. O botão vira \"Registrando…\" e fica desligado. Se o pedido se repetir, aparece \"já estava registrada\" e nada é gravado em dobro." },
        { p: "Para que serve a vistoria na devolução?", r: "Para comparar com a saída. Se um item saiu OK e voltou com problema, fica claro que aconteceu durante o uso." }
      ]
    },

    "frota/opcoes_da_gestao": {
      titulo: "Opções da gestão (retirar e devolver no lugar do condutor)",
      paraQueServe: "Quadro recolhido no fim da tela de retirada e de devolução. Só a gestão vê. Serve para corrigir esquecimentos da equipe.",
      passos: [
        { titulo: "Registrar a retirada em nome de outra pessoa", itens: [
          "Toque no veículo, como numa retirada normal.",
          "Abra \"Opções da gestão\".",
          "Em \"Condutor\", escolha a pessoa.",
          "Se a retirada foi em outro horário, preencha \"Data (vazio = agora)\" e \"Hora (vazio = agora)\".",
          "Escreva a \"Justificativa\" com pelo menos 15 letras. Exemplo: condutor esqueceu de registrar, confirmado por telefone.",
          "Faça o KM, as fotos e a vistoria.",
          "Toque em \"Confirmar retirada\"."
        ] },
        { titulo: "Devolver no lugar do condutor", itens: [
          "Em \"Em uso por outras pessoas\", toque no veículo.",
          "Leia o aviso \"Você está registrando a devolução no lugar de\".",
          "Preencha o KM de chegada, a foto do painel e a vistoria.",
          "Abra \"Opções da gestão\" e escreva a justificativa.",
          "Toque em \"Confirmar devolução\"."
        ] }
      ],
      problemas: [
        { situacao: "\"Justificativa obrigatória\"", oQueFazer: "Escreva o motivo no campo \"Justificativa\", com pelo menos 15 letras, e confirme de novo." },
        { situacao: "\"está no futuro\"", oQueFazer: "Corrija a data e a hora, ou deixe os campos vazios para usar a hora atual." },
        { situacao: "\"é anterior à última devolução deste veículo\"", oQueFazer: "Duas retiradas não podem se sobrepor. Confira a data e a hora." }
      ],
      perguntas: [
        { p: "O condutor fica sabendo?", r: "Sim. Ele recebe um aviso. O registro fica marcado como registrado pela gestão e entra na trilha de auditoria." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Usar as opções da gestão." }
      ]
    },

    "frota/abastecimentos": {
      titulo: "Abastecimentos",
      paraQueServe: "Guarda cada abastecimento com o comprovante. O sistema calcula o consumo (km por litro) sozinho.",
      antesDeComecar: [
        "Tenha em mãos a foto ou o PDF do comprovante. Sem ele não salva.",
        "No celular, o botão fica em \"Opções da gestão\", na tela inicial da Frota."
      ],
      passos: [
        { titulo: "Registrar um abastecimento (computador)", itens: [
          "Abra a aba \"Abastecimentos\".",
          "Toque em \"+ Registrar abastecimento\".",
          "Escolha o veículo.",
          "Escolha o condutor, se souber.",
          "Preencha a data, o \"KM no abastecimento\", o \"Tipo de combustível\", os litros, o \"Valor total (R$)\" e o posto.",
          "Em \"Comprovante (obrigatório)\", anexe a foto ou o PDF.",
          "Toque em \"Salvar abastecimento\"."
        ] },
        { titulo: "Registrar um abastecimento (celular)", itens: [
          "Abra a Frota.",
          "Em \"Opções da gestão\", toque em \"Registrar abastecimento\".",
          "Preencha os campos com asterisco.",
          "Anexe o comprovante.",
          "Toque em \"Registrar abastecimento\"."
        ] }
      ],
      problemas: [
        { situacao: "\"Anexe a foto ou o PDF do comprovante do abastecimento.\"", oQueFazer: "Anexe o comprovante e salve de novo." },
        { situacao: "O consumo não aparece", oQueFazer: "É preciso ter pelo menos 2 abastecimentos do mesmo veículo." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Registrar e excluir abastecimentos." },
        { perfil: "TODOS", pode: "Ver a lista e o comprovante (\"Ver comprovante\")." }
      ]
    },

    "frota/despesas": {
      titulo: "Despesas",
      paraQueServe: "Junta numa consulta tudo o que a frota gastou: abastecimentos, manutenções, multas e outras despesas, por veículo e por período.",
      passos: [
        { titulo: "Consultar as despesas", itens: [
          "Abra a aba \"Despesas\".",
          "Escolha o veículo, ou deixe \"Todos os veículos\".",
          "Confira \"Data início\" e \"Data fim\". Já vêm com os últimos 30 dias.",
          "Escolha a categoria, ou deixe \"Todas\".",
          "Toque em \"Consultar\".",
          "Leia os totais por categoria, o \"Total do período\" e a lista de lançamentos."
        ] },
        { titulo: "Procurar valores gravados errado (só Administrador)", itens: [
          "No quadro \"Levantamento de valores suspeitos\", toque em \"Fazer o levantamento\".",
          "Leia a coluna \"Valor provável\" e o motivo. Nada é alterado por esta consulta.",
          "Corrija o lançamento errado no lugar onde ele foi feito."
        ] }
      ],
      problemas: [
        { situacao: "\"Informe o período com as datas no formato dd/mm/aaaa\"", oQueFazer: "Corrija as datas. Exemplo: 01/10/2026." },
        { situacao: "\"A data final é anterior à inicial\"", oQueFazer: "Troque as datas de lugar." },
        { situacao: "\"Nenhuma despesa lançada para este filtro\"", oQueFazer: "Aumente o período ou escolha \"Todas\" as categorias." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Consultar as despesas." },
        { perfil: "ADMIN", pode: "Fazer o levantamento de valores suspeitos." }
      ]
    },

    "frota/multas": {
      titulo: "Multas",
      paraQueServe: "Registra a multa que chegou e descobre sozinho quem estava com o veículo na hora da infração.",
      passos: [
        { titulo: "Registrar uma multa", itens: [
          "Abra a aba \"Documentos e multas\".",
          "Toque em \"+ Registrar multa\".",
          "Escolha o veículo.",
          "Preencha a data e a hora da infração, o local, a descrição e o valor.",
          "Se tiver, preencha o órgão autuador, o número do AIT, os pontos e o vencimento.",
          "Se quiser, anexe o \"Documento da notificação (opcional)\".",
          "Toque em \"Salvar multa\".",
          "Leia a mensagem: ela diz se o condutor foi achado."
        ] },
        { titulo: "Indicar o condutor quando o sistema não achou", itens: [
          "Na linha da multa, escolha o condutor na lista.",
          "Toque em \"Indicar\"."
        ] },
        { titulo: "Atualizar a situação da multa", itens: [
          "Na linha da multa, escolha \"Aberta\", \"Paga\", \"Recorrida\" ou \"Cancelada\"."
        ] },
        { titulo: "Procurar o condutor de novo", itens: [
          "Se a retirada foi lançada depois da multa, toque em \"Recruzar\"."
        ] }
      ],
      cores: [
        { nome: "Condutor com \"(automático)\" em verde", significado: "O sistema achou a retirada daquele horário." },
        { nome: "Condutor com \"(manual)\" em azul", significado: "A gestão indicou o condutor." },
        { nome: "Condutor com \"(conferir)\" em amarelo", significado: "Mais de uma retirada cobre o horário. Confira e indique o certo." },
        { nome: "\"Não identificado\" em vermelho", significado: "Nenhuma retirada naquele horário. Indique o condutor." }
      ],
      problemas: [
        { situacao: "\"nenhuma retirada encontrada nesse horário\"", oQueFazer: "Confira a data e a hora da multa. Depois indique o condutor na tabela." },
        { situacao: "\"mais de uma retirada cobre esse horário\"", oQueFazer: "Confira o condutor sugerido e toque em \"Indicar\" com o certo." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Registrar, indicar condutor, mudar a situação, recruzar e excluir." },
        { perfil: "TODOS", pode: "Ver a lista de multas." }
      ]
    },

    "frota/documentos": {
      titulo: "Documentos do veículo",
      paraQueServe: "Guarda CRLV, seguro, licenciamento, IPVA, laudo e outros documentos de cada veículo, e avisa quando vão vencer.",
      passos: [
        { titulo: "Anexar um documento", itens: [
          "Abra a aba \"Documentos e multas\".",
          "Toque em \"+ Anexar documento\".",
          "Escolha o veículo e o \"Tipo de documento\".",
          "Se o documento tiver prazo, preencha \"Validade (opcional)\".",
          "Anexe o arquivo.",
          "Toque em \"Salvar documento\"."
        ] },
        { titulo: "Renovar um documento", itens: [
          "Anexe o documento novo do mesmo tipo, com a validade nova.",
          "O anterior passa a aparecer como \"substituído por um mais novo\" e deixa de gerar aviso."
        ] }
      ],
      cores: [
        { nome: "Selo vermelho \"VENCIDO\"", significado: "A validade já passou, ou vence hoje. Renove." },
        { nome: "Selo amarelo \"VENCENDO\"", significado: "Vence em até 30 dias." },
        { nome: "Selo verde \"OK\"", significado: "Em dia." },
        { nome: "Cinza \"sem validade\" ou \"substituído por um mais novo\"", significado: "Não gera aviso." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Anexar e excluir documentos." },
        { perfil: "TODOS", pode: "Ver e abrir os documentos." }
      ]
    },

    "frota/km_a_conferir": {
      titulo: "KM a conferir",
      paraQueServe: "Lista as retiradas e devoluções em que o KM digitado fugiu do esperado, para a gestão olhar a foto do painel e confirmar.",
      antesDeComecar: [
        "Entra na lista: KM de saída diferente do registrado; devolução com mais de 1.500 km ou média acima de 120 km/h; diferença com o hodômetro do rastreador (quando ligado)."
      ],
      passos: [
        { titulo: "Conferir um KM", itens: [
          "Abra a aba \"Situação e retiradas\".",
          "No quadro \"KM a conferir\", leia o motivo da linha.",
          "Toque em \"Foto do painel\" e confira o número na foto.",
          "Toque em \"Conferido\".",
          "Se quiser, escreva o que a foto mostrou e confirme.",
          "Se o KM do veículo estiver errado, corrija em \"Ajustar KM do veículo\"."
        ] }
      ],
      problemas: [
        { situacao: "A linha mostra \"Sem foto\"", oQueFazer: "Fale com o condutor para confirmar o número antes de marcar como conferido." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Ver e conferir." }
      ]
    },

    "frota/ajustar_km": {
      titulo: "Ajustar KM do veículo",
      paraQueServe: "Corrige o KM registrado do veículo quando houve erro de digitação ou uso sem registro. É o único lugar que muda o KM.",
      antesDeComecar: [
        "Veículo em uso só pode ser ajustado depois da devolução.",
        "O botão \"Editar\" do veículo não muda o KM."
      ],
      passos: [
        { titulo: "Ajustar no computador", itens: [
          "Abra a aba \"Veículos e condutores\".",
          "No quadro \"Ajustar KM do veículo\", escolha o veículo.",
          "Confira o \"KM registrado\".",
          "Digite o \"KM novo\".",
          "Escreva a justificativa, com pelo menos 15 letras.",
          "Toque em \"Ajustar KM\"."
        ] },
        { titulo: "Ajustar no celular", itens: [
          "Abra a Frota.",
          "Em \"Opções da gestão\", toque em \"Ajustar KM do veículo\".",
          "Escolha o veículo, digite o KM novo e a justificativa.",
          "Toque em \"Ajustar KM\"."
        ] }
      ],
      problemas: [
        { situacao: "\"está em uso\"", oQueFazer: "Espere a devolução. Ela grava o KM de chegada. Depois ajuste, se ainda precisar." },
        { situacao: "\"é igual ao KM registrado. Nada a ajustar.\"", oQueFazer: "O número já está certo." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Ajustar o KM. O antes, o depois, quem fez e o motivo ficam na trilha de auditoria." }
      ]
    },

    "frota/trilha_de_auditoria": {
      titulo: "Trilha de auditoria",
      paraQueServe: "Mostra os registros especiais: o que a gestão fez no lugar do condutor, KM divergente, KM conferido, ajuste de KM e ações do rastreador. Nada aqui pode ser apagado.",
      passos: [
        { titulo: "Consultar a trilha", itens: [
          "Abra a aba \"Veículos e condutores\".",
          "No quadro \"Trilha de auditoria\", escolha o veículo ou deixe \"Todos os veículos\".",
          "Toque em \"Consultar\".",
          "Leia as colunas: quando, ação, veículo, condutor, quem fez, antes, depois e justificativa."
        ] }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Consultar a trilha." }
      ]
    },

    "frota/rastreador": {
      titulo: "Rastreador e bloqueio da partida",
      paraQueServe: "Liga a Frota ao rastreador dos veículos (iTracker). Hoje o acesso é somente leitura: o SGO+ avisa o uso sem registro, confere o KM e guarda o ponto de chegada de cada devolução, mas não bloqueia nem libera a partida. O bloqueio depende de a iTracker liberar o acesso com comandos.",
      antesDeComecar: [
        "O acesso da iTracker é somente leitura: o SGO+ monitora o veículo, mas não bloqueia nem libera a partida. Para isso, a Metrolabs pede à iTracker um acesso com comandos.",
        "Quando o acesso com comandos chegar, o responsável pelo sistema preenche os endereços dos comandos em Chaves e senhas > Rastreador da frota e liga o bloqueio. Aí a retirada libera a partida e a devolução bloqueia.",
        "O veículo nunca é bloqueado em movimento: só parado, com a ignição desligada e com posição recente.",
        "Só a gestão vê a localização. A localização fica guardada pelo prazo de Chaves e senhas (padrão de 90 dias) e depois é apagada sozinha."
      ],
      passos: [
        { titulo: "Ver a situação do rastreador", itens: [
          "Abra a aba \"Rastreador\".",
          "Leia a caixa do topo: diz se o rastreador está ligado, se o acesso é somente leitura e por quantos dias a localização fica guardada."
        ] },
        { titulo: "Ligar um veículo ao aparelho do rastreador", itens: [
          "Em \"Vínculo veículo e dispositivo\", escolha o aparelho do veículo. O sugerido pela placa vem marcado.",
          "Toque em \"Gravar vínculo\". O SGO+ confere se o aparelho aparece na iTracker."
        ] },
        { titulo: "Ver onde o veículo chegou na devolução", itens: [
          "Na lista de veículos, leia \"Última chegada (devolução)\": hora e endereço.",
          "Toque em \"ver no mapa\" para abrir o local."
        ] },
        { titulo: "Conferir um alerta de uso sem registro", itens: [
          "Leia o alerta vermelho \"Uso sem registro\".",
          "Descubra quem estava com o veículo.",
          "Se foi esquecimento, registre a retirada no lugar do condutor, em \"Opções da gestão\".",
          "Toque em \"Conferido\" e escreva o que foi conferido, com pelo menos 10 letras."
        ] },
        { titulo: "Quando o acesso com comandos estiver ligado: liberar a partida numa emergência", itens: [
          "Em \"Liberar ou bloquear a partida\", escolha o veículo.",
          "Escreva a justificativa, com pelo menos 15 letras.",
          "Toque em \"Liberar partida\" e confirme.",
          "No celular: Frota > \"Opções da gestão\" > \"Partida do veículo (rastreador)\"."
        ] },
        { titulo: "Quando o acesso com comandos estiver ligado: bloquear a partida", itens: [
          "Escolha o veículo e escreva a justificativa.",
          "Toque em \"Bloquear agora\" e confirme.",
          "Se o veículo estiver andando, o bloqueio fica pendente até ele parar com a ignição desligada.",
          "Depois de testar no pátio, toque em \"Marcar: usa o bloqueio\" no veículo."
        ] }
      ],
      cores: [
        { nome: "Caixa vermelha \"Rastreador desligado\"", significado: "Nenhuma chamada é feita ao rastreador. Retirada e devolução funcionam normalmente." },
        { nome: "Caixa azul \"Rastreador ligado\"", significado: "O SGO+ lê o rastreador a cada 2 minutos." },
        { nome: "\"O acesso da iTracker é somente leitura\"", significado: "O SGO+ monitora, mas não bloqueia nem libera a partida. A parte de liberar e bloquear fica escondida." },
        { nome: "\"Bloqueio da partida desligado\"", significado: "Há acesso com comandos, mas o bloqueio está desligado: só monitoramento." },
        { nome: "Comando \"Pendente\"", significado: "Esperando o veículo parar e a ignição desligar." },
        { nome: "Comando \"Enviado\", \"Cancelado\" ou \"Não enviado\"", significado: "Enviado: chegou ao rastreador. Cancelado: uma nova retirada cancelou o bloqueio. Não enviado: falhou; tente de novo ou use o aplicativo do rastreador." },
        { nome: "Alerta vermelho \"Uso sem registro\"", significado: "O veículo andou ou ligou sem retirada aberta no SGO+." },
        { nome: "Alerta vermelho \"Sem comunicação com o rastreador\"", significado: "O SGO+ não conseguiu ler o rastreador. Aparece uma vez só e some sozinho quando a conexão voltar." }
      ],
      problemas: [
        { situacao: "\"recusou a chave de acesso (HTTP 401)\"", oQueFazer: "A chave da iTracker está errada ou foi cancelada. Avise o responsável pelo sistema (Chaves e senhas > Rastreador da frota)." },
        { situacao: "\"excesso de consultas (HTTP 429)\"", oQueFazer: "Não precisa fazer nada. O SGO+ espera e lê de novo na próxima rodada." },
        { situacao: "\"A iTracker só aceita ler as posições a cada 30 segundos\"", oQueFazer: "Espere os segundos indicados e toque de novo em \"Ler o rastreador agora\"." },
        { situacao: "\"plataforma da iTracker está indisponível (HTTP 503)\"", oQueFazer: "Aguarde. O SGO+ tenta de novo sozinho." },
        { situacao: "Condutor diz \"Partida não liberada pelo rastreador\"", oQueFazer: "Só acontece com o acesso com comandos ligado. A retirada já está registrada. Libere a partida aqui ou no aplicativo do rastreador." },
        { situacao: "\"não tem dispositivo do rastreador vinculado\"", oQueFazer: "Ligue o veículo ao aparelho em \"Vínculo veículo e dispositivo\"." },
        { situacao: "\"Falta a chave de acesso da iTracker\"", oQueFazer: "Avise o responsável pelo sistema (Chaves e senhas)." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Usar a aba Rastreador, ver a localização e a Partida do veículo no celular." },
        { perfil: "TODOS", pode: "A equipe não vê a localização. Só retira e devolve normalmente. Em emergência, ligue para a gestão." }
      ]
    },

    "frota/veiculos_e_condutores": {
      titulo: "Veículos e condutores",
      paraQueServe: "Cadastro dos veículos e das pessoas que dirigem. É feito uma vez e usado sempre.",
      passos: [
        { titulo: "Cadastrar um veículo", itens: [
          "Abra a aba \"Veículos e condutores\".",
          "Toque em \"+ Cadastrar novo veículo\".",
          "Preencha placa, modelo, marca, ano, cor e \"KM atual\".",
          "Toque em \"Salvar veículo\"."
        ] },
        { titulo: "Cadastrar um condutor", itens: [
          "Toque em \"+ Cadastrar novo condutor\".",
          "Em \"Vincular a um usuário do SGO (opcional)\", escolha o login da pessoa. Sem isso ela não consegue retirar pelo próprio login.",
          "Preencha nome e telefone.",
          "Se tiver, preencha a CNH, a validade e anexe o arquivo.",
          "Toque em \"Salvar condutor\"."
        ] },
        { titulo: "Tirar um veículo ou condutor de uso", itens: [
          "Na linha, toque em \"Inativar\" e confirme.",
          "Ele some das listas, mas o histórico fica guardado. Para voltar, toque em \"Reativar\"."
        ] }
      ],
      problemas: [
        { situacao: "\"Já existe um veículo cadastrado com essa placa.\"", oQueFazer: "O veículo já está no cadastro. Procure na lista." },
        { situacao: "\"Este usuário já está vinculado ao condutor\"", oQueFazer: "Cada login só pode ter um condutor. Escolha outro usuário." },
        { situacao: "\"Este veículo está em uso\" ao inativar", oQueFazer: "Registre a devolução primeiro e depois inative." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Cadastrar, editar, inativar, reativar e anexar CNH." },
        { perfil: "TODOS", pode: "Ver as listas." }
      ]
    },

    "frota/manutencao_e_paradas": {
      titulo: "Manutenção e paradas",
      paraQueServe: "Registra as manutenções feitas e os períodos em que o veículo ficou parado. O sistema avisa quando a próxima manutenção está perto.",
      passos: [
        { titulo: "Registrar uma manutenção", itens: [
          "Abra a aba \"Manutenção e paradas\".",
          "Escolha o veículo e o tipo. A próxima troca em KM já vem sugerida.",
          "Preencha data, KM, custo, oficina e descrição.",
          "Ajuste a próxima troca, se precisar.",
          "Toque em \"Registrar manutenção\"."
        ] },
        { titulo: "Registrar uma parada", itens: [
          "Escolha o veículo.",
          "Preencha \"Data início\", o motivo e a descrição. \"Data fim (opcional)\" pode ficar vazia.",
          "Toque em \"Registrar parada\"."
        ] }
      ],
      cores: [
        { nome: "Aviso \"Vencido\" ou \"A vencer\"", significado: "A manutenção venceu ou vence em até 500 km ou 30 dias." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Registrar manutenções e paradas." }
      ]
    },

    "frota/historico_e_relatorio": {
      titulo: "Histórico e relatório",
      paraQueServe: "Mostra tudo o que aconteceu com um veículo e gera o relatório A4 da frota com análise.",
      passos: [
        { titulo: "Ver o histórico de um veículo", itens: [
          "Abra a aba \"Histórico e relatório\".",
          "Em \"Histórico do veículo\", escolha o veículo.",
          "O histórico aparece na hora, do mais recente para o mais antigo."
        ] },
        { titulo: "Gerar o relatório da frota", itens: [
          "Em \"Relatório da frota\", escolha um veículo ou deixe \"Toda a frota (relatório geral)\".",
          "Confira \"Data início\" e \"Data fim\".",
          "Toque em \"Gerar relatório\".",
          "Aguarde até um minuto. O relatório abre numa aba nova.",
          "Para imprimir ou salvar em PDF, toque em \"Imprimir ou salvar em PDF\" no topo do relatório. Uma cópia (PDF e HTML) fica guardada na pasta da Frota, na subpasta do veículo ou em \"Frota completa\".",
          "Relatório com mais de três páginas traz o sumário com o número das páginas. No relatório geral, o quadro de custos por veículo sai na última folha, deitada."
        ] }
      ],
      problemas: [
        { situacao: "O navegador bloqueou a aba nova", oQueFazer: "Toque no link \"Abrir o relatório\"." },
        { situacao: "O consumo (km/L) não aparece", oQueFazer: "Precisa de pelo menos 2 abastecimentos do veículo no período." }
      ],
      quemPode: [
        { perfil: "TODOS", pode: "Ver o histórico." },
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Gerar o relatório." }
      ]
    }
  };
}
