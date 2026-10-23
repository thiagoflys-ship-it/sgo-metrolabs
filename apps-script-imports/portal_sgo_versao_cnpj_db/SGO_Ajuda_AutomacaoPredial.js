/**
 * Ajuda "Como usar esta tela" — Segurança e automação predial (22/10/2026).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Texto puro, sem HTML.
 * Conferido contra a tela real (JS_AutomacaoPredial.html) e o servidor (SGO_Automacao_Predial.js, SGO_Automacao_Tuya.js).
 * 22/10/2026, decisões do dono: diretor = perfil Diretoria, vínculo de trabalho Diretoria ou responsável pelo sistema;
 *   a porta da Diretoria é do responsável pelo sistema (os outros diretores só com a permissão dele); nada para digitar
 *   (janela "Sim, abrir agora"); botões grandes no topo, atalho "Portões" no celular e botões no Início do computador;
 *   até a homologação, o módulo é só do Administrador e dos diretores.
 * 23/10/2026, pedidos do dono: portões liberados para toda a equipe (ver, abrir e fechar; a porta continua só dos diretores);
 *   garagem com sensor já abre e fecha (o fechar vale com a homologação do abrir); posição Aberto/Fechado/Abrindo/Fechando
 *   relida a cada 5 s com aviso na mudança; "Abrir automaticamente quando tocarem a campainha" na porta da Diretoria.
 */
