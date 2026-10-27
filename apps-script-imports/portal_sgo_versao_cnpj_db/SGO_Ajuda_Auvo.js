/**
 * Ajuda "Como usar esta tela" — grupo Auvo (frente C).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Texto puro, sem HTML.
 * Conferido contra a tela real (SGO_Auvo_ConteudoModulo.js) em 17/10/2026.
 */
function SGO_ajudaTelas_Auvo_() {
  return {
    "auvo": {
      titulo: "Integração Auvo",
      paraQueServe: "Liga o SGO+ ao Auvo. Traz para o SGO+ os atendimentos (O.S.) feitos no Auvo, mostra as O.S. que ainda não foram encerradas e gera o relatório de atendimentos. Esta tela é usada pela gestão.",
      antesDeComecar: [
        "Esta tela é só da gestão: Administrador, Gestor e Diretoria. O técnico continua usando o aplicativo do Auvo.",
        "As chaves do Auvo precisam estar gravadas pelo Administrador em \"Chaves e senhas\" (grupo Auvo).",
        "Para o relatório com texto de análise, a chave da IA também precisa estar gravada em \"Chaves e senhas\".",
        "No celular as tabelas da tela viram cartões: cada linha é um cartão, com o nome do campo acima do valor e os botões embaixo, na largura do cartão. Os avisos de atendimento no canto da tela só aparecem no computador."
      ],
      passos: [
        { titulo: "Conferir se o Auvo está conectado", itens: [
          "Toque em \"Integração Auvo\" no menu (grupo Operação de campo).",
          "No quadro \"Conexão\", toque em \"Testar conexão\".",
          "Caixa verde \"Conexão com o Auvo estabelecida com sucesso.\": está tudo certo.",
          "Caixa vermelha: leia a mensagem e veja \"Problemas comuns\" abaixo."
        ] },
        { titulo: "Trazer os atendimentos do Auvo agora", itens: [
          "No quadro \"Sincronização automática de Tarefas\", toque em \"Sincronizar agora\".",
          "Espere a frase \"Buscando Tarefas recentes no Auvo...\" terminar.",
          "Leia o resultado: quantas tarefas foram encontradas e quantos clientes novos vieram.",
          "Se aparecer texto em vermelho com erros, anote o nome do cliente e avise o Administrador."
        ] },
        { titulo: "Deixar a sincronização automática ligada", itens: [
          "No mesmo quadro, ligue a chave \"Sincronizar automaticamente a cada 30 minutos\".",
          "Confira a mensagem de confirmação.",
          "Confira a linha \"Última execução\". Ela mostra a data e a hora da última vez que rodou."
        ] },
        { titulo: "Ver as O.S. que ainda estão abertas no Auvo", itens: [
          "Vá ao quadro \"Pendências de fechamento (O.S. abertas no Auvo)\".",
          "Se aparecer \"Ainda não atualizado\", toque em \"Atualizar agora\" e aguarde. Pode levar alguns minutos.",
          "Para ver só um técnico, escolha o nome em \"Todos os técnicos\".",
          "Para ver só as mais graves, escolha \"Só sem evidência de execução\".",
          "Toque em \"Filtrar\".",
          "Para encerrar uma O.S., toque em \"Ver no Auvo\" e encerre no próprio Auvo. O SGO+ não consegue encerrar a O.S. (o Auvo não permite).",
          "\"Aberta há N dias\" conta desde a data da tarefa no Auvo. A busca olha até cerca de 3 anos para trás, então O.S. esquecidas há muito tempo aparecem com centenas de dias: é a data real da tarefa no Auvo."
        ] },
        { titulo: "Cobrar um técnico por uma O.S. aberta", itens: [
          "Na linha da O.S., toque em \"Cobrar\".",
          "Confira o texto do campo \"Descrição\". Ele já vem preenchido; ajuste se quiser.",
          "Toque em \"Salvar\".",
          "A cobrança fica registrada no Painel de qualidade e o técnico vê o aviso ao entrar no SGO+."
        ] },
        { titulo: "Enviar ao Auvo a correção de um cliente", itens: [
          "Corrija o cliente no SGO+ primeiro (Cadastros > Clientes ou Vínculos).",
          "No quadro \"Enviar correção de cliente para o Auvo (SGO+ → Auvo)\", digite pelo menos 2 letras do nome ou o CNPJ e toque em \"Buscar\".",
          "Na linha do cliente, toque em \"Sincronizar\" e confirme a pergunta.",
          "Caixa verde \"Cliente enviado para o Auvo\": pronto. Confira o selo da coluna \"Situação\"."
        ] },
        { titulo: "Enviar ao Auvo as unidades e os equipamentos que faltam", itens: [
          "No quadro \"Enviar cadastro pendente para o Auvo (SGO+ → Auvo)\", toque em \"Simular (não grava nada)\".",
          "Leia a prévia: quantas unidades e equipamentos faltam enviar. Nada foi gravado ainda.",
          "Se estiver certo, toque em \"Confirmar e enviar de verdade\" e confirme a pergunta.",
          "Espere a mensagem de conclusão. Os equipamentos vão em lotes."
        ] },
        { titulo: "Gerar o relatório de atendimentos (A4)", itens: [
          "Vá ao quadro \"Relatório de atendimentos (A4)\".",
          "Escolha o período: \"Últimos 7 dias\", \"Últimos 30 dias\" ou \"Últimos 90 dias\".",
          "Para o relatório de todos, toque em \"Gerar relatório geral\".",
          "Para uma pessoa ou um grupo, procure o nome em \"Buscar pelo nome\" e marque uma ou mais pessoas.",
          "Toque em \"Gerar relatório dos selecionados\".",
          "Aguarde a nova aba abrir. Pode levar até 1 minuto. Não feche a aba antes de terminar.",
          "O relatório traz os gráficos por colaborador e por tipo, as pendências de fechamento da última atualização e a lista de atendimentos.",
          "Uma cópia (PDF e HTML) fica guardada na pasta \"Auvo - Relatórios\". O link para o PDF aparece no topo do relatório."
        ] },
        { titulo: "Abrir uma O.S. pelo Início", itens: [
          "No Início, no quadro \"Últimos atendimentos\", toque na linha da O.S.",
          "A janela mostra técnico, tipo, data, situação, endereço, relato, checklist, fotos e assinatura.",
          "Toque em \"Abrir no Auvo\" para ver no Auvo, ou em \"Fechar\"."
        ] }
      ],
      cores: [
        { nome: "Selo vermelho \"Sem evidência de execução\"", significado: "A O.S. está aberta e não tem relato, questionário, check-in nem assinatura do cliente. Pode não ter sido feita. Confira com o técnico primeiro." },
        { nome: "Selo verde \"Aberta há N dias\"", significado: "A O.S. tem sinais de que o serviço foi feito, mas ninguém encerrou no Auvo. Peça ao técnico para encerrar." },
        { nome: "Selo amarelo com número na coluna \"Cobranças\"", significado: "Quantas cobranças em aberto esse técnico já tem. Um traço quer dizer nenhuma." },
        { nome: "\"Sem login\" no lugar do botão \"Cobrar\"", significado: "O técnico não tem login no SGO+. A cobrança não teria como chegar até ele." },
        { nome: "Selo verde \"Sincronizado\"", significado: "O cliente ou técnico já está igual no SGO+ e no Auvo." },
        { nome: "Selo amarelo \"Pendente\"", significado: "Ainda falta enviar ao Auvo." },
        { nome: "Selo vermelho \"Com erro\"", significado: "O último envio falhou. A coluna \"Último erro\" diz o motivo." },
        { nome: "Caixa verde, vermelha, azul ou amarela", significado: "Verde: deu certo. Vermelha: deu erro. Azul: em andamento. Amarela: atenção ou prévia, nada foi gravado ainda." },
        { nome: "Bolinha verde \"Concluído\" e amarela \"Em aberto\" (Início)", significado: "Situação da O.S. no Auvo." }
      ],
      problemas: [
        { situacao: "\"Credenciais do Auvo não configuradas\"", oQueFazer: "Peça ao Administrador para gravar AUVO_API_KEY e AUVO_API_TOKEN em \"Chaves e senhas\". As chaves são geradas no Auvo, em Menu > Integração. Depois toque em \"Testar conexão\"." },
        { situacao: "\"Credenciais do Auvo inválidas (HTTP 401/403)\"", oQueFazer: "As chaves gravadas estão erradas ou vencidas. Peça ao Administrador para gerar de novo no Auvo e gravar em \"Chaves e senhas\"." },
        { situacao: "\"Limite de requisições do Auvo atingido (HTTP 429)\"", oQueFazer: "O Auvo pediu uma pausa. Espere alguns minutos e tente de novo." },
        { situacao: "\"Auvo temporariamente indisponível\" ou \"Falha ao comunicar com o Auvo após 3 tentativas\"", oQueFazer: "O Auvo está fora do ar ou a internet caiu. Tente de novo mais tarde. Nada se perde." },
        { situacao: "\"Atualização em andamento em segundo plano...\" nas pendências", oQueFazer: "A varredura é grande e continua sozinha. Volte em alguns minutos e toque em \"Atualizar agora\" de novo." },
        { situacao: "\"Nenhum colaborador com atendimento sincronizado ainda\" no relatório", oQueFazer: "Rode \"Sincronizar agora\" primeiro. Os nomes aparecem depois da primeira sincronização." },
        { situacao: "\"Marque ao menos um colaborador na lista\"", oQueFazer: "Marque pelo menos um nome antes de tocar em \"Gerar relatório dos selecionados\"." },
        { situacao: "\"A janela do relatório foi fechada antes de terminar\"", oQueFazer: "Gere de novo e deixe a aba aberta até o relatório aparecer." },
        { situacao: "\"Chave GEMINI_API_KEY não configurada\"", oQueFazer: "Peça ao Administrador para gravar a chave da IA em \"Chaves e senhas\"." },
        { situacao: "Mensagem sobre vínculo de cliente, unidade ou CNPJ (\"Resolva no painel do gestor\", \"Confira o painel de vínculos\")", oQueFazer: "Há cadastro repetido ou ligado ao cliente errado. Abra \"Vínculos\" no menu e corrija. Depois sincronize de novo." },
        { situacao: "\"Acesso restrito a Gestor/Administrador\"", oQueFazer: "Seu perfil não usa esta tela. Suas O.S. continuam no aplicativo do Auvo. Fale com a gestão se precisar." }
      ],
      quemPode: [
        { perfil: "ADMIN", pode: "Tudo. Só o Administrador usa as ferramentas de implantação: envio em lote, técnicos, importação completa e auditoria do cadastro." },
        { perfil: "GESTOR,DIRETORIA", pode: "Testar a conexão, sincronizar os atendimentos, enviar ao Auvo a correção de um cliente e o cadastro pendente, ver e atualizar as pendências, cobrar técnicos e gerar o relatório." },
        { perfil: "TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Não usam esta tela. O técnico trabalha no aplicativo do Auvo e vê as cobranças da gestão ao entrar no SGO+." }
      ],
      perguntas: [
        { p: "Posso encerrar a O.S. pelo SGO+?", r: "Não. O Auvo não permite. Toque em \"Ver no Auvo\" e encerre lá." },
        { p: "A sincronização traz todos os clientes do Auvo?", r: "Não. Traz o cliente só quando ele aparece numa tarefa. Equipamentos não vêm por ela." },
        { p: "Quando o SGO+ cria tarefa no Auvo sozinho?", r: "Ao emitir certificado de calibração, laudo NR-13, registro operacional ou PGT e POP. Se o Auvo falhar, o documento sai do mesmo jeito." },
        { p: "O cadastro feito à mão no SGO+ pode ser mudado pelo Auvo?", r: "Não. Cadastro feito no SGO+ fica protegido. A importação só preenche o que está vazio." },
        { p: "Onde ficam as cobranças que fiz?", r: "No Painel de qualidade, como cobrança do Auvo em nome do técnico." }
      ]
    },

    "auvo/ferramentas_de_implantacao": {
      titulo: "Ferramentas de implantação (só Administrador)",
      paraQueServe: "Ferramentas raras, usadas na implantação: envio em lote, técnicos, importação completa e auditoria. Enviar a correção de um cliente e o cadastro pendente ficam no painel principal, para toda a gestão. Quem não é Administrador vê só uma frase dizendo que as ferramentas de implantação ficam com o Administrador.",
      antesDeComecar: [
        "Toque em \"Mostrar ferramentas de implantação (administrador)\" para abrir. Toque em \"Ocultar ferramentas de implantação\" para fechar.",
        "Sempre use \"Simular (não grava nada)\" antes de confirmar."
      ],
      passos: [
        { titulo: "Enviar um técnico ao Auvo", itens: [
          "No quadro \"Consultar técnico / usuário (SGO+ → Auvo)\", digite o nome e toque em \"Buscar\".",
          "Se a pessoa não tiver e-mail, digite o e-mail no campo e toque em \"Salvar\". O Auvo exige e-mail.",
          "Toque em \"Sincronizar\"."
        ] },
        { titulo: "Enviar todos de uma vez (lote)", itens: [
          "Toque em \"Sincronizar todos os clientes ativos (lote, administrador)\", no quadro de enviar correção de cliente, ou em \"Sincronizar todos (lote)\", no quadro de técnicos.",
          "Leia a pergunta de confirmação e confirme.",
          "Confira quantos foram enviados e quantos deram erro."
        ] },
        { titulo: "Procurar clientes repetidos no Auvo", itens: [
          "No quadro \"Auditoria do cadastro do Auvo\", toque em \"Auditar nomes parecidos\".",
          "Caixa verde: nada encontrado.",
          "Caixa amarela: confira cada par da tabela. Nada é alterado por esta ferramenta."
        ] },
        { titulo: "Importação completa do Auvo para o SGO+", itens: [
          "No quadro \"Importação completa (manual, rara)\", toque em \"Simular (não grava nada)\".",
          "Leia a prévia: quantos clientes, unidades e equipamentos são novos, atualizados ou protegidos.",
          "Se estiver certo, toque em \"Confirmar e executar de verdade\".",
          "A importação anda em lotes e continua sozinha. Pode fechar a tela.",
          "Se aparecer a caixa amarela \"Importação parada\", siga o que ela diz e toque em \"Retomar sincronização em andamento\"."
        ] }
      ],
      problemas: [
        { situacao: "\"Digite ao menos 2 letras pra buscar.\"", oQueFazer: "Digite mais letras do nome ou o CNPJ e toque em \"Buscar\"." },
        { situacao: "\"Usuário ... não tem e-mail cadastrado\"", oQueFazer: "Preencha o e-mail na linha da pessoa, toque em \"Salvar\" e sincronize de novo." },
        { situacao: "Equipamentos \"sem Cliente/Unidade vinculado\" na prévia do envio", oQueFazer: "Ligue o equipamento a uma unidade no cadastro de Equipamentos. Sem isso ele não pode ir para o Auvo." },
        { situacao: "\"Esta ferramenta de implantação do Auvo é exclusiva do Administrador.\"", oQueFazer: "Peça ao Administrador para fazer." }
      ],
      quemPode: [
        { perfil: "ADMIN", pode: "Usar todas as ferramentas de implantação." },
        { perfil: "GESTOR,DIRETORIA", pode: "Não usam estas ferramentas. Enviar a correção de um cliente e o cadastro pendente eles fazem no painel principal." }
      ]
    },
    // 21/10/2026: etapa 0 da Assistência técnica (SGO_AuvoAcervo.js, docs/ACERVO_AUVO.md).
    "auvo/acervo": {
      titulo: "Acervo do Auvo (cópia de segurança)",
      paraQueServe: "Copia para o servidor do SGO+ tudo o que está no Auvo: o registro completo de cada tarefa desde o início da conta, as fotos, as assinaturas e os anexos. É a garantia de que nada se perde quando a empresa deixar de usar o Auvo. Só lê o Auvo: não altera nada lá nem nos atendimentos que o SGO+ já mostra.",
      antesDeComecar: [
        "Esta parte aparece só para o Administrador e a Diretoria, no topo da tela Integração Auvo.",
        "A conexão com o Auvo precisa estar funcionando: toque em \"Testar conexão\" antes.",
        "A contagem e a cópia rodam sozinhas no servidor, em lotes de poucos minutos. Pode fechar a tela e voltar depois.",
        "Comece sempre pela contagem: ela diz quanto espaço a cópia vai ocupar."
      ],
      passos: [
        { titulo: "Contar o acervo (não baixa nada)", itens: [
          "Toque em \"Integração Auvo\" no menu.",
          "No quadro \"Acervo do Auvo (cópia de segurança)\", confira o mês em \"Começar em\". O padrão é 01/2022.",
          "Toque em \"Contar o acervo\".",
          "Acompanhe a caixa azul: ela mostra a etapa, o mês e a página que estão sendo lidos.",
          "Quando a caixa ficar verde (\"Concluída\"), leia \"Resultado da contagem\": tarefas, fotos, assinaturas, espaço e tempo estimados."
        ] },
        { titulo: "Copiar o acervo", itens: [
          "Confira se há espaço livre no servidor maior que o \"espaço estimado\" da contagem.",
          "Toque em \"Iniciar cópia\" e confirme.",
          "Acompanhe os números: tarefas lidas, arquivos copiados, aguardando cópia e com falha.",
          "A cópia passa por seis etapas: listas de apoio, leitura das tarefas, segunda passada, cópia dos arquivos, conferência e relatório.",
          "No fim aparece o \"Relatório de conferência da cópia\"."
        ] },
        { titulo: "Pausar e continuar", itens: [
          "Toque em \"Pausar\". O lote em andamento termina o passo atual e para.",
          "Espere a situação mudar para \"Pausada\".",
          "Para retomar, toque em \"Continuar\". A cópia segue de onde parou, sem baixar de novo o que já foi copiado."
        ] },
        { titulo: "Resolver as falhas", itens: [
          "Abra \"Falhas de cópia\" para ver cada arquivo que não veio e o motivo.",
          "Falha marcada \"tenta de novo sozinha\" é repetida pela própria cópia até três vezes.",
          "Depois que a cópia terminar, toque em \"Tentar de novo as falhas\" para colocar todas de volta na fila.",
          "Se a falha continuar com \"o Auvo não tem mais este arquivo\", anote o número da tarefa e leve ao dono para decidir."
        ] },
        { titulo: "Conferir de novo os arquivos copiados", itens: [
          "Toque em \"Conferir arquivos\".",
          "O SGO+ relê cada arquivo do acervo e compara com a impressão digital gravada na cópia.",
          "No relatório, \"com diferença ou sumidos\" precisa ficar em zero."
        ] },
        { titulo: "Consultar uma tarefa do acervo", itens: [
          "Abra \"Consultar uma tarefa do acervo\".",
          "Digite o número da tarefa no Auvo em \"Número da tarefa no Auvo\".",
          "Toque em \"Consultar\".",
          "Toque no nome de um arquivo para abrir a foto, a assinatura ou o anexo. Toque em \"abrir o registro completo\" para ver tudo o que o Auvo guardava da tarefa."
        ] }
      ],
      cores: [
        { nome: "Caixa azul", significado: "Contagem ou cópia em andamento, ou informação." },
        { nome: "Caixa verde", significado: "Concluída. No relatório: zero faltas." },
        { nome: "Caixa amarela", significado: "Pausada, ou há faltas no relatório: veja o motivo de cada uma." },
        { nome: "Caixa vermelha", significado: "Parada por erro. Confira a conexão e toque em \"Continuar\"." }
      ],
      problemas: [
        { situacao: "\"Já existe uma cópia em andamento.\"", oQueFazer: "Toque em \"Pausar\", espere \"Pausada\" e só então comece outra." },
        { situacao: "Caixa vermelha \"Parada por erro\"", oQueFazer: "Toque em \"Testar conexão\" no quadro \"Conexão\". Se estiver certa, toque em \"Continuar\"." },
        { situacao: "Falhas com \"HTTP 403\" ou \"HTTP 401\"", oQueFazer: "O endereço da imagem venceu. A cópia busca o endereço novo no Auvo sozinha; se continuar, toque em \"Tentar de novo as falhas\"." },
        { situacao: "\"tarefas faltando\" maior que zero no relatório", oQueFazer: "Toque em \"Iniciar cópia\" de novo. O que já foi copiado não é baixado outra vez e a segunda passada busca o que faltou." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA", pode: "Contar, copiar, pausar, continuar, tentar de novo as falhas, conferir e consultar o acervo." },
        { perfil: "GESTOR", pode: "Não vê o acervo. Pede ao Administrador ou à Diretoria." }
      ],
      perguntas: [
        { p: "A cópia altera alguma coisa no Auvo?", r: "Não. Ela só lê. Nada é criado, alterado ou apagado no Auvo." },
        { p: "A cópia muda os atendimentos que o SGO+ já mostra?", r: "Não. O acervo fica separado e só para consulta." },
        { p: "Posso rodar a cópia mais de uma vez?", r: "Sim. O que já foi copiado e conferido não é baixado de novo. Tarefa que mudou no Auvo ganha uma versão nova e a anterior continua guardada." },
        { p: "Onde ficam os arquivos?", r: "No servidor do SGO+, na pasta \"Acervo Auvo\", separados por ano e pelo número da tarefa. Entram no backup diário." },
        { p: "Quando o Auvo pode ser cancelado?", r: "Só depois que o relatório de conferência mostrar zero faltas, ou faltas explicadas e aceitas pelo dono." }
      ]
    }
  };
}
