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
    { perfil: 'FINANCEIRO', pode: 'A tela Pedidos aprovados, com o valor e os dados de faturamento, e o catálogo de Produtos e serviços (cadastrar, editar e arquivar itens, com preço e custo).' },
    { perfil: 'TECNICO,METROLOGIA,RH', pode: 'Não veem o Comercial nem valores. Recebem a parte deles do pedido aprovado como atividade em Minhas atividades, sem valor.' }
  ];
  return {
    'comercial': {
      titulo: 'Hoje no Comercial',
      paraQueServe: 'Mostra o que fazer hoje, em ordem de prioridade, segundo a metodologia comercial da empresa: oportunidades sem próxima ação, retornos atrasados ou de hoje, oportunidades paradas ou esfriando, propostas sem resposta ou perto de vencer, pedidos aprovados sem passagem aos setores. Quem monta a lista é a gestora comercial do sistema, que conhece as regras escritas pela gestão. Para a gestão, mostra o panorama da equipe e as decisões pendentes.',
      antesDeComecar: [
        'A gestora comercial só sugere: ela não envia nada ao cliente, não aprova desconto e não muda etapa. Quem decide e envia é você.',
        'No celular, a barra de seções no topo de cada tela do Comercial (Hoje, Oportunidades, Propostas, Pedidos, Produtos, Quadro, Gantt, Painel e Metodologia) leva a todas as telas; arraste a barra para o lado para ver as outras. Cada pessoa vê só as seções que pode usar.',
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
        { p: 'A gestora pode mandar a mensagem por mim?', r: 'Não. Ela escreve a sugestão; você copia, revisa e envia.' },
        { p: 'O que são as oportunidades CRM-0001, CRM-0002... e a atividade "Revisar oportunidade do CRM"?', r: 'São os negócios trazidos do CRM antigo em 26/10/2026. Os que estavam abertos e tiveram movimento nos últimos 60 dias continuam abertos: fale com o cliente, registre o contato na oportunidade e marque o próximo passo (a atividade é concluída). Os parados há mais tempo entraram como perdidos; se algum ainda vale, peça a reabertura. Os orçamentos do CRM estão nas propostas com o número ORC-...' }
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
        { titulo: 'Buscar uma oportunidade', itens: ['Escreva no campo "Buscar" parte do cliente, da unidade, do título, do código ou do contato. A busca ignora acentos e maiúsculas e aceita as palavras em qualquer ordem.', 'Ela respeita o filtro "Situação" (o padrão é "Abertas"). Se achar oportunidades ganhas ou perdidas, a tela avisa quantas são; toque em "Ver em todas as situações".'] },
        { titulo: 'Criar uma oportunidade', itens: ['Toque em "Nova oportunidade".', 'Busque o cliente pelo nome, pela razão social, pelo CNPJ ou pelo nome da unidade (sem precisar de acento) e escolha a unidade e o contato.', 'Escreva o título (o que o cliente precisa), escolha funil, etapa, origem e informe o valor estimado.', 'Preencha a próxima ação (o que fazer e quando) e toque em "Criar oportunidade". A atividade aparece em Minhas atividades.'] },
        { titulo: 'Registrar um contato com o cliente', itens: ['Abra a oportunidade e toque em "Registrar contato".', 'Diga como foi, se o cliente respondeu e o que aconteceu.', 'Marque a próxima ação. A atividade anterior é concluída e a nova é criada.'] },
        { titulo: 'Mudar de etapa', itens: ['Toque em "Mudar etapa", escolha a etapa e toque em "Continuar".', 'Marque os itens da lista da etapa que foram feitos de verdade. Para voltar de etapa, escreva o motivo.', 'Se faltar algo exigido pela metodologia, a janela diz o quê e onde resolver; a oportunidade fica onde estava. O mesmo vale no Quadro do funil.'] },
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
        { situacao: 'Não consigo mudar a etapa.', oQueFazer: 'A janela de mudança de etapa diz o que falta: oportunidade parada (registre um contato real ou a perda), itens da lista da etapa não confirmados, decisor não mapeado, nenhum contato registrado, proposta ainda não enviada ou aceite não registrado. Resolva e mude de novo.' }
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
      paraQueServe: 'Monta a proposta da oportunidade (itens escolhidos do catálogo ou avulsos, descrição opcional, condições, validade), confere a política de desconto, gera a folha A4 numerada (PROP-ano-número, revisão 00, 01...) na pasta do cliente, envia pelo "Enviar documento", registra a resposta do cliente e passa o pedido aprovado aos setores.',
      antesDeComecar: ['A proposta nasce da oportunidade: abra a oportunidade e toque em "Nova proposta".', 'O desconto máximo sem aprovação é de 15% (configurável pela gestão), contado sobre o preço de tabela do catálogo.'],
      passos: [
        { titulo: 'Montar e concluir', itens: ['Toque em "Acrescentar item" e comece a digitar o nome ou o código no campo "Produto ou serviço": aparecem os itens ativos do catálogo (Produtos e serviços). Escolha um (toque, ou setas e Enter): código, tipo, descrição, unidade e preço de tabela entram sozinhos. O botão "Do catálogo" abre a mesma busca numa janela.', 'Item que não está no catálogo fica "Avulso (fora do catálogo)": escreva a descrição e o preço. Para desligar um item do catálogo, toque em "Tornar avulso".', 'O preço pode ser ajustado. Diferente da tabela, o item mostra "Abaixo da tabela" (conta como desconto na política) ou "Acima da tabela", e o preço de tabela e o praticado ficam no histórico da proposta.', 'A descrição (escopo) é opcional: escreva só o que for específico desta proposta. Os termos e condições da contratação já vão fixos no documento.', 'Confira as condições (pagamento, prazo, garantia) e a validade.', 'Toque em "Revisão da gestora" para ver o que impede o envio e os alertas.', 'Toque em "Concluir". Dentro da política, a proposta fica pronta; acima do limite, informe o motivo e ela vai para a aprovação do gestor comercial (Caixa de decisões).'] },
        { titulo: 'Gerar e enviar', itens: ['Toque em "Gerar documento": a folha A4 (PDF e HTML) é salva na pasta do cliente, com a seção "Termos e condições da contratação" na versão em vigor (a proposta guarda essa versão).', 'Toque em "Enviar ao cliente" e envie pela janela "Enviar documento": e-mail (com o PDF anexado) e/ou WhatsApp oficial da Metrolabs (o PDF vai na mensagem, com o texto do modelo aprovado pela Meta).', 'Toque em "Já enviei: atualizar". A proposta passa a "Enviada" e o retorno ao cliente vira atividade para o 2º dia útil.'] },
        { titulo: 'Resposta do cliente', itens: ['Toque em "Registrar resposta do cliente".', 'Aprovou: anexe o aceite (e-mail salvo em PDF, pedido de compra ou proposta assinada). A oportunidade pode ser marcada como ganha na mesma hora. O histórico registra quem lançou e a versão dos termos e condições que foi no documento.', 'Recusou: escolha o motivo e escreva o que o cliente disse. A decisão (nova revisão ou perda) vira atividade.'] },
        { titulo: 'Passar aos setores', itens: ['No pedido aprovado, toque em "Passar aos setores".', 'Confira quem recebe em cada setor (Área técnica, Compras, Financeiro). Em Compras, o sugerido é o comprador das Regras de compras, que recebe também a requisição com os produtos.', 'Cada setor recebe a atividade com prazo e a lista de conferência, sem valores. A da Área técnica aparece também no Cronograma de execução.'] }
      ],
      cores: [
        { nome: 'Selo laranja "Aguardando aprovação do desconto"', significado: 'Está na Caixa de decisões do gestor comercial. Não pode ser enviada até a decisão.' },
        { nome: 'Selo azul "Pronta para enviar" ou "Enviada ao cliente"', significado: 'Pronta: gere o documento e envie. Enviada: aguarde a resposta e faça o retorno combinado.' },
        { nome: 'Selo verde "Aprovada pelo cliente"', significado: 'Pedido: passe aos setores no mesmo dia.' },
        { nome: 'Selo vermelho "Recusada" ou "Vencida sem resposta"', significado: 'Faça nova revisão ou registre a perda.' }
      ],
      problemas: [
        { situacao: 'Não consigo editar a proposta.', oQueFazer: 'Só o rascunho é editado. Antes do envio use "Voltar para rascunho"; depois do envio, "Nova revisão" (mesmo número, revisão seguinte).' },
        { situacao: '"A revisão encontrou..." ao concluir.', oQueFazer: 'A gestora encontrou algo que impede o envio (item sem preço, sem forma de pagamento ou prazo, validade vencida). Corrija no rascunho e conclua de novo. Descrição em branco, item avulso e preço acima da tabela são só alertas.' },
        { situacao: 'A descrição de uma proposta antiga mostra a faixa "As cláusulas que estavam na descrição... saíram daqui".', oQueFazer: 'Nas propostas trazidas do CRM as cláusulas estavam coladas na descrição. Agora elas vão fixas nos termos e condições: a tela mostra só o restante (por exemplo "Condições", "Frete" e "Entrega"). Nada foi apagado; ao salvar o rascunho, a descrição fica como aparece na tela.' },
        { situacao: 'Digitei no item e não apareceu nenhum produto.', oQueFazer: 'Escreva pelo menos 2 letras do nome ou o código. A busca ignora acentos e mostra só itens ativos. Se o item não existe, ele fica avulso (confira o preço) e a gestão pode cadastrar em Produtos e serviços.' },
        { situacao: 'A proposta não mudou para "Enviada" depois do envio.', oQueFazer: 'Toque em "Já enviei: atualizar". Se enviou por outro meio, use "Entregue por outro meio" e conte como foi.' },
        { situacao: 'A busca não acha a proposta.', oQueFazer: 'A busca procura no número, cliente, unidade, contato, responsável, título e nos itens, sem acento e por partes. Ela respeita o filtro "Situação" (o padrão é "Em andamento"): se achar propostas em outras situações, a tela avisa quantas são; toque em "Ver em todas as situações". O vendedor vê só as próprias.' }
      ],
      quemPode: quem,
      perguntas: [
        { p: 'O custo e a margem vão para o cliente?', r: 'Nunca. A folha A4 leva só preço e condições; custo e margem aparecem só na tela da gestão.' },
        { p: 'Posso aprovar o meu próprio desconto?', r: 'Não. Quem pediu não decide: o gestor comercial (ou a Diretoria) decide na tela da proposta.' },
        { p: 'Se a Diretoria mudar os termos e condições, a proposta já enviada muda?', r: 'Não. Cada proposta guarda a versão dos termos que estava em vigor quando o documento foi gerado. A mudança vale para os documentos gerados depois (e para as novas revisões).' }
      ],
      secoesManual: [{ titulo: 'Termos e condições da contratação', paragrafos: ['As cláusulas do contrato (objeto, prazo de entrega, forma de recebimento, sanções, assinatura eletrônica, desistência, título executivo e foro) vão fixas em toda proposta, na seção "Termos e condições da contratação", logo acima de "Validade e aceite", em texto justificado, seguidas da frase de concordância: a aprovação da proposta implica a concordância integral com os termos.', 'O texto é editado só pela Diretoria e pelo Administrador, em Metodologia comercial. Cada mudança do texto é uma versão nova; o documento gerado guarda a versão em vigor, e a proposta enviada não muda depois.', 'Condições de pagamento, frete e prazo de entrega de cada proposta continuam nos campos de Condições comerciais.'] }, { titulo: 'Política de desconto', paragrafos: ['Desconto do vendedor até o limite (padrão 15%) sobre o preço de tabela; preço digitado abaixo da tabela conta como desconto. Com margem mínima configurada e item com custo, a margem também é conferida. Acima do limite, a proposta só sai com a decisão do gestor comercial, registrada com a fundamentação.'] }]
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
      paraQueServe: 'Cadastro único de produtos e serviços usado nas propostas (é o mesmo onde entraram os itens do CRM antigo): código, nome, tipo (serviço, produto, contrato), categoria, unidade, preço de venda, custo opcional (só a gestão vê) e situação (ativo ou arquivado). O item escolhido na proposta traz o preço de tabela daqui.',
      antesDeComecar: ['Os itens do CRM antigo já estão no catálogo, com o código do CRM. Item que ainda não está no catálogo pode ser digitado na proposta ("Acrescentar item").'],
      passos: [
        { titulo: 'Buscar um produto ou serviço', itens: ['Escreva no campo "Buscar no catálogo" parte do código, do nome, da descrição ou da categoria (por exemplo "fonte 9v" ou "CRM-DF8F").', 'A busca é feita no banco do SGO+, ignora acentos e maiúsculas e aceita as palavras em qualquer ordem.', 'Se quiser, filtre por tipo, categoria e (gestão) situação. A linha acima da lista diz quantos itens foram encontrados.', 'A tela mostra até 200 itens, os mais parecidos primeiro. Se houver mais, escreva mais uma palavra ou o código para afinar. "Limpar" volta à lista completa.'] },
        { titulo: 'Cadastrar um item (gestão comercial)', itens: ['Toque em "Novo item".', 'Preencha código, tipo, nome, descrição, unidade e preço. O custo é opcional.', 'Toque em "Salvar". Para tirar da escolha, use "Arquivar" (o item nunca é apagado).', 'O catálogo não aceita dois itens ativos com o mesmo nome: se já existe, edite aquele item ou diferencie o nome (modelo, tamanho, capacidade).'] },
        { titulo: 'Conferir os duplicados (gestão comercial)', itens: ['Em "Situação", escolha "Possíveis duplicados (mesmo nome)". Aparecem os itens ativos que têm o mesmo nome de outro (vieram assim do CRM antigo).', 'Compare código, preço e descrição. Deixe ativo o item certo e toque em "Arquivar" no que sobra.', 'As propostas antigas continuam como estão; o item arquivado só sai da escolha das propostas novas.'] }
      ],
      cores: [{ nome: 'Linha apagada "(arquivado)"', significado: 'Não aparece mais para as propostas novas.' }, { nome: 'Selo laranja "mesmo nome de outro item"', significado: 'Outro item ativo tem o mesmo nome. Confira em "Possíveis duplicados" e arquive o que sobra.' }],
      problemas: [
        { situacao: 'No celular não acho Produtos e serviços.', oQueFazer: 'Entre no Comercial pela tela inicial e toque em "Produtos" na barra de seções do topo (arraste a barra para o lado se não aparecer). Se a barra não tiver "Produtos", o seu perfil não usa o catálogo: peça ao Administrador.' },
        { situacao: '"O código já é do item..."', oQueFazer: 'Cada código é único. Use outro código ou edite o item existente.' },
        { situacao: '"Já existe o item ativo..." ao salvar.', oQueFazer: 'Outro item ativo tem o mesmo nome. Edite aquele item (preço, descrição, unidade) ou, se for outro produto, diferencie o nome.' },
        { situacao: '"Nenhum item com..." na busca.', oQueFazer: 'Confira a grafia, use outra palavra do nome ou o código, e confira o tipo, a categoria e a situação (o item pode estar arquivado). Toque em "Limpar" para ver tudo. Se o item não existe, a gestão cadastra em "Novo item".' },
        { situacao: '"Mostrando os 200 mais parecidos".', oQueFazer: 'A busca achou mais de 200 itens. Escreva mais uma palavra do nome ou o código para afinar.' }
      ],
      quemPode: quem,
      perguntas: [
        { p: 'Mudar o preço muda as propostas antigas?', r: 'Não. Cada proposta guarda o preço do momento em que o item entrou.' },
        { p: 'Preciso escrever o nome inteiro, com acento?', r: 'Não. "ventilometro digital" acha "Ventilômetro Digital Eletrônico"; parte do código também serve.' },
        { p: 'Na proposta dá para buscar no catálogo?', r: 'Sim. No próprio item: comece a digitar no campo "Produto ou serviço" e escolha da lista (itens ativos). "Do catálogo" abre a mesma busca numa janela, 50 por vez.' }
      ],
      secoesManual: [{ titulo: 'Como a busca funciona no Comercial', paragrafos: ['Em Oportunidades, Propostas, Quadro do funil, Gantt, Produtos e serviços e na escolha do cliente a busca ignora acentos, cedilha e maiúsculas, aceita parte das palavras em qualquer ordem e números sem pontuação (CNPJ só com os dígitos, PROP-2026-0001).', 'Propostas são procuradas também nos itens (descrição e código do produto); oportunidades, também no contato, no responsável e nas observações; clientes, também nos nomes das unidades.'] }]
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
    'comercial_kanban': {
      titulo: 'Quadro do funil',
      paraQueServe: 'Mostra as oportunidades em colunas, uma por etapa do funil escolhido (Engenharia ou Produtos), mais as ganhas e as perdidas do período. Cada cartão traz o cliente, o valor (para quem vê valores), a próxima ação e a data, há quantos dias está sem contato e na etapa, e os selos (proposta, desconto aguardando aprovação, parada, atrasada). No topo fica a "Leitura do funil": onde o funil está travando, quais oportunidades estão em risco e o tempo médio de cada etapa comparado à meta da metodologia.',
      antesDeComecar: [
        'Mudar de etapa no quadro segue as mesmas regras da ficha da oportunidade: o sistema confere os critérios de saída da metodologia antes de mover. Se faltar algo, ele diz o quê e onde resolver, e a oportunidade fica onde estava.',
        'A especialista (a gestora comercial do sistema) só sugere. Nada é enviado ao cliente e nenhuma oportunidade muda de etapa por ela.',
        'A tela não se atualiza sozinha: depois de cada ação ela recarrega; para ver o que outra pessoa mudou, toque em "Atualizar".'
      ],
      passos: [
        { titulo: 'Escolher o que ver', itens: ['Escolha o funil.', 'A gestão escolhe o vendedor (ou "Toda a equipe"); o vendedor vê só as próprias.', 'Filtre por cliente (nome, título ou código), por área (tipo do equipamento ou categoria do serviço) e pelo período ("De" e "Até").', 'No computador, role o quadro para os lados; no celular, deslize dentro do quadro.'] },
        { titulo: 'Mudar uma oportunidade de etapa', itens: ['Arraste o cartão para a coluna da nova etapa, ou toque em "Mover para" e escolha a etapa.', 'Na janela, marque os itens da lista da etapa que foram feitos de verdade.', 'Se aparecer "Ainda não dá para mover", leia o que falta e o que fazer (por exemplo, registrar um contato ou mapear o decisor) e toque em "Abrir a oportunidade" para resolver. Depois mova de novo.', 'Para voltar de etapa, escreva o motivo. Tudo fica no histórico da oportunidade.'] },
        { titulo: 'Ganhar ou perder pelo quadro', itens: ['Arraste para "Ganhas no período" (ou "Mover para" > Ganha): escolha a proposta enviada, anexe o arquivo do aceite do cliente e registre. A oportunidade vai para Ganhas; depois passe o pedido aos setores na proposta.', 'Sem proposta enviada não há como registrar o aceite: a janela explica o caminho (Nova proposta, gerar o documento, enviar ao cliente).', 'Arraste para "Perdidas no período": escolha o motivo real e escreva o aprendizado (mínimo 15 letras).'] },
        { titulo: 'Pedir à especialista', itens: ['No cartão, toque em "Pedir à especialista".', 'Ela mostra o próximo passo, a estratégia para cumprir o critério da etapa (com o que falta para avançar), as objeções prováveis com a resposta, perguntas para o cliente e os textos de WhatsApp e e-mail.', 'Copie, revise e envie você mesmo. Toque em "Usei" ou "Não serviu" (com o motivo): a gestão vê o que funciona.'] },
        { titulo: 'Leitura do funil', itens: ['A leitura pelas regras aparece sempre, com os números do sistema.', 'Toque em "Pedir a leitura da especialista" para o texto escrito pela IA. Todo número citado é conferido: se aparecer número que não está nos dados, o texto é recusado e vale o das regras.', 'Abra "Tempo médio por etapa" para ver a média de dias para sair de cada etapa, a meta, quantas estão na etapa agora e quantas passaram do prazo.'] }
      ],
      cores: [
        { nome: 'Borda vermelha no cartão', significado: 'Sem próxima ação, retorno atrasado ou parada: resolva antes de tudo.' },
        { nome: 'Borda laranja no cartão', significado: 'Esfriando, tempo acima da meta na etapa, previsão vencida ou desconto aguardando aprovação.' },
        { nome: 'Borda verde ou cinza', significado: 'Ganha ou perdida no período.' },
        { nome: 'Selo "Proposta: ..."', significado: 'Situação da proposta mais recente da oportunidade (rascunho, pronta, enviada, aprovada...).' }
      ],
      problemas: [
        { situacao: 'Arrastei e apareceu "Ainda não dá para mover".', oQueFazer: 'É a metodologia: falta algo para sair da etapa (lista, decisor, contato registrado, proposta enviada ou aceite). Leia o que fazer na janela, resolva na oportunidade e mova de novo.' },
        { situacao: 'No celular o cartão não arrasta.', oQueFazer: 'Use o botão "Mover para" do cartão. Ele faz o mesmo que arrastar.' },
        { situacao: 'Uma oportunidade sumiu do quadro.', oQueFazer: 'Confira o período ("De" e "Até"), a área e o cliente nos filtros. A oportunidade aparece quando o tempo entre a criação e a previsão de fechamento (ou hoje) cruza o período.' },
        { situacao: 'A leitura diz que o verificador recusou o texto.', oQueFazer: 'É uma proteção: a IA citou número que não está no sistema. Vale o texto das regras, que usa só os números do sistema.' }
      ],
      quemPode: quem,
      perguntas: [
        { p: 'A especialista pode mover o cartão ou mandar a mensagem?', r: 'Não. Ela só sugere. Quem move, envia e registra é o vendedor (ou a gestão comercial).' },
        { p: 'Posso pular uma etapa?', r: 'Pode, desde que confirme a lista das etapas puladas e cumpra o que a metodologia exige (por exemplo, proposta enviada para passar da etapa de proposta).' },
        { p: 'Quem decide o que é exigido para avançar?', r: 'A gestão comercial, em Comercial > Metodologia comercial (listas de cada etapa e "Critérios para avançar de etapa").' }
      ],
      secoesManual: []
    },
    'comercial_gantt': {
      titulo: 'Gantt comercial',
      paraQueServe: 'Mostra cada oportunidade no tempo: uma barra da criação até a previsão de fechamento (ou até hoje, quando não há previsão), com os marcos da venda: proposta enviada, validade da proposta, retornos combinados com o cliente (as atividades do Comercial em Minhas atividades), pedido aprovado e passagem aos setores. O dia de hoje fica marcado e os atrasos aparecem em vermelho.',
      antesDeComecar: ['Os filtros são os mesmos do Quadro do funil (funil, vendedor, cliente, área e período).', 'É só para consulta: para mudar algo, abra a oportunidade.'],
      passos: [
        { titulo: 'Ler o Gantt', itens: ['Escolha o período em "De" e "Até" e, se quiser, "Agrupadas por vendedor".', 'Cada linha é uma oportunidade (código e cliente à esquerda). Passe o mouse sobre a barra ou um marco para ver os detalhes.', 'No celular, deslize o gráfico para os lados; a lista abaixo do gráfico abre cada oportunidade.'] },
        { titulo: 'Abrir uma oportunidade ou pedir à especialista', itens: ['Toque na linha.', 'Na janela aparecem a etapa, as datas e todos os marcos.', 'Toque em "Abrir a oportunidade" para trabalhar nela, ou em "Pedir à especialista" para o próximo passo, a estratégia, as objeções e os textos.'] }
      ],
      cores: [
        { nome: 'Barra azul', significado: 'Oportunidade aberta. Tracejada e clara: sem previsão de fechamento (vai até hoje).' },
        { nome: 'Barra verde ou cinza', significado: 'Ganha ou perdida.' },
        { nome: 'Trecho vermelho depois da barra', significado: 'A previsão de fechamento passou e a oportunidade continua aberta.' },
        { nome: 'Marcos', significado: 'Círculo: proposta enviada. Losango: validade da proposta. Triângulo: retorno combinado (verde quando feito). Quadrado verde: pedido aprovado. Quadrado roxo: passagem aos setores. Marco em vermelho está atrasado.' }
      ],
      problemas: [
        { situacao: 'A oportunidade não aparece.', oQueFazer: 'Ajuste o período: a barra (criação até a previsão) precisa cruzar as datas escolhidas.' },
        { situacao: 'Apareceu "Mostrando as primeiras oportunidades".', oQueFazer: 'Há muitas linhas. Use os filtros de vendedor, cliente, área ou um período menor.' }
      ],
      quemPode: quem,
      perguntas: [{ p: 'Por que a barra está em vermelho?', r: 'A previsão de fechamento passou e a oportunidade ainda está aberta. Atualize a previsão na oportunidade (Editar) ou registre o resultado.' }],
      secoesManual: []
    },
    'comercial_metodologia': {
      titulo: 'Metodologia comercial',
      paraQueServe: 'É a cartilha que a gestora comercial segue: tese e regras de ouro, funis e etapas (probabilidade, prazo máximo, critério de saída e lista), origens, motivos de perda, qualificação, cadência de retorno, estratégias, objeções, modelos de mensagem, política de desconto, modelo da proposta, pós-venda e quem é a gestão comercial. Também mostra quais sugestões da gestora a equipe usou.',
      antesDeComecar: ['O padrão veio do Playbook e das regras do Comercial do COMMAND. Ajuste aos poucos, sempre com o motivo.', 'Só a gestão comercial, a Diretoria e o Administrador salvam. Os vendedores leem.', 'Os termos e condições da contratação (cláusulas do contrato) só a Diretoria e o Administrador mudam.'],
      passos: [{ titulo: 'Critérios para avançar de etapa', itens: ['Marque o que o sistema exige para uma oportunidade avançar: confirmar a lista da etapa, decisor mapeado, contato registrado, proposta enviada para passar da etapa de proposta e aceite para a etapa de 100%.', 'A lista de cada etapa é a do campo "Funis e etapas" (itens separados por ;).', 'Vale para o Quadro do funil e para a ficha da oportunidade.'] }, { titulo: 'Mudar uma regra', itens: ['Altere o campo (listas: uma linha por item; campos separados por |).', 'Escreva o que mudou e por quê.', 'Toque em "Salvar nova versão". A versão anterior fica no histórico e a gestora passa a usar a nova.'] }, { titulo: 'Mudar os termos e condições da contratação (Diretoria e Administrador)', itens: ['Em "Termos e condições da contratação", edite as cláusulas (uma por linha) e, se precisar, a frase de concordância.', 'Escreva o que mudou e por quê e toque em "Salvar nova versão".', 'A versão dos termos sobe (o número aparece no quadro e no fim da seção do documento). Vale para os documentos gerados a partir daí; proposta já enviada continua com a versão que foi ao cliente.'] }],
      cores: [],
      problemas: [{ situacao: '"A probabilidade das etapas precisa crescer".', oQueFazer: 'As etapas vão de 0% a 100% em ordem. Confira a coluna da probabilidade.' }],
      quemPode: quem,
      perguntas: [{ p: 'Mudar o desconto máximo muda as propostas já aprovadas?', r: 'Não. Vale para as propostas concluídas a partir da mudança.' }, { p: 'O gestor comercial pode mudar as cláusulas do contrato?', r: 'Não. Os termos e condições da contratação são mudados só pela Diretoria e pelo Administrador; o gestor salva o resto da metodologia normalmente.' }],
      secoesManual: []
    }
  };
}