function SGO_ajudaTelas_AutomacaoPredial_() {
  return {
    "automacao_predial": {
      titulo: "Segurança e automação predial",
      paraQueServe: "Abre e fecha os portões da empresa e, para a Diretoria, destrava a porta da Diretoria pelo SGO+, usando a nuvem do aplicativo Smart Life. Mostra se o portão está aberto ou fechado. Cada comando fica registrado com quem pediu, quando, o que a nuvem respondeu e se o dispositivo confirmou.",
      antesDeComecar: [
        "O responsável pelo sistema precisa ter gravado as credenciais da Tuya em Administração > Chaves e senhas > Automação predial (Tuya) e tocado em \"Testar conexão\" (passo a passo no Guia de acesso à Tuya).",
        "Enquanto a automação está Desligada ou nenhum dispositivo foi homologado, a tela é só do Administrador e dos diretores (implantação). Depois aparece para toda a equipe interna.",
        "Diretor, para o SGO+, é quem tem o perfil Diretoria, o vínculo de trabalho Diretoria no cadastro de usuários, ou é o responsável pelo sistema.",
        "Os portões são de toda a equipe interna: qualquer colaborador vê, abre e fecha, sem permissão individual.",
        "A porta da Diretoria só aparece para os diretores. O responsável pelo sistema destrava por padrão; outro diretor só com a permissão \"Acionar\" concedida por ele.",
        "Enquanto o dispositivo não foi homologado pela Diretoria, tudo trabalha em simulação: o SGO+ registra o que teria feito e nada é enviado."
      ],
      passos: [
        { titulo: "Abrir ou fechar um portão (celular ou computador)", itens: [
          "No celular, toque em \"Portões\" no Início. No computador, use os botões grandes do Início ou toque em \"Segurança e automação predial\" no menu (grupo Segurança predial).",
          "No bloco \"Abrir agora\", confira a posição do portão no selo grande (\"Aberto\", \"Fechado\", \"Abrindo…\" ou \"Fechando…\") e, ao lado, \"Online\" e o último comando.",
          "Toque em \"Abrir portão\" ou em \"Fechar portão\".",
          "Na janela, confira o nome do portão.",
          "Toque em \"Sim, abrir agora\" (ou \"Sim, fechar agora\"). Não há nada para digitar.",
          "Com a tela aberta, a posição é relida a cada 5 segundos. Quando o portão abre ou fecha (pelo SGO+, pelo controle ou pelo aplicativo), aparece no topo o aviso \"Portão ... abriu às hh:mm:ss\" ou \"fechou às hh:mm:ss\".",
          "Espere a faixa de resultado: \"Execução confirmada\" quer dizer que o dispositivo informou a mudança.",
          "Se aparecer \"aceito pela API, mas a execução ainda não foi confirmada\", olhe o portão e toque em \"Conferir agora\" na lista de comandos. Se não abriu, trate como não executado."
        ] },
        { titulo: "Destravar a porta da Diretoria (diretores)", itens: [
          "No bloco \"Abrir agora\" (ou no cartão \"Porta da Diretoria\", selo \"Restrito à Diretoria\"), toque em \"Destravar a porta\".",
          "Na janela, confira o nome da porta.",
          "Toque em \"Sim, abrir agora\". Para desistir, toque em \"Cancelar\".",
          "Espere \"Execução confirmada\". A nuvem aceitar não quer dizer porta aberta.",
          "Se o botão não aparece para você, peça ao responsável pelo sistema a permissão \"Acionar\" da porta.",
          "Se o cartão disser \"Não disponível pela API\", o modelo da fechadura não aceita abertura remota pela nuvem: abra pelo aplicativo Smart Life ou na própria porta."
        ] },
        { titulo: "Abrir a porta quando tocam a campainha (fechadura da Porta da Diretoria)", itens: [
          "A fechadura da Porta da Diretoria só aceita abertura remota enquanto a campainha está chamando (cerca de 60 a 90 segundos), como o botão do aplicativo Smart Life.",
          "Deixe a tela Segurança predial (ou o Início) aberta. Quando tocam a campainha, aparece \"Campainha tocou às hh:mm:ss — pedido válido por N s\", com a contagem.",
          "Toque em \"Abrir agora\" e, na janela, em \"Sim, abrir agora\". Para não abrir, toque em \"Recusar\" e em \"Sim, recusar\".",
          "Fora do pedido não há botão: a abertura remota só vale quando tocam a campainha.",
          "Quem pode destravar a porta recebe o aviso \"Pedido de abertura\" no sistema (e no WhatsApp, se estiver liberado no piloto). O aviso pode chegar perto do fim do tempo: com a tela aberta, o pedido aparece em até 3 segundos.",
          "Cada pedido aceita uma resposta só. Se o tempo acabar antes do \"Sim\", o SGO+ explica e nada é enviado."
        ] },
        { titulo: "Abertura automática quando tocam a campainha (quem destrava a porta)", itens: [
          "No bloco da Porta da Diretoria, marque \"Abrir automaticamente quando tocarem a campainha\".",
          "Na janela, leia o aviso e toque em \"Ligar\". A caixa fica marcada e mostra quem ligou e quando.",
          "Com a opção ligada, quando tocarem a campainha o SGO+ abre a porta sozinho em poucos segundos, sem ninguém confirmar. Quem pode destravar recebe o aviso \"Porta aberta automaticamente\".",
          "Se a nuvem não aceitar, chega o aviso \"não abriu sozinha\": se ainda der tempo, toque em \"Abrir agora\".",
          "Para voltar ao jeito de antes, desmarque a caixa: a porta só abre por \"Abrir agora\" durante o pedido.",
          "Ligar e desligar ficam na auditoria; cada abertura automática aparece no registro com a origem \"Abertura automática (campainha)\"."
        ] },
        { titulo: "Abrir e fechar o portão da garagem", itens: [
          "Portão com abrir e fechar mostra dois botões: \"Abrir portão\" e \"Fechar portão\". Os dois pedem a mesma confirmação na janela.",
          "A garagem funciona como no aplicativo Smart Life: o SGO+ manda um pulso ao motor, e o mesmo pulso abre o portão fechado e fecha o aberto. O sensor de posição decide qual botão vale.",
          "\"Abrir portão\" só funciona com o portão fechado, e \"Fechar portão\" só com ele aberto. No caso contrário, o SGO+ recusa e explica, porque um pulso faria o oposto do pedido.",
          "Enquanto o portão está no percurso, um novo toque é recusado com o tempo que falta: um pulso no meio do caminho para o motor. O tempo de percurso fica em \"Administrar\" > \"Tempo de percurso do portão (segundos)\" (padrão 45 s; a garagem leva cerca de 40 s). Cronometre no local e grave.",
          "Logo depois de o sensor mudar (o portão passando por ele), o SGO+ espera 5 segundos antes de mandar outro pulso: nesse instante o sensor oscila e a posição não é confiável.",
          "O portão de pedestre só tem \"Abrir portão\": o pulso solta a fechadura e ele fecha à mão.",
          "O Administrador ou um diretor pode mudar em \"Administrar\" > \"Acionamento\": \"Pulso (só abrir; fecha manualmente)\" ou \"Portão com abrir e fechar\". A tela mostra a sugestão pela leitura do dispositivo.",
          "O fechar vale com a mesma homologação do abrir: portão homologado abre e fecha de verdade."
        ] },
        { titulo: "Ler o estado e ver o histórico", itens: [
          "No cartão do dispositivo, toque em \"Ler estado\" para reler o estado na nuvem agora.",
          "Toque em \"Histórico\" para ver os últimos comandos daquele dispositivo: quem pediu, quando, situação e detalhe.",
          "Toque em \"Fechar\" para recolher o histórico."
        ] },
        { titulo: "Sincronizar com o Smart Life (Administrador e diretores)", itens: [
          "Toque em \"Sincronizar com o Smart Life\".",
          "Espere a faixa com quantos dispositivos foram lidos, quantos são novos e quantos foram atualizados.",
          "Dispositivos novos entram sem unidade e sem localização: toque em \"Administrar\" para preencher.",
          "Fechaduras entram restritas à Diretoria e só os diretores as veem."
        ] },
        { titulo: "Administrar um dispositivo (Administrador e diretores)", itens: [
          "No cartão, toque em \"Administrar\".",
          "Preencha o nome no SGO+, a unidade (do cadastro ou em texto) e a localização.",
          "Deixe \"Ativo no SGO+\" marcado; desmarque para o dispositivo não receber comando.",
          "Só os diretores veem e marcam \"Restrito à Diretoria\".",
          "Toque em \"Gravar\"."
        ] },
        { titulo: "Homologar um dispositivo (diretores, depois do teste presencial)", itens: [
          "Faça o teste presencial com acompanhamento, com a automação ainda em simulação.",
          "No cartão, toque em \"Administrar\" e depois em \"Homologar (depois do teste presencial)\".",
          "Escreva como foi o teste presencial e toque em \"Homologar\".",
          "Com a automação Ligada em Chaves e senhas, os comandos deste dispositivo passam a ser reais.",
          "Para voltar à simulação, toque em \"Retirar a homologação\" com o motivo."
        ] },
        { titulo: "Liberar a porta da Diretoria para outro diretor (responsável pelo sistema)", itens: [
          "Toque na aba \"Permissões\". Os portões não aparecem aqui: são de toda a equipe interna.",
          "Escolha o diretor e a permissão \"Acionar (abrir) e ver\".",
          "Se quiser, informe a data de fim da vigência.",
          "Escreva o motivo e toque em \"Conceder\".",
          "Para tirar, toque em \"Revogar\" na linha da permissão e escreva o motivo.",
          "A porta da Diretoria só é liberada pelo responsável pelo sistema, e só para diretores. Ele próprio não precisa de permissão."
        ] },
        { titulo: "Consultar o registro de rastreabilidade", itens: [
          "Na tela, desça até \"Registro de rastreabilidade\". Os comandos aparecem por dia (\"Hoje\", \"Ontem\", data), com: quando, dispositivo, quem, ação, resultado e origem (celular, computador ou atalho no Início).",
          "O resultado vem numa frase curta com cor: verde \"Aberto — confirmado pelo portão às hh:mm:ss\", amarelo \"Enviado — portão não confirmou\" (com \"Conferir agora\"), vermelho \"Recusado — motivo\" e azul \"Teste — nada enviado\" (portão ainda não homologado ou automação desligada).",
          "Toque numa linha para abrir os \"Detalhes técnicos\" (comando enviado, identificações e resposta da nuvem). Toque de novo para fechar.",
          "Escolha o dispositivo, a pessoa e o período e toque em \"Filtrar\".",
          "Para arquivar, toque em \"Exportar planilha\" (abre no Excel) ou \"Imprimir ou salvar PDF\" (na janela de impressão, escolha \"Salvar como PDF\").",
          "No celular, cada comando aparece num cartão: hora, quem, ação e resultado.",
          "Cada colaborador vê no registro só os próprios comandos. O Administrador e os diretores veem os de todos."
        ] },
        { titulo: "Consultar a auditoria (Administrador e diretores)", itens: [
          "Toque na aba \"Auditoria\".",
          "Cada linha diz em uma frase o que aconteceu (por exemplo, \"O dispositivo confirmou a execução\" ou \"Recusado: aguarde 10 s entre comandos\"). Toque na linha para ver os detalhes técnicos.",
          "Toque em \"Conferir a integridade do registro\". \"Registro íntegro\" quer dizer que nenhuma linha foi alterada ou apagada.",
          "O Administrador que não é diretor não vê os eventos da porta da Diretoria."
        ] }
      ],
      cores: [
        { nome: "Botão verde \"Abrir portão\", azul-escuro \"Fechar portão\" e vermelho \"Destravar a porta\"", significado: "Abrem a janela de confirmação. Só aparecem para quem pode acionar aquele dispositivo." },
        { nome: "Selo grande laranja \"Aberto\"", significado: "O sensor do portão informa que ele está aberto." },
        { nome: "Selo grande verde \"Fechado\"", significado: "O sensor do portão informa que ele está fechado." },
        { nome: "Selo grande azul \"Abrindo…\" ou \"Fechando…\"", significado: "O portão recebeu o comando e está no percurso. Ao chegar, o selo vira \"Aberto\" ou \"Fechado\"." },
        { nome: "Selo \"Posição: sem sensor\"", significado: "O portão não tem sensor de posição (por exemplo, o de pedestre): confira pelo último comando ou no local." },
        { nome: "Selo verde \"Online\"", significado: "A nuvem informa que o dispositivo está ligado à internet." },
        { nome: "Selo vermelho \"Offline\"", significado: "O dispositivo está sem internet: o comando não vai chegar. Confira a energia e a rede sem fio." },
        { nome: "Selo vermelho \"Restrito à Diretoria\"", significado: "Só os diretores veem. Os demais perfis não veem este cartão." },
        { nome: "Selo laranja \"Comando real\"", significado: "A automação está ligada e o dispositivo foi homologado: o comando vai para o dispositivo." },
        { nome: "Selo azul \"Simulação\"", significado: "Nada sai do servidor; o SGO+ só registra o que teria feito." },
        { nome: "Situação \"Execução confirmada\" (verde)", significado: "O dispositivo informou a mudança de estado ou o registro de abertura." },
        { nome: "Situação \"Aceito pela API, sem confirmação\" (laranja)", significado: "A nuvem recebeu o comando, mas o dispositivo não confirmou. Não considere aberto." },
        { nome: "Situação \"Recusado pela API\" ou \"Negado pelo SGO+\" (vermelho)", significado: "O comando não foi executado; o detalhe diz o porquê." }
      ],
      problemas: [
        { situacao: "O item do menu e o atalho \"Portões\" não aparecem", oQueFazer: "Enquanto a automação está em implantação (desligada ou sem portão homologado), só o Administrador e os diretores veem. Depois, aparece para toda a equipe interna: saia e entre de novo no SGO+. Se continuar sem aparecer, avise o Administrador." },
        { situacao: "\"Fechar portão\" não aparece", oQueFazer: "O portão está como \"Pulso (só abrir)\". Se ele fecha pela nuvem no aplicativo Smart Life, o Administrador ou um diretor escolhe \"Portão com abrir e fechar\" em \"Administrar\" > \"Acionamento\"." },
        { situacao: "A abertura automática está ligada e a porta não abriu", oQueFazer: "Veja o aviso \"não abriu sozinha\" e o registro (motivo, por exemplo fechadura sem internet). Se ainda der tempo, toque em \"Abrir agora\". Confira também se a fechadura está homologada: sem homologação, tudo é simulação." },
        { situacao: "Aparece \"Nenhum comando real sai agora\"", oQueFazer: "É esperado até a homologação. O responsável pelo sistema liga em Chaves e senhas > Automação predial (Tuya); um diretor homologa cada dispositivo depois do teste presencial." },
        { situacao: "\"a confirmação na janela não foi feita ou venceu\"", oQueFazer: "A janela vale 60 segundos. Toque de novo no botão e, na janela, em \"Sim, abrir agora\"." },
        { situacao: "A sincronização diz \"código 1106\" ou \"28841105\"", oQueFazer: "No portal da Tuya, confira se a conta do Smart Life está ligada ao projeto e se os serviços estão autorizados (Guia de acesso à Tuya). Depois sincronize de novo." },
        { situacao: "A sincronização diz \"plano (trial) venceu\" (28841002)", oQueFazer: "No portal da Tuya, peça a extensão do período de teste do IoT Core ou assine o plano. Até lá nada funciona pela nuvem." },
        { situacao: "\"intervalo mínimo de 10 s\" ou \"comandos no último minuto\"", oQueFazer: "Aguarde. O SGO+ não repete comando em sequência para proteger o portão e a conta." },
        { situacao: "\"o comando anterior ainda está sem resultado\"", oQueFazer: "Toque em \"Conferir agora\" na lista de últimos comandos; se o portão não abriu, espere o tempo indicado e tente de novo." },
        { situacao: "Fechadura com \"Não disponível pela API\"", oQueFazer: "O modelo não oferece abertura remota pela nuvem. Use o aplicativo Smart Life ou a própria porta." }
      ],
      quemPode: [
        { perfil: "DIRETORIA", pode: "Diretores (perfil Diretoria, vínculo Diretoria ou responsável pelo sistema): ver, abrir e fechar portões, ver a porta da Diretoria, sincronizar, administrar, homologar e consultar todo o registro e toda a auditoria. Destravar a porta e ligar a abertura automática: o responsável pelo sistema por padrão; os outros diretores com a permissão dele." },
        { perfil: "ADMIN", pode: "Ver, abrir e fechar portões, sincronizar, administrar os portões e consultar o registro e a auditoria dos portões. Se não for diretor, não vê a porta da Diretoria." },
        { perfil: "GESTOR,RH,FINANCEIRO,TECNICO,METROLOGIA,COMERCIAL", pode: "Depois da implantação: ver, abrir e fechar os portões (atalho \"Portões\" no celular) e ver no registro os próprios comandos. Não veem a porta da Diretoria. Quem tem o vínculo Diretoria no cadastro é diretor." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela." }
      ],
      perguntas: [
        { p: "A nuvem aceitou; a porta está aberta?", r: "Não necessariamente. Só \"Execução confirmada\" quer dizer que o dispositivo informou a mudança. Se ficou \"aceito, sem confirmação\", olhe o local e use \"Conferir agora\"." },
        { p: "Preciso digitar alguma coisa para abrir?", r: "Não. Toque no botão e, na janela, em \"Sim, abrir agora\". A janela vale 60 segundos e só serve para aquele toque." },
        { p: "Posso abrir pelo celular?", r: "Sim: atalho \"Portões\" no Início do celular, com os botões grandes de abrir e fechar e a posição de cada portão." },
        { p: "A abertura automática abre para qualquer pessoa que tocar a campainha?", r: "Sim, enquanto estiver ligada: a porta abre sem ninguém confirmar. Por isso só quem destrava a porta liga a opção, cada abertura é registrada e avisada. Desmarque quando não quiser esse comportamento." },
        { p: "Onde ficam as senhas da fechadura?", r: "Em lugar nenhum do SGO+. O destravamento usa um bilhete temporário da nuvem, que não é gravado. As credenciais da Tuya ficam em Chaves e senhas, fora de qualquer planilha." },
        { p: "O que acontece se eu tocar duas vezes?", r: "Cada toque gera um identificador de operação. O mesmo identificador nunca é executado duas vezes, e o dispositivo não recebe outro comando antes de 10 s." }
      ],
      secoesManual: [
        { titulo: "Caminho de um comando", paragrafos: [
          "1. Toque no botão: o SGO+ confere permissão, compatibilidade e limites e abre a janela de confirmação (com um código de uso único, válido por 60 segundos, do seu usuário, daquele dispositivo e daquela solicitação).",
          "2. \"Sim, abrir agora\" = solicitado: o SGO+ confere de novo, consome o código e grava a solicitação. Chamada sem passar pela janela é recusada e registrada.",
          "3. Aceito: a nuvem da Tuya respondeu que recebeu o comando (HTTP, código e tid gravados).",
          "4. Execução confirmada: o SGO+ relê o estado do dispositivo (ou os registros de abertura da fechadura) e encontra a mudança. Sem mudança, o comando fica \"aceito, sem confirmação\", a gestão é avisada e \"Conferir agora\" vale por 15 minutos.",
          "Cada passo entra no registro inviolável AUT_AUDITORIA, encadeado por SHA-256."
        ] }
      ]
    }
  };
}
