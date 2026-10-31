/**
 * Ajuda "Como usar esta tela" — grupo Qualidade (frente C).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Texto puro, sem HTML.
 * Conferido contra a tela real (SGO_Qualidade_ConteudoModulo.js) em 17/10/2026.
 */
function SGO_ajudaTelas_Qualidade_() {
  return {
    "qualidade": {
      titulo: "Painel de qualidade",
      paraQueServe: "Mostra à gestão como estão os registros de campo: atendimentos do Auvo e uso da Frota. Aponta o que precisa ser corrigido e permite cobrar ou parabenizar a pessoa.",
      antesDeComecar: [
        "Esta tela é da gestão: Administrador, Gestor e Diretoria.",
        "Os atendimentos chegam pela sincronização do Auvo (Integração Auvo). Se ela estiver desligada, o quadro do Auvo fica vazio.",
        "As retiradas e devoluções vêm da Frota.",
        "Para a cobrança chegar até a pessoa, ela precisa ter login no SGO+. O condutor precisa estar ligado a um login na Frota."
      ],
      passos: [
        { titulo: "Ver o resumo", itens: [
          "Toque em \"Painel de qualidade\" no menu.",
          "Escolha o período: \"Últimos 7 dias\", \"Últimos 30 dias\" ou \"Últimos 90 dias\".",
          "Leia o quadro \"Itens que exigem ação\". É o mesmo número de pendências do Início e não muda com o período.",
          "Leia o que fazer em cada grupo da lista.",
          "Para ler os números de novo, toque em \"Atualizar\"."
        ] },
        { titulo: "Cobrar uma pessoa", itens: [
          "Nas listas \"Registros incompletos por técnico\" ou \"Condutores com mais retiradas\", toque em \"Cobrar\".",
          "Confira o \"Tipo\": \"Cobrança\".",
          "Escreva a \"Descrição\": o que foi visto e o que se espera daqui em diante.",
          "Toque em \"Salvar\".",
          "A pessoa vê a cobrança na janela \"Avisos\" ao entrar no SGO+."
        ] },
        { titulo: "Parabenizar uma pessoa", itens: [
          "Nas listas \"Atendimentos 100% completos\" ou \"Condutores sem cobranças\", toque em \"Parabenizar\".",
          "Confira o \"Tipo\": \"Elogio\".",
          "Escreva a \"Descrição\".",
          "Toque em \"Salvar\"."
        ] },
        { titulo: "Ver e encerrar cobranças", itens: [
          "Toque em \"Histórico de cobranças e elogios\".",
          "Escolha \"Todas\", \"Abertas\" ou \"Resolvidas\".",
          "Quando o problema foi resolvido, toque em \"Marcar resolvida\".",
          "Toque em \"Fechar\"."
        ] },
        { titulo: "Gerar o relatório A4", itens: [
          "Escolha o período.",
          "Toque em \"Gerar relatório A4\".",
          "Aguarde até 1 minuto. O relatório abre numa aba nova. Não feche a aba antes de terminar.",
          "Uma cópia (PDF e HTML) fica guardada na pasta \"Painel de qualidade - Relatórios\". O link para o PDF aparece no topo do relatório."
        ] },
        { titulo: "Abrir uma O.S. com pendência", itens: [
          "Em \"Pendências identificadas por O.S.\", leia o motivo.",
          "Toque em \"Abrir O.S.\"."
        ] }
      ],
      cores: [
        { nome: "Número verde", significado: "Bom. Nada a fazer." },
        { nome: "Número amarelo", significado: "Atenção. Vale olhar." },
        { nome: "Número vermelho", significado: "Crítico. Corrija ou cobre. Exemplo: 30% ou mais dos atendimentos sem relato ou sem foto." },
        { nome: "\"Itens que exigem ação\" em vermelho ou verde", significado: "Vermelho: há pendência aberta. Verde: nenhuma." },
        { nome: "\"OK integrações respondendo\" em verde", significado: "Auvo e Frota foram lidos agora." },
        { nome: "Aviso vermelho \"integração com falha\" ou amarelo \"Auvo: conexão não configurada\"", significado: "Uma área não foi lida. Toque em \"Atualizar\". Se continuar, avise o administrador." },
        { nome: "Selo amarelo \"cobrança(s) aberta(s)\"", significado: "A pessoa já tem cobranças sem resolver." },
        { nome: "Selo vermelho \"COBRANCA\", verde \"ELOGIO\", azul \"OBSERVACAO\" (histórico)", significado: "Tipo do registro." },
        { nome: "Selo amarelo \"ABERTA\" e verde \"RESOLVIDA\" (histórico)", significado: "Aberta: ainda não resolvida. Resolvida: a gestão encerrou." },
        { nome: "Consumo em amarelo", significado: "Veículo gastando bem mais que a média da frota." }
      ],
      problemas: [
        { situacao: "\"Nenhum atendimento do Auvo no período.\"", oQueFazer: "Abra \"Integração Auvo\" e ligue a sincronização automática ou toque em \"Sincronizar agora\"." },
        { situacao: "\"Nenhuma retirada ou devolução no período.\"", oQueFazer: "Troque o período no topo. As retiradas são feitas na Frota." },
        { situacao: "\"Descreva o motivo antes de salvar.\"", oQueFazer: "Escreva a descrição e toque em \"Salvar\"." },
        { situacao: "\"não tem login do SGO+ ligado a este cadastro\"", oQueFazer: "A cobrança foi salva, mas a pessoa não vai ver o aviso. Comunique pessoalmente, ou ligue o condutor a um usuário na Frota." },
        { situacao: "\"Esta ação já está sendo processada.\"", oQueFazer: "Espere terminar. Não toque de novo." },
        { situacao: "\"Não foi possível carregar o painel.\"", oQueFazer: "Toque em \"Atualizar\". Se continuar, avise o administrador." },
        { situacao: "Faixa amarela no topo: \"a análise saiu com o texto padrão\"", oQueFazer: "A chave da IA não está gravada ou falhou. A interpretação saiu com o texto padrão, montado com os mesmos números, e os números estão certos. Peça ao administrador para conferir a chave em \"Chaves e senhas\" e gere de novo." },
        { situacao: "\"a cópia (PDF e HTML) não foi gravada na pasta\"", oQueFazer: "O relatório abriu, mas não foi guardado. Use \"Imprimir ou salvar em PDF\" no topo e avise o administrador se repetir." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA", pode: "Usar o painel, cobrar, parabenizar, ver o histórico, marcar resolvida e gerar o relatório." },
        { perfil: "TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Não usam o painel. Recebem as cobranças e os elogios na janela \"Avisos\" ao entrar e tocam em \"Estou ciente\"." },
        { perfil: "CLIENTE", pode: "Não usa esta tela." }
      ],
      perguntas: [
        { p: "Por que o número de \"Itens que exigem ação\" não muda quando troco o período?", r: "Ele mostra o que está aberto agora, igual ao Início. O período vale para os rankings e as porcentagens." },
        { p: "\"Estou ciente\" resolve a cobrança?", r: "Não. \"Estou ciente\" só registra que a pessoa leu. Quem marca como resolvida é a gestão, no histórico." },
        { p: "A IA vê o nome das pessoas?", r: "Não. A IA só escreve a interpretação com os números. Nomes e valores vêm do sistema." }
      ]
    },

    "qualidade/avisos_ao_entrar": {
      titulo: "Janela \"Avisos\" ao entrar (para toda a equipe)",
      paraQueServe: "Ao entrar no SGO+, a pessoa vê o resumo das pendências críticas, as cobranças da gestão que ainda não confirmou e os elogios recentes. As pendências aparecem em um cartão por grupo: o que é, por que importa, o que fazer e o botão que leva à tela certa.",
      passos: [
        { titulo: "Ler o topo da janela", itens: [
          "Abaixo de \"Avisos\" aparece o total. Exemplo: \"89 pendências críticas · 7 grupos\".",
          "Se houver, aparecem também quantas cobranças da gestão e quantos reconhecimentos existem."
        ] },
        { titulo: "Ler os cartões de \"Pendências críticas\"", itens: [
          "Cada cartão é um grupo de pendências do mesmo tipo. Exemplo: \"76 padrões de referência vencidos\".",
          "No alto do cartão ficam o módulo (Padrões de referência, Frota, Assistência técnica...) e a etiqueta de gravidade.",
          "Logo abaixo do título aparecem até 3 exemplos (placa, código, nome) e \"e mais N\" quando há outros.",
          "\"Por quê\" explica o motivo quando o grupo tem uma pendência só ou quando só parte dele é crítica.",
          "\"O que fazer\" diz o próximo passo.",
          "Primeiro vêm as pendências que são suas, depois as de prazo estourado, depois as demais.",
          "A janela mostra os 5 primeiros grupos. Os outros estão em \"Ver todas as pendências\"."
        ] },
        { titulo: "Resolver uma pendência", itens: [
          "Toque em \"Abrir\" no cartão. A janela fecha e o SGO+ abre a tela que resolve (exemplo: Padrões de referência, Frota, o chamado da Assistência técnica).",
          "Quando o grupo não tem tela própria, o botão se chama \"Ver a lista\" e abre a lista do Início só com aquele grupo.",
          "Para ver tudo, uma pendência por linha, toque em \"Ver todas as pendências\". Abre a mesma lista do Início."
        ] },
        { titulo: "\"Estou ciente\" do resumo de pendências", itens: [
          "O botão fica fixo no rodapé da janela, também no celular.",
          "Ele só esconde este resumo por 20 horas. Não resolve nenhuma pendência: elas continuam no Início até serem tratadas na tela de cada uma.",
          "Se aparecer uma pendência crítica nova, o resumo volta a aparecer no próximo acesso, mesmo dentro das 20 horas."
        ] },
        { titulo: "Confirmar que leu uma cobrança da gestão", itens: [
          "Leia a cobrança em \"Cobranças da gestão\" (ou em \"Pendências que precisam da sua atenção\", quando não há resumo de pendências).",
          "Toque em \"Estou ciente\" ao lado da cobrança.",
          "Corrija o que foi pedido.",
          "Toque em \"Fechar\" quando terminar."
        ] }
      ],
      cores: [
        { nome: "Faixa e etiqueta vermelhas \"Crítica\"", significado: "Vencida, vence hoje ou bloqueia o trabalho. Trate primeiro." },
        { nome: "Etiqueta vermelha \"Prazo estourado\"", significado: "O prazo já passou. Fica no topo da lista." },
        { nome: "Etiqueta cinza ao lado (ex.: \"Bloqueia emissão\", \"Uso sem registro\")", significado: "O motivo resumido do grupo." },
        { nome: "Quadro verde em \"Reconhecimento\"", significado: "Elogio da gestão. Não pede nenhuma ação." }
      ],
      problemas: [
        { situacao: "\"Não foi possível registrar a ciência.\"", oQueFazer: "Confira a internet e toque em \"Estou ciente\" de novo." },
        { situacao: "Toquei em \"Ver todas as pendências\" e a lista demorou a abrir", oQueFazer: "O SGO+ abre o Início e espera a lista carregar. Se não abrir, toque em \"Ver todas as pendências\" no próprio Início." },
        { situacao: "Fechei a janela sem querer", oQueFazer: "As mesmas pendências estão no Início, em \"Prioridades do dia\" e em \"Ver todas as pendências\"." }
      ],
      quemPode: [
        { perfil: "TODOS", pode: "Ver os próprios avisos, abrir a tela de cada pendência e tocar em \"Estou ciente\"." }
      ]
    }
  };
}
