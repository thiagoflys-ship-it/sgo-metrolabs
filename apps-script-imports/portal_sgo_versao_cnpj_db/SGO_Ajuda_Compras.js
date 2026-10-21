/**
 * SGO_Ajuda_Compras.js — ajuda "Como usar esta tela" do Compras e peças nativo (21/10/2026).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Telas: JS_Compras.html. Regras: SGO_Compras_*.js.
 * Manual completo: docs/MANUAL_MODULO_COMPRAS.md.
 */
function SGO_ajudaTelas_Compras_() {
  var quem = [
    { perfil: 'TODOS', pode: 'Todo colaborador interno pede peça ou material e acompanha os próprios pedidos em "Meus pedidos de compra", sem valores.' },
    { perfil: 'TECNICO,METROLOGIA', pode: 'Pede e acompanha. Não vê preço, orçamento nem pagamento. Quem estiver na lista de compradores (Regras de compras) trabalha a fila de compras, mesmo com este perfil.' },
    { perfil: 'GESTOR', pode: 'Vê a fila com valores e aprova as compras da faixa do gestor quando a área é dele. O gestor da área de Compras (Logística, no padrão) faz tudo o que o comprador faz e cobra as compras paradas.' },
    { perfil: 'FINANCEIRO', pode: 'Confere as compras (comprovante, forma de pagamento, final do cartão) e consulta os fornecedores.' },
    { perfil: 'DIRETORIA,ADMIN', pode: 'Tudo, inclusive as Regras de compras (compradores, faixas de aprovação, cotações mínimas). A Diretoria aprova as compras da faixa mais alta.' }
  ];
  return {
    'compras_pedir': {
      titulo: 'Pedir peça ou material',
      paraQueServe: 'Pedir a Compras uma peça, ferramenta, insumo ou serviço, dizendo o que é, para que é e a que está ligado. O comprador confere a especificação, pede orçamentos, a compra é aprovada por quem tem alçada e a peça chega até você. Um pedido pode ter vários itens.',
      antesDeComecar: [
        'Tenha em mãos a foto da peça (etiqueta, placa de identificação) ou o número da peça. Pedido vago leva à compra errada.',
        'Se a compra for para um cliente, saiba qual cliente e, se houver, o número da O.S. do Auvo.',
        'Você não vê preços: o acompanhamento é pela situação e pela previsão de entrega.'
      ],
      passos: [
        { titulo: 'Fazer um pedido', itens: ['Toque em "Pedir peça ou material" no menu Compras.', 'Escreva para que é e onde será usado.', 'Escolha a urgência. Use "Crítica" só para equipamento ou atendimento parado.', 'Escolha a que a compra está ligada: cliente, pedido aprovado do Comercial, veículo da Frota ou uso interno.', 'Preencha cada item: tipo, descrição, quantidade e unidade.', 'Para peça, informe o equipamento de origem e o número da peça com a marca, ou pelo menos dois dados técnicos; sem o número da peça, tire a foto.', 'Ao escolher o equipamento do cadastro, o campo ao lado é preenchido com tipo, modelo, TAG, nº de série e setor do cadastro (pode completar). O pedido de compra usa esse texto; se ele ficar vazio, usa o do cadastro.', 'Toque em "Enviar a Compras".'] },
        { titulo: 'Completar a especificação', itens: ['Abra "Meus pedidos de compra".', 'No pedido marcado "Especificação incompleta", leia o que falta.', 'Toque em "Completar a especificação".', 'Preencha o que falta e toque em "Salvar e enviar a Compras".'] }
      ],
      cores: [
        { nome: 'Linha laranja "Falta: ..." embaixo do item', significado: 'A especificação do item está incompleta. Você pode enviar, mas o pedido não é cotado até completar.' },
        { nome: 'Linha verde "Especificação completa"', significado: 'O item tem o que o comprador precisa para cotar.' }
      ],
      problemas: [
        { situacao: 'Aparece "diga a que a compra está ligada".', oQueFazer: 'Escolha uma das quatro opções do quadro 2. Toda compra precisa dizer para que é (regra da empresa).' },
        { situacao: 'O cliente não aparece na busca.', oQueFazer: 'Ele precisa estar em Cadastros > Clientes. Peça o cadastro e volte ao pedido.' },
        { situacao: 'O pedido do Comercial não aparece na lista.', oQueFazer: 'Só aparece proposta aprovada pelo cliente. Até a aprovação, use o vínculo "Cliente".' },
        { situacao: 'A foto não anexou.', oQueFazer: 'Use foto em JPG ou PNG. Fotos grandes são reduzidas sozinhas antes do envio.' }
      ],
      quemPode: quem,
      perguntas: [
        { p: 'Preciso de três orçamentos para pedir uma caneta?', r: 'Não. Quem pede só descreve. O comprador cota conforme a faixa de valor: no padrão, 1 orçamento até R$ 1.000, 2 até R$ 10.000 e 3 acima.' },
        { p: 'Vou receber mensagem no WhatsApp?', r: 'Não. Os avisos de Compras ficam no sistema (Início e esta tela) e, quando importam, entram no resumo de e-mail da manhã. Nenhum aviso leva valor.' }
      ]
    },
    'compras_meus': {
      titulo: 'Meus pedidos de compra',
      paraQueServe: 'Acompanhar os pedidos que você fez (e, se você é vendedor, os do seu pedido aprovado no Comercial): situação, previsão de entrega e o que falta completar. Sem valores.',
      passos: [
        { titulo: 'Acompanhar um pedido', itens: ['Abra "Meus pedidos de compra".', 'Leia a situação e a frase embaixo dela.', 'Toque em "Itens e andamento" para ver os itens e o histórico.'] },
        { titulo: 'Cancelar um pedido', itens: ['Enquanto o pedido está "Solicitada", toque em "Cancelar o pedido".', 'Escreva o motivo e confirme.', 'Depois que a cotação começa, peça o cancelamento ao comprador.'] },
        { titulo: 'Confirmar que recebeu', itens: ['Quando o pedido estiver "Disponível" e você já estiver com a peça, toque em "Recebi a peça".', 'O pedido é encerrado.'] },
        { titulo: 'Registrar uma compra feita fora do sistema', itens: ['Use só quando já comprou (por exemplo, no balcão durante um atendimento).', 'Toque em "Registrar compra feita fora do sistema".', 'Diga para que foi, a que está ligada, o que comprou, onde, o valor, a data e a forma de pagamento.', 'Anexe o comprovante e explique por que foi fora do sistema.', 'A compra vai para a conferência do Financeiro e para a ciência da gestão.'] }
      ],
      cores: [
        { nome: 'Selo azul', significado: 'Em andamento em Compras (solicitada, em cotação, aprovada, pedido feito).' },
        { nome: 'Selo laranja "Aguardando aprovação" ou "Especificação incompleta"', significado: 'Esperando a aprovação de quem tem alçada, ou esperando você completar a especificação.' },
        { nome: 'Selo vermelho "Recebida com divergência"', significado: 'Chegou com problema (quantidade, especificação ou dano). Compras está resolvendo com o fornecedor.' },
        { nome: 'Selo verde "Disponível"', significado: 'Chegou e foi conferida: retire com Compras.' },
        { nome: 'Selo cinza', significado: 'Entregue ou cancelado (encerrado).' }
      ],
      problemas: [
        { situacao: 'O pedido está parado em "Solicitada".', oQueFazer: 'Veja se está marcado "Especificação incompleta": complete o que falta. Se estiver completo, o comprador recebeu a atividade e tem o prazo da urgência para começar.' }
      ],
      quemPode: quem,
      perguntas: [
        { p: 'Por que não vejo o valor da compra?', r: 'Valores de compra ficam com os compradores, gestores, o Financeiro e a Diretoria. Quem pede acompanha pela situação e pela previsão de entrega.' }
      ]
    },
    'compras': {
      titulo: 'Fila de compras',
      paraQueServe: 'A fila do comprador: todos os pedidos, do mais urgente ao mais antigo, com a ficha de cada um (itens, especificação, vínculo, cotações, aprovação, pedido ao fornecedor, recebimento, pagamento e histórico).',
      antesDeComecar: ['O comprador e o substituto são escolhidos em Compras > Regras de compras.', 'Cada pedido novo com a especificação completa vira a atividade "Conferir e cotar" do comprador em Minhas atividades, com o prazo da urgência.'],
      passos: [
        { titulo: 'Conferir a especificação', itens: ['Toque no pedido para abrir a ficha.', 'Leia os itens, as fotos e os dados técnicos.', 'Se estiver tudo claro, toque em "Especificação conferida: iniciar cotação".', 'Se faltar algo, toque em "Devolver a especificação" e escreva o que falta. Quem pediu recebe o texto.'] },
        { titulo: 'Corrigir a especificação você mesmo', itens: ['Na ficha de um pedido "Solicitada", toque em "Editar a especificação".', 'Complete os itens e toque em "Salvar e enviar a Compras".'] },
        { titulo: 'Lançar os orçamentos', itens: ['Na ficha de um pedido "Em cotação", toque em "Lançar orçamento".', 'Escolha o fornecedor.', 'Digite o preço unitário de cada item, o frete e os impostos que não estão no preço. O total é calculado pelo sistema.', 'Informe o prazo de entrega, a validade, o número do orçamento e a condição de pagamento.', 'Para peça, diga se é original, equivalente ou a confirmar.', 'Anexe o arquivo do orçamento (obrigatório) e toque em "Salvar o orçamento".', 'Repita para cada fornecedor. Para trocar algo, toque em "Corrigir"; para tirar da comparação, "Retirar" com o motivo.'] },
        { titulo: 'Escolher o orçamento', itens: ['Toque em "Escolher este orçamento" no orçamento vencedor.', 'Se não for o mais barato, escreva o motivo.', 'Se a faixa pede mais cotações do que há, escreva a justificativa (por exemplo, fornecedor único).', 'Na faixa do comprador (até R$ 1.000 no padrão), a sua escolha já é a aprovação registrada.', 'Nas outras faixas, a compra vai para a Caixa de decisões de quem aprova.'] },
        { titulo: 'Aprovar ou reprovar (quem tem a alçada)', itens: ['Abra a compra pela Caixa de decisões ou pela fila (aba "Aguardando aprovação").', 'Confira os orçamentos, os arquivos e as justificativas.', 'Toque em "Aprovar" (observação opcional) ou em "Reprovar" e escreva o motivo.', 'Aprovada: o comprador recebe a atividade para fazer o pedido. Reprovada: volta para cotação com o motivo.'] },
        { titulo: 'Fazer o pedido ao fornecedor', itens: ['Na ficha de uma compra "Aprovada", toque em "Emitir o pedido de compra".', 'Informe a previsão de entrega combinada e a forma de pagamento (cartão com os 4 últimos números e as parcelas, PIX, boleto com vencimento, transferência, faturado com a condição ou reembolso).', 'Toque em "Emitir o pedido". Sai a folha A4 numerada (PC-ano-número) na pasta Compras - Pedidos de compra.', 'Toque em "Enviar ao fornecedor": o e-mail para pedidos do fornecedor já vem sugerido.', 'Depois de enviar, toque em "Já enviei: atualizar".'] },
        { titulo: 'Mudar a previsão ou o pedido', itens: ['Toque em "Mudar previsão ou rastreio", informe a data nova e o motivo. Quem pediu vê a data nova.', 'Para mudar o próprio pedido (quantidade, forma de pagamento), toque em "Nova revisão do pedido" e escreva o que mudou. Sai a revisão 01, 02...'] },
        { titulo: 'Receber e conferir', itens: ['Quando a compra chegar, toque em "Registrar o recebimento".', 'Conte e informe a quantidade recebida de cada item.', 'Marque se a especificação confere e se chegou sem dano.', 'Informe o número da nota fiscal (ou o motivo de vir sem nota).', 'Com dano, anexe a foto. Com qualquer divergência, descreva o que aconteceu.', 'Sem divergência, a peça fica "Disponível" e quem pediu é avisado. Com divergência, fica segura até você tocar em "Divergência resolvida".'] },
        { titulo: 'Registrar o pagamento', itens: ['Na ficha, toque em "Registrar o pagamento".', 'Informe o valor pago e a data (troque a forma de pagamento se mudou).', 'Anexe o comprovante e toque em "Enviar ao Financeiro".', 'Se o Financeiro apontar divergência, toque em "Corrigir e reenviar ao Financeiro" e escreva o que foi corrigido.'] },
        { titulo: 'Gestão: compra feita sem pedido', itens: ['Abra a compra pela Caixa de decisões.', 'Leia a justificativa e toque em "Ciente".', 'Converse com a pessoa para que a próxima compra passe pelo sistema.'] },
        { titulo: 'Entregar a quem pediu', itens: ['Toque em "Registrar a entrega".', 'Escolha quem recebeu e escreva a evidência (protocolo, retirada assinada) ou anexe a foto.', 'Quem pediu também pode tocar em "Recebi a peça" em Meus pedidos de compra. O pedido é encerrado.'] },
        { titulo: 'Cancelar', itens: ['Toque em "Cancelar o pedido".', 'Escreva o motivo. Quem pediu é avisado no sistema.', 'Se o pedido de compra já foi feito, avise o fornecedor.'] }
      ],
      cores: [
        { nome: 'Faixa vermelha à esquerda', significado: 'Urgência crítica (equipamento ou atendimento parado).' },
        { nome: 'Faixa laranja à esquerda', significado: 'Urgência alta.' },
        { nome: 'Selo laranja "Especificação incompleta"', significado: 'Não pode ser cotado nem aprovado até completar.' },
        { nome: 'Selo azul "Mais barata" na cotação', significado: 'O menor total entre os orçamentos que podem ser escolhidos.' },
        { nome: 'Selo verde "Escolhida"', significado: 'O orçamento vencedor.' },
        { nome: 'Selo vermelho na cotação', significado: 'Não pode ser escolhida: sem o arquivo do orçamento, validade vencida ou compatibilidade da peça a confirmar.' }
      ],
      problemas: [
        { situacao: 'O botão "iniciar cotação" não aparece.', oQueFazer: 'A especificação está incompleta ou foi devolvida. Complete pelo botão "Editar a especificação" ou espere quem pediu completar.' },
        { situacao: 'Aparece "anexe o arquivo do orçamento".', oQueFazer: 'Só conta orçamento com a prova do preço. Salve o e-mail ou o PDF do fornecedor (ou tire foto) e anexe.' },
        { situacao: 'Não consigo aprovar a compra que eu cotei.', oQueFazer: 'Acima da faixa do comprador, quem lançou ou escolheu orçamento não aprova, e quem pediu nunca aprova a própria compra. A ficha mostra quem aprova.' },
        { situacao: 'Aparece "compra aprovada sem pedido" ou "entrega atrasada" no Início.', oQueFazer: 'Emita o pedido ou cobre o fornecedor e registre a nova previsão. Depois de 2 dias úteis parada, a compra entra na Caixa de decisões do gestor da área de Compras.' },
        { situacao: 'O e-mail do fornecedor não aparece no "Enviar documento".', oQueFazer: 'O cadastro do fornecedor está sem e-mail para pedidos. Digite o endereço na janela e depois complete o cadastro em Compras > Fornecedores.' },
        { situacao: 'A aprovação recusou: "o orçamento escolhido venceu".', oQueFazer: 'Reprove com o motivo "orçamento vencido". O comprador pede a revalidação ao fornecedor, corrige a validade e escolhe de novo.' }
      ],
      quemPode: quem
    },
    'compras_fornecedores': {
      titulo: 'Fornecedores',
      paraQueServe: 'Cadastro único de fornecedores: CNPJ (ou CPF) que não se repete, dados pela consulta de CNPJ, contato, e-mail para pedidos, categorias e prazo médio. A ficha mostra as compras feitas com cada um.',
      passos: [
        { titulo: 'Cadastrar um fornecedor', itens: ['Toque em "Novo fornecedor".', 'Digite o CNPJ e toque em "Consultar CNPJ".', 'Confira a razão social e o endereço preenchidos.', 'Preencha o contato e o e-mail para pedidos.', 'Marque as categorias e toque em "Salvar fornecedor".'] },
        { titulo: 'Importar uma lista da planilha', itens: ['Toque em "Importar da planilha".', 'Na planilha, copie a linha de títulos (CNPJ, Razão social...) e as linhas dos fornecedores.', 'Cole no quadro e toque em "Ver a prévia".', 'Confira e toque em "Aplicar a importação".'] },
        { titulo: 'Arquivar', itens: ['Abra o fornecedor e toque em "Arquivar".', 'Escreva o motivo. Ele sai da escolha nas cotações; o histórico continua.', 'Para voltar, marque "Mostrar arquivados", abra e toque em "Reativar".'] }
      ],
      cores: [{ nome: 'Selo cinza "Arquivado"', significado: 'Fornecedor fora de uso; não aparece para escolha.' }],
      problemas: [
        { situacao: 'Aparece "já está cadastrado como ...".', oQueFazer: 'O CNPJ já existe. Abra esse cadastro e atualize os dados lá.' },
        { situacao: 'Aparece "Já existe fornecedor com nome parecido".', oQueFazer: 'Confira a lista. Se for outro fornecedor, toque em "Salvar mesmo assim".' },
        { situacao: 'A consulta do CNPJ não respondeu.', oQueFazer: 'Os serviços de consulta podem estar fora do ar. Preencha à mão ou tente em alguns minutos.' }
      ],
      quemPode: quem,
      perguntas: [{ p: 'A importação troca o que já está cadastrado?', r: 'Não. CNPJ que já existe só ganha os campos que estavam vazios. O que já foi digitado nunca é trocado.' }]
    },
    'compras_financeiro': {
      titulo: 'Conferência do Financeiro',
      paraQueServe: 'Conferir cada compra com o pagamento registrado: o dossiê (vínculo, cotações com os arquivos, aprovação, comprovante, nota) e a forma de pagamento. Filtre pelo mês e pelo final do cartão para bater a fatura, e baixe a planilha.',
      antesDeComecar: ['Quem registrou a compra ou o pagamento não confere a própria.', 'As compras com "Menos cotações" ou "Sem pedido" vêm marcadas: confira a justificativa.'],
      passos: [
        { titulo: 'Conferir uma compra', itens: ['Escolha o mês e a situação "Aguardando conferência".', 'Toque em "Abrir o dossiê".', 'Confira o vínculo, os orçamentos, a aprovação, o comprovante e a nota.', 'Toque em "Conferida", ou em "Divergente" e escreva o que não bate.'] },
        { titulo: 'Bater a fatura do cartão', itens: ['Escolha o mês e digite os 4 últimos números do cartão.', 'Compare a lista com a fatura.', 'Toque em "Baixar a planilha" para guardar ou conferir na planilha.'] }
      ],
      cores: [{ nome: 'Selo laranja "diferente"', significado: 'O valor pago é diferente do valor do pedido de compra: confira o motivo.' }, { nome: 'Selo vermelho "Sem pedido"', significado: 'Compra feita fora do sistema e registrada depois.' }, { nome: 'Selo laranja "Menos cotações"', significado: 'O comprador justificou ter menos orçamentos que o mínimo da faixa.' }],
      problemas: [{ situacao: 'Aparece "foi você quem registrou esta compra".', oQueFazer: 'Quem registra não confere. Peça a outra pessoa do Financeiro ou à Diretoria.' }],
      quemPode: quem,
      perguntas: [{ p: 'A divergência volta para quem?', r: 'Para quem registrou o pagamento (normalmente o comprador), no sistema e no resumo de e-mail, até corrigir e reenviar.' }]
    },
    'compras_painel': {
      titulo: 'Painel de compras',
      paraQueServe: 'Compras em aberto por situação, entregas atrasadas, gasto do mês por vínculo, área e fornecedor, e os controles: recebidas fora do prazo, menos cotações que o mínimo, divergências e compras sem pedido. Gera o relatório mensal em A4.',
      passos: [{ titulo: 'Ver outro mês e o relatório', itens: ['Escolha o mês no alto da tela.', 'Toque em "Relatório do mês (A4)": abre a folha A4 e salva PDF e HTML na pasta Compras - Relatórios.', 'No primeiro dia útil, o relatório do mês anterior sai sozinho e a Diretoria é avisada.'] }],
      quemPode: quem
    },
    'compras_regras': {
      titulo: 'Regras de compras',
      paraQueServe: 'Quem compra (comprador e substituto), quem aprova até que valor, quantas cotações cada faixa pede, a área de Compras, os prazos e os dados da empresa no pedido de compra.',
      antesDeComecar: ['Só o Administrador e a Diretoria alteram. Compradores e gestores consultam.', 'O padrão é o aprovado pelo dono em 21/10/2026: até R$ 1.000 o comprador aprova (1 cotação); até R$ 10.000 o gestor da área (2 cotações); acima, a Diretoria (3 cotações).'],
      passos: [
        { titulo: 'Escolher o comprador e o substituto', itens: ['Marque o comprador na primeira lista.', 'Marque o substituto na segunda lista.', 'Escreva o motivo e toque em "Salvar as regras".'] },
        { titulo: 'Mudar uma faixa', itens: ['Altere o valor "até", quem aprova ou as cotações mínimas.', 'Escreva o motivo e toque em "Salvar as regras".', 'Vale para as próximas escolhas de orçamento.'] }
      ],
      problemas: [{ situacao: 'Aparece "os valores das faixas precisam crescer".', oQueFazer: 'Cada faixa precisa ter o valor maior que a anterior. A última faixa não tem teto.' }],
      quemPode: quem,
      perguntas: [{ p: 'Quem aprova quando o próprio comprador pediu a compra?', r: 'Quem pediu não aprova a própria compra. Na faixa do comprador, aprova o substituto; sem ele, o gestor da área.' }]
    }
  };
}
