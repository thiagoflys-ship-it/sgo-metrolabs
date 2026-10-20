/**
 * Ajuda "Como usar esta tela" — grupo Frota (frente C).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Texto puro, sem HTML.
 * Conferido contra a tela real (JS_Core.html, trecho da Frota, e SGO_Frota_ConteudoModulo.js) em 17/10/2026.
 * 19/10/2026 (revisão da Frota): abas reorganizadas, Gestão e melhoria, editar condutor, rastreador que se explica sozinho e KM rodado.
 * 20/10/2026: aba Rastreamento (mapa ao vivo, rotas, combustível e KM, relatórios, privacidade), Gantt e copiloto em Gestão e melhoria, comprovantes pedidos.
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
        { nome: "Aviso vermelho no topo sobre o rastreador", significado: "Só aparece quando a empresa do rastreador liberar o bloqueio da partida (hoje não há). A partida do veículo não foi liberada. A retirada já está registrada. Ligue para a gestão." }
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
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Tudo da equipe. Também: retirar em nome de outro condutor e devolver no lugar dele (com justificativa), informar outra data e hora, cadastrar veículos e condutores, ajustar KM, conferir KM, ver a trilha de auditoria, registrar manutenção, parada, documentos, multas e abastecimentos, consultar despesas, gerar relatório, usar o rastreador e tratar os casos e ver os indicadores em \"Gestão e melhoria\"." },
        { perfil: "ADMIN", pode: "Também o \"Levantamento de valores suspeitos\", na aba Abastecimentos e despesas." },
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
          "Abra a aba \"Abastecimentos e despesas\".",
          "Toque em \"+ Registrar abastecimento\".",
          "Escolha o veículo.",
          "Escolha o condutor, se souber.",
          "Preencha a data, a hora (opcional: com ela o SGO+ confere se o veículo estava parado no horário), o \"KM no abastecimento\", o \"Tipo de combustível\", os litros, o \"Valor total (R$)\" e o posto.",
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
        { perfil: "TODOS", pode: "Ver a lista e o comprovante (\"Ver comprovante\"). Quem recebeu um pedido de comprovante da gestão envia no quadro \"Comprovante pedido a você\", no topo desta aba." }
      ]
    },

    "frota/despesas": {
      titulo: "Despesas",
      paraQueServe: "Junta numa consulta tudo o que a frota gastou: abastecimentos, manutenções, multas e outras despesas, por veículo e por período.",
      passos: [
        { titulo: "Consultar as despesas", itens: [
          "Abra a aba \"Abastecimentos e despesas\" e vá ao quadro \"Despesas por veículo e período\".",
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
        "Entra na lista: KM de saída diferente do registrado; devolução com mais de 1.500 km ou média acima de 120 km/h; e, com o rastreador ligado, devolução em que o KM rodado informado (chegada menos saída) difere do KM rodado medido pelo rastreador em mais de 20 km ou 5%.",
        "O hodômetro do aparelho do rastreador conta desde a instalação e nunca é igual ao painel. Por isso o SGO+ compara o KM rodado, não o número do painel: um aparelho com 26.238 km num carro com 189.561 km não gera aviso."
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
        { situacao: "A linha mostra \"Sem foto\"", oQueFazer: "Fale com o condutor para confirmar o número antes de marcar como conferido." },
        { situacao: "Linha \"(KM rodado pelo rastreador)\"", oQueFazer: "Compare o KM rodado informado com o medido pelo rastreador e veja a foto do painel da devolução. Se o condutor digitou errado, corrija em \"Ajustar KM do veículo\" com a justificativa; depois toque em \"Conferido\"." }
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
          "Abra a aba \"Histórico e relatório\".",
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
      "titulo": "Rastreador e bloqueio da partida",
      "paraQueServe": "Mostrar à gestão onde cada veículo está e se está andando. O SGO+ lê o rastreador a cada 2 minutos e: 1) avisa se um veículo andar sem retirada registrada; 2) confere o KM rodado de cada retirada com o que o rastreador mediu; 3) guarda o local onde o veículo parou na devolução.",
      "antesDeComecar": [
        "Acesso somente leitura: funcionam a localização, o aviso de uso sem registro, a conferência do KM e o ponto de chegada; não funciona bloquear nem liberar a partida pelo SGO+ (depende de a empresa do rastreador liberar o acesso com comandos).",
        "O hodômetro do aparelho conta desde a instalação e não é o número do painel (exemplo: aparelho com 26.238 km num carro com 189.561 km). O SGO+ compara o KM rodado, não esses números.",
        "Abaixo de 5 km/h o veículo está parado. Com a ignição desligada, o GPS às vezes marca 5 ou 11 km/h com o carro parado: a tela mostra \"parado, ignição desligada\" e o SGO+ não trata como uso.",
        "O veículo nunca é bloqueado em movimento: só parado, com a ignição desligada, abaixo de 5 km/h e com posição recente.",
        "Só a gestão vê a localização. As rotas e a localização ficam guardadas pelo prazo de Rastreamento > Privacidade e configuração (padrão de 90 dias) e depois são apagadas sozinhas. Esta tela agora é a parte \"Aparelhos e alertas\" da aba Rastreamento."
      ],
      "passos": [
        {
          "titulo": "Entender a tela, de cima para baixo",
          "itens": [
            "Abra a aba \"Rastreador\".",
            "\"Para que serve\": as três coisas que o SGO+ faz com o rastreador.",
            "Caixa azul: se está ligado, a hora da última leitura e o que funciona com o acesso de hoje.",
            "\"O que fazer agora\": a lista do que precisa de você, veículo por veículo. Quando está tudo em dia, aparece \"Nada a fazer\".",
            "\"Alertas para conferir\": só aparece quando há uso sem registro ou falha de comunicação.",
            "\"Veículos e aparelhos\": um cartão por veículo, com o aparelho, a situação agora, o hodômetro e a última devolução."
          ]
        },
        {
          "titulo": "Ligar um veículo ao aparelho do rastreador",
          "itens": [
            "No cartão do veículo, escolha o aparelho na lista. Se o nome do aparelho tem a placa, ele já vem marcado e o cartão fica verde com \"Sugestão\".",
            "Toque em \"Gravar vínculo\".",
            "Se aparecer \"Vínculo já estava gravado\", está tudo certo: o veículo já estava ligado a esse aparelho.",
            "Veículo sem rastreador: deixe \"Sem aparelho\"."
          ]
        },
        {
          "titulo": "Ver onde o veículo está e onde chegou na devolução",
          "itens": [
            "No cartão do veículo, leia \"Agora\": parado ou andando, a hora e o local. Toque em \"ver no mapa\".",
            "Leia \"Última devolução\": hora e endereço onde o veículo parou."
          ]
        },
        {
          "titulo": "Conferir um alerta de uso sem registro",
          "itens": [
            "Leia o alerta vermelho \"Uso sem registro\".",
            "Descubra quem estava com o veículo.",
            "Se foi esquecimento, registre a retirada no lugar do condutor, em \"Opções da gestão\".",
            "Toque em \"Conferido\" e escreva o que foi conferido, com pelo menos 10 letras."
          ]
        },
        {
          "titulo": "Quando o acesso com comandos estiver ligado: liberar ou bloquear a partida",
          "itens": [
            "Em \"Liberar ou bloquear a partida\", escolha o veículo e escreva a justificativa (pelo menos 15 letras).",
            "Toque em \"Liberar partida\" ou em \"Bloquear agora\" e confirme.",
            "Se o veículo estiver andando ou o GPS ainda oscilando, o bloqueio fica pendente até ele parar.",
            "No celular: Frota > \"Opções da gestão\" > \"Partida do veículo (rastreador)\"."
          ]
        }
      ],
      "cores": [
        {
          "nome": "Caixa vermelha \"Rastreador desligado\"",
          "significado": "Nada é lido. Retirada e devolução funcionam normalmente."
        },
        {
          "nome": "Caixa azul \"Rastreador ligado\"",
          "significado": "O SGO+ lê o rastreador a cada 2 minutos."
        },
        {
          "nome": "Caixa amarela \"O que fazer agora\"",
          "significado": "O próximo passo de cada veículo ou alerta."
        },
        {
          "nome": "Cartão verde com \"Sugestão\"",
          "significado": "O SGO+ achou o aparelho pela placa. Confira e toque em \"Gravar vínculo\"."
        },
        {
          "nome": "\"parado, ignição desligada (o GPS marcou ... km/h)\"",
          "significado": "O veículo está parado. A velocidade é oscilação normal do sinal."
        },
        {
          "nome": "Alerta vermelho \"Uso sem registro\"",
          "significado": "O veículo andou ou ligou sem retirada aberta no SGO+."
        },
        {
          "nome": "Alerta vermelho \"Sem comunicação com o rastreador\"",
          "significado": "O SGO+ não conseguiu ler o rastreador. Aparece uma vez só e some sozinho quando a conexão voltar."
        },
        {
          "nome": "Comando \"Pendente\", \"Enviado\", \"Cancelado\" ou \"Não enviado\"",
          "significado": "Só com acesso com comandos. Pendente: esperando o veículo parar. Cancelado: uma nova retirada cancelou o bloqueio. Não enviado: tente de novo ou use o aplicativo do rastreador."
        }
      ],
      "problemas": [
        {
          "situacao": "\"recusou a chave de acesso (HTTP 401)\"",
          "oQueFazer": "A chave está errada ou foi cancelada. Avise o responsável pelo sistema (Chaves e senhas > Rastreador da frota)."
        },
        {
          "situacao": "\"excesso de consultas (HTTP 429)\"",
          "oQueFazer": "Não precisa fazer nada. O SGO+ espera e lê de novo na próxima rodada."
        },
        {
          "situacao": "\"O rastreador só aceita ler as posições a cada 30 segundos\"",
          "oQueFazer": "Espere os segundos indicados e toque de novo em \"Ler o rastreador agora\"."
        },
        {
          "situacao": "\"plataforma do rastreador está indisponível (HTTP 503)\"",
          "oQueFazer": "Aguarde. O SGO+ tenta de novo sozinho."
        },
        {
          "situacao": "Condutor diz \"Partida não liberada pelo rastreador\"",
          "oQueFazer": "Só acontece com o acesso com comandos ligado. A retirada já está registrada. Libere a partida aqui ou no aplicativo do rastreador."
        },
        {
          "situacao": "\"não tem aparelho do rastreador ligado\"",
          "oQueFazer": "Ligue o veículo ao aparelho em \"Veículos e aparelhos\" e toque em \"Gravar vínculo\"."
        },
        {
          "situacao": "O hodômetro do aparelho é muito diferente do KM do painel",
          "oQueFazer": "É normal: o aparelho conta desde a instalação. Não precisa fazer nada; o SGO+ compara o KM rodado."
        },
        {
          "situacao": "\"Falta a chave de acesso do rastreador\"",
          "oQueFazer": "Avise o responsável pelo sistema (Chaves e senhas)."
        }
      ],
      "quemPode": [
        {
          "perfil": "ADMIN,GESTOR,DIRETORIA",
          "pode": "Usar a aba Rastreador, ver a localização e a Partida do veículo no celular."
        },
        {
          "perfil": "TODOS",
          "pode": "A equipe não vê a localização. Só retira e devolve normalmente. Em emergência, ligue para a gestão."
        }
      ]
    },

    "frota/rastreamento": {
      "titulo": "Rastreamento (mapa, rotas, combustível e relatórios)",
      "paraQueServe": "Mostrar à gestão onde cada veículo está, guardar as rotas, conferir o consumo de combustível e o KM, cobrar comprovantes de abastecimento e gerar os relatórios para imprimir. Só a gestão.",
      "antesDeComecar": [
        "O rastreador precisa estar configurado pelo responsável pelo sistema (Configurações > Chaves e senhas > Rastreador da frota). Sem isso, a tela diz \"Rastreador não configurado\" e o caminho para configurar.",
        "Cada veículo precisa estar ligado ao aparelho dele, na parte \"Aparelhos e alertas\".",
        "O acesso ao rastreador é só de leitura: nada aqui bloqueia ou manda comando ao veículo.",
        "Toda abertura do mapa, consulta de rota e relatório com localização fica registrada em \"Privacidade e configuração > Quem consultou\"."
      ],
      "passos": [
        {
          "titulo": "Ver os veículos no mapa",
          "itens": [
            "Abra a aba \"Rastreamento\". O \"Mapa ao vivo\" abre primeiro.",
            "Leia a cor de cada veículo na legenda abaixo do mapa.",
            "Toque num veículo da lista para centralizar o mapa nele e ver condutor, velocidade e local.",
            "A tela se atualiza sozinha a cada 30 segundos enquanto estiver aberta. \"Atualizar agora\" lê na hora (se já passaram 30 segundos)."
          ]
        },
        {
          "titulo": "Ver a rota de uma retirada",
          "itens": [
            "Toque em \"Rotas\".",
            "Confira o período e toque em \"Buscar retiradas\".",
            "Na linha da retirada, toque em \"Ver rota\". O trajeto aparece no mapa, com as paradas numeradas e os trechos acima do limite em vermelho.",
            "Para imprimir, toque em \"Relatório A4\"."
          ]
        },
        {
          "titulo": "Ver tudo o que um veículo rodou",
          "itens": [
            "Em \"Rotas\", escolha o veículo e o período (até 31 dias).",
            "Toque em \"Ver rota do período\"."
          ]
        },
        {
          "titulo": "Conferir o consumo e os abastecimentos",
          "itens": [
            "Toque em \"Combustível e KM\".",
            "Escolha o período e toque em \"Calcular\".",
            "Desvio em vermelho: o veículo gastou mais combustível que a média dele. Revise o veículo.",
            "Informe a capacidade do tanque (litros) de cada veículo e toque em \"Gravar\".",
            "Marque \"Conferir com a posição do veículo\" para saber se o veículo estava parado na hora do abastecimento (precisa da hora no lançamento)."
          ]
        },
        {
          "titulo": "Pedir o comprovante de um abastecimento",
          "itens": [
            "Em \"Combustível e KM\", vá até \"Pedir comprovante de abastecimento\".",
            "Escolha o veículo e o condutor, escreva o que pedir e o prazo.",
            "Toque em \"Pedir comprovante\". O condutor recebe uma atividade em Minhas atividades.",
            "Quando ele enviar, o pedido aparece como \"Enviado\" e a atividade fecha sozinha. Se o comprovante chegou por outro meio, toque em \"Cancelar\" e escreva o motivo."
          ]
        },
        {
          "titulo": "Gerar um relatório para imprimir",
          "itens": [
            "Toque em \"Relatórios\".",
            "Escolha: rota da retirada, mensal do veículo, consumo da frota ou uso fora do expediente.",
            "Preencha e toque em \"Gerar\". O relatório abre numa aba nova; a cópia em PDF e HTML fica na pasta \"Frota - Relatorios Gerados/Rastreamento\"."
          ]
        },
        {
          "titulo": "Mudar o prazo de guarda e os limites",
          "itens": [
            "Toque em \"Privacidade e configuração\".",
            "Ajuste os dias de guarda das rotas (padrão 90), o limite de velocidade (padrão 110 km/h), o expediente da frota e o desvio de consumo aceito (padrão 15%).",
            "Toque em \"Gravar configuração\". A mudança fica na trilha de auditoria da Frota."
          ]
        }
      ],
      "cores": [
        {
          "nome": "Azul",
          "significado": "Em uso, com retirada registrada."
        },
        {
          "nome": "Vermelho",
          "significado": "Andando sem retirada registrada (uso sem registro). No mapa da rota, vermelho é trecho acima do limite de velocidade."
        },
        {
          "nome": "Amarelo",
          "significado": "Parado com a ignição ligada e sem retirada."
        },
        {
          "nome": "Verde",
          "significado": "Parado. Na rota, verde é a saída."
        },
        {
          "nome": "Cinza",
          "significado": "Sem sinal há mais de 30 minutos."
        },
        {
          "nome": "Laranja numerado (rota)",
          "significado": "Parada de 5 minutos ou mais; o número é o da tabela de paradas."
        }
      ],
      "problemas": [
        {
          "situacao": "\"Rastreador não configurado\" ou \"Rastreador desligado no SGO+\"",
          "oQueFazer": "Avise o responsável pelo sistema: ele grava a chave e liga o rastreador em Configurações > Chaves e senhas > Rastreador da frota. Depois toque em \"Atualizar agora\"."
        },
        {
          "situacao": "\"Nenhum ponto de rota guardado neste período\"",
          "oQueFazer": "Confira se o veículo tem aparelho ligado (Aparelhos e alertas). Rotas de antes de o rastreador ser ligado não existem, e pontos mais velhos que o prazo de guarda já foram apagados."
        },
        {
          "situacao": "\"O mapa de fundo não carregou\"",
          "oQueFazer": "A internet ou a rede bloqueou o mapa. A lista dos veículos continua funcionando; use \"abrir no mapa\" de cada um."
        },
        {
          "situacao": "\"O condutor ... não tem login do SGO+ ligado\"",
          "oQueFazer": "Ligue o login do condutor em Frota > Veículos e condutores > Editar condutor (campo Login) e peça de novo."
        },
        {
          "situacao": "Média do veículo aparece como \"poucos dados\"",
          "oQueFazer": "A média precisa de pelo menos 3 intervalos entre abastecimentos com o KM informado. Continue lançando os abastecimentos com o KM."
        }
      ],
      "quemPode": [
        {
          "perfil": "ADMIN,GESTOR,DIRETORIA",
          "pode": "Ver o mapa, as rotas, o consumo, pedir comprovantes, gerar relatórios e mudar a configuração."
        },
        {
          "perfil": "TODOS",
          "pode": "A equipe não vê esta aba nem a localização de nenhum veículo. Quem recebe um pedido de comprovante responde na aba Abastecimentos e despesas."
        }
      ],
      "perguntas": [
        {
          "p": "O rastreador mostra o trânsito?",
          "r": "Não. A empresa do rastreador não informa trânsito. O SGO+ mostra velocidade, paradas, horários e uso fora do expediente. Trânsito em tempo real exigiria um serviço pago de mapas."
        },
        {
          "p": "Quanto tempo a rota fica guardada?",
          "r": "Pelo prazo da configuração (padrão de 90 dias). Depois os pontos são apagados sozinhos, uma vez por dia."
        },
        {
          "p": "O rastreamento controla a pessoa?",
          "r": "Não. O dado é do veículo. O ponto do COMMAND não usa a localização do veículo, e uso sem registro não vira ocorrência para ninguém."
        },
        {
          "p": "Como é calculado o consumo?",
          "r": "Pelo método do tanque cheio: os km entre dois abastecimentos divididos pelos litros do segundo. A média do veículo é a mediana de todo o histórico dele."
        }
      ]
    },

    "frota/comprovantes_pedidos": {
      "titulo": "Comprovantes pedidos a você",
      "paraQueServe": "Enviar à gestão o comprovante (nota) de um abastecimento que ela pediu.",
      "antesDeComecar": [
        "Tenha a nota do abastecimento (foto ou PDF), os litros e o KM do painel na hora.",
        "O pedido também aparece em Minhas atividades, com o prazo."
      ],
      "passos": [
        {
          "titulo": "Enviar o comprovante",
          "itens": [
            "Abra a Frota, aba \"Abastecimentos e despesas\".",
            "No quadro amarelo \"Comprovante pedido a você\", preencha data, KM, litros e valor (hora e posto, se souber).",
            "Em \"Foto da nota ou PDF\", tire a foto ou escolha o arquivo.",
            "Toque em \"Enviar comprovante\". O pedido some e a atividade é concluída sozinha."
          ]
        }
      ],
      "problemas": [
        {
          "situacao": "\"Anexe a foto da nota ou o PDF do comprovante.\"",
          "oQueFazer": "Escolha o arquivo e toque em \"Enviar comprovante\" de novo."
        },
        {
          "situacao": "Não tenho mais a nota",
          "oQueFazer": "Fale com a gestão. Ela pode cancelar o pedido com o motivo."
        }
      ],
      "quemPode": [
        {
          "perfil": "TODOS",
          "pode": "Responder os pedidos feitos a você."
        },
        {
          "perfil": "ADMIN,GESTOR,DIRETORIA",
          "pode": "Pedir, acompanhar e cancelar pedidos (aba Rastreamento > Combustível e KM)."
        }
      ]
    },

    "frota/gestao_e_melhoria": {
      "titulo": "Gestão e melhoria",
      "paraQueServe": "Tratar o que dá problema na frota (avarias, multas, manutenções, consumo, condução e uso) até resolver de vez, acompanhar os números do período, ver a frota no tempo (Gantt) e receber sugestões do copiloto. Só a gestão.",
      "antesDeComecar": [
        "O quadro tem quatro colunas: Aberta, Em análise, Em execução e Concluída.",
        "Em \"Aberta\" aparece sozinho, sem ninguém digitar: avaria na devolução (item em ordem na retirada e com problema na volta), multa em aberto e manutenção vencida ou a vencer.",
        "Nada vira caso sozinho: a gestão abre o caso ou descarta com o motivo.",
        "As ações do plano viram atividades em Minhas atividades, com responsável e prazo."
      ],
      "passos": [
        {
          "titulo": "Abrir um caso",
          "itens": [
            "Abra a aba \"Gestão e melhoria\", parte \"Quadro dos casos (Kanban)\".",
            "Na coluna \"Aberta\", leia o cartão.",
            "Toque em \"Abrir caso\". Ele vai para \"Em análise\".",
            "Se não precisa de tratamento (desgaste normal, por exemplo), toque em \"Descartar\" e escreva o motivo."
          ]
        },
        {
          "titulo": "Achar a causa (5 Porquês)",
          "itens": [
            "No cartão, toque em \"5 Porquês\".",
            "Responda \"Por que isso aconteceu?\".",
            "Pergunte \"por quê?\" de novo sobre a resposta, no mínimo 3 vezes, até chegar a uma causa que a empresa consegue mudar.",
            "Escreva a causa raiz e toque em \"Salvar análise\"."
          ]
        },
        {
          "titulo": "Resolver sem plano (caso simples)",
          "itens": [
            "Toque em \"Concluir\".",
            "Escreva como foi resolvido (exemplo: multa paga pelo condutor; orientado sobre a velocidade) e toque em \"Concluir\"."
          ]
        },
        {
          "titulo": "Criar o plano de ação (5W2H)",
          "itens": [
            "Toque em \"Plano de ação (5W2H)\".",
            "Preencha o quê, quando (prazo), quem (responsável), por quê, onde, quanto e como.",
            "Toque em \"Criar plano\". A ação vira atividade em Minhas atividades e o caso vai para \"Em execução\".",
            "Para outra ação, toque em \"Mais uma ação\"."
          ]
        },
        {
          "titulo": "Verificar e concluir (PDCA)",
          "itens": [
            "Quando as ações forem concluídas em Minhas atividades, toque em \"Concluir (verificar)\".",
            "Escreva o que foi conferido e o resultado.",
            "Marque se resolveu. Se não resolveu, o caso volta para \"Em análise\" (ciclo 2).",
            "Se quiser, escreva o que muda para não repetir (regra, item do checklist, treinamento)."
          ]
        },
        {
          "titulo": "Ver os indicadores",
          "itens": [
            "Toque em \"Indicadores do período\" e escolha 30, 90, 180 ou 365 dias.",
            "Leia os números do topo: KM rodado, custo por km, consumo, disponibilidade, preventiva no prazo, avarias, multas e casos.",
            "Veja \"Por veículo\" e \"Por condutor\" para saber onde estão os problemas."
          ]
        },
        {
          "titulo": "Ver a frota no tempo (Gantt)",
          "itens": [
            "Toque em \"Gantt da frota\".",
            "Escolha o período e toque em \"Atualizar\".",
            "Cada linha é um veículo: barras azuis são retiradas (tracejada em andamento), cinzas são paradas, losangos são manutenção prevista e documento que vence.",
            "Toque numa barra ou losango para ver o detalhe embaixo do quadro."
          ]
        },
        {
          "titulo": "Usar o copiloto de sugestões",
          "itens": [
            "Toque em \"Copiloto de sugestões\" e escolha o período.",
            "Se quiser, marque \"Pedir ajuda da IA\" e toque em \"Atualizar\".",
            "Leia cada cartão: o problema, os números e a recomendação.",
            "Escolha o que fazer: \"Abrir caso no Kanban\", \"Lançar atividade\" (com responsável e prazo) ou \"Pedir comprovante\".",
            "Se não precisa de ação, toque em \"Descartar\" e escreva o motivo. A sugestão decidida não volta no mesmo mês."
          ]
        }
      ],
      "cores": [
        {
          "nome": "Selo azul (Avaria, Multa, Manutenção, Outro)",
          "significado": "O tipo do caso."
        },
        {
          "nome": "Selo amarelo \"Recorrente\"",
          "significado": "Duas avarias no mesmo veículo ou com o mesmo condutor em 180 dias, ou duas multas do mesmo condutor em 12 meses. Só conclui com os 5 Porquês feitos."
        },
        {
          "nome": "Selo amarelo \"Prazo do plano vencido\"",
          "significado": "O prazo (Quando) do plano passou e o caso ainda está em execução."
        },
        {
          "nome": "Selo verde \"Multa já paga\", \"Manutenção já registrada\"",
          "significado": "A origem foi resolvida: confira e conclua o caso."
        },
        {
          "nome": "Faixa P, D, C, A",
          "significado": "Passo do ciclo: Planejar, Executar, Verificar, Agir. O escuro é o passo atual; o verde, os feitos."
        }
      ],
      "problemas": [
        {
          "situacao": "\"Caso recorrente: faça primeiro a análise de causa\"",
          "oQueFazer": "Toque em \"5 Porquês\" no cartão, responda e salve. Depois conclua."
        },
        {
          "situacao": "\"Ainda há ações em aberto\"",
          "oQueFazer": "A pessoa responsável conclui a atividade em Minhas atividades (ou cancela lá a que não vale mais). Depois toque em \"Concluir (verificar)\" de novo."
        },
        {
          "situacao": "\"Este item já tinha o caso FC-...\"",
          "oQueFazer": "Está tudo certo: o caso já existia e nada foi criado em dobro. Atualize o quadro."
        },
        {
          "situacao": "\"Este item não precisa mais de tratamento\"",
          "oQueFazer": "A multa foi paga ou a manutenção já foi registrada. Toque em \"Atualizar\"."
        },
        {
          "situacao": "\"O prazo (Quando) não pode estar no passado\"",
          "oQueFazer": "Escolha hoje ou uma data à frente."
        }
      ],
      "perguntas": [
        {
          "p": "A multa ou a avaria vira ocorrência no Programa de conduta?",
          "r": "Não sozinha. Com o condutor identificado, ela vira uma sugestão no Programa de conduta, e lá a gestão decide."
        },
        {
          "p": "Como é calculado o custo por km?",
          "r": "Abastecimentos, manutenções e despesas avulsas do período divididos pelo KM rodado nas retiradas. A multa fica fora: é do condutor."
        },
        {
          "p": "O que é \"preventiva no prazo\"?",
          "r": "A manutenção feita até a data ou o KM da \"próxima troca\" da manutenção anterior do mesmo tipo."
        },
        {
          "p": "Dá para apagar um caso?",
          "r": "Não. O caso descartado fica guardado com quem decidiu, quando e o motivo."
        },
        {
          "p": "O copiloto faz alguma coisa sozinho?",
          "r": "Não. Ele só sugere. Nada vira caso, atividade ou pedido sem alguém da gestão escolher. Sem a chave da IA, as sugestões continuam saindo pelas regras do sistema."
        },
        {
          "p": "A IA pode inventar números?",
          "r": "Ela recebe só os números calculados pelo sistema. Se a recomendação dela citar um número que não está nos dados, o sistema descarta o texto e mostra o das regras."
        }
      ],
      "quemPode": [
        {
          "perfil": "ADMIN,GESTOR,DIRETORIA",
          "pode": "Abrir, analisar, planejar, concluir e descartar casos; ver os indicadores."
        },
        {
          "perfil": "TODOS",
          "pode": "A equipe não vê esta aba. Quem é responsável por uma ação recebe a atividade em Minhas atividades."
        }
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
        { titulo: "Editar um condutor (validade da CNH, telefone, login)", itens: [
          "Na lista de condutores, toque em \"Editar\" na linha da pessoa.",
          "Preencha o que mudou: \"Validade da CNH\" (dd/mm/aaaa), \"Número da CNH\", \"Telefone\" ou o \"Login do SGO+\" (só se ainda não tiver).",
          "Campo vazio mantém o que já estava gravado.",
          "Toque em \"Salvar alterações\". Para trocar o arquivo da CNH, toque em \"Trocar CNH\" na mesma linha."
        ] },
        { titulo: "Tirar um veículo ou condutor de uso", itens: [
          "Na linha, toque em \"Inativar\" e confirme.",
          "Ele some das listas, mas o histórico fica guardado. Para voltar, toque em \"Reativar\"."
        ] }
      ],
      problemas: [
        { situacao: "\"Já existe um veículo cadastrado com essa placa.\"", oQueFazer: "O veículo já está no cadastro. Procure na lista." },
        { situacao: "\"Este usuário já está vinculado ao condutor\"", oQueFazer: "Cada login só pode ter um condutor. Escolha outro usuário." },
        { situacao: "\"Este veículo está em uso\" ao inativar", oQueFazer: "Registre a devolução primeiro e depois inative." },
        { situacao: "Aviso de CNH vencida ou a vencer no Início", oQueFazer: "Quando chegar a CNH nova, toque em \"Editar\" no condutor, grave a nova validade e anexe a CNH em \"Trocar CNH\". O aviso some sozinho." },
        { situacao: "\"Este condutor já está ligado a outro login\"", oQueFazer: "Inative este condutor e cadastre de novo com o login certo. O histórico continua guardado." }
      ],
      cores: [
        { nome: "\"CNH até ...\" em vermelho", significado: "A CNH venceu. O condutor não deve retirar veículo até renovar." },
        { nome: "\"CNH até ...\" em amarelo", significado: "A CNH vence em até 30 dias." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Cadastrar, editar, inativar, reativar, anexar CNH e ver telefone e CNH dos condutores." },
        { perfil: "TODOS", pode: "Ver as listas (dos colegas, só o nome)." }
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
