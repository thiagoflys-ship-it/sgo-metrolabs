/****************************************************
 * AJUDA "COMO USAR ESTA TELA" — SGO+ LICITAÇÕES, ETAPA 1 (01/11/2026)
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Manual completo: docs/MANUAL_MODULO_LICITACOES.md.
 * Telas: licitacoes (Hoje em Licitações), licitacoes_oportunidades (lista e ficha) e licitacoes_portais (Portais e
 * configurações). Texto conferido com JS_Licitacoes.html, SGO_Licitacoes.js e SGO_Licitacoes_Config.js e com o coletor
 * do servidor (sgo_servidor/src/servicos/licitacoes). Texto puro, sem HTML.
 ****************************************************/
function SGO_ajudaTelas_Licitacoes_() {
  var quem = [
    { perfil: "DIRETORIA,ADMIN", pode: "Tudo nesta etapa: ver o radar, enviar para análise, descartar com motivo, reabrir, parametrizar os portais, testar a conexão e ligar o coletor." },
    { perfil: "GESTOR,COMERCIAL,FINANCEIRO,TECNICO,METROLOGIA,RH,CLIENTE", pode: "Não usa este módulo: o menu não aparece e o servidor recusa as chamadas (decisão do dono, 01/11/2026)." }
  ];
  return {
    "licitacoes": {
      titulo: "Hoje em Licitações",
      paraQueServe: "Resume o que o radar de licitações encontrou: quantas oportunidades estão para analisar, travadas e em análise, os prazos de proposta dos próximos 7 dias, as últimas que entraram e a situação do coletor do PNCP e do Compras.gov.br.",
      antesDeComecar: [
        "O coletor roda no servidor próprio do SGO+, sem ninguém com a tela aberta. Ele só traz algo novo quando está ligado (Portais e configurações > Regras do radar > \"Coletor ligado\").",
        "A coleta lê o PNCP (fonte oficial das contratações públicas) e usa o Compras.gov.br como reserva e para os itens. Portais privados e sessões de disputa não passam pelo PNCP."
      ],
      passos: [
        { titulo: "Ler o resumo", itens: [
          "A faixa do alto diz quando foi a última coleta e quantos registros foram lidos, novos, candidatos, travados e descartados pela regra. Faixa amarela ou vermelha explica a falha e o que fazer.",
          "Toque num número (\"Para analisar\", \"Travadas\", \"Em análise\", \"Prazos de proposta em 7 dias\") para abrir a lista de Oportunidades já na parte certa.",
          "Em \"Prazos de proposta nos próximos 7 dias\" ficam as oportunidades no radar ou em análise com proposta encerrando em até 7 dias. O selo de tempo fica vermelho com menos de 2 dias e amarelo com menos de 5.",
          "\"Abrir ficha\" leva direto à ficha da licitação."
        ] },
        { titulo: "Atualizar e coletar", itens: [
          "\"Atualizar\" traz para a tela o que o coletor já encontrou (sem chamar o PNCP).",
          "\"Coletar agora\" pede ao servidor uma rodada fora da frequência; ela começa em até 1 minuto e respeita o limite do PNCP (1 chamada a cada 3 segundos). Depois de alguns minutos, toque em \"Atualizar\".",
          "A tela não se atualiza sozinha."
        ] }
      ],
      cores: [
        { nome: "Faixa verde", significado: "Última coleta sem falha." },
        { nome: "Faixa amarela", significado: "Coletor desligado, aguardando a primeira rodada ou a última rodada com falha (ele tenta de novo sozinho)." },
        { nome: "Faixa vermelha", significado: "PNCP sem sucesso em 5 rodadas seguidas: veja o registro das chamadas e teste a conexão." }
      ],
      problemas: [
        { situacao: "Aparece \"O coletor de licitações roda só no servidor próprio do SGO+\"", oQueFazer: "Abra o SGO+ pelo endereço sgo.metrolabs.com.br. Em outro ambiente não há coleta." },
        { situacao: "A faixa diz \"Coletor desligado\"", oQueFazer: "Abra Portais e configurações > Regras do radar, marque \"Coletor ligado\", escreva o motivo e salve." },
        { situacao: "Os números não mudaram depois de \"Coletar agora\"", oQueFazer: "A rodada leva alguns minutos (1 chamada a cada 3 segundos no PNCP). Espere e toque em \"Atualizar\"." }
      ],
      quemPode: quem,
      perguntas: [
        { p: "Por que não aparece nota de 0 a 100?", r: "A nota de aderência e a leitura do edital pela IA chegam na próxima etapa. Nesta etapa a lista é ordenada pela prioridade da UF (GO, DF, vizinhos e RJ primeiro) e pelo prazo." },
        { p: "Recebo aviso no WhatsApp?", r: "Ainda não. Os alertas da Diretoria (inclusive fora do expediente) entram numa etapa seguinte." }
      ]
    },
    "licitacoes_oportunidades": {
      titulo: "Oportunidades",
      paraQueServe: "Lista as licitações que a triagem por regras encontrou no PNCP, com o motivo e o trecho da fonte que disparou a regra. Aqui a Diretoria abre a ficha, envia para análise, descarta com motivo, reabre e abre o processo no portal de origem.",
      antesDeComecar: [
        "Só entra na lista o que tem termo de interesse (calibração, qualificação térmica, autoclave, NR-13, engenharia clínica e outros) no objeto, na informação complementar ou nos itens.",
        "Palavra parecida não basta: castração de cães e gatos, reagentes \"de calibração\", borracharia, embalagem para esterilização e compra de produto são descartados pela regra, com o motivo gravado."
      ],
      passos: [
        { titulo: "Escolher a parte da lista", itens: [
          "Para analisar: candidatas, sem nada que descarte ou trave.",
          "Travadas: têm impeditivo que depende de decisão (exige acreditação RBC, dedicação exclusiva de mão de obra, software próprio, suspensa na fonte).",
          "Em análise: enviadas para análise pela Diretoria.",
          "Descartadas: pela regra do radar (com o motivo e o trecho) ou pela Diretoria (com o motivo escrito)."
        ] },
        { titulo: "Filtrar", itens: [
          "Buscar procura no órgão, no objeto, no número de controle, no município e no código LIC.",
          "UF: Brasil inteiro, a prioridade (GO, DF, MG, BA, TO, MT, MS e RJ) ou uma UF.",
          "Selo: exclusivo ME/EPP, Autorizada Inmetro, exige RBC, acreditação opcional, rastreabilidade à RBC (não trava), Lei 13.303 (estatal), suspensa, dedicação exclusiva, software exigido.",
          "Onde é a sessão: o portal de disputa quando a fonte permite saber; \"Sistema municipal ou outro\" quando a plataforma da sessão precisa ser lida no edital."
        ] },
        { titulo: "Ler o cartão", itens: [
          "O quadro à esquerda mostra a UF e a situação (radar, trava, análise ou fora). A borda vermelha indica trava ou descarte.",
          "Selos verdes são pontos fortes (exclusivo ME/EPP: a matriz é EPP e pode participar; Autorizada Inmetro para balanças e esfigmomanômetros). Selo vermelho \"Exige acreditação RBC — não atendemos\": a Metrolabs faz calibração rastreável, não acreditada.",
          "Propostas até: data e hora como a fonte informa, presumidas de Brasília (o PNCP não informa o fuso). Em AM, MT, MS, RO, RR e AC confirme no edital se o horário é local.",
          "O motivo e o trecho entre aspas mostram de onde veio a decisão da regra. PENDENTE é o que precisa ser conferido no edital."
        ] },
        { titulo: "Agir", itens: [
          "Abrir ficha: resumo, fonte (versões, itens, hashes) e histórico.",
          "Enviar para análise: escreva uma observação se quiser; você fica como responsável.",
          "Descartar: o motivo é obrigatório (pelo menos 10 letras) e fica no histórico com o seu nome e a data.",
          "Reabrir: devolve uma descartada ao radar; o motivo é obrigatório. Depois de reaberta pela Diretoria, a regra do radar não descarta de novo (a triagem nova fica só no histórico).",
          "Abrir no portal: abre o processo no sistema de origem em nova aba (quando a fonte informa o link). Ver no PNCP: abre a página da contratação no PNCP."
        ] },
        { titulo: "Ficha da licitação", itens: [
          "Resumo: objeto completo, triagem com o trecho, pendências e as ações.",
          "Fonte: de onde veio, links, CNPJ do órgão, datas como a fonte informou, o fuso presumido, o hash da versão e da resposta original, as versões da fonte e os itens lidos do Compras.gov.br.",
          "Histórico: quem, quando, o quê, versão, fonte e hash de cada fato (entrada no radar, retificação na fonte, triagem refeita, descarte, análise).",
          "Retificação na fonte nunca apaga a versão anterior: vira versão nova, e o histórico diz o que mudou."
        ] }
      ],
      cores: [
        { nome: "Selo verde", significado: "Ponto forte (exclusivo ME/EPP, Autorizada Inmetro, acreditação opcional)." },
        { nome: "Selo vermelho", significado: "Impeditivo (exige RBC, dedicação exclusiva, software exigido)." },
        { nome: "Selo azul", significado: "Informação de regime (Lei 13.303 de estatal, empate ficto de EPP)." },
        { nome: "Selo laranja", significado: "Atenção: versão nova da fonte ou termo negativo junto de termo específico." },
        { nome: "Selo cinza", significado: "Informativo (valor não informado, suspensa, outros motivos do descarte)." },
        { nome: "Tempo vermelho, amarelo, verde", significado: "Menos de 2 dias, menos de 5 dias e 5 dias ou mais até o encerramento das propostas." }
      ],
      problemas: [
        { situacao: "Ao descartar aparece \"Escreva o motivo do descarte\"", oQueFazer: "Escreva pelo menos 10 letras explicando por que não interessa. Nada foi alterado." },
        { situacao: "Aparece que a oportunidade está em outra situação", oQueFazer: "Outra pessoa mudou agora há pouco. Toque em \"Atualizar\" e confira." },
        { situacao: "\"Abrir no portal\" não aparece", oQueFazer: "A fonte não informou o link do sistema de origem. Use \"Ver no PNCP\" e, se precisar, procure o processo no portal da sessão." },
        { situacao: "A sessão diz \"ler no edital\"", oQueFazer: "A publicação veio de um sistema municipal de gestão; a plataforma da disputa está no edital." }
      ],
      quemPode: quem,
      perguntas: [
        { p: "Uma licitação pode aparecer duas vezes?", r: "Não. O número de controle do PNCP é a chave; a mesma compra vinda do Compras.gov.br é reconhecida pelo mesmo número." },
        { p: "A regra pode desfazer o que eu decidi?", r: "Não. A regra só muda a situação enquanto ninguém mexeu (no radar, ou descartada pela regra). O que a Diretoria enviou para análise ou descartou com motivo fica como está." },
        { p: "Por que uma licitação travada por RBC aparece?", r: "Para a Diretoria decidir: às vezes o edital aceita calibração rastreável ou subcontratação de laboratório acreditado. A pendência fica escrita no cartão." }
      ]
    },
    "licitacoes_portais": {
      titulo: "Portais e configurações",
      paraQueServe: "Mostra os 33 portais com o tipo de integração, a situação e o último teste; abre cada portal em nova aba; testa a conexão real do PNCP e do Compras.gov.br; mostra o registro das chamadas; parametriza cada portal; e guarda as regras do radar (coletor ligado e porte da matriz).",
      antesDeComecar: [
        "Tipos: A API pública, B API com chave, C API comercial de parceiro, D consulta automatizada permitida, E operação manual assistida.",
        "Nesta etapa só o PNCP e o Compras.gov.br têm coleta automática. Os editais dos portais públicos de disputa chegam pelo PNCP; sessão, lances e chat do pregoeiro não."
      ],
      passos: [
        { titulo: "Portais e integrações", itens: [
          "Filtre por categoria (públicos nacionais, estaduais, compras hospitalares, corporativas e industriais).",
          "\"Acessar\" abre o portal em nova aba.",
          "\"Testar conexão\" (PNCP e Compras.gov.br) faz uma chamada real pelo servidor e grava o resultado no portal e no registro. O primeiro teste bem-sucedido muda a situação de \"Em teste\" para \"Operacional\".",
          "\"Parametrizar\": ligado (só portais com API), palavras a mais que interessam, palavras que descartam, UFs, valor mínimo, frequência, responsável, credencial (o NOME da chave em Chaves e senhas, nunca o valor), situação e observações. O motivo é obrigatório; cada salvamento vira uma versão nova e só os campos alterados mudam."
        ] },
        { titulo: "Registro das chamadas", itens: [
          "Cada chamada do coletor e dos testes: quando, portal, rota, HTTP, duração, registros e erro.",
          "HTTP 429 é limite de requisições: o coletor espera 30, 60 e 120 segundos antes de desistir. HTTP 503 é o portal fora do ar."
        ] },
        { titulo: "Regras do radar", itens: [
          "\"Coletor ligado\" liga ou desliga a coleta automática. Porte da matriz: EPP (decisão do dono).",
          "O motivo é obrigatório; cada salvamento vira versão nova. A próxima rodada do coletor já usa.",
          "A tela mostra os termos de interesse, os termos que descartam, as travas e os sinais de compra de produto que a triagem do servidor usa."
        ] },
        { titulo: "Permissões", itens: [
          "Diretoria e Administrador: tudo. Demais perfis: não veem o módulo."
        ] }
      ],
      cores: [
        { nome: "Tipo A verde, B azul, C laranja, E tracejado", significado: "Tipo de integração do portal." },
        { nome: "Situação verde", significado: "Operacional (teste real bem-sucedido)." },
        { nome: "Situação azul", significado: "Em teste ou em desenvolvimento." },
        { nome: "Situação laranja", significado: "Aguardando credencial, documentação ou operacional com restrições." },
        { nome: "Situação vermelha", significado: "Falha no último teste." }
      ],
      problemas: [
        { situacao: "Ao ligar um portal aparece que ele não tem API", oQueFazer: "Portais dos tipos C, D e E não têm coleta automática nesta etapa. A publicação chega pelo PNCP; acompanhe a sessão no próprio portal." },
        { situacao: "Ao salvar a credencial aparece \"Escreva o NOME da chave\"", oQueFazer: "Cadastre o valor em Chaves e senhas e escreva aqui só o nome (letras maiúsculas, números e _)." },
        { situacao: "Ao marcar \"Operacional\" aparece que falta o teste", oQueFazer: "Toque em \"Testar conexão\" primeiro; só um teste real bem-sucedido libera \"Operacional\"." },
        { situacao: "O teste do PNCP falhou com HTTP 429", oQueFazer: "Limite de requisições do PNCP. Espere alguns minutos e teste de novo." }
      ],
      quemPode: quem,
      perguntas: [
        { p: "Por que o Compras.gov.br não é o radar principal?", r: "Ele é um espelho do PNCP com atraso (em 30/10/2026 tinha 47 pregões contra 316 no PNCP). Serve de reserva quando o PNCP falha e para ler os itens." },
        { p: "Onde fica a senha ou a chave de um portal?", r: "Em Chaves e senhas. Aqui só aparece o nome da chave e se ela está cadastrada; o valor nunca volta para a tela nem para o registro." }
      ]
    }
  };
}
