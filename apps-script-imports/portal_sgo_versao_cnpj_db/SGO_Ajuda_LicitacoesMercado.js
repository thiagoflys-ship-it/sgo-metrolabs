/****************************************************
 * AJUDA "COMO USAR ESTA TELA" — SGO+ LICITAÇÕES, FORNECEDORES, CONCORRENTES E INTELIGÊNCIA DE MERCADO (03/11/2026)
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Manual completo: docs/MANUAL_MODULO_LICITACOES.md, seção "Fornecedores, concorrentes e
 * inteligência de mercado". Tela: licitacoes_mercado. A aba "Mercado" da ficha está também na ajuda de Oportunidades
 * (SGO_Ajuda_Licitacoes.js). Texto conferido com JS_Licitacoes_Mercado.html e SGO_Licitacoes_Mercado.js. Texto puro, sem HTML.
 ****************************************************/
function SGO_ajudaTelas_LicitacoesMercado_() {
  return {
    "licitacoes_mercado": {
      titulo: "Inteligência de mercado",
      paraQueServe: "Mostra quem são os concorrentes nas licitações do ramo, quem costuma ganhar em cada órgão e por quanto, e o preço de referência de mercado de cada serviço e equipamento (mediana, quartis, quantos preços e de quando), sempre com a fonte e o link. Também guarda o cadastro de fornecedores e concorrentes por CNPJ. É só consulta: nada é criado em outro módulo e a IA não decide nada.",
      antesDeComecar: [
        "Os dados vêm de três fontes: os resultados publicados no PNCP (o coletor do servidor lê o vencedor e o preço homologado de cada item das licitações do ramo, 2 dias depois do fim das propostas), as disputas da Metrolabs registradas pela Diretoria e os registros manuais da Diretoria (ata lida, com a fonte).",
        "O PNCP publica só o vencedor de cada item. Quem participou e perdeu aparece só pelas disputas da Metrolabs e pelos registros manuais: por isso a coluna se chama \"participações conhecidas\".",
        "O coletor lê no máximo 40 consultas por rodada (cerca de 2 minutos, no ritmo do PNCP): no começo os números crescem aos poucos."
      ],
      passos: [
        { titulo: "Consultar", itens: [
          "Escolha o período (padrão: últimos 24 meses) e, se quiser, escreva na busca o nome, o CNPJ, o órgão ou o serviço. Toque em \"Filtrar\".",
          "Concorrentes: participações conhecidas, vitórias, itens ganhos, desconto médio sobre o valor estimado do edital, onde mais ganha e em quais UFs. \"Abrir\" mostra a faixa de preço por tipo de serviço e cada registro com a fonte.",
          "Órgãos: quantas contratações com resultado, quem mais ganha e o desconto médio. \"Abrir\" mostra quem ganha e por quanto, e cada resultado com o link.",
          "Preço de referência: um grupo por tipo de serviço, equipamento e unidade (preço por unidade não se compara com preço por lote ou por mês). Toque no grupo para ver o 1º quartil, a mediana, o 3º quartil, o menor e o maior, o n, o período, o desconto e as fontes mais recentes com o link."
        ] },
        { titulo: "Ler os números com cuidado", itens: [
          "\"Amostra pequena\" (menos de 5 preços): use como indício, não como referência de preço.",
          "\"Sem dados\": nenhum preço no período. O sistema nunca inventa um número.",
          "Registro de preços: vence o item só o resultado de ordem 1 (ou o único não cancelado); os demais aparecem como \"cadastro de reserva\", contam como participação e ficam fora do preço.",
          "Registro manual do mesmo item que o PNCP já trouxe não conta duas vezes: vale o PNCP.",
          "O grupo é reconhecido pelo texto do item (calibração, manutenção, qualificação, NR-13, segurança elétrica e o equipamento). Item com texto genérico cai em \"Outro serviço\"."
        ] },
        { titulo: "Cadastro de fornecedores e concorrentes", itens: [
          "Um cadastro por CNPJ, conferido pelos dígitos verificadores (aceita o CNPJ com letras). Digite as 14 posições. CPF que vier no nome do fornecedor não é gravado nem mostrado. Ele se forma sozinho com os vencedores lidos no PNCP e nas disputas.",
          "O que uma fonte traz só preenche campo vazio. Valor diferente do cadastro aparece em \"Variantes para conferir\", com a fonte e a data; \"Usar este valor\" troca o campo, com o motivo.",
          "\"Novo fornecedor\" cadastra pelo CNPJ (razão social obrigatória); \"Mudar o cadastro\" muda só os campos preenchidos (campo em branco não apaga nada). Todo campo mudado fica no histórico (de → para) com o seu nome.",
          "Concorrentes das disputas sem CNPJ: o nome digitado nos lances fica separado até você tocar em \"Ligar ao CNPJ\", com o motivo. A partir daí as participações e vitórias desse nome contam para o CNPJ."
        ] },
        { titulo: "Registros manuais", itens: [
          "\"Registrar resultado ou participação\": quem venceu (com o valor unitário) ou quem participou sem vencer, o órgão ou a licitação do SGO+, a descrição do item, a data, a fonte (obrigatória) e o link.",
          "Registro errado: \"Anular\", com o motivo. Ele sai das contas e continua guardado. O resultado que veio do PNCP não se anula aqui: se estiver errado lá, o órgão corrige e o coletor traz a versão nova."
        ] },
        { titulo: "Na ficha da licitação (aba Mercado)", itens: [
          "Quem costuma ganhar neste órgão e neste tipo de objeto (e quantas vezes na mesma UF), o resultado desta licitação quando o PNCP publicar e o preço praticado no mercado item a item, comparado com a simulação salva na aba Preço (abaixo do 1º quartil, entre os quartis ou acima do 3º).",
          "\"Buscar resultados no PNCP agora\" passa a licitação na frente da fila do coletor (sai na próxima rodada, em até 2 horas)."
        ] }
      ],
      cores: [
        { nome: "Selo laranja \"amostra pequena\"", significado: "Menos de 5 preços no grupo: indício, não referência." },
        { nome: "Selo cinza \"sem dados\"", significado: "Nenhum preço no período para o grupo." },
        { nome: "Selo laranja \"sem CNPJ\" ou \"variante\"", significado: "Nome de disputa ainda não ligado a um CNPJ, ou fonte que informou um valor diferente do cadastro." },
        { nome: "Selo verde \"dentro da faixa\" / laranja \"abaixo\" ou \"acima do mercado\"", significado: "Onde o preço da nossa proposta fica entre os quartis do mercado (ficha, aba Mercado)." },
        { nome: "Selo vermelho \"alterado fora do SGO+\"", significado: "O registro não confere com o hash gravado: avise o Administrador." }
      ],
      problemas: [
        { situacao: "A tela está vazia", oQueFazer: "Ela diz o porquê: sem o coletor neste ambiente, coletor que ainda não leu nada, ou nada no período e no filtro. Aumente o período, toque em \"Sincronizar agora\", peça \"Buscar resultados no PNCP\" na ficha de uma licitação encerrada ou registre um resultado lido em ata." },
        { situacao: "Aparece \"o número digitado não confere nos dígitos verificadores\"", oQueFazer: "O CNPJ está errado: confira no cartão CNPJ ou na ata. Nada foi gravado." },
        { situacao: "Aparece \"o nome já está ligado ao CNPJ\"", oQueFazer: "Um nome liga a um CNPJ só. Abra a ficha do fornecedor indicado e confira." },
        { situacao: "O preço de um item não tem grupo de mercado", oQueFazer: "O texto do item não indica o serviço (calibração, manutenção, qualificação, NR-13, segurança elétrica). A comparação desse item fica sem dados." },
        { situacao: "\"Buscar resultados no PNCP\" foi recusado", oQueFazer: "A mensagem diz o porquê: licitação que não veio do PNCP (registre o resultado da ata à mão) ou coletor fora deste ambiente." }
      ],
      quemPode: [
        { perfil: "DIRETORIA,ADMIN", pode: "Consultar tudo, cadastrar e mudar fornecedores (com motivo), ligar nomes de disputa ao CNPJ, registrar e anular registros manuais, sincronizar e pedir a busca dos resultados no PNCP." },
        { perfil: "GESTOR,COMERCIAL,FINANCEIRO,TECNICO,METROLOGIA,RH,CLIENTE", pode: "Não usa esta tela: o menu não aparece e o servidor recusa as chamadas. Quem tem pedido de parecer aberto vê o quadro do mercado no pedido: Técnica e Comercial só nomes e contagens, sem valor nenhum; Licitações e Financeira também o preço praticado." }
      ],
      perguntas: [
        { p: "O sistema sugere o preço da proposta?", r: "Não. Mostra o preço praticado no mercado com a fonte; o preço da proposta é da Diretoria, na aba Preço." },
        { p: "Por que um concorrente tem participações e nenhuma vitória?", r: "Ele apareceu nas disputas da Metrolabs (lances digitados) ou num registro manual sem ter vencido. O PNCP só publica vencedores." },
        { p: "Posso apagar um fornecedor?", r: "Não: nada é apagado. Corrija os campos com o motivo; o histórico guarda o que era." },
        { p: "De quanto em quanto tempo os resultados chegam?", r: "O coletor lê as licitações do ramo 2 dias depois do fim das propostas e confere de novo a cada 7 dias até todos os itens terem situação final (até 180 dias)." }
      ]
    }
  };
}
