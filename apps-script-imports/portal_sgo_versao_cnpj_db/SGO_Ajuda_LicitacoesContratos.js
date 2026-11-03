/****************************************************
 * AJUDA "COMO USAR ESTA TELA" — SGO+ LICITAÇÕES, CONTRATOS CONQUISTADOS (02/11/2026)
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Manual completo: docs/MANUAL_MODULO_LICITACOES.md, seção "Contratos (tela Contratos e aba
 * Contrato da ficha)". Tela: licitacoes_contratos. Texto conferido com JS_Licitacoes_Contratos.html e SGO_Licitacoes_Contratos.js.
 * Texto puro, sem HTML. A aba "Contrato" da ficha também está na ajuda de Oportunidades (SGO_Ajuda_Licitacoes.js).
 ****************************************************/
function SGO_ajudaTelas_LicitacoesContratos_() {
  return {
    "licitacoes_contratos": {
      titulo: "Contratos",
      paraQueServe: "Lista os contratos e as atas de registro de preços conquistados nas licitações, com a vigência, o valor e o que vence nos próximos 90 dias, e as licitações com resultado que ainda não viraram contrato. Cada contrato abre na ficha da licitação, aba Contrato: itens, condições, versões e aditivos, arquivo assinado, prazos na agenda, previsão de faturamento e a integração com os outros módulos do SGO+.",
      antesDeComecar: [
        "O contrato nasce do resultado homologado da disputa (aba Disputa, \"Concluir o resultado\"). Sem a disputa no SGO+, ou com o resultado pendente, use o registro manual, com o motivo e a fonte do resultado.",
        "Nada é criado em outro módulo (cliente, Comercial, Minhas atividades, planejamento da execução) sem você tocar no botão e confirmar. Cada ação fica no histórico e na lista de vínculos do contrato."
      ],
      passos: [
        { titulo: "Registrar o contrato", itens: [
          "Em \"Resultados prontos para virar contrato\", toque em \"Registrar o contrato\" (abre a ficha, aba Contrato).",
          "Os itens ganhos, o valor unitário homologado e a homologação vêm do resultado. A quantidade pode ser menor que a ganha (contrato parcial de uma ata); valor diferente do homologado não entra no registro: faça a correção depois, com o motivo.",
          "Preencha o número, o tipo, a assinatura, a vigência, o reajuste (índice, data-base e de onde vem), a garantia (tipo, valor, validade e de onde vem), a renovação, as entregas (prazo e valor) e as obrigações. Escolha o responsável da Diretoria.",
          "Anexe o contrato assinado (PDF ou foto, até 10 MB) agora ou depois, escreva o motivo e toque em \"Registrar o contrato\". A licitação vai para \"Contrato\" no Kanban e os prazos entram na agenda."
        ] },
        { titulo: "Mudar o contrato (versões)", itens: [
          "\"Nova versão\" escolhe o tipo: correção de digitação, termo aditivo (número e fonte), apostilamento (reajuste dos valores, índice e data-base) ou encerramento (encerrado ou rescindido).",
          "Só o que muda entra na versão nova; a anterior fica no histórico, com o arquivo dela. Aditivo acima de 25% do valor inicial mostra o aviso da Lei 14.133/2021, art. 125.",
          "Prazo que mudou vira versão nova na agenda (a anterior fica \"substituída\"); marco que saiu ou contrato encerrado cancela o prazo com o motivo, e os alertas acompanham."
        ] },
        { titulo: "Integrar com os módulos", itens: [
          "Cliente: o SGO+ procura o CNPJ do órgão (vindo do PNCP) no cadastro de clientes e de unidades. Achou: \"Vincular\". Não achou: \"Cadastrar o órgão como cliente\", com os dados do PNCP já preenchidos; complete endereço, contato, e-mail e telefone e marque o \"Ciente\". O CNPJ nunca é cadastrado duas vezes.",
          "Comercial: com o cliente vinculado e um contato do órgão no Comercial, \"Registrar como ganha no Comercial\" cria a oportunidade (origem Licitação) e a marca como ganha. Nenhuma proposta é criada no Comercial.",
          "Agenda única: \"Levar à agenda única\" lança em Minhas atividades uma atividade por marco futuro, para o responsável. Marco já levado não se repete; se o contrato mudar depois, a tela avisa qual atividade ficou com o prazo antigo.",
          "Planejar a execução: os serviços aparecem por área, pelo código do catálogo (CAL Metrologia, QUA Qualificação, NR13 NR-13, os demais Assistência). \"Criar o planejamento\" lança a atividade para quem planeja (Metrologia, Qualificação e NR-13 caem no Kanban do Cronograma de execução). Nenhuma O.S., chamado ou requisição é criado."
        ] },
        { titulo: "Acompanhar", itens: [
          "A previsão de faturamento soma as entregas com valor por mês; sem entregas com valor, é uma estimativa linear. É só leitura: o SGO+ não tem módulo de faturamento.",
          "\"Relatório do contrato (A4)\" gera o documento com itens, condições, prazos, previsão, vínculos e versões, guardado com o SHA-256; aparece também em Licitações › Relatórios."
        ] }
      ],
      cores: [
        { nome: "Selo verde", significado: "Vigente (mais de 90 dias para o fim), ou vínculo já feito." },
        { nome: "Selo laranja", significado: "Vence nos próximos 90 dias, ou a atividade da agenda única ficou com o prazo antigo." },
        { nome: "Selo vermelho", significado: "A vigência terminou sem aditivo nem encerramento registrado, ou o registro foi alterado fora do SGO+." },
        { nome: "Selo azul", significado: "Ainda não começou, ou marco a levar à agenda única." },
        { nome: "Selo cinza", significado: "Encerrado ou rescindido, ou marco que já passou." }
      ],
      problemas: [
        { situacao: "\"Registrar o contrato\" está travado", oQueFazer: "A lista \"Antes de registrar pelo resultado\" diz o que falta (resultado concluído, homologação de cada item ganho). Resolva na aba Disputa ou use o registro manual, com o motivo." },
        { situacao: "Aparece \"diferente do homologado no resultado\"", oQueFazer: "Registre com o valor homologado. Se o contrato assinado diz outro valor, grave uma correção depois, com o motivo (fica marcado no histórico)." },
        { situacao: "Aparece \"já existe no cadastro o CNPJ\"", oQueFazer: "O órgão já é cliente (ou unidade de um cliente): use \"Vincular\" em vez de cadastrar de novo." },
        { situacao: "O cadastro do cliente pede mais dados", oQueFazer: "O cadastro de clientes exige CEP, endereço, contato, e-mail e telefone e o \"Ciente\". Complete com o contrato ou o edital e grave de novo. Nada foi criado." },
        { situacao: "\"Registrar como ganha no Comercial\" não aparece", oQueFazer: "Vincule o cliente antes e cadastre o contato do órgão (gestor ou fiscal do contrato) em Comercial › Contatos." },
        { situacao: "Aparece \"o registro do contrato foi alterado fora do SGO+\"", oQueFazer: "Alguém mexeu na planilha. O SGO+ não grava versões novas: avise o Administrador para conferir." }
      ],
      quemPode: [
        { perfil: "DIRETORIA,ADMIN", pode: "Registrar o contrato, gravar versões, anexar e abrir o arquivo, vincular ou cadastrar o cliente, registrar no Comercial, levar à agenda única, criar o planejamento e gerar o relatório." },
        { perfil: "GESTOR,COMERCIAL,FINANCEIRO,TECNICO,METROLOGIA,RH,CLIENTE", pode: "Não usa este módulo: o menu não aparece e o servidor recusa as chamadas. Quem recebe uma atividade (agenda única ou planejamento) a vê em Minhas atividades." }
      ],
      perguntas: [
        { p: "O SGO+ cria a O.S. sozinho?", r: "Não. O SGO+ só lança a atividade de planejamento da área, quando a Diretoria pede. O chamado, a O.S. e a requisição são abertos nos módulos de cada área." },
        { p: "Posso apagar um contrato registrado errado?", r: "Não: nada é apagado. Corrija com uma versão de correção, com o motivo; contrato que não vale mais é encerrado (rescindido), com a fonte." },
        { p: "Uma ata de registro de preços com várias ordens?", r: "Registre a ata como um contrato do tipo \"Ata de registro de preços\" e cadastre cada ordem de fornecimento como entrega, com o prazo e o valor." },
        { p: "Para quem vão os alertas dos prazos do contrato?", r: "Para a Diretoria de Licitações, pelos mesmos canais e regras dos outros alertas de Licitações (Central de alertas, e-mail e WhatsApp pelo modelo aprovado)." }
      ]
    }
  };
}
