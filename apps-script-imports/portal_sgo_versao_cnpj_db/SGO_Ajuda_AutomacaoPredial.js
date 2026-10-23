/**
 * Ajuda "Como usar esta tela" — Segurança e automação predial (22/10/2026).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Texto puro, sem HTML.
 * Conferido contra a tela real (JS_AutomacaoPredial.html) e o servidor (SGO_Automacao_Predial.js, SGO_Automacao_Tuya.js).
 * 22/10/2026, decisões do dono: diretor = perfil Diretoria, vínculo de trabalho Diretoria ou responsável pelo sistema;
 *   a porta da Diretoria é do responsável pelo sistema (os outros diretores só com a permissão dele); nada para digitar
 *   (janela "Sim, abrir agora"); botões grandes no topo, atalho "Portões" no celular e botões no Início do computador;
 *   até a homologação, o módulo é só do Administrador e dos diretores.
 */
function SGO_ajudaTelas_AutomacaoPredial_() {
  return {
    "automacao_predial": {
      titulo: "Segurança e automação predial",
      paraQueServe: "Abre os portões da empresa e, para a Diretoria, destrava a porta da Diretoria pelo SGO+, usando a nuvem do aplicativo Smart Life. Cada comando fica registrado com quem pediu, quando, o que a nuvem respondeu e se o dispositivo confirmou.",
      antesDeComecar: [
        "O responsável pelo sistema precisa ter gravado as credenciais da Tuya em Administração > Chaves e senhas > Automação predial (Tuya) e tocado em \"Testar conexão\" (passo a passo no Guia de acesso à Tuya).",
        "Enquanto a automação está Desligada ou nenhum dispositivo foi homologado, a tela é só do Administrador e dos diretores (implantação). Depois aparece também para quem tem permissão.",
        "Diretor, para o SGO+, é quem tem o perfil Diretoria, o vínculo de trabalho Diretoria no cadastro de usuários, ou é o responsável pelo sistema.",
        "Para ver ou abrir um portão você precisa ser Administrador ou diretor, ou ter recebido a permissão \"Ver\" ou \"Acionar\" naquele portão.",
        "A porta da Diretoria só aparece para os diretores. O responsável pelo sistema destrava por padrão; outro diretor só com a permissão \"Acionar\" concedida por ele.",
        "Enquanto o dispositivo não foi homologado pela Diretoria, tudo trabalha em simulação: o SGO+ registra o que teria feito e nada é enviado."
      ],
      passos: [
        { titulo: "Abrir um portão (celular ou computador)", itens: [
          "No celular, toque em \"Portões\" no Início. No computador, use os botões grandes do Início ou toque em \"Segurança e automação predial\" no menu (grupo Segurança predial).",
          "No bloco \"Abrir agora\", confira o estado ao lado do nome: \"Online\" e o último comando.",
          "Toque em \"Abrir portão\".",
          "Na janela, confira o nome do portão.",
          "Toque em \"Sim, abrir agora\". Não há nada para digitar.",
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
        { titulo: "Conceder ou revogar permissão (Administrador e diretores)", itens: [
          "Toque na aba \"Permissões\".",
          "Escolha o usuário, o dispositivo e a permissão: \"Ver estado e histórico\" ou \"Acionar (abrir) e ver\".",
          "Se quiser, informe a data de fim da vigência.",
          "Escreva o motivo e toque em \"Conceder\".",
          "Para tirar, toque em \"Revogar\" na linha da permissão e escreva o motivo.",
          "A porta da Diretoria só é liberada pelo responsável pelo sistema, e só para diretores. Ele próprio não precisa de permissão."
        ] },
        { titulo: "Consultar a auditoria (Administrador e diretores)", itens: [
          "Toque na aba \"Auditoria\".",
          "Leia os eventos: sincronização, comando solicitado, aceito, execução confirmada ou não, negado (sem permissão, sem a confirmação da janela, limite), permissão concedida ou revogada, homologação.",
          "Toque em \"Conferir a integridade do registro\". \"Registro íntegro\" quer dizer que nenhuma linha foi alterada ou apagada.",
          "O Administrador que não é diretor não vê os eventos da porta da Diretoria."
        ] }
      ],
      cores: [
        { nome: "Botão verde \"Abrir portão\" e vermelho \"Destravar a porta\"", significado: "Abrem a janela de confirmação. Só aparecem para quem pode acionar aquele dispositivo." },
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
        { situacao: "O item do menu e o atalho \"Portões\" não aparecem", oQueFazer: "Enquanto a automação está em implantação, só o Administrador e os diretores veem. Depois, só quem tem permissão em algum dispositivo. Peça a permissão ao Administrador ou a um diretor." },
        { situacao: "Aparece \"Nenhum comando real sai agora\"", oQueFazer: "É esperado até a homologação. O responsável pelo sistema liga em Chaves e senhas > Automação predial (Tuya); um diretor homologa cada dispositivo depois do teste presencial." },
        { situacao: "\"a confirmação na janela não foi feita ou venceu\"", oQueFazer: "A janela vale 60 segundos. Toque de novo no botão e, na janela, em \"Sim, abrir agora\"." },
        { situacao: "A sincronização diz \"código 1106\" ou \"28841105\"", oQueFazer: "No portal da Tuya, confira se a conta do Smart Life está ligada ao projeto e se os serviços estão autorizados (Guia de acesso à Tuya). Depois sincronize de novo." },
        { situacao: "A sincronização diz \"plano (trial) venceu\" (28841002)", oQueFazer: "No portal da Tuya, peça a extensão do período de teste do IoT Core ou assine o plano. Até lá nada funciona pela nuvem." },
        { situacao: "\"intervalo mínimo de 10 s\" ou \"comandos no último minuto\"", oQueFazer: "Aguarde. O SGO+ não repete comando em sequência para proteger o portão e a conta." },
        { situacao: "\"o comando anterior ainda está sem resultado\"", oQueFazer: "Toque em \"Conferir agora\" na lista de últimos comandos; se o portão não abriu, espere o tempo indicado e tente de novo." },
        { situacao: "Fechadura com \"Não disponível pela API\"", oQueFazer: "O modelo não oferece abertura remota pela nuvem. Use o aplicativo Smart Life ou a própria porta." }
      ],
      quemPode: [
        { perfil: "DIRETORIA", pode: "Diretores (perfil Diretoria, vínculo Diretoria ou responsável pelo sistema): ver e abrir portões, ver a porta da Diretoria, sincronizar, administrar, homologar, conceder permissões dos portões e consultar toda a auditoria. Destravar a porta: o responsável pelo sistema por padrão; os outros diretores com a permissão dele." },
        { perfil: "ADMIN", pode: "Ver e abrir portões, sincronizar, administrar os portões, conceder permissões dos portões e consultar a auditoria dos portões. Se não for diretor, não vê a porta da Diretoria." },
        { perfil: "GESTOR,RH,FINANCEIRO,TECNICO,METROLOGIA,COMERCIAL", pode: "Depois da implantação, só o que foi concedido por dispositivo: \"Ver\" (estado e histórico) ou \"Acionar\" (abrir e ver), dentro da vigência. Quem tem o vínculo Diretoria no cadastro é diretor." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela." }
      ],
      perguntas: [
        { p: "A nuvem aceitou; a porta está aberta?", r: "Não necessariamente. Só \"Execução confirmada\" quer dizer que o dispositivo informou a mudança. Se ficou \"aceito, sem confirmação\", olhe o local e use \"Conferir agora\"." },
        { p: "Preciso digitar alguma coisa para abrir?", r: "Não. Toque no botão e, na janela, em \"Sim, abrir agora\". A janela vale 60 segundos e só serve para aquele toque." },
        { p: "Posso abrir pelo celular?", r: "Sim: atalho \"Portões\" no Início do celular, com os botões grandes de cada portão que você pode abrir." },
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
