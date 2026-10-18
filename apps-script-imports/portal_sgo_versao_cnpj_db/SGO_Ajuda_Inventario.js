/**
 * Ajuda "Como usar esta tela" — grupo Inventario (frente C).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Texto puro, sem HTML.
 * Conferido contra a tela real (SGO_Inventario_ConteudoModulo.js) em 17/10/2026.
 */
function SGO_ajudaTelas_Inventario_() {
  return {
    "inventario": {
      titulo: "Inventário de equipamentos",
      paraQueServe: "Monta a lista dos equipamentos de um cliente com a situação da calibração e da qualificação de cada um. Gera o PDF para imprimir e o relatório A4 com análise. Esta tela não cadastra nada: só lê o que já está no sistema.",
      antesDeComecar: [
        "Os equipamentos e os documentos precisam estar cadastrados em \"Equipamentos\" e em \"Arquivo de documentos\".",
        "O documento só conta se estiver ativo, ligado ao equipamento e com o tipo de calibração ou qualificação.",
        "O inventário é um retrato do momento. Se algo mudar, gere de novo."
      ],
      passos: [
        { titulo: "Gerar o inventário", itens: [
          "Toque em \"Inventário de equipamentos\" no menu.",
          "Se souber o CNPJ, digite em \"Buscar por CNPJ\" e toque em \"Buscar\". O cliente é escolhido sozinho.",
          "Ou escolha o cliente na lista \"Cliente\".",
          "Se quiser, escolha a unidade em \"Unidade\".",
          "Em \"Status\", escolha \"Todos\", \"Ativo\" ou \"Inativo\".",
          "Toque em \"Gerar Inventário\".",
          "Aguarde a tabela aparecer."
        ] },
        { titulo: "Ler o resultado", itens: [
          "Olhe primeiro os cartões do topo: total, em dia, vencendo, vencidos e sem documentação.",
          "Na tabela, olhe primeiro as linhas vermelhas e depois as amarelas.",
          "Em cada linha, confira as colunas \"Calibração\" e \"Qualificação\"."
        ] },
        { titulo: "Imprimir ou salvar em PDF", itens: [
          "Toque em \"Gerar PDF / Imprimir\".",
          "Confira a pré-visualização. O papel é A4 deitado.",
          "Toque em \"Imprimir / Salvar PDF\".",
          "Para PDF, escolha \"Salvar como PDF\" na janela de impressão.",
          "Toque em \"Fechar\" para voltar."
        ] },
        { titulo: "Gerar o relatório A4 com análise", itens: [
          "Gere o inventário primeiro.",
          "Toque em \"Relatório A4 com análise\".",
          "Aguarde até um minuto. O relatório abre numa aba nova.",
          "Uma cópia em PDF e HTML fica guardada na pasta do cliente. O link aparece na tela."
        ] },
        { titulo: "Achar um inventário já salvo", itens: [
          "Em \"Documentos já Gerados\", digite o nome do cliente ou do arquivo.",
          "Toque em \"Buscar\".",
          "Toque no link do arquivo."
        ] }
      ],
      cores: [
        { nome: "Selo verde \"OK\"", significado: "Em dia. Faltam mais de 30 dias para vencer." },
        { nome: "Selo amarelo \"Vencendo\"", significado: "Vence em 1 a 30 dias. Programe o serviço." },
        { nome: "Selo vermelho \"Vencido\"", significado: "Já venceu ou vence hoje. O equipamento está irregular." },
        { nome: "Selo cinza \"Sem doc\"", significado: "Não há documento, ou o documento não tem data de vencimento." },
        { nome: "Linha com fundo vermelho", significado: "O equipamento tem pelo menos um documento vencido." },
        { nome: "Linha com fundo amarelo", significado: "O equipamento tem documento vencendo." },
        { nome: "Linha apagada", significado: "Equipamento inativo." },
        { nome: "Status \"ATIVO\" verde e \"INATIVO\" cinza", significado: "Situação do equipamento no cadastro." }
      ],
      problemas: [
        { situacao: "\"Nenhum equipamento encontrado com os filtros selecionados.\"", oQueFazer: "Troque a unidade para \"Todas as unidades\" e o status para \"Todos\". Gere de novo." },
        { situacao: "\"Digite o CNPJ (ou parte dele) pra buscar.\"", oQueFazer: "Digite o CNPJ, só números, e toque em \"Buscar\"." },
        { situacao: "\"Nenhum cliente ativo encontrado com esse CNPJ.\"", oQueFazer: "Confira o número ou escolha o cliente na lista." },
        { situacao: "\"Gere o inventário antes de imprimir.\" ou \"antes de emitir o relatório\"", oQueFazer: "Toque em \"Gerar Inventário\" primeiro." },
        { situacao: "Equipamento aparece \"Sem doc\" mas tem certificado", oQueFazer: "Confira no \"Arquivo de documentos\" se o documento está ativo, ligado a este equipamento e com data de vencimento." },
        { situacao: "\"O navegador bloqueou a nova aba\"", oQueFazer: "Toque no link \"abrir o relatório\"." },
        { situacao: "A análise saiu com o texto padrão do sistema", oQueFazer: "A chave da IA não está gravada. Os números estão certos. Peça ao administrador para gravar a chave em \"Chaves e senhas\"." },
        { situacao: "\"a cópia (PDF e HTML) não foi gravada na pasta\"", oQueFazer: "O relatório abriu, mas não foi guardado. Gere de novo. Se repetir, avise o administrador." }
      ],
      quemPode: [
        { perfil: "ADMIN,GESTOR,DIRETORIA,TECNICO,METROLOGIA,COMERCIAL,FINANCEIRO", pode: "Gerar o inventário de qualquer cliente, imprimir, gerar o relatório A4 e buscar os já gerados." },
        { perfil: "CLIENTE", pode: "Só a própria empresa, quando a tela estiver liberada no seu menu." }
      ],
      perguntas: [
        { p: "Posso cadastrar ou corrigir um equipamento aqui?", r: "Não. Use \"Equipamentos\" e \"Arquivo de documentos\". Depois gere o inventário de novo." },
        { p: "Qual documento vale quando há mais de um?", r: "O de validade mais distante, entre os ativos ligados ao equipamento." },
        { p: "Por que \"vence hoje\" aparece como vencido?", r: "Porque no dia do vencimento o documento já não pode ser usado. É a mesma regra do Início e dos certificados." }
      ]
    }
  };
}
