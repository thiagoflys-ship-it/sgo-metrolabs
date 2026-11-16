/**
 * SGO_Ajuda_ConciliacaoCaju.js — ajuda "Como usar esta tela" da Conciliação Caju (11/11/2026).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Tela: JS_ConciliacaoCaju.html. Regras: SGO_Caju*.js.
 * Manual completo: docs/MANUAL_CONCILIACAO_CAJU.md. Guia de uma página: output/conciliacao-caju/GUIA_WANESSA_CONCILIACAO.md.
 * Sem recursos de administração do sistema (as credenciais ficam em Chaves e senhas e são citadas só como "o responsável pelo sistema grava").
 */
function SGO_ajudaTelas_ConciliacaoCaju_() {
  return {
    'conciliacao_caju': {
      titulo: 'Conciliação Caju',
      paraQueServe: 'Dar ao Financeiro o controle do dinheiro das viagens que vai para o cartão Caju: fazer a carga pelo Caju sem entrar no portal, acompanhar até o crédito cair no cartão, importar o extrato do cartão e conferir, gasto a gasto, se o que foi pago bate com a prestação de contas (comprovante e para que foi). O que não bate vira divergência, com o dono e o motivo. No fim do mês, o período é fechado por centro de custo, com o relatório A4. A Diretoria acompanha tudo; quem viaja gera o próprio relatório individual no Depósito de viagem.',
      antesDeComecar: [
        'As credenciais do Caju são gravadas pelo responsável pelo sistema em Chaves e senhas (grupo Caju). Comece pelo ambiente de homologação (conta fictícia): o crédito é fictício e a carga não entra no depósito.',
        'Cada pessoa que viaja precisa estar vinculada ao Caju pelo CPF (aba Colaboradores). Tenha o CPF de cada uma.',
        'Para conciliar os gastos, exporte o extrato de despesas em CSV no Portal do RH do Caju (do período que vai conferir).',
        'A conciliação compara com a prestação de contas: cada gasto lançado no Depósito de viagem com o comprovante e para que foi.',
        'Cada campo tem embaixo a explicação do que preencher e para que serve (no mapa das colunas do extrato, cada coluna diz o que ela é). Os motivos dizem o que escrever em cada ação.',
        'A tela mostra uma marca d\'água discreta com o seu nome, login, data e hora, também na impressão: os dados são sigilosos.'
      ],
      passos: [
        { titulo: 'Primeira vez: Comece por aqui', itens: ['Abra a aba "Comece por aqui": ela mostra o caminho de cada viagem e os passos da primeira vez, com o que já está feito marcado.', 'Em Configuração, toque em "Testar a conexão" e escolha a categoria do crédito (em que saldo do Caju o dinheiro da viagem cai). Também dá para escolher na primeira carga.'] },
        { titulo: 'Vincular os colaboradores', itens: ['Abra Colaboradores e toque em "Atualizar a lista do Caju".', 'Em cada pessoa, digite o CPF e toque em "Vincular pelo CPF", ou toque na sugestão pelo nome.', 'Quem não está no Caju: "Cadastrar no Caju", confira nome, CPF e o e-mail ou o celular, e confirme.', 'Pessoa que saiu da empresa: "Arquivar no Caju", com o motivo. O alerta vermelho aponta quem está inativo no SGO+ e ativo no Caju.'] },
        { titulo: 'Fazer a carga pelo Caju', itens: ['Primeiro, em Configuração, escolha o modo da carga: "Carga pelo Caju" (pedido de benefício pela API: o SGO+ cria, paga e registra) ou "Carga manual" (Caju Despesas ou outro: você carrega fora e registra com o comprovante). O padrão é manual; a API do Caju não contempla o módulo de Despesas (protocolo Caju 02527150).', 'Abra a viagem aprovada em Depósito de viagem > Carga no cartão.', 'No quadro "Fazer a carga pelo Caju", confira o valor (nunca passa do aprovado) e toque no botão. Confirme na caixa que aparece.', 'O SGO+ cria o pedido "VIAGEM <número>" e paga com o saldo da conta Caju da empresa (crédito mais a taxa).', 'Faltou saldo: coloque saldo e toque em "Tentar de novo com o saldo", ou em "Pagar por PIX" e copie o código para o banco da empresa.', 'O SGO+ consulta o Caju a cada 15 minutos (ou no botão Atualizar) e, creditado, registra a carga na viagem com o comprovante do pedido.'] },
        { titulo: 'Importar o extrato', itens: ['Abra "Importar extrato" e escolha o CSV exportado do Portal do RH do Caju.', 'Confira a prévia: cada informação (data, valor, colaborador, estabelecimento...) precisa estar na coluna certa. Troque o que estiver errado e toque em "Ver a prévia de novo".', 'Toque em "Importar estas linhas" e confirme. Linha já importada é pulada; o arquivo original fica guardado.', 'A conciliação roda sozinha em seguida. Importação errada: "Desfazer esta importação", com o motivo.'] },
        { titulo: 'Tratar as divergências', itens: ['Abra "Divergências". Cada uma diz o que foi encontrado, o dono (quem precisa agir) e o que fazer.', 'Gasto sem comprovante: toque em "Avisar" para o dono lançar o gasto na prestação; quando ele lançar, a divergência é sanada sozinha.', 'Diferença explicada (gorjeta, taxa): "Resolver (com motivo)" e escolha como foi resolvida.', 'Para ligar uma transação a um gasto à mão, abra a viagem ("Ver a viagem") e use "Ligar ao gasto". Valor diferente pede o motivo.'] },
        { titulo: 'Fechar o período e gerar os relatórios', itens: ['Abra "Fechamento", escolha o período (o mês) e o centro de custo e toque em "Ver a prévia".', 'Resolva as pendências apontadas. Se precisar fechar assim mesmo, escreva a ressalva.', 'Toque em "Fechar o período" e abra ou baixe o A4. Para corrigir depois, "Reabrir (com motivo)".', 'Em "Relatórios A4": individual (por colaborador), geral do período, divergências e créditos, para abrir ou baixar.'] }
      ],
      quemPode: [
        { perfil: 'FINANCEIRO', pode: 'Tudo: carga pelo Caju, colaboradores, extrato, divergências, fechamento, configuração e relatórios A4.' },
        { perfil: 'DIRETORIA', pode: 'Acompanha o painel, as divergências e os fechamentos e gera os relatórios A4 (individual e geral). O módulo é sigiloso: só as contas da lista de sigilo do Financeiro o abrem, qualquer que seja o perfil (a mesma lista do Painel financeiro).' },
        { perfil: 'TECNICO', pode: 'Não usa este módulo: lança os gastos no Depósito de viagem e gera ali o próprio relatório individual.' }
      ],
      problemas: [
        { situacao: 'Em produção, a carga pelo Caju é dinheiro de verdade.', oQueFazer: 'Confira o valor e a pessoa na caixa de confirmação antes de tocar em "Fazer a carga".' },
        { situacao: 'Não consigo resolver uma divergência ("ninguém concilia a própria despesa").', oQueFazer: 'Você viaja ou pediu essa viagem: outra pessoa do Financeiro trata a divergência. Quem aprovou ou viaja também não faz a carga.' },
        { situacao: 'O pedido ficou "Conferir no portal do Caju".', oQueFazer: 'A rede caiu na criação. Veja no portal do Caju se existe o pedido "VIAGEM <número>": se existir, informe o número na viagem; se não, toque em "Não foi criado, liberar" e faça de novo.' },
        { situacao: 'O período está fechado e preciso corrigir.', oQueFazer: 'Em Fechamento, toque em "Reabrir (com motivo)", corrija e feche de novo. O motivo fica no histórico e no A4.' }
      ],
      perguntas: [
        { p: 'A carga pelo Caju não aparece na viagem. Por quê?', r: 'Aparece quando a viagem está aprovada, falta carregar e você tem a permissão de fazer a carga. Se o quadro mostra "Antes da carga pelo Caju", resolva o que ele aponta (integração configurada, colaborador vinculado e não arquivado).' },
        { p: 'Faltou saldo na conta Caju. E agora?', r: 'O pedido fica criado e não pago. Coloque saldo na conta e toque em "Tentar de novo com o saldo", ou toque em "Pagar por PIX": o código aparece na tela para pagar no banco.' },
        { p: 'O arquivo do Caju tem colunas com outros nomes.', r: 'Na prévia, escolha qual coluna do arquivo é cada informação e toque em "Ver a prévia de novo". O mapeamento fica guardado para o próximo arquivo igual.' },
        { p: 'Uma divergência sumiu sozinha.', r: 'Ela foi sanada: a condição deixou de existir (por exemplo, o gasto foi lançado na prestação). Veja em Divergências > Sanadas sozinhas.' }
      ]
    }
  };
}
