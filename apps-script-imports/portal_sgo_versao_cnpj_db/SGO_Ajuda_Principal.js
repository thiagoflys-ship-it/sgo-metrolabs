/**
 * AJUDA "Como usar esta tela" — grupo Principal (17/10/2026).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Chamado por SGO_Ajuda.js.
 * Telas: Início do computador, Início do celular, busca rápida, Minhas atividades,
 * Atividades da equipe e Avisos. Texto puro, conferido nas telas reais
 * (JS_Core, JS_Inicio, JS_Atividades, JS_Avisos, Index, SGO_Inicio, SGO_Atividades, SGO_Avisos).
 */
function SGO_ajudaTelas_Principal_() {
  return {

    // ============================================================
    // INÍCIO (COMPUTADOR)
    // ============================================================
    "dashboard": {
      titulo: "Início",
      paraQueServe: "Mostra, logo ao entrar, o que depende de você hoje: pendências, vencimentos, a situação da frota e o farol do Programa de Conduta. Abaixo ficam os números do sistema, os últimos documentos e os gráficos.",
      antesDeComecar: [
        "Entre no SGO+ com o seu usuário e senha.",
        "Para voltar ao Início de qualquer tela, toque em \"Início\" no menu, no grupo Principal, ou no logotipo SGO+ no alto, à esquerda.",
        "Os números chegam do servidor em alguns segundos. Enquanto isso aparecem \"···\" e \"Carregando...\".",
        "O que cada pessoa vê depende do perfil. Veja a seção \"Quem pode\"."
      ],
      passos: [
        {
          titulo: "Ver o que depende de você hoje",
          itens: [
            "Leia a frase ao lado da saudação. Ela diz quantas pendências há para você e quantas são críticas.",
            "Se aparecer \"Nada pendente para você hoje.\", não há nada a resolver agora.",
            "Confira os cartões logo abaixo. Cada cartão reúne um tipo de pendência, do mais grave para o menos grave.",
            "Toque no cartão para ir direto à tela onde se resolve a pendência.",
            "Se o cartão reunir várias pendências, a lista daquele grupo abre em uma janela."
          ]
        },
        {
          titulo: "Ver a lista completa de pendências",
          itens: [
            "Toque em \"Ver todas as pendências (N)\", abaixo dos cartões.",
            "Confira as pendências separadas por módulo. Cada uma mostra o motivo, o responsável e \"O que fazer\".",
            "Toque no botão da pendência (por exemplo \"Abrir a tela\") para ir à tela certa.",
            "Na lista de um só grupo, toque em \"Ver todas\" para ver as pendências de todos os grupos.",
            "Toque em \"Fechar\", ou aperte a tecla Esc, para voltar ao Início."
          ]
        },
        {
          titulo: "Conferir vencimentos",
          itens: [
            "Vá ao bloco \"Vencimentos\".",
            "Leia a linha de resumo: quantos documentos estão vencidos ou vencem em 30 dias e quantos alertas estão vencidos.",
            "Na aba \"Alertas (documentos, padrões e frota)\", leia cada alerta. O selo à esquerda diz a situação.",
            "Toque em \"Abrir\" no alerta para ir à tela onde se resolve.",
            "Toque na aba \"Documentos em 60 dias\" para ver os documentos que vencem nos próximos 60 dias.",
            "Toque em \"Ver todos\" para abrir o Arquivo de documentos."
          ]
        },
        {
          titulo: "Acompanhar a frota",
          itens: [
            "Leia o bloco \"Frota\": quantos veículos estão disponíveis e quantos estão em uso.",
            "Confira em cada veículo em uso quem retirou, a data, a hora e a finalidade.",
            "Se houver manutenção, documento ou CNH vencendo, aparece uma faixa colorida no alto, terminada em \"tome uma providência\".",
            "Toque em \"Ver Frota\" na faixa para abrir a Frota.",
            "A situação dos veículos se atualiza sozinha a cada 30 segundos."
          ]
        },
        {
          titulo: "Ver o farol do Programa de Conduta",
          itens: [
            "Leia o cartão do farol: o ponteiro mostra o índice de conduta do mês e o selo mostra a situação do bônus.",
            "Confira as linhas abaixo do título: a margem em pontos até o amarelo, as ocorrências em prazo de defesa e a situação do mês anterior.",
            "A marca tracejada no velocímetro mostra onde o índice vai parar se as ocorrências em prazo de defesa ficarem firmes. O gráfico do mês aparece quando o índice mudou; o dos meses fechados, a partir de 3 meses.",
            "O cartão se atualiza sozinho enquanto o Início está aberto (\"Ao vivo\"): quando o índice muda, o ponteiro anda e aparece um aviso no canto da tela.",
            "Toque no cartão para abrir o Programa de conduta.",
            "Na gestão, use \"Aplicar agora: fechamentos pendentes e ajustes do programa\" quando o botão aparecer.",
            "Na gestão, toque em \"Ver quem confirmou a leitura dos avisos\" para ver quem já leu os avisos do programa."
          ]
        },
        {
          titulo: "Consultar números, documentos e gráficos",
          itens: [
            "Leia os quadros de números: clientes cadastrados, equipamentos ativos, documentos no arquivo e unidades cadastradas.",
            "Confira \"Clientes recentes\": os últimos cinco clientes cadastrados.",
            "Em \"Últimos documentos\", toque em \"Abrir\" para ver o arquivo do documento.",
            "Veja os gráficos \"Equipamentos por tipo\" e \"Documentos por mês\" (últimos 12 meses).",
            "Na gestão, veja também os atendimentos do Auvo: abertos, concluídos em 30 dias, O.S. sem relato de serviço, atendimentos por técnico e últimos atendimentos.",
            "Toque em um atendimento da tabela \"Últimos atendimentos\" para ver a O.S. completa."
          ]
        }
      ],
      cores: [
        { nome: "Rótulo vermelho no cartão de pendência (ícone de x)", significado: "Pendência crítica: vencida, vence hoje ou bloqueia o trabalho. Resolva primeiro." },
        { nome: "Rótulo amarelo escuro no cartão de pendência (ampulheta ou triângulo)", significado: "Atenção ou revisar: vence em até 30 dias, ou há um registro a conferir." },
        { nome: "Rótulo azul no cartão de pendência", significado: "Informação: não exige ação imediata, mas vale ler." },
        { nome: "Na lista completa, \"Crítica\" em vermelho, \"Atenção\" em amarelo escuro e \"Informação\" em cinza", significado: "A mesma gravidade dos cartões. Vencido ou vence hoje é crítico; até 30 dias é atenção." },
        { nome: "Alerta com fundo vermelho no bloco Vencimentos", significado: "Item vencido. Selos possíveis: \"Bloqueia emissão\" (padrão vencido não pode ser usado em certificado), \"Vencido\" ou \"Vencida\"." },
        { nome: "Alerta com fundo amarelo no bloco Vencimentos", significado: "Item a vencer ou a revisar. Selos possíveis: \"A vencer\", \"Revisar\"." },
        { nome: "Faixa verde \"Nenhum alerta de vencimento: documentos, padrões e frota em dia.\"", significado: "Nada vencido ou vencendo para você." },
        { nome: "Bolinha vermelha em \"Documentos em 60 dias\"", significado: "Documento já vencido." },
        { nome: "Bolinha amarela em \"Documentos em 60 dias\"", significado: "Documento vence em até 15 dias." },
        { nome: "Bolinha verde em \"Documentos em 60 dias\"", significado: "Documento vence entre 16 e 60 dias." },
        { nome: "Faixa da Frota com borda vermelha", significado: "Há item da frota vencido (manutenção, documento do veículo ou CNH)." },
        { nome: "Faixa da Frota com borda amarela", significado: "Há aviso da frota a vencer, ainda sem item vencido." },
        { nome: "Veículo com barra verde à esquerda", significado: "Disponível para retirada." },
        { nome: "Veículo com barra amarela à esquerda", significado: "Em uso. Mostra quem retirou." },
        { nome: "Veículo com barra cinza à esquerda", significado: "Outra situação, por exemplo \"Em manutenção\"." },
        { nome: "Farol vermelho, amarelo ou verde", significado: "Índice de conduta do mês: abaixo de 70 é vermelho; de 70 a 84,9 é amarelo; 85 ou mais é verde. \"GRAVÍSSIMA\" ao lado indica ocorrência gravíssima no mês." },
        { nome: "Frase amarela \"Período de teste\" no farol", significado: "O índice é calculado, mas o bônus ainda não é pago." },
        { nome: "Bolinha verde ou amarela em \"Últimos atendimentos\" (Auvo)", significado: "Verde: atendimento \"Concluído\". Amarela: \"Em aberto\"." }
      ],
      problemas: [
        { situacao: "Aparece \"Não foi possível verificar as pendências agora. Verifique a conexão e atualize a página.\"", oQueFazer: "Confira a internet e aperte F5 para atualizar a página. O resto do Início continua valendo." },
        { situacao: "Aparece \"Não foi possível verificar agora:\" seguido de um nome de módulo", oQueFazer: "Só aquela parte não foi conferida. Atualize a página para tentar de novo; as demais pendências estão corretas." },
        { situacao: "Aparece \"Não foi possível carregar os alertas agora. Atualize a página para tentar de novo.\"", oQueFazer: "Aperte F5. Se continuar, avise o administrador do sistema." },
        { situacao: "Aparece \"Farol da conduta indisponível\"", oQueFazer: "Atualize a página em alguns minutos. Se continuar, avise o administrador do sistema." },
        { situacao: "Aparece \"Não foi possível carregar a situação da frota agora.\"", oQueFazer: "Atualize a página para tentar de novo. Se continuar, avise o administrador." },
        { situacao: "Os números ficam em \"···\" ou os gráficos não aparecem", oQueFazer: "Espere alguns segundos. Se não mudar, atualize a página (F5). Os gráficos precisam de internet para carregar." },
        { situacao: "O número de pendências do Início é diferente do que espero", oQueFazer: "O número conta pendências, não cartões. É o mesmo do Painel de qualidade e da janela ao entrar. Documento renovado substitui o anterior e deixa de contar." },
        { situacao: "Não aparece o bloco de atendimentos do Auvo", oQueFazer: "O bloco só aparece para Gestor, Admin e Diretoria, e só quando há atendimentos registrados." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR", pode: "Ver tudo do Início, incluindo as pendências da equipe, o bloco de atendimentos do Auvo e os botões de gestão do farol de conduta." },
        { perfil: "METROLOGIA", pode: "Ver as próprias pendências, os padrões de referência e os vencimentos dos clientes, além do farol, da frota, dos números e dos gráficos." },
        { perfil: "TECNICO,COMERCIAL,FINANCEIRO", pode: "Ver as próprias pendências (atividades, avisos, a própria CNH, as próprias O.S.) e os padrões de referência, além do farol, da frota, dos números e dos gráficos." },
        { perfil: "RH", pode: "Ver as próprias pendências, o farol da conduta, a frota e as pendências da Frota da gestão (CNH, documentos, multas). Os quadros técnicos (clientes, equipamentos, documentos e vencimentos) não aparecem." },
        { perfil: "CLIENTE", pode: "Ver os vencimentos de documentos, calibrações e NR-13 da sua empresa, os equipamentos ativos, os documentos e os gráficos. Farol, frota, clientes e unidades não aparecem." }
      ],
      perguntas: [
        { p: "Onde encontro a ajuda de cada tela?", r: "No computador, toque em \"Como usar esta tela\", no alto de cada tela. No celular, toque em \"Ajuda\", na barra do topo. O painel mostra o passo a passo, as cores, o que fazer se algo der errado e quem pode fazer cada coisa. O botão \"Manual completo do módulo\" abre o manual para imprimir ou salvar em PDF." },
        { p: "De onde vêm as pendências do Início?", r: "De uma lista única do SGO+. A mesma lista alimenta o bloco de alertas, os números ao lado do menu, a janela ao entrar e o Painel de qualidade." },
        { p: "O que conta como crítico?", r: "Vencido ou que vence hoje. O que vence em até 30 dias é atenção. Atividade atrasada também é crítica." },
        { p: "Por que só aparecem quatro cartões?", r: "O Início mostra os quatro grupos mais urgentes. Toque em \"Ver todas as pendências (N)\" para ver o resto." },
        { p: "Como volto ao Início?", r: "Toque em \"Início\" no menu ou no logotipo SGO+ no alto da tela." },
        { p: "A tela atualiza sozinha?", r: "A situação da frota atualiza a cada 30 segundos. Para atualizar o resto, toque em \"Início\" de novo ou aperte F5." }
      ]
    },

    // ============================================================
    // INÍCIO DO CELULAR
    // ============================================================
    "mobile_home": {
      titulo: "Início do celular",
      paraQueServe: "É a tela inicial no celular. Mostra as suas pendências, o farol da conduta, a situação da frota e atalhos grandes para as telas mais usadas. As demais telas ficam em \"Outras telas\".",
      antesDeComecar: [
        "Entre no SGO+ pelo navegador do celular com o seu usuário e senha.",
        "A tela de celular aparece no celular, em pé ou deitado, e em janelas estreitas. Ao girar o aparelho, o SGO+ ajusta a tela sozinho.",
        "Na barra do topo ficam \"← Voltar\", o nome da tela, a lupa da busca, \"Ajuda\" e \"Sair\". No Início não há \"← Voltar\". Toque em \"Ajuda\" em qualquer tela para ver o passo a passo dela."
      ],
      passos: [
        {
          titulo: "Ver o que depende de você",
          itens: [
            "Leia a frase ao lado da saudação: quantas pendências há para você e quantas são críticas.",
            "Toque em um cartão de pendência para ir à tela onde ela se resolve.",
            "Toque em \"Ver todas as pendências (N)\" para ver a lista completa.",
            "Toque em \"Fechar\" para voltar ao Início."
          ]
        },
        {
          titulo: "Abrir uma tela pelos atalhos",
          itens: [
            "Vá ao bloco \"O que você precisa fazer?\".",
            "Toque no atalho da tela que precisa, por exemplo \"Minhas atividades\" ou \"Frota\".",
            "Para voltar, toque em \"← Voltar\" no alto."
          ]
        },
        {
          titulo: "Abrir uma tela que não está nos atalhos",
          itens: [
            "Role até \"Outras telas\".",
            "Toque no nome do grupo, por exemplo \"Calibração\" ou \"Cadastros\". O número ao lado diz quantas telas há no grupo.",
            "Toque no nome da tela.",
            "Outra forma: toque na lupa no alto e digite o nome da tela."
          ]
        },
        {
          titulo: "Devolver o veículo que está com você",
          itens: [
            "Se você retirou um veículo, aparece no bloco da Frota o botão \"Devolver\" seguido da placa.",
            "Toque nesse botão.",
            "Siga os passos da devolução: KM de chegada, foto do painel, vistoria e confirmação."
          ]
        },
        {
          titulo: "Ver o farol da conduta",
          itens: [
            "Leia a faixa do farol logo abaixo das pendências.",
            "Confira a cor da borda e o ponteiro: mostram o índice de conduta do mês. O selo mostra a situação do bônus e a barra mostra a margem em pontos.",
            "A faixa se atualiza sozinha com o Início aberto: quando o índice muda, o ponteiro anda e aparece um aviso no pé da tela.",
            "Para ver o detalhe, toque no atalho \"Conduta\"."
          ]
        }
      ],
      cores: [
        { nome: "Rótulo vermelho no cartão de pendência", significado: "Crítica: vencida, vence hoje ou bloqueia o trabalho." },
        { nome: "Rótulo amarelo escuro no cartão de pendência", significado: "Atenção ou revisar: vence em até 30 dias, ou há registro a conferir." },
        { nome: "Rótulo azul no cartão de pendência", significado: "Informação, sem ação imediata." },
        { nome: "Borda verde, amarela ou vermelha na faixa do farol", significado: "Índice de conduta do mês: verde a partir de 85; amarelo de 70 a 84,9; vermelho abaixo de 70." },
        { nome: "Veículo com barra verde", significado: "Disponível." },
        { nome: "Veículo com barra amarela", significado: "Em uso, com o nome de quem retirou." },
        { nome: "Botão verde \"Devolver\" com a placa", significado: "Você está com esse veículo. Toque para registrar a devolução." },
        { nome: "Blocos cinza piscando ao abrir", significado: "Conteúdo ainda carregando. Espere alguns segundos." }
      ],
      problemas: [
        { situacao: "Aparece \"O farol da conduta não pôde ser carregado agora.\"", oQueFazer: "Volte ao Início em alguns minutos. Se continuar, avise o gestor." },
        { situacao: "Aparece \"Não foi possível verificar as pendências agora.\"", oQueFazer: "Confira a internet do celular e atualize a página." },
        { situacao: "Aparece \"Não foi possível carregar a situação da frota agora.\"", oQueFazer: "Atualize a página. Se continuar, avise o administrador." },
        { situacao: "Não encontro uma tela nos atalhos", oQueFazer: "Procure em \"Outras telas\", no grupo da tela, ou use a lupa no alto." },
        { situacao: "Não aparece o botão \"Devolver\"", oQueFazer: "O botão só aparece para quem está com um veículo retirado em seu nome. Abra a Frota para conferir." },
        { situacao: "A tela ficou com a versão de computador", oQueFazer: "Gire o celular para em pé. Se não mudar, atualize a página." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Ver pendências, farol, frota e os atalhos \"Minhas atividades\", \"Avisos\", \"Certificado de calibração\", \"Padrões de referência\", \"Frota\", \"Conduta\", \"Clientes\", \"Unidades\", \"Equipamentos\" e \"Documentos\". Em \"Outras telas\" aparecem as telas que o seu perfil acessa no menu." },
        { perfil: "RH", pode: "Ver pendências, farol, frota e os atalhos do perfil: \"Minhas atividades\", \"Caixa de decisões\", \"Avisos\", \"Ponto\", \"Frota\", \"Conduta\", \"Clientes\", \"Unidades\", \"Equipamentos\" e \"Usuários\"." },
        { perfil: "CLIENTE", pode: "Ver os vencimentos da sua empresa e os atalhos \"Unidades\", \"Equipamentos\" e \"Documentos\". Farol e frota não aparecem." },
        { perfil: "TODOS", pode: "Usar a lupa do alto para procurar telas e cadastros." }
      ],
      perguntas: [
        { p: "O celular tem todas as telas do computador?", r: "Sim. As que não estão nos atalhos ficam em \"Outras telas\", nos mesmos grupos do menu do computador." },
        { p: "Como volto ao Início?", r: "Toque em \"← Voltar\". Outra forma: toque na lupa, digite \"Início\" e toque no resultado." },
        { p: "Por que aparece \"Chaves e senhas\" para mim?", r: "O atalho só aparece para quem é responsável pelas chaves do sistema." }
      ]
    },

    // ============================================================
    // BUSCA RÁPIDA
    // ============================================================
    "busca": {
      titulo: "Busca rápida",
      paraQueServe: "Encontra em um só lugar uma tela do menu, um equipamento pela TAG, um cliente pelo nome ou CNPJ, um certificado pelo número, um documento ou um padrão de referência, e leva direto até ele.",
      antesDeComecar: [
        "No computador, a busca fica no centro da barra do topo: \"Buscar TAG, cliente, certificado ou tela\".",
        "No computador, a busca também abre com as teclas Ctrl e K juntas.",
        "No celular, a busca abre pela lupa, no alto da tela.",
        "Para procurar em cadastros, certificados e padrões, digite pelo menos 2 letras."
      ],
      passos: [
        {
          titulo: "Ir para uma tela",
          itens: [
            "Toque em \"Buscar TAG, cliente, certificado ou tela\" ou na lupa.",
            "Sem digitar nada, veja as sugestões em \"Ir para\".",
            "Digite o nome da tela ou uma palavra ligada a ela, por exemplo \"vaso\", \"NR13\" ou \"vacina\".",
            "Toque no resultado do grupo \"Telas\"."
          ]
        },
        {
          titulo: "Encontrar um equipamento, cliente, certificado, documento ou padrão",
          itens: [
            "Abra a busca.",
            "Digite a TAG, o nome, o CNPJ ou o número do certificado.",
            "Espere a frase \"Procurando em cadastros, certificados e padrões…\" sumir.",
            "Confira os resultados por grupo: \"Equipamentos\", \"Clientes\", \"Certificados de calibração\", \"Documentos\" e \"Padrões de referência\".",
            "Toque no resultado. A tela certa abre já com a pesquisa preenchida."
          ]
        },
        {
          titulo: "Usar o teclado no computador",
          itens: [
            "Aperte Ctrl e K juntas para abrir.",
            "Use as setas para cima e para baixo para escolher o resultado.",
            "Aperte Enter para abrir o resultado marcado.",
            "Aperte Esc, ou Ctrl e K de novo, para fechar."
          ]
        }
      ],
      cores: [
        { nome: "Resultado com fundo destacado", significado: "É o resultado marcado. Enter abre esse resultado." },
        { nome: "Número \"X de Y\" ao lado do nome do grupo", significado: "Há mais resultados do que os mostrados. Digite mais letras para refinar." },
        { nome: "\"Inativo\" no resultado de cliente ou padrão", significado: "O cadastro existe, mas está inativo." },
        { nome: "Situação da validade no resultado de padrão", significado: "Mostra se o padrão está vigente, vence em breve ou está vencido." }
      ],
      problemas: [
        { situacao: "Aparece \"Digite pelo menos 2 letras para procurar em cadastros, certificados e padrões.\"", oQueFazer: "Digite mais uma letra. Com uma letra só, a busca procura apenas telas." },
        { situacao: "Aparece \"Nada encontrado para\" seguido do que digitei", oQueFazer: "Confira a grafia. Procure pela TAG, pelo CNPJ ou pelo número do certificado." },
        { situacao: "Aparece \"Não foi possível procurar em:\" seguido de um grupo", oQueFazer: "Aquele grupo não respondeu agora; os outros estão corretos. Feche e abra a busca de novo." },
        { situacao: "Aparece \"Não foi possível falar com o servidor. Verifique a conexão e tente de novo.\"", oQueFazer: "Confira a internet e digite de novo." },
        { situacao: "Uma tela não aparece na busca", oQueFazer: "A busca mostra só as telas que o seu perfil acessa no menu. Se precisar da tela, peça acesso ao administrador." },
        { situacao: "O certificado não aparece", oQueFazer: "A busca encontra só certificados ativos. Procure pelo número completo ou pelo CNPJ do cliente na tela Certificado de calibração." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Procurar telas, equipamentos, clientes, certificados, documentos e padrões de referência." },
        { perfil: "RH", pode: "Procurar as telas do perfil RH (inclusive clientes, unidades e equipamentos). Certificados, documentos técnicos e padrões de referência não aparecem; se abrir um atalho deles, a tela explica que fica fora do perfil." },
        { perfil: "CLIENTE", pode: "Procurar telas, equipamentos, certificados e documentos da própria empresa. Clientes e padrões de referência não aparecem." }
      ],
      perguntas: [
        { p: "A busca encontra por parte do nome?", r: "Sim. Resultados que começam com o que você digitou aparecem primeiro." },
        { p: "Preciso de acento?", r: "Não. A busca de telas ignora acentos e maiúsculas." },
        { p: "Quantos resultados aparecem?", r: "Até 6 por grupo. Se houver mais, o grupo mostra \"X de Y\"." },
        { p: "Fecho a busca como?", r: "Toque fora da caixa, toque em \"Esc\" na caixa ou aperte a tecla Esc." }
      ]
    },

    // ============================================================
    // MINHAS ATIVIDADES
    // ============================================================
    "minhas_atividades": {
      titulo: "Minhas atividades",
      paraQueServe: "Reúne as atividades sob sua responsabilidade, com prazo, situação e o que você está fazendo agora. Também mostra as atividades em agenda e em quadro de cartões (Kanban). As atividades são as mesmas do METROLABS COMMAND: o que é lançado em um sistema aparece no outro, com o mesmo histórico.",
      antesDeComecar: [
        "Abra pelo menu, no grupo Principal, em \"Minhas atividades\".",
        "O número ao lado do nome no menu mostra as atividades abertas. Se ficar vermelho, mostra as vencidas.",
        "Você lança atividades só para você. Para lançar para outra pessoa, peça a um gestor.",
        "Quando o prazo de uma atividade passa sem conclusão, o SGO+ abre uma janela que pede a justificativa. Ela não fecha sem justificar.",
        "A atividade pode ser vista pela equipe em \"Atividades da equipe\". Marque \"Restrita\" quando só você, quem lançou e a gestão devem ver."
      ],
      passos: [
        {
          titulo: "Lançar uma atividade",
          itens: [
            "Toque em \"Nova atividade\".",
            "Escreva no campo \"Título\" o que precisa ser feito.",
            "Escreva os detalhes em \"Descrição\", se precisar.",
            "Escolha a \"Prioridade\": Baixa, Normal, Alta ou Urgente.",
            "Confira o \"Prazo\". Ele já vem com amanhã às 18h; mude se precisar.",
            "Preencha \"Início previsto\", se souber.",
            "Escolha o \"Módulo ligado\", se a atividade for de uma tela do sistema.",
            "Digite o cliente e toque no nome dele na lista que aparece. Depois escolha a unidade, se houver.",
            "Se quiser, abra \"Planejamento 5W2H (opcional)\" e preencha \"Por quê\", \"Onde\", \"Como\" e \"Quanto\". O quê é o título, quando é o prazo e quem é o responsável.",
            "Marque \"Restrita\" se a atividade não deve aparecer para a equipe toda.",
            "Toque em \"Salvar atividade\"."
          ]
        },
        {
          titulo: "Marcar o que você está fazendo agora",
          itens: [
            "Na lista, toque em \"Fazendo agora\" na atividade que você está executando.",
            "A atividade passa para \"Em andamento\" e aparece na faixa do alto.",
            "Só uma atividade fica marcada por vez. Ao marcar outra, a anterior é desmarcada.",
            "Toque em \"Parar\" na faixa, ou em \"Parar fazendo agora\" na atividade, para desmarcar."
          ]
        },
        {
          titulo: "Mudar a situação",
          itens: [
            "Toque em \"Iniciar\" para passar a atividade para \"Em andamento\".",
            "Toque em \"Aguardando\" quando depender de outra coisa. Escreva o que está aguardando (mínimo 5 letras) e toque em \"Confirmar\".",
            "Toque em \"Concluir\" quando terminar. Escreva uma observação, se quiser, e toque em \"Confirmar\".",
            "No celular, use \"Iniciar\", \"Concluir\" ou \"Detalhes\" no cartão."
          ]
        },
        {
          titulo: "Abrir o detalhe, comentar e registrar andamento",
          itens: [
            "Toque no título da atividade.",
            "Confira responsável, quem lançou, prioridade, módulo, cliente e datas.",
            "Para registrar o percentual feito, preencha \"Andamento (%)\" e toque em \"Gravar andamento\".",
            "Para registrar um combinado ou uma dúvida, escreva em \"Comentário\" e toque em \"Comentar\".",
            "Leia o \"Histórico\": toda mudança fica registrada com nome, data e hora."
          ]
        },
        {
          titulo: "Editar, reabrir ou cancelar",
          itens: [
            "Toque em \"Editar\" na lista ou no detalhe.",
            "Altere os campos e toque em \"Salvar alterações\".",
            "Para reabrir uma atividade concluída ou cancelada, abra o detalhe e toque em \"Reabrir\".",
            "Para cancelar, abra o detalhe, toque em \"Cancelar atividade\", escreva o motivo (mínimo 5 letras) e toque em \"Confirmar\"."
          ]
        },
        {
          titulo: "Justificar uma atividade atrasada",
          itens: [
            "Quando aparecer a janela \"Atividade com prazo vencido\", leia o nome da atividade.",
            "Escolha em \"O que causou o atraso\" o motivo da lista. Se nenhum servir, escolha \"Outro motivo\".",
            "Escreva em \"Explique a demora\" o que atrasou e o que falta (mínimo 15 letras).",
            "Escolha em \"Nova previsão de entrega\" a data e a hora. Ela já vem com amanhã às 18h.",
            "Toque em \"Registrar justificativa\".",
            "Repita para cada atividade da janela. A janela fecha quando todas estiverem justificadas.",
            "Se a atividade já foi feita, justifique e depois toque em \"Concluir\"."
          ]
        },
        {
          titulo: "Filtrar a lista",
          itens: [
            "Na aba \"Lista\", escolha a \"Situação\": Abertas, Todas ou uma situação.",
            "Escolha o \"Prazo\": Todos, Vencidas, Vence hoje ou Próximos 7 dias.",
            "Escolha a \"Prioridade\" e o \"Módulo\", se precisar.",
            "A lista muda na hora."
          ]
        },
        {
          titulo: "Ver as atividades de uma tela do sistema",
          itens: [
            "Abra a tela pelo menu, por exemplo \"Frota\".",
            "Toque em \"Atividades do módulo\", no cabeçalho da tela.",
            "Confira o quadro de cartões das atividades ligadas àquela tela.",
            "Toque em \"Nova atividade neste módulo\" para lançar uma atividade já ligada à tela.",
            "Toque no x do painel para fechar."
          ]
        }
      ],
      cores: [
        { nome: "Selo vermelho \"Vencida\"", significado: "A previsão de entrega já passou e a atividade não foi concluída." },
        { nome: "Selo amarelo \"Vence hoje\"", significado: "A previsão de entrega é hoje." },
        { nome: "Selo verde \"Em dia\"", significado: "A atividade está aberta e dentro do prazo." },
        { nome: "Selo cinza \"No prazo\" ou \"Com atraso\"", significado: "Atividade concluída: diz se terminou antes ou depois do prazo original." },
        { nome: "Selo verde \"Agora\" ou \"Fazendo agora\"", significado: "É a atividade que você marcou como em execução." },
        { nome: "Situação \"A fazer\" em cinza claro", significado: "Ainda não começou." },
        { nome: "Situação \"Em andamento\" em azul", significado: "Está sendo feita." },
        { nome: "Situação \"Aguardando\" em amarelo escuro", significado: "Parada à espera de algo, como peça, cliente ou aprovação." },
        { nome: "Situação \"Concluída\" em verde", significado: "Terminada." },
        { nome: "Situação \"Cancelada\" em cinza escuro", significado: "Não será feita." },
        { nome: "Prioridade \"Urgente\" em vermelho, \"Alta\" em amarelo escuro, \"Baixa\" em cinza", significado: "Grau de urgência escolhido ao lançar. \"Normal\" fica sem cor." },
        { nome: "Cartão com borda vermelha (celular e quadro de cartões)", significado: "Atividade vencida." },
        { nome: "Número vermelho ao lado de \"Minhas atividades\" no menu", significado: "Quantidade de atividades vencidas. Sem vermelho, o número mostra as abertas." },
        { nome: "Selo cinza \"COMMAND\"", significado: "A atividade foi lançada pelo METROLABS COMMAND. Ela é a mesma nos dois sistemas." },
        { nome: "Selo cinza \"Restrita\"", significado: "Só o responsável, quem lançou e a gestão veem a atividade." }
      ],
      problemas: [
        { situacao: "A janela \"Atividade com prazo vencido\" não fecha", oQueFazer: "É assim mesmo. Escreva o motivo e a nova previsão de cada atividade e toque em \"Registrar justificativa\"." },
        { situacao: "Aparece \"o motivo precisa ter pelo menos 15 letras\"", oQueFazer: "Explique melhor o que atrasou. O contador abaixo do campo mostra quantas letras faltam." },
        { situacao: "Aparece \"escolha em O que causou o atraso o motivo\"", oQueFazer: "Escolha o motivo na lista acima do texto. Se nenhum servir, escolha \"Outro motivo\" e registre de novo." },
        { situacao: "Aparece \"Não foi possível mudar a situação: a atividade é de\"", oQueFazer: "A atividade é de outra pessoa. Só o responsável, quem lançou e a gestão mudam a situação; você acompanha em Atividades da equipe." },
        { situacao: "Aparece \"a nova previsão já passou\"", oQueFazer: "Escolha uma data e hora depois de agora e registre de novo." },
        { situacao: "Aparece \"o título está vazio ou curto demais\"", oQueFazer: "Escreva no campo \"Título\" o que precisa ser feito (mínimo 3 letras) e salve de novo." },
        { situacao: "Aparece \"o início previsto está depois do prazo\"", oQueFazer: "Ajuste uma das duas datas e salve de novo." },
        { situacao: "Aparece \"o cliente digitado não foi escolhido na lista\"", oQueFazer: "Toque no nome do cliente na lista que aparece abaixo do campo, ou apague o campo." },
        { situacao: "Aparece \"Não foi possível mudar o prazo: a atividade está com prazo vencido.\"", oQueFazer: "Registre primeiro a justificativa de atraso na janela que aparece. Só a gestão muda o prazo sem justificar." },
        { situacao: "Aparece \"Não foi possível editar a atividade: ela foi lançada por\"", oQueFazer: "Só um gestor ou quem lançou a atividade para si mesmo pode editar. Comente na atividade ou peça a um gestor." },
        { situacao: "Aparece \"Não foi possível cancelar: só quem lançou a atividade ou um gestor pode cancelar.\"", oQueFazer: "Comente o motivo na atividade e avise quem lançou." },
        { situacao: "Aparece \"Não foi possível marcar \"fazendo agora\": só o responsável\"", oQueFazer: "Só o responsável marca o que está executando. Confira se a atividade é sua." },
        { situacao: "A tela ficou com a mensagem de erro e o botão \"Tentar de novo\"", oQueFazer: "Confira a internet e toque em \"Tentar de novo\". Nada foi alterado." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,RH,FINANCEIRO", pode: "Lançar atividade para qualquer pessoa, editar, trocar o responsável, mudar o prazo (replanejar), reabrir e cancelar qualquer atividade. Atividade restrita (Programa de conduta) de outra pessoa: o Financeiro não vê nem altera." },
        { perfil: "TECNICO,METROLOGIA,COMERCIAL", pode: "Lançar atividades para si, mudar a situação, comentar, registrar andamento e justificar atraso das próprias atividades. Edita e cancela só as que lançou para si." },
        { perfil: "CLIENTE", pode: "Não usa esta tela." }
      ],
      perguntas: [
        { p: "Quem fica sabendo quando lanço ou justifico?", r: "Quem recebe uma atividade nova é avisado na hora no SGO+ e no COMMAND, e por e-mail no horário de trabalho. Quem lançou a atividade é avisado da justificativa de atraso do mesmo jeito." },
        { p: "Recebo aviso de atraso?", r: "Sim. No sistema, a janela de justificativa e a lista de pendências cobram até a atividade ser concluída ou justificada. O e-mail do atraso sai uma vez, no horário de trabalho." },
        { p: "Recebo mensagem de WhatsApp?", r: "No máximo um resumo do dia (09:30), em dia útil, só para quem tem vínculo CLT e só se a pessoa ainda não abriu o sistema e há atividade nova, para hoje ou atrasada (ou decisão parada). Nunca à noite, no fim de semana ou em feriado. O e-mail das atividades vem no e-mail de resumo do dia (08:00); na hora só a atividade com prazo para hoje. Cada pessoa ajusta em Menu > Meus avisos." },
        { p: "Posso lançar a atividade no COMMAND?", r: "Sim. A lista é a mesma: lance uma vez só, no sistema que for mais prático." },
        { p: "A tela atualiza sozinha?", r: "Sim, a cada 30 segundos, quando você não está digitando nem com janela aberta." },
        { p: "Posso mudar o responsável?", r: "Só a gestão. O novo responsável é avisado e a troca fica no histórico." },
        { p: "Onde vejo o que mudou?", r: "No \"Histórico\" do detalhe da atividade." }
      ]
    },

    "minhas_atividades/agenda": {
      titulo: "Agenda",
      paraQueServe: "Mostra as suas atividades no calendário, por semana ou por mês.",
      passos: [
        {
          titulo: "Ver a agenda",
          itens: [
            "Toque na aba \"Agenda\".",
            "Escolha \"Semana\" ou \"Mês\", à direita.",
            "Use as setas para ir ao período anterior ou ao próximo.",
            "Toque em \"Hoje\" para voltar ao período atual.",
            "Toque em uma atividade para abrir o detalhe."
          ]
        }
      ],
      cores: [
        { nome: "Dia com borda azul", significado: "É o dia de hoje." },
        { nome: "Atividade com borda tracejada e a palavra \"Início\"", significado: "Dia do início previsto, quando é diferente do dia da entrega." },
        { nome: "Atividade com texto vermelho", significado: "Atividade vencida." },
        { nome: "Atividade riscada e clara", significado: "Atividade concluída." },
        { nome: "Cor da borda à esquerda", significado: "Situação: cinza claro A fazer, azul Em andamento, amarelo escuro Aguardando, verde Concluída." }
      ],
      perguntas: [
        { p: "Em que dia a atividade aparece?", r: "No dia da previsão de entrega. Se tiver início previsto em outro dia, aparece também nesse dia." },
        { p: "O que significa \"mais N\" no mês?", r: "O dia tem mais de quatro atividades. Mude para \"Semana\" para ver todas." }
      ]
    },

    "minhas_atividades/kanban": {
      titulo: "Quadro de cartões (Kanban)",
      paraQueServe: "Mostra as suas atividades em quatro colunas, uma por situação, para mudar a situação arrastando o cartão.",
      passos: [
        {
          titulo: "Mudar a situação pelo quadro",
          itens: [
            "Toque na aba \"Kanban\".",
            "Arraste o cartão para a coluna da nova situação: \"A fazer\", \"Em andamento\", \"Aguardando\" ou \"Concluída\".",
            "Ao soltar em \"Aguardando\", escreva o motivo e toque em \"Confirmar\".",
            "Ao soltar em \"Concluída\", escreva uma observação, se quiser, e toque em \"Confirmar\".",
            "Toque no cartão para abrir o detalhe.",
            "Se arrastar não funcionar no seu aparelho, toque no cartão e use os botões do detalhe."
          ]
        }
      ],
      cores: [
        { nome: "Cartão com contorno vermelho", significado: "Atividade vencida." },
        { nome: "Barra azul fina no cartão", significado: "Andamento registrado, em percentual." },
        { nome: "Coluna com contorno tracejado azul", significado: "Coluna onde o cartão será solto." }
      ],
      perguntas: [
        { p: "Onde estão as canceladas?", r: "Não aparecem no quadro. Use a aba \"Lista\" com a situação \"Cancelada\"." },
        { p: "Por que nem todas as concluídas aparecem?", r: "O quadro mostra as 30 concluídas mais recentes. As demais estão na aba \"Lista\"." }
      ]
    },

    // ============================================================
    // ATIVIDADES DA EQUIPE
    // ============================================================
    "atividades_equipe": {
      titulo: "Atividades da equipe",
      paraQueServe: "Mostra para toda a equipe quem está fazendo o quê agora, os prazos e o andamento em gráfico de barras no tempo (Gantt), em quadro de cartões (Kanban), em lista e em indicadores, com as atividades lançadas no SGO+ e no METROLABS COMMAND. Só o responsável, quem lançou e a gestão alteram; os demais acompanham.",
      antesDeComecar: [
        "Abra pelo menu, no grupo Principal, em \"Atividades da equipe\". O item aparece para todos os perfis, menos Cliente.",
        "Atividades marcadas como restritas e as do Programa de conduta só aparecem para os envolvidos e para a gestão.",
        "A tela atualiza sozinha a cada 30 segundos, quando você não está digitando.",
        "O período começa 7 dias antes de hoje e vai até 30 dias depois. Mude nas datas, se precisar."
      ],
      passos: [
        {
          titulo: "Acompanhar a equipe",
          itens: [
            "Leia os quadros do alto: \"Abertas\", \"Vencidas\", \"Concluídas nos últimos 30 dias\" e \"Concluídas no prazo (30 dias)\".",
            "No bloco \"Agora\", confira cada colaborador, o que está fazendo, há quanto tempo, quantas abertas e quantas vencidas.",
            "No bloco \"Justificativas recentes\" (para a gestão) ou \"Justificativas das suas atividades\" (para os demais), leia os motivos de atraso e as novas previsões.",
            "Toque no título de uma atividade para abrir o detalhe.",
            "Toque em \"Atualizar\" para buscar os dados agora."
          ]
        },
        {
          titulo: "Filtrar",
          itens: [
            "Escolha as datas em \"Período de\" e \"até\".",
            "Escolha a \"Pessoa\", se quiser ver só uma.",
            "Escolha o \"Módulo\", se quiser ver só uma tela do sistema.",
            "Em \"Lançada no\", escolha SGO+ ou COMMAND, se quiser ver só as de um sistema.",
            "Os blocos de baixo mudam na hora."
          ]
        },
        {
          titulo: "Lançar atividade para alguém",
          itens: [
            "Toque em \"Nova atividade\".",
            "Escolha a pessoa em \"Responsável\".",
            "Preencha \"Título\", \"Prazo\" e os demais campos.",
            "Toque em \"Salvar atividade\". A pessoa é avisada na hora no SGO+ e no COMMAND, no e-mail de resumo do dia (na hora, se o prazo é hoje) e na contagem do WhatsApp de resumo do dia."
          ]
        },
        {
          titulo: "Replanejar uma atividade vencida",
          itens: [
            "Abra o detalhe da atividade e toque em \"Editar\".",
            "Mude o \"Prazo\" para uma data futura.",
            "Toque em \"Salvar alterações\".",
            "A atividade deixa de pedir justificativa ao responsável. O replanejamento fica no histórico e não conta como justificativa."
          ]
        },
        {
          titulo: "Ver em lista",
          itens: [
            "Toque na aba \"Lista\".",
            "Confira a atividade, o responsável, a prioridade, o prazo, a situação do prazo e a situação.",
            "Use os botões da linha para mudar a situação ou editar. Os botões só aparecem nas atividades que você pode alterar."
          ]
        },
        {
          titulo: "Ler os indicadores",
          itens: [
            "Toque na aba \"Indicadores\".",
            "Leia os quadros: concluídas no prazo nos últimos 30 dias, atrasadas agora, justificativas de atraso e atividades aguardando algo.",
            "Em \"Carga por pessoa\", veja abertas, vencidas, que vencem hoje, dos próximos 7 dias e aguardando. A carga soma as abertas pelo peso da prioridade.",
            "Em \"Justificativas por motivo (30 dias)\", veja o que mais atrasa a equipe.",
            "Em \"Abertas por módulo\", veja onde está o trabalho aberto e quantas foram lançadas no SGO+ e no COMMAND."
          ]
        },
        {
          titulo: "Configurar os avisos (Admin e Diretoria)",
          itens: [
            "Toque em \"Avisos e horários\", no alto da tela.",
            "Confira o horário de trabalho, os dias de trabalho e os feriados estaduais, municipais e de recesso.",
            "Confira quem recebe o resumo pelo WhatsApp (padrão: só CLT). As horas do resumo do dia ficam em Administração > Matriz de avisos.",
            "Toque em \"Salvar\".",
            "Em \"Resumos de hoje\", veja para quem o resumo saiu, quem não tinha novidade e o motivo de quem não recebeu."
          ]
        }
      ],
      cores: [
        { nome: "Número vermelho no quadro \"Vencidas\"", significado: "Há atividades da equipe com prazo vencido." },
        { nome: "Número vermelho na coluna \"Vencidas\" do bloco Agora", significado: "Aquele colaborador tem atividades vencidas." },
        { nome: "\"Nenhuma marcada\" no bloco Agora", significado: "O colaborador tem atividades abertas, mas nenhuma marcada como \"fazendo agora\"." },
        { nome: "Justificativa com borda amarela", significado: "Justificativa de atraso registrada pelo responsável." },
        { nome: "Selos e situações", significado: "Os mesmos de Minhas atividades: \"Vencida\" vermelho, \"Vence hoje\" amarelo, \"Em dia\" verde." }
      ],
      problemas: [
        { situacao: "Aparece \"Não foi possível mudar a situação: a atividade é de\"", oQueFazer: "A atividade é de outra pessoa. Só o responsável, quem lançou e a gestão mudam a situação. Fale com o responsável." },
        { situacao: "Aparece \"Não foi possível montar o Gantt: o período está inválido.\"", oQueFazer: "Ajuste as datas \"Período de\" e \"até\". A data final precisa ser depois da inicial." },
        { situacao: "Aparece \"Nenhuma atividade no período e filtros escolhidos.\"", oQueFazer: "Aumente o período ou escolha \"Todas\" em \"Pessoa\" e \"Todos\" em \"Módulo\"." },
        { situacao: "Os blocos mostram \"Não carregou. Veja o aviso abaixo.\"", oQueFazer: "Confira a internet e toque em \"Tentar de novo\"." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,RH", pode: "Ver todas as atividades da equipe, inclusive as restritas, ler todas as justificativas, lançar para qualquer pessoa, editar, trocar responsável, replanejar, reabrir e cancelar." },
        { perfil: "FINANCEIRO", pode: "O mesmo da gestão, menos as atividades restritas (Programa de conduta) de outras pessoas." },
        { perfil: "TECNICO,METROLOGIA,COMERCIAL", pode: "Ver as atividades da equipe (menos as restritas de outras pessoas). Alteram só as próprias e as que lançaram. O texto das justificativas aparece só nas atividades em que estão envolvidos." },
        { perfil: "CLIENTE", pode: "Não usa esta tela." }
      ],
      perguntas: [
        { p: "O gestor é avisado da justificativa?", r: "Quem lançou a atividade é avisado. A justificativa também aparece em \"Justificativas recentes\"." },
        { p: "Por que não vejo uma atividade que um colega citou?", r: "Ela pode ser restrita ou do Programa de conduta. Essas só aparecem para os envolvidos e para a gestão." },
        { p: "As atividades do COMMAND aparecem aqui?", r: "Sim. A lista é a mesma nos dois sistemas. As lançadas pelo COMMAND têm o selo \"COMMAND\"." },
        { p: "Como vejo o que cada pessoa está fazendo?", r: "No bloco \"Agora\". A coluna \"Há\" mostra há quanto tempo a atividade está marcada." },
        { p: "Como calculo o percentual no prazo?", r: "O quadro \"Concluídas no prazo (30 dias)\" já mostra: quantas das concluídas nos últimos 30 dias terminaram até o prazo original." }
      ]
    },

    "atividades_equipe/gantt": {
      titulo: "Gráfico de barras no tempo (Gantt)",
      paraQueServe: "Mostra cada atividade como uma barra entre o início e o prazo, para ver sobreposições, adiamentos e atrasos da equipe.",
      passos: [
        {
          titulo: "Ler o gráfico",
          itens: [
            "Toque na aba \"Gantt\".",
            "Em \"Gantt por\", escolha \"Colaborador\" (uma linha por pessoa) ou \"Atividade\" (uma linha por atividade).",
            "Leia a legenda acima do gráfico.",
            "Deixe o ponteiro do mouse sobre a barra para ver situação, datas e andamento.",
            "Toque na barra para abrir o detalhe da atividade.",
            "Arraste o gráfico para o lado se o período for longo."
          ]
        }
      ],
      cores: [
        { nome: "Barra cinza claro, azul, amarelo escuro ou verde", significado: "Situação: A fazer, Em andamento, Aguardando e Concluída." },
        { nome: "Trecho listrado em amarelo escuro depois da barra", significado: "Previsão adiada por justificativa de atraso." },
        { nome: "Trecho vermelho com contorno vermelho", significado: "Atrasada: vencida até hoje." },
        { nome: "Trecho vermelho claro em barra verde", significado: "Concluída depois do prazo." },
        { nome: "Linha azul vertical com \"hoje\"", significado: "O dia de hoje." },
        { nome: "Ponto branco no começo da barra", significado: "Atividade marcada como \"fazendo agora\"." },
        { nome: "Faixa fina branca no pé da barra", significado: "Andamento registrado, em percentual." },
        { nome: "Colunas sombreadas", significado: "Sábados e domingos." }
      ]
    },

    "atividades_equipe/kanban": {
      titulo: "Quadro de cartões da equipe (Kanban)",
      paraQueServe: "Mostra as atividades da equipe em quatro colunas por situação, com o nome do responsável em cada cartão.",
      passos: [
        {
          titulo: "Mudar a situação pelo quadro",
          itens: [
            "Toque na aba \"Kanban\". Os cartões de outras pessoas, com borda tracejada, você só acompanha.",
            "Arraste o cartão para a coluna da nova situação.",
            "Ao soltar em \"Aguardando\", escreva o motivo e toque em \"Confirmar\".",
            "Toque no cartão para abrir o detalhe.",
            "Se arrastar não funcionar no seu aparelho, toque no cartão e use os botões do detalhe."
          ]
        }
      ],
      cores: [
        { nome: "Cartão com contorno vermelho", significado: "Atividade vencida." },
        { nome: "Texto verde \"Fazendo agora\" no cartão", significado: "O responsável está executando esta atividade, há o tempo mostrado." }
      ]
    },

    // ============================================================
    // AVISOS
    // ============================================================
    // 21/10/2026: Meus avisos (Minha conta > Avisos; SGO_Avisos_Matriz.js / JS_AvisosMatriz.html).
    "meus_avisos": {
      titulo: "Meus avisos",
      paraQueServe: "Mostra o que você recebe por e-mail e pelo WhatsApp e deixa ligar ou desligar o que é opcional. O obrigatório aparece com o motivo. Também mostra a prévia do seu e-mail de resumo de hoje.",
      antesDeComecar: [
        "No sistema você vê tudo na hora (Início e central de pendências). Isso não desliga.",
        "Por e-mail chega um resumo por dia útil (08:00 ou 12:00, você escolhe), só quando há algo para você.",
        "Pelo WhatsApp chega no máximo um resumo por dia (09:30), só se você é CLT e ainda não abriu o sistema. Durante o piloto, só quem está na lista do piloto recebe.",
        "Para receber, confira o seu e-mail e o seu celular no cadastro (peça ao Administrador, em Administração > Usuários)."
      ],
      passos: [
        { titulo: "Ajustar o que você recebe", itens: [
          "Toque em \"Meus avisos\" no menu Principal.",
          "Marque ou desmarque \"Receber o WhatsApp de resumo do dia\".",
          "Escolha a hora do e-mail de resumo: 08:00 ou 12:00.",
          "Se quiser, marque para receber no e-mail os avisos informativos (comentário, atividade concluída, venda ganha).",
          "Se quiser, tire do e-mail de resumo os avisos do Comercial, da Frota ou do Auvo. Eles continuam no sistema.",
          "Toque em \"Salvar\". Vale a partir do próximo resumo."
        ] },
        { titulo: "Ver como fica o seu resumo de hoje", itens: [
          "No bloco \"Como fica o seu resumo de hoje\", toque em \"Ver a prévia\".",
          "Leia o texto do e-mail com o que existe agora. Nada é enviado."
        ] }
      ],
      cores: [
        { nome: "Caixa de WhatsApp apagada", significado: "Você não é CLT, está sem vínculo informado ou o WhatsApp de resumo está desligado para todos. Você recebe pelo sistema e por e-mail." }
      ],
      problemas: [
        { situacao: "Não chega o e-mail de resumo", oQueFazer: "Confira se o seu cadastro tem e-mail (aviso em vermelho na tela). Dia sem nada para você não tem e-mail." },
        { situacao: "Não chega o WhatsApp de resumo", oQueFazer: "Ele só vai para CLT, só se você ainda não abriu o sistema no dia e só se há atividade para hoje, atrasada ou decisão parada. Durante o piloto, só para quem está na lista." },
        { situacao: "Quero parar de receber os avisos com ciência", oQueFazer: "Não é possível: a empresa precisa saber que você leu. Eles chegam no sistema e por e-mail." }
      ],
      quemPode: [
        { perfil: "TODOS", pode: "Cada pessoa altera só as próprias preferências. A gestão vê o que cada um escolheu, mas não altera." }
      ],
      perguntas: [
        { p: "Por que recebo menos e-mails?", r: "Desde a matriz de avisos (21/10/2026), os avisos de atividades, Comercial, reservas e Caixa de decisões vêm juntos num e-mail de resumo por dia. Na hora só chega o que exige ciência ou muda algo de hoje." },
        { p: "Vou receber WhatsApp do bate-papo?", r: "Não. O bate-papo fica no sistema. No resumo do dia vai só a contagem de mensagens não lidas." },
        { p: "E os lembretes do ponto?", r: "Ficam no Assistente do ponto, com regra própria. Ajuste lá, quando ele estiver ligado para você." }
      ]
    },
    "avisos": {
      titulo: "Avisos",
      paraQueServe: "Reúne os comunicados da gestão. Cada aviso precisa da sua confirmação de leitura no botão \"Li e estou ciente\". A gestão publica avisos e acompanha quem leu.",
      antesDeComecar: [
        "Ao entrar no SGO+, os avisos que esperam a sua ciência abrem sozinhos em uma janela.",
        "Depois, o SGO+ confere a cada 5 minutos se chegou aviso novo. Se você estiver preenchendo um formulário, a janela espera.",
        "O número vermelho ao lado de \"Avisos\" no menu mostra quantos avisos aguardam a sua ciência.",
        "Abra a tela pelo menu, no grupo Principal, em \"Avisos\"."
      ],
      passos: [
        {
          titulo: "Ler e confirmar um aviso",
          itens: [
            "Leia o título e o texto do aviso na janela.",
            "Confira o prazo, se houver: \"Confirme a leitura até\".",
            "Toque nas miniaturas de imagem para ampliar. Toque de novo para fechar.",
            "Toque no nome do documento anexo para baixar.",
            "Toque em \"Li e estou ciente\". O SGO+ registra a data e a hora.",
            "Se houver mais de um aviso, o próximo aparece em seguida."
          ]
        },
        {
          titulo: "Deixar para depois",
          itens: [
            "Toque em \"Ver depois\" ou em \"Ver depois e ir ao próximo\".",
            "O aviso volta a aparecer na próxima entrada.",
            "Para ler antes, abra \"Avisos\" no menu e toque em \"Ler e confirmar\"."
          ]
        },
        {
          titulo: "Rever um aviso já lido",
          itens: [
            "Abra \"Avisos\" no menu.",
            "Na aba \"Para mim\", encontre o aviso.",
            "Toque em \"Abrir\".",
            "Toque em \"Fechar\" depois de ler."
          ]
        },
        {
          titulo: "Publicar um aviso (gestão)",
          itens: [
            "Toque em \"Novo aviso\".",
            "Escreva o \"Título\" (mínimo 3 letras).",
            "Escreva o \"Texto\". As quebras de linha são mantidas.",
            "Escolha a \"Importância\": Normal ou Importante.",
            "Escolha o \"Prazo para ciência\", se quiser.",
            "Em \"Público\", escolha \"Todos os usuários ativos\", \"Por perfil\" ou \"Pessoas escolhidas\" e marque quem recebe.",
            "Em \"Anexos\", escolha imagens ou documentos, se precisar. Toque em \"Tirar\" para retirar um arquivo da lista.",
            "Toque em \"Publicar\".",
            "Leia a confirmação: quantas pessoas recebem a janela e o e-mail. Não vai WhatsApp avulso: quem é CLT vê a contagem no resumo do dia.",
            "Confirme para publicar. Os envios saem na hora e não podem ser desfeitos."
          ]
        },
        {
          titulo: "Acompanhar quem leu (gestão)",
          itens: [
            "Toque na aba \"Publicados\".",
            "Confira em \"Leitura\" quantas pessoas leram.",
            "Toque em \"Quem leu\" para ver a lista de quem leu e de quem não leu.",
            "Toque em \"Ver o texto do aviso\" para relembrar o conteúdo.",
            "Toque em \"Reenviar a quem não leu\" para mandar de novo por e-mail a quem falta (uma vez por dia).",
            "Toque em \"Arquivar\" quando o aviso não for mais necessário. Para voltar, marque \"Mostrar arquivados\" e toque em \"Reativar\"."
          ]
        }
      ],
      cores: [
        { nome: "Selo vermelho \"Importante\"", significado: "Aviso marcado como importante pela gestão." },
        { nome: "Selo cinza \"Normal\" na janela", significado: "Aviso de importância normal." },
        { nome: "Selo amarelo \"Aguardando sua ciência\"", significado: "Você ainda não confirmou a leitura." },
        { nome: "Selo verde \"Lido em\"", significado: "Você confirmou a leitura na data e hora mostradas." },
        { nome: "Cartão com borda amarela à esquerda", significado: "Aviso pendente de ciência." },
        { nome: "Cartão com borda vermelha à esquerda", significado: "Aviso importante pendente de ciência." },
        { nome: "Prazo em vermelho com \"(prazo vencido)\"", significado: "O prazo para confirmar a leitura já passou. Confirme o quanto antes." },
        { nome: "Selo cinza \"Arquivado em\"", significado: "Aviso arquivado. Não aparece mais para quem não leu." },
        { nome: "Barra verde em \"Leitura\"", significado: "Parte do público que já confirmou." },
        { nome: "\"Leram\" em verde e \"Não leram\" em vermelho", significado: "Listas da janela \"Quem leu\"." },
        { nome: "Número vermelho ao lado de \"Avisos\" no menu", significado: "Quantidade de avisos aguardando a sua ciência." }
      ],
      problemas: [
        { situacao: "A janela do aviso aparece toda vez que entro", oQueFazer: "Toque em \"Li e estou ciente\". Ela volta enquanto a leitura não for confirmada." },
        { situacao: "Aparece \"Não foi possível registrar a ciência: este aviso não foi enviado para você.\"", oQueFazer: "Atualize a lista de avisos. O aviso pode ter sido arquivado ou o público mudou." },
        { situacao: "A miniatura mostra \"Não carregou\"", oQueFazer: "Feche e abra o aviso de novo. Se continuar, avise a gestão." },
        { situacao: "Aparece \"o arquivo não foi encontrado na pasta\"", oQueFazer: "Avise a gestão para publicar o aviso de novo com o anexo." },
        { situacao: "Aparece \"Não foi possível publicar: escreva o título do aviso (mínimo 3 letras).\"", oQueFazer: "Preencha o campo \"Título\" e toque em \"Publicar\" de novo." },
        { situacao: "Aparece \"marque pelo menos um perfil\" ou \"marque pelo menos uma pessoa\"", oQueFazer: "Marque quem recebe em \"Público\", ou escolha \"Todos os usuários ativos\"." },
        { situacao: "Aparece \"o limite é 6 anexos por aviso\"", oQueFazer: "Tire algum arquivo da lista ou junte os documentos em um PDF." },
        { situacao: "Aparece \"passa de 10 MB\" ou \"os anexos somam mais de 20 MB\"", oQueFazer: "Reduza o arquivo ou divida em partes. Imagens grandes já são reduzidas sozinhas." },
        { situacao: "Aparece \"o prazo de ciência já passou\"", oQueFazer: "Escolha hoje ou uma data futura, ou deixe o campo vazio." },
        { situacao: "Aparece \"Este aviso já tinha sido publicado por você há menos de 10 minutos\"", oQueFazer: "O aviso não foi enviado de novo. Ele já está em \"Publicados\"." },
        { situacao: "Aparece \"Não foi possível reenviar agora: este aviso já foi reenviado às\"", oQueFazer: "Aguarde 10 minutos e toque em \"Reenviar a quem não leu\" de novo." },
        { situacao: "Aparece \"Não foi possível reenviar: o aviso está arquivado.\"", oQueFazer: "Marque \"Mostrar arquivados\", toque em \"Reativar\" e depois reenvie." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,RH,FINANCEIRO", pode: "Ler e confirmar os próprios avisos, publicar avisos, ver quem leu, reenviar a quem não leu, arquivar e reativar." },
        { perfil: "TECNICO,METROLOGIA,COMERCIAL", pode: "Ler os avisos recebidos, abrir os anexos e confirmar a leitura." },
        { perfil: "CLIENTE", pode: "Não recebe avisos. Os avisos são internos da equipe." }
      ],
      perguntas: [
        { p: "Recebo o aviso fora do SGO+?", r: "Sim, por e-mail, para quem tem e-mail no cadastro (no expediente). Pela matriz de avisos não vai WhatsApp avulso: quem é CLT vê a contagem de avisos para confirmar no WhatsApp de resumo do dia." },
        { p: "Fechei sem confirmar. Perdi o aviso?", r: "Não. Ele volta na próxima entrada e fica na tela \"Avisos\", com o botão \"Ler e confirmar\"." },
        { p: "A gestão vê se eu abri e não confirmei?", r: "Sim. Em \"Quem leu\" aparece quantas vezes a pessoa viu o aviso sem confirmar." },
        { p: "Arquivar apaga o registro de leitura?", r: "Não. O aviso deixa de aparecer para quem não leu, mas o registro de quem leu continua guardado." },
        { p: "Que arquivos posso anexar?", r: "Imagens (PNG, JPG, GIF, WEBP) e documentos (PDF, Word, Excel, PowerPoint, TXT, CSV, ODT, ODS). Até 6 arquivos, 10 MB cada, 20 MB no total." }
      ]
    },

    "avisos/publicados": {
      titulo: "Publicados (gestão)",
      paraQueServe: "Lista os avisos publicados, com o público, o prazo de ciência e quantas pessoas já leram.",
      passos: [
        {
          titulo: "Conferir a leitura",
          itens: [
            "Toque na aba \"Publicados\".",
            "Leia na coluna \"Público\" quem recebeu: \"Todos os usuários\", \"Perfis\" ou \"Pessoas escolhidas\".",
            "Confira em \"Prazo de ciência\" se o prazo venceu e quantos ainda não leram.",
            "Leia em \"Leitura\" o total de quem leu.",
            "Toque em \"Quem leu\" para ver os nomes.",
            "Marque \"Mostrar arquivados\" para ver também os avisos arquivados."
          ]
        }
      ],
      cores: [
        { nome: "\"vencido, N sem ler\" em vermelho", significado: "O prazo de ciência passou e ainda falta gente confirmar." },
        { nome: "\"Viu N vez(es) sem confirmar\"", significado: "A pessoa viu a janela, mas não tocou em \"Li e estou ciente\"." },
        { nome: "\"Ainda não abriu o SGO+ desde a publicação\"", significado: "A pessoa não entrou no sistema depois do aviso." },
        { nome: "\"(inativo)\" ao lado do nome", significado: "O usuário foi desativado depois da publicação." }
      ]
    }
  };
}
