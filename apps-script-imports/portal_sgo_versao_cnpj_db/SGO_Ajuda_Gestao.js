/**
 * SGO_Ajuda_Gestao.js — ajuda "Como usar esta tela" da Caixa de decisões e do Desempenho da gestão (20/10/2026).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Telas: JS_Gestao.html. Regras: SGO_Gestao_Decisoes.js, SGO_Gestao_Escada.js, SGO_Gestao_Avaliacao.js.
 */
function SGO_ajudaTelas_Gestao_() {
  return {
    'gestao_decisoes': {
      titulo: 'Caixa de decisões',
      paraQueServe: 'Junta numa lista só tudo o que depende de um gestor ou da Diretoria, venha do módulo que vier: homologar e julgar ocorrências, aprovar missões, decidir sugestões, conferir KM, multas, CNH, manutenção, reservas, comprovantes, casos e planos de ação atrasados, atividades atrasadas da equipe, justificativas de atraso, padrões e O.S. do Auvo. Cada item diz quem decide, o prazo, há quanto tempo está parado e leva à tela de resolver. Você não precisa abrir módulo por módulo para saber o que espera por você.',
      antesDeComecar: [
        'A caixa é da gestão: perfis Administrador, Diretoria e Gestor. RH e Financeiro também abrem, com os itens das áreas em que são responsáveis.',
        'Quem recebe cada item depende do gestor responsável por área, definido pelo Administrador ou pela Diretoria em "Regras e responsáveis". Área sem responsável vai para a reserva da Diretoria.',
        'A área de cada pessoa vem do cadastro (Administração > Usuários > Áreas).'
      ],
      passos: [
        { titulo: 'Ver o que espera por você', itens: ['Toque em "Caixa de decisões" no menu (grupo Gestão).', 'A aba "Para mim" mostra só o que é seu, do mais urgente para o menos urgente.', 'Leia o título, o "O que fazer" e o prazo de decisão.'] },
        { titulo: 'Resolver um item', itens: ['Toque em "Abrir a tela de resolver".', 'Faça a decisão na tela do módulo (por exemplo, homologar a ocorrência ou conferir o KM).', 'Volte à caixa e toque em "Atualizar": o item resolvido sai sozinho.'] },
        { titulo: 'Registrar providência (quando a solução depende de terceiros)', itens: ['Toque em "Registrar providência" no item.', 'Escreva o que foi feito, por exemplo "Oficina agendada para quinta".', 'Escolha até quando acompanhar (no máximo 10 dias).', 'Toque em "Registrar". A cobrança fica pausada até a data; o item continua na caixa até ser resolvido.'] },
        { titulo: 'Avaliar uma justificativa de atraso', itens: ['No item "Avaliar a justificativa de atraso", leia o motivo e a nova previsão.', 'Se concorda, toque em "Ciente", escreva a sua avaliação e toque em "Confirmar ciente".', 'Se não concorda, fale com a pessoa ou replaneje a atividade em Atividades da equipe e depois registre a providência.'] },
        { titulo: 'Configurar os responsáveis e a escada (Administrador e Diretoria)', itens: ['Toque em "Regras e responsáveis".', 'Em cada área, marque quem é o gestor responsável.', 'Confira a área de cada módulo (usada quando o item não é de uma pessoa).', 'Ajuste a escada (hora do e-mail, dias úteis para o WhatsApp e para a Diretoria) e as automações.', 'Toque em "Salvar regras".'] }
      ],
      cores: [
        { nome: 'Selo azul "Novo" ou "No e-mail diário"', significado: 'Entrou há pouco ou está parado há 1 dia útil. Vai no e-mail diário.' },
        { nome: 'Selo laranja "Parado: WhatsApp"', significado: 'Parado há 2 dias úteis ou mais: entra na contagem do WhatsApp de resumo do dia do responsável (só CLT, só se ele ainda não abriu o sistema).' },
        { nome: 'Selo vermelho "Com a Diretoria"', significado: 'Parado há 5 dias úteis ou mais: a Diretoria recebe o item com o nome de quem está com ele.' },
        { nome: 'Selo verde "Providência registrada"', significado: 'Alguém registrou o que foi feito; a cobrança está pausada até a data de acompanhamento.' },
        { nome: 'Selo vermelho "Prazo vencido"', significado: 'O prazo de decisão passou sem nenhuma providência. Conta na avaliação do gestor.' },
        { nome: 'Aba "Acompanhamento"', significado: 'Vencimentos de documentos, calibrações e laudos de clientes. Não sobem a escada nem entram na avaliação: dependem do cliente.' }
      ],
      problemas: [
        { situacao: 'Tudo aparece como "reserva da Diretoria".', oQueFazer: 'Ainda não há gestor responsável configurado nas áreas. Peça ao Administrador ou à Diretoria para marcar os responsáveis em "Regras e responsáveis".' },
        { situacao: 'Um item de uma pessoa da minha área foi para outro gestor.', oQueFazer: 'Confira a área da pessoa em Administração > Usuários > Áreas. O item segue a área da pessoa envolvida.' },
        { situacao: 'Aparece "Não foi possível conferir agora" com o nome de uma fonte.', oQueFazer: 'Uma leitura falhou nesta atualização; nada foi dado como resolvido. Toque em "Atualizar" daqui a pouco. Se repetir, avise o administrador.' },
        { situacao: 'Resolvi na tela do módulo e o item continua na caixa.', oQueFazer: 'Toque em "Atualizar". Itens do Auvo dependem da próxima sincronização; documentos dependem do cadastro do documento novo.' },
        { situacao: 'O botão "Registrar providência" não aparece.', oQueFazer: 'O item é de outro gestor. Você acompanha pela aba "Toda a gestão"; quem registra é o responsável ou a Diretoria.' }
      ],
      quemPode: [
        { perfil: 'GESTOR', pode: 'Ver a própria caixa e a da gestão toda, abrir as telas de resolver e registrar providência nos itens dele.' },
        { perfil: 'ADMIN', pode: 'Tudo do gestor, registrar providência em qualquer item e configurar os responsáveis, a escada e as automações.' },
        { perfil: 'DIRETORIA', pode: 'Tudo do administrador, ver os itens escalados e receber a reserva das áreas sem gestor.' },
        { perfil: 'RH,FINANCEIRO', pode: 'Abrem a caixa com os itens das áreas em que são responsáveis (Regras e responsáveis) e registram a providência neles. Não veem os itens das outras áreas.' },
        { perfil: 'TECNICO,METROLOGIA,COMERCIAL', pode: 'Não usam esta tela. O que depende de cada um aparece no Início e em Minhas atividades.' }
      ],
      perguntas: [
        { p: 'Quando chegam os e-mails e o WhatsApp?', r: 'As decisões entram no e-mail de resumo do dia único (todo dia útil, a partir das 08:00, um e-mail por pessoa com tudo o que espera por ela, só se houver algo). O WhatsApp de resumo sai a partir das 09:30, no máximo uma vez por dia, só para CLT e só se a pessoa ainda não abriu o sistema; leva a contagem das decisões paradas há 2 dias úteis ou mais. Nunca à noite, no fim de semana ou em feriado. Horários em Administração > Matriz de avisos.' },
        { p: 'Vou receber dois WhatsApp no dia (atividades e gestão)?', r: 'Não. Desde a matriz de avisos existe um resumo do dia só, com atividades, decisões, avisos e bate-papo juntos: no máximo um e-mail e um WhatsApp por dia.' },
        { p: 'O que conta como "parado"?', r: 'Dias úteis desde a entrada na caixa ou desde a última providência registrada. Fins de semana e feriados não contam.' },
        { p: 'Posso pausar a cobrança para sempre?', r: 'Não. A providência pausa por até 10 dias. Depois disso, se nada mudou, registre de novo com o que foi feito.' },
        { p: 'Os itens que já existiam antes da caixa contam como atrasados?', r: 'Não. Eles começam a contar do dia em que a caixa os viu pela primeira vez.' }
      ],
      secoesManual: [
        { titulo: 'Escada de cobrança', paragrafos: [
          'Na hora: o item entra na caixa, no Início da gestão e no balão do menu.',
          'Todo dia útil a partir das 08:00: um e-mail por pessoa da gestão com o resumo do que espera por ela, agrupado (paradas, prazo vencido, novas e demais), com o caminho de cada item. A Diretoria recebe um só e-mail com as decisões dela, os itens escalados com o nome de quem está segurando, as áreas sem gestor e, no primeiro dia útil da semana e do mês, os relatórios.',
          'Parado há 2 dias úteis: entra na contagem do WhatsApp de resumo do dia do responsável (uma mensagem por dia, só CLT, só se ele ainda não abriu o sistema, no horário de trabalho).',
          'Parado há 5 dias úteis: escala para a Diretoria.',
          'Os números de dias e as horas são configuráveis em "Regras e responsáveis" (Administrador e Diretoria).'
        ] },
        { titulo: 'Automações', paragrafos: [
          'CNH: o condutor recebe e-mail com 30, 15 e 7 dias do vencimento; só com 7 dias ou menos a CNH entra na caixa do gestor.',
          'Manutenção preventiva prevista pela data ou pela quilometragem vira atividade do gestor da Frota em Minhas atividades (entra na agenda e no Gantt), uma por veículo e tipo a cada 60 dias.',
          'Atividade aberta com responsável inativo ou sem responsável volta para quem lançou (ou para o gestor da área), com histórico e aviso.',
          'Relatórios do mês (Desempenho da gestão, Frota, Programa de conduta e Atividades da equipe) são gerados no primeiro dia útil do mês e enviados à Diretoria.'
        ] },
        { titulo: 'Atividade atrasada: escalonamento por prioridade (26/10/2026)', paragrafos: [
          'Além da escada da caixa (contada em dias úteis), a atividade atrasada sobe pela prioridade, em horas corridas depois da previsão vencer. Padrão: Urgente com 15 minutos avisa o responsável, com 1 hora o gestor da área e com 4 horas a Diretoria; Alta com 1, 4 e 24 horas; Normal com 8, 48 e 120 horas (5 dias; afrouxada pelo dono em 29/10/2026, antes 4, 24 e 72); Baixa com 24, 72 e 168 horas.',
          'Gestor da área: os responsáveis da área da pessoa e da área do módulo, e quem lançou a atividade se for da gestão. Sem ninguém, vai à Diretoria. Ninguém recebe como gestor a cobrança da própria atividade. Atividade restrita (Programa de conduta) só vai a quem vê as restritas.',
          'Cada nível avisa uma vez por atividade e por previsão. Só no horário de trabalho: o que venceu à noite ou no fim de semana sai no começo do expediente, já no nível mais alto alcançado. Nova previsão (justificativa de atraso) recomeça a contagem.',
          'Cada pessoa recebe uma mensagem por rodada com tudo o que subiu para ela, no sistema e por e-mail. O WhatsApp só sai se a gestão marcar "na hora" os eventos S71, S72 e S73 em Administração > Matriz de avisos. O escalonamento fica no histórico da atividade ("Cobrança escalada pela prioridade").',
          'Os prazos são definidos pelo Administrador ou pela Diretoria em "Regras e responsáveis".'
        ] },
        { titulo: 'Resumo do dia da gestão (26/10/2026)', paragrafos: [
          'Todo dia útil, a partir das 08:30, cada pessoa da gestão (Administrador, Diretoria, Gestor, RH e Financeiro) vê no Início um resumo: atividades atrasadas e que vencem hoje da equipe dela, por onde começar (as mais urgentes e mais atrasadas), as atividades dela e a central de pendências.',
          'A equipe é a das áreas em que a pessoa é responsável, mais as atividades que ela lançou. A Diretoria vê a empresa toda.',
          'A atividade de O.S. da Assistência técnica não conta como atrasada nem como "vence hoje": quem manda nela é a O.S. Da central de pendências saem o total, as críticas e os três maiores grupos, do maior para o menor, com o nome do que é (por exemplo "76 padrões de referência vencidos"). Para baixar um grupo, abra a central no Início e resolva na tela indicada em cada cartão.',
          'O texto sai pelas regras do sistema. Com a chave da IA cadastrada (Administração > Chaves e senhas), a IA reescreve o texto; ele só vale se passar na conferência (números e nomes só dos dados do sistema, sem formatação). Se não passar, vale o texto das regras.',
          'A hora e a IA são definidas em "Regras e responsáveis".'
        ] }
      ]
    },
    'gestao_decisoes/regras': {
      titulo: 'Caixa de decisões: Regras e responsáveis',
      paraQueServe: 'Define quem é o gestor responsável por cada área, a área usada por cada módulo, a escada de cobrança e as automações.',
      passos: [
        { titulo: 'Escolher os responsáveis', itens: ['Em "Gestor responsável por área", marque uma ou mais pessoas em cada área.', 'Deixe em branco a área que a Diretoria acompanha diretamente.', 'Toque em "Salvar regras".'] },
        { titulo: 'Ajustar a escada', itens: ['Escolha a hora do e-mail diário (dentro do horário de trabalho).', 'Escolha depois de quantos dias úteis parado o item entra no WhatsApp e vai para a Diretoria.', 'Toque em "Salvar regras".'] },
        { titulo: 'Ajustar o escalonamento por prioridade', itens: ['Vá à caixa "Atividade atrasada: escalonamento por prioridade".', 'Deixe marcado "Escalonar as atividades atrasadas" (desmarque para parar).', 'Em cada prioridade, escreva as horas para o responsável, o gestor da área e a Diretoria. Use números crescentes, de 0,25 (15 minutos) a 720.', 'Toque em "Salvar regras".'] },
        { titulo: 'Ajustar o resumo do dia', itens: ['Na mesma caixa, em "Resumo do dia da gestão", marque ou desmarque "Mostrar o resumo do dia no Início".', 'Escolha a hora (dentro do horário de trabalho).', 'Marque ou desmarque o texto reescrito pela IA.', 'Toque em "Salvar regras".'] }
      ],
      problemas: [
        { situacao: 'Aparece "as horas do escalonamento da prioridade ... precisam ser três números crescentes".', oQueFazer: 'Em cada linha, a hora do gestor da área tem de ser maior que a do responsável, e a da Diretoria maior que a do gestor, entre 0,25 e 720. Corrija e salve de novo.' },
        { situacao: 'Aparece "a hora do resumo do dia precisa ficar dentro do horário de trabalho".', oQueFazer: 'Escolha uma hora entre o início e o fim do expediente (Atividades da equipe > Avisos e horários) e salve de novo.' },
        { situacao: 'Aparece "a hora do envio precisa ficar dentro do horário de trabalho".', oQueFazer: 'Escolha uma hora entre o início e o fim do expediente (Atividades da equipe > Avisos e horários) e salve de novo.' },
        { situacao: 'Aparece "a Diretoria precisa entrar depois do WhatsApp".', oQueFazer: 'O número de dias úteis da Diretoria tem de ser maior que o do WhatsApp. Corrija e salve de novo.' }
      ],
      quemPode: [{ perfil: 'ADMIN,DIRETORIA', pode: 'Mudar e salvar as regras. Gestor, RH e Financeiro podem ser escolhidos como responsáveis de uma área.' }, { perfil: 'GESTOR,RH,FINANCEIRO', pode: 'Ver as regras, sem mudar.' }]
    },
    'gestao_desempenho': {
      titulo: 'Desempenho da gestão',
      paraQueServe: 'Mostra, por gestor e por mês, como ele decide o que depende dele: decidido no prazo, tempo médio de decisão, prazos vencidos sem decisão, escalonamentos à Diretoria, dias úteis sem acessar o sistema, decisões revertidas, atividades da equipe sem atraso e planos de ação no prazo. A nota de 0 a 100 e o farol seguem uma regra publicada na própria tela.',
      antesDeComecar: [
        'Cada gestor vê só a própria avaliação. A Diretoria vê todos. Ninguém mais vê.',
        'É avaliado quem tem o perfil Gestor e quem responde por uma área em Caixa de decisões > Regras e responsáveis.',
        'O mês fechado fica congelado no primeiro dia útil do mês seguinte.'
      ],
      passos: [
        { titulo: 'Ver a avaliação', itens: ['Toque em "Desempenho da gestão" no menu (grupo Gestão).', 'Escolha o mês.', 'Leia a nota, o farol e cada indicador. A barra embaixo de cada indicador é a nota daquele componente.'] },
        { titulo: 'Gerar o relatório A4', itens: ['Gestor: toque em "Gerar meu relatório A4".', 'Diretoria: toque em "Gerar relatório A4 do mês" (todos ou o gestor escolhido em "Gestor").', 'A cópia em PDF e HTML fica guardada na pasta "Gestão - Relatórios".'] },
        { titulo: 'Mudar os pesos (Diretoria)', itens: ['Abra a aba "Regra da nota".', 'Ajuste os pesos e as faixas do farol.', 'Toque em "Salvar pesos". O mês em curso usa os pesos novos; meses fechados não mudam.'] },
        { titulo: 'Relatórios da empresa (Diretoria)', itens: ['Abra a aba "Relatórios". O bloco "Relatórios da empresa" mostra quem recebe, os próximos envios e o histórico.', 'Marque quem recebe e toque em "Salvar lista". "Voltar ao padrão" deixa a Diretoria e o gestor da Qualidade.', 'No primeiro dia útil da semana, a partir das 08:00, sai um e-mail com os relatórios da semana anterior: gestão, Programa de conduta (equipe e missões), Frota, Comercial e SEDNA. No primeiro dia útil do mês sai o pacote do mês anterior, que começa pela "Saúde da empresa".', 'O e-mail sai quando tudo fica pronto ou às 10:30, com o que ficou pronto e o motivo do que faltou.', 'Para conferir sem esperar, toque em "Gerar e enviar agora (teste)": o pacote vai só para você.'] }
      ],
      cores: [
        { nome: 'Farol verde', significado: 'Nota a partir de 85 (padrão).' },
        { nome: 'Farol amarelo', significado: 'Nota a partir de 70 e abaixo de 85 (padrão).' },
        { nome: 'Farol vermelho', significado: 'Nota abaixo de 70. Dois meses seguidos no vermelho, ou 3 escalonamentos no mês, geram sugestão no Programa de conduta só para a Diretoria decidir.' },
        { nome: '"Sem dados no mês"', significado: 'Não houve item, prazo nem atividade para medir no mês.' }
      ],
      problemas: [
        { situacao: 'Aparece "a avaliação é vista só pelo próprio gestor e pela Diretoria".', oQueFazer: 'Você não está entre os gestores avaliados. Se responde por uma área, peça ao Administrador ou à Diretoria para incluí-lo em Regras e responsáveis.' },
        { situacao: 'Dias sem acesso parecem altos.', oQueFazer: 'Conta o dia útil em que você não abriu o SGO+ nem o COMMAND com a conta ligada. Abrir o sistema no dia já conta como acesso.' }
      ],
      quemPode: [
        { perfil: 'GESTOR', pode: 'Ver e imprimir a própria avaliação.' },
        { perfil: 'DIRETORIA', pode: 'Ver todos os gestores, gerar os relatórios, ver os relatórios automáticos, mudar os pesos e definir quem recebe os relatórios da empresa.' },
        { perfil: 'ADMIN', pode: 'Ver a própria avaliação se responder por uma área. O dono do sistema vê como Diretoria.' }
      ],
      perguntas: [
        { p: 'A nota pune quem recebe muitos itens?', r: 'Não diretamente: o prazo é medido em percentual e o tempo é a média. O que tira nota é decidir fora do prazo, deixar vencer, deixar chegar à Diretoria e ficar sem acessar.' },
        { p: 'Registrar providência conta como decisão?', r: 'Conta como primeira ação. Depois, o item precisa ser resolvido na tela de origem; se ficar parado de novo, volta a subir a escada.' },
        { p: 'Por que alguém da lista não recebeu um dos relatórios da empresa?', r: 'Cada relatório segue a regra de acesso da tela: o que traz nomes do Programa de conduta vai só para a Diretoria e o Gestor de Qualidade, e a avaliação dos gestores (Desempenho e Semanal da gestão) só para a Diretoria. O e-mail diz o que não foi e por quê.' },
        { p: 'Como é calculado o índice da "Saúde da empresa"?', r: 'De 0 a 100, por área: média das decisões da Caixa tomadas no prazo e das atividades concluídas no prazo no mês. O Programa de conduta entra com o índice de conduta do mês. O índice geral é a média das linhas com dado. Área sem dado aparece como "sem dado" (não vale zero). A regra completa vai no próprio documento.' }
      ]
    }
  };
}
