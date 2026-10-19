/****************************************************
 * AJUDA "COMO USAR ESTA TELA" — GRUPO ADMINISTRACAO (17/10/2026)
 * Contrato: docs/AJUDA_CONTRATO_20261017.md
 * Telas: Usuários (usuarios), Configurações (admin), Chaves e senhas (chaves).
 * Texto conferido com JS_Admin.html, JS_Chaves.html, JS_Cadastros.html,
 * SGO_Usuarios.js e SGO_Chaves.js. Texto puro, sem HTML.
 ****************************************************/
function SGO_ajudaTelas_Administracao_() {
  return {
    "usuarios": {
      titulo: "Usuários",
      paraQueServe: "Cria e mantém as contas de acesso ao SGO+. Em cada conta ficam o perfil, o vínculo de trabalho (CLT ou PJ), a situação, o e-mail, o celular (WhatsApp) e o último acesso da pessoa.",
      antesDeComecar: [
        "Esta tela é usada pela gestão: Administrador, Gestor e Diretoria. O perfil RH também abre a tela, só para consultar (sem criar nem alterar contas). Os demais perfis não veem o item \"Usuários\" no menu.",
        "Área (Comercial, Financeiro, RH, Técnica/Campo e as demais): preenchida uma vez no cadastro e lida pelo Programa de conduta, pelos indicadores de qualidade e pelos relatórios. Quem está sem área aparece como \"Sem área definida\" nesses lugares.",
        "Vínculo de trabalho: mensagens do ponto só vão para quem é CLT. Quem é PJ ou está como \"Não informado\" não recebe mensagens do ponto; os outros avisos (WhatsApp e e-mail) chegam para todos, inclusive PJ.",
        "Tenha em mãos o nome completo, o e-mail e o celular com DDD da pessoa.",
        "Escolha o perfil certo antes de cadastrar. O perfil define o que a pessoa vê e faz no sistema.",
        "Para um usuário do perfil Cliente, a empresa dele precisa estar cadastrada e ativa em Clientes.",
        "Combine a senha inicial com a pessoa por um canal seguro. Nunca envie a senha em grupo ou por mensagem aberta."
      ],
      passos: [
        {
          titulo: "Abrir a tela",
          itens: [
            "Toque em \"Usuários\" no menu, no grupo de administração.",
            "Outra forma: em \"Configurações\", no bloco \"Empresa e sistema\", toque em \"Usuários e perfis\".",
            "Confira os números do resumo no topo: \"Total\", \"Ativos\", \"Inativos\", \"Sem celular (ativos)\", \"Administração e gestão\", \"Sem vínculo (ativos)\", \"Sem área (ativos)\" e \"Nunca entraram\"."
          ]
        },
        {
          titulo: "Cuidar das áreas (gestão e RH)",
          itens: [
            "Toque em \"Áreas\", no alto da tela de Usuários.",
            "A faixa diz quantas pessoas ativas estão sem área. Em \"Sem área\", escolha a área de cada uma: grava na hora.",
            "Em \"Pessoas e áreas\", troque a área de qualquer pessoa. É o mesmo que trocar no cadastro.",
            "Para criar uma área, toque em \"Nova área\", escreva o nome e toque em \"Criar área\".",
            "Para corrigir o nome, toque em \"Editar\" na linha da área. As pessoas continuam nela.",
            "Para tirar uma área da lista, toque em \"Inativar\". Só é possível quando ninguém ativo está nela; nada é apagado.",
            "Na primeira vez, o SGO+ preencheu a área de quem estava sem ela pelo perfil de acesso (Comercial, Financeiro, RH, Diretoria, Metrologia, Técnico). Administrador e Gestor não dizem a área: escolha na lista."
          ]
        },
        {
          titulo: "Encontrar um usuário",
          itens: [
            "Digite no campo de busca o nome, o login, o e-mail ou o celular.",
            "Para ver só um grupo, toque no número do resumo. Exemplo: toque em \"Sem celular (ativos)\".",
            "Toque de novo no mesmo número para desfazer o filtro.",
            "Use a lista \"Todos os perfis\" para ver só um perfil.",
            "Use a lista \"Todas as situações\" para ver só ativos ou só inativos.",
            "Use a lista \"Todos os vínculos\" para ver só CLT, só PJ ou só quem está como \"Não informado\".",
            "Use a lista \"Todas as áreas\" para ver uma área ou quem está \"Sem área\".",
            "Use a ordenação para escolher entre \"Ordenar por nome\" e \"Último acesso mais recente\".",
            "Toque em \"Limpar filtros\" para voltar à lista completa. Esse botão só aparece quando há filtro ativo."
          ]
        },
        {
          titulo: "Cadastrar um usuário novo",
          itens: [
            "Toque em \"Novo usuário\", à direita da barra de busca.",
            "Preencha \"Nome completo\".",
            "Preencha \"Login (nome de usuário)\" em letras minúsculas, sem espaço. Exemplo: joao.silva.",
            "Preencha \"E-mail\". O e-mail é obrigatório e recebe os avisos do sistema.",
            "Preencha \"Celular (WhatsApp)\" com DDD. O sistema coloca a máscara sozinho.",
            "Em \"Trabalho\", escolha a \"Área\" da pessoa. Ao escolher um perfil que diz a área (Comercial, Financeiro, RH, Diretoria, Metrologia, Técnico), ela já vem marcada se o campo estiver vazio; confira.",
            "Em \"Trabalho\", escolha o \"Vínculo de trabalho\": CLT, PJ ou Não informado. Para Cliente, deixe \"Não informado\".",
            "Escolha o \"Perfil de acesso\". Para quem cuida do RH, escolha \"RH\". Para a direção da empresa, escolha \"Diretoria\" (só aparece para Administrador e Diretoria).",
            "Se escolheu o perfil Cliente, escolha a \"Empresa (cliente)\".",
            "Preencha a \"Senha inicial\" com pelo menos 6 caracteres.",
            "Toque em \"Cadastrar usuário\".",
            "Aguarde a mensagem \"Usuário ... cadastrado.\". O painel de detalhe da conta abre em seguida."
          ]
        },
        {
          titulo: "Ver os detalhes de uma conta",
          itens: [
            "Toque na linha do usuário (ou no cartão, no celular).",
            "Confira no painel as seções \"Identificação\", \"Contato\", \"Trabalho\" (vínculo de trabalho) e \"Acesso\".",
            "Em \"Acesso\", confira o perfil, a empresa (se for Cliente), o último acesso e a data do cadastro.",
            "Para fechar, toque fora do painel ou aperte a tecla Esc. No celular, toque em Voltar."
          ]
        },
        {
          titulo: "Editar uma conta",
          itens: [
            "Toque em \"Editar\" na linha do usuário ou no rodapé do painel de detalhe.",
            "Altere só o que precisa. Os campos que você não mexer ficam como estavam (o vínculo de trabalho também).",
            "Toque em \"Salvar alterações\".",
            "Se mudou o perfil, avise a pessoa: o perfil novo vale em até 5 minutos ou no próximo login.",
            "Para desistir, toque em \"Cancelar\". Se já digitou algo, o sistema pergunta se quer fechar sem salvar."
          ]
        },
        {
          titulo: "Redefinir a senha",
          itens: [
            "Toque em \"Mais\" na linha do usuário. No painel de detalhe, toque em \"Mais ações\".",
            "Toque em \"Redefinir senha\".",
            "Digite a senha nova em \"Senha nova\", com pelo menos 6 caracteres.",
            "Digite a mesma senha em \"Repita a senha nova\".",
            "Toque em \"Gravar senha nova\". A senha antiga deixa de valer na hora.",
            "Combine a senha nova com a pessoa por um canal seguro e peça para ela trocar no primeiro acesso."
          ]
        },
        {
          titulo: "Bloquear ou liberar o acesso",
          itens: [
            "Para bloquear, toque em \"Mais\" e depois em \"Inativar (bloquear o acesso)\".",
            "Leia a confirmação e toque em \"Bloquear o acesso\".",
            "A sessão aberta da pessoa é encerrada em até 5 minutos. O histórico dela fica guardado.",
            "Para liberar de novo, toque em \"Mais\" e depois em \"Reativar (liberar o acesso)\".",
            "Confira o perfil mostrado na confirmação e toque em \"Liberar o acesso\"."
          ]
        },
        {
          titulo: "Excluir uma conta",
          itens: [
            "Prefira inativar. A exclusão não pode ser desfeita.",
            "Toque em \"Mais\" e depois em \"Excluir usuário\".",
            "Leia a confirmação e toque em \"Excluir definitivamente\"."
          ]
        }
      ],
      cores: [
        { nome: "Selo verde \"Ativo\"", significado: "A conta pode entrar no SGO+." },
        { nome: "Selo cinza \"Inativo\"", significado: "O acesso está bloqueado. A conta e o histórico continuam guardados. Para liberar, use \"Mais\" e \"Reativar (liberar o acesso)\"." },
        { nome: "Selo azul \"Você\"", significado: "É a sua própria conta. Você não pode inativar nem excluir a si mesmo." },
        { nome: "Selo amarelo \"Sem celular\"", significado: "A pessoa não tem celular cadastrado. Ela não recebe avisos por WhatsApp e não usa o Assistente do ponto do COMMAND. Toque em \"Editar\" e informe o celular com DDD." },
        { nome: "Selo azul \"CLT\" ou \"PJ\" na coluna Vínculo", significado: "Vínculo de trabalho informado. Só quem é CLT recebe as mensagens do ponto." },
        { nome: "\"Não informado\" na coluna Vínculo", significado: "Ninguém informou se a pessoa é CLT ou PJ. Ela não recebe mensagens do ponto até a gestão escolher o vínculo em \"Editar\"." },
        { nome: "Número amarelo \"Sem vínculo (ativos)\" no resumo", significado: "Quantas contas ativas da equipe estão sem CLT ou PJ. Toque no número para ver quais são." },
        { nome: "Selo amarelo \"Sem e-mail\"", significado: "A conta não tem e-mail. O e-mail é obrigatório: toque em \"Editar\" e preencha." },
        { nome: "\"Não informado\" no celular de um usuário Cliente", significado: "O celular é opcional para o perfil Cliente. Por isso não aparece em destaque." },
        { nome: "\"Nunca entrou\" no último acesso", significado: "Não há registro de entrada recente desta conta. Confira se a pessoa recebeu o login e a senha." },
        { nome: "Número amarelo \"Sem celular (ativos)\" no resumo", significado: "Quantas contas ativas, fora do perfil Cliente, estão sem celular. Toque no número para ver quais são." },
        { nome: "Número verde \"Ativos\" no resumo", significado: "Quantas contas podem entrar hoje. Toque para filtrar." },
        { nome: "Faixa amarela no painel de detalhe", significado: "Avisa que a conta ativa está sem celular e diz o que fazer." },
        { nome: "Faixa azul no painel de detalhe", significado: "Avisa que é uma conta de Administrador: só outro Administrador pode alterar, redefinir a senha, inativar ou excluir." },
        { nome: "Faixa cinza \"Acesso bloqueado (inativo)\"", significado: "A conta está inativa. Para liberar, use \"Mais\" e \"Reativar\"." },
        { nome: "Opções em vermelho no menu \"Mais\"", significado: "São ações de risco (inativar e excluir). Sempre pedem confirmação." },
        { nome: "Opção apagada (cinza) no menu \"Mais\"", significado: "A ação não é permitida para esta conta. O motivo aparece logo abaixo da opção." }
      ],
      problemas: [
        { situacao: "Aparece \"Este login já é de ...\" ou \"Já existe uma conta com este nome de usuário (login).\"", oQueFazer: "Outro usuário já usa esse login. Escolha um login diferente, por exemplo com o sobrenome." },
        { situacao: "Aparece \"Já existe outra conta usando este e-mail.\"", oQueFazer: "Cada e-mail só pode estar em uma conta. Busque o e-mail na lista: a pessoa talvez já tenha conta, ativa ou inativa." },
        { situacao: "Aparece \"Use só letras sem acento, números, ponto, hífen ou sublinhado.\"", oQueFazer: "Tire acentos, espaços e outros sinais do login. Exemplo: joao.silva." },
        { situacao: "Aparece \"E-mail inválido: confira o formato (nome@empresa.com.br).\"", oQueFazer: "Confira se o e-mail tem @ e o domínio completo, sem espaço." },
        { situacao: "Aparece \"Celular inválido: DDD + número, no formato (11) 98765-4321, ou deixe vazio.\"", oQueFazer: "Digite o DDD e o número completo. Se a pessoa não tem celular, deixe o campo vazio." },
        { situacao: "Aparece \"Escolha a empresa do usuário Cliente.\"", oQueFazer: "Com o perfil Cliente, escolha a empresa na lista \"Empresa (cliente)\". Se a empresa não aparece, ela não está ativa em Clientes: peça o cadastro dela primeiro." },
        { situacao: "Aparece \"A senha inicial precisa ter pelo menos 6 caracteres.\" ou \"A senha nova precisa ter pelo menos 6 caracteres.\"", oQueFazer: "Digite uma senha com 6 caracteres ou mais." },
        { situacao: "Aparece \"As duas senhas não são iguais. Digite de novo.\"", oQueFazer: "Digite a mesma senha nos dois campos da janela \"Redefinir a senha\"." },
        { situacao: "O perfil Administrador não aparece na lista de perfis", oQueFazer: "Só um Administrador pode dar o perfil Administrador. Peça a um Administrador." },
        { situacao: "O perfil Diretoria não aparece na lista de perfis", oQueFazer: "O perfil Diretoria é dado só por um Administrador ou pela Diretoria. Peça a um Administrador." },
        { situacao: "Aparece \"Não foi possível ...: contas de Administrador só podem ser criadas ou alteradas por um Administrador.\"", oQueFazer: "A conta é de Administrador. Peça a um Administrador para fazer a alteração." },
        { situacao: "Aparece \"Não foi possível ...: o perfil Diretoria só é dado ou alterado por um Administrador ou pela Diretoria.\"", oQueFazer: "A Diretoria decide no Programa de conduta a ocorrência em que é a envolvida, por isso um Gestor não dá esse perfil nem altera essa conta. Peça a um Administrador. Para dar o perfil: Usuários, Novo usuário ou Editar, campo \"Perfil de acesso\", opção \"Diretoria\"." },
        { situacao: "A linha não tem o botão \"Editar\"", oQueFazer: "É uma conta de Administrador e você não é Administrador. Peça a um Administrador." },
        { situacao: "Aparece \"Único Administrador ativo: cadastre ou reative outro antes.\"", oQueFazer: "O sistema não pode ficar sem Administrador ativo. Cadastre ou reative outro Administrador e depois repita a ação." },
        { situacao: "Aparece \"Você não pode inativar nem excluir a sua própria conta.\"", oQueFazer: "Peça a outra pessoa da gestão para fazer isso na sua conta." },
        { situacao: "Aparece \"Usuário não encontrado: pode ter sido alterado por outra pessoa. Atualize a lista.\"", oQueFazer: "Outra pessoa mexeu na conta ao mesmo tempo. Saia e entre de novo na tela \"Usuários\" e confira." },
        { situacao: "Aparece \"Vínculo de trabalho inválido: escolha CLT, PJ ou Não informado.\"", oQueFazer: "Escolha uma das três opções da lista \"Vínculo de trabalho\" e salve de novo." },
        { situacao: "Sou do RH e não vejo \"Novo usuário\", \"Editar\" nem \"Mais\"", oQueFazer: "O perfil RH só consulta a lista. Para criar uma conta, trocar o perfil, o vínculo ou a senha, peça a um Administrador, Gestor ou Diretoria." },
        { situacao: "A tela mostra \"A gestão de usuários é feita pelos perfis Administrador, Gestor e Diretoria.\"", oQueFazer: "O seu perfil não gerencia contas. Para criar uma conta, trocar o perfil ou redefinir a senha, peça a um Administrador, Gestor ou Diretoria." },
        { situacao: "A lista de empresas aparece como \"A lista de clientes não carregou\"", oQueFazer: "Verifique a conexão, feche o formulário e abra de novo." },
        { situacao: "A pessoa inativada ainda está usando o sistema", oQueFazer: "Aguarde até 5 minutos. A sessão aberta dela é encerrada nesse prazo." }
      ],
      quemPode: [
        { perfil: "ADMIN", pode: "Criar, editar, redefinir a senha, inativar, reativar e excluir qualquer conta, inclusive de Administrador. Dar o perfil Administrador." },
        { perfil: "GESTOR,DIRETORIA", pode: "Criar, editar, redefinir a senha, inativar, reativar e excluir contas que não sejam de Administrador. Não dão o perfil Administrador." },
        { perfil: "RH", pode: "Consultar a lista, os filtros e o detalhe de cada conta (vínculo de trabalho, celular, e-mail, situação e último acesso). Não cria, não edita, não redefine senha, não inativa e não exclui." },
        { perfil: "TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Não usam esta tela. Para criar conta, trocar perfil ou redefinir senha, peçam à gestão." },
        { perfil: "CLIENTE", pode: "Não usa esta tela. Para acesso de mais alguém da sua empresa, peça à Metrolabs." },
        { perfil: "TODOS", pode: "Ninguém inativa ou exclui a própria conta. O sistema nunca fica sem um Administrador ativo." }
      ],
      perguntas: [
        { p: "Qual a diferença entre inativar e excluir?", r: "Inativar bloqueia o acesso e guarda a conta e o histórico; dá para reativar depois. Excluir apaga a conta e não pode ser desfeito. Prefira inativar." },
        { p: "Por que o celular é importante?", r: "O celular é usado nos avisos por WhatsApp e pelo Assistente do ponto do COMMAND. Sem ele, a pessoa não recebe esses avisos." },
        { p: "Consigo ver a senha atual de alguém?", r: "Não. A senha nunca aparece. Use \"Redefinir senha\" para gravar uma nova." },
        { p: "Onde troco a senha no formulário de edição?", r: "A senha não fica no formulário de edição. Use \"Mais\" e depois \"Redefinir senha\"." },
        { p: "Por que aparece \"Nunca entrou\" para quem já usou o sistema?", r: "O último acesso vem do registro recente de entradas. Uma entrada muito antiga pode não aparecer. Quando a pessoa entrar de novo, a data é atualizada." },
        { p: "Quando o perfil novo começa a valer?", r: "Em até 5 minutos ou no próximo login da pessoa." },
        { p: "O que o perfil Cliente vê?", r: "Só os dados da empresa escolhida em \"Empresa (cliente)\"." }
      ]
    },

    "admin": {
      titulo: "Configurações",
      paraQueServe: "Reúne os ajustes do SGO+ separados por assunto. Cada bloco tem título, explicação curta e o próprio botão de salvar.",
      antesDeComecar: [
        "Abra pelo item \"Configurações\" do menu, no grupo de administração.",
        "Os blocos que aparecem dependem do seu perfil. O bloco \"Alertas de calibração\" só aparece para o Administrador.",
        "O bloco \"Sessão e ociosidade\" vale só para o navegador que você está usando.",
        "Cada bloco salva sozinho. Salvar um bloco não salva os outros."
      ],
      passos: [
        {
          titulo: "Ajustar o aviso de tela parada (Sessão e ociosidade)",
          itens: [
            "No bloco \"Sessão e ociosidade\", preencha \"Avisar depois de (minutos sem uso)\".",
            "Use vírgula para meio minuto. Exemplo: 2,5.",
            "Ligue ou desligue a chave \"Som do aviso\". O texto ao lado mostra \"Ligado\" ou \"Desligado\".",
            "Toque em \"Testar o som\" para ouvir o aviso.",
            "Toque em \"Salvar\" do bloco.",
            "Confira a mensagem \"Salvo: aviso depois de ... minutos, som ...\"."
          ]
        },
        {
          titulo: "Sair e recarregar (quando a tela travar)",
          itens: [
            "No bloco \"Sessão neste navegador\", toque em \"Sair e recarregar\".",
            "Leia a confirmação e toque em \"Sair e recarregar\" de novo.",
            "Entre com o seu login e senha. Os dados salvos não são afetados."
          ]
        },
        {
          titulo: "Ir para outras telas de configuração (Empresa e sistema)",
          itens: [
            "No bloco \"Empresa e sistema\", confira o nome do sistema, a versão e o seu acesso.",
            "Toque em \"Usuários e perfis\" para abrir a tela de usuários (só para a gestão).",
            "Toque em \"Chaves e senhas das integrações\" para abrir essa tela (só para o responsável pelo sistema).",
            "Toque em \"Padrões de referência\" para abrir a lista de padrões."
          ]
        },
        {
          titulo: "Configurar os alertas de calibração (só Administrador)",
          itens: [
            "No bloco \"Alertas de calibração\", ligue ou desligue a chave \"Alertas ligados\".",
            "Em \"Quem recebe\", marque \"Gestor\", \"Metrologia\" ou os dois.",
            "Preencha \"Horário inicial\" e \"Horário final\" do período em que os lembretes aparecem.",
            "Preencha \"Avisar antes do vencimento (dias)\", de 1 a 365.",
            "Preencha \"Repetir o lembrete a cada (minutos)\", de 15 a 720.",
            "Preencha \"Tempo visível do lembrete (segundos)\", de 5 a 120.",
            "Ligue ou desligue \"Mostrar quando houver padrão vencido\" para a janela no centro da tela.",
            "Preencha \"Repetir a janela a cada (minutos)\", de 30 a 1440.",
            "Escreva a \"Mensagem da janela\", com até 240 caracteres.",
            "Toque em \"Salvar\" do bloco e aguarde a confirmação.",
            "Toque em \"Testar agora\" para ver a janela como ela vai aparecer."
          ]
        }
      ],
      cores: [
        { nome: "Chave \"Som do aviso\" com \"Ligado\"", significado: "O aviso de tela parada toca um som. Com \"Desligado\", o aviso aparece sem som." },
        { nome: "Mensagem \"Alteração ainda não salva.\"", significado: "Você mudou a chave do som e ainda não tocou em \"Salvar\"." },
        { nome: "Mensagem verde ao lado do botão", significado: "O bloco foi salvo." },
        { nome: "Mensagem vermelha ao lado do botão", significado: "Não foi possível salvar ou carregar. Leia a mensagem e tente de novo." },
        { nome: "Selo verde \"Ligados\" (Alertas de calibração)", significado: "Os lembretes de vencimento dos padrões estão ligados." },
        { nome: "Selo cinza \"Desligados\" (Alertas de calibração)", significado: "Ninguém recebe os lembretes de vencimento dos padrões." }
      ],
      problemas: [
        { situacao: "Aparece \"Informe pelo menos meio minuto (0,5).\"", oQueFazer: "Digite um tempo de 0,5 minuto ou mais, com vírgula se for fração." },
        { situacao: "A tela ficou travada depois de uma atualização do sistema", oQueFazer: "Use \"Sair e recarregar\" no bloco \"Sessão neste navegador\" e entre de novo." },
        { situacao: "O tempo de ociosidade voltou ao que era em outro computador", oQueFazer: "Esse ajuste vale só para o navegador onde foi salvo. Ajuste e salve em cada navegador." },
        { situacao: "Aparece \"Não foi possível carregar as configurações. Verifique a conexão e atualize a página.\"", oQueFazer: "Confira a internet e atualize a página (tecla F5)." },
        { situacao: "Aparece \"Não foi possível salvar. Verifique a conexão e tente de novo; nada foi alterado.\"", oQueFazer: "Confira a internet e toque em \"Salvar\" de novo. Nada foi gravado." },
        { situacao: "Ao tocar em \"Testar agora\" aparece \"Nenhum padrão vencido ou vencendo agora: não há o que mostrar no teste.\"", oQueFazer: "Está tudo em dia. A janela só aparece quando há padrão vencido ou vencendo." },
        { situacao: "Não vejo o bloco \"Alertas de calibração\"", oQueFazer: "Esse bloco é só do Administrador. Peça a ele a alteração." },
        { situacao: "Não vejo os botões \"Usuários e perfis\" ou \"Chaves e senhas das integrações\"", oQueFazer: "\"Usuários e perfis\" é da gestão (Administrador, Gestor e Diretoria). \"Chaves e senhas das integrações\" é só do responsável pelo sistema." }
      ],
      quemPode: [
        { perfil: "ADMIN", pode: "Usar todos os blocos, inclusive \"Alertas de calibração\"." },
        { perfil: "GESTOR,DIRETORIA", pode: "Ajustar a sessão e a ociosidade, sair e recarregar e usar os atalhos para Usuários e Padrões." },
        { perfil: "TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Ajustar a sessão e a ociosidade, sair e recarregar e usar o atalho para Padrões." },
        { perfil: "RH", pode: "Não usa esta tela: o item \"Configurações\" não aparece no menu do RH." },
        { perfil: "CLIENTE", pode: "Não vê o grupo de administração no menu." },
        { perfil: "TODOS", pode: "O atalho \"Chaves e senhas das integrações\" só aparece para o responsável pelo sistema." }
      ],
      perguntas: [
        { p: "O tempo de ociosidade vale para todo mundo?", r: "Não. Vale só para o navegador onde você salvou." },
        { p: "\"Sair e recarregar\" apaga algum dado?", r: "Não. Só encerra a sua sessão neste navegador e recarrega a página. Você entra de novo com o seu login." },
        { p: "Quem recebe os alertas de calibração?", r: "Os perfis marcados em \"Quem recebe\" (Gestor, Metrologia ou os dois), dentro do horário configurado." },
        { p: "Preciso salvar todos os blocos de uma vez?", r: "Não. Cada bloco tem o próprio botão e salva só o que está nele." }
      ]
    },

    "admin/alertas_calibracao": {
      titulo: "Alertas de calibração",
      paraQueServe: "Lembra Gestor e Metrologia dos padrões de referência vencidos ou perto de vencer: um balão discreto e, se ligada, uma janela no centro da tela.",
      antesDeComecar: [
        "Só o Administrador vê e altera este bloco.",
        "Os lembretes usam a validade cadastrada em \"Padrões de referência\"."
      ],
      passos: [
        {
          titulo: "Ligar e ajustar os lembretes",
          itens: [
            "Ligue a chave \"Alertas ligados\".",
            "Marque quem recebe: \"Gestor\" e ou \"Metrologia\".",
            "Ajuste os horários, a antecedência em dias e os intervalos.",
            "Toque em \"Salvar\".",
            "Toque em \"Testar agora\" para conferir a janela."
          ]
        }
      ],
      cores: [
        { nome: "Selo verde \"Ligados\"", significado: "Os lembretes estão ativos." },
        { nome: "Selo cinza \"Desligados\"", significado: "Os lembretes estão parados para todos." }
      ],
      problemas: [
        { situacao: "Ninguém recebe os lembretes", oQueFazer: "Confira se \"Alertas ligados\" está ligado, se algum perfil está marcado em \"Quem recebe\" e se o horário atual está entre o inicial e o final." }
      ],
      quemPode: [
        { perfil: "ADMIN", pode: "Ver, alterar e testar os alertas de calibração." },
        { perfil: "GESTOR,METROLOGIA", pode: "Receber os lembretes, quando marcados em \"Quem recebe\"." }
      ]
    },

    "chaves": {
      titulo: "Chaves e senhas",
      paraQueServe: "Guarda as chaves de acesso das integrações (inteligência artificial, Auvo, e-mail, WhatsApp, rastreador da frota, COMMAND) e as senhas administrativas dos relatórios técnicos. Mostra a situação de cada integração e permite testar.",
      antesDeComecar: [
        "Esta tela é exclusiva do responsável pelo sistema. Para as demais pessoas, o item \"Chaves e senhas\" não aparece no menu.",
        "Tenha em mãos a chave de acesso copiada do painel do fornecedor da integração.",
        "O valor gravado nunca aparece de novo. Das chaves de acesso aparecem só os 4 últimos caracteres; das senhas, nada.",
        "Cada gravação, teste e exclusão fica registrada no histórico do sistema (quem, quando e qual chave; nunca o valor)."
      ],
      passos: [
        {
          titulo: "Abrir a tela",
          itens: [
            "Toque em \"Chaves e senhas\" no menu. No celular, o atalho fica também no Início.",
            "Outra forma: em \"Configurações\", no bloco \"Empresa e sistema\", toque em \"Chaves e senhas das integrações\".",
            "Confira os três números do topo: \"Configuradas\", \"Falta configurar\" e \"Com erro no teste\".",
            "Toque em um número para abrir as integrações daquela situação."
          ]
        },
        {
          titulo: "Gravar ou trocar uma chave",
          itens: [
            "Toque no nome da integração para abrir o cartão dela.",
            "Se não souber onde achar o valor, toque em \"Onde encontrar e para que serve\" abaixo do campo.",
            "Cole o valor no campo da chave.",
            "Toque em \"Gravar\".",
            "Confira a mensagem de confirmação e o selo \"Gravado em ...\" ao lado do nome da chave.",
            "Para trocar uma chave já gravada, cole o valor novo por cima e toque em \"Gravar\"."
          ]
        },
        {
          titulo: "Ligar ou desligar uma opção",
          itens: [
            "Algumas chaves são uma lista, como \"Rastreador ligado no SGO+\" e \"Provedor do WhatsApp em uso\".",
            "Escolha a opção na lista.",
            "Toque em \"Gravar\".",
            "Para voltar ao padrão, escolha a primeira opção da lista (por exemplo \"Desligado\" ou \"Automático\") e toque em \"Gravar\"."
          ]
        },
        {
          titulo: "Testar uma integração",
          itens: [
            "Grave a chave antes. O teste usa o valor gravado, não o que está digitado no campo.",
            "Toque em \"Testar\" ao lado do nome da integração. No rastreador da frota o botão é \"Testar conexão\".",
            "Aguarde o texto \"Testando…\" sumir.",
            "Leia o resultado: faixa verde começa com \"Funcionou\"; faixa vermelha começa com \"Não funcionou\" e diz o que fazer.",
            "O teste de e-mail envia uma mensagem para o e-mail do seu usuário. Confira também o lixo eletrônico.",
            "O teste do rastreador consulta a iTracker e mostra quantos veículos encontrou. Ele não envia comando aos veículos e não mostra a chave."
          ]
        },
        {
          titulo: "Apagar uma chave",
          itens: [
            "Toque em \"Apagar\", em vermelho, ao lado da chave.",
            "Leia o aviso: o que depende da chave para de funcionar até gravar outra.",
            "Toque em \"Apagar\" na janela para confirmar, ou em \"Cancelar\" para desistir."
          ]
        }
      ],
      cores: [
        { nome: "Selo verde \"Configurada\"", significado: "Os campos obrigatórios da integração estão gravados. O texto abaixo diz se o último teste funcionou ou se ainda não foi testada depois da última alteração." },
        { nome: "Selo amarelo \"Falta configurar\"", significado: "Algum campo obrigatório está vazio. O texto abaixo do nome diz o que falta." },
        { nome: "Selo vermelho \"Com erro no teste\"", significado: "O último teste não funcionou e nenhuma chave da integração mudou depois. O cartão já abre sozinho. Leia o motivo, corrija a chave e teste de novo." },
        { nome: "Selo verde \"Gravado em ...\" ao lado de uma chave", significado: "A chave tem valor gravado, na data e hora mostradas. Ao lado podem aparecer os 4 últimos caracteres, para conferência." },
        { nome: "Selo cinza \"Vazio\"", significado: "A chave não tem valor gravado." },
        { nome: "Botão vermelho \"Apagar\"", significado: "Remove o valor gravado. Pede confirmação." },
        { nome: "Faixa verde no resultado do teste", significado: "A integração respondeu com as chaves gravadas." },
        { nome: "Faixa vermelha no resultado do teste", significado: "A integração recusou ou não respondeu. O texto diz o motivo e o que fazer." },
        { nome: "Número apagado no resumo do topo", significado: "Nenhuma integração naquela situação." }
      ],
      problemas: [
        { situacao: "Aparece \"Não foi possível abrir: este módulo é exclusivo do responsável pelo sistema.\"", oQueFazer: "Esta tela não é do seu acesso. Peça ao responsável pelo sistema para gravar ou testar a chave." },
        { situacao: "Aparece \"Não foi possível abrir: a sua sessão expirou. Saia e entre de novo no SGO+.\"", oQueFazer: "Saia do sistema, entre de novo e abra a tela outra vez." },
        { situacao: "Aparece \"Cole o valor no campo antes de clicar em Gravar.\"", oQueFazer: "O campo está vazio. Cole o valor e toque em \"Gravar\". Para remover uma chave, use \"Apagar\"." },
        { situacao: "Aparece \"Não foi possível gravar: o valor tem quebra de linha.\"", oQueFazer: "Copie de novo só o valor, numa linha só, e cole." },
        { situacao: "Aparece \"Não foi possível gravar: o valor tem mais de 4.000 caracteres.\"", oQueFazer: "Confira se copiou só a chave, sem texto a mais." },
        { situacao: "Aparece \"Não foi possível gravar: informe o endereço com https://\"", oQueFazer: "No endereço do rastreador, digite o endereço completo começando por https://, sem espaços." },
        { situacao: "Aparece \"Não foi possível gravar: este campo é um número de identificação (só algarismos...)\"", oQueFazer: "Copie do painel da Meta o número de identificação, só com algarismos. Não é o número de telefone." },
        { situacao: "Aparece \"Não foi possível gravar: informe os logins separados por vírgula\"", oQueFazer: "Em \"Avisos de O.S.: quem da gestão recebe (logins)\", digite os logins separados por vírgula, sem outros sinais. Exemplo: joao, maria." },
        { situacao: "Aparece \"Não foi possível gravar: chave desconhecida. Atualize a página (F5) e tente de novo.\"", oQueFazer: "Atualize a página com a tecla F5 e grave de novo." },
        { situacao: "Aparece \"A lista de chaves não carregou.\"", oQueFazer: "Confira a internet e toque em \"Tentar de novo\"." },
        { situacao: "Aparece \"Não foi possível falar com o servidor. Verifique a conexão e tente de novo; nada foi alterado.\"", oQueFazer: "Confira a internet e repita a ação. Nada foi gravado." },
        { situacao: "Gravei a chave nova e o teste ainda falha", oQueFazer: "Confira se colou a chave inteira, sem espaço no começo ou no fim. Leia o motivo na faixa vermelha. Se continuar, gere uma chave nova no painel do fornecedor e grave de novo." },
        { situacao: "O teste de e-mail funcionou, mas a mensagem não chegou", oQueFazer: "Aguarde alguns minutos e confira o lixo eletrônico. Se não chegar, grave de novo a senha do e-mail do sistema." },
        { situacao: "O cartão diz \"Configurada, mas o WhatsApp está usando ...\"", oQueFazer: "As chaves estão certas, mas o WhatsApp usa o outro provedor. Para trocar, mude \"Provedor do WhatsApp em uso\" no cartão \"WhatsApp oficial (Meta)\"." }
      ],
      quemPode: [
        { perfil: "TODOS", pode: "Só a conta do responsável pelo sistema vê e usa esta tela. Para as demais contas, o item não aparece no menu e o sistema recusa o acesso." },
        { perfil: "ADMIN", pode: "Ter o perfil Administrador não basta para abrir esta tela. Se precisar mudar uma chave, peça ao responsável pelo sistema." }
      ],
      perguntas: [
        { p: "Consigo ver uma chave que já está gravada?", r: "Não. O valor nunca aparece de novo. Das chaves de acesso aparecem só os 4 últimos caracteres. Para trocar, grave outro valor por cima." },
        { p: "O teste usa o que eu digitei no campo?", r: "Não. O teste usa o valor gravado. Grave primeiro, depois teste." },
        { p: "O que acontece se eu apagar uma chave?", r: "O que depende dela para de funcionar até você gravar outra. O valor apagado não pode ser recuperado por esta tela." },
        { p: "Por que as integrações \"Relatórios técnicos\" e \"COMMAND\" não têm botão de teste?", r: "Essas chaves não têm teste nesta tela. Confira se aparecem como \"Configurada\" e use o recurso que depende delas para conferir." },
        { p: "O que gravar no rastreador da frota?", r: "Só a \"Chave de acesso (Bearer)\" que a iTracker enviou. O endereço já vem preenchido. Os endereços dos comandos de bloqueio e liberação ficam vazios até a iTracker liberar o acesso com comandos; sem eles o SGO+ só monitora." },
        { p: "Por quanto tempo a localização dos veículos fica guardada?", r: "Pelo número de dias de \"Rastreador: dias de guarda da localização\" (vazio = 90). Depois disso o SGO+ apaga sozinho." }
      ]
    },

    "chaves/whatsapp": {
      titulo: "WhatsApp (Meta e Z-API)",
      paraQueServe: "O SGO+ envia avisos por WhatsApp por um provedor de cada vez: o WhatsApp oficial (Meta) ou a Z-API. Aqui se escolhe o provedor, se gravam as chaves e se cuidam dos modelos de mensagem da Meta.",
      antesDeComecar: [
        "Pela Meta, o SGO+ só envia mensagens por modelo aprovado.",
        "Pela Z-API, as mensagens saem em texto simples.",
        "Para testar, tenha um celular com DDD que possa receber a mensagem de teste."
      ],
      passos: [
        {
          titulo: "Escolher o provedor",
          itens: [
            "Abra o cartão \"WhatsApp oficial (Meta)\".",
            "Em \"Provedor do WhatsApp em uso\", escolha \"WhatsApp oficial (Meta)\", \"Z-API\" ou \"Automático\".",
            "Toque em \"Gravar\".",
            "Em \"Automático\", o SGO+ usa a Meta se a chave dela estiver gravada; senão usa a Z-API, se as 3 chaves dela estiverem gravadas."
          ]
        },
        {
          titulo: "Testar o envio",
          itens: [
            "No cartão do provedor em uso, digite o celular com DDD no campo do teste.",
            "Toque em \"Testar\".",
            "Confira se a mensagem chegou no celular."
          ]
        },
        {
          titulo: "Cuidar dos modelos de mensagem da Meta",
          itens: [
            "No cartão \"WhatsApp oficial (Meta)\", vá até \"Modelos de mensagem (Meta)\".",
            "Toque em \"Ver a situação dos modelos\" para conferir quais estão aprovados.",
            "Para enviar à Meta os modelos que faltam, toque em \"Cadastrar os modelos na Meta\".",
            "Confirme em \"Enviar para análise\". Os modelos que já existem não são alterados.",
            "Aguarde a aprovação. Ela sai em minutos ou em até 24 horas."
          ]
        }
      ],
      cores: [
        { nome: "Selo verde do modelo (aprovado ou \"Já cadastrado\")", significado: "O modelo pode ser usado nos envios." },
        { nome: "Selo azul do modelo (em análise ou \"Enviado\")", significado: "A Meta ainda está analisando. Aguarde." },
        { nome: "Selo amarelo do modelo (faltando ou \"Não tentado\")", significado: "O modelo não está cadastrado na Meta. Use \"Cadastrar os modelos na Meta\"." },
        { nome: "Selo vermelho do modelo (recusado ou \"Erro\")", significado: "A Meta recusou ou houve erro. Leia o motivo ao lado e avise o suporte do SGO+." }
      ],
      problemas: [
        { situacao: "Aparece \"Digite o celular com DDD que vai receber o teste.\"", oQueFazer: "Preencha o campo do celular antes de tocar em \"Testar\"." },
        { situacao: "Aparece \"Não foi possível falar com a Meta: falta gravar ...\"", oQueFazer: "Grave os campos indicados no cartão \"WhatsApp oficial (Meta)\" e tente de novo." },
        { situacao: "O teste pela Meta não chega", oQueFazer: "Confira em \"Ver a situação dos modelos\" se o modelo de aviso geral está aprovado. Sem aprovação, a Meta não entrega." }
      ],
      quemPode: [
        { perfil: "TODOS", pode: "Só o responsável pelo sistema escolhe o provedor, grava as chaves, testa e cadastra os modelos." }
      ]
    }
  };
}
