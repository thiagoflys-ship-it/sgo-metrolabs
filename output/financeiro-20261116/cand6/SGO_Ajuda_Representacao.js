/****************************************************
 * AJUDA "COMO USAR ESTA TELA" — MÓDULO REPRESENTAÇÃO (29/10/2026)
 * Contrato: docs/AJUDA_CONTRATO_20261017.md
 * Telas: representacao (visão da equipe da Metrolabs) e representacao/representada (visão da empresa representada,
 * sem termos internos; é a que a pessoa da representada lê na aba "Como usar" do módulo, Representacao_api > ajuda).
 * Texto conferido com JS_Representacao.html, SGO_Representacao.js, SGO_Representacao_Config.js e
 * SGO_Representacao_Avisos.js. Texto puro, sem HTML.
 * 03/11/2026: catálogo de modelos pela representada (SGO_Representacao_Modelos.js) e aviso na tela, aviso com ciência e
 * WhatsApp dos pedidos novos (SGO_Representacao_Alertas.js).
 ****************************************************/
function SGO_ajudaTelas_Representacao_() {
  return {
    "representacao": {
      titulo: "Representação",
      paraQueServe: "Recebe os pedidos de atendimento da empresa representada (Brasmedical) aos clientes finais dos equipamentos dela, com a conversa e os arquivos de cada pedido. Aqui a equipe aceita o pedido (ele vira chamado na Assistência técnica com a marca da representada), pede complemento ou recusa com o motivo, e cadastra a representada e o catálogo de modelos.",
      antesDeComecar: [
        "A pessoa da representada entra no SGO+ pela entrada normal, com o e-mail cadastrado e a senha (perfil \"Representada\"); se esquecer a senha, usa \"Esqueci minha senha\" na tela de entrada. Ela só vê o módulo Representação e só os pedidos e chamados da empresa dela.",
        "As contas da representada são criadas e inativadas em Administração > Usuários: perfil \"Representada\", a empresa (representada) e o papel (administrador da representada, atendente, financeiro de garantia ou leitura).",
        "Antes de criar a primeira conta, cadastre a representada na aba \"Representadas\". Os modelos a própria representada cadastra (na abertura do pedido ou no catálogo dela); a Metrolabs também pode incluir na aba \"Catálogo de modelos\".",
        "Quem responde pela representação fica em Assistência técnica > Regras da assistência > Representação. Sem ninguém lá, os pedidos vão para quem faz a triagem."
      ],
      passos: [
        { titulo: "Acompanhar pelo Painel", itens: [
          "A aba \"Painel\" abre primeiro. Escolha a representada (ou todas) e o período dos índices (30, 90, 180 ou 365 dias). Os tempos são em horas úteis do expediente da Metrolabs.",
          "Índices: pedidos na fila e quantos com o aceite vencido; aceite no prazo (aceitos no período em até o prazo de aceite da representada, configurado na aba Representadas, descontada a espera do complemento) e o tempo médio; primeiro contato no prazo (do aceite ao primeiro registro da Metrolabs no chamado: triagem assumida ou iniciada, ou mensagem à representada; padrão 8 h úteis); prazo vencido agora e em risco; abertos e com quem estão; tempo médio até a visita e até a conclusão (contados do envio do pedido); reincidência (mesmo equipamento com outro chamado em até 90 dias).",
          "Kanban: um cartão por pedido ou chamado, na etapa que a representada vê. A borda é a cor do prazo. O cartão não se arrasta: o pedido abre aqui (aceitar, complemento, recusar) e o chamado abre na Assistência técnica, onde a etapa muda pelas regras do atendimento.",
          "Gantt: cada barra vai do envio do pedido até a conclusão (ou até hoje). Escolha a janela e agrupe por chamado, cliente, técnico ou representada. O tracejado é o fim do prazo; a parte vermelha, o tempo depois dele; o losango vazado é a visita agendada e o cheio, a chegada do técnico. A agenda de cada técnico com as O.S. fica em Atividades da equipe (botão \"Abrir a agenda única\").",
          "Indicadores: fila de pedidos com a idade em horas úteis, prazo de atendimento por prioridade (atendidos, no prazo, média até a visita, abertos e vencidos), carga por técnico, por representada, por etapa, por cliente, por UF, garantia e reincidência por modelo e por equipamento. Toque numa linha da fila para abrir o pedido.",
          "O painel não se atualiza sozinho: toque em \"Atualizar\" no alto da tela."
        ] },
        { titulo: "Tratar um pedido", itens: [
          "Abra a aba \"Pedidos\". Cada pedido mostra a representada, o cliente, o equipamento e o prazo de aceite (verde em dia, amarelo em risco, vermelho vencido, cinza pausado).",
          "Toque no pedido para ver o relato completo, o contato no local, a galeria \"Imagens e vídeos\" e a conversa.",
          "Aceitar: escolha a prioridade (sem escolher, vale P2 para equipamento parado e P3 para os demais) e, se já souber, o tipo de serviço. O pedido vira chamado na Assistência técnica e segue a triagem de sempre. A representada recebe e-mail.",
          "Pedir complemento: escreva o que falta. O pedido volta para a representada e o prazo de aceite fica pausado até ela responder.",
          "Recusar: escreva o motivo (por exemplo, equipamento que não é da representada ou cliente fora da área de atendimento). A representada vê o motivo e recebe e-mail.",
          "Os mesmos botões aparecem em Assistência técnica > Solicitações dos clientes, com o selo da representada."
        ] },
        { titulo: "Aviso de pedido novo (na tela, em Avisos e no WhatsApp)", itens: [
          "Quem trata a fila (a gestão da Assistência técnica, quem faz a triagem e quem responde pela representação) vê um aviso no canto da tela, em qualquer tela do SGO+, quando entra pedido novo da representada, quando ela responde um complemento e quando o pedido chega a 75% do prazo de aceite sem aceite. O SGO+ confere a cada 45 segundos, sem recarregar a tela e sem mexer no que você está digitando.",
          "O aviso mostra o número do pedido, a representada, o cliente, o equipamento e quanto falta (em horas úteis) para o prazo de aceite. \"Abrir pedido\" abre o pedido aqui na aba Pedidos; \"Dispensar\" tira o aviso só para você (ele não volta, mas o aviso de 75% do mesmo pedido ainda aparece). O pedido continua na fila até ser tratado.",
          "O aviso fica no alto, à direita (no celular, no máximo 2 de cada vez e o botão \"mais N\"). Sem conexão ou com a sessão vencida, o SGO+ tenta de novo em 2 e depois 5 minutos e volta sozinho quando a aba fica visível. Quem passou a responder pela representação começa a receber em até 5 minutos, sem recarregar a página.",
          "O aviso toca um som curto. Se o navegador bloquear o som, aparece \"Clique para ativar o som\": clique uma vez na página. O botão \"Som\" liga ou desliga o som neste navegador.",
          "Quem responde pela representação (Regras da assistência > Representação; sem ninguém, quem faz a triagem) recebe também um aviso em \"Avisos\", que fica até tocar em \"Li e estou ciente\", e o WhatsApp do sistema com o link do pedido, mais o e-mail. Um segundo aviso sai a 75% do prazo de aceite, se o pedido ainda não foi aceito.",
          "O WhatsApp sai só no expediente e em dia útil; o pedido que chega fora dele é avisado na abertura do próximo expediente. Cada pessoa recebe no máximo 10 WhatsApp de pedidos por dia; passou disso, o aviso vai por e-mail e fica no sistema.",
          "Pedido aceito, recusado ou cancelado: nenhum aviso novo sai, o aviso no canto some e o aviso em \"Avisos\" que ainda não teve ciência é arquivado. O WhatsApp que ainda esperava o expediente não sai."
        ] },
        { titulo: "Conversar com a representada", itens: [
          "Na aba \"Conversas\" ficam as conversas por pedido, por chamado e o canal geral de cada representada. Escolha a representada para abrir o canal geral.",
          "Escreva e toque em \"Enviar\". A representada recebe e-mail com a mensagem.",
          "Marque \"Nota interna\" para registrar algo que a representada não pode ver. A nota aparece em amarelo, só para a equipe.",
          "Nada é apagado: correção vira mensagem nova."
        ] },
        { titulo: "Cadastrar a representada e os modelos", itens: [
          "Aba \"Representadas\": nome, CNPJ, contrato, vigência, contato e os prazos (aceite do pedido em minutos úteis, padrão 240 = 4 horas; prazo de atendimento do chamado, padrão 1710 = 3 dias úteis; alerta a 75% do prazo; chamado sem registro em 3 dias úteis). Ao digitar o prazo, a tela mostra o que ele quer dizer (ex.: \"= 3 dias úteis\"); um dia de expediente tem 570 minutos (08:00 às 17:30). Marque se a consulta de CNPJ na base pública da Receita fica ligada e se a representada pode cancelar antes da visita.",
          "Prazo de atendimento do chamado da representada (decisão de 11/11/2026): depois do aceite, a Metrolabs tem esse prazo (padrão 3 dias úteis) para estudar o caso e agendar o atendimento. O chamado que nasce do pedido da representada usa esse prazo, e não o da prioridade (a prioridade continua valendo para a triagem). A troca de prioridade mantém o prazo da representada. Na ficha do chamado aparece \"Prazo da representada (3 dias úteis)\". Chamado comum ligado depois à representada mantém o prazo com que nasceu.",
          "Régua de prazos (decisão de 11/11/2026): na mesma tela ficam também o prazo do relatório do atendimento (padrão 2 dias úteis depois de cada atendimento realizado) e o prazo para avaliar depois da chegada da peça (padrão 2 dias úteis). Os dois aceitam de 1 a 15 dias úteis.",
          "Representada inativa: as pessoas dela não abrem mais o módulo; nada é apagado.",
          "Aba \"Catálogo de modelos\": escolha a representada. A tabela mostra quem cadastrou cada modelo (por exemplo, \"cadastrado por Fulano (Brasmedical)\" quando foi a representada), quantos equipamentos usam o modelo, a situação e o botão \"Histórico\" (quem cadastrou, alterou, inativou ou reativou, quando, o antes e o depois e o motivo).",
          "Para incluir: preencha código, nome, tipo, família, garantia em meses e, se souber, o padrão do número de série. Para alterar: toque em \"Alterar\" na linha, mude o que precisar e escreva o motivo (obrigatório; a representada vê no histórico). O mesmo código altera o modelo.",
          "Mudar a garantia vale para os equipamentos cadastrados depois; os já cadastrados mantêm a garantia gravada no cadastro deles. O código de um modelo que já está em equipamento não muda."
        ] },
        { titulo: "Relatórios A4 (atendimento e período)", itens: [
          "Relatório do atendimento: na ficha do chamado (Assistência técnica), parte \"Relatórios do atendimento\", toque em \"Gerar (Metrolabs, uso interno)\", \"Gerar a versão do cliente\" ou \"Gerar a versão da representada\". Cada versão mostra só o que o público dela pode ler.",
          "Versão interna: tudo da versão da representada mais as notas internas, os prazos e o SLA em horas úteis, o primeiro contato, o técnico, o deslocamento e o histórico do equipamento (reincidência). Não envie à representada nem ao cliente.",
          "Versão da representada: capa com o quadro \"Situação em\" (situação, prazo de atendimento, aceite do pedido, visita, conclusão, com quem está e próximo passo), sumário, resumo com os tempos do envio à visita e à conclusão, cliente e equipamento com a garantia, relato da abertura, marcos previsto e realizado com a diferença escrita em horas úteis, linha do tempo vertical (data, hora, registro e quem fez), visita, diagnóstico e serviço, peças, fotos liberadas, conversa do chamado (sem nota interna), arquivos, assinatura e, no fim, o que quer dizer cada etapa.",
          "Fotos no relatório: todas no mesmo tamanho, duas por linha, separadas entre as enviadas pela representada (abertura do pedido e galeria) e as registradas pela Metrolabs (atendimento e galeria), com legenda de data e hora, quem tirou e o momento (antes da visita, durante a visita ou depois do serviço, pela hora da foto e a chegada e a conclusão da O.S.).",
          "Cadastro vazio (CNPJ, TAG, protocolo) aparece como \"Não informado\". Corrija em Cadastros e gere de novo: a emissão nova não apaga a anterior.",
          "Versão do cliente: capa com a situação, a visita, a conclusão e o próximo passo; as 5 etapas de \"Meus chamados\", a linha do tempo pública do cliente, visita, serviço, peças, fotos liberadas, recomendações, assinatura e o que quer dizer cada etapa. Sem o nome da representada, sem a conversa com ela, sem prazos internos e sem valores; do técnico, só o nome.",
          "Fotos: a foto do técnico só entra na versão do cliente ou da representada depois de liberada na mesma parte da ficha (\"Quem vê nos relatórios\"). Ao liberar, a tela guarda uma cópia reduzida para o A4 não ficar pesado. Libera a gestão da área Técnica e os responsáveis pela representação.",
          "Relatório do período: no Painel, escolha a representada e o período e toque em \"Relatório do período\" (versão interna, ou a da representada escolhida). Traz na capa o quadro \"Situação em\" (abertos agora, com prazo vencido e em risco, aceite e atendimento no prazo com \"x de y\", tempo médio até a conclusão e os pontos de atenção pelo número do chamado), o resumo com os destaques (prazo vencido, em risco, próximas visitas, reincidência), os índices do painel com as mesmas fórmulas, os gráficos (por etapa, prazo cumprido, tempos médios, por cliente e UF, garantia, reincidência por modelo), o Gantt em folha deitada com a etapa e a situação do prazo escritas na barra (lê-se também impresso em preto e branco), a lista, \"Como ler este relatório\" com as definições e, na interna, a carga por técnico, a fila e a comparação entre representadas (a lista da interna também sai em folha deitada).",
          "Todo documento fica salvo em HTML e PDF e registrado com o público que pode abrir. A versão do cliente de um chamado também entra no Arquivo de documentos do equipamento. Cada emissão é uma versão nova; nenhuma é apagada. A aba \"Relatórios gerados\" do Painel e a ficha do chamado listam os documentos para abrir de novo. No Painel da Representação entram só os documentos de chamados de representada e os relatórios do período do próprio módulo; os relatórios de outros clientes ficam na Assistência técnica."
        ] },
        { titulo: "Abrir em nome da representada (pedido por telefone, e-mail ou WhatsApp)", itens: [
          "Só para quem está na lista \"Quem pode abrir pedido em nome da representada\". A lista começa vazia e só o Administrador muda, na aba \"Representadas\" (caixa no fim da tela). Quem não está na lista não vê o botão, e o sistema recusa.",
          "Em \"Pedidos\", toque em \"Abrir em nome da representada\".",
          "Escolha a representada, por onde ela pediu (telefone, e-mail ou WhatsApp), o nome e o contato (telefone com DDD ou e-mail) de quem pediu. Toque em \"Continuar: cliente e equipamento\".",
          "Busque o cliente pelo CNPJ ou CPF completo e o equipamento pela série exata, como a representada faz. Não achou: cadastre em Cadastros (Clientes, Unidades ou Equipamentos) e busque de novo.",
          "Preencha o mesmo relato do pedido normal (setor, contato no local, sintoma, quando começou, código de erro, parada, risco, o que já foi tentado e o enquadramento). As fotos são opcionais: anexe as que a representada mandou.",
          "Toque em \"Abrir o pedido em nome da ...\". O pedido entra na fila de Pedidos como os demais (mesmo prazo de aceite e os mesmos avisos). A representada recebe o aviso por e-mail e vê o pedido com a origem: \"Aberto pela Metrolabs (seu nome) a pedido de Fulano (representada), por telefone\". Tudo fica no registro de ações e na auditoria."
        ] },
        { titulo: "Ligar à representada um chamado já aberto", itens: [
          "Use quando a representada pediu o atendimento e ele foi aberto como chamado comum (por exemplo, urgência atendida antes). Mesma lista restrita do item acima.",
          "Na Assistência técnica, abra a ficha do chamado e toque em \"Ligar à representada\".",
          "Escolha a representada, informe o protocolo dela (se houver) e escreva o motivo (pelo menos 10 letras). Toque em \"Ligar à representada\".",
          "O chamado ganha a marca da representada; ela passa a ver e acompanhar o chamado, com quem ligou e o motivo, e recebe o aviso por e-mail. Chamado que já é de uma representada não muda de representada.",
          "Escolheu a representada errada? Fale com o Administrador: só ele desliga (botão \"Desligar da representada\" na ficha, com o motivo). A representada errada deixa de ver o chamado, os documentos, os arquivos, as mensagens e as fotos liberadas para ela. Depois, ligue à representada certa."
        ] },
        { titulo: "Imagens e vídeos do pedido e do chamado", itens: [
          "A galeria \"Imagens e vídeos\" fica no pedido (aba Pedidos) e na ficha do chamado na Assistência técnica (parte \"Representação\"). No chamado, ela junta o que foi anexado no chamado e no pedido que o originou, inclusive as fotos e o vídeo da abertura.",
          "Toque na miniatura para ver a imagem em tamanho grande ou assistir ao vídeo, passar para a anterior ou a próxima e baixar. Vídeo de iPhone em MOV pode não tocar no Windows: use Baixar.",
          "Para anexar: escolha as imagens (até 10 por vez; JPG, PNG ou WEBP; reduzidas no aparelho para até 2 MB) e, se quiser, um vídeo (MP4, MOV, WEBM ou 3GP, até 100 MB), escreva a legenda e toque em \"Enviar para a galeria\". O vídeo sobe com a barra de progresso: não feche a tela até terminar. Até 60 imagens e vídeos por pedido ou chamado.",
          "\"Só para a Metrolabs\": marque para a representada não ver (por exemplo, foto interna de bancada). Sem a marca, a representada vê e recebe o aviso por e-mail.",
          "Quando a representada anexa, o responsável pela representação (e o técnico do chamado) recebe o aviso. A linha do tempo registra cada envio.",
          "Retirar: abra a imagem ou o vídeo e toque em \"Retirar da galeria\", com o motivo (ex.: aparece um paciente). Retira quem enviou ou quem administra a representação; o registro e o arquivo ficam guardados.",
          "As imagens da galeria entram nos relatórios A4 do atendimento (a versão da representada só com as que ela vê; a do cliente, não). Os vídeos aparecem na lista de documentos do atendimento."
        ] },
        { titulo: "Régua de prazos do chamado da representada", itens: [
          "Não é um prazo único: o chamado da representada anda por etapas, cada uma com quem responde e até quando. A caixa \"Régua de prazos\" fica na ficha do chamado (Assistência técnica > chamado > parte \"Representação\") e mostra \"Agora\": a etapa que vale, com quem está, o prazo vigente e o que falta.",
          "1. Estudar o caso e agendar (Metrolabs): da abertura do chamado até o atendimento agendado, no prazo da representada (padrão 3 dias úteis). Cumprida quando o chamado vai para \"Agendado\" (ou quando o estudo conclui que precisa de peça). O tempo aguardando orçamento ou o cliente não conta.",
          "2. Relatório do atendimento (Metrolabs): depois de cada atendimento realizado (o técnico saiu do local: execução concluída, falta de peça ou voltar outro dia), 2 dias úteis para gerar o relatório do atendimento na versão da representada (ficha do chamado > Relatórios do atendimento > \"Gerar a versão da representada\"). A representada recebe o aviso por e-mail e vê na linha do tempo.",
          "3. Peça (representada): quando o chamado vai para \"Aguardando peça\", a representada recebe o aviso para informar a data prevista de chegada. Enquanto ela não informa, a pendência é dela e o prazo da Metrolabs fica pausado; com 1 dia útil sem resposta, ela recebe um lembrete e quem responde pela representação é avisado. Se ela informar por telefone ou e-mail, toque em \"Registrar a previsão informada por outro canal\" e diga quem informou e por onde.",
          "Quando a peça chegar, toque em \"Registrar a chegada da peça\" (data e hora). O chamado que espera a peça volta para \"Planejado\" (falta agendar) e a representada é avisada. A chegada conferida pelo Compras ou o \"Liberar para agendar\" também contam como chegada.",
          "4. Avaliação depois da peça (Metrolabs): 2 dias úteis da chegada até a avaliação: um novo atendimento realizado, o chamado concluído ou \"Registrar a avaliação (próximo passo)\", com o resultado e o próximo passo (a representada lê). Se a peça não resolver e o chamado voltar à triagem, abre a \"Reavaliação\" com o mesmo prazo.",
          "5. Pedir mais prazo: em qualquer etapa da Metrolabs em aberto, toque em \"Pedir mais prazo\", escolha a etapa, a nova data (e a hora, se quiser; sem hora vale o fim do expediente) e escreva o motivo. A representada responde na ficha dela: aceito, vale a nova data; recusado, segue o prazo vigente. Até a resposta, vale o prazo atual. Dá para pedir de novo, um pedido por vez em cada etapa. Tudo fica no histórico e no relatório A4.",
          "Avisos: a 75% do prazo de uma etapa da Metrolabs, quem responde pela representação recebe o aviso; vencida, também a gestão da área Técnica (RP12, uma vez por etapa). Na Assistência técnica, o selo e a central de pendências do chamado seguem a etapa da régua que vale agora.",
          "Chamado comum ligado depois à representada mantém o prazo com que nasceu e não entra na régua."
        ] },
        { titulo: "Acompanhar na Assistência técnica", itens: [
          "Em Assistência técnica > Chamados, o filtro \"Representação\" mostra só os chamados de representadas ou de uma delas, e cada chamado leva o selo roxo com o nome da representada.",
          "Na ficha do chamado, a parte \"Representação\" mostra o protocolo da representada, o enquadramento pretendido (garantia, fora de garantia, não sei), o relato, o contato no local e a galeria \"Imagens e vídeos\" (a mesma do módulo Representação).",
          "O que a equipe registra no histórico do chamado com público para o cliente aparece também para a representada. Registros internos não aparecem."
        ] }
      ],
      cores: [
        { nome: "Selo verde do prazo", significado: "Aceite em dia." },
        { nome: "Selo amarelo do prazo", significado: "Já passou de 75% do prazo de aceite: o responsável pela representação foi avisado." },
        { nome: "Selo vermelho do prazo", significado: "Prazo de aceite vencido: a gestão da área Técnica foi avisada e o item está na Caixa de decisões." },
        { nome: "Selo cinza \"pausado\"", significado: "A Metrolabs pediu complemento; o prazo só volta a contar quando a representada responder." },
        { nome: "Selo \"Nota interna\" na conversa", significado: "Nota interna: a representada não vê." },
        { nome: "Painel, borda azul ou barra azul", significado: "No prazo." },
        { nome: "Painel, amarelo", significado: "Prazo em risco (aceite a 75% do prazo; atendimento com 25% ou menos do prazo restante)." },
        { nome: "Painel, vermelho", significado: "Prazo vencido. Na barra do Gantt, a parte vermelha é o tempo depois do fim do prazo." },
        { nome: "Painel, cinza", significado: "Prazo pausado (complemento com a representada, ou peça e cliente quando o contrato permite) ou sem prazo." },
        { nome: "Painel, verde", significado: "Concluído no prazo. Marrom: concluído fora do prazo." },
        { nome: "Cartão com \"Régua: ...\"", significado: "A etapa da régua de prazos que vale agora e até quando. \"Com a representada\" quando a pendência é dela (previsão da peça ou resposta ao pedido de mais prazo)." }
      ],
      problemas: [
        { situacao: "Aparece \"a régua de prazos da representada é da gestão da área Técnica e de quem responde pela representação\"", oQueFazer: "Pedir mais prazo, registrar a chegada da peça, a avaliação e a previsão em nome da representada são da gestão da área Técnica e de quem responde pela representação (Regras da assistência > Representação). Peça a um deles." },
        { situacao: "Ao pedir mais prazo aparece \"já há um pedido ... aguardando a resposta da representada\"", oQueFazer: "Espere a resposta (ela recebe lembrete depois de 1 dia útil) ou fale com ela pela conversa do chamado. Até a resposta vale o prazo atual." },
        { situacao: "A régua continua em \"Relatório do atendimento\" depois de gerar o relatório", oQueFazer: "Só conta o relatório na versão da representada gerado pela Metrolabs. Na ficha do chamado > Relatórios do atendimento, toque em \"Gerar a versão da representada\"." },
        { situacao: "A representada não informa a previsão da peça", oQueFazer: "O prazo da Metrolabs fica pausado e o item aparece na central de pendências. Cobre pela conversa do chamado; se ela informar por outro canal, registre a previsão em nome dela na régua." },
        { situacao: "Aparece \"o cadastro da representada e do catálogo é do Administrador, da Diretoria, dos gestores e dos responsáveis pela representação\"", oQueFazer: "Peça a um deles, ou peça ao Administrador para colocar você como responsável em Regras da assistência > Representação." },
        { situacao: "A representada diz que o modelo dela não aparece no cadastro de equipamento", oQueFazer: "Ela mesma cadastra em \"Cadastrar modelo novo\" (no pedido) ou no catálogo dela. Se o modelo existe e está inativo, reative (situação Ativo)." },
        { situacao: "Ao alterar um modelo aparece \"escreva o motivo da alteração\"", oQueFazer: "Escreva o motivo (pelo menos 10 letras) no campo \"Motivo da alteração\" e salve de novo. Modelo novo não pede motivo." },
        { situacao: "Não aparece o aviso de pedido novo no canto da tela", oQueFazer: "O aviso vai para a gestão da Assistência técnica, para quem faz a triagem e para quem responde pela representação. Confira em Regras da assistência (Triagem e Representação). Atualize a página (F5) depois de mudar." },
        { situacao: "O aviso aparece, mas sem som", oQueFazer: "Clique em \"Clique para ativar o som\" (o navegador só toca som depois de um clique na página) e confira se o botão diz \"Som: ligado\" e se o som do computador está ligado." },
        { situacao: "O WhatsApp do pedido não chegou", oQueFazer: "Fora do expediente ou em dia não útil, ele sai na abertura do próximo expediente. Confira o celular em Administração > Usuários. Em Administração > Matriz de avisos > Avisos da gestão aparece cada aviso com o motivo (aguardando modelo, sem celular, teto do dia)." },
        { situacao: "Aparece \"abrir pedido em nome da representada (e ligar chamado a ela) é só de quem está na lista\"", oQueFazer: "Peça a quem está na lista, ou peça ao Administrador para incluir você (Representação > Representadas > Quem pode abrir pedido em nome da representada). Depois de incluído, atualize a tela (F5)." },
        { situacao: "Ao abrir em nome da representada, o cliente ou o equipamento não aparece", oQueFazer: "A busca é a mesma da representada: CNPJ ou CPF completo e a série exata. Se não há cadastro, cadastre em Cadastros > Clientes, Unidades ou Equipamentos e busque de novo. A busca feita para uma representada não vale para outra." },
        { situacao: "Aparece \"o chamado ... já está ligado à representada ...\"", oQueFazer: "O chamado já é de uma representada e não muda. Se a ligação foi errada, registre no histórico do chamado e fale com a gestão." },
        { situacao: "Ao aceitar, aparece que o equipamento já tem chamado em aberto", oQueFazer: "Confira se é o mesmo problema. Se for outro, aceite mesmo assim; se for o mesmo, recuse com o motivo e indique o chamado aberto." },
        { situacao: "A foto não aparece no relatório do cliente ou da representada", oQueFazer: "Libere a foto na ficha do chamado (Relatórios do atendimento > Quem vê nos relatórios) e gere o relatório de novo. Foto grande que ficou de fora: libere de novo para a tela gerar a cópia reduzida." },
        { situacao: "Ao gerar a versão da representada do período, aparece \"escolha a representada\"", oQueFazer: "Escolha a representada no filtro \"Representada\" do Painel: a versão dela só traz a carteira dela." },
        { situacao: "A pessoa da representada não consegue entrar", oQueFazer: "Confira em Administração > Usuários se a conta está ativa, com o perfil Representada, a representada e o papel; e se a representada está ativa na aba Representadas." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR", pode: "Tudo: pedidos, conversas, cadastro da representada e do catálogo, registro de ações. Abrir em nome da representada e ligar chamado a ela só para quem está na lista." },
        { perfil: "ADMIN", pode: "Define a lista \"Quem pode abrir pedido em nome da representada\" (começa vazia; o sistema só sugere, nunca marca sozinho)." },
        { perfil: "TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO,RH", pode: "Tratar pedidos (aceitar, pedir complemento, recusar) e conversar. O cadastro da representada e do catálogo é dos responsáveis pela representação e da gestão." },
        { perfil: "CLIENTE", pode: "Não usa este módulo." },
        { perfil: "REPRESENTADA", pode: "Usa a visão da representada (aba \"Como usar\" dentro do módulo)." }
      ],
      perguntas: [
        { p: "A representada vê os outros clientes da Metrolabs?", r: "Não. Ela busca cliente só pelo CNPJ ou CPF completo e equipamento só pela série exata, sem lista e sem busca por nome. Ela vê só os pedidos e chamados da empresa dela." },
        { p: "A representada vê valores?", r: "Não nesta etapa. Custos e fechamento entram em etapas seguintes do projeto." },
        { p: "A representada sabe que o pedido foi aberto pela Metrolabs?", r: "Sim. O pedido mostra \"Aberto pela Metrolabs (nome) a pedido de Fulano (representada), por telefone\" (ou e-mail, WhatsApp) e a linha do tempo também. No chamado ligado depois aparecem quem ligou, quando e o motivo." },
        { p: "Onde fica o que a representada faz?", r: "Na aba \"Registro de ações\": buscas, cadastros (também de modelos), pedidos e cancelamentos, com nome, data e hora." },
        { p: "A representada pode apagar um modelo?", r: "Só se nenhum equipamento usa o modelo. Se algum equipamento já usa, o modelo fica inativo: some da lista de escolha, mas o histórico e a garantia dos equipamentos continuam guardados." },
        { p: "Por que o aviso de pedido novo não volta depois de dispensado?", r: "Dispensar vale para você e para aquele aviso. O pedido continua na fila (aba Pedidos) e o aviso de 75% do prazo do mesmo pedido ainda aparece." },
        { p: "Por que o técnico vê menos chamados no Painel?", r: "O Painel mostra só os chamados que a pessoa pode abrir na Assistência técnica: o técnico vê os dele e os da fila livre; a gestão vê todos. A fila de pedidos é a mesma para todos." },
        { p: "Quem abre cada relatório gerado?", r: "A versão interna, só a equipe da Metrolabs. A da representada, só as pessoas daquela representada (o servidor confere a cada abertura do arquivo). A do cliente, só o cliente daquele chamado, em \"Meus chamados\" e no Arquivo de documentos do equipamento." },
        { p: "Quando o prazo do chamado da representada conta como cumprido?", r: "Por etapa: a primeira quando o atendimento é agendado; a do relatório quando a versão da representada é gerada; a da avaliação quando há novo atendimento, conclusão ou avaliação registrada. No fim, o chamado fica \"cumprido\" se todas as etapas da Metrolabs fecharam no prazo vigente (com as prorrogações aceitas)." },
        { p: "O que acontece com os chamados da representada que já estavam abertos?", r: "Passam para a régua sem ficar falsamente vencidos: a etapa 1 conta até o agendamento registrado no histórico (o chamado já agendado ou em atendimento dentro dos 3 dias úteis aparece como cumprido); as etapas seguintes começam a contar quando o atendimento for realizado ou a peça for pedida." },
        { p: "O que a representada vê no painel dela?", r: "Os mesmos índices de aceite, visita e conclusão, o Kanban e o Gantt, só da empresa dela. Ela não vê primeiro contato, fila de outras representadas, carga por técnico, notas internas nem valores." }
      ]
    },
    "representacao/representada": {
      titulo: "Representação (empresa representada)",
      paraQueServe: "Área da sua empresa no SGO+ da Metrolabs: você pede atendimento técnico para os clientes finais dos equipamentos que a sua empresa representa e acompanha cada pedido até o encerramento, com a linha do tempo, os arquivos e a conversa com a Metrolabs.",
      antesDeComecar: [
        "O seu acesso é pessoal. Não compartilhe a senha. Tudo o que é feito aqui fica registrado com o seu nome, a data e a hora.",
        "Os dados do cliente devem vir do próprio cliente ou da nota fiscal, completos e corretos. Não use informação buscada na internet.",
        "Tenha em mãos o CNPJ (ou CPF) completo do cliente, o número de série do equipamento, o nome, o telefone e o e-mail do contato no local e as fotos do equipamento e da etiqueta.",
        "Fotos e vídeos não podem mostrar pacientes, prontuários ou documentos pessoais."
      ],
      passos: [
        { titulo: "Acompanhar pelo Painel", itens: [
          "O \"Painel\" abre primeiro. No alto: pedidos e chamados abertos, aguardando a Metrolabs, aguardando a sua empresa, aguardando o cliente final, aceitos no prazo e os tempos médios até o aceite, até a visita e até a conclusão. Escolha o período (30, 90, 180 ou 365 dias).",
          "Os tempos são em horas úteis do expediente da Metrolabs e contam do envio do pedido; o tempo em que o pedido esperou o complemento da sua empresa não conta.",
          "Pendências da sua empresa aparecem em amarelo, no alto: toque em \"Responder agora\".",
          "Kanban: um cartão por pedido ou chamado, na etapa em que está; a borda é a cor do prazo. O cartão não se arrasta: a etapa muda pelo atendimento da Metrolabs. Os cartões \"Depende de você\" têm o botão para responder.",
          "Gantt: cada barra vai do envio até a conclusão (ou até hoje). Escolha a janela e veja por chamado ou por cliente. O tracejado é o fim do prazo; o losango vazado é a visita agendada e o cheio, a chegada do técnico.",
          "Indicadores: por etapa, por prioridade, por cliente, por UF, garantia (pelo cadastro do equipamento) e reincidência (mesmo equipamento com outro chamado em até 90 dias) por modelo e por equipamento.",
          "Na ficha do chamado, \"Marcos\" mostra o previsto e o realizado do aceite, da visita e da conclusão."
        ] },
        { titulo: "Pedir um atendimento", itens: [
          "Toque em \"Novo pedido\".",
          "Cliente: digite o CNPJ ou o CPF completo e toque em \"Buscar\". Achou: escolha a unidade. Não achou: preencha o cadastro completo (o botão da base pública da Receita preenche razão social e endereço; o contato precisa vir do cliente) e marque \"Ciente\".",
          "Modelo que não está na lista: toque em \"Cadastrar modelo novo\", logo abaixo do campo Modelo, preencha código, nome, tipo de equipamento, garantia em meses e, se souber, o padrão da série, e toque em \"Cadastrar o modelo\". O que você já digitou continua no formulário e o modelo novo já fica escolhido.",
          "Equipamento: digite o número de série como está na etiqueta e toque em \"Buscar\". Não achou: escolha o modelo, informe a série, a data da instalação, a nota fiscal de venda (se tiver), envie a foto da etiqueta e marque \"Ciente\". A garantia é calculada pelo modelo a partir da instalação ou da nota fiscal.",
          "Relato: setor, contato no local, sintoma (pelo menos 30 letras), quando começou, código de erro do visor (ou marque que não exibe), se o equipamento está parado, o risco de uso, o que já foi tentado e o enquadramento pretendido. Envie pelo menos 1 foto do equipamento e 1 da etiqueta; vídeo é opcional (até 100 MB; MP4, MOV, WEBM ou 3GP). O vídeo sobe logo depois do pedido, com a barra de progresso: não feche a tela até terminar.",
          "Toque em \"Enviar o pedido à Metrolabs\". A tela diz até quando a Metrolabs responde."
        ] },
        { titulo: "Prazos combinados com a Metrolabs", itens: [
          "Aceite do pedido: a Metrolabs aceita, pede complemento ou recusa dentro do prazo de aceite combinado com a sua empresa (aparece no alto do Painel).",
          "Depois do aceite, a Metrolabs tem o prazo de atendimento combinado (padrão 3 dias úteis) para estudar o caso e agendar o atendimento. É a primeira etapa da régua de prazos do chamado.",
          "Régua de prazos: depois de cada atendimento realizado, a Metrolabs tem 2 dias úteis para enviar o relatório do atendimento. Se precisar de peça, a sua empresa informa a data prevista de chegada na ficha do chamado; enquanto não informa, o atendimento aguarda a sua empresa (o prazo da Metrolabs fica pausado). Depois que a peça chega, a Metrolabs tem 2 dias úteis para avaliar.",
          "Na ficha do chamado, a caixa \"Régua de prazos\" mostra a etapa de agora, com quem está, até quando e o que falta; e a lista das etapas com o início, o prazo vigente, a conclusão e a situação.",
          "Informar a previsão da peça: na caixa \"Régua de prazos\", escolha a data prevista de chegada e toque em \"Informar a previsão\". Para mudar a data depois, toque em \"Atualizar a previsão da peça\" e diga o motivo. Se a data passar sem a peça chegar, a tela pede a nova previsão.",
          "Pedido de mais prazo da Metrolabs: chega por e-mail e aparece na caixa da régua com o motivo e a nova data. Toque em \"Aceitar o novo prazo\" (vale a nova data) ou escreva o motivo e toque em \"Recusar\" (segue o prazo atual). Até a resposta vale o prazo atual. Quem responde: administrador e atendentes da sua empresa.",
          "Dias úteis: segunda a sexta, das 08:00 às 17:30, sem feriados nacionais. O tempo em que o pedido espera o complemento da sua empresa não conta."
        ] },
        { titulo: "Imagens e vídeos", itens: [
          "Na ficha do pedido ou do chamado (aba \"Chamados\"), a galeria \"Imagens e vídeos\" mostra o que a sua empresa e a Metrolabs anexaram. Toque na miniatura para ver em tamanho grande ou assistir ao vídeo, e para baixar.",
          "Para anexar: escolha as imagens (até 10 por vez; JPG, PNG ou WEBP; reduzidas no aparelho para até 2 MB) e, se quiser, um vídeo (MP4, MOV, WEBM ou 3GP, até 100 MB), escreva a legenda e toque em \"Enviar para a galeria\". A Metrolabs recebe o aviso.",
          "Num pedido já aceito, o que você envia vai para o chamado. Pedido recusado ou cancelado e chamado encerrado ou cancelado não recebem imagens: se o problema voltou, abra um pedido novo.",
          "Enviou a imagem errada? Abra e toque em \"Retirar da galeria\", com o motivo. Retira quem enviou ou o administrador da sua empresa no sistema.",
          "Anexam o administrador, o atendente e o financeiro de garantia; o papel Leitura só consulta."
        ] },
        { titulo: "Acompanhar", itens: [
          "Em \"Chamados\" estão os seus pedidos e chamados com a etapa: Enviado, Complemento pedido, Recusado, Aceito em análise, Aguardando aprovação de orçamento, Aguardando peça, Visita a agendar ou agendada, Em atendimento, Concluído, Encerrado ou Cancelado.",
          "Toque no chamado para ver a linha do tempo, as imagens e os vídeos, os outros arquivos e a conversa. Quando a visita é agendada, aparecem a data e o técnico.",
          "Complemento pedido: responda na própria ficha (pode mandar fotos). O pedido volta para a Metrolabs.",
          "Antes da visita, o pedido ou o chamado pode ser cancelado com o motivo (se o contrato permitir).",
          "Pedido feito por telefone, e-mail ou WhatsApp: a Metrolabs pode abrir em nome da sua empresa. Ele aparece em \"Chamados\" com a faixa \"Aberto pela Metrolabs (nome) a pedido de (quem pediu), por (canal)\" e segue igual aos seus. Um chamado aberto antes (urgência) também pode ser ligado à sua empresa: aparece com quem ligou e o motivo."
        ] },
        { titulo: "Relatórios do atendimento e do período", itens: [
          "Na ficha do chamado, parte \"Relatórios do atendimento\", toque em \"Gerar relatório\". O documento A4 abre numa aba nova e fica salvo em HTML e PDF. No celular, o documento abre dentro do SGO+, com Voltar e Imprimir.",
          "A primeira folha traz o quadro \"Situação em\": situação, prazo de atendimento, aceite do pedido, visita, conclusão, com quem está o chamado e o próximo passo. Depois vêm o sumário, o resumo, cliente e equipamento com a garantia, o relato da abertura, os marcos previsto e realizado (aceite, visita e conclusão, com a diferença escrita), a linha do tempo, a visita, o diagnóstico e o serviço, as peças, as fotos liberadas pela Metrolabs, a conversa do chamado, os arquivos, a assinatura de quem recebeu o atendimento e o que quer dizer cada etapa.",
          "No Painel, \"Relatório do período\" gera o relatório da carteira da sua empresa no período escolhido: na capa, os abertos, o prazo cumprido e os pontos de atenção; depois os índices do painel, os gráficos, o Gantt, a lista dos pedidos e chamados e as definições dos índices.",
          "A aba \"Relatórios gerados\" do Painel e a ficha do chamado listam os documentos já gerados para abrir de novo. Cada emissão é uma versão nova; nenhuma é apagada. Só as pessoas da sua empresa abrem esses documentos."
        ] },
        { titulo: "Catálogo de modelos da sua empresa", itens: [
          "A aba \"Catálogo de modelos\" mostra os modelos da sua empresa: código, nome, tipo, família, garantia, padrão da série, situação, quem cadastrou e quantos equipamentos usam cada um. Só aparecem os modelos da sua empresa.",
          "\"Cadastrar modelo novo\": preencha e salve. O código é único na sua empresa.",
          "\"Alterar\": mude o que precisar e salve. Mudar a garantia vale para os equipamentos cadastrados daqui em diante; os já cadastrados mantêm a garantia gravada no cadastro deles. O código não muda depois que algum equipamento usa o modelo.",
          "\"Excluir\": se nenhum equipamento usa o modelo, ele sai do catálogo. Se algum equipamento já usa, o botão diz \"Inativar\": o modelo some da lista de escolha do pedido, mas o histórico e a garantia dos equipamentos continuam guardados. \"Reativar\" volta o modelo para a lista.",
          "\"Histórico\": quem cadastrou, alterou, inativou ou reativou, quando, o que mudou (antes e depois) e o motivo. Alterações feitas pela Metrolabs aparecem com \"(Metrolabs)\".",
          "No fim da tela, \"Excluídos do catálogo\" lista os modelos excluídos, com quem excluiu, quando e o histórico.",
          "Cadastram e alteram modelos o Administrador da representada e o Atendente. Os demais papéis consultam."
        ] },
        { titulo: "Conversar com a Metrolabs", itens: [
          "Cada pedido e cada chamado tem a sua conversa. Assuntos fora de um chamado (dúvida, inclusão de pessoa da sua equipe) vão no \"Canal geral\".",
          "Fora do horário de trabalho da Metrolabs, a resposta vem no próximo horário útil.",
          "Você recebe por e-mail quando o pedido é aceito, quando a Metrolabs pede complemento ou recusa, e quando ela escreve na conversa."
        ] }
      ],
      cores: [
        { nome: "Etapa em azul", significado: "Em andamento com a Metrolabs." },
        { nome: "Etapa em amarelo", significado: "Depende da sua empresa (por exemplo, complemento pedido)." },
        { nome: "Etapa em verde", significado: "Concluído ou encerrado." },
        { nome: "Etapa em cinza", significado: "Recusado ou cancelado." },
        { nome: "Painel: azul", significado: "No prazo." },
        { nome: "Painel: amarelo", significado: "Prazo em risco." },
        { nome: "Painel: vermelho", significado: "Prazo vencido." },
        { nome: "Painel: cinza", significado: "Prazo pausado (por exemplo, complemento pedido à sua empresa) ou sem prazo." },
        { nome: "Painel: verde", significado: "Concluído no prazo. Marrom: concluído fora do prazo." },
        { nome: "\"Depende de você\" no cartão", significado: "Complemento do pedido, previsão da peça ou resposta ao pedido de mais prazo esperando a sua empresa." }
      ],
      problemas: [
        { situacao: "Ao informar a previsão aparece que a data não pode ser anterior a hoje", oQueFazer: "Escolha a data prevista a partir de hoje. Se a peça já chegou, avise a Metrolabs pela conversa do chamado: ela registra a chegada." },
        { situacao: "Ao recusar o pedido de mais prazo aparece \"escreva o motivo da recusa\"", oQueFazer: "Escreva o motivo (pelo menos 5 letras) no campo \"Motivo\" e toque em \"Recusar\" de novo. O motivo fica no histórico e a Metrolabs é avisada." },
        { situacao: "Aparece que o seu papel não responde prazos", oQueFazer: "Informar a previsão da peça e responder o pedido de mais prazo são do administrador e dos atendentes da sua empresa." },
        { situacao: "Aparece que o CNPJ ou CPF não confere", oQueFazer: "Digite o número completo e confira os dígitos com o cliente ou na nota fiscal." },
        { situacao: "Aparece \"Muitas buscas seguidas\"", oQueFazer: "Espere o tempo indicado e busque de novo com o documento ou a série conferidos." },
        { situacao: "Aparece que a série já está cadastrada em outro cliente", oQueFazer: "Escreva no \"Canal geral\" para a Metrolabs conferir (equipamento vendido, transferido ou série digitada errada)." },
        { situacao: "O modelo do equipamento não aparece na lista", oQueFazer: "Toque em \"Cadastrar modelo novo\" logo abaixo do campo Modelo (ou cadastre na aba \"Catálogo de modelos\"). Se o modelo está inativo no catálogo, toque em \"Reativar\". O seu papel não cadastra? Peça ao administrador da sua empresa no sistema." },
        { situacao: "Ao cadastrar o modelo aparece que o código já existe", oQueFazer: "O modelo já está no catálogo: escolha-o na lista. Se ele estiver inativo, reative no \"Catálogo de modelos\" em vez de cadastrar de novo." },
        { situacao: "Ao alterar aparece que o código não muda", oQueFazer: "O código já está em equipamentos. Mantenha o código e altere os outros campos; se o código estava errado, cadastre um modelo novo com o código certo e inative o antigo." },
        { situacao: "Aparece que o seu papel não permite", oQueFazer: "Peça ao administrador da sua empresa ou à Metrolabs. O papel Leitura só consulta; o Financeiro de garantia consulta e conversa." },
        { situacao: "Aparece que a foto passa de 2 MB ou o vídeo passa de 100 MB", oQueFazer: "Tire a foto de novo pelo próprio botão (ela é reduzida no aparelho). Para o vídeo, grave de 30 segundos a 1 minuto mostrando o defeito, ou com qualidade menor (720p), e envie de novo." },
        { situacao: "O vídeo não toca na tela", oQueFazer: "Alguns vídeos de iPhone (MOV) não tocam no navegador do Windows. Toque em \"Baixar\" e abra no aparelho." },
        { situacao: "O envio do vídeo parou no meio", oQueFazer: "A conexão caiu: nada ficou na galeria. Confira a internet e envie de novo pela galeria \"Imagens e vídeos\" da ficha." }
      ],
      quemPode: [
        { perfil: "REPRESENTADA", pode: "Administrador da representada: tudo, mais ver a equipe e o registro de ações. Atendente: buscar, cadastrar, pedir atendimento, conversar e cancelar antes da visita. Financeiro de garantia: consultar e conversar. Leitura: só consultar." }
      ],
      perguntas: [
        { p: "Por que não há busca por nome do cliente?", r: "Para proteger os dados dos clientes atendidos pela Metrolabs. A busca é só pelo CNPJ ou CPF completo." },
        { p: "Como incluir ou tirar uma pessoa da minha equipe?", r: "Escreva no \"Canal geral\". A Metrolabs cria e inativa os acessos." },
        { p: "Se eu mudar a garantia de um modelo, muda a garantia dos equipamentos que já cadastrei?", r: "Não. A garantia de cada equipamento é gravada no cadastro dele. A garantia nova vale para os equipamentos cadastrados depois." },
        { p: "Onde vejo o relatório do atendimento?", r: "Na ficha do chamado, em \"Relatórios do atendimento\": toque em \"Gerar relatório\" e abra ou baixe o HTML e o PDF (A4). O relatório do período fica no Painel (\"Relatório do período\") e os gerados ficam na aba \"Relatórios gerados\" do Painel." },
        { p: "Se eu não responder o pedido de mais prazo, o que vale?", r: "O prazo atual da etapa. Você recebe um lembrete depois de 1 dia útil. Aceito, vale a nova data; recusado, segue o prazo atual." },
        { p: "Por que o atendimento aparece \"aguardando a sua empresa\" quando falta peça?", r: "Porque a data prevista de chegada da peça é informada pela sua empresa. Enquanto ela não é informada, o prazo da Metrolabs fica pausado. Informe na caixa \"Régua de prazos\" da ficha do chamado." },
        { p: "Por que o painel não muda sozinho?", r: "Para não atrapalhar quem está digitando. Toque em \"Atualizar\" no alto da tela." }
      ]
    }
  };
}
