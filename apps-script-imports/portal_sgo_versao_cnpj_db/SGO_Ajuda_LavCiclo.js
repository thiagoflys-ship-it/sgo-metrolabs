/**
 * Ajuda "Como usar esta tela" — Relatórios de ciclo da lavadora (31/10/2026).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Texto puro, sem HTML. Conferido contra a tela real (JS_LavCiclo.html).
 * A configuração das referências por receita é da gestão: aparece só nas linhas de "quem pode" desses perfis e no manual
 * da gestão (docs/MANUAL_RELATORIO_CICLO_LAVADORA_GESTAO.md); o cliente não vê.
 * 01/11/2026: resultado NÃO LIBERADO (firmware REV20261101), coluna e filtro próprios, códigos de falha 17 e 18 e a nota
 * dos arquivos antigos com código 2 no arrefecimento.
 */
function SGO_ajudaTelas_LavCiclo_() {
  return {
    "lavadora_ciclos": {
      titulo: "Relatórios de ciclo",
      paraQueServe: "Transforma o arquivo que a lavadora grava a cada ciclo (.sgolav) num relatório A4 de uma folha, salvo no histórico do equipamento. A folha traz a fita impressa pela lavadora, o gráfico de temperatura, os indicadores do ciclo, a conclusão e o campo de aprovação com a assinatura do responsável pelo local, feita na tela.",
      antesDeComecar: [
        "A lavadora precisa estar cadastrada no SGO+ e ligada ao cliente. Os dados do cliente e do equipamento que saem no relatório vêm do cadastro, nunca do arquivo.",
        "Copie o arquivo do ciclo da lavadora pelo Wi-Fi da máquina ou pelo cartão. É o arquivo com o nome do lote e final .sgolav (por exemplo, LOT-20261030-6222.sgolav). Os arquivos .csv e .txt do mesmo lote não servem.",
        "Não abra nem edite o arquivo antes de importar: arquivo mexido é recusado.",
        "Pelo QR code da lavadora, a tela abre direto no equipamento certo.",
        "Ao abrir a tela, não aparece a lista de lavadoras: aparecem os índices, a busca e o Kanban dos relatórios. As lavadoras aparecem depois da busca."
      ],
      passos: [
        { titulo: "Achar uma lavadora ou um relatório", itens: [
          "No campo de busca, escreva o nome do cliente, o CNPJ, o número de série, a TAG, o patrimônio, o modelo ou o lote.",
          "Pode escrever sem acento e só uma parte (por exemplo, \"alfa\", o CNPJ sem pontos ou os últimos números do lote).",
          "Toque em \"Buscar\".",
          "Para escolher o período, o resultado ou a assinatura, toque em \"Mais filtros\".",
          "Para ver a lista completa, toque em \"Ver todas as lavadoras\".",
          "Para voltar aos índices e ao Kanban, toque em \"Voltar ao painel\"."
        ] },
        { titulo: "Usar o Kanban dos relatórios", itens: [
          "As colunas são: Aguardando assinatura, Nova versão aguardando assinatura, Com falha (cancelado ou reprovado) e Assinado e aprovado.",
          "Quando há ciclo com o resultado NÃO LIBERADO, aparece também a coluna \"Não liberado (câmara quente no fim)\".",
          "No celular, toque num dos quadros de cima para ver aquela situação.",
          "Toque num cartão para abrir o relatório, baixar o PDF, assinar ou ver as versões.",
          "Cada coluna mostra os 6 mais recentes. Toque em \"Ver todos\" para ver os outros."
        ] },
        { titulo: "Gerar o relatório pelo QR code da lavadora", itens: [
          "Leia o QR code da etiqueta da lavadora com a câmera do celular.",
          "Entre com o seu e-mail e a sua senha, se o sistema pedir.",
          "No cartão \"Relatório do ciclo\", toque em \"Gerar relatório do ciclo\".",
          "Toque em \"Escolher o arquivo do ciclo\" e escolha o arquivo .sgolav.",
          "Confira o lote, a data, o horário, a receita e o resultado.",
          "Se estiver certo, toque em \"Confirmar e gerar o relatório\".",
          "Se não for o ciclo desta lavadora, toque em \"Escolher outro arquivo\"."
        ] },
        { titulo: "Gerar o relatório pela tela", itens: [
          "No menu, toque em \"Relatórios de ciclo\".",
          "Na busca, escreva a TAG, a série, o patrimônio ou o nome do cliente e toque em \"Buscar\".",
          "Na lavadora certa, toque em \"Gerar relatório do ciclo\".",
          "Toque em \"Escolher o arquivo do ciclo\" e escolha o arquivo .sgolav.",
          "Confira os dados e toque em \"Confirmar e gerar o relatório\".",
          "Toque em \"Voltar\" para voltar à busca que você tinha feito."
        ] },
        { titulo: "Assinar o relatório na tela", itens: [
          "Logo depois de gerar, toque em \"Assinar agora\". Para assinar depois, toque no cartão do relatório na coluna \"Aguardando assinatura\" e em \"Assinar\".",
          "Toque em \"Abrir o relatório para conferir\" e leia a folha.",
          "Assine no quadro com o dedo (celular) ou com o mouse (computador). No celular, a assinatura ocupa a tela inteira e a página não rola enquanto você assina.",
          "Se errar, toque em \"Desfazer\" para tirar o último traço ou em \"Limpar\" para recomeçar.",
          "Escreva o nome e o cargo de quem assina.",
          "Marque \"Conferi os dados do relatório\".",
          "Toque em \"Assinar\".",
          "Depois de assinado, o documento fica travado. Uma correção só pela Metrolabs, em nova versão."
        ] },
        { titulo: "Abrir, ler e baixar um relatório", itens: [
          "Ache o relatório pela busca ou pelo Kanban.",
          "Toque em \"Abrir o relatório\" para ver a folha A4. No celular, a folha abre dentro do SGO+, no visualizador, com \"Voltar\", \"Imprimir\" e \"Baixar PDF\" no alto; no computador, abre em aba nova.",
          "No celular, a folha abre inteira, do tamanho da tela. Para ler de perto, afaste dois dedos ou toque em \"Ver em tamanho real\"; \"Ajustar a folha à tela\" volta.",
          "Toque em \"Baixar PDF\" para guardar o arquivo. O PDF e a impressão saem em uma folha A4.",
          "Toque em \"Versões e histórico\" para ver quem gerou, quem assinou e as versões anteriores."
        ] },
        { titulo: "Completar o cadastro do equipamento", itens: [
          "Se a tela mostrar \"O cadastro desta lavadora está sem...\", o relatório sai assim mesmo, com um traço nesses campos.",
          "Quem pode editar o cadastro toca em \"Completar o cadastro do equipamento\", preenche e salva.",
          "Para o relatório já gerado mostrar o cadastro completo, a equipe da Metrolabs gera uma nova versão."
        ] },
        { titulo: "Gerar nova versão (equipe da Metrolabs)", itens: [
          "Abra o relatório pelo cartão do Kanban ou toque em \"Versões e histórico\" no resultado da busca.",
          "Toque em \"Gerar nova versão\".",
          "Escreva o motivo (pelo menos 10 letras) e toque em \"Gerar nova versão\".",
          "A versão anterior continua guardada, marcada como substituída. A nova precisa de assinatura de novo."
        ] }
      ],
      cores: [
        { nome: "Índice em vermelho", significado: "Há o que olhar: relatório aguardando assinatura, ciclo cancelado ou reprovado, ou manutenção preventiva vencida." },
        { nome: "Borda do cartão no Kanban", significado: "Laranja: aguardando assinatura. Azul: nova versão aguardando assinatura. Vermelha: com falha. Âmbar: não liberado. Verde: assinado e aprovado." },
        { nome: "Selo verde \"APROVADO\"", significado: "A lavadora concluiu o ciclo sem falha registrada." },
        { nome: "Selo âmbar \"NÃO LIBERADO\"", significado: "O processo foi concluído: lavagem, enxágue e desinfecção cumpridos e cuba drenada. A lavadora bloqueou a liberação da carga porque a câmara não esfriou até a temperatura-alvo no fim do ciclo (código 17). Não é ciclo aprovado nem cancelado. A tampa só destrava abaixo de 45 °C." },
        { nome: "Selo vermelho \"CANCELADO\" ou \"REPROVADO\"", significado: "O ciclo não chegou ao fim. O relatório sai com a falha em destaque e diz que a carga não deve ser liberada com base nele." },
        { nome: "Selo laranja \"Aguardando assinatura\"", significado: "O relatório foi gerado e ainda não foi assinado pelo responsável pelo local." },
        { nome: "Selo verde \"Assinado\"", significado: "Assinado na tela. O documento está travado." },
        { nome: "Selo cinza \"Substituída pela versão nova\"", significado: "Versão antiga, guardada no histórico. Vale a versão mais nova." },
        { nome: "Faixa laranja \"O cadastro desta lavadora está sem...\"", significado: "Falta um dado do cadastro (série, setor, unidade...). Não impede o relatório." }
      ],
      problemas: [
        { situacao: "\"Este arquivo não é o arquivo de ciclo da lavadora (.sgolav)\"", oQueFazer: "Escolha o arquivo do mesmo lote com final .sgolav. O .csv e o .txt não servem." },
        { situacao: "\"O conteúdo do arquivo está corrompido, incompleto ou foi alterado\"", oQueFazer: "Copie o arquivo de novo direto da lavadora e escolha sem abrir nem editar. Se repetir com o arquivo novo, avise a Metrolabs." },
        { situacao: "\"Este lote já tem relatório para esta lavadora\"", oQueFazer: "O mesmo ciclo não é importado duas vezes. Toque em \"Abrir o relatório que já existe\"." },
        { situacao: "\"Este arquivo é de outro equipamento\"", oQueFazer: "O arquivo informa a série de outra máquina. Importe pelo QR code ou pela ficha da máquina de onde o arquivo foi copiado." },
        { situacao: "\"Acesso negado: este equipamento não pertence à sua empresa\"", oQueFazer: "Confira se leu o QR code da máquina certa. Se a máquina for da sua empresa, peça à Metrolabs para corrigir o cadastro." },
        { situacao: "\"o relatório ... já foi assinado\"", oQueFazer: "O documento assinado fica travado. Para corrigir, peça à Metrolabs uma nova versão, com o motivo." },
        { situacao: "\"Nada encontrado\" na busca", oQueFazer: "Confira a grafia ou busque só por uma parte: uma palavra do nome do cliente, o CNPJ sem pontos, os últimos números da série ou do lote." },
        { situacao: "\"o campo da busca está vazio\" ou \"escreva pelo menos 2 letras ou números\"", oQueFazer: "Escreva o que procura antes de tocar em \"Buscar\", ou toque em \"Ver todas as lavadoras\"." },
        { situacao: "A sua lavadora não aparece em \"Ver todas as lavadoras\"", oQueFazer: "A lavadora não está cadastrada ou não está ligada ao seu cliente. Peça à Metrolabs para cadastrar." },
        { situacao: "\"A assinatura ficou curta demais\"", oQueFazer: "Foi só um toque no quadro. Toque em \"Limpar\" e assine de novo." },
        { situacao: "Relatório com o resultado \"NÃO LIBERADO\"", oQueFazer: "Siga o procedimento da unidade para a carga, com a avaliação do responsável pelo local. Peça à Metrolabs para verificar o arrefecimento da lavadora (água de resfriamento e temperatura da rede)." },
        { situacao: "Faixa \"Nota sobre o código 2 deste arquivo\"", oQueFazer: "Nada a corrigir. O arquivo é de uma revisão anterior do firmware, em que o código 2 também saía quando o arrefecimento passava do tempo. O resultado gravado pela lavadora continua o mesmo." }
      ],
      quemPode: [
        { perfil: "ADMIN,DIRETORIA,GESTOR,METROLOGIA", pode: "Gerar, assinar e baixar relatórios de qualquer lavadora; gerar nova versão; completar o cadastro do equipamento; cadastrar e confirmar a referência da desinfecção por receita na aba \"Referências por receita\"." },
        { perfil: "TECNICO,COMERCIAL,FINANCEIRO", pode: "Gerar, assinar e baixar relatórios de qualquer lavadora; gerar nova versão; completar o cadastro do equipamento; consultar as referências por receita." },
        { perfil: "CLIENTE", pode: "Gerar, assinar e baixar os relatórios das lavadoras da sua empresa, no computador e no celular. Os equipamentos de outros clientes não aparecem." }
      ],
      perguntas: [
        { p: "De onde vêm os dados do cliente e da lavadora no relatório?", r: "Do cadastro do SGO+. Do arquivo vêm só os dados do ciclo: lote, receita, horários, fases, temperaturas, eventos, resultado e falha." },
        { p: "Por que preciso conferir o lote antes de confirmar?", r: "Porque o arquivo não traz o número de série da máquina. A ligação com a lavadora vem do QR code ou da sua escolha na tela." },
        { p: "A fita no relatório é uma foto do papel?", r: "Não. É a reprodução do comprovante que a lavadora imprime, montada a partir do mesmo arquivo, na mesma ordem. Como no papel, só os 8 últimos eventos aparecem." },
        { p: "Quem escreveu a conclusão?", r: "O relatório diz. Ou a redação foi assistida por inteligência artificial e conferida automaticamente com os números do arquivo, ou foi escrita por regra fixa do sistema. Se o texto da inteligência artificial não bater com os dados, vale a regra fixa." },
        { p: "O gráfico mostra a temperatura minuto a minuto?", r: "Não. O arquivo traz a temperatura máxima de cada fase. O gráfico mostra esse valor sobre a duração de cada fase." },
        { p: "Ciclo cancelado também gera relatório?", r: "Sim. Sai com a falha em destaque, para registro." },
        { p: "Qual a diferença entre CANCELADO e NÃO LIBERADO?", r: "CANCELADO: o ciclo foi interrompido antes de terminar as etapas. NÃO LIBERADO: todas as etapas foram cumpridas, mas a câmara continuou acima da temperatura-alvo no fim do arrefecimento, e a lavadora bloqueou a liberação da carga. Em \"Mais filtros\", o resultado \"Não liberado\" tem filtro próprio." },
        { p: "O texto da falha no relatório mudou. Por quê?", r: "O relatório mostra o texto que a lavadora gravou no arquivo. As revisões novas do firmware usam textos mais claros para os mesmos códigos; o número do código não mudou." },
        { p: "Posso assinar mais tarde?", r: "Sim. O relatório fica na coluna \"Aguardando assinatura\" do Kanban. Toque no cartão e em \"Assinar\"." },
        { p: "Por que a tela não mostra a lista de lavadoras ao abrir?", r: "Para abrir rápido e mostrar primeiro o que precisa de atenção. Busque a lavadora pelo nome do cliente, CNPJ, série, TAG, patrimônio ou modelo, ou toque em \"Ver todas as lavadoras\"." },
        { p: "No celular a folha fica pequena. Está certo?", r: "Sim. A folha abre inteira, do tamanho da tela, igual ao PDF. Afaste dois dedos ou toque em \"Ver em tamanho real\" para ler de perto." }
      ],
      secoesManual: [
        { titulo: "O que o relatório afirma e o que não afirma", paragrafos: [
          "Os indicadores mostram só o que o arquivo da lavadora sustenta: resultado registrado, temperatura máxima e duração da desinfecção térmica, tempo total, temperatura no término, falha, manutenção preventiva, fases e pausas.",
          "O relatório não usa critério de norma nem valor A0, porque o arquivo não traz a curva contínua do sensor. Quando há valor de referência cadastrado para a receita, a comparação aparece com a observação \"a confirmar pelo responsável técnico\" até ser confirmada."
        ] },
        { titulo: "Resultados que a lavadora registra", paragrafos: [
          "APROVADO: o ciclo terminou com sucesso, arrefecimento incluído.",
          "NÃO LIBERADO: o processo foi concluído (etapas de limpeza, enxágue e desinfecção cumpridas e registradas, cuba drenada), mas o arrefecimento de fim de ciclo esgotou o tempo com a câmara acima da temperatura-alvo, e a lavadora bloqueou a liberação da carga (código 17). A tampa só destrava com leitura válida abaixo de 45 °C. O relatório sai em âmbar.",
          "CANCELADO: o ciclo foi interrompido antes do fim. O relatório sai em vermelho, com a falha em destaque.",
          "Os arquivos de revisões anteriores do firmware continuam sendo lidos. Neles, o código 2 (SUBTEMPERATURA) também era gravado quando o arrefecimento passava do tempo; quando a última fase registrada é a de arrefecimento, o relatório traz uma nota explicando isso e mantém o resultado gravado pela máquina."
        ] }
      ]
    }
  };
}
