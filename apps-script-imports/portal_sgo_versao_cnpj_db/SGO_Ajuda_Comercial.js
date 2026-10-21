/**
 * SGO_Ajuda_Comercial.js — ajuda "Como usar esta tela" do Comercial nativo (21/10/2026).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Telas: JS_Comercial.html. Regras: SGO_Comercial_*.js.
 * Manual completo: docs/MANUAL_MODULO_COMERCIAL.md.
 */
function SGO_ajudaTelas_Comercial_() {
  var quem = [
    { perfil: 'COMERCIAL', pode: 'Trabalhar as próprias oportunidades e propostas, ver a própria lista do dia e os próprios números. Quem tem a área Comercial no cadastro também é vendedor.' },
    { perfil: 'GESTOR', pode: 'Gestor com área Comercial (ou listado na Metodologia) é a gestão comercial: vê a equipe toda, troca responsável, reabre oportunidade, aprova desconto, mantém catálogo e metodologia. Gestor de outra área não vê o Comercial.' },
    { perfil: 'DIRETORIA,ADMIN', pode: 'Tudo da gestão comercial, inclusive decidir o desconto de quem é da gestão.' },
    { perfil: 'FINANCEIRO', pode: 'Só a tela Pedidos aprovados, com o valor e os dados de faturamento.' },
    { perfil: 'TECNICO,METROLOGIA,RH', pode: 'Não veem o Comercial nem valores. Recebem a parte deles do pedido aprovado como atividade em Minhas atividades, sem valor.' }
  ];
  return {
    'comercial': {
      titulo: 'Hoje no Comercial',
      paraQueServe: 'Mostra o que fazer hoje, em ordem de prioridade, segundo a metodologia comercial da empresa: oportunidades sem próxima ação, retornos atrasados ou de hoje, oportunidades paradas ou esfriando, propostas sem resposta ou perto de vencer, pedidos aprovados sem passagem aos setores. Quem monta a lista é a gestora comercial do sistema, que conhece as regras escritas pela gestão. Para a gestão, mostra o panorama da equipe e as decisões pendentes.',
      antesDeComecar: [
        'A gestora comercial só sugere: ela não envia nada ao cliente, não aprova desconto e não muda etapa. Quem decide e envia é você.',
        'Todo dia útil, no começo do expediente, a lista é montada para cada vendedor. A tela sempre confere a situação de agora: o que você já resolveu sai da lista.',
        'Sem a chave da IA, a lista é a mesma, com os textos padrão das regras.'
      ],
      passos: [
        { titulo: 'Trabalhar a lista do dia', itens: ['Comece pelos itens marcados "Antes de tudo".', 'Leia o "Por quê" e o "Próximo passo".', 'Toque em "Abrir" para ir à oportunidade ou à proposta e fazer o que foi sugerido.', 'Se houver mensagem pronta, toque em "Copiar mensagem", revise e envie você mesmo pelo WhatsApp ou e-mail.', 'Toque em "Feito" ou em "Não se aplica" (com o motivo). Isso ensina a gestão quais regras funcionam.'] },
        { titulo: 'Pedir a análise da gestora agora', itens: ['Toque em "Pedir a análise da gestora agora".', 'A gestora reescreve o motivo e o próximo passo de cada item com a metodologia. Todo texto é conferido contra os dados do sistema; o que citar número que não existe é recusado e fica o texto das regras.'] },
        { titulo: 'Gestão: panorama e perguntas', itens: ['Na aba "Panorama da gestão" aparecem os alertas de cadência (vendedor sem contato registrado em 10 dias, funil parado), descontos e reaberturas esperando decisão e pedidos sem passagem.', 'Em "Pergunte à gestora", escreva a pergunta sobre o funil. A resposta usa só os números do sistema; se não der para responder com segurança, a gestora diz isso.'] }
      ],
      cores: [
        { nome: 'Faixa vermelha "Antes de tudo"', significado: 'Sem próxima ação, retorno atrasado, parada ou pedido aprovado sem passagem. Resolva primeiro.' },
        { nome: 'Faixa laranja "Hoje"', significado: 'Retorno de hoje, proposta sem resposta ou vencendo, desconto negado.' },
        { nome: 'Faixa azul ou cinza', significado: 'Acompanhamento: esfriando, muito tempo na etapa, qualificação incompleta, funil com poucas oportunidades.' }
      ],
      problemas: [
        { situacao: 'Um item que já resolvi continua na lista.', oQueFazer: 'Toque em "Atualizar". Se o retorno foi concluído direto em Minhas atividades sem marcar o próximo passo, a oportunidade fica "sem próxima ação": registre o contato na oportunidade.' },
        { situacao: 'Aparece "o verificador recusou o texto da IA".', oQueFazer: 'É uma proteção: a IA citou algo que não está no sistema. Vale o texto das regras, que é seguro.' },
        { situacao: 'Não aparece o botão da análise da gestora.', oQueFazer: 'A chave da IA não está cadastrada. A lista funciona do mesmo jeito; o Administrador cadastra a chave em Chaves e senhas.' }
      ],
      quemPode: quem,
      perguntas: [
        { p: 'Vou receber cobrança no WhatsApp a cada hora?', r: 'Não. O Comercial não manda WhatsApp. Cada retorno ao cliente é uma atividade em Minhas atividades: o sistema cobra até resolver, o e-mail sai no expediente e o WhatsApp só no resumo diário das atividades. Atrasado há 2 dias úteis, o retorno entra na Caixa de decisões do gestor comercial.' },
        { p: 'A gestora pode mandar a mensagem por mim?', r: 'Não. Ela escreve a sugestão; você copia, revisa e envia.' }
      ],
      secoesManual: [
        { titulo: 'Como a gestora comercial trabalha', paragrafos: [
          'A gestora conhece a metodologia que a gestão escreve em Comercial > Metodologia comercial: funis e etapas, critérios de saída, qualificação (dor, decisor, verba, prazo), cadência de retorno, estratégias quando o cliente não responde, objeções, política de desconto e motivos de perda.',
          'Primeiro ela aplica as regras (funcionam sem IA). Depois, com a IA, reescreve os textos com a metodologia. Todo texto da IA passa pelo verificador do sistema: número que não está nos dados, norma, promessa de preço, prazo ou desconto, ou afirmação de que enviou algo, e o texto é recusado.',
          'Cada sugestão fica registrada com a decisão do vendedor (feito, usei, não se aplica, descartei), e a gestão vê em Metodologia quais regras funcionam.'
        ] }
      ]
    },
    'comercial_oportunidades': {
      titulo: 'Oportunidades',
      paraQueServe: 'Cada venda, do primeiro contato ao pedido. A oportunidade nasce ligada ao cliente, à unidade, ao contato e, quando fizer sentido, aos equipamentos do cadastro único, e anda pelas etapas do funil (Engenharia ou Produtos). Toda oportunidade aberta tem próxima ação com data, que vira atividade em Minhas atividades.',
      antesDeComecar: ['O cliente precisa estar em Cadastros > Clientes (com a unidade, se tiver).', 'O contato do cliente pode ser cadastrado na própria oportunidade (botão "Novo contato").'],
      passos: [
        { titulo: 'Criar uma oportunidade', itens: ['Toque em "Nova oportunidade".', 'Busque o cliente pelo nome ou CNPJ e escolha a unidade e o contato.', 'Escreva o título (o que o cliente precisa), escolha funil, etapa, origem e informe o valor estimado.', 'Preencha a próxima ação (o que fazer e quando) e toque em "Criar oportunidade". A atividade aparece em Minhas atividades.'] },
        { titulo: 'Registrar um contato com o cliente', itens: ['Abra a oportunidade e toque em "Registrar contato".', 'Diga como foi, se o cliente respondeu e o que aconteceu.', 'Marque a próxima ação. A atividade anterior é concluída e a nova é criada.'] },
        { titulo: 'Pedir o próximo passo à gestora', itens: ['Toque em "Próximo passo da gestora".', 'Ela sugere o passo, o porquê, perguntas para o cliente e os textos de WhatsApp e e-mail.', 'Copie, revise e envie você mesmo. Depois registre o contato.'] },
        { titulo: 'Ganhar, perder ou reabrir', itens: ['"Marcar como ganha" conclui a atividade; depois registre a resposta do cliente na proposta e passe o pedido aos setores.', '"Registrar perda" pede o motivo da lista e o aprendizado; as propostas não respondidas são canceladas.', 'Encerrada por engano? Toque em "Pedir reabertura": o pedido vai para a Caixa de decisões da gestão comercial.'] }
      ],
      cores: [
        { nome: 'Selo vermelho "Sem próxima ação" ou "Retorno atrasado"', significado: 'Regra de ouro quebrada: marque a próxima ação hoje.' },
        { nome: 'Selo vermelho "Parada há N dias"', significado: 'Sem contato real há 10 dias ou mais (padrão). Para mudar de etapa, registre um contato ou a perda.' },
        { nome: 'Selo laranja "Esfriando" ou "Mudar a estratégia"', significado: '7 dias sem contato, ou 3 tentativas sem resposta: troque o canal, o contato ou a abordagem.' }
      ],
      problemas: [
        { situacao: '"O cliente tem unidades no cadastro: escolha a unidade".', oQueFazer: 'No SGO+ documentos, equipamentos e pastas são por unidade. Escolha a unidade da oportunidade.' },
        { situacao: '"A próxima ação não pode ficar no passado".', oQueFazer: 'O que já foi feito se registra em "Registrar contato"; a próxima ação é o passo seguinte, de hoje em diante.' },
        { situacao: 'Não consigo mudar a etapa.', oQueFazer: 'A oportunidade está parada. Registre um contato real com o cliente (ou a perda) e tente de novo.' }
      ],
      quemPode: quem,
      perguntas: [
        { p: 'Outro vendedor vê as minhas oportunidades?', r: 'Não. O vendedor vê só as próprias; a gestão comercial vê todas.' },
        { p: 'E-mail do cliente aparece aqui?', r: 'Sim: os e-mails registrados no cliente (E-mail > Registrar no cliente) e, para o responsável, os recebidos na própria caixa dele de um contato desse cliente.' }
      ],
      secoesManual: [{ titulo: 'Regras da oportunidade', paragrafos: [
        'Toda oportunidade aberta tem dono, etapa, valor, origem e próxima ação com data. Sem próxima ação ela aparece no topo da lista do dia e no Início do vendedor, e entra na Caixa de decisões do gestor comercial.',
        'O motivo de perda deve ser real: não use "sem retorno" quando o problema foi falta de cadência.'
      ] }]
    },
    'comercial_propostas': {
      titulo: 'Propostas',
      paraQueServe: 'Monta a proposta da oportunidade (itens do catálogo ou digitados, escopo, condições, validade), confere a política de desconto, gera a folha A4 numerada (PROP-ano-número, revisão 00, 01...) na pasta do cliente, envia pelo "Enviar documento", registra a resposta do cliente e passa o pedido aprovado aos setores.',
      antesDeComecar: ['A proposta nasce da oportunidade: abra a oportunidade e toque em "Nova proposta".', 'O desconto máximo sem aprovação é de 15% (configurável pela gestão), contado sobre o preço de tabela do catálogo.'],
      passos: [
        { titulo: 'Montar e concluir', itens: ['Escreva o escopo e acrescente os itens (do catálogo ou digitados), com quantidade e preço.', 'Confira as condições (pagamento, prazo, garantia) e a validade.', 'Toque em "Revisão da gestora" para ver o que impede o envio e os alertas.', 'Toque em "Concluir". Dentro da política, a proposta fica pronta; acima do limite, informe o motivo e ela vai para a aprovação do gestor comercial (Caixa de decisões).'] },
        { titulo: 'Gerar e enviar', itens: ['Toque em "Gerar documento": a folha A4 (PDF e HTML) é salva na pasta do cliente.', 'Toque em "Enviar ao cliente" e envie pela janela "Enviar documento" (e-mail pela sua caixa).', 'Toque em "Já enviei: atualizar". A proposta passa a "Enviada" e o retorno ao cliente vira atividade para o 2º dia útil.'] },
        { titulo: 'Resposta do cliente', itens: ['Toque em "Registrar resposta do cliente".', 'Aprovou: anexe o aceite (e-mail salvo em PDF, pedido de compra ou proposta assinada). A oportunidade pode ser marcada como ganha na mesma hora.', 'Recusou: escolha o motivo e escreva o que o cliente disse. A decisão (nova revisão ou perda) vira atividade.'] },
        { titulo: 'Passar aos setores', itens: ['No pedido aprovado, toque em "Passar aos setores".', 'Confira quem recebe em cada setor (Área técnica, Compras, Financeiro).', 'Cada setor recebe a atividade com prazo e a lista de conferência, sem valores. A da Área técnica aparece também no Cronograma de execução.'] }
      ],
      cores: [
        { nome: 'Selo laranja "Aguardando aprovação do desconto"', significado: 'Está na Caixa de decisões do gestor comercial. Não pode ser enviada até a decisão.' },
        { nome: 'Selo azul "Pronta para enviar" ou "Enviada ao cliente"', significado: 'Pronta: gere o documento e envie. Enviada: aguarde a resposta e faça o retorno combinado.' },
        { nome: 'Selo verde "Aprovada pelo cliente"', significado: 'Pedido: passe aos setores no mesmo dia.' },
        { nome: 'Selo vermelho "Recusada" ou "Vencida sem resposta"', significado: 'Faça nova revisão ou registre a perda.' }
      ],
      problemas: [
        { situacao: 'Não consigo editar a proposta.', oQueFazer: 'Só o rascunho é editado. Antes do envio use "Voltar para rascunho"; depois do envio, "Nova revisão" (mesmo número, revisão seguinte).' },
        { situacao: '"A revisão encontrou..." ao concluir.', oQueFazer: 'A gestora encontrou algo que impede o envio (sem escopo, sem preço, sem forma de pagamento, validade vencida). Corrija no rascunho e conclua de novo.' },
        { situacao: 'A proposta não mudou para "Enviada" depois do envio.', oQueFazer: 'Toque em "Já enviei: atualizar". Se enviou por outro meio, use "Entregue por outro meio" e conte como foi.' }
      ],
      quemPode: quem,
      perguntas: [
        { p: 'O custo e a margem vão para o cliente?', r: 'Nunca. A folha A4 leva só preço e condições; custo e margem aparecem só na tela da gestão.' },
        { p: 'Posso aprovar o meu próprio desconto?', r: 'Não. Quem pediu não decide: o gestor comercial (ou a Diretoria) decide na tela da proposta.' }
      ],
      secoesManual: [{ titulo: 'Política de desconto', paragrafos: ['Desconto do vendedor até o limite (padrão 15%) sobre o preço de tabela; preço digitado abaixo da tabela conta como desconto. Com margem mínima configurada e item com custo, a margem também é conferida. Acima do limite, a proposta só sai com a decisão do gestor comercial, registrada com a fundamentação.'] }]
    },
    'comercial_pedidos': {
      titulo: 'Pedidos aprovados',
      paraQueServe: 'Lista as propostas aprovadas pelo cliente, com o valor, a condição de pagamento, os dados de faturamento e o andamento de cada setor. É a tela do Financeiro no Comercial.',
      antesDeComecar: ['O Financeiro recebe a atividade de faturamento em Minhas atividades; o valor e os dados ficam aqui.'],
      passos: [{ titulo: 'Faturar um pedido', itens: ['Abra Comercial > Pedidos aprovados.', 'Confira razão social, CNPJ, endereço e a condição de pagamento.', 'Fature e conclua a sua atividade em Minhas atividades contando o que foi feito (número da nota fiscal).'] }],
      cores: [{ nome: 'Selo vermelho "Sem passagem aos setores"', significado: 'O vendedor ainda não passou o pedido. Depois de 1 dia útil ele entra na Caixa de decisões.' }, { nome: 'Selo verde "Setores concluíram"', significado: 'Todos os setores concluíram a parte deles.' }],
      problemas: [{ situacao: 'CNPJ "não informado".', oQueFazer: 'O cadastro do cliente está sem CNPJ completo. Peça a correção em Cadastros > Clientes antes de faturar.' }],
      quemPode: quem,
      perguntas: [{ p: 'O Financeiro vê as propostas em negociação?', r: 'Não, só as aprovadas pelo cliente.' }],
      secoesManual: []
    },
    'comercial_catalogo': {
      titulo: 'Produtos e serviços',
      paraQueServe: 'Catálogo usado nas propostas: código, nome, tipo (serviço, produto, contrato), unidade, preço de venda e, opcionalmente, o custo (só a gestão vê). Padroniza preços e descrições.',
      antesDeComecar: ['O catálogo começa vazio. Enquanto a lista de preços oficial não chega, as propostas aceitam itens digitados.'],
      passos: [{ titulo: 'Cadastrar um item (gestão comercial)', itens: ['Toque em "Novo item".', 'Preencha código, tipo, nome, descrição, unidade e preço. O custo é opcional.', 'Toque em "Salvar". Para tirar da escolha, use "Arquivar" (o item nunca é apagado).'] }],
      cores: [{ nome: 'Linha apagada "(arquivado)"', significado: 'Não aparece mais para as propostas novas.' }],
      problemas: [{ situacao: '"O código já é do item..."', oQueFazer: 'Cada código é único. Use outro código ou edite o item existente.' }],
      quemPode: quem,
      perguntas: [{ p: 'Mudar o preço muda as propostas antigas?', r: 'Não. Cada proposta guarda o preço do momento em que o item entrou.' }],
      secoesManual: []
    },
    'comercial_painel': {
      titulo: 'Painel comercial',
      paraQueServe: 'Indicadores do mês: valor ganho, perdas por motivo, conversão, funil em aberto por etapa (com o valor ponderado pela probabilidade), propostas enviadas, aprovadas e recusadas, próximas ações em dia e pedidos sem passagem. A gestão vê a equipe e gera o relatório mensal em A4.',
      antesDeComecar: ['O vendedor vê os próprios números; a gestão escolhe o vendedor ou a equipe toda.'],
      passos: [{ titulo: 'Relatório mensal (gestão)', itens: ['Escolha o mês e toque em "Relatório mensal A4".', 'O relatório abre em outra aba, com a análise da gestora (conferida contra os números), e fica salvo na pasta "Comercial - Relatórios".', 'No 1º dia útil de cada mês ele é gerado sozinho e vai à Diretoria com os relatórios da gestão.'] }],
      cores: [{ nome: 'Cartão "Abertas com próxima ação em dia"', significado: 'Verde a partir de 90%, amarelo de 70% a 89%, vermelho abaixo de 70%. A meta é 100%.' }],
      problemas: [{ situacao: 'Os números não batem com a minha conta.', oQueFazer: 'Ganho e perda contam pela data do ganho ou da perda; propostas, pela data do envio e da resposta.' }],
      quemPode: quem,
      perguntas: [],
      secoesManual: []
    },
    'comercial_metodologia': {
      titulo: 'Metodologia comercial',
      paraQueServe: 'É a cartilha que a gestora comercial segue: tese e regras de ouro, funis e etapas (probabilidade, prazo máximo, critério de saída e lista), origens, motivos de perda, qualificação, cadência de retorno, estratégias, objeções, modelos de mensagem, política de desconto, modelo da proposta, pós-venda e quem é a gestão comercial. Também mostra quais sugestões da gestora a equipe usou.',
      antesDeComecar: ['O padrão veio do Playbook e das regras do Comercial do COMMAND. Ajuste aos poucos, sempre com o motivo.', 'Só a gestão comercial, a Diretoria e o Administrador salvam. Os vendedores leem.'],
      passos: [{ titulo: 'Mudar uma regra', itens: ['Altere o campo (listas: uma linha por item; campos separados por |).', 'Escreva o que mudou e por quê.', 'Toque em "Salvar nova versão". A versão anterior fica no histórico e a gestora passa a usar a nova.'] }],
      cores: [],
      problemas: [{ situacao: '"A probabilidade das etapas precisa crescer".', oQueFazer: 'As etapas vão de 0% a 100% em ordem. Confira a coluna da probabilidade.' }],
      quemPode: quem,
      perguntas: [{ p: 'Mudar o desconto máximo muda as propostas já aprovadas?', r: 'Não. Vale para as propostas concluídas a partir da mudança.' }],
      secoesManual: []
    }
  };
}
