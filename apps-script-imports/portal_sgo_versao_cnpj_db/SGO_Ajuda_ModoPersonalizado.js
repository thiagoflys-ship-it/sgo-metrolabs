/****************************************************
 * AJUDA "COMO USAR ESTA TELA" — MODO PERSONALIZADO (21/10/2026)
 * Contrato: docs/AJUDA_CONTRATO_20261017.md
 * Tela: Modo personalizado (modo_personalizado). Texto conferido com
 * JS_ModoPersonalizado.html e SGO_ModoPersonalizado.js. Texto puro, sem HTML.
 * Só aparece para o responsável técnico designado e para o Administrador
 * (SGO_Ajuda.js > SGO_Ajuda_modoPersonalizadoLiberado_). Manual completo:
 * docs/MANUAL_MODO_PERSONALIZADO.md.
 ****************************************************/
function SGO_ajudaTelas_ModoPersonalizado_() {
  return {
    "modo_personalizado": {
      titulo: "Modo personalizado",
      paraQueServe: "Ajusta, com justificativa, os parâmetros dos geradores de documentos técnicos que têm referência normativa (hoje: mínimo de sensores, duração mínima da distribuição e intervalo máximo de registro da estufa, do banho-maria e da secadora). Mostra o que está diferente da referência, restaura o padrão, lista os documentos com parâmetros personalizados para aprovar e guarda o registro de auditoria de tudo.",
      antesDeComecar: [
        "Só os responsáveis técnicos designados pelo Administrador entram no modo personalizado (Administração > Configurações > Responsáveis técnicos do modo personalizado). Os perfis habilitados são Administrador, Diretoria, Gestor e Metrologia.",
        "Além de estar na lista, você entra com a sua senha do modo personalizado, criada por você e diferente da senha de entrada no SGO+. Ela é guardada só em forma de resumo: ninguém consegue ler a senha, nem o Administrador.",
        "Cinco senhas erradas seguidas bloqueiam a entrada por 15 minutos. O modo fecha sozinho depois de 30 minutos sem uso e quando você sai do SGO+.",
        "Cada parâmetro tem uma faixa permitida, definida na configuração do sistema. Valor fora da faixa é recusado.",
        "Todo ajuste precisa de justificativa de pelo menos 20 caracteres. Ela sai no documento e na auditoria."
      ],
      passos: [
        {
          titulo: "Criar a senha (primeira vez)",
          itens: [
            "Abra Qualificação e inspeção > Modo personalizado.",
            "No quadro \"Criar minha senha do modo personalizado\", digite a senha em \"Senha nova\" e de novo em \"Confirme a senha\": pelo menos 8 caracteres, com letras e números, sem o seu nome.",
            "Toque em \"Criar minha senha\". O modo abre na hora."
          ]
        },
        {
          titulo: "Entrar e sair",
          itens: [
            "Digite a senha em \"Senha do modo personalizado\" e toque em \"Entrar\".",
            "Com o modo aberto, o quadro mostra \"Modo aberto\" e a hora em que ele fecha se não houver uso. Cada ação renova o prazo.",
            "Ao terminar, toque em \"Sair do modo\".",
            "Para trocar a senha, toque em \"Trocar minha senha\", digite a atual, a nova e a confirmação e toque em \"Gravar a senha nova\"."
          ]
        },
        {
          titulo: "Ajustar um parâmetro",
          itens: [
            "Na aba \"Parâmetros\", escolha o gerador, o equipamento e em \"Vale para\" escolha \"Todos os clientes\" ou \"Um cliente (buscar)...\" e toque no cliente.",
            "A tabela mostra, lado a lado, a referência normativa (com a fonte) e o valor em uso, a faixa permitida e a situação.",
            "Toque em \"Ajustar\", digite o valor novo, escreva a justificativa e toque em \"Gravar ajuste\".",
            "O ajuste de um cliente tem prioridade sobre o de todos os clientes. A partir dele, os documentos daquele equipamento saem com a seção \"Parâmetros personalizados\"."
          ]
        },
        {
          titulo: "Restaurar o padrão",
          itens: [
            "Na linha do parâmetro, toque em \"Restaurar o padrão\", escreva o motivo e confirme. Para voltar tudo do escopo escolhido, use \"Restaurar todos os ajustes deste escopo\".",
            "Documento enviado para aprovação antes da restauração não é emitido com o valor antigo: a emissão pede para gerar o rascunho de novo."
          ]
        },
        {
          titulo: "Ver o que está diferente da referência",
          itens: [
            "Na aba \"Diferenças do padrão\" ficam todos os parâmetros personalizados de todos os geradores, com a referência, o valor em uso, a diferença, a justificativa e quem ajustou.",
            "Ajuste que ficou fora da faixa permitida atual aparece em vermelho e não é aplicado. Toque em \"Abrir para ajustar ou restaurar\"."
          ]
        },
        {
          titulo: "Aprovar documentos com parâmetros personalizados",
          itens: [
            "Na aba \"Aprovações\" ficam os documentos enviados pelo técnico que usam parâmetros personalizados.",
            "Toque em \"Abrir no gerador para conferir e aprovar\": no gerador, abra \"Aguardando aprovação\", confira a prévia (seção \"Parâmetros personalizados\") e aprove com o modo aberto.",
            "Sem o modo aberto, a emissão é recusada com a explicação. Entre no modo e aprove de novo: o documento continua aguardando."
          ]
        },
        {
          titulo: "Consultar a auditoria",
          itens: [
            "Na aba \"Auditoria\", filtre por período, ação ou texto (pessoa, parâmetro, cliente) e toque em \"Mostrar\".",
            "Cada linha diz quem, quando, a ação, onde, de quanto para quanto e o motivo. Senhas nunca são registradas.",
            "Toque em \"Conferir integridade\": o sistema confere se alguma linha foi alterada ou apagada."
          ]
        }
      ],
      cores: [
        { nome: "Verde (Referência normativa)", significado: "O parâmetro está no valor da norma ou da referência indicada." },
        { nome: "Amarelo (Ajuste deste cliente ou para todos os clientes)", significado: "O parâmetro está personalizado; a justificativa e o responsável aparecem embaixo." },
        { nome: "Vermelho", significado: "Bloqueio de entrada, ajuste fora da faixa permitida ou registro de auditoria alterado." }
      ],
      problemas: [
        { situacao: "\"O modo personalizado está fechado\"", oQueFazer: "Passaram 30 minutos sem uso ou você saiu do SGO+. Entre de novo com a sua senha nesta tela. Nada foi alterado." },
        { situacao: "\"Entrada bloqueada até hh:mm\"", oQueFazer: "Foram 5 senhas erradas seguidas. Aguarde o horário ou peça ao Administrador para desbloquear em Configurações > Responsáveis técnicos do modo personalizado." },
        { situacao: "Esqueci a senha do modo personalizado", oQueFazer: "Toque em \"Esqueci a senha do modo personalizado\" nesta tela: o link vai para o seu e-mail e vale 30 minutos. Ao abrir o link, a senha antiga é apagada; volte a esta tela e crie outra. O Administrador também pode enviar o link (\"Enviar link de senha nova\"). Sem e-mail cadastrado, peça ao Administrador para apagar a senha (\"Apagar a senha agora\")." },
        { situacao: "O link do e-mail diz \"Este link venceu\" ou \"não vale mais\"", oQueFazer: "O link vale 30 minutos e uma vez só, e pedir outro cancela o anterior. Peça outro link nesta tela." },
        { situacao: "\"Valor fora da faixa permitida\"", oQueFazer: "A faixa é definida na configuração do sistema. Escolha um valor dentro dela; se o protocolo do cliente pedir outro, fale com o Administrador." },
        { situacao: "A emissão do documento foi recusada por causa dos parâmetros personalizados", oQueFazer: "Entre no modo personalizado nesta tela e, na mesma sessão, aprove o documento em \"Aguardando aprovação\" do gerador." },
        { situacao: "\"Os dados ou os critérios mudaram desde o rascunho\"", oQueFazer: "O parâmetro foi ajustado ou restaurado depois do envio. Devolva ao técnico para gerar o rascunho de novo." }
      ],
      quemPode: [
        { perfil: "ADMIN, DIRETORIA, GESTOR, METROLOGIA", pode: "Quando designado responsável técnico e com a própria senha: ajustar e restaurar parâmetros, ver as diferenças do padrão, aprovar documentos com parâmetros personalizados e consultar a auditoria." },
        { perfil: "ADMIN", pode: "Designar e retirar os responsáveis técnicos do modo personalizado, enviar o link de senha nova a quem esqueceu (ou apagar a senha de quem não tem e-mail), desbloquear e consultar a auditoria." }
      ],
      perguntas: [
        { p: "O Administrador consegue ver a minha senha do modo personalizado?", r: "Não. A senha é guardada só em forma de resumo com sal. Quem esqueceu pede um link no próprio e-mail (ou o Administrador envia); ao abrir o link, a senha é apagada e você cria outra." },
        { p: "O ajuste muda documentos já emitidos?", r: "Não. Vale para os documentos gerados depois dele. Os emitidos continuam como estão." },
        { p: "O que o cliente vê no documento?", r: "A seção \"Parâmetros personalizados\", com o parâmetro, o valor de referência e a fonte, o valor usado, a justificativa, quem definiu e quem aprovou a emissão." },
        { p: "O técnico pode emitir sozinho um documento com parâmetro personalizado?", r: "Não. Ele envia para aprovação; só um responsável técnico com o modo aberto emite." }
      ],
      secoesManual: [
        { titulo: "Por que o modo personalizado existe", paragrafos: [
          "Alguns clientes têm protocolo próprio, acordado com a empresa executante, que pede um valor diferente do da referência normativa (por exemplo, menos sensores em um equipamento pequeno ou uma duração definida pelo setor de qualidade do cliente). O modo personalizado permite usar esse valor sem esconder nada: o documento mostra a referência, o valor usado e a justificativa, e a emissão passa pelo responsável técnico.",
          "A senha única antiga do modo personalizado, guardada em texto, foi apagada em 21/10/2026. Cada responsável técnico tem a própria senha."
        ] }
      ]
    }
  };
}
