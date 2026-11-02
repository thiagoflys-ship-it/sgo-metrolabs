/****************************************************
 * AJUDA "COMO USAR ESTA TELA" — SGO+ LICITAÇÕES, ETAPA 1 (01/11/2026), ETAPA 2 (02/11/2026: arquivos do edital e nota pela IA)
 * E ETAPA 3 (02/11/2026: agenda de prazos, alertas com ciência e escalonamento, regras dos alertas)
 * Contrato: docs/AJUDA_CONTRATO_20261017.md. Manual completo: docs/MANUAL_MODULO_LICITACOES.md.
 * Telas: licitacoes (Hoje em Licitações), licitacoes_oportunidades (lista e ficha), licitacoes_agenda (Agenda e prazos),
 * licitacoes_alertas (Central de alertas) e licitacoes_portais (Portais e configurações). Texto conferido com JS_Licitacoes.html, SGO_Licitacoes.js e SGO_Licitacoes_Config.js e com o coletor
 * do servidor (sgo_servidor/src/servicos/licitacoes). Texto puro, sem HTML.
 ****************************************************/
function SGO_ajudaTelas_Licitacoes_() {
  var quem = [
    { perfil: "DIRETORIA,ADMIN", pode: "Tudo: ver o radar, enviar para análise, descartar com motivo, reabrir, buscar e abrir os arquivos do edital, pedir e refazer a análise por IA (com motivo), ver a agenda e confirmar datas, receber os alertas de licitação e dar ciência, mudar as regras dos alertas (com motivo), parametrizar os portais, testar a conexão e ligar o coletor." },
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
        { p: "Onde vejo a nota de 0 a 100?", r: "No cartão de cada oportunidade em Oportunidades (no lugar da UF) e na ficha, aba \"Análise\". Sem a chave da IA cadastrada, a nota não é calculada e a tela diz \"análise por IA indisponível: falta a chave\"." },
        { p: "Recebo aviso no WhatsApp?", r: "Ainda não. Os alertas da Diretoria (inclusive fora do expediente) entram numa etapa seguinte." },
        { p: "Por quanto tempo as licitações ficam guardadas?", r: "Regra de guarda aprovada pelo dono em 02/11/2026: o que a Diretoria mexeu fica para sempre, com o histórico e os arquivos; candidata ou travada nunca tocada, 2 anos a partir da publicação; fora do ramo, só o resumo por 1 ano (dados brutos 30 dias); registro das chamadas, 6 meses. A limpeza roda toda segunda, na manutenção do servidor, e o que sai fica resumido no histórico." }
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
          "Onde é a sessão: o portal de disputa quando a fonte permite saber; \"Sistema municipal ou outro\" quando a plataforma da sessão precisa ser lida no edital.",
          "Ordenar por: prioridade da UF e prazo (padrão), nota (maior primeiro; sem nota no fim) ou prazo (mais perto primeiro)."
        ] },
        { titulo: "Ler o cartão", itens: [
          "O quadro à esquerda mostra a nota de 0 a 100 e a classe (alta, média, baixa ou descarte) quando a análise por IA já foi feita; sem nota, mostra a UF e a situação (radar, trava, análise ou fora). A borda vermelha indica trava ou descarte.",
          "Abaixo do motivo, a linha \"Nota da análise por IA\" diz a versão e a data da análise e a trava, se houver. A IA não decide: descartar ou participar é da Diretoria.",
          "Selos verdes são pontos fortes (exclusivo ME/EPP: a matriz é EPP e pode participar; Autorizada Inmetro para balanças e esfigmomanômetros). Selo vermelho \"Exige acreditação RBC — não atendemos\": a Metrolabs faz calibração rastreável, não acreditada.",
          "Propostas até: data e hora como a fonte informa, presumidas de Brasília (o PNCP não informa o fuso). Em AM, MT, MS, RO, RR e AC confirme no edital se o horário é local.",
          "O motivo e o trecho entre aspas mostram de onde veio a decisão da regra. PENDENTE é o que precisa ser conferido no edital."
        ] },
        { titulo: "Agir", itens: [
          "Abrir ficha: resumo, arquivos do edital, análise por IA, fonte (versões, itens, hashes) e histórico.",
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
        ] },
        { titulo: "Prazos da licitação", itens: [
          "A aba Prazos mostra cada prazo com a fonte e a natureza: Confirmado (veio da fonte ou foi conferido no edital), Calculado (regra legal sobre a data da fonte, como a impugnação do art. 164 da Lei 14.133) ou Pendente de confirmação (depende do edital ou do pregoeiro).",
          "Prazo calculado mostra a regra, os feriados que não contaram e o limite interno dos alertas (1 dia útil antes, às 17:00). Feriado estadual ou municipal do órgão não chega por API: confira no edital.",
          "\"Confirmar data\" (ou \"Conferir no edital\") pede a data, a hora ou dia todo, o fuso e onde você conferiu. Data diferente cria a versão nova do prazo; a anterior fica em \"Versões anteriores\". Prazo pendente não gera alerta até ser confirmado.",
          "\"Informar a data da ata\" calcula as razões de recurso (3 dias úteis na Lei 14.133, 5 na Lei 13.303) e programa os alertas.",
          "Embaixo de cada prazo ficam os alertas dele, com os estados e o botão \"Ciente\"."
        ] },
        { titulo: "Arquivos do edital", itens: [
          "A aba Arquivos lista o edital e os anexos baixados do PNCP pelo servidor, cada um com o SHA-256 do conteúdo (prova de que é o arquivo publicado), o tamanho e a data.",
          "Situação do texto: \"Texto extraído\" (com páginas e caracteres), \"Texto parcial\" ou \"Texto não extraído\" com o motivo (imagem escaneada sem OCR, RAR, formato que o SGO+ não abre). Nada é inventado: o que não foi lido aparece assim.",
          "Abrir mostra o arquivo em outra aba; Baixar salva no aparelho. O servidor confere o SHA-256 antes de entregar, e o histórico registra quem abriu. Por segurança, só PDF, imagem e texto abrem na tela; página da internet (HTML), XML, SVG e os demais saem só como download.",
          "\"Buscar arquivos agora\" pede a leitura ao servidor; ela roda em segundo plano (1 chamada a cada 3 s no PNCP). Depois de alguns minutos, toque em \"Atualizar a ficha\".",
          "Se o PNCP de arquivos estiver fora do ar, a faixa vermelha diz o erro e a hora da nova tentativa automática. Enquanto isso, leia o edital pelo botão \"Ver no PNCP\"."
        ] },
        { titulo: "Análise por IA", itens: [
          "A aba Análise mostra a nota de 0 a 100, a classe, o resumo, os critérios (capacidade técnica, margem, documentação, localização, prazo, valor e riscos) e quem pontuou cada um: o sistema (dados reais), a IA conferida, ou, na capacidade técnica, a IA classifica cada item e o sistema calcula os pontos.",
          "Fatos vêm com o trecho entre aspas e a fonte (arquivo A1, A2... com o nome e o SHA-256, ou o campo do PNCP). Inferências são conclusões a partir dos fatos. Pendências são o que falta conferir para decidir.",
          "Trava provada com trecho (por exemplo, exige laboratório acreditado RBC sem aceitar rastreabilidade) deixa a nota em 0, com o motivo; a oportunidade continua no radar até a Diretoria decidir.",
          "\"Analisar agora\" faz a primeira análise; \"Refazer análise\" pede o motivo (pelo menos 10 letras). Cada análise é uma versão nova: a anterior continua guardada em \"Todas as versões da análise\".",
          "A análise roda sozinha quando chegam arquivos novos ou a fonte muda; se nada mudou, ela não é refeita."
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
        { situacao: "A sessão diz \"ler no edital\"", oQueFazer: "A publicação veio de um sistema municipal de gestão; a plataforma da disputa está no edital." },
        { situacao: "Aparece \"análise por IA indisponível: falta a chave\"", oQueFazer: "A chave da IA (GEMINI_API_KEY) não está cadastrada. Peça ao Administrador para cadastrar em Administração > Chaves e senhas e depois toque em \"Analisar agora\". Os arquivos continuam disponíveis." },
        { situacao: "A aba Arquivos diz que a leitura falhou (HTTP 503)", oQueFazer: "O PNCP de arquivos estava fora do ar. O servidor tenta de novo sozinho na hora indicada; enquanto isso, use \"Ver no PNCP\". Nada foi apagado." },
        { situacao: "Um arquivo aparece como \"Texto não extraído\"", oQueFazer: "Leia o arquivo à mão (botão Abrir): é imagem escaneada, RAR ou outro formato que o SGO+ não lê. A análise por IA não usa esse arquivo e diz isso nas pendências." },
        { situacao: "A última análise foi \"recusada pelo verificador\"", oQueFazer: "Leia a faixa: ela diz o que faltou (em geral, os arquivos do edital ainda não chegaram). A nota anterior continua valendo. Depois que os arquivos chegarem (aba Arquivos), toque em \"Refazer análise\" com o motivo. O detalhe técnico e as respostas da IA ficam em \"Ver o motivo técnico\" e \"Ver respostas da IA\"." }
      ],
      quemPode: quem,
      perguntas: [
        { p: "Uma licitação pode aparecer duas vezes?", r: "Não. O número de controle do PNCP é a chave; a mesma compra vinda do Compras.gov.br é reconhecida pelo mesmo número." },
        { p: "A regra pode desfazer o que eu decidi?", r: "Não. A regra só muda a situação enquanto ninguém mexeu (no radar, ou descartada pela regra). O que a Diretoria enviou para análise ou descartou com motivo fica como está." },
        { p: "Por que uma licitação travada por RBC aparece?", r: "Para a Diretoria decidir: às vezes o edital aceita calibração rastreável ou subcontratação de laboratório acreditado. A pendência fica escrita no cartão." },
        { p: "A IA pode descartar ou mandar participar?", r: "Não. A IA lê, classifica e aponta fatos, inferências e pendências com a fonte. Descartar, analisar e participar são decisões da Diretoria, registradas com o nome e a data." },
        { p: "Como sei que o fato citado está mesmo no edital?", r: "O verificador procura cada trecho, palavra por palavra, no texto do arquivo citado (sem acento e sem caixa). Se não achar, a resposta da IA é recusada e refeita; o trecho fica na tela com o arquivo e o SHA-256." },
        { p: "Por que a margem vale 5 e a distância vale metade?", r: "Ainda não há piso calculado (a tabela de preços de Licitações vem na próxima etapa) nem a distância rodoviária confirmada. São pendências: a nota não finge certeza." }
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
        { titulo: "Regras dos alertas", itens: [
          "Liga e desliga os alertas de licitação, escolhe quem recebe (só Diretoria e Administrador) e por onde (e-mail e WhatsApp por pessoa; o interno vale sempre), quem recebe primeiro quando a oportunidade não tem responsável, os minutos até escalonar (padrão 60, 15 e 5) e as antecedências de cada prazo.",
          "Antecedências se escrevem como \"7d normal, 3d importante, 24h importante, 4h crítico, 1h crítico\" (d = dias, h = horas, min = minutos).",
          "O motivo é obrigatório; cada salvamento vira versão nova, e só o que mudou é gravado (o resto fica como estava). Os alertas programados passam a seguir a regra nova; os que saem dela são cancelados com o motivo.",
          "A faixa do alto diz se o modelo sgo_licitacao_prazo do WhatsApp está aprovado na Meta e quando chegou o último retorno de status."
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
    },
    "licitacoes_agenda": {
      titulo: "Agenda e prazos",
      paraQueServe: "Mostra os prazos das licitações por dia: fim das propostas, abertura da sessão, impugnação, esclarecimento e recurso, cada um com a fonte, o fuso, a natureza da data e os alertas programados.",
      antesDeComecar: [
        "Os prazos nascem sozinhos da fonte (PNCP e Compras.gov.br) quando a oportunidade entra no radar e são refeitos quando a fonte muda.",
        "Os horários são os da fonte, presumidos de Brasília (o PNCP não informa o fuso). Em UF com outro fuso, confira no edital se o horário é local."
      ],
      passos: [
        { titulo: "Ler a agenda", itens: [
          "Escolha o período: Hoje, 7 dias, 30 dias ou Tudo. Os filtros escolhem a prioridade, a situação da data e onde é a sessão.",
          "Cada dia tem o cabeçalho com a data; feriado nacional aparece com o aviso de que não conta como dia útil.",
          "Cada prazo mostra a hora, o fuso, o órgão, a natureza (Confirmado, Calculado ou Pendente de confirmação), a fonte, a regra do cálculo, o limite interno e os alertas.",
          "Prazo riscado está suspenso ou cancelado na fonte; a data antiga de um prazo retificado fica na ficha, aba Prazos."
        ] },
        { titulo: "Confirmar uma data", itens: [
          "Toque em \"Confirmar data\" num prazo pendente (ou \"Conferir no edital\" num confirmado com fuso presumido).",
          "Informe a data, a hora (ou dia todo), o fuso e onde conferiu. Data diferente cria a versão nova do prazo e os alertas passam a seguir a nova.",
          "Prazo pendente de confirmação não gera alerta. Prazos sem data (regime pendente, esclarecimento de estatal) ficam no fim da agenda."
        ] }
      ],
      cores: [
        { nome: "Selo verde Confirmado", significado: "A data veio da fonte ou foi conferida por uma pessoa no edital." },
        { nome: "Selo azul Calculado", significado: "Regra legal sobre a data da fonte. É sempre um cálculo: confira no edital." },
        { nome: "Selo laranja Pendente de confirmação", significado: "Depende do edital ou do pregoeiro; sem alerta até alguém confirmar." },
        { nome: "Borda vermelha, laranja ou azul", significado: "Prazo crítico, importante ou normal." }
      ],
      problemas: [
        { situacao: "Ao confirmar aparece \"Escreva onde você conferiu a data\"", oQueFazer: "Escreva o documento e o item (por exemplo: edital, item 5.1, página 3). Fica no histórico com o seu nome." },
        { situacao: "Ao confirmar aparece que o prazo foi substituído", oQueFazer: "A fonte mudou a data enquanto a janela estava aberta. Toque em \"Atualizar\" e confira a versão nova." },
        { situacao: "Um prazo de impugnação está em dia diferente do edital", oQueFazer: "O cálculo usa só o calendário nacional conhecido. Confirme a data do edital em \"Confirmar data\": a versão nova passa a valer e a calculada fica guardada." }
      ],
      quemPode: quem,
      perguntas: [
        { p: "Por que a impugnação tem um limite interno antes do limite da lei?", r: "Prazo contado para trás leva 1 dia útil de folga (às 17:00) porque feriado municipal e ponto facultativo do órgão não chegam por API. Os alertas usam o limite interno." },
        { p: "O que acontece quando o órgão retifica o edital?", r: "O prazo ganha uma versão nova com o motivo (de, para), a versão anterior fica guardada, os alertas pendentes do prazo antigo são cancelados com o motivo e a Diretoria recebe o alerta de mudança." }
      ]
    },
    "licitacoes_alertas": {
      titulo: "Central de alertas",
      paraQueServe: "Mostra cada alerta de licitação com o caminho completo: criado, enviado, aceito, entregue e lido (só pelo retorno da Meta), ciência de quem e quando, escalonamento e canal alternativo.",
      antesDeComecar: [
        "Os alertas vão só para a Diretoria de Licitações (perfis Diretoria e Administrador), inclusive fora do expediente: exceção aprovada pelo dono só para Licitações.",
        "Canais: o aviso interno (esta tela e a faixa das telas de Licitações) vale sempre; e-mail e WhatsApp oficial conforme Portais e configurações › Regras dos alertas.",
        "Sem o modelo sgo_licitacao_prazo aprovado na Meta, o WhatsApp não sai e a linha diz \"WhatsApp aguardando aprovação do modelo na Meta\": o alerta vai pelo interno e pelo e-mail."
      ],
      passos: [
        { titulo: "Dar ciência", itens: [
          "Toque em \"Ciente\" no alerta (aqui, no Hoje, na Agenda ou na aba Prazos da ficha). Também vale o botão \"Confirmar ciência\" do WhatsApp, o link do e-mail ou responder CIENTE à mensagem.",
          "A ciência de um integrante encerra a cobrança daquele alerta para os dois. Ciência não conclui a tarefa: a ação continua no portal e no SGO+."
        ] },
        { titulo: "Entender os estados", itens: [
          "1 Criado, 2 Enviado ao provedor, 3 Aceito pelo provedor, 4 Entregue, 5 Lido, 6 Ciência, 7 Em atendimento (abriu pelo link), 8 Concluído (o prazo passou com ciência), 9 Falha, 10 Escalonado.",
          "Entregue e Lido só aparecem quando a Meta manda o retorno de status. Sem retorno, o último estado garantido é \"Aceito pela Meta\".",
          "Sem ciência no tempo do nível (padrão 60, 15 e 5 minutos), o alerta vai para o outro integrante e é reenviado por outro canal. Falha nos dois canais escalona na hora."
        ] },
        { titulo: "Falhas e reenvio", itens: [
          "Na aba \"Falhas e canal alternativo\" ficam os alertas em que um canal falhou, com o motivo e o que foi feito (por exemplo: WhatsApp falhou, e-mail enviado como canal alternativo).",
          "\"Reenviar\" manda de novo pelos dois canais e fica no histórico."
        ] }
      ],
      cores: [
        { nome: "Selo vermelho, laranja ou cinza", significado: "Nível crítico, importante ou normal." },
        { nome: "Estado verde", significado: "Etapa feita, com a hora (toque e segure para ver)." },
        { nome: "Estado tracejado", significado: "Ainda não aconteceu (Entregue e Lido dependem do retorno da Meta)." },
        { nome: "Estado vermelho ou laranja", significado: "Falha ou escalonamento." }
      ],
      problemas: [
        { situacao: "Aparece \"WhatsApp aguardando aprovação do modelo na Meta\"", oQueFazer: "O dono cadastra o modelo em Chaves e senhas › Cadastrar modelos na Meta e confere a situação. Até a aprovação, os alertas seguem pelo SGO+ e pelo e-mail." },
        { situacao: "Aparece \"Sem celular no cadastro\"", oQueFazer: "Peça ao administrador para preencher o celular em Administração › Usuários." },
        { situacao: "Aparece \"Retido pelo piloto do WhatsApp\"", oQueFazer: "O celular não está na lista da Diretoria de Licitações do piloto. Confira o celular no cadastro; a lista é refeita sozinha a cada envio." },
        { situacao: "Aparece que a rotina dos alertas está parada", oQueFazer: "Avise o responsável pelo sistema: o agendador do servidor pode ter parado. Os alertas atrasados saem quando ele voltar (só o mais recente de cada prazo)." }
      ],
      quemPode: quem,
      perguntas: [
        { p: "Por que um alerta de 7 dias não saiu?", r: "A oportunidade entrou no radar quando a antecedência de 7 dias já tinha passado. Sai só o aviso mais recente; os anteriores não são enviados para não mandar vários de uma vez." },
        { p: "O valor estimado vai no WhatsApp?", r: "Não. A mensagem leva o órgão, o processo, o objeto resumido, o prazo, o tempo restante e a ação; o valor fica só no SGO+." }
      ]
    }
  };
}
