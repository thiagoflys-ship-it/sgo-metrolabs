/**
 * Ajuda "Como usar esta tela" — Segurança e automação predial (22/10/2026).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Texto puro, sem HTML.
 * Conferido contra a tela real (JS_AutomacaoPredial.html) e o servidor (SGO_Automacao_Predial.js, SGO_Automacao_Tuya.js).
 */
function SGO_ajudaTelas_AutomacaoPredial_() {
  return {
    "automacao_predial": {
      titulo: "Segurança e automação predial",
      paraQueServe: "Abre os portões da empresa e, para a Diretoria, solicita o destravamento da porta da Diretoria pelo SGO+, usando a nuvem do aplicativo Smart Life. Cada comando fica registrado com quem pediu, quando, o que a nuvem respondeu e se o dispositivo confirmou.",
      antesDeComecar: [
        "O responsável pelo sistema precisa ter gravado as credenciais da Tuya em Administração > Chaves e senhas > Automação predial (Tuya) e clicado em \"Testar conexão\".",
        "Os dispositivos aparecem depois que o Administrador ou a Diretoria clica em \"Sincronizar com o Smart Life\".",
        "Para ver ou abrir um portão você precisa ser Administrador ou Diretoria, ou ter recebido a permissão \"Ver\" ou \"Acionar\" naquele dispositivo.",
        "A porta da Diretoria só aparece para o perfil Diretoria e só é destravada por diretor com a permissão \"Acionar\".",
        "Enquanto a automação está Desligada em Chaves e senhas ou o dispositivo não foi homologado pela Diretoria, tudo trabalha em simulação: o SGO+ registra o que teria feito e nada é enviado."
      ],
      passos: [
        { titulo: "Abrir um portão", itens: [
          "Toque em \"Segurança e automação predial\" no menu (grupo Segurança predial).",
          "Encontre o cartão do portão na unidade dele.",
          "Confira a situação: \"Online\" e o estado lido.",
          "Toque em \"Abrir portão\".",
          "Leia a janela: ela diz se o comando é real ou simulação.",
          "Toque em \"Abrir agora\".",
          "Espere a faixa de resultado: \"Execução confirmada\" quer dizer que o dispositivo informou a mudança.",
          "Se aparecer \"aceito pela API, mas a execução ainda não foi confirmada\", olhe o portão e toque em \"Conferir agora\" alguns segundos depois. Se não abriu, trate como não executado."
        ] },
        { titulo: "Solicitar o destravamento da porta da Diretoria (só Diretoria)", itens: [
          "Toque em \"Segurança e automação predial\" no menu.",
          "No cartão \"Porta da Diretoria\" (selo \"Restrito à Diretoria\"), toque em \"Solicitar destravamento\".",
          "Digite ABRIR na caixa de confirmação.",
          "Toque em \"Confirmar o destravamento\".",
          "Espere a faixa de resultado. A nuvem aceitar não quer dizer porta aberta: espere \"Execução confirmada\".",
          "Se o cartão disser \"Não disponível pela API\", o modelo da fechadura não aceita abertura remota pela nuvem: abra pelo aplicativo Smart Life ou na própria porta."
        ] },
        { titulo: "Ler o estado e ver o histórico", itens: [
          "No cartão do dispositivo, toque em \"Ler estado\" para reler o estado na nuvem agora.",
          "Toque em \"Histórico\" para ver os últimos comandos daquele dispositivo: quem pediu, quando, situação e detalhe.",
          "Toque em \"Fechar\" para recolher o histórico."
        ] },
        { titulo: "Sincronizar com o Smart Life (Administrador e Diretoria)", itens: [
          "Toque em \"Sincronizar com o Smart Life\".",
          "Espere a faixa com quantos dispositivos foram lidos, quantos são novos e quantos foram atualizados.",
          "Dispositivos novos entram sem unidade e sem localização: toque em \"Administrar\" para preencher.",
          "Fechaduras entram restritas à Diretoria e só a Diretoria as vê."
        ] },
        { titulo: "Administrar um dispositivo (Administrador e Diretoria)", itens: [
          "No cartão, toque em \"Administrar\".",
          "Preencha o nome no SGO+, a unidade (do cadastro ou em texto) e a localização.",
          "Deixe \"Ativo no SGO+\" marcado; desmarque para o dispositivo não receber comando.",
          "Só a Diretoria vê e marca \"Restrito à Diretoria\".",
          "Toque em \"Gravar\"."
        ] },
        { titulo: "Homologar um dispositivo (só Diretoria, depois do teste presencial)", itens: [
          "Faça o teste presencial com acompanhamento, com a automação ainda em simulação.",
          "No cartão, toque em \"Administrar\" e depois em \"Homologar (depois do teste presencial)\".",
          "Escreva como foi o teste presencial.",
          "Digite HOMOLOGAR e toque em \"Homologar\".",
          "Com a automação Ligada em Chaves e senhas, os comandos deste dispositivo passam a ser reais.",
          "Para voltar à simulação, toque em \"Retirar a homologação\" com o motivo."
        ] },
        { titulo: "Conceder ou revogar permissão (Administrador e Diretoria)", itens: [
          "Toque na aba \"Permissões\".",
          "Escolha o usuário, o dispositivo e a permissão: \"Ver estado e histórico\" ou \"Acionar (abrir) e ver\".",
          "Se quiser, informe a data de fim da vigência.",
          "Escreva o motivo e toque em \"Conceder\".",
          "Para tirar, toque em \"Revogar\" na linha da permissão e escreva o motivo.",
          "A porta da Diretoria só é liberada por um diretor, para usuários do perfil Diretoria."
        ] },
        { titulo: "Consultar a auditoria (Administrador e Diretoria)", itens: [
          "Toque na aba \"Auditoria\".",
          "Leia os eventos: sincronização, comando solicitado, aceito, execução confirmada ou não, negado, permissão concedida ou revogada, homologação.",
          "Toque em \"Conferir a integridade do registro\" para o SGO+ conferir a corrente de resumos. \"Registro íntegro\" quer dizer que nenhuma linha foi alterada ou apagada.",
          "O Administrador não vê os eventos da porta da Diretoria; só a Diretoria."
        ] }
      ],
      cores: [
        { nome: "Selo verde \"Online\"", significado: "A nuvem informa que o dispositivo está ligado à internet." },
        { nome: "Selo vermelho \"Offline\"", significado: "O dispositivo está sem internet: o comando não vai chegar. Confira a energia e a rede sem fio." },
        { nome: "Selo vermelho \"Restrito à Diretoria\"", significado: "Só a Diretoria vê e aciona. Os demais perfis não veem este cartão." },
        { nome: "Selo laranja \"Comando real\"", significado: "A automação está ligada e o dispositivo foi homologado: o comando vai para o dispositivo." },
        { nome: "Selo azul \"Simulação\"", significado: "Nada sai do servidor; o SGO+ só registra o que teria feito." },
        { nome: "Situação \"Execução confirmada\" (verde)", significado: "O dispositivo informou a mudança de estado ou o registro de abertura." },
        { nome: "Situação \"Aceito pela API, sem confirmação\" (laranja)", significado: "A nuvem recebeu o comando, mas o dispositivo não confirmou. Não considere aberto." },
        { nome: "Situação \"Recusado pela API\" ou \"Negado pelo SGO+\" (vermelho)", significado: "O comando não foi executado; o detalhe diz o porquê." }
      ],
      problemas: [
        { situacao: "Aparece \"Nenhum comando real sai agora\"", oQueFazer: "É esperado até a homologação. O responsável pelo sistema liga em Chaves e senhas > Automação predial (Tuya); a Diretoria homologa cada dispositivo depois do teste presencial." },
        { situacao: "\"Nenhum dispositivo liberado para você\"", oQueFazer: "Peça ao Administrador ou à Diretoria a permissão em Permissões. Se você é Administrador, clique em \"Sincronizar com o Smart Life\"." },
        { situacao: "A sincronização diz \"código 1106\" ou \"28841105\"", oQueFazer: "No portal da Tuya, confira se a conta do Smart Life está ligada ao projeto (Devices > Link Tuya App Account) e se os serviços estão autorizados (Service API). Depois sincronize de novo." },
        { situacao: "A sincronização diz \"plano (trial) venceu\" (28841002)", oQueFazer: "No portal da Tuya, Cloud > My Services > IoT Core, peça a extensão do período de teste ou assine o plano. Até lá nada funciona pela nuvem." },
        { situacao: "\"intervalo mínimo de 10 s\" ou \"comandos no último minuto\"", oQueFazer: "Aguarde. O SGO+ não repete comando em sequência para proteger o portão e a conta." },
        { situacao: "\"o comando anterior ainda está sem resultado\"", oQueFazer: "Toque em \"Conferir agora\" na lista de últimos comandos; se o portão não abriu, espere o tempo indicado e tente de novo." },
        { situacao: "Fechadura com \"Não disponível pela API\"", oQueFazer: "O modelo não oferece abertura remota pela nuvem. Use o aplicativo Smart Life ou a própria porta. O SGO+ continua mostrando o estado e os registros quando a API os fornece." }
      ],
      quemPode: [
        { perfil: "DIRETORIA", pode: "Tudo: ver e abrir portões, ver a porta da Diretoria e solicitar o destravamento (com a permissão \"Acionar\"), sincronizar, administrar, homologar, conceder permissões (inclusive da porta) e consultar toda a auditoria." },
        { perfil: "ADMIN", pode: "Ver e abrir portões, sincronizar, administrar os portões, conceder permissões dos portões e consultar a auditoria dos portões. Não vê a porta da Diretoria." },
        { perfil: "GESTOR,RH,FINANCEIRO,TECNICO,METROLOGIA,COMERCIAL", pode: "Só o que foi concedido por dispositivo: \"Ver\" (estado e histórico) ou \"Acionar\" (abrir e ver), dentro da vigência." },
        { perfil: "CLIENTE", pode: "Não acessa esta tela." }
      ],
      perguntas: [
        { p: "A nuvem aceitou; a porta está aberta?", r: "Não necessariamente. Só \"Execução confirmada\" quer dizer que o dispositivo informou a mudança. Se ficou \"aceito, sem confirmação\", olhe o local e use \"Conferir agora\"." },
        { p: "Posso abrir pelo celular?", r: "Sim, a tela funciona no celular pelo menu do SGO+ (atalho \"Segurança predial\" no Início do celular)." },
        { p: "Onde ficam as senhas da fechadura?", r: "Em lugar nenhum do SGO+. O destravamento usa um bilhete temporário da nuvem, que não é gravado. As credenciais da Tuya ficam em Chaves e senhas, fora de qualquer planilha." },
        { p: "O que acontece se eu clicar duas vezes?", r: "Cada clique gera um identificador de operação. O mesmo identificador nunca é executado duas vezes, e o dispositivo não recebe outro comando antes de 10 s." }
      ],
      secoesManual: [
        { titulo: "Caminho de um comando", paragrafos: [
          "1. Solicitado: o SGO+ confere a sessão, a permissão, a confirmação adicional (fechadura), a compatibilidade e os limites, e grava a solicitação com o identificador da operação.",
          "2. Aceito: a nuvem da Tuya respondeu que recebeu o comando (HTTP, código e tid gravados).",
          "3. Execução confirmada: o SGO+ relê o estado do dispositivo (ou os registros de abertura da fechadura) e encontra a mudança. Sem mudança, o comando fica \"aceito, sem confirmação\", a gestão é avisada e \"Conferir agora\" vale por 15 minutos.",
          "Cada passo entra no registro inviolável AUT_AUDITORIA, encadeado por SHA-256."
        ] }
      ]
    }
  };
}
