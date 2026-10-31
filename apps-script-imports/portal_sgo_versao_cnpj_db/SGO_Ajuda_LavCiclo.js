/**
 * Ajuda "Como usar esta tela" — Relatórios de ciclo da lavadora (31/10/2026).
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Texto puro, sem HTML. Conferido contra a tela real (JS_LavCiclo.html).
 * A configuração das referências por receita é da gestão: aparece só nas linhas de "quem pode" desses perfis e no manual
 * da gestão (docs/MANUAL_RELATORIO_CICLO_LAVADORA_GESTAO.md); o cliente não vê.
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
        "Pelo QR code da lavadora, a tela abre direto no equipamento certo."
      ],
      passos: [
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
          "Abra a aba \"Equipamentos\".",
          "Na lavadora certa, toque em \"Gerar relatório do ciclo\".",
          "Toque em \"Escolher o arquivo do ciclo\" e escolha o arquivo .sgolav.",
          "Confira os dados e toque em \"Confirmar e gerar o relatório\"."
        ] },
        { titulo: "Assinar o relatório na tela", itens: [
          "Logo depois de gerar, toque em \"Assinar agora\". Para assinar depois, abra \"Relatórios gerados\" e toque em \"Assinar\" no relatório.",
          "Toque em \"Abrir o relatório para conferir\" e leia a folha.",
          "Assine no quadro com o dedo (celular) ou com o mouse (computador). Se errar, toque em \"Limpar a assinatura\".",
          "Escreva o nome e o cargo de quem assina.",
          "Marque \"Conferi os dados do relatório\".",
          "Toque em \"Assinar\".",
          "Depois de assinado, o documento fica travado. Uma correção só pela Metrolabs, em nova versão."
        ] },
        { titulo: "Encontrar, abrir e baixar um relatório", itens: [
          "Abra a aba \"Relatórios gerados\".",
          "Para achar um ciclo, escreva o lote em \"Buscar\" ou escolha o período em \"De\" e \"Até\".",
          "Para ver só os cancelados ou só os que faltam assinar, use \"Resultado\" e \"Assinatura\".",
          "Toque em \"Abrir o relatório\" para ver a folha A4.",
          "Toque em \"Baixar PDF\" para guardar o arquivo.",
          "Toque em \"Versões e histórico\" para ver quem gerou, quem assinou e as versões anteriores."
        ] },
        { titulo: "Completar o cadastro do equipamento", itens: [
          "Se a tela mostrar \"O cadastro desta lavadora está sem...\", o relatório sai assim mesmo, com um traço nesses campos.",
          "Quem pode editar o cadastro toca em \"Completar o cadastro do equipamento\", preenche e salva.",
          "Para o relatório já gerado mostrar o cadastro completo, a equipe da Metrolabs gera uma nova versão."
        ] },
        { titulo: "Gerar nova versão (equipe da Metrolabs)", itens: [
          "Em \"Relatórios gerados\", toque em \"Versões e histórico\" no relatório.",
          "Toque em \"Gerar nova versão\".",
          "Escreva o motivo (pelo menos 10 letras) e toque em \"Gerar nova versão\".",
          "A versão anterior continua guardada, marcada como substituída. A nova precisa de assinatura de novo."
        ] }
      ],
      cores: [
        { nome: "Selo verde \"APROVADO\"", significado: "A lavadora concluiu o ciclo sem falha registrada." },
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
        { situacao: "Não aparece nenhuma lavadora na aba \"Equipamentos\"", oQueFazer: "A lavadora não está cadastrada ou não está ligada ao seu cliente. Peça à Metrolabs para cadastrar." }
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
        { p: "Posso assinar mais tarde?", r: "Sim. Abra \"Relatórios gerados\", filtre \"Assinatura: Aguardando assinatura\" e toque em \"Assinar\"." }
      ],
      secoesManual: [
        { titulo: "O que o relatório afirma e o que não afirma", paragrafos: [
          "Os indicadores mostram só o que o arquivo da lavadora sustenta: resultado registrado, temperatura máxima e duração da desinfecção térmica, tempo total, temperatura no término, falha, manutenção preventiva, fases e pausas.",
          "O relatório não usa critério de norma nem valor A0, porque o arquivo não traz a curva contínua do sensor. Quando há valor de referência cadastrado para a receita, a comparação aparece com a observação \"a confirmar pelo responsável técnico\" até ser confirmada."
        ] }
      ]
    }
  };
}
