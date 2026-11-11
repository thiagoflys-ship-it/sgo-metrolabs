/****************************************************
 * AJUDA "COMO USAR ESTA TELA" — SGO+ LICITAÇÕES, DOCUMENTOS DE HABILITAÇÃO (02/11/2026)
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Manual completo: docs/MANUAL_MODULO_LICITACOES.md, seção "Documentos de habilitação".
 * Tela: licitacoes_habilitacao. Texto conferido com JS_Licitacoes_Habilitacao.html e SGO_Licitacoes_Habilitacao.js. Texto puro, sem HTML.
 * A aba "Habilitação" da ficha está na ajuda de Oportunidades (SGO_Ajuda_Licitacoes.js).
 ****************************************************/
function SGO_ajudaTelas_LicitacoesHabilitacao_() {
  return {
    "licitacoes_habilitacao": {
      titulo: "Documentos de habilitação",
      paraQueServe: "Cadastro único dos documentos de habilitação da Metrolabs (matriz de Goiânia, EPP): certidões, atestados de capacidade técnica, balanço, contrato social, declarações, cadastros e registros. Cada documento tem a validade, o arquivo guardado restrito com o SHA-256, a versão e o histórico. Os avisos de vencimento e o cruzamento com cada edital saem daqui.",
      antesDeComecar: [
        "A validade nunca é presumida: escreva a data impressa no documento. Declarações e documentos \"por certame\" ficam sem data (são feitos para cada licitação).",
        "Os certificados de calibração dos padrões não são cadastrados aqui: vêm de Metrologia › Padrões de referência.",
        "A Metrolabs não é acreditada RBC (só rastreável). O registro do Inmetro vale para balanças e esfigmomanômetros; o escopo exato depende do documento."
      ],
      passos: [
        { titulo: "Cadastrar um documento", itens: [
          "Toque em \"Cadastrar documento\" (ou em \"Cadastrar\" na lista \"Documentos da lista ainda sem cadastro\").",
          "Escolha o documento na lista (os 27 do levantamento de habilitação, o registro do Inmetro, o enquadramento EPP, o alvará ou \"Outro documento\"). A categoria vem com o documento; só \"Outro documento\" escolhe a categoria.",
          "Preencha o número, a emissão, a validade impressa, o órgão emissor, o link de verificação oficial (começando com https://) e o responsável.",
          "Anexe o PDF ou a foto do documento (até 10 MB). O SGO+ guarda o arquivo restrito e calcula o SHA-256. Sem arquivo, o documento conta como \"falta\" nas licitações."
        ] },
        { titulo: "Atestado de capacidade técnica", itens: [
          "Escreva o contratante (com o CNPJ, se tiver), o objeto e o período.",
          "Em \"Serviços e quantidades\", uma linha por serviço: serviço; quantidade; unidade (ex.: Calibração de termômetros; 120; equipamentos). É isso que o sistema compara com a exigência do edital.",
          "Se houver CAT ou acervo, e a O.S. ou o relatório que comprova, escreva também."
        ] },
        { titulo: "Renovar ou corrigir", itens: [
          "\"Editar ou trocar o arquivo\" grava uma versão nova com o motivo (pelo menos 10 letras). Só o que você mudou muda.",
          "Trocar o arquivo não apaga o anterior: ele fica na versão anterior, em \"Histórico\", e pode ser aberto de lá.",
          "\"Retirar de uso\" também é versão (com o motivo); \"Voltar a usar\" desfaz. Nada é apagado."
        ] },
        { titulo: "Abrir e verificar", itens: [
          "\"Abrir o arquivo\" e \"Baixar\" conferem o SHA-256 no servidor antes de entregar; se não conferir, o arquivo não é entregue e o caso fica no histórico.",
          "\"Verificar no emissor\" abre o site oficial informado no cadastro, em nova aba."
        ] },
        { titulo: "Aba Habilitação da ficha conforme a situação", itens: [
          "No radar: a faixa diz que a oportunidade ainda não está em análise (a habilitação entra nas pendências do Hoje e do Painel a partir de \"Em análise\"); o cruzamento já vale para conferir.",
          "Em Resultado e em Contrato: a faixa azul diz que a habilitação da licitação foi concluída (ou contratada); a conferência continua visível para consulta e não gera pendência nova."
        ] },
        { titulo: "Avisos de vencimento", itens: [
          "A 30 e a 15 dias do vencimento: aviso no SGO+ e por e-mail (nunca pelo WhatsApp). A 7 dias e vencido: também pelo WhatsApp oficial. Um aviso por faixa e por versão: a faixa que já passou não sai de novo, e o aviso mais novo tira o anterior da lista \"sem ciência\".",
          "Os avisos de documento saem das 8h às 18h (Brasília), para a Diretoria de Licitações (o responsável do documento, se for da Diretoria), com teto próprio de 10 por pessoa no dia. Documento que vence antes da sessão: um aviso só, com as licitações afetadas. Quem desligou o e-mail nas regras dos alertas vê o aviso só no SGO+.",
          "Cadastrou a versão renovada: os avisos da versão anterior saem da fila sozinhos."
        ] }
      ],
      cores: [
        { nome: "Selo verde \"Vigente\"", significado: "A validade passa de 30 dias." },
        { nome: "Selo laranja \"Vence em até 30 (ou 15) dias\"", significado: "Hora de pedir a renovação." },
        { nome: "Selo vermelho \"Vence em até 7 dias\" ou \"Vencido\"", significado: "Renove agora: documento vencido na data da sessão não se corrige depois." },
        { nome: "Selo vermelho \"Sem arquivo\"", significado: "O documento está cadastrado sem o PDF ou a foto: nas licitações conta como falta." },
        { nome: "Selo cinza \"Sem validade\"", significado: "Documento sem data (contrato social, declaração por certame, emitir na data)." }
      ],
      problemas: [
        { situacao: "Aparece \"O conteúdo do arquivo não é um PDF de verdade\"", oQueFazer: "A extensão não confere com o arquivo. Gere o PDF de novo (ou tire a foto de novo) e anexe. Nada foi alterado." },
        { situacao: "Aparece \"o arquivo guardado não confere com o SHA-256 registrado\"", oQueFazer: "O arquivo pode ter sido mexido fora do SGO+. Avise o Administrador e anexe de novo o documento original (vira uma versão nova)." },
        { situacao: "O link de verificação não é aceito", oQueFazer: "Use o endereço oficial do emissor começando com http:// ou https://, sem espaços." },
        { situacao: "Não aparece \"Certificados de calibração dos padrões\" na lista", oQueFazer: "Eles já ficam em Metrologia › Padrões de referência e são lidos de lá. Atualize os certificados nos Padrões." }
      ],
      quemPode: [
        { perfil: "DIRETORIA,ADMIN", pode: "Tudo: cadastrar, mudar, anexar, retirar de uso, abrir os arquivos e o histórico." },
        { perfil: "GESTOR,COMERCIAL,FINANCEIRO,TECNICO,METROLOGIA,RH,CLIENTE", pode: "Não usa este módulo: o menu não aparece e o servidor recusa as chamadas." }
      ],
      perguntas: [
        { p: "Posso apagar um documento errado?", r: "Não. Use \"Retirar de uso\" com o motivo: ele sai das sugestões e dos avisos, mas fica no histórico com os arquivos." },
        { p: "Como a validade é calculada?", r: "Não é calculada: vale a data impressa que você escreveu. O SGO+ só compara essa data com o dia de hoje em Brasília (e, nas licitações, com a data da sessão)." },
        { p: "E a regularidade fiscal tardia da EPP?", r: "A LC 123/2006 (art. 43) deixa a EPP apresentar a certidão fiscal ou trabalhista com restrição e regularizar em 5 dias úteis depois de declarada vencedora, prorrogáveis. A certidão continua sendo exigida: a pendência aparece com essa observação." }
      ]
    }
  };
}
