/**
 * Ajuda "Como usar esta tela" — grupo Frota (frente C).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Texto puro, sem HTML.
 * Conferido contra a tela real (JS_Core.html, trecho da Frota, e SGO_Frota_ConteudoModulo.js) em 17/10/2026.
 * 19/10/2026 (revisão da Frota): abas reorganizadas, Gestão e melhoria, editar condutor, rastreador que se explica sozinho e KM rodado.
 * 20/10/2026: aba Rastreamento (mapa ao vivo, rotas, combustível e KM, relatórios, privacidade), Gantt e copiloto em Gestão e melhoria, comprovantes pedidos.
 * 20/10/2026: reservas de veículo (aba Reservas, devolução prevista na retirada, retirada bloqueada por reserva e liberação pela gestão).
 * 21/10/2026: identificação fácil dos veículos (apelido, base, "Sugerir apelido", escolha da base nas listas, mapa, reservas e Gantt).
 * 21/10/2026, à noite: bloqueio e liberação da partida (passar o carro, assumir o carro, pergunta da retirada esquecida, devolução só
 *   com o carro desligado; tela "Bloqueio da partida" da gestão em frota/bloqueio_da_partida). Rótulo: apelido e base na frente, cor como cadastrada.
 * 30/10/2026 (pedido do dono: o abastecimento não pode passar despercebido): pergunta "Abasteceu durante este uso?" na devolução,
 *   litros com vírgula ou ponto como casa decimal, resumo antes de gravar, "a conferir", "Corrigir" com justificativa, "Não abasteci",
 *   próxima retirada travada por abastecimento não lançado, quadro "Obrigatoriedade do abastecimento" e "Plano de manutenção".
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
          "Se aparecerem os botões das bases (\"Todas\", \"Goiânia\", \"Rio de Janeiro\"...), toque na sua base. A escolha fica guardada no aparelho.",
          "Em \"Retirar um veículo\", toque no cartão do veículo. Só aparecem os disponíveis. O nome grande é o apelido do carro (ex.: Onça); embaixo vêm a base, a placa, o modelo e a cor.",
          "Olhe o número no painel do carro.",
          "Se for igual ao KM que já aparece, não mexa.",
          "Se for diferente, corrija o número e toque em \"Tirar foto do painel (obrigatória: KM diferente)\".",
          "Toque em \"Tirar foto do veículo\". A câmera abre direto. Tire pelo menos uma foto.",
          "Olhe o veículo por fora e por dentro.",
          "Se estiver tudo certo, toque em \"Tudo OK\".",
          "Se achar algum problema, toque em \"Tem problema\", toque no item e escreva o que viu.",
          "Em \"Devolução prevista\", confira a data e a hora em que você pretende devolver. Se você tem reserva deste veículo, já vem o fim da reserva.",
          "Toque em \"Confirmar retirada\".",
          "Espere o aviso \"Retirada registrada\"."
        ] },
        { titulo: "Devolver o veículo", itens: [
          "Estacione e DESLIGUE o carro antes. Com o carro ligado ou andando o SGO+ não aceita a devolução (o bloqueio da partida sai depois dela).",
          "Abra a Frota (ou o Início, no celular).",
          "Toque no botão verde \"Devolver\" com o apelido e a placa do veículo.",
          "Digite o KM que está no painel agora.",
          "Toque em \"Tirar foto do painel (obrigatória)\".",
          "Faça a vistoria: \"Tudo OK\" ou \"Tem problema\".",
          "Em \"Abastecimento\", responda se abasteceu durante este uso (obrigatório): \"Não abasteci\" ou \"Abasteci\".",
          "Se abasteceu, toque em \"Lançar agora\": digite os litros e o valor como estão na nota (ex.: 35,591 e 125,99), escolha o combustível, diga se completou o tanque e toque em \"Tirar foto da nota (obrigatória)\". Confira o preço por litro que aparece embaixo.",
          "Sem a nota em mãos, toque em \"Lançar depois\": fica um pedido com prazo de 1 dia útil em \"Comprovantes pedidos a você\".",
          "Se quiser, abra \"Mais fotos e observações (opcional)\".",
          "Toque em \"Confirmar devolução\".",
          "Espere o aviso \"Devolução registrada\". Se aparecer \"Abastecimento não lançado\", leia o que fazer: a sua próxima retirada fica travada até resolver."
        ] },
        { titulo: "Passar o carro para um colega (troca de condutor, sem devolver)", itens: [
          "Use quando outra pessoa vai seguir com o carro (por exemplo, numa viagem a dois). Não devolva: a devolução pede o bloqueio da partida.",
          "Embaixo do botão \"Devolver\", toque em \"Passar o ... para outra pessoa (sem devolver)\".",
          "Escolha a pessoa. Só aparece quem tem autorização de dirigir (condutor ativo com CNH válida).",
          "Se souber, digite o KM do painel. Toque em \"Passar o carro\".",
          "Entregue a chave. Quando a pessoa tocar em \"Assumi o carro\" (com o KM do painel), o carro passa a ser dela. A partida continua liberada.",
          "Sem internet: o pedido fica guardado no celular com a hora e vai sozinho quando a internet voltar."
        ] },
        { titulo: "Receber ou assumir um carro que está com outra pessoa", itens: [
          "Se a pessoa já passou o carro para você: aparece o aviso \"... quer passar o ... para você\". Com a chave na mão, toque em \"Assumi o carro\" e digite o KM do painel.",
          "Se você vai seguir com o carro e a pessoa não pediu: abra \"Em uso por outras pessoas\" e toque em \"Assumir o ...\". Digite o KM do painel. Quem está com o carro confirma no aplicativo (ou a gestão autoriza).",
          "Até a confirmação o carro continua com a outra pessoa. Depois, você é quem devolve no fim."
        ] },
        { titulo: "Responder \"Você ainda está com o carro?\"", itens: [
          "Aparece quando o carro está parado na base há mais de 1 hora com a retirada aberta no seu nome.",
          "Já terminou: toque em \"Devolver\" e faça a devolução normal.",
          "Ainda vai usar: toque em \"Continuar com ele\".",
          "Sem resposta em 1 hora, a gestão é avisada e pode encerrar a retirada (só com o carro parado, desligado e na base)."
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
        { nome: "Aviso vermelho no topo sobre a partida", significado: "A liberação da partida ainda não chegou ao carro (por exemplo, o carro estava sem sinal). A retirada já está registrada. Tente ligar em alguns minutos; se não pegar, ligue para a gestão, que usa \"Liberar agora\"." },
        { nome: "Aviso amarelo \"Você ainda está com o ...?\"", significado: "O carro está parado na base há mais de 1 hora com a retirada no seu nome. Responda \"Devolver\" ou \"Continuar com ele\"." },
        { nome: "Aviso \"... quer passar o ... para você\" ou \"... pediu para assumir o ...\"", significado: "Um pedido de passar o carro esperando a sua confirmação." },
        { nome: "Aviso \"Sem internet: esta é a tela de ...\"", significado: "O celular está sem internet. Passar e assumir o carro ficam guardados no celular e vão sozinhos depois." }
      ],
      problemas: [
        { situacao: "Deu erro ao confirmar, ou o sinal está fraco", oQueFazer: "Não saia da tela. O sistema tenta de novo sozinho. Se a tela pedir, toque de novo em \"Confirmar retirada\" ou \"Confirmar devolução\": as fotos já enviadas não são enviadas outra vez." },
        { situacao: "Aparece \"Já estava registrado\" ou \"já estava registrada\"", oQueFazer: "Está tudo certo. O primeiro toque já tinha gravado. Nada foi registrado em dobro. Não faça mais nada." },
        { situacao: "Aparece \"Registro conferido\" (\"A conexão caiu na resposta, mas o registro foi gravado\")", oQueFazer: "Está tudo certo. Não registre de novo." },
        { situacao: "\"Seu login ainda não tem condutor vinculado\"", oQueFazer: "Peça à gestão (Administrador, Diretoria, Gestor, RH ou Financeiro) para ligar o seu usuário a um condutor em Frota > Veículos e condutores. Depois abra a Frota de novo." },
        { situacao: "KM \"Menor que o KM registrado\"", oQueFazer: "Confira o número no painel. O odômetro não volta. Se o número registrado estiver errado, peça à gestão o ajuste de KM." },
        { situacao: "KM \"Diferente do KM registrado\"", oQueFazer: "Não é erro. Tire a foto do painel e continue. A gestão confere depois." },
        { situacao: "\"Esta retirada está com\" outra pessoa", oQueFazer: "Só quem retirou, ou a gestão, pode devolver. Peça a essa pessoa para registrar. Se não der, procure a gestão." },
        { situacao: "Tocou num veículo que está com outra pessoa", oQueFazer: "A tela mostra com quem ele está. Escolha outro veículo ou fale com essa pessoa." },
        { situacao: "\"Nenhum veículo disponível em [base] agora\"", oQueFazer: "Na sua base todos estão em uso. Toque em \"Todas\" para ver os disponíveis das outras bases." },
        { situacao: "Dois carros iguais (mesmo modelo e cor)", oQueFazer: "Confira o apelido e a placa no cartão antes de tocar. O apelido também está na chave ou no painel do carro, se a gestão colou a etiqueta." },
        { situacao: "\"Nenhum veículo disponível agora\"", oQueFazer: "Todos estão em uso. Veja em \"Em uso por outras pessoas\". A lista se atualiza sozinha quando alguém devolver." },
        { situacao: "\"O veículo ... não está mais disponível. A lista foi atualizada.\"", oQueFazer: "Outra pessoa retirou antes. Escolha outro veículo." },
        { situacao: "\"Liberação aguardando sinal do carro\" ou \"Partida não liberada agora\"", oQueFazer: "A retirada já está registrada. Não registre de novo. O SGO+ tenta de novo a cada 2 minutos. Se precisar sair já, ligue para a gestão, que usa \"Liberar agora\"." },
        { situacao: "\"Devolução não registrada: o rastreador mostra o ... com a ignição ligada\" (ou andando)", oQueFazer: "Estacione, desligue o carro, espere 1 minuto e toque em \"Confirmar devolução\" de novo. Se outra pessoa vai seguir com o carro, use \"Passar o carro\" em vez de devolver." },
        { situacao: "\"O veículo ... já está retirado por ...\" e você vai seguir com ele", oQueFazer: "Não faça retirada nova. Abra \"Em uso por outras pessoas\" e toque em \"Assumir o ...\"." },
        { situacao: "\"... não pode receber o carro: CNH vencida\" (ou sem validade)", oQueFazer: "Só recebe o carro quem tem autorização de dirigir. A gestão atualiza a CNH em Frota > Veículos e condutores > Condutores." },
        { situacao: "\"Não foi possível carregar a frota agora\"", oQueFazer: "Confira a internet e toque em \"Tentar de novo\". Se continuar, avise o administrador." },
        { situacao: "\"Retirada não registrada: o veículo ... está reservado por ...\"", oQueFazer: "Outra pessoa reservou este veículo e a sua devolução prevista (mais a folga de 1 hora) passa do início da reserva dela. Toque num dos botões \"Retirar o ... em vez deste\" para levar um veículo livre, ou, se você devolve antes, corrija a devolução prevista e confirme de novo. Se precisar mesmo deste veículo, fale com a gestão: só ela libera, com justificativa, e quem reservou é avisado." },
        { situacao: "Cartão do veículo com \"Reservado para ...\"", oQueFazer: "O veículo pode ser retirado só se você devolver até o horário mostrado em \"devolva até\". Se não, escolha outro veículo." },
        { situacao: "Esqueceu de devolver", oQueFazer: "Retirada aberta há mais de 12 horas aparece no Início como possível devolução esquecida. Devolva assim que puder ou avise a gestão." }
      ],
      quemPode: [
        { perfil: "TODOS", pode: "Reservar veículo, retirar em seu próprio nome e devolver a própria retirada. Ver a situação da frota, a agenda das reservas, os avisos e o histórico." },
        { perfil: "ADMIN,DIRETORIA,GESTOR,RH,FINANCEIRO", pode: "Tudo da equipe. Também: retirar em nome de outro condutor e devolver no lugar dele (com justificativa), informar outra data e hora, cadastrar veículos e condutores, ajustar KM, conferir KM, ver a trilha de auditoria, registrar manutenção, parada, documentos, multas e abastecimentos, consultar despesas, gerar relatório, usar o rastreador e tratar os casos e ver os indicadores em \"Gestão e melhoria\"." },
        { perfil: "ADMIN", pode: "Também o \"Levantamento de valores suspeitos\", na aba Abastecimentos e despesas." },
        { perfil: "CLIENTE", pode: "Não usa a Frota." }
      ],
      perguntas: [
        { p: "Preciso tirar foto do painel na retirada?", r: "Só quando o KM do painel for diferente do registrado. Na devolução a foto do painel é sempre obrigatória." },
        { p: "Posso registrar a retirada de um colega?", r: "Não. Só a gestão registra em nome de outra pessoa, com justificativa. O colega é avisado." },
        { p: "Posso escolher a data e a hora?", r: "Não. Vale a hora em que você confirma. Só a gestão pode informar outra, com justificativa." },
        { p: "Tirei a foto sem internet. Perdi?", r: "Não. O sistema tenta de novo sozinho em alguns segundos. Se ficar \"Não enviada\", toque na foto." },
        { p: "Toquei duas vezes em confirmar. Ficou em dobro?", r: "Não. O botão vira \"Registrando…\" e fica desligado. Se o pedido se repetir, aparece \"já estava registrada\" e nada é gravado em dobro." },
        { p: "Para que serve a devolução prevista?", r: "Para proteger quem reservou o veículo depois de você. Se a devolução passar do início da próxima reserva, você recebe a cobrança no sistema e em Minhas atividades, e a gestão e quem reservou são avisados." },
        { p: "O que é o nome grande no cartão do veículo (Onça, Tucano...)?", r: "É o apelido do carro, para não confundir carros de mesmo modelo e cor. Cada veículo ativo tem um apelido diferente. Sem apelido, aparece a placa." },
        { p: "Para que serve a vistoria na devolução?", r: "Para comparar com a saída. Se um item saiu OK e voltou com problema, fica claro que aconteceu durante o uso." },
        { p: "O carro pode ser bloqueado comigo dirigindo?", r: "Não. Com a retirada aberta o carro fica liberado, mesmo em viagem de dias. O bloqueio só é pedido depois da devolução e só sai com o carro parado, desligado e com sinal." },
        { p: "Vou trocar de condutor na viagem. Devolvo?", r: "Não. Use \"Passar o carro\": ninguém devolve e nenhum comando vai para o carro. Funciona até sem internet." }
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
        { perfil: "ADMIN,DIRETORIA,GESTOR,RH,FINANCEIRO", pode: "Usar as opções da gestão." }
      ]
    },

    "frota/abastecimentos": {
      titulo: "Abastecimentos",
      paraQueServe: "Guarda cada abastecimento com o comprovante e confere na hora (litros, tanque, preço por litro, KM). O sistema calcula o consumo (km por litro) sozinho e não deixa abastecimento passar sem lançamento.",
      antesDeComecar: [
        "Tenha em mãos a foto ou o PDF do comprovante. Sem ele não salva.",
        "Litros e valor como estão na nota. A vírgula ou o ponto nos litros é sempre a casa decimal: 35,591 ou 35.591 são 35,591 litros.",
        "Quem abasteceu lança na devolução do veículo (passo \"Abastecimento\"). A gestão também lança aqui, no lugar do condutor.",
        "No celular, o botão da gestão fica em \"Opções da gestão\", na tela inicial da Frota."
      ],
      passos: [
        { titulo: "Registrar um abastecimento (computador)", itens: [
          "Abra a aba \"Abastecimentos e despesas\".",
          "Toque em \"+ Registrar abastecimento\".",
          "Escolha o veículo.",
          "Escolha o condutor, se souber.",
          "Preencha a data, a hora (opcional: com ela o SGO+ confere se o veículo estava parado no horário), o \"KM no abastecimento\", o \"Tipo de combustível\", os litros, o \"Valor total (R$)\" e o posto.",
          "Em \"Comprovante (obrigatório)\", anexe a foto ou o PDF.",
          "Toque em \"Salvar abastecimento\".",
          "Leia o resumo que aparece (litros × preço por litro = valor, KM e quanto rodou desde o anterior). Se algo estiver errado, toque em Cancelar e corrija; se estiver certo, toque em OK."
        ] },
        { titulo: "Responder um abastecimento pendente (condutor)", itens: [
          "Abra a aba \"Abastecimentos e despesas\". No celular, toque em \"Resolver agora\" no aviso da tela inicial da Frota.",
          "Em \"Comprovantes pedidos a você\", leia o pedido: \"Abastecimento a lançar\" (você disse que lançaria depois) ou \"Abastecimento não lançado\" (o veículo rodou demais sem abastecimento lançado).",
          "Se abasteceu: preencha data, KM, litros, valor e combustível, anexe a foto da nota e toque em \"Enviar comprovante\".",
          "Se não abasteceu: toque em \"Não abasteci\" e escreva o motivo (mínimo de 15 caracteres). A gestão confere com a foto do painel da devolução.",
          "Pronto: a sua próxima retirada fica livre na hora."
        ] },
        { titulo: "Conferir e corrigir (gestão)", itens: [
          "No topo da aba, quadro \"Obrigatoriedade do abastecimento\": veja os veículos (quanto rodaram desde o último abastecimento e o limite), as pendências, os \"Não abasteci\" e os lançamentos a conferir.",
          "Pendência: fale com o condutor ou toque em \"Liberar\" e escreva o motivo.",
          "\"Não abasteci\": toque em \"Aceitar\" ou em \"Não aceitar\" (com o motivo; o condutor recebe e a próxima retirada dele volta a ficar travada).",
          "Lançamento a conferir: abra o comprovante e toque em \"Conferido\", \"Divergente\" (com o motivo) ou \"Corrigir\".",
          "Corrigir: mude só o campo errado, escreva a justificativa e toque em \"Gravar correção\". O comprovante continua o mesmo; o valor antigo, o novo, quem e quando ficam na trilha de auditoria.",
          "Data, hora ou KM de uma retirada errada: abra \"Corrigir data, hora ou KM de uma retirada\", escolha o veículo e toque em \"Corrigir\" na retirada.",
          "A capacidade do tanque de cada veículo fica no quadro (campo \"Tanque (L)\" e \"Gravar\")."
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
        { situacao: "O consumo não aparece", oQueFazer: "É preciso ter pelo menos 2 abastecimentos do mesmo veículo." },
        { situacao: "\"Os litros informados passam da capacidade do tanque\"", oQueFazer: "Confira o número na nota e digite com a vírgula (ex.: 35,591). Se abasteceu mais de um veículo ou galão, lance cada um separado." },
        { situacao: "\"O preço por litro ficou fora do possível\"", oQueFazer: "Os litros ou o valor foram digitados errado (a vírgula no lugar errado). Confira a nota e digite de novo." },
        { situacao: "Ficou \"A conferir\"", oQueFazer: "Foi gravado. A gestão confere com o comprovante (preço fora da faixa, KM que não bate com a retirada, litros em sequência acima do tanque). O consumo dele fica fora da média até a conferência." },
        { situacao: "\"Retirada travada: você tem abastecimento pendente de lançamento\"", oQueFazer: "Em \"Comprovantes pedidos a você\", envie o comprovante ou toque em \"Não abasteci\" com o motivo. Se precisar sair agora, peça à gestão para liberar." },
        { situacao: "\"Responda Abasteceu durante este uso?\"", oQueFazer: "Na devolução, toque em \"Não abasteci\" ou em \"Abasteci\" no passo \"Abastecimento\" e confirme de novo." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,RH,FINANCEIRO", pode: "Registrar, corrigir, conferir e excluir abastecimentos; liberar pendências; conferir os \"Não abasteci\"; configurar o limite da obrigatoriedade." },
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
        { perfil: "ADMIN,DIRETORIA,GESTOR,RH,FINANCEIRO", pode: "Consultar as despesas." },
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
        { perfil: "ADMIN,DIRETORIA,GESTOR,RH,FINANCEIRO", pode: "Registrar, indicar condutor, mudar a situação, recruzar e excluir." },
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
        { perfil: "ADMIN,DIRETORIA,GESTOR,RH,FINANCEIRO", pode: "Anexar e excluir documentos." },
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
        { perfil: "ADMIN,DIRETORIA,GESTOR,RH,FINANCEIRO", pode: "Ver e conferir." }
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
        { perfil: "ADMIN,DIRETORIA,GESTOR,RH,FINANCEIRO", pode: "Ajustar o KM. O antes, o depois, quem fez e o motivo ficam na trilha de auditoria." }
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
        { perfil: "ADMIN,DIRETORIA,GESTOR,RH,FINANCEIRO", pode: "Consultar a trilha." }
      ]
    },

    "frota/rastreador": {
      "titulo": "Rastreador e bloqueio da partida",
      "paraQueServe": "Mostrar à gestão onde cada veículo está e se está andando. O SGO+ lê o rastreador a cada 2 minutos e: 1) avisa se um veículo andar sem retirada registrada; 2) confere o KM rodado de cada retirada com o que o rastreador mediu; 3) guarda o local onde o veículo parou na devolução.",
      "antesDeComecar": [
        "O bloqueio e a liberação da partida ficam na parte \"Bloqueio da partida\" da aba Rastreamento (a regra, os modos de cada carro e o registro estão lá).",
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
          "titulo": "Liberar a partida em emergência",
          "itens": [
            "\"Liberar partida\" desta parte (e, no celular, Frota > \"Opções da gestão\" > \"Partida do veículo (rastreador)\" > \"Liberar agora (emergência)\") faz a liberação de emergência: escreva o motivo e confirme.",
            "\"Bloquear agora\" não envia mais nada: o bloqueio do dia a dia sai sozinho depois da devolução, e o bloqueio de roubo é da Diretoria, na parte \"Bloqueio da partida\"."
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
          "significado": "Histórico da versão anterior (até 21/10/2026). Os comandos de agora ficam no registro da parte \"Bloqueio da partida\"."
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
          "oQueFazer": "A retirada já está registrada. Use \"Liberar agora\" na parte \"Bloqueio da partida\" (com o motivo) ou a central 24 h da iTracker."
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
        "Mapa, rotas, combustível e relatórios só leem o rastreador. Comandos ao carro (liberar, bloquear, odômetro) só na parte \"Bloqueio da partida\".",
        "Toda abertura do mapa, consulta de rota e relatório com localização fica registrada em \"Privacidade e configuração > Quem consultou\"."
      ],
      "passos": [
        {
          "titulo": "Ver os veículos no mapa",
          "itens": [
            "Abra a aba \"Rastreamento\". O \"Mapa ao vivo\" abre primeiro.",
            "Em \"Base\", acima do mapa, escolha a cidade para ver só os carros dela (\"Todas as bases\" mostra todos).",
            "No mapa, cada veículo aparece com o apelido (ou a placa, se ainda não tiver apelido). Na lista ao lado vêm apelido, placa e base.",
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

    "frota/bloqueio_da_partida": {
      titulo: "Bloqueio da partida (Rastreamento > Bloqueio da partida)",
      paraQueServe: "Garantir que o carro só pega com a retirada registrada no SGO+, sem nunca cortar o motor de quem está dirigindo. A retirada libera a partida; a devolução pede o bloqueio, que só sai com o carro conectado, parado e desligado. Aqui a gestão vê cada carro, decide os casos que o sistema não decide sozinho e acompanha o registro.",
      antesDeComecar: [
        "Só a gestão da Frota abre esta parte. \"Liberar agora\": Administrador, Diretoria, Gestor e RH. Odômetro: Gestor e Administrador. Bloqueio de roubo: só a Diretoria.",
        "Modos de cada carro: Ativo (manda o comando de verdade), Simulação (faz tudo e só registra o que teria feito) e Desligado. Começo do piloto: o Onix em Ativo e os outros em Simulação.",
        "Ativo só manda comando de verdade depois que o responsável pelo sistema grava a \"Chave de acesso dos comandos\" e liga \"Bloqueio da partida pelo SGO+\" em Chaves e senhas > Rastreador da frota. Até lá o cartão mostra \"Ativo aguardando liberação\" e o carro trabalha em simulação.",
        "Configure a área de cada base (centro e raio) no fim da tela. Sem ela, toda devolução vai para a decisão da gestão.",
        "Regras: com retirada aberta o carro fica liberado, mesmo em viagem de dias; o bloqueio nunca sai com o carro andando, ligado ou com o aparelho offline (conectado = online na iTracker e contato nos últimos 2 minutos; com o carro desligado a última posição pode ser de horas antes, porque o rastreador economiza); devolução fora da base não bloqueia sozinha; um bloqueio aceito com o carro sem conexão (fila do rastreador) é tratado como NÃO feito; a conferência a cada 2 minutos compara o que deveria estar com o relé do carro."
      ],
      passos: [
        { titulo: "Ver como está cada carro", itens: [
          "Abra Frota > Rastreamento > \"Bloqueio da partida\".",
          "Cada cartão mostra o modo, a triagem do sinal, quem está com o carro, a partida no carro (liberada ou bloqueada), o sinal, a situação, a base, o último comando e o que está pendente.",
          "A tela não se atualiza sozinha. Toque em \"Atualizar\" para ler de novo."
        ] },
        { titulo: "Decidir um carro devolvido fora da base", itens: [
          "Em \"Decisões pendentes\", no cartão \"Devolvido fora da base: bloquear?\", toque em \"Bloquear\" ou \"Não bloquear\".",
          "Escreva a justificativa e confirme.",
          "\"Bloquear\" só sai com o carro conectado, parado e desligado. \"Não bloquear\" vale até a próxima retirada."
        ] },
        { titulo: "Retirada esquecida", itens: [
          "Carro parado na base há 1 hora com retirada aberta: o SGO+ pergunta ao condutor. Sem resposta em mais 1 hora, aparece aqui e na Caixa de decisões.",
          "Se alguém precisa do carro, prefira autorizar \"Passar o carro\" (o carro não é bloqueado).",
          "Para encerrar: toque em \"Encerrar a retirada\", escreva a justificativa e confirme. Só funciona com o carro parado, desligado, na base e com sinal. O KM vem do rastreador e entra em \"KM a conferir\"; depois o bloqueio é pedido."
        ] },
        { titulo: "Autorizar ou recusar uma passagem do carro", itens: [
          "Quando quem está com o carro não consegue confirmar no aplicativo, a passagem aparece em \"Decisões pendentes\".",
          "Toque em \"Autorizar\", escreva a justificativa e confirme. Quem está envolvido não autoriza a si mesmo."
        ] },
        { titulo: "Liberar agora (emergência)", itens: [
          "No cartão do carro, toque em \"Liberar agora\".",
          "Escreva o motivo e toque em \"Liberar agora\". Vale 24 horas ou até a próxima devolução.",
          "Se aparecer \"aguardando sinal\", o carro está sem conexão: ligue para a central 24 h da iTracker."
        ] },
        { titulo: "Bloqueio de roubo (só a Diretoria)", itens: [
          "No cartão do carro, toque em \"Bloqueio de roubo\".",
          "Escreva o motivo, marque \"Confirmo que é roubo ou furto\" e digite BLOQUEAR e a placa.",
          "Com o carro andando, o SGO+ não envia e explica o risco. Para enviar mesmo assim, marque \"Aceito o risco\" e toque de novo.",
          "Avise a central 24 h da iTracker e registre o boletim de ocorrência."
        ] },
        { titulo: "Acertar o odômetro do rastreador", itens: [
          "Quando o KM do painel na devolução e o do rastreador diferem mais de 2% e mais de 50 km, aparece \"Odômetro diferente do painel\" (só no sistema).",
          "Abra a foto do painel e confira o número.",
          "Toque em \"Acertar o odômetro do rastreador\" (já vem o KM do painel), marque a confirmação e toque de novo.",
          "Valor menor que o atual pede a segunda confirmação e o motivo. O carro precisa estar parado. Em Simulação o SGO+ só registra o que mandaria.",
          "Numa revisão, use o mesmo botão no cartão do carro a qualquer momento."
        ] },
        { titulo: "Mudar o modo ou a triagem do sinal de um carro", itens: [
          "Toque em \"Modo\", escolha Ativo, Simulação ou Desligado, escreva o motivo e grave.",
          "Toque em \"Triagem do sinal\" para ver os locais onde o carro costuma ficar, a parte do tempo em que o aparelho estava conectado à iTracker e quanto demora, em média, para reconectar. A medida é a conexão do aparelho, não o intervalo entre posições: carro desligado manda posição raramente (economia do rastreador) e continua conectado. Nas primeiras 24 h aparece \"Triagem sem dados\" e vale a regra normal. \"Só avisa\" = o SGO+ nunca manda bloqueio para este carro (por exemplo, carro que dorme em garagem subterrânea). Pode deixar automática ou escolher, com motivo."
        ] },
        { titulo: "Configurar a área de uma base", itens: [
          "No fim da tela, escolha a base.",
          "Escolha um carro estacionado na base (usa a posição dele) ou digite a latitude e a longitude.",
          "Confira o raio (padrão de 300 metros) e toque em \"Gravar a área\"."
        ] },
        { titulo: "Registro e relatório do dia", itens: [
          "A tabela \"Registro\" mostra cada pedido, comando, simulação, confirmação e decisão, com quem, quando e a condição do carro. Nada pode ser apagado.",
          "Toque em \"Conferir a integridade\": o SGO+ confere que nenhuma linha foi alterada ou apagada.",
          "Toque em \"Relatório de hoje\" para ver o que aconteceu e o que a simulação teria feito. Às 18h o mesmo relatório vai por e-mail para a gestão da Frota e a Diretoria."
        ] }
      ],
      cores: [
        { nome: "Selo vermelho \"Ativo\"", significado: "Comandos de verdade para este carro." },
        { nome: "Selo azul \"Simulação\"", significado: "O SGO+ só registra o que teria feito." },
        { nome: "Selo amarelo \"Ativo aguardando liberação\"", significado: "O carro está em Ativo, mas falta a chave dos comandos ou ligar o bloqueio em Chaves e senhas. Trabalha em simulação." },
        { nome: "Selo \"Só avisa\"", significado: "Sinal fraco onde o carro costuma ficar: o SGO+ nunca manda bloqueio, só avisa." },
        { nome: "Cartão com faixa vermelha em \"Decisões pendentes\"", significado: "Precisa da gestão." }
      ],
      problemas: [
        { situacao: "\"Nenhum comando real sai agora\"", oQueFazer: "O responsável pelo sistema grava a chave e liga o bloqueio em Configurações > Chaves e senhas > Rastreador da frota. Depois toque em \"Atualizar\"." },
        { situacao: "Pendência \"aguardando: o aparelho está offline\" (ou \"não fala com a iTracker há mais de 2 minutos\")", oQueFazer: "Normal. O bloqueio sai sozinho quando o aparelho voltar a ficar conectado, com o carro parado e desligado. Se demorar muito, confira onde está o carro no mapa." },
        { situacao: "\"Bloqueio na fila do rastreador\"", oQueFazer: "O carro estava sem conexão. O SGO+ trata como não bloqueado. Se alguém vai usar o carro, a retirada manda a liberação logo em seguida." },
        { situacao: "\"A retirada não foi encerrada: ...\"", oQueFazer: "A mensagem diz a condição que faltou (carro andando, ligado, fora da base ou sem sinal). Espere o carro ficar parado e desligado na base, ou autorize \"Passar o carro\"." },
        { situacao: "\"Registro com problema\" na conferência", oQueFazer: "Alguém mexeu na planilha do registro. Avise o Administrador; a linha indicada mostra o que foi alterado." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,RH,FINANCEIRO", pode: "Ver, decidir fora da base, encerrar retirada esquecida, autorizar passagem, mudar modo, triagem e áreas das bases." },
        { perfil: "ADMIN,DIRETORIA,GESTOR,RH", pode: "Liberar agora (emergência)." },
        { perfil: "ADMIN,GESTOR", pode: "Acertar o odômetro do rastreador." },
        { perfil: "DIRETORIA", pode: "Bloqueio de roubo." },
        { perfil: "TODOS", pode: "Passar o carro, assumir o carro e responder à pergunta da retirada esquecida, na tela normal da Frota." }
      ],
      perguntas: [
        { p: "Por que não bloqueia logo depois da devolução?", r: "Porque o bloqueio só pode sair com o aparelho conectado agora (online na iTracker, com contato nos últimos 2 minutos), o carro parado e desligado. Se o comando ficasse na fila do rastreador, ele poderia cortar o motor de quem saísse dirigindo depois." },
        { p: "O cartão mostra a última posição de horas atrás. Está sem sinal?", r: "Não necessariamente. Com o carro desligado o rastreador entra em economia e só manda posição quando o carro liga, mas continua conectado. Veja a linha \"Sinal\": \"aparelho online, último contato agora\" é o que vale." },
        { p: "Por que um carro está em \"Só avisa\"?", r: "Pela triagem do sinal: onde ele costuma ficar, o aparelho perde a conexão com a iTracker por muito tempo (garagem subterrânea, região sem cobertura). Um bloqueio enviado ali poderia ficar na fila e cair quando o carro saísse." },
        { p: "O que a Simulação mostra?", r: "Tudo o que o SGO+ teria feito com o carro (liberar, bloquear, esperar, pedir decisão), no registro e no relatório das 18h, sem mandar nada ao carro." }
      ]
    },

    "frota/reservas": {
      titulo: "Reservas de veículo",
      paraQueServe: "Garantir o veículo para quem já tem compromisso marcado (viagem, atendimento no cliente). Com a reserva, ninguém chega para viajar e encontra o carro retirado por outra pessoa.",
      antesDeComecar: [
        "O seu login precisa estar ligado a um condutor, com a validade da CNH cadastrada e válida até o fim da reserva. Quem cadastra é a gestão, em Frota > Veículos e condutores > Condutores.",
        "Reservas abrem com até 90 dias de antecedência e duram até 15 dias (a gestão pode mudar em Reservas > Regras).",
        "A reserva não substitui a retirada: no horário, retire o veículo normalmente em \"Situação e retiradas\"."
      ],
      passos: [
        { titulo: "Reservar um veículo", itens: [
          "Abra a Frota, aba \"Reservas\" (no celular: botão \"Reservas: agenda e reservar um veículo\").",
          "Toque em \"Reservar um veículo\", ou toque num espaço vazio da agenda no dia (e na hora) que você quer.",
          "Preencha o início e a devolução prevista (data e hora).",
          "Em \"Veículo\", o primeiro veículo livre no período já vem escolhido. Os ocupados aparecem na lista com o motivo.",
          "Escreva o destino e o motivo. Passageiros e \"Ligar a\" (O.S. do Auvo, atividade ou cliente) são opcionais.",
          "Toque em \"Reservar\". Aparece o código da reserva, por exemplo RV-2026-0001."
        ] },
        { titulo: "Ver a agenda", itens: [
          "Na parte \"Agenda\", escolha \"Semana\" ou \"Dia\". Use \"‹ Anterior\", \"Hoje\" e \"Próximo ›\" para andar no tempo.",
          "Em \"Base\", no fim da barra, escolha a cidade para ver só os carros dela.",
          "Cada linha é um veículo, com o apelido e a placa (ex.: Onça · PQB4394). Toque numa reserva para ver o detalhe."
        ] },
        { titulo: "Cancelar ou trocar o veículo", itens: [
          "Abra \"Minhas reservas\".",
          "Não vai usar? Toque em \"Cancelar reserva\", escreva o motivo e confirme. O veículo fica livre para quem precisa.",
          "Para mudar de veículo, toque em \"Trocar veículo\" e escolha um dos livres no mesmo período."
        ] },
        { titulo: "No dia da reserva", itens: [
          "Na véspera (último dia útil antes, a partir das 14:00) você recebe o lembrete no sistema e por e-mail, com o resultado da conferência do veículo.",
          "A partir de 2 horas antes do início, retire o veículo em \"Situação e retiradas\". A reserva passa a \"em uso\" e, na devolução, a \"concluída\".",
          "Sem retirada até 1 hora depois do início, a reserva vira \"não utilizada\" e o veículo fica livre."
        ] },
        { titulo: "Gestão: manutenção programada, reservar por outra pessoa, indicadores e regras", itens: [
          "No formulário \"Reservar\", marque \"Manutenção programada\" para bloquear o veículo no período (sem condutor).",
          "Para reservar em nome de outra pessoa, escolha o condutor. Ela é avisada.",
          "\"Todas as reservas\": cancele com justificativa (a pessoa é avisada) ou troque o veículo quando houver problema.",
          "\"Indicadores e relatório\": reservas cumpridas, não utilizadas, retiradas bloqueadas, liberações e atrasos que afetaram reserva; relatório A4 do mês em \"Gerar relatório\".",
          "\"Regras\": folga, tolerância, antecipação, hora do lembrete, antecedência e duração máximas."
        ] }
      ],
      cores: [
        { nome: "Faixa verde", significado: "Sua reserva." },
        { nome: "Faixa azul clara", significado: "Reserva de outra pessoa." },
        { nome: "Faixa laranja", significado: "Manutenção programada: o veículo não pode ser reservado nem retirado." },
        { nome: "Faixa azul forte", significado: "Veículo retirado agora." },
        { nome: "Faixa vermelha", significado: "Devolução atrasada." },
        { nome: "Faixa cinza", significado: "Parada registrada (oficina, acidente)." },
        { nome: "Texto riscado", significado: "Reserva não utilizada." }
      ],
      problemas: [
        { situacao: "\"O veículo ... não está livre de ...\"", oQueFazer: "O veículo já tem reserva, manutenção, parada ou retirada no período. Toque em um dos botões \"Reservar o ...\" com os livres, ou mude o horário." },
        { situacao: "\"você já tem a reserva ... no mesmo horário\"", oQueFazer: "Uma pessoa não segura dois veículos ao mesmo tempo. Para mudar de veículo, use \"Trocar veículo\" em Minhas reservas." },
        { situacao: "\"a CNH ... vence ... antes do fim da reserva\" ou \"a validade da CNH ... não está cadastrada\"", oQueFazer: "Peça à gestão para atualizar a validade da CNH em Frota > Veículos e condutores > Condutores > Editar, com a CNH nova anexada. Depois reserve de novo." },
        { situacao: "Aviso \"o veículo da sua reserva foi liberado pela gestão\"", oQueFazer: "A sua reserva continua valendo, mas o veículo pode não voltar a tempo. Para garantir, troque o veículo em Minhas reservas." },
        { situacao: "Aviso \"Reserva com problema\"", oQueFazer: "A conferência achou algo (parada, documento vencido, veículo fora). Troque o veículo em Minhas reservas ou fale com a gestão." },
        { situacao: "Aviso \"O veículo da sua reserva ainda não voltou\"", oQueFazer: "Quem está com o veículo já foi cobrado e a gestão foi avisada. Se preferir garantir, troque o veículo por um livre." }
      ],
      quemPode: [
        { perfil: "TODOS", pode: "Reservar em seu próprio nome, ver a agenda, cancelar e trocar o veículo das próprias reservas." },
        { perfil: "ADMIN,DIRETORIA,GESTOR,RH,FINANCEIRO", pode: "Também: reservar em nome de outra pessoa, lançar manutenção programada, cancelar ou trocar qualquer reserva (com justificativa; a pessoa é avisada), liberar uma retirada sobre reserva (na tela de retirada, com justificativa), ver indicadores, gerar o relatório A4 e mudar as regras." },
        { perfil: "CLIENTE", pode: "Não usa a Frota." }
      ],
      perguntas: [
        { p: "Preciso de aprovação para reservar?", r: "Não. A reserva vale assim que aparece o código." },
        { p: "Alguém pode pegar o carro que eu reservei?", r: "Não. A retirada é recusada se a devolução prevista dela, mais 1 hora de folga, passar do início da sua reserva. Só a gestão pode liberar, com justificativa, e você é avisado na hora com a sugestão de outro veículo." },
        { p: "E se quem está com o veículo atrasar?", r: "A pessoa recebe a cobrança no sistema e em Minhas atividades; você e a gestão são avisados, com os veículos livres para trocar." },
        { p: "Recebo mensagem no WhatsApp?", r: "Pela matriz de avisos, só em quatro casos, no horário de trabalho, se você for CLT e no máximo uma por dia em cada caso: a reserva de hoje foi liberada a outra pessoa, você está com o veículo e a devolução atrasou com reserva no mesmo dia, e, para o gestor da Frota, a partida não liberada pelo rastreador e o veículo em uso sem registro. Fora do expediente, o uso sem registro vai no resumo do dia seguinte. O resto fica no sistema e no e-mail (na hora ou no resumo do dia)." },
        { p: "Reserva cancelada some?", r: "Não. Canceladas, não utilizadas e concluídas ficam no histórico." }
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
            "Escolha a escala: \"Dia\" (uma marca por hora), \"Semana\" (um dia por coluna; abre de 7 dias antes a 14 dias depois de hoje) ou \"Mês\" (um rótulo por semana).",
            "Use \"‹ Anterior\", \"Hoje\" e \"Próximo ›\" para andar no tempo, ou escreva as datas em \"De\" e \"Até\" e toque em \"Atualizar\".",
            "Em \"Base\", escolha a cidade para ver só os carros dela. O nome de cada linha é o apelido e a placa do veículo.",
            "Cada veículo tem as sub-linhas \"Planejado\" (reservas e manutenção programada), \"Realizado\" (retiradas e paradas) e, quando houver, \"Marcos\" (losangos de manutenção prevista e documento que vence). A última linha, \"Ações dos planos\", mostra as ações de Minhas atividades.",
            "O que acontece ao mesmo tempo fica um embaixo do outro, nunca por cima. Várias retiradas curtas no mesmo dia viram um bloco só (\"7 retiradas\"): toque nele para ver a lista e em \"Ver este dia um a um\".",
            "O nome aparece dentro da barra quando cabe inteiro; senão, ao lado. Para ver tudo, passe o mouse ou toque na barra ou no losango: o balão mostra condutor, saída, devolução, KM e situação. Toque fora ou em \"×\" para fechar.",
            "A linha vermelha é agora; colunas cinza são sábado e domingo. Veículos sem nada no período aparecem numa linha só, embaixo do quadro.",
            "No celular a tela abre em \"Lista\" (por veículo e por dia; toque num item para ver o detalhe). Em \"Gráfico\", deslize o quadro para os lados: a placa fica fixa à esquerda."
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
        },
        {
          "nome": "Gantt: caixa clara tracejada (azul, verde, vermelha ou laranja)",
          "significado": "Planejado: reserva (azul), reserva cumprida (verde), reserva não utilizada (vermelha) e manutenção programada (laranja)."
        },
        {
          "nome": "Gantt: barra cheia azul, azul listrada ou cinza",
          "significado": "Realizado: retirada devolvida (azul), retirada em andamento (listrada) e parada do veículo (cinza). Barra roxa é ação de plano (verde: concluída; vermelha: vencida)."
        },
        {
          "nome": "Gantt: losango laranja, verde-azulado ou vermelho",
          "significado": "Marcos: manutenção prevista (laranja), documento que vence (verde-azulado) e vencido (vermelho)."
        },
        {
          "nome": "Gantt: barra curta com um ponto no meio",
          "significado": "Evento de poucas horas, desenhado com a largura mínima para dar para tocar. O horário certo está no balão."
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
          "Em \"Apelido\", escreva como a equipe vai chamar o carro (ex.: Onça) ou toque em \"Sugerir apelido\": vem um nome de animal que nenhum veículo usa. Toque de novo para outro nome.",
          "Em \"Base\", escolha a cidade onde o carro fica (ex.: Goiânia ou Rio de Janeiro).",
          "Toque em \"Salvar veículo\"."
        ] },
        { titulo: "Dar apelido e base a um veículo já cadastrado", itens: [
          "No topo da lista, o aviso \"N veículos ativos sem apelido\" mostra quantos faltam (nada fica travado enquanto isso).",
          "Na linha do veículo, toque em \"Editar\".",
          "Preencha \"Apelido\" (ou toque em \"Sugerir apelido\") e escolha a \"Base\".",
          "Toque em \"Salvar edição\". O apelido passa a aparecer em todas as telas, no mapa, nas reservas, no Gantt, nos avisos e nos relatórios. Campo vazio mantém o que já estava gravado."
        ] },
        { titulo: "Ver só os carros de uma base", itens: [
          "Acima da lista, em \"Base\", escolha a cidade. \"Todas as bases\" mostra a frota inteira.",
          "A escolha fica guardada neste navegador e vale também para o mapa, a agenda das reservas e o Gantt.",
          "Veículo ainda sem base aparece em todas as bases até a gestão escolher a dele."
        ] },
        { titulo: "Mudar a lista de bases", itens: [
          "Abra \"Bases da frota\", embaixo do botão \"+ Cadastrar novo veículo\".",
          "Escreva uma base por linha (ex.: Goiânia, Rio de Janeiro, Brasília).",
          "Toque em \"Gravar bases\". Base com veículo ativo não sai da lista: troque a base desses veículos em \"Editar\" antes."
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
        { situacao: "\"O apelido ... já é do veículo ...\"", oQueFazer: "Cada veículo ativo tem um apelido diferente (maiúscula e acento não contam: Onça e onca são o mesmo). Escolha outro ou toque em \"Sugerir apelido\"." },
        { situacao: "\"A base ... não está na lista de bases da Frota\"", oQueFazer: "Escolha uma base da lista. Para incluir uma cidade nova, use \"Bases da frota\"." },
        { situacao: "Ao reativar: \"O apelido ... já é do veículo ...\"", oQueFazer: "Outro veículo ativo ficou com o mesmo apelido. Toque em \"Editar\" no veículo inativo, troque o apelido e reative." },
        { situacao: "\"A base ... ainda está em uso\" ao gravar as bases", oQueFazer: "Troque a base dos veículos listados em \"Editar\" e grave a lista de novo." },
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
        { perfil: "ADMIN,DIRETORIA,GESTOR,RH,FINANCEIRO", pode: "Cadastrar, editar, inativar, reativar, anexar CNH e ver telefone e CNH dos condutores. Dar apelido e base aos veículos e mudar a lista de bases." },
        { perfil: "TODOS", pode: "Ver as listas (dos colegas, só o nome)." }
      ]
    },

    "frota/manutencao_e_paradas": {
      titulo: "Manutenção e paradas",
      paraQueServe: "Mantém o plano de manutenção de cada veículo (óleo e filtros, freios, pneus, alinhamento, correia, arrefecimento, bateria, revisão), registra as manutenções feitas e os períodos em que o veículo ficou parado. O sistema avisa antes de vencer.",
      passos: [
        { titulo: "Preencher o plano de manutenção (gestão)", itens: [
          "Abra a aba \"Manutenção e paradas\". O quadro \"Plano de manutenção\" fica no topo.",
          "Abra o veículo. Itens com \"Sem a última vez\" ainda não têm a data e o KM da última troca.",
          "Toque em \"Informar\" no item, preencha a data e o KM da última vez (estão na nota ou na etiqueta da oficina) e toque em \"Gravar\".",
          "Se o manual do veículo pede outro intervalo, preencha \"Intervalo (km)\" e \"Intervalo (meses)\" e de onde veio. Vazio usa o padrão de uso severo.",
          "A próxima vem calculada: vence o que chegar primeiro, o KM ou a data."
        ] },
        { titulo: "Óleo ou freio vencido (retirada travada)", itens: [
          "Com óleo ou freio vencido há mais de 1.000 km, a retirada do veículo fica travada.",
          "Leve o veículo à manutenção e registre a manutenção feita: o item volta a ficar em dia.",
          "Se o veículo precisar rodar até a troca, toque em \"Liberar uso\" no item e escreva o motivo: libera por mais 500 km."
        ] },
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
        { nome: "Aviso \"Vencido\" ou \"A vencer\"", significado: "A manutenção venceu, ou vence em até 500 km ou 15 dias (\"A vencer\")." },
        { nome: "\"Faltam até 1.000 km ou 30 dias\"", significado: "Aviso antecipado: programe a manutenção." },
        { nome: "\"Sem a última vez\"", significado: "Falta informar a data e o KM da última troca. O SGO+ cria a pendência \"Plano de manutenção incompleto\" até preencher." },
        { nome: "\"Informe o intervalo\"", significado: "Item sem intervalo padrão (correia dentada): preencha pelo manual do veículo." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,RH,FINANCEIRO", pode: "Registrar manutenções e paradas." }
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
        { perfil: "ADMIN,DIRETORIA,GESTOR,RH,FINANCEIRO", pode: "Gerar o relatório." }
      ]
    }
  };
}
