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
        { titulo: 'Fazer um pedido', itens: ['Toque em "Pedir peça ou material" no menu Compras.', 'Escreva para que é e onde será usado.', 'Escolha a urgência. Use "Crítica" só para equipamento ou atendimento parado.', 'Escolha a que a compra está ligada: cliente, pedido aprovado do Comercial, veículo da Frota ou uso interno.', 'Preencha cada item: tipo, descrição, quantidade e unidade.', 'Para peça, informe o equipamento de origem e o número da peça com a marca, ou pelo menos dois dados técnicos; sem o número da peça, tire a foto.', 'Toque em "Enviar a Compras".'] },
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
        { titulo: 'Cancelar um pedido', itens: ['Enquanto o pedido está "Solicitada", toque em "Cancelar o pedido".', 'Escreva o motivo e confirme.', 'Depois que a cotação começa, peça o cancelamento ao comprador.'] }
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
        { titulo: 'Cancelar', itens: ['Toque em "Cancelar o pedido".', 'Escreva o motivo. Quem pediu é avisado no sistema.', 'Se o pedido de compra já foi feito, avise o fornecedor.'] }
      ],
      cores: [
        { nome: 'Faixa vermelha à esquerda', significado: 'Urgência crítica (equipamento ou atendimento parado).' },
        { nome: 'Faixa laranja à esquerda', significado: 'Urgência alta.' },
        { nome: 'Selo laranja "Especificação incompleta"', significado: 'Não pode ser cotado nem aprovado até completar.' }
      ],
      problemas: [
        { situacao: 'O botão "iniciar cotação" não aparece.', oQueFazer: 'A especificação está incompleta ou foi devolvida. Complete pelo botão "Editar a especificação" ou espere quem pediu completar.' }
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
